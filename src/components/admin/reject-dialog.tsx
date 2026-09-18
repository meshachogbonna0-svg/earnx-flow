import { useState } from "react";
import { Loader2 } from "lucide-react";

const presets = [
  "Receipt is unclear or unreadable",
  "Payment amount does not match",
  "No payment found on our account",
  "Receipt belongs to another transaction",
  "Suspected fraudulent receipt",
];

/** Modal that forces the admin to give a rejection reason before rejecting. */
export function RejectDialog({
  open,
  title,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-background/85 p-4 backdrop-blur">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-card">
        <p className="text-sm font-bold text-destructive">{title}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          The user will see this reason, so keep it clear and polite.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setReason(p)}
              className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground transition active:scale-95"
            >
              {p}
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection"
          className="mt-3 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
        />

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border py-2.5 text-[11px] font-semibold text-muted-foreground transition active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-destructive py-2.5 text-[11px] font-bold text-destructive-foreground transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" />} Reject
          </button>
        </div>
      </div>
    </div>
  );
}
