import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { RequireAuth } from "@/components/RequireAuth";
import {
  Button,
  DataCard,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FormField,
  Input,
  PageHeader,
  Pencil,
  Plus,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Trash2,
  useDialog,
} from "@/components/crud-ui";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Archive,
  Beaker,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FlaskConical,
  Microscope,
  PackageCheck,
  ScanBarcode,
  ShieldAlert,
  TestTube2,
  Trash2 as TrashIcon,
  Wrench,
} from "lucide-react";

export const Route = createFileRoute("/laboratorio")({
  component: () => (<RequireAuth><AppLayout><Laboratorio /></AppLayout></RequireAuth>),
});

type Etapa = "recebimento" | "registro" | "plano_ensaio" | "preparacao" | "analise" | "revisao" | "liberacao" | "arquivo";
type Status = "aguardando" | "em_andamento" | "em_revisao" | "aprovada" | "reprovada" | "arquivada";
type Prioridade = "baixa" | "normal" | "alta" | "urgente";
type AnyRecord = Record<string, any>;

type Amostra = {
  id: string;
  codigo: string;
  material: string;
  origem: string | null;
  lote: string | null;
  prioridade: Prioridade;
  etapa: Etapa;
  status: Status;
  prazo_resposta: string | null;
  responsavel: string | null;
  metodo: string | null;
  especificacao: string | null;
  resultado: string | null;
  parecer: string | null;
  observacoes: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
};

type AmostraForm = Partial<Omit<Amostra, "created_at" | "updated_at">>;

type FieldConfig = {
  key: string;
  label: string;
  type?: "text" | "date" | "number" | "textarea" | "select" | "boolean";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
};

type TableConfig = {
  table: string;
  queryKey: string;
  title: string;
  subtitle: string;
  empty: string;
  fields: FieldConfig[];
  columns: Array<{ key: string; label: string; render?: (row: AnyRecord) => React.ReactNode }>;
  defaults: AnyRecord;
  orderBy?: string;
};

const ETAPAS: Array<{ value: Etapa; label: string; description: string; icon: typeof PackageCheck; tone: string }> = [
  { value: "recebimento", label: "Recebimento", description: "Entrada e conferência física.", icon: PackageCheck, tone: "border-sky-200 bg-sky-50/70 text-sky-700" },
  { value: "registro", label: "Registro LIMS", description: "Código, origem e lote.", icon: ScanBarcode, tone: "border-cyan-200 bg-cyan-50/70 text-cyan-700" },
  { value: "plano_ensaio", label: "Plano de ensaio", description: "Método e especificação.", icon: ClipboardList, tone: "border-emerald-200 bg-emerald-50/70 text-emerald-700" },
  { value: "preparacao", label: "Preparação", description: "Preparo e distribuição.", icon: FlaskConical, tone: "border-teal-200 bg-teal-50/70 text-teal-700" },
  { value: "analise", label: "Análise", description: "Execução e resultado.", icon: Microscope, tone: "border-blue-200 bg-blue-50/70 text-blue-700" },
  { value: "revisao", label: "Revisão técnica", description: "Conferência e evidências.", icon: ClipboardCheck, tone: "border-indigo-200 bg-indigo-50/70 text-indigo-700" },
  { value: "liberacao", label: "Liberação", description: "Parecer final do lote.", icon: FileCheck2, tone: "border-lime-200 bg-lime-50/70 text-lime-700" },
  { value: "arquivo", label: "Arquivo", description: "Retenção e histórico.", icon: Archive, tone: "border-slate-200 bg-slate-50/80 text-slate-700" },
];

const STATUS: Record<Status, { label: string; cls: string }> = {
  aguardando: { label: "Aguardando", cls: "bg-muted text-muted-foreground" },
  em_andamento: { label: "Em andamento", cls: "bg-blue-100 text-blue-700" },
  em_revisao: { label: "Em revisão", cls: "bg-indigo-100 text-indigo-700" },
  aprovada: { label: "Aprovada", cls: "bg-success text-success-foreground" },
  reprovada: { label: "Reprovada", cls: "bg-destructive text-destructive-foreground" },
  arquivada: { label: "Arquivada", cls: "bg-slate-200 text-slate-700" },
};

