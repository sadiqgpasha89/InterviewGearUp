/* Adaptive preparation (Phase 4): attempt history, mastery, weak-topic evidence, trends and the weekly summary.
   Pure and deterministic; `today` is a local "YYYY-MM-DD". The planner (js/planner.js) uses weakSignals() to rank new
   questions and explain why. Nothing here predicts interview results; every number is derived from what the learner did.
   Data: igu.history = [{ d: day, id: questionId, o: 'again'|'partial'|'ok'|'mastered' }] newest last, capped. */
(function () {
  const IGU = (window.IGU = window.IGU || {});
  const SRS = IGU.srs;

  const MAX_HISTORY = 600;
  const VALUE = { again: 0, partial: 0.4, ok: 0.75, mastered: 1 };
  const HALF_LIFE = 14; // days: an attempt two weeks old counts half as much as one today

  /* Drill outcomes are ok/again; review grades are again/partial/solid/mastered. Normalise both. */
  function outcome(o) { return o === 'solid' ? 'ok' : (VALUE[o] !== undefined ? o : null); }

  function logAttempt(history, id, o, day) {
    const out = (Array.isArray(history) ? history : []).slice();
    const n = outcome(o);
    if (!n || typeof id !== 'string' || !SRS.validDay(day)) return out;
    out.push({ d: day, id: id, o: n });
    return out.length > MAX_HISTORY ? out.slice(out.length - MAX_HISTORY) : out;
  }

  function clean(history, today) {
    return (Array.isArray(history) ? history : []).filter(function (h) {
      return h && typeof h.id === 'string' && SRS.validDay(h.d) && VALUE[h.o] !== undefined && (!today || h.d <= today);
    });
  }

  /* Recency-weighted mastery per question: { id: { score 0..1, attempts, last } }. Multiple attempts and recency both count. */
  function mastery(history, today) {
    const acc = {};
    clean(history, today).forEach(function (h) {
      const w = Math.pow(0.5, SRS.diff(h.d, today) / HALF_LIFE);
      const a = acc[h.id] = acc[h.id] || { sw: 0, sv: 0, attempts: 0, last: h.d };
      a.sw += w; a.sv += w * VALUE[h.o]; a.attempts++;
      if (h.d > a.last) a.last = h.d;
    });
    const out = {};
    Object.keys(acc).forEach(function (id) { const a = acc[id]; out[id] = { score: a.sw ? Math.round(100 * a.sv / a.sw) / 100 : 0, attempts: a.attempts, last: a.last }; });
    return out;
  }

  const topicKey = function (e) { return e.role + '|' + e.topic; };

  /* Weak-topic evidence from four sources, each with a reason a learner can read:
     low recency-weighted mastery, last drill "needs practice", review lapses, and low mock scores in the last 21 days.
     Returns { byTopic: { 'role|topic': { score, reasons[] } }, byId: { id: { score, reasons[] } } }. */
  function weakSignals(input) {
    const bank = input.bank, today = input.today;
    const byId = {};
    const index = {}; bank.forEach(function (e) { index[e.id] = e; });
    const add = function (id, pts, reason) {
      if (!index[id]) return;
      const x = byId[id] = byId[id] || { score: 0, reasons: [] };
      x.score += pts;
      if (x.reasons.indexOf(reason) < 0) x.reasons.push(reason);
    };
    const m = mastery(input.history, today);
    Object.keys(m).forEach(function (id) { if (m[id].score < 0.5) add(id, m[id].attempts >= 2 ? 2 : 1, 'low recall over ' + m[id].attempts + (m[id].attempts === 1 ? ' attempt' : ' attempts')); });
    const practice = input.practice || {};
    Object.keys(practice).forEach(function (id) { if (practice[id] && practice[id].last === 'again') add(id, 1, 'last drill marked "needs practice"'); });
    const srs = input.srs || {};
    Object.keys(srs).forEach(function (id) { if (srs[id] && srs[id].lapses >= 2) add(id, 1, 'forgotten ' + srs[id].lapses + ' times in review'); });
    (input.mocks || []).forEach(function (s) {
      if (!s || !SRS.validDay(s.day) || SRS.diff(s.day, today) > 21 || !Array.isArray(s.items)) return;
      s.items.forEach(function (it) {
        const b = it && it.result && it.result.band;
        if (b === 'Needs work' || b === 'Off topic' || (it.result && it.result.empty)) add(it.qid, 2, 'low mock score on ' + s.day);
        else if (b === 'Developing') add(it.qid, 1, 'developing in the mock on ' + s.day);
      });
    });
    const byTopic = {};
    Object.keys(byId).forEach(function (id) {
      const k = topicKey(index[id]);
      const t = byTopic[k] = byTopic[k] || { score: 0, reasons: [], ids: [] };
      t.score += byId[id].score; t.ids.push(id);
      byId[id].reasons.forEach(function (r) { if (t.reasons.length < 3 && t.reasons.indexOf(r) < 0) t.reasons.push(r); });
    });
    return { byTopic: byTopic, byId: byId };
  }

  /* Topics whose recent results (last 7 days) differ from the 3 weeks before by at least 0.2, with at least 2 attempts in each window. */
  function trends(history, bank, today) {
    const index = {}; bank.forEach(function (e) { index[e.id] = e; });
    const win = {};
    clean(history, today).forEach(function (h) {
      const e = index[h.id]; if (!e) return;
      const age = SRS.diff(h.d, today);
      if (age > 27) return;
      const k = topicKey(e);
      const w = win[k] = win[k] || { topic: e.topic, role: e.role, recent: [], before: [] };
      (age < 7 ? w.recent : w.before).push(VALUE[h.o]);
    });
    const avg = function (a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; };
    const out = { improving: [], declining: [] };
    Object.keys(win).sort().forEach(function (k) {
      const w = win[k];
      if (w.recent.length < 2 || w.before.length < 2) return;
      const delta = Math.round(100 * (avg(w.recent) - avg(w.before))) / 100;
      const row = { topic: w.topic, role: w.role, delta: delta, recent: w.recent.length, before: w.before.length };
      if (delta >= 0.2) out.improving.push(row); else if (delta <= -0.2) out.declining.push(row);
    });
    out.improving.sort(function (a, b) { return b.delta - a.delta; });
    out.declining.sort(function (a, b) { return a.delta - b.delta; });
    return out;
  }

  /* Weekly summary over the 7 days ending today. "Missed" means a day since the plan started with no task ticked and no practice. */
  function weekly(input) {
    const today = input.today, plan = input.plan || {}, bank = input.bank;
    const days = []; for (let i = 6; i >= 0; i--) days.push(SRS.shift(today, -i));
    const completed = plan.completed || {};
    const activity = {}; (input.activity || []).forEach(function (d) { activity[d] = 1; });
    const hist = clean(input.history, today);
    const attemptsByDay = {}; hist.forEach(function (h) { attemptsByDay[h.d] = (attemptsByDay[h.d] || 0) + 1; });
    const start = plan.profile && plan.profile.createdDay;
    let tasksDone = 0, missed = 0, active = 0;
    days.forEach(function (d) {
      const n = completed[d] ? Object.keys(completed[d]).length : 0;
      tasksDone += n;
      const isActive = n > 0 || activity[d] || attemptsByDay[d];
      if (isActive) active++;
      else if (!start || d >= start) { if (d < today) missed++; }
    });
    const tr = trends(input.history, bank, today);
    const mocks = (input.mocks || []).filter(function (s) { return s && SRS.validDay(s.day) && SRS.diff(s.day, today) < 7 && SRS.diff(s.day, today) >= 0; });
    let pts = 0, max = 0;
    mocks.forEach(function (s) { (s.items || []).forEach(function (it) { if (it.result && !it.result.empty) { pts += it.result.total; max += it.result.max; } }); });
    const sig = weakSignals(input);
    const focus = Object.keys(sig.byTopic).map(function (k) { const t = sig.byTopic[k]; const p = k.split('|'); return { role: p[0], topic: p[1], score: t.score, reasons: t.reasons }; })
      .sort(function (a, b) { return b.score - a.score || (a.topic < b.topic ? -1 : 1); }).slice(0, 3);
    const counts = SRS.counts(input.srs || {}, bank, today);
    return {
      from: days[0], to: today,
      tasksCompleted: tasksDone, activeDays: active, missedDays: missed,
      attempts: days.reduce(function (n, d) { return n + (attemptsByDay[d] || 0); }, 0),
      improving: tr.improving.slice(0, 3), declining: tr.declining.slice(0, 3),
      reviewsDue: counts.due, reviewsNext7: counts.upcoming7,
      mock: { rounds: mocks.length, pct: max ? Math.round(100 * pts / max) : null },
      focus: focus
    };
  }

  IGU.adaptive = { MAX_HISTORY: MAX_HISTORY, VALUE: VALUE, HALF_LIFE: HALF_LIFE, logAttempt: logAttempt, mastery: mastery, weakSignals: weakSignals, trends: trends, weekly: weekly };
})();
