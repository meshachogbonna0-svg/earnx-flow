import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2, ShieldCheck } from "lucide-react";
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


export const Route = createFileRoute("/activate")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Activate Your Account — EarnX-Finance" },
      {
        name: "description",
        content:
          "Activate your EarnX-Finance account to unlock tapping rewards, tasks, referrals and withdrawals.",
      },
      { property: "og:title", content: "Activate Your Account — EarnX-Finance" },
      { property: "og:description", content: "Unlock tapping, tasks and withdrawals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivatePage,
});

type Settings = PaymentSettings & {
  activation_fee: number;
  activation_instructions: string;
};

const reasons: Record<string, string> = {
  already_activated: "Your account is already activated.",
  pending: "Your activation is already under review.",
  unauthenticated: "Please sign in again to continue.",
};

const benefits = [
  "Unlock tap-to-earn rewards on every level",
  "Access daily tasks and promotion rewards",
  "Enable withdrawals to your bank account",
  "Earn referral bonuses from every invite",
];

function ActivatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<string>("not_activated");
  const [requestNote, setRequestNote] = useState<string | null>(null);
  const [payerName, setPayerName] = useState("");
  const [reference, setReference] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const [{ data: s }, { data: p }, { data: req }] = await Promise.all([
        supabase
          .from("platform_settings")
          .select(
            "activation_fee, activation_instructions, bank_name, account_name, account_number, security_notice, anti_scam_reminder",
          )
          .maybeSingle(),
        supabase.from("profiles").select("activation, first_name").eq("id", auth.user.id).maybeSingle(),
        supabase.from("activation_requests").select("status, admin_note").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setSettings((s as Settings) ?? null);
      setStatus((p as { activation: string })?.activation ?? "not_activated");
      setRequestNote((req as { admin_note?: string | null } | null)?.admin_note ?? null);
      setPayerName((p as { first_name: string })?.first_name ?? "");
      setLoading(false);
    })();
  }, [navigate]);

  const submit = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("submit_activation", {
      _payer_name: payerName,
      _reference: reference,
      _proof_url: proofUrl,
    });
    setBusy(false);
    const res = (data ?? {}) as { ok?: boolean; reason?: string; auto?: boolean };
    if (error)
      return toast.error("We couldn't submit your payment", {
        description: "Please check your connection and try again.",
      });
    if (!res.ok) return toast.error(reasons[res.reason ?? ""] ?? "Could not submit your request.");
    setStatus("pending");
    toast.success("Activation request submitted", { description: "Your receipt is now under Admin review." });
  };

  if (loading) return <PageLoader />;

  return (
    <AppPage title="Account Activation" subtitle="One-time payment to unlock full earning">
      <SecurityBanner />

      <section className="animate-fade-up rounded-2xl border border-gold/40 bg-gradient-to-br from-navy via-card to-navy-deep p-5 text-center shadow-gold-glow">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-gold/50 bg-gold/10">
          <ShieldCheck className="h-5 w-5 text-gold" />
        </span>
        <p className="mt-3 text-[10px] tracking-[0.25em] text-muted-foreground">ACTIVATION FEE</p>
        <p className="mt-1 font-display text-3xl font-extrabold">{naira(settings?.activation_fee ?? 0)}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {settings?.activation_instructions}
        </p>
      </section>

      <section className="animate-fade-up rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
          ACTIVATION BENEFITS
        </p>
        <ul className="mt-2.5 space-y-1.5">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" /> {b}
            </li>
          ))}
        </ul>
      </section>

      {status === "activated" ? (
        <RequestProcessingCard kind="activation" status="activated" amount={settings?.activation_fee ?? 0} detail="Your activation has been approved by Admin. Your account is now active and the activated benefits are available." />
      ) : status === "rejected" ? (
        <RequestProcessingCard kind="activation" status="rejected" amount={settings?.activation_fee ?? 0} detail="Your activation request was rejected by Admin. Review the reason below before submitting a new request." note={requestNote} />
      ) : status === "pending" ? (
        <RequestProcessingCard kind="activation" status="pending" amount={settings?.activation_fee ?? 0} detail="Your bank-transfer receipt has been received. Admin is reviewing your activation request. You will be notified after approval or rejection." />
      ) : (
        <>
          <VerifiedPaymentCard settings={settings} />
          <OfficialPaymentNotice text={settings?.security_notice} />

          <section className="animate-fade-up space-y-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
              CONFIRM YOUR PAYMENT
            </p>
            <Field label="Name used for payment" value={payerName} onChange={setPayerName} />
            <Field
              label="Transfer reference / session ID"
              value={reference}
              onChange={setReference}
              placeholder="e.g. 1029384756"
            />
            <div>
              <span className="text-[11px] font-medium text-muted-foreground">Payment receipt</span>
              <div className="mt-1.5">
                <ReceiptUpload value={proofUrl} onChange={setProofUrl} folder="activation" />
              </div>
            </div>

            <PaymentConfirmCheckbox checked={confirmed} onChange={setConfirmed} />
            <button
              type="button"
              disabled={busy || !confirmed || !payerName.trim() || !proofUrl}
              onClick={submit}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3 text-xs font-bold text-gold-foreground transition active:scale-[0.98] disabled:opacity-60"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Submit receipt
            </button>
          </section>
        </>
      )}

      <AntiScamReminder text={settings?.anti_scam_reminder} />
      <ReportScamButton />
    </AppPage>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
      />
    </label>
  );
}
