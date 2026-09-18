import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Banknote,
  BarChart3,
  BookOpen,
  Clipboard,
  Coins,
  Layers,
  LifeBuoy,
  Loader2,
  Megaphone,
  Menu,
  MessageSquareWarning,
  PlayCircle,
  Quote,
  Receipt,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc";
import { AppPage, PageLoader } from "@/components/dashboard/app-page";
import { CrudSection } from "@/components/admin/crud";
import { LevelsEditor } from "@/components/admin/levels-editor";
import { RequestsQueue } from "@/components/admin/requests-queue";
import { SupportInbox } from "@/components/admin/support-inbox";
import { naira, dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Panel — EarnX-Finance" },
      {
        name: "description",
        content: "EarnX-Finance admin console for activations, upgrades, withdrawals, users, content and settings.",
      },
      { property: "og:title", content: "Admin Panel — EarnX-Finance" },
      { property: "og:description", content: "Manage activations, upgrades, payouts, users and settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

type Section =
  | "dashboard"
  | "users"
  | "transactions"
  | "activations"
  | "upgrades"
  | "withdrawals"
  | "support"
  | "fraud"
  | "rewards"
  | "levels"
  | "tasks"
  | "surveys"
  | "videos"
  | "reading"
  | "promotions"
  | "testimonials"
  | "notifications"
  | "settings"
  | "bank";

const menu: { key: Section; label: string; icon: typeof Users }[] = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "users", label: "Users", icon: Users },
  { key: "transactions", label: "Transactions", icon: Receipt },
  { key: "activations", label: "Activations", icon: ShieldCheck },
  { key: "upgrades", label: "Upgrades", icon: TrendingUp },
  { key: "withdrawals", label: "Withdrawals", icon: Wallet },
  { key: "support", label: "Support", icon: LifeBuoy },
  { key: "fraud", label: "Fraud Reports", icon: MessageSquareWarning },
  { key: "rewards", label: "Rewards & Earnings", icon: Coins },
  { key: "levels", label: "Levels", icon: Layers },
  { key: "tasks", label: "Tasks", icon: Clipboard },
  { key: "surveys", label: "Surveys", icon: Sparkles },
  { key: "videos", label: "Videos", icon: PlayCircle },
  { key: "reading", label: "Reading Center", icon: BookOpen },
  { key: "promotions", label: "Promotions", icon: Megaphone },
  { key: "testimonials", label: "Testimonials", icon: Quote },
  { key: "notifications", label: "Notifications", icon: Megaphone },
  { key: "settings", label: "Settings", icon: Settings2 },
  { key: "bank", label: "Bank Details", icon: Banknote },
];

type UserRow = {
  id: string;
  username: string;
  email: string;
  first_name: string;
  balance: number;
  level: number;
  activation: string;
  account_status: string;
  total_taps: number;
  created_at: string;
};
type FraudRow = {
  id: string;
  scammer_name: string;
  phone: string;
  whatsapp: string;
  telegram: string;
  social_link: string;
  screenshot_url: string | null;
  description: string;
  status: string;
  created_at: string;
};
type TxnRow = {
  id: string;
  username: string | null;
  type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
};
type SettingsRow = Record<string, unknown> & { id?: boolean };

function AdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [section, setSection] = useState<Section>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [fraud, setFraud] = useState<FraudRow[]>([]);
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "activated" | "inactive" | "suspended">("all");

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    const { data: adminOk } = await supabase.rpc("ensure_admin_role");
    const isAdmin = adminOk === true;
    setAllowed(isAdmin);
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    const [{ data: u }, { data: s }, { data: f }, statsRes, txnRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, email, first_name, balance, level, activation, account_status, total_taps, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("platform_settings").select("*").maybeSingle(),
      supabase.from("fraud_reports").select("*").order("created_at", { ascending: false }).limit(100),
      rpc<Record<string, number>>("admin_stats"),
      rpc<{ rows: TxnRow[] }>("admin_requests", { _kind: "transaction" }),
    ]);
    setUsers((u as UserRow[]) ?? []);
    setSettings(s as SettingsRow);
    setFraud((f as FraudRow[]) ?? []);
    setStats(statsRes.data ?? {});
    setTxns(txnRes.data?.rows ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setBusy("settings");
    const payload = { ...settings };
    delete payload.id;
    const adminRpc = supabase as unknown as { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
    const { data, error } = await adminRpc.rpc("admin_update_platform_settings", { _settings: payload });
    setBusy(null);
    const result = (data ?? {}) as { ok?: boolean; reason?: string; settings?: SettingsRow };
    if (error || !result.ok) {
      return toast.error("Could not save settings", {
        description: result.reason ?? error?.message ?? "The database rejected the update.",
      });
    }
    if (result.settings) setSettings(result.settings);
    else {
      const { data: fresh } = await supabase.from("platform_settings").select("*").maybeSingle();
      if (fresh) setSettings(fresh as SettingsRow);
    }
    toast.success("Settings saved permanently");
  };

  const adjust = async (userId: string) => {
    const raw = window.prompt("Adjustment amount (use a negative number to deduct):");
    if (!raw) return;
    const reason = window.prompt("Reason for this adjustment:") ?? "Admin adjustment";
    const { data, error } = await supabase.rpc("admin_adjust_balance", {
      _user_id: userId,
      _amount: Number(raw),
      _reason: reason,
    });
    const result = (data ?? {}) as { ok?: boolean; reason?: string; new_balance?: number };
    if (error || !result.ok) return toast.error("Could not adjust the balance", { description: result.reason ?? error?.message ?? "The database rejected the adjustment." });
    toast.success("Balance adjusted", { description: `New balance: ₦${Number(result.new_balance ?? 0).toLocaleString("en-NG")}` });
    void load();
  };

  const setStatus = async (userId: string, status: "active" | "suspended" | "banned") => {
    const { error } = await supabase.rpc("admin_set_account_status", { _user_id: userId, _status: status });
    if (error) return toast.error("Could not update this account");
    toast.success(`Account ${status}`);
    void load();
  };

  const resetUser = async (userId: string) => {
    const what = window.prompt("Reset what? Type: taps, earnings, balance or all", "taps");
    if (!what) return;
    const { error } = await rpc("admin_reset_user", { _user_id: userId, _what: what });
    if (error) return toast.error("Could not reset this user");
    toast.success("User reset");
    void load();
  };

  const notifyUser = async (userId: string | null) => {
    const title = window.prompt("Notification title:");
    if (!title) return;
    const body = window.prompt("Notification message:") ?? "";
    const { error } = await rpc("admin_send_notification", {
      _audience: userId ? "user" : "all",
      _user_id: userId,
      _title: title,
      _body: body,
      _category: "system",
    });
    if (error) return toast.error("Could not send the notification");
    toast.success("Notification sent");
  };

  const setFraudStatus = async (id: string, status: string) => {
    const { error } = await supabase.rpc("admin_set_fraud_status", { _report_id: id, _status: status });
    if (error) return toast.error("Could not update this report");
    toast.success(`Report marked ${status}`);
    void load();
  };

  if (loading) return <PageLoader />;

  if (!allowed) {
    return (
      <AppPage nav={false} title="Admin Panel">
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-xs font-semibold text-destructive">
          You don't have permission to view this page.
        </div>
      </AppPage>
    );
  }

  const q = query.trim().toLowerCase();
  const filteredUsers = users.filter((u) => {
    if (userFilter === "activated" && u.activation !== "activated") return false;
    if (userFilter === "inactive" && u.activation === "activated") return false;
    if (userFilter === "suspended" && u.account_status === "active") return false;
    if (!q) return true;
    return [u.username, u.email, u.first_name].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  });

  const num = (k: string) => Number(stats[k] ?? 0);

  return (
    <AppPage
      nav={false}
      title="Admin Panel"
      subtitle={menu.find((m) => m.key === section)?.label}
      action={
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open admin menu"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gold/40 bg-gold/10 text-gold transition active:scale-95"
        >
          <Menu className="h-4 w-4" />
        </button>
      }
    >
      {/* Sidebar */}
      <div className={cn("fixed inset-0 z-[60]", !menuOpen && "pointer-events-none")} aria-hidden={!menuOpen}>
        <button
          type="button"
          aria-label="Close admin menu"
          onClick={() => setMenuOpen(false)}
          className={cn(
            "absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300",
            menuOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          className={cn(
            "absolute inset-y-0 right-0 flex w-[80%] max-w-xs flex-col border-l border-gold/25 bg-gradient-to-b from-navy via-card to-navy-deep transition-transform duration-300",
            menuOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
            <p className="font-display text-sm font-extrabold">Admin menu</p>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setMenuOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border transition active:scale-95"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            {menu.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSection(key);
                  setMenuOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition active:scale-[0.98]",
                  section === key ? "bg-gold/15 text-gold" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                <Icon className="h-4 w-4 text-gold" /> {label}
              </button>
            ))}
          </nav>
        </aside>
      </div>

      {section === "dashboard" && (
        <>
          <section className="grid grid-cols-2 gap-3">
            {[
              { label: "Total users", value: (num("total_users") || users.length).toLocaleString("en-NG") },
              {
                label: "Activated users",
                value: (
                  num("activated_users") || users.filter((u) => u.activation === "activated").length
                ).toLocaleString("en-NG"),
              },
              { label: "Pending activations", value: num("pending_activations").toLocaleString("en-NG") },
              { label: "Pending upgrades", value: num("pending_upgrades").toLocaleString("en-NG") },
              { label: "Pending payouts", value: num("pending_withdrawals").toLocaleString("en-NG") },
              { label: "Total paid out", value: naira(num("total_withdrawn")) },
              {
                label: "Wallet liability",
                value: naira(num("total_balance") || users.reduce((s, u) => s + Number(u.balance), 0)),
              },
              { label: "Total earned", value: naira(num("total_earned")) },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-border bg-card p-3.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-secondary text-gold">
                  <BarChart3 className="h-4 w-4" />
                </span>
                <p className="mt-2.5 text-[11px] text-muted-foreground">{c.label}</p>
                <p className="mt-0.5 text-sm font-bold">{c.value}</p>
              </div>
            ))}
          </section>
          <button
            type="button"
            onClick={() => notifyUser(null)}
            className="w-full rounded-xl bg-gold-gradient py-3 text-xs font-bold text-gold-foreground transition active:scale-[0.98]"
          >
            Send notification to all users
          </button>
        </>
      )}

      {section === "users" && (
        <section className="space-y-2.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search username, email or name"
            className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
          />
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(["all", "activated", "inactive", "suspended"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setUserFilter(f)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize transition",
                  userFilter === f
                    ? "bg-gold-gradient text-gold-foreground"
                    : "border border-border text-muted-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
          {filteredUsers.map((u) => (
            <article key={u.id} className="rounded-2xl border border-border bg-card p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">@{u.username}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{u.email}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Level {u.level} · {u.activation} · {u.account_status} · {Number(u.total_taps ?? 0)} taps
                  </p>
                </div>
                <p className="text-xs font-bold text-gold">{naira(u.balance)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { label: "Adjust balance", onClick: () => adjust(u.id) },
                  { label: "Notify", onClick: () => notifyUser(u.id) },
                  { label: "Reset stats", onClick: () => resetUser(u.id) },
                  {
                    label: u.account_status === "active" ? "Suspend" : "Reactivate",
                    onClick: () => setStatus(u.id, u.account_status === "active" ? "suspended" : "active"),
                  },
                ].map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={b.onClick}
                    className="rounded-xl border border-gold/40 px-3 py-1.5 text-[10px] font-semibold text-gold transition active:scale-95"
                  >
                    {b.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setStatus(u.id, "banned")}
                  className="rounded-xl border border-destructive/40 px-3 py-1.5 text-[10px] font-semibold text-destructive transition active:scale-95"
                >
                  Ban
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {section === "transactions" && (
        <section className="space-y-2">
          <p className="text-xs font-bold">Wallet transactions</p>
          {txns.length === 0 && (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
              No transactions yet.
            </p>
          )}
          <div className="rounded-2xl border border-border bg-card">
            {txns.map((t, i) => (
              <div key={t.id} className={cn("flex items-center gap-3 p-3", i > 0 && "border-t border-border")}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold">{t.description || t.type}</p>
                  <p className="text-[10px] text-muted-foreground">
                    @{t.username ?? "unknown"} · {dateTime(t.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-gold">{naira(Math.abs(Number(t.amount)))}</p>
                  <p className="text-[10px] capitalize text-muted-foreground">{t.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {section === "activations" && <RequestsQueue kind="activation" />}
      {section === "upgrades" && <RequestsQueue kind="upgrade" />}
      {section === "withdrawals" && <RequestsQueue kind="withdrawal" />}
      {section === "support" && <SupportInbox />}

      {section === "fraud" && (
        <section className="space-y-2.5">
          {fraud.length === 0 && (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
              No fraud reports yet.
            </p>
          )}
          {fraud.map((r) => (
            <article key={r.id} className="rounded-2xl border border-border bg-card p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{r.scammer_name || "Unnamed suspect"}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {[r.phone, r.whatsapp, r.telegram, r.social_link].filter(Boolean).join(" · ") ||
                      "No contact details"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{dateTime(r.created_at)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] capitalize text-gold">
                  {r.status}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{r.description}</p>
              {r.screenshot_url && (
                <a
                  href={r.screenshot_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-[10px] font-semibold text-royal underline"
                >
                  View screenshot
                </a>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {(["investigating", "resolved", "spam"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFraudStatus(r.id, st)}
                    className="rounded-xl border border-border px-3 py-1.5 text-[10px] font-semibold capitalize text-muted-foreground transition active:scale-95"
                  >
                    Mark {st}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}

      {section === "rewards" && settings && (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-gold">Rewards & Earnings control centre</p>
          {(
            [
              ["welcome_bonus", "Welcome bonus (₦)"],
              ["daily_bonus_amount", "Daily bonus (₦)"],
              ["daily_bonus_cooldown_hours", "Daily bonus cooldown (hours)"],
              ["referral_reward", "Referral reward (₦)"],
              ["referral_commission", "Referral commission (%)"],
              ["tap_multiplier", "Global tap multiplier"],
              ["weekend_multiplier", "Weekend multiplier"],
              ["event_multiplier", "Event multiplier"],
              ["min_tap_reward", "Minimum tap reward (₦, 0 = off)"],
              ["max_tap_reward", "Maximum tap reward (₦, 0 = off)"],
              ["default_reward_per_tap", "Default reward per tap (₦)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
              <input
                inputMode="decimal"
                value={String(settings[key] ?? 0)}
                onChange={(e) => setSettings({ ...settings, [key]: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
              />
            </label>
          ))}
          {(
            [
              ["tapping_enabled", "Tapping enabled"],
              ["battery_enabled", "Battery enabled"],
              ["cooldown_enabled", "Battery cooldown enabled"],
              ["unlimited_taps", "Unlimited taps (all levels)"],
              ["weekend_multiplier_enabled", "Weekend multiplier active"],
              ["event_multiplier_enabled", "Event multiplier active"],
              ["welcome_bonus_enabled", "Welcome bonus enabled"],
              ["daily_bonus_enabled", "Daily bonus enabled"],
              ["tasks_enabled", "Tasks enabled"],
              ["questionnaires_enabled", "Surveys enabled"],
              ["videos_enabled", "Video rewards enabled"],
              ["reading_enabled", "Reading Center enabled"],
              ["promotions_enabled", "Promotions enabled"],
              ["withdrawals_enabled", "Withdrawals enabled"],
              ["tour_enabled", "First-time tutorial enabled"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2.5">
              <span className="text-[11px] font-medium">{label}</span>
              <input
                type="checkbox"
                checked={Boolean(settings[key])}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                className="h-4 w-4 accent-[oklch(0.82_0.15_88)]"
              />
            </label>
          ))}
          <label className="block">
            <span className="text-[11px] font-medium text-muted-foreground">Referral conditions</span>
            <textarea
              rows={3}
              value={String(settings["referral_conditions"] ?? "")}
              onChange={(e) => setSettings({ ...settings, referral_conditions: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
            />
          </label>
          <SaveButton busy={busy === "settings"} onClick={saveSettings} label="Save rewards settings" />
        </section>
      )}

      {section === "levels" && <LevelsEditor />}

      {section === "tasks" && (
        <CrudSection
          table="tasks"
          title="Tasks"
          description="Daily, weekly and special tasks"
          titleKey="title"
          fields={[
            { key: "title", label: "Title" },
            { key: "description", label: "Description", type: "textarea" },
            { key: "category", label: "Category (daily / weekly / special)" },
            { key: "reward", label: "Reward (₦)", type: "number" },
            { key: "action_url", label: "Action link" },
            { key: "duration_seconds", label: "Duration (seconds)", type: "number" },
            { key: "min_level", label: "Minimum level", type: "number" },
            { key: "sort_order", label: "Sort order", type: "number" },
            { key: "expires_at", label: "Expires at", type: "datetime" },
            { key: "requires_activation", label: "Requires activation", type: "bool" },
            { key: "active", label: "Active", type: "bool" },
          ]}
        />
      )}

      {section === "surveys" && (
        <CrudSection
          table="questionnaires"
          title="Surveys & Questionnaires"
          description="Build questions visually — no code needed"
          titleKey="title"
          fields={[
            { key: "title", label: "Title" },
            { key: "description", label: "Description", type: "textarea" },
            { key: "image_url", label: "Cover image", type: "image" },
            { key: "reward", label: "Reward (₦)", type: "number" },
            { key: "questions", label: "Questions", type: "questions" },
            { key: "starts_at", label: "Starts at", type: "datetime" },
            { key: "ends_at", label: "Ends at", type: "datetime" },
            { key: "sort_order", label: "Sort order", type: "number" },
            { key: "active", label: "Active", type: "bool" },
          ]}
        />
      )}

      {section === "videos" && (
        <CrudSection
          table="videos"
          title="Video rewards"
          description="Upload a video or paste a link"
          titleKey="title"
          fields={[
            { key: "title", label: "Title" },
            { key: "description", label: "Description", type: "textarea" },
            { key: "video_url", label: "Video file", type: "video" },
            { key: "thumbnail_url", label: "Thumbnail", type: "image" },
            { key: "watch_seconds", label: "Required watch seconds", type: "number" },
            { key: "reward", label: "Reward (₦)", type: "number" },
            { key: "sort_order", label: "Sort order", type: "number" },
            { key: "daily_repeat", label: "Repeatable daily", type: "bool" },
            { key: "active", label: "Active", type: "bool" },
          ]}
        />
      )}

      {section === "reading" && (
        <CrudSection
          table="books"
          title="Reading Center"
          description="Upload books users read to earn"
          titleKey="title"
          fields={[
            { key: "title", label: "Title" },
            { key: "author", label: "Author" },
            { key: "description", label: "Description", type: "textarea" },
            { key: "cover_url", label: "Cover image", type: "image" },
            { key: "file_url", label: "Book file (PDF, EPUB, TXT, DOCX)", type: "document" },
            { key: "file_type", label: "File type (pdf / epub / txt / docx)" },
            { key: "reward", label: "Reward (₦)", type: "number" },
            { key: "min_read_seconds", label: "Minimum reading time (seconds)", type: "number" },
            { key: "sort_order", label: "Sort order", type: "number" },
            { key: "active", label: "Active", type: "bool" },
          ]}
        />
      )}

      {section === "promotions" && (
        <CrudSection
          table="promotions"
          title="Promotions"
          description="Scheduled campaigns and banners"
          titleKey="title"
          fields={[
            { key: "title", label: "Title" },
            { key: "description", label: "Description", type: "textarea" },
            { key: "banner_url", label: "Banner", type: "image" },
            { key: "reward_details", label: "Reward details", type: "textarea" },
            { key: "starts_at", label: "Starts at", type: "datetime" },
            { key: "ends_at", label: "Ends at", type: "datetime" },
            { key: "active", label: "Active", type: "bool" },
          ]}
        />
      )}

      {section === "testimonials" && (
        <CrudSection
          table="testimonials"
          title="Testimonials"
          description="Shown on the public homepage"
          titleKey="name"
          fields={[
            { key: "name", label: "Name" },
            { key: "role", label: "Role / location" },
            { key: "avatar_url", label: "Profile picture", type: "image" },
            { key: "quote", label: "Testimonial", type: "textarea" },
            { key: "rating", label: "Stars (1-5)", type: "number" },
            { key: "sort_order", label: "Sort order", type: "number" },
            { key: "visible", label: "Visible", type: "bool" },
          ]}
        />
      )}

      {section === "notifications" && settings && (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-gold">Notifications & announcements</p>
          <label className="block">
            <span className="text-[11px] font-medium text-muted-foreground">Announcement banner</span>
            <textarea
              rows={3}
              value={String(settings["announcement"] ?? "")}
              onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
            />
          </label>
          <SaveButton busy={busy === "settings"} onClick={saveSettings} label="Save announcement" />
          <button
            type="button"
            onClick={() => notifyUser(null)}
            className="w-full rounded-xl border border-gold/40 py-3 text-xs font-bold text-gold transition active:scale-[0.98]"
          >
            Send notification to all users
          </button>
        </section>
      )}

      {section === "settings" && settings && (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-gold">Platform settings</p>
          {(
            [
              ["activation_fee", "Activation fee (₦)"],
              ["min_withdrawal", "Global minimum withdrawal (₦)"],
              ["max_withdrawal", "Global maximum withdrawal (₦)"],
              ["withdrawal_daily_limit", "Daily withdrawal limit (₦)"],
              ["max_withdrawals_per_day", "Max withdrawals per day"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
              <input
                inputMode="decimal"
                value={String(settings[key] ?? "")}
                onChange={(e) => setSettings({ ...settings, [key]: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
              />
            </label>
          ))}
          {(
            [
              ["withdrawal_processing_time", "Withdrawal processing time"],
              ["support_email", "Support email"],
              ["whatsapp_number", "Support WhatsApp"],
              ["support_phone", "Support phone"],
              ["business_hours", "Business hours"],
              ["telegram_url", "Telegram link"],
              ["facebook_url", "Facebook link"],
              ["instagram_url", "Instagram link"],
              ["twitter_url", "X / Twitter link"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
              <input
                value={String(settings[key] ?? "")}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
              />
            </label>
          ))}
          {(
            [
              ["activation_instructions", "Payment instructions"],
              ["security_notice", "Official payment / security notice"],
              ["anti_scam_reminder", "Anti-scam reminder"],
              ["maintenance_message", "Maintenance message"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
              <textarea
                rows={4}
                value={String(settings[key] ?? "")}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
              />
            </label>
          ))}
          {(
            [
              ["activation_auto_approve", "Auto-approve activations"],
              ["withdrawal_requires_activation", "Withdrawals require activation"],
              ["upgrade_requires_activation", "Upgrades require activation"],
              ["upgrade_requires_receipt", "Upgrades require a receipt"],
              ["maintenance_enabled", "Maintenance mode"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2.5">
              <span className="text-[11px] font-medium">{label}</span>
              <input
                type="checkbox"
                checked={Boolean(settings[key])}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                className="h-4 w-4 accent-[oklch(0.82_0.15_88)]"
              />
            </label>
          ))}
          <SaveButton busy={busy === "settings"} onClick={saveSettings} label="Save settings" />
        </section>
      )}

      {section === "bank" && settings && (
        <section className="space-y-3 rounded-2xl border border-gold/30 bg-card p-4">
          <p className="text-xs font-bold text-gold">Official payment bank details</p>
          <p className="text-[10px] text-muted-foreground">
            These details appear on the activation and upgrade payment pages.
          </p>
          {(
            [
              ["bank_name", "Bank name"],
              ["account_name", "Account name"],
              ["account_number", "Account number"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
              <input
                value={String(settings[key] ?? "")}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
              />
            </label>
          ))}
          <SaveButton busy={busy === "settings"} onClick={saveSettings} label="Save bank details" />
        </section>
      )}
    </AppPage>
  );
}

function SaveButton({ busy, onClick, label }: { busy: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3 text-xs font-bold text-gold-foreground transition active:scale-[0.98]"
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {label}
    </button>
  );
}
