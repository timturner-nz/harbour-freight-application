# Branching Strategy

## Default

- one task per branch
- one worktree per active task
- short-lived branches preferred
- open a pull request early when collaboration or visibility is helpful

## Naming

- `feature/<name>`
- `bugfix/<name>`
- `refactor/<name>`
- `chore/<name>`

## Guidance

Keep branch names outcome-oriented rather than ticket-number soup where possible.

The identifier lives in the commit, not the branch name: every commit that
implements tracked work carries a `Meridian-Req: REQ-<n>` trailer. That is what
links the work back, so the branch name is free to describe the outcome. See
`.ai/skills/commit-traceability.md`.
