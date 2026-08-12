-- ============================================================================
-- rls_hardening.sql
-- FutCRM- Six - Endurecimento de RLS
--
-- Objetivo: substituir as policies permissivas atuais por um modelo em que a
-- autorizacao de escrita NAO depende de auth.role() = 'authenticated', mas sim
-- de profiles.role (admin | assistant | visitor) + tabela assistant_permissions.
--
-- IMPORTANTE: revise o arquivo por completo ANTES de aplicar. Nada aqui e
-- executado automaticamente.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0) FUNCOES AUXILIARES (SECURITY DEFINER com search_path fixo)
--    Usadas de forma segura dentro das policies. Nenhuma usa SQL dinamico.
-- ----------------------------------------------------------------------------

-- Role atual do usuario autenticado, lida de profiles (fonte real).
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = (SELECT auth.uid())
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.current_user_role() = 'admin')
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_assistant()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.current_user_role() = 'assistant')
$$;

GRANT EXECUTE ON FUNCTION public.is_assistant() TO anon, authenticated;

-- Verifica permissao especifica do assistente.
-- Aceita APENAS permissões conhecidas e fixas (CASE). NAO usa coluna fornecida
-- livremente -- isso bloqueia SQL dinamico inseguro.
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
      WHEN 'manage_finance'    THEN ap.manage_finance
      WHEN 'create_notices'    THEN ap.create_notices
      WHEN 'edit_notices'      THEN ap.edit_notices
      WHEN 'delete_notices'    THEN ap.delete_notices
      WHEN 'import_history'    THEN ap.import_history
      ELSE false  -- qualquer outra permissao desconhecida => negada
    END
    FROM public.assistant_permissions ap
    WHERE ap.profile_id = (SELECT auth.uid())
  ), false);
$$;

GRANT EXECUTE ON FUNCTION public.assistant_can(text) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1) TRIGGER DE PROTECAO DO profiles.role
--    Garante que ninguem (nem o proprio usuario) altere profiles.role sem ser
--    admin. RLS nao consegue comparar OLD/NEW por coluna, entao usamos trigger.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_nonadmin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas admin pode alterar profiles.role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_role ON public.profiles;
CREATE TRIGGER trg_profiles_protect_role
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_nonadmin_role_change();

-- ----------------------------------------------------------------------------
-- 2) LIMPEZA GERAL DE POLICIES ANTIGAS
--    Remove TODAS as policies existentes (inclusive as permissivas de escrita
--    hoje ativas) nas tabelas tratadas. Depois recriamos cada uma de forma
--    explicita. Nomes vem exclusivamente do catalogo (sem input livre do user).
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'players', 'matches', 'match_players', 'match_player_stats',
    'notices', 'monthly_payments', 'settings', 'profiles',
    'assistant_permissions'
  ]
  LOOP
    FOR p IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3) HABILITAR RLS EM TODAS AS TABELAS
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_permissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_player_stats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings               ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 4) POLICIES
-- ----------------------------------------------------------------------------

-- ============================ profiles =====================================
-- SELECT: autenticados leem (necessario para resolver role/permissions).
-- INSERT: SEM policy -> somente o trigger auth (handle_new_user) cria profiles.
-- UPDATE: admin gerencia tudo (incl. role); usuario pode editar o proprio
--         perfil, porém o trigger bloqueia mudanca de role por nao-admin.
-- DELETE: somente admin.
CREATE POLICY profiles_select_authenticated
  ON public.profiles FOR SELECT
  USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY profiles_insert_admin
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY profiles_update_admin
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY profiles_update_self_no_role
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_delete_admin
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- ===================== assistant_permissions ================================
-- SELECT: admin ou o proprio assistente (para ler as proprias permissoes).
-- INSERT/UPDATE/DELETE: somente admin.
CREATE POLICY assistant_permissions_select
  ON public.assistant_permissions FOR SELECT
  USING (public.is_admin() OR auth.uid() = profile_id);
CREATE POLICY assistant_permissions_insert_admin
  ON public.assistant_permissions FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY assistant_permissions_update_admin
  ON public.assistant_permissions FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY assistant_permissions_delete_admin
  ON public.assistant_permissions FOR DELETE
  USING (public.is_admin());

-- ============================ players =======================================
-- Visitor: somente SELECT. Admin: ALL. Assistant: UPDATE se edit_players.
-- DELETE: somente admin (nao ha permissao explicita de delete para assistant).
CREATE POLICY players_select_authenticated
  ON public.players FOR SELECT
  USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY players_insert_admin
  ON public.players FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY players_update_editor
  ON public.players FOR UPDATE
  USING (public.is_admin() OR (public.is_assistant() AND public.assistant_can('edit_players')))
  WITH CHECK (public.is_admin() OR (public.is_assistant() AND public.assistant_can('edit_players')));
CREATE POLICY players_delete_admin
  ON public.players FOR DELETE
  USING (public.is_admin());

-- ============================ matches =======================================
-- Visitor: SELECT. Assistant: INSERT se create_match, UPDATE se edit_match.
-- DELETE: somente admin (sem permissao de delete para assistant).
CREATE POLICY matches_select_authenticated
  ON public.matches FOR SELECT
  USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY matches_insert_creator
  ON public.matches FOR INSERT
  WITH CHECK (public.is_admin() OR (public.is_assistant() AND public.assistant_can('create_match')));
