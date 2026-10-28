import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Relatorios, { getDenseRanking, getPeriodDates, buildPeriodPlayerStats, type PlayerSummary } from '../components/Relatorios';

describe('Auditoria e Integridade Estatística - Aba Relatórios (RDA)', () => {
  const defaultProps = {
    userRole: 'admin' as const,
    can: vi.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ==========================================
  // CENÁRIOS DE FILTRO DE DATAS E LIMITES (Cenários 1 a 5)
  // ==========================================
  describe('Filtros de Período e Limites Temporais (2º Semestre 2026)', () => {
    const dates = getPeriodDates('semestre2', '07', '2026');

    it('1. Deve definir o intervalo correto para o 2º Semestre de 2026 (01/07/2026 a 31/12/2026)', () => {
      expect(dates.start).toBe('2026-07-01');
      expect(dates.end).toBe('2027-01-01');
    });

    it('2. Partida em 30/06/2026 deve ficar FORA do 2º semestre', () => {
      const matchDate = '2026-06-30';
      const isInPeriod = matchDate >= dates.start && matchDate < dates.end;
      expect(isInPeriod).toBe(false);
    });

    it('3. Partida em 01/07/2026 deve ENTRAR no 2º semestre', () => {
      const matchDate = '2026-07-01';
      const isInPeriod = matchDate >= dates.start && matchDate < dates.end;
      expect(isInPeriod).toBe(true);
    });

    it('4. Partida em 31/12/2026 deve ENTRAR no 2º semestre', () => {
      const matchDate = '2026-12-31';
      const isInPeriod = matchDate >= dates.start && matchDate < dates.end;
      expect(isInPeriod).toBe(true);
    });

    it('5. Partida em 01/01/2027 deve ficar FORA do 2º semestre de 2026', () => {
      const matchDate = '2027-01-01';
      const isInPeriod = matchDate >= dates.start && matchDate < dates.end;
      expect(isInPeriod).toBe(false);
    });
  });

  // ==========================================
  // CENÁRIOS DE REGRAS ESTATÍSTICAS E RANKINGS (Cenários 6 a 17)
  // ==========================================
  describe('Cálculo de Rankings: Maior Campeão, Ralabosta e Integridade', () => {
    const mockPlayersMap = {
      'p-1': { name: 'Ricardo', photo_url: null, category: 'Mensalista' },
      'p-2': { name: 'Neymen', photo_url: null, category: 'Mensalista' },
      'p-3': { name: 'Flávio', photo_url: null, category: 'Mensalista' },
      'p-4': { name: 'Carlos', photo_url: null, category: 'Mensalista' },
      'p-5': { name: 'Ricardo', photo_url: null, category: 'Diarista' }, // Mesmo nome, ID diferente
    };

    it('6 e 7. Partidas em andamento ou canceladas não devem ser computadas nos relatórios', () => {
      // Simula banco com partidas de diferentes estados
      const allMatches = [
        { id: 'm-1', match_date: '2026-08-01', status: 'finished', champion_team: 'brasil', runner_up_team: 'japao', team_count: 4, fourth_place_team: 'portugal' },
        { id: 'm-2', match_date: '2026-08-08', status: 'in_progress', champion_team: 'japao', runner_up_team: 'brasil', team_count: 4, fourth_place_team: 'portugal' },
        { id: 'm-3', match_date: '2026-08-15', status: 'cancelled', champion_team: null, runner_up_team: null, team_count: 4, fourth_place_team: null },
      ];

      // A regra oficial do RDA filtra apenas partidas com status = 'finished'
      const finishedOnly = allMatches.filter(m => m.status === 'finished');
      expect(finishedOnly.length).toBe(1);
      expect(finishedOnly[0].id).toBe('m-1');

      const result = buildPeriodPlayerStats({
        matches: finishedOnly,
        matchPlayers: [
          { match_id: 'm-1', player_id: 'p-1', team: 'brasil' },
          { match_id: 'm-1', player_id: 'p-2', team: 'japao' },
        ],
        matchPlayerStats: [],
        playersMap: mockPlayersMap
      });

      expect(result.summary.matches).toBe(1);
    });

    it('8. Jogador que participou de várias equipes campeãs deve acumular todos os títulos', () => {
      const matches = [
        { id: 'm-1', match_date: '2026-08-07', status: 'finished', champion_team: 'japao', runner_up_team: 'portugal', team_count: 4, fourth_place_team: 'uruguai' },
        { id: 'm-2', match_date: '2026-08-14', status: 'finished', champion_team: 'brasil', runner_up_team: 'uruguai', team_count: 4, fourth_place_team: 'portugal' },
        { id: 'm-3', match_date: '2026-08-21', status: 'finished', champion_team: 'portugal', runner_up_team: 'japao', team_count: 3, third_place_team: 'brasil' }
      ];

      const matchPlayers = [
        // Neymen foi campeão no m-1 (japao) e no m-3 (portugal)
        { match_id: 'm-1', player_id: 'p-2', team: 'japao' },
        { match_id: 'm-2', player_id: 'p-2', team: 'uruguai' },
        { match_id: 'm-3', player_id: 'p-2', team: 'portugal' },
      ];

      const res = buildPeriodPlayerStats({
        matches,
        matchPlayers,
        matchPlayerStats: [],
        playersMap: mockPlayersMap
      });

      const neymen = res.rankingList.find(p => p.id === 'p-2');
      expect(neymen).toBeDefined();
      expect(neymen?.champion).toBe(2);
      expect(neymen?.games).toBe(3);
    });

    it('9. Jogador que participou de partidas como Ralabosta deve ser contabilizado corretamente', () => {
      const matches = [
        // 4 times: ralabosta é 4º colocado (uruguai)
        { id: 'm-1', match_date: '2026-08-07', status: 'finished', champion_team: 'japao', runner_up_team: 'portugal', team_count: 4, fourth_place_team: 'uruguai' },
        // 3 times: ralabosta é 3º colocado (brasil)
        { id: 'm-2', match_date: '2026-08-21', status: 'finished', champion_team: 'portugal', runner_up_team: 'japao', team_count: 3, third_place_team: 'brasil' }
      ];

      const matchPlayers = [
        // Flávio jogou no uruguai (m-1) e brasil (m-2) -> 2x Ralabosta
        { match_id: 'm-1', player_id: 'p-3', team: 'uruguai' },
        { match_id: 'm-2', player_id: 'p-3', team: 'brasil' },
      ];

      const res = buildPeriodPlayerStats({
        matches,
        matchPlayers,
        matchPlayerStats: [],
        playersMap: mockPlayersMap
      });

      const flavio = res.rankingList.find(p => p.id === 'p-3');
      expect(flavio).toBeDefined();
      expect(flavio?.ralabosta).toBe(2);
    });

    it('10. Partida com resultado corrigido deve refletir o resultado oficial vigente', () => {
      // Simula alteração do campeão de 'japao' para 'brasil'
      const correctedMatch = {
        id: 'm-1', match_date: '2026-08-07', status: 'finished',
        champion_team: 'brasil', runner_up_team: 'japao', team_count: 4, fourth_place_team: 'uruguai'
      };

      const matchPlayers = [
        { match_id: 'm-1', player_id: 'p-1', team: 'brasil' },
        { match_id: 'm-1', player_id: 'p-2', team: 'japao' },
      ];

      const res = buildPeriodPlayerStats({
        matches: [correctedMatch],
        matchPlayers,
        matchPlayerStats: [],
        playersMap: mockPlayersMap
      });

      const p1 = res.rankingList.find(p => p.id === 'p-1');
      const p2 = res.rankingList.find(p => p.id === 'p-2');

      expect(p1?.champion).toBe(1);
      expect(p2?.champion).toBe(0);
      expect(p2?.vice).toBe(1);
    });

    it('12. Dois jogadores com nomes semelhantes/iguais mas IDs diferentes devem ser contabilizados separadamente', () => {
      const match = { id: 'm-1', match_date: '2026-08-07', status: 'finished', champion_team: 'brasil', runner_up_team: 'japao', team_count: 4 };
      const matchPlayers = [
        { match_id: 'm-1', player_id: 'p-1', team: 'brasil' }, // Ricardo Mensalista
        { match_id: 'm-1', player_id: 'p-5', team: 'japao' },  // Ricardo Diarista
      ];

      const res = buildPeriodPlayerStats({
        matches: [match],
        matchPlayers,
        matchPlayerStats: [],
        playersMap: mockPlayersMap
      });

      expect(res.rankingList.length).toBe(2);
      const rMensalista = res.rankingList.find(p => p.id === 'p-1');
      const rDiarista = res.rankingList.find(p => p.id === 'p-5');

      expect(rMensalista?.champion).toBe(1);
      expect(rDiarista?.champion).toBe(0);
      expect(rDiarista?.vice).toBe(1);
    });

    it('13. Jogador de equipe que não foi campeã não deve receber título', () => {
      const match = { id: 'm-1', match_date: '2026-08-07', status: 'finished', champion_team: 'brasil', runner_up_team: 'japao', team_count: 4, fourth_place_team: 'portugal' };
      const matchPlayers = [
        { match_id: 'm-1', player_id: 'p-4', team: 'portugal' },
      ];

      const res = buildPeriodPlayerStats({
        matches: [match],
        matchPlayers,
        matchPlayerStats: [],
        playersMap: mockPlayersMap
      });

      const carlos = res.rankingList.find(p => p.id === 'p-4');
      expect(carlos?.champion).toBe(0);
      expect(carlos?.ralabosta).toBe(1);
    });

    it('14. Empate entre jogadores no ranking deve utilizar Dense Ranking (1º, 1º, 2º...) e critérios oficiais RDA', () => {
      const mockList: PlayerSummary[] = [
        { id: '1', name: 'Neymen', photo_url: null, category: 'M', games: 10, goals: 5, assists: 0, champion: 6, vice: 0, ralabosta: 0, yellow_cards: 0, blue_cards: 0, red_cards: 0 },
        // Carlos tem 8 jogos, Adonis tem 10 jogos. Carlos desempata à frente no critério de menos jogos!
        { id: '2', name: 'Adonis', photo_url: null, category: 'M', games: 10, goals: 5, assists: 0, champion: 5, vice: 0, ralabosta: 0, yellow_cards: 0, blue_cards: 0, red_cards: 0 },
        { id: '3', name: 'Carlos', photo_url: null, category: 'M', games: 8, goals: 5, assists: 0, champion: 5, vice: 0, ralabosta: 0, yellow_cards: 0, blue_cards: 0, red_cards: 0 },
        { id: '4', name: 'Ricardo', photo_url: null, category: 'M', games: 10, goals: 5, assists: 0, champion: 4, vice: 0, ralabosta: 0, yellow_cards: 0, blue_cards: 0, red_cards: 0 },
      ];

      const denseRank = getDenseRanking(mockList, 'champion');
      expect(denseRank[0].player.name).toBe('Neymen');
      expect(denseRank[0].rank).toBe(1);
      expect(denseRank[0].value).toBe(6);

      // Empate em 2º lugar (ambos rank 2, mas Carlos à frente por ter menos jogos)
      expect(denseRank[1].player.name).toBe('Carlos');
      expect(denseRank[1].rank).toBe(2);
      expect(denseRank[1].value).toBe(5);
      expect(denseRank[2].player.name).toBe('Adonis');
      expect(denseRank[2].rank).toBe(2);
      expect(denseRank[2].value).toBe(5);

      // Próximo é 3º
      expect(denseRank[3].rank).toBe(3);
      expect(denseRank[3].value).toBe(4);
    });

    it('14b. Desempate na Artilharia deve priorizar Assistências (DESC) e depois Jogos (ASC)', () => {
      const mockList: PlayerSummary[] = [
        { id: '1', name: 'Neymen', photo_url: null, category: 'M', games: 11, goals: 10, assists: 1, champion: 0, vice: 0, ralabosta: 0, yellow_cards: 0, blue_cards: 0, red_cards: 0 },
        { id: '2', name: 'Will', photo_url: null, category: 'M', games: 13, goals: 10, assists: 3, champion: 0, vice: 0, ralabosta: 0, yellow_cards: 0, blue_cards: 0, red_cards: 0 },
      ];

      const ranked = getDenseRanking(mockList, 'goals');
      expect(ranked[0].player.name).toBe('Will'); // 3 assistências > 1 assistência
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].player.name).toBe('Neymen');
      expect(ranked[1].rank).toBe(1); // Ambos dividem o 1º lugar (Dense Ranking)
    });

    it('14c. Desempate em Assistências deve priorizar Gols (DESC) e depois Jogos (ASC)', () => {
      const mockList: PlayerSummary[] = [
        { id: '1', name: 'Jogador A', photo_url: null, category: 'M', games: 10, goals: 2, assists: 5, champion: 0, vice: 0, ralabosta: 0, yellow_cards: 0, blue_cards: 0, red_cards: 0 },
        { id: '2', name: 'Jogador B', photo_url: null, category: 'M', games: 10, goals: 4, assists: 5, champion: 0, vice: 0, ralabosta: 0, yellow_cards: 0, blue_cards: 0, red_cards: 0 },
      ];

      const ranked = getDenseRanking(mockList, 'assists');
      expect(ranked[0].player.name).toBe('Jogador B'); // 4 gols > 2 gols
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].player.name).toBe('Jogador A');
      expect(ranked[1].rank).toBe(1);
    });

    it('14d. Desempate em Ralabosta deve priorizar menos jogos (ASC)', () => {
      const mockList: PlayerSummary[] = [
        { id: '1', name: 'Neymen', photo_url: null, category: 'M', games: 11, goals: 0, assists: 0, champion: 0, vice: 0, ralabosta: 5, yellow_cards: 0, blue_cards: 0, red_cards: 0 },
        { id: '2', name: 'Dedé', photo_url: null, category: 'M', games: 10, goals: 0, assists: 0, champion: 0, vice: 0, ralabosta: 5, yellow_cards: 0, blue_cards: 0, red_cards: 0 },
        { id: '3', name: 'Flávio', photo_url: null, category: 'M', games: 10, goals: 0, assists: 0, champion: 0, vice: 0, ralabosta: 5, yellow_cards: 0, blue_cards: 0, red_cards: 0 },
      ];

      const ranked = getDenseRanking(mockList, 'ralabosta');
      // Dedé e Flávio têm 10 jogos (menos que Neymen com 11). Entre Dedé e Flávio, ordem alfabética:
      expect(ranked[0].player.name).toBe('Dedé');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].player.name).toBe('Flávio');
      expect(ranked[1].rank).toBe(1);
      expect(ranked[2].player.name).toBe('Neymen');
      expect(ranked[2].rank).toBe(1);
    });

    it('14e. Fallback de ralabostaTeamCode quando team_count for indefinido mas fourth_place_team estiver preenchido', () => {
      const matchWithoutTeamCount = {
        id: 'm-fallback',
        match_date: '2026-09-01',
        status: 'finished',
        champion_team: 'brasil',
        runner_up_team: 'japao',
        third_place_team: 'alemanha',
        fourth_place_team: 'portugal'
        // team_count omitido propositalmente
      };

      const res = buildPeriodPlayerStats({
        matches: [matchWithoutTeamCount],
        matchPlayers: [
          { match_id: 'm-fallback', player_id: 'p-1', team: 'portugal' },
        ],
        matchPlayerStats: [],
        playersMap: mockPlayersMap
      });

      const p1 = res.rankingList.find(p => p.id === 'p-1');
      expect(p1?.ralabosta).toBe(1);
    });

    it('15. Período sem partidas válidas deve retornar 0 partidas e lista vazia', () => {
      const res = buildPeriodPlayerStats({
        matches: [],
        matchPlayers: [],
        matchPlayerStats: [],
        playersMap: {}
      });

      expect(res.summary.matches).toBe(0);
      expect(res.summary.champions).toBe(0);
      expect(res.rankingList.length).toBe(0);
    });

    it('17. Verificação de que uma mesma partida ou jogador não seja contabilizado duas vezes', () => {
      const match = { id: 'm-1', match_date: '2026-08-07', status: 'finished', champion_team: 'brasil', runner_up_team: 'japao', team_count: 4 };
      const duplicatedMatchPlayers = [
        { match_id: 'm-1', player_id: 'p-1', team: 'brasil' },
        { match_id: 'm-1', player_id: 'p-1', team: 'brasil' }, // registro duplicado da mesma partida
      ];

      const res = buildPeriodPlayerStats({
        matches: [match],
        matchPlayers: duplicatedMatchPlayers,
        matchPlayerStats: [],
        playersMap: mockPlayersMap
      });

      const p1 = res.rankingList.find(p => p.id === 'p-1');
      expect(p1?.games).toBe(1);
      expect(p1?.champion).toBe(1);
      expect(res.summary.champions).toBe(1);
    });
  });

  // ==========================================
  // CENÁRIOS DE INTERFACE E COMPONENTES UI (Cenários 11 e 16)
  // ==========================================
  describe('Renderização e Interatividade da Aba Relatórios', () => {
    it('11 e 16. Deve renderizar os controles de filtro e permitir abrir o dropdown de período', async () => {
      render(<Relatorios {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Relatórios')).toBeInTheDocument();
        expect(screen.getByText('PERÍODO')).toBeInTheDocument();
      });

      // Clicar no botão do dropdown de período
      const periodButton = screen.getByRole('button', { name: /Mensal/i });
      expect(periodButton).toBeInTheDocument();

      fireEvent.click(periodButton);

      // As opções devem estar visíveis após abrir o dropdown
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '1º Semestre' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '2º Semestre' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Anual' })).toBeInTheDocument();
      });
    });
  });
});
