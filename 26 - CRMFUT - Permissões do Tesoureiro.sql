-- ============================================================================
-- 26 - CRMFUT - Permissões do Tesoureiro
-- 
-- Objetivo: Criar controle granular de permissões para o papel de Tesoureiro
-- e substituir as RLS de expenses e monthly_payments para validar essas permissões.
-- ============================================================================

BEGIN;

-- 1. Criação da Tabela de Permissões do Tesoureiro
CREATE TABLE IF NOT EXISTS public.treasurer_permissions (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  manage_finance boolean DEFAULT false,
  manage_monthly_payments boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Habilita RLS na nova tabela
ALTER TABLE public.treasurer_permissions ENABLE ROW LEVEL SECURITY;

-- 3. Policies para treasurer_permissions
-- Apenas admin pode inserir/atualizar/excluir
CREATE POLICY treasurer_permissions_admin_all
  ON public.treasurer_permissions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- O tesoureiro ou o assistente podem ler (mas não alterar)
CREATE POLICY treasurer_permissions_read_restricted
  ON public.treasurer_permissions FOR SELECT
  USING (
    public.is_admin()
    OR public.is_treasurer()
    OR public.is_assistant()
  );

-- 4. Cria a função auxiliar para checar permissão do tesoureiro (Seguro contra injeção)
CREATE OR REPLACE FUNCTION public.treasurer_can(_perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE _perm
      WHEN 'manage_finance'           THEN tp.manage_finance
      WHEN 'manage_monthly_payments'  THEN tp.manage_monthly_payments
      ELSE false
    END
    FROM public.treasurer_permissions tp
    WHERE tp.profile_id = (SELECT auth.uid())
  ), false);
$$;

GRANT EXECUTE ON FUNCTION public.treasurer_can(text) TO anon, authenticated;

-- 5. Atualizar RLS de expenses

-- Remover policies do SQL 25 para substituir pela nova regra
DROP POLICY IF EXISTS expenses_insert_restricted ON public.expenses;
DROP POLICY IF EXISTS expenses_update_restricted ON public.expenses;
DROP POLICY IF EXISTS expenses_delete_restricted ON public.expenses;
-- O SELECT permanece como foi criado no SQL 25 (Admin, Tesoureiro ou Assistente)

-- INSERT: admin, ou (treasurer + manage_finance), ou (assistant + manage_finance)
CREATE POLICY expenses_insert_restricted
  ON public.expenses FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      public.is_admin()
      OR (public.is_treasurer() AND public.treasurer_can('manage_finance'))
      OR (public.is_assistant() AND public.assistant_can('manage_finance'))
    )
  );

-- UPDATE: admin, ou (treasurer + manage_finance), ou (assistant + manage_finance)
CREATE POLICY expenses_update_restricted
  ON public.expenses FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      public.is_admin()
      OR (public.is_treasurer() AND public.treasurer_can('manage_finance'))
      OR (public.is_assistant() AND public.assistant_can('manage_finance'))
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      public.is_admin()
      OR (public.is_treasurer() AND public.treasurer_can('manage_finance'))
      OR (public.is_assistant() AND public.assistant_can('manage_finance'))
    )
  );

-- DELETE: admin, ou (treasurer + manage_finance), ou (assistant + manage_finance)
CREATE POLICY expenses_delete_restricted
  ON public.expenses FOR DELETE
  USING (
    auth.role() = 'authenticated' AND (
      public.is_admin()
      OR (public.is_treasurer() AND public.treasurer_can('manage_finance'))
      OR (public.is_assistant() AND public.assistant_can('manage_finance'))
    )
  );

-- 6. Atualizar RLS de monthly_payments

-- Remover policies do SQL 03 para substituir pela nova regra (INSERT e UPDATE)
DROP POLICY IF EXISTS monthly_payments_insert_restricted ON public.monthly_payments;
DROP POLICY IF EXISTS monthly_payments_update_restricted ON public.monthly_payments;

-- INSERT: admin, ou (treasurer + manage_monthly_payments), ou (assistant + manage_finance)
CREATE POLICY monthly_payments_insert_restricted
  ON public.monthly_payments FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (public.is_treasurer() AND public.treasurer_can('manage_monthly_payments'))
    OR (public.is_assistant() AND public.assistant_can('manage_finance'))
  );

-- UPDATE: admin, ou (treasurer + manage_monthly_payments), ou (assistant + manage_finance)
CREATE POLICY monthly_payments_update_restricted
  ON public.monthly_payments FOR UPDATE
  USING (
    public.is_admin()
    OR (public.is_treasurer() AND public.treasurer_can('manage_monthly_payments'))
    OR (public.is_assistant() AND public.assistant_can('manage_finance'))
  )
  WITH CHECK (
    public.is_admin()
    OR (public.is_treasurer() AND public.treasurer_can('manage_monthly_payments'))
    OR (public.is_assistant() AND public.assistant_can('manage_finance'))
  );

COMMIT;
