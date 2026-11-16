# meridian-delivery: the reasons behind the rules

`SKILL.md` states each rule. This file keeps the reasons and the longer
explanations. Open it when a rule seems not to apply to you.

## Status

- `verified` is not something an agent sets and never will be: an agent's
  report grades `agentClaimed` whatever kind of evidence it names, so it cannot
  be what settles verification.
- The board's value is that it is true *now*. Time-in-status analytics depend
  on transitions being recorded when they happen: cycle time is counted from
  the first `in_progress` event, so a requirement that jumps from `pending` to
  `built` reports no cycle time rather than a short one.
- `begin_session` deliberately leaves a deferred requirement where it is and
  tells you, because un-deferring is a scope decision.

## Decisions

- The rationale is the whole point of a decision record; a decision without
  its "why" cannot be weighed when somebody wants to reverse it.
- `supersede_decision` records a new linked entry, so the register shows how
  many times a call has changed. Any decision id in the thread links to the
  current head automatically.
- A decision on a business requirement shows next to the decisions on the
  build requirements that answer it. Pass its reference (or `SRC-n`, or its
  id) as `target_id`, and add `list` when two lists hold the same reference
  (the refusal names them). It then shows under "Decided along the way" on
  that business requirement's page.

## The architecture map

- A contract with no endpoints is a label on a line.
- Going live freezes the endpoint set as the record of what was agreed.
- `add_contract_version` carries the endpoint links and the spec pointer
  forward, so a version that only re-words something needs no spec arguments.
  The spec fields are version-level, which is why `update_contract` does not
  take them.
- Use `repair_contract_spec` when `get_contract` shows a pointer on an older
  version but not the current one; use `add_contract_version` when the spec has
  genuinely changed.
- `create_contract_doc` takes an optional `body`, or lays down a template to
  fill in. The contract document is what the two sides promise, as against the
  wire shape in the spec file.
- **Safe to run more than once.** A repeat `create_dependency`,
  `create_endpoint` or `link_endpoint` returns the existing row instead of
  duplicating it, so a re-run converges rather than littering the canvas. An
  invalid type is the guard working, not a bug; the Dart spelling is accepted
  but snake_case is what is stored and shown. Two edges joining the same pair,
  or a node name that matches twice, comes back with the candidates and their
  ids.
- `get_contract` says when Meridian cannot tell whether a spec moved: a branch
  ref, no ref, or no clone on this computer.

## Third-party producers

An edge to something nobody here builds — a payment provider, an identity
service, a partner API — records the same way, except there is no producer
repo to point `spec_path` at. `spec_path` is genuinely read from disk (the
checks service loads the spec body from it), so a URL does not fail loudly: it
resolves to nothing and the contract quietly loses its spec. `spec_ref`, a git
ref, is meaningless for a web page too. `spec_producer` exists for exactly the
vendored case: it stores which side's repo holds the file rather than assuming
the producer's. A contract with no spec file is still worth having; coverage
grading reports it honestly.

The reason to vendor rather than link: a copy in the repo **diffs**. Re-fetch
it and you can see that a third party changed something; a link tells you
nothing until it has already broken you. Reading a vendor's published
documentation is fine — you are recording *their* stated interface, not an
architecture you inferred — and the "ask first" rule still applies to the
write.

## Nodes and layers

Each layer is offered only some categories of the tech standard, so the same
technology is refused or accepted depending on the node's layer with nothing
else changed. Changing a node's layer re-checks the stored technology and warns
if it no longer fits. Never write an `infra_hint` to see what the tool accepts:
it cannot be cleared afterwards.

## Proposing repositories

Neither an ecosystem nor a repository can be created over MCP. Give
`propose_repositories` each clone's origin, a name, why it belongs and, when
you know it, its application. It stages one proposal on the Proposals screen,
and a person who can add repositories approves the ones they want together.
Don't ask a person to add each one by hand instead. An entry already in this
ecosystem, in another ecosystem, waiting in a pending proposal, or dismissed
before is not staged, and the reply says which and why. `get_proposal` shows
each entry's outcome and the reason it was dismissed.

## Context documents at the root

With several repositories and no docs repository set, the reply names the
document's title where a file path would be, which is easy to read as success.

