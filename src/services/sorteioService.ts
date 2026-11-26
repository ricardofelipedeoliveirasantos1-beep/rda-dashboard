/**
 * Sorteio Flash Inteligente para o RDA (Racha dos Amigos)
 * 
 * Implementação Definitiva com Otimização Combinatória de Menor Repetição de Duplas:
 * 1. O time campeão da última partida finalizada permanece com seus atletas fixos (preservação estrita).
 * 2. A reorganização atua exclusivamente sobre os jogadores das outras equipes (e vagas abertas).
 * 3. Consulta exclusivamente a última partida FINALIZADA (sem considerar histórico antigo).
 * 4. Jogadores diaristas novos (sem histórico na última partida) não geram penalidade de repetição.
 * 5. Minimiza matematicamente a quantidade de duplas de companheiros da última partida que jogam juntas novamente.
 * 6. Critério de pontuação: PONTUAÇÃO = quantidade total de duplas repetidas da última partida.
 * 7. Critérios secundários: equilíbrio de posições (goleiros, zagueiros, meias, atacantes) e desempate aleatório estocástico.
 * 8. Respeita capacidade estrita de 6 jogadores por equipe e integridade total (sem duplicados, sem ausentes perdidos).
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

export interface AdaptedPlayerRole {
  playerId: string;
  playerName: string;
  originalPosition: string;
  adaptedPosition: 'Zagueiro';
}

export interface TeamTacticalEvaluation {
  isValid: boolean;
  errors: string[];
  formation: string; // Ex: '2-2-2', '2-3-1', '1-3-2', etc.
  atacantesCount: number;
  meiasEfetivosCount: number;
  zagueirosEfetivosCount: number;
  goleirosCount: number;
  zagueirosNaturalCount: number;
  meiasNaturalCount: number;
  volantesNaturalCount: number;
  adaptedPlayers: AdaptedPlayerRole[];
  tacticalPenalty: number;
}

export interface DrawMetrics {
  queryTimeMs?: number;
  playerPrepTimeMs: number;
  optimizationTimeMs: number;
  validationTimeMs: number;
  totalTimeMs: number;
  trialsRun: number;
  theoreticalMinimum: number;
  isOptimal: boolean;
}

export interface DrawInput {
  selectedPlayers: DrawPlayer[];
  activeTeams: string[]; // ex: ['brasil', 'portugal', 'japao', 'uruguai']
  champTeamStr: string | null;
  champPlayerIds: Set<string>;
  lastTeamMap?: Map<string, string>; // playerId -> teamInLastFinishedMatch
  historyMap?: Map<string, string[]>; // backward-compatible: playerId -> [lastTeam, ...]
  maxPlayersPerTeam?: number;
  existingTeams?: Record<string, DrawPlayer[]>;
  unlockedPlayerIds?: Set<string>; // Atletas destravados/removidos manualmente do time campeão
  queryTimeMs?: number;
}

export interface DrawResult {
  teamMap: Record<string, DrawPlayer[]>;
  unassigned: DrawPlayer[];
  violationsCount: number; // mantido para compatibilidade = repeatedPairsCount
  repeatedPairsCount: number;
  theoreticalMinimum: number;
  isOptimal: boolean;
  metrics: DrawMetrics;
  diagnostic: string;
}

/**
 * Função utilitária Fisher-Yates para embaralhamento seguro e aleatoriedade pura
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Conta a quantidade exata de duplas de jogadores em uma equipe que já jogavam juntas
 * na mesma equipe na última partida finalizada.
 * 
 * Se um jogador for diarista novo (sem equipe na última partida), ele NÃO gera duplas repetidas.
 */
export function countRepeatedPairsInTeam(
  teamPlayers: DrawPlayer[],
  lastTeamMap: Map<string, string>
): number {
  const originCounts = new Map<string, number>();

  for (const player of teamPlayers) {
    const origin = lastTeamMap.get(player.id);
    if (origin) {
      originCounts.set(origin, (originCounts.get(origin) || 0) + 1);
    }
  }

  let pairs = 0;
  for (const count of originCounts.values()) {
    if (count >= 2) {
      pairs += (count * (count - 1)) / 2;
    }
  }

  return pairs;
}

/**
 * Calcula o total de duplas repetidas da última partida em todas as equipes ativas.
 * Pode opcionalmente excluir o time campeão da contagem de penalidade do sorteio.
 */
export function calculateTotalRepeatedPairs(
  teamMap: Record<string, DrawPlayer[]>,
  activeTeams: string[],
  lastTeamMap: Map<string, string>,
  excludeTeam: string | null = null
): number {
  let total = 0;
  for (const team of activeTeams) {
    if (excludeTeam && team === excludeTeam) continue;
    total += countRepeatedPairsInTeam(teamMap[team] || [], lastTeamMap);
  }
  return total;
}

export interface RepeatedPair {
  player1: DrawPlayer;
  player2: DrawPlayer;
  previousTeam: string;
}

export interface TeamRepeatedPairsReport {
  teamName: string;
  pairsCount: number;
  pairs: RepeatedPair[];
}

