# Slice 1: record, list and view enquiries (draft requirements)

Check IDs: "1.3" means card 1, acceptance check 3. The plan, `docs/phases/slice-1-plan.md`, uses these IDs.

**Status: filed in Meridian on 2026-11-18 as REQ-5, REQ-6 and REQ-7, with all 20 checks. Meridian is now the record; this file is the working copy.** On 2026-11-19 all three were linked to BR1 as partial coverage, and they sit in the workstream `slice-1-record-list-view-enquiries` with the slice 1 plan. Still to do in Meridian: open the cards to agents (a person's step).

- **Answers:** the brief's "Record customer enquiries" (partial: capture, list
  and view only). Priority carried from BR1: **Must**.
- **Why it matters:** Aroha's stated purpose is to stop reps tripping over each
  other on the same customer (A1, still Proposed). Slice 1 lays the ground for
  that, because every enquiry is recorded in one place, with an owner, and
  everyone can see it (A11). The warning itself is slice 2 (D3).
- **Sources:** every rule cited by ID is in `docs/context/rep-answers.md`. Only
  **Approved** rules and project lead **decisions** are built from here.
  Anything else is marked as an open question.

## Standards this should meet

**None of Meridian's standards documents is written yet.** Security, Data,
Quality, Non-functional, Design, Conventions and Glossary are all placeholders
in `.ai/`. So no acceptance check below can cite a standard, and in
particular:

- there is no performance target for the list (see card 2);
- there is no data-retention or privacy rule for the contact details captured;
- there is no agreed definition of done beyond this repo's own tests and
  `flutter analyze`.

The checks below follow the patterns already in the code (P1–P6) instead.

---

## Card 1: Record a new enquiry (REQ-5)

**IN PLAIN TERMS.** Anyone signed in can open a "New enquiry" form, fill in who
the customer is, what is moving and where, and save it. The app gives it the
next reference number (ENQ-1001, ENQ-1002, and so on), marks it New, and makes
the person who saved it its owner.

### What to build

- A **New enquiry** action on the home screen, open to every active signed-in
  user, regular or admin (A11, A20).
- A form with these fields (A2, A3):

  | Field | Required? | Source |
  |---|---|---|
  | Company | Yes | A3 |
  | Contact name | Yes | A3 |
  | Email | One of email or phone is required | A3 |
  | Phone | One of email or phone is required | A3 |
  | Where from | Yes | A3 |
  | Where to | Yes | A3 |
  | Cargo (what is moving) | Yes | A3 |
  | Ready date | No | A3 ("the rest can come later"), L1 |

  No other fields. Dollar value belongs to the move to Quoted (B2), not to
  capture.
- Text is trimmed. A value that is blank after trimming counts as missing.
- **Email and phone checks (D2):** an email must look like `name@domain`. A
  phone must contain digits and may also contain spaces, `+`, `(`, `)` and `-`.
  **(D10)** A value that is entered must be valid even when the other one
  is valid. An invalid email is not silently dropped because a phone was given.
- **On save:**
  - the enquiry gets the next reference, `ENQ-` followed by four digits,
    starting at `ENQ-1001`, in order, never reused (A4). The reference is
    stored and unique;
  - its status is **New** (D1);
  - its owner is the signed-in user who saved it (A19, A20);
  - the time comes from the injected `Clock` (P3);
  - a history entry recording the creation (who and when) is written in
    **the same database transaction** (A15, D5). The history is not shown
    anywhere in slice 1.
- **The history cannot be changed (A15).** The repository offers no way to
  update or delete a history entry. **(D11)** The database also refuses an
  UPDATE or DELETE on the history table (for example, with triggers), so the
  rule holds even outside the app's own code.
- **Schema:** a new migration, number 3, adds the enquiries table and the
  enquiry history table. Migrations 1 and 2 are not edited (P5).

### Not in this card

- Recording an enquiry for someone else (A20, second half). This waits for F8,
  which login is the Sales Manager.
- The warning about open enquiries for the same company (A6, B5, B6). This is
  slice 2 (D3). In slice 1, a second enquiry for the same company saves with no
  warning.
- Editing, status changes, notes, reassigning and the summary.

### Around the edges

1. **On failure:**
   - **A rule is broken** (missing field, bad email or phone, neither email nor
     phone): the form stays open, keeps everything typed, and says which field
     is wrong. Nothing is saved. This follows the `ValidationException`
     pattern (P2).
   - **Unexpected error** (the database write fails): the form stays open,
     keeps everything typed, and shows "The enquiry could not be saved. Nothing
     was saved. Please try again." Because the enquiry and its history entry
     are one transaction, nothing is half-saved, and no reference number is
     used up (D12). Today the app does not handle such errors at all (R5), so this
     card must.
