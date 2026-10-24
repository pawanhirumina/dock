# Dock

**A self-hosted developer control plane for deployments, uptime, GitHub, media, secrets, and users.**

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_%2B_Postgres-3ecf8e)](https://supabase.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/pawanhirumina/dock/pulls)

Dock brings the services you check every day into a single, focused dashboard. It is built with
Next.js, Supabase, and shadcn/ui, and it is designed to be self-hosted on Vercel (or any Node.js
host that supports Next.js).

> **Status:** Dock is an early-stage, self-hosted project. Expect schema and API changes between
> releases. Review the [Security Notes](#security-notes) before exposing an instance to the public.

---

## Why Dock?

Most developer dashboards are spread across five tabs: Vercel, an uptime service, GitHub, a media
CDN, and a password manager. Dock puts those workflows behind one authenticated interface, using
services you already pay for:

- **One control plane** for deployments, uptime, GitHub, media, secrets, and users.
- **Self-hosted and user-owned** — your data stays in your Supabase project and your Cloudinary
  account.
- **No vendor lock-in UI** — every integration uses a documented REST API with a token you control.
- **Built for small teams** — Supabase Auth handles accounts; the Users page creates and removes
  them.

---

## Features

| Area | What you can do |
| --- | --- |
| 🚀 **Deployments** | Browse Vercel deployments with state, commit, branch, timing, and direct links to Vercel and GitHub. |
| ⏱️ **Uptime** | Add HTTP/HTTPS endpoints, view status, response time, uptime percentage, and check history. |
| 🐙 **GitHub** | Browse repositories with size in MB and contributor avatars, inspect Actions workflow runs per repo, and review open issues, pull requests, and notifications. |
| 🖼️ **Gallery** | Upload images to Cloudinary, preview them, copy public URLs, delete them, and watch updates arrive in realtime. |
| 🔑 **Env Vault** | Store, reveal, copy, expire, and bulk-import `.env` secrets. The GitHub PAT can be managed here too. |
| 👥 **Users** | Create auto-verified Supabase Auth users and remove access immediately. |
| 🎨 **UI** | Responsive shadcn/ui interface with semantic tokens, loading skeletons, empty states, dialogs, and accessible toasts. |

### GitHub integration

- Add a classic or fine-grained personal access token from **GitHub → Manage token**.
- Tokens are validated with GitHub, stored server-side, and never returned by the API.
- If `GITHUB_PAT` is set in the environment, the saved token overrides it; disconnect falls back to
  the environment variable.
- Repository cards show language, size (converted from GitHub's KB value to MB), stars, forks, and
  the top contributors. Contributors load lazily as cards scroll into view and are cached per
  repository.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
- [Routes](#routes)
- [API Endpoints](#api-endpoints)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Security Notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Acknowledgements](#acknowledgements)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org/) (App Router, JavaScript) |
| UI | [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) (base-nova, Base UI primitives) |
| Icons | [Lucide](https://lucide.dev/) + [React Icons](https://react-icons.github.io/react-icons/) |
| Auth & Database | [Supabase](https://supabase.com/) (Auth, Postgres, Realtime) |
| Media | [Cloudinary](https://cloudinary.com/) |
| Deployments | [Vercel REST API](https://vercel.com/docs/rest-api) |
| Source control | [GitHub REST API](https://docs.github.com/rest) |
| Feedback | shadcn Base UI `toast`, `Alert`, `Skeleton`, and `Spinner` |
| Tooling | ESLint 10 |

---

## Architecture

```text
Browser ──► Next.js App Router
              ├── Middleware (Supabase session refresh + route protection)
              ├── Server Components / Layouts
              ├── Client Components (dashboard pages, tables, forms)
              └── API Routes
                    ├── Supabase (publishable key, user-scoped / admin client)
                    ├── Vercel REST API (VC_API_TOKEN)
                    ├── GitHub REST API (GITHUB_PAT or vault-managed token)
                    └── Cloudinary (server-side signed uploads/deletes)
```

- **Authentication** uses Supabase email/password. The login page is `/`; successful logins
  redirect to `/admin/dashboard`.
- **Session handling** happens in `src/middleware.js`, which refreshes the Supabase session cookie
  on every matched request and protects admin pages and privileged API routes.
- **Realtime** updates for the Gallery and Env Vault use Supabase Realtime
  (`postgres_changes`), so changes appear without a refresh.
- **Server-only operations** (user administration, Cloudinary deletes, uptime checks, GitHub
  requests) use secrets that never reach the browser.
- **Polling** keeps deployments current: the deployments view re-fetches `/api/deployments` every
  10 seconds while the tab is visible.

---

## Project Structure

```text
.
├── app/
│   ├── layout.jsx                      # Root layout (theme, metadata, toaster)
│   ├── page.jsx                        # Login page (renders src/App.jsx)
│   ├── globals.css                     # Tailwind entry + semantic theme tokens
│   ├── admin/dashboard/
│   │   ├── layout.jsx                  # Auth-guarded shell, sidebar, top bar
│   │   ├── page.jsx                    # Deployment stats + table
│   │   ├── deployments/page.jsx        # Deployments view
│   │   ├── uptime/page.jsx             # Uptime monitors
│   │   ├── gallery/page.jsx            # Cloudinary image gallery
│   │   ├── envvault/page.jsx           # Secret / .env vault
│   │   ├── users/page.jsx              # Supabase Auth user management
│   │   └── github/
│   │       ├── page.jsx                # Redirects to repositories
│   │       ├── repositories/page.jsx   # Repositories + contributors
│   │       ├── workflows/page.jsx      # GitHub Actions runs
│   │       ├── issues/page.jsx         # Open issues
│   │       ├── pulls/page.jsx          # Open pull requests
│   │       └── notifications/page.jsx  # Notification inbox
│   └── api/
│       ├── deployments/route.js        # GET  Vercel deployments
│       ├── monitors/route.js           # GET/POST/DELETE uptime monitors
│       ├── uptime/check/route.js       # GET  run uptime checks (cron)
│       ├── upload/route.js             # POST Cloudinary upload
│       ├── delete/route.js             # POST Cloudinary delete
│       ├── github/
│       │   ├── route.js                # GET  GitHub resources
│       │   └── token/route.js          # POST/DELETE GitHub PAT
│       └── admin/users/
│           ├── route.js                # GET/POST users
│           └── [id]/route.js           # DELETE user
├── src/
│   ├── App.jsx                         # Login form
│   ├── components/
│   │   ├── app-sidebar.jsx             # Navigation + logout
│   │   ├── deployments-table.jsx       # Deployment stats/table (polls API)
│   │   ├── github/github-section.jsx   # Shared GitHub page UI
│   │   └── ui/                         # shadcn/ui primitives
│   ├── hooks/use-mobile.js
│   ├── lib/
│   │   ├── supabase/client.js          # Browser client + admin client
│   │   ├── supabase/server.js          # Server client (cookies)
│   │   ├── github.js                   # GitHub client + token resolution
│   │   ├── uptime.js                   # Uptime check logic
│   │   ├── vercel.js                   # Vercel API pagination helper
│   │   └── utils.js                    # cn() helper
│   └── middleware.js                   # Route protection + session refresh
├── components.json                     # shadcn/ui configuration
├── jsconfig.json                       # `@/*` → `src/*` path alias
├── next.config.mjs                     # Remote image patterns
└── vercel.json                         # Uptime cron schedule
```

---

## Getting Started

### Prerequisites

- **Node.js 20.9+** (20 or 22 LTS recommended)
- **npm** (the repository ships a `package-lock.json`)
- A **Supabase** project
- A **Cloudinary** account
- A **Vercel** account + API token (for deployment data)
- A **GitHub** personal access token (optional, for the GitHub pages)

### 1. Clone and install

```bash
git clone https://github.com/pawanhirumina/dock.git
cd dock
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the values described in [Environment Variables](#environment-variables).

### 3. Prepare Supabase

Create the database tables and enable Realtime. See [Supabase Setup](#supabase-setup).

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will land on the login page. Sign in with
a Supabase Auth user — create one from the Supabase dashboard, or use the Users page after signing
in with an existing account.

---

## Environment Variables

All variables are read from `.env.local` locally and from project settings on Vercel.

| Variable | Required | Scope | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Public | Supabase project URL, e.g. `https://xxxx.supabase.co`. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Public | Supabase anon/publishable key used by the browser and SSR client. |
| `SUPABASE_SERVICE_KEY` | ✅ | **Server only** | Supabase service role key. Bypasses RLS — never expose it to the client. |
| `VC_API_TOKEN` | ✅ | **Server only** | Vercel personal access token used to list deployments. |
| `GITHUB_PAT` | — | **Server only** | Optional GitHub personal access token for the GitHub pages. Needs `repo`, `workflow`, `read:org`, and `notifications` scopes. A token saved from **Manage token** (in the Env Vault) overrides it. |
| `CLOUDINARY_CLOUD_NAME` | ✅ | **Server only** | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | ✅ | **Server only** | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | ✅ | **Server only** | Cloudinary API secret (server-side signed uploads/deletes). |

> **Note:** only variables prefixed with `NEXT_PUBLIC_` are bundled into client code. Keep the
> service role key, Vercel token, GitHub token, and Cloudinary credentials server-side.

Where to find them:

- **Supabase** → Project Settings → API (Project URL, publishable key, service role key).
- **Vercel** → Account Settings → Tokens.
- **GitHub** → Settings → Developer settings → Personal access tokens.
- **Cloudinary** → Dashboard → Account Details (cloud name, API key, API secret).

---

## Supabase Setup

Dock expects the following tables. The SQL below matches the application code — review it against
your project and adjust types/constraints as needed.

```sql
-- Images uploaded to Cloudinary
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  public_id text not null,
  secure_url text not null,
  url text,
  created_at timestamptz not null default now()
);

-- Secrets stored in the Env Vault (also holds a UI-managed GitHub PAT)
create table if not exists public.env_vaults (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  value text not null,
  description text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Uptime monitors
create table if not exists public.monitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  status text,
  response_time integer,
  uptime_pct numeric,
  last_checked timestamptz,
  created_at timestamptz not null default now()
);

-- Individual uptime check results
create table if not exists public.uptime_checks (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null references public.monitors(id) on delete cascade,
  status integer not null,
  response_time integer,
  created_at timestamptz not null default now()
);
```

### Realtime

The Gallery and Env Vault subscribe to `postgres_changes`. Enable Realtime for the `images` and
`env_vaults` tables:

1. Supabase Dashboard → **Database** → **Publications** → `supabase_realtime`.
2. Add the `images` and `env_vaults` tables.

### Row Level Security

- The browser uses the **publishable key**, so tables read/written directly from the client
  (`images`, `env_vaults`) need RLS enabled with policies for authenticated users.
- All server-side routes use the **service role key** and bypass RLS. Never expose that key to the
  browser.

Example policy set (adjust to your access model):

```sql
alter table public.images enable row level security;
alter table public.env_vaults enable row level security;

create policy "authenticated can read images"
  on public.images for select to authenticated using (true);

create policy "authenticated can read and write env_vaults"
  on public.env_vaults for all to authenticated using (true) with check (true);
```

> ⚠️ The Env Vault stores values in plaintext and reads them in the browser. If your threat model
> requires it, encrypt values at rest or restrict the vault to trusted admins only.

---

## Routes

### Pages

| Route | Access | Description |
| --- | --- | --- |
| `/` | Public | Login page. Authenticated users are redirected to the dashboard. |
| `/admin/dashboard` | Auth | Deployment stats and recent deployments. |
| `/admin/dashboard/deployments` | Auth | Full deployments table. |
| `/admin/dashboard/github` | Auth | Redirects to the repositories page. |
| `/admin/dashboard/github/repositories` | Auth | GitHub repositories with size, metadata, and contributors. |
| `/admin/dashboard/github/workflows` | Auth | GitHub Actions workflow runs per repository. |
| `/admin/dashboard/github/issues` | Auth | Open issues involving your account. |
| `/admin/dashboard/github/pulls` | Auth | Open pull requests involving your account. |
| `/admin/dashboard/github/notifications` | Auth | GitHub notification inbox. |
| `/admin/dashboard/uptime` | Auth | Add/remove monitors and view uptime. |
| `/admin/dashboard/gallery` | Auth | Upload and manage Cloudinary images. |
| `/admin/dashboard/envvault` | Auth | Manage secrets and import `.env` files. |
| `/admin/dashboard/users` | Auth | Create and delete Supabase users. |

### API Endpoints

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/deployments` | Session | Returns all Vercel deployments (paginated server-side). |
| `GET` | `/api/monitors` | Admin | Lists uptime monitors. |
| `POST` | `/api/monitors` | Admin | Creates a monitor (`{ name, url }`). |
| `DELETE` | `/api/monitors?id=…` | Admin | Deletes a monitor. |
| `GET` | `/api/uptime/check` | Cron | Runs all uptime checks. Scheduled by Vercel Cron. |
| `POST` | `/api/upload` | Session | Uploads an image (multipart `file`) to Cloudinary and records it. |
| `POST` | `/api/delete` | Session | Deletes an image (`{ id, public_id }`) from Cloudinary and the database. |
| `GET` | `/api/admin/users` | Admin | Lists Supabase Auth users. |
| `POST` | `/api/admin/users` | Admin | Creates an auto-verified user (`{ email, password }`). |
| `DELETE` | `/api/admin/users/:id` | Admin | Deletes a user. |
| `GET` | `/api/github?resource=…` | Admin | Lists GitHub data. Resources: `status`, `repos`, `contributors&repo=owner/name`, `workflow-runs&repo=owner/name`, `issues`, `pulls`, `notifications`. |
| `POST` | `/api/github/token` | Admin | Validates a PAT (`{ token }`) and stores it in the Env Vault. The token is never returned to the client. |
| `DELETE` | `/api/github/token` | Admin | Removes the saved PAT from the Env Vault. |

> **Auth column:** "Admin" means protected by `src/middleware.js` matcher rules. "Session" routes
> verify the Supabase user inside the handler. "Cron" is intended for Vercel Cron.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint over the project. |

---

## Deployment

Dock is designed to run on **Vercel**.

1. Import the repository into Vercel.
2. Add every environment variable from [Environment Variables](#environment-variables) to the
   project (Production and Preview as needed).
3. Deploy. `vercel.json` registers a daily cron job:

   ```json
   { "crons": [{ "path": "/api/uptime/check", "schedule": "0 0 * * *" }] }
   ```

   The cron runs uptime checks once per day at 00:00 UTC. Adjust the schedule in `vercel.json` if
   you need more frequent checks.
4. Ensure `res.cloudinary.com` is allowed for `next/image` — this is already configured in
   `next.config.mjs`.

### Notes

- The deployments table polls `/api/deployments` on an interval; Vercel API responses use
  `cache: 'no-store'` so the dashboard stays current.
- Uptime checks run sequentially with a 10-second request timeout per monitor.
- GitHub data is fetched on demand per page; repository contributors are loaded lazily.

---

## Security Notes

- **Service role key** (`SUPABASE_SERVICE_KEY`) must remain server-only. It bypasses RLS.
- **Middleware** protects `/admin/*` and privileged API routes (`/api/admin/*`, `/api/delete`,
  `/api/upload`, `/api/deployments`, `/api/monitors`, `/api/github`). Update the matcher in
  `src/middleware.js` when adding new privileged endpoints.
- **RLS** should be enabled on every table exposed through the publishable key.
- **Secrets** in the Env Vault are stored as plaintext. Treat database access as equivalent to
  secret access, and consider restricting the vault to trusted admins.
- **GitHub tokens** are validated before storage and never returned by the API. Use the narrowest
  scopes possible (`repo`, `workflow`, `read:org`, `notifications`) and rotate tokens regularly.
- **Cloudinary** uploads and deletes run server-side using the API secret; do not move these calls
  into client components.
- **Cron endpoint** `/api/uptime/check` is intentionally callable by the platform scheduler. It
  only performs outbound checks; do not add destructive behavior to it.
- **No warranty** — review the code and configuration before deploying to production.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Redirected to `/` right after login | Missing/invalid Supabase cookie or env vars | Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; clear cookies and retry. |
| `401 Unauthorized` from `/api/*` | No active Supabase session | Sign in again; confirm middleware is running. |
| Deployments return `500` | Missing `VC_API_TOKEN` | Add the token to `.env.local` / Vercel. |
| Uploads fail with Cloudinary errors | Missing Cloudinary credentials | Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. |
| Realtime updates don't appear | Table not in `supabase_realtime` publication | Enable Realtime for `images` / `env_vaults`. |
| Uptime page shows an error | Tables missing or service key invalid | Run the SQL above and verify `SUPABASE_SERVICE_KEY`. |
| GitHub pages show “Connect your GitHub account” | No `GITHUB_PAT` and no saved token | Add `GITHUB_PAT` or use **Manage token**. |
| GitHub returns `401` / “rejected the token” | Expired token or missing scopes | Create a new token with `repo`, `workflow`, `read:org`, and `notifications`. |
| GitHub API rate limited | Too many requests to the REST API | Wait for the hourly reset or use a token with a higher limit. |
| `next build` fails on Node | Unsupported Node version | Use Node.js 20.9+ (20/22 LTS). |

---

## Contributing

Contributions are welcome. Dock is a personal project, so please open an issue to discuss larger
changes before starting work.

```bash
# 1. Fork and clone
git clone https://github.com/<your-user>/dock.git
cd dock

# 2. Create a branch
git checkout -b feat/my-change

# 3. Install and configure
npm install
cp .env.example .env.local

# 4. Make changes, then verify
npm run lint
npm run build

# 5. Commit and open a pull request
```

Guidelines:

- Keep components consistent with the existing shadcn/ui patterns.
- Use semantic color tokens, `gap-*` instead of `space-y-*`, and the shared `Empty`, `Skeleton`,
  `Badge`, and `Spinner` components.
- Do not commit `.env.local` or any secrets.
- Describe the change and include verification steps in the pull request.

---

## Acknowledgements

Dock is built on the work of these projects:

- [Next.js](https://nextjs.org/) and [React](https://react.dev/)
- [shadcn/ui](https://ui.shadcn.com/) and [Base UI](https://base-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/)
- [Vercel](https://vercel.com/)
- [GitHub REST API](https://docs.github.com/rest)
- [Cloudinary](https://cloudinary.com/)
- [Lucide](https://lucide.dev/) and [React Icons](https://react-icons.github.io/react-icons/)

---

## Disclaimer

Dock is an independent personal project. It is not affiliated with, endorsed by, or sponsored by
Vercel, GitHub, Supabase, or Cloudinary. All trademarks belong to their respective owners.

You are responsible for the security and configuration of your own deployment, including API
tokens, database policies, and access control.

---

## License

No license has been added to this repository yet. Until a license is provided, all rights are
reserved. If you would like to use Dock in your own project, please open an issue to discuss
licensing.
