import { describe, it, expect } from 'vitest';
import {
  evaluateTeamTacticalFormation,
  validateAllTeamsTactical,
  solveDraw,
  type DrawPlayer
} from '../services/sorteioService';

describe('RDA — Bateria Oficial de Testes Táticos e Equilíbrio de Equipes', () => {
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
  // TESTE A — Formação Ideal (2 Zagueiros, 2 Meias, 2 Atacantes)
  // =========================================================================
  it('Teste A — Formação ideal: 2 zagueiros, 2 meias e 2 atacantes (Resultado aprovado)', () => {
    const team: DrawPlayer[] = [
      createPlayer('p1', 'Zaga 1', 'Zagueiro'),
      createPlayer('p2', 'Zaga 2', 'Zagueiro'),
      createPlayer('p3', 'Meia 1', 'Meia'),
      createPlayer('p4', 'Meia 2', 'Meia'),
      createPlayer('p5', 'Ataque 1', 'Atacante'),
      createPlayer('p6', 'Ataque 2', 'Atacante')
    ];

    const result = evaluateTeamTacticalFormation(team, 6);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.atacantesCount).toBe(2);
    expect(result.zagueirosEfetivosCount).toBe(2);
    expect(result.meiasEfetivosCount).toBe(2);
    expect(result.formation).toBe('2-2-2');
    expect(result.adaptedPlayers).toHaveLength(0);
    expect(result.tacticalPenalty).toBe(0);
  });

  // =========================================================================
  // TESTE B — Três Meias (2 Zagueiros, 3 Meias, 1 Atacante)
  // =========================================================================
  it('Teste B — Formação alternativa prioritária: 2 zagueiros, 3 meias e 1 atacante (Resultado aprovado)', () => {
    const team: DrawPlayer[] = [
      createPlayer('p1', 'Zaga 1', 'Zagueiro'),
      createPlayer('p2', 'Zaga 2', 'Zagueiro'),
      createPlayer('p3', 'Meia 1', 'Meia'),
      createPlayer('p4', 'Meia 2', 'Meia'),
      createPlayer('p5', 'Meia 3', 'Meia'),
      createPlayer('p6', 'Ataque 1', 'Atacante')
    ];

    const result = evaluateTeamTacticalFormation(team, 6);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.atacantesCount).toBe(1);
    expect(result.zagueirosEfetivosCount).toBe(2);
    expect(result.meiasEfetivosCount).toBe(3);
    expect(result.formation).toBe('2-3-1');
    expect(result.adaptedPlayers).toHaveLength(0);
    expect(result.tacticalPenalty).toBe(0);
  });

  // =========================================================================
  // TESTE C — Um Zagueiro Disponível (1 Zagueiro natural, 1 Meia/Volante adaptado)
  // =========================================================================
  it('Teste C — Um zagueiro disponível: 1 zagueiro natural + 1 meia/volante adaptado para a zaga (Resultado aprovado)', () => {
    const team: DrawPlayer[] = [
      createPlayer('p1', 'Zaga 1', 'Zagueiro'),
      createPlayer('p2', 'Volante 1', 'Volante'), // Adaptará para zagueiro
      createPlayer('p3', 'Meia 1', 'Meia'),
      createPlayer('p4', 'Meia 2', 'Meia'),
      createPlayer('p5', 'Ataque 1', 'Atacante'),
      createPlayer('p6', 'Ataque 2', 'Atacante')
    ];

    const result = evaluateTeamTacticalFormation(team, 6);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.atacantesCount).toBe(2);
    expect(result.zagueirosNaturalCount).toBe(1);
    expect(result.zagueirosEfetivosCount).toBe(2);
    expect(result.meiasEfetivosCount).toBe(2);
    expect(result.adaptedPlayers).toHaveLength(1);
    expect(result.adaptedPlayers[0].playerName).toBe('Volante 1');
    expect(result.adaptedPlayers[0].originalPosition).toBe('Volante');
    expect(result.adaptedPlayers[0].adaptedPosition).toBe('Zagueiro');
    // Posição original no cadastro do jogador NÃO é alterada
    expect(team[1].position).toBe('Volante');
  });

  // =========================================================================
  // TESTE D — Dois Zagueiros Adaptados (0 Zagueiros naturais, 2 Meias/Volantes adaptados)
  // =========================================================================
  it('Teste D — Dois zagueiros adaptados: 2 meias ou volantes assumem a função defensiva (Resultado aprovado)', () => {
    const team: DrawPlayer[] = [
      createPlayer('p1', 'Volante 1', 'Volante'), // Adaptado 1
      createPlayer('p2', 'Meia Adaptado', 'Meia'), // Adaptado 2
      createPlayer('p3', 'Meia Efetivo 1', 'Meia'),
      createPlayer('p4', 'Meia Efetivo 2', 'Meia'),
      createPlayer('p5', 'Ataque 1', 'Atacante'),
      createPlayer('p6', 'Ataque 2', 'Atacante')
    ];

    const result = evaluateTeamTacticalFormation(team, 6);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.zagueirosNaturalCount).toBe(0);
    expect(result.zagueirosEfetivosCount).toBe(2);
    expect(result.adaptedPlayers).toHaveLength(2);
    expect(result.meiasEfetivosCount).toBe(2);
    expect(result.atacantesCount).toBe(2);
    // As posições originais continuam intactas
    expect(team[0].position).toBe('Volante');
    expect(team[1].position).toBe('Meia');
  });

  // =========================================================================
  // TESTE E — Três Atacantes (Obrigatoriamente Rejeitado)
  // =========================================================================
  it('Teste E — Três atacantes: simulação de 3 atacantes na mesma equipe (Resultado obrigatoriamente rejeitado)', () => {
    const team: DrawPlayer[] = [
      createPlayer('p1', 'Zaga 1', 'Zagueiro'),
      createPlayer('p2', 'Zaga 2', 'Zagueiro'),
      createPlayer('p3', 'Meia 1', 'Meia'),
      createPlayer('p4', 'Ataque 1', 'Atacante'),
      createPlayer('p5', 'Ataque 2', 'Atacante'),
      createPlayer('p6', 'Ataque 3', 'Atacante') // 3º Atacante proibido
    ];

    const result = evaluateTeamTacticalFormation(team, 6);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(err => err.includes('máximo permitido é 2 atacantes (nunca 3)'))).toBe(true);
  });

  // =========================================================================
  // TESTE F — Nenhum Atacante (Obrigatoriamente Rejeitado)
  // =========================================================================
  it('Teste F — Nenhum atacante: equipe completa sem atacante (Resultado obrigatoriamente rejeitado)', () => {
    const team: DrawPlayer[] = [
      createPlayer('p1', 'Zaga 1', 'Zagueiro'),
      createPlayer('p2', 'Zaga 2', 'Zagueiro'),
      createPlayer('p3', 'Meia 1', 'Meia'),
      createPlayer('p4', 'Meia 2', 'Meia'),
      createPlayer('p5', 'Meia 3', 'Meia'),
      createPlayer('p6', 'Volante 1', 'Volante')
    ];

    const result = evaluateTeamTacticalFormation(team, 6);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(err => err.includes('pelo menos 1 atacante'))).toBe(true);
  });

  // =========================================================================
  // TESTE G — Três Meias Permitidos
  // =========================================================================
  it('Teste G — Três meias: confirmar que 3 meias na formação efetiva são permitidos', () => {
    const team: DrawPlayer[] = [
      createPlayer('p1', 'Zaga 1', 'Zagueiro'),
      createPlayer('p2', 'Zaga 2', 'Zagueiro'),
      createPlayer('p3', 'Meia 1', 'Meia'),
      createPlayer('p4', 'Meia 2', 'Meia'),
      createPlayer('p5', 'Volante 1', 'Volante'),
      createPlayer('p6', 'Ataque 1', 'Atacante')
    ];

    const result = evaluateTeamTacticalFormation(team, 6);
    expect(result.isValid).toBe(true);
    expect(result.meiasEfetivosCount).toBe(3);
    expect(result.atacantesCount).toBe(1);
  });

  // =========================================================================
  // TESTE H — Quatro Meias na Formação Efetiva (Obrigatoriamente Rejeitado)
  // =========================================================================
  it('Teste H — Quatro meias: não permitir 4 meias na formação efetiva (Resultado obrigatoriamente rejeitado)', () => {
    // 2 zagueiros naturais + 4 meias = 0 atacantes e 4 meias -> duplamente inválido
    const team: DrawPlayer[] = [
      createPlayer('p1', 'Zaga 1', 'Zagueiro'),
      createPlayer('p2', 'Zaga 2', 'Zagueiro'),
      createPlayer('p3', 'Meia 1', 'Meia'),
      createPlayer('p4', 'Meia 2', 'Meia'),
      createPlayer('p5', 'Meia 3', 'Meia'),
      createPlayer('p6', 'Meia 4', 'Meia')
    ];

    const result = evaluateTeamTacticalFormation(team, 6);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(err => err.includes('máximo permitido é 3 meias'))).toBe(true);
  });

  // =========================================================================
  // TESTE I — Diaristas Participando com Diferentes Posições
  // =========================================================================
  it('Teste I — Diaristas: participam normalmente da distribuição tática sem restrição artificial', () => {
    const team: DrawPlayer[] = [
      createPlayer('p1', 'Zaga Mensalista', 'Zagueiro', 'Mensalista'),
      createPlayer('p2', 'Zaga Diarista', 'Zagueiro', 'Diarista'),
      createPlayer('p3', 'Meia Diarista', 'Meia', 'Diarista'),
      createPlayer('p4', 'Meia Mensalista', 'Meia', 'Mensalista'),
      createPlayer('p5', 'Ataque Diarista', 'Atacante', 'Diarista'),
      createPlayer('p6', 'Ataque Mensalista', 'Atacante', 'Mensalista')
    ];

    const result = evaluateTeamTacticalFormation(team, 6);
    expect(result.isValid).toBe(true);
    expect(result.atacantesCount).toBe(2);
    expect(result.zagueirosEfetivosCount).toBe(2);
    expect(result.meiasEfetivosCount).toBe(2);
  });

  // =========================================================================
  // TESTE J — Sorteio Inteligente Integrado com Regras Táticas e Minimização
  // =========================================================================
  it('Teste J — Sorteio Inteligente: cumpre todas as regras táticas oficiais simultaneamente com minimização de duplas', () => {
    // Cria 24 atletas equilibrados por equipe na última partida:
    // Brasil (Campeão): 2 atacantes, 2 zagueiros, 2 meias/volantes (formação 2-2-2)
    // Demais equipes com disponibilidade real de atacantes, zagas e meias
    const pool: DrawPlayer[] = [
      // Brasil (Campeão - slice 0..6): 2 atacantes, 2 zagueiros, 2 meias
      createPlayer('at-1', 'Atacante 1', 'Atacante'),
      createPlayer('at-2', 'Atacante 2', 'Atacante'),
      createPlayer('zg-1', 'Zagueiro 1', 'Zagueiro'),
      createPlayer('zg-2', 'Zagueiro 2', 'Zagueiro'),
      createPlayer('me-1', 'Meia 1', 'Meia'),
      createPlayer('vo-1', 'Volante 1', 'Volante'),

      // Uruguai (slice 6..12): 1 atacante, 2 zagueiros, 2 meias, 1 diarista
      createPlayer('at-3', 'Atacante 3', 'Atacante'),
      createPlayer('zg-3', 'Zagueiro 3', 'Zagueiro'),
      createPlayer('zg-4', 'Zagueiro 4', 'Zagueiro'),
      createPlayer('me-2', 'Meia 2', 'Meia'),
      createPlayer('vo-2', 'Volante 2', 'Volante'),
      createPlayer('di-1', 'Diarista Meia', 'Meia', 'Diarista'),

      // Portugal (slice 12..18): 2 atacantes, 1 zagueiro, 2 meias, 1 diarista
      createPlayer('at-4', 'Atacante 4', 'Atacante'),
      createPlayer('at-5', 'Atacante 5', 'Atacante'),
      createPlayer('zg-5', 'Zagueiro 5', 'Zagueiro'),
      createPlayer('me-3', 'Meia 3', 'Meia'),
      createPlayer('vo-3', 'Volante 3', 'Volante'),
      createPlayer('di-2', 'Diarista Zaga', 'Zagueiro', 'Diarista'),

      // Japão (slice 18..24): 1 atacante, 1 zagueiro, 4 meias/volantes
      createPlayer('at-6', 'Atacante 6', 'Atacante'),
      createPlayer('zg-6', 'Zagueiro 6', 'Zagueiro'),
      createPlayer('me-4', 'Meia 4', 'Meia'),
      createPlayer('me-5', 'Meia 5', 'Meia'),
      createPlayer('me-6', 'Meia 6', 'Meia'),
      createPlayer('vo-4', 'Volante 4', 'Volante')
    ];

    // Simula última partida
    const lastMap = new Map<string, string>();
    pool.slice(0, 6).forEach(p => lastMap.set(p.id, 'brasil'));
    pool.slice(6, 12).forEach(p => lastMap.set(p.id, 'uruguai'));
    pool.slice(12, 18).forEach(p => lastMap.set(p.id, 'portugal'));
    pool.slice(18, 24).forEach(p => lastMap.set(p.id, 'japao'));

    const activeTeams = ['brasil', 'uruguai', 'portugal', 'japao'];
    const champTeamStr = 'brasil';
    const champPlayerIds = new Set(pool.slice(0, 6).map(p => p.id));

    const drawResult = solveDraw({
      selectedPlayers: pool,
      activeTeams,
      champTeamStr,
      champPlayerIds,
      lastTeamMap: lastMap,
      maxPlayersPerTeam: 6
    });

    // 1. Integridade: todas as 4 equipes possuem 6 jogadores
    activeTeams.forEach(team => {
      expect(drawResult.teamMap[team]).toHaveLength(6);
    });

    // 2. Campeão preservado
    expect(drawResult.teamMap.brasil.map(p => p.id).sort()).toEqual([...champPlayerIds].sort());

    // 3. Validação tática em todas as equipes não-campeãs:
    // - NUNCA 3 atacantes
    // - Mínimo 1 atacante
    // - Máximo 3 meias efetivos
    const validation = validateAllTeamsTactical(drawResult.teamMap, activeTeams, 6);
    expect(validation.isValid).toBe(true);
    expect(validation.globalErrors).toHaveLength(0);

    for (const team of activeTeams) {
      const evalTeam = validation.teamEvaluations[team];
      expect(evalTeam.atacantesCount).toBeGreaterThanOrEqual(1);
      expect(evalTeam.atacantesCount).toBeLessThanOrEqual(2);
      expect(evalTeam.meiasEfetivosCount).toBeLessThanOrEqual(3);
      expect(evalTeam.adaptedPlayers.length).toBeLessThanOrEqual(2);
    }
  });

  // =========================================================================
  // TESTE K — Regressão e Validação Geral de Todos os Times
  // =========================================================================
  it('Teste K — Regressão: validateAllTeamsTactical valida múltiplos times identificando erros pontuais', () => {
    const invalidTeam3Atacantes = [
      createPlayer('a1', 'Atacante 1', 'Atacante'),
      createPlayer('a2', 'Atacante 2', 'Atacante'),
      createPlayer('a3', 'Atacante 3', 'Atacante'), // 3 atacantes
      createPlayer('z1', 'Zaga 1', 'Zagueiro'),
      createPlayer('z2', 'Zaga 2', 'Zagueiro'),
      createPlayer('m1', 'Meia 1', 'Meia')
    ];

    const validTeam = [
      createPlayer('b1', 'Atacante 1', 'Atacante'),
      createPlayer('b2', 'Atacante 2', 'Atacante'),
      createPlayer('b3', 'Zaga 1', 'Zagueiro'),
      createPlayer('b4', 'Zaga 2', 'Zagueiro'),
      createPlayer('b5', 'Meia 1', 'Meia'),
      createPlayer('b6', 'Meia 2', 'Meia')
    ];

    const teamMap = {
      brasil: invalidTeam3Atacantes,
      portugal: validTeam
    };

    const validation = validateAllTeamsTactical(teamMap, ['brasil', 'portugal'], 6);
    expect(validation.isValid).toBe(false);
    expect(validation.teamEvaluations.brasil.isValid).toBe(false);
    expect(validation.teamEvaluations.portugal.isValid).toBe(true);
    expect(validation.globalErrors.some(err => err.includes('Brasil'))).toBe(true);
  });
});
