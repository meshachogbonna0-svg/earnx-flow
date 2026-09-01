import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, PageLoader } from "@/components/dashboard/app-page";
import { naira } from "@/lib/format";

export const Route = createFileRoute("/videos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Watch & Earn — EarnX-Finance" },
      {
        name: "description",
        content: "Watch short sponsored videos on EarnX-Finance and earn Naira rewards once the timer completes.",
      },
      { property: "og:title", content: "Watch & Earn — EarnX-Finance" },
      { property: "og:description", content: "Watch short videos, earn Naira rewards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VideosPage,
});

type Video = {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  watch_seconds: number;
  reward: number;
  daily_repeat: boolean;
};

const rpc = async (fn: string, args?: Record<string, unknown>) => {
  const call = supabase.rpc.bind(supabase) as unknown as (
    n: string,
    p?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  return call(fn, args);
};

function VideosPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [watching, setWatching] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const timer = useRef<number | null>(null);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: v }, { data: c }] = await Promise.all([
      supabase.from("videos" as never).select("*").eq("active", true).order("sort_order"),
      supabase.from("video_completions" as never).select("video_id, completed_on").eq("user_id", auth.user.id),
    ]);
    setVideos((v as unknown as Video[]) ?? []);
    const rows = (c as unknown as { video_id: string; completed_on: string }[]) ?? [];
    const list = (v as unknown as Video[]) ?? [];
    setDone(
      rows
        .filter((r) => {
          const vid = list.find((x) => x.id === r.video_id);
          return vid ? (vid.daily_repeat ? r.completed_on === today : true) : false;
        })
        .map((r) => r.video_id),
    );
    setLoading(false);
  };

  useEffect(() => {
    void load();
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  const start = (video: Video) => {
    setWatching(video.id);
    setLeft(video.watch_seconds);
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          if (timer.current) window.clearInterval(timer.current);
          void claim(video);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  };

  const claim = async (video: Video) => {
    const { data, error } = await rpc("complete_video", {
      _video_id: video.id,
      _watched_seconds: video.watch_seconds,
    });
    setWatching(null);
    const res = (data ?? {}) as { ok?: boolean; reason?: string; reward?: number };
    if (error) return toast.error("Could not credit this video. Please try again.");
    if (!res.ok)
      return toast.error(
        res.reason === "already_completed" ? "You already earned from this video." : "This video isn't available.",
      );
    toast.success(`Reward credited: ${naira(res.reward ?? 0)}`);
    void load();
  };

  if (loading) return <PageLoader />;

  return (
    <AppPage title="Watch & Earn" subtitle="Watch fully to unlock your reward">
      {videos.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          No videos available right now. Check back soon.
        </p>
      )}
      <div className="space-y-3">
        {videos.map((v) => {
          const completed = done.includes(v.id);
          const active = watching === v.id;
          return (
            <article key={v.id} className="animate-fade-up rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold">{v.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{v.description}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Watch {v.watch_seconds}s to earn</p>
                </div>
                <p className="shrink-0 text-xs font-bold text-gold">{naira(v.reward)}</p>
              </div>

              {active && (
                <div className="mt-3 overflow-hidden rounded-xl border border-border">
                  <video src={v.video_url} controls autoPlay playsInline className="h-44 w-full bg-black object-contain" />
                </div>
              )}

              {completed ? (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Reward claimed
                </p>
              ) : (
                <button
                  type="button"
                  disabled={active}
                  onClick={() => start(v)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gold-gradient py-2.5 text-xs font-bold text-gold-foreground transition active:scale-[0.98] disabled:opacity-70"
                >
                  {active ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Keep watching — {left}s left
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-3.5 w-3.5" /> Watch and earn
                    </>
                  )}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </AppPage>
  );
}
