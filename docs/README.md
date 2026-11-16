# Documentation

Meridian stamped this layout when the architecture was scaffolded. It is where
Meridian resolves a new document to, so a doc filed here is indexed, attached
to the right component, and found by whoever goes looking next. A doc filed
elsewhere is still indexed — it just has to be moved before it can say which
component it belongs to.

Three documents sit at the root, one set per application:

| Path | What it is |
|---|---|
| `docs/spec.md` | What this application does, and what it must satisfy. |
| `docs/phases.md` | The delivery phases in order, linking to each phase plan. |
| `docs/notes.md` | Anything without a home yet. |

Everything else goes in a folder:

| Folder | What lives here | Filename |
|---|---|---|
| `docs/context/` | Standing context to read before planning anything — business background, constraints, processes, glossary. | `{slug}.md` |
| `docs/design/` | Design notes: how one component or decision is meant to work. | `{slug}.md` |
| `docs/phases/` | One plan per delivery phase, indexed by `docs/phases.md`. | `{slug}-plan.md` |
| `docs/plans/` | Working plans that are not tied to a single phase. | `{slug}.md` |
| `docs/retros/` | Retrospectives — what happened, and what changes because of it. | `{YYYY-MM-DD}-{slug}.md` |
| `docs/contracts/` | The agreement between two components: what each end may assume and what it owes. The slug names both ends. | `{slug}.md` |
| `docs/audits/` | Audit reports written by Meridian checks. | `{YYYY-MM-DD}-{slug}.md` |
| `docs/features/` | The same layout again, one level down, for a component beneath the application that owns this repo. | `{feature-slug}/design/{slug}.md` |

`{slug}` is the kebab-cased subject — `docs/design/rate-limiting.md`,
`docs/contracts/portal-to-ledger-api.md`. Dates are ISO, so a folder sorts
chronologically: `docs/retros/2026-08-05-first-release.md`.

For a component *below* the application that owns this repo, the same layout
repeats under `docs/features/{feature-slug}/` — a design note for a component
called "Invoice Export" lands at
`docs/features/invoice-export/design/{slug}.md`.

A folder nobody has used yet holds a `.gitkeep` so it survives a clone. Delete
one if this repo will never need it; Meridian recreates it the next time it has
something to write there.
