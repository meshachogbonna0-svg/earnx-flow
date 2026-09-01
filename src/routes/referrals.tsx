import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, PageLoader, EmptyState } from "@/components/dashboard/app-page";
import { naira, dateOnly } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/referrals")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Referral & Earn — EarnX-Finance" },
      {
        name: "description",
        content: "Invite friends to EarnX-Finance and earn a cash bonus for every activated referral.",
      },
      { property: "og:title", content: "Referral & Earn — EarnX-Finance" },
      { property: "og:description", content: "Earn a bonus for every friend you invite." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReferralsPage,
});

type Referral = {
  id: string;
  status: string;
  reward: number;
  created_at: string;
  referred_id: string;
};

function ReferralsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [reward, setReward] = useState(0);
  const [rows, setRows] = useState<Referral[]>([]);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const [{ data: p }, { data: s }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("referral_code").eq("id", auth.user.id).maybeSingle(),
        supabase.from("platform_settings").select("referral_reward").maybeSingle(),
        supabase
          .from("referrals")
          .select("id, status, reward, created_at, referred_id")
          .eq("referrer_id", auth.user.id)
          .order("created_at", { ascending: false }),
      ]);
      setCode((p as { referral_code: string })?.referral_code ?? "");
      setReward((s as { referral_reward: number })?.referral_reward ?? 0);
      setRows((r as Referral[]) ?? []);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <PageLoader />;

  const link = `${origin}/register?ref=${code}`;
  const earned = rows.filter((r) => r.status === "rewarded").reduce((s, r) => s + Number(r.reward), 0);

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: "Join EarnX-Finance", text: "Tap. Earn. Grow.", url: link });
      return;
    }
    await navigator.clipboard.writeText(link);
    toast.success("Referral link copied");
  };

  return (
    <AppPage title="Referral & Earn" subtitle={`Earn ${naira(reward)} per activated friend`}>
      <section className="animate-fade-up rounded-2xl border border-gold/40 bg-gradient-to-br from-navy via-card to-navy-deep p-5 text-center shadow-gold-glow">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-gold/50 bg-gold/10">
          <Users className="h-5 w-5 text-gold" />
        </span>
        <p className="mt-3 text-[10px] tracking-[0.25em] text-muted-foreground">YOUR REFERRAL CODE</p>
        <p className="mt-1 font-display text-2xl font-extrabold tracking-[0.2em] text-gold">{code}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(link);
              toast.success("Referral link copied");
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/70 py-2.5 text-[11px] font-semibold transition active:scale-[0.98]"
          >
            <Copy className="h-3.5 w-3.5" /> Copy link
          </button>
          <button
            type="button"
            onClick={share}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-gradient py-2.5 text-[11px] font-bold text-gold-foreground transition active:scale-[0.98]"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <p className="text-[11px] text-muted-foreground">Total invites</p>
          <p className="mt-0.5 text-base font-bold">{rows.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <p className="text-[11px] text-muted-foreground">Referral earnings</p>
          <p className="mt-0.5 text-base font-bold text-success">{naira(earned)}</p>
        </div>
      </section>

      <section>
        <h2 className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">YOUR REFERRALS</h2>
        <div className="mt-3">
          {rows.length === 0 ? (
            <EmptyState text="No referrals yet — share your link to start earning." />
          ) : (
            <div className="rounded-2xl border border-border bg-card">
              {rows.map((r, i) => (
                <div
                  key={r.id}
                  className={cn("flex items-center gap-3 p-3.5", i > 0 && "border-t border-border")}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-royal/15 text-royal">
                    <Users className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">Referred user</p>
                    <p className="text-[10px] text-muted-foreground">{dateOnly(r.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-success">{naira(r.reward)}</p>
                    <p
                      className={cn(
                        "text-[10px] capitalize",
                        r.status === "rewarded" ? "text-success" : "text-gold",
                      )}
                    >
                      {r.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AppPage>
  );
}
