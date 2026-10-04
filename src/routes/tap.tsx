import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck, Timer, TrendingUp, Zap, Play, Gift, Coins } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { TapSessionCountdown } from "@/components/dashboard/tap-session-countdown";
import { TapSessionStatus } from "@/components/dashboard/tap-session-status";
import { useTapSession } from "@/hooks/useTapSession";
import { getTapSessionConfig, formatCountdown } from "@/lib/tap-session";
import { naira } from "@/lib/format";
import { cn } from "@/lib/utils";

const eagle = "/earnx-eagle-logo.png";

export const Route = createFileRoute("/tap")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Tap to Earn — EarnX-Finance" },
      {
        name: "description",
        content:
          "Tap to earn real Naira rewards on EarnX-Finance. Track your active session, countdown and cooldown in real time.",
      },
      { property: "og:title", content: "Tap to Earn — EarnX-Finance" },
      { property: "og:description", content: "Earn Naira rewards with every tap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TapPage,
});

type TapState = {
  ok?: boolean;
  level?: number;
  level_name?: string;
  activation?: string;
  balance?: number;
  total_earned?: number;
  battery?: number;
  capacity?: number;
  unlimited_battery?: boolean;
  unlimited_taps?: boolean;
  cooldown_until?: string | null;
  cooldown_minutes?: number;
  recharge_minutes?: number;
  recharge_amount?: number;
  taps_today?: number;
  earned_today?: number;
  total_taps?: number;
  daily_tap_limit?: number;
  daily_earnings_limit?: number;
  reward_per_tap?: number;
  multiplier?: number;
  tapping_enabled?: boolean;
  session_started?: boolean;
  session_active?: boolean;
  session_expired?: boolean;
  cooldown_active?: boolean;
  cooldown_expired?: boolean;
  max_taps_reached?: boolean;
  invalid_session?: boolean;
  reason?: string;
};

type TapResult = TapState & { reason?: string; reward?: number };

const rpc = async (fn: string, args?: Record<string, unknown>) => {
  const call = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    params?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await call(fn, args);
  return { data: (data ?? {}) as TapResult, error };
};

const reasons: Record<string, string> = {
  not_activated: "Activate your account to start earning from taps.",
  account_restricted: "Your account is restricted. Contact support.",
  tapping_disabled: "Tapping is temporarily disabled by the admin.",
  daily_limit: "You've reached today's tap limit. Come back tomorrow!",
  earnings_limit: "You've hit today's earnings cap. Great work!",
  no_battery: "Battery empty — wait for the recharge countdown.",
  session_expired: "This tapping session expired.",
  cooldown_active: "Cooldown is active. Please wait before starting again.",
  max_taps_reached: "Maximum taps reached for this session.",
  invalid_session: "This session is invalid.",
};

type Pop = { id: number; x: number; y: number; amount: number };
type Ripple = { id: number; x: number; y: number };

function TapPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<TapState>({});
  const [tapCount, setTapCount] = useState(0);
  const [earnedSession, setEarnedSession] = useState(0);
  const [pops, setPops] = useState<Pop[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [pressed, setPressed] = useState(false);
  const idRef = useRef(0);
  const lastWarn = useRef<string | null>(null);

  const level = Number(state.level ?? 0);
  const activeConfig = useMemo(() => getTapSessionConfig(level), [level]);

  const {
    state: sessionState,
    sessionSecondsRemaining,
    cooldownSecondsRemaining,
    canStartSession,
    startSession,
    endSession,
    config,
    isSessionActive,
    isCooldownActive,
  } = useTapSession(level);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate({ to: "/login", replace: true });
        return;
      }

      const { data, error } = await rpc("tap_state");
      if (!active) return;

      if (error) {
        console.error("[Tap] tap_state RPC failed:", error);
      }

      setState((data ?? {}) as TapState);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (sessionState === "idle" && sessionSecondsRemaining <= 0 && cooldownSecondsRemaining <= 0) {
      setTapCount(0);
      setEarnedSession(0);
    }
  }, [sessionState, sessionSecondsRemaining, cooldownSecondsRemaining]);

  useEffect(() => {
    if (state.level && state.level !== level) {
      setTapCount(0);
      setEarnedSession(0);
    }
  }, [state.level, level]);

  const warn = useCallback((reason: string) => {
    const message = reasons[reason] ?? "You can't tap right now.";
    if (lastWarn.current === reason) return;
    lastWarn.current = reason;
    toast.error(message, { id: "tap-warning" });
  }, []);

  const handleTap = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!isSessionActive || isCooldownActive) {
        warn("cooldown_active");
        return;
      }

      if (!state.tapping_enabled) {
        warn("tapping_disabled");
        return;
      }

      if (state.activation !== "activated") {
        warn("not_activated");
        return;
      }

      setPressed(true);
      window.setTimeout(() => setPressed(false), 120);

      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rid = ++idRef.current;
      setRipples((prev) => [...prev, { id: rid, x, y }]);
      window.setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== rid)), 600);

      const { data, error } = await rpc("perform_tap");

      if (error || !data) {
        warn("invalid_session");
        return;
      }

      if (data.session_expired || data.cooldown_active || data.invalid_session) {
        endSession();
        warn(data.reason ?? "session_expired");
        return;
      }

      if (data.max_taps_reached) {
        warn("max_taps_reached");
        return;
      }

      if (data.cooldown_active || data.session_expired) {
        endSession();
        warn("cooldown_active");
        return;
      }

      if (data.reason && !data.ok) {
        warn(data.reason);
        return;
      }

      setState((prev) => ({
        ...prev,
        balance: data.balance ?? prev.balance,
        total_earned: data.total_earned ?? prev.total_earned,
        reward_per_tap: data.reward_per_tap ?? prev.reward_per_tap ?? activeConfig.tapReward,
        taps_today: data.taps_today ?? prev.taps_today,
        earned_today: data.earned_today ?? prev.earned_today,
        total_taps: data.total_taps ?? prev.total_taps,
        tapping_enabled: data.tapping_enabled ?? prev.tapping_enabled,
      }));

      const reward = Number(data.reward ?? activeConfig.tapReward ?? 0);
      setTapCount((prev) => prev + 1);
      setEarnedSession((prev) => prev + reward);

      const pid = ++idRef.current;
      setPops((prev) => [...prev, { id: pid, x, y, amount: reward }]);
      window.setTimeout(() => setPops((prev) => prev.filter((p) => p.id !== pid)), 900);
    },
    [activeConfig.tapReward, endSession, isCooldownActive, isSessionActive, state.activation, state.tapping_enabled, warn],
  );

  useEffect(() => {
    if (sessionState === "active" && sessionSecondsRemaining <= 0) {
      endSession();
    }
  }, [sessionSecondsRemaining, sessionState, endSession]);

  useEffect(() => {
    if (sessionState === "cooldown" && cooldownSecondsRemaining <= 0) {
      setTapCount(0);
      setEarnedSession(0);
    }
  }, [cooldownSecondsRemaining, sessionState]);

  const isTapButtonDisabled =
    sessionState !== "active" || !isSessionActive || !state.tapping_enabled || state.activation !== "activated";

  const startButtonDisabled = !canStartSession || sessionState === "cooldown" || sessionState === "active";

  const currentReward = Number(state.reward_per_tap ?? activeConfig.tapReward ?? 0);
  const sessionLabel = sessionState === "active" ? "TAP SESSION ACTIVE" : sessionState === "cooldown" ? "COOLDOWN ACTIVE" : sessionState === "ended" ? "SESSION COMPLETED" : "READY TO TAP";

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const activated = state.activation === "activated";

  return (
    <div className="min-h-screen bg-background bg-hero-glow pb-28">
      <div className="mx-auto w-full max-w-md space-y-4 px-4 pt-5 sm:max-w-lg">
        <header className="animate-fade-up text-center">
          <div className="mb-3 flex justify-center">
            <TapSessionStatus state={sessionState} />
          </div>

          <p className="text-[10px] tracking-[0.24em] text-muted-foreground">TAP TO EARN</p>
          <p className="mt-1.5 font-display text-3xl font-extrabold tracking-tight text-gold">
            {naira(state.balance ?? 0)}
          </p>

          <div className="mt-2 flex items-center justify-center gap-2 text-[10px]">
            <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 font-semibold text-gold">
              {state.level_name ?? `Level ${level}`}
            </span>
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold",
                activated ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
              )}
            >
              <ShieldCheck className="h-3 w-3" />
              {activated ? "Activated" : "Not activated"}
            </span>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px] font-semibold text-gold">
              <Timer className="h-4 w-4" />
              {sessionState === "active" ? "Session time left" : sessionState === "cooldown" ? "Next session in" : "Session timer"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {sessionState === "active" ? `Level ${level}` : sessionState === "cooldown" ? "Cooldown" : "Ready"}
            </span>
          </div>

          {sessionState === "active" && (
            <TapSessionCountdown seconds={sessionSecondsRemaining} size="lg" label="TAP SESSION ACTIVE" className="mb-2" />
          )}

          {sessionState === "cooldown" && (
            <TapSessionCountdown seconds={cooldownSecondsRemaining} size="lg" label="NEXT SESSION AVAILABLE IN" className="mb-2" />
          )}

          {sessionState === "ended" && (
            <div className="space-y-2 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">SESSION COMPLETED</p>
              <p className="text-sm text-foreground">Tapping session finished.</p>
              <TapSessionCountdown seconds={cooldownSecondsRemaining} size="md" label="Next session available in" />
            </div>
          )}

          {sessionState === "idle" && (
            <div className="space-y-4 text-center">
              <TapSessionCountdown seconds={config.sessionDuration} size="lg" label="SESSION DURATION" />
              <button
                type="button"
                disabled={startButtonDisabled}
                onClick={() => {
                  if (!config.enabled) {
                    toast.error("Tapping is disabled for this level.");
                    return;
                  }
                  startSession();
                  setTapCount(0);
                  setEarnedSession(0);
                  lastWarn.current = null;
                }}
                className={cn(
                  "w-full rounded-2xl border border-gold/60 bg-gold-gradient px-4 py-3 text-sm font-bold text-gold-foreground shadow-gold-glow transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
                )}
              >
                START TAP SESSION
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl border border-border bg-secondary/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Taps</p>
              <p className="mt-2 font-display text-2xl font-bold text-gold">{tapCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Earned</p>
              <p className="mt-2 font-display text-2xl font-bold text-success">{naira(earnedSession)}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-gold/20 bg-gold/5 p-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-gold" />
              Reward per tap
            </span>
            <span className="font-bold text-gold">{naira(currentReward)}</span>
          </div>
        </section>

        <section className="relative grid place-items-center py-3">
          <span className="pointer-events-none absolute h-60 w-60 rounded-full bg-royal/25 blur-3xl" />
          <button
            type="button"
            disabled={isTapButtonDisabled}
            onClick={handleTap}
            aria-label="Tap to earn"
            className={cn(
              "relative grid h-56 w-56 place-items-center overflow-hidden rounded-full border-2 border-gold/70 bg-gradient-to-br from-navy via-card to-navy-deep text-gold shadow-gold-glow backdrop-blur-xl transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-35",
              pressed && "scale-95",
              !isTapButtonDisabled && "hover:scale-[1.02]",
            )}
          >
            <span className="absolute inset-2 rounded-full border border-gold/25" />
            <span className="absolute inset-6 rounded-full bg-gold/5" />
            <span className="absolute inset-0 animate-pulse-glow rounded-full" />
            <img src={eagle} alt="EarnX-Finance" className="pointer-events-none h-28 w-28 object-contain drop-shadow-[0_6px_20px_rgba(0,0,0,0.5)]" />
            <span className="pointer-events-none mt-1 text-[11px] font-bold tracking-[0.32em] text-gold">TAP</span>
            <span className="pointer-events-none text-[10px] text-muted-foreground">+{naira(currentReward)}</span>

            {ripples.map((r) => (
              <span
                key={r.id}
                className="pointer-events-none absolute h-6 w-6 animate-ping rounded-full bg-gold/50"
                style={{ left: r.x - 12, top: r.y - 12 }}
              />
            ))}
          </button>

          {pops.map((p) => (
            <span
              key={p.id}
              className="pointer-events-none absolute animate-fade-up text-sm font-bold text-success"
              style={{ left: `calc(50% + ${p.x - 112}px)`, top: `calc(${p.y}px - 8px)` }}
            >
              +{naira(p.amount)}
            </span>
          ))}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Stat icon={Zap} label="Reward per tap" value={naira(currentReward)} />
          <Stat icon={TrendingUp} label="Total taps" value={(state.total_taps ?? tapCount).toLocaleString("en-NG")} />
          <Stat icon={Gift} label="Session reward" value={naira(earnedSession)} />
          <Stat icon={Timer} label="Session status" value={sessionLabel.replace("TAP SESSION ACTIVE", "Active").replace("SESSION COMPLETED", "Ended").replace("COOLDOWN ACTIVE", "Cooldown").replace("READY TO TAP", "Ready")} />
        </section>
      </div>

      <BottomNav active="tap" />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 shadow-soft">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-secondary text-gold">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-2.5 text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold tracking-tight">{value}</p>
    </div>
  );
}
