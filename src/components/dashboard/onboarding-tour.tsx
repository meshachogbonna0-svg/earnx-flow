import { useEffect, useRef, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight, Hand, ShieldCheck, Sparkles, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "earnx_dashboard_tour_v2";

const steps = [
  {
    icon: Sparkles,
    label: "WELCOME",
    title: "Your EarnX journey starts here",
    body: "Your dashboard keeps your balance, earnings, level and recent activity together in one place.",
  },
  {
    icon: WalletCards,
    label: "YOUR WALLET",
    title: "Follow every Naira you earn",
    body: "Your total balance appears at the top. Use the eye button whenever you want to hide or reveal it.",
  },
  {
    icon: Hand,
    label: "TAP & EARN",
    title: "Tap. Recharge. Earn again.",
    body: "Use the raised gold TAP button below to earn with your available battery and current level reward.",
  },
  {
    icon: ShieldCheck,
    label: "ACTIVATE & GROW",
    title: "Unlock withdrawals, then level up",
    body: "Activate your current level before withdrawing. Upgrade one level at a time when you want higher benefits.",
  },
  {
    icon: BadgeCheck,
    label: "YOU'RE READY",
    title: "Everything is within reach",
    body: "Use the quick actions for activation, upgrades and withdrawals. You can revisit every feature from the menu.",
  },
];

export function OnboardingTour({ firstName }: { firstName?: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.location.pathname !== "/dashboard") return;
    if (localStorage.getItem(STORAGE_KEY) === "done") return;
    const timer = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (!open) return null;

  const current = steps[step];
  const StepIcon = current.icon;
  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "done");
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-end justify-center bg-background/85 p-4 pb-5 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-sm animate-fade-up overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-navy via-card to-navy-deep p-5 shadow-gold-glow outline-none"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gold-gradient" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold tracking-[0.2em] text-gold">
            QUICK START · {step + 1} OF {steps.length}
          </span>
          <Button type="button" variant="ghost" size="icon" onClick={finish} aria-label="Close tutorial" className="h-8 w-8 rounded-full text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-5 grid h-14 w-14 place-items-center rounded-2xl border border-gold/35 bg-gold/10 text-gold">
          <StepIcon className="h-6 w-6" />
        </div>

        <div className="mt-4 min-h-32">
          <p className="text-[10px] font-bold tracking-[0.18em] text-gold">{current.label}</p>
          <h2 id="tour-title" className="mt-2 text-xl font-extrabold">
            {step === 0 && firstName ? `Welcome, ${firstName}` : current.title}
          </h2>
          {step === 0 && firstName && <p className="mt-1 text-xs font-semibold text-gold-soft">{current.title}</p>}
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{current.body}</p>
        </div>

        <div className="mt-4 flex gap-1.5" aria-label={`Tutorial step ${step + 1} of ${steps.length}`}>
          {steps.map((item, index) => (
            <span key={item.label} className={cn("h-1 flex-1 rounded-full transition-colors", index <= step ? "bg-gold" : "bg-secondary")} />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} className="h-10 rounded-xl px-4 text-xs">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step === steps.length - 1 ? (
            <Button type="button" onClick={finish} className="h-10 rounded-xl bg-gold-gradient px-5 text-xs font-bold text-gold-foreground">
              Start earning
            </Button>
          ) : (
            <Button type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} className="h-10 rounded-xl bg-gold-gradient px-5 text-xs font-bold text-gold-foreground">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button type="button" variant="ghost" onClick={finish} className="mt-2 h-8 w-full text-[10px] font-semibold text-muted-foreground">
          Skip tutorial
        </Button>
      </div>
    </div>
  );
}
