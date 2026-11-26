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
    /* Workload limits (Phase 4). 0 means automatic. */
    const lim = function (v, max, label) {
      if (v === undefined || v === null || v === '') return 0;
      const n = Math.round(Number(v));
      if (!(n >= 0 && n <= max)) { errors.push(label + ' must be between 0 (automatic) and ' + max + '.'); return 0; }
      return n;
    };
    const maxNew = lim(p.maxNew, 10, 'New questions per day');
    const maxReviews = lim(p.maxReviews, 60, 'Reviews per day');
    const restDays = (Array.isArray(p.restDays) ? p.restDays : []).map(Number).filter(function (d, i, a) { return d >= 0 && d <= 6 && d === Math.floor(d) && a.indexOf(d) === i; }).sort();
    if (restDays.length > 5) errors.push('Keep at least two study days a week.');
    return {
      ok: !errors.length, errors: errors,
      profile: { role: p.role, level: level, company: company, interviewDate: date, minutes: minutes, weakTopics: weak, createdDay: p.createdDay || today || '',
        maxNew: maxNew, maxReviews: maxReviews, restDays: restDays }
    };
  }

  function phase(daysLeft) {
    if (daysLeft === null) return { id: 'open', label: 'Open-ended', why: 'No interview date set, so the plan alternates new questions and reviews.' };
    if (daysLeft <= 3) return { id: 'final', label: 'Final review', why: 'Three days or fewer left: no new questions, only reviews and light practice.' };
    if (daysLeft <= 14) return { id: 'strengthen', label: 'Strengthen weak spots', why: 'Two weeks or fewer left: weak and overdue questions come first.' };
    return { id: 'build', label: 'Build coverage', why: 'More than two weeks left: work through new questions in your gear.' };
  }

  /* Minutes to study one new question: reading its answer at about 200 words a minute plus 3 minutes answering aloud, 5 to 15. */
  function freshMinutes(e) {
    const words = (String(e.short || '') + ' ' + String(e.detail || '')).split(/\s+/).length;
    return Math.max(5, Math.min(15, Math.round(words / 200) + 3));
  }
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekday = function (day) { const p = day.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay(); };

  /* ctx: { done, practice, srs, history, mocks, lastActive }; opts: { skip: [ids to leave out today] }. Deterministic.
     Rules, in order:
     1. Reviews first, but capped so they cannot crowd out new learning: at most a phase-dependent share of the budget,
        at most profile.maxReviews, and in the build and open phases one new-question slot is always kept free.
        Reviews over the cap stay due and are spread over the next days (missed-day recovery).
     2. New questions in the learner's gear, ranked by weak-topic evidence (js/adaptive.js), then gear, then id.
     3. A mock round every third day when there is time.
     Rest days carry only a short review session. */
  function daily(profile, bank, ctx, today, opts) {
    opts = opts || {};
    ctx = ctx || {};
    const skip = {}; (opts.skip || []).forEach(function (id) { skip[id] = 1; });
    const done = ctx.done || {}, practice = ctx.practice || {}, srs = ctx.srs || {};
    const daysLeft = profile.interviewDate ? SRS.diff(today, profile.interviewDate) : null;
    const ph = phase(daysLeft);
    const notes = [];
    const rest = (profile.restDays || []).indexOf(weekday(today)) >= 0 && (daysLeft === null || daysLeft > 3);
    const budget = rest ? Math.min(15, profile.minutes) : profile.minutes;
    const tasks = [];
    let used = 0;
    const add = function (t) { tasks.push(t); used += t.minutes; };
    if (rest) notes.push(WEEKDAYS[weekday(today)] + ' is one of your rest days: only a short review session today.');

    if (ctx.lastActive && SRS.validDay(ctx.lastActive) && SRS.diff(ctx.lastActive, today) >= 3) {
      notes.push('Welcome back: ' + SRS.diff(ctx.lastActive, today) + ' days since your last session. Today stays within your usual time; overdue reviews are spread over the next few days instead of all at once.');
    }

    /* 1. Reviews */
    const reviewShare = rest || ph.id === 'final' ? 1 : ph.id === 'strengthen' ? 0.6 : 0.4;
    const keepNew = !rest && (ph.id === 'build' || ph.id === 'open') && budget >= MIN.review + MIN.fresh ? MIN.fresh : 0;
    let reviewCap = Math.min(Math.floor(budget * reviewShare / MIN.review), Math.floor((budget - keepNew) / MIN.review));
    if (profile.maxReviews) reviewCap = Math.min(reviewCap, profile.maxReviews);
    const dueList = SRS.queue(srs, bank, today, {}).filter(function (x) { return !skip[x.id]; })
      .filter(function (x) { return x.entry.role === profile.role || x.entry.role === 'general'; });
    dueList.slice(0, reviewCap).forEach(function (x) {
      add({ kind: 'review', id: x.id, title: x.entry.q, minutes: MIN.review, href: '#/review',
        why: x.overdue > 0 ? 'Review, ' + x.overdue + (x.overdue === 1 ? ' day' : ' days') + ' overdue' : 'Review due today' });
    });
    if (dueList.length > reviewCap) notes.push((dueList.length - reviewCap) + ' more ' + (dueList.length - reviewCap === 1 ? 'review is' : 'reviews are') + ' due. They stay in the Review queue and come back over the next days, so new learning still fits in today.');

    /* 2. New questions */
    if (ph.id !== 'final' && !rest) {
      const weakTopic = {};
      profile.weakTopics.forEach(function (t) { weakTopic[t] = 1; });
      const sig = IGU.adaptive ? IGU.adaptive.weakSignals({ bank: bank, today: today, history: ctx.history, practice: practice, srs: srs, mocks: ctx.mocks }) : { byTopic: {}, byId: {} };
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
      const reasonFor = function (e) {
        const t = sig.byTopic[e.role + '|' + e.topic];
        const named = Object.keys(weakTopic).filter(function (w) { return String(e.topic || '').toLowerCase().indexOf(w) >= 0 || (e.tags || []).some(function (g) { return String(g).toLowerCase() === w; }); });
        return { score: (t ? Math.min(6, t.score) : 0) + (named.length ? 2 : 0), evidence: t ? t.reasons : [], named: named };
      };
      const rank = function (e) { const r = reasonFor(e); return [-r.score, e.level === profile.level ? 0 : 1, e.id]; };
      cands.sort(function (a, b) {
        const x = rank(a), y = rank(b);
        return x[0] - y[0] || x[1] - y[1] || (x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0);
      });
      /* Balance: at most two questions from the same topic per day, so one weak topic cannot fill the whole day. */
      const perTopic = {}, first = [], later = [];
      cands.forEach(function (e) { const k = e.topic; perTopic[k] = (perTopic[k] || 0) + 1; (perTopic[k] <= 2 ? first : later).push(e); });
      cands = first.concat(later);
      let i = 0, added = 0;
      const maxNew = profile.maxNew || 99;
      while (i < cands.length && added < maxNew) {
        const e = cands[i++];
        const mins = freshMinutes(e);
        if (used + mins > budget - (budget >= 40 && added ? MIN.review : 0) && added) break;
        if (used + mins > budget + 5) break;
        const r = reasonFor(e);
        const why = r.evidence.length ? 'Weak topic ' + e.topic + ': ' + r.evidence[0] : r.named.length ? 'You asked for extra time on ' + r.named[0] : 'New question in gear ' + e.level + (e.level === profile.level ? '' : ' (adjacent to yours)');
        add({ kind: 'new', id: e.id, title: e.q, minutes: mins, href: '#/q/' + e.id, why: why });
        added++;
      }
      if (!cands.length) notes.push('No unprepared question with a written answer is left for this role and gear. Try Drill on questions without an answer, or help write answers (CONTRIBUTING.md).');
      if (daysLeft !== null && daysLeft <= 14 && daysLeft > 3 && cands.length) {
        const perDay = Math.max(1, added);
        const fits = perDay * (daysLeft - 3);
        if (cands.length > fits) notes.push('About ' + fits + ' of the ' + cands.length + ' unprepared questions in your gear fit before the final review days, so questions in your weak topics come first.');
      }
    }

    /* 3. A mock round every third day, when there is time for one. */
    const sinceStart = profile.createdDay ? SRS.diff(profile.createdDay, today) : 0;
    if (!rest && budget >= 40 && (daysLeft === null || daysLeft >= 2) && sinceStart % 3 === 2 && used + MIN.mock <= budget + 10) {
      add({ kind: 'mock', id: 'mock', title: 'Mock interview: 3 questions, timed', minutes: MIN.mock, href: '#/mock?role=' + profile.role + '&level=' + profile.level,
        why: 'Every third day: practise answering under time pressure' });
    }

    if (!tasks.length) notes.push('Nothing is scheduled for today. Reviews appear here once you grade questions in Drill or Review.');
    return { today: today, daysLeft: daysLeft, phase: ph, tasks: tasks, minutes: used, budget: budget, rest: rest, notes: notes };
  }

  IGU.planner = { MIN: MIN, WEEKDAYS: WEEKDAYS, validateProfile: validateProfile, phase: phase, daily: daily, freshMinutes: freshMinutes };
})();
