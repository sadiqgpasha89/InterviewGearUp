/* Interview readiness evidence (Phase 6). Pure and deterministic.
   Every status is computed by a written rule from local practice evidence and carries that evidence as text.
   Rules: no single overall score, no hiring prediction, no AI. Too little evidence gives "Not assessed", never a guess.
   Statuses: 'strong' | 'developing' | 'needs-practice' | 'not-assessed'. `since` (optional day) ignores older evidence,
   which is how a learner resets the assessment without deleting their progress. */
(function () {
  const IGU = (window.IGU = window.IGU || {});
  const SRS = IGU.srs, Q = IGU.quality, AD = IGU.adaptive;

  const STATUS = {
    strong: { label: 'Strong', rank: 3 },
    developing: { label: 'Developing', rank: 2 },
    'needs-practice': { label: 'Needs practice', rank: 1 },
    'not-assessed': { label: 'Not assessed', rank: 0 }
  };
  const RULES = [
    'Topics: Not assessed until at least 2 graded attempts (Drill or Review). Strong needs recency-weighted recall of 75% or more over at least 3 attempts on 2 or more questions, practised in the last 30 days. Under 50% is Needs practice. A low mock score on the topic lowers recall by 15 points.',
    'Coding: Not assessed until a problem is run. Strong needs 5 or more solved and 70% of attempted problems solved; under 40% is Needs practice.',
    'System design: Not assessed until a workspace has written content. Strong needs one design rated Thorough or two rated Solid by the self-review; only Early drafts is Needs practice.',
    'Behavioral: Not assessed until a story exists. Strong needs 5 complete STAR stories covering 7 of the 10 competencies; fewer than 2 complete stories is Needs practice.',
    'Mock interviews (last 30 days): Not assessed with no rounds. Strong needs 2 or more rounds at 75% or more of rubric points; under 45% is Needs practice. Rubric points measure answer shape, not correctness or hiring chances.'
  ];

  const pct = function (x) { return Math.round(100 * x); };
  const after = function (day, since) { return SRS.validDay(day) && (!since || day >= since); };
  const isoDay = function (iso) { return typeof iso === 'string' ? iso.slice(0, 10) : ''; };

  function topicStatus(t, today) {
    if (t.attempts < 2) return { status: 'not-assessed', evidence: 'Studied ' + t.studied + ' of ' + t.total + '; ' + (t.attempts ? '1 graded attempt' : 'no graded attempts') + ' yet.' };
    let score = t.score;
    const bits = [pct(t.score) + '% recall over ' + t.attempts + ' attempts on ' + t.questions + (t.questions === 1 ? ' question' : ' questions')];
    if (t.lowMock) { score -= 0.15; bits.push(t.lowMock + ' low mock ' + (t.lowMock === 1 ? 'answer' : 'answers')); }
    const age = t.last ? SRS.diff(t.last, today) : 999;
    bits.push('last practised ' + (age === 0 ? 'today' : age + (age === 1 ? ' day ago' : ' days ago')));
    let status = score < 0.5 ? 'needs-practice' : (score >= 0.75 && t.attempts >= 3 && t.questions >= 2 && age <= 30) ? 'strong' : 'developing';
    if (status === 'developing' && score >= 0.75 && age > 30) bits.push('practise again to confirm');
    return { status: status, evidence: bits.join(', ') + '.', sparse: t.attempts < 4 };
  }

  /* Per-topic evidence for a set of questions. */
  function topicRows(questions, input, since, today) {
    const hist = (input.history || []).filter(function (x) { return after(x.d, since); });
    const m = AD.mastery(hist, today);
    const lowMock = {};
    (input.mocks || []).forEach(function (s) {
      if (!s || !after(s.day, since) || !Array.isArray(s.items)) return;
      s.items.forEach(function (it) { const b = it && it.result && it.result.band; if (b === 'Needs work' || b === 'Off topic') lowMock[it.qid] = (lowMock[it.qid] || 0) + 1; });
    });
    const done = input.done || {};
    const groups = {};
    questions.forEach(function (e) {
      const k = e.role + '|' + e.topic;
      const g = groups[k] = groups[k] || { role: e.role, topic: e.topic, total: 0, studied: 0, attempts: 0, questions: 0, sw: 0, last: '', lowMock: 0, ids: [] };
      g.total++; g.ids.push(e.id);
      if (done[e.id]) g.studied++;
      if (lowMock[e.id]) g.lowMock += lowMock[e.id];
      const x = m[e.id];
      if (x) { g.questions++; g.attempts += x.attempts; g.sw += x.score * x.attempts; if (x.last > g.last) g.last = x.last; }
    });
    return Object.keys(groups).sort().map(function (k) {
      const g = groups[k];
      g.score = g.attempts ? g.sw / g.attempts : 0;
      const st = topicStatus(g, today);
      return { role: g.role, topic: g.topic, total: g.total, studied: g.studied, attempts: g.attempts, ids: g.ids, status: st.status, evidence: st.evidence, sparse: !!st.sparse,
        href: '#/questions?role=' + encodeURIComponent(g.role) + '&q=' + encodeURIComponent(g.topic) };
    });
  }

  function codingRound(input, since) {
    const state = input.coding || {}, problems = input.codingProblems || [];
    let attempted = 0, solved = 0;
    problems.forEach(function (p) {
      const s = state[p.id];
      if (!s || !(s.runs > 0) || (since && isoDay(s.at) && isoDay(s.at) < since)) return;
      attempted++; if (s.status === 'solved') solved++;
    });
    if (!attempted) return { id: 'coding', label: 'Coding', status: 'not-assessed', evidence: 'No coding lab problem run yet (' + problems.length + ' available).', href: '#/coding' };
    const r = solved / attempted;
    const status = solved >= 5 && r >= 0.7 ? 'strong' : r < 0.4 ? 'needs-practice' : 'developing';
    return { id: 'coding', label: 'Coding', status: status, evidence: solved + ' of ' + attempted + ' attempted problems solved (' + problems.length + ' available).', sparse: attempted < 3, href: '#/coding' };
  }

  function designRound(input, since) {
    const all = input.designs || {}, problems = input.designProblems || [], DS = IGU.design;
    const bands = [];
    problems.forEach(function (p) {
      const ws = all[p.id];
      if (!ws || !DS || (since && isoDay(ws.updatedAt) && isoDay(ws.updatedAt) < since)) return;
      const w = DS.clean(ws, p.id);
      const written = DS.SECTIONS.reduce(function (n, s) { return n + String(w.sections[s.id] || '').trim().length; }, 0);
      if (written < 80) return;
      bands.push(DS.review(w, p).band);
    });
    if (!bands.length) return { id: 'design', label: 'System design', status: 'not-assessed', evidence: 'No design exercise written yet (' + problems.length + ' available).', href: '#/design' };
    const n = function (b) { return bands.filter(function (x) { return x === b; }).length; };
    const status = n('Thorough') >= 1 || n('Solid') >= 2 ? 'strong' : n('Early draft') === bands.length ? 'needs-practice' : 'developing';
    return { id: 'design', label: 'System design', status: status, evidence: bands.length + ' written: ' + ['Thorough', 'Solid', 'Developing', 'Early draft'].filter(n).map(function (b) { return n(b) + ' ' + b.toLowerCase(); }).join(', ') + ' (self-review checks coverage, not quality).', sparse: bands.length < 2, href: '#/design' };
  }

  function behavioralRound(input, since) {
    const ST = IGU.stories;
    const list = (input.stories || []).filter(function (s) { return s && (!since || isoDay(s.updatedAt || s.createdAt) >= since); });
    if (!list.length || !ST) return { id: 'behavioral', label: 'Behavioral', status: 'not-assessed', evidence: 'No stories in the story bank yet.', href: '#/stories' };
    const complete = list.filter(function (s) { return ST.completeness(s).complete; });
    const tags = {}; complete.forEach(function (s) { (s.tags || []).forEach(function (t) { tags[t] = 1; }); });
    const covered = Object.keys(tags).length, all = ST.TAGS.length;
    const status = complete.length >= 5 && covered >= 7 ? 'strong' : complete.length < 2 ? 'needs-practice' : 'developing';
    const missing = ST.TAGS.filter(function (t) { return !tags[t]; });
    return { id: 'behavioral', label: 'Behavioral', status: status, evidence: complete.length + ' complete STAR ' + (complete.length === 1 ? 'story' : 'stories') + ' covering ' + covered + ' of ' + all + ' competencies' + (missing.length ? '; none yet for ' + missing.slice(0, 4).join(', ') : '') + '.', sparse: complete.length < 3, href: '#/stories' };
  }

  function mockRound(input, since, today) {
    const rounds = (input.mocks || []).filter(function (s) { return s && after(s.day, since) && SRS.diff(s.day, today) <= 30 && SRS.diff(s.day, today) >= 0; });
    let pts = 0, max = 0;
    rounds.forEach(function (s) { (s.items || []).forEach(function (it) { if (it.result && !it.result.empty) { pts += it.result.total; max += it.result.max; } }); });
    if (!rounds.length || !max) return { id: 'mock', label: 'Mock interviews', status: 'not-assessed', evidence: 'No answered mock round in the last 30 days.', href: '#/mock' };
    const r = pts / max;
    const status = rounds.length >= 2 && r >= 0.75 ? 'strong' : r < 0.45 ? 'needs-practice' : 'developing';
    return { id: 'mock', label: 'Mock interviews', status: status, evidence: rounds.length + (rounds.length === 1 ? ' round' : ' rounds') + ' in 30 days, ' + pct(r) + '% of rubric points.', sparse: rounds.length < 2, href: '#/mock' };
  }

  function technicalRound(topics) {
    const assessed = topics.filter(function (t) { return t.status !== 'not-assessed'; });
    if (assessed.length < 3) return { id: 'technical', label: 'Technical questions', status: 'not-assessed', evidence: assessed.length + ' of ' + topics.length + ' topics assessed; at least 3 are needed.', href: '#/drill' };
    const strong = assessed.filter(function (t) { return t.status === 'strong'; }).length, weak = assessed.filter(function (t) { return t.status === 'needs-practice'; }).length;
    const status = strong / assessed.length >= 0.6 && !weak ? 'strong' : weak / assessed.length > 0.4 ? 'needs-practice' : 'developing';
    return { id: 'technical', label: 'Technical questions', status: status, evidence: assessed.length + ' of ' + topics.length + ' topics assessed: ' + strong + ' strong, ' + weak + ' need practice.', sparse: assessed.length < topics.length / 3, href: '#/drill' };
  }

  function jdSkills(input, since, today) {
    const t = input.jdTarget;
    if (!t || !Array.isArray(t.skills) || !IGU.jd) return null;
    const index = {}; input.bank.forEach(function (e) { index[e.id] = e; });
    return { title: t.title, company: t.company, day: t.day, skills: t.skills.filter(function (id) { return IGU.jd.SKILLS.some(function (s) { return s.id === id; }); }).map(function (id) {
      const sk = IGU.jd.SKILLS.filter(function (s) { return s.id === id; })[0];
      const map = IGU.jd.mapSkill(id, input.bank, t.role);
      if (!map.total) return { id: id, name: sk.name, status: 'not-assessed', evidence: 'No question in the bank covers this skill; prepare it from official documentation.', uncovered: true };
      const all = input.bank.filter(function (e) { return map.ids.indexOf(e.id) >= 0; });
      const row = topicRows(all.map(function (e) { return Object.assign({}, e, { topic: sk.name, role: t.role }); }), input, since, today)[0];
      return { id: id, name: sk.name, status: row.status, evidence: row.evidence, ids: map.ids };
    }) };
  }

  function assess(input) {
    const today = input.today, since = input.since || '';
    const profile = input.profile || { role: 'backend', level: 2 };
    const levels = [profile.level - 1, profile.level].filter(function (n) { return n >= 1; });
    const qs = input.bank.filter(function (e) { return e.role === profile.role && levels.indexOf(e.level) >= 0 && Q.isReal(e); });
    const topics = topicRows(qs, input, since, today);
    const rounds = [technicalRound(topics), codingRound(input, since), designRound(input, since), behavioralRound(input, since), mockRound(input, since, today)];
    const counts = {}; Object.keys(STATUS).forEach(function (k) { counts[k] = topics.filter(function (t) { return t.status === k; }).length; });

    /* Next three actions: weakest assessed topics first, then rounds with no evidence, then large unassessed topics. */
    const actions = [];
    topics.filter(function (t) { return t.status === 'needs-practice'; }).slice(0, 2).forEach(function (t) { actions.push({ text: 'Drill ' + t.topic + ': ' + t.evidence, href: t.href }); });
    rounds.filter(function (r) { return r.status === 'not-assessed'; }).forEach(function (r) { if (actions.length < 3) actions.push({ text: 'Get evidence for ' + r.label.toLowerCase() + ': ' + r.evidence, href: r.href }); });
    rounds.filter(function (r) { return r.status === 'needs-practice'; }).forEach(function (r) { if (actions.length < 3) actions.push({ text: 'Practise ' + r.label.toLowerCase() + ': ' + r.evidence, href: r.href }); });
    topics.filter(function (t) { return t.status === 'not-assessed'; }).sort(function (a, b) { return b.total - a.total || (a.topic < b.topic ? -1 : 1); })
      .forEach(function (t) { if (actions.length < 3) actions.push({ text: 'Try ' + t.topic + ' in Drill: ' + t.evidence, href: t.href }); });

    /* Progression: topic statuses at the end of each of the last 6 weeks, from the dated attempt history only. */
    const weeks = [];
    for (let w = 5; w >= 0; w--) {
      const end = SRS.shift(today, -7 * w);
      const rows = topicRows(qs, { history: (input.history || []).filter(function (x) { return x.d <= end; }), mocks: (input.mocks || []).filter(function (s) { return s && s.day <= end; }), done: {} }, since, end);
      const c = {}; Object.keys(STATUS).forEach(function (k) { c[k] = rows.filter(function (t) { return t.status === k; }).length; });
      weeks.push({ end: end, counts: c });
    }

    const evidenceCount = (input.history || []).filter(function (x) { return after(x.d, since); }).length;
    return {
      role: profile.role, level: profile.level, levels: levels, since: since,
      sparse: evidenceCount < 10,
      evidenceCount: evidenceCount,
      counts: counts, topics: topics, rounds: rounds,
      strong: topics.filter(function (t) { return t.status === 'strong'; }),
      weak: topics.filter(function (t) { return t.status === 'needs-practice'; }),
      unassessed: topics.filter(function (t) { return t.status === 'not-assessed'; }),
      jd: jdSkills(input, since, today),
      actions: actions.slice(0, 3),
      weeks: weeks,
      rules: RULES
    };
  }

  IGU.readiness = { STATUS: STATUS, RULES: RULES, assess: assess, topicStatus: topicStatus };
})();
