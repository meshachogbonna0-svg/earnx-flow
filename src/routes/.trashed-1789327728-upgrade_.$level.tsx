import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BatteryCharging, Check, Loader2, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, PageLoader } from "@/components/dashboard/app-page";
import {
  AntiScamReminder,
  OfficialPaymentNotice,
  PaymentConfirmCheckbox,
  ReportScamButton,
  SecurityBanner,
  VerifiedPaymentCard,
  type PaymentSettings,
} from "@/components/security/payment-security";
import { ReceiptUpload } from "@/components/security/receipt-upload";
import { naira } from "@/lib/format";
import { RequestProcessingCard } from "@/components/dashboard/request-processing";


export const Route = createFileRoute("/upgrade_/$level")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Level Upgrade — EarnX-Finance" },
      {
        name: "description",
        content:
          "Upgrade your EarnX-Finance level for higher tap rewards, a bigger battery and larger daily earning limits.",
      },
      { property: "og:title", content: "Level Upgrade — EarnX-Finance" },
      { property: "og:description", content: "Higher rewards, bigger battery, larger daily limits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UpgradeLevelPage,
});

type Level = {
  level: number;
  name: string;
  upgrade_price: number;
  reward_per_tap: number;
  battery_capacity: number;
  daily_tap_limit: number;
  daily_earnings_limit: number;
  unlimited_battery: boolean;
  benefits: string[];
};

type Settings = PaymentSettings & { withdrawal_instructions?: string };

type UpgradeResult = { ok?: boolean; reason?: string; pending_level?: number; next_level?: number };

const messageFor = (res: UpgradeResult) => {
  switch (res.reason) {
    case "not_activated":
      return "Activate your account before upgrading.";
    case "account_restricted":
      return "Your account is restricted. Please contact support.";
    case "pending_exists":
      return `You already have an upgrade request to Level ${res.pending_level} awaiting review. Wait for it to be approved or rejected first.`;
    case "not_sequential":
      return `Upgrades are sequential. Your next available step is Level ${res.next_level}.`;
    case "already_at_level":
      return "You're already on this plan or higher.";
    case "level_unavailable":
      return "That plan isn't available right now.";
    default:
      return "Upgrade not possible right now. Please try again.";
  }
};



