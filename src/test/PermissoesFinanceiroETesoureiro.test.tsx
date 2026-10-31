import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Financeiro from '../components/Financeiro';
import Configuracoes from '../components/Configuracoes';
import { supabase } from '../lib/supabase';
import { clearCache } from '../services/dataCache';

describe('RDA — Permissão de Leitura Financeira, Consolidado Dinâmico e Matriz do Tesoureiro', () => {
  const setupSupabaseMock = (options: {
    payments?: any[];
    matches?: any[];
    expenses?: any[];
    adjustments?: any[];
    treasurers?: any[];
    treasurerPerms?: any[];
  } = {}) => {
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      const getMockData = () => {
        if (table === 'monthly_payments') return options.payments || [];
        if (table === 'matches') return options.matches || [];
        if (table === 'expenses') return options.expenses || [];
        if (table === 'balance_adjustments') return options.adjustments || [];
        if (table === 'profiles') return options.treasurers || [];
        if (table === 'treasurer_permissions') return options.treasurerPerms || [];
        if (table === 'assistant_permissions') return [];
        if (table === 'configuracoes') return [{ id: '1', monthly_fee: 60, daily_fee: 20 }];
        return [];
      };

      const builder: any = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockImplementation(() => {
          const res = { data: getMockData(), error: null };
          return {
            ...builder,
            then: vi.fn().mockImplementation((callback: any) => {
              callback(res);
              return { catch: vi.fn() };
            })
          };
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: getMockData(), error: null })
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => Promise.resolve({ data: getMockData()[0] || null, error: null })),
        then: vi.fn().mockImplementation((callback: any) => {
          callback({ data: getMockData(), error: null });
          return { catch: vi.fn() };
        })
      };
      return builder;
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearCache();
  });

  describe('ETAPA 1 — Consolidado Dinâmico desde Setembro de 2026', () => {
    it('deve calcular dinamicamente o consolidado excluindo meses anteriores a setembro/2026 (como agosto)', async () => {
      // Mock payments: Aug (1000 - should be excluded), Sep (720), Oct (780)
      const mockPayments = [
        { id: 'p-aug', player_id: 'pl-1', payment_month: '2026-08', amount: 1000, status: 'paid' },
        { id: 'p-sep', player_id: 'pl-1', payment_month: '2026-09', amount: 720, status: 'paid' },
        { id: 'p-oct', player_id: 'pl-2', payment_month: '2026-10', amount: 780, status: 'paid' },
      ];

      // Mock matches: Aug (500 - excluded), Sep (880), Oct (620)
      const mockMatches = [
        { id: 'm-aug', status: 'finished', match_date: '2026-08-15', daily_total: 500 },
        { id: 'm-sep', status: 'finished', match_date: '2026-09-15', daily_total: 880 },
        { id: 'm-oct', status: 'finished', match_date: '2026-10-15', daily_total: 620 },
      ];

      // Mock expenses: Aug (300 - excluded), Sep (1510), Oct (1360)
      const mockExpenses = [
        { id: 'e-aug', category: 'Campo', amount: 300, expense_date: '2026-08-10', description: 'Agosto' },
        { id: 'e-sep', category: 'Campo', amount: 1510, expense_date: '2026-09-10', description: 'Setembro' },
        { id: 'e-oct', category: 'Campo', amount: 1360, expense_date: '2026-10-10', description: 'Outubro' },
      ];

      setupSupabaseMock({
        payments: mockPayments,
        matches: mockMatches,
        expenses: mockExpenses,
      });

      render(<Financeiro userRole="admin" can={() => true} />);

      await waitFor(() => {
        expect(screen.getAllByText('(Set + Out)').length).toBeGreaterThan(0);
      });

      // Valor Total Mensalistas (Set 720 + Out 780 = 1500) & Diaristas Consolidado (Set 880 + Out 620 = 1500)
      expect(screen.getAllByText('R$ 1500,00').length).toBeGreaterThanOrEqual(2);
      // Soma Total Anual (1500 + 1500 = 3000)
      expect(screen.getByText('R$ 3000,00')).toBeInTheDocument();
      // Despesas Total Anual (Set 1510 + Out 1360 = 2870)
      expect(screen.getByText('R$ 2870,00')).toBeInTheDocument();
      // Valor Líquido Caixa (3000 - 2870 = 130)
      expect(screen.getByText('R$ 130,00')).toBeInTheDocument();
      // Valores do mês corrente (Outubro 2026)
      expect(screen.getByText('R$ 780,00')).toBeInTheDocument();
      expect(screen.getByText('R$ 620,00')).toBeInTheDocument();
      expect(screen.getByText('R$ 1360,00')).toBeInTheDocument();
      expect(screen.getAllByText('R$ 40,00').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('ETAPA 2 — Fluxo de Autorização view_finance e Regras Granulares', () => {
    it('1. view_finance = true para assistente permite consultar dados autorizados sem exibir botões de escrita', async () => {
      const mockCan = vi.fn().mockImplementation((perm: string) => perm === 'view_finance');

      const mockExpenses = [
        { id: 'exp-1', category: 'Goleiro', amount: 100, expense_date: '2026-10-23', description: 'Goleiro 1', created_by_name: 'Assistente 01' }
      ];
      const mockAdjustments = [
        { id: 'adj-1', type: 'add', operation_type: 'entry', amount: 50, description: 'Reforço', adjustment_date: '2026-10-20', previous_balance: 0, new_balance: 50, created_by_name: 'Admin' }
      ];

      setupSupabaseMock({
        expenses: mockExpenses,
        adjustments: mockAdjustments,
      });

      render(<Financeiro userRole="assistant" can={mockCan} />);

      await waitFor(() => {
        expect(screen.getByText('Financeiro')).toBeInTheDocument();
        expect(screen.getByText('Valor Total Anual')).toBeInTheDocument();
      });

      // Botões de ação de escrita NÃO aparecem
      expect(screen.queryByText('ADICIONAR GASTOS')).not.toBeInTheDocument();
      expect(screen.queryByText('AJUSTE FINANCEIRO')).not.toBeInTheDocument();

      // Relatórios são visíveis
      expect(screen.getByText(/ÚLTIMAS DESPESAS DO MÊS/i)).toBeInTheDocument();

      // Expande despesa
      const goleiroElements = screen.getAllByText('Goleiro');
      fireEvent.click(goleiroElements[0]);

      // Botões Editar e Excluir NÃO aparecem
      expect(screen.queryByText('Editar')).not.toBeInTheDocument();
      expect(screen.queryByText('Excluir')).not.toBeInTheDocument();

      // Botão Estornar no ajuste de caixa NÃO aparece
      expect(screen.queryByText('Estornar')).not.toBeInTheDocument();
    });

    it('1b. view_finance = true para tesoureiro permite consultar dados autorizados sem exibir botões de escrita', async () => {
      const mockCan = vi.fn().mockImplementation((perm: string) => perm === 'view_finance');

      const mockExpenses = [
        { id: 'exp-2', category: 'Árbitro', amount: 80, expense_date: '2026-10-23', description: 'Árbitro 1', created_by_name: 'Tesoureiro 01' }
      ];

      setupSupabaseMock({
        expenses: mockExpenses,
      });

      render(<Financeiro userRole="treasurer" can={mockCan} />);

      await waitFor(() => {
        expect(screen.getByText('Financeiro')).toBeInTheDocument();
        expect(screen.getByText('Valor Total Anual')).toBeInTheDocument();
      });

      expect(screen.queryByText('ADICIONAR GASTOS')).not.toBeInTheDocument();
      expect(screen.queryByText('AJUSTE FINANCEIRO')).not.toBeInTheDocument();
    });

    it('2. view_finance = false não concede acesso financeiro (exibe Acesso Restrito)', async () => {
      const mockCan = vi.fn().mockReturnValue(false);

      setupSupabaseMock({});

      render(<Financeiro userRole="assistant" can={mockCan} />);

      await waitFor(() => {
        expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
        expect(screen.getByText(/Você não possui a permissão/i)).toBeInTheDocument();
      });

      // Nenhum card ou botão financeiro é renderizado
      expect(screen.queryByText('Valor Total Anual')).not.toBeInTheDocument();
      expect(screen.queryByText('ADICIONAR GASTOS')).not.toBeInTheDocument();
      expect(screen.queryByText('AJUSTE FINANCEIRO')).not.toBeInTheDocument();
    });

    it('3. manage_finance continua funcionando e permite adicionar e gerenciar despesas', async () => {
      const mockCan = vi.fn().mockImplementation((perm: string) => perm === 'manage_finance');

      const mockExpenses = [
        { id: 'exp-3', category: 'Campo', amount: 1360, expense_date: '2026-10-10', description: 'Aluguel Campo', created_by_name: 'Admin' }
      ];

      setupSupabaseMock({
        expenses: mockExpenses,
      });

      render(<Financeiro userRole="treasurer" can={mockCan} />);

      await waitFor(() => {
        expect(screen.getByText('Financeiro')).toBeInTheDocument();
      });

      // Botão ADICIONAR GASTOS deve estar visível
      expect(screen.getByText('ADICIONAR GASTOS')).toBeInTheDocument();

      // Botão AJUSTE FINANCEIRO (que exige adjust_balance) NÃO deve aparecer
      expect(screen.queryByText('AJUSTE FINANCEIRO')).not.toBeInTheDocument();

      // Ao expandir despesa, botões Editar e Excluir devem estar disponíveis
      const campoElements = screen.getAllByText('Campo');
      fireEvent.click(campoElements[0]);

      expect(screen.getByText('Editar')).toBeInTheDocument();
      expect(screen.getByText('Excluir')).toBeInTheDocument();
    });

    it('4. view_finance isoladamente não permite inserir, editar ou excluir registros', async () => {
      const mockCan = vi.fn().mockImplementation((perm: string) => perm === 'view_finance');

      const mockExpenses = [
        { id: 'exp-4', category: 'Bola', amount: 120, expense_date: '2026-10-15', description: 'Bolas Penalty', created_by_name: 'Admin' }
      ];

      setupSupabaseMock({
        expenses: mockExpenses,
      });

      render(<Financeiro userRole="assistant" can={mockCan} />);

      await waitFor(() => {
        expect(screen.getByText('Financeiro')).toBeInTheDocument();
      });

      // Nenhum gatilho de escrita disponível na interface
      expect(screen.queryByText('ADICIONAR GASTOS')).toBeNull();
      expect(screen.queryByText('AJUSTE FINANCEIRO')).toBeNull();

      const bolaElements = screen.getAllByText('Bola');
      fireEvent.click(bolaElements[0]);

      expect(screen.queryByText('Editar')).toBeNull();
      expect(screen.queryByText('Excluir')).toBeNull();
    });

    it('5. Administrador mantém todas as funcionalidades previstas de consulta e escrita', async () => {
      const mockCan = vi.fn().mockReturnValue(true);

      const mockExpenses = [
        { id: 'exp-5', category: 'Goleiro', amount: 50, expense_date: '2026-10-16', description: 'Goleiro', created_by_name: 'Admin' }
      ];
      const mockAdjustments = [
        { id: 'adj-5', type: 'entry', operation_type: 'entry', amount: 100, description: 'Reforço Caixa', adjustment_date: '2026-10-29', previous_balance: 0, new_balance: 100, created_by_name: 'Admin', scope: 'direct_cash' }
      ];

      setupSupabaseMock({
        expenses: mockExpenses,
        adjustments: mockAdjustments,
      });

      render(<Financeiro userRole="admin" can={mockCan} />);

      await waitFor(() => {
        expect(screen.getByText('Financeiro')).toBeInTheDocument();
      });

      // Ambos os botões de ação principal estão disponíveis
      expect(screen.getByText('ADICIONAR GASTOS')).toBeInTheDocument();
      expect(screen.getByText('AJUSTE FINANCEIRO')).toBeInTheDocument();

      // Despesa possui opções de Editar e Excluir
      const goleiroElements = screen.getAllByText('Goleiro');
      fireEvent.click(goleiroElements[0]);

      expect(screen.getByText('Editar')).toBeInTheDocument();
      expect(screen.getByText('Excluir')).toBeInTheDocument();

      // Ajuste possui botão Estornar após expansão
      const ajusteRow = screen.getByText('Entrada extra no caixa');
      fireEvent.click(ajusteRow);
      expect(screen.getByText('Estornar')).toBeInTheDocument();
    });
  });

  describe('ETAPA 3 — Matriz Completa de Permissões para Tesoureiro em Configurações', () => {
    it('deve exibir a matriz com as 16 permissões no accordion de Permissões do Tesoureiro', async () => {
      const mockTreasurers = [
        { id: 'tr-1', name: 'Tesoureiro Geral', role: 'treasurer', created_at: '2026-10-01' }
      ];

      setupSupabaseMock({
        treasurers: mockTreasurers,
        treasurerPerms: [{ profile_id: 'tr-1', view_finance: true, manage_finance: false }],
      });

      render(
        <Configuracoes
          userRole="admin"
          can={() => true}
          assistantPermissions={{
            create_match: false, edit_match: false, insert_stats: false,
            edit_players: false, delete_players: false, manage_finance: false,
            manage_expenses: false, create_notices: false, edit_notices: false,
            delete_notices: false, import_history: false,
          }}
          setAssistantPermissions={vi.fn()}
          appLogoUrl={null}
          setAppLogoUrl={vi.fn()}
        />
      );

      // Open Treasurer Permissions accordion
      await waitFor(() => {
        expect(screen.getByText(/Permissões do Tesoureiro/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Permissões do Tesoureiro/i));

      // Check full matrix options
      await waitFor(() => {
        expect(screen.getByText('Visualizar Financeiro (somente leitura)')).toBeInTheDocument();
        expect(screen.getByText('Gerenciar Financeiro')).toBeInTheDocument();
        expect(screen.getByText('Ajustar Saldo Acumulado')).toBeInTheDocument();
        expect(screen.getByText('Gerenciar Mensalidades')).toBeInTheDocument();
        expect(screen.getByText('Adicionar Despesas')).toBeInTheDocument();
        expect(screen.getByText('Editar Despesas')).toBeInTheDocument();
        expect(screen.getByText('Excluir Despesas')).toBeInTheDocument();
        expect(screen.getByText('Criar Partidas')).toBeInTheDocument();
        expect(screen.getByText('Editar/Excluir Partidas')).toBeInTheDocument();
        expect(screen.getByText('Lançar/Editar Estatísticas')).toBeInTheDocument();
        expect(screen.getByText('Editar Jogadores')).toBeInTheDocument();
        expect(screen.getByText('Excluir Jogadores')).toBeInTheDocument();
        expect(screen.getByText('Criar Avisos')).toBeInTheDocument();
        expect(screen.getByText('Editar Avisos')).toBeInTheDocument();
        expect(screen.getByText('Excluir Avisos')).toBeInTheDocument();
        expect(screen.getByText('Importar Histórico')).toBeInTheDocument();
      });
    });

    it('deve disponibilizar botão no accordion do Tesoureiro e abrir o modal completo', async () => {
      const mockTreasurers = [
        { id: 'tr-1', name: 'Tesoureiro Geral', role: 'treasurer', created_at: '2026-10-01' }
      ];

      setupSupabaseMock({
        treasurers: mockTreasurers,
        treasurerPerms: [{ profile_id: 'tr-1', view_finance: true, manage_finance: true }],
      });

      render(
        <Configuracoes
          userRole="admin"
          can={() => true}
          assistantPermissions={{
            create_match: false, edit_match: false, insert_stats: false,
            edit_players: false, delete_players: false, manage_finance: false,
            manage_expenses: false, create_notices: false, edit_notices: false,
            delete_notices: false, import_history: false,
          }}
          setAssistantPermissions={vi.fn()}
          appLogoUrl={null}
          setAppLogoUrl={vi.fn()}
        />
      );

      // Open Treasurer Permissions accordion
      await waitFor(() => {
        expect(screen.getByText(/Permissões do Tesoureiro/i)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText(/Permissões do Tesoureiro/i));

      // Click "Abrir Modal Completo" button
      await waitFor(() => {
        expect(screen.getByText('Abrir Modal Completo')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Abrir Modal Completo'));

      // Modal should open with Tesoureiro badge
      await waitFor(() => {
        expect(screen.getByText('Tesoureiro')).toBeInTheDocument();
        expect(screen.getByText('Salvar Permissões')).toBeInTheDocument();
      });
    });
  });
});
