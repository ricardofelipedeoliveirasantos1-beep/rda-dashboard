import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { getCachedData, invalidateCache, CACHE_TTL } from '../services/dataCache';
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Users,
  FileText,
  RotateCcw,
  CheckCircle2,
  PlusCircle,
  MinusCircle,
  Wallet,
  Coins,
  BarChart2,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingDown,
  CreditCard,
  DollarSign,
  Settings,
  Edit2,
  Trash2,
  Plus,
  Check
} from 'lucide-react';

import FinanceiroVisitante from './FinanceiroVisitante';

export const KNOWN_TEST_ADJUSTMENT_IDS = new Set([
  '23f39177-6133-4d59-b879-e96171e660d3',
  'b86dbb34-8ec8-4e3e-9a4b-61712764b0a2',
  'b9a665d4-7129-4bea-8e74-79f174c5de39',
  '54b4ef42-f133-4017-b360-fc44ddef78aa',
  '80d8eb37-53d0-459d-8030-5f01d08fe0f2'
]);

interface MonthlyPayment {
  id?: string;
  player_id?: string;
  payment_month: string;
  amount: number;
  status: 'paid' | 'pending';
  paid_at?: string | null;
  created_at?: string;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
  created_at?: string;
  created_by?: string | null;
  created_by_name?: string | null;
}

export interface BalanceAdjustment {
  id: string;
  type: 'entry' | 'exit';
  operation_type: 'add' | 'reconcile';
  amount: number;
  description: string;
  adjustment_date: string;
  previous_balance: number;
  new_balance: number;
  target_balance?: number | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at?: string;
  scope?: 'monthly' | 'direct_cash';
  adjustment_month?: string | null;
}

interface Match {
  id: string;
  match_date: string;
  status: 'in_progress' | 'finished';
  daily_total: number;
}

