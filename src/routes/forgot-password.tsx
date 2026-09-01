import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AuthShell } from "@/components/auth/auth-shell";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Your Password — EarnX-Finance" },
      {
        name: "description",
        content: "Securely reset your EarnX-Finance password and get back to earning.",
      },
      { property: "og:title", content: "Reset Your Password — EarnX-Finance" },
      { property: "og:description", content: "Securely reset your EarnX-Finance password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
});

function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = schema.safeParse({ email: String(form.get("email") ?? "") });

    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        parsed.data.email,
        { redirectTo: `${window.location.origin}/reset-password` },
      );
      if (resetError) {
        toast.error(resetError.message);
        return;
      }
      setSent(true);
      toast.success("Reset instructions are on their way.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter the email address on your account and we'll send you a secure reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="font-semibold text-gold hover:underline">
            Back to login
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold-gradient shadow-gold-glow animate-[scale-in_0.4s_ease-out]">
            <MailCheck className="h-6 w-6 text-gold-foreground" />
          </span>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Check your inbox for the reset link. It expires shortly for your security — if it
            doesn't arrive within a few minutes, check your spam folder.
          </p>
          <PremiumButton
            variant="outline"
            size="md"
            block
            className="mt-6"
            onClick={() => setSent(false)}
          >
            Use a different email
          </PremiumButton>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <PremiumButton type="submit" variant="gold" size="lg" block disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Sending…" : "Send reset link"}
          </PremiumButton>
        </form>
      )}
    </AuthShell>
  );
}
