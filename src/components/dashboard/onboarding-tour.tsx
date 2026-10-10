import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck, ChevronLeft, ChevronRight, ClipboardList, Hand, HelpCircle, Rocket, ShieldCheck,
  Sparkles, Trophy, User, UserCircle, WalletCards, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "earnx_live_tour_v3";

const steps = [
  { icon: Sparkles, label: "WELCOME", title: "Welcome to EarnX-Finance", body: "Here's a quick tour of everything you can do. It only takes a minute." },
  { icon: WalletCards, label: "1 · WITHDRAW", title: "Cash out your earnings", body: "Send your balance straight to your Nigerian bank account. Your level must be activated first." },
  { icon: ShieldCheck, label: "2 · VERIFY", title: "Activate your account", body: "Pay the small activation fee by bank transfer and upload your receipt. Admin will confirm it for you." },
  { icon: Hand, label: "3 · TAP & EARN", title: "Tap to earn ₦", body: "Press the gold TAP button, start a session and tap the core. Every tap adds to your earnings." },
  { icon: ClipboardList, label: "4 · SURVEYS", title: "Answer short surveys", body: "Share your opinion on simple questions and get rewarded for each survey you finish." },
  { icon: Trophy, label: "5 · QUIZ", title: "Play quick quizzes", body: "Answer fun questions correctly to earn extra rewards on top of tapping." },
  { icon: Rocket, label: "6 · UPGRADE", title: "Move up a level", body: "Upgrade one level at a time (1 to 7). Higher levels earn more per tap and can withdraw more." },
  { icon: User, label: "7 · ME", title: "Your personal space", body: "See your level, history, referrals, notifications and support all in one place." },
  { icon: UserCircle, label: "8 · PROFILE", title: "Keep your details right", body: "Update your name, photo and bank details so your withdrawals always arrive safely." },
  { icon: BadgeCheck, label: "YOU'RE READY", title: "Start earning now", body: "You can replay this tour any time with the ? button at the bottom-right of your screen." },
];

/** Opens the tour from anywhere in the app. */
export const openTour = () => window.dispatchEvent(new Event("earnx:open-tour"));

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState<string>();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const show = () => { setStep(0); setOpen(true); };
    window.addEventListener("earnx:open-tour", show);
    let timer: number | undefined;
    if (localStorage.getItem(STORAGE_KEY) !== "done") timer = window.setTimeout(show, 900);
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("first_name").eq("id", data.user.id).maybeSingle();
      if (p?.first_name) setFirstName(p.first_name.trim());
    });
    return () => { window.removeEventListener("earnx:open-tour", show); window.clearTimeout(timer); };
  }, []);

  const finish = () => { localStorage.setItem(STORAGE_KEY, "done"); setOpen(false); };

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setStep((v) => Math.min(steps.length - 1, v + 1));
      if (e.key === "ArrowLeft") setStep((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = steps[step];
  const StepIcon = current.icon;

  return (
    <>
      <button
        type="button"
        onClick={openTour}
        aria-label="Replay app tour"
        className="fixed bottom-28 right-4 z-[45] grid h-10 w-10 place-items-center rounded-full border border-gold/50 bg-card/95 text-gold shadow-gold-glow backdrop-blur transition active:scale-90"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[180] flex items-end justify-center bg-background/85 p-4 pb-5 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="tour-title">
          <div ref={panelRef} tabIndex={-1} key={step} className="relative w-full max-w-sm animate-fade-up overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-navy via-card to-navy-deep p-5 shadow-gold-glow outline-none">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gold-gradient" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-royal/25 blur-3xl" />
            <div className="relative flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold tracking-[0.2em] text-gold">LIVE TOUR · {step + 1}/{steps.length}</span>
              <Button type="button" variant="ghost" size="icon" onClick={finish} aria-label="Close tour" className="h-8 w-8 rounded-full text-muted-foreground">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative mx-auto mt-5 grid h-20 w-20 place-items-center rounded-full bg-gold-gradient text-gold-foreground shadow-gold-glow">
              <StepIcon className="h-9 w-9" />
            </div>

            <div className="relative mt-5 min-h-28 text-center">
              <p className="text-[10px] font-bold tracking-[0.18em] text-royal-foreground/80 text-gold-soft">{current.label}</p>
              <h2 id="tour-title" className="mt-2 font-display text-xl font-extrabold">
                {step === 0 && firstName ? `Welcome, ${firstName}!` : current.title}
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-muted-foreground">{current.body}</p>
            </div>

            <div className="relative mt-4 flex justify-center gap-1.5">
              {steps.map((s, i) => (
                <button key={s.label} type="button" aria-label={`Go to step ${i + 1}`} onClick={() => setStep(i)} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-gold" : i < step ? "w-1.5 bg-gold/60" : "w-1.5 bg-secondary")} />
              ))}
            </div>

            <div className="relative mt-5 flex items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => setStep((v) => Math.max(0, v - 1))} disabled={step === 0} className="h-10 rounded-xl px-4 text-xs">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {step === steps.length - 1 ? (
                <Button type="button" onClick={finish} className="h-10 rounded-xl bg-gold-gradient px-5 text-xs font-bold text-gold-foreground">Start earning</Button>
              ) : (
                <Button type="button" onClick={() => setStep((v) => v + 1)} className="h-10 rounded-xl bg-gold-gradient px-5 text-xs font-bold text-gold-foreground">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button type="button" variant="ghost" onClick={finish} className="relative mt-2 h-8 w-full text-[10px] font-semibold text-muted-foreground">Skip tour</Button>
          </div>
        </div>
      )}
    </>
  );
}
