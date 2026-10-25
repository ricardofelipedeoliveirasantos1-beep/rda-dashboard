import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getCachedData, invalidateCache, CACHE_TTL } from '../services/dataCache';
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  UsersRound, UserRound, CircleArrowDown, CircleArrowUp, WalletCards, Plus, UserRoundCheck, UserRoundX, ChartNoAxesColumnIncreasing
} from 'lucide-react';

import FinanceiroVisitante from './FinanceiroVisitante';

interface MonthlyPayment {
  id?: string;
  player_id?: string;
  payment_month: string;
  amount: number;
  status: 'paid' | 'pending';
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
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

  const canManageFinance = _userRole === 'admin' ||
    (_userRole === 'assistant' && _can('manage_finance')) ||
    (_userRole === 'treasurer' && _can('manage_finance'));

  const canAdjustBalance = _userRole === 'admin' ||
    (_userRole === 'assistant' && _can('adjust_balance')) ||
    (_userRole === 'treasurer' && _can('adjust_balance'));

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const YEARS_LIST = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  const [payments, setPayments] = useState<MonthlyPayment[]>([]);
  const [, setMatches] = useState<Match[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [mensalistasAtivosCount, setMensalistasAtivosCount] = useState<number>(0);
  const [diaristasPagosCount, setDiaristasPagosCount] = useState<number>(0);
  const [diaristasPagosIds, setDiaristasPagosIds] = useState<string[]>([]);
  const [, setLastMatchDate] = useState<string | null>(null);
  const [diaristasTotalVal, setDiaristasTotalVal] = useState(0);
  const [, setUnknownDiariasCount] = useState(0);
  const [lastMatchDiaristasCount, setLastMatchDiaristasCount] = useState(0);
  const [lastMatchDiaristasSum, setLastMatchDiaristasSum] = useState(0);

  const [accumulatedBalance, setAccumulatedBalance] = useState(296.00);
  const [totalRevenue, setTotalRevenue] = useState(3079.94);
  const [totalExpenses, setTotalExpenses] = useState(2870.00);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseData, setEditExpenseData] = useState<{ category: string; amount: string; description: string; date: string }>({ category: 'Campo', amount: '', description: '', date: '' });
  const [newExpense, setNewExpense] = useState<{ category: string; amount: string; description: string; date: string }>({
    category: 'Campo',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [adjustments, setAdjustments] = useState<BalanceAdjustment[]>([]);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustOpType, setAdjustOpType] = useState<'add' | 'reconcile'>('add');
  const [adjustAmountInput, setAdjustAmountInput] = useState('');
  const [adjustDescription, setAdjustDescription] = useState('');
  const [adjustDate, setAdjustDate] = useState(new Date().toISOString().split('T')[0]);
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 2000);
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

