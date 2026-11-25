/* Prep planner: turns a small profile and what you have already done into today's tasks.
   This is a HEURISTIC schedule built from fixed rules (see phase() and daily()), not a prediction of readiness.
   Pure functions; `today` is a local "YYYY-MM-DD" day. */
(function () {
  const IGU = (window.IGU = window.IGU || {});
  const SRS = IGU.srs, Q = IGU.quality;

  const MIN = { review: 3, fresh: 8, mock: 25 };

  /* Returns { ok, errors, profile } with a cleaned copy of the profile. */
  function validateProfile(p, today) {
    p = p || {};
    const errors = [];
    const roles = (IGU.meta.roles || []).map(function (r) { return r.id; });
    if (roles.indexOf(p.role) < 0) errors.push('Choose a role.');
    const level = Number(p.level);
    if ([1, 2, 3, 4].indexOf(level) < 0) errors.push('Choose a gear.');
    let date = p.interviewDate || '';
    if (date && !SRS.validDay(date)) errors.push('Interview date must be a real date.');
    else if (date && today && date < today) errors.push('Interview date is in the past. Pick a future date or leave it empty.');
    const minutes = Math.round(Number(p.minutes));
    if (!(minutes >= 15 && minutes <= 240)) errors.push('Daily study time must be between 15 and 240 minutes.');
    const company = String(p.company || '').trim().slice(0, 80);
    const weak = (Array.isArray(p.weakTopics) ? p.weakTopics : String(p.weakTopics || '').split(','))
      .map(function (t) { return String(t).trim().toLowerCase(); }).filter(Boolean).slice(0, 8);
    return {
      ok: !errors.length, errors: errors,
      profile: { role: p.role, level: level, company: company, interviewDate: date, minutes: minutes, weakTopics: weak, createdDay: p.createdDay || today || '' }
    };
  }

  function phase(daysLeft) {
    if (daysLeft === null) return { id: 'open', label: 'Open-ended', why: 'No interview date set, so the plan alternates new questions and reviews.' };
    if (daysLeft <= 3) return { id: 'final', label: 'Final review', why: 'Three days or fewer left: no new questions, only reviews and light practice.' };
    if (daysLeft <= 14) return { id: 'strengthen', label: 'Strengthen weak spots', why: 'Two weeks or fewer left: weak and overdue questions come first.' };
    return { id: 'build', label: 'Build coverage', why: 'More than two weeks left: work through new questions in your gear.' };
  }

  /* ctx: { done, practice, srs }; opts: { skip: [ids to leave out today] }. Deterministic. */
  function daily(profile, bank, ctx, today, opts) {
    opts = opts || {};
    ctx = ctx || {};
    const skip = {}; (opts.skip || []).forEach(function (id) { skip[id] = 1; });
    const done = ctx.done || {}, practice = ctx.practice || {}, srs = ctx.srs || {};
    const daysLeft = profile.interviewDate ? SRS.diff(today, profile.interviewDate) : null;
    const ph = phase(daysLeft);
    const notes = [];
    const budget = profile.minutes;
    const tasks = [];
    let used = 0;
    const add = function (t) { tasks.push(t); used += t.minutes; };

    /* 1. Reviews that are due (always first). In the final phase they take the whole budget. */
    const reviewShare = ph.id === 'final' ? 1 : ph.id === 'strengthen' ? 0.6 : 0.4;
    const reviewCap = Math.floor(budget * reviewShare / MIN.review);
    SRS.queue(srs, bank, today, {}).filter(function (x) { return !skip[x.id]; })
      .filter(function (x) { return x.entry.role === profile.role || x.entry.role === 'general'; })
      .slice(0, reviewCap).forEach(function (x) {
        add({ kind: 'review', id: x.id, title: x.entry.q, minutes: MIN.review, href: '#/review',
          why: x.overdue > 0 ? 'Review, ' + x.overdue + (x.overdue === 1 ? ' day' : ' days') + ' overdue' : 'Review due today' });
      });

    /* 2. New questions with a written answer, in the chosen gear first. Skipped in the final phase. */
    if (ph.id !== 'final') {
      const weakTopic = {};
      profile.weakTopics.forEach(function (t) { weakTopic[t] = 1; });
      const weakIds = {};
      Object.keys(practice).forEach(function (id) { if (practice[id] && practice[id].last === 'again') weakIds[id] = 1; });
      const pool = function (levels) {
        return bank.filter(function (e) {
          return e.role === profile.role && levels.indexOf(e.level) >= 0 && Q.isReal(e) && !done[e.id] && !skip[e.id] && !srs[e.id];
        });
      };
      let cands = pool([profile.level]);
      if (cands.length < 3) {
        const wider = pool([profile.level, profile.level - 1, profile.level + 1].filter(function (n) { return n >= 1 && n <= 4; }));
        if (wider.length > cands.length) notes.push('Few unprepared full answers are left in your gear, so adjacent gears are included.');
        cands = wider;
      }
      const rank = function (e) {
        const topic = String(e.topic || '').toLowerCase();
        const weak = (weakIds[e.id] ? 2 : 0) + (Object.keys(weakTopic).some(function (t) { return topic.indexOf(t) >= 0 || (e.tags || []).some(function (g) { return String(g).toLowerCase() === t; }); }) ? 1 : 0);
        return [-weak, e.level === profile.level ? 0 : 1, e.id];
      };
      cands.sort(function (a, b) {
        const x = rank(a), y = rank(b);
        return x[0] - y[0] || x[1] - y[1] || (x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0);
      });
      let i = 0;
      while (i < cands.length && used + MIN.fresh <= budget - (budget >= 40 ? MIN.review : 0)) {
        const e = cands[i++];
        add({ kind: 'new', id: e.id, title: e.q, minutes: MIN.fresh, href: '#/q/' + e.id, why: 'New question for gear ' + e.level });
      }
      if (!cands.length) notes.push('No unprepared question with a written answer is left for this role and gear. Try Drill on questions without an answer, or help write answers (CONTRIBUTING.md).');
    }

    /* 3. A mock round every third day, when there is time for one. */
    const sinceStart = profile.createdDay ? SRS.diff(profile.createdDay, today) : 0;
    if (budget >= 40 && (daysLeft === null || daysLeft >= 2) && sinceStart % 3 === 2 && used + MIN.mock <= budget + 10) {
      add({ kind: 'mock', id: 'mock', title: 'Mock interview: 3 questions, timed', minutes: MIN.mock, href: '#/mock?role=' + profile.role + '&level=' + profile.level,
        why: 'Every third day' });
    }

    if (!tasks.length) notes.push('Nothing is scheduled for today. Reviews appear here once you grade questions in Drill or Review.');
    return { today: today, daysLeft: daysLeft, phase: ph, tasks: tasks, minutes: used, budget: budget, notes: notes };
  }

  IGU.planner = { MIN: MIN, validateProfile: validateProfile, phase: phase, daily: daily };
})();
