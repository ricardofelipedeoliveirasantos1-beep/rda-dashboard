-- ==============================================================================
-- 22 - CRMFUT - Regra Ralabosta por Classificação
-- ==============================================================================
-- Este script serve para auditoria e documentação da regra automática de Ralabosta.
-- A regra mapeia o último colocado da partida para receber "is_ralabosta = true"
-- na tabela match_player_stats, apenas para partidas com 3 ou 4 times.
-- ==============================================================================

-- 1. CONSULTA DE AUDITORIA: Quantidade de partidas antigas por contagem de times
SELECT 
  team_count,
  COUNT(*) as total_matches,
  COUNT(CASE WHEN status = 'finished' THEN 1 END) as finished_matches
FROM public.matches
GROUP BY team_count;

-- 2. CONSULTA DE AUDITORIA: Jogadores que já possuem marcações de Ralabosta gravadas
SELECT 
  mp.player_id,
  p.name,
  COUNT(*) as total_ralabostas
FROM public.match_player_stats mp
JOIN public.players p ON p.id = mp.player_id
WHERE mp.is_ralabosta = true
GROUP BY mp.player_id, p.name
ORDER BY total_ralabostas DESC;
