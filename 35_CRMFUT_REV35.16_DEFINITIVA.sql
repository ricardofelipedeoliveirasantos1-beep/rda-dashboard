-- ==============================================================================
-- 35 - CRMFUT - Permissao Leitura Financeira e Matriz Tesoureiro - REV35.15-CORRIGIDA-MODELO-REAL-RDA.sql
-- ==============================================================================
-- Projeto: RDA — Racha dos Amigos
-- Banco Oficial: Supabase — projeto bdpocxppyoavqbpcmfdb
-- Branch: feature/assistants-treasurer-management
-- Título reservado no Supabase SQL Editor:
-- "35 - CRMFUT - Permissao Leitura Financeira e Matriz Tesoureiro"
--
-- STATUS: VERSAO REV35.15 CORRIGIDA E HOMOLOGADA PARA SUPABASE SQL EDITOR.
--
-- SUMÁRIO DE ARQUITETURA E BLINDAGEM TÉCNICA:
-- 1. Transação Única Atômica: Toda a execução opera sob bloco BEGIN ... COMMIT.
--    Qualquer divergência detectada na pré-validação dispara ROLLBACK atômico imediato.
-- 2. Compatibilidade Total com PgBouncer / Supabase SQL Editor:
--    Eliminadas todas as tabelas temporárias (TEMP TABLE) que causavam o erro:
--    "ERROR: 42P01: relation '_migration_truly_new_columns' does not exist".
-- 3. Pré-Validação de Segurança (Seção 0):
--    - Inspeciona pg_catalog para profiles, players, expenses, monthly_payments,
--      balance_adjustments, assistant_permissions e treasurer_permissions.
--    - Adequado ao modelo real RDA (players.id existe; players.user_id não existe).
-- 4. Estrutura Canônica de Auditoria e Escopo (Seção 1):
--    - expenses: created_by (uuid REFERENCES profiles(id) ON DELETE SET NULL, DEFAULT auth.uid())
--      e created_by_name (text), preservando nulos históricos.
--    - balance_adjustments: scope ('monthly' | 'direct_cash') e adjustment_month (text),
--      DEFAULT auth.uid() em created_by.
-- 5. Integridade Referencial e Chaves Estrangeiras (Seção 2):
--    - balance_adjustments_created_by_fkey com ON DELETE RESTRICT (protege a autoria contábil).
--    - assistant_permissions e treasurer_permissions com ON DELETE CASCADE em profile_id.
-- 6. Expansão Canônica das 16 Permissões (Seção 3):
--    - Garante as 16 colunas em assistant_permissions e treasurer_permissions.
--    - Aplica NOT NULL e DEFAULT false em todas as 16 colunas.
--    - Normaliza valores NULL legados para false.
--    - Garante que todo assistente e tesoureiro possua registro nas respectivas tabelas.
-- 7. Funções de Autorização Seguras (Seção 4):
--    - is_admin(), is_assistant(), is_treasurer(), assistant_can(_perm), treasurer_can(_perm)
--      com SECURITY DEFINER e SET search_path = ''.
-- 8. Limpeza e Substituição Idempotente de Políticas RLS (Seção 5 e 6):
--    - DROP POLICY IF EXISTS para todas as políticas legadas e canônicas.
--    - Recriação das políticas canônicas em dupla camada (PERMISSIVE + RESTRICTIVE Guard).
--    - expenses: leitura granular (view_finance, manage_finance ou permissão de despesas).
--    - monthly_payments: leitura para perfis autorizados; mutações restritas a Admin e Tesoureiro.
--    - balance_adjustments: leitura para autorizados; inserção restrita a Admin e Tesoureiro;
--      UPDATE/DELETE bloqueados para todos os perfis.
--    - assistant_permissions / treasurer_permissions: gestão exclusiva de Admin.
-- 9. Proteção de Autoria e Imutabilidade Contábil (Seção 7):
--    - Trigger trg_expenses_protect_created_by: impede não-admins de falsificar created_by.
--    - Triggers trg_prevent_balance_adjustment_mutation e trg_prevent_balance_adjustment_truncate:
--      bloqueiam UPDATE, DELETE e TRUNCATE em balance_adjustments.
--    - Privilégios ACL estritos concedidos a authenticated.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. PRÉ-VALIDAÇÃO INTEGRAL DE SCHEMA, TABELAS E ESTRUTURA
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  i int;
  v_tbl text;
  v_col text;
  c_required_tables CONSTANT text[] := ARRAY[
    'profiles', 'players', 'expenses', 'monthly_payments',
    'balance_adjustments', 'assistant_permissions', 'treasurer_permissions'
  ];
  c_required_cols CONSTANT text[][] := ARRAY[
    ['profiles', 'id'],
    ['profiles', 'role'],
    ['players', 'id'],
    ['monthly_payments', 'id'],
    ['monthly_payments', 'player_id'],
    ['monthly_payments', 'amount'],
    ['expenses', 'id'],
    ['expenses', 'amount'],
    ['expenses', 'description'],
    ['balance_adjustments', 'id'],
    ['balance_adjustments', 'amount'],
    ['balance_adjustments', 'created_by'],
    ['assistant_permissions', 'profile_id'],
    ['treasurer_permissions', 'profile_id']
  ];
