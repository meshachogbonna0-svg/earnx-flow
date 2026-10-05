import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Clock3, Gift, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import { AppPage, PageLoader } from "@/components/dashboard/app-page";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { naira } from "@/lib/format";
import { rpc } from "@/lib/rpc";

type BonusSettings = {
  welcome_bonus?: number | null;
  welcome_bonus_enabled?: boolean | null;
  welcome_bonus_expiry?: string | null;
  welcome_bonus_expires_at?: string | null;
  welcome_bonus_title?: string | null;
  welcome_bonus_message?: string | null;
  welcome_bonus_announcement?: string | null;
};

type ClaimResult = { ok?: boolean; reason?: string; message?: string; amount?: number; balance?: number };

const reasonMessages: Record<string, string> = {
  already_claimed: "You have already claimed this welcome bonus.",
  disabled: "The welcome bonus is not available right now.",
  expired: "This welcome bonus has expired.",
  unauthenticated: "Please sign in again to claim your welcome bonus.",
  questionnaire_required: "The secure claim service is not ready for this new claim flow yet.",
};

const expiryOf = (settings: BonusSettings | null) => settings?.welcome_bonus_expires_at ?? settings?.welcome_bonus_expiry ?? null;
const formattedExpiry = (value: string | null) => value ? new Date(value).toLocaleString("en-NG", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }) : null;

export const Route = createFileRoute("/questionnaire")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Claim Your Welcome Bonus — EarnX-Finance" },
    { name: "description", content: "Claim your secure EarnX-Finance welcome bonus before it expires." },
    { property: "og:title", content: "Claim Your Welcome Bonus — EarnX-Finance" },
    { property: "og:description", content: "Claim your secure EarnX-Finance welcome bonus before it expires." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: WelcomeBonusPage,
});

function WelcomeBonusPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [settings, setSettings] = useState<BonusSettings | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return navigate({ to: "/login", replace: true });
      const [{ data: profile, error: profileError }, { data: rawSettings, error: settingsError }] = await Promise.all([
        supabase.from("profiles").select("welcome_bonus_claimed").eq("id", auth.user.id).maybeSingle(),
        supabase.from("platform_settings").select("*").maybeSingle(),
      ]);
      if (!active) return;
      if (profileError || settingsError) setError("Welcome bonus details are unavailable right now. Please try again shortly.");
      setClaimed(Boolean(profile?.welcome_bonus_claimed));
      setSettings((rawSettings ?? null) as BonusSettings | null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => { const timer = window.setInterval(() => setTick((value) => value + 1), 1000); return () => window.clearInterval(timer); }, []);

  const expiry = expiryOf(settings);
  const expiryMs = expiry ? new Date(expiry).getTime() : Number.NaN;
  const expired = Number.isFinite(expiryMs) && expiryMs <= Date.now();
  const enabled = settings?.welcome_bonus_enabled !== false;
  const amount = Number(settings?.welcome_bonus ?? 0);
  const canClaim = enabled && !expired && !claimed && amount > 0 && !claiming;
  const countdown = useMemo(() => {
    void tick;
    if (!Number.isFinite(expiryMs)) return null;
    const total = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return `${days > 0 ? `${days}d ` : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [expiryMs, tick]);

  async function claim() {
    if (!canClaim) return;
    setClaiming(true); setError(null);
    const { data, error: claimError } = await rpc<ClaimResult>("claim_welcome_bonus");
    setClaiming(false);
    if (claimError || !data?.ok) {
      const message = data?.message ?? reasonMessages[data?.reason ?? ""] ?? claimError?.message ?? "Your welcome bonus could not be claimed. Please try again.";
      setError(message); toast.error(message); return;
    }
    setClaimedAmount(Number(data.amount ?? amount));
    setClaimed(true);
  }

  if (loading) return <PageLoader />;
  if (claimedAmount !== null) return <ClaimSuccess amount={claimedAmount} onContinue={() => navigate({ to: "/dashboard", replace: true })} />;

  return <AppPage nav={false} title="Welcome Bonus" subtitle="A secure reward from EarnX-Finance">
    <section className="relative overflow-hidden rounded-3xl border border-gold/35 bg-gradient-to-br from-navy via-card to-navy-deep p-5 text-center shadow-gold-glow">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-gold/30 bg-gold/10 text-gold"><Gift className="h-8 w-8" /></div>
      <p className="mt-5 text-xs font-semibold text-gold">Dear User,</p>
      <h1 className="mt-2 font-display text-xl font-extrabold">{settings?.welcome_bonus_title || "You have been given a Welcome Bonus by EarnX Finance."}</h1>
      <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-muted-foreground">{settings?.welcome_bonus_message || "Claim your welcome bonus before it expires."}</p>
      <div className="my-6 rounded-2xl border border-gold/30 bg-gold/10 p-5"><p className="text-[10px] font-bold tracking-[0.18em] text-gold">WELCOME BONUS</p><p className="mt-2 font-display text-4xl font-extrabold text-gold">{naira(amount)}</p></div>

      {expired ? <Status icon={AlertCircle} title="Welcome Bonus Expired" text={`Your welcome bonus expired${formattedExpiry(expiry) ? ` on ${formattedExpiry(expiry)}` : ""}.`} tone="error" />
        : claimed ? <Status icon={CheckCircle2} title="Welcome Bonus Claimed" text="This welcome bonus has already been added to your account." tone="success" />
        : !enabled ? <Status icon={AlertCircle} title="Welcome Bonus Unavailable" text="The welcome bonus is currently disabled." tone="error" />
        : <div className="rounded-2xl border border-border bg-background/30 p-3"><p className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground"><Clock3 className="h-4 w-4 text-gold" />{formattedExpiry(expiry) ? `Expires: ${formattedExpiry(expiry)}` : "Expiry has not been supplied by the administrator"}</p>{countdown && <p className="mt-2 font-display text-lg font-bold tabular-nums text-gold">{countdown}</p>}</div>}

      {settings?.welcome_bonus_announcement && <p className="mt-4 rounded-xl border border-royal/30 bg-royal/10 p-3 text-xs text-muted-foreground">{settings.welcome_bonus_announcement}</p>}
      {error && <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}
      <div className="mt-5 space-y-2">
        {!claimed && <Button type="button" disabled={!canClaim} onClick={() => void claim()} className="h-12 w-full bg-gold text-sm font-bold text-gold-foreground hover:bg-gold/90">{claiming ? <Loader2 className="animate-spin" /> : <Sparkles />}{claiming ? "Claiming securely…" : "Claim Welcome Bonus"}</Button>}
        {claimed && <Button type="button" onClick={() => navigate({ to: "/dashboard", replace: true })} className="h-12 w-full bg-gold text-sm font-bold text-gold-foreground hover:bg-gold/90">Go to Dashboard</Button>}
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-success" />Claim validation and crediting are handled securely.</p>
    </section>
  </AppPage>;
}

function Status({ icon: Icon, title, text, tone }: { icon: typeof AlertCircle; title: string; text: string; tone: "error" | "success" }) {
  return <div className={tone === "success" ? "rounded-2xl border border-success/30 bg-success/10 p-4" : "rounded-2xl border border-destructive/30 bg-destructive/10 p-4"}><Icon className={tone === "success" ? "mx-auto h-6 w-6 text-success" : "mx-auto h-6 w-6 text-destructive"} /><p className="mt-2 text-sm font-bold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{text}</p></div>;
}

function ClaimSuccess({ amount, onContinue }: { amount: number; onContinue: () => void }) {
  const pieces = Array.from({ length: 42 }, (_, index) => index);
  return <div className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-background px-5"><div className="pointer-events-none absolute inset-0" aria-hidden="true">{pieces.map((index) => <span key={index} className="earnx-confetti absolute left-1/2 top-1/3 h-2.5 w-1.5 rounded-full" style={{ "--x": `${((index * 47) % 320) - 160}px`, "--r": `${(index * 83) % 360}deg`, "--d": `${(index % 9) * 0.08}s` } as CSSProperties} />)}</div><section className="relative w-full max-w-sm rounded-3xl border border-gold/40 bg-gradient-to-br from-navy via-card to-navy-deep p-7 text-center shadow-gold-glow"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-success/40 bg-success/10"><CheckCircle2 className="h-10 w-10 text-success" /></div><Sparkles className="mx-auto mt-4 h-5 w-5 text-gold" /><h1 className="mt-3 font-display text-xl font-extrabold">Welcome Bonus Claimed!</h1><p className="mt-2 text-xs text-muted-foreground">{naira(amount)} has been added to your EarnX balance.</p><Button type="button" onClick={onContinue} className="mt-6 h-12 w-full bg-gold font-bold text-gold-foreground hover:bg-gold/90">Go to Dashboard</Button></section></div>;
}