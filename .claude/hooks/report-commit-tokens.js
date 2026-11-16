// PostToolUse hook: record what each commit cost, in model tokens.
//
// Fires after every Bash tool call, does nothing unless the command made a
// commit, and then reports the DELTA since the previous commit — cumulative
// usage now, minus the watermark taken then. That delta is what one unit of
// work cost, and Meridian rolls it up through the components the commit's
// files touched (`token_spend`).
//
// WHY A HOOK AND NOT THE AGENT. `end_session` has always taken a `total_tokens`
// the model could volunteer, and models mostly do not know the number and
// mostly do not send it. The transcript's own `usage` records are the only
// place the real figure exists, so a hook that reads them is measured rather
// than self-reported, and arrives whether or not the agent cooperates.
//
// NEVER SUM input + output. Measured on a real 361-message session in this
// repo: input 697, output 279,061, cache creation 3.4M, cache read 77.4M.
// The naive sum reports 0.3% of the volume, because prompt caching re-reads
// context every turn rather than re-sending it. All four go over the wire;
// Meridian attributes on `output` alone, since cache reads track how long the
// conversation had been running rather than the work in the commit.
//
// A DELTA COVERING SEVERAL COMMITS SAYS SO. When more than one commit lands
// between two reports the delta is divided across them, and every row of that
// pass now carries `span_id`, `span_commits` and the UNDIVIDED
// `span_output_tokens`. The division is unchanged — it conserves, and nothing
// in the transcript could give a truer per-commit figure — but a reader can
// now tell a share from a measurement, and can count one delta once even where
// a writer wrote it whole to each commit. Silence was the defect (REQ-323).
//
// SPLIT BY MODEL (REQ-1483). Every transcript `usage` record sits in a message
// that names the model that produced it, and a session can change model
// between commits (Opus for the plan, Sonnet for the edit). The delta is
// therefore computed PER MODEL against a per-model watermark and reported as
// `models`, one entry each, so Meridian stores a row per model and finance can
// split spend by provider and model. The top-level token figures stay the
// commit's whole delta, which is the sum of the entries.
//
// SET, NEVER ADD. This recomputes from the whole transcript every time and
// re-sends on retry, so `report_commit_usage` overwrites the row for
// (repository, sha). A redelivered report must not multiply a commit's cost.
//
// WHICH TREE. The payload carries the command as *typed*, so `git -C "$W"`
// arrives with the variable unexpanded and there is no shell left to ask. That
// silently dropped every worktree commit until 2026-08-06. `findCommitDir`
// resolves what it can, infers from recently-committed worktrees what it
// cannot, and — the part that matters — SAYS SO when it ends up with nothing.
//
// FAILS OPEN, ALWAYS. Meridian may not be running, the token may be absent,
// the repo may be unknown. None of that is worth interrupting a developer for:
// every path exits 0 and stays silent. Silent to the *terminal*, that is: a
// give-up that would otherwise be invisible goes to `last-event.json`, and
// since REQ-2105 to a short queue sent with the next call Meridian answers, so
// the session says why its commit has no cost (see `giveUpFor`).
//
// THE BEARER COMES OUT OF THE OS CREDENTIAL STORE, NOT OUT OF A FILE
// (REQ-701). REQ-516 moved `mcp.token` into Windows Credential Manager, the
// macOS Keychain and libsecret, leaving the marker `@secret-store` where the
// value used to be in `user_preferences.json`. This hook went on reading the
// file, sent the marker as a password, and every call 401ed — silently, into
// a mechanism built to be silent — from 4 September until 10 September, by
// which time ninety reports were queued unsent. See the long note above
// `windowsCredReadScript` in `meridian-mcp.js` (REQ-1552 moved the whole read
// there, so the other three Meridian hooks share it) for how each platform is
// read and why this route was chosen over two others. The guard that matters
// more than the route is in `resolveConfig`: a bearer that is not `mer_mcp_`-shaped is refused BEFORE the
// request, so the next migration to move this secret is caught on the first
// commit rather than after six days.
//
// AND WHEN IT CAN'T REACH THE APP, IT BANKS THE COST IN THE COMMIT — a
// `Meridian-Tokens:` trailer the reconciler picks up on any machine that
// sweeps the repo later. That is the only route open to an agent working where
// Meridian is not running at all, a cloud agent especially. It amends, so it
// refuses on anything published or ambiguous — see `amendWithTrailer`.
//
// AND IT SAYS SO WHEN IT DOES (REQ-689). An amend changes the sha, and until
// 2026-09-09 nothing told the agent that had just read the old one. Five lanes
// in one night filed evidence against a commit that no longer existed, and
// evidence bound to a superseded sha grades STALE SILENTLY: the check goes
// green, quietly stops counting, and the requirement stalls one short of Built
// with no failure anywhere to explain it.
//
// The guards were never the defect, and it is worth writing down which
// hypothesis this disproves. Measured against the reflogs of all five pairs:
// every amend landed 0-1s after its own `commit` entry, on a byte-identical
// tree with the same parent, and every branch carries exactly ONE `update by
// push` — of the AMENDED sha, 8-24s later. No forced update anywhere. Nothing
// published was rewritten, no race with a push occurred, and both guards below
// held. The silence was the whole bug, so `announce` is the whole fix.
//
// AND WHEN THE TRAILER REFUSES TOO, IT SPOOLS (REQ-263). Commit-and-push in
// one command is the shape that defeats both: the app is unreachable, and the
// commit is published so it must not be rewritten. Each guard is right; on
// 2026-09-01 they failed together for an hour and five sessions' figures were
// unrecoverable. The floor under them is `mcp_write_spool.jsonl`, the same
// file the stdio proxy drains on the next call that reaches Meridian.
//
// A SUB-AGENT'S COMMIT IS COSTED FROM THE SUB-AGENT'S OWN FILE (REQ-2610).
// A hook that fires inside a sub-agent is handed the PARENT's `session_id` and
// `transcript_path`, and every record in the sub-agent's own transcript
// (`<session>/subagents/agent-<agent_id>.jsonl`) carries the parent's session
// id too, so neither field says which agent committed. The payload's
// `agent_id`, present only inside a sub-agent, does. Reading the parent's
// transcript instead would charge one commit for everything the orchestrator
// did; the parent's own transcript, on the orchestrating session of 3 November,
// had also grown to 813 MB, past the 512 MB a node string can hold, so the old
// whole-file read threw and the hook exited without a word for two days. See
// `costSource` for which file and which watermark, and `eachLine` for why no
// transcript is ever read whole any more.
//
// EVERY GIVE-UP LEAVES A NOTE. A transcript that cannot be read, is missing,
// is too large to start from, or holds no usage at all, writes
// `last-event.json` and queues a give-up naming the commit, like the others.
//
// SILENT TO THE TERMINAL IS NOT SILENT TO THE USER. A capture that fails says
// so when it happens, via a `systemMessage`, rather than leaving it to be
// inferred from an absence later — a zero meaning "could not measure" must not
// render as a zero meaning "cost nothing". It still exits 0 either way.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const {execFileSync} = require('child_process');
const {
  resolveConfig,
  note: noteFor,
  whyNoCredential,
  prefsFile,
  TOKEN_PREFIX,
  SECRET_SERVICE,
  SECRET_KEY,
} = require(path.join(__dirname, 'meridian-mcp.js'));

// The breadcrumb, with this hook's name on it (REQ-1552).
function note(what, extra) {
  noteFor('report-commit-tokens', what, extra);
}

// Must match `kTokenTrailerKey` in requirement_ref.dart — the reconciler greps
// for this exact spelling, and a divergence would fail silently, days later,
// in someone else's git history.
const TRAILER_KEY = 'Meridian-Tokens';
// How long a rejected credential stays quiet after it has been announced
// once. See `shouldAnnounceRejection` for why it is rate-limited at all.
const REJECTION_QUIET_MS = 60 * 60 * 1000;

function die() {
  // The only exit there is. A token reporter that blocks a commit is worse
  // than no token reporter.
  process.exit(0);
}


/** Where watermarks live: beside the prefs, so they outlive a temp sweep. */
function stateFile(sessionId) {
  const safe = String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(path.dirname(prefsFile()), 'token-hook', `${safe}.json`);
}

function readState(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(stateFile(sessionId), 'utf8'));
  } catch (_) {
    return {output: 0, cacheCreation: 0, cacheRead: 0, input: 0, lastSha: null};
  }
}

const FIELDS = ['output', 'cacheCreation', 'cacheRead', 'input'];

function zeroTotals() {
  return {output: 0, cacheCreation: 0, cacheRead: 0, input: 0};
}

/**
 * What each model has produced since the watermark (REQ-1483), keyed by the
 * model's name, with '' for usage that names none.
 *
 * A watermark written before this existed holds only whole-transcript totals,
 * so it cannot say which model they belonged to. It is shared out in
 * proportion to each model's current totals: exact when one model did all the
 * work, and a fair split otherwise, for the one commit that crosses the
 * upgrade. Never negative, so a transcript that shrank reads as no spend
 * rather than as a refund.
 */