## Notebooks

Approving a proposal records its sources, so the business requirement can say
where it came from. `add_to_notebook` is for something a person gave you, such
as a meeting summary you wrote for them.

## Building a capability map

A capability map says what the business does, as a tree: a domain such as
`Sales`, with `Plan Campaigns` and `Sell Ad Space` beneath it. A house builder's
map has the same shape (`Land and Sites` with `Assess a Site` under it).

- **List before you add.** `list_capabilities` shows the tree. `search` also
  matches the other names a capability is known by, so "Campaign desk" finds
  `Plan Campaigns`. A name that is already there is found, not created twice.
- **A sheet becomes a tree with `import_capability_tree`.** Pass the CSV text
  and read the preview: how the headers were read, what would be created, what
  is already there, what was skipped and why. It writes nothing until you call
  it again with `apply: true`, which needs `manageArchitecture`. It uses the
  same parser and executor as the Import button, so rows arrive unconfirmed.
  Do not retype a sheet into many `create_capability` calls.
- **One capability at a time is `create_capability`**, once a person has
  accepted it. There is no tool that drafts a tree from nothing and writes it.
- **Other names:** `edit_capability_other_names` adds and removes the names you
  give and leaves the rest. `update_capability` replaces the whole list. To
  move a capability, `update_capability` with `parent` (or `make_top_level`).
- **Propose tiers; do not confirm them.** A tier you set or import arrives
  proposed. Confirming a tier is refused over MCP: its owner or an admin
  confirms it in the app. Say why you think a capability is Differentiating,
  Core or Standard in `tier_rationale`, and leave the decision to them.

## Answering "we need a new X" with an application brief

"We need a new CRM" names a solution. Answer it with an **application brief**
before any business requirement: what the new application has to do and the
data it has to fit, assembled by Meridian from the business capabilities and
the organisational data model, with no model involved.

1. Read `list_application_briefs`. If there is one for this application, read
   it with `get_application_brief` and work from that.
2. Otherwise ask which business capabilities it is meant to support, or which
   value stream or subject area it serves, and start one with `create_application_brief`
   (`capabilities` by code or name; `value_stream`, from which Meridian
   proposes the capabilities its business processes use; or `subject_area`,
   from which it proposes the capabilities that use its entities). Never pick
   capabilities the person did not name or agree to.
3. Show the person what it says, the gaps first: capabilities with no tier,
   entities with no definition, steward or system of record, business
   processes not written down. Each tier says what it asks (how to source it,
   the target maturity, the proof). Each entity says whether the new
   application would be its system of record, must read it from another
   application (an integration need), or needs somebody to decide. Settle the
   gaps with the person before anyone relies on the brief.
4. When they agree it, `propose_brief_business_requirements` stages one
   business requirement per capability and per data need. Nothing is saved
   until a person approves each on the Proposals screen, and the initiative
   named for the application is made then. You never approve one.

When the records change, `save_application_brief` saves the next version and
says what changed since the last.

## People

`list_people` resolves a name to a user account.

**A person you name must be somebody Meridian already knows.** Every argument
that names a person (`resolver_label`, an intake `reporter`, a credential's
`holder_label`, an assignee or owner) takes an account, a stakeholder or a
contact, by id or email, never by name (REQ-2207): two people can share a
name. A name is refused with the people it might mean, each with id and
email, even when only one matches, and nothing is recorded. A name sent to
any other tool never adds anybody.

**Somebody not in the workspace yet: add them with `add_stakeholder`**, rather
than stopping to ask a person to. It adds a stakeholder, or with `as: contact`
a contact at an organisation, and never creates a login, an invitation or a
permission. A name somebody already holds is refused, listing each of them
with email, organisation and id: **use the returned match** by its id and do
not add a duplicate. Only if you mean somebody else, call again with
`someone_new: true` and an email or organisation that tells the two apart.
Never add your own agent, lane, model or session name: a name made only of
model or agent words (`OpenAI`, `gpt4o`, `Claude Code`, `Cursor agent`, `lane 3`)
is refused, while a real person who shares a word (`Opus Ng`, `Lois Lane`) is
added. A refusal naming your
role means the person you work for cannot add people: say so.
