import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  ChevronRight,
  Copy,
  Landmark,
  LifeBuoy,
  LogOut,
  Receipt,
  ShieldCheck,
  TrendingUp,
  User as UserIcon,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, PageLoader } from "@/components/dashboard/app-page";
import { naira } from "@/lib/format";
import { ReportScamButton } from "@/components/security/payment-security";

export const Route = createFileRoute("/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Profile — EarnX-Finance" },
      {
        name: "description",
        content: "Manage your EarnX-Finance profile, bank details, plan level and account settings.",
      },
      { property: "og:title", content: "My Profile — EarnX-Finance" },
      { property: "og:description", content: "Manage your account, bank details and plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

type Profile = {
  id: string;
  first_name: string;
  other_names: string;
  username: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  avatar_url: string | null;
  referral_code: string;
  balance: number;
  level: number;
  activation: string;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
};

const links = [
  { to: "/activate", icon: ShieldCheck, label: "Account Activation", hint: "Unlock earning" },
  { to: "/upgrade", icon: TrendingUp, label: "Upgrade Plan", hint: "Earn more per tap" },
  { to: "/withdraw", icon: Landmark, label: "Withdraw Funds", hint: "Cash out to your bank" },
  { to: "/referrals", icon: Users, label: "Referral & Earn", hint: "Invite friends" },
  { to: "/transactions", icon: Receipt, label: "Transaction History", hint: "All activity" },
  { to: "/notifications", icon: Bell, label: "Notifications", hint: "Updates & alerts" },
  { to: "/support", icon: LifeBuoy, label: "Help & Support", hint: "We're here to help" },
];

function ProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const [{ data: p }, { data: adminOk }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
        supabase.rpc("ensure_admin_role"),
      ]);
      setProfile((p as Profile) ?? null);
      setIsAdmin(adminOk === true);

      setLoading(false);
    })();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  if (loading) return <PageLoader />;

  const name = `${profile?.first_name ?? ""} ${profile?.other_names ?? ""}`.trim() || "Your account";

  return (
    <>
      <AppPage nav="profile" title="My Profile" subtitle="Account, bank details and settings">
        <section className="animate-fade-up rounded-2xl border border-gold/30 bg-gradient-to-br from-navy via-card to-navy-deep p-4 shadow-soft">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={name}
                className="h-14 w-14 rounded-full border border-gold/60 object-cover"
              />
            ) : (
              <span className="grid h-14 w-14 place-items-center rounded-full border border-gold/60 bg-card">
                <UserIcon className="h-6 w-6 text-gold" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{name}</p>
              <p className="truncate text-[11px] text-muted-foreground">@{profile?.username}</p>
              <p className="truncate text-[11px] text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Balance", value: naira(profile?.balance ?? 0) },
              { label: "Level", value: `L${profile?.level ?? 1}` },
              {
                label: "Status",
                value: profile?.activation === "activated" ? "Active" : "Inactive",
              },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-secondary/60 py-2">
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="text-xs font-bold">{s.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="animate-fade-up rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">REFERRAL CODE</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="font-display text-lg font-extrabold tracking-widest text-gold">
              {profile?.referral_code}
            </p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(profile?.referral_code ?? "");
                toast.success("Referral code copied");
              }}
              className="flex items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1.5 text-[11px] font-semibold text-gold transition active:scale-95"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
        </section>

        <section className="animate-fade-up rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">BANK DETAILS</p>
          {profile?.bank_account_number ? (
            <div className="mt-2 space-y-0.5 text-xs">
              <p className="font-semibold">{profile.bank_account_name}</p>
              <p className="text-muted-foreground">
                {profile.bank_name} · {profile.bank_account_number}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">
              No bank account saved yet — add one when you withdraw.
            </p>
          )}
        </section>

        <nav className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-card">
          {links.map(({ to, icon: Icon, label, hint }, i) => (
            <button
              key={to}
              type="button"
              onClick={() => navigate({ to })}
              className={`flex w-full items-center gap-3 p-3.5 text-left transition active:scale-[0.99] ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-gold">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">{label}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{hint}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate({ to: "/admin" })}
              className="flex w-full items-center gap-3 border-t border-border p-3.5 text-left transition active:scale-[0.99]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-royal/20 text-royal">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">Admin Panel</span>
                <span className="block text-[10px] text-muted-foreground">Manage the platform</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          )}
        </nav>

        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 py-3 text-xs font-bold text-destructive transition active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      <ReportScamButton />
    </AppPage>
    </>
  );
}
