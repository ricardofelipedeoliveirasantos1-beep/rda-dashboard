-- ============================================================================
-- 31 - CRMFUT - Auditoria de Acessos Administrativos
--
-- Objetivo: Criar a tabela public.audit_logs e regras de segurança para
-- rastreabilidade completa das operações administrativas realizadas pelo Super Admin:
-- - Criação de conta (Assistente / Tesoureiro)
-- - Edição de credenciais (Nome / E-mail)
-- - Redefinição de senha / PIN (sem registrar senhas)
-- - Bloqueio / Desativação
-- - Desbloqueio / Reativação
-- - Exclusão definitiva de acesso
-- - Alteração de permissões
--
-- Imutabilidade contábil e de segurança:
-- - Registros nunca podem ser alterados (UPDATE proibido)
-- - Registros nunca podem ser apagados (DELETE proibido)
-- - Somente Super Admin pode consultar
-- ============================================================================

BEGIN;

-- 1. Criação da tabela audit_logs (se não existir)
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

-- 2. Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user ON public.audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 3. Trigger para garantir imutabilidade (bloquear UPDATE e DELETE)
CREATE OR REPLACE FUNCTION public.prevent_audit_logs_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Operação negada: registros de auditoria administrativa são estritamente imutáveis e permanentes.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_logs_mutation();

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Policies de segurança
DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
CREATE POLICY audit_logs_select_admin
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS audit_logs_insert_admin ON public.audit_logs;
CREATE POLICY audit_logs_insert_admin
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_admin());

-- Revoga privilégios perigosos para authenticated
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM authenticated, anon;

COMMIT;
