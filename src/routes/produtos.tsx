import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, DataCard, FormField, EmptyState, useDialog,
  Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Plus, Pencil, Trash2 } from "@/components/crud-ui";
import { Beaker } from "lucide-react";

export const Route = createFileRoute("/produtos")({
  component: () => (<RequireAuth><AppLayout><Produtos /></AppLayout></RequireAuth>),
});

type Prod = {
  id: string; nome: string; categoria: string | null; embalagem: string | null;
  validade_meses: number | null; custo_calculado: number | null; preco_sugerido: number | null;
  margem_percentual: number | null;
};

function Produtos() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("*").order("nome");
      if (error) throw error;
      return data as Prod[];
    },
  });
  const dlg = useDialog();
  const [edit, setEdit] = useState<Partial<Prod> | null>(null);

  function openNew() { setEdit({ validade_meses: 12, margem_percentual: 50 }); dlg.openNew(); }
  function openEdit(p: Prod) { setEdit(p); dlg.openNew(); }

  async function save() {
    if (!edit?.nome) { toast.error("Nome obrigatório"); return; }
    const { error } = edit.id
      ? await supabase.from("produtos").update(edit).eq("id", edit.id)
      : await supabase.from("produtos").insert(edit as never);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); dlg.close(); qc.invalidateQueries({ queryKey: ["produtos"] });
  }
  async function remove(id: string) {
    if (!confirm("Excluir produto?")) return;
    const { error } = await supabase.from("produtos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido"); qc.invalidateQueries({ queryKey: ["produtos"] });
  }

  return (
    <>
      <PageHeader title="Produtos" subtitle="Produtos finais"
        action={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Novo</Button>} />
      <DataCard>
        {data.length === 0 ? <EmptyState label="Nenhum produto cadastrado" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Embalagem</TableHead>
                <TableHead className="text-right">Custo/L</TableHead><TableHead className="text-right">Preço</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>{p.categoria}</TableCell>
                  <TableCell>{p.embalagem}</TableCell>
                  <TableCell className="text-right">R$ {Number(p.custo_calculado ?? 0).toFixed(4)}</TableCell>
                  <TableCell className="text-right">R$ {Number(p.preco_sugerido ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" asChild><Link to="/formulacoes" search={{ produto: p.id } as never}><Beaker className="h-3.5 w-3.5" /></Link></Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataCard>

      <Dialog open={dlg.open} onOpenChange={dlg.setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar" : "Novo"} produto</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nome"><Input value={edit?.nome ?? ""} onChange={(e) => setEdit({ ...edit!, nome: e.target.value })} /></FormField>
            <FormField label="Categoria"><Input value={edit?.categoria ?? ""} onChange={(e) => setEdit({ ...edit!, categoria: e.target.value })} placeholder="Detergente, Desinfetante..." /></FormField>
            <FormField label="Embalagem"><Input value={edit?.embalagem ?? ""} onChange={(e) => setEdit({ ...edit!, embalagem: e.target.value })} placeholder="Bombona 5L..." /></FormField>
            <FormField label="Validade (meses)"><Input type="number" value={edit?.validade_meses ?? 12} onChange={(e) => setEdit({ ...edit!, validade_meses: Number(e.target.value) })} /></FormField>
            <FormField label="Margem (%)"><Input type="number" value={edit?.margem_percentual ?? 50} onChange={(e) => setEdit({ ...edit!, margem_percentual: Number(e.target.value) })} /></FormField>
            <FormField label="Preço sugerido (R$)"><Input type="number" step="0.01" value={edit?.preco_sugerido ?? 0} onChange={(e) => setEdit({ ...edit!, preco_sugerido: Number(e.target.value) })} /></FormField>
          </div>
          <p className="text-xs text-muted-foreground">O custo é calculado automaticamente a partir da formulação.</p>
          <DialogFooter>
            <Button variant="outline" onClick={dlg.close}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
