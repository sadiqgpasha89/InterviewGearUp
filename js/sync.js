/* Optional private sync through a GitHub Gist the learner controls. Off by default; nothing is sent until the learner
   turns it on, supplies their own token and a passphrase, and presses a button.
   - The payload is the same data as a backup file (never the AI key, never the sync token), encrypted in the browser
     with AES-GCM using a key derived from the passphrase (PBKDF2-SHA256). GitHub only ever stores ciphertext.
   - The token is kept in sessionStorage unless the learner asks to remember it. The passphrase is never stored.
   - Only api.github.com is contacted. Pure functions plus injectable fetch and crypto, so test/run.js can exercise them. */
(function () {
  const IGU = (window.IGU = window.IGU || {});
  const API = 'https://api.github.com';
  const FILE = 'interviewgearup-sync.json';
  const FORMAT = 'igu-sync-1';
  const MAX_BYTES = 900 * 1024; // GitHub truncates larger gist files in API responses, which this client cannot follow.
  const ITER = 210000;
  const MIN_PASS = 10;

  const subtle = function () { const c = (typeof globalThis !== 'undefined' && globalThis.crypto) || window.crypto; if (!c || !c.subtle) throw new Error('This browser cannot encrypt data, so sync is unavailable.'); return c; };
  const enc = function (s) { return new TextEncoder().encode(s); };
  function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(str) { const s = atob(str), out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; }

  /* A token is pasted by the learner. Reject anything that cannot be a token, without echoing it back. */
  function checkToken(t) {
    t = String(t || '').trim();
    if (!t) return { error: 'Paste a GitHub token that has only the "gist" permission.' };
    if (t.length > 255 || /\s/.test(t) || !/^[A-Za-z0-9_\-]+$/.test(t)) return { error: 'That does not look like a GitHub token.' };
    return { token: t };
  }
  function checkPassphrase(p) {
    p = String(p || '');
    if (p.length < MIN_PASS) return { error: 'Use a passphrase of at least ' + MIN_PASS + ' characters. It encrypts your data, and nobody can recover it for you.' };
    return { pass: p };
  }

  async function deriveKey(pass, salt, usage) {
    const c = subtle();
    const base = await c.subtle.importKey('raw', enc(pass), 'PBKDF2', false, ['deriveKey']);
    return c.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, usage);
  }

  /* backup: the object from IGU.stats.makeBackup. Returns the text stored in the gist file. */
  async function seal(backup, pass) {
    const c = subtle();
    const salt = c.getRandomValues(new Uint8Array(16)), iv = c.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(pass, salt, ['encrypt']);
    const ct = new Uint8Array(await c.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc(JSON.stringify(backup))));
    const text = JSON.stringify({ app: 'InterviewGearUp', format: FORMAT, note: 'Encrypted with the owner\'s passphrase. Without it this file cannot be read.', savedAt: new Date().toISOString(), iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(ct) });
    if (text.length > MAX_BYTES) throw new Error('Your data is too large to sync (' + Math.round(text.length / 1024) + ' KB; the limit is ' + Math.round(MAX_BYTES / 1024) + ' KB). Use Download backup instead.');
    return text;
  }

  /* Returns { backup } or { error }. A wrong passphrase and a damaged file look the same on purpose. */
  async function open(text, pass) {
    let env;
    try { env = JSON.parse(text); } catch (e) { return { error: 'The synced file is not valid.' }; }
    if (!env || env.app !== 'InterviewGearUp' || env.format !== FORMAT || typeof env.salt !== 'string' || typeof env.iv !== 'string' || typeof env.data !== 'string') return { error: 'That gist is not an InterviewGearUp sync file.' };
    if (env.iter !== ITER) return { error: 'This sync file was made with settings this version does not support.' };
    try {
      const key = await deriveKey(pass, unb64(env.salt), ['decrypt']);
      const pt = await subtle().subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv) }, key, unb64(env.data));
      const res = IGU.stats.readBackup(JSON.parse(new TextDecoder().decode(pt)));
      if (res.error) return { error: res.error };
      return { backup: res.data, savedAt: env.savedAt };
    } catch (e) { return { error: 'Could not decrypt. Check the passphrase, or the file may be damaged.' }; }
  }

  function describe(status) {
    if (status === 401) return 'GitHub rejected the token. Check that it is valid and not expired.';
    if (status === 403) return 'GitHub refused the request (the token may lack the "gist" permission, or the rate limit was reached).';
    if (status === 404) return 'That gist was not found with this token. Check the gist id and that the token belongs to the same account.';
    if (status === 422) return 'GitHub could not accept the data.';
    return 'GitHub returned an error (' + status + ').';
  }

  async function call(f, method, path, token, body) {
    let res;
    try {
      res = await f(API + path, { method: method, headers: Object.assign({ Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', Authorization: 'Bearer ' + token }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined, cache: 'no-store', referrerPolicy: 'no-referrer' });
    } catch (e) { throw new Error('Could not reach GitHub. Check your connection.'); }
    if (!res.ok) throw new Error(describe(res.status));
    return res.json();
  }

  /* Decide whether a push may go ahead. `last` is what this browser recorded after its previous sync (or null). */
  function pushDecision(last, remoteSavedAt, force) {
    if (!remoteSavedAt) return { ok: true };
    if (force) return { ok: true };
    if (!last || !last.remoteSavedAt) return { ok: false, reason: 'The gist already holds synced data from another device. Pull it first, or confirm that you want to replace it.' };
    if (remoteSavedAt > last.remoteSavedAt) return { ok: false, reason: 'The gist has newer data than this browser last saw. Pull first, or confirm that you want to replace it.' };
    return { ok: true };
  }

  /* opts: { token, pass, backup, gistId?, last?, force?, fetch? }. Creates a secret gist on first use. */
  async function push(opts) {
    const f = opts.fetch || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (!f) throw new Error('This browser cannot reach GitHub.');
    const t = checkToken(opts.token); if (t.error) throw new Error(t.error);
    const p = checkPassphrase(opts.pass); if (p.error) throw new Error(p.error);
    const text = await seal(opts.backup, opts.pass);
    const savedAt = JSON.parse(text).savedAt;
    if (opts.gistId) {
      const cur = await call(f, 'GET', '/gists/' + encodeURIComponent(opts.gistId), t.token);
      const file = cur.files && cur.files[FILE];
      let remote = '';
      if (file && !file.truncated && typeof file.content === 'string') { try { remote = JSON.parse(file.content).savedAt || ''; } catch (e) { remote = ''; } }
      const d = pushDecision(opts.last, remote, opts.force);
      if (!d.ok) { const err = new Error(d.reason); err.conflict = true; throw err; }
      const out = await call(f, 'PATCH', '/gists/' + encodeURIComponent(opts.gistId), t.token, { files: { [FILE]: { content: text } } });
      return { gistId: out.id, savedAt: savedAt };
    }
    const out = await call(f, 'POST', '/gists', t.token, { description: 'InterviewGearUp encrypted sync', public: false, files: { [FILE]: { content: text } } });
    return { gistId: out.id, savedAt: savedAt };
  }

  /* opts: { token, pass, gistId, fetch? } -> { backup, savedAt } */
  async function pull(opts) {
    const f = opts.fetch || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (!f) throw new Error('This browser cannot reach GitHub.');
    const t = checkToken(opts.token); if (t.error) throw new Error(t.error);
    const p = checkPassphrase(opts.pass); if (p.error) throw new Error(p.error);
    if (!opts.gistId) throw new Error('Enter the gist id to pull from.');
    const cur = await call(f, 'GET', '/gists/' + encodeURIComponent(opts.gistId), t.token);
    const file = cur.files && cur.files[FILE];
    if (!file) throw new Error('That gist has no InterviewGearUp sync file.');
    if (file.truncated || typeof file.content !== 'string') throw new Error('The synced file is too large to read here. Use a downloaded backup instead.');
    const res = await open(file.content, opts.pass);
    if (res.error) throw new Error(res.error);
    return res;
  }

  IGU.sync = { checkToken: checkToken, checkPassphrase: checkPassphrase, seal: seal, open: open, push: push, pull: pull, pushDecision: pushDecision, FILE: FILE, MAX_BYTES: MAX_BYTES, MIN_PASS: MIN_PASS };
})();
