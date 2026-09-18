import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { rpc } from "@/lib/rpc";
import { naira, dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ReceiptViewer } from "@/components/admin/receipt-viewer";
import { RejectDialog } from "@/components/admin/reject-dialog";

export type Kind = "activation" | "upgrade" | "withdrawal";

type Row = {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  full_name?: string | null;
  amount: number;
  payer_name?: string | null;
  reference: string | null;
  proof_url?: string | null;
  status: string;
  admin_note: string | null;
  from_level?: number;
  to_level?: number;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  created_at: string;
  reviewed_at: string | null;
};

const isPending = (kind: Kind, status: string) =>
  kind === "withdrawal" ? status === "processing" || status === "approved" || status === "pending" : status === "pending";

const titles: Record<Kind, string> = {
  activation: "Activation Requests",
  upgrade: "Upgrade Requests",
  withdrawal: "Withdrawal Requests",
};

/** Shared admin review queue for activation, upgrade and withdrawal requests. */
export function RequestsQueue({ kind }: { kind: Kind }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"pending" | "all">("pending");
  const [rejecting, setRejecting] = useState<Row | null>(null);

  const load = async () => {
    const { data, error } = await rpc<{ ok: boolean; rows: Row[] }>("admin_requests", { _kind: kind });
    if (error) toast.error("Could not load requests");
    setRows(data?.rows ?? []);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const approve = async (row: Row) => {
    setBusy(row.id);
    const { data, error } =
      kind === "withdrawal"
        ? await rpc<{ ok: boolean }>("admin_review_withdrawal", { _withdrawal_id: row.id, _status: "completed" })
        : await rpc<{ ok: boolean }>(kind === "activation" ? "admin_review_activation" : "admin_review_upgrade", {
            _request_id: row.id,
            _approve: true,
          });
    setBusy(null);
    if (error || !data?.ok) return toast.error("Could not approve this request");
    toast.success(kind === "withdrawal" ? "Marked as paid" : "Request approved");
    void load();
  };

  const reject = async (reason: string) => {
    if (!rejecting) return;
    setBusy(rejecting.id);
    const { data, error } =
      kind === "withdrawal"
        ? await rpc<{ ok: boolean }>("admin_review_withdrawal", {
            _withdrawal_id: rejecting.id,
            _status: "rejected",
            _note: reason,
          })
        : await rpc<{ ok: boolean }>(kind === "activation" ? "admin_review_activation" : "admin_review_upgrade", {
            _request_id: rejecting.id,
            _approve: false,
            _note: reason,
          });
    setBusy(null);
    setRejecting(null);
    if (error || !data?.ok) return toast.error("Could not reject this request");
    toast.success("Request rejected — the user has been notified");
    void load();
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status === "pending" && !isPending(kind, r.status)) return false;
      if (!q) return true;
      return [r.username, r.email, r.reference, r.payer_name, r.account_name, r.account_number]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, query, status, kind]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold">{titles[kind]}</p>
        <div className="flex gap-1.5">
          {(["pending", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize transition",
                status === s ? "bg-gold-gradient text-gold-foreground" : "border border-border text-muted-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search user, reference or account"
          className="w-full bg-transparent py-2.5 text-xs outline-none"
        />
      </div>

      {loading && <Loader2 className="h-4 w-4 animate-spin text-gold" />}
      {!loading && shown.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          No {status === "pending" ? "pending " : ""}requests here.
        </p>
      )}

      {shown.map((r) => (
        <article key={r.id} className="space-y-2.5 rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">
                {r.full_name?.trim() || r.account_name || r.payer_name || "Unnamed user"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                @{r.username ?? "unknown"} · {r.email ?? "no email"}
              </p>
              {kind === "upgrade" && (
                <p className="text-[10px] text-muted-foreground">
                  Level {r.from_level} → Level {r.to_level}
                </p>
              )}
              {kind === "withdrawal" && (
                <p className="text-[10px] text-muted-foreground">
                  {r.bank_name} · {r.account_number}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">
                Ref {r.reference ?? "—"} · {dateTime(r.created_at)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-bold text-gold">{naira(Number(r.amount))}</p>
              <p className="text-[10px] capitalize text-muted-foreground">{r.status}</p>
            </div>
          </div>

          {kind !== "withdrawal" && <ReceiptViewer url={r.proof_url} label={`Receipt · ${r.reference ?? ""}`} />}

          {isPending(kind, r.status) ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => approve(r)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-success/15 py-2 text-[11px] font-bold text-success transition active:scale-[0.98]"
              >
                {busy === r.id && <Loader2 className="h-3 w-3 animate-spin" />}
                {kind === "withdrawal" ? "Mark as paid" : "Approve"}
              </button>
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => setRejecting(r)}
                className="flex-1 rounded-xl bg-destructive/15 py-2 text-[11px] font-bold text-destructive transition active:scale-[0.98]"
              >
                {kind === "withdrawal" ? "Reject & refund" : "Reject"}
              </button>
            </div>
          ) : (
            r.admin_note && (
              <p className="rounded-xl bg-secondary/60 px-3 py-2 text-[10px] text-muted-foreground">
                Note: {r.admin_note}
              </p>
            )
          )}
        </article>
      ))}

      <RejectDialog
        open={Boolean(rejecting)}
        busy={busy === rejecting?.id}
        title={`Reject ${kind} request`}
        onCancel={() => setRejecting(null)}
        onConfirm={reject}
      />
    </section>
  );
}
