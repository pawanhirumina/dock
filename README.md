# Dock

A personal developer control plane — a self-hosted admin dashboard for deployments, uptime
monitoring, media, secrets, and user management, built with Next.js and Supabase.

Dock brings the handful of services you check every day into a single, dark-themed dashboard:

- 🚀 **Deployments** — browse Vercel deployments with status, branch, and timing details.
- ⏱️ **Uptime** — add URLs to monitor and get status, response time, and uptime percentage.
- 🖼️ **Gallery** — upload, preview, copy, and delete images hosted on Cloudinary.
- 🔑 **Env Vault** — store, reveal, copy, and import `.env` secrets with optional expiry.
- 👥 **Users** — create (auto-verified) and remove Supabase Auth users.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
- [Routes](#routes)
- [API Reference](#api-reference)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Security Notes](#security-notes)
- [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org/) (App Router, JavaScript) |
| UI | [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) (base-nova) |
| Icons | [Lucide](https://lucide.dev/) + [React Icons](https://react-icons.github.io/react-icons/) |
| Auth & Database | [Supabase](https://supabase.com/) (Auth, Postgres, Realtime) |
| Media | [Cloudinary](https://cloudinary.com/) |
| Deployments | [Vercel REST API](https://vercel.com/docs/rest-api) |
| Notifications | [Sonner](https://sonner.emilkowal.ski/) toasts |
| Animation | GSAP, Framer Motion |

---

## Architecture

```
Browser ──► Next.js (App Router)
              ├── Middleware (Supabase session refresh + route protection)
              ├── Server Components / Layouts
              ├── Client Components (dashboard pages, tables, forms)
              └── API Routes
                    ├── Supabase (publishable key, user-scoped / admin client)
                    ├── Vercel REST API (VC_API_TOKEN)
                    └── Cloudinary (server-side signed uploads/deletes)
```

- **Authentication** uses Supabase email/password. The login page is `/`; successful logins
  redirect to `/admin/dashboard`.
- **Session handling** is done in `src/middleware.js`, which refreshes the Supabase session
  cookie on every matched request and protects both admin pages and API routes.
- **Realtime** updates for the Gallery and Env Vault are delivered through Supabase Realtime
  (`postgres_changes`), so changes appear without a refresh.
- **Server-only operations** (user administration, Cloudinary delete, uptime checks) use the
  Supabase **service role key** and must never run in the browser.

---

## Project Structure

```
.
├── app/
│   ├── layout.jsx                   # Root layout (dark theme, metadata)
│   ├── page.jsx                     # Login page (renders src/App.jsx)
│   ├── globals.css                  # Tailwind entry + theme tokens
│   ├── admin/dashboard/
│   │   ├── layout.jsx               # Auth-guarded dashboard shell + sidebar
│   │   ├── page.jsx                 # Deployment stats + table
│   │   ├── deployments/page.jsx     # Deployments view
│   │   ├── uptime/page.jsx          # Uptime monitors
│   │   ├── gallery/page.jsx         # Cloudinary image gallery
│   │   ├── envvault/page.jsx        # Secret / .env vault
│   │   └── users/page.jsx           # Supabase Auth user management
│   └── api/
│       ├── deployments/route.js     # GET  Vercel deployments
│       ├── monitors/route.js        # GET/POST/DELETE uptime monitors
│       ├── uptime/check/route.js    # GET  run uptime checks (cron)
│       ├── upload/route.js          # POST Cloudinary upload
│       ├── delete/route.js          # POST Cloudinary delete
│       └── admin/users/
│           ├── route.js             # GET/POST users
│           └── [id]/route.js        # DELETE user
├── src/
│   ├── App.jsx                      # Login form
│   ├── components/
│   │   ├── app-sidebar.jsx          # Navigation + logout
│   │   ├── deployments-table.jsx    # Deployment stats/table (polls API)
│   │   └── ui/                      # shadcn/ui primitives
│   ├── hooks/use-mobile.js
│   ├── lib/
│   │   ├── supabase/client.js       # Browser client + admin client
│   │   ├── supabase/server.js       # Server client (cookies)
│   │   ├── uptime.js                # Uptime check logic
│   │   ├── vercel.js                # Vercel API pagination helper
│   │   └── utils.js                 # cn() helper
│   └── middleware.js                # Route protection + session refresh
├── components.json                  # shadcn/ui configuration
├── jsconfig.json                    # `@/*` → `src/*` path alias
├── next.config.mjs                  # Remote image patterns
└── vercel.json                      # Uptime cron schedule
```

---

## Getting Started

### Prerequisites

- **Node.js 20.9+** (20 or 22 LTS recommended)
- **npm** (the repository ships a `package-lock.json`)
- A **Supabase** project
- A **Cloudinary** account
- A **Vercel** account + API token (for deployment data)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in the values:

```bash
cp .env.example .env.local
```

See [Environment Variables](#environment-variables) for what each value is and where to get it.

### 3. Prepare Supabase

Create the database tables and enable Realtime. See [Supabase Setup](#supabase-setup).

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will land on the login page; sign in
with a Supabase Auth user (create one from the Supabase dashboard or the Users page once
logged in).

---

## Environment Variables

All variables are read from `.env.local` locally and from project settings on Vercel.

| Variable | Required | Scope | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Public | Supabase project URL, e.g. `https://xxxx.supabase.co`. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Public | Supabase anon/publishable key used by the browser and SSR client. |
| `SUPABASE_SERVICE_KEY` | ✅ | **Server only** | Supabase service role key. Bypasses RLS — never expose it to the client. |
| `VC_API_TOKEN` | ✅ | **Server only** | Vercel personal access token used to list deployments. |
| `GITHUB_PAT` | — | **Server only** | Optional GitHub personal access token used by the GitHub page. A token saved from **Manage token** (stored in the Env Vault) takes precedence. Needs `repo`, `workflow`, `read:org`, and `notifications` scopes. |
| `CLOUDINARY_CLOUD_NAME` | ✅ | **Server only** | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | ✅ | **Server only** | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | ✅ | **Server only** | Cloudinary API secret (server-side signed uploads/deletes). |

> **Note:** only variables prefixed with `NEXT_PUBLIC_` are bundled into client code. Keep the
> service role key, Vercel token, and Cloudinary credentials server-side.

Where to find them:

- **Supabase** → Project Settings → API (Project URL, anon/publishable key, service role key).
- **Vercel** → Account Settings → Tokens.
- **Cloudinary** → Dashboard → Account Details (cloud name, API key, API secret).

---

## Supabase Setup

Dock expects the following tables. The SQL below is inferred from the application code — review
it against your project and adjust types/constraints as needed.

```sql
-- Images uploaded to Cloudinary
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  public_id text not null,
  secure_url text not null,
  url text,
  created_at timestamptz not null default now()
);

-- Secrets stored in the Env Vault
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

The Gallery and Env Vault subscribe to `postgres_changes`, so enable Realtime for the
`images` and `env_vaults` tables:

1. Supabase Dashboard → **Database** → **Publications** → `supabase_realtime`.
2. Add the `images` and `env_vaults` tables.

### Row Level Security

- The browser uses the **publishable key**, so tables read/written directly from the client
  (`images`, `env_vaults`) need RLS enabled with policies for authenticated users.
- All server-side routes use the **service role key** and bypass RLS. Never expose that key
  to the browser.

Example policy set (adjust to your access model):

```sql
alter table public.images enable row level security;
alter table public.env_vaults enable row level security;

create policy "authenticated can read images"
  on public.images for select to authenticated using (true);

create policy "authenticated can read and write env_vaults"
  on public.env_vaults for all to authenticated using (true) with check (true);
```

> ⚠️ The Env Vault stores secret values in plaintext and reads them in the browser. If your
> threat model requires it, encrypt values at rest or restrict the vault to trusted admins only.

---

## Routes

### Pages

| Route | Access | Description |
| --- | --- | --- |
| `/` | Public | Login page. Authenticated users are redirected to the dashboard. |
| `/admin/dashboard` | Auth | Deployment stats and recent deployments. |
| `/admin/dashboard/deployments` | Auth | Full deployments table. |
| `/admin/dashboard/github` | Auth | Redirects to the repositories page. |
| `/admin/dashboard/github/repositories` | Auth | GitHub repositories you own or collaborate on. |
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
| `GET` | `/api/monitors` | Admin (`/api/admin`) | Lists uptime monitors. |
| `POST` | `/api/monitors` | Admin (`/api/admin`) | Creates a monitor (`{ name, url }`). |
| `DELETE` | `/api/monitors?id=…` | Admin (`/api/admin`) | Deletes a monitor. |
| `GET` | `/api/uptime/check` | Cron | Runs all uptime checks. Scheduled by Vercel Cron. |
| `POST` | `/api/upload` | Session | Uploads an image (multipart `file`) to Cloudinary and records it. |
| `POST` | `/api/delete` | Session | Deletes an image (`{ id, public_id }`) from Cloudinary and the database. |
| `GET` | `/api/admin/users` | Admin | Lists Supabase Auth users. |
| `POST` | `/api/admin/users` | Admin | Creates an auto-verified user (`{ email, password }`). |
| `DELETE` | `/api/admin/users/:id` | Admin | Deletes a user. |
| `GET` | `/api/github?resource=…` | Admin (`/api/github`) | Lists GitHub data. Resources: `status`, `repos`, `contributors&repo=owner/name`, `workflow-runs&repo=owner/name`, `issues`, `pulls`, `notifications`. |
| `POST` | `/api/github/token` | Admin (`/api/github`) | Validates a PAT (`{ token }`) and stores it in the Env Vault. The token is never returned to the client. |
| `DELETE` | `/api/github/token` | Admin (`/api/github`) | Removes the saved PAT from the Env Vault. |

> **Auth column:** "Admin" = protected by `src/middleware.js` matcher rules. `Session` routes
> verify the Supabase user inside the handler. `Cron` is intended for Vercel Cron.

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
2. Add all environment variables from [Environment Variables](#environment-variables) to the
   project (Production and Preview as needed).
3. Deploy. `vercel.json` registers a daily cron job:

   ```json
   { "crons": [{ "path": "/api/uptime/check", "schedule": "0 0 * * *" }] }
   ```

   The cron runs the uptime checks once per day at 00:00 UTC. Adjust the schedule in
   `vercel.json` if you need more frequent checks.

4. Ensure `res.cloudinary.com` is allowed for `next/image` — this is already configured in
   `next.config.mjs`.

### Notes

- The deployments table polls `/api/deployments` on an interval; Vercel API responses are
  fetched with `cache: 'no-store'` so the dashboard stays current.
- Uptime checks are sequential and use a 10-second request timeout per monitor.

---

## Security Notes

- **Service role key** (`SUPABASE_SERVICE_KEY`) must remain server-only. It bypasses RLS.
- **Middleware** protects `/admin/*` and the sensitive API routes (`/api/admin/*`, `/api/delete`,
  `/api/upload`, `/api/deployments`). Verify the matcher in `src/middleware.js` when adding new
  privileged endpoints.
- **RLS** should be enabled on every table exposed through the publishable key.
- **Secrets** in the Env Vault are stored as plaintext. Treat database access as equivalent to
  secret access, and consider restricting the vault to admin users.
- **Cloudinary** uploads and deletes run server-side using the API secret; do not move these
  calls into client components.

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
| `next build` fails on Node | Unsupported Node version | Use Node.js 20.9+ (20/22 LTS). |

---

## License

This is a personal project. Add a license here if you intend to distribute it.
