-- ==============================================================================
-- 29 - CRMFUT - Ajustes Manuais Saldo Acumulado.sql
-- ==============================================================================
-- Projeto: Racha dos Amigos (RDA)
-- Objetivo:
-- 1. Assegurar colunas pré-requisito e adicionar a permissão 'adjust_balance'
--    nas tabelas assistant_permissions e treasurer_permissions.
-- 2. Atualizar as funções de autorização assistant_can() e treasurer_can()
--    com concessão explícita de GRANT EXECUTE.
-- 3. Sanear privilégios (ACL) e políticas RLS de assistant_permissions e treasurer_permissions:
--    - Revogar privilégios de PUBLIC e anon (princípio do menor privilégio).
--    - Conceder SELECT, INSERT, UPDATE, DELETE a authenticated para gestão administrativa.
--    - Remover políticas públicas abertas (Allow public read access).
--    - Restringir SELECT ao administrador ou ao próprio usuário com papel ativo.
--    - Restringir INSERT, UPDATE e DELETE exclusivamente a administradores via RLS.
-- 4. Criar a tabela 'balance_adjustments' com 'target_balance', validação estrita
--    de descrição (não-vazia e sem apenas espaços) e precisão monetária.
-- 5. Imutabilidade contábil: bloquear categoricamente UPDATE e DELETE
--    via privilégios (sem UPDATE/DELETE/REFERENCES/TRIGGER) e trigger dedicada
--    compatível com ON DELETE SET NULL de profiles.
-- 6. Habilitar RLS com políticas restritivas para SELECT e INSERT em balance_adjustments.
--
-- INSTRUÇÕES:
-- Execute este script no SQL Editor do painel Supabase quando for autorizado.
-- NÃO execute sem autorização explícita do administrador.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ASSEGURAR COLUNAS NAS TABELAS DE PERMISSÕES
-- ------------------------------------------------------------------------------

-- Tabela assistant_permissions (idempotente: garante manage_expenses, delete_players e adjust_balance)
ALTER TABLE public.assistant_permissions
  ADD COLUMN IF NOT EXISTS manage_expenses boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delete_players boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS adjust_balance boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.assistant_permissions.adjust_balance IS 'Permite ao assistente adicionar valores ou corrigir o saldo acumulado';

-- Tabela treasurer_permissions
ALTER TABLE public.treasurer_permissions
  ADD COLUMN IF NOT EXISTS adjust_balance boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.treasurer_permissions.adjust_balance IS 'Permite ao tesoureiro adicionar valores ou corrigir o saldo acumulado';

-- ------------------------------------------------------------------------------
-- 2. ATUALIZAR FUNÇÕES DE AUTORIZAÇÃO (ASSISTANT E TREASURER)
-- ------------------------------------------------------------------------------

-- Função assistant_can: preserva todas as permissões anteriores e suporta 'adjust_balance'
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
      WHEN 'manage_expenses'   THEN ap.manage_expenses
      WHEN 'create_notices'    THEN ap.create_notices
      WHEN 'edit_notices'      THEN ap.edit_notices
      WHEN 'delete_notices'    THEN ap.delete_notices
      WHEN 'import_history'    THEN ap.import_history
      WHEN 'adjust_balance'    THEN ap.adjust_balance
      ELSE false
    END
    FROM public.assistant_permissions ap
    WHERE ap.profile_id = (SELECT auth.uid())
  ), false);
$$;

GRANT EXECUTE ON FUNCTION public.assistant_can(text) TO authenticated;

-- Função treasurer_can: preserva permissões anteriores e suporta 'adjust_balance'
CREATE OR REPLACE FUNCTION public.treasurer_can(_perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE _perm
      WHEN 'manage_finance'           THEN tp.manage_finance
      WHEN 'manage_monthly_payments'  THEN tp.manage_monthly_payments
      WHEN 'adjust_balance'           THEN tp.adjust_balance
      ELSE false
    END
    FROM public.treasurer_permissions tp
    WHERE tp.profile_id = (SELECT auth.uid())
  ), false);
$$;

GRANT EXECUTE ON FUNCTION public.treasurer_can(text) TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. SANEAMENTO DE PRIVILÉGIOS (ACL) E RLS NAS TABELAS DE PERMISSÕES
-- ------------------------------------------------------------------------------

-- === A. TABELA public.assistant_permissions ===

-- 1. Princípio do Menor Privilégio (ACL):
-- Revoga todos os privilégios de anon e PUBLIC (bloqueia acesso de visitantes/anônimos)
REVOKE ALL ON public.assistant_permissions FROM PUBLIC, anon;

-- Concede estritamente os privilégios necessários para authenticated
-- (SELECT para carregar sessão/listar e INSERT/UPDATE/DELETE para que administradores operem via API)
REVOKE ALL ON public.assistant_permissions FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_permissions TO authenticated;
-- (Bloqueia categoricamente TRUNCATE, REFERENCES e TRIGGER para authenticated)