function UpgradeLevelPage() {
  const { level } = useParams({ from: "/upgrade_/$level" });
  const target = Number(level);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Level | null>(null);
  const [current, setCurrent] = useState<Level | null>(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [balance, setBalance] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payerName, setPayerName] = useState("");
  const [reference, setReference] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const [{ data: levels }, { data: p }, { data: s }, { data: reqs }] = await Promise.all([
        supabase.from("levels").select("*").order("level"),
        supabase
          .from("profiles")
          .select("level, balance, first_name, other_names")
          .eq("id", auth.user.id)
          .maybeSingle(),
        supabase
          .from("platform_settings")
          .select("bank_name, account_name, account_number, security_notice, anti_scam_reminder")
          .maybeSingle(),
        supabase
          .from("upgrade_requests" as never)
          .select("id, status")
          .eq("user_id", auth.user.id)
          .eq("status", "pending"),
      ]);
      const all = (levels as Level[]) ?? [];
      const prof = p as { level: number; balance: number; first_name: string; other_names: string } | null;
      const myLevel = prof?.level ?? 0;
      setPlan(all.find((l) => l.level === target) ?? null);
      setCurrent(all.find((l) => l.level === myLevel) ?? null);
      setCurrentLevel(myLevel);
      setBalance(prof?.balance ?? 0);
      setPayerName(`${prof?.first_name ?? ""} ${prof?.other_names ?? ""}`.trim());
      setSettings((s as Settings) ?? null);
      setPending((((reqs as unknown[]) ?? []).length ?? 0) > 0);
      setLoading(false);
    })();
  }, [navigate, target]);

  const upgrade = async () => {
    setBusy(true);
    const call = supabase.rpc.bind(supabase) as unknown as (
      name: string,
      params?: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    const { data, error } = await call("submit_upgrade_request", {
      _level: target,
      _payer_name: payerName,
      _reference: reference,
      _proof_url: proofUrl,
    });
    setBusy(false);
    const res = (data ?? {}) as UpgradeResult;
    if (error)
      return toast.error("Upgrade request failed", {
        description: "Please check your connection and try again.",
      });
    if (!res.ok) {
      if (res.reason === "pending_exists") setPending(true);
      return toast.error(messageFor(res));
    }

    setPending(true);
    toast.success("Upgrade request submitted", { description: "Your receipt is now under Admin review." });
  };


  if (loading) return <PageLoader />;

  if (!plan) {
    return (
      <AppPage title="Level Upgrade" subtitle="Plan not found">
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          This upgrade level isn't available. Go back and pick another plan.
        </p>
      </AppPage>
    );
  }

  const owned = plan.level <= currentLevel;
  const outOfOrder = !owned && plan.level !== currentLevel + 1;


  return (
    <AppPage title={`${plan.name} Upgrade`} subtitle={`Level ${plan.level} · Balance ${naira(balance)}`}>
      <SecurityBanner />

      <section className="animate-fade-up rounded-2xl border border-gold/40 bg-gradient-to-br from-navy via-card to-navy-deep p-5 text-center shadow-gold-glow">
        <p className="text-[10px] tracking-[0.25em] text-muted-foreground">UPGRADE FEE</p>
        <p className="mt-1 font-display text-3xl font-extrabold">
          {plan.upgrade_price > 0 ? naira(plan.upgrade_price) : "Free"}
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Current: {current?.name ?? `Level ${currentLevel}`} → Next: {plan.name}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        <Stat icon={Zap} label="Reward per tap" value={naira(plan.reward_per_tap)} />
        <Stat
          icon={BatteryCharging}
          label="Battery capacity"
          value={plan.unlimited_battery ? "Unlimited" : `${plan.battery_capacity} taps`}
        />
        <Stat
          icon={TrendingUp}
          label="Maximum daily taps"
          value={plan.daily_tap_limit > 0 ? plan.daily_tap_limit.toLocaleString("en-NG") : "Unlimited"}
        />
        <Stat
          icon={TrendingUp}
          label="Daily earnings limit"
          value={plan.daily_earnings_limit > 0 ? naira(plan.daily_earnings_limit) : "Unlimited"}
        />
      </section>

      {plan.benefits?.length > 0 && (
        <section className="animate-fade-up rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
            UPGRADE BENEFITS
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {plan.benefits.map((b) => (
              <li key={b} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" /> {b}
              </li>
            ))}
          </ul>
        </section>
      )}

      {owned ? (
        <RequestProcessingCard kind="upgrade" status="approved" amount={plan.upgrade_price} detail={`Congratulations! Your account is now on ${plan.name}. The approved level benefits are active.`} />
      ) : outOfOrder ? (
        <div className="rounded-2xl border border-border bg-secondary/60 p-5 text-center">
          <p className="text-xs font-bold">Upgrade locked</p>
          <p className="mt-1.5 text-[11px] text-foreground/80">
            Upgrades are sequential. Unlock Level {currentLevel + 1} first before moving to {plan.name}.
          </p>
        </div>
      ) : pending ? (
        <RequestProcessingCard kind="upgrade" status="pending" amount={plan.upgrade_price} detail={`Your Level ${target} bank-transfer upgrade request is under Admin review. No level change occurs until Admin approves it.`} />
      ) : (
        <>
          <VerifiedPaymentCard settings={settings} />
          <OfficialPaymentNotice text={settings?.security_notice} />

          <section className="animate-fade-up space-y-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
              CONFIRM YOUR PAYMENT
            </p>
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">Name used for payment</span>
              <input
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">
                Transfer reference / session ID
              </span>
              <input
                value={reference}
                placeholder="e.g. 1029384756"
                onChange={(e) => setReference(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
              />
            </label>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground">Payment receipt</span>
              <div className="mt-1.5">
                <ReceiptUpload value={proofUrl} onChange={setProofUrl} folder={`upgrade-${target}`} />
              </div>
            </div>
            <PaymentConfirmCheckbox checked={confirmed} onChange={setConfirmed} />
            <button
              type="button"
              disabled={busy || !confirmed || !payerName.trim() || !proofUrl}
              onClick={upgrade}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3 text-xs font-bold text-gold-foreground transition active:scale-[0.98] disabled:opacity-60"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Submit upgrade request
            </button>
            <p className="text-center text-[10px] text-muted-foreground">
              Your level is upgraded once an admin approves your payment receipt.
            </p>
          </section>
        </>
      )}


      <AntiScamReminder text={settings?.anti_scam_reminder} />
      <ReportScamButton />
    </AppPage>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Icon className="h-3 w-3 text-gold" /> {label}
      </p>
      <p className="mt-1 text-xs font-bold">{value}</p>
    </div>
  );
}
