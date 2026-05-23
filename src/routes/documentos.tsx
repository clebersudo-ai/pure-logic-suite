import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Plus, Trash2, FormField, EmptyState,
  PageHeader, DataCard } from "@/components/crud-ui";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, Upload, Download, Eye, History, Paperclip, Search, FileImage, FileSpreadsheet,
  FileType, File as FileIcon, Layers, FolderOpen, RotateCw } from "lucide-react";

export const Route = createFileRoute("/documentos")({
  component: () => <RequireAuth><AppLayout><DocumentosPage /></AppLayout></RequireAuth>,
});

const BUCKET = "documentos";
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.docx,.xlsx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type Documento = {
  id: string; nome: string; descricao: string | null; categoria: string | null;
  status: string; versao_atual: number; created_at: string; updated_at: string;
};
type Versao = {
  id: string; documento_id: string; versao: number; storage_path: string; nome_arquivo: string;
  mime_type: string | null; tamanho_bytes: number | null; observacoes: string | null;
  enviado_por_nome: string | null; created_at: string;
};
type Anexo = Omit<Versao, "versao">;

function formatBytes(b: number | null) {
  if (!b) return "—";
  const u = ["B","KB","MB","GB"]; let i = 0; let n = b;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg","jpeg","png","gif","webp"].includes(ext)) return FileImage;
  if (["xlsx","xls","csv"].includes(ext)) return FileSpreadsheet;
  if (["docx","doc"].includes(ext)) return FileType;
  if (ext === "pdf") return FileText;
  return FileIcon;
}

