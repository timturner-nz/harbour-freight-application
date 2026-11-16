// PostToolUse hook: record what a session did, step by step (REQ-1446).
//
// WHY A HOOK. Meridian can infer a lane's activity from its working copy and
// its test runs, but not what the agent actually did: which files it read,
// what it changed, which tests it ran and what they found, when it put a
// defect back to prove a test. The harness knows every one of those as a tool
// call, so this turns each meaningful one into ONE summarised line and sends
// them, in batches, to `report_session_activity`. The session panel shows
// them as a Timeline.
//
// SUMMARIES ONLY. A step is a kind, one line of words this file composes,
// the paths it touched and, for a test run, the counts. Never a file's
// contents (an Edit's `new_string`, a Write's `content`, a Read's result),
// never the command line as typed, never a search pattern. Anything this file
// cannot summarise from that short list is DROPPED, not sent raw: a Bash
// command that is not a test run, an evidence report, a commit, a push or a
// pull request says nothing here. A summary or path shaped like a secret is
// dropped whole, and the tool refuses the same shapes on its side too.
//
// WHICH SESSION. Nothing persists the Meridian session id; `begin_session`
// prints it in its reply, as `Session started  {session_id: <uuid>}`, and the
// transcript is the record. This reads the transcript incrementally (only the
// bytes added since the last look) and keeps the LAST id printed in that
// shape. Anchored on "Session started" deliberately: `list_open_sessions` and
// `end_session` print `{session_id: ...}` for OTHER sessions, and attributing
// a lane's steps to somebody else's session is worse than not sending them.
// A subagent reads its own transcript (`agent_transcript_path`, or the
// `subagents/agent-<id>.jsonl` beside the parent's), never the parent's --
// the same rule `close-meridian-session.js` keeps.
//
// BATCHED. Steps queue in a small state file per harness session and go when
// five are waiting, when twenty seconds have passed since the first, or at
// once for a test run, a defect put back or an evidence report -- the steps a
// reader of the timeline is waiting for. Steps taken before `begin_session`
// wait for it, and are sent to the session it opens.
//
// FAILS OPEN, ALWAYS. Exit 0 whatever happens, print nothing, and never wait
// longer than one short HTTP call. Meridian closed, no token, no session yet:
// the queue is kept (capped, oldest dropped first) and tried again on the next
// tool call. A reply refusing the batch (an unknown session) drops it rather
// than retrying it forever. Nothing here is evidence and nothing here moves a
// requirement: what an agent did is not what it proved.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {readConfig, callToolText} = require(path.join(__dirname, 'meridian-mcp.js'));

const FLUSH_AT = 5;
const FLUSH_AFTER_MS = 20000;
const PENDING_MAX = 100;
const SUMMARY_MAX = 200;
const URGENT = new Set(['test_run', 'reintroduction', 'evidence']);

const SESSION_STARTED = /Session started\s+\{session_id:\s*([0-9a-fA-F-]{36})\}/g;

// The same shapes `report_session_activity` refuses.
const SECRET_SHAPES = [
  /mer_mcp_[A-Za-z0-9_]+/,
  /\bsk-[A-Za-z0-9_-]{16,}/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /Bearer\s+\S{8,}/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(password|passwd|secret|token|api[_-]?key)\s*[=:]\s*\S+/i,
];

// A path worth not naming at all, even as a path.
const SENSITIVE_PATH = /(^|[\\/])(\.env(\..*)?|id_rsa[^\\/]*|.*\.pem|.*\.key|credentials[^\\/]*|secrets?[^\\/]*)$/i;

const TEST_RUN = /\b(mtest(\.dart)?|flutter\s+test|dart\s+test|npm\s+(run\s+)?test|yarn\s+test|pnpm\s+test|pytest|go\s+test|cargo\s+test|jest|vitest)\b/;
const REINTRODUCTION = /reintroduc|put (the |a )?(defect|bug|break) back|re-?break/i;

function die() {
  process.exit(0);
}

function stateDir() {
  return process.env.MERIDIAN_ACTIVITY_DIR ||
      path.join(os.tmpdir(), 'meridian-session-activity');
}

function stateFile(payload) {
  const key = `${payload.session_id || 'none'}-${payload.agent_id || 'main'}`
      .replace(/[^A-Za-z0-9_-]/g, '_');
  return path.join(stateDir(), `${key}.json`);
}

