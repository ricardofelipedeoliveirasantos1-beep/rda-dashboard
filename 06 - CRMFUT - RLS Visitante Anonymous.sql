-- ==============================================================================
-- 06 - CRMFUT - RLS Visitante Anonymous.sql
-- ==============================================================================
-- Este script realiza cirurgias exatas no RLS para estancar vazamentos de leitura.
-- As policies de escrita não são modificadas porque as funções is_admin(),
-- is_treasurer() e assistant_can() já garantem a rejeição do Visitor Anonymous
-- (pois ele não possui registro na tabela profiles).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. GARANTIR RLS ATIVO EM TODAS AS TABELAS DE FORMA NÃO-DESTRUTIVA
-- ------------------------------------------------------------------------------
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. DROPS DAS POLICIES DE LEITURA (SELECT) VAZADAS PARA 'anon' E ABERTAS DEMAIS
-- E DROPS DE IDEMPOTÊNCIA PARA AS NOVAS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "players_select_authenticated" ON public.players;
DROP POLICY IF EXISTS "matches_select_authenticated" ON public.matches;
DROP POLICY IF EXISTS "match_players_select_authenticated" ON public.match_players;
DROP POLICY IF EXISTS "match_player_stats_select_authenticated" ON public.match_player_stats;
DROP POLICY IF EXISTS "notices_select_authenticated" ON public.notices;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "settings_select_authenticated" ON public.settings;

DROP POLICY IF EXISTS "notices_select_restricted" ON public.notices;
DROP POLICY IF EXISTS "profiles_select_team_only" ON public.profiles;

-- ------------------------------------------------------------------------------
-- 2. RECRIAR LEITURA DAS TABELAS PÚBLICAS RESTRINGINDO 'anon' SEM SESSÃO
-- Apenas Visitor Anonymous e Usuários com cargo válido (admin, assistant, treasurer)
-- podem ler. Contas autenticadas sem role são bloqueadas.
-- ------------------------------------------------------------------------------
CREATE POLICY "players_select_authenticated" 
  ON public.players FOR SELECT 
  TO authenticated
  USING (
    COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = true
    OR public.current_user_role() IN ('admin', 'assistant', 'treasurer')
  );

CREATE POLICY "matches_select_authenticated" 
  ON public.matches FOR SELECT 
  TO authenticated
  USING (
    COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = true
    OR public.current_user_role() IN ('admin', 'assistant', 'treasurer')
  );

CREATE POLICY "match_players_select_authenticated" 
  ON public.match_players FOR SELECT 
  TO authenticated
  USING (
    COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = true
    OR public.current_user_role() IN ('admin', 'assistant', 'treasurer')
  );

CREATE POLICY "match_player_stats_select_authenticated" 
  ON public.match_player_stats FOR SELECT 
  TO authenticated
  USING (
    COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = true
    OR public.current_user_role() IN ('admin', 'assistant', 'treasurer')
  );

-- ------------------------------------------------------------------------------
-- 3. SETTINGS: RESTRITO AO ID DEFAULT PARA VISITANTES E TIME
-- ------------------------------------------------------------------------------
CREATE POLICY "settings_select_authenticated" 
  ON public.settings FOR SELECT 
  TO authenticated
  USING (
    id = 'default'
    AND (
      COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = true
      OR public.current_user_role() IN ('admin', 'assistant', 'treasurer')
    )
  );

-- ------------------------------------------------------------------------------
-- 4. NOTICES: LÓGICA CONDICIONAL DE EXPIRAÇÃO PARA O VISITANTE E FULL PARA TIME
-- O visitante só vê avisos ativos e não expirados.
-- O Time administrativo (com cargo válido) vê todos os avisos.
-- ------------------------------------------------------------------------------
CREATE POLICY "notices_select_restricted" 
  ON public.notices FOR SELECT 
  TO authenticated
  USING (
    (
      COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = true 
      AND status = 'active' 
      AND (expires_at IS NULL OR expires_at > now())
    )
    OR public.current_user_role() IN ('admin', 'assistant', 'treasurer')
  );

-- ------------------------------------------------------------------------------
-- 5. PROFILES: BLOQUEIO TOTAL PARA VISITANTE, ANON E CONTAS SEM ROLE
-- Apenas os cargos reais podem ler a lista de perfis do app.
-- ------------------------------------------------------------------------------
CREATE POLICY "profiles_select_team_only" 
  ON public.profiles FOR SELECT 
  TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'assistant', 'treasurer')
  );

-- ------------------------------------------------------------------------------
-- 6. EXPENSES: DROPS E RECIRURGIA COMPLETA BASEADA EM FUNÇÕES SEGURAS
-- Preservamos a mesma arquitetura de segurança perfeita de monthly_payments.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir leitura de despesas para usuarios autenticados" ON public.expenses;
DROP POLICY IF EXISTS "Permitir insercao de despesas para usuarios autenticados" ON public.expenses;
DROP POLICY IF EXISTS "Permitir atualizacao de despesas para usuarios autenticados" ON public.expenses;
DROP POLICY IF EXISTS "Permitir exclusao de despesas para usuarios autenticados" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_restricted" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_restricted" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_restricted" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_admin_only" ON public.expenses;

CREATE POLICY "expenses_select_restricted"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR public.is_treasurer() OR (public.is_assistant() AND public.assistant_can('manage_finance'))
  );

CREATE POLICY "expenses_insert_restricted"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() OR public.is_treasurer() OR (public.is_assistant() AND public.assistant_can('manage_finance'))
  );

CREATE POLICY "expenses_update_restricted"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() OR public.is_treasurer() OR (public.is_assistant() AND public.assistant_can('manage_finance'))
  )
  WITH CHECK (
    public.is_admin() OR public.is_treasurer() OR (public.is_assistant() AND public.assistant_can('manage_finance'))
  );

CREATE POLICY "expenses_delete_admin_only"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (public.is_admin());

COMMIT;
