import { useState } from "react";
import { AlertTriangle, BadgeCheck, Building2, Copy, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type PaymentSettings = {
  bank_name: string;
  account_name: string;
  account_number: string;
  security_notice?: string | null;
  anti_scam_reminder?: string | null;
};

export const DEFAULT_SECURITY_NOTICE =
  "For your security, ONLY make payments to the official EARNX-FINANCE bank account displayed on this page. Never send money to any individual claiming to represent EARNX-FINANCE through WhatsApp, Telegram, Facebook, Instagram, X (Twitter), email, SMS, phone calls, or any other third party. EARNX-FINANCE will NEVER ask you to pay into a personal account. Always verify the Account Name and Account Number before making payment. After payment, upload your receipt ONLY through this page. EARNX-FINANCE is NOT responsible for payments made to unofficial accounts, scammers, agents, or third parties.";

export const DEFAULT_ANTI_SCAM =
  "Stay Safe: Never trust payment instructions received from individuals or unofficial social media accounts. Always use the payment details displayed on this page.";

export function VerifiedBadge({ label = "Verified Official" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
      <BadgeCheck className="h-3 w-3" /> {label}
    </span>
  );
}

export function SecurityBanner() {
  return (
    <section className="animate-fade-up rounded-2xl border border-gold/50 bg-navy-deep/70 p-3.5 shadow-soft">
      <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-gold">
        <ShieldCheck className="h-3.5 w-3.5" /> SECURITY REMINDER
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
        For your protection, always verify that the payment details below display the{" "}
        <span className="font-semibold text-success">Verified Official</span> badge before making any payment.
        Never send money to any account without it.
      </p>
    </section>
  );
}

export function OfficialPaymentNotice({ text }: { text?: string | null }) {
  return (
    <section className="animate-fade-up rounded-2xl border border-gold/50 bg-navy-deep/70 p-4 shadow-soft">
      <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-gold">
        <ShieldAlert className="h-3.5 w-3.5" /> OFFICIAL PAYMENT NOTICE
      </p>
      <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-foreground/90">
        {text?.trim() || DEFAULT_SECURITY_NOTICE}
      </p>
      <p className="mt-2.5 flex items-start gap-1.5 text-[11px] font-semibold text-gold">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        If anyone asks you to send payment to another account, stop immediately and contact Official Support.
      </p>
    </section>
  );
}

export function AntiScamReminder({ text }: { text?: string | null }) {
  return (
    <p className="flex items-start gap-1.5 rounded-xl border border-border bg-secondary/40 p-3 text-[10px] leading-relaxed text-muted-foreground">
      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
      {text?.trim() || DEFAULT_ANTI_SCAM}
    </p>
  );
}

export function VerifiedPaymentCard({ settings }: { settings: PaymentSettings | null }) {
  const copy = () => {
    void navigator.clipboard.writeText(settings?.account_number ?? "");
    toast.success("Official EARNX-FINANCE payment account copied", {
      description: "Please verify the Account Name before making payment.",
    });
  };

  return (
    <section className="animate-fade-up rounded-2xl border border-gold/40 bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
          <Building2 className="h-3 w-3" /> OFFICIAL PAYMENT ACCOUNT
        </p>
        <VerifiedBadge label="Verified Official Payment Account" />
      </div>
      <div className="mt-3 space-y-2 text-xs">
        <Row label="Bank" value={settings?.bank_name ?? ""} />
        <Row label="Account Name" value={settings?.account_name ?? ""} />
        <Row label="Account Number" value={settings?.account_number ?? ""} />
      </div>
      <button
        type="button"
        onClick={copy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gold/50 bg-gold/10 py-2.5 text-xs font-bold text-gold transition active:scale-[0.98]"
      >
        <Copy className="h-3.5 w-3.5" /> Copy account number
      </button>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-secondary/60 px-3 py-2">
      <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

export function PaymentConfirmCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-secondary/40 p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[oklch(0.82_0.15_85)]"
      />
      <span className="text-[11px] leading-relaxed text-muted-foreground">
        I confirm that I made payment ONLY to the official EARNX-FINANCE bank account displayed on this page.
      </span>
    </label>
  );
}

export function ReportScamButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    scammer_name: "",
    phone: "",
    whatsapp: "",
    telegram: "",
    social_link: "",
    screenshot_url: "",
    description: "",
  });

  const submit = async () => {
    if (!form.description.trim()) return toast.error("Please describe what happened.");
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("fraud_reports").insert({
      user_id: auth.user?.id ?? null,
      scammer_name: form.scammer_name,
      phone: form.phone,
      whatsapp: form.whatsapp,
      telegram: form.telegram,
      social_link: form.social_link,
      screenshot_url: form.screenshot_url || null,
      description: form.description,
    });
    setBusy(false);
    if (error) return toast.error("Could not send report", { description: error.message });
    toast.success("Report submitted", { description: "Our fraud team will review it shortly." });
    setOpen(false);
    setForm({
      scammer_name: "",
      phone: "",
      whatsapp: "",
      telegram: "",
      social_link: "",
      screenshot_url: "",
      description: "",
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/50 bg-destructive/10 py-2.5 text-xs font-bold text-destructive transition active:scale-[0.98]",
          className,
        )}
      >
        <ShieldAlert className="h-3.5 w-3.5" /> Report Scam
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-0 sm:place-items-center sm:p-4">
          <div className="animate-fade-up max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-soft sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-sm font-bold text-destructive">
                <ShieldAlert className="h-4 w-4" /> Report a scam
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-xs text-muted-foreground transition active:scale-90"
              >
                Close
              </button>
            </div>
            <div className="mt-3 space-y-2.5">
              {(
                [
                  ["Suspected scammer name", "scammer_name", ""],
                  ["Phone number", "phone", ""],
                  ["WhatsApp number", "whatsapp", ""],
                  ["Telegram username", "telegram", "@"],
                  ["Social media link", "social_link", "https://"],
                  ["Screenshot link (JPG, PNG, WEBP)", "screenshot_url", "https://"],
                ] as const
              ).map(([label, key, ph]) => (
                <label key={key} className="block">
                  <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                  <input
                    value={form[key]}
                    placeholder={ph}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
                  />
                </label>
              ))}
              <label className="block">
                <span className="text-[11px] font-medium text-muted-foreground">What happened?</span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
                />
              </label>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3 text-xs font-bold text-gold-foreground transition active:scale-[0.98] disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Submit report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
