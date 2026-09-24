import { useEffect, useState } from "react";

type Particle = {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  tone: "gold" | "royal";
};

/** Soft gold/purple dots drifting across every page. Purely decorative, never blocks taps. */
export function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const count = window.innerWidth < 640 ? 25 : 45;
    setParticles(
      Array.from({ length: count }, (_, id) => ({
        id,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 2 + Math.random() * 4,
        duration: 12 + Math.random() * 16,
        delay: -Math.random() * 28,
        drift: (Math.random() - 0.5) * 80,
        tone: Math.random() > 0.35 ? "gold" : "royal",
      })),
    );
  }, []);

  if (particles.length === 0) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className={`earnx-particle ${p.tone === "gold" ? "bg-gold" : "bg-royal"}`}
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s, ${3 + (p.id % 4)}s`,
            animationDelay: `${p.delay}s, ${p.delay / 3}s`,
            ["--drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
