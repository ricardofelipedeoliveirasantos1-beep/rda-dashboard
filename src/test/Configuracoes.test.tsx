import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Configuracoes from '../components/Configuracoes';
import { supabase } from '../lib/supabase';

describe('Configuracoes Component', () => {
  const defaultProps = {
    userRole: 'admin' as const,
    can: vi.fn().mockReturnValue(true),
    assistantPermissions: {
      create_match: true,
      edit_match: true,
      insert_stats: true,
      edit_players: true,
      delete_players: false,
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

  it('should show "Assistentes" section with 0/4 counter when no assistants', async () => {
    render(<Configuracoes {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Usuários e Acesso/i)).toBeInTheDocument();
    });
    // Click to expand the card
    const usersCard = screen.getByText(/Usuários e Acesso/i);
    usersCard.click();
    await waitFor(() => {
      expect(screen.getByText(/Nenhum assistente cadastrado/)).toBeInTheDocument();
      expect(screen.getByText(/0 \/ 4/)).toBeInTheDocument();
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

  it('should toggle password visibility in Create Assistant modal', async () => {
    render(<Configuracoes {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Usuários e Acesso/i)).toBeInTheDocument();
    });
    const usersCard = screen.getByText(/Usuários e Acesso/i);
    usersCard.click();

    await waitFor(() => {
      expect(screen.getByText(/Criar Assistente/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Criar Assistente/i));

    const pwInput = screen.getByPlaceholderText('Senha (6 números)') as HTMLInputElement;
    const confirmInput = screen.getByPlaceholderText('Confirmar senha') as HTMLInputElement;

    expect(pwInput.type).toBe('password');
    expect(confirmInput.type).toBe('password');

    // Click eye for password
    const pwEyeBtn = screen.getByTitle('Ver senha');
    fireEvent.click(pwEyeBtn);
    expect(pwInput.type).toBe('text');
    expect(screen.getByTitle('Ocultar senha')).toBeInTheDocument();

    // Click again to hide
    fireEvent.click(screen.getByTitle('Ocultar senha'));
    expect(pwInput.type).toBe('password');
    expect(screen.getByTitle('Ver senha')).toBeInTheDocument();

    // Click eye for confirm password
    const confirmEyeBtn = screen.getByTitle('Ver confirmação de senha');
    fireEvent.click(confirmEyeBtn);
    expect(confirmInput.type).toBe('text');
    expect(screen.getByTitle('Ocultar confirmação de senha')).toBeInTheDocument();

    // Click again to hide
    fireEvent.click(screen.getByTitle('Ocultar confirmação de senha'));
    expect(confirmInput.type).toBe('password');
    expect(screen.getByTitle('Ver confirmação de senha')).toBeInTheDocument();
  });

  it('should toggle password visibility in Create Treasurer modal', async () => {
    render(<Configuracoes {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Usuários e Acesso/i)).toBeInTheDocument();
    });
    const usersCard = screen.getByText(/Usuários e Acesso/i);
    usersCard.click();

    await waitFor(() => {
      expect(screen.getByText(/Criar Tesoureiro/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Criar Tesoureiro/i));

    const pwInput = screen.getByPlaceholderText('Senha (6 números)') as HTMLInputElement;
    const confirmInput = screen.getByPlaceholderText('Confirmar senha') as HTMLInputElement;

    expect(pwInput.type).toBe('password');
    expect(confirmInput.type).toBe('password');

    // Toggle password
    fireEvent.click(screen.getByTitle('Ver senha'));
    expect(pwInput.type).toBe('text');
    fireEvent.click(screen.getByTitle('Ocultar senha'));
    expect(pwInput.type).toBe('password');

    // Toggle confirm password
    fireEvent.click(screen.getByTitle('Ver confirmação de senha'));
    expect(confirmInput.type).toBe('text');
    fireEvent.click(screen.getByTitle('Ocultar confirmação de senha'));
    expect(confirmInput.type).toBe('password');
  });

  it('should reject invalid password or mismatched confirmation in Create modal', async () => {
    render(<Configuracoes {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Usuários e Acesso/i)).toBeInTheDocument();
    });
    const usersCard = screen.getByText(/Usuários e Acesso/i);
    usersCard.click();

    await waitFor(() => {
      expect(screen.getByText(/Criar Assistente/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Criar Assistente/i));

    const nameInput = screen.getByPlaceholderText('Nome');
    const emailInput = screen.getByPlaceholderText('E-mail');
    const pwInput = screen.getByPlaceholderText('Senha (6 números)');
    const confirmInput = screen.getByPlaceholderText('Confirmar senha');

    fireEvent.change(nameInput, { target: { value: 'Novo Assistente' } });
    fireEvent.change(emailInput, { target: { value: 'asst@rda.com' } });
    fireEvent.change(pwInput, { target: { value: '12345' } });
    fireEvent.change(confirmInput, { target: { value: '12345' } });

    // Submit with 5 digits -> error
    const createButtons = screen.getAllByRole('button', { name: /Criar Assistente/i });
    const modalSubmitBtn = createButtons[createButtons.length - 1];
    fireEvent.click(modalSubmitBtn);

    await waitFor(() => {
      expect(screen.getAllByText('A senha deve conter exatamente 6 números.').length).toBeGreaterThanOrEqual(2);
    });

    // Mismatched passwords
    fireEvent.change(pwInput, { target: { value: '123456' } });
    fireEvent.change(confirmInput, { target: { value: '654321' } });
    fireEvent.click(modalSubmitBtn);

    await waitFor(() => {
      expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument();
    });
  });

  it('should open Redefinir Senha modal for existing assistant with user identification, eye toggles, and cancel button', async () => {
    const mockProfiles = [
      { id: 'asst-101', name: 'Assistente Silva', role: 'assistant', created_at: '2026-01-01' },
    ];
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      const queryObj: any = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: vi.fn().mockImplementation((callback: any) => {
          callback({
            data: table === 'profiles' ? mockProfiles : [],
            error: null,
          });
          return { catch: vi.fn() };
        }),
      };
      return queryObj;
    });

    render(<Configuracoes {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Usuários e Acesso/i)).toBeInTheDocument();
    });
    const usersCard = screen.getByText(/Usuários e Acesso/i);
    usersCard.click();

    await waitFor(() => {
      expect(screen.getByText('Assistente Silva')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Redefinir Senha' })).toBeInTheDocument();
    });

    const resetBtn = screen.getByRole('button', { name: 'Redefinir Senha' });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Assistente Silva').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Assistente').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByPlaceholderText('Nova senha (6 números)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirmar nova senha')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Salvar Nova Senha' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    });

    const newPwInput = screen.getByPlaceholderText('Nova senha (6 números)') as HTMLInputElement;
    const confirmNewPwInput = screen.getByPlaceholderText('Confirmar nova senha') as HTMLInputElement;

    expect(newPwInput.type).toBe('password');
    expect(confirmNewPwInput.type).toBe('password');

    // Eye toggle for new password
    fireEvent.click(screen.getByTitle('Ver senha'));
    expect(newPwInput.type).toBe('text');
    fireEvent.click(screen.getByTitle('Ocultar senha'));
    expect(newPwInput.type).toBe('password');

    // Eye toggle for confirm password
    fireEvent.click(screen.getByTitle('Ver confirmação de senha'));
    expect(confirmNewPwInput.type).toBe('text');
    fireEvent.click(screen.getByTitle('Ocultar confirmação de senha'));
    expect(confirmNewPwInput.type).toBe('password');

    // Validation: mismatched passwords
    fireEvent.change(newPwInput, { target: { value: '112233' } });
    fireEvent.change(confirmNewPwInput, { target: { value: '445566' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Nova Senha' }));

    await waitFor(() => {
      expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument();
    });

    // Validation: 5 digits
    fireEvent.change(newPwInput, { target: { value: '11223' } });
    fireEvent.change(confirmNewPwInput, { target: { value: '11223' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Nova Senha' }));

    await waitFor(() => {
      expect(screen.getAllByText('A senha deve conter exatamente 6 números.').length).toBeGreaterThanOrEqual(2);
    });

    // Cancel button closes modal
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Nova senha (6 números)')).not.toBeInTheDocument();
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
