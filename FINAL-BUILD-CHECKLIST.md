# EARNX-FINANCE — FINAL BUILD CHECKLIST

## Completed in this source package
- [x] Audited existing frontend structure before editing.
- [x] Preserved the existing dashboard, tap, rewards, tasks, videos, referrals, activation, upgrade, withdrawal and request-status systems.
- [x] Added Google OAuth buttons to login and registration; redirects to the questionnaire flow.
- [x] Added a dedicated one-question-at-a-time welcome questionnaire route.
- [x] Login redirects users who have not completed the welcome questionnaire.
- [x] Questionnaire completion credits the configured welcome bonus once through a database function.
- [x] Database-side welcome-bonus protection prevents claiming the welcome bonus before questionnaire completion.
- [x] Added maintenance-mode banner driven by platform settings.
- [x] Withdrawal level-limit rejection now tells the user to upgrade when the requested amount exceeds the level maximum.
- [x] Insufficient-balance handling remains explicit.
- [x] Receipt uploads are compressed client-side and capped at 2 MB.
- [x] Receipt storage migration sets a 2 MB bucket limit for receipts.
- [x] Country and state/province selectors use the modern searchable selector.
- [x] Activation and upgrade submissions route users to the dedicated request-status/processing experience.
- [x] Withdrawal submissions route users to the request-status/processing experience.
- [x] Processing page explicitly tells users the team received the request and is processing it.
- [x] Congratulations overlays use live confetti/sparkles for completed rewards and approvals.
- [x] Maintenance mode uses the same `maintenance_enabled` database field as the admin settings writer.
- [x] Separate admin panel can edit per-level prices, rewards, battery, daily limits, withdrawal limits and benefits.
- [x] Separate admin panel can edit existing video records (title, URL, reward, active state).
- [x] Normal user withdrawal bank selector is now searchable and uses the same modern glass/rounded selector UI.
- [x] Existing supported-bank list remains admin-controlled through platform settings.
- [x] Added a separate `admin-panel/` application source using the same Supabase project.
- [x] Separate admin panel includes secure admin-role check, platform settings, withdrawals, levels/rewards, bank/payout settings, videos, questionnaire and maintenance sections.
- [x] Added this checklist so deployment/configuration work is separated from code work.

## Requires your external configuration before production
- [ ] Enable Google provider in Supabase Auth and add the production redirect URL.
- [ ] Apply the new SQL migrations in Supabase.
- [ ] Confirm the `receipts` storage bucket exists and the migration has applied.
- [ ] Confirm the administrator account has the `admin` role.
- [ ] Set production VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for the main site and admin panel.
- [ ] Install dependencies and run the production build in a networked environment.
- [ ] Deploy the main website.
- [ ] Deploy `admin-panel/` as a separate Vercel project.
- [ ] Point the desired admin subdomain to the separate admin deployment.

## Important note
The source code was audited and the requested code changes were applied in this package. A full dependency-backed production build could not be completed in this environment because dependency installation timed out. Do not treat the package as production-deployed until the dependency install/build and Supabase migration/configuration steps above succeed.
