# EARNX-FINANCE — Termux + GitHub + Vercel deployment

## 1. User website

From Termux:

```bash
cd ~/storage/downloads/earnx-github-final
rm -rf node_modules
npm install
npm run build

git add .
git commit -m "EARNX final frontend build"
git push origin main
```

If Git asks for a GitHub password, GitHub no longer accepts the normal account password for HTTPS Git pushes. Use a GitHub token when prompted for the password, or configure SSH.

Vercel should automatically redeploy when the `main` branch changes if the repository is already connected.

## 2. Separate admin panel

The admin panel is inside this package at:

```text
admin-panel/
```

Create a second GitHub repository, for example:

```text
earnx-admin-panel
```

Then from Termux:

```bash
cd ~/storage/downloads/earnx-github-final/admin-panel
npm install
npm run build

git init
git branch -M main
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/earnx-admin-panel.git
git add .
git commit -m "EARNX separate admin panel"
git push -u origin main
```

Then in Vercel:

1. New Project.
2. Import `earnx-admin-panel`.
3. Framework: Vite.
4. Root Directory: `./` because the admin repository contains only the admin app.
5. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
6. Deploy.

If keeping the admin panel inside the main repository instead, import `earnx-flow` and set Vercel Root Directory to `admin-panel`.

## 3. Same Supabase project

The user website and admin panel intentionally use the same Supabase project. Do not put a Supabase service-role key in either frontend.

## 4. Google authentication

In Supabase Authentication, enable Google and add the production site URL/redirect URL before testing Google login in production.

## 5. Database migrations

Apply all files in `supabase/migrations/` to the same Supabase project before production testing.
