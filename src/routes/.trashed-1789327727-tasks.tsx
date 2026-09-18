import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Clipboard, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, PageLoader, EmptyState } from "@/components/dashboard/app-page";
import { naira } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tasks")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Daily Tasks — EarnX-Finance" },
      {
        name: "description",
        content: "Complete simple daily tasks on EarnX-Finance and earn Naira rewards instantly.",
      },
      { property: "og:title", content: "Daily Tasks — EarnX-Finance" },
      { property: "og:description", content: "Complete daily tasks and earn instant rewards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TasksPage,
});

type Task = {
  id: string;
  title: string;
  description: string;
  reward: number;
  category: string;
  action_url: string | null;
  min_level: number;
  requires_activation: boolean;
};

const reasons: Record<string, string> = {
  not_activated: "Activate your account to complete tasks.",
  level_too_low: "Upgrade your plan to unlock this task.",
  already_completed: "You already completed this task today.",
  task_expired: "This task has expired.",
  task_unavailable: "This task is no longer available.",
};

function TasksPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, description, reward, category, action_url, min_level, requires_activation")
        .eq("active", true)
        .order("sort_order"),
      uid
        ? supabase.from("task_completions").select("task_id").eq("user_id", uid).eq("completed_on", today)
        : Promise.resolve({ data: [] as { task_id: string }[] }),
    ]);
    setTasks((t as Task[]) ?? []);
    setDone(new Set(((c as { task_id: string }[]) ?? []).map((r) => r.task_id)));
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const complete = async (task: Task) => {
    setBusy(task.id);
    if (task.action_url) window.open(task.action_url, "_blank", "noopener,noreferrer");
    const { data, error } = await supabase.rpc("complete_task", { _task_id: task.id });
    setBusy(null);
    const res = (data ?? {}) as { ok?: boolean; reason?: string; reward?: number };
    if (error) return toast.error("Could not complete task", { description: error.message });
    if (!res.ok) return toast.error(reasons[res.reason ?? ""] ?? "Task not available right now.");
    toast.success(`Task complete — ${naira(res.reward ?? task.reward)} added`);
    setDone((prev) => new Set(prev).add(task.id));
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <AppPage nav="tasks" title="Daily Tasks" subtitle="Finish tasks and earn instantly">
        {tasks.length === 0 ? (
          <EmptyState text="No tasks available right now. Check back soon." />
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const completed = done.has(task.id);
              return (
                <article
                  key={task.id}
                  className="animate-fade-up rounded-2xl border border-border bg-card p-4 shadow-soft"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-royal/15 text-royal">
                      <Clipboard className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight">{task.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {task.description}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-semibold text-gold">
                          {naira(task.reward)}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 capitalize text-muted-foreground">
                          {task.category}
                        </span>
                        {task.min_level > 0 && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                            Level {task.min_level}+
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={completed || busy === task.id}
                    onClick={() => complete(task)}
                    className={cn(
                      "mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition active:scale-[0.98]",
                      completed
                        ? "border border-success/40 bg-success/10 text-success"
                        : "bg-gold-gradient text-gold-foreground",
                    )}
                  >
                    {busy === task.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : completed ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                    {completed ? "Completed today" : "Start task"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </AppPage>
    </>
  );
}
