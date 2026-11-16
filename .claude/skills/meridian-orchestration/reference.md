# meridian-orchestration: the reasons behind the rules

`SKILL.md` states each rule and the symptom that tells you you have hit it.
This file keeps the incidents and figures that taught them. Open it when a
rule seems not to apply to you, or when you want to argue for changing one.
The requirement numbers are the cards in Meridian's own workspace that added
each rule.

## What the rules prevent

Everything in `SKILL.md` prevents a failure that **looks like success**: a
green suite with an empty board, a merged PR that un-proves itself, a metric
that reads perfect because nothing was ever recorded.

## Choosing the model per task

Drop below your strongest model only for work that is low risk, or
pattern-repeatable and obvious if delivered wrong. Keep the strongest wherever
the spec might be wrong, because it routinely is.

## Filing requirements

`create_requirement` warns when the plain-terms opener is missing or the title
carries an identifier, and never refuses; the override is recorded.

## Briefing

- **Repository and worktree in every lane's `begin_session`.** In Meridian's
  own workspace every lane from 18 to 29 October 2026 opened its session with
  neither, because the brief left them out, and the brief had them call
  `begin_session` before making the worktree, so each reported the main
  checkout and `main`. Their commits were recorded unverified, and a lane
  holding the computer's test lock showed as working rather than running its
  tests, because Work in progress matches the lock to a session by worktree.
  `begin_session` now leads its reply with a line when it can link no
  repository, and says so when the branch is the default branch.
- **Asking for the artefact.** A brief asking for *chain of thought* is refused
  as an extraction request. The wording that works: "Summarise the approach
  you took, the alternatives you considered, and why you rejected them."
- **Why a merge commit keeps evidence.** After a merge commit the original sha
  is still in the default branch's history, so evidence bound to it stays
  live; a squash or rebase-merge leaves nothing there for it to bind to.

- **Naming `report_evidence`.** An agent whose brief listed `begin_session`,
  `end_session` and the commit trailer — but not `report_evidence` — shipped
  four requirements with a green suite and left every acceptance check
  Pending. It followed the letter of the task list over the standing
  instruction to prove rather than declare, which it had read. One
  `verify_queue` call before handoff would have caught all four at once.
- **Asking for the failed attempt.** Agents report what proved a check and
  nothing about the attempt that was rejected, because every surface they read
  is oriented to proof. Three answers for an agent that hesitates, because all
  three get asked:
  - *It loses nothing.* A failed row is superseded the moment the fix is
    reported, and the superseded row is exactly what makes the iteration
    countable.
  - *It is not a confession.* "Does a thin spec cost more iterations" is
    unanswerable while the numerator is zero.
  - *Reconstructing it at the close does not work.* By then the agent is
    writing a summary, not remembering which attempt was rejected, and a
    failure recovered from memory is a guess in the shape of data.
- **Reading the discussion.** Half a fleet in one session was told to read the
  discussion and half was not, purely by drift.
- **Background test runs.** Three lanes in one session started a background
  run, wrote "I'll wait for the notification", and stopped — fix written, no
  evidence, no PR.
- **Pushing on every commit.** A lane cut off by a usage limit, a crash or a
  wedged test leaves its work pushed with its trailers intact, and you can open
  the PR from the branch; one left local-only is a worktree you have to go and
  find.
- **Test selection.** A fleet serialising through a whole-suite lock spends its
  wall clock waiting rather than finishing.
- **Tests outside the lane's own files.** Two lanes each passed every test
  they ran, and the full suite on the merged tree then failed five tests in
  files neither had run: three counted the tool list or checked its help page,
  which every new tool changes. Where a coverage listing answers "everything"
  (anything near the database), search the tests for each symbol changed.

## Requirements for readers who did not write them

A release scope screen is nothing but titles, and whoever is scanning it is
usually not whoever wrote any of them. Forty rows naming enum values and
internal identifiers are accurate, buildable and unreadable. Rule 3 is the one
that gets dropped: flatten a precise statement about a specific wrong value
into "it is sometimes wrong" and every fact that made it buildable is gone.

`create_requirement` never refuses because nobody mid-report should be stopped
by a style argument; the override is recorded so "somebody was asked and said
no" stays distinguishable from "nobody was asked". A schema version, a
call-site count, "nothing covers this" — true when written, false a week
later — is why the CHECKED AT stamp exists.

## Filing and the gate

A filed card looks finished — body, checks, priority, release — and the first
lane dispatched against it stops at `begin_session` having done nothing.
`get_requirement` prints the same answer as `check_build_gate` on its "Open to
agents" line. Process steps that wait for a session were added by REQ-1787.

## Process steps waiting for a session

Check the run's requirement with `check_build_gate` before dispatching. A
send-back or a person's "Run this step again" makes a new attempt that waits
again; dispatch a fresh lane for it.

A process's own definition is a draft an agent prepares and a person
publishes: `draft_process_version` writes nothing unless the result passes
the checks Publish runs, and there is no publish tool.

## Territory, models and worktrees

- An agent that knows a neighbour is in the same file keeps its edits tight
  and expects to rebase; one that does not will sprawl.
- Renumbering a migration before rebasing resolves the same conflict twice.
- The test for dropping to a cheaper model is not how hard the work is but
  whether a wrong delivery would be visible. A cheaper model builds what you
  asked for, including a wrong spec.
- An orchestrator committed mid-run inside a lane's worktree and carried an
  injected test defect straight into the default branch.
- On one occasion three of four agents had finished and the fourth was
  mid-rebase with staged, uncommitted work.
- `who_is_editing` presence tracks the most recent write, so it is not evidence
  that a session is open.

## Reading reports

