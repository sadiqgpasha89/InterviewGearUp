/* Home dashboard model (Phase 2). Pure functions, no DOM, so test/run.js can check them.
   It answers the six dashboard questions from data the app already keeps in this browser:
   what have I completed, what next, where am I weak, what to revise today, how long today takes, am I progressing.
   Nothing here predicts interview results; every number is a count of what the learner did. `today` is a local "YYYY-MM-DD". */
(function () {
  const IGU = (window.IGU = window.IGU || {});
  const SRS = IGU.srs, PL = IGU.planner;

  const ONBOARDING_MINUTES = [15, 30, 45, 60, 90];

  /* Weak areas, grouped by role and topic, strongest evidence first.
     Evidence per question: last drill outcome "again" (2), last review grade "again" (2) or "partial" (1), plus 1 per lapse. */
  function weakTopics(bank, practice, srs, limit) {
    practice = practice || {}; srs = srs || {};
    const groups = {};
    bank.forEach(function (e) {
      const p = practice[e.id], s = srs[e.id];
      let score = 0;
      if (p && p.last === 'again') score += 2;
      if (s && s.grade === 'again') score += 2;
      else if (s && s.grade === 'partial') score += 1;
      if (s && s.lapses) score += Math.min(3, s.lapses);
      if (!score) return;
      const k = e.role + '|' + e.topic;
      const g = groups[k] = groups[k] || { role: e.role, topic: e.topic, score: 0, ids: [] };
      g.score += score;
      g.ids.push(e.id);
    });
    return Object.keys(groups).map(function (k) { return groups[k]; })
      .sort(function (a, b) { return b.score - a.score || b.ids.length - a.ids.length || (a.topic < b.topic ? -1 : a.topic > b.topic ? 1 : 0); })
      .slice(0, limit || 3)
      .map(function (g) {
        return { role: g.role, topic: g.topic, score: g.score, count: g.ids.length, ids: g.ids,
          href: '#/questions?role=' + encodeURIComponent(g.role) + '&show=weak&q=' + encodeURIComponent(g.topic),
          why: g.ids.length + (g.ids.length === 1 ? ' question' : ' questions') + ' you marked as needing practice or got wrong in review' };
      });
  }

  /* Mock interview recommendation from the saved history (newest first, as js/views.js stores it). */
  function mockAdvice(mocks, profile, today) {
    const href = '#/mock' + (profile ? '?role=' + encodeURIComponent(profile.role) + '&level=' + profile.level : '');
    const list = (mocks || []).filter(function (m) { return m && SRS.validDay(m.day); });
    if (!list.length) return { kind: 'first', href: href, text: 'Try a 3-question timed mock round to see how your answers hold up under time pressure.' };
    const last = list[0];
    const ago = SRS.diff(last.day, today);
    if (ago >= 7) return { kind: 'stale', href: href, daysAgo: ago, text: 'Your last mock round was ' + ago + ' days ago. A short round today keeps answering under time pressure familiar.' };
    const sum = IGU.mock && Array.isArray(last.items) ? IGU.mock.summarize(last.items) : null;
    if (sum && sum.weakest) return { kind: 'focus', href: href, daysAgo: ago, focus: sum.weakest.label,
      text: 'In your last mock round, "' + sum.weakest.label + '" scored lowest. Focus on it in the next round.' };
    return { kind: 'recent', href: href, daysAgo: ago, text: 'You did a mock round ' + (ago === 0 ? 'today' : ago === 1 ? 'yesterday' : ago + ' days ago') + '. Next one in a few days.' };
  }

  /* input: { profile (validated plan profile or null), bank, done, practice, srs, mocks, plan (stored plan object), streak, today } */
  function summarize(input) {
    const bank = input.bank, today = input.today;
    const done = input.done || {}, practice = input.practice || {}, srs = input.srs || {}, plan = input.plan || {};
    const profile = input.profile || null;
    const counts = SRS.counts(srs, bank, today);
    let reviewedWeek = 0;
    Object.keys(srs).forEach(function (id) { const s = srs[id]; if (s && SRS.validDay(s.last) && SRS.diff(s.last, today) < 7) reviewedWeek++; });
    const completed = {
      prepared: Object.keys(done).length,
      drilled: Object.keys(practice).length,
      reviewedThisWeek: reviewedWeek,
      mocks: (input.mocks || []).length,
      streak: input.streak || 0
    };

    let todayPlan = null, next = null, interview = null;
    if (profile) {
      const skip = (plan.skipped && plan.skipped[today]) || [];
      const t = PL.daily(profile, bank, { done: done, practice: practice, srs: srs, history: input.history, mocks: input.mocks, lastActive: input.lastActive }, today, { skip: skip });
      const doneToday = (plan.completed && plan.completed[today]) || {};
      const left = t.tasks.filter(function (x) { return !doneToday[x.kind + ':' + x.id]; });
      todayPlan = {
        phase: t.phase, daysLeft: t.daysLeft, budget: t.budget, notes: t.notes,
        total: t.tasks.length, left: left.length,
        minutes: t.minutes,
        minutesLeft: left.reduce(function (n, x) { return n + x.minutes; }, 0),
        tasks: left.slice(0, 5)
      };
      if (left.length) next = { title: left[0].kind === 'review' ? 'Review: ' + left[0].title : left[0].title, href: left[0].href, why: left[0].why, minutes: left[0].minutes, kind: left[0].kind };
      const inGear = bank.filter(function (e) { return e.role === profile.role && e.level === profile.level; });
      const prepared = inGear.filter(function (e) { return done[e.id]; }).length;
      interview = {
        role: profile.role, level: profile.level, daysLeft: t.daysLeft,
        gearTotal: inGear.length, gearPrepared: prepared, pct: inGear.length ? Math.round(100 * prepared / inGear.length) : 0,
        upcoming7: counts.upcoming7
      };
    }
    if (!next && counts.due) next = { title: 'Review ' + counts.due + (counts.due === 1 ? ' question' : ' questions') + ' that are due', href: '#/review', why: 'Due today', minutes: counts.due * PL.MIN.review, kind: 'review' };
    if (!next && !profile) next = { title: 'Drill a random question', href: '#/drill', why: 'Answer out loud, then compare with the written answer', minutes: PL.MIN.fresh, kind: 'drill' };

    return {
      hasProfile: !!profile,
      isNew: !completed.prepared && !completed.drilled && !completed.mocks && !Object.keys(srs).length,
      completed: completed,
      due: counts.due, overdue: counts.overdue,
      today: todayPlan,
      next: next,
      weak: weakTopics(bank, practice, srs, 3),
      mock: mockAdvice(input.mocks, profile, today),
      interview: interview
    };
  }

  IGU.dashboard = { ONBOARDING_MINUTES: ONBOARDING_MINUTES, summarize: summarize, weakTopics: weakTopics, mockAdvice: mockAdvice };
})();
