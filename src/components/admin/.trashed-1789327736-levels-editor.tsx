import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type LevelRow = Record<string, unknown> & { level: number; name: string };

const numberFields: Array<[string, string]> = [
  ["upgrade_price", "Upgrade price (₦)"],
  ["reward_per_tap", "Reward per tap (₦)"],
  ["tap_multiplier", "Tap multiplier"],
  ["battery_capacity", "Battery capacity (taps)"],
  ["recharge_minutes", "Recharge time (minutes)"],
  ["recharge_amount", "Recharge amount (taps)"],
  ["cooldown_minutes", "Cooldown time (minutes)"],
  ["daily_recharge_reset_hours", "Recharge reset after limit (hours)"],
  ["daily_recharge_limit", "Daily recharge limit (0 = unlimited)"],
  ["daily_tap_limit", "Maximum daily taps (0 = unlimited)"],
  ["daily_earnings_limit", "Maximum daily earnings (₦, 0 = unlimited)"],
  ["min_withdrawal", "Minimum withdrawal (₦, 0 = platform default)"],
  ["max_withdrawal", "Maximum withdrawal (₦, 0 = platform default)"],
];

const boolFields: Array<[string, string]> = [
  ["unlimited_battery", "Unlimited battery"],
  ["unlimited_taps", "Unlimited taps"],
  ["enabled", "Level enabled"],
];

const adminRpc = supabase as unknown as {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export function LevelsEditor() {
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase.from("levels").select("*").order("level");
    if (error) {
      toast.error("Could not load level settings", { description: error.message });
      setLevels([]);
    } else {
      setLevels((data as LevelRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const update = (level: number, key: string, value: unknown) =>
    setLevels((prev) => prev.map((l) => (l.level === level ? { ...l, [key]: value } : l)));

  const save = async (row: LevelRow) => {
    setBusy(row.level);
    const payload: Record<string, unknown> = { name: row.name };
    for (const [key] of numberFields) payload[key] = Number(row[key] ?? 0);
    for (const [key] of boolFields) payload[key] = Boolean(row[key]);
    payload["benefits"] = Array.isArray(row["benefits"]) ? row["benefits"] : [];

    const { data, error } = await adminRpc.rpc("admin_update_level_settings", {
      _level: row.level,
      _settings: payload,
    });
    setBusy(null);
    const result = (data ?? {}) as { ok?: boolean; reason?: string; level?: LevelRow };
    if (error || !result.ok) {
      return toast.error("Could not save level settings", {
        description: result.reason ?? error?.message ?? "The database rejected the update.",
      });
    }
    // Read back the persisted row so the UI never claims success using stale local state.
    await load();
    toast.success(`${row.name} saved permanently`);
  };

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-gold" />;

  return (
    <section className="space-y-2.5">
      {levels.map((lv) => (
        <article key={lv.level} className="rounded-2xl border border-border bg-card">
          <button
            type="button"
            onClick={() => setOpen(open === lv.level ? null : lv.level)}
            className="flex w-full items-center justify-between gap-3 p-3.5"
          >
            <span className="text-left">
              <span className="block text-xs font-bold">{lv.name}</span>
              <span className="block text-[10px] text-muted-foreground">
                Level {lv.level} · ₦{Number(lv["reward_per_tap"] ?? 0).toLocaleString("en-NG")} per tap
              </span>
            </span>
            <ChevronDown className={`h-4 w-4 text-gold transition ${open === lv.level ? "rotate-180" : ""}`} />
          </button>

          {open === lv.level && (
            <div className="space-y-2.5 border-t border-border p-3.5">
              <label className="block">
                <span className="text-[10px] font-medium text-muted-foreground">Level name</span>
                <input
                  value={String(lv.name ?? "")}
                  onChange={(e) => update(lv.level, "name", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-[11px] outline-none focus:border-gold/60"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                {numberFields.map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                    <input
                      inputMode="decimal"
                      value={String(lv[key] ?? 0)}
                      onChange={(e) => update(lv.level, key, e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-[11px] outline-none focus:border-gold/60"
                    />
                  </label>
                ))}
              </div>
              {boolFields.map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2">
                  <span className="text-[11px] font-medium">{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(lv[key])}
                    onChange={(e) => update(lv.level, key, e.target.checked)}
                    className="h-4 w-4 accent-[oklch(0.82_0.15_88)]"
                  />
                </label>
              ))}
              <label className="block">
                <span className="text-[10px] font-medium text-muted-foreground">Benefits (one per line)</span>
                <textarea
                  rows={3}
                  value={((lv["benefits"] as string[]) ?? []).join("\n")}
                  onChange={(e) => update(lv.level, "benefits", e.target.value.split("\n").filter(Boolean))}
                  className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-[11px] outline-none focus:border-gold/60"
                />
              </label>
              <button
                type="button"
                disabled={busy === lv.level}
                onClick={() => save(lv)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gold-gradient py-2.5 text-[11px] font-bold text-gold-foreground transition active:scale-[0.98]"
              >
                {busy === lv.level && <Loader2 className="h-3 w-3 animate-spin" />} Save {lv.name}
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
