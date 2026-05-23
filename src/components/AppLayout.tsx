import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  LayoutDashboard, FlaskConical, Package, Beaker, Factory,
  Warehouse, ShieldCheck, LogOut, Menu, Users, Search, Moon, Sun,
  ChevronsLeft, ChevronsRight, Bell,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean };
const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/materias-primas", label: "Matérias-Primas", icon: FlaskConical },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/formulacoes", label: "Formulações", icon: Beaker },
  { to: "/producao", label: "Produção", icon: Factory },
  { to: "/estoque", label: "Estoque", icon: Warehouse },
  { to: "/qualidade", label: "Qualidade", icon: ShieldCheck },
  { to: "/usuarios", label: "Usuários", icon: Users, adminOnly: true },
];

export function AppLayout({ children }: { children?: ReactNode }) {
  const { user, signOut, hasRole, roles } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sb_collapsed") === "1";
  });
  useEffect(() => { localStorage.setItem("sb_collapsed", collapsed ? "1" : "0"); }, [collapsed]);

  const items = NAV.filter((i) => !i.adminOnly || hasRole("administrador"));
  const current = NAV.find((n) => n.to === path);

  // Cmd/Ctrl+K focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim().toLowerCase() ?? "";
    if (!q) return;
    const match = items.find((i) => i.label.toLowerCase().includes(q));
    if (match) nav({ to: match.to as "/" });
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200 lg:relative lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        <div className={cn("flex h-16 items-center gap-3 border-b border-sidebar-border px-4", collapsed && "justify-center px-2")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground shadow-sm">SI</div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-bold leading-tight">SanIndustrial</div>
              <div className="truncate text-[10px] uppercase tracking-wider opacity-60">ERP de Produção</div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = path === item.to;
            return (
              <Link
                key={item.to}
                to={item.to as "/"}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                  collapsed && "justify-center px-2",
                  active
                    ? "bg-primary/15 text-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                {active && <span className="absolute inset-y-1 left-0 w-1 rounded-r bg-primary" />}
                <Icon className={cn("h-4.5 w-4.5 shrink-0", active && "text-primary")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:flex"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : (<><ChevronsLeft className="h-4 w-4" /> Recolher</>)}
          </button>
          {!collapsed && (
            <div className="mt-2 rounded-md bg-sidebar-accent/40 p-2 text-xs">
              <div className="truncate font-medium">{user?.email}</div>
              <div className="truncate text-[10px] uppercase tracking-wider opacity-60">{roles.join(" • ") || "sem papel"}</div>
            </div>
          )}
          <button
            onClick={async () => { await signOut(); nav({ to: "/login" }); }}
            className={cn("mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent", collapsed && "justify-center px-2")}
            title={collapsed ? "Sair" : undefined}
          >
            <LogOut className="h-4 w-4" /> {!collapsed && "Sair"}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur-md lg:px-6">
          <button className="lg:hidden" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden flex-col leading-tight md:flex">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Módulo</div>
            <div className="text-sm font-semibold">{current?.label ?? "Sistema"}</div>
          </div>

          <form onSubmit={onSearchSubmit} className="relative ml-auto flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="global-search"
              name="q"
              placeholder="Buscar módulo, lote, produto…"
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-14 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <kbd className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:block">⌘K</kbd>
          </form>

          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:text-foreground"
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            className="hidden h-9 w-9 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:text-foreground sm:flex"
            title="Notificações"
          >
            <Bell className="h-4 w-4" />
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children ?? <Outlet />}</main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </div>
  );
}
