import { describe, it, expect, vi } from "vitest";
import { handleRequest } from "../../supabase/functions/create-assistant/core.ts";
import type { Deps } from "../../supabase/functions/create-assistant/core.ts";

const ADMIN_ID = "admin-0001";
const VISITOR_ID = "visitor-0001";
const ASSISTANT_ID = "ast-0001";

function makeRequest(overrides: {
  authorization?: string | null;
  method?: string;
  body?: Record<string, unknown>;
}) {
  const { authorization = "Bearer admin-jwt", method = "POST", body = {} } = overrides;
  return {
    method,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? (authorization ?? null) : null,
    },
    json: () => Promise.resolve(body),
  };
}

function baseDeps(overrides: Partial<Deps> = {}): Deps {
  return {
    env: (key: string) => (key === "SUPABASE_SERVICE_ROLE_KEY" ? "svc-role-key" : undefined),
    getUser: vi.fn().mockResolvedValue({ user: { id: ADMIN_ID }, error: null }),
    getProfileRole: vi.fn((userId: string) =>
      Promise.resolve(
        userId === ADMIN_ID
          ? { data: { role: "admin" }, error: null }
          : userId === ASSISTANT_ID
            ? { data: { role: "assistant" }, error: null }
            : { data: { role: "visitor" }, error: null },
      ),
    ),
    countUsersByRole: vi.fn().mockResolvedValue({ count: 0, error: null }),
    createUser: vi.fn((_p) =>
      Promise.resolve({ data: { user: { id: "new-user-1" } }, error: null }),
    ),
    deleteUser: vi.fn().mockResolvedValue({ error: null }),
    getProfile: vi.fn().mockResolvedValue({ data: [{ id: "new-user-1", role: "visitor" }], error: null }),
    updateProfile: vi.fn().mockResolvedValue({ error: null }),
    upsertPermissions: vi.fn().mockResolvedValue({ error: null }),
    getUserById: vi.fn().mockResolvedValue({ data: { user: { id: ASSISTANT_ID } }, error: null }),
    updateUserPassword: vi.fn().mockResolvedValue({ error: null }),
    updateUserBan: vi.fn().mockResolvedValue({ error: null }),
    deletePermissions: vi.fn().mockResolvedValue({ error: null }),
    deleteProfile: vi.fn().mockResolvedValue({ error: null }),
    listAssistantProfiles: vi.fn().mockResolvedValue({ data: [], error: null }),
    listUsersBanned: vi.fn().mockResolvedValue({ data: [], error: null }),
    ...overrides,
  };
}

