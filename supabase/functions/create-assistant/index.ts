// ============================================================================
// create-assistant — Supabase Edge Function  (revisão v2, aguarda deploy)
//
// Wrapper de integração: injeta os clients Supabase reais na lógica pura
// de supabase/functions/create-assistant/core.ts.
//
// SEGURANÇA:
//   - service_role key NUNCA no frontend; lida só via Deno.env.get()
//   - JWT do admin é validado server-side com auth.getUser()
//   - identidade vem do token, NUNCA de user_id enviado pelo frontend
//   - profiles.role é consultada para confirmar admin
//   - senha validada no servidor: exatamente 6 números
//
// USO:
//   POST /functions/v1/create-assistant
//   Headers: Authorization: Bearer <admin_jwt>
//   Body:
//     create:              { action:"create", email, password(6 digitos), name }
//     update_password:    { action:"update_password", assistant_id, password(6 digitos) }
//     update_admin_password:{ action:"update_admin_password", password(6 digitos) }
//                         (admin altera SUA própria senha; userId vem do JWT,
//                          target_user_id do frontend é ignorado)
//
// NÃO DEPLOYAR SEM AUTORIZAÇÃO.
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleRequest } from "./core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function toResponse(result: { status: number; body: unknown }) {
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";

  // Cliente Supabase com o JWT do chamador (identidade confiável)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  // Cliente administrativo (somente server-side)
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const deps = {
    env: (key: string) => Deno.env.get(key),
    getUser: async () => {
      const r = await supabase.auth.getUser();
      return { user: r.data.user ? { id: r.data.user.id } : null, error: r.error };
    },
    getProfileRole: async (userId: string) => {
      const r = await adminClient.from("profiles").select("role").eq("id", userId).single();
      return { data: r.data as { role?: string } | null, error: r.error };
    },
    countUsersByRole: async (role: string) => {
      const r = await adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", role);
      return { count: r.count, error: r.error };
    },
    createUser: async (params: {
      email: string;
      password: string;
      email_confirm: boolean;
      user_metadata: { name: string };
    }) => {
      const r = await adminClient.auth.admin.createUser(params);
      return { data: { user: r.data?.user ? { id: r.data.user.id } : null }, error: r.error };
    },
    deleteUser: async (userId: string) => {
      const r = await adminClient.auth.admin.deleteUser(userId, true);
      return { error: r.error };
    },
    getProfile: async (userId: string) => {
      const r = await adminClient.from("profiles").select("id, role").eq("id", userId);
      return { data: r.data as { id: string; role?: string }[] | null, error: r.error };
    },
    updateProfile: async (userId: string, patch: { role: string; name: string }) => {
      const r = await adminClient.from("profiles").update(patch).eq("id", userId);
      return { error: r.error };
    },
    upsertPermissions: async (row: Record<string, unknown>) => {
      const r = await adminClient.from("assistant_permissions").upsert(row, {
        onConflict: "profile_id",
      });
      return { error: r.error };
    },
    getUserById: async (userId: string) => {
      const r = await adminClient.auth.admin.getUserById(userId);
      return { data: r.data ? { user: r.data.user ? { id: r.data.user.id } : null } : null, error: r.error };
    },
    updateUserPassword: async (userId: string, password: string) => {
      const r = await adminClient.auth.admin.updateUserById(userId, { password });
      return { error: r.error };
    },
    updateUserBan: async (userId: string, banDuration: string) => {
      const r = await adminClient.auth.admin.updateUserById(userId, { ban_duration: banDuration });
      return { error: r.error };
    },
    deletePermissions: async (profileId: string) => {
      const r = await adminClient.from("assistant_permissions").delete().eq("profile_id", profileId);
      return { error: r.error };
    },
    deleteProfile: async (profileId: string) => {
      const r = await adminClient.from("profiles").delete().eq("id", profileId);
      return { error: r.error };
    },
    listAssistantProfiles: async () => {
      const r = await adminClient
        .from("profiles")
        .select("id, name")
        .eq("role", "assistant")
        .order("created_at", { ascending: true });
      return { data: r.data as { id: string; name: string }[] | null, error: r.error };
    },
    listUsersBanned: async () => {
      const r = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const data = (r.data?.users ?? []).map((u) => ({ id: u.id, is_banned: !!u.banned_until }));
      return { data, error: r.error };
    },
  };

  return toResponse(await handleRequest(req as unknown as RequestInit, deps as never));
});