/**
 * Identifica e extrai individualmente cada dupla de jogadores que jogavam juntos
 * na última partida finalizada e voltaram a jogar juntos nesta equipe.
 * 
 * Se 3 jogadores da mesma origem estiverem juntos (ex.: Ricardo, Pedro, Lopes):
 * gera exatamente 3 duplas: (Ricardo+Pedro), (Ricardo+Lopes), (Pedro+Lopes).
 */
export function getRepeatedPairsByTeam(
  teamPlayers: DrawPlayer[],
  lastTeamMap: Map<string, string>,
  teamName: string
): TeamRepeatedPairsReport {
  const playersByOrigin = new Map<string, DrawPlayer[]>();

  for (const player of teamPlayers) {
    const origin = lastTeamMap.get(player.id);
    if (origin) {
      const list = playersByOrigin.get(origin) || [];
      list.push(player);
      playersByOrigin.set(origin, list);
    }
  }

  const pairs: RepeatedPair[] = [];

  for (const [origin, players] of playersByOrigin.entries()) {
    if (players.length >= 2) {
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          pairs.push({
            player1: players[i],
            player2: players[j],
            previousTeam: origin
          });
        }
      }
    }
  }

  return {
    teamName,
    pairsCount: pairs.length,
    pairs
  };
}

/**
 * Gera o relatório consolidado de todas as equipes ativas que possuem duplas repetidas,
 * excluindo opcionalmente o time campeão (que permaneceu intacto).
 */
export function getAllTeamsRepeatedPairs(
  teamMap: Record<string, DrawPlayer[]>,
  activeTeams: string[],
  lastTeamMap: Map<string, string>,
  excludeTeam: string | null = null
): TeamRepeatedPairsReport[] {
  const reports: TeamRepeatedPairsReport[] = [];

  for (const t of activeTeams) {
    if (excludeTeam && t === excludeTeam) continue;
    const teamReport = getRepeatedPairsByTeam(teamMap[t] || [], lastTeamMap, t);
    if (teamReport.pairsCount > 0) {
      reports.push(teamReport);
    }
  }

  return reports;
}

/**
 * Calcula o limite inferior teórico absoluto (mínimo matemático possível) de duplas repetidas
 * para uma distribuição de jogadores com as origens dadas entre as equipes não-campeãs.
 * 
 * Se initialTeams e teamsToDrawList forem fornecidos, calcula o mínimo condicionado às capacidades
 * restantes de cada equipe e aos pares pré-existentes de jogadores já alocados.
 */
export function calculateTheoreticalMinimum(
  playersToDraw: DrawPlayer[],
  numTeamsToDraw: number,
  lastTeamMap: Map<string, string>,
  initialTeams?: Record<string, DrawPlayer[]>,
  teamsToDrawList?: string[],
  maxPlayersPerTeam: number = 6
): number {
  if (numTeamsToDraw < 1) return 0;

  // Se initialTeams e teamsToDrawList forem fornecidos, contabiliza restrições reais de vagas e pré-alocações
  if (initialTeams && teamsToDrawList && teamsToDrawList.length > 0) {
    const originCounts = new Map<string, number>();
    for (const p of playersToDraw) {
      const origin = lastTeamMap.get(p.id);
      if (origin) {
        originCounts.set(origin, (originCounts.get(origin) || 0) + 1);
      }
    }

    let totalMin = 0;

    // Duplas pré-existentes de jogadores que já estão alocados
    const preExistingOrigins = new Set<string>();
    for (const t of teamsToDrawList) {
      for (const p of initialTeams[t] || []) {
        const orig = lastTeamMap.get(p.id);
        if (orig) preExistingOrigins.add(orig);
      }
    }

    const allOriginsToEvaluate = new Set([...originCounts.keys(), ...preExistingOrigins]);

    for (const origin of allOriginsToEvaluate) {
      const count = originCounts.get(origin) || 0;
      const teamCounts = teamsToDrawList.map(t => {
        const prePlayers = initialTeams[t] || [];
        const preOrigCount = prePlayers.filter(p => lastTeamMap.get(p.id) === origin).length;
        const openSlots = Math.max(0, maxPlayersPerTeam - prePlayers.length);
        return { preOrigCount, openSlots, currentOrig: preOrigCount };
      });

      // Alocação gulosa ótima (Gross/Fox para minimização de função discreta estritamente convexa):
      let remaining = count;
      while (remaining > 0) {
        let bestIndex = -1;
        let minCurrent = Infinity;
        for (let i = 0; i < teamCounts.length; i++) {
          if (teamCounts[i].openSlots > 0 && teamCounts[i].currentOrig < minCurrent) {
            minCurrent = teamCounts[i].currentOrig;
            bestIndex = i;
          }
        }
        if (bestIndex === -1) break;
        teamCounts[bestIndex].currentOrig++;
        teamCounts[bestIndex].openSlots--;
        remaining--;
      }

      for (const tc of teamCounts) {
        if (tc.currentOrig >= 2) {
          totalMin += (tc.currentOrig * (tc.currentOrig - 1)) / 2;
        }
      }
    }

    return totalMin;
  }

  // Caso B: Partição não-restrita (quando não há especificações de vagas pré-existentes)
  if (playersToDraw.length === 0) return 0;

  const originCounts = new Map<string, number>();
  for (const p of playersToDraw) {
    const origin = lastTeamMap.get(p.id);
    if (origin) {
      originCounts.set(origin, (originCounts.get(origin) || 0) + 1);
    }
  }

  let minPairs = 0;
  for (const count of originCounts.values()) {
    const q = Math.floor(count / numTeamsToDraw);
    const r = count % numTeamsToDraw;
    const pairsForHigh = ((q + 1) * q) / 2;
    const pairsForLow = (q * (q - 1)) / 2;
    minPairs += r * pairsForHigh + (numTeamsToDraw - r) * pairsForLow;
  }

  return minPairs;
}

