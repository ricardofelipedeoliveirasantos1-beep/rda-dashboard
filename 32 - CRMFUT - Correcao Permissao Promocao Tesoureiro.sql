-- ============================================================================
-- 32 - CRMFUT - Correção de Permissão para Promoção de Tesoureiro e Assistente
--
-- Título recomendado para o Supabase SQL Editor:
-- "32 - CRMFUT - Correção de Permissão para Promoção de Tesoureiro e Assistente"
--
-- Finalidade:
-- 1. Desbloquear a promoção de perfis administrativos realizada pela Edge Function
--    (create-assistant): a trigger anterior 'prevent_nonadmin_role_change' bloqueava
--    o papel 'service_role' porque em chamadas de serviço auth.uid() é NULL.
-- 2. Garantir segurança absoluta contra autoelevação e falsificação de sessão:
--    - Se a requisição contiver um usuário autenticado (auth.uid() IS NOT NULL),
--      a alteração EXIGE rigorosamente que o chamador seja Super Admin (public.is_admin() = true).
--      Nenhuma variável de sessão ou claim JWT contorna essa validação para sessões de usuário.
--    - Operações com service_role exigem simultaneamente: ausência de UID (auth.uid() IS NULL),
--      claim assinado request.jwt.claim.role = 'service_role' e role de sessão 'service_role'.
--    - Operações de manutenção direta pelo DBA no SQL Editor (session_user postgres/supabase_admin)
--      são preservadas.
-- 3. Identificação exaustiva e alinhamento cirúrgico da(s) constraint(s) CHECK em public.profiles:
--    - Não utiliza LIMIT 1; analisa todas as restrições associadas à coluna role.
--    - Confirma que a constraint canônica aceita efetivamente todos os quatro papéis válidos:
--      'admin', 'assistant', 'treasurer' e 'visitor'.
--    - Remove todas as constraints legadas conflitantes que excluem 'treasurer'.
--    - Aborta a transação de forma explícita e segura caso encontre restrições com estrutura
--      inesperada, preservando todas as constraints alheias à lista de papéis.
-- 4. Garantir a existência e segurança da tabela public.treasurer_permissions
--    com RLS restrito ao Super Admin e leitura pelos envolvidos.
--
-- Impactos:
-- - Seguro e 100% idempotente: pode ser executado repetidamente sem efeitos colaterais.
-- - Não apaga nem recria usuários, perfis ou histórico do RDA.
-- - Mantém a restrição de que usuários comuns (visitantes/jogadores/assistentes) NÃO podem
--   alterar seu próprio papel para admin, assistente ou tesoureiro.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ATUALIZAÇÃO DA TRIGGER DE PROTEÇÃO DE PAPEL (profiles.role)
-- ----------------------------------------------------------------------------
-- Impede categoricamente a autoelevação de privilégios. Somente autoriza:
-- a) Conexão direta de DBA no console PostgreSQL (session_user postgres/supabase_admin)
-- b) Super Admin autenticado via JWT (auth.uid() NOT NULL e public.is_admin() = true)
-- c) Rotina de serviço legítima (auth.uid() IS NULL e service_role verificado)
CREATE OR REPLACE FUNCTION public.prevent_nonadmin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_jwt_role text;
  v_setting_role text;
  v_session_user text;
BEGIN
  -- Se o cargo não sofreu alteração, libera a operação normalmente (edição de nome, foto, etc.)
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- 1. CONEXÃO DIRETA DE DBA (Supabase SQL Editor / Migrações do sistema)
  -- session_user reflete a credencial física do socket Postgres, infalsificável via HTTP.
  v_session_user := pg_catalog.session_user;
  IF v_session_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- 2. REQUISIÇÃO AUTENTICADA COM IDENTIDADE DE USUÁRIO (auth.uid() NOT NULL)
  -- Se houver um usuário autenticado, a ÚNICA condição que autoriza a alteração de papel
  -- é ser comprovadamente um Super Admin ativo. Nenhuma claim ou GUC é consultada.
  v_uid := auth.uid();
  IF v_uid IS NOT NULL THEN
    IF public.is_admin() THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Apenas admin pode alterar profiles.role';
    END IF;
  END IF;

  -- 3. OPERAÇÃO DE SERVIÇO AUTORIZADA (auth.uid() IS NULL)
  -- Chamada da Edge Function interna utilizando a service_role key.
  -- Exige cumulativamente:
  -- a) v_uid IS NULL (já assegurado pelo bloco anterior)
  -- b) Claim JWT validado pelo PostgREST: request.jwt.claim.role = 'service_role'
  -- c) Papel de sessão do PostgreSQL: role = 'service_role'
  v_jwt_role := NULLIF(pg_catalog.current_setting('request.jwt.claim.role', true), '');
  v_setting_role := NULLIF(pg_catalog.current_setting('role', true), '');

  IF v_jwt_role = 'service_role' AND v_setting_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 4. Bloqueia qualquer outra origem não autorizada
  RAISE EXCEPTION 'Apenas admin pode alterar profiles.role';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_nonadmin_role_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_profiles_protect_role ON public.profiles;
CREATE TRIGGER trg_profiles_protect_role
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_nonadmin_role_change();

-- ----------------------------------------------------------------------------
-- 2. ALINHAMENTO CIRÚRGICO DA CONSTRAINT CHECK DE PAPÉIS EM public.profiles.role
-- ----------------------------------------------------------------------------
-- Analisa exaustivamente todas as constraints CHECK associadas à coluna 'role' em public.profiles:
-- a) Confirma se já existe uma constraint que aceita efetivamente os quatro papéis válidos:
--    'admin', 'assistant', 'treasurer' e 'visitor'.
-- b) Identifica todas as constraints legadas que restringem a enumeração de papéis sem aceitar 'treasurer'.
-- c) Aborta com erro explícito se encontrar qualquer constraint inesperada ou ambígua.
-- d) Preserva integralmente todas as constraints não relacionadas à lista de papéis.
DO $$
DECLARE
  v_role_attnum smallint;
  r record;
  v_canonical_exists boolean := false;
  v_canonical_conname text := NULL;
  v_legacy_count integer := 0;
  v_legacy_names text[] := ARRAY[]::text[];
  v_unexpected_count integer := 0;
  v_unexpected_details text := '';
  v_def text;
  v_cname text;