2. **Nothing yet:** not applicable to the form. The first enquiry ever saved is
   ENQ-1001.
3. **Who may and may not:**
   - any **active** signed-in user may record an enquiry, admin or not;
   - the service checks the actor is active, as `UserAdminService` does (P1);
   - a signed-out person never sees the form.
   - _Known limit (R1, Open):_ a user disabled while signed in keeps their
     access until they sign out. This card does not fix that.
4. **Stored values the new rule refuses:** none. The tables are new.
5. **Other screens showing the same facts:** the list (card 2) and the detail
   view (card 3) show the reference, status and owner written here. The summary
   (later, A17) will count enquiries by status. All must read the same stored
   values.

### CHECKED AT f9f24812922d2445db4cf477ceadbc041ee3683b — 2026-11-18

- The only table is `users`, created in migration 1 and extended in migration 2
  (`lib/src/core/database/migrations.dart`). No enquiry or customer table
  exists (C13).
- `AppDatabase.open` turns on `PRAGMA foreign_keys = ON` and runs migrations
  in ascending version order (`lib/src/core/database/app_database.dart`).
- `UserAdminService._requireAdmin` is the existing actor-permission check
  pattern (`lib/src/features/admin/domain/user_admin_service.dart`).
- `ValidationException` (`lib/src/core/exceptions.dart`) carries a message
  safe to show. `UserAdminController._save` catches only that, so any other
  error is unhandled (R5).
- `Clock` and `systemClock` (`lib/src/core/clock.dart`) return UTC.
- `HomeScreen` body is the text "Welcome to Harbour Freight"
  (`lib/src/features/home/home_screen.dart`). There is no enquiry entry point.
- The test helpers `openTestDatabase` (in-memory) and `buildApp` (users
  `alice`, regular, and `boss`, admin) exist in `test/support/`.
- `test/core/migrations_test.dart` already proves an upgrade from a version 1
  database. It is the model for proving the upgrade to version 3.

### Acceptance checks

1. **A complete enquiry saves as ENQ-1001, New, owned by whoever saved it.**
   `alice` saves company, contact, from, to, cargo and an email, and the stored
   enquiry is ENQ-1001, status New, owner `alice`.
   THE RIVAL: `boss` (an admin) saving the next one gets ENQ-1002, owned by
   `boss`, not by anyone else. Being an admin does not make you the Sales
   Manager (F8).
2. **Email or phone, one is enough.** Saving with phone only succeeds. Saving
   with email only succeeds.
   THE RIVAL: saving with neither is refused with a message, and the
   enquiries table is still empty afterwards.
3. **Each required field is required.** For each of company, contact name,
   from, to and cargo: blank, or only spaces, is refused, the message names
   that field, and nothing is stored.
   THE RIVAL: leaving the ready date blank is accepted.
4. **Email and phone formats (D2).** `kim@kauri.co.nz` and
   `+64 21 (123) 4567` are accepted. `kim-at-kauri` and `call me` are refused.
   THE RIVAL: an invalid email is refused even when a valid phone is also
   given.
5. **References run in order and are never reused.** Three saves give
   ENQ-1001, ENQ-1002 and ENQ-1003.
   THE RIVAL: a save refused or failed between two successful ones does not
   use up a number, and the database rejects a second enquiry with an existing
   reference.
6. **Creation is recorded in the history, in the same transaction (A15).**
   Each successful save writes exactly one history entry naming who created it
   and when, the time taken from the injected `Clock`.
   THE RIVAL: if the history write fails, the enquiry is not saved either. And
   an UPDATE or a DELETE run directly against the history table is refused.
7. **An unexpected failure is shown, not swallowed (R5).** When the database
   write throws something other than a `ValidationException`, the form stays
   open with every typed value and shows the "could not be saved" message.
   THE RIVAL: no enquiry and no history row exist afterwards.
8. **Only an active user may record.** The service refuses an inactive actor.
   THE RIVAL: an active regular user (not an admin) is allowed. Recording is
   not admin-only.
9. **An existing database upgrades cleanly.** A version 2 database holding
   users opens with the new app. The users, their roles and their passwords
   still work, and the enquiry and history tables now exist.
   THE RIVAL: a brand-new database is created at version 3 with the same
   tables.

---

