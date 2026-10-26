-- ==============================================================================
-- 30 - CRMFUT - Data de Nascimento Opcional (Permitir NULL na coluna birth_date)
-- RDA - Racha dos Amigos
--
-- ATENÇÃO: NÃO EXECUTAR REMOTAMENTE SEM AUTORIZAÇÃO PRÉVIA!
-- Este script foi gerado para documentação técnica e caso o banco remoto
-- possua a restrição NOT NULL na coluna birth_date da tabela public.players.
-- ==============================================================================

-- 1. Remove a restrição NOT NULL da coluna birth_date caso exista
ALTER TABLE public.players ALTER COLUMN birth_date DROP NOT NULL;

-- 2. Comentário descritivo na coluna
COMMENT ON COLUMN public.players.birth_date IS 'Data de nascimento do atleta (opcional). Permite NULL quando não informado.';
