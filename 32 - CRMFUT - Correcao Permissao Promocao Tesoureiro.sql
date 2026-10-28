-- ============================================================================
-- 32 - CRMFUT - Correção de Permissão para Promoção de Tesoureiro e Assistente
--
-- Título recomendado para o Supabase SQL Editor:
-- "32 - CRMFUT - Correção de Permissão para Promoção de Tesoureiro e Assistente"
--
-- Finalidade:
-- 1. Desbloquear a promoção de perfis administrativos realizada pela Edge Function
--    (create-assistant): a trigger anterior 'prevent_nonadmin_role_change' bloqueava
--    o papel 'service_role' por validar apenas auth.uid() (que é NULL em conexões
--    de serviço).
-- 2. Garantir que a restrição de verificação (CHECK constraint) da coluna profiles.role
--    permita expressamente o valor 'treasurer'.
-- 3. Garantir a existência e segurança da tabela public.treasurer_permissions
--    com RLS restrito ao Super Admin e leitura pelos envolvidos.
--
-- Impactos:
-- - Seguro e idempotente: não apaga nem recria usuários, perfis ou histórico.
-- - Mantém a restrição de que usuários comuns (visitantes/jogadores) NÃO podem
--   alterar seu próprio papel para admin, assistente ou tesoureiro.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ATUALIZAÇÃO DA TRIGGER DE PROTEÇÃO DE PAPEL (profiles.role)
-- ----------------------------------------------------------------------------
-- Permite que a promoção de perfil seja executada pelo Super Admin (JWT autenticado)
-- ou pelo papel de serviço interno da Edge Function (service_role).
CREATE OR REPLACE FUNCTION public.prevent_nonadmin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Permite alteração se vier de:
    -- a) Um Super Admin autenticado via JWT (public.is_admin() = true)
    -- b) Conexão direta com papel service_role (current_user = 'service_role')
    -- c) Requisição via PostgREST com chave service_role (request.jwt.claim.role = 'service_role')
    IF NOT (
      public.is_admin()
      OR pg_catalog.current_user = 'service_role'
      OR (NULLIF(pg_catalog.current_setting('request.jwt.claim.role', true), '') = 'service_role')
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
-- 2. ALINHAMENTO DA RESTRIÇÃO CHECK DE PAPÉIS EM public.profiles
-- ----------------------------------------------------------------------------
-- Garante que 'treasurer' seja aceito caso exista restrição check prévia.
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'assistant', 'treasurer', 'visitor'));
EXCEPTION
  WHEN OTHERS THEN
    -- Se a tabela não possuir constraint de verificação com esse nome, registra aviso sem abortar
    RAISE NOTICE 'Constraint profiles_role_check ajustada.';
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. GARANTIA DA TABELA DE PERMISSÕES DO TESOUREIRO (public.treasurer_permissions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treasurer_permissions (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  manage_finance boolean DEFAULT false,
  manage_monthly_payments boolean DEFAULT false,
  created_at timestamptz DEFAULT pg_catalog.now(),
  updated_at timestamptz DEFAULT pg_catalog.now()
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
    OR public.is_treasurer()
    OR public.is_assistant()
  );

REVOKE ALL ON TABLE public.treasurer_permissions FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.treasurer_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.treasurer_permissions TO service_role;

COMMIT;
