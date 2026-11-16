# What a reviewer is told

Give this to every reviewer you dispatch, naming the pull request, with what is
true only of your repository added at the foot. A reviewer did not write the
change. Its job is to find what is wrong before it merges, not to confirm it.
**It does not edit, commit or push anything on the branch.**

1. **First call, before reading anything: `begin_review`**, once per card the
   change delivers, so Work in progress shows the card under REVIEW. Pass the
   `requirement_id`, `pull_request`, `branch`, `subject_sha` (the full head
   sha), a `reviewer_identity` no other reviewer running now uses, and one
   `transcript_ref` you choose, the same on every card you review. Keep each
   returned `review_id`. **Never call `begin_session`**: a reviewer does not
   claim the card.
2. **Last call: `end_review`** with each `review_id`, a `verdict` (as the tool
   lists them) and a one-line `note`, even when you stop early.
3. **Read before you judge.** The repository's review guidance if it has any,
   each card, its acceptance checks and its discussion (corrections and
   decisions live there, not in the body), and the pull request itself.
4. **Review the change that belongs to the card.** That is the commits whose
   trailer names it: `git log --oneline --no-merges <default branch>..<head>`.
   Merges of the default branch are not under review, except to confirm they
   are clean. When your prompt names a delta, such as the fix commits of an
   earlier review, review only that diff against the earlier findings.
5. **Check the card against the product, not only the change against the card.**
   - Every claim the card or pull request makes about what exists, what
     happens or what is missing: find it in the code or the running product,
     rather than taking the card's word.
   - Every sentence the change adds or leaves on a screen: is it true on every
     screen it appears on, for every role, and in every state, including the
     empty one?
   - A new concept: does it overlap one that already exists under another name,
     or make a person enter the same thing twice?
   - A state someone can get stuck in: is there a way out?
6. **Look hardest at the usual holes.**
   - Every write is gated by permission, and the sentence beside each control
     changes with the gate.
   - What happens to values already stored when a rule starts refusing them.
   - Data loss on delete: a table the change adds must be removed with its
     owner.
   - People are never matched by display name.
   - A guard whose setup never reaches the branch it claims to test.
7. **Run tests only in your own worktree.** Make a worktree of the branch, run
   small selections, never the whole suite. A reintroduction of your own
   choosing, aimed at a check the lane did not break, is the strongest finding
   you can bring. Restore from a saved copy and compare the two. Remove your
   worktree when you are done.
8. **File one follow-up for what you leave for later**, in the workstream and
   release your prompt names, with at least one acceptance check worded so a
   lane's test can prove it, and a rival half. A card filed without a check can
   never reach Built.
9. **Report**, most severe first: each finding with `file:line`, a concrete
   failing scenario, and whether a test proved it or you reasoned it. Then what
   you checked and found sound. Then a verdict: merge as is, merge after named
   fixes, or do not merge. No style nits.
