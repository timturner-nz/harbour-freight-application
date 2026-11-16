// End the Meridian change session when the working session ends (REQ-122).
//
// WHY THIS EXISTS. A `change_sessions` row is opened by `begin_session` and
// closed by `end_session`, and `end_session` was called by the agent, from
// memory, at the end of a task. Nothing else in the system could close one:
// the fleet bridge writes its row with an end time already set, and the git
// reconciler synthesises derived rows with the last commit's date — so every
// open row in every workspace came from an MCP `begin_session`, and the only
// thing that was ever going to close it was an agent remembering to.
//
// Documentation was not the gap. The `meridian-session` skill says "End the
// session even when the task failed or was abandoned", and `begin_session`
// repeats it in the first sentence of its reply. The gap is that a working
// session ends when the process exits, is `/clear`ed, or is killed, and none
// of those run a tool call. The agent is simply gone, mid-turn, with an open
// row behind it. Measured on a live board: 10 things underway, 9 of them open
// for days, every one an agent session nobody ended.
//
// So this is the mechanism, not the reminder. It fires on `SessionEnd`, which
// is the moment the harness knows about and the agent does not.
//
// A SUBAGENT NEVER REACHES `SessionEnd` (REQ-235). An agent dispatched through
// the Agent/Task tool runs *inside* a session that keeps going, so it finishes
// with no process exit anywhere — the doc above is right that the agent is
// gone mid-turn, and wrong that a process exit is what that looks like. For an
// orchestrated fleet that is the common case, not the crash case: every agent
// leaked a row, and the reaper settled each one three days later as
// *abandoned*, which is the wrong fact about a session that ended cleanly at a
// known commit.
//
// The event that does fire is `SubagentStop`, and the two arms below are NOT
// interchangeable about which transcript they may read:
//
//   - `SessionEnd` may read `transcript_path` — this session's own — and, as a
//     backstop, every subagent transcript beneath it, because a session that
//     has ended has no live children by construction.
//   - `SubagentStop` may read `agent_transcript_path` — the SUBAGENT's own —
//     and NOTHING ELSE. `transcript_path` on that event is the PARENT's, and
//     the parent is still running along with every sibling agent. Closing what
//     is written there would end live sessions on a still-working fleet, which
//     is the one failure this must never cause.
//
// Measured on this machine, 2026-09-01, against a real orchestrator run: a
// 31MB parent transcript held zero `{session_id: …}` matches and zero
// `isSidechain` entries, while each subagent's own transcript at
// `~/.claude/projects/<project>/<session>/subagents/agent-<agent_id>.jsonl`
// held exactly the id its `begin_session` returned. So the parent transcript
// is not merely the wrong file to read, it is an empty one — the subagent's
// own is the only place the id exists.
//
// WHAT IT DOES NOT COVER, and why the app still sweeps. `SessionEnd` runs on
// an orderly exit. It does not run when the process is SIGKILLed, when the
// laptop lid closes on it, when the container is torn down, or when the agent
// never had this hook installed at all. Those are the cases
// `lib/features/wip/session_reaper.dart` settles as *abandoned*, three days
// later, with no end time. The split is deliberate and the two halves are not
// interchangeable:
//
//   - here, the session really has just ended, so `end_session` stamps a real
//     end time and the duration is true;
//   - there, nobody knows when it stopped, so nothing is stamped and the row
//     carries no duration at all.
//
// FINDING THE SESSION ID. Nothing persists it — `begin_session` returns it in
// a tool result and the agent is expected to hold it in context. The result
// text has a stable, machine-findable shape:
//
//     Session started  {session_id: 4f1c…}. Report produced commits with …
//
// so the transcript is the record, and it is on disk at `transcript_path`
// (or, for a subagent, `agent_transcript_path`). This scans for every id in
// that shape and ends each one. `end_session` is idempotent — it answers "was
// already ended" and writes nothing — so ending one the agent already closed
// costs one HTTP call and changes nothing.
//
// IT ALSO REPORTS WHAT A REVIEW COST (REQ-800), and the reason that lives
// here rather than in its own hook is the transcript rule above. A review has
// no commit, so `report-commit-tokens.js` -- keyed on a commit sha -- has
// nothing to hang a row on, and the only event that marks a review's end is
// the same `SubagentStop` this file already handles. Duplicating
// `transcriptsFor` into a second hook would be duplicating the one safety
// property in the file, and the failure mode of getting it wrong is closing
// or mis-costing a live fleet's work.
//
// The requirement that asked for this doubted a hook could fire at all --
// "a review ends when a subagent returns to its orchestrator, which is an
// event in the agent runtime and not in this repository's tooling". That is
// true of the runtime and false of the conclusion: the runtime fires
// `SubagentStop`, this repo already subscribes to it, and the subagent's own
// transcript carries the same `usage` records `report-commit-tokens.js` sums.
// Measured on this machine 2026-09-15: 587 subagent transcripts present, the
// newest carrying 114 usage records and the `{session_id: ...}` its
// `begin_session` printed.
//
// ONE REVIEW PER TRANSCRIPT, OR NOTHING. Usage is summed per FILE and
// attributed to the single review id found in that file. A transcript naming
// two reviews cannot be apportioned truthfully -- there is no marker in the
// stream saying where one ended -- so nothing is reported and the columns
// stay NULL, which is the row's way of saying *nobody measured this*. That is
// a different fact from zero, which would say *it cost nothing*, and the
// cheap thing here would have been to divide and never say so.
//
// FAILS OPEN, ALWAYS. Exit 0 whatever happens. A hook that can make ending a
// session fail is worse than a session left open, which is the very thing the
// app-side sweep exists to tidy.
//
// FAILS CLOSED ON *WHICH FILE*, though, and that asymmetry is deliberate. When
// a `SubagentStop` cannot say which transcript belongs to the subagent, this
// closes nothing at all rather than falling back to the parent's. Failing open
// costs a row the reaper tidies; guessing the file costs somebody's live
// session, and the two are not the same size of mistake.

