import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BatteryCharging, Check, Lock, ShieldCheck, TrendingUp, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, PageLoader } from "@/components/dashboard/app-page";
import { naira } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/upgrade")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Upgrade Your Plan — EarnX-Finance" },
      {
        name: "description",
        content:
          "Upgrade your EarnX-Finance level for higher tap rewards, bigger batteries and larger daily earning limits.",
      },
      { property: "og:title", content: "Upgrade Your Plan — EarnX-Finance" },
      { property: "og:description", content: "Higher rewards, bigger battery, larger daily limits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UpgradePage,
});

type Level = {
  level: number;
  name: string;
  upgrade_price: number;
  activation_fee: number;
  reward_per_tap: number;
  battery_capacity: number;
  daily_tap_limit: number;
  daily_earnings_limit: number;
  unlimited_battery: boolean;
  benefits: string[];
};

type Pending = { to_level: number; created_at: string } | null;

function UpgradePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [levels, setLevels] = useState<Level[]>([]);
  const [current, setCurrent] = useState(0);
  const [balance, setBalance] = useState(0);
  const [activation, setActivation] = useState("not_activated");
  const [pending, setPending] = useState<Pending>(null);
  const [popup, setPopup] = useState<string | null>(null);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    const [{ data: l }, { data: p }, { data: req }] = await Promise.all([
      supabase.from("levels").select("*").eq("enabled", true).order("level"),
      supabase.from("profiles").select("level, balance, activation").eq("id", auth.user.id).maybeSingle(),
      supabase
        .from("upgrade_requests")
        .select("to_level, created_at")
        .eq("user_id", auth.user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setLevels((l as Level[]) ?? []);
    setCurrent((p as { level: number })?.level ?? 0);
    setBalance((p as { balance: number })?.balance ?? 0);
    setActivation((p as { activation?: string })?.activation ?? "not_activated");
    setPending((req as Pending) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <PageLoader />;

  const nextLevel = current + 1;

  return (
    <AppPage title="Upgrade Plan" subtitle={`Balance: ${naira(balance)}`}>
      {pending && (
        <div className="animate-fade-up rounded-2xl border border-gold/40 bg-gold/10 p-4">
          <p className="text-xs font-bold text-gold">Upgrade request pending</p>
          <p className="mt-1 text-[11px] text-foreground/80">
            Your request to move to Level {pending.to_level} is being reviewed. You can't start another
            upgrade until it's approved or rejected.
          </p>
          <Link
            to="/requests"
            className="mt-2.5 inline-flex rounded-full border border-gold/50 px-3 py-1.5 text-[10px] font-semibold text-gold"
          >
            Track this request
          </Link>
        </div>
      )}

      <p className="rounded-xl bg-secondary/60 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
        Upgrades are sequential — you can only move up one level at a time, so Level {nextLevel} must be
        unlocked before Level {nextLevel + 1}.
      </p>

      <div className="space-y-4">
        {levels.map((lv) => {
          const isCurrent = lv.level === current;
          const owned = lv.level <= current;
          const isNext = lv.level === nextLevel;
          const locked = !owned && !isNext;
          const blockedByPending = Boolean(pending) && isNext;

          return (
            <article
              key={lv.level}
              className={cn(
                "animate-fade-up rounded-2xl border p-4 shadow-soft",
                isCurrent
                  ? "border-gold/60 bg-gold/5 shadow-gold-glow"
                  : isNext
                    ? "border-royal/50 bg-card"
                    : "border-border bg-card",
                locked && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{lv.name}</p>
                  <p className="text-[10px] text-muted-foreground">Level {lv.level}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-extrabold text-gold">
                    {lv.upgrade_price > 0 ? naira(lv.upgrade_price) : "Free"}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-royal">
                    Activation: {lv.activation_fee > 0 ? naira(lv.activation_fee) : "Not configured"}
                  </p>
                  {isCurrent && <p className="text-[10px] font-semibold text-success">Current plan</p>}
                  {isNext && !pending && <p className="text-[10px] font-semibold text-royal">Next step</p>}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                <Stat icon={Zap} label="Per tap" value={naira(lv.reward_per_tap)} />
                <Stat
                  icon={BatteryCharging}
                  label="Battery"
                  value={lv.unlimited_battery ? "Unlimited" : `${lv.battery_capacity} taps`}
                />
                <Stat
                  icon={TrendingUp}
                  label="Daily taps"
                  value={lv.daily_tap_limit > 0 ? lv.daily_tap_limit.toLocaleString("en-NG") : "Unlimited"}
                />
                <Stat
                  icon={TrendingUp}
                  label="Daily cap"
                  value={lv.daily_earnings_limit > 0 ? naira(lv.daily_earnings_limit) : "Unlimited"}
                />
              </div>

              <div
                className={cn(
                  "mt-3 flex items-start gap-2 rounded-xl border p-2.5 text-[10px]",
                  isCurrent && activation === "activated"
                    ? "border-success/30 bg-success/10 text-success"
                    : isCurrent
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-border bg-secondary/50 text-muted-foreground",
                )}
              >
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>{isCurrent && activation === "activated" ? "Current level activated" : "Activation required separately"}</strong>
                  <br />
                  {isCurrent && activation === "activated"
                    ? "Withdrawal eligibility can now be checked against the remaining limits."
                    : "Admin approval of an upgrade never activates the new level automatically."}
                </span>
              </div>

              {lv.benefits?.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {lv.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" /> {b}
                    </li>
                  ))}
                </ul>
              )}

              {owned ? (
                <span className="mt-3 flex w-full items-center justify-center rounded-xl border border-border bg-secondary py-2.5 text-xs font-bold text-muted-foreground">
                  {isCurrent ? "Your current plan" : "Unlocked"}
                </span>
              ) : locked || blockedByPending ? (
                <button
                  type="button"
                  onClick={() =>
                    setPopup(
                      blockedByPending
                        ? `You already have an upgrade request to Level ${pending?.to_level} awaiting review. Wait for it to be approved or rejected before starting another upgrade.`
                        : `Upgrades follow the order Level 1 → 2 → 3. Unlock ${
                            levels.find((x) => x.level === nextLevel)?.name ?? `Level ${nextLevel}`
                          } first before you can move to ${lv.name}.`,
                    )
                  }
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary py-2.5 text-xs font-bold text-muted-foreground transition active:scale-[0.98]"
                >
                  <Lock className="h-3.5 w-3.5" /> {blockedByPending ? "Request pending" : "Locked"}
                </button>
              ) : (
                <Link
                  to="/upgrade/$level"
                  params={{ level: String(lv.level) }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient py-2.5 text-xs font-bold text-gold-foreground transition active:scale-[0.98]"
                >
                  Upgrade to {lv.name}
                </Link>
              )}
            </article>
          );
        })}
      </div>

      {popup && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-background/85 p-4 backdrop-blur">
          <div className="w-full max-w-sm rounded-2xl border border-gold/40 bg-card p-5 text-center shadow-gold-glow">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-gold/15 text-gold">
              <Lock className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-bold">Upgrade locked</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-foreground/80">{popup}</p>
            <button
              type="button"
              onClick={() => setPopup(null)}
              className="mt-4 w-full rounded-xl bg-gold-gradient py-2.5 text-xs font-bold text-gold-foreground transition active:scale-[0.98]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </AppPage>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-secondary/60 p-2.5">
      <p className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3 text-gold" /> {label}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold">{value}</p>
    </div>
  );
}

