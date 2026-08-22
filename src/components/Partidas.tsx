import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { invalidateCache } from '../services/dataCache';
import { 
  Calendar, 
  MapPin, 
  Search, 
  User, 
  Check, 
  Users, 
  AlertCircle, 
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Shuffle,
  RotateCcw,
  MoreVertical,
  Plus,
  Play,
  CheckCircle2,
  Trophy,
  Shield,
  Trash2
} from 'lucide-react';

interface Player {
  id: string;
  name: string;
  birth_date: string;
  position: string | null;
  category: 'Mensalista' | 'Diarista';
  fee: number | null;
  photo_url: string | null;
  is_active: boolean;
}

interface MatchPlayer {
  id: string;
  match_id: string;
  player_id: string;
  team: 'brasil' | 'portugal' | 'japao' | 'uruguai';
  category_at_match: 'Mensalista' | 'Diarista';
  daily_fee_at_match: number;
  player: {
    name: string;
    photo_url: string | null;
    position: string | null;
  };
}

interface PlayerStat {
  id: string;
  match_id: string;
  player_id: string;
  goals: number;
  assists: number;
  yellow_cards: number;
  blue_cards: number;
  red_cards: number;
  is_ralabosta: boolean;
}

interface Match {
  id: string;
  match_date: string;
  match_time: string;
  location: string;
  status: 'in_progress' | 'finished';
  source?: string | null;
  daily_total: number;
  champion_team?: string | null;
  runner_up_team?: string | null;
  third_place_team?: string | null;
  fourth_place_team?: string | null;
  team_count?: number;
  players_per_team?: number;
  finished_at?: string | null;
  created_at: string;
  match_players?: MatchPlayer[];
  match_player_stats?: PlayerStat[];
}

interface PartidasProps {
  mode?: 'partidas' | 'historico';
  userRole: 'admin' | 'assistant' | 'visitor' | 'treasurer';
  can: (action: any) => boolean;
}

