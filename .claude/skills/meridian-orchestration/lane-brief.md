# What a lane is told

Give this to every lane you dispatch, with what is true only of your
repository added at the foot: its commands, paths, machine and conventions. The
rules in `SKILL.md` beside it, and in `meridian-session`, apply to the lane as
well; this file is the order a lane does them in.

1. **Make your worktree first, then call `begin_session` before you read
   anything.** Pass `repository_url`, `worktree`, `branch`, `machine`,
   `orchestrator_session_id`, the `requirement_ids`, and `base_sha`: the full
   40 characters of the default branch's head, from `git rev-parse
   origin/<default branch>`. Without `repository_url` the session has no
   repository: Work in progress cannot show your test runs, and your commits
   are recorded unverified. If the reply quotes the URL back as matching
   nothing, say so in your report. Open your own connection to Meridian where
   your client allows, and where each call opens a fresh one, pass your
   `session_id` explicitly to every tool that takes one.
2. **Read the card and everything around it.** `get_requirement`,
   `list_acceptance_checks`, `get_discussion` (corrections, ratified decisions
   and notes from reviews live there, not in the body) and `get_workstream_plan`
   for its workstream. Then check every claim in the card's `CHECKED AT` stamp
   against the code before you build on it. A card is wrong more often than the
   code is. When it is, put that on the card with `record_card_correction` and
   say so in your report, rather than building the wrong thing.
3. **Read `AGENTS.md` and the playbooks under `.ai/`.** Both are generated and
   ignored by git, so your worktree does not hold them: read them from the
   primary checkout of the repository, starting with `AGENTS.md`.
4. **Commit one requirement at a time.** Every commit ends with the two lines
   `Meridian-Req: REQ-n` and your `Co-Authored-By:` line, adjacent, with no
   blank line between them. Check the first parses as a trailer, as `.ai/skills/commit-traceability.md` shows. Push on every commit.
5. **Run the tests that cover your change, never the whole suite.** Also run the
   tests your change can break elsewhere: for each file you changed, the test
   files that reach it, and any test that counts a list you added to. Run them
   in the foreground with a long timeout. Never end your turn waiting on a
   background run: nothing wakes you.
6. **Run the repository's lint or analysis gate and its release-notes check
   before the pull request.** Any warning may block a release.
7. **Attach what a person would see.** When the card changes a screen, render it
   in every state it has, look at the images yourself, and attach them as
   `screenshot` evidence on the card's own check.
8. **Prove each check with `report_evidence`.** Pass the `check_id`, your
   `session_id` (every call, or it is judged against whatever the app has on
   screen and may be refused), the evidence type, the outcome, and as
   `subject_sha` the full 40 characters of `git rev-parse HEAD`, read
   immediately before the call because a hook may amend the commit. A check
   that comes back failing is reported `failed` at that moment, before you fix
   it. Prove any guard you add by reintroduction: name the test you expect to
   fail, break the code, see that test fail, and restore the file from a saved
   copy, never by checking it out, which drops uncommitted work.
9. **Before the pull request, answer a closing checklist** in your report: each
   edge case on the card and each standing rule your brief names, one line each,
   marked met or not met, with where. "Partly" is not met. Fix what is not met,
   or say why you cannot.
10. **Open the pull request against the default branch, and do not merge it.**
   The body says what changed, which tests ran (with counts), and that you did
   not run the whole suite.
11. **Before you hand back, call `verify_queue` with your `session_id`.** It
    lists what you changed that nothing now proves. Fix each, or say why not.
12. **Call `end_session`** with your `session_id`, your full `commit_shas`, and
    `unproven_because` if anything is unproven.
13. **Report back** with the pull request address, the head sha, the test
    counts, and your answers to three questions: what did the card get wrong;
    what did it not cover, that you had to decide yourself; and is there a hole
    in what you delivered that a user would hit. Add anything left undone, and
    why.
