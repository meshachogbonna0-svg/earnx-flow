# Remove the AI button and add floating particles

## What changes
1. **AI Assistant button removed** — the gold "AI Assistant" button and its chat window no longer appear anywhere on the site. The EarnX AI Assistant plan is dropped.
2. **Floating particles on every page** — soft gold and purple glowing dots drift slowly up and across the whole background (landing, login, dashboard, all in-app pages and admin), behind all content.
   - They never block taps or clicks and sit behind cards, buttons and the bottom navigation.
   - Fewer particles on phones (about 25) than on large screens (about 45) so the app stays smooth.
   - If the phone has "reduce motion" turned on, the particles stay still.
   - They match the existing navy/black/gold/purple theme: small, blurred, low-opacity, gently twinkling.

Nothing else changes: dashboard layout, payments, requests and admin tools stay the same.

## Technical details
- `src/routes/__root.tsx`: delete the `AiAssistant` import, the `AuthenticatedAssistant` helper and its render; mount a new `<FloatingParticles />` once in the root shell.
- Delete `src/components/ai-assistant.tsx`, `src/lib/ai-assistant.ts` and the `src/routes/api.ai.chat.ts` endpoint (route tree regenerates automatically).
- New `src/components/floating-particles.tsx`: a `fixed inset-0 -z-0 pointer-events-none` layer rendered client-only (particles generated in `useEffect` to avoid hydration mismatch), each particle an absolutely positioned span with randomized size (2–6px), position, duration (12–28s), delay and colour token (`gold` / `royal`).
- `src/styles.css`: add `particle-float` (translate upward with slight horizontal drift + fade in/out) and `particle-twinkle` keyframes, with a `prefers-reduced-motion` override that disables animation. Ensure page wrappers keep content above the layer (`relative z-10` where the background is fully opaque, or make the layer sit above the body background but below content).
- Verify with a mobile-width screenshot of the landing page and dashboard, and confirm the build passes.
