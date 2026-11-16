---
name: meridian-derive
description: Derive Meridian requirements from the business requirements they answer, with the code in view — what to read first, the shape of a finished card, and the edges it must answer. Use when a person asks you to turn business requirements (an imported list, an initiative, a source document) into requirements agents can build, when finishing a skeleton the app's Derive button staged, or when writing any new requirement another agent will build from.
---

# Deriving requirements from business requirements

A **business requirement** says what the business needs, in its own words. A
**requirement** here is the card an agent builds from: it names a component,
says what to build, and carries acceptance checks that prove it was built.
Deriving is writing the second from the first, with the code open.

If the business requirement does not exist yet, work it out with the
person first using `meridian-business-requirement`, then come back here.

**The app's Derive button only stages skeletons.** It cannot see the code, so
what it proposes is a title and a first sentence per business requirement. A
skeleton staged that way is finished the same way as a card you start from
nothing, by the steps below. It is not accepted as it stands.

**A technical initiative has no business requirements to derive from.** An
initiative marked as technical work (a framework upgrade, a refactor,
enabling infrastructure) shows a `Technical work:` line in
`list_initiatives`; its requirements are written on its workstreams directly,
and Derive refuses it rather than asking for a sign-off nobody expects.

The failure this skill prevents: an agent builds exactly the sentence on the
card and misses everything around it. The answers to the edges exist only in
the code and the context around the card, and the one moment somebody is
looking at both is when the card is written.

## A requirement is a pointer into its context

A card is never the whole spec. It points into a context — the business
requirement it answers, the initiative that asked for it, the other
requirements on the same component, the discussion, the contracts on the
component's connections — and the agent that builds it is expected to read
that context. So the card has to name what it answers, and it has to say what
the context does not: the facts about the code that someone had to go and
look up.

## Writing a business requirement

Sometimes the business requirement you need is missing, and you are the one
writing it down with `create_source_requirement`, or fixing its words with
`edit_source_requirement`. Write it the way the check will judge it:

1. **A business requirement states who benefits, the result they get, and
   how you would know it happened.** End it with a "Done when:" sentence
   somebody could check.
2. **Mechanisms belong in the build requirements derived from it**, not in
   the business requirement. How a date is captured, which channel a warning
   goes to, which screen shows it: each of those is a card derived from it.
3. **Two outcomes means two business requirements.** If the done-state needs
   an "and", split it.

The check asks of an outcome: does it state a business result, say who gains,
say how you would tell it was achieved, ask for one thing, and leave out how it
is built (`outcome`, `beneficiary`, `measurable`, `singleConcern`,
`solutionFree`). A constraint and an enabler are judged by their own
questions, so do not invent a beneficiary for a standard. A design (usually a
mockup) must be linked to the outcome it serves with `set_served_outcome`;
unlinked, it reads `needs work (servesOutcome)`. Do not build from a design
until it is linked; ask the person which outcome it is for.

The type is the person's choice. The check is advice that never undoes the
write; its reply ends with a `Business requirement check:` block, read as
`reference.md` describes.

On `needs work`, reword it with `edit_source_requirement`. Pass
`outcome_check_ack: true` only when you mean to file the wording as it
stands: it posts a note naming the unmet questions to the business
requirement's Discussion, and it does not mark the check accepted, which
stays a person's call. `Business requirement check: NOT checked` means no
model answered. That is not a verdict, and `assess_business_requirement`
runs the check once a model can be reached.

**A worked example.** An outcome that opens with a problem and asks for two
mechanisms becomes two business requirements, the mechanisms become build
requirements (in full in `reference.md`):

- **The delivery team hears about every signing certificate and pipeline
  token expiry at least 30 days before it lapses.**
- **No build or release fails because a signing certificate or pipeline
  token expired.**

## Read first

For each business requirement you derive from, read these before writing a
word:

