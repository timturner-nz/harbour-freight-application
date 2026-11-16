# CLAUDE.md

@AGENTS.md

When a `CLAUDE.md` exists, Claude Code reads it and not `AGENTS.md`, so the
import line above is what puts this project's instructions in front of a
Claude Code session. Keep it. Everything else lives in `AGENTS.md` and the
`.ai/` tree it points to; the `meridian-*` skills under `.claude/skills/` say
when to call Meridian's tools, and `meridian-session` is the one to read before
starting work here.

One rule worth repeating even though `AGENTS.md` carries it, because it fails
silently: prove acceptance checks with `report_evidence` rather than declaring
them done, and report the attempt that failed as well as the one that passed.

The commit's `Meridian-Req:` line is checked for you by the
`guard-commit-trailer.js` hook, which says what is wrong; `AGENTS.md` holds the
rule.
