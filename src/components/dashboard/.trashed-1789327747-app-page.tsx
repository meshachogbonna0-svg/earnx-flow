import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { cn } from "@/lib/utils";

type NavKey = "home" | "tasks" | "promotions" | "profile" | "tap";

/** Shared page shell for all in-app (signed-in) screens. */
export function AppPage({
  title,
  subtitle,
  action,
  children,
  className,
  nav = "home",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  nav?: NavKey | false;
}) {
  const navigate = useNavigate();
  return (
    <div className={cn("min-h-screen bg-background pb-28", className)}>
      <div className="mx-auto w-full max-w-md space-y-6 px-4 pt-5 sm:max-w-lg">
        <header className="animate-fade-up flex items-center gap-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => navigate({ to: "/dashboard" })}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-card/70 transition active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-extrabold tracking-tight">{title}</h1>
            {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
        {children}
      </div>
      {nav !== false && <BottomNav active={nav} />}
    </div>
  );
}

/** Full-screen loading state. */
export function PageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-gold" />
    </div>
  );
}

/** Simple empty state inside a card. */
export function EmptyState({ text, cta }: { text: string; cta?: { label: string; to: string } }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <p className="text-xs text-muted-foreground">{text}</p>
      {cta && (
        <Link
          to={cta.to}
          className="mt-3 inline-flex rounded-full border border-gold/50 px-4 py-1.5 text-xs font-semibold text-gold transition active:scale-95"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
