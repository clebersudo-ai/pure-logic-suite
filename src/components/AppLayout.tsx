import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, FlaskConical, Package, Beaker, Factory,
  Warehouse, ShieldCheck, LogOut, Menu, X, Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/materias-primas", label: "Matérias-Primas", icon: FlaskConical },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/formulacoes", label: "Formulações", icon: Beaker },
  { to: "/producao", label: "Produção", icon: Factory },
  { to: "/estoque", label: "Estoque", icon: Warehouse },
  { to: "/qualidade", label: "Qualidade", icon: ShieldCheck },
  { to: "/usuarios", label: "Usuários", icon: Users, adminOnly: true },
] as const;

export function AppLayout({ children }: { children?: ReactNode }) {
  const { user, signOut, hasRole, roles } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 transform bg-sidebar text-sidebar-foreground transition-transform lg:relative lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-primary text-primary-foreground font-bold">SI</div>
          <div>
            <div className="text-sm font-bold leading-tight">SanIndustrial</div>
            <div className="text-xs opacity-70">Gestão de Produção</div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.filter((i) => !i.adminOnly || hasRole("administrador")).map((item) => {
            const Icon = item.icon;
            const active = path === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-3">
          <div className="mb-2 px-2 text-xs">
            <div className="font-medium truncate">{user?.email}</div>
            <div className="opacity-70">{roles.join(", ") || "sem papel"}</div>
          </div>
          <button
            onClick={async () => { await signOut(); nav({ to: "/login" }); }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {NAV.find((n) => n.to === path)?.label ?? "Sistema"}
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">
            {new Date().toLocaleDateString("pt-BR", { dateStyle: "full" })}
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children ?? <Outlet />}</main>
      </div>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
