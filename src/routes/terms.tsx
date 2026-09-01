import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

/** Shared reading layout for the legal pages. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-hero-glow px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="inline-flex">
          <Logo />
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
        <div className="glass mt-8 space-y-6 rounded-3xl p-6 sm:p-8">{children}</div>
        <div className="mt-8 text-sm text-muted-foreground">
          <Link to="/" className="font-semibold text-gold hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — EarnX-Finance" },
      {
        name: "description",
        content:
          "The rules that govern EarnX-Finance accounts, activation, earnings, referrals and withdrawals.",
      },
      { property: "og:title", content: "Terms & Conditions — EarnX-Finance" },
      {
        property: "og:description",
        content: "Rules governing EarnX-Finance accounts, earnings and withdrawals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" updated="February 2026">
      <LegalSection heading="1. Accepting these terms">
        <p>
          By creating an EarnX-Finance account you agree to these terms. If you do not agree,
          please do not register or use the platform.
        </p>
      </LegalSection>
      <LegalSection heading="2. Eligibility and one account per person">
        <p>
          You must be at least 18 years old and provide accurate personal details. Each person may
          hold one account only. Duplicate, automated or fraudulent accounts will be suspended and
          any balance forfeited.
        </p>
      </LegalSection>
      <LegalSection heading="3. Activation">
        <p>
          Some earning features require a one-time account activation payment. Activation is
          confirmed manually after payment review and is non-refundable once your account has been
          activated.
        </p>
      </LegalSection>
      <LegalSection heading="4. Earnings and balances">
        <p>
          Earnings from taps, tasks, promotions and referrals are credited to your in-app balance.
          Balances are a record of platform credit, not a bank deposit, and carry no interest.
          Reward rates, battery limits and level pricing may change at any time.
        </p>
      </LegalSection>
      <LegalSection heading="5. Referrals">
        <p>
          Referral bonuses are paid only for genuine referred members who register and activate.
          Self-referral, incentivised sign-ups and bulk registrations are prohibited.
        </p>
      </LegalSection>
      <LegalSection heading="6. Withdrawals">
        <p>
          Withdrawal requests are reviewed before payout and must be made to a bank account in your
          own name. Minimum amounts, fees and processing windows are shown in the app at request
          time. We may decline a withdrawal linked to suspected abuse.
        </p>
      </LegalSection>
      <LegalSection heading="7. Prohibited conduct">
        <p>
          Bots, emulators, scripts, tap automation, VPN masking to fake location, and any attempt to
          manipulate rewards are strictly prohibited and result in permanent suspension.
        </p>
      </LegalSection>
      <LegalSection heading="8. Suspension and termination">
        <p>
          We may suspend or close accounts that breach these terms, and withhold associated
          balances pending investigation.
        </p>
      </LegalSection>
      <LegalSection heading="9. Changes">
        <p>
          We may update these terms. Continued use of EarnX-Finance after an update means you
          accept the revised terms.
        </p>
      </LegalSection>
      <LegalSection heading="10. Contact">
        <p>Questions about these terms can be sent through the in-app support channel.</p>
      </LegalSection>
    </LegalPage>
  );
}