function modelDeltas(totals, state) {
  const out = {};
  for (const [model, t] of Object.entries(totals.byModel)) {
    const delta = zeroTotals();
    for (const f of FIELDS) {
      let base;
      if (state.models) {
        base = (state.models[model] && state.models[model][f]) || 0;
      } else {
        base = totals[f] > 0
            ? Math.floor(((state[f] || 0) * t[f]) / totals[f])
            : 0;
      }
      delta[f] = Math.max(0, t[f] - base);
    }
    out[model] = delta;
  }
  return out;
}

function writeState(sessionId, state) {
  const f = stateFile(sessionId);
  fs.mkdirSync(path.dirname(f), {recursive: true});
  fs.writeFileSync(f, JSON.stringify(state));
}

// A transcript is read in pieces this big, never whole: one orchestrating
// session reached 813 MB, and a node string tops out near 512 MB.
const READ_CHUNK = 8 * 1024 * 1024;
// The most a transcript with no watermark is read from its start. Past this the
// hook has no time to scan it (it is cut off after 15 seconds) and starts from
// the end instead, saying so.
const FULL_READ_CAP =
    Number(process.env.MERIDIAN_HOOK_FULL_READ_CAP) || 256 * 1024 * 1024;

/**
 * Call [onLine] with each complete line of [file] from byte [from], without
 * ever holding more than a chunk and one line in memory. Returns the file's
 * size and `end`: the offset just past the last line delivered, which is where
 * the next read resumes.
 *
 * A final line with no newline is delivered only if it parses as JSON. A
 * half-flushed line is normal, is left unconsumed, and is read whole next time.
 */
function eachLine(file, from, onLine) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const buf = Buffer.allocUnsafe(READ_CHUNK);
    let pos = from;
    let end = from;
    let carry = null;
    while (pos < size) {
      const n = fs.readSync(fd, buf, 0, Math.min(READ_CHUNK, size - pos), pos);
      if (n <= 0) break;
      pos += n;
      const data = carry
          ? Buffer.concat([carry, buf.subarray(0, n)])
          : buf.subarray(0, n);
      let start = 0;
      for (let nl = data.indexOf(10, start); nl !== -1;
          nl = data.indexOf(10, start)) {
        onLine(data.subarray(start, nl));
        start = nl + 1;
      }
      end = pos - (data.length - start);
      carry = start < data.length ? Buffer.from(data.subarray(start)) : null;
    }
    if (carry && carry.length) {
      let whole = false;
      try {
        JSON.parse(carry.toString('utf8'));
        whole = true;
      } catch (_) {
        // half-flushed: left for the next read
      }
      if (whole) {
        onLine(carry);
        end = pos;
      }
    }
    return {size, end};
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Counts usage records, each assistant message once at its LARGEST figure.
 *
 * Every content block of one reply is written as its own line and repeats that
 * message's `usage`, but not equally: the early blocks (thinking, text, before
 * the reply has stopped) carry partial figures and the last carries the final
 * one. Measured 2026-11-05: one message reads 10 and then 1387. Keeping the
 * first block undercounts, summing every block overcounts; per message id the
 * figure that counts is the largest, and the increase over what was already
 * counted is what a later block adds. A record with no id is counted as it is.
 *
 * [seed] is `{id, usage}`, the newest message the previous read counted and
 * the figure it counted, so a reply split across two commits is neither counted
 * twice nor lost.
 */
class UsageCounter {
  constructor(seed) {
    this.byModel = {};
    this.records = 0;
    this.counted = new Map();
    this.lastMessage = null;
    this.lastUsage = null;
    if (seed && seed.id && seed.usage) {
      this.counted.set(seed.id, seed.usage);
      this.lastMessage = seed.id;
      this.lastUsage = seed.usage;
    }
  }

  add(message) {
    const u = message && message.usage;
    if (!u) return;
    const id = typeof message.id === 'string' ? message.id : null;
    const model = typeof message.model === 'string' ? message.model.trim() : '';
    // Claude Code writes a placeholder model name on messages it made up
    // itself; those carry no spend and are not a model anybody served.
    const name = model === '<synthetic>' ? '' : model;
    const fig = {
      output: u.output_tokens || 0,
      cacheCreation: u.cache_creation_input_tokens || 0,
      cacheRead: u.cache_read_input_tokens || 0,
      input: u.input_tokens || 0,
    };
    const prev = id ? this.counted.get(id) : null;
    let inc = fig;
    if (prev) {
      inc = zeroTotals();
      const next = {model: prev.model};
      for (const f of FIELDS) {
        inc[f] = Math.max(0, fig[f] - prev[f]);
        next[f] = Math.max(fig[f], prev[f]);
      }
      this.counted.set(id, next);
    } else {
      this.records++;
      if (id) this.counted.set(id, Object.assign({model: name}, fig));
    }
    if (id) {
      this.lastMessage = id;
      this.lastUsage = this.counted.get(id);
    }
    const per = this.byModel[prev ? prev.model : name] ||
        (this.byModel[prev ? prev.model : name] = zeroTotals());
    for (const f of FIELDS) per[f] += inc[f];
  }

  /** The grand totals across models, with the per-model map beside them. */
  totals() {
    const t = zeroTotals();
    for (const per of Object.values(this.byModel)) {
      for (const f of FIELDS) t[f] += per[f];
    }
    t.byModel = this.byModel;
    return t;
  }
}

/**
 * What [file] holds from byte [from] onward: usage per model, how many usage
 * records that was, the newest Meridian session id printed, and where the
 * read stopped (`end`). See `UsageCounter` for how a message is counted.
 */
function scanUsage(file, from, seed) {
  const counter = new UsageCounter(seed);
  let meridianSession = null;
  const r = eachLine(file, from, (line) => {
    const hasUsage = line.indexOf('"usage"') !== -1;
    const hasSession = line.indexOf('Session started') !== -1;
    // Most lines are neither; they are never decoded.
    if (!hasUsage && !hasSession) return;
    const text = line.toString('utf8');
    if (hasSession) {
      // The newest Meridian session id this transcript printed, for a give-up
      // to name (REQ-2105). Only the id: nothing else of it leaves.
      for (const m of text.matchAll(SESSION_STARTED)) meridianSession = m[1];
    }
    if (!hasUsage) return;
    let entry;
    try {
      entry = JSON.parse(text);
    } catch (_) {
      return; // a half-flushed final line is normal, not an error
    }
    counter.add(entry.message);
  });
  const added = counter.totals();
  added.records = counter.records;
  added.lastMessage = counter.lastMessage;
  added.lastUsage = counter.lastUsage;
  added.meridianSession = meridianSession;
  added.end = r.end;
  added.size = r.size;
  return added;
}

/**
 * Cumulative usage in [file], or a reason there is none to report (REQ-296,
 * REQ-2610).
 *
 * `{empty: true}`: the file has nothing in it. `{tooLarge: true}`: no
 * watermark says where to start and the file is past `FULL_READ_CAP`. Neither
 * carries a number, and the caller must not launder either into a zero: a
 * commit with no row is what the board shows as unmeasured, and a row of zeros
 * would say it cost nothing. A file that cannot be opened throws, for the
 * caller to name.
 *
 * `restart: true` rides on either result for a watermark written before byte
 * offsets existed. Its totals were counted the old way (every block of a reply
 * summed), so subtracting them from a correct count would send a nonsense
 * figure, usually zero. The caller re-baselines from the totals and reports
 * nothing for that commit.
 *
 * With a watermark that says where the last read stopped, only what was
 * written since is read and added to the totals the watermark holds, so a long
 * session costs its new lines at each commit and not its whole length.
 */
function measure(file, state) {
  const size = fs.statSync(file).size;
  if (size === 0) return {empty: true};
  const marked = typeof state.bytes === 'number' && state.bytes >= 0 &&
      !!state.models;
  const restart = !marked && !!state.lastSha;
  const resumable = marked && state.bytes <= size;
  if (!resumable && size > FULL_READ_CAP) return {tooLarge: true, size, restart};
  const seed = resumable && state.lastMessage && state.lastUsage
      ? {id: state.lastMessage, usage: state.lastUsage} : null;
  const added = scanUsage(file, resumable ? state.bytes : 0, seed);
  const totals = zeroTotals();
  totals.byModel = {};
  totals.records = added.records;
  if (resumable) {
    for (const [model, t] of Object.entries(state.models)) {
      const per = totals.byModel[model] = zeroTotals();
      for (const f of FIELDS) {
        per[f] = t[f] || 0;
        totals[f] += per[f];
      }
    }
    totals.records += state.records || 0;
  }
  for (const [model, t] of Object.entries(added.byModel)) {
    const per = totals.byModel[model] || (totals.byModel[model] = zeroTotals());
    for (const f of FIELDS) {
      per[f] += t[f];
      totals[f] += t[f];
    }
  }
  totals.meridianSession = added.meridianSession ||
      (resumable ? state.meridianSession || null : null);
  totals.end = added.end;
  totals.lastMessage = added.lastMessage;
  totals.lastUsage = added.lastUsage;
  return {totals, restart};
}

