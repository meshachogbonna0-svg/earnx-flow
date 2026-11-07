import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Clock3, Headset, Loader2, X } from "lucide-react";
import { AppPage, PageLoader } from "@/components/dashboard/app-page";
import { supabase } from "@/integrations/supabase/client";
import { naira, dateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "@/styles/withdrawal-status.css";

export const Route = createFileRoute("/withdrawal-processing")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({ id: String(search.id ?? "") }),
  component: WithdrawalProcessingPage,
});

type WithdrawalRequest = {
  id: string;
  status: string;
  amount: number;
  reference: string | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

function WithdrawalProcessingPage() {
  const navigate = useNavigate();
  const { id } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<WithdrawalRequest | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      let query = supabase
        .from("withdrawals")
        .select("id, status, amount, reference, admin_note, created_at, reviewed_at")
        .eq("user_id", auth.user.id);
      query = id ? query.eq("id", id) : query.order("created_at", { ascending: false }).limit(1);
      const { data, error } = await query.maybeSingle();
      if (!alive) return;
      setLoadError(Boolean(error));
      setRequest((data as WithdrawalRequest | null) ?? null);
      setLoading(false);
    };
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [id, navigate]);

  if (loading) return <PageLoader />;
  if (!request) {
    return (
      <AppPage title="Withdrawal Status" subtitle="We could not find that request">
        <section className="rounded-3xl border border-border bg-card p-6 text-center">
          <h2 className="font-display text-xl font-extrabold">Status unavailable</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {loadError ? "Your withdrawal status could not be loaded. Please try again." : "No withdrawal request was found."}
          </p>
          <Button asChild className="mt-6 h-12 w-full rounded-xl bg-gold-gradient text-gold-foreground">
            <Link to="/requests">View request history</Link>
          </Button>
        </section>
      </AppPage>
    );
  }

  // Only render final-result screens for the decision actually stored on the request.
  if (request.status === "rejected") {
    return (
      <AppPage title="Withdrawal Status" subtitle="Decision recorded" nav={false} className="withdrawal-result-page">
        <StatusPanel
          tone="error"
          icon={<X className="status-x-mark h-12 w-12 stroke-[3]" aria-hidden="true" />}
          eyebrow="WITHDRAWAL DECLINED"
          title="Withdrawal Request Rejected!"
          message="Unfortunately, your withdrawal request has been rejected. Please review your withdrawal details or contact our support team for assistance."
          request={request}
        >
          {request.admin_note && (
            <p className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-left text-sm leading-6 text-foreground">
              Admin reason: {request.admin_note}
            </p>
          )}
          <Button asChild className="mt-6 h-12 w-full rounded-xl bg-gold-gradient text-gold-foreground">
            <Link to="/support"><Headset /> Contact Support</Link>
          </Button>
          <Button asChild variant="outline" className="mt-3 h-12 w-full rounded-xl">
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
        </StatusPanel>
      </AppPage>
    );
  }

  if (request.status === "approved" || request.status === "completed") {
    return (
      <AppPage title="Withdrawal Status" subtitle="Decision recorded" nav={false} className="withdrawal-result-page">
        <StatusPanel
          tone="success"
          icon={<Check className="status-check-mark h-12 w-12 stroke-[3]" aria-hidden="true" />}
          eyebrow="WITHDRAWAL APPROVED"
          title="Withdrawal Approved Successfully!"
          message="Congratulations! Your withdrawal request has been approved successfully. Your transaction has been processed."
          request={request}
        >
          {request.reviewed_at && <Detail label="Approval date" value={dateTime(request.reviewed_at)} />}
          <Button asChild className="mt-6 h-12 w-full rounded-xl bg-gold-gradient text-gold-foreground">
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
        </StatusPanel>
      </AppPage>
    );
  }

  return (
    <AppPage title="Withdrawal Processing" subtitle="Your payout request is under review">
      <section className="rounded-3xl border border-gold/35 bg-gradient-to-br from-navy via-card to-navy-deep p-6 text-center shadow-gold-glow">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gold/10 text-gold"><Clock3 className="h-10 w-10 animate-pulse" /></span>
        <p className="mt-5 text-[10px] font-bold tracking-[0.2em] text-gold">REQUEST RECEIVED</p>
        <h2 className="mt-2 font-display text-xl font-extrabold">Withdrawal Processing</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Your withdrawal request is awaiting review. This page checks for updates automatically.</p>
        <p className="mt-5 font-display text-3xl font-extrabold text-gold">{naira(request.amount)}</p>
        <p className="mt-2 break-all text-xs text-muted-foreground">Reference: {request.reference || "Not supplied"}</p>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-gold" /> Checking status automatically</div>
        <Button asChild variant="outline" className="mt-6 h-12 w-full rounded-xl"><Link to="/requests">View request history</Link></Button>
      </section>
    </AppPage>
  );
}

function StatusPanel({
  tone,
  icon,
  eyebrow,
  title,
  message,
  request,
  children,
}: {
  tone: "error" | "success";
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  message: string;
  request: WithdrawalRequest;
  children: React.ReactNode;
}) {
  const positive = tone === "success";
  return (
    <section className={cn(
      "withdrawal-status-panel animate-fade-up relative mt-5 flex w-full flex-col justify-center overflow-hidden rounded-3xl border bg-gradient-to-b p-5 text-center shadow-card sm:p-8",
      positive ? "border-success/35 from-success/10 to-card" : "border-destructive/35 from-destructive/10 to-card",
    )}>
      <span className={cn(
        "status-icon-ring mx-auto grid h-24 w-24 shrink-0 place-items-center rounded-full",
        positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
      )}>{icon}</span>
      <p className={cn("mt-5 text-[10px] font-bold tracking-[0.22em]", positive ? "text-success" : "text-destructive")}>{eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{message}</p>
      <div className="mt-5 space-y-3 rounded-2xl border border-border bg-background/35 p-4 text-left">
        <Detail label="Withdrawal amount" value={naira(request.amount)} emphasis />
        <Detail label="Transaction reference" value={request.reference || "Not supplied"} />
      </div>
      {children}
    </section>
  );
}

function Detail({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 break-all text-right", emphasis && "font-bold text-foreground")}>{value}</span>
    </div>
  );
}