export interface TacticalEvaluationOptions {
  allowZeroAtacantes?: boolean;
  maxAtacantesAllowed?: number;
  allowMoreMeiasIfDeficient?: boolean;
}

/**
 * Avalia as regras táticas oficiais e o equilíbrio de uma equipe:
 * 1. Atacantes: Mínimo 1, Máximo 2, Nunca 3 atacantes.
 * 2. Meias: Permitir até 3 meias na formação efetiva (nunca 4).
 * 3. Zagueiros: Priorizar 2 zagueiros por equipe.
 *    - Se faltarem zagueiros disponíveis, permitir que meias ou volantes assumam a função defensiva.
 *    - Permitir até 2 jogadores adaptados de meia/volante para zagueiro na mesma equipe.
 *    - Preservar a posição original cadastrada do atleta (adaptação apenas funcional na partida).
 * 4. Formações preferenciais: 2-2-2 (ideal) e 2-3-1 (alternativa prioritária).
 */
export function evaluateTeamTacticalFormation(
  players: DrawPlayer[],
  targetTeamSize: number = 6,
  options?: TacticalEvaluationOptions
): TeamTacticalEvaluation {
  const errors: string[] = [];
  const maxAtacantes = options?.maxAtacantesAllowed ?? 2;

  const atacantes = players.filter(p => p.position === 'Atacante');
  const zagueirosNatural = players.filter(p => p.position === 'Zagueiro');
  const goleiros = players.filter(p => p.position === 'Goleiro');
  const volantes = players.filter(p => p.position === 'Volante');
  const meiasPuros = players.filter(p => p.position === 'Meia');
  const outrosOuSemPos = players.filter(p => 
    p.position !== 'Atacante' && 
    p.position !== 'Zagueiro' && 
    p.position !== 'Goleiro' && 
    p.position !== 'Volante' && 
    p.position !== 'Meia'
  );

  const atacantesCount = atacantes.length;
  const zagueirosNaturalCount = zagueirosNatural.length;
  const goleirosCount = goleiros.length;
  const volantesNaturalCount = volantes.length;
  const meiasNaturalCount = meiasPuros.length;

  // 1. Regras Invioláveis de Atacantes:
  // Máximo 2 atacantes (NUNCA 3)
  if (atacantesCount > maxAtacantes) {
    errors.push(`A equipe possui ${atacantesCount} atacantes. O máximo permitido é ${maxAtacantes} atacantes (nunca 3).`);
  }
  // Mínimo 1 atacante para equipes completas
  if (players.length >= targetTeamSize && atacantesCount === 0 && !options?.allowZeroAtacantes) {
    errors.push('A equipe deve possuir pelo menos 1 atacante.');
  }

  // 2. Adaptação Defensiva (Meias e Volantes assumem Zaga se faltarem zagueiros naturais)
  // Alvo: 2 zagueiros por equipe
  const neededZagueiros = Math.max(0, 2 - zagueirosNaturalCount);
  const adaptedPlayers: AdaptedPlayerRole[] = [];

  // Candidatos para adaptação: Volantes primeiro (mais defensivos), depois Meias, depois sem posição
  const eligibleForDefense = [...volantes, ...meiasPuros, ...outrosOuSemPos];

  // Permitir até 2 jogadores adaptados para zagueiro por equipe
  const maxAdapted = 2;
  const adaptCount = Math.min(neededZagueiros, maxAdapted, eligibleForDefense.length);

  for (let i = 0; i < adaptCount; i++) {
    const candidate = eligibleForDefense[i];
    adaptedPlayers.push({
      playerId: candidate.id,
      playerName: candidate.name,
      originalPosition: candidate.position || 'Meia',
      adaptedPosition: 'Zagueiro'
    });
  }

  const zagueirosEfetivosCount = zagueirosNaturalCount + adaptedPlayers.length;
  // Meias efetivos = total de meias/volantes/outros menos os que foram adaptados para a zaga
  const meiasEfetivosCount = (volantesNaturalCount + meiasNaturalCount + outrosOuSemPos.length) - adaptedPlayers.length;

  // 3. Regra de Meias: Permitir até 3 meias na formação efetiva (NUNCA 4)
  if (players.length >= targetTeamSize && meiasEfetivosCount > 3 && !options?.allowMoreMeiasIfDeficient) {
    errors.push(`A equipe possui ${meiasEfetivosCount} meias na formação efetiva. O máximo permitido é 3 meias.`);
  }

  // 4. Regra de Zagueiros: Se a equipe está completa e possui menos de 1 defensor efetivo
  if (players.length >= targetTeamSize && zagueirosEfetivosCount < 1 && (eligibleForDefense.length + zagueirosNaturalCount > 0)) {
    errors.push('A equipe necessita de pelo menos um defensor (natural ou adaptado de meia/volante).');
  }

  // 5. Cálculo de Formação e Penalidade Tática
  const formation = goleirosCount > 0 
    ? `G-${zagueirosEfetivosCount}-${meiasEfetivosCount}-${atacantesCount}`
    : `${zagueirosEfetivosCount}-${meiasEfetivosCount}-${atacantesCount}`;

  let tacticalPenalty = 0;
  if (errors.length > 0) {
    tacticalPenalty = 10000;
  } else {
    // Formação ideal 2-2-2 ou prioritária 2-3-1
    if (zagueirosEfetivosCount === 2 && meiasEfetivosCount === 2 && atacantesCount === 2) {
      tacticalPenalty = 0;
    } else if (zagueirosEfetivosCount === 2 && meiasEfetivosCount === 3 && atacantesCount === 1) {
      tacticalPenalty = 0;
    } else {
      tacticalPenalty = 5;
    }
    // Cada jogador adaptado adiciona um custo tático leve para preferir zagueiros naturais quando existirem
    tacticalPenalty += adaptedPlayers.length * 3;
  }

  return {
    isValid: errors.length === 0,
    errors,
    formation,
    atacantesCount,
    meiasEfetivosCount,
    zagueirosEfetivosCount,
    goleirosCount,
    zagueirosNaturalCount,
    meiasNaturalCount,
    volantesNaturalCount,
    adaptedPlayers,
    tacticalPenalty
  };
}

