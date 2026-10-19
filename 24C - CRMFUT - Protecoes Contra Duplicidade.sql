-- 24C - CRMFUT - Proteções Contra Duplicidade
-- Aplicado APÓS a Reconciliação (24B) atestar a limpeza exata dos dados

BEGIN;

-- Constraint de unicidade para jogadores inscritos por partida
-- Um mesmo jogador (player_id) só pode ser associado uma vez a cada partida (match_id)
ALTER TABLE match_players 
ADD CONSTRAINT unique_match_player UNIQUE (match_id, player_id);

-- Constraint de unicidade para as estatísticas históricas do jogador por partida
-- Um jogador (player_id) só pode ter um registro de stats por partida (match_id)
ALTER TABLE match_player_stats 
ADD CONSTRAINT unique_match_player_stats UNIQUE (match_id, player_id);

COMMIT;