- One grep turned a vague reliability complaint from an agent into a filed
  defect with a cause.
- Across one twelve-requirement tranche every spec error found was an
  *absence*, eight for eight — not one was an agent ignoring a clear
  instruction. A brief that asks only "what did the spec get wrong" reports the
  opposite, because agents answering it describe what was written rather than
  what was missing. An unbounded "what is missing?" returns a wishlist.
- An agent that predicted three failures and got two had found an inert
  assertion: a test passing because its fixture could not discriminate.
- Asking for the artefact rather than the trace gets a rationale, a decision
  and a list of rejected options — all things an agent writes down anyway, and
  all things `report_evidence`, the decision register and `propose_workstreams`
  already store. Relay reports in the same terms: an agent's *rationale*, never
  its *reasoning trace*. The evidence-not-instructions rule is REQ-2014.

## Merging

Across one eight-PR batch, 21 checks on six requirements stayed live at their
original shas after `--merge`; under squash every one would have been lost.
Merging with `--merge` is a workaround, not the fix: evidence should follow a
rewritten sha, and until it does you are one convention slip from losing it.

Inside an open session, `guard-commit-trailer.js` refuses `gh pr merge
--squash` and `--rebase`, giving this reason; it also refuses a commit whose
trailer git cannot parse, such as one with a blank line above
`Co-Authored-By`.

## Amending a live requirement

`get_workstream_plan` pins nothing, and the one call that does pin a plan
version also claims requirements your lane is not building, so a plan is not
how a lane hears. The change itself is delivered (REQ-2020): each lane's next
tool reply opens with one block per change, fenced as evidence, then cleared.
It is computed from the card against what the lane saw at `begin_session`, so
edits made from the app arrive the same way as edits made over MCP. A lane
that asks for the card again sees the new text anyway; the block is for the
lane that does not. Changes made before this shipped are not replayed.

## Releases

- **Write release notes only once scope is settled.**
- **A version's number is its identity**: no MCP tool renames one.
- A full run on the ship tree fails locally in minutes rather than partway
  through a signed installer build.
- Release notes are the record, and correcting them is harder than writing
  them late.
- An abandoned draft blocks every release above it until somebody deals with
  it.
- `release_retrospective` groups work sent back, checks that failed, defects by
  why they happened and why nothing caught them, and false CHECKED AT claims,
  and reads how the estimates held as a share of sessions above the typical
  range against the quarter that is expected (a lesson comes from it only when
  it is clearly higher). Every card in a group is recorded as a source of the
  lesson proposed from it.

## Moved out of SKILL.md

- Why the failed attempt is asked for in the brief: first-pass rate and rework are derived from failed rows and nothing else. With none on record a board reports 100% on every slice, and *perfect* renders identically to *never recorded*.
- Schema and migration work collides hardest, because two branches both take the next version number.
- A process step routed to "A developer's session" launches nothing and waits until a session picks it up.

## Briefs, filing, review and release checks

- **`lane-brief.md` and `review-brief.md`.** A brief that lives in one
  session's notes is gone when the session is, so the order a lane works in and
  what a reviewer checks ship beside the skill. Add what is true only of your
  repository at the foot of each.
- **Generated files are not in a worktree.** `AGENTS.md` and the `.ai/`
  playbooks are written by the scaffold and ignored by git, so a lane working
  in a worktree sees neither unless it is told to read them from the primary
  checkout.
- **Does the concept already exist?** A card that adds a field, a list or a
  setting a person can already reach under another name makes people enter the
  same thing twice, and the two copies then disagree. Look before filing; if it
  is there, extend it.
- **A green run on main must move the board.** A run can be green and answer
  about a tree nobody asked about, or name tests no claim resolves to. If
  nothing on the board changed afterwards, the run proved nothing the board
  can show.
- **Built cards against the main branch.** A card reads Built when its checks
  are backed, whether or not the code reached main. Compare the two lists
  before baselining.
- **Evidence claims.** A claim that names a renamed test, or a check that was
  replaced and so has a new id, turns into "the suite was green" without a
  sound. Resolve every claim against the tests and the board before a release.
- **A stuck state is a question.** A check that will not move or a card that
  will not leave a state is often stale bookkeeping or work that already
  landed. Reporting it as a fact sends someone to fix the wrong thing.
- **What a reviewer checks beyond the code.** A card's claims about the product
  are written from memory and decay; wording added for one screen is read on
  others; a new concept next to an old one splits the product's vocabulary; a
  state with no way out is found by the first person who reaches it.

## Explanation cut from SKILL.md to fit its ceiling

Explanation that was cut from `SKILL.md` to make room, with every rule it
explained still stated there:

- `begin_session` refuses, so it shapes a plan; the tool descriptions say the
  rest plainly and are still not enough without the brief.
- Passing only `requirement_ids` gives a session id and nothing else.
- The discussion also holds superseded vocabulary.
- Work in progress labels each run Lane tests, Merge check or Your run from
  the purpose the run wrote.
- Passing `orchestrator_session_id` records the lane as Agentic
  (Developer-orchestrated) and links it to you.
- `begin_session(workstream:)` starts work nobody is doing.
- `AGENTS.md` holds the commit-trailer rule; the hook only names what is wrong.
- Agents collide on files, not on subject matter.
- The second of the three questions is the one most often left out; the
  questions are bounded to what the agent ran into rather than what it can
  imagine.
- A squash gives the branch a brand-new sha; a rebase-merge loses the evidence
  the same way.
- `release_retrospective` suggests a lesson for the biggest group.
- A process step's brief lists the run, the step, the run's requirement and the
  step run id.
- A verify call is made while the agent can still act on what it finds.