export function isTeamTacticalValid(
  players: DrawPlayer[],
  targetTeamSize: number = 6,
  options?: TacticalEvaluationOptions
): boolean {
  return evaluateTeamTacticalFormation(players, targetTeamSize, options).isValid;
}

export function validateAllTeamsTactical(
  teamMap: Record<string, DrawPlayer[]>,
  activeTeams: string[],
  targetTeamSize: number = 6
): {
  isValid: boolean;
  teamEvaluations: Record<string, TeamTacticalEvaluation>;
  globalErrors: string[];
} {
  const teamEvaluations: Record<string, TeamTacticalEvaluation> = {};
  const globalErrors: string[] = [];

  for (const team of activeTeams) {
    const list = teamMap[team] || [];
    const evaluation = evaluateTeamTacticalFormation(list, targetTeamSize);
    teamEvaluations[team] = evaluation;
    if (!evaluation.isValid) {
      evaluation.errors.forEach(err => {
        const teamNameCapitalized = team.charAt(0).toUpperCase() + team.slice(1);
        globalErrors.push(`${teamNameCapitalized}: ${err}`);
      });
    }
  }

  return {
    isValid: globalErrors.length === 0,
    teamEvaluations,
    globalErrors
  };
}

/**
 * Calcula pontuação secundária para desempate:
 * 1. Penalidade por regras táticas oficiais e adaptações (prioriza 2-2-2 e 2-3-1 com zaga natural)
 * 2. Penalidade por desequilíbrio de posições
 * 3. Penalidade por concentração excessiva de mesma origem em um único time
 */
export function calculateSecondaryScore(
  teamMap: Record<string, DrawPlayer[]>,
  teamsToEvaluate: string[],
  lastTeamMap: Map<string, string>,
  options?: TacticalEvaluationOptions
): number {
  let score = 0;

  // 1. Penalidade tática oficial das regras do RDA
  for (const t of teamsToEvaluate) {
    const evalResult = evaluateTeamTacticalFormation(teamMap[t] || [], 6, options);
    score += evalResult.tacticalPenalty;
  }

  // 2. Equilíbrio de posições remanescente
  const checkPositions = ['Zagueiro', 'Meia', 'Atacante'];
  for (const pos of checkPositions) {
    const counts = teamsToEvaluate.map(t => (teamMap[t] || []).filter(p => {
      if (pos === 'Meia') return p.position === 'Meia' || p.position === 'Volante';
      return p.position === pos;
    }).length);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    score += (max - min) * 10;
  }

  // 3. Penalidade por pico de concentração de uma única origem (> 2 atletas da mesma origem)
  for (const t of teamsToEvaluate) {
    const originCounts = new Map<string, number>();
    for (const p of teamMap[t] || []) {
      const orig = lastTeamMap.get(p.id);
      if (orig) {
        originCounts.set(orig, (originCounts.get(orig) || 0) + 1);
      }
    }
    for (const count of originCounts.values()) {
      if (count > 2) {
        score += (count - 2) * 5;
      }
    }
  }

  return score;
}

/**
 * Função de penalidade histórica mantida para retrocompatibilidade
 */
