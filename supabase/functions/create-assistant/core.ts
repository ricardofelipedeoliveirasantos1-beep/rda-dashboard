// ============================================================================
// core.ts — lógica pura da Edge Function create-assistant (sem imports externos)
//
// Esta versão está isenta de imports Deno/esm.sh para permitir testes locais
// via Vitest com injeção de dependências (mocks). O comportamento é idêntico
// ao da função original; index.ts injeta os clients Supabase reais.
//
// Retorna { status, body } — o wrapper (index.ts) converte em Response.
// ============================================================================

export const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PASSWORD_RE = /^\d{6}$/;
export const MAX_ASSISTANTS = 2;
export const MAX_TREASURERS = 1;
// Ban longa (1 ano) para desativar sem apagar histórico. Reativação usa 'none'.
export const DISABLE_BAN_DURATION = "8760h";

export const HTTP_BAD_REQUEST = 400;
export const HTTP_FORBIDDEN = 403;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_INTERNAL = 500;

export interface Deps {
  env: (key: string) => string | undefined;
  getUser: () => Promise<{ user: { id: string } | null; error: unknown | null }>;
  getProfileRole: (userId: string) => Promise<{ data: { role?: string } | null; error: unknown | null }>;
  countUsersByRole: (role: string) => Promise<{ count: number | null; error: unknown | null }>;
  createUser: (params: { email: string; password: string; email_confirm: boolean; user_metadata: { name: string } }) => Promise<{ data: { user?: { id?: string } } | null; error: unknown | null }>;
  deleteUser: (userId: string) => Promise<{ error: unknown | null }>;
  getProfile: (userId: string) => Promise<{ data: { id: string; role?: string }[] | null; error: unknown | null }>;
  updateProfile: (userId: string, patch: { role: string; name: string }) => Promise<{ error: unknown | null }>;
  upsertPermissions: (row: Record<string, unknown>) => Promise<{ error: unknown | null }>;
  getUserById: (userId: string) => Promise<{ data: { user?: { id?: string } } | null; error: unknown | null }>;
  updateUserPassword: (userId: string, password: string) => Promise<{ error: unknown | null }>;
  updateUserBan: (userId: string, banDuration: string) => Promise<{ error: unknown | null }>;
  deletePermissions: (profileId: string) => Promise<{ error: unknown | null }>;
  deleteProfile: (profileId: string) => Promise<{ error: unknown | null }>;
  listAssistantProfiles: () => Promise<{ data: { id: string; name: string }[] | null; error: unknown | null }>;
  listUsersBanned: () => Promise<{ data: { id: string; is_banned: boolean }[] | null; error: unknown | null }>;
}

export interface RequestLike {
  method: string;
  headers: { get(name: string): string | null };
  json: () => Promise<Record<string, unknown>>;
}

function fail(status: number, message: string) {
  return { status, body: { error: message } };
}
function ok(status: number, body: unknown) {
  return { status, body };
}

