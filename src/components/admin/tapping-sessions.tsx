import { useEffect, useMemo, useState } from "react";
import { Activity, Loader2, RefreshCw, Save, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc";
import { dateTime, naira } from "@/lib/format";
import { Button } from "@/components/ui/button";

type LevelSessionRow = {
  level: number;
  name?: string;
  session_duration_seconds?: number | null;
  session_cooldown_seconds?: number | null;
  reward_per_tap?: number | null;
  session_max_taps?: number | null;
  enabled?: boolean | null;
};

type SessionActivity = {
  id: string;
  username?: string | null;
  level?: number | null;
  level_name?: string | null;
  session_status?: string | null;
  session_started_at?: string | null;
  session_expires_at?: string | null;
  cooldown_expires_at?: string | null;
  session_tap_count?: number | null;
  session_earnings?: number | null;
};

type ActivityResponse = { ok?: boolean; reason?: string; message?: string; rows?: SessionActivity[] };

const unavailable = "Not supplied";
const duration = (value?: number | null) => value == null ? unavailable : `${Math.floor(value / 60)}m ${value % 60}s`;
const when = (value?: string | null) => value ? dateTime(value) : "—";

export function TappingSessions() {
  const [tab, setTab] = useState<"settings" | "activity">("settings");
  const [levels, setLevels] = useState<LevelSessionRow[]>([]);
  const [activity, setActivity] = useState<SessionActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityUnavailable, setActivityUnavailable] = useState<string | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadLevels = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("levels").select("*").order("level");
    if (error) toast.error("Could not load tapping settings", { description: error.message });
    setLevels(((data ?? []) as unknown as LevelSessionRow[]).filter((row) => row.level >= 0 && row.level <= 7));
    setLoading(false);
  };

  const loadActivity = async () => {
    setActivityLoading(true);
    setActivityUnavailable(null);
    const { data, error } = await rpc<ActivityResponse>("admin_tapping_session_activity");
    if (error || data?.ok === false) {
      setActivity([]);
      setActivityUnavailable(data?.message ?? "Session activity will appear when Manus supplies the secure admin activity contract.");
    } else setActivity(data?.rows ?? []);
    setActivityLoading(false);
  };

  useEffect(() => { void loadLevels(); }, []);
  useEffect(() => { if (tab === "activity") void loadActivity(); }, [tab]);

  const update = (level: number, key: keyof LevelSessionRow, value: number | boolean) => {
    setLevels((rows) => rows.map((row) => row.level === level ? { ...row, [key]: value } : row));
  };

  const save = async (row: LevelSessionRow) => {
    if (row.session_duration_seconds == null || row.session_cooldown_seconds == null || row.session_max_taps == null) {
      toast.error("Session fields are not available yet", { description: "Manus must add these fields to the secure level-settings contract before they can be saved." });
      return;
    }
    setSaving(row.level);
    const { data, error } = await rpc<{ ok?: boolean; reason?: string }>("admin_update_level_settings", {
      _level: row.level,
      _settings: {
        session_duration_seconds: Number(row.session_duration_seconds),
        session_cooldown_seconds: Number(row.session_cooldown_seconds),
        session_max_taps: Number(row.session_max_taps),
        reward_per_tap: Number(row.reward_per_tap ?? 0),
        enabled: Boolean(row.enabled),
      },
    });
    setSaving(null);
    if (error || !data?.ok) return toast.error("Could not save this level", { description: data?.reason ?? error?.message });
    toast.success(`Level ${row.level} tapping settings saved`);
    await loadLevels();
  };

  const statuses = useMemo(() => Array.from(new Set(activity.map((row) => row.session_status).filter(Boolean) as string[])), [activity]);
  const filtered = activity.filter((row) => (levelFilter === "all" || String(row.level) === levelFilter) && (statusFilter === "all" || row.session_status === statusFilter));

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1.5">
        <Button type="button" variant={tab === "settings" ? "default" : "ghost"} onClick={() => setTab("settings")} className={tab === "settings" ? "bg-gold text-gold-foreground hover:bg-gold/90" : "text-muted-foreground"}><SlidersHorizontal /> Level settings</Button>
        <Button type="button" variant={tab === "activity" ? "default" : "ghost"} onClick={() => setTab("activity")} className={tab === "activity" ? "bg-gold text-gold-foreground hover:bg-gold/90" : "text-muted-foreground"}><Activity /> Activity</Button>
      </div>

      {tab === "settings" && (loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-gold" /> : (
        <div className="space-y-2.5">
          {levels.length === 0 && <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">Level settings are unavailable.</p>}
          {levels.map((row) => (
            <article key={row.level} className="rounded-2xl border border-border bg-card p-3.5">
              <div className="flex items-center justify-between"><div><p className="text-xs font-bold">Level {row.level} · {row.name ?? "Unnamed"}</p><p className="mt-0.5 text-[10px] text-muted-foreground">Duration {duration(row.session_duration_seconds)} · Cooldown {duration(row.session_cooldown_seconds)}</p></div><span className={row.enabled ? "text-success" : "text-muted-foreground"}>{row.enabled ? "Enabled" : "Disabled"}</span></div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {([
                  ["session_duration_seconds", "Session duration (seconds)"],
                  ["session_cooldown_seconds", "Cooldown (seconds)"],
                  ["reward_per_tap", "Tap reward (₦)"],
                  ["session_max_taps", "Maximum taps"],
                ] as const).map(([key, label]) => <label key={key} className="block"><span className="text-[10px] text-muted-foreground">{label}</span><input inputMode="decimal" placeholder={unavailable} value={row[key] ?? ""} onChange={(event) => update(row.level, key, Number(event.target.value))} className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-[11px] outline-none focus:border-gold/60" /></label>)}
              </div>
              <label className="mt-2 flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2"><span className="text-[11px] font-medium">Enabled</span><input type="checkbox" checked={Boolean(row.enabled)} onChange={(event) => update(row.level, "enabled", event.target.checked)} className="h-4 w-4" /></label>
              <Button type="button" onClick={() => void save(row)} disabled={saving === row.level} className="mt-3 w-full bg-gold text-gold-foreground hover:bg-gold/90"><Save />{saving === row.level ? "Saving…" : `Save Level ${row.level}`}</Button>
            </article>
          ))}
        </div>
      ))}

      {tab === "activity" && <div className="space-y-3">
        <div className="flex gap-2"><select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs"><option value="all">All levels</option>{Array.from({ length: 8 }, (_, level) => <option key={level} value={level}>Level {level}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs"><option value="all">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select><Button type="button" size="icon" variant="outline" onClick={() => void loadActivity()} aria-label="Refresh session activity"><RefreshCw /></Button></div>
        {activityLoading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-gold" />}
        {!activityLoading && activityUnavailable && <p className="rounded-2xl border border-gold/20 bg-gold/5 p-5 text-center text-xs leading-relaxed text-muted-foreground">{activityUnavailable}</p>}
        {!activityLoading && !activityUnavailable && filtered.length === 0 && <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">No tapping sessions match these filters.</p>}
        {filtered.map((row) => <article key={row.id} className="rounded-2xl border border-border bg-card p-3.5"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-bold">@{row.username ?? "unknown"}</p><span className="rounded-full bg-secondary px-2 py-1 text-[10px] capitalize text-gold">{row.session_status ?? "unknown"}</span></div><p className="mt-1 text-[10px] text-muted-foreground">{row.level_name ?? `Level ${row.level ?? "—"}`}</p><dl className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div><dt className="text-muted-foreground">Started</dt><dd>{when(row.session_started_at)}</dd></div><div><dt className="text-muted-foreground">Expires</dt><dd>{when(row.session_expires_at)}</dd></div><div><dt className="text-muted-foreground">Cooldown ends</dt><dd>{when(row.cooldown_expires_at)}</dd></div><div><dt className="text-muted-foreground">Tap count</dt><dd>{row.session_tap_count ?? "—"}</dd></div><div><dt className="text-muted-foreground">Earnings</dt><dd>{row.session_earnings == null ? "—" : naira(row.session_earnings)}</dd></div><div><dt className="text-muted-foreground">Current state</dt><dd className="capitalize">{row.session_status ?? "—"}</dd></div></dl></article>)}
      </div>}
    </section>
  );
}