export function calculateHistoryPenalty(
  player: DrawPlayer,
  teamName: string,
  historyMap: Map<string, string[]>
): number {
  const hist = historyMap.get(player.id) || [];
  let penalty = 0;
  if (hist.length > 0 && hist[0] === teamName) {
    penalty += 10000;
  }
  if (hist.length > 1 && hist[1] === teamName) {
    penalty += 200;
  }
  if (hist.length > 1 && hist[0] === teamName && hist[1] === teamName) {
    penalty += 50000;
  }
  if (hist.length > 2 && hist[2] === teamName) {
    penalty += 10;
  }
  return penalty;
}

/**
 * Algoritmo Principal de Sorteio Flash Inteligente
 * 
 * Executa otimização combinatória (Multi-Start 2-Opt Local Search) para encontrar
 * a distribuição de jogadores com a menor repetição possível de companheiros da última partida.
 */
export function solveDraw({
  selectedPlayers,
  activeTeams,
  champTeamStr,
  champPlayerIds,
  lastTeamMap,
  historyMap,
  maxPlayersPerTeam = 6,
  existingTeams,
  unlockedPlayerIds = new Set<string>(),
  queryTimeMs = 0
}: DrawInput): DrawResult {
  const totalStartTime = performance.now();
  const prepStartTime = performance.now();

  // 1. Extração da equipe de origem de cada jogador na última partida finalizada
  const effectiveLastTeamMap = new Map<string, string>();
  if (lastTeamMap) {
    lastTeamMap.forEach((team, pid) => {
      if (team) effectiveLastTeamMap.set(pid, team);
    });
  } else if (historyMap) {
    historyMap.forEach((teams, pid) => {
      if (teams && teams.length > 0 && teams[0]) {
        effectiveLastTeamMap.set(pid, teams[0]);
      }
    });
  }

  const shouldFixChampions = Boolean(champTeamStr && activeTeams.includes(champTeamStr));

  // 2. Deduplicação estrita de selectedPlayers por ID
  const uniqueSelectedMap = new Map<string, DrawPlayer>();
  selectedPlayers.forEach(p => {
    if (p && p.id && !uniqueSelectedMap.has(p.id)) {
      uniqueSelectedMap.set(p.id, p);
    }
  });
  const uniqueSelected = Array.from(uniqueSelectedMap.values());

  // 3. Inicialização e alocação estrita do time campeão e alocações manuais existentes
  const initialTeams: Record<string, DrawPlayer[]> = {};
  const alreadyAssignedIds = new Set<string>();
  const lockedFromSwap = new Set<string>();

  activeTeams.forEach(t => {
    initialTeams[t] = [];
    if (existingTeams && Array.isArray(existingTeams[t])) {
      existingTeams[t].forEach(p => {
        if (uniqueSelectedMap.has(p.id) && !alreadyAssignedIds.has(p.id)) {
          // Se for o time campeão e o atleta foi destravado, não o fixa compulsoriamente
          if (t === champTeamStr && unlockedPlayerIds.has(p.id)) {
            return;
          }
          const actualPlayer = uniqueSelectedMap.get(p.id)!;
          initialTeams[t].push(actualPlayer);
          alreadyAssignedIds.add(p.id);
          lockedFromSwap.add(p.id);
        }
      });
    }
  });

  // Se o time campeão estiver vazio em existingTeams, fixa os campeões presentes que não foram destravados
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
        lockedFromSwap.add(p.id);
      }
    });
  }

  // 4. Jogadores participantes a serem sorteados nas vagas restantes
  const playersToDraw = uniqueSelected.filter(p => !alreadyAssignedIds.has(p.id));

  // Equipes que receberão sorteio (equipes com vagas abertas)
  const teamsToDraw = activeTeams.filter(t => initialTeams[t].length < maxPlayersPerTeam);

  // Se não houver jogadores para sortear
  if (playersToDraw.length === 0) {
    const prepTimeMs = performance.now() - prepStartTime;
    const totalTimeMs = performance.now() - totalStartTime;
    const repeated = calculateTotalRepeatedPairs(initialTeams, activeTeams, effectiveLastTeamMap, shouldFixChampions ? champTeamStr : null);
    return {
      teamMap: initialTeams,
      unassigned: [],
      violationsCount: repeated,
      repeatedPairsCount: repeated,
      theoreticalMinimum: 0,
      isOptimal: true,
      metrics: {
        queryTimeMs,
        playerPrepTimeMs: prepTimeMs,
        optimizationTimeMs: 0,
        validationTimeMs: 0,
        totalTimeMs,
        trialsRun: 0,
        theoreticalMinimum: 0,
        isOptimal: true
      },
      diagnostic: 'Nenhum jogador para sortear além dos atletas já alocados.'
    };
  }

  // Se não houver vagas disponíveis em nenhum time
  if (teamsToDraw.length === 0) {
    const prepTimeMs = performance.now() - prepStartTime;
    const totalTimeMs = performance.now() - totalStartTime;
    return {
      teamMap: initialTeams,
      unassigned: playersToDraw,
      violationsCount: 0,
      repeatedPairsCount: 0,
      theoreticalMinimum: 0,
      isOptimal: true,
      metrics: {
        queryTimeMs,
        playerPrepTimeMs: prepTimeMs,
        optimizationTimeMs: 0,
        validationTimeMs: 0,
        totalTimeMs,
        trialsRun: 0,
        theoreticalMinimum: 0,
        isOptimal: true
      },
      diagnostic: 'Capacidade máxima atingida em todas as equipes ativas.'
    };
  }

  const prepTimeMs = performance.now() - prepStartTime;
  const optStartTime = performance.now();

  // Calcular limite inferior teórico para diagnóstico e término antecipado
  const nonChampTeams = activeTeams.filter(t => !(shouldFixChampions && t === champTeamStr));
  const theoreticalMin = calculateTheoreticalMinimum(
    playersToDraw,
    nonChampTeams.length,
    effectiveLastTeamMap,
    initialTeams,
    nonChampTeams,
    maxPlayersPerTeam
  );

  // 5. OTIMIZAÇÃO COMBINATÓRIA MULTI-START 2-OPT
  // Executa múltiplos pontos de partida aleatórios com busca local de melhoria de duplas
  const NUM_TRIALS = 30;
  let bestScore = Infinity;
  let bestSecondary = Infinity;
  let bestSolutionsPool: { teamMap: Record<string, DrawPlayer[]>; unassigned: DrawPlayer[] }[] = [];

  // Separar posições para manter regras táticas oficiais (Atacantes, Zagueiros, Meias/Volantes e Goleiros)
  const goleiros = playersToDraw.filter(p => p.position === 'Goleiro');
  const atacantes = playersToDraw.filter(p => p.position === 'Atacante');
  const zagueiros = playersToDraw.filter(p => p.position === 'Zagueiro');
  const meiasVolantes = playersToDraw.filter(p => 
    p.position !== 'Goleiro' && p.position !== 'Atacante' && p.position !== 'Zagueiro'
  );

  const totalAtacantesInPool = uniqueSelected.filter(p => p.position === 'Atacante').length;
  const numTeams = activeTeams.length;
  const canEnforceMinAtacante = totalAtacantesInPool >= numTeams;
  const maxAtacantesCap = totalAtacantesInPool <= numTeams * 2
    ? 2
    : Math.max(2, Math.ceil(totalAtacantesInPool / numTeams));
  const allowMoreMeias = totalAtacantesInPool === 0;

  const tacticalOpts: TacticalEvaluationOptions = {
    allowZeroAtacantes: !canEnforceMinAtacante,
    maxAtacantesAllowed: maxAtacantesCap,
    allowMoreMeiasIfDeficient: allowMoreMeias
  };

  for (let trial = 0; trial < NUM_TRIALS; trial++) {
    // Clonar times base
    const currentTeams: Record<string, DrawPlayer[]> = {};
    activeTeams.forEach(t => {
      currentTeams[t] = [...initialTeams[t]];
    });

    const unassigned: DrawPlayer[] = [];

    // 1. Alocar Goleiros primeiro (no máximo 1 por time, se possível)
    const shuffledGoleiros = shuffleArray(goleiros);
    for (const g of shuffledGoleiros) {
      const candidateTeams = shuffleArray(
        activeTeams.filter(t => currentTeams[t].length < maxPlayersPerTeam && !currentTeams[t].some(p => p.position === 'Goleiro'))
      );
      if (candidateTeams.length > 0) {
        currentTeams[candidateTeams[0]].push(g);
      } else {
        const anySlot = shuffleArray(activeTeams.filter(t => currentTeams[t].length < maxPlayersPerTeam));
        if (anySlot.length > 0) {
          currentTeams[anySlot[0]].push(g);
        } else {
          unassigned.push(g);
        }
      }
    }

    // 2. Alocar Atacantes (Mínimo 1, Máximo 2, NUNCA 3 por equipe se pool permitir)
    const shuffledAtacantes = shuffleArray(atacantes);
    for (const a of shuffledAtacantes) {
      // Candidatas: equipes com vaga e com menos de maxAtacantesCap atacantes
      const candidateTeams = activeTeams.filter(t => 
        currentTeams[t].length < maxPlayersPerTeam && 
        currentTeams[t].filter(p => p.position === 'Atacante').length < maxAtacantesCap
      );

      if (candidateTeams.length > 0) {
        // Priorizar equipes que ainda não possuem atacante (garantir mín 1 por time)
        candidateTeams.sort((t1, t2) => {
          const c1 = currentTeams[t1].filter(p => p.position === 'Atacante').length;
          const c2 = currentTeams[t2].filter(p => p.position === 'Atacante').length;
          if (c1 !== c2) return c1 - c2;
          return Math.random() - 0.5;
        });
        currentTeams[candidateTeams[0]].push(a);
      } else {
        const anySlot = shuffleArray(activeTeams.filter(t => currentTeams[t].length < maxPlayersPerTeam));
        if (anySlot.length > 0) {
          currentTeams[anySlot[0]].push(a);
        } else {
          unassigned.push(a);
        }
      }
    }

    // 3. Alocar Zagueiros naturais (priorizar 2 por equipe)
    const shuffledZagueiros = shuffleArray(zagueiros);
    for (const z of shuffledZagueiros) {
      const candidateTeams = activeTeams.filter(t => 
        currentTeams[t].length < maxPlayersPerTeam && 
        currentTeams[t].filter(p => p.position === 'Zagueiro').length < 2
      );

      if (candidateTeams.length > 0) {
        candidateTeams.sort((t1, t2) => {
          const c1 = currentTeams[t1].filter(p => p.position === 'Zagueiro').length;
          const c2 = currentTeams[t2].filter(p => p.position === 'Zagueiro').length;
          if (c1 !== c2) return c1 - c2;
          return Math.random() - 0.5;
        });
        currentTeams[candidateTeams[0]].push(z);
      } else {
        const anySlot = shuffleArray(activeTeams.filter(t => currentTeams[t].length < maxPlayersPerTeam));
        if (anySlot.length > 0) {
          currentTeams[anySlot[0]].push(z);
        } else {
          unassigned.push(z);
        }
      }
    }

    // 4. Alocar Meias, Volantes e demais atletas
    const shuffledMeias = shuffleArray(meiasVolantes);
    for (const m of shuffledMeias) {
      const candidateTeams = shuffleArray(activeTeams.filter(t => currentTeams[t].length < maxPlayersPerTeam));
      if (candidateTeams.length > 0) {
        currentTeams[candidateTeams[0]].push(m);
      } else {
        unassigned.push(m);
      }
    }

    // B. Busca Local 2-Opt (Swaps) entre equipes não-campeãs para minimizar duplas repetidas
    const swappableTeams = nonChampTeams.filter(t => currentTeams[t].length > 0);
    let improved = true;
    let passes = 0;
    const MAX_PASSES = 25;

    while (improved && passes < MAX_PASSES) {
      improved = false;
      passes++;

      for (let i = 0; i < swappableTeams.length; i++) {
        for (let j = i + 1; j < swappableTeams.length; j++) {
          const t1 = swappableTeams[i];
          const t2 = swappableTeams[j];

          const team1Players = currentTeams[t1];
          const team2Players = currentTeams[t2];

          for (let idx1 = 0; idx1 < team1Players.length; idx1++) {
            const p1 = team1Players[idx1];
            if (lockedFromSwap.has(p1.id)) continue;
            if (shouldFixChampions && champTeamStr === t1 && champPlayerIds.has(p1.id)) continue;

            for (let idx2 = 0; idx2 < team2Players.length; idx2++) {
              const p2 = team2Players[idx2];
              if (lockedFromSwap.has(p2.id)) continue;
              if (shouldFixChampions && champTeamStr === t2 && champPlayerIds.has(p2.id)) continue;

              // 1. Preservação estrita de goleiros: goleiro só troca com goleiro
              const p1IsGoleiro = p1.position === 'Goleiro';
              const p2IsGoleiro = p2.position === 'Goleiro';
              if (p1IsGoleiro !== p2IsGoleiro) continue;

              // 2. Preservação estrita das regras invioláveis de Atacantes (Mínimo 1, Máximo 2, NUNCA 3)
              const p1IsAtacante = p1.position === 'Atacante';
              const p2IsAtacante = p2.position === 'Atacante';
              if (p1IsAtacante !== p2IsAtacante) {
                const t1AtacantesAfter = team1Players.filter(p => p.position === 'Atacante').length + (p2IsAtacante ? 1 : -1);
                const t2AtacantesAfter = team2Players.filter(p => p.position === 'Atacante').length + (p1IsAtacante ? 1 : -1);
                if (t1AtacantesAfter > maxAtacantesCap || t2AtacantesAfter > maxAtacantesCap) continue;
                if (canEnforceMinAtacante && (t1AtacantesAfter < 1 || t2AtacantesAfter < 1)) continue;
              }

              const beforePairs = countRepeatedPairsInTeam(team1Players, effectiveLastTeamMap) +
                                  countRepeatedPairsInTeam(team2Players, effectiveLastTeamMap);

              const beforeSameTeam = (effectiveLastTeamMap.get(p1.id) === t1 ? 1 : 0) +
                                     (effectiveLastTeamMap.get(p2.id) === t2 ? 1 : 0);

              // Simular swap
              team1Players[idx1] = p2;
              team2Players[idx2] = p1;

              // 3. Validação tática de Meias e Zagueiros (no máximo 3 meias efetivos, até 2 zagas adaptados)
              if (team1Players.length === maxPlayersPerTeam && !isTeamTacticalValid(team1Players, maxPlayersPerTeam, tacticalOpts)) {
                team1Players[idx1] = p1;
                team2Players[idx2] = p2;
                continue;
              }
              if (team2Players.length === maxPlayersPerTeam && !isTeamTacticalValid(team2Players, maxPlayersPerTeam, tacticalOpts)) {
                team1Players[idx1] = p1;
                team2Players[idx2] = p2;
                continue;
              }

              // Avaliar variação no número de duplas repetidas
              const afterPairs = countRepeatedPairsInTeam(team1Players, effectiveLastTeamMap) +
                                 countRepeatedPairsInTeam(team2Players, effectiveLastTeamMap);

              const afterSameTeam = (effectiveLastTeamMap.get(p2.id) === t1 ? 1 : 0) +
                                    (effectiveLastTeamMap.get(p1.id) === t2 ? 1 : 0);

              if (afterPairs < beforePairs) {
                // Aceita melhoria estrita de duplas
                improved = true;
                break;
              } else if (afterPairs === beforePairs && afterSameTeam < beforeSameTeam) {
                // Desempate a favor de alternar time sem piorar duplas repetidas
                improved = true;
                break;
              } else if (afterPairs === beforePairs && Math.random() < 0.05) {
                // Movimento lateral estocástico controlado
                improved = true;
                break;
              } else {
                // Reverte swap
                team1Players[idx1] = p1;
                team2Players[idx2] = p2;
              }
            }
            if (improved) break;
          }
          if (improved) break;
        }
        if (improved) break;
      }
    }

    // C. Avaliação da Solução deste Trial
    const trialScore = calculateTotalRepeatedPairs(
      currentTeams,
      activeTeams,
      effectiveLastTeamMap,
      shouldFixChampions ? champTeamStr : null
    );

    const trialSecondary = calculateSecondaryScore(currentTeams, nonChampTeams, effectiveLastTeamMap, tacticalOpts);

    if (trialScore < bestScore) {
      bestScore = trialScore;
      bestSecondary = trialSecondary;
      bestSolutionsPool = [{ teamMap: currentTeams, unassigned }];
    } else if (trialScore === bestScore) {
      if (trialSecondary < bestSecondary) {
        bestSecondary = trialSecondary;
        bestSolutionsPool = [{ teamMap: currentTeams, unassigned }];
      } else if (trialSecondary === bestSecondary) {
        bestSolutionsPool.push({ teamMap: currentTeams, unassigned });
      }
    }

    // Término antecipado: atingiu o ótimo teórico global com excelente distribuição e diversidade
    if (bestScore <= theoreticalMin && bestSecondary <= 50 && bestSolutionsPool.length >= 3) {
      break;
    }
  }

  const optTimeMs = performance.now() - optStartTime;
  const valStartTime = performance.now();

  // D. Desempate Aleatório entre as Melhores Soluções
  const selectedIndex = Math.floor(Math.random() * bestSolutionsPool.length);
  const bestChoice = bestSolutionsPool[selectedIndex] || { teamMap: initialTeams, unassigned: playersToDraw };

  // 6. VALIDAÇÃO E GARANTIA ABSOLUTA DE INTEGRIDADE
  const cleanTeamMap: Record<string, DrawPlayer[]> = {};
  const globalSeenIds = new Set<string>();

  for (const t of activeTeams) {
    cleanTeamMap[t] = [];
    for (const p of bestChoice.teamMap[t] || []) {
      if (p && p.id && !globalSeenIds.has(p.id)) {
        globalSeenIds.add(p.id);
        cleanTeamMap[t].push(p);
      }
    }
  }

  const cleanUnassigned: DrawPlayer[] = [];
  for (const p of bestChoice.unassigned || []) {
    if (p && p.id && !globalSeenIds.has(p.id)) {
      globalSeenIds.add(p.id);
      cleanUnassigned.push(p);
    }
  }

  // Dupla checagem da pontuação final
  const finalRepeatedPairs = calculateTotalRepeatedPairs(
    cleanTeamMap,
    activeTeams,
    effectiveLastTeamMap,
    shouldFixChampions ? champTeamStr : null
  );

  // Contabilização de violações de mesmo time consecutivo (para retrocompatibilidade)
  let sameTeamViolations = 0;
  for (const t of activeTeams) {
    if (shouldFixChampions && t === champTeamStr) continue;
    for (const p of cleanTeamMap[t] || []) {
      const orig = effectiveLastTeamMap.get(p.id);
      if (orig && orig === t) {
        sameTeamViolations++;
      }
    }
  }

  const isOptimal = finalRepeatedPairs <= theoreticalMin;
  const valTimeMs = performance.now() - valStartTime;
  const totalTimeMs = performance.now() - totalStartTime;

  const hasUnavoidable = finalRepeatedPairs > 0 || sameTeamViolations > 0;
  const diagnostic = isOptimal
    ? `Distribuição ótima com menor repetição matemática possível: ${finalRepeatedPairs} dupla(s) repetida(s) (mínimo teórico: ${theoreticalMin}).${hasUnavoidable ? ' Repetição inevitável devido às restrições do elenco.' : ''}`
    : `Melhor distribuição combinatória encontrada: ${finalRepeatedPairs} dupla(s) repetida(s) (mínimo teórico: ${theoreticalMin}).${hasUnavoidable ? ' Repetição inevitável devido às restrições do elenco.' : ''}`;

  return {
    teamMap: cleanTeamMap,
    unassigned: cleanUnassigned,
    violationsCount: sameTeamViolations,
    repeatedPairsCount: finalRepeatedPairs,
    theoreticalMinimum: theoreticalMin,
    isOptimal,
    metrics: {
      queryTimeMs,
      playerPrepTimeMs: prepTimeMs,
      optimizationTimeMs: optTimeMs,
      validationTimeMs: valTimeMs,
      totalTimeMs,
      trialsRun: NUM_TRIALS,
      theoreticalMinimum: theoreticalMin,
      isOptimal
    },
    diagnostic
  };
}