BEGIN
  -- 1. Obter número de atributo (attnum) da coluna 'role' na tabela public.profiles
  SELECT attnum INTO v_role_attnum
  FROM pg_catalog.pg_attribute
  WHERE attrelid = 'public.profiles'::regclass
    AND attname = 'role'
    AND NOT attisdropped;

  IF v_role_attnum IS NULL THEN
    RAISE EXCEPTION 'MIGRAÇÃO ABORTADA: Coluna "role" não encontrada na tabela public.profiles.';
  END IF;

  -- 2. Percorrer TODAS as constraints CHECK associadas à coluna 'role' em public.profiles (sem LIMIT 1)
  FOR r IN
    SELECT 
      con.conname,
      pg_catalog.pg_get_constraintdef(con.oid) AS def
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
    JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'profiles'
      AND con.contype = 'c'
      AND (
        (con.conkey IS NOT NULL AND con.conkey @> ARRAY[v_role_attnum])
        OR pg_catalog.pg_get_constraintdef(con.oid) ~* '\mrole\M'
      )
  LOOP
    v_def := r.def;

    -- Caso A: Constraint completa que aceita EFETIVAMENTE TODOS os 4 papéis válidos
    IF v_def ~* '\madmin\M' 
       AND v_def ~* '\massistant\M' 
       AND v_def ~* '\mtreasurer\M' 
       AND v_def ~* '\mvisitor\M' THEN
      v_canonical_exists := true;
      v_canonical_conname := r.conname;

    -- Caso B: Constraint legada que valida papéis mas NÃO aceita 'treasurer'
    ELSIF v_def ~* '\madmin\M' 
          AND v_def ~* '\massistant\M' 
          AND v_def ~* '\mvisitor\M' 
          AND v_def !~* '\mtreasurer\M' THEN
      v_legacy_count := v_legacy_count + 1;
      v_legacy_names := array_append(v_legacy_names, r.conname);

    -- Caso C: Constraint inesperada ou com lógica desconhecida associada a 'role'
    ELSE
      v_unexpected_count := v_unexpected_count + 1;
      v_unexpected_details := v_unexpected_details || format(' [%s: %s]', r.conname, v_def);
    END IF;
  END LOOP;

  -- 3. ABORTO DE SEGURANÇA: se houver qualquer constraint inesperada, aborta a transação sem alterar nada
  IF v_unexpected_count > 0 THEN
    RAISE EXCEPTION 'MIGRAÇÃO ABORTADA POR SEGURANÇA: Encontrada(s) % constraint(s) CHECK com estrutura inesperada na coluna role: %. Nenhuma restrição foi alterada.', 
      v_unexpected_count, v_unexpected_details;
  END IF;

  -- 4. Se a constraint completa já existe e NÃO há nenhuma legada conflitante:
  IF v_canonical_exists AND v_legacy_count = 0 THEN
    RAISE NOTICE 'Constraint completa ("%") já existe e valida os 4 papéis (admin, assistant, treasurer, visitor). Nenhuma alteração necessária.', v_canonical_conname;
    RETURN;
  END IF;

  -- 5. Se houver constraints legadas conflitantes (mesmo que múltiplas), remove todas de forma inequívoca
  IF v_legacy_count > 0 THEN
    FOREACH v_cname IN ARRAY v_legacy_names
    LOOP
      RAISE NOTICE 'Removendo constraint legada restritiva de papéis: %', v_cname;
      EXECUTE pg_catalog.format('ALTER TABLE public.profiles DROP CONSTRAINT %I', v_cname);
    END LOOP;
  END IF;

  -- 6. Aplica a constraint canônica profiles_role_check com os 4 papéis válidos
  -- Se uma constraint completa existia com outro nome diferente de profiles_role_check, padroniza
  IF v_canonical_exists AND v_canonical_conname <> 'profiles_role_check' THEN
    RAISE NOTICE 'Padronizando nome da constraint canônica de "%" para "profiles_role_check".', v_canonical_conname;
    EXECUTE pg_catalog.format('ALTER TABLE public.profiles DROP CONSTRAINT %I', v_canonical_conname);
  END IF;

  RAISE NOTICE 'Aplicando constraint canônica profiles_role_check CHECK (role IN (''admin'', ''assistant'', ''treasurer'', ''visitor'')).';
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'assistant', 'treasurer', 'visitor'));
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. GARANTIA DA TABELA DE PERMISSÕES DO TESOUREIRO (public.treasurer_permissions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treasurer_permissions (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  manage_finance boolean NOT NULL DEFAULT false,
  manage_monthly_payments boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE public.treasurer_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS treasurer_permissions_admin_all ON public.treasurer_permissions;
CREATE POLICY treasurer_permissions_admin_all
  ON public.treasurer_permissions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS treasurer_permissions_read_restricted ON public.treasurer_permissions;
CREATE POLICY treasurer_permissions_read_restricted
  ON public.treasurer_permissions FOR SELECT
  USING (
    public.is_admin()
    OR (auth.uid() = profile_id)
    OR public.is_treasurer()
    OR public.is_assistant()
  );

REVOKE ALL ON TABLE public.treasurer_permissions FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.treasurer_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.treasurer_permissions TO service_role;

COMMIT;
