import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const OPEN_PATHS = ["/support", "/login", "/register", "/forgot-password", "/reset-password", "/terms", "/privacy", "/"];

/** Full-screen notice shown to signed-in users whose account was suspended or banned by Admin. */
export function AccountSuspendedGate() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [state, setState] = useState<{ name: string; status: string } | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return active && setState(null);
      const { data } = await supabase
        .from("profiles")
        .select("first_name, account_status")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (!active) return;
      const status = String(data?.account_status ?? "active");
      setState(status === "suspended" || status === "banned" ? { name: data?.first_name || "User", status } : null);
    };
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") void check();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname]);

  if (!state || OPEN_PATHS.includes(pathname)) return null;

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-background/95 px-5 backdrop-blur">
      <section className="w-full max-w-sm rounded-3xl border border-destructive/40 bg-gradient-to-br from-navy via-card to-navy-deep p-6 text-center shadow-lg">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-destructive/40 bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </span>
        <p className="mt-4 text-xs font-semibold text-gold">Dear {state.name},</p>
        <h1 className="mt-1 font-display text-lg font-extrabold">
          Your account has been {state.status === "banned" ? "banned" : "suspended"}.
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Please contact support if you think this was done by error or by mistake.
        </p>
        <Link
          to="/support"
          className="mt-5 flex w-full items-center justify-center rounded-xl bg-gold-gradient py-3 text-xs font-bold text-gold-foreground"
        >
          Contact support
        </Link>
        <button
          type="button"
          onClick={() => void supabase.auth.signOut()}
          className="mt-2 w-full rounded-xl border border-border py-2.5 text-xs font-semibold text-muted-foreground"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
