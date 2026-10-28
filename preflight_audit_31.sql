-- ============================================================================
-- PRE-FLIGHT AUDIT: Verificação Prévia de Esquema e Dados (Somente Leitura)
-- Arquivo: preflight_audit_31.sql
-- Projeto: RDA — Racha dos Amigos (bdpocxppyoavqbpcmfdb)
--
-- INSTRUÇÕES:
-- 1. Execute este script no Supabase SQL Editor ANTES da migração 31.
-- 2. Este script é 100% READ-ONLY (nenhum dado ou tabela é alterado).
-- 3. Se qualquer item acusar 'BLOQUEIO — NÃO EXECUTAR', a migração NÃO deve ser aplicada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. VERIFICAÇÃO DE LIMITES: Assistentes (Máximo 4) e Tesoureiro (Máximo 1)
-- ----------------------------------------------------------------------------
SELECT 
  role,
  count(*) AS total_cadastrado,
  CASE 
    WHEN role = 'treasurer' AND count(*) > 1 THEN 'BLOQUEIO — Mais de 1 tesoureiro existente. A criação do índice único falhará.'
    WHEN role = 'assistant' AND count(*) > 4 THEN 'BLOQUEIO — Mais de 4 assistentes existentes. A trigger bloqueará operações.'
    WHEN role = 'treasurer' AND count(*) <= 1 THEN 'LIBERADO — Tesoureiro dentro do limite permitido (máx 1).'
    WHEN role = 'assistant' AND count(*) <= 4 THEN 'LIBERADO — Assistentes dentro do limite permitido (máx 4).'
    ELSE 'OK'
  END AS status_pre_voo
FROM public.profiles
WHERE role IN ('assistant', 'treasurer')
GROUP BY role;

-- ----------------------------------------------------------------------------
-- 2. DETALHAMENTO DAS CONTAS EXISTENTES (Assistentes e Tesoureiro)
-- ----------------------------------------------------------------------------
SELECT 
  p.id AS profile_id,
  p.name AS nome_cadastrado,
  p.role AS cargo,
  u.email AS email_auth,
  CASE WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'BANIDO / DESATIVADO' ELSE 'ATIVO' END AS situacao_auth,
  p.created_at AS data_criacao
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.role IN ('assistant', 'treasurer')
ORDER BY p.role, p.created_at ASC;

-- ----------------------------------------------------------------------------
-- 3. DETECÇÃO DE PERFIS ÓRFÃOS (Perfis sem correspondência em auth.users)
-- ----------------------------------------------------------------------------
SELECT 
  p.id, 
  p.name, 
  p.role, 
  p.created_at,
  'ALERTA — Perfil existe na tabela profiles mas não existe em auth.users' AS observacao
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- ----------------------------------------------------------------------------
-- 4. VERIFICAÇÃO DE EXISTÊNCIA E COMPATIBILIDADE DE public.audit_logs
-- ----------------------------------------------------------------------------
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'audit_logs'
ORDER BY ordinal_position;

-- ----------------------------------------------------------------------------
-- 5. VERIFICAÇÃO DE CONFLITOS DE ÍNDICES PREEXISTENTES
-- ----------------------------------------------------------------------------
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_single_treasurer', 
    'idx_audit_logs_target_user', 
    'idx_audit_logs_action', 
    'idx_audit_logs_created_at'
  );

-- ----------------------------------------------------------------------------
-- 6. VERIFICAÇÃO DE TRIGGERS E FUNÇÕES A SEREM CRIADAS OU SUBSTITUÍDAS
-- ----------------------------------------------------------------------------
SELECT 
  trigger_name, 
  event_object_table, 
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trg_check_max_assistants', 
    'trg_check_max_treasurer', 
    'trg_audit_logs_immutable'
  );

SELECT 
  routine_name, 
  routine_type, 
  security_type,
  data_type AS tipo_retorno
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'current_user_role', 
    'check_max_assistants_limit', 
    'check_max_treasurer_limit', 
    'prevent_audit_logs_mutation'
  );

-- ----------------------------------------------------------------------------
-- 7. DEPENDÊNCIAS DE public.current_user_role()
-- ----------------------------------------------------------------------------
SELECT 
  p.proname AS funcao_origem,
  dep.objid::regprocedure AS objeto_dependente,
  cls.relname AS tabela_associada
FROM pg_proc p
JOIN pg_depend d ON d.refobjid = p.oid
LEFT JOIN pg_proc dep ON dep.oid = d.objid
LEFT JOIN pg_class cls ON cls.oid = d.objid
WHERE p.proname = 'current_user_role';

-- ----------------------------------------------------------------------------
-- 8. POLÍTICAS RLS ATUAIS (profiles e audit_logs)
-- ----------------------------------------------------------------------------
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'audit_logs')
ORDER BY tablename, policyname;

-- ----------------------------------------------------------------------------
-- 9. PRIVILÉGIOS DE TABELA ATUAIS (profiles e audit_logs)
-- ----------------------------------------------------------------------------
SELECT 
  grantee, 
  table_schema, 
  table_name, 
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'audit_logs')
ORDER BY table_name, grantee;