## Card 2: See every enquiry in a list (REQ-6)

**IN PLAIN TERMS.** After signing in, everyone sees a list of all enquiries,
not only their own, 25 to a page with the newest at the top. Each row shows
the reference, the customer and contact, the route, the cargo, the status, who
owns it and when it was received.

**Design reference:** `docs/context/mockup-image.png` (M1–M9). Slice 1 takes
the mock-up's list order, columns and paging only. The status tiles, search,
filters and sidebar are later slices (D9).

### What to build

- The home screen shows the enquiry list in place of the welcome text, with
  the **New enquiry** action from card 1 (top right in the mock-up, M8).
- **Everyone sees every enquiry (A11).** There is no filtering by owner.
- **Order: newest first (D4).** The highest reference is at the top. This is
  backed by the mock-up (M1), which Aroha said "looks fine" in answer to the
  list-order question (G2).
- **Columns (D6, from the mock-up M2):**

  | Column | Shows |
  |---|---|
  | Ref | The reference, e.g. ENQ-1042 |
  | Customer | The company, with the contact name below it |
  | Route | Where from → where to, e.g. "Tauranga → Yokohama" |
  | Cargo | The cargo text |
  | Status | The status, as a badge |
  | Owner | The owner's **username** (D7). Full names, as in the mock-up (M3), are a later card |
  | Received | The date the enquiry was recorded, e.g. "14 Nov" |

- **Paging (D8, from the mock-up M7):** 25 enquiries per page, with
  **Previous** and **Next**, and "Showing X of Y enquiries" beneath the list.
  Previous is disabled on the first page and Next on the last.
- A newly saved enquiry appears at the top of the first page as soon as the
  form closes, without restarting the app.
- **Volume:** expect up to 3,000 enquiries a year (E5), and hundreds open at
  once (L5). Only the page being shown is loaded, so the number of enquiries
  does not slow the list down. There is no performance standard to cite.

### Around the edges

1. **On failure:** if the list cannot be loaded, the screen says "Enquiries
   could not be loaded." and offers **Try again**. The app does not crash or
   show a blank screen.
2. **Nothing yet:** with no enquiries, the screen says "No enquiries yet." and
   the New enquiry action is still there. The paging controls and the
   "Showing" count are hidden.
3. **Who may and may not:** every active signed-in user sees the full list
   (A11). A signed-out person sees the sign-in screen only. The admin's
   **Users** button stays where it is (C4).
4. **Stored values the new rule refuses:** none. The data is new.
5. **Other screens showing the same facts:** the detail view (card 3) shows
   the same reference, status and owner. The later summary (A17) counts by the
   same status. Enquiries saved by someone else appear when the list is next
   loaded. There are no live updates or notifications (A21, out of scope).

**Shared PC (T1–T3):** the app runs on one office PC that everyone shares,
using the one local database file (C11). So everyone does see the same
enquiries, and A11 holds. Because people share one screen, who is signed in
decides who owns a new enquiry (card 1). How people share the PC (H2) and R1
matter more as a result.

### CHECKED AT f9f24812922d2445db4cf477ceadbc041ee3683b — 2026-11-18

- `HomeScreen` shows a fixed welcome text, the username, sign-out and, for
  admins, the `open-users` button (`lib/src/features/home/home_screen.dart`).
- `UserAdminScreen` is the existing list pattern: it loads in `initState`
  through a controller and shows a spinner while loading
  (`lib/src/features/admin/presentation/user_admin_screen.dart`).
- Usernames are the only names stored for a user (`users` table, C8).

### Acceptance checks

1. **Everyone sees everything.** With one enquiry owned by `alice` and one by
   `boss`, `alice` signed in sees both rows, each showing its owner.
   THE RIVAL: `boss` sees the same two rows. Neither is hidden from a
   non-owner.
2. **Newest first.** Enquiries ENQ-1001 to ENQ-1003 are listed ENQ-1003,
   ENQ-1002, ENQ-1001.
   THE RIVAL: the order holds when the enquiries were saved by different
   users.
