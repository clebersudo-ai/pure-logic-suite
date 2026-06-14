import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Factory, AlertTriangle, ClipboardList, DollarSign, TrendingUp, TrendingDown, Activity, ShieldAlert, ShieldCheck, ShieldQuestion, FileWarning, CalendarClock, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/")({ component: () => (<RequireAuth><AppLayout><Dashboard /></AppLayout></RequireAuth>) });

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const [prodToday, prodYest, lowStock, openOrders, allOrders] = await Promise.all([
        supabase.from("ordens_producao").select("quantidade_litros, custo_total").eq("data_producao", today),
        supabase.from("ordens_producao").select("quantidade_litros").eq("data_producao", yesterday),
        supabase.from("materias_primas").select("id, nome, estoque_atual, estoque_minimo, unidade"),
        supabase.from("ordens_producao").select("id").in("status", ["aberta", "em_producao"]),
        supabase.from("ordens_producao").select("data_producao, quantidade_litros, custo_total, status").order("data_producao", { ascending: false }).limit(60),
      ]);
      const lowList = (lowStock.data ?? []).filter((m) => Number(m.estoque_atual) <= Number(m.estoque_minimo));
      const totalLitros = (prodToday.data ?? []).reduce((a, b) => a + Number(b.quantidade_litros || 0), 0);
      const totalLitrosYest = (prodYest.data ?? []).reduce((a, b) => a + Number(b.quantidade_litros || 0), 0);
      const delta = totalLitrosYest > 0 ? ((totalLitros - totalLitrosYest) / totalLitrosYest) * 100 : 0;
      const totalCusto = (prodToday.data ?? []).reduce((a, b) => a + Number(b.custo_total || 0), 0);
      const custoMedio = totalLitros > 0 ? totalCusto / totalLitros : 0;
      const byDay = new Map<string, { litros: number; custo: number }>();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        byDay.set(d.toISOString().slice(0, 10), { litros: 0, custo: 0 });
      }
      (allOrders.data ?? []).forEach((o) => {
        const k = o.data_producao as string;
        if (byDay.has(k)) {
          const cur = byDay.get(k)!;
          cur.litros += Number(o.quantidade_litros || 0);
          cur.custo += Number(o.custo_total || 0);
        }
      });
      const chart = Array.from(byDay).map(([d, v]) => ({
        dia: d.slice(8, 10) + "/" + d.slice(5, 7), litros: Math.round(v.litros), custo: Math.round(v.custo),
      }));
      const statusCount = [
        { name: "Aberta", key: "aberta" },
        { name: "Em produção", key: "em_producao" },
        { name: "Finalizada", key: "finalizada" },
        { name: "Cancelada", key: "cancelada" },
      ].map((s) => ({ name: s.name, value: (allOrders.data ?? []).filter((o) => o.status === s.key).length }));
      return { totalLitros, custoMedio, openCount: (openOrders.data ?? []).length, lowList, chart, statusCount, delta };
    },
  });

  const { data: reg } = useQuery({
    queryKey: ["dashboard-regulatorio"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documentos")
        .select("id, nome, categoria, orgao_emissor, responsavel, criticidade, data_validade, renovacao_obrigatoria, status")
        .order("data_validade", { ascending: true, nullsFirst: false });
      const docs = data ?? [];
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const days = (d: string | null) => {
        if (!d) return Infinity;
        const dt = new Date(d); dt.setHours(0, 0, 0, 0);
        return Math.round((dt.getTime() - today.getTime()) / 86400000);
      };
      const enriched = docs.map((d) => {
        const diff = days(d.data_validade as string | null);
        let bucket: "vencido" | "critico" | "atencao" | "ativo" | "sem_validade" = "sem_validade";
        if (d.data_validade) {
          if (diff < 0) bucket = "vencido";
          else if (diff <= 30) bucket = "critico";
          else if (diff <= 90) bucket = "atencao";
          else bucket = "ativo";
        }
        return { ...d, _dias: diff, _bucket: bucket };
      });
      const vencidos = enriched.filter((d) => d._bucket === "vencido");
      const em30 = enriched.filter((d) => d._bucket === "critico");
      const em90 = enriched.filter((d) => d._bucket === "atencao");
      const renovacaoPendente = enriched.filter(
        (d) => d.renovacao_obrigatoria && (d._bucket === "vencido" || d._bucket === "critico"),
      );
      const prioridades = enriched
        .filter((d) => d._bucket === "vencido" || d._bucket === "critico" || d._bucket === "atencao")
        .sort((a, b) => a._dias - b._dias)
        .slice(0, 8);
      return { vencidos, em30, em90, renovacaoPendente, prioridades, total: enriched.length };
    },
  });


  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] space-y-6 bg-[#39ff14] p-4 text-slate-950 lg:-m-6 lg:p-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Painel Operacional</div>
        <h1 className="mt-1 text-2xl font-bold">Visão Geral da Produção</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Factory className="h-5 w-5" />}
          label="Produção hoje"
          value={`${(stats?.totalLitros ?? 0).toFixed(0)} L`}
          delta={stats?.delta}
          accent="primary"
          loading={isLoading}
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Estoque baixo"
          value={String(stats?.lowList.length ?? 0)}
          hint="itens abaixo do mínimo"
          accent={stats && stats.lowList.length > 0 ? "warning" : "muted"}
          loading={isLoading}
        />
        <KpiCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="Ordens em aberto"
          value={String(stats?.openCount ?? 0)}
          hint="aguardando finalização"
          accent="info"
          loading={isLoading}
        />
        <KpiCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Custo médio / L"
          value={`R$ ${(stats?.custoMedio ?? 0).toFixed(2)}`}
          hint="referência do dia"
          accent="success"
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Produção — últimos 14 dias</h3>
              <p className="text-xs text-muted-foreground">Volume produzido (litros)</p>
            </div>
            <Badge variant="outline" className="gap-1 text-xs"><Activity className="h-3 w-3" />tempo real</Badge>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats?.chart ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gProd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)", color: "var(--popover-foreground)",
                  border: "1px solid var(--border)", borderRadius: 8, fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="litros" stroke="var(--primary)" strokeWidth={2} fill="url(#gProd)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold">Status das ordens</h3>
          <p className="mb-2 text-xs text-muted-foreground">Distribuição atual</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={stats?.statusCount ?? []} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {(stats?.statusCount ?? []).map((_, i) => (
                  <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} stroke="var(--card)" strokeWidth={2} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-1 text-sm font-semibold">Custo de produção (14 dias)</h3>
          <p className="mb-3 text-xs text-muted-foreground">R$ totais por dia</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.chart ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="custo" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-warning" /> Alertas de estoque mínimo
          </h3>
          {!stats || stats.lowList.length === 0 ? (
            <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              Todos os insumos acima do mínimo
            </div>
          ) : (
            <ul className="divide-y">
              {stats.lowList.slice(0, 8).map((m) => {
                const pct = Number(m.estoque_minimo) > 0
                  ? Math.min(100, (Number(m.estoque_atual) / Number(m.estoque_minimo)) * 100)
                  : 0;
                return (
                  <li key={m.id} className="py-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{m.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {Number(m.estoque_atual).toFixed(2)} / {Number(m.estoque_minimo).toFixed(2)} {m.unidade}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct < 50 ? "var(--destructive)" : "var(--warning)" }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <RegulatorioPanel reg={reg} />
    </div>
  );
}

function RegulatorioPanel({ reg }: { reg: any }) {
  const vencidos = reg?.vencidos ?? [];
  const em30 = reg?.em30 ?? [];
  const em90 = reg?.em90 ?? [];
  const renov = reg?.renovacaoPendente ?? [];
  const prioridades = reg?.prioridades ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Conformidade Regulatória
          </div>
          <h2 className="mt-1 text-xl font-bold">Alertas e Prioridades</h2>
        </div>
        <Link to="/documentos" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Ver gestão documental <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AlertCard tone="destructive" icon={<ShieldAlert className="h-5 w-5" />} label="Vencidos" value={vencidos.length} hint="ação imediata" />
        <AlertCard tone="danger" icon={<FileWarning className="h-5 w-5" />} label="Vencem em 30 dias" value={em30.length} hint="prioridade alta" />
        <AlertCard tone="warning" icon={<CalendarClock className="h-5 w-5" />} label="Vencem em 90 dias" value={em90.length} hint="planejar renovação" />
        <AlertCard tone="info" icon={<ShieldQuestion className="h-5 w-5" />} label="Renovação pendente" value={renov.length} hint="obrigatórias em risco" />
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" /> Painel de prioridades regulatórias
            </h3>
            <p className="text-xs text-muted-foreground">Documentos ordenados por proximidade do vencimento</p>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {prioridades.length} {prioridades.length === 1 ? "item" : "itens"}
          </Badge>
        </div>

        {prioridades.length === 0 ? (
          <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
            <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-success" />
            Nenhum documento em janela crítica. Conformidade em dia.
          </div>
        ) : (
          <ul className="divide-y">
            {prioridades.map((d: any) => {
              const tone = d._bucket === "vencido" ? "destructive" : d._bucket === "critico" ? "danger" : "warning";
              const label = d._bucket === "vencido"
                ? `Vencido há ${Math.abs(d._dias)}d`
                : `${d._dias}d restantes`;
              const dot = tone === "destructive" ? "bg-destructive" : tone === "danger" ? "bg-destructive/70" : "bg-warning";
              return (
                <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot} ring-2 ring-background`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{d.nome}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {[d.categoria, d.orgao_emissor, d.responsavel].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={
                        tone === "destructive"
                          ? "bg-destructive text-destructive-foreground"
                          : tone === "danger"
                          ? "bg-destructive/15 text-destructive border border-destructive/30"
                          : "bg-warning/20 text-warning-foreground border border-warning/40"
                      }
                    >
                      {label}
                    </Badge>
                    {d.renovacao_obrigatoria && (
                      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        renovação obrigatória
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function AlertCard({
  tone, icon, label, value, hint,
}: {
  tone: "destructive" | "danger" | "warning" | "info" | "success";
  icon: React.ReactNode; label: string; value: number; hint?: string;
}) {
  const toneMap: Record<string, { card: string; iconBox: string; pulse: string }> = {
    destructive: { card: "border-destructive/40 bg-destructive/5", iconBox: "bg-destructive text-destructive-foreground border-destructive", pulse: "bg-destructive" },
    danger: { card: "border-destructive/30 bg-destructive/5", iconBox: "bg-destructive/15 text-destructive border-destructive/30", pulse: "bg-destructive/70" },
    warning: { card: "border-warning/40 bg-warning/10", iconBox: "bg-warning/20 text-warning-foreground border-warning/40", pulse: "bg-warning" },
    info: { card: "border-info/30 bg-info/5", iconBox: "bg-info/10 text-info border-info/20", pulse: "bg-info" },
    success: { card: "border-success/30 bg-success/5", iconBox: "bg-success/10 text-success border-success/20", pulse: "bg-success" },
  };
  const t = toneMap[tone];
  const isAlert = value > 0 && (tone === "destructive" || tone === "danger");
  return (
    <Card className={`relative overflow-hidden p-5 ${t.card}`}>
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${t.iconBox}`}>{icon}</div>
        {value > 0 && (
          <span className="relative flex h-2.5 w-2.5">
            {isAlert && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${t.pulse} opacity-60`} />}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${t.pulse}`} />
          </span>
        )}
      </div>
      <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}


function KpiCard({
  icon, label, value, delta, hint, accent = "primary", loading,
}: {
  icon: React.ReactNode; label: string; value: string; delta?: number; hint?: string;
  accent?: "primary" | "success" | "warning" | "info" | "muted"; loading?: boolean;
}) {
  const accentMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary border-primary/20",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/15 text-warning-foreground border-warning/30",
    info: "bg-info/10 text-info border-info/20",
    muted: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Card className="relative overflow-hidden p-5 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${accentMap[accent]}`}>
          {icon}
        </div>
        {typeof delta === "number" && Number.isFinite(delta) && delta !== 0 && (
          <Badge
            variant="outline"
            className={`gap-1 text-[10px] ${delta >= 0 ? "border-success/30 text-success" : "border-destructive/30 text-destructive"}`}
          >
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </Badge>
        )}
      </div>
      <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">
        {loading ? <span className="inline-block h-7 w-20 animate-pulse rounded bg-muted" /> : value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