const PRIORIDADES: Record<Prioridade, { label: string; cls: string }> = {
  baixa: { label: "Baixa", cls: "border-sky-200 bg-sky-50 text-sky-700" },
  normal: { label: "Normal", cls: "border-slate-200 bg-slate-50 text-slate-700" },
  alta: { label: "Alta", cls: "border-orange-200 bg-orange-50 text-orange-700" },
  urgente: { label: "Urgente", cls: "border-red-200 bg-red-50 text-red-700" },
};

const statusOptions = [
  { value: "ativo", label: "Ativo" },
  { value: "em_uso", label: "Em uso" },
  { value: "vencido", label: "Vencido" },
  { value: "quarentena", label: "Quarentena" },
  { value: "descartado", label: "Descartado" },
];

const configs: Record<string, TableConfig> = {
  reagentes: {
    table: "laboratorio_reagentes",
    queryKey: "laboratorio-reagentes",
    title: "Reagentes e produtos químicos",
    subtitle: "Validade, risco, compatibilidade química e armazenamento.",
    empty: "Nenhum reagente cadastrado",
    orderBy: "data_validade",
    defaults: { tipo: "reagente", status: "ativo", unidade: "un" },
    fields: [
      { key: "nome", label: "Nome *", required: true },
      { key: "tipo", label: "Tipo", type: "select", options: [{ value: "reagente", label: "Reagente" }, { value: "produto_quimico", label: "Produto químico" }, { value: "padrao", label: "Padrão" }, { value: "solucao", label: "Solução" }] },
      { key: "fabricante", label: "Fabricante" },
      { key: "lote", label: "Lote" },
      { key: "cas", label: "CAS" },
      { key: "classe_risco", label: "Classe de risco" },
      { key: "grupo_compatibilidade", label: "Grupo de compatibilidade" },
      { key: "incompatibilidades", label: "Incompatibilidades", type: "textarea", placeholder: "Ácidos, bases, oxidantes, orgânicos..." },
      { key: "local_armazenamento", label: "Local de armazenamento" },
      { key: "quantidade", label: "Quantidade", type: "number" },
      { key: "unidade", label: "Unidade" },
      { key: "data_recebimento", label: "Recebimento", type: "date" },
      { key: "data_abertura", label: "Abertura", type: "date" },
      { key: "data_validade", label: "Validade", type: "date" },
      { key: "responsavel", label: "Responsável" },
      { key: "status", label: "Status", type: "select", options: statusOptions },
      { key: "observacoes", label: "Observações", type: "textarea" },
    ],
    columns: [
      { key: "nome", label: "Nome" },
      { key: "lote", label: "Lote" },
      { key: "grupo_compatibilidade", label: "Compatibilidade" },
      { key: "data_validade", label: "Validade", render: (row) => fmtDate(row.data_validade) },
      { key: "local_armazenamento", label: "Local" },
      { key: "status", label: "Status", render: (row) => <Badge variant="outline">{row.status}</Badge> },
    ],
  },
  vidrarias: {
    table: "laboratorio_vidrarias",
    queryKey: "laboratorio-vidrarias",
    title: "Vidrarias e materiais",
    subtitle: "Inventário, disponibilidade e calibração de vidrarias críticas.",
    empty: "Nenhuma vidraria cadastrada",
    orderBy: "item",
    defaults: { status: "disponivel", quantidade_total: 0, quantidade_disponivel: 0, requer_calibracao: false },
    fields: [
      { key: "item", label: "Item *", required: true },
      { key: "codigo", label: "Código" },
      { key: "capacidade", label: "Capacidade" },
      { key: "quantidade_total", label: "Qtd. total", type: "number" },
      { key: "quantidade_disponivel", label: "Qtd. disponível", type: "number" },
      { key: "local_armazenamento", label: "Local" },
      { key: "requer_calibracao", label: "Requer calibração", type: "boolean" },
      { key: "data_calibracao", label: "Última calibração", type: "date" },
      { key: "proxima_calibracao", label: "Próxima calibração", type: "date" },
      { key: "status", label: "Status" },
      { key: "observacoes", label: "Observações", type: "textarea" },
    ],
    columns: [
      { key: "item", label: "Item" },
      { key: "codigo", label: "Código" },
      { key: "capacidade", label: "Capacidade" },
      { key: "quantidade_disponivel", label: "Disponível" },
      { key: "proxima_calibracao", label: "Próx. calibração", render: (row) => fmtDate(row.proxima_calibracao) },
      { key: "status", label: "Status", render: (row) => <Badge variant="outline">{row.status}</Badge> },
    ],
  },
  equipamentos: {
    table: "laboratorio_equipamentos",
    queryKey: "laboratorio-equipamentos",
    title: "Equipamentos e calibrações",
    subtitle: "Calibração, manutenção, certificados e status operacional.",
    empty: "Nenhum equipamento cadastrado",
    orderBy: "proxima_calibracao",
    defaults: { status: "operacional" },
    fields: [
      { key: "nome", label: "Nome *", required: true },
      { key: "codigo", label: "Código" },
      { key: "fabricante", label: "Fabricante" },
      { key: "modelo", label: "Modelo" },
      { key: "numero_serie", label: "Número de série" },
      { key: "local_instalacao", label: "Local" },
      { key: "responsavel", label: "Responsável" },
      { key: "frequencia_calibracao_dias", label: "Frequência calibração (dias)", type: "number" },
      { key: "ultima_calibracao", label: "Última calibração", type: "date" },
      { key: "proxima_calibracao", label: "Próxima calibração", type: "date" },
      { key: "ultima_manutencao", label: "Última manutenção", type: "date" },
      { key: "proxima_manutencao", label: "Próxima manutenção", type: "date" },
      { key: "status", label: "Status" },
      { key: "certificado", label: "Certificado" },
      { key: "observacoes", label: "Observações", type: "textarea" },
    ],
    columns: [
      { key: "nome", label: "Equipamento" },
      { key: "codigo", label: "Código" },
      { key: "local_instalacao", label: "Local" },
      { key: "proxima_calibracao", label: "Próx. calibração", render: (row) => fmtDate(row.proxima_calibracao) },
      { key: "proxima_manutencao", label: "Próx. manutenção", render: (row) => fmtDate(row.proxima_manutencao) },
      { key: "status", label: "Status", render: (row) => <Badge variant="outline">{row.status}</Badge> },
    ],
  },
  descartes: {
    table: "laboratorio_descartes",
    queryKey: "laboratorio-descartes",
    title: "Descarte e materiais analisados",
    subtitle: "Materiais analisados, resíduos, segregação, destino e baixa.",
    empty: "Nenhum descarte cadastrado",
    orderBy: "data_geracao",
    defaults: { status: "armazenado", unidade: "un", data_geracao: today() },
    fields: [
      { key: "codigo", label: "Código" },
      { key: "material", label: "Material *", required: true },
      { key: "origem", label: "Origem" },
      { key: "quantidade", label: "Quantidade", type: "number" },
      { key: "unidade", label: "Unidade" },
      { key: "classe_residuo", label: "Classe do resíduo" },
      { key: "risco", label: "Risco" },
      { key: "recipiente", label: "Recipiente" },
      { key: "data_geracao", label: "Data geração", type: "date" },
      { key: "data_descarte", label: "Data descarte", type: "date" },
      { key: "responsavel", label: "Responsável" },
      { key: "destino", label: "Destino" },
      { key: "status", label: "Status", type: "select", options: [{ value: "armazenado", label: "Armazenado" }, { value: "segregado", label: "Segregado" }, { value: "coletado", label: "Coletado" }, { value: "descartado", label: "Descartado" }] },
      { key: "observacoes", label: "Observações", type: "textarea" },
    ],
    columns: [
      { key: "material", label: "Material" },
      { key: "origem", label: "Origem" },
      { key: "classe_residuo", label: "Classe" },
      { key: "data_geracao", label: "Geração", render: (row) => fmtDate(row.data_geracao) },
      { key: "destino", label: "Destino" },
      { key: "status", label: "Status", render: (row) => <Badge variant="outline">{row.status}</Badge> },
    ],
  },
  arquivos: {
    table: "laboratorio_arquivos",
    queryKey: "laboratorio-arquivos",
    title: "Arquivo e arquivo morto",
    subtitle: "Retenção de registros, laudos, certificados, métodos e documentos.",
    empty: "Nenhum arquivo cadastrado",
    orderBy: "reter_ate",
    defaults: { tipo: "registro", status: "ativo" },
    fields: [
      { key: "titulo", label: "Título *", required: true },
      { key: "tipo", label: "Tipo", type: "select", options: [{ value: "registro", label: "Registro" }, { value: "laudo", label: "Laudo" }, { value: "certificado", label: "Certificado" }, { value: "metodo", label: "Método" }, { value: "arquivo_morto", label: "Arquivo morto" }] },
      { key: "codigo", label: "Código" },
      { key: "local_arquivo", label: "Local do arquivo" },
      { key: "data_documento", label: "Data documento", type: "date" },
      { key: "reter_ate", label: "Reter até", type: "date" },
      { key: "status", label: "Status", type: "select", options: [{ value: "ativo", label: "Ativo" }, { value: "arquivo_morto", label: "Arquivo morto" }, { value: "descartado", label: "Descartado" }] },
      { key: "responsavel", label: "Responsável" },
      { key: "observacoes", label: "Observações", type: "textarea" },
    ],
    columns: [
      { key: "titulo", label: "Título" },
      { key: "tipo", label: "Tipo" },
      { key: "codigo", label: "Código" },
      { key: "local_arquivo", label: "Local" },
      { key: "reter_ate", label: "Reter até", render: (row) => fmtDate(row.reter_ate) },
      { key: "status", label: "Status", render: (row) => <Badge variant="outline">{row.status}</Badge> },
    ],
  },
};

