-- ============================================================================
-- 33 - CRMFUT - Correcao Trigger Prevent Nonadmin Role Change.sql
-- ============================================================================
-- PROJETO: RDA — Racha dos Amigos
-- SUPABASE PROJECT REF: bdpocxppyoavqbpcmfdb
-- DATA: 2026-10-29
--
-- OBJETIVO:
-- Corrigir a sintaxe da função de trigger 'public.prevent_nonadmin_role_change()',
-- sanando o erro em tempo de execução:
--   "Failed to promote profile: missing FROM-clause entry for table \"pg_catalog\""
--
-- DIAGNÓSTICO:
-- Na migração anterior (SQL 32), a instrução:
--   v_session_user := pg_catalog.session_user;
-- causava erro de parser no PostgreSQL, pois 'session_user' é uma palavra-chave
-- reservada SQL standard (não uma coluna de tabela do catálogo pg_catalog).
--
-- CORREÇÃO:
-- 1. Utilizar a palavra-chave SQL padrão 'session_user' diretamente, sem qualificador.
-- 2. Preservar rigorosamente a blindagem contra elevação de privilégios:
--    a) Conexão direta de DBA (postgres, supabase_admin): liberada.
--    b) Requisição de usuário autenticado (auth.uid() NOT NULL): exige public.is_admin() = true.
--    c) Chamada interna da Edge Function via service_role (auth.uid() IS NULL):
--       exige claim JWT 'service_role' e papel de execução 'service_role'.
--    d) Qualquer outra tentativa não autorizada: bloqueada com RAISE EXCEPTION.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.prevent_nonadmin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_session_user text;
BEGIN
  -- Se o cargo não sofreu alteração, libera a operação normalmente (edição de nome, foto, etc.)
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- 1. CONEXÃO DIRETA DE DBA (Supabase SQL Editor / Migrações do sistema)
  -- session_user reflete a credencial física do socket Postgres (palavra-chave SQL reservada).
  v_session_user := session_user;
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
  -- Exige cumulativamente (Defesa em Profundidade):
  -- a) v_uid IS NULL (já assegurado pelo bloco anterior)
  -- b) Papel de sessão do PostgreSQL ativo: role = 'service_role' (infalsificável por anon/authenticated)
  -- c) Claim JWT validada pelo PostgREST: auth.role() = 'service_role'
  IF (
    NULLIF(pg_catalog.current_setting('role', true), '') = 'service_role'
    AND auth.role() = 'service_role'
  ) THEN
    RETURN NEW;
  END IF;

  -- 4. Bloqueia qualquer outra origem não autorizada
  RAISE EXCEPTION 'Apenas admin pode alterar profiles.role';
END;
$$;

-- Revoga permissões públicas da função
REVOKE ALL ON FUNCTION public.prevent_nonadmin_role_change() FROM PUBLIC;

-- Recria e revalida o trigger na tabela profiles
DROP TRIGGER IF EXISTS trg_profiles_protect_role ON public.profiles;
CREATE TRIGGER trg_profiles_protect_role
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_nonadmin_role_change();

COMMIT;
