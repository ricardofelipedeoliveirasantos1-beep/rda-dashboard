import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Ranking from '../components/Ranking';

describe('Ranking Component', () => {
  const defaultProps = {
    userRole: 'admin' as const,
    can: vi.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render the ranking component', async () => {
    render(<Ranking {...defaultProps} />);
    await waitFor(() => {
      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(`Ranking Geral ${currentYear}`))).toBeInTheDocument();
    });
  });

  it('should display ranking header with current year', async () => {
    render(<Ranking {...defaultProps} />);
    await waitFor(() => {
      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(`Ranking Geral ${currentYear}`))).toBeInTheDocument();
    });
  });

  it('should show filter tabs', async () => {
    render(<Ranking {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Geral')).toBeInTheDocument();
      expect(screen.getByText('Gols')).toBeInTheDocument();
    });
  });

  it('should show empty state when no data', async () => {
    render(<Ranking {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhuma estatística disponível/)).toBeInTheDocument();
    });
  });
});