- **The initiative's open items, before anything else.** `list_open_items`
  names what is still being worked through with the client and what each
  holds up. **Derive only from agreed answers.** An item still open goes into
  the derived requirement as an open question, never as a guess at the answer.
- **The business requirement itself: its full wording and its rationale.**
  `list_source_requirements` with `text: true`, or `get_coverage` naming its
  reference, which also shows what already answers it. A title alone loses
  the rationale, and the rationale is where the edges usually are.
- **Its outcome check.** `list_source_requirements` shows the kind, then the
  verdict: `check: outcome, meets`, `check: outcome, needs work (beneficiary)`
  naming what fails, `check: constraint, accepted` when a person kept the
  wording, `check: re-check` when the wording changed since, and nothing when
  unchecked. Read the verdict after the kind. **If it says `needs work`, say
  so to the person before you derive from it**, rather than silently building
  on a feature description. `assess_business_requirement` runs the check
  when there is none; deciding to build anyway is theirs.
- **The initiative's business outcome.** `get_workstream_plan`, or the
  initiative itself (`list_initiatives`). It says why this matters, which
  decides the trade-offs the business requirement does not mention.
- **The other business requirements on the same initiative.** One often
  qualifies another, and two derived cards that each answer half of a shared
  rule contradict each other at the merge.
- **The requirements already on the component, and their acceptance checks.**
  `get_component_context`, then `get_requirement` for the ones that touch the
  same behaviour: it may be partly done already.
- **Whether the concept is already here.** Does what the card adds exist under
  another name, or would a person have to enter the same thing twice? If so,
  extend it and say so on the card.
- **The standards the checks should cite.** `get_context_standards` naming
  the component returns its Security, Data, Quality, Non-functional and
  Glossary context, inherited from above too, and names each topic nobody
  has written as missing. Read Security, Data, Quality, Non-functional and
  Glossary before writing an acceptance check, and write checks that cite
  them where they apply. A skeleton the Derive button staged lists the same
  topics under "Standards this should meet", headings only. **A missing topic is said to the person, not
  skipped**: "No Security context recorded for this component" means a check
  about access has no standard to cite, and they should know that before the
  card is built.
- **What the person checking it is looking for.** `list_validation_checks`
  names QA's checks on the business requirement: read and cover them as
  intent, not a checklist. Accepting a derived proposal links them; trace an
  acceptance check written to cover one with `link_validation_check`, and say
  which nothing covers.
- **The discussion.** `get_discussion` on the initiative and on the related
  requirements.
- **The contracts on the component's connections.** Read both directions:
  what it depends on, and what depends on it. `list_dependencies` lists every
  connection, `get_component_context` shows them with each contract's state,
  and `get_contract` gives the terms. A contract at `agreed` or beyond is a
  commitment to another team, and a card that quietly changes its shape is a
  card nobody can merge. The consumer side is the one that breaks: a skeleton
  the Derive button staged lists the connections and asks, for each consumer
  holding an agreed contract, whether the change affects what it receives.
  Answer that from the code.

Then **read the code the requirement touches**: the screen, the service, the
tool, the table. Everything above tells you what is wanted; only the code tells
you what is there, and a card written without reading it describes a system
that does not exist.

`get_requirement` and the briefs print the business requirement a card answers
on an "Answers business requirement" line, only if you recorded the link below.

## One card is one thing to build

A build requirement carries one outcome; many checks may prove it, but it must
not list several separate deliverables. Five things to build are five cards,
each linked to the business requirement with `set_requirement_coverage`.
Meridian warns when a filed or edited card's text lists several; the warning is
a guess, so acknowledge it with `one_thing_ack: true` when the card is one
outcome. Otherwise split it with `split_requirement` (`propose: true` first,
then `parts`).

## Write the card in this shape

- **A plain-terms opener, marked `**IN PLAIN TERMS.**`**, that says what
  somebody will see or be able to do, and is not the title repeated. The
  person reading a release scope is usually not the person who wrote the card.
