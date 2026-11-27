import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ResumoTemporadaCard,
  FinanceiroGeralCard,
  ResumoMensalCard,
  ProximaPartidaCard
} from '../components/DashboardPremiumCards';

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

  it('deve renderizar o Card Resumo Mensal com os 3 cards (verde, vermelho, dourado) fiéis à referência', () => {
    render(
      <ResumoMensalCard
        paidCount={20}
        pendingCount={2}
        diaristsCount={6}
      />
    );

    expect(screen.getByText('RESUMO MENSAL (ATUAL)')).toBeInTheDocument();
    expect(screen.getByText('CONTROLE DE MENSALIDADES DO MÊS')).toBeInTheDocument();

    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Mensalistas pagos')).toBeInTheDocument();

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Mensalistas pendentes')).toBeInTheDocument();

    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText(/Diaristas/)).toBeInTheDocument();
    expect(screen.getByText(/\(Últ\. Partida\)/)).toBeInTheDocument();
  });

  it('deve renderizar o Card Próxima Partida com as 3 colunas e botão "Ver Partidas" fiel à referência', () => {
    const handleViewMatches = vi.fn();
    render(
      <ProximaPartidaCard
        nextMatch={{
          location: 'Arena Ouro Preto',
          match_date: '2026-11-27',
          match_time: '22:30:00'
        }}
        onViewMatches={handleViewMatches}
      />
    );

    expect(screen.getByText('PRÓXIMA PARTIDA')).toBeInTheDocument();
    expect(screen.getByText('INFORMAÇÕES DO PRÓXIMO JOGO')).toBeInTheDocument();

    expect(screen.getByText('Arena Ouro Preto')).toBeInTheDocument();
    expect(screen.getByText('27/11/2026')).toBeInTheDocument();
    expect(screen.getByText('22:30h')).toBeInTheDocument();

    const btn = screen.getByTestId('btn-ver-partidas');
    expect(btn).toBeInTheDocument();
    expect(screen.getByText('Ver Partidas')).toBeInTheDocument();

    fireEvent.click(btn);
    expect(handleViewMatches).toHaveBeenCalledTimes(1);
  });
});