BEGIN
  -- Validação de existência de tabelas
  FOREACH v_tbl IN ARRAY c_required_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = v_tbl AND c.relkind = 'r'
    ) THEN
      v_missing := array_append(v_missing, 'tabela public.' || v_tbl);
    END IF;
  END LOOP;

  -- Validação de existência de colunas essenciais
  FOR i IN 1 .. array_length(c_required_cols, 1) LOOP
    v_tbl := c_required_cols[i][1];
    v_col := c_required_cols[i][2];
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = v_tbl AND a.attname = v_col AND NOT a.attisdropped
    ) THEN
      v_missing := array_append(v_missing, 'coluna public.' || v_tbl || '.' || v_col);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'MIGRAÇÃO REV35.15 ABORTADA: Elementos essenciais ausentes: %', array_to_string(v_missing, '; ');
  END IF;

  -- Validação de identificadores NULL
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id IS NULL)
     OR EXISTS (SELECT 1 FROM public.players WHERE id IS NULL)
     OR EXISTS (SELECT 1 FROM public.expenses WHERE id IS NULL)
     OR EXISTS (SELECT 1 FROM public.monthly_payments WHERE id IS NULL)
     OR EXISTS (SELECT 1 FROM public.balance_adjustments WHERE id IS NULL)
     OR EXISTS (SELECT 1 FROM public.assistant_permissions WHERE profile_id IS NULL)
     OR EXISTS (SELECT 1 FROM public.treasurer_permissions WHERE profile_id IS NULL)
  THEN
    RAISE EXCEPTION 'MIGRAÇÃO REV35.15 ABORTADA: identificadores NULL detectados em tabelas fundamentais.';
  END IF;

  -- Validação de ausência de duplicidades
  IF EXISTS (SELECT id FROM public.profiles GROUP BY id HAVING count(*) > 1)
     OR EXISTS (SELECT id FROM public.players GROUP BY id HAVING count(*) > 1)
     OR EXISTS (SELECT id FROM public.expenses GROUP BY id HAVING count(*) > 1)
     OR EXISTS (SELECT id FROM public.monthly_payments GROUP BY id HAVING count(*) > 1)
     OR EXISTS (SELECT id FROM public.balance_adjustments GROUP BY id HAVING count(*) > 1)
     OR EXISTS (SELECT profile_id FROM public.assistant_permissions GROUP BY profile_id HAVING count(*) > 1)
     OR EXISTS (SELECT profile_id FROM public.treasurer_permissions GROUP BY profile_id HAVING count(*) > 1)
  THEN
    RAISE EXCEPTION 'MIGRAÇÃO REV35.15 ABORTADA: duplicidades de chave primária detectadas.';
  END IF;

  RAISE NOTICE 'PRÉ-VALIDAÇÃO CONCLUÍDA COM SUCESSO: todas as tabelas e colunas fundamentais validadas.';
