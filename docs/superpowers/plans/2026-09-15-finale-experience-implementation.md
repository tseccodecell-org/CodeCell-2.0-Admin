# CodeCell Finale Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an admin-controlled, access-aware finale backed by the existing CodeCell judge and submission system.

**Architecture:** A `FINALE` contest remains a `ContestWeek`, preserving its existing problem and submission relationship. New finale settings, access grants, scoring windows, and user templates isolate finale-only policy. Participant and admin applications consume narrowly scoped backend APIs rather than duplicating authorization or lifecycle decisions.

**Tech Stack:** Go/Gin/GORM/Postgres, Next.js 15, React 19, TypeScript, Vitest, Zod, Monaco.

**Spec:** `docs/superpowers/specs/2026-09-15-finale-experience-design.md`

**Repository map (controller ruling, not in the original plan text):** this
feature spans three separate git repositories, not one monorepo. Task 1 and
Task 2 execute in `cell_backend_latest` (path prefix `go-backend/`). Task 3
executes in `test_cell_admin` (path prefix `app/(app)/`, `components/`,
`lib/`). Task 4, Task 5, and Task 6 execute in `cell_frontend` (path prefix
`app/events/`, `components/sections/finale/`, `hooks/`, `lib/`). Task 7 is
cross-repository regression verification run once per repo. Each repo gets
its own worktree, its own copy of this plan and spec, and its own ledger.
Task 2's committed route contracts and response shapes are the interface the
admin and frontend tasks consume; Task 3 and Task 4 do not start until Task 2
is complete and its request/response shapes are recorded in this plan's
ledger for the backend repo.

## Global Constraints

- Existing `OPEN` and `FIXED` weekly contests retain their current API and behavior.
- Finale eligibility, lifecycle, and scoreability are enforced in Go, not inferred by a client.
- Only authenticated users can read or change their own templates; no file uploads are introduced.
- Pause and permanent end leave the code workspace usable but prevent scoring outside live windows.
- Use the existing response envelope for new `/api` routes and audit all state-changing admin actions.

---

### Task 1: Finale persistence and repository boundary

**Files:**
- Create: `go-backend/models/finale.go`
- Create: `go-backend/repository/finale_repository.go`
- Create: `go-backend/repository/finale_repository_test.go`
- Modify: `go-backend/models/repositories.go`
- Modify: `go-backend/config/database.go`

**Interfaces:**
- Produces `FinaleSettings`, `FinaleAccessGrant`, `FinaleScoringWindow`, `UserCodeTemplate` and `FinaleRepository`.
- `FinaleRepository.GetSettings(ctx, weekID) (models.FinaleSettings, error)` is consumed by lifecycle, access, and scoring tasks.
- `FinaleRepository.IsEligible(ctx, weekID, userID) (bool, error)` is consumed by public access checks.
- `FinaleRepository.IsScoringLiveAt(ctx, weekID, at) (bool, error)` is consumed by score calculation.

- [ ] **Step 1: Write failing repository tests**

```go
func TestFinaleRepositoryRestrictsAccessWhenConfigured(t *testing.T) {
  settings := models.FinaleSettings{WeekID: "finale-1", AccessMode: models.FinaleAccessRestricted}
  repo := newFinaleRepositoryForTest(t, settings)
  require.False(t, repo.IsEligible(ctx, "finale-1", 42))
  require.NoError(t, repo.GrantAccess(ctx, "finale-1", 42))
  require.True(t, repo.IsEligible(ctx, "finale-1", 42))
}

func TestFinaleRepositoryOnlyReturnsOwnedTemplates(t *testing.T) {
  repo := newFinaleRepositoryForTest(t)
  _, err := repo.UpsertTemplate(ctx, 1, "fast cpp", "CPP", "#include <bits/stdc++.h>")
  require.NoError(t, err)
  templates, err := repo.ListTemplates(ctx, 2)
  require.NoError(t, err)
  require.Empty(t, templates)
}
```

- [ ] **Step 2: Run the repository tests and verify failure**

Run: `go test ./repository -run 'TestFinaleRepository' -count=1`

Expected: FAIL because finale models and repository methods do not yet exist.

- [ ] **Step 3: Implement the models and repository**

```go
type FinaleState string
const (
  FinaleDraft FinaleState = "DRAFT"
  FinaleLive FinaleState = "LIVE"
  FinalePaused FinaleState = "PAUSED"
  FinaleEnded FinaleState = "ENDED"
)

type FinaleSettings struct {
  WeekID string `gorm:"primaryKey;type:uuid"`
  AccessMode string `gorm:"not null;default:'RESTRICTED'"`
  State FinaleState `gorm:"not null;default:'DRAFT'"`
  RemainingSeconds int64 `gorm:"not null"`
  LiveSince *time.Time
}
```