describe("create-assistant — Edge Function (local, com mocks)", () => {
  it("1) sem Authorization -> 401", async () => {
    const deps = baseDeps();
    const res = await handleRequest(makeRequest({ authorization: null }), deps);
    expect(res.status).toBe(401);
  });

  it("2) usuário visitor -> 403", async () => {
    const deps = baseDeps();
    deps.getUser = vi.fn().mockResolvedValue({ user: { id: VISITOR_ID }, error: null });
    const res = await handleRequest(makeRequest({}), deps);
    expect(res.status).toBe(403);
  });

  it("3) usuário assistant -> 403", async () => {
    const deps = baseDeps();
    deps.getUser = vi.fn().mockResolvedValue({ user: { id: ASSISTANT_ID }, error: null });
    const res = await handleRequest(makeRequest({}), deps);
    expect(res.status).toBe(403);
  });

  it("4) usuário admin -> permitido (chega ao create)", async () => {
    const deps = baseDeps();
    deps.createUser = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });
    const res = await handleRequest(
      makeRequest({ body: { action: "create", email: "a@b.com", password: "123456", name: "Ana" } }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(deps.createUser).toHaveBeenCalled();
  });

  it("5) senha com 5 dígitos -> rejeitar (400)", async () => {
    const deps = baseDeps();
    const res = await handleRequest(
      makeRequest({ body: { action: "create", email: "a@b.com", password: "12345", name: "Ana" } }),
      deps,
    );
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: "Password must be exactly 6 digits" });
  });

  it("6) senha com exatamente 6 dígitos -> aceitar", async () => {
    const deps = baseDeps();
    const res = await handleRequest(
      makeRequest({ body: { action: "create", email: "a@b.com", password: "123456", name: "Ana" } }),
      deps,
    );
    expect(res.status).toBe(200);
  });

  it("7) senha com letras -> rejeitar", async () => {
    const deps = baseDeps();
    const res = await handleRequest(
      makeRequest({ body: { action: "create", email: "a@b.com", password: "abcdef", name: "Ana" } }),
      deps,
    );
    expect(res.status).toBe(400);
  });

  it("8) nome vazio -> rejeitar", async () => {
    const deps = baseDeps();
    const res = await handleRequest(
      makeRequest({ body: { action: "create", email: "a@b.com", password: "123456", name: "   " } }),
      deps,
    );
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: "Name is required" });
  });

  it("9) email inválido -> rejeitar", async () => {
    const deps = baseDeps();
    const res = await handleRequest(
      makeRequest({ body: { action: "create", email: "abc@", password: "123456", name: "Ana" } }),
      deps,
    );
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: "Invalid email format" });
  });

  it("10) já existem 2 assistants -> rejeitar terceira criação", async () => {
    const deps = baseDeps();
    deps.countUsersByRole = vi.fn().mockResolvedValue({ count: 2, error: null });
    const res = await handleRequest(
      makeRequest({ body: { action: "create", email: "a@b.com", password: "123456", name: "Ana" } }),
      deps,
    );
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: "Maximum limit of 2 assistants reached" });
    expect(deps.createUser).not.toHaveBeenCalled();
  });

  it("11) email já existente -> erro (createUser falha) + cleanup não chamado em sucesso falso", async () => {
    const deps = baseDeps();
    deps.createUser = vi.fn().mockResolvedValue({ data: null, error: new Error("User already registered") });
    const res = await handleRequest(
      makeRequest({ body: { action: "create", email: "dup@b.com", password: "123456", name: "Ana" } }),
      deps,
    );
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: "User already registered" });
    expect(res.body).not.toMatchObject({ success: true });
  });

  it("12) falha ao confirmar profile (trigger não criou) -> cleanup + erro", async () => {
    const deps = baseDeps();
    deps.getProfile = vi.fn().mockResolvedValue({ data: [], error: null });
    deps.deleteUser = vi.fn().mockResolvedValue({ error: null });
    const res = await handleRequest(
      makeRequest({ body: { action: "create", email: "a@b.com", password: "123456", name: "Ana" } }),
      deps,
    );
    expect(res.status).toBe(500);
    expect(deps.deleteUser).toHaveBeenCalledWith("new-user-1");
  });

  it("13) falha ao criar assistant_permissions -> cleanup + erro", async () => {
    const deps = baseDeps();
    deps.upsertPermissions = vi.fn().mockResolvedValue({ error: new Error("perm insert failed") });
    deps.deleteUser = vi.fn().mockResolvedValue({ error: null });
    const res = await handleRequest(
      makeRequest({ body: { action: "create", email: "a@b.com", password: "123456", name: "Ana" } }),
      deps,
    );
    expect(res.status).toBe(500);
    expect(deps.deleteUser).toHaveBeenCalledWith("new-user-1");
  });

  it("14) update_password de assistant -> permitido para admin", async () => {
    const deps = baseDeps();
    const res = await handleRequest(
      makeRequest({
        body: { action: "update_password", assistant_id: ASSISTANT_ID, password: "111222" },
      }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("15) update_password tentando alterar admin -> bloqueado", async () => {
    const deps = baseDeps();
    // alvo aponta para admin
    deps.getProfileRole = vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null });
    const res = await handleRequest(
      makeRequest({
        body: { action: "update_password", assistant_id: ADMIN_ID, password: "111222" },
      }),
      deps,
    );
    expect(res.status).toBe(400);
    expect(deps.updateUserPassword).not.toHaveBeenCalled();
  });

  it("16) nenhum log contém senha / JWT completo / service_role", async () => {
    const logs: unknown[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });
    try {
      // forçar um log (falha de permissions dispara safeLog)
      const deps = baseDeps();
      deps.upsertPermissions = vi.fn().mockResolvedValue({ error: new Error("x") });
      const res = await handleRequest(
        makeRequest({ body: { action: "create", email: "a@b.com", password: "123456", name: "Ana" } }),
        deps,
      );
      expect(res.status).toBe(500);

      const blob = logs.join("\n");
      expect(blob).not.toContain("123456");
      expect(blob).not.toContain("svc-role-key");
      expect(blob).not.toContain("Bearer ");
      expect(blob).not.toContain("eyJ"); // nunca um JWT em logs
    } finally {
      spy.mockRestore();
    }
  });

  it("17) resposta de sucesso contém somente id/name/email/role", async () => {
    const deps = baseDeps();
    const res = await handleRequest(
      makeRequest({ body: { action: "create", email: "a@b.com", password: "123456", name: "Ana" } }),
      deps,
    );
    const body = res.body as { success: boolean; user: Record<string, unknown> };
    expect(Object.keys(body.user).sort()).toEqual(["email", "id", "name", "role"].sort());
    expect(body.user.password).toBeUndefined();
  });

  it("18) senha nunca é retornada (sucesso ou erro)", async () => {
    const depsOk = baseDeps();
    const okRes = await handleRequest(
      makeRequest({ body: { action: "create", email: "a@b.com", password: "123456", name: "Ana" } }),
      depsOk,
    );
    expect(JSON.stringify(okRes.body)).not.toContain("123456");

    const depsErr = baseDeps();
    depsErr.createUser = vi.fn().mockResolvedValue({ data: null, error: new Error("dup") });
    const errRes = await handleRequest(
      makeRequest({ body: { action: "create", email: "a@b.com", password: "123456", name: "Ana" } }),
      depsErr,
    );
    expect(JSON.stringify(errRes.body)).not.toContain("123456");
  });

  // ── Novas ações: disable / enable / delete / list ──────────────────────────

  it("19) admin desativa assistente -> 200 e active=false", async () => {
    const deps = baseDeps();
    deps.updateUserBan = vi.fn().mockResolvedValue({ error: null });
    const res = await handleRequest(
      makeRequest({ body: { action: "disable", assistant_id: ASSISTANT_ID } }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, active: false });
    expect(deps.updateUserBan).toHaveBeenCalledWith(ASSISTANT_ID, "8760h");
  });

  it("20) admin reativa assistente -> 200 e active=true", async () => {
    const deps = baseDeps();
    deps.updateUserBan = vi.fn().mockResolvedValue({ error: null });
    const res = await handleRequest(
      makeRequest({ body: { action: "enable", assistant_id: ASSISTANT_ID } }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, active: true });
    expect(deps.updateUserBan).toHaveBeenCalledWith(ASSISTANT_ID, "none");
  });

  it("21) admin exclui assistente -> remove perms, profile e auth user", async () => {
    const deps = baseDeps();
    deps.deletePermissions = vi.fn().mockResolvedValue({ error: null });
    deps.deleteProfile = vi.fn().mockResolvedValue({ error: null });
    deps.deleteUser = vi.fn().mockResolvedValue({ error: null });
    const res = await handleRequest(
      makeRequest({ body: { action: "delete", assistant_id: ASSISTANT_ID } }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(deps.deletePermissions).toHaveBeenCalledWith(ASSISTANT_ID);
    expect(deps.deleteProfile).toHaveBeenCalledWith(ASSISTANT_ID);
    expect(deps.deleteUser).toHaveBeenCalledWith(ASSISTANT_ID);
  });

  it("22) admin lista assistentes com status ativo", async () => {
    const deps = baseDeps();
    deps.listAssistantProfiles = vi
      .fn()
      .mockResolvedValue({ data: [{ id: ASSISTANT_ID, name: "Ana" }], error: null });
    deps.listUsersBanned = vi
      .fn()
      .mockResolvedValue({ data: [{ id: ASSISTANT_ID, is_banned: false }], error: null });
    const res = await handleRequest(makeRequest({ body: { action: "list" } }), deps);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, assistants: [{ id: ASSISTANT_ID, name: "Ana", role: "assistant", active: true }] });
  });

  it("23) admin lista e detecta assistente desativado (banned)", async () => {
    const deps = baseDeps();
    deps.listAssistantProfiles = vi
      .fn()
      .mockResolvedValue({ data: [{ id: ASSISTANT_ID, name: "Ana" }], error: null });
    deps.listUsersBanned = vi
      .fn()
      .mockResolvedValue({ data: [{ id: ASSISTANT_ID, is_banned: true }], error: null });
    const res = await handleRequest(makeRequest({ body: { action: "list" } }), deps);
    const body = res.body as { assistants: { active: boolean }[] };
    expect(body.assistants[0].active).toBe(false);
  });

  it("24) não-admin não pode desativar (403)", async () => {
    const deps = baseDeps();
    deps.getUser = vi.fn().mockResolvedValue({ user: { id: VISITOR_ID }, error: null });
    const res = await handleRequest(
      makeRequest({ body: { action: "disable", assistant_id: ASSISTANT_ID } }),
      deps,
    );
    expect(res.status).toBe(403);
    expect(deps.updateUserBan).not.toHaveBeenCalled();
  });

  it("25) excluir admin é proibido (alvo não é assistente)", async () => {
    const deps = baseDeps();
    deps.getProfileRole = vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null });
    const res = await handleRequest(
      makeRequest({ body: { action: "delete", assistant_id: ADMIN_ID } }),
      deps,
    );
    expect(res.status).toBe(400);
    expect(deps.deleteUser).not.toHaveBeenCalled();
    expect(deps.deletePermissions).not.toHaveBeenCalled();
  });

  it("26) excluir outro tipo de usuário (visitor) é proibido", async () => {
    const deps = baseDeps();
    // admin na checagem do chamador; alvo é visitor
    deps.getProfileRole = vi.fn((userId: string) =>
      Promise.resolve(
        userId === ADMIN_ID
          ? { data: { role: "admin" }, error: null }
          : { data: { role: "visitor" }, error: null },
      ),
    );
    const res = await handleRequest(
      makeRequest({ body: { action: "delete", assistant_id: "visitor-999" } }),
      deps,
    );
    expect(res.status).toBe(400);
    expect(deps.deleteUser).not.toHaveBeenCalled();
  });

  it("27) terceiro assistente continua bloqueado (count >= 2)", async () => {
    const deps = baseDeps();
    deps.countUsersByRole = vi.fn().mockResolvedValue({ count: 2, error: null });
    const res = await handleRequest(
      makeRequest({ body: { action: "create", email: "c@b.com", password: "123456", name: "Carlos" } }),
      deps,
    );
    expect(res.status).toBe(400);
    expect(deps.createUser).not.toHaveBeenCalled();
  });

  it("28) falha ao desativar -> erro 500 sem sucesso falso", async () => {
    const deps = baseDeps();
    deps.updateUserBan = vi.fn().mockResolvedValue({ error: new Error("ban fail") });
    const res = await handleRequest(
      makeRequest({ body: { action: "disable", assistant_id: ASSISTANT_ID } }),
      deps,
    );
    expect(res.status).toBe(500);
    expect(res.body).not.toMatchObject({ success: true });
  });

  it("29) delete com falha em permissões -> 500 e não exclui user", async () => {
    const deps = baseDeps();
    deps.deletePermissions = vi.fn().mockResolvedValue({ error: new Error("perm del fail") });
    const res = await handleRequest(
      makeRequest({ body: { action: "delete", assistant_id: ASSISTANT_ID } }),
      deps,
    );
    expect(res.status).toBe(500);
    expect(deps.deleteUser).not.toHaveBeenCalled();
  });

  // ── update_admin_password ────────────────────────────────────────────────

  it("30) update_admin_password sem sessão/admin (visitor) -> 403", async () => {
    const deps = baseDeps();
    deps.getUser = vi.fn().mockResolvedValue({ user: { id: VISITOR_ID }, error: null });
    const res = await handleRequest(
      makeRequest({ body: { action: "update_admin_password", password: "293031" } }),
      deps,
    );
    expect(res.status).toBe(403);
    expect(deps.updateUserPassword).not.toHaveBeenCalled();
  });

  it("31) update_admin_password com assistant -> 403", async () => {
    const deps = baseDeps();
    deps.getUser = vi.fn().mockResolvedValue({ user: { id: ASSISTANT_ID }, error: null });
    const res = await handleRequest(
      makeRequest({ body: { action: "update_admin_password", password: "293031" } }),
      deps,
    );
    expect(res.status).toBe(403);
    expect(deps.updateUserPassword).not.toHaveBeenCalled();
  });

  it("32) update_admin_password com admin -> ok, senha via JWT id", async () => {
    const deps = baseDeps();
    deps.updateUserPassword = vi.fn().mockResolvedValue({ error: null });
    const res = await handleRequest(
      makeRequest({ body: { action: "update_admin_password", password: "293031" } }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(deps.updateUserPassword).toHaveBeenCalledWith(ADMIN_ID, "293031");
  });

  it("33) update_admin_password senha de 5 dígitos -> rejeitada", async () => {
    const deps = baseDeps();
    const res = await handleRequest(
      makeRequest({ body: { action: "update_admin_password", password: "12345" } }),
      deps,
    );
    expect(res.status).toBe(400);
  });

  it("34) update_admin_password senha com letras -> rejeitada", async () => {
    const deps = baseDeps();
    const res = await handleRequest(
      makeRequest({ body: { action: "update_admin_password", password: "abcdef" } }),
      deps,
    );
    expect(res.status).toBe(400);
  });

  it("35) admin não pode alterar senha de outra pessoa (target_user_id ignorado)", async () => {
    const deps = baseDeps();
    deps.updateUserPassword = vi.fn().mockResolvedValue({ error: null });
    // mesmo que envie target_user_id de outro usuário, usa o authenticated id (ADMIN_ID)
    const res = await handleRequest(
      makeRequest({
        body: { action: "update_admin_password", password: "293031", target_user_id: ASSISTANT_ID },
      }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(deps.updateUserPassword).toHaveBeenCalledWith(ADMIN_ID, "293031");
    expect(deps.updateUserPassword).not.toHaveBeenCalledWith(ASSISTANT_ID, "293031");
  });

  it("36) senha nunca aparece nos logs/resposta", async () => {
    const logs: unknown[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });
    try {
      const deps = baseDeps();
      deps.updateUserPassword = vi.fn().mockResolvedValue({ error: new Error("x") });
      const res = await handleRequest(
        makeRequest({ body: { action: "update_admin_password", password: "293031" } }),
        deps,
      );
      expect(res.status).toBe(500);
      const blob = logs.join("\n");
      expect(blob).not.toContain("293031");
      expect(JSON.stringify(res.body)).not.toContain("293031");
    } finally {
      spy.mockRestore();
    }
  });
});