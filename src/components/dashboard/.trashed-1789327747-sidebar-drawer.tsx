import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Clipboard,
  FileText,
  Gift,
  Hand,
  Home,
  Hourglass,

  LifeBuoy,
  ListChecks,
  LogOut,
  Megaphone,
  PlayCircle,
  Receipt,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
const logoAsset = { url: "/earnx-eagle-logo.png" };
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", icon: Home, label: "Dashboard" },
  { to: "/tap", icon: Hand, label: "Tap to Earn" },
  { to: "/tasks", icon: Clipboard, label: "Tasks" },
  { to: "/videos", icon: PlayCircle, label: "Watch & Earn" },
  { to: "/surveys", icon: ListChecks, label: "Questionnaires" },
  { to: "/promotions", icon: Megaphone, label: "Promotions" },
  { to: "/referrals", icon: Users, label: "Referrals" },
  { to: "/upgrade", icon: TrendingUp, label: "Upgrade Level" },
  { to: "/activate", icon: ShieldCheck, label: "Activate Account" },
  { to: "/withdraw", icon: Wallet, label: "Withdraw" },
  { to: "/requests", icon: Hourglass, label: "Request Status" },
  { to: "/transactions", icon: Receipt, label: "Transactions" },
  { to: "/notifications", icon: Bell, label: "Notifications" },

  { to: "/support", icon: LifeBuoy, label: "Support" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/terms", icon: FileText, label: "Terms & Privacy" },
];

/** Premium dark slide-in navigation drawer for authenticated pages. */
export function SidebarDrawer({
  open,
  onClose,
  name,
  level,
  isAdmin,
}: {
  open: boolean;
  onClose: () => void;
  name?: string;
  level?: number;
  isAdmin?: boolean;
}) {
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    onClose();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className={cn("fixed inset-0 z-50", !open && "pointer-events-none")} aria-hidden={!open}>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <aside
        className={cn(
          "absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col border-r border-gold/25",
          "bg-gradient-to-b from-navy via-card to-navy-deep shadow-gold-glow transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-4">
          <img src={logoAsset.url} alt="EarnX-Finance" className="h-10 w-10 object-contain" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-extrabold tracking-tight">
              {name || "EarnX-Finance"}
            </p>
            <p className="text-[10px] text-muted-foreground">Level {level ?? 1} member</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-8 w-8 place-items-center rounded-lg border border-border transition active:scale-95"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {links.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground active:scale-[0.98]"
            >
              <Icon className="h-4 w-4 text-gold" />
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={onClose}
              className="mt-1 flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2.5 text-xs font-semibold text-gold transition active:scale-[0.98]"
            >
              <Gift className="h-4 w-4" />
              Admin Panel
            </Link>
          )}
        </nav>

        <div className="border-t border-border/60 p-3">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10 active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </div>
  );
}
