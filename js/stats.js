/* Pure helpers for progress tracking, study streaks and backup files. No DOM access, so test/run.js can load them. */
(function () {
  const IGU = (window.IGU = window.IGU || {});

  /* Keys that a backup file may contain. API keys and sync tokens are deliberately excluded. */
  const BACKUP_KEYS = ['done', 'saved', 'notes', 'practice', 'activity', 'posts', 'profile', 'srs', 'plan', 'mocks', 'stories', 'storyPractice', 'jds', 'designs', 'coding', 'voice', 'paths', 'history', 'jdTarget', 'readiness'];
  const MAP_KEYS = ['done', 'saved', 'notes', 'practice', 'profile', 'srs', 'plan', 'designs', 'coding', 'jdTarget', 'readiness'];
  const ARRAY_KEYS = ['activity', 'posts', 'mocks', 'stories', 'storyPractice', 'jds', 'voice', 'paths', 'history'];

  /* Prepared counts per role and gear. */
  function matrix(bank, done, meta) {
    done = done || {};
    const rows = meta.roles.map(function (r) {
      const cells = meta.levels.map(function (l) {
        const items = bank.filter(function (e) { return e.role === r.id && e.level === l.n; });
        return { level: l.n, total: items.length, done: items.filter(function (e) { return done[e.id]; }).length };
      });
      return {
        role: r.id, name: r.name, cells: cells,
        total: cells.reduce(function (a, c) { return a + c.total; }, 0),
        done: cells.reduce(function (a, c) { return a + c.done; }, 0)
      };
    });
    return {
      rows: rows,
      total: rows.reduce(function (a, r) { return a + r.total; }, 0),
      done: rows.reduce(function (a, r) { return a + r.done; }, 0)
    };
  }

  /* Ids whose most recent drill outcome was "needs more practice". */
  function weak(practice) {
    practice = practice || {};
    return Object.keys(practice).filter(function (id) { return practice[id] && practice[id].last === 'again'; });
  }

  /* Record one drill outcome: 'ok' or 'again', plus seconds spent. Returns a new object. */
  function record(practice, id, outcome, seconds) {
    const p = Object.assign({}, practice || {});
    const prev = p[id] || { n: 0, ok: 0, again: 0, secs: 0 };
    p[id] = {
      n: prev.n + 1,
      ok: prev.ok + (outcome === 'ok' ? 1 : 0),
      again: prev.again + (outcome === 'again' ? 1 : 0),
      secs: prev.secs + Math.max(0, Math.round(seconds || 0)),
      last: outcome
    };
    return p;
  }

  /* Days are the learner's LOCAL calendar days ("YYYY-MM-DD"), so a late-evening session counts for today. */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function day(d) {
    const x = new Date(d);
    return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
  }
  /* Calendar arithmetic on a day string; independent of DST because it works on UTC midnights. */
  function shiftDay(str, n) {
    const p = str.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10);
  }

  /* Add today to a sorted, de-duplicated list of active days (keeps the last 400). */
  function touch(days, now) {
    const t = day(now || Date.now());
    const set = {};
    (days || []).concat([t]).forEach(function (x) { set[x] = 1; });
    return Object.keys(set).sort().slice(-400);
  }

  /* Consecutive active days ending today (or yesterday, so the streak survives until you study today). */
  function streak(days, now) {
    const set = {};
    (days || []).forEach(function (x) { set[x] = 1; });
    let cur = day(now || Date.now());
    if (!set[cur]) cur = shiftDay(cur, -1);
    let n = 0;
    while (set[cur]) { n++; cur = shiftDay(cur, -1); }
    return n;
  }

  /* Validate an imported backup. Returns { data } with only known keys, or { error }. */
  function readBackup(obj) {
    if (!obj || typeof obj !== 'object' || obj.app !== 'InterviewGearUp' || !obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) {
      return { error: 'This is not an InterviewGearUp backup file.' };
    }
    if ('version' in obj && (typeof obj.version !== 'number' || obj.version < 1 || obj.version > 1)) {
      return { error: 'This backup was created with an unsupported version (' + obj.version + ').' };
    }
    const out = {};
    BACKUP_KEYS.forEach(function (k) { if (k in obj.data && obj.data[k] !== undefined && obj.data[k] !== null) out[k] = obj.data[k]; });
    const isMap = function (v) { return v && typeof v === 'object' && !Array.isArray(v); };
    for (let i = 0; i < MAP_KEYS.length; i++) {
      const k = MAP_KEYS[i];
      if (k in out && !isMap(out[k])) return { error: 'Backup "' + k + '" section is malformed.' };
    }
    for (let i = 0; i < ARRAY_KEYS.length; i++) {
      const k = ARRAY_KEYS[i];
      if (k in out && !Array.isArray(out[k])) return { error: 'Backup "' + k + '" section is malformed.' };
    }
    return { data: out };
  }

  /* Atomically replace all BACKUP_KEYS in `store` after validating `obj` (or validated `{ data }`).
     Never touches API keys (`settings`) or sync credentials (`sync`). Rolls back if any write throws. */
  function applyBackup(obj, store) {
    const res = readBackup(obj);
    if (res.error) return { ok: false, error: res.error };
    const snap = {};
    BACKUP_KEYS.forEach(function (k) { snap[k] = store.get(k, undefined); });
    try {
      BACKUP_KEYS.forEach(function (k) {
        if (k in res.data) store.set(k, res.data[k]);
        else if (typeof store.remove === 'function') store.remove(k);
      });
      return { ok: true, data: res.data };
    } catch (e) {
      BACKUP_KEYS.forEach(function (k) {
        try {
          if (snap[k] !== undefined) store.set(k, snap[k]);
          else if (typeof store.remove === 'function') store.remove(k);
        } catch (x) { /* best-effort rollback */ }
      });
      return { ok: false, error: 'Could not save the restored backup in this browser.' };
    }
  }

  /* Non-intrusive reminder when the learner has meaningful local progress and no recent backup or sync. */
  function backupReminder(opts) {
    opts = opts || {};
    const items = (opts.preparedCount || 0) + (opts.drilledCount || 0) + (opts.storiesCount || 0);
    if (items < 5) return { due: false, reason: '' };
    const now = opts.now !== undefined ? new Date(opts.now).getTime() : Date.now();
    const lastB = opts.lastBackupAt ? Date.parse(opts.lastBackupAt) : 0;
    const lastS = opts.lastSyncAt ? Date.parse(opts.lastSyncAt) : 0;
    const latest = Math.max(isNaN(lastB) ? 0 : lastB, isNaN(lastS) ? 0 : lastS);
    if (!latest) return { due: true, reason: 'You have local progress on this device with no backup yet. Download a backup file to keep it safe.' };
    const days = Math.floor((now - latest) / 86400000);
    if (days >= 14) return { due: true, reason: 'Last backup or sync was ' + days + ' days ago. Download a fresh backup to protect recent progress.' };
    return { due: false, reason: '' };
  }

  function makeBackup(get) {
    const data = {};
    BACKUP_KEYS.forEach(function (k) { const v = get(k); if (v !== undefined && v !== null) data[k] = v; });
    return { app: 'InterviewGearUp', version: 1, exportedAt: new Date().toISOString(), data: data };
  }

  IGU.stats = { matrix: matrix, weak: weak, record: record, touch: touch, streak: streak, day: day, shiftDay: shiftDay, readBackup: readBackup, applyBackup: applyBackup, backupReminder: backupReminder, makeBackup: makeBackup, BACKUP_KEYS: BACKUP_KEYS };
})();
