# Slice 1 plan: record, list and view enquiries

**Status: draft, 2026-11-18. Not started.** Building begins only when the gates
below are met.

## Goal

Anyone signed in on the office PC can record a customer enquiry, see every
enquiry in a list, and open one to read it. This is the ground the main
business problem stands on. Aroha's words: "reps trip over each other on the
same customer" (A1). Slice 2 adds the warning that tackles it directly (D3).

## Sources

| What | Where |
|---|---|
| The three cards and their 20 acceptance checks | `docs/plans/slice-1-requirements-draft.md` (moving to Meridian when it is connected) |
| Every rule, decision and fact cited by ID | `docs/context/rep-answers.md` |
| The list design | `docs/context/mockup-image.png` (M1–M9) |
| The data design | `docs/design/enquiry-data-model.md` (agreed 2026-11-19, D14–D17) |

Check IDs: **1.3** means card 1, check 3.

## Scope

| Card | Delivers | Checks |
|---|---|---|
| 1. Record a new enquiry (REQ-5) | Capture form, validation, references, owner, creation history, migration 3 | 1.1–1.9 |
| 2. See every enquiry in a list (REQ-6) | Paged list on the home screen, newest first, the mock-up's columns | 2.1–2.7 |
| 3. Open an enquiry to read it (REQ-7) | Read-only detail view | 3.1–3.4 |

**Not in slice 1:**

- the duplicate-customer warning (slice 2, D3);
- status changes, the dollar value, editing, notes, reassigning;
- the summary and status tiles, search and filters, the sidebar (D9);
- display names (D7);
- recording for someone else (A20, second half);
- the Sales Manager's powers (F8, F20).

## Gates before building

All must be true before an agent writes code:

1. **Meridian is connected.** The three cards are filed with their checks,
   word for word from the draft, and linked to the business requirement
   "Record customer enquiries" (`set_requirement_coverage`, partial). They are
   placed in an open workstream and **opened to agents** by the project lead.
2. **The data design note is agreed** (`docs/design/enquiry-data-model.md`).
   Migration 3 runs automatically on the real database the first time the new
   build opens it, so its shape is settled before code is written.
3. **This plan's discovery documents are committed** on the build branch (see
   "Branches and commits").

If gate 1 cannot be met in time, the project lead decides whether to build
without Meridian tracking. That is a deliberate exception, not the default,
and would be recorded in the log.

## How the agent is directed

**One agent, one card at a time, in order.** The cards share the same new
files: the enquiry model, repository and service. Running them in parallel
would mean merge conflicts for no gain.

For each card, the agent is briefed with:

- the card from Meridian (or the draft), with its checks;
- the rule IDs it rests on, and where to read them;
- the files in scope (below) and the files it must not touch;
- the order of work in "Build order" and the evidence each step owes;
- the standing rules: `AGENTS.md`, the `meridian-session` skill,
  `.ai/skills/test-writing.md` ("prove the test can fail") and
  `.ai/skills/stack/flutter-desktop.md`.

**The agent must stop and ask, rather than decide, when:**

- a rule is ambiguous or two rules seem to conflict;
- the build seems to need a table or column the data design note does not
  have;
- it would change the `users` table, migration 1 or migration 2, or the
  auth and admin features beyond wiring;
- it wants a new package. That is a `get_tech_standard` check first, and
  `propose_technology` if the package is not listed. Nothing is added
  "for now";
- a check cannot be proved by an automated test.

**Session rules:**

- `begin_session` from inside its worktree, naming the card, with
  `repository_url` and `worktree`;
- every commit ends with `Meridian-Req: REQ-<n>`, with no blank line above
  `Co-Authored-By`;
- `report_evidence` for each check, **including attempts that failed**;
- `verify_queue` empty, then `end_session`.

## Build order

| Step | Card | Builds | Proves |
|---|---|---|---|
| 1 | 1 | Migration 3 (enquiries and enquiry history tables, history triggers), the enquiry model and repository | 1.5 (unique reference), 1.6 (history refuses UPDATE and DELETE), 1.9 |
| 2 | 1 | `EnquiryService.record(actor, …)`: active-actor check (P1), validation (A3, D2, D10), the next reference (A4, D12), owner (A19, A20), status New (D1), `Clock` (P3), enquiry and history written in one transaction (A15) | 1.1–1.6, 1.8 |
| 3 | 1 | The New enquiry form and its controller: field messages (P2), unexpected-error message keeping the input (R5) | 1.2–1.4 and 1.7 at screen level |
| 4 | 2 | The list on the home screen: controller, 25 per page, newest first, mock-up columns, empty and failure states | 2.1–2.7 |
| 5 | 3 | The read-only detail view: "Not given", failure state, back to the same page | 3.1–3.4 |
| 6 | All | Full test suite, `flutter analyze`, and a run of the real app on Windows (see "Manual check") | Everything together |