function readState(file) {
  try {
    const s = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (s && Array.isArray(s.pending)) return s;
  } catch (_) {
    // First call for this session, or a torn write. Start again.
  }
  return {pending: [], seq: 0, firstPendingAt: null, meridianSession: null,
    scanned: null};
}

function writeState(file, state) {
  try {
    fs.mkdirSync(path.dirname(file), {recursive: true});
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state));
    fs.renameSync(tmp, file);
  } catch (_) {
    // Losing the queue loses a few timeline lines, never the agent's work.
  }
}

/** The transcript this event may read: the subagent's own, or the session's. */
function transcriptFor(payload) {
  if (payload.agent_transcript_path) return payload.agent_transcript_path;
  const parent = payload.transcript_path;
  if (!parent) return null;
  if (payload.agent_id) {
    return path.join(path.dirname(parent), path.basename(parent, '.jsonl'),
        'subagents', `agent-${payload.agent_id}.jsonl`);
  }
  return parent;
}

/**
 * The newest Meridian session this transcript opened, reading only what was
 * added since [state.scanned]. Backs up a little so a match split across two
 * reads is still found.
 */
function findSession(transcript, state) {
  if (!transcript) return state.meridianSession;
  let size;
  try {
    size = fs.statSync(transcript).size;
  } catch (_) {
    return state.meridianSession;
  }
  const from = state.scanned && state.scanned.path === transcript &&
      state.scanned.bytes <= size
      ? Math.max(0, state.scanned.bytes - 200)
      : 0;
  if (size > from) {
    let fd;
    try {
      fd = fs.openSync(transcript, 'r');
      const buf = Buffer.alloc(size - from);
      fs.readSync(fd, buf, 0, buf.length, from);
      const text = buf.toString('utf8');
      SESSION_STARTED.lastIndex = 0;
      let m;
      while ((m = SESSION_STARTED.exec(text)) !== null) {
        state.meridianSession = m[1];
      }
    } catch (_) {
      return state.meridianSession;
    } finally {
      if (fd !== undefined) {
        try {
          fs.closeSync(fd);
        } catch (_) {
          // Nothing to do.
        }
      }
    }
  }
  state.scanned = {path: transcript, bytes: size};
  return state.meridianSession;
}

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

/** `/c/Users/x` (Git Bash) as `C:/Users/x` on Windows; anything else as is. */
function nativePath(p) {
  if (process.platform === 'win32') {
    const m = /^\/([a-zA-Z])\/(.*)$/.exec(p);
    if (m) return `${m[1].toUpperCase()}:/${m[2]}`;
  }
  return p;
}

/**
 * A path as the timeline names it: relative to the working directory when it
 * is inside it, the bare file name otherwise (never a home directory), and
 * null for a path that should not be named at all.
 */
function shownPath(p, cwd) {
  if (!p || typeof p !== 'string') return null;
  if (/[\r\n]/.test(p) || SENSITIVE_PATH.test(p)) return null;
  const native = nativePath(p);
  let shown = native;
  if (path.isAbsolute(native)) {
    const rel = cwd ? path.relative(nativePath(cwd), native) : '';
    shown = rel && !rel.startsWith('..') && !path.isAbsolute(rel)
        ? rel
        : path.basename(native);
  }
  shown = toPosix(shown);
  return shown.length > 300 ? null : shown;
}

/** Test files a command names, as paths only. */
function testFilesIn(command, cwd) {
  const out = [];
  const re = /[\w./\\:-]*(?:_test|\.test|\.spec|_tests)\.(?:dart|js|ts|tsx|py|go)\b|\btest_[\w-]+\.py\b/g;
  let m;
  while ((m = re.exec(command)) !== null && out.length < 5) {
    const shown = shownPath(m[0], cwd);
    if (shown && !out.includes(shown)) out.push(shown);
  }
  return out;
}

