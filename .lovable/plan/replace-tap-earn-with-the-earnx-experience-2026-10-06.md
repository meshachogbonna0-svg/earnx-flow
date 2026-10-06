# Replace Tap & Earn with the EarnX experience

## Scope
- Replace only the current `/tap` presentation and refine the existing Admin tapping section.
- Keep authentication, routing, wallet, withdrawals, upgrades, tasks, profile, dashboard, and backend definitions unchanged.
- Treat the supplied screenshots as structural references only; use the existing navy, purple, gold, emerald, black, and glass tokens.

## User Tap & Earn page
- Build a premium rounded navy-to-purple header with the user's server-returned plan and reward rate.
- Show server-returned Today Taps, Today Earned, and Total Earned statistics with Naira formatting.
- Build an EarnX-branded circular `EARNX CORE` control with inactive, active, complete, cooldown, and disabled states.
- Keep `tap_state`, `start_tapping_session`, and `perform_tap` as the only authorities for status, timestamps, counters, earnings, rewards, and limits.
- Derive the countdown and progress display from backend timestamps and duration; refresh state at session/cooldown boundaries without awarding value locally.
- Prevent concurrent starts/taps, provide restrained press/reward feedback after successful server responses, and show clear server reason messages.
- Add Current Plan and Total Taps information cards, then reuse the existing bottom navigation with Tap highlighted.
- Ensure the composition fits 360–412px screens without overflow and respects reduced motion.

## Admin Tap & Earn Settings
- Rename the existing admin section to `Tap & Earn Settings`.
- Keep Levels 0–7 and secure saves through `admin_update_level_settings`; never write settings directly from the browser.
- Add available controls for session duration, maximum taps, reward per tap, sessions per day, cooldown, recharge, daily tap limit, and enabled state.
- Show unavailable placeholders for fields Manus has not supplied, and include only supplied fields in the secure save payload.
- Preserve the activity view and its existing `admin_tapping_session_activity` contract.
- Add validation, per-level loading, success, and backend error feedback.

## Verification
- Fix the current TanStack root error-component typing regression required for a clean build, without changing its behavior.
- Run the production build and inspect the Tap page at mobile width where authentication/backend availability permits.
- Confirm no Nova text, pastel-lavender theme, duplicate navigation, frontend balance math, database migration, schema, RLS, or RPC definition changes.

## Expected existing backend contracts
- `tap_state()` returns authoritative plan/level, status, timestamps, counters, earnings, reward, duration, cooldown, maximum taps, and any daily/session limits it supports.
- `start_tapping_session()` returns the newly authoritative session state or a reason/message.
- `perform_tap()` validates and returns updated authoritative counters, earnings, balance, and session state.
- `admin_update_level_settings(_level, _settings)` validates authorized per-level setting updates.
- `admin_tapping_session_activity()` returns authorized session activity rows.
