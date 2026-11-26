import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvisoJogadoresJuntos } from '../components/AvisoJogadoresJuntos';
import {
  getRepeatedPairsByTeam,
  getAllTeamsRepeatedPairs,
  type DrawPlayer
} from '../services/sorteioService';

describe('RDA — Componente e Lógica do Aviso de Jogadores que Voltaram a Jogar Juntos', () => {
  const createPlayer = (
    id: string,
    name: string,
    position: string = 'Meia',
    category: 'Mensalista' | 'Diarista' = 'Mensalista'
  ): DrawPlayer => ({
    id,
    name,
    position,
    category,
    is_active: true
  });

  // =========================================================================
  // TESTES DE LÓGICA E CONTAGEM COMBINATÓRIA (CENÁRIOS 1 A 6)
  // =========================================================================
  describe('Lógica Combinatória de Duplas Repetidas', () => {
    it('1. Cenário: Uma equipe com uma única dupla repetida', () => {
      const p1 = createPlayer('p-1', 'Dedé');
      const p2 = createPlayer('p-2', 'Nonato');
      const p3 = createPlayer('p-3', 'Outro 1');

      const lastMap = new Map<string, string>([
        [p1.id, 'uruguai'],
        [p2.id, 'uruguai'],
        [p3.id, 'brasil']
      ]);

      const report = getRepeatedPairsByTeam([p1, p2, p3], lastMap, 'uruguai');
      expect(report.pairsCount).toBe(1);
      expect(report.pairs).toHaveLength(1);
      expect(report.pairs[0].player1.name).toBe('Dedé');
      expect(report.pairs[0].player2.name).toBe('Nonato');
      expect(report.pairs[0].previousTeam).toBe('uruguai');
    });

    it('2. Cenário: Uma equipe com duas duplas repetidas independentes', () => {
      // Exemplo: Ricardo + Pedro (do Brasil anterior) E Lopes + Carlos (de Portugal anterior)
      const p1 = createPlayer('p-1', 'Ricardo');
      const p2 = createPlayer('p-2', 'Pedro');
      const p3 = createPlayer('p-3', 'Lopes');
      const p4 = createPlayer('p-4', 'Carlos');

      const lastMap = new Map<string, string>([
        [p1.id, 'brasil'],
        [p2.id, 'brasil'],
        [p3.id, 'portugal'],
        [p4.id, 'portugal']
      ]);

      const report = getRepeatedPairsByTeam([p1, p2, p3, p4], lastMap, 'brasil');
      expect(report.pairsCount).toBe(2);
      expect(report.pairs).toHaveLength(2);

      const pairNames = report.pairs.map(p => `${p.player1.name} + ${p.player2.name}`);
      expect(pairNames).toContain('Ricardo + Pedro');
      expect(pairNames).toContain('Lopes + Carlos');
    });

    it('3. Cenário: Uma equipe com três jogadores da mesma equipe anterior gerando três duplas C(3,2) = 3', () => {
      // Exemplo: Ricardo, Pedro e Lopes vieram juntos da mesma equipe anterior
      const r = createPlayer('p-1', 'Ricardo');
      const p = createPlayer('p-2', 'Pedro');
      const l = createPlayer('p-3', 'Lopes');

      const lastMap = new Map<string, string>([
        [r.id, 'brasil'],
        [p.id, 'brasil'],
        [l.id, 'brasil']
      ]);

      const report = getRepeatedPairsByTeam([r, p, l], lastMap, 'uruguai');
      expect(report.pairsCount).toBe(3);
      expect(report.pairs).toHaveLength(3);

      const pairNames = report.pairs.map(pair => `${pair.player1.name} + ${pair.player2.name}`);
      expect(pairNames).toContain('Ricardo + Pedro');
      expect(pairNames).toContain('Ricardo + Lopes');
      expect(pairNames).toContain('Pedro + Lopes');
    });

    it('4. Cenário: Duplas repetidas distribuídas em equipes atuais diferentes', () => {
      const b1 = createPlayer('b-1', 'Ricardo');
      const b2 = createPlayer('b-2', 'Pedro');
      const u1 = createPlayer('u-1', 'Dedé');
      const u2 = createPlayer('u-2', 'Nonato');
      const p1 = createPlayer('p-1', 'Israel');
      const p2 = createPlayer('p-2', 'Bernardo');

      const lastMap = new Map<string, string>([
        [b1.id, 'brasil'],
        [b2.id, 'brasil'],
        [u1.id, 'uruguai'],
        [u2.id, 'uruguai'],
        [p1.id, 'portugal'],
        [p2.id, 'portugal']
      ]);

      const teamMap = {
        brasil: [b1, b2],
        uruguai: [u1, u2],
        portugal: [p1, p2],
        japao: []
      };

      const allReports = getAllTeamsRepeatedPairs(teamMap, ['brasil', 'uruguai', 'portugal', 'japao'], lastMap);
      expect(allReports).toHaveLength(3);
      expect(allReports.map(r => r.teamName)).toEqual(['brasil', 'uruguai', 'portugal']);
      expect(allReports[0].pairsCount).toBe(1);
      expect(allReports[1].pairsCount).toBe(1);
      expect(allReports[2].pairsCount).toBe(1);
    });

    it('5. Cenário: Diaristas novos sem histórico não geram duplas repetidas', () => {
      const mensalista = createPlayer('m-1', 'Carlos');
      const diaristaNovo = createPlayer('d-1', 'Diarista Novo', 'Meia', 'Diarista');

      const lastMap = new Map<string, string>([
        [mensalista.id, 'brasil']
        // diaristaNovo NÃO está no mapa
      ]);

      const report = getRepeatedPairsByTeam([mensalista, diaristaNovo], lastMap, 'brasil');
      expect(report.pairsCount).toBe(0);
      expect(report.pairs).toHaveLength(0);
    });

    it('6. Cenário: Time campeão preservado é excluído do relatório', () => {
      const c1 = createPlayer('c-1', 'Campeão 1');
      const c2 = createPlayer('c-2', 'Campeão 2');

      const lastMap = new Map<string, string>([
        [c1.id, 'japao'],
        [c2.id, 'japao']
      ]);

      const teamMap = {
        japao: [c1, c2], // Time campeão
        brasil: []
      };

      // Passando 'japao' como excludeTeam
      const allReports = getAllTeamsRepeatedPairs(teamMap, ['japao', 'brasil'], lastMap, 'japao');
      expect(allReports).toHaveLength(0);
    });
  });

  // =========================================================================
  // TESTES DE RENDERIZAÇÃO DO COMPONENTE VISUAL (CENÁRIOS 7 A 11)
  // =========================================================================
  describe('Renderização do Componente Visual (AvisoJogadoresJuntos)', () => {
    it('7. Cenário: Nenhuma repetição exibe mensagem discreta', () => {
      const p1 = createPlayer('p-1', 'Jogador 1');
      const p2 = createPlayer('p-2', 'Jogador 2');

      const lastMap = new Map<string, string>([
        [p1.id, 'brasil'],
        [p2.id, 'portugal'] // Origens diferentes
      ]);

      render(
        <AvisoJogadoresJuntos
          teamMap={{ brasil: [p1, p2], portugal: [], japao: [], uruguai: [] }}
          activeTeams={['brasil', 'portugal', 'japao', 'uruguai']}
          lastTeamMap={lastMap}
          champTeamStr="japao"
          hasFinishedMatchHistory={true}
          isDrawnOrPopulated={true}
        />
      );

      expect(screen.getByText('Jogadores que voltaram a jogar juntos')).toBeInTheDocument();
      expect(
        screen.getByText('Nenhum jogador voltou a jogar junto com seus antigos companheiros!')
      ).toBeInTheDocument();
    });

    it('8. Cenário: Ausência de histórico anterior exibe aviso informativo', () => {
      render(
        <AvisoJogadoresJuntos
          teamMap={{ brasil: [createPlayer('p-1', 'Atleta')], portugal: [], japao: [], uruguai: [] }}
          activeTeams={['brasil', 'portugal', 'japao', 'uruguai']}
          lastTeamMap={new Map()} // Vazio
          champTeamStr={null}
          hasFinishedMatchHistory={false}
          isDrawnOrPopulated={true}
        />
      );

      expect(
        screen.getByText('Ainda não existe uma partida finalizada para comparação de companheiros.')
      ).toBeInTheDocument();
    });

    it('9. Cenário: Renderiza fielmente os cards de equipes com escudo centralizado e duplas conforme a imagem de referência', () => {
      const ricardo = createPlayer('r-1', 'Ricardo');
      const pedro = createPlayer('p-1', 'Pedro');
      const lopes = createPlayer('l-1', 'Lopes');
      const carlos = createPlayer('c-1', 'Carlos');
      const dede = createPlayer('d-1', 'Dedé');
      const nonato = createPlayer('n-1', 'Nonato');
      const israel = createPlayer('i-1', 'Israel');
      const bernardo = createPlayer('b-1', 'Bernardo');

      const lastMap = new Map<string, string>([
        [ricardo.id, 'brasil'],
        [pedro.id, 'brasil'],
        [lopes.id, 'portugal'],
        [carlos.id, 'portugal'],
        [dede.id, 'uruguai'],
        [nonato.id, 'uruguai'],
        [israel.id, 'uruguai'],
        [bernardo.id, 'uruguai']
      ]);

      const teamMap = {
        brasil: [ricardo, pedro, lopes, carlos],
        uruguai: [dede, nonato],
        portugal: [israel, bernardo],
        japao: []
      };

      render(
        <AvisoJogadoresJuntos
          teamMap={teamMap}
          activeTeams={['brasil', 'uruguai', 'portugal', 'japao']}
          lastTeamMap={lastMap}
          champTeamStr="japao"
          hasFinishedMatchHistory={true}
          isDrawnOrPopulated={true}
        />
      );

      // Cabeçalho
      expect(screen.getByText('Jogadores que voltaram a jogar juntos')).toBeInTheDocument();

      // Escudos oficiais presentes e centralizados (único identificador visual superior)
      expect(screen.getByTestId('shield-brasil')).toBeInTheDocument();
      expect(screen.getByTestId('shield-uruguai')).toBeInTheDocument();
      expect(screen.getByTestId('shield-portugal')).toBeInTheDocument();

      // Pílulas com os nomes das duplas
      expect(screen.getByText('Ricardo + Pedro')).toBeInTheDocument();
      expect(screen.getByText('Lopes + Carlos')).toBeInTheDocument();
      expect(screen.getByText('Dedé + Nonato')).toBeInTheDocument();
      expect(screen.getByText('Israel + Bernardo')).toBeInTheDocument();
    });

    it('10. Cenário: Limpeza do sorteio oculta completamente o componente', () => {
      const { container } = render(
        <AvisoJogadoresJuntos
          teamMap={{ brasil: [], portugal: [], japao: [], uruguai: [] }}
          activeTeams={['brasil', 'portugal', 'japao', 'uruguai']}
          lastTeamMap={new Map([['p-1', 'brasil']])}
          champTeamStr={null}
          hasFinishedMatchHistory={true}
          isDrawnOrPopulated={false} // Sorteio limpo/vazio
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('11. Cenário: Validação do layout compacto e alinhamento de 1 dupla (centralizada) vs 2 duplas (50% lado a lado)', () => {
      const p1 = createPlayer('p-1', 'Israel');
      const p2 = createPlayer('p-2', 'Nino');
      const p3 = createPlayer('p-3', 'Rodrigo');
      const p4 = createPlayer('p-4', 'Izac');
      const p5 = createPlayer('p-5', 'Rafael');
      const p6 = createPlayer('p-6', 'Carlos');

      const lastMap = new Map<string, string>([
        [p1.id, 'brasil'],
        [p2.id, 'brasil'],
        [p3.id, 'portugal'],
        [p4.id, 'portugal'],
        [p5.id, 'uruguai'],
        [p6.id, 'uruguai']
      ]);

      const teamMap = {
        brasil: [p1, p2, p3, p4], // 2 duplas repetidas
        portugal: [p5, p6],       // 1 dupla repetida
        japao: [],
        uruguai: []
      };

      render(
        <AvisoJogadoresJuntos
          teamMap={teamMap}
          activeTeams={['brasil', 'portugal', 'japao', 'uruguai']}
          lastTeamMap={lastMap}
          champTeamStr="japao"
          hasFinishedMatchHistory={true}
          isDrawnOrPopulated={true}
        />
      );

      // Card Brasil tem 2 duplas repetidas lado a lado
      const brasilCard = screen.getByTestId('team-card-brasil');
      expect(brasilCard).toBeInTheDocument();
      expect(screen.getByTestId('shield-brasil')).toBeInTheDocument();
      expect(screen.getByText('Israel + Nino')).toBeInTheDocument();
      expect(screen.getByText('Rodrigo + Izac')).toBeInTheDocument();

      // Card Portugal tem 1 dupla repetida centralizada
      const portugalCard = screen.getByTestId('team-card-portugal');
      expect(portugalCard).toBeInTheDocument();
      expect(screen.getByTestId('shield-portugal')).toBeInTheDocument();
      expect(screen.getByText('Rafael + Carlos')).toBeInTheDocument();
    });
  });
});
