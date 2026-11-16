---
name: meridian-delivery
description: Keep the Meridian board and architecture map honest while you work — move requirement status, raise and resolve blockers, record delivery decisions, register risks, request review, and record integrations and contracts the map is missing. Use when coding work in a Meridian-tracked repo changes the delivery state: work starts or completes, something blocks you, a scope call gets made, you spot a risk, or the architecture view disagrees with the code.
---

# Keep the Meridian board honest

An MCP write here is **indistinguishable from a human doing it in the UI**:
the board re-renders, people are notified. So be deliberate. A refusal is
the signed-in user's role, not a bug: report it and move on.

## Status: reflect reality, don't narrate it

`set_requirement_status` is the kanban drag. Statuses are
`pending | in_progress | built | verified | deferred`.

- When you **start** implementing a requirement → `in_progress`
- When the code is **written and committed** → `built`
- **Do not set `verified` yourself.** Record the proof with `report_evidence`
  (see the `meridian-session` skill) and leave the last step to CI or a person:
  an agent's report grades `agentClaimed` whatever evidence it names.

**The session tools already do the first two** for the requirements they are
given: `begin_session` moves `pending` to `in_progress`, and `report_evidence`
and `end_session` move a requirement to `built` once every check has live
evidence. Use this tool for work picked up after the session started, for a
requirement with no checks (where `add_acceptance_check` is the better
answer), and for a correction.

Move status when the state changes, not at the end as a tidy-up.

Two moves that are **not** yours to make alone:

- **`deferred` → anything.** Un-deferring is a scope decision. Raise it with
  the user rather than moving it so your work has somewhere to land.
- **Backwards from `built` or `verified`.** Say so first — moving it yourself
  discards a verification somebody recorded.

## When you get stuck: raise a blocker

If you cannot proceed and the reason is outside your control, `create_blocker`
against the requirement or node. Pick the `kind` honestly:

| kind | means |
|---|---|
| `decision` | a human needs to make a call |
| `dependency` | waiting on other work in this system |
| `info` | missing information or access |
| `external` | waiting on a third party |

Name a `resolver_user_id` when you can; it notifies them. Name only people
Meridian knows; `add_stakeholder` adds one (reference.md, People).

**A blocker is better than a guess.** An ambiguous spec is a `decision`
blocker: raise it, tell the user, and let them choose.

`resolve_blocker` with `outcome` when it clears: for `decision` blockers the
outcome becomes the decision record, so a bare resolve loses it.

## Decisions: which register, which tool

`record_decision` is for **delivery** decisions that are already settled —
scope, priority, sequencing, ownership. It needs `question` and `decision`
(what was decided *and why*).

`target_type` is `requirement`, `node` or `business_requirement`, the last
for the customer's need itself (reference.md, Decisions, names one).

Three ways to get this wrong:

- **The question is still open** → that's `create_blocker` with `kind=decision`.
- **It's an architecture or design decision** — one that changes code rather
  than scope or dates → write an ADR under `.ai/decisions/` or a Design doc on
  the node.
- **The team reversed an earlier call** → `supersede_decision`, never an edit
  or delete of the original. Pass any decision id in the thread.

## Risks

`create_risk` with `likelihood` × `impact` (each `low|medium|high`) when you
notice something that *might* go wrong but hasn't yet. Add `mitigation` if
you have one; scope to a `node` when localised. `set_risk_status`
— `open | mitigating | materialised | closed`; materialising notifies the
owner, so use it when the thing happened. Register risks you'd mention unprompted, not every hypothetical.

## Review and sprints

`request_review` names a reviewer and notifies them; `decide_review` records
`approved` or `changes_requested` as the signed-in user, never on your own work.
A review that asked for changes stays open until a re-review of the fix commits
only (reviewed commit to fix head) closes it; do not merge before. Reviewing someone else's change yourself: `begin_review` first,
`end_review` last, never `begin_session` (`meridian-orchestration`). Each reviewer has its own `reviewer_identity` and one `transcript_ref` per card set.
**Asked to review a workstream review, call `prepare_review_pack` for it first**: its reviewer judges from the pack.

`add_to_sprint` (an empty `sprint_id` moves to the backlog) is a planning decision — do it on request.

## When the architecture map is wrong

If you have read the code and the map disagrees with it — an integration that
isn't drawn, a contract with no endpoints, a dependency nobody recorded — you
can fix it. **Ask first.** These writes change what the whole team sees on the
canvas. Mapping an integration you were asked about is in scope; mapping a repo
you happened to read is not.

- `create_dependency` — `from` is the **consumer**, `to` the **producer**.
  Types are `requires`, `integrates_with`, `blocked_by`, `produces_data_for`,
  `triggers`, `authorised_by`, `superseded_by`.
- `create_contract` — protocol, auth, SLA, and a `spec_path` to the
  OpenAPI/AsyncAPI/proto file in the producer's repo. Opens a `draft` version.
- `create_endpoint` then `link_endpoint` — name the actual surface, as
  `producer` or `consumer`.
