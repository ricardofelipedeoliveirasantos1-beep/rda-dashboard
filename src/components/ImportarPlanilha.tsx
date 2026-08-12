import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { Upload, X, Check, FileText, Loader2, User, Edit2, Trash2, ArrowLeft, ChevronDown } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  normalizedName: string;
  photo_url: string | null;
}

interface ParsedPlayerStat {
  sheetName: string;
  player_id: string | null; // null if not found
  goals: number;
  assists: number;
  status: 'Campeão' | 'Vice' | 'Ralabosta' | null;
}

interface ParsedMatch {
  date: string; // YYYY-MM-DD
  originalDateStr: string;
  players: ParsedPlayerStat[];
  existsInDb: boolean;
  selected: boolean;
  needsReview: boolean;
}

export default function ImportarPlanilha({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'edit_match' | 'importing' | 'success'>('upload');
  const [dbPlayers, setDbPlayers] = useState<Player[]>([]);
  const [parsedMatches, setParsedMatches] = useState<ParsedMatch[]>([]);
  
  // To handle editing a specific match
  const [editingMatchIndex, setEditingMatchIndex] = useState<number | null>(null);

  // Import stats
  const [importStats, setImportStats] = useState({ imported: 0, errors: 0, lastError: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeString = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ');
  };

  useEffect(() => {
    // Load players for matching
    const fetchPlayers = async () => {
      const { data } = await supabase.from('players').select('id, name, photo_url');
      if (data) {
        setDbPlayers(data.map(p => ({
          ...p,
          normalizedName: normalizeString(p.name)
        })));
      }
    };
    fetchPlayers();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      // Try to find the best sheet. Default to first sheet.
      let sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('base consolidada') || s.toLowerCase().includes('historico')) || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];

      // Parse data...
      // Map columns: Data, Jogador, Gols, Assistências, Status
      const matchesMap = new Map<string, ParsedMatch>();

      for (const row of jsonData) {
        const keys = Object.keys(row);
        const getVal = (possibleKeys: string[]) => {
          const key = keys.find(k => possibleKeys.some(pk => k.toLowerCase().includes(pk)));
          return key ? row[key] : '';
        };

        let dateRaw = getVal(['data', 'dia', 'jogo']);
        const playerRaw = getVal(['jogador', 'nome', 'player']);
        const goalsRaw = getVal(['gols', 'gol', 'goals']);
        const assistsRaw = getVal(['assistências', 'assistencia', 'assist']);
        const statusRaw = getVal(['status', 'situação', 'resultado']);

        if (!dateRaw || !playerRaw) continue;

        // Try to parse Excel date (serial number) or string
        let dateObj: Date;
        if (typeof dateRaw === 'number') {
          dateObj = new Date(Date.UTC(0, 0, dateRaw - 1));
        } else {
          // DD/MM/YYYY or YYYY-MM-DD
          const parts = String(dateRaw).split(/[/-]/);
          if (parts.length === 3) {
            if (parts[2].length === 4) dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
            else dateObj = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00Z`);
          } else {
            dateObj = new Date(dateRaw);
          }
        }

        if (isNaN(dateObj.getTime())) continue;

        const yyyy = dateObj.getUTCFullYear();
        const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getUTCDate()).padStart(2, '0');
        const dateKey = `${yyyy}-${mm}-${dd}`;
        const originalDateStr = `${dd}/${mm}/${yyyy}`;

        // Match player
        const normalizedPlayer = normalizeString(String(playerRaw));
        const matchedPlayer = dbPlayers.find(p => p.normalizedName === normalizedPlayer);

        const goals = parseInt(String(goalsRaw)) || 0;
        const assists = parseInt(String(assistsRaw)) || 0;
        
        let status: ParsedPlayerStat['status'] = null;
        const statusLower = String(statusRaw).toLowerCase();
        if (statusLower.includes('campe')) status = 'Campeão';
        else if (statusLower.includes('vice')) status = 'Vice';
        else if (statusLower.includes('ralabosta')) status = 'Ralabosta';

        const playerStat: ParsedPlayerStat = {
          sheetName: String(playerRaw),
          player_id: matchedPlayer ? matchedPlayer.id : null,
          goals,
          assists,
          status
        };

        if (!matchesMap.has(dateKey)) {
          matchesMap.set(dateKey, {
            date: dateKey,
            originalDateStr,
            players: [],
            existsInDb: false,
            selected: true,
            needsReview: false
          });
        }
        
        matchesMap.get(dateKey)!.players.push(playerStat);
      }

      const parsedMatchesList = Array.from(matchesMap.values());

      // Check DB for existing matches by date to avoid duplicates
      if (parsedMatchesList.length > 0) {
        const dates = parsedMatchesList.map(m => m.date);
        const { data: existingMatches } = await supabase
          .from('matches')
          .select('match_date')
          .in('match_date', dates);
        
        if (existingMatches) {
          const existingDates = new Set(existingMatches.map(m => m.match_date));
          parsedMatchesList.forEach(m => {
            if (existingDates.has(m.date)) {
              m.existsInDb = true;
              m.selected = false; // Don't import by default if already exists
            }
          });
        }
      }

      // Check if needs review
      parsedMatchesList.forEach(m => {
        let hasChamp = false;
        let hasVice = false;
        let hasRala = false;
        let hasMissingPlayer = false;
        
        m.players.forEach(p => {
          if (p.status === 'Campeão') hasChamp = true;
          if (p.status === 'Vice') hasVice = true;
          if (p.status === 'Ralabosta') hasRala = true;
          if (!p.player_id) hasMissingPlayer = true;
        });

        if (!hasChamp || !hasVice || !hasRala || hasMissingPlayer) {
          m.needsReview = true;
        }
      });

      // Sort by date ascending
      parsedMatchesList.sort((a, b) => a.date.localeCompare(b.date));

      setParsedMatches(parsedMatchesList);
      setStep('preview');

    } catch (err) {
      console.error('Erro ao ler Excel:', err);
      alert('Falha ao processar o arquivo. Verifique se é um arquivo Excel válido.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    const toImport = parsedMatches.filter(m => m.selected);
    if (toImport.length === 0) {
      alert('Nenhuma partida selecionada para importar.');
      return;
    }

    setStep('importing');
    let successes = 0;
    let errors = 0;
    let lastErrorMsg = '';

    for (const match of toImport) {
      try {
        // 1. Create match
        const { data: newMatch, error: matchError } = await supabase.from('matches').insert({
          match_date: match.date,
          match_time: '12:00',
          location: 'Partida Histórica',
          status: 'finished',
          source: 'historical_import',
          daily_total: 0,
          champion_team: null,
          runner_up_team: null,
          third_place_team: null,
          fourth_place_team: null,
        }).select('id').single();

        if (matchError) throw matchError;

        const matchId = newMatch.id;
        const validPlayers = match.players.filter(p => p.player_id);

        if (validPlayers.length > 0) {
          // 2. Insert match_players
          const playersToInsert = validPlayers.map(p => ({
            match_id: matchId,
            player_id: p.player_id,
            team: null,
            category_at_match: 'Mensalista',
            daily_fee_at_match: 0
          }));

          const { error: playersError } = await supabase.from('match_players').insert(playersToInsert);
          if (playersError) throw playersError;

          // 3. Insert stats
          const statsToInsert = validPlayers.map(p => ({
            match_id: matchId,
            player_id: p.player_id,
            goals: p.goals || 0,
            assists: p.assists || 0,
            yellow_cards: 0,
            blue_cards: 0,
            red_cards: 0,
            is_champion: p.status === 'Campeão',
            is_runner_up: p.status === 'Vice',
            is_ralabosta: p.status === 'Ralabosta'
          }));

          const { error: statsError } = await supabase.from('match_player_stats').insert(statsToInsert);
          if (statsError) throw statsError;
        }

        successes++;
      } catch (err: any) {
        console.error('Erro ao importar partida', match.date, err);
        errors++;
        lastErrorMsg = err.message || JSON.stringify(err);
      }
    }

    setImportStats({ imported: successes, errors, lastError: lastErrorMsg });
    setStep('success');
  };

  if (step === 'upload') {
    return (
      <div style={{ padding: '16px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} style={{ color: '#818cf8' }} /> Importar Histórico
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Upload size={32} style={{ color: '#6366f1', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>Selecione a Planilha</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
            Aceitamos arquivos .xlsx ou .xls com o histórico de partidas do RDA. O sistema lerá os dados primeiro e você poderá revisar antes de salvar.
          </p>

          <input
            type="file"
            accept=".xlsx, .xls"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loading ? <Loader2 size={18} className="spin" /> : 'Selecionar Arquivo'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    const totalSelected = parsedMatches.filter(m => m.selected).length;
    
    return (
      <div style={{ padding: '16px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} style={{ color: '#818cf8' }} /> Resumo da Planilha
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a5b4fc' }}>{parsedMatches.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600 }}>PARTIDAS</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {parsedMatches.reduce((acc, m) => acc + m.players.length, 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>PARTICIPAÇÕES</div>
          </div>
        </div>

        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          Partidas Encontradas
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px', marginBottom: '20px' }}>
          {parsedMatches.map((match, idx) => (
            <div 
              key={match.date}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="checkbox"
                  checked={match.selected}
                  onChange={(e) => {
                    const newMatches = [...parsedMatches];
                    newMatches[idx].selected = e.target.checked;
                    setParsedMatches(newMatches);
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{match.originalDateStr}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{match.players.length} jogadores</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {match.existsInDb && <span style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', borderRadius: '4px', fontWeight: 700 }}>JÁ EXISTE</span>}
                {match.needsReview && <span style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: 'rgba(245,158,11,0.1)', color: '#fbbf24', borderRadius: '4px', fontWeight: 700 }}>⚠️ REVISAR</span>}
                <button 
                  onClick={() => { setEditingMatchIndex(idx); setStep('edit_match'); }}
                  style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '8px' }}
                  title="Editar partida"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={onClose}
            style={{
              flex: 1, padding: '14px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button 
            onClick={handleImport}
            disabled={totalSelected === 0}
            style={{
              flex: 2, padding: '14px', backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: totalSelected > 0 ? 'pointer' : 'not-allowed', opacity: totalSelected > 0 ? 1 : 0.5
            }}
          >
            Importar {totalSelected} Partidas
          </button>
        </div>
      </div>
    );
  }

  if (step === 'edit_match' && editingMatchIndex !== null) {
    const match = parsedMatches[editingMatchIndex];
    return (
      <div style={{ padding: '16px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => setStep('preview')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
            >
              <ArrowLeft size={20} />
            </button>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Editar Partida - {match.originalDateStr}</h2>
          </div>
        </div>

        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
          <div style={{ minWidth: '600px', display: 'grid', gridTemplateColumns: 'minmax(200px, 3fr) 80px 80px 140px 40px', gap: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            <div>JOGADOR</div>
            <div style={{ textAlign: 'center' }}>GOLS</div>
            <div style={{ textAlign: 'center' }}>ASSIST.</div>
            <div>STATUS</div>
            <div></div>
          </div>

          <div style={{ minWidth: '600px', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            {match.players.map((p, pIdx) => {
              const matchedPlayerInfo = p.player_id ? dbPlayers.find(db => db.id === p.player_id) : null;
              
              return (
                <div key={pIdx} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 3fr) 80px 80px 140px 40px', gap: '16px', alignItems: 'center', backgroundColor: p.player_id ? 'rgba(255,255,255,0.01)' : 'rgba(239,68,68,0.05)', padding: '10px 12px', borderRadius: '10px', border: p.player_id ? '1px solid rgba(255,255,255,0.03)' : '1px solid rgba(239,68,68,0.2)', transition: 'background-color 0.2s' }}>
                  
                  {/* JOGADOR */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {matchedPlayerInfo?.photo_url ? (
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }}>
                        <img src={matchedPlayerInfo.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}>
                        <User size={16} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}
                    
                    <select
                      value={p.player_id || ''}
                      onChange={(e) => {
                        const newMatches = [...parsedMatches];
                        newMatches[editingMatchIndex].players[pIdx].player_id = e.target.value || null;
                        
                        // Re-evaluate needsReview
                        let needsReview = false;
                        let hasChamp = false, hasVice = false, hasRala = false;
                        newMatches[editingMatchIndex].players.forEach(player => {
                          if (!player.player_id) needsReview = true;
                          if (player.status === 'Campeão') hasChamp = true;
                          if (player.status === 'Vice') hasVice = true;
                          if (player.status === 'Ralabosta') hasRala = true;
                        });
                        if (!hasChamp || !hasVice || !hasRala) needsReview = true;
                        newMatches[editingMatchIndex].needsReview = needsReview;
                        
                        setParsedMatches(newMatches);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: 'rgba(0,0,0,0.25)',
                        border: p.player_id ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(248,113,113,0.5)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        cursor: 'pointer'
                      }}
                      onFocus={(e) => {
                        if (p.player_id) e.target.style.borderColor = 'rgba(99,102,241,0.5)';
                      }}
                      onBlur={(e) => {
                        if (p.player_id) e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                      }}
                    >
                      <option value="">[Não encontrado: {p.sheetName}]</option>
                      {dbPlayers.sort((a,b) => a.name.localeCompare(b.name)).map(dbP => (
                        <option key={dbP.id} value={dbP.id}>{dbP.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* GOLS */}
                  <input
                    type="number"
                    min="0"
                    value={p.goals}
                    onChange={(e) => {
                      const newMatches = [...parsedMatches];
                      newMatches[editingMatchIndex].players[pIdx].goals = parseInt(e.target.value) || 0;
                      setParsedMatches(newMatches);
                    }}
                    style={{ width: '100%', padding: '10px 4px', backgroundColor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'var(--text-primary)', textAlign: 'center', fontSize: '0.95rem', fontWeight: 700, outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />

                  {/* ASSISTENCIAS */}
                  <input
                    type="number"
                    min="0"
                    value={p.assists}
                    onChange={(e) => {
                      const newMatches = [...parsedMatches];
                      newMatches[editingMatchIndex].players[pIdx].assists = parseInt(e.target.value) || 0;
                      setParsedMatches(newMatches);
                    }}
                    style={{ width: '100%', padding: '10px 4px', backgroundColor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'var(--text-primary)', textAlign: 'center', fontSize: '0.95rem', fontWeight: 700, outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />

                  {/* STATUS */}
                  <div style={{ position: 'relative' }}>
                    <select
                      value={p.status || ''}
                      onChange={(e) => {
                        const newMatches = [...parsedMatches];
                        newMatches[editingMatchIndex].players[pIdx].status = e.target.value as any;
                        
                        // Re-evaluate needsReview
                        let needsReview = false;
                        let hasChamp = false, hasVice = false, hasRala = false;
                        newMatches[editingMatchIndex].players.forEach(player => {
                          if (!player.player_id) needsReview = true;
                          if (player.status === 'Campeão') hasChamp = true;
                          if (player.status === 'Vice') hasVice = true;
                          if (player.status === 'Ralabosta') hasRala = true;
                        });
                        if (!hasChamp || !hasVice || !hasRala) needsReview = true;
                        newMatches[editingMatchIndex].needsReview = needsReview;
                        
                        setParsedMatches(newMatches);
                      }}
                      style={{ 
                        width: '100%', 
                        padding: '10px 30px 10px 12px', 
                        backgroundColor: p.status === 'Campeão' ? 'rgba(234,179,8,0.15)' : p.status === 'Vice' ? 'rgba(148,163,184,0.15)' : p.status === 'Ralabosta' ? 'rgba(168,100,52,0.15)' : 'rgba(0,0,0,0.25)', 
                        border: p.status === 'Campeão' ? '1px solid rgba(234,179,8,0.3)' : p.status === 'Vice' ? '1px solid rgba(148,163,184,0.3)' : p.status === 'Ralabosta' ? '1px solid rgba(168,100,52,0.3)' : '1px solid rgba(255,255,255,0.08)', 
                        borderRadius: '8px', 
                        color: p.status === 'Campeão' ? '#fde047' : p.status === 'Vice' ? '#e2e8f0' : p.status === 'Ralabosta' ? '#fdba74' : 'var(--text-primary)', 
                        fontSize: '0.85rem',
                        fontWeight: p.status ? 700 : 500,
                        appearance: 'none',
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => {
                        if (!p.status) e.target.style.borderColor = 'rgba(99,102,241,0.5)';
                      }}
                      onBlur={(e) => {
                        if (!p.status) e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                      }}
                    >
                      <option value="" style={{ color: '#000' }}>Normal</option>
                      <option value="Campeão" style={{ color: '#000' }}>🏆 Campeão</option>
                      <option value="Vice" style={{ color: '#000' }}>🥈 Vice</option>
                      <option value="Ralabosta" style={{ color: '#000' }}>💩 Ralabosta</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: p.status ? 'inherit' : 'var(--text-muted)' }} />
                  </div>

                  {/* REMOVER */}
                  <button
                    onClick={() => {
                      const newMatches = [...parsedMatches];
                      newMatches[editingMatchIndex].players.splice(pIdx, 1);
                      setParsedMatches(newMatches);
                    }}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title="Remover jogador da partida"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setStep('preview')}
              style={{ padding: '12px 24px', backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
            >
              Concluir Edição
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'importing') {
    return (
      <div style={{ padding: '40px 16px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #333', textAlign: 'center' }}>
        <Loader2 size={40} className="spin" style={{ color: '#6366f1', margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Importando Histórico...</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Gravando dados no Supabase. Por favor aguarde.</p>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div style={{ padding: '40px 16px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #333', textAlign: 'center' }}>
        <Check size={48} style={{ color: '#4ade80', margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px' }}>Importação Concluída!</h2>
        
        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', display: 'inline-block', textAlign: 'left', marginTop: '12px', marginBottom: '24px' }}>
          <div style={{ marginBottom: '4px' }}><strong>Importadas com sucesso:</strong> {importStats.imported}</div>
          <div style={{ color: importStats.errors > 0 ? '#f87171' : 'inherit' }}><strong>Erros:</strong> {importStats.errors}</div>
          {importStats.lastError && (
            <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#f87171', maxWidth: '400px', wordBreak: 'break-word' }}>
              <strong>Último erro:</strong> {importStats.lastError}
            </div>
          )}
        </div>

        <button 
          onClick={onClose}
          style={{
            width: '100%', padding: '14px', backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer'
          }}
        >
          Fechar
        </button>
      </div>
    );
  }

  return null;
}