'use strict';

const fs = require('fs');
const path = require('path');
const {readConfig, callTool} = require(path.join(__dirname, 'meridian-mcp.js'));

function die() {
  process.exit(0);
}

// `{session_id: <uuid>}` as `begin_session` prints it. Anchored on the braces
// and the key so it cannot match a bare uuid appearing anywhere else in a
// transcript — of which there are many, since every Meridian id is one.
const SESSION_ID = /\{session_id:\s*([0-9a-fA-F-]{36})\}/g;

// `{review_id: <uuid>}` as `begin_review` prints it. Anchored the same way and
// for the same reason.
const REVIEW_ID = /\{review_id:\s*([0-9a-fA-F-]{36})\}/g;

/**
 * Every Meridian session id the transcript mentions, oldest first.
 *
 * Reads the raw file rather than parsing JSONL line by line. The id is inside
 * a tool result's text and the exact envelope has changed shape between Claude
 * Code versions; the printed sentence has not. A regex over the whole file is
 * the version-independent read, and the anchored pattern above is what keeps
 * it from over-matching.
 */
function sessionIdsIn(transcriptPath) {
  return idsIn(transcriptPath, SESSION_ID);
}

/**
 * Every id of one printed shape the transcript mentions, oldest first.
 *
 * `lastIndex` is reset before each scan: these regexes carry `/g`, which makes
 * `exec` stateful across calls, and two scans of two files would otherwise
 * start the second wherever the first happened to stop. Nothing would report
 * an error -- the second file would simply come back short, which on a cost
 * hook reads as a review that cost nothing.
 */
