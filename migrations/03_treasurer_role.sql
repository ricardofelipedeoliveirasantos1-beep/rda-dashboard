-- ============================================================================
-- 03_treasurer_role.sql
-- Migração completa para suporte ao cargo de TESOUREIRO
--
-- Esta migration cria todas as funções auxiliares necessárias e configura
-- RLS policies corretas para monthly_payments.
--
-- Tabelas envolvidas (já existentes):
--   - public.profiles (id uuid, name text, photo_url text, role text, created_at timestamptz)
--   - public.assistant_permissions (profile_id uuid, colunas boolean)
--   - public.monthly_payments
--
-- Roles suportados: admin, assistant, treasurer, visitor
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) FUNÇÕES AUXILIARES (SECURITY DEFINER com search_path fixo)
--    Funções necessárias para verificação de roles dentro das policies.
--    Nenhuma usa SQL dinâmico — todas são seguras.
-- ----------------------------------------------------------------------------

-- Função auxiliar: retorna o role do usuário autenticado atual
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = (SELECT auth.uid())
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;

-- Função auxiliar: verifica se o usuário atual é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.current_user_role() = 'admin')
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Função auxiliar: verifica se o usuário atual é assistant
CREATE OR REPLACE FUNCTION public.is_assistant()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.current_user_role() = 'assistant')
$$;

GRANT EXECUTE ON FUNCTION public.is_assistant() TO anon, authenticated;

-- Função auxiliar: verifica se o usuário atual é treasurer
CREATE OR REPLACE FUNCTION public.is_treasurer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.current_user_role() = 'treasurer')
$$;

GRANT EXECUTE ON FUNCTION public.is_treasurer() TO anon, authenticated;

-- Função auxiliar: verifica permissão específica do assistente
-- Aceita APENAS permissões conhecidas e fixas (CASE). NÃO usa coluna fornecida
-- livremente — isso bloqueia SQL dinâmico inseguro.
CREATE OR REPLACE FUNCTION public.assistant_can(_perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE _perm
      WHEN 'create_match'      THEN ap.create_match
      WHEN 'edit_match'        THEN ap.edit_match
      WHEN 'insert_stats'      THEN ap.insert_stats
      WHEN 'edit_players'      THEN ap.edit_players
      WHEN 'manage_finance'    THEN ap.manage_finance
      WHEN 'create_notices'    THEN ap.create_notices
      WHEN 'edit_notices'      THEN ap.edit_notices
      WHEN 'delete_notices'    THEN ap.delete_notices
      WHEN 'import_history'    THEN ap.import_history
      ELSE false
    END
    FROM public.assistant_permissions ap
    WHERE ap.profile_id = (SELECT auth.uid())
  ), false);
$$;

GRANT EXECUTE ON FUNCTION public.assistant_can(text) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2) TRIGGER DE PROTEÇÃO DO profiles.role
--    Garante que ninguém (nem o próprio usuário) altere profiles.role sem ser
--    admin. RLS não consegue comparar OLD/NEW por coluna, então usamos trigger.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_nonadmin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas admin pode alterar profiles.role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_role ON public.profiles;
CREATE TRIGGER trg_profiles_protect_role
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_nonadmin_role_change();

-- ----------------------------------------------------------------------------
-- 3) LIMPEZA DE POLICIES EXISTENTES EM monthly_payments
--    Remove policies antigas que permitiam acesso público indevido.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'monthly_payments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.monthly_payments', p.policyname);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4) HABILITAR RLS EM monthly_payments (se ainda não estiver habilitado)
-- ----------------------------------------------------------------------------

ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 5) POLICIES CORRIGIDAS PARA monthly_payments
--
-- Regras:
--   - SELECT: admin, treasurer, ou assistant com manage_finance
--   - INSERT: admin, treasurer, ou assistant com manage_finance
--   - UPDATE: admin, treasurer, ou assistant com manage_finance
--   - DELETE: somente admin (protege histórico)
--
-- Usa auth.uid() para identificar o usuário autenticado.
-- NÃO há acesso público (anon) para INSERT/UPDATE/DELETE.
-- ----------------------------------------------------------------------------

-- SELECT: admin, treasurer, ou assistant com permissão
CREATE POLICY monthly_payments_select_restricted
  ON public.monthly_payments FOR SELECT
  USING (
    public.is_admin()
    OR public.is_treasurer()
    OR (public.is_assistant() AND public.assistant_can('manage_finance'))
  );

-- INSERT: admin, treasurer, ou assistant com permissão
CREATE POLICY monthly_payments_insert_restricted
  ON public.monthly_payments FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR public.is_treasurer()
    OR (public.is_assistant() AND public.assistant_can('manage_finance'))
  );

-- UPDATE: admin, treasurer, ou assistant com permissão
CREATE POLICY monthly_payments_update_restricted
  ON public.monthly_payments FOR UPDATE
  USING (
    public.is_admin()
    OR public.is_treasurer()
    OR (public.is_assistant() AND public.assistant_can('manage_finance'))
  )
  WITH CHECK (
    public.is_admin()
    OR public.is_treasurer()
    OR (public.is_assistant() AND public.assistant_can('manage_finance'))
  );

-- DELETE: somente admin
CREATE POLICY monthly_payments_delete_admin_only
  ON public.monthly_payments FOR DELETE
  USING (public.is_admin());

COMMIT;
