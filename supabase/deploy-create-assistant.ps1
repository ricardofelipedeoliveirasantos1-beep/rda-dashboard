# ============================================================================
# deploy-create-assistant.ps1 — DEPLOY CONTROLADO (somente documentação)
#
# ESTADO ATUAL: NÃO EXECUTADO. Este script é um guia passo-a-passo.
# Somente deve ser executado APÓS o usuário:
#   1) fornecer o project ref (ID do projeto) e
#   2) autorizar explicitamente o deploy e a configuração de secrets.
#
# NUNCA imprimir o valor da service_role nem dos JWTs. Usar variável de ambiente.
# NUNCA commit secrets. NUNCA colocar service_role no frontend.
# ============================================================================

# --- 0. PRÉ-REQUISITOS -------------------------------------------------------
# - Supabase CLI instalado (`supabase --version`)
# - project ref conhecido: como em https://<ref>.supabase.co
# - Um único Assistant de teste a ser criado (limite de 2 assistentes)

# --- 1. VINCULAR O PROJETO ---------------------------------------------------
# (necessário antes de deploy/secrets; cria supabase/.temp)
# WARN: exige credencial de login do supabase (não é secret de produção)
# supabase login

# --- 2. PREENCHER project_id EM config.toml ----------------------------------
# Substitua "SUBSTITUIR_PELO_PROJECT_REF" pelo ID real do projeto.
# Isso é um valor público (aparece na URL), NÃO é um secret.

# --- 3. DEFINIR SECRETS (server-side apenas) ---------------------------------
# service_role fica SOMENTE no ambiente da Edge Function.
# NUNCA em VITE_*, src/, localStorage, sessionStorage ou repositório.
#
#   $env:SUPABASE_SERVICE_ROLE_KEY = "..."   # de preferência via prompt segura
#   supabase secrets set SUPABASE_URL=$env:VITE_SUPABASE_URL
#   supabase secrets set SUPABASE_ANON_KEY=$env:VITE_SUPABASE_ANON_KEY
#   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=$env:SUPABASE_SERVICE_ROLE_KEY
#
# Confirmação SEM imprimir o valor:
#   supabase secrets list   # mostra apenas o nome + "updated", não o valor

# --- 4. DEPLOY (SOMENTE ESTA FUNÇÃO) -----------------------------------------
#   supabase functions deploy create-assistant
# NÃO deployar outras functions.

# --- 5. CONFIRMAR DEPLOY -----------------------------------------------------
#   supabase functions list
# Esperado: name=create-assistant, status ativo/disponível.
# AINDA NÃO chamar criação.

# --- 6. TESTE DE AUTORIZAÇÃO (antes de criar) --------------------------------
# Sem Authorization -> esperado 401.
#   curl -X POST https://<ref>.supabase.co/functions/v1/create-assistant `
#        -H "Content-Type: application/json" -d '{"action":"create"}'
# Usuário não-admin (se houver forma segura de simular) -> esperado 403.

# --- 7. APÓS AUTORIZAÇÃO E COM ADMIN REAL ------------------------------------
# Chamar criação de UM único Assistant de teste pelo painel:
#   Ajustes -> Usuários e Acesso -> Criar Assistente
# A função valida JWT + profiles.role='admin' antes de criar.

# --- 8. VALIDAR CRIAÇÃO (dashboard/queries, apenas leitura) ------------------
# auth.users                     -> novo usuário existe
# profiles                       -> mesmo UUID, role='assistant'
# assistant_permissions          -> 1 linha, todas as permissões false

# --- 9. PRÓXIMAS ETAPAS (em etapas SEPARADAS, nesta ordem) -------------------
#   a) Login do Assistant (email + senha 6 dígitos)        -> role=assistant
#   b) Nenhuma permissão administrativa visível (todas false)
#   c) Admin ativa SOMENTE edit_match=true                  -> só ações de edição
#   d) Alterar Senha do Assistant (6 dígitos)               -> antiga falha/nova ok

# --- 10. EM CASO DE ERRO EM QUALQUER ETAPA -----------------------------------
# PARAR. Não criar segundo Assistant. Não alterar RLS. Não continuar deploys.
# Registrar: etapa, erro, mensagem, status HTTP — SEM dados sensíveis
# (nunca senha / JWT completo / service_role).

Write-Host "SCRIPT DE DEPLOY PREPARADO, NAO EXECUTADO."
Write-Host "Aguardando autorizacao do usuario para executar."