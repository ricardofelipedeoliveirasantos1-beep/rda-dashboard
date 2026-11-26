import { describe, it, expect } from 'vitest';
import {
  solveDraw,
  countRepeatedPairsInTeam,
  calculateTotalRepeatedPairs,
  calculateTheoreticalMinimum,
  type DrawPlayer
} from '../services/sorteioService';

describe('RDA — Segunda Auditoria Técnica Complementar do Sorteio Flash', () => {
  const activeTeams = ['brasil', 'portugal', 'japao', 'uruguai'];

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

  // =========================================================================
  // 1. AUDITORIA MATEMÁTICA E LIMITE INFERIOR TEÓRICO
  // =========================================================================
  describe('1. Auditoria Matemática', () => {
    it('deve provar matematicamente o limite inferior em partição perfeitamente simétrica', () => {
      // 18 jogadores: 6 do Brasil, 6 de Portugal, 6 do Uruguai divididos em 3 equipes de 6
      const players: DrawPlayer[] = [
        ...Array.from({ length: 6 }, (_, i) => createPlayer(`b-${i}`, `Brasil ${i}`, 'Meia')),
        ...Array.from({ length: 6 }, (_, i) => createPlayer(`p-${i}`, `Portugal ${i}`, 'Meia')),
        ...Array.from({ length: 6 }, (_, i) => createPlayer(`u-${i}`, `Uruguai ${i}`, 'Meia'))
      ];

      const lastMap = new Map<string, string>();
      players.slice(0, 6).forEach(p => lastMap.set(p.id, 'brasil'));
      players.slice(6, 12).forEach(p => lastMap.set(p.id, 'portugal'));
      players.slice(12, 18).forEach(p => lastMap.set(p.id, 'uruguai'));

      // Prova matemática: cada origem (6 atletas) dividida em 3 equipes gera q = 2 atletas por equipe.
      // Duplas por origem = 3 * C(2,2) = 3 * 1 = 3 duplas.
      // Total para 3 origens = 3 * 3 = 9 duplas repetidas.
      const theoretical = calculateTheoreticalMinimum(players, 3, lastMap);
      expect(theoretical).toBe(9);

      const result = solveDraw({
        selectedPlayers: players,
        activeTeams: ['brasil', 'portugal', 'uruguai'],
        champTeamStr: null,
        champPlayerIds: new Set(),
        lastTeamMap: lastMap
      });

      expect(result.repeatedPairsCount).toBe(9);
      expect(result.isOptimal).toBe(true);
      expect(result.diagnostic).toContain('Distribuição ótima com menor repetição matemática possível: 9 dupla(s) repetida(s)');
    });

    it('deve calcular corretamente o limite inferior condicionado a capacidades assimétricas e vagas restantes', () => {
      // Cenário extremo: Equipe A tem apenas 1 vaga aberta, Equipe B tem 5 vagas abertas.
      // 5 jogadores do Brasil precisam ser alocados.
      const brasilPlayers = Array.from({ length: 5 }, (_, i) => createPlayer(`b-${i}`, `Brasil ${i}`, 'Meia'));
      const lastMap = new Map<string, string>();
      brasilPlayers.forEach(p => lastMap.set(p.id, 'brasil'));

      // Equipe 'brasil' já tem 5 atletas pré-alocados de outra origem (resta 1 vaga)
      // Equipe 'portugal' já tem 1 atleta pré-alocado (restam 5 vagas)
      const initialTeams: Record<string, DrawPlayer[]> = {
        brasil: Array.from({ length: 5 }, (_, i) => createPlayer(`x-${i}`, `Outro ${i}`, 'Meia')),
        portugal: [createPlayer('y-1', 'Outro Y', 'Meia')]
      };

      // Matematicamente:
      // Brasil só pode receber no máximo 1 jogador -> C(1,2) = 0 duplas.
      // Portugal deve receber os 4 jogadores restantes -> C(4,2) = 6 duplas.
      // Limite inferior real sob restrição de capacidade = 0 + 6 = 6 duplas repetidas.
      // (Se fosse relaxado sem capacidade, pensaria em 2 e 3 -> C(2,2)+C(3,2) = 4, o que seria inatingível!).
      const constrainedMin = calculateTheoreticalMinimum(
        brasilPlayers,
        2,
        lastMap,
        initialTeams,
        ['brasil', 'portugal'],
        6
      );

      expect(constrainedMin).toBe(6);

      // Executa o sorteio com essas equipes pré-existentes
      const result = solveDraw({
        selectedPlayers: [
          ...initialTeams.brasil,
          ...initialTeams.portugal,
          ...brasilPlayers
        ],
        activeTeams: ['brasil', 'portugal'],
        champTeamStr: null,
        champPlayerIds: new Set(),
        lastTeamMap: lastMap,
        existingTeams: initialTeams
      });

      expect(result.repeatedPairsCount).toBe(6);
      expect(result.isOptimal).toBe(true);
    });

    it('deve computar duplas para caso extremo de 1 equipe única ativa (numTeams = 1)', () => {
      const players = Array.from({ length: 4 }, (_, i) => createPlayer(`p-${i}`, `Jogador ${i}`, 'Meia'));
      const lastMap = new Map<string, string>();
      players.forEach(p => lastMap.set(p.id, 'origem_unica'));

      // Em 1 equipe, todos os 4 atletas são agrupados compulsoriamente: C(4,2) = 6 duplas repetidas.
      const theoretical = calculateTheoreticalMinimum(players, 1, lastMap);
      expect(theoretical).toBe(6);
    });
  });

  // =========================================================================
  // 2. AUDITORIA DE DIARISTAS E AUSÊNCIAS
  // =========================================================================
  describe('2. Auditoria de Diaristas e Ausências', () => {
    it('diaristas novos sem histórico nunca geram penalidades nem duplas repetidas', () => {
      const diaristasNovos = [
        createPlayer('d-1', 'Diarista 1', 'Meia', 'Diarista'),
        createPlayer('d-2', 'Diarista 2', 'Meia', 'Diarista'),
        createPlayer('d-3', 'Diarista 3', 'Meia', 'Diarista')
      ];

      // lastTeamMap vazio para os diaristas novos
      const lastMap = new Map<string, string>();

      const pairsInTeam = countRepeatedPairsInTeam(diaristasNovos, lastMap);
      expect(pairsInTeam).toBe(0);

      const totalPairs = calculateTotalRepeatedPairs(
        { brasil: diaristasNovos },
        ['brasil'],
        lastMap
      );
      expect(totalPairs).toBe(0);
    });

    it('diarista veterano que jogou a última partida tem seu histórico preservado exatamente como os mensalistas', () => {
      const diaristaVeterano = createPlayer('d-vet', 'Diarista Veterano', 'Meia', 'Diarista');
      const mensalista = createPlayer('m-1', 'Mensalista 1', 'Meia', 'Mensalista');

      const lastMap = new Map<string, string>([
        [diaristaVeterano.id, 'brasil'],
        [mensalista.id, 'brasil']
      ]);

      // Jogaram juntos no Brasil na última partida: se ficarem juntos, formam C(2,2) = 1 dupla repetida
      const pairs = countRepeatedPairsInTeam([diaristaVeterano, mensalista], lastMap);
      expect(pairs).toBe(1);
    });

    it('deve simular cenário com 5 ausências e 5 diaristas novos distribuindo com flexibilidade máxima', () => {
      // 13 veteranos (5 Brasil, 4 Portugal, 4 Uruguai) + 5 Diaristas novos = 18 atletas
      const veteranos: DrawPlayer[] = [
        ...Array.from({ length: 5 }, (_, i) => createPlayer(`vb-${i}`, `Vet B ${i}`, 'Meia')),
        ...Array.from({ length: 4 }, (_, i) => createPlayer(`vp-${i}`, `Vet P ${i}`, 'Meia')),
        ...Array.from({ length: 4 }, (_, i) => createPlayer(`vu-${i}`, `Vet U ${i}`, 'Meia'))
      ];
      const diaristas = Array.from({ length: 5 }, (_, i) => createPlayer(`dn-${i}`, `Diarista Novo ${i}`, 'Meia', 'Diarista'));

      const lastMap = new Map<string, string>();
      veteranos.slice(0, 5).forEach(p => lastMap.set(p.id, 'brasil'));
      veteranos.slice(5, 9).forEach(p => lastMap.set(p.id, 'portugal'));
      veteranos.slice(9, 13).forEach(p => lastMap.set(p.id, 'uruguai'));

      const result = solveDraw({
        selectedPlayers: [...veteranos, ...diaristas],
        activeTeams: ['brasil', 'portugal', 'uruguai'],
        champTeamStr: null,
        champPlayerIds: new Set(),
        lastTeamMap: lastMap
      });

      for (const t of ['brasil', 'portugal', 'uruguai']) {
        expect(result.teamMap[t]).toHaveLength(6);
      }
      expect(result.unassigned).toHaveLength(0);
      // Com 5 Brasil (2+2+1 -> 2 duplas), 4 Portugal (2+1+1 -> 1 dupla), 4 Uruguai (2+1+1 -> 1 dupla):
      // Mínimo teórico exato = 2 + 1 + 1 = 4 duplas repetidas.
      expect(result.theoreticalMinimum).toBe(4);
      expect(result.repeatedPairsCount).toBe(4);
      expect(result.isOptimal).toBe(true);
    });
  });

  // =========================================================================
  // 3. AUDITORIA DE POSIÇÕES E GOLEIROS
  // =========================================================================
  describe('3. Auditoria de Posições e Goleiros', () => {
    it('deve garantir exatamente 1 goleiro em cada equipe quando há 4 goleiros para 4 equipes', () => {
      const goleiros = [
        createPlayer('g-1', 'Goleiro 1', 'Goleiro'),
        createPlayer('g-2', 'Goleiro 2', 'Goleiro'),
        createPlayer('g-3', 'Goleiro 3', 'Goleiro'),
        createPlayer('g-4', 'Goleiro 4', 'Goleiro')
      ];

      const linha = Array.from({ length: 20 }, (_, i) => createPlayer(`l-${i}`, `Linha ${i}`, i % 2 === 0 ? 'Zagueiro' : 'Atacante'));

      const result = solveDraw({
        selectedPlayers: [...goleiros, ...linha],
        activeTeams,
        champTeamStr: null,
        champPlayerIds: new Set(),
        lastTeamMap: new Map()
      });

      for (const t of activeTeams) {
        expect(result.teamMap[t]).toHaveLength(6);
        const teamGoleiros = result.teamMap[t].filter(p => p.position === 'Goleiro');
        expect(teamGoleiros).toHaveLength(1);
      }
    });

    it('mesmo que todos os 3 goleiros a sortear tenham vindo da mesma equipe, nunca devem ser agrupados', () => {
      // Cenário extremo: 3 goleiros eram do Brasil na última partida
      const goleiros = [
        createPlayer('g-b1', 'Goleiro B1', 'Goleiro'),
        createPlayer('g-b2', 'Goleiro B2', 'Goleiro'),
        createPlayer('g-b3', 'Goleiro B3', 'Goleiro')
      ];
      const linha = Array.from({ length: 15 }, (_, i) => createPlayer(`l-${i}`, `Linha ${i}`, 'Meia'));

      const lastMap = new Map<string, string>();
      goleiros.forEach(g => lastMap.set(g.id, 'brasil'));

      const result = solveDraw({
        selectedPlayers: [...goleiros, ...linha],
        activeTeams: ['brasil', 'portugal', 'uruguai'],
        champTeamStr: null,
        champPlayerIds: new Set(),
        lastTeamMap: lastMap
      });

      // Cada um dos 3 times deve ter exatamente 1 goleiro
      for (const t of ['brasil', 'portugal', 'uruguai']) {
        const teamGoleiros = result.teamMap[t].filter(p => p.position === 'Goleiro');
        expect(teamGoleiros).toHaveLength(1);
      }
      // E como cada time tem apenas 1 goleiro, os 3 goleiros nunca jogam juntos
      // Duplas repetidas de goleiros entre si = 0
      for (const t of ['brasil', 'portugal', 'uruguai']) {
        const gCount = result.teamMap[t].filter(p => p.position === 'Goleiro' && lastMap.get(p.id) === 'brasil').length;
        expect(gCount).toBe(1);
      }
    });
  });

  // =========================================================================
  // 4. AUDITORIA DO CAMPEÃO E UNLOCKED PLAYERS
  // =========================================================================
  describe('4. Auditoria do Campeão', () => {
    it('deve preservar estritamente os 6 campeões quando todos estão presentes', () => {
      const champ = Array.from({ length: 6 }, (_, i) => createPlayer(`c-${i}`, `Campeão ${i}`, i === 0 ? 'Goleiro' : 'Meia'));
      const outros = Array.from({ length: 18 }, (_, i) => createPlayer(`o-${i}`, `Outro ${i}`, i < 3 ? 'Goleiro' : 'Meia'));

      const champIds = new Set(champ.map(p => p.id));
      const result = solveDraw({
        selectedPlayers: [...champ, ...outros],
        activeTeams,
        champTeamStr: 'japao',
        champPlayerIds: champIds,
        lastTeamMap: new Map()
      });

      expect(result.teamMap['japao']).toHaveLength(6);
      const assignedIds = new Set(result.teamMap['japao'].map(p => p.id));
      champIds.forEach(id => expect(assignedIds.has(id)).toBe(true));
    });

    it('quando 1 campeão estiver ausente, mantém os 5 presentes e completa a 6ª vaga sem quebrar o algoritmo', () => {
      // 5 campeões presentes (o 6º campeão faltou ao racha)
      const champPresentes = Array.from({ length: 5 }, (_, i) => createPlayer(`c-${i}`, `Campeão Presente ${i}`, i === 0 ? 'Goleiro' : 'Meia'));
      const champIds = new Set([...champPresentes.map(p => p.id), 'c-ausente-999']);

      // 19 outros atletas disponíveis (total 24 participantes)
      const outros = Array.from({ length: 19 }, (_, i) => createPlayer(`o-${i}`, `Outro ${i}`, i < 3 ? 'Goleiro' : 'Meia'));

      const result = solveDraw({
        selectedPlayers: [...champPresentes, ...outros],
        activeTeams,
        champTeamStr: 'japao',
        champPlayerIds: champIds,
        lastTeamMap: new Map()
      });

      // Japão deve ter 6 atletas: os 5 campeões presentes + 1 atleta para completar
      expect(result.teamMap['japao']).toHaveLength(6);
      const japaoIds = new Set(result.teamMap['japao'].map(p => p.id));
      champPresentes.forEach(p => expect(japaoIds.has(p.id)).toBe(true));

      // As outras 3 equipes também devem ter 6 atletas cada
      expect(result.teamMap['brasil']).toHaveLength(6);
      expect(result.teamMap['portugal']).toHaveLength(6);
      expect(result.teamMap['uruguai']).toHaveLength(6);
      expect(result.unassigned).toHaveLength(0);
    });

    it('quando um jogador campeão for destravado via unlockedPlayerIds, permite redistribuição para outro time', () => {
      const champ = Array.from({ length: 6 }, (_, i) => createPlayer(`c-${i}`, `Campeão ${i}`, i === 0 ? 'Goleiro' : 'Meia'));
      const outros = Array.from({ length: 18 }, (_, i) => createPlayer(`o-${i}`, `Outro ${i}`, i < 3 ? 'Goleiro' : 'Meia'));

      const champIds = new Set(champ.map(p => p.id));
      // Administrador destravou c-5 (ex.: diarista que jogou no campeão mas quer trocar de time)
      const unlocked = new Set(['c-5']);

      const result = solveDraw({
        selectedPlayers: [...champ, ...outros],
        activeTeams,
        champTeamStr: 'japao',
        champPlayerIds: champIds,
        unlockedPlayerIds: unlocked,
        lastTeamMap: new Map()
      });

      expect(result.teamMap['japao']).toHaveLength(6);
      // Os outros 5 continuam fixos no Japão
      const japaoIds = new Set(result.teamMap['japao'].map(p => p.id));
      expect(japaoIds.has('c-0')).toBe(true);
      expect(japaoIds.has('c-1')).toBe(true);
      expect(japaoIds.has('c-2')).toBe(true);
      expect(japaoIds.has('c-3')).toBe(true);
      expect(japaoIds.has('c-4')).toBe(true);

      // Total de 24 atletas distribuídos sem duplicatas
      const allIds = activeTeams.flatMap(t => result.teamMap[t].map(p => p.id));
      expect(allIds).toHaveLength(24);
      expect(new Set(allIds).size).toBe(24);
    });
  });

  // =========================================================================
  // 5. AUDITORIA DA PERSISTÊNCIA E INTEGRIDADE
  // =========================================================================
  describe('5. Auditoria de Integridade e Persistência', () => {
    it('jogadores pré-alocados em existingTeams nunca são duplicados nem perdidos', () => {
      const preAlocados: DrawPlayer[] = [
        createPlayer('man-1', 'Manual 1', 'Meia'),
        createPlayer('man-2', 'Manual 2', 'Meia')
      ];
      const outros = Array.from({ length: 22 }, (_, i) => createPlayer(`rest-${i}`, `Resto ${i}`, 'Meia'));

      const existingTeams: Record<string, DrawPlayer[]> = {
        brasil: preAlocados,
        portugal: [],
        japao: [],
        uruguai: []
      };

      const result = solveDraw({
        selectedPlayers: [...preAlocados, ...outros],
        activeTeams,
        champTeamStr: null,
        champPlayerIds: new Set(),
        lastTeamMap: new Map(),
        existingTeams
      });

      // Brasil deve conter exatamente os 2 pré-alocados + 4 outros
      expect(result.teamMap['brasil']).toHaveLength(6);
      const brasilIds = result.teamMap['brasil'].map(p => p.id);
      expect(brasilIds).toContain('man-1');
      expect(brasilIds).toContain('man-2');

      // Nenhum jogador em duplicidade
      const allAssigned = activeTeams.flatMap(t => result.teamMap[t].map(p => p.id));
      expect(new Set(allAssigned).size).toBe(24);
    });
  });
});
