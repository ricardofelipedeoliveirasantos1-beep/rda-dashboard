-- ============================================================================
-- AUDITORIA SOMENTE DE LEITURA DAS PERMISSÕES E SEGURANÇA DE public.profiles
--
-- Projeto: RDA — Racha dos Amigos
-- Supabase Oficial: bdpocxppyoavqbpcmfdb
--
-- FINALIDADE:
-- Diagnosticar com precisão cirúrgica a configuração de segurança da tabela
-- 'public.profiles', inspecionando:
-- 1. Status de RLS (Row Level Security) e FORCE RLS.
-- 2. Todas as Políticas RLS ativas (USING e WITH CHECK por comando).
-- 3. Funções públicas críticas (SECURITY DEFINER, search_path e permissões).
-- 4. Triggers de proteção da coluna role.
-- 5. Restrições CHECK existentes.
-- 6. Privilégios GRANT em nível de tabela para anon e authenticated.
--
-- GARANTIA:
-- Este script contém EXCLUSIVAMENTE instruções SELECT.
-- Não altera, não insere, não remove e não concede/revoga permissões.
-- Totalmente seguro para execução no Supabase SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CONSULTA 1: STATUS DE RLS E PROPRIETÁRIO DA TABELA public.profiles
-- ----------------------------------------------------------------------------
-- rls_habilitado (relrowsecurity): deve ser TRUE para que as políticas atuem.
-- force_rls_ativo (relforcerowsecurity): indica se RLS se aplica até ao dono da tabela.
SELECT 
  c.relname AS tabela,
  n.nspname AS schema,
  c.relrowsecurity AS rls_habilitado,
  c.relforcerowsecurity AS force_rls_ativo,
  r.rolname AS proprietario_tabela,
  CASE 
    WHEN c.relrowsecurity = true THEN 'SEGURO — RLS Habilitado (Políticas ativas)'
    ELSE 'CRÍTICO — RLS Desabilitado (Acesso direto via GRANTs)'
  END AS avaliacao_rls
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_roles r ON r.oid = c.relowner
WHERE n.nspname = 'public' 
  AND c.relname = 'profiles';

-- ----------------------------------------------------------------------------
-- CONSULTA 2: TODAS AS POLÍTICAS RLS ATIVAS EM public.profiles
-- ----------------------------------------------------------------------------
-- Lista as regras que determinam quem pode ver (USING) e quem pode gravar (WITH CHECK).
SELECT 
  policyname AS nome_politica,
  cmd AS comando, -- SELECT, INSERT, UPDATE, DELETE, ALL
  roles AS papeis_aplicaveis,
  qual AS expressao_using,
  with_check AS expressao_with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- ----------------------------------------------------------------------------
-- CONSULTA 3: INSPEÇÃO DAS FUNÇÕES CRÍTICAS DE SEGURANÇA E PAPEL
-- ----------------------------------------------------------------------------
-- Inspeciona se são SECURITY DEFINER, o proprietário, o search_path e as permissões ACL.
SELECT 
  p.proname AS nome_funcao,
  n.nspname AS schema_funcao,
  r.rolname AS proprietario,
  p.prosecdef AS security_definer,
  CASE p.provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END AS volatilidade,
  COALESCE(ARRAY_TO_STRING(p.proconfig, '; '), 'PADRÃO (search_path não fixado)') AS search_path_configurado,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS argumentos,
  p.proacl AS permissoes_execute_acl
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
JOIN pg_catalog.pg_roles r ON r.oid = p.proowner
WHERE n.nspname = 'public'
  AND p.proname IN (
    'prevent_nonadmin_role_change',
    'is_admin',
    'current_user_role',
    'is_assistant',
    'is_treasurer',
    'assistant_can'
  )
ORDER BY p.proname;

-- ----------------------------------------------------------------------------
-- CONSULTA 4: TRIGGERS ATIVAS EM public.profiles (Proteção de alteração de role)
-- ----------------------------------------------------------------------------
-- Mostra triggers ativas, se estão habilitadas e qual função executam.
SELECT 
  t.tgname AS nome_trigger,
  c.relname AS tabela,
  p.proname AS funcao_executada,
  CASE t.tgenabled
    WHEN 'O' THEN 'Habilitada (Padrão/Origin)'
    WHEN 'D' THEN 'Desabilitada'
    WHEN 'A' THEN 'Sempre Habilitada (Always)'
    WHEN 'R' THEN 'Habilitada em Replicação'
  END AS status_trigger,
  CASE 
    WHEN (t.tgtype & 2) = 2 THEN 'BEFORE'
    WHEN (t.tgtype & 64) = 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END AS timing,
  ARRAY_TO_STRING(ARRAY[
    CASE WHEN (t.tgtype & 4) = 4 THEN 'INSERT' END,
    CASE WHEN (t.tgtype & 8) = 8 THEN 'DELETE' END,
    CASE WHEN (t.tgtype & 16) = 16 THEN 'UPDATE' END,
    CASE WHEN (t.tgtype & 32) = 32 THEN 'TRUNCATE' END
  ], ' OR ') AS eventos,
  CASE 
    WHEN (t.tgtype & 1) = 1 THEN 'ROW'
    ELSE 'STATEMENT'
  END AS granularidade,
  pg_catalog.pg_get_triggerdef(t.oid) AS definicao_completa
FROM pg_catalog.pg_trigger t
JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
WHERE n.nspname = 'public'
  AND c.relname = 'profiles'
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- ----------------------------------------------------------------------------
-- CONSULTA 5: RESTRIÇÕES CHECK EXISTENTES EM public.profiles
-- ----------------------------------------------------------------------------
-- Inspeciona todas as constraints do tipo CHECK na tabela profiles.
SELECT 
  con.conname AS nome_constraint,
  con.contype AS tipo,
  pg_catalog.pg_get_constraintdef(con.oid) AS definicao_sql
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'profiles'
  AND con.contype = 'c'
ORDER BY con.conname;

-- ----------------------------------------------------------------------------
-- CONSULTA 6: PRIVILÉGIOS GRANT EM NÍVEL DE TABELA (role_table_grants)
-- ----------------------------------------------------------------------------
-- Mostra os privilégios concedidos pelo PostgreSQL às roles em public.profiles.
SELECT 
  grantee AS papel,
  privilege_type AS tipo_privilegio,
  is_grantable AS repassavel
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND grantee IN ('anon', 'authenticated', 'service_role', 'public')
ORDER BY grantee, privilege_type;
