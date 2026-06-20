import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { DataCard, EmptyState, PageHeader } from "@/components/crud-ui";
import { Badge } from "@/components/ui/badge";
import { Beaker, ClipboardCheck, Microscope, TestTube2 } from "lucide-react";

export const Route = createFileRoute("/laboratorio")({
  component: () => (<RequireAuth><AppLayout><Laboratorio /></AppLayout></RequireAuth>),
});

function Laboratorio() {
  const areas = [
    { title: "Análises físico-químicas", icon: TestTube2, status: "Em estruturação" },
    { title: "Ensaios laboratoriais", icon: Microscope, status: "Em estruturação" },
    { title: "Liberação de lotes", icon: ClipboardCheck, status: "Em estruturação" },
  ];

  return (
    <>
      <PageHeader
        title="Laboratório"
        subtitle="Controle laboratorial vinculado à qualidade"
      />

      <div className="grid gap-3 md:grid-cols-3">
        {areas.map((area) => {
          const Icon = area.icon;
          return (
            <DataCard key={area.title}>
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{area.title}</h3>
                    <p className="text-xs text-muted-foreground">Rotina de laboratório</p>
                  </div>
                </div>
                <Badge variant="outline">{area.status}</Badge>
              </div>
            </DataCard>
          );
        })}
      </div>

      <DataCard>
        <div className="p-4">
          <EmptyState label="Nenhuma rotina laboratorial configurada" icon={Beaker} />
        </div>
      </DataCard>
    </>
  );
}
