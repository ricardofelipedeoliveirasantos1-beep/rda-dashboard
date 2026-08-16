-- ==============================================================================
-- 02 - CRMFUT - RLS Visitante Anonymous.sql
-- ==============================================================================
-- Este script reforça as regras de Row Level Security (RLS) para garantir
-- que o Visitante Anônimo do Supabase (que possui role 'authenticated')
-- só tenha permissão de leitura (SELECT) em tabelas públicas do App,
-- e nenhuma permissão em tabelas sensíveis.
--
-- ATENÇÃO: Verifique o nome exato das policies atuais antes de dropar.
-- Os comandos DROP abaixo presumem os nomes padrões gerados pelo Supabase
-- ou comumente utilizados. Caso suas policies tenham nomes diferentes, 
-- adapte o script.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELAS PERMITIDAS PARA LEITURA (VISITANTE E USUÁRIOS)
-- O visitante anônimo PODE ler (SELECT), mas NÃO PODE Inserir/Atualizar/Deletar.
-- ------------------------------------------------------------------------------

-- PLAYERS
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON players;
CREATE POLICY "Enable read access for all authenticated users" 
ON players FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON players;
CREATE POLICY "Enable insert for regular authenticated users" 
ON players FOR INSERT TO authenticated 
WITH CHECK (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON players;
CREATE POLICY "Enable update for regular authenticated users" 
ON players FOR UPDATE TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON players;
CREATE POLICY "Enable delete for regular authenticated users" 
ON players FOR DELETE TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

-- MATCHES
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON matches;
CREATE POLICY "Enable read access for all authenticated users" 
ON matches FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON matches;
CREATE POLICY "Enable insert for regular authenticated users" 
ON matches FOR INSERT TO authenticated 
WITH CHECK (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON matches;
CREATE POLICY "Enable update for regular authenticated users" 
ON matches FOR UPDATE TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON matches;
CREATE POLICY "Enable delete for regular authenticated users" 
ON matches FOR DELETE TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

-- MATCH_PLAYERS
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON match_players;
CREATE POLICY "Enable read access for all authenticated users" 
ON match_players FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON match_players;
CREATE POLICY "Enable insert for regular authenticated users" 
ON match_players FOR INSERT TO authenticated 
WITH CHECK (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON match_players;
CREATE POLICY "Enable update for regular authenticated users" 
ON match_players FOR UPDATE TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON match_players;
CREATE POLICY "Enable delete for regular authenticated users" 
ON match_players FOR DELETE TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

-- MATCH_PLAYER_STATS
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON match_player_stats;
CREATE POLICY "Enable read access for all authenticated users" 
ON match_player_stats FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON match_player_stats;
CREATE POLICY "Enable insert for regular authenticated users" 
ON match_player_stats FOR INSERT TO authenticated 
WITH CHECK (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON match_player_stats;
CREATE POLICY "Enable update for regular authenticated users" 
ON match_player_stats FOR UPDATE TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON match_player_stats;
CREATE POLICY "Enable delete for regular authenticated users" 
ON match_player_stats FOR DELETE TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);


-- ------------------------------------------------------------------------------
-- 2. TABELAS PRIVADAS (BLOQUEADAS PARA VISITANTES)
-- O visitante anônimo NÃO PODE ler nem modificar.
-- ------------------------------------------------------------------------------

-- EXPENSES (Despesas Financeiras)
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON expenses;
CREATE POLICY "Enable read access for regular authenticated users" 
ON expenses FOR SELECT TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON expenses;
CREATE POLICY "Enable insert for regular authenticated users" 
ON expenses FOR INSERT TO authenticated 
WITH CHECK (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON expenses;
CREATE POLICY "Enable update for regular authenticated users" 
ON expenses FOR UPDATE TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON expenses;
CREATE POLICY "Enable delete for regular authenticated users" 
ON expenses FOR DELETE TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

-- MONTHLY_PAYMENTS (Mensalidades)
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON monthly_payments;
CREATE POLICY "Enable read access for regular authenticated users" 
ON monthly_payments FOR SELECT TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON monthly_payments;
CREATE POLICY "Enable insert for regular authenticated users" 
ON monthly_payments FOR INSERT TO authenticated 
WITH CHECK (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON monthly_payments;
CREATE POLICY "Enable update for regular authenticated users" 
ON monthly_payments FOR UPDATE TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON monthly_payments;
CREATE POLICY "Enable delete for regular authenticated users" 
ON monthly_payments FOR DELETE TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

-- PROFILES (Perfis Administrativos)
-- O App.tsx do Visitante não precisa ler `profiles`, mas caso ele tente:
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON profiles;
CREATE POLICY "Enable read access for regular authenticated users" 
ON profiles FOR SELECT TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
CREATE POLICY "Enable update for regular authenticated users" 
ON profiles FOR UPDATE TO authenticated 
USING (auth.uid() = id AND (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false));

-- NOTICES (Avisos)
-- Visitantes devem poder LER os avisos para que o app exiba se houver, 
-- mas jamais modificar.
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON notices;
CREATE POLICY "Enable read access for all authenticated users" 
ON notices FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON notices;
CREATE POLICY "Enable insert for regular authenticated users" 
ON notices FOR INSERT TO authenticated 
WITH CHECK (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON notices;
CREATE POLICY "Enable update for regular authenticated users" 
ON notices FOR UPDATE TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON notices;
CREATE POLICY "Enable delete for regular authenticated users" 
ON notices FOR DELETE TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);

-- ------------------------------------------------------------------------------
-- 3. TABELAS PÚBLICAS
-- SETTINGS precisa ser lido por todos (incluindo anônimos sem login nenhum)
-- para carregar a logo do aplicativo na tela de login.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable read access for all users" ON settings;
CREATE POLICY "Enable read access for all users" 
ON settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON settings;
CREATE POLICY "Enable update for regular authenticated users" 
ON settings FOR UPDATE TO authenticated 
USING (auth.jwt() ->> 'is_anonymous' IS NULL OR (auth.jwt() ->> 'is_anonymous')::boolean = false);
