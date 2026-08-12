import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Financeiro from '../components/Financeiro';

describe('Financeiro Component', () => {
  const defaultProps = {
    userRole: 'admin' as const,
    can: vi.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render the financial component', async () => {
    render(<Financeiro {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Financeiro')).toBeInTheDocument();
    });
  });

  it('should display month navigation', async () => {
    render(<Financeiro {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('MENSALIDADES')).toBeInTheDocument();
    });
  });

  it('should show financial summary cards', async () => {
    render(<Financeiro {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Previstas')).toBeInTheDocument();
      expect(screen.getByText('Recebidas')).toBeInTheDocument();
      expect(screen.getByText('Pendentes')).toBeInTheDocument();
    });
  });

  it('should show empty state for mensalistas', async () => {
    render(<Financeiro {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum mensalista encontrado/)).toBeInTheDocument();
    });
  });
});
