-- ==============================================================================
-- 36 - CRMFUT - Matriz Completa 16 Permissoes do Tesoureiro e RLS.sql
-- ==============================================================================
-- Projeto: RDA — Racha dos Amigos
-- Banco Oficial: Supabase — projeto bdpocxppyoavqbpcmfdb
-- Objetivo:
-- 1. Garantir todas as 16 colunas de permissão em public.treasurer_permissions
-- 2. Atualizar a função public.treasurer_can(text) para as 16 permissões
-- 3. Garantir políticas RLS em players, matches, notices e stats para Tesoureiro
-- ==============================================================================

BEGIN;

-- 1. ADICIONAR TODAS AS 16 COLUNAS NA TABELA public.treasurer_permissions
ALTER TABLE public.treasurer_permissions
  ADD COLUMN IF NOT EXISTS view_finance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manage_finance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manage_expenses boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edit_expenses boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delete_expenses boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manage_monthly_payments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS adjust_balance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS create_match boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edit_match boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS insert_stats boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edit_players boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delete_players boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS create_notices boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edit_notices boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delete_notices boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS import_history boolean NOT NULL DEFAULT false;

-- 2. NORMALIZAR VALORES NULOS LEGADOS
UPDATE public.treasurer_permissions SET
  view_finance            = COALESCE(view_finance, false),
  manage_finance          = COALESCE(manage_finance, false),
  manage_expenses         = COALESCE(manage_expenses, false),
  edit_expenses           = COALESCE(edit_expenses, false),
  delete_expenses         = COALESCE(delete_expenses, false),
  manage_monthly_payments = COALESCE(manage_monthly_payments, false),
  adjust_balance          = COALESCE(adjust_balance, false),
  create_match            = COALESCE(create_match, false),
  edit_match              = COALESCE(edit_match, false),
  insert_stats            = COALESCE(insert_stats, false),
  edit_players            = COALESCE(edit_players, false),
  delete_players          = COALESCE(delete_players, false),
  create_notices          = COALESCE(create_notices, false),
  edit_notices            = COALESCE(edit_notices, false),
  delete_notices          = COALESCE(delete_notices, false),
  import_history          = COALESCE(import_history, false);

-- 3. GARANTIR QUE TODO TESOUREIRO REGISTRADO POSSUA LINHA NA TABELA
INSERT INTO public.treasurer_permissions (profile_id)
SELECT p.id FROM public.profiles p
WHERE p.role = 'treasurer'
  AND NOT EXISTS (SELECT 1 FROM public.treasurer_permissions tp WHERE tp.profile_id = p.id)
ON CONFLICT (profile_id) DO NOTHING;

-- 4. ATUALIZAR FUNÇÃO public.treasurer_can(text) COM AS 16 PERMISSÕES
CREATE OR REPLACE FUNCTION public.treasurer_can(_perm text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_has_permission boolean := false;
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Administrador possui acesso irrestrito
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;

  -- Requer que o usuário ativo tenha papel de tesoureiro
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid AND role = 'treasurer'
  ) THEN
    RETURN false;
  END IF;

  SELECT COALESCE(
    CASE _perm
      WHEN 'view_finance'            THEN tp.view_finance
      WHEN 'manage_finance'          THEN tp.manage_finance
      WHEN 'manage_expenses'         THEN tp.manage_expenses
      WHEN 'edit_expenses'           THEN tp.edit_expenses
      WHEN 'delete_expenses'         THEN tp.delete_expenses
      WHEN 'manage_monthly_payments' THEN tp.manage_monthly_payments
      WHEN 'adjust_balance'          THEN tp.adjust_balance
      WHEN 'create_match'            THEN tp.create_match
      WHEN 'edit_match'              THEN tp.edit_match
      WHEN 'insert_stats'            THEN tp.insert_stats
      WHEN 'edit_players'            THEN tp.edit_players
      WHEN 'delete_players'          THEN tp.delete_players
      WHEN 'create_notices'          THEN tp.create_notices
      WHEN 'edit_notices'            THEN tp.edit_notices
      WHEN 'delete_notices'          THEN tp.delete_notices
      WHEN 'import_history'          THEN tp.import_history
      ELSE false
    END, false
  )
  INTO v_has_permission
  FROM public.treasurer_permissions tp
  WHERE tp.profile_id = v_uid;

  RETURN COALESCE(v_has_permission, false);
END;
$$;

REVOKE ALL ON FUNCTION public.treasurer_can(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.treasurer_can(text) TO authenticated, service_role;

-- 5. ATUALIZAR POLÍTICAS RLS NAS DEMAIS TABELAS PARA ACEITAR O TESOUREIRO AUTORIZADO

-- TABELA: public.players
DROP POLICY IF EXISTS "players_insert_editor" ON public.players;
CREATE POLICY "players_insert_editor"
  ON public.players FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (public.is_assistant() AND public.assistant_can('edit_players'))
    OR (public.is_treasurer() AND public.treasurer_can('edit_players'))
  );

