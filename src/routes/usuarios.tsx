import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/lib/auth";
import { PageHeader, DataCard, EmptyState,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/crud-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export const Route = createFileRoute("/usuarios")({
  component: () => (<RequireAuth><AppLayout><Usuarios /></AppLayout></RequireAuth>),
});

const ROLES: AppRole[] = ["administrador", "producao", "estoque", "comercial"];

function Usuarios() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const [adding, setAdding] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<AppRole>("producao");

  const { data: users = [] } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("nome"),
        supabase.from("user_roles").select("*"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => ({ id: r.id, role: r.role as AppRole })),
      }));
    },
  });

  async function addRole(userId: string) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) return toast.error(error.message);
    setAdding(null);
    qc.invalidateQueries({ queryKey: ["users-with-roles"] });
  }
  async function removeRole(id: string) {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["users-with-roles"] });
  }

  if (!hasRole("administrador")) {
    return <DataCard><EmptyState label="Apenas administradores podem gerenciar usuários" /></DataCard>;
  }

  return (
    <>
      <PageHeader title="Usuários e Papéis" subtitle="Gerencie permissões da equipe" />
      <DataCard>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Papéis</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length === 0 && <span className="text-xs text-muted-foreground">sem papéis</span>}
                    {u.roles.map((r) => (
                      <Badge key={r.id} variant="secondary" className="gap-1">
                        {r.role}
                        <button onClick={() => removeRole(r.id)}><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {adding === u.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => addRole(u.id)}>OK</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAdding(null)}>X</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setAdding(u.id)}><Plus className="h-3.5 w-3.5" /></Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataCard>
    </>
  );
}