-- 2. Remoção explícita de todas as políticas anteriores (públicas, permissivas e legadas)
DROP POLICY IF EXISTS "Allow public read access to assistant_permissions" ON public.assistant_permissions;
DROP POLICY IF EXISTS "Allow admins to manage assistant_permissions" ON public.assistant_permissions;
DROP POLICY IF EXISTS "assistant_permissions_select" ON public.assistant_permissions;
DROP POLICY IF EXISTS "assistant_permissions_insert_admin" ON public.assistant_permissions;
DROP POLICY IF EXISTS "assistant_permissions_update_admin" ON public.assistant_permissions;
DROP POLICY IF EXISTS "assistant_permissions_delete_admin" ON public.assistant_permissions;
DROP POLICY IF EXISTS "assistant_permissions_admin_all" ON public.assistant_permissions;

-- 3. Habilitação formal de RLS
ALTER TABLE public.assistant_permissions ENABLE ROW LEVEL SECURITY;

-- 4. SELECT restrito: apenas Administrador OU o próprio usuário quando for efetivamente assistente
CREATE POLICY "assistant_permissions_select"
  ON public.assistant_permissions FOR SELECT
  USING (
    public.is_admin()
    OR (public.is_assistant() AND auth.uid() = profile_id)
  );

-- 5. INSERT: exclusivamente Administrador
CREATE POLICY "assistant_permissions_insert_admin"
  ON public.assistant_permissions FOR INSERT
  WITH CHECK (public.is_admin());

-- 6. UPDATE: exclusivamente Administrador (impede auto-concessão de permissões)
CREATE POLICY "assistant_permissions_update_admin"
  ON public.assistant_permissions FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. DELETE: exclusivamente Administrador
CREATE POLICY "assistant_permissions_delete_admin"
  ON public.assistant_permissions FOR DELETE
  USING (public.is_admin());


-- === B. TABELA public.treasurer_permissions ===

-- 1. Princípio do Menor Privilégio (ACL):
-- Revoga todos os privilégios de anon e PUBLIC (bloqueia acesso de visitantes/anônimos)
REVOKE ALL ON public.treasurer_permissions FROM PUBLIC, anon;

-- Concede estritamente os privilégios necessários para authenticated
-- (SELECT para carregar sessão/listar e INSERT/UPDATE/DELETE para que administradores operem via API)
REVOKE ALL ON public.treasurer_permissions FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasurer_permissions TO authenticated;
-- (Bloqueia categoricamente TRUNCATE, REFERENCES e TRIGGER para authenticated)

-- 2. Remoção de políticas para saneamento e garantia de não-duplicação
DROP POLICY IF EXISTS "treasurer_permissions_admin_all" ON public.treasurer_permissions;
DROP POLICY IF EXISTS "treasurer_permissions_self_select" ON public.treasurer_permissions;
DROP POLICY IF EXISTS "treasurer_permissions_read_restricted" ON public.treasurer_permissions;
DROP POLICY IF EXISTS "treasurer_permissions_select" ON public.treasurer_permissions;
DROP POLICY IF EXISTS "treasurer_permissions_insert_admin" ON public.treasurer_permissions;
DROP POLICY IF EXISTS "treasurer_permissions_update_admin" ON public.treasurer_permissions;
DROP POLICY IF EXISTS "treasurer_permissions_delete_admin" ON public.treasurer_permissions;

-- 3. Habilitação formal de RLS
ALTER TABLE public.treasurer_permissions ENABLE ROW LEVEL SECURITY;

-- 4. SELECT restrito: apenas Administrador OU o próprio usuário quando for efetivamente tesoureiro
CREATE POLICY "treasurer_permissions_select"
  ON public.treasurer_permissions FOR SELECT
  USING (
    public.is_admin()
    OR (public.is_treasurer() AND auth.uid() = profile_id)
  );

-- 5. INSERT: exclusivamente Administrador
CREATE POLICY "treasurer_permissions_insert_admin"
  ON public.treasurer_permissions FOR INSERT
  WITH CHECK (public.is_admin());

-- 6. UPDATE: exclusivamente Administrador (impede auto-concessão de permissões)
CREATE POLICY "treasurer_permissions_update_admin"
  ON public.treasurer_permissions FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. DELETE: exclusivamente Administrador
CREATE POLICY "treasurer_permissions_delete_admin"
  ON public.treasurer_permissions FOR DELETE
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. TABELA 'balance_adjustments' (HISTÓRICO E AUDITORIA CONTÁBIL)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.balance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('entry', 'exit')),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('add', 'reconcile')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  adjustment_date DATE NOT NULL,
  previous_balance NUMERIC(10, 2) NOT NULL,
  new_balance NUMERIC(10, 2) NOT NULL,
  target_balance NUMERIC(10, 2),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.balance_adjustments IS 'Histórico auditável e imutável de ajustes no saldo acumulado do RDA';
