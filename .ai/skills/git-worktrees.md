# Git Worktrees

## Purpose

Support parallel coding sessions safely.

## Pattern

- one task per branch
- one branch per worktree
- one AI session per worktree

## Rules

- keep task scope narrow
- avoid concurrent edits to shared files where possible
- use a generated session brief for each worktree
- clean up worktrees when tasks are complete
- `cd` into the worktree explicitly in every shell call

## The trap

The working directory resets between shell calls in an agent session. A
command written without an explicit `cd` silently runs in the main checkout,
not the worktree — it greps the wrong tree, edits the wrong tree, and its
output says nothing about it. Every command that reads or writes files starts
with `cd <worktree>`, however sure you are of where the last one left off.
