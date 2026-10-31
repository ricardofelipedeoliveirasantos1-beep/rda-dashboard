-- ==============================================================================
-- 28 - CRMFUT - Saldo Acumulado Referencia.sql
-- ==============================================================================
-- Justificativa:
-- Armazenar na tabela 'public.settings' o saldo de referência de R$ 236,00 apurado
-- antes do racha de 23/10/2026, além da data base de corte ('2026-10-23') e dos
-- valores acumulados de receita e despesas anteriores.
--
-- Isso permite que a aplicação calcule dinamicamente o Saldo Líquido Acumulado
-- para qualquer nova partida finalizada ou nova despesa registrada, mantendo o banco
-- como única fonte da verdade e eliminando valores fixos no código-fonte.
-- ==============================================================================

ALTER TABLE public.settings 
  ADD COLUMN IF NOT EXISTS initial_accumulated_balance NUMERIC(10, 2) DEFAULT 236.00,
  ADD COLUMN IF NOT EXISTS initial_balance_date DATE DEFAULT '2026-10-23',
  ADD COLUMN IF NOT EXISTS initial_accumulated_revenue NUMERIC(10, 2) DEFAULT 2839.94,
  ADD COLUMN IF NOT EXISTS initial_accumulated_expenses NUMERIC(10, 2) DEFAULT 2690.00;

UPDATE public.settings 
SET 
  initial_accumulated_balance = 236.00,
  initial_balance_date = '2026-10-23',
  initial_accumulated_revenue = 2839.94,
  initial_accumulated_expenses = 2690.00
WHERE id = 'default';
