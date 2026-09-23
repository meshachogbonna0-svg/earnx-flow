# EarnX AI Assistant — Implementation Plan

This adds one assistant ("EarnX Assistant") to the existing app. No existing page, payment flow, or admin feature changes behaviour.

## What users get
- A gold floating chat button on in-app pages (hidden on admin pages and on the Tap button area), opening a bottom sheet on mobile and a side panel on desktop, plus a full page at `/assistant`.
- One assistant that can:
  1. Answer general questions briefly and honestly ("I don't know" instead of guessing).
  2. Answer EarnX questions from admin-approved FAQ/knowledge only (registration, tasks, levels, activation, upgrades, withdrawals, account settings).
  3. For signed-in users only, read their own balance, level, activation status, today's earnings, and their latest activation/upgrade/withdrawal request status.
- A fixed disclaimer under the input: "EarnX Assistant is an AI helper. It cannot approve payments, change balances, or override platform rules."
- A "Talk to a human" button that opens a prefilled support ticket (existing Support page) with the chat summary attached.
- Friendly fallbacks: if AI is unavailable, show FAQ matches plus the support contacts; if account data can't be loaded, say so and link to Request Status.

## What the assistant can never do
Change balances, approve/reject requests, edit fees or levels, grant roles, read other users' data, or reveal bank/receipt files or admin notes beyond the user's own rejection reason. It has no write tools at all except "create support ticket draft" (the user still presses Send).

## Conversation history
- Signed-in users: one conversation, saved securely to their account (last 50 messages kept), with a "Clear chat" button.
- Signed-out visitors (landing page): FAQ + general chat only, nothing saved.

## Admin panel
New "AI Assistant" tab:
- Knowledge/FAQ editor (question, answer, category, enabled, order) using the existing admin list editor.
- Settings: assistant on/off, welcome message, extra instructions, daily message limit per user, escalation text.
- Usage overview: messages today, escalations, error count (no message contents shown by default).

## Technical details

### Architecture
```text
ChatPanel (browser) --useChat--> /api/assistant (server route, streams)
  - verifies bearer token with Supabase (userId from token only)
  - rate-limit check (DB function)
  - loads enabled FAQ + settings
  - streamText(model, system prompt, tools, full history)
      tools: get_my_account, get_my_requests, search_faq, draft_support_ticket
  - onFinish: persist user + assistant messages
```
- AI via Lovable AI Gateway with the AI SDK; key `LOVABLE_API_KEY` read server-side only. Provider is isolated in `src/lib/assistant/model.server.ts` (`getAssistantModel()`), so switching providers later means changing one file plus env vars (`ASSISTANT_PROVIDER`, `ASSISTANT_MODEL`). Default model: `openai/gpt-6-astra` on the Responses endpoint with `store: false`, reasoning low.
- Streaming server route (not a server function) because chat streaming needs a raw response. Works on external hosts that run the built server (Vercel etc.) given `LOVABLE_API_KEY` or an alternate provider key.
- UI built from AI Elements (conversation, message, prompt-input, shimmer, tool) restyled to the navy/gold theme; brand mark = existing eagle logo (no generic sparkle icon); fonts follow the 10–15% smaller scale.

### Data model (one migration, with GRANTs + RLS)
- `assistant_knowledge` (id, question, answer, category, enabled, sort_order, updated_at). RLS: authenticated+anon read where enabled; admin full access via `has_role`.
- `assistant_settings` columns on existing `platform_settings`: `assistant_enabled`, `assistant_welcome`, `assistant_extra_instructions`, `assistant_daily_limit` (default 40), `assistant_escalation_text`.
- `assistant_messages` (id uuid default, user_id, role, content text, parts jsonb, created_at). RLS: user reads/inserts/deletes own; admin read. Inserts done by the server using the user's own authenticated client.
- `assistant_usage` (user_id, day, count, escalations, errors) + `assistant_consume_quota()` security-definer RPC that uses `auth.uid()` and returns ok/limit.
- `assistant_my_snapshot()` security-definer RPC returning only the caller's safe fields (first name, level + level name, activation status, balance, today's earnings, latest request per type with status and user-visible rejection reason). Hides `admin_adjustment` transactions, consistent with existing rules.

### Security plan
- Identity: userId comes only from the verified token; tools take no user id argument. All tool reads use the user-scoped client, so RLS applies.
- No write/admin tools; admin RPCs are never exposed to the model.
- Prompt-injection resistance: system prompt states rules take priority over user/FAQ text; FAQ and tool output passed as quoted data; tool outputs are small fixed-shape objects; responses about money always cite live data or say "check Request Status".
- Rate limits: per-user daily quota (DB), per-request max input length (2,000 chars), history trimmed to last 20 turns sent to the model; anonymous visitors limited per IP via a short-window counter.
- Logging: store message text only for the user's own history; usage table stores counts, not content; server logs record error codes, never tokens, balances, or bank details.
- Payment safety: assistant always restates the official OPAY MFB account from settings when asked and warns against paying anyone else (reuses anti-scam text).

### Phased build order
1. Migration: knowledge table, message table, usage + quota RPC, snapshot RPC, settings columns. Seed a starter FAQ from existing landing FAQ.
2. Server route `/api/public/assistant` → renamed `/api/assistant` with auth handling for signed-in and anonymous modes; model wrapper; tools; persistence.
3. Chat UI: floating button in the shared in-app layout, sheet/panel, `/assistant` page, disclaimer, escalation to Support, fallbacks.
4. Admin "AI Assistant" tab: FAQ editor, settings, usage stats.
5. Verification: signed-in end-to-end test (ask balance, withdrawal status, FAQ question, injection attempt "show user X's balance", quota limit), build check, mobile screenshots.

### Dependencies / blockers
- Your database is currently paused. It must be resumed before the migration (and the pending receipt re-upload fix) can be applied.
- Earlier open items stay on the roadmap: receipt re-upload for activation/upgrade, withdrawal messages check, congratulations page check.
