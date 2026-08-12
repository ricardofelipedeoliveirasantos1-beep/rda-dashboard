import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit, 
  User, 
  Calendar, 
  Award, 
  FileText, 
  Power, 
  X, 
  Camera,
  Loader
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// Definição da Interface do Jogador (Utilizando categorias Capitalizadas)
interface Player {
  id: string;
  name: string;
  birth_date: string;
  position: string;
  category: 'Mensalista' | 'Diarista';
  fee: number;
  notes: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at?: string;
}

// Função de formatação de nome (Capitalização correta)
const formatPlayerName = (nameStr: string): string => {
  const cleanSpaces = nameStr.replace(/\s{2,}/g, ' ');
  
  return cleanSpaces
    .split(' ')
    .map((word) => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

export default function Players({ userRole: _userRole, can: _can }: { userRole: 'admin' | 'assistant' | 'visitor' | 'treasurer'; can: (action: any) => boolean }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'Mensalista' | 'Diarista'>('all');

  // Controle de Modais
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Estados do Formulário e Validações
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [position, setPosition] = useState('');
  const [category, setCategory] = useState<'Mensalista' | 'Diarista'>('Mensalista');
  const [fee, setFee] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mensagens de Erro específicas abaixo de cada campo
  const [errors, setErrors] = useState<{
    name?: string;
    birthDate?: string;
    position?: string;
    category?: string;
    photo?: string;
    general?: string;
  }>({});

  // Estado de salvamento/carregamento do botão Salvar
  const [isSaving, setIsSaving] = useState(false);
  const [updatingPlayerId, setUpdatingPlayerId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Limpar toast de confirmação após 2 segundos
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Perfil Visualizado
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Menu de 3 Pontos Ativo
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('down');

  // Fechar menu ao pressionar Escape ou clicar fora
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (activeMenuId) {
        const target = e.target as HTMLElement;
        if (!target.closest('.menu-trigger') && !target.closest('.dropdown-menu-container')) {
          setActiveMenuId(null);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuId(null);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuId]);

  // Carregar Jogadores do Supabase
  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Mapeamento defensivo para garantir formato Capitalizado
      const mappedData = (data || []).map((p: any) => ({
        ...p,
        category: (p.category === 'mensalista' || p.category === 'Mensalista') ? 'Mensalista' : 'Diarista'
      }));

      setPlayers(mappedData);
    } catch (error) {
      console.error('Erro ao carregar jogadores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();

    // Inscrição Realtime para atualizações automáticas
    const subscription = supabase
      .channel('players-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Calcular Idade Automaticamente com base na Data de Nascimento
  useEffect(() => {
    if (birthDate) {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      setCalculatedAge(age >= 0 ? age : null);
    } else {
      setCalculatedAge(null);
    }
  }, [birthDate]);

  // Contagem para Filtros
  const totalCount = players.length;
  const mensalistasCount = players.filter(p => p.category === 'Mensalista').length;
  const diaristasCount = players.filter(p => p.category === 'Diarista').length;

  // Filtragem e Busca
  const filteredPlayers = players.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.position.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' ? true : p.category === filter;

    return matchesSearch && matchesFilter;
  });

  // Formatação de Nome durante a digitação
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const cleanSpaces = rawValue.replace(/\s{2,}/g, ' ');
    
    const formatted = cleanSpaces
      .split(' ')
      .map((word) => {
        if (word.length === 0) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');

    setName(formatted);
    
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  // Manipular Seleção de Foto
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErrors(prev => ({ ...prev, photo: undefined }));
    
    if (file) {
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      
      if (!allowedExtensions.includes(fileExt)) {
        setErrors(prev => ({ ...prev, photo: 'Formatos aceitos: JPG, JPEG, PNG e WEBP.' }));
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, photo: 'Tamanho máximo permitido: 5 MB.' }));
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setErrors(prev => ({ ...prev, photo: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload no Supabase Storage
  const uploadPhoto = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log('Iniciando upload de foto para bucket player-photos. Caminho:', filePath);
    
    const { error: uploadError } = await supabase.storage
      .from('player-photos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Erro completo do upload no Storage:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('player-photos')
      .getPublicUrl(filePath);

    console.log('Upload concluído com sucesso. URL pública gerada:', data.publicUrl);
    return data.publicUrl;
  };

  const deleteOldPhoto = async (url: string) => {
    try {
      const parts = url.split('/player-photos/');
      if (parts.length > 1) {
        const filePath = parts[1];
        await supabase.storage.from('player-photos').remove([filePath]);
      }
    } catch (e) {
      console.error('Erro ao deletar foto antiga do bucket:', e);
    }
  };

  // Salvar / Inserir / Editar Jogador (Função Única de Envio)
  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Informe o nome do jogador.';
    if (!birthDate) newErrors.birthDate = 'Informe a data de nascimento.';
    if (!position || position === '') newErrors.position = 'Selecione uma posição.';
    if (!category) newErrors.category = 'Selecione uma categoria.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      let finalPhotoUrl = editingPlayer ? editingPlayer.photo_url : null;

      if (photoFile) {
        if (editingPlayer?.photo_url) {
          await deleteOldPhoto(editingPlayer.photo_url);
        }
        finalPhotoUrl = await uploadPhoto(photoFile);
      } else if (photoPreview === null && editingPlayer?.photo_url) {
        await deleteOldPhoto(editingPlayer.photo_url);
        finalPhotoUrl = null;
      }

      const formattedName = formatPlayerName(name);

      const playerData = {
        name: formattedName,
        birth_date: birthDate,
        position: position,
        category: category,
        fee: Number(fee) || 0,
        notes: notes.trim() !== '' ? notes : null,
        photo_url: finalPhotoUrl,
        is_active: editingPlayer ? editingPlayer.is_active : true
      };

      console.log('Objeto de payload a ser enviado para a tabela players:', playerData);

      if (editingPlayer) {
        const { data, error } = await supabase
          .from('players')
          .update(playerData)
          .eq('id', editingPlayer.id)
          .select();

        if (error) {
          console.error('Erro completo do update no banco:', error);
          throw error;
        }
        console.log('Resultado do update:', data);
        setToastType('success');
        setToastMessage('Salvo com sucesso');
      } else {
        const { data, error } = await supabase
          .from('players')
          .insert([playerData])
          .select();

        if (error) {
          console.error('Erro completo do insert no banco:', error);
          throw error;
        }
        console.log('Resultado do insert:', data);
        setToastType('success');
        setToastMessage('Salvo com sucesso');
      }

      closeFormModal();
      fetchPlayers();
    } catch (error: any) {
      console.error('Erro geral detectado ao tentar salvar jogador:', error);
      setErrors(prev => ({
        ...prev,
        general: 'Não foi possível salvar o jogador. Verifique os dados e tente novamente.'
      }));
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir Jogador
  const handleDeletePlayer = async () => {
    if (!deleteConfirmId) return;
    try {
      const playerToDelete = players.find(p => p.id === deleteConfirmId);
      if (playerToDelete?.photo_url) {
        await deleteOldPhoto(playerToDelete.photo_url);
      }

      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', deleteConfirmId);

      if (error) throw error;
      setDeleteConfirmId(null);
      fetchPlayers();
    } catch (error) {
      console.error('Erro ao deletar jogador:', error);
    }
  };

  // Alternar Categoria do Atleta (Diarista <-> Mensalista)
  const toggleCategoryStatus = async (player: Player) => {
    if (_userRole === 'visitor') {
      setToastType('error');
      setToastMessage('Não tem moral para mudar');
      return;
    }
    if (updatingPlayerId) return; // Impede cliques repetidos
    setUpdatingPlayerId(player.id);

    const nextCategory = player.category === 'Mensalista' ? 'Diarista' : 'Mensalista';

    try {
      console.log(`[Supabase UPDATE] Tentando alterar categoria de ${player.name} para ${nextCategory}`);
      
      const { error } = await supabase
        .from('players')
        .update({ category: nextCategory })
        .eq('id', player.id);

      if (error) {
        console.error('Erro completo do update de categoria no Supabase:', error);
        throw error;
      }

      // Atualiza somente o jogador modificado no estado local
      setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, category: nextCategory } : p));
      setToastType('success');
      setToastMessage(`Jogador alterado para ${nextCategory}.`);
    } catch (error: any) {
      console.error('Falha ao atualizar categoria no banco:', error);
      alert('Não foi possível alterar a categoria do jogador.');
    } finally {
      setUpdatingPlayerId(null);
    }
  };

  // Abrir Modal de Cadastro
  const openNewPlayerModal = () => {
    setEditingPlayer(null);
    setName('');
    setBirthDate('');
    setPosition('');
    setCategory('Mensalista');
    setFee('');
    setNotes('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setErrors({});
    setIsFormOpen(true);
  };

  // Abrir Modal de Edição
  const openEditPlayerModal = (player: Player) => {
    setEditingPlayer(player);
    setName(formatPlayerName(player.name));
    setBirthDate(player.birth_date);
    setPosition(player.position);
    setCategory(player.category);
    setFee(player.fee.toString());
    setNotes(player.notes || '');
    setPhotoFile(null);
    setPhotoPreview(player.photo_url);
    setErrors({});
    setIsFormOpen(true);
    setActiveMenuId(null);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingPlayer(null);
  };

  const openProfileModal = (player: Player) => {
    setSelectedPlayer(player);
    setIsProfileOpen(true);
    setActiveMenuId(null);
  };

  const calculateAgeStatic = (birthDateString: string) => {
    const birth = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      {/* TOPO DA TELA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Jogadores</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Gerencie todos os atletas cadastrados.</p>
        </div>
        {_userRole !== 'visitor' && (
          <button 
            onClick={openNewPlayerModal} 
            className="btn-card" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--primary)', borderColor: 'var(--primary)', padding: '8px 16px' }}
          >
            <Plus size={16} /> Novo Jogador
          </button>
        )}
      </div>

      {/* BARRA DE PESQUISA */}
      <div style={{ position: 'relative', width: '100%' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          placeholder="Pesquisar por nome, posição ou categoria..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 12px 12px 38px',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid #262626',
            borderRadius: '12px',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            outline: 'none',
            fontFamily: 'var(--font-family)',
            transition: 'var(--transition)'
          }}
          className="search-input"
        />
      </div>

      {/* FILTROS COM CONTADOR */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button 
          onClick={() => setFilter('all')}
          style={{
            flex: 1,
            minWidth: '90px',
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid #262626',
            backgroundColor: filter === 'all' ? '#262626' : 'var(--card-bg)',
            color: filter === 'all' ? '#ffffff' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'var(--transition)'
          }}
        >
          <span>Todos</span>
          <span style={{ backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '6px', fontSize: '0.7rem' }}>{totalCount}</span>
        </button>

        <button 
          onClick={() => setFilter('Mensalista')}
          style={{
            flex: 1,
            minWidth: '90px',
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid #262626',
            backgroundColor: filter === 'Mensalista' ? 'rgba(34,197,94,0.1)' : 'var(--card-bg)',
            borderColor: filter === 'Mensalista' ? 'var(--success)' : '#262626',
            color: filter === 'Mensalista' ? 'var(--success)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'var(--transition)'
          }}
        >
          <span>Mensalistas</span>
          <span style={{ backgroundColor: 'rgba(34,197,94,0.08)', padding: '2px 6px', borderRadius: '6px', fontSize: '0.7rem' }}>{mensalistasCount}</span>
        </button>

        <button 
          onClick={() => setFilter('Diarista')}
          style={{
            flex: 1,
            minWidth: '90px',
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid #262626',
            backgroundColor: filter === 'Diarista' ? 'rgba(239,68,68,0.1)' : 'var(--card-bg)',
            borderColor: filter === 'Diarista' ? 'var(--danger)' : '#262626',
            color: filter === 'Diarista' ? 'var(--danger)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'var(--transition)'
          }}
        >
          <span>Diaristas</span>
          <span style={{ backgroundColor: 'rgba(239,68,68,0.08)', padding: '2px 6px', borderRadius: '6px', fontSize: '0.7rem' }}>{diaristasCount}</span>
        </button>
      </div>

      {/* LISTA DE JOGADORES */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Carregando atletas...</div>
      ) : filteredPlayers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', border: '1px dashed #262626', borderRadius: '18px' }}>
          Nenhum jogador encontrado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
          {filteredPlayers.map((player) => (
            <div 
              key={player.id} 
              className="dashboard-card"
              style={{
                position: 'relative',
                zIndex: activeMenuId === player.id ? 90 : 1
              }}
            >
              {/* CONTEÚDO INTERNO DO CARD (com opacidade se o jogador estiver inativo) */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  width: '100%',
                  opacity: player.is_active ? 1 : 0.55
                }}
              >
                {/* INFORMAÇÕES DO JOGADOR */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {player.photo_url ? (
                    <img 
                      src={player.photo_url} 
                      alt={player.name} 
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #3f3f46' }}
                    />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #3f3f46' }}>
                      <User size={24} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{player.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {player.position} • {calculateAgeStatic(player.birth_date)} anos
                    </span>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 700, 
                      color: player.category === 'Mensalista' ? 'var(--success)' : 'var(--danger)',
                      textTransform: 'uppercase',
                      marginTop: '4px'
                    }}>
                      {player.category}
                    </span>
                  </div>
                </div>

                {/* BOTÕES DE STATUS E MENUS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>                  {/* Botão Power circular e maior */}
                  <button 
                    onClick={() => toggleCategoryStatus(player)}
                    disabled={updatingPlayerId === player.id}
                    aria-label={`Alterar ${player.name} para ${player.category === 'Mensalista' ? 'Diarista' : 'Mensalista'}`}
                    title={`Mudar para ${player.category === 'Mensalista' ? 'Diarista' : 'Mensalista'}`}
                    style={{
                      border: `2.5px solid ${player.category === 'Mensalista' ? '#22c55e' : '#ef4444'}`,
                      background: 'none',
                      cursor: updatingPlayerId === player.id ? 'not-allowed' : 'pointer',
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: player.category === 'Mensalista' ? '#22c55e' : '#ef4444',
                      filter: `drop-shadow(0 0 6px ${player.category === 'Mensalista' ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'})`,
                      opacity: updatingPlayerId === player.id ? 0.6 : 1,
                      transition: 'var(--transition)',
                      padding: 0
                    }}
                  >
                    {updatingPlayerId === player.id ? (
                      <Loader size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Power size={20} />
                    )}
                  </button>
                  {/* Menu de 3 Pontos (Apenas o botão gatilho) */}
                  {_userRole !== 'visitor' && (
                    <div className="menu-trigger">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const spaceBelow = window.innerHeight - rect.bottom;
                          const openUpwards = spaceBelow < 140;
                          setMenuDirection(openUpwards ? 'up' : 'down');
                          setActiveMenuId(activeMenuId === player.id ? null : player.id);
                        }}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* DROPDOWN MENU (Fora da div com opacidade, garantindo opacidade 100% sólida e sobreposição) */}
              {activeMenuId === player.id && (
                <div 
                  className="dropdown-menu-container"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: menuDirection === 'down' ? '56px' : 'auto',
                    bottom: menuDirection === 'up' ? '56px' : 'auto',
                    backgroundColor: '#1e1e1e',
                    border: '1px solid #2d2d2d',
                    borderRadius: '12px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: '130px',
                    overflow: 'hidden',
                    padding: '4px 0'
                  }}
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openProfileModal(player);
                    }}
                    style={{
                      padding: '0 14px',
                      height: '40px',
                      border: 'none',
                      background: 'none',
                      color: '#ffffff',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <User size={16} />
                    <span>Ver Perfil</span>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditPlayerModal(player);
                    }}
                    style={{
                      padding: '0 14px',
                      height: '40px',
                      border: 'none',
                      background: 'none',
                      color: '#ffffff',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Edit size={16} />
                    <span>Editar</span>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(player.id);
                      setActiveMenuId(null);
                    }}
                    style={{
                      padding: '0 14px',
                      height: '40px',
                      border: 'none',
                      background: 'none',
                      color: 'var(--danger)',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Trash2 size={16} style={{ color: 'var(--danger)' }} />
                    <span>Excluir</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* DIALOG DE EXCLUSÃO (Cancelar | Excluir) */}
      {deleteConfirmId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#171717',
            border: '1px solid #ef4444',
            borderRadius: '18px',
            padding: '24px',
            maxWidth: '320px',
            width: '100%',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#262626',
                  border: '1px solid #3f3f46',
                  color: '#ffffff',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeletePlayer}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: 'var(--danger)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FORMULÁRIO DE CADASTRO / EDIÇÃO */}
      {isFormOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 900,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#171717',
            border: '1px solid #262626',
            borderRadius: '18px',
            padding: '20px',
            maxWidth: '450px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                {editingPlayer ? 'Editar Jogador' : 'Novo Jogador'}
              </h3>
              <button 
                type="button"
                onClick={closeFormModal}
                style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePlayer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* UPLOAD E CONTROLE DE FOTO */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                  {photoPreview ? (
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                    />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #3f3f46' }}>
                      <User size={36} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: 'var(--primary)',
                      border: 'none',
                      color: 'white',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                    }}
                    title="Carregar Foto"
                  >
                    <Camera size={14} />
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoSelect} 
                  accept="image/jpeg,image/jpg,image/png,image/webp" 
                  style={{ display: 'none' }} 
                />
                
                {photoPreview && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                    >
                      Alterar
                    </button>
                    <span style={{ color: '#262626' }}>|</span>
                    <button 
                      type="button" 
                      onClick={handleRemovePhoto} 
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                    >
                      Remover
                    </button>
                  </div>
                )}
                
                {errors.photo && (
                  <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', textAlign: 'center' }}>
                    {errors.photo}
                  </span>
                )}
              </div>

              {/* CAMPOS DE CADASTRO COM MENSAGEM DE ERRO ESPECÍFICA */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Nome Completo *</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={handleNameChange}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#202020', border: `1px solid ${errors.name ? 'var(--danger)' : '#262626'}`, borderRadius: '8px', color: '#fff', outline: 'none' }}
                />
                {errors.name && (
                  <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {errors.name}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Data de Nascimento *</label>
                  <input 
                    type="date" 
                    value={birthDate}
                    onChange={(e) => {
                      setBirthDate(e.target.value);
                      if (errors.birthDate) setErrors(prev => ({ ...prev, birthDate: undefined }));
                    }}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#202020', border: `1px solid ${errors.birthDate ? 'var(--danger)' : '#262626'}`, borderRadius: '8px', color: '#fff', outline: 'none' }}
                  />
                  {errors.birthDate && (
                    <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                      {errors.birthDate}
                    </span>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Idade Calculada</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={calculatedAge !== null ? `${calculatedAge} anos` : '--'}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#262626', border: '1px solid #262626', borderRadius: '8px', color: 'var(--text-secondary)', outline: 'none', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Posição *</label>
                  <select 
                    value={position}
                    onChange={(e) => {
                      setPosition(e.target.value);
                      if (errors.position) setErrors(prev => ({ ...prev, position: undefined }));
                    }}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#202020', border: `1px solid ${errors.position ? 'var(--danger)' : '#262626'}`, borderRadius: '8px', color: '#fff', outline: 'none' }}
                  >
                    <option value="" disabled>Posição</option>
                    <option value="Goleiro">Goleiro</option>
                    <option value="Zagueiro">Zagueiro</option>
                    <option value="Volante">Volante</option>
                    <option value="Meia">Meia</option>
                    <option value="Atacante">Atacante</option>
                  </select>
                  {errors.position && (
                    <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                      {errors.position}
                    </span>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Categoria *</label>
                  <select 
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value as 'Mensalista' | 'Diarista');
                      if (errors.category) setErrors(prev => ({ ...prev, category: undefined }));
                    }}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#202020', border: `1px solid ${errors.category ? 'var(--danger)' : '#262626'}`, borderRadius: '8px', color: '#fff', outline: 'none' }}
                  >
                    <option value="Mensalista">Mensalista</option>
                    <option value="Diarista">Diarista</option>
                  </select>
                  {errors.category && (
                    <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                      {errors.category}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                  Valor da {category === 'Mensalista' ? 'Mensalidade' : 'Diária'} (R$) *
                </label>
                <input 
                  type="number" 
                  required 
                  min="0"
                  placeholder="0.00"
                  step="0.01"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#202020', border: '1px solid #262626', borderRadius: '8px', color: '#fff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Observações</label>
                <textarea 
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#202020', border: '1px solid #262626', borderRadius: '8px', color: '#fff', outline: 'none', fontFamily: 'var(--font-family)' }}
                />
              </div>

              {errors.general && (
                <div style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center', padding: '8px', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>
                  {errors.general}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button 
                  type="button"
                  onClick={closeFormModal}
                  disabled={isSaving}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#262626', border: '1px solid #3f3f46', color: '#ffffff', borderRadius: '8px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  style={{ 
                    flex: 1, 
                    padding: '12px', 
                    backgroundColor: 'var(--primary)', 
                    border: 'none', 
                    color: '#ffffff', 
                    borderRadius: '8px', 
                    cursor: isSaving ? 'not-allowed' : 'pointer', 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isSaving ? (
                    <>
                      <Loader size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR PERFIL DO ATLETA */}
      {isProfileOpen && selectedPlayer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 900,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#171717',
            border: '1px solid #262626',
            borderRadius: '18px',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            alignItems: 'center',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsProfileOpen(false)}
              style={{ position: 'absolute', right: '16px', top: '16px', border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            {selectedPlayer.photo_url ? (
              <img 
                src={selectedPlayer.photo_url} 
                alt={selectedPlayer.name} 
                style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)', marginBottom: '4px' }}
              />
            ) : (
              <div style={{ width: '96px', height: '96px', borderRadius: '50%', backgroundColor: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #3f3f46', marginBottom: '4px' }}>
                <User size={48} style={{ color: 'var(--text-muted)' }} />
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{selectedPlayer.name}</h3>
              <span style={{ 
                display: 'inline-block',
                marginTop: '6px',
                fontSize: '0.7rem', 
                fontWeight: 700, 
                color: selectedPlayer.category === 'Mensalista' ? 'var(--success)' : 'var(--danger)',
                backgroundColor: selectedPlayer.category === 'Mensalista' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                padding: '3px 8px',
                borderRadius: '8px',
                textTransform: 'uppercase',
                border: `1px solid ${selectedPlayer.category === 'Mensalista' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
              }}>
                {selectedPlayer.category}
              </span>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #262626', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={18} style={{ color: 'var(--primary)' }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Posição</div>
                  <div style={{ fontWeight: 600 }}>{selectedPlayer.position}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={18} style={{ color: 'var(--primary)' }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Idade / Nascimento</div>
                  <div style={{ fontWeight: 600 }}>
                    {calculateAgeStatic(selectedPlayer.birth_date)} anos ({new Date(selectedPlayer.birth_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })})
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={18} style={{ color: 'var(--primary)' }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Valor Cobrado</div>
                  <div style={{ fontWeight: 600 }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedPlayer.fee)}
                  </div>
                </div>
              </div>

              {selectedPlayer.notes && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <FileText size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.85rem' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Observações</div>
                    <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '2px' }}>{selectedPlayer.notes}</div>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => setIsProfileOpen(false)}
              style={{ width: '100%', padding: '12px', backgroundColor: '#262626', border: '1px solid #3f3f46', color: '#ffffff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginTop: '8px' }}
            >
              Fechar Perfil
            </button>
          </div>
        </div>
      )}

      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '100px', // Acima da barra de navegação inferior
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: toastType === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
          border: `1px solid ${toastType === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          padding: '12px 24px',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 1000,
          color: toastType === 'error' ? '#f87171' : '#4ade80',
          fontSize: '0.85rem',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: toastType === 'error' ? 'var(--danger)' : 'var(--success)' }}></span>
          {toastMessage}
        </div>
      )}
      
      {/* Estilo para animações do toast e spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
