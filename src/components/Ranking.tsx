import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { User, Loader2, Filter, Trophy, Crown } from 'lucide-react';

interface PlayerStats {
  id: string;
  name: string;
  photo_url: string;
  position: string;
  category: string;
  games: number;
  goals: number;
  assists: number;
  participations: number;
  champion: number;
  vice: number;
  ralabosta: number;
  yellow_cards: number;
  blue_cards: number;
  red_cards: number;
  points: number;
}

type FilterType = 'Geral' | 'Gols' | 'Assistências' | 'Campeões' | 'Vices' | 'Ralabosta' | 'Cartões';
type CardFilterType = 'Amarelo' | 'Azul' | 'Vermelho';

export default function Ranking({ userRole: _userRole, can: _can }: { userRole: 'admin' | 'assistant' | 'visitor' | 'treasurer'; can: (action: any) => boolean }) {
  const [loading, setLoading] = useState(true);
  const [playerStatsMap, setPlayerStatsMap] = useState<Record<string, PlayerStats>>({});
  const [filter, setFilter] = useState<FilterType>('Geral');
  const [cardFilter, setCardFilter] = useState<CardFilterType>('Amarelo');
  const [searchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);

  useEffect(() => {
    fetchRankingData();
  }, []);

  const fetchRankingData = async () => {
    try {
      setLoading(true);
      
      const { data: matches, error } = await supabase
        .from('matches')
        .select(`
          *,
          match_players (
            *,
            player:players (
              id, name, photo_url, position, category
            )
          ),
          match_player_stats (*)
        `)
        .eq('status', 'finished');

      if (error) throw error;

      const statsMap: Record<string, PlayerStats> = {};

      matches?.forEach(match => {
        const isHistorical = match.source === 'historical_manual' || match.source === 'historical_import';

        match.match_players?.forEach((mp: any) => {
          if (!mp.player) return;

          // Rule: Ignore "Diarista" for normal matches
          if (!isHistorical && mp.category_at_match === 'Diarista') {
            return;
          }

          const playerId = mp.player.id;
          
          if (!statsMap[playerId]) {
            statsMap[playerId] = {
              id: playerId,
              name: mp.player.name,
              photo_url: mp.player.photo_url,
              position: mp.player.position,
              category: mp.category_at_match || mp.player.category,
              games: 0,
              goals: 0,
              assists: 0,
              participations: 0,
              champion: 0,
              vice: 0,
              ralabosta: 0,
              yellow_cards: 0,
              blue_cards: 0,
              red_cards: 0,
              points: 0
            };
          }

          const playerStats = match.match_player_stats?.find((s: any) => s.player_id === playerId);
          
          let isChamp = false;
          let isVice = false;
          let isRala = false;

          if (isHistorical) {
            isChamp = playerStats?.is_champion || false;
            isVice = playerStats?.is_runner_up || false;
            isRala = playerStats?.is_ralabosta || false;
          } else {
            isChamp = match.champion_team === mp.team;
            isVice = match.runner_up_team === mp.team;
            isRala = playerStats?.is_ralabosta || false;
          }

          statsMap[playerId].games += 1;
          
          if (playerStats) {
            statsMap[playerId].goals += (playerStats.goals || 0);
            statsMap[playerId].assists += (playerStats.assists || 0);
            statsMap[playerId].yellow_cards += (playerStats.yellow_cards || 0);
            statsMap[playerId].blue_cards += (playerStats.blue_cards || 0);
            statsMap[playerId].red_cards += (playerStats.red_cards || 0);
          }

          if (isChamp) statsMap[playerId].champion += 1;
          if (isVice) statsMap[playerId].vice += 1;
          if (isRala) statsMap[playerId].ralabosta += 1;
        });
      });

      // Calc participations and POINTS
      Object.values(statsMap).forEach(ps => {
        ps.participations = ps.goals + ps.assists;
        ps.points = ps.goals + ps.assists + (ps.champion * 3) + (ps.vice * 1);
      });

      setPlayerStatsMap(statsMap);
    } catch (error) {
      console.error('Error fetching ranking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const rankedPlayers = useMemo(() => {
    let list = Object.values(playerStatsMap);

    if (searchTerm.trim() !== '') {
      list = list.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    list.sort((a, b) => {
      if (filter === 'Geral') {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goals !== a.goals) return b.goals - a.goals;
        if (b.assists !== a.assists) return b.assists - a.assists;
        if (b.champion !== a.champion) return b.champion - a.champion;
        if (a.games !== b.games) return a.games - b.games;
        return a.name.localeCompare(b.name);
      }
      if (filter === 'Gols') {
        if (b.goals !== a.goals) return b.goals - a.goals;
        if (b.assists !== a.assists) return b.assists - a.assists;
        if (a.games !== b.games) return a.games - b.games;
        return a.name.localeCompare(b.name);
      }
      if (filter === 'Assistências') {
        if (b.assists !== a.assists) return b.assists - a.assists;
        if (b.goals !== a.goals) return b.goals - a.goals;
        if (a.games !== b.games) return a.games - b.games;
        return a.name.localeCompare(b.name);
      }
      if (filter === 'Campeões') {
        if (b.champion !== a.champion) return b.champion - a.champion;
        if (a.games !== b.games) return a.games - b.games;
        return a.name.localeCompare(b.name);
      }
      if (filter === 'Vices') {
        if (b.vice !== a.vice) return b.vice - a.vice;
        if (a.games !== b.games) return a.games - b.games;
        return a.name.localeCompare(b.name);
      }
      if (filter === 'Ralabosta') {
        if (b.ralabosta !== a.ralabosta) return b.ralabosta - a.ralabosta;
        if (a.games !== b.games) return a.games - b.games;
        return a.name.localeCompare(b.name);
      }
      if (filter === 'Cartões') {
        let aVal = 0, bVal = 0;
        if (cardFilter === 'Amarelo') { aVal = a.yellow_cards; bVal = b.yellow_cards; }
        if (cardFilter === 'Azul') { aVal = a.blue_cards; bVal = b.blue_cards; }
        if (cardFilter === 'Vermelho') { aVal = a.red_cards; bVal = b.red_cards; }
        
        if (bVal !== aVal) return bVal - aVal;
        if (a.games !== b.games) return a.games - b.games;
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return list;
  }, [playerStatsMap, filter, cardFilter, searchTerm]);

  const top3 = rankedPlayers.slice(0, 3);
  const restOfPlayers = rankedPlayers.slice(3);

  const getFilterAccentColor = () => {
    switch (filter) {
      case 'Geral': return '#5865F2'; 
      case 'Gols': return '#fbbf24'; 
      case 'Assistências': return '#fbbf24'; 
      case 'Campeões': return '#22c55e';
      case 'Vices': return '#3b82f6';
      case 'Ralabosta': return '#ef4444';
      case 'Cartões': 
        if (cardFilter === 'Amarelo') return '#facc15';
        if (cardFilter === 'Azul') return '#3b82f6';
        return '#ef4444';
      default: return '#fff';
    }
  };

  const getPodiumLabelColor = (position: number) => {
    if (position === 1) return '#fbbf24'; // Gold
    if (position === 2) return '#a78bfa'; // Light Purple/Blue like in image
    if (position === 3) return '#fb923c'; // Orange
    return '#fff';
  };

  const renderValueForPodium = (player: PlayerStats, position: number) => {
    const color = getPodiumLabelColor(position);
    let val: number | string = 0;
    let label = '';
    
    switch (filter) {
      case 'Geral': val = player.points; label = 'PONTOS'; break;
      case 'Gols': val = player.goals; label = 'GOLS'; break;
      case 'Assistências': val = player.assists; label = 'ASSISTÊNCIAS'; break;
      case 'Campeões': val = player.champion; label = 'TÍTULOS'; break;
      case 'Vices': val = player.vice; label = 'VICES'; break;
      case 'Ralabosta': val = player.ralabosta; label = 'RALABOSTA'; break;
      case 'Cartões': 
        if (cardFilter === 'Amarelo') val = player.yellow_cards;
        if (cardFilter === 'Azul') val = player.blue_cards;
        if (cardFilter === 'Vermelho') val = player.red_cards;
        label = 'CARTÕES';
        break;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: position === 1 ? '1.5rem' : '1.2rem', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{val}</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: color, letterSpacing: '0.05em' }}>{label}</span>
      </div>
    );
  };

  const renderPodiumPhoto = (player: PlayerStats, position: number) => {
    let size = position === 1 ? 86 : 64;
    let ringColor = position === 1 ? '#fbbf24' : position === 2 ? '#9ca3af' : '#fb923c';
    let glow = position === 1 ? '0 0 25px rgba(251,191,36,0.5)' : 
               position === 2 ? '0 0 15px rgba(255,255,255,0.2)' : 
                                '0 0 15px rgba(251,146,60,0.3)';
    
    let crownColor = position === 1 ? '#fbbf24' : position === 2 ? '#e5e7eb' : '#fb923c';

    if (filter === 'Ralabosta') {
      ringColor = '#ef4444';
      glow = position === 1 ? '0 0 25px rgba(239,68,68,0.5)' : 'none';
      crownColor = '#ef4444';
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '8px', position: 'relative' }}>
        
        <div style={{ position: 'relative', marginTop: position === 1 ? '12px' : '8px' }}>
          {/* CROWN */}
          <div style={{ 
            position: 'absolute', 
            top: position === 1 ? '-28px' : '-22px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 10,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
          }}>
            <Crown size={position === 1 ? 36 : 28} color={crownColor} fill={crownColor} strokeWidth={1.5} />
          </div>

          {player.photo_url ? (
            <img 
              src={player.photo_url} 
              alt={player.name} 
              style={{ 
                width: size, height: size, borderRadius: '50%', objectFit: 'cover',
                border: `3px solid ${ringColor}`,
                boxShadow: glow,
                position: 'relative',
                zIndex: 5
              }} 
            />
          ) : (
            <div style={{ 
              width: size, height: size, borderRadius: '50%', backgroundColor: '#1c1c1c', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `3px solid ${ringColor}`,
              boxShadow: glow,
              position: 'relative',
              zIndex: 5
            }}>
              <User size={size / 2} style={{ color: 'var(--text-muted)' }} />
            </div>
          )}
        </div>
        
        <span style={{ fontSize: position === 1 ? '1rem' : '0.85rem', fontWeight: 800, color: '#fff' }}>
          {player.name}
        </span>
      </div>
    );
  };

  const getListValue = (player: PlayerStats) => {
    switch (filter) {
      case 'Geral': return player.points;
      case 'Gols': return player.goals;
      case 'Assistências': return player.assists;
      case 'Campeões': return player.champion;
      case 'Vices': return player.vice;
      case 'Ralabosta': return player.ralabosta;
      case 'Cartões': 
        if (cardFilter === 'Amarelo') return player.yellow_cards;
        if (cardFilter === 'Azul') return player.blue_cards;
        if (cardFilter === 'Vermelho') return player.red_cards;
        return 0;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}>
        <Loader2 size={32} className="spinner" />
        <p>Calculando ranking...</p>
      </div>
    );
  }

  return (
    <div className="tab-pane active fade-in" style={{ paddingBottom: '80px', backgroundColor: '#050505', minHeight: '100vh', color: '#fff' }}>
      
      {/* HEADER */}
      <header style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={24} color="#7c3aed" fill="#7c3aed" />
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ranking Geral {new Date().getFullYear()}</h1>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '4px 0 0 0' }}>Classificação geral dos jogadores do RDA</p>
        
        <div style={{ position: 'absolute', right: '16px', top: '24px', cursor: 'pointer', padding: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Filter size={18} color="#9ca3af" />
        </div>
      </header>

      {/* FILTER TABS */}
      <div style={{ padding: '0 16px 16px 16px' }}>
        <div style={{ 
          display: 'flex', gap: '8px', overflowX: 'auto', padding: '6px', scrollbarWidth: 'none', 
          backgroundColor: '#111', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' 
        }}>
          {(['Geral', 'Gols', 'Assistências', 'Campeões', 'Vices', 'Ralabosta', 'Cartões'] as FilterType[]).map(f => {
            const isSelected = filter === f;
            let bgColor = 'rgba(255,255,255,0.03)';
            if (isSelected) {
              if (f === 'Geral') bgColor = '#a855f7'; // Roxo
              else if (f === 'Gols') bgColor = '#22c55e'; // Verde
              else if (f === 'Assistências') bgColor = '#3b82f6'; // Azul
              else if (f === 'Campeões') bgColor = '#eab308'; // Amarelo Ouro
              else if (f === 'Vices') bgColor = '#9ca3af'; // Cinza/Prata
              else if (f === 'Ralabosta') bgColor = '#ef4444'; // Vermelho
              else if (f === 'Cartões') bgColor = '#facc15'; // Amarelo
            }
            return (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: isSelected ? '1px solid transparent' : '1px solid rgba(255,255,255,0.05)',
                  backgroundColor: bgColor,
                  color: isSelected ? '#fff' : '#9ca3af',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {f}
              </button>
            )
          })}
        </div>
      </div>

      {filter === 'Cartões' && (
        <div style={{ display: 'flex', gap: '8px', padding: '0 16px 16px 16px' }}>
          {(['Amarelo', 'Azul', 'Vermelho'] as CardFilterType[]).map(cf => (
            <button
              key={cf}
              onClick={() => setCardFilter(cf)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: cardFilter === cf 
                  ? (cf === 'Amarelo' ? '#facc15' : cf === 'Azul' ? '#3b82f6' : '#ef4444')
                  : 'rgba(255,255,255,0.05)',
                backgroundColor: cardFilter === cf ? 'rgba(255,255,255,0.05)' : 'transparent',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {cf}
            </button>
          ))}
        </div>
      )}

      {rankedPlayers.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <p>Nenhuma estatística disponível.</p>
        </div>
      ) : (
        <div style={{ padding: '10px 16px' }}>

          {/* PODIUM TOP 3 */}
          {!searchTerm && top3.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch', gap: '12px', marginBottom: '24px' }}>
              
              {/* 2nd Place (Left) */}
              {top3[1] && (
                <div 
                  style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', width: '31%', cursor: 'pointer',
                    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '12px 4px',
                    marginTop: '20px'
                  }}
                  onClick={() => setSelectedPlayer(top3[1])}
                >
                  {renderPodiumPhoto(top3[1], 2)}
                  {renderValueForPodium(top3[1], 2)}
                </div>
              )}

              {/* 1st Place (Center) */}
              {top3[0] && (
                <div 
                  style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', width: '38%', cursor: 'pointer', zIndex: 10,
                    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: filter === 'Ralabosta' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(251,191,36,0.3)', padding: '16px 4px 12px 4px',
                    boxShadow: filter === 'Ralabosta' ? '0 8px 32px rgba(239,68,68,0.1)' : '0 8px 32px rgba(251,191,36,0.1)'
                  }}
                  onClick={() => setSelectedPlayer(top3[0])}
                >
                  {renderPodiumPhoto(top3[0], 1)}
                  {renderValueForPodium(top3[0], 1)}
                </div>
              )}

              {/* 3rd Place (Right) */}
              {top3[2] && (
                <div 
                  style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', width: '31%', cursor: 'pointer',
                    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '12px 4px',
                    marginTop: '20px'
                  }}
                  onClick={() => setSelectedPlayer(top3[2])}
                >
                  {renderPodiumPhoto(top3[2], 3)}
                  {renderValueForPodium(top3[2], 3)}
                </div>
              )}
            </div>
          )}

          {/* LISTA COMPLETA */}
          <div style={{ backgroundColor: '#0a0a0a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            
            {/* Headers */}
            {filter === 'Geral' ? (
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af', padding: '16px 12px 12px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: '20px', textAlign: 'center' }}>#</div>
                <div style={{ flex: 1, marginLeft: '8px', color: '#fff' }}>JD</div>
                <div style={{ display: 'flex', gap: '4px', textAlign: 'center', paddingRight: '8px' }}>
                  <div style={{ width: '24px', color: '#fff' }}>JG</div>
                  <div style={{ width: '24px', color: '#22c55e' }}>GO</div>
                  <div style={{ width: '24px', color: '#3b82f6' }}>AS</div>
                  <div style={{ width: '24px', color: '#eab308' }}>CP</div>
                  <div style={{ width: '24px', color: '#9ca3af' }}>VC</div>
                  <div style={{ width: '24px', color: '#ef4444' }}>RB</div>
                  <div style={{ width: '28px', color: '#eab308' }}>PT</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: '0.65rem', fontWeight: 800, color: getFilterAccentColor(), padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {filter.toUpperCase()}
              </div>
            )}

            {/* Rows */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {restOfPlayers.map((player, index) => {
                const globalIndex = searchTerm ? index + 1 : top3.length + index + 1;
                
                return (
                  <div 
                    key={player.id} 
                    style={{ 
                      display: 'flex', alignItems: 'center', padding: '12px', 
                      borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer',
                      backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                    }}
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', width: '24px', textAlign: 'center' }}>
                      {globalIndex}º
                    </div>
                    
                    <div style={{ marginLeft: '8px' }}>
                      {player.photo_url ? (
                        <img src={player.photo_url} alt={player.name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 42, height: 42, borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={20} style={{ color: '#666' }} />
                        </div>
                      )}
                    </div>
                    
                    <div style={{ flex: 1, marginLeft: '12px', fontWeight: 700, fontSize: '0.85rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {player.name}
                    </div>
                    
                    {filter === 'Geral' ? (
                      <div style={{ display: 'flex', gap: '4px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, paddingRight: '8px', alignItems: 'center' }}>
                        <div style={{ width: '24px', color: '#fff' }}>{player.games}</div>
                        <div style={{ width: '24px', color: '#22c55e' }}>{player.goals}</div>
                        <div style={{ width: '24px', color: '#3b82f6' }}>{player.assists}</div>
                        <div style={{ width: '24px', color: '#eab308' }}>{player.champion}</div>
                        <div style={{ width: '24px', color: '#9ca3af' }}>{player.vice}</div>
                        <div style={{ width: '24px', color: '#ef4444' }}>{player.ralabosta}</div>
                        <div style={{ width: '28px', color: '#eab308', fontWeight: 900, fontSize: '0.95rem' }}>{player.points}</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: filter === 'Ralabosta' ? '#ef4444' : '#fff' }}>
                        {getListValue(player)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PLAYER MODAL (PERFIL ESTATÍSTICO) */}
      {selectedPlayer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setSelectedPlayer(null)}>
          <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#111', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            
            <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Profile Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {selectedPlayer.photo_url ? (
                  <img src={selectedPlayer.photo_url} alt={selectedPlayer.name} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #666' }} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #666' }}>
                    <User size={40} style={{ color: '#666' }} />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{selectedPlayer.name}</h2>
                  <span style={{ fontSize: '0.75rem', backgroundColor: '#064e3b', color: '#34d399', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, width: 'fit-content' }}>
                    {selectedPlayer.category}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <div style={{ backgroundColor: '#1a1a1a', padding: '12px 8px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600 }}>Jogos</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{selectedPlayer.games}</span>
                </div>
                <div style={{ backgroundColor: '#1a1a1a', padding: '12px 8px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.65rem', color: '#60a5fa', fontWeight: 600 }}>Gols</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{selectedPlayer.goals}</span>
                </div>
                <div style={{ backgroundColor: '#1a1a1a', padding: '12px 8px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.65rem', color: '#a78bfa', fontWeight: 600 }}>Assistências</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{selectedPlayer.assists}</span>
                </div>
                <div style={{ backgroundColor: '#1a1a1a', padding: '12px 8px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.65rem', color: '#2dd4bf', fontWeight: 600 }}>Participações</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{selectedPlayer.participations}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ backgroundColor: '#1a1a1a', padding: '12px 8px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 600 }}>Campeão 🏆</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{selectedPlayer.champion}</span>
                </div>
                <div style={{ backgroundColor: '#1a1a1a', padding: '12px 8px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600 }}>Vice 🥈</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{selectedPlayer.vice}</span>
                </div>
                <div style={{ backgroundColor: '#1a1a1a', padding: '12px 8px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.65rem', color: '#fb923c', fontWeight: 600 }}>Ralabosta 💩</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>{selectedPlayer.ralabosta}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ backgroundColor: '#1a1a1a', padding: '12px 8px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: 600 }}>Amarelos 🟨</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#facc15' }}>{selectedPlayer.yellow_cards}</span>
                </div>
                <div style={{ backgroundColor: '#1a1a1a', padding: '12px 8px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 600 }}>Azuis 🟦</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b82f6' }}>{selectedPlayer.blue_cards}</span>
                </div>
                <div style={{ backgroundColor: '#1a1a1a', padding: '12px 8px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 600 }}>Vermelhos 🟥</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>{selectedPlayer.red_cards}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <div style={{ backgroundColor: '#1a1a1a', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>Média Gols</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{(selectedPlayer.goals / (selectedPlayer.games || 1)).toFixed(2).replace('.', ',')}</span>
                </div>
                <div style={{ backgroundColor: '#1a1a1a', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600 }}>Média Assist.</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{(selectedPlayer.assists / (selectedPlayer.games || 1)).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