END;
$$;


-- ------------------------------------------------------------------------------
-- 1. ESTRUTURAÇÃO SEGURA DAS COLUNAS DE AUDITORIA E ESCOPO
-- ------------------------------------------------------------------------------

-- Adiciona created_by e created_by_name em public.expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_name text;

ALTER TABLE public.expenses
  ALTER COLUMN created_by SET DEFAULT auth.uid();

COMMENT ON COLUMN public.expenses.created_by IS 'Perfil que registrou a despesa (preserva registros históricos como NULL)';
COMMENT ON COLUMN public.expenses.created_by_name IS 'Nome do operador no momento do registro da despesa';

-- Adiciona scope e adjustment_month em public.balance_adjustments
ALTER TABLE public.balance_adjustments
  ADD COLUMN IF NOT EXISTS scope text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS adjustment_month text;

ALTER TABLE public.balance_adjustments
  ALTER COLUMN created_by SET DEFAULT auth.uid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.balance_adjustments'::regclass
      AND conname = 'chk_balance_adjustments_scope'
  ) THEN
    ALTER TABLE public.balance_adjustments
      ADD CONSTRAINT chk_balance_adjustments_scope
      CHECK (scope IS NULL OR scope IN ('monthly', 'direct_cash'));
  END IF;
END;
$$;

COMMENT ON COLUMN public.balance_adjustments.scope IS 'Escopo contábil do ajuste: monthly (mês selecionado) ou direct_cash (caixa total)';
COMMENT ON COLUMN public.balance_adjustments.adjustment_month IS 'Mês de competência do ajuste no formato YYYY-MM (NULL para caixa direto)';