/** Repo paths a command names (for a defect put back): lib/, src/, test/. */
function sourceFilesIn(command, cwd) {
  const out = [];
  const re = /(?:^|[\s'"=])((?:[\w.:-]+[\\/])*(?:lib|src|test|app)[\\/][\w./\\-]+\.\w+)/g;
  let m;
  while ((m = re.exec(command)) !== null && out.length < 5) {
    const shown = shownPath(m[1], cwd);
    if (shown && !out.includes(shown)) out.push(shown);
  }
  return out;
}

/** Pass/fail counts from a test runner's own summary line, when there is one. */
function testCounts(text) {
  if (!text) return null;
  // Flutter / dart test: "+801 ~2 -3: Some tests failed." -- the LAST one.
  const flutter = /\+(\d+)(?:\s+~\d+)?(?:\s+-(\d+))?:\s/g;
  let m;
  let last = null;
  while ((m = flutter.exec(text)) !== null) last = m;
  if (last) {
    return {passed: parseInt(last[1], 10), failed: last[2] ? parseInt(last[2], 10) : 0};
  }
  const passed = /(\d+)\s+passed/.exec(text);
  const failed = /(\d+)\s+failed/.exec(text);
  if (passed || failed) {
    return {
      passed: passed ? parseInt(passed[1], 10) : 0,
      failed: failed ? parseInt(failed[1], 10) : 0,
    };
  }
  return null;
}

/**
 * The directory a command ran in: a leading `cd <dir> &&` wins over the
 * hook's own cwd, since a lane `cd`s into its worktree in every call.
 */
function commandDir(command, cwd) {
  const m = /^\s*cd\s+("([^"]+)"|'([^']+)'|(\S+))\s*(&&|;)/.exec(command);
  if (!m) return cwd;
  const dir = nativePath(m[2] || m[3] || m[4]);
  return path.isAbsolute(dir) ? dir : path.join(cwd || '', dir);
}

/**
 * The tail of the file a command redirected its output to, when it did -- a
 * test run sent to a log prints nothing to the tool result, and the counts
 * are in the log. Only the last 64KB, and only to read the counts.
 */
function redirectedTail(command, dir) {
  const m = /(?:^|[^0-9&])>\s*("([^"]+)"|'([^']+)'|([^\s;&|<>]+))/.exec(command);
  if (!m) return null;
  const target = nativePath(m[2] || m[3] || m[4]);
  if (target === '/dev/null' || /^&/.test(target)) return null;
  const file = path.isAbsolute(target) ? target : path.join(dir || '', target);
  try {
    const size = fs.statSync(file).size;
    const len = Math.min(size, 65536);
    const fd = fs.openSync(file, 'r');
    try {
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, size - len);
      return buf.toString('utf8');
    } finally {
      fs.closeSync(fd);
    }
  } catch (_) {
    return null;
  }
}

function responseText(resp) {
  if (!resp) return '';
  if (typeof resp === 'string') return resp;
  return [resp.stdout, resp.stderr, resp.output]
      .filter((x) => typeof x === 'string')
      .join('\n');
}

function evidenceStep(text) {
  const req = /REQ-\d+/.exec(text);
  const outcome = /"?outcome"?\s*[:=]\s*"?(met|failed)/i.exec(text);
  return {
    kind: 'evidence',
    summary: `Reported evidence${req ? ` for ${req[0]}` : ''}` +
        `${outcome ? ` (${outcome[1].toLowerCase()})` : ''}`,
    files: [],
  };
}

function shellStep(input, resp, cwd) {
  const command = (input && input.command) || '';
  const description = (input && input.description) || '';
  if (!command) return null;
  const dir = commandDir(command, cwd);

  if (/\breport_evidence\b/.test(command)) return evidenceStep(command);

  const reintroducing = REINTRODUCTION.test(description) ||
      REINTRODUCTION.test(command);
  if (TEST_RUN.test(command)) {
    const files = testFilesIn(command, dir);
    const counts = testCounts(responseText(resp)) ||
        testCounts(redirectedTail(command, dir));
    let summary = reintroducing
        ? 'Ran tests with a defect put back'
        : 'Ran tests';
    if (files.length) summary += `: ${files.join(', ')}`;
    if (counts) {
      summary += ` (${counts.passed} passed` +
          `${counts.failed ? `, ${counts.failed} failed` : ''})`;
    }
    return {
      kind: reintroducing ? 'reintroduction' : 'test_run',
      summary,
      files,
      tests_passed: counts ? counts.passed : undefined,
      tests_failed: counts ? counts.failed : undefined,
    };
  }
  if (reintroducing) {
    const files = sourceFilesIn(command, dir);
    return {
      kind: 'reintroduction',
      summary: 'Put a defect back to prove a test' +
          `${files.length ? `: ${files.join(', ')}` : ''}`,
      files,
    };
  }
  if (/\bgit\b[^|&;]*\bcommit\b/.test(command)) {
    return {kind: 'other', summary: 'Made a commit', files: []};
  }
  if (/\bgit\b[^|&;]*\bpush\b/.test(command)) {
    return {kind: 'other', summary: 'Pushed the branch', files: []};
  }
  if (/\bgh\s+pr\s+create\b/.test(command)) {
    return {kind: 'other', summary: 'Opened a pull request', files: []};
  }
  // Anything else could say anything; it is not summarised, so not sent.
  return null;
}

