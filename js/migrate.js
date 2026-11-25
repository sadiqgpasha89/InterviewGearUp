/* Versioned, explicit, non-destructive migrations for localStorage. `igu.schema` records the version.
   A migration only ADDS derived data; it never deletes or rewrites existing keys, so a bug cannot lose progress.
   `kv` is anything with get(key, fallback) and set(key, value) (the app passes IGU.util.store). */
(function () {
  const IGU = (window.IGU = window.IGU || {});
  const CURRENT = 1;

  const steps = {
    /* 0 -> 1: build the review schedule from existing drill history. `practice` stays untouched.
       Missed questions are due today; confident ones come back after a week. */
    1: function (kv, today) {
      const practice = kv.get('practice', {}) || {};
      const srs = Object.assign({}, kv.get('srs', {}) || {});
      Object.keys(practice).forEach(function (id) {
        const p = practice[id];
        if (srs[id] || !p || typeof p !== 'object') return;
        const again = p.last === 'again';
        srs[id] = { due: again ? today : IGU.srs.shift(today, 7), interval: again ? 1 : 7, reps: Number(p.n) || 1,
          lapses: Number(p.again) || 0, last: today, grade: again ? 'again' : 'solid', migrated: true };
      });
      kv.set('srs', srs);
    }
  };

  /* Returns { from, to, ran: [versions], newer: bool }. Never throws for a bad `schema` value. */
  function run(kv, today) {
    let v = Number(kv.get('schema', 0));
    if (!isFinite(v) || v < 0) v = 0;
    const from = v;
    if (v > CURRENT) return { from: from, to: from, ran: [], newer: true };
    const ran = [];
    while (v < CURRENT) {
      v++;
      steps[v](kv, today);
      kv.set('schema', v);
      ran.push(v);
    }
    return { from: from, to: v, ran: ran, newer: false };
  }

  IGU.migrate = { CURRENT: CURRENT, run: run };
})();
