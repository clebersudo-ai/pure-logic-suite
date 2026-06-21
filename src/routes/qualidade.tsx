import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
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
import { AlertTriangle, Archive, BookOpenCheck, CheckCircle2, Clock, FileCheck2, FileText, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/qualidade")({
  component: () => (<RequireAuth><AppLayout><Qualidade /></AppLayout></RequireAuth>),
});

type StatusDoc = "em_elaboracao" | "em_revisao" | "aprovado" | "obsoleto" | "arquivo_morto";
type Criticidade = "baixa" | "media" | "alta" | "critica";

type DocumentoQualidade = {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  area_responsavel: string | null;
  setor_aplicavel: string | null;
  versao_atual: string;
  data_emissao: string | null;
  proxima_revisao: string | null;
  elaborado_por: string | null;
  aprovado_por: string | null;
  status: StatusDoc;
  criticidade: Criticidade;
  local_aplicacao: string | null;
  treinamento_obrigatorio: boolean;
  arquivo_nome: string | null;
  arquivo_url: string | null;
  observacoes: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
};

type TreinamentoQualidade = {
  id: string;
  documento_id: string | null;
  titulo: string;
  publico_alvo: string | null;
  responsavel: string | null;
  data_prevista: string | null;
  data_realizada: string | null;
  validade_treinamento: string | null;
  status: string;
  evidencias: string | null;
  observacoes: string | null;
  qualidade_documentos?: { codigo?: string; titulo?: string } | null;
};

type DocumentoForm = Partial<DocumentoQualidade>;
type TreinamentoForm = Partial<TreinamentoQualidade>;

const TIPOS = ["Manual de Boas Práticas", "POP", "IT", "FDS / FISPQ", "Especificação técnica", "Método de análise", "Formulário", "Registro", "Plano de controle", "Política da qualidade", "Relatório"];

const STATUS_DOC: Record<StatusDoc, { label: string; cls: string }> = {
  em_elaboracao: { label: "Em elaboração", cls: "bg-muted text-muted-foreground" },
  em_revisao: { label: "Em revisão", cls: "bg-blue-100 text-blue-700" },
  aprovado: { label: "Aprovado", cls: "bg-success text-success-foreground" },
  obsoleto: { label: "Obsoleto", cls: "bg-orange-100 text-orange-700" },
  arquivo_morto: { label: "Arquivo morto", cls: "bg-slate-200 text-slate-700" },
};

const CRITICIDADE: Record<Criticidade, { label: string; cls: string }> = {
  baixa: { label: "Baixa", cls: "border-sky-200 bg-sky-50 text-sky-700" },
  media: { label: "Média", cls: "border-slate-200 bg-slate-50 text-slate-700" },
  alta: { label: "Alta", cls: "border-orange-200 bg-orange-50 text-orange-700" },
  critica: { label: "Crítica", cls: "border-red-200 bg-red-50 text-red-700" },
};

