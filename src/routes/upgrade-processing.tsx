import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock3, Loader2, XCircle } from "lucide-react";
import { AppPage, PageLoader } from "@/components/dashboard/app-page";
import { supabase } from "@/integrations/supabase/client";
import { naira } from "@/lib/format";

export const Route = createFileRoute("/upgrade-processing")({ ssr: false, validateSearch: (s: Record<string, unknown>) => ({ level: String(s.level ?? "") }), component: UpgradeProcessingPage });

type Req = { status: string; admin_note: string | null; requested_level: number; amount: number };
function UpgradeProcessingPage() {
  const navigate = useNavigate(); const { level } = useSearch({ from: "/upgrade-processing" });
  const [loading, setLoading] = useState(true); const [req, setReq] = useState<Req | null>(null);
  useEffect(() => { let alive=true; const load=async()=>{ const {data:auth}=await supabase.auth.getUser(); if(!auth.user) return navigate({to:"/login",replace:true}); const {data}=await supabase.from("upgrade_requests").select("status, admin_note, requested_level, amount").eq("user_id",auth.user.id).order("created_at",{ascending:false}).limit(1).maybeSingle(); if(!alive)return; const r=data as Req|null; setReq(r); setLoading(false); if(r && (r.status==="approved" || r.status==="completed")) navigate({to:"/upgrade-confirmation",search:{level:String(r.requested_level)},replace:true}); }; void load(); const t=window.setInterval(()=>void load(),5000); return()=>{alive=false;window.clearInterval(t)}; },[navigate,level]);
  if(loading)return <PageLoader/>;
  if(req?.status==="rejected")return <AppPage title="Upgrade Request" subtitle="Action required"><section className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6 text-center"><XCircle className="mx-auto h-12 w-12 text-destructive"/><h2 className="mt-3 text-xl font-extrabold">Upgrade Rejected</h2><p className="mt-2 text-sm text-foreground/80">{req.admin_note||"Your upgrade request was rejected. Please review the reason and submit a new receipt."}</p><button onClick={()=>navigate({to:"/upgrade"})} className="mt-5 w-full rounded-xl bg-gold-gradient py-3 text-xs font-bold text-gold-foreground">Review Upgrade</button></section></AppPage>;
  return <AppPage title="Upgrade Processing" subtitle="Your payment is being reviewed"><section className="rounded-3xl border border-gold/40 bg-gradient-to-br from-navy via-card to-navy-deep p-7 text-center shadow-gold-glow"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-gold/40 bg-gold/10"><Clock3 className="h-7 w-7 animate-pulse text-gold"/></div><h2 className="mt-5 text-xl font-extrabold">Upgrade Processing</h2><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Your Level {req?.requested_level ?? level} payment receipt has been received. Our team is reviewing it. Your level will change only after approval.</p>{req?.amount!==undefined&&<p className="mt-4 font-display text-2xl font-extrabold text-gold">{naira(req.amount)}</p>}<div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin text-gold"/> Checking status automatically</div><button onClick={()=>navigate({to:"/requests"})} className="mt-6 w-full rounded-xl border border-border bg-background/40 py-3 text-xs font-semibold">View request history</button></section></AppPage>;
}