3. **The mock-up's columns.** A row for an enquiry from Kauri Timber Exports
   (contact Rangi Walker, Tauranga to Yokohama, "2 × 40ft containers, sawn
   timber", owner `alice`) shows its reference, the company with the contact
   below, "Tauranga → Yokohama", the cargo, a New badge, `alice`, and the date
   it was received.
   THE RIVAL: the owner column shows the username, not an id or a blank.
4. **Paged 25 at a time.** With 30 enquiries, the first page shows ENQ-1030
   to ENQ-1006 and "Showing 25 of 30 enquiries", with Previous disabled. Next
   shows ENQ-1005 to ENQ-1001.
   THE RIVAL: on the last page Next is disabled, and with exactly 25
   enquiries there is no second page.
5. **A new enquiry appears straight away.** After saving from the form, the
   new reference is at the top of the list without reopening the app.
   THE RIVAL: the rest of the list is unchanged.
6. **Empty list.** With no enquiries, "No enquiries yet." is shown along with
   the New enquiry action, and no paging controls.
   THE RIVAL: once one enquiry exists, the empty message is gone.
7. **Load failure.** When loading throws, the "could not be loaded" message
   and **Try again** are shown, and **Try again** loads the list once the
   fault clears.
   THE RIVAL: no partial or stale list is shown as if it were current.

---

## Card 3: Open an enquiry to read it (REQ-7)

**IN PLAIN TERMS.** Clicking an enquiry in the list opens it, showing
everything recorded about it. Nothing on this screen can be changed yet.

### What to build

- Selecting a row in the list (card 2) opens the enquiry's detail view.
- **It shows:** reference, status, owner, company, contact name, email, phone,
  where from, where to, cargo, ready date, and when it was recorded and by
  whom.
- **Read-only for everyone.** There are no edit, status, reassign or note
  controls in slice 1. Those come with later cards (B11, B7, A12, B12).
- **The history is not shown (D5).**
- Optional values that were not given (email, phone, ready date) show as
  "Not given". They are never left blank or shown as `null`.
- A way back to the list.

### Around the edges

1. **On failure:** if the enquiry cannot be loaded, for example because the
   record cannot be read, the screen says "This enquiry could not be loaded."
   with a way back to the list.
2. **Nothing yet:** not applicable. The view is only reached from an existing
   row. Missing optional values are covered above.
3. **Who may and may not:** every active signed-in user can open any enquiry
   (A11). No one, admin or owner, sees controls to change it in slice 1.
4. **Stored values the new rule refuses:** none.
5. **Other screens showing the same facts:** the status, owner and reference
   must match the list row it was opened from.

### CHECKED AT f9f24812922d2445db4cf477ceadbc041ee3683b — 2026-11-18

- The app navigates with `Navigator.push` and `MaterialPageRoute`, as
  `HomeScreen._openUsers` does (`lib/src/features/home/home_screen.dart`).
- There is no enquiry model, repository or screen yet. Card 1 creates them.

### Acceptance checks

1. **Everything recorded is shown.** Opening ENQ-1001 shows every value saved
   in card 1, with the right status, owner, and recorded-at and recorded-by.
   THE RIVAL: an enquiry saved without email or ready date shows "Not given"
   for those, not blank and not `null`.
2. **Anyone can open any enquiry.** `alice` can open an enquiry owned by
   `boss`.
   THE RIVAL: the view shows no edit, status, reassign or note controls,
   whether the viewer is the owner, a regular user or an admin.
3. **It matches the list.** The reference, status and owner on the detail view
   are the same as on the row it was opened from.
   THE RIVAL: going back returns to the same page of the list, with the same row still in
   place.
4. **Load failure.** When loading the enquiry throws, the "could not be
   loaded" message is shown with a way back.
   THE RIVAL: the app does not crash, and the list still works afterwards.

---

## Open questions carried by slice 1

| ID | Question | Affects |
|---|---|---|
| F8 | Which login is the Sales Manager? | Recording for someone else (not in slice 1) |
| H2 | How do people share the one PC: does each person sign in and out? (Tim confirmed one shared PC, T3) | Ownership on capture is only right if people sign in as themselves |
| F16, G1 | List order | D4: newest first, backed by the mock-up (M1). Aroha has not said so in words |
| M3, M5 | The mock-up shows full names and omits the Quoted total that A17 requires | Display names are a later card (D7). The summary slice must add the Quoted total |
| R1 | A user disabled while signed in keeps access | All cards. Known, not fixed here |
| R4 | Owners shown by username | Cards 2 and 3 |

## Suggested glossary terms

To be added to Meridian's Glossary document, which is unwritten:

- **Enquiry:** a customer's request for a freight quote, recorded with a
  reference.
- **Reference:** ENQ- followed by four digits, from ENQ-1001.
- **Owner:** the one user responsible for an enquiry at any time.
- **Status:** New, Quoted, Won or Lost. **Open** means New or Quoted;
  **closed** means Won or Lost (E2, still Proposed).
