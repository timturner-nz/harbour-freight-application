// Talking to Meridian's embedded MCP server from a hook.
//
// Extracted so `close-meridian-session.js` does not carry a second copy of the
// config reader that `report-commit-tokens.js` already had — and the base64
// trap below is the reason a second copy would be expensive: it failed
// SILENTLY for weeks the first time, because a hook that fails open and sends
// a wrong token looks exactly like a hook that is not running.
//
// REQ-1552: this module is now the ONE place the bearer is read. It holds the
// credential-store route and the `mer_mcp_` shape guard that REQ-701 first put
// in `report-commit-tokens.js`; that hook calls [resolveConfig] here instead of
// carrying a copy. Until then this file returned the prefs value
// `@secret-store` as the bearer, and three hooks were refused by Meridian on
// every call from 5 September, silently, because a hook that fails open and
// sends a wrong token looks exactly like a hook that is not running.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const {execFileSync} = require('child_process');

// Every bearer the loopback server enforces is minted by `generateMcpToken`
// (`lib/mcp/mcp_local_token.dart`) and by nothing else — `mer_mcp_` plus 24
// characters, 32 in all. Every write of `mcp.token` in the app goes through
// that one generator, so a value failing this prefix is not a token somebody
// mistyped: it is not a token at all, and sending it can only ever 401.
const TOKEN_PREFIX = 'mer_mcp_';

// What `user_preferences.json` holds where a secret used to be, since REQ-516
// moved them out — `secretStoreReference` in
// `lib/core/secrets/secret_migration.dart`. Thirteen characters, by design,
// and the exact string this hook sent as a password for six days.
const SECRET_STORE_REFERENCE = '@secret-store';

// How the app files this machine's MCP token in the OS credential store.
// `secretServiceName` (`lib/core/secrets/native_secret_store.dart`) is the
// service; the key is `UserPreferences.storeKeyFor(SettingsKeys.mcpToken)`,
// which is `pref.` + the preference name. Both halves are asserted against
// their Dart originals in `test/hooks/token_hook_wiring_test.dart`, because a
// rename on either side is exactly what put this hook where REQ-701 found it.
const SECRET_SERVICE = 'Meridian';
const SECRET_KEY = 'pref.mcp.token';

// A credential read must never hold up a commit either. Generous, because
// PowerShell + `Add-Type` measured 2.3s on this machine (0.8s under `pwsh`),
// and a machine under load is slower still.
const STORE_READ_TIMEOUT_MS = 20000;

// The port Meridian's MCP server listens on when the prefs name none. Lost
// in 3ed70030 (REQ-1552), which moved the config read here: every hook then
// threw `DEFAULT_PORT is not defined` on a machine whose prefs carry no
// mcp.port, so nothing was sent from 4 October until this was restored.
const DEFAULT_PORT = 9822;

/**
 * Every path this hook would accept as Meridian's per-machine prefs file, in
 * preference order — split out from `prefsFile()` so a caller that needs to
 * SAY what it tried (REQ-295 check 3) does not have to re-derive the list.
 *
 * The app writes under `getApplicationSupportDirectory()`, and path_provider
 * nests that differently per platform (`lib/mcp/standalone_db_path.dart` is
 * the authority): `%APPDATA%\com.meridian\meridian` on Windows, and the
 * bundle / application id `nz.hwem.meridian` on macOS and Linux. Until
 * 2026-09-03 this used the Windows shape on every platform, so on macOS and
 * Linux the file was never found and the hook exited 0 having done nothing —
 * no report, no trailer, no spool — while looking identical to a hook that
 * had nothing to do. The `com.meridian/meridian` shape is kept as a fallback
 * for a hand-placed file.
 */
function prefsCandidates() {
  const name = 'user_preferences.json';
  const candidates = [];
  if (process.platform === 'win32') {
    candidates.push(path.join(
        process.env.APPDATA || '', 'com.meridian', 'meridian', name));
  } else if (process.platform === 'darwin') {
    const support = path.join(os.homedir(), 'Library', 'Application Support');
    candidates.push(path.join(support, 'nz.hwem.meridian', name));
    candidates.push(path.join(support, 'com.meridian', 'meridian', name));
  } else {
    const dataHome =
        process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
    candidates.push(path.join(dataHome, 'nz.hwem.meridian', name));
    candidates.push(path.join(dataHome, 'com.meridian', 'meridian', name));
  }
  return candidates;
}

