import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gift, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, PageLoader, EmptyState } from "@/components/dashboard/app-page";
import { dateOnly } from "@/lib/format";

export const Route = createFileRoute("/promotions")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Promotions & Bonuses — EarnX-Finance" },
      {
        name: "description",
        content: "Live EarnX-Finance promotions, seasonal bonuses and limited-time reward campaigns.",
      },
      { property: "og:title", content: "Promotions & Bonuses — EarnX-Finance" },
      { property: "og:description", content: "Limited-time bonuses and reward campaigns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PromotionsPage,
});

type Promo = {
  id: string;
  title: string;
  description: string;
  banner_url: string | null;
  reward_details: string;
  starts_at: string;
  ends_at: string;
};

function PromotionsPage() {
  const [loading, setLoading] = useState(true);
  const [promos, setPromos] = useState<Promo[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("promotions")
        .select("id, title, description, banner_url, reward_details, starts_at, ends_at")
        .eq("active", true)
        .order("created_at", { ascending: false });
      setPromos((data as Promo[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <>
      <AppPage nav="promotions" title="Promotions" subtitle="Limited-time bonuses and campaigns">
        {promos.length === 0 ? (
          <EmptyState text="No active promotions right now. New campaigns drop regularly." />
        ) : (
          <div className="space-y-4">
            {promos.map((p) => (
              <article
                key={p.id}
                className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
              >
                {p.banner_url ? (
                  <img src={p.banner_url} alt={p.title} loading="lazy" className="h-32 w-full object-cover" />
                ) : (
                  <div className="grid h-24 w-full place-items-center bg-royal-gradient">
                    <Megaphone className="h-7 w-7 text-royal-foreground" />
                  </div>
                )}
                <div className="p-4">
                  <p className="text-sm font-semibold">{p.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{p.description}</p>
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/5 p-2.5">
                    <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    <p className="text-[11px] font-medium text-gold">{p.reward_details}</p>
                  </div>
                  <p className="mt-2.5 text-[10px] text-muted-foreground">
                    {dateOnly(p.starts_at)} — {dateOnly(p.ends_at)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </AppPage>
    </>
  );
}
