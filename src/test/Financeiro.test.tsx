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

  it('should display month selector', async () => {
    render(<Financeiro {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/2026/)).toBeInTheDocument();
    });
  });

  it('should show financial summary cards', async () => {
    render(<Financeiro {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Mensalidades Recebidas/i)).toBeInTheDocument();
      expect(screen.getByText(/Diaristas Arrecadados/i)).toBeInTheDocument();
      expect(screen.getByText(/Total de Entradas/i)).toBeInTheDocument();
      expect(screen.getByText(/Saldo Líquido/i)).toBeInTheDocument();
    });
  });

  it('should show expenses section', async () => {
    render(<Financeiro {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/RELATÓRIO DE GASTOS DO MÊS/i)).toBeInTheDocument();
    });
  });
});
