import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { CheckCircle2, Sparkles } from "lucide-react";
import { type CSSProperties } from "react";
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
  const pieces = Array.from({ length: 64 }, (_, i) => i);
  const value = Number(amount) || 0;
  const title = kind === "questionnaire" ? "Congratulations!" : "Success!";
  const subtitle = kind === "questionnaire"
    ? "Your questionnaire is complete and your welcome bonus has been credited automatically to your account."
    : "Your action was completed successfully.";

  return (
    <AppPage title="Congratulations" subtitle="EarnX-Finance success">
      <section className="relative min-h-[560px] overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-navy via-card to-navy-deep p-7 text-center shadow-gold-glow">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {pieces.map((i) => (
            <span key={i} className="earnx-confetti absolute left-1/2 top-1/4 h-2.5 w-1.5 rounded-full" style={{ "--x": `${((i * 47) % 360) - 180}px`, "--r": `${(i * 83) % 360}deg`, "--d": `${(i % 9) * 0.08}s` } as CSSProperties} />
          ))}
        </div>
        <div className="relative pt-10">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-success/40 bg-success/10 shadow-soft">
            <CheckCircle2 className="h-12 w-12 text-success" />
          </div>
          <Sparkles className="mx-auto mt-5 h-6 w-6 animate-pulse text-gold" />
          <h2 className="mt-3 text-3xl font-extrabold">{title}</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          {value > 0 && (
            <div className="mx-auto mt-7 max-w-xs rounded-2xl border border-gold/30 bg-gold/10 p-5">
              <p className="text-[10px] font-bold tracking-[0.2em] text-gold">BONUS CREDITED</p>
              <p className="mt-1 text-3xl font-extrabold">{naira(value)}</p>
            </div>
          )}
          <button type="button" onClick={() => navigate({ to: "/dashboard", replace: true })} className="mt-8 w-full rounded-xl bg-gold-gradient py-3.5 text-xs font-bold text-gold-foreground">Continue to Dashboard</button>
        </div>
      </section>
    </AppPage>
  );
}