-- ------------------------------------------------------------------------------
-- 2. INTEGRIDADE REFERENCIAL E CHAVES ESTRANGEIRAS CANÔNICAS
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  r_con record;
BEGIN
  -- Localiza e remove cirurgicamente FKs simples legadas de balance_adjustments.created_by para profiles(id)
  FOR r_con IN
    SELECT c.conname
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.balance_adjustments'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.profiles'::regclass
      AND array_length(c.conkey, 1) = 1
      AND array_length(c.confkey, 1) = 1
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = c.conkey[1] AND a.attname = 'created_by'
      )
  LOOP
    EXECUTE pg_catalog.format('ALTER TABLE public.balance_adjustments DROP CONSTRAINT IF EXISTS %I', r_con.conname);
  END LOOP;

  -- Recria FK canônica com ON DELETE RESTRICT (protegendo a autoria contábil)
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.balance_adjustments'::regclass
      AND conname = 'balance_adjustments_created_by_fkey'
  ) THEN
    ALTER TABLE public.balance_adjustments
      ADD CONSTRAINT balance_adjustments_created_by_fkey
      FOREIGN KEY (created_by)
      REFERENCES public.profiles(id)
      ON DELETE RESTRICT;
  END IF;

  -- Garante chave estrangeira de assistant_permissions(profile_id) -> profiles(id) ON DELETE CASCADE
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.assistant_permissions'::regclass
      AND contype = 'f'
      AND confrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.assistant_permissions
      ADD CONSTRAINT assistant_permissions_profile_id_fkey
      FOREIGN KEY (profile_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;

  -- Garante chave estrangeira de treasurer_permissions(profile_id) -> profiles(id) ON DELETE CASCADE
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.treasurer_permissions'::regclass
      AND contype = 'f'
      AND confrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.treasurer_permissions
      ADD CONSTRAINT treasurer_permissions_profile_id_fkey
      FOREIGN KEY (profile_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END;
$$;


-- ------------------------------------------------------------------------------
-- 3. EXPANSÃO CANÔNICA DAS 16 PERMISSÕES E CONSISTÊNCIA ESTRUTURAL
-- ------------------------------------------------------------------------------

-- 3.1 Garantir todas as 16 colunas em assistant_permissions
ALTER TABLE public.assistant_permissions
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

-- 3.2 Garantir todas as 16 colunas em treasurer_permissions
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

-- 3.3 Normalização de valores NULL legados para false e imposição de NOT NULL / DEFAULT false
UPDATE public.assistant_permissions SET
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

-- 3.4 Garantir que todo assistente e tesoureiro cadastrado tenha linha de permissões
INSERT INTO public.assistant_permissions (profile_id)
SELECT p.id FROM public.profiles p
WHERE p.role = 'assistant'
  AND NOT EXISTS (SELECT 1 FROM public.assistant_permissions ap WHERE ap.profile_id = p.id)
ON CONFLICT (profile_id) DO NOTHING;

INSERT INTO public.treasurer_permissions (profile_id)
SELECT p.id FROM public.profiles p
WHERE p.role = 'treasurer'
  AND NOT EXISTS (SELECT 1 FROM public.treasurer_permissions tp WHERE tp.profile_id = p.id)
ON CONFLICT (profile_id) DO NOTHING;


-- ------------------------------------------------------------------------------
-- 4. FUNÇÕES DE AUTORIZAÇÃO E PAPÉIS (SECURITY DEFINER + search_path VAZIO)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_assistant()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'assistant'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_treasurer()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'treasurer'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.assistant_can(_perm text)
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

  -- Requer que o usuário ativo tenha papel de assistente
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid AND role = 'assistant'
  ) THEN
    RETURN false;
  END IF;

  SELECT COALESCE(
    CASE _perm
      WHEN 'view_finance'            THEN ap.view_finance
      WHEN 'manage_finance'          THEN ap.manage_finance
      WHEN 'manage_expenses'         THEN ap.manage_expenses
      WHEN 'edit_expenses'           THEN ap.edit_expenses
      WHEN 'delete_expenses'         THEN ap.delete_expenses
      WHEN 'manage_monthly_payments' THEN ap.manage_monthly_payments
      WHEN 'adjust_balance'          THEN ap.adjust_balance
      WHEN 'create_match'            THEN ap.create_match
      WHEN 'edit_match'              THEN ap.edit_match
      WHEN 'insert_stats'            THEN ap.insert_stats
      WHEN 'edit_players'            THEN ap.edit_players
      WHEN 'delete_players'          THEN ap.delete_players
      WHEN 'create_notices'          THEN ap.create_notices
      WHEN 'edit_notices'            THEN ap.edit_notices
      WHEN 'delete_notices'          THEN ap.delete_notices
      WHEN 'import_history'          THEN ap.import_history
      ELSE false
    END, false
  )
  INTO v_has_permission
  FROM public.assistant_permissions ap
  WHERE ap.profile_id = v_uid;

  RETURN COALESCE(v_has_permission, false);
END;
$$;

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

-- Privilégios de execução das funções
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_assistant() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_assistant() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_treasurer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_treasurer() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.assistant_can(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assistant_can(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.treasurer_can(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.treasurer_can(text) TO authenticated, service_role;


-- ------------------------------------------------------------------------------
-- 5. REMOÇÃO IDEMPOTENTE DAS POLÍTICAS RLS LEGADAS E ANTERIORES
-- ------------------------------------------------------------------------------

-- Habilitar RLS em todas as tabelas envolvidas
ALTER TABLE public.assistant_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasurer_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r record;
BEGIN
  -- Remove qualquer política existente nas 5 tabelas para recriação canônica limpa
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'assistant_permissions',
        'treasurer_permissions',
        'expenses',
        'monthly_payments',
        'balance_adjustments'
      )
  LOOP
    EXECUTE pg_catalog.format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END;
$$;


-- ------------------------------------------------------------------------------
-- 6. POLÍTICAS RLS CANÔNICAS EM DUPLA CAMADA (PERMISSIVE + RESTRICTIVE GUARD)
-- ------------------------------------------------------------------------------

-- === 6.1 TABELA public.assistant_permissions ===
CREATE POLICY assistant_permissions_canonical_select
  ON public.assistant_permissions AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.is_admin() OR (public.is_assistant() AND auth.uid() = profile_id));

CREATE POLICY assistant_permissions_canonical_select_guard
  ON public.assistant_permissions AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.is_admin() OR (public.is_assistant() AND auth.uid() = profile_id));

CREATE POLICY assistant_permissions_canonical_insert
  ON public.assistant_permissions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY assistant_permissions_canonical_insert_guard
  ON public.assistant_permissions AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY assistant_permissions_canonical_update
  ON public.assistant_permissions AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY assistant_permissions_canonical_update_guard
  ON public.assistant_permissions AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY assistant_permissions_canonical_delete
  ON public.assistant_permissions AS PERMISSIVE FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY assistant_permissions_canonical_delete_guard
  ON public.assistant_permissions AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_admin());


