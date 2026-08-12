import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock the child components to avoid their internal complexity
vi.mock('../components/Players', () => ({
  default: ({ userRole, can: _can }: any) => (
    <div data-testid="players-component">
      <span data-testid="players-role">{userRole}</span>
    </div>
  ),
}));

vi.mock('../components/Partidas', () => ({
  default: ({ mode, userRole: _userRole }: any) => (
    <div data-testid="partidas-component">
      <span data-testid="partidas-mode">{mode}</span>
    </div>
  ),
}));

vi.mock('../components/Ranking', () => ({
  default: ({ userRole }: any) => (
    <div data-testid="ranking-component">
      <span data-testid="ranking-role">{userRole}</span>
    </div>
  ),
}));

vi.mock('../components/Financeiro', () => ({
  default: ({ userRole }: any) => (
    <div data-testid="financeiro-component">
      <span data-testid="financeiro-role">{userRole}</span>
    </div>
  ),
}));

vi.mock('../components/Avisos', () => ({
  default: ({ userRole }: any) => (
    <div data-testid="avisos-component">
      <span data-testid="avisos-role">{userRole}</span>
    </div>
  ),
}));

vi.mock('../components/Relatorios', () => ({
  default: ({ userRole }: any) => (
    <div data-testid="relatorios-component">
      <span data-testid="relatorios-role">{userRole}</span>
    </div>
  ),
}));

vi.mock('../components/Configuracoes', () => ({
  default: ({ userRole }: any) => (
    <div data-testid="configuracoes-component">
      <span data-testid="configuracoes-role">{userRole}</span>
    </div>
  ),
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render the app container', async () => {
    render(<App />);
    await waitFor(() => {
      const container = document.querySelector('.app-container');
      expect(container).toBeInTheDocument();
    });
  });

  it('should render the header with logo', async () => {
    render(<App />);
    await waitFor(() => {
      const header = document.querySelector('.header');
      expect(header).toBeInTheDocument();
    });
  });

  it('should render the navigation bar', async () => {
    render(<App />);
    await waitFor(() => {
      const navBar = document.querySelector('.nav-bar');
      expect(navBar).toBeInTheDocument();
    });
  });

  it('should have 5 navigation items in bottom nav', async () => {
    render(<App />);
    await waitFor(() => {
      const navBar = document.querySelector('.nav-bar');
      const navItems = navBar?.querySelectorAll('.nav-item');
      expect(navItems).toHaveLength(5);
    });
  });

  it('should show dashboard by default', async () => {
    render(<App />);
    await waitFor(() => {
      const mainContent = document.querySelector('.main-content');
      expect(mainContent).toBeInTheDocument();
    });
  });

  it('should navigate to players tab when clicking Jogadores in nav-bar', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    await waitFor(() => {
      expect(document.querySelector('.nav-bar')).toBeInTheDocument();
    });

    const navBar = document.querySelector('.nav-bar');
    const jogadoresNav = navBar?.querySelectorAll('.nav-item')[1]; // Jogadores is second
    await user.click(jogadoresNav!);
    
    await waitFor(() => {
      expect(screen.getByTestId('players-component')).toBeInTheDocument();
    });
  });

  it('should navigate to partidas tab when clicking Partidas in nav-bar', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    await waitFor(() => {
      expect(document.querySelector('.nav-bar')).toBeInTheDocument();
    });

    const navBar = document.querySelector('.nav-bar');
    const partidasNav = navBar?.querySelectorAll('.nav-item')[2]; // Partidas is third
    await user.click(partidasNav!);
    
    await waitFor(() => {
      expect(screen.getByTestId('partidas-component')).toBeInTheDocument();
    });
  });

  it('should navigate to avisos tab when clicking Avisos in nav-bar', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    await waitFor(() => {
      expect(document.querySelector('.nav-bar')).toBeInTheDocument();
    });

    const navBar = document.querySelector('.nav-bar');
    const avisosNav = navBar?.querySelectorAll('.nav-item')[3]; // Avisos is fourth
    await user.click(avisosNav!);
    
    await waitFor(() => {
      expect(screen.getByTestId('avisos-component')).toBeInTheDocument();
    });
  });

  it('should navigate to configuracoes tab when clicking Ajustes in nav-bar', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    await waitFor(() => {
      expect(document.querySelector('.nav-bar')).toBeInTheDocument();
    });

    const navBar = document.querySelector('.nav-bar');
    const configNav = navBar?.querySelectorAll('.nav-item')[4]; // Ajustes is fifth
    await user.click(configNav!);
    
    await waitFor(() => {
      expect(screen.getByTestId('configuracoes-component')).toBeInTheDocument();
    });
  });

  it('should open sidebar when menu button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    await waitFor(() => {
      expect(document.querySelector('.header-menu-btn')).toBeInTheDocument();
    });

    const menuBtn = document.querySelector('.header-menu-btn');
    await user.click(menuBtn!);
    
    const sidebar = document.querySelector('.sidebar');
    expect(sidebar).toHaveClass('open');
  });

  it('should close sidebar when overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    await waitFor(() => {
      expect(document.querySelector('.header-menu-btn')).toBeInTheDocument();
    });

    // Open sidebar first
    const menuBtn = document.querySelector('.header-menu-btn');
    await user.click(menuBtn!);
    
    // Click overlay to close
    const overlay = document.querySelector('.sidebar-overlay');
    await user.click(overlay!);
    
    const sidebar = document.querySelector('.sidebar');
    expect(sidebar).not.toHaveClass('open');
  });

  it('should close sidebar when Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    await waitFor(() => {
      expect(document.querySelector('.header-menu-btn')).toBeInTheDocument();
    });

    // Open sidebar first
    const menuBtn = document.querySelector('.header-menu-btn');
    await user.click(menuBtn!);
    
    // Press Escape
    await user.keyboard('{Escape}');
    
    const sidebar = document.querySelector('.sidebar');
    expect(sidebar).not.toHaveClass('open');
  });

  it('should default to visitor role', () => {
    render(<App />);
    // The app should start with visitor role by default
    expect(localStorage.getItem('rda_simulated_role')).toBeNull();
  });

  it('should render sidebar navigation items', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    await waitFor(() => {
      expect(document.querySelector('.header-menu-btn')).toBeInTheDocument();
    });

    // Open sidebar
    const menuBtn = document.querySelector('.header-menu-btn');
    await user.click(menuBtn!);
    
    const sidebarNav = document.querySelector('.sidebar-nav');
    const sidebarItems = sidebarNav?.querySelectorAll('.sidebar-item');
    expect(sidebarItems!.length).toBeGreaterThanOrEqual(5);
  });

  it('should navigate via sidebar menu items', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    await waitFor(() => {
      expect(document.querySelector('.header-menu-btn')).toBeInTheDocument();
    });

    // Open sidebar
    const menuBtn = document.querySelector('.header-menu-btn');
    await user.click(menuBtn!);
    
    // Click Jogadores in sidebar
    const sidebarNav = document.querySelector('.sidebar-nav');
    const jogadoresItem = sidebarNav?.querySelectorAll('.sidebar-item')[1]; // Jogadores
    await user.click(jogadoresItem!);
    
    await waitFor(() => {
      expect(screen.getByTestId('players-component')).toBeInTheDocument();
    });
  });
});
