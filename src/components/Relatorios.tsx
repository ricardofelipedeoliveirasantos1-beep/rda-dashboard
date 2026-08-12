import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart2, 
  ChevronDown, 
  User,
  Trophy,
  Award,
  AlertCircle,
  Loader2,
  Flame,
  Star
} from 'lucide-react';

interface RelatorioData {
  players: any[];
  matches: any[];
  payments: any[];
  summary: {
    totalPlayers: number;
    totalMatches: number;
    totalGoals: number;
    totalAssists: number;
    totalYellow: number;
    totalBlue: number;
    totalRed: number;
    totalChampions: number;
    totalVice: number;
    totalRalabosta: number;
    totalRevenue: number;
  };
  finance: {
    received: number;
    pending: number;
    diarias: number;
    totalEntradas: number;
    expected: number;
  };
  ranking: any[];
  destaques: {
    artilheiro: any;
    assistente: any;
    campeao: any;
    vice: any;
    ralabosta: any;
    amarelos: any;
    azuis: any;
    vermelhos: any;
  };
}

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
];

export default function Relatorios({ userRole: _userRole, can: _can }: { userRole: 'admin' | 'assistant' | 'visitor' | 'treasurer'; can: (action: any) => boolean }) {
  const [filterType, setFilterType] = useState<'month' | 'year'>('year');
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RelatorioData | null>(null);
  
  // Card states
  const [isResumoOpen, setIsResumoOpen] = useState(true);
  const [isJogadoresOpen, setIsJogadoresOpen] = useState(false);
  const [isPartidasOpen, setIsPartidasOpen] = useState(false);
  const [isFinanceiroOpen, setIsFinanceiroOpen] = useState(false);
  const [isDestaquesOpen, setIsDestaquesOpen] = useState(false);

  // Expand internal matches
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});

  const toggleMatch = (matchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedMatches(prev => ({ ...prev, [matchId]: !prev[matchId] }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      let startDateStr, endDateStr, monthPrefix;

      if (filterType === 'month') {
        startDateStr = `${selectedYear}-${selectedMonth}-01`;
        const nextMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 1);
        endDateStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
        monthPrefix = `${selectedYear}-${selectedMonth}`;
      } else {
        startDateStr = `${selectedYear}-01-01`;
        endDateStr = `${parseInt(selectedYear) + 1}-01-01`;
        monthPrefix = selectedYear; // Para ano, pega todos os meses que começam com o ano
      }

      // 1. Fetch Players
      const { data: playersData, error: pError } = await supabase
        .from('players')
        .select('*')
        .eq('is_active', true);
      
      if (pError) throw pError;

      // 2. Fetch Matches
      const { data: matchesData, error: mError } = await supabase
        .from('matches')
        .select(`
          *,
          match_players (
            player_id,
            category_at_match,
            team,
            player:players (id, name, photo_url, category)
          ),
          match_player_stats (*)
        `)
        .eq('status', 'finished')
        .gte('match_date', startDateStr)
        .lt('match_date', endDateStr)
        .order('match_date', { ascending: false });

      if (mError) throw mError;

      // 3. Fetch Payments
      const { data: paymentsData, error: payError } = await supabase
        .from('monthly_payments')
        .select('*')
        .like('payment_month', `${monthPrefix}%`);

      // Avoid fatal error if monthly_payments doesn't exist
      const safePayments = (payError && payError.code === 'PGRST205') ? [] : (paymentsData || []);

      const matches = matchesData || [];
      const players = playersData || [];

      // Agragations
      let tGoals = 0, tAssists = 0, tYellow = 0, tBlue = 0, tRed = 0;
      let tChamp = 0, tVice = 0, tRala = 0;
      let diarias = 0;

      const playerMap: Record<string, any> = {};
      players.forEach(p => {
        playerMap[p.id] = {
          id: p.id, name: p.name, photo: p.photo_url, category: p.category,
          goals: 0, assists: 0, yellow: 0, blue: 0, red: 0,
          champ: 0, vice: 0, rala: 0, jogos: 0, pontos: 0
        };
      });

      matches.forEach(match => {
        diarias += Number(match.daily_total || 0);
        const isHistorical = match.source === 'historical_manual' || match.source === 'historical_import';

        match.match_players?.forEach((mp: any) => {
          if (!mp.player) return;
          const pId = mp.player.id;
          
          if (!playerMap[pId]) {
            playerMap[pId] = {
              id: pId, name: mp.player.name, photo: mp.player.photo_url, category: mp.player.category,
              goals: 0, assists: 0, yellow: 0, blue: 0, red: 0,
              champ: 0, vice: 0, rala: 0, jogos: 0, pontos: 0
            };
          }

          playerMap[pId].jogos += 1;

          // Ignore diarista stats if not historical
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

          // Awards calculation (similar to Ranking logic)
          let isChamp = false;
          let isVice = false;
          let isRala = false;

          if (isHistorical) {
            isChamp = stats?.is_champion || false;
            isVice = stats?.is_runner_up || false;
            isRala = stats?.is_ralabosta || false;
          } else {
            isChamp = match.champion_team === mp.team;
            isVice = match.runner_up_team === mp.team;
            isRala = stats?.is_ralabosta || false;
          }

          if (isChamp) { playerMap[pId].champ += 1; tChamp += 1; }
          if (isVice) { playerMap[pId].vice += 1; tVice += 1; }
          if (isRala) { playerMap[pId].rala += 1; tRala += 1; }
        });
      });

      // Calculate points
      const rankingList = Object.values(playerMap).map(p => {
        p.pontos = p.goals + p.assists + (p.champ * 3) + (p.vice * 1);
        return p;
      }).filter(p => p.jogos > 0).sort((a, b) => b.pontos - a.pontos);

      let received = 0, pending = 0, expected = 0;
      safePayments.forEach((p: any) => {
        expected += Number(p.amount);
        if (p.status === 'paid') received += Number(p.amount);
        if (p.status === 'pending') pending += Number(p.amount);
      });

      // Destaques
      const getTop = (field: string) => [...rankingList].sort((a, b) => b[field] - a[field])[0] || null;

      setData({
        players,
        matches,
        payments: safePayments,
        summary: {
          totalPlayers: players.length,
          totalMatches: matches.length,
          totalGoals: tGoals,
          totalAssists: tAssists,
          totalYellow: tYellow,
          totalBlue: tBlue,
          totalRed: tRed,
          totalChampions: tChamp,
          totalVice: tVice,
          totalRalabosta: tRala,
          totalRevenue: received + diarias
        },
        finance: {
          received,
          pending,
          diarias,
          totalEntradas: received + diarias,
          expected
        },
        ranking: rankingList,
        destaques: {
          artilheiro: getTop('goals'),
          assistente: getTop('assists'),
          campeao: getTop('champ'),
          vice: getTop('vice'),
          ralabosta: getTop('rala'),
          amarelos: getTop('yellow'),
          azuis: getTop('blue'),
          vermelhos: getTop('red')
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
    // Generate empty/initial if needed, but user wants it to wait for Generate or do it initially?
    // "No topo criar um card compacto: PERÍODO ... Adicionar: Gerar Relatório"
    // I will auto-generate once on mount for the current month.
    handleGenerate();
    // eslint-disable-next-line
  }, []);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

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
            onChange={e => setFilterType(e.target.value as 'month'|'year')}
            style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
          >
            <option value="month">Mensal</option>
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
            style={{ flex: filterType === 'year' ? 1 : 'none', padding: '10px', borderRadius: '10px', backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
          >
            <option value="2026">2026</option>
            <option value="2027">2027</option>
            <option value="2028">2028</option>
            <option value="2029">2029</option>
            <option value="2030">2030</option>
          </select>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={loading}
          style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#4f46e5', color: '#fff', fontWeight: 700, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {loading ? <Loader2 size={18} className="spinner" /> : <BarChart2 size={18} />}
          {loading ? 'Gerando...' : 'Gerar Relatório'}
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
          {/* 1. RESUMO GERAL */}
          <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsResumoOpen(!isResumoOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
              aria-expanded={isResumoOpen}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>RESUMO GERAL</span>
                {!isResumoOpen && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {data.summary.totalPlayers} jog. • {data.summary.totalMatches} part. • {data.summary.totalGoals} gols • {formatCurrency(data.summary.totalRevenue)}
                  </span>
                )}
              </div>
              <div style={{ transform: isResumoOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>
                <ChevronDown size={20} />
              </div>
            </div>
            
            {isResumoOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Jogadores cadastrados</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.totalPlayers}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Partidas finalizadas</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.totalMatches}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Gols marcados</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.totalGoals}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assistências</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.totalAssists}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cartões <span style={{color: '#fbbf24'}}>Amarelos</span></span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.totalYellow}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cartões <span style={{color: '#3b82f6'}}>Azuis</span></span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.totalBlue}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cartões <span style={{color: '#ef4444'}}>Vermelhos</span></span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.totalRed}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Arrecadação total</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#22c55e' }}>{formatCurrency(data.summary.totalRevenue)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Campeões</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.totalChampions}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Vices / Ralabosta</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.summary.totalVice} / {data.summary.totalRalabosta}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. JOGADORES */}
          <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsJogadoresOpen(!isJogadoresOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
              aria-expanded={isJogadoresOpen}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>JOGADORES</span>
                {!isJogadoresOpen && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {data.ranking.length} avaliados • Art: {data.destaques.artilheiro?.name || 'N/A'} • Ast: {data.destaques.assistente?.name || 'N/A'}
                  </span>
                )}
              </div>
              <div style={{ transform: isJogadoresOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>
                <ChevronDown size={20} />
              </div>
            </div>
            
            {isJogadoresOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.ranking.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, color: i < 3 ? '#fbbf24' : 'var(--text-muted)', width: '20px' }}>{i + 1}º</span>
                      {p.photo ? (
                        <img src={p.photo} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={18} color="#666" />
                        </div>
                      )}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{p.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{p.jogos} jogos</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>{p.pontos} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>pts</span></div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                      <span title="Gols"><Flame size={12} style={{display:'inline', verticalAlign:'middle', marginRight:'2px'}}/>{p.goals}</span>
                      <span title="Assistências"><Star size={12} style={{display:'inline', verticalAlign:'middle', marginRight:'2px'}}/>{p.assists}</span>
                      <span title="Campeão"><Trophy size={12} style={{display:'inline', verticalAlign:'middle', marginRight:'2px'}} color="#fbbf24"/>{p.champ}</span>
                      <span title="Vice">V:{p.vice}</span>
                      <span title="Ralabosta">R:{p.rala}</span>
                    </div>
                  </div>
                ))}
                {data.ranking.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum jogador pontuou no período.</span>}
              </div>
            )}
          </div>

          {/* 3. PARTIDAS */}
          <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsPartidasOpen(!isPartidasOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
              aria-expanded={isPartidasOpen}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>PARTIDAS</span>
                {!isPartidasOpen && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {data.summary.totalMatches} partidas • Última: {data.matches[0] ? data.matches[0].match_date.split('-').reverse().join('/') : 'N/A'} • {data.summary.totalGoals} gols
                  </span>
                )}
              </div>
              <div style={{ transform: isPartidasOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>
                <ChevronDown size={20} />
              </div>
            </div>
            
            {isPartidasOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.matches.map((m) => {
                  const isExpanded = !!expandedMatches[m.id];
                  const mPlayers = m.match_players || [];
                  const date = m.match_date.split('-').reverse().join('/');
                  
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div 
                        onClick={(e) => toggleMatch(m.id, e)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{date}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.location} • Finalizada</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                          <div style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', fontSize: '0.7rem' }}>
                            {mPlayers.length} jog.
                          </div>
                          <div style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                            <ChevronDown size={16} />
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gols da partida</span>
                              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                                {(m.team_1_score || 0) + (m.team_2_score || 0) || (m.match_player_stats?.reduce((sum:any, s:any)=>sum+(s.goals||0), 0) || 0)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Arrecadação</span>
                              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#22c55e' }}>
                                {formatCurrency(Number(m.daily_total || 0))}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Horário</span>
                              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                                {m.match_time.slice(0, 5)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Diaristas</span>
                              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                                {mPlayers.filter((p:any) => p.category_at_match === 'Diarista').length}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {data.matches.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhuma partida finalizada no período.</span>}
              </div>
            )}
          </div>

          {/* 4. FINANCEIRO */}
          <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsFinanceiroOpen(!isFinanceiroOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
              aria-expanded={isFinanceiroOpen}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>FINANCEIRO</span>
                {!isFinanceiroOpen && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Rec: {formatCurrency(data.finance.received)} • Pend: {formatCurrency(data.finance.pending)} • Diár: {formatCurrency(data.finance.diarias)}
                  </span>
                )}
              </div>
              <div style={{ transform: isFinanceiroOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>
                <ChevronDown size={20} />
              </div>
            </div>
            
            {isFinanceiroOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mensalidades Previstas</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{formatCurrency(data.finance.expected)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mensalidades Recebidas</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#22c55e' }}>{formatCurrency(data.finance.received)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mensalidades Pendentes</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444' }}>{formatCurrency(data.finance.pending)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Diárias Arrecadadas</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#22c55e' }}>{formatCurrency(data.finance.diarias)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', paddingLeft: '12px', paddingRight: '12px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Total de Entradas</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#22c55e' }}>{formatCurrency(data.finance.totalEntradas)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', backgroundColor: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', paddingLeft: '12px', paddingRight: '12px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>Saldo Atual</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>{formatCurrency(data.finance.totalEntradas)}</span>
                </div>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>* Como não há módulo de despesas, o Saldo Atual é igual ao Total de Entradas.</p>
              </div>
            )}
          </div>

          {/* 5. DESTAQUES */}
          <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsDestaquesOpen(!isDestaquesOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
              aria-expanded={isDestaquesOpen}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>DESTAQUES DO PERÍODO</span>
                {!isDestaquesOpen && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Art: {data.destaques.artilheiro?.name || '-'} • Ast: {data.destaques.assistente?.name || '-'}
                  </span>
                )}
              </div>
              <div style={{ transform: isDestaquesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>
                <ChevronDown size={20} />
              </div>
            </div>
            
            {isDestaquesOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                
                {[
                  { label: 'Artilheiro', player: data.destaques.artilheiro, val: data.destaques.artilheiro?.goals + ' gols', icon: <Flame size={14} color="#f97316" /> },
                  { label: 'Líder de Assistências', player: data.destaques.assistente, val: data.destaques.assistente?.assists + ' asts', icon: <Star size={14} color="#fbbf24" /> },
                  { label: 'Mais Campeão', player: data.destaques.campeao, val: data.destaques.campeao?.champ + ' vezes', icon: <Trophy size={14} color="#fbbf24" /> },
                  { label: 'Mais Vices', player: data.destaques.vice, val: data.destaques.vice?.vice + ' vezes', icon: <Award size={14} color="#9ca3af" /> },
                  { label: 'Mais Ralabosta', player: data.destaques.ralabosta, val: data.destaques.ralabosta?.rala + ' vezes', icon: <span style={{fontSize:'12px'}}>💩</span> },
                  { label: 'Mais Amarelos', player: data.destaques.amarelos, val: data.destaques.amarelos?.yellow + ' cartões', icon: <div style={{width:'10px', height:'14px', backgroundColor:'#fbbf24', borderRadius:'2px'}}/> },
                  { label: 'Mais Azuis', player: data.destaques.azuis, val: data.destaques.azuis?.blue + ' cartões', icon: <div style={{width:'10px', height:'14px', backgroundColor:'#3b82f6', borderRadius:'2px'}}/> },
                  { label: 'Mais Vermelhos', player: data.destaques.vermelhos, val: data.destaques.vermelhos?.red + ' cartões', icon: <div style={{width:'10px', height:'14px', backgroundColor:'#ef4444', borderRadius:'2px'}}/> },
                ].map((d, i) => (
                  <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {d.icon}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{d.label}</span>
                    </div>
                    {d.player && d.player[Object.keys(d.player).find(k => k === 'goals' || k === 'assists' || k === 'champ' || k === 'vice' || k === 'rala' || k === 'yellow' || k === 'blue' || k === 'red') as string] > 0 ? (
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

        </>
      )}

    </div>
  );
}
