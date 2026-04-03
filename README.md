# Hits Different

Pomodoro-style focus sessions with character/vibe picks, optional AI album art, and **Spotify sign-in** (Auth.js) for playback-related flows. The UI is built with **Next.js (App Router)**, **React**, and **Tailwind CSS v4**.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (LTS recommended)
- npm (comes with Node)

## Spotify (playback-related features)

- **Sign-in** uses **OAuth in the browser**: clicking **Connect Spotify** sends you to Spotify’s site to log in (if needed) and **authorize** this app; you are then redirected back to this app. The native Spotify app does not replace that browser step.
- **Spotify Premium** is required for in-app playback (e.g. Web Playback SDK, controlling playback on a device) and for many playback-related Web API endpoints.
- An **active Spotify app** on a phone, desktop, or other supported device may also be required for playback to target a device.

Signing in with a **free** Spotify account still works for profile-based flows; the app may show a short notice after sign-in if Premium is not detected.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local env file from the example:

   ```bash
   copy .env.example .env.local
   ```

   On macOS/Linux:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in **`.env.local`**:

   | Variable | Required | Notes |
   |----------|----------|--------|
   | `AUTH_SECRET` | Strongly recommended | Auth.js needs a secret. In **development**, the app falls back to a fixed dev secret if this is unset (so session requests don’t error). For anything shared or production, set a real value, e.g. `openssl rand -base64 32` |
   | `AUTH_URL` | Yes in production | Dev: `http://localhost:3000` — match your dev server URL |
   | `SPOTIFY_CLIENT_ID` | For Spotify login | [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) |
   | `SPOTIFY_CLIENT_SECRET` | For Spotify login | Same app as above |
   | `ANTHROPIC_API_KEY` | No | Enables server-side “AI album cover” generation; without it, the app falls back to a vibe-based cover |

   **Secrets in the browser:** Never define API keys or `AUTH_SECRET` with a `NEXT_PUBLIC_` prefix. Next.js inlines those into client JavaScript, so they can appear in Chrome DevTools. This app reads `ANTHROPIC_API_KEY` only on the server (`/api/ai-cover`). On **Vercel**, use the name `ANTHROPIC_API_KEY` only (value = the key, no `NAME=` prefix). If a key ever showed up under Sources/Console, remove any `NEXT_PUBLIC_` copy in Vercel and **rotate** the key.

4. **Spotify redirect URI** — In your Spotify app settings, add:

   `http://localhost:3000/api/auth/callback/spotify`

   (Use your production URL + `/api/auth/callback/spotify` when you deploy.)

## Troubleshooting (Spotify / Auth)

### Redirect URI mismatch

Spotify shows an error about **redirect_uri** or **invalid redirect** when the URI registered in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) does not **exactly** match the callback URL your app uses.

- This app uses Auth.js with Spotify; the callback path is **`/api/auth/callback/spotify`**.
- **Local dev:** add  
  `http://localhost:3000/api/auth/callback/spotify`  
  If you use another port, replace `3000` everywhere: dev server, `AUTH_URL`, and this URI.
- **Production:** add your real HTTPS URL, e.g.  
  `https://your-domain.com/api/auth/callback/spotify`  
  Use the same scheme (`https`), host, and path as in the browser — no extra trailing slash on the path unless you intentionally use one everywhere.

Also ensure **`AUTH_URL`** in `.env.local` matches the site origin users open (e.g. `http://localhost:3000` in dev, `https://your-domain.com` in production), with no trailing slash.

### Invalid client / credentials

If login fails with **invalid_client** or similar:

- Confirm **`SPOTIFY_CLIENT_ID`** and **`SPOTIFY_CLIENT_SECRET`** match the Spotify app (no stray spaces; update `.env.local` if you rotated the secret).
- Restart the dev server after changing environment variables.
- In production, set the same variables on your host (e.g. Vercel → Environment Variables) and redeploy.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server (default: [http://localhost:3000](http://localhost:3000)) |
| `npm run build` | Production build |
| `npm run start` | Run the production server (after `build`) |
| `npm run lint` | Run ESLint |

If port **3000** is already in use, stop the other process or Next.js will pick another port.

## Why localhost can feel slow

1. **First request after `npm run dev`** — Next.js compiles routes on demand. The first load of `/` often takes a few seconds; later refreshes are usually much faster. Use `npm run build && npm run start` to judge real production performance.

2. **Auth session** — The client calls `/api/auth/session` on load. Without a valid `AUTH_SECRET`, Auth.js used to fail that request (slow + errors). The repo includes a **development-only** secret fallback in `src/auth.ts` so local session checks succeed; still add `AUTH_SECRET` in `.env.local` for stable sessions across restarts.

3. **Large client UI** — The main screen is a big client component (`HitsDifferentApp`). Dev mode ships extra debugging overhead; production builds are leaner.

4. **Multiple fonts** — The layout loads three Google fonts via `next/font` (self-hosted). That adds a bit of work on first paint but is usually minor compared to (1) and (2).

## Project layout (high level)

- `src/app/` — App Router: `layout.tsx`, `page.tsx`, `globals.css`
- `src/components/hits-different/` — Main Pomodoro UI (`HitsDifferentApp`)
- `src/app/api/auth/[...nextauth]/` — Auth.js route handlers
- `src/app/api/ai-cover/` — Optional AI cover API (uses `ANTHROPIC_API_KEY` on the server)
- `src/app/api/spotify/account/` — Reads Spotify profile `product` (Premium vs free) for in-app notices
- `src/auth.ts` — Auth.js configuration (Spotify provider)
- `src/context/` — React context for session/user helpers

## Product idea

Hits Different frames deep work as a “track”: name a task, run timed focus/break rounds, and (with Spotify connected) tie into your listening context. The README stays short; product copy in the app may evolve.
