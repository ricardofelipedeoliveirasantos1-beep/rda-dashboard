-- ============================================================================
-- 32 - CRMFUT - Correção de Permissão para Promoção de Tesoureiro e Assistente
--
-- Título recomendado para o Supabase SQL Editor:
-- "32 - CRMFUT - Correção de Permissão para Promoção de Tesoureiro e Assistente"
--
-- Finalidade:
-- 1. Desbloquear a promoção de perfis administrativos realizada pela Edge Function
--    (create-assistant): a trigger anterior 'prevent_nonadmin_role_change' bloqueava
--    o papel 'service_role' porque em funções SECURITY DEFINER o current_user reflete
--    o definer (postgres), e auth.uid() é NULL em chamadas de serviço.
-- 2. Garantir compatibilidade rigorosa verificando os claims de contexto do Supabase:
--    request.jwt.claim.role = 'service_role', GUC role = 'service_role' e DBA session_user.
-- 3. Identificar e remover qualquer CHECK constraint preexistente na coluna role
--    (independentemente do nome) e aplicar a restrição canônica que permite expressamente
--    os quatro papéis válidos: 'admin', 'assistant', 'treasurer' e 'visitor'.
-- 4. Garantir a existência e segurança da tabela public.treasurer_permissions
--    com RLS restrito ao Super Admin e leitura pelos envolvidos.
--
-- Impactos:
-- - Seguro e 100% idempotente: pode ser executado repetidamente sem efeitos colaterais.
-- - Não apaga nem recria usuários, perfis ou histórico do RDA.
-- - Mantém a restrição de que usuários comuns (visitantes/jogadores/assistentes) NÃO podem
--   alterar seu próprio papel para admin, assistente ou tesoureiro.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ATUALIZAÇÃO DA TRIGGER DE PROTEÇÃO DE PAPEL (profiles.role)
-- ----------------------------------------------------------------------------
-- Permite que a promoção de perfil seja executada pelo Super Admin (JWT autenticado),
-- por rotinas de serviço autenticadas (service_role) ou por conexões administrativas diretas.
CREATE OR REPLACE FUNCTION public.prevent_nonadmin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_jwt_role text;
  v_session_user text;
  v_setting_role text;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Extrai o papel da requisição JWT de forma segura
    v_jwt_role := NULLIF(pg_catalog.current_setting('request.jwt.claim.role', true), '');
    v_session_user := pg_catalog.session_user;
    v_setting_role := NULLIF(pg_catalog.current_setting('role', true), '');

    -- Permite alteração exclusivamente se:
    -- a) Um Super Admin estiver autenticado via JWT (public.is_admin() = true)
    -- b) A chamada vier do PostgREST com a chave service_role (claim role = 'service_role')
    -- c) A sessão ativa no PostgreSQL estiver operando como service_role (GUC role = 'service_role')
    -- d) A conexão direta vier do superusuário/DBA no SQL Editor (session_user postgres ou supabase_admin)
    IF NOT (
      public.is_admin()
      OR v_jwt_role = 'service_role'
      OR v_setting_role = 'service_role'
      OR v_session_user IN ('postgres', 'supabase_admin')
    ) THEN
      RAISE EXCEPTION 'Apenas admin pode alterar profiles.role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_nonadmin_role_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_profiles_protect_role ON public.profiles;
CREATE TRIGGER trg_profiles_protect_role
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_nonadmin_role_change();

-- ----------------------------------------------------------------------------
-- 2. ALINHAMENTO DINÂMICO DE RESTRIÇÕES CHECK EM public.profiles.role
-- ----------------------------------------------------------------------------
-- Remove qualquer restrição de checagem preexistente na coluna 'role' (qualquer nome)
-- e aplica a constraint canônica 'profiles_role_check' abrangendo todos os 4 papéis do RDA.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
    JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'profiles'
      AND con.contype = 'c'
      AND pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%role%'
  LOOP
    EXECUTE pg_catalog.format('ALTER TABLE public.profiles DROP CONSTRAINT %I', r.conname);
  END LOOP;

  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'assistant', 'treasurer', 'visitor'));
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. GARANTIA DA TABELA DE PERMISSÕES DO TESOUREIRO (public.treasurer_permissions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treasurer_permissions (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  manage_finance boolean NOT NULL DEFAULT false,
  manage_monthly_payments boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE public.treasurer_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS treasurer_permissions_admin_all ON public.treasurer_permissions;
CREATE POLICY treasurer_permissions_admin_all
  ON public.treasurer_permissions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS treasurer_permissions_read_restricted ON public.treasurer_permissions;
CREATE POLICY treasurer_permissions_read_restricted
  ON public.treasurer_permissions FOR SELECT
  USING (
    public.is_admin()
    OR (auth.uid() = profile_id)
    OR public.is_treasurer()
    OR public.is_assistant()
  );

REVOKE ALL ON TABLE public.treasurer_permissions FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.treasurer_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.treasurer_permissions TO service_role;

COMMIT;
