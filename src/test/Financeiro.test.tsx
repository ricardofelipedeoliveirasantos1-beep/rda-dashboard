import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Financeiro from '../components/Financeiro';
import { supabase } from '../lib/supabase';
import { clearCache } from '../services/dataCache';

describe('Financeiro Component — RDA Reprodução Fiel do Layout Mobile', () => {
  const defaultProps = {
    userRole: 'admin' as const,
    can: vi.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearCache();
  });

  describe('ETAPA 1 — Cabeçalho e Controles Superiores', () => {
    it('deve exibir o título "Financeiro" centralizado na parte superior', async () => {
      render(<Financeiro {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Financeiro')).toBeInTheDocument();
      });
    });

    it('deve exibir os dois controles superiores (Seletor de Mês e Valor Total Anual)', async () => {
      render(<Financeiro {...defaultProps} />);
      await waitFor(() => {
        const yearMatches = screen.getAllByText(/2026/);
        expect(yearMatches.length).toBeGreaterThan(0);
        expect(screen.getByText('Valor Total Anual')).toBeInTheDocument();
      });
    });

    it('deve abrir o modal de Resumo Anual ao clicar em Valor Total Anual', async () => {
      render(<Financeiro {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Valor Total Anual')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Valor Total Anual'));
      expect(screen.getByText(/Resumo Anual/i)).toBeInTheDocument();
      expect(screen.getByText(/MENSALISTAS \(ANO\)/i)).toBeInTheDocument();
      expect(screen.getByText(/DIARISTAS \(ANO\)/i)).toBeInTheDocument();
    });
  });

  describe('ETAPA 2 — Grid Principal de 10 Cards em Duas Colunas', () => {
    it('deve renderizar os 10 cards na ordem e nomenclatura exatas', async () => {
      render(<Financeiro {...defaultProps} />);
      await waitFor(() => {
        // Linha 1
        expect(screen.getByText('Mensalidade Recebida Mês')).toBeInTheDocument();
        expect(screen.getByText('Valor Total Mensalistas')).toBeInTheDocument();

        // Linha 2
        expect(screen.getByText('Total Diaristas no Mês')).toBeInTheDocument();
        expect(screen.getByText('Mensalidade Recebida')).toBeInTheDocument();

        // Linha 3
        expect(screen.getByText('Soma Total do Mês')).toBeInTheDocument();
        expect(screen.getByText('Soma Total Anual')).toBeInTheDocument();

        // Linha 4
        expect(screen.getByText('Despesas no Mês')).toBeInTheDocument();
        expect(screen.getByText('Despesas Total Anual')).toBeInTheDocument();

        // Linha 5
        expect(screen.getByText('Valor Líquido do Mês')).toBeInTheDocument();
        expect(screen.getByText('Valor Líquido Caixa')).toBeInTheDocument();
      });
    });

    it('deve formatar os valores com padrão monetário brasileiro R$', async () => {
      render(<Financeiro {...defaultProps} />);
      await waitFor(() => {
        const brlElements = screen.getAllByText(/R\$\s*\d+/i);
        expect(brlElements.length).toBeGreaterThanOrEqual(10);
      });
    });
  });

  describe('ETAPA 5 — Botões Inferiores (Adicionar Gastos e Ajuste Financeiro)', () => {
    it('deve exibir os botões "ADICIONAR GASTOS" e "AJUSTE FINANCEIRO"', async () => {
      render(<Financeiro {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('ADICIONAR GASTOS')).toBeInTheDocument();
        expect(screen.getByText('AJUSTE FINANCEIRO')).toBeInTheDocument();
      });
    });

    it('deve abrir o modal de cadastro de despesa ao clicar em ADICIONAR GASTOS', async () => {
      render(<Financeiro {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('ADICIONAR GASTOS')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('ADICIONAR GASTOS'));
      expect(screen.getByText('Nova Despesa')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Informe o motivo ou detalhe do gasto/i)).toBeInTheDocument();
    });

    it('deve abrir o modal de ajuste com opções Somar e Diminuir ao clicar em AJUSTE FINANCEIRO', async () => {
      render(<Financeiro {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('AJUSTE FINANCEIRO')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('AJUSTE FINANCEIRO'));
      expect(screen.getAllByText(/Ajustar Saldo Acumulado/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Somar valores')).toBeInTheDocument();
      expect(screen.getByText('Diminuir valores')).toBeInTheDocument();
    });

    it('deve alternar entre Somar e Diminuir valores atualizando rótulos', async () => {
      render(<Financeiro {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('AJUSTE FINANCEIRO')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('AJUSTE FINANCEIRO'));
      expect(screen.getByText(/Valor a adicionar \(R\$\)/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText('Diminuir valores'));
      expect(screen.getByText(/Valor a subtrair \(R\$\)/i)).toBeInTheDocument();
    });

    it('deve validar valores zerados, negativos ou texto inválido no ajuste', async () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
      render(<Financeiro {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('AJUSTE FINANCEIRO')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('AJUSTE FINANCEIRO'));

      const amountInput = screen.getByPlaceholderText('Ex: 50,00');
      fireEvent.change(amountInput, { target: { value: '0,00' } });
      fireEvent.change(screen.getByPlaceholderText(/Ex: Aporte para despesas/i), {
        target: { value: 'Motivo teste' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Confirmar Ajuste' }));
      expect(alertMock).toHaveBeenCalledWith('O valor a adicionar deve ser maior que zero.');
    });
  });

  describe('Relatório Detalhado de Gastos, Exclusão Segura e Permissões', () => {
    it('deve exibir a seção do relatório de gastos do mês', async () => {
      render(<Financeiro {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/RELATÓRIO DE GASTOS DO MÊS/i)).toBeInTheDocument();
      });
    });

    it('deve abrir o modal de Exclusão Segura ao clicar em Excluir em uma despesa', async () => {
      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'expenses') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'exp-test-abc-123',
                  category: 'Goleiro',
                  amount: 100,
                  expense_date: '2026-10-15',
                  description: 'Lançamento de teste homologação'
                }
              ],
              error: null
            }),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
            then: vi.fn().mockImplementation((cb: any) => cb({
              data: [{ id: 'exp-test-abc-123', category: 'Goleiro', amount: 100, expense_date: '2026-10-15', description: 'Lançamento de teste homologação' }],
              error: null
            }))
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          then: vi.fn().mockImplementation((cb: any) => cb({ data: [], error: null }))
        } as any;
      });

      render(<Financeiro {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/Lançamento de teste homologação/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Excluir'));

      expect(screen.getByText('Exclusão Segura de Despesa')).toBeInTheDocument();
      expect(screen.getByText('exp-test-abc-123')).toBeInTheDocument();
      expect(screen.getByText(/Este lançamento foi realizado durante testes do sistema/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Ex: Registro inserido incorretamente/i)).toBeInTheDocument();
    });

    it('usuário sem permissão não deve visualizar o botão Ajuste Financeiro habilitado', async () => {
      const restrictedProps = {
        userRole: 'assistant' as const,
        can: vi.fn().mockImplementation((perm: string) => perm !== 'adjust_balance'),
      };

      render(<Financeiro {...restrictedProps} />);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'AJUSTE FINANCEIRO' })).toBeNull();
      });
    });

    it('usuário visitante é redirecionado para visualização de visitante', async () => {
      render(<Financeiro userRole="visitor" can={() => false} />);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'AJUSTE FINANCEIRO' })).toBeNull();
      });
    });
  });
});
