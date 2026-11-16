#!/usr/bin/env node
// Session-start step (REQ-1402): offer the person a card for this work.
//
// Runs on Claude Code's SessionStart. It asks the running Meridian app for up
// to five open cards on the components this branch changes (`suggest_cards`)
// and hands the list to the agent as context, so the agent asks the person
// which card this session is for and opens the session itself -- nobody has
// to call begin_session by hand. Choosing none is allowed and is recorded by
// the agent (`declined_card`), never a block.
//
// **It never blocks and never fails loudly.** Meridian closed, not signed in,
// not a git repo, git slow, a refused call: every one of those exits 0 with
// no output, and the session starts exactly as it would have without this
// hook. It prints nothing but the server's own list -- never the token, and
// never the remote URL, which can carry credentials; that URL is sent to the
// local app only, with any user:password@ part removed first.

'use strict';

const {execFileSync} = require('child_process');
const {readConfig, callToolText} = require('./meridian-mcp');

function git(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    }).trim();
  } catch (_) {
    return '';
  }
}

/** `https://user:secret@host/x.git` -> `https://host/x.git`. */
function withoutCredentials(url) {
  return url.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^@/]*@/i, '$1');
}

/** Files this branch changes against its upstream base, plus uncommitted. */
function changedFiles(cwd) {
  const files = new Set();
  const base = git(['merge-base', 'HEAD', 'origin/HEAD'], cwd) ||
      git(['merge-base', 'HEAD', 'origin/main'], cwd) ||
      git(['merge-base', 'HEAD', 'origin/master'], cwd);
  const lists = [
    base ? git(['diff', '--name-only', base, 'HEAD'], cwd) : '',
    git(['diff', '--name-only', 'HEAD'], cwd),
    git(['ls-files', '--others', '--exclude-standard'], cwd),
  ];
  for (const list of lists) {
    for (const f of list.split(/\r?\n/)) {
      if (f.trim()) files.add(f.trim());
    }
  }
  return [...files].slice(0, 500);
}

/**
 * The checkout this session runs in, as the line handed to the agent
 * (REQ-1670). `begin_session` takes `worktree` and `branch` so the time a
 * session spends waiting for the shared test run can be taken out of how long
 * it took; the agent should not have to run git to find them. Empty when git
 * cannot say, so a detached head or a failed call adds nothing.
 */
function checkoutLine(cwd) {
  const worktree = git(['rev-parse', '--show-toplevel'], cwd);
  if (!worktree) return '';
  const branch = git(['branch', '--show-current'], cwd);
  return 'When you call begin_session, pass worktree: ' +
      JSON.stringify(worktree) +
      (branch ? ' and branch: ' + JSON.stringify(branch) : '') +
      ' so time spent waiting for the shared test run can be taken out of ' +
      'how long this work took.';
}

function readStdin() {
  try {
    return JSON.parse(require('fs').readFileSync(0, 'utf8') || '{}');
  } catch (_) {
    return {};
  }
}

async function main() {
  const input = readStdin();
  // A resumed or compacted conversation already had its chance.
  if (input.source && input.source !== 'startup' && input.source !== 'clear') {
    return;
  }
  const cfg = readConfig('meridian-session-start');
  if (!cfg) return;
  const cwd = input.cwd || process.cwd();
  if (git(['rev-parse', '--is-inside-work-tree'], cwd) !== 'true') return;
  const remote = withoutCredentials(git(['remote', 'get-url', 'origin'], cwd));
  const {text} = await callToolText(cfg, 'suggest_cards', {
    changed_files: changedFiles(cwd),
    ...(remote ? {repository_url: remote} : {}),
    limit: 5,
  }, 4000);
  if (!text) return;
  const checkout = checkoutLine(cwd);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: checkout ? text + '\n\n' + checkout : text,
    },
  }));
}

module.exports = {withoutCredentials, changedFiles, checkoutLine};

if (require.main === module) {
  main().catch(() => {}).finally(() => process.exit(0));
}
