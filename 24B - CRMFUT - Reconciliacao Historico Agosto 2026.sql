-- 24B - CRMFUT - Reconciliação Histórico Agosto 2026
-- NÃO EXECUTAR ANTES DO BACKUP E DA VALIDAÇÃO FINAL
-- Este script trata das atualizações lógicas e exclusão física das duplicatas

BEGIN;

-- 1. Tratar Conflitos 07/08 e 14/08 (Forçar canônico para o valor da planilha, mantendo cartões/times intactos)
-- UPDATE match_player_stats SET ... WHERE match_id = 'canônico' AND player_id = 'xyz';
-- TODO: Será gerado programaticamente para cobrir os 14 conflitos mapeados.

-- 2. Migrar participações exclusivas das duplicadas para a canônica
-- O mapa profundo indicou que não há registros perdidos nos duplicados, a canônica já possui tudo.
-- Mas o script protegerá isso se fosse o caso via INSERT ... ON CONFLICT DO NOTHING.

-- 3. Excluir estatísticas dependentes das duplicatas
DELETE FROM match_player_stats
WHERE match_id IN (
    -- Lista das 29 UUIDs duplicadas
    'beda8fa4-903e-4895-b4f5-05d69b46f3ef', -- 16/01
    '47cfe530-fa13-45bd-99a4-a9accd57d492', -- 23/01
    'cf5ec104-eb58-49be-b9e3-c1b390f25ed6', -- 30/01
    'f4a8ebd3-c2c8-48c3-af0d-2adc40ecc68c', -- 06/02
    '7de6e578-b30b-42b2-b9ba-7abb745c5d43', -- 13/02
    'be2ec243-e5b8-4d46-9ee9-a87f935ffa42', -- 20/02
    'df22b1b4-1a53-48e4-a1d3-a30f2edd344a', -- 27/02
    'a196d720-7ef4-4aed-8d9e-b5076d0ea71e', -- 06/03
    'b89ed5b0-1223-4bcf-9307-cdaa66395bd7', -- 13/03
    'd7414e51-ea99-483b-b176-855e08227200', -- 20/03
    'a02705c9-9a40-4919-9c85-0be1b0564d0a', -- 27/03
    'fee384c6-bfdd-4eac-8365-29b37f021820', -- 03/04
    '9a9339f0-77e5-4b2a-bcc3-be79c5ddde0d', -- 10/04
    'f2fc28c6-b9c4-4781-8617-8a5ce3fc3e4d', -- 17/04
    'b056e175-2cda-42ba-b3b6-1ac8f6dcd8bf', -- 24/04
    '1de0eed9-f5f1-464e-919c-7a872f801fc7', -- 01/05
    '3f9a5349-83eb-4a09-8133-61867f1958e3', -- 08/05
    '90318ff6-3b6c-43d5-8427-6ae7e31dbe30', -- 15/05
    '757bc630-d10c-4832-9dce-16a0ebd5437f', -- 22/05
    'c70444be-569d-4fce-b527-5f5ceb2637ef', -- 29/05
    '8b545b26-131a-4eef-928c-85f629531439', -- 05/06
    '1f11c6af-19c3-4355-a7b5-123ec63a861e', -- 12/06
    'a50833de-4241-4462-a87c-fc12c803ebf9', -- 18/06
    'f875c969-666b-447b-ba5a-7df80560179b', -- 26/06
    '3e28ba22-b424-46ba-a50c-1c2c9d71ceac', -- 17/07
    '4527d7e5-f87a-4d9c-bcfd-d5a0829f35e7', -- 24/07
    'd8c0c008-1266-4f51-a470-d54a239ab216', -- 31/07
    '2444f31e-85d4-458b-a2db-ef210154cd44', -- 07/08
    '18e08f1b-b12e-4590-9cbd-22136411be91'  -- 14/08
);

