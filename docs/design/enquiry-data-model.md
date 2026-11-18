---
node: Enquiry Tracker
---
# Data design: enquiries and their history (slice 1)

**Status: agreed by the project lead, 2026-11-19 (D14–D17).** This is gate 2
of the slice 1 plan (`docs/phases/slice-1-plan.md`). It had to be agreed before
any code, because migration 3 runs on the real database file the first time
the new build opens it, and it cannot be undone (P5, C11). A change to it now
goes back to the project lead.

Rule IDs are defined in `docs/context/rep-answers.md`. Cards: REQ-5, REQ-6 and
REQ-7 in Meridian.

## What changes

One new migration, **version 3**, appended to `lib/src/core/database/migrations.dart`.
It adds two tables and two triggers. **Nothing existing is changed:** the
`users` table and migrations 1 and 2 stay exactly as they are (P5).

| Adds | Why |
|---|---|
| `enquiries` table | One row per enquiry (A2, A3, A4, A19) |
| `enquiry_history` table | Who did what and when, for disputes (A15, D5) |
| Two triggers on `enquiry_history` | The database refuses to change or delete history (D11) |
| One index on `enquiry_history` | Reading one enquiry's history later |

## Table: `enquiries`

```sql
CREATE TABLE enquiries (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_number INTEGER NOT NULL UNIQUE CHECK (reference_number >= 1001),
  status           TEXT    NOT NULL CHECK (status IN ('new', 'quoted', 'won', 'lost')),
  owner_id         INTEGER NOT NULL REFERENCES users (id),
  company          TEXT    NOT NULL CHECK (length(trim(company)) > 0),
  contact_name     TEXT    NOT NULL CHECK (length(trim(contact_name)) > 0),
  email            TEXT,
  phone            TEXT,
  origin           TEXT    NOT NULL CHECK (length(trim(origin)) > 0),
  destination      TEXT    NOT NULL CHECK (length(trim(destination)) > 0),
  cargo            TEXT    NOT NULL CHECK (length(trim(cargo)) > 0),
  ready_date       TEXT,
  created_at       TEXT    NOT NULL,
  created_by       INTEGER NOT NULL REFERENCES users (id),
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
)
```

| Column | Holds | Rule |
|---|---|---|
| `id` | Internal key. Never shown. | |
| `reference_number` | The number part of the reference: 1001 is shown as `ENQ-1001`. The `ENQ-` prefix and four-digit padding are added by the app, not stored. | A4 |
| `status` | `new` in slice 1. The other three values are allowed now so that later slices need no change to this table. | A8, D1 |
| `owner_id` | The user who owns the enquiry. Exactly one, never empty. | A19, A20 |
| `company`, `contact_name`, `origin`, `destination`, `cargo` | Required text, stored trimmed. | A2, A3 |
| `email`, `phone` | Optional, but not both missing. Stored trimmed; empty is stored as `NULL`, never `''`. | A3, D2, D10 |
| `ready_date` | Optional date only, `YYYY-MM-DD`, with no time or time zone. | A3, L1 |
| `created_at` | When it was recorded: UTC, ISO 8601, from the injected `Clock`, written the same way as `users.created_at`. | P3 |
| `created_by` | Who recorded it. Same as `owner_id` in slice 1. Kept separately because they differ once the Sales Manager records for someone else, and when an enquiry is reassigned. The detail view shows it as "recorded by". | A20, REQ-7 |

**What the database enforces, and what the app enforces.** The database refuses
a blank required field, a missing email *and* phone, an unknown status, an
unknown owner and a duplicate reference. These are a safety net: the service
checks them first, so the user sees a message naming the field (P2). **The
email and phone formats (D2) are checked only by the service**, because
SQLite has no good way to test them and the rule may be adjusted.

**Not added in slice 1, on purpose:**

- the quoted dollar value (B2). It is added by the migration for the Quoted
  move;
- a "normalised company" column for the duplicate warning (B6, slice 2). The
  slice 2 design decides whether it is stored or worked out when reading;
- display names (D7).

## How a reference number is given (A4, D12)

Inside the same transaction that saves the enquiry:

```sql
SELECT COALESCE(MAX(reference_number), 1000) + 1 FROM enquiries
```

- **In order, starting at 1001:** the first enquiry gets 1001, and each one
  after gets the next number.
- **A failed save uses up no number (D12):** the number is only read inside the
  transaction, so if the save is refused or fails, nothing is kept and the next
  save gets the same number.
- **Never reused (A4):** the `UNIQUE` constraint rejects a duplicate. A number
  could only come back if the highest enquiry were deleted. The app has no way
  to delete an enquiry, and the database blocks it anyway, because every
  enquiry has a history entry pointing at it (see below).
