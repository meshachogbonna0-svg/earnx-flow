import { Link } from "@tanstack/react-router";
import { Clipboard, Home, Megaphone, Pointer, User } from "lucide-react";
import { cn } from "@/lib/utils";

type NavKey = "home" | "tasks" | "promotions" | "profile" | "tap";

const items = [
  { key: "home" as const, icon: Home, label: "Home", to: "/dashboard" },
  { key: "tasks" as const, icon: Clipboard, label: "Tasks", to: "/tasks" },
  { key: "promotions" as const, icon: Megaphone, label: "Promotions", to: "/promotions" },
  { key: "profile" as const, icon: User, label: "Profile", to: "/profile" },
];

/** Shared mobile bottom navigation with the centred TAP action. */
export function BottomNav({ active }: { active: NavKey }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40">
      <div className="relative mx-auto max-w-md px-4 pb-4 sm:max-w-lg">
        <div className="grid grid-cols-5 items-end rounded-2xl border border-border bg-card/95 px-2 py-2.5 shadow-card backdrop-blur">
          {items.slice(0, 2).map(({ key, icon: Icon, label, to }) => (
            <NavItem key={key} icon={Icon} label={label} to={to} active={active === key} />
          ))}
          <span aria-hidden />
          {items.slice(2).map(({ key, icon: Icon, label, to }) => (
            <NavItem key={key} icon={Icon} label={label} to={to} active={active === key} />
          ))}
        </div>

        <Link
          to="/tap"
          aria-label="Tap to earn"
          className={cn(
            "absolute left-1/2 top-0 grid h-[68px] w-[68px] -translate-x-1/2 -translate-y-[30%] place-items-center rounded-full",
            "border-2 border-gold/80 bg-gold-gradient text-gold-foreground",
            "shadow-[0_10px_30px_-6px_oklch(0.82_0.15_88_/_65%)] transition-transform duration-200",
            "hover:scale-[1.05] active:scale-95",
            active === "tap" && "ring-2 ring-gold/50 ring-offset-2 ring-offset-background",
          )}
        >
          <Pointer className="h-5 w-5" />
          <span className="text-[10px] font-extrabold tracking-wide">TAP</span>
        </Link>
      </div>
    </nav>
  );
}

function NavItem({
  icon: Icon,
  label,
  to,
  active,
}: {
  icon: typeof Home;
  label: string;
  to: string;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-0.5 py-1 transition-transform active:scale-95"
    >
      <Icon className={cn("h-[18px] w-[18px]", active ? "text-gold" : "text-muted-foreground")} />
      <span className={cn("text-[10px]", active ? "font-semibold text-gold" : "text-muted-foreground")}>
        {label}
      </span>
    </Link>
  );
}
