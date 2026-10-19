-- 24B - RDA - Reconciliacao Historico Agosto 2026

DO $$
DECLARE
    v_players_count INT;
    v_matches_count INT;
    v_match_players_count INT;
    v_match_player_stats_count INT;
    
    v_canon_0708 UUID := '55aaf887-3505-48a8-a843-2c22a815d234';
    v_dup_0708 UUID := '2444f31e-85d4-458b-a2db-ef210154cd44';
    v_canon_1408 UUID := '178bf9ee-7ffd-4469-ba57-b24d160366c4';
    v_dup_1408 UUID := '18e08f1b-b12e-4590-9cbd-22136411be91';
    v_unico_2108 DATE := '2026-08-21';

    -- Variáveis de IDs dos jogadores 
    v_junior UUID;
    v_michel UUID;
    v_ricardo UUID;
    v_adones UUID;
    v_rodrigo UUID;
    v_wil UUID;
    v_flavio UUID;
    v_bau UUID;
    v_lopez UUID;
    v_neymem UUID;
    v_marcos UUID;
    v_dede UUID;
    v_mago UUID;
    v_luiz_antonio UUID;
    v_caio UUID;
    v_ytalo UUID;
    v_andre UUID;
    
    -- Variaveis auxiliares de loop
    v_target_names TEXT[] := ARRAY['Júnior', 'Michel', 'Ricardo', 'Adones', 'Rodrigo', 'Wil', 'Flávio', 'Bau', 'Lopez', 'Neymem', 'Marcos', 'Dedé', 'Mago', 'Luiz Antonio', 'Caio', 'Ytalo', 'Andre'];
    v_tmp_count INT;
    i INT;

    -- Variáveis para Gabarito
    v_ricardo_jg INT; v_ricardo_go INT; v_ricardo_as INT; v_ricardo_champ INT; v_ricardo_vice INT; v_ricardo_rb INT;
    v_wil_jg INT; v_wil_go INT; v_wil_as INT; v_wil_champ INT; v_wil_vice INT; v_wil_rb INT;
    v_ytalo_jg INT; v_ytalo_go INT; v_ytalo_as INT; v_ytalo_champ INT; v_ytalo_vice INT; v_ytalo_rb INT;
    v_adones_jg INT; v_adones_go INT; v_adones_as INT; v_adones_champ INT; v_adones_vice INT; v_adones_rb INT;
    v_andre_jg INT; v_andre_go INT; v_andre_as INT; v_andre_champ INT; v_andre_vice INT; v_andre_rb INT;

