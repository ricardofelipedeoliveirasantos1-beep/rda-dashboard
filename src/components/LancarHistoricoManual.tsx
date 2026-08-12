import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Search,
  User,
  Check,
  AlertCircle,
  Loader,
  Trophy,
  Users,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Player {
  id: string;
  name: string;
  photo_url: string | null;
  category: 'Mensalista' | 'Diarista';
  is_active: boolean;
}

type MatchStatus = 'nenhum' | 'campeao' | 'vice' | 'ralabosta';

interface PlayerEntry {
  playerId: string;
  goals: number;
  assists: number;
  status: MatchStatus;
}

interface Props {
  onClose: () => void;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isoToBr = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const brToIso = (br: string) => {
  const parts = br.replace(/\D/g, '');
  if (parts.length !== 8) return '';
  return `${parts.slice(4)}-${parts.slice(2, 4)}-${parts.slice(0, 2)}`;
};

const formatBrDate = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const statusLabel: Record<MatchStatus, string> = {
  nenhum: 'Sem status',
  campeao: '🏆 Campeão',
  vice: '🥈 Vice',
  ralabosta: '💩 Ralabosta',
};

const statusColor: Record<MatchStatus, string> = {
  nenhum: 'var(--text-secondary)',
  campeao: '#fbbf24',
  vice: '#94a3b8',
  ralabosta: '#f59e0b',
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function LancarHistoricoManual({ onClose }: Props) {
  // ── Step ──────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── Step 1: Date ──────────────────────────
  const [dateInput, setDateInput] = useState(isoToBr(todayISO()));
  const [checkingDate, setCheckingDate] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [duplicateMatchId, setDuplicateMatchId] = useState<string | null>(null);

  // ── Step 2: Players ───────────────────────
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Step 3: Stats ─────────────────────────
  const [entries, setEntries] = useState<Record<string, PlayerEntry>>({});
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);

  // ── Saving ────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // ── Load players once ─────────────────────
  useEffect(() => {
    async function load() {
      setLoadingPlayers(true);
      const { data } = await supabase
        .from('players')
        .select('id, name, photo_url, category, is_active')
        .eq('is_active', true)
        .order('name');
      setAllPlayers(data || []);
      setLoadingPlayers(false);
    }
    load();
  }, []);

  // ── Filtered players for step 2 ───────────
  const filteredPlayers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allPlayers;
    return allPlayers.filter(p => p.name.toLowerCase().includes(q));
  }, [allPlayers, search]);

  // ── Selected players list (in order) ──────
  const selectedPlayers = useMemo(
    () => allPlayers.filter(p => selectedIds.has(p.id)),
    [allPlayers, selectedIds]
  );

  // ─────────────────────────────────────────────
  // Step 1 — Validate date & check duplicate
  // ─────────────────────────────────────────────
  const handleAdvanceStep1 = async () => {
    setDateError(null);
    setDuplicateMatchId(null);
    const iso = brToIso(dateInput);
    if (!iso) {
      setDateError('Data inválida. Use o formato dd/mm/aaaa.');
      return;
    }
    setCheckingDate(true);
    try {
      const { data } = await supabase
        .from('matches')
        .select('id')
        .eq('match_date', iso)
        .in('source', ['historical_manual', 'historical_import'])
        .maybeSingle();

      if (data) {
        setDuplicateMatchId(data.id);
        setDateError(`Já existe uma partida histórica registrada para ${dateInput}.`);
        setCheckingDate(false);
        return;
      }
    } catch {
      // ignore, allow advance
    }
    setCheckingDate(false);
    setStep(2);
  };

  // ─────────────────────────────────────────────
  // Step 2 — Player selection
  // ─────────────────────────────────────────────
  const togglePlayer = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredPlayers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPlayers.map(p => p.id)));
    }
  };

  const handleAdvanceStep2 = () => {
    if (selectedIds.size === 0) return;
    // initialise entries for newly selected players
    const initialEntries: Record<string, PlayerEntry> = {};
    selectedPlayers.forEach(p => {
      initialEntries[p.id] = entries[p.id] ?? {
        playerId: p.id,
        goals: 0,
        assists: 0,
        status: 'nenhum',
      };
    });
    setEntries(initialEntries);
    setStep(3);
  };

  // ─────────────────────────────────────────────
  // Step 3 — Stats
  // ─────────────────────────────────────────────
  const updateEntry = (playerId: string, field: 'goals' | 'assists', delta: number) => {
    setEntries(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: Math.max(0, (prev[playerId]?.[field] ?? 0) + delta),
      },
    }));
  };

  const setStatus = (playerId: string, status: MatchStatus) => {
    setEntries(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], status },
    }));
    setOpenStatusId(null);
  };

  // ─────────────────────────────────────────────
  // Save
  // ─────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const iso = brToIso(dateInput);

    try {
      // 1 — Create match
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert({
          match_date: iso,
          match_time: '00:00:00',
          location: 'Partida Histórica',
          status: 'finished',
          source: 'historical_manual',
          daily_total: 0,
          champion_team: null,
          runner_up_team: null,
          third_place_team: null,
          fourth_place_team: null,
        })
        .select('id')
        .single();

      if (matchError) throw matchError;
      const matchId = matchData.id;

      // 2 — Insert match_players (team = null for historical)
      const matchPlayersRows = selectedPlayers.map(p => ({
        match_id: matchId,
        player_id: p.id,
        team: null,
        category_at_match: p.category,
        daily_fee_at_match: 0,
      }));

      const { error: mpError } = await supabase
        .from('match_players')
        .insert(matchPlayersRows);

      if (mpError) throw mpError;

      // 3 — Insert match_player_stats
      const statsRows = selectedPlayers.map(p => {
        const e = entries[p.id];
        return {
          match_id: matchId,
          player_id: p.id,
          goals: e?.goals ?? 0,
          assists: e?.assists ?? 0,
          yellow_cards: 0,
          blue_cards: 0,
          red_cards: 0,
          is_ralabosta: e?.status === 'ralabosta',
          is_champion: e?.status === 'campeao',
          is_runner_up: e?.status === 'vice',
        };
      });

      const { error: statsError } = await supabase
        .from('match_player_stats')
        .insert(statsRows);

      if (statsError) throw statsError;

      setSaved(true);
    } catch (err: any) {
      console.error('Erro ao salvar partida histórica:', err);
      setSaveError(err.message || 'Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────
  // Shared styles
  // ─────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '16px',
    padding: '20px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    fontSize: '1rem',
    fontWeight: 600,
    boxSizing: 'border-box',
  };

  const btnPrimary: React.CSSProperties = {
    width: '100%',
    padding: '13px',
    backgroundColor: '#6366f1',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background 0.2s',
  };

  const btnSecondary: React.CSSProperties = {
    padding: '10px 16px',
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  // ─────────────────────────────────────────────
  // Step indicator
  // ─────────────────────────────────────────────
  const StepDot = ({ n }: { n: number }) => (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      backgroundColor: step >= n ? '#6366f1' : 'rgba(255,255,255,0.06)',
      border: step >= n ? '2px solid #818cf8' : '2px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.75rem', fontWeight: 800,
      color: step >= n ? '#fff' : 'var(--text-muted)',
      flexShrink: 0,
    }}>{n}</div>
  );

  // ─────────────────────────────────────────────
  // SUCCESS screen
  // ─────────────────────────────────────────────
  if (saved) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            backgroundColor: 'rgba(34,197,94,0.12)',
            border: '2px solid rgba(34,197,94,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <CheckCircle2 size={32} style={{ color: '#22c55e' }} />
          </div>
          <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#22c55e', margin: '0 0 8px' }}>
            Partida salva com sucesso!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 24px' }}>
            A partida de <strong style={{ color: 'var(--text-primary)' }}>{dateInput}</strong> foi registrada no Histórico com{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{selectedIds.size} jogadores</strong>.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <button
              onClick={() => {
                setSaved(false);
                setStep(1);
                setDateInput(isoToBr(todayISO()));
                setSelectedIds(new Set());
                setEntries({});
                setSearch('');
              }}
              style={btnPrimary}
            >
              <Calendar size={16} /> Lançar outra partida
            </button>
            <button onClick={onClose} style={btnSecondary}>
              Voltar às Configurações
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // HEADER + STEP INDICATOR (common)
  // ─────────────────────────────────────────────
  const Header = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={step === 1 ? onClose : () => setStep(s => (s - 1) as 1 | 2 | 3)}
          style={btnSecondary}
        >
          <ArrowLeft size={14} />
          {step === 1 ? 'Voltar' : 'Anterior'}
        </button>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Lançar Histórico Manual
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Partida histórica sem times
          </p>
        </div>
      </div>

      {/* Step dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {([1, 2, 3] as const).map((n, i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: n < 3 ? 1 : 0 }}>
            <StepDot n={n} />
            {i < 2 && (
              <div style={{
                flex: 1, height: 2,
                backgroundColor: step > n ? '#6366f1' : 'rgba(255,255,255,0.06)',
                borderRadius: 2,
              }} />
            )}
          </div>
        ))}
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
          {step === 1 ? 'Data' : step === 2 ? 'Jogadores' : 'Estatísticas'}
        </span>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────
  // STEP 1 — DATE
  // ─────────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Header />

        <div style={cardStyle}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <Calendar size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Data da Partida
          </label>
          <input
            type="text"
            placeholder="dd/mm/aaaa"
            value={dateInput}
            onChange={e => setDateInput(formatBrDate(e.target.value))}
            style={{
              ...inputStyle,
              borderColor: dateError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)',
            }}
            maxLength={10}
          />

          {dateError && (
            <div style={{
              marginTop: '10px', padding: '10px 12px', borderRadius: '10px',
              backgroundColor: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <AlertCircle size={14} />
              <span>{dateError}</span>
            </div>
          )}

          {duplicateMatchId && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '6px 0 0' }}>
              Para editar, acesse a partida pelo <strong>Histórico</strong>.
            </p>
          )}
        </div>

        <button
          onClick={handleAdvanceStep1}
          disabled={checkingDate || dateInput.length < 10}
          style={{
            ...btnPrimary,
            opacity: (checkingDate || dateInput.length < 10) ? 0.5 : 1,
            cursor: (checkingDate || dateInput.length < 10) ? 'not-allowed' : 'pointer',
          }}
        >
          {checkingDate ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={16} />}
          {checkingDate ? 'Verificando...' : 'Próximo — Selecionar Jogadores'}
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // STEP 2 — PLAYER SELECTION
  // ─────────────────────────────────────────────
  if (step === 2) {
    const allFiltered = filteredPlayers.length === selectedIds.size && filteredPlayers.length > 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Header />

        {/* Search + Select All */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar jogador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '36px', fontSize: '0.88rem' }}
            />
          </div>
          <button
            onClick={toggleAll}
            style={{
              ...btnSecondary,
              flexShrink: 0,
              color: allFiltered ? '#6366f1' : 'var(--text-secondary)',
              borderColor: allFiltered ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
            }}
          >
            <Users size={14} />
            {allFiltered ? 'Desmarcar' : 'Todos'}
          </button>
        </div>

        {/* Player list */}
        {loadingPlayers ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '52vh', overflowY: 'auto', paddingRight: '2px' }}>
            {filteredPlayers.map(p => {
              const sel = selectedIds.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlayer(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px',
                    backgroundColor: sel ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${sel ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Photo */}
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#1c1c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}

                  {/* Name + category */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.category}</div>
                  </div>

                  {/* Checkbox */}
                  <div style={{
                    width: 22, height: 22, borderRadius: '6px', flexShrink: 0,
                    backgroundColor: sel ? '#6366f1' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${sel ? '#818cf8' : 'rgba(255,255,255,0.12)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {sel && <Check size={13} style={{ color: '#fff' }} />}
                  </div>
                </button>
              );
            })}
            {filteredPlayers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Nenhum jogador encontrado.
              </div>
            )}
          </div>
        )}

        {/* Counter + advance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{selectedIds.size}</strong> jogador(es) selecionado(s)
          </div>
          <button
            onClick={handleAdvanceStep2}
            disabled={selectedIds.size === 0}
            style={{
              ...btnPrimary,
              opacity: selectedIds.size === 0 ? 0.4 : 1,
              cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <ArrowRight size={16} />
            Próximo — Informar Estatísticas
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // STEP 3 — STATS PER PLAYER
  // ─────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Header />

      {/* Summary */}
      <div style={{
        display: 'flex', gap: '10px', flexWrap: 'wrap',
        padding: '10px 14px', borderRadius: '10px',
        backgroundColor: 'rgba(99,102,241,0.07)',
        border: '1px solid rgba(99,102,241,0.15)',
        fontSize: '0.82rem', color: 'var(--text-secondary)'
      }}>
        <span>📅 <strong style={{ color: 'var(--text-primary)' }}>{dateInput}</strong></span>
        <span>👥 <strong style={{ color: 'var(--text-primary)' }}>{selectedIds.size}</strong> jogadores</span>
      </div>

      {/* Player stat cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '52vh', overflowY: 'auto', paddingRight: '2px' }}>
        {selectedPlayers.map(p => {
          const e = entries[p.id] ?? { playerId: p.id, goals: 0, assists: 0, status: 'nenhum' as MatchStatus };
          const isOpen = openStatusId === p.id;

          return (
            <div key={p.id} style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              padding: '12px',
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#1c1c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>
                )}
                <span style={{ fontWeight: 700, fontSize: '0.9rem', flex: 1 }}>{p.name}</span>
                {e.status !== 'nenhum' && (
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                    backgroundColor: e.status === 'campeao' ? 'rgba(251,191,36,0.12)' : e.status === 'vice' ? 'rgba(148,163,184,0.12)' : 'rgba(245,158,11,0.12)',
                    color: statusColor[e.status],
                  }}>
                    {statusLabel[e.status]}
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {/* Goals */}
                <div style={{ flex: 1, minWidth: '80px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Gols</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button onClick={() => updateEntry(p.id, 'goals', -1)} style={{ width: 28, height: 28, borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontWeight: 800, fontSize: '1rem', minWidth: '20px', textAlign: 'center' }}>{e.goals}</span>
                    <button onClick={() => updateEntry(p.id, 'goals', 1)} style={{ width: 28, height: 28, borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>

                {/* Assists */}
                <div style={{ flex: 1, minWidth: '80px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Assistências</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button onClick={() => updateEntry(p.id, 'assists', -1)} style={{ width: 28, height: 28, borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontWeight: 800, fontSize: '1rem', minWidth: '20px', textAlign: 'center' }}>{e.assists}</span>
                    <button onClick={() => updateEntry(p.id, 'assists', 1)} style={{ width: 28, height: 28, borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>

                {/* Status dropdown */}
                <div style={{ flex: 2, minWidth: '120px', position: 'relative' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Status</div>
                  <button
                    onClick={() => setOpenStatusId(isOpen ? null : p.id)}
                    style={{
                      width: '100%', padding: '6px 10px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: statusColor[e.status],
                      fontSize: '0.8rem', fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px',
                    }}
                  >
                    <span>{statusLabel[e.status]}</span>
                    <ChevronDown size={12} />
                  </button>

                  {isOpen && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: 0, right: 0,
                      marginBottom: '4px', zIndex: 10,
                      backgroundColor: '#1a1a2e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}>
                      {(['nenhum', 'campeao', 'vice', 'ralabosta'] as MatchStatus[]).map(s => (
                        <button
                          key={s}
                          onClick={() => setStatus(p.id, s)}
                          style={{
                            width: '100%', padding: '9px 12px', textAlign: 'left',
                            backgroundColor: e.status === s ? 'rgba(99,102,241,0.15)' : 'transparent',
                            border: 'none',
                            color: statusColor[s], fontSize: '0.82rem', fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {statusLabel[s]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save error */}
      {saveError && (
        <div style={{
          padding: '10px 12px', borderRadius: '10px',
          backgroundColor: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <AlertCircle size={14} />{saveError}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{ ...btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
      >
        {saving
          ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</>
          : <><Trophy size={16} /> Salvar Partida Histórica</>}
      </button>
    </div>
  );
}
