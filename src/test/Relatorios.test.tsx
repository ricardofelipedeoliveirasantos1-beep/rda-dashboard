import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Relatorios from '../components/Relatorios';

describe('Relatorios Component', () => {
  const defaultProps = {
    userRole: 'admin' as const,
    can: vi.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render the reports component', async () => {
    render(<Relatorios {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Relatórios')).toBeInTheDocument();
    });
  });

  it('should display period filter options', async () => {
    render(<Relatorios {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('PERÍODO')).toBeInTheDocument();
    });
  });

  it('should show generate report button', async () => {
    render(<Relatorios {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Gerar Relatório/i })).toBeInTheDocument();
    });
  });

  it('should display period select options', async () => {
    render(<Relatorios {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Mensal')).toBeInTheDocument();
      expect(screen.getByText('Anual')).toBeInTheDocument();
    });
  });
});
