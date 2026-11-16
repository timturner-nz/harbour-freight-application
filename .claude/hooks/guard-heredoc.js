// PreToolUse guard: refuse a Bash heredoc that would run the code it carries.
//
// `cat > f <<EOF` hands the body to the shell for expansion. Anything in
// backticks is RUN, and its output pasted into the file in its place. That is
// how a doc comment's `` `id` `` once became the output of the POSIX `id`
// command inside a committed Dart file (REQ-948), and nothing warned: the
// command exited 0, the file read plausibly, and the only way anyone found out
// was reading the bytes back. Most backtick spans in prose name something that
// is not a command at all, so they expand to NOTHING and the sentence silently
// loses a word -- a shape no scanner over the committed file can ever see.
// The mechanism is only visible here, at write time. (REQ-951)
//
// ## What is refused, and what is not -- each boundary measured, not assumed
//
// REFUSED: an UNQUOTED delimiter (`<<EOF`, `<<-EOF`) whose body holds a
// backtick or a `$(` -- the two ways a body RUNS a command. Verified on this
// machine's Git Bash (5.2.37): both ran. `$((` is arithmetic and runs
// nothing, so it is not counted.
//
// ALLOWED: any QUOTED delimiter -- `<<'EOF'`, `<<"EOF"`, `<<\EOF`. POSIX says
// quoting ANY part of the word turns expansion off for the whole body, and
// that is what this shell does: `<<"EOF"` with `` `echo X` ``, `$(echo X)` and
// `$HOME` in the body printed all three literally. The requirement assumed the
// double-quoted form behaves like a double-quoted string and substitutes; it
// does not, so refusing it would refuse a safe command.
//
// ALLOWED: `$VAR` / `${VAR}` in an unquoted body. That is parameter
// expansion, it runs nothing, and it is WHY people leave a delimiter
// unquoted -- to put a worktree path into a Python edit script.
//
// Counted, not chosen on principle: 87,636 Bash commands across this
// repository's 1,071 Claude Code transcripts on 2026-09-24, parsed by this
// file's own `heredocs()`. 10,050 heredocs; 10,021 quoted, 29 unquoted. Of
// the 29: 27 carry `$VAR`, 5 carry a backtick, 0 carry `$(` (the census's
// one hit was the probe that measured this shell, not ordinary use). So
// refusing `$(` costs nothing that was measured, and closes the other half
// of the mechanism; refusing `$VAR` would fire on nearly every unquoted
// heredoc anyone writes here and protect against nothing that runs. All 5
// backtick cases were `python - <<PY` edit scripts left unquoted for a `$W`
// path, carrying Dart doc comments -- the exact shape REQ-948 shipped.
//
// NOT this hook's problem: a backslash collapsing (`\\` to `\`). Measured the
// same day, that happens under `<<'EOF'` and inside a plain single-quoted
// `printf` argument alike, so it is done to the command before any shell
// quoting applies. No heredoc rule can see it; the Write tool plus a byte
// check (CLAUDE.md) is the answer to that one.
//
// Node rather than a shell one-liner for the reason guard-main-checkout.js
// gives: no jq here, and hand-parsing JSON with sed is how a guard fails open.
// Fails OPEN on a payload it cannot read -- a guard that blocks every command
// when its input changes shape is one everybody disables.

/** Every heredoc in [command]: `{delim, quoted, body}`, in order.
 *
 * A heredoc counts only when its terminator line actually appears. That is
 * what keeps `<<` inside a string (`echo "a << b"`), a merge-conflict marker
 * (`<<<<<<< HEAD`) or a here-string (`<<<`) from being read as one: none of
 * them is followed by a line holding only the would-be delimiter. And a body,
 * once consumed, is never scanned for operators -- a quoted Python heredoc
 * whose text mentions `<<EOF` is literal, and so is everything in it. */
function heredocs(command) {
  const lines = String(command).split(/\r?\n/);
  const op = /(^|[^<])<<(?!<)(-?)[ \t]*(?:'([^'\n]*)'|"([^"\n]*)"|\\([A-Za-z0-9_.-]+)|([A-Za-z0-9_.-]+))/g;
  const found = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const pending = [];
    op.lastIndex = 0;
    let m;
    while ((m = op.exec(line)) !== null) {
      const dash = m[2] === '-';
      const quoted = m[3] !== undefined || m[4] !== undefined || m[5] !== undefined;
      const delim = m[3] ?? m[4] ?? m[5] ?? m[6];
      if (delim) pending.push({delim, dash, quoted});
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
      if (!closed) continue; // not a heredoc; its "body" is ordinary lines
      found.push({delim: p.delim, quoted: p.quoted, body: body.join('\n')});
      i = j + 1;
    }
  }
  return found;
}

/** The refusal reason for [command], or null to allow it. */
function verdict(command) {
  for (const h of heredocs(command)) {
    if (h.quoted) continue;
    if (h.body.includes('`') || /\$\((?!\()/.test(h.body)) {
      return (
        `This heredoc's delimiter is unquoted (<<${h.delim}), so the shell ` +
        'runs every `backtick span` and $(...) in its body and writes the ' +
        'output in its place -- a span naming no command just vanishes. ' +
        'Quote the delimiter ' +
        `as <<'${h.delim}' so the body is written literally, or write the ` +
        'file with the Write tool instead. (REQ-951)'
      );
    }
  }
  return null;
}

module.exports = {heredocs, verdict};

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => (raw += c));
  process.stdin.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (_) {
      process.exit(0);
    }
    if (!payload || payload.tool_name !== 'Bash') process.exit(0);
    const command = payload.tool_input && payload.tool_input.command;
    if (typeof command !== 'string') process.exit(0);
    const reason = verdict(command);
    if (reason) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: reason,
          },
        }),
      );
    }
    process.exit(0);
  });
}
