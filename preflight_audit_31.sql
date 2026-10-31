-- ============================================================================
-- PRE-FLIGHT AUDIT: Verificação Prévia de Esquema e Dados (Somente Leitura)
-- Arquivo: preflight_audit_31.sql
-- Projeto: RDA — Racha dos Amigos (bdpocxppyoavqbpcmfdb)
--
-- INSTRUÇÕES:
-- 1. Execute este script no Supabase SQL Editor ANTES de aplicar o SQL 31 e SQL 32.
-- 2. Este script é 100% READ-ONLY (contém EXCLUSIVAMENTE consultas SELECT).
-- 3. Nenhum dado, tabela, função, trigger ou permissão é modificado.
-- 4. Se qualquer item indicar 'BLOQUEIO', resolva a inconsistência antes de migrar.
--
-- REGRAS DE NEGÓCIO VALIDADAS:
-- - Máximo de 4 assistentes (role = 'assistant')
-- - Máximo de 1 tesoureiro (role = 'treasurer')
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. VERIFICAÇÃO DE LIMITES: Assistentes (Máx 4) e Tesoureiro (Máx 1)
-- ----------------------------------------------------------------------------
-- Retorna SEMPRE uma linha para cada cargo, mesmo que a contagem atual seja zero.
SELECT 
  'assistant' AS cargo,
  pg_catalog.count(*) AS total_cadastrado,
  CASE 
    WHEN count(*) > 4 THEN 'BLOQUEIO — Mais de 4 assistentes existentes. Reduza o excedente antes de aplicar o SQL 31.'
    ELSE 'LIBERADO — ' || count(*) || ' assistente(s) cadastrado(s) (limite permitido: máx 4).'
  END AS status_pre_voo
FROM public.profiles
WHERE role = 'assistant'
UNION ALL
SELECT 
  'treasurer' AS cargo,
  pg_catalog.count(*) AS total_cadastrado,
  CASE 
    WHEN count(*) > 1 THEN 'BLOQUEIO — Mais de 1 tesoureiro existente. A criação do índice único idx_single_treasurer falhará.'
    ELSE 'LIBERADO — ' || count(*) || ' tesoureiro(s) cadastrado(s) (limite permitido: máx 1).'
  END AS status_pre_voo
FROM public.profiles
WHERE role = 'treasurer';

-- ----------------------------------------------------------------------------
-- 2. DETALHAMENTO DAS CONTAS EXISTENTES (Assistentes e Tesoureiro)
-- ----------------------------------------------------------------------------
-- Lista todas as contas com perfil administrativo atual para conferência nominal.
SELECT 
  p.id AS profile_id,
  p.name AS nome_cadastrado,
  p.role AS cargo,
  u.email AS email_auth,
  CASE 
    WHEN u.id IS NULL THEN 'ALERTA: ÓRFÃO (Sem auth.users)'
    WHEN u.banned_until IS NOT NULL AND u.banned_until > pg_catalog.now() THEN 'BANIDO / DESATIVADO' 
    ELSE 'ATIVO' 
  END AS situacao_auth,
  p.created_at AS data_criacao
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.role IN ('assistant', 'treasurer')
ORDER BY p.role, p.created_at ASC;

-- ----------------------------------------------------------------------------
-- 3. DETECÇÃO DE PERFIS ÓRFÃOS (Perfis sem correspondência em auth.users)
-- ----------------------------------------------------------------------------
-- Se esta consulta retornar alguma linha, há perfis criados sem conta de login no Auth.
SELECT 
  p.id AS profile_id_orfao, 
  p.name AS nome, 
  p.role AS cargo, 
  p.created_at,
  'ALERTA — Perfil existe em public.profiles mas não existe em auth.users' AS observacao
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- ----------------------------------------------------------------------------
-- 4. VERIFICAÇÃO DE RESTRIÇÕES CHECK ATUAIS EM public.profiles (Relevante p/ SQL 32)
-- ----------------------------------------------------------------------------
-- Inspeciona a constraint 'profiles_role_check' para confirmar quais papéis ela aceita hoje.
SELECT 
  con.conname AS nome_constraint,
  con.contype AS tipo,
  pg_catalog.pg_get_constraintdef(con.oid) AS definicao_sql,
  CASE 
    WHEN pg_catalog.pg_get_constraintdef(con.oid) ~* '\mtreasurer\M' THEN 'Já aceita treasurer'
    ELSE 'Restritiva — NÃO aceita treasurer (exige atualização pelo SQL 32)'
  END AS avaliacao_para_sql32
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'profiles'
  AND con.contype = 'c'
  AND (
    con.conname ILIKE '%role%'
    OR pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%role%'
  );

-- ----------------------------------------------------------------------------
-- 5. VERIFICAÇÃO DE EXISTÊNCIA E COMPATIBILIDADE DE public.audit_logs (SQL 31)
-- ----------------------------------------------------------------------------
SELECT 
  table_schema,
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
-- 6. VERIFICAÇÃO DE EXISTÊNCIA DE public.treasurer_permissions (SQL 32)
-- ----------------------------------------------------------------------------
SELECT 
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'treasurer_permissions'
ORDER BY ordinal_position;

-- ----------------------------------------------------------------------------
-- 7. VERIFICAÇÃO DE ÍNDICES PREEXISTENTES (Conflitos potenciais)
-- ----------------------------------------------------------------------------
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_single_treasurer', 
    'idx_audit_logs_target_user', 
    'idx_audit_logs_action', 
    'idx_audit_logs_created_at'
  );

-- ----------------------------------------------------------------------------
-- 8. VERIFICAÇÃO DE TRIGGERS E FUNÇÕES A SEREM CRIADAS OU ATUALIZADAS
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
    'trg_audit_logs_immutable',
    'trg_profiles_protect_role'
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
    'prevent_audit_logs_mutation',
    'prevent_nonadmin_role_change',
    'is_admin'
  );

-- ----------------------------------------------------------------------------
-- 9. DEPENDÊNCIAS DE public.current_user_role() NO CATÁLOGO
-- ----------------------------------------------------------------------------
-- Inspeciona objetos do catálogo que invocam current_user_role().
SELECT 
  n.nspname || '.' || p.proname AS funcao_origem,
  d.classid::regclass::text AS tipo_catalogo_dependente,
  pg_catalog.pg_describe_object(d.classid, d.objid, d.objsubid) AS descricao_objeto_dependente,
  d.deptype AS tipo_dependencia,
  c.relname AS tabela_associada
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
JOIN pg_catalog.pg_depend d ON d.refobjid = p.oid AND d.refclassid = 'pg_catalog.pg_proc'::regclass
LEFT JOIN pg_catalog.pg_policy pol ON pol.oid = d.objid AND d.classid = 'pg_catalog.pg_policy'::regclass
LEFT JOIN pg_catalog.pg_class c ON (
  (d.classid = 'pg_catalog.pg_class'::regclass AND c.oid = d.objid)
  OR (d.classid = 'pg_catalog.pg_policy'::regclass AND c.oid = pol.polrelid)
)
WHERE n.nspname = 'public' 
  AND p.proname = 'current_user_role'
ORDER BY descricao_objeto_dependente ASC;
