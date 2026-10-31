-- ==============================================================================
-- 35 - CRMFUT - Permissao Mensalidades Assistente - REV35.16.sql
-- ==============================================================================
-- Projeto: RDA — Racha dos Amigos
-- Banco Oficial: Supabase — projeto bdpocxppyoavqbpcmfdb
-- Finalidade: Permitir que Assistente com manage_monthly_payments ou manage_finance
-- possa inserir, atualizar e excluir registros em monthly_payments.
-- ==============================================================================

BEGIN;

-- 1. DROP idempotente das politicas de escrita de monthly_payments
DROP POLICY IF EXISTS monthly_payments_canonical_insert ON public.monthly_payments;
DROP POLICY IF EXISTS monthly_payments_canonical_insert_guard ON public.monthly_payments;
DROP POLICY IF EXISTS monthly_payments_canonical_update ON public.monthly_payments;
DROP POLICY IF EXISTS monthly_payments_canonical_update_guard ON public.monthly_payments;
DROP POLICY IF EXISTS monthly_payments_canonical_delete ON public.monthly_payments;
DROP POLICY IF EXISTS monthly_payments_canonical_delete_guard ON public.monthly_payments;

-- 2. INSERT: Admin, Tesoureiro ou Assistente autorizado
CREATE POLICY monthly_payments_canonical_insert
  ON public.monthly_payments
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_treasurer()
      AND (
        public.treasurer_can('manage_finance')
        OR public.treasurer_can('manage_monthly_payments')
      )
    )
    OR (
      public.is_assistant()
      AND (
        public.assistant_can('manage_finance')
        OR public.assistant_can('manage_monthly_payments')
      )
    )
  );

CREATE POLICY monthly_payments_canonical_insert_guard
  ON public.monthly_payments
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_treasurer()
      AND (
        public.treasurer_can('manage_finance')
        OR public.treasurer_can('manage_monthly_payments')
      )
    )
    OR (
      public.is_assistant()
      AND (
        public.assistant_can('manage_finance')
        OR public.assistant_can('manage_monthly_payments')
      )
    )
  );

-- 3. UPDATE: Admin, Tesoureiro ou Assistente autorizado
CREATE POLICY monthly_payments_canonical_update
  ON public.monthly_payments
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_treasurer()
      AND (
        public.treasurer_can('manage_finance')
        OR public.treasurer_can('manage_monthly_payments')
      )
    )
    OR (
      public.is_assistant()
      AND (
        public.assistant_can('manage_finance')
        OR public.assistant_can('manage_monthly_payments')
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_treasurer()
      AND (
        public.treasurer_can('manage_finance')
        OR public.treasurer_can('manage_monthly_payments')
      )
    )
    OR (
      public.is_assistant()
      AND (
        public.assistant_can('manage_finance')
        OR public.assistant_can('manage_monthly_payments')
      )
    )
  );

CREATE POLICY monthly_payments_canonical_update_guard
  ON public.monthly_payments
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_treasurer()
      AND (
        public.treasurer_can('manage_finance')
        OR public.treasurer_can('manage_monthly_payments')
      )
    )
    OR (
      public.is_assistant()
      AND (
        public.assistant_can('manage_finance')
        OR public.assistant_can('manage_monthly_payments')
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_treasurer()
      AND (
        public.treasurer_can('manage_finance')
        OR public.treasurer_can('manage_monthly_payments')
      )
    )
    OR (
      public.is_assistant()
      AND (
        public.assistant_can('manage_finance')
        OR public.assistant_can('manage_monthly_payments')
      )
    )
  );

-- 4. DELETE: somente perfis com permissao explicita de gerenciamento.
CREATE POLICY monthly_payments_canonical_delete
  ON public.monthly_payments
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_treasurer()
      AND (
        public.treasurer_can('manage_finance')
        OR public.treasurer_can('manage_monthly_payments')
      )
    )
    OR (
      public.is_assistant()
      AND (
        public.assistant_can('manage_finance')
        OR public.assistant_can('manage_monthly_payments')
      )
    )
  );

CREATE POLICY monthly_payments_canonical_delete_guard
  ON public.monthly_payments
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_treasurer()
      AND (
        public.treasurer_can('manage_finance')
        OR public.treasurer_can('manage_monthly_payments')
      )
    )
    OR (
      public.is_assistant()
      AND (
        public.assistant_can('manage_finance')
        OR public.assistant_can('manage_monthly_payments')
      )
    )
  );

-- 5. POS-VALIDACAO: confirmar as seis politicas de escrita e a presenca
-- da permissao do assistente em todas elas. Em caso de divergencia, rollback.
DO $postflight$
DECLARE
  v_count integer;
  v_missing text[];
BEGIN
  SELECT count(*)
    INTO v_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'monthly_payments'
    AND policyname IN (
      'monthly_payments_canonical_insert',
      'monthly_payments_canonical_insert_guard',
      'monthly_payments_canonical_update',
      'monthly_payments_canonical_update_guard',
      'monthly_payments_canonical_delete',
      'monthly_payments_canonical_delete_guard'
    );

  IF v_count <> 6 THEN
    RAISE EXCEPTION 'REV35.16 ABORTADA: esperadas 6 politicas de escrita; encontradas %.', v_count;
  END IF;

  SELECT array_agg(policyname)
    INTO v_missing
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'monthly_payments'
    AND policyname IN (
      'monthly_payments_canonical_insert',
      'monthly_payments_canonical_insert_guard',
      'monthly_payments_canonical_update',
      'monthly_payments_canonical_update_guard',
      'monthly_payments_canonical_delete',
      'monthly_payments_canonical_delete_guard'
    )
    AND concat_ws(' ', qual, with_check) NOT ILIKE '%assistant_can%';

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'REV35.16 ABORTADA: politicas sem regra de permissao do assistente: %.',
      array_to_string(v_missing, ', ');
  END IF;

  RAISE NOTICE 'REV35.16 concluida: assistente com manage_monthly_payments pode inserir, alterar e excluir mensalidades; demais politicas e tabelas preservadas.';
END;
$postflight$;

COMMIT;
