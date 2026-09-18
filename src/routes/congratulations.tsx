import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
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

  useEffect(() => {
    const t = window.setTimeout(() => navigate({ to: "/dashboard", replace: true }), 1200);
    return () => window.clearTimeout(t);
  }, [navigate]);

  const value = Number(amount) || 0;
  const title = kind === "questionnaire" ? "Welcome aboard" : "Success";
  const subtitle =
    kind === "questionnaire"
      ? "Your welcome bonus has been applied and you are being redirected to your dashboard."
      : "Your action was completed successfully.";

  return (
    <AppPage title="Success" subtitle="EarnX-Finance">
      <section className="rounded-3xl border border-border bg-card p-7 text-center shadow-soft">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-success/40 bg-success/10">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>

        <h2 className="mt-5 text-3xl font-extrabold">{title}</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{subtitle}</p>

        {value > 0 && (
          <div className="mx-auto mt-7 max-w-xs rounded-2xl border border-gold/30 bg-gold/10 p-5">
            <p className="text-[10px] font-bold tracking-[0.2em] text-gold">BONUS CREDITED</p>
            <p className="mt-1 text-3xl font-extrabold">{naira(value)}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate({ to: "/dashboard", replace: true })}
          className="mt-8 w-full rounded-xl bg-gold-gradient py-3.5 text-xs font-bold text-gold-foreground"
        >
          Go to dashboard
        </button>
      </section>
    </AppPage>
  );
}
