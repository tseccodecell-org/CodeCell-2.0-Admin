# CodeCell-2.0-Admin

Official Admin Panel of CodeCell's Website — weeks, problems, checkers, events, analytics. Next.js 15 (App Router) + TypeScript + Tailwind v4.

All API calls are proxied to the Go backend via rewrites in `next.config.ts` — nothing here talks to the judge engine directly.

## Running locally

```bash
npm install
npm run dev
```

By default the proxy points at the deployed backend (`https://api.tseccodecell.com`). To work against a local backend instead, set `API_BASE_URL` before starting:

```bash
API_BASE_URL=http://localhost:8000 npm run dev
```

Restart the dev server after changing `next.config.ts`, it is only read at startup.

## Maintenance

The authenticated **Maintenance** page in the sidebar contains **Sync invalidated scores**. Use it after moderating invalidated submissions to repair their scores and the affected weekly and season leaderboard totals. It processes invalidated submissions that still have a non-zero score; when one is an accepted attempt, the backend may also invalidate the same user's other accepted attempts for that problem.

Read **Still pending** (`pendingAfter`) as the number of invalidated submissions with non-zero scores remaining after the run. A value of `0` means no such repairs remain; a non-zero value, especially after an error, means resolve the backend issue and run it again. The result also shows the number pending before the run, processed, failed, and affected users.

Counts the backend could not establish appear as **Unavailable**, not `0`. `pendingBefore` and `affectedUsers` are `null` when initial selection fails; `pendingAfter` is `null` when selection or the final count fails. Known processed and failed counts remain visible alongside the error. A failed cascade or leaderboard repair retains a non-zero score on its original invalidated candidate so another confirmed run can retry it. Successful repairs finish at zero; partial successful changes may remain.

Deploy the backend version that exposes `POST /api/admin/moderation/sync-invalidated` before deploying or using this page. Configure its `ADMIN_FRONTEND_URL` to this admin application's URL: cookie requests must have that trusted origin and use JSON, which the API client sends automatically. This feature adds no new automatic run. The backend's pre-existing startup and daily synchronization remain active, including a startup run following a backend deployment or restart. The new button action requires an administrator to confirm it.

## Structure

```
app/(app)/      routes behind the sidebar + auth guard (challenges, events, statistics)
app/login/      the one public route
components/     Layout, AuthGuard, Countdown, ProblemEditor
context/        DataContext — the only place that talks to the API
lib/            shared types, config, mock event data
```

## Recent changes

1. **Real admin login.** The old sign-in accepted a hardcoded token (`admin123`) that never left the browser, so it protected nothing. The login page now posts form-encoded `email` and `password` to `/admin/login` on the backend, which returns an httpOnly cookie that rides along on every later request. This depends on the admin auth middleware in the backend repo, and only works once that is merged and deployed.

2. **Proxy rule for the login route.** `/admin/login` sits outside `/api` on the backend, so it needed its own rewrite. Without it the request stops at the Next server and never reaches the backend.

3. **Backend base URL is configurable.** The proxy target defaults to the deployed API and can be pointed anywhere with `API_BASE_URL`, so local and deployed backends no longer need a code edit to switch.

4. **Saving a problem no longer navigates away.** Save used to redirect back to the week page, which made multi step editing painful. It now stays put, shows a toast, and there is a separate "Save and Close" button when you do want to leave.

5. **The new problem form is gated by its dependencies.** Test cases, languages and the custom checker all need a problem id, so those tabs stay locked until the details are saved once. Creating the problem unlocks them and moves you straight to test cases.

6. **Fixed duplicate test cases on repeated saves.** Locally added test cases had no server id, so saving twice posted them again and created duplicates. The editor now refetches test cases after each save so rows pick up their real ids.

7. **Fixed the per-testcase results table.** It read `index` from the submission API, but the field is `orderNum`, so every row got the same React key and the numbering rendered as "TC NaN".
