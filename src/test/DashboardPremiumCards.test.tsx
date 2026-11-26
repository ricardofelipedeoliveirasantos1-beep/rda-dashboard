import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResumoTemporadaCard, FinanceiroGeralCard } from '../components/DashboardPremiumCards';

describe('RDA — Dashboard Premium Cards (Fidelidade Visual à Referência)', () => {
  it('deve renderizar o Card Resumo da Temporada com todos os dados dinâmicos e títulos da referência', () => {
    render(
      <ResumoTemporadaCard
        totalPlayers={86}
        totalMensalistas={22}
        totalDiaristas={64}
        totalMatches={43}
        totalGoals={509}
        totalAssists={310}
      />
    );

    // Título e Subtítulo
    expect(screen.getByText('RESUMO DA TEMPORADA')).toBeInTheDocument();
    expect(screen.getByText('DESEMPENHO GERAL DO RACHA')).toBeInTheDocument();

    // 4 Blocos principais de métricas
    expect(screen.getByText('86')).toBeInTheDocument();
    expect(screen.getByText('Jogadores')).toBeInTheDocument();
    expect(screen.getByText('22 Mensalistas')).toBeInTheDocument();
    expect(screen.getByText('64 Diaristas')).toBeInTheDocument();

    expect(screen.getByText('43')).toBeInTheDocument();
    expect(screen.getByText('Partidas')).toBeInTheDocument();

    expect(screen.getByText('509')).toBeInTheDocument();
    expect(screen.getByText('Gols')).toBeInTheDocument();

    expect(screen.getByText('310')).toBeInTheDocument();
    expect(screen.getByText('Assistências')).toBeInTheDocument();
  });

  it('deve renderizar o Card Financeiro Geral com valores formatados e destaque no Saldo Líquido', () => {
    render(
      <FinanceiroGeralCard
        totalRevenue={4680}
        totalExpenses={4472}
        monthlyRevenue={1480}
        monthlyExpenses={1412}
        pendingAmount={120}
        accumulatedBalance={374}
      />
    );

    // Título e Subtítulo
    expect(screen.getByText('FINANCEIRO GERAL')).toBeInTheDocument();
    expect(screen.getByText('CONTROLE DE RECEITAS, DESPESAS E SALDO')).toBeInTheDocument();

    // Coluna esquerda
    expect(screen.getByText('Arrecadação Total')).toBeInTheDocument();
    expect(screen.getByText(/4\.680,00/)).toBeInTheDocument();

    expect(screen.getByText('Recebido no mês')).toBeInTheDocument();
    expect(screen.getByText(/1\.480,00/)).toBeInTheDocument();

    expect(screen.getByText('Pendências (mês)')).toBeInTheDocument();
    expect(screen.getByText(/120,00/)).toBeInTheDocument();

    // Coluna direita
    expect(screen.getByText('Despesas Totais')).toBeInTheDocument();
    expect(screen.getByText(/4\.472,00/)).toBeInTheDocument();

    expect(screen.getByText('Despesas (mês)')).toBeInTheDocument();
    expect(screen.getByText(/1\.412,00/)).toBeInTheDocument();

    // Destaque do Saldo Líquido Acumulado
    expect(screen.getByText('Saldo Líquido Acumulado')).toBeInTheDocument();
    expect(screen.getByText(/374,00/)).toBeInTheDocument();
  });
});