function Laboratorio() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const dlg = useDialog();
  const [edit, setEdit] = useState<AmostraForm | null>(null);

  const { data: amostras = [], isLoading } = useQuery({
    queryKey: ["laboratorio-amostras"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("laboratorio_amostras")
        .select("*")
        .order("prazo_resposta", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Amostra[];
    },
  });

  const totais = useMemo(() => ({
    abertas: amostras.filter((a) => !["aprovada", "reprovada", "arquivada"].includes(a.status)).length,
    analise: amostras.filter((a) => a.etapa === "analise").length,
    revisao: amostras.filter((a) => a.status === "em_revisao").length,
    liberadas: amostras.filter((a) => ["aprovada", "reprovada"].includes(a.status)).length,
  }), [amostras]);

  function openNew() {
    setEdit({
      codigo: `LAB-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
      prioridade: "normal",
      etapa: "recebimento",
      status: "aguardando",
      prazo_resposta: today(),
    });
    dlg.openNew();
  }

  function openEdit(amostra: Amostra) {
    setEdit(amostra);
    dlg.openNew();
  }

  async function salvar() {
    if (!edit?.codigo?.trim() || !edit?.material?.trim()) {
      toast.error("Preencha código e material");
      return;
    }

    const payload = {
      codigo: edit.codigo.trim(),
      material: edit.material.trim(),
      origem: clean(edit.origem),
      lote: clean(edit.lote),
      prioridade: edit.prioridade ?? "normal",
      etapa: edit.etapa ?? "recebimento",
      status: edit.status ?? "aguardando",
      prazo_resposta: edit.prazo_resposta || null,
      responsavel: clean(edit.responsavel),
      metodo: clean(edit.metodo),
      especificacao: clean(edit.especificacao),
      resultado: clean(edit.resultado),
      parecer: clean(edit.parecer),
      observacoes: clean(edit.observacoes),
      criado_por: edit.criado_por ?? user?.id ?? null,
    };

    const { error } = edit.id
      ? await (supabase as any).from("laboratorio_amostras").update(payload).eq("id", edit.id)
      : await (supabase as any).from("laboratorio_amostras").insert(payload);

    if (error) return toast.error(error.message);
    toast.success(edit.id ? "Amostra atualizada" : "Amostra cadastrada");
    dlg.close();
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["laboratorio-amostras"] });
  }

  async function avancar(amostra: Amostra) {
    const index = ETAPAS.findIndex((etapa) => etapa.value === amostra.etapa);
    const proxima = ETAPAS[Math.min(index + 1, ETAPAS.length - 1)]?.value ?? amostra.etapa;
    const status: Status = proxima === "revisao" ? "em_revisao" : proxima === "arquivo" ? "arquivada" : "em_andamento";
    const { error } = await (supabase as any).from("laboratorio_amostras").update({ etapa: proxima, status }).eq("id", amostra.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["laboratorio-amostras"] });
  }

  async function excluir(amostra: Amostra) {
    if (!confirm(`Excluir a amostra ${amostra.codigo}?`)) return;
    const { error } = await (supabase as any).from("laboratorio_amostras").delete().eq("id", amostra.id);
    if (error) return toast.error(error.message);
    toast.success("Amostra excluída");
    qc.invalidateQueries({ queryKey: ["laboratorio-amostras"] });
  }

  return (
    <>
      <PageHeader title="Laboratório" subtitle="LIMS, reagentes, vidrarias, equipamentos, descarte e arquivo" />

      <Tabs defaultValue="amostras" className="space-y-3">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="amostras">Amostras</TabsTrigger>
          <TabsTrigger value="reagentes">Reagentes</TabsTrigger>
          <TabsTrigger value="vidrarias">Vidrarias</TabsTrigger>
          <TabsTrigger value="equipamentos">Equipamentos</TabsTrigger>
          <TabsTrigger value="descartes">Descarte</TabsTrigger>
          <TabsTrigger value="arquivos">Arquivo</TabsTrigger>
        </TabsList>

        <TabsContent value="amostras" className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Abertas" value={totais.abertas} icon={Beaker} />
            <Metric label="Em análise" value={totais.analise} icon={Microscope} />
            <Metric label="Em revisão" value={totais.revisao} icon={ClipboardCheck} />
            <Metric label="Liberadas" value={totais.liberadas} icon={FileCheck2} />
          </div>

          <DataCard>
            <div className="border-b bg-sky-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-sky-800">Fluxo da amostra</h2>
                  <p className="text-xs text-muted-foreground">Use o botão avançar na fila para mover a amostra pela rotina do laboratório.</p>
                </div>
                <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nova amostra</Button>
              </div>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
              {ETAPAS.map((etapa, index) => {
                const Icon = etapa.icon;
                const count = amostras.filter((amostra) => amostra.etapa === etapa.value).length;
                return (
                  <div key={etapa.value} className={`rounded-md border p-3 ${etapa.tone}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/80">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] font-semibold uppercase tracking-wider opacity-70">Etapa {index + 1}</div>
                          <Badge variant="outline" className="bg-white/80">{count}</Badge>
                        </div>
                        <h3 className="text-sm font-semibold">{etapa.label}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{etapa.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </DataCard>

          <DataCard>
            {isLoading ? <EmptyState label="Carregando amostras..." /> : amostras.length === 0 ? <EmptyState label="Nenhuma amostra cadastrada" /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead><TableHead>Material</TableHead><TableHead>Lote / origem</TableHead>
                    <TableHead>Etapa</TableHead><TableHead>Status</TableHead><TableHead>Prioridade</TableHead>
                    <TableHead>Prazo</TableHead><TableHead>Responsável</TableHead><TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {amostras.map((amostra) => (
                    <TableRow key={amostra.id}>
                      <TableCell className="font-mono text-xs font-semibold">{amostra.codigo}</TableCell>
                      <TableCell>
                        <div className="font-medium">{amostra.material}</div>
                        <div className="max-w-[220px] truncate text-xs text-muted-foreground">{amostra.metodo || "Método não informado"}</div>
                      </TableCell>
                      <TableCell className="text-xs"><div>{amostra.lote || "-"}</div><div className="text-muted-foreground">{amostra.origem || "-"}</div></TableCell>
                      <TableCell><Badge variant="outline">{labelEtapa(amostra.etapa)}</Badge></TableCell>
                      <TableCell><Badge className={STATUS[amostra.status].cls}>{STATUS[amostra.status].label}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={PRIORIDADES[amostra.prioridade].cls}>{PRIORIDADES[amostra.prioridade].label}</Badge></TableCell>
                      <TableCell className="text-xs">{fmtDate(amostra.prazo_resposta)}</TableCell>
                      <TableCell className="text-xs">{amostra.responsavel || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => avancar(amostra)} disabled={amostra.etapa === "arquivo"}>Avançar</Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(amostra)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => excluir(amostra)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataCard>
        </TabsContent>

        <TabsContent value="reagentes"><GenericManager config={configs.reagentes} icon={ShieldAlert} /></TabsContent>
        <TabsContent value="vidrarias"><GenericManager config={configs.vidrarias} icon={TestTube2} /></TabsContent>
        <TabsContent value="equipamentos"><GenericManager config={configs.equipamentos} icon={Wrench} /></TabsContent>
        <TabsContent value="descartes"><GenericManager config={configs.descartes} icon={TrashIcon} /></TabsContent>
        <TabsContent value="arquivos"><GenericManager config={configs.arquivos} icon={Archive} /></TabsContent>
      </Tabs>

      <Dialog open={dlg.open} onOpenChange={dlg.setOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar amostra" : "Nova amostra"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Código *"><Input value={edit?.codigo ?? ""} onChange={(e) => setEdit({ ...edit!, codigo: e.target.value })} /></FormField>
            <FormField label="Material / amostra *"><Input value={edit?.material ?? ""} onChange={(e) => setEdit({ ...edit!, material: e.target.value })} placeholder="Produto acabado, água, matéria-prima..." /></FormField>
            <FormField label="Lote"><Input value={edit?.lote ?? ""} onChange={(e) => setEdit({ ...edit!, lote: e.target.value })} /></FormField>
            <FormField label="Origem"><Input value={edit?.origem ?? ""} onChange={(e) => setEdit({ ...edit!, origem: e.target.value })} placeholder="Produção, estoque, fornecedor..." /></FormField>
            <FormField label="Responsável"><Input value={edit?.responsavel ?? ""} onChange={(e) => setEdit({ ...edit!, responsavel: e.target.value })} /></FormField>
            <FormField label="Prazo"><Input type="date" value={edit?.prazo_resposta ?? ""} onChange={(e) => setEdit({ ...edit!, prazo_resposta: e.target.value })} /></FormField>
            <FormField label="Prioridade">
              <Select value={edit?.prioridade ?? "normal"} onValueChange={(value) => setEdit({ ...edit!, prioridade: value as Prioridade })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PRIORIDADES).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Etapa">
              <Select value={edit?.etapa ?? "recebimento"} onValueChange={(value) => setEdit({ ...edit!, etapa: value as Etapa })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ETAPAS.map((etapa) => <SelectItem key={etapa.value} value={etapa.value}>{etapa.label}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Status">
              <Select value={edit?.status ?? "aguardando"} onValueChange={(value) => setEdit({ ...edit!, status: value as Status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Método"><Input value={edit?.metodo ?? ""} onChange={(e) => setEdit({ ...edit!, metodo: e.target.value })} /></FormField>
            <FormField label="Especificação"><Input value={edit?.especificacao ?? ""} onChange={(e) => setEdit({ ...edit!, especificacao: e.target.value })} /></FormField>
            <FormField label="Resultado"><Input value={edit?.resultado ?? ""} onChange={(e) => setEdit({ ...edit!, resultado: e.target.value })} /></FormField>
            <div className="md:col-span-3"><FormField label="Parecer técnico"><Textarea value={edit?.parecer ?? ""} onChange={(e) => setEdit({ ...edit!, parecer: e.target.value })} /></FormField></div>
            <div className="md:col-span-3"><FormField label="Observações"><Textarea value={edit?.observacoes ?? ""} onChange={(e) => setEdit({ ...edit!, observacoes: e.target.value })} /></FormField></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={dlg.close}>Cancelar</Button><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function GenericManager({ config, icon: Icon }: { config: TableConfig; icon: typeof Beaker }) {
  const qc = useQueryClient();
  const dlg = useDialog();
  const [edit, setEdit] = useState<AnyRecord | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: [config.queryKey],
    queryFn: async () => {
      let query = (supabase as any).from(config.table).select("*");
      if (config.orderBy) query = query.order(config.orderBy, { ascending: true, nullsFirst: false });
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data as AnyRecord[];
    },
  });

  function openNew() {
    setEdit({ ...config.defaults });
    dlg.openNew();
  }

  async function save() {
    if (config.fields.some((field) => field.required && !String(edit?.[field.key] ?? "").trim())) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    const payload = sanitizePayload(edit ?? {});
    const { error } = edit?.id
      ? await (supabase as any).from(config.table).update(payload).eq("id", edit.id)
      : await (supabase as any).from(config.table).insert(payload);
    if (error) return toast.error(error.message);
    toast.success(edit?.id ? "Registro atualizado" : "Registro cadastrado");
    dlg.close();
    setEdit(null);
    qc.invalidateQueries({ queryKey: [config.queryKey] });
  }

  async function remove(row: AnyRecord) {
    if (!confirm("Excluir registro?")) return;
    const { error } = await (supabase as any).from(config.table).delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Registro excluído");
    qc.invalidateQueries({ queryKey: [config.queryKey] });
  }

  return (
    <>
      <DataCard>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">{config.title}</h2>
              <p className="text-xs text-muted-foreground">{config.subtitle}</p>
            </div>
          </div>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Novo</Button>
        </div>
        {isLoading ? <EmptyState label="Carregando..." /> : data.length === 0 ? <EmptyState label={config.empty} /> : (
          <Table>
            <TableHeader>
              <TableRow>
                {config.columns.map((column) => <TableHead key={column.key}>{column.label}</TableHead>)}
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  {config.columns.map((column) => (
                    <TableCell key={column.key} className="text-xs">
                      {column.render ? column.render(row) : (row[column.key] || "-")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setEdit(row); dlg.openNew(); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(row)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataCard>

      <Dialog open={dlg.open} onOpenChange={dlg.setOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar registro" : "Novo registro"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-3">
            {config.fields.map((field) => (
              <div key={field.key} className={field.type === "textarea" ? "md:col-span-3" : undefined}>
                <FormField label={field.label}>
                  <FieldInput field={field} edit={edit ?? {}} setEdit={setEdit} />
                </FormField>
              </div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={dlg.close}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FieldInput({ field, edit, setEdit }: { field: FieldConfig; edit: AnyRecord; setEdit: (value: AnyRecord) => void }) {
  const value = edit[field.key];
  if (field.type === "textarea") return <Textarea value={value ?? ""} placeholder={field.placeholder} onChange={(e) => setEdit({ ...edit, [field.key]: e.target.value })} />;
  if (field.type === "select") {
    return (
      <Select value={value ?? ""} onValueChange={(v) => setEdit({ ...edit, [field.key]: v })}>
        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
        <SelectContent>{field.options?.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    );
  }
  if (field.type === "boolean") {
    return (
      <Select value={value ? "true" : "false"} onValueChange={(v) => setEdit({ ...edit, [field.key]: v === "true" })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="false">Não</SelectItem><SelectItem value="true">Sim</SelectItem></SelectContent>
      </Select>
    );
  }
  return <Input type={field.type ?? "text"} value={value ?? ""} placeholder={field.placeholder} onChange={(e) => setEdit({ ...edit, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value })} />;
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Beaker }) {
  return (
    <DataCard>
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </div>
    </DataCard>
  );
}

function labelEtapa(value: Etapa) {
  return ETAPAS.find((etapa) => etapa.value === value)?.label ?? value;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function clean(value?: string | null) {
  return value?.trim() || null;
}

function fmtDate(value?: string | null) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "-";
}

function sanitizePayload(payload: AnyRecord) {
  return Object.fromEntries(
    Object.entries(payload)
      .filter(([key]) => !["id", "created_at", "updated_at"].includes(key))
      .map(([key, value]) => [key, typeof value === "string" ? clean(value) : value])
  );
}