DROP POLICY IF EXISTS "players_update_editor" ON public.players;
CREATE POLICY "players_update_editor"
  ON public.players FOR UPDATE
  USING (
    public.is_admin()
    OR (public.is_assistant() AND (public.assistant_can('edit_players') OR public.assistant_can('delete_players')))
    OR (public.is_treasurer() AND (public.treasurer_can('edit_players') OR public.treasurer_can('delete_players')))
  )
  WITH CHECK (
    public.is_admin()
    OR (public.is_assistant() AND (public.assistant_can('edit_players') OR public.assistant_can('delete_players')))
    OR (public.is_treasurer() AND (public.treasurer_can('edit_players') OR public.treasurer_can('delete_players')))
  );

DROP POLICY IF EXISTS "players_delete_admin" ON public.players;
CREATE POLICY "players_delete_admin"
  ON public.players FOR DELETE
  USING (
    public.is_admin()
    OR (public.is_assistant() AND public.assistant_can('delete_players'))
    OR (public.is_treasurer() AND public.treasurer_can('delete_players'))
  );

-- TABELA: public.matches
DROP POLICY IF EXISTS "matches_insert_creator" ON public.matches;
CREATE POLICY "matches_insert_creator"
  ON public.matches FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (public.is_assistant() AND public.assistant_can('create_match'))
    OR (public.is_treasurer() AND public.treasurer_can('create_match'))
  );

DROP POLICY IF EXISTS "matches_update_editor" ON public.matches;
CREATE POLICY "matches_update_editor"
  ON public.matches FOR UPDATE
  USING (
    public.is_admin()
    OR (public.is_assistant() AND public.assistant_can('edit_match'))
    OR (public.is_treasurer() AND public.treasurer_can('edit_match'))
  )
  WITH CHECK (
    public.is_admin()
    OR (public.is_assistant() AND public.assistant_can('edit_match'))
    OR (public.is_treasurer() AND public.treasurer_can('edit_match'))
  );

DROP POLICY IF EXISTS "matches_delete_editor" ON public.matches;
CREATE POLICY "matches_delete_editor"
  ON public.matches FOR DELETE
  USING (
    public.is_admin()
    OR (public.is_assistant() AND public.assistant_can('edit_match'))
    OR (public.is_treasurer() AND public.treasurer_can('edit_match'))
  );

-- TABELA: public.match_player_stats
DROP POLICY IF EXISTS "match_player_stats_insert_editor" ON public.match_player_stats;
CREATE POLICY "match_player_stats_insert_editor"
  ON public.match_player_stats FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (public.is_assistant() AND public.assistant_can('insert_stats'))
    OR (public.is_treasurer() AND public.treasurer_can('insert_stats'))
  );

DROP POLICY IF EXISTS "match_player_stats_update_editor" ON public.match_player_stats;
CREATE POLICY "match_player_stats_update_editor"
  ON public.match_player_stats FOR UPDATE
  USING (
    public.is_admin()
    OR (public.is_assistant() AND public.assistant_can('insert_stats'))
    OR (public.is_treasurer() AND public.treasurer_can('insert_stats'))
  )
  WITH CHECK (
    public.is_admin()
    OR (public.is_assistant() AND public.assistant_can('insert_stats'))
    OR (public.is_treasurer() AND public.treasurer_can('insert_stats'))
  );

-- TABELA: public.notices
DROP POLICY IF EXISTS "notices_insert_creator" ON public.notices;
CREATE POLICY "notices_insert_creator"
  ON public.notices FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (public.is_assistant() AND public.assistant_can('create_notices'))
    OR (public.is_treasurer() AND public.treasurer_can('create_notices'))
  );

DROP POLICY IF EXISTS "notices_update_editor" ON public.notices;
CREATE POLICY "notices_update_editor"
  ON public.notices FOR UPDATE
  USING (
    public.is_admin()
    OR (public.is_assistant() AND public.assistant_can('edit_notices'))
    OR (public.is_treasurer() AND public.treasurer_can('edit_notices'))
  )
  WITH CHECK (
    public.is_admin()
    OR (public.is_assistant() AND public.assistant_can('edit_notices'))
    OR (public.is_treasurer() AND public.treasurer_can('edit_notices'))
  );

DROP POLICY IF EXISTS "notices_delete_editor" ON public.notices;
CREATE POLICY "notices_delete_editor"
  ON public.notices FOR DELETE
  USING (
    public.is_admin()
    OR (public.is_assistant() AND public.assistant_can('delete_notices'))
    OR (public.is_treasurer() AND public.treasurer_can('delete_notices'))
  );

COMMIT;

-- CONFIRMAÇÃO DE AUDITORIA:
SELECT 
  'treasurer_permissions' AS tabela,
  count(column_name) AS total_colunas_encontradas,
  CASE WHEN count(column_name) = 16 THEN '✅ 100% DAS 16 PERMISSÕES DO TESOUREIRO ATIVAS' ELSE '❌ INCOMPLETO' END AS status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'treasurer_permissions'
  AND column_name IN (
    'view_finance', 'manage_finance', 'manage_expenses', 'edit_expenses',
    'delete_expenses', 'manage_monthly_payments', 'adjust_balance', 'create_match',
    'edit_match', 'insert_stats', 'edit_players', 'delete_players',
    'create_notices', 'edit_notices', 'delete_notices', 'import_history'
  );

