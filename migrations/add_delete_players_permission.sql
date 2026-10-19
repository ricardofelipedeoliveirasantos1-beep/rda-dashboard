-- ==============================================================================
-- add_delete_players_permission.sql
-- ==============================================================================
-- Adiciona a permissão 'delete_players' para assistentes, permitindo que
-- assistentes autorizados excluam (ou ocultem) jogadores.
--
-- INSTRUÇÕES: Execute este SQL no Supabase SQL Editor.
-- ==============================================================================

BEGIN;

-- 1. Adicionar coluna delete_players na tabela assistant_permissions
ALTER TABLE public.assistant_permissions
  ADD COLUMN IF NOT EXISTS delete_players boolean NOT NULL DEFAULT false;

-- 2. Atualizar a função assistant_can() para reconhecer a nova permissão
CREATE OR REPLACE FUNCTION public.assistant_can(_perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE _perm
      WHEN 'create_match'      THEN ap.create_match
      WHEN 'edit_match'        THEN ap.edit_match
      WHEN 'insert_stats'      THEN ap.insert_stats
      WHEN 'edit_players'      THEN ap.edit_players
      WHEN 'delete_players'    THEN ap.delete_players
      WHEN 'manage_finance'    THEN ap.manage_finance
      WHEN 'create_notices'    THEN ap.create_notices
      WHEN 'edit_notices'      THEN ap.edit_notices
      WHEN 'delete_notices'    THEN ap.delete_notices
      WHEN 'import_history'    THEN ap.import_history
      ELSE false
    END
    FROM public.assistant_permissions ap
    WHERE ap.profile_id = (SELECT auth.uid())
  ), false);
$$;

-- 3. Atualizar a RLS policy de DELETE em players para permitir assistentes
--    com a permissão delete_players
DROP POLICY IF EXISTS "players_delete_admin" ON public.players;

CREATE POLICY "players_delete_admin"
  ON public.players FOR DELETE
  USING (
    public.is_admin()
    OR (public.is_assistant() AND public.assistant_can('delete_players'))
  );

-- 4. Atualizar a RLS policy de UPDATE em players para também permitir
--    assistentes com delete_players (necessário para o fallback is_active=false)
DROP POLICY IF EXISTS "players_update_editor" ON public.players;

CREATE POLICY "players_update_editor"
  ON public.players FOR UPDATE
  USING (
    public.is_admin()
    OR (public.is_assistant() AND public.assistant_can('edit_players'))
    OR (public.is_assistant() AND public.assistant_can('delete_players'))
  )
  WITH CHECK (
    public.is_admin()
    OR (public.is_assistant() AND public.assistant_can('edit_players'))
    OR (public.is_assistant() AND public.assistant_can('delete_players'))
  );

COMMIT;
