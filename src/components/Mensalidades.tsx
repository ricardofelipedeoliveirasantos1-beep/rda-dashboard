import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  User, 
  AlertCircle, 
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

interface Player {
  id: string;
  name: string;
  photo_url: string | null;
  category: string;
}

interface MonthlyPayment {
  id?: string;
  player_id: string;
  payment_month: string;
  amount: number;
  status: 'paid' | 'pending';
  paid_at?: string | null;
}

const MONTHS_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function Mensalidades({ userRole: _userRole, can: _can }: { userRole: 'admin' | 'assistant' | 'visitor' | 'treasurer'; can: (action: any) => boolean }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showMonthSelect, setShowMonthSelect] = useState(false);
  const [showYearSelect, setShowYearSelect] = useState(false);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [payments, setPayments] = useState<MonthlyPayment[]>([]);
  
  const [defaultMonthlyFee, setDefaultMonthlyFee] = useState<number>(60);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [globalLoaded, setGlobalLoaded] = useState(false);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const financeCache = useRef<Record<string, { payments: MonthlyPayment[] }>>({});

  const getYearMonthString = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  };

  const currentMonthStr = getYearMonthString(currentDate);

  useEffect(() => {
    async function loadGlobalData() {
      try {
        setLoading(true);
        setError(null);

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
        console.error('Erro ao buscar dados globais das mensalidades:', err);
        setError('Erro ao carregar dados dos Jogadores/Configurações.');
      } finally {
        setLoading(false);
      }
    }

    loadGlobalData();
  }, []);

  const loadMonthData = async (monthStr: string) => {
    if (financeCache.current[monthStr]) {
      setPayments(financeCache.current[monthStr].payments);
      return;
    }

    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('monthly_payments')
        .select('*')
        .eq('payment_month', monthStr);

      if (paymentsError && paymentsError.code !== 'PGRST116') {
         throw paymentsError;
      }

      const paymentsRes = paymentsData || [];

      financeCache.current[monthStr] = { payments: paymentsRes };

      setPayments(paymentsRes);
    } catch (err) {
      console.error(`Erro ao carregar dados do mês ${monthStr}:`, err);
    }
  };

  useEffect(() => {
    if (!globalLoaded) return;
    loadMonthData(currentMonthStr);
  }, [currentMonthStr, globalLoaded]);

  const handleTogglePayment = async (playerId: string, currentStatus: 'paid' | 'pending') => {
    if (_userRole === 'visitor') {
      setFeedback({ type: 'error', message: 'Permissão negada' });
      return;
    }
    
    const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    setFeedback(null);

    const originalPayments = [...payments];

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
    } catch (err: any) {
      console.error('Erro ao atualizar pagamento, revertendo:', err);
      setPayments(originalPayments);
      if (financeCache.current[currentMonthStr]) {
        financeCache.current[currentMonthStr].payments = originalPayments;
      }
      setFeedback({ type: 'error', message: 'Erro ao registrar status.' });
    }
  };

  const getDisplayedPlayers = () => {
    const isPastMonth = currentDate < new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    const paymentStatusMap = new Map<string, string>();
    payments.forEach(p => paymentStatusMap.set(p.player_id, p.status));
    
    return players.filter(p => {
      const pStatus = paymentStatusMap.get(p.id);
      
      if (isPastMonth) {
        // Para meses passados: mostra todos que têm algum registro de pagamento (pago ou pendente)
        // Isso preserva o histórico de quem era mensalista na época.
        return pStatus !== undefined;
      } else {
        // Para o mês atual:
        if (p.category === 'Mensalista') {
          return true; // Mensalistas sempre aparecem (se não tem registro, ficam como pendentes)
        } else {
          // Diaristas SÓ aparecem se já tiverem pago algo neste mês
          // Se tiverem registro 'pending' antigo, ignoramos (retira da lista e dos totais)
          return pStatus === 'paid';
        }
      }
    });
  };

  const displayedPlayers = getDisplayedPlayers();

  const mensalistasWithStatus = displayedPlayers.map(player => {
    let status: 'paid' | 'pending' = 'pending';
    let amount = defaultMonthlyFee;

    const record = payments.find(pay => pay.player_id === player.id);
    if (record) {
      status = record.status;
      amount = record.amount;
    }

    return {
      ...player,
      payment_status: status,
      payment_amount: amount,
      paid_at: record?.paid_at
    };
  });

  const totalMensalistasCount = mensalistasWithStatus.length;
  const paidMensalistas = mensalistasWithStatus.filter(m => m.payment_status === 'paid');
  const pendingMensalistas = mensalistasWithStatus.filter(m => m.payment_status === 'pending');

  const recebidosVal = paidMensalistas.reduce((sum, m) => sum + m.payment_amount, 0);
  const previstosVal = totalMensalistasCount * defaultMonthlyFee;
  const pendentesVal = previstosVal - recebidosVal;

  const filteredMensalistas = mensalistasWithStatus.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && m.payment_status === statusFilter;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: 'var(--text-secondary)' }}>
        Carregando mensalidades...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <div style={{ padding: '0 4px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #a3a3a3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Mensalidades</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Controle de pagamentos dos mensalistas.</p>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* SELETOR DE MÊS E ANO DROPDOWN */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {/* Dropdown Mês */}
        <div style={{ position: 'relative', flex: 1 }}>
          <button 
            onClick={() => { setShowMonthSelect(!showMonthSelect); setShowYearSelect(false); }}
            style={{ 
              width: '100%',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              backgroundColor: '#171717', 
              padding: '12px 16px', 
              borderRadius: '12px',
              border: '1.5px solid rgba(255,255,255,0.08)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <span>{MONTHS_NAMES[currentDate.getMonth()]}</span>
            <ChevronDown size={18} style={{ transform: showMonthSelect ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </button>
          
          {showMonthSelect && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
              backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
              maxHeight: '240px', overflowY: 'auto', zIndex: 10,
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }}>
              {MONTHS_NAMES.map((m, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentDate(new Date(currentDate.getFullYear(), i, 1));
                    setShowMonthSelect(false);
                  }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none',
                    border: 'none', color: '#fff', fontSize: '0.9rem', cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    backgroundColor: currentDate.getMonth() === i ? 'rgba(255,255,255,0.05)' : 'transparent'
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown Ano */}
        <div style={{ position: 'relative', width: '120px' }}>
          <button 
            onClick={() => { setShowYearSelect(!showYearSelect); setShowMonthSelect(false); }}
            style={{ 
              width: '100%',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              backgroundColor: '#171717', 
              padding: '12px 16px', 
              borderRadius: '12px',
              border: '1.5px solid rgba(255,255,255,0.08)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <span>{currentDate.getFullYear()}</span>
            <ChevronDown size={18} style={{ transform: showYearSelect ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </button>
          
          {showYearSelect && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
              backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
              maxHeight: '240px', overflowY: 'auto', zIndex: 10,
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }}>
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((year) => (
                <button
                  key={year}
                  onClick={() => {
                    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
                    setShowYearSelect(false);
                  }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none',
                    border: 'none', color: '#fff', fontSize: '0.9rem', cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    backgroundColor: currentDate.getFullYear() === year ? 'rgba(255,255,255,0.05)' : 'transparent'
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DOIS CARDS PRINCIPAIS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Card 1 — Pagos */}
        <div style={{
          padding: '16px 12px', borderRadius: '12px', backgroundColor: 'rgba(34, 197, 94, 0.05)',
          border: '1px solid rgba(34, 197, 94, 0.15)', display: 'flex', flexDirection: 'column', gap: '6px',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#22c55e', letterSpacing: '0.5px' }}>PAGO</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{paidMensalistas.length} jogadores</span>
          <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff' }}>R$ {recebidosVal.toFixed(2)}</span>
        </div>

        {/* Card 2 — Pendentes */}
        <div style={{
          padding: '16px 12px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.15)', display: 'flex', flexDirection: 'column', gap: '6px',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ef4444', letterSpacing: '0.5px' }}>PENDENTE</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{pendingMensalistas.length} jogadores</span>
          <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff' }}>R$ {pendentesVal.toFixed(2)}</span>
        </div>
      </div>

      {feedback && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: feedback.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: feedback.type === 'success' ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)', color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: '0.85rem' }}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* LISTA DE MENSALISTAS */}
      <section className="dashboard-card" style={{ gap: '12px' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '4px 0' }}>
          <button onClick={() => setStatusFilter('all')} style={{ padding: '12px 10px', backgroundColor: statusFilter === 'all' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.01)', border: '1px solid', borderColor: statusFilter === 'all' ? '#38bdf8' : 'rgba(255,255,255,0.08)', borderRadius: '10px', color: statusFilter === 'all' ? '#38bdf8' : 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>Todos {totalMensalistasCount}</button>
          <button onClick={() => setStatusFilter('paid')} style={{ padding: '12px 10px', backgroundColor: statusFilter === 'paid' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.01)', border: '1px solid', borderColor: statusFilter === 'paid' ? '#22c55e' : 'rgba(255,255,255,0.08)', borderRadius: '10px', color: statusFilter === 'paid' ? '#22c55e' : 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>Pagos {paidMensalistas.length}</button>
          <button onClick={() => setStatusFilter('pending')} style={{ padding: '12px 10px', backgroundColor: statusFilter === 'pending' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.01)', border: '1px solid', borderColor: statusFilter === 'pending' ? '#ef4444' : 'rgba(255,255,255,0.08)', borderRadius: '10px', color: statusFilter === 'pending' ? '#ef4444' : 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>Pendentes {pendingMensalistas.length}</button>
        </div>

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
                      style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, aspectRatio: '1/1' }}
                    />
                  ) : (
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, aspectRatio: '1/1' }}>
                      <User size={20} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{player.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      R$ {player.payment_amount.toFixed(2)}
                      {player.paid_at && ` • Pago em ${new Date(player.paid_at).toLocaleDateString('pt-BR')}`}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '5px 9px',
                    borderRadius: '6px',
                    backgroundColor: player.payment_status === 'paid' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: player.payment_status === 'paid' ? '#22c55e' : '#ef4444',
                    border: '1.5px solid',
                    borderColor: player.payment_status === 'paid' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                  }}>
                    {player.payment_status === 'paid' ? 'PAGO' : 'PENDENTE'}
                  </span>

                  <button
                    onClick={() => handleTogglePayment(player.id, player.payment_status)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      backgroundColor: player.payment_status === 'paid' ? 'rgba(255,255,255,0.03)' : '#22c55e',
                      border: player.payment_status === 'paid' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                      color: player.payment_status === 'paid' ? 'var(--text-primary)' : '#ffffff',
                      fontSize: '0.75rem',
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
              Nenhum mensalista encontrado para este mês.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
