import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { CircleHelp, History, Home, MoreHorizontal, Package, ScanLine, Settings, Trash2, Utensils } from "lucide-react";
import { Wordmark } from "@/components/cannify/logo";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/consume", label: "Consume", icon: Utensils },
  { to: "/history", label: "History", icon: History },
] as const;

function isActivePath(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex min-h-dvh max-w-7xl">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface/80 px-4 py-6 lg:flex">
          <Link to="/" className="px-2" aria-label="Cannify home">
            <Wordmark />
          </Link>
          <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Primary">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-fg hover:bg-surface-2",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
            <Link
              to="/deleted"
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                isActivePath(pathname, "/deleted")
                  ? "bg-primary text-primary-foreground"
                  : "text-fg hover:bg-surface-2",
              )}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Recently Deleted
            </Link>
            <div className="mt-4 border-t border-border pt-4">
              <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">More</p>
              <Link to="/settings" className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors", isActivePath(pathname, "/settings") ? "bg-primary text-primary-foreground" : "text-fg hover:bg-surface-2")}>
                <Settings className="size-4" aria-hidden="true" />Settings
              </Link>
              <Link to="/help" className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors", isActivePath(pathname, "/help") ? "bg-primary text-primary-foreground" : "text-fg hover:bg-surface-2")}>
                <CircleHelp className="size-4" aria-hidden="true" />Help
              </Link>
            </div>
          </nav>
          <Link
            to="/scan"
            className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-surface-2"
          >
            <ScanLine className="size-4" aria-hidden="true" />
            Scan item QR
          </Link>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
            <Link to="/" aria-label="Cannify home">
              <Wordmark compact />
            </Link>
            <div className="flex items-center gap-1">
              <Link
                to="/scan"
                className="inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-2"
                aria-label="Scan item QR"
              >
                <ScanLine className="size-5" />
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-2" aria-label="More pages"><MoreHorizontal className="size-5" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild><Link to="/deleted"><Trash2 className="size-4" />Recently Deleted</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/settings"><Settings className="size-4" />Settings</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/help"><CircleHelp className="size-4" />Help</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 pb-24 lg:px-8 lg:py-8 lg:pb-8">{children}</main>

          <nav
            className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
            aria-label="Primary"
          >
            <ul className="grid grid-cols-4">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-3xl font-medium tracking-tight text-fg md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
