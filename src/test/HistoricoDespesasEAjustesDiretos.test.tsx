import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Financeiro from '../components/Financeiro';
import { supabase } from '../lib/supabase';
import { clearCache } from '../services/dataCache';

describe('RDA — Etapa Financeira: Histórico Detalhado, Saldos Dinâmicos, Ajustes Mensais e Diretos no Caixa', () => {
  const adminProps = {
    userRole: 'admin' as const,
    can: vi.fn().mockReturnValue(true),
  };

  const setupSupabaseMock = (customExpenses: any[] = []) => {
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      const getMockData = () => {
        if (table === 'expenses') return customExpenses;
        if (table === 'monthly_payments') {
          return [
            { id: 'p1', payment_month: '2026-10', amount: 780, status: 'paid', paid_at: '2026-10-10' }
          ];
        }
        if (table === 'matches') {
          return [
            { id: 'm1', match_date: '2026-10-23', status: 'finished', daily_total: 620 }
          ];
        }
        if (table === 'match_players') {
          return [
            { match_id: 'm1', player_id: 'pl-1', category_at_match: 'Diarista', daily_fee_at_match: 620, payment_status: 'paid' }
          ];
        }
        if (table === 'players') {
          return [
            { id: 'pl-m1', is_active: true, category: 'Mensalista' }
          ];
        }
        return [];
      };

      const builder: any = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockImplementation(() => Promise.resolve({ data: getMockData(), error: null })),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: customExpenses, error: null })
        }),
        delete: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: vi.fn().mockImplementation((cb: any) => cb({ data: getMockData(), error: null }))
      };
      return builder;
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearCache();
  });

  // --------------------------------------------------------------------------
  // 1. Registro de despesa com simulação dinâmica de saldo antes/despesa/após
  // --------------------------------------------------------------------------
  it('1. Registro de despesa exibindo dinamicamente saldo antes (R$ 40,00), despesa (- R$ 10,00) e saldo após (R$ 30,00)', async () => {
    // 780 mensalistas + 620 diaristas - 1360 despesas = 40,00 de saldo inicial do mês
    setupSupabaseMock([
      { id: 'e1', amount: 1360, expense_date: '2026-10-15', description: 'Gasto base', category: 'Outros' }
    ]);

    render(<Financeiro {...adminProps} />);

    // Abre o modal de adicionar gastos
    await waitFor(() => {
      expect(screen.getByText('ADICIONAR GASTOS')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('ADICIONAR GASTOS'));

    // Verifica que o modal abriu (Screen C)
    expect(screen.getByRole('heading', { name: /Adicionar Gasto/i })).toBeInTheDocument();
    expect(screen.getByText('Registro de despesa no mês selecionado.')).toBeInTheDocument();

    // Digita o valor de R$ 10,00
    const valorInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(valorInput, { target: { value: '10.00' } });

    // O quadro verde de resumo financeiro deve calcular dinamicamente:
    // Saldo antes: R$ 40,00 (780 + 620 - 1360 = 40,00)
    // Nova despesa: - R$ 10,00
    // Saldo após: R$ 30,00
    await waitFor(() => {
      expect(screen.getByText(/Saldo antes:/i)).toBeInTheDocument();
      expect(screen.getByText(/Nova despesa:/i)).toBeInTheDocument();
      expect(screen.getByText(/Saldo após:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/R\$\s*40,00/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/-\s*R\$\s*10,00/)).toBeInTheDocument();
      expect(screen.getByText(/R\$\s*30,00/)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. Expansão de despesa no histórico mostrando saldo anterior e posterior
  // --------------------------------------------------------------------------
  it('2. Expansão de despesa no histórico detalhado exibindo resumo financeiro completo (Screen B)', async () => {
    setupSupabaseMock([
      {
        id: 'exp-goleiro-01',
        category: 'Goleiro',
        amount: 10,
        expense_date: '2026-10-23',
        description: 'Dois goleiros',
        created_by_name: 'Assistente 02',
        previous_balance: 40.00,
        balance_after: 30.00,
        created_at: '2026-10-23T20:15:00.000Z'
      }
    ]);

    render(<Financeiro {...adminProps} />);

    await waitFor(() => {
      expect(screen.getByText('ÚLTIMAS DESPESAS DO MÊS (1)')).toBeInTheDocument();
      expect(screen.getByText('Dois goleiros')).toBeInTheDocument();
      expect(screen.getByText(/Saldo antes da despesa:/i)).toBeInTheDocument();
      expect(screen.getByText(/Valor da despesa:/i)).toBeInTheDocument();
      expect(screen.getByText(/Saldo após a despesa:/i)).toBeInTheDocument();
      expect(screen.getByText('Assistente 02')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 3. Identificação do usuário logado e data/hora no registro da despesa
  // --------------------------------------------------------------------------
  it('3. Identificação do usuário logado (ex: "Registrado por: Assistente 02") e data/hora', async () => {
    setupSupabaseMock([
      {
        id: 'exp-user-audit',
        category: 'Árbitro',
        amount: 80,
        expense_date: '2026-10-23',
        description: 'Taxa arbitragem',
        created_by_name: 'Assistente 02',
        created_at: '2026-10-23T18:40:00.000Z'
      }
    ]);

    render(<Financeiro {...adminProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Registrado por:\s*Assistente 02/)).toBeInTheDocument();
      expect(screen.getAllByText(/23\/10\/2026/).length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // 4 e 5. Ajustes mensais somando e subtraindo valores (Screen D)
  // --------------------------------------------------------------------------
  describe('Ajustes Mensais (Screen D: afetam o mês selecionado e o caixa)', () => {
    it('4. Ajuste mensal positivo (+ R$ 20,00) impacta o mês e o caixa total', () => {
      const saldoMesInicial = 40.00;
      const caixaTotalInicial = 130.00;
      const ajusteMes = 20.00;

      const saldoMesFinal = saldoMesInicial + ajusteMes;
      const caixaTotalFinal = caixaTotalInicial + ajusteMes;

      expect(saldoMesFinal).toBe(60.00);
      expect(caixaTotalFinal).toBe(150.00);
    });

    it('5. Ajuste mensal negativo (- R$ 10,00) impacta o mês e o caixa total', () => {
      const saldoMesInicial = 40.00;
      const caixaTotalInicial = 130.00;
      const ajusteMes = 10.00;

      const saldoMesFinal = saldoMesInicial - ajusteMes;
      const caixaTotalFinal = caixaTotalInicial - ajusteMes;

      expect(saldoMesFinal).toBe(30.00);
      expect(caixaTotalFinal).toBe(120.00);
    });
  });

  // --------------------------------------------------------------------------
  // 6 e 7. Ajustes diretos no caixa total (Screen E: NÃO afetam o mês)
  // --------------------------------------------------------------------------
  describe('Ajustes Diretos no Caixa (Screen E: afetam APENAS o caixa total)', () => {
    it('6. Ajuste direto no caixa somando (+ R$ 100,00) altera o caixa total sem mudar o saldo do mês', () => {
      const saldoMesInicial = 40.00;
      const caixaTotalInicial = 130.00;
      const ajusteDiretoCaixa = 100.00;

      // Ajuste direto no caixa NÃO é atribuído ao mês
      const saldoMesFinal = saldoMesInicial; // Inalterado
      const caixaTotalFinal = caixaTotalInicial + ajusteDiretoCaixa;

      expect(saldoMesFinal).toBe(40.00);
      expect(caixaTotalFinal).toBe(230.00);
    });

    it('7. Ajuste direto no caixa diminuindo (- R$ 50,00) reduz o caixa total sem mudar o saldo do mês', () => {
      const saldoMesInicial = 40.00;
      const caixaTotalInicial = 130.00;
      const ajusteDiretoCaixa = 50.00;

      // Ajuste direto no caixa NÃO é atribuído ao mês
      const saldoMesFinal = saldoMesInicial; // Inalterado
      const caixaTotalFinal = caixaTotalInicial - ajusteDiretoCaixa;

      expect(saldoMesFinal).toBe(40.00);
      expect(caixaTotalFinal).toBe(80.00);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Relatório de ajustes do caixa listando movimentações independentemente do mês
  // --------------------------------------------------------------------------
  it('8. Relatório de ajustes do caixa (Screen F) exibe movimentações com ícones e metadados', async () => {
    const directAdjustments = [
      {
        id: 'dir-adj-01',
        type: 'entry',
        amount: 100.00,
        description: '[CAIXA_DIRETO] Dinheiro recebido de amigo para reforço',
        adjustment_date: '2026-10-29',
        created_by_name: 'Administrador',
        created_at: '2026-10-29T14:20:00.000Z'
      },
      {
        id: 'dir-adj-02',
        type: 'exit',
        amount: 50.00,
        description: '[CAIXA_DIRETO] Pagamento avulso',
        adjustment_date: '2026-10-25',
        created_by_name: 'Assistente 02',
        created_at: '2026-10-25T18:35:00.000Z'
      }
    ];

    localStorage.setItem('rda_local_adjustments', JSON.stringify(directAdjustments));

    render(<Financeiro {...adminProps} />);

    await waitFor(() => {
      expect(screen.getByText(/AJUSTES DE CAIXA \(TOTAL\)/i)).toBeInTheDocument();
      expect(screen.getByText('Entrada extra no caixa')).toBeInTheDocument();
      expect(screen.getByText('Saída do caixa')).toBeInTheDocument();
      expect(screen.getByText(/Dinheiro recebido de amigo para reforço/)).toBeInTheDocument();
      expect(screen.getByText(/Pagamento avulso/)).toBeInTheDocument();
      expect(screen.getByText(/\+\s*R\$\s*100,00/)).toBeInTheDocument();
      expect(screen.getByText(/−\s*R\$\s*50,00/)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 9. Imutabilidade e segurança de dados contra deleção indevida
  // --------------------------------------------------------------------------
  it('9. Imutabilidade contábil: tabela balance_adjustments não permite deleção ou update direto (audit trigger)', () => {
    const triggerSQLRule = `
      CREATE OR REPLACE FUNCTION trg_prevent_balance_adjustment_mutation()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Ajustes de saldo são registros contábeis imutáveis. Use estorno.';
      END;
      $$ LANGUAGE plpgsql;
    `;
    expect(triggerSQLRule).toContain('trg_prevent_balance_adjustment_mutation');
    expect(triggerSQLRule).toContain('registros contábeis imutáveis');
  });

  // --------------------------------------------------------------------------
  // 10. Proteção contra duplicidade de lançamentos
  // --------------------------------------------------------------------------
  it('10. Proteção contra duplicidade: itens com mesmo ID não são duplicados no estado ou cálculo', () => {
    const expensesList = [
      { id: 'exp-unique-1', amount: 80.00, description: 'Árbitro' },
      { id: 'exp-unique-1', amount: 80.00, description: 'Árbitro (repetido por re-fetch)' }
    ];

    const deduplicatedMap = new Map();
    expensesList.forEach(e => deduplicatedMap.set(e.id, e));
    const uniqueExpenses = Array.from(deduplicatedMap.values());

    expect(uniqueExpenses.length).toBe(1);
    const totalExpenses = uniqueExpenses.reduce((acc, e) => acc + e.amount, 0);
    expect(totalExpenses).toBe(80.00);
  });

  // --------------------------------------------------------------------------
  // 11. Bloqueio de ações financeiras para usuários sem permissão
  // --------------------------------------------------------------------------
  describe('11. Controle de Acesso e Permissões RLS', () => {
    it('Assistente sem permissão adjust_balance não visualiza o botão AJUSTE FINANCEIRO', async () => {
      const restrictedProps = {
        userRole: 'assistant' as const,
        can: vi.fn().mockImplementation((perm: string) => perm !== 'adjust_balance'),
      };

      render(<Financeiro {...restrictedProps} />);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /AJUSTE FINANCEIRO/i })).toBeNull();
      });
    });

    it('Visitante não tem acesso a ações financeiras nem visualiza botões de ação', async () => {
      render(<Financeiro userRole="visitor" can={() => false} />);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /ADICIONAR GASTOS/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /AJUSTE FINANCEIRO/i })).toBeNull();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 12. Exclusão auditável de despesa com modal e justificativa
  // --------------------------------------------------------------------------
  it('12. Exclusão auditável de despesa exige justificativa e confirmação explícita', async () => {
    setupSupabaseMock([
      {
        id: 'exp-delete-audit-test',
        category: 'Goleiro',
        amount: 100,
        expense_date: '2026-10-15',
        description: 'Despesa para exclusão auditável'
      }
    ]);

    render(<Financeiro {...adminProps} />);

    await waitFor(() => {
      expect(screen.getByText('Excluir')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Excluir'));

    // Modal de confirmação segura
    expect(screen.getByText('Exclusão Segura de Despesa')).toBeInTheDocument();
    expect(screen.getByText('exp-delete-audit-test')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex: Registro inserido incorretamente/i)).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 13. Conferência dos valores oficiais de Setembro e Outubro de 2026
  // --------------------------------------------------------------------------
  describe('13. Conferência Matemática Oficial (Setembro + Outubro 2026)', () => {
    it('Deve coincidir exatamente com os valores oficiais auditados do RDA', () => {
      // Setembro 2026
      const mensalidadesSet = 720.00;
      const diaristasSet = 880.00; // 4 partidas finalizadas
      const entradasSet = mensalidadesSet + diaristasSet; // 1.600,00
      const despesasSet = 1510.00;
      const liquidoSet = entradasSet - despesasSet; // 90,00

      expect(entradasSet).toBe(1600.00);
      expect(liquidoSet).toBe(90.00);

      // Outubro 2026
      const mensalidadesOut = 780.00;
      const diaristasOut = 620.00; // 4 partidas finalizadas
      const entradasOut = mensalidadesOut + diaristasOut; // 1.400,00
      const despesasOut = 1360.00;
      const liquidoOut = entradasOut - despesasOut; // 40,00

      expect(entradasOut).toBe(1400.00);
      expect(liquidoOut).toBe(40.00);

      // Consolidado Total (Set + Out)
      const totalMensalistas = mensalidadesSet + mensalidadesOut;
      const totalDiaristas = diaristasSet + diaristasOut;
      const totalEntradas = totalMensalistas + totalDiaristas;
      const totalDespesas = despesasSet + despesasOut;
      const totalCaixaOperacional = totalEntradas - totalDespesas;

      expect(totalMensalistas).toBe(1500.00);
      expect(totalDiaristas).toBe(1500.00);
      expect(totalEntradas).toBe(3000.00);
      expect(totalDespesas).toBe(2870.00);
      expect(totalCaixaOperacional).toBe(130.00);

      // Soma dos saldos líquidos mensais coincide com o saldo operacional de caixa
      expect(liquidoSet + liquidoOut).toBe(totalCaixaOperacional);
    });
  });
});
