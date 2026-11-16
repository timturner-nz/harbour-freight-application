# Commit Traceability

## Purpose

Link the code you write back to the work it delivers, so the trail survives
without anyone maintaining it by hand.

Meridian reads two different things out of commit messages. They look similar
and do unrelated jobs, so this file states both once.

## 1. `Meridian-Req:` — what work this commit belongs to

```
feat(auth): validate the refresh token before rotating it

Meridian-Req: REQ-1042
```

A trailer in the commit **body**, in the standard git trailer position (last
paragraph, `Key: value`). Meridian sweeps repo history for these and builds a
provenance record: which commits, from which base, by whom, against which
requirement.

Accepted values, most specific first:

| Value | Example | Notes |
|---|---|---|
| Requirement ref | `REQ-1042` | The everyday one. Visible on every requirement in Meridian; clicking it copies this whole line |
| Full requirement id | `9f2c…` (uuid) | Always works |
| External tracker id | `AB#4417` | For requirements imported from ADO/GitHub |
| Id prefix | `9f2c1d84` | 8+ characters, and only if it matches exactly one requirement |

Several requirements in one commit — one line each, or comma-separated:

```
Meridian-Req: REQ-1042
Meridian-Req: REQ-1043
```

**Ambiguity resolves to nothing.** A prefix matching two requirements attributes
to neither, silently. Prefer the ref.

### Where it sits in the message, and the blank line that voids it

Git parses trailers only in the **last contiguous block** of `Key: value`
lines. Coding agents append a `Co-Authored-By:` line to every commit, so this
is the shape that fails, and it fails silently:

```
Meridian-Req: REQ-1042
                                    <- this blank line voids it
Co-Authored-By: Claude <noreply@anthropic.com>
```

One blank line between `Meridian-Req:` and `Co-Authored-By` voids the trailer,
and nothing warns. Keep them in one block. The message reads correctly
either way — only git's parser can tell — so check before pushing. This prints
the ref, or an empty line:

```
git log -1 --format='%(trailers:key=Meridian-Req)'
```

**Do not repair a merged commit by amending it.** The sha changes, and every
piece of evidence recorded against the old one goes stale — which costs more
than the broken attribution. Fix it forward, in a new commit.

## 2. `Meridian-Phase:` — work with no requirement of its own

A spike, a chore, a refactor inside a workstream:

```
Meridian-Phase: hardening
```

Use the workstream's slug. If the same slug exists on more than one component,
qualify it as `<component-name>/<slug>`.

Prefer `Meridian-Req:` when a requirement exists. The workstream trailer is for work
that genuinely has no requirement, not a shortcut for not looking one up.

## 3. `meridian: <component path> <status>` — a different thing entirely

```
meridian: Platform/Auth Service built
```

This one reports a **component's build status**, not what work a commit
belongs to. It drives a status proposal on the architecture node. Note the
lowercase key and the space-separated value — it is not the same mechanism as
the two above and does not attribute anything to a requirement.

Valid statuses: `not_started`, `in_progress`, `built`, `blocked`,
`agent_tested`, `human_verified`.

You will usually want `Meridian-Req:`. Reach for this one only when the point
of the commit is that a component reached a new state.

## In a pull request

Repeat the refs in the PR body's `## Meridian` section. The commit trailers are
what Meridian actually reads; the PR section is for the humans reviewing it.

**Merge with a merge commit, not a squash or a rebase-merge.** Acceptance-check
evidence binds to the commit it was proved against and survives only while
that sha is in the default branch's history. A squash gives the branch a
brand-new sha, so the trailers are flattened *and* every check recorded against
the original goes stale at the merge, with nothing warning. Set the repository
default to merge commits rather than trusting the flag to be typed.

## Multiple repositories

One trailer set per repo, in that repo's own commits. A requirement spanning
three services gets trailers in all three; Meridian stitches them together.

## What happens if you skip it

Nothing visible. The commit lands, the build passes, and the requirement simply
shows no work against it — so nobody can tell whether it was never started or
was finished last week by someone who didn't stamp a trailer. That silence is
the reason this is worth the one line.
