import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { AppPage, PageLoader } from "@/components/dashboard/app-page";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/activation-confirmation")({ ssr: false, component: ActivationConfirmationPage });

function ActivationConfirmationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => { (async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return navigate({ to: "/login", replace: true });
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("profiles").select("activation").eq("id", auth.user.id).maybeSingle(),
      supabase.from("platform_settings").select("activation_success_message").maybeSingle(),
    ]);
    if ((p as { activation?: string } | null)?.activation !== "activated") return navigate({ to: "/activation-processing", replace: true });
    setMessage(String((s as { activation_success_message?: string } | null)?.activation_success_message ?? "Congratulations! Your account has been activated successfully. Your activated benefits are now available."));
    setLoading(false);
  })(); }, [navigate]);
  if (loading) return <PageLoader />;
  return <AppPage title="Activation Confirmed" subtitle="Your account is ready"><section className="relative overflow-hidden rounded-3xl border border-success/40 bg-success/10 p-7 text-center"><div className="pointer-events-none absolute inset-0 grid place-items-center opacity-20"><Sparkles className="h-40 w-40 text-gold animate-pulse" /></div><CheckCircle2 className="relative mx-auto h-16 w-16 text-success" /><h2 className="relative mt-4 text-2xl font-extrabold">Congratulations!</h2><p className="relative mt-2 text-xs leading-relaxed text-foreground/80">{message}</p><button onClick={() => navigate({ to: "/dashboard" })} className="relative mt-6 w-full rounded-xl bg-gold-gradient py-3 text-xs font-bold text-gold-foreground">Go to Dashboard</button></section></AppPage>;
}
