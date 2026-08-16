import { useState, useEffect } from 'react';
import Players from './components/Players';
import Partidas from './components/Partidas';
import Configuracoes from './components/Configuracoes';
import Financeiro from './components/Financeiro';
import Avisos from './components/Avisos';
import Ranking from './components/Ranking';
import Relatorios from './components/Relatorios';
import Mensalidades from './components/Mensalidades';
import { supabase } from './lib/supabase';
import { 
  Users, 
  Calendar, 
  Trophy, 
  DollarSign, 
  Clock, 
  MapPin, 
  User,
  Award, 
  Activity,
  FileText,
  AlertCircle,
  Home,
  MessageSquare,
  Settings,
  Flame,
  Star,
  Menu,
  UserRound,
  X,
  Siren,
  Loader2,
  Shield,
  LogOut,
  Edit,
  Wallet,
  CalendarDays,
  Goal,
  Sparkles,
  CircleCheck,
  CircleAlert,
  Crown,
  Frown
} from 'lucide-react';


interface Notice {
  id: string;
  title: string;
  message: string;
  importance: 'normal' | 'attention' | 'important' | 'urgent';
  duration_value: number;
  duration_unit: 'hours' | 'days';
  expires_at: string;
  status: 'active' | 'archived';
  created_at: string;
}

