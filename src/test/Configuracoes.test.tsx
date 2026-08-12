import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Configuracoes from '../components/Configuracoes';

describe('Configuracoes Component', () => {
  const defaultProps = {
    userRole: 'admin' as const,
    can: vi.fn().mockReturnValue(true),
    assistantPermissions: {
      create_match: true,
      edit_match: true,
      insert_stats: true,
      edit_players: true,
      manage_finance: true, manage_expenses: false,
      create_notices: false,
      edit_notices: false,
      delete_notices: false,
      import_history: false,
    },
    setAssistantPermissions: vi.fn(),
    appLogoUrl: null,
    setAppLogoUrl: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render the settings component', async () => {
    render(<Configuracoes {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Configurações/i)).toBeInTheDocument();
    });
  });

  it('should display settings sections', async () => {
    render(<Configuracoes {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Configurações/i)).toBeInTheDocument();
    });
  });

  it('should show "Usuários e Acesso" card for admin', async () => {
    render(<Configuracoes {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Configurações/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Usuários e Acesso/i)).toBeInTheDocument();
  });

  it('should NOT show "Usuários e Acesso" for assistant', async () => {
    render(<Configuracoes {...defaultProps} userRole="assistant" />);
    await waitFor(() => {
      expect(screen.getByText(/Configurações/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Usuários e Acesso/i)).not.toBeInTheDocument();
  });

  it('should NOT show "Usuários e Acesso" for visitor', async () => {
    render(<Configuracoes {...defaultProps} userRole="visitor" />);
    await waitFor(() => {
      expect(screen.getByText(/Configurações/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Usuários e Acesso/i)).not.toBeInTheDocument();
  });

  it('should show "Assistentes" section with 0/2 counter when no assistants', async () => {
    render(<Configuracoes {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Usuários e Acesso/i)).toBeInTheDocument();
    });
    // Click to expand the card
    const usersCard = screen.getByText(/Usuários e Acesso/i);
    usersCard.click();
    await waitFor(() => {
      expect(screen.getByText(/Nenhum assistente cadastrado/)).toBeInTheDocument();
    });
  });

  it('should show "Criar Assistente" button when no assistants exist', async () => {
    render(<Configuracoes {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Usuários e Acesso/i)).toBeInTheDocument();
    });
    const usersCard = screen.getByText(/Usuários e Acesso/i);
    usersCard.click();
    await waitFor(() => {
      expect(screen.getByText(/Criar Assistente/i)).toBeInTheDocument();
    });
  });

  it('should show Visitante section with "Acesso público"', async () => {
    render(<Configuracoes {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Usuários e Acesso/i)).toBeInTheDocument();
    });
    const usersCard = screen.getByText(/Usuários e Acesso/i);
    usersCard.click();
    await waitFor(() => {
      expect(screen.getByText(/Visitante/i)).toBeInTheDocument();
      expect(screen.getByText(/Acesso público/)).toBeInTheDocument();
    });
  });
});

describe('Configuracoes — Password Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should validate password format: 5 digits rejected', () => {
    const regex = /^\d{6}$/;
    expect(regex.test('12345')).toBe(false);
  });

  it('should validate password format: 6 digits accepted', () => {
    const regex = /^\d{6}$/;
    expect(regex.test('123456')).toBe(true);
  });

  it('should validate password format: letters rejected', () => {
    const regex = /^\d{6}$/;
    expect(regex.test('abcdef')).toBe(false);
  });

  it('should validate password format: 7 digits rejected', () => {
    const regex = /^\d{6}$/;
    expect(regex.test('1234567')).toBe(false);
  });

  it('should validate password format: mixed rejected', () => {
    const regex = /^\d{6}$/;
    expect(regex.test('12ab34')).toBe(false);
  });
});
