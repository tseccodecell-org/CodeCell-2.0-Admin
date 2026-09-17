# CodeCell Finale Experience Design

## Purpose

Provide a production-backed offline finale experience reachable from the public
Events area. The participant journey is Finale Lobby, CP Template Loader, then
the live Contest Workspace. It must use the platform's existing problem,
judge, submission, and scoring infrastructure while adding the control and
access policies that an offline finale requires.

## Architecture

`ContestWeek` remains the shared contest record and source of truth for
problems, submissions, judging, and leaderboard-compatible scoring. A finale
is identified with the new `FINALE` contest type. Finale-specific behavior is
kept in a one-to-one settings record rather than changing the behavior of
ordinary weekly challenges.

The settings record holds the access mode, current lifecycle state, frozen
remaining duration, whether the finale has ended permanently, and scoring
windows. An access-grant table associates a restricted finale with individual
users. A separate user-owned template table stores named, language-tagged CP
templates.

## Finale lifecycle

The lifecycle is `DRAFT`, `LIVE`, `PAUSED`, and `ENDED`.

- Start opens a scoring window and starts the countdown.
- Pause closes the current scoring window and freezes the remaining duration.
  Code execution and submissions remain usable, but submissions do not score.
- Resume opens a new scoring window using the frozen remaining duration.
- End permanently closes scoring forever. The participant workspace stays
  usable, displays `Contest ended`, and no longer displays the timer.

The backend is authoritative for access, lifecycle, and whether a submission
counts. The client must never determine those rules on its own.

## Access and problems

An admin selects one of two modes for each finale:

- `OPEN`: any authenticated participant may enter.
- `RESTRICTED`: only users with an explicit access grant may enter.

The participant group is not hard-coded to a top-20 cutoff. Admins can grant
and revoke individual access for any cohort size. Every admitted participant
receives the same finale problem bucket, managed through the existing problem
editor and contest-problem association.

## Templates

Templates are a named collection owned by the authenticated user. Each has a
supported language and text source code. Participants create and edit them in
a browser-based editor; file uploads are out of scope.

Template edits autosave after a short debounce. The UI always communicates
`Saving`, `Saved`, or an actionable retry state. A failed save keeps the
latest text locally visible and must not be presented as saved. In the loader,
the participant selects a saved template; selecting it fills the matching
language editor without overwriting another language's in-progress code.

## User interfaces

The public frontend receives a dedicated Finale entry under Events, plus
Lobby, Template Loader, and Workspace screens. The Workspace reuses the
existing code editor, run flow, submission flow, polling, and verdict UI.

The admin application gains a dedicated Finales section next to Challenges.
It creates finale contests, manages shared problems, selects open or
restricted access, grants/revokes access from the existing participant
directory, and provides confirmed Start, Pause/Resume, and End permanently
controls. The existing Events page remains untouched because it is mock-only.

## Failure behavior

The participant route handles ineligible access, stale authentication,
network failures, unavailable finale data, and autosave failures explicitly.
The existing submission error and polling behaviors remain the basis for the
workspace. Admin lifecycle actions are audited and confirmed.

## Verification

Tests cover lifecycle transitions and scoring windows, open/restricted access
and individual grants, template ownership and autosave/retry behavior,
participant page states, admin controls, and regression behavior for existing
weekly contests. The frontend, admin app, and backend checks run before the
implementation is reported complete.
