import { createFileRoute } from "@tanstack/react-router";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import {
  Contact,
  Faq,
  Features,
  Hero,
  HowItWorks,
  Rewards,
  Stats,
  Testimonials,
} from "@/components/landing/sections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EarnX-Finance — Earn Every Day, Get Paid In Naira" },
      {
        name: "description",
        content:
          "EarnX-Finance is a premium earning platform: tap to earn, complete daily tasks, invite friends and withdraw to your bank within 24 hours.",
      },
      { property: "og:title", content: "EarnX-Finance — Earn Every Day, Get Paid In Naira" },
      {
        property: "og:description",
        content:
          "Tap to earn, complete daily tasks, invite friends and withdraw straight to your bank account. Claim your ₦1,500 welcome bonus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <main>
        <Hero />
        <Stats />
        <HowItWorks />
        <Features />
        <Rewards />
        <Testimonials />
        <Faq />
        <Contact />
      </main>
      <LandingFooter />
    </div>
  );
}
