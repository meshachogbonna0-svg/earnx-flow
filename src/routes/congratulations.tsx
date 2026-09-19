import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { AppPage } from "@/components/dashboard/app-page";
import { naira } from "@/lib/format";

export const Route = createFileRoute("/congratulations")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    amount: String(s.amount ?? "0"),
    kind: String(s.kind ?? "success"),
  }),
  component: CongratulationsPage,
});

function CongratulationsPage() {
  const navigate = useNavigate();
  const { amount, kind } = useSearch({ from: "/congratulations" });
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => {
      navigate({ to: "/dashboard", replace: true });
    }, 3200);
    return () => window.clearTimeout(redirectTimer);
  }, [navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearInterval(t);
  }, [countdown]);

  const value = Number(amount) || 0;
  const title = kind === "questionnaire" ? "Welcome aboard" : "Completed";
  const subtitle =
    kind === "questionnaire"
      ? "Your welcome bonus has been credited. Setting up your dashboard now."
      : "Your request has been received and is being processed.";

  return (
    <AppPage title="Success" subtitle="EarnX-Finance" hideBottomNav>
      <section className="animate-scale-in relative flex flex-col items-center rounded-[2rem] border border-border bg-card p-8 text-center shadow-card">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

        <div className="relative">
          <div className="earnx-celebration mx-auto grid h-[72px] w-[72px] place-items-center rounded-full border border-gold/35 bg-gradient-to-br from-gold/20 to-gold/5">
            <CheckCircle2 className="h-9 w-9 text-gold" strokeWidth={2.2} />
          </div>
          <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-gold/30 bg-card">
            <Sparkles className="h-3 w-3 text-gold" />
          </span>
        </div>

        <h2 className="mt-6 text-[1.65rem] font-semibold leading-tight tracking-tight text-gold-gradient">
          {title}
        </h2>
        <p className="mx-auto mt-2.5 max-w-[15rem] text-[13px] leading-relaxed text-muted-foreground">
          {subtitle}
        </p>

        {value > 0 && (
          <div className="relative mx-auto mt-7 w-full max-w-[16rem] overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/12 via-gold/6 to-transparent p-5">
            <div
              className="animate-shimmer pointer-events-none absolute inset-0 bg-[length:200%_100%]"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, transparent 0%, oklch(0.82 0.15 88 / 12%) 50%, transparent 100%)",
              }}
            />
            <p className="relative text-[10px] font-semibold tracking-[0.18em] text-gold">BONUS CREDITED</p>
            <p className="relative mt-1 text-[1.6rem] font-semibold tracking-tight text-gold-foreground">
              {naira(value)}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate({ to: "/dashboard", replace: true })}
          className="mt-8 w-full rounded-xl bg-gold-gradient py-3.5 text-xs font-bold text-gold-foreground shadow-gold-glow transition-transform duration-200 active:scale-[0.98]"
        >
          Continue to dashboard
        </button>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Redirecting in <span className="font-semibold text-gold">{countdown}</span>s
        </p>
      </section>
    </AppPage>
  );
}
