import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, DataCard, FormField, EmptyState,
  Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Plus, Trash2 } from "@/components/crud-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/formulacoes")({
  component: () => (<RequireAuth><AppLayout><Formulacoes /></AppLayout></RequireAuth>),
});

const TAMANHOS = [5, 20, 50, 200, 1000];

function Formulacoes() {
  const qc = useQueryClient();
  const [produtoId, setProdutoId] = useState<string>("");

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-select"],
    queryFn: async () => (await supabase.from("produtos").select("id,nome").order("nome")).data ?? [],
  });
  const { data: mps = [] } = useQuery({
    queryKey: ["mp-select"],
    queryFn: async () => (await supabase.from("materias_primas").select("id,nome,custo_unitario,unidade").order("nome")).data ?? [],
  });
  const { data: formula = [], refetch } = useQuery({
    queryKey: ["formulacao", produtoId],
    enabled: !!produtoId,
    queryFn: async () => (await supabase.from("formulacoes").select("*").eq("produto_id", produtoId)).data ?? [],
  });

  useEffect(() => { if (!produtoId && produtos[0]) setProdutoId(produtos[0].id); }, [produtos, produtoId]);

  const [novoMp, setNovoMp] = useState("");
  const [novoPct, setNovoPct] = useState(0);

  const linhas = useMemo(() => formula.map((f) => {
    const mp = mps.find((m) => m.id === f.materia_prima_id);
    return { ...f, mp };
  }), [formula, mps]);

  const totalPct = linhas.reduce((a, l) => a + Number(l.percentual), 0);
  const custoPorLitro = linhas.reduce((a, l) => a + (Number(l.mp?.custo_unitario ?? 0) * Number(l.percentual) / 100), 0);

  async function adicionar() {
    if (!novoMp || !novoPct) return toast.error("Selecione matéria-prima e percentual");
    const { error } = await supabase.from("formulacoes").insert({
      produto_id: produtoId, materia_prima_id: novoMp, percentual: novoPct,
    });
    if (error) return toast.error(error.message);
    setNovoMp(""); setNovoPct(0); refetch(); recalcularCusto();
  }
  async function remover(id: string) {
    await supabase.from("formulacoes").delete().eq("id", id);
    refetch(); recalcularCusto();
  }
  async function recalcularCusto() {
    await supabase.from("produtos").update({ custo_calculado: custoPorLitro }).eq("id", produtoId);
    qc.invalidateQueries({ queryKey: ["produtos"] });
  }
  useEffect(() => { if (produtoId && linhas.length >= 0) recalcularCusto(); }, [custoPorLitro]); // eslint-disable-line

  return (
    <>
      <PageHeader title="Formulações" subtitle="Composição de matérias-primas por produto" />
      <Card className="mb-4 p-4">
        <FormField label="Produto">
          <Select value={produtoId} onValueChange={setProdutoId}>
            <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
            <SelectContent>
              {produtos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
      </Card>

      {produtoId && (
        <>
          <DataCard>
            {linhas.length === 0 ? <EmptyState label="Adicione matérias-primas à formulação" /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matéria-prima</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Custo/L</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.mp?.nome}</TableCell>
                      <TableCell className="text-right">{Number(l.percentual).toFixed(2)}%</TableCell>
                      <TableCell className="text-right">R$ {(Number(l.mp?.custo_unitario ?? 0) * Number(l.percentual) / 100).toFixed(4)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => remover(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className={`text-right ${totalPct > 100 ? "text-destructive" : ""}`}>{totalPct.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">R$ {custoPorLitro.toFixed(4)}/L</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </DataCard>

          <Card className="mt-4 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Adicionar componente</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[240px] flex-1">
                <FormField label="Matéria-prima">
                  <Select value={novoMp} onValueChange={setNovoMp}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {mps.filter((m) => !linhas.some((l) => l.materia_prima_id === m.id)).map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              <FormField label="Percentual %"><Input type="number" step="0.01" value={novoPct} onChange={(e) => setNovoPct(Number(e.target.value))} className="w-32" /></FormField>
              <Button onClick={adicionar}><Plus className="mr-2 h-4 w-4" />Adicionar</Button>
            </div>
          </Card>

          <Card className="mt-4 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cálculo por volume de produção</h3>
            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-5">
              {TAMANHOS.map((vol) => (
                <Card key={vol} className="bg-secondary/10 p-3 text-center">
                  <div className="text-xs text-muted-foreground">{vol} L</div>
                  <div className="text-lg font-bold">R$ {(custoPorLitro * vol).toFixed(2)}</div>
                </Card>
              ))}
            </div>
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Matéria-prima</TableHead>
                  {TAMANHOS.map((v) => <TableHead key={v} className="text-right">{v}L</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.mp?.nome}</TableCell>
                    {TAMANHOS.map((v) => (
                      <TableCell key={v} className="text-right text-xs">{(v * Number(l.percentual) / 100).toFixed(3)} {l.mp?.unidade}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