function Qualidade() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const docDlg = useDialog();
  const trainDlg = useDialog();
  const [docEdit, setDocEdit] = useState<DocumentoForm | null>(null);
  const [trainingEdit, setTrainingEdit] = useState<TreinamentoForm | null>(null);

  const { data: documentos = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["qualidade-documentos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("qualidade_documentos")
        .select("*")
        .order("proxima_revisao", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DocumentoQualidade[];
    },
  });

  const { data: treinamentos = [], isLoading: loadingTrainings } = useQuery({
    queryKey: ["qualidade-treinamentos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("qualidade_treinamentos")
        .select("*, qualidade_documentos(codigo,titulo)")
        .order("data_prevista", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TreinamentoQualidade[];
    },
  });

  const hoje = new Date();
  const limite30 = addDays(hoje, 30);
  const revisoesPendentes = documentos.filter((doc) =>
    doc.status !== "obsoleto" &&
    doc.status !== "arquivo_morto" &&
    doc.proxima_revisao &&
    new Date(`${doc.proxima_revisao}T00:00:00`) <= limite30
  );
  const aprovados = documentos.filter((doc) => doc.status === "aprovado");
  const obsoletos = documentos.filter((doc) => doc.status === "obsoleto" || doc.status === "arquivo_morto");

  const indicadores = useMemo(() => ({
    ativos: documentos.filter((doc) => doc.status === "aprovado").length,
    vencidos: documentos.filter((doc) => doc.proxima_revisao && new Date(`${doc.proxima_revisao}T00:00:00`) < hoje && doc.status === "aprovado").length,
    proximos: documentos.filter((doc) => doc.proxima_revisao && new Date(`${doc.proxima_revisao}T00:00:00`) >= hoje && new Date(`${doc.proxima_revisao}T00:00:00`) <= limite30).length,
    emFluxo: documentos.filter((doc) => doc.status === "em_elaboracao" || doc.status === "em_revisao").length,
    obsoletos: obsoletos.length,
    treinamentosPendentes: treinamentos.filter((item) => item.status !== "realizado").length,
  }), [documentos, treinamentos]);

  function openNewDoc() {
    setDocEdit({
      codigo: `QUAL-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      tipo: "POP",
      versao_atual: "1.0",
      status: "em_elaboracao",
      criticidade: "media",
      data_emissao: today(),
      proxima_revisao: addDays(new Date(), 365).toISOString().slice(0, 10),
      treinamento_obrigatorio: false,
      criado_por: user?.id ?? null,
    });
    docDlg.openNew();
  }

  function openNewTraining() {
    setTrainingEdit({ status: "pendente", data_prevista: today() });
    trainDlg.openNew();
  }

  async function saveDoc() {
    if (!docEdit?.codigo?.trim() || !docEdit?.titulo?.trim()) return toast.error("Preencha código e título");
    const payload = sanitize({
      codigo: docEdit.codigo,
      titulo: docEdit.titulo,
      tipo: docEdit.tipo ?? "POP",
      area_responsavel: docEdit.area_responsavel,
      setor_aplicavel: docEdit.setor_aplicavel,
      versao_atual: docEdit.versao_atual ?? "1.0",
      data_emissao: docEdit.data_emissao || null,
      proxima_revisao: docEdit.proxima_revisao || null,
      elaborado_por: docEdit.elaborado_por,
      aprovado_por: docEdit.aprovado_por,
      status: docEdit.status ?? "em_elaboracao",
      criticidade: docEdit.criticidade ?? "media",
      local_aplicacao: docEdit.local_aplicacao,
      treinamento_obrigatorio: !!docEdit.treinamento_obrigatorio,
      arquivo_nome: docEdit.arquivo_nome,
      arquivo_url: docEdit.arquivo_url,
      observacoes: docEdit.observacoes,
      criado_por: docEdit.criado_por ?? user?.id ?? null,
    });

    const { error } = docEdit.id
      ? await (supabase as any).from("qualidade_documentos").update(payload).eq("id", docEdit.id)
      : await (supabase as any).from("qualidade_documentos").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(docEdit.id ? "Documento atualizado" : "Documento cadastrado");
    docDlg.close();
    setDocEdit(null);
    qc.invalidateQueries({ queryKey: ["qualidade-documentos"] });
  }

  async function saveTraining() {
    if (!trainingEdit?.titulo?.trim()) return toast.error("Preencha o título do treinamento");
    const payload = sanitize({
      documento_id: trainingEdit.documento_id || null,
      titulo: trainingEdit.titulo,
      publico_alvo: trainingEdit.publico_alvo,
      responsavel: trainingEdit.responsavel,
      data_prevista: trainingEdit.data_prevista || null,
      data_realizada: trainingEdit.data_realizada || null,
      validade_treinamento: trainingEdit.validade_treinamento || null,
      status: trainingEdit.status ?? "pendente",
      evidencias: trainingEdit.evidencias,
      observacoes: trainingEdit.observacoes,
    });
    const { error } = trainingEdit.id
      ? await (supabase as any).from("qualidade_treinamentos").update(payload).eq("id", trainingEdit.id)
      : await (supabase as any).from("qualidade_treinamentos").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(trainingEdit.id ? "Treinamento atualizado" : "Treinamento cadastrado");
    trainDlg.close();
    setTrainingEdit(null);
    qc.invalidateQueries({ queryKey: ["qualidade-treinamentos"] });
  }

  async function removeDoc(doc: DocumentoQualidade) {
    if (!confirm(`Excluir ${doc.codigo}?`)) return;
    const { error } = await (supabase as any).from("qualidade_documentos").delete().eq("id", doc.id);
    if (error) return toast.error(error.message);
    toast.success("Documento excluído");
    qc.invalidateQueries({ queryKey: ["qualidade-documentos"] });
  }

  async function removeTraining(item: TreinamentoQualidade) {
    if (!confirm("Excluir treinamento?")) return;
    const { error } = await (supabase as any).from("qualidade_treinamentos").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("Treinamento excluído");
    qc.invalidateQueries({ queryKey: ["qualidade-treinamentos"] });
  }

  return (
    <>
      <PageHeader
        title="Qualidade"
        subtitle="Controle documental do sistema da qualidade"
        action={<Button onClick={openNewDoc}><Plus className="mr-2 h-4 w-4" />Novo documento</Button>}
      />

      <div className="mb-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Aprovados" value={indicadores.ativos} icon={CheckCircle2} />
        <Metric label="Vencidos" value={indicadores.vencidos} icon={AlertTriangle} />
        <Metric label="Próx. revisão" value={indicadores.proximos} icon={Clock} />
        <Metric label="Em fluxo" value={indicadores.emFluxo} icon={FileText} />
        <Metric label="Obsoletos" value={indicadores.obsoletos} icon={Archive} />
        <Metric label="Treinamentos" value={indicadores.treinamentosPendentes} icon={GraduationCap} />
      </div>

      <Tabs defaultValue="documentos" className="space-y-3">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="revisoes">Revisões pendentes</TabsTrigger>
          <TabsTrigger value="aprovados">Aprovados</TabsTrigger>
          <TabsTrigger value="obsoletos">Obsoletos</TabsTrigger>
          <TabsTrigger value="treinamentos">Treinamentos</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos">
          <DocumentTable docs={documentos} loading={loadingDocs} empty="Nenhum documento da qualidade cadastrado" onEdit={(doc) => { setDocEdit(doc); docDlg.openNew(); }} onDelete={removeDoc} />
        </TabsContent>
        <TabsContent value="revisoes">
          <DocumentTable docs={revisoesPendentes} loading={loadingDocs} empty="Nenhuma revisão pendente" onEdit={(doc) => { setDocEdit(doc); docDlg.openNew(); }} onDelete={removeDoc} />
        </TabsContent>
        <TabsContent value="aprovados">
          <DocumentTable docs={aprovados} loading={loadingDocs} empty="Nenhum documento aprovado" onEdit={(doc) => { setDocEdit(doc); docDlg.openNew(); }} onDelete={removeDoc} />
        </TabsContent>
        <TabsContent value="obsoletos">
          <DocumentTable docs={obsoletos} loading={loadingDocs} empty="Nenhum documento obsoleto ou em arquivo morto" onEdit={(doc) => { setDocEdit(doc); docDlg.openNew(); }} onDelete={removeDoc} />
        </TabsContent>
        <TabsContent value="treinamentos">
          <TreinamentoTable
            treinamentos={treinamentos}
            loading={loadingTrainings}
            onNew={openNewTraining}
            onEdit={(item) => { setTrainingEdit(item); trainDlg.openNew(); }}
            onDelete={removeTraining}
          />
        </TabsContent>
        <TabsContent value="indicadores">
          <Indicadores documentos={documentos} />
        </TabsContent>
      </Tabs>

      <Dialog open={docDlg.open} onOpenChange={docDlg.setOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>{docEdit?.id ? "Editar documento da qualidade" : "Novo documento da qualidade"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Código *"><Input value={docEdit?.codigo ?? ""} onChange={(e) => setDocEdit({ ...docEdit!, codigo: e.target.value })} /></FormField>
            <FormField label="Título *"><Input value={docEdit?.titulo ?? ""} onChange={(e) => setDocEdit({ ...docEdit!, titulo: e.target.value })} /></FormField>
            <FormField label="Tipo">
              <Select value={docEdit?.tipo ?? "POP"} onValueChange={(value) => setDocEdit({ ...docEdit!, tipo: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((tipo) => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Área responsável"><Input value={docEdit?.area_responsavel ?? ""} onChange={(e) => setDocEdit({ ...docEdit!, area_responsavel: e.target.value })} /></FormField>
            <FormField label="Setor aplicável"><Input value={docEdit?.setor_aplicavel ?? ""} onChange={(e) => setDocEdit({ ...docEdit!, setor_aplicavel: e.target.value })} /></FormField>
            <FormField label="Versão atual"><Input value={docEdit?.versao_atual ?? ""} onChange={(e) => setDocEdit({ ...docEdit!, versao_atual: e.target.value })} /></FormField>
            <FormField label="Data de emissão"><Input type="date" value={docEdit?.data_emissao ?? ""} onChange={(e) => setDocEdit({ ...docEdit!, data_emissao: e.target.value })} /></FormField>
            <FormField label="Próxima revisão"><Input type="date" value={docEdit?.proxima_revisao ?? ""} onChange={(e) => setDocEdit({ ...docEdit!, proxima_revisao: e.target.value })} /></FormField>
            <FormField label="Criticidade">
              <Select value={docEdit?.criticidade ?? "media"} onValueChange={(value) => setDocEdit({ ...docEdit!, criticidade: value as Criticidade })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CRITICIDADE).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Elaborado por"><Input value={docEdit?.elaborado_por ?? ""} onChange={(e) => setDocEdit({ ...docEdit!, elaborado_por: e.target.value })} /></FormField>
            <FormField label="Aprovado por"><Input value={docEdit?.aprovado_por ?? ""} onChange={(e) => setDocEdit({ ...docEdit!, aprovado_por: e.target.value })} /></FormField>
            <FormField label="Status">
              <Select value={docEdit?.status ?? "em_elaboracao"} onValueChange={(value) => setDocEdit({ ...docEdit!, status: value as StatusDoc })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_DOC).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Local de aplicação"><Input value={docEdit?.local_aplicacao ?? ""} onChange={(e) => setDocEdit({ ...docEdit!, local_aplicacao: e.target.value })} /></FormField>
            <FormField label="Nome do arquivo"><Input value={docEdit?.arquivo_nome ?? ""} onChange={(e) => setDocEdit({ ...docEdit!, arquivo_nome: e.target.value })} /></FormField>
            <FormField label="Link do arquivo"><Input value={docEdit?.arquivo_url ?? ""} onChange={(e) => setDocEdit({ ...docEdit!, arquivo_url: e.target.value })} /></FormField>
            <FormField label="Treinamento obrigatório">
              <Select value={docEdit?.treinamento_obrigatorio ? "true" : "false"} onValueChange={(value) => setDocEdit({ ...docEdit!, treinamento_obrigatorio: value === "true" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="false">Não</SelectItem><SelectItem value="true">Sim</SelectItem></SelectContent>
              </Select>
            </FormField>
            <div className="md:col-span-3"><FormField label="Observações"><Textarea value={docEdit?.observacoes ?? ""} onChange={(e) => setDocEdit({ ...docEdit!, observacoes: e.target.value })} /></FormField></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={docDlg.close}>Cancelar</Button><Button onClick={saveDoc}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={trainDlg.open} onOpenChange={trainDlg.setOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{trainingEdit?.id ? "Editar treinamento" : "Novo treinamento"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FormField label="Documento vinculado">
                <Select value={trainingEdit?.documento_id ?? "none"} onValueChange={(value) => setTrainingEdit({ ...trainingEdit!, documento_id: value === "none" ? null : value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {documentos.map((doc) => <SelectItem key={doc.id} value={doc.id}>{doc.codigo} - {doc.titulo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <FormField label="Título *"><Input value={trainingEdit?.titulo ?? ""} onChange={(e) => setTrainingEdit({ ...trainingEdit!, titulo: e.target.value })} /></FormField>
            <FormField label="Público-alvo"><Input value={trainingEdit?.publico_alvo ?? ""} onChange={(e) => setTrainingEdit({ ...trainingEdit!, publico_alvo: e.target.value })} /></FormField>
            <FormField label="Responsável"><Input value={trainingEdit?.responsavel ?? ""} onChange={(e) => setTrainingEdit({ ...trainingEdit!, responsavel: e.target.value })} /></FormField>
            <FormField label="Status">
              <Select value={trainingEdit?.status ?? "pendente"} onValueChange={(value) => setTrainingEdit({ ...trainingEdit!, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="programado">Programado</SelectItem><SelectItem value="realizado">Realizado</SelectItem><SelectItem value="vencido">Vencido</SelectItem></SelectContent>
              </Select>
            </FormField>
            <FormField label="Data prevista"><Input type="date" value={trainingEdit?.data_prevista ?? ""} onChange={(e) => setTrainingEdit({ ...trainingEdit!, data_prevista: e.target.value })} /></FormField>
            <FormField label="Data realizada"><Input type="date" value={trainingEdit?.data_realizada ?? ""} onChange={(e) => setTrainingEdit({ ...trainingEdit!, data_realizada: e.target.value })} /></FormField>
            <FormField label="Validade do treinamento"><Input type="date" value={trainingEdit?.validade_treinamento ?? ""} onChange={(e) => setTrainingEdit({ ...trainingEdit!, validade_treinamento: e.target.value })} /></FormField>
            <FormField label="Evidências"><Input value={trainingEdit?.evidencias ?? ""} onChange={(e) => setTrainingEdit({ ...trainingEdit!, evidencias: e.target.value })} /></FormField>
            <div className="md:col-span-2"><FormField label="Observações"><Textarea value={trainingEdit?.observacoes ?? ""} onChange={(e) => setTrainingEdit({ ...trainingEdit!, observacoes: e.target.value })} /></FormField></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={trainDlg.close}>Cancelar</Button><Button onClick={saveTraining}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DocumentTable({ docs, loading, empty, onEdit, onDelete }: {
  docs: DocumentoQualidade[];
  loading: boolean;
  empty: string;
  onEdit: (doc: DocumentoQualidade) => void;
  onDelete: (doc: DocumentoQualidade) => void;
}) {
  return (
    <DataCard>
      {loading ? <EmptyState label="Carregando documentos..." /> : docs.length === 0 ? <EmptyState label={empty} /> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead><TableHead>Título</TableHead><TableHead>Tipo</TableHead>
              <TableHead>Versão</TableHead><TableHead>Próxima revisão</TableHead><TableHead>Status</TableHead>
              <TableHead>Criticidade</TableHead><TableHead>Responsável</TableHead><TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-mono text-xs font-semibold">{doc.codigo}</TableCell>
                <TableCell>
                  <div className="font-medium">{doc.titulo}</div>
                  <div className="max-w-[260px] truncate text-xs text-muted-foreground">{doc.local_aplicacao || doc.arquivo_nome || "Sem local/arquivo informado"}</div>
                </TableCell>
                <TableCell>{doc.tipo}</TableCell>
                <TableCell>{doc.versao_atual}</TableCell>
                <TableCell className="text-xs">{fmtDate(doc.proxima_revisao)}</TableCell>
                <TableCell><Badge className={STATUS_DOC[doc.status].cls}>{STATUS_DOC[doc.status].label}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={CRITICIDADE[doc.criticidade].cls}>{CRITICIDADE[doc.criticidade].label}</Badge></TableCell>
                <TableCell className="text-xs">{doc.area_responsavel || doc.aprovado_por || "-"}</TableCell>
                <TableCell className="text-right">
                  {doc.arquivo_url && <Button size="sm" variant="ghost" asChild><a href={doc.arquivo_url} target="_blank" rel="noreferrer">Abrir</a></Button>}
                  <Button size="sm" variant="ghost" onClick={() => onEdit(doc)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(doc)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DataCard>
  );
}

function TreinamentoTable({ treinamentos, loading, onNew, onEdit, onDelete }: {
  treinamentos: TreinamentoQualidade[];
  loading: boolean;
  onNew: () => void;
  onEdit: (item: TreinamentoQualidade) => void;
  onDelete: (item: TreinamentoQualidade) => void;
}) {
  return (
    <DataCard>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <h2 className="text-sm font-semibold">Treinamentos vinculados</h2>
          <p className="text-xs text-muted-foreground">Treinamentos exigidos por POP, IT, manual ou documento crítico.</p>
        </div>
        <Button onClick={onNew}><Plus className="mr-2 h-4 w-4" />Novo treinamento</Button>
      </div>
      {loading ? <EmptyState label="Carregando treinamentos..." /> : treinamentos.length === 0 ? <EmptyState label="Nenhum treinamento cadastrado" /> : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Título</TableHead><TableHead>Documento</TableHead><TableHead>Público-alvo</TableHead>
            <TableHead>Previsto</TableHead><TableHead>Realizado</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {treinamentos.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.titulo}</TableCell>
                <TableCell className="text-xs">{item.qualidade_documentos?.codigo || "-"}</TableCell>
                <TableCell className="text-xs">{item.publico_alvo || "-"}</TableCell>
                <TableCell className="text-xs">{fmtDate(item.data_prevista)}</TableCell>
                <TableCell className="text-xs">{fmtDate(item.data_realizada)}</TableCell>
                <TableCell><Badge variant="outline">{item.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(item)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DataCard>
  );
}

function Indicadores({ documentos }: { documentos: DocumentoQualidade[] }) {
  const porTipo = TIPOS.map((tipo) => ({ tipo, total: documentos.filter((doc) => doc.tipo === tipo).length })).filter((item) => item.total > 0);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <DataCard>
        <div className="border-b p-4"><h2 className="text-sm font-semibold">Documentos por tipo</h2></div>
        <div className="grid gap-2 p-4">
          {porTipo.length === 0 ? <EmptyState label="Sem documentos para demonstrar" /> : porTipo.map((item) => (
            <div key={item.tipo} className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm">
              <span>{item.tipo}</span><Badge variant="outline">{item.total}</Badge>
            </div>
          ))}
        </div>
      </DataCard>
      <DataCard>
        <div className="border-b p-4"><h2 className="text-sm font-semibold">Fluxo sugerido</h2></div>
        <div className="grid gap-2 p-4 text-sm">
          {["Em elaboração", "Em revisão", "Aprovado", "Treinamento aplicado", "Revisão periódica", "Obsoleto / arquivo morto"].map((item, index) => (
            <div key={item} className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2">
              <Badge variant="outline">{index + 1}</Badge><span>{item}</span>
            </div>
          ))}
        </div>
      </DataCard>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof FileText }) {
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function fmtDate(value?: string | null) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "-";
}

function sanitize(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, typeof value === "string" ? value.trim() || null : value])
  );
}
