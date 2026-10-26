import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Partidas from '../components/Partidas';

describe('Partidas Component', () => {
  const defaultProps = {
    mode: 'partidas' as const,
    userRole: 'admin' as const,
    can: vi.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render partidas in partidas mode', async () => {
    render(<Partidas {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Partidas')).toBeInTheDocument();
    });
  });

  it('should render partidas in historico mode', async () => {
    render(<Partidas {...defaultProps} mode="historico" />);
    await waitFor(() => {
      expect(screen.getByText(/Partidas/i)).toBeInTheDocument();
    });
  });

  it('should show create match button for admin', async () => {
    render(<Partidas {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Nova Partida/i)).toBeInTheDocument();
    });
  });

  it('should show empty state when no matches', async () => {
    render(<Partidas {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhuma partida registrada/)).toBeInTheDocument();
    });
  });

  it('should render with different user roles', async () => {
    const roles = ['admin', 'assistant', 'visitor'] as const;
    
    for (const role of roles) {
      const { unmount } = render(<Partidas {...defaultProps} userRole={role} />);
      
      await waitFor(() => {
        expect(screen.getByText('Partidas')).toBeInTheDocument();
      });
      
      unmount();
    }
  });
});

describe('Partidas — Visitor Read-Only', () => {
  const visitorProps = {
    mode: 'partidas' as const,
    userRole: 'visitor' as const,
    can: vi.fn().mockReturnValue(false),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render partidas list for visitor', async () => {
    render(<Partidas {...visitorProps} />);
    await waitFor(() => {
      expect(screen.getByText('Partidas')).toBeInTheDocument();
    });
  });

  it('should NOT show "Nova Partida" button for visitor', async () => {
    render(<Partidas {...visitorProps} />);
    await waitFor(() => {
      expect(screen.getByText('Partidas')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Nova Partida/i)).not.toBeInTheDocument();
  });

  it('should NOT show "Editar Partida" button for visitor', async () => {
    render(<Partidas {...visitorProps} />);
    await waitFor(() => {
      expect(screen.getByText('Partidas')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Editar Partida/i)).not.toBeInTheDocument();
  });

  it('should NOT show "Excluir" button for visitor', async () => {
    render(<Partidas {...visitorProps} />);
    await waitFor(() => {
      expect(screen.getByText('Partidas')).toBeInTheDocument();
    });
    expect(screen.queryByTitle(/Excluir Partida/i)).not.toBeInTheDocument();
  });

  it('should NOT allow visitor to enter create view (guard blocks it)', async () => {
    render(<Partidas {...visitorProps} />);
    await waitFor(() => {
      expect(screen.getByText('Partidas')).toBeInTheDocument();
    });
    // Visitor should always see list view, never wizard
    expect(screen.queryByText('Nova Partida')).not.toBeInTheDocument();
    expect(screen.queryByText('Configurar a partida')).not.toBeInTheDocument();
  });

  it('should show "Visualizar Partida" or "Visualizar Escalação" for visitor', async () => {
    render(<Partidas {...visitorProps} />);
    await waitFor(() => {
      expect(screen.getByText('Partidas')).toBeInTheDocument();
    });
    // When no matches exist, visitor sees empty state
    // With matches, they'd see "Visualizar Partida" or "Visualizar Escalação"
    expect(screen.getByText(/Nenhuma partida registrada/)).toBeInTheDocument();
  });
});

describe('Partidas — Assistant Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should show edit controls when assistant has edit_match=true', async () => {
    const canFn = vi.fn((action: string) => {
      if (action === 'edit_match') return true;
      return false;
    });
    render(<Partidas mode="partidas" userRole="assistant" can={canFn} />);
    await waitFor(() => {
      expect(screen.getByText('Partidas')).toBeInTheDocument();
    });
    // Assistant with edit_match should see Nova Partida
    expect(screen.getByText(/Nova Partida/i)).toBeInTheDocument();
  });

  it('should NOT show edit controls when assistant has edit_match=false', async () => {
    const canFn = vi.fn((action: string) => {
      if (action === 'edit_match') return false;
      return false;
    });
    render(<Partidas mode="partidas" userRole="assistant" can={canFn} />);
    await waitFor(() => {
      expect(screen.getByText('Partidas')).toBeInTheDocument();
    });
    // Assistant without edit_match should NOT see Nova Partida
    expect(screen.queryByText(/Nova Partida/i)).not.toBeInTheDocument();
  });

  it('should NOT show "Editar Partida" when assistant has edit_match=false', async () => {
    const canFn = vi.fn((action: string) => {
      if (action === 'edit_match') return false;
      return false;
    });
    render(<Partidas mode="partidas" userRole="assistant" can={canFn} />);
    await waitFor(() => {
      expect(screen.getByText('Partidas')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Editar Partida/i)).not.toBeInTheDocument();
  });

  it('should allow assistant with edit_match=true to see edit buttons', async () => {
    const canFn = vi.fn((action: string) => {
      if (action === 'edit_match') return true;
      return false;
    });
    render(<Partidas mode="partidas" userRole="assistant" can={canFn} />);
    await waitFor(() => {
      expect(screen.getByText('Partidas')).toBeInTheDocument();
    });
    // With no matches, we can only verify the header and Nova Partida
    expect(screen.getByText(/Nova Partida/i)).toBeInTheDocument();
  });
});