/** What a watermark holds after a read that ended at [totals]. */
function watermark(totals, lastSha) {
  return {
    output: totals.output,
    cacheCreation: totals.cacheCreation,
    cacheRead: totals.cacheRead,
    input: totals.input,
    models: totals.byModel,
    // Where this read stopped, so the next one starts there (REQ-2610), and
    // the newest message with the figure counted for it.
    bytes: totals.end,
    records: totals.records,
    lastMessage: totals.lastMessage,
    lastUsage: totals.lastUsage,
    meridianSession: totals.meridianSession,
    lastSha,
  };
}

/** Whether a sub-agent beside [transcript] wrote anything in the last 5 minutes. */
function liveAgentBeside(transcript) {
  try {
    const dir = subagentDir(transcript);
    return fs.readdirSync(dir).some((n) =>
        Date.now() - fs.statSync(path.join(dir, n)).mtimeMs < 5 * 60 * 1000);
  } catch (_) {
    return false;
  }
}

// How recently a commit must have been made for this call to claim it. The
// generous window is for the directory the command actually named; the tight
// one is for the scan below, which infers rather than reads, and should only
// ever match a commit made moments ago by this very call.
const FRESH_MS = 10 * 60 * 1000;
const SCAN_FRESH_MS = 2 * 60 * 1000;

/**
 * Turn a path as it appeared in the command into one Node can use, or null if
 * it cannot be trusted.
 *
 * Null for an unexpanded variable — `git -C "$W" commit` reaches this hook as
 * the literal `$W`, because the payload carries the command as *typed* and the
 * expansion happened in a shell we never saw. Null too for a path that simply
 * is not there. Both mean "I don't know where that is", which is a different
 * answer from "here", and the caller must not confuse them.
 */