BEGIN
    -- 1. PRE-VALIDACAO INICIAL DAS CONTAGENS DE ESTADO DO BANCO
    SELECT count(*) INTO v_players_count FROM public.players;
    SELECT count(*) INTO v_matches_count FROM public.matches;
    SELECT count(*) INTO v_match_players_count FROM public.match_players;
    SELECT count(*) INTO v_match_player_stats_count FROM public.match_player_stats;

    IF v_players_count <> 49 
       OR v_matches_count <> 59 
       OR v_match_players_count <> 943 
       OR v_match_player_stats_count <> 916 
    THEN
        RAISE EXCEPTION 'ABORTADO. Estado inicial inesperado. players %, matches %, match_players %, match_player_stats %', 
        v_players_count, v_matches_count, v_match_players_count, v_match_player_stats_count;
    END IF;

    -- 2. VALIDACAO DE EXISTENCIA E UNICIDADE DOS JOGADORES REQUERIDOS
    FOR i IN 1 .. array_length(v_target_names, 1) LOOP
        SELECT count(*) INTO v_tmp_count FROM players WHERE name = v_target_names[i];
        IF v_tmp_count <> 1 THEN
            RAISE EXCEPTION 'ABORTADO. Jogador % não encontrado ou com nome duplicado! Quantidade encontrada: %', v_target_names[i], v_tmp_count;
        END IF;
    END LOOP;

    -- Obter IDs dos jogadores
    SELECT id INTO v_junior FROM players WHERE name = 'Júnior';
    SELECT id INTO v_michel FROM players WHERE name = 'Michel';
    SELECT id INTO v_ricardo FROM players WHERE name = 'Ricardo';
    SELECT id INTO v_adones FROM players WHERE name = 'Adones';
    SELECT id INTO v_rodrigo FROM players WHERE name = 'Rodrigo';
    SELECT id INTO v_wil FROM players WHERE name = 'Wil';
    SELECT id INTO v_flavio FROM players WHERE name = 'Flávio';
    SELECT id INTO v_bau FROM players WHERE name = 'Bau';
    SELECT id INTO v_lopez FROM players WHERE name = 'Lopez';
    SELECT id INTO v_neymem FROM players WHERE name = 'Neymem';
    SELECT id INTO v_marcos FROM players WHERE name = 'Marcos';
    SELECT id INTO v_dede FROM players WHERE name = 'Dedé';
    SELECT id INTO v_mago FROM players WHERE name = 'Mago';
    SELECT id INTO v_luiz_antonio FROM players WHERE name = 'Luiz Antonio';
    SELECT id INTO v_caio FROM players WHERE name = 'Caio';
    SELECT id INTO v_ytalo FROM players WHERE name = 'Ytalo';
    SELECT id INTO v_andre FROM players WHERE name = 'Andre';

    IF v_junior IS NULL OR v_michel IS NULL OR v_ricardo IS NULL OR v_adones IS NULL OR v_rodrigo IS NULL OR v_wil IS NULL OR v_flavio IS NULL OR v_bau IS NULL OR v_lopez IS NULL OR v_neymem IS NULL OR v_marcos IS NULL OR v_dede IS NULL OR v_mago IS NULL OR v_luiz_antonio IS NULL OR v_caio IS NULL OR v_ytalo IS NULL OR v_andre IS NULL THEN
        RAISE EXCEPTION 'ABORTADO. Um ou mais jogadores necessários para a reconciliação não foram encontrados.';
    END IF;


    -- 3. RESOLVER 14 CONFLITOS (Atualizando os stats do canônico com os valores corretos do duplicado/planilha, preservando cartões)

    -- 07/08 - Junior (Duplicado tem Vice=true)
    UPDATE match_player_stats SET is_runner_up = true WHERE match_id = v_canon_0708 AND player_id = v_junior;
    -- 07/08 - Michel (Duplicado tem Vice=true)
    UPDATE match_player_stats SET is_runner_up = true WHERE match_id = v_canon_0708 AND player_id = v_michel;
    -- 07/08 - Ricardo (Gols=2, Assists=1, Vice=true)
    UPDATE match_player_stats SET goals = 2, assists = 1, is_runner_up = true WHERE match_id = v_canon_0708 AND player_id = v_ricardo;
    -- 07/08 - Adones (Duplicado tem Champ=true)
    UPDATE match_player_stats SET is_champion = true WHERE match_id = v_canon_0708 AND player_id = v_adones;
    -- 07/08 - Rodrigo (Duplicado tem Champ=true)
    UPDATE match_player_stats SET is_champion = true WHERE match_id = v_canon_0708 AND player_id = v_rodrigo;
    -- 07/08 - Wil (Duplicado tem Gols=3, Assists=0, Champ=true)
    UPDATE match_player_stats SET goals = 3, assists = 0, is_champion = true WHERE match_id = v_canon_0708 AND player_id = v_wil;
    -- 07/08 - Flávio (Duplicado tem Gols=0, Assists=0, RB=true)
    UPDATE match_player_stats SET goals = 0, assists = 0, is_ralabosta = true WHERE match_id = v_canon_0708 AND player_id = v_flavio;
    -- 07/08 - Bau (Duplicado tem RB=true)
    UPDATE match_player_stats SET is_ralabosta = true WHERE match_id = v_canon_0708 AND player_id = v_bau;

    -- 14/08 - Lopez (Duplicado tem Champ=true)
    UPDATE match_player_stats SET is_champion = true WHERE match_id = v_canon_1408 AND player_id = v_lopez;
    -- 14/08 - Neymem (Duplicado tem Champ=true)
    UPDATE match_player_stats SET is_champion = true WHERE match_id = v_canon_1408 AND player_id = v_neymem;
    -- 14/08 - Wil (Duplicado tem Gols=1, Assists=0)
    UPDATE match_player_stats SET goals = 1, assists = 0 WHERE match_id = v_canon_1408 AND player_id = v_wil;
    -- 14/08 - Marcos (Duplicado tem Vice=true)
    UPDATE match_player_stats SET is_runner_up = true WHERE match_id = v_canon_1408 AND player_id = v_marcos;
    -- 14/08 - Michel (Duplicado tem Vice=true)
    UPDATE match_player_stats SET is_runner_up = true WHERE match_id = v_canon_1408 AND player_id = v_michel;
    -- 14/08 - Flávio (Duplicado tem Gols=0, Assists=1, Vice=true)
    UPDATE match_player_stats SET goals = 0, assists = 1, is_runner_up = true WHERE match_id = v_canon_1408 AND player_id = v_flavio;

    UPDATE public.match_player_stats
    SET is_runner_up = true
    WHERE player_id = v_ricardo
      AND match_id IN (
          SELECT id
          FROM public.matches
          WHERE match_date = v_unico_2108
      );

    UPDATE public.match_player_stats
    SET is_ralabosta = true
    WHERE player_id = v_wil
      AND match_id IN (
          SELECT id
          FROM public.matches
          WHERE match_date = v_unico_2108
      );

    UPDATE public.match_player_stats
    SET is_champion = true
    WHERE player_id = v_andre
      AND match_id IN (
          SELECT id
          FROM public.matches
          WHERE match_date = v_unico_2108
      );


    -- 4. MIGRAR 2 REGISTROS EXCLUSIVOS DOS DUPLICADOS PARA OS CANONICOS
    -- Apenas match_player_stats. match_players não deve ser migrado.
    
    -- 07/08 - Dedé (só existe no duplicado, migrando participação estatística)
    UPDATE match_player_stats SET match_id = v_canon_0708 WHERE match_id = v_dup_0708 AND player_id = v_dede;
    
    -- 14/08 - Mago (só existe no duplicado, migrando participação estatística)
    UPDATE match_player_stats SET match_id = v_canon_1408 WHERE match_id = v_dup_1408 AND player_id = v_mago;


    -- 5. REMOVER OS 4 REGISTROS FANTASMAS (Stats exclusivos do Canônico criados pelo App, ausentes na planilha)
    -- Apaga apenas do match_player_stats para não gerar JG extra, preservando a presença deles na estrutura de time do App (match_players)
    -- 07/08 - Luiz Antonio e Neymem
    DELETE FROM match_player_stats WHERE match_id = v_canon_0708 AND player_id IN (v_luiz_antonio, v_neymem);
    -- 14/08 - Caio e Rodrigo
    DELETE FROM match_player_stats WHERE match_id = v_canon_1408 AND player_id IN (v_caio, v_rodrigo);


    -- 6. REMOVER AS RELACOES E OS 29 MATCHES REDUNDANTES
    
    -- Excluir participações nas estatísticas
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

    -- Excluir estrutura de times dos redundantes
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

    -- Excluir os 29 matches propriamente ditos
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


    -- 7. POS-VALIDACAO DE CONTAGENS GERAIS
    SELECT count(*) INTO v_players_count FROM public.players;
    SELECT count(*) INTO v_matches_count FROM public.matches;
    SELECT count(*) INTO v_match_players_count FROM public.match_players;
    SELECT count(*) INTO v_match_player_stats_count FROM public.match_player_stats;

    IF v_players_count <> 49 THEN
        RAISE EXCEPTION 'ABORTADO E ROLLBACK. Esperado 49 players, encontrado %', v_players_count;
    END IF;
    
    IF v_matches_count <> 30 THEN
        RAISE EXCEPTION 'ABORTADO E ROLLBACK. Esperado 30 matches, encontrado %', v_matches_count;
    END IF;

    IF v_match_players_count <> 492 THEN
        RAISE EXCEPTION 'ABORTADO E ROLLBACK. Esperado 492 match_players, encontrado %', v_match_players_count;
    END IF;
    
    IF v_match_player_stats_count <> 463 THEN
        RAISE EXCEPTION 'ABORTADO E ROLLBACK. Esperado 463 match_player_stats, encontrado %', v_match_player_stats_count;
    END IF;

    -- Validar permanência dos canônicos obrigatórios e do match único
    IF NOT EXISTS (SELECT 1 FROM matches WHERE id = v_canon_0708) THEN
        RAISE EXCEPTION 'ABORTADO E ROLLBACK. O Canônico de 07/08 foi apagado!';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM matches WHERE id = v_canon_1408) THEN
        RAISE EXCEPTION 'ABORTADO E ROLLBACK. O Canônico de 14/08 foi apagado!';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM matches WHERE match_date = v_unico_2108) THEN
        RAISE EXCEPTION 'ABORTADO E ROLLBACK. O match único de 21/08 foi apagado!';
    END IF;

    -- Validar se sobrou algum dos redundantes que deveriam ter sido deletados
    IF EXISTS (
        SELECT 1 FROM matches WHERE id IN (
            'beda8fa4-903e-4895-b4f5-05d69b46f3ef', '47cfe530-fa13-45bd-99a4-a9accd57d492', 'cf5ec104-eb58-49be-b9e3-c1b390f25ed6',
            'f4a8ebd3-c2c8-48c3-af0d-2adc40ecc68c', '7de6e578-b30b-42b2-b9ba-7abb745c5d43', 'be2ec243-e5b8-4d46-9ee9-a87f935ffa42',
            'df22b1b4-1a53-48e4-a1d3-a30f2edd344a', 'a196d720-7ef4-4aed-8d9e-b5076d0ea71e', 'b89ed5b0-1223-4bcf-9307-cdaa66395bd7',
            'd7414e51-ea99-483b-b176-855e08227200', 'a02705c9-9a40-4919-9c85-0be1b0564d0a', 'fee384c6-bfdd-4eac-8365-29b37f021820',
            '9a9339f0-77e5-4b2a-bcc3-be79c5ddde0d', 'f2fc28c6-b9c4-4781-8617-8a5ce3fc3e4d', 'b056e175-2cda-42ba-b3b6-1ac8f6dcd8bf',
            '1de0eed9-f5f1-464e-919c-7a872f801fc7', '3f9a5349-83eb-4a09-8133-61867f1958e3', '90318ff6-3b6c-43d5-8427-6ae7e31dbe30',
            '757bc630-d10c-4832-9dce-16a0ebd5437f', 'c70444be-569d-4fce-b527-5f5ceb2637ef', '8b545b26-131a-4eef-928c-85f629531439',
            '1f11c6af-19c3-4355-a7b5-123ec63a861e', 'a50833de-4241-4462-a87c-fc12c803ebf9', 'f875c969-666b-447b-ba5a-7df80560179b',
            '3e28ba22-b424-46ba-a50c-1c2c9d71ceac', '4527d7e5-f87a-4d9c-bcfd-d5a0829f35e7', 'd8c0c008-1266-4f51-a470-d54a239ab216',
            '2444f31e-85d4-458b-a2db-ef210154cd44', '18e08f1b-b12e-4590-9cbd-22136411be91'
        )
    ) THEN
        RAISE EXCEPTION 'ABORTADO E ROLLBACK. Falha na limpeza: Ainda existem matches redundantes no banco!';
    END IF;


    -- 8. VALIDACAO DO GABARITO DE JOGADORES DO RANKING (JG / GO / AS / CAMPEAO / VICE / RB)
    
    -- RICARDO: 28 / 45 / 25 / 9 / 9 / 5
    SELECT COUNT(DISTINCT match_id), COALESCE(SUM(goals), 0), COALESCE(SUM(assists), 0), 
           COUNT(*) FILTER (WHERE is_champion = true), COUNT(*) FILTER (WHERE is_runner_up = true), COUNT(*) FILTER (WHERE is_ralabosta = true)
    INTO v_ricardo_jg, v_ricardo_go, v_ricardo_as, v_ricardo_champ, v_ricardo_vice, v_ricardo_rb
    FROM public.match_player_stats WHERE player_id = v_ricardo;

    IF v_ricardo_jg <> 28 OR v_ricardo_go <> 45 OR v_ricardo_as <> 25 OR v_ricardo_champ <> 9 OR v_ricardo_vice <> 9 OR v_ricardo_rb <> 5 THEN
        RAISE EXCEPTION 'ABORTADO E ROLLBACK. Gabarito RICARDO falhou! Obtido: % / % / % / % / % / %', v_ricardo_jg, v_ricardo_go, v_ricardo_as, v_ricardo_champ, v_ricardo_vice, v_ricardo_rb;
    END IF;

    -- WIL: 27 / 33 / 23 / 11 / 4 / 7
    SELECT COUNT(DISTINCT match_id), COALESCE(SUM(goals), 0), COALESCE(SUM(assists), 0), 
           COUNT(*) FILTER (WHERE is_champion = true), COUNT(*) FILTER (WHERE is_runner_up = true), COUNT(*) FILTER (WHERE is_ralabosta = true)
    INTO v_wil_jg, v_wil_go, v_wil_as, v_wil_champ, v_wil_vice, v_wil_rb
    FROM public.match_player_stats WHERE player_id = v_wil;

    IF v_wil_jg <> 27 OR v_wil_go <> 33 OR v_wil_as <> 23 OR v_wil_champ <> 11 OR v_wil_vice <> 4 OR v_wil_rb <> 7 THEN
        RAISE EXCEPTION 'ABORTADO E ROLLBACK. Gabarito WIL falhou! Obtido: % / % / % / % / % / %', v_wil_jg, v_wil_go, v_wil_as, v_wil_champ, v_wil_vice, v_wil_rb;
    END IF;

    -- YTALO: 26 / 40 / 7 / 4 / 5 / 11
    SELECT COUNT(DISTINCT match_id), COALESCE(SUM(goals), 0), COALESCE(SUM(assists), 0), 
           COUNT(*) FILTER (WHERE is_champion = true), COUNT(*) FILTER (WHERE is_runner_up = true), COUNT(*) FILTER (WHERE is_ralabosta = true)
    INTO v_ytalo_jg, v_ytalo_go, v_ytalo_as, v_ytalo_champ, v_ytalo_vice, v_ytalo_rb
    FROM public.match_player_stats WHERE player_id = v_ytalo;

    IF v_ytalo_jg <> 26 OR v_ytalo_go <> 40 OR v_ytalo_as <> 7 OR v_ytalo_champ <> 4 OR v_ytalo_vice <> 5 OR v_ytalo_rb <> 11 THEN
        RAISE EXCEPTION 'ABORTADO E ROLLBACK. Gabarito YTALO falhou! Obtido: % / % / % / % / % / %', v_ytalo_jg, v_ytalo_go, v_ytalo_as, v_ytalo_champ, v_ytalo_vice, v_ytalo_rb;
    END IF;

    -- ADONES: 25 / 2 / 6 / 3 / 7 / 12
    SELECT COUNT(DISTINCT match_id), COALESCE(SUM(goals), 0), COALESCE(SUM(assists), 0), 
           COUNT(*) FILTER (WHERE is_champion = true), COUNT(*) FILTER (WHERE is_runner_up = true), COUNT(*) FILTER (WHERE is_ralabosta = true)
    INTO v_adones_jg, v_adones_go, v_adones_as, v_adones_champ, v_adones_vice, v_adones_rb
    FROM public.match_player_stats WHERE player_id = v_adones;

    IF v_adones_jg <> 25 OR v_adones_go <> 2 OR v_adones_as <> 6 OR v_adones_champ <> 3 OR v_adones_vice <> 7 OR v_adones_rb <> 12 THEN
        RAISE EXCEPTION 'ABORTADO E ROLLBACK. Gabarito ADONES falhou! Obtido: % / % / % / % / % / %', v_adones_jg, v_adones_go, v_adones_as, v_adones_champ, v_adones_vice, v_adones_rb;
    END IF;

    -- ANDRE: 28 / 18 / 21 / 7 / 7 / 10
    SELECT COUNT(DISTINCT match_id), COALESCE(SUM(goals), 0), COALESCE(SUM(assists), 0), 
           COUNT(*) FILTER (WHERE is_champion = true), COUNT(*) FILTER (WHERE is_runner_up = true), COUNT(*) FILTER (WHERE is_ralabosta = true)
    INTO v_andre_jg, v_andre_go, v_andre_as, v_andre_champ, v_andre_vice, v_andre_rb
    FROM public.match_player_stats WHERE player_id = v_andre;

    IF v_andre_jg <> 28 OR v_andre_go <> 18 OR v_andre_as <> 21 OR v_andre_champ <> 7 OR v_andre_vice <> 7 OR v_andre_rb <> 10 THEN
        RAISE EXCEPTION 'ABORTADO E ROLLBACK. Gabarito ANDRE falhou! Obtido: % / % / % / % / % / %', v_andre_jg, v_andre_go, v_andre_as, v_andre_champ, v_andre_vice, v_andre_rb;
    END IF;


    -- Se chegou aqui, a transação foi validada de ponta a ponta sem levantar exceções.
END $$;
