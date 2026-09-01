import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, PageLoader } from "@/components/dashboard/app-page";
import { naira } from "@/lib/format";

export const Route = createFileRoute("/surveys")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Questionnaires — EarnX-Finance" },
      {
        name: "description",
        content: "Answer short EarnX-Finance questionnaires and earn instant Naira rewards in your wallet.",
      },
      { property: "og:title", content: "Questionnaires — EarnX-Finance" },
      { property: "og:description", content: "Answer short surveys, earn instant Naira rewards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SurveysPage,
});

type Question = { question: string; options?: string[] };
type Questionnaire = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  reward: number;
  questions: Question[];
  active: boolean;
  starts_at: string;
  ends_at: string | null;
};

const db = supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, v: unknown) => { order: (c: string) => Promise<{ data: unknown }> };
      order?: unknown;
    };
  };
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function SurveysPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Questionnaire[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    const [{ data: q }, { data: c }] = await Promise.all([
      db.from("questionnaires").select("*").eq("active", true).order("sort_order"),
      supabase
        .from("questionnaire_completions" as never)
        .select("questionnaire_id")
        .eq("user_id", auth.user.id),
    ]);
    setItems((q as Questionnaire[]) ?? []);
    setDone(((c as { questionnaire_id: string }[]) ?? []).map((r) => r.questionnaire_id));
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (item: Questionnaire) => {
    if (answers.some((a) => !a || !a.trim())) return toast.error("Please answer every question first.");
    setBusy(true);
    const { data, error } = await db.rpc("complete_questionnaire", {
      _questionnaire_id: item.id,
      _answers: answers,
    });
    setBusy(false);
    const res = (data ?? {}) as { ok?: boolean; reason?: string; reward?: number };
    if (error) return toast.error("Could not submit. Please try again.");
    if (!res.ok)
      return toast.error(
        res.reason === "already_completed"
          ? "You already completed this questionnaire."
          : res.reason === "incomplete"
            ? "Please answer every question."
            : "This questionnaire isn't available right now.",
      );
    toast.success(`Reward credited: ${naira(res.reward ?? 0)}`);
    setOpenId(null);
    void load();
  };

  if (loading) return <PageLoader />;

  return (
    <AppPage title="Questionnaires" subtitle="Answer short surveys and earn instantly">
      {items.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          No questionnaires available right now. Check back soon.
        </p>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const completed = done.includes(item.id);
          const isOpen = openId === item.id;
          return (
            <article key={item.id} className="animate-fade-up rounded-2xl border border-border bg-card p-4 shadow-soft">
              {item.image_url && (
                <img src={item.image_url} alt={item.title} className="mb-3 h-28 w-full rounded-xl object-cover" />
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold">{item.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{item.description}</p>
                </div>
                <p className="shrink-0 text-xs font-bold text-gold">{naira(item.reward)}</p>
              </div>

              {completed ? (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                </p>
              ) : isOpen ? (
                <div className="mt-3 space-y-2.5">
                  {(item.questions ?? []).map((q, i) => (
                    <label key={i} className="block">
                      <span className="text-[11px] font-medium">{q.question}</span>
                      {q.options && q.options.length > 0 ? (
                        <select
                          value={answers[i] ?? ""}
                          onChange={(e) => {
                            const next = [...answers];
                            next[i] = e.target.value;
                            setAnswers(next);
                          }}
                          className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none focus:border-gold/60"
                        >
                          <option value="">Select an answer</option>
                          {q.options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={answers[i] ?? ""}
                          onChange={(e) => {
                            const next = [...answers];
                            next[i] = e.target.value;
                            setAnswers(next);
                          }}
                          className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none focus:border-gold/60"
                        />
                      )}
                    </label>
                  ))}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => submit(item)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gold-gradient py-2.5 text-xs font-bold text-gold-foreground transition active:scale-[0.98]"
                  >
                    {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Submit answers
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(item.id);
                    setAnswers(new Array((item.questions ?? []).length).fill(""));
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gold-gradient py-2.5 text-xs font-bold text-gold-foreground transition active:scale-[0.98]"
                >
                  <ClipboardList className="h-3.5 w-3.5" /> Start questionnaire
                </button>
              )}
            </article>
          );
        })}
      </div>
    </AppPage>
  );
}