export default function Partidas({ mode = 'partidas', userRole, can }: PartidasProps) {
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // View state: 'list' (History) | 'create' (Wizard) | 'edit' (Editing details) | 'stats' (Launching stats)
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'stats'>('list');
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  // Wizard Step state: 'config' (Setup & Selection) | 'teams' (Teams Distribution)
  const [step, setStep] = useState<'config' | 'teams'>('config');

  // New State: Number of teams for the draw
  const [numberOfTeams, setNumberOfTeams] = useState<2 | 3 | 4>(4);

  // Database lists
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [lastChampionInfo, setLastChampionInfo] = useState<{ team: string, playerIds: Set<string> } | null>(null);
  const [defaultDailyFee, setDefaultDailyFee] = useState(20);
  
  // Loading & feedback states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Expanded match IDs in history list
  const [expandedMatchIds, setExpandedMatchIds] = useState<Set<string>>(new Set());

  // Form fields (defaults: current date, 10:30, empty until loaded)
  const [matchDate, setMatchDate] = useState(getTodayDateString());
  const [matchTime, setMatchTime] = useState('10:30');
  const [matchLocation, setMatchLocation] = useState('');
  
  // Selection & Search states
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Teams States
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [teamBrasil, setTeamBrasil] = useState<Player[]>([]);
  const [teamPortugal, setTeamPortugal] = useState<Player[]>([]);
  const [teamJapao, setTeamJapao] = useState<Player[]>([]);
  const [teamUruguai, setTeamUruguai] = useState<Player[]>([]);

  // Manual Draw selection state
  const [selectedPlayerForDraw, setSelectedPlayerForDraw] = useState<Player | null>(null);
  
  // Team menu active popover state
  const [activeTeamMenu, setActiveTeamMenu] = useState<{ playerId: string; teamName: string } | null>(null);

  // Stats view states
  const [activeMatchForStats, setActiveMatchForStats] = useState<Match | null>(null);
  const [localStats, setLocalStats] = useState<{ [playerId: string]: { goals: number; assists: number; yellow: number; blue: number; red: number } }>({});
  const [championTeam, setChampionTeam] = useState<string>('');
  const [runnerUpTeam, setRunnerUpTeam] = useState<string>('');
  const [thirdPlaceTeam, setThirdPlaceTeam] = useState<string>('');
  const [fourthPlaceTeam, setFourthPlaceTeam] = useState<string>('');
  const [expandedTeamsStats, setExpandedTeamsStats] = useState<{ [teamCode: string]: boolean }>({
    brasil: false,
    portugal: false,
    japao: false,
    uruguai: false
  });
  
  // Custom Dropdown states
  const [activeClassSelect, setActiveClassSelect] = useState<'champion' | 'runnerUp' | 'third' | 'fourth' | null>(null);

  // Confirmation state for finalization
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  // Fetch players, settings, and matches from Supabase
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // 1. Load players
        const { data: playersData, error: fetchError } = await supabase
          .from('players')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (fetchError) throw fetchError;

        const mappedPlayers = (playersData || []).map((p: any) => ({
          ...p,
          category: (p.category === 'mensalista' || p.category === 'Mensalista') ? 'Mensalista' : 'Diarista'
        }));
        setPlayers(mappedPlayers);

        // 2. Load settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('daily_fee, default_location')
          .eq('id', 'default')
          .single();

        if (settingsError) {
          console.warn('Erro ao carregar configurações, usando padrões:', settingsError.message);
          setDefaultDailyFee(20);
          setMatchLocation('Arena Ouro Preto');
        } else if (settingsData) {
          setDefaultDailyFee(Number(settingsData.daily_fee));
          setMatchLocation(settingsData.default_location || 'Arena Ouro Preto');
        }

        // 3. Load matches with players
        await fetchMatchesList();

      } catch (err: any) {
        console.error('Erro ao carregar dados iniciais:', err);
        setError('Não foi possível carregar as partidas.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [mode]);

  // Fetch matches helper
  const fetchMatchesList = async () => {
    let query = supabase
      .from('matches')
      .select(`
        *,
        match_players (
          *,
          player:players (
            name,
            photo_url,
            position
          )
        ),
        match_player_stats (
          *
        )
      `);

    if (mode === 'partidas') {
      query = query.eq('status', 'in_progress');
    } else {
      query = query.eq('status', 'finished');
    }

    const { data: matchesData, error: matchesError } = await query
      .order('match_date', { ascending: false })
      .order('match_time', { ascending: false });

    if (matchesError) {
      if (matchesError.code === 'PGRST116' || matchesError.message.includes('matches')) {
        console.log('Tabela matches não encontrada.');
        setMatches([]);
      } else {
        throw matchesError;
      }
    } else {
      setMatches(matchesData || []);
    }
  };

  // Delete match
  const handleDeleteMatch = async (matchId: string) => {
    if (!can('edit_match')) {
      alert('Você não tem permissão para excluir partidas.');
      return;
    }
    if (!confirm('Tem certeza que deseja excluir esta partida? Isso também removerá as estatísticas associadas a ela.')) return;
    try {
      setLoading(true);
      // Delete child records first
      await supabase.from('match_player_stats').delete().eq('match_id', matchId);
      await supabase.from('match_players').delete().eq('match_id', matchId);
      
      const { error } = await supabase.from('matches').delete().eq('id', matchId);
      if (error) throw error;
      
      invalidateCache('matches');
      await fetchMatchesList(); // Reload list
    } catch (err: any) {
      console.error('Erro ao excluir partida:', err);
      alert(`Erro ao excluir partida: ${err.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (activeTeamMenu) {
        if (!target.closest('.team-menu-trigger') && !target.closest('.team-dropdown-menu')) {
          setActiveTeamMenu(null);
        }
      }
      if (activeClassSelect) {
        if (!target.closest('.class-dropdown-trigger') && !target.closest('.class-dropdown-menu')) {
          setActiveClassSelect(null);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeTeamMenu, activeClassSelect]);

  // Filter players based on search query
  const filteredPlayers = players.filter(player => 
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle single player selection
  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
    setValidationError(null);
  };

  // Toggle select all
  const isAllSelected = filteredPlayers.length > 0 && filteredPlayers.every(p => selectedPlayerIds.has(p.id));
  const isSomeSelected = filteredPlayers.length > 0 && filteredPlayers.some(p => selectedPlayerIds.has(p.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedPlayerIds(prev => {
        const next = new Set(prev);
        filteredPlayers.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedPlayerIds(prev => {
        const next = new Set(prev);
        filteredPlayers.forEach(p => next.add(p.id));
        return next;
      });
    }
  };

  // Calculations
  const selectedPlayers = players.filter(p => selectedPlayerIds.has(p.id));
  const totalSelected = selectedPlayers.length;
  const totalMensalistas = selectedPlayers.filter(p => p.category === 'Mensalista').length;
  const totalDiaristas = selectedPlayers.filter(p => p.category === 'Diarista').length;

  // Sum only diaristas' fees using EXCLUSIVELY defaultDailyFee in cents
  const defaultDailyFeeInCents = Math.round(defaultDailyFee * 100);
  const totalEstimatedFees = (totalDiaristas * defaultDailyFeeInCents) / 100;

  // Active Teams Logic
  const getActiveTeams = () => {
    const champTeamStr = lastChampionInfo?.team || null;
    const defaultOrder = ['brasil', 'portugal', 'japao', 'uruguai'];
    const active = defaultOrder.slice(0, numberOfTeams);
    if (champTeamStr && !active.includes(champTeamStr)) {
      active[active.length - 1] = champTeamStr;
    }
    return active;
  };

  // Transition from Selection (config) to Teams
  const handleContinueToTeams = async () => {
    if (!matchDate) {
      setValidationError('Por favor, informe a data da partida.');
      return;
    }
    if (!matchTime) {
      setValidationError('Por favor, informe o horário da partida.');
      return;
    }
    if (!matchLocation.trim()) {
      setValidationError('Por favor, informe o local da partida.');
      return;
    }
    if (totalSelected === 0) {
      setValidationError('Por favor, selecione pelo menos 1 jogador para participar.');
      return;
    }

    setValidationError(null);
    setSaving(true);
    
    // Initialize available players if selection changed
    const currentSelectionIds = new Set(selectedPlayers.map(p => p.id));
    const currentDistributedIds = new Set([
      ...teamBrasil.map(p => p.id),
      ...teamPortugal.map(p => p.id),
      ...teamJapao.map(p => p.id),
      ...teamUruguai.map(p => p.id),
      ...availablePlayers.map(p => p.id)
    ]);

    const isSelectionChanged = 
      currentSelectionIds.size !== currentDistributedIds.size || 
      !Array.from(currentSelectionIds).every(id => currentDistributedIds.has(id));

    if (isSelectionChanged) {
      let champTeamStr: string | null = null;
      let champPlayerIds = new Set<string>();

      try {
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('id, champion_team')
          .eq('status', 'finished')
          .not('champion_team', 'is', null)
          .order('match_date', { ascending: false })
          .order('match_time', { ascending: false })
          .limit(1);

        if (!matchesError && matchesData && matchesData.length > 0) {
          const lastMatch = matchesData[0];
          champTeamStr = lastMatch.champion_team;
          
          const { data: playersData, error: playersError } = await supabase
            .from('match_players')
            .select('player_id')
            .eq('match_id', lastMatch.id)
            .eq('team', champTeamStr);

          if (!playersError && playersData) {
            champPlayerIds = new Set(playersData.map(p => p.player_id));
          }
        }
      } catch (err) {
        console.error("Erro ao buscar último campeão:", err);
      }

      const championInfo = champTeamStr ? { team: champTeamStr, playerIds: champPlayerIds } : null;
      setLastChampionInfo(championInfo);

      // We pass championInfo locally here since state won't update synchronously for getActiveTeams below
      const defaultOrder = ['brasil', 'portugal', 'japao', 'uruguai'];
      const active = defaultOrder.slice(0, numberOfTeams);
      if (champTeamStr && !active.includes(champTeamStr)) {
        active[active.length - 1] = champTeamStr;
      }

      const shouldFixChampions = champTeamStr && active.includes(champTeamStr);
      const fixedChampions = selectedPlayers.filter(p => shouldFixChampions && champPlayerIds.has(p.id));
      const remainingPlayers = selectedPlayers.filter(p => !(shouldFixChampions && champPlayerIds.has(p.id)));

      console.log('--- LOG TEMPORÁRIO PARA VALIDAÇÃO (Regra do Campeão) ---');
      console.log('lastChampionTeam:', champTeamStr);
      console.log('championPlayerIds:', Array.from(champPlayerIds));
      console.log('selectedPlayerIds:', selectedPlayers.map(p => p.id));
      console.log('selectedChampionIds:', fixedChampions.map(p => p.id));
      console.log('remainingPlayerIds:', remainingPlayers.map(p => p.id));
      console.log('----------------------------------------------------------');

      setAvailablePlayers(remainingPlayers);
      setTeamBrasil(shouldFixChampions && champTeamStr === 'brasil' ? fixedChampions : []);
      setTeamPortugal(shouldFixChampions && champTeamStr === 'portugal' ? fixedChampions : []);
      setTeamJapao(shouldFixChampions && champTeamStr === 'japao' ? fixedChampions : []);
      setTeamUruguai(shouldFixChampions && champTeamStr === 'uruguai' ? fixedChampions : []);
      setSelectedPlayerForDraw(null);
    }

    setSaving(false);
    setStep('teams');
  };

  // Move Player manual draw helper
  const movePlayer = (player: Player, from: string, to: string) => {
    if (to !== 'disponiveis') {
      let destTeamLength = 0;
      if (to === 'brasil') destTeamLength = teamBrasil.length;
      if (to === 'portugal') destTeamLength = teamPortugal.length;
      if (to === 'japao') destTeamLength = teamJapao.length;
      if (to === 'uruguai') destTeamLength = teamUruguai.length;
      if (destTeamLength >= 6) {
        alert('Este time já atingiu o limite de 6 vagas!');
        return;
      }
    }

    const remove = (list: Player[]) => list.filter(p => p.id !== player.id);
    const add = (list: Player[]) => [...list, player];

    if (from === 'brasil') setTeamBrasil(remove(teamBrasil));
    if (from === 'portugal') setTeamPortugal(remove(teamPortugal));
    if (from === 'japao') setTeamJapao(remove(teamJapao));
    if (from === 'uruguai') setTeamUruguai(remove(teamUruguai));
    if (from === 'disponiveis') setAvailablePlayers(remove(availablePlayers));

    if (to === 'brasil') setTeamBrasil(add(teamBrasil));
    if (to === 'portugal') setTeamPortugal(add(teamPortugal));
    if (to === 'japao') setTeamJapao(add(teamJapao));
    if (to === 'uruguai') setTeamUruguai(add(teamUruguai));
    if (to === 'disponiveis') setAvailablePlayers(add(availablePlayers).sort((a, b) => a.name.localeCompare(b.name)));
    
    setSelectedPlayerForDraw(null);
    setActiveTeamMenu(null);
  };

  // Clear teams
  const clearTeams = () => {
    setAvailablePlayers(selectedPlayers);
    setTeamBrasil([]);
    setTeamPortugal([]);
    setTeamJapao([]);
    setTeamUruguai([]);
    setSelectedPlayerForDraw(null);
    setActiveTeamMenu(null);
    setValidationError(null);
  };

  // Sorteio Flash algorithm
  const runFlashSorteio = () => {
    const champTeamStr = lastChampionInfo?.team || null;
    const champPlayerIds = lastChampionInfo?.playerIds || new Set<string>();
    
    const active = getActiveTeams();
    const shouldFixChampions = champTeamStr && active.includes(champTeamStr);

    const fixedChampions = selectedPlayers.filter(p => shouldFixChampions && champPlayerIds.has(p.id));
    const playersToDraw = selectedPlayers.filter(p => !(shouldFixChampions && champPlayerIds.has(p.id)));

    const brasil: Player[] = shouldFixChampions && champTeamStr === 'brasil' ? [...fixedChampions] : [];
    const portugal: Player[] = shouldFixChampions && champTeamStr === 'portugal' ? [...fixedChampions] : [];
    const japao: Player[] = shouldFixChampions && champTeamStr === 'japao' ? [...fixedChampions] : [];
    const uruguai: Player[] = shouldFixChampions && champTeamStr === 'uruguai' ? [...fixedChampions] : [];

    const activeTeamLists: { name: string, list: Player[] }[] = [];
    if (active.includes('brasil')) activeTeamLists.push({ name: 'brasil', list: brasil });
    if (active.includes('portugal')) activeTeamLists.push({ name: 'portugal', list: portugal });
    if (active.includes('japao')) activeTeamLists.push({ name: 'japao', list: japao });
    if (active.includes('uruguai')) activeTeamLists.push({ name: 'uruguai', list: uruguai });

    const groups: { [key: string]: Player[] } = {
      'Goleiro': [],
      'Zagueiro': [],
      'Volante': [],
      'Meia': [],
      'Atacante': [],
      'Outros': []
    };

    playersToDraw.forEach(p => {
      const pos = p.position || 'Sem posição';
      if (pos === 'Goleiro' || pos === 'Zagueiro' || pos === 'Volante' || pos === 'Meia' || pos === 'Atacante') {
        groups[pos].push(p);
      } else {
        groups['Outros'].push(p);
      }
    });

    const shuffle = <T,>(arr: T[]): T[] => {
      return [...arr].sort(() => Math.random() - 0.5);
    };

    const shuffledGroups = {
      'Goleiro': shuffle(groups['Goleiro']),
      'Zagueiro': shuffle(groups['Zagueiro']),
      'Midfielders': shuffle([...groups['Meia'], ...groups['Volante']]),
      'Atacante': shuffle(groups['Atacante']),
      'Outros': shuffle(groups['Outros'])
    };

    const orderedPlayers: Player[] = [
      ...shuffledGroups['Goleiro'],
      ...shuffledGroups['Zagueiro'],
      ...shuffledGroups['Midfielders'],
      ...shuffledGroups['Atacante'],
      ...shuffledGroups['Outros']
    ];

    let remainingAvailable: Player[] = [];
    
    orderedPlayers.forEach(player => {
      let minSize = Infinity;
      let candidateTeams: Player[][] = [];

      activeTeamLists.forEach(t => {
        if (t.list.length < 6) {
          if (t.list.length < minSize) {
            minSize = t.list.length;
            candidateTeams = [t.list];
          } else if (t.list.length === minSize) {
            candidateTeams.push(t.list);
          }
        }
      });

      if (candidateTeams.length > 0) {
        const chosenTeam = candidateTeams[Math.floor(Math.random() * candidateTeams.length)];
        chosenTeam.push(player);
      } else {
        remainingAvailable.push(player);
      }
    });

    setTeamBrasil(active.includes('brasil') ? brasil : []);
    setTeamPortugal(active.includes('portugal') ? portugal : []);
    setTeamJapao(active.includes('japao') ? japao : []);
    setTeamUruguai(active.includes('uruguai') ? uruguai : []);
    setAvailablePlayers(remainingAvailable.sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedPlayerForDraw(null);
    setActiveTeamMenu(null);
    setValidationError(null);
  };

  // Scroll to team helper
  const scrollToTeam = (teamId: string) => {
    document.getElementById(teamId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Expand/collapse match details helper
  const toggleMatchExpansion = (matchId: string) => {
    setExpandedMatchIds(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      return next;
    });
  };

  // SAVE OR UPDATE MATCH IN SUPABASE
  const saveMatch = async () => {
    if (editingMatchId ? !can('edit_match') : !can('create_match')) {
      alert('Você não tem permissão para realizar esta ação.');
      return;
    }
    if (!matchDate) {
      setValidationError('Por favor, informe a data da partida.');
      return;
    }
    if (!matchTime) {
      setValidationError('Por favor, informe o horário da partida.');
      return;
    }
    if (!matchLocation.trim()) {
      setValidationError('Por favor, informe o local da partida.');
      return;
    }
    const allAssigned = [...teamBrasil, ...teamPortugal, ...teamJapao, ...teamUruguai];
    const uniqueIds = new Set(allAssigned.map(p => p.id));
    if (uniqueIds.size !== allAssigned.length) {
      setValidationError('Erro de integridade: Existem jogadores duplicados nos times.');
      return;
    }
    // We no longer require all players to be assigned
    // if (uniqueIds.size !== totalSelected) {
    //   setValidationError('Erro de integridade: A quantidade de jogadores nos times difere da seleção.');
    //   return;
    // }

    setValidationError(null);
    setSaving(true);

    try {
      if (view === 'create') {
        // --- NEW MATCH FLOW ---
        const { data: matchData, error: matchInsertError } = await supabase
          .from('matches')
          .insert({
            match_date: matchDate,
            match_time: matchTime,
            location: matchLocation.trim(),
            status: 'in_progress',
            daily_total: totalEstimatedFees,
            team_count: numberOfTeams,
            players_per_team: 6
          })
          .select()
          .single();

        if (matchInsertError) throw matchInsertError;
        const newMatchId = matchData.id;

        const matchPlayersRows = [
          ...teamBrasil.map(p => ({
            match_id: newMatchId,
            player_id: p.id,
            team: 'brasil',
            category_at_match: p.category,
            daily_fee_at_match: p.category === 'Diarista' ? (p.fee && p.fee > 0 ? p.fee : defaultDailyFee) : 0
          })),
          ...teamPortugal.map(p => ({
            match_id: newMatchId,
            player_id: p.id,
            team: 'portugal',
            category_at_match: p.category,
            daily_fee_at_match: p.category === 'Diarista' ? (p.fee && p.fee > 0 ? p.fee : defaultDailyFee) : 0
          })),
          ...teamJapao.map(p => ({
            match_id: newMatchId,
            player_id: p.id,
            team: 'japao',
            category_at_match: p.category,
            daily_fee_at_match: p.category === 'Diarista' ? (p.fee && p.fee > 0 ? p.fee : defaultDailyFee) : 0
          })),
          ...teamUruguai.map(p => ({
            match_id: newMatchId,
            player_id: p.id,
            team: 'uruguai',
            category_at_match: p.category,
            daily_fee_at_match: p.category === 'Diarista' ? (p.fee && p.fee > 0 ? p.fee : defaultDailyFee) : 0
          })),
          ...availablePlayers.map(p => ({
            match_id: newMatchId,
            player_id: p.id,
            team: null,
            category_at_match: p.category,
            daily_fee_at_match: p.category === 'Diarista' ? (p.fee && p.fee > 0 ? p.fee : defaultDailyFee) : 0
          }))
        ];

        const { error: mpInsertError } = await supabase
          .from('match_players')
          .insert(matchPlayersRows);

        if (mpInsertError) {
          await supabase.from('matches').delete().eq('id', newMatchId);
          throw mpInsertError;
        }

      } else if (view === 'edit' && editingMatchId) {
        // --- EDIT MATCH FLOW ---
        const matchBeingEdited = matches.find(m => m.id === editingMatchId);
        const isEditingFinishedMatch = matchBeingEdited?.status === 'finished';
        const dailyTotalToSave = isEditingFinishedMatch ? matchBeingEdited.daily_total : totalEstimatedFees;

        const { error: matchUpdateError } = await supabase
          .from('matches')
          .update({
            match_date: matchDate,
            match_time: matchTime,
            location: matchLocation.trim(),
            daily_total: dailyTotalToSave,
            team_count: numberOfTeams,
            players_per_team: 6
          })
          .eq('id', editingMatchId);

        if (matchUpdateError) throw matchUpdateError;

        const { error: deleteMpError } = await supabase
          .from('match_players')
          .delete()
          .eq('match_id', editingMatchId);

        if (deleteMpError) throw deleteMpError;

        const getPlayerFee = (p: Player) => {
          if (isEditingFinishedMatch) {
            const existingPlayer = matchBeingEdited.match_players?.find(mp => mp.player_id === p.id);
            if (existingPlayer) {
              return existingPlayer.daily_fee_at_match;
            }
          }
          return p.category === 'Diarista' ? (p.fee && p.fee > 0 ? p.fee : defaultDailyFee) : 0;
        };

        const matchPlayersRows = [
          ...teamBrasil.map(p => ({
            match_id: editingMatchId,
            player_id: p.id,
            team: 'brasil',
            category_at_match: p.category,
            daily_fee_at_match: getPlayerFee(p)
          })),
          ...teamPortugal.map(p => ({
            match_id: editingMatchId,
            player_id: p.id,
            team: 'portugal',
            category_at_match: p.category,
            daily_fee_at_match: getPlayerFee(p)
          })),
          ...teamJapao.map(p => ({
            match_id: editingMatchId,
            player_id: p.id,
            team: 'japao',
            category_at_match: p.category,
            daily_fee_at_match: getPlayerFee(p)
          })),
          ...teamUruguai.map(p => ({
            match_id: editingMatchId,
            player_id: p.id,
            team: 'uruguai',
            category_at_match: p.category,
            daily_fee_at_match: getPlayerFee(p)
          })),
          ...availablePlayers.map(p => ({
            match_id: editingMatchId,
            player_id: p.id,
            team: null,
            category_at_match: p.category,
            daily_fee_at_match: getPlayerFee(p)
          }))
        ];

        const { error: mpInsertError } = await supabase
          .from('match_players')
          .insert(matchPlayersRows);

        if (mpInsertError) throw mpInsertError;

        if (isEditingFinishedMatch) {
          const { data: updatedMatchData } = await supabase
            .from('matches')
            .select(`
              *,
              match_players (
                *,
                player:players (
                  name,
                  photo_url,
                  position
                )
              ),
              match_player_stats (
                *
              )
            `)
            .eq('id', editingMatchId)
            .single();

          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            if (updatedMatchData) {
              handleOpenStats(updatedMatchData);
            } else {
              setView('list');
              resetWizardStates();
            }
          }, 1000);
          return;
        }
      }

      await fetchMatchesList();

      setShowSuccessMessage(true);
      setTimeout(() => {
        setView('list');
        resetWizardStates();
      }, 1000);

    } catch (err: any) {
      console.error('Erro técnico ao salvar partida no Supabase:', {
        code: err?.code,
        message: err?.message,
        details: err?.details,
        hint: err?.hint
      });
      setValidationError('Não foi possível salvar a partida.');
    } finally {
      setSaving(false);
    }
  };

  // Reset wizard states helper
  const resetWizardStates = () => {
    setStep('config');
    setMatchDate(getTodayDateString());
    setMatchTime('10:30');
    setValidationError(null);
    setShowSuccessMessage(false);
    setSelectedPlayerIds(new Set());
    setSearchQuery('');
    setAvailablePlayers([]);
    setTeamBrasil([]);
    setTeamPortugal([]);
    setTeamJapao([]);
    setTeamUruguai([]);
    setSelectedPlayerForDraw(null);
    setActiveTeamMenu(null);
    setEditingMatchId(null);
    setActiveMatchForStats(null);
    setLocalStats({});
    setChampionTeam('');
    setRunnerUpTeam('');
    setThirdPlaceTeam('');
    setFourthPlaceTeam('');
    setActiveClassSelect(null);
    setShowFinalizeConfirm(false);
    setExpandedTeamsStats({
      brasil: false,
      portugal: false,
      japao: false,
      uruguai: false
    });
  };

  // Trigger editing existing match
  const handleEditMatch = (match: Match) => {
    if (!can('edit_match')) {
      alert('Você não tem permissão para editar partidas.');
      return;
    }
    setEditingMatchId(match.id);
    setMatchDate(match.match_date);
    setMatchTime(match.match_time.slice(0, 5));
    setMatchLocation((match.location || '').split('|')[0]);
    
    if (match.team_count === 2 || match.team_count === 3 || match.team_count === 4) {
      setNumberOfTeams(match.team_count as 2 | 3 | 4);
    } else {
      setNumberOfTeams(4);
    }

    const participantIds = new Set((match.match_players || []).map(mp => mp.player_id));
    setSelectedPlayerIds(participantIds);

    const brasilList: Player[] = [];
    const portugalList: Player[] = [];
    const japaoList: Player[] = [];
    const uruguaiList: Player[] = [];

    (match.match_players || []).forEach(mp => {
      const originalPlayer = players.find(pl => pl.id === mp.player_id);
      const mappedPlayer: Player = originalPlayer ? {
        ...originalPlayer,
        category: mp.category_at_match
      } : {
        id: mp.player_id,
        name: mp.player?.name || 'Jogador Excluído',
        birth_date: '',
        position: mp.player?.position || null,
        category: mp.category_at_match,
        fee: mp.daily_fee_at_match,
        photo_url: mp.player?.photo_url || null,
        is_active: true
      };

      if (mp.team === 'brasil') brasilList.push(mappedPlayer);
      if (mp.team === 'portugal') portugalList.push(mappedPlayer);
      if (mp.team === 'japao') japaoList.push(mappedPlayer);
      if (mp.team === 'uruguai') uruguaiList.push(mappedPlayer);
    });

    setTeamBrasil(brasilList);
    setTeamPortugal(portugalList);
    setTeamJapao(japaoList);
    setTeamUruguai(uruguaiList);
    
    const distributedIds = new Set([
      ...brasilList.map(p => p.id),
      ...portugalList.map(p => p.id),
      ...japaoList.map(p => p.id),
      ...uruguaiList.map(p => p.id)
    ]);
    const selectedPlayersFiltered = players.filter(p => participantIds.has(p.id));
    const undeliveredPlayers = selectedPlayersFiltered.filter(p => !distributedIds.has(p.id));
    setAvailablePlayers(undeliveredPlayers); 

    setStep('config');
    setView('edit');
    setValidationError(null);
    setShowSuccessMessage(false);
  };

  // Trigger Stats editor view
  const handleOpenStats = (match: Match) => {
    setActiveMatchForStats(match);
    
    // Set classification fields if exist
    setChampionTeam(match.champion_team || '');
    setRunnerUpTeam(match.runner_up_team || '');
    setThirdPlaceTeam(match.third_place_team || '');
    setFourthPlaceTeam(match.fourth_place_team || '');

    // Map existing stats to localState
    const initialStats: { [playerId: string]: { goals: number; assists: number; yellow: number; blue: number; red: number } } = {};

    (match.match_players || []).forEach(mp => {
      if (mp.category_at_match === 'Mensalista') {
        const foundStat = (match.match_player_stats || []).find(st => st.player_id === mp.player_id);
        
        initialStats[mp.player_id] = {
          goals: foundStat?.goals || 0,
          assists: foundStat?.assists || 0,
          yellow: foundStat?.yellow_cards || 0,
          blue: foundStat?.blue_cards || 0,
          red: foundStat?.red_cards || 0
        };
      }
    });

    setLocalStats(initialStats);

    setView('stats');
    setValidationError(null);
    setShowSuccessMessage(false);
  };

  // Stats increment/decrement helper
  const handleUpdateStat = (playerId: string, field: 'goals' | 'assists' | 'yellow' | 'blue' | 'red', delta: number) => {
    setLocalStats(prev => {
      const current = prev[playerId] || { goals: 0, assists: 0, yellow: 0, blue: 0, red: 0 };
      const nextValue = Math.max(0, current[field] + delta);
      return {
        ...prev,
        [playerId]: {
          ...current,
          [field]: nextValue
        }
      };
    });
    setValidationError(null);
  };

  // Save Stats in Supabase
  const handleSaveStats = async (isFinalizingFlow = false) => {
    if (userRole === 'visitor') {
      alert('Você não tem permissão para salvar estatísticas.');
      return false;
    }
    if (!activeMatchForStats) return false;

    // Check classification uniqueness if any is filled
    const filledTeams = [championTeam, runnerUpTeam, thirdPlaceTeam, fourthPlaceTeam].filter(t => t !== '');
    const uniqueFilledTeams = new Set(filledTeams);
    if (filledTeams.length !== uniqueFilledTeams.size) {
      setValidationError('Cada time deve ocupar apenas uma posição na classificação.');
      return false;
    }

    setValidationError(null);
    setSaving(true);

    try {
      // 1. Update matches classification teams
      const { error: matchUpdateError } = await supabase
        .from('matches')
        .update({
          champion_team: championTeam || null,
          runner_up_team: runnerUpTeam || null,
          third_place_team: thirdPlaceTeam || null,
          fourth_place_team: fourthPlaceTeam || null
        })
        .eq('id', activeMatchForStats.id);

      if (matchUpdateError) throw matchUpdateError;

      // 2. Prepare match_player_stats upsert rows (Only for Mensalistas)
      const statsRows = Object.entries(localStats).map(([playerId, stats]) => {
        const mp = (activeMatchForStats.match_players || []).find(p => p.player_id === playerId);
        const isRalabosta = mp?.team === fourthPlaceTeam;

        return {
          match_id: activeMatchForStats.id,
          player_id: playerId,
          goals: stats.goals,
          assists: stats.assists,
          yellow_cards: stats.yellow,
          blue_cards: stats.blue,
          red_cards: stats.red,
          is_ralabosta: isRalabosta,
          updated_at: new Date().toISOString()
        };
      });

      if (statsRows.length > 0) {
        // PostgREST upsert works with unique constraint unique_match_player_stats
        const { error: upsertError } = await supabase
          .from('match_player_stats')
          .upsert(statsRows, { onConflict: 'match_id, player_id' });

        if (upsertError) throw upsertError;
      }

      // Re-fetch matches from database
      await fetchMatchesList();

      if (!isFinalizingFlow) {
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setView('list');
          resetWizardStates();
        }, 1000);
      }
      return true;
    } catch (err: any) {
      console.error('Erro técnico ao salvar estatísticas no Supabase:', {
        code: err?.code,
        message: err?.message,
        details: err?.details,
        hint: err?.hint
      });
      setValidationError('Não foi possível salvar as estatísticas.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Finalize Match Flow
  const handleFinalizeMatch = async () => {
    if (userRole === 'visitor') {
      alert('Você não tem permissão para finalizar partidas.');
      return;
    }
    if (!activeMatchForStats) return;

    // Must have complete classification
    if (!championTeam || !runnerUpTeam || !thirdPlaceTeam || !fourthPlaceTeam) {
      setValidationError('Por favor, defina todas as posições da classificação antes de finalizar.');
      return;
    }

    // First save the stats and classification
    const saveSucceeded = await handleSaveStats(true);
    if (!saveSucceeded) return;

    setSaving(true);
    try {
      // Update status to finished
      const { error: finalizeError } = await supabase
        .from('matches')
        .update({
          status: 'finished',
          finished_at: activeMatchForStats.status === 'finished' ? (activeMatchForStats.finished_at || new Date().toISOString()) : new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', activeMatchForStats.id);

      if (finalizeError) throw finalizeError;

      await fetchMatchesList();
      
      setShowSuccessMessage(true);
      setShowFinalizeConfirm(false);
      setTimeout(() => {
        setView('list');
        resetWizardStates();
      }, 1000);

    } catch (err: any) {
      console.error('Erro técnico ao finalizar partida no Supabase:', {
        code: err?.code,
        message: err?.message,
        details: err?.details,
        hint: err?.hint
      });
      setValidationError('Não foi possível finalizar a partida.');
    } finally {
      setSaving(false);
    }
  };

  // Custom Dropdown Helper for Classification Positions
  const getAvailableTeamsForPosition = (pos: 'champion' | 'runnerUp' | 'third' | 'fourth') => {
    const selected = new Set<string>();
    if (pos !== 'champion' && championTeam) selected.add(championTeam);
    if (pos !== 'runnerUp' && runnerUpTeam) selected.add(runnerUpTeam);
    if (pos !== 'third' && thirdPlaceTeam) selected.add(thirdPlaceTeam);
    if (pos !== 'fourth' && fourthPlaceTeam) selected.add(fourthPlaceTeam);
    
    const allTeams = [
      { id: 'brasil', label: 'BRASIL', color: '#22c55e' },
      { id: 'portugal', label: 'PORTUGAL', color: '#ef4444' },
      { id: 'japao', label: 'JAPÃO', color: '#ffffff' },
      { id: 'uruguai', label: 'URUGUAI', color: '#38bdf8' }
    ];
    
    return allTeams.filter(t => !selected.has(t.id));
  };

  // Calculations for Step 2

  if (loading) {
    return (
      <div className="dashboard-card" style={{ padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div className="loader-spinner" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--text-secondary)', marginTop: '16px', fontSize: '0.9rem' }}>Carregando dados...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-card" style={{ padding: '32px', textAlign: 'center', borderColor: 'var(--danger)' }}>
        <AlertCircle size={40} style={{ color: 'var(--danger)', margin: '0 auto 12px' }} />
        <span className="card-title" style={{ justifyContent: 'center', color: 'var(--danger)' }}>Erro ao carregar dados</span>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.9rem' }}>{error}</p>
      </div>
    );
  }

  // VISITOR/READ-ONLY GUARD: Block administrative views for visitors and non-privileged assistants
  const isReadOnlyUser = userRole === 'visitor' || (userRole === 'assistant' && !can('edit_match'));
  if (isReadOnlyUser && (view === 'create' || view === 'edit')) {
    setView('list');
    resetWizardStates();
    return null;
  }

  // ==========================================
  // VIEW: LIST (HISTÓRICO)
  // ==========================================
  if (view === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #a3a3a3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {mode === 'partidas' ? 'Partidas' : 'Histórico'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              {mode === 'partidas' ? 'Partidas e sorteio de times em andamento.' : 'Histórico de partidas finalizadas.'}
            </p>
          </div>
          
          {mode === 'partidas' && can('edit_match') && (
            <button
              onClick={() => {
                resetWizardStates();
                setView('create');
              }}
              style={{
                padding: '10px 16px',
                backgroundColor: '#6366f1',
                border: 'none',
                borderRadius: '12px',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
            >
              <Plus size={16} />
              <span>Nova Partida</span>
            </button>
          )}
        </div>

        {matches.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {matches.map((match) => {
              const isExpanded = expandedMatchIds.has(match.id);
              const formattedDate = match.match_date.split('-').reverse().join('/');
              const totalPlayers = match.match_players?.length || 0;
              const diaristasList = match.match_players?.filter(mp => mp.category_at_match === 'Diarista') || [];
              const totalDiaristas = diaristasList.length;
              
              const cBrasil = match.match_players?.filter(mp => mp.team === 'brasil').length || 0;
              const cPortugal = match.match_players?.filter(mp => mp.team === 'portugal').length || 0;
              const cJapao = match.match_players?.filter(mp => mp.team === 'japao').length || 0;
              const cUruguai = match.match_players?.filter(mp => mp.team === 'uruguai').length || 0;

              // Total stats summary for history
              const totalGoals = (match.match_player_stats || []).reduce((sum, s) => sum + s.goals, 0);
              const totalAssists = (match.match_player_stats || []).reduce((sum, s) => sum + s.assists, 0);
              const totalYellow = (match.match_player_stats || []).reduce((sum, s) => sum + s.yellow_cards, 0);
              const totalBlue = (match.match_player_stats || []).reduce((sum, s) => sum + s.blue_cards, 0);
              const totalRed = (match.match_player_stats || []).reduce((sum, s) => sum + s.red_cards, 0);

              return (
                <article 
                  key={match.id}
                  className="dashboard-card"
                  style={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    gap: '12px',
                    borderColor: isExpanded ? 'rgba(255,255,255,0.08)' : undefined
                  }}
                  onClick={() => toggleMatchExpansion(match.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        color: match.status === 'in_progress' ? '#eab308' : '#22c55e',
                        backgroundColor: match.status === 'in_progress' ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.1)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        width: 'fit-content'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: match.status === 'in_progress' ? '#eab308' : '#22c55e' }} />
                        {match.status === 'in_progress' ? 'Em andamento' : 'Finalizada'}
                      </span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formattedDate}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}> às {match.match_time.slice(0, 5)}</span>
                      </div>

                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={12} /> {(match.location || '').split('|')[0]}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ARRECADAÇÃO (DIÁRIAS)</span>
                      <strong style={{ fontSize: '1.1rem', color: '#818cf8', marginTop: '2px' }}>
                        R$ {match.daily_total.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: '8px', 
                    fontSize: '0.8rem', 
                    backgroundColor: 'rgba(255,255,255,0.01)', 
                    padding: '8px 12px', 
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Jogadores: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{totalPlayers}</strong> 
                      <span style={{ color: 'var(--text-muted)' }}> ({totalDiaristas} Diaristas)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', fontWeight: 600 }}>
                      <span style={{ color: '#22c55e' }}>B {cBrasil}</span>
                      <span style={{ color: '#ef4444' }}>P {cPortugal}</span>
                      <span style={{ color: '#ffffff' }}>J {cJapao}</span>
                      <span style={{ color: '#38bdf8' }}>U {cUruguai}</span>
                    </div>
                  </div>

                  {/* EXPANDED AREA FOR HISTORY */}
                  {isExpanded && (
                    <div 
                      style={{ 
                        marginTop: '10px', 
                        paddingTop: '12px', 
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        cursor: 'default'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* BOTÕES DE AÇÃO - APENAS SE EM ANDAMENTO */}
                      {match.status === 'in_progress' ? (
                        !can('edit_match') ? (
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                            <button 
                              onClick={() => handleOpenStats(match)}
                              style={{
                                flex: 1,
                                padding: '10px',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '10px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'var(--transition)'
                              }}
                            >
                              <Users size={12} />
                              Visualizar Escalação
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                            <button 
                              onClick={() => handleEditMatch(match)}
                              style={{
                                flex: 1,
                                padding: '10px',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '10px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'var(--transition)'
                              }}
                            >
                              Editar Partida
                            </button>

                            <button 
                              onClick={() => handleDeleteMatch(match.id)}
                              style={{
                                flex: 0,
                                padding: '10px 14px',
                                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '10px',
                                color: '#ef4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'var(--transition)'
                              }}
                              title="Excluir Partida"
                            >
                              <Trash2 size={16} />
                            </button>
                            
                            <button 
                              onClick={() => handleOpenStats(match)}
                              style={{
                                flex: 1,
                                padding: '10px',
                                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                borderRadius: '10px',
                                color: '#818cf8',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'var(--transition)'
                              }}
                            >
                              <Play size={12} />
                              Lançar Estatísticas
                            </button>
                          </div>
                        )
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '4px' }}>
                          {!can('edit_match') ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => handleOpenStats(match)}
                                style={{
                                  flex: 1,
                                  padding: '10px',
                                  backgroundColor: 'rgba(255,255,255,0.03)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: '10px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  transition: 'var(--transition)'
                                }}
                              >
                                Visualizar Partida
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => handleOpenStats(match)}
                                style={{
                                  flex: 1,
                                  padding: '10px',
                                  backgroundColor: 'rgba(255,255,255,0.03)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: '10px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  transition: 'var(--transition)'
                                }}
                              >
                                Editar Partida
                              </button>

                              <button 
                                onClick={() => handleDeleteMatch(match.id)}
                                style={{
                                  flex: 0,
                                  padding: '10px 14px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                  border: '1px solid rgba(239, 68, 68, 0.2)',
                                  borderRadius: '10px',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'var(--transition)'
                                }}
                                title="Excluir Partida"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}

                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '12px',
                            padding: '12px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(34,197,94,0.02)',
                            border: '1px solid rgba(34,197,94,0.1)'
                          }}>
                            {/* CLASSIFICAÇÃO FINAL */}
                            <div className="classification-grid">
                              <div className="classification-item" style={{ backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}>
                                <span className="classification-title" style={{ color: '#fbbf24' }}>1º CAMPEÃO</span>
                                <strong className="classification-team">{match.champion_team}</strong>
                              </div>
                              <div className="classification-item" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.2)' }}>
                                <span className="classification-title" style={{ color: '#94a3b8' }}>2º VICE</span>
                                <strong className="classification-team">{match.runner_up_team}</strong>
                              </div>
                              <div className="classification-item" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,83,9,0.2)' }}>
                                <span className="classification-title" style={{ color: '#b45309' }}>3º LUGAR</span>
                                <strong className="classification-team">{match.third_place_team}</strong>
                              </div>
                              <div className="classification-item" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(56,189,248,0.2)' }}>
                                <span className="classification-title" style={{ color: '#38bdf8' }}>4º LUGAR</span>
                                <strong className="classification-team">{match.fourth_place_team}</strong>
                              </div>
                            </div>

                            {/* RESUMO DE NÚMEROS */}
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-around', 
                              flexWrap: 'wrap', 
                              gap: '10px', 
                              borderTop: '1px solid rgba(255,255,255,0.04)', 
                              paddingTop: '8px',
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)'
                            }}>
                              <span>Gols: <strong style={{ color: 'var(--text-primary)' }}>{totalGoals}</strong></span>
                              <span>Assist.: <strong style={{ color: 'var(--text-primary)' }}>{totalAssists}</strong></span>
                              <span>Amarelos: <strong style={{ color: '#eab308' }}>{totalYellow}</strong></span>
                              <span>Azuis: <strong style={{ color: '#38bdf8' }}>{totalBlue}</strong></span>
                              <span>Vermelhos: <strong style={{ color: '#ef4444' }}>{totalRed}</strong></span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* LISTA DOS QUATRO TIMES OU LISTA HISTÓRICA */}
                      {match.source === 'historical_manual' || match.source === 'historical_import' ? (
                        /* ── PARTIDA HISTÓRICA: lista plana de jogadores ── */
                        <div style={{ marginTop: '4px' }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            marginBottom: '10px', padding: '8px 12px',
                            backgroundColor: 'rgba(99,102,241,0.08)',
                            border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: '10px',
                          }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#818cf8', letterSpacing: '0.05em' }}>📋 PARTIDA HISTÓRICA</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>— sem escalação por times</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {(match.match_players || []).map(mp => {
                              const stats = (match.match_player_stats || []).find(st => st.player_id === mp.player_id);
                              const isChamp = (stats as any)?.is_champion;
                              const isVice  = (stats as any)?.is_runner_up;
                              const isRala  = stats?.is_ralabosta;
                              return (
                                <div key={mp.id} style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '7px 10px', borderRadius: '9px',
                                  backgroundColor: 'rgba(255,255,255,0.02)',
                                  border: '1px solid rgba(255,255,255,0.04)',
                                  fontSize: '0.8rem',
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                    {mp.player?.photo_url ? (
                                      <img src={mp.player.photo_url} alt={mp.player.name} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                    ) : (
                                      <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: '#1c1c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <User size={13} style={{ color: 'var(--text-muted)' }} />
                                      </div>
                                    )}
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {mp.player?.name || 'Jogador'}
                                    </span>
                                    <div style={{ width: '75px', flexShrink: 0 }}>
                                      {isChamp && <span style={{ fontSize: '0.65rem', color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>🏆 CAMPEÃO</span>}
                                      {isVice  && <span style={{ fontSize: '0.65rem', color: '#94a3b8', backgroundColor: 'rgba(148,163,184,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>🥈 VICE</span>}
                                      {isRala  && <span style={{ fontSize: '0.65rem', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>💩 RALA</span>}
                                    </div>
                                  </div>
                                  <div style={{ minWidth: '55px', display: 'flex', gap: '4px', fontSize: '0.68rem', fontWeight: 700, justifyContent: 'flex-end', flexShrink: 0 }}>
                                    {stats && (
                                      <>
                                        {(stats.goals > 0) && <span style={{ color: '#fff', backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>G{stats.goals}</span>}
                                        {(stats.assists > 0) && <span style={{ color: '#818cf8', backgroundColor: 'rgba(99,102,241,0.08)', padding: '2px 6px', borderRadius: '4px' }}>A{stats.assists}</span>}
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {(match.match_players || []).length === 0 && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px' }}>Sem jogadores registrados.</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* ── PARTIDA NORMAL: 4 times ── */
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        {[
                          { name: 'BRASIL', code: 'brasil', color: '#22c55e', list: match.match_players?.filter(mp => mp.team === 'brasil') || [] },
                          { name: 'PORTUGAL', code: 'portugal', color: '#ef4444', list: match.match_players?.filter(mp => mp.team === 'portugal') || [] },
                          { name: 'JAPÃO', code: 'japao', color: '#ffffff', list: match.match_players?.filter(mp => mp.team === 'japao') || [] },
                          { name: 'URUGUAI', code: 'uruguai', color: '#38bdf8', list: match.match_players?.filter(mp => mp.team === 'uruguai') || [] }
                        ].map(t => {
                          const isTeamChampion = match.champion_team === t.code;
                          const isTeamRunnerUp = match.runner_up_team === t.code;

                          return (
                            <div key={t.name} style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '10px', padding: '10px' }}>
                              <div style={{ color: t.color, fontSize: '0.8rem', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '4px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{t.name}</span>
                                  {isTeamChampion && (
                                    <span style={{ fontSize: '0.65rem', color: '#fbbf24', backgroundColor: 'rgba(251,191,38,0.1)', padding: '1px 4px', borderRadius: '4px', fontWeight: 800 }}>
                                      🏆 CAMPEÃO
                                    </span>
                                  )}
                                  {isTeamRunnerUp && (
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', backgroundColor: 'rgba(148,163,184,0.1)', padding: '1px 4px', borderRadius: '4px', fontWeight: 800 }}>
                                      🥈 VICE
                                    </span>
                                  )}
                                </div>
                                <span style={{ color: 'var(--text-muted)' }}>{t.list.length}</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {t.list.length > 0 ? (
                                  t.list.map(mp => {
                                    const stats = (match.match_player_stats || []).find(st => st.player_id === mp.player_id);
                                    return (
                                      <div key={mp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          {mp.player?.photo_url ? (
                                            <img src={mp.player.photo_url} alt={mp.player.name} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                                          ) : (
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              <User size={10} style={{ color: 'var(--text-muted)' }} />
                                            </div>
                                          )}
                                          <span style={{ fontWeight: 500, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            {mp.player?.name || 'Jogador Excluído'}
                                            {isTeamChampion && mp.category_at_match === 'Mensalista' && (
                                              <Trophy size={10} style={{ color: '#fbbf24' }} />
                                            )}
                                            {mp.category_at_match === 'Diarista' && (
                                              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginLeft: '2px' }}>(Diarista)</span>
                                            )}
                                          </span>
                                        </div>
                                        {mp.category_at_match === 'Mensalista' && stats && (
                                          <div style={{ display: 'flex', gap: '4px', fontSize: '0.65rem', fontWeight: 700 }}>
                                            {stats.goals > 0 && <span style={{ color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '4px' }}>G {stats.goals}</span>}
                                            {stats.assists > 0 && <span style={{ color: '#818cf8', backgroundColor: 'rgba(99,102,241,0.08)', padding: '1px 5px', borderRadius: '4px' }}>A {stats.assists}</span>}
                                            {stats.yellow_cards > 0 && <span style={{ color: '#eab308', backgroundColor: 'rgba(234,179,8,0.1)', padding: '1px 5px', borderRadius: '4px' }}>🟨 {stats.yellow_cards}</span>}
                                            {stats.blue_cards > 0 && <span style={{ color: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.1)', padding: '1px 5px', borderRadius: '4px' }}>🟦 {stats.blue_cards}</span>}
                                            {stats.red_cards > 0 && <span style={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', padding: '1px 5px', borderRadius: '4px' }}>🟥 {stats.red_cards}</span>}
                                            {stats.is_ralabosta && <span style={{ color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', padding: '1px 5px', borderRadius: '4px' }}>💩</span>}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem escalação</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="dashboard-card" style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Nenhuma partida registrada.
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: CREATE (WIZARD STEP 1: CONFIG)
  // ==========================================
  if ((view === 'create' || view === 'edit') && step === 'config') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => { setView('list'); resetWizardStates(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #a3a3a3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {view === 'edit' ? 'Editar Partida' : 'Nova Partida'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              {view === 'edit' ? 'Edite as informações da partida e os jogadores.' : 'Configure a partida e selecione os jogadores.'}
            </p>
          </div>
        </div>

        <section className="dashboard-card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} style={{ color: '#818cf8' }} /> Dados da Partida
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label htmlFor="match-date" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>DATA</label>
              <input 
                id="match-date"
                type="date" 
                value={matchDate} 
                onChange={(e) => { setMatchDate(e.target.value); setValidationError(null); }}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              <div>
                <label htmlFor="match-time" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>HORÁRIO</label>
                <input 
                  id="match-time"
                  type="time" 
                  value={matchTime} 
                  onChange={(e) => { setMatchTime(e.target.value); setValidationError(null); }}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
              
              <div>
                <label htmlFor="match-location" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>LOCAL</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    id="match-location"
                    type="text" 
                    placeholder="Arena Gol de Ouro • Campo A"
                    value={matchLocation} 
                    onChange={(e) => { setMatchLocation(e.target.value); setValidationError(null); }}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 36px',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>QUANTIDADE DE TIMES</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[2, 3, 4].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        if (teamBrasil.length > 0 || teamPortugal.length > 0 || teamJapao.length > 0 || teamUruguai.length > 0) {
                          if (!confirm('Alterar o número de times limpará a distribuição atual. Continuar?')) return;
                          clearTeams();
                        }
                        setNumberOfTeams(num as 2 | 3 | 4);
                      }}
                      disabled={saving}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        backgroundColor: numberOfTeams === num ? '#6366f1' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${numberOfTeams === num ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '8px',
                        color: numberOfTeams === num ? '#ffffff' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      {num} Times
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-card" style={{ gap: '12px' }}>
          <div className="card-header" style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: '#818cf8' }} /> Jogadores
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Selecione quem participará desta partida.
              </span>
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar jogador..." 
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

          <div style={{ 
            display: 'flex', 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap', 
            gap: '8px', 
            padding: '6px 0', 
            borderBottom: '1px solid rgba(255,255,255,0.04)', 
            marginBottom: '4px' 
          }}>
            <button 
              onClick={toggleSelectAll}
              disabled={filteredPlayers.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '4px 0',
                flexShrink: 0
              }}
            >
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '4px',
                border: '1.5px solid rgba(255,255,255,0.3)',
                backgroundColor: isAllSelected ? '#6366f1' : isSomeSelected ? 'rgba(99,102,241,0.3)' : 'transparent',
                borderColor: (isAllSelected || isSomeSelected) ? '#6366f1' : 'rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition)'
              }}>
                {isAllSelected && <Check size={12} style={{ color: '#ffffff' }} />}
                {isSomeSelected && <div style={{ width: '8px', height: '2px', backgroundColor: '#ffffff' }} />}
              </div>
              Selecionar todos
            </button>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              fontSize: '0.8rem', 
              color: 'var(--text-secondary)',
              flexWrap: 'wrap'
            }}>
              <span>
                Exibindo <strong style={{ color: 'var(--text-primary)' }}>{filteredPlayers.length}</strong> de <strong style={{ color: 'var(--text-primary)' }}>{players.length}</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                Selecionados: <strong style={{ 
                  color: '#818cf8', 
                  backgroundColor: 'rgba(99, 102, 241, 0.15)', 
                  padding: '2px 8px', 
                  borderRadius: '6px',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  fontWeight: 700
                }}>{selectedPlayerIds.size}</strong>
              </span>
            </div>
          </div>

          {filteredPlayers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredPlayers.map((player) => {
                const isSelected = selectedPlayerIds.has(player.id);
                return (
                  <div 
                    key={player.id}
                    onClick={() => togglePlayerSelection(player.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      backgroundColor: isSelected ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.01)',
                      border: '1.5px solid',
                      borderColor: isSelected ? '#6366f1' : 'rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {player.photo_url ? (
                        <img 
                          src={player.photo_url} 
                          alt={player.name} 
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #3f3f46' }}
                        />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #3f3f46' }}>
                          <User size={20} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{player.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                          {player.position || 'Sem posição'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: 700, 
                          color: player.category === 'Mensalista' ? 'var(--success)' : 'var(--danger)',
                          textTransform: 'uppercase'
                        }}>
                          {player.category}
                        </span>
                        {player.category === 'Diarista' && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {`R$ ${defaultDailyFee.toFixed(2)}`}
                          </span>
                        )}
                      </div>

                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: isSelected ? '#6366f1' : 'rgba(255,255,255,0.15)',
                        backgroundColor: isSelected ? '#6366f1' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease-in-out'
                      }}>
                        {isSelected && <Check size={12} style={{ color: '#ffffff', strokeWidth: 3 }} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Nenhum jogador cadastrado.
            </div>
          )}
        </section>

        <section className="dashboard-card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: '#818cf8' }} /> Resumo
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Jogadores selecionados</span>
              <strong style={{ color: 'var(--text-primary)' }}>{totalSelected}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Mensalistas</span>
              <strong style={{ color: 'var(--success)' }}>{totalMensalistas}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Diaristas</span>
              <strong style={{ color: 'var(--danger)' }}>{totalDiaristas}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total previsto das diárias</span>
              <strong style={{ fontSize: '1.05rem', color: '#818cf8' }}>R$ {totalEstimatedFees.toFixed(2)}</strong>
            </div>
          </div>
        </section>

        {validationError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{validationError}</span>
          </div>
        )}

        <button 
          onClick={handleContinueToTeams}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#6366f1',
            border: 'none',
            borderRadius: '14px',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'var(--transition)',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
        >
          <span>Continuar</span>
          <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  // ==========================================
  // VIEW: STATS (LAUNCHING STATS FOR MATCH)
  // ==========================================
  if (view === 'stats' && activeMatchForStats) {
    const formattedDate = activeMatchForStats.match_date.split('-').reverse().join('/');
    const matchPlayers = activeMatchForStats.match_players || [];
    
    // Group match participants by team
    const teamBrasilStats = matchPlayers.filter(mp => mp.team === 'brasil');
    const teamPortugalStats = matchPlayers.filter(mp => mp.team === 'portugal');
    const teamJapaoStats = matchPlayers.filter(mp => mp.team === 'japao');
    const teamUruguaiStats = matchPlayers.filter(mp => mp.team === 'uruguai');

    // Validate if classification is complete and clean
    const isClassificationValid = championTeam && runnerUpTeam && thirdPlaceTeam && fourthPlaceTeam &&
      (new Set([championTeam, runnerUpTeam, thirdPlaceTeam, fourthPlaceTeam]).size === 4);

    // Sum summary stats for the top banner dynamically (Mensalistas only)
    const sumGoals = Object.values(localStats).reduce((sum, s) => sum + s.goals, 0);
    const sumAssists = Object.values(localStats).reduce((sum, s) => sum + s.assists, 0);
    const sumYellow = Object.values(localStats).reduce((sum, s) => sum + s.yellow, 0);
    const sumBlue = Object.values(localStats).reduce((sum, s) => sum + s.blue, 0);
    const sumRed = Object.values(localStats).reduce((sum, s) => sum + s.red, 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => { setView('list'); resetWizardStates(); }}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-primary)',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'var(--transition)'
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #a3a3a3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {activeMatchForStats.status === 'finished' ? 'Corrigir Histórico' : 'Estatísticas da Partida'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
              {activeMatchForStats.status === 'finished' ? 'Ajuste as estatísticas e classificação final da partida finalizada.' : 'Lançamento de estatísticas e classificação final.'}
            </p>
          </div>
        </div>

        {activeMatchForStats.status === 'finished' && can('edit_match') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.25)', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600 }}>
              ⚠️ Editando partida finalizada (Correção de Histórico)
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={() => {
                  setEditingMatchId(activeMatchForStats.id);
                  setMatchDate(activeMatchForStats.match_date);
                  setMatchTime(activeMatchForStats.match_time.slice(0, 5));
                  setMatchLocation((activeMatchForStats.location || '').split('|')[0]);
                  
                  const participantIds = new Set((activeMatchForStats.match_players || []).map(mp => mp.player_id));
                  setSelectedPlayerIds(participantIds);
                  
                  const brasilList: Player[] = [];
                  const portugalList: Player[] = [];
                  const japaoList: Player[] = [];
                  const uruguaiList: Player[] = [];
                  (activeMatchForStats.match_players || []).forEach(mp => {
                    const originalPlayer = players.find(pl => pl.id === mp.player_id);
                    const mappedPlayer: Player = originalPlayer ? { ...originalPlayer, category: mp.category_at_match } : {
                      id: mp.player_id,
                      name: mp.player?.name || 'Jogador Excluído',
                      birth_date: '',
                      position: mp.player?.position || null,
                      category: mp.category_at_match,
                      fee: mp.daily_fee_at_match,
                      photo_url: mp.player?.photo_url || null,
                      is_active: true
                    };
                    if (mp.team === 'brasil') brasilList.push(mappedPlayer);
                    if (mp.team === 'portugal') portugalList.push(mappedPlayer);
                    if (mp.team === 'japao') japaoList.push(mappedPlayer);
                    if (mp.team === 'uruguai') uruguaiList.push(mappedPlayer);
                  });
                  setTeamBrasil(brasilList);
                  setTeamPortugal(portugalList);
                  setTeamJapao(japaoList);
                  setTeamUruguai(uruguaiList);
                  
                  const distributedIds = new Set([...brasilList.map(p => p.id), ...portugalList.map(p => p.id), ...japaoList.map(p => p.id), ...uruguaiList.map(p => p.id)]);
                  const undelivered = players.filter(p => participantIds.has(p.id) && !distributedIds.has(p.id));
                  setAvailablePlayers(undelivered);
                  
                  setStep('config');
                  setView('edit');
                }}
                style={{
                  padding: '10px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'var(--transition)'
                }}
              >
                ✏️ Editar Dados (Data/Local)
              </button>
              
              <button
                onClick={() => {
                  setEditingMatchId(activeMatchForStats.id);
                  setMatchDate(activeMatchForStats.match_date);
                  setMatchTime(activeMatchForStats.match_time.slice(0, 5));
                  setMatchLocation((activeMatchForStats.location || '').split('|')[0]);
                  
                  const participantIds = new Set((activeMatchForStats.match_players || []).map(mp => mp.player_id));
                  setSelectedPlayerIds(participantIds);
                  
                  const brasilList: Player[] = [];
                  const portugalList: Player[] = [];
                  const japaoList: Player[] = [];
                  const uruguaiList: Player[] = [];
                  (activeMatchForStats.match_players || []).forEach(mp => {
                    const originalPlayer = players.find(pl => pl.id === mp.player_id);
                    const mappedPlayer: Player = originalPlayer ? { ...originalPlayer, category: mp.category_at_match } : {
                      id: mp.player_id,
                      name: mp.player?.name || 'Jogador Excluído',
                      birth_date: '',
                      position: mp.player?.position || null,
                      category: mp.category_at_match,
                      fee: mp.daily_fee_at_match,
                      photo_url: mp.player?.photo_url || null,
                      is_active: true
                    };
                    if (mp.team === 'brasil') brasilList.push(mappedPlayer);
                    if (mp.team === 'portugal') portugalList.push(mappedPlayer);
                    if (mp.team === 'japao') japaoList.push(mappedPlayer);
                    if (mp.team === 'uruguai') uruguaiList.push(mappedPlayer);
                  });
                  setTeamBrasil(brasilList);
                  setTeamPortugal(portugalList);
                  setTeamJapao(japaoList);
                  setTeamUruguai(uruguaiList);
                  
                  const distributedIds = new Set([...brasilList.map(p => p.id), ...portugalList.map(p => p.id), ...japaoList.map(p => p.id), ...uruguaiList.map(p => p.id)]);
                  const undelivered = players.filter(p => participantIds.has(p.id) && !distributedIds.has(p.id));
                  setAvailablePlayers(undelivered);
                  
                  setStep('teams');
                  setView('edit');
                }}
                style={{
                  padding: '10px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'var(--transition)'
                }}
              >
                🏃‍♂️ Editar Escalação (Times)
              </button>
            </div>
          </div>
        )}

        {/* MATCH DETAILS & STATS SUMMARY BANNER */}
        <section className="dashboard-card" style={{ gap: '12px', backgroundColor: 'rgba(99,102,241,0.01)', border: '1px solid rgba(99,102,241,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', textAlign: 'center', fontSize: '0.78rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
            <div>
              <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Data</span>
              <strong style={{ color: 'var(--text-primary)' }}>{formattedDate}</strong>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Horário</span>
              <strong style={{ color: 'var(--text-primary)' }}>{activeMatchForStats.match_time.slice(0, 5)}</strong>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Local</span>
              <strong style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{(activeMatchForStats.location || '').split('|')[0]}</strong>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Jogadores</span>
              <strong style={{ color: 'var(--text-primary)' }}>{matchPlayers.length}</strong>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', textAlign: 'center' }}>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px 4px', borderRadius: '8px' }}>
              <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-secondary)' }}>GOLS</span>
              <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>{sumGoals}</strong>
            </div>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px 4px', borderRadius: '8px' }}>
              <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-secondary)' }}>ASSIST.</span>
              <strong style={{ fontSize: '0.95rem', color: '#818cf8' }}>{sumAssists}</strong>
            </div>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px 4px', borderRadius: '8px' }}>
              <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-secondary)' }}>AMAR.</span>
              <strong style={{ fontSize: '0.95rem', color: '#eab308' }}>{sumYellow}</strong>
            </div>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px 4px', borderRadius: '8px' }}>
              <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-secondary)' }}>AZUIS</span>
              <strong style={{ fontSize: '0.95rem', color: '#38bdf8' }}>{sumBlue}</strong>
            </div>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px 4px', borderRadius: '8px' }}>
              <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-secondary)' }}>VERM.</span>
              <strong style={{ fontSize: '0.95rem', color: '#ef4444' }}>{sumRed}</strong>
            </div>
          </div>
        </section>

        {/* STATS POR TIME CARD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { label: 'BRASIL', code: 'brasil', color: '#22c55e', bg: 'rgba(34,197,94,0.01)', list: teamBrasilStats },
            { label: 'PORTUGAL', code: 'portugal', color: '#ef4444', bg: 'rgba(239,68,68,0.01)', list: teamPortugalStats },
            { label: 'JAPÃO', code: 'japao', color: '#ffffff', bg: 'rgba(255,255,255,0.01)', list: teamJapaoStats },
            { label: 'URUGUAI', code: 'uruguai', color: '#38bdf8', bg: 'rgba(56,189,248,0.01)', list: teamUruguaiStats }
          ].map((team) => {
            const teamMensalistas = team.list.filter(mp => mp.category_at_match === 'Mensalista').length;
            const teamDiaristas = team.list.filter(mp => mp.category_at_match === 'Diarista').length;
            
            const isChampion = championTeam === team.code;
            const isRunnerUp = runnerUpTeam === team.code;
            const isExpanded = expandedTeamsStats[team.code];
            const toggleExpansion = () => {
              setExpandedTeamsStats(prev => ({
                ...prev,
                [team.code]: !prev[team.code]
              }));
            };

            return (
              <div key={team.label} className="dashboard-card" style={{ borderLeft: `4px solid ${team.color}`, backgroundColor: team.bg, gap: isExpanded ? '12px' : '0px' }}>
                <div 
                  onClick={toggleExpansion}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: team.color }}>{team.label}</span>
                    {isChampion && (
                      <span style={{ fontSize: '0.72rem', color: '#fbbf24', backgroundColor: 'rgba(251,191,38,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        🏆 CAMPEÃO
                      </span>
                    )}
                    {isRunnerUp && (
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', backgroundColor: 'rgba(148,163,184,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        🥈 VICE
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {team.list.length} jog. ({teamMensalistas} M • {teamDiaristas} D)
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleExpansion(); }}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'var(--transition)'
                      }}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>
                
                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                    {team.list.length > 0 ? (
                      team.list.map((mp) => {
                        const isDiarista = mp.category_at_match === 'Diarista';
                        const stats = localStats[mp.player_id] || { goals: 0, assists: 0, yellow: 0, blue: 0, red: 0 };
                        
                        return (
                          <div key={mp.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {mp.player?.photo_url ? (
                                  <img src={mp.player.photo_url} alt={mp.player.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <User size={16} style={{ color: 'var(--text-muted)' }} />
                                  </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    {mp.player?.name}
                                    {isChampion && !isDiarista && (
                                      <Trophy size={12} style={{ color: '#fbbf24' }} />
                                    )}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{mp.player?.position || 'Sem posição'}</span>
                                </div>
                              </div>

                              {isDiarista ? (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic', fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '6px' }}>
                                  Diarista — não contabiliza estatísticas
                                </span>
                              ) : (
                                (fourthPlaceTeam && mp.team === fourthPlaceTeam) && (
                                  <span style={{ fontSize: '0.72rem', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                    💩 RALABOSTA
                                  </span>
                                )
                              )}
                            </div>

                            {/* CONTROLES ESTATÍSTICOS (APENAS MENSALISTA) */}
                            {!isDiarista && (
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(5, 1fr)', 
                                gap: '4px', 
                                borderTop: '1px solid rgba(255,255,255,0.04)', 
                                paddingTop: '8px', 
                                marginTop: '4px',
                                textAlign: 'center'
                              }}>
                                {[
                                  { label: 'Gols', field: 'goals' as const, color: '#ffffff' },
                                  { label: 'Assist.', field: 'assists' as const, color: '#818cf8' },
                                  { label: 'Amarelo', field: 'yellow' as const, color: '#eab308' },
                                  { label: 'Azul', field: 'blue' as const, color: '#38bdf8' },
                                  { label: 'Vermelho', field: 'red' as const, color: '#ef4444' }
                                ].map((stat) => (
                                  <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2px' }}>{stat.label}</span>
                                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: stat.color, margin: '2px 0' }}>{stats[stat.field]}</span>
                                    {can('edit_match') && (
                                      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                        <button 
                                          onClick={() => handleUpdateStat(mp.player_id, stat.field, -1)}
                                          disabled={saving}
                                          style={{ border: 'none', background: 'none', color: 'var(--text-primary)', padding: '4px 6px', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px' }}
                                        >
                                          -
                                        </button>
                                        <div style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
                                        <button 
                                          onClick={() => handleUpdateStat(mp.player_id, stat.field, 1)}
                                          disabled={saving}
                                          style={{ border: 'none', background: 'none', color: 'var(--text-primary)', padding: '4px 6px', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px' }}
                                        >
                                          +
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: '10px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sem jogadores escalados.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CLASSIFICAÇÃO DA PARTIDA CARD */}
        <section className="dashboard-card" style={{ gap: '12px', zIndex: 10 }}>
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={18} style={{ color: '#fbbf24' }} /> Classificação da Partida
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { id: 'champion' as const, label: '🥇 1º Lugar (Campeão)', color: '#fbbf24', value: championTeam, setter: setChampionTeam },
              { id: 'runnerUp' as const, label: '🥈 2º Lugar (Vice)', color: '#94a3b8', value: runnerUpTeam, setter: setRunnerUpTeam },
              { id: 'third' as const, label: '🥉 3º Lugar', color: '#b45309', value: thirdPlaceTeam, setter: setThirdPlaceTeam },
              { id: 'fourth' as const, label: '🏅 4º Lugar', color: '#52525b', value: fourthPlaceTeam, setter: setFourthPlaceTeam }
            ].map((pos) => {
              const isMenuOpen = activeClassSelect === pos.id;
              const availableOptions = getAvailableTeamsForPosition(pos.id);

              return (
                <div key={pos.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{pos.label}</span>
                  
                  {!can('edit_match') ? (
                    <div style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1.5px solid',
                      borderColor: pos.value ? pos.color : 'rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      color: pos.value ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textAlign: 'left',
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <span>{pos.value ? pos.value.toUpperCase() : '—'}</span>
                    </div>
                  ) : (
                    <>
                      {/* CUSTOM DARK TRIGGER BUTTON */}
                      <button
                        type="button"
                        className="class-dropdown-trigger"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!saving) setActiveClassSelect(isMenuOpen ? null : pos.id);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: 'rgba(255,255,255,0.02)',
                          border: '1.5px solid',
                          borderColor: pos.value ? pos.color : 'rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          color: pos.value ? '#ffffff' : 'var(--text-secondary)',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          textAlign: 'left',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span>{pos.value ? pos.value.toUpperCase() : 'Selecionar time...'}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>▼</span>
                      </button>

                      {/* CUSTOM DARK DROPDOWN POPUP */}
                      {isMenuOpen && (
                        <div 
                          className="class-dropdown-menu"
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '65px',
                            width: '100%',
                            backgroundColor: '#171717',
                            border: '1.5px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                            zIndex: 150,
                            padding: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            animation: 'slideDown 0.15s ease-out'
                          }}
                        >
                          <button
                            onClick={() => { pos.setter(''); setActiveClassSelect(null); setValidationError(null); }}
                            style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.8rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '6px', fontWeight: 600 }}
                          >
                            Nenhum (Limpar)
                          </button>
                          {availableOptions.map((teamOption) => (
                            <button
                              key={teamOption.id}
                              onClick={() => {
                                pos.setter(teamOption.id);
                                setActiveClassSelect(null);
                                setValidationError(null);
                              }}
                              style={{
                                textAlign: 'left',
                                padding: '8px 10px',
                                fontSize: '0.8rem',
                                background: 'none',
                                border: 'none',
                                color: teamOption.color,
                                cursor: 'pointer',
                                borderRadius: '6px',
                                fontWeight: 700,
                                backgroundColor: 'rgba(255,255,255,0.015)'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.015)'}
                            >
                              {teamOption.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* VALIDATION & FEEDBACK */}
        {validationError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{validationError}</span>
          </div>
        )}

        {showSuccessMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)', color: 'var(--success)', fontSize: '0.85rem' }}>
            <CheckCircle2 size={16} />
            <span>Operação realizada com sucesso!</span>
          </div>
        )}

        {/* BOTÕES DE CONTROLE DE ESTATÍSTICA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: can('edit_match') ? '1fr 1fr' : '1fr', gap: '12px' }}>
            <button 
              onClick={() => { setView('list'); resetWizardStates(); }}
              disabled={saving}
              style={{
                padding: '14px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.92rem',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              Voltar
            </button>

            {can('edit_match') && (
              <button 
                onClick={() => handleSaveStats(false)}
                disabled={saving}
                style={{
                  padding: '14px',
                  backgroundColor: '#6366f1',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                }}
              >
                {saving ? 'Salvando...' : activeMatchForStats.status === 'finished' ? 'Salvar Correções' : 'Salvar Estatísticas'}
              </button>
            )}
          </div>

          {/* FINALIZAR PARTIDA BOTÃO DE AÇÃO */}
          {can('edit_match') && isClassificationValid && activeMatchForStats.status !== 'finished' && (
            <button 
              onClick={() => setShowFinalizeConfirm(true)}
              disabled={saving}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: 'rgba(34,197,94,0.15)',
                border: '1.5px solid rgba(34,197,94,0.3)',
                borderRadius: '12px',
                color: '#22c55e',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'var(--transition)'
              }}
            >
              <CheckCircle2 size={18} />
              <span>Finalizar Partida</span>
            </button>
          )}
        </div>

        {/* CONFIRMAÇÃO DE FINALIZAÇÃO MODAL/DIALOG */}
        {showFinalizeConfirm && can('edit_match') && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}>
            <div className="dashboard-card" style={{ maxWidth: '320px', gap: '16px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 12px 36px rgba(0,0,0,0.6)' }}>
              <div style={{ textAlign: 'center' }}>
                <Shield size={36} style={{ color: '#22c55e', margin: '0 auto 10px' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Finalizar Partida?</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Uma partida finalizada não poderá mais ser editada. Confirma o encerramento?
                </p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button 
                  onClick={() => setShowFinalizeConfirm(false)}
                  disabled={saving}
                  style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleFinalizeMatch}
                  disabled={saving}
                  style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#22c55e', border: 'none', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  {saving ? 'Finalizando...' : 'Finalizar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: CREATE (WIZARD STEP 2) OR EDIT (TEAMS ESCALATION)
  // ==========================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={() => {
            if (view === 'edit') {
              setView('list');
              resetWizardStates();
            } else {
              setStep('config');
              setShowSuccessMessage(false);
            }
          }}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-primary)',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'var(--transition)'
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #a3a3a3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {view === 'edit' ? 'Editar Partida' : 'Montagem dos Times'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
            {view === 'edit' ? 'Ajuste os jogadores da partida salva.' : 'Distribua os jogadores entre os quatro times.'}
          </p>
        </div>
      </div>

      <section className="dashboard-card" style={{ gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Jogadores disponíveis</span>
            <strong style={{ fontSize: '1.25rem', color: '#818cf8' }}>{availablePlayers.length}</strong>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Times</span>
            <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{numberOfTeams}</strong>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Média por time</span>
            <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>6</strong>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '8px', 
          paddingTop: '10px', 
          borderTop: '1px solid rgba(255,255,255,0.04)',
          fontSize: '0.78rem',
          fontWeight: 700
        }}>
          {getActiveTeams().includes('brasil') && (
            <button onClick={() => scrollToTeam('team-brasil')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e', display: 'flex', gap: '4px' }}>
              BRA <span style={{ backgroundColor: 'rgba(34,197,94,0.15)', padding: '1px 6px', borderRadius: '4px' }}>{teamBrasil.length}/6</span>
            </button>
          )}
          {getActiveTeams().includes('portugal') && (
            <button onClick={() => scrollToTeam('team-portugal')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', gap: '4px' }}>
              POR <span style={{ backgroundColor: 'rgba(239,68,68,0.15)', padding: '1px 6px', borderRadius: '4px' }}>{teamPortugal.length}/6</span>
            </button>
          )}
          {getActiveTeams().includes('japao') && (
            <button onClick={() => scrollToTeam('team-japao')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ffffff', display: 'flex', gap: '4px' }}>
              JAP <span style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: '4px' }}>{teamJapao.length}/6</span>
            </button>
          )}
          {getActiveTeams().includes('uruguai') && (
            <button onClick={() => scrollToTeam('team-uruguai')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#38bdf8', display: 'flex', gap: '4px' }}>
              URU <span style={{ backgroundColor: 'rgba(56,189,248,0.15)', padding: '1px 6px', borderRadius: '4px' }}>{teamUruguai.length}/6</span>
            </button>
          )}
        </div>
      </section>


      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <button 
          onClick={runFlashSorteio}
          disabled={saving}
          style={{
            padding: '12px',
            backgroundColor: saving ? 'rgba(255,255,255,0.02)' : '#6366f1',
            border: 'none',
            borderRadius: '12px',
            color: saving ? 'var(--text-muted)' : '#ffffff',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'var(--transition)'
          }}
          onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = '#4f46e5'; }}
          onMouseLeave={(e) => { if (!saving) e.currentTarget.style.backgroundColor = '#6366f1'; }}
        >
          <Shuffle size={16} />
          <span>Sorteio Flash</span>
        </button>

        <button 
          onClick={clearTeams}
          disabled={saving}
          style={{
            padding: '12px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            color: saving ? 'var(--text-muted)' : 'var(--text-primary)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'var(--transition)'
          }}
        >
          <RotateCcw size={16} />
          <span>Limpar Times</span>
        </button>
      </div>

      {availablePlayers.length > 0 ? (
        <section className="dashboard-card" style={{ gap: '12px' }}>
          <div className="card-header">
            <span className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} style={{ color: 'var(--text-secondary)' }} /> Jogadores Disponíveis ({availablePlayers.length})
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
            {availablePlayers.map((player) => {
              const isSelected = selectedPlayerForDraw?.id === player.id;
              return (
                <div 
                  key={player.id}
                  onClick={() => { if (!saving) setSelectedPlayerForDraw(isSelected ? null : player); }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 8px',
                    borderRadius: '12px',
                    backgroundColor: isSelected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.01)',
                    border: '1.5px solid',
                    borderColor: isSelected ? '#6366f1' : 'rgba(255,255,255,0.04)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center'
                  }}
                >
                  {player.photo_url ? (
                    <img 
                      src={player.photo_url} 
                      alt={player.name} 
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', marginBottom: '6px' }}
                    />
                  ) : (
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
                      <User size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {player.position || 'Sem posição'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
          🎉 Todos os jogadores foram distribuídos nos times!
        </div>
      )}

      {selectedPlayerForDraw && (
        <section className="dashboard-card" style={{ gap: '12px', borderColor: '#6366f1', boxShadow: '0 4px 20px rgba(99, 102, 241, 0.15)', animation: 'slideDown 0.2s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Selecionado: <strong style={{ color: 'var(--text-primary)' }}>{selectedPlayerForDraw.name}</strong>
            </span>
            <button 
              onClick={() => setSelectedPlayerForDraw(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Escolha o time:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {getActiveTeams().includes('brasil') && (
              <button 
                onClick={() => movePlayer(selectedPlayerForDraw, 'disponiveis', 'brasil')}
                style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'var(--transition)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.08)'}
              >
                BRASIL
              </button>
            )}
            {getActiveTeams().includes('portugal') && (
              <button 
                onClick={() => movePlayer(selectedPlayerForDraw, 'disponiveis', 'portugal')}
                style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'var(--transition)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
              >
                PORTUGAL
              </button>
            )}
            {getActiveTeams().includes('japao') && (
              <button 
                onClick={() => movePlayer(selectedPlayerForDraw, 'disponiveis', 'japao')}
                style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'var(--transition)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
              >
                JAPÃO
              </button>
            )}
            {getActiveTeams().includes('uruguai') && (
              <button 
                onClick={() => movePlayer(selectedPlayerForDraw, 'disponiveis', 'uruguai')}
                style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'var(--transition)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(56,189,248,0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(56,189,248,0.08)'}
              >
                URUGUAI
              </button>
            )}
          </div>
        </section>
      )}

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px',
        marginTop: '8px'
      }}>
        {[
          { id: 'team-brasil', name: 'brasil', label: 'BRASIL', color: '#22c55e', bg: 'rgba(34,197,94,0.02)', players: teamBrasil },
          { id: 'team-portugal', name: 'portugal', label: 'PORTUGAL', color: '#ef4444', bg: 'rgba(239,68,68,0.02)', players: teamPortugal },
          { id: 'team-japao', name: 'japao', label: 'JAPÃO', color: '#ffffff', bg: 'rgba(255,255,255,0.01)', players: teamJapao },
          { id: 'team-uruguai', name: 'uruguai', label: 'URUGUAI', color: '#38bdf8', bg: 'rgba(56,189,248,0.02)', players: teamUruguai }
        ].filter(team => getActiveTeams().includes(team.name)).map((team) => {
          return (
            <div 
              key={team.id}
              id={team.id}
              className="dashboard-card" 
              style={{ 
                borderLeft: `4px solid ${team.color}`, 
                backgroundColor: team.bg,
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: team.color, letterSpacing: '0.5px' }}>{team.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {team.players.length}/6
                  </span>
                  {team.players.length < 6 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Falta {6 - team.players.length}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '60px' }}>
                {team.players.length > 0 ? (
                  team.players.map((p) => {
                    const isMenuOpen = activeTeamMenu?.playerId === p.id && activeTeamMenu?.teamName === team.name;
                    return (
                      <div 
                        key={p.id} 
                        style={{ 
                          position: 'relative',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '8px 10px', 
                          borderRadius: '10px', 
                          backgroundColor: 'rgba(255,255,255,0.015)',
                          border: '1px solid rgba(255,255,255,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {p.photo_url ? (
                            <img 
                              src={p.photo_url} 
                              alt={p.name} 
                              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <User size={14} style={{ color: 'var(--text-muted)' }} />
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{p.position || 'Sem posição'}</span>
                          </div>
                        </div>

                        <div style={{ position: 'relative' }}>
                          <button 
                            className="team-menu-trigger"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!saving) setActiveTeamMenu(isMenuOpen ? null : { playerId: p.id, teamName: team.name });
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              padding: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                              transition: 'var(--transition)'
                            }}
                            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
                            onMouseLeave={(e) => { if (!saving) e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {isMenuOpen && (
                            <div 
                              className="team-dropdown-menu"
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '30px',
                                width: '180px',
                                backgroundColor: '#171717',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '10px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                zIndex: 100,
                                padding: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                animation: 'fadeIn 0.15s ease-out'
                              }}
                            >
                              {team.name !== 'brasil' && (
                                <button onClick={() => movePlayer(p, team.name, 'brasil')} style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.78rem', background: 'none', border: 'none', color: '#22c55e', fontWeight: 600, cursor: 'pointer', borderRadius: '6px' }}>Mover para Brasil</button>
                              )}
                              {team.name !== 'portugal' && (
                                <button onClick={() => movePlayer(p, team.name, 'portugal')} style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.78rem', background: 'none', border: 'none', color: '#ef4444', fontWeight: 600, cursor: 'pointer', borderRadius: '6px' }}>Mover para Portugal</button>
                              )}
                              {team.name !== 'japao' && (
                                <button onClick={() => movePlayer(p, team.name, 'japao')} style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.78rem', background: 'none', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', borderRadius: '6px' }}>Mover para Japão</button>
                              )}
                              {team.name !== 'uruguai' && (
                                <button onClick={() => movePlayer(p, team.name, 'uruguai')} style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.78rem', background: 'none', border: 'none', color: '#38bdf8', fontWeight: 600, cursor: 'pointer', borderRadius: '6px' }}>Mover para Uruguai</button>
                              )}
                              <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.04)', margin: '4px 0' }} />
                              <button 
                                onClick={() => movePlayer(p, team.name, 'disponiveis')} 
                                style={{ 
                                  textAlign: 'left', 
                                  padding: '8px 10px', 
                                  fontSize: '0.78rem', 
                                  background: 'none', 
                                  border: 'none', 
                                  color: 'var(--text-secondary)', 
                                  cursor: 'pointer', 
                                  borderRadius: '6px' 
                                }}
                              >
                                Remover do time
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', border: '1px dashed rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                    Nenhum jogador escalado
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {validationError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          <AlertCircle size={16} />
          <span>{validationError}</span>
        </div>
      )}

      {showSuccessMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)', color: 'var(--success)', fontSize: '0.85rem' }}>
          <CheckCircle2 size={16} />
          <span>Partida salva com sucesso. Redirecionando...</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px', marginTop: '8px' }}>
        <button 
          onClick={() => {
            if (view === 'edit') {
              setView('list');
              resetWizardStates();
            } else {
              setStep('config');
              setShowSuccessMessage(false);
            }
          }}
          disabled={saving}
          style={{
            padding: '14px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            color: 'var(--text-primary)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'var(--transition)'
          }}
        >
          Voltar
        </button>

        <button 
          onClick={saveMatch}
          disabled={availablePlayers.length > 0 || saving}
          style={{
            padding: '14px',
            backgroundColor: (availablePlayers.length > 0 || saving) ? 'rgba(255,255,255,0.05)' : '#6366f1',
            border: 'none',
            borderRadius: '14px',
            color: (availablePlayers.length > 0 || saving) ? 'var(--text-muted)' : '#ffffff',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: (availablePlayers.length > 0 || saving) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'var(--transition)',
            boxShadow: (availablePlayers.length > 0 || saving) ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}
          onMouseEnter={(e) => { if(availablePlayers.length === 0 && !saving) e.currentTarget.style.backgroundColor = '#4f46e5'; }}
          onMouseLeave={(e) => { if(availablePlayers.length === 0 && !saving) e.currentTarget.style.backgroundColor = '#6366f1'; }}
        >
          <span>{saving ? 'Salvando...' : view === 'edit' ? 'Salvar Alterações' : 'Salvar Partida'}</span>
          {!saving && <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  );
}