/** One step for this tool call, or null when it is not one worth sending. */
function summarise(payload) {
  const tool = payload.tool_name || '';
  const input = payload.tool_input || {};
  const cwd = payload.cwd || process.cwd();

  const onePath = (verb, p) => {
    const shown = shownPath(p, cwd);
    return shown ? {summary: `${verb} ${shown}`, files: [shown]} : null;
  };

  switch (tool) {
    case 'Read': {
      const s = onePath('Read', input.file_path);
      return s && {kind: 'read', ...s};
    }
    case 'Edit':
    case 'MultiEdit': {
      const s = onePath('Edited', input.file_path);
      return s && {kind: 'edit', ...s};
    }
    case 'Write': {
      const s = onePath('Wrote', input.file_path);
      return s && {kind: 'edit', ...s};
    }
    case 'NotebookEdit': {
      const s = onePath('Edited notebook', input.notebook_path);
      return s && {kind: 'edit', ...s};
    }
    case 'Grep':
    case 'Glob': {
      // The pattern is not named: it is the one part of a search that could
      // be anything.
      const where = input.path ? shownPath(input.path, cwd) : null;
      return {
        kind: 'read',
        summary: where ? `Searched ${where}` : 'Searched the project',
        files: where ? [where] : [],
      };
    }
    case 'Bash':
    case 'PowerShell':
      return shellStep(input, payload.tool_response, cwd);
    default:
      break;
  }
  const meridian = /^mcp__[^_]*meridian[^_]*__(\w+)$/.exec(tool);
  if (meridian) {
    if (meridian[1] === 'report_evidence') {
      return evidenceStep(JSON.stringify(input));
    }
    if (meridian[1] === 'report_session_activity') return null;
    return {kind: 'other', summary: `Called Meridian ${meridian[1]}`, files: []};
  }
  return null;
}

/** The step, or null when any part of it looks like it carries a secret. */
function safe(step) {
  if (!step || !step.summary) return null;
  if (/[\r\n]/.test(step.summary)) return null;
  for (const text of [step.summary, ...(step.files || [])]) {
    if (SECRET_SHAPES.some((r) => r.test(text))) return null;
  }
  if (step.summary.length > SUMMARY_MAX) {
    step.summary = `${step.summary.slice(0, SUMMARY_MAX - 1)}…`;
  }
  return step;
}

function due(state, now) {
  if (state.pending.length === 0) return false;
  if (state.pending.length >= FLUSH_AT) return true;
  if (state.pending.some((s) => URGENT.has(s.kind))) return true;
  return state.firstPendingAt !== null &&
      now - state.firstPendingAt >= FLUSH_AFTER_MS;
}

async function main() {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch (_) {
    return die();
  }

  const file = stateFile(payload);
  const state = readState(file);
  const now = Date.now();

  let step = null;
  try {
    step = safe(summarise(payload));
  } catch (_) {
    step = null;
  }
  if (step) {
    state.seq += 1;
    step.seq = state.seq;
    step.at = new Date(now).toISOString();
    for (const k of Object.keys(step)) {
      if (step[k] === undefined) delete step[k];
    }
    if (step.files && step.files.length === 0) delete step.files;
    state.pending.push(step);
    if (state.pending.length > PENDING_MAX) {
      state.pending.splice(0, state.pending.length - PENDING_MAX);
    }
    if (state.firstPendingAt === null) state.firstPendingAt = now;
  }

  if (!due(state, now)) {
    writeState(file, state);
    return die();
  }

  const session = findSession(transcriptFor(payload), state);
  let cfg = null;
  try {
    cfg = readConfig('report-session-activity');
  } catch (_) {
    cfg = null;
  }
  if (!session || !cfg) {
    writeState(file, state);
    return die();
  }

  const batch = state.pending.slice(0, 50);
  const reply = await callToolText(cfg, 'report_session_activity',
      {session_id: session, steps: batch}, 3000);
  if (reply.status === 200) {
    // Taken, or refused (an unknown session): either way not sent again.
    state.pending = state.pending.slice(batch.length);
    state.firstPendingAt = state.pending.length ? now : null;
  }
  // Anything else -- unreachable, a 401 -- keeps the queue for next time.
  writeState(file, state);
  return die();
}

if (require.main === module) {
  main().catch(() => die());
}

module.exports = {summarise, safe, testCounts, shownPath};
