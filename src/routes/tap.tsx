import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Coins, Loader2, Play, ShieldCheck, Timer, TrendingUp, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { TapSessionCountdown } from "@/components/dashboard/tap-session-countdown";
import { TapSessionStatus, type TapSessionState } from "@/components/dashboard/tap-session-status";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { naira } from "@/lib/format";
import { getRemainingSeconds } from "@/lib/tap-session";
import { cn } from "@/lib/utils";

const eagle = "/earnx-eagle-logo.png";

export const Route = createFileRoute("/tap")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Tapping Sessions — EarnX-Finance" },
    { name: "description", content: "Start and track your secure EarnX-Finance tapping session." },
    { property: "og:title", content: "Tapping Sessions — EarnX-Finance" },
    { property: "og:description", content: "Start and track your secure EarnX-Finance tapping session." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: TapPage,
});

type ServerStatus = "ready" | "active" | "cooldown" | "ended" | "disabled";
type TapState = {
  ok?: boolean; reason?: string; message?: string; level?: number; level_name?: string; activation?: string;
  balance?: number; total_earned?: number; total_taps?: number; taps_today?: number; earned_today?: number;
  reward?: number; reward_per_tap?: number; tapping_enabled?: boolean; session_status?: ServerStatus;
  session_started_at?: string | null; session_expires_at?: string | null; cooldown_expires_at?: string | null;
  session_tap_count?: number; session_earnings?: number; session_duration_seconds?: number;
  session_cooldown_seconds?: number; session_max_taps?: number;
};

const messages: Record<string, string> = {
  session_expired: "Tapping session ended.", cooldown_active: "Your next tapping session is not ready yet.",
  tapping_disabled: "Tapping is temporarily disabled.", maximum_taps_reached: "You reached the maximum taps for this session.",
  max_taps_reached: "You reached the maximum taps for this session.", invalid_session: "This tapping session is no longer valid. Refresh and start again.",
  unauthenticated: "Please sign in again to continue.", not_activated: "Activate your account to start earning from taps.",
  account_restricted: "Your account is restricted. Contact support.", daily_limit: "You've reached today's tap limit.",
  earnings_limit: "You've reached today's earnings limit.", no_battery: "Your tapping energy is currently unavailable.",
};

