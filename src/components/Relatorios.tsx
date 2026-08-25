import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart2, ChevronDown, User, Trophy, 
  AlertCircle, Loader2, Flame, Star, RefreshCw
} from 'lucide-react';

// === INTERFACES ===
export interface PlayerSummary {
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

export interface RankedPlayer {
  rank: number;
  player: PlayerSummary;
  value: number;
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
  monthlyStats: { month: string; goals: number; assists: number }[];
  financialStats: { month: string; entradas: number; despesas: number; saldo: number }[];
  comparison: {
    type: 'mensal' | 'semestral' | 'nenhum';
    prevLabel: string;
    currLabel: string;
    isPartial?: boolean;
    isPrevPartial?: boolean;
    isCurrPartial?: boolean;
    goals: { prev: number; curr: number; diff: number; pct: number };
    assists: { prev: number; curr: number; diff: number; pct: number };
    champions: { prev: number; curr: number; diff: number; pct: number };
    ralabostas: { prev: number; curr: number; diff: number; pct: number };
    matches: { prev: number; curr: number; diff: number; pct: number };
  } | null;
  monthlyMap: Record<string, {
    month: string;
    summary: { matches: number; goals: number; assists: number; champions: number; vices: number; ralabosta: number; players: number; };
    rankingList: PlayerSummary[];
    matchesList: any[];
  }>;
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

const CATEGORY_OPTIONS = [
  { value: 'goals', label: 'Artilheiro' },
  { value: 'assists', label: 'Assistências' },
  { value: 'champion', label: 'Maior Campeão' },
  { value: 'ralabosta', label: 'Ralabosta' }
];

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const isSemesterPartial = (semName: '1º Semestre' | '2º Semestre', yearStr: string) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const year = parseInt(yearStr, 10);
  if (year > currentYear) return true;
  if (year < currentYear) return false;
  if (semName === '1º Semestre') {
    return currentMonth <= 6;
  } else {
    return currentMonth <= 12;
  }
};


// === CENTRAL DENSE RANKING ENGINE ===
export const getDenseRanking = (
  players: PlayerSummary[],
  metric: 'goals' | 'assists' | 'champion' | 'ralabosta'
): RankedPlayer[] => {
  // 1. Filtrar apenas jogadores com valor maior que zero
  const active = players.filter(p => (Number(p[metric]) || 0) > 0);

  // 2. Ordenar primariamente por valor desc, e secundariamente por nome asc para estabilidade
  active.sort((a, b) => {
    const diff = (Number(b[metric]) || 0) - (Number(a[metric]) || 0);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, 'pt-BR');
  });

  // 3. Calcular ranking denso (1º, 2º, 2º, 2º, 3º...)
  let currentRank = 0;
  let lastValue = -1;

  return active.map(p => {
    const val = Number(p[metric]) || 0;
    if (val !== lastValue) {
      currentRank += 1;
      lastValue = val;
    }
    return {
      rank: currentRank,
      player: p,
      value: val
    };
  });
};

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
            minWidth: '100%',
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

