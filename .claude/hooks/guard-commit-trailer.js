// PreToolUse guard: a commit without its requirement line, or a squash merge,
// is refused BEFORE it lands (REQ-2015).
//
// WHY A HOOK. Five documents used to explain that a commit must carry a
// `Meridian-Req:` line, that one blank line above `Co-Authored-By:` voids it,
// and that a squash throws away the proof. People and agents still got it
// wrong, because nothing checked, and the message reads correctly either way.
// Git's own parser is the only judge, so this asks it.
//
// WHAT IS REFUSED, and only inside an OPEN Meridian session (the transcript
// holds a `Session started  {session_id: ...}` reply, the same signal
// `report-session-activity.js` reads):
//
//   * `git commit -m/-F ...` whose message has no `Meridian-Req:` or
//     `Meridian-Phase:` line that `git interpret-trailers` parses. When the
//     line is IN the text but not parsed (the blank-line case) the reason
//     names that line, which is what a grep for the key can never say.
//   * `git commit --amend` of a commit a remote-tracking branch already holds.
//     Fix it forward: the new sha stales every check recorded on the old one.
//   * `gh pr merge --squash` / `--rebase` (and `-s` / `-r`), and
//     `git merge --squash`. Evidence binds to a sha, and a squash gives the
//     branch a new one.
//
// WHAT IS NEVER REFUSED
//
//   * A commit that concludes a merge (MERGE_HEAD exists), and `git merge`
//     itself. A merge of the base branch carries NO trailer on purpose: with
//     one, every file the merge brought in joins the card's footprint and its
//     proof goes stale.
//   * A commit whose message this cannot see: an editor, `-C`, `--no-edit`,
//     `-F -` fed by a pipe, a message built by command substitution. A hook
//     that guesses blocks good commits; one that cannot decide lets them by.
//   * Anything outside an open session. This is not a repository-wide policy.
//   * Anything when Meridian is closed, git errors, or the command will not
//     parse. Fails OPEN, always: exit 0. The never-block contract of every
//     other hook here.
//
// A heredoc message (`-F - <<'EOF'`, `-m "$(cat <<'EOF' ... EOF)"`) is read:
// the body is lifted out of the command first, then used as the message.
//
// BYPASS. A person sets `MERIDIAN_ALLOW_UNTRAILERED=1` in the command's
// environment (`MERIDIAN_ALLOW_UNTRAILERED=1 git commit ...`). The hook then
// lets the commit through AND says so in what the agent reads, so the agent
// reports it. Agents are told in `meridian-session` not to set it.
//
// A REF THAT NAMES NO CARD is a warning, never a refusal, and only when
// Meridian answers: the commit still has its line.

'use strict';

const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');

const BYPASS = 'MERIDIAN_ALLOW_UNTRAILERED';
const SESSION_STARTED = /Session started\s+\{session_id:\s*([0-9a-fA-F-]{36})\}/;
const TRAILER_KEYS = ['meridian-req', 'meridian-phase'];

// ---------------------------------------------------------------- tokeniser

/** Every closed heredoc in [command]: its body, with the body cut out. */
function liftHeredocs(command) {
  const lines = String(command).split(/\r?\n/);
  const op = /(^|[^<])<<(?!<)(-?)[ \t]*(?:'([^'\n]*)'|"([^"\n]*)"|\\([A-Za-z0-9_.-]+)|([A-Za-z0-9_.-]+))/g;
  const kept = [];
  const bodies = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    kept.push(line);
    const pending = [];
    op.lastIndex = 0;
    let m;
    while ((m = op.exec(line)) !== null) {
      const delim = m[3] ?? m[4] ?? m[5] ?? m[6];
      if (delim) pending.push({delim, dash: m[2] === '-'});
    }
    i++;
    for (const p of pending) {
      let j = i;
      const body = [];
      let closed = false;
      while (j < lines.length) {
        const l = p.dash ? lines[j].replace(/^\t+/, '') : lines[j];
        if (l === p.delim) {
          closed = true;
          break;
        }
        body.push(lines[j]);
        j++;
      }
      if (!closed) continue;
      bodies.push(body.join('\n'));
      kept.push(lines[j]); // keep the terminator so `$(cat <<'EOF'\nEOF\n)` still balances
      i = j + 1;
    }
  }
  return {stripped: kept.join('\n'), bodies};
}