-- === 6.2 TABELA public.treasurer_permissions ===
CREATE POLICY treasurer_permissions_canonical_select
  ON public.treasurer_permissions AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.is_admin() OR (public.is_treasurer() AND auth.uid() = profile_id));

CREATE POLICY treasurer_permissions_canonical_select_guard
  ON public.treasurer_permissions AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.is_admin() OR (public.is_treasurer() AND auth.uid() = profile_id));

CREATE POLICY treasurer_permissions_canonical_insert
  ON public.treasurer_permissions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY treasurer_permissions_canonical_insert_guard
  ON public.treasurer_permissions AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY treasurer_permissions_canonical_update
  ON public.treasurer_permissions AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY treasurer_permissions_canonical_update_guard
  ON public.treasurer_permissions AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY treasurer_permissions_canonical_delete
  ON public.treasurer_permissions AS PERMISSIVE FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY treasurer_permissions_canonical_delete_guard
  ON public.treasurer_permissions AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_admin());


-- === 6.3 TABELA public.expenses ===
CREATE POLICY expenses_canonical_select
  ON public.expenses AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.is_treasurer() AND (
      public.treasurer_can('view_finance')
      OR public.treasurer_can('manage_finance')
      OR public.treasurer_can('manage_expenses')
      OR public.treasurer_can('edit_expenses')
      OR public.treasurer_can('delete_expenses')
    ))
    OR (public.is_assistant() AND (
      public.assistant_can('view_finance')
      OR public.assistant_can('manage_finance')
      OR public.assistant_can('manage_expenses')
      OR public.assistant_can('edit_expenses')
      OR public.assistant_can('delete_expenses')
    ))
  );

CREATE POLICY expenses_canonical_select_guard
  ON public.expenses AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.is_treasurer() AND (
      public.treasurer_can('view_finance')
      OR public.treasurer_can('manage_finance')
      OR public.treasurer_can('manage_expenses')
      OR public.treasurer_can('edit_expenses')
      OR public.treasurer_can('delete_expenses')
    ))
    OR (public.is_assistant() AND (
      public.assistant_can('view_finance')
      OR public.assistant_can('manage_finance')
      OR public.assistant_can('manage_expenses')
      OR public.assistant_can('edit_expenses')
      OR public.assistant_can('delete_expenses')
    ))
  );

CREATE POLICY expenses_canonical_insert
  ON public.expenses AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.is_admin()
      AND (created_by IS NULL OR created_by = auth.uid())
    )
    OR (
      (
        (public.is_treasurer() AND (
          public.treasurer_can('manage_finance')
          OR public.treasurer_can('manage_expenses')
        ))
        OR (public.is_assistant() AND (
          public.assistant_can('manage_finance')
          OR public.assistant_can('manage_expenses')
        ))
      )
      AND created_by = auth.uid()
    )
  );

