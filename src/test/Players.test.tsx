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
