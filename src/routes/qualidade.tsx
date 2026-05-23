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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/qualidade")({
  component: () => (<RequireAuth><AppLayout><Qualidade /></AppLayout></RequireAuth>),
});

function Qualidade() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const dlg = useDialog();
  type Analise = { ordem_producao_id?: string; ph?: number; aparencia?: string; viscosidade?: number; observacoes?: string; status?: "pendente" | "aprovado" | "reprovado" };
  const [edit, setEdit] = useState<Analise>({ status: "aprovado" });

  const { data: analises = [] } = useQuery({
    queryKey: ["qualidade"],
    queryFn: async () => (await supabase.from("controle_qualidade").select("*, ordens_producao(numero_lote, produtos(nome))").order("data_analise", { ascending: false })).data ?? [],
  });
  const { data: ordens = [] } = useQuery({
    queryKey: ["ordens-select"],
    queryFn: async () => (await supabase.from("ordens_producao").select("id, numero_lote").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  async function salvar() {
    if (!edit.ordem_producao_id) return toast.error("Selecione uma ordem");
    const { error } = await supabase.from("controle_qualidade").insert({
      ...edit, analista_id: user?.id, data_analise: new Date().toISOString(),
    } as never);
    if (error) return toast.error(error.message);
    toast.success("Análise registrada");
    setEdit({ status: "aprovado" }); dlg.close();
    qc.invalidateQueries({ queryKey: ["qualidade"] });
  }

  return (
    <>
      <PageHeader title="Controle de Qualidade" subtitle="Análises físico-químicas por lote"
        action={<Button onClick={() => dlg.openNew()}><Plus className="mr-2 h-4 w-4" />Nova análise</Button>} />
      <DataCard>
        {analises.length === 0 ? <EmptyState label="Nenhuma análise registrada" /> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Lote</TableHead><TableHead>Produto</TableHead><TableHead>pH</TableHead>
              <TableHead>Viscosidade</TableHead><TableHead>Aparência</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {analises.map((a) => {
                const op = (a as { ordens_producao?: { numero_lote?: string; produtos?: { nome?: string } } }).ordens_producao;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{op?.numero_lote}</TableCell>
                    <TableCell>{op?.produtos?.nome}</TableCell>
                    <TableCell>{a.ph ?? "—"}</TableCell>
                    <TableCell>{a.viscosidade ? `${a.viscosidade} cP` : "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">{a.aparencia}</TableCell>
                    <TableCell>
                      {a.status === "aprovado" && <Badge className="bg-success text-success-foreground"><CheckCircle2 className="mr-1 h-3 w-3" />Aprovado</Badge>}
                      {a.status === "reprovado" && <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Reprovado</Badge>}
                      {a.status === "pendente" && <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />Pendente</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.data_analise ? new Date(a.data_analise).toLocaleString("pt-BR") : ""}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DataCard>

      <Dialog open={dlg.open} onOpenChange={dlg.setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Nova análise</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FormField label="Ordem de produção">
                <Select value={edit.ordem_producao_id ?? ""} onValueChange={(v) => setEdit({ ...edit, ordem_producao_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{ordens.map((o) => <SelectItem key={o.id} value={o.id}>{o.numero_lote}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>
            <FormField label="pH"><Input type="number" step="0.01" value={edit.ph ?? ""} onChange={(e) => setEdit({ ...edit, ph: Number(e.target.value) })} /></FormField>
            <FormField label="Viscosidade (cP)"><Input type="number" step="0.01" value={edit.viscosidade ?? ""} onChange={(e) => setEdit({ ...edit, viscosidade: Number(e.target.value) })} /></FormField>
            <div className="md:col-span-2"><FormField label="Aparência"><Input value={edit.aparencia ?? ""} onChange={(e) => setEdit({ ...edit, aparencia: e.target.value })} placeholder="Líquido amarelo translúcido..." /></FormField></div>
            <div className="md:col-span-2"><FormField label="Observações"><Textarea value={edit.observacoes ?? ""} onChange={(e) => setEdit({ ...edit, observacoes: e.target.value })} /></FormField></div>
            <div className="md:col-span-2">
              <FormField label="Resultado">
                <Select value={edit.status ?? "aprovado"} onValueChange={(v) => setEdit({ ...edit, status: v as Analise["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="reprovado">Reprovado</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={dlg.close}>Cancelar</Button><Button onClick={salvar}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
