import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  Plus, 
  X, 
  MoreVertical, 
  Trash2, 
  Archive, 
  Edit, 
  AlertCircle, 
  AlertTriangle, 
  Megaphone, 
  Siren, 
  Info,
  Clock,
  Calendar,
  CheckCircle2,
  Lock,
  ChevronLeft
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

export default function Avisos({ userRole: _userRole, can }: { userRole?: 'admin' | 'assistant' | 'visitor' | 'treasurer'; can: (action: any) => boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const [notices, setNotices] = useState<Notice[]>([]);
  const [tableMissing, setTableMissing] = useState(false);
  
  // Local Memory Fallback for mock testing if table is missing
  const [localFallbackNotices, setLocalFallbackNotices] = useState<Notice[]>([
    {
      id: 'mock-1',
      title: 'Pagamento da Mensalidade',
      message: 'Favor realizar o pix até o dia 10 para evitar taxas extras.',
      importance: 'normal',
      duration_value: 5,
      duration_unit: 'days',
      expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      id: 'mock-2',
      title: 'Uniformes Novos',
      message: 'A entrega das camisas novas será na próxima quarta antes da partida começar.',
      importance: 'attention',
      duration_value: 3,
      duration_unit: 'days',
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    }
  ]);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [importance, setImportance] = useState<'normal' | 'attention' | 'important' | 'urgent'>('normal');
  const [durationValue, setDurationValue] = useState(2);
  const [durationUnit, setDurationUnit] = useState<'hours' | 'days'>('hours');
  
  // Menu dropdown state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'important' | 'active' | 'expired'>('all');
  const [importanceSubFilter, setImportanceSubFilter] = useState<'urgent' | 'important' | 'attention' | 'normal' | null>(null);

  // Notification states
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Time state for countdown updates (every 30 seconds)
  const [timeTick, setTimeTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notices
  const loadNotices = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        if (fetchError.code === 'PGRST205' || fetchError.message.includes('notices')) {
          setTableMissing(true);
        } else {
          throw fetchError;
        }
      } else {
        setTableMissing(false);
        setNotices(data || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar avisos:', err);
      setError('Erro ao carregar os avisos do banco.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const handleOpenNew = () => {
    setTitle('');
    setMessage('');
    setImportance('normal');
    setDurationValue(2);
    setDurationUnit('hours');
    setEditingId(null);
    setIsFormOpen(true);
    setFeedback(null);
  };

  const handleEdit = (notice: Notice) => {
    if (!can('edit_notices')) {
      alert('Você não tem permissão para editar avisos.');
      return;
    }
    setTitle(notice.title);
    setMessage(notice.message);
    setImportance(notice.importance);
    setDurationValue(notice.duration_value);
    setDurationUnit(notice.duration_unit);
    setEditingId(notice.id);
    setIsFormOpen(true);
    setActiveMenuId(null);
    setFeedback(null);
  };

  const handleArchive = async (id: string, currentStatus: 'active' | 'archived') => {
    if (!can('edit_notices')) {
      alert('Você não tem permissão para arquivar avisos.');
      return;
    }
    const nextStatus = currentStatus === 'active' ? 'archived' : 'active';
    setFeedback(null);
    try {
      if (tableMissing) {
        setLocalFallbackNotices(prev => prev.map(n => n.id === id ? { ...n, status: nextStatus } : n));
        setFeedback({ type: 'success', message: `Aviso ${nextStatus === 'archived' ? 'arquivado' : 'ativado'} localmente!` });
      } else {
        const { error: patchError } = await supabase
          .from('notices')
          .update({ status: nextStatus, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (patchError) throw patchError;
        setFeedback({ type: 'success', message: `Aviso ${nextStatus === 'archived' ? 'arquivado' : 'ativado'} com sucesso!` });
        loadNotices();
      }
    } catch (err) {
      console.error('Erro ao arquivar aviso:', err);
      setFeedback({ type: 'error', message: 'Erro ao arquivar aviso.' });
    }
    setActiveMenuId(null);
  };

  const handleDelete = async (id: string) => {
    if (!can('delete_notices')) {
      alert('Você não tem permissão para excluir avisos.');
      return;
    }
    if (!window.confirm('Excluir este aviso?')) return;
    setFeedback(null);
    try {
      if (tableMissing) {
        setLocalFallbackNotices(prev => prev.filter(n => n.id !== id));
        setFeedback({ type: 'success', message: 'Aviso excluído localmente!' });
      } else {
        const { error: deleteError } = await supabase
          .from('notices')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;
        setFeedback({ type: 'success', message: 'Aviso excluído com sucesso!' });
        loadNotices();
      }
    } catch (err) {
      console.error('Erro ao excluir aviso:', err);
      setFeedback({ type: 'error', message: 'Erro ao excluir aviso.' });
    }
    setActiveMenuId(null);
  };

  const calculateExpiresAt = (value: number, unit: 'hours' | 'days'): Date => {
    const date = new Date();
    if (unit === 'hours') {
      date.setHours(date.getHours() + value);
    } else {
      date.setDate(date.getDate() + value);
    }
    return date;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId ? !can('edit_notices') : !can('create_notices')) {
      alert('Você não tem permissão para realizar esta ação.');
      return;
    }
    if (!title.trim() || !message.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o título e a mensagem.' });
      return;
    }
    if (durationValue <= 0 || isNaN(durationValue)) {
      setFeedback({ type: 'error', message: 'A quantidade deve ser um número positivo.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const calculatedExpiration = calculateExpiresAt(durationValue, durationUnit);

    try {
      if (tableMissing) {
        if (editingId) {
          setLocalFallbackNotices(prev => prev.map(n => n.id === editingId ? {
            ...n,
            title,
            message,
            importance,
            duration_value: durationValue,
            duration_unit: durationUnit,
            expires_at: calculatedExpiration.toISOString()
          } : n));
          setFeedback({ type: 'success', message: 'Aviso editado localmente!' });
        } else {
          const newMock: Notice = {
            id: 'mock-' + Date.now(),
            title,
            message,
            importance,
            duration_value: durationValue,
            duration_unit: durationUnit,
            expires_at: calculatedExpiration.toISOString(),
            status: 'active',
            created_at: new Date().toISOString()
          };
          setLocalFallbackNotices(prev => [newMock, ...prev]);
          setFeedback({ type: 'success', message: 'Aviso criado localmente!' });
        }
        setIsFormOpen(false);
      } else {
        const payload = {
          title,
          message,
          importance,
          duration_value: durationValue,
          duration_unit: durationUnit,
          expires_at: calculatedExpiration.toISOString(),
          status: 'active',
          updated_at: new Date().toISOString()
        };

        if (editingId) {
          const { error: updateError } = await supabase
            .from('notices')
            .update(payload)
            .eq('id', editingId);

          if (updateError) throw updateError;
          setFeedback({ type: 'success', message: 'Aviso atualizado com sucesso!' });
        } else {
          const { error: insertError } = await supabase
            .from('notices')
            .insert({ ...payload, created_at: new Date().toISOString() });

          if (insertError) throw insertError;
          setFeedback({ type: 'success', message: 'Aviso publicado com sucesso!' });
        }
        setIsFormOpen(false);
        loadNotices();
      }
    } catch (err) {
      console.error('Erro ao salvar aviso:', err);
      setFeedback({ type: 'error', message: 'Erro ao salvar o aviso.' });
    } finally {
      setSaving(false);
    }
  };

  // Helper remaining time string
  const getRemainingTime = (expiresAtStr: string): { text: string; isExpired: boolean } => {
    const now = new Date();
    const expiresAt = new Date(expiresAtStr);
    const diffMs = expiresAt.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return { text: 'Expirado', isExpired: true };
    }

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return { text: `Expira em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`, isExpired: false };
    }
    if (diffHours > 0) {
      const remainingMins = diffMins % 60;
      return { text: `Expira em ${diffHours}h ${remainingMins}min`, isExpired: false };
    }
    return { text: `Expira em ${diffMins}min`, isExpired: false };
  };

  // Get date format
  const formatDateTime = (isoString: string): string => {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} • ${hours}:${minutes}`;
  };

  // Raw notice source
  const rawSource = tableMissing ? localFallbackNotices : notices;

  // Map expired status and remaining texts
  const noticesWithTime = rawSource.map(n => {
    const remaining = getRemainingTime(n.expires_at);
    return {
      ...n,
      isExpired: remaining.isExpired,
      remainingText: remaining.text
    };
  });

  // Calculate stats for filter buttons
  const countAll = noticesWithTime.length;
  const countUrgent = noticesWithTime.filter(n => n.importance === 'urgent' && !n.isExpired && n.status === 'active').length;
  const countImportant = noticesWithTime.filter(n => n.importance === 'important' && !n.isExpired && n.status === 'active').length;
  const countActive = noticesWithTime.filter(n => !n.isExpired && n.status === 'active').length;
  const countExpired = noticesWithTime.filter(n => n.isExpired && n.status === 'active').length;

  // Filter & Search Logic
  const filteredNotices = noticesWithTime.filter(n => {
    // 1. Search Query
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.message.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Active Filter
    if (activeFilter === 'urgent') return n.importance === 'urgent' && !n.isExpired && n.status === 'active';
    if (activeFilter === 'important') return n.importance === 'important' && !n.isExpired && n.status === 'active';
    if (activeFilter === 'active') return !n.isExpired && n.status === 'active';
    if (activeFilter === 'expired') {
      if (!n.isExpired || n.status !== 'active') return false;
      if (importanceSubFilter) return n.importance === importanceSubFilter;
      return true; // We'll group them when rendering
    }
    
    // Default 'all'
    if (importanceSubFilter) return n.importance === importanceSubFilter && n.status !== 'archived';
    return n.status !== 'archived';
  });

  // Sorting: Urgent (1), Important (2), Attention (3), Normal (4). Secondary: CreatedAt descending
  const importanceWeight = { urgent: 1, important: 2, attention: 3, normal: 4 };
  const sortedNotices = [...filteredNotices].sort((a, b) => {
    const weightA = importanceWeight[a.importance] || 4;
    const weightB = importanceWeight[b.importance] || 4;
    if (weightA !== weightB) {
      return weightA - weightB;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Importance config items
  const IMPORTANCE_CONFIG = {
    normal: { label: 'NORMAL', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: '1.5px solid rgba(56,189,248,0.3)', icon: <Info size={16} style={{ color: '#38bdf8' }} /> },
    attention: { label: 'ATENÇÃO', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: '1.5px solid rgba(251,191,36,0.3)', icon: <AlertTriangle size={16} style={{ color: '#fbbf24' }} /> },
    important: { label: 'IMPORTANTE', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: '1.5px solid rgba(249,115,22,0.3)', icon: <Megaphone size={16} style={{ color: '#f97316' }} /> },
    urgent: { label: 'URGENTE', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: '1.5px solid rgba(239,68,68,0.35)', icon: <Siren size={16} /> }
  };

  const sqlCode = `CREATE TABLE IF NOT EXISTS public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    importance TEXT NOT NULL DEFAULT 'normal',
    duration_value INTEGER NOT NULL,
    duration_unit TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT importance_check CHECK (importance IN ('normal', 'attention', 'important', 'urgent')),
    CONSTRAINT duration_unit_check CHECK (duration_unit IN ('hours', 'days')),
    CONSTRAINT status_check CHECK (status IN ('active', 'archived'))
);

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura publica" ON public.notices FOR SELECT USING (true);
CREATE POLICY "Permitir insercao publica" ON public.notices FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update publico" ON public.notices FOR UPDATE USING (true);
CREATE POLICY "Permitir delete publico" ON public.notices FOR DELETE USING (true);

NOTIFY pgrst, 'reload schema';`;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: 'var(--text-secondary)' }}>
        Carregando avisos...
      </div>
    );
  }

  if (isFormOpen) {
    const previewExpiration = calculateExpiresAt(durationValue || 0, durationUnit);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        <span style={{ display: 'none' }}>{timeTick}</span>
        {/* HEADER FORM */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #a3a3a3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {editingId ? 'Editar Aviso' : 'Novo Aviso'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>Preencha os dados para publicar.</p>
          </div>
          <button 
            onClick={() => setIsFormOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.03)' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* TÍTULO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Título <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input 
              type="text" 
              placeholder="Digite o título do aviso"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              required
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#171717',
                border: '1.5px solid rgba(255,255,255,0.05)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* MENSAGEM */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Mensagem <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea 
              placeholder="Digite a mensagem"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              required
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#171717',
                border: '1.5px solid rgba(255,255,255,0.05)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                resize: 'none'
              }}
            />
            <span style={{ alignSelf: 'flex-end', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {message.length}/500
            </span>
          </div>

          {/* IMPORTÂNCIA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Importância <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {(['normal', 'attention', 'important', 'urgent'] as const).map(imp => {
                const conf = IMPORTANCE_CONFIG[imp];
                const isSelected = importance === imp;
                return (
                  <button
                    key={imp}
                    type="button"
                    onClick={() => setImportance(imp)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px 4px',
                      borderRadius: '12px',
                      backgroundColor: isSelected ? conf.bg : '#171717',
                      border: isSelected ? `2px solid ${conf.color}` : '1.5px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      height: '70px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span className={imp === 'urgent' && isSelected ? 'siren-animated' : ''}>
                      {conf.icon}
                    </span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: isSelected ? conf.color : 'var(--text-secondary)', marginTop: '6px' }}>
                      {conf.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {importance === 'urgent' && (
              <span style={{ fontSize: '0.72rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontWeight: 500 }}>
                🚨 Urgente terá destaque e alerta visual.
              </span>
            )}
          </div>

          {/* DURAÇÃO DO AVISO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Duração do Aviso <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Quantidade</span>
                <input 
                  type="number" 
                  min="1"
                  value={durationValue}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setDurationValue(isNaN(val) ? 0 : val);
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#171717',
                    border: '1.5px solid rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Unidade</span>
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value as 'hours' | 'days')}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#171717',
                    border: '1.5px solid rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="hours">Horas</option>
                  <option value="days">Dias</option>
                </select>
              </div>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              O aviso expirará automaticamente após o tempo definido.
            </span>
          </div>

          {/* PRÉVIA DA EXPIRAÇÃO */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px',
            backgroundColor: 'rgba(255,255,255,0.015)',
            border: '1.5px solid rgba(255,255,255,0.04)',
            borderRadius: '12px',
            marginTop: '4px'
          }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={18} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Expira em:</span>
              <strong style={{ display: 'block', fontSize: '0.92rem', color: '#22c55e', marginTop: '2px' }}>
                {formatDateTime(previewExpiration.toISOString())}
              </strong>
            </div>
          </div>

          {/* CONTROL BUTTONS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              style={{
                padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '12px',
                backgroundColor: '#22c55e',
                border: 'none',
                borderRadius: '12px',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)'
              }}
            >
              {saving ? 'Publicando...' : 'Publicar Aviso'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #a3a3a3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Avisos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Comunicados e informações do RDA.</p>
        </div>
        {can('create_notices') && (
          <button 
            onClick={handleOpenNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              backgroundColor: '#22c55e',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(34,197,94,0.2)',
              transition: 'var(--transition)'
            }}
          >
            <Plus size={16} />
            <span>Novo Aviso</span>
          </button>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* SQL WARNING BANNER */}
      {tableMissing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', borderRadius: '12px', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: '0.8rem', lineHeight: '1.4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <Lock size={16} />
            <span>Tabela 'notices' não encontrada no banco.</span>
          </div>
          <p>Para persistir os avisos, crie a tabela no SQL Editor do Supabase executando a query abaixo:</p>
          <pre style={{ margin: '8px 0 0 0', padding: '10px', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '8px', overflowX: 'auto', fontSize: '0.72rem', color: '#e5e7eb', fontFamily: 'monospace' }}>
            {sqlCode}
          </pre>
          <button 
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(sqlCode);
              alert('SQL copiado para a área de transferência!');
            }}
            style={{ 
              marginTop: '4px', 
              alignSelf: 'flex-start', 
              padding: '6px 12px', 
              fontSize: '0.72rem', 
              fontWeight: 700, 
              backgroundColor: 'rgba(245,158,11,0.2)', 
              border: '1px solid rgba(245,158,11,0.4)', 
              color: '#ffffff', 
              borderRadius: '6px', 
              cursor: 'pointer' 
            }}
          >
            Copiar SQL
          </button>
        </div>
      )}

      {/* FILTROS COMPACTOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', padding: '2px 0' }}>
        <button
          onClick={() => { setActiveFilter('all'); setImportanceSubFilter(null); }}
          style={{
            width: '100%',
            padding: '12px 4px',
            backgroundColor: activeFilter === 'all' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
            border: '1px solid',
            borderColor: activeFilter === 'all' ? '#818cf8' : 'rgba(255,255,255,0.08)',
            borderRadius: '12px',
            color: activeFilter === 'all' ? '#818cf8' : 'var(--text-secondary)',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <span>Tod</span>
          <span style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '8px' }}>{countAll}</span>
        </button>
        <button
          onClick={() => { setActiveFilter('urgent'); setImportanceSubFilter(null); }}
          style={{
            width: '100%',
            padding: '12px 4px',
            backgroundColor: activeFilter === 'urgent' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.05)',
            border: '1px solid',
            borderColor: activeFilter === 'urgent' ? '#ef4444' : 'rgba(239,68,68,0.2)',
            borderRadius: '12px',
            color: activeFilter === 'urgent' ? '#ef4444' : 'var(--text-secondary)',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <span>Urg</span>
          <span style={{ backgroundColor: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: '8px', color: '#ef4444' }}>{countUrgent}</span>
        </button>
        <button
          onClick={() => { setActiveFilter('important'); setImportanceSubFilter(null); }}
          style={{
            width: '100%',
            padding: '12px 4px',
            backgroundColor: activeFilter === 'important' ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.05)',
            border: '1px solid',
            borderColor: activeFilter === 'important' ? '#f97316' : 'rgba(249,115,22,0.2)',
            borderRadius: '12px',
            color: activeFilter === 'important' ? '#f97316' : 'var(--text-secondary)',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <span>Imp</span>
          <span style={{ backgroundColor: 'rgba(249,115,22,0.15)', padding: '2px 8px', borderRadius: '8px', color: '#f97316' }}>{countImportant}</span>
        </button>
        <button
          onClick={() => { setActiveFilter('active'); setImportanceSubFilter(null); }}
          style={{
            width: '100%',
            padding: '12px 4px',
            backgroundColor: activeFilter === 'active' ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.05)',
            border: '1px solid',
            borderColor: activeFilter === 'active' ? '#22c55e' : 'rgba(34,197,94,0.2)',
            borderRadius: '12px',
            color: activeFilter === 'active' ? '#22c55e' : 'var(--text-secondary)',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <span>Ati</span>
          <span style={{ backgroundColor: 'rgba(34,197,94,0.15)', padding: '2px 8px', borderRadius: '8px', color: '#22c55e' }}>{countActive}</span>
        </button>
        <button
          onClick={() => { setActiveFilter('expired'); setImportanceSubFilter(null); }}
          style={{
            width: '100%',
            padding: '12px 4px',
            backgroundColor: activeFilter === 'expired' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
            border: '1px solid',
            borderColor: activeFilter === 'expired' ? '#fff' : 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            color: activeFilter === 'expired' ? '#fff' : 'var(--text-secondary)',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <span>Exp</span>
          <span style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '8px', color: 'var(--text-secondary)' }}>{countExpired}</span>
        </button>
      </div>

      {/* BARRA DE BUSCA */}
      <div style={{ position: 'relative', width: '100%' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          placeholder="Buscar aviso..." 
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

      {/* FEEDBACK FEED */}
      {feedback && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', backgroundColor: feedback.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: feedback.type === 'success' ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)', color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: '0.85rem' }}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* CATEGORY BOXES FOR ALL AND EXPIRED */}
      {(activeFilter === 'expired' || activeFilter === 'all') && !importanceSubFilter && (
         <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr' }}>
           {(['urgent', 'important', 'attention', 'normal'] as const).map(imp => {
              const conf = IMPORTANCE_CONFIG[imp];
              const count = sortedNotices.filter(n => n.importance === imp).length;
              if (count === 0) return null;
              return (
                 <button 
                   key={imp}
                   onClick={() => setImportanceSubFilter(imp)}
                   style={{
                     backgroundColor: '#171717', 
                     border: `1px solid ${conf.border.split(' ')[2] || 'transparent'}`, 
                     borderRadius: '10px', 
                     padding: '12px 16px', 
                     display: 'flex', 
                     flexDirection: 'row', 
                     alignItems: 'center', 
                     justifyContent: 'space-between',
                     cursor: 'pointer', 
                     transition: 'var(--transition)'
                   }}
                   onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                   onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#171717'}
                 >
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <span style={{ color: conf.color, display: 'flex', alignItems: 'center' }}>{conf.icon}</span>
                     <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{conf.label}</span>
                   </div>
                   <span style={{ backgroundColor: conf.bg, color: conf.color, padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800 }}>{count}</span>
                 </button>
              )
           })}
         </div>
      )}

      {/* LISTA DOS CARDS DE AVISO */}
      {( (activeFilter !== 'expired' && activeFilter !== 'all') || importanceSubFilter ) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {importanceSubFilter && (
            <button onClick={() => setImportanceSubFilter(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '0', alignSelf: 'flex-start', fontSize: '0.85rem', fontWeight: 600 }}>
               <ChevronLeft size={16} /> Voltar para categorias
            </button>
          )}
          {sortedNotices.length > 0 ? (
            sortedNotices.map((notice) => {
            const conf = IMPORTANCE_CONFIG[notice.importance];
            const isUrgentActive = notice.importance === 'urgent' && !notice.isExpired && notice.status === 'active';
            
            return (
              <div 
                key={notice.id}
                className={isUrgentActive ? 'card-urgent-animated' : ''}
                style={{
                  position: 'relative',
                  backgroundColor: '#171717',
                  border: isUrgentActive ? '2.5px solid transparent' : conf.border,
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'var(--transition)'
                }}
              >
                {/* CARD HEADER (BADGE, SIREN/ICON & MENU) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      className={isUrgentActive ? 'badge-urgent-animated' : ''}
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 850,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: conf.bg,
                        color: conf.color,
                        letterSpacing: '0.3px',
                        display: 'inline-block'
                      }}
                    >
                      {conf.label}
                    </span>
                    {notice.status === 'archived' && (
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '3px 6px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                        ARQUIVADO
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* ICON / SIREN */}
                    <div className={isUrgentActive ? 'siren-animated' : ''} style={{ color: conf.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {conf.icon}
                    </div>

                    {/* MENU TRIGGER */}
                    {(can('edit_notices') || can('delete_notices')) && (
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === notice.id ? null : notice.id);
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', borderRadius: '50%' }}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {/* THREE DOTS MENU (Z-INDEX SAFE) */}
                        {activeMenuId === notice.id && (
                          <>
                            <div 
                              style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 110 }} 
                              onClick={() => setActiveMenuId(null)}
                            />
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              top: '22px',
                              backgroundColor: '#262626',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '10px',
                              padding: '6px',
                              minWidth: '120px',
                              boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              zIndex: 120
                            }}>
                              {can('edit_notices') && (
                                <button
                                  onClick={() => handleEdit(notice)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', fontSize: '0.8rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', width: '100%', textAlign: 'left', borderRadius: '6px' }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <Edit size={14} />
                                  <span>Editar</span>
                                </button>
                              )}
                              {can('edit_notices') && (
                                <button
                                  onClick={() => handleArchive(notice.id, notice.status)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', fontSize: '0.8rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', width: '100%', textAlign: 'left', borderRadius: '6px' }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <Archive size={14} />
                                  <span>{notice.status === 'active' ? 'Arquivar' : 'Ativar'}</span>
                                </button>
                              )}
                              {can('edit_notices') && can('delete_notices') && (
                                <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '2px 0' }} />
                              )}
                              {can('delete_notices') && (
                                <button
                                  onClick={() => handleDelete(notice.id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', fontSize: '0.8rem', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', width: '100%', textAlign: 'left', borderRadius: '6px' }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <Trash2 size={14} />
                                  <span>Excluir</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* TEXT CONTENT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                    {notice.title}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                    {notice.message}
                  </p>
                </div>

                {/* EXPIRATION INFO & DATE */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.72rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: notice.isExpired ? 'var(--text-muted)' : '#fbbf24', fontWeight: notice.isExpired ? 500 : 700 }}>
                    <Clock size={12} />
                    <span>{notice.remainingText}</span>
                  </span>
                  <span>•</span>
                  <span>{formatDateTime(notice.created_at)}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Nenhum aviso encontrado.
          </div>
        )}
      </div>
      )}
    </div>
  );
}
