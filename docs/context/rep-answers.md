# Business answers log: Enquiry Tracker

Everything we learn from the business, recorded in their own words before
anything is built from it.

## Rules for this log

- Each entry records the persona's **exact words**, the **type** (fact, rule
  or decision), our wording, anything we added, and whether it is firm or
  tentative.
- **Status:** a fact is **Noted**. A rule is **Proposed** until the project
  lead approves it. Anything tentative is **Open**.
- A fact is never turned into a rule. Every rule carries the persona's quote.
- **Proposed items are never shared with the business representatives.**
- Second-hand notes (for example, the IT meeting notes) are tentative, so they
  are **Open** until the persona confirms them directly.
- Aroha Williams (Sales Manager, sponsor) is the person who decides. A rule
  raised by anyone else stays Open until she confirms it.
- A **decision** (a choice Aroha has made about the project, as opposed to a
  rule the app enforces) is also **Proposed** until the project lead approves
  it. _Pending the project lead's confirmation of this convention._
- "I" or "me" in Aroha's answers is worded as **the Sales Manager** (her role), not her name. Which
  login or role that becomes in the app is not yet decided (see R3).
- An entry the business has overruled is marked **Superseded**, with the entry
  that overruled it.

## People

| Persona | Role | Answered by |
|---|---|---|
| Aroha Williams | Sales Manager, sponsor, decides | Joanna Kopel |
| Sam Taylor | Senior salesperson | Pete Lacey |
| Priya Nair | Salesperson | Joanna Kopel |
| Tane Edwards | Salesperson (part-time) | Pete Lacey |
| Hemi Cooper | Office manager, looks after the front-desk PC | Pete Lacey |

## Questions sent