- **One PC, one writer (T1–T3):** there is no race between two people saving at
  the same moment, and the transaction would guard it if there were.
- **Past ENQ-9999 (F9, still open):** nothing in this design stops at 9999. The
  number would carry on as ENQ-10000. What should happen is the Sales
  Manager's call. It is a long way off: about three years at 3,000 a year (E5).

## Table: `enquiry_history`

```sql
CREATE TABLE enquiry_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  enquiry_id  INTEGER NOT NULL REFERENCES enquiries (id),
  happened_at TEXT    NOT NULL,
  actor_id    INTEGER NOT NULL REFERENCES users (id),
  event       TEXT    NOT NULL,
  details     TEXT
)
```

```sql
CREATE INDEX enquiry_history_by_enquiry ON enquiry_history (enquiry_id, id)
```

| Column | Holds |
|---|---|
| `enquiry_id` | The enquiry it belongs to. |
| `happened_at` | When: UTC, ISO 8601, from the injected `Clock` (P3). |
| `actor_id` | Who did it. |
| `event` | What happened. Slice 1 writes only `created`. Later slices add, for example, `status_changed`, `reassigned` and `note_added` (A15, B1, E3). |
| `details` | Extra facts for that event, as JSON text. `NULL` for `created`. Later, for example, the old and new owner and the reason for a reassignment (B1). |

**Why `event` has no `CHECK` list:** SQLite cannot change a `CHECK` on an
existing table without rebuilding it, and rebuilding the history table would
mean copying and dropping the history, which D11 is there to prevent. The
service owns the list of events instead.

**Creation is one transaction (A15, REQ-5 check 1.6):** the service writes the
enquiry row and its `created` history row together. If either fails, neither is
kept.

## History cannot be changed (A15, D11)

```sql
CREATE TRIGGER enquiry_history_no_update
BEFORE UPDATE ON enquiry_history
BEGIN
  SELECT RAISE(ABORT, 'Enquiry history cannot be changed.');
END
```

```sql
CREATE TRIGGER enquiry_history_no_delete
BEFORE DELETE ON enquiry_history
BEGIN
  SELECT RAISE(ABORT, 'Enquiry history cannot be removed.');
END
```

- The repository offers no update or delete for history, and the triggers stop
  anything else that opens the file, including a database tool.
- **Limit, stated plainly:** someone with the file and a database tool can
  still drop the triggers or the table. That is outside what an app can
  prevent. Backups of the file are the protection, and they are not in scope.
- Because the history rows reference their enquiry, an enquiry cannot be
  deleted either (foreign keys are on: `PRAGMA foreign_keys = ON` in
  `AppDatabase.open`). Nothing in A15 or A4 asks for this directly; it follows
  from them.

## Users

- `owner_id`, `created_by` and `actor_id` all point at `users.id`.
- The app has no way to delete a user, only to disable one. If a user were ever
  deleted while they owned an enquiry, the database would refuse, which is the
  right outcome.
- A disabled user keeps their enquiries and stays named as owner. Who picks up a
  disabled person's enquiries is the reassignment slice (A12, held).

## How the screens read it

| Screen | Query |
|---|---|
| List (REQ-6) | `enquiries` joined to `users` for the owner's username, `ORDER BY reference_number DESC`, `LIMIT 25 OFFSET n`, plus `SELECT COUNT(*)` for "Showing X of Y". The unique index on `reference_number` serves the order. Only one page is loaded at a time (E5, L5). |
| Detail (REQ-7) | One `enquiries` row by `id`, joined to `users` twice: once for the owner, once for who recorded it. |
| "Received" date | `created_at` converted from UTC to the PC's local time, then shown as a date, e.g. "14 Nov". |

No history is read in slice 1 (D5).

## The upgrade (REQ-5 check 1.9)

- An existing version 2 database gains the two tables, the index and the
  triggers. Its users, roles and passwords are untouched.
- A new database is created straight at version 3 with the same result.
- sqflite runs the upgrade as one transaction, so a failure part-way leaves the
  file at version 2. **To be confirmed** by the 1.9 test, not assumed.
- **Before the first real run, back up `harbour_freight.db`.** The migration
  cannot be reversed (step 6 of the plan).

## Decisions (agreed 2026-11-19)

| # | Decision | Log |
|---|---|---|
| 1 | Store the reference as a number (`1001`), show it as `ENQ-1001`. | D14 |
| 2 | Enquiries cannot be deleted. Accepted as a consequence of A15 and A4; not asked of the Sales Manager. | D15 |
| 3 | One general history table, with `event` and `details`. | D16 |
| 4 | Status stored in lower case (`new`), shown capitalised (`New`). | D17 |
