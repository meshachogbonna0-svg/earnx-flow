import { useEffect, useState, type CSSProperties } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { naira } from "@/lib/format";

export function CelebrationOverlay({ amount, title, subtitle, onContinue }: { amount?: number; title: string; subtitle: string; onContinue: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const t = window.setTimeout(() => setVisible(false), 12000); return () => window.clearTimeout(t); }, []);
  if (!visible) return null;
  const pieces = Array.from({ length: 54 }, (_, i) => i);
  return <div className="fixed inset-0 z-[200] grid place-items-center bg-navy/90 px-5 backdrop-blur-xl" role="dialog" aria-modal="true">
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map(i => <span key={i} className="earnx-confetti absolute left-1/2 top-1/3 h-2.5 w-1.5 rounded-full" style={{"--x": `${((i*47)%320)-160}px`, "--r": `${(i*83)%360}deg`, "--d": `${(i%9)*0.08}s`} as CSSProperties}/>) }
    </div>
    <div className="relative w-full max-w-sm animate-fade-up rounded-3xl border border-gold/40 bg-gradient-to-br from-navy via-card to-navy-deep p-7 text-center shadow-gold-glow">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-success/40 bg-success/10"><CheckCircle2 className="h-10 w-10 text-success"/></div>
      <Sparkles className="mx-auto mt-4 h-5 w-5 animate-pulse text-gold"/>
      <h2 className="mt-3 text-xl font-extrabold">{title}</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
      {amount !== undefined && amount > 0 && <div className="mt-5 rounded-2xl border border-gold/30 bg-gold/10 p-4"><p className="text-[10px] font-semibold tracking-[0.2em] text-gold">REWARD CREDITED</p><p className="mt-1 text-2xl font-extrabold">{naira(amount)}</p></div>}
      <button type="button" onClick={onContinue} className="mt-6 w-full rounded-xl bg-gold-gradient py-3 text-xs font-bold text-gold-foreground">Continue to dashboard</button>
    </div>
  </div>;
}
