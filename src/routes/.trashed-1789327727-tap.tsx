import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BatteryCharging, Loader2, ShieldCheck, Timer, TrendingUp, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/dashboard/bottom-nav";
const eagle = "/earnx-eagle-logo.png";
import { naira } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tap")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Tap to Earn — EarnX-Finance" },
      {
        name: "description",
        content:
          "Tap to earn real Naira rewards on EarnX-Finance. Track your battery, cooldown, daily limits and earnings in real time.",
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
};

type Pop = { id: number; x: number; y: number; amount: number };
type Ripple = { id: number; x: number; y: number };

function countdown(until: string | null | undefined) {
  if (!until) return null;
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h > 0 ? `${h}h ` : ""}${m}m ${String(s).padStart(2, "0")}s`;
}

function TapPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<TapState>({});
  const [pops, setPops] = useState<Pop[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [pressed, setPressed] = useState(false);
  const [tick, setTick] = useState(0);
  const idRef = useRef(0);
  const lastWarn = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const { data } = await rpc("tap_state");
      if (!active) return;
      setState(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    const t = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  const cooldownLabel = countdown(state.cooldown_until);

  // refresh once the cooldown elapses
  useEffect(() => {
    if (state.cooldown_until && !cooldownLabel) {
      void rpc("tap_state").then(({ data }) => setState(data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const warn = useCallback((reason: string) => {
    const message = reasons[reason] ?? "You can't tap right now.";
    if (lastWarn.current === reason) return;
    lastWarn.current = reason;
    toast.error(message, { id: "tap-warning" });
  }, []);

  const handleTap = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      setPressed(true);
      window.setTimeout(() => setPressed(false), 130);
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rid = ++idRef.current;
      setRipples((prev) => [...prev, { id: rid, x, y }]);
      window.setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== rid)), 600);

      const { data, error } = await rpc("perform_tap");
      if (error) {
        warn("network");
        return;
      }
      setState((prev) => ({
        ...prev,
        battery: typeof data.battery === "number" ? data.battery : prev.battery,
        capacity: typeof data.capacity === "number" ? data.capacity : prev.capacity,
        cooldown_until: data.cooldown_until ?? (data.ok ? null : prev.cooldown_until),
      }));

      if (!data.ok) {
        warn(data.reason ?? "");
        return;
      }
      lastWarn.current = null;
      setState((prev) => ({
        ...prev,
        balance: data.balance ?? prev.balance,
        earned_today: data.earned_today ?? prev.earned_today,
        taps_today: data.taps_today ?? prev.taps_today,
        total_taps: (prev.total_taps ?? 0) + 1,
        total_earned: (prev.total_earned ?? 0) + (data.reward ?? 0),
        reward_per_tap: data.reward ?? prev.reward_per_tap,
      }));

      const pid = ++idRef.current;
      setPops((prev) => [...prev, { id: pid, x, y, amount: data.reward ?? 0 }]);
      window.setTimeout(() => setPops((prev) => prev.filter((p) => p.id !== pid)), 900);
    },
    [warn],
  );

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const capacity = state.capacity ?? 1;
  const battery = state.unlimited_battery ? capacity : (state.battery ?? 0);
  const pct = capacity > 0 ? Math.min(100, Math.round((battery / capacity) * 100)) : 0;
  const tapLimit = state.daily_tap_limit ?? 0;
  const tapPct =
    state.unlimited_taps || tapLimit === 0
      ? 100
      : Math.min(100, Math.round(((state.taps_today ?? 0) / tapLimit) * 100));
  const earnLimit = state.daily_earnings_limit ?? 0;
  const earnPct =
    earnLimit === 0 ? 100 : Math.min(100, Math.round(((state.earned_today ?? 0) / earnLimit) * 100));
  const activated = state.activation === "activated";
  const blocked = !activated || !state.tapping_enabled || Boolean(cooldownLabel);

  return (
    <div className="min-h-screen bg-background bg-hero-glow pb-28">
      <div className="mx-auto w-full max-w-md space-y-4 px-4 pt-6 sm:max-w-lg">
        <header className="animate-fade-up text-center">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground">TAP TO EARN</p>
          <p className="mt-1.5 font-display text-3xl font-extrabold tracking-tight">
            {naira(state.balance ?? 0)}
          </p>
          <div className="mt-2 flex items-center justify-center gap-2 text-[10px]">
            <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 font-semibold text-gold">
              {state.level_name ?? `Level ${state.level ?? 0}`}
            </span>
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold",
                activated
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive",
              )}
            >
              <ShieldCheck className="h-3 w-3" />
              {activated ? "Activated" : "Not activated"}
            </span>
            {(state.multiplier ?? 1) > 1 && (
              <span className="rounded-full bg-royal/20 px-2.5 py-1 font-semibold text-royal">
                x{state.multiplier} boost
              </span>
            )}
          </div>
        </header>

        {/* Battery */}
        <section className="animate-fade-up rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 font-semibold text-gold">
              <BatteryCharging className="h-4 w-4" /> Battery
            </span>
            <span className="text-muted-foreground">
              {state.unlimited_battery ? "Unlimited" : `${battery} / ${capacity} taps left`}
            </span>
          </div>
          <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gold-gradient transition-all duration-500"
              style={{ width: `${state.unlimited_battery ? 100 : pct}%` }}
            />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Timer className="h-3 w-3 text-gold" />
            {cooldownLabel
              ? `Recharging — ready in ${cooldownLabel}`
              : state.unlimited_battery
                ? "Your plan never runs out of energy"
                : `Recharges ${state.recharge_amount ?? 0} taps every ${state.recharge_minutes ?? 0} min`}
          </p>
        </section>

        {/* Tap button */}
        <section className="relative grid place-items-center py-3">
          <span className="pointer-events-none absolute h-60 w-60 rounded-full bg-royal/25 blur-3xl" />
          <button
            type="button"
            onClick={handleTap}
            aria-label="Tap to earn"
            className={cn(
              "relative grid h-56 w-56 place-items-center overflow-hidden rounded-full",
              "border-2 border-gold/70 bg-gradient-to-br from-navy via-card to-navy-deep",
              "shadow-gold-glow backdrop-blur-xl transition-transform duration-150",
              pressed ? "scale-95" : "hover:scale-[1.02]",
              blocked && "opacity-70 grayscale-[0.35]",
            )}
          >
            <span className="absolute inset-2 rounded-full border border-gold/25" />
            <span className="absolute inset-6 rounded-full bg-gold/5" />
            <span className="absolute inset-0 animate-pulse-glow rounded-full" />
            <img src={eagle} alt="EarnX-Finance" className="pointer-events-none h-28 w-28 object-contain drop-shadow-[0_6px_20px_rgba(0,0,0,0.5)]" />
            <span className="pointer-events-none mt-1 text-[11px] font-bold tracking-[0.32em] text-gold">TAP</span>
            <span className="pointer-events-none text-[10px] text-muted-foreground">
              +{naira(state.reward_per_tap ?? 0)}
            </span>

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

        {/* Daily progress */}
        <section className="animate-fade-up space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">DAILY PROGRESS</p>
          <Progress
            label={`Taps today ${state.taps_today ?? 0}${tapLimit > 0 && !state.unlimited_taps ? ` / ${tapLimit}` : ""}`}
            pct={tapPct}
          />
          <Progress
            label={`Earned today ${naira(state.earned_today ?? 0)}${earnLimit > 0 ? ` / ${naira(earnLimit)}` : ""}`}
            pct={earnPct}
          />
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3">
          <Stat icon={Zap} label="Reward per tap" value={naira(state.reward_per_tap ?? 0)} />
          <Stat icon={TrendingUp} label="Total taps" value={(state.total_taps ?? 0).toLocaleString("en-NG")} />
          <Stat icon={Zap} label="Today's earnings" value={naira(state.earned_today ?? 0)} />
          <Stat icon={TrendingUp} label="Total earnings" value={naira(state.total_earned ?? 0)} />
        </section>
      </div>

      <BottomNav active="tap" />
    </div>
  );
}

function Progress({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-gold-gradient transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
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