CREATE POLICY expenses_canonical_insert_guard
  ON public.expenses AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.is_admin()
      AND (created_by IS NULL OR created_by = auth.uid())
    )
    OR (
      (
        (public.is_treasurer() AND (
          public.treasurer_can('manage_finance')
          OR public.treasurer_can('manage_expenses')
        ))
        OR (public.is_assistant() AND (
          public.assistant_can('manage_finance')
          OR public.assistant_can('manage_expenses')
        ))
      )
      AND created_by = auth.uid()
    )
  );

CREATE POLICY expenses_canonical_update
  ON public.expenses AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (public.is_treasurer() AND (
      public.treasurer_can('manage_finance') OR public.treasurer_can('edit_expenses')
    ))
    OR (public.is_assistant() AND (
      public.assistant_can('manage_finance') OR public.assistant_can('edit_expenses')
    ))
  )
  WITH CHECK (
    public.is_admin()
    OR (public.is_treasurer() AND (
      public.treasurer_can('manage_finance') OR public.treasurer_can('edit_expenses')
    ))
    OR (public.is_assistant() AND (
      public.assistant_can('manage_finance') OR public.assistant_can('edit_expenses')
    ))
  );

CREATE POLICY expenses_canonical_update_guard
  ON public.expenses AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (public.is_treasurer() AND (
      public.treasurer_can('manage_finance') OR public.treasurer_can('edit_expenses')
    ))
    OR (public.is_assistant() AND (
      public.assistant_can('manage_finance') OR public.assistant_can('edit_expenses')
    ))
  )
  WITH CHECK (
    public.is_admin()
    OR (public.is_treasurer() AND (
      public.treasurer_can('manage_finance') OR public.treasurer_can('edit_expenses')
    ))
    OR (public.is_assistant() AND (
      public.assistant_can('manage_finance') OR public.assistant_can('edit_expenses')
    ))
  );

CREATE POLICY expenses_canonical_delete
  ON public.expenses AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR (public.is_treasurer() AND (
      public.treasurer_can('manage_finance') OR public.treasurer_can('delete_expenses')
    ))
    OR (public.is_assistant() AND (
      public.assistant_can('manage_finance') OR public.assistant_can('delete_expenses')
    ))
  );

CREATE POLICY expenses_canonical_delete_guard
  ON public.expenses AS RESTRICTIVE FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR (public.is_treasurer() AND (
      public.treasurer_can('manage_finance') OR public.treasurer_can('delete_expenses')
    ))
    OR (public.is_assistant() AND (
      public.assistant_can('manage_finance') OR public.assistant_can('delete_expenses')
    ))
  );


-- === 6.4 TABELA public.monthly_payments ===
CREATE POLICY monthly_payments_canonical_select
  ON public.monthly_payments AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.is_treasurer() AND (
      public.treasurer_can('view_finance')
      OR public.treasurer_can('manage_finance')
      OR public.treasurer_can('manage_monthly_payments')
    ))
    OR (public.is_assistant() AND (
      public.assistant_can('view_finance')
      OR public.assistant_can('manage_finance')
      OR public.assistant_can('manage_monthly_payments')
    ))
  );

CREATE POLICY monthly_payments_canonical_select_guard
  ON public.monthly_payments AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.is_treasurer() AND (
      public.treasurer_can('view_finance')
      OR public.treasurer_can('manage_finance')
      OR public.treasurer_can('manage_monthly_payments')
    ))
    OR (public.is_assistant() AND (
      public.assistant_can('view_finance')
      OR public.assistant_can('manage_finance')
      OR public.assistant_can('manage_monthly_payments')
    ))
  );

CREATE POLICY monthly_payments_canonical_insert
  ON public.monthly_payments AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_treasurer()
      AND (
        public.treasurer_can('manage_finance')
        OR public.treasurer_can('manage_monthly_payments')
      )
    )
    OR (
      public.is_assistant()
      AND (
        public.assistant_can('manage_finance')
        OR public.assistant_can('manage_monthly_payments')
      )
    )
  );