function DocumentosPage() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole("administrador") || hasRole("comercial");
  const [docs, setDocs] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Documento | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "", categoria: "" });

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("documentos").select("*").order("updated_at", { ascending: false });
    setDocs((data as Documento[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(d =>
      d.nome.toLowerCase().includes(q) ||
      (d.categoria ?? "").toLowerCase().includes(q) ||
      (d.descricao ?? "").toLowerCase().includes(q));
  }, [docs, search]);

  async function createDoc() {
    if (!form.nome.trim()) { toast.error("Informe o nome do documento"); return; }
    const { data, error } = await supabase.from("documentos")
      .insert({ nome: form.nome, descricao: form.descricao || null, categoria: form.categoria || null, criado_por: user?.id, versao_atual: 0 })
      .select().single();
    if (error) { toast.error(error.message); return; }
    toast.success("Documento criado");
    setNewOpen(false);
    setForm({ nome: "", descricao: "", categoria: "" });
    await load();
    setSelected(data as Documento);
  }

  const stats = useMemo(() => ({
    total: docs.length,
    ativos: docs.filter(d => d.status === "ativo").length,
    categorias: new Set(docs.map(d => d.categoria).filter(Boolean)).size,
  }), [docs]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão Documental"
        subtitle="GED corporativo · controle de versões e anexos"
        action={canEdit && (
          <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> Novo documento</Button>
        )}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={FolderOpen} label="Documentos" value={stats.total} accent="text-primary" />
        <StatCard icon={Layers} label="Ativos" value={stats.ativos} accent="text-emerald-500" />
        <StatCard icon={FileText} label="Categorias" value={stats.categorias} accent="text-amber-500" />
      </div>

      <DataCard>
        <div className="flex items-center gap-3 border-b p-3">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar documento, categoria…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={load}><RotateCw className="h-3.5 w-3.5" /> Atualizar</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Versão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6}><EmptyState label="Carregando…" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6}><EmptyState label="Nenhum documento encontrado" /></TableCell></TableRow>
            ) : filtered.map(d => (
              <TableRow key={d.id} className="cursor-pointer" onClick={() => setSelected(d)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{d.nome}</div>
                      {d.descricao && <div className="text-xs text-muted-foreground line-clamp-1">{d.descricao}</div>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{d.categoria ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell><Badge variant="outline">v{d.versao_atual}</Badge></TableCell>
                <TableCell><Badge variant={d.status === "ativo" ? "default" : "secondary"}>{d.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(d.updated_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(d); }}>
                    <Eye className="h-4 w-4" /> Abrir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataCard>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo documento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FormField label="Nome">
              <Input value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex.: Manual de procedimentos" />
            </FormField>
            <FormField label="Categoria">
              <Input value={form.categoria} onChange={(e) => setForm(f => ({ ...f, categoria: e.target.value }))} placeholder="Ex.: Qualidade, RH, Fiscal" />
            </FormField>
            <FormField label="Descrição">
              <Textarea rows={3} value={form.descricao} onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button onClick={createDoc}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof FileText; label: string; value: number; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
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

  useEffect(() => { setDoc(documento); }, [documento]);

  async function loadAll() {
    const [v, a, d] = await Promise.all([
      supabase.from("documento_versoes").select("*").eq("documento_id", doc.id).order("versao", { ascending: false }),
      supabase.from("documento_anexos").select("*").eq("documento_id", doc.id).order("created_at", { ascending: false }),
      supabase.from("documentos").select("*").eq("id", doc.id).single(),
    ]);
    setVersoes((v.data as Versao[]) ?? []);
    setAnexos((a.data as Anexo[]) ?? []);
    if (d.data) setDoc(d.data as Documento);
  }
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [doc.id]);

  async function userName() {
    if (!user) return "Sistema";
    const { data } = await supabase.from("profiles").select("nome").eq("id", user.id).single();
    return data?.nome ?? user.email ?? "Usuário";
  }

  async function uploadFiles(files: FileList | null, kind: "versao" | "anexo") {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const nome = await userName();
      for (const file of Array.from(files)) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${doc.id}/${kind}/${Date.now()}_${safe}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) throw up.error;
        if (kind === "versao") {
          const novaVersao = (doc.versao_atual ?? 0) + 1;
          const ins = await supabase.from("documento_versoes").insert({
            documento_id: doc.id, versao: novaVersao, storage_path: path, nome_arquivo: file.name,
            mime_type: file.type, tamanho_bytes: file.size, observacoes: obs || null,
            enviado_por: user?.id, enviado_por_nome: nome,
          });
          if (ins.error) throw ins.error;
          await supabase.from("documentos").update({ versao_atual: novaVersao }).eq("id", doc.id);
        } else {
          const ins = await supabase.from("documento_anexos").insert({
            documento_id: doc.id, storage_path: path, nome_arquivo: file.name,
            mime_type: file.type, tamanho_bytes: file.size, observacoes: obs || null,
            enviado_por: user?.id, enviado_por_nome: nome,
          });
          if (ins.error) throw ins.error;
        }
      }
      toast.success(kind === "versao" ? "Nova versão registrada" : "Anexo enviado");
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

  async function openFile(path: string, download = false) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10, download ? { download: true } : undefined);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function removerAnexo(a: Anexo) {
    if (!confirm("Remover este anexo?")) return;
    await supabase.storage.from(BUCKET).remove([a.storage_path]);
    await supabase.from("documento_anexos").delete().eq("id", a.id);
    toast.success("Anexo removido");
    await loadAll();
  }

  const versaoAtual = versoes.find(v => v.versao === doc.versao_atual) ?? versoes[0];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {doc.nome}
            <Badge variant="outline" className="ml-2">v{doc.versao_atual}</Badge>
          </DialogTitle>
          {doc.descricao && <p className="text-sm text-muted-foreground">{doc.descricao}</p>}
        </DialogHeader>

        {/* Ações principais */}
        <div className="flex flex-wrap gap-2 border-y py-3">
          <Button size="sm" disabled={!versaoAtual} onClick={() => versaoAtual && openFile(versaoAtual.storage_path)}>
            <Eye className="h-4 w-4" /> Visualizar
          </Button>
          <Button size="sm" variant="outline" disabled={!versaoAtual} onClick={() => versaoAtual && openFile(versaoAtual.storage_path, true)}>
            <Download className="h-4 w-4" /> Baixar
          </Button>
          {canEdit && (
            <>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => versionInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Substituir versão
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => anexoInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" /> Novo anexo
              </Button>
            </>
          )}
          <input ref={versionInputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => uploadFiles(e.target.files, "versao")} />
          <input ref={anexoInputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => uploadFiles(e.target.files, "anexo")} />
        </div>

        {canEdit && (
          <FormField label="Observações (aplicadas ao próximo upload)">
            <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional · ex.: revisão de cláusula 3" />
          </FormField>
        )}

        <Tabs defaultValue="anexos">
          <TabsList>
            <TabsTrigger value="anexos"><Paperclip className="h-3.5 w-3.5" /> Anexos ({anexos.length})</TabsTrigger>
            <TabsTrigger value="versoes"><History className="h-3.5 w-3.5" /> Versões ({versoes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="anexos">
            <FileList items={anexos} onOpen={openFile} onRemove={canEdit ? removerAnexo : undefined} emptyLabel="Nenhum anexo. Use “Novo anexo” para adicionar arquivos." />
          </TabsContent>

          <TabsContent value="versoes">
            <FileList
              items={versoes.map(v => ({ ...v, versaoLabel: v.versao }))}
              onOpen={openFile}
              emptyLabel="Nenhuma versão enviada ainda. Use “Substituir versão” para registrar a primeira."
              showVersion
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function FileList({ items, onOpen, onRemove, emptyLabel, showVersion }: {
  items: Array<Anexo & { versaoLabel?: number }>;
  onOpen: (path: string, download?: boolean) => void;
  onRemove?: (a: Anexo) => void;
  emptyLabel: string;
  showVersion?: boolean;
}) {
  if (items.length === 0) return <EmptyState label={emptyLabel} />;
  return (
    <div className="divide-y rounded-md border">
      {items.map((it) => {
        const Icon = fileIcon(it.nome_arquivo);
        return (
          <div key={it.id} className="flex items-center gap-3 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{it.nome_arquivo}</span>
                {showVersion && it.versaoLabel != null && <Badge variant="outline">v{it.versaoLabel}</Badge>}
              </div>
              <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                <span>{new Date(it.created_at).toLocaleString("pt-BR")}</span>
                <span>{it.enviado_por_nome ?? "—"}</span>
                <span>{formatBytes(it.tamanho_bytes)}</span>
              </div>
              {it.observacoes && <div className="mt-1 text-xs text-muted-foreground italic">“{it.observacoes}”</div>}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => onOpen(it.storage_path)} title="Visualizar"><Eye className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => onOpen(it.storage_path, true)} title="Baixar"><Download className="h-4 w-4" /></Button>
              {onRemove && <Button size="sm" variant="ghost" onClick={() => onRemove(it)} title="Remover"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
