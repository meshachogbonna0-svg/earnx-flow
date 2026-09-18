import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, PageLoader } from "@/components/dashboard/app-page";
import { naira } from "@/lib/format";

export const Route = createFileRoute("/activate-confirmation")({
  ssr: false,
  component: ActivationConfirmationPage,
});

function ActivationConfirmationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [fee, setFee] = useState(0);

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const { data } = await supabase.from("platform_settings").select("activation_fee").maybeSingle();
      setFee(Number((data as { activation_fee?: number } | null)?.activation_fee ?? 0));
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <PageLoader />;

  return (
    <AppPage title="Activate Account" subtitle="One-time activation confirmation">
      <section className="animate-fade-up rounded-3xl border border-gold/40 bg-gradient-to-br from-navy via-card to-navy-deep p-6 text-center shadow-gold-glow">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-gold/40 bg-gold/10">
          <ShieldCheck className="h-8 w-8 text-gold" />
        </div>
        <p className="mt-5 text-[10px] font-bold tracking-[0.2em] text-gold">ACCOUNT ACTIVATION</p>
        <h2 className="mt-2 text-xl font-extrabold">You’re about to activate your account</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Please confirm that you want to continue. Your account will remain able to earn, but activation is required before you can withdraw.
        </p>
        {fee > 0 && <p className="mt-5 text-2xl font-extrabold text-gold">{naira(fee)}</p>}
        <p className="mt-2 text-[11px] text-muted-foreground">One-time bank-transfer activation</p>
        <button
          type="button"
          onClick={() => navigate({ to: "/activate" })}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3.5 text-xs font-bold text-gold-foreground transition active:scale-[0.98]"
        >
          Next — Continue to activation <ArrowRight className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => navigate({ to: "/dashboard" })} className="mt-3 w-full rounded-xl border border-border bg-background/40 py-3 text-xs font-semibold">
          Not now
        </button>
      </section>
    </AppPage>
  );
}
