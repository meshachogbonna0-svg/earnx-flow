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

const QUESTION_OPTIONS: Array<{ match: RegExp; type: Question["type"]; options: string[] }> = [
  {
    match: /how much do you earn monthly|monthly income|monthly earning/i,
    type: "single",
    options: [
      "I currently earn less than ₦50,000 per month",
      "I earn between ₦50,000 and ₦100,000 per month",
      "I earn between ₦100,001 and ₦250,000 per month",
      "I earn between ₦250,001 and ₦500,000 per month",
      "I earn between ₦500,001 and ₦1,000,000 per month",
      "I earn between ₦1,000,001 and ₦2,500,000 per month",
      "I earn more than ₦2,500,000 per month",
      "I currently have no regular monthly income",
    ],
  },
  {
    match: /annual income|income range|yearly income/i,
    type: "single",
    options: [
      "My annual income is less than ₦600,000",
      "My annual income is between ₦600,000 and ₦1,200,000",
      "My annual income is between ₦1,200,001 and ₦2,400,000",
      "My annual income is between ₦2,400,001 and ₦6,000,000",
      "My annual income is between ₦6,000,001 and ₦12,000,000",
      "My annual income is above ₦12,000,000",
      "I currently do not have a regular annual income",
    ],
  },
  {
    match: /employment status|employment type|what do you do for work/i,
    type: "single",
    options: [
      "I am currently employed full-time",
      "I am currently employed part-time",
      "I am self-employed or running my own business",
      "I work as a freelancer or independent contractor",
      "I am a student and currently not employed",
      "I am currently unemployed and looking for work",
      "I am retired",
      "I have another employment situation",
    ],
  },
  {
    match: /primary source of income|main source of income|source of income/i,
    type: "single",
    options: [
      "My main income comes from a full-time job",
      "My main income comes from a part-time job",
      "My main income comes from my own business",
      "My main income comes from freelance or contract work",
      "My main income comes from online work or digital platforms",
      "My main income comes from investments or other assets",
      "I receive financial support from family or other people",
      "I currently do not have a regular source of income",
    ],
  },
  {
    match:
      /how much do you hope to earn|hope to earn.*monthly|expected.*earn.*monthly|desired.*income/i,
    type: "single",
    options: [
      "I would like to earn less than ₦50,000 per month",
      "I would like to earn between ₦50,000 and ₦100,000 per month",
      "I would like to earn between ₦100,001 and ₦250,000 per month",
      "I would like to earn between ₦250,001 and ₦500,000 per month",
      "I would like to earn between ₦500,001 and ₦1,000,000 per month",
      "I would like to earn between ₦1,000,001 and ₦2,500,000 per month",
      "I would like to earn more than ₦2,500,000 per month",
    ],
  },
  {
    match: /how much time can you spend|time.*spend.*daily|how many hours.*daily/i,
    type: "single",
    options: [
      "I can spend less than 15 minutes earning each day",
      "I can spend between 15 and 30 minutes earning each day",
      "I can spend between 30 minutes and 1 hour earning each day",
      "I can spend between 1 and 2 hours earning each day",
      "I can spend between 2 and 4 hours earning each day",
      "I can spend more than 4 hours earning each day",
    ],
  },
  {
    match:
      /how often do you plan to withdraw|withdraw.*often|withdrawal frequency|how frequently.*withdraw/i,
    type: "single",
    options: [
      "I plan to withdraw whenever I reach my available withdrawal limit",
      "I plan to withdraw once every week",
      "I plan to withdraw several times each month",
      "I plan to withdraw once or twice each month",
      "I plan to withdraw only when I have an urgent need",
      "I am not sure yet how frequently I will withdraw",
    ],
  },
  {
    match: /^age$|how old are you|age range/i,
    type: "single",
    options: [
      "I am under 18 years old",
      "I am between 18 and 24 years old",
      "I am between 25 and 34 years old",
      "I am between 35 and 44 years old",
      "I am between 45 and 54 years old",
      "I am between 55 and 64 years old",
      "I am 65 years old or above",
    ],
  },
  {
    match: /how did you hear about earnx|how did you hear about us|where did you hear/i,
    type: "single",
    options: [
      "I heard about EarnX-Finance from a friend or family member",
      "I discovered EarnX-Finance through WhatsApp",
      "I discovered EarnX-Finance through Facebook",
      "I discovered EarnX-Finance through Instagram",
      "I discovered EarnX-Finance through TikTok",
      "I found EarnX-Finance through Google or another search engine",
      "I discovered EarnX-Finance through YouTube",
      "I found EarnX-Finance through another source",
    ],
  },
  {
    match: /do you currently have a job|are you employed/i,
    type: "boolean",
    options: ["Yes, I currently have a job", "No, I currently do not have a job"],
  },
  {
    match: /gender|sex/i,
    type: "single",
    options: ["Male", "Female", "Prefer not to disclose my gender"],
  },
  {
    match: /marital status/i,
    type: "single",
    options: [
      "I am currently single",
      "I am currently married",
      "I am divorced",
      "I am widowed",
      "I prefer not to disclose my marital status",
    ],
  },
  {
    match: /education|highest level of education/i,
    type: "single",
    options: [
      "I completed secondary school",
      "I have a diploma or professional certificate",
      "I am currently an undergraduate student",
      "I have completed an undergraduate degree",
      "I have completed postgraduate education",
      "I have another educational background",
    ],
  },
  {
    match: /^country$|which country|country of residence/i,
    type: "dropdown",
    options: [
      "Nigeria",
      "Ghana",
      "Kenya",
      "South Africa",
      "United Kingdom",
      "United States",
      "Canada",
      "Other",
    ],
  },
  {
    match: /state\/province|state or province|^state$/i,
    type: "dropdown",
    options: [
      "Abia",
      "Adamawa",
      "Akwa Ibom",
      "Anambra",
      "Bauchi",
      "Bayelsa",
      "Benue",
      "Borno",
      "Cross River",
      "Delta",
      "Ebonyi",
      "Edo",
      "Ekiti",
      "Enugu",
      "Gombe",
      "Imo",
      "Jigawa",
      "Kaduna",
      "Kano",
      "Katsina",
      "Kebbi",
      "Kogi",
      "Kwara",
      "Lagos",
      "Nasarawa",
      "Niger",
      "Ogun",
      "Ondo",
      "Osun",
      "Oyo",
      "Plateau",
      "Rivers",
      "Sokoto",
      "Taraba",
      "Yobe",
      "Zamfara",
      "FCT Abuja",
      "Other",
    ],
  },
];