Store grants with a composite unique `(week_id,user_id)`, scoring windows with
`started_at` and nullable `ended_at`, and templates with `(user_id,id)`, name,
language, source code, and timestamps. Register all four models in
`AutoMigrate` and add methods to the existing repository interface file.

- [ ] **Step 4: Run repository tests and formatting**

Run: `gofmt -w models/finale.go repository/finale_repository.go repository/finale_repository_test.go; go test ./repository -run 'TestFinaleRepository' -count=1`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add go-backend/models go-backend/repository go-backend/config/database.go
git commit -m "feat: add finale persistence"
```

### Task 2: Backend lifecycle, access, templates, and scoreability APIs

**Files:**
- Create: `go-backend/services/finale_service.go`
- Create: `go-backend/services/finale_service_test.go`
- Create: `go-backend/controllers/finale.go`
- Modify: `go-backend/bootstrap/app.go`
- Modify: `go-backend/routes/routes.go`
- Modify: `go-backend/models/request.go`
- Modify: `go-backend/models/response.go`
- Modify: `go-backend/services/problem_service.go`
- Modify: `go-backend/workers/scoring_cron.go`

**Interfaces:**
- Consumes `models.FinaleRepository` from Task 1 and the existing week/problem repositories.
- Produces `FinaleService.GetParticipantStatus`, `Transition`, `GrantAccess`, `RevokeAccess`, `ListTemplates`, `UpsertTemplate`, and `SubmissionCanScore`.
- `SubmissionCanScore(ctx, problemID, submittedAt) (bool, error)` is used by the scoring worker before assigning nonzero score.

- [ ] **Step 1: Write failing service/controller tests**

```go
func TestPauseFreezesTimeAndClosesScoreWindow(t *testing.T) {
  svc := newFinaleServiceForTest(t, liveFinaleWith(1800))
  status, err := svc.Transition(ctx, "finale-1", models.FinalePaused, now)
  require.NoError(t, err)
  require.Equal(t, int64(1800), status.RemainingSeconds)
  require.False(t, svc.SubmissionCanScore(ctx, "problem-1", now.Add(time.Second)))
}

func TestFinaleStatusHidesRestrictedContestFromUngranttedUser(t *testing.T) {
  response, err := svc.GetParticipantStatus(ctx, "finale-1", 99)
  require.ErrorIs(t, err, services.ErrFinaleAccessDenied)
  require.Empty(t, response)
}
```

- [ ] **Step 2: Run the targeted Go tests and verify failure**

Run: `go test ./services ./controllers -run 'Test(PauseFreezes|FinaleStatus)' -count=1`

Expected: FAIL because the finale service and routes do not exist.

- [ ] **Step 3: Implement the service, guarded routes, and scoring hook**

Expose protected participant routes:

```text
GET  /api/finales/:weekId/status
GET  /api/finales/:weekId/problems
GET  /api/templates
POST /api/templates
PUT  /api/templates/:templateId
DELETE /api/templates/:templateId
```

Expose admin routes:

```text
GET    /api/admin/finales
POST   /api/admin/finales
GET    /api/admin/finales/:weekId
POST   /api/admin/finales/:weekId/start
POST   /api/admin/finales/:weekId/pause
POST   /api/admin/finales/:weekId/resume
POST   /api/admin/finales/:weekId/end
PUT    /api/admin/finales/:weekId/access-mode
GET    /api/admin/finales/:weekId/access-grants
POST   /api/admin/finales/:weekId/access-grants
DELETE /api/admin/finales/:weekId/access-grants/:userId
```

Create a finale by creating a `ContestWeek` with `ContestType: "FINALE"` and
its settings atomically. Validate template names, language values (`CPP`,
`JAVA`, `PYTHON`), source size, transitions, and ownership. Make existing
problem access return `week_ended: true` for paused/ended finales only where
that means zero score; do not expose editorials merely because scoring paused.
Ensure the scoring worker assigns zero score when `SubmissionCanScore` is
false, preserving runs and submission records.

- [ ] **Step 4: Run focused tests**

Run: `gofmt -w services/finale_service.go services/finale_service_test.go controllers/finale.go models/request.go models/response.go routes/routes.go; go test ./services ./controllers ./workers -run 'Test.*Finale|TestPauseFreezes' -count=1`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add go-backend
git commit -m "feat: add finale lifecycle and template APIs"
```

### Task 3: Admin Finale management

**Repository:** `test_cell_admin` (separate git repo; see Repository map above).

**Files:**
- Create: `app/(app)/finales/page.tsx`
- Create: `app/(app)/finales/page.test.tsx`
- Create: `lib/finales.ts`
- Modify: `components/Layout.tsx`
- Modify: `lib/types.ts`

