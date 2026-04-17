# Hits Different

Pomodoro-style focus sessions with character/vibe picks and optional AI album art. The UI is built with **Next.js (App Router)**, **React**, and **Tailwind CSS v4**.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (LTS recommended)
- npm (comes with Node)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Optional: create a local env file from the example (for future secrets — none required for the default UI):

   ```bash
   copy .env.example .env.local
   ```

   On macOS/Linux:

   ```bash
   cp .env.example .env.local
   ```

   **Secrets in the browser:** Never prefix API keys or secrets with `NEXT_PUBLIC_` — Next.js inlines those into client JavaScript.

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

2. **Large client UI** — The main screen is a large client component (`HitsDifferentApp`). Dev mode ships extra debugging overhead; production builds are leaner.

3. **Multiple fonts** — The layout loads Google fonts via `next/font` (self-hosted). That adds a bit of work on first paint but is usually minor compared to (1).

## Project layout (high level)

- `src/app/` — App Router: `layout.tsx`, `page.tsx`, `globals.css`
- `src/components/hits-different/` — Main Pomodoro UI (`HitsDifferentApp`)

## Product idea

Hits Different frames deep work as a “track”: name a task, run timed focus/break rounds. Product copy in the app may evolve.
