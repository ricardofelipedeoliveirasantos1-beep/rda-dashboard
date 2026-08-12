-- ============================================================================
-- 01_admin_bootstrap.sql   (Etapas 1-2: primeiro ADMIN)
-- Execute SOMENTE com acesso service_role / SQL editor com permissão total.
-- NÃO execute aqui a trigger; ela será criada na etapa 4.
--
-- PASSOS:
--   1. Crie o usuário no painel do Supabase (Authentication > Add user),
--      informe email + senha. Copie o UUID gerado.
--   2. Execute o UPDATE abaixo substituindo <UUID_DO_ADMIN>.
-- ============================================================================

-- (Feito no painel) -- 1) criar usuário em auth.users

-- 2) promover o profile desse usuário para admin
-- role já nasce 'visitor' (default da coluna) e aqui viramos admin
UPDATE public.profiles
SET role = 'admin'
WHERE id = '<UUID_DO_ADMIN>';

-- 3) conferir
SELECT id, name, email, role, created_at
FROM public.profiles
WHERE id = '<UUID_DO_ADMIN>';