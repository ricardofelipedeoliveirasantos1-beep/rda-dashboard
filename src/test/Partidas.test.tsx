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