export interface AssistantPermissions {
  create_match: boolean;
  edit_match: boolean;
  insert_stats: boolean;
  edit_players: boolean;
  manage_finance: boolean;
  manage_expenses: boolean;
  create_notices: boolean;
  edit_notices: boolean;
  delete_notices: boolean;
  import_history: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'inicio' | 'jogadores' | 'ranking' | 'partidas' | 'historico' | 'mensalidades' | 'financeiro' | 'relatorios' | 'avisos' | 'configuracoes'>('inicio');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dashboardNotices, setDashboardNotices] = useState<Notice[]>([]);
  
  // Dashboard Edit Last Match
  const [editingLastMatch, setEditingLastMatch] = useState<any | null>(null);
  const [editFinalTeam1, setEditFinalTeam1] = useState('');
  const [editFinalScore1, setEditFinalScore1] = useState('');
  const [editFinalTeam2, setEditFinalTeam2] = useState('');
  const [editFinalScore2, setEditFinalScore2] = useState('');
  const [editFinalPenalties, setEditFinalPenalties] = useState(false);
  const [editRalabostaTeam1, setEditRalabostaTeam1] = useState('');
  const [editRalabostaScore1, setEditRalabostaScore1] = useState('');
  const [editRalabostaTeam2, setEditRalabostaTeam2] = useState('');
  const [editRalabostaScore2, setEditRalabostaScore2] = useState('');
  const [editRalabostaPenalties, setEditRalabostaPenalties] = useState(false);
  const [savingLastMatch, setSavingLastMatch] = useState(false);

  // LOGO & USER PROFILE / PERMISSIONS
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'assistant' | 'visitor' | 'treasurer' | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [loginModal, setLoginModal] = useState<{
    role: 'admin' | 'assistant';
    email: string;
    password: string;
    error: string | null;
    submitting: boolean;
  } | null>(null);
  
  const [assistantPermissions, setAssistantPermissions] = useState<AssistantPermissions>(() => {
    const saved = localStorage.getItem('rda_assistant_permissions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      create_match: true,
      edit_match: true,
      insert_stats: true,
      edit_players: true,
      manage_finance: false,
      manage_expenses: false,
      create_notices: false,
      edit_notices: false,
      delete_notices: false,
      import_history: false,
    };
  });

  // Save permissions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('rda_assistant_permissions', JSON.stringify(assistantPermissions));
  }, [assistantPermissions]);

  // Visitor: acesso público instantâneo e somente leitura (sem login, sem localStorage de role).
  const enterVisitor = () => {
    setCurrentUserRole('visitor');
    setCurrentUserId(null);
    setCurrentEmail(null);
    setIsUserMenuOpen(false);
  };

  const can = (action: keyof AssistantPermissions): boolean => {
    if (currentUserRole === 'admin') return true;
    if (currentUserRole === 'visitor' || currentUserRole === null) return false;
    return assistantPermissions[action] || false;
  };

  // Carrega perfil (role/permissões) do usuário autenticado via Supabase Auth.
  // Fonte real: profiles.role — nunca confiamos em localStorage para conceder acesso.
  const applySession = async (session: { user: { id: string; email?: string | null } } | null) => {
    if (!session?.user) {
      setCurrentUserRole(null);
      setCurrentUserId(null);
      setCurrentEmail(null);
      setAuthLoading(false);
      return;
    }
    setCurrentEmail(session.user.email || null);
    setCurrentUserId(session.user.id);
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, name, photo_url, role')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
    }

    const role = profile?.role;
    if (role === 'admin') {
      setCurrentUserRole('admin');
    } else if (role === 'assistant') {
      setCurrentUserRole('assistant');
    } else if (role === 'treasurer') {
      setCurrentUserRole('treasurer');
    } else if (role === 'visitor') {
      setCurrentUserRole('visitor');
    } else {
      setCurrentUserRole('visitor');
    }
    setAuthLoading(false);
    // Se assistant, carrega permissões reais do banco
    if (role === 'assistant') {
      const { data: perms } = await supabase
        .from('assistant_permissions')
        .select('*')
        .eq('profile_id', session.user.id)
        .single();
      if (perms) {
        setAssistantPermissions({
          create_match: perms.create_match,
          edit_match: perms.edit_match,
          insert_stats: perms.insert_stats,
          edit_players: perms.edit_players,
          manage_finance: perms.manage_finance,
          manage_expenses: perms.manage_expenses,
          create_notices: perms.create_notices,
          edit_notices: perms.edit_notices,
          delete_notices: perms.delete_notices,
          import_history: perms.import_history,
        });
      }
    }
  };

  // Login real: email/senha via Supabase Auth (Admin ou Assistant).
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginModal) return;
    setLoginModal((m) => (m ? { ...m, submitting: true, error: null } : m));
    const { email, password } = loginModal;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoginModal((m) => (m ? { ...m, submitting: false, error: error.message } : m));
        return;
      }
      // O onAuthStateChange (abaixo) aplica o role real vindo de profiles.
      setLoginModal(null);
    } catch (err: any) {
      setLoginModal((m) => (m ? { ...m, submitting: false, error: err?.message || 'Erro de login.' } : m));
    }
  };

  // Logout real
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange reage e reconfigura como visitor
  };

  // Check Supabase Auth
  useEffect(() => {
    let active = true;
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (active) await applySession(session ? { user: { id: session.user.id, email: session.user.email } } : null);
    }
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (active) await applySession(session ? { user: { id: session.user.id, email: session.user.email } } : null);
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  // Fetch App Logo & Global settings
  useEffect(() => {
    async function fetchLogo() {
      try {
        const { data } = await supabase
          .from('settings')
          .select('app_logo_url')
          .eq('id', 'default')
          .single();
        if (data?.app_logo_url) {
          setAppLogoUrl(data.app_logo_url);
        }
      } catch (e) {
        console.error("Error loading logo:", e);
      }
    }
    fetchLogo();
  }, []);

  // DASHBOARD DYNAMIC DATA
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  
  // Dashboard Aggregations
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalMensalistas, setTotalMensalistas] = useState(0);
  const [totalDiaristas, setTotalDiaristas] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [totalGoals, setTotalGoals] = useState(0);
  const [totalAssists, setTotalAssists] = useState(0);
  const [topScorers, setTopScorers] = useState<any[]>([]);
  const [topAssists, setTopAssists] = useState<any[]>([]);
  const [topPoints, setTopPoints] = useState<any[]>([]);
  const [topRalabosta, setTopRalabosta] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  
  const [lastMatch, setLastMatch] = useState<any>(null);
  const [nextMatch, setNextMatch] = useState<any>(null);
  
  // Financeiro Aggregations
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  

  const [totalMonthlyPaid, setTotalMonthlyPaid] = useState(0);
  const [totalMonthlyPending, setTotalMonthlyPending] = useState(0);
  const [lastMatchDiarists, setLastMatchDiarists] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (activeTab === 'inicio') {
      fetchDashboardData();
    }
  }, [activeTab]);

  // REDIRECT VISITANTE DE ABAS PROIBIDAS
  useEffect(() => {
    if (currentUserRole === 'visitor') {
      if (['financeiro', 'mensalidades', 'avisos', 'configuracoes', 'relatorios'].includes(activeTab)) {
        setActiveTab('inicio');
      }
    }
  }, [currentUserRole, activeTab]);

  const handleSaveLastMatchEdits = async () => {
    if (!editingLastMatch) return;
    setSavingLastMatch(true);
    try {
      const payload = {
        isDashboardDetail: true,
        finalTeam1: editFinalTeam1,
        finalScore1: editFinalScore1,
        finalTeam2: editFinalTeam2,
        finalScore2: editFinalScore2,
        finalPenalties: editFinalPenalties,
        ralaTeam1: editRalabostaTeam1,
        ralaScore1: editRalabostaScore1,
        ralaTeam2: editRalabostaTeam2,
        ralaScore2: editRalabostaScore2,
        ralaPenalties: editRalabostaPenalties
      };

      const realLocation = (editingLastMatch.location || '').split('|')[0];
      const newLocation = `${realLocation}|${JSON.stringify(payload)}`;

      const { error } = await supabase
        .from('matches')
        .update({
          location: newLocation
        })
        .eq('id', editingLastMatch.id);

      if (error) {
        console.error(error);
        alert('Erro DB: ' + error.message);
        throw error;
      }
      setEditingLastMatch(null);
      fetchDashboardData();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar o placar detalhado: ' + (err.message || ''));
    } finally {
      setSavingLastMatch(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoadingDashboard(true);
      setDashboardError(null);
      
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
//       const currentMonthIndex = now.getMonth() + 1; // 1-12

      // 1. Fetch Settings
      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'default')
        .single();
      const settings = settingsData || {};
      const defDay = settings.default_match_day || 'Sexta-feira';
      const defTime = settings.default_match_time || '20:00';
      const defLocation = settings.default_location || 'Arena Ouro Preto';

      // 2. Fetch Notices
      const { data: noticesData } = await supabase
        .from('notices')
        .select('*')
        .eq('status', 'active')
        .gt('expires_at', now.toISOString());
      if (noticesData) setDashboardNotices(noticesData);

      // 3. Fetch Players (For count and birthdays)
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('is_active', true);
      
      const activePlayers = playersData || [];
      setTotalPlayers(activePlayers.length);
      setTotalMensalistas(activePlayers.filter((p: any) => p.category === 'Mensalista').length);
      setTotalDiaristas(activePlayers.filter((p: any) => p.category === 'Diarista').length);
      
      // Birthdays (closest 3 upcoming)
      const bdays = activePlayers.filter(p => p.birth_date).map(p => {
        const [y, m, d] = p.birth_date.split('-');
        let bdayThisYear = new Date(now.getFullYear(), parseInt(m, 10) - 1, parseInt(d, 10));
        
        // If birthday has passed this year, next one is next year
        if (bdayThisYear.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
          bdayThisYear = new Date(now.getFullYear() + 1, parseInt(m, 10) - 1, parseInt(d, 10));
        }
        
        let age = bdayThisYear.getFullYear() - parseInt(y, 10);
        return {
          name: p.name,
          age: age,
          date: `${d}/${m}`,
          photo: p.photo_url,
          nextBday: bdayThisYear
        };
      }).sort((a, b) => a.nextBday.getTime() - b.nextBday.getTime()).slice(0, 3);
      setBirthdays(bdays);

      // 3. Fetch Matches & Stats
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          *,
          match_players (
            player_id,
            category_at_match,
            player:players (id, name, photo_url, category)
          ),
          match_player_stats (*)
        `)
        .order('match_date', { ascending: false });

      const matches = matchesData || [];
      const finishedMatches = matches.filter(m => m.status === 'finished');
      setTotalMatches(finishedMatches.length);

      // Next and Last match
      const pendingMatch = matches.find(m => m.status === 'in_progress' || (m.status !== 'finished' && new Date(m.match_date) >= new Date(now.toDateString())));
      
      if (pendingMatch) {
        setNextMatch(pendingMatch);
      } else {
        const daysMap: Record<string, number> = {
          'Domingo': 0, 'Segunda-feira': 1, 'Terça-feira': 2, 'Quarta-feira': 3,
          'Quinta-feira': 4, 'Sexta-feira': 5, 'Sábado': 6
        };
        const targetDay = daysMap[defDay] !== undefined ? daysMap[defDay] : 5;
        const currentDay = now.getDay();
        let daysToAdd = targetDay - currentDay;
        
        // If today is targetDay, check time. If time passed, add 7 days.
        if (daysToAdd < 0) {
          daysToAdd += 7;
        } else if (daysToAdd === 0) {
          const [h, min] = defTime.split(':').map(Number);
          if (now.getHours() > h || (now.getHours() === h && now.getMinutes() > min)) {
            daysToAdd += 7;
          }
        }
        
        const nextDate = new Date(now);
        nextDate.setDate(now.getDate() + daysToAdd);
        
        setNextMatch({
          is_calculated: true,
          match_date: nextDate.toISOString().split('T')[0],
          match_time: defTime,
          location: defLocation
        });
      }
      
      const latestMatch = finishedMatches.length > 0 ? finishedMatches[0] : null;
      setLastMatch(latestMatch);

      if (latestMatch) {
        const diarists = (latestMatch.match_players || []).filter((mp: any) => mp.category_at_match === 'Diarista').length;
        setLastMatchDiarists(diarists);
      } else {
        setLastMatchDiarists(0);
      }

      // Aggregate Stats
      let tGoals = 0;
      let tAssists = 0;
      
      
      const playerStatsMap: Record<string, any> = {};

      finishedMatches.forEach(match => {
        const isHistorical = match.source === 'historical_manual' || match.source === 'historical_import';
        
        // Calculate biggest score
        // Removing biggestScore calculation as it's no longer displayed


        match.match_players?.forEach((mp: any) => {
          if (!mp.player) return;
          // Ignorar Diarista para stats nas partidas novas
          if (!isHistorical && mp.category_at_match === 'Diarista') return;

          const pId = mp.player.id;
          if (!playerStatsMap[pId]) {
            playerStatsMap[pId] = {
              id: pId,
              name: mp.player.name,
              photo: mp.player.photo_url,
              position: mp.player.position,
              goals: 0,
              assists: 0,
              champion: 0,
              vice: 0,
              ralabosta: 0,
              games: 0,
              points: 0
            };
          }

          const stats = match.match_player_stats?.find((s: any) => s.player_id === pId);
          
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

          playerStatsMap[pId].games += 1;
          if (isChamp) playerStatsMap[pId].champion += 1;
          if (isVice) playerStatsMap[pId].vice += 1;
          if (isRala) playerStatsMap[pId].ralabosta += 1;

          if (stats) {
            tGoals += (stats.goals || 0);
            tAssists += (stats.assists || 0);

            playerStatsMap[pId].goals += (stats.goals || 0);
            playerStatsMap[pId].assists += (stats.assists || 0);
          }
        });
      });

      setTotalGoals(tGoals);
      setTotalAssists(tAssists);


      const allPlayersList = Object.values(playerStatsMap);
      
      allPlayersList.forEach(ps => {
        ps.points = ps.goals + ps.assists + (ps.champion * 3) + (ps.vice * 1);
      });

      const scorers = [...allPlayersList].sort((a, b) => {
        if (b.goals !== a.goals) return b.goals - a.goals;
        if (b.assists !== a.assists) return b.assists - a.assists;
        if (a.games !== b.games) return a.games - b.games;
        return a.name.localeCompare(b.name);
      }).slice(0, 3).map((p, i) => ({ ...p, rank: i+1, count: p.goals }));
      
      const assisters = [...allPlayersList].sort((a, b) => {
        if (b.assists !== a.assists) return b.assists - a.assists;
        if (b.goals !== a.goals) return b.goals - a.goals;
        if (a.games !== b.games) return a.games - b.games;
        return a.name.localeCompare(b.name);
      }).slice(0, 3).map((p, i) => ({ ...p, rank: i+1, count: p.assists }));
      
      const pointsList = [...allPlayersList].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goals !== a.goals) return b.goals - a.goals;
        if (b.assists !== a.assists) return b.assists - a.assists;
        if (b.champion !== a.champion) return b.champion - a.champion;
        if (a.games !== b.games) return a.games - b.games;
        return a.name.localeCompare(b.name);
      }).slice(0, 3).map((p, i) => ({ ...p, rank: i+1, count: p.points }));

      const ralaList = [...allPlayersList].sort((a, b) => {
        if (b.ralabosta !== a.ralabosta) return b.ralabosta - a.ralabosta;
        if (a.games !== b.games) return a.games - b.games;
        return a.name.localeCompare(b.name);
      }).slice(0, 3).map((p, i) => ({ ...p, rank: i+1, count: p.ralabosta }));
      
      setTopScorers(scorers);
      setTopAssists(assisters);
      setTopPoints(pointsList);
      setTopRalabosta(ralaList);

      // 4. Fetch Finance
      const { data: paymentsData } = await supabase
        .from('monthly_payments')
        .select('*');
      
      const payments = paymentsData || [];

      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*');
      const expenses = expensesData || [];
      
      let allTimeRevenue = 0;
      let monthRevenue = 0;
      let monthPending = 0;
      let monthPaidCount = 0;
      let monthPendingCount = 0;
      let allTimeExpenses = 0;
      let monthExpenses = 0;

      expenses.forEach(e => {
        allTimeExpenses += Number(e.amount || 0);
        if (e.expense_date && e.expense_date.startsWith(currentMonthStr)) {
          monthExpenses += Number(e.amount || 0);
        }
      });

      // Diárias (All time)
      const totalDailyFees = finishedMatches.reduce((acc, m) => acc + Number(m.daily_total || 0), 0);
      
      // Diárias (Current month)
      const currentMonthMatches = finishedMatches.filter(m => {
        const mMonth = m.match_date.substring(0, 7);
        return mMonth === currentMonthStr;
      });
      const monthDailyFees = currentMonthMatches.reduce((acc, m) => acc + Number(m.daily_total || 0), 0);

      // Mensalidades - Arrecadação (baseado em todos os pagamentos reais)
      payments.forEach(p => {
        if (p.status === 'paid') {
          allTimeRevenue += Number(p.amount);
          if (p.payment_month === currentMonthStr) {
            monthRevenue += Number(p.amount);
          }
        }
      });

      // Mensalidades - Pendências e Contadores (Sincronizado com a tela Mensalidades)
      const defMonthlyFee = settings.monthly_fee ? Number(settings.monthly_fee) : 60;
      const currentMonthPayments = payments.filter(p => p.payment_month === currentMonthStr);
      
      activePlayers.forEach(player => {
        const record = currentMonthPayments.find(p => p.player_id === player.id);
        
        if (player.category === 'Mensalista') {
          if (record) {
            if (record.status === 'paid') {
              monthPaidCount++;
            } else {
              monthPending += Number(record.amount);
              monthPendingCount++;
            }
          } else {
            monthPending += defMonthlyFee;
            monthPendingCount++;
          }
        } else {
          // Diarista: entra na contagem apenas se tiver pago pelo módulo de Mensalidades
          if (record && record.status === 'paid') {
            monthPaidCount++;
          }
        }
      });

      setTotalRevenue(allTimeRevenue + totalDailyFees);
      setMonthlyRevenue(monthRevenue + monthDailyFees);
      setPendingAmount(monthPending);
      setTotalMonthlyPaid(monthPaidCount);
      setTotalMonthlyPending(monthPendingCount);
      setTotalExpenses(allTimeExpenses);
      setMonthlyExpenses(monthExpenses);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setDashboardError('Houve um erro ao carregar os dados reais do Dashboard.');
    } finally {
      setLoadingDashboard(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212', color: '#fff' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: '#818cf8' }} />
      </div>
    );
  }

  const renderPodium = (data: any[], title: string, icon: any, color: string, suffix: string, emptyMsg: string) => (
    <div className="dashboard-card" style={{ cursor: 'pointer', transition: 'var(--transition)' }} onClick={() => setActiveTab('ranking')}>
      <div className="card-header" style={{ marginBottom: '16px' }}>
        <span className="card-title" style={{ color: color, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon} {title}
        </span>
      </div>
      {data.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '4px', height: '140px', paddingBottom: '16px', marginTop: '16px' }}>
          {/* 3º Lugar */}
          {data[2] && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, width: 0 }}>
              <img src={data[2].photo || '/default.png'} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #cd7f32' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '4px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{data[2].name.split(' ')[0]}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-secondary)' }}>{data[2].count} {suffix}</span>
              <div style={{ width: '100%', height: '40px', backgroundColor: 'rgba(205,127,50,0.1)', borderTop: '2px solid #cd7f32', marginTop: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 800, color: '#cd7f32', borderRadius: '4px 4px 0 0' }}>3º</div>
            </div>
          )}

          {/* 1º Lugar */}
          {data[0] && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1.2, zIndex: 2, width: 0 }}>
              <Crown size={16} color={color} style={{ marginBottom: '2px' }} />
              <img src={data[0].photo || '/default.png'} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${color}` }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, marginTop: '4px', textAlign: 'center', color: color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{data[0].name.split(' ')[0]}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#fff' }}>{data[0].count} {suffix}</span>
              <div style={{ width: '100%', height: '60px', backgroundColor: `${color}1A`, borderTop: `3px solid ${color}`, marginTop: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 900, fontSize: '1.2rem', color: color, borderRadius: '4px 4px 0 0' }}>1º</div>
            </div>
          )}

          {/* 2º Lugar */}
          {data[1] && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, width: 0 }}>
              <img src={data[1].photo || '/default.png'} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #c0c0c0' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '4px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{data[1].name.split(' ')[0]}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-secondary)' }}>{data[1].count} {suffix}</span>
              <div style={{ width: '100%', height: '50px', backgroundColor: 'rgba(192,192,192,0.1)', borderTop: '2px solid #c0c0c0', marginTop: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 800, color: '#c0c0c0', borderRadius: '4px 4px 0 0' }}>2º</div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
          {emptyMsg}
        </div>
      )}
    </div>
  );

  return (
    <div className="app-container" onClick={() => isUserMenuOpen && setIsUserMenuOpen(false)}>
      {/* CABEÇALHO FIXO */}
      <header className="header" onClick={(e) => e.stopPropagation()}>
        <button 
          className="header-menu-btn" 
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>

        <div className="header-center">
          <img 
            src={appLogoUrl || "/logo.jpg"} 
            alt="Logo RDA" 
            style={{ 
              height: '40px', 
              width: '40px',
              objectFit: 'cover', 
              display: 'block',
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.12)',
              boxShadow: '0 0 12px rgba(99,102,241,0.3)'
            }} 
          />
        </div>

        <div style={{ position: 'relative', justifySelf: 'end' }}>
          <button 
            className="header-admin-btn" 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            aria-label="Painel administrativo"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: isUserMenuOpen ? '1.5px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)' 
            }}
          >
            {currentUserRole === 'admin' ? (
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A</span>
            ) : (
              <UserRound size={22} />
            )}
          </button>
          
          {isUserMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '52px',
              right: 0,
              width: 'min(320px, calc(100vw - 24px))',
              maxWidth: '320px',
              backgroundColor: '#171717',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              boxShadow: '0 16px 40px -8px rgba(0,0,0,0.7)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              zIndex: 1100,
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}>
              {/* Cabeçalho do perfil */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', minWidth: 0 }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                  background: currentUserRole === 'admin' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                    : currentUserRole === 'assistant' ? 'linear-gradient(135deg,#0ea5e9,#6366f1)'
                    : currentUserRole === 'treasurer' ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                    : 'linear-gradient(135deg,#374151,#4b5563)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <UserRound size={18} style={{ color: '#fff' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  {(() => {
                    console.log('[RDA MENU] role recebido:', currentUserRole);
                    return null;
                  })()}
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentUserRole === 'admin' ? 'Administrador RDA' : currentUserRole === 'assistant' ? 'Assistente RDA' : currentUserRole === 'treasurer' ? 'Tesoureiro RDA' : 'Visitante RDA'}
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px',
                    color: currentUserRole === 'admin' ? '#818cf8' : currentUserRole === 'assistant' ? '#38bdf8' : currentUserRole === 'treasurer' ? '#fbbf24' : '#6b7280'
                  }}>
                    <Shield size={11} />
                    {currentUserRole === 'admin' ? 'Administrador' : currentUserRole === 'assistant' ? 'Assistente' : currentUserRole === 'treasurer' ? 'Tesoureiro' : 'Visitante'}
                  </span>
                </div>
              </div>

              {/* E-mail da sessão (quando disponível) */}
              {currentEmail && (
                <div style={{
                  fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  minWidth: 0, paddingBottom: '2px',
                }}>
                  {currentEmail}
                </div>
              )}

              {/* Ações: Visitante (somente leitura) | Login real (Admin/Assistente) | Logout */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {!currentUserId ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      onClick={enterVisitor}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '10px',
                        border: '1.5px solid',
                        borderColor: currentUserRole === 'visitor' ? '#6b7280' : 'rgba(255,255,255,0.06)',
                        backgroundColor: currentUserRole === 'visitor' ? 'rgba(107,114,128,0.15)' : 'rgba(255,255,255,0.02)',
                        color: currentUserRole === 'visitor' ? '#d1d5db' : 'var(--text-secondary)',
                        fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>👁</span>
                      Visitante
                    </button>
                    <button
                      onClick={() => { setLoginModal({ role: 'admin', email: '', password: '', error: null, submitting: false }); setIsUserMenuOpen(false); }}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '10px',
                        border: '1.5px solid',
                        borderColor: currentUserRole === 'admin' ? '#818cf8' : 'rgba(255,255,255,0.06)',
                        backgroundColor: currentUserRole === 'admin' ? 'rgba(129,140,248,0.12)' : 'rgba(255,255,255,0.02)',
                        color: currentUserRole === 'admin' ? '#818cf8' : 'var(--text-secondary)',
                        fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>🔐</span>
                      Admin
                    </button>
                    <button
                      onClick={() => { setLoginModal({ role: 'assistant', email: '', password: '', error: null, submitting: false }); setIsUserMenuOpen(false); }}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '10px',
                        border: '1.5px solid',
                        borderColor: currentUserRole === 'assistant' ? '#38bdf8' : 'rgba(255,255,255,0.06)',
                        backgroundColor: currentUserRole === 'assistant' ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.02)',
                        color: currentUserRole === 'assistant' ? '#38bdf8' : 'var(--text-secondary)',
                        fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>🤝</span>
                      Assistente
                    </button>
                  </div>
                ) : (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                    {/* Botão Sair — compacto, alinhado à direita */}
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(239,68,68,0.25)',
                        backgroundColor: 'rgba(239,68,68,0.06)',
                        color: '#f87171',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <LogOut size={14} />
                      Sair
                    </button>
                  </div>
                )}
              </div>

              {/* Links rápidos (apenas admin autenticado) */}
              {currentUserRole === 'admin' && currentUserId && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    onClick={() => { setActiveTab('configuracoes'); setIsUserMenuOpen(false); }}
                    style={{ background: 'none', border: 'none', color: '#fff', padding: '8px 10px', textAlign: 'left', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                  >
                    <Settings size={14} /> Gerenciar Usuários
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Modal de Login (Admin / Assistente) — autenticação real do Supabase Auth */}
          {loginModal && (
            <div style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 9999, backdropFilter: 'blur(4px)'
            }} onClick={() => !loginModal.submitting && setLoginModal(null)}>
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px', padding: '28px 24px', width: '320px',
                  display: 'flex', flexDirection: 'column', gap: '20px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
                }}
              >
                <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{loginModal.role === 'admin' ? '🔐' : '🤝'}</div>
                    <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                      Entrar como {loginModal.role === 'admin' ? 'Administrador' : 'Assistente'}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '6px' }}>
                      Use seu email e senha do Supabase Auth
                    </p>
                  </div>

                  <input
                    type="email"
                    placeholder="Email"
                    required
                    autoFocus
                    value={loginModal.email}
                    onChange={(e) => setLoginModal({ ...loginModal, email: e.target.value, error: null })}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '10px',
                      backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box'
                    }}
                  />

                  <input
                    type="password"
                    placeholder="Senha (6 dígitos)"
                    required
                    autoComplete="current-password"
                    value={loginModal.password}
                    onChange={(e) => setLoginModal({ ...loginModal, password: e.target.value, error: null })}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '10px',
                      backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff', fontSize: '1rem', fontFamily: 'inherit', outline: 'none',
                      letterSpacing: '0.2em', textAlign: 'center', boxSizing: 'border-box'
                    }}
                  />

                  {loginModal.error && (
                    <div style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>{loginModal.error}</div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      disabled={loginModal.submitting}
                      onClick={() => setLoginModal(null)}
                      style={{ padding: '11px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                    >Cancelar</button>
                    <button
                      type="submit"
                      disabled={loginModal.submitting}
                      style={{
                        padding: '11px', borderRadius: '10px', border: 'none',
                        background: loginModal.role === 'admin'
                          ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                          : 'linear-gradient(135deg,#0ea5e9,#6366f1)',
                        color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', opacity: loginModal.submitting ? 0.7 : 1
                      }}
                    >{loginModal.submitting ? 'Entrando...' : 'Entrar'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* MENU LATERAL (SIDEBAR) & OVERLAY */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">RDA</span>
          <button 
            className="sidebar-close-btn" 
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <a 
            href="#" 
            className="sidebar-item"
            style={{
              color: '#3b82f6',
              opacity: activeTab === 'inicio' ? 1 : 0.65,
              backgroundColor: activeTab === 'inicio' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              textShadow: activeTab === 'inicio' ? '0 0 8px rgba(59, 130, 246, 0.4)' : 'none',
              fontWeight: activeTab === 'inicio' ? 600 : 500,
            }}
            onClick={(e) => { e.preventDefault(); setActiveTab('inicio'); setIsSidebarOpen(false); }}
          >
            <Home size={20} style={{ filter: activeTab === 'inicio' ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))' : 'none' }} />
            <span>Início</span>
          </a>
          <a 
            href="#" 
            className="sidebar-item"
            style={{
              color: '#22c55e',
              opacity: activeTab === 'jogadores' ? 1 : 0.65,
              backgroundColor: activeTab === 'jogadores' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
              textShadow: activeTab === 'jogadores' ? '0 0 8px rgba(34, 197, 94, 0.4)' : 'none',
              fontWeight: activeTab === 'jogadores' ? 600 : 500,
            }}
            onClick={(e) => { e.preventDefault(); setActiveTab('jogadores'); setIsSidebarOpen(false); }}
          >
            <Users size={20} style={{ filter: activeTab === 'jogadores' ? 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.5))' : 'none' }} />
            <span>Jogadores</span>
          </a>
          <a 
            href="#" 
            className="sidebar-item"
            style={{
              color: '#eab308',
              opacity: activeTab === 'ranking' ? 1 : 0.65,
              backgroundColor: activeTab === 'ranking' ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
              textShadow: activeTab === 'ranking' ? '0 0 8px rgba(234, 179, 8, 0.4)' : 'none',
              fontWeight: activeTab === 'ranking' ? 600 : 500,
            }}
            onClick={(e) => { e.preventDefault(); setActiveTab('ranking'); setIsSidebarOpen(false); }}
          >
            <Award size={20} style={{ filter: activeTab === 'ranking' ? 'drop-shadow(0 0 4px rgba(234, 179, 8, 0.5))' : 'none' }} />
            <span>Ranking</span>
          </a>
          <a 
            href="#" 
            className="sidebar-item"
            style={{
              color: '#f97316',
              opacity: activeTab === 'partidas' ? 1 : 0.65,
              backgroundColor: activeTab === 'partidas' ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
              textShadow: activeTab === 'partidas' ? '0 0 8px rgba(249, 115, 22, 0.4)' : 'none',
              fontWeight: activeTab === 'partidas' ? 600 : 500,
            }}
            onClick={(e) => { e.preventDefault(); setActiveTab('partidas'); setIsSidebarOpen(false); }}
          >
            <Trophy size={20} style={{ filter: activeTab === 'partidas' ? 'drop-shadow(0 0 4px rgba(249, 115, 22, 0.5))' : 'none' }} />
            <span>Partidas</span>
          </a>
          <a 
            href="#" 
            className="sidebar-item"
            style={{
              color: '#06b6d4',
              opacity: activeTab === 'historico' ? 1 : 0.65,
              backgroundColor: activeTab === 'historico' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              textShadow: activeTab === 'historico' ? '0 0 8px rgba(6, 182, 212, 0.4)' : 'none',
              fontWeight: activeTab === 'historico' ? 600 : 500,
            }}
            onClick={(e) => { e.preventDefault(); setActiveTab('historico'); setIsSidebarOpen(false); }}
          >
            <Clock size={20} style={{ filter: activeTab === 'historico' ? 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.5))' : 'none' }} />
            <span>Histórico</span>
          </a>
          {currentUserRole !== 'visitor' && (
            <>
              <a 
                href="#" 
                className="sidebar-item"
                style={{
                  color: '#10b981',
                  opacity: activeTab === 'mensalidades' ? 1 : 0.65,
                  backgroundColor: activeTab === 'mensalidades' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  textShadow: activeTab === 'mensalidades' ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none',
                  fontWeight: activeTab === 'mensalidades' ? 600 : 500,
                }}
                onClick={(e) => { e.preventDefault(); setActiveTab('mensalidades'); setIsSidebarOpen(false); }}
              >
                <Wallet size={20} style={{ filter: activeTab === 'mensalidades' ? 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))' : 'none' }} />
                <span>Mensalidades</span>
              </a>
              <a 
                href="#" 
                className="sidebar-item"
                style={{
                  color: '#14b8a6',
                  opacity: activeTab === 'financeiro' ? 1 : 0.65,
                  backgroundColor: activeTab === 'financeiro' ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                  textShadow: activeTab === 'financeiro' ? '0 0 8px rgba(20, 184, 166, 0.4)' : 'none',
                  fontWeight: activeTab === 'financeiro' ? 600 : 500,
                }}
                onClick={(e) => { e.preventDefault(); setActiveTab('financeiro'); setIsSidebarOpen(false); }}
              >
                <DollarSign size={20} style={{ filter: activeTab === 'financeiro' ? 'drop-shadow(0 0 4px rgba(20, 184, 166, 0.5))' : 'none' }} />
                <span>Financeiro</span>
              </a>
              <a 
                href="#" 
                className="sidebar-item"
                style={{
                  color: '#38bdf8',
                  opacity: activeTab === 'relatorios' ? 1 : 0.65,
                  backgroundColor: activeTab === 'relatorios' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  textShadow: activeTab === 'relatorios' ? '0 0 8px rgba(56, 189, 248, 0.4)' : 'none',
                  fontWeight: activeTab === 'relatorios' ? 600 : 500,
                }}
                onClick={(e) => { e.preventDefault(); setActiveTab('relatorios'); setIsSidebarOpen(false); }}
              >
                <FileText size={20} style={{ filter: activeTab === 'relatorios' ? 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.5))' : 'none' }} />
                <span>Relatórios</span>
              </a>
              <a 
                href="#" 
                className="sidebar-item"
                style={{
                  color: '#fb7185',
                  opacity: activeTab === 'avisos' ? 1 : 0.65,
                  backgroundColor: activeTab === 'avisos' ? 'rgba(251, 113, 133, 0.15)' : 'transparent',
                  textShadow: activeTab === 'avisos' ? '0 0 8px rgba(251, 113, 133, 0.4)' : 'none',
                  fontWeight: activeTab === 'avisos' ? 600 : 500,
                }}
                onClick={(e) => { e.preventDefault(); setActiveTab('avisos'); setIsSidebarOpen(false); }}
              >
                <MessageSquare size={20} style={{ filter: activeTab === 'avisos' ? 'drop-shadow(0 0 4px rgba(251, 113, 133, 0.5))' : 'none' }} />
                <span>Avisos</span>
              </a>
              <a 
                href="#" 
                className="sidebar-item"
                style={{
                  color: '#a855f7',
                  opacity: activeTab === 'configuracoes' ? 1 : 0.65,
                  backgroundColor: activeTab === 'configuracoes' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                  textShadow: activeTab === 'configuracoes' ? '0 0 8px rgba(168, 85, 247, 0.4)' : 'none',
                  fontWeight: activeTab === 'configuracoes' ? 600 : 500,
                }}
                onClick={(e) => { e.preventDefault(); setActiveTab('configuracoes'); setIsSidebarOpen(false); }}
              >
                <Settings size={20} style={{ filter: activeTab === 'configuracoes' ? 'drop-shadow(0 0 4px rgba(168, 85, 247, 0.5))' : 'none' }} />
                <span>Configuração</span>
              </a>
            </>
          )}
        </nav>
      </aside>

      {/* CONTEÚDO PRINCIPAL COM DISTÂNCIAS EXATAS */}
      <main className="main-content">
        {activeTab === 'inicio' ? (
          <>
            {loadingDashboard ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '16px', color: 'var(--text-muted)' }}>
                <Loader2 size={32} className="spinner" />
                <p>Consultando banco de dados...</p>
              </div>

            ) : dashboardError ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444' }}>
                <AlertCircle size={32} style={{ margin: '0 auto 8px auto' }} />
                <p>{dashboardError}</p>
              </div>
            ) : (
              <>
                {/* CARD 01 — RESUMO DA TEMPORADA */}
                <div className="dashboard-card">
                  <div className="card-header">
                    <span className="card-title">
                      <Award size={18} /> Resumo da Temporada
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{
                      backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(59,130,246,0.35)',
                      borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px',
                      position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-start', color: '#3b82f6', marginBottom: '2px', position: 'relative', zIndex: 1 }}>
                        <Users size={16} />
                      </div>
                      <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', lineHeight: 1, position: 'relative', zIndex: 1 }}>{totalPlayers}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'relative', zIndex: 1 }}>Jogadores</span>
                      <div style={{ display: 'flex', gap: '4px', fontSize: '0.65rem', fontWeight: 700, marginTop: '2px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                        <span style={{ color: '#22c55e' }}>{totalMensalistas} Mensalistas</span>
                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                        <span style={{ color: '#f87171' }}>{totalDiaristas} Diaristas</span>
                      </div>
                      <Users size={36} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.15, color: '#3b82f6', zIndex: 0 }} />
                    </div>
                    
                    <div style={{
                      backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(249,115,22,0.35)',
                      borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px',
                      position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-start', color: '#f97316', marginBottom: '2px', position: 'relative', zIndex: 1 }}>
                        <CalendarDays size={16} />
                      </div>
                      <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', lineHeight: 1, position: 'relative', zIndex: 1 }}>{totalMatches}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'relative', zIndex: 1 }}>Partidas</span>
                      <Trophy size={36} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.15, color: '#f97316', zIndex: 0 }} />
                    </div>

                    <div style={{
                      backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(34,197,94,0.35)',
                      borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px',
                      position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-start', color: '#22c55e', marginBottom: '2px', position: 'relative', zIndex: 1 }}>
                        <Flame size={16} />
                      </div>
                      <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', lineHeight: 1, position: 'relative', zIndex: 1 }}>{totalGoals}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'relative', zIndex: 1 }}>Gols</span>
                      <Goal size={36} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.15, color: '#22c55e', zIndex: 0 }} />
                    </div>

                    <div style={{
                      backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(168,85,247,0.35)',
                      borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px',
                      position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-start', color: '#a855f7', marginBottom: '2px', position: 'relative', zIndex: 1 }}>
                        <Star size={16} />
                      </div>
                      <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', lineHeight: 1, position: 'relative', zIndex: 1 }}>{totalAssists}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'relative', zIndex: 1 }}>Assistências</span>
                      <Sparkles size={36} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.15, color: '#a855f7', zIndex: 0 }} />
                    </div>
                  </div>
                </div>

                {dashboardNotices.length > 0 && (
                  <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="card-header">
                      <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={18} /> Quadro de Avisos
                      </span>
                    </div>
                    <div className="notices-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(() => {
                        const importanceWeight: Record<string, number> = { urgent: 1, important: 2, attention: 3, normal: 4 };
                        const sorted = [...dashboardNotices].sort((a, b) => {
                          const weightA = importanceWeight[a.importance] || 4;
                          const weightB = importanceWeight[b.importance] || 4;
                          if (weightA !== weightB) return weightA - weightB;
                          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                        });
                        const top5 = sorted.slice(0, 5);
  
                        if (top5.length === 0) {
                          return (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '16px' }}>
                              Nenhum aviso ativo.
                            </div>
                          );
                        }
  
                        const getRemainingText = (expiresAtStr: string): string => {
                          const now = new Date();
                          const expiresAt = new Date(expiresAtStr);
                          const diffMs = expiresAt.getTime() - now.getTime();
                          if (diffMs <= 0) return 'Expirado';
  
                          const diffMins = Math.floor(diffMs / 60000);
                          const diffHours = Math.floor(diffMins / 60);
                          const diffDays = Math.floor(diffHours / 24);
  
                          if (diffDays > 0) return `Expira em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
                          if (diffHours > 0) return `Expira em ${diffHours}h ${diffMins % 60}min`;
                          return `Expira em ${diffMins}min`;
                        };
  
                        const getImportanceConfig = (imp: string) => {
                          if (imp === 'urgent') return { label: 'URGENTE', color: '#ef4444', border: '1.5px solid rgba(239,68,68,0.3)' };
                          if (imp === 'important') return { label: 'IMPORTANTE', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' };
                          if (imp === 'attention') return { label: 'ATENÇÃO', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' };
                          return { label: 'NORMAL', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' };
                        };
  
                        return (
                          <>
                            {top5.map((aviso) => {
                              const conf = getImportanceConfig(aviso.importance);
                              const isUrgent = aviso.importance === 'urgent';
                              return (
                                <div 
                                  key={aviso.id}
                                  className={isUrgent ? 'card-urgent-animated' : ''}
                                  style={{
                                    padding: '10px 12px',
                                    backgroundColor: 'rgba(255,255,255,0.015)',
                                    border: isUrgent ? '2px solid transparent' : conf.border,
                                    borderRadius: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    position: 'relative'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{
                                      fontSize: '0.58rem',
                                      fontWeight: 850,
                                      color: conf.color,
                                      letterSpacing: '0.2px'
                                    }}>
                                      {conf.label}
                                    </span>
                                    {isUrgent && (
                                      <div className="siren-animated" style={{ color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                                        <Siren size={14} />
                                      </div>
                                    )}
                                  </div>
                                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>
                                    {aviso.title}
                                  </span>
                                  <p style={{
                                    fontSize: '0.78rem',
                                    color: 'var(--text-secondary)',
                                    margin: 0,
                                    lineHeight: '1.35',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {aviso.message}
                                  </p>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px', marginTop: '2px' }}>
                                    <span style={{ color: isUrgent ? '#ef4444' : '#fbbf24', fontWeight: 600 }}>
                                      {getRemainingText(aviso.expires_at)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {dashboardNotices.length > 5 && (
                              <button
                                onClick={() => setActiveTab('avisos')}
                                style={{
                                  alignSelf: 'center',
                                  background: 'none',
                                  border: 'none',
                                  color: '#818cf8',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  padding: '4px 8px',
                                  marginTop: '2px',
                                  transition: 'var(--transition)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#a5b4fc'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#818cf8'}
                              >
                                Ver todos
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  {/* CARD 02 — FINANCEIRO */}
                                  <div className="dashboard-card">
                                    <div className="card-header">
                                      <span className="card-title">
                                        <DollarSign size={18} /> Financeiro Geral
                                      </span>
                                    </div>
                                    <div className="finance-grid">
                                      <div className="finance-item">
                                        <span className="finance-label">Arrecadação Total</span>
                                        <span className="finance-value positive">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
                                        </span>
                                      </div>
                                      <div className="finance-item">
                                        <span className="finance-label">Despesas Totais</span>
                                        <span className="finance-value negative">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpenses)}
                                        </span>
                                      </div>
                                      <div className="finance-item">
                                        <span className="finance-label">Recebido no mês</span>
                                        <span className="finance-value positive">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyRevenue)}
                                        </span>
                                      </div>
                                      <div className="finance-item">
                                        <span className="finance-label">Despesas (mês)</span>
                                        <span className="finance-value negative">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyExpenses)}
                                        </span>
                                      </div>
                                      <div className="finance-item">
                                        <span className="finance-label">Pendências (mês)</span>
                                        <span className="finance-value negative">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingAmount)}
                                        </span>
                                      </div>
                                      <div className="finance-item">
                                        <span className="finance-label">Saldo Atual</span>
                                        <span className="finance-value positive">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue - totalExpenses)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                  {/* CARD 08 — RESUMO MENSAL */}
                                  <div className="dashboard-card" style={{ padding: '16px' }}>
                                    <div className="card-header" style={{ marginBottom: '16px' }}>
                                      <span className="card-title">
                                        <FileText size={18} /> Resumo Mensal (Atual)
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                      {/* Pagos */}
                                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px' }}>
                                        <div style={{ color: '#22c55e', marginBottom: '2px' }}><CircleCheck size={26} strokeWidth={1.5} /></div>
                                        <span style={{ fontSize: '22px', fontWeight: 900, color: '#22c55e', lineHeight: 1 }}>{totalMonthlyPaid}</span>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Mensalistas<br/>pagos</span>
                                      </div>
                                      
                                      <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)', height: '45px', alignSelf: 'center' }}></div>
                
                                      {/* Pendentes */}
                                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px' }}>
                                        <div style={{ color: '#ef4444', marginBottom: '2px' }}><CircleAlert size={26} strokeWidth={1.5} /></div>
                                        <span style={{ fontSize: '22px', fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>{totalMonthlyPending}</span>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Mensalistas<br/>pendentes</span>
                                      </div>
                
                                      <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)', height: '45px', alignSelf: 'center' }}></div>
                
                                      {/* Diaristas */}
                                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px' }}>
                                        <div style={{ color: '#f97316', marginBottom: '2px' }}><Users size={26} strokeWidth={1.5} /></div>
                                        <span style={{ fontSize: '22px', fontWeight: 900, color: '#f97316', lineHeight: 1 }}>{lastMatchDiarists}</span>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Diaristas<br/>(Últ. Partida)</span>
                                      </div>
                                    </div>
                                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  {/* CARD 03 — PRÓXIMA PARTIDA */}
                                  <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div className="card-header">
                                      <span className="card-title">
                                        <Calendar size={18} /> Próxima Partida
                                      </span>
                                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'rgba(99,102,241,0.2)', color: '#818cf8', fontWeight: 600 }}>
                                        {nextMatch ? 'Agendado' : 'Sem agendamento'}
                                      </span>
                                    </div>
                                    {nextMatch ? (
                                      <div className="match-info">
                                        <div className="match-item">
                                          <MapPin size={16} />
                                          <span>{nextMatch.location || 'Local a definir'}</span>
                                        </div>
                                        <div className="match-item">
                                          <Calendar size={16} />
                                          <span>{nextMatch.match_date.split('-').reverse().join('/')}</span>
                                        </div>
                                        <div className="match-item">
                                          <Clock size={16} />
                                          <span>{nextMatch.match_time.slice(0, 5)}h</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Nenhuma partida programada
                                      </div>
                                    )}
                                    <button className="btn-card" style={{ marginTop: 'auto' }} onClick={() => setActiveTab('partidas')}>
                                      Ver Partidas
                                    </button>
                                  </div>
                  {/* CARD 06 — ÚLTIMA PARTIDA */}
                                  <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span className="card-title">
                                        <Activity size={18} /> Última Partida
                                      </span>
                                      {lastMatch && can('edit_match') && (
                                        <button 
                                          onClick={() => {
                                            setEditingLastMatch(lastMatch);
                                            let parsed = null;
                                            const locParts = (lastMatch.location || '').split('|');
                                            if (locParts.length > 1 && locParts[1].startsWith('{')) {
                                              try {
                                                const temp = JSON.parse(locParts[1]);
                                                if (temp.isDashboardDetail) parsed = temp;
                                              } catch(e) {}
                                            }
                                            
                                            setEditFinalTeam1(parsed?.finalTeam1 || '');
                                            setEditFinalScore1(parsed?.finalScore1 || '');
                                            setEditFinalTeam2(parsed?.finalTeam2 || '');
                                            setEditFinalScore2(parsed?.finalScore2 || '');
                                            setEditFinalPenalties(parsed?.finalPenalties || false);
                                            
                                            setEditRalabostaTeam1(parsed?.ralaTeam1 || '');
                                            setEditRalabostaScore1(parsed?.ralaScore1 || '');
                                            setEditRalabostaTeam2(parsed?.ralaTeam2 || '');
                                            setEditRalabostaScore2(parsed?.ralaScore2 || '');
                                            setEditRalabostaPenalties(parsed?.ralaPenalties || false);
                                          }}
                                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                          <Edit size={16} />
                                        </button>
                                      )}
                                    </div>
                                    {lastMatch ? (
                                      (() => {
                                        let detail = null;
                                        const locParts = (lastMatch.location || '').split('|');
                                        const realLocation = locParts[0];
                                        if (locParts.length > 1 && locParts[1].startsWith('{')) {
                                          try {
                                            const parsed = JSON.parse(locParts[1]);
                                            if (parsed.isDashboardDetail) detail = parsed;
                                          } catch(e) {}
                                        }
                                        
                                        return (
                                          <div className="match-info">
                                            <div className="match-item">
                                              <Calendar size={16} />
                                              <span>{lastMatch.match_date.split('-').reverse().join('/')}</span>
                                            </div>
                                            <div className="match-item">
                                              <MapPin size={16} />
                                              <span>{realLocation}</span>
                                            </div>
                                            {detail ? (
                                              <>
                                                <div className="match-item" style={{ alignItems: 'flex-start' }}>
                                                  <Award size={16} style={{ marginTop: '2px', color: '#fbbf24' }} />
                                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, color: '#fbbf24' }}>Final</span>
                                                    <span>{detail.finalTeam1 || '?'} {detail.finalScore1} x {detail.finalScore2} {detail.finalTeam2 || '?'} {detail.finalPenalties ? '(Pênaltis)' : ''}</span>
                                                  </div>
                                                </div>
                                                <div className="match-item" style={{ alignItems: 'flex-start' }}>
                                                  <Users size={16} style={{ marginTop: '2px', color: '#94a3b8' }} />
                                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, color: '#94a3b8' }}>Ralabosta</span>
                                                    <span>{detail.ralaTeam1 || '?'} {detail.ralaScore1} x {detail.ralaScore2} {detail.ralaTeam2 || '?'} {detail.ralaPenalties ? '(Pênaltis)' : ''}</span>
                                                  </div>
                                                </div>
                                              </>
                                            ) : (
                                              <>
                                                <div className="match-item">
                                                  <Award size={16} />
                                                  <span>Placar: {lastMatch.team_1_name || 'Colete'} {lastMatch.team_1_score !== null ? lastMatch.team_1_score : ''} x {lastMatch.team_2_score !== null ? lastMatch.team_2_score : ''} {lastMatch.team_2_name || 'S/ Colete'}</span>
                                                </div>
                                                <div className="match-item">
                                                  <Users size={16} />
                                                  <span>Campeão: {lastMatch.champion_team === 'team_1' ? (lastMatch.team_1_name || 'Colete') : lastMatch.champion_team === 'team_2' ? (lastMatch.team_2_name || 'S/ Colete') : (lastMatch.champion_team || 'Empate / N/A')}</span>
                                                </div>
                                                <div className="match-item">
                                                  <Users size={16} />
                                                  <span>Ralabosta: {lastMatch.fourth_place_team === 'team_1' ? (lastMatch.team_1_name || 'Colete') : lastMatch.fourth_place_team === 'team_2' ? (lastMatch.team_2_name || 'S/ Colete') : (lastMatch.fourth_place_team || 'N/A')}</span>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        );
                                      })()
                                    ) : (
                                      <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Nenhuma partida finalizada
                                      </div>
                                    )}
                                    <button className="btn-card" style={{ marginTop: 'auto' }} onClick={() => setActiveTab('historico')}>
                                      Abrir Histórico
                                    </button>
                                  </div>
                </div>

                {/* CARD 09 — ANIVERSARIANTES DO MÊS */}
                <div className="dashboard-card">
                  <div className="card-header">
                    <span className="card-title">
                      <Award size={18} /> Aniversariantes do Mês
                    </span>
                  </div>
                  <div className="leaderboard-list">
                    {birthdays.length > 0 ? (
                      birthdays.map((player, idx) => (
                        <div className="leaderboard-item" key={idx}>
                          <div className="player-info">
                            {player.photo ? (
                              <img src={player.photo} alt={player.name} className="player-img" style={{ objectFit: 'cover' }} />
                            ) : (
                              <div className="player-img" style={{ backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={16} style={{ color: '#666' }} />
                              </div>
                            )}
                            <div>
                              <div className="player-name">{player.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fará {player.age} anos • {player.date}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '10px' }}>
                        Nenhum aniversariante neste mês.
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {renderPodium(topPoints, 'Top 3 Pontuação', <Trophy size={18} />, '#fbbf24', 'pts', 'Nenhuma pontuação registrada.')}
                  {renderPodium(topScorers, 'Top 3 Artilheiros', <Goal size={18} />, '#22c55e', 'gols', 'Nenhum gol registrado.')}
                  {renderPodium(topAssists, 'Top 3 Assistências', <Star size={18} />, '#3b82f6', 'asts', 'Nenhuma assistência registrada.')}
                  {renderPodium(topRalabosta, 'Top 3 Ralabostas', <Frown size={18} />, '#ef4444', 'vezes', 'Nenhum ralabosta registrado.')}
                </div>


              </>
            )}
          </>
        ) : activeTab === 'jogadores' ? (
          <Players userRole={currentUserRole!} can={can} />
        ) : activeTab === 'ranking' ? (
          <Ranking userRole={currentUserRole!} can={can} />
        ) : activeTab === 'partidas' ? (
          <Partidas mode="partidas" userRole={currentUserRole!} can={can} />
        ) : activeTab === 'historico' ? (
          <Partidas mode="historico" userRole={currentUserRole!} can={can} />
        ) : activeTab === 'mensalidades' ? (
          <Mensalidades userRole={currentUserRole!} can={can} />
        ) : activeTab === 'financeiro' ? (
          <Financeiro userRole={currentUserRole!} can={can} />
        ) : activeTab === 'relatorios' ? (
          <Relatorios userRole={currentUserRole!} can={can} />
        ) : activeTab === 'avisos' ? (
          <Avisos userRole={currentUserRole!} can={can} />
        ) : activeTab === 'configuracoes' ? (
          <Configuracoes 
            userRole={currentUserRole!} 
            can={can} 
            assistantPermissions={assistantPermissions}
            setAssistantPermissions={setAssistantPermissions}
            appLogoUrl={appLogoUrl}
            setAppLogoUrl={setAppLogoUrl}
          />
        ) : (
          <div className="dashboard-card" style={{ padding: '40px', textAlign: 'center', minHeight: '200px', justifyContent: 'center', alignItems: 'center' }}>
            <span className="card-title" style={{ justifyContent: 'center' }}>Em breve</span>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.9rem' }}>
              Este módulo estará disponível nas próximas fases do desenvolvimento do RDA.
            </p>
          </div>
        )}
      </main>

      {/* BARRA DE NAVEGAÇÃO INFERIOR FIXA */}
      <nav className="nav-bar">
        <a 
          href="#" 
          className="nav-item"
          style={{
            color: '#3b82f6',
            opacity: activeTab === 'inicio' ? 1 : 0.65,
            textShadow: activeTab === 'inicio' ? '0 0 8px rgba(59, 130, 246, 0.5)' : 'none',
            fontWeight: activeTab === 'inicio' ? 700 : 500,
          }}
          onClick={(e) => { e.preventDefault(); setActiveTab('inicio'); }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: activeTab === 'inicio' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            marginBottom: '4px',
            transition: '0.2s ease-in-out'
          }}>
            <Home size={22} style={{ filter: activeTab === 'inicio' ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))' : 'none' }} />
          </div>
          <span>Início</span>
        </a>
        <a 
          href="#" 
          className="nav-item"
          style={{
            color: '#22c55e',
            opacity: activeTab === 'jogadores' ? 1 : 0.65,
            textShadow: activeTab === 'jogadores' ? '0 0 8px rgba(34, 197, 94, 0.5)' : 'none',
            fontWeight: activeTab === 'jogadores' ? 700 : 500,
          }}
          onClick={(e) => { e.preventDefault(); setActiveTab('jogadores'); }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: activeTab === 'jogadores' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            marginBottom: '4px',
            transition: '0.2s ease-in-out'
          }}>
            <Users size={22} style={{ filter: activeTab === 'jogadores' ? 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.5))' : 'none' }} />
          </div>
          <span>Jogadores</span>
        </a>
        <a 
          href="#" 
          className="nav-item"
          style={{
            color: '#f97316',
            opacity: activeTab === 'partidas' ? 1 : 0.65,
            textShadow: activeTab === 'partidas' ? '0 0 8px rgba(249, 115, 22, 0.5)' : 'none',
            fontWeight: activeTab === 'partidas' ? 700 : 500,
          }}
          onClick={(e) => { e.preventDefault(); setActiveTab('partidas'); }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: activeTab === 'partidas' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            marginBottom: '4px',
            transition: '0.2s ease-in-out'
          }}>
            <Trophy size={22} style={{ filter: activeTab === 'partidas' ? 'drop-shadow(0 0 4px rgba(249, 115, 22, 0.5))' : 'none' }} />
          </div>
          <span>Partidas</span>
        </a>
        <a 
          href="#" 
          className="nav-item"
          style={{
            color: '#eab308',
            opacity: activeTab === 'ranking' ? 1 : 0.65,
            textShadow: activeTab === 'ranking' ? '0 0 8px rgba(234, 179, 8, 0.5)' : 'none',
            fontWeight: activeTab === 'ranking' ? 700 : 500,
          }}
          onClick={(e) => { e.preventDefault(); setActiveTab('ranking'); }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: activeTab === 'ranking' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            marginBottom: '4px',
            transition: '0.2s ease-in-out'
          }}>
            <Award size={22} style={{ filter: activeTab === 'ranking' ? 'drop-shadow(0 0 4px rgba(234, 179, 8, 0.5))' : 'none' }} />
          </div>
          <span>Ranking</span>
        </a>
        {currentUserRole !== 'visitor' && (
          <a 
            href="#" 
            className="nav-item"
            style={{
              color: '#a855f7',
              opacity: activeTab === 'configuracoes' ? 1 : 0.65,
              textShadow: activeTab === 'configuracoes' ? '0 0 8px rgba(168, 85, 247, 0.5)' : 'none',
              fontWeight: activeTab === 'configuracoes' ? 700 : 500,
            }}
            onClick={(e) => { e.preventDefault(); setActiveTab('configuracoes'); }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '40px', height: '40px', borderRadius: '50%',
              backgroundColor: activeTab === 'configuracoes' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              marginBottom: '4px',
              transition: '0.2s ease-in-out'
            }}>
              <Settings size={22} style={{ filter: activeTab === 'configuracoes' ? 'drop-shadow(0 0 4px rgba(168, 85, 247, 0.5))' : 'none' }} />
            </div>
            <span>Configuração</span>
          </a>
        )}
      </nav>
      {/* EDIT LAST MATCH MODAL */}
      {editingLastMatch && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="dashboard-card" style={{ maxWidth: '400px', width: '100%', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 36px rgba(0,0,0,0.8)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-primary)' }}>Editar Placar</h2>
              <button onClick={() => setEditingLastMatch(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
              
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '1rem', marginTop: 0, marginBottom: '16px', color: '#fbbf24' }}>Placar da Final</h3>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Time 1</label>
                    <select value={editFinalTeam1} onChange={e => setEditFinalTeam1(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: '#1c1c1e', color: '#fff' }}>
                      <option value="">Selecione...</option>
                      <option value="Brasil">Brasil</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Japão">Japão</option>
                      <option value="Uruguai">Uruguai</option>
                    </select>
                  </div>
                  <div style={{ width: '70px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gols</label>
                    <input type="number" value={editFinalScore1} onChange={e => setEditFinalScore1(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', textAlign: 'center' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Time 2</label>
                    <select value={editFinalTeam2} onChange={e => setEditFinalTeam2(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: '#1c1c1e', color: '#fff' }}>
                      <option value="">Selecione...</option>
                      <option value="Brasil">Brasil</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Japão">Japão</option>
                      <option value="Uruguai">Uruguai</option>
                    </select>
                  </div>
                  <div style={{ width: '70px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gols</label>
                    <input type="number" value={editFinalScore2} onChange={e => setEditFinalScore2(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', textAlign: 'center' }} />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', marginTop: '12px' }}>
                  <input type="checkbox" checked={editFinalPenalties} onChange={e => setEditFinalPenalties(e.target.checked)} />
                  Decidido nos Pênaltis
                </label>
              </div>

              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '1rem', marginTop: 0, marginBottom: '16px', color: '#94a3b8' }}>Placar do Ralabosta</h3>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Time 1</label>
                    <select value={editRalabostaTeam1} onChange={e => setEditRalabostaTeam1(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: '#1c1c1e', color: '#fff' }}>
                      <option value="">Selecione...</option>
                      <option value="Brasil">Brasil</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Japão">Japão</option>
                      <option value="Uruguai">Uruguai</option>
                    </select>
                  </div>
                  <div style={{ width: '70px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gols</label>
                    <input type="number" value={editRalabostaScore1} onChange={e => setEditRalabostaScore1(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', textAlign: 'center' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Time 2</label>
                    <select value={editRalabostaTeam2} onChange={e => setEditRalabostaTeam2(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: '#1c1c1e', color: '#fff' }}>
                      <option value="">Selecione...</option>
                      <option value="Brasil">Brasil</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Japão">Japão</option>
                      <option value="Uruguai">Uruguai</option>
                    </select>
                  </div>
                  <div style={{ width: '70px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gols</label>
                    <input type="number" value={editRalabostaScore2} onChange={e => setEditRalabostaScore2(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', textAlign: 'center' }} />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', marginTop: '12px' }}>
                  <input type="checkbox" checked={editRalabostaPenalties} onChange={e => setEditRalabostaPenalties(e.target.checked)} />
                  Decidido nos Pênaltis
                </label>
              </div>

            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button onClick={() => setEditingLastMatch(null)} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
              <button onClick={handleSaveLastMatchEdits} disabled={savingLastMatch} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                {savingLastMatch ? 'Salvando...' : 'Salvar Placar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

