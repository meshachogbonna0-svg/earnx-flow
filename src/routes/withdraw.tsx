import { createFileRoute, Link, useNavigate, type ErrorComponentProps } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, Landmark, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, PageLoader } from "@/components/dashboard/app-page";
import { naira, dateTime } from "@/lib/format";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/withdraw")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Withdraw Funds — EarnX-Finance" },
      { name: "description", content: "Cash out your EarnX-Finance earnings straight to your Nigerian bank account." },
      { property: "og:title", content: "Withdraw Funds — EarnX-Finance" },
      { property: "og:description", content: "Cash out your earnings to your bank account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WithdrawPage,
  errorComponent: WithdrawRouteError,
});

type Settings = {
  min_withdrawal: number;
  max_withdrawal: number;
  withdrawals_enabled: boolean;
  withdrawal_processing_time: string;
  withdrawal_instructions: string;
  supported_banks: string[];
};
type Withdrawal = { id: string; reference: string | null; amount: number; status: string; bank_name: string; created_at: string };
type LevelRow = { level: number; name: string; min_withdrawal: number; max_withdrawal: number };
type WithdrawResult = {
  ok?: boolean; reason?: string; message?: string; id?: string; reference?: string;
  min?: number; max?: number; limit?: number; used?: number; remaining?: number;
  balance?: number; processing_time?: string;
};

const FALLBACK_MESSAGE = "Your withdrawal could not be processed. Please try again later.";
const LOAD_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: PromiseLike<T>, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), LOAD_TIMEOUT_MS);
    Promise.resolve(promise).then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error: unknown) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

function messageFor(result: WithdrawResult, currentName: string, nextName: string | null) {
  if (result.message) return result.message;
  switch (result.reason) {
    case "disabled": return "Withdrawals are temporarily disabled. Please try again later.";
    case "unauthenticated": return "Please sign in again to continue.";
    case "no_profile": return "Your profile could not be loaded. Please contact support.";
    case "level_zero": return "Level 0 accounts cannot withdraw. Please upgrade to Level 1 and activate Level 1 before you can withdraw.";
    case "not_activated": return `Please activate your ${currentName} level before you can withdraw.`;
    case "account_restricted": return "Your account is currently restricted. Please contact support.";
    case "below_minimum": return `The withdrawal amount is below the minimum allowed amount${result.min ? ` of ${naira(result.min)}` : ""}.`;
    case "above_maximum": return nextName ? `The withdrawal amount exceeds the maximum allowed for your level. Please upgrade to ${nextName} to withdraw more.` : "The withdrawal amount exceeds the maximum allowed for your level.";
    case "insufficient_balance": return `Your balance is insufficient${result.balance !== undefined ? `; available balance: ${naira(result.balance)}` : ""}.`;
    case "daily_limit": return "You have reached the daily withdrawal amount limit.";
    case "daily_count_limit": return "You have reached the maximum number of withdrawals allowed today.";
    case "missing_bank_details": return "Please provide valid bank details before withdrawing.";
    case "invalid_amount": return "Please enter a valid withdrawal amount.";
    case "duplicate": return "A similar withdrawal request was recently submitted.";
    default: return FALLBACK_MESSAGE;
  }
}

function WithdrawRouteError({ error, reset }: ErrorComponentProps) {
  return (
    <AppPage title="Withdraw Funds" subtitle="We hit an unexpected error" nav={false}>
      <section className="rounded-3xl border border-destructive/35 bg-destructive/10 p-5 text-center" role="alert">
        <AlertCircle className="mx-auto h-9 w-9 text-destructive" />
        <h2 className="mt-3 font-display text-lg font-bold">Withdrawal page couldn’t load</h2>
        <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
        <Button type="button" onClick={reset} className="mt-5 h-11 w-full rounded-xl bg-gold-gradient text-gold-foreground">Try again</Button>
        <Button asChild variant="outline" className="mt-3 h-11 w-full rounded-xl"><Link to="/dashboard">Return to Dashboard</Link></Button>
      </section>
    </AppPage>
  );
}

function WithdrawPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [activation, setActivation] = useState("not_activated");
  const [effectiveMin, setEffectiveMin] = useState(5000);
  const [effectiveMax, setEffectiveMax] = useState(0);
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const authResult = await withTimeout(supabase.auth.getUser(), "Connecting to your account took too long. Check your connection and try again.");
      if (authResult.error) throw authResult.error;
      if (!authResult.data.user) {
        await navigate({ to: "/login", replace: true });
        return;
      }
      const userId = authResult.data.user.id;
      const [profileResult, settingsResult, withdrawalsResult, levelsResult] = await withTimeout(
        Promise.all([
          supabase.from("profiles").select("balance, pending_balance, bank_name, bank_account_number, bank_account_name, level, activation").eq("id", userId).maybeSingle(),
          supabase.from("platform_settings").select("*").maybeSingle(),
          supabase.from("withdrawals").select("id, reference, amount, status, bank_name, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
          supabase.from("levels").select("level, name, min_withdrawal, max_withdrawal").order("level"),
        ]),
        "Withdrawal information is taking too long to load. Check your connection and try again.",
      );

      // Profile and settings are essential; history/level metadata may be empty without preventing the form from opening.
      if (profileResult.error) throw profileResult.error;
      if (settingsResult.error) throw settingsResult.error;
      if (!profileResult.data) throw new Error("Your account profile was not found. Please sign out and sign back in.");
      const profile = profileResult.data;
      const platform = (settingsResult.data ?? {}) as Settings;
      const allLevels = levelsResult.error ? [] : ((levelsResult.data ?? []) as LevelRow[]);
      const level = Number(profile.level ?? 0);
      const current = allLevels.find((row) => row.level === level);
      const levelMin = Number(current?.min_withdrawal ?? 0);
      const levelMax = Number(current?.max_withdrawal ?? 0);

      setCurrentLevel(level);
      setActivation(profile.activation ?? "not_activated");
      setBalance(Number(profile.balance ?? 0));
      setPendingBalance(Number(profile.pending_balance ?? 0));
      setBankName(profile.bank_name ?? "");
      setAccountNumber(profile.bank_account_number ?? "");
      setAccountName(profile.bank_account_name ?? "");
      setSettings(platform);
      setHistory(withdrawalsResult.error ? [] : ((withdrawalsResult.data ?? []) as Withdrawal[]));
      setLevels(allLevels);
      setEffectiveMin(levelMin > 0 ? levelMin : Number(platform.min_withdrawal ?? 5000));
      setEffectiveMax(levelMax > 0 ? levelMax : Number(platform.max_withdrawal ?? 0));
    } catch (loadError) {
      console.error("Could not load withdrawal page", loadError);
      setPageError(loadError instanceof Error ? loadError.message : "Withdrawal data could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: rpcError } = await withTimeout(
        supabase.rpc("request_withdrawal", { _amount: Number(amount), _bank_name: bankName, _account_number: accountNumber, _account_name: accountName }),
        "Withdrawal request timed out. Please check your connection and try again.",
      );
      if (rpcError) throw rpcError;
      const result = (data ?? {}) as WithdrawResult;
      const currentName = levels.find((row) => row.level === currentLevel)?.name ?? `Level ${currentLevel}`;
      const nextName = levels.find((row) => row.level === currentLevel + 1)?.name ?? null;
      if (!result.ok) {
        setError(messageFor(result, currentName, nextName));
        return;
      }
      toast.success("Withdrawal request submitted", { description: "Your request is now being processed by Admin." });
      await navigate({ to: "/withdrawal-processing", search: result.id ? { id: String(result.id) } : undefined, replace: true });
    } catch (submitError) {
      console.error("Withdrawal request failed", submitError);
      setError(submitError instanceof Error ? submitError.message : "Withdrawal request failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageLoader />;
  if (pageError) {
    return (
      <AppPage title="Withdraw Funds" subtitle="Unable to load withdrawal information" nav={false}>
        <section className="rounded-3xl border border-destructive/35 bg-destructive/10 p-5 text-center" role="alert">
          <AlertCircle className="mx-auto h-9 w-9 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-bold">Withdrawal page couldn’t load</h2>
          <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">{pageError}</p>
          <Button type="button" onClick={() => void load()} className="mt-5 h-11 w-full rounded-xl bg-gold-gradient text-gold-foreground">Try again</Button>
          <Button asChild variant="outline" className="mt-3 h-11 w-full rounded-xl"><Link to="/dashboard">Return to Dashboard</Link></Button>
        </section>
      </AppPage>
    );
  }

  const currentLevelName = levels.find((row) => row.level === currentLevel)?.name ?? `Level ${currentLevel}`;
  const gate = currentLevel < 1
    ? activation === "activated"
      ? { title: "Account Activated Successfully!", message: "Congratulations! Your account has been successfully activated and verified in our system. However, Level 0 accounts are not eligible for withdrawals. To unlock withdrawal privileges, please upgrade your account to Level 1.", actionLabel: "Upgrade to Level 1", actionTo: "/upgrade" as const, success: true }
      : activation === "pending"
        ? { title: "Activation Under Review", message: "Your activation is being reviewed. You will be able to continue once it is approved.", actionLabel: "Track request", actionTo: "/requests" as const, success: false }
        : { title: "Withdrawal Unavailable!", message: "Your withdrawal request cannot be processed because your account has not been activated yet. Please activate your account to continue.", actionLabel: "Activate Account", actionTo: "/activate" as const, success: false }
    : activation !== "activated"
      ? activation === "pending"
        ? { title: "Activation Under Review", message: `Your ${currentLevelName} activation is being reviewed by Admin. You will be able to withdraw once it is approved.`, actionLabel: "Track request", actionTo: "/requests" as const, success: false }
        : { title: "Withdrawal Unavailable!", message: `Your ${currentLevelName} account has not been activated yet. Please activate it to continue.`, actionLabel: `Activate ${currentLevelName}`, actionTo: "/activate" as const, success: false }
      : null;

  if (gate) {
    return (
      <AppPage title="Withdrawal Eligibility" subtitle="Your account status" nav={false}>
        <section className={cn("relative mt-5 overflow-hidden rounded-3xl border p-5 text-center shadow-card sm:p-8", gate.success ? "border-success/35 bg-gradient-to-b from-success/10 to-card" : "border-destructive/35 bg-gradient-to-b from-destructive/10 to-card")}>
          <div className={cn("mx-auto grid h-24 w-24 place-items-center rounded-full animate-scale-in", gate.success ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>{gate.success ? <Check className="h-12 w-12 stroke-[3]" /> : <X className="h-12 w-12 stroke-[3]" />}</div>
          <p className={cn("mt-5 text-[10px] font-bold tracking-[0.22em]", gate.success ? "text-success" : "text-destructive")}>WITHDRAWAL ELIGIBILITY</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight">{gate.title}</h2>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted-foreground">{gate.message}</p>
          <Button asChild className="mt-7 h-12 w-full rounded-xl bg-gold-gradient text-sm font-bold text-gold-foreground"><Link to={gate.actionTo}>{gate.actionLabel}</Link></Button>
          <Button asChild variant="outline" className="mt-3 h-12 w-full rounded-xl"><Link to="/dashboard">Return to Dashboard</Link></Button>
        </section>
      </AppPage>
    );
  }

  return (
    <AppPage title="Withdraw Funds" subtitle={settings?.withdrawal_processing_time} action={<Link to="/requests" className="shrink-0 rounded-full border border-gold/40 px-3 py-1.5 text-[10px] font-semibold text-gold transition active:scale-95">Track requests</Link>}>
      <section className="animate-fade-up rounded-2xl border border-gold/30 bg-gradient-to-br from-navy via-card to-navy-deep p-4">
        <p className="text-[10px] tracking-[0.25em] text-muted-foreground">AVAILABLE BALANCE</p>
        <p className="mt-1 font-display text-2xl font-extrabold">{naira(balance)}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{naira(pendingBalance)} pending payout</p>
      </section>
      {settings?.withdrawals_enabled === false && <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-center text-xs font-semibold text-destructive">Withdrawals are temporarily paused.</div>}
      <section className="animate-fade-up space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground"><Landmark className="h-3 w-3" /> PAYOUT DETAILS</p>
        {error && <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-[11px] leading-relaxed text-destructive" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
        <label className="block"><span className="text-[11px] font-medium text-muted-foreground">Amount (₦)</span><input inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setError(null); }} placeholder={`Min ${naira(effectiveMin)}${effectiveMax > 0 ? ` · Max ${naira(effectiveMax)}` : ""}`} className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-gold/60" /></label>
        <label className="block"><span className="text-[11px] font-medium text-muted-foreground">Bank</span><div className="mt-1"><SearchableSelect id="withdraw-bank" value={bankName} onValueChange={(value) => { setBankName(value); setError(null); }} options={(settings?.supported_banks ?? []).map((bank) => ({ value: bank, label: bank }))} placeholder="Select your bank" searchPlaceholder="Search banks…" /></div></label>
        <label className="block"><span className="text-[11px] font-medium text-muted-foreground">Account number</span><input inputMode="numeric" value={accountNumber} onChange={(event) => { setAccountNumber(event.target.value); setError(null); }} className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60" /></label>
        <label className="block"><span className="text-[11px] font-medium text-muted-foreground">Account name</span><input value={accountName} onChange={(event) => { setAccountName(event.target.value); setError(null); }} className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60" /></label>
        <p className="text-[10px] leading-relaxed text-muted-foreground">Minimum: {naira(effectiveMin)}{effectiveMax > 0 ? ` · Maximum per request: ${naira(effectiveMax)}` : ""}. {settings?.withdrawal_instructions}</p>
        <button type="button" disabled={busy || !amount || settings?.withdrawals_enabled === false} onClick={() => void submit()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3 text-xs font-bold text-gold-foreground transition active:scale-[0.98] disabled:opacity-60">{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Request withdrawal</button>
      </section>
      <section>
        <h2 className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">WITHDRAWAL HISTORY</h2>
        <div className="mt-3 rounded-2xl border border-border bg-card">
          {history.length === 0 && <p className="p-6 text-center text-xs text-muted-foreground">No withdrawals yet.</p>}
          {history.map((withdrawal, index) => <div key={withdrawal.id} className={cn("flex items-center gap-3 p-3.5", index > 0 && "border-t border-border")}>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{withdrawal.reference || "Withdrawal request"}</p><p className="text-[10px] text-muted-foreground">{withdrawal.bank_name} · {dateTime(withdrawal.created_at)}</p></div>
            <div className="text-right"><p className="text-xs font-bold">{naira(withdrawal.amount)}</p><p className={cn("text-[10px] capitalize", withdrawal.status === "completed" || withdrawal.status === "approved" ? "text-success" : withdrawal.status === "rejected" ? "text-destructive" : "text-gold")}>{withdrawal.status}</p>
              {(withdrawal.status === "rejected" || withdrawal.status === "approved" || withdrawal.status === "completed") && <button type="button" onClick={() => void navigate({ to: "/withdrawal-processing", search: { id: withdrawal.id } })} className="mt-1 text-[10px] font-semibold text-gold underline-offset-2 hover:underline">View result</button>}
            </div>
          </div>)}
        </div>
      </section>
    </AppPage>
  );
}
