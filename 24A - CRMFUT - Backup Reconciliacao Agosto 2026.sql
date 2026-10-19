-- 24A - CRMFUT - Backup Reconciliacao Agosto 2026 (Transacional e Atômico)

-- BLOCO DE VALIDAÇÃO E CRIAÇÃO ATÔMICA
DO $$
DECLARE
    v_players_count INT;
    v_matches_count INT;
    v_match_players_count INT;
    v_match_player_stats_count INT;
    
    v_backup_players_count INT;
    v_backup_matches_count INT;
    v_backup_match_players_count INT;
    v_backup_match_player_stats_count INT;
BEGIN
    -- 1. Criação do schema isolado para backups
    CREATE SCHEMA IF NOT EXISTS rda_backup;
    
    -- 2. Verificar se os backups já existem
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'rda_backup' 
        AND table_name IN (
            'backup_20260823_players',
            'backup_20260823_matches',
            'backup_20260823_match_players',
            'backup_20260823_match_player_stats'
        )
    ) THEN
        RAISE EXCEPTION 'BACKUP NÃO EXECUTADO. Já existe uma tabela de backup referente a 20260823. Nenhum dado foi alterado.';
    END IF;

    -- 3. Pré-validação das contagens reais
    SELECT count(*) INTO v_players_count FROM public.players;
    SELECT count(*) INTO v_matches_count FROM public.matches;
    SELECT count(*) INTO v_match_players_count FROM public.match_players;
    SELECT count(*) INTO v_match_player_stats_count FROM public.match_player_stats;

    IF v_players_count <> 49 OR v_matches_count <> 59 OR v_match_players_count <> 943 OR v_match_player_stats_count <> 916 THEN
        RAISE EXCEPTION 'BACKUP ABORTADO. Contagem inesperada. players: esperado 49, encontrado %. matches: esperado 59, encontrado %. match_players: esperado 943, encontrado %. match_player_stats: esperado 916, encontrado %.', 
            v_players_count, v_matches_count, v_match_players_count, v_match_player_stats_count;
    END IF;

    -- 4. Executar cópias Snapshot
    CREATE TABLE rda_backup.backup_20260823_players AS SELECT * FROM public.players;
    CREATE TABLE rda_backup.backup_20260823_matches AS SELECT * FROM public.matches;
    CREATE TABLE rda_backup.backup_20260823_match_players AS SELECT * FROM public.match_players;
    CREATE TABLE rda_backup.backup_20260823_match_player_stats AS SELECT * FROM public.match_player_stats;

    -- 5. Revoke para segurança do schema
    REVOKE ALL ON SCHEMA rda_backup FROM anon, authenticated;
    REVOKE ALL ON ALL TABLES IN SCHEMA rda_backup FROM anon, authenticated;

    -- 6. Validação Pós-Cópia
    SELECT count(*) INTO v_backup_players_count FROM rda_backup.backup_20260823_players;
    SELECT count(*) INTO v_backup_matches_count FROM rda_backup.backup_20260823_matches;
    SELECT count(*) INTO v_backup_match_players_count FROM rda_backup.backup_20260823_match_players;
    SELECT count(*) INTO v_backup_match_player_stats_count FROM rda_backup.backup_20260823_match_player_stats;

    IF v_backup_players_count <> 49 OR v_backup_matches_count <> 59 OR v_backup_match_players_count <> 943 OR v_backup_match_player_stats_count <> 916 THEN
        RAISE EXCEPTION 'BACKUP INVÁLIDO. Contagens nas tabelas de backup divergentes. Rollback acionado.';
    END IF;

    -- 7. Validar UUIDs
    IF NOT EXISTS (SELECT 1 FROM rda_backup.backup_20260823_matches WHERE id = '55aaf887-3505-48a8-a843-2c22a815d234') THEN
        RAISE EXCEPTION 'ABORTAR E ROLLBACK. UUID 07/08 CANÔNICO ausente no backup.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rda_backup.backup_20260823_matches WHERE id = '2444f31e-85d4-458b-a2db-ef210154cd44') THEN
        RAISE EXCEPTION 'ABORTAR E ROLLBACK. UUID 07/08 DUPLICADO ausente no backup.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rda_backup.backup_20260823_matches WHERE id = '178bf9ee-7ffd-4469-ba57-b24d160366c4') THEN
        RAISE EXCEPTION 'ABORTAR E ROLLBACK. UUID 14/08 CANÔNICO ausente no backup.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rda_backup.backup_20260823_matches WHERE id = '18e08f1b-b12e-4590-9cbd-22136411be91') THEN
        RAISE EXCEPTION 'ABORTAR E ROLLBACK. UUID 14/08 DUPLICADO ausente no backup.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rda_backup.backup_20260823_matches WHERE match_date = '2026-08-21') THEN
        RAISE EXCEPTION 'ABORTAR E ROLLBACK. Match único de 21/08 ausente no backup.';
    END IF;

    -- Se chegou aqui sem exceptions, o DO block faz o COMMIT automático da transação DDL.
END $$;


-- CONSULTAS DE VALIDAÇÃO FINAL (APENAS PARA LEITURA VISUAL SE A TRANSAÇÃO OBTEVE SUCESSO)

SELECT 'players' AS tabela, (SELECT count(*) FROM public.players) AS original, (SELECT count(*) FROM rda_backup.backup_20260823_players) AS backup
UNION ALL
SELECT 'matches', (SELECT count(*) FROM public.matches), (SELECT count(*) FROM rda_backup.backup_20260823_matches)
UNION ALL
SELECT 'match_players', (SELECT count(*) FROM public.match_players), (SELECT count(*) FROM rda_backup.backup_20260823_match_players)
UNION ALL
SELECT 'match_player_stats', (SELECT count(*) FROM public.match_player_stats), (SELECT count(*) FROM rda_backup.backup_20260823_match_player_stats);

SELECT '07/08 CANÔNICO' AS identificacao, '55aaf887-3505-48a8-a843-2c22a815d234' AS match_id,
       CASE WHEN EXISTS (SELECT 1 FROM rda_backup.backup_20260823_matches WHERE id = '55aaf887-3505-48a8-a843-2c22a815d234') THEN 'PRESENTE' ELSE 'AUSENTE' END AS status_backup
UNION ALL
SELECT '07/08 DUPLICADO', '2444f31e-85d4-458b-a2db-ef210154cd44',
       CASE WHEN EXISTS (SELECT 1 FROM rda_backup.backup_20260823_matches WHERE id = '2444f31e-85d4-458b-a2db-ef210154cd44') THEN 'PRESENTE' ELSE 'AUSENTE' END
UNION ALL
SELECT '14/08 CANÔNICO', '178bf9ee-7ffd-4469-ba57-b24d160366c4',
       CASE WHEN EXISTS (SELECT 1 FROM rda_backup.backup_20260823_matches WHERE id = '178bf9ee-7ffd-4469-ba57-b24d160366c4') THEN 'PRESENTE' ELSE 'AUSENTE' END
UNION ALL
SELECT '14/08 DUPLICADO', '18e08f1b-b12e-4590-9cbd-22136411be91',
       CASE WHEN EXISTS (SELECT 1 FROM rda_backup.backup_20260823_matches WHERE id = '18e08f1b-b12e-4590-9cbd-22136411be91') THEN 'PRESENTE' ELSE 'AUSENTE' END
UNION ALL
SELECT '21/08 ÚNICO', '2026-08-21',
       CASE WHEN EXISTS (SELECT 1 FROM rda_backup.backup_20260823_matches WHERE match_date = '2026-08-21') THEN 'PRESENTE' ELSE 'AUSENTE' END;
