import { useEffect, useState } from "react";
import { Loader2, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { rpc } from "@/lib/rpc";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Ticket = {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  subject: string;
  description: string;
  screenshot_url: string | null;
  status: string;
  admin_reply: string | null;
  created_at: string;
};

/** Admin support inbox — read tickets and reply, which notifies the user. */
export function SupportInbox() {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await rpc<{ rows: Ticket[] }>("admin_requests", { _kind: "support" });
    setRows(data?.rows ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const send = async (ticket: Ticket, status: string) => {
    if (!reply.trim()) return toast.error("Write a reply first");
    setBusy(true);
    const { data, error } = await rpc<{ ok: boolean }>("admin_reply_ticket", {
      _ticket_id: ticket.id,
      _reply: reply.trim(),
      _status: status,
    });
    setBusy(false);
    if (error || !data?.ok) return toast.error("Could not send the reply");
    toast.success("Reply sent to the user");
    setReply("");
    setOpenId(null);
    void load();
  };

  const q = query.trim().toLowerCase();
  const shown = rows.filter(
    (r) => !q || [r.username, r.email, r.subject].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
  );

  return (
    <section className="space-y-3">
      <p className="text-xs font-bold">Support Tickets</p>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tickets"
          className="w-full bg-transparent py-2.5 text-xs outline-none"
        />
      </div>

      {loading && <Loader2 className="h-4 w-4 animate-spin text-gold" />}
      {!loading && shown.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          No support tickets yet.
        </p>
      )}

      {shown.map((t) => (
        <article key={t.id} className="space-y-2 rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{t.subject}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                @{t.username ?? "unknown"} · {dateTime(t.created_at)}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                t.status === "resolved" || t.status === "closed" ? "bg-success/15 text-success" : "bg-gold/15 text-gold",
              )}
            >
              {t.status}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">{t.description}</p>
          {t.screenshot_url && (
            <a
              href={t.screenshot_url}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-[10px] font-semibold text-royal underline"
            >
              View attachment
            </a>
          )}
          {t.admin_reply && (
            <p className="rounded-xl border border-gold/30 bg-gold/5 p-2.5 text-[11px] text-gold">{t.admin_reply}</p>
          )}

          {openId === t.id ? (
            <div className="space-y-2">
              <textarea
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply to this user"
                className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-[11px] outline-none focus:border-gold/60"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => send(t, "resolved")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-gradient py-2 text-[11px] font-bold text-gold-foreground transition active:scale-[0.98]"
                >
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Reply & resolve
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => send(t, "open")}
                  className="flex-1 rounded-xl border border-border py-2 text-[11px] font-semibold text-muted-foreground transition active:scale-[0.98]"
                >
                  Reply only
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpenId(t.id);
                setReply("");
              }}
              className="w-full rounded-xl border border-gold/40 py-2 text-[11px] font-semibold text-gold transition active:scale-[0.98]"
            >
              Reply to user
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
