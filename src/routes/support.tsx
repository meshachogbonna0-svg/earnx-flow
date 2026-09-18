import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LifeBuoy, Loader2, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, PageLoader } from "@/components/dashboard/app-page";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ReportScamButton } from "@/components/security/payment-security";

export const Route = createFileRoute("/support")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Help & Support — EarnX-Finance" },
      {
        name: "description",
        content: "Get help with your EarnX-Finance account — open a support ticket or chat with our team.",
      },
      { property: "og:title", content: "Help & Support — EarnX-Finance" },
      { property: "og:description", content: "Open a ticket or chat with our support team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupportPage,
});

type Ticket = {
  id: string;
  subject: string;
  description: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
};

function SupportPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [contact, setContact] = useState({ email: "", whatsapp: "" });

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    const [{ data: t }, { data: s }] = await Promise.all([
      supabase
        .from("support_tickets")
        .select("id, subject, description, status, admin_reply, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false }),
      supabase.from("platform_settings").select("support_email, whatsapp_number").maybeSingle(),
    ]);
    setTickets((t as Ticket[]) ?? []);
    const set = s as { support_email: string; whatsapp_number: string } | null;
    setContact({ email: set?.support_email ?? "", whatsapp: set?.whatsapp_number ?? "" });
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    setBusy(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: auth.user.id,
      subject: subject.trim(),
      description: description.trim(),
    });
    setBusy(false);
    if (error) return toast.error("Could not send ticket", { description: error.message });
    toast.success("Ticket submitted — we'll reply soon");
    setSubject("");
    setDescription("");
    void load();
  };

  if (loading) return <PageLoader />;

  return (
    <AppPage title="Help & Support" subtitle="We usually reply within 24 hours">
      <section className="grid grid-cols-2 gap-3">
        <a
          href={`mailto:${contact.email}`}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-4 text-center transition active:scale-[0.98]"
        >
          <Mail className="h-4 w-4 text-gold" />
          <span className="text-[11px] font-semibold">Email us</span>
          <span className="truncate text-[10px] text-muted-foreground">{contact.email}</span>
        </a>
        <a
          href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-4 text-center transition active:scale-[0.98]"
        >
          <MessageCircle className="h-4 w-4 text-success" />
          <span className="text-[11px] font-semibold">WhatsApp</span>
          <span className="truncate text-[10px] text-muted-foreground">{contact.whatsapp}</span>
        </a>
      </section>

      <section className="animate-fade-up space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
          <LifeBuoy className="h-3 w-3" /> OPEN A TICKET
        </p>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe your issue in detail"
          className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs outline-none transition focus:border-gold/60"
        />
        <button
          type="button"
          disabled={busy || !subject.trim() || !description.trim()}
          onClick={submit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3 text-xs font-bold text-gold-foreground transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Submit ticket
        </button>
      </section>

      <section>
        <h2 className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">YOUR TICKETS</h2>
        <div className="mt-3 space-y-2.5">
          {tickets.length === 0 && (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
              No tickets yet.
            </p>
          )}
          {tickets.map((t) => (
            <article key={t.id} className="rounded-2xl border border-border bg-card p-3.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold">{t.subject}</p>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                    t.status === "closed"
                      ? "bg-success/10 text-success"
                      : t.status === "pending"
                        ? "bg-gold/10 text-gold"
                        : "bg-royal/15 text-royal",
                  )}
                >
                  {t.status}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t.description}</p>
              {t.admin_reply && (
                <p className="mt-2 rounded-xl border border-gold/30 bg-gold/5 p-2.5 text-[11px] text-gold">
                  {t.admin_reply}
                </p>
              )}
              <p className="mt-2 text-[10px] text-muted-foreground">{dateTime(t.created_at)}</p>
            </article>
          ))}
        </div>
      </section>
      <ReportScamButton />
    </AppPage>
  );
}
