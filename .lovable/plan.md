# Frontend tapping sessions and cooldowns

## Goal
Add the requested session-based tapping experience and a dedicated **Tapping Sessions** admin area without changing migrations, database objects, RLS, RPC definitions, financial rules, or unrelated pages.

## User Tap experience
- Refactor the current Tap page into explicit **ready**, **active**, **cooldown**, **ended**, **disabled**, **loading**, and **error** states while preserving its existing navy/gold mobile layout and bottom navigation.
- Keep `tap_state()` as the initial source of truth and extend the frontend response type to consume Manus-provided session fields when present: session status, start, expiry, cooldown expiry, session tap count, session earnings, and level settings.
- Show **Start Tapping** only when the backend says the session is ready. Starting calls the secure backend action, disables duplicate clicks, and renders only the returned state.
- During an active session, derive a display-only countdown from the returned expiry timestamp. Continue sending every tap through `perform_tap()` and merge authoritative returned values instead of calculating rewards or balances locally.
- At expiry or cooldown completion, refresh from `tap_state()` before enabling any action. Never locally declare a session active or award earnings.
- Map `session_expired`, `cooldown_active`, `tapping_disabled`, `maximum_taps_reached`, `invalid_session`, and `unauthenticated` to clear inline notices/toasts, while preserving existing activation, account, battery, and daily-limit messages.
- Display the current level name and backend-returned duration, cooldown, tap reward, maximum taps, current session taps, and session earnings. No React defaults will invent financial or timing values.

## Admin Tapping Sessions area
- Add a **Tapping Sessions** entry to the existing admin navigation; do not redesign the panel.
- Create a focused admin component with two views:
  - **Level settings:** Levels 0–7 with Session Duration, Cooldown, Tap Reward, Max Taps, and Enabled controls. Load existing level rows and show a clear unavailable marker for fields Manus has not supplied yet.
  - **Session activity:** username, level, session status, session start, expiry, cooldown expiry, tap count, and earnings, with loading, empty, error, and refresh states.
- Save each level through the existing secure `admin_update_level_settings(_level, _settings)` RPC. The payload will add only the tapping-session fields shown in this section; it will not write directly to `levels`.
- Load activity through a secure admin RPC and never query another user's session data from a public/user-scoped frontend table.

## Backend contracts the frontend will expect from Manus
Existing contracts will remain in use and only be extended where noted:

1. `tap_state()` — existing, authenticated. Expected additional response fields:
   - `session_status`: `ready | active | cooldown | ended | disabled`
   - `session_started_at`, `session_expires_at`, `cooldown_expires_at`: ISO timestamps or `null`
   - `session_tap_count`, `session_earnings`
   - `session_duration_seconds`, `session_cooldown_seconds`, `session_max_taps`
   - existing fields such as `level`, `level_name`, `reward_per_tap`, `balance`, and limits remain authoritative.
2. `start_tapping_session()` — required secure authenticated action because no start-session RPC exists in the repository. Returns the same authoritative session shape plus `ok`, optional `reason`, and optional `message`.
3. `perform_tap()` — existing secure action. Manus should return the same session timestamps/status/counters when session enforcement is added; the UI will continue supporting current reward/balance/battery fields.
4. `admin_update_level_settings(_level integer, _settings jsonb)` — existing secure admin action. Manus should accept `session_duration_seconds`, `session_cooldown_seconds`, `session_max_taps`, `reward_per_tap`, and `enabled`.
5. `admin_tapping_session_activity()` — required secure admin read because no session-activity RPC exists. Expected `{ ok, rows }`, where each row has `id`, `username`, `level`, `level_name`, `session_status`, `session_started_at`, `session_expires_at`, `cooldown_expires_at`, `session_tap_count`, and `session_earnings`.

All calls will tolerate an RPC error or missing new fields and show an unavailable state; they will not fall back to a fake timer, reward, session, approval, or balance.

## Files and verification
- Update `src/routes/tap.tsx` for the session state machine and backend-driven timers.
- Add `src/components/admin/tapping-sessions.tsx` for level controls and activity.
- Update `src/routes/admin.tsx` to register and render the new admin section.
- Update `AGENTS.md` with the stable frontend/backend session-contract boundary.
- Do not touch `supabase/`, generated backend clients/types, activation, upgrade, or withdrawal logic.
- Run the existing production build, review the latest build diagnostics, and exercise public/renderable states where the connected backend permits.
