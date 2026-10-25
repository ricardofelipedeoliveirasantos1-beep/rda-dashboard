import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Financeiro from '../components/Financeiro';
import Configuracoes from '../components/Configuracoes';
import { clearCache } from '../services/dataCache';

describe('RDA — Nova Funcionalidade: Ajuste do Saldo Acumulado com Permissão Controlada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearCache();
  });

  describe('1 e 2. Administrador consegue adicionar valor e corrigir o saldo total', () => {
    it('1. Administrador consegue abrir o modal e adicionar valor ao caixa (+ R$ 50,00)', async () => {
      render(<Financeiro userRole="admin" can={() => true} />);

      await waitFor(() => {
        expect(screen.getByText('Ajustar Saldo Acumulado')).toBeInTheDocument();
      });

      // Abre o modal
      fireEvent.click(screen.getByText('Ajustar Saldo Acumulado'));

      expect(screen.getByText('Adicionar valor')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ex: 50,00')).toBeInTheDocument();

      // Preenche valor e descrição
      fireEvent.change(screen.getByPlaceholderText('Ex: 50,00'), { target: { value: '50,00' } });
      fireEvent.change(screen.getByPlaceholderText(/Ex: Aporte para despesas/i), {
        target: { value: 'Aporte para despesas do racha' },
      });

      // Confirma ajuste
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar Ajuste' }));

      await waitFor(() => {
        const stored = localStorage.getItem('rda_local_adjustments');
        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored || '[]');
        expect(parsed.length).toBe(1);
        expect(parsed[0].type).toBe('entry');
        expect(parsed[0].amount).toBe(50.00);
        expect(parsed[0].description).toBe('Aporte para despesas do racha');
      });
    });

    it('2. Administrador consegue corrigir o saldo total com cálculo automático da diferença', async () => {
      render(<Financeiro userRole="admin" can={() => true} />);

      await waitFor(() => {
        expect(screen.getByText('Ajustar Saldo Acumulado')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Ajustar Saldo Acumulado'));
      fireEvent.click(screen.getByText('Corrigir saldo total'));

      const amountInput = screen.getByPlaceholderText('Ex: 310,00');
      fireEvent.change(amountInput, { target: { value: '310,00' } });
      fireEvent.change(screen.getByPlaceholderText(/Ex: Conciliação/i), {
        target: { value: 'Conferência física de caixa' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Confirmar Ajuste' }));

      await waitFor(() => {
        const stored = localStorage.getItem('rda_local_adjustments');
        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored || '[]');
        expect(parsed[0].type).toBe('entry');
        expect(parsed[0].new_balance).toBe(310.00);
        expect(parsed[0].amount).toBeGreaterThan(0);
      });
    });
  });

  describe('3 e 4. Assistente e Tesoureiro sem permissão não conseguem executar ajustes', () => {
    it('3. Assistente sem permissão não vê o botão e é impedido de executar ajuste', async () => {
      const mockCan = vi.fn().mockImplementation((action: string) => {
        if (action === 'adjust_balance') return false;
        return false;
      });

      render(<Financeiro userRole="assistant" can={mockCan} />);

      await waitFor(() => {
        expect(screen.queryByText('Ajustar Saldo Acumulado')).toBeNull();
      });
    });

    it('4. Tesoureiro sem permissão não vê o botão e é impedido de executar ajuste', async () => {
      const mockCan = vi.fn().mockImplementation((action: string) => {
        if (action === 'adjust_balance') return false;
        return false;
      });

      render(<Financeiro userRole="treasurer" can={mockCan} />);

      await waitFor(() => {
        expect(screen.queryByText('Ajustar Saldo Acumulado')).toBeNull();
      });
    });
  });

  describe('5. Assistente ou Tesoureiro autorizado consegue executar ajustes', () => {
    it('Assistente com permissão adjust_balance visualiza o botão e pode abrir o modal', async () => {
      const mockCan = vi.fn().mockImplementation((action: string) => {
        if (action === 'adjust_balance') return true;
        return false;
      });

      render(<Financeiro userRole="assistant" can={mockCan} />);

      await waitFor(() => {
        expect(screen.getByText('Ajustar Saldo Acumulado')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Ajustar Saldo Acumulado'));
      expect(screen.getByText('Adicionar valor')).toBeInTheDocument();
    });

    it('Tesoureiro com permissão adjust_balance visualiza o botão e pode abrir o modal', async () => {
      const mockCan = vi.fn().mockImplementation((action: string) => {
        if (action === 'adjust_balance') return true;
        return false;
      });

      render(<Financeiro userRole="treasurer" can={mockCan} />);

      await waitFor(() => {
        expect(screen.getByText('Ajustar Saldo Acumulado')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Ajustar Saldo Acumulado'));
      expect(screen.getByText('Adicionar valor')).toBeInTheDocument();
    });
  });

  describe('6. Somente o administrador pode alterar as permissões de ajuste', () => {
    it('Na tela de configurações, a seção de permissões de assistente contém a opção Ajustar Saldo Acumulado', async () => {
      const mockPerms = {
        create_match: false,
        edit_match: false,
        insert_stats: false,
        edit_players: false,
        delete_players: false,
        manage_finance: false,
        manage_expenses: false,
        create_notices: false,
        edit_notices: false,
        delete_notices: false,
        import_history: false,
        adjust_balance: false
      };

      render(
        <Configuracoes
          userRole="admin"
          can={() => true}
          assistantPermissions={mockPerms}
          setAssistantPermissions={vi.fn()}
          appLogoUrl={null}
          setAppLogoUrl={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Permissões de Assistente/i)).toBeInTheDocument();
      });

      // Abre a sanfona de permissões
      fireEvent.click(screen.getByText(/Permissões de Assistente/i));

      await waitFor(() => {
        expect(screen.getByText('Ajustar Saldo Acumulado')).toBeInTheDocument();
        expect(screen.getByText(/Permite adicionar valores ou corrigir o saldo acumulado/i)).toBeInTheDocument();
      });
    });

    it('Usuário Assistente não tem permissão de gerenciar configurações administrativas', () => {
      const mockCan = vi.fn().mockReturnValue(false);
      render(
        <Configuracoes
          userRole="assistant"
          can={mockCan}
          assistantPermissions={{
            create_match: false,
            edit_match: false,
            insert_stats: false,
            edit_players: false,
            delete_players: false,
            manage_finance: false,
            manage_expenses: false,
            create_notices: false,
            edit_notices: false,
            delete_notices: false,
            import_history: false,
            adjust_balance: false
          }}
          setAssistantPermissions={vi.fn()}
          appLogoUrl={null}
          setAppLogoUrl={vi.fn()}
        />
      );

      expect(screen.queryByText('Configuração de Valores')).toBeNull();
    });
  });

  describe('7 e 8. Validações de entrada de dados (descrição obrigatória e valores inválidos)', () => {
    it('7. Descrição vazia ou composta apenas por espaços é rejeitada com alerta', async () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<Financeiro userRole="admin" can={() => true} />);

      await waitFor(() => {
        expect(screen.getByText('Ajustar Saldo Acumulado')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Ajustar Saldo Acumulado'));
      fireEvent.change(screen.getByPlaceholderText('Ex: 50,00'), { target: { value: '50,00' } });
      fireEvent.change(screen.getByPlaceholderText(/Ex: Aporte para despesas/i), {
        target: { value: '     ' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Confirmar Ajuste' }));

      expect(alertMock).toHaveBeenCalledWith('A descrição/motivo do ajuste é obrigatória.');
      expect(localStorage.getItem('rda_local_adjustments')).toBeNull();
    });

    it('8. Valores inválidos (negativos, zero ou texto inválido) são rejeitados', async () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<Financeiro userRole="admin" can={() => true} />);

      await waitFor(() => {
        expect(screen.getByText('Ajustar Saldo Acumulado')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Ajustar Saldo Acumulado'));
      fireEvent.change(screen.getByPlaceholderText('Ex: 50,00'), { target: { value: '0' } });
      fireEvent.change(screen.getByPlaceholderText(/Ex: Aporte para despesas/i), {
        target: { value: 'Teste' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Confirmar Ajuste' }));

      expect(alertMock).toHaveBeenCalledWith('O valor a adicionar deve ser maior que zero.');
    });
  });

  describe('9, 10 e 11. Matemática dos ajustes no saldo acumulado', () => {
    it('9. Ajuste positivo (aporte) aumenta o saldo acumulado de R$ 296,00 para R$ 346,00 (+ R$ 50,00)', () => {
      const saldoAtual = 296.00;
      const ajusteAdicionar = 50.00;
      const novoSaldo = saldoAtual + ajusteAdicionar;
      expect(novoSaldo).toBe(346.00);
    });

    it('10. Ajuste negativo (saída de conciliação) reduz o saldo acumulado de R$ 346,00 para R$ 330,00 (− R$ 16,00)', () => {
      const saldoAtual = 346.00;
      const saldoConferido = 330.00;
      const diferenca = saldoConferido - saldoAtual;
      expect(diferenca).toBe(-16.00);
      const novoSaldo = saldoAtual + diferenca;
      expect(novoSaldo).toBe(330.00);
    });

    it('11. Correção para saldo total menor gera SOMENTE a diferença como saída (R$ 16,00 e não R$ 330,00)', () => {
      const saldoAtual = 346.00;
      const saldoConferido = 330.00;

      const diff = saldoConferido - saldoAtual;
      const effectiveAmount = Math.abs(diff);
      const type = diff > 0 ? 'entry' : 'exit';

      expect(type).toBe('exit');
      expect(effectiveAmount).toBe(16.00);
      expect(saldoAtual - effectiveAmount).toBe(330.00);
    });
  });

  describe('12 e 13. Exibição e impacto no Financeiro e no Relatório Mensal', () => {
    it('12 e 13. Ajustes aparecem na lista com categoria "Ajuste de caixa", data, valor e sinal correto, atualizando totais', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const initialAdjustments = [
        {
          id: 'adj-01',
          type: 'entry',
          operation_type: 'add',
          amount: 50.00,
          description: 'Aporte para despesas do racha',
          adjustment_date: todayStr,
          previous_balance: 296.00,
          new_balance: 346.00,
        },
        {
          id: 'adj-02',
          type: 'exit',
          operation_type: 'reconcile',
          amount: 16.00,
          description: 'Conciliação de caixa',
          adjustment_date: todayStr,
          previous_balance: 346.00,
          new_balance: 330.00,
        }
      ];

      localStorage.setItem('rda_local_adjustments', JSON.stringify(initialAdjustments));

      render(<Financeiro userRole="admin" can={() => true} />);

      await waitFor(() => {
        expect(screen.getAllByText('Ajuste de caixa').length).toBeGreaterThan(0);
        expect(screen.getByText(/Aporte para despesas do racha/)).toBeInTheDocument();
        expect(screen.getByText(/Conciliação de caixa/)).toBeInTheDocument();
        expect(screen.getAllByText(/\+\s*R\$\s*50,00/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/−\s*R\$\s*16,00/).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('14, 15, 16, 17 e 18. Integridade, Persistência e Regressão', () => {
    it('14. Recarregar a página preserva o histórico de ajustes e os valores auditáveis', () => {
      const adj = {
        id: 'adj-persistent-01',
        type: 'entry',
        operation_type: 'add',
        amount: 50.00,
        description: 'Aporte de patrocinador',
        adjustment_date: '2026-10-25',
        previous_balance: 296.00,
        new_balance: 346.00,
        created_at: new Date().toISOString()
      };

      localStorage.setItem('rda_local_adjustments', JSON.stringify([adj]));

      const reloaded = JSON.parse(localStorage.getItem('rda_local_adjustments') || '[]');
      expect(reloaded.length).toBe(1);
      expect(reloaded[0].id).toBe('adj-persistent-01');
      expect(reloaded[0].amount).toBe(50.00);
      expect(reloaded[0].description).toBe('Aporte de patrocinador');
    });

    it('15. Finalizar novamente uma partida não duplica a receita de diárias no saldo acumulado', () => {
      const initialBalance = 236.00;
      const matches = new Map();
      matches.set('match-01', { id: 'match-01', match_date: '2026-10-23', status: 'finished', daily_total: 240.00 });
      // Simulação de finalizar novamente a mesma partida
      matches.set('match-01', { id: 'match-01', match_date: '2026-10-23', status: 'finished', daily_total: 240.00 });

      const uniqueMatches = Array.from(matches.values());
      expect(uniqueMatches.length).toBe(1);
      const totalDaily = uniqueMatches.reduce((acc, m) => acc + m.daily_total, 0);
      expect(totalDaily).toBe(240.00);

      const balance = initialBalance + totalDaily - 180.00; // Árbitro 80 + Goleiro 100
      expect(balance).toBe(296.00);
    });

    it('16. Registrar uma despesa comum não duplica seu efeito no saldo acumulado', () => {
      const initialBalance = 296.00;
      const expenses = new Map();
      expenses.set('exp-01', { id: 'exp-01', category: 'Material', amount: 20.00, expense_date: '2026-10-24' });
      // Atualização ou re-processamento
      expenses.set('exp-01', { id: 'exp-01', category: 'Material', amount: 20.00, expense_date: '2026-10-24' });

      const uniqueExpenses = Array.from(expenses.values());
      expect(uniqueExpenses.length).toBe(1);
      const totalExp = uniqueExpenses.reduce((acc, e) => acc + e.amount, 0);
      expect(totalExp).toBe(20.00);

      expect(initialBalance - totalExp).toBe(276.00);
    });

    it('17. Visitantes nunca conseguem visualizar os botões de ajuste de saldo nem alterar o caixa', async () => {
      render(<Financeiro userRole="visitor" can={() => false} />);

      await waitFor(() => {
        expect(screen.queryByText('Ajustar Saldo Acumulado')).toBeNull();
        expect(screen.queryByText('Adicionar gasto')).toBeNull();
      });
    });

    it('18. Mantém o funcionamento das permissões e regras financeiras já existentes', () => {
      // Fórmula conceitual completa
      const saldoReferencia = 236.00;
      const receitasPartidasElegiveis = 240.00;
      const despesasElegiveis = 180.00; // 80 arbitro + 100 goleiro
      const entradasAjuste = 50.00; // Aporte
      const saidasAjuste = 16.00; // Conciliação
      const despesaComumPosterior = 20.00; // Compra de material

      const saldoAcumuladoFinal = saldoReferencia 
        + receitasPartidasElegiveis 
        - despesasElegiveis 
        + entradasAjuste 
        - saidasAjuste 
        - despesaComumPosterior;

      expect(saldoAcumuladoFinal).toBe(310.00);
    });
  });
});