/**
 * Meridian's per-machine prefs — the file the app writes the MCP token to.
 *
 * The first candidate that exists wins, and the platform's real location is
 * the default when none does, so state written beside it (the watermark
 * directory, the diagnostic breadcrumb) lands where the app looks even when
 * there is nothing there yet to find.
 */
function prefsFile() {
  const candidates = prefsCandidates();
  for (const file of candidates) {
    try {
      if (fs.statSync(file).isFile()) return file;
    } catch (_) {
      // Not there. Try the next.
    }
  }
  return candidates[0];
}

/**
 * WHERE THE BEARER ACTUALLY LIVES, AND WHY THIS HOOK GOES THERE (REQ-701).
 *
 * **The value is in the operating system's own credential store**, not in
 * `user_preferences.json`. Since REQ-516 that file holds
 * [SECRET_STORE_REFERENCE] — the literal marker `@secret-store` — wherever a
 * secret used to sit, and `UserPreferences._secretKeys`
 * (`lib/core/user_prefs/user_preferences.dart`) lists `mcp.token` among the
 * four that moved. The module that reads and writes it is
 * `lib/core/secrets/native_secret_store.dart`: `WindowsCredentialStore`
 * through `CredReadW`, `MacOsKeychainStore` through `Security.framework`, and
 * `LinuxSecretToolStore` by shelling out to `secret-tool`. Filed under
 * [SECRET_SERVICE]/[SECRET_KEY] on all three.
 *
 * This comment used to describe a base64 mechanism that REQ-516 deleted, and
 * that is not incidental — it is why nothing recorded a commit's cost between
 * 4 and 10 September. `@secret-store` read as "an encoding to handle" rather
 * than "not a token at all", `decodeSecret`'s plaintext fallback returned it
 * happily, the marker went out as the bearer, and every call 401ed into a
 * mechanism designed to fail open silently. Ninety reports queued unsent.
 *
 * ## The route chosen, and the two that were not
 *
 * The card named three and picked none. This reads the OS store directly,
 * because it is the only one of the three that leaves the secret with exactly
 * one home:
 *
 *  - **Have the app hand the token to local tooling** — a loopback endpoint,
 *    or a scoped file. An endpoint that serves the bearer to any caller on
 *    loopback defeats the bearer, which exists precisely to authorise one
 *    caller on loopback; and a second file is a plaintext secret on disk under
 *    a different name, which is REQ-516 undone with extra steps.
 *  - **Have the app write the usage itself.** The hook would still have to
 *    reach the app to hand over the figures, and the only credential-free
 *    channel it has is `mcp_write_spool.jsonl` — which is drained by
 *    `McpStdioProxy` and by nothing else, so on a machine whose `.mcp.json`
 *    speaks HTTP no proxy ever runs and nothing drains it. That route would
 *    have made today's symptom permanent instead of fixing it.
 *
 * Reading the store adds no copy of the secret anywhere, and it is the shape
 * the app already uses on one platform: `LinuxSecretToolStore` is a subprocess
 * for the same reason this is. The cost is a subprocess per commit — measured
 * on Windows at 2.3s under `powershell` and 0.8s under `pwsh`, which is why
 * `pwsh` is tried first.
 *
 * **The next migration will move this again**, so the guard matters more than
 * the route: nothing here trusts what it reads. A bearer that is not
 * [TOKEN_PREFIX]-shaped is refused *before* the request, named in the
 * breadcrumb and announced, so the next move is caught on the first commit
 * rather than after six days of a mechanism working perfectly and reporting
 * nothing.
 */

/**
 * A PowerShell script that prints one Windows credential, or exits 2.
 *
 * Windows has no command that prints a stored password — `cmdkey /list` names
 * targets and deliberately withholds blobs — so this P/Invokes `CredReadW`,
 * the same entry point `WindowsCredentialStore` binds through `dart:ffi`. The
 * blob is UTF-8 there, so it is decoded as UTF-8 here; `CredentialBlobSize` is
 * a byte count and not a character count, which is the detail that would
 * truncate any secret holding a non-ASCII character.
 *
 * Handed over as `-EncodedCommand` (base64 UTF-16LE) so that none of the C#
 * below has to survive Node's argv quoting and PowerShell's parser as well.
 */
