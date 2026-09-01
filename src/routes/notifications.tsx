import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, PageLoader, EmptyState } from "@/components/dashboard/app-page";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Notifications — EarnX-Finance" },
      {
        name: "description",
        content: "Account alerts, payout updates and reward announcements from EarnX-Finance.",
      },
      { property: "og:title", content: "Notifications — EarnX-Finance" },
      { property: "og:description", content: "Alerts, payouts and announcements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});

type Note = {
  id: string;
  title: string;
  body: string;
  category: string;
  read: boolean;
  user_id: string | null;
  created_at: string;
};

function NotificationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Note[]>([]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, category, read, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((data as Note[]) ?? []);
      setLoading(false);
    })();
  }, [navigate]);

  const markAll = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", auth.user.id).eq("read", false);
    setRows((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (loading) return <PageLoader />;

  return (
    <AppPage
      title="Notifications"
      subtitle="Alerts, payouts and announcements"
      action={
        <button
          type="button"
          onClick={markAll}
          className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold text-muted-foreground transition active:scale-95"
        >
          <CheckCheck className="h-3 w-3" /> Mark all
        </button>
      }
    >
      {rows.length === 0 ? (
        <EmptyState text="You're all caught up — no notifications yet." />
      ) : (
        <div className="space-y-2.5">
          {rows.map((n) => (
            <article
              key={n.id}
              className={cn(
                "animate-fade-up rounded-2xl border p-3.5",
                n.read ? "border-border bg-card" : "border-gold/40 bg-gold/5",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-gold">
                  <Bell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-xs font-bold", n.read ? "text-foreground" : "text-gold")}>{n.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/80">{n.body}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{dateTime(n.created_at)}</p>

                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppPage>
  );
}
