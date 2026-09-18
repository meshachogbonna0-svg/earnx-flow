import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Chrome } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AuthShell } from "@/components/auth/auth-shell";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { resolveLoginEmail } from "@/lib/auth.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — EarnX-Finance" },
      { name: "description", content: "Sign in to your EarnX-Finance account to keep earning and manage withdrawals." },
      { property: "og:title", content: "Login — EarnX-Finance" },
      { property: "og:description", content: "Sign in to your EarnX-Finance account to keep earning." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  identifier: z.string().trim().min(3, "Enter your username or email address").max(255),
  password: z.string().min(6, "Your password must be at least 6 characters").max(128),
});

function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function continueWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/questionnaire` },
    });
    if (error) {
      toast.error("Google sign-in is unavailable", { description: error.message });
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = schema.safeParse({
      identifier: String(form.get("identifier") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const { email } = await resolveLoginEmail({
        data: { identifier: parsed.data.identifier },
      });

      if (!email) {
        toast.error("We couldn't find an account with that username.");
        return;
      }

      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email,
        password: parsed.data.password,
      });

      if (error) {
        toast.error(
          error.message.toLowerCase().includes("invalid")
            ? "Those details don't match an account. Please check and try again."
            : error.message,
        );
        return;
      }

      // Confirm the session is actually persisted before leaving the login page.
      // This prevents a fast redirect from racing localStorage/session hydration.
      const { data: sessionCheck } = await supabase.auth.getSession();
      if (!sessionCheck.session && !signInData.session) {
        toast.error("Login succeeded, but your session was not saved. Please try again.");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("survey_completed, welcome_bonus_claimed")
        .eq("id", signInData.user?.id ?? sessionCheck.session?.user.id ?? "")
        .maybeSingle();
      toast.success("Welcome back to EarnX-Finance.");
      if (profile && profile.survey_completed === false && profile.welcome_bonus_claimed === false) {
        navigate({ to: "/questionnaire", replace: true });
      } else {
        navigate({ to: "/dashboard", replace: true });
      }

    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with your username or email address to continue earning."
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-gold hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <button
        type="button"
        onClick={() => void continueWithGoogle()}
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/70 text-sm font-semibold transition hover:border-gold/40 hover:bg-secondary/50 disabled:opacity-60"
      >
        <Chrome className="h-4 w-4" /> Continue with Google
      </button>
      <div className="flex items-center gap-3 py-1 text-[10px] text-muted-foreground">
        <span className="h-px flex-1 bg-border" /><span>OR</span><span className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="identifier">Username or email</Label>
          <Input id="identifier" name="identifier" autoComplete="username" placeholder="you@example.com" />
          {errors.identifier && <p className="text-xs text-destructive">{errors.identifier}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 grid h-8 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox name="remember" defaultChecked />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-xs font-medium text-gold hover:underline">
            Forgot password?
          </Link>
        </div>

        <PremiumButton type="submit" variant="gold" size="lg" block disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Signing you in…" : "Login"}
        </PremiumButton>
      </form>
    </AuthShell>
  );
}
