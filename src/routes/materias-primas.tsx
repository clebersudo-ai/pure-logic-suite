import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, DataCard, FormField, EmptyState, useDialog,
  Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Plus, Pencil, Trash2 } from "@/components/crud-ui";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X } from "lucide-react";

export const Route = createFileRoute("/materias-primas")({
  component: () => (<RequireAuth><AppLayout><MateriasPrimas /></AppLayout></RequireAuth>),
});

type MP = {
  id: string; nome: string; fornecedor: string | null; codigo_interno: string;
  custo_unitario: number; unidade: string; estoque_atual: number; estoque_minimo: number;
  lote_fornecedor: string | null; validade: string | null;
};

function MateriasPrimas() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["materias_primas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("materias_primas").select("*").order("nome");
      if (error) throw error;
      return data as MP[];
    },
  });
  const dlg = useDialog();
  const [edit, setEdit] = useState<Partial<MP> | null>(null);
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.filter((m) => {
      if (onlyLow && !(Number(m.estoque_atual) <= Number(m.estoque_minimo))) return false;
      if (!term) return true;
      return (
        m.nome.toLowerCase().includes(term) ||
        m.codigo_interno.toLowerCase().includes(term) ||
        (m.fornecedor ?? "").toLowerCase().includes(term) ||
        (m.lote_fornecedor ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, q, onlyLow]);

  function openNew() { setEdit({ unidade: "kg", estoque_atual: 0, estoque_minimo: 0, custo_unitario: 0 }); dlg.openNew(); }
  function openEdit(m: MP) { setEdit(m); dlg.openNew(); }

  async function save() {
    if (!edit?.nome || !edit?.codigo_interno) { toast.error("Preencha nome e código"); return; }
    const payload = { ...edit };
    const { error } = edit.id
      ? await supabase.from("materias_primas").update(payload).eq("id", edit.id)
      : await supabase.from("materias_primas").insert(payload as never);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); dlg.close(); qc.invalidateQueries({ queryKey: ["materias_primas"] });
  }
  async function remove(id: string) {
    if (!confirm("Excluir esta matéria-prima?")) return;
    const { error } = await supabase.from("materias_primas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido"); qc.invalidateQueries({ queryKey: ["materias_primas"] });
  }

  return (
    <>
      <PageHeader title="Matérias-Primas" subtitle="Insumos para formulação"
        action={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nova</Button>} />

      <DataCard>
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, código, fornecedor, lote…"
              className="h-9 pl-9 pr-9"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant={onlyLow ? "default" : "outline"}
            size="sm"
            onClick={() => setOnlyLow((v) => !v)}
            className="h-9"
          >
            <Filter className="mr-2 h-3.5 w-3.5" />
            Estoque baixo
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            {filtered.length} de {data.length} {data.length === 1 ? "item" : "itens"}
          </div>
        </div>

        {filtered.length === 0 ? <EmptyState label={data.length === 0 ? "Nenhuma matéria-prima cadastrada" : "Nenhum resultado para os filtros"} /> : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Custo</TableHead><TableHead className="text-right">Estoque</TableHead>
                <TableHead>Validade</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => {
                const baixo = Number(m.estoque_atual) <= Number(m.estoque_minimo);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.codigo_interno}</TableCell>
                    <TableCell className="font-medium">{m.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{m.fornecedor}</TableCell>
                    <TableCell className="text-right">R$ {Number(m.custo_unitario).toFixed(4)}/{m.unidade}</TableCell>
                    <TableCell className="text-right">
                      {baixo
                        ? <Badge variant="destructive">{Number(m.estoque_atual).toFixed(2)} {m.unidade}</Badge>
                        : <span>{Number(m.estoque_atual).toFixed(2)} {m.unidade}</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.validade ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DataCard>

      <Dialog open={dlg.open} onOpenChange={dlg.setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar" : "Nova"} matéria-prima</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nome"><Input value={edit?.nome ?? ""} onChange={(e) => setEdit({ ...edit!, nome: e.target.value })} /></FormField>
            <FormField label="Código interno"><Input value={edit?.codigo_interno ?? ""} onChange={(e) => setEdit({ ...edit!, codigo_interno: e.target.value })} /></FormField>
            <FormField label="Fornecedor"><Input value={edit?.fornecedor ?? ""} onChange={(e) => setEdit({ ...edit!, fornecedor: e.target.value })} /></FormField>
            <FormField label="Lote fornecedor"><Input value={edit?.lote_fornecedor ?? ""} onChange={(e) => setEdit({ ...edit!, lote_fornecedor: e.target.value })} /></FormField>
            <FormField label="Unidade"><Input value={edit?.unidade ?? "kg"} onChange={(e) => setEdit({ ...edit!, unidade: e.target.value })} placeholder="kg, L..." /></FormField>
            <FormField label="Custo por unidade (R$)"><Input type="number" step="0.0001" value={edit?.custo_unitario ?? 0} onChange={(e) => setEdit({ ...edit!, custo_unitario: Number(e.target.value) })} /></FormField>
            <FormField label="Estoque atual"><Input type="number" step="0.001" value={edit?.estoque_atual ?? 0} onChange={(e) => setEdit({ ...edit!, estoque_atual: Number(e.target.value) })} /></FormField>
            <FormField label="Estoque mínimo"><Input type="number" step="0.001" value={edit?.estoque_minimo ?? 0} onChange={(e) => setEdit({ ...edit!, estoque_minimo: Number(e.target.value) })} /></FormField>
            <FormField label="Validade"><Input type="date" value={edit?.validade ?? ""} onChange={(e) => setEdit({ ...edit!, validade: e.target.value || null })} /></FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={dlg.close}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
