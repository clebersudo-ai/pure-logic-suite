import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Factory, AlertTriangle, ClipboardList, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/")({ component: () => (<RequireAuth><AppLayout><Dashboard /></AppLayout></RequireAuth>) });

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [prod, lowStock, openOrders, allOrders] = await Promise.all([
        supabase.from("ordens_producao").select("quantidade_litros, custo_total").eq("data_producao", today),
        supabase.from("materias_primas").select("id, nome, estoque_atual, estoque_minimo, unidade"),
        supabase.from("ordens_producao").select("id").in("status", ["aberta", "em_producao"]),
        supabase.from("ordens_producao").select("data_producao, quantidade_litros, custo_total, status").order("data_producao", { ascending: false }).limit(30),
      ]);
      const lowList = (lowStock.data ?? []).filter((m) => Number(m.estoque_atual) <= Number(m.estoque_minimo));
      const totalLitros = (prod.data ?? []).reduce((a, b) => a + Number(b.quantidade_litros || 0), 0);
      const totalCusto = (prod.data ?? []).reduce((a, b) => a + Number(b.custo_total || 0), 0);
      const custoMedio = totalLitros > 0 ? totalCusto / totalLitros : 0;
      // last 7 days chart
      const byDay = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        byDay.set(d.toISOString().slice(0, 10), 0);
      }
      (allOrders.data ?? []).forEach((o) => {
        if (byDay.has(o.data_producao)) byDay.set(o.data_producao, byDay.get(o.data_producao)! + Number(o.quantidade_litros || 0));
      });
      const chart = Array.from(byDay).map(([d, v]) => ({ dia: d.slice(5), litros: v }));
      const statusCount = ["aberta", "em_producao", "finalizada", "cancelada"].map((s) => ({
        name: s, value: (allOrders.data ?? []).filter((o) => o.status === s).length,
      }));
      return { totalLitros, custoMedio, openCount: (openOrders.data ?? []).length, lowList, chart, statusCount };
    },
  });

  const COLORS = ["oklch(0.65 0.20 45)", "oklch(0.55 0.15 220)", "oklch(0.62 0.16 150)", "oklch(0.60 0.22 25)"];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Factory />} label="Produção hoje" value={`${(stats?.totalLitros ?? 0).toFixed(0)} L`} accent />
        <StatCard icon={<AlertTriangle />} label="Estoque baixo" value={String(stats?.lowList.length ?? 0)} warn />
        <StatCard icon={<ClipboardList />} label="Ordens em aberto" value={String(stats?.openCount ?? 0)} />
        <StatCard icon={<DollarSign />} label="Custo médio/L (hoje)" value={`R$ ${(stats?.custoMedio ?? 0).toFixed(2)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Produção últimos 7 dias (L)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats?.chart ?? []}>
              <XAxis dataKey="dia" stroke="oklch(0.45 0.02 240)" fontSize={12} />
              <YAxis stroke="oklch(0.45 0.02 240)" fontSize={12} />
              <Tooltip contentStyle={{ background: "oklch(0.22 0.025 240)", border: "none", borderRadius: 8, color: "#fff" }} />
              <Bar dataKey="litros" fill="oklch(0.65 0.20 45)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Status das ordens</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stats?.statusCount ?? []} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                {(stats?.statusCount ?? []).map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {stats && stats.lowList.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-warning">
            <AlertTriangle className="h-4 w-4" /> Alertas de estoque mínimo
          </h3>
          <ul className="divide-y">
            {stats.lowList.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium">{m.nome}</span>
                <span className="text-muted-foreground">
                  {Number(m.estoque_atual).toFixed(2)} / mín {Number(m.estoque_minimo).toFixed(2)} {m.unidade}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent, warn }: { icon: React.ReactNode; label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${accent ? "bg-primary text-primary-foreground" : warn ? "bg-warning text-warning-foreground" : "bg-secondary text-secondary-foreground"}`}>
        {icon}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </Card>
  );
}
