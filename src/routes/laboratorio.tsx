import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { DataCard, EmptyState, PageHeader } from "@/components/crud-ui";
import { Badge } from "@/components/ui/badge";
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
  TestTube2,
} from "lucide-react";

export const Route = createFileRoute("/laboratorio")({
  component: () => (<RequireAuth><AppLayout><Laboratorio /></AppLayout></RequireAuth>),
});

function Laboratorio() {
  const etapas = [
    {
      title: "Recebimento",
      description: "Entrada da amostra, conferência física e identificação inicial.",
      icon: PackageCheck,
      tone: "border-sky-200 bg-sky-50/70 text-sky-700",
    },
    {
      title: "Registro LIMS",
      description: "Código único, origem, lote, responsável e cadeia de custódia.",
      icon: ScanBarcode,
      tone: "border-cyan-200 bg-cyan-50/70 text-cyan-700",
    },
    {
      title: "Plano de ensaio",
      description: "Definição dos testes, método, especificação e prioridade.",
      icon: ClipboardList,
      tone: "border-emerald-200 bg-emerald-50/70 text-emerald-700",
    },
    {
      title: "Preparação",
      description: "Aliquotagem, preparo, retenção e distribuição para bancada.",
      icon: FlaskConical,
      tone: "border-teal-200 bg-teal-50/70 text-teal-700",
    },
    {
      title: "Análise",
      description: "Execução no equipamento ou bancada e registro dos resultados.",
      icon: Microscope,
      tone: "border-blue-200 bg-blue-50/70 text-blue-700",
    },
    {
      title: "Revisão técnica",
      description: "Conferência de resultado, desvio, repetição e evidências.",
      icon: ClipboardCheck,
      tone: "border-indigo-200 bg-indigo-50/70 text-indigo-700",
    },
    {
      title: "Liberação",
      description: "Aprovação/reprovação do lote e emissão do parecer.",
      icon: FileCheck2,
      tone: "border-lime-200 bg-lime-50/70 text-lime-700",
    },
    {
      title: "Arquivo",
      description: "Retenção da amostra, anexos, histórico e trilha de auditoria.",
      icon: Archive,
      tone: "border-slate-200 bg-slate-50/80 text-slate-700",
    },
  ];

  const amostras = [
    {
      codigo: "LAB-0001",
      material: "Lote piloto",
      origem: "Produção",
      etapa: "Recebimento",
      prazo: "Hoje",
      responsavel: "Laboratório",
      status: "Aguardando registro",
    },
    {
      codigo: "LAB-0002",
      material: "Produto acabado",
      origem: "Qualidade",
      etapa: "Análise",
      prazo: "24h",
      responsavel: "Analista CQ",
      status: "Em andamento",
    },
    {
      codigo: "LAB-0003",
      material: "Contraprova",
      origem: "Retenção",
      etapa: "Revisão técnica",
      prazo: "48h",
      responsavel: "Coordenação",
      status: "Em revisão",
    },
  ];

  return (
    <>
      <PageHeader
        title="Laboratório"
        subtitle="Fluxo de amostras no modelo LIMS"
      />

      <DataCard>
        <div className="border-b bg-sky-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-sky-800">Fluxo da amostra</h2>
              <p className="text-xs text-muted-foreground">Rastreabilidade da entrada até a liberação e arquivamento.</p>
            </div>
            <Badge variant="outline" className="border-sky-200 bg-white text-sky-700">LIMS</Badge>
          </div>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          {etapas.map((etapa, index) => {
            const Icon = etapa.icon;
            return (
              <div key={etapa.title} className={`rounded-md border p-3 ${etapa.tone}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/80">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider opacity-70">Etapa {index + 1}</div>
                    <h3 className="text-sm font-semibold">{etapa.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{etapa.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DataCard>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <DataCard>
          <div className="border-b p-4">
            <h2 className="text-sm font-semibold">Fila de amostras</h2>
            <p className="text-xs text-muted-foreground">Modelo inicial para acompanhamento operacional.</p>
          </div>
          <div className="divide-y">
            {amostras.map((amostra) => (
              <div key={amostra.codigo} className="grid gap-3 p-4 md:grid-cols-[120px_1fr_130px_140px] md:items-center">
                <div>
                  <div className="font-mono text-xs font-semibold">{amostra.codigo}</div>
                  <div className="text-[11px] text-muted-foreground">{amostra.origem}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">{amostra.material}</div>
                  <div className="text-xs text-muted-foreground">Responsável: {amostra.responsavel}</div>
                </div>
                <div>
                  <Badge variant="outline">{amostra.etapa}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>Prazo: {amostra.prazo}</div>
                  <div>{amostra.status}</div>
                </div>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard>
          <div className="border-b p-4">
            <h2 className="text-sm font-semibold">Dados rastreados</h2>
            <p className="text-xs text-muted-foreground">Campos essenciais de um fluxo LIMS.</p>
          </div>
          <div className="grid gap-2 p-4">
            {[
              "Código único da amostra",
              "Origem, lote e produto vinculado",
              "Métodos e especificações aplicáveis",
              "Equipamento, analista e bancada",
              "Resultados, anexos e revisões",
              "Status, prazo e trilha de auditoria",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                <Beaker className="h-4 w-4 text-primary" />
                {item}
              </div>
            ))}
          </div>
        </DataCard>
      </div>

      <DataCard>
        <div className="p-4">
          <EmptyState label="Próxima etapa: transformar este fluxo em cadastro operacional de amostras" icon={TestTube2} />
        </div>
      </DataCard>
    </>
  );
}