function idsIn(transcriptPath, pattern) {
  let text;
  try {
    text = fs.readFileSync(transcriptPath, 'utf8');
  } catch (_) {
    return [];
  }
  const seen = new Set();
  const out = [];
  pattern.lastIndex = 0;
  let m;
  while ((m = pattern.exec(text)) !== null) {
    const id = m[1].toLowerCase();
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/**
 * The four token columns, summed over one transcript, or `null` when the file
 * holds nothing to sum.
 *
 * Every assistant message carries its own `usage` and each was billed
 * separately, so summing them is the real total rather than double counting.
 * Same fold as `report-commit-tokens.js`'s `sumUsage`, deliberately kept
 * identical in shape: if the two ever disagree, a review's cost stops being
 * comparable with a build lane's, which is the whole point of measuring it.
 *
 * `null` for an empty file is a distinct signal the caller must not launder
 * into zero -- see its use in `reportReviewCosts`.
 */
function sumUsage(transcriptPath) {
  let raw;
  try {
    raw = fs.readFileSync(transcriptPath, 'utf8');
  } catch (_) {
    return null;
  }
  if (raw.trim() === '') return null;
  const totals = {output: 0, cacheCreation: 0, cacheRead: 0, input: 0};
  // Whether any `usage` record was SEEN, which is the real question. Guarding
  // on the file being empty was the weaker check and was stated more strongly
  // than it was enforced: a non-empty transcript holding no usage records at
  // all — a session that only ran tools, a format this code cannot read —
  // folded to four zeroes and reported them as a measurement of nothing spent.
  let seen = false;
  for (const line of raw.split(/\r?\n/)) {
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch (_) {
      continue; // a half-flushed final line is normal, not an error
    }
    const u = entry.message && entry.message.usage;
    if (!u) continue;
    seen = true;
    totals.output += u.output_tokens || 0;
    totals.cacheCreation += u.cache_creation_input_tokens || 0;
    totals.cacheRead += u.cache_read_input_tokens || 0;
    totals.input += u.input_tokens || 0;
  }
  return seen ? totals : null;
}

/**
 * Where a session's subagent transcripts live, given that session's own.
 *
 * `~/.claude/projects/<project>/<session>.jsonl` sits beside a directory of
 * the same name holding `subagents/agent-<agent_id>.jsonl`. Derived from the
 * transcript path rather than from the project slug: the slug is a mangled
 * `cwd`, and under a git worktree the agent's `cwd` is NOT the directory the
 * slug was built from — so reconstructing it is a guess, where this is exact.
 */
function subagentDir(transcriptPath) {
  const dir = path.dirname(transcriptPath);
  const session = path.basename(transcriptPath, '.jsonl');
  return path.join(dir, session, 'subagents');
}

/**
 * The transcripts this event authorises reading, and nothing besides.
 *
 * Returns `[]` where the answer is not knowable. See the header: on
 * `SubagentStop` the parent's transcript is never an acceptable substitute,
 * because the parent and every sibling are still running.
 */
function transcriptsFor(payload) {
  const parent = payload.transcript_path;

  if (payload.hook_event_name === 'SubagentStop') {
    // The documented field, and the one the harness fills in.
    if (payload.agent_transcript_path) return [payload.agent_transcript_path];
    // Older harnesses send `agent_id` without the path. The layout above is
    // observed rather than promised, so this is a derivation and not a
    // guarantee — but it names one specific subagent's file or nothing, which
    // is the property that matters.
    if (parent && payload.agent_id) {
      return [path.join(subagentDir(parent), `agent-${payload.agent_id}.jsonl`)];
    }
    return [];
  }

  // SessionEnd (and any event that only carries the common fields).
  if (!parent) return [];
  const out = [parent];
  // Backstop for subagents whose `SubagentStop` never ran — an older harness,
  // a hook added after the fleet was dispatched, a crash inside the subagent.
  // Safe precisely here and nowhere else: this session has ended, so it has no
  // live children left to close out from under.
  try {
    const dir = subagentDir(parent);
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith('.jsonl')) out.push(path.join(dir, name));
    }
  } catch (_) {
    // No subagents ran, or the layout moved. Either way the parent's own
    // transcript is still the answer for the parent's own session.
  }
  return out;
}