Steps 1 and 2 are where the business rules live, and they are tested without
any screen. Steps 3 to 5 are thin screens over them.

## Files

**New:**

- `lib/src/features/enquiries/` with `data/`, `domain/` and `presentation/`,
  following the `auth` and `admin` features (P4);
- `test/features/enquiries/`.

**Changed:**

- `lib/src/core/database/migrations.dart`: **append** migration 3 only (P5);
- `lib/src/features/home/home_screen.dart`: the list replaces the welcome
  text;
- `lib/main.dart` and `lib/src/app.dart`: wiring only;
- `test/core/migrations_test.dart`: add the version 2 → 3 upgrade test;
- `test/support/`: helpers for adding test enquiries.

**Must not change:** migrations 1 and 2, the `users` table, the sign-in and
user-admin rules, and `pubspec.yaml` (no new dependencies without the
tech-standard check).

## Evidence plan

Every check is proved by an **automated, repeatable test**: evidence type
`test_result`, run by `flutter test` locally and in CI
(`.github/workflows/meridian-evidence.yml`). **Each test is named with its
check's statement**, so CI can match its result to the check in Meridian,
which matches statements exactly. A check's rival half is proved in the same
test or a sibling test.

Failures are simulated by giving the service or controller a repository that
throws. The repository is an interface, as `UserRepository` is (P4), so no
test needs to break a real database.

| Check | Proved by | Level |
|---|---|---|
| 1.1 Complete enquiry → ENQ-1001, New, owner | Service test, in-memory database | Unit |
| 1.2 Email or phone, one is enough | Service test | Unit |
| 1.3 Each required field is required | Service test, one case per field, plus a form test for the message | Unit and widget |
| 1.4 Email and phone formats | Service test with the D2 examples | Unit |
| 1.5 References in order, never reused | Service test (sequence, refused save in between) and a direct duplicate insert | Unit and database |
| 1.6 History in the same transaction, unchangeable | Service test with a failing history write; direct UPDATE and DELETE against the table | Unit and database |
| 1.7 Unexpected failure is shown | Form widget test with a throwing repository | Widget |
| 1.8 Only an active user may record | Service test (inactive refused, active regular user allowed) | Unit |
| 1.9 Existing database upgrades | Migration test from a version 2 file holding users | Database |
| 2.1 Everyone sees everything | Widget test via `buildApp` as `alice`, then as `boss` | Widget |
| 2.2 Newest first | Widget test | Widget |
| 2.3 Mock-up columns | Widget test with the Kauri Timber row | Widget |
| 2.4 Paged 25 at a time | Widget test with 30, and with exactly 25 | Widget |
| 2.5 New enquiry appears straight away | Widget test: save from the form, back on the list | Widget |
| 2.6 Empty list | Widget test | Widget |
| 2.7 Load failure and Try again | Widget test with a repository that throws once | Widget |
| 3.1 Everything recorded is shown | Widget test, including "Not given" | Widget |
| 3.2 Anyone can open any enquiry, read-only | Widget test as owner, regular user and admin | Widget |
| 3.3 Matches the list | Widget test, including back to the same page | Widget |
| 3.4 Load failure | Widget test with a throwing repository | Widget |

### Prove the test can fail

For the checks that carry the core rules, the agent breaks the code on
purpose. It names, before running, the test it expects to fail, runs the
suite, records the failure with `report_evidence outcome: failed`, then
restores the code. A test that stays green when the code is broken is a
finding, not noise.