/**
 * Split [command] into segments of words, honouring quotes. A word is
 * `{text, raw}`; `raw` is true when any part of it was quoted. Operators
 * (`&&`, `||`, `;`, `|`, `&`, newline, parentheses) end a segment.
 */
function segments(command) {
  const out = [];
  let words = [];
  let cur = '';
  let has = false;
  let quoted = false;
  const flush = () => {
    if (has) words.push({text: cur, quoted});
    cur = '';
    has = false;
    quoted = false;
  };
  const end = () => {
    flush();
    if (words.length) out.push(words);
    words = [];
  };
  const s = String(command);
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && i + 1 < s.length) {
      if (s[i + 1] === '\n') {
        i++;
        continue;
      }
      cur += s[++i];
      has = true;
    } else if (c === "'") {
      quoted = has = true;
      const close = s.indexOf("'", i + 1);
      if (close < 0) return null;
      cur += s.slice(i + 1, close);
      i = close;
    } else if (c === '$' && s[i + 1] === "'") {
      quoted = has = true;
      let j = i + 2;
      for (; j < s.length && s[j] !== "'"; j++) {
        if (s[j] === '\\' && j + 1 < s.length) {
          const n = s[++j];
          cur += n === 'n' ? '\n' : n === 't' ? '\t' : n === 'r' ? '\r' : n;
        } else {
          cur += s[j];
        }
      }
      if (j >= s.length) return null;
      i = j;
    } else if (c === '"') {
      quoted = has = true;
      let j = i + 1;
      for (; j < s.length && s[j] !== '"'; j++) {
        if (s[j] === '\\' && j + 1 < s.length && '"\\$`\n'.includes(s[j + 1])) {
          if (s[j + 1] !== '\n') cur += s[j + 1];
          j++;
        } else if (s[j] === '$' && s[j + 1] === '(') {
          // Keep a command substitution whole, quotes and all.
          let depth = 0;
          let k = j + 1;
          for (; k < s.length; k++) {
            if (s[k] === '(') depth++;
            if (s[k] === ')' && --depth === 0) break;
          }
          if (k >= s.length) return null;
          cur += s.slice(j, k + 1);
          j = k;
        } else {
          cur += s[j];
        }
      }
      if (j >= s.length) return null;
      i = j;
    } else if (c === '\n' || c === ';' || c === '(' || c === ')' || c === '`') {
      end();
    } else if (c === '|' || (c === '&' && !'<>'.includes(s[i - 1] || '') && s[i + 1] !== '>')) {
      end();
      if (s[i + 1] === c) i++;
    } else if (c === ' ' || c === '\t' || c === '\r') {
      flush();
    } else if (c === '$' && s[i + 1] === '(') {
      end();
      i++;
    } else {
      cur += c;
      has = true;
    }
  }
  end();
  return out;
}

// ---------------------------------------------------------------- the command

function nativePath(p) {
  if (process.platform === 'win32') {
    const m = /^\/([a-zA-Z])\/(.*)$/.exec(p);
    if (m) return `${m[1].toUpperCase()}:/${m[2]}`;
  }
  return p;
}

function resolveDir(base, target) {
  const t = nativePath(target);
  return path.isAbsolute(t) ? t : path.resolve(base, t);
}

/**
 * What the command does that this hook cares about: a list of
 * `{kind: 'commit'|'squash', ...}` in order, plus whether the bypass was set.
 * Null when the command cannot be parsed (the caller allows it).
 */
