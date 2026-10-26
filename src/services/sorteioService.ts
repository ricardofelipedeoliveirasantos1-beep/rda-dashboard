/**
 * Sorteio Flash com Regra de Alternância para o RDA (Racha dos Amigos)
 * 
 * Regras:
 * 1. O time campeão da partida anterior é excluído da regra de alternância obrigatória (seus atletas presentes permanecem nele).
 * 2. Para os demais times, o algoritmo considera o histórico recente de alocações (últimos 1 a 3 sorteios).
 * 3. Evita que um jogador seja colocado no mesmo time em sorteios consecutivos quando houver alternativa válida.
 * 4. Evita que um jogador permaneça no mesmo time por 2 ou 3 sorteios seguidos.
 * 5. Distribui os jogadores equilibradamente respeitando a capacidade máxima de cada time (padrão 6).
 * 6. Balanceia posições (especialmente Goleiros: no máximo 1 por time, se possível).
 * 7. Garante que não haja jogadores duplicados ou faltantes.
 */

export interface DrawPlayer {
  id: string;
  name: string;
  position: string | null;
  category: 'Mensalista' | 'Diarista';
  photo_url?: string | null;
  shirt_number?: number | null;
  [key: string]: any;
}

export interface DrawInput {
  selectedPlayers: DrawPlayer[];
  activeTeams: string[]; // ex: ['brasil', 'portugal', 'japao', 'uruguai']
  champTeamStr: string | null;
  champPlayerIds: Set<string>;
  historyMap: Map<string, string[]>; // playerId -> [lastTeam, team2MatchesAgo, team3MatchesAgo]
  maxPlayersPerTeam?: number;
  existingTeams?: Record<string, DrawPlayer[]>; // Permite manter alocações manuais existentes
  unlockedPlayerIds?: Set<string>; // Atletas removidos manualmente do time campeão
}

export interface DrawResult {
  teamMap: Record<string, DrawPlayer[]>;
  unassigned: DrawPlayer[];
  violationsCount: number;
  diagnostic: string;
}

export function calculateHistoryPenalty(
  player: DrawPlayer,
  teamName: string,
  historyMap: Map<string, string[]>
): number {
  const hist = historyMap.get(player.id) || [];
  let penalty = 0;

  // 1. Repetição consecutiva imediata (último sorteio) -> penalidade altíssima
  if (hist.length > 0 && hist[0] === teamName) {
    penalty += 10000;
  }

  // 2. Repetição de 2 sorteios atrás
  if (hist.length > 1 && hist[1] === teamName) {
    penalty += 200;
  }

  // 3. Sequência de 2 repetições consecutivas anteriores no mesmo time
  if (hist.length > 1 && hist[0] === teamName && hist[1] === teamName) {
    penalty += 50000;
  }

  // 4. Repetição de 3 sorteios atrás
  if (hist.length > 2 && hist[2] === teamName) {
    penalty += 10;
  }

  return penalty;
}