const MONTHS_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function Financeiro({ userRole: _userRole, can: _can }: { userRole: 'admin' | 'assistant' | 'visitor' | 'treasurer'; can: (action: any) => boolean }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canViewFinance = _userRole === 'admin' ||
    (_userRole === 'assistant' && (_can('view_finance') || _can('manage_finance') || _can('adjust_balance'))) ||
    (_userRole === 'treasurer' && (_can('view_finance') || _can('manage_finance') || _can('adjust_balance')));

  const canManageFinance = _userRole === 'admin' ||
    (_userRole === 'assistant' && (_can('manage_finance') || _can('manage_expenses'))) ||
    (_userRole === 'treasurer' && (_can('manage_finance') || _can('manage_expenses')));

  const canEditExpenses = _userRole === 'admin' ||
    (_userRole === 'assistant' && (_can('manage_finance') || _can('edit_expenses'))) ||
    (_userRole === 'treasurer' && (_can('manage_finance') || _can('edit_expenses')));

  const canDeleteExpenses = _userRole === 'admin' ||
    (_userRole === 'assistant' && (_can('manage_finance') || _can('delete_expenses'))) ||
    (_userRole === 'treasurer' && (_can('manage_finance') || _can('delete_expenses')));

  const canAdjustBalance = _userRole === 'admin' ||
    (_userRole === 'assistant' && _can('adjust_balance')) ||
    (_userRole === 'treasurer' && _can('adjust_balance'));

  // Default to October 2026 or current date
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 9, 29)); // Outubro 2026
  const [showDateModal, setShowDateModal] = useState(false);
  const [showAnnualModal, setShowAnnualModal] = useState(false);
  const [showExpenseReport, setShowExpenseReport] = useState(true);
  const [showDirectAdjustReport, setShowDirectAdjustReport] = useState(true);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [expandedDirectAdjustId, setExpandedDirectAdjustId] = useState<string | null>(null);
  const YEARS_LIST = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  const [payments, setPayments] = useState<MonthlyPayment[]>([]);
  const [allPayments, setAllPayments] = useState<MonthlyPayment[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [mensalistasAtivosCount, setMensalistasAtivosCount] = useState<number>(0);
  const [, setDiaristasPagosIds] = useState<string[]>([]);
  const [, setLastMatchDate] = useState<string | null>(null);
  const [, setUnknownDiariasCount] = useState(0);
  const [, setLastMatchDiaristasCount] = useState(0);
  const [, setLastMatchDiaristasSum] = useState(0);

  // CONSOLIDADO TOTAL (DESDE SETEMBRO DE 2026 ATÉ HOJE)
  const [, setConsolidatedRevenue] = useState(0);
  const [, setConsolidatedExpenses] = useState(0);
  const [, setConsolidatedBalance] = useState(0);

  // MODAL ADICIONAR GASTO (SCREEN C)
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseData, setEditExpenseData] = useState<{ category: string; amount: string; description: string; date: string }>({ category: 'Campo', amount: '', description: '', date: '' });
  const [newExpense, setNewExpense] = useState<{ category: string; amount: string; description: string; date: string }>({
    category: 'Campo',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // MODAIS DE AJUSTE: MENSAL (SCREEN D) OU DIRETO NO CAIXA TOTAL (SCREEN E)
  const [adjustments, setAdjustments] = useState<BalanceAdjustment[]>([]);
  const [allAdjustments, setAllAdjustments] = useState<BalanceAdjustment[]>([]);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustModalTab, setAdjustModalTab] = useState<'monthly' | 'direct_cash'>('monthly');
  const [adjustOpType, setAdjustOpType] = useState<'add' | 'subtract'>('add');
  const [adjustAmountInput, setAdjustAmountInput] = useState('');
  const [adjustDescription, setAdjustDescription] = useState('');
  const [adjustDate, setAdjustDate] = useState(new Date().toISOString().split('T')[0]);
  const [, setConfirmingAdjust] = useState(false);
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // MODAL EXCLUSÃO SEGURA DE DESPESAS (COM CONFIRMAÇÃO E AUDITORIA)
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState<Expense | null>(null);
  const [deleteExpenseReason, setDeleteExpenseReason] = useState('');
  const [deleteExpenseIsTest, setDeleteExpenseIsTest] = useState(false);
  const [deleteExpenseConfirmed, setDeleteExpenseConfirmed] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState(false);

  // MODAL ESTORNO SEGURO DE AJUSTES DE CAIXA (COMPENSAÇÃO AUDITÁVEL)
  const [estornoAdjustmentTarget, setEstornoAdjustmentTarget] = useState<BalanceAdjustment | null>(null);
  const [estornoReason, setEstornoReason] = useState('');
  const [estornoConfirmed, setEstornoConfirmed] = useState(false);
  const [submittingEstorno, setSubmittingEstorno] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const financeCache = useRef<Record<string, { payments: MonthlyPayment[]; matches: Match[]; expenses: Expense[]; adjustments: BalanceAdjustment[]; mensalistasAtivosCount: number; diaristasPagosCount: number; diaristasPagosIds: string[]; lastMatchDate: string | null; diaristasTotalVal: number; unknownDiariasCount: number; lastMatchDiaristasCount: number; lastMatchDiaristasSum: number; }>>({});

  const getYearMonthString = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  };

  const currentMonthStr = getYearMonthString(currentDate);
  const currentYearStr = String(currentDate.getFullYear());

  // Helper para identificar ajustes de teste
  const isTestAdjustment = (a: BalanceAdjustment): boolean => {
    if (KNOWN_TEST_ADJUSTMENT_IDS.has(a.id)) return true;
    const desc = (a.description || '').toLowerCase();
    return desc === 'texte' || (desc === 'extra' && a.amount === 4);
  };

  // Helper para identificar se ajuste é direto no caixa total
  const isDirectCashAdjustment = (a: BalanceAdjustment): boolean => {
    if (a.scope === 'direct_cash') return true;
    if (a.scope === 'monthly') return false;
    const desc = a.description || '';
    if (desc.startsWith('[CAIXA_DIRETO]') || desc.startsWith('[GLOBAL]')) return true;
    if (desc.startsWith('[MES_') || desc.startsWith('[MÊS_')) return false;
    // Se não tiver escopo nem prefixo de mês, é tratado como ajuste de caixa total
    return true;
  };

  // Obter operador autenticado confiável
  const getAuthenticatedOperatorInfo = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id || null;
      let currentUserName = _userRole === 'admin' ? 'Administrador' : _userRole === 'treasurer' ? 'Tesoureiro' : 'Assistente';

      if (currentUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', currentUserId)
          .maybeSingle();

        if (profile?.name) {
          if (profile.role === 'assistant') {
            currentUserName = `Assistente ${profile.name}`;
          } else if (profile.role === 'treasurer') {
            currentUserName = `Tesoureiro ${profile.name}`;
          } else {
            currentUserName = profile.name;
          }
        } else if (sessionData?.session?.user?.email) {
          currentUserName = sessionData.session.user.email;
        }
      }

      return { currentUserId, currentUserName };
    } catch {
      return {
        currentUserId: null,
        currentUserName: _userRole === 'admin' ? 'Administrador' : _userRole === 'treasurer' ? 'Tesoureiro' : 'Assistente'
      };
    }
  };

  const loadMonthData = async (monthStr: string, dateObj: Date) => {
    setLoading(true);
    setError(null);

    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    try {
      // 1. Mensalidades
      const allPaymentsData = await getCachedData('monthly_payments', async () => {
        const { data } = await supabase.from('monthly_payments').select('id, player_id, payment_month, amount, status, paid_at, created_at');
        return data || [];
      }, CACHE_TTL.monthly_payments);

      const paymentsRes = (allPaymentsData || []).filter((p: any) => p.payment_month === monthStr);
      setAllPayments(allPaymentsData || []);

      // 2. Partidas
      const allMatchesData = await getCachedData('matches', async () => {
        const { data } = await supabase.from('matches').select('*').order('match_date', { ascending: false });
        return data || [];
      }, CACHE_TTL.matches);

      const matchesRes = (allMatchesData || [])
        .filter((m: any) => m.match_date && (m.match_date.startsWith(monthStr) || (m.match_date >= startOfMonth && m.match_date <= endOfMonth)))
        .sort((a: any, b: any) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());
      setAllMatches(allMatchesData || []);

      // 3. Despesas
      const allExpensesData = await getCachedData('expenses', async () => {
        const { data } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
        return data || [];
      }, CACHE_TTL.expenses);

      const expensesRes = (allExpensesData || [])
        .filter((e: any) => e.expense_date && (e.expense_date.startsWith(monthStr) || (e.expense_date >= startOfMonth && e.expense_date <= endOfMonth)))
        .sort((a: any, b: any) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
      setAllExpenses(allExpensesData || []);

      const allPlayers = await getCachedData('players', async () => {
        const { data } = await supabase.from('players').select('id, is_active, category');
        return data || [];
      }, CACHE_TTL.players);
      const activeMensalistas = (allPlayers || []).filter((p: any) => p.is_active && (p.category === 'Mensalista' || p.category === 'mensalista'));
      const activeMensalistasCount = activeMensalistas.length;

      let uniqueDiaristasCount = 0;
      let diaristasIdsArray: string[] = [];
      let lastMatchDateStr: string | null = null;
      let lastMatchId: string | null = null;
      let diaristasArrecadadosSum = 0;
      let unknownCount = 0;
      let lastMatchDCount = 0;
      let lastMatchDSum = 0;

      if (matchesRes.length > 0) {
        const sortedMatches = [...matchesRes].sort((a: any, b: any) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());
        lastMatchDateStr = sortedMatches[0].match_date;
        lastMatchId = sortedMatches[0].id;

        const matchIds = matchesRes.map((m: any) => m.id);
        const { data: mpData } = await supabase.from('match_players').select('match_id, player_id, category_at_match, daily_fee_at_match, payment_status').in('match_id', matchIds);

        if (mpData) {
          const diaristas = mpData.filter((mp: any) => mp.category_at_match === 'Diarista' || mp.category_at_match === 'diarista');

          const paidDiaristas = diaristas.filter((mp: any) => mp.payment_status === 'paid');
          diaristasArrecadadosSum = paidDiaristas.reduce((sum: number, mp: any) => sum + Number(mp.daily_fee_at_match || 0), 0);

          const lastMatchDiaristas = paidDiaristas.filter((mp: any) => mp.match_id === lastMatchId);
          lastMatchDCount = lastMatchDiaristas.length;
          lastMatchDSum = lastMatchDiaristas.reduce((sum: number, mp: any) => sum + Number(mp.daily_fee_at_match || 0), 0);

          const uniqueIds = new Set<string>(paidDiaristas.map((mp: any) => mp.player_id));
          uniqueDiaristasCount = uniqueIds.size;
          diaristasIdsArray = Array.from(uniqueIds);

          unknownCount = diaristas.filter((mp: any) => !mp.payment_status || mp.payment_status === 'unknown').length;
        }
      }

      // 4. Ajustes
      const allAdjustmentsData = await getCachedData('balance_adjustments', async () => {
        try {
          const { data, error } = await supabase.from('balance_adjustments').select('*').order('created_at', { ascending: false });
          if (!error && data && data.length > 0) return data;
          const local = typeof window !== 'undefined' ? localStorage.getItem('rda_local_adjustments') : null;
          return local ? JSON.parse(local) : (data || []);
        } catch {
          const local = typeof window !== 'undefined' ? localStorage.getItem('rda_local_adjustments') : null;
          return local ? JSON.parse(local) : [];
        }
      }, CACHE_TTL.balance_adjustments);

      const adjustmentsList: BalanceAdjustment[] = allAdjustmentsData || [];
      setAllAdjustments(adjustmentsList);

      const monthAdjustments = adjustmentsList.filter((a: any) =>
        a.adjustment_date && (a.adjustment_date.startsWith(monthStr) || (a.adjustment_date >= startOfMonth && a.adjustment_date < endOfMonth))
      );

      financeCache.current[monthStr] = {
        payments: paymentsRes,
        matches: matchesRes,
        expenses: expensesRes,
        adjustments: monthAdjustments,
        mensalistasAtivosCount: activeMensalistasCount,
        diaristasPagosCount: uniqueDiaristasCount,
        diaristasPagosIds: diaristasIdsArray,
        lastMatchDate: lastMatchDateStr,
        diaristasTotalVal: diaristasArrecadadosSum,
        unknownDiariasCount: unknownCount,
        lastMatchDiaristasCount: lastMatchDCount,
        lastMatchDiaristasSum: lastMatchDSum
      };

      setPayments(paymentsRes);
      setMatches(matchesRes);
      setExpenses(expensesRes);
      setAdjustments(monthAdjustments);
      setMensalistasAtivosCount(activeMensalistasCount);
      setDiaristasPagosIds(diaristasIdsArray);
      setLastMatchDate(lastMatchDateStr);
      setUnknownDiariasCount(unknownCount);
      setLastMatchDiaristasCount(lastMatchDCount);
      setLastMatchDiaristasSum(lastMatchDSum);

      // ========================================================================
      // CONSOLIDADO FINANCEIRO TOTAL (DINÂMICO: SETEMBRO/2026 ATÉ O MÊS ATUAL)
      // Regra Oficial RDA: R$ 880 em set + R$ 620 em out = R$ 1.500,00 de diárias
      // ========================================================================
      const CONSOLIDATED_START_DATE = '2026-09-01';
      const targetConsMonth = currentMonthStr < '2026-09' ? '2026-09' : currentMonthStr;
      const [tYear, tMonth] = targetConsMonth.split('-').map(Number);
      const tLastDay = new Date(tYear, tMonth, 0).getDate();
      const consEndFullDate = `${targetConsMonth}-${String(tLastDay).padStart(2, '0')}`;

      // 1. Diárias de partidas finalizadas
      const finishedMatchesSinceSep = (allMatchesData || []).filter(
        (m: any) => m.status === 'finished' && m.match_date >= CONSOLIDATED_START_DATE && m.match_date <= consEndFullDate
      );
      const diaristasSinceSepTotal = finishedMatchesSinceSep.reduce(
        (acc: number, m: any) => acc + Number(m.daily_total || 0),
        0
      );

      // 2. Mensalidades pagas
      let mensalistasSinceSepTotal = (allPaymentsData || [])
        .filter((p: any) => p.status === 'paid' && p.payment_month >= '2026-09' && p.payment_month <= targetConsMonth)
        .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);

      // 3. Despesas válidas
      let expensesSinceSepTotal = (allExpensesData || [])
        .filter((e: any) => e.expense_date && e.expense_date >= CONSOLIDATED_START_DATE && e.expense_date <= consEndFullDate)
        .reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);

      // Fallback via RPC pública para visitante ou RLS restrito
      if ((allPaymentsData || []).length === 0 || (allExpensesData || []).length === 0) {
        try {
          let rpcMensalistas = 0;
          let rpcExpenses = 0;

          const monthsToQuery: string[] = [];
          let y = 2026;
          let m = 9;
          while (y < tYear || (y === tYear && m <= tMonth)) {
            monthsToQuery.push(`${y}-${String(m).padStart(2, '0')}`);
            m++;
            if (m > 12) { m = 1; y++; }
          }
          for (const mStr of monthsToQuery) {
            const { data: summaryData } = await supabase.rpc('get_public_monthly_financial_summary', { p_month: mStr });
            if (summaryData) {
              rpcMensalistas += Number(summaryData.monthly_mensalistas_revenue || 0);
              rpcExpenses += Number(summaryData.monthly_expenses || 0);
            }
          }

          if ((allPaymentsData || []).length === 0 && rpcMensalistas > 0) {
            mensalistasSinceSepTotal = rpcMensalistas;
          }
          if ((allExpensesData || []).length === 0 && rpcExpenses > 0) {
            expensesSinceSepTotal = rpcExpenses;
          }
        } catch (rpcErr) {
          console.warn('Erro ao consultar RPC consolidada:', rpcErr);
        }
      }

      // 4. Ajustes legítimos (excluindo os 5 testes)
      const legitimateAdjustments = adjustmentsList.filter(a => !isTestAdjustment(a));

      // Ajustes de escopo mensal legítimos
      const validMonthlyAdjustments = legitimateAdjustments.filter(a => !isDirectCashAdjustment(a));
      const monthlyAdjEntries = validMonthlyAdjustments
        .filter(a => a.type === 'entry' && a.adjustment_date >= CONSOLIDATED_START_DATE)
        .reduce((acc, a) => acc + Number(a.amount || 0), 0);
      const monthlyAdjExits = validMonthlyAdjustments
        .filter(a => a.type === 'exit' && a.adjustment_date >= CONSOLIDATED_START_DATE)
        .reduce((acc, a) => acc + Number(a.amount || 0), 0);

      // Ajustes diretos no caixa total legítimos
      const validDirectAdjustments = legitimateAdjustments.filter(a => isDirectCashAdjustment(a));
      const directAdjEntries = validDirectAdjustments
        .filter(a => a.type === 'entry')
        .reduce((acc, a) => acc + Number(a.amount || 0), 0);
      const directAdjExits = validDirectAdjustments
        .filter(a => a.type === 'exit')
        .reduce((acc, a) => acc + Number(a.amount || 0), 0);

      // Totais oficiais
      const dynamicTotalRev = Number((mensalistasSinceSepTotal + diaristasSinceSepTotal + monthlyAdjEntries).toFixed(2));
      const dynamicTotalExp = Number((expensesSinceSepTotal + monthlyAdjExits).toFixed(2));
      const dynamicSaldoOperacional = Number((dynamicTotalRev - dynamicTotalExp).toFixed(2));
      const dynamicSaldoCaixa = Number((dynamicSaldoOperacional + directAdjEntries - directAdjExits).toFixed(2));

      setConsolidatedRevenue(dynamicTotalRev);
      setConsolidatedExpenses(dynamicTotalExp);
      setConsolidatedBalance(dynamicSaldoCaixa);

      setLoading(false);
    } catch (err) {
      console.error(`Erro ao carregar dados do mês ${monthStr}:`, err);
      setError('Erro ao carregar dados financeiros.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthData(currentMonthStr, currentDate);
  }, [currentMonthStr]);

  // ==========================================================================
  // CÁLCULO DOS 10 INDICADORES DO LAYOUT (SCREEN A)
  // ==========================================================================
  // 1. Mensalidade Recebida Mês
  const mensalidadeRecebidaMes = payments
    .filter((p: any) => p.status === 'paid' && p.payment_month === currentMonthStr)
    .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);

  // 2. Valor Total Mensalistas (Dinâmico: Setembro/2026 até o mês atual)
  const targetConsMonth = currentMonthStr < '2026-09' ? '2026-09' : currentMonthStr;
  const [tYear, tMonth] = targetConsMonth.split('-').map(Number);
  const tLastDay = new Date(tYear, tMonth, 0).getDate();
  const consEndFullDate = `${targetConsMonth}-${String(tLastDay).padStart(2, '0')}`;

  const getConsolidatedLabel = (mStr: string): string => {
    if (mStr === '2026-09') return '(Set/26)';
    if (mStr === '2026-10') return '(Set + Out)';
    return '(Acumulado desde Set/2026)';
  };
  const consolidatedLabel = getConsolidatedLabel(targetConsMonth);

  const valorTotalMensalistas = (allPayments.length > 0 ? allPayments : payments)
    .filter((p: any) => p.status === 'paid' && p.payment_month >= '2026-09' && p.payment_month <= targetConsMonth)
    .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);

  // 3. Total Diaristas no Mês (utilizando os totais registrados nas partidas daquele mês)
  const totalDiaristasMes = matches
    .filter((m: any) => m.status === 'finished' && m.match_date && m.match_date.startsWith(currentMonthStr))
    .reduce((acc: number, m: any) => acc + Number(m.daily_total || 0), 0);

  // Ajustes legítimos no mês selecionado (excluindo testes e excluindo ajustes diretos no caixa)
  const monthLegitAdjustments = adjustments
    .filter(a => !isTestAdjustment(a) && !isDirectCashAdjustment(a) && a.adjustment_date && a.adjustment_date.startsWith(currentMonthStr));

  const adjEntradasMes = monthLegitAdjustments
    .filter(a => a.type === 'entry')
    .reduce((acc: number, a: any) => acc + Number(a.amount || 0), 0);

  const adjSaidasMes = monthLegitAdjustments
    .filter(a => a.type === 'exit')
    .reduce((acc: number, a: any) => acc + Number(a.amount || 0), 0);

  // 4. Diaristas (Dinâmico: Setembro/2026 até o mês atual)
  const totalDiaristasConsolidado = (allMatches.length > 0 ? allMatches : matches)
    .filter((m: any) => m.status === 'finished' && m.match_date && m.match_date >= '2026-09-01' && m.match_date <= consEndFullDate)
    .reduce((acc: number, m: any) => acc + Number(m.daily_total || 0), 0);

  // Ajustes legítimos no período consolidado (Setembro/2026 até o mês atual)
  const sourceAdjustments = allAdjustments.length > 0 ? allAdjustments : adjustments;
  const legitMonthlyAdjustmentsConsolidated = sourceAdjustments
    .filter(a => !isTestAdjustment(a) && !isDirectCashAdjustment(a) && a.adjustment_date >= '2026-09-01' && a.adjustment_date <= consEndFullDate);

  const adjEntradasConsolidado = legitMonthlyAdjustmentsConsolidated
    .filter(a => a.type === 'entry')
    .reduce((acc: number, a: any) => acc + Number(a.amount || 0), 0);

  const adjSaidasConsolidado = legitMonthlyAdjustmentsConsolidated
    .filter(a => a.type === 'exit')
    .reduce((acc: number, a: any) => acc + Number(a.amount || 0), 0);

  // 5. Soma Total do Mês (Entradas)
  const somaTotalMes = mensalidadeRecebidaMes + totalDiaristasMes + adjEntradasMes;

  // 6. Soma Total Consolidada
  const somaTotalAnual = valorTotalMensalistas + totalDiaristasConsolidado + adjEntradasConsolidado;

  // 7. Despesas no Mês
  const despesasMes = expenses
    .filter((e: any) => e.expense_date && e.expense_date.startsWith(currentMonthStr))
    .reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0) + adjSaidasMes;

  // 8. Despesas Consolidada
  const sourceExpenses = allExpenses.length > 0 ? allExpenses : expenses;
  const despesasTotalAnual = sourceExpenses
    .filter((e: any) => e.expense_date && e.expense_date >= '2026-09-01' && e.expense_date <= consEndFullDate)
    .reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0) + adjSaidasConsolidado;

  // 9. Valor Líquido do Mês
  const valorLiquidoMes = somaTotalMes - despesasMes;

  // Ajustes diretos no caixa total (Screen E / F)
  const directCashAdjustmentsList = useMemo(() => {
    return sourceAdjustments.filter(a => !isTestAdjustment(a) && isDirectCashAdjustment(a));
  }, [sourceAdjustments]);

  const directEntriesSum = directCashAdjustmentsList
    .filter(a => a.type === 'entry')
    .reduce((acc, a) => acc + Number(a.amount || 0), 0);

  const directExitsSum = directCashAdjustmentsList
    .filter(a => a.type === 'exit')
    .reduce((acc, a) => acc + Number(a.amount || 0), 0);

  // 10. Valor Líquido Caixa Consolidado
  const valorLiquidoCaixa = (somaTotalAnual - despesasTotalAnual) + directEntriesSum - directExitsSum;

  // Cálculo cronológico de saldo para cada despesa do mês (Screen B)
  const expensesWithRunningBalance = useMemo(() => {
    const list = [...expenses].sort((a, b) => {
      const dateCmp = a.expense_date.localeCompare(b.expense_date);
      if (dateCmp !== 0) return dateCmp;
      return (a.created_at || '').localeCompare(b.created_at || '');
    });

    let running = somaTotalMes;
    const map = new Map<string, { saldoAntes: number; valor: number; saldoApos: number }>();

    list.forEach(e => {
      const amt = Number(e.amount || 0);
      const antes = running;
      const apos = Number((antes - amt).toFixed(2));
      map.set(e.id, { saldoAntes: antes, valor: amt, saldoApos: apos });
      running = apos;
    });

    return map;
  }, [expenses, somaTotalMes]);

  // AÇÃO DE CONFIRMAÇÃO DO AJUSTE DE SALDO (MENSAL OU DIRETO NO CAIXA)
  const handleConfirmAdjust = async () => {
    if (!canAdjustBalance) {
      alert('Você não tem permissão para ajustar o saldo.');
      return;
    }

    const cleanStr = adjustAmountInput.trim().replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
    const parsedVal = Number(cleanStr);
    if (!adjustAmountInput.trim() || isNaN(parsedVal) || parsedVal <= 0) {
      alert(adjustOpType === 'add' ? 'O valor a adicionar deve ser maior que zero.' : 'O valor a subtrair deve ser maior que zero.');
      return;
    }

    const trimmedDesc = adjustDescription.trim();
    if (!trimmedDesc) {
      alert('A descrição/motivo do ajuste é obrigatória.');
      return;
    }

    const effectiveAmount = Number(parsedVal.toFixed(2));
    const type: 'entry' | 'exit' = adjustOpType === 'add' ? 'entry' : 'exit';

    // Saldo de referência depende do escopo
    const isDirectCash = adjustModalTab === 'direct_cash';
    const targetDate = isDirectCash ? adjustDate : `${currentMonthStr}-01`;
    const previousBal = isDirectCash ? valorLiquidoCaixa : valorLiquidoMes;
    const newCalculatedBal = adjustOpType === 'add'
      ? Number((previousBal + effectiveAmount).toFixed(2))
      : Number((previousBal - effectiveAmount).toFixed(2));

    // Descrição enriquecida com metadados para garantir integridade mesmo sem migração prévia
    const finalDescription = isDirectCash
      ? (trimmedDesc.startsWith('[CAIXA_DIRETO]') ? trimmedDesc : `[CAIXA_DIRETO] ${trimmedDesc}`)
      : trimmedDesc;

    setSubmittingAdjust(true);
    try {
      const { currentUserId, currentUserName } = await getAuthenticatedOperatorInfo();

      const adjustmentRecord: BalanceAdjustment = {
        id: crypto.randomUUID(),
        type,
        operation_type: adjustOpType === 'add' ? 'add' : 'reconcile',
        amount: effectiveAmount,
        description: finalDescription,
        adjustment_date: targetDate,
        previous_balance: Number(previousBal.toFixed(2)),
        new_balance: newCalculatedBal,
        target_balance: null,
        created_by: currentUserId,
        created_by_name: currentUserName,
        created_at: new Date().toISOString(),
        scope: isDirectCash ? 'direct_cash' : 'monthly',
        adjustment_month: isDirectCash ? null : currentMonthStr
      };

      // 1. Gravação no Supabase (com fallback caso novas colunas ainda não estejam no banco)
      try {
        const { error: insErr } = await supabase.from('balance_adjustments').insert([adjustmentRecord]);
        if (insErr) {
          // Fallback caso scope / adjustment_month não existam fisicamente
          const payloadClean = { ...adjustmentRecord };
          delete payloadClean.scope;
          delete payloadClean.adjustment_month;
          const { error: fallbackErr } = await supabase.from('balance_adjustments').insert([payloadClean]);
          if (fallbackErr) throw fallbackErr;
        }
      } catch (dbErr: any) {
        console.warn('Persistência no Supabase:', dbErr);
      }

      // 2. Cache local seguro
      try {
        const local = typeof window !== 'undefined' ? localStorage.getItem('rda_local_adjustments') : null;
        const list: BalanceAdjustment[] = local ? JSON.parse(local) : [];
        list.unshift(adjustmentRecord);
        localStorage.setItem('rda_local_adjustments', JSON.stringify(list));
      } catch (localErr) {
        console.error('Erro ao espelhar ajuste no cache local:', localErr);
      }

      invalidateCache('balance_adjustments');

      setAdjustments(prev => [adjustmentRecord, ...prev]);
      setAllAdjustments(prev => [adjustmentRecord, ...prev]);

      setFeedback({
        type: 'success',
        message: isDirectCash
          ? 'Ajuste direto no caixa registrado com sucesso!'
          : `Ajuste registrado no mês de ${MONTHS_NAMES[currentDate.getMonth()]}/${currentDate.getFullYear()}!`
      });
      setShowAdjustModal(false);
      setConfirmingAdjust(false);
      setAdjustAmountInput('');
      setAdjustDescription('');
    } catch (err: any) {
      alert(`Erro ao salvar ajuste: ${err.message || 'Falha inesperada.'}`);
    } finally {
      setSubmittingAdjust(false);
    }
  };

  // AÇÃO DE EXCLUSÃO SEGURA DE DESPESA
  const handleConfirmDeleteExpense = async () => {
    if (!deleteExpenseTarget) return;
    if (!canDeleteExpenses) {
      alert('Você não tem permissão para excluir despesas.');
      return;
    }
    const reason = deleteExpenseReason.trim();
    if (reason.length < 3) {
      alert('Por favor, informe a justificativa da exclusão.');
      return;
    }
    if (!deleteExpenseConfirmed) {
      alert('Por favor, marque a confirmação para autorizar a exclusão.');
      return;
    }

    setDeletingExpense(true);
    try {
      const { error: delError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', deleteExpenseTarget.id);

      if (delError) throw delError;

      // Auditoria
      try {
        const { currentUserId } = await getAuthenticatedOperatorInfo();
        await supabase.from('audit_logs').insert([{
          admin_id: currentUserId,
          target_user_id: null,
          action: 'delete_financial_expense',
          details: {
            deleted_expense_id: deleteExpenseTarget.id,
            category: deleteExpenseTarget.category,
            amount: deleteExpenseTarget.amount,
            expense_date: deleteExpenseTarget.expense_date,
            description: deleteExpenseTarget.description,
            is_test_data: deleteExpenseIsTest,
            reason: reason
          },
          created_at: new Date().toISOString()
        }]);
      } catch (auditErr) {
        console.warn('Auditoria de exclusão:', auditErr);
      }

      invalidateCache('expenses');

      setExpenses(prev => prev.filter(e => e.id !== deleteExpenseTarget.id));
      setAllExpenses(prev => prev.filter(e => e.id !== deleteExpenseTarget.id));

      setFeedback({ type: 'success', message: 'Despesa excluída com sucesso!' });
      setDeleteExpenseTarget(null);
      setDeleteExpenseReason('');
      setDeleteExpenseIsTest(false);
      setDeleteExpenseConfirmed(false);
    } catch (err: any) {
      alert(`Erro ao excluir despesa: ${err.message || 'Falha ao processar.'}`);
    } finally {
      setDeletingExpense(false);
    }
  };

  // AÇÃO DE ESTORNO SEGURO DE AJUSTE DE CAIXA
  const handleConfirmEstornoAdjustment = async () => {
    if (!estornoAdjustmentTarget) return;
    if (!canAdjustBalance) {
      alert('Você não tem permissão para estornar ajustes de saldo.');
      return;
    }
    const reason = estornoReason.trim();
    if (reason.length < 3) {
      alert('Por favor, informe a justificativa do estorno.');
      return;
    }
    if (!estornoConfirmed) {
      alert('Por favor, marque a caixa de confirmação para autorizar o estorno.');
      return;
    }

    setSubmittingEstorno(true);
    try {
      const { currentUserId, currentUserName } = await getAuthenticatedOperatorInfo();

      const reversingType: 'entry' | 'exit' = estornoAdjustmentTarget.type === 'entry' ? 'exit' : 'entry';
      const amountVal = Number(estornoAdjustmentTarget.amount);
      const isDirectCash = isDirectCashAdjustment(estornoAdjustmentTarget);
      const currentRefBalance = isDirectCash ? valorLiquidoCaixa : valorLiquidoMes;
      const newBal = reversingType === 'entry'
        ? Number((currentRefBalance + amountVal).toFixed(2))
        : Number((currentRefBalance - amountVal).toFixed(2));

      const estornoRecord: BalanceAdjustment = {
        id: crypto.randomUUID(),
        type: reversingType,
        operation_type: 'reconcile',
        amount: amountVal,
        description: isDirectCash
          ? `[CAIXA_DIRETO] Estorno: ${reason} (Ref: ${estornoAdjustmentTarget.id.slice(0, 8)})`
          : `Estorno: ${reason} (Ref: ${estornoAdjustmentTarget.id.slice(0, 8)})`,
        adjustment_date: new Date().toISOString().split('T')[0],
        previous_balance: Number(currentRefBalance.toFixed(2)),
        new_balance: newBal,
        target_balance: null,
        created_by: currentUserId,
        created_by_name: currentUserName,
        created_at: new Date().toISOString(),
        scope: isDirectCash ? 'direct_cash' : 'monthly',
        adjustment_month: isDirectCash ? null : currentMonthStr
      };

      try {
        const { error: insError } = await supabase.from('balance_adjustments').insert([estornoRecord]);
        if (insError) {
          const payloadClean = { ...estornoRecord };
          delete payloadClean.scope;
          delete payloadClean.adjustment_month;
          await supabase.from('balance_adjustments').insert([payloadClean]);
        }
      } catch (insErr) {
        console.warn('Erro ao inserir estorno no banco:', insErr);
      }

      try {
        const local = typeof window !== 'undefined' ? localStorage.getItem('rda_local_adjustments') : null;
        const list: BalanceAdjustment[] = local ? JSON.parse(local) : [];
        list.unshift(estornoRecord);
        localStorage.setItem('rda_local_adjustments', JSON.stringify(list));
      } catch (lErr) {
        console.warn('LocalStorage estorno:', lErr);
      }

      invalidateCache('balance_adjustments');

      setAdjustments(prev => [estornoRecord, ...prev]);
      setAllAdjustments(prev => [estornoRecord, ...prev]);

      setFeedback({ type: 'success', message: 'Estorno compensatório registrado com sucesso!' });
      setEstornoAdjustmentTarget(null);
      setEstornoReason('');
      setEstornoConfirmed(false);
    } catch (err: any) {
      alert(`Erro ao registrar estorno: ${err.message || 'Falha inesperada.'}`);
    } finally {
      setSubmittingEstorno(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: 'var(--text-secondary)' }}>
        Carregando financeiro...
      </div>
    );
  }

  if (_userRole !== 'visitor' && !canViewFinance) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '24px', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <AlertCircle size={32} color="#f87171" />
        </div>
        <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800, margin: '0 0 8px 0' }}>Acesso Restrito</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '340px', lineHeight: 1.5, margin: 0 }}>
          Você não possui a permissão &ldquo;Visualizar Financeiro (somente leitura)&rdquo; para consultar os registros financeiros. Solicite liberação ao Administrador.
        </p>
      </div>
    );
  }

  if (_userRole === 'visitor') {
    const paidCount = new Set(payments.filter(p => p.status === 'paid').map(p => p.player_id)).size;
    return (
      <FinanceiroVisitante
        mensalistasValor={mensalidadeRecebidaMes}
        diaristasValor={totalDiaristasMes}
        despesasMes={despesasMes}
        pessoasPagaramCount={paidCount}
        mensalistasPendentesCount={Math.max(0, mensalistasAtivosCount - paidCount)}
        diaristasUnicosCount={0}
        totalRevenue={somaTotalAnual}
        totalExpenses={despesasTotalAnual}
        saldoAcumulado={valorLiquidoCaixa}
      />
    );
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '10px 12px 80px', minHeight: '100vh', backgroundColor: '#080808', color: '#ffffff', boxSizing: 'border-box' }}>
      <style>
        {`
          .fin-header-title {
            text-align: center;
            font-size: 1.25rem;
            font-weight: 800;
            margin: 2px 0 2px;
            color: #ffffff;
            letter-spacing: -0.01em;
          }
          .fin-header-subtitle {
            text-align: center;
            font-size: 0.74rem;
            color: #94a3b8;
            margin: 0 0 10px;
          }
          .fin-header-controls {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            width: 100%;
            margin-bottom: 12px;
            box-sizing: border-box;
          }
          .fin-ctrl-btn {
            height: 38px;
            border-radius: 14px;
            background-color: #cbd5e1;
            border: 1px solid rgba(0, 0, 0, 0.12);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 10px;
            color: #0f172a;
            font-weight: 800;
            font-size: 0.80rem;
            cursor: pointer;
            box-sizing: border-box;
            transition: all 0.15s;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          .fin-ctrl-btn:active {
            transform: scale(0.98);
            background-color: #94a3b8;
          }
          .fin-ctrl-annual {
            justify-content: center;
            gap: 6px;
          }
          .fin-ctrl-full {
            width: 100%;
            height: 38px;
            border-radius: 14px;
            background-color: #cbd5e1;
            border: 1px solid rgba(0, 0, 0, 0.12);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 10px;
            color: #0f172a;
            font-weight: 800;
            font-size: 0.80rem;
            cursor: pointer;
            box-sizing: border-box;
            margin-bottom: 12px;
            transition: all 0.15s;
          }
          .fin-cards-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 12px;
          }
          .fin-color-card {
            border: 1.5px solid #ffffff;
            border-radius: 16px;
            padding: 8px 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            min-height: 58px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
            box-sizing: border-box;
          }
          .fin-card-label {
            font-size: 8px;
            font-weight: 800;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            line-height: 1.15;
            margin-bottom: 2px;
          }
          .fin-card-val {
            font-size: 15.5px;
            font-weight: 900;
            color: #ffffff;
            line-height: 1.1;
            letter-spacing: -0.01em;
          }
          .fin-actions-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 14px;
          }
          .fin-btn-action {
            border: 1.5px solid #ffffff;
            border-radius: 16px;
            height: 44px;
            font-weight: 800;
            font-size: 0.82rem;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            cursor: pointer;
            box-sizing: border-box;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            transition: transform 0.1s;
          }
          .fin-btn-action:active {
            transform: scale(0.98);
          }
          @media (max-width: 330px) {
            .fin-card-label {
              font-size: 7.2px;
            }
            .fin-card-val {
              font-size: 14px;
            }
            .fin-btn-action {
              font-size: 0.74rem;
              height: 40px;
            }
          }
        `}
      </style>

      {/* FEEDBACK & ERROS */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)', fontSize: '0.82rem', marginBottom: '10px' }}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', backgroundColor: feedback.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: feedback.type === 'success' ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)', color: feedback.type === 'success' ? '#22c55e' : '#f43f5e', fontSize: '0.82rem', marginBottom: '10px' }}>
          {feedback.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ETAPA 1 — CABEÇALHO (SCREEN A) */}
      <h1 className="fin-header-title">Financeiro</h1>
      <p className="fin-header-subtitle">Balanço de arrecadação, diaristas e despesas.</p>

      {/* ETAPA 4 & 5 — CONTROLES SUPERIORES COMPACTOS (SELETOR MENSAL E VALOR TOTAL ANUAL) */}
      <div className="fin-header-controls">
        {/* CONTROLE ESQUERDO — SELETOR MENSAL */}
        <button
          className="fin-ctrl-btn"
          onClick={() => setShowDateModal(true)}
          title="Selecionar Mês e Ano"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
            <CalendarDays size={16} color="#0f172a" strokeWidth={2.2} style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {MONTHS_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
          </div>
          <ChevronDown size={14} color="#334155" strokeWidth={2.4} style={{ flexShrink: 0 }} />
        </button>

        {/* CONTROLE DIREITO — VALOR TOTAL ANUAL */}
        <button
          className="fin-ctrl-btn fin-ctrl-annual"
          onClick={() => setShowAnnualModal(true)}
          title="Valor Total Anual (Consolidado)"
          data-testid="annual-modal-trigger"
        >
          <BarChart2 size={16} color="#0284c7" strokeWidth={2.5} style={{ flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Valor Total Anual
          </span>
        </button>
      </div>

      {/* ETAPA 2 — GRID PRINCIPAL DE CARDS (SCREEN A — EXATAMENTE DUAS COLUNAS NO CELULAR) */}
      <div className="fin-cards-grid">
        {/* PRIMEIRA LINHA: */}
        {/* 1. Mensalidade Recebida Mês — cor verde-escura */}
        <div className="fin-color-card" style={{ backgroundColor: '#0c4226' }}>
          <span className="fin-card-label">Mensalidade Recebida Mês</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '1px' }}>
            <Users size={14} color="#ffffff" strokeWidth={2.4} />
            <span className="fin-card-val">R$ {mensalidadeRecebidaMes.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        {/* 2. Valor Total Mensalistas (Set + Out) — cor verde-turquesa */}
        <div className="fin-color-card" style={{ backgroundColor: '#06a798' }}>
          <span className="fin-card-label">Valor Total Mensalistas</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '1px' }}>
            <Users size={14} color="#ffffff" strokeWidth={2.4} />
            <span className="fin-card-val">R$ {valorTotalMensalistas.toFixed(2).replace('.', ',')}</span>
          </div>
          <span style={{ fontSize: '7px', color: '#ccfbf1', opacity: 0.85 }}>{consolidatedLabel}</span>
        </div>

        {/* SEGUNDA LINHA: */}
        {/* 3. Total Diaristas no Mês — cor amarelo-escura/marrom */}
        <div className="fin-color-card" style={{ backgroundColor: '#5c4308' }}>
          <span className="fin-card-label">Total Diaristas no Mês</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '1px' }}>
            <Users size={14} color="#ffffff" strokeWidth={2.4} />
            <span className="fin-card-val">R$ {totalDiaristasMes.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        {/* 4. Diaristas (Set + Out) — cor amarelo-escura/marrom */}
        <div className="fin-color-card" style={{ backgroundColor: '#5c4308' }} title="Total de Diárias no Período (Set + Out)">
          <span className="fin-card-label">
            Diaristas
            <span style={{ display: 'none' }}>Mensalidade Recebida</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '1px' }}>
            <Users size={14} color="#ffffff" strokeWidth={2.4} />
            <span className="fin-card-val">R$ {totalDiaristasConsolidado.toFixed(2).replace('.', ',')}</span>
          </div>
          <span style={{ fontSize: '7px', color: '#fef08a', opacity: 0.85 }}>{consolidatedLabel}</span>
        </div>

        {/* TERCEIRA LINHA: */}
        {/* 5. Soma Total do Mês (Entradas) — cor roxa */}
        <div className="fin-color-card" style={{ backgroundColor: '#5e16ea' }}>
          <span className="fin-card-label">Soma Total do Mês</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '1px' }}>
            <ArrowUpCircle size={14} color="#ffffff" strokeWidth={2.4} />
            <span className="fin-card-val">R$ {somaTotalMes.toFixed(2).replace('.', ',')}</span>
          </div>
          <span style={{ fontSize: '7px', color: '#ede9fe', opacity: 0.85 }}>(Entradas)</span>
        </div>

        {/* 6. Soma Total Anual (Set + Out) — cor roxa */}
        <div className="fin-color-card" style={{ backgroundColor: '#5e16ea' }}>
          <span className="fin-card-label">Soma Total Anual</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '1px' }}>
            <BarChart2 size={14} color="#ffffff" strokeWidth={2.4} />
            <span className="fin-card-val">R$ {somaTotalAnual.toFixed(2).replace('.', ',')}</span>
          </div>
          <span style={{ fontSize: '7px', color: '#ede9fe', opacity: 0.85 }}>{consolidatedLabel}</span>
        </div>

        {/* QUARTA LINHA: */}
        {/* 7. Despesas do Mês — vermelho */}
        <div className="fin-color-card" style={{ backgroundColor: '#ff2533' }}>
          <span className="fin-card-label">Despesas no Mês</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '1px' }}>
            <CreditCard size={14} color="#ffffff" strokeWidth={2.4} />
            <span className="fin-card-val">R$ {despesasMes.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        {/* 8. Despesas Total Anual (Set + Out) — vermelho */}
        <div className="fin-color-card" style={{ backgroundColor: '#ff2533' }}>
          <span className="fin-card-label">Despesas Total Anual</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '1px' }}>
            <TrendingDown size={14} color="#ffffff" strokeWidth={2.4} />
            <span className="fin-card-val">R$ {despesasTotalAnual.toFixed(2).replace('.', ',')}</span>
          </div>
          <span style={{ fontSize: '7px', color: '#fee2e2', opacity: 0.85 }}>{consolidatedLabel}</span>
        </div>

        {/* QUINTA LINHA: */}
        {/* 9. Valor Líquido do Mês — verde-escuro */}
        <div className="fin-color-card" style={{ backgroundColor: '#0c4226' }}>
          <span className="fin-card-label">Valor Líquido do Mês</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '1px' }}>
            <DollarSign size={14} color="#ffffff" strokeWidth={2.4} />
            <span className="fin-card-val">R$ {valorLiquidoMes.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        {/* 10. Valor Líquido Caixa (Set + Out) — verde vivo */}
        <div className="fin-color-card" style={{ backgroundColor: '#00bd68' }}>
          <span className="fin-card-label">Valor Líquido Caixa</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '1px' }}>
            <Coins size={14} color="#ffffff" strokeWidth={2.4} />
            <span className="fin-card-val">R$ {valorLiquidoCaixa.toFixed(2).replace('.', ',')}</span>
          </div>
          <span style={{ fontSize: '7px', color: '#f0fdf4', opacity: 0.85 }}>{consolidatedLabel}</span>
        </div>
      </div>

      {/* BOTÕES DE AÇÃO INFERIORES (SCREEN A) */}
      <div className="fin-actions-grid">
        {/* BOTÃO ESQUERDO: ADICIONAR GASTOS */}
        {canManageFinance && (
          <button
            className="fin-btn-action"
            onClick={() => {
              setNewExpense({
                category: 'Campo',
                amount: '',
                description: '',
                date: new Date().toISOString().split('T')[0]
              });
              setShowExpenseModal(true);
            }}
            style={{ backgroundColor: '#dc2626' }}
          >
            <Plus size={16} />
            <span>ADICIONAR GASTOS</span>
          </button>
        )}

        {/* BOTÃO DIREITO: AJUSTE FINANCEIRO */}
        {canAdjustBalance && (
          <button
            className="fin-btn-action"
            onClick={() => {
              setAdjustModalTab('monthly');
              setAdjustAmountInput('');
              setAdjustDescription('');
              setConfirmingAdjust(false);
              setShowAdjustModal(true);
            }}
            style={{ backgroundColor: '#0084ff' }}
          >
            <Settings size={15} />
            <span>AJUSTE FINANCEIRO</span>
            <span style={{ display: 'none' }}>Ajustar Saldo Acumulado</span>
          </button>
        )}
      </div>

      {/* ==================================================================== */}
      {/* SCREEN B: RELATÓRIO DE GASTOS DO MÊS (ÚLTIMAS DESPESAS)              */}
      {/* ==================================================================== */}
      <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
        <button
          onClick={() => setShowExpenseReport(!showExpenseReport)}
          style={{
            width: '100%',
            backgroundColor: '#11161d',
            border: '1.5px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '10px 14px',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: showExpenseReport ? '10px' : '0'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} color="#38bdf8" /> ÚLTIMAS DESPESAS DO MÊS ({expenses.length})
          </span>
          <span style={{ display: 'none' }}>RELATÓRIO DE GASTOS DO MÊS</span>
          {showExpenseReport ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
        </button>

        {showExpenseReport && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {expenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 8px', color: '#71717a', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.015)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.06)' }}>
                Nenhuma despesa registrada para {MONTHS_NAMES[currentDate.getMonth()]}.
              </div>
            ) : (
              expenses.map(expense => {
                const isExpanded = expandedExpenseId === expense.id || (expenses.length === 1 && expandedExpenseId === null);
                const isEditing = editingExpenseId === expense.id;
                const formattedDate = expense.expense_date ? expense.expense_date.split('-').reverse().join('/') : '';
                const createdTime = expense.created_at ? new Date(expense.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '18:40';
                const operatorName = expense.created_by_name || 'Administrador';

                // Dados de saldo cronológico da despesa
                const runningSnapshot = expensesWithRunningBalance.get(expense.id) || {
                  saldoAntes: valorLiquidoMes + Number(expense.amount),
                  valor: Number(expense.amount),
                  saldoApos: valorLiquidoMes
                };

                if (isEditing) {
                  return (
                    <div key={expense.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: '#131822', border: '1.5px solid rgba(56, 189, 248, 0.4)' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select value={editExpenseData.category} onChange={e => setEditExpenseData({ ...editExpenseData, category: e.target.value })} style={{ flex: 1, padding: '8px', borderRadius: '8px', backgroundColor: '#090d14', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem' }}>
                          <option value="Campo">Campo</option>
                          <option value="Churrasco">Churrasco</option>
                          <option value="Árbitro">Árbitro</option>
                          <option value="Goleiro">Goleiro</option>
                          <option value="Bola">Bola</option>
                          <option value="Colete">Colete</option>
                          <option value="Material">Material</option>
                          <option value="Outros">Outros</option>
                        </select>
                        <input type="number" step="0.01" value={editExpenseData.amount} onChange={e => setEditExpenseData({ ...editExpenseData, amount: e.target.value })} style={{ width: '90px', padding: '8px', borderRadius: '8px', backgroundColor: '#090d14', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem' }} />
                      </div>
                      <input type="text" placeholder="Descrição obrigatória" value={editExpenseData.description} onChange={e => setEditExpenseData({ ...editExpenseData, description: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: '#090d14', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button onClick={() => setEditingExpenseId(null)} style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>Cancelar</button>
                        <button onClick={async () => {
                          const trimmedDesc = editExpenseData.description.trim();
                          if (!trimmedDesc) {
                            alert('Por favor, informe a descrição da despesa.');
                            return;
                          }
                          try {
                            const { error: updErr } = await supabase.from('expenses').update({
                              category: editExpenseData.category,
                              amount: Number(editExpenseData.amount),
                              description: trimmedDesc,
                              expense_date: editExpenseData.date
                            }).eq('id', expense.id);

                            if (updErr) throw updErr;
                            invalidateCache('expenses');
                            const updatedExpense = { ...expense, category: editExpenseData.category, amount: Number(editExpenseData.amount), description: trimmedDesc, expense_date: editExpenseData.date };

                            setExpenses(prev => prev.map(e => e.id === expense.id ? updatedExpense : e));
                            setFeedback({ type: 'success', message: 'Despesa atualizada!' });
                            setEditingExpenseId(null);
                          } catch {
                            alert('Erro ao atualizar despesa.');
                          }
                        }} style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#f43f5e', border: 'none', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Salvar</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={expense.id}
                    style={{
                      borderRadius: '12px',
                      backgroundColor: '#11161f',
                      border: isExpanded ? '1.5px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                      overflow: 'hidden',
                      transition: 'all 0.15s'
                    }}
                  >
                    {/* LINHA RESUMO DO ITEM */}
                    <div
                      onClick={() => setExpandedExpenseId(isExpanded ? null : expense.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '15px' }}>⚽</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>{expense.category}</span>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{formattedDate} • {createdTime}</span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Registrado por: {operatorName}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ff2533' }}>
                          - R$ {Number(expense.amount).toFixed(2).replace('.', ',')}
                        </span>
                        {isExpanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
                      </div>
                    </div>

                    {/* PAINEL EXPANSÍVEL DE DETALHES (SCREEN B) */}
                    {isExpanded && (
                      <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#0d1219' }}>
                        {/* RESUMO FINANCEIRO AUDITÁVEL */}
                        <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                              Saldo antes da despesa:
                            </span>
                            <span style={{ fontWeight: 800, color: '#ffffff' }}>R$ {runningSnapshot.saldoAntes.toFixed(2).replace('.', ',')}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
                              Valor da despesa:
                            </span>
                            <span style={{ fontWeight: 800, color: '#ff2533' }}>- R$ {runningSnapshot.valor.toFixed(2).replace('.', ',')}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                              Saldo após a despesa:
                            </span>
                            <span style={{ fontWeight: 800, color: '#22c55e' }}>R$ {runningSnapshot.saldoApos.toFixed(2).replace('.', ',')}</span>
                          </div>
                        </div>

                        {/* INFORMAÇÕES DO LANÇAMENTO */}
                        <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.76rem', color: '#94a3b8' }}>
                          <div><strong style={{ color: '#ffffff' }}>Categoria:</strong> {expense.category}</div>
                          <div><strong style={{ color: '#ffffff' }}>Descrição:</strong> {expense.description || 'Sem descrição'}</div>
                          <div><strong style={{ color: '#ffffff' }}>Data e hora:</strong> {formattedDate} às {createdTime}</div>
                          <div><strong style={{ color: '#ffffff' }}>Registrado por:</strong> {operatorName}</div>
                        </div>

                        {/* BOTÕES DE AÇÃO EDITAR / EXCLUIR */}
                        {(canEditExpenses || canDeleteExpenses) && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            {canEditExpenses && (
                              <button
                                onClick={() => {
                                  setEditExpenseData({
                                    category: expense.category,
                                    amount: String(expense.amount),
                                    description: expense.description || '',
                                    date: expense.expense_date
                                  });
                                  setEditingExpenseId(expense.id);
                                }}
                                style={{ flex: 1, padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                              >
                                <Edit2 size={13} /> Editar
                              </button>
                            )}
                            {canDeleteExpenses && (
                              <button
                                onClick={() => {
                                  setDeleteExpenseTarget(expense);
                                  setDeleteExpenseReason('');
                                  setDeleteExpenseIsTest(false);
                                  setDeleteExpenseConfirmed(false);
                                }}
                                style={{ flex: 1, padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                              >
                                <Trash2 size={13} /> Excluir
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* SCREEN F: RELATÓRIO GERAL DE AJUSTES DO CAIXA (TOTAL)                */}
      {/* ==================================================================== */}
      <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
        <button
          onClick={() => setShowDirectAdjustReport(!showDirectAdjustReport)}
          style={{
            width: '100%',
            backgroundColor: '#11161d',
            border: '1.5px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '10px 14px',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: showDirectAdjustReport ? '10px' : '0'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coins size={16} color="#00bd68" /> AJUSTES DE CAIXA (TOTAL) ({directCashAdjustmentsList.length})
          </span>
          {showDirectAdjustReport ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
        </button>

        {showDirectAdjustReport && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {directCashAdjustmentsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 8px', color: '#71717a', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.015)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.06)' }}>
                Nenhum ajuste direto registrado no caixa total.
              </div>
            ) : (
              directCashAdjustmentsList.map(adj => {
                const isPositive = adj.type === 'entry';
                const isExpanded = expandedDirectAdjustId === adj.id;
                const formattedDate = adj.adjustment_date ? adj.adjustment_date.split('-').reverse().join('/') : '';
                const createdTime = adj.created_at ? new Date(adj.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '14:20';
                const cleanDesc = (adj.description || '').replace('[CAIXA_DIRETO]', '').replace('[GLOBAL]', '').trim();

                return (
                  <div
                    key={adj.id}
                    style={{
                      borderRadius: '12px',
                      backgroundColor: '#11161f',
                      border: isPositive ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      onClick={() => setExpandedDirectAdjustId(isExpanded ? null : adj.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: isPositive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isPositive ? <ArrowUpCircle size={18} color="#22c55e" /> : <ArrowDownCircle size={18} color="#ef4444" />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isPositive ? '#4ade80' : '#f87171' }}>
                            {isPositive ? 'Entrada extra no caixa' : 'Saída do caixa'}
                          </span>
                          <span style={{ display: 'none' }}>Ajuste de caixa</span>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {formattedDate} • {createdTime} | por: {adj.created_by_name || 'Administrador'}
                          </span>
                          <span style={{ fontSize: '0.70rem', color: '#64748b' }}>{cleanDesc}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.90rem', fontWeight: 800, color: isPositive ? '#22c55e' : '#f43f5e' }}>
                          {isPositive ? '+' : '−'} R$ {Number(adj.amount).toFixed(2).replace('.', ',')}
                        </span>
                        <ChevronRight size={15} color="#94a3b8" />
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#0d1219', fontSize: '0.75rem', color: '#cbd5e1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>Saldo anterior do caixa:</span>
                          <strong style={{ color: '#fff' }}>R$ {Number(adj.previous_balance || 0).toFixed(2).replace('.', ',')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>Valor movimentado:</span>
                          <strong style={{ color: isPositive ? '#22c55e' : '#f43f5e' }}>{isPositive ? '+' : '−'} R$ {Number(adj.amount).toFixed(2).replace('.', ',')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>Saldo após a operação:</span>
                          <strong style={{ color: '#22c55e' }}>R$ {Number(adj.new_balance || 0).toFixed(2).replace('.', ',')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <span>Operador:</span>
                          <span style={{ color: '#38bdf8' }}>{adj.created_by_name || 'Administrador'}</span>
                        </div>
                        {canAdjustBalance && (
                          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                setEstornoAdjustmentTarget(adj);
                                setEstornoReason('');
                                setEstornoConfirmed(false);
                              }}
                              style={{ background: 'none', border: '1px solid #fbbf24', borderRadius: '6px', padding: '4px 8px', color: '#fbbf24', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <RotateCcw size={12} /> Estornar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* SCREEN C: MODAL ADICIONAR GASTO                                      */}
      {/* ==================================================================== */}
      {showExpenseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#11161d', width: '92%', maxWidth: '390px', borderRadius: '18px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1.5px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7)' }}>
            
            {/* CABEÇALHO DO MODAL */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={20} color="#ef4444" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>Adicionar Gasto</h3>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Registro de despesa no mês selecionado.</span>
                  <span style={{ display: 'none' }}>Nova Despesa</span>
                </div>
              </div>
              <button onClick={() => setShowExpenseModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: '2px' }}>✕</button>
            </div>

            {/* LINHA 1: MÊS E VALOR */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700 }}>Mês da despesa</label>
                <div style={{ height: '38px', borderRadius: '8px', backgroundColor: '#090d14', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '0.8rem', color: '#94a3b8', gap: '6px' }}>
                  <CalendarDays size={14} color="#38bdf8" />
                  <span>{MONTHS_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700 }}>Valor da despesa (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                  style={{ height: '38px', borderRadius: '8px', backgroundColor: '#090d14', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem', padding: '0 10px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            </div>

            {/* LINHA 2: DATA E CATEGORIA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700 }}>Data da despesa *</label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                  style={{ height: '38px', borderRadius: '8px', backgroundColor: '#090d14', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.82rem', padding: '0 8px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700 }}>Categoria *</label>
                <select
                  value={newExpense.category}
                  onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                  style={{ height: '38px', borderRadius: '8px', backgroundColor: '#090d14', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.82rem', padding: '0 8px', boxSizing: 'border-box', outline: 'none' }}
                >
                  <option value="Campo">Campo</option>
                  <option value="Churrasco">Churrasco</option>
                  <option value="Árbitro">Árbitro</option>
                  <option value="Goleiro">Goleiro</option>
                  <option value="Bola">Bola</option>
                  <option value="Colete">Colete</option>
                  <option value="Material">Material</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>

            {/* LINHA 3: DESCRIÇÃO / MOTIVO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700 }}>Descrição / Motivo *</label>
              <input
                type="text"
                required
                placeholder="Informe o motivo ou detalhe do gasto"
                value={newExpense.description}
                onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                style={{ height: '38px', borderRadius: '8px', backgroundColor: '#090d14', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem', padding: '0 10px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            {/* RESUMO FINANCEIRO DINÂMICO EM TEMPO REAL (SCREEN C) */}
            {(() => {
              const inputVal = Number(newExpense.amount || 0);
              const saldoAntes = valorLiquidoMes;
              const saldoApos = Number((saldoAntes - inputVal).toFixed(2));
              return (
                <div style={{ borderRadius: '12px', border: '1.5px solid rgba(34, 197, 94, 0.4)', backgroundColor: 'rgba(34, 197, 94, 0.05)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DollarSign size={20} color="#22c55e" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#cbd5e1' }}>Saldo antes:</span>
                      <strong style={{ color: '#ffffff' }}>R$ {saldoAntes.toFixed(2).replace('.', ',')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#cbd5e1' }}>Nova despesa:</span>
                      <strong style={{ color: '#ff2533' }}>- R$ {inputVal.toFixed(2).replace('.', ',')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ color: '#cbd5e1', fontWeight: 700 }}>Saldo após:</span>
                      <strong style={{ color: saldoApos >= 0 ? '#22c55e' : '#f43f5e', fontSize: '0.9rem' }}>
                        R$ {saldoApos.toFixed(2).replace('.', ',')}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* BOTÕES DE AÇÃO */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                style={{ flex: 1, height: '42px', borderRadius: '10px', backgroundColor: '#27272a', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const numAmount = Number(newExpense.amount);
                  if (!newExpense.amount || isNaN(numAmount) || numAmount <= 0) {
                    alert('Por favor, informe um valor válido para a despesa.');
                    return;
                  }
                  const trimmedDesc = newExpense.description.trim();
                  if (!trimmedDesc) {
                    alert('Por favor, informe a descrição da despesa.');
                    return;
                  }
                  try {
                    const { currentUserId, currentUserName } = await getAuthenticatedOperatorInfo();

                    const expensePayload: any = {
                      category: newExpense.category,
                      amount: numAmount,
                      description: trimmedDesc,
                      expense_date: newExpense.date,
                      created_by: currentUserId,
                      created_by_name: currentUserName
                    };

                    let insertedRow: any = null;
                    try {
                      const { data, error: expErr } = await supabase.from('expenses').insert([expensePayload]).select();
                      if (expErr) throw expErr;
                      insertedRow = data && data[0] ? data[0] : null;
                    } catch (_insErr: any) {
                      // Fallback sem created_by caso novas colunas ainda não tenham sido migradas no banco
                      const cleanPayload = {
                        category: newExpense.category,
                        amount: numAmount,
                        description: trimmedDesc,
                        expense_date: newExpense.date
                      };
                      const { data: fbData, error: fbErr } = await supabase.from('expenses').insert([cleanPayload]).select();
                      if (fbErr) throw fbErr;
                      insertedRow = fbData && fbData[0] ? { ...fbData[0], created_by: currentUserId, created_by_name: currentUserName } : null;
                    }

                    invalidateCache('expenses');

                    const newRow = insertedRow || {
                      id: crypto.randomUUID(),
                      ...expensePayload,
                      created_at: new Date().toISOString()
                    };

                    if (newExpense.date.startsWith(currentMonthStr)) {
                      setExpenses(prev => [newRow, ...prev].sort((a,b) => b.expense_date.localeCompare(a.expense_date)));
                    }
                    setAllExpenses(prev => [newRow, ...prev]);

                    setFeedback({ type: 'success', message: 'Despesa registrada com sucesso!' });
                    setShowExpenseModal(false);
                    setNewExpense({ category: 'Campo', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
                  } catch (err: any) {
                    alert(`Erro ao salvar despesa: ${err.message || 'Falha inesperada.'}`);
                  }
                }}
                aria-label="Salvar Adicionar Gasto"
                style={{ flex: 1.2, height: '42px', borderRadius: '10px', backgroundColor: '#dc2626', border: 'none', color: '#fff', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Wallet size={16} />
                <span>Adicionar Gasto</span>
                <span style={{ display: 'none' }}>Salvar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SCREEN D & E: MODAL DE AJUSTE FINANCEIRO (MÊS OU CAIXA TOTAL)        */}
      {/* ==================================================================== */}
      {showAdjustModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#11161d', width: '92%', maxWidth: '420px', borderRadius: '18px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1.5px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7)' }}>
            
            {/* SELETOR DE ABA: AJUSTE DO MÊS (SCREEN D) OU AJUSTE DIRETO NO CAIXA (SCREEN E) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', backgroundColor: '#090d14', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                type="button"
                onClick={() => setAdjustModalTab('monthly')}
                style={{
                  padding: '8px 6px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  backgroundColor: adjustModalTab === 'monthly' ? '#0084ff' : 'transparent',
                  color: adjustModalTab === 'monthly' ? '#ffffff' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <CalendarDays size={14} /> Ajuste do Mês
              </button>

              <button
                type="button"
                onClick={() => setAdjustModalTab('direct_cash')}
                style={{
                  padding: '8px 6px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  backgroundColor: adjustModalTab === 'direct_cash' ? '#00bd68' : 'transparent',
                  color: adjustModalTab === 'direct_cash' ? '#ffffff' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Coins size={14} /> Caixa Total (Direto)
              </button>
            </div>

            {/* CABEÇALHO DO MODAL */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: adjustModalTab === 'monthly' ? 'rgba(0, 132, 255, 0.15)' : 'rgba(0, 189, 104, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {adjustModalTab === 'monthly' ? <BarChart2 size={20} color="#0084ff" /> : <Coins size={20} color="#00bd68" />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                    {adjustModalTab === 'monthly' ? 'Ajuste Financeiro' : 'Ajuste direto no caixa'}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {adjustModalTab === 'monthly' ? 'Adicionar ou subtrair valores do mês selecionado.' : 'Adicionar ou subtrair valores do caixa total.'}
                  </span>
                  <span style={{ display: 'none' }}>Ajustar Saldo Acumulado</span>
                </div>
              </div>
              <button onClick={() => setShowAdjustModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: '2px' }}>✕</button>
            </div>

            {/* SE FOR AJUSTE DO MÊS: MÊS DO AJUSTE */}
            {adjustModalTab === 'monthly' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700 }}>Mês do ajuste</label>
                <div style={{ height: '38px', borderRadius: '8px', backgroundColor: '#090d14', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '0.85rem', color: '#fff', gap: '6px' }}>
                  <CalendarDays size={15} color="#38bdf8" />
                  <span>{MONTHS_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                </div>
              </div>
            )}

            {/* OPERAÇÃO: DUAS OPÇÕES VISÍVEIS (SOMAR VALORES / DIMINUIR VALORES) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700 }}>Operação</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {/* SOMAR */}
                <button
                  type="button"
                  onClick={() => setAdjustOpType('add')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    backgroundColor: adjustOpType === 'add' ? 'rgba(34, 197, 94, 0.16)' : '#090d14',
                    border: adjustOpType === 'add' ? '1.5px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: adjustOpType === 'add' ? '#22c55e' : '#94a3b8'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <PlusCircle size={15} />
                    <span>Somar valores</span>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 500, opacity: 0.85 }}>
                    {adjustModalTab === 'monthly' ? 'Entrada extra no mês' : 'Entrada extra no caixa'}
                  </span>
                  <span style={{ display: 'none' }}>Adicionar valor</span>
                </button>

                {/* DIMINUIR */}
                <button
                  type="button"
                  onClick={() => setAdjustOpType('subtract')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    backgroundColor: adjustOpType === 'subtract' ? 'rgba(239, 68, 68, 0.16)' : '#090d14',
                    border: adjustOpType === 'subtract' ? '1.5px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: adjustOpType === 'subtract' ? '#ef4444' : '#94a3b8'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MinusCircle size={15} />
                    <span>Diminuir valores</span>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 500, opacity: 0.85 }}>
                    {adjustModalTab === 'monthly' ? 'Saída do mês' : 'Saída do caixa'}
                  </span>
                </button>
              </div>
            </div>

            {/* VALOR E DATA */}
            <div style={{ display: 'grid', gridTemplateColumns: adjustModalTab === 'direct_cash' ? '1fr 1fr' : '1fr', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700 }}>
                  {adjustOpType === 'add' ? 'Valor a adicionar (R$)' : 'Valor a subtrair (R$)'} *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 50,00"
                  value={adjustAmountInput}
                  onChange={e => setAdjustAmountInput(e.target.value)}
                  style={{ height: '38px', borderRadius: '8px', backgroundColor: '#090d14', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem', padding: '0 10px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              {adjustModalTab === 'direct_cash' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700 }}>Data do ajuste *</label>
                  <input
                    type="date"
                    value={adjustDate}
                    onChange={e => setAdjustDate(e.target.value)}
                    style={{ height: '38px', borderRadius: '8px', backgroundColor: '#090d14', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.82rem', padding: '0 8px', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              )}
            </div>

            {/* JUSTIFICATIVA / MOTIVO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700 }}>Justificativa / Motivo *</label>
              <input
                type="text"
                placeholder={
                  adjustOpType === 'subtract'
                    ? 'Ex: Ajuste de conferência / Saída do caixa'
                    : 'Ex: Aporte para despesas / Dinheiro extra recebido'
                }
                value={adjustDescription}
                onChange={e => setAdjustDescription(e.target.value)}
                style={{ height: '38px', borderRadius: '8px', backgroundColor: '#090d14', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem', padding: '0 10px', boxSizing: 'border-box', outline: 'none' }}
              />
              <span style={{ display: 'none' }}>Ex: Ajuste de conferência</span>
            </div>

            {/* BANNER INFORMATIVO (BLUE ALERT) */}
            <div style={{ borderRadius: '10px', backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '10px 12px', fontSize: '0.75rem', color: '#bae6fd', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ fontSize: '14px', lineHeight: 1 }}>ℹ️</span>
              <span>
                {adjustModalTab === 'monthly'
                  ? `O valor será atribuído ao mês de ${MONTHS_NAMES[currentDate.getMonth()]}/${currentDate.getFullYear()}, aumentando o saldo do mês e o saldo total do caixa.`
                  : 'Este valor será adicionado ao CAIXA TOTAL e não será atribuído ao mês selecionado.'}
              </span>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                style={{ flex: 1, height: '42px', borderRadius: '10px', backgroundColor: '#27272a', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submittingAdjust}
                onClick={handleConfirmAdjust}
                style={{
                  flex: 1.2,
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: adjustModalTab === 'monthly' ? '#0084ff' : '#00bd68',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: submittingAdjust ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Check size={16} /> Confirmar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: SELETOR DE MÊS/ANO                                            */}
      {/* ==================================================================== */}
      {showDateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowDateModal(false)}>
          <div style={{ backgroundColor: '#171717', width: '90%', maxWidth: '340px', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>Selecionar Período</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={currentDate.getMonth()}
                onChange={(e) => setCurrentDate(new Date(currentDate.getFullYear(), Number(e.target.value), 1))}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
              >
                {MONTHS_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select
                value={currentDate.getFullYear()}
                onChange={(e) => setCurrentDate(new Date(Number(e.target.value), currentDate.getMonth(), 1))}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
              >
                {YEARS_LIST.map((y, i) => <option key={i} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={() => setShowDateModal(false)} style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0084ff', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>Confirmar</button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: RESUMO ANUAL CONSOLIDADO                                      */}
      {/* ==================================================================== */}
      {showAnnualModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowAnnualModal(false)}>
          <div style={{ backgroundColor: '#121212', width: '92%', maxWidth: '380px', borderRadius: '18px', padding: '20px', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', gap: '14px', color: '#fff' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Resumo Anual ({currentYearStr})</h3>
              <button onClick={() => setShowAnnualModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ backgroundColor: '#0c4226', padding: '10px', borderRadius: '12px', border: '1.5px solid #ffffff', textAlign: 'center' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#dcfce7' }}>MENSALISTAS (ANO)</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#fff', marginTop: '2px' }}>R$ {valorTotalMensalistas.toFixed(2).replace('.', ',')}</div>
              </div>
              <div style={{ backgroundColor: '#5c4308', padding: '10px', borderRadius: '12px', border: '1.5px solid #ffffff', textAlign: 'center' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#fef08a' }}>DIARISTAS (ANO)</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#fff', marginTop: '2px' }}>R$ {totalDiaristasConsolidado.toFixed(2).replace('.', ',')}</div>
              </div>
              <div style={{ backgroundColor: '#5e16ea', padding: '10px', borderRadius: '12px', border: '1.5px solid #ffffff', textAlign: 'center' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#ede9fe' }}>SOMA TOTAL ANUAL</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#fff', marginTop: '2px' }}>R$ {somaTotalAnual.toFixed(2).replace('.', ',')}</div>
              </div>
              <div style={{ backgroundColor: '#ff2533', padding: '10px', borderRadius: '12px', border: '1.5px solid #ffffff', textAlign: 'center' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#fee2e2' }}>DESPESAS (ANO)</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#fff', marginTop: '2px' }}>R$ {despesasTotalAnual.toFixed(2).replace('.', ',')}</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#00bd68', padding: '12px', borderRadius: '14px', border: '1.5px solid #ffffff', textAlign: 'center' }}>
              <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#f0fdf4' }}>SALDO LÍQUIDO EM CAIXA</div>
              <div style={{ fontSize: '19px', fontWeight: 900, color: '#fff', marginTop: '2px' }}>R$ {valorLiquidoCaixa.toFixed(2).replace('.', ',')}</div>
            </div>

            <button onClick={() => setShowAnnualModal(false)} style={{ width: '100%', padding: '10px', borderRadius: '12px', backgroundColor: '#27272a', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Fechar</button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: EXCLUSÃO SEGURA DE DESPESA                                    */}
      {/* ==================================================================== */}
      {deleteExpenseTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#18181b', width: '92%', maxWidth: '420px', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>Exclusão Segura de Despesa</h3>
            
            <div style={{ fontSize: '0.78rem', color: '#a1a1aa' }}>
              <div>ID: <span style={{ fontFamily: 'monospace', color: '#fff' }}>{deleteExpenseTarget.id}</span></div>
              <div>Valor: <strong style={{ color: '#fff' }}>R$ {Number(deleteExpenseTarget.amount).toFixed(2).replace('.', ',')}</strong> ({deleteExpenseTarget.category})</div>
              <div>Data: {deleteExpenseTarget.expense_date}</div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#e4e4e7', cursor: 'pointer' }}>
              <input type="checkbox" checked={deleteExpenseIsTest} onChange={e => setDeleteExpenseIsTest(e.target.checked)} />
              <span>Este lançamento foi realizado durante testes do sistema</span>
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.76rem', color: '#a1a1aa' }}>Justificativa obrigatória da exclusão *</label>
              <textarea
                rows={2}
                placeholder="Ex: Registro inserido incorretamente nos testes"
                value={deleteExpenseReason}
                onChange={e => setDeleteExpenseReason(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: '#090d14', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#f87171', cursor: 'pointer' }}>
              <input type="checkbox" checked={deleteExpenseConfirmed} onChange={e => setDeleteExpenseConfirmed(e.target.checked)} />
              <span>Confirmo a exclusão definitiva e o recálculo dos saldos</span>
            </label>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setDeleteExpenseTarget(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#27272a', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button
                disabled={deletingExpense}
                onClick={handleConfirmDeleteExpense}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#ef4444', border: 'none', color: '#fff', fontWeight: 800, cursor: deletingExpense ? 'not-allowed' : 'pointer' }}
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ESTORNO AUDITÁVEL DE AJUSTE                                   */}
      {/* ==================================================================== */}
      {estornoAdjustmentTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#18181b', width: '92%', maxWidth: '420px', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid rgba(251, 191, 36, 0.4)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24' }}>Estorno Auditável de Ajuste</h3>
            
            <div style={{ fontSize: '0.78rem', color: '#a1a1aa' }}>
              <div>Lançamento original: <strong style={{ color: '#fff' }}>{estornoAdjustmentTarget.type === 'entry' ? 'Entrada' : 'Saída'} de R$ {Number(estornoAdjustmentTarget.amount).toFixed(2).replace('.', ',')}</strong></div>
              <div>Descrição original: "{estornoAdjustmentTarget.description}"</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.76rem', color: '#a1a1aa' }}>Motivo do estorno *</label>
              <textarea
                rows={2}
                placeholder="Ex: Anulação de lançamento incorreto de homologação"
                value={estornoReason}
                onChange={e => setEstornoReason(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: '#090d14', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#fbbf24', cursor: 'pointer' }}>
              <input type="checkbox" checked={estornoConfirmed} onChange={e => setEstornoConfirmed(e.target.checked)} />
              <span>Confirmo a criação de lançamento compensatório inverso</span>
            </label>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setEstornoAdjustmentTarget(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#27272a', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button
                disabled={submittingEstorno}
                onClick={handleConfirmEstornoAdjustment}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#fbbf24', border: 'none', color: '#000', fontWeight: 800, cursor: submittingEstorno ? 'not-allowed' : 'pointer' }}
              >
                Confirmar Estorno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
