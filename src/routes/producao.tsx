import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { PageHeader, DataCard, FormField, EmptyState, useDialog,
  Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Plus } from "@/components/crud-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, PlayCircle, XCircle } from "lucide-react";

export const Route = createFileRoute("/producao")({
  component: () => (<RequireAuth><AppLayout><Producao /></AppLayout></RequireAuth>),
});

const STATUS_VARIANT: Record<string, { label: string; cls: string }> = {
  aberta: { label: "Aberta", cls: "bg-muted text-muted-foreground" },
  em_producao: { label: "Em produção", cls: "bg-primary text-primary-foreground" },
  finalizada: { label: "Finalizada", cls: "bg-success text-success-foreground" },
  cancelada: { label: "Cancelada", cls: "bg-destructive text-destructive-foreground" },
};

function Producao() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const dlg = useDialog();
  type Ordem = { id?: string; numero_lote?: string; produto_id?: string; quantidade_litros?: number; tanque?: string; sequencia_fabricacao?: string; observacoes?: string; data_producao?: string };
  const [edit, setEdit] = useState<Ordem | null>(null);

  const { data: ordens = [] } = useQuery({
    queryKey: ["ordens"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ordens_producao")
        .select("*, produtos(nome)")
        .order("data_producao", { ascending: false })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-select"],
    queryFn: async () => (await supabase.from("produtos").select("id,nome,custo_calculado")).data ?? [],
  });

  function openNew() {
    setEdit({ numero_lote: `L${Date.now().toString().slice(-6)}`, quantidade_litros: 100, data_producao: new Date().toISOString().slice(0, 10) });
    dlg.openNew();
  }

  async function save() {
    if (!edit?.numero_lote || !edit?.produto_id || !edit?.quantidade_litros) return toast.error("Preencha lote, produto e quantidade");
    const prod = produtos.find((p) => p.id === edit.produto_id);
    const custoTotal = Number(prod?.custo_calculado ?? 0) * Number(edit.quantidade_litros);
    const { error } = await supabase.from("ordens_producao").insert({
      ...edit,
      operador_id: user?.id,
      operador_nome: user?.email,
      custo_total: custoTotal,
      status: "aberta",
    } as never);
    if (error) return toast.error(error.message);
    toast.success("Ordem criada"); dlg.close(); qc.invalidateQueries({ queryKey: ["ordens"] });
  }

  async function iniciar(id: string) {
    const { error } = await supabase.from("ordens_producao").update({ status: "em_producao" }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["ordens"] });
  }

  async function finalizar(o: { id: string; produto_id: string; quantidade_litros: number }) {
    // Baixa automática de estoque
    const { data: formula } = await supabase.from("formulacoes").select("materia_prima_id,percentual").eq("produto_id", o.produto_id);
    for (const f of formula ?? []) {
      const consumo = (Number(f.percentual) / 100) * Number(o.quantidade_litros);
      const { data: mp } = await supabase.from("materias_primas").select("estoque_atual").eq("id", f.materia_prima_id).single();
      if (mp) {
        await supabase.from("materias_primas").update({ estoque_atual: Number(mp.estoque_atual) - consumo }).eq("id", f.materia_prima_id);
        await supabase.from("movimentacoes_estoque").insert({
          materia_prima_id: f.materia_prima_id, tipo: "saida", quantidade: consumo,
          motivo: `Produção lote`, ordem_producao_id: o.id, usuario_id: user?.id,
        });
      }
    }
    await supabase.from("ordens_producao").update({ status: "finalizada" }).eq("id", o.id);
    toast.success("Ordem finalizada, estoque baixado");
    qc.invalidateQueries({ queryKey: ["ordens"] });
    qc.invalidateQueries({ queryKey: ["materias_primas"] });
  }

  async function cancelar(id: string) {
    if (!confirm("Cancelar ordem?")) return;
    await supabase.from("ordens_producao").update({ status: "cancelada" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["ordens"] });
  }

  return (
    <>
      <PageHeader title="Produção" subtitle="Ordens de produção e fabricação"
        action={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nova ordem</Button>} />
      <DataCard>
        {ordens.length === 0 ? <EmptyState label="Nenhuma ordem de produção" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead><TableHead>Produto</TableHead><TableHead>Qtd</TableHead>
                <TableHead>Tanque</TableHead><TableHead>Operador</TableHead><TableHead>Data</TableHead>
                <TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordens.map((o) => {
                const s = STATUS_VARIANT[o.status as keyof typeof STATUS_VARIANT];
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.numero_lote}</TableCell>
                    <TableCell className="font-medium">{(o as { produtos?: { nome?: string } }).produtos?.nome}</TableCell>
                    <TableCell>{Number(o.quantidade_litros).toFixed(0)} L</TableCell>
                    <TableCell>{o.tanque}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{o.operador_nome}</TableCell>
                    <TableCell>{o.data_producao}</TableCell>
                    <TableCell><Badge className={s.cls}>{s.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      {o.status === "aberta" && <Button size="sm" variant="ghost" onClick={() => iniciar(o.id)}><PlayCircle className="h-4 w-4" /></Button>}
                      {o.status === "em_producao" && <Button size="sm" variant="ghost" onClick={() => finalizar(o)}><CheckCircle2 className="h-4 w-4 text-success" /></Button>}
                      {o.status !== "finalizada" && o.status !== "cancelada" && <Button size="sm" variant="ghost" onClick={() => cancelar(o.id)}><XCircle className="h-4 w-4 text-destructive" /></Button>}
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
          <DialogHeader><DialogTitle>Nova ordem de produção</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Número do lote"><Input value={edit?.numero_lote ?? ""} onChange={(e) => setEdit({ ...edit!, numero_lote: e.target.value })} /></FormField>
            <FormField label="Produto">
              <Select value={edit?.produto_id ?? ""} onValueChange={(v) => setEdit({ ...edit!, produto_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{produtos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Quantidade (L)"><Input type="number" value={edit?.quantidade_litros ?? 0} onChange={(e) => setEdit({ ...edit!, quantidade_litros: Number(e.target.value) })} /></FormField>
            <FormField label="Tanque"><Input value={edit?.tanque ?? ""} onChange={(e) => setEdit({ ...edit!, tanque: e.target.value })} placeholder="T-01" /></FormField>
            <FormField label="Data de produção"><Input type="date" value={edit?.data_producao ?? ""} onChange={(e) => setEdit({ ...edit!, data_producao: e.target.value })} /></FormField>
            <FormField label="Sequência de fabricação"><Input value={edit?.sequencia_fabricacao ?? ""} onChange={(e) => setEdit({ ...edit!, sequencia_fabricacao: e.target.value })} placeholder="01" /></FormField>
            <div className="md:col-span-2"><FormField label="Observações"><Textarea value={edit?.observacoes ?? ""} onChange={(e) => setEdit({ ...edit!, observacoes: e.target.value })} /></FormField></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={dlg.close}>Cancelar</Button>
            <Button onClick={save}>Criar ordem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
