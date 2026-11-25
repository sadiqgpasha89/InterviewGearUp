/* Spaced repetition: a small, explainable schedule. Pure functions, no DOM, so test/run.js can load them.
   Every function takes `today` ("YYYY-MM-DD", the learner's local day) so behaviour is testable and DST-proof.
   State is a map { id: { due, interval, reps, lapses, last, grade } } stored under igu.srs. */
(function () {
  const IGU = (window.IGU = window.IGU || {});

  const GRADES = ['again', 'partial', 'solid', 'mastered'];
  const MAX_INTERVAL = 180;

  function shift(str, n) {
    const p = str.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10);
  }
  function diff(a, b) { // whole days from a to b
    const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
    return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
  }
  function validDay(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && shift(s, 0) === s; }

  /* The rule, in one place so the UI can explain it:
     again    -> 1 day (and counts as a lapse)
     partial  -> 3 days
     solid    -> 7 days the first time, then about 1.8x the last interval
     mastered -> 14 days, then 30, then doubling (capped at 180) */
  function nextInterval(prev, grade) {
    prev = prev || 0;
    if (grade === 'again') return 1;
    if (grade === 'partial') return 3;
    if (grade === 'solid') return prev >= 7 ? Math.min(MAX_INTERVAL, Math.round(prev * 1.8)) : 7;
    if (grade === 'mastered') return prev < 14 ? 14 : prev < 30 ? 30 : Math.min(MAX_INTERVAL, prev * 2);
    throw new Error('Unknown grade: ' + grade);
  }

  /* Returns a NEW state map with the review applied. */
  function review(state, id, grade, today) {
    if (GRADES.indexOf(grade) < 0) throw new Error('Unknown grade: ' + grade);
    if (!validDay(today)) throw new Error('today must be YYYY-MM-DD');
    const prev = (state && state[id]) || { interval: 0, reps: 0, lapses: 0 };
    const interval = nextInterval(prev.interval, grade);
    const out = Object.assign({}, state || {});
    out[id] = { due: shift(today, interval), interval: interval, reps: (prev.reps || 0) + 1,
      lapses: (prev.lapses || 0) + (grade === 'again' ? 1 : 0), last: today, grade: grade };
    return out;
  }

  /* Due items, most overdue first, then lowest gear first. Ids no longer in the bank are ignored.
     opts: { role, level, limit } */
  function queue(state, bank, today, opts) {
    opts = opts || {};
    const byId = {};
    bank.forEach(function (e) { byId[e.id] = e; });
    const items = Object.keys(state || {}).filter(function (id) {
      const s = state[id], e = byId[id];
      if (!e || !s || !validDay(s.due) || s.due > today) return false;
      return (!opts.role || e.role === opts.role) && (!opts.level || e.level === Number(opts.level));
    }).map(function (id) { return { id: id, overdue: diff(state[id].due, today), entry: byId[id] }; });
    items.sort(function (a, b) { return b.overdue - a.overdue || a.entry.level - b.entry.level || (a.id < b.id ? -1 : 1); });
    return opts.limit ? items.slice(0, opts.limit) : items;
  }

  /* Counts for the dashboard. */
  function counts(state, bank, today) {
    const ids = {};
    bank.forEach(function (e) { ids[e.id] = 1; });
    let due = 0, overdue = 0, upcoming7 = 0, scheduled = 0;
    Object.keys(state || {}).forEach(function (id) {
      const s = state[id];
      if (!ids[id] || !s || !validDay(s.due)) return;
      scheduled++;
      if (s.due <= today) { due++; if (s.due < today) overdue++; }
      else if (diff(today, s.due) <= 7) upcoming7++;
    });
    return { scheduled: scheduled, due: due, overdue: overdue, upcoming7: upcoming7 };
  }

  /* Reviews completed on a given day (from `last`). Used for the daily goal. */
  function reviewedOn(state, day) {
    return Object.keys(state || {}).filter(function (id) { return state[id] && state[id].last === day; }).length;
  }

  /* Drill outcomes ('ok' / 'again') map onto the two basic grades. */
  function fromOutcome(outcome) { return outcome === 'ok' ? 'solid' : 'again'; }

  IGU.srs = { GRADES: GRADES, nextInterval: nextInterval, review: review, queue: queue, counts: counts,
    reviewedOn: reviewedOn, fromOutcome: fromOutcome, shift: shift, diff: diff, validDay: validDay };
})();