/**
 * What each review in these transcripts cost — REQ-800.
 *
 * Attributed PER FILE, never pooled. A transcript naming exactly one review
 * is that review's own record of work, so its usage is that review's cost.
 * A transcript naming two cannot be split: nothing in the stream marks where
 * one review ended and the next began, and dividing would produce a figure
 * that reads like a measurement and is an average. Those files are skipped
 * and their reviews' columns stay NULL — *nobody measured this*, which is a
 * different fact from a zero meaning *it cost nothing*.
 *
 * Returns the reports to send, so the dry-run seam can print the decision
 * without calling anything. Which transcript a cost was read from is exactly
 * as invisible from the outside as which one a session was closed from, and
 * for the same reason it is worth being able to see.
 */
function reviewCostsIn(transcripts, reviewerStopped) {
  const out = [];
  for (const transcript of transcripts) {
    const reviews = idsIn(transcript, REVIEW_ID);
    if (reviews.length !== 1) continue;
    const usage = sumUsage(transcript);
    // `null` is "there was nothing to measure", which is not a measurement of
    // zero. See `sumUsage`.
    if (!usage) continue;
    const report = {
      review_id: reviews[0],
      output_tokens: usage.output,
      cache_creation_tokens: usage.cacheCreation,
      cache_read_tokens: usage.cacheRead,
      input_tokens: usage.input,
    };
    // Only a subagent returning to its orchestrator has genuinely stopped.
    // A `SessionEnd` transcript belongs to a session somebody can resume, and
    // asserting "the reviewer is gone" there settles a review as abandoned
    // while its reviewer is at lunch. Cost is still reported either way — it
    // is measured and true whatever happens next; only the inference about
    // the reviewer being gone is withheld.
    if (reviewerStopped) report.reviewer_stopped = true;
    out.push(report);
  }
  return out;
}

async function main() {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch (_) {
    return die();
  }

  const transcripts = transcriptsFor(payload);
  const seen = new Set();
  const ids = [];
  for (const transcript of transcripts) {
    for (const id of sessionIdsIn(transcript)) {
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  }
  const reviewCosts = reviewCostsIn(
      transcripts, payload.hook_event_name === 'SubagentStop');

  // A test seam, and the reason one exists: which file this hook decided to
  // read is the whole safety property, and it is invisible from the outside —
  // a hook that read the parent's transcript on a `SubagentStop` and closed a
  // live fleet's sessions would exit 0 and print nothing, exactly like a
  // correct one. Prints the decision and calls nothing.
  if (process.env.MERIDIAN_HOOK_DRY_RUN) {
    process.stdout.write(JSON.stringify({ids, reviewCosts}) + '\n');
    return die();
  }

  if (ids.length === 0 && reviewCosts.length === 0) return die();

  const cfg = readConfig('close-meridian-session');
  // Meridian has never run on this machine. Nothing to tell, and the app-side
  // sweep will settle the row whenever somebody does open the workspace.
  if (!cfg) return die();

  for (const id of ids) {
    // `session_id` only. The commit list is deliberately not reported from
    // here: the agent's own `end_session` passes `git rev-list <base>..HEAD`,
    // and this hook does not know the base sha — guessing one would attribute
    // somebody else's commits to this session, which is worse than attributing
    // none. Trailers already carry the attribution that matters.
    await callTool(cfg, 'end_session', {session_id: id});
    // REQ-1410: which standing context topics this session's commits
    // probably made stale, raised automatically so it does not depend on the
    // agent remembering to ask — the same reasoning this whole hook exists
    // for. Raises only; nothing here writes a context document. Degrades
    // quietly like every other call in this file: `callTool` already returns
    // without throwing when the server cannot be reached.
    await callTool(cfg, 'raise_context_suggestions', {session_id: id});
  }

  // Four columns, never a total. `report_review_usage` overwrites the row for
  // the review id, so a redelivery cannot double a cost — the same "set,
  // never add" contract `report_commit_usage` holds, and for the same reason:
  // this recomputes from the whole transcript every time it runs.
  //
  // It also settles a review whose reviewer stopped without calling
  // `end_review`. That is the honest reading of a stopped subagent with no
  // verdict, and it is why the cost report is the right place for it: this
  // hook is the only thing in the system that knows the reviewer is gone.
  for (const report of reviewCosts) {
    await callTool(cfg, 'report_review_usage', report);
  }
  return die();
}

main().catch(die);