| Date | To | Persona | Questions | Reply |
|---|---|---|---|---|
| 2026-11-18 | Joanna Kopel | Aroha Williams | Q1–Q13, assumptions A–D | Received 2026-11-18 (A1–A24). Q8 still to come. |
| 2026-11-18 | Joanna Kopel | Aroha Williams | Follow-ups F1–F7 | Sent 2026-11-18. Received 2026-11-18 (B1–B13). F6 (reopen status) still to come. |
| 2026-11-18 | Joanna Kopel | Aroha Williams | Follow-ups F9, F10 (reminder), F11, F12, F14 | Sent 2026-11-18. Received 2026-11-18 (E1–E6). F9 still not settled. |
| 2026-11-18 | Pete Lacey | Hemi Cooper | H1–H4 (the front-desk PC and its data; from L7) | Sent 2026-11-18, as drafted. Waiting. |
| 2026-11-18 | Tim (tooling) | n/a | F8, F15 | Sent 2026-11-18. Received 2026-11-18 (T1–T4). F15 answered. F8 redirected to the Sales Manager. |
| 2026-11-18 | Joanna Kopel | Aroha Williams | What the first version will do: F21, F22 (approved rules and project lead decisions only) | Sent 2026-11-18. Received 2026-11-18 (K1–K4). |
| 2026-11-18 | Joanna Kopel | Aroha Williams | F16 (list order), F17 (enquiries left without action) | Sent 2026-11-18. Received 2026-11-18 (G1–G5). Neither settled. |
| 2026-11-19 | Tim (tooling) | n/a | Meridian setup before slice 1 is built: F24–F27, with a progress report (initiative signed off, BR1 owner and risk set, REQ-5 to REQ-7 linked to BR1, plan on the workstream, data design drafted) | Sent 2026-11-19. Waiting. F27 overtaken: slice 1 was built with F24 and F25 still open (warnings, not blocks). |
| 2026-11-19 | Tim (tooling) | n/a | Progress report on slice 1 (PR #10 open, REQ-5 to REQ-7 Built, 85/85 tests, 6 deliberate breaks recorded, #8 and #9 explained), with F28–F30 and reminders of F24 and F25 | Sent 2026-11-19. Waiting. |

Held back for later: test users and roles (Tim); one PC or a shared database
location (Hemi); day-to-day handling of enquiries (Sam, Priya, Tane).

## Log

### From the IT meeting notes (`requirements-from-it-meeting.xlsx`)

Source: the first meeting with IT. The wording is as IT captured it, and none
of it has been checked by the business. Logged 2026-11-18.

| ID | Persona | Exact words (as captured) | Type | Our wording | Added by us | Firm? | Status | Settled by |
|---|---|---|---|---|---|---|---|---|
| L1 | Aroha Williams | "Reps need to log a new enquiry with enough detail that we can quote it: who the customer is, what is moving, where from and to, and when it is ready." | Fact | Reps record enough to quote: the customer, the goods, where from, where to, and the ready date. | None. We have not assumed any field is mandatory. | Tentative | Noted | Confirmed by Aroha in A3, which also sets the required fields (A3 is a rule, logged separately). The ready date is not among them. |
| L2 | Aroha Williams | "Moves through New, Quoted, then Won or Lost. Aroha wants to see it at a glance." | Fact | An enquiry's stages are New, Quoted, Won and Lost. | None. Whether stages can be skipped or reversed is unknown. | Tentative | Noted | Confirmed by Aroha in A8. Who moves stages: A9, A10. |
| L3 | Sam Taylor | "Only the owning rep should be able to see their enquiries, so nobody wanders into someone else's customers." | Rule? | Only the owning rep can see an enquiry. | None. It conflicts with L8 and the brief's summary, so Aroha must decide. | Tentative | **Superseded** | Overruled by Aroha in A11: "Everyone sees everything." |
| L5 | Priya Nair | "Reps will have hundreds on the go once the campaign starts. Search by customer, reference or port." | Fact | Reps expect hundreds of open enquiries and need to find one by customer, reference or port. | "Hundreds" suggests a performance expectation. Noted only, not made a rule. | Tentative | Open | Ask Priya later |
| L6 | Aroha Williams | "For when a customer disputes what was said or agreed. Who did what, and when." | Fact | The Sales Manager needs a record of who did what and when, to settle customer disputes. | None. What counts as "did what" is not defined. | Tentative | Noted | Confirmed by Aroha in A15 (logged there as a rule). |
| L7 | Hemi Cooper | "The office broadband drops out a lot. We cannot lose data if the PC is switched off or crashes." | Fact | Broadband is unreliable, and data must survive the PC being switched off or crashing. | Offline working is out of scope under the brief. The point about not losing data still stands. | Tentative | Open | Ask Hemi later |
| L8 | Aroha Williams | "Aroha wants to open the app and see how things stand without asking everyone." | Fact | The Sales Manager wants to see where the pipeline stands without asking each rep. | None. | Tentative | Noted | Confirmed by Aroha in A16 and A18. |

**Not logged as a business item:** BR4, "Add a customers table and block a
second enquiry for a customer that already exists," raised by Dev (IT). It is a
proposed fix, not something the business said. Q3 tests whether there is a
business need behind it. (L4 is left unused so the IDs still line up with the
meeting notes' BR numbers.)
_Update from Aroha's reply:_ the need behind BR4 is real (A1), but blocking is
not what she wants. A customer may have more than one open enquiry (A5), and
the rep should see who already has one (A6). BR4's block is not to be built.

### Replies

#### Aroha Williams (answered by Joanna Kopel), email of 2026-11-18

All of these come straight from Aroha, so none of them is second-hand. Q
numbers refer to the email of questions sent.

| ID | Q | Exact words | Type | Our wording | Added by us | Firm? | Status |
|---|---|---|---|---|---|---|---|
| A1 | (opening) | "The real problem I want fixed is that reps trip over each other on the same customer. That's what this has to fix." | Decision | The project's main purpose is to stop reps working the same customer without knowing it. | We read this as the measure of success, ranked above reassigning and the summary. | Firm | Proposed |
| A2 | Q1 | "Company, contact name, where from, where to, and what the cargo is." | Fact | An enquiry describes a company, a contact person, an origin, a destination and the cargo. | None. | Firm | Noted |
| A3 | Q1 | "Company, contact name, where from, where to, and what the cargo is. Plus an email or a phone number; one is enough. The rest can come later." | Rule | An enquiry cannot be saved without company, contact name, from, to and cargo, plus at least one of email or phone. Anything else is optional when it is first saved. | We read "the rest" as including the ready date (L1). Whether "later" means the owner can edit the enquiry afterwards is not stated. | Firm | **Approved** 2026-11-18, as worded |
| A4 | Q2 | "Yes. ENQ- then four digits, starting at 1001, in order, never reused." | Rule | Each enquiry gets a reference ENQ-nnnn, given in sequence from ENQ-1001. A reference is never reused. | None. What happens after ENQ-9999 was not asked. | Firm | **Approved** 2026-11-18, as worded. What happens past ENQ-9999 stays open under F9. |
| A5 | Q3 | "Just a company with a contact person. No customer list. Yes, a customer can have more than one open, because sometimes it's a genuinely separate job." | Fact | A customer is a company name with a contact person, typed on the enquiry. There is no customer list. A customer can have more than one open enquiry. | None. | Firm | Noted |
| A6 | Q3 | "But the rep should see who already has an open one with that customer before they go ahead." | Rule | Before a rep saves a new enquiry, the app shows any open enquiries for the same company and who owns each one. The rep may still go ahead. | That "open" means New or Quoted. That "the same customer" is matched on company name, and how loosely (case, spacing, "Ltd") is undecided. That a warning, not a block, is meant ("before they go ahead"). | Firm | **Approved** 2026-11-18, A6 only. What counts as "open" (B4) and how names match (B6) are approved separately. |
| A7 | Q3 | "No customer list." | Rule | The app does not keep a separate list of customers. | None. Taken from the same answer as A5. Logged as a rule only because it rules out a design (BR4's customers table). | Firm | **Approved** 2026-11-18, as worded |
| A8 | Q4 | "Yes, that's the full list." | Fact | The statuses are New, Quoted, Won and Lost, and there are no others. | None. | Firm | Noted |
| A9 | Q5 | "The owner moves their own. I can move anyone's." | Rule | Only the enquiry's owner or the Sales Manager may change its status. | Which moves are allowed (for example New straight to Won, or Quoted back to New) is not stated. | Firm | Proposed. **Held** 2026-11-18, until F5 and F8 are answered. _F5 now answered (B7). F8 still open._ |
| A10 | Q5 | "Only I can reopen a Lost one." | Rule | Only the Sales Manager may move an enquiry out of Lost. | What status a reopened enquiry goes back to is not stated. That a Won enquiry can never be reopened is our reading; she did not say so. | Firm | Proposed. **Held** 2026-11-18, until F6 and F8 are answered. _F6 partly answered: she repeated the rule (B9) and confirmed Won is final (B8). The reopen status is now answered (E1: New). F8 still open._ |
| A11 | Q6 | "Everyone sees everything. If reps could hide enquiries, we'd be back where we started." | Rule | Every signed-in user can see every enquiry. | That seeing does not mean editing; editing rights come from A9, A12, A14. | Firm | **Approved** 2026-11-18, as worded |
| A12 | Q7 | "Only me." | Rule | Only the Sales Manager may reassign an enquiry. | None. | Firm | Proposed. **Held** 2026-11-18, until F8 is settled. |
| A13 | Q8 | "I'd have to check and get back to you." | — | Whether a reason must be given when reassigning is not yet known. | None. | Tentative | Settled by B1: a reason is recorded. |
| A14 | Q9 | "Once it's Won or Lost, leave it alone." | Rule | A Won or Lost enquiry cannot be reassigned. | Asked about reassigning only. Whether "leave it alone" also means no other changes (fields, status) is not clear, and A10 allows the Sales Manager to reopen a Lost one. | Firm | **Approved** 2026-11-18, as worded. (B13, on details and notes, is reviewed separately.) |
| A24 | Q10 | "I'd move them to someone else." | Fact | When someone leaves, the Sales Manager reassigns their enquiries to someone else manually. | None. This does **not** ask for an automatic or bulk reassignment feature. (Numbered A24 because it was logged last.) | Firm | Noted |
| A15 | Q11 | "Yes. Everything that happens goes in the history, including who owns it. Nobody can edit or remove that history. It's for disputes." | Rule | Every change to an enquiry, including changes of owner, is recorded with who and when. Nobody, admins included, can edit or delete that history. | "Everything that happens" is not itemised. We read it as creation, field changes, status changes and reassignments. "Nobody" is read as including admins. | Firm | **Approved** 2026-11-18, as worded. Notes follow the answer to F11. |
| A16 | Q12 | "Me." | Fact | The summary is for the Sales Manager. | Whether others may also see it is not stated. A11 ("Everyone sees everything") may cover it. | Firm | Noted |
| A17 | Q12 | "How many enquiries are in each status across the whole team, and the total dollar value of everything currently Quoted." | Rule | The summary shows the number of enquiries in each status across the whole team, and the total dollar value of all enquiries currently Quoted. | **A dollar value is not among the required fields (A3), and nothing records one yet.** Who enters it, when, and whether it is needed before an enquiry can be marked Quoted, are all unknown. Currency and GST are unknown. _All answered in B2 and B3._ | Firm | **Approved** 2026-11-18, as worded |
| A18 | Q13 | "Everything, as it stands now." | Rule | The summary covers all enquiries as they stand at the moment, with no date range. | None. | Firm | Proposed |
| A19 | A | "Correct." (to "Each enquiry has one person responsible for it at any time.") | Rule | Each enquiry has exactly one owner at all times. | "Owner" is our word for her "person responsible"; she uses "owner" herself in A9 and B11. | Firm | **Approved** 2026-11-18, as worded |
| A20 | B | "Correct. Only I can enter one for someone else." (to "Whoever records an enquiry is responsible for it until it's reassigned.") | Rule | Whoever records an enquiry owns it. Only the Sales Manager may record an enquiry with another person as the owner. | None. | Firm | **Approved** 2026-11-18, as worded. Recording for someone else needs F8 (which login is the Sales Manager) before it can be built. |
| A21 | C | "Correct." (to "Reassigning an enquiry doesn't send anyone a notification. The new person sees it when they next open the app.") | Rule | Reassigning sends no notification. | None. Notifications are also out of scope under the brief. | Firm | Proposed |
| A22 | D | "Correct." (to "The summary is viewed on screen. It doesn't need to be printed or exported.") | Rule | The summary is on screen only, with no print or export. | None. | Firm | Proposed |
| A23 | D | "Reports and export maybe later, not for launch." | Fact | The Sales Manager may want reports and export after launch. | None. Out of scope for this work. | Tentative | Open |
#### Follow-up questions arising from Aroha's reply

These are worded as questions only, so no Proposed item is shared with her.

| ID | For | Question | Arises from |
|---|---|---|---|
| F1 | Aroha | Q8: does a reason need to be recorded when an enquiry is reassigned? (She said she'd come back to us.) | A13 |
| F2 | Aroha | Where does the dollar value of a quote come from? Who enters it, and when? What currency is it, and does it include GST? | A17 |
| F3 | Aroha | When a rep checks whether a company already has an open enquiry, which statuses count as "open"? | A6 |
| F4 | Aroha | Company names get typed differently ("Acme Ltd", "ACME Limited"). How close does a name need to be to count as the same customer? | A6 |
| F5 | Aroha | Which status changes are allowed? For example, can a New enquiry go straight to Won or Lost, or a Quoted one back to New? | A9 |
| F6 | Aroha | When a Lost enquiry is reopened, what status does it go back to? Can a Won enquiry ever be reopened? | A10, A14 |
| F7 | Aroha | After an enquiry is saved, who can change its details (the cargo, the contact, and so on)? Can anything be changed once it's Won or Lost? | A3, A14 |
| F9 | Aroha (sent 2026-11-18) | What should happen to the reference numbers once they pass ENQ-9999? | A4 |
| F8 | Tim (sent 2026-11-18). **Redirected** by Tim to the Sales Manager (T4). To ask Aroha. | Which login holds the Sales Manager role, and does that need a role of its own in the app (see R3)? | A9–A12, A17, A20 |
| F15 | Tim (sent 2026-11-18). **Answered** (T1–T3). | Where is the shared database we are meant to use, and does it contain any tables beyond `users` (for example, customers)? Who are the three test users, and what roles do they have? | C13, F8 |
| F16 | Aroha (sent 2026-11-18) | When you or a rep open the list of enquiries, what order is most useful to see them in? | D4 |
| F17 | Aroha (sent 2026-11-18) | How do you spot enquiries that have been open for a while with nothing happening on them? What would you want to see? | L8, A17 |
| H1 | Hemi (via Pete, sent 2026-11-18) | Will the app be used only on the front-desk PC, or on other computers as well? | L7, C11, F15. The project lead expected each rep to use their own device; Tim's answer (T3) says otherwise. Tim says one shared PC (T3). Hemi's own answer is still awaited. |
| H2 | Hemi (via Pete, sent 2026-11-18) | If several people use the front-desk PC, how do they share it? Does each person sign in and out, or does it stay signed in? | R1 |
| H3 | Hemi (via Pete, sent 2026-11-18) | When the PC has been switched off or crashed before, what was lost? What would be unacceptable to lose? | L7 |
| H4 | Hemi (via Pete, sent 2026-11-18) | Is anything on the front-desk PC backed up today? If so, how often? | L7 |

F1–F7 answered on 2026-11-18 (B1–B13), except the reopen status in F6, which
is still to come (B10). F8 and F9 are still open.

#### Aroha Williams (answered by Joanna Kopel), follow-up reply of 2026-11-18

Straight from Aroha. F numbers refer to the follow-up questions above.

| ID | F | Exact words | Type | Our wording | Added by us | Firm? | Status |
|---|---|---|---|---|---|---|---|
| B1 | F1 | "Yes, record the reason for re-assignment." | Rule | Every reassignment records a reason. | That the reason is **required**: a reassignment cannot be saved without one. She said "record", not "require". | Firm | Proposed |
| B2 | F2 | "The rep enters it when they move the enquiry to Quoted, and they can't move it without one." | Rule | An enquiry cannot move to Quoted unless a dollar value is entered at that point. | That this applies to whoever makes the move, including the Sales Manager (A9). That the value must be more than zero. Whether it can be changed later is not stated (B11 suggests the owner can while it is Quoted). | Firm | Proposed |
| B3 | F2 | "NZ dollars. GST exclusive." | Fact | Quote values are in NZ dollars, excluding GST. | None. | Firm | Noted |
| B4 | F3 | "The open ones." | Rule | The warning shows only open enquiries for that company. | That "open" means **New or Quoted**. She did not define it. With B8 (Won is final) and Lost being closed, it is the only sensible reading, but it is still ours. | Firm | Proposed. **Held** 2026-11-18, until F14 is answered. _F14 now answered (E2): our reading is confirmed in her words. Ready to review._ |
| B5 | F3 | "They should see who has it, then decide. Don't stop them." | Rule | The warning shows who owns each matching open enquiry. The rep decides whether to go ahead, and is never blocked. | None. | Firm | **Approved** 2026-11-18, as worded |
| B6 | F4 | "“Kauri Timber” and “Kauri Timber Ltd” are the same company. Beyond that, I can't expect the computer to guess." | Rule | Two company names count as the same customer when they differ only by a trailing "Ltd". No other guessing. | **Ignoring capital letters and extra spaces** is our addition. **Treating "Limited" or "Ltd." like "Ltd"** is our addition. She gave one example only. | Firm | **Approved** 2026-11-18, with the project lead's decision on F13: a trailing "Ltd", "Ltd." or "Limited" is ignored, and so are capital letters and extra spaces. Nothing fuzzier. These additions are the project lead's, not Aroha's. |
| B7 | F5 | "New goes to Quoted or straight to Lost. Quoted goes to Won or Lost. Nothing else." | Rule | The only status moves allowed are New → Quoted, New → Lost, Quoted → Won and Quoted → Lost. | That reopening a Lost enquiry (A10, B9) is the one exception to "Nothing else", since she said both. | Firm | Proposed |
| B8 | F6 | "Won is final." | Rule | A Won enquiry can never be reopened or moved to another status. | None. This confirms our reading added to A10. | Firm | Proposed |
| B9 | F6 | "Only I can reopen a Lost one." | Rule | Only the Sales Manager may reopen a Lost enquiry. | None. Same words as A10, so A10 is now confirmed twice. | Firm | Proposed |
| B10 | F6 | "I'm not sure yet which status it goes back to, let me check." | — | Which status a reopened Lost enquiry goes back to is not yet known. | None. | Tentative | Settled by E1: it goes back to New. |
| B11 | F7 | "The owner changes their own and I can change anyone's." | Rule | Only the enquiry's owner or the Sales Manager may change its details. | None. | Firm | Proposed |
| B12 | F7 | "Others can add a note but can't change the details." | Rule | Any user can add a note to any enquiry. Someone who is neither the owner nor the Sales Manager cannot change its details. | Notes are new: they had not come up before. Whether a note can be edited or deleted, and whether notes are part of the history (A15), is not stated. | Firm | Proposed. _F11 now answered (E3): notes are history and cannot be changed. Ready to review._ |
| B13 | F7 | "Once it's Won or Lost, leave the details alone. Notes are fine." | Rule | Once an enquiry is Won or Lost, nobody can change its details, but notes can still be added. | That "nobody" includes the Sales Manager. She did not say. | Firm | Proposed. _F12 now answered (E4): it does include her. Ready to review._ |

#### Follow-up questions arising from the second reply

Questions only, as before.

| ID | For | Question | Arises from |
|---|---|---|---|
| F10 | Aroha (she will come back) | When a Lost enquiry is reopened, which status does it go back to? | B10 |
| F11 | Aroha (sent 2026-11-18) | Once a note is added, can it be changed or removed? | B12, A15 |
| F12 | Aroha (sent 2026-11-18) | Can the Sales Manager change the details of a Won or Lost enquiry, or is it left alone for everyone? | B13 |
| F14 | Aroha (sent 2026-11-18) | When a rep is shown the other enquiries for a company, should Lost or Won ones be left out? | B4 |
| F13 | Project lead | Matching names: also ignore capital letters, extra spaces, "Limited" and "Ltd."? These are our additions in B6. Decide them, or put them to Aroha. | B6. **Decided** 2026-11-18 by the project lead: yes to all four. |

#### Aroha Williams (answered by Joanna Kopel), third reply of 2026-11-18

Straight from Aroha, answering F10, F14, F11, F12 and F9 (in the order the
email asked them).

| ID | F | Exact words | Type | Our wording | Added by us | Firm? | Status |
|---|---|---|---|---|---|---|---|
| E1 | F10 | "When a lost enquiry is re-opened, it should go to New (since an enquiry can be lost from New OR Quoted)" | Rule | A reopened Lost enquiry goes back to New. | That this is the one move allowed beyond B7's list, and only the Sales Manager may make it (A10, B9). Whether a dollar value entered at Quoted (B2) is kept or cleared on reopening was not asked. | Firm | Proposed |
| E2 | F14 | "New and Quoted. Won and Lost are closed." | Rule | An open enquiry is one that is New or Quoted. Won and Lost are closed. | None. This confirms, in her words, the reading we had added to B4. | Firm | Proposed |
| E3 | F11 | "No. Notes are part of the history, and nobody can edit or remove history." | Rule | Notes are part of an enquiry's history. Nobody can change or remove a note once it is added. | None. | Firm | Proposed |
| E4 | F12 | "It applies to me too. If something's wrong, add a note." | Rule | Nobody, the Sales Manager included, can change the details of a Won or Lost enquiry. A correction is made by adding a note. | That once the Sales Manager reopens a Lost enquiry (E1), it is New again, so its details can be changed under B11. She did not say. | Firm | Proposed |
| E5 | F9 | "At up to three thousand a year, that's a while off." | Fact | The business expects up to 3,000 enquiries a year. | None. | Firm | Noted |
| E6 | F9 | "Not sure yet." | — | What happens to references past ENQ-9999 is not yet decided. | At up to 3,000 a year, ENQ-1001 to ENQ-9999 lasts about three years. | Tentative | Open |

#### Follow-up questions arising from the third reply

| ID | For | Question | Arises from |
|---|---|---|---|
| F18 | Aroha (not yet sent) | When a Lost enquiry is reopened, should any dollar value from when it was Quoted be kept or cleared? | E1, B2 |

#### Aroha Williams (answered by Joanna Kopel), fourth reply of 2026-11-18

Straight from Aroha, answering F16 and F17.

| ID | F | Exact words | Type | Our wording | Added by us | Firm? | Status |
|---|---|---|---|---|---|---|---|
| G1 | F16 | "Not sure yet." | — | How the list should be ordered is not yet decided. | None. | Tentative | Open |
| G2 | F16 | "The mock-up looks fine to me." | Fact | Aroha has seen a mock-up and is happy with it. | Taken to mean `docs/context/mockup-image.png` (F19, M1–M9). She said this in answer to the list-order question, so it is read as backing newest first (M1), **not** as approving every element of the design. | Tentative | Noted |
| G3 | F17 | "I don't, at the moment." | Fact | Today the Sales Manager has no way to spot enquiries that have sat open with nothing happening. | None. | Firm | Noted |
| G4 | F17 | "Not sure yet what I'd want, could be a later feature." | — | Spotting enquiries left without action may be wanted later. What is wanted is not known. | None. Not part of the current work. | Tentative | Open |
| G5 | F17 | "At a glance, I need how many are in each status and the total value of what's Quoted." | Rule | The summary shows the number of enquiries in each status and the total value of Quoted enquiries. | None. Same as A17, in new words. No new rule. | Firm | Confirms A17 (Approved) |

| ID | For | Question | Arises from |
|---|---|---|---|
| F19 | Project lead | Which mock-up has Aroha seen? Did one come with the brief or in Meridian, or did someone else send it? | G2. **Answered** 2026-11-18: `docs/context/mockup-image.png`, logged as M1–M9. |

#### Tim Turner (exercise and tooling contact), reply of 2026-11-18

Tim answered inline in our email (F8, F15). He is not a business persona, so
his answers about the setup are facts about the environment. Where he answers
a business question (T3), the business persona's own answer (Hemi, H1) is
still awaited.

| ID | Q | Exact words | Type | Our wording | Added by us | Firm? | Status |
|---|---|---|---|---|---|---|---|
| T1 | F15 (where the database is) | "The application scaffold in the repo should have created an initial sqlite db. This is as far as the IT contractor got, so it's a starting point to build on top of, based on the requirements that are determined from each of the personas." | Fact | There is no separate shared database. The "shared database" is the local SQLite file the app creates (C11), and it is the starting point to build on. | None. | Firm | Noted |
| T2 | F15 (what is in it) | "It will only be generating what's currently in the code. There will need to changes to it to support what the business has determined they need" | Fact | The database holds only what the code creates (the `users` table). Schema changes are expected. | None. Confirms C13. | Firm | Noted |
| T3 | F15 (one PC or several) | "Just one pc, they all share the same computer in the office" | Fact | The app runs on one PC, shared by everyone in the office. | None. This **supersedes the project lead's expectation** that reps use their own devices (H1 note), and removes the slice 1 card 2 risk. It makes R1 (a user stays signed in) and H2 (how people share the PC) matter more. | Firm | Noted |
| T4 | F8 (test users and the Sales Manager role) | "These would be good questions for the sales manager ;)" | — | Who the users are, and whether the Sales Manager is the admin or a separate role, are for Aroha to answer. | None. | — | Open: redirected to Aroha as F20 |

| ID | For | Question | Arises from |
|---|---|---|---|
| F20 | Aroha (**deferred to slice 2**, D13, not sent) | Who will use the app, and what does each person do? Who should be able to add people or turn off their access? | T4, F8, R3 |

#### Aroha Williams (answered by Joanna Kopel), reply on the first version, 2026-11-18

We sent a plain-language summary of slice 1, containing approved rules and
project lead decisions only, and asked:

- **F21:** Is there anything in this first version that would stop the team
  from using it?
- **F22:** Is there anything you'd expect to see in the first version that
  isn't here?

| ID | F | Exact words | Type | Our wording | Added by us | Firm? | Status |
|---|---|---|---|---|---|---|---|
| K1 | F21 | "Fine for a start." | Decision | The slice 1 scope is acceptable to the Sales Manager as a first step. | None. Not a sign-off to go live (see K2). | Firm | Proposed |
| K2 | F21 | "But the team shouldn't rely on it until they can see who already has the customer. That's the real problem, so I wouldn't go live without it." | Decision | The app does not go live for the team until the duplicate-customer warning (A6, slice 2) is in. | That "go live" means the team starts using it for real enquiries. Slice 1 can still be built and tested before then. "That's the real problem" also backs A1 in her own words. | Firm | Proposed |
| K3 | F22 | "Same answer." | — | Nothing else is missing from the first version beyond the warning in K2. | We read "same answer" as pointing back to K2. | Firm | Noted |
| K4 | F22 | "Everything else can follow, as long as it's all there before the campaign." | Decision | Everything else agreed (status changes, quote values, notes, reassigning, the summary) must be in place before the campaign starts. | **When the campaign starts is not known** (F23). "All" is read as everything agreed so far, not search (L5, still Open). | Firm | Proposed |

| ID | For | Question | Arises from |
|---|---|---|---|
| F23 | Aroha (not yet sent) | When does the campaign start? | K4, L5 |
| F24 | Tim (sent 2026-11-19, reminded 2026-11-19) | Please name a QA person on the Enquiry Tracker initiative or the slice 1 workstream (a workspace admin's step in Meridian). | Meridian's ready-to-build warning on BR1 |
| F25 | Tim (sent 2026-11-19, reminded 2026-11-19) | BR1 needs one validation check at Medium risk. Should the project lead write it, or QA? Suggested wording was offered. | BR1 risk, Medium (set 2026-11-19) |
| F26 | Tim (sent 2026-11-19) | BR1 shows "No priority" in Meridian, but the IT meeting notes jotted Must. It will be set to Must unless Tim objects. | IT meeting notes (BR1) |
| F27 | Tim (sent 2026-11-19). **Overtaken**: slice 1 was built while F24 and F25 were open, and Tim was told. | Can slice 1 building start while F24 and F25 are still open? Meridian shows them as warnings, not blocks. | Meridian's ready-to-build warnings |
| F28 | Tim (sent 2026-11-19) | `flutter build windows` stops with "Building with plugins requires symlink support" on this PC. Is it OK to turn on Windows Developer Mode, or should the manual check run on another machine? | Plan step 6 (manual check) |
| F29 | Tim (sent 2026-11-19) | Who reviews the Security review Meridian suggested after REQ-6? Nobody is named. | Meridian workstream review |
| F30 | Tim (sent 2026-11-19) | `meridian-evidence.yml` still writes an empty result list. Wire the test results into it, or leave CI as it is for now? | Evidence plan |

#### The mock-up (`docs/context/mockup-image.png`)

Supplied by the project lead on 2026-11-18. This answers F19: it is taken to
be the mock-up Aroha meant in G2. Her only words about it are "The mock-up
looks fine to me", given in answer to F16 (list order). A mock-up is a
proposed design, not the business's words. So what it shows is logged as
**facts about the design** (Noted), **not rules**. An element becomes a rule
only when the project lead approves it for a slice.

| ID | What the mock-up shows | Bears on |
|---|---|---|
| M1 | The list is ordered newest first: ENQ-1042 at the top, received dates descending. | D4, F16, G1, G2 |
| M2 | List columns: Ref, Customer (company, with the contact name below), Route (from → to), Cargo, Status (coloured badge), Owner, Received (date). | Slice 1 card 2 |
| M3 | Owners and the signed-in user are shown by full name ("Sam Taylor", "Priya Nair"), not by username. | R4 |
| M4 | The signed-in user in the sample is "Sam Taylor, Administrator". The admin is a salesperson, not the Sales Manager. This is sample data, not a statement about roles. | R3, F8 |
| M5 | Status tiles at the top count New, Quoted, Won and Lost. **No total value of Quoted enquiries is shown**, which A17 requires. | A17, G5 |
| M6 | Search by "Customer, reference or port", and filters for Status and Owner. | L5 |
| M7 | The list is paged: "Showing 6 of 29 enquiries", with Previous and Next. | E5, slice 1 card 2 |
| M8 | Navigation is a left sidebar (Enquiries, Users), with the user's name and a sign-out at the bottom. A "+ New enquiry" button sits top right. | C4 |
| M9 | Sample routes are port to port (e.g. "Tauranga → Yokohama"). Sample cargo is free text (e.g. "2 × 40ft containers, sawn timber"). | A2, A3 |

## Project lead decisions

Choices nobody in the business has stated, made by the project lead so the
work can go ahead. They are **not** the business's words. Any of them can be
put to a persona later.

| ID | Date | Decision | Why it was needed | Related |
|---|---|---|---|---|
| D1 | 2026-11-18 | A newly captured enquiry starts as **New**. | Implied by L2 and A8, but never said. | A8, L2 |
| D2 | 2026-11-18 | Email and phone get a **basic format check**. Email must look like `name@domain`. Phone must contain digits, and may also contain spaces, `+`, `(`, `)` and `-`. | A3 requires at least one of them but does not say how strictly they are checked. | A3 |
| D3 | 2026-11-18 | The duplicate-customer warning (A6, B5, B6) goes in **slice 2**, not slice 1. Slice 1 is capture, list and a read-only detail view. | Slice scope. | A1, A6, B5, B6 |
| D4 | 2026-11-18 | The enquiry list shows the **newest first** (highest reference at the top). First set as an interim choice; now backed by the mock-up (M1), which Aroha said "looks fine" in answer to the list-order question (G2). Still to be revisited if she decides otherwise (F16, G1). | Nobody has said; Aroha is "Not sure yet" (G1). A4's "in order" is about how references are issued. | A4, F16, G1, G2 |
| D5 | 2026-11-18 | Slice 1 **records** the creation of each enquiry in its history (A15) but does **not show** the history. Showing it comes in a later slice, when there is more than one entry to show. | Slice scope. | A15 |
| D6 | 2026-11-18 | Slice 1 list columns follow the mock-up (M2): Ref, Customer (company with the contact name below), Route (from → to), Cargo, Status, Owner, Received (date recorded). | Nobody in the business specified columns. | M2 |
| D7 | 2026-11-18 | Slice 1 shows owners by **username**, not full name. Adding a display name to users, to match the mock-up (M3), is a later card. | The app stores only usernames (R4, C8). | M3, R4 |
| D8 | 2026-11-18 | The slice 1 list is **paged**, like the mock-up (M7): **25 per page**, with Previous and Next and a "Showing X of Y enquiries" count. | Volume: up to 3,000 a year (E5). | M7, E5 |
| D9 | 2026-11-18 | Status tiles (M5), search and filters (M6) and the sidebar layout (M8) go in **later slices**, not slice 1. The tiles belong with the summary (A17), which also needs the Quoted total the mock-up lacks. | Slice scope. | M5, M6, M8, A17 |
| D10 | 2026-11-18 | An email or phone that is entered must be valid, even when the other one is valid. An invalid email is refused, not silently dropped because a phone was given. | A3 and D2 do not say what happens when one is valid and the other is not. | A3, D2 |
| D11 | 2026-11-18 | The database itself refuses any UPDATE or DELETE on the enquiry history table, so history cannot be changed even outside the app's own code. | Enforces A15 ("Nobody can edit or remove that history"). | A15, E3 |
| D12 | 2026-11-18 | A save that is refused or fails does not use up a reference number. | A4 says "in order, never reused" but not whether a failed save leaves a gap. | A4 |
| D13 | 2026-11-18 | The users-and-roles question to Aroha (F20, which also answers F8) is **deferred to slice 2** and not sent now. | Slice 1 does not need it: any active user may record, and recording for someone else (A20, second half) is out of slice 1. | F20, F8, T4 |
| D14 | 2026-11-19 | The reference is stored as a **number** (1001) and shown as `ENQ-1001`. | Makes the next number and newest-first order simple, and keeps the order right past ENQ-9999 (F9 still open). Data design question 1. | A4, D4, D12 |
| D15 | 2026-11-19 | **Enquiries cannot be deleted.** The app offers no delete, and the database blocks it because every enquiry has history tied to it. | Not said by the Sales Manager. Accepted as a consequence of permanent history (A15) and never-reused references (A4). Data design question 2. | A15, A4, D11 |
| D16 | 2026-11-19 | History is **one general table**: who, when, what happened (`event`) and extra facts (`details`). The app owns the list of event names. | One history to show later, and new kinds of event need no table change. Data design question 3. | A15, B1, E3, D5 |
| D17 | 2026-11-19 | Status is stored in **lower case** (`new`, `quoted`, `won`, `lost`) and shown capitalised. The database refuses any other value. | Follows how `users.role` is stored. Data design question 4. | A8, D1 |
| D18 | 2026-11-19 | Slice 1 is built on **one branch** (`feature/enquiry-slice-1`) as **one pull request**, with the discovery documents on it. They were merged to `main` in #8 and reverted in #9. Commits still carry each card's own `Meridian-Req:` trailer. | The brief asks for the working application as one pull request into `main`, which need not be merged. Three stacked branches would not fit that. | Brief, slice 1 plan |

## What the app does today

Source: our reading of the code at commit `f9f2481` (`main`), 2026-11-18.
These entries come from the code, not from a persona, so they carry a file
reference instead of a quote. They are facts about how the app behaves now,
**not rules for new work**. They are type Fact, status Noted.

### App summary

| ID | Fact | Where in the code |
|---|---|---|
| C1 | There are three screens: sign-in, home, and user management (admins only). Nothing for enquiries or customers exists yet. | `lib/src/app.dart`, `features/home/home_screen.dart` |
| C2 | A user signs in with a username and password. Usernames ignore case and surrounding spaces. A wrong password, an unknown user and a disabled account all show the same message: "Invalid username or password." | `features/auth/domain/auth_service.dart` |
| C3 | Signing out returns to the sign-in screen. The signed-in user is held only in the app's memory. There is no "remember me" and no session timeout. | `features/auth/presentation/auth_controller.dart` |
| C4 | The home screen shows a welcome message, the username, a sign-out button and, for admins only, a "Users" button. | `features/home/home_screen.dart` |
| C5 | An active admin can list users, add a user (username, password, role) and edit one (rename, change role, enable or disable, set a new password). Users cannot be deleted, only disabled. | `features/admin/domain/user_admin_service.dart` |
| C6 | User rules: only an active admin may manage users. A username is required and must be unique, ignoring case. A password must be at least 8 characters. The last active admin cannot be demoted or disabled. | `features/admin/domain/user_admin_service.dart` |
| C7 | There are two roles, `admin` and `user`. | `features/auth/domain/user.dart` |
| C8 | The database holds one table, `users`: id, username, password hash, role, active flag and created date. There is no display name or email. | `core/database/migrations.dart` |
| C9 | Passwords are stored as PBKDF2-SHA256 hashes, with 100,000 iterations and a random salt per password, and are compared in constant time. | `features/auth/domain/password_hasher.dart` |
| C10 | One account comes with the app: `admin`, with password `ChangeMe123!`. The brief's three test users are not created in the code. | `core/database/migrations.dart` |
| C11 | The database is a single SQLite file, `harbour_freight.db`, in the Windows user's application-support folder. The app creates and upgrades it itself when it starts. | `core/database/app_database.dart` |
| C12 | There are about 40 automated tests, covering sign-in, user management, the database and its migrations. They run on an in-memory database. | `test/` |
| C13 | There is no customer table. The code creates only `users`, and nothing in the code refers to customers. **Checked in the code, and confirmed by Tim (T2):** the database holds only what the code creates. The shared database the brief promises has not been seen: there is no `harbour_freight.db` on this machine (searched the user profile and `C:\src` on 2026-11-18). Whether that database holds extra tables is unchecked; see F15. | `core/database/migrations.dart` |

### Patterns new work should follow

| ID | Fact | Where in the code |
|---|---|---|
| P1 | Every operation names the user performing it (`User actor`), and the service checks that user's permission. This is enforced in the service, not only by hiding buttons. | `user_admin_service.dart` (`_requireAdmin`) |
| P2 | A broken rule raises a `ValidationException` whose message is safe to show. The controller turns it into an on-screen message. | `core/exceptions.dart`, `user_admin_controller.dart` |
| P3 | The current time comes from an injectable `Clock`, never `DateTime.now()`, so tests can control time. | `core/clock.dart` |
| P4 | Each table has a repository that holds all of its SQL. Screens talk to controllers, controllers to services, services to repositories. | `features/auth/data/user_repository.dart` |
| P5 | Schema changes are numbered and forward-only. A change that has shipped is never edited; a new one is added instead. | `core/database/migrations.dart` |
| P6 | Tests use an in-memory database and a helper that adds test users. | `test/support/` |

## Risks

Things in the current code that affect the work ahead. **These are risks, not
rules.** The project lead decides each one, or takes it to the relevant
persona. Until then each stays **Open**.

| ID | Risk | Why it matters for the enquiry work | Evidence | Decision route | Status |
|---|---|---|---|---|---|
| R1 | A disabled or demoted user stays signed in with their old access until they sign out. | Permission checks for seeing or reassigning enquiries would use stale access. | `auth_controller.dart` keeps the user as it was at sign-in. | Project lead | Open |
| R2 | Nothing records who changed what, or when. | Reassignment history (L6, Q11) would be the app's first audit trail, so there is no pattern to copy. | No history table in `migrations.dart`. | Project lead, or Aroha via Q11 | Open |
| R3 | There are only two roles, `admin` and `user`. There is no manager role. | If the Sales Manager must see every enquiry but not manage users, a new role is needed, which is a schema change. | `user.dart`, migration 2 | Aroha, via Q6 and Q7 | Open |
| R4 | Usernames are the only names held for a person. | A "reassign to" list or the summary would show logins such as `admin` rather than people's names. | `users` table, C8 | Project lead, or Aroha | Open |
| R5 | Only rule violations are caught and shown. Unexpected errors, such as a database failure, are not handled. | A failed save or reassignment could fail with no message to the user. | `user_admin_controller.dart` (`_save`) | Project lead | Open |