  const loadMonthData = async (monthStr: string, dateObj: Date) => {
    if (financeCache.current[monthStr]) {
      setPayments(financeCache.current[monthStr].payments);
      setMatches(financeCache.current[monthStr].matches);
      setExpenses(financeCache.current[monthStr].expenses);
      setAdjustments(financeCache.current[monthStr].adjustments || []);
      setMensalistasAtivosCount(financeCache.current[monthStr].mensalistasAtivosCount);
      setDiaristasPagosCount(financeCache.current[monthStr].diaristasPagosCount);
      setDiaristasPagosIds(financeCache.current[monthStr].diaristasPagosIds);
      setLastMatchDate(financeCache.current[monthStr].lastMatchDate);
      setDiaristasTotalVal(financeCache.current[monthStr].diaristasTotalVal);
      setUnknownDiariasCount(financeCache.current[monthStr].unknownDiariasCount);
      setLastMatchDiaristasCount(financeCache.current[monthStr].lastMatchDiaristasCount);
      setLastMatchDiaristasSum(financeCache.current[monthStr].lastMatchDiaristasSum);
      setLoading(false);
      return;
    }

    try {
      const startOfMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-01`;
      const nextMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 1);
      const endOfMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

      const allMatches = await getCachedData('matches', async () => {
        const { data } = await supabase.from('matches').select(`id, match_date, status, daily_total`);
        return data || [];
      }, CACHE_TTL.matches);

      const matchesRes = allMatches.filter((m: any) => m.status === 'finished' && m.match_date >= startOfMonth && m.match_date < endOfMonth);

      const allPayments = await getCachedData('monthly_payments', async () => {
        const { data } = await supabase.from('monthly_payments').select('id, player_id, payment_month, amount, status');
        return data || [];
      }, CACHE_TTL.monthly_payments);

      const paymentsRes = allPayments.filter((p: any) => p.payment_month === monthStr);

      const allExpenses = await getCachedData('expenses', async () => {
        const { data } = await supabase.from('expenses').select('*');
        return data || [];
      }, CACHE_TTL.expenses);

      const expensesRes = allExpenses.filter((e: any) => e.expense_date >= startOfMonth && e.expense_date < endOfMonth).sort((a: any, b: any) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());

      const allPlayers = await getCachedData('players', async () => {
        const { data } = await supabase.from('players').select('id, is_active, category');
        return data || [];
      }, CACHE_TTL.players);
      const activeMensalistas = allPlayers.filter((p: any) => p.is_active && (p.category === 'Mensalista' || p.category === 'mensalista'));
      const activeMensalistasCount = activeMensalistas.length;

      let uniqueDiaristasCount = 0;
      let diaristasIdsArray: string[] = [];
      let lastMatchDateStr = null;
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
          diaristasArrecadadosSum = paidDiaristas.reduce((sum, mp) => sum + Number(mp.daily_fee_at_match || 0), 0);

          const lastMatchDiaristas = paidDiaristas.filter((mp: any) => mp.match_id === lastMatchId);
          lastMatchDCount = lastMatchDiaristas.length;
          lastMatchDSum = lastMatchDiaristas.reduce((sum, mp) => sum + Number(mp.daily_fee_at_match || 0), 0);

          const uniqueIds = new Set<string>(paidDiaristas.map((mp: any) => mp.player_id));
          uniqueDiaristasCount = uniqueIds.size;
          diaristasIdsArray = Array.from(uniqueIds);

          unknownCount = diaristas.filter((mp: any) => !mp.payment_status || mp.payment_status === 'unknown').length;
        }
      }

      const allAdjustments = await getCachedData('balance_adjustments', async () => {
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

      const adjustmentsList: BalanceAdjustment[] = allAdjustments || [];
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
      setDiaristasPagosCount(uniqueDiaristasCount);
      setDiaristasPagosIds(diaristasIdsArray);
      setLastMatchDate(lastMatchDateStr);
      setDiaristasTotalVal(diaristasArrecadadosSum);
      setUnknownDiariasCount(unknownCount);
      setLastMatchDiaristasCount(lastMatchDCount);
      setLastMatchDiaristasSum(lastMatchDSum);

      const settingsData = await getCachedData('settings', async () => {
        const { data } = await supabase.from('settings').select('*').eq('id', 'default').single();
        return data || {};
      }, CACHE_TTL.settings);

      const initialBalance = Number(settingsData?.initial_accumulated_balance ?? 236.00);
      const initialDate = String(settingsData?.initial_balance_date ?? '2026-10-23');
      const initialRevenue = Number(settingsData?.initial_accumulated_revenue ?? 2839.94);
      const initialExpenses = Number(settingsData?.initial_accumulated_expenses ?? 2690.00);

      const finishedMatchesSinceCutoff = (allMatches || []).filter((m: any) => m.status === 'finished' && m.match_date >= initialDate);
      const dailyFeesSinceCutoff = finishedMatchesSinceCutoff.reduce((acc: number, m: any) => acc + Number(m.daily_total || 0), 0);
      const expensesSinceCutoff = (allExpenses || [])
        .filter((e: any) => e.expense_date && e.expense_date >= initialDate)
        .reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);

      const adjustmentsSinceCutoff = adjustmentsList.filter((a: any) => a.adjustment_date && a.adjustment_date >= initialDate);
      const adjustmentEntriesSinceCutoff = adjustmentsSinceCutoff
        .filter((a: any) => a.type === 'entry')
        .reduce((acc: number, a: any) => acc + Number(a.amount || 0), 0);
      const adjustmentExitsSinceCutoff = adjustmentsSinceCutoff
        .filter((a: any) => a.type === 'exit')
        .reduce((acc: number, a: any) => acc + Number(a.amount || 0), 0);

      const dynamicSaldoAcumulado = initialBalance + dailyFeesSinceCutoff - expensesSinceCutoff + adjustmentEntriesSinceCutoff - adjustmentExitsSinceCutoff;
      const dynamicTotalRev = initialRevenue + dailyFeesSinceCutoff + adjustmentEntriesSinceCutoff;
      const dynamicTotalExp = initialExpenses + expensesSinceCutoff + adjustmentExitsSinceCutoff;

      setAccumulatedBalance(dynamicSaldoAcumulado);
      setTotalRevenue(dynamicTotalRev);
      setTotalExpenses(dynamicTotalExp);

      setLoading(false);
    } catch (err) {
      console.error(`Erro ao carregar dados do mês ${monthStr}:`, err);
      setError('Erro ao carregar dados financeiros.');
    }
  };

  useEffect(() => {
    loadMonthData(currentMonthStr, currentDate);
  }, [currentMonthStr]);

  // Cálculos Financeiros
  const monthAdjustmentEntries = adjustments
    .filter(a => a.type === 'entry')
    .reduce((sum, a) => sum + Number(a.amount || 0), 0);
  const monthAdjustmentExits = adjustments
    .filter(a => a.type === 'exit')
    .reduce((sum, a) => sum + Number(a.amount || 0), 0);

  const totalDespesasVal = expenses.reduce((sum, e) => sum + e.amount, 0) + monthAdjustmentExits;
  const recebidosVal = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalEntradasVal = recebidosVal + diaristasTotalVal + monthAdjustmentEntries;
  const saldoFinalVal = totalEntradasVal - totalDespesasVal;

  const paidMensalistasIds = payments.filter(p => p.status === 'paid' && p.player_id).map((p: any) => p.player_id);
  const uniquePessoasPagaramIds = new Set([...diaristasPagosIds, ...paidMensalistasIds]);
  const pessoasPagaramCount = uniquePessoasPagaramIds.size;
  
  // For the admin page we still want just the mensalistas únicos to compute pendentes
  const uniqueMensalistasPagosIds = new Set(paidMensalistasIds);
  const mensalistasPagosUnicos = uniqueMensalistasPagosIds.size;
  const mensalistasPendentes = Math.max(0, mensalistasAtivosCount - mensalistasPagosUnicos);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: 'var(--text-secondary)' }}>
        Carregando financeiro...
      </div>
    );
  }

  if (_userRole === 'visitor') {
    return (
      <FinanceiroVisitante
        mensalistasValor={recebidosVal}
        diaristasValor={diaristasTotalVal}
        pessoasPagaramCount={pessoasPagaramCount}
        mensalistasPendentesCount={mensalistasPendentes}
        diaristasUnicosCount={diaristasPagosCount}
        totalRevenue={totalRevenue}
        totalExpenses={totalExpenses}
        saldoAcumulado={accumulatedBalance}
        despesasMes={totalDespesasVal}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '0 10px', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #a3a3a3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Financeiro</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Balanço geral de arrecadação e gastos.</p>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* SELETORES DE MÊS E ANO UNIFICADO */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <button
          onClick={() => setShowDateModal(true)}
          style={{
            width: 'min(82%, 320px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 255, 255, 0.045)', padding: '0 16px', borderRadius: '15px',
            border: '1px solid rgba(255, 255, 255, 0.16)', color: '#F8FAFC', fontWeight: 700, cursor: 'pointer',
            height: '52px', fontSize: '15px'
          }}
        >
          <CalendarDays size={19} color="#F5F5F5" />
          <span>{MONTHS_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
          <ChevronDown size={18} color="#E5E7EB" style={{ transform: showDateModal ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        </button>
      </div>

      {showDateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowDateModal(false)}>
          <div style={{ backgroundColor: '#171717', width: '90%', maxWidth: '340px', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>Selecionar Período</h3>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <select
                    value={currentDate.getMonth()}
                    onChange={(e) => setCurrentDate(new Date(currentDate.getFullYear(), Number(e.target.value), 1))}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '1rem', outline: 'none' }}
                >
                    {MONTHS_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select
                    value={currentDate.getFullYear()}
                    onChange={(e) => setCurrentDate(new Date(Number(e.target.value), currentDate.getMonth(), 1))}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '1rem', outline: 'none' }}
                >
                    {YEARS_LIST.map((y, i) => <option key={i} value={y}>{y}</option>)}
                </select>
            </div>

            <button onClick={() => setShowDateModal(false)} style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#f43f5e', border: 'none', color: '#fff', fontWeight: 700, marginTop: '8px', fontSize: '1rem', cursor: 'pointer' }}>OK</button>
          </div>
        </div>
      )}

      {/* CARDS DO FINANCEIRO */}
      <style>
        {`
          .fin-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 14px;
          }
          .fin-card {
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 10px;
            border-radius: 14px;
            height: 82px;
            justify-content: center;
            overflow: hidden;
          }
          .fin-card-title {
            font-size: 9px;
            font-weight: 700;
            color: #A7A7B3;
            text-transform: uppercase;
            line-height: 1.25;
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
          }
          .fin-card-value {
            font-size: 19px;
            font-weight: 800;
            line-height: 1.1;
            white-space: nowrap;
          }

          .fin-stats-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 16px;
          }
          .fin-stat-card {
            display: flex;
            flex-direction: column;
            padding: 10px;
            border-radius: 14px;
            height: 98px;
            justify-content: center;
            overflow: hidden;
          }
          .fin-stat-icon-wrap {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 4px;
          }
          .fin-stat-title {
            font-size: 8.5px;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .fin-stat-value {
            font-size: 22px;
            font-weight: 800;
            line-height: 1;
          }
          .fin-stat-sub {
            font-size: 9px;
            color: #A7A7B3;
            margin-top: 2px;
          }
        `}
      </style>

      <div className="fin-grid">
        <div className="fin-card" style={{ backgroundColor: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
          <span className="fin-card-title"><UsersRound size={14} color="#22C55E" /> Mensalidades Recebidas</span>
          <span className="fin-card-value" style={{ color: '#22c55e' }}>R$ {recebidosVal.toFixed(2).replace('.', ',')}</span>
        </div>

        <div className="fin-card" style={{ backgroundColor: 'rgba(245, 164, 0, 0.06)', border: '1px solid rgba(245, 164, 0, 0.25)', gridRow: 'span 2', height: 'auto', gap: '10px', paddingBottom: '14px' }}>
          <span className="fin-card-title" style={{ fontSize: '10px', textTransform: 'uppercase' }}><UserRound size={14} color="#F5A400" /> Diaristas Arrecadados</span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
             <span style={{ fontSize: '10px', color: '#A7A7B3' }}>Último racha: {lastMatchDiaristasCount} diarista{lastMatchDiaristasCount !== 1 ? 's' : ''}</span>
             <span style={{ fontSize: '11px', color: '#F5A400', fontWeight: 600 }}>R$ {lastMatchDiaristasSum.toFixed(2).replace('.', ',')} no último racha</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: 'auto' }}>
             <span style={{ fontSize: '9px', color: '#A7A7B3', textTransform: 'uppercase', fontWeight: 700 }}>TOTAL NO MÊS</span>
             <span className="fin-card-value" style={{ color: '#F5A400', fontSize: '19px' }}>R$ {diaristasTotalVal.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <div className="fin-card" style={{ backgroundColor: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
          <span className="fin-card-title"><CircleArrowDown size={14} color="#A855F7" /> Total de Entradas</span>
          <span className="fin-card-value" style={{ color: '#a855f7' }}>R$ {totalEntradasVal.toFixed(2).replace('.', ',')}</span>
        </div>

        <div className="fin-card" style={{ backgroundColor: 'rgba(255, 69, 79, 0.06)', border: '1px solid rgba(255, 69, 79, 0.25)' }}>
          <span className="fin-card-title"><CircleArrowUp size={14} color="#FF454F" /> Despesas</span>
          <span className="fin-card-value" style={{ color: '#FF454F' }}>R$ {totalDespesasVal.toFixed(2).replace('.', ',')}</span>
        </div>

        <div className="fin-card" style={{ backgroundColor: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
          <span className="fin-card-title"><WalletCards size={14} color="#22C55E" /> Saldo Líquido</span>
          <span className="fin-card-value" style={{ color: saldoFinalVal >= 0 ? '#22c55e' : '#FF454F' }}>R$ {saldoFinalVal.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>

      {(canManageFinance || canAdjustBalance) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginTop: '14px', marginBottom: '16px' }}>
          {canManageFinance && (
            <button
              onClick={() => setShowExpenseModal(true)}
              style={{
                width: canAdjustBalance ? 'min(48%, 180px)' : 'min(82%, 310px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                background: 'linear-gradient(135deg, #F43F5E 0%, #FB4567 100%)', color: '#FFFFFF', border: 'none', borderRadius: '14px',
                fontSize: '13.5px', fontWeight: 700, cursor: 'pointer', height: '48px',
                boxShadow: '0 4px 12px rgba(244, 63, 94, 0.15)'
              }}
            >
              <Plus size={17} /> Adicionar gasto
            </button>
          )}

          {canAdjustBalance && (
            <button
              onClick={() => {
                setAdjustOpType('add');
                setAdjustAmountInput('');
                setAdjustDescription('');
                setAdjustDate(new Date().toISOString().split('T')[0]);
                setShowAdjustModal(true);
              }}
              style={{
                width: canManageFinance ? 'min(48%, 180px)' : 'min(82%, 310px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '14px',
                fontSize: '13.5px', fontWeight: 700, cursor: 'pointer', height: '48px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)', transition: 'all 0.2s'
              }}
            >
              <WalletCards size={17} color="#38bdf8" /> Ajustar Saldo Acumulado
            </button>
          )}
        </div>
      )}

      {/* CONTROLE DE PAGAMENTOS */}
      <div className="fin-stats-grid">
        <div className="fin-stat-card" style={{ backgroundColor: 'rgba(47, 140, 255, 0.07)', border: '1px solid rgba(47, 140, 255, 0.25)' }}>
          <div className="fin-stat-icon-wrap" style={{ backgroundColor: 'rgba(47, 140, 255, 0.15)' }}>
            <UserRoundCheck size={16} color="#2F8CFF" />
          </div>
          <span className="fin-stat-title" style={{ color: '#2F8CFF' }}>Mensalistas<br/>Pagos</span>
          <span className="fin-stat-value" style={{ color: '#2F8CFF' }}>{mensalistasPagosUnicos}</span>
          <span className="fin-stat-sub">de {mensalistasAtivosCount}</span>
        </div>

        <div className="fin-stat-card" style={{ backgroundColor: 'rgba(245, 158, 11, 0.07)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
          <div className="fin-stat-icon-wrap" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
            <UserRoundX size={16} color="#F59E0B" />
          </div>
          <span className="fin-stat-title" style={{ color: '#F59E0B' }}>Mensalistas<br/>Pendentes</span>
          <span className="fin-stat-value" style={{ color: '#F59E0B' }}>{mensalistasPendentes}</span>
          <span className="fin-stat-sub">de {mensalistasAtivosCount}</span>
        </div>
      </div>

      {/* RELATÓRIO DE GASTOS */}
      <section className="dashboard-card dashboard-card--neon" style={{ gap: '12px', marginTop: '16px', borderRadius: '16px', padding: '12px' }}>
        <div className="card-header" style={{ marginBottom: '2px' }}>
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, fontSize: '1.15rem', color: '#fff' }}>
            <ChartNoAxesColumnIncreasing size={18} color="#A3A3A3" /> RELATÓRIO DE GASTOS DO MÊS
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(expenses.length > 0 || adjustments.length > 0) ? (
            [
              ...expenses.map(e => ({ kind: 'expense' as const, date: e.expense_date, data: e })),
              ...adjustments.map(a => ({ kind: 'adjustment' as const, date: a.adjustment_date, data: a }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(item => {
              if (item.kind === 'adjustment') {
                const adj = item.data;
                const formattedDate = adj.adjustment_date.split('-').reverse().join('/');
                const isEntry = adj.type === 'entry';
                return (
                  <div key={adj.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>Ajuste de caixa</span>
                        <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: isEntry ? 'rgba(34,197,94,0.15)' : 'rgba(244,63,94,0.15)', color: isEntry ? '#22c55e' : '#f43f5e', fontWeight: 700 }}>
                          {adj.operation_type === 'add' ? 'Aporte' : 'Conciliação'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formattedDate} {adj.description ? `• ${adj.description}` : ''}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 900, color: isEntry ? '#22c55e' : '#f43f5e' }}>
                        {isEntry ? `+ R$ ${Number(adj.amount).toFixed(2).replace('.', ',')}` : `− R$ ${Number(adj.amount).toFixed(2).replace('.', ',')}`}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Saldo: R$ {Number(adj.new_balance).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                );
              }

              const expense = item.data;
              const formattedDate = expense.expense_date.split('-').reverse().join('/');
              const isEditing = editingExpenseId === expense.id;

              if (isEditing) {
                return (
                  <div key={expense.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <select value={editExpenseData.category} onChange={e => setEditExpenseData({...editExpenseData, category: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }}>
                        <option value="Campo">Campo</option>
                        <option value="Árbitro">Árbitro</option>
                        <option value="Goleiro">Goleiro</option>
                        <option value="Material">Material</option>
                        <option value="Outros">Outros</option>
                      </select>
                      <input type="number" step="0.01" placeholder="Valor" value={editExpenseData.amount} onChange={e => setEditExpenseData({...editExpenseData, amount: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
                      <input type="date" value={editExpenseData.date} onChange={e => setEditExpenseData({...editExpenseData, date: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
                      <input type="text" placeholder="Descrição" value={editExpenseData.description} onChange={e => setEditExpenseData({...editExpenseData, description: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button onClick={() => setEditingExpenseId(null)} style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#a3a3a3', fontSize: '0.75rem', cursor: 'pointer' }}>Cancelar</button>
                      <button onClick={async () => {
                          if (!editExpenseData.amount || isNaN(Number(editExpenseData.amount)) || Number(editExpenseData.amount) <= 0) {
                            alert('Digite um valor válido.');
                            return;
                          }
                          const trimmedDesc = editExpenseData.description?.trim();
                          if (!trimmedDesc) {
                            alert('Por favor, informe a descrição da despesa.');
                            return;
                          }
                          try {
                            const { error } = await supabase.from('expenses').update({
                              category: editExpenseData.category, amount: Number(editExpenseData.amount),
                              description: trimmedDesc, expense_date: editExpenseData.date
                            }).eq('id', expense.id);

                            if (error) throw error;
                            invalidateCache('expenses');

                            const updatedExpense = { ...expense, category: editExpenseData.category, amount: Number(editExpenseData.amount), description: trimmedDesc, expense_date: editExpenseData.date };

                            setExpenses(prev => prev.map(e => e.id === expense.id ? updatedExpense : e));
                            if (financeCache.current[currentMonthStr]) {
                              financeCache.current[currentMonthStr].expenses = financeCache.current[currentMonthStr].expenses.map(e => e.id === expense.id ? updatedExpense : e);
                            }
                            setFeedback({ type: 'success', message: 'Despesa atualizada!' });
                            setEditingExpenseId(null);
                          } catch (err) {
                            alert('Erro ao atualizar despesa.');
                          }
                        }} style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#f43f5e', border: 'none', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={expense.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>{expense.category}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formattedDate} {expense.description ? `• ${expense.description}` : ''}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f43f5e' }}>- R$ {Number(expense.amount).toFixed(2)}</span>
                    {canManageFinance && (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => {
                            setEditExpenseData({ category: expense.category, amount: String(expense.amount), description: expense.description || '', date: expense.expense_date });
                            setEditingExpenseId(expense.id);
                          }} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700, padding: '4px 8px', margin: '-4px -8px' }}>Editar</button>
                        <button onClick={async () => {
                            if (confirm('Tem certeza que deseja remover esta despesa?')) {
                              try {
                                const { error } = await supabase.from('expenses').delete().eq('id', expense.id);
                                if (error) throw error;
                                invalidateCache('expenses');
                                setExpenses(prev => prev.filter(e => e.id !== expense.id));
                                if (financeCache.current[currentMonthStr]) {
                                  financeCache.current[currentMonthStr].expenses = financeCache.current[currentMonthStr].expenses.filter(e => e.id !== expense.id);
                                }
                                setFeedback({ type: 'success', message: 'Despesa removida.' });
                              } catch (err) {
                                setFeedback({ type: 'error', message: 'Erro ao remover despesa.' });
                              }
                            }
                          }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700, padding: '4px 8px', margin: '-4px -8px' }}>Excluir</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Nenhuma despesa ou ajuste registrado no mês.
            </div>
          )}
        </div>

        {(expenses.length > 0 || adjustments.length > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px', marginTop: '8px' }}>
            {monthAdjustmentEntries > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>Aportes de ajuste no mês:</span>
                <strong style={{ color: '#22c55e', fontWeight: 800, fontSize: '1.1rem' }}>+ R$ {monthAdjustmentEntries.toFixed(2).replace('.', ',')}</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '1rem' }}>Total despesas/saídas no mês:</span>
              <strong style={{ color: '#f43f5e', fontWeight: 900, fontSize: '1.3rem' }}>R$ {totalDespesasVal.toFixed(2).replace('.', ',')}</strong>
            </div>
          </div>
        )}
      </section>

      {/* MODAL NOVA DESPESA */}
      {showExpenseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', width: '90%', maxWidth: '400px', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Nova Despesa</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Categoria</label>
              <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                <option value="Campo">Campo</option>
                <option value="Árbitro">Árbitro</option>
                <option value="Goleiro">Goleiro</option>
                <option value="Material">Material</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Valor (R$)</label>
              <input type="number" step="0.01" placeholder="0.00" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Data</label>
              <input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Descrição <span style={{ color: '#f43f5e' }}>*</span></label>
              <input type="text" required placeholder="Informe o motivo ou detalhe do gasto..." value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button onClick={() => setShowExpenseModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={async () => {
                  if (!newExpense.amount || isNaN(Number(newExpense.amount)) || Number(newExpense.amount) <= 0) {
                    alert('Digite um valor válido.');
                    return;
                  }
                  const trimmedDesc = newExpense.description?.trim();
                  if (!trimmedDesc) {
                    alert('Por favor, informe a descrição da despesa.');
                    return;
                  }
                  try {
                    const { data, error } = await supabase.from('expenses').insert([{ category: newExpense.category, amount: Number(newExpense.amount), description: trimmedDesc, expense_date: newExpense.date }]).select();
                    if (error) throw error;
                    invalidateCache('expenses');

                    if (newExpense.date.startsWith(currentMonthStr)) {
                      setExpenses(prev => [data[0], ...prev].sort((a,b) => b.expense_date.localeCompare(a.expense_date)));
                      if (financeCache.current[currentMonthStr]) {
                        financeCache.current[currentMonthStr].expenses = [data[0], ...financeCache.current[currentMonthStr].expenses].sort((a,b) => b.expense_date.localeCompare(a.expense_date));
                      }
                    }

                    if (newExpense.date >= '2026-10-23') {
                      setAccumulatedBalance(prev => prev - Number(newExpense.amount));
                      setTotalExpenses(prev => prev + Number(newExpense.amount));
                    }

                    setFeedback({ type: 'success', message: 'Despesa registrada!' });
                    setShowExpenseModal(false);
                    setNewExpense({ category: 'Campo', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
                  } catch (err) {
                    alert('Erro ao salvar despesa.');
                  }
                }} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#f43f5e', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJUSTAR SALDO ACUMULADO */}
      {showAdjustModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#171717', width: '92%', maxWidth: '420px', borderRadius: '16px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>Ajustar Saldo Acumulado</h3>
            </div>

            {/* Saldo Atual */}
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#a1a1aa', fontWeight: 600 }}>Saldo acumulado atual:</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: accumulatedBalance >= 0 ? '#22c55e' : '#f43f5e' }}>
                R$ {accumulatedBalance.toFixed(2).replace('.', ',')}
              </span>
            </div>

            {/* Tipo de Operação */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tipo de operação</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAdjustOpType('add')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    backgroundColor: adjustOpType === 'add' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: adjustOpType === 'add' ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: adjustOpType === 'add' ? '#22c55e' : '#a1a1aa'
                  }}
                >
                  <span>Adicionar valor</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.85 }}>+ Aporte ao caixa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustOpType('reconcile')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    backgroundColor: adjustOpType === 'reconcile' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: adjustOpType === 'reconcile' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: adjustOpType === 'reconcile' ? '#38bdf8' : '#a1a1aa'
                  }}
                >
                  <span>Corrigir saldo total</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.85 }}>Conferência real</span>
                </button>
              </div>
            </div>

            {/* Campo de Valor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {adjustOpType === 'add' ? 'Valor a adicionar (R$)' : 'Saldo real conferido (R$)'} <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder={adjustOpType === 'add' ? 'Ex: 50,00' : 'Ex: 310,00'}
                value={adjustAmountInput}
                onChange={e => setAdjustAmountInput(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem' }}
              />
            </div>

            {/* Prévia dinâmica do ajuste */}
            {(() => {
              const cleanStr = adjustAmountInput.trim().replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
              const numVal = Number(cleanStr);
              if (adjustAmountInput.trim() && !isNaN(numVal) && numVal >= 0) {
                if (adjustOpType === 'add') {
                  const newBal = accumulatedBalance + numVal;
                  return (
                    <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', fontSize: '0.78rem', color: '#22c55e', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Ajuste: + R$ {numVal.toFixed(2).replace('.', ',')}</span>
                      <span>Novo saldo: R$ {newBal.toFixed(2).replace('.', ',')}</span>
                    </div>
                  );
                } else {
                  const diff = numVal - accumulatedBalance;
                  const isDiffPositive = diff > 0;
                  const isZero = Math.abs(diff) < 0.01;
                  return (
                    <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: isZero ? 'rgba(255, 255, 255, 0.05)' : isDiffPositive ? 'rgba(34, 197, 94, 0.08)' : 'rgba(244, 63, 94, 0.08)', border: isZero ? '1px solid rgba(255, 255, 255, 0.1)' : isDiffPositive ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(244, 63, 94, 0.2)', fontSize: '0.78rem', color: isZero ? '#a1a1aa' : isDiffPositive ? '#22c55e' : '#f43f5e', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{isZero ? 'Sem diferença' : `Ajuste (${isDiffPositive ? 'Entrada' : 'Saída'}): ${isDiffPositive ? '+' : '−'} R$ ${Math.abs(diff).toFixed(2).replace('.', ',')}`}</span>
                      <span>Novo saldo: R$ {numVal.toFixed(2).replace('.', ',')}</span>
                    </div>
                  );
                }
              }
              return null;
            })()}

            {/* Data do Lançamento */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Data do lançamento</label>
              <input
                type="date"
                value={adjustDate}
                onChange={e => setAdjustDate(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem' }}
              />
            </div>

            {/* Descrição Obrigatória */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Descrição / Motivo <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder={adjustOpType === 'add' ? 'Ex: Aporte para despesas do racha' : 'Ex: Conciliação de caixa'}
                value={adjustDescription}
                onChange={e => setAdjustDescription(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem' }}
              />
            </div>

            {/* Botões */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                disabled={submittingAdjust}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submittingAdjust}
                onClick={async () => {
                  if (!canAdjustBalance) {
                    alert('Você não tem permissão para ajustar o saldo.');
                    return;
                  }

                  const cleanStr = adjustAmountInput.trim().replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
                  const parsedVal = Number(cleanStr);
                  if (!adjustAmountInput.trim() || isNaN(parsedVal) || parsedVal < 0) {
                    alert('Por favor, informe um valor monetário válido e positivo.');
                    return;
                  }

                  if (!adjustDate) {
                    alert('A data do lançamento é obrigatória.');
                    return;
                  }

                  const trimmedDesc = adjustDescription.trim();
                  if (!trimmedDesc) {
                    alert('A descrição/motivo do ajuste é obrigatória.');
                    return;
                  }

                  let effectiveAmount = 0;
                  let type: 'entry' | 'exit' = 'entry';
                  let newCalculatedBal = accumulatedBalance;

                  if (adjustOpType === 'add') {
                    if (parsedVal <= 0) {
                      alert('O valor a adicionar deve ser maior que zero.');
                      return;
                    }
                    effectiveAmount = parsedVal;
                    type = 'entry';
                    newCalculatedBal = Number((accumulatedBalance + effectiveAmount).toFixed(2));
                  } else {
                    const diff = Number((parsedVal - accumulatedBalance).toFixed(2));
                    if (Math.abs(diff) < 0.01) {
                      alert('O saldo real conferido é idêntico ao saldo atual. Nenhum ajuste necessário.');
                      return;
                    }
                    effectiveAmount = Math.abs(diff);
                    type = diff > 0 ? 'entry' : 'exit';
                    newCalculatedBal = parsedVal;
                  }

                  setSubmittingAdjust(true);
                  try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const currentUserId = sessionData?.session?.user?.id || null;
                    const currentUserName = sessionData?.session?.user?.user_metadata?.full_name || sessionData?.session?.user?.email || (_userRole === 'admin' ? 'Administrador' : _userRole === 'treasurer' ? 'Tesoureiro' : 'Assistente');

                    const adjustmentRecord: BalanceAdjustment = {
                      id: crypto.randomUUID(),
                      type,
                      operation_type: adjustOpType,
                      amount: Number(effectiveAmount.toFixed(2)),
                      description: trimmedDesc,
                      adjustment_date: adjustDate,
                      previous_balance: Number(accumulatedBalance.toFixed(2)),
                      new_balance: Number(newCalculatedBal.toFixed(2)),
                      target_balance: adjustOpType === 'reconcile' ? parsedVal : null,
                      created_by: currentUserId,
                      created_by_name: currentUserName,
                      created_at: new Date().toISOString()
                    };

                    // 1. Gravação no Supabase: se falhar, interrompe e não confirma o ajuste
                    const { error } = await supabase.from('balance_adjustments').insert([adjustmentRecord]);
                    if (error) {
                      throw new Error(`Falha no banco de dados: ${error.message}`);
                    }

                    // 2. Espelha no armazenamento local apenas em caso de sucesso da transação
                    try {
                      const local = typeof window !== 'undefined' ? localStorage.getItem('rda_local_adjustments') : null;
                      const list: BalanceAdjustment[] = local ? JSON.parse(local) : [];
                      const exists = list.some(item => item.id === adjustmentRecord.id);
                      if (!exists) {
                        list.unshift(adjustmentRecord);
                        localStorage.setItem('rda_local_adjustments', JSON.stringify(list));
                      }
                    } catch (localErr) {
                      console.error('Erro ao espelhar ajuste no cache local:', localErr);
                    }

                    invalidateCache('balance_adjustments');

                    if (adjustDate >= '2026-10-23') {
                      if (type === 'entry') {
                        setAccumulatedBalance(prev => Number((prev + effectiveAmount).toFixed(2)));
                        setTotalRevenue(prev => Number((prev + effectiveAmount).toFixed(2)));
                      } else {
                        setAccumulatedBalance(prev => Number((prev - effectiveAmount).toFixed(2)));
                        setTotalExpenses(prev => Number((prev + effectiveAmount).toFixed(2)));
                      }
                    }

                    if (adjustDate.startsWith(currentMonthStr)) {
                      setAdjustments(prev => [adjustmentRecord, ...prev]);
                      if (financeCache.current[currentMonthStr]) {
                        financeCache.current[currentMonthStr].adjustments = [
                          adjustmentRecord,
                          ...(financeCache.current[currentMonthStr].adjustments || [])
                        ];
                      }
                    }

                    setFeedback({ type: 'success', message: 'Ajuste de saldo registrado com sucesso!' });
                    setShowAdjustModal(false);
                    setAdjustAmountInput('');
                    setAdjustDescription('');
                  } catch (err: any) {
                    alert(`Erro ao salvar ajuste: ${err.message || 'Falha inesperada.'}`);
                  } finally {
                    setSubmittingAdjust(false);
                  }
                }}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#38bdf8', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer' }}
              >
                {submittingAdjust ? 'Salvando...' : 'Confirmar Ajuste'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
