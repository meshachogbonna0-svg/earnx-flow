import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, useCallback, useState, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const premiumButton = cva(
  "relative inline-flex select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full font-semibold transition-all duration-300 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        gold: "bg-gold-gradient text-gold-foreground shadow-gold-glow hover:brightness-110",
        royal: "bg-royal-gradient text-royal-foreground shadow-[var(--shadow-royal)] hover:brightness-115",
        outline: "border border-border bg-transparent text-foreground hover:bg-secondary",
        glass: "glass text-foreground hover:bg-secondary/60",
        ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
        success: "bg-success text-success-foreground hover:brightness-110",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-13 px-8 text-base",
        icon: "h-11 w-11",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "gold", size: "md", block: false },
  },
);

type Ripple = { id: number; x: number; y: number; size: number };

export interface PremiumButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof premiumButton> {
  asChild?: boolean;
}

/** Brand button with material-style ripple feedback on press. */
export const PremiumButton = forwardRef<HTMLButtonElement, PremiumButtonProps>(
  ({ className, variant, size, block, asChild, onPointerDown, children, ...props }, ref) => {
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const Comp = asChild ? Slot : "button";

    const handlePointerDown = useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;
        const ripple: Ripple = {
          id: Date.now() + Math.random(),
          x: event.clientX - rect.left - size / 2,
          y: event.clientY - rect.top - size / 2,
          size,
        };
        setRipples((prev) => [...prev, ripple]);
        window.setTimeout(
          () => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)),
          600,
        );
        onPointerDown?.(event);
      },
      [onPointerDown],
    );

    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(premiumButton({ variant, size, block }), className)}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <Comp
        ref={ref}
        className={cn(premiumButton({ variant, size, block }), className)}
        onPointerDown={handlePointerDown}
        {...props}
      >
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
        {ripples.map((r) => (
          <span
            key={r.id}
            aria-hidden
            className="pointer-events-none absolute animate-[scale-in_0.6s_ease-out] rounded-full bg-current opacity-20"
            style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
          />
        ))}
      </Comp>
    );
  },
);
PremiumButton.displayName = "PremiumButton";
