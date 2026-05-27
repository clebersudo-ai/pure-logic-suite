import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { RequireAuth } from "@/components/RequireAuth";
import {
  Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Plus, Trash2, FormField, EmptyState, PageHeader, DataCard,
} from "@/components/crud-ui";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  FileText, Upload, Download, Eye, History, Paperclip, Search,
  FileImage, FileSpreadsheet, FileType, File as FileIcon,
  RotateCw, ShieldCheck, AlertTriangle, AlertOctagon, Clock,
  Building2, Filter, X, CalendarClock, Pencil, Sparkles, Loader2,
  ScanLine, CheckCircle2, FileSearch,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { extractDocumentMetadata } from "@/lib/extract-document.functions";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/documentos")({
  component: () => <RequireAuth><AppLayout><DocumentosPage /></AppLayout></RequireAuth>,
});

const BUCKET = "documentos";
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.docx,.xlsx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const CATEGORIAS = ["Licença Ambiental", "Sanitária", "Bombeiros", "Fiscal", "Trabalhista", "Qualidade", "RH", "ANVISA", "IBAMA", "Outros"];
const ORGAOS = ["ANVISA", "IBAMA", "CETESB", "Vigilância Sanitária", "Corpo de Bombeiros", "Receita Federal", "Prefeitura", "Ministério do Trabalho", "Outros"];
const CRITICIDADES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
];

type Documento = {
  id: string; nome: string; descricao: string | null; categoria: string | null;
  status: string; versao_atual: number; created_at: string; updated_at: string;
  orgao_emissor: string | null; numero_documento: string | null;
  empresa: string | null; unidade: string | null; responsavel: string | null;
  data_emissao: string | null; data_validade: string | null;
  renovacao_obrigatoria: boolean; criticidade: string; observacoes: string | null;
};
type Versao = {
  id: string; documento_id: string; versao: number; storage_path: string; nome_arquivo: string;
  mime_type: string | null; tamanho_bytes: number | null; observacoes: string | null;
  enviado_por_nome: string | null; created_at: string;
};
type Anexo = Omit<Versao, "versao">;

type Situacao = "ativo" | "atencao" | "critico" | "vencido" | "sem_validade";

function situacaoFrom(d: Documento): Situacao {
  if (d.status === "em_renovacao") return "atencao";
  if (!d.data_validade) return "sem_validade";
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const v = new Date(d.data_validade + "T00:00:00");
  const dias = Math.ceil((v.getTime() - hoje.getTime()) / 86400000);
  if (dias < 0) return "vencido";
  if (dias <= 15) return "critico";
  if (dias <= 45) return "atencao";
  return "ativo";
}

const SITUACAO_META: Record<Situacao, { label: string; cls: string; icon: typeof FileText }> = {
  ativo:        { label: "Ativo",        cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: ShieldCheck },
  atencao:      { label: "Atenção",      cls: "bg-amber-500/15 text-amber-600 border-amber-500/30",       icon: Clock },
  critico:      { label: "Crítico",      cls: "bg-orange-500/15 text-orange-600 border-orange-500/30",    icon: AlertTriangle },
  vencido:      { label: "Vencido",      cls: "bg-red-500/15 text-red-600 border-red-500/30",             icon: AlertOctagon },
  sem_validade: { label: "Sem validade", cls: "bg-muted text-muted-foreground border-border",             icon: FileText },
};

function diasAteVencer(d: Documento): number | null {
  if (!d.data_validade) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const v = new Date(d.data_validade + "T00:00:00");
  return Math.ceil((v.getTime() - hoje.getTime()) / 86400000);
}

function formatBytes(b: number | null) {
  if (!b) return "—";
  const u = ["B", "KB", "MB", "GB"]; let i = 0; let n = b;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}
function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return FileImage;
  if (["xlsx", "xls", "csv"].includes(ext)) return FileSpreadsheet;
  if (["docx", "doc"].includes(ext)) return FileType;
  if (ext === "pdf") return FileText;
  return FileIcon;
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

const CHART_COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

