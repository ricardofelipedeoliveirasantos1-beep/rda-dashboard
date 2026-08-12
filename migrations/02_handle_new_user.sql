-- ============================================================================
-- 02_handle_new_user.sql   (Etapa 4: trigger para novos usuários)
-- Execute DEPOIS de confirmar que profiles tem as colunas reais:
--   id uuid NOT NULL, name text NOT NULL, role text NOT NULL DEFAULT 'visitor'
-- ============================================================================

-- ------------------------- handle_new_user -------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''                   -- blindado: sem TRUSTED schema
AS $$
DECLARE
  v_name text;
BEGIN
  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    split_part(NEW.email, '@', 1),
    'Usuário'
  );

  INSERT INTO public.profiles (id, name, role)
  VALUES (NEW.id, v_name, 'visitor')   -- novos usuários SEMPRE visitor
  ON CONFLICT (id) DO NOTHING;         -- preserva admin/manual
  RETURN NEW;
END;
$$;

-- ------------------------- trigger -------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();