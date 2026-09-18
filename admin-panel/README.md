# EarnX Admin Panel

Standalone admin application for the EarnX-Finance platform.

It uses the same Supabase project as the user website and checks the authenticated user's `admin` role with `ensure_admin_role`.

## Environment
Set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Deploy
Create a separate Vercel project with `admin-panel/` as the root directory, install dependencies, build with `npm run build`, and set the two environment variables.

The existing main website remains in the parent project.