export function solveDraw({
  selectedPlayers,
  activeTeams,
  champTeamStr,
  champPlayerIds,
  historyMap,
  maxPlayersPerTeam = 6,
  existingTeams,
  unlockedPlayerIds = new Set<string>()
}: DrawInput): DrawResult {
  const shouldFixChampions = Boolean(champTeamStr && activeTeams.includes(champTeamStr));
  
  // Deduplica selectedPlayers por id para garantir integridade absoluta
  const uniqueSelectedMap = new Map<string, DrawPlayer>();
  selectedPlayers.forEach(p => {
    if (!uniqueSelectedMap.has(p.id)) {
      uniqueSelectedMap.set(p.id, p);
    }
  });
  const uniqueSelected = Array.from(uniqueSelectedMap.values());

  // Inicializar mapa de times respeitando alterações manuais existentes
  const initialTeams: Record<string, DrawPlayer[]> = {};
  const alreadyAssignedIds = new Set<string>();

  activeTeams.forEach(t => {
    initialTeams[t] = [];
    if (existingTeams && Array.isArray(existingTeams[t])) {
      // Filtrar apenas jogadores que estão selecionados para este racha
      existingTeams[t].forEach(p => {
        if (uniqueSelectedMap.has(p.id) && !alreadyAssignedIds.has(p.id)) {
          // Se for o time campeão, respeita os que não foram explicitamente destravados/removidos
          if (t === champTeamStr && unlockedPlayerIds.has(p.id)) {
            // Jogador foi explicitamente removido do time campeão pelo usuário
            return;
          }
          initialTeams[t].push(uniqueSelectedMap.get(p.id)!);
          alreadyAssignedIds.add(p.id);
        }
      });
    }
  });

  // Se existingTeams não tinha os campeões populados, popula automaticamente os que não foram destravados
  if (shouldFixChampions && champTeamStr && initialTeams[champTeamStr].length === 0) {
    uniqueSelected.forEach(p => {
      if (
        champPlayerIds.has(p.id) && 
        !unlockedPlayerIds.has(p.id) && 
        !alreadyAssignedIds.has(p.id) &&
        initialTeams[champTeamStr].length < maxPlayersPerTeam
      ) {
        initialTeams[champTeamStr].push(p);
        alreadyAssignedIds.add(p.id);
      }
    });
  }

  // Jogadores que precisam ser sorteados nas vagas remanescentes
  const playersToDraw = uniqueSelected.filter(p => !alreadyAssignedIds.has(p.id));

  if (playersToDraw.length === 0) {
    return {
      teamMap: initialTeams,
      unassigned: [],
      violationsCount: 0,
      diagnostic: 'Nenhum jogador para sortear além dos atletas fixos.'
    };
  }

  let bestSolution: { teamMap: Record<string, DrawPlayer[]>; unassigned: DrawPlayer[] } | null = null;
  let bestScore = Infinity;
  let bestViolations = 0;

  const NUM_TRIALS = 80;

  for (let trial = 0; trial < NUM_TRIALS; trial++) {
    const currentTeams: Record<string, DrawPlayer[]> = {};
    activeTeams.forEach(t => {
      currentTeams[t] = [...initialTeams[t]];
    });

    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    // Agrupar por posições com aleatorização interna para variar os sorteios
    const posGroups = {
      Goleiro: shuffle(playersToDraw.filter(p => p.position === 'Goleiro')),
      Zagueiro: shuffle(playersToDraw.filter(p => p.position === 'Zagueiro')),
      Meio: shuffle(playersToDraw.filter(p => p.position === 'Meia' || p.position === 'Volante')),
      Atacante: shuffle(playersToDraw.filter(p => p.position === 'Atacante')),
      Outros: shuffle(playersToDraw.filter(p => !['Goleiro', 'Zagueiro', 'Meia', 'Volante', 'Atacante'].includes(p.position || '')))
    };

    const ordered = [
      ...posGroups.Goleiro,
      ...posGroups.Zagueiro,
      ...posGroups.Meio,
      ...posGroups.Atacante,
      ...posGroups.Outros
    ];

    const unassigned: DrawPlayer[] = [];

    // Distribuição gulosa orientada por custo de penalidade
    for (const player of ordered) {
      let bestTeam: string | null = null;
      let minTeamCost = Infinity;

      const candidates = shuffle(activeTeams.filter(t => currentTeams[t].length < maxPlayersPerTeam));
      if (candidates.length === 0) {
        unassigned.push(player);
        continue;
      }

      for (const t of candidates) {
        let cost = calculateHistoryPenalty(player, t, historyMap);

        // Penalidade de concentração de posição
        const posCount = currentTeams[t].filter(p => p.position === player.position).length;
        if (player.position === 'Goleiro') {
          cost += posCount * 5000;
        } else {
          cost += posCount * 15;
        }

        // Equilíbrio no tamanho dos times
        cost += currentTeams[t].length * 5;

        // Variação estocástica pequena para desempatar e garantir sorteios dinâmicos
        cost += Math.random() * 2;

        if (cost < minTeamCost) {
          minTeamCost = cost;
          bestTeam = t;
        }
      }

      if (bestTeam) {
        currentTeams[bestTeam].push(player);
      } else {
        unassigned.push(player);
      }
    }

    // Otimização local por trocas (2-opt) entre times não-campeões
    let improved = true;
    let passes = 0;
    while (improved && passes < 10) {
      improved = false;
      passes++;
      const nonChampTeams = activeTeams.filter(t => !(shouldFixChampions && t === champTeamStr));

      for (let i = 0; i < nonChampTeams.length; i++) {
        for (let j = i + 1; j < nonChampTeams.length; j++) {
          const t1 = nonChampTeams[i];
          const t2 = nonChampTeams[j];

          for (let p1Idx = 0; p1Idx < currentTeams[t1].length; p1Idx++) {
            const p1 = currentTeams[t1][p1Idx];
            if (shouldFixChampions && champTeamStr === t1 && champPlayerIds.has(p1.id)) continue;

            for (let p2Idx = 0; p2Idx < currentTeams[t2].length; p2Idx++) {
              const p2 = currentTeams[t2][p2Idx];
              if (shouldFixChampions && champTeamStr === t2 && champPlayerIds.has(p2.id)) continue;

              // Manter consistência de goleiros
              if (p1.position === 'Goleiro' && p2.position !== 'Goleiro') continue;
              if (p2.position === 'Goleiro' && p1.position !== 'Goleiro') continue;

              const currentCost = calculateHistoryPenalty(p1, t1, historyMap) + calculateHistoryPenalty(p2, t2, historyMap);
              const swappedCost = calculateHistoryPenalty(p1, t2, historyMap) + calculateHistoryPenalty(p2, t1, historyMap);

              if (swappedCost < currentCost) {
                currentTeams[t1][p1Idx] = p2;
                currentTeams[t2][p2Idx] = p1;
                improved = true;
                break; // p1Idx foi trocado; interrompe p2Idx para evitar duplicação ou corrupção de índice
              }
            }
          }
        }
      }
    }

    // Avaliação da qualidade da solução
    let totalScore = 0;
    let trialViolations = 0;

    for (const t of activeTeams) {
      for (const p of currentTeams[t]) {
        if (!(shouldFixChampions && champTeamStr === t && champPlayerIds.has(p.id))) {
          const hist = historyMap.get(p.id) || [];
          if (hist.length > 0 && hist[0] === t) {
            trialViolations++;
          }
          totalScore += calculateHistoryPenalty(p, t, historyMap);
        }
      }
    }

    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestViolations = trialViolations;
      bestSolution = { teamMap: currentTeams, unassigned };
      if (bestScore === 0) break; // Solução perfeita encontrada
    }
  }

  const finalSolution = bestSolution || { teamMap: initialTeams, unassigned: playersToDraw };

  // Garantia estrita de integridade: remover qualquer duplicata residual por segurança
  const cleanTeamMap: Record<string, DrawPlayer[]> = {};
  const globalSeenIds = new Set<string>();

  for (const t of activeTeams) {
    cleanTeamMap[t] = [];
    for (const p of finalSolution.teamMap[t] || []) {
      if (!globalSeenIds.has(p.id)) {
        globalSeenIds.add(p.id);
        cleanTeamMap[t].push(p);
      }
    }
  }

  const cleanUnassigned: DrawPlayer[] = [];
  for (const p of finalSolution.unassigned || []) {
    if (!globalSeenIds.has(p.id)) {
      globalSeenIds.add(p.id);
      cleanUnassigned.push(p);
    }
  }

  const diagnostic = bestViolations === 0
    ? 'Distribuição ótima alcançada sem repetições consecutivas de time.'
    : `Distribuição válida gerada com ${bestViolations} repetição(ões) inevitável(is) devido a restrições de vagas/capacidade.`;

  return {
    teamMap: cleanTeamMap,
    unassigned: cleanUnassigned,
    violationsCount: bestViolations,
    diagnostic
  };
}
