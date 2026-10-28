-- ============================================================================
-- 32 - CRMFUT - Correção de Permissão para Promoção de Tesoureiro e Assistente
--
-- Título recomendado para o Supabase SQL Editor:
-- "32 - CRMFUT - Correção de Permissão para Promoção de Tesoureiro e Assistente"
--
-- Finalidade:
-- 1. Desbloquear a promoção de perfis administrativos realizada pela Edge Function
--    (create-assistant): a trigger anterior 'prevent_nonadmin_role_change' bloqueava
--    o papel 'service_role' porque em funções SECURITY DEFINER o auth.uid() é NULL.
-- 2. Garantir segurança absoluta contra autoelevação e falsificação de sessão:
--    - Se a requisição contiver um usuário autenticado (auth.uid() IS NOT NULL),
--      a alteração EXIGE rigorosamente que o chamador seja Super Admin (public.is_admin() = true).
--      Nenhuma variável de sessão ou claim JWT contorna essa validação para sessões de usuário.
--    - Operações com service_role exigem simultaneamente: ausência de UID (auth.uid() IS NULL),
--      claim assinado request.jwt.claim.role = 'service_role' e role de sessão 'service_role'.
--    - Operações de manutenção direta pelo DBA no SQL Editor (session_user postgres/supabase_admin)
--      são preservadas.
-- 3. Identificar e substituir cirurgicamente APENAS a constraint CHECK legada da coluna
--    'role' que não contempla 'treasurer', preservando integralmente todas as demais
--    constraints existentes em public.profiles.
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
-- Impede categoricamente a autoelevação de privilégios. Somente autoriza:
-- a) Conexão direta de DBA no console PostgreSQL (session_user postgres/supabase_admin)
-- b) Super Admin autenticado via JWT (auth.uid() NOT NULL e public.is_admin() = true)
-- c) Rotina de serviço legítima (auth.uid() IS NULL e service_role verificado)
CREATE OR REPLACE FUNCTION public.prevent_nonadmin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_jwt_role text;
  v_setting_role text;
  v_session_user text;
BEGIN
  -- Se o cargo não sofreu alteração, libera a operação normalmente (edição de nome, foto, etc.)
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- 1. CONEXÃO DIRETA DE DBA (Supabase SQL Editor / Migrações do sistema)
  -- session_user reflete a credencial física do socket Postgres, infalsificável via HTTP.
  v_session_user := pg_catalog.session_user;
  IF v_session_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- 2. REQUISIÇÃO AUTENTICADA COM IDENTIDADE DE USUÁRIO (auth.uid() NOT NULL)
  -- Se houver um usuário autenticado, a ÚNICA condição que autoriza a alteração de papel
  -- é ser comprovadamente um Super Admin ativo. Nenhuma claim ou GUC é consultada.
  v_uid := auth.uid();
  IF v_uid IS NOT NULL THEN
    IF public.is_admin() THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Apenas admin pode alterar profiles.role';
    END IF;
  END IF;

  -- 3. OPERAÇÃO DE SERVIÇO AUTORIZADA (auth.uid() IS NULL)
  -- Chamada da Edge Function interna utilizando a service_role key.
  -- Exige cumulativamente:
  -- a) v_uid IS NULL (já assegurado pelo bloco anterior)
  -- b) Claim JWT validado pelo PostgREST: request.jwt.claim.role = 'service_role'
  -- c) Papel de sessão do PostgreSQL: role = 'service_role'
  v_jwt_role := NULLIF(pg_catalog.current_setting('request.jwt.claim.role', true), '');
  v_setting_role := NULLIF(pg_catalog.current_setting('role', true), '');

  IF v_jwt_role = 'service_role' AND v_setting_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 4. Bloqueia qualquer outra origem não autorizada
  RAISE EXCEPTION 'Apenas admin pode alterar profiles.role';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_nonadmin_role_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_profiles_protect_role ON public.profiles;
CREATE TRIGGER trg_profiles_protect_role
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_nonadmin_role_change();

-- ----------------------------------------------------------------------------
-- 2. ALINHAMENTO CIRÚRGICO DA CONSTRAINT CHECK DE PAPÉIS EM public.profiles.role
-- ----------------------------------------------------------------------------
-- Identifica especificamente a constraint de lista de papéis que não aceita 'treasurer',
-- remove-a e aplica a constraint canônica 'profiles_role_check' abrangendo todos os 4 papéis.
-- Preserva intacta qualquer outra constraint CHECK existente na tabela public.profiles.
DO $$
DECLARE
  v_legacy_conname text;
  v_already_valid boolean := false;
BEGIN
  -- 1. Verifica se já existe uma constraint que contemple 'treasurer'
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
    JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'profiles'
      AND con.contype = 'c'
      AND pg_catalog.pg_get_constraintdef(con.oid) ~* '\mrole\M'
      AND pg_catalog.pg_get_constraintdef(con.oid) ~* 'treasurer'
  ) INTO v_already_valid;

  IF v_already_valid THEN
    RAISE NOTICE 'Constraint de validação de papéis em public.profiles já contempla "treasurer". Nenhuma alteração necessária.';
    RETURN;
  END IF;

  -- 2. Localiza cirurgicamente a constraint legada restritiva da coluna role
  SELECT con.conname INTO v_legacy_conname
  FROM pg_catalog.pg_constraint con
  JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
  JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'profiles'
    AND con.contype = 'c'
    AND pg_catalog.pg_get_constraintdef(con.oid) ~* '\mrole\M'
    AND pg_catalog.pg_get_constraintdef(con.oid) ~* '(admin|assistant|visitor)'
    AND pg_catalog.pg_get_constraintdef(con.oid) !~* 'treasurer'
  LIMIT 1;

  IF v_legacy_conname IS NOT NULL THEN
    RAISE NOTICE 'Removendo constraint legada restritiva: %', v_legacy_conname;
    EXECUTE pg_catalog.format('ALTER TABLE public.profiles DROP CONSTRAINT %I', v_legacy_conname);
  END IF;

  -- 3. Aplica a constraint canônica com todos os 4 papéis válidos
  RAISE NOTICE 'Aplicando constraint profiles_role_check com (admin, assistant, treasurer, visitor).';
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