export default function Relatorios({ userRole, can: _can }: { userRole: 'admin' | 'assistant' | 'visitor' | 'treasurer'; can: (action: any) => boolean }) {
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
  const [isFinanceiroOpen] = useState(false);
  const [isJogadoresOpen, setIsJogadoresOpen] = useState(false);
  const [isPartidasOpen, setIsPartidasOpen] = useState(false);
  const [isDestaquesOpen, setIsDestaquesOpen] = useState(false);
  const [isDestaquesMesOpen, setIsDestaquesMesOpen] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [isComparacaoOpen, setIsComparacaoOpen] = useState(false);

  // Ranking filters
  const [rankingCategory, setRankingCategory] = useState<'goals' | 'assists' | 'champion' | 'ralabosta'>('goals');
  const [rankingPlayerId, setRankingPlayerId] = useState<string>('all');
  
  // Refs e states para os gráficos com scroll horizontal
  const chartScrollRef = useRef<HTMLDivElement | null>(null);
  const finChartScrollRef = useRef<HTMLDivElement | null>(null);
  const [showChartScrollIndicator, setShowChartScrollIndicator] = useState(false);
  // const [showFinChartScrollIndicator, setShowFinChartScrollIndicator] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (chartScrollRef.current) {
        const { scrollWidth, clientWidth } = chartScrollRef.current;
        setShowChartScrollIndicator(scrollWidth > clientWidth);
      }
      if (finChartScrollRef.current) {
        // const { scrollWidth, clientWidth } = finChartScrollRef.current;
        // setShowFinChartScrollIndicator(scrollWidth > clientWidth);
      }
    };
    
    const timer = setTimeout(checkScroll, 150);
    window.addEventListener('resize', checkScroll);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, [data, isDesempenhoOpen, isFinanceiroOpen]);
  
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

  // === FONTE ÚNICA DE AGREGAÇÃO POR JOGADOR ===
  const buildPeriodPlayerStats = ({
    matches,
    matchPlayers,
    matchPlayerStats,
    playersMap
  }: {
    matches: any[];
    matchPlayers: any[];
    matchPlayerStats: any[];
    playersMap: Record<string, any>;
  }) => {
    let playersSet = new Set<string>();
    let tGoals = 0, tAssists = 0, tYellow = 0, tBlue = 0, tRed = 0;
    let tChamp = 0, tVice = 0, tRala = 0;
    let totalDiaristas = 0;

    const playerMap: Record<string, PlayerSummary> = {};

    matches.forEach(match => {
      totalDiaristas += Number(match.daily_total || 0);

      // Deduplica participantes por partida
      const seenPlayersInMatch = new Set<string>();
      const mPlayers = matchPlayers.filter(mp => mp.match_id === match.id);

      mPlayers.forEach(mp => {
        const pId = mp.player_id;
        if (!pId || seenPlayersInMatch.has(pId)) return;
        seenPlayersInMatch.add(pId);
        playersSet.add(pId);

        const playerInfo = playersMap[pId] || { name: 'Desconhecido', photo_url: null, category: mp.category_at_match };

        if (!playerMap[pId]) {
          playerMap[pId] = {
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

        playerMap[pId].games += 1;

        // Estatísticas individuais dessa partida
        const pStat = matchPlayerStats.find(s => s.match_id === match.id && s.player_id === pId);

        if (pStat) {
          const goalsVal = Number(pStat.goals) || 0;
          const assistsVal = Number(pStat.assists) || 0;
          const yellowVal = Number(pStat.yellow_cards) || 0;
          const blueVal = Number(pStat.blue_cards) || 0;
          const redVal = Number(pStat.red_cards) || 0;

          playerMap[pId].goals += goalsVal;
          playerMap[pId].assists += assistsVal;
          playerMap[pId].yellow_cards += yellowVal;
          playerMap[pId].blue_cards += blueVal;
          playerMap[pId].red_cards += redVal;

          tGoals += goalsVal;
          tAssists += assistsVal;
          tYellow += yellowVal;
          tBlue += blueVal;
          tRed += redVal;
        }

        // O marcador oficial deve vir sempre de match_player_stats, independentemente
        // da fonte (historical ou app). Não inferir a partir de match.champion_team.
        const isChamp = pStat?.is_champion || false;
        const isVice = pStat?.is_runner_up || false;
        const isRala = (match.team_count === 3 || match.team_count === 4) ? (pStat?.is_ralabosta || false) : false;

        if (isChamp) { playerMap[pId].champion += 1; tChamp += 1; }
        if (isVice) { playerMap[pId].vice += 1; tVice += 1; }
        if (isRala) { playerMap[pId].ralabosta += 1; tRala += 1; }
      });
    });

    const rankingList = Object.values(playerMap);

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
      totalDiaristas,
      rankingList
    };
  };

  // Helper para carregar os dados de um período de forma simples e segura
  const fetchPeriodStats = async (startDate: string, endDate: string) => {
    // 1. Buscar partidas finalizadas do período (omite daily_total para visitantes)
    const matchesSelect = userRole === 'visitor'
      ? 'id, match_date, match_time, status, champion_team, runner_up_team, source, team_count'
      : 'id, match_date, match_time, status, daily_total, champion_team, runner_up_team, source, team_count';

    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select(matchesSelect)
      .eq('status', 'finished')
      .gte('match_date', startDate)
      .lt('match_date', endDate)
      .order('match_date', { ascending: true })
      .order('match_time', { ascending: true });

    if (matchesError) throw matchesError;

    const matches: any[] = (matchesData as any) || [];
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

      // 3. Buscar vínculos dos jogadores com as partidas (omite daily_fee_at_match para visitantes)
      const mpSelect = userRole === 'visitor'
        ? 'match_id, player_id, team, category_at_match'
        : 'match_id, player_id, team, category_at_match, daily_fee_at_match';

      const { data: mpData, error: mpError } = await supabase
        .from('match_players')
        .select(mpSelect)
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

    // 5. Buscar mensalidades pagas dos meses correspondentes (somente se não for visitante)
    const monthPrefixes: string[] = [];
    const dIt = new Date(startDate + 'T00:00:00');
    const dEnd = new Date(endDate + 'T00:00:00');
    while (dIt < dEnd) {
      monthPrefixes.push(`${dIt.getFullYear()}-${String(dIt.getMonth() + 1).padStart(2, '0')}`);
      dIt.setMonth(dIt.getMonth() + 1);
    }

    let payments: any[] = [];
    if (monthPrefixes.length > 0 && userRole !== 'visitor') {
      const { data: payData, error: payError } = await supabase
        .from('monthly_payments')
        .select('id, payment_month, amount, status')
        .in('payment_month', monthPrefixes);

      if (payError) throw payError;
      payments = payData || [];
    }

    // 6. Buscar despesas do período (somente se não for visitante)
    let expenses: any[] = [];
    if (userRole !== 'visitor') {
      const { data: expData, error: expError } = await supabase
        .from('expenses')
        .select('id, amount, expense_date, category, description')
        .gte('expense_date', startDate)
        .lt('expense_date', endDate);

      if (expError) throw expError;
      expenses = expData || [];
    }

    // --- AGREGAÇÃO UNIFICADA ---
    const aggregated = buildPeriodPlayerStats({
      matches,
      matchPlayers,
      matchPlayerStats: stats,
      playersMap
    });

    const mensalidadesTotal = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const despesasTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const entradasTotal = mensalidadesTotal + aggregated.totalDiaristas;
    const saldoTotal = entradasTotal - despesasTotal;

    return {
      summary: aggregated.summary,
      finance: {
        entradas: entradasTotal,
        mensalidades: mensalidadesTotal,
        diaristas: aggregated.totalDiaristas,
        despesas: despesasTotal,
        saldo: saldoTotal
      },
      rankingList: aggregated.rankingList,
      matches,
      stats,
      matchPlayers,
      playersMap,
      payments,
      expenses
    };
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseStart = `${parseInt(selectedYear) - 1}-12-01`;
      const baseEnd = `${parseInt(selectedYear) + 1}-01-01`;

      const fullData = await fetchPeriodStats(baseStart, baseEnd);

      const monthlyMap: Record<string, any> = {};
      const prevDec = `${parseInt(selectedYear) - 1}-12`;
      const monthsKeys = [prevDec];
      for (let i = 1; i <= 12; i++) {
        monthsKeys.push(`${selectedYear}-${String(i).padStart(2, '0')}`);
      }

      monthsKeys.forEach(m => {
        const mMatches = fullData.matches.filter(x => x.match_date.startsWith(m));
        const matchIds = new Set(mMatches.map(x => x.id));
        monthlyMap[m] = {
          month: m,
          ...buildPeriodPlayerStats({
            matches: mMatches,
            matchPlayers: fullData.matchPlayers.filter(x => matchIds.has(x.match_id)),
            matchPlayerStats: fullData.stats.filter(x => matchIds.has(x.match_id)),
            playersMap: fullData.playersMap
          }),
          matchesList: mMatches
        };
      });

      const current = getPeriodDates(filterType, selectedMonth, selectedYear, 0);
      const currMatches = fullData.matches.filter(x => x.match_date >= current.start && x.match_date < current.end);
      const currIds = new Set(currMatches.map(x => x.id));
      const currentResult = {
        ...buildPeriodPlayerStats({
          matches: currMatches,
          matchPlayers: fullData.matchPlayers.filter(x => currIds.has(x.match_id)),
          matchPlayerStats: fullData.stats.filter(x => currIds.has(x.match_id)),
          playersMap: fullData.playersMap
        }),
        matches: currMatches
      };

      const calcFinance = (start: string, end: string, diaristasTotal: number) => {
        const mPay = fullData.payments.filter(p => {
           const pDate = p.payment_month + '-01';
           return pDate >= start && pDate < end && p.status === 'paid';
        }).reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const exp = fullData.expenses.filter(e => e.expense_date >= start && e.expense_date < end)
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);
        return {
          entradas: mPay + diaristasTotal,
          mensalidades: mPay,
          diaristas: diaristasTotal,
          despesas: exp,
          saldo: (mPay + diaristasTotal) - exp
        };
      };

      const currentFinance = userRole === 'visitor'
        ? { entradas: 0, mensalidades: 0, diaristas: 0, despesas: 0, saldo: 0 }
        : calcFinance(current.start, current.end, currentResult.totalDiaristas);

      let comp = null;
      const calcPct = (c: number, p: number) => {
        if (p === 0 && c > 0) return Infinity; 
        if (p === 0 && c === 0) return 0;
        return ((c - p) / p) * 100;
      };

      const buildCompObj = (curr: any, prev: any, type: any, currLabel: string, prevLabel: string) => {
        if (!curr || !prev) return null;
        const isPrevPartial = type === 'semestral' ? isSemesterPartial('1º Semestre', selectedYear) : false;
        const isCurrPartial = type === 'semestral' ? isSemesterPartial('2º Semestre', selectedYear) : false;
        const isPartial = isPrevPartial || isCurrPartial;
        return {
          type, currLabel, prevLabel,
          isPartial,
          isPrevPartial,
          isCurrPartial,
          goals: { prev: prev.summary.goals, curr: curr.summary.goals, diff: curr.summary.goals - prev.summary.goals, pct: calcPct(curr.summary.goals, prev.summary.goals) },
          assists: { prev: prev.summary.assists, curr: curr.summary.assists, diff: curr.summary.assists - prev.summary.assists, pct: calcPct(curr.summary.assists, prev.summary.assists) },
          champions: { prev: prev.summary.champions, curr: curr.summary.champions, diff: curr.summary.champions - prev.summary.champions, pct: calcPct(curr.summary.champions, prev.summary.champions) },
          ralabostas: { prev: prev.summary.ralabosta, curr: curr.summary.ralabosta, diff: curr.summary.ralabosta - prev.summary.ralabosta, pct: calcPct(curr.summary.ralabosta, prev.summary.ralabosta) },
          matches: { prev: prev.summary.matches, curr: curr.summary.matches, diff: curr.summary.matches - prev.summary.matches, pct: calcPct(curr.summary.matches, prev.summary.matches) }
        };
      };

      if (filterType === 'month') {
        const currKey = `${selectedYear}-${selectedMonth}`;
        const prevKey = selectedMonth === '01' ? prevDec : `${selectedYear}-${String(parseInt(selectedMonth) - 1).padStart(2, '0')}`;
        const prevLabel = selectedMonth === '01' ? `Dezembro/${parseInt(selectedYear)-1}` : `${MONTHS.find(m => m.value === String(parseInt(selectedMonth) - 1).padStart(2, '0'))?.label}`;
        comp = buildCompObj(monthlyMap[currKey], monthlyMap[prevKey], 'mensal', MONTHS.find(m => m.value === selectedMonth)?.label || '', prevLabel);
      } else if (filterType === 'semestre1' || filterType === 'semestre2' || filterType === 'year') {
        const s1Start = `${selectedYear}-01-01`; const s1End = `${selectedYear}-07-01`;
        const s2Start = `${selectedYear}-07-01`; const s2End = `${parseInt(selectedYear)+1}-01-01`;
        
        const m1 = fullData.matches.filter(x => x.match_date >= s1Start && x.match_date < s1End);
        const m1Ids = new Set(m1.map(x => x.id));
        const sem1 = buildPeriodPlayerStats({ matches: m1, matchPlayers: fullData.matchPlayers.filter(x => m1Ids.has(x.match_id)), matchPlayerStats: fullData.stats.filter(x => m1Ids.has(x.match_id)), playersMap: fullData.playersMap });
        
        const m2 = fullData.matches.filter(x => x.match_date >= s2Start && x.match_date < s2End);
        const m2Ids = new Set(m2.map(x => x.id));
        const sem2 = buildPeriodPlayerStats({ matches: m2, matchPlayers: fullData.matchPlayers.filter(x => m2Ids.has(x.match_id)), matchPlayerStats: fullData.stats.filter(x => m2Ids.has(x.match_id)), playersMap: fullData.playersMap });

        comp = buildCompObj(sem2, sem1, 'semestral', '2º Semestre', '1º Semestre');
      }

      const monthlyStatsArr = [];
      const financialStatsArr = [];
      const iterateMonths = filterType === 'month' ? 1 : (filterType.includes('semestre') ? 6 : 12);
      const dIt = new Date(current.start + 'T00:00:00');
      for (let i = 0; i < iterateMonths; i++) {
        const mStr = `${dIt.getFullYear()}-${String(dIt.getMonth() + 1).padStart(2, '0')}`;
        const mapData = monthlyMap[mStr];
        monthlyStatsArr.push({ month: mStr, goals: mapData?.summary.goals || 0, assists: mapData?.summary.assists || 0 });
        
        const nextMonthDate = new Date(dIt.getFullYear(), dIt.getMonth() + 1, 1);
        const nextMStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
        const fDate = `${mStr}-01`;
        const fData = userRole === 'visitor'
          ? { entradas: 0, despesas: 0, saldo: 0 }
          : calcFinance(fDate, nextMStr, mapData?.totalDiaristas || 0);
        financialStatsArr.push({ month: mStr, entradas: fData.entradas, despesas: fData.despesas, saldo: fData.saldo });
        
        dIt.setMonth(dIt.getMonth() + 1);
      }

      setData({
        summary: currentResult.summary,
        finance: currentFinance,
        rankingList: currentResult.rankingList,
        matchesList: currentResult.matches,
        monthlyStats: monthlyStatsArr,
        financialStats: financialStatsArr,
        comparison: comp,
        monthlyMap
      });

      setRankingPlayerId('all');
    } catch (err: any) {
      console.error('Erro detalhado ao gerar relatório:', err);
      setError(`Não foi possível carregar o relatório: ${err?.message || 'Erro'}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line
  }, []);

  // --- RANKINGS CENTRALIZADOS (DENSE RANKING) ---
  const goalsRanking = useMemo(() => {
    if (!data) return [];
    return getDenseRanking(data.rankingList, 'goals');
  }, [data]);

  const assistsRanking = useMemo(() => {
    if (!data) return [];
    return getDenseRanking(data.rankingList, 'assists');
  }, [data]);

  const championRanking = useMemo(() => {
    if (!data) return [];
    return getDenseRanking(data.rankingList, 'champion');
  }, [data]);

  const ralabostaRanking = useMemo(() => {
    if (!data) return [];
    return getDenseRanking(data.rankingList, 'ralabosta');
  }, [data]);

  // Ranking ativo conforme categoria selecionada
  const activeRanking = useMemo(() => {
    if (rankingCategory === 'goals') return goalsRanking;
    if (rankingCategory === 'assists') return assistsRanking;
    if (rankingCategory === 'champion') return championRanking;
    if (rankingCategory === 'ralabosta') return ralabostaRanking;
    return [];
  }, [rankingCategory, goalsRanking, assistsRanking, championRanking, ralabostaRanking]);

  // Jogador individual selecionado
  const activePlayer = useMemo(() => {
    if (!data || rankingPlayerId === 'all') return null;
    return data.rankingList.find(p => p.id === rankingPlayerId) || null;
  }, [data, rankingPlayerId]);

  // Posição de um jogador em uma métrica (Dense Rank)
  const getPlayerDenseRank = (pId: string, metric: 'goals' | 'assists' | 'champion' | 'ralabosta') => {
    const list = metric === 'goals' ? goalsRanking :
                 metric === 'assists' ? assistsRanking :
                 metric === 'champion' ? championRanking : ralabostaRanking;
    const found = list.find(r => r.player.id === pId);
    return found ? `${found.rank}º` : '—';
  };

  // Helper para obter líderes baseado em qualquer lista de rankings
  const getHighlightFromRanking = (list: RankedPlayer[], unit: string) => {
    if (list.length === 0) return null;
    const firstRankPlayers = list.filter(r => r.rank === 1);
    if (firstRankPlayers.length === 0) return null;
    
    const primary = firstRankPlayers[0];
    const tieCount = firstRankPlayers.length - 1;

    let labelName = primary.player.name;
    if (tieCount > 0) {
      labelName = `${primary.player.name} (+${tieCount} emp.)`;
    }

    return {
      player: primary.player,
      displayName: labelName,
      val: `${primary.value} ${unit}`,
      value: primary.value,
      hasTie: tieCount > 0,
      totalTied: firstRankPlayers.length,
      tiedPlayers: firstRankPlayers.map(r => r.player)
    };
  };

  // Helper legado
  const getHighlightData = (metric: 'goals' | 'assists' | 'champion' | 'ralabosta', unit: string) => {
    const list = metric === 'goals' ? goalsRanking :
                 metric === 'assists' ? assistsRanking :
                 metric === 'champion' ? championRanking : ralabostaRanking;
    
    return getHighlightFromRanking(list, unit);
  };

  const HighlightCard = ({ data, label, icon }: { data: any, label: string, icon: React.ReactNode }) => {
    const [expanded, setExpanded] = useState(false);
    
    return (
      <div 
        onClick={() => data?.hasTie && setExpanded(!expanded)} 
        style={{ 
          backgroundColor: 'rgba(255,255,255,0.02)', 
          padding: '10px', 
          borderRadius: '10px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          border: '1px solid rgba(255,255,255,0.03)',
          cursor: data?.hasTie ? 'pointer' : 'default'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {icon}
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
        </div>
        
        {data && data.value !== 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {data.player.photo_url ? (
                <img src={data.player.photo_url} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
              ) : (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={14} color="#666" />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {data.displayName}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{data.val}</span>
              </div>
              {data.hasTie && (
                <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              )}
            </div>
            
            {expanded && data.hasTie && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {data.tiedPlayers.map((p: any) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {p.photo_url ? (
                      <img src={p.photo_url} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                    ) : (
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={10} color="#666" />
                      </div>
                    )}
                    <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum</div>
        )}
      </div>
    );
  };

  // Dropdown player options
  const playerDropdownOptions = useMemo(() => {
    const base = [{ value: 'all', label: 'Todos os jogadores' }];
    if (!data) return base;
    const playersSorted = [...data.rankingList].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return base.concat(playersSorted.map(p => ({ value: p.id, label: p.name })));
  }, [data]);

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
      <div className="dashboard-card dashboard-card--neon" style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 50 }}>
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
        <div className="dashboard-card dashboard-card--neon" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
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
                {data.summary.matches} partidas • {data.summary.goals} gols • {data.summary.assists} assistências
                {userRole !== 'visitor' && (
                  <>
                    <br/>
                    {formatCurrency(data.finance.entradas)} de entradas • {formatCurrency(data.finance.despesas)} de despesas<br/>
                    <strong style={{ color: data.finance.saldo >= 0 ? '#22c55e' : '#ef4444' }}>
                      {formatCurrency(data.finance.saldo)} de saldo
                    </strong>
                  </>
                )}
              </p>
            </div>
          )}

          {/* 1. RESUMO GERAL */}
          <div className="dashboard-card dashboard-card--neon" style={{ padding: '0', overflow: 'hidden' }}>
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
          <div className="dashboard-card dashboard-card--neon" style={{ padding: '0', overflow: 'hidden' }}>
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
                <div style={{ marginTop: '16px', width: '100%', maxWidth: '100%' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '20px', textAlign: 'center' }}>GOLS X ASSISTÊNCIAS</h4>
                  <div ref={chartScrollRef} style={{ overflowX: 'auto', paddingBottom: '8px', width: '100%', maxWidth: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '140px', gap: '8px', minWidth: `${Math.max(280, data.monthlyStats.length * 40)}px` }}>
                      {data.monthlyStats.map((ms, i) => {
                        const maxVal = Math.max(...data.monthlyStats.map(s => Math.max(s.goals, s.assists))) || 1;
                        // Deixar 20% de espaço extra no topo para os labels não cortarem
                        const paddedMax = maxVal * 1.25; 
                        const hGols = (ms.goals / paddedMax) * 100;
                        const hAsts = (ms.assists / paddedMax) * 100;
                        const mNumber = ms.month.split('-')[1];
                        const mLabel = MONTHS.find(m => m.value === mNumber)?.label.slice(0, 3) || mNumber;
                        return (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, alignItems: 'center', flex: 1, gap: '4px', maxWidth: '60px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px', width: '100%', justifyContent: 'center' }}>
                              <div style={{ width: '40%', height: `${hGols}%`, backgroundColor: '#38bdf8', borderRadius: '4px 4px 0 0', position: 'relative', minHeight: ms.goals === 0 ? '1px' : '0' }}>
                                <span style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', color: ms.goals === 0 ? 'rgba(255,255,255,0.3)' : '#38bdf8', fontWeight: 700 }}>{ms.goals}</span>
                              </div>
                              <div style={{ width: '40%', height: `${hAsts}%`, backgroundColor: '#fbbf24', borderRadius: '4px 4px 0 0', position: 'relative', minHeight: ms.assists === 0 ? '1px' : '0' }}>
                                <span style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', color: ms.assists === 0 ? 'rgba(255,255,255,0.3)' : '#fbbf24', fontWeight: 700 }}>{ms.assists}</span>
                              </div>
                            </div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{mLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {showChartScrollIndicator && (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 8px 0' }}>
                      <span style={{ fontSize: '0.68rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.85 }}>
                        Deslize para ver outros meses →
                      </span>
                    </div>
                  )}
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
          <div className="dashboard-card dashboard-card--neon" style={{ padding: '0', overflow: 'visible' }}>
            <div 
              onClick={() => setIsRankingOpen(!isRankingOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>RANKING DO PERÍODO</span>
                {!isRankingOpen && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Art: {goalsRanking[0]?.player.name || '—'} • Ast: {assistsRanking[0]?.player.name || '—'}
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
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Artilheiro: <strong style={{ color: '#fff' }}>{getPlayerDenseRank(activePlayer.id, 'goals')}</strong></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assistências: <strong style={{ color: '#fff' }}>{getPlayerDenseRank(activePlayer.id, 'assists')}</strong></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Maior Campeão: <strong style={{ color: '#fff' }}>{getPlayerDenseRank(activePlayer.id, 'champion')}</strong></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ralabosta: <strong style={{ color: '#fff' }}>{getPlayerDenseRank(activePlayer.id, 'ralabosta')}</strong></div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {activeRanking.map((item) => (
                      <div key={item.player.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ fontWeight: 800, color: item.rank === 1 ? '#fbbf24' : item.rank === 2 ? '#94a3b8' : item.rank === 3 ? '#b45309' : 'var(--text-muted)', width: '28px', fontSize: '0.9rem' }}>
                          {item.rank}º
                        </span>
                        {item.player.photo_url ? (
                          <img src={item.player.photo_url} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={16} color="#666" />
                          </div>
                        )}
                        <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{item.player.name}</span>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8' }}>
                          {rankingCategory === 'goals' && `${item.value} gols`}
                          {rankingCategory === 'assists' && `${item.value} asts`}
                          {rankingCategory === 'champion' && `${item.value} títulos`}
                          {rankingCategory === 'ralabosta' && `${item.value} vezes`}
                        </div>
                      </div>
                    ))}
                    {activeRanking.length === 0 && (
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

          {/* 5. JOGADORES (TOP 3 COLOCAÇÕES) */}
          <div className="dashboard-card dashboard-card--neon" style={{ padding: '0', overflow: 'hidden' }}>
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
                {/* Artilheiros */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Artilheiros</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {goalsRanking.filter(r => r.rank <= 3).map((item) => (
                      <div key={'a_' + item.player.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff', padding: '4px 0' }}>
                        <span>
                          <strong style={{ color: item.rank === 1 ? '#fbbf24' : item.rank === 2 ? '#94a3b8' : '#b45309', marginRight: '6px' }}>
                            {item.rank}º
                          </strong>
                          {item.player.name}
                        </span>
                        <strong>{item.value} gols</strong>
                      </div>
                    ))}
                    {goalsRanking.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum gol no período</span>}
                  </div>
                </div>

                {/* Assistentes */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Assistentes</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {assistsRanking.filter(r => r.rank <= 3).map((item) => (
                      <div key={'as_' + item.player.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff', padding: '4px 0' }}>
                        <span>
                          <strong style={{ color: item.rank === 1 ? '#fbbf24' : item.rank === 2 ? '#94a3b8' : '#b45309', marginRight: '6px' }}>
                            {item.rank}º
                          </strong>
                          {item.player.name}
                        </span>
                        <strong>{item.value} asts</strong>
                      </div>
                    ))}
                    {assistsRanking.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhuma assistência no período</span>}
                  </div>
                </div>

                {/* Mais Campeões */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Mais Campeões</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {championRanking.filter(r => r.rank <= 3).map((item) => (
                      <div key={'c_' + item.player.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff', padding: '4px 0' }}>
                        <span>
                          <strong style={{ color: item.rank === 1 ? '#fbbf24' : item.rank === 2 ? '#94a3b8' : '#b45309', marginRight: '6px' }}>
                            {item.rank}º
                          </strong>
                          {item.player.name}
                        </span>
                        <strong>{item.value} títulos</strong>
                      </div>
                    ))}
                    {championRanking.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum título no período</span>}
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
          <div className="dashboard-card dashboard-card--neon" style={{ padding: '0', overflow: 'hidden' }}>
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
          <div className="dashboard-card dashboard-card--neon" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsDestaquesOpen(!isDestaquesOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>DESTAQUES DO PERÍODO</span>
                {!isDestaquesOpen && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Art: {goalsRanking[0]?.player.name || '—'} • Ast: {assistsRanking[0]?.player.name || '—'}
                  </span>
                )}
              </div>
              <ChevronDown size={20} style={{ transform: isDestaquesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
            </div>
            
            {isDestaquesOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Artilheiro', data: getHighlightData('goals', 'gols'), icon: <Flame size={14} color="#f97316" /> },
                  { label: 'Líder de Assistências', data: getHighlightData('assists', 'asts'), icon: <Star size={14} color="#fbbf24" /> },
                  { label: 'Mais Campeão', data: getHighlightData('champion', 'vezes'), icon: <Trophy size={14} color="#fbbf24" /> },
                  { label: 'Mais Ralabosta', data: getHighlightData('ralabosta', 'vezes'), icon: <span style={{ fontSize: '12px' }}>💩</span> }
                ].map((d, i) => (
                  <HighlightCard key={i} data={d.data} label={d.label} icon={d.icon} />
                ))}
              </div>
            )}
          </div>

          {/* 7.5. DESTAQUES POR MÊS */}
          {(filterType === 'year' || filterType.includes('semestre')) && (
            <div className="dashboard-card dashboard-card--neon" style={{ padding: '0', overflow: 'hidden' }}>
              <div 
                onClick={() => setIsDestaquesMesOpen(!isDestaquesMesOpen)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>DESTAQUES POR MÊS</span>
                </div>
                <ChevronDown size={20} style={{ transform: isDestaquesMesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
              </div>
              
              {isDestaquesMesOpen && (
                <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.monthlyStats.map(ms => {
                    const mapData = data.monthlyMap?.[ms.month];
                    if (!mapData || mapData.matchesList.length === 0) return null;
                    const isExp = expandedMonth === ms.month;
                    const mNumber = ms.month.split('-')[1];
                    const mLabel = MONTHS.find(m => m.value === mNumber)?.label || mNumber;
                    
                    return (
                      <div key={ms.month} style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)', overflow: 'hidden' }}>
                        <div onClick={() => setExpandedMonth(isExp ? null : ms.month)} style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{mLabel}</span>
                          <ChevronDown size={16} style={{ transform: isExp ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
                        </div>
                        {isExp && (
                          <div style={{ padding: '0 12px 12px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {[
                              { label: 'Artilheiro', data: getHighlightFromRanking([...mapData.rankingList].sort((a,b)=>b.goals-a.goals).map(p=>({player:p, value:p.goals, rank:0})).map((p,_i,arr)=>({...p, rank: arr.findIndex(x=>x.value===p.value)+1})), 'gols'), icon: <Flame size={12} color="#f97316" /> },
                              { label: 'Assistências', data: getHighlightFromRanking([...mapData.rankingList].sort((a,b)=>b.assists-a.assists).map(p=>({player:p, value:p.assists, rank:0})).map((p,_i,arr)=>({...p, rank: arr.findIndex(x=>x.value===p.value)+1})), 'asts'), icon: <Star size={12} color="#fbbf24" /> },
                              { label: 'Mais Campeão', data: getHighlightFromRanking([...mapData.rankingList].sort((a,b)=>b.champion-a.champion).map(p=>({player:p, value:p.champion, rank:0})).map((p,_i,arr)=>({...p, rank: arr.findIndex(x=>x.value===p.value)+1})), 'vezes'), icon: <Trophy size={12} color="#fbbf24" /> },
                              { label: 'Mais Ralabosta', data: getHighlightFromRanking([...mapData.rankingList].sort((a,b)=>b.ralabosta-a.ralabosta).map(p=>({player:p, value:p.ralabosta, rank:0})).map((p,_i,arr)=>({...p, rank: arr.findIndex(x=>x.value===p.value)+1})), 'vezes'), icon: <span style={{ fontSize: '10px' }}>💩</span> }
                            ].map((d, i) => (
                              <HighlightCard key={i} data={d.data} label={d.label} icon={d.icon} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 8. COMPARAÇÃO */}
          <div className="dashboard-card dashboard-card--neon" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsComparacaoOpen(!isComparacaoOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>COMPARAÇÃO</span>
                {!isComparacaoOpen && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {data.comparison?.type === 'mensal' ? 'Com o mês anterior' : data.comparison?.type === 'semestral' ? '1º Semestre x 2º Semestre' : 'Indisponível para o filtro atual'}
                  </span>
                )}
              </div>
              <ChevronDown size={20} style={{ transform: isComparacaoOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
            </div>
            
            {isComparacaoOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.comparison && data.comparison.type !== 'nenhum' ? (
                  <>
                    {/* Mensagem discreta explicativa de Período Parcial */}
                    {data.comparison.isPartial && (
                      <div style={{ backgroundColor: 'rgba(251,191,36,0.06)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.15)', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'flex', gap: '6px', alignItems: 'flex-start', lineHeight: '1.4' }}>
                          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>Período ainda em andamento. As médias por partida representam melhor a comparação atual.</span>
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {data.comparison.prevLabel}
                        {data.comparison.isPrevPartial && <span style={{ color: '#fbbf24', fontSize: '0.7rem', marginLeft: '4px', fontWeight: 500 }}> (PARCIAL)</span>}
                      </span>
                      <div style={{ width: '20px', height: '1px', backgroundColor: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                        {data.comparison.currLabel}
                        {data.comparison.isCurrPartial && <span style={{ color: '#fbbf24', fontSize: '0.7rem', marginLeft: '4px', fontWeight: 500 }}> — período em andamento</span>}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {[
                        { label: 'Gols', metric: data.comparison.goals, unit: 'gols' },
                        { label: 'Assistências', metric: data.comparison.assists, unit: 'asts' },
                        { label: 'Campeões', metric: data.comparison.champions, unit: 'vezes' },
                        { label: 'Ralabostas', metric: data.comparison.ralabostas, unit: 'vezes' },
                        { label: 'Partidas', metric: data.comparison.matches, unit: 'jogos' }
                      ].map((item, idx) => {
                        const isMatches = item.label === 'Partidas';
                        const showAverageAsPrimary = data.comparison?.isPartial && !isMatches;

                        const prevMatches = data.comparison?.matches.prev || 1;
                        const currMatches = data.comparison?.matches.curr || 1;

                        const pVal = item.metric.prev;
                        const cVal = item.metric.curr;
                        
                        const pAvg = pVal / prevMatches;
                        const cAvg = cVal / currMatches;

                        const displayPrev = showAverageAsPrimary ? pAvg : pVal;
                        const displayCurr = showAverageAsPrimary ? cAvg : cVal;
                        
                        const diff = displayCurr - displayPrev;
                        let pctText = '';
                        
                        if (displayPrev === 0 && displayCurr > 0) {
                          pctText = 'Novo registro';
                        } else if (displayPrev === 0 && displayCurr === 0) {
                          pctText = 'Sem alteração';
                        } else if (displayPrev > 0 && displayCurr === 0) {
                          pctText = '-100,0%';
                        } else {
                          const pct = (diff / displayPrev) * 100;
                          pctText = `${diff > 0 ? '+' : ''}${pct.toFixed(1).replace('.', ',')}%`;
                        }

                        let color = '#fff';
                        let arrow = '→';
                        if (diff > 0) {
                          color = item.label === 'Ralabostas' ? '#ef4444' : '#22c55e';
                          arrow = '↑';
                        } else if (diff < 0) {
                          color = item.label === 'Ralabostas' ? '#22c55e' : '#ef4444';
                          arrow = '↓';
                        }

                        const formatVal = (v: number) => {
                          if (showAverageAsPrimary) {
                            return v.toFixed(1).replace('.', ',');
                          }
                          return String(v);
                        };

                        const secondaryPrevText = showAverageAsPrimary ? `Total: ${pVal}` : `Média: ${pAvg.toFixed(1).replace('.', ',')}`;
                        const secondaryCurrText = showAverageAsPrimary ? `Total: ${cVal}` : `Média: ${cAvg.toFixed(1).replace('.', ',')}`;

                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{item.label}</span>
                              {showAverageAsPrimary && <span style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 500, textTransform: 'none' }}>(Média/partida)</span>}
                            </span>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{data.comparison?.prevLabel}:</span>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatVal(displayPrev)}</span>
                                {!isMatches && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{secondaryPrevText}</span>}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{data.comparison?.currLabel}:</span>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>{formatVal(displayCurr)}</span>
                                {!isMatches && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{secondaryCurrText}</span>}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.1)', marginTop: '6px', paddingTop: '6px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Diferença:</span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                {diff > 0 ? `+${formatVal(diff)}` : formatVal(diff)}
                              </span>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Variação:</span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: diff === 0 ? 'var(--text-muted)' : color }}>
                                {diff === 0 ? (pctText === 'Sem alteração' ? pctText : '→ 0%') : `${arrow} ${pctText}`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {!data.comparison.isPartial && (data.comparison.matches.prev > 0 || data.comparison.matches.curr > 0) ? (
                      <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>MÉDIAS (POR PARTIDA)</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gols</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.75rem' }}>
                              <span>{data.comparison.matches.prev > 0 ? (data.comparison.goals.prev / data.comparison.matches.prev).toFixed(1).replace('.', ',') : '—'}</span>
                              <span style={{ color: 'var(--text-muted)' }}>vs</span>
                              <span style={{ fontWeight: 600 }}>{data.comparison.matches.curr > 0 ? (data.comparison.goals.curr / data.comparison.matches.curr).toFixed(1).replace('.', ',') : '—'}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assistências</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.75rem' }}>
                              <span>{data.comparison.matches.prev > 0 ? (data.comparison.assists.prev / data.comparison.matches.prev).toFixed(1).replace('.', ',') : '—'}</span>
                              <span style={{ color: 'var(--text-muted)' }}>vs</span>
                              <span style={{ fontWeight: 600 }}>{data.comparison.matches.curr > 0 ? (data.comparison.assists.curr / data.comparison.matches.curr).toFixed(1).replace('.', ',') : '—'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Sem dados ou filtro não suportado (ex: Ano inteiro).</span>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