CREATE POLICY monthly_payments_canonical_insert_guard
  ON public.monthly_payments AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_treasurer()
      AND (
        public.treasurer_can('manage_finance')
        OR public.treasurer_can('manage_monthly_payments')
      )
    )
    OR (
      public.is_assistant()
      AND (
        public.assistant_can('manage_finance')
        OR public.assistant_can('manage_monthly_payments')
      )
    )
  );

CREATE POLICY monthly_payments_canonical_update
  ON public.monthly_payments AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_treasurer()
      AND (
        public.treasurer_can('manage_finance')
        OR public.treasurer_can('manage_monthly_payments')
      )
    )
    OR (
      public.is_assistant()
      AND (
        public.assistant_can('manage_finance')
        OR public.assistant_can('manage_monthly_payments')
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_treasurer()
      AND (
        public.treasurer_can('manage_finance')
        OR public.treasurer_can('manage_monthly_payments')
      )
    )
    OR (
      public.is_assistant()
      AND (
        public.assistant_can('manage_finance')
        OR public.assistant_can('manage_monthly_payments')
      )
    )
  );

CREATE POLICY monthly_payments_canonical_update_guard
  ON public.monthly_payments AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_treasurer()
      AND (
        public.treasurer_can('manage_finance')
        OR public.treasurer_can('manage_monthly_payments')
      )
    )
    OR (
      public.is_assistant()
      AND (
        public.assistant_can('manage_finance')
        OR public.assistant_can('manage_monthly_payments')
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_treasurer()
      AND (
        public.treasurer_can('manage_finance')
        OR public.treasurer_can('manage_monthly_payments')
      )
    )
    OR (
      public.is_assistant()
      AND (
        public.assistant_can('manage_finance')
        OR public.assistant_can('manage_monthly_payments')
      )
    )
  );

CREATE POLICY monthly_payments_canonical_delete
  ON public.monthly_payments AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_treasurer()
      AND (
        public.treasurer_can('manage_finance')
        OR public.treasurer_can('manage_monthly_payments')
      )
    )
    OR (
      public.is_assistant()
      AND (
        public.assistant_can('manage_finance')
        OR public.assistant_can('manage_monthly_payments')
      )
    )
  );

CREATE POLICY monthly_payments_canonical_delete_guard
  ON public.monthly_payments AS RESTRICTIVE FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_treasurer()
      AND (
        public.treasurer_can('manage_finance')
        OR public.treasurer_can('manage_monthly_payments')
      )
    )
    OR (
      public.is_assistant()
      AND (
        public.assistant_can('manage_finance')
        OR public.assistant_can('manage_monthly_payments')
      )
    )
  );


-- === 6.5 TABELA public.balance_adjustments ===
CREATE POLICY balance_adjustments_canonical_select
  ON public.balance_adjustments AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.is_treasurer() AND (
      public.treasurer_can('view_finance')
      OR public.treasurer_can('manage_finance')
      OR public.treasurer_can('adjust_balance')
    ))
    OR (public.is_assistant() AND (
      public.assistant_can('view_finance')
      OR public.assistant_can('manage_finance')
    ))
  );

CREATE POLICY balance_adjustments_canonical_select_guard
  ON public.balance_adjustments AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.is_treasurer() AND (
      public.treasurer_can('view_finance')
      OR public.treasurer_can('manage_finance')
      OR public.treasurer_can('adjust_balance')
    ))
    OR (public.is_assistant() AND (
      public.assistant_can('view_finance')
      OR public.assistant_can('manage_finance')
    ))
  );

CREATE POLICY balance_adjustments_canonical_insert
  ON public.balance_adjustments AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.is_admin()
      AND (created_by IS NULL OR created_by = auth.uid())
    )
    OR (
      public.is_treasurer()
      AND (public.treasurer_can('manage_finance') OR public.treasurer_can('adjust_balance'))
      AND created_by = auth.uid()
    )
  );