**Interfaces:**
- Consumes the admin routes from Task 2 through `lib/finales.ts`.
- Produces a Finales navigation entry and a management screen with lifecycle and access actions.

- [ ] **Step 1: Write failing UI tests**

```tsx
it('shows Pause while a finale is live and sends a confirmed pause', async () => {
  render(<FinalesPage />, { wrapper: finaleTestProvider(liveFinale) })
  await user.click(screen.getByRole('button', { name: 'Pause' }))
  await user.click(screen.getByRole('button', { name: 'Pause scoring' }))
  expect(pauseFinale).toHaveBeenCalledWith(liveFinale.weekId)
})

it('renders grant and revoke controls only for restricted finales', async () => {
  render(<FinalesPage />, { wrapper: finaleTestProvider(restrictedFinale) })
  expect(screen.getByRole('button', { name: 'Grant access' })).toBeVisible()
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- --run app/(app)/finales/page.test.tsx`

Expected: FAIL because the page and API client do not exist.

- [ ] **Step 3: Implement the dedicated admin screen**

Use the Challenges visual language and `ConfirmModal`. The create form accepts
title, description, duration, access mode, and an internal unique contest
number supplied by the backend. The details view links to the existing
challenge problem editor for the underlying contest week. Render Start, Pause,
Resume, and End permanently exactly according to returned lifecycle state.
Use the existing participant directory to search by user and call grant/revoke
endpoints; never maintain a browser-only grant list.

- [ ] **Step 4: Run the focused admin tests and lint**

Run: `npm test -- --run app/(app)/finales/page.test.tsx; npm run lint`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app components lib
git commit -m "feat: add finale administration"
```

### Task 4: Participant finale API client and route guards

**Repository:** `cell_frontend` (separate git repo; see Repository map above).

**Files:**
- Create: `lib/schemas/finale.ts`
- Create: `lib/types/finale.ts`
- Create: `tests/api-client.finale.test.ts`
- Modify: `lib/api-client.ts`
- Create: `app/api/finales/[...slug]/route.ts`
- Create: `app/api/templates/[...slug]/route.ts`

**Interfaces:**
- Consumes Task 2 participant routes.
- Produces `getFinaleStatus`, `getFinaleProblems`, `listTemplates`, `createTemplate`, `updateTemplate`, and `deleteTemplate`.

- [ ] **Step 1: Write failing API-contract tests**

```ts
it('rejects a finale response without a valid lifecycle state', async () => {
  fetchMock.mockResponseOnce(JSON.stringify({ success: true, data: { state: 'BROKEN' } }))
  await expect(getFinaleStatus('finale-1')).rejects.toThrow()
})

