import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AuthShell } from "@/components/auth/auth-shell";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { COUNTRIES, statesFor } from "@/lib/countries";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Your Free Account — EarnX-Finance" },
      {
        name: "description",
        content:
          "Register on EarnX-Finance in under a minute, verify your email and claim your ₦1,500 welcome bonus.",
      },
      { property: "og:title", content: "Create Your Free Account — EarnX-Finance" },
      {
        property: "og:description",
        content: "Register, verify your email and claim your ₦1,500 welcome bonus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

const schema = z
  .object({
    first_name: z.string().trim().min(2, "Enter your first name").max(60),
    other_names: z.string().trim().min(2, "Enter your other names").max(80),
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(24, "Username must be 24 characters or fewer")
      .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers and underscores only"),
    email: z.string().trim().email("Enter a valid email address").max(255),
    phone: z
      .string()
      .trim()
      .min(7, "Enter a valid phone number")
      .max(20)
      .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number"),
    country: z.string().trim().min(1, "Select your country"),
    state: z.string().trim().min(1, "Select your state or province"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128)
      .regex(/[a-zA-Z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirm_password: z.string(),
    referral_code: z.string().trim().max(20).optional().or(z.literal("")),
    terms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
  })
  .refine((v) => v.password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}


function RegisterPage() {
  const navigate = useNavigate();
  const [country, setCountry] = useState("Nigeria");
  const [state, setState] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const states = useMemo(() => statesFor(country), [country]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const raw = {
      first_name: String(form.get("first_name") ?? ""),
      other_names: String(form.get("other_names") ?? ""),
      username: String(form.get("username") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      country: String(form.get("country") ?? ""),
      state,
      password: String(form.get("password") ?? ""),
      confirm_password: String(form.get("confirm_password") ?? ""),
      referral_code: String(form.get("referral_code") ?? ""),
      terms: form.get("terms") === "on",
    };

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
      toast.error("Please correct the highlighted fields.");
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: parsed.data.first_name,
            other_names: parsed.data.other_names,
            username: parsed.data.username,
            phone: parsed.data.phone,
            country: parsed.data.country,
            state: parsed.data.state,
            referral_code: (parsed.data.referral_code ?? "").toUpperCase(),
          },
        },
      });

      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("already registered") || message.includes("already been")) {
          toast.error("An account with that email address already exists.");
        } else if (message.includes("duplicate") || message.includes("username")) {
          toast.error("That username is already taken. Please choose another.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        toast.success("Account created. Welcome to EarnX-Finance!");
        navigate({ to: "/dashboard", replace: true });
      } else {
        toast.success("Account created. Check your email to verify your account, then log in.");
        navigate({ to: "/login", replace: true });
      }

    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes under a minute. Verify your email to claim your ₦1,500 welcome bonus."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-gold hover:underline">
            Login
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={errors.first_name}>
            <Input name="first_name" autoComplete="given-name" placeholder="Meshach" />
          </Field>
          <Field label="Other names" error={errors.other_names}>
            <Input name="other_names" autoComplete="family-name" placeholder="Daniel" />
          </Field>
        </div>

        <Field label="Username" error={errors.username}>
          <Input name="username" autoComplete="username" placeholder="meshach_d" />
        </Field>

        <Field label="Email address" error={errors.email}>
          <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" />
        </Field>

        <Field label="Phone number" error={errors.phone}>
          <Input name="phone" type="tel" autoComplete="tel" placeholder="+234 800 000 0000" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Country" error={errors.country}>
            <SearchableSelect
              id="country"
              name="country"
              value={country}
              onValueChange={(value) => {
                setCountry(value);
                setState("");
              }}
              options={COUNTRIES.map((c) => ({ value: c.name, label: c.name }))}
              placeholder="Select country"
              searchPlaceholder="Search countries…"
            />
          </Field>
          <Field label="State / Province" error={errors.state}>
            <SearchableSelect
              id="state"
              name="state"
              value={state}
              onValueChange={setState}
              options={states.map((s) => ({ value: s, label: s }))}
              placeholder="Select state / province"
              searchPlaceholder="Search states…"
              disabled={!country || states.length === 0}
            />
          </Field>
        </div>

        <Field label="Password" error={errors.password}>
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
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
        </Field>

        <Field label="Confirm password" error={errors.confirm_password}>
          <Input
            name="confirm_password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Re-enter your password"
          />
        </Field>

        <Field label="Referral code (optional)" error={errors.referral_code}>
          <Input name="referral_code" placeholder="EX1A2B3C" className="uppercase" />
        </Field>

        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
          <Checkbox name="terms" className="mt-0.5" />
          <span>
            I accept the{" "}
            <Link to="/terms" className="font-semibold text-gold hover:underline">
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="font-semibold text-gold hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.terms && <p className="text-xs text-destructive">{errors.terms}</p>}

        <PremiumButton type="submit" variant="gold" size="lg" block disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Creating your account…" : "Create account"}
        </PremiumButton>
      </form>
    </AuthShell>
  );
}
