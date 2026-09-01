import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { naira } from "@/lib/format";

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

  return (
    <section className={cn(
      "animate-fade-up rounded-2xl border p-5 text-center shadow-soft",
      rejected ? "border-destructive/40 bg-destructive/10" : done ? "border-success/40 bg-success/10" : "border-gold/40 bg-gold/10",
    )}>
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-background/60">
        {rejected ? <XCircle className="h-6 w-6 text-destructive" /> : done ? <CheckCircle2 className="h-6 w-6 text-success" /> : <Clock3 className="h-6 w-6 text-gold" />}
      </div>
      <h2 className="mt-3 text-base font-extrabold">{title}</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-foreground/80">{detail}</p>
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