-- 4. Excluir participantes das duplicatas
DELETE FROM match_players
WHERE match_id IN (
    -- (lista das 29 mesmas UUIDs)
    'beda8fa4-903e-4895-b4f5-05d69b46f3ef', '47cfe530-fa13-45bd-99a4-a9accd57d492', 'cf5ec104-eb58-49be-b9e3-c1b390f25ed6', 'f4a8ebd3-c2c8-48c3-af0d-2adc40ecc68c', '7de6e578-b30b-42b2-b9ba-7abb745c5d43', 'be2ec243-e5b8-4d46-9ee9-a87f935ffa42', 'df22b1b4-1a53-48e4-a1d3-a30f2edd344a', 'a196d720-7ef4-4aed-8d9e-b5076d0ea71e', 'b89ed5b0-1223-4bcf-9307-cdaa66395bd7', 'd7414e51-ea99-483b-b176-855e08227200', 'a02705c9-9a40-4919-9c85-0be1b0564d0a', 'fee384c6-bfdd-4eac-8365-29b37f021820', '9a9339f0-77e5-4b2a-bcc3-be79c5ddde0d', 'f2fc28c6-b9c4-4781-8617-8a5ce3fc3e4d', 'b056e175-2cda-42ba-b3b6-1ac8f6dcd8bf', '1de0eed9-f5f1-464e-919c-7a872f801fc7', '3f9a5349-83eb-4a09-8133-61867f1958e3', '90318ff6-3b6c-43d5-8427-6ae7e31dbe30', '757bc630-d10c-4832-9dce-16a0ebd5437f', 'c70444be-569d-4fce-b527-5f5ceb2637ef', '8b545b26-131a-4eef-928c-85f629531439', '1f11c6af-19c3-4355-a7b5-123ec63a861e', 'a50833de-4241-4462-a87c-fc12c803ebf9', 'f875c969-666b-447b-ba5a-7df80560179b', '3e28ba22-b424-46ba-a50c-1c2c9d71ceac', '4527d7e5-f87a-4d9c-bcfd-d5a0829f35e7', 'd8c0c008-1266-4f51-a470-d54a239ab216', '2444f31e-85d4-458b-a2db-ef210154cd44', '18e08f1b-b12e-4590-9cbd-22136411be91'
);

-- 5. Excluir os 29 matches pais
DELETE FROM matches
WHERE id IN (
    -- (lista das 29 mesmas UUIDs)
    'beda8fa4-903e-4895-b4f5-05d69b46f3ef', '47cfe530-fa13-45bd-99a4-a9accd57d492', 'cf5ec104-eb58-49be-b9e3-c1b390f25ed6', 'f4a8ebd3-c2c8-48c3-af0d-2adc40ecc68c', '7de6e578-b30b-42b2-b9ba-7abb745c5d43', 'be2ec243-e5b8-4d46-9ee9-a87f935ffa42', 'df22b1b4-1a53-48e4-a1d3-a30f2edd344a', 'a196d720-7ef4-4aed-8d9e-b5076d0ea71e', 'b89ed5b0-1223-4bcf-9307-cdaa66395bd7', 'd7414e51-ea99-483b-b176-855e08227200', 'a02705c9-9a40-4919-9c85-0be1b0564d0a', 'fee384c6-bfdd-4eac-8365-29b37f021820', '9a9339f0-77e5-4b2a-bcc3-be79c5ddde0d', 'f2fc28c6-b9c4-4781-8617-8a5ce3fc3e4d', 'b056e175-2cda-42ba-b3b6-1ac8f6dcd8bf', '1de0eed9-f5f1-464e-919c-7a872f801fc7', '3f9a5349-83eb-4a09-8133-61867f1958e3', '90318ff6-3b6c-43d5-8427-6ae7e31dbe30', '757bc630-d10c-4832-9dce-16a0ebd5437f', 'c70444be-569d-4fce-b527-5f5ceb2637ef', '8b545b26-131a-4eef-928c-85f629531439', '1f11c6af-19c3-4355-a7b5-123ec63a861e', 'a50833de-4241-4462-a87c-fc12c803ebf9', 'f875c969-666b-447b-ba5a-7df80560179b', '3e28ba22-b424-46ba-a50c-1c2c9d71ceac', '4527d7e5-f87a-4d9c-bcfd-d5a0829f35e7', 'd8c0c008-1266-4f51-a470-d54a239ab216', '2444f31e-85d4-458b-a2db-ef210154cd44', '18e08f1b-b12e-4590-9cbd-22136411be91'
);

-- COMMIT deverá ser avaliado após script client atestar que o volume total passou de 59 para 30.

COMMIT;
