/* Pure helpers for progress tracking, study streaks and backup files. No DOM access, so test/run.js can load them. */
(function () {
  const IGU = (window.IGU = window.IGU || {});

  /* Keys that a backup file may contain. API keys are deliberately excluded. */
  const BACKUP_KEYS = ['done', 'saved', 'notes', 'practice', 'activity', 'posts', 'profile', 'srs', 'plan', 'mocks'];

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
    if (!obj || typeof obj !== 'object' || obj.app !== 'InterviewGearUp' || !obj.data || typeof obj.data !== 'object') {
      return { error: 'This is not an InterviewGearUp backup file.' };
    }
    const out = {};
    BACKUP_KEYS.forEach(function (k) { if (k in obj.data) out[k] = obj.data[k]; });
    const isMap = function (v) { return v && typeof v === 'object' && !Array.isArray(v); };
    if ('done' in out && !isMap(out.done)) return { error: 'Backup "done" section is malformed.' };
    if ('saved' in out && !isMap(out.saved)) return { error: 'Backup "saved" section is malformed.' };
    if ('notes' in out && !isMap(out.notes)) return { error: 'Backup "notes" section is malformed.' };
    if ('practice' in out && !isMap(out.practice)) return { error: 'Backup "practice" section is malformed.' };
    if ('activity' in out && !Array.isArray(out.activity)) return { error: 'Backup "activity" section is malformed.' };
    if ('srs' in out && !isMap(out.srs)) return { error: 'Backup "srs" section is malformed.' };
    if ('plan' in out && !isMap(out.plan)) return { error: 'Backup "plan" section is malformed.' };
    if ('mocks' in out && !Array.isArray(out.mocks)) return { error: 'Backup "mocks" section is malformed.' };
    if ('posts' in out && !Array.isArray(out.posts)) return { error: 'Backup "posts" section is malformed.' };
    return { data: out };
  }

  function makeBackup(get) {
    const data = {};
    BACKUP_KEYS.forEach(function (k) { const v = get(k); if (v !== undefined && v !== null) data[k] = v; });
    return { app: 'InterviewGearUp', version: 1, exportedAt: new Date().toISOString(), data: data };
  }

  IGU.stats = { matrix: matrix, weak: weak, record: record, touch: touch, streak: streak, day: day, shiftDay: shiftDay, readBackup: readBackup, makeBackup: makeBackup, BACKUP_KEYS: BACKUP_KEYS };
})();
