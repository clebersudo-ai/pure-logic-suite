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
import { Card } from "@/components/ui/card";
import { AlertTriangle, ArrowDown, ArrowUp, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/estoque")({
  component: () => (<RequireAuth><AppLayout><Estoque /></AppLayout></RequireAuth>),
});

function Estoque() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const dlg = useDialog();
  const [tipo, setTipo] = useState<"entrada" | "saida" | "ajuste">("entrada");
  const [mpId, setMpId] = useState("");
  const [qtd, setQtd] = useState(0);
  const [motivo, setMotivo] = useState("");

  const { data: mps = [] } = useQuery({
    queryKey: ["materias_primas"],
    queryFn: async () => (await supabase.from("materias_primas").select("*").order("nome")).data ?? [],
  });
  const { data: movs = [] } = useQuery({
    queryKey: ["movimentacoes"],
    queryFn: async () => (await supabase.from("movimentacoes_estoque").select("*, materias_primas(nome,unidade)").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  const baixos = mps.filter((m) => Number(m.estoque_atual) <= Number(m.estoque_minimo));

  async function salvar() {
    if (!mpId || !qtd) return toast.error("Selecione matéria-prima e quantidade");
    const mp = mps.find((m) => m.id === mpId);
    if (!mp) return;
    const novoEstoque = tipo === "entrada"
      ? Number(mp.estoque_atual) + qtd
      : tipo === "saida" ? Number(mp.estoque_atual) - qtd
      : qtd;
    await supabase.from("materias_primas").update({ estoque_atual: novoEstoque }).eq("id", mpId);
    await supabase.from("movimentacoes_estoque").insert({
      materia_prima_id: mpId, tipo, quantidade: qtd, motivo, usuario_id: user?.id,
    });
    toast.success("Movimentação registrada");
    setMpId(""); setQtd(0); setMotivo(""); dlg.close();
    qc.invalidateQueries({ queryKey: ["materias_primas"] });
    qc.invalidateQueries({ queryKey: ["movimentacoes"] });
  }

  return (
    <>
      <PageHeader title="Estoque" subtitle="Entradas, saídas e movimentações"
        action={<Button onClick={() => dlg.openNew()}><Plus className="mr-2 h-4 w-4" />Movimentação</Button>} />

      {baixos.length > 0 && (
        <Card className="mb-4 border-warning bg-warning/10 p-4">
          <div className="flex items-center gap-2 text-warning-foreground">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <strong>{baixos.length} item(ns) abaixo do estoque mínimo</strong>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <DataCard><div className="lg:col-span-3">
          <div className="border-b px-4 py-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Histórico recente</div>
          {movs.length === 0 ? <EmptyState label="Sem movimentações" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Matéria-prima</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead>Motivo</TableHead></TableRow></TableHeader>
              <TableBody>
                {movs.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>
                      {m.tipo === "entrada" && <Badge className="bg-success text-success-foreground"><ArrowUp className="mr-1 h-3 w-3" />Entrada</Badge>}
                      {m.tipo === "saida" && <Badge className="bg-destructive text-destructive-foreground"><ArrowDown className="mr-1 h-3 w-3" />Saída</Badge>}
                      {m.tipo === "ajuste" && <Badge variant="outline"><RefreshCw className="mr-1 h-3 w-3" />Ajuste</Badge>}
                    </TableCell>
                    <TableCell>{(m as { materias_primas?: { nome?: string } }).materias_primas?.nome}</TableCell>
                    <TableCell className="text-right">{Number(m.quantidade).toFixed(2)} {(m as { materias_primas?: { unidade?: string } }).materias_primas?.unidade}</TableCell>
                    <TableCell className="text-xs">{m.motivo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div></DataCard>

        <Card className="lg:col-span-2">
          <div className="border-b px-4 py-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Posição atual</div>
          <Table>
            <TableHeader><TableRow><TableHead>MP</TableHead><TableHead className="text-right">Estoque</TableHead></TableRow></TableHeader>
            <TableBody>
              {mps.map((m) => {
                const baixo = Number(m.estoque_atual) <= Number(m.estoque_minimo);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">{m.nome}</TableCell>
                    <TableCell className="text-right text-xs">
                      {baixo
                        ? <Badge variant="destructive">{Number(m.estoque_atual).toFixed(1)} {m.unidade}</Badge>
                        : <span>{Number(m.estoque_atual).toFixed(1)} {m.unidade}</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={dlg.open} onOpenChange={dlg.setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova movimentação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <FormField label="Tipo">
              <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="ajuste">Ajuste (define valor absoluto)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Matéria-prima">
              <Select value={mpId} onValueChange={setMpId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{mps.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Quantidade"><Input type="number" step="0.001" value={qtd} onChange={(e) => setQtd(Number(e.target.value))} /></FormField>
            <FormField label="Motivo"><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Nota fiscal, ajuste de inventário..." /></FormField>
          </div>
          <DialogFooter><Button variant="outline" onClick={dlg.close}>Cancelar</Button><Button onClick={salvar}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
