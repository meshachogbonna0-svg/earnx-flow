import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Clock, Hourglass, ShieldCheck, TrendingUp, Wallet, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, EmptyState, PageLoader } from "@/components/dashboard/app-page";
import { naira, dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/requests")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Request Status — EarnX-Finance" },
      {
        name: "description",
        content:
          "Track your EarnX-Finance activation, level upgrade and withdrawal requests with live status and processing timelines.",
      },
      { property: "og:title", content: "Request Status — EarnX-Finance" },
      { property: "og:description", content: "Track activation, upgrade and withdrawal requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RequestsPage,
});

type Kind = "activation" | "upgrade" | "withdrawal";

type Item = {
  id: string;
  kind: Kind;
  reference: string;
  amount: number;
  status: string;
  note: string | null;
  created_at: string;
  reviewed_at: string | null;
  detail: string;
};

const shortId = (id: string) => id.replace(/-/g, "").slice(0, 8).toUpperCase();

const stateOf = (status: string): "pending" | "done" | "rejected" => {
  if (status === "rejected" || status === "failed") return "rejected";
  if (status === "approved" || status === "completed" || status === "activated") return "done";
  return "pending";
};

function RequestsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [eta, setEta] = useState("Within 24 hours");
  const [filter, setFilter] = useState<"all" | Kind>("all");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const uid = auth.user.id;
      const [{ data: acts }, { data: ups }, { data: wds }, { data: s }] = await Promise.all([
        supabase
          .from("activation_requests")
          .select("id, amount, status, admin_note, reference, created_at, reviewed_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("upgrade_requests")
          .select("id, amount, status, admin_note, reference, from_level, to_level, created_at, reviewed_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("withdrawals")
          .select("id, amount, status, admin_note, reference, bank_name, account_number, created_at, reviewed_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase.from("platform_settings").select("withdrawal_processing_time").maybeSingle(),
      ]);

      const rows: Item[] = [
        ...(acts ?? []).map((a) => ({

          id: a.id,
          kind: "activation" as const,
          reference: a.reference || `ACT-${shortId(a.id)}`,
          amount: Number(a.amount),
          status: a.status,
          note: a.admin_note,
          created_at: a.created_at,
          reviewed_at: a.reviewed_at,
          detail: "Account activation payment",
        })),
        ...(ups ?? []).map((u) => ({

          id: u.id,
          kind: "upgrade" as const,
          reference: u.reference || `UPG-${shortId(u.id)}`,
          amount: Number(u.amount),
          status: u.status,
          note: u.admin_note,
          created_at: u.created_at,
          reviewed_at: u.reviewed_at,
          detail: `Level ${u.from_level} → Level ${u.to_level}`,
        })),
        ...(wds ?? []).map((w) => ({

          id: w.id,
          kind: "withdrawal" as const,
          reference: w.reference,
          amount: Number(w.amount),
          status: w.status,
          note: w.admin_note,
          created_at: w.created_at,
          reviewed_at: w.reviewed_at,
          detail: `${w.bank_name} · ${w.account_number}`,
        })),
      ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

      setItems(rows);
      setEta((s as { withdrawal_processing_time?: string })?.withdrawal_processing_time || "Within 24 hours");
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <PageLoader />;

  const shown = filter === "all" ? items : items.filter((i) => i.kind === filter);

  return (
    <AppPage title="Request Status" subtitle="Activation, upgrades and payouts">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", "activation", "upgrade", "withdrawal"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize transition",
              filter === f
                ? "bg-gold-gradient text-gold-foreground"
                : "border border-border bg-card text-muted-foreground",
            )}
          >
            {f === "all" ? "All requests" : `${f}s`}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState text="You have no requests yet." cta={{ label: "Go to dashboard", to: "/dashboard" }} />
      ) : (
        <div className="space-y-3">
          {shown.map((item) => (
            <RequestCard key={`${item.kind}-${item.id}`} item={item} eta={eta} />
          ))}
        </div>
      )}
    </AppPage>
  );
}

const icons = { activation: ShieldCheck, upgrade: TrendingUp, withdrawal: Wallet };

function RequestCard({ item, eta }: { item: Item; eta: string }) {
  const state = stateOf(item.status);
  const Icon = icons[item.kind];

  const steps = [
    { label: "Request submitted", at: item.created_at, done: true },
    {
      label: state === "pending" ? "Under review by our team" : "Reviewed by our team",
      at: item.reviewed_at,
      done: state !== "pending",
    },
    {
      label:
        item.kind === "withdrawal"
          ? state === "rejected"
            ? "Rejected & refunded"
            : "Paid to your bank account"
          : state === "rejected"
            ? "Rejected"
            : item.kind === "upgrade"
              ? "Level unlocked"
              : "Account activated",
      at: state === "pending" ? null : item.reviewed_at,
      done: state === "done",
      failed: state === "rejected",
    },
  ];

  return (
    <article className="animate-fade-up rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-gold">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold capitalize">{item.kind} request</p>
            <p className="truncate text-[10px] text-muted-foreground">{item.detail}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              ID <span className="font-semibold text-foreground">{item.reference}</span>
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-bold text-gold">{naira(item.amount)}</p>
          <span
            className={cn(
              "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
              state === "done"
                ? "bg-success/15 text-success"
                : state === "rejected"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-gold/15 text-gold",
            )}
          >
            {state === "pending" ? "Pending" : state === "done" ? "Approved" : "Rejected"}
          </span>
        </div>
      </div>

      <ol className="mt-3.5 space-y-2.5 border-l border-border pl-4">
        {steps.map((s) => (
          <li key={s.label} className="relative">
            <span
              className={cn(
                "absolute -left-[22px] grid h-4 w-4 place-items-center rounded-full border",
                s.failed
                  ? "border-destructive bg-destructive/20 text-destructive"
                  : s.done
                    ? "border-success bg-success/20 text-success"
                    : "border-gold/50 bg-gold/10 text-gold",
              )}
            >
              {s.failed ? (
                <X className="h-2.5 w-2.5" />
              ) : s.done ? (
                <Check className="h-2.5 w-2.5" />
              ) : (
                <Hourglass className="h-2.5 w-2.5" />
              )}
            </span>
            <p className={cn("text-[11px] font-medium", s.done || s.failed ? "text-foreground" : "text-gold")}>
              {s.label}
            </p>
            {s.at && <p className="text-[10px] text-muted-foreground">{dateTime(s.at)}</p>}
          </li>
        ))}
      </ol>

      {state === "pending" && (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-2 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3 text-gold" /> Estimated completion: {eta}
        </p>
      )}

      {state === "rejected" && item.note && (
        <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-[10px] font-medium text-destructive">
          Reason: {item.note}
        </p>
      )}
    </article>
  );
}