async function callTapRpc(name: string) {
  const call = supabase.rpc.bind(supabase) as unknown as (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;
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
  const [pressed, setPressed] = useState(false);
  const refreshedBoundary = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await callTapRpc("tap_state");
    if (error) setNotice("Tapping session details are unavailable right now.");
    else { setState(data); setNotice(data.ok === false ? data.message ?? messages[data.reason ?? ""] ?? "Tapping is unavailable." : null); }
    setLoading(false);
  }, []);

  useEffect(() => { let active = true; void supabase.auth.getUser().then(async ({ data }) => { if (!data.user) return navigate({ to: "/login", replace: true }); if (active) await refresh(); }); return () => { active = false; }; }, [navigate, refresh]);
  useEffect(() => { const timer = window.setInterval(() => setTick((value) => value + 1), 1000); return () => window.clearInterval(timer); }, []);

  const sessionSeconds = getRemainingSeconds(state.session_expires_at);
  const cooldownSeconds = getRemainingSeconds(state.cooldown_expires_at);
  const backendStatus = state.session_status;
  const status: ServerStatus = backendStatus ?? (state.tapping_enabled === false ? "disabled" : "ready");
  const visualStatus: TapSessionState = status === "active" ? "active" : status === "cooldown" ? "cooldown" : status === "ended" ? "ended" : "idle";
  void tick;

  useEffect(() => {
    const boundary = status === "active" && sessionSeconds === 0 ? `session:${state.session_expires_at}` : status === "cooldown" && cooldownSeconds === 0 ? `cooldown:${state.cooldown_expires_at}` : null;
    if (boundary && refreshedBoundary.current !== boundary) { refreshedBoundary.current = boundary; void refresh(); }
  }, [cooldownSeconds, refresh, sessionSeconds, state.cooldown_expires_at, state.session_expires_at, status]);

  const start = async () => {
    if (starting || status !== "ready") return;
    setStarting(true); setNotice(null);
    const { data, error } = await callTapRpc("start_tapping_session");
    setStarting(false);
    if (error || !data.ok) { const text = data.message ?? messages[data.reason ?? ""] ?? "Secure session starting is not available yet."; setNotice(text); toast.error(text); return; }
    setState(data); refreshedBoundary.current = null;
  };

  const tap = async () => {
    if (tapping || status !== "active" || sessionSeconds <= 0) return;
    setTapping(true); setPressed(true); window.setTimeout(() => setPressed(false), 120);
    const { data, error } = await callTapRpc("perform_tap");
    setTapping(false);
    if (error || !data.ok) { const text = data.message ?? messages[data.reason ?? ""] ?? "This tap could not be processed."; setNotice(text); toast.error(text); await refresh(); return; }
    setNotice(null); setState((previous) => ({ ...previous, ...data }));
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>;

  const sessionFieldsAvailable = Boolean(backendStatus && (state.session_duration_seconds != null || state.session_expires_at || status !== "ready"));
  const active = status === "active" && sessionSeconds > 0;
  const maxTaps = state.session_max_taps;
  const tapCount = state.session_tap_count;
  const sessionEarnings = state.session_earnings;

  return <div className="min-h-screen bg-background bg-hero-glow pb-28"><div className="mx-auto w-full max-w-md space-y-4 px-4 pt-5 sm:max-w-lg">
    <header className="text-center"><div className="mb-3 flex justify-center"><TapSessionStatus state={visualStatus} /></div><p className="text-[10px] tracking-[0.24em] text-muted-foreground">TAP TO EARN</p><p className="mt-1.5 font-display text-3xl font-extrabold text-gold">{naira(state.balance)}</p><div className="mt-2 flex justify-center gap-2 text-[10px]"><span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 font-semibold text-gold">{state.level_name ?? `Level ${state.level ?? 0}`}</span><span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold", state.activation === "activated" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}><ShieldCheck className="h-3 w-3" />{state.activation === "activated" ? "Activated" : "Not activated"}</span></div></header>

    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      {status === "active" && <TapSessionCountdown seconds={sessionSeconds} size="lg" label="TIME REMAINING" />}
      {status === "cooldown" && <><p className="text-center text-sm font-semibold">Tapping session ended.</p><TapSessionCountdown seconds={cooldownSeconds} size="lg" label="NEXT SESSION AVAILABLE IN" className="mt-3" /></>}
      {status === "ended" && <div className="text-center"><p className="text-sm font-bold">Tapping session ended.</p><p className="mt-1 text-xs text-muted-foreground">Waiting for the secure session service to provide the next availability time.</p></div>}
      {status === "disabled" && <div className="text-center"><AlertCircle className="mx-auto h-6 w-6 text-destructive" /><p className="mt-2 text-sm font-bold">Tapping is disabled</p></div>}
      {status === "ready" && <div className="text-center"><p className="text-sm font-bold">{backendStatus ? "Your next tapping session is ready." : "Session controls unavailable"}</p><p className="mt-1 text-xs text-muted-foreground">{backendStatus ? "Start when you are ready. Every tap remains server validated." : "Manus has not supplied session status, duration, or cooldown fields yet."}</p><Button type="button" disabled={!sessionFieldsAvailable || starting || state.activation !== "activated" || state.tapping_enabled === false} onClick={() => void start()} className="mt-4 h-12 w-full bg-gold font-bold text-gold-foreground hover:bg-gold/90">{starting ? <Loader2 className="animate-spin" /> : <Play />}{starting ? "Starting securely…" : "Start Tapping"}</Button></div>}
      {notice && <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center text-xs text-destructive">{notice}</p>}
    </section>

    <section className="grid grid-cols-2 gap-3"><Stat icon={Zap} label="Session taps" value={tapCount == null ? "Unavailable" : `${tapCount}${maxTaps != null ? ` / ${maxTaps}` : ""}`} /><Stat icon={Coins} label="Session earnings" value={sessionEarnings == null ? "Unavailable" : naira(sessionEarnings)} /></section>

    <section className="relative grid place-items-center py-3"><button type="button" disabled={!active || tapping || state.tapping_enabled === false} onClick={() => void tap()} aria-label="Tap to earn" className={cn("relative grid h-56 w-56 place-items-center overflow-hidden rounded-full border-2 border-gold/70 bg-gradient-to-br from-navy via-card to-navy-deep shadow-gold-glow transition duration-150 disabled:cursor-not-allowed disabled:opacity-35", pressed && "scale-95")}><span className="absolute inset-2 rounded-full border border-gold/25" /><img src={eagle} alt="EarnX-Finance" className="pointer-events-none h-28 w-28 object-contain" /><span className="text-[11px] font-bold tracking-[0.32em] text-gold">TAP</span><span className="text-[10px] text-muted-foreground">{state.reward_per_tap == null ? "Reward unavailable" : `+${naira(state.reward_per_tap)}`}</span></button></section>

    <section className="grid grid-cols-2 gap-3"><Stat icon={Zap} label="Reward per tap" value={state.reward_per_tap == null ? "Unavailable" : naira(state.reward_per_tap)} /><Stat icon={TrendingUp} label="Total taps" value={state.total_taps == null ? "Unavailable" : state.total_taps.toLocaleString("en-NG")} /><Stat icon={Timer} label="Session duration" value={state.session_duration_seconds == null ? "Unavailable" : `${state.session_duration_seconds}s`} /><Stat icon={Timer} label="Cooldown" value={state.session_cooldown_seconds == null ? "Unavailable" : `${state.session_cooldown_seconds}s`} /></section>
  </div><BottomNav active="tap" /></div>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) { return <div className="min-w-0 rounded-2xl border border-border bg-card p-3.5 shadow-soft"><span className="grid h-8 w-8 place-items-center rounded-xl bg-secondary text-gold"><Icon className="h-4 w-4" /></span><p className="mt-2.5 text-[10px] text-muted-foreground">{label}</p><p className="mt-0.5 break-words text-sm font-bold">{value}</p></div>; }