-- ============================================================================
-- 31 - CRMFUT - Auditoria de Acessos Administrativos e Blindagem de Limites
--
-- Versão: 2.0 (Revisão de Segurança, Blindagem de search_path e Hardening)
--
-- Objetivo:
-- 1. Criar a tabela public.audit_logs e regras de segurança para rastreabilidade
--    completa e estritamente imutável das operações administrativas realizadas pelo Super Admin:
--    - Criação de conta (Assistente / Tesoureiro)
--    - Edição de credenciais (Nome / E-mail)
--    - Redefinição de senha / PIN (sem registrar senhas)
--    - Bloqueio / Desativação
--    - Desbloqueio / Reativação
--    - Exclusão definitiva de acesso
--    - Alteração de permissões
-- 2. Garantir em nível de banco de dados (ACID / Concorrência) os limites máximos:
--    - Máximo de 4 assistentes (via trigger com advisory lock na tabela profiles)
--    - Máximo de 1 tesoureiro (via partial unique index e trigger na tabela profiles)
-- 3. Revogação instantânea de JWT: Atualização de public.current_user_role() para
--    verificar em tempo real se a conta está banida em auth.users, impedindo
--    acesso residual por tokens já emitidos.
-- 4. Blindagem de search_path: Todas as funções SECURITY DEFINER operam com
--    SET search_path = '' e identificadores explicitamente qualificados por esquema,
--    eliminando riscos de sequestro de caminho de busca.
--
-- Imutabilidade contábil e de segurança:
-- - Registros de auditoria nunca podem ser alterados (UPDATE proibido por trigger e RLS)
-- - Registros de auditoria nunca podem ser apagados (DELETE proibido por trigger e RLS)
-- - Somente Super Admin pode consultar logs de auditoria
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. TABELA DE AUDITORIA: public.audit_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_user_id uuid,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS 'Trilha de auditoria administrativa de acessos e credenciais do RDA';
COMMENT ON COLUMN public.audit_logs.admin_id IS 'UUID do Super Admin que autorizou/executou a operação';
COMMENT ON COLUMN public.audit_logs.target_user_id IS 'UUID do usuário alvo da ação administrativa';
COMMENT ON COLUMN public.audit_logs.action IS 'Ação administrativa executada (create, update_credentials, update_password, disable, enable, delete, update_permissions)';
COMMENT ON COLUMN public.audit_logs.details IS 'Metadados da operação (campos alterados, cargo, etc. NUNCA senhas ou segredos)';
COMMENT ON COLUMN public.audit_logs.created_at IS 'Carimbo de data e hora UTC da operação';

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user ON public.audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Trigger para garantir imutabilidade estrita (bloquear UPDATE e DELETE)
CREATE OR REPLACE FUNCTION public.prevent_audit_logs_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Operação negada: registros de auditoria administrativa são estritamente imutáveis e permanentes.';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_audit_logs_mutation() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_logs_mutation();

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies de segurança
DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
CREATE POLICY audit_logs_select_admin
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS audit_logs_insert_admin ON public.audit_logs;
CREATE POLICY audit_logs_insert_admin
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_admin());

-- Revoga privilégios para authenticated e anon; concede estritamente o necessário
REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;

-- ----------------------------------------------------------------------------
-- 2. BLINDAGEM DE CONCORRÊNCIA E LIMITES NO BANCO DE DADOS
-- ----------------------------------------------------------------------------

-- 2.1. Índice único parcial para garantir no máximo 1 Tesoureiro ativo/cadastrado
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_treasurer
  ON public.profiles(role)
  WHERE (role = 'treasurer');

-- 2.2. Trigger com lock transacional consultivo para validar o limite de 4 Assistentes
CREATE OR REPLACE FUNCTION public.check_max_assistants_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NEW.role = 'assistant' AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM 'assistant') THEN
    -- Bloqueio consultivo em nível de transação para serializar contagens concorrentes
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('profiles_assistant_limit_lock'));
    SELECT pg_catalog.count(*) INTO v_count FROM public.profiles WHERE role = 'assistant' AND id <> NEW.id;
    IF v_count >= 4 THEN
      RAISE EXCEPTION 'Limite máximo de 4 assistentes atingido' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_max_assistants_limit() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_check_max_assistants ON public.profiles;
CREATE TRIGGER trg_check_max_assistants
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_max_assistants_limit();

-- 2.3. Trigger para validar o limite de 1 Tesoureiro
CREATE OR REPLACE FUNCTION public.check_max_treasurer_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NEW.role = 'treasurer' AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM 'treasurer') THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('profiles_treasurer_limit_lock'));
    SELECT pg_catalog.count(*) INTO v_count FROM public.profiles WHERE role = 'treasurer' AND id <> NEW.id;
    IF v_count >= 1 THEN
      RAISE EXCEPTION 'Limite máximo de 1 tesoureiro atingido' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_max_treasurer_limit() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_check_max_treasurer ON public.profiles;
CREATE TRIGGER trg_check_max_treasurer
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_max_treasurer_limit();

-- ----------------------------------------------------------------------------
-- 3. REVOGAÇÃO IMEDIATA DE ACESSO RESIDUAL (INVALIDAÇÃO DE JWT BANIDO)
-- ----------------------------------------------------------------------------

-- Atualiza public.current_user_role() para verificar banimento em tempo real em auth.users
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
  v_banned timestamptz;
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- Checagem em tempo real de banimento em auth.users para bloquear tokens já emitidos
  SELECT banned_until INTO v_banned
  FROM auth.users
  WHERE id = v_uid;

  IF v_banned IS NOT NULL AND v_banned > pg_catalog.now() THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = v_uid;

  RETURN v_role;
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated, service_role;

COMMIT;
