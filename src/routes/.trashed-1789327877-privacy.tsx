import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "./terms";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — EarnX-Finance" },
      {
        name: "description",
        content:
          "How EarnX-Finance collects, uses, stores and protects your personal and payment information.",
      },
      { property: "og:title", content: "Privacy Policy — EarnX-Finance" },
      {
        property: "og:description",
        content: "How EarnX-Finance collects, uses and protects your personal information.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="February 2026">
      <LegalSection heading="1. What we collect">
        <p>
          Account details you give us (name, username, email, phone, country and state), payment
          references you submit for activation and withdrawals, and activity data such as taps,
          tasks completed, referrals and transactions.
        </p>
      </LegalSection>
      <LegalSection heading="2. Why we use it">
        <p>
          To create and secure your account, credit your earnings correctly, verify activation
          payments, process withdrawals, prevent fraud and multi-accounting, and send you service
          notifications.
        </p>
      </LegalSection>
      <LegalSection heading="3. Payment information">
        <p>
          We store the bank account name and number you provide for payouts. We never ask for your
          card PIN, internet-banking password or one-time bank codes — no EarnX-Finance staff member
          will ever request them.
        </p>
      </LegalSection>
      <LegalSection heading="4. Sharing">
        <p>
          We do not sell your data. We share it only with the service providers who host our
          infrastructure and deliver our email, and where the law requires disclosure.
        </p>
      </LegalSection>
      <LegalSection heading="5. Security">
        <p>
          Data is encrypted in transit and access to member records is restricted to authorised
          administrators. Keep your password private and use a unique one for this platform.
        </p>
      </LegalSection>
      <LegalSection heading="6. Retention">
        <p>
          We keep account and transaction records for as long as your account is open and for the
          period afterwards required for accounting and fraud prevention.
        </p>
      </LegalSection>
      <LegalSection heading="7. Your choices">
        <p>
          You can update your profile details in the app and request account deletion through
          support. Deleting an account removes access and forfeits any remaining balance.
        </p>
      </LegalSection>
      <LegalSection heading="8. Contact">
        <p>Privacy questions can be sent through the in-app support channel.</p>
      </LegalSection>
    </LegalPage>
  );
}
