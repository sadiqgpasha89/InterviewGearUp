/* Readiness (#/readiness): evidence-based view of preparation (Phase 6).
   Statuses come from js/readiness.js; every one is shown with the evidence and the rule behind it.
   Local data only, no AI, no single overall score and no prediction of interview results. DOM is built with h() only. */
(function () {
  const IGU = window.IGU;
  IGU.routes = IGU.routes || {};
  const RD = IGU.readiness, PL = IGU.planner, meta = IGU.meta;
  const ui = function () { return IGU.ui; };

  function fill(el) {
    el.replaceChildren();
    Array.prototype.slice.call(arguments, 1).forEach(function (k) { (Array.isArray(k) ? k : [k]).forEach(function (x) { if (x !== null && x !== undefined && x !== false) el.append(x); }); });
  }

  IGU.routes.readiness = {
    title: 'Readiness',
    render: function (params) {
      const u = ui(), h = u.h, store = u.store, app = u.app;
      const day = u.today();
      const plan = store.get('plan', {}) || {};
      const prof = plan.profile && PL.validateProfile(plan.profile, null).ok ? plan.profile : null;
      const role = params.get('role') || (prof ? prof.role : 'backend');
      const level = Number(params.get('level')) || (prof ? prof.level : 2);
      const rd = store.get('readiness', {}) || {};

      const r = RD.assess({
        bank: u.bank, today: day, since: rd.since || '', profile: { role: role, level: level },
        done: u.done.all(), practice: store.get('practice', {}), srs: store.get('srs', {}), history: store.get('history', []), mocks: store.get('mocks', []),
        coding: store.get('coding', {}), codingProblems: IGU.codingProblems || [], designs: store.get('designs', {}), designProblems: IGU.designProblems || [],
        stories: store.get('stories', []), jdTarget: store.get('jdTarget', null)
      });

      const pill = function (st, sparse) {
        return h('span', { class: 'pill rd-' + st }, RD.STATUS[st].label + (sparse && st !== 'not-assessed' ? ' · limited evidence' : ''));
      };
      const row = function (label, x, href) {
        return h('li', { class: 'rd-row' },
          h('div', { class: 'rd-head' }, href ? h('a', { href: href }, label) : h('strong', null, label), ' ', pill(x.status, x.sparse)),
          h('div', { class: 'muted small-text' }, x.evidence));
      };
      const roleSel = h('select', { id: 'rd-role', onchange: function () { u.go('#/readiness?role=' + roleSel.value + '&level=' + lvlSel.value); } },
        meta.roles.map(function (x) { return h('option', { value: x.id, selected: x.id === role }, x.name); }));
      const lvlSel = h('select', { id: 'rd-level', onchange: function () { u.go('#/readiness?role=' + roleSel.value + '&level=' + lvlSel.value); } },
        meta.levels.map(function (l) { return h('option', { value: String(l.n), selected: l.n === level }, 'Gear ' + l.n + ': ' + l.name); }));

      const groups = ['needs-practice', 'developing', 'strong', 'not-assessed'].map(function (st) {
        const list = r.topics.filter(function (t) { return t.status === st; });
        return list.length ? h('details', { class: 'rd-group', open: st !== 'not-assessed' && st !== 'strong' },
          h('summary', null, RD.STATUS[st].label + ' (' + list.length + ')'),
          h('ul', { class: 'plain-list' }, list.map(function (t) { return row(t.topic, t, t.href); }))) : null;
      });

      fill(app, h('div', { class: 'plan-page readiness' },
        h('h1', null, 'Readiness'),
        h('p', { class: 'lede' }, 'What your own practice shows, topic by topic and round by round. Each status follows a written rule and lists its evidence. There is no overall score and nothing here predicts an interview result.'),
        h('div', { class: 'drill-filters' }, h('div', null, h('label', { for: 'rd-role' }, 'Role'), roleSel), h('div', null, h('label', { for: 'rd-level' }, 'Gear'), lvlSel)),
        r.sparse ? h('p', { class: 'notice' }, 'Limited evidence: ' + r.evidenceCount + ' graded ' + (r.evidenceCount === 1 ? 'attempt' : 'attempts') + (r.since ? ' since ' + r.since : '') + '. Most areas will read "Not assessed" until you grade answers in Drill or Review, run a mock, or use the coding, design and story tools.') : null,

        h('section', { 'aria-label': 'Overview' }, h('h2', null, 'Overview'),
          h('div', { class: 'tiles' }, ['strong', 'developing', 'needs-practice', 'not-assessed'].map(function (k) {
            return h('div', { class: 'tile rd-tile rd-' + k }, h('strong', null, String(r.counts[k])), h('span', null, RD.STATUS[k].label + ' topics'));
          })),
          h('p', { class: 'muted small-text' }, 'Topics: ' + u.roleName(role) + ', gear ' + r.levels.join(' and ') + ', questions with a written answer.')),

        h('section', { 'aria-label': 'Next actions' }, h('h2', null, 'Next three actions'),
          r.actions.length ? h('ol', null, r.actions.map(function (a) { return h('li', null, h('a', { href: a.href }, a.text)); })) : h('p', null, 'Nothing urgent. Keep reviewing what is due.')),

        h('section', { 'aria-label': 'Interview rounds' }, h('h2', null, 'Interview rounds'),
          h('ul', { class: 'plain-list' }, r.rounds.map(function (x) { return row(x.label, x, x.href); }))),

        r.jd ? h('section', { 'aria-label': 'Target job skills' }, h('h2', null, 'Target job: ' + r.jd.title + (r.jd.company ? ' at ' + r.jd.company : '')),
          h('ul', { class: 'plain-list' }, r.jd.skills.map(function (s) { return row(s.name, s, null); })),
          h('p', { class: 'muted small-text' }, h('a', { href: '#/jd' }, 'Change the target job'), ' · Skill status uses the questions the analyzer matched to each skill.'))
          : h('section', null, h('h2', null, 'Target job'), h('p', { class: 'muted' }, 'No target job set. Analyze a job description and choose "Use as my target job" to see readiness per required skill. ', h('a', { href: '#/jd' }, 'Open the analyzer'), '.')),

        h('section', { 'aria-label': 'Topics' }, h('h2', null, 'Topics'), groups),

        h('section', { 'aria-label': 'Progression' }, h('h2', null, 'Progression'),
          h('table', { class: 'rubric rd-weeks' }, h('caption', { class: 'sr-only' }, 'Topic statuses at the end of each of the last six weeks'),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Week ending'), ['strong', 'developing', 'needs-practice', 'not-assessed'].map(function (k) { return h('th', { scope: 'col' }, RD.STATUS[k].label); }))),
            h('tbody', null, r.weeks.map(function (w) { return h('tr', null, h('th', { scope: 'row' }, w.end), ['strong', 'developing', 'needs-practice', 'not-assessed'].map(function (k) { return h('td', null, String(w.counts[k])); })); }))),
          h('p', { class: 'muted small-text' }, 'Rebuilt from your dated attempt history and mock rounds.')),

        h('details', { class: 'rd-rules' }, h('summary', null, 'How each status is decided'), h('ul', null, r.rules.map(function (x) { return h('li', null, x); }))),

        h('div', { class: 'q-actions' },
          h('button', { class: 'btn ghost', type: 'button', onclick: function () {
            if (!confirm('Start a fresh readiness assessment from today? Older evidence is ignored here; your progress, history and review schedule are kept.')) return;
            store.set('readiness', { since: day }); u.render();
          } }, rd.since ? 'Reset again from today' : 'Reset readiness assessment'),
          rd.since ? h('button', { class: 'btn ghost', type: 'button', onclick: function () { store.set('readiness', {}); u.render(); } }, 'Use all evidence again') : null),
        rd.since ? h('p', { class: 'muted small-text' }, 'Counting evidence from ' + rd.since + '.') : null));
    }
  };
})();
