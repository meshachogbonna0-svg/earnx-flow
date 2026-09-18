# EarnX-Finance — Repair Pass

This package is based on the existing project and does not include secrets.

## Applied fixes
- Hardened login session persistence before redirecting to `/dashboard`.
- Fixed registration redirect so users without an active session are sent to `/login` for verification instead of a broken dashboard redirect.
- Hardened dashboard profile loading with an explicit retry and visible error handling instead of silently treating database errors as missing profiles.
- Added `id` to the dashboard profile select.
- Added mobile-safe Sonner/toast sizing so notifications cannot become oversized or overflow small screens.
- Replaced the registration country/state native selects with a searchable, touch-friendly Popover + Command selector.
- Reset the state selection whenever the country changes.
- Kept existing branding, database schema, routes, and feature architecture intact.

## Important
No `.env`, Supabase password, service-role key, or other secret is included.