function prepareQuestion(raw: Question): Question {
  const text = String(raw.question ?? "").trim();
  const matched = QUESTION_OPTIONS.find((entry) => entry.match.test(text));
  if (!matched) return raw;
  return {
    ...raw,
    type: matched.type,
    options: matched.options,
    required: raw.required !== false,
  };
}

export const Route = createFileRoute("/questionnaire")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Welcome Questionnaire — EarnX-Finance" },
      {
        name: "description",
        content: "Complete your welcome questionnaire to unlock your welcome bonus.",
      },
    ],
  }),
  component: QuestionnairePage,
});

function QuestionnairePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState<Questionnaire | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
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
      const { data } = await supabase
        .from("questionnaires")
        .select("id, title, description, reward, questions")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!data) {
        toast.error("The welcome questionnaire is not available yet. Please try again later.");
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      const questions = Array.isArray(data.questions)
        ? (data.questions as Question[]).map(prepareQuestion)
        : [];
      setQ({ ...(data as Omit<Questionnaire, "questions">), questions });
      setAnswers(Array(questions.length).fill(""));
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <PageLoader />;
  if (!q || q.questions.length === 0) {
    return (
      <AppPage title="Welcome to EarnX-Finance">
        <div className="rounded-2xl border border-gold/30 bg-card p-6 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-gold" />
          <p className="mt-3 text-sm font-semibold">
            Your welcome bonus questionnaire is being prepared.
          </p>
        </div>
      </AppPage>
    );
  }

  const current = q.questions[index];
  const currentAnswer = answers[index] ?? "";
  const setAnswer = (value: string) =>
    setAnswers((prev) => prev.map((v, i) => (i === index ? value : v)));
  const isLast = index === q.questions.length - 1;

  const chooseSingleAnswer = (value: string) => {
    if (saving) return;
    const nextAnswers = answers.map((answer, i) => (i === index ? value : answer));
    setAnswers(nextAnswers);
    if (isLast) {
      void finish(nextAnswers);
      return;
    }
    window.setTimeout(() => setIndex((v) => Math.min(v + 1, q.questions.length - 1)), 120);
  };

  const next = () => {
    if (current.required !== false && !currentAnswer.trim()) {
      toast.error("Please answer this question before continuing.");
      return;
    }
    setIndex((v) => Math.min(v + 1, q.questions.length - 1));
  };

  const finish = async (submittedAnswers = answers) => {
    if (saving) return;
    if (current.required !== false && !currentAnswer.trim()) {
      toast.error("Please answer this question before continuing.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("complete_questionnaire", {
      _questionnaire_id: q.id,
      _answers: submittedAnswers.map((answer, i) => ({
        question: q.questions[i]?.question ?? "",
        answer,
      })),
    });
    if (error) {
      setSaving(false);
      toast.error("Could not submit questionnaire", { description: error.message });
      return;
    }
    const result = (data ?? {}) as {
      ok?: boolean;
      reward?: number;
      welcome_bonus?: number;
      total_reward?: number;
      reason?: string;
    };
    if (!result.ok) {
      setSaving(false);
      toast.error(
        result.reason === "incomplete"
          ? "Please answer every required question."
          : "The questionnaire could not be completed.",
      );
      return;
    }
    toast.success("Congratulations! Your welcome bonus has been credited.");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <>
      <AppPage
        title="Welcome to EarnX-Finance"
        subtitle="Complete this short questionnaire to unlock your welcome bonus."
      >
        <section className="rounded-3xl border border-gold/30 bg-gradient-to-br from-navy via-card to-navy-deep p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-gold/10 px-3 py-1 text-[10px] font-bold text-gold">
              Question {index + 1} of {q.questions.length}
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground">
              {Math.round(((index + 1) / q.questions.length) * 100)}%
            </span>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gold-gradient transition-all"
              style={{ width: `${((index + 1) / q.questions.length) * 100}%` }}
            />
          </div>
          <h2 className="mt-7 text-lg font-extrabold leading-snug">{current.question}</h2>

          {["single", "dropdown", "boolean", "multiple"].includes(current.type ?? "single") ? (
            <div className="mt-5 space-y-2">
              {(current.type === "boolean" ? ["Yes", "No"] : (current.options ?? [])).map(
                (option) => {
                  const selected =
                    current.type === "multiple"
                      ? (() => {
                          try {
                            return (JSON.parse(currentAnswer || "[]") as string[]).includes(option);
                          } catch {
                            return false;
                          }
                        })()
                      : currentAnswer === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        if (current.type === "multiple") {
                          let selectedOptions: string[] = [];
                          try {
                            selectedOptions = JSON.parse(currentAnswer || "[]");
                          } catch {
                            selectedOptions = [];
                          }
                          const next = selectedOptions.includes(option)
                            ? selectedOptions.filter((v) => v !== option)
                            : [...selectedOptions, option];
                          setAnswer(JSON.stringify(next));
                        } else {
                          chooseSingleAnswer(option);
                        }
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left text-sm transition ${
                        selected
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-border bg-background/40 hover:border-gold/30"
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-full border ${selected ? "border-gold bg-gold text-gold-foreground" : "border-muted-foreground/40"}`}
                      >
                        {selected && <CheckCircle2 className="h-4 w-4" />}
                      </span>
                      {option}
                    </button>
                  );
                },
              )}
            </div>
          ) : (
            <textarea
              value={currentAnswer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer…"
              rows={current.type === "paragraph" ? 6 : 3}
              className="mt-5 w-full rounded-2xl border border-border bg-background/50 p-3.5 text-sm outline-none transition focus:border-gold/60"
            />
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((v) => Math.max(0, v - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            {isLast ? (
              ["single", "dropdown", "boolean"].includes(current.type ?? "single") ? (
                <span className="text-right text-[10px] font-semibold text-muted-foreground">
                  Select an answer to finish automatically
                </span>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void finish()}
                  className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-5 py-2.5 text-xs font-bold text-gold-foreground disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? "Crediting bonus…" : "Finish & claim bonus"}
                </button>
              )
            ) : ["single", "dropdown", "boolean"].includes(current.type ?? "single") ? (
              <span className="text-right text-[10px] font-semibold text-muted-foreground">
                Choose an answer to continue
              </span>
            ) : (
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-1 rounded-xl bg-gold-gradient px-5 py-2.5 text-xs font-bold text-gold-foreground"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>
        <p className="text-center text-[10px] text-muted-foreground">
          Your welcome reward is credited only after the questionnaire is completed.
        </p>
      </AppPage>
    </>
  );
}
