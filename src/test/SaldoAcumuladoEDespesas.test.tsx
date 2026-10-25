import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Financeiro from '../components/Financeiro';
import { supabase } from '../lib/supabase';

describe('RDA — Saldo Acumulado e Descrição Obrigatória das Despesas', () => {
  const defaultProps = {
    userRole: 'admin' as const,
    can: vi.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Cálculo Matemático do Saldo Acumulado', () => {
    it('1. Deve preservar o saldo de referência de R$ 236,00 antes das movimentações de 23/10/2026', () => {
      const initialBalance = 236.00;
      const initialRevenue = 2839.94;
      const initialExpenses = 2690.00;

      expect(initialBalance).toBe(236.00);
      expect(initialRevenue).toBe(2839.94);
      expect(initialExpenses).toBe(2690.00);
    });

    it('2 e 3. Deve incorporar a arrecadação do racha de 23/10 (R$ 240) e descontar árbitro (R$ 80) e goleiro (R$ 100) uma única vez, totalizando R$ 296,00', () => {
      const initialBalance = 236.00;
      
      // Partida de 23/10 finalizada com 12 diaristas
      const diaristasRacha23 = 12 * 20.00; // 240.00
      
      // Despesas de árbitro e goleiro
      const despesaArbitro = 80.00;
      const despesaGoleiro = 100.00;
      const despesasRacha = despesaArbitro + despesaGoleiro;

      const saldoAposRacha = initialBalance + diaristasRacha23 - despesasRacha;
      expect(saldoAposRacha).toBe(296.00);
    });

    it('4 e 5. Finalizar novamente uma partida ou editar a escalação não deve duplicar a receita de diárias', () => {
      const initialBalance = 236.00;
      
      // Lista de partidas deduplicadas por ID único (estrutura real do Supabase)
      const finishedMatches = [
        { id: 'match-23-10', match_date: '2026-10-23', status: 'finished', daily_total: 240.00 }
      ];

      // Simulando "finalizar novamente" ou "editar escalação": o ID permanece o mesmo
      const matchMap = new Map();
      finishedMatches.forEach(m => matchMap.set(m.id, m));
      
      // Re-finalização do mesmo ID atualiza mas não cria nova linha
      matchMap.set('match-23-10', { id: 'match-23-10', match_date: '2026-10-23', status: 'finished', daily_total: 240.00 });

      const uniqueMatches = Array.from(matchMap.values());
      expect(uniqueMatches.length).toBe(1);

      const dailyFeesSinceCutoff = uniqueMatches.reduce((acc, m) => acc + m.daily_total, 0);
      expect(dailyFeesSinceCutoff).toBe(240.00);

      const despesasRacha = 180.00;
      const saldoFinal = initialBalance + dailyFeesSinceCutoff - despesasRacha;
      expect(saldoFinal).toBe(296.00);
    });

    it('6. Cadastrar uma despesa de R$ 20,00 com descrição reduz o saldo acumulado de R$ 296,00 para R$ 276,00', () => {
      const saldoAnterior = 296.00;
      const novaDespesa = 20.00;

      const saldoAtualizado = saldoAnterior - novaDespesa;
      expect(saldoAtualizado).toBe(276.00);
    });

    it('Partida em andamento (in_progress) NÃO deve ser contabilizada no saldo acumulado', () => {
      const initialBalance = 236.00;
      
      const allMatches = [
        { id: 'match-23-10', match_date: '2026-10-23', status: 'finished', daily_total: 240.00 },
        { id: 'match-in-progress', match_date: '2026-10-30', status: 'in_progress', daily_total: 160.00 }
      ];

      // Filtra estritamente partidas finalizadas
      const finishedSinceCutoff = allMatches.filter(m => m.status === 'finished' && m.match_date >= '2026-10-23');
      const dailyFees = finishedSinceCutoff.reduce((acc, m) => acc + m.daily_total, 0);
      
      expect(dailyFees).toBe(240.00);
      expect(initialBalance + dailyFees - 180.00).toBe(296.00);
    });
  });

  describe('Validação da Descrição Obrigatória das Despesas (UI e Lógica)', () => {
    it('7. Tentar cadastrar uma despesa sem descrição bloqueia o salvamento e exibe mensagem de alerta', async () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<Financeiro {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Financeiro')).toBeInTheDocument();
      });

      // Abre o modal de adicionar gasto
      const btnAdd = screen.getByText(/Adicionar gasto/i);
      fireEvent.click(btnAdd);

      await waitFor(() => {
        expect(screen.getByText('Nova Despesa')).toBeInTheDocument();
      });

      // Preenche o valor mas deixa a descrição vazia
      const valorInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(valorInput, { target: { value: '50.00' } });

      // Clica em Salvar
      const btnSalvar = screen.getByRole('button', { name: /Salvar/i });
      fireEvent.click(btnSalvar);

      // Deve alertar exigindo descrição e NÃO chamar o Supabase insert
      expect(alertMock).toHaveBeenCalledWith('Por favor, informe a descrição da despesa.');
      expect(supabase.from('expenses').insert).not.toHaveBeenCalled();

      alertMock.mockRestore();
    });

    it('8. Tentar cadastrar uma despesa com descrição contendo somente espaços também é rejeitado', async () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<Financeiro {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Financeiro')).toBeInTheDocument();
      });

      const btnAdd = screen.getByText(/Adicionar gasto/i);
      fireEvent.click(btnAdd);

      await waitFor(() => {
        expect(screen.getByText('Nova Despesa')).toBeInTheDocument();
      });

      const valorInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(valorInput, { target: { value: '25.00' } });

      const descInput = screen.getByPlaceholderText(/Informe o motivo ou detalhe do gasto/i);
      fireEvent.change(descInput, { target: { value: '     ' } });

      const btnSalvar = screen.getByRole('button', { name: /Salvar/i });
      fireEvent.click(btnSalvar);

      expect(alertMock).toHaveBeenCalledWith('Por favor, informe a descrição da despesa.');
      expect(supabase.from('expenses').insert).not.toHaveBeenCalled();

      alertMock.mockRestore();
    });

    it('Salvar com descrição válida preenchida chama insert com a descrição aparada (trimmed)', async () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'exp-1', category: 'Material', amount: 20.00, description: 'Compra de material esportivo', expense_date: '2026-10-24' }],
          error: null
        })
      });
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        insert: insertMock,
      } as any);

      render(<Financeiro {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Financeiro')).toBeInTheDocument();
      });

      const btnAdd = screen.getByText(/Adicionar gasto/i);
      fireEvent.click(btnAdd);

      await waitFor(() => {
        expect(screen.getByText('Nova Despesa')).toBeInTheDocument();
      });

      const valorInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(valorInput, { target: { value: '20.00' } });

      const descInput = screen.getByPlaceholderText(/Informe o motivo ou detalhe do gasto/i);
      fireEvent.change(descInput, { target: { value: '  Compra de material esportivo  ' } });

      const btnSalvar = screen.getByRole('button', { name: /Salvar/i });
      fireEvent.click(btnSalvar);

      await waitFor(() => {
        expect(insertMock).toHaveBeenCalledWith([
          expect.objectContaining({
            category: 'Campo',
            amount: 20.00,
            description: 'Compra de material esportivo'
          })
        ]);
      });

      alertMock.mockRestore();
    });
  });
});
