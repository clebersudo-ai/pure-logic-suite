import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AppRole = "administrador" | "producao" | "estoque" | "comercial";

const ROLES: AppRole[] = ["administrador", "producao", "estoque", "comercial"];

type AdminPayload = {
  accessToken: string;
};

type UpsertUserPayload = AdminPayload & {
  id?: string;
  nome: string;
  email: string;
  password?: string;
  roles: AppRole[];
};

type DeleteUserPayload = AdminPayload & {
  id: string;
};

function cleanRoles(roles: AppRole[]) {
  return Array.from(new Set(roles)).filter((role): role is AppRole => ROLES.includes(role));
}

async function requireAdmin(accessToken: string) {
  if (!accessToken) throw new Error("Sessão inválida");

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  if (authError || !authData.user) throw new Error("Sessão inválida");

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id)
    .eq("role", "administrador")
    .maybeSingle();
  if (roleError) throw roleError;
  if (!roleData) throw new Error("Apenas administradores podem gerenciar usuários");

  return authData.user;
}

async function ensureAnotherAdmin(targetUserId: string, nextRoles?: AppRole[]) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "administrador");
  if (error) throw error;

  const adminIds = Array.from(new Set((data ?? []).map(item => item.user_id)));
  const targetIsOnlyAdmin = adminIds.length === 1 && adminIds[0] === targetUserId;
  const targetKeepsAdmin = nextRoles?.includes("administrador") ?? false;
  if (targetIsOnlyAdmin && !targetKeepsAdmin) {
    throw new Error("Não é possível remover o último administrador do sistema");
  }
}

async function replaceRoles(userId: string, roles: AppRole[]) {
  const nextRoles = cleanRoles(roles);
  if (nextRoles.length === 0) throw new Error("Selecione pelo menos um nível de acesso");

  await ensureAnotherAdmin(userId, nextRoles);

  const { error: deleteError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabaseAdmin
    .from("user_roles")
    .insert(nextRoles.map(role => ({ user_id: userId, role })));
  if (insertError) throw insertError;
}

export const createManagedUser = createServerFn({ method: "POST" })
  .inputValidator((data: UpsertUserPayload) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.accessToken);

    const nome = data.nome.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password?.trim() ?? "";
    const roles = cleanRoles(data.roles);

    if (!nome) throw new Error("Informe o nome");
    if (!email) throw new Error("Informe o e-mail");
    if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres");
    if (roles.length === 0) throw new Error("Selecione pelo menos um nível de acesso");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (error || !created.user) throw error ?? new Error("Não foi possível criar o usuário");

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: created.user.id, nome, email });
    if (profileError) throw profileError;

    await replaceRoles(created.user.id, roles);
    return { id: created.user.id };
  });

export const updateManagedUser = createServerFn({ method: "POST" })
  .inputValidator((data: UpsertUserPayload) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.accessToken);
    if (!data.id) throw new Error("Usuário inválido");

    const nome = data.nome.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password?.trim();
    const roles = cleanRoles(data.roles);

    if (!nome) throw new Error("Informe o nome");
    if (!email) throw new Error("Informe o e-mail");
    if (password && password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres");
    if (roles.length === 0) throw new Error("Selecione pelo menos um nível de acesso");

    const attributes: { email: string; password?: string; user_metadata: { nome: string } } = {
      email,
      user_metadata: { nome },
    };
    if (password) attributes.password = password;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, attributes);
    if (error) throw error;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: data.id, nome, email });
    if (profileError) throw profileError;

    await replaceRoles(data.id, roles);
    return { id: data.id };
  });

export const deleteManagedUser = createServerFn({ method: "POST" })
  .inputValidator((data: DeleteUserPayload) => data)
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.accessToken);
    if (!data.id) throw new Error("Usuário inválido");
    if (data.id === admin.id) throw new Error("Você não pode excluir o próprio usuário logado");

    await ensureAnotherAdmin(data.id, []);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw error;
    return { id: data.id };
  });