| Check | Deliberate break | Test expected to fail |
|---|---|---|
| 1.2 | Accept a save with neither email nor phone | 1.2's rival |
| 1.5 | Reuse the highest reference | 1.5 |
| 1.6 | Drop the history trigger | 1.6's rival |
| 1.7 | Catch only `ValidationException` again (today's R5 behaviour) | 1.7 |
| 2.1 | Filter the list to the signed-in owner | 2.1's rival |
| 3.2 | Show an Edit button to the owner | 3.2's rival |

### Manual check (step 6)

Automated tests use an in-memory database and a fake clock. Before slice 1 is
accepted, the real app is run on Windows against a real database file:

1. **Back up** any existing `harbour_freight.db` first. Migration 3 is forward
   only.
2. Sign in as `admin` and add two users through the Users screen (for
   example, a regular user for each of two reps).
3. Sign in as the first rep and record an enquiry like the mock-up's Kauri
   Timber one. Check it shows ENQ-1001 at the top of the list.
4. Try to save with neither email nor phone, and with a bad email. Check the
   messages, and that nothing typed is lost.
5. Sign out, sign in as the second rep, and check the first rep's enquiry is
   visible and opens read-only.
6. Close and reopen the app. Check the data is still there.

Screenshots of steps 3 to 5 go with the evidence. This is supporting
evidence. It does not replace the automated checks.

**Done 2026-11-19 by the project lead, on commit `1639bf0`: all steps
passed.** No database existed on this PC, so step 1 did not apply and the
first run created a fresh one; the upgrade is proved by check 1.9 only. No
screenshots were taken. Recorded on the workstream's discussion in Meridian.

## Accepting the slice

**Accept** when all of these are true:

- all 20 checks are met with `test_result` evidence at the merged `HEAD`, each
  rival half included;
- every deliberate break in the table above was seen to fail, and was
  reported;
- the existing tests still pass, and `flutter analyze` is clean;
- the upgrade test (1.9) passes, and migrations 1 and 2 are unchanged;
- the manual check was done and nothing in it contradicts the tests;
- no new dependency was added without the tech-standard check;
- every commit carries its `Meridian-Req:` trailer.

**Send back for more work** if any of these is true:

- a check is proved only by hand, or its rival half is missing;
- the history can be changed or deleted by any route;
- an unexpected error is swallowed, or clears what the user typed;
- an older migration or the `users` table was edited;
- the list shows only the signed-in user's enquiries;
- any rule in the cards was quietly reinterpreted. That is raised with the
  project lead instead.

**Acceptable, noted for later:**

- the screens look plainer than the mock-up (no tiles, sidebar or search, D9);
- owners are shown by username (D7);
- R1, a disabled user staying signed in, is unchanged.

## Risks

| Risk | Mitigation |
|---|---|
| Migration 3 runs on the real database automatically (P5, C11) | Agree the data design first (gate 2), test the upgrade (1.9), and back up the file before the first real run |
| Unexpected errors are not handled today (R5) | Checks 1.7, 2.7 and 3.4, and the 1.7 deliberate break |
| A user disabled while signed in keeps access (R1). On a shared PC (T3), sign-out habits matter (H2) | Not fixed in slice 1. Noted on the cards. H2 is asked of Hemi |
| Widget tests use a fake clock while the database is real and async | Use the existing `runAsync` and `settleUntil` helpers in `test/support/app_harness.dart` |
| No written standards (Quality, Security, Data, Non-functional) | This plan's acceptance rules stand in until `docs/context/quality.md` is written |

## Branches and commits

**Changed 2026-11-19 (D18):** the brief asks for one pull request into
`main`, which need not be merged. So slice 1 is built on **one branch**, not
three, and the discovery documents travel with it. (They were merged to `main`
in #8 and taken out again in #9.)

- **One branch, one worktree:** `feature/enquiry-slice-1`, branched from
  `main`, in its own worktree.
- **First commit:** the discovery documents (`docs/context/rep-answers.md`, the
  mock-up, `docs/plans/slice-1-requirements-draft.md`, this plan,
  `docs/phases.md`, `docs/design/enquiry-data-model.md`, the IT meeting
  notes), with a `Meridian-Phase: slice-1-record-list-view-enquiries`
  trailer.
- **Then the cards, in order:** one Meridian session naming REQ-5, REQ-6 and
  REQ-7. Each commit carries the `Meridian-Req:` trailer of the card it builds,
  so every check's evidence still traces to its own card.
- **One pull request** into `main`. Merge commits only, never squashed, if it
  is ever merged.
- Merging `main` back into a branch carries **no** trailer. If the merge
  touched files the card changed, the tests are re-run and the evidence is
  reported again at the merged `HEAD`.

## After slice 1

- Update `docs/context/rep-answers.md`: which rules are now built.
- Add the glossary terms (enquiry, reference, owner, status, open and closed)
  to Meridian's Glossary.
- Plan slice 2, the warning (A6, B5, B6, with B4 and E2 for what "open"
  means). Send F20 (users and roles) before any slice that gives the Sales
  Manager powers.
