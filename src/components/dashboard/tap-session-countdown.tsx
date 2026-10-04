import { formatCountdown } from "@/lib/tap-session";
import { cn } from "@/lib/utils";

interface TapSessionCountdownProps {
  seconds: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Premium countdown timer display component.
 * Shows MM:SS or HH:MM:SS format with smooth animations.
 */
export function TapSessionCountdown({
  seconds,
  label,
  size = "md",
  className,
}: TapSessionCountdownProps) {
  const formatted = formatCountdown(seconds);

  const sizeClasses = {
    sm: "text-sm",
    md: "text-2xl",
    lg: "text-5xl",
  };

  return (
    <div className={cn("text-center", className)}>
      {label && (
        <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground">
          {label}
        </p>
      )}
      <div className="font-display font-extrabold tracking-tight text-gold">
        <span className={cn("tabular-nums transition-all duration-300", sizeClasses[size])}>
          {formatted}
        </span>
      </div>
    </div>
  );
}