- **A body as dense as it needs to be.** Keep the enum value, the tool name,
  the exact wrong behaviour. A plainer card nobody can build from is worse than
  a dense one.
- **A CHECKED AT list.** The facts about the code you looked up — a file that
  exists, a symbol that is read by nothing, a count of call sites — one per
  bullet, under a `**CHECKED AT** <sha> — <date>` stamp, with the sha read from
  `git rev-parse HEAD` and never typed. These facts decay, and the stamp tells
  the lane that builds the card what to re-check first. `draft_checked_at_stamp`
  drafts the stamp. Name symbols rather than line numbers: a line number
  survives no refactor.
- **An Around the edges section**, answered from the code rather than guessed,
  covering the five questions below.
- **At least one acceptance check with a rival half.** A check that only
  proves the sentence on the card passes on work that missed its edges. Add
  the half that fails if the obvious-but-wrong build lands: the second entry
  point, the read-only user, the value already stored. `add_acceptance_check`
  for each; a card with no checks can never be promoted by anything.
  Write the rival half after the words `THE RIVAL:`. The card's fitness
  reading counts a check as naming a rival only when its wording carries
  the word "rival", and otherwise shows that part as missing.
- **The business priority, carried.** A must-have business requirement does
  not become a nice-to-have requirement because the card was written quickly.
- **The coverage link.** `set_requirement_coverage` from the business
  requirement to the card, `partial` when the card answers only part of it.
  Without it the business requirement still reads as unanswered, and the agent
  building the card is never shown what it answers.
- **Placement in an open workstream** on the component the work belongs to,
  with `add_to_workstream`. A card in no workstream is closed to agents, and
  the first one sent to build it stops at `begin_session`.

## Around the edges

Answer each of these from the code, in the card, before anyone builds it. An
answer can be "nothing changes, because…" — what matters is that somebody
looked.

1. **What happens on failure?** The read that throws, the write that is
   refused, the network that is gone. Say what the person sees, not only that
   an error is handled.
2. **What shows when there is nothing yet?** The empty list, the first run, the
   component with no data. The sentence beside an empty state is usually an
   instruction, and it must still make sense.
3. **Who may and may not do this?** Which roles see the control and which do
   not, and what a person who cannot act is told instead of being shown a
   button that does nothing.
4. **What does a stored value the new rule refuses do now?** A new rule
   usually only says what may be chosen from now on. Rows written before it
   still say the refused thing; say whether they are shown, labelled, or
   migrated, because a value a person stored should not vanish from its own
   control.
5. **Which other screens and tools show the same fact?** A count, a status or a
   label usually appears in more than one place — another screen, a report, an
   MCP tool. Name them, or the change lands in one place and the others
   disagree.

## What is in scope

The edges of the assigned requirement are part of it and in scope: what
happens on failure, what shows when there is nothing yet, who may and may not
do this, what a stored value the new rule refuses does now, and which other
screens and tools show the same fact. The five questions above belong to the
card, and the agent building it builds the answers. They are not adjacent
problems.

Other work found on the way is raised as a new requirement, not built: file
it (or propose it to the person you are working with) and carry on with the
card you were given. The line is the card: its edges are inside it, and
everything else is outside it.

## Before you hand the card over

- The opener says what somebody sees, in words the business analyst who wrote
  the business requirement would use.
- Every fact about the code sits under the CHECKED AT stamp, and you grepped
  each one at that sha.
- The five edges are answered, from the code.
- Each check that touches a standard cites it, and any topic
  `get_context_standards` named as missing was said to the person.
- Every Agreed-or-beyond contract on a connection is either untouched or
  named in the card.
- Each acceptance check has a rival half.
- `get_coverage` on the business requirement shows the card.
- Every open item still holding the business requirement up is on the card
  as an open question.
- Nothing it adds already exists under another name.
- The card is in an open workstream.

The worked example in full, and the reasons behind these rules, are in
`reference.md`, beside this file.
