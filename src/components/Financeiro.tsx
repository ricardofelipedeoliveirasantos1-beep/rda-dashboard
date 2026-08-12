import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  User, 
  AlertCircle, 
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface Player {
  id: string;
  name: string;
  photo_url: string | null;
  category: string;
  fee: number | null;
}

interface MonthlyPayment {
  id?: string;
  player_id: string;
  payment_month: string;
  amount: number;
  status: 'paid' | 'pending';
  paid_at?: string | null;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
}
interface Match {
  id: string;
  match_date: string;
  match_time: string;
  location: string;
  status: 'in_progress' | 'finished';
  daily_total: number;
  match_players?: {
    player_id: string;
    category_at_match: string;
  }[];
}

const MONTHS_NAMES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

export default function Financeiro({ userRole: _userRole, can: _can }: { userRole: 'admin' | 'assistant' | 'visitor' | 'treasurer'; can: (action: any) => boolean }) {
  const [loading, setLoading] = useState(true);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date State: default is today
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Data States
  const [players, setPlayers] = useState<Player[]>([]);
  const [payments, setPayments] = useState<MonthlyPayment[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseData, setEditExpenseData] = useState<{ category: string; amount: string; description: string; date: string }>({ category: 'Campo', amount: '', description: '', date: '' });
  const [newExpense, setNewExpense] = useState<{ category: string; amount: string; description: string; date: string }>({
    category: 'Campo',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [defaultMonthlyFee, setDefaultMonthlyFee] = useState<number>(60);
  
  // Local Memory Fallback for monthly_payments if table is missing
  const [tableMissing, setTableMissing] = useState(false);
  const [localFallbackPayments, setLocalFallbackPayments] = useState<{ [key: string]: 'paid' | 'pending' }>({});

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cache & Global Loaded state
  const [globalLoaded, setGlobalLoaded] = useState(false);

  // Limpar feedback após 2 segundos
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);
  const financeCache = useRef<Record<string, { payments: MonthlyPayment[]; matches: Match[]; expenses: Expense[] }>>({});

  // Month String Helper (YYYY-MM)
  const getYearMonthString = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  };

  const currentMonthStr = getYearMonthString(currentDate);

  // Load global data only once
  useEffect(() => {
    async function loadGlobalData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch active players (we will filter mensalistas locally)
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (playersError) throw playersError;
        setPlayers((playersData || []).map((p: any) => ({
          ...p,
          category: (p.category === 'mensalista' || p.category === 'Mensalista') ? 'Mensalista' : 'Diarista'
        })));

        // 2. Fetch default settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('monthly_fee')
          .eq('id', 'default')
          .single();

        if (!settingsError && settingsData) {
          setDefaultMonthlyFee(Number(settingsData.monthly_fee));
        }

        setGlobalLoaded(true);
      } catch (err: any) {
        console.error('Erro ao buscar dados globais do financeiro:', err);
        setError('Erro ao carregar dados dos Jogadores/Configurações.');
      } finally {
        setLoading(false);
      }
    }

    loadGlobalData();
  }, []);

  // Fetch month data (with caching & prefetch support)
  const loadMonthData = async (monthStr: string, dateObj: Date, isPrefetch = false) => {
    if (financeCache.current[monthStr]) {
      if (!isPrefetch) {
        setPayments(financeCache.current[monthStr].payments);
        setMatches(financeCache.current[monthStr].matches);
        setExpenses(financeCache.current[monthStr].expenses);
      }
      return;
    }

    if (!isPrefetch) {
      setLoadingMonth(true);
    }

    try {
      const startOfMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-01`;
      const nextMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 1);
      const endOfMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          match_players (
            player_id,
            category_at_match
          )
        `)
        .eq('status', 'finished')
        .gte('match_date', startOfMonth)
        .lt('match_date', endOfMonth);

      if (matchesError) {
        console.error('Erro ao carregar partidas:', matchesError);
      }

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('monthly_payments')
        .select('*')
        .eq('payment_month', monthStr);

      if (paymentsError) {
        if (paymentsError.code === 'PGRST205' || paymentsError.message.includes('monthly_payments')) {
          setTableMissing(true);
        } else {
          throw paymentsError;
        }
      } else {
        setTableMissing(false);
      }

      const matchesRes = matchesData || [];
      const paymentsRes = paymentsData || [];

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startOfMonth)
        .lt('expense_date', endOfMonth)
        .order('expense_date', { ascending: false });

      if (expensesError) console.error('Erro ao carregar despesas:', expensesError);
      const expensesRes = expensesData || [];


      // Save to cache
      financeCache.current[monthStr] = {
        payments: paymentsRes,
        matches: matchesRes,
        expenses: expensesRes
      };

      if (!isPrefetch) {
        setPayments(paymentsRes);
        setMatches(matchesRes);
        setExpenses(expensesRes);
      }
    } catch (err) {
      console.error(`Erro ao carregar dados do mês ${monthStr}:`, err);
    } finally {
      if (!isPrefetch) {
        setLoadingMonth(false);
      }
    }
  };

  // Load current month and prefetch M-1 / M+1
  useEffect(() => {
    if (!globalLoaded) return;

    loadMonthData(currentMonthStr, currentDate);

    // Prefetch adjacent months
    const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const prevStr = getYearMonthString(prevDate);
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const nextStr = getYearMonthString(nextDate);

    loadMonthData(prevStr, prevDate, true);
    loadMonthData(nextStr, nextDate, true);
  }, [currentMonthStr, globalLoaded]);

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setFeedback(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setFeedback(null);
  };

  // Toggle Payment status (with optimistic updates)
  const handleTogglePayment = async (playerId: string, currentStatus: 'paid' | 'pending') => {
    if (_userRole === 'visitor') {
      setFeedback({ type: 'error', message: 'Não tem moral para mudar' });
      return;
    }
    
    const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    
    setFeedback(null);

    // Keep original state for rollbacks
    const originalPayments = [...payments];

    // Optimistic Update
    let optimisticPayments: MonthlyPayment[] = originalPayments.map(p => {
      if (p.player_id === playerId) {
        return { ...p, status: nextStatus };
      }
      return p;
    });

    if (nextStatus === 'paid' && !originalPayments.some(p => p.player_id === playerId)) {
      optimisticPayments.push({
        player_id: playerId,
        payment_month: currentMonthStr,
        amount: defaultMonthlyFee,
        status: 'paid'
      });
    }

    setPayments(optimisticPayments);
    if (financeCache.current[currentMonthStr]) {
      financeCache.current[currentMonthStr].payments = optimisticPayments;
    }

    try {
      if (tableMissing) {
        // Local Fallback simulation
        setLocalFallbackPayments(prev => ({
          ...prev,
          [`${playerId}_${currentMonthStr}`]: nextStatus
        }));
        setFeedback({ 
          type: 'success', 
          message: `Localmente marcado como ${nextStatus === 'paid' ? 'Pago' : 'Pendente'} (Modo de Demonstração)` 
        });
      } else {
        // Save to Supabase
        const { error: upsertError } = await supabase
          .from('monthly_payments')
          .upsert({
            player_id: playerId,
            payment_month: currentMonthStr,
            amount: defaultMonthlyFee,
            status: nextStatus,
            paid_at: nextStatus === 'paid' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'player_id, payment_month' });

        if (upsertError) throw upsertError;

        // Re-fetch fresh payments
        const { data: updatedPayments } = await supabase
          .from('monthly_payments')
          .select('*')
          .eq('payment_month', currentMonthStr);

        if (updatedPayments) {
          setPayments(updatedPayments);
          if (financeCache.current[currentMonthStr]) {
            financeCache.current[currentMonthStr].payments = updatedPayments;
          }
        }

        setFeedback({ 
          type: 'success', 
          message: `Mensalidade atualizada para ${nextStatus === 'paid' ? 'paga' : 'pendente'}.` 
        });
      }
    } catch (err: any) {
      console.error('Erro ao atualizar pagamento, revertendo:', err);
      setPayments(originalPayments);
      if (financeCache.current[currentMonthStr]) {
        financeCache.current[currentMonthStr].payments = originalPayments;
      }
      setFeedback({ type: 'error', message: 'Erro ao registrar status de pagamento. Operação revertida.' });
    }
  };

  // Filter Mensalistas only
  const mensalistas = players.filter(p => p.category === 'Mensalista');

  // Map players status
  const mensalistasWithStatus = mensalistas.map(player => {
    let status: 'paid' | 'pending' = 'pending';
    let amount = defaultMonthlyFee;

    if (tableMissing) {
      status = localFallbackPayments[`${player.id}_${currentMonthStr}`] || 'pending';
    } else {
      const record = payments.find(pay => pay.player_id === player.id);
      if (record) {
        status = record.status;
        amount = record.amount;
      }
    }

    return {
      ...player,
      payment_status: status,
      payment_amount: amount
    };
  });

  // Calculate Summary metrics
  const totalMensalistasCount = mensalistasWithStatus.length;
  const paidMensalistas = mensalistasWithStatus.filter(m => m.payment_status === 'paid');
  const pendingMensalistas = mensalistasWithStatus.filter(m => m.payment_status === 'pending');

  const previstosVal = totalMensalistasCount * defaultMonthlyFee;
  const recebidosVal = paidMensalistas.reduce((sum, m) => sum + m.payment_amount, 0);
  const pendentesVal = pendingMensalistas.reduce((sum, m) => sum + m.payment_amount, 0);

  // Diárias Arrecadadas
  const diaristasTotalVal = matches.reduce((sum, m) => sum + Number(m.daily_total || 0), 0);
  const totalFinishedMatches = matches.length;

  // Total Entradas (Recebidas + Diárias)
  const totalEntradasVal = recebidosVal + diaristasTotalVal;

  // Despesas e Saldo
  const totalDespesasVal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const saldoFinalVal = totalEntradasVal - totalDespesasVal;


  // Search Filter
  const filteredMensalistas = mensalistasWithStatus.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && m.payment_status === statusFilter;
  });

  // SQL code block to present if table is missing
  const sqlCode = `CREATE TABLE IF NOT EXISTS public.monthly_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    payment_month TEXT NOT NULL, -- Formato 'YYYY-MM'
    amount NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_player_month UNIQUE (player_id, payment_month),
    CONSTRAINT status_check CHECK (status IN ('paid', 'pending'))
);

-- Habilitar RLS
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Permitir leitura publica" ON public.monthly_payments FOR SELECT USING (true);
CREATE POLICY "Permitir insercao publica" ON public.monthly_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update publico" ON public.monthly_payments FOR UPDATE USING (true);
CREATE POLICY "Permitir delete publico" ON public.monthly_payments FOR DELETE USING (true);

NOTIFY pgrst, 'reload schema';`;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: 'var(--text-secondary)' }}>
        Carregando financeiro...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* CABEÇALHO */}
      <div style={{ padding: '0 4px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #a3a3a3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Financeiro</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Controle de mensalidades e arrecadação das partidas.</p>
      </div>
      <div style={{ padding: '0 4px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={() => setShowExpenseModal(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 12px', 
              backgroundColor: '#f43f5e', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '0.8rem', 
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(244, 63, 94, 0.4)'
            }}
          >
            + Lançar Despesa
          </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* SELETOR DE MÊS */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '24px', 
        backgroundColor: '#171717', 
        padding: '10px 16px', 
        borderRadius: '12px',
        border: '1.5px solid rgba(255,255,255,0.03)'
      }}>
        <button 
          onClick={handlePrevMonth}
          style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.03)' }}
        >
          <ChevronLeft size={18} />
        </button>

        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {MONTHS_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          {loadingMonth && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366f1', display: 'inline-block', animation: 'pulse 1s infinite alternate' }} />}
        </span>

        <button 
          onClick={handleNextMonth}
          style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.03)' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* BANNER AVISANDO MIGRATION SQL */}
      {tableMissing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', borderRadius: '12px', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: '0.8rem', lineHeight: '1.4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <Lock size={16} />
            <span>Tabela 'monthly_payments' não encontrada no banco.</span>
          </div>
          <p>Para persistir os pagamentos, crie a tabela no SQL Editor do Supabase executando a query abaixo:</p>
          <pre style={{ margin: '8px 0 0 0', padding: '10px', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '8px', overflowX: 'auto', fontSize: '0.72rem', color: '#e5e7eb', fontFamily: 'monospace' }}>
            {sqlCode}
          </pre>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(sqlCode);
              alert('SQL copiado para a área de transferência!');
            }}
            style={{ 
              marginTop: '4px', 
              alignSelf: 'flex-start', 
              padding: '6px 12px', 
              fontSize: '0.72rem', 
              fontWeight: 700, 
              backgroundColor: 'rgba(245,158,11,0.2)', 
              border: '1px solid rgba(245,158,11,0.4)', 
              color: '#ffffff', 
              borderRadius: '6px', 
              cursor: 'pointer' 
            }}
          >
            Copiar SQL
          </button>
        </div>
      )}

      {/* CINCO CARDS RESUMO DO TOP BANNER */}
      <div className="finance-grid-topo">
        {/* Card 1 — Previstas */}
        <div className="finance-mini-card card-previstas">
          <span className="finance-mini-card-title">Previstas</span>
          <span className="finance-mini-card-value">R$ {previstosVal.toFixed(0)}</span>
          <span className="finance-mini-card-counter">{totalMensalistasCount} mens.</span>
        </div>

        {/* Card 2 — Recebidas */}
        <div className="finance-mini-card card-recebidas">
          <span className="finance-mini-card-title">Recebidas</span>
          <span className="finance-mini-card-value">R$ {recebidosVal.toFixed(0)}</span>
          <span className="finance-mini-card-counter">{paidMensalistas.length} pagos</span>
        </div>

        {/* Card 3 — Pendentes */}
        <div className="finance-mini-card card-pendentes">
          <span className="finance-mini-card-title">Pendentes</span>
          <span className="finance-mini-card-value">R$ {pendentesVal.toFixed(0)}</span>
          <span className="finance-mini-card-counter">{pendingMensalistas.length} pend.</span>
        </div>

        {/* Card 4 — Diárias */}
        <div className="finance-mini-card card-diarias">
          <span className="finance-mini-card-title">Diárias</span>
          <span className="finance-mini-card-value">R$ {diaristasTotalVal.toFixed(0)}</span>
          <span className="finance-mini-card-counter">{totalFinishedMatches} part.</span>
        </div>

        {/* Card 5 — Entradas */}
        <div className="finance-mini-card card-entradas">
          <span className="finance-mini-card-title">Entradas</span>
          <span className="finance-mini-card-value">R$ {totalEntradasVal.toFixed(0)}</span>
          <span className="finance-mini-card-counter">Total</span>
        </div>
        {/* Card 5 — Despesas */}
        <div className="finance-mini-card card-despesas">
          <span className="finance-mini-card-title">Despesas</span>
          <span className="finance-mini-card-value">R$ {totalDespesasVal.toFixed(0)}</span>
          <span className="finance-mini-card-counter">{expenses.length} reg.</span>
        </div>

        {/* Card 6 — Saldo */}
        <div className="finance-mini-card card-saldo">
          <span className="finance-mini-card-title">Saldo Mês</span>
          <span className="finance-mini-card-value">R$ {saldoFinalVal.toFixed(0)}</span>
          <span className="finance-mini-card-counter">Líquido</span>
        </div>

      </div>

      {/* FEEDBACK FEED */}
      {feedback && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: feedback.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: feedback.type === 'success' ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)', color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: '0.85rem' }}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* SEÇÃO MENSALIDADES */}
      <section className="dashboard-card" style={{ gap: '12px' }}>
        <div className="card-header" style={{ marginBottom: '2px' }}>
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
            MENSALIDADES
          </span>
        </div>

        {/* BUSCA DE JOGADORES */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Buscar mensalista..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 10px 10px 36px',
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* FILTROS DE STATUS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '4px 0' }}>
          <button
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '8px 10px',
              backgroundColor: statusFilter === 'all' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.01)',
              border: '1px solid',
              borderColor: statusFilter === 'all' ? '#38bdf8' : 'rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: statusFilter === 'all' ? '#38bdf8' : 'var(--text-secondary)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Todos {totalMensalistasCount}
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            style={{
              padding: '8px 10px',
              backgroundColor: statusFilter === 'paid' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.01)',
              border: '1px solid',
              borderColor: statusFilter === 'paid' ? '#22c55e' : 'rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: statusFilter === 'paid' ? '#22c55e' : 'var(--text-secondary)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Pagos {paidMensalistas.length}
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            style={{
              padding: '8px 10px',
              backgroundColor: statusFilter === 'pending' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.01)',
              border: '1px solid',
              borderColor: statusFilter === 'pending' ? '#ef4444' : 'rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: statusFilter === 'pending' ? '#ef4444' : 'var(--text-secondary)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Pendentes {pendingMensalistas.length}
          </button>
        </div>

        {/* LISTA DE MENSALISTAS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
          {filteredMensalistas.length > 0 ? (
            filteredMensalistas.map((player) => (
              <div 
                key={player.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {player.photo_url ? (
                    <img 
                      src={player.photo_url} 
                      alt={player.name} 
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{player.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Mensalista • R$ {player.payment_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Status Badge */}
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: player.payment_status === 'paid' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: player.payment_status === 'paid' ? '#22c55e' : '#ef4444',
                    border: '1.5px solid',
                    borderColor: player.payment_status === 'paid' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                  }}>
                    {player.payment_status === 'paid' ? 'PAGO' : 'PENDENTE'}
                  </span>

                  {/* Toggle Button */}
                  <button
                    onClick={() => handleTogglePayment(player.id, player.payment_status)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: player.payment_status === 'paid' ? 'rgba(255,255,255,0.03)' : '#22c55e',
                      border: player.payment_status === 'paid' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                      color: player.payment_status === 'paid' ? 'var(--text-primary)' : '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                  >
                    {player.payment_status === 'paid' ? 'Marcar Pendente' : 'Marcar Pago'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Nenhum mensalista encontrado.
            </div>
          )}
        </div>
      </section>

      {/* SEÇÃO DIÁRIAS DAS PARTIDAS */}
      <section className="dashboard-card" style={{ gap: '12px' }}>
        <div className="card-header" style={{ marginBottom: '2px' }}>
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
            DIÁRIAS DAS PARTIDAS
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {matches.length > 0 ? (
            matches.map((match) => {
              const formattedDate = match.match_date.split('-').reverse().join('/');
              const diaristasCount = (match.match_players || []).filter(mp => mp.category_at_match === 'Diarista').length;
              return (
                <div 
                  key={match.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formattedDate}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      {match.location ? match.location.split('|')[0].trim() : ''} • {match.match_time.slice(0, 5)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#22c55e' }}>
                      + R$ {Number(match.daily_total).toFixed(2)}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                      {diaristasCount} diaristas
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Nenhuma partida finalizada no mês selecionado.
            </div>
          )}
        </div>

        {/* Resumo Final de Diárias */}
        {matches.length > 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            borderTop: '1px solid rgba(255,255,255,0.04)', 
            paddingTop: '10px',
            marginTop: '4px',
            fontSize: '0.82rem'
          }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total de diárias arrecadadas:</span>
            <strong style={{ color: '#22c55e', fontWeight: 800 }}>
              {totalFinishedMatches} {totalFinishedMatches === 1 ? 'partida' : 'partidas'} • R$ {diaristasTotalVal.toFixed(2)}
            </strong>
          </div>
        )}
      </section>

      {/* SEÇÃO DESPESAS */}
      <section className="dashboard-card" style={{ gap: '12px' }}>
        <div className="card-header" style={{ marginBottom: '2px' }}>
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
            DESPESAS
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {expenses.length > 0 ? (
            expenses.map((expense) => {
              const formattedDate = expense.expense_date.split('-').reverse().join('/');
              const isEditing = editingExpenseId === expense.id;
              
              if (isEditing) {
                return (
                  <div 
                    key={expense.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <select 
                        value={editExpenseData.category}
                        onChange={e => setEditExpenseData({...editExpenseData, category: e.target.value})}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '6px', borderRadius: '6px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }}
                      >
                        <option value="Campo">Campo</option>
                        <option value="Árbitro">Árbitro</option>
                        <option value="Goleiro">Goleiro</option>
                        <option value="Material">Material</option>
                        <option value="Uber">Uber</option>
                        <option value="Frutas">Frutas</option>
                        <option value="Outros">Outros</option>
                      </select>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="Valor"
                        value={editExpenseData.amount}
                        onChange={e => setEditExpenseData({...editExpenseData, amount: e.target.value})}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '6px', borderRadius: '6px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }}
                      />
                      <input 
                        type="date" 
                        value={editExpenseData.date}
                        onChange={e => setEditExpenseData({...editExpenseData, date: e.target.value})}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '6px', borderRadius: '6px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }}
                      />
                      <input 
                        type="text" 
                        placeholder="Descrição"
                        value={editExpenseData.description}
                        onChange={e => setEditExpenseData({...editExpenseData, description: e.target.value})}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '6px', borderRadius: '6px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button 
                        onClick={() => setEditingExpenseId(null)}
                        style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#a3a3a3', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={async () => {
                          if (!editExpenseData.amount || isNaN(Number(editExpenseData.amount))) {
                            alert('Digite um valor válido.');
                            return;
                          }
                          try {
                            const { error } = await supabase.from('expenses').update({
                              category: editExpenseData.category,
                              amount: Number(editExpenseData.amount),
                              description: editExpenseData.description,
                              expense_date: editExpenseData.date
                            }).eq('id', expense.id);
                            
                            if (error) throw error;
                            
                            const updatedExpense = {
                              ...expense,
                              category: editExpenseData.category,
                              amount: Number(editExpenseData.amount),
                              description: editExpenseData.description,
                              expense_date: editExpenseData.date
                            };
                            
                            setExpenses(prev => prev.map(e => e.id === expense.id ? updatedExpense : e));
                            if (financeCache.current[currentMonthStr]) {
                              financeCache.current[currentMonthStr].expenses = financeCache.current[currentMonthStr].expenses.map(e => e.id === expense.id ? updatedExpense : e);
                            }
                            
                            setFeedback({ type: 'success', message: 'Despesa atualizada!' });
                            setEditingExpenseId(null);
                          } catch (err) {
                            alert('Erro ao atualizar despesa.');
                          }
                        }}
                        style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#f43f5e', border: 'none', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={expense.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{expense.category}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      {formattedDate} {expense.description ? `• ${expense.description}` : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f43f5e' }}>
                      - R$ {Number(expense.amount).toFixed(2)}
                    </span>
                    {(_userRole === 'admin' || _userRole === 'treasurer' || (_userRole === 'assistant' && _can('delete_expense'))) && (
                      <div style={{ display: 'flex', gap: '8px' }}>
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
                          style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Tem certeza que deseja remover esta despesa?')) {
                              try {
                                const { error } = await supabase.from('expenses').delete().eq('id', expense.id);
                                if (error) throw error;
                                setExpenses(prev => prev.filter(e => e.id !== expense.id));
                                if (financeCache.current[currentMonthStr]) {
                                  financeCache.current[currentMonthStr].expenses = financeCache.current[currentMonthStr].expenses.filter(e => e.id !== expense.id);
                                }
                                setFeedback({ type: 'success', message: 'Despesa removida.' });
                              } catch (err) {
                                setFeedback({ type: 'error', message: 'Erro ao remover despesa.' });
                              }
                            }
                          }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Nenhuma despesa registrada.
            </div>
          )}
        </div>
      </section>

      {/* MODAL NOVA DESPESA */}
      {showExpenseModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)', width: '90%', maxWidth: '400px', boxSizing: 'border-box',
            borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Nova Despesa</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Categoria</label>
              <select 
                value={newExpense.category}
                onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              >
                <option value="Campo">Campo</option>
                <option value="Árbitro">Árbitro</option>
                <option value="Goleiro">Goleiro</option>
                <option value="Material">Material</option>
                <option value="Uber">Uber</option>
                <option value="Frutas">Frutas</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Valor (R$)</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={newExpense.amount}
                onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Data</label>
              <input 
                type="date" 
                value={newExpense.date}
                onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Descrição (Opcional)</label>
              <input 
                type="text" 
                placeholder="Detalhes..."
                value={newExpense.description}
                onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', backgroundColor: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button 
                onClick={() => setShowExpenseModal(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  if (!newExpense.amount || isNaN(Number(newExpense.amount))) {
                    alert('Digite um valor válido.');
                    return;
                  }
                  try {
                    const { data, error } = await supabase.from('expenses').insert([{
                      category: newExpense.category,
                      amount: Number(newExpense.amount),
                      description: newExpense.description,
                      expense_date: newExpense.date
                    }]).select();
                    if (error) throw error;
                    
                    // Reload if added in current month
                    if (newExpense.date.startsWith(currentMonthStr)) {
                      setExpenses(prev => [data[0], ...prev].sort((a,b) => b.expense_date.localeCompare(a.expense_date)));
                      if (financeCache.current[currentMonthStr]) {
                        financeCache.current[currentMonthStr].expenses = [data[0], ...financeCache.current[currentMonthStr].expenses].sort((a,b) => b.expense_date.localeCompare(a.expense_date));
                      }
                    }
                    
                    setFeedback({ type: 'success', message: 'Despesa registrada!' });
                    setShowExpenseModal(false);
                    setNewExpense({
                      category: 'Campo',
                      amount: '',
                      description: '',
                      date: new Date().toISOString().split('T')[0]
                    });
                  } catch (err) {
                    alert('Erro ao salvar despesa.');
                  }
                }}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#f43f5e', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
