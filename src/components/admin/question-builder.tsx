import { Plus, Trash2 } from "lucide-react";

export type BuilderQuestion = {
  question: string;
  type: "single" | "multiple" | "boolean" | "short" | "paragraph" | "dropdown";
  options: string[];
  required: boolean;
};

const types: { value: BuilderQuestion["type"]; label: string }[] = [
  { value: "single", label: "Single choice" },
  { value: "multiple", label: "Multiple choice" },
  { value: "boolean", label: "True / False" },
  { value: "dropdown", label: "Dropdown" },
  { value: "short", label: "Short answer" },
  { value: "paragraph", label: "Paragraph" },
];

const needsOptions = (t: BuilderQuestion["type"]) => t === "single" || t === "multiple" || t === "dropdown";

/** Visual questionnaire builder used instead of raw JSON editing. */
export function QuestionBuilder({
  value,
  onChange,
}: {
  value: BuilderQuestion[];
  onChange: (next: BuilderQuestion[]) => void;
}) {
  const update = (i: number, patch: Partial<BuilderQuestion>) =>
    onChange(value.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  return (
    <div className="mt-1 space-y-2.5">
      {value.map((q, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-border bg-secondary/40 p-2.5">
          <div className="flex items-start gap-2">
            <span className="mt-2 text-[10px] font-bold text-gold">Q{i + 1}</span>
            <input
              value={q.question}
              onChange={(e) => update(i, { question: e.target.value })}
              placeholder="Question text"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background/60 px-2.5 py-2 text-[11px] outline-none focus:border-gold/60"
            />
            <button
              type="button"
              aria-label="Remove question"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="mt-1 rounded-lg border border-destructive/40 p-1.5 text-destructive transition active:scale-95"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={q.type}
              onChange={(e) => update(i, { type: e.target.value as BuilderQuestion["type"] })}
              className="rounded-lg border border-border bg-background/60 px-2 py-1.5 text-[10px] outline-none"
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <input
                type="checkbox"
                checked={q.required}
                onChange={(e) => update(i, { required: e.target.checked })}
                className="h-3.5 w-3.5 accent-[oklch(0.82_0.15_88)]"
              />
              Required
            </label>
          </div>

          {needsOptions(q.type) && (
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex gap-1.5">
                  <input
                    value={opt}
                    onChange={(e) =>
                      update(i, { options: q.options.map((o, x) => (x === oi ? e.target.value : o)) })
                    }
                    placeholder={`Option ${oi + 1}`}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-[10px] outline-none focus:border-gold/60"
                  />
                  <button
                    type="button"
                    aria-label="Remove option"
                    onClick={() => update(i, { options: q.options.filter((_, x) => x !== oi) })}
                    className="rounded-lg border border-border px-2 text-[10px] text-muted-foreground transition active:scale-95"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => update(i, { options: [...q.options, ""] })}
                className="text-[10px] font-semibold text-gold"
              >
                + Add option
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          onChange([...value, { question: "", type: "single", options: ["", ""], required: true }])
        }
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gold/40 py-2.5 text-[10px] font-semibold text-gold transition active:scale-[0.98]"
      >
        <Plus className="h-3 w-3" /> Add question
      </button>
    </div>
  );
}

/** Normalises stored JSON (legacy or builder shape) into builder questions. */
export function toBuilderQuestions(raw: unknown): BuilderQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((q) => {
    const item = (q ?? {}) as Record<string, unknown>;
    const options = Array.isArray(item["options"]) ? (item["options"] as unknown[]).map(String) : [];
    const type = String(item["type"] ?? (options.length ? "single" : "short")) as BuilderQuestion["type"];
    return {
      question: String(item["question"] ?? ""),
      type,
      options,
      required: item["required"] !== false,
    };
  });
}
