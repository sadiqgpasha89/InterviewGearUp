/* Views for the planner (#/plan), spaced-repetition review (#/review) and mock interview (#/mock).
   Registered in IGU.routes; js/app.js renders them and exposes the shared helpers as IGU.ui. No innerHTML. */
(function () {
  const IGU = window.IGU;
  IGU.routes = IGU.routes || {};
  const meta = IGU.meta, SRS = IGU.srs, PL = IGU.planner, MK = IGU.mock, S = IGU.stats, Q = IGU.quality;
  const ui = function () { return IGU.ui; };
  /* replaceChildren that skips null/false (the native method would insert the text "null"). */
  function fill(el) {
    el.replaceChildren();
    Array.prototype.slice.call(arguments, 1).forEach(function (k) { (Array.isArray(k) ? k : [k]).forEach(function (x) { if (x !== null && x !== undefined && x !== false) el.append(x); }); });
  }

  function download(name, text, type) {
    const h = ui().h;
    const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: type })), download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  const roleOptions = function (h) { return meta.roles.map(function (r) { return h('option', { value: r.id }, r.name); }); };
  const gearOptions = function (h) { return meta.levels.map(function (l) { return h('option', { value: String(l.n) }, l.n + ' ' + l.name + ' (' + l.years + ')'); }); };
  const field = function (h, id, label, control, hint) {
    return h('div', { class: 'field' }, h('label', { for: id }, label, hint ? h('span', { class: 'hint' }, ' ' + hint) : null), control);
  };
  const clock = function (s) { return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); };

  /* ================= Plan ================= */
  IGU.routes.plan = {
    title: 'Plan',
    render: function (params) {
      const u = ui(), h = u.h, store = u.store, app = u.app;
      const day = u.today();
      const plan = store.get('plan', {});
      const editing = !!(params && params.get && params.get('edit') === '1');
      const save = function (p) { store.set('plan', p); if (editing) u.go('#/plan'); else u.render(); };
      fill(app);

      if (!plan.profile) { onboarding(); return; }
      if (editing) { onboarding(plan.profile); return; }
      dashboard();

      function onboarding(existing, errs) {
        const prof = existing || { minutes: 45 };
        const err = h('p', { class: 'notice bad', role: 'alert', hidden: !(errs && errs.length) }, errs ? errs.join(' ') : '');
        const role = h('select', { id: 'pl-role' }, roleOptions(h));
        const level = h('select', { id: 'pl-level' }, gearOptions(h));
        role.value = prof.role || 'backend'; level.value = String(prof.level || 2);
        const company = h('input', { id: 'pl-company', maxlength: '80', autocomplete: 'off', value: prof.company || '' });
        const date = h('input', { id: 'pl-date', type: 'date', min: day, value: prof.interviewDate || '' });
        const mins = h('input', { id: 'pl-mins', type: 'number', min: '15', max: '240', step: '5', value: String(prof.minutes || 45) });
        const weak = h('input', { id: 'pl-weak', placeholder: 'e.g. caching, SQL, concurrency', value: (prof.weakTopics || []).join(', ') });
        fill(app, h('div', { class: 'plan-page' },
          h('h1', null, existing ? 'Edit your plan' : 'Plan your preparation'),
          h('p', { class: 'lede' }, 'Answer five questions and get a short daily list: reviews that are due, then new questions with a written answer. Stored only in this browser.'),
          h('form', { class: 'plan-form', novalidate: true, onsubmit: function (ev) {
            ev.preventDefault();
            const res = PL.validateProfile({ role: role.value, level: level.value, company: company.value, interviewDate: date.value, minutes: mins.value,
              weakTopics: weak.value, createdDay: (plan.profile && plan.profile.createdDay) || day }, day);
            if (!res.ok) { err.textContent = res.errors.join(' '); err.hidden = false; return; }
            save(Object.assign({}, plan, { profile: res.profile, skipped: {}, completed: plan.completed || {} }));
          } },
          err,
          field(h, 'pl-role', 'Role', role), field(h, 'pl-level', 'Gear', level),
          field(h, 'pl-company', 'Company', company, '(optional, shown only to you)'),
          field(h, 'pl-date', 'Interview date', date, '(optional)'),
          field(h, 'pl-mins', 'Minutes per day', mins),
          field(h, 'pl-weak', 'Topics you want extra time on', weak, '(optional, comma separated)'),
          h('div', { class: 'formfoot' },
            h('button', { class: 'btn primary', type: 'submit' }, existing ? 'Save changes' : 'Create my plan'),
            existing ? h('button', { class: 'btn ghost', type: 'button', onclick: function () { if (editing) u.go('#/plan'); else u.render(); } }, 'Cancel') : null))));
      }

      function dashboard() {
        const profile = PL.validateProfile(plan.profile, null).profile;
        profile.createdDay = plan.profile.createdDay || day;
        const skip = (plan.skipped && plan.skipped[day]) || [];
        const ctx = { done: u.done.all(), practice: store.get('practice', {}), srs: store.get('srs', {}) };
        const t = PL.daily(profile, u.bank, ctx, day, { skip: skip });
        const doneToday = (plan.completed && plan.completed[day]) || {};
        const key = function (x) { return x.kind + ':' + x.id; };
        const left = t.tasks.filter(function (x) { return !doneToday[key(x)]; });
        const counts = SRS.counts(ctx.srs, u.bank, day);
        const streak = S.streak(store.get('activity', []));
        const m = S.matrix(u.bank, ctx.done, meta);

        const mark = function (x, on) {
          const p = Object.assign({}, plan); p.completed = Object.assign({}, p.completed);
          p.completed[day] = Object.assign({}, p.completed[day]);
          if (on) p.completed[day][key(x)] = 1; else delete p.completed[day][key(x)];
          const days = Object.keys(p.completed).sort().slice(-60); // keep two months
          const trimmed = {}; days.forEach(function (d) { trimmed[d] = p.completed[d]; }); p.completed = trimmed;
          u.touchActivity();
          save(p);
        };
        const skipTask = function (x) {
          const p = Object.assign({}, plan); p.skipped = Object.assign({}, p.skipped);
          p.skipped[day] = (p.skipped[day] || []).concat([x.id]);
          save(p);
        };
        const tile = function (big, label, href) {
          return h('div', { class: 'tile' }, h('div', { class: 'big' }, big), href ? h('a', { href: href }, label) : h('div', null, label));
        };

        const list = t.tasks.length ? h('ul', { class: 'task-list' }, t.tasks.map(function (x, i) {
          const on = !!doneToday[key(x)];
          return h('li', { class: on ? 'done' : '' },
            h('input', { type: 'checkbox', id: 'task-' + i, checked: on, 'aria-label': 'Mark done: ' + x.title, onchange: function (ev) { mark(x, ev.target.checked); } }),
            h('div', { class: 'task-main' },
              h('a', { href: x.href }, x.kind === 'review' ? 'Review: ' + x.title : x.title),
              h('div', { class: 'muted small-text' }, x.why + ' · about ' + x.minutes + ' min')),
            x.kind !== 'mock' && !on ? h('button', { class: 'btn small ghost', type: 'button', onclick: function () { skipTask(x); }, 'aria-label': 'Skip: ' + x.title }, 'Skip') : null);
        })) : h('div', { class: 'empty' }, h('p', null, 'Nothing is scheduled for today.'));

        fill(app, h('div', { class: 'plan-page' },
          h('h1', null, 'Today'),
          h('p', { class: 'lede' }, t.phase.label + (t.daysLeft !== null ? ' · ' + t.daysLeft + (t.daysLeft === 1 ? ' day' : ' days') + ' to your interview' : '') + '. ' + t.phase.why),
          h('p', { class: 'muted small-text' }, 'This is a rule-based schedule built from your answers, not a prediction of how ready you are.'),
          h('div', { class: 'tiles' },
            tile(String(counts.due), counts.due === 1 ? 'review due' : 'reviews due', '#/review'),
            tile(String(streak), streak === 1 ? 'day streak' : 'day streak', '#/progress'),
            tile((m.total ? Math.round(100 * m.done / m.total) : 0) + '%', 'questions prepared', '#/questions?show=done')),
          t.notes.map(function (n) { return h('p', { class: 'notice' }, n); }),
          list,
          t.tasks.length && !left.length ? h('p', { class: 'notice ok' }, 'All done for today. Come back tomorrow for the next set.') : null,
          h('div', { class: 'q-actions' },
            left.length ? h('a', { class: 'btn primary', href: left[0].href }, 'Continue preparation') : null,
            h('button', { class: 'btn', type: 'button', onclick: function () {
              const p = Object.assign({}, plan); p.skipped = Object.assign({}, p.skipped);
              p.skipped[day] = (p.skipped[day] || []).concat(left.filter(function (x) { return x.kind === 'new'; }).map(function (x) { return x.id; }));
              save(p);
            } }, 'Pick different new questions'),
            h('button', { class: 'btn ghost', type: 'button', onclick: function () { onboarding(plan.profile); } }, 'Edit plan'),
            h('button', { class: 'btn ghost', type: 'button', onclick: function () {
              if (!confirm('Remove your plan from this browser? Your progress and review schedule are kept.')) return;
              const p = Object.assign({}, plan); delete p.profile; save(p);
            } }, 'Reset plan'))));
      }
    }
  };

  /* ================= Review (spaced repetition) ================= */
  IGU.routes.review = {
    title: 'Review',
    render: function () {
      const u = ui(), h = u.h, store = u.store, app = u.app, md = u.md;
      const day = u.today();
      const st = { role: '', level: 0, queue: [], i: 0, shown: false, t0: 0, session: 0 };
      const stage = h('div');
      const goalLine = h('p', { class: 'muted small-text', 'aria-live': 'polite' });
      const GRADES = [['again', 'Again', '1', 'tomorrow'], ['partial', 'Partly', '2', 'in 3 days'], ['solid', 'Good', '3', 'in about a week or more'], ['mastered', 'Mastered', '4', 'in 2 weeks or more']];

      function rebuild() {
        st.queue = SRS.queue(store.get('srs', {}), u.bank, day, { role: st.role, level: st.level });
        st.i = 0; st.shown = false;
      }
      function goal() { return Number((store.get('plan', {}) || {}).goal) || 10; }
      function paintGoal() {
        const n = SRS.reviewedOn(store.get('srs', {}), day), g = goal();
        goalLine.textContent = 'Reviewed today: ' + n + ' of ' + g + (n >= g ? '. Daily goal reached.' : '.');
      }
      function grade(g) {
        const cur = st.queue[st.i];
        if (!cur || !st.shown) return;
        store.set('srs', SRS.review(store.get('srs', {}), cur.id, g, day));
        store.set('practice', S.record(store.get('practice', {}), cur.id, (g === 'solid' || g === 'mastered') ? 'ok' : 'again', (Date.now() - st.t0) / 1000));
        u.touchActivity();
        st.session++; st.i++; st.shown = false; st.t0 = Date.now();
        paintGoal(); paint();
      }
      function onKey(ev) {
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
        const t = ev.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
        if (!st.queue[st.i]) return;
        const k = ev.key.toLowerCase();
        if (!st.shown && k === 'r') { ev.preventDefault(); st.shown = true; paint(); }
        else if (st.shown && /^[1-4]$/.test(k)) { ev.preventDefault(); grade(GRADES[Number(k) - 1][0]); }
      }
      document.addEventListener('keydown', onKey);
      u.setCleanup(function () { document.removeEventListener('keydown', onKey); });

      function paint() {
        fill(stage);
        const srs = store.get('srs', {});
        const c = SRS.counts(srs, u.bank, day);
        const cur = st.queue[st.i];
        if (!cur) {
          const prepared = Object.keys(u.done.all()).filter(function (id) { return !srs[id] && u.bank.some(function (e) { return e.id === id; }); });
          stage.appendChild(h('div', { class: 'drill-card' },
            h('p', null, st.session ? 'Queue finished: ' + st.session + ' reviewed this visit.' : (c.scheduled ? 'No reviews are due.' : 'Nothing is scheduled yet.')),
            h('p', { class: 'muted' }, c.upcoming7 ? c.upcoming7 + ' more come due in the next 7 days.' : 'Grade questions in Drill and they appear here on a schedule.'),
            h('div', { class: 'q-actions' },
              h('a', { class: 'btn primary', href: '#/drill' }, 'Go to Drill'),
              prepared.length ? h('button', { class: 'btn', type: 'button', onclick: function () {
                const next = Object.assign({}, store.get('srs', {}));
                prepared.forEach(function (id) { next[id] = { due: day, interval: 1, reps: 0, lapses: 0, last: day, grade: 'again', seeded: true }; });
                store.set('srs', next); rebuild(); paint();
              } }, 'Schedule my ' + prepared.length + ' prepared questions') : null)));
          return;
        }
        const e = cur.entry;
        const card = h('div', { class: 'drill-card' },
          h('div', { class: 'drill-row' }, u.gearBadge(e.level), h('span', { class: 'muted' }, u.roleName(e.role) + ', ' + e.topic), h('span', { class: 'grow' }),
            h('span', { class: 'muted small-text' }, (st.i + 1) + ' of ' + st.queue.length + (cur.overdue > 0 ? ' · ' + cur.overdue + 'd overdue' : ''))),
          h('div', { class: 'drill-q' }, e.q));
        if (!st.shown) {
          card.appendChild(h('p', { class: 'muted' }, 'Answer out loud, then reveal.'));
          card.appendChild(h('div', { class: 'drill-row' }, h('button', { class: 'btn primary', type: 'button', onclick: function () { st.shown = true; st.t0 = st.t0 || Date.now(); paint(); } }, 'Reveal answer'),
            h('span', { class: 'kbd-hint' }, h('kbd', null, 'R'), ' reveal')));
        } else {
          card.appendChild(h('div', { class: 'q-body flush' }, u.answerBody(e)));
          card.appendChild(h('p', { class: 'muted small-text' }, 'How did it go? The next review is scheduled from your choice.'));
          card.appendChild(h('div', { class: 'q-actions grades' }, GRADES.map(function (g) {
            return h('button', { class: g[0] === 'solid' ? 'btn primary' : 'btn', type: 'button', onclick: function () { grade(g[0]); } },
              g[1], h('span', { class: 'sub' }, g[3]), h('kbd', null, g[2]));
          })));
        }
        stage.appendChild(card);
      }

      const roleSel = h('select', { id: 'rv-role', onchange: function () { st.role = roleSel.value; rebuild(); paint(); } }, [h('option', { value: '' }, 'All roles')].concat(roleOptions(h)));
      const lvlSel = h('select', { id: 'rv-level', onchange: function () { st.level = Number(lvlSel.value); rebuild(); paint(); } }, [h('option', { value: '0' }, 'All gears')].concat(gearOptions(h)));
      const how = h('details', { class: 'how' }, h('summary', null, 'How scheduling works'),
        md('- **Again**: back tomorrow.\n- **Partly**: back in 3 days.\n- **Good**: back in 7 days, then roughly 1.8 times longer each time.\n- **Mastered**: back in 14 days, then 30, then doubling (never more than 180).\n\nDays are your local calendar days. Your schedule is stored only in this browser and is part of the backup on the Progress page.'));
      const reset = h('button', { class: 'btn small ghost', type: 'button', onclick: function () {
        if (!confirm('Clear the whole review schedule? Your drill history, notes and prepared questions are kept.')) return;
        store.set('srs', {}); rebuild(); paint(); paintGoal();
      } }, 'Reset schedule');
      const goalInput = h('input', { id: 'rv-goal', type: 'number', min: '1', max: '100', value: String(goal()), 'aria-label': 'Daily review goal', onchange: function () {
        const n = Math.max(1, Math.min(100, Math.round(Number(goalInput.value)) || 10));
        store.set('plan', Object.assign({}, store.get('plan', {}), { goal: n })); goalInput.value = String(n); paintGoal();
      } });

      rebuild();
      fill(app, h('div', { class: 'drill' },
        h('h1', null, 'Review'),
        h('p', { class: 'lede' }, 'Questions come back when you are about to forget them: soon after a miss, later after a good answer.'),
        h('div', { class: 'drill-filters three' },
          h('div', null, h('label', { for: 'rv-role' }, 'Role'), roleSel),
          h('div', null, h('label', { for: 'rv-level' }, 'Gear'), lvlSel),
          h('div', null, h('label', { for: 'rv-goal' }, 'Daily goal'), goalInput)),
        goalLine, stage, how, h('p', null, reset)));
      paintGoal(); paint();
    }
  };

  /* ================= Mock interview ================= */
  IGU.routes.mock = {
    title: 'Mock interview',
    render: function (params) {
      const u = ui(), h = u.h, store = u.store, app = u.app, md = u.md;
      const day = u.today();
      const opt = { role: params.get('role') || 'backend', level: Number(params.get('level')) || 2, type: 'mixed', count: 3 };
      let timer = null;
      u.setCleanup(function () { if (timer) clearInterval(timer); });
      const stage = h('div');

      function setup() {
        if (timer) { clearInterval(timer); timer = null; }
        const role = h('select', { id: 'mk-role' }, roleOptions(h));
        const level = h('select', { id: 'mk-level' }, gearOptions(h));
        const type = h('select', { id: 'mk-type' }, MK.TYPES.map(function (t) { return h('option', { value: t }, t === 'mixed' ? 'Mixed' : t[0].toUpperCase() + t.slice(1)); }));
        const count = h('select', { id: 'mk-count' }, [3, 5, 7].map(function (n) { return h('option', { value: String(n) }, n + ' questions'); }));
        role.value = opt.role; level.value = String(opt.level); type.value = opt.type; count.value = String(opt.count);
        const err = h('p', { class: 'notice', hidden: true, role: 'status' });
        const history = store.get('mocks', []);
        fill(stage, 
          h('form', { class: 'plan-form', onsubmit: function (ev) {
            ev.preventDefault();
            opt.role = role.value; opt.level = Number(level.value); opt.type = type.value; opt.count = Number(count.value);
            const built = MK.build(u.bank, opt, (Date.now() & 0xffff) + 1);
            if (!built.questions.length) { err.textContent = 'No questions match this role, gear and round type. Try "Mixed".'; err.hidden = false; return; }
            run(built);
          } },
            err,
            field(h, 'mk-role', 'Role', role), field(h, 'mk-level', 'Gear', level), field(h, 'mk-type', 'Round', type), field(h, 'mk-count', 'Length', count),
            h('p', { class: 'muted small-text' }, 'Answer each question in writing or out loud, about three minutes each. You see feedback at the end, like a real round. Feedback is a fixed rubric on the shape of your answer; it cannot judge whether you are right.'),
            h('div', { class: 'formfoot' }, h('button', { class: 'btn primary', type: 'submit' }, 'Start mock'))),
          history.length ? h('section', { class: 'mock-history' }, h('h2', null, 'Past mocks'),
            h('ul', { class: 'plain-list' }, history.map(function (s, idx) {
              const sum = MK.summarize(s.items);
              return h('li', null, h('button', { class: 'linkish', type: 'button', onclick: function () { results(s, true); } },
                s.day + ' · ' + s.roleName + ', gear ' + s.level + ' · ' + sum.answered + ' of ' + s.items.length + ' answered'),
                ' ', h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Delete mock from ' + s.day, onclick: function () {
                  const next = history.slice(); next.splice(idx, 1); store.set('mocks', next); setup();
                } }, 'Delete'));
            }))) : null);
      }

      function run(built) {
        const items = [];
        let i = 0, t0 = Date.now();
        const area = h('textarea', { id: 'mk-answer', rows: '9', maxlength: '4000', 'aria-label': 'Your answer', placeholder: 'Type your answer, or answer out loud and note the key points here.' });
        const clockEl = h('span', { class: 'timer', role: 'timer', 'aria-label': 'Time on this question' }, '0:00');
        const progress = h('p', { class: 'muted small-text', 'aria-live': 'polite' });
        const qEl = h('div', { class: 'drill-q' });
        const next = function (skip) {
          const e = built.questions[i];
          const secs = (Date.now() - t0) / 1000;
          const answer = skip ? '' : area.value.trim().slice(0, 4000);
          items.push({ qid: e.id, q: e.q, secs: secs, answer: answer, result: MK.score(answer, e) });
          i++;
          if (i >= built.questions.length) { finish(); return; }
          show();
        };
        function show() {
          const e = built.questions[i];
          qEl.textContent = e.q; area.value = ''; t0 = Date.now(); clockEl.textContent = '0:00'; clockEl.classList.remove('late');
          progress.textContent = 'Question ' + (i + 1) + ' of ' + built.questions.length;
          area.focus();
        }
        function finish() {
          if (timer) { clearInterval(timer); timer = null; }
          const session = { id: 'm' + Date.now().toString(36), day: day, role: opt.role, roleName: u.roleName(opt.role), level: opt.level, type: opt.type, items: items };
          store.set('mocks', [session].concat(store.get('mocks', [])).slice(0, 20));
          u.touchActivity();
          results(session, false);
        }
        timer = setInterval(function () {
          const s = (Date.now() - t0) / 1000;
          clockEl.textContent = clock(s); clockEl.classList.toggle('late', s > 180);
        }, 500);
        fill(stage, h('div', { class: 'drill-card' },
          h('div', { class: 'drill-row' }, progress, h('span', { class: 'grow' }), clockEl),
          built.shortfall ? h('p', { class: 'notice' }, 'Only ' + built.questions.length + ' matching questions exist for this selection.') : null,
          qEl, h('label', { for: 'mk-answer', class: 'sr-only' }, 'Your answer'), area,
          h('div', { class: 'drill-row' },
            h('button', { class: 'btn primary', type: 'button', onclick: function () { next(false); } }, 'Submit and continue'),
            h('button', { class: 'btn ghost', type: 'button', onclick: function () { next(true); } }, 'Skip'),
            h('button', { class: 'btn ghost', type: 'button', onclick: function () { if (confirm('End this mock without saving?')) setup(); } }, 'Quit'))));
        show();
      }

      function results(session, fromHistory) {
        const sum = MK.summarize(session.items);
        const aiBox = {};
        const persist = function () {
          const all = store.get('mocks', []).map(function (s) { return s.id === session.id ? session : s; });
          store.set('mocks', all);
        };
        const itemsEl = session.items.map(function (it, idx) {
          const e = u.bank.filter(function (x) { return x.id === it.qid; })[0];
          const r = it.result;
          const aiOut = h('div', { class: 'ai-feedback', hidden: !it.ai });
          const showAi = function () {
            fill(aiOut, h('p', { class: 'muted small-text' }, 'AI feedback from a language model. A study aid only, not a rating or a prediction of any interview.'), md(it.ai));
            aiOut.hidden = false;
          };
          if (it.ai) showAi();
          const aiMsg = h('p', { class: 'notice bad', role: 'alert', hidden: true });
          const aiBtn = h('button', { class: 'btn small', type: 'button', onclick: async function () {
            if (!u.aiAvailable()) { u.openSettings(); return; }
            aiBtn.disabled = true; aiBtn.textContent = 'Asking AI...'; aiMsg.hidden = true;
            try {
              const res = await IGU.ai.ask({ settings: store.get('settings', {}), system: MK.AI_SYSTEM, prompt: MK.aiPrompt(it.q, it.answer, session.roleName, session.level) });
              it.ai = res.text; persist(); showAi(); aiBtn.textContent = 'Ask again';
            } catch (err) { aiMsg.textContent = err.message; aiMsg.hidden = false; aiBtn.textContent = 'Try again'; }
            aiBtn.disabled = false;
          } }, it.ai ? 'Ask again' : (u.aiAvailable() ? 'Get AI feedback' : 'Add API key for AI feedback'));
          return h('section', { class: 'mock-item' },
            h('h3', null, (idx + 1) + '. ' + it.q),
            h('p', { class: 'muted small-text' }, Math.round(it.secs) + 's · ' + (r.words || 0) + (r.words === 1 ? ' word' : ' words') + (r.empty ? '' : ' · ' + r.band + ' (' + r.total + ' of ' + r.max + ')')),
            r.empty ? h('p', { class: 'muted' }, 'No answer recorded for this question.') :
              h('table', { class: 'rubric' }, h('caption', { class: 'sr-only' }, 'Rubric for question ' + (idx + 1)),
                h('tbody', null, r.dims.map(function (d) { return h('tr', null, h('th', { scope: 'row' }, d.label), h('td', { class: 'lv l' + d.level }, MK.LEVELS[d.level]), h('td', null, d.note)); }))),
            it.answer ? h('details', null, h('summary', null, 'Your answer'), h('p', { class: 'userq plain' }, it.answer)) : null,
            e ? h('p', { class: 'small-text' }, h('a', { href: '#/q/' + e.id }, Q.isReal(e) ? 'Open the reference answer' : 'Open this question'),
              e.follow && e.follow.length ? ' · Likely follow-ups: ' + e.follow.slice(0, 2).join(' / ') : '') : null,
            it.answer ? aiBtn : null, aiMsg, aiOut);
        });
        const weakIds = session.items.filter(function (it) { return it.result.empty || it.result.band === 'Needs work' || it.result.band === 'Developing'; })
          .map(function (it) { return it.qid; }).filter(function (id) { return u.bank.some(function (e) { return e.id === id; }); });
        const addMsg = h('p', { class: 'notice ok', hidden: true, role: 'status' });
        fill(stage, h('div', { class: 'mock-results' },
          h('h2', null, 'Results' + (fromHistory ? ' (' + session.day + ')' : '')),
          h('p', { class: 'muted small-text' }, 'A rubric of surface checks: structure, specifics, trade-offs and the points in the reference answer. It cannot tell whether an answer is correct and is not a prediction of interview results.'),
          h('p', null, sum.answered + ' answered, ' + sum.skipped + ' skipped.' + (sum.weakest ? ' Weakest area: ' + sum.weakest.label + '.' : '')),
          sum.rows.length ? h('ul', { class: 'plain-list' }, sum.rows.map(function (r) { return h('li', null, r.label + ': ' + r.avg.toFixed(1) + ' of 3 on average'); })) : null,
          itemsEl,
          h('div', { class: 'q-actions' },
            h('button', { class: 'btn primary', type: 'button', onclick: function () { download('mock-interview-' + session.day + '.md', MK.reportMd(session), 'text/markdown'); } }, 'Download report (.md)'),
            weakIds.length ? h('button', { class: 'btn', type: 'button', onclick: function (ev) {
              let s = store.get('srs', {});
              weakIds.forEach(function (id) { if (!s[id] || s[id].due > day) s = SRS.review(s, id, 'again', day); });
              store.set('srs', s); ev.target.disabled = true;
              addMsg.textContent = weakIds.length + ' question' + (weakIds.length === 1 ? '' : 's') + ' added to your Review queue.'; addMsg.hidden = false;
            } }, 'Add ' + weakIds.length + ' to Review') : null,
            h('button', { class: 'btn ghost', type: 'button', onclick: setup }, 'New mock')),
          addMsg));
      }

      fill(app, h('div', { class: 'plan-page' },
        h('h1', null, 'Mock interview'),
        h('p', { class: 'lede' }, 'A timed round from the question bank with a written scorecard. Offline and free; optional AI feedback uses your own key.'),
        stage));
      setup();
    }
  };
})();
