import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  ChevronRight,
  Clipboard,
  Eye,
  EyeOff,
  Gift,
  Hand,
  Import,
  Loader2,
  Menu,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
const logoAsset = { url: "/earnx-eagle-logo.png" };
import { Counter } from "@/components/motion/reveal";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { SidebarDrawer } from "@/components/dashboard/sidebar-drawer";
import { OnboardingTour } from "@/components/dashboard/onboarding-tour";
import { cn } from "@/lib/utils";

const rpc = async (fn: string, args?: Record<string, unknown>) => {
  const call = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    params?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await call(fn, args);
  return { data: (data ?? {}) as { ok?: boolean; reason?: string; amount?: number; balance?: number }, error };
};

const bonusReasons: Record<string, string> = {
  already_claimed: "You've already claimed this bonus.",
  disabled: "This bonus is currently disabled.",
  not_activated: "Activate your account to claim this bonus.",
  cooldown: "Come back later — the next bonus isn't ready yet.",
};

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — EarnX-Finance" },
      {
        name: "description",
        content:
          "Your EarnX-Finance dashboard: track your balance, daily earnings, referrals and recent transactions.",
      },
      { property: "og:title", content: "Dashboard — EarnX-Finance" },
      { property: "og:description", content: "Track your balance, earnings and transactions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

type Profile = {
  first_name: string;
  other_names: string;
  balance: number;
  total_earned: number;
  earned_today: number;
  total_taps: number;
  level: number;
  activation: string;
  avatar_url: string | null;
  username: string;
  welcome_bonus_claimed: boolean;
};

type Txn = {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
};

const naira = (v: number) =>
  `₦${Number(v ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning,";
  if (h < 17) return "Good Afternoon,";
  return "Good Evening,";
}

const activityIcon: Record<string, typeof Hand> = {
  tap: Hand,
  task: Clipboard,
  referral: Users,
  withdrawal: ArrowUpRight,
  welcome_bonus: Gift,
  promotion: Gift,
};

function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [referrals, setReferrals] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unread, setUnread] = useState(0);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const profileQuery = () =>
        supabase
          .from("profiles")
          .select(
            "id, first_name, other_names, balance, total_earned, earned_today, total_taps, level, activation, avatar_url, username, welcome_bonus_claimed",
          )
          .eq("id", user.id)
          .maybeSingle();

      let { data: p, error: profileError } = await profileQuery();

      // A freshly established Supabase session can occasionally race with the
      // first profile read on mobile. Give the session a short moment to settle.
      if (!p && !profileError) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        ({ data: p, error: profileError } = await profileQuery());
      }

      const [{ data: t }, { count }, { count: unreadCount }, { data: role }] =
        await Promise.all([
          supabase
            .from("transactions")
            .select("id, type, amount, description, status, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("referrals")
            .select("id", { count: "exact", head: true })
            .eq("referrer_id", user.id),
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("read", false),
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle(),
        ]);
      if (!active) return;

      if (profileError) {
        console.error("[Dashboard] Profile query failed:", profileError);
        toast.error("We couldn't load your account details. Please refresh and try again.");
        setLoading(false);
        return;
      }

      if (!p) {
        console.error("[Dashboard] No profile row for authenticated user:", user.id);
        toast.error("Your account profile could not be found. Please contact support.");
        setLoading(false);
        return;
      }

      setProfile((p as Profile) ?? null);
      setTxns((t as Txn[]) ?? []);
      setReferrals(count ?? 0);
      setUnread(unreadCount ?? 0);
      setIsAdmin(Boolean(role));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const [{ data: p, error: profileError }, { data: t }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, first_name, other_names, balance, total_earned, earned_today, total_taps, level, activation, avatar_url, username, welcome_bonus_claimed",
        )
        .eq("id", data.user.id)
        .maybeSingle(),
      supabase
        .from("transactions")
        .select("id, type, amount, description, status, created_at")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    if (profileError) {
      console.error("[Dashboard] Profile refresh failed:", profileError);
      return;
    }
    setProfile((p as Profile) ?? null);
    setTxns((t as Txn[]) ?? []);
  }, []);

  const claim = useCallback(
    async (fn: "claim_welcome_bonus" | "claim_daily_bonus") => {
      setClaiming(fn);
      const { data, error } = await rpc(fn);
      setClaiming(null);
      if (error) {
        toast.error("Something went wrong — please try again.");
        return;
      }
      if (!data.ok) {
        toast.error(bonusReasons[data.reason ?? ""] ?? "You can't claim that right now.");
        return;
      }
      toast.success(`Bonus claimed — ${naira(data.amount ?? 0)} added to your balance.`);
      void refresh();
    },
    [refresh],
  );


  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const activated = profile?.activation === "activated";
  const first = profile?.first_name?.trim() || "Friend";

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mx-auto w-full max-w-md space-y-7 px-4 pt-5 sm:max-w-lg">
        {/* Top bar */}
        <header className="animate-fade-up grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl transition active:scale-95"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{greeting()}</p>
              <h1 className="truncate font-display text-lg font-extrabold tracking-tight">{first}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="relative grid h-9 w-9 place-items-center rounded-xl border border-border bg-card/70 transition active:scale-95"
            >
              <Bell className="h-[18px] w-[18px] text-foreground" />
              {unread > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-gold" />}
            </Link>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Your profile"
                className="h-9 w-9 rounded-full border border-gold/60 object-cover"
              />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full border border-gold/60 bg-card">
                <User className="h-4 w-4 text-gold" />
              </span>
            )}
          </div>
        </header>

        {/* Badges */}
        <div className="animate-fade-up flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] font-semibold text-gold">
            <Zap className="h-3 w-3" /> Level {profile?.level ?? 1}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              activated
                ? "border border-success/40 bg-success/10 text-success"
                : "border border-destructive/40 bg-destructive/10 text-destructive",
            )}
          >
            <BadgeCheck className="h-3 w-3" /> {activated ? "Activated" : "Not Activated"}
          </span>
        </div>

        {/* Balance card */}
        <section className="animate-scale-in relative overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-navy via-card to-navy-deep p-4 shadow-gold-glow">
          <div className="pointer-events-none absolute -bottom-16 -right-6 h-44 w-44 rounded-full bg-royal/30 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 -top-14 h-32 w-32 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
                TOTAL BALANCE
                <button
                  type="button"
                  onClick={() => setHidden((v) => !v)}
                  aria-label={hidden ? "Show balance" : "Hide balance"}
                  className="transition active:scale-90"
                >
                  {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-1.5 font-display text-3xl font-extrabold tracking-tight">
                {hidden ? "₦••••••" : <Counter to={profile?.balance ?? 0} prefix="₦" decimals={2} />}
              </p>
              <p className="mt-1 text-xs font-medium text-success">
                ↑ {naira(profile?.total_earned ?? 0)} earned
              </p>
            </div>
            <img
              src={logoAsset.url}
              alt="EarnX-Finance logo"
              width={640}
              height={494}
              loading="lazy"
              className="h-12 w-12 shrink-0 object-contain opacity-95"
            />
          </div>
          <p className="relative mt-5 text-xs tracking-[0.3em] text-muted-foreground">
            ••••• {(profile?.username ?? "0000").slice(-4).toUpperCase()}
          </p>
        </section>

        {/* Quick actions — 2x2 premium grid */}
        <section className="grid grid-cols-2 gap-3">
          {[
            { icon: ShieldCheck, top: "Activate", bottom: "Unlock earning", to: "/activate" },
            { icon: TrendingUp, top: "Upgrade", bottom: "Boost your plan", to: "/upgrade" },
            { icon: Import, top: "Withdraw", bottom: "Cash out fast", to: "/withdraw" },
            { icon: Users, top: "Referral", bottom: "Invite & earn", to: "/referrals" },
          ].map(({ icon: Icon, top, bottom, to }) => (
            <Link
              key={top}
              to={to}
              className="group flex items-center gap-3 rounded-2xl border border-gold/25 bg-card p-3 shadow-soft transition duration-300 hover:border-gold/60 hover:shadow-gold-glow active:scale-[0.97]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/30 bg-secondary text-gold">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">{top}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{bottom}</span>
              </span>
            </Link>
          ))}
        </section>

        {/* Bonuses */}
        <section className="animate-fade-up rounded-2xl border border-gold/30 bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gold/15 text-gold">
              <Gift className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold">Free bonuses</p>
              <p className="text-[10px] text-muted-foreground">Claim your welcome and daily rewards</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={claiming !== null || profile?.welcome_bonus_claimed}
              onClick={() => void claim("claim_welcome_bonus")}
              className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-2.5 text-[11px] font-semibold text-gold transition active:scale-95 disabled:opacity-45"
            >
              {profile?.welcome_bonus_claimed ? "Welcome bonus claimed" : "Claim welcome bonus"}
            </button>
            <button
              type="button"
              disabled={claiming !== null}
              onClick={() => void claim("claim_daily_bonus")}
              className="rounded-xl border border-royal/50 bg-royal/15 px-3 py-2.5 text-[11px] font-semibold text-royal transition active:scale-95 disabled:opacity-45"
            >
              Claim daily bonus
            </button>
          </div>
        </section>


        {/* Statistics */}
        <section>
          <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">OVERVIEW</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              {
                icon: TrendingUp,
                label: "Today's Earnings",
                value: naira(profile?.earned_today ?? 0),
                trend: "Today",
                tint: "text-success",
              },
              {
                icon: Hand,
                label: "Total Taps",
                value: (profile?.total_taps ?? 0).toLocaleString("en-NG"),
                trend: "All time",
                tint: "text-gold",
              },
              {
                icon: Users,
                label: "Referrals",
                value: referrals.toLocaleString("en-NG"),
                trend: "Invited",
                tint: "text-royal",
              },
              {
                icon: Zap,
                label: "Current Level",
                value: `Level ${profile?.level ?? 1}`,
                trend: "Upgrade for more",
                tint: "text-gold",
              },
            ].map(({ icon: Icon, label, value, trend, tint }) => (
              <div
                key={label}
                className="rounded-2xl border border-border bg-card p-3.5 shadow-soft transition duration-300 hover:border-gold/40"
              >
                <span className={cn("grid h-8 w-8 place-items-center rounded-xl bg-secondary", tint)}>
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-2.5 text-[11px] text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-base font-bold tracking-tight">{value}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{trend}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent activity */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">RECENT ACTIVITY</h2>
            <Link to="/transactions" className="flex items-center gap-0.5 text-xs font-medium text-royal">
              See all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3 rounded-2xl border border-border bg-card">
            {txns.length === 0 && (
              <p className="p-6 text-center text-xs text-muted-foreground">
                No activity yet — start tapping to earn.
              </p>
            )}
            {txns.map((t, i) => {
              const negative = t.amount < 0 || t.type === "withdrawal";
              const Icon = activityIcon[t.type] ?? ArrowDownLeft;
              return (
                <div key={t.id} className={cn("flex items-center gap-3 p-3.5", i > 0 && "border-t border-border")}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-royal/15">
                    <Icon className="h-4 w-4 text-royal" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{t.description || t.type}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(t.created_at).toLocaleString("en-NG", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-xs font-bold", negative ? "text-destructive" : "text-success")}>
                      {negative ? "-" : "+"} {naira(Math.abs(t.amount))}
                    </p>
                    <p
                      className={cn(
                        "text-[10px] capitalize",
                        t.status === "completed" ? "text-muted-foreground" : "text-gold",
                      )}
                    >
                      {t.status}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <SidebarDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        name={`${profile?.first_name ?? ""} ${profile?.other_names ?? ""}`.trim()}
        level={profile?.level}
        isAdmin={isAdmin}
      />

      <BottomNav active="home" />
      <OnboardingTour firstName={first} />

      <Link to="/" className="sr-only">
        Back to home
      </Link>
    </div>
  );
}