function safeLog(prefix: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[create-assistant] ${prefix}: ${msg}`);
}

// ---------------------------------------------------------------------------
// Cleanup: exclui SOMENTE o UUID criado nesta requisição
// ---------------------------------------------------------------------------
async function orphanSafeCleanup(deps: Deps, createdUserId: string, reason: string) {
  safeLog("cleanup", `${reason} — removendo usuario orfao ${createdUserId}`);
  const { error } = await deps.deleteUser(createdUserId);
  if (error) {
    safeLog("cleanup failed", `nao consegui excluir ${createdUserId}: ${String(error)}`);
  }
}

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------
async function handleCreate(
  deps: Deps,
  _adminId: string,
  body: { action?: string; name?: unknown; email?: unknown; password?: unknown; targetRole?: unknown },
) {
  const rawName = (body.name as string | undefined) ?? "";
  const rawEmail = (body.email as string | undefined) ?? "";
  const password = body.password as string | undefined;
  const targetRole = (body.targetRole as string) || "assistant";

  if (targetRole !== "assistant" && targetRole !== "treasurer") {
    return fail(HTTP_BAD_REQUEST, "Invalid role specified");
  }

  // Nome: obrigatório + trim + não vazio
  const name = rawName.trim();
  if (!name) {
    return fail(HTTP_BAD_REQUEST, "Name is required");
  }

  // Email: obrigatório + formato
  const email = rawEmail.trim().toLowerCase();
  if (!email) {
    return fail(HTTP_BAD_REQUEST, "Email is required");
  }
  if (!EMAIL_RE.test(email)) {
    return fail(HTTP_BAD_REQUEST, "Invalid email format");
  }

  // Senha: exatamente 6 dígitos (server-side)
  if (typeof password !== "string" || !PASSWORD_RE.test(password)) {
    return fail(HTTP_BAD_REQUEST, "Password must be exactly 6 digits");
  }

  // Verificação de limites baseada no cargo alvo
  const { count, error: countError } = await deps.countUsersByRole(targetRole);
  if (countError) {
    safeLog("count", countError);
    return fail(HTTP_INTERNAL, `Error checking ${targetRole} count`);
  }
  
  if (targetRole === "assistant" && (count ?? 0) >= MAX_ASSISTANTS) {
    return fail(HTTP_BAD_REQUEST, "Maximum limit of 2 assistants reached");
  }
  if (targetRole === "treasurer" && (count ?? 0) >= MAX_TREASURERS) {
    return fail(HTTP_BAD_REQUEST, "Maximum limit of 1 treasurer reached");
  }

  // Criar conta no Auth (email_confirm = true)
  const { data: created, error: createError } = await deps.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError) {
    // email duplicado → erro limpo, sem sucesso falso
    return fail(HTTP_BAD_REQUEST, String(createError instanceof Error ? createError.message : createError));
  }

  const newUserId = created?.user?.id;
  if (!newUserId) {
    return fail(HTTP_INTERNAL, "User creation failed");
  }

  // Re-contagem pós-criação (mitigação de corrida no limite)
  const { count: afterCount, error: recountError } = await deps.countUsersByRole(targetRole);
  if (recountError) {
    safeLog("recount", recountError);
    await orphanSafeCleanup(deps, newUserId, "recount falhou");
    return fail(HTTP_INTERNAL, `Error validating ${targetRole} count`);
  }
  if (targetRole === "assistant" && (afterCount ?? 0) > MAX_ASSISTANTS) {
    await orphanSafeCleanup(deps, newUserId, "excedeu limite de 2 (corrida)");
    return fail(HTTP_BAD_REQUEST, "Maximum limit of 2 assistants reached");
  }
  if (targetRole === "treasurer" && (afterCount ?? 0) > MAX_TREASURERS) {
    await orphanSafeCleanup(deps, newUserId, "excedeu limite de 1 (corrida)");
    return fail(HTTP_BAD_REQUEST, "Maximum limit of 1 treasurer reached");
  }

  try {
    // Confirmar que a trigger handle_new_user criou o profile (com retry)
    let profileRows: { id: string }[] | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data } = await deps.getProfile(newUserId);
      if (data && data.length > 0) {
        profileRows = data;
        break;
      }
      await new Promise((r) => setTimeout(r, 10));
    }

    if (!profileRows || profileRows.length === 0) {
      safeLog("profile", "profile nao foi criado pela trigger");
      await orphanSafeCleanup(deps, newUserId, "profile ausente apos trigger");
      return fail(HTTP_INTERNAL, "Profile was not created");
    }

    // Promover o profile recém-criado (somente este UUID)
    const { error: promoteError } = await deps.updateProfile(newUserId, {
      role: targetRole,
      name,
    });
    if (promoteError) {
      safeLog("promote", promoteError);
      await orphanSafeCleanup(deps, newUserId, "promocao de profile falhou");
      return fail(HTTP_INTERNAL, "Failed to promote profile");
    }

    if (targetRole === "assistant") {
      // assistant_permissions: uma linha, todas false, upsert idempotente
      const { error: permError } = await deps.upsertPermissions({
        profile_id: newUserId,
        create_match: false,
        edit_match: false,
        insert_stats: false,
        edit_players: false,
        manage_finance: false,
        create_notices: false,
        edit_notices: false,
        delete_notices: false,
        import_history: false,
        updated_at: new Date().toISOString(),
      });
      if (permError) {
        safeLog("permissions", permError);
        await orphanSafeCleanup(deps, newUserId, "permissions falhou");
        return fail(HTTP_INTERNAL, "Failed to set assistant permissions");
      }
    }
  } catch (err) {
    safeLog("post-create", err);
    await orphanSafeCleanup(deps, newUserId, "excecao no pos-criacao");
    return fail(HTTP_INTERNAL, "Operacao abortada");
  }

  // Sucesso: apenas id/name/email/role. Nunca senha.
  return ok(200, { success: true, user: { id: newUserId, name, email, role: targetRole } });
}

// ---------------------------------------------------------------------------
// UPDATE_PASSWORD
// ---------------------------------------------------------------------------
async function handleUpdatePassword(
  deps: Deps,
  body: { assistant_id?: unknown; password?: unknown },
) {
  const assistantId = body.assistant_id as string | undefined;
  const password = body.password as string | undefined;

  if (!assistantId) {
    return fail(HTTP_BAD_REQUEST, "assistant_id is required");
  }
  if (typeof password !== "string" || !PASSWORD_RE.test(password)) {
    return fail(HTTP_BAD_REQUEST, "Password must be exactly 6 digits");
  }

  // Confirmar que o alvo é um ASSISTANT ou TREASURER
  const { data: targetProfile, error: targetError } = await deps.getProfileRole(assistantId);
  if (targetError || !targetProfile || (targetProfile.role !== "assistant" && targetProfile.role !== "treasurer")) {
    return fail(HTTP_BAD_REQUEST, "Target user is not an assistant or treasurer");
  }

  // Confirmar que o alvo existe em auth
  const { data: targetUser, error: authTargetError } = await deps.getUserById(assistantId);
  if (authTargetError || !targetUser?.user) {
    return fail(HTTP_BAD_REQUEST, "Target auth user not found");
  }

  const { error: updateError } = await deps.updateUserPassword(assistantId, password);
  if (updateError) {
    return fail(HTTP_BAD_REQUEST, String(updateError instanceof Error ? updateError.message : updateError));
  }

  return ok(200, { success: true });
}

// ---------------------------------------------------------------------------
// UPDATE_ADMIN_PASSWORD — Admin altera a SUA própria senha (server-side).
// REGRAS:
//   - exige JWT válido (checado antes em handleRequest)
//   - userId vem exclusivamente do JWT autenticado (IGNORA qualquer target_user_id)
//   - confirma profiles.role = 'admin'
//   - senha: exatamente 6 números
//   - nunca loga senha/JWT/service_role; nunca retorna senha
// ---------------------------------------------------------------------------
async function handleUpdateAdminPassword(
  deps: Deps,
  callerId: string,
  body: { password?: unknown; target_user_id?: unknown },
) {
  // 6. Nunca aceitar target_user_id arbitrário do frontend.
  if (body.target_user_id !== undefined) {
    safeLog("update_admin_password", "frontend enviou target_user_id; ignorado");
  }

  const password = body.password as string | undefined;
  if (typeof password !== "string" || !PASSWORD_RE.test(password)) {
    return fail(HTTP_BAD_REQUEST, "Password must be exactly 6 digits");
  }

  // 3/4. Confirmar role = admin consultando profiles (identidade do token)
  const { data: profile, error: profileError } = await deps.getProfileRole(callerId);
  if (profileError || !profile || profile.role !== "admin") {
    return fail(HTTP_FORBIDDEN, "Forbidden: admin access required");
  }

  // 5/7/9. Altera apenas a senha do usuário autenticado (server-side)
  const { error } = await deps.updateUserPassword(callerId, password);
  if (error) {
    safeLog("update_admin_password", error);
    return fail(HTTP_INTERNAL, "Failed to update password");
  }

  // 12/13. Sucesso: sem senha.
  return ok(200, { success: true });
}

// ---------------------------------------------------------------------------
// LIST (admin) — retorna assistentes com status ativo/desativado derivado do ban.
// Não exige coluna nova nem migration. Nunca retorna senha.
// ---------------------------------------------------------------------------
async function handleList(deps: Deps) {
  const { data: profiles, error: pError } = await deps.listAssistantProfiles();
  if (pError) {
    safeLog("list profiles", pError);
    return fail(HTTP_INTERNAL, "Failed to list assistants");
  }
  const list = (profiles ?? []).map((p) => ({ id: p.id, name: p.name, role: "assistant", active: true }));

  const { data: users, error: uError } = await deps.listUsersBanned();
  if (uError) {
    safeLog("list users", uError);
    // não falha tudo; trata como todos ativos se o lookup de ban falhar
  } else {
    const banned = new Set((users ?? []).filter((u) => u.is_banned).map((u) => u.id));
    for (const item of list) {
      if (banned.has(item.id)) item.active = false;
    }
  }

  return ok(200, { success: true, assistants: list });
}
// ---------------------------------------------------------------------------
async function resolveAssistant(deps: Deps, assistantId: string) {
  if (!assistantId) {
    return { error: fail(HTTP_BAD_REQUEST, "assistant_id is required") };
  }
  const { data: targetProfile, error: targetError } = await deps.getProfileRole(assistantId);
  if (targetError || !targetProfile || (targetProfile.role !== "assistant" && targetProfile.role !== "treasurer")) {
    return { error: fail(HTTP_BAD_REQUEST, "Target user is not an assistant or treasurer") };
  }
  const { data: targetUser, error: authTargetError } = await deps.getUserById(assistantId);
  if (authTargetError || !targetUser?.user) {
    return { error: fail(HTTP_BAD_REQUEST, "Target auth user not found") };
  }
  return { assistantId };
}

// ---------------------------------------------------------------------------
// DISABLE (desativar via ban de Auth — preserva histórico/perfil/permissões)
// ---------------------------------------------------------------------------
async function handleDisable(
  deps: Deps,
  body: { assistant_id?: unknown },
) {
  const assistantId = body.assistant_id as string | undefined;
  const resolved = await resolveAssistant(deps, assistantId ?? "");
  if (resolved.error) return resolved.error;

  const { error } = await deps.updateUserBan(assistantId!, DISABLE_BAN_DURATION);
  if (error) {
    safeLog("disable", error);
    return fail(HTTP_INTERNAL, "Failed to disable assistant");
  }
  return ok(200, { success: true, active: false });
}

// ---------------------------------------------------------------------------
// ENABLE (reativar — remove o ban de Auth)
// ---------------------------------------------------------------------------
async function handleEnable(
  deps: Deps,
  body: { assistant_id?: unknown },
) {
  const assistantId = body.assistant_id as string | undefined;
  const resolved = await resolveAssistant(deps, assistantId ?? "");
  if (resolved.error) return resolved.error;

  const { error } = await deps.updateUserBan(assistantId!, "none");
  if (error) {
    safeLog("enable", error);
    return fail(HTTP_INTERNAL, "Failed to enable assistant");
  }
  return ok(200, { success: true, active: true });
}

// ---------------------------------------------------------------------------
// DELETE (excluir assistente server-side)
// Ordem: remove assistant_permissions → remove profile → remove auth user.
// NUNCA apaga jogadores/partidas/estatísticas/histórico (não pertencem ao user).
// ---------------------------------------------------------------------------
async function handleDelete(
  deps: Deps,
  body: { assistant_id?: unknown },
) {
  const assistantId = body.assistant_id as string | undefined;
  const resolved = await resolveAssistant(deps, assistantId ?? "");
  if (resolved.error) return resolved.error;

  // 1) permissões do assistente
  const { error: permError } = await deps.deletePermissions(assistantId!);
  if (permError) {
    safeLog("delete perms", permError);
    return fail(HTTP_INTERNAL, "Failed to delete assistant permissions");
  }

  // 2) profile (mantém role/count consistente)
  const { error: profileError } = await deps.deleteProfile(assistantId!);
  if (profileError) {
    safeLog("delete profile", profileError);
    return fail(HTTP_INTERNAL, "Failed to delete assistant profile");
  }

  // 3) conta auth (server-side)
  const { error: userError } = await deps.deleteUser(assistantId!);
  if (userError) {
    safeLog("delete auth", userError);
    return fail(HTTP_INTERNAL, "Failed to delete assistant account");
  }

  return ok(200, { success: true });
}

// ---------------------------------------------------------------------------
// Entry point testável
// ---------------------------------------------------------------------------
export async function handleRequest(req: RequestLike, deps: Deps): Promise<{ status: number; body: unknown }> {
  if (req.method === "OPTIONS") {
    return ok(200, "ok");
  }
  if (req.method !== "POST") {
    return fail(HTTP_BAD_REQUEST, "Method not allowed");
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return fail(HTTP_UNAUTHORIZED, "Authorization header required");
    }

    // Identificar usuário a partir do token autenticado
    const { user, error: authError } = await deps.getUser();
    if (authError || !user) {
      return fail(HTTP_UNAUTHORIZED, "Unauthorized");
    }

    // Confirmar role = admin via profiles (identidade do token)
    const { data: profile, error: profileError } = await deps.getProfileRole(user.id);
    if (profileError || !profile || profile.role !== "admin") {
      return fail(HTTP_FORBIDDEN, "Forbidden: admin access required");
    }

    // service_role obrigatória para operações administrativas
    if (!deps.env("SUPABASE_SERVICE_ROLE_KEY")) {
      safeLog("config", "SUPABASE_SERVICE_ROLE_KEY nao configurada");
      return fail(HTTP_INTERNAL, "Server configuration error");
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return fail(HTTP_BAD_REQUEST, "Invalid JSON body");
    }
    const action = (body.action as string) || "create";

    if (action === "create") {
      return await handleCreate(deps, user.id, body);
    }
      if (action === "update_password") {
      return await handleUpdatePassword(deps, body);
    }
    if (action === "update_admin_password") {
      return await handleUpdateAdminPassword(deps, user.id, body);
    }
    if (action === "disable") {
      return await handleDisable(deps, body);
    }
    if (action === "enable") {
      return await handleEnable(deps, body);
    }
    if (action === "delete") {
      return await handleDelete(deps, body);
    }
    if (action === "list") {
      return await handleList(deps);
    }

    return fail(HTTP_BAD_REQUEST, "Unknown action");
  } catch (err) {
    safeLog("unhandled", err);
    return fail(HTTP_INTERNAL, "Internal server error");
  }
}