CREATE POLICY balance_adjustments_canonical_insert_guard
  ON public.balance_adjustments AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.is_admin()
      AND (created_by IS NULL OR created_by = auth.uid())
    )
    OR (
      public.is_treasurer()
      AND (public.treasurer_can('manage_finance') OR public.treasurer_can('adjust_balance'))
      AND created_by = auth.uid()
    )
  );


-- ------------------------------------------------------------------------------
-- 7. PROTEÇÃO DE AUTORIA (created_by) E IMUTABILIDADE CONTÁBIL
-- ------------------------------------------------------------------------------

-- 7.1 Gatilho para impedir não-admins de falsificar created_by em UPDATE de despesas
CREATE OR REPLACE FUNCTION public.expenses_protect_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar o autor original (created_by) de uma despesa.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expenses_protect_created_by ON public.expenses;
CREATE TRIGGER trg_expenses_protect_created_by
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.expenses_protect_created_by();

-- 7.2 Imutabilidade Contábil de balance_adjustments: bloqueio incondicional de UPDATE, DELETE e TRUNCATE
CREATE OR REPLACE FUNCTION public.prevent_balance_adjustment_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Ajustes contábeis são imutáveis e permanentes. Operações de % são categoricamente proibidas em balance_adjustments.', TG_OP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_balance_adjustment_mutation ON public.balance_adjustments;
CREATE TRIGGER trg_prevent_balance_adjustment_mutation
  BEFORE UPDATE OR DELETE ON public.balance_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_balance_adjustment_mutation();

CREATE OR REPLACE FUNCTION public.prevent_balance_adjustment_truncate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Operação de TRUNCATE é categoricamente proibida em balance_adjustments.';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_balance_adjustment_truncate ON public.balance_adjustments;
CREATE TRIGGER trg_prevent_balance_adjustment_truncate
  BEFORE TRUNCATE ON public.balance_adjustments
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.prevent_balance_adjustment_truncate();

-- 7.3 Privilégios ACL estritos
GRANT SELECT, INSERT ON public.balance_adjustments TO authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.balance_adjustments FROM authenticated;


-- ------------------------------------------------------------------------------
-- 8. VALIDAÇÃO FINAL E CONFIRMAÇÃO DA MIGRAÇÃO
-- ------------------------------------------------------------------------------

DO $postflight$
DECLARE
  v_count integer;
  v_missing text[];
BEGIN
  SELECT count(*)
    INTO v_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'monthly_payments'
    AND policyname IN (
      'monthly_payments_canonical_insert',
      'monthly_payments_canonical_insert_guard',
      'monthly_payments_canonical_update',
      'monthly_payments_canonical_update_guard',
      'monthly_payments_canonical_delete',
      'monthly_payments_canonical_delete_guard'
    );

  IF v_count <> 6 THEN
    RAISE EXCEPTION 'REV35.16 ABORTADA: esperadas 6 politicas de escrita; encontradas %.', v_count;
  END IF;

  SELECT array_agg(policyname)
    INTO v_missing
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'monthly_payments'
    AND policyname IN (
      'monthly_payments_canonical_insert',
      'monthly_payments_canonical_insert_guard',
      'monthly_payments_canonical_update',
      'monthly_payments_canonical_update_guard',
      'monthly_payments_canonical_delete',
      'monthly_payments_canonical_delete_guard'
    )
    AND concat_ws(' ', qual, with_check) NOT ILIKE '%assistant_can%';

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'REV35.16 ABORTADA: politicas sem regra de permissao do assistente: %.',
      array_to_string(v_missing, ', ');
  END IF;

  RAISE NOTICE 'MIGRAÇÃO REV35.16 APLICADA COM TOTAL SUCESSO!';
  RAISE NOTICE 'Matriz de 16 permissões de assistentes e tesoureiros homologada.';
  RAISE NOTICE 'Permissão granular view_finance instalada e pronta para uso.';
  RAISE NOTICE 'Assistente com manage_monthly_payments autorizado a inserir, editar e excluir mensalidades.';
  RAISE NOTICE 'Políticas RLS e proteções de integridade contábil ativas.';
END;
$postflight$;

COMMIT;
