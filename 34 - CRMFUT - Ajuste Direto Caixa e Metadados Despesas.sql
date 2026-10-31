-- ==============================================================================
-- 34 - CRMFUT - Ajuste Direto Caixa e Metadados Despesas.sql
-- ==============================================================================
-- Projeto: Racha dos Amigos (RDA)
-- Banco Oficial: bdpocxppyoavqbpcmfdb
--
-- OBJETIVO:
-- 1. Adicionar colunas de rastreabilidade (created_by e created_by_name) na tabela
--    'public.expenses' para registrar com segurança o usuário autenticado que efetuou
--    cada despesa (Administrador, Assistente ou Tesoureiro).
-- 2. Adicionar as colunas 'scope' ('monthly' ou 'direct_cash') e 'adjustment_month'
--    na tabela 'public.balance_adjustments' para diferenciar categoricamente:
--    - Ajustes mensais vinculados a uma competência específica (afetam o mês e o caixa);
--    - Ajustes diretos no caixa total do RDA (afetam exclusivamente o caixa acumulado).
-- 3. Assegurar compatibilidade com as regras de imutabilidade contábil pré-existentes.
--
-- INSTRUÇÕES DE EXECUÇÃO:
-- Execute este script no SQL Editor do painel Supabase SOMENTE após aprovação do administrador.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. METADADOS E RASTREABILIDADE NA TABELA public.expenses
-- ------------------------------------------------------------------------------

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_name text;

COMMENT ON COLUMN public.expenses.created_by IS 'ID do usuário autenticado que registrou a despesa no sistema';
COMMENT ON COLUMN public.expenses.created_by_name IS 'Nome do operador gravado para auditoria permanente da despesa';

-- ------------------------------------------------------------------------------
-- 2. ESCOPO E COMPETÊNCIA NA TABELA public.balance_adjustments
-- ------------------------------------------------------------------------------

ALTER TABLE public.balance_adjustments
  ADD COLUMN IF NOT EXISTS scope text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS adjustment_month text;

-- Restrição de verificação para o escopo do ajuste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_balance_adjustments_scope'
  ) THEN
    ALTER TABLE public.balance_adjustments
      ADD CONSTRAINT chk_balance_adjustments_scope
      CHECK (scope IN ('monthly', 'direct_cash'));
  END IF;
END $$;

COMMENT ON COLUMN public.balance_adjustments.scope IS 'Escopo do lançamento: monthly (ajuste do mês) ou direct_cash (ajuste direto no caixa acumulado)';
COMMENT ON COLUMN public.balance_adjustments.adjustment_month IS 'Competência do ajuste mensal (ex: 2026-10). Nulo para ajustes diretos no caixa.';

-- ------------------------------------------------------------------------------
-- 3. ATUALIZAÇÃO DA TRIGGER DE IMUTABILIDADE PARA COMPATIBILIDADE COM NOVAS COLUNAS
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_balance_adjustment_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Exclusão direta bloqueada categoricamente
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Operação negada: lançamentos de ajuste de saldo são imutáveis e auditáveis. Não é permitido excluir registros em balance_adjustments.';
  END IF;

  -- 2. Alteração (UPDATE): permite estritamente a cascata 'ON DELETE SET NULL' de profiles
  IF TG_OP = 'UPDATE' THEN
    IF OLD.type = NEW.type
       AND OLD.operation_type = NEW.operation_type
       AND OLD.amount = NEW.amount
       AND OLD.description = NEW.description
       AND OLD.adjustment_date = NEW.adjustment_date
       AND OLD.previous_balance = NEW.previous_balance
       AND OLD.new_balance = NEW.new_balance
       AND (OLD.target_balance IS NOT DISTINCT FROM NEW.target_balance)
       AND (OLD.created_by_name IS NOT DISTINCT FROM NEW.created_by_name)
       AND (OLD.scope IS NOT DISTINCT FROM NEW.scope)
       AND (OLD.adjustment_month IS NOT DISTINCT FROM NEW.adjustment_month)
       AND OLD.created_at = NEW.created_at
       AND NEW.created_by IS NULL
       AND OLD.created_by IS NOT NULL THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Operação negada: lançamentos de ajuste de saldo são imutáveis e auditáveis. Não é permitido alterar dados em balance_adjustments.';
  END IF;

  RETURN NULL;
END;
$$;

COMMIT;

