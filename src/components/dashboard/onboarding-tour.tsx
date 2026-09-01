import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";

const STORAGE_KEY = "earnx_dashboard_tour_v2";

const steps = [
  {
    label: "Dashboard",
    title: "Welcome to EarnX-Finance",
    body: "This is your home screen. Here you can see your balance, level, earnings, notifications and your main actions.",
  },
  {
    label: "Tap & Earn",
    title: "Earn with Tap & Earn",
    body: "Open Tap & Earn to use your available battery. Every tap uses your level's reward and battery settings.",
  },
  {
    label: "Activation",
    title: "Activate before withdrawal",
    body: "You can earn before activation, but withdrawals stay locked until your one-time account activation is approved.",
  },
  {
    label: "Upgrade",
    title: "Upgrade when you're ready",
    body: "Your balance stays with you when you upgrade. Each level has its own rewards, battery and withdrawal benefits.",
  },
  {
    label: "Withdraw",
    title: "Withdraw your available balance",
    body: "Once activated, request a bank withdrawal within your current level's minimum, maximum and daily limits.",
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.location.pathname !== "/dashboard") return;
    if (localStorage.getItem(STORAGE_KEY) === "done") return;
    const timer = window.setTimeout(() => setOpen(true), 650);
    return () => window.clearTimeout(timer);
  }, []);

  if (!open) return null;

  const current = steps[step];
  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "done");
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[180] bg-background/75 backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-label="EarnX onboarding tour">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 18 }, (_, i) => (
          <span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-gold/70 animate-float"
            style={{ left: `${(i * 37) % 100}%`, top: `${10 + ((i * 53) % 80)}%`, animationDelay: `${(i % 6) * 180}ms` }}
          />
        ))}
      </div>

      <div className="absolute inset-x-4 bottom-6 mx-auto max-w-md animate-fade-up rounded-3xl border border-gold/35 bg-gradient-to-br from-navy via-card to-navy-deep p-5 shadow-gold-glow">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] text-gold">
            <Sparkles className="h-4 w-4" /> EARNX TOUR · {step + 1}/{steps.length}
          </div>
          <button type="button" onClick={finish} aria-label="Close tour" className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5">
          <span className="rounded-full bg-gold/10 px-2.5 py-1 text-[10px] font-bold text-gold">{current.label}</span>
          <h2 className="mt-3 text-xl font-extrabold">{current.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{current.body}</p>
        </div>

        <div className="mt-5 flex gap-1.5">
          {steps.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-gold" : "bg-secondary"}`} />)}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={() => setStep((v) => Math.max(0, v - 1))} disabled={step === 0} className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-3 text-xs font-semibold disabled:opacity-35">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          {step === steps.length - 1 ? (
            <button type="button" onClick={finish} className="inline-flex items-center gap-1 rounded-xl bg-gold-gradient px-5 py-3 text-xs font-bold text-gold-foreground">
              Get started
            </button>
          ) : (
            <button type="button" onClick={() => setStep((v) => Math.min(steps.length - 1, v + 1))} className="inline-flex items-center gap-1 rounded-xl bg-gold-gradient px-5 py-3 text-xs font-bold text-gold-foreground">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
        <button type="button" onClick={finish} className="mt-3 w-full text-center text-[10px] font-semibold text-muted-foreground hover:text-foreground">Skip tour</button>
      </div>
    </div>
  );
}
