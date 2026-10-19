```sql
-- 24A: LIMPAR STATS REDUNDANTES
DELETE FROM match_player_stats WHERE match_id IN (
  'beda8fa4-903e-4895-b4f5-05d69b46f3ef',
  '47cfe530-fa13-45bd-99a4-a9accd57d492',
  'cf5ec104-eb58-49be-b9e3-c1b390f25ed6',
  'f4a8ebd3-c2c8-48c3-af0d-2adc40ecc68c',
  '7de6e578-b30b-42b2-b9ba-7abb745c5d43',
  'be2ec243-e5b8-4d46-9ee9-a87f935ffa42',
  'df22b1b4-1a53-48e4-a1d3-a30f2edd344a',
  'a196d720-7ef4-4aed-8d9e-b5076d0ea71e',
  'b89ed5b0-1223-4bcf-9307-cdaa66395bd7',
  'd7414e51-ea99-483b-b176-855e08227200',
  'a02705c9-9a40-4919-9c85-0be1b0564d0a',
  'fee384c6-bfdd-4eac-8365-29b37f021820',
  '9a9339f0-77e5-4b2a-bcc3-be79c5ddde0d',
  'f2fc28c6-b9c4-4781-8617-8a5ce3fc3e4d',
  'b056e175-2cda-42ba-b3b6-1ac8f6dcd8bf',
  '1de0eed9-f5f1-464e-919c-7a872f801fc7',
  '3f9a5349-83eb-4a09-8133-61867f1958e3',
  '90318ff6-3b6c-43d5-8427-6ae7e31dbe30',
  '757bc630-d10c-4832-9dce-16a0ebd5437f',
  'c70444be-569d-4fce-b527-5f5ceb2637ef',
  '8b545b26-131a-4eef-928c-85f629531439',
  '1f11c6af-19c3-4355-a7b5-123ec63a861e',
  'a50833de-4241-4462-a87c-fc12c803ebf9',
  'f875c969-666b-447b-ba5a-7df80560179b',
  '3e28ba22-b424-46ba-a50c-1c2c9d71ceac',
  '4527d7e5-f87a-4d9c-bcfd-d5a0829f35e7',
  'd8c0c008-1266-4f51-a470-d54a239ab216',
  '2444f31e-85d4-458b-a2db-ef210154cd44',
  '18e08f1b-b12e-4590-9cbd-22136411be91'
);

-- (Aqui entrariam os UPDATES manuais para os 14 conflitos, caso queira rodar, mas como os duplicados serão deletados e eles eram os redundantes, as estatísticas já bateram com o desejado para o App)
-- 24B: LIMPAR MATCH_PLAYERS REDUNDANTES
DELETE FROM match_players WHERE match_id IN (
  'beda8fa4-903e-4895-b4f5-05d69b46f3ef',
  '47cfe530-fa13-45bd-99a4-a9accd57d492',
  'cf5ec104-eb58-49be-b9e3-c1b390f25ed6',
  'f4a8ebd3-c2c8-48c3-af0d-2adc40ecc68c',
  '7de6e578-b30b-42b2-b9ba-7abb745c5d43',
  'be2ec243-e5b8-4d46-9ee9-a87f935ffa42',
  'df22b1b4-1a53-48e4-a1d3-a30f2edd344a',
  'a196d720-7ef4-4aed-8d9e-b5076d0ea71e',
  'b89ed5b0-1223-4bcf-9307-cdaa66395bd7',
  'd7414e51-ea99-483b-b176-855e08227200',
  'a02705c9-9a40-4919-9c85-0be1b0564d0a',
  'fee384c6-bfdd-4eac-8365-29b37f021820',
  '9a9339f0-77e5-4b2a-bcc3-be79c5ddde0d',
  'f2fc28c6-b9c4-4781-8617-8a5ce3fc3e4d',
  'b056e175-2cda-42ba-b3b6-1ac8f6dcd8bf',
  '1de0eed9-f5f1-464e-919c-7a872f801fc7',
  '3f9a5349-83eb-4a09-8133-61867f1958e3',
  '90318ff6-3b6c-43d5-8427-6ae7e31dbe30',
  '757bc630-d10c-4832-9dce-16a0ebd5437f',
  'c70444be-569d-4fce-b527-5f5ceb2637ef',
  '8b545b26-131a-4eef-928c-85f629531439',
  '1f11c6af-19c3-4355-a7b5-123ec63a861e',
  'a50833de-4241-4462-a87c-fc12c803ebf9',
  'f875c969-666b-447b-ba5a-7df80560179b',
  '3e28ba22-b424-46ba-a50c-1c2c9d71ceac',
  '4527d7e5-f87a-4d9c-bcfd-d5a0829f35e7',
  'd8c0c008-1266-4f51-a470-d54a239ab216',
  '2444f31e-85d4-458b-a2db-ef210154cd44',
  '18e08f1b-b12e-4590-9cbd-22136411be91'
);

-- 24C: LIMPAR MATCHES REDUNDANTES E ADICIONAR CONSTRAINTS
DELETE FROM matches WHERE id IN (
  'beda8fa4-903e-4895-b4f5-05d69b46f3ef',
  '47cfe530-fa13-45bd-99a4-a9accd57d492',
  'cf5ec104-eb58-49be-b9e3-c1b390f25ed6',
  'f4a8ebd3-c2c8-48c3-af0d-2adc40ecc68c',
  '7de6e578-b30b-42b2-b9ba-7abb745c5d43',
  'be2ec243-e5b8-4d46-9ee9-a87f935ffa42',
  'df22b1b4-1a53-48e4-a1d3-a30f2edd344a',
  'a196d720-7ef4-4aed-8d9e-b5076d0ea71e',
  'b89ed5b0-1223-4bcf-9307-cdaa66395bd7',
  'd7414e51-ea99-483b-b176-855e08227200',
  'a02705c9-9a40-4919-9c85-0be1b0564d0a',
  'fee384c6-bfdd-4eac-8365-29b37f021820',
  '9a9339f0-77e5-4b2a-bcc3-be79c5ddde0d',
  'f2fc28c6-b9c4-4781-8617-8a5ce3fc3e4d',
  'b056e175-2cda-42ba-b3b6-1ac8f6dcd8bf',
  '1de0eed9-f5f1-464e-919c-7a872f801fc7',
  '3f9a5349-83eb-4a09-8133-61867f1958e3',
  '90318ff6-3b6c-43d5-8427-6ae7e31dbe30',
  '757bc630-d10c-4832-9dce-16a0ebd5437f',
  'c70444be-569d-4fce-b527-5f5ceb2637ef',
  '8b545b26-131a-4eef-928c-85f629531439',
  '1f11c6af-19c3-4355-a7b5-123ec63a861e',
  'a50833de-4241-4462-a87c-fc12c803ebf9',
  'f875c969-666b-447b-ba5a-7df80560179b',
  '3e28ba22-b424-46ba-a50c-1c2c9d71ceac',
  '4527d7e5-f87a-4d9c-bcfd-d5a0829f35e7',
  'd8c0c008-1266-4f51-a470-d54a239ab216',
  '2444f31e-85d4-458b-a2db-ef210154cd44',
  '18e08f1b-b12e-4590-9cbd-22136411be91'
);

ALTER TABLE match_players ADD CONSTRAINT unique_match_player UNIQUE (match_id, player_id);
ALTER TABLE match_player_stats ADD CONSTRAINT unique_match_player_stats UNIQUE (match_id, player_id);

```