function resolveTarget(raw, cwd) {
  let target = raw.replace(/^["']|["']$/g, '');
  if (/[$%`]/.test(target)) return null; // $VAR, %VAR%, `cmd` — never expanded
  // A Git Bash path (`/c/Users/…`) looks absolute to Node on Windows and then
  // resolves to a directory that does not exist, so translate it rather than
  // silently dropping every commit made through the Bash tool.
  if (process.platform === 'win32') {
    target = target.replace(/^\/([a-zA-Z])\//, '$1:/');
  }
  const abs = path.isAbsolute(target) ? target : path.resolve(cwd, target);
  try {
    return fs.statSync(abs).isDirectory() ? abs : null;
  } catch (_) {
    return null;
  }
}

/** Every directory the command points at, most specific first. */
function namedTargets(command) {
  const raw = [];
  for (const m of command.matchAll(/\bgit\s+-C\s+("[^"]+"|'[^']+'|\S+)/g)) {
    raw.push(m[1]);
  }
  // `cd <dir> && git commit` is the other common shape, and `payload.cwd` is
  // the directory the shell was in *before* the command ran, so it is wrong in
  // exactly the same way `-C` is.
  for (const m of command.matchAll(/\bcd\s+("[^"]+"|'[^']+'|\S+)/g)) {
    raw.push(m[1]);
  }
  return raw;
}

/** `{sha, ageMs}` for a directory's HEAD, or null if it isn't a readable repo. */
function headOf(dir) {
  try {
    const sha = git(['rev-parse', 'HEAD'], dir);
    const at = Number(git(['log', '-1', '--format=%ct'], dir)) * 1000;
    const ageMs = Date.now() - at;
    return ageMs >= 0 ? {sha, ageMs} : null;
  } catch (_) {
    return null;
  }
}

/**
 * Last resort when the command named a directory we could not resolve: ask git
 * for every worktree of the repo we *are* in, and take the one that just got a
 * commit.
 *
 * This is an inference, so it demands positive evidence and refuses to guess
 * between candidates. Worktrees are this repo's convention, `git -C "$W"` is
 * how agents address them, and without this every such commit is dropped.
 */
function scanWorktrees(cwd, lastSha) {
  let dirs;
  try {
    const out = git(['worktree', 'list', '--porcelain'], cwd);
    dirs = [...out.matchAll(/^worktree (.+)$/gm)].map((m) => m[1].trim());
  } catch (_) {
    return {dir: null, why: `${cwd} is not a git repository`};
  }
  const fresh = dirs
      .map((d) => ({dir: d, head: headOf(d)}))
      .filter((x) =>
          x.head && x.head.sha !== lastSha && x.head.ageMs < SCAN_FRESH_MS)
      .sort((a, b) => a.head.ageMs - b.head.ageMs);

  if (!fresh.length) {
    return {
      dir: null,
      why: `no worktree of ${cwd} committed in the last ` +
          `${SCAN_FRESH_MS / 1000}s`,
    };
  }
  // More than one is possible — several agents share this repo. Take the
  // newest rather than giving up: this hook runs moments after the commit it
  // is reporting, so newest is the best evidence available, and the file's
  // standing rule is that over-attributing one commit beats losing the
  // tokens. Say so, though, because the choice was a guess.
  return {
    dir: fresh[0].dir,
    why: fresh.length > 1
        ? `picked the newest of ${fresh.length} worktrees committed within ` +
            `${SCAN_FRESH_MS / 1000}s — this attribution is inferred`
        : null,
  };
}

/**
 * Which tree the commit actually landed in.
 *
 * `payload.cwd` is the shell's directory, and that is not the repository when
 * the command names another one — `git -C <path> commit` is a shape worth
 * expecting here, since worktrees are the convention. Read HEAD from the wrong
 * tree and the session's whole delta is attributed to whatever commit that tree
 * happens to be sitting on: a plausible row, on an unrelated sha, that nothing
 * downstream could flag as wrong.
 *
 * So a candidate has to *prove* it is the one: a HEAD that is recent and is not
 * the one already reported. Returns null when nothing qualifies — and says why
 * whenever the command named somewhere we could not follow, because a silent
 * drop here is indistinguishable from "no commit was made" and cost a whole
 * session's spend before anyone noticed.
 */
function findCommitDir(command, cwd, lastSha) {
  const resolved = [];
  const unresolved = [];
  for (const raw of namedTargets(command)) {
    const dir = resolveTarget(raw, cwd);
    if (dir) resolved.push(dir);
    else unresolved.push(raw.replace(/^["']|["']$/g, ''));
  }

  for (const dir of resolved) {
    const head = headOf(dir);
    if (head && head.sha !== lastSha && head.ageMs < FRESH_MS) return dir;
  }

  // A named-but-unresolvable target rules `cwd` OUT rather than falling back to
  // it. The command said the commit went somewhere else; not knowing where is
  // no reason to blame the shell's directory, whose HEAD may well look fresh
  // for reasons of its own. (It did, in the first test of this code.)
  if (unresolved.length) {
    const named = `"${unresolved.join('", "')}"`;
    const scan = scanWorktrees(cwd, lastSha);
    if (scan.dir) {
      if (scan.why) note(`could not resolve ${named} from the command; ${scan.why}`);
      return scan.dir;
    }
    note(`could not resolve ${named} from the command (an unexpanded shell ` +
        `variable, or a path that is gone), and ${scan.why} — this commit's ` +
        `tokens were not recorded`);
    return null;
  }

  const here = headOf(cwd);
  if (here && here.sha !== lastSha && here.ageMs < FRESH_MS) return cwd;
  // Nothing named, nothing fresh: an ordinary `git commit` that created
  // nothing. Not worth a breadcrumb.
  return null;
}

/** Whether `sha` has a second parent — i.e. is a merge. */
function isMerge(cwd, sha) {
  try {
    // `--verify` makes the absence a non-zero exit rather than printed noise.
    git(['rev-parse', '--verify', '--quiet', `${sha}^2`], cwd);
    return true;
  } catch (_) {
    return false;
  }
}

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

/**
 * Why the send did not land, in one sentence, composed in ONE place (REQ-697).
 *
 * Three outcomes need three different actions and used to produce one:
 * Meridian closed is ordinary and constant and wants nothing; an unreachable
 * port may be a config error; a 401 is broken until a person edits the token.
 * This is the only place that distinction is drawn, so every breadcrumb and
 * every announcement quotes it rather than re-deriving it — two descriptions
 * of one failure that could drift apart would be worse than either alone.
 */
function whySendFailed(status, port) {
  if (status === 'refused') {
    return 'report_commit_usage refused the report — usually a repository ' +
        'of an ecosystem other than the one open in Meridian';
  }
  return status === 0
      ? `no answer from 127.0.0.1:${port} — Meridian not running?`
      : `HTTP ${status} from report_commit_usage` +
          (status === 401 ? ' — the bearer token is wrong' : '');
}

/**
 * How many calls are sitting in the spool, undelivered (REQ-697).
 *
 * `undrainedSpoolNote` already says this to an AGENT, on every MCP reply.
 * Nothing says it to the person at the keyboard, and on a rejected credential
 * the person is the only one who can act — so this is the sentence that turns
 * "one report was spooled" into "and so were the eighty-one before it".
 *
 * Zero on any error: a depth this cannot read is not worth failing over, and
 * the announcement it decorates stands perfectly well without it.
 */
function spoolDepth() {
  try {
    const f = spoolFile();
    if (!f) return 0;
    return fs.readFileSync(f, 'utf8')
        .split('\n')
        .filter((l) => l.trim() !== '')
        .length;
  } catch (_) {
    return 0;
  }
}

/**
 * Has this machine's rejected credential been announced recently? (REQ-697)
 *
 * RATE-LIMITED, NOT PER COMMIT. The condition is permanent — the app answers
 * and refuses, so it will refuse the next commit and every commit after it —
 * which means a line on every commit is a line on all 82 of them. A message
 * arriving that often is one every lane learns to scroll past, and that is the
 * silence this card is about arriving by a different route. An hour is short
 * enough that any working session meets it and long enough that a burst of
 * commits in one lane produces one line.
 *
 * MACHINE-WIDE, deliberately: a rejected credential is a property of this
 * machine and not of a session, so the stamp sits beside the watermarks rather
 * than inside one. Keyed per session it would announce once per lane, which
 * with four lanes running is per-commit again by another name.
 *
 * FAILS TOWARD SPEAKING. An unreadable or unwritable stamp answers yes. A
 * diagnostic that goes quiet because its own bookkeeping broke is precisely
 * the failure mode being fixed here, and being louder than intended is the
 * side to err on.
 */
function shouldAnnounceRejection(kind) {
  // One stamp per KIND (REQ-701). A refused token and a bearer that is not a
  // token are different faults with different fixes, and sharing a stamp
  // would let whichever spoke first silence the other for an hour — the
  // quiet-hour equivalent of `note()` overwriting its own file, which is the
  // bug REQ-697 turned out to be. `401` keeps the original file name so an
  // existing quiet hour on an upgraded machine is honoured rather than reset.
  const f = path.join(path.dirname(prefsFile()), 'token-hook',
      `last-${kind}.json`);
  let last = 0;
  try {
    last = Date.parse(JSON.parse(fs.readFileSync(f, 'utf8')).at) || 0;
  } catch (_) {
    last = 0; // never announced, or the stamp is unreadable — say it.
  }
  if (Date.now() - last < REJECTION_QUIET_MS) return false;
  try {
    fs.mkdirSync(path.dirname(f), {recursive: true});
    fs.writeFileSync(f, JSON.stringify({at: new Date().toISOString()}));
  } catch (_) {
    // Could not stamp it, so the next commit says it again. Louder than
    // intended beats silent, which is the trade this whole file keeps making.
  }
  return true;
}

/**
 * What a person is told when Meridian refuses the bearer (REQ-697).
 *
 * Not "Meridian could not be reached": the app answered. It read the token
 * this hook sent and rejected it, so the fallbacks below — a trailer on a
 * private commit, the spool on a published one — will keep catching the spend
 * and keep hiding the cause. That is how five days and 82 undelivered reports
 * went by with `last-event.json` saying only that a report had failed.
 *
 * Names where the bad value was read from and does NOT invite anyone to edit
 * it by hand. Since REQ-701 that is almost always the OS credential store
 * rather than a file — `mcp.token` is in `UserPreferences._secretKeys`, so
 * `user_preferences.json` holds only a marker — and the repair is in the app
 * either way: minting a token from the MCP panel writes it back to whichever
 * of the two this machine uses.
 */
function rejectedCredentialText(port, depth, source) {
  const where = spoolFile();
  return `MERIDIAN REJECTED THIS MACHINE'S MCP TOKEN. The app answered on ` +
      `127.0.0.1:${port} and refused the credential (HTTP 401), so this ` +
      `commit's token spend was not recorded on the board — and no commit's ` +
      `will be until somebody fixes the token. This is NOT "Meridian is ` +
      `closed": it cannot resolve itself, and it will not be better on the ` +
      `next commit.` +
      (depth > 0
           ? ` ${depth} provenance ${depth === 1 ? 'call is' : 'calls are'} ` +
               `already waiting undelivered at ${where}` +
               `${depth === 1 ? '' : ', each one a commit whose cost is ' +
                   'not on the board'}.`
           : '') +
      ` FIX IT IN THE APP: open Meridian's MCP server panel and make the ` +
      `token there and the one in your client config match — a real one is ` +
      `32 characters starting ${TOKEN_PREFIX}. The rejected value was read ` +
      `from ${source}; do not edit that by hand, because minting a token in ` +
      `the panel writes it back where every reader looks. ` +
      `Nothing is blocked in the meantime and no commit has failed: the ` +
      `spend is being kept, it is simply not reaching the board.`;
}

/**
 * What a person is told when the bearer never got sent because it was not a
 * Meridian token (REQ-701 check 2).
 *
 * THIS IS THE MESSAGE THE CARD IS ABOUT. A 401 at least happened; this fires
 * one step earlier, on the state that produced six days of silence — a
 * migration moved the secret, the reader kept reading the old place, and every
 * fallback below carried on working perfectly and hid it. Announced for the
 * same reason a 401 is: it cannot resolve itself, the fallbacks conceal it,
 * and only a person can move it. Rate-limited under its own stamp, because it
 * is as permanent as a 401 and a line per commit is a line nobody reads.
 *
 * Quiet, by contrast, when there is simply no store or no token: those are
 * ordinary on a machine that has never run Meridian, and shouting at a cloud
 * agent about a keyring it was never going to have is noise. They still leave
 * a breadcrumb — see `whyNoCredential`.
 */
function staleSecretText(port, depth, found, source) {
  const where = spoolFile();
  return `MERIDIAN'S MCP TOKEN IS NOT WHERE THIS HOOK LOOKED. Nothing was ` +
      `sent to 127.0.0.1:${port}: what was read for the bearer is not a ` +
      `Meridian token — ${found}. A real one is 32 characters starting ` +
      `${TOKEN_PREFIX}.` +
      (depth > 0
           ? ` ${depth} provenance ${depth === 1 ? 'call is' : 'calls are'} ` +
               `already waiting undelivered at ${where}` +
               `${depth === 1 ? '' : ', each one a commit whose cost is ' +
                   'not on the board'}.`
           : '') +
      ` This check exists because the last migration to move this secret ` +
      `(REQ-516) went unnoticed from 4 September: the marker it left behind ` +
      `was sent as a password, every call 401ed, and a hook designed to fail ` +
      `open said nothing for six days. Read from ${source}. FIX IT IN THE ` +
      `APP: open Meridian's MCP server panel and mint a token, which writes ` +
      `it back where every reader looks. Nothing is blocked and no commit ` +
      `has failed: the spend is being kept, it is simply not reaching the ` +
      `board.`;
}

/**
 * Fallback when the app could not be reached: bank the cost in the commit
 * itself, as a `Meridian-Tokens:` trailer. `SessionReconciler` reads it on the
 * next sweep, from any machine — which is the whole point, because the case
 * this exists for is a commit made where Meridian is not running at all.
 *
 * This REWRITES THE COMMIT, so it refuses unless every one of these holds:
 *
 *  - exactly one commit since the watermark (a trailer describes one commit,
 *    and the loop above splits the delta across several);
 *  - the same shell command did not push (amending after a push diverges the
 *    branch, and the hook runs after the whole command, not between);
 *  - no remote-tracking branch contains it, so nothing published is rewritten;
 *  - it is not a merge;
 *  - it does not already carry the trailer.
 *
 * Returns the new sha, or null if it refused or the amend failed — in which
 * case the original commit is untouched and the spend stays unclaimed for the
 * next commit to carry, exactly as before.
 */
function amendWithTrailer(cwd, command, head, delta) {
  if (/\bgit\b[^|&;]*\bpush\b/.test(command)) return null;
  if (isMerge(cwd, head)) return null;
  try {
    if (git(['branch', '-r', '--contains', head], cwd) !== '') return null;

    const message = git(['log', '-1', '--format=%B'], cwd);
    if (new RegExp(`^${TRAILER_KEY}:`, 'im').test(message)) return null;

    const trailer = `${TRAILER_KEY}: out=${delta.output} ` +
        `cc=${delta.cacheCreation} cr=${delta.cacheRead} in=${delta.input} ` +
        `agent=claude-code`;
    // Through `interpret-trailers`, never by concatenation. Appending a blank
    // line and the trailer would start a NEW trailer block, which silently
    // demotes everything in the old one — `Meridian-Req:` included, taking
    // requirement attribution with it. Git knows where the block is; ask it.
    const amended = execFileSync(
        'git', ['interpret-trailers', '--trailer', trailer],
        {cwd, input: message, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore']});
    execFileSync(
        'git', ['commit', '--amend', '--quiet', '--file', '-'],
        {cwd, input: amended, encoding: 'utf8', stdio: ['pipe', 'ignore', 'ignore']});
    return git(['rev-parse', 'HEAD'], cwd);
  } catch (_) {
    // Signing refused, a commit hook rejected the rewrite, git is too old for
    // a flag — all the same answer: leave the commit alone.
    return null;
  }
}

/**
 * Where the MCP write spool lives — the same file `McpWriteSpool` in
 * `lib/mcp/proxy/mcp_write_spool.dart` reads and drains (REQ-265). Mirrors
 * `applicationSupportCandidates`, first existing directory wins.
 *
 * Deliberately NOT `path.dirname(prefsFile())` on every platform: that lookup
 * uses `com.meridian/meridian` everywhere, which is only right on Windows —
 * the app's own directory is `nz.hwem.meridian` on macOS and Linux. Writing a
 * spool the proxy will never look at would be the silent absorption this whole
 * mechanism exists to avoid.
 */
function spoolFile() {
  const dirs = [];
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || '';
    if (appData) {
      dirs.push(path.join(appData, 'com.meridian', 'meridian'));
      dirs.push(path.join(appData, 'meridian'));
    }
  } else if (process.platform === 'darwin') {
    dirs.push(path.join(
        os.homedir(), 'Library', 'Application Support', 'nz.hwem.meridian'));
  } else {
    const dataHome =
        process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
    dirs.push(path.join(dataHome, 'nz.hwem.meridian'));
    dirs.push(path.join(dataHome, 'meridian'));
  }
  dirs.push(path.dirname(prefsFile())); // last resort: wherever the token is
  for (const dir of dirs) {
    try {
      if (fs.statSync(dir).isDirectory()) {
        return path.join(dir, 'mcp_write_spool.jsonl');
      }
    } catch (_) {
      // Not there. Try the next.
    }
  }
  return null;
}

/**
 * Append one `tools/call` to the spool, in the shape `SpooledCall.tryParse`
 * reads. Returns false if it could not be written, which the caller reports —
 * a spool that silently swallows the payload is worse than the loss.
 *
 * This is the floor under the commit-and-push case (REQ-263). The app is
 * unreachable, so `report_commit_usage` cannot land; the command pushed, so
 * `amendWithTrailer` correctly refuses to rewrite a published commit. Both
 * guards are right and together they had no floor: the figures were simply
 * gone. `commit_token_usage` is documented set-never-add keyed on
 * `(repositoryId, sha)`, so replaying this later is safe however many times it
 * happens.
 */
function spool(tool, args) {
  const file = spoolFile();
  if (!file) return false;
  try {
    fs.appendFileSync(
        file,
        JSON.stringify({
          v: 1,
          at: new Date().toISOString(),
          tool,
          arguments: args,
          origin: 'commit-hook',
        }) + '\n');
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Say it out loud, now, to the person in the chair.
 *
 * The old signal for lost spend was `end_session` printing NO COMMITS
 * REPORTED — the symptom, after the data had gone, reading as a bookkeeping
 * nag. A zero that means "could not measure" must be distinguishable from a
 * zero that means "cost nothing", and the only moment that distinction is
 * cheap to make is the moment the capture fails.
 *
 * Still fails open: this is a `systemMessage` on stdout and an exit 0, so a
 * client that ignores the field is exactly as unblocked as before.
 */
function announce(message) {
  try {
    process.stdout.write(JSON.stringify({systemMessage: message}));
  } catch (_) {
    // A diagnostic that throws is worse than no diagnostic.
  }
}

// ── Give-ups reach Meridian (REQ-2105) ─────────────────────────────────────
//
// `last-event.json` is one overwritten file on one computer, so when a commit
// had no cost the board could only say "No cost was recorded" and nobody could
// tell a repository without the hook from a closed app from a commit the agent
// never made. So every give-up that leaves a commit without a delivered cost
// is ALSO queued here, and the queue rides along on this hook's next call that
// Meridian answers, which files each entry on the session that made the commit.
//
// WHAT AN ENTRY HOLDS, AND ALL IT HOLDS: `kind` (a fixed word from
// `giveUpFor`), `reason` (one plain sentence this file composes from that
// kind and the computer's name), `at`, `repo_remote` with any user or token
// stripped from the URL, `sha`, and the Meridian `session_id` when the
// transcript shows one was opened (only the id is read, never any text). No
// transcript text, no command line, no path, and no token: the bearer is never
// in scope where an entry is built.
//
// Still never blocks and never prints: a queue it cannot read or write is an
// empty one, and the cost path above it is unchanged.

// Kept short on purpose: the newest twenty say why, and an unbounded file on a
// machine where Meridian never runs would only grow.
const GIVE_UP_MAX = 20;

function giveUpFile() {
  return path.join(path.dirname(prefsFile()), 'token-hook', 'give-ups.json');
}

function readGiveUps() {
  try {
    const list = JSON.parse(fs.readFileSync(giveUpFile(), 'utf8'));
    return Array.isArray(list) ? list.filter((g) => g && g.kind) : [];
  } catch (_) {
    return [];
  }
}

function writeGiveUps(list) {
  try {
    const f = giveUpFile();
    fs.mkdirSync(path.dirname(f), {recursive: true});
    const tmp = `${f}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(list.slice(-GIVE_UP_MAX)));
    fs.renameSync(tmp, f);
  } catch (_) {
    // A queue that cannot be written loses the reason, never the commit.
  }
}

/** The computer's name, as a person would say it. Never a secret. */
function hostName() {
  try {
    return os.hostname() || 'this computer';
  } catch (_) {
    return 'this computer';
  }
}

/** A remote URL without whatever user or token was written into it. */
function safeRemote(remote) {
  return remote ? String(remote).replace(/\/\/[^/@]*@/, '//') : null;
}

/**
 * The fixed kind and the plain sentence for one give-up. Composed here and
 * nowhere else, so the words Meridian shows are words this file chose.
 */
function giveUpFor({status, credential, empty, notSetUp, kind, agent}) {
  const host = hostName();
  const own = agent ? "the sub-agent's own transcript" : 'the session transcript';
  if (kind === 'agent_transcript_missing') {
    return {kind,
      reason: `${own} was not on ${host} when the hook ran`};
  }
  if (kind === 'transcript_unreadable') {
    return {kind, reason: `${own} could not be read on ${host}`};
  }
  if (kind === 'transcript_too_large') {
    return {kind,
      reason: `${own} was too large to read from its start on ${host}, so ` +
          `measuring begins with the next commit`};
  }
  if (kind === 'measuring_restarted') {
    return {kind,
      reason: `the cost hook was updated while this session was running, so ` +
          `measuring restarted with this commit on ${host}`};
  }
  if (kind === 'no_usage') {
    return {kind,
      reason: `${own} held no usage records when the hook ran on ${host}`};
  }
  if (notSetUp) {
    return {kind: 'not_set_up',
      reason: `Meridian had not been started on ${host}, so the hook had ` +
          `nothing to send to`};
  }
  if (empty) {
    return {kind: 'transcript_empty',
      reason: `the session transcript was already empty when the hook ran ` +
          `on ${host}`};
  }
  if (credential === 'not-a-token') {
    return {kind: 'token_not_meridian',
      reason: `the MCP token stored on ${host} is not a Meridian token`};
  }
  if (credential) {
    return {kind: 'token_unreadable',
      reason: `the MCP token could not be read on ${host}`};
  }
  if (status === 0 || status === null || status === undefined) {
    return {kind: 'not_running',
      reason: `Meridian was not running on ${host}`};
  }
  if (status === 401) {
    return {kind: 'token_refused',
      reason: `Meridian refused the MCP token on ${host}`};
  }
  if (status === 'refused') {
    return {kind: 'http_error',
      reason: `Meridian refused the report on ${host}`};
  }
  return {kind: 'http_error',
    reason: `Meridian answered with an error (HTTP ${status}) on ${host}`};
}

/** Queue one give-up per sha, replacing an older entry for the same one. */
function queueGiveUps(why, remote, shas, session) {
  try {
    const at = new Date().toISOString();
    const fresh = shas.map((sha) => {
      const entry = {kind: why.kind, reason: why.reason, at,
        repo_remote: safeRemote(remote), sha: sha || null};
      if (session) entry.session_id = session;
      return entry;
    });
    const keys = new Set(fresh.map((g) => `${g.repo_remote}|${g.sha}`));
    const kept = readGiveUps()
        .filter((g) => !keys.has(`${g.repo_remote}|${g.sha}`));
    writeGiveUps([...kept, ...fresh]);
  } catch (_) {
    // A diagnostic that throws is worse than no diagnostic.
  }
}

/** Remove what Meridian has taken, keeping anything queued since. */
function dropDelivered(delivered) {
  const sent = new Set(delivered.map((g) => `${g.at}|${g.sha}|${g.kind}`));
  writeGiveUps(readGiveUps()
      .filter((g) => !sent.has(`${g.at}|${g.sha}|${g.kind}`)));
}

// The Meridian session this transcript opened, the same anchor the activity
// hook uses: `begin_session` prints it, and nothing else does in this shape.
const SESSION_STARTED = /Session started\s+\{session_id:\s*([0-9a-fA-F-]{36})\}/g;

/**
 * JSON-RPC `tools/call` against the embedded server. Resolves on any outcome,
 * with the status code (or 0 for "never reached it") so a caller can say *why*.
 *
 * Or with `'refused'`: an HTTP 200 carrying a JSON-RPC `error`, or a result
 * flagged `isError`, is the call not landing, and nothing was recorded
 * (REQ-2351). Read as delivered, the figure was forgotten; the spool's own
 * drain (`_wasAccepted`) already counts both as a call that did not land, and
 * this agrees with it.
 *
 * Or with `'unknown'`: the one refusal that says no ecosystem this person can
 * reach has the repository at all (`kUsageRepoUnknown` in session_tools.dart).
 * Nothing will ever read a kept copy of that figure, so the caller drops it
 * instead of amending the commit or spooling it.
 *
 * A call that timed out server-side also answers `isError`, and its write may
 * have landed; it is kept like any other refusal, which is safe because the
 * replay is set-never-add on (repository, sha).
 */
function callTool(cfg, name, args) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {name, arguments: args},
    });
    const req = http.request(
        {
          host: '127.0.0.1',
          port: cfg.port,
          path: '/mcp',
          method: 'POST',
          timeout: 3000,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'Authorization': `Bearer ${cfg.token}`,
          },
        },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(res.statusCode === 200
              ? (replyRefusal(Buffer.concat(chunks).toString('utf8')) || 200)
              : res.statusCode));
        });
    // Meridian closed, port moved, firewall — all the same to us.
    req.on('error', () => resolve(0));
    req.on('timeout', () => {
      req.destroy();
      resolve(0);
    });
    req.write(body);
    req.end();
  });
}

// The opening words of report_commit_usage's refusal for a repository no
// ecosystem this person can reach has. Must match `kUsageRepoUnknown` in
// lib/mcp/embedded/session_tools.dart.
const USAGE_REPO_UNKNOWN = 'REPOSITORY UNKNOWN:';

/**
 * Why a JSON-RPC reply body did not land: `'unknown'` for the refusal that
 * names no reachable repository, `'refused'` for a JSON-RPC `error` or any
 * other result flagged `isError`, and null for a reply that landed. A body
 * that does not parse is left as landed, as it always was.
 */
function replyRefusal(body) {
  let reply;
  try {
    reply = JSON.parse(body);
  } catch (_) {
    return null;
  }
  if (!reply || typeof reply !== 'object') return null;
  if (reply.error != null) return 'refused';
  const result = reply.result;
  if (!result || result.isError !== true) return null;
  const first = Array.isArray(result.content) ? result.content[0] : null;
  const text = first && typeof first.text === 'string' ? first.text : '';
  return text.startsWith(USAGE_REPO_UNKNOWN) ? 'unknown' : 'refused';
}

/**
 * Where a sub-agent's own transcript lives, given its parent's.
 *
 * `<project>/<session>.jsonl` sits beside a directory of the same name holding
 * `subagents/agent-<agent_id>.jsonl`. Derived from the transcript path rather
 * than from the project slug, which is a mangled `cwd` and wrong under a
 * worktree.
 */
function subagentDir(transcriptPath) {
  return path.join(path.dirname(transcriptPath),
      path.basename(transcriptPath, '.jsonl'), 'subagents');
}

/**
 * Which transcript costs this commit, and under which watermark (REQ-2610).
 *
 * Inside a sub-agent the payload's `session_id` and `transcript_path` are the
 * PARENT's. The payload's `agent_id` names the sub-agent, so the cost is read
 * from that agent's own file (`agent_transcript_path` when the harness sends
 * it) and kept under a watermark of its own: the parent's would charge this
 * commit with everything the orchestrator did, or move under the parent's own
 * next commit and count the same tokens twice.
 */
function costSource(payload) {
  const sessionId = String(payload.session_id);
  const agentId = typeof payload.agent_id === 'string'
      ? payload.agent_id.replace(/[^a-zA-Z0-9_-]/g, '') : '';
  if (!agentId) {
    return {file: payload.transcript_path, key: sessionId, agentId: null};
  }
  const own = typeof payload.agent_transcript_path === 'string' &&
      payload.agent_transcript_path !== ''
      ? payload.agent_transcript_path
      : path.join(subagentDir(payload.transcript_path), `agent-${agentId}.jsonl`);
  return {file: own, key: `${sessionId}-agent-${agentId}`, agentId};
}

/** The payload's field names and whether it named an agent. Never a value. */
function payloadShape(payload) {
  const keys = Object.keys(payload).sort().join(', ');
  return `(payload fields: ${keys}; agent_id ${payload.agent_id ? 'present' : 'absent'})`;
}

async function main() {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch (_) {
    return die();
  }

  const command = (payload.tool_input && payload.tool_input.command) || '';
  // Cheap gate first: the overwhelming majority of Bash calls are not commits,
  // and this hook runs after every one of them.
  if (!/\bgit\b[^|&;]*\bcommit\b/.test(command)) return die();

  const sessionId = payload.session_id;
  const transcript = payload.transcript_path;
  if (!sessionId || !transcript) {
    note(`the hook ran for a commit but its payload carried no ` +
        `${!sessionId ? 'session_id' : 'transcript_path'} — this commit's ` +
        `tokens were not recorded ${payloadShape(payload)}`);
    return die();
  }
  const source = costSource(payload);

  let cfg;
  try {
    cfg = resolveConfig('report-commit-tokens');
  } catch (_) {
    return die();
  }

  // Read the watermark first: which commit was already reported is part of
  // deciding which tree this call committed in.
  const state = readState(source.key);
  const cwd = findCommitDir(
      command, payload.cwd || process.cwd(), state.lastSha);
  if (!cwd) return die(); // findCommitDir speaks up when the silence would lie

  let head, remote;
  try {
    head = git(['rev-parse', 'HEAD'], cwd);
    remote = git(['remote', 'get-url', 'origin'], cwd);
  } catch (_) {
    return die(); // no origin, or detached in a way we can't read
  }

  // Nothing to talk to: Meridian has never started here, or holds no token.
  // Still silent, as before; but the commit's missing cost now has a reason
  // waiting for the day Meridian does run here (REQ-2105).
  if (!cfg) {
    if (!isMerge(cwd, head)) {
      queueGiveUps(giveUpFor({notSetUp: true}), remote, [head], null);
    }
    return die();
  }

  // WHAT THIS HOOK COULD NOT MEASURE IS SAID, NOT DROPPED (REQ-296, REQ-2610).
  // Each of these leaves a commit with no row, which the board shows as
  // unmeasured, never a fabricated zero; the watermark stays where it was so a
  // later commit whose transcript has recovered resumes its delta from here.
  const whose = source.agentId ? `sub-agent ${source.agentId}'s` : `the session`;
  const gaveUp = (kind, what, tell) => {
    note(`${what} — this commit's spend could not be measured, and nothing ` +
        `was reported rather than a fabricated zero ${payloadShape(payload)}`);
    if (tell) announce(tell);
    if (!isMerge(cwd, head)) {
      queueGiveUps(giveUpFor({kind, agent: !!source.agentId}), remote, [head],
          null);
    }
    return die();
  };

  let measured;
  try {
    measured = measure(source.file, state);
  } catch (e) {
    return gaveUp(
        source.agentId && e && e.code === 'ENOENT'
            ? 'agent_transcript_missing' : 'transcript_unreadable',
        `${whose} transcript ${source.file} could not be read ` +
            `(${e && e.code ? e.code : 'error'})`,
        `Meridian could not measure this commit's token spend: ${whose} ` +
            `transcript could not be read. Nothing was reported for it, which ` +
            `the board shows as unmeasured rather than as a commit that cost ` +
            `nothing.`);
  }

  // REQ-296. The transcript existed and had nothing in it.
  if (measured.empty) {
    note(`transcript ${source.file} was empty at commit time — this commit's ` +
        `spend could not be measured, and nothing was reported rather than ` +
        `a fabricated zero`);
    announce(
        `Meridian could not measure this commit's token spend: the session ` +
        `transcript was already empty when the hook ran. Nothing was ` +
        `reported for it, which the board shows as unmeasured rather than ` +
        `as a commit that cost nothing. The figure cannot be recovered.`);
    if (!isMerge(cwd, head)) {
      queueGiveUps(giveUpFor({empty: true}), remote, [head], null);
    }
    return die();
  }

  // Too long to start from the beginning in the time a hook has. Measuring
  // begins at the end of it, so this commit is unmeasured and the next is not.
  if (measured.tooLarge) {
    try {
      writeState(source.key, {
        output: 0, cacheCreation: 0, cacheRead: 0, input: 0, models: {},
        bytes: measured.size, records: 0, meridianSession: null,
        lastSha: head,
      });
    } catch (_) {
      // Unwritable: the next commit meets the same file and says so again.
    }
    return gaveUp('transcript_too_large',
        `${whose} transcript is ${Math.round(measured.size / 1048576)} MB, ` +
            `too large to read from its start`,
        `Meridian could not measure this commit's token spend: ${whose} ` +
            `transcript is too large to read from the start. Measuring ` +
            `begins at the end of it, so the next commit is measured.`);
  }

  // A watermark from before byte offsets counted every block of a reply, so it
  // cannot be subtracted from a correct count. Start again from here, and say
  // that this commit went unmeasured rather than send a zero (REQ-2610).
  if (measured.restart && measured.totals) {
    try {
      writeState(source.key, watermark(measured.totals, head));
    } catch (_) {
      // Unwritable: the next commit meets the same watermark and says so again.
    }
    return gaveUp('measuring_restarted',
        `${whose} watermark predates byte offsets, so measuring restarted ` +
            `at this commit`,
        null);
  }

  const totals = measured.totals;
  // A transcript with content and not one usage record: nothing to report, and
  // reporting zero would say the commit was free.
  if (totals.records === 0) {
    return gaveUp('no_usage',
        `${whose} transcript ${source.file} held no usage records`,
        `Meridian could not measure this commit's token spend: ${whose} ` +
            `transcript holds no usage records. Nothing was reported for it, ` +
            `which the board shows as unmeasured rather than as a commit ` +
            `that cost nothing.`);
  }

  // No agent_id, yet a sub-agent beside this transcript is writing: this commit
  // is costed from the session's transcript. Said, so a harness that stops
  // sending the field cannot do it unseen (REQ-2610).
  if (!source.agentId && liveAgentBeside(source.file)) {
    note(`no agent_id in the payload while sub-agent transcripts beside ` +
        `${source.file} are being written — this commit was costed from the ` +
        `session transcript ${payloadShape(payload)}`);
  }

  // Per model first (REQ-1483), and the commit's whole delta is their sum.
  const perModel = modelDeltas(totals, state);
  const delta = zeroTotals();
  for (const d of Object.values(perModel)) {
    for (const f of FIELDS) delta[f] += d[f];
  }
  // Named models with anything in them, in a fixed order so a retry sends the
  // same list. Usage that names no model rides along as an entry with no name
  // when there is a named one beside it, so the entries still add to the
  // commit.
  const modelNames = Object.keys(perModel)
      .filter((m) => FIELDS.some((f) => perModel[m][f] > 0))
      .sort();
  const splitByModel = modelNames.some((m) => m !== '');

  // Commits produced since the last report. A single Bash call can make more
  // than one, and the delta covers all of them together — so divide it, the
  // same never-duplicate rule the component rollup applies.
  //
  // ONLY THIS SESSION'S OWN COMMITS. A bare `rev-list A..B` walks both parents
  // of a merge, so one `git merge origin/main` — the routine way to clear a PR
  // conflict here — sweeps in every commit that merge brought with it.
  // Measured over this repo's own history, 2026-08-30: such a merge pulls in a
  // median of about 11 commits and up to 24, roughly half of them other
  // agents' merge commits. Two harms, and the second is the worse one:
  //
  //  - every one of those commits got a `commit_token_usage` row it had no
  //    business having, and most of them map to no component, which is where
  //    the "50% of reported commits reached a component" coverage figure came
  //    from (REQ-175);
  //  - the session's real delta was DIVIDED across all of them, so the work's
  //    own commit was charged a twelfth of what it cost and the other eleven
  //    twelfths were scattered onto commits belonging to other sessions.
  //
  // `--first-parent` stays on this branch's own line and never descends into
  // what was merged in. `--no-merges` drops the merge commit itself: a merge
  // produces no output tokens of its own, and the work inside it is already
  // reported against the commits being merged, so counting it is double
  // counting.
  let shas;
  if (state.lastSha) {
    try {
      const range = git(
          ['rev-list', '--first-parent', '--no-merges',
           `${state.lastSha}..${head}`],
          cwd);
      shas = range.split('\n').map((s) => s.trim()).filter(Boolean);
    } catch (_) {
      // The watermark is gone from history — a rebase, usually. Fall back to
      // HEAD, unless HEAD is a merge, which is never ours to charge.
      shas = isMerge(cwd, head) ? [] : [head];
    }
  } else {
    shas = isMerge(cwd, head) ? [] : [head];
  }

  // Nothing of ours in the range: this call made a merge and nothing else.
  // Leave the watermark where it is so the next real commit carries the spend,
  // rather than banking it against a merge that produced none of it. That is
  // this file's standing rule — over-attributing one commit is recoverable,
  // losing the tokens is not — applied to the one case where the *only*
  // candidate is a commit we know is wrong.
  if (!shas.length) {
    note(`only a merge commit since ${String(state.lastSha).slice(0, 7)}; ` +
        'holding this spend for the next real commit');
    return die();
  }

  const n = shas.length;
  const share = (v, i) => Math.floor(v / n) + (i === 0 ? v - Math.floor(v / n) * n : 0);

  // SAY THAT IT IS A SHARE (REQ-323). `share()` has divided a multi-commit
  // delta since this file's first commit, and until v181 nothing in the row
  // recorded that it had. Measured over 782 live rows on 2026-09-02: 370 of
  // them — 35.7% of all spend, one delta spread as wide as 22 commits —
  // carried floor(delta / n), and every per-commit, per-component and
  // per-requirement figure drawn from them was an average presented as a
  // reading. The division itself is not the defect and is not being replaced:
  // it conserves, so the totals were always honest, and there is nothing in
  // the transcript from which a genuine per-commit share could be derived.
  // The defect was silence.
  //
  // Deterministic, so a retry or a spool replay re-sends the SAME span rather
  // than minting a second one for the same delta — which matters because the
  // rule everywhere here is set, never add. Watermark and head pin the delta;
  // the session id keeps two agents committing the same range apart.
  const spanId = `${source.key}:` +
      `${String(state.lastSha || 'root').slice(0, 12)}:${head.slice(0, 12)}`;

  let allOk = true;
  // Set when there was never a usable bearer, so nothing was sent at all
  // (REQ-701). Distinct from `failStatus`, which is the answer to a request
  // that WAS made — and the distinction is the whole card: for six days a
  // request went out, came back 401, and every fallback below worked.
  const credentialProblem = cfg.problem || null;
  // The status of the last send that did not land, so the terminal breadcrumb
  // below can still say WHY. See `why`.
  let failStatus = null;
  // The payloads that did NOT land, kept so the spool below can hold the exact
  // call rather than a summary of one.
  const unsent = [];
  // Reports refused because Meridian knows no such repository: dropped.
  const dropped = [];
  // What earlier commits gave up on, read before this pass adds its own.
  const queuedBefore = credentialProblem ? [] : readGiveUps();
  for (let i = 0; i < n; i++) {
    const args = {
      sha: shas[i],
      repo_remote: remote,
      output_tokens: share(delta.output, i),
      cache_creation_tokens: share(delta.cacheCreation, i),
      cache_read_tokens: share(delta.cacheRead, i),
      input_tokens: share(delta.input, i),
      // The undivided figure, so a reader can count this delta once whatever
      // the per-row numbers turn out to be — the half of the span that repairs
      // a total rather than merely labelling one.
      span_id: spanId,
      span_commits: n,
      span_output_tokens: delta.output,
      agent_identity: 'claude-code',
    };
    if (splitByModel) {
      args.models = modelNames.map((m) => {
        const d = perModel[m];
        const entry = {
          output_tokens: share(d.output, i),
          cache_creation_tokens: share(d.cacheCreation, i),
          cache_read_tokens: share(d.cacheRead, i),
          input_tokens: share(d.input, i),
        };
        if (m !== '') entry.model = m;
        return entry;
      });
    }
    if (credentialProblem) {
      // REFUSED BEFORE THE REQUEST (REQ-701 check 2). Not an optimisation:
      // sending a bearer we can already see is not a token buys a 401 and a
      // breadcrumb that says the token is "wrong" — true, useless, and
      // indistinguishable from a token that merely went stale. Refusing here
      // is what lets the breadcrumb say WHAT it found instead.
      allOk = false;
      unsent.push(args);
      note(whyNoCredential(credentialProblem, cfg.found),
          {status: null, credential: credentialProblem});
      continue;
    }
    // Earlier give-ups ride on the first live call (REQ-2105), and only on a
    // live one: a spooled copy below never carries them, so the queue stays
    // the one place they wait and a replay cannot file them twice.
    const carried = i === 0 ? queuedBefore : [];
    const status = await callTool(cfg, 'report_commit_usage',
        carried.length ? Object.assign({}, args, {give_ups: carried}) : args);
    // The give-ups are filed before the repository is looked up, so a report
    // refused as unknown delivered them too.
    if ((status === 200 || status === 'unknown') && carried.length) {
      dropDelivered(carried);
    }
    if (status === 'unknown') {
      // DROPPED, NOT KEPT (REQ-2351). No ecosystem this person can reach has
      // the repository, so a trailer would never be read and a spooled copy
      // would be refused on every replay. Said once, after the loop.
      dropped.push(args.sha);
      continue;
    }
    if (status !== 200) {
      allOk = false;
      failStatus = status;
      unsent.push(args);
      note(whySendFailed(status, cfg.port), {status});
    }
  }

  if (dropped.length) {
    note(`no repository Meridian knows matches ${safeRemote(remote)}, so ` +
        `${dropped.length} usage report(s) were dropped rather than kept: ` +
        dropped.map((s) => String(s).slice(0, 7)).join(', '),
        {status: 'unknown'});
  }

  // WHY IT FAILED, CARRIED FORWARD (REQ-697). `note()` writes ONE file and
  // overwrites it, so the sentence just composed in that loop — the only place
  // a refused credential is ever distinguished from a closed app — was
  // destroyed by whichever terminal note ran a few lines below. That is not a
  // theory about the code: measured on this machine 2026-09-09,
  // `last-event.json` read "report failed and the commit could not be amended;
  // spooled 1 usage report(s)" and nothing else, while five days of spend sat
  // unsent behind a bearer the server had been rejecting all along. Every
  // terminal breadcrumb quotes this now, so the last write is still the whole
  // story rather than only its final chapter.
  const why = credentialProblem
      ? whyNoCredential(credentialProblem, cfg.found)
      : failStatus === null ? '' : whySendFailed(failStatus, cfg.port);
  const rejected = failStatus === 401;
  // AND WHAT THE LAST WRITE MUST STILL CARRY BESIDE IT. `note()` overwrites
  // one file, so a machine-readable field set on the note written inside the
  // send loop is destroyed by whichever terminal note runs below — which is
  // REQ-697's defect exactly, and the first cut of REQ-701 reproduced it one
  // field further in: `credential` was written in the loop and gone by the
  // time anyone read `last-event.json`. Caught by its own test, which is the
  // point of asserting on the field rather than only on the sentence.
  const outcome = {status: failStatus, credential: credentialProblem};
  // The app answering and refusing us is not the app being absent, and the
  // messages below said the second about the first. Nor is either of them
  // "we had no credential to offer", which since REQ-701 is a third thing the
  // fallback sentences must not mislabel.
  const reach = rejected
      ? `Meridian refused this machine's credential`
      : failStatus === 'refused'
          ? `Meridian refused the report (${why})`
          : credentialProblem === 'not-a-token'
          ? `this machine's stored MCP bearer is not a Meridian token`
          : credentialProblem
              ? `this machine has no MCP bearer to send`
              : `Meridian could not be reached`;

  // ONE MESSAGE, NOT TWO. `announce` writes a JSON object to stdout; calling
  // it twice emits two concatenated objects and a client parses neither. So
  // the rejected-credential sentence joins whatever was already going out
  // instead of becoming a second write — and it goes first, because it is the
  // only part of any of this the reader has to act on today.
  const said = [];

  // Couldn't tell the app. Put it in the commit instead, where a sweep on any
  // machine will find it. Only for a single commit: the trailer describes one,
  // and a multi-commit delta was already divided above.
  const banked = allOk || n !== 1
      ? null
      : amendWithTrailer(cwd, command, head, delta);
  if (banked) {
    note(`${why}; banked ${delta.output} output tokens into ` +
        `${banked.slice(0, 7)} as a ${TRAILER_KEY} trailer — the commit's ` +
        `sha moved from ${head} to ${banked}`, outcome);
    // TELL THE CALLER ITS SHA MOVED (REQ-689). This amend is legitimate — the
    // commit is private, every guard above held, and banking the cost in it is
    // the only route a cloud agent has. It is still a rewrite, and the agent
    // that reads a sha out of `git commit`'s own output line, or out of a
    // `rev-parse` chained into the same command, is holding a dead one a second
    // later. Five lanes on 2026-09-09 filed evidence against exactly that, and
    // the four that recovered did so by re-reading `rev-parse` out of caution:
    // a discipline, not a guarantee. `note` is not enough here — nobody reads
    // `last-event.json` in time — so this goes to the terminal, where the
    // caller meets it while it can still act. Both shas in full: a short one
    // compares equal to nothing and grades the evidence stale all over again.
    said.push(
        `This commit was rewritten so it could carry its own token spend: ` +
        `${head} is now ${banked}. ${reach}, so ` +
        `${delta.output} output tokens were banked into the commit as a ` +
        `${TRAILER_KEY} trailer, and amending it changes its sha. The tree is ` +
        `byte-identical and nothing was published — this only ever happens to ` +
        `a private commit. USE ${banked} anywhere you would have used ` +
        `${head}: evidence, a PR body, a report. Evidence filed against the ` +
        `old sha points at a commit no longer in this branch's history and ` +
        `grades stale, which is silent — the check goes green and stops ` +
        `counting.`);
  }

  // This pass's own give-ups, one per commit whose cost did not land live. A
  // trailer or the spool may still carry the figure, but the session should
  // know why it is not on the board yet; a later live report overwrites
  // nothing here, it simply makes the reason moot. Queued after the amend,
  // because a banked commit's sha is the new one.
  if (unsent.length) {
    queueGiveUps(
        giveUpFor({status: failStatus, credential: credentialProblem}),
        remote, banked ? [banked] : unsent.map((a) => a.sha),
        totals.meridianSession);
  }

  // THE FLOOR (REQ-263). Both other paths are individually right and on
  // 2026-09-01 they failed together: the app was down for an hour, so the
  // direct report could not land, and the agents ran commit-and-push in one
  // command, so `amendWithTrailer` correctly refused to rewrite a published
  // commit. Five sessions' figures are unrecoverable. The spool is the path
  // that survives both — a local file the proxy replays on the next call that
  // reaches Meridian, keyed on (repository, sha) so replaying is a no-op.
  let spooled = 0;
  if (!allOk && !banked && unsent.length) {
    for (const args of unsent) {
      if (spool('report_commit_usage', args)) spooled++;
    }
    const where = spoolFile();
    if (spooled === unsent.length) {
      note(`${why}; the commit could not be amended either, so ` +
          `${spooled} usage report(s) were spooled to ${where}`,
          outcome);
      said.push(
          `${reach}, so this commit's token spend was ` +
          `not recorded on the board. ${delta.output} output tokens for ` +
          `${spooled === 1 ? 'commit ' + shas[0].slice(0, 7) : spooled + ' commits'} ` +
          `${spooled === 1 ? 'is' : 'are'} spooled at ${where} and will ` +
          `replay on the first MCP call that reaches the app. Nothing is ` +
          `lost, but until it drains the spend is on this disk only.`);
    } else {
      // The one outcome that is a real loss, and the only honest thing to do
      // with it is say so while somebody can still act.
      note(`${why}; the amend was refused and the spool could not be ` +
          `written — ${delta.output} output tokens LOST`, outcome);
      said.push(
          `TOKEN SPEND LOST — ${reach}, this commit was ` +
          `pushed so it cannot carry a ${TRAILER_KEY} trailer, and the ` +
          `fallback spool at ${where} could not be written. ` +
          `${delta.output} output tokens for ${shas.map((s) => s.slice(0, 7)).join(', ')} ` +
          `are not recorded anywhere. Report them by hand with ` +
          `report_commit_usage once Meridian is open.`);
    }
  }

  // THE ONE STATE THAT CANNOT RESOLVE ITSELF (REQ-697). Everything above
  // this line is a fallback catching the spend, and each of them works: the
  // trailer on a private commit, the spool on a published one. That is exactly
  // why a refused credential needed saying out loud — the fallbacks kept
  // working and kept the cause invisible, and a 401 is the one outcome here
  // that no amount of waiting or retrying repairs. Rate-limited rather than
  // silenced; see `shouldAnnounceRejection`. It will not fire on a cloud agent
  // with no local install, because nothing there ever answers to refuse us.
  if (rejected && shouldAnnounceRejection('401')) {
    said.unshift(rejectedCredentialText(cfg.port, spoolDepth(), cfg.source));
  } else if (credentialProblem === 'not-a-token' &&
      shouldAnnounceRejection('bearer')) {
    // The one credential problem worth a terminal line. `no-store` and
    // `no-token` are ordinary where Meridian is not installed, and they get a
    // breadcrumb and nothing more — see `staleSecretText`.
    said.unshift(
        staleSecretText(cfg.port, spoolDepth(), cfg.found, cfg.source));
  }
  if (said.length) announce(said.join('\n\n'));

  // Move the watermark once the spend is somebody else's problem — delivered
  // to the app, or written into the commit. A trailer that is banked but not
  // watermarked would be counted twice: once from the trailer, once again in
  // the next commit's delta. And a failure at both leaves it unclaimed, so the
  // next commit carries it rather than dropping it — over-attributing one
  // commit is recoverable, losing the tokens is not.
  if (allOk || banked || spooled === unsent.length) {
    writeState(source.key, watermark(totals, banked || head));
  }
  die();
}

if (require.main === module) {
  main().catch(die);
} else {
  // Required by tool/backfill_commit_tokens.js, which reads transcripts the
  // same way and reports through the same call.
  module.exports = {eachLine, scanUsage, UsageCounter, callTool, resolveConfig, zeroTotals,
    FIELDS, subagentDir};
}