describe('Partidas — Admin Full Access', () => {
  const adminProps = {
    mode: 'partidas' as const,
    userRole: 'admin' as const,
    can: vi.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should show "Nova Partida" for admin', async () => {
    render(<Partidas {...adminProps} />);
    await waitFor(() => {
      expect(screen.getByText('Partidas')).toBeInTheDocument();
    });
    expect(screen.getByText(/Nova Partida/i)).toBeInTheDocument();
  });

  it('should render stats view for admin without redirecting', async () => {
    render(<Partidas {...adminProps} />);
    await waitFor(() => {
      expect(screen.getByText('Partidas')).toBeInTheDocument();
    });
    // Admin should see the partidas view normally
    expect(screen.getByText('Partidas')).toBeInTheDocument();
  });
});

describe('Partidas — Menu de Três Pontos, Sorteio e Remoção de Jogadores', () => {
  const adminProps = {
    mode: 'partidas' as const,
    userRole: 'admin' as const,
    can: vi.fn().mockReturnValue(true),
  };

  const mockPlayers = Array.from({ length: 24 }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `Jogador ${String(i + 1).padStart(2, '0')}`,
    birth_date: i % 2 === 0 ? '1995-05-10' : null,
    position: i < 4 ? 'Goleiro' : i < 10 ? 'Zagueiro' : i < 18 ? 'Meia' : 'Atacante',
    category: i < 18 ? 'Mensalista' : 'Diarista',
    fee: i < 18 ? 50 : 25,
    is_active: true,
  }));

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    const { supabase } = await import('../lib/supabase');

    const createQueryMock = (data: any = []) => {
      const query: any = {
        select: vi.fn(() => query),
        insert: vi.fn(() => query),
        update: vi.fn(() => query),
        delete: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(() => query),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        then: vi.fn((resolve: any) => Promise.resolve({ data, error: null }).then(resolve)),
        catch: vi.fn((reject: any) => Promise.resolve({ data, error: null }).catch(reject)),
      };
      return query;
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'players') {
        return createQueryMock(mockPlayers);
      }
      if (table === 'settings') {
        const settingsMock = createQueryMock([{ id: 'default', daily_fee: 25, default_location: 'Arena RDA' }]);
        settingsMock.single = vi.fn(() => Promise.resolve({ data: { id: 'default', daily_fee: 25, default_location: 'Arena RDA' }, error: null }));
        return settingsMock;
      }
      return createQueryMock([]);
    });
  });

  const setupWizardToTeams = async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(<Partidas {...adminProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Nova Partida/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Nova Partida/i));

    await waitFor(() => {
      expect(screen.getByText(/Selecionar todos/i)).toBeInTheDocument();
    });

    // Select all 24 players
    fireEvent.click(screen.getByText(/Selecionar todos/i));

    // Ensure location has value
    const locationInput = screen.getByLabelText(/LOCAL/i) as HTMLInputElement;
    if (!locationInput.value) {
      fireEvent.change(locationInput, { target: { value: 'Arena RDA' } });
    }

    // Advance to teams step
    const continuarBtn = screen.getByRole('button', { name: /^Continuar$/i });
    fireEvent.click(continuarBtn);

    await waitFor(() => {
      expect(screen.getByText(/Montagem dos Times/i)).toBeInTheDocument();
      expect(screen.getByText(/Sorteio Flash/i)).toBeInTheDocument();
    });
  };

  it('allows clicking Nova Partida and navigating through configuration to teams', async () => {
    await setupWizardToTeams();
  });

  it('runs Sorteio Flash distributing all 24 players into 4 teams of 6', async () => {
    const { fireEvent } = await import('@testing-library/react');
    await setupWizardToTeams();

    // Click Sorteio Flash
    fireEvent.click(screen.getByText(/Sorteio Flash/i));

    // Confirm all 4 teams have 6 players and 0 unassigned
    await waitFor(() => {
      const counts = screen.getAllByText('6/6');
      expect(counts.length).toBe(8); // 4 teams in top summary pill + 4 teams in team headers
    });

    // Save button should NOT be disabled when all assigned
    const saveBtn = screen.getByRole('button', { name: /Salvar Partida/i });
    expect(saveBtn).not.toBeDisabled();
  });

  it('supports 3-dots menu: removes a player from a team without disabling save button', async () => {
    const { fireEvent } = await import('@testing-library/react');
    await setupWizardToTeams();

    fireEvent.click(screen.getByText(/Sorteio Flash/i));

    await waitFor(() => {
      expect(screen.getAllByText('6/6').length).toBe(8);
    });

    // Find 3-dots trigger buttons
    const dotButtons = screen.getAllByTitle('Opções do jogador');
    expect(dotButtons.length).toBeGreaterThan(0);

    // Click first dot button to open menu
    fireEvent.click(dotButtons[0]);

    // Check that "Remover do time" is visible and click it
    await waitFor(() => {
      expect(screen.getByText('Remover do time')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Remover do time'));

    // Now one team has 5/6 and there is 1 unassigned player
    await waitFor(() => {
      expect(screen.getAllByText('5/6').length).toBeGreaterThanOrEqual(1);
    });

    // CRITICAL: Save button must still be enabled even with available/unassigned players!
    const saveBtn = screen.getByRole('button', { name: /Salvar Partida/i });
    expect(saveBtn).not.toBeDisabled();
  });

  it('prevents moving a player into a team that already has 6 players', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    await setupWizardToTeams();

    fireEvent.click(screen.getByText(/Sorteio Flash/i));

    await waitFor(() => {
      expect(screen.getAllByText('6/6').length).toBe(8);
    });

    // All teams have 6 players. Open 3-dots on a player in Brasil
    const dotButtons = screen.getAllByTitle('Opções do jogador');
    fireEvent.click(dotButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Mover para Portugal')).toBeInTheDocument();
    });

    // Attempt moving to Portugal (which already has 6/6)
    fireEvent.click(screen.getByText('Mover para Portugal'));

    // Should alert and prevent move
    expect(alertMock).toHaveBeenCalledWith('Este time já atingiu o limite de 6 vagas!');

    // Teams should still both have 6/6
    expect(screen.getAllByText('6/6').length).toBe(8);

    alertMock.mockRestore();
  });
});

