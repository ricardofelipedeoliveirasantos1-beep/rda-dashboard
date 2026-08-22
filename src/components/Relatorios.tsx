import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

import { 
  BarChart2, ChevronDown, User, Trophy, 
  AlertCircle, Loader2, Flame, Star, ArrowUp, ArrowDown, Minus
} from 'lucide-react';

// === INTERFACES ===
interface RelatorioData {
  summary: {
    players: number;
    matches: number;
    goals: number;
    assists: number;
    yellow: number;
    blue: number;
    red: number;
    champions: number;
    vices: number;
    ralabosta: number;
  };
  finance: {
    entradas: number;
    mensalidades: number;
    diaristas: number;
    despesas: number;
    saldo: number;
  };
  rankingList: any[];
  matchesList: any[];
  destaques: {
    artilheiro: any;
    assistente: any;
    campeao: any;
    ralabosta: any;
  };
  monthlyStats: any[];
  financialStats: any[];
  comparison: {
    goalsDiff: number;
    assistsDiff: number;
    entradasDiff: number;
    despesasDiff: number;
  } | null;
}

const MONTHS = [
  { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' }, { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' }, { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' }
];

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function Relatorios({ userRole: _userRole, can: _can }: { userRole: 'admin' | 'assistant' | 'visitor' | 'treasurer'; can: (action: any) => boolean }) {
  const [filterType, setFilterType] = useState<'month' | 'semestre1' | 'semestre2' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RelatorioData | null>(null);

  // Accordion states
  const [isResumoOpen, setIsResumoOpen] = useState(true);
  const [isDesempenhoOpen, setIsDesempenhoOpen] = useState(false);
  const [isRankingOpen, setIsRankingOpen] = useState(false);
  const [isFinanceiroOpen, setIsFinanceiroOpen] = useState(false);
  const [isJogadoresOpen, setIsJogadoresOpen] = useState(false);
  const [isPartidasOpen, setIsPartidasOpen] = useState(false);
  const [isDestaquesOpen, setIsDestaquesOpen] = useState(false);
  const [isComparacaoOpen, setIsComparacaoOpen] = useState(false);

  // Ranking inside filters
  const [rankingCategory, setRankingCategory] = useState<'goals' | 'assists' | 'champ' | 'rala'>('goals');
  const [rankingPlayerId, setRankingPlayerId] = useState<string>('all');
  
  // Exibir Label de periodo (ex: Mensal | Agosto | 2026)
  const getPeriodLabel = () => {
    if (filterType === 'month') return `Mensal | ${MONTHS.find(m => m.value === selectedMonth)?.label} | ${selectedYear}`;
    if (filterType === 'semestre1') return `1º Semestre | ${selectedYear}`;
    if (filterType === 'semestre2') return `2º Semestre | ${selectedYear}`;
    return `Anual | ${selectedYear}`;
  };

  const getPeriodDates = (type: string, month: string, year: string, offset = 0) => {
    let start, end;
    
    if (type === 'month') {
      const d = new Date(parseInt(year), parseInt(month) - 1 + offset, 1);
      start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      end = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
    } else if (type === 'semestre1') {
      const dYear = parseInt(year) + (offset === -1 ? -1 : 0);
      if (offset === -1) {
        start = `${dYear - 1}-07-01`;
        end = `${dYear}-01-01`;
      } else {
        start = `${dYear}-01-01`;
        end = `${dYear}-07-01`;
      }
    } else if (type === 'semestre2') {
      const dYear = parseInt(year);
      if (offset === -1) {
        start = `${dYear}-01-01`;
        end = `${dYear}-07-01`;
      } else {
        start = `${dYear}-07-01`;
        end = `${dYear + 1}-01-01`;
      }
    } else {
      const dYear = parseInt(year) + offset;
      start = `${dYear}-01-01`;
      end = `${dYear + 1}-01-01`;
    }
    return { start, end };
  };

  const calculateStats = (matches: any[], payments: any[], expenses: any[]) => {
    let playersSet = new Set();
    let tGoals = 0, tAssists = 0, tYellow = 0, tBlue = 0, tRed = 0;
    let tChamp = 0, tVice = 0, tRala = 0;
    let diarias = 0;

    const playerMap: Record<string, any> = {};

    matches.forEach(match => {
      diarias += Number(match.daily_total || 0);
      const isHistorical = match.source === 'historical_manual' || match.source === 'historical_import';

      match.match_players?.forEach((mp: any) => {
        if (!mp.player) return;
        const pId = mp.player.id;
        playersSet.add(pId);
        
        if (!playerMap[pId]) {
          playerMap[pId] = {
            id: pId, name: mp.player.name, photo: mp.player.photo_url, category: mp.player.category,
            goals: 0, assists: 0, yellow: 0, blue: 0, red: 0,
            champ: 0, vice: 0, rala: 0, jogos: 0
          };
        }
        playerMap[pId].jogos += 1;

        if (!isHistorical && mp.category_at_match === 'Diarista') return;

        const stats = match.match_player_stats?.find((s: any) => s.player_id === pId);
        if (stats) {
          playerMap[pId].goals += (stats.goals || 0);
          playerMap[pId].assists += (stats.assists || 0);
          playerMap[pId].yellow += (stats.yellow_cards || 0);
          playerMap[pId].blue += (stats.blue_cards || 0);
          playerMap[pId].red += (stats.red_cards || 0);

          tGoals += (stats.goals || 0);
          tAssists += (stats.assists || 0);
          tYellow += (stats.yellow_cards || 0);
          tBlue += (stats.blue_cards || 0);
          tRed += (stats.red_cards || 0);
        }

        let isChamp = false;
        let isVice = false;
        let isRala = false;

        if (isHistorical) {
          isChamp = stats?.is_champion || false;
          isVice = stats?.is_runner_up || false;
          isRala = stats?.is_ralabosta || false;
        } else {
          isChamp = match.champion_team && (match.champion_team === mp.team);
          isVice = match.runner_up_team && (match.runner_up_team === mp.team);
          isRala = stats?.is_ralabosta || false;
        }

        if (isChamp) { playerMap[pId].champ += 1; tChamp += 1; }
        if (isVice) { playerMap[pId].vice += 1; tVice += 1; }
        if (isRala) { playerMap[pId].rala += 1; tRala += 1; }
      });
    });

    const rankingList = Object.values(playerMap).filter(p => p.jogos > 0);
    
    let mensalidades = 0;
    payments.forEach((p: any) => {
      if (p.status === 'paid') mensalidades += Number(p.amount);
    });

    let despesasTotal = 0;
    expenses.forEach((e: any) => {
      despesasTotal += Number(e.amount);
    });

    return {
      summary: {
        players: playersSet.size,
        matches: matches.length,
        goals: tGoals,
        assists: tAssists,
        yellow: tYellow,
        blue: tBlue,
        red: tRed,
        champions: tChamp,
        vices: tVice,
        ralabosta: tRala
      },
      finance: {
        entradas: mensalidades + diarias,
        mensalidades,
        diaristas: diarias,
        despesas: despesasTotal,
        saldo: (mensalidades + diarias) - despesasTotal
      },
      rankingList
    };
  };

  const buildMonthlyChart = (matches: any[], start: string, type: string) => {
    const stats: Record<string, { month: string, goals: number, assists: number }> = {};
    matches.forEach(m => {
      const monthPrefix = m.match_date.slice(0, 7); // YYYY-MM
      if (!stats[monthPrefix]) stats[monthPrefix] = { month: monthPrefix, goals: 0, assists: 0 };
      
      const matchGoals = (m.team_1_score || 0) + (m.team_2_score || 0) || (m.match_player_stats?.reduce((sum:any, s:any)=>sum+(s.goals||0), 0) || 0);
      const matchAssists = m.match_player_stats?.reduce((sum:any, s:any)=>sum+(s.assists||0), 0) || 0;
      
      stats[monthPrefix].goals += matchGoals;
      stats[monthPrefix].assists += matchAssists;
    });

    // Create a series based on filter type to ensure months without games still appear
    const result = [];
    const dateIt = new Date(start + 'T00:00:00'); // Force local interpretation
    let monthsToIterate = type === 'month' ? 1 : (type.includes('semestre') ? 6 : 12);
    
    for (let i = 0; i < monthsToIterate; i++) {
      const yyyy_mm = `${dateIt.getFullYear()}-${String(dateIt.getMonth() + 1).padStart(2, '0')}`;
      result.push(stats[yyyy_mm] || { month: yyyy_mm, goals: 0, assists: 0 });
      dateIt.setMonth(dateIt.getMonth() + 1);
    }
    return result;
  };

  const buildFinancialChart = (payments: any[], expenses: any[], matches: any[], start: string, type: string) => {
    const stats: Record<string, { month: string, entradas: number, despesas: number, saldo: number }> = {};
    
    // Group monthly payments
    payments.forEach(p => {
      if (p.status !== 'paid') return;
      const m = p.payment_month; // YYYY-MM
      if (!stats[m]) stats[m] = { month: m, entradas: 0, despesas: 0, saldo: 0 };
      stats[m].entradas += Number(p.amount);
    });

    // Group expenses
    expenses.forEach(e => {
      const m = e.expense_date.slice(0, 7);
      if (!stats[m]) stats[m] = { month: m, entradas: 0, despesas: 0, saldo: 0 };
      stats[m].despesas += Number(e.amount);
    });

    // Group match daily totals
    matches.forEach(m => {
      const month = m.match_date.slice(0, 7);
      if (!stats[month]) stats[month] = { month, entradas: 0, despesas: 0, saldo: 0 };
      stats[month].entradas += Number(m.daily_total || 0);
    });

    // Calc saldo
    Object.keys(stats).forEach(k => {
      stats[k].saldo = stats[k].entradas - stats[k].despesas;
    });

    const result = [];
    const dateIt = new Date(start + 'T00:00:00');
    let monthsToIterate = type === 'month' ? 1 : (type.includes('semestre') ? 6 : 12);
    
    for (let i = 0; i < monthsToIterate; i++) {
      const yyyy_mm = `${dateIt.getFullYear()}-${String(dateIt.getMonth() + 1).padStart(2, '0')}`;
      result.push(stats[yyyy_mm] || { month: yyyy_mm, entradas: 0, despesas: 0, saldo: 0 });
      dateIt.setMonth(dateIt.getMonth() + 1);
    }
    return result;
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const current = getPeriodDates(filterType, selectedMonth, selectedYear, 0);
      const prev = getPeriodDates(filterType, selectedMonth, selectedYear, -1);

      // --- CURRENT PERIOD FETCH ---
      const { data: matchesData } = await supabase
        .from('matches')
        .select('id, match_date, match_time, location, status, daily_total, team_1_score, team_2_score, champion_team, runner_up_team, source, match_players(player_id, team, category_at_match, player:players(id, name, photo_url, category)), match_player_stats(player_id, goals, assists, yellow_cards, blue_cards, red_cards, is_champion, is_runner_up, is_ralabosta)')
        .eq('status', 'finished')
        .gte('match_date', current.start)
        .lt('match_date', current.end)
        .order('match_date', { ascending: false });

      const matches = matchesData || [];

      // Create an array of months for fetching payments (like operator or in)
      const monthPrefixes = [];
      const dIt = new Date(current.start + 'T00:00:00');
      while (dIt < new Date(current.end + 'T00:00:00')) {
        monthPrefixes.push(`${dIt.getFullYear()}-${String(dIt.getMonth() + 1).padStart(2, '0')}`);
        dIt.setMonth(dIt.getMonth() + 1);
      }

      const { data: paymentsData } = await supabase
        .from('monthly_payments')
        .select('amount, status, payment_month')
        .in('payment_month', monthPrefixes);
      
      const payments = paymentsData || [];

      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount, expense_date')
        .gte('expense_date', current.start)
        .lt('expense_date', current.end);
      
      const expenses = expensesData || [];

      // --- PREVIOUS PERIOD FETCH (For Comparison) ---
      const { data: prevMatchesData } = await supabase
        .from('matches')
        .select('id, daily_total, source, champion_team, runner_up_team, match_players(player_id, team, category_at_match, player:players(id)), match_player_stats(player_id, goals, assists)')
        .eq('status', 'finished')
        .gte('match_date', prev.start)
        .lt('match_date', prev.end);

      const prevMonthPrefixes = [];
      const dItP = new Date(prev.start + 'T00:00:00');
      while (dItP < new Date(prev.end + 'T00:00:00')) {
        prevMonthPrefixes.push(`${dItP.getFullYear()}-${String(dItP.getMonth() + 1).padStart(2, '0')}`);
        dItP.setMonth(dItP.getMonth() + 1);
      }

      const { data: prevPaymentsData } = await supabase.from('monthly_payments').select('amount, status').in('payment_month', prevMonthPrefixes);
      const { data: prevExpensesData } = await supabase.from('expenses').select('amount').gte('expense_date', prev.start).lt('expense_date', prev.end);

      // --- AGGREGATION CURRENT ---
      const currentStats = calculateStats(matches, payments, expenses);
      
      // --- AGGREGATION PREV ---
      const prevStats = calculateStats(prevMatchesData || [], prevPaymentsData || [], prevExpensesData || []);

      // Destaques
      const getTop = (field: string) => [...currentStats.rankingList].sort((a, b) => b[field] - a[field])[0] || null;

      setData({
        summary: currentStats.summary,
        finance: currentStats.finance,
        rankingList: currentStats.rankingList,
        matchesList: matches,
        destaques: {
          artilheiro: getTop('goals'),
          assistente: getTop('assists'),
          campeao: getTop('champ'),
          ralabosta: getTop('rala')
        },
        monthlyStats: buildMonthlyChart(matches, current.start, filterType),
        financialStats: buildFinancialChart(payments, expenses, matches, current.start, filterType),
        comparison: {
          goalsDiff: currentStats.summary.goals - prevStats.summary.goals,
          assistsDiff: currentStats.summary.assists - prevStats.summary.assists,
          entradasDiff: currentStats.finance.entradas - prevStats.finance.entradas,
          despesasDiff: currentStats.finance.despesas - prevStats.finance.despesas
        }
      });
      
    } catch (err: any) {
      console.error(err);
      setError('Erro ao gerar relatório. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line
  }, []);

  // --- RENDER HELPERS ---
  const activeRanking = useMemo(() => {
    if (!data) return [];
    return [...data.rankingList].sort((a, b) => {
      if (rankingCategory === 'goals') return b.goals - a.goals;
      if (rankingCategory === 'assists') return b.assists - a.assists;
      if (rankingCategory === 'champ') return b.champ - a.champ;
      if (rankingCategory === 'rala') return b.rala - a.rala;
      return 0;
    });
  }, [data, rankingCategory]);

  const activePlayer = useMemo(() => {
    if (!data || rankingPlayerId === 'all') return null;
    return data.rankingList.find(p => p.id === rankingPlayerId) || null;
  }, [data, rankingPlayerId]);

  const getPos = (pId: string, cat: string) => {
    if (!data) return 0;
    const sorted = [...data.rankingList].sort((a, b) => b[cat] - a[cat]);
    return sorted.findIndex(p => p.id === pId) + 1;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', paddingBottom: '20px' }}>
      
      {/* HEADER */}
      <div style={{ padding: '0 4px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #a3a3a3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Relatórios</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Acompanhe os resultados do RDA.</p>
      </div>

      {/* FILTER CARD */}
      <div className="dashboard-card" style={{ gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="card-title" style={{ fontSize: '0.9rem' }}>PERÍODO</span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value as any)}
            style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
          >
            <option value="month">Mensal</option>
            <option value="semestre1">1º Semestre</option>
            <option value="semestre2">2º Semestre</option>
            <option value="year">Anual</option>
          </select>

          {filterType === 'month' && (
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
            >
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          )}

          <select 
            value={selectedYear} 
            onChange={e => setSelectedYear(e.target.value)}
            style={{ flex: filterType === 'month' ? 'none' : 1, padding: '10px', borderRadius: '10px', backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
          >
            {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={loading}
          style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#4f46e5', color: '#fff', fontWeight: 700, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {loading ? <Loader2 size={18} className="spinner" /> : <BarChart2 size={18} />}
          {loading ? 'Processando...' : 'Gerar Relatório'}
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {data && !loading && (
        <>
          {(filterType === 'semestre1' || filterType === 'semestre2') && (
            <div style={{ backgroundColor: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>Resumo do Semestre</span>
              <p style={{ fontSize: '0.85rem', color: '#fff', margin: 0 }}>
                {data.summary.matches} partidas • {data.summary.goals} gols • {data.summary.assists} assistências<br/>
                {formatCurrency(data.finance.entradas)} de entradas • {formatCurrency(data.finance.despesas)} de despesas<br/>
                <strong style={{color:'#22c55e'}}>{formatCurrency(data.finance.saldo)} de saldo</strong>
              </p>
            </div>
          )}

          {/* 1. RESUMO GERAL */}
          <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsResumoOpen(!isResumoOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>RESUMO GERAL</span>
                {!isResumoOpen && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {getPeriodLabel()}
                  </span>
                )}
              </div>
              <ChevronDown size={20} style={{ transform: isResumoOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
            </div>
            
            {isResumoOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Jogadores participantes</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.players}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Partidas finalizadas</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.matches}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Gols marcados</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.goals}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assistências</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.assists}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cartões <span style={{color: '#fbbf24'}}>Amarelos</span></span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.yellow}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cartões <span style={{color: '#3b82f6'}}>Azuis</span></span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.blue}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cartões <span style={{color: '#ef4444'}}>Vermelhos</span></span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.red}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Campeões</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.champions}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Vices</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.vices}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ralabosta</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.ralabosta}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. DESEMPENHO */}
          <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsDesempenhoOpen(!isDesempenhoOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>DESEMPENHO</span>
                {!isDesempenhoOpen && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {data.summary.goals} gols • {data.summary.assists} assistências • Média {(data.summary.goals / (data.summary.matches||1)).toFixed(1).replace('.',',')} gols/jogo
                  </span>
                )}
              </div>
              <ChevronDown size={20} style={{ transform: isDesempenhoOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
            </div>
            
            {isDesempenhoOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Média de gols por partida</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{(data.summary.goals / (data.summary.matches||1)).toFixed(1).replace('.',',')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Média de assist. por partida</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{(data.summary.assists / (data.summary.matches||1)).toFixed(1).replace('.',',')}</span>
                </div>
                
                {/* GRÁFICO 1: Gols x Assistências */}
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '16px', textAlign: 'center' }}>GOLS X ASSISTÊNCIAS</h4>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '120px', gap: '4px' }}>
                    {data.monthlyStats.map((ms, i) => {
                      const maxVal = Math.max(...data.monthlyStats.map(s => Math.max(s.goals, s.assists))) || 1;
                      const hGols = (ms.goals / maxVal) * 100;
                      const hAsts = (ms.assists / maxVal) * 100;
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '100px', width: '100%', justifyContent: 'center' }}>
                            <div style={{ width: '40%', height: `${hGols}%`, backgroundColor: '#38bdf8', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                              {ms.goals > 0 && <span style={{position:'absolute', top:'-14px', left:'50%', transform:'translateX(-50%)', fontSize:'9px', color:'#fff'}}>{ms.goals}</span>}
                            </div>
                            <div style={{ width: '40%', height: `${hAsts}%`, backgroundColor: '#fbbf24', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                              {ms.assists > 0 && <span style={{position:'absolute', top:'-14px', left:'50%', transform:'translateX(-50%)', fontSize:'9px', color:'#fff'}}>{ms.assists}</span>}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{MONTHS.find(m => m.value === ms.month.split('-')[1])?.label.slice(0,3)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', backgroundColor: '#38bdf8', borderRadius: '2px' }}/> <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Gols</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', backgroundColor: '#fbbf24', borderRadius: '2px' }}/> <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assistências</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. RANKING DO PERÍODO */}
          <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsRankingOpen(!isRankingOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>RANKING DO PERÍODO</span>
              </div>
              <ChevronDown size={20} style={{ transform: isRankingOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
            </div>
            
            {isRankingOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    value={rankingCategory} 
                    onChange={e => {setRankingCategory(e.target.value as any); setRankingPlayerId('all');}}
                    style={{ flex: 1, padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                  >
                    <option value="goals">Artilheiro</option>
                    <option value="assists">Assistências</option>
                    <option value="champ">Maior Campeão</option>
                    <option value="rala">Ralabosta</option>
                  </select>
                  <select 
                    value={rankingPlayerId} 
                    onChange={e => setRankingPlayerId(e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                  >
                    <option value="all">Todos os jogadores</option>
                    {[...data.rankingList].sort((a,b)=>a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {activePlayer ? (
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      {activePlayer.photo ? (
                        <img src={activePlayer.photo} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                      ) : (
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={24} color="#666" />
                        </div>
                      )}
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{activePlayer.name.toUpperCase()}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{getPeriodLabel()}</span>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff' }}><span>Jogos:</span> <strong>{activePlayer.jogos}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff' }}><span>Gols:</span> <strong>{activePlayer.goals}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff' }}><span>Assist.:</span> <strong>{activePlayer.assists}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff' }}><span>Campeão:</span> <strong>{activePlayer.champ}x</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff' }}><span>Ralabosta:</span> <strong>{activePlayer.rala}x</strong></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Artilheiro: <strong style={{color:'#fff'}}>{getPos(activePlayer.id, 'goals')}º</strong></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assistências: <strong style={{color:'#fff'}}>{getPos(activePlayer.id, 'assists')}º</strong></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Maior Campeão: <strong style={{color:'#fff'}}>{getPos(activePlayer.id, 'champ')}º</strong></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ralabosta: <strong style={{color:'#fff'}}>{activePlayer.rala > 0 ? getPos(activePlayer.id, 'rala')+'º' : '—'}</strong></div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {activeRanking.filter(p => p[rankingCategory] > 0).map((p, i) => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px' }}>
                        <span style={{ fontWeight: 800, color: i < 3 ? '#fbbf24' : 'var(--text-muted)', width: '20px' }}>{i + 1}º</span>
                        {p.photo ? (
                          <img src={p.photo} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={16} color="#666" />
                          </div>
                        )}
                        <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{p.name}</span>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>
                          {p[rankingCategory]} {rankingCategory === 'goals' ? 'gols' : rankingCategory === 'assists' ? 'asts' : rankingCategory === 'champ' ? 'títulos' : 'vezes'}
                        </div>
                      </div>
                    ))}
                    {activeRanking.filter(p => p[rankingCategory] > 0).length === 0 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum dado encontrado no período para esta categoria.</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. FINANCEIRO */}
          <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsFinanceiroOpen(!isFinanceiroOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>FINANCEIRO</span>
                {!isFinanceiroOpen && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Rec: {formatCurrency(data.finance.entradas)} • Desp: {formatCurrency(data.finance.despesas)} • Saldo: {formatCurrency(data.finance.saldo)}
                  </span>
                )}
              </div>
              <ChevronDown size={20} style={{ transform: isFinanceiroOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
            </div>
            
            {isFinanceiroOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mensalidades</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{formatCurrency(data.finance.mensalidades)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Diaristas</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{formatCurrency(data.finance.diaristas)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', paddingLeft: '12px', paddingRight: '12px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#22c55e' }}>Entradas</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#22c55e' }}>{formatCurrency(data.finance.entradas)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', paddingLeft: '12px', paddingRight: '12px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444' }}>Despesas</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#ef4444' }}>{formatCurrency(data.finance.despesas)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', backgroundColor: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', paddingLeft: '12px', paddingRight: '12px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>Saldo</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>{formatCurrency(data.finance.saldo)}</span>
                </div>
                
                {/* GRÁFICO 2: Valores por mês */}
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '16px', textAlign: 'center' }}>VALORES POR MÊS</h4>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '140px', gap: '4px' }}>
                    {data.financialStats.map((ms, i) => {
                      const maxVal = Math.max(...data.financialStats.map(s => Math.max(s.entradas, s.despesas, s.saldo))) || 1;
                      const hEnt = (ms.entradas / maxVal) * 100;
                      const hDesp = (ms.despesas / maxVal) * 100;
                      const hSal = (Math.max(0, ms.saldo) / maxVal) * 100;
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '110px', width: '100%', justifyContent: 'center' }}>
                            <div style={{ width: '30%', height: `${hEnt}%`, backgroundColor: '#22c55e', borderRadius: '3px 3px 0 0' }}></div>
                            <div style={{ width: '30%', height: `${hDesp}%`, backgroundColor: '#ef4444', borderRadius: '3px 3px 0 0' }}></div>
                            <div style={{ width: '30%', height: `${hSal}%`, backgroundColor: '#38bdf8', borderRadius: '3px 3px 0 0' }}></div>
                          </div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{MONTHS.find(m => m.value === ms.month.split('-')[1])?.label.slice(0,3)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '2px' }}/> <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Entradas</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '2px' }}/> <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Despesas</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', backgroundColor: '#38bdf8', borderRadius: '2px' }}/> <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Saldo</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. JOGADORES TOP 3 */}
          <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsJogadoresOpen(!isJogadoresOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>JOGADORES</span>
                {!isJogadoresOpen && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Top 3 Artilheiros, Assistentes e Campeões
                  </span>
                )}
              </div>
              <ChevronDown size={20} style={{ transform: isJogadoresOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
            </div>
            
            {isJogadoresOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Artilheiros</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[...data.rankingList].sort((a,b)=>b.goals-a.goals).slice(0,3).filter(p=>p.goals>0).map((p,i) => (
                      <div key={'a'+p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff', padding: '4px 0' }}>
                        <span><strong style={{color: i===0?'#fbbf24':'var(--text-muted)'}}>{i+1}º</strong> {p.name}</span>
                        <strong>{p.goals} gols</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Assistentes</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[...data.rankingList].sort((a,b)=>b.assists-a.assists).slice(0,3).filter(p=>p.assists>0).map((p,i) => (
                      <div key={'as'+p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff', padding: '4px 0' }}>
                        <span><strong style={{color: i===0?'#fbbf24':'var(--text-muted)'}}>{i+1}º</strong> {p.name}</span>
                        <strong>{p.assists} asts</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Mais Campeões</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[...data.rankingList].sort((a,b)=>b.champ-a.champ).slice(0,3).filter(p=>p.champ>0).map((p,i) => (
                      <div key={'c'+p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff', padding: '4px 0' }}>
                        <span><strong style={{color: i===0?'#fbbf24':'var(--text-muted)'}}>{i+1}º</strong> {p.name}</span>
                        <strong>{p.champ} títulos</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => {setIsJogadoresOpen(false); setIsRankingOpen(true);}} style={{ marginTop: '8px', padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 700 }}>Ver Ranking Completo</button>
              </div>
            )}
          </div>

          {/* 6. PARTIDAS */}
          <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsPartidasOpen(!isPartidasOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>PARTIDAS</span>
                {!isPartidasOpen && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {data.summary.matches} partidas • Última {data.matchesList[0] ? data.matchesList[0].match_date.split('-').reverse().join('/') : '—'}
                  </span>
                )}
              </div>
              <ChevronDown size={20} style={{ transform: isPartidasOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
            </div>
            
            {isPartidasOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Partidas realizadas</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>{data.summary.matches}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Partida com mais gols</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>
                      {Math.max(...data.matchesList.map(m => (m.team_1_score||0)+(m.team_2_score||0) || m.match_player_stats?.reduce((s:any,c:any)=>s+(c.goals||0),0) || 0), 0)} gols
                    </span>
                  </div>
                </div>
                {data.matchesList.slice(0, 5).map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{m.match_date.split('-').reverse().join('/')}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{(m.team_1_score||0)+(m.team_2_score||0) || m.match_player_stats?.reduce((s:any,c:any)=>s+(c.goals||0),0) || 0} gols</span>
                  </div>
                ))}
                {data.matchesList.length > 5 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>Exibindo as 5 mais recentes</span>}
              </div>
            )}
          </div>

          {/* 7. DESTAQUES DO PERÍODO */}
          <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsDestaquesOpen(!isDestaquesOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>DESTAQUES DO PERÍODO</span>
                {!isDestaquesOpen && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Art: {data.destaques.artilheiro?.name || '-'} • Ast: {data.destaques.assistente?.name || '-'}
                  </span>
                )}
              </div>
              <ChevronDown size={20} style={{ transform: isDestaquesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
            </div>
            
            {isDestaquesOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Artilheiro', player: data.destaques.artilheiro, val: data.destaques.artilheiro?.goals + ' gols', icon: <Flame size={14} color="#f97316" /> },
                  { label: 'Líder de Assistências', player: data.destaques.assistente, val: data.destaques.assistente?.assists + ' asts', icon: <Star size={14} color="#fbbf24" /> },
                  { label: 'Mais Campeão', player: data.destaques.campeao, val: data.destaques.campeao?.champ + ' vezes', icon: <Trophy size={14} color="#fbbf24" /> },
                  { label: 'Mais Ralabosta', player: data.destaques.ralabosta, val: data.destaques.ralabosta?.rala + ' vezes', icon: <span style={{fontSize:'12px'}}>💩</span> }
                ].map((d, i) => (
                  <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {d.icon}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{d.label}</span>
                    </div>
                    {d.player && d.player[Object.keys(d.player).find(k => ['goals','assists','champ','rala'].includes(k)) as string] > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {d.player.photo ? (
                          <img src={d.player.photo} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={14} color="#666" />
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px' }}>{d.player.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{d.val}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 8. COMPARAÇÃO */}
          <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsComparacaoOpen(!isComparacaoOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>COMPARAÇÃO</span>
                {!isComparacaoOpen && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Com o período anterior
                  </span>
                )}
              </div>
              <ChevronDown size={20} style={{ transform: isComparacaoOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
            </div>
            
            {isComparacaoOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.comparison ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Gols</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: data.comparison.goalsDiff > 0 ? '#22c55e' : data.comparison.goalsDiff < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        {data.comparison.goalsDiff > 0 ? <ArrowUp size={14}/> : data.comparison.goalsDiff < 0 ? <ArrowDown size={14}/> : <Minus size={14}/>}
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{Math.abs(data.comparison.goalsDiff)} gols</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assistências</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: data.comparison.assistsDiff > 0 ? '#22c55e' : data.comparison.assistsDiff < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        {data.comparison.assistsDiff > 0 ? <ArrowUp size={14}/> : data.comparison.assistsDiff < 0 ? <ArrowDown size={14}/> : <Minus size={14}/>}
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{Math.abs(data.comparison.assistsDiff)} asts</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Entradas</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: data.comparison.entradasDiff > 0 ? '#22c55e' : data.comparison.entradasDiff < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        {data.comparison.entradasDiff > 0 ? <ArrowUp size={14}/> : data.comparison.entradasDiff < 0 ? <ArrowDown size={14}/> : <Minus size={14}/>}
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{formatCurrency(Math.abs(data.comparison.entradasDiff))}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Despesas</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: data.comparison.despesasDiff < 0 ? '#22c55e' : data.comparison.despesasDiff > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        {data.comparison.despesasDiff > 0 ? <ArrowUp size={14}/> : data.comparison.despesasDiff < 0 ? <ArrowDown size={14}/> : <Minus size={14}/>}
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{formatCurrency(Math.abs(data.comparison.despesasDiff))}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sem dados suficientes para comparação.</span>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