function analyse(command, startDir) {
  const {stripped, bodies} = liftHeredocs(command);
  const segs = segments(stripped);
  if (segs === null) return null;
  const found = [];
  let bypass = false;
  let dir = startDir;
  let bodyUsed = 0;
  for (const words of segs) {
    let i = 0;
    // Leading `VAR=value` words and `export`/`env`.
    while (i < words.length &&
        (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i].text) ||
            ['export', 'env', 'command'].includes(words[i].text))) {
      if (words[i].text === `${BYPASS}=1`) bypass = true;
      i++;
    }
    const head = words[i] && words[i].text;
    if (head === 'cd' && words[i + 1]) {
      dir = resolveDir(dir, words[i + 1].text);
      continue;
    }
    if (head === 'gh' && words[i + 1] && words[i + 1].text === 'pr' &&
        words[i + 2] && words[i + 2].text === 'merge') {
      const flags = words.slice(i + 3).map((w) => w.text);
      const bad = flags.find((f) => ['--squash', '--rebase', '-s', '-r'].includes(f));
      if (bad) found.push({kind: 'squash', via: `gh pr merge ${bad}`});
      continue;
    }
    if (head !== 'git') continue;
    let j = i + 1;
    let cwd = dir;
    while (j < words.length && words[j].text.startsWith('-')) {
      const f = words[j].text;
      if (f === '-C' && words[j + 1]) {
        cwd = resolveDir(cwd, words[j + 1].text);
        j += 2;
      } else if (['-c', '--git-dir', '--work-tree', '--namespace'].includes(f)) {
        j += 2;
      } else {
        j++;
      }
    }
    const sub = words[j] && words[j].text;
    const args = words.slice(j + 1).map((w) => w.text);
    if (sub === 'merge') {
      if (args.includes('--squash')) found.push({kind: 'squash', via: 'git merge --squash'});
    } else if (sub === 'commit') {
      found.push(commitFacts(args, cwd, bodies, () => bodies[bodyUsed++]));
    }
  }
  return {found, bypass};
}

