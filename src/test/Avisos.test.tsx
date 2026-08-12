import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Avisos from '../components/Avisos';

describe('Avisos Component', () => {
  const defaultProps = {
    userRole: 'admin' as const,
    can: vi.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render the notices component', async () => {
    render(<Avisos {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Avisos/i)).toBeInTheDocument();
    });
  });

  it('should show search input', async () => {
    render(<Avisos {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/buscar aviso/i)).toBeInTheDocument();
    });
  });

  it('should show filter options', async () => {
    render(<Avisos {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Todos/i)).toBeInTheDocument();
    });
  });
});
