import { useEffect, useState, type CSSProperties } from "react";
import { CheckCircle2, Clock3, XCircle, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { naira } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";


function LiveCelebration() {
  const pieces = Array.from({ length: 28 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden" aria-hidden="true">
      {pieces.map((i) => (
        <span
          key={i}
          className="earnx-confetti absolute left-1/2 top-5 h-2 w-1.5 rounded-full"
          style={{
            "--x": `${((i * 37) % 220) - 110}px`,
            "--r": `${(i * 71) % 360}deg`,
            "--d": `${(i % 7) * 0.09}s`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

export function RequestProcessingCard({
  kind,
  status,
  amount,
  reference,
  detail,
  note,
}: {
  kind: "activation" | "upgrade" | "withdrawal";
  status: string;
  amount?: number;
  reference?: string | null;
  detail: string;
  note?: string | null;
}) {
  const [platformMessages, setPlatformMessages] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    void supabase.from("platform_settings").select("activation_processing_message,activation_success_message,activation_rejection_message,upgrade_processing_message,upgrade_success_message,upgrade_rejection_message,withdrawal_processing_message,withdrawal_success_message,withdrawal_rejection_message").maybeSingle()
      .then(({ data }) => { if (active && data) setPlatformMessages(data as Record<string, string>); });
    return () => { active = false; };
  }, []);
  const rejected = status === "rejected" || status === "failed";
  const done = status === "approved" || status === "completed" || status === "activated";
  const title = rejected
    ? `${kind[0].toUpperCase()}${kind.slice(1)} Rejected`
    : done
      ? kind === "upgrade"
        ? "Congratulations! Upgrade Approved"
        : kind === "activation"
          ? "Congratulations! Account Activated"
          : "Withdrawal Completed"
      : kind === "upgrade"
        ? "Upgrade Processing"
        : kind === "activation"
          ? "Activation Processing"
          : "Withdrawal Processing";

  const configuredMessage = rejected
    ? platformMessages[`${kind}_rejection_message`]
    : done
      ? platformMessages[`${kind}_success_message`]
      : platformMessages[`${kind}_processing_message`];
  const displayDetail = configuredMessage || detail;

  return (
    <section className={cn(
      "relative animate-fade-up overflow-hidden rounded-2xl border p-5 text-center shadow-soft",
      rejected ? "border-destructive/40 bg-destructive/10" : done ? "border-success/40 bg-success/10" : "border-gold/40 bg-gold/10",
    )}>
      {done && <LiveCelebration />}
      {done && <Sparkles className="mx-auto mb-1 h-4 w-4 animate-pulse text-gold" />}
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-background/60">
        {rejected ? <XCircle className="h-6 w-6 text-destructive" /> : done ? <CheckCircle2 className="h-6 w-6 text-success" /> : <Clock3 className="h-6 w-6 text-gold" />}
      </div>
      <h2 className="mt-3 text-base font-extrabold">{title}</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-foreground/80">{displayDetail}</p>
      {amount !== undefined && <p className="mt-2 text-lg font-extrabold">{naira(amount)}</p>}
      {reference && <p className="mt-1 text-[10px] text-muted-foreground">Reference: <span className="font-semibold text-foreground">{reference}</span></p>}
      {rejected && note && <p className="mt-3 rounded-xl border border-destructive/30 bg-background/50 px-3 py-2 text-[10px] font-medium text-destructive">Reason: {note}</p>}
      <div className="mt-4 flex gap-2">
        <Link to="/requests" className="flex-1 rounded-xl bg-gold-gradient py-2.5 text-[11px] font-bold text-gold-foreground">View Request Status</Link>
        <Link to="/dashboard" className="flex-1 rounded-xl border border-border bg-background/50 py-2.5 text-[11px] font-semibold">Dashboard</Link>
      </div>
    </section>
  );
}
