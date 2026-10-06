import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Clock3, Gauge, Loader2, Play, RefreshCw, ShieldCheck, Target, TrendingUp, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatCountdown, getRemainingSeconds } from "@/lib/tap-session";
import { naira } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tap")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Tap & Earn — EarnX-Finance" },
    { name: "description", content: "Start secure EarnX tapping sessions and track server-verified earnings." },
    { property: "og:title", content: "Tap & Earn — EarnX-Finance" },
    { property: "og:description", content: "Start secure EarnX tapping sessions and track server-verified earnings." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: TapPage,
});

type ServerStatus = "ready" | "active" | "cooldown" | "ended" | "disabled";
type TapState = {
  ok?: boolean;
  reason?: string;
  message?: string;
  level?: number;
  level_name?: string;
  activation?: string;
  balance?: number;
  total_earned?: number;
  total_taps?: number;
  taps_today?: number;
  earned_today?: number;
  reward?: number;
  reward_per_tap?: number;
  tapping_enabled?: boolean;
  session_status?: ServerStatus;
  session_started_at?: string | null;
  session_expires_at?: string | null;
  cooldown_expires_at?: string | null;
  session_tap_count?: number;
  session_earnings?: number;
  session_duration_seconds?: number;
  session_cooldown_seconds?: number;
  session_max_taps?: number;
  daily_tap_limit?: number;
  sessions_per_day?: number;
  sessions_today?: number;
};

const reasonMessages: Record<string, string> = {
  session_expired: "This tapping session has ended.",
  cooldown_active: "Your next tapping session is still recharging.",
  tapping_disabled: "Tap & Earn is temporarily unavailable.",
  maximum_taps_reached: "You reached the maximum taps for this session.",
  max_taps_reached: "You reached the maximum taps for this session.",
  invalid_session: "This tapping session is no longer valid. Refresh to continue.",
  unauthenticated: "Please sign in again to continue.",
  not_activated: "Activate your account to start earning from taps.",
  account_restricted: "Your account is restricted. Contact support.",
  daily_limit: "You have reached today's tap limit.",
  earnings_limit: "You have reached today's earnings limit.",
  no_battery: "Your tapping energy is recharging.",
};

async function callTapRpc(name: "tap_state" | "start_tapping_session" | "perform_tap") {
  const call = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await call(name);
  return { data: (data ?? {}) as TapState, error };
}

function TapPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [tapping, setTapping] = useState(false);
  const [state, setState] = useState<TapState>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [tapFeedback, setTapFeedback] = useState<number | null>(null);
  const refreshedBoundary = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await callTapRpc("tap_state");
    if (error) {
      setNotice("Tap & Earn details are unavailable right now.");
    } else {
      setState(data);
      setNotice(data.ok === false ? data.message ?? reasonMessages[data.reason ?? ""] ?? "Tap & Earn is unavailable." : null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return navigate({ to: "/login", replace: true });
      if (mounted) await refresh();
    });
    return () => { mounted = false; };
  }, [navigate, refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const sessionSeconds = getRemainingSeconds(state.session_expires_at);
  const cooldownSeconds = getRemainingSeconds(state.cooldown_expires_at);
  const backendStatus = state.session_status;
  const status: ServerStatus = backendStatus ?? (state.tapping_enabled === false ? "disabled" : "ready");
  const active = status === "active" && sessionSeconds > 0;
  const duration = Math.max(0, Number(state.session_duration_seconds ?? 0));
  const progressMax = duration > 0 ? duration : Math.max(sessionSeconds, 1);
  void tick;

  useEffect(() => {
    const boundary = status === "active" && sessionSeconds === 0
      ? `session:${state.session_expires_at}`
      : status === "cooldown" && cooldownSeconds === 0
        ? `cooldown:${state.cooldown_expires_at}`
        : null;
    if (boundary && refreshedBoundary.current !== boundary) {
      refreshedBoundary.current = boundary;
      void refresh();
    }
  }, [cooldownSeconds, refresh, sessionSeconds, state.cooldown_expires_at, state.session_expires_at, status]);

  const start = async () => {
    if (starting || status !== "ready") return;
    setStarting(true);
    setNotice(null);
    const { data, error } = await callTapRpc("start_tapping_session");
    setStarting(false);
    if (error || !data.ok) {
      const text = data.message ?? reasonMessages[data.reason ?? ""] ?? "A secure tapping session could not be started.";
      setNotice(text);
      toast.error(text);
      return;
    }
    setState(data);
    refreshedBoundary.current = null;
  };

  const tap = async () => {
    if (tapping || !active || state.tapping_enabled === false) return;
    setTapping(true);
    const { data, error } = await callTapRpc("perform_tap");
    setTapping(false);
    if (error || !data.ok) {
      const text = data.message ?? reasonMessages[data.reason ?? ""] ?? "This tap could not be processed.";
      setNotice(text);
      toast.error(text);
      await refresh();
      return;
    }
    setNotice(null);
    setState((previous) => ({ ...previous, ...data }));
    const verifiedReward = data.reward ?? data.reward_per_tap;
    if (verifiedReward != null) {
      setTapFeedback(verifiedReward);
      window.setTimeout(() => setTapFeedback(null), 700);
    }
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>;
  }

  const levelName = state.level_name ?? `Level ${state.level ?? 0}`;
  const reward = state.reward_per_tap;
  const sessionComplete = status === "ended" || (status === "active" && sessionSeconds === 0);
  const sessionFieldsAvailable = Boolean(backendStatus && (state.session_duration_seconds != null || state.session_expires_at || status !== "ready"));
  const coreLabel = active ? "TAP NOW" : status === "cooldown" ? "RECHARGING" : sessionComplete ? "SESSION COMPLETE" : status === "disabled" ? "UNAVAILABLE" : "START SESSION";

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-28">
      <div className="mx-auto w-full max-w-lg">
        <header className="rounded-b-[2.25rem] border-b border-gold/15 bg-gradient-to-br from-royal via-navy to-navy-deep px-4 pb-6 pt-7 shadow-card">
          <div className="mx-auto max-w-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-gold">EarnX-Finance</p>
                <h1 className="mt-1 font-display text-2xl font-extrabold">Tap & Earn</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  {levelName} <span className="text-gold">—</span> {reward == null ? "Reward unavailable" : `${naira(reward)} per tap`}
                </p>
              </div>
              <span className={cn("flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-bold", state.activation === "activated" ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive")}>
                <ShieldCheck className="h-3 w-3" /> {state.activation === "activated" ? "Activated" : "Inactive"}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <HeaderStat label="Today Taps" value={state.taps_today == null ? "—" : state.taps_today.toLocaleString("en-NG")} />
              <HeaderStat label="Today Earned" value={state.earned_today == null ? "—" : naira(state.earned_today)} />
              <HeaderStat label="Total Earned" value={state.total_earned == null ? "—" : naira(state.total_earned)} />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-md space-y-5 px-4 pt-5">
          {(active || status === "cooldown" || sessionComplete || status === "disabled") && (
            <section className={cn("rounded-2xl border bg-card p-4 shadow-soft", active ? "border-success/30" : status === "cooldown" ? "border-royal/35" : "border-border")}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", active ? "bg-success/10 text-success" : status === "cooldown" ? "bg-royal/15 text-royal" : "bg-secondary text-gold")}>
                    {sessionComplete ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{active ? "Session Active" : status === "cooldown" ? "Cooldown Active" : sessionComplete ? "Session Complete" : "Tap System Unavailable"}</p>
                    {sessionComplete && <p className="mt-0.5 text-[10px] text-muted-foreground">{state.session_tap_count ?? 0} taps · {naira(state.session_earnings)}</p>}
                  </div>
                </div>
                {(active || status === "cooldown") && <span className="font-display text-xl font-extrabold tabular-nums text-gold">{formatCountdown(active ? sessionSeconds : cooldownSeconds)}</span>}
              </div>
              {active && <progress aria-label="Session time remaining" value={sessionSeconds} max={progressMax} className="earnx-session-progress mt-4 h-2 w-full overflow-hidden rounded-full" />}
              {status === "cooldown" && <p className="mt-3 text-[10px] text-muted-foreground">Your next session becomes available when this server-timed cooldown ends.</p>}
            </section>
          )}

          {notice && <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{notice}</p></div>}

          <section className="relative grid place-items-center py-3">
            <div className={cn("absolute h-[17.5rem] w-[17.5rem] rounded-full border border-gold/10 bg-gold/5 blur-sm", active && "animate-pulse-glow")} />
            <div className="absolute h-[15.75rem] w-[15.75rem] rounded-full border border-royal/30" />
            <Button
              type="button"
              aria-label={active ? "Tap EarnX Core" : coreLabel}
              disabled={!active || tapping || state.tapping_enabled === false}
              onClick={() => void tap()}
              className={cn(
                "relative z-10 flex h-56 w-56 flex-col rounded-full border-2 border-gold/60 bg-gradient-to-br from-royal via-navy to-navy-deep p-0 text-foreground shadow-gold-glow transition duration-150 hover:from-royal hover:to-navy-deep disabled:opacity-100",
                active ? "active:scale-95" : "grayscale-[0.15]",
                tapping && "scale-95",
              )}
            >
              <span className="absolute inset-2 rounded-full border border-gold/20" />
              <Zap className={cn("h-12 w-12 fill-gold text-gold", active && "animate-pulse")} />
              <span className="mt-2 font-display text-xl font-extrabold">EARNX CORE</span>
              <span className="mt-1 text-[10px] font-bold text-gold">{coreLabel}</span>
              {tapFeedback != null && <span className="pointer-events-none absolute -top-3 animate-rise rounded-full bg-success px-3 py-1 text-xs font-extrabold text-success-foreground">+{naira(tapFeedback)}</span>}
            </Button>
          </section>

          {status === "ready" && (
            <Button type="button" disabled={!sessionFieldsAvailable || starting || state.activation !== "activated" || state.tapping_enabled === false} onClick={() => void start()} className="h-12 w-full rounded-xl bg-gold-gradient font-bold text-gold-foreground shadow-gold-glow hover:opacity-90">
              {starting ? <Loader2 className="animate-spin" /> : <Play />}{starting ? "Starting securely…" : "Start Tap Session"}
            </Button>
          )}
          {(status === "ended" || (status === "cooldown" && cooldownSeconds === 0)) && (
            <Button type="button" variant="outline" onClick={() => void refresh()} className="h-11 w-full rounded-xl"><RefreshCw />Check next session</Button>
          )}

          <section className="grid grid-cols-2 gap-3">
            <InfoCard icon={Target} label="Current Plan" value={levelName} detail={reward == null ? "Reward unavailable" : `${naira(reward)} per tap`} />
            <InfoCard icon={TrendingUp} label="Total Taps" value={state.total_taps == null ? "—" : state.total_taps.toLocaleString("en-NG")} detail={state.taps_today == null ? "Today unavailable" : `${state.taps_today.toLocaleString("en-NG")} today`} />
          </section>

          <section className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-3 shadow-soft">
            <MiniDetail icon={Gauge} label="Session" value={state.session_tap_count == null ? "—" : `${state.session_tap_count}${state.session_max_taps != null ? ` / ${state.session_max_taps}` : ""}`} />
            <MiniDetail icon={Zap} label="Earned" value={state.session_earnings == null ? "—" : naira(state.session_earnings)} />
            <MiniDetail icon={Clock3} label="Cooldown" value={state.session_cooldown_seconds == null ? "—" : formatCountdown(state.session_cooldown_seconds)} />
          </section>
        </main>
      </div>
      <BottomNav active="tap" />
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-border bg-background/15 px-2 py-3 text-center backdrop-blur"><p className="truncate text-sm font-extrabold tabular-nums">{value}</p><p className="mt-1 truncate text-[9px] text-muted-foreground">{label}</p></div>;
}

function InfoCard({ icon: Icon, label, value, detail }: { icon: typeof Target; label: string; value: string; detail: string }) {
  return <article className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft"><div className="flex items-center gap-2 text-gold"><Icon className="h-4 w-4" /><p className="text-[10px] font-bold text-muted-foreground">{label}</p></div><p className="mt-3 break-words text-sm font-extrabold">{value}</p><p className="mt-1 text-[9px] text-muted-foreground">{detail}</p></article>;
}

function MiniDetail({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return <div className="min-w-0 text-center"><Icon className="mx-auto h-4 w-4 text-gold" /><p className="mt-1.5 truncate text-[9px] text-muted-foreground">{label}</p><p className="mt-0.5 truncate text-[10px] font-bold">{value}</p></div>;
}