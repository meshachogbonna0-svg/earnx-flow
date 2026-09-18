import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Clipboard, Gift, Hand, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, PageLoader, EmptyState } from "@/components/dashboard/app-page";
import { naira, dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transactions")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Transaction History — EarnX-Finance" },
      {
        name: "description",
        content: "Full history of your EarnX-Finance taps, tasks, referrals, bonuses and withdrawals.",
      },
      { property: "og:title", content: "Transaction History — EarnX-Finance" },
      { property: "og:description", content: "Every credit and debit on your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransactionsPage,
});

type Txn = {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
};

const icons: Record<string, typeof Hand> = {
  tap: Hand,
  task: Clipboard,
  referral: Users,
  withdrawal: ArrowUpRight,
  welcome_bonus: Gift,
  promotion: Gift,
};

const filters = ["all", "tap", "task", "referral", "withdrawal"] as const;

function TransactionsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Txn[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const { data } = await supabase
        .from("transactions")
        .select("id, type, amount, description, status, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data as Txn[]) ?? []);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <PageLoader />;

  const visible = filter === "all" ? rows : rows.filter((r) => r.type === filter);

  return (
    <AppPage title="Transactions" subtitle="Every credit and debit on your account">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
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
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState text="No transactions here yet." />
      ) : (
        <div className="rounded-2xl border border-border bg-card">
          {visible.map((t, i) => {
            const negative = t.type === "withdrawal" || t.type === "upgrade" || Number(t.amount) < 0;
            const Icon = icons[t.type] ?? Gift;
            return (
              <div key={t.id} className={cn("flex items-center gap-3 p-3.5", i > 0 && "border-t border-border")}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-royal/15 text-royal">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{t.description || t.type}</p>
                  <p className="text-[10px] text-muted-foreground">{dateTime(t.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-xs font-bold", negative ? "text-destructive" : "text-success")}>
                    {negative ? "-" : "+"} {naira(Math.abs(Number(t.amount)))}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] capitalize",
                      t.status === "completed" ? "text-muted-foreground" : "text-gold",
                    )}
                  >
                    {t.status}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppPage>
  );
}