/** The message and shape of one `git commit` from its arguments. */
function commitFacts(args, cwd, bodies, nextBody) {
  const parts = [];
  let undecidable = false;
  let amend = false;
  let usesFileStdin = false;
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    let value = null;
    if (a === '--amend') {
      amend = true;
      continue;
    }
    else if (a === '--no-edit') continue;
    else if (['-C', '-c', '--reuse-message', '--reedit-message', '-t', '--template'].includes(a)) {
      // The message is in a commit or file the command only names.
      k++;
      undecidable = true;
      continue;
    } else if (/^--(reuse|reedit)-message=/.test(a)) {
      undecidable = true;
      continue;
    } else if (a === '-F' || a === '--file') {
      value = args[++k];
      if (value === '-') {
        usesFileStdin = true;
        const body = nextBody();
        if (body === undefined) undecidable = true;
        else parts.push(body);
        continue;
      }
      try {
        parts.push(fs.readFileSync(resolveDir(cwd, value), 'utf8'));
      } catch (_) {
        undecidable = true;
      }
      continue;
    } else if (a.startsWith('--file=')) {
      value = a.slice(7);
      if (value === '-') {
        usesFileStdin = true;
        const body = nextBody();
        if (body === undefined) undecidable = true;
        else parts.push(body);
      } else {
        try {
          parts.push(fs.readFileSync(resolveDir(cwd, value), 'utf8'));
        } catch (_) {
          undecidable = true;
        }
      }
      continue;
    } else if (a === '--message') value = args[++k];
    else if (a.startsWith('--message=')) value = a.slice(10);
    else if (/^-[A-Za-z]*m$/.test(a)) value = args[++k];
    else if (/^-m./.test(a)) value = a.slice(2);
    else continue;
    if (value === undefined) {
      undecidable = true;
      continue;
    }
    const sub = /^\$\(\s*cat\s*<<-?\s*['"\\]?[A-Za-z0-9_.-]+['"]?\s*\n[\s\S]*\)$/.exec(value);
    if (sub) {
      const body = nextBody();
      if (body === undefined) undecidable = true;
      else parts.push(body.replace(/\n+$/, ''));
    } else if (value.includes('$(') || value.includes('`')) {
      undecidable = true;
    } else {
      parts.push(value);
    }
  }
  const message = parts.length === 0 ? null : parts.join('\n\n') + '\n';
  return {
    kind: 'commit',
    cwd,
    amend,
    message: undecidable ? null : message,
    usesFileStdin,
  };
}

// ---------------------------------------------------------------- git facts

function git(args, cwd, input) {
  return execFileSync('git', args, {
    cwd,
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
    timeout: 5000,
  });
}

/** True when a merge is in progress: the commit concludes it. */
function mergeInProgress(cwd) {
  try {
    git(['rev-parse', '-q', '--verify', 'MERGE_HEAD'], cwd);
    return true;
  } catch (_) {
    return false;
  }
}

/** True when a remote-tracking branch already holds HEAD. */
function headIsPushed(cwd) {
  try {
    return git(['branch', '-r', '--contains', 'HEAD'], cwd).trim() !== '';
  } catch (_) {
    return false;
  }
}

/** The `Key: value` lines git parses as trailers in [message]. */
function parsedTrailers(message, cwd) {
  const out = git(['interpret-trailers', '--only-trailers', '--only-input', '--unfold'], cwd, message);
  return out.split(/\r?\n/).filter(Boolean);
}

function hasKey(trailerLines) {
  return trailerLines.some((l) => TRAILER_KEYS.includes(l.split(':')[0].trim().toLowerCase()));
}

// ---------------------------------------------------------------- verdicts

function missingReason() {
  return 'This commit message has no Meridian-Req line, so Meridian will ' +
      'attribute the commit to nothing and nothing will tell you. End the ' +
      'message with "Meridian-Req: REQ-n" (or "Meridian-Phase: <workstream>" ' +
      'for work with no requirement of its own), in the same last block as ' +
      'any Co-Authored-By line with no blank line between them. A commit ' +
      'that concludes a merge of the base branch carries none and is not ' +
      'checked. (REQ-2015)';
}

function voidedReason(message) {
  const lines = message.replace(/\s+$/, '').split('\n');
  const at = lines.findIndex((l) => /^\s*meridian-(req|phase)\s*:/i.test(l));
  const named = lines[at].trim();
  let after = null;
  for (let k = at + 1; k < lines.length; k++) {
    if (lines[k].trim() === '') {
      for (let m = k + 1; m < lines.length; m++) {
        if (lines[m].trim() !== '') {
          after = lines[m].trim();
          break;
        }
      }
      break;
    }
  }
  const why = after
      ? `a blank line separates it from the last block, which starts "${after}"`
      : 'it is not in the last block of "Key: value" lines';
  return `Line ${at + 1} of the message, "${named}", is there but git does ` +
      `not read it as a trailer: ${why}. Git reads trailers only in the ` +
      'last contiguous block, so this commit would be attributed to ' +
      'nothing even though the message reads correctly. Move it into that ' +
      'block with no blank line between it and Co-Authored-By. (REQ-2015)';
}

const AMEND_REASON =
    'This amends a commit that a remote branch already holds. The new sha ' +
    'makes every acceptance check recorded against the old one go stale, ' +
    'and the branch diverges. Fix it forward with a new commit instead. ' +
    '(REQ-2015)';

function squashReason(via) {
  return `${via} is refused while a Meridian session is open. Evidence ` +
      'binds to the commit it was proved against, and a squash or a ' +
      'rebase-merge gives the branch brand-new shas, so every check ' +
      'recorded against the originals goes stale at the merge, silently, ' +
      'with a green suite. Merge with "gh pr merge --merge". If the ' +
      "repository's only allowed method is squash, say so before opening " +
      'the PR. (REQ-2015)';
}

/**
 * The decision for one command: `{deny}` with a reason, `{note}` with
 * something for the agent to read, or `{}` to stay silent. Never throws.
 * [sessionOpen] is injected so a test needs no transcript.
 */
function decide(command, cwd, sessionOpen) {
  if (!sessionOpen) return {};
  const a = analyse(command, cwd);
  if (!a) return {};
  for (const f of a.found) {
    if (f.kind === 'squash') return {deny: squashReason(f.via)};
  }
  const notes = [];
  for (const f of a.found) {
    if (f.kind !== 'commit') continue;
    // A commit that concludes a merge carries no trailer, by design.
    if (mergeInProgress(f.cwd)) continue;
    if (a.bypass) {
      notes.push(`${BYPASS}=1 was set, so this commit was NOT checked for ` +
          'its Meridian-Req line. Tell the user you used it.');
      continue;
    }
    if (f.amend && headIsPushed(f.cwd)) return {deny: AMEND_REASON};
    if (f.message === null) continue; // cannot see it; do not guess
    let trailers;
    try {
      trailers = parsedTrailers(f.message, f.cwd);
    } catch (_) {
      continue;
    }
    if (hasKey(trailers)) {
      const ref = trailers
          .map((l) => /^meridian-req\s*:\s*(REQ-\d+)/i.exec(l))
          .find(Boolean);
      if (ref) notes.push({ref: ref[1].toUpperCase()});
      continue;
    }
    if (/^\s*meridian-(req|phase)\s*:/im.test(f.message)) {
      return {deny: voidedReason(f.message)};
    }
    return {deny: missingReason()};
  }
  return {notes};
}

// ---------------------------------------------------------------- session

/** True when the transcript holds a `Session started` reply. */
function sessionOpen(payload) {
  let file = payload.agent_transcript_path;
  if (!file && payload.transcript_path) {
    file = payload.agent_id
        ? path.join(path.dirname(payload.transcript_path),
            path.basename(payload.transcript_path, '.jsonl'),
            'subagents', `agent-${payload.agent_id}.jsonl`)
        : payload.transcript_path;
  }
  if (!file) return false;
  try {
    return SESSION_STARTED.test(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return false;
  }
}

// ---------------------------------------------------------------- main

/** Warn when [ref] resolves to no requirement; silent when Meridian is closed. */
async function refWarning(ref) {
  if (process.env.MERIDIAN_TRAILER_GUARD_OFFLINE) return null;
  try {
    const mcp = require(path.join(__dirname, 'meridian-mcp.js'));
    const cfg = mcp.readConfig('guard-commit-trailer');
    if (!cfg) return null;
    const r = await mcp.callToolText(cfg, 'get_requirement', {id: ref}, 2500);
    if (r.status === 200 && r.text === null) {
      return `${ref} matched no requirement in Meridian. The commit still ` +
          'has its Meridian-Req line, but check the number.';
    }
  } catch (_) {
    // Cannot ask. Say nothing.
  }
  return null;
}

module.exports = {decide, analyse, liftHeredocs, segments};

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => (raw += c));
  process.stdin.on('end', async () => {
    try {
      const payload = JSON.parse(raw);
      if (!payload || payload.tool_name !== 'Bash') process.exit(0);
      const command = payload.tool_input && payload.tool_input.command;
      if (typeof command !== 'string') process.exit(0);
      // Cheap exit before reading a transcript: most commands are neither.
      if (!/\bgit\b|\bgh\b/.test(command) || !/\b(commit|merge)\b/.test(command)) {
        process.exit(0);
      }
      const cwd = nativePath(payload.cwd || process.cwd());
      const v = decide(command, cwd, sessionOpen(payload));
      if (v.deny) {
        process.stdout.write(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: v.deny,
          },
        }));
        process.exit(0);
      }
      const lines = [];
      for (const n of v.notes || []) {
        if (typeof n === 'string') lines.push(n);
        else if (n.ref) {
          const w = await refWarning(n.ref);
          if (w) lines.push(w);
        }
      }
      if (lines.length) {
        process.stdout.write(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            additionalContext: lines.join(' '),
          },
        }));
      }
    } catch (_) {
      // Fail open.
    }
    process.exit(0);
  });
}
