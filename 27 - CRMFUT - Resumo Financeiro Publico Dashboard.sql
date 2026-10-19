-- ==============================================================================
-- 27 - CRMFUT - Resumo Financeiro Publico Dashboard.sql
-- ==============================================================================
-- Fornece função agregada segura (RPC) com SECURITY DEFINER para que os
-- visitantes do Dashboard público consultem os totais consolidados do mês
-- sem violar o isolamento de dados privados (RLS) de monthly_payments e expenses.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_public_monthly_financial_summary(p_month text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mensalistas_revenue numeric := 0;
  v_expenses numeric := 0;
  v_paid_count int := 0;
  v_total_mensalistas int := 0;
  v_pending_count int := 0;
BEGIN
  -- 1. Receita efetivamente recebida de mensalidades no mês (ex: '2026-10')
  SELECT COALESCE(SUM(amount), 0)
  INTO v_mensalistas_revenue
  FROM public.monthly_payments
  WHERE payment_month = p_month
    AND status = 'paid';

  -- 2. Despesas registradas no mês
  SELECT COALESCE(SUM(amount), 0)
  INTO v_expenses
  FROM public.expenses
  WHERE to_char(expense_date, 'YYYY-MM') = p_month;

  -- 3. Total de mensalistas ativos
  SELECT COUNT(*)
  INTO v_total_mensalistas
  FROM public.players
  WHERE is_active = true
    AND category = 'Mensalista';

  -- 4. Quantidade de mensalistas que efetivamente pagaram no mês
  SELECT COUNT(DISTINCT p.id)
  INTO v_paid_count
  FROM public.players p
  JOIN public.monthly_payments mp ON mp.player_id = p.id
  WHERE p.is_active = true
    AND p.category = 'Mensalista'
    AND mp.payment_month = p_month
    AND mp.status = 'paid';

  -- 5. Quantidade de mensalistas pendentes
  SELECT COUNT(*)
  INTO v_pending_count
  FROM public.players p
  WHERE p.is_active = true
    AND p.category = 'Mensalista'
    AND NOT EXISTS (
      SELECT 1 FROM public.monthly_payments mp
      WHERE mp.player_id = p.id
        AND mp.payment_month = p_month
        AND mp.status = 'paid'
    );

  RETURN jsonb_build_object(
    'month', p_month,
    'monthly_mensalistas_revenue', v_mensalistas_revenue,
    'monthly_expenses', v_expenses,
    'mensalistas_paid_count', v_paid_count,
    'mensalistas_pending_count', v_pending_count,
    'total_active_mensalistas', v_total_mensalistas
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_monthly_financial_summary(text) TO anon, authenticated;
