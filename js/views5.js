/* Home (#/home): first-run onboarding and the preparation dashboard (Phase 2).
   Reuses the Plan profile (igu.plan.profile) and the planner, so there is still one plan, one schedule and one source of truth.
   Everything stays in this browser; nothing here needs an AI key or the network. DOM is built with h() only. */
(function () {
  const IGU = window.IGU;
  IGU.routes = IGU.routes || {};
  const meta = IGU.meta, PL = IGU.planner, DB = IGU.dashboard, S = IGU.stats;
  const ui = function () { return IGU.ui; };

  function fill(el) {
    el.replaceChildren();
    Array.prototype.slice.call(arguments, 1).forEach(function (k) { (Array.isArray(k) ? k : [k]).forEach(function (x) { if (x !== null && x !== undefined && x !== false) el.append(x); }); });
  }
  const plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); };

  IGU.routes.home = {
    title: 'Home',
    render: function () {
      const u = ui(), h = u.h, store = u.store, app = u.app;
      const day = u.today();
      const plan = store.get('plan', {}) || {};
      const onb = store.get('onboarding', {}) || {};
      const hasProfile = !!(plan.profile && PL.validateProfile(plan.profile, null).ok);

      if (!hasProfile && !onb.skipped) { onboarding(); return; }
      dashboard();

      /* ---------- first run ---------- */
      function onboarding() {
        const err = h('p', { class: 'notice bad', role: 'alert', hidden: true });
        const role = h('select', { id: 'ob-role', required: true },
          [h('option', { value: '' }, 'Choose your target role')].concat(meta.roles.map(function (r) { return h('option', { value: r.id }, r.name); })));
        const gears = h('div', { class: 'ob-gears', role: 'radiogroup', 'aria-labelledby': 'ob-gear-label' }, meta.levels.map(function (l) {
          return h('label', { class: 'ob-gear' },
            h('input', { type: 'radio', name: 'ob-gear', value: String(l.n), checked: l.n === 2 }),
            h('span', { class: 'gear g' + l.n, 'aria-hidden': 'true' }, String(l.n)),
            h('span', null, h('strong', null, l.name), h('span', { class: 'muted small-text' }, l.years)));
        }));
        const date = h('input', { id: 'ob-date', type: 'date', min: day });
        const mins = h('select', { id: 'ob-mins' }, DB.ONBOARDING_MINUTES.map(function (m) { return h('option', { value: String(m), selected: m === 30 }, m + ' minutes'); }));

        fill(app, h('div', { class: 'home onboarding' },
          h('h1', null, 'Your personal, evidence-based interview coach'),
          h('p', { class: 'lede' }, 'Built for engineers and tech leads across ' + meta.roles.length + ' IT roles, from first job (Gear 1) to Staff/EM (Gear 4). Unlike a static question list, InterviewGearUp turns preparation into a structured Assess → Plan → Practice → Revise → Simulate loop.'),
          h('ul', { class: 'ob-points' },
            h('li', null, h('strong', null, 'Free & no account required. '), 'Start preparing in under a minute — no sign-up, no paywall, no tracking.'),
            h('li', null, h('strong', null, 'Private by default & offline-ready. '), 'All progress, notes, STAR stories, and plans stay in this browser and keep working offline. Optional AI feedback uses your own key.'),
            h('li', null, h('strong', null, 'Practice beyond reading. '), 'Adaptive daily plans, spaced repetition, timed drills, rubric-scored mocks, a JavaScript coding lab, system design workspace, and transparent readiness evidence.')),
          h('form', { class: 'plan-form ob-form', novalidate: true, onsubmit: function (ev) {
            ev.preventDefault();
            const g = app.querySelector('input[name="ob-gear"]:checked');
            const res = PL.validateProfile({ role: role.value, level: g ? g.value : '', interviewDate: date.value, minutes: mins.value, company: '', weakTopics: [], createdDay: day }, day);
            if (!res.ok) { err.textContent = res.errors.join(' '); err.hidden = false; err.focus && err.focus(); return; }
            store.set('plan', Object.assign({}, plan, { profile: res.profile, skipped: {}, completed: plan.completed || {} }));
            store.set('onboarding', { done: day });
            u.render();
          } },
          err,
          h('div', { class: 'field' }, h('label', { for: 'ob-role' }, '1. Target role'), role),
          h('div', { class: 'field' }, h('p', { class: 'label', id: 'ob-gear-label' }, '2. Experience level (gear)'), gears),
          h('div', { class: 'row2' },
            h('div', { class: 'field' }, h('label', { for: 'ob-date' }, '3. Interview date ', h('span', { class: 'hint' }, '(optional)')), date),
            h('div', { class: 'field' }, h('label', { for: 'ob-mins' }, '4. Time per day'), mins)),
          h('div', { class: 'formfoot' },
            h('button', { class: 'btn primary', type: 'submit' }, 'Start preparing'),
            h('button', { class: 'btn ghost', type: 'button', onclick: function () { store.set('onboarding', { skipped: day }); u.render(); } }, 'Skip for now'),
            h('a', { href: '#/questions' }, 'Just browse the questions'))),
          h('p', { class: 'muted small-text' }, 'You can change or reset this at any time from Home or Plan. Settings > Delete my local data removes everything.')));
      }

      /* ---------- dashboard ---------- */
      function dashboard() {
        const profile = hasProfile ? Object.assign(PL.validateProfile(plan.profile, null).profile, { createdDay: plan.profile.createdDay || day }) : null;
        const d = DB.summarize({
          profile: profile, bank: u.bank, done: u.done.all(), practice: store.get('practice', {}), srs: store.get('srs', {}),
          mocks: store.get('mocks', []), plan: plan, streak: S.streak(store.get('activity', [])), today: day,
          history: store.get('history', []), lastActive: store.get('activity', []).filter(function (x) { return x < day; }).sort().pop() || ''
        });
        const card = function (title, body, cls) { return h('section', { class: 'hcard' + (cls ? ' ' + cls : ''), 'aria-label': title }, h('h2', null, title), body); };
        const tile = function (big, label, href) {
          return href ? h('a', { class: 'tile', href: href }, h('strong', null, big), h('span', null, label)) : h('div', { class: 'tile' }, h('strong', null, big), h('span', null, label));
        };

        const head = profile
          ? (d.today.daysLeft !== null ? plural(d.today.daysLeft, 'day') + ' to your interview. ' + d.today.phase.label + ': ' : '') + d.today.phase.why
          : 'No plan yet: set your role and gear to get a daily list.';

        /* What should I do next? */
        let nextCard;
        if (d.next) {
          nextCard = h('section', { class: 'hcard next', 'aria-label': 'Next up' },
            h('p', { class: 'eyebrow' }, 'Next up' + (d.next.minutes ? ' · about ' + d.next.minutes + ' min' : '')),
            h('p', { class: 'next-title' }, d.next.title),
            h('p', { class: 'muted small-text' }, d.next.why),
            h('a', { class: 'btn primary', href: d.next.href }, d.isNew ? 'Start preparation' : 'Continue preparation'));
        } else {
          nextCard = h('section', { class: 'hcard next', 'aria-label': 'Next up' },
            h('p', { class: 'eyebrow' }, 'Today'),
            h('p', { class: 'next-title' }, 'All done for today.'),
            h('p', { class: 'muted small-text' }, 'Extra practice if you have time: a drill round or a mock interview.'),
            h('div', { class: 'q-actions' }, h('a', { class: 'btn primary', href: '#/drill' }, 'Drill a question'), h('a', { class: 'btn', href: d.mock.href }, 'Mock interview')));
        }

        /* How much time today, and what is in it */
        const todayCard = profile
          ? card("Today's plan", [
            h('p', null, d.today.left
              ? h('span', null, h('strong', null, plural(d.today.left, 'task')), ' left, about ', h('strong', null, d.today.minutesLeft + ' min'), ' of your ' + d.today.budget + '-minute budget.')
              : (d.today.total ? 'Every task for today is done.' : 'Nothing is scheduled today.')),
            d.today.tasks.length ? h('ol', { class: 'plain-list hlist' }, d.today.tasks.map(function (x) {
              return h('li', null, h('a', { href: x.href }, x.kind === 'review' ? 'Review: ' + x.title : x.title), h('span', { class: 'muted small-text' }, ' · ' + x.minutes + ' min'));
            })) : null,
            h('a', { href: '#/plan' }, 'Open the full plan')])
          : card('Get a daily plan', [
            h('p', null, 'Choose a role, gear and how much time you have. You get a short list each day, with reviews first.'),
            h('button', { class: 'btn primary', type: 'button', onclick: function () { store.set('onboarding', {}); u.render(); } }, 'Set up in 30 seconds')]);

        /* What should I revise today? */
        const reviseCard = card('Revise today', d.due
          ? [h('p', null, h('strong', null, plural(d.due, 'review')), ' due' + (d.overdue ? ', ' + d.overdue + ' of them overdue' : '') + '. About ' + d.due * PL.MIN.review + ' min.'),
            h('a', { class: 'btn', href: '#/review' }, 'Start reviewing')]
          : [h('p', null, 'No reviews due.'), h('p', { class: 'muted small-text' }, 'Questions you grade in Drill or Review come back here on a schedule (1, 3, 7 days and longer).')]);

        /* What am I weak at? */
        const weakCard = card('Weak areas', d.weak.length
          ? [h('ul', { class: 'plain-list hlist' }, d.weak.map(function (w) {
            return h('li', null, h('a', { href: w.href }, w.topic), h('span', { class: 'muted small-text' }, ' · ' + u.roleName(w.role) + ' · ' + w.why));
          })), h('a', { href: '#/drill' }, 'Drill the "Needs practice" pool')]
          : [h('p', null, 'Nothing flagged yet.'), h('p', { class: 'muted small-text' }, 'When you mark a question "Needs more practice" in Drill, or get it wrong in Review, its topic shows up here.')]);

        /* Mock interview recommendation */
        const mockCard = card('Mock interview', [h('p', null, d.mock.text), h('a', { class: 'btn', href: d.mock.href }, 'Start a mock round')]);

        /* Am I progressing toward my target interview? */
        const progCard = profile
          ? card('Toward your interview', [
            h('p', null, h('strong', null, d.interview.gearPrepared + ' of ' + d.interview.gearTotal), ' ' + u.roleName(profile.role) + ' questions in gear ' + profile.level + ' prepared (' + d.interview.pct + '%).'),
            (function () { const fillEl = h('i'); fillEl.style.width = d.interview.pct + '%'; // CSSOM, allowed by the CSP (inline style attributes are not)
              return h('span', { class: 'progress', role: 'img', 'aria-label': d.interview.pct + '% of your gear prepared' }, fillEl); })(),
            h('p', { class: 'muted small-text' }, plural(d.interview.upcoming7, 'review') + ' scheduled in the next 7 days. This counts what you have done; it is not a prediction of the result.'),
            h('a', { href: '#/readiness' }, 'See readiness evidence'), ' · ', h('a', { href: '#/progress' }, 'All progress')])
          : null;

        /* What have I completed? */
        const doneCard = card('Completed so far', h('div', { class: 'tiles' },
          tile(String(d.completed.prepared), 'prepared', '#/questions?show=done'),
          tile(String(d.completed.drilled), 'drilled', '#/drill'),
          tile(String(d.completed.reviewedThisWeek), 'reviewed this week', '#/review'),
          tile(String(d.completed.mocks), plural(d.completed.mocks, 'mock round').replace(/^\d+ /, ''), '#/mock'),
          tile(String(d.completed.streak), 'day streak', '#/progress')));

        const profLine = profile
          ? h('p', { class: 'muted small-text home-profile' },
            'Preparing for ' + u.roleName(profile.role) + ', gear ' + profile.level + ', ' + profile.minutes + ' min a day' + (profile.interviewDate ? ', interview on ' + profile.interviewDate : '') + '. Stored only in this browser. ',
            h('a', { href: '#/plan?edit=1' }, 'Change'), ' · ',
            h('button', { class: 'linkish', type: 'button', onclick: function () {
              if (!confirm('Reset your preparation profile? Your progress, notes and review schedule are kept.')) return;
              const p = Object.assign({}, store.get('plan', {})); delete p.profile; store.set('plan', p); store.set('onboarding', {}); u.render();
            } }, 'Reset profile'))
          : null;

        fill(app, h('div', { class: 'home' },
          h('h1', null, d.isNew ? 'Ready when you are' : 'Your preparation'),
          h('p', { class: 'lede' }, head),
          nextCard,
          h('div', { class: 'hgrid' }, todayCard, reviseCard, weakCard, mockCard, progCard, doneCard),
          profLine));
      }
    }
  };
})();