function windowsCredReadScript(target) {
  const literal = `'${String(target).replace(/'/g, "''")}'`;
  return [
    '$ErrorActionPreference = \'Stop\'',
    'Add-Type -TypeDefinition @\'',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public static class MeridianCred {',
    '  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]',
    '  public struct CREDENTIAL {',
    '    public UInt32 Flags; public UInt32 Type; public IntPtr TargetName;',
    '    public IntPtr Comment;',
    '    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;',
    '    public UInt32 CredentialBlobSize; public IntPtr CredentialBlob;',
    '    public UInt32 Persist; public UInt32 AttributeCount;',
    '    public IntPtr Attributes; public IntPtr TargetAlias;',
    '    public IntPtr UserName;',
    '  }',
    '  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]',
    '  public static extern bool CredReadW(string target, UInt32 type,',
    '      UInt32 flags, out IntPtr cred);',
    '  [DllImport("advapi32.dll")]',
    '  public static extern void CredFree(IntPtr cred);',
    '  public static string Read(string target) {',
    '    IntPtr p;',
    '    if (!CredReadW(target, 1, 0, out p)) return null;',
    '    try {',
    '      CREDENTIAL c = (CREDENTIAL)Marshal.PtrToStructure(p,',
    '          typeof(CREDENTIAL));',
    '      if (c.CredentialBlobSize == 0) return "";',
    '      byte[] b = new byte[c.CredentialBlobSize];',
    '      Marshal.Copy(c.CredentialBlob, b, 0, (int)c.CredentialBlobSize);',
    '      return System.Text.Encoding.UTF8.GetString(b);',
    '    } finally { CredFree(p); }',
    '  }',
    '}',
    '\'@',
    `$v = [MeridianCred]::Read(${literal})`,
    'if ($null -eq $v) { exit 2 }',
    '[Console]::Out.Write($v)',
  ].join('\n');
}

/**
 * Every command that could answer for this platform's store, in preference
 * order, each with the exit code its own tool uses for "no such secret".
 *
 * `notFoundExit` is what separates *the store has nothing under this key* from
 * *the store could not be reached*, and those want different actions: the
 * first is ordinary on a machine where Meridian has not minted a token, the
 * second is a broken keyring. Where a tool cannot tell them apart — Linux's
 * `secret-tool lookup` exits 1 both for a missing key and for a locked
 * keyring — the breadcrumb says so rather than inventing a distinction.
 *
 * `MERIDIAN_SECRET_STORE_CMD` replaces the lot with a JSON array of
 * `[command, ...args]` whose contract is: exit 0 with output is the secret,
 * exit 0 with no output is "no such secret", anything else is "no store". It
 * is the seam the tests drive, and it exists for the same reason
 * `LinuxSecretToolStore` takes its executable as a constructor argument —
 * there is otherwise no way to exercise a missing keyring on a machine that
 * has one, and every one of these paths is a path this hook is judged on.
 */
function storeCandidates(key) {
  const override = process.env.MERIDIAN_SECRET_STORE_CMD;
  if (override) {
    try {
      const parts = JSON.parse(override);
      if (Array.isArray(parts) && parts.length) {
        return [{file: String(parts[0]), args: parts.slice(1).map(String),
          notFoundExit: null}];
      }
    } catch (_) {
      // A malformed override is not a reason to read the real store behind
      // the caller's back; fall through to the platform's own commands.
    }
  }
  if (process.platform === 'win32') {
    const encoded =
        Buffer.from(windowsCredReadScript(`${SECRET_SERVICE}/${key}`),
            'utf16le').toString('base64');
    const args = ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded];
    // `pwsh` first: measured 0.8s against `powershell`'s 2.3s, and this runs
    // on every commit.
    return [
      {file: 'pwsh', args, notFoundExit: 2},
      {file: 'powershell', args, notFoundExit: 2},
    ];
  }
  if (process.platform === 'darwin') {
    // `-w` prints the password on stdout rather than putting it in argv,
    // which is the same reason `native_secret_store.dart` refuses
    // `add-generic-password -w <secret>` for the WRITE side.
    return [{
      file: 'security',
      args: ['find-generic-password', '-s', SECRET_SERVICE, '-a', key, '-w'],
      notFoundExit: 44, // errSecItemNotFound
    }];
  }
  return [{
    file: 'secret-tool',
    args: ['lookup', 'service', SECRET_SERVICE, 'account', key],
    notFoundExit: 1,
  }];
}

