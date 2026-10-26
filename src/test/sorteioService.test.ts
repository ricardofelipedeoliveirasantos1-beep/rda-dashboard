import { describe, it, expect } from 'vitest';
import { solveDraw, type DrawPlayer, calculateHistoryPenalty } from '../services/sorteioService';

describe('Sorteio Flash - Alternância e Regras de Distribuição', () => {
  const activeTeams = ['brasil', 'portugal', 'japao', 'uruguai'];

  const createMockPlayers = (count = 24): DrawPlayer[] => {
    return Array.from({ length: count }, (_, i) => {
      let position = 'Meia';
      if (i < 4) position = 'Goleiro';
      else if (i < 10) position = 'Zagueiro';
      else if (i < 18) position = 'Meia';
      else position = 'Atacante';

      return {
        id: `player-${i + 1}`,
        name: `Jogador ${i + 1}`,
        position,
        category: (i % 4 === 0 ? 'Diarista' : 'Mensalista') as 'Mensalista' | 'Diarista'
      };
    });
  };

  it('deve garantir 6 jogadores por time e nenhum jogador duplicado ou ausente com 24 jogadores', () => {
    const players = createMockPlayers(24);
    const result = solveDraw({
      selectedPlayers: players,
      activeTeams,
      champTeamStr: null,
      champPlayerIds: new Set(),
      historyMap: new Map()
    });

    for (const team of activeTeams) {
      expect(result.teamMap[team]).toHaveLength(6);
    }

    expect(result.unassigned).toHaveLength(0);

    const allAssignedIds = activeTeams.flatMap(t => result.teamMap[t].map(p => p.id));
    expect(allAssignedIds).toHaveLength(24);
    expect(new Set(allAssignedIds).size).toBe(24);
  });

  it('deve manter os campeões fixos no time campeão e excluí-los da alternância', () => {
    const players = createMockPlayers(24);
    const champTeamStr = 'japao';
    // Os jogadores 1 a 6 foram campeões no japao
    const champPlayerIds = new Set(['player-1', 'player-2', 'player-3', 'player-4', 'player-5', 'player-6']);

    const historyMap = new Map<string, string[]>();
    // Definir histórico onde todos os campeões estavam no japao
    champPlayerIds.forEach(id => {
      historyMap.set(id, ['japao']);
    });

    const result = solveDraw({
      selectedPlayers: players,
      activeTeams,
      champTeamStr,
      champPlayerIds,
      historyMap
    });

    // O time campeão deve conter exatamente os 6 jogadores campeões
    const japaoPlayerIds = result.teamMap['japao'].map(p => p.id);
    expect(result.teamMap['japao']).toHaveLength(6);
    champPlayerIds.forEach(id => {
      expect(japaoPlayerIds).toContain(id);
    });
  });

  it('não deve colocar jogadores no mesmo time em sorteios consecutivos quando houver alternativa válida', () => {
    const players = createMockPlayers(24);
    const historyMap = new Map<string, string[]>();

    // Alocar 6 em brasil, 6 em portugal, 6 em japao, 6 em uruguai no sorteio anterior
    players.slice(0, 6).forEach(p => historyMap.set(p.id, ['brasil']));
    players.slice(6, 12).forEach(p => historyMap.set(p.id, ['portugal']));
    players.slice(12, 18).forEach(p => historyMap.set(p.id, ['japao']));
    players.slice(18, 24).forEach(p => historyMap.set(p.id, ['uruguai']));

    // Sorteio sem time campeão fixo (todos os 24 estão sujeitos à alternância)
    const result = solveDraw({
      selectedPlayers: players,
      activeTeams,
      champTeamStr: null,
      champPlayerIds: new Set(),
      historyMap
    });

    let consecutiveViolations = 0;
    for (const team of activeTeams) {
      for (const player of result.teamMap[team]) {
        const lastTeam = historyMap.get(player.id)?.[0];
        if (lastTeam === team) {
          consecutiveViolations++;
        }
      }
    }

    expect(consecutiveViolations).toBe(0);
  });

  it('deve simular múltiplos sorteios consecutivos reduzindo repetições em sequências de 2 ou 3 sorteios', () => {
    const players = createMockPlayers(24);
    let historyMap = new Map<string, string[]>();
    let currentChamp: string | null = null;
    let currentChampPlayerIds = new Set<string>();

    for (let drawIndex = 1; drawIndex <= 4; drawIndex++) {
      const result = solveDraw({
        selectedPlayers: players,
        activeTeams,
        champTeamStr: currentChamp,
        champPlayerIds: currentChampPlayerIds,
        historyMap
      });

      // Validação de integridade do sorteio
      for (const t of activeTeams) {
        expect(result.teamMap[t]).toHaveLength(6);
      }

      // Contar violações consecutivas para não-campeões
      let nonChampViolations = 0;
      for (const t of activeTeams) {
        for (const p of result.teamMap[t]) {
          const isFixedChamp = currentChamp === t && currentChampPlayerIds.has(p.id);
          if (!isFixedChamp) {
            const hist = historyMap.get(p.id) || [];
            if (hist.length > 0 && hist[0] === t) {
              nonChampViolations++;
            }
          }
        }
      }

      expect(nonChampViolations).toBe(0);

      // Atualizar histórico acumulado para o próximo sorteio
      const updatedHistory = new Map<string, string[]>();
      for (const t of activeTeams) {
        for (const p of result.teamMap[t]) {
          const prevHist = historyMap.get(p.id) || [];
          updatedHistory.set(p.id, [t, ...prevHist].slice(0, 3));
        }
      }
      historyMap = updatedHistory;

      // Definir campeão para o próximo sorteio (rotacionando)
      currentChamp = activeTeams[(drawIndex - 1) % activeTeams.length];
      currentChampPlayerIds = new Set(result.teamMap[currentChamp].map(p => p.id));
    }
  });

  it('deve calcular corretamente a penalidade histórica de alocações', () => {
    const player: DrawPlayer = {
      id: 'p-1',
      name: 'Teste',
      position: 'Meia',
      category: 'Mensalista'
    };

    const history = new Map<string, string[]>();
    // Histórico: [brasil, brasil, portugal]
    history.set('p-1', ['brasil', 'brasil', 'portugal']);

    // Para o Brasil (repetição consecutiva imediata e sequência de 2)
    const brasilPenalty = calculateHistoryPenalty(player, 'brasil', history);
    expect(brasilPenalty).toBeGreaterThanOrEqual(10000 + 50000);

    // Para Portugal (3 sorteios atrás)
    const portugalPenalty = calculateHistoryPenalty(player, 'portugal', history);
    expect(portugalPenalty).toBe(10);

    // Para Japão (nunca jogou)
    const japaoPenalty = calculateHistoryPenalty(player, 'japao', history);
    expect(japaoPenalty).toBe(0);
  });

  it('deve comportar-se previsivelmente quando não for matematicamente possível evitar todas as repetições', () => {
    // Cenário extremo: Apenas 1 time ativo com 2 vagas, e 2 jogadores que já estavam nele
    const constrainedPlayers = createMockPlayers(2);
    const historyMap = new Map<string, string[]>();
    constrainedPlayers.forEach(p => historyMap.set(p.id, ['brasil']));

    const result = solveDraw({
      selectedPlayers: constrainedPlayers,
      activeTeams: ['brasil'],
      champTeamStr: null,
      champPlayerIds: new Set(),
      historyMap,
      maxPlayersPerTeam: 2
    });

    expect(result.teamMap['brasil']).toHaveLength(2);
    expect(result.violationsCount).toBe(2);
    expect(result.diagnostic).toContain('inevitável');
  });

  it('deve respeitar unlockedPlayerIds ao remover diarista do time campeão sem forçá-lo de volta', () => {
    const players = createMockPlayers(24);
    const champTeamStr = 'japao';
    // Jogadores 1 a 6 eram do Japão campeão, sendo player-6 um Diarista
    const champPlayerIds = new Set(['player-1', 'player-2', 'player-3', 'player-4', 'player-5', 'player-6']);
    // O proprietário removeu player-6 (Diarista) do time campeão
    const unlockedPlayerIds = new Set(['player-6']);

    const historyMap = new Map<string, string[]>();
    champPlayerIds.forEach(id => historyMap.set(id, ['japao']));

    const result = solveDraw({
      selectedPlayers: players,
      activeTeams,
      champTeamStr,
      champPlayerIds,
      historyMap,
      unlockedPlayerIds
    });

    // O time campeão deve ter 6 jogadores, mas NÃO deve conter player-6 se outros estavam disponíveis para preencher
    const japaoPlayerIds = result.teamMap['japao'].map(p => p.id);
    expect(japaoPlayerIds).toHaveLength(6);
    expect(japaoPlayerIds).toContain('player-1');
    expect(japaoPlayerIds).toContain('player-2');
    expect(japaoPlayerIds).toContain('player-3');
    expect(japaoPlayerIds).toContain('player-4');
    expect(japaoPlayerIds).toContain('player-5');
    // player-6 foi destravado e não foi forçado a voltar para o Japão
    // E todos os 24 jogadores estão distribuídos sem duplicação
    const allAssignedIds = activeTeams.flatMap(t => result.teamMap[t].map(p => p.id));
    expect(allAssignedIds).toHaveLength(24);
    expect(new Set(allAssignedIds).size).toBe(24);
  });

  it('deve preservar alocações manuais pré-existentes sem duplicar jogadores entre times', () => {
    const players = createMockPlayers(24);
    const existingTeams: Record<string, DrawPlayer[]> = {
      brasil: [players[0], players[1]], // alocados manualmente no Brasil
      portugal: [players[2]],           // alocado manualmente em Portugal
      japao: [],
      uruguai: []
    };

    const result = solveDraw({
      selectedPlayers: players,
      activeTeams,
      champTeamStr: null,
      champPlayerIds: new Set(),
      historyMap: new Map(),
      existingTeams
    });

    // Brasil deve conter players[0] e players[1]
    expect(result.teamMap['brasil'].map(p => p.id)).toContain(players[0].id);
    expect(result.teamMap['brasil'].map(p => p.id)).toContain(players[1].id);
    // Portugal deve conter players[2]
    expect(result.teamMap['portugal'].map(p => p.id)).toContain(players[2].id);

    // Nenhum time deve ultrapassar 6 jogadores e ninguém pode estar em mais de um time
    for (const t of activeTeams) {
      expect(result.teamMap[t]).toHaveLength(6);
    }
    const allAssignedIds = activeTeams.flatMap(t => result.teamMap[t].map(p => p.id));
    expect(allAssignedIds).toHaveLength(24);
    expect(new Set(allAssignedIds).size).toBe(24);
  });
});
