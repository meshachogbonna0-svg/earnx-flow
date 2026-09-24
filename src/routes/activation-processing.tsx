import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock3, Loader2, XCircle } from "lucide-react";
import { AppPage, PageLoader } from "@/components/dashboard/app-page";
import { supabase } from "@/integrations/supabase/client";
import { naira } from "@/lib/format";

export const Route = createFileRoute("/activation-processing")({ ssr: false, component: ActivationProcessingPage });

type Req = { status: string; admin_note: string | null; created_at: string; reference: string | null; amount: number | null };

function ActivationProcessingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [req, setReq] = useState<Req | null>(null);
  const [fee, setFee] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return navigate({ to: "/login", replace: true });
      const { data: prof } = await supabase.from("profiles").select("level").eq("id", auth.user.id).maybeSingle();
      const lvl = Number((prof as { level?: number } | null)?.level ?? 1);
      const [{ data: row }, { data: settings }, { data: lv }] = await Promise.all([
        supabase.from("activation_requests").select("status, admin_note, created_at, reference, amount").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("platform_settings").select("activation_fee").maybeSingle(),
        supabase.from("levels").select("activation_fee").eq("level", lvl).maybeSingle(),
      ]);
      if (!alive) return;
      const r = row as Req | null;
      setReq(r);
      const reqAmt = Number(r?.amount ?? 0);
      const lvlFee = Number((lv as { activation_fee?: number } | null)?.activation_fee ?? 0);
      setFee(reqAmt > 0 ? reqAmt : lvlFee > 0 ? lvlFee : Number((settings as { activation_fee?: number } | null)?.activation_fee ?? 0));
      setLoading(false);
      if (r?.status === "approved" || r?.status === "activated") navigate({ to: "/activation-confirmation", replace: true });
    };
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [navigate]);

  if (loading) return <PageLoader />;
  if (req?.status === "rejected") return <AppPage title="Activation Request" subtitle="Action required"><section className="relative overflow-hidden rounded-3xl border border-destructive/40 bg-destructive/10 p-6 text-center"><XCircle className="mx-auto h-12 w-12 text-destructive" /><h2 className="mt-3 text-xl font-extrabold">Activation Rejected</h2><p className="mt-2 text-sm text-foreground/80">{req.admin_note || "Your activation request was rejected. Please review your receipt and try again."}</p><button onClick={() => navigate({ to: "/activate" })} className="mt-5 w-full rounded-xl bg-gold-gradient py-3 text-xs font-bold text-gold-foreground">Review & Resubmit</button></section></AppPage>;

  return <AppPage title="Activation Processing" subtitle="Your request is safely under review"><section className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-navy via-card to-navy-deep p-7 text-center shadow-gold-glow"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-gold/40 bg-gold/10"><Clock3 className="h-7 w-7 animate-pulse text-gold" /></div><h2 className="mt-5 text-xl font-extrabold">Activation Processing</h2><p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">Our team has received your activation request and receipt. It is currently being reviewed. We will update your account after approval.</p><p className="mt-4 font-display text-2xl font-extrabold text-gold">{naira(fee)}</p><div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin text-gold" /> Checking status automatically</div><button onClick={() => navigate({ to: "/requests" })} className="mt-6 w-full rounded-xl border border-border bg-background/40 py-3 text-xs font-semibold">View request history</button></section></AppPage>;
}