/** Run one candidate. Never throws — every outcome is a returned shape. */
function runStoreCandidate(cand) {
  try {
    const out = execFileSync(cand.file, cand.args, {
      encoding: 'utf8',
      timeout: STORE_READ_TIMEOUT_MS,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 1 << 20,
    });
    // `secret-tool` appends a newline that is not part of the secret; the
    // other two do not, and trimming one that is not there costs nothing.
    const value = String(out == null ? '' : out).replace(/\r?\n$/, '');
    return value === ''
        ? {problem: 'no-token', detail: `${cand.file} returned nothing`}
        : {token: value};
  } catch (e) {
    const code = e && e.code;
    if (code === 'ENOENT') return {absent: `${cand.file} is not on PATH`};
    if (code === 'ETIMEDOUT') {
      return {problem: 'no-store',
        detail: `${cand.file} did not answer within ` +
            `${STORE_READ_TIMEOUT_MS}ms`};
    }
    const status = e && typeof e.status === 'number' ? e.status : null;
    if (status !== null && cand.notFoundExit !== null &&
        status === cand.notFoundExit) {
      return {problem: 'no-token',
        detail: `${cand.file} exited ${status}, its code for no such secret` +
            (process.platform === 'linux'
                ? ' — which secret-tool also uses for a locked keyring'
                : '')};
    }
    return {problem: 'no-store',
      detail: `${cand.file} exited ${status === null ? 'abnormally' : status}`};
  }
}

/**
 * The secret filed under [key], or which of the two absences it hit.
 *
 * Never throws and never blocks: the whole point of this hook is that it fails
 * open, and a credential store that hangs or explodes is not worth a
 * developer's commit. See `runStoreCandidate` for the outcomes.
 */
function readCredentialStore(key) {
  const candidates = storeCandidates(key);
  const missing = [];
  for (const cand of candidates) {
    const r = runStoreCandidate(cand);
    if (r.absent) {
      missing.push(r.absent);
      continue;
    }
    return r;
  }
  return {problem: 'no-store', detail: missing.join('; ')};
}

/**
 * What was found where a bearer should have been, in terms safe to write to a
 * breadcrumb and to a terminal.
 *
 * The marker is named literally, because it is not a secret and naming it is
 * the entire diagnostic — a person reading `@secret-store` knows immediately
 * that a migration moved the value. Anything else is described by shape only:
 * whatever it is, it may be somebody's real secret, and a diagnostic that
 * leaks one is worse than the fault it reports.
 */
function describeBearer(value) {
  if (value === SECRET_STORE_REFERENCE) {
    return `the literal marker ${SECRET_STORE_REFERENCE}, which is what ` +
        `REQ-516 writes into user_preferences.json in place of a secret it ` +
        `has moved to the OS credential store`;
  }
  if (!value) return 'an empty value';
  return `${value.length} characters that do not begin ${TOKEN_PREFIX} ` +
      `(not quoted here: whatever it is may be a real secret)`;
}

/**
 * Un-obfuscate a value `UserPreferences` stores base64-encoded.
 *
 * ONLY THE LEGACY PATH REACHES THIS NOW. `_encodeForFile` writes
 * [SECRET_STORE_REFERENCE] for a secret that is in the OS store, and base64
 * only for one that could not be migrated there — a machine with no keyring,
 * which keeps working exactly as it did. That file is what this decodes.
 *
 * The round-trip test is what tolerates a plaintext value: a real token
 * (`mer_mcp_…`) contains `_`, which Node's decoder accepts as URL-safe base64
 * and re-encodes as something else, so it fails the check and falls through.
 * It has no opinion at all about `@secret-store`, which is why that marker
 * sailed through it for six days — the shape check in `readConfig` is what
 * catches that, not this.
 */
function decodeSecret(stored) {
  try {
    const decoded = Buffer.from(stored, 'base64').toString('utf8');
    if (decoded && Buffer.from(decoded, 'utf8').toString('base64') === stored) {
      return decoded;
    }
  } catch (_) {
    // Not base64 at all. Fall through to the raw value.
  }
  return stored;
}