it('sends a template update only through its proxy route', async () => {
  await updateTemplate('template-1', { name: 'Fast C++', language: 'CPP', sourceCode: 'int main(){}' })
  expect(fetchMock).toHaveBeenCalledWith('/api/templates/template-1', expect.objectContaining({ method: 'PUT' }))
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- --run tests/api-client.finale.test.ts`

Expected: FAIL because the schemas, client calls, and proxies do not exist.

- [ ] **Step 3: Add schema validation, client calls, and proxies**

Model status with `DRAFT | LIVE | PAUSED | ENDED`, access mode, remaining
seconds, scoring flag, problems, and no more personal information than the
participant needs. Preserve the existing cookie-forwarding proxy behavior.
Return API errors in the same shape used by existing `api-client.ts` calls.

- [ ] **Step 4: Run targeted client tests, typecheck, and lint**

Run: `npm test -- --run tests/api-client.finale.test.ts; npm run typecheck; npm run lint`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api lib tests
git commit -m "feat: add participant finale API client"
```

### Task 5: Template loader with reliable autosave

**Repository:** `cell_frontend` (separate git repo; see Repository map above).

**Files:**
- Create: `components/sections/finale/TemplateLoader.tsx`
- Create: `components/sections/finale/TemplateLoader.test.tsx`
- Create: `hooks/useTemplateAutosave.ts`

**Interfaces:**
- Consumes template API functions from Task 4.
- Produces `TemplateLoader({ onContinue, initialTemplates })` and
`useTemplateAutosave(template, delayMs)` returning `saving`, `saved`, `error`, and `retry`.

- [ ] **Step 1: Write failing component and hook tests**

```tsx
it('shows Saving then Saved after a debounced edit', async () => {
  render(<TemplateLoader initialTemplates={[cppTemplate]} onContinue={vi.fn()} />)
  await user.type(screen.getByLabelText('Template code'), '// fast io')
  expect(screen.getByText('Saving…')).toBeVisible()
  await vi.advanceTimersByTimeAsync(800)
  expect(updateTemplate).toHaveBeenCalled()
  expect(screen.getByText('Saved')).toBeVisible()
})

it('keeps code visible and offers retry after an autosave failure', async () => {
  updateTemplate.mockRejectedValueOnce(new Error('offline'))
  render(<TemplateLoader initialTemplates={[cppTemplate]} onContinue={vi.fn()} />)
  await user.type(screen.getByLabelText('Template code'), 'x')
  await vi.advanceTimersByTimeAsync(800)
  expect(screen.getByRole('button', { name: 'Retry save' })).toBeVisible()
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- --run components/sections/finale/TemplateLoader.test.tsx`

Expected: FAIL because the loader and autosave hook do not exist.

- [ ] **Step 3: Implement named multi-language templates and autosave**

Use the project's Monaco editor styling. Debounce server writes by 800 ms;
serialize writes per template so a slow older request cannot overwrite newer
text. Show `Saving…`, `Saved`, and a persistent error with retry. Users may
create multiple named templates per supported language. Continue passes only
the selected template identity and source to the workspace; it does not delete
or mutate other language buffers.

- [ ] **Step 4: Run template tests and frontend checks**

Run: `npm test -- --run components/sections/finale/TemplateLoader.test.tsx; npm run typecheck; npm run lint`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/sections/finale hooks
git commit -m "feat: add autosaved finale templates"
```

### Task 6: Lobby, workspace, navigation, and page-state coverage

**Repository:** `cell_frontend` (separate git repo; see Repository map above).

**Files:**
- Create: `app/events/finale/page.tsx`
- Create: `app/events/finale/workspace/[problemId]/page.tsx`
- Create: `components/sections/finale/FinaleLobby.tsx`
- Create: `components/sections/finale/FinaleWorkspace.tsx`
- Create: `app/events/finale/page.test.tsx`
- Modify: the public Events listing component/page that renders weekly, mini-event, and TSEC Hacks entries

**Interfaces:**
- Consumes status, problems, and template loader from Tasks 4-5.
- Reuses `CodeEditor`, `ProblemPanel`, `VerdictPanel`, and submission methods from the existing solve page.

- [ ] **Step 1: Write failing page-state tests**

```tsx
it.each([
  ['DRAFT', 'Finale lobby'],
  ['LIVE', 'Enter contest'],
  ['PAUSED', 'Scoring paused'],
  ['ENDED', 'Contest ended'],
])('renders %s safely', async (state, visibleCopy) => {
  mockFinaleStatus({ state })
  render(<FinalePage />)
  expect(await screen.findByText(visibleCopy)).toBeVisible()
})

it('does not render a timer after permanent end', async () => {
  mockFinaleStatus({ state: 'ENDED', scoringActive: false })
  render(<FinalePage />)
  expect(screen.queryByTestId('finale-timer')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the page tests and verify failure**

Run: `npm test -- --run app/events/finale/page.test.tsx`

Expected: FAIL because the finale route and components do not exist.

- [ ] **Step 3: Implement the three-stage participant experience**

Lobby checks access server-side and explains draft/paused/ended states.
The loader opens before the first workspace entry. The workspace adapts the
existing solve-page composition instead of copying its polling internals:
extract only the reusable code if needed, preserve run/submission functionality
when scoring is inactive, and display the server-issued countdown only in
`LIVE`. Add a Finale card to the real Events navigation without altering the
weekly/mini-event/TSEC Hacks pages.

- [ ] **Step 4: Run focused tests and full frontend verification**

Run: `npm test -- --run app/events/finale/page.test.tsx components/sections/finale/TemplateLoader.test.tsx tests/api-client.finale.test.ts; npm run verify; npm run build:only`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app components hooks lib tests
git commit -m "feat: add finale participant workspace"
```

### Task 7: Cross-repository regression verification

**Repository:** all three (`cell_backend_latest`, `test_cell_admin`, `cell_frontend`); run this task's steps once per repo, in each repo's own worktree.

**Files:**
- Modify only files found by verification defects in Tasks 1-6.

**Interfaces:**
- Consumes the completed backend, admin, and participant applications.
- Produces evidence that standard weekly behavior still works and finale APIs agree with both clients.

- [ ] **Step 1: Run backend suite**

Run: `go test ./...`

Expected: PASS.

- [ ] **Step 2: Run admin suite**

Run: `npm test; npm run lint; npm run build`

Expected: PASS.

- [ ] **Step 3: Run participant suite**

Run: `npm run verify; npm run build:only`

Expected: PASS.

- [ ] **Step 4: Inspect changes and commits**

Run: `git status --short; git log --oneline --decorate -8; git diff --check HEAD~1..HEAD`

Expected: clean worktrees, focused commits, and no whitespace errors.

- [ ] **Step 5: Commit any narrowly scoped verification correction**

```bash
git add <affected-files>
git commit -m "fix: align finale integration"
```
