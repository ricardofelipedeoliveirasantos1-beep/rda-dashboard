-- ============================================================================
-- 25 - CRMFUT - Assistente Gerenciamento de Despesas
-- 
-- Objetivo: Corrigir o RLS da tabela public.expenses para permitir que o
-- Assistente autorizado (manage_finance = true) possa inserir, editar e
-- excluir despesas. Remove as policies inseguras anteriores.
-- ============================================================================

BEGIN;

-- 1. Remove as policies explicitamente pelo nome em vez de apagar cegamente
DROP POLICY IF EXISTS "Permitir leitura de despesas para usuarios autenticados" ON public.expenses;
DROP POLICY IF EXISTS "Permitir insercao de despesas para usuarios autenticados" ON public.expenses;
DROP POLICY IF EXISTS "Permitir atualizacao de despesas para usuarios autenticados" ON public.expenses;
DROP POLICY IF EXISTS "Permitir exclusao de despesas para usuarios autenticados" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_authenticated" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_restricted" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_restricted" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_restricted" ON public.expenses;

-- 2. Habilita o RLS caso ainda não esteja
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 3. Cria as novas policies seguras

-- SELECT: Permite que Admin, Treasurer e Assistant (com ou sem manage_finance) visualizem. Bloqueia Visitor e Anon.
CREATE POLICY expenses_select_restricted
  ON public.expenses FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      public.is_admin()
      OR public.is_treasurer()
      OR public.is_assistant()
    )
  );

-- INSERT: admin, treasurer, ou assistant com permissão manage_finance
CREATE POLICY expenses_insert_restricted
  ON public.expenses FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      public.is_admin()
      OR public.is_treasurer()
      OR (public.is_assistant() AND public.assistant_can('manage_finance'))
    )
  );

-- UPDATE: admin, treasurer, ou assistant com permissão manage_finance
CREATE POLICY expenses_update_restricted
  ON public.expenses FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      public.is_admin()
      OR public.is_treasurer()
      OR (public.is_assistant() AND public.assistant_can('manage_finance'))
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      public.is_admin()
      OR public.is_treasurer()
      OR (public.is_assistant() AND public.assistant_can('manage_finance'))
    )
  );

-- DELETE: admin, treasurer, ou assistant com permissão manage_finance
CREATE POLICY expenses_delete_restricted
  ON public.expenses FOR DELETE
  USING (
    auth.role() = 'authenticated' AND (
      public.is_admin()
      OR public.is_treasurer()
      OR (public.is_assistant() AND public.assistant_can('manage_finance'))
    )
  );

COMMIT;
