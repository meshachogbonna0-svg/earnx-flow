import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { MediaUpload } from "@/components/admin/media-upload";
import { QuestionBuilder, toBuilderQuestions, type BuilderQuestion } from "@/components/admin/question-builder";

export type CrudField = {
  key: string;
  label: string;
  type?: "text" | "number" | "bool" | "textarea" | "datetime" | "json" | "image" | "video" | "document" | "questions";
  placeholder?: string;
};

type Row = Record<string, unknown>;

const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols: string) => {
      order: (col: string, opts?: { ascending?: boolean }) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
    };
    insert: (values: Row) => Promise<{ error: { message: string } | null }>;
    update: (values: Row) => { eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }> };
    delete: () => { eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }> };
  };
};

const isMedia = (t?: CrudField["type"]) => t === "image" || t === "video" || t === "document";

const emptyFor = (fields: CrudField[]) => {
  const draft: Row = {};
  for (const f of fields) {
    draft[f.key] =
      f.type === "bool"
        ? true
        : f.type === "number"
          ? 0
          : f.type === "questions"
            ? ([] as BuilderQuestion[])
            : f.type === "json"
              ? "[]"
              : "";
  }
  return draft;
};

const toDbValue = (field: CrudField, value: unknown) => {
  if (field.type === "number") return Number(value ?? 0);
  if (field.type === "bool") return Boolean(value);
  if (field.type === "questions") return Array.isArray(value) ? value : [];
  if (field.type === "json") {
    try {
      return JSON.parse(String(value || "[]"));
    } catch {
      return [];
    }
  }
  if (field.type === "datetime") return value ? new Date(String(value)).toISOString() : null;
  return value === "" ? null : value;
};

const toFormValue = (field: CrudField, value: unknown) => {
  if (field.type === "questions") return toBuilderQuestions(value);
  if (field.type === "json") return JSON.stringify(value ?? [], null, 2);
  if (field.type === "datetime" && value) return String(value).slice(0, 16);
  if (field.type === "bool") return Boolean(value);
  return value ?? "";
};


export function CrudSection({
  table,
  title,
  description,
  fields,
  titleKey,
  orderBy = "created_at",
}: {
  table: string;
  title: string;
  description?: string;
  fields: CrudField[];
  titleKey: string;
  orderBy?: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Row | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await db.from(table).select("*").order(orderBy, { ascending: false });
    if (error) toast.error(`Could not load ${title.toLowerCase()}`);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyFor(fields));
  };

  const startEdit = (row: Row) => {
    setEditingId(String(row["id"]));
    const draft: Row = {};
    for (const f of fields) draft[f.key] = toFormValue(f, row[f.key]);
    setForm(draft);
  };

  const save = async () => {
    if (!form) return;
    const payload: Row = {};
    for (const f of fields) payload[f.key] = toDbValue(f, form[f.key]);
    setBusy(true);
    const { error } = editingId
      ? await db.from(table).update(payload).eq("id", editingId)
      : await db.from(table).insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Saved" : "Created");
    setForm(null);
    setEditingId(null);
    void load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this item permanently?")) return;
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    void load();
  };

  return (
    <section className="space-y-2.5 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold">{title}</p>
          {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="flex shrink-0 items-center gap-1 rounded-xl bg-gold-gradient px-3 py-1.5 text-[10px] font-bold text-gold-foreground transition active:scale-95"
        >
          <Plus className="h-3 w-3" /> New
        </button>
      </div>

      {loading && <Loader2 className="h-4 w-4 animate-spin text-gold" />}

      <div className="space-y-2">
        {!loading && rows.length === 0 && (
          <p className="rounded-xl bg-secondary/50 p-3 text-center text-[10px] text-muted-foreground">
            Nothing here yet.
          </p>
        )}
        {rows.map((r) => (
          <div key={String(r["id"])} className="flex items-center justify-between gap-2 rounded-xl bg-secondary/50 px-3 py-2">
            <button type="button" onClick={() => startEdit(r)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-[11px] font-semibold">{String(r[titleKey] ?? "Untitled")}</p>
              <p className="text-[10px] text-muted-foreground">
                {"reward" in r ? `₦${Number(r["reward"] ?? 0).toLocaleString("en-NG")} · ` : ""}
                {"active" in r ? (r["active"] ? "Active" : "Disabled") : ""}
                {"visible" in r ? (r["visible"] ? "Visible" : "Hidden") : ""}
              </p>
            </button>
            <button
              type="button"
              onClick={() => remove(String(r["id"]))}
              aria-label="Delete"
              className="shrink-0 rounded-lg border border-destructive/40 p-1.5 text-destructive transition active:scale-95"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {form && (
        <div className="space-y-2.5 rounded-xl border border-gold/30 bg-background/60 p-3">
          <p className="text-[11px] font-bold text-gold">{editingId ? "Edit item" : "New item"}</p>
          {fields.map((f) => (
            <label key={f.key} className={cn("block", f.type === "bool" && "flex items-center justify-between gap-3")}>
              <span className="text-[10px] font-medium text-muted-foreground">{f.label}</span>
              {f.type === "bool" ? (
                <input
                  type="checkbox"
                  checked={Boolean(form[f.key])}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                  className="h-4 w-4 accent-[oklch(0.82_0.15_88)]"
                />
              ) : f.type === "questions" ? (
                <QuestionBuilder
                  value={(form[f.key] as BuilderQuestion[]) ?? []}
                  onChange={(next) => setForm({ ...form, [f.key]: next })}
                />
              ) : isMedia(f.type) ? (
                <MediaUpload
                  value={String(form[f.key] ?? "")}
                  onChange={(url) => setForm({ ...form, [f.key]: url })}
                  folder={table}
                  accept={f.type === "video" ? "video/*" : f.type === "document" ? ".pdf,.epub,.txt,.doc,.docx" : "image/*"}
                  label={f.label}
                />
              ) : f.type === "textarea" || f.type === "json" ? (
                <textarea
                  rows={f.type === "json" ? 6 : 3}
                  value={String(form[f.key] ?? "")}
                  placeholder={f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-[11px] outline-none transition focus:border-gold/60"
                />

              ) : (
                <input
                  type={f.type === "datetime" ? "datetime-local" : "text"}
                  inputMode={f.type === "number" ? "decimal" : undefined}
                  value={String(form[f.key] ?? "")}
                  placeholder={f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-[11px] outline-none transition focus:border-gold/60"
                />
              )}
            </label>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-gradient py-2.5 text-[11px] font-bold text-gold-foreground transition active:scale-[0.98]"
            >
              {busy && <Loader2 className="h-3 w-3 animate-spin" />} Save
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(null);
                setEditingId(null);
              }}
              className="flex-1 rounded-xl border border-border py-2.5 text-[11px] font-semibold text-muted-foreground transition active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