function DocumentosPage() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole("administrador") || hasRole("comercial");
  const [docs, setDocs] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fCategoria, setFCategoria] = useState("__all");
  const [fOrgao, setFOrgao] = useState("__all");
  const [fResponsavel, setFResponsavel] = useState("__all");
  const [fSituacao, setFSituacao] = useState<"__all" | Situacao>("__all");
  const [fVencimento, setFVencimento] = useState<"__all" | "30" | "60" | "90" | "vencido">("__all");
  const [selected, setSelected] = useState<Documento | null>(null);
  const [editing, setEditing] = useState<Documento | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("documentos").select("*").order("data_validade", { ascending: true, nullsFirst: false });
    setDocs((data as any as Documento[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const responsaveis = useMemo(
    () => Array.from(new Set(docs.map(d => d.responsavel).filter(Boolean) as string[])).sort(),
    [docs]
  );

  const enriched = useMemo(
    () => docs.map(d => ({ doc: d, situacao: situacaoFrom(d), dias: diasAteVencer(d) })),
    [docs]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(({ doc, situacao, dias }) => {
      if (q) {
        const hay = [doc.nome, doc.categoria, doc.orgao_emissor, doc.numero_documento, doc.empresa, doc.unidade, doc.responsavel, doc.descricao]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fCategoria !== "__all" && doc.categoria !== fCategoria) return false;
      if (fOrgao !== "__all" && doc.orgao_emissor !== fOrgao) return false;
      if (fResponsavel !== "__all" && doc.responsavel !== fResponsavel) return false;
      if (fSituacao !== "__all" && situacao !== fSituacao) return false;
      if (fVencimento !== "__all") {
        if (dias == null) return false;
        if (fVencimento === "vencido") { if (dias >= 0) return false; }
        else if (dias < 0 || dias > Number(fVencimento)) return false;
      }
      return true;
    });
  }, [enriched, search, fCategoria, fOrgao, fResponsavel, fSituacao, fVencimento]);

  const stats = useMemo(() => {
    const s = { total: docs.length, ativos: 0, atencao: 0, critico: 0, vencido: 0, em_renovacao: 0 };
    for (const { doc, situacao } of enriched) {
      if (doc.status === "em_renovacao") s.em_renovacao++;
      if (situacao === "ativo") s.ativos++;
      else if (situacao === "atencao") s.atencao++;
      else if (situacao === "critico") s.critico++;
      else if (situacao === "vencido") s.vencido++;
    }
    return s;
  }, [docs, enriched]);

  const porCategoria = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docs) m.set(d.categoria ?? "Sem categoria", (m.get(d.categoria ?? "Sem categoria") ?? 0) + 1);
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [docs]);

  const porOrgao = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docs) m.set(d.orgao_emissor ?? "Sem órgão", (m.get(d.orgao_emissor ?? "Sem órgão") ?? 0) + 1);
    return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [docs]);

  function limparFiltros() {
    setSearch(""); setFCategoria("__all"); setFOrgao("__all");
    setFResponsavel("__all"); setFSituacao("__all"); setFVencimento("__all");
  }
  const hasFilter = search || [fCategoria, fOrgao, fResponsavel, fSituacao, fVencimento].some(v => v !== "__all");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controle Regulatório"
        subtitle="Gestão documental · licenças, certificações e validades"
        action={canEdit && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Novo documento
          </Button>
        )}
      />

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={ShieldCheck} label="Ativos" value={stats.ativos} tone="emerald" />
        <KpiCard icon={Clock} label="Atenção (45d)" value={stats.atencao} tone="amber" />
        <KpiCard icon={AlertTriangle} label="Crítico (15d)" value={stats.critico} tone="orange" />
        <KpiCard icon={AlertOctagon} label="Vencidos" value={stats.vencido} tone="red" />
        <KpiCard icon={RotateCw} label="Em renovação" value={stats.em_renovacao} tone="blue" />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DataCard>
          <div className="border-b p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Documentos por categoria</h3>
          </div>
          <div className="h-64 p-4">
            {porCategoria.length === 0 ? <EmptyState label="Sem dados" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porCategoria} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={2}>
                    {porCategoria.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </DataCard>
        <DataCard>
          <div className="border-b p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Documentos por órgão emissor</h3>
          </div>
          <div className="h-64 p-4">
            {porOrgao.length === 0 ? <EmptyState label="Sem dados" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porOrgao} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </DataCard>
      </div>

      {/* Tabela com filtros */}
      <DataCard>
        <div className="space-y-3 border-b p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Busca inteligente: nome, número, órgão, empresa, responsável…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={load}><RotateCw className="h-3.5 w-3.5" /> Atualizar</Button>
            {hasFilter && (
              <Button variant="ghost" size="sm" onClick={limparFiltros}><X className="h-3.5 w-3.5" /> Limpar</Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterPill icon={Filter} label="Categoria" value={fCategoria} setValue={setFCategoria} options={CATEGORIAS} />
            <FilterPill icon={Building2} label="Órgão" value={fOrgao} setValue={setFOrgao} options={ORGAOS} />
            <FilterPill label="Responsável" value={fResponsavel} setValue={setFResponsavel} options={responsaveis} />
            <FilterPill label="Status" value={fSituacao} setValue={(v) => setFSituacao(v as any)} options={[
              { value: "ativo", label: "Ativo" }, { value: "atencao", label: "Atenção" },
              { value: "critico", label: "Crítico" }, { value: "vencido", label: "Vencido" },
              { value: "sem_validade", label: "Sem validade" },
            ]} />
            <FilterPill icon={CalendarClock} label="Vencimento" value={fVencimento} setValue={(v) => setFVencimento(v as any)} options={[
              { value: "vencido", label: "Já vencidos" },
              { value: "30", label: "Em 30 dias" },
              { value: "60", label: "Em 60 dias" },
              { value: "90", label: "Em 90 dias" },
            ]} />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Categoria / Órgão</TableHead>
              <TableHead>Empresa / Unidade</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7}><EmptyState label="Carregando…" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7}><EmptyState label="Nenhum documento encontrado" /></TableCell></TableRow>
            ) : filtered.map(({ doc, situacao, dias }) => {
              const meta = SITUACAO_META[situacao];
              const Icon = meta.icon;
              return (
                <TableRow key={doc.id} className="cursor-pointer" onClick={() => setSelected(doc)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">{doc.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {doc.numero_documento ? `Nº ${doc.numero_documento}` : "Sem número"} · v{doc.versao_atual}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{doc.categoria ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{doc.orgao_emissor ?? "—"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{doc.empresa ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{doc.unidade ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-sm">{doc.responsavel ?? "—"}</TableCell>
                  <TableCell>
                    <div className="text-sm">{fmtDate(doc.data_validade)}</div>
                    {dias != null && (
                      <div className="text-xs text-muted-foreground">
                        {dias < 0 ? `${Math.abs(dias)}d em atraso` : `${dias}d restantes`}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1 ${meta.cls}`}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canEdit && (
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(doc); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(doc); }}>
                        <Eye className="h-4 w-4" /> Abrir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataCard>

      {formOpen && (
        <DocumentoForm
          open={formOpen}
          onOpenChange={setFormOpen}
          documento={editing}
          userId={user?.id ?? null}
          onSaved={async () => { setFormOpen(false); setEditing(null); await load(); }}
        />
      )}

      {selected && (
        <DocumentoDrawer
          documento={selected}
          canEdit={canEdit}
          onClose={() => setSelected(null)}
          onChanged={async () => { await load(); }}
        />
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: {
  icon: typeof FileText; label: string; value: number;
  tone: "emerald" | "amber" | "orange" | "red" | "blue";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600 bg-emerald-500/10",
    amber: "text-amber-600 bg-amber-500/10",
    orange: "text-orange-600 bg-orange-500/10",
    red: "text-red-600 bg-red-500/10",
    blue: "text-blue-600 bg-blue-500/10",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function FilterPill({ icon: Icon, label, value, setValue, options }: {
  icon?: typeof Filter; label: string; value: string; setValue: (v: string) => void;
  options: Array<string | { value: string; label: string }>;
}) {
  const opts = options.map(o => typeof o === "string" ? { value: o, label: o } : o);
  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger className="h-9 w-auto min-w-[150px] gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all">{label}: todos</SelectItem>
        {opts.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function DocumentoForm({ open, onOpenChange, documento, userId, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  documento: Documento | null; userId: string | null; onSaved: () => Promise<void>;
}) {
  const isEdit = !!documento;
  const [f, setF] = useState({
    nome: documento?.nome ?? "",
    categoria: documento?.categoria ?? "",
    orgao_emissor: documento?.orgao_emissor ?? "",
    numero_documento: documento?.numero_documento ?? "",
    empresa: documento?.empresa ?? "",
    unidade: documento?.unidade ?? "",
    responsavel: documento?.responsavel ?? "",
    data_emissao: documento?.data_emissao ?? "",
    data_validade: documento?.data_validade ?? "",
    renovacao_obrigatoria: documento?.renovacao_obrigatoria ?? false,
    criticidade: documento?.criticidade ?? "media",
    status: documento?.status ?? "ativo",
    observacoes: documento?.observacoes ?? "",
    descricao: documento?.descricao ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiPreview, setAiPreview] = useState<{ kind: "pdf" | "image"; url: string } | null>(null);
  const [aiFilled, setAiFilled] = useState<string[]>([]);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const extract = useServerFn(extractDocumentMetadata);

  function pickAiFile(file: File) {
    if (aiPreview) URL.revokeObjectURL(aiPreview.url);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImg = file.type.startsWith("image/");
    if (!isPdf && !isImg) { toast.error("Envie um PDF ou imagem para análise IA"); return; }
    setAiFile(file);
    setAiPreview({ kind: isPdf ? "pdf" : "image", url: URL.createObjectURL(file) });
    setAiFilled([]);
  }

  async function runAi() {
    if (!aiFile) { toast.error("Selecione um PDF ou imagem"); return; }
    setAiBusy(true);
    try {
      const buf = await aiFile.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
      }
      const base64 = btoa(bin);
      const mimeType = aiFile.type || (aiFile.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
      const result = await extract({ data: { base64, mimeType, fileName: aiFile.name } });
      const filled: string[] = [];
      setF(prev => {
        const next = { ...prev };
        const keys = ["nome", "numero_documento", "orgao_emissor", "categoria", "data_emissao", "data_validade", "empresa", "responsavel", "observacoes"] as const;
        for (const k of keys) {
          const v = (result as any)?.[k];
          if (v && String(v).trim()) {
            (next as any)[k] = String(v).trim();
            filled.push(k);
          }
        }
        return next;
      });
      setAiFilled(filled);
      if (filled.length === 0) toast.warning("Nenhum campo identificado. Preencha manualmente.");
      else toast.success(`IA preencheu ${filled.length} campo(s). Revise antes de salvar.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha na análise IA");
    } finally {
      setAiBusy(false);
    }
  }

  async function save() {
    if (!f.nome.trim()) { toast.error("Informe o nome do documento"); return; }
    setSaving(true);
    const payload: any = {
      nome: f.nome,
      categoria: f.categoria || null,
      orgao_emissor: f.orgao_emissor || null,
      numero_documento: f.numero_documento || null,
      empresa: f.empresa || null,
      unidade: f.unidade || null,
      responsavel: f.responsavel || null,
      data_emissao: f.data_emissao || null,
      data_validade: f.data_validade || null,
      renovacao_obrigatoria: f.renovacao_obrigatoria,
      criticidade: f.criticidade,
      status: f.status,
      observacoes: f.observacoes || null,
      descricao: f.descricao || null,
    };
    let error;
    if (isEdit && documento) {
      ({ error } = await supabase.from("documentos").update(payload).eq("id", documento.id));
    } else {
      payload.criado_por = userId;
      payload.versao_atual = 0;
      ({ error } = await supabase.from("documentos").insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? "Documento atualizado" : "Documento criado");
    await onSaved();
  }

  const aiCls = (k: string) => aiFilled.includes(k) ? "ring-1 ring-primary/50 bg-primary/5" : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar documento" : "Novo documento regulatório"}</DialogTitle>
        </DialogHeader>

        <div className="mb-4 rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <div className="flex-1">
              <div className="text-sm font-semibold">Análise inteligente de documento</div>
              <div className="text-xs text-muted-foreground">Envie um PDF ou imagem (ANVISA, CRQ, CETESB, Bombeiros, Polícia, Exército, VISA, Prefeitura, Contrato Social…) e a IA preencherá o cadastro automaticamente.</div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div
              onClick={() => aiInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) pickAiFile(f); }}
              className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/30 p-4 text-center hover:bg-muted/50"
            >
              <input ref={aiInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickAiFile(f); e.currentTarget.value = ""; }} />
              {aiFile ? (
                <>
                  <FileText className="mb-2 size-6 text-primary" />
                  <div className="truncate text-sm font-medium">{aiFile.name}</div>
                  <div className="text-xs text-muted-foreground">{(aiFile.size / 1024).toFixed(0)} KB · clique para trocar</div>
                </>
              ) : (
                <>
                  <Upload className="mb-2 size-6 text-muted-foreground" />
                  <div className="text-sm font-medium">Arraste ou clique para enviar</div>
                  <div className="text-xs text-muted-foreground">PDF, JPG ou PNG</div>
                </>
              )}
            </div>
            <div className="overflow-hidden rounded-md border bg-background">
              {aiPreview ? (
                aiPreview.kind === "pdf" ? (
                  <iframe src={aiPreview.url} className="h-[160px] w-full" title="Pré-visualização" />
                ) : (
                  <img src={aiPreview.url} alt="Pré-visualização" className="h-[160px] w-full object-contain" />
                )
              ) : (
                <div className="flex h-[160px] items-center justify-center text-xs text-muted-foreground">Pré-visualização do documento</div>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {aiFilled.length > 0 && <span className="text-primary">✓ {aiFilled.length} campo(s) preenchidos pela IA — revise antes de salvar.</span>}
            </div>
            <Button type="button" size="sm" onClick={runAi} disabled={!aiFile || aiBusy}>
              {aiBusy ? <><Loader2 className="size-4 animate-spin" /> Analisando…</> : <><Sparkles className="size-4" /> Extrair com IA</>}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField label="Nome do documento *">
              <Input className={aiCls("nome")} value={f.nome} onChange={(e) => setF(s => ({ ...s, nome: e.target.value }))} placeholder="Ex.: Licença de Operação 2026" />
            </FormField>
          </div>
          <FormField label="Categoria">
            <div className={aiCls("categoria") + " rounded-md"}>
              <SimpleCombo value={f.categoria} setValue={(v) => setF(s => ({ ...s, categoria: v }))} options={CATEGORIAS} placeholder="Selecione…" />
            </div>
          </FormField>
          <FormField label="Órgão emissor">
            <div className={aiCls("orgao_emissor") + " rounded-md"}>
              <SimpleCombo value={f.orgao_emissor} setValue={(v) => setF(s => ({ ...s, orgao_emissor: v }))} options={ORGAOS} placeholder="Selecione…" />
            </div>
          </FormField>
          <FormField label="Número do documento">
            <Input className={aiCls("numero_documento")} value={f.numero_documento} onChange={(e) => setF(s => ({ ...s, numero_documento: e.target.value }))} />
          </FormField>
          <FormField label="Responsável">
            <Input className={aiCls("responsavel")} value={f.responsavel} onChange={(e) => setF(s => ({ ...s, responsavel: e.target.value }))} placeholder="Nome do responsável" />
          </FormField>
          <FormField label="Empresa vinculada">
            <Input className={aiCls("empresa")} value={f.empresa} onChange={(e) => setF(s => ({ ...s, empresa: e.target.value }))} />
          </FormField>
          <FormField label="Unidade">
            <Input value={f.unidade} onChange={(e) => setF(s => ({ ...s, unidade: e.target.value }))} placeholder="Ex.: Matriz, Filial SP" />
          </FormField>
          <FormField label="Data de emissão">
            <Input type="date" className={aiCls("data_emissao")} value={f.data_emissao} onChange={(e) => setF(s => ({ ...s, data_emissao: e.target.value }))} />
          </FormField>
          <FormField label="Validade">
            <Input type="date" className={aiCls("data_validade")} value={f.data_validade} onChange={(e) => setF(s => ({ ...s, data_validade: e.target.value }))} />
          </FormField>
          <FormField label="Criticidade">
            <Select value={f.criticidade} onValueChange={(v) => setF(s => ({ ...s, criticidade: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CRITICIDADES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={f.status} onValueChange={(v) => setF(s => ({ ...s, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="em_renovacao">Em renovação</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <div>
              <Label className="text-sm font-medium">Renovação obrigatória</Label>
              <p className="text-xs text-muted-foreground">Marque se este documento exige processo formal de renovação.</p>
            </div>
            <Switch checked={f.renovacao_obrigatoria} onCheckedChange={(v) => setF(s => ({ ...s, renovacao_obrigatoria: v }))} />
          </div>
          <div className="sm:col-span-2">
            <FormField label="Observações">
              <Textarea rows={3} className={aiCls("observacoes")} value={f.observacoes} onChange={(e) => setF(s => ({ ...s, observacoes: e.target.value }))} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{isEdit ? "Salvar alterações" : "Criar documento"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SimpleCombo({ value, setValue, options, placeholder }: {
  value: string; setValue: (v: string) => void; options: string[]; placeholder?: string;
}) {
  const inList = !value || options.includes(value);
  return (
    <div className="space-y-1">
      <Select value={inList ? (value || "__none") : "__custom"} onValueChange={(v) => setValue(v === "__none" || v === "__custom" ? "" : v)}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">— Nenhum —</SelectItem>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          <SelectItem value="__custom">Outro (digitar)</SelectItem>
        </SelectContent>
      </Select>
      {(!inList || value === "") && (
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Digite um valor personalizado" />
      )}
    </div>
  );
}

function DocumentoDrawer({ documento, canEdit, onClose, onChanged }: {
  documento: Documento; canEdit: boolean; onClose: () => void; onChanged: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [doc, setDoc] = useState(documento);
  const [versoes, setVersoes] = useState<Versao[]>([]);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [busy, setBusy] = useState(false);
  const versionInputRef = useRef<HTMLInputElement>(null);
  const anexoInputRef = useRef<HTMLInputElement>(null);
  const [obs, setObs] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<{ kind: "pdf" | "image"; url: string; name: string } | null>(null);

  useEffect(() => { setDoc(documento); }, [documento]);

  async function loadAll() {
    const [v, a, d] = await Promise.all([
      supabase.from("documento_versoes").select("*").eq("documento_id", doc.id).order("versao", { ascending: false }),
      supabase.from("documento_anexos").select("*").eq("documento_id", doc.id).order("created_at", { ascending: false }),
      supabase.from("documentos").select("*").eq("id", doc.id).single(),
    ]);
    setVersoes((v.data as Versao[]) ?? []);
    setAnexos((a.data as Anexo[]) ?? []);
    if (d.data) setDoc(d.data as any as Documento);
  }
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [doc.id]);

  async function userName() {
    if (!user) return "Sistema";
    const { data } = await supabase.from("profiles").select("nome").eq("id", user.id).single();
    return data?.nome ?? user.email ?? "Usuário";
  }

  async function uploadFiles(files: FileList | File[] | null, kind: "versao" | "anexo") {
    if (!files || (files as any).length === 0) return;
    const arr = Array.from(files as any) as File[];
    setBusy(true);
    try {
      const nome = await userName();
      let novaVersao = doc.versao_atual ?? 0;
      for (const file of arr) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${doc.id}/${kind}/${Date.now()}_${safe}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) throw up.error;
        if (kind === "versao") {
          novaVersao += 1;
          const ins = await supabase.from("documento_versoes").insert({
            documento_id: doc.id, versao: novaVersao, storage_path: path, nome_arquivo: file.name,
            mime_type: file.type, tamanho_bytes: file.size, observacoes: obs || null,
            enviado_por: user?.id, enviado_por_nome: nome,
          });
          if (ins.error) throw ins.error;
        } else {
          const ins = await supabase.from("documento_anexos").insert({
            documento_id: doc.id, storage_path: path, nome_arquivo: file.name,
            mime_type: file.type, tamanho_bytes: file.size, observacoes: obs || null,
            enviado_por: user?.id, enviado_por_nome: nome,
          });
          if (ins.error) throw ins.error;
        }
      }
      if (kind === "versao" && novaVersao !== (doc.versao_atual ?? 0)) {
        await supabase.from("documentos").update({ versao_atual: novaVersao }).eq("id", doc.id);
      }
      toast.success(kind === "versao"
        ? `${arr.length} nova(s) versão(ões) registrada(s)`
        : `${arr.length} anexo(s) enviado(s)`);
      setObs("");
      await loadAll();
      await onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (versionInputRef.current) versionInputRef.current.value = "";
      if (anexoInputRef.current) anexoInputRef.current.value = "";
    }
  }

  async function signedUrl(path: string, download = false) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10, download ? { download: true } : undefined);
    if (error) { toast.error(error.message); return null; }
    return data.signedUrl;
  }

  async function openFile(path: string, download = false) {
    const url = await signedUrl(path, download);
    if (!url) return;
    if (download) {
      const a = document.createElement("a"); a.href = url; a.download = ""; a.click();
      return;
    }
    window.open(url, "_blank");
  }

  async function previewFile(it: { storage_path: string; nome_arquivo: string }) {
    const ext = it.nome_arquivo.split(".").pop()?.toLowerCase() ?? "";
    const isPdf = ext === "pdf";
    const isImg = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
    if (!isPdf && !isImg) { return openFile(it.storage_path); }
    const url = await signedUrl(it.storage_path);
    if (!url) return;
    setPreview({ kind: isPdf ? "pdf" : "image", url, name: it.nome_arquivo });
  }

  async function removerAnexo(a: Anexo) {
    if (!confirm("Remover este anexo? O arquivo será excluído do repositório.")) return;
    await supabase.storage.from(BUCKET).remove([a.storage_path]);
    await supabase.from("documento_anexos").delete().eq("id", a.id);
    toast.success("Anexo removido");
    await loadAll();
  }

  function onDrop(e: React.DragEvent, kind: "versao" | "anexo") {
    e.preventDefault(); setDragOver(false);
    if (!canEdit) return;
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files, kind);
  }

  const versaoAtual = versoes.find(v => v.versao === doc.versao_atual) ?? versoes[0];
  const situacao = situacaoFrom(doc);
  const meta = SITUACAO_META[situacao];
  const totalBytes = [...versoes, ...anexos].reduce((s, x) => s + (x.tamanho_bytes ?? 0), 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0">
        <div className="border-b bg-muted/40 p-5">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-lg">{doc.nome}</span>
              <Badge variant="outline" className="font-mono">v{doc.versao_atual}</Badge>
              <Badge variant="outline" className={`gap-1 ${meta.cls}`}>{meta.label}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
            <Meta label="Categoria" value={doc.categoria} />
            <Meta label="Órgão emissor" value={doc.orgao_emissor} />
            <Meta label="Nº documento" value={doc.numero_documento} />
            <Meta label="Empresa" value={doc.empresa} />
            <Meta label="Unidade" value={doc.unidade} />
            <Meta label="Responsável" value={doc.responsavel} />
            <Meta label="Emissão" value={fmtDate(doc.data_emissao)} />
            <Meta label="Validade" value={fmtDate(doc.data_validade)} />
            <Meta label="Criticidade" value={CRITICIDADES.find(c => c.value === doc.criticidade)?.label ?? doc.criticidade} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={!versaoAtual} onClick={() => versaoAtual && previewFile(versaoAtual)}>
              <Eye className="h-4 w-4" /> Pré-visualizar
            </Button>
            <Button size="sm" variant="outline" disabled={!versaoAtual} onClick={() => versaoAtual && openFile(versaoAtual.storage_path, true)}>
              <Download className="h-4 w-4" /> Baixar atual
            </Button>
            {canEdit && (
              <>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => versionInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Nova versão
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => anexoInputRef.current?.click()}>
                  <Paperclip className="h-4 w-4" /> Adicionar anexos
                </Button>
              </>
            )}
            <input ref={versionInputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => uploadFiles(e.target.files, "versao")} />
            <input ref={anexoInputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => uploadFiles(e.target.files, "anexo")} />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{versoes.length} versões</span><span>·</span>
            <span>{anexos.length} anexos</span><span>·</span>
            <span>{formatBytes(totalBytes)}</span>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {canEdit && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => onDrop(e, "anexo")}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
              }`}
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div className="text-sm font-medium">Arraste arquivos aqui para anexar</div>
              <div className="text-xs text-muted-foreground">PDF, JPG, PNG, DOCX, XLSX · upload múltiplo</div>
              <Input
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Observação opcional para os próximos uploads"
                className="mt-2 max-w-md"
              />
            </div>
          )}

          <Tabs defaultValue="anexos">
            <TabsList>
              <TabsTrigger value="anexos"><Paperclip className="h-3.5 w-3.5" /> Anexos ({anexos.length})</TabsTrigger>
              <TabsTrigger value="versoes"><History className="h-3.5 w-3.5" /> Histórico de versões ({versoes.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="anexos">
              <FileList
                items={anexos}
                currentVersion={null}
                onPreview={previewFile}
                onDownload={(p) => openFile(p, true)}
                onRemove={canEdit ? removerAnexo : undefined}
                emptyLabel="Nenhum anexo. Arraste arquivos ou clique em Adicionar anexos."
              />
            </TabsContent>
            <TabsContent value="versoes">
              <FileList
                items={versoes.map(v => ({ ...v, versaoLabel: v.versao }))}
                currentVersion={doc.versao_atual}
                onPreview={previewFile}
                onDownload={(p) => openFile(p, true)}
                emptyLabel="Nenhuma versão registrada. Clique em Nova versão para iniciar."
                showVersion
              />
            </TabsContent>
          </Tabs>
        </div>

        {preview && (
          <Dialog open onOpenChange={(o) => !o && setPreview(null)}>
            <DialogContent className="max-w-5xl p-0">
              <DialogHeader className="border-b p-4">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Eye className="h-4 w-4" /> {preview.name}
                </DialogTitle>
              </DialogHeader>
              <div className="bg-muted/30">
                {preview.kind === "pdf" ? (
                  <iframe src={preview.url} title={preview.name} className="h-[75vh] w-full bg-white" />
                ) : (
                  <div className="flex max-h-[75vh] items-center justify-center overflow-auto p-4">
                    <img src={preview.url} alt={preview.name} className="max-h-[70vh] max-w-full object-contain" />
                  </div>
                )}
              </div>
              <DialogFooter className="p-3">
                <Button variant="outline" onClick={() => window.open(preview.url, "_blank")}>
                  <Eye className="h-4 w-4" /> Nova aba
                </Button>
                <Button onClick={() => { const a = document.createElement("a"); a.href = preview.url; a.download = preview.name; a.click(); }}>
                  <Download className="h-4 w-4" /> Baixar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Meta({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="truncate font-medium">{value ?? "—"}</div>
    </div>
  );
}

function fileTypeLabel(name: string) {
  const ext = name.split(".").pop()?.toUpperCase() ?? "ARQ";
  if (["JPG", "JPEG", "PNG", "GIF", "WEBP"].includes(ext)) return "IMG";
  return ext;
}

function FileList({ items, onPreview, onDownload, onRemove, emptyLabel, showVersion, currentVersion }: {
  items: Array<Anexo & { versaoLabel?: number }>;
  onPreview: (it: { storage_path: string; nome_arquivo: string }) => void;
  onDownload: (path: string) => void;
  onRemove?: (a: Anexo) => void;
  emptyLabel: string;
  showVersion?: boolean;
  currentVersion?: number | null;
}) {
  if (items.length === 0) return <EmptyState label={emptyLabel} />;
  return (
    <div className="divide-y overflow-hidden rounded-md border bg-card">
      {items.map((it) => {
        const Icon = fileIcon(it.nome_arquivo);
        const ext = fileTypeLabel(it.nome_arquivo);
        const isCurrent = showVersion && it.versaoLabel != null && it.versaoLabel === currentVersion;
        return (
          <div key={it.id} className="flex flex-wrap items-center gap-3 p-3 transition-colors hover:bg-muted/40">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
              <span className="absolute -bottom-1 -right-1 rounded bg-background px-1 text-[9px] font-bold tracking-wide text-muted-foreground ring-1 ring-border">
                {ext}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{it.nome_arquivo}</span>
                {showVersion && it.versaoLabel != null && (
                  <Badge variant="outline" className="font-mono">v{it.versaoLabel}</Badge>
                )}
                {isCurrent && (
                  <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">Versão atual</Badge>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>{new Date(it.created_at).toLocaleString("pt-BR")}</span>
                <span>· {it.enviado_por_nome ?? "—"}</span>
                <span>· {formatBytes(it.tamanho_bytes)}</span>
              </div>
              {it.observacoes && (
                <div className="mt-1 rounded bg-muted/60 px-2 py-1 text-xs italic text-muted-foreground">
                  "{it.observacoes}"
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => onPreview(it)} title="Pré-visualizar">
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDownload(it.storage_path)} title="Baixar">
                <Download className="h-4 w-4" />
              </Button>
              {onRemove && (
                <Button size="sm" variant="ghost" onClick={() => onRemove(it)} title="Remover">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