COMMENT ON COLUMN public.balance_adjustments.type IS 'Natureza: entry (entrada de caixa) ou exit (saída de caixa)';
COMMENT ON COLUMN public.balance_adjustments.operation_type IS 'Operação original: add (adição) ou reconcile (conferência/correção)';
COMMENT ON COLUMN public.balance_adjustments.amount IS 'Valor efetivo do ajuste, sempre positivo e com 2 casas decimais';
COMMENT ON COLUMN public.balance_adjustments.description IS 'Descrição obrigatória (rejeita strings vazias ou só espaços)';
COMMENT ON COLUMN public.balance_adjustments.target_balance IS 'Saldo total conferido informado na operação de conciliação';
COMMENT ON COLUMN public.balance_adjustments.created_by_name IS 'Nome do operador gravado para auditoria permanente';

-- Caso a tabela já tenha sido criada anteriormente sem target_balance ou created_by_name:
ALTER TABLE public.balance_adjustments
  ADD COLUMN IF NOT EXISTS target_balance NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Índices de consulta e auditoria
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_date ON public.balance_adjustments(adjustment_date);
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_created_at ON public.balance_adjustments(created_at);

-- ------------------------------------------------------------------------------
-- 5. IMUTABILIDADE CONTÁBIL: TRIGGER DE PROTEÇÃO CONTRA UPDATE E DELETE
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_balance_adjustment_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Exclusão é terminantemente proibida (histórico contábil permanente)
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Operação negada: lançamentos de ajuste de saldo são imutáveis e auditáveis. Não é permitido excluir registros em balance_adjustments.';
  END IF;

  -- 2. Alteração (UPDATE):
  -- Permite exclusivamente a ação de integridade referencial 'ON DELETE SET NULL'
  -- originada pela exclusão de um perfil de usuário em public.profiles,
  -- preservando intactos o created_by_name e todos os valores contábeis.
  IF TG_OP = 'UPDATE' THEN
    IF OLD.type = NEW.type
       AND OLD.operation_type = NEW.operation_type
       AND OLD.amount = NEW.amount
       AND OLD.description = NEW.description
       AND OLD.adjustment_date = NEW.adjustment_date
       AND OLD.previous_balance = NEW.previous_balance
       AND OLD.new_balance = NEW.new_balance
       AND (OLD.target_balance IS NOT DISTINCT FROM NEW.target_balance)
       AND (OLD.created_by_name IS NOT DISTINCT FROM NEW.created_by_name)
       AND OLD.created_at = NEW.created_at
       AND NEW.created_by IS NULL
       AND OLD.created_by IS NOT NULL THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Operação negada: lançamentos de ajuste de saldo são imutáveis e auditáveis. Não é permitido alterar dados em balance_adjustments. Para retificações, realize um novo lançamento de ajuste compensatório.';
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_balance_adjustment_mutation ON public.balance_adjustments;
CREATE TRIGGER trg_prevent_balance_adjustment_mutation
  BEFORE UPDATE OR DELETE ON public.balance_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_balance_adjustment_mutation();

-- ------------------------------------------------------------------------------
-- 6. PRIVILÉGIOS NO NÍVEL DE TABELA (MENOR PRIVILÉGIO EM balance_adjustments)
-- ------------------------------------------------------------------------------

-- Revoga todos os privilégios de anon e PUBLIC (bloqueia visitantes/anônimos)
REVOKE ALL ON public.balance_adjustments FROM PUBLIC, anon;

-- Revoga todos os privilégios prévios de authenticated (limpa REFERENCES, TRIGGER, UPDATE, DELETE, TRUNCATE)
REVOKE ALL ON public.balance_adjustments FROM authenticated;

-- Concede estritamente SELECT e INSERT para usuários autenticados (avaliados pelo RLS)
GRANT SELECT, INSERT ON public.balance_adjustments TO authenticated;

-- Bloqueia categoricamente UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER para authenticated
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.balance_adjustments FROM authenticated;

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) EM balance_adjustments
-- ------------------------------------------------------------------------------

ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;

-- SELECT: Administradores, Tesoureiros e Assistentes
DROP POLICY IF EXISTS "balance_adjustments_select" ON public.balance_adjustments;
CREATE POLICY "balance_adjustments_select"
  ON public.balance_adjustments FOR SELECT
  USING (
    public.is_admin()
    OR public.is_treasurer()
    OR public.is_assistant()
  );

-- INSERT: Administrador OU Assistente/Tesoureiro com permissão explícita 'adjust_balance'
DROP POLICY IF EXISTS "balance_adjustments_insert" ON public.balance_adjustments;
CREATE POLICY "balance_adjustments_insert"
  ON public.balance_adjustments FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      public.is_admin()
      OR (public.is_assistant() AND public.assistant_can('adjust_balance'))
      OR (public.is_treasurer() AND public.treasurer_can('adjust_balance'))
    )
  );

COMMIT;
