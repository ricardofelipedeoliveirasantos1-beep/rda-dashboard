import { describe, it, expect } from 'vitest';
import {
  solveDraw,
  countRepeatedPairsInTeam,
  type DrawPlayer,
  type DrawInput
} from '../services/sorteioService';

describe('RDA — Sorteio Flash Inteligente (Bateria Completa de Testes)', () => {
  const activeTeams = ['brasil', 'portugal', 'japao', 'uruguai'];

  // Helper para criar jogadores mock com posições realistas
  const createPlayer = (
    id: string,
    name: string,
    position: string,
    category: 'Mensalista' | 'Diarista' = 'Mensalista'
  ): DrawPlayer => ({
    id,
    name,
    position,
    category,
    is_active: true
  });

  // Cria 24 jogadores simulando a estrutura oficial do RDA:
  // 4 Goleiros, 6 Zagueiros, 8 Meias, 6 Atacantes
  const createRda24Players = (): {
    allPlayers: DrawPlayer[];
    champPlayers: DrawPlayer[];
    brasilPlayers: DrawPlayer[];
    portugalPlayers: DrawPlayer[];
    uruguaiPlayers: DrawPlayer[];
    lastTeamMap: Map<string, string>;
  } => {
    const champPlayers: DrawPlayer[] = [
      createPlayer('c-1', 'Japão Goleiro', 'Goleiro'),
      createPlayer('c-2', 'Japão Zag 1', 'Zagueiro'),
      createPlayer('c-3', 'Japão Zag 2', 'Zagueiro'),
      createPlayer('c-4', 'Japão Meia 1', 'Meia'),
      createPlayer('c-5', 'Japão Meia 2', 'Meia'),
      createPlayer('c-6', 'Japão Ata 1', 'Atacante')
    ];

    const brasilPlayers: DrawPlayer[] = [
      createPlayer('b-1', 'Brasil Goleiro', 'Goleiro'),
      createPlayer('b-2', 'Brasil Zag 1', 'Zagueiro'),
      createPlayer('b-3', 'Brasil Zag 2', 'Zagueiro'),
      createPlayer('b-4', 'Brasil Meia 1', 'Meia'),
      createPlayer('b-5', 'Brasil Meia 2', 'Meia'),
      createPlayer('b-6', 'Brasil Ata 1', 'Atacante')
    ];

    const portugalPlayers: DrawPlayer[] = [
      createPlayer('p-1', 'Portugal Goleiro', 'Goleiro'),
      createPlayer('p-2', 'Portugal Zag 1', 'Zagueiro'),
      createPlayer('p-3', 'Portugal Zag 2', 'Zagueiro'),
      createPlayer('p-4', 'Portugal Meia 1', 'Meia'),
      createPlayer('p-5', 'Portugal Meia 2', 'Meia'),
      createPlayer('p-6', 'Portugal Ata 1', 'Atacante')
    ];

    const uruguaiPlayers: DrawPlayer[] = [
      createPlayer('u-1', 'Uruguai Goleiro', 'Goleiro'),
      createPlayer('u-2', 'Uruguai Zag 1', 'Zagueiro'),
      createPlayer('u-3', 'Uruguai Zag 2', 'Zagueiro'),
      createPlayer('u-4', 'Uruguai Meia 1', 'Meia'),
      createPlayer('u-5', 'Uruguai Meia 2', 'Meia'),
      createPlayer('u-6', 'Uruguai Ata 1', 'Atacante')
    ];

    const lastTeamMap = new Map<string, string>();
    champPlayers.forEach(p => lastTeamMap.set(p.id, 'japao'));
    brasilPlayers.forEach(p => lastTeamMap.set(p.id, 'brasil'));
    portugalPlayers.forEach(p => lastTeamMap.set(p.id, 'portugal'));
    uruguaiPlayers.forEach(p => lastTeamMap.set(p.id, 'uruguai'));

    const allPlayers = [
      ...champPlayers,
      ...brasilPlayers,
      ...portugalPlayers,
      ...uruguaiPlayers
    ];

    return {
      allPlayers,
      champPlayers,
      brasilPlayers,
      portugalPlayers,
      uruguaiPlayers,
      lastTeamMap
    };
  };

  // =========================================================================
  // TESTE A — Todos presentes
  // =========================================================================
  describe('TESTE A — Todos presentes', () => {
    it('deve reorganizar os 18 atletas das 3 equipes com o mínimo exato de 9 duplas repetidas preservando o campeão', () => {
      const { allPlayers, champPlayers, lastTeamMap } = createRda24Players();
      const champPlayerIds = new Set(champPlayers.map(p => p.id));

      const input: DrawInput = {
        selectedPlayers: allPlayers,
        activeTeams,
        champTeamStr: 'japao',
        champPlayerIds,
        lastTeamMap
      };

      const result = solveDraw(input);

      // 1. Equipe campeã Japão preservada estritamente com os 6 jogadores
      expect(result.teamMap['japao']).toHaveLength(6);
      const assignedChampIds = new Set(result.teamMap['japao'].map(p => p.id));
      champPlayerIds.forEach(id => {
        expect(assignedChampIds.has(id)).toBe(true);
      });

      // 2. As outras três equipes devem ter exatamente 6 atletas cada
      expect(result.teamMap['brasil']).toHaveLength(6);
      expect(result.teamMap['portugal']).toHaveLength(6);
      expect(result.teamMap['uruguai']).toHaveLength(6);
      expect(result.unassigned).toHaveLength(0);

      // 3. Integridade de unicidade: 24 jogadores distintos
      const allAssignedIds = activeTeams.flatMap(t => result.teamMap[t].map(p => p.id));
      expect(allAssignedIds).toHaveLength(24);
      expect(new Set(allAssignedIds).size).toBe(24);

      // 4. Mínimo teórico exato de repetições: 18 jogadores (6 de cada uma de 3 origens)
      // distribuídos perfeitamente em 3 equipes recebem 2 de cada origem.
      // C(2,2) + C(2,2) + C(2,2) = 1 + 1 + 1 = 3 duplas por equipe.
      // 3 equipes x 3 duplas = 9 duplas repetidas no total.
      expect(result.theoreticalMinimum).toBe(9);
      expect(result.repeatedPairsCount).toBe(9);
      expect(result.isOptimal).toBe(true);
    });
  });

  // =========================================================================
  // TESTE B — Jogadores ausentes e diaristas
  // =========================================================================
  describe('TESTE B — Jogadores ausentes', () => {
    it('deve simular ausência de 4 jogadores da partida anterior e inclusão de 4 diaristas sem penalidade', () => {
      const { allPlayers, champPlayers, lastTeamMap } = createRda24Players();
      const champPlayerIds = new Set(champPlayers.map(p => p.id));

      // 4 jogadores não-campeões ausentes: b-5, b-6, p-6, u-6
      const absentIds = new Set(['b-5', 'b-6', 'p-6', 'u-6']);
      const presentOldPlayers = allPlayers.filter(p => !absentIds.has(p.id));

      // 4 novos diaristas adicionados (não estavam na última partida)
      const diaristas: DrawPlayer[] = [
        createPlayer('d-1', 'Diarista 1', 'Meia', 'Diarista'),
        createPlayer('d-2', 'Diarista 2', 'Atacante', 'Diarista'),
        createPlayer('d-3', 'Diarista 3', 'Meia', 'Diarista'),
        createPlayer('d-4', 'Diarista 4', 'Atacante', 'Diarista')
      ];

      const currentSelected = [...presentOldPlayers, ...diaristas];
      expect(currentSelected).toHaveLength(24);

      const input: DrawInput = {
        selectedPlayers: currentSelected,
        activeTeams,
        champTeamStr: 'japao',
        champPlayerIds,
        lastTeamMap
      };

      const result = solveDraw(input);

      // Validação de capacidade
      for (const t of activeTeams) {
        expect(result.teamMap[t]).toHaveLength(6);
      }
      expect(result.unassigned).toHaveLength(0);

      // Confirmar que os diaristas foram todos alocados
      const allAssignedIds = new Set(activeTeams.flatMap(t => result.teamMap[t].map(p => p.id)));
      diaristas.forEach(d => {
        expect(allAssignedIds.has(d.id)).toBe(true);
      });

      // Como 4 diaristas não têm histórico anterior, o total de duplas repetidas deve cair
      // (de 9 para no máximo 5 duplas repetidas)
      expect(result.repeatedPairsCount).toBeLessThanOrEqual(5);
    });
  });

  // =========================================================================
  // TESTE C — Diferentes quantidades de diaristas
  // =========================================================================
  describe('TESTE C — Diferentes quantidades de diaristas', () => {
    it('deve suportar flexivelmente de 1 a 6 diaristas reduzindo a pontuação de repetição', () => {
      const { allPlayers, champPlayers, lastTeamMap } = createRda24Players();
      const champPlayerIds = new Set(champPlayers.map(p => p.id));

      // IDs candidatos a ausência (jogadores de linha não-campeões)
      const candidatesToReplace = ['b-4', 'b-5', 'b-6', 'p-4', 'p-5', 'u-6'];

      for (let numDiaristas = 1; numDiaristas <= 6; numDiaristas++) {
        const replaceIds = new Set(candidatesToReplace.slice(0, numDiaristas));
        const keptPlayers = allPlayers.filter(p => !replaceIds.has(p.id));

        const diaristas: DrawPlayer[] = Array.from({ length: numDiaristas }, (_, i) =>
          createPlayer(`d-test-${numDiaristas}-${i}`, `Diarista ${i + 1}`, 'Meia', 'Diarista')
        );

        const currentSelected = [...keptPlayers, ...diaristas];
        expect(currentSelected).toHaveLength(24);

        const result = solveDraw({
          selectedPlayers: currentSelected,
          activeTeams,
          champTeamStr: 'japao',
          champPlayerIds,
          lastTeamMap
        });

        // Verificações essenciais
        for (const t of activeTeams) {
          expect(result.teamMap[t]).toHaveLength(6);
        }
        expect(result.unassigned).toHaveLength(0);

        // A pontuação com diaristas deve ser sempre menor ou igual a 9
        expect(result.repeatedPairsCount).toBeLessThanOrEqual(9);

        // Com 6 diaristas, temos 12 veteranos e 6 novos -> repetições caem significativamente
        if (numDiaristas >= 6) {
          expect(result.repeatedPairsCount).toBeLessThanOrEqual(4);
        }
      }
    });
  });

  // =========================================================================
  // TESTE D — Minimização de repetição e não uso da penúltima partida
  // =========================================================================
  describe('TESTE D — Minimização de repetição', () => {
    it('deve atingir o mínimo teórico e ignorar completamente dados de partidas anteriores à última', () => {
      const { allPlayers, champPlayers, lastTeamMap } = createRda24Players();
      const champPlayerIds = new Set(champPlayers.map(p => p.id));

      // Simular um historyMap que tem 5 partidas anteriores com histórico diverso
      const ancientHistoryMap = new Map<string, string[]>();
      allPlayers.forEach(p => {
        // Na penúltima e antepenúltima partidas, jogadores estavam misturados
        ancientHistoryMap.set(p.id, [
          lastTeamMap.get(p.id) || 'brasil', // partida 1 (última)
          'uruguai', // partida 2 (penúltima)
          'portugal' // partida 3 (antepenúltima)
        ]);
      });

      const result = solveDraw({
        selectedPlayers: allPlayers,
        activeTeams,
        champTeamStr: 'japao',
        champPlayerIds,
        lastTeamMap, // Deve usar exclusivamente este mapa da última partida
        historyMap: ancientHistoryMap
      });

      // A pontuação de repetição deve ser exatamente 9 duplas repetidas da última partida
      expect(result.repeatedPairsCount).toBe(9);
      expect(result.theoreticalMinimum).toBe(9);
      expect(result.isOptimal).toBe(true);
    });

    it('funções utilitárias matemáticas devem calcular duplas com exatidão', () => {
      const lastMap = new Map<string, string>([
        ['p1', 'brasil'],
        ['p2', 'brasil'],
        ['p3', 'brasil'],
        ['p4', 'portugal'],
        ['p5', 'portugal'],
        ['d1', ''] // Diarista sem time
      ]);

      const team: DrawPlayer[] = [
        createPlayer('p1', 'P1', 'Meia'),
        createPlayer('p2', 'P2', 'Meia'),
        createPlayer('p3', 'P3', 'Meia'),
        createPlayer('p4', 'P4', 'Meia'),
        createPlayer('p5', 'P5', 'Meia'),
        createPlayer('d1', 'D1', 'Meia', 'Diarista')
      ];

      // Brasil tem 3 jogadores -> C(3,2) = 3
      // Portugal tem 2 jogadores -> C(2,2) = 1
      // Diarista -> 0
      // Total esperado no time = 4 duplas repetidas
      const pairs = countRepeatedPairsInTeam(team, lastMap);
      expect(pairs).toBe(4);
    });
  });

  // =========================================================================
  // TESTE E — Aleatoriedade e variedade (1.000 sorteios)
  // =========================================================================
  describe('TESTE E — Aleatoriedade e variedade (1.000 sorteios)', () => {
    it('deve gerar alta diversidade de composições em 1.000 execuções sem padrão fixo', () => {
      const { allPlayers, champPlayers, lastTeamMap } = createRda24Players();
      const champPlayerIds = new Set(champPlayers.map(p => p.id));

      const input: DrawInput = {
        selectedPlayers: allPlayers,
        activeTeams,
        champTeamStr: 'japao',
        champPlayerIds,
        lastTeamMap
      };

      const iterations = 1000;
      const seenSignatures = new Set<string>();
      // Rastrear em quantos sorteios cada jogador não-campeão caiu em cada time (brasil, portugal, uruguai)
      const teamPlacementCounts = new Map<string, { brasil: number; portugal: number; uruguai: number }>();

      const nonChampPlayers = allPlayers.filter(p => !champPlayerIds.has(p.id));
      nonChampPlayers.forEach(p => {
        teamPlacementCounts.set(p.id, { brasil: 0, portugal: 0, uruguai: 0 });
      });

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const result = solveDraw(input);

        // 1. Integridade em cada execução
        expect(result.teamMap['japao']).toHaveLength(6);
        expect(result.teamMap['brasil']).toHaveLength(6);
        expect(result.teamMap['portugal']).toHaveLength(6);
        expect(result.teamMap['uruguai']).toHaveLength(6);
        expect(result.repeatedPairsCount).toBeLessThanOrEqual(9);

        // Gerar assinatura canônica da distribuição dos 3 times não-campeões
        const brasilIds = result.teamMap['brasil'].map(p => p.id).sort().join(',');
        const portugalIds = result.teamMap['portugal'].map(p => p.id).sort().join(',');
        const uruguaiIds = result.teamMap['uruguai'].map(p => p.id).sort().join(',');
        const signature = `B:[${brasilIds}]|P:[${portugalIds}]|U:[${uruguaiIds}]`;
        seenSignatures.add(signature);

        // Contabilizar frequência de cada jogador
        result.teamMap['brasil'].forEach(p => {
          const counts = teamPlacementCounts.get(p.id);
          if (counts) counts.brasil++;
        });
        result.teamMap['portugal'].forEach(p => {
          const counts = teamPlacementCounts.get(p.id);
          if (counts) counts.portugal++;
        });
        result.teamMap['uruguai'].forEach(p => {
          const counts = teamPlacementCounts.get(p.id);
          if (counts) counts.uruguai++;
        });
      }

      const totalTimeMs = performance.now() - startTime;
      const avgTimePerRunMs = totalTimeMs / iterations;

      // 2. Alta variedade: em 1.000 sorteios, deve haver centenas de combinações únicas
      expect(seenSignatures.size).toBeGreaterThanOrEqual(700);

      // 3. Distribuição estocástica equilibrada: cada um dos 18 jogadores deve ser sorteado
      // com frequência em cada uma das equipes não-campeãs
      for (const counts of teamPlacementCounts.values()) {
        expect(counts.brasil).toBeGreaterThan(50);
        expect(counts.portugal).toBeGreaterThan(50);
        expect(counts.uruguai).toBeGreaterThan(50);
      }

      // 4. Desempenho rápido: tempo médio por sorteio deve ser inferior a 25ms
      expect(avgTimePerRunMs).toBeLessThan(25);
    }, 20000);
  });

  // =========================================================================
  // TESTE F — Integridade
  // =========================================================================
  describe('TESTE F — Integridade e Casos Extremos', () => {
    it('deve filtrar IDs duplicados e atletas sem ID de forma transparente', () => {
      const { allPlayers, champPlayers, lastTeamMap } = createRda24Players();
      const champPlayerIds = new Set(champPlayers.map(p => p.id));

      // Injeta duplicados e sem ID
      const corruptedPlayers: DrawPlayer[] = [
        ...allPlayers,
        { ...allPlayers[0] }, // Duplicata do c-1
        { id: '', name: 'Sem ID', position: 'Meia', category: 'Diarista' } as any
      ];

      const result = solveDraw({
        selectedPlayers: corruptedPlayers,
        activeTeams,
        champTeamStr: 'japao',
        champPlayerIds,
        lastTeamMap
      });

      // Deve desduplicar e ignorar o sem ID
      expect(result.teamMap['japao']).toHaveLength(6);
      expect(result.teamMap['brasil']).toHaveLength(6);
      expect(result.teamMap['portugal']).toHaveLength(6);
      expect(result.teamMap['uruguai']).toHaveLength(6);
      expect(result.unassigned).toHaveLength(0);
    });

    it('deve lidar corretamente com ausência total de equipe campeã', () => {
      const { allPlayers, lastTeamMap } = createRda24Players();

      // Sem campeão definido
      const result = solveDraw({
        selectedPlayers: allPlayers,
        activeTeams,
        champTeamStr: null,
        champPlayerIds: new Set(),
        lastTeamMap
      });

      // Todas as 4 equipes devem ter 6 jogadores
      for (const t of activeTeams) {
        expect(result.teamMap[t]).toHaveLength(6);
      }
      expect(result.unassigned).toHaveLength(0);
    });

    it('deve lidar com listas menores (menos de 24 jogadores)', () => {
      const { allPlayers, champPlayers, lastTeamMap } = createRda24Players();
      const champPlayerIds = new Set(champPlayers.map(p => p.id));

      // Apenas 20 jogadores selecionados (6 campeões + 14 outros)
      const smallerList = allPlayers.slice(0, 20);

      const result = solveDraw({
        selectedPlayers: smallerList,
        activeTeams,
        champTeamStr: 'japao',
        champPlayerIds,
        lastTeamMap
      });

      // Campeão com 6, as outras com 4 ou 5
      expect(result.teamMap['japao']).toHaveLength(6);
      const remainingAssigned =
        result.teamMap['brasil'].length +
        result.teamMap['portugal'].length +
        result.teamMap['uruguai'].length;
      expect(remainingAssigned).toBe(14);
      expect(result.unassigned).toHaveLength(0);
    });
  });

  // =========================================================================
  // TESTE G — Desempenho e Métricas
  // =========================================================================
  describe('TESTE G — Desempenho', () => {
    it('deve registrar métricas detalhadas e executar em menos de 25ms', () => {
      const { allPlayers, champPlayers, lastTeamMap } = createRda24Players();
      const champPlayerIds = new Set(champPlayers.map(p => p.id));

      const result = solveDraw({
        selectedPlayers: allPlayers,
        activeTeams,
        champTeamStr: 'japao',
        champPlayerIds,
        lastTeamMap,
        queryTimeMs: 12.5
      });

      // Validação das métricas
      expect(result.metrics).toBeDefined();
      expect(result.metrics.queryTimeMs).toBe(12.5);
      expect(result.metrics.optimizationTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.totalTimeMs).toBeLessThan(35); // Máximo tolerado
      expect(result.metrics.trialsRun).toBeGreaterThanOrEqual(1);
      expect(result.metrics.theoreticalMinimum).toBe(9);
      expect(result.metrics.isOptimal).toBe(true);
    });
  });

  // =========================================================================
  // TESTE H — Regressão e Compatibilidade
  // =========================================================================
  describe('TESTE H — Regressão e Compatibilidade', () => {
    it('deve funcionar perfeitamente quando alimentado apenas com historyMap legado', () => {
      const { allPlayers, champPlayers, lastTeamMap } = createRda24Players();
      const champPlayerIds = new Set(champPlayers.map(p => p.id));

      // historyMap legado: chave -> [time]
      const legacyHistory = new Map<string, string[]>();
      lastTeamMap.forEach((team, playerId) => {
        legacyHistory.set(playerId, [team]);
      });

      const result = solveDraw({
        selectedPlayers: allPlayers,
        activeTeams,
        champTeamStr: 'japao',
        champPlayerIds,
        historyMap: legacyHistory
      });

      expect(result.teamMap['japao']).toHaveLength(6);
      expect(result.repeatedPairsCount).toBe(9);
      expect(result.unassigned).toHaveLength(0);
    });

    it('deve respeitar existingTeams com jogadores pré-alocados manualmente', () => {
      const { allPlayers, lastTeamMap } = createRda24Players();

      const existingTeams: Record<string, DrawPlayer[]> = {
        brasil: [allPlayers[6], allPlayers[7]], // Pré-alocados no Brasil
        portugal: [],
        japao: [],
        uruguai: []
      };

      const result = solveDraw({
        selectedPlayers: allPlayers,
        activeTeams,
        champTeamStr: null,
        champPlayerIds: new Set(),
        lastTeamMap,
        existingTeams
      });

      // Brasil deve conter allPlayers[6] e allPlayers[7]
      const brasilIds = result.teamMap['brasil'].map(p => p.id);
      expect(brasilIds).toContain(allPlayers[6].id);
      expect(brasilIds).toContain(allPlayers[7].id);

      for (const t of activeTeams) {
        expect(result.teamMap[t]).toHaveLength(6);
      }
      expect(result.unassigned).toHaveLength(0);
    });
  });
});
