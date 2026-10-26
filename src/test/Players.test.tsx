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

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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
});