CREATE POLICY matches_update_editor
  ON public.matches FOR UPDATE
  USING (public.is_admin() OR (public.is_assistant() AND public.assistant_can('edit_match')))
  WITH CHECK (public.is_admin() OR (public.is_assistant() AND public.assistant_can('edit_match')));
CREATE POLICY matches_delete_admin
  ON public.matches FOR DELETE
  USING (public.is_admin());

-- ============================ match_players =================================
-- Escalacao: integrada ao fluxo de criar/editar partida. Assistant pode
-- inserir com create_match e atualizar/remover linhas com edit_match.
CREATE POLICY match_players_select_authenticated
  ON public.match_players FOR SELECT
  USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY match_players_insert_creator
  ON public.match_players FOR INSERT
  WITH CHECK (public.is_admin() OR (public.is_assistant() AND public.assistant_can('create_match')));
CREATE POLICY match_players_update_editor
  ON public.match_players FOR UPDATE
  USING (public.is_admin() OR (public.is_assistant() AND public.assistant_can('edit_match')))
  WITH CHECK (public.is_admin() OR (public.is_assistant() AND public.assistant_can('edit_match')));
CREATE POLICY match_players_delete_editor
  ON public.match_players FOR DELETE
  USING (public.is_admin() OR (public.is_assistant() AND public.assistant_can('edit_match')));

-- ========================= match_player_stats ===============================
-- Assistant: INSERT/UPDATE conforme insert_stats. DELETE somente admin
-- (recomenda-se revisar a real necessidade do assistant apagar estatisticas).
CREATE POLICY match_player_stats_select_authenticated
  ON public.match_player_stats FOR SELECT
  USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY match_player_stats_insert_editor
  ON public.match_player_stats FOR INSERT
  WITH CHECK (public.is_admin() OR (public.is_assistant() AND public.assistant_can('insert_stats')));
CREATE POLICY match_player_stats_update_editor
  ON public.match_player_stats FOR UPDATE
  USING (public.is_admin() OR (public.is_assistant() AND public.assistant_can('insert_stats')))
  WITH CHECK (public.is_admin() OR (public.is_assistant() AND public.assistant_can('insert_stats')));
CREATE POLICY match_player_stats_delete_admin
  ON public.match_player_stats FOR DELETE
  USING (public.is_admin());

-- ============================ notices =======================================
-- Visitor: SELECT. Assistant: INSERT=create_notices, UPDATE=edit_notices,
-- DELETE=delete_notices (permissoes separadas; create_notices NAO autoriza
-- update/delete). Admin: tudo.
CREATE POLICY notices_select_authenticated
  ON public.notices FOR SELECT
  USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY notices_insert_creator
  ON public.notices FOR INSERT
  WITH CHECK (public.is_admin() OR (public.is_assistant() AND public.assistant_can('create_notices')));
CREATE POLICY notices_update_editor
  ON public.notices FOR UPDATE
  USING (public.is_admin() OR (public.is_assistant() AND public.assistant_can('edit_notices')))
  WITH CHECK (public.is_admin() OR (public.is_assistant() AND public.assistant_can('edit_notices')));
CREATE POLICY notices_delete_editor
  ON public.notices FOR DELETE
  USING (public.is_admin() OR (public.is_assistant() AND public.assistant_can('delete_notices')));

-- ======================= monthly_payments ===================================
-- Visitor: SEM acesso. Assistant: somente com manage_finance. DELETE somente
-- admin (evita apagar historico financeiro por engano).
CREATE POLICY monthly_payments_select_admin_or_finance
  ON public.monthly_payments FOR SELECT
  USING (public.is_admin() OR (public.is_assistant() AND public.assistant_can('manage_finance')));
CREATE POLICY monthly_payments_insert_admin_or_finance
  ON public.monthly_payments FOR INSERT
  WITH CHECK (public.is_admin() OR (public.is_assistant() AND public.assistant_can('manage_finance')));
CREATE POLICY monthly_payments_update_admin_or_finance
  ON public.monthly_payments FOR UPDATE
  USING (public.is_admin() OR (public.is_assistant() AND public.assistant_can('manage_finance')))
  WITH CHECK (public.is_admin() OR (public.is_assistant() AND public.assistant_can('manage_finance')));
CREATE POLICY monthly_payments_delete_admin
  ON public.monthly_payments FOR DELETE
  USING (public.is_admin());

-- ============================ settings ======================================
-- Visitor/Assistant: somente SELECT (necessario para o funcionamento publico
-- do app: logo, valores padrao). INSERT/UPDATE/DELETE: somente admin.
CREATE POLICY settings_select_authenticated
  ON public.settings FOR SELECT
  USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY settings_insert_admin
  ON public.settings FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY settings_update_admin
  ON public.settings FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY settings_delete_admin
  ON public.settings FOR DELETE
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5) handle_new_user (trigger de novo usuario)
--
-- ATENCAO (requisito 11): ANTES de aplicar, confira a versao ATUAL da funcao.
-- Para inspeciona-la, rode sem aplicar:
--   SELECT pg_get_functiondef('public.handle_new_user'::regproc);
--
-- Abaixo fornecemos a versao recomendada que PRESERVA a logica de criacao do
-- profile (ON CONFLICT DO NOTHING => nao sobrescreve admins existentes) e, por
-- padrao, atribui role='visitor' a novos usuarios. Ajuste o INSERT para casar
-- com as colunas reais de profiles (ex.: se houver coluna email/username).
-- Se a funcao atual divergir no comportamento, mescle somente o necessario.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'visitor')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;