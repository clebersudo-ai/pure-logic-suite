import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";
import { createManagedUser, deleteManagedUser, updateManagedUser } from "@/lib/users.functions";
import {
  PageHeader, DataCard, EmptyState, FormField,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/crud-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/usuarios")({
  component: () => (<RequireAuth><AppLayout><Usuarios /></AppLayout></RequireAuth>),
});

const ROLES: Array<{ value: AppRole; label: string; description: string }> = [
  { value: "administrador", label: "Administrador", description: "Gerencia usuários, permissões e todas as áreas do sistema." },
  { value: "comercial", label: "Comercial", description: "Gerencia produtos e documentos regulatórios." },
  { value: "producao", label: "Produção", description: "Opera formulações, ordens de produção, estoque e qualidade." },
  { value: "estoque", label: "Estoque", description: "Gerencia matérias-primas e movimentações de estoque." },
];

type UserRole = { id: string; role: AppRole };
type UserRow = {
  id: string;
  nome: string | null;
  email: string | null;
  roles: UserRole[];
};

type UserForm = {
  nome: string;
  email: string;
  password: string;
  roles: AppRole[];
};

const emptyForm: UserForm = {
  nome: "",
  email: "",
  password: "",
  roles: ["comercial"],
};

function Usuarios() {
  const { hasRole, session, user } = useAuth();
  const qc = useQueryClient();
  const createUser = useServerFn(createManagedUser);
  const updateUser = useServerFn(updateManagedUser);
  const deleteUser = useServerFn(deleteManagedUser);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] = await Promise.all([
        supabase.from("profiles").select("*").order("nome"),
        supabase.from("user_roles").select("*"),
      ]);
      if (profilesError) throw profilesError;
      if (rolesError) throw rolesError;
      return ((profiles ?? []) as Array<{ id: string; nome: string | null; email: string | null }>).map((profile) => ({
        ...profile,
        roles: ((roles ?? []) as Array<{ id: string; user_id: string; role: AppRole }>)
          .filter((role) => role.user_id === profile.id)
          .map((role) => ({ id: role.id, role: role.role })),
      }));
    },
  });

  if (!hasRole("administrador")) {
    return <DataCard><EmptyState label="Apenas administradores podem gerenciar usuários" /></DataCard>;
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(row: UserRow) {
    setEditing(row);
    setForm({
      nome: row.nome ?? "",
      email: row.email ?? "",
      password: "",
      roles: row.roles.map(role => role.role),
    });
    setDialogOpen(true);
  }

  function toggleRole(role: AppRole) {
    setForm(current => {
      const roles = current.roles.includes(role)
        ? current.roles.filter(item => item !== role)
        : [...current.roles, role];
      return { ...current, roles };
    });
  }

  async function saveUser() {
    if (!session?.access_token) {
      toast.error("Sessão inválida");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        accessToken: session.access_token,
        id: editing?.id,
        nome: form.nome,
        email: form.email,
        password: form.password || undefined,
        roles: form.roles,
      };
      if (editing) await updateUser({ data: payload });
      else await createUser({ data: payload });
      toast.success(editing ? "Usuário atualizado" : "Usuário criado");
      setDialogOpen(false);
      await qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(row: UserRow) {
    if (!session?.access_token) {
      toast.error("Sessão inválida");
      return;
    }
    if (!confirm(`Excluir o usuário "${row.nome || row.email}"? O login será removido do sistema.`)) return;
    setSaving(true);
    try {
      await deleteUser({ data: { accessToken: session.access_token, id: row.id } });
      toast.success("Usuário excluído");
      await qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Usuários e Acessos"
        subtitle="Cadastre usuários, altere login e defina níveis de acesso"
        action={(
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4" /> Novo usuário
          </Button>
        )}
      />

      <DataCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail / login</TableHead>
              <TableHead>Níveis de acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4}><EmptyState label="Carregando usuários..." /></TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={4}><EmptyState label="Nenhum usuário cadastrado" /></TableCell></TableRow>
            ) : users.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.nome || "Sem nome"}</TableCell>
                <TableCell className="text-muted-foreground">{row.email || "Sem e-mail"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {row.roles.length === 0 && <span className="text-xs text-muted-foreground">sem acesso</span>}
                    {row.roles.map(role => (
                      <Badge key={role.id} variant={role.role === "administrador" ? "default" : "secondary"}>
                        {ROLES.find(item => item.value === role.role)?.label ?? role.role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(row)} title="Editar usuário">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" disabled={row.id === user?.id || saving} onClick={() => removeUser(row)} title="Excluir usuário">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataCard>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {ROLES.map(role => (
          <DataCard key={role.value}>
            <div className="p-4">
              <div className="text-sm font-semibold">{role.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{role.description}</div>
            </div>
          </DataCard>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Nome">
              <Input value={form.nome} onChange={(event) => setForm(current => ({ ...current, nome: event.target.value }))} placeholder="Nome completo" />
            </FormField>
            <FormField label="E-mail / login">
              <Input type="email" value={form.email} onChange={(event) => setForm(current => ({ ...current, email: event.target.value }))} placeholder="usuario@empresa.com" />
            </FormField>
            <FormField label={editing ? "Nova senha (opcional)" : "Senha inicial"}>
              <Input type="password" value={form.password} onChange={(event) => setForm(current => ({ ...current, password: event.target.value }))} placeholder={editing ? "Deixe em branco para manter" : "Mínimo 6 caracteres"} />
            </FormField>
            <div className="space-y-1.5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Níveis de acesso</div>
              <div className="grid gap-2 rounded-md border p-3">
                {ROLES.map(role => (
                  <label key={role.value} className="flex items-start gap-2 text-sm">
                    <Checkbox checked={form.roles.includes(role.value)} onCheckedChange={() => toggleRole(role.value)} />
                    <span>
                      <span className="block font-medium leading-none">{role.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{role.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveUser} disabled={saving}>
              {editing ? "Salvar alterações" : "Cadastrar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
