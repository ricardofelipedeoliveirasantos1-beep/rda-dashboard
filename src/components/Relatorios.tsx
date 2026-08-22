import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart2, ChevronDown, User, Trophy, 
  AlertCircle, Loader2, Flame, Star, ArrowUp, ArrowDown, Minus, RefreshCw
} from 'lucide-react';

// === INTERFACES ===
interface PlayerSummary {
  id: string;
  name: string;
  photo_url: string | null;
  category: string;
  games: number;
  goals: number;
  assists: number;
  champion: number;
  vice: number;
  ralabosta: number;
  yellow_cards: number;
  blue_cards: number;
  red_cards: number;
}

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
  rankingList: PlayerSummary[];
  matchesList: any[];
  destaques: {
    artilheiro: PlayerSummary | null;
    assistente: PlayerSummary | null;
    campeao: PlayerSummary | null;
    ralabosta: PlayerSummary | null;
  };
  monthlyStats: { month: string; goals: number; assists: number }[];
  financialStats: { month: string; entradas: number; despesas: number; saldo: number }[];
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

const YEARS = [
  { value: '2024', label: '2024' },
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028', label: '2028' },
  { value: '2029', label: '2029' },
  { value: '2030', label: '2030' }
];

const PERIOD_OPTIONS = [
  { value: 'month', label: 'Mensal' },
  { value: 'semestre1', label: '1º Semestre' },
  { value: 'semestre2', label: '2º Semestre' },
  { value: 'year', label: 'Anual' }
];

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// === CUSTOM DARK DROPDOWN COMPONENT ===
interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  style?: React.CSSProperties;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, placeholder, style }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('pointerdown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1, minWidth: 0, ...style }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: '#171717',
          border: '1.5px solid rgba(255,255,255,0.08)',
          borderRadius: '10px',
          color: selectedOption ? '#ffffff' : 'var(--text-secondary)',
          fontSize: '0.85rem',
          fontWeight: 600,
          textAlign: 'left',
          cursor: 'pointer',
          gap: '8px'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : (placeholder || 'Selecione...')}
        </span>
        <ChevronDown size={16} style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '100%',
            minWidth: '180px',
            backgroundColor: '#1c1c1c',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.85)',
            zIndex: 200,
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px'
          }}
        >
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: '38px',
                  padding: '8px 12px',
                  backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: isSelected ? '#a5b4fc' : '#f3f4f6',
                  fontSize: '0.88rem',
                  fontWeight: isSelected ? 700 : 500,
                  lineHeight: '1.3',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

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

  // Ranking filters
  const [rankingCategory, setRankingCategory] = useState<'goals' | 'assists' | 'champ' | 'rala'>('goals');
  const [rankingPlayerId, setRankingPlayerId] = useState<string>('all');
  
  // Exibir Label de periodo
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

  // Helper para carregar os dados de um período de forma simples e segura
  const fetchPeriodStats = async (startDate: string, endDate: string) => {
    // 1. Buscar partidas finalizadas do período
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('id, match_date, match_time, status, daily_total, champion_team, runner_up_team, source')
      .eq('status', 'finished')
      .gte('match_date', startDate)
      .lt('match_date', endDate)
      .order('match_date', { ascending: true })
      .order('match_time', { ascending: true });

    if (matchesError) {
      throw matchesError;
    }

    const matches = matchesData || [];
    const matchIds = matches.map(m => m.id);

    let stats: any[] = [];
    let matchPlayers: any[] = [];
    let playersMap: Record<string, any> = {};

    if (matchIds.length > 0) {
      // 2. Buscar estatísticas dos jogadores nas partidas
      const { data: statsData, error: statsError } = await supabase
        .from('match_player_stats')
        .select('match_id, player_id, goals, assists, yellow_cards, blue_cards, red_cards, is_champion, is_runner_up, is_ralabosta')
        .in('match_id', matchIds);

      if (statsError) throw statsError;
      stats = statsData || [];

      // 3. Buscar vínculos dos jogadores com as partidas
      const { data: mpData, error: mpError } = await supabase
        .from('match_players')
        .select('match_id, player_id, team, category_at_match, daily_fee_at_match')
        .in('match_id', matchIds);

      if (mpError) throw mpError;
      matchPlayers = mpData || [];

      // 4. Buscar nomes e fotos dos jogadores envolvidos
      const playerIds = Array.from(new Set(matchPlayers.map(mp => mp.player_id).filter(Boolean)));
      if (playerIds.length > 0) {
        const { data: pData, error: pError } = await supabase
          .from('players')
          .select('id, name, photo_url, category')
          .in('id', playerIds);

        if (pError) throw pError;
        (pData || []).forEach(p => {
          playersMap[p.id] = p;
        });
      }
    }

    // 5. Buscar mensalidades pagas dos meses correspondentes
    const monthPrefixes: string[] = [];
    const dIt = new Date(startDate + 'T00:00:00');
    const dEnd = new Date(endDate + 'T00:00:00');
    while (dIt < dEnd) {
      monthPrefixes.push(`${dIt.getFullYear()}-${String(dIt.getMonth() + 1).padStart(2, '0')}`);
      dIt.setMonth(dIt.getMonth() + 1);
    }

    let payments: any[] = [];
    if (monthPrefixes.length > 0) {
      const { data: payData, error: payError } = await supabase
        .from('monthly_payments')
        .select('id, payment_month, amount, status')
        .in('payment_month', monthPrefixes);

      if (payError) throw payError;
      payments = payData || [];
    }

    // 6. Buscar despesas do período
    const { data: expData, error: expError } = await supabase
      .from('expenses')
      .select('id, amount, expense_date, category, description')
      .gte('expense_date', startDate)
      .lt('expense_date', endDate);

    if (expError) throw expError;
    const expenses = expData || [];

    // --- AGREGAÇÃO E CÁLCULO DAS ESTATÍSTICAS ---
    let playersSet = new Set<string>();
    let tGoals = 0, tAssists = 0, tYellow = 0, tBlue = 0, tRed = 0;
    let tChamp = 0, tVice = 0, tRala = 0;
    let totalDiaristas = 0;

    const playerStatsMap: Record<string, PlayerSummary> = {};

    matches.forEach(match => {
      totalDiaristas += Number(match.daily_total || 0);
      const isHistorical = match.source === 'historical_manual' || match.source === 'historical_import';

      const mPlayers = matchPlayers.filter(mp => mp.match_id === match.id);

      mPlayers.forEach(mp => {
        const pId = mp.player_id;
        if (!pId) return;
        playersSet.add(pId);
        const playerInfo = playersMap[pId] || { name: 'Desconhecido', photo_url: null, category: mp.category_at_match };

        if (!playerStatsMap[pId]) {
          playerStatsMap[pId] = {
            id: pId,
            name: playerInfo.name,
            photo_url: playerInfo.photo_url,
            category: mp.category_at_match || playerInfo.category,
            games: 0,
            goals: 0,
            assists: 0,
            champion: 0,
            vice: 0,
            ralabosta: 0,
            yellow_cards: 0,
            blue_cards: 0,
            red_cards: 0
          };
        }

        playerStatsMap[pId].games += 1;

        const pStat = stats.find(s => s.match_id === match.id && s.player_id === pId);

        if (pStat) {
          playerStatsMap[pId].goals += (pStat.goals || 0);
          playerStatsMap[pId].assists += (pStat.assists || 0);
          playerStatsMap[pId].yellow_cards += (pStat.yellow_cards || 0);
          playerStatsMap[pId].blue_cards += (pStat.blue_cards || 0);
          playerStatsMap[pId].red_cards += (pStat.red_cards || 0);

          tGoals += (pStat.goals || 0);
          tAssists += (pStat.assists || 0);
          tYellow += (pStat.yellow_cards || 0);
          tBlue += (pStat.blue_cards || 0);
          tRed += (pStat.red_cards || 0);
        }

        let isChamp = false;
        let isVice = false;
        let isRala = false;

        if (isHistorical) {
          isChamp = pStat?.is_champion || false;
          isVice = pStat?.is_runner_up || false;
          isRala = pStat?.is_ralabosta || false;
        } else {
          isChamp = !!(match.champion_team && match.champion_team === mp.team);
          isVice = !!(match.runner_up_team && match.runner_up_team === mp.team);
          isRala = pStat?.is_ralabosta || false;
        }

        if (isChamp) { playerStatsMap[pId].champion += 1; tChamp += 1; }
        if (isVice) { playerStatsMap[pId].vice += 1; tVice += 1; }
        if (isRala) { playerStatsMap[pId].ralabosta += 1; tRala += 1; }
      });
    });

    const rankingList = Object.values(playerStatsMap);

    const mensalidadesTotal = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const despesasTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const entradasTotal = mensalidadesTotal + totalDiaristas;
    const saldoTotal = entradasTotal - despesasTotal;

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
        entradas: entradasTotal,
        mensalidades: mensalidadesTotal,
        diaristas: totalDiaristas,
        despesas: despesasTotal,
        saldo: saldoTotal
      },
      rankingList,
      matches,
      stats,
      payments,
      expenses
    };
  };

  const buildMonthlyStats = (matches: any[], stats: any[], startDate: string, type: string) => {
    const monthlyMap: Record<string, { month: string; goals: number; assists: number }> = {};

    matches.forEach(m => {
      const mPrefix = m.match_date.slice(0, 7);
      if (!monthlyMap[mPrefix]) monthlyMap[mPrefix] = { month: mPrefix, goals: 0, assists: 0 };

      const matchStats = stats.filter(s => s.match_id === m.id);
      const mGoals = matchStats.reduce((sum, s) => sum + (s.goals || 0), 0);
      const mAssists = matchStats.reduce((sum, s) => sum + (s.assists || 0), 0);

      monthlyMap[mPrefix].goals += mGoals;
      monthlyMap[mPrefix].assists += mAssists;
    });

    const result = [];
    const dateIt = new Date(startDate + 'T00:00:00');
    const count = type === 'month' ? 1 : (type.includes('semestre') ? 6 : 12);

    for (let i = 0; i < count; i++) {
      const yyyy_mm = `${dateIt.getFullYear()}-${String(dateIt.getMonth() + 1).padStart(2, '0')}`;
      result.push(monthlyMap[yyyy_mm] || { month: yyyy_mm, goals: 0, assists: 0 });
      dateIt.setMonth(dateIt.getMonth() + 1);
    }
    return result;
  };

  const buildFinancialStats = (payments: any[], expenses: any[], matches: any[], startDate: string, type: string) => {
    const map: Record<string, { month: string; entradas: number; despesas: number; saldo: number }> = {};

    payments.forEach(p => {
      if (p.status !== 'paid') return;
      const m = p.payment_month;
      if (!map[m]) map[m] = { month: m, entradas: 0, despesas: 0, saldo: 0 };
      map[m].entradas += Number(p.amount || 0);
    });

    expenses.forEach(e => {
      const m = e.expense_date.slice(0, 7);
      if (!map[m]) map[m] = { month: m, entradas: 0, despesas: 0, saldo: 0 };
      map[m].despesas += Number(e.amount || 0);
    });

    matches.forEach(m => {
      const mPrefix = m.match_date.slice(0, 7);
      if (!map[mPrefix]) map[mPrefix] = { month: mPrefix, entradas: 0, despesas: 0, saldo: 0 };
      map[mPrefix].entradas += Number(m.daily_total || 0);
    });

    Object.keys(map).forEach(k => {
      map[k].saldo = map[k].entradas - map[k].despesas;
    });

    const result = [];
    const dateIt = new Date(startDate + 'T00:00:00');
    const count = type === 'month' ? 1 : (type.includes('semestre') ? 6 : 12);

    for (let i = 0; i < count; i++) {
      const yyyy_mm = `${dateIt.getFullYear()}-${String(dateIt.getMonth() + 1).padStart(2, '0')}`;
      result.push(map[yyyy_mm] || { month: yyyy_mm, entradas: 0, despesas: 0, saldo: 0 });
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

      // Carga do período atual
      const currentResult = await fetchPeriodStats(current.start, current.end);

      // Carga do período anterior para comparação (em bloco separado para não falhar o relatório principal)
      let prevResult: any = null;
      try {
        prevResult = await fetchPeriodStats(prev.start, prev.end);
      } catch (errPrev) {
        console.warn('Erro ao carregar dados do período anterior para comparação:', errPrev);
      }

      // Destaques do período
      const getTop = (field: keyof PlayerSummary) => {
        const sorted = [...currentResult.rankingList].sort((a, b) => (Number(b[field]) || 0) - (Number(a[field]) || 0));
        return (sorted[0] && (Number(sorted[0][field]) || 0) > 0) ? sorted[0] : null;
      };

      const comp = prevResult ? {
        goalsDiff: currentResult.summary.goals - prevResult.summary.goals,
        assistsDiff: currentResult.summary.assists - prevResult.summary.assists,
        entradasDiff: currentResult.finance.entradas - prevResult.finance.entradas,
        despesasDiff: currentResult.finance.despesas - prevResult.finance.despesas
      } : null;

      setData({
        summary: currentResult.summary,
        finance: currentResult.finance,
        rankingList: currentResult.rankingList,
        matchesList: currentResult.matches,
        destaques: {
          artilheiro: getTop('goals'),
          assistente: getTop('assists'),
          campeao: getTop('champion'),
          ralabosta: getTop('ralabosta')
        },
        monthlyStats: buildMonthlyStats(currentResult.matches, currentResult.stats, current.start, filterType),
        financialStats: buildFinancialStats(currentResult.payments, currentResult.expenses, currentResult.matches, current.start, filterType),
        comparison: comp
      });

      // Reset ranking player filter to 'all' if selected player not in current list
      setRankingPlayerId('all');

    } catch (err: any) {
      console.error('Erro detalhado ao gerar relatório:', err);
      const errorMsg = err?.message || 'Erro ao carregar dados do Supabase.';
      setError(`Não foi possível carregar o relatório: ${errorMsg}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line
  }, []);

  // --- RENDER COMPUTED ---
  const activeRanking = useMemo(() => {
    if (!data) return [];
    return [...data.rankingList].sort((a, b) => {
      if (rankingCategory === 'goals') return b.goals - a.goals || a.name.localeCompare(b.name);
      if (rankingCategory === 'assists') return b.assists - a.assists || a.name.localeCompare(b.name);
      if (rankingCategory === 'champ') return b.champion - a.champion || a.name.localeCompare(b.name);
      if (rankingCategory === 'rala') return b.ralabosta - a.ralabosta || a.name.localeCompare(b.name);
      return 0;
    });
  }, [data, rankingCategory]);

  const activePlayer = useMemo(() => {
    if (!data || rankingPlayerId === 'all') return null;
    return data.rankingList.find(p => p.id === rankingPlayerId) || null;
  }, [data, rankingPlayerId]);

  const getPos = (pId: string, cat: keyof PlayerSummary) => {
    if (!data) return 0;
    const sorted = [...data.rankingList].sort((a, b) => (Number(b[cat]) || 0) - (Number(a[cat]) || 0));
    return sorted.findIndex(p => p.id === pId) + 1;
  };

  // Dropdown player options
  const playerDropdownOptions = useMemo(() => {
    const base = [{ value: 'all', label: 'Todos os jogadores' }];
    if (!data) return base;
    const playersSorted = [...data.rankingList].sort((a, b) => a.name.localeCompare(b.name));
    return base.concat(playersSorted.map(p => ({ value: p.id, label: p.name })));
  }, [data]);

  const CATEGORY_OPTIONS = [
    { value: 'goals', label: 'Artilheiro' },
    { value: 'assists', label: 'Assistências' },
    { value: 'champ', label: 'Maior Campeão' },
    { value: 'rala', label: 'Ralabosta' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', paddingBottom: '20px' }}>
      
      {/* HEADER */}
      <div style={{ padding: '0 4px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #a3a3a3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Relatórios
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Acompanhe os resultados do RDA.
        </p>
      </div>

      {/* FILTER CARD */}
      <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="card-title" style={{ fontSize: '0.9rem' }}>PERÍODO</span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
          <CustomSelect
            value={filterType}
            onChange={(val) => setFilterType(val as any)}
            options={PERIOD_OPTIONS}
            style={{ flex: 1.2 }}
          />

          {filterType === 'month' && (
            <CustomSelect
              value={selectedMonth}
              onChange={(val) => setSelectedMonth(val)}
              options={MONTHS}
              style={{ flex: 1.4 }}
            />
          )}

          <CustomSelect
            value={selectedYear}
            onChange={(val) => setSelectedYear(val)}
            options={YEARS}
            style={{ flex: 1 }}
          />
        </div>

        <button 
          onClick={handleGenerate}
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '12px', 
            borderRadius: '10px', 
            backgroundColor: '#4f46e5', 
            color: '#fff', 
            fontWeight: 700, 
            border: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? <Loader2 size={18} className="spinner" /> : <BarChart2 size={18} />}
          {loading ? 'Processando...' : 'Gerar Relatório'}
        </button>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px', 
          padding: '16px', 
          borderRadius: '12px', 
          backgroundColor: 'rgba(239,68,68,0.12)', 
          border: '1.5px solid rgba(239,68,68,0.3)', 
          color: '#f87171'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
          <button
            onClick={handleGenerate}
            style={{
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} />
            Tentar novamente
          </button>
        </div>
      )}

      {/* EMPTY STATE */}
      {data && !loading && !error && data.summary.matches === 0 && (
        <div className="dashboard-card" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 12px auto', color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Nenhum dado encontrado para este período</h3>
          <p style={{ fontSize: '0.85rem', margin: 0 }}>Não foram encontradas partidas finalizadas em {getPeriodLabel()}.</p>
        </div>
      )}

      {/* SUCCESS STATE */}
      {data && !loading && !error && data.summary.matches > 0 && (
        <>
          {/* RESUMO DO SEMESTRE (PILL) */}
          {(filterType === 'semestre1' || filterType === 'semestre2') && (
            <div style={{ backgroundColor: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', padding: '14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>Resumo do Semestre</span>
              <p style={{ fontSize: '0.85rem', color: '#fff', margin: 0, lineHeight: 1.5 }}>
                {data.summary.matches} partidas • {data.summary.goals} gols • {data.summary.assists} assistências<br/>
                {formatCurrency(data.finance.entradas)} de entradas • {formatCurrency(data.finance.despesas)} de despesas<br/>
                <strong style={{ color: data.finance.saldo >= 0 ? '#22c55e' : '#ef4444' }}>
                  {formatCurrency(data.finance.saldo)} de saldo
                </strong>
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
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cartões <span style={{ color: '#fbbf24' }}>Amarelos</span></span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.yellow}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cartões <span style={{ color: '#3b82f6' }}>Azuis</span></span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.blue}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cartões <span style={{ color: '#ef4444' }}>Vermelhos</span></span>
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
                    {data.summary.goals} gols • {data.summary.assists} assistências • Média {(data.summary.goals / (data.summary.matches || 1)).toFixed(1).replace('.', ',')} gols/jogo
                  </span>
                )}
              </div>
              <ChevronDown size={20} style={{ transform: isDesempenhoOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
            </div>
            
            {isDesempenhoOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Média de gols por partida</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{(data.summary.goals / (data.summary.matches || 1)).toFixed(1).replace('.', ',')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Média de assist. por partida</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{(data.summary.assists / (data.summary.matches || 1)).toFixed(1).replace('.', ',')}</span>
                </div>
                
                {/* GRÁFICO 1: Gols x Assistências */}
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '16px', textAlign: 'center' }}>GOLS X ASSISTÊNCIAS</h4>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '120px', gap: '4px' }}>
                    {data.monthlyStats.map((ms, i) => {
                      const maxVal = Math.max(...data.monthlyStats.map(s => Math.max(s.goals, s.assists))) || 1;
                      const hGols = (ms.goals / maxVal) * 100;
                      const hAsts = (ms.assists / maxVal) * 100;
                      const mNumber = ms.month.split('-')[1];
                      const mLabel = MONTHS.find(m => m.value === mNumber)?.label.slice(0, 3) || mNumber;
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '100px', width: '100%', justifyContent: 'center' }}>
                            <div style={{ width: '40%', height: `${hGols}%`, backgroundColor: '#38bdf8', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                              {ms.goals > 0 && <span style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', color: '#fff', fontWeight: 700 }}>{ms.goals}</span>}
                            </div>
                            <div style={{ width: '40%', height: `${hAsts}%`, backgroundColor: '#fbbf24', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                              {ms.assists > 0 && <span style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', color: '#fff', fontWeight: 700 }}>{ms.assists}</span>}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{mLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', backgroundColor: '#38bdf8', borderRadius: '2px' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Gols</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', backgroundColor: '#fbbf24', borderRadius: '2px' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assistências</span>
                    </div>
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
                {!isRankingOpen && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Art: {data.destaques.artilheiro?.name || '—'} • Ast: {data.destaques.assistente?.name || '—'}
                  </span>
                )}
              </div>
              <ChevronDown size={20} style={{ transform: isRankingOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
            </div>
            
            {isRankingOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CustomSelect
                    value={rankingCategory}
                    onChange={(val) => { setRankingCategory(val as any); setRankingPlayerId('all'); }}
                    options={CATEGORY_OPTIONS}
                    style={{ flex: 1 }}
                  />
                  <CustomSelect
                    value={rankingPlayerId}
                    onChange={(val) => setRankingPlayerId(val)}
                    options={playerDropdownOptions}
                    style={{ flex: 1.3 }}
                  />
                </div>

                {activePlayer ? (
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', marginTop: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      {activePlayer.photo_url ? (
                        <img src={activePlayer.photo_url} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff' }}><span>Jogos:</span> <strong>{activePlayer.games}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff' }}><span>Gols:</span> <strong>{activePlayer.goals}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff' }}><span>Assist.:</span> <strong>{activePlayer.assists}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff' }}><span>Campeão:</span> <strong>{activePlayer.champion}x</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff' }}><span>Ralabosta:</span> <strong>{activePlayer.ralabosta}x</strong></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Artilheiro: <strong style={{ color: '#fff' }}>{getPos(activePlayer.id, 'goals')}º</strong></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assistências: <strong style={{ color: '#fff' }}>{getPos(activePlayer.id, 'assists')}º</strong></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Maior Campeão: <strong style={{ color: '#fff' }}>{getPos(activePlayer.id, 'champion')}º</strong></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ralabosta: <strong style={{ color: '#fff' }}>{activePlayer.ralabosta > 0 ? getPos(activePlayer.id, 'ralabosta') + 'º' : '—'}</strong></div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {activeRanking.filter(p => {
                      if (rankingCategory === 'goals') return p.goals > 0;
                      if (rankingCategory === 'assists') return p.assists > 0;
                      if (rankingCategory === 'champ') return p.champion > 0;
                      if (rankingCategory === 'rala') return p.ralabosta > 0;
                      return false;
                    }).map((p, i) => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ fontWeight: 800, color: i < 3 ? '#fbbf24' : 'var(--text-muted)', width: '24px' }}>{i + 1}º</span>
                        {p.photo_url ? (
                          <img src={p.photo_url} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={16} color="#666" />
                          </div>
                        )}
                        <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{p.name}</span>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8' }}>
                          {rankingCategory === 'goals' && `${p.goals} gols`}
                          {rankingCategory === 'assists' && `${p.assists} asts`}
                          {rankingCategory === 'champ' && `${p.champion} títulos`}
                          {rankingCategory === 'rala' && `${p.ralabosta} vezes`}
                        </div>
                      </div>
                    ))}
                    {activeRanking.filter(p => {
                      if (rankingCategory === 'goals') return p.goals > 0;
                      if (rankingCategory === 'assists') return p.assists > 0;
                      if (rankingCategory === 'champ') return p.champion > 0;
                      if (rankingCategory === 'rala') return p.ralabosta > 0;
                      return false;
                    }).length === 0 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '8px 0', textAlign: 'center' }}>
                        Nenhum dado encontrado no período para esta categoria.
                      </span>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#22c55e' }}>Entradas</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#22c55e' }}>{formatCurrency(data.finance.entradas)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444' }}>Despesas</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#ef4444' }}>{formatCurrency(data.finance.despesas)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>Saldo</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>{formatCurrency(data.finance.saldo)}</span>
                </div>
                
                {/* GRÁFICO 2: Valores por mês */}
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '16px', textAlign: 'center' }}>VALORES POR MÊS</h4>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '140px', gap: '4px' }}>
                    {data.financialStats.map((ms, i) => {
                      const maxVal = Math.max(...data.financialStats.map(s => Math.max(s.entradas, s.despesas, Math.abs(s.saldo)))) || 1;
                      const hEnt = (ms.entradas / maxVal) * 100;
                      const hDesp = (ms.despesas / maxVal) * 100;
                      const hSal = (Math.max(0, ms.saldo) / maxVal) * 100;
                      const mNumber = ms.month.split('-')[1];
                      const mLabel = MONTHS.find(m => m.value === mNumber)?.label.slice(0, 3) || mNumber;
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '110px', width: '100%', justifyContent: 'center' }}>
                            <div style={{ width: '30%', height: `${hEnt}%`, backgroundColor: '#22c55e', borderRadius: '3px 3px 0 0' }} />
                            <div style={{ width: '30%', height: `${hDesp}%`, backgroundColor: '#ef4444', borderRadius: '3px 3px 0 0' }} />
                            <div style={{ width: '30%', height: `${hSal}%`, backgroundColor: '#38bdf8', borderRadius: '3px 3px 0 0' }} />
                          </div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{mLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '2px' }} />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Entradas</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '2px' }} />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Despesas</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', backgroundColor: '#38bdf8', borderRadius: '2px' }} />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Saldo</span>
                    </div>
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
                    {[...data.rankingList].sort((a, b) => b.goals - a.goals).slice(0, 3).filter(p => p.goals > 0).map((p, i) => (
                      <div key={'a' + p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff', padding: '4px 0' }}>
                        <span><strong style={{ color: i === 0 ? '#fbbf24' : 'var(--text-muted)' }}>{i + 1}º</strong> {p.name}</span>
                        <strong>{p.goals} gols</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Assistentes</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[...data.rankingList].sort((a, b) => b.assists - a.assists).slice(0, 3).filter(p => p.assists > 0).map((p, i) => (
                      <div key={'as' + p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff', padding: '4px 0' }}>
                        <span><strong style={{ color: i === 0 ? '#fbbf24' : 'var(--text-muted)' }}>{i + 1}º</strong> {p.name}</span>
                        <strong>{p.assists} asts</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Mais Campeões</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[...data.rankingList].sort((a, b) => b.champion - a.champion).slice(0, 3).filter(p => p.champion > 0).map((p, i) => (
                      <div key={'c' + p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff', padding: '4px 0' }}>
                        <span><strong style={{ color: i === 0 ? '#fbbf24' : 'var(--text-muted)' }}>{i + 1}º</strong> {p.name}</span>
                        <strong>{p.champion} títulos</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => { setIsJogadoresOpen(false); setIsRankingOpen(true); }} 
                  style={{ marginTop: '8px', padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Ver Ranking Completo
                </button>
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
                    {data.summary.matches} partidas • Última {data.matchesList[data.matchesList.length - 1] ? data.matchesList[data.matchesList.length - 1].match_date.split('-').reverse().join('/') : '—'}
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
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total de gols</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>{data.summary.goals} gols</span>
                  </div>
                </div>
                {data.matchesList.slice().reverse().slice(0, 5).map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{m.match_date.split('-').reverse().join('/')}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {m.champion_team ? `Campeão: ${m.champion_team.toUpperCase()}` : (m.daily_total ? formatCurrency(m.daily_total) : 'Finalizada')}
                    </span>
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
                    Art: {data.destaques.artilheiro?.name || '—'} • Ast: {data.destaques.assistente?.name || '—'}
                  </span>
                )}
              </div>
              <ChevronDown size={20} style={{ transform: isDestaquesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
            </div>
            
            {isDestaquesOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Artilheiro', player: data.destaques.artilheiro, val: (data.destaques.artilheiro?.goals || 0) + ' gols', icon: <Flame size={14} color="#f97316" /> },
                  { label: 'Líder de Assistências', player: data.destaques.assistente, val: (data.destaques.assistente?.assists || 0) + ' asts', icon: <Star size={14} color="#fbbf24" /> },
                  { label: 'Mais Campeão', player: data.destaques.campeao, val: (data.destaques.campeao?.champion || 0) + ' vezes', icon: <Trophy size={14} color="#fbbf24" /> },
                  { label: 'Mais Ralabosta', player: data.destaques.ralabosta, val: (data.destaques.ralabosta?.ralabosta || 0) + ' vezes', icon: <span style={{ fontSize: '12px' }}>💩</span> }
                ].map((d, i) => (
                  <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {d.icon}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{d.label}</span>
                    </div>
                    {d.player ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {d.player.photo_url ? (
                          <img src={d.player.photo_url} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={14} color="#666" />
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.player.name}</span>
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
                        {data.comparison.goalsDiff > 0 ? <ArrowUp size={14} /> : data.comparison.goalsDiff < 0 ? <ArrowDown size={14} /> : <Minus size={14} />}
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{Math.abs(data.comparison.goalsDiff)} gols</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assistências</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: data.comparison.assistsDiff > 0 ? '#22c55e' : data.comparison.assistsDiff < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        {data.comparison.assistsDiff > 0 ? <ArrowUp size={14} /> : data.comparison.assistsDiff < 0 ? <ArrowDown size={14} /> : <Minus size={14} />}
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{Math.abs(data.comparison.assistsDiff)} asts</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Entradas</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: data.comparison.entradasDiff > 0 ? '#22c55e' : data.comparison.entradasDiff < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        {data.comparison.entradasDiff > 0 ? <ArrowUp size={14} /> : data.comparison.entradasDiff < 0 ? <ArrowDown size={14} /> : <Minus size={14} />}
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{formatCurrency(Math.abs(data.comparison.entradasDiff))}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Despesas</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: data.comparison.despesasDiff < 0 ? '#22c55e' : data.comparison.despesasDiff > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        {data.comparison.despesasDiff > 0 ? <ArrowUp size={14} /> : data.comparison.despesasDiff < 0 ? <ArrowDown size={14} /> : <Minus size={14} />}
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
