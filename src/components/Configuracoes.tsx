import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, Save, AlertCircle, Check, ClipboardList, History, ChevronDown, ChevronUp, FileText, Users, User, Shield, Plus, X, Loader2 } from 'lucide-react';
import LancarHistoricoManual from './LancarHistoricoManual';
import ImportarPlanilha from './ImportarPlanilha';

interface AssistantPermissions {
  create_notices: boolean;
  edit_notices: boolean;
  delete_notices: boolean;
  create_match: boolean;
  edit_match: boolean;
  insert_stats: boolean;
  edit_players: boolean;
  manage_finance: boolean;
  manage_expenses: boolean;
  import_history: boolean;
}

interface ConfiguracoesProps {
  userRole: 'admin' | 'assistant' | 'visitor' | 'treasurer';
  can: (action: any) => boolean;
  assistantPermissions: AssistantPermissions;
  setAssistantPermissions: React.Dispatch<React.SetStateAction<AssistantPermissions>>;
  appLogoUrl: string | null;
  setAppLogoUrl: React.Dispatch<React.SetStateAction<string | null>>;
}

interface AssistantProfile {
  id: string;
  name: string;
  role: string;
  created_at: string;
}

export default function Configuracoes({
  userRole: _userRole,
  can: _can,
  assistantPermissions,
  setAssistantPermissions,
  appLogoUrl,
  setAppLogoUrl
}: ConfiguracoesProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [monthlyFeeInput, setMonthlyFeeInput] = useState('R$ 0,00');
  const [dailyFeeInput, setDailyFeeInput] = useState('R$ 0,00');
  const [defaultLocationInput, setDefaultLocationInput] = useState('');
  const [defaultMatchDay, setDefaultMatchDay] = useState('Sexta-feira');
  const [defaultMatchTime, setDefaultMatchTime] = useState('20:00');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeSection, setActiveSection] = useState<null | 'manual_history' | 'import_spreadsheet'>(null);
  const [isAjustesOpen, setIsAjustesOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);

  // User management state
  const [assistants, setAssistants] = useState<AssistantProfile[]>([]);
  const [treasurers, setTreasurers] = useState<AssistantProfile[]>([]);
  const [loadingAssistants, setLoadingAssistants] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createRole, setCreateRole] = useState<'assistant' | 'treasurer'>('assistant');
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createConfirmPassword, setCreateConfirmPassword] = useState('');
  const [creatingAssistant, setCreatingAssistant] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Permissions modal state
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [editingAssistantId, setEditingAssistantId] = useState<string | null>(null);
  const [editingAssistantName, setEditingAssistantName] = useState('');
  const [editPerms, setEditPerms] = useState<AssistantPermissions>({
    create_match: false, edit_match: false, insert_stats: false,
    edit_players: false, manage_finance: false,
    manage_expenses: false, create_notices: false,
    edit_notices: false, delete_notices: false, import_history: false,
  });
  const [savingPerms, setSavingPerms] = useState(false);

  // Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwAssistantId, setPwAssistantId] = useState<string | null>(null);
  const [pwAssistantName, setPwAssistantName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Status de ativação dos assistentes (active = true por padrão)
  const [assistantStatus, setAssistantStatus] = useState<Map<string, boolean>>(new Map());

  // Current admin email
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const formatCurrencyBRL = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const parseCurrencyBRL = (formattedValue: string): number => {
    const raw = formattedValue.replace(/[^0-9]/g, '');
    if (!raw) return 0;
    return parseFloat(raw) / 100;
  };

  const handleCurrencyChange = (value: string, setter: (val: string) => void) => {
    const digits = value.replace(/[^0-9]/g, '');
    if (!digits) {
      setter('R$ 0,00');
      return;
    }
    const val = parseFloat(digits) / 100;
    setter(formatCurrencyBRL(val));
  };

  // Load settings from Supabase
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('settings')
          .select('monthly_fee, daily_fee, default_location, default_match_day, default_match_time')
          .eq('id', 'default')
          .single();

        if (error) {
          // If relation does not exist, let the UI reflect that they need to create the table
          if (error.code === 'PGRST116' || error.message.includes('settings')) {
            console.log('Tabela settings não encontrada, usando padrões temporários.');
            setMonthlyFeeInput(formatCurrencyBRL(60));
            setDailyFeeInput(formatCurrencyBRL(20));
            setDefaultLocationInput('Arena Ouro Preto');
            setDefaultMatchDay('Sexta-feira');
            setDefaultMatchTime('20:00');
          } else {
            throw error;
          }
        } else if (data) {
          setMonthlyFeeInput(formatCurrencyBRL(data.monthly_fee));
          setDailyFeeInput(formatCurrencyBRL(data.daily_fee));
          setDefaultLocationInput(data.default_location || 'Arena Ouro Preto');
          setDefaultMatchDay(data.default_match_day || 'Sexta-feira');
          setDefaultMatchTime(data.default_match_time || '20:00');
        }
      } catch (err: any) {
        console.error('Erro ao buscar configurações:', err);
        setFeedback({ type: 'error', message: 'Erro ao carregar valores padrão.' });
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  // Fetch assistants and admin email
  useEffect(() => {
    if (_userRole !== 'admin') return;

    async function loadUsers() {
      setLoadingAssistants(true);
      try {
        // Fetch current admin email from auth
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setAdminEmail(session.user.email || null);
        }

        // Fetch assistants and treasurers from profiles
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name, role, created_at')
          .in('role', ['assistant', 'treasurer'])
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Erro ao buscar usuários:', error);
        } else {
          setAssistants(profiles?.filter(p => p.role === 'assistant') || []);
          setTreasurers(profiles?.filter(p => p.role === 'treasurer') || []);
        }
      } catch (err) {
        console.error('Erro ao carregar usuários:', err);
      } finally {
        setLoadingAssistants(false);
      }
    }

    loadUsers();
  }, [_userRole]);


  const handleSave = async () => {
    const monthlyVal = parseCurrencyBRL(monthlyFeeInput);
    const dailyVal = parseCurrencyBRL(dailyFeeInput);
    const locationVal = defaultLocationInput.trim();

    if (monthlyVal < 0 || dailyVal < 0) {
      setFeedback({ type: 'error', message: 'Os valores não podem ser negativos.' });
      return;
    }
    if (!locationVal) {
      setFeedback({ type: 'error', message: 'O local padrão não pode ficar em branco.' });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      // Upsert the single settings row
      const { error } = await supabase
        .from('settings')
        .upsert({
          id: 'default',
          monthly_fee: monthlyVal,
          daily_fee: dailyVal,
          default_location: locationVal,
          default_match_day: defaultMatchDay,
          default_match_time: defaultMatchTime,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setFeedback({ type: 'success', message: 'Valores atualizados com sucesso.' });
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      setFeedback({ type: 'error', message: 'Não foi possível salvar os valores.' });
    } finally {
      setSaving(false);
    }
  };

  // --- User Management Handlers ---

  const validatePassword = (pw: string): boolean => {
    return /^\d{6}$/.test(pw);
  };

  const handleCreateAssistant = async () => {
    setCreateError(null);
    setCreateSuccess(false);

    if (!createName.trim()) {
      setCreateError('Informe o nome do assistente.');
      return;
    }
    if (!createEmail.trim()) {
      setCreateError('Informe o e-mail do assistente.');
      return;
    }
    if (!validatePassword(createPassword)) {
      setCreateError('A senha deve conter exatamente 6 números.');
      return;
    }
    if (createPassword !== createConfirmPassword) {
      setCreateError('As senhas não conferem.');
      return;
    }
    if (createRole === 'assistant' && assistants.length >= 2) {
      setCreateError('Limite máximo de 2 assistentes atingido.');
      return;
    }
    if (createRole === 'treasurer' && treasurers.length >= 1) {
      setCreateError('Limite máximo de 1 tesoureiro atingido.');
      return;
    }

    setCreatingAssistant(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setCreateError('Sessão não encontrada. Faça login novamente.');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: createEmail.trim(),
            password: createPassword,
            name: createName.trim(),
            targetRole: createRole,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setCreateError(result.error || 'Erro ao criar assistente.');
        return;
      }

      setCreateSuccess(true);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreateConfirmPassword('');

      // Refresh assistants and treasurers list
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, role, created_at')
        .in('role', ['assistant', 'treasurer'])
        .order('created_at', { ascending: true });
      if (profiles) {
        setAssistants(profiles.filter(p => p.role === 'assistant'));
        setTreasurers(profiles.filter(p => p.role === 'treasurer'));
      }

      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao criar assistente:', err);
      setCreateError('Erro de conexão com o servidor.');
    } finally {
      setCreatingAssistant(false);
    }
  };

  const openPermissions = async (assistant: AssistantProfile) => {
    setEditingAssistantId(assistant.id);
    setEditingAssistantName(assistant.name);
    setShowPermissionsModal(true);

    const { data: perms } = await supabase
      .from('assistant_permissions')
      .select('*')
      .eq('profile_id', assistant.id)
      .single();

    if (perms) {
      setEditPerms({
        create_match: perms.create_match ?? false,
        edit_match: perms.edit_match ?? false,
        insert_stats: perms.insert_stats ?? false,
        edit_players: perms.edit_players ?? false,
        manage_finance: perms.manage_finance ?? false,
        manage_expenses: perms.manage_expenses ?? false,
        create_notices: perms.create_notices ?? false,
        edit_notices: perms.edit_notices ?? false,
        delete_notices: perms.delete_notices ?? false,
        import_history: perms.import_history ?? false,
      });
    } else {
      setEditPerms({
        create_match: false, edit_match: false, insert_stats: false,
        edit_players: false, manage_finance: false, manage_expenses: false, create_notices: false,
        edit_notices: false, delete_notices: false, import_history: false,
      });
    }
  };

  const savePermissions = async () => {
    if (!editingAssistantId) return;
    setSavingPerms(true);
    try {
      const { error } = await supabase
        .from('assistant_permissions')
        .upsert({
          profile_id: editingAssistantId,
          ...editPerms,
          updated_at: new Date().toISOString()
        }, { onConflict: 'profile_id' });

      if (error) throw error;
      setShowPermissionsModal(false);
      alert('Permissões salvas com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar permissões:', err);
      alert('Erro ao salvar permissões: ' + (err.message || 'desconhecido'));
    } finally {
      setSavingPerms(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError(null);

    if (!validatePassword(newPassword)) {
      setPwError('A senha deve conter exatamente 6 números.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError('As senhas não conferem.');
      return;
    }

    setChangingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setPwError('Sessão não encontrada. Faça login novamente.');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'update_password',
            assistant_id: pwAssistantId,
            password: newPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setPwError(result.error || 'Erro ao alterar senha.');
        return;
      }

      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmNewPassword('');
      alert('Senha alterada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao alterar senha:', err);
      setPwError('Erro de conexão com o servidor.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Busca status de ativação via Edge Function (list) — admin only
  const loadAssistantStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'list' }),
        }
      );
      const result = await response.json();
      if (response.ok && Array.isArray(result.assistants)) {
        const statusMap = new Map<string, boolean>();
        result.assistants.forEach((a: any) => statusMap.set(a.id, a.active));
        setAssistantStatus(statusMap);
      }
    } catch (err) {
      console.error('Erro ao carregar status dos assistentes:', err);
    }
  };

  const runAssistantAction = async (
    action: 'disable' | 'enable' | 'delete',
    assistantId: string
  ): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return 'Sessão não encontrada. Faça login novamente.';
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action, assistant_id: assistantId }),
        }
      );
      const result = await response.json();
      if (!response.ok) return result.error || 'Erro na operação.';
      return null;
    } catch (err: any) {
      console.error('Erro na operação do assistente:', err);
      return 'Erro de conexão com o servidor.';
    }
  };

  const handleDisableAssistant = async (assistantId: string, roleName: string = 'assistente') => {
    if (!confirm(`Desativar este ${roleName}? Ele não conseguirá mais entrar. O histórico não será apagado.`)) return;
    const error = await runAssistantAction('disable', assistantId);
    if (error) { alert(error); return; }
    const next = new Map(assistantStatus);
    next.set(assistantId, false);
    setAssistantStatus(next);
    alert(`${roleName} desativado.`);
  };

  const handleEnableAssistant = async (assistantId: string, roleName: string = 'assistente') => {
    if (!confirm(`Reativar este ${roleName}?`)) return;
    const error = await runAssistantAction('enable', assistantId);
    if (error) { alert(error); return; }
    const next = new Map(assistantStatus);
    next.set(assistantId, true);
    setAssistantStatus(next);
    alert(`${roleName} reativado.`);
  };

  const handleDeleteAssistant = async (assistant: AssistantProfile, roleName: string = 'assistente') => {
    if (!confirm(`Excluir ${assistant.name}? Esta ação não pode ser desfeita. O histórico do RDA não será apagado.`)) return;
    const error = await runAssistantAction('delete', assistant.id);
    if (error) { alert(error); return; }
    
    if (assistant.role === 'treasurer') {
      setTreasurers((prev) => prev.filter((a) => a.id !== assistant.id));
    } else {
      setAssistants((prev) => prev.filter((a) => a.id !== assistant.id));
    }
    alert(`${roleName} excluído.`);
  };


  if (loading) {
    return (
      <div className="dashboard-card" style={{ padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
        <div className="loader-spinner" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--text-secondary)', marginTop: '16px', fontSize: '0.9rem' }}>Carregando configurações...</span>
      </div>
    );
  }

  // If a sub-section is active, render it full-width
  if (activeSection === 'manual_history') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        <div style={{ padding: '0 4px', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #a3a3a3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Configurações</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Gerencie as regras e valores padrão do RDA.</p>
        </div>
        <LancarHistoricoManual onClose={() => setActiveSection(null)} />
      </div>
    );
  }

  if (activeSection === 'import_spreadsheet') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        <div style={{ padding: '0 4px', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #a3a3a3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Configurações</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Gerencie as regras e valores padrão do RDA.</p>
        </div>
        <ImportarPlanilha onClose={() => setActiveSection(null)} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <div style={{ padding: '0 4px', marginBottom: '4px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #a3a3a3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Configurações</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Gerencie as regras e valores padrão do RDA.</p>
      </div>

      {/* CARD DE AJUSTE DE VALORES */}
      <section className="dashboard-card" style={{ gap: isAjustesOpen ? '16px' : '0' }}>
        <div 
          className="card-header" 
          onClick={() => setIsAjustesOpen(!isAjustesOpen)}
          style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={18} style={{ color: '#818cf8' }} /> Configuração de Valores
          </span>
          {isAjustesOpen ? (
            <ChevronUp size={20} style={{ color: 'var(--text-muted)' }} />
          ) : (
            <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} />
          )}
        </div>

        {isAjustesOpen && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label htmlFor="monthly-fee" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Mensalidade padrão
                </label>
                <input 
                  id="monthly-fee"
                  type="text"
                  value={monthlyFeeInput}
                  onChange={(e) => handleCurrencyChange(e.target.value, setMonthlyFeeInput)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              <div>
                <label htmlFor="daily-fee" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Diária padrão
                </label>
                <input 
                  id="daily-fee"
                  type="text"
                  value={dailyFeeInput}
                  onChange={(e) => handleCurrencyChange(e.target.value, setDailyFeeInput)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              <div>
                <label htmlFor="default-location" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Local padrão
                </label>
                <input 
                  id="default-location"
                  type="text"
                  value={defaultLocationInput}
                  onChange={(e) => setDefaultLocationInput(e.target.value)}
                  placeholder="Ex: Arena Ouro Preto"
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
              
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: '4px' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '12px' }}>Padrão de Partidas</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label htmlFor="default-day" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Dia da semana
                    </label>
                    <select 
                      id="default-day"
                      value={defaultMatchDay}
                      onChange={(e) => setDefaultMatchDay(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        appearance: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    >
                      <option value="Domingo" style={{ background: '#1a1a1a' }}>Domingo</option>
                      <option value="Segunda-feira" style={{ background: '#1a1a1a' }}>Segunda-feira</option>
                      <option value="Terça-feira" style={{ background: '#1a1a1a' }}>Terça-feira</option>
                      <option value="Quarta-feira" style={{ background: '#1a1a1a' }}>Quarta-feira</option>
                      <option value="Quinta-feira" style={{ background: '#1a1a1a' }}>Quinta-feira</option>
                      <option value="Sexta-feira" style={{ background: '#1a1a1a' }}>Sexta-feira</option>
                      <option value="Sábado" style={{ background: '#1a1a1a' }}>Sábado</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="default-time" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Horário
                    </label>
                    <input 
                      id="default-time"
                      type="time"
                      value={defaultMatchTime}
                      onChange={(e) => setDefaultMatchTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        colorScheme: 'dark'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                </div>
              </div>

            </div>

            {feedback && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: feedback.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${feedback.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                color: feedback.type === 'success' ? '#4ade80' : '#f87171',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginTop: '4px'
              }}>
                {feedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                {feedback.message}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#6366f1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px',
                opacity: saving ? 0.7 : 1,
                transition: 'background-color 0.2s',
                boxShadow: '0 4px 12px rgba(99,102,241,0.2)'
              }}
              onMouseEnter={(e) => {
                if (!saving) e.currentTarget.style.backgroundColor = '#4f46e5';
              }}
              onMouseLeave={(e) => {
                if (!saving) e.currentTarget.style.backgroundColor = '#6366f1';
              }}
            >
              {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
              <span>{saving ? 'Salvando...' : 'Salvar valores'}</span>
            </button>
          </>
        )}
      </section>


      {/* SEÇÃO: LOGO DO RDA */}
      <section className="dashboard-card" style={{ gap: '16px' }}>
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            🖼️ Logo do RDA
          </span>
        </div>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', margin: 0 }}>
          Envie a imagem que será mostrada no topo de todas as telas (Formatos: PNG, JPG, JPEG, WEBP até 5MB).
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img 
            src={appLogoUrl || "/logo.jpg"} 
            alt="Logo RDA" 
            style={{ maxWidth: '120px', maxHeight: '50px', borderRadius: '8px', objectFit: 'contain', border: '1px solid rgba(255,255,255,0.08)' }} 
          />

          <label 
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
          >
            <span>Upload Logo</span>
            <input 
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                  alert('O arquivo deve ter no máximo 2MB.');
                  return;
                }
                try {
                  setSaving(true);
                  // Converter para base64 e salvar direto na tabela settings
                  const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                  });

                  const { error: settingsError } = await supabase
                    .from('settings')
                    .update({ app_logo_url: base64 })
                    .eq('id', 'default');
                  if (settingsError) throw settingsError;
                  
                  setAppLogoUrl(base64);
                  alert('Logo enviada e salva com sucesso!');
                } catch (err: any) {
                  console.error('Erro no upload da logo:', err);
                  alert('Erro ao enviar a logo: ' + (err.message || JSON.stringify(err)));
                } finally {
                  setSaving(false);
                }
              }}
              style={{ display: 'none' }}
            />
          </label>

          {appLogoUrl && (
            <button 
              onClick={async () => {
                if (!confirm('Deseja remover a logo personalizada?')) return;
                try {
                  setSaving(true);
                  const { error: settingsError } = await supabase
                    .from('settings')
                    .update({ app_logo_url: null })
                    .eq('id', 'default');
                  if (settingsError) throw settingsError;
                  setAppLogoUrl(null);
                  alert('Logo personalizada removida!');
                } catch (err: any) {
                  console.error('Erro ao remover logo:', err);
                  alert('Erro ao remover logo.');
                } finally {
                  setSaving(false);
                }
              }}
              style={{ padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Remover
            </button>
          )}
        </div>
      </section>

      {/* SEÇÃO: CONTROLE DE ACESSO DE ASSISTENTES (ADMIN APENAS) */}
      {_userRole === 'admin' && (
        <section className="dashboard-card" style={{ gap: isPermissionsOpen ? '16px' : '0' }}>
          <div 
            className="card-header"
            onClick={() => setIsPermissionsOpen(!isPermissionsOpen)}
            style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              🛡️ Permissões de Assistente
            </span>
            {isPermissionsOpen ? (
              <ChevronUp size={20} style={{ color: 'var(--text-muted)' }} />
            ) : (
              <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
          
          {isPermissionsOpen && (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', margin: 0 }}>
                Configure as permissões gerais aplicadas aos usuários com perfil de Assistente.
              </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '4px' }}>
            {[
              { key: 'create_notices' as const, label: 'Criar Avisos' },
              { key: 'edit_notices' as const, label: 'Editar Avisos' },
              { key: 'delete_notices' as const, label: 'Excluir Avisos' },
              { key: 'create_match' as const, label: 'Criar Partidas' },
              { key: 'edit_match' as const, label: 'Editar/Excluir Partidas' },
              { key: 'insert_stats' as const, label: 'Lançar/Editar Estatísticas' },
              { key: 'edit_players' as const, label: 'Editar Jogadores' },
              { key: 'manage_finance' as const, label: 'Gerenciar Financeiro' },
              { key: 'import_history' as const, label: 'Importar Histórico' }
            ].map((item) => {
              const isChecked = assistantPermissions[item.key];
              return (
                <label 
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255,255,255,0.015)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.015)'}
                >
                  <input 
                    type="checkbox"
                    checked={isChecked}
                    onChange={async () => {
                      const updated = {
                        ...assistantPermissions,
                        [item.key]: !isChecked
                      };
                      setAssistantPermissions(updated);
                      localStorage.setItem('assistant_permissions', JSON.stringify(updated));
                      
                      // Write to supabase assistant_permissions table if connected
                      try {
                        const { data: assistantProfiles } = await supabase
                          .from('profiles')
                          .select('id')
                          .eq('role', 'assistant');
                        
                        if (assistantProfiles && assistantProfiles.length > 0) {
                          for (const p of assistantProfiles) {
                            await supabase
                              .from('assistant_permissions')
                              .upsert({
                                profile_id: p.id,
                                ...updated,
                                updated_at: new Date().toISOString()
                              }, { onConflict: 'profile_id' });
                          }
                        }
                      } catch (err) {
                        console.error('Erro ao salvar permissões no banco:', err);
                      }
                    }}
                    style={{ width: '16px', height: '16px', accentColor: '#6366f1', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.label}</span>
                </label>
              );
            })}
            </div>
            </>
          )}
        </section>
      )}


      {/* ── USUÁRIOS E ACESSO (ADMIN APENAS) ── */}
      {_userRole === 'admin' && (
        <section className="dashboard-card" style={{ gap: isUsersOpen ? '16px' : '0' }}>
          <div
            className="card-header"
            onClick={() => {
              setIsUsersOpen(!isUsersOpen);
              if (!isUsersOpen) loadAssistantStatus();
            }}
            style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: '#818cf8' }} /> Usuários e Acesso
            </span>
            {isUsersOpen ? (
              <ChevronUp size={20} style={{ color: 'var(--text-muted)' }} />
            ) : (
              <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} />
            )}
          </div>

          {isUsersOpen && (
            <>
              {/* ADMINISTRADOR */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', borderRadius: '12px', backgroundColor: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Shield size={20} style={{ color: '#fff' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>Administrador</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {adminEmail || 'Email não disponível'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ASSISTENTES */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Assistentes</span>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '8px',
                    backgroundColor: assistants.length >= 2 ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)',
                    color: assistants.length >= 2 ? '#f87171' : '#818cf8',
                    border: `1px solid ${assistants.length >= 2 ? 'rgba(239,68,68,0.25)' : 'rgba(99,102,241,0.25)'}`
                  }}>
                    {assistants.length} / 2
                  </span>
                </div>

                {loadingAssistants ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem', gap: '8px' }}>
                    <Loader2 size={16} className="spin" /> Carregando...
                  </div>
                ) : assistants.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                    Nenhum assistente cadastrado.
                  </div>
                ) : (
                  assistants.map((assistant) => {
                    const isActive = assistantStatus.get(assistant.id) ?? true;
                    return (
                    <div key={assistant.id} style={{
                      padding: '14px', borderRadius: '12px',
                      backgroundColor: 'rgba(255,255,255,0.015)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      display: 'flex', flexDirection: 'column', gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          background: 'linear-gradient(135deg,#0ea5e9,#6366f1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <User size={18} style={{ color: '#fff' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>{assistant.name}</span>
                          <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>Assistente</span>
                        </div>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                          backgroundColor: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.12)',
                          color: isActive ? '#4ade80' : '#f87171',
                          border: `1px solid ${isActive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.25)'}`
                        }}>
                          {isActive ? 'Ativo' : 'Desativado'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => openPermissions(assistant)}
                          disabled={!isActive}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '8px', minWidth: '90px',
                            backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                            color: '#818cf8', fontSize: '0.75rem', fontWeight: 700, cursor: isActive ? 'pointer' : 'not-allowed',
                            opacity: isActive ? 1 : 0.5
                          }}
                        >
                          Permissões
                        </button>
                        <button
                          onClick={() => {
                            setPwAssistantId(assistant.id);
                            setPwAssistantName(assistant.name);
                            setShowPasswordModal(true);
                            setNewPassword('');
                            setConfirmNewPassword('');
                            setPwError(null);
                          }}
                          disabled={!isActive}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '8px', minWidth: '90px',
                            backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                            color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 700, cursor: isActive ? 'pointer' : 'not-allowed',
                            opacity: isActive ? 1 : 0.5
                          }}
                        >
                          Alterar Senha
                        </button>
                        <button
                          onClick={() => isActive ? handleDisableAssistant(assistant.id) : handleEnableAssistant(assistant.id)}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '8px', minWidth: '90px',
                            backgroundColor: isActive ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
                            border: `1px solid ${isActive ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.25)'}`,
                            color: isActive ? '#fbbf24' : '#4ade80', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          {isActive ? 'Desativar' : 'Reativar'}
                        </button>
                        <button
                          onClick={() => handleDeleteAssistant(assistant)}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '8px', minWidth: '90px',
                            backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            color: '#f87171', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                  })
                )}

                {assistants.length < 2 && (
                  <button
                    onClick={() => {
                      setCreateRole('assistant');
                      setShowCreateModal(true);
                      setCreateName('');
                      setCreateEmail('');
                      setCreatePassword('');
                      setCreateConfirmPassword('');
                      setCreateError(null);
                      setCreateSuccess(false);
                    }}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '12px',
                      backgroundColor: 'rgba(34,197,94,0.08)', border: '1px dashed rgba(34,197,94,0.3)',
                      color: '#4ade80', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    <Plus size={16} />
                    {assistants.length === 0 ? 'Criar Assistente' : 'Criar Segundo Assistente'}
                  </button>
                )}

                {assistants.length >= 2 && (
                  <div style={{
                    textAlign: 'center', padding: '10px', fontSize: '0.78rem', fontWeight: 600,
                    color: 'var(--text-muted)', borderRadius: '8px',
                    backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)'
                  }}>
                    Limite de 2 assistentes atingido.
                  </div>
                )}
              </div>

              {/* TESOUREIRO */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24' }}>Tesoureiro</span>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '8px',
                    backgroundColor: treasurers.length >= 1 ? 'rgba(239,68,68,0.12)' : 'rgba(251,191,36,0.12)',
                    color: treasurers.length >= 1 ? '#f87171' : '#fbbf24',
                    border: `1px solid ${treasurers.length >= 1 ? 'rgba(239,68,68,0.25)' : 'rgba(251,191,36,0.25)'}`
                  }}>
                    {treasurers.length} / 1
                  </span>
                </div>

                {loadingAssistants ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem', gap: '8px' }}>
                    <Loader2 size={16} className="spin" /> Carregando...
                  </div>
                ) : treasurers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                    Nenhum tesoureiro cadastrado.
                  </div>
                ) : (
                  treasurers.map((treasurer) => {
                    const isActive = assistantStatus.get(treasurer.id) ?? true;
                    return (
                    <div key={treasurer.id} style={{
                      padding: '14px', borderRadius: '12px',
                      backgroundColor: 'rgba(255,255,255,0.015)',
                      border: '1px solid rgba(251,191,36,0.2)',
                      display: 'flex', flexDirection: 'column', gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          background: 'linear-gradient(135deg,#fbbf24,#d97706)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <DollarSign size={18} style={{ color: '#fff' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>{treasurer.name}</span>
                          <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600 }}>Tesoureiro</span>
                        </div>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                          backgroundColor: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.12)',
                          color: isActive ? '#4ade80' : '#f87171',
                          border: `1px solid ${isActive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.25)'}`
                        }}>
                          {isActive ? 'Ativo' : 'Desativado'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => {
                            setPwAssistantId(treasurer.id);
                            setPwAssistantName(treasurer.name);
                            setShowPasswordModal(true);
                            setNewPassword('');
                            setConfirmNewPassword('');
                            setPwError(null);
                          }}
                          disabled={!isActive}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '8px', minWidth: '90px',
                            backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                            color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 700, cursor: isActive ? 'pointer' : 'not-allowed',
                            opacity: isActive ? 1 : 0.5
                          }}
                        >
                          Alterar Senha
                        </button>
                        <button
                          onClick={() => isActive ? handleDisableAssistant(treasurer.id, 'tesoureiro') : handleEnableAssistant(treasurer.id, 'tesoureiro')}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '8px', minWidth: '90px',
                            backgroundColor: isActive ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
                            border: `1px solid ${isActive ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.25)'}`,
                            color: isActive ? '#fbbf24' : '#4ade80', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          {isActive ? 'Desativar' : 'Reativar'}
                        </button>
                        <button
                          onClick={() => handleDeleteAssistant(treasurer, 'tesoureiro')}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '8px', minWidth: '90px',
                            backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            color: '#f87171', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                  })
                )}

                {treasurers.length < 1 && (
                  <button
                    onClick={() => {
                      setCreateRole('treasurer');
                      setShowCreateModal(true);
                      setCreateName('');
                      setCreateEmail('');
                      setCreatePassword('');
                      setCreateConfirmPassword('');
                      setCreateError(null);
                      setCreateSuccess(false);
                    }}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '12px',
                      backgroundColor: 'rgba(251,191,36,0.08)', border: '1px dashed rgba(251,191,36,0.3)',
                      color: '#fbbf24', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    <Plus size={16} />
                    Criar Tesoureiro
                  </button>
                )}

                {treasurers.length >= 1 && (
                  <div style={{
                    textAlign: 'center', padding: '10px', fontSize: '0.78rem', fontWeight: 600,
                    color: 'var(--text-muted)', borderRadius: '8px',
                    backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)'
                  }}>
                    Limite de 1 tesoureiro atingido.
                  </div>
                )}
              </div>

              {/* VISITANTE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: 'linear-gradient(135deg,#374151,#4b5563)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <User size={20} style={{ color: '#9ca3af' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>Visitante</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Acesso público · Sem login · Somente leitura
                  </span>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* ── FERRAMENTAS DE DADOS ── */}

      <section className="dashboard-card" style={{ gap: '12px' }}>
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={18} style={{ color: '#818cf8' }} /> Ferramentas de Dados
          </span>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', margin: 0 }}>
          Importe ou lance manualmente o histórico de partidas antigas do RDA.
        </p>

        {/* Importar Planilha */}
        <button
          onClick={() => setActiveSection('import_spreadsheet')}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(21,128,61,0.1))',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '12px',
            color: '#4ade80',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.6)'; e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)'; e.currentTarget.style.backgroundColor = ''; }}
        >
          <FileText size={17} />
          Importar Planilha
        </button>

        {/* Lançar Histórico Manualmente */}
        <button
          onClick={() => setActiveSection('manual_history')}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.12))',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '12px',
            color: '#a5b4fc',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.55)'; e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.22)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.backgroundColor = ''; }}
        >
          <History size={17} />
          Lançar Histórico Manualmente
        </button>
      </section>

      {/* ── MODAL: CRIAR ASSISTENTE ── */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(4px)'
        }} onClick={() => setShowCreateModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px', padding: '28px 24px', width: '340px',
            display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                {createRole === 'treasurer' ? 'Criar Tesoureiro' : 'Criar Assistente'}
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="Nome" value={createName} onChange={(e) => setCreateName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
              <input type="email" placeholder="E-mail" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
              <input type="password" placeholder="Senha (6 números)" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} maxLength={6}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', letterSpacing: '0.2em' }} />
              <input type="password" placeholder="Confirmar senha" value={createConfirmPassword} onChange={(e) => setCreateConfirmPassword(e.target.value)} maxLength={6}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', letterSpacing: '0.2em' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '-4px' }}>A senha deve conter exatamente 6 números.</span>
            </div>

            {createError && (
              <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.8rem', fontWeight: 600 }}>
                {createError}
              </div>
            )}

            {createSuccess && (
              <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80', fontSize: '0.8rem', fontWeight: 600 }}>
                {createRole === 'treasurer' ? 'Tesoureiro criado' : 'Assistente criado'} com sucesso!
              </div>
            )}

            <button onClick={handleCreateAssistant} disabled={creatingAssistant}
              style={{ padding: '12px', borderRadius: '10px', border: 'none', background: createRole === 'treasurer' ? 'linear-gradient(135deg,#fbbf24,#d97706)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: creatingAssistant ? 'not-allowed' : 'pointer', opacity: creatingAssistant ? 0.7 : 1 }}>
              {creatingAssistant ? 'Criando...' : (createRole === 'treasurer' ? 'Criar Tesoureiro' : 'Criar Assistente')}
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: PERMISSÕES ── */}
      {showPermissionsModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(4px)'
        }} onClick={() => setShowPermissionsModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px', padding: '28px 24px', width: '380px',
            display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)', maxHeight: '80vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, margin: 0 }}>Permissões</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{editingAssistantName}</span>
              </div>
              <button onClick={() => setShowPermissionsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { key: 'create_match' as const, label: 'Criar Partida' },
                { key: 'edit_match' as const, label: 'Editar Partida' },
                { key: 'insert_stats' as const, label: 'Lançar Estatísticas' },
                { key: 'edit_players' as const, label: 'Editar Jogadores' },
                { key: 'manage_finance' as const, label: 'Gerenciar Financeiro' },
                { key: 'create_notices' as const, label: 'Criar Avisos' },
                { key: 'edit_notices' as const, label: 'Editar Avisos' },
                { key: 'delete_notices' as const, label: 'Excluir Avisos' },
                { key: 'import_history' as const, label: 'Importar Histórico' },
              ].map((item) => (
                <label key={item.key} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                  backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '10px', cursor: 'pointer', userSelect: 'none'
                }}>
                  <input type="checkbox" checked={editPerms[item.key]}
                    onChange={() => setEditPerms(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                    style={{ width: '16px', height: '16px', accentColor: '#6366f1', cursor: 'pointer' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: editPerms[item.key] ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.label}</span>
                </label>
              ))}
            </div>

            <button onClick={savePermissions} disabled={savingPerms}
              style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: savingPerms ? 'not-allowed' : 'pointer', opacity: savingPerms ? 0.7 : 1 }}>
              {savingPerms ? 'Salvando...' : 'Salvar Permissões'}
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: ALTERAR SENHA ── */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(4px)'
        }} onClick={() => setShowPasswordModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px', padding: '28px 24px', width: '320px',
            display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, margin: 0 }}>Alterar Senha</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{pwAssistantName}</span>
              </div>
              <button onClick={() => setShowPasswordModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="password" placeholder="Nova senha (6 números)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} maxLength={6}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', letterSpacing: '0.2em' }} />
              <input type="password" placeholder="Confirmar nova senha" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} maxLength={6}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', letterSpacing: '0.2em' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '-4px' }}>A senha deve conter exatamente 6 números.</span>
            </div>

            {pwError && (
              <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.8rem', fontWeight: 600 }}>
                {pwError}
              </div>
            )}

            <button onClick={handleChangePassword} disabled={changingPassword}
              style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: changingPassword ? 'not-allowed' : 'pointer', opacity: changingPassword ? 0.7 : 1 }}>
              {changingPassword ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
