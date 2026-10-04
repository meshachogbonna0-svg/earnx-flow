import { TapSessionState } from "@/hooks/useTapSession";
import { cn } from "@/lib/utils";
import { Timer, CheckCircle2, Clock } from "lucide-react";

interface TapSessionStatusProps {
  state: TapSessionState;
  className?: string;
}

/**
 * Visual status indicator for tap session state.
 * Shows current phase: Idle, Active, Ended, or Cooldown.
 */
export function TapSessionStatus({ state, className }: TapSessionStatusProps) {
  const statusConfig = {
    idle: {
      icon: Clock,
      label: "READY TO TAP",
      color: "text-gold",
      bg: "bg-gold/10",
      border: "border-gold/40",
    },
    active: {
      icon: Timer,
      label: "TAP SESSION ACTIVE",
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/40",
    },
    ended: {
      icon: CheckCircle2,
      label: "SESSION COMPLETED",
      color: "text-muted-foreground",
      bg: "bg-secondary/30",
      border: "border-border",
    },
    cooldown: {
      icon: Clock,
      label: "COOLDOWN ACTIVE",
      color: "text-royal",
      bg: "bg-royal/10",
      border: "border-royal/40",
    },
  };

  const config = statusConfig[state];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("grid h-6 w-6 place-items-center rounded-full", config.bg)}>
        <Icon className={cn("h-3.5 w-3.5", config.color)} />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {config.label}
      </span>
    </div>
  );
}