/**
 * THE ONE READER OF THE MCP BEARER (REQ-1552). Every Meridian hook —
 * session start, session activity, close-session and the token-cost hook —
 * gets its token and port through this function, so the four cannot diverge
 * again. [readConfig] wraps it for the three that only need a yes or a no;
 * the token-cost hook calls this directly because it also reports the reason.
 *
 * REQ-295 check 3. None of `prefsCandidates()` resolving used to be silent
 * all the way through: `readConfig()` threw on the missing file, the caller's
 * `catch` ran `die()`, and nothing said which paths were tried or that this
 * was a path-resolution failure rather than "Meridian has simply never
 * started". That silence is exactly how the platform-mismatch bug this
 * requirement fixed (cc8e17d9, wrongly trailered to REQ-263) went unnoticed
 * for as long as it did.
 *
 * `note()`, not `announce()`: this fires on ordinary machines that have
 * genuinely never run Meridian at all — a cloud agent with no local install,
 * say — and announcing that to the terminal on every commit would be noise
 * for the common case. `last-event.json` is this file's own established
 * channel for "silent to the terminal, not silent to the user" diagnostics;
 * a person chasing "why is spend unmeasured on this machine" now has
 * somewhere to look instead of nothing at all.
 */
function resolveConfig(hook) {
  const file = prefsFile();
  if (!fs.existsSync(file)) {
    note(hook, `no Meridian prefs file resolved for ${process.platform} — tried ` +
        `${prefsCandidates().join(', ')}. Either Meridian has never run on ` +
        `this machine, or none of these is where it actually writes; ` +
        `${hook} cannot reach Meridian until one of them exists.`);
    return null;
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const values = raw.values || {};
  const port = parseInt(values['mcp.port'], 10) || DEFAULT_PORT;
  const stored = values['mcp.token'];
  // No key at all means the server has never started here and there is
  // nothing to talk to. Deliberately NOT a trip to the credential store: a
  // machine that has never run Meridian would pay a subprocess on every
  // commit to be told what its own prefs file already said.
  if (!stored) return null;

  let token;
  let source;
  if (stored === SECRET_STORE_REFERENCE) {
    const got = readCredentialStore(SECRET_KEY);
    if (got.problem) {
      return {port, problem: got.problem, found: got.detail, source: 'store'};
    }
    token = got.token;
    source = `this machine's OS credential store, under ` +
        `${SECRET_SERVICE}/${SECRET_KEY}`;
  } else {
    token = decodeSecret(stored);
    source = `${file}, which still holds the value inline because this ` +
        `machine could not migrate it to a credential store`;
  }

  token = String(token).trim();
  // THE GUARD, AND THE POINT OF THE CARD (REQ-701 check 2). Refused HERE,
  // before any request is made, because the failure this prevents is not a
  // request that goes wrong — it is a request that goes out perfectly, gets a
  // 401, falls open exactly as designed, and says nothing for six days. A
  // prefix check would have caught REQ-516 on the first commit after it
  // landed. It is cheap because every token is minted by one generator: see
  // TOKEN_PREFIX.
  if (!token.startsWith(TOKEN_PREFIX)) {
    return {port, problem: 'not-a-token', found: describeBearer(token),
      source};
  }
  return {token, port, source};
}

/**
 * Leave a breadcrumb for the one failure mode that cannot announce itself.
 *
 * Failing open is right — a token reporter must never block a commit — but it
 * means a permanently broken pipe looks identical to "Meridian isn't running",
 * and the 401 above hid for a day behind exactly that. One overwritten file
 * beside the watermarks costs nothing and makes the next diagnosis immediate.
 *
 * Records the fallback succeeding too, not only the send failing: "the app was
 * closed, so the cost went into the commit instead" is the answer to the
 * question someone will actually be asking.
 */
function note(hook, what, extra) {
  try {
    const f = path.join(path.dirname(prefsFile()), 'token-hook', 'last-event.json');
    fs.mkdirSync(path.dirname(f), {recursive: true});
    fs.writeFileSync(
        f,
        JSON.stringify(
            Object.assign({at: new Date().toISOString(), hook, what},
                extra || {})));
  } catch (_) {
    // A diagnostic that throws is worse than no diagnostic.
  }
}

/**
 * Why nothing was even sent, in one sentence (REQ-701 check 3).
 *
 * The sibling of `whySendFailed` for the three states that stop this hook
 * before it opens a socket, and they are three different actions:
 *
 * | breadcrumb says | means | what to do |
 * |---|---|---|
 * | no OS credential store | no keyring on this box | nothing; ordinary on a cloud agent |
 * | the store holds no key | Meridian has never minted one here | start the app once |
 * | not a Meridian token | something moved the secret | fix it, today |
 *
 * A fourth — `HTTP 401`, the token was rejected — comes from `whySendFailed`,
 * because that one WAS sent. Collapsing any of them into "report failed" is
 * the shape REQ-697 spent five days inside, arriving one layer earlier.
 */
function whyNoCredential(problem, found) {
  if (problem === 'no-store') {
    return `no OS credential store answered on this machine (${found}), so ` +
        `there was no bearer to send and nothing was attempted`;
  }
  if (problem === 'no-token') {
    return `the OS credential store holds nothing under ` +
        `${SECRET_SERVICE}/${SECRET_KEY} (${found}), so there was no bearer ` +
        `to send and nothing was attempted`;
  }
  return `refused before the request: what was read for the bearer is not a ` +
      `Meridian token — ${found}`;
}

/**
 * The config for a hook that only needs "can I call Meridian, and with what".
 *
 * Null when it cannot: Meridian has never run here, the credential store holds
 * nothing, or what it holds is not a `mer_mcp_` token. Never throws, and never
 * makes a request. A refusal (as opposed to "never ran here") is written to
 * `last-event.json`, naming [hook] and the reason, because the alternative —
 * sending a placeholder and being refused — is what went unseen for a month.
 */
function readConfig(hook) {
  const name = hook || path.basename(process.argv[1] || 'hook', '.js');
  let cfg;
  try {
    cfg = resolveConfig(name);
  } catch (e) {
    note(name, `could not read Meridian's preferences (${e && e.message}), ` +
        `so nothing was sent`);
    return null;
  }
  if (cfg && cfg.problem) {
    note(name, whyNoCredential(cfg.problem, cfg.found), {problem: cfg.problem});
    return null;
  }
  return cfg;
}

/**
 * JSON-RPC `tools/call` against the embedded server. Resolves on any outcome,
 * with the status code (or 0 for "never reached it") so a caller can say *why*.
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
            // REQ-2019: the hooks' own calls name themselves, so they are
            // never taken for a lane's.
            'X-Meridian-Role': 'hook',
          },
        },
        (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode));
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

/**
 * [callTool], but resolving with the tool's text as well:
 * `{status, text}`, where `text` is null on any failure. For a hook that has
 * to show what the server said (REQ-1402's session-start step), not only
 * whether it answered. Accepts a plain JSON reply or an event stream.
 */
function callToolText(cfg, name, args, timeoutMs) {
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
          timeout: timeoutMs || 3000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'Content-Length': Buffer.byteLength(body),
            'Authorization': `Bearer ${cfg.token}`,
            // REQ-2019: the hooks' own calls name themselves, so they are
            // never taken for a lane's.
            'X-Meridian-Role': 'hook',
          },
        },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            resolve({
              status: res.statusCode,
              text: res.statusCode === 200
                  ? toolText(Buffer.concat(chunks).toString('utf8'))
                  : null,
            });
          });
        });
    req.on('error', () => resolve({status: 0, text: null}));
    req.on('timeout', () => {
      req.destroy();
      resolve({status: 0, text: null});
    });
    req.write(body);
    req.end();
  });
}

/** The text of a `tools/call` result, from JSON or SSE; null if none. */
function toolText(raw) {
  const candidates = [];
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith('data:')) candidates.push(line.slice(5).trim());
  }
  if (candidates.length === 0) candidates.push(raw);
  for (const c of candidates) {
    try {
      const msg = JSON.parse(c);
      const result = msg && msg.result;
      if (!result || result.isError) continue;
      const parts = (result.content || [])
          .filter((p) => p && p.type === 'text')
          .map((p) => p.text);
      if (parts.length) return parts.join('\n');
    } catch (_) {
      // Not JSON. Try the next.
    }
  }
  return null;
}

module.exports = {
  readConfig,
  resolveConfig,
  callTool,
  callToolText,
  toolText,
  prefsFile,
  note,
  whyNoCredential,
  TOKEN_PREFIX,
  SECRET_SERVICE,
  SECRET_KEY,
  SECRET_STORE_REFERENCE,
};
