import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, PageLoader } from "@/components/dashboard/app-page";

type Question = {
  question: string;
  type?: "single" | "multiple" | "boolean" | "short" | "paragraph" | "dropdown";
  options?: string[];
  required?: boolean;
};

type Questionnaire = {
  id: string;
  title: string;
  description: string;
  reward: number;
  questions: Question[];
};

const COUNTRY_OPTIONS = ["Nigeria", "Ghana", "Kenya", "South Africa", "United Kingdom", "United States", "Canada", "Other"];
const STATE_OPTIONS = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi",
  "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT Abuja", "Other",
];

function prepareQuestion(raw: Question): Question {
  const text = String(raw.question ?? "").trim();
  if (/country of residence|^country$/i.test(text)) return { ...raw, type: "dropdown", options: COUNTRY_OPTIONS, required: raw.required !== false };
  if (/state\/province|state or province|^state$/i.test(text)) return { ...raw, type: "dropdown", options: STATE_OPTIONS, required: raw.required !== false };
  if (/gender|sex/i.test(text)) return { ...raw, type: "single", options: ["Male", "Female", "Prefer not to disclose my gender"], required: raw.required !== false };
  if (/do you currently have a job|are you employed/i.test(text)) return { ...raw, type: "boolean", options: ["Yes", "No"], required: raw.required !== false };
  if (/age|employment status|income|how did you hear|withdraw|how much time|hope to earn/i.test(text)) {
    const options = raw.options?.length ? raw.options : ["Prefer not to say", "Option 1", "Option 2", "Option 3"];
    return { ...raw, type: raw.type === "paragraph" ? raw.type : "single", options, required: raw.required !== false };
  }
  return raw;
}

export const Route = createFileRoute("/questionnaire")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Welcome Questionnaire — EarnX-Finance" },
      { name: "description", content: "Complete your welcome questionnaire to unlock your welcome bonus." },
    ],
  }),
  component: QuestionnairePage,
});

function QuestionnairePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("survey_completed, welcome_bonus_claimed")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (profile?.survey_completed && profile?.welcome_bonus_claimed) {
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      const { data, error } = await supabase
        .from("questionnaires")
        .select("id, title, description, reward, questions")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error || !data) {
        toast.error("The welcome questionnaire is not available yet.");
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      const questions = Array.isArray(data.questions) ? (data.questions as Question[]).map(prepareQuestion) : [];
      setQuestionnaire({ ...(data as Omit<Questionnaire, "questions">), questions });
      setAnswers(Array(questions.length).fill(""));
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <PageLoader />;
  if (!questionnaire || questionnaire.questions.length === 0) {
    return (
      <AppPage title="Welcome to EarnX-Finance">
        <div className="rounded-2xl border border-gold/30 bg-card p-6 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-gold" />
          <p className="mt-3 text-sm font-semibold">Your welcome questionnaire is being prepared.</p>
        </div>
      </AppPage>
    );
  }

  const active = questionnaire;
  const current = questionnaire.questions[index];
  const answer = answers[index] ?? "";
  const isLast = index === questionnaire.questions.length - 1;
  const setAnswer = (value: string) => setAnswers((previous) => previous.map((item, i) => (i === index ? value : item)));
  const selectAnswer = (value: string) => {
    setAnswer(value);
    if (!isLast) window.setTimeout(() => setIndex((value) => value + 1), 120);
    else void finish(answers.map((item, i) => (i === index ? value : item)));
  };

  async function finish(submittedAnswers = answers) {
    if (saving) return;
    if (active.questions.some((question, i) => question.required !== false && !String(submittedAnswers[i] ?? "").trim())) {
      toast.error("Please answer every required question.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("complete_questionnaire", {
      _questionnaire_id: active.id,
      _answers: submittedAnswers.map((value, i) => ({ question: active.questions[i]?.question ?? "", answer: value })),
    });
    if (error || !(data as { ok?: boolean } | null)?.ok) {
      setSaving(false);
      toast.error("The questionnaire could not be completed.", { description: error?.message });
      return;
    }
    toast.success("Your welcome bonus has been credited.");
    navigate({ to: "/dashboard", replace: true });
  }

  const choiceQuestion = ["single", "dropdown", "boolean"].includes(current.type ?? "single");
  const options = current.type === "boolean" ? ["Yes", "No"] : current.options ?? [];

  return (
    <AppPage title={questionnaire.title || "Welcome to EarnX-Finance"} subtitle={questionnaire.description || "Complete this short questionnaire to unlock your welcome bonus."}>
      <section className="rounded-3xl border border-gold/30 bg-gradient-to-br from-navy via-card to-navy-deep p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-gold/10 px-3 py-1 text-[10px] font-bold text-gold">Question {index + 1} of {questionnaire.questions.length}</span>
          <span className="text-[10px] font-semibold text-muted-foreground">{Math.round(((index + 1) / questionnaire.questions.length) * 100)}%</span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-gold-gradient transition-all" style={{ width: `${((index + 1) / questionnaire.questions.length) * 100}%` }} /></div>
        <h2 className="mt-7 text-lg font-extrabold leading-snug">{current.question}</h2>

        {choiceQuestion ? (
          <div className="mt-5 space-y-2">
            {options.map((option) => (
              <button key={option} type="button" onClick={() => selectAnswer(option)} className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left text-sm transition ${answer === option ? "border-gold bg-gold/10 text-gold" : "border-border bg-background/40 hover:border-gold/30"}`}>
                <span className={`grid h-5 w-5 place-items-center rounded-full border ${answer === option ? "border-gold bg-gold text-gold-foreground" : "border-muted-foreground/40"}`}>{answer === option && <CheckCircle2 className="h-4 w-4" />}</span>
                {option}
              </button>
            ))}
          </div>
        ) : (
          <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type your answer…" rows={current.type === "paragraph" ? 6 : 3} className="mt-5 w-full rounded-2xl border border-border bg-background/50 p-3.5 text-sm outline-none transition focus:border-gold/60" />
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" disabled={index === 0 || saving} onClick={() => setIndex((value) => Math.max(0, value - 1))} className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Back</button>
          {isLast ? (
            choiceQuestion ? <span className="text-right text-[10px] font-semibold text-muted-foreground">Select an answer to finish automatically</span> : <button type="button" disabled={saving} onClick={() => void finish()} className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-5 py-2.5 text-xs font-bold text-gold-foreground disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Crediting bonus…" : "Finish & claim bonus"}</button>
          ) : choiceQuestion ? <span className="text-right text-[10px] font-semibold text-muted-foreground">Choose an answer to continue</span> : <button type="button" onClick={() => { if (!answer.trim()) return toast.error("Please answer this question before continuing."); setIndex((value) => value + 1); }} className="inline-flex items-center gap-1 rounded-xl bg-gold-gradient px-5 py-2.5 text-xs font-bold text-gold-foreground">Next <ChevronRight className="h-4 w-4" /></button>}
        </div>
      </section>
      <p className="text-center text-[10px] text-muted-foreground">Your welcome reward is credited only after the questionnaire is completed.</p>
    </AppPage>
  );
}
