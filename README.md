# CodeCell-2.0-Admin

Official Admin Panel of CodeCell's Website — weeks, problems, checkers, events, analytics. Next.js 15 (App Router) + TypeScript + Tailwind v4.

All API calls are proxied to the Go backend (`:8000`) via rewrites in `next.config.ts` — nothing here talks to the judge engine directly.

## Running locally

```bash
npm install
npm run dev
```

Requires the Go backend running on `:8000` (see the `Codecell-2.0-Backend` repo's README).

## Structure

```
app/(app)/      routes behind the sidebar + auth guard (challenges, events, statistics)
app/login/      the one public route
components/     Layout, AuthGuard, Countdown, ProblemEditor
context/        DataContext — the only place that talks to the API
lib/            shared types, config, mock event data
```
