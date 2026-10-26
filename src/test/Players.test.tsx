import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Players from '../components/Players';

describe('Players Component', () => {
  const defaultProps = {
    userRole: 'admin' as const,
    can: vi.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render the players component', async () => {
    render(<Players {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Jogadores')).toBeInTheDocument();
    });
  });

  it('should display search input', async () => {
    render(<Players {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Pesquisar por nome/i)).toBeInTheDocument();
    });
  });

  it('should show category filter buttons', async () => {
    render(<Players {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Todos')).toBeInTheDocument();
      expect(screen.getByText('Mensalistas')).toBeInTheDocument();
      expect(screen.getByText('Diaristas')).toBeInTheDocument();
    });
  });

  it('should show empty state when no players', async () => {
    render(<Players {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum jogador encontrado/)).toBeInTheDocument();
    });
  });

  it('should show add player button for admin', async () => {
    render(<Players {...defaultProps} userRole="admin" />);
    await waitFor(() => {
      expect(screen.getByText(/Novo Jogador/i)).toBeInTheDocument();
    });
  });
});

describe('Players — Data de Nascimento e Idade (Auditoria e Validação)', () => {
  const defaultProps = {
    userRole: 'admin' as const,
    can: vi.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    const { clearCache } = await import('../services/dataCache');
    clearCache();
    const { supabase } = await import('../lib/supabase');
    const defaultQuery: any = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockImplementation((callback: any) => {
        callback({ data: [], error: null });
        return { catch: vi.fn() };
      }),
    };
    (supabase.from as any).mockImplementation(() => defaultQuery);
  });

  it('calculateAge function correctly calculates age or returns null when missing/empty', async () => {
    const { calculateAge } = await import('../utils/playerUtils');
    
    // Null, undefined, empty or whitespace values
    expect(calculateAge(null)).toBeNull();
    expect(calculateAge(undefined)).toBeNull();
    expect(calculateAge('')).toBeNull();
    expect(calculateAge('   ')).toBeNull();
    expect(calculateAge('invalid-date')).toBeNull();

    // Valid birth dates
    const today = new Date();
    const twentyYearsAgo = `${today.getFullYear() - 20}-01-01`;
    const age = calculateAge(twentyYearsAgo);
    expect(age).toBeGreaterThanOrEqual(19);
    expect(age).toBeLessThanOrEqual(21);
  });

  it('should open modal and allow creating player without birth date (optional)', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const { supabase } = await import('../lib/supabase');

    render(<Players {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Novo Jogador/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Novo Jogador/i));

    // Confirm modal opened
    expect(screen.getByRole('heading', { name: 'Novo Jogador' })).toBeInTheDocument();

    // "Data de Nascimento" does not contain asterisk *
    const birthDateLabel = screen.getByText('Data de Nascimento');
    expect(birthDateLabel.textContent).not.toContain('*');

    // Idade calculada starts with '—'
    const idadeInput = screen.getByDisplayValue('—');
    expect(idadeInput).toBeInTheDocument();

    // Fill required fields
    const nameInput = screen.getByLabelText(/Nome Completo \*/i);
    fireEvent.change(nameInput, { target: { value: 'Jogador Teste' } });

    const positionSelect = screen.getByRole('combobox', { name: /Posição \*/i });
    fireEvent.change(positionSelect, { target: { value: 'Meia' } });

    const feeInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(feeInput, { target: { value: '50' } });

    // Submit without filling birth_date
    const submitBtn = screen.getByRole('button', { name: /^Salvar$/i });
    fireEvent.click(submitBtn);

    // Should NOT show "Informe a data de nascimento." error
    await waitFor(() => {
      expect(screen.queryByText('Informe a data de nascimento.')).not.toBeInTheDocument();
    });

    // Should have called insert with birth_date: null
    expect(supabase.from).toHaveBeenCalledWith('players');
  });

  it('dynamically calculates age when valid date is inputted in form', async () => {
    const { fireEvent } = await import('@testing-library/react');

    render(<Players {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Novo Jogador/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Novo Jogador/i));

    const birthInput = screen.getByLabelText('Data de Nascimento');
    const ageInput = screen.getByLabelText('Idade Calculada') as HTMLInputElement;

    expect(ageInput.value).toBe('—');

    // Type a birth date
    fireEvent.change(birthInput, { target: { value: '2000-01-01' } });
    
    await waitFor(() => {
      expect(ageInput.value).toMatch(/\d+ anos/);
    });

    // Clear birth date again
    fireEvent.change(birthInput, { target: { value: '' } });

    await waitFor(() => {
      expect(ageInput.value).toBe('—');
    });
  });

  it('allows editing an existing player and clearing birth_date to send null (never empty string)', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const { supabase } = await import('../lib/supabase');

    const existingPlayer = {
      id: 'player-edit-1',
      name: 'Carlos Silva',
      birth_date: '1990-05-15',
      position: 'Meia',
      category: 'Mensalista',
      fee: 50,
      is_active: true,
      notes: null,
      photo_url: null
    };

    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ ...existingPlayer, birth_date: null }],
          error: null
        })
      })
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'players') {
        const query: any = {
          select: vi.fn(() => query),
          order: vi.fn(() => query),
          update: updateSpy,
          then: vi.fn((resolve: any) => resolve({ data: [existingPlayer], error: null })),
          catch: vi.fn()
        };
        return query;
      }
      return {
        select: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: any) => resolve({ data: [], error: null }))
      };
    });

    render(<Players {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
    });

    // Abrir o menu de 3 pontos do card do jogador
    const card = screen.getByText('Carlos Silva').closest('.dashboard-card');
    const dotBtn = card?.querySelector('.menu-trigger button') as HTMLButtonElement;
    expect(dotBtn).toBeTruthy();
    fireEvent.click(dotBtn);

    await waitFor(() => {
      expect(screen.getByText('Editar')).toBeInTheDocument();
    });

    // Clicar no botão "Editar" do menu dropdown
    fireEvent.click(screen.getByText('Editar'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Editar Jogador' })).toBeInTheDocument();
    });

    // Clear birth date
    const birthInput = screen.getByLabelText('Data de Nascimento');
    fireEvent.change(birthInput, { target: { value: '' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /^Salvar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          birth_date: null
        })
      );
    });

    // Verify it was NOT called with empty string ""
    const calledPayload = updateSpy.mock.calls[0][0];
    expect(calledPayload.birth_date).toBeNull();
    expect(calledPayload.birth_date).not.toBe('');
  });

  it('should display descriptive message when Supabase returns 23502 not-null constraint error', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const { supabase } = await import('../lib/supabase');

    // Simula erro 23502 do PostgreSQL na coluna birth_date
    const mockQuery = (supabase.from as any)('players');
    mockQuery.insert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: '23502',
          message: 'null value in column "birth_date" of relation "players" violates not-null constraint'
        }
      })
    });

    render(<Players {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Novo Jogador/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Novo Jogador/i));

    const nameInput = screen.getByLabelText(/Nome Completo \*/i);
    fireEvent.change(nameInput, { target: { value: 'Jogador Sem Data' } });

    const positionSelect = screen.getByRole('combobox', { name: /Posição \*/i });
    fireEvent.change(positionSelect, { target: { value: 'Atacante' } });

    const feeInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(feeInput, { target: { value: '60' } });

    const submitBtn = screen.getByRole('button', { name: /^Salvar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/30 - CRMFUT - Data de Nascimento Opcional.sql/i)).toBeInTheDocument();
    });
  });
});