- `link_requirement` — tie the work item to the interface, so both sides see it.
- `set_contract_status` — `draft → agreed → implementing → live → deprecated`,
  one step at a time. **`agreed` is the commitment point**: past it, a change
  is `add_contract_version`, never an edit in place.
- `add_contract_version` — open the next draft, carrying endpoint links and the
  spec pointer forward. It is the **only** place to re-point a spec
  (`spec_path`, `spec_format`, `spec_ref`, `spec_producer`); pass `""` to clear.
- `repair_contract_spec` — restore a spec pointer a bump lost. **Fills blanks
  only**, so it cannot rewrite an agreed shape.
- `create_contract_doc` then `update_contract_doc` — the prose agreement, one
  per edge. Send the whole document to update, never a patch.

Meridian also tells you, in the reply, when a contract is at risk. These are
notes, never refusals, and they are the cue to stop and check:

- **A requirement written on a component other teams rely on.** When
  `create_requirement` or `update_requirement` (a changed `description`) lands
  on a component with an incoming contract at `agreed`, `implementing` or
  `live`, the reply names each consumer and contract version. If your work
  changes what that consumer receives, `link_requirement` the contract and
  agree a new version with its owner before you build.
- **A spec file that has moved since it was agreed.** `get_contract`,
  `get_contract_doc` and a brief's integration lines say "The spec file has
  changed in N commits since vX was agreed". Read the file and the agreement
  before you build against either. `get_contract` also says when Meridian
  cannot tell.
- **`request_autonomy` and a linked contract.** A requirement linked to a
  contract at `agreed` or beyond is treated as touching it whatever
  `touches_agreed_contract` says. The flag can turn the stop on and never off,
  so link first and ask second.

Creates are idempotent (a repeat returns the existing row), the vocabularies
are closed (an invalid type is rejected with the valid list; use the wire
spelling, `integrates_with`), and ambiguity errors with the candidates rather
than guessing: re-call with the id, don't pick one yourself.

### Third-party producers: vendor the spec, don't link to it

**Never put a URL in `spec_path`**: it is read from disk, so a URL resolves to
nothing. Vendor their spec into our repo, set `spec_producer` to *our* node, pin
the version in `spec_ref`, and put their docs URL in `notes`.

### Nodes: a technology is judged against the node's layer

`create_node` and `update_node` check `infra_hint` against the ecosystem's
approved tech standard, **filtered by the node's `layer`**: a technology
approved under Messaging is refused on a Service-layer node and accepted on an
Integration-layer one. The refusal lists what is "Approved here", so it reads
as a gap in the standard; it is often a wrong layer instead.

- **Check the node's layer before asking for the standard to change.**
  `set_tech_standard` is the ecosystem owner's decision, not a way around a
  refused `infra_hint`.
- **Don't re-layer a node just to make a value fit.** Move it only when the
  layer was wrong on its own terms.
- **`infra_hint` cannot be cleared.** An empty value is ignored and the call
  answers `Nothing to change.`, so a value once set can only be replaced.
  Decide the value before you send one.

### Repositories: propose them

Call `propose_repositories`; **nothing is added until a person approves it**.
**Don't propose a dismissed one again.**

### Context documents: set the docs repository before writing at the root

`write_context_doc` writes at the ecosystem root unless you name a `node`. A
root document reaches a file only when a repository resolves for it: the docs
repository (`set_docs_repository`), or the ecosystem's only repository. With
several repositories and none set, the document is
saved in Meridian's database only. Nothing warns; `list_docs` shows it as
`(no file — database only)`. So call `set_docs_repository`
before writing its context documents, not after.

Take `create_snapshot` before a bulk pass. It captures **nodes, not edges**, so
it won't undo the dependencies you create.

## Business requirements from a notebook

People drop meeting notes, transcripts and emails into a notebook, one per
initiative and one for the workspace. When you propose a business requirement
from one:

- Read it with `read_notebook` first (`unused_only: true` lists what nothing
  quotes yet). What the AI data policy keeps from you is left out or masked,
  and the scrap says so. Do not look for it another way.
- **Quote the scrap you took a requirement from; never paraphrase it without a
  source.** Pass each quote in `propose_business_requirement` as `sources`,
  with the scrap's id, copied word for word. A quote that is not word for word
  is refused and nothing is staged.
- You cannot accept your own proposal. A person approves it on the Proposals
  screen.
- `add_to_notebook` keeps something a person gave you. It proposes nothing.

## Building a capability map

`list_capabilities` first, so you do not duplicate. A
sheet goes in with `import_capability_tree`: read the preview, then call again
with `apply: true`. Propose tiers; confirming one is refused over MCP. More in
`reference.md`.

## The default posture

Write when the delivery state changed. A status move that isn't
real, a decision record for something nobody decided, or a risk nobody would
act on make the board *less* trustworthy.

Related skills: `meridian-context` (read the spec before you edit),
`meridian-session` (provenance and evidence). The reasons behind these rules
are in `reference.md`, beside this file.
