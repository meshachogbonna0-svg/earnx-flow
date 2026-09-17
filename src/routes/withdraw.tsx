import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, PageLoader } from "@/components/dashboard/app-page";
import { naira, dateTime } from "@/lib/format";
import { RequestProcessingCard } from "@/components/dashboard/request-processing";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/withdraw")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Withdraw Funds — EarnX-Finance" },
      {
        name: "description",
        content: "Cash out your EarnX-Finance earnings straight to your Nigerian bank account.",
      },
      { property: "og:title", content: "Withdraw Funds — EarnX-Finance" },
      { property: "og:description", content: "Cash out your earnings to your bank account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WithdrawPage,
});

type Settings = {
  min_withdrawal: number;
  max_withdrawal: number;
  withdrawals_enabled: boolean;
  withdrawal_processing_time: string;
  withdrawal_instructions: string;
  supported_banks: string[];
};

type Withdrawal = {
  id: string;
  reference: string;
  amount: number;
  status: string;
  bank_name: string;
  created_at: string;
};

type WithdrawResult = {
  ok?: boolean;
  reason?: string;
  id?: string;
  reference?: string;
  min?: number;
  max?: number;
  limit?: number;
  used?: number;
  remaining?: number;
  balance?: number;
  processing_time?: string;
};

/** Exact, user-facing message for every rejection reason returned by the backend. */
const messageFor = (res: WithdrawResult) => {
  switch (res.reason) {
    case "disabled":
      return "Withdrawals are temporarily unavailable. Please try again later.";
    case "not_activated":
      return "Activate your account before you can withdraw.";
    case "account_restricted":
      return "Your account is restricted. Please contact support.";
    case "below_minimum":
      return `Minimum withdrawal is ${naira(res.min)}. Please enter a higher amount.`;
    case "above_maximum":
      return `Please upgrade your account to the next level in order to continue this withdrawal. Your current maximum is ${naira(res.max)}.`;
    case "insufficient_balance":
      return `Insufficient balance. You currently have ${naira(res.balance)} available.`;
    case "daily_limit":
      return `Daily withdrawal limit is ${naira(res.limit)}. You have ${naira(res.remaining)} left today.`;
    case "daily_count_limit":
      return `You can only make ${res.limit} withdrawal${res.limit === 1 ? "" : "s"} per day. Try again tomorrow.`;
    case "missing_bank_details":
      return "Please fill in your bank, account number and account name.";
    case "invalid_amount":
      return "Enter a valid withdrawal amount.";
    default:
      return "Withdrawal could not be processed. Please try again.";
  }
};


function WithdrawPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState(0);
  const [pending, setPending] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [effectiveMin, setEffectiveMin] = useState(5000);
  const [effectiveMax, setEffectiveMax] = useState(0);
  const [lastSubmitted, setLastSubmitted] = useState<Withdrawal | null>(null);
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    const [{ data: p }, { data: s }, { data: w }] = await Promise.all([
      supabase
        .from("profiles")
        .select("balance, pending_balance, bank_name, bank_account_number, bank_account_name, level")
        .eq("id", auth.user.id)
        .maybeSingle(),
      supabase.from("platform_settings").select("*").maybeSingle(),
      supabase
        .from("withdrawals")
        .select("id, reference, amount, status, bank_name, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    const prof = p as {
      balance: number;
      pending_balance: number;
      bank_name: string | null;
      bank_account_number: string | null;
      bank_account_name: string | null;
    } | null;
    setBalance(prof?.balance ?? 0);
    setPending(prof?.pending_balance ?? 0);
    setBankName(prof?.bank_name ?? "");
    setAccountNumber(prof?.bank_account_number ?? "");
    setAccountName(prof?.bank_account_name ?? "");
    setSettings(s as Settings);
    setHistory((w as Withdrawal[]) ?? []);
    const level = Number((prof as { level?: number } | null)?.level ?? 0);
    const { data: lv } = await supabase.from("levels").select("min_withdrawal, max_withdrawal").eq("level", level).maybeSingle();
    const lmin = Number((lv as { min_withdrawal?: number } | null)?.min_withdrawal ?? 0);
    const lmax = Number((lv as { max_withdrawal?: number } | null)?.max_withdrawal ?? 0);
    setEffectiveMin(lmin > 0 ? lmin : Number((s as Settings)?.min_withdrawal ?? 5000));
    setEffectiveMax(lmax > 0 ? lmax : Number((s as Settings)?.max_withdrawal ?? 0));
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("request_withdrawal", {
      _amount: Number(amount),
      _bank_name: bankName,
      _account_number: accountNumber,
      _account_name: accountName,
    });
    const res = (data ?? {}) as WithdrawResult;
    if (error) {
      setBusy(false);
      return toast.error("Withdrawal failed", { description: "Please check your connection and try again." });
    }
    if (!res.ok) {
      setBusy(false);
      return toast.error(messageFor(res));
    }
    toast.success("Withdrawal request submitted", {
      description: "Your request is now being processed by Admin.",
    });
    const submitted: Withdrawal = { id: String(res.id ?? ""), reference: String(res.reference ?? ""), amount: Number(amount), status: "processing", bank_name: bankName, created_at: new Date().toISOString() };
    setAmount("");
    setLastSubmitted(submitted);
    navigate({ to: "/withdrawal-processing", replace: true });
  };

  if (loading) return <PageLoader />;

  return (
    <AppPage
      title="Withdraw Funds"
      subtitle={settings?.withdrawal_processing_time}
      action={
        <Link
          to="/requests"
          className="shrink-0 rounded-full border border-gold/40 px-3 py-1.5 text-[10px] font-semibold text-gold transition active:scale-95"
        >
          Track requests
        </Link>
      }
    >

      <section className="animate-fade-up rounded-2xl border border-gold/30 bg-gradient-to-br from-navy via-card to-navy-deep p-4">
        <p className="text-[10px] tracking-[0.25em] text-muted-foreground">AVAILABLE BALANCE</p>
        <p className="mt-1 font-display text-2xl font-extrabold">{naira(balance)}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{naira(pending)} pending payout</p>
      </section>

      {settings?.withdrawals_enabled === false && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-center text-xs font-semibold text-destructive">
          Withdrawals are temporarily paused.
        </div>
      )}

      {lastSubmitted && (
        <RequestProcessingCard kind="withdrawal" status={lastSubmitted.status} amount={lastSubmitted.amount} reference={lastSubmitted.reference} detail="Your withdrawal request has been received and is awaiting Admin processing. Track it for approval, rejection or completion." />
      )}

      <section className="animate-fade-up space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
          <Landmark className="h-3 w-3" /> PAYOUT DETAILS
        </p>
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">Amount (₦)</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Min ${naira(effectiveMin)}${effectiveMax > 0 ? ` · Max ${naira(effectiveMax)}` : ""}`}
            className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-gold/60"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">Bank</span>
          <div className="mt-1">
            <SearchableSelect
              id="withdraw-bank"
              value={bankName}
              onValueChange={setBankName}
              options={(settings?.supported_banks ?? []).map((b) => ({ value: b, label: b }))}
              placeholder="Select your bank"
              searchPlaceholder="Search banks…"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">Account number</span>
          <input
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">Account name</span>
          <input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
          />
        </label>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Minimum: {naira(effectiveMin)}{effectiveMax > 0 ? ` · Maximum per request: ${naira(effectiveMax)}` : ""}. {settings?.withdrawal_instructions}
        </p>
        <button
          type="button"
          disabled={busy || !amount}
          onClick={submit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3 text-xs font-bold text-gold-foreground transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Request withdrawal
        </button>
      </section>

      <section>
        <h2 className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
          WITHDRAWAL HISTORY
        </h2>
        <div className="mt-3 rounded-2xl border border-border bg-card">
          {history.length === 0 && (
            <p className="p-6 text-center text-xs text-muted-foreground">No withdrawals yet.</p>
          )}
          {history.map((w, i) => (
            <div key={w.id} className={cn("flex items-center gap-3 p-3.5", i > 0 && "border-t border-border")}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{w.reference}</p>
                <p className="text-[10px] text-muted-foreground">
                  {w.bank_name} · {dateTime(w.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold">{naira(w.amount)}</p>
                <p
                  className={cn(
                    "text-[10px] capitalize",
                    w.status === "completed" || w.status === "approved"
                      ? "text-success"
                      : w.status === "rejected"
                        ? "text-destructive"
                        : "text-gold",
                  )}
                >
                  {w.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppPage>
  );
}
