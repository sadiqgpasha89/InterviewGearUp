/* Views for the planner (#/plan), spaced-repetition review (#/review) and mock interview (#/mock).
   Registered in IGU.routes; js/app.js renders them and exposes the shared helpers as IGU.ui. No innerHTML. */
(function () {
  const IGU = window.IGU;
  IGU.routes = IGU.routes || {};
  const meta = IGU.meta, SRS = IGU.srs, PL = IGU.planner, MK = IGU.mock, S = IGU.stats, Q = IGU.quality, CAL = IGU.calendar;
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
  /* Weekly summary (Phase 4): counts and topic trends from local data, with the reason behind each focus topic. */
  function weeklyBlock(h, wk, u) {
    const li = function (label, val) { return h('li', null, h('strong', null, label + ': '), val); };
    const trend = function (rows, word) { return rows.length ? rows.map(function (r) { return r.topic + ' (' + u.roleName(r.role) + ', ' + word + ' ' + Math.round(Math.abs(r.delta) * 100) + ' points)'; }).join('; ') : 'none yet (needs at least two attempts in each of the last two windows)'; };
    return h('section', { class: 'weekly', 'aria-label': 'This week' },
      h('h2', null, 'This week'),
      h('p', { class: 'muted small-text' }, wk.from + ' to ' + wk.to + '. Counted from what you did in this browser; not a prediction.'),
      h('ul', { class: 'plain-list' },
        li('Completed', wk.tasksCompleted + ' plan tasks, ' + wk.attempts + ' graded attempts, active on ' + wk.activeDays + ' of 7 days'),
        li('Missed', wk.missedDays ? wk.missedDays + (wk.missedDays === 1 ? ' day' : ' days') + ' with no practice. The plan carries reviews forward instead of piling them up.' : 'no days missed'),
        li('Improving', trend(wk.improving, 'up')),
        li('Declining', trend(wk.declining, 'down')),
        li('Reviews', wk.reviewsDue + ' due now, ' + wk.reviewsNext7 + ' in the next 7 days'),
        li('Mock interviews', wk.mock.rounds ? wk.mock.rounds + (wk.mock.rounds === 1 ? ' round' : ' rounds') + ', ' + wk.mock.pct + '% of rubric points' : 'none this week')),
      h('h3', null, 'Focus next week'),
      wk.focus.length ? h('ol', null, wk.focus.map(function (f) {
        return h('li', null, h('a', { href: '#/questions?role=' + encodeURIComponent(f.role) + '&q=' + encodeURIComponent(f.topic) }, f.topic), ' (' + u.roleName(f.role) + '): ' + f.reasons.join('; ') + '.');
      })) : h('p', { class: 'muted' }, 'No weak topics yet. Grade questions in Drill or Review, or run a mock, and the evidence shows up here.'));
  }

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
        const maxNew = h('input', { id: 'pl-maxnew', type: 'number', min: '0', max: '10', step: '1', value: String(prof.maxNew || 0) });
        const maxRev = h('input', { id: 'pl-maxrev', type: 'number', min: '0', max: '60', step: '1', value: String(prof.maxReviews || 0) });
        const restBoxes = PL.WEEKDAYS.map(function (name, i) {
          return h('label', { class: 'chk' }, h('input', { type: 'checkbox', value: String(i), checked: (prof.restDays || []).indexOf(i) >= 0 }), ' ' + name.slice(0, 3));
        });
        fill(app, h('div', { class: 'plan-page' },
          h('h1', null, existing ? 'Edit your plan' : 'Plan your preparation'),
          h('p', { class: 'lede' }, 'Answer five questions and get a short daily list: reviews that are due, then new questions with a written answer. Stored only in this browser.'),
          h('form', { class: 'plan-form', novalidate: true, onsubmit: function (ev) {
            ev.preventDefault();
            const res = PL.validateProfile({ role: role.value, level: level.value, company: company.value, interviewDate: date.value, minutes: mins.value,
              weakTopics: weak.value, createdDay: (plan.profile && plan.profile.createdDay) || day,
              maxNew: maxNew.value, maxReviews: maxRev.value,
              restDays: restBoxes.map(function (l) { return l.querySelector('input'); }).filter(function (c) { return c.checked; }).map(function (c) { return Number(c.value); }) }, day);
            if (!res.ok) { err.textContent = res.errors.join(' '); err.hidden = false; return; }
            save(Object.assign({}, plan, { profile: res.profile, skipped: {}, completed: plan.completed || {} }));
          } },
          err,
          field(h, 'pl-role', 'Role', role), field(h, 'pl-level', 'Gear', level),
          field(h, 'pl-company', 'Company', company, '(optional, shown only to you)'),
          field(h, 'pl-date', 'Interview date', date, '(optional)'),
          field(h, 'pl-mins', 'Minutes per day', mins),
          field(h, 'pl-weak', 'Topics you want extra time on', weak, '(optional, comma separated)'),
          h('details', { class: 'plan-limits', open: !!(prof.maxNew || prof.maxReviews || (prof.restDays || []).length) },
            h('summary', null, 'Workload limits (optional)'),
            field(h, 'pl-maxnew', 'Most new questions per day', maxNew, '(0 = fit to your time)'),
            field(h, 'pl-maxrev', 'Most reviews per day', maxRev, '(0 = automatic; extra reviews wait for the next days)'),
            h('fieldset', { class: 'rest-days' }, h('legend', null, 'Rest days ', h('span', { class: 'hint' }, '(only a 15-minute review session)')), restBoxes)),
          h('div', { class: 'formfoot' },
            h('button', { class: 'btn primary', type: 'submit' }, existing ? 'Save changes' : 'Create my plan'),
            existing ? h('button', { class: 'btn ghost', type: 'button', onclick: function () { if (editing) u.go('#/plan'); else u.render(); } }, 'Cancel') : null))));
      }

      function dashboard() {
        const profile = PL.validateProfile(plan.profile, null).profile;
        profile.createdDay = plan.profile.createdDay || day;
        const skip = (plan.skipped && plan.skipped[day]) || [];
        const activity = store.get('activity', []);
        const ctx = { done: u.done.all(), practice: store.get('practice', {}), srs: store.get('srs', {}), history: store.get('history', []), mocks: store.get('mocks', []),
          lastActive: activity.filter(function (d) { return d < day; }).sort().pop() || '' };
        const t = PL.daily(profile, u.bank, ctx, day, { skip: skip });
        const wk = IGU.adaptive.weekly({ today: day, plan: plan, bank: u.bank, history: ctx.history, mocks: ctx.mocks, srs: ctx.srs, practice: ctx.practice, activity: activity });
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

        const notesMap = store.get('notes', {}) || {};
        let calStart = '09:00', calIncludeNotes = false;

        const list = t.tasks.length ? h('ul', { class: 'task-list' }, t.tasks.map(function (x, i) {
          const on = !!doneToday[key(x)];
          return h('li', { class: on ? 'done' : '' },
            h('input', { type: 'checkbox', id: 'task-' + i, checked: on, 'aria-label': 'Mark done: ' + x.title, onchange: function (ev) { mark(x, ev.target.checked); } }),
            h('div', { class: 'task-main' },
              h('a', { href: x.href }, x.kind === 'review' ? 'Review: ' + x.title : x.title),
              h('div', { class: 'muted small-text' }, x.why + ' · about ' + x.minutes + ' min')),
            CAL ? h('button', { class: 'btn small ghost', type: 'button', onclick: function () {
              download('igu-task-' + day + '.ics', CAL.exportTask(x, day, { startTime: calStart, includeNotes: calIncludeNotes, notes: notesMap }), 'text/calendar;charset=utf-8');
            }, 'aria-label': 'Export task to calendar: ' + x.title, title: 'Download single .ics calendar event' }, '.ics') : null,
            x.kind === 'new' && !on ? h('button', { class: 'btn small ghost', type: 'button', onclick: function () { skipTask(x); }, 'aria-label': 'Swap for another question: ' + x.title, title: 'Swap for another question' }, 'Swap') : null,
            x.kind === 'review' && !on ? h('button', { class: 'btn small ghost', type: 'button', onclick: function () { skipTask(x); }, 'aria-label': 'Move to tomorrow: ' + x.title, title: 'It stays due and comes back tomorrow' }, 'Tomorrow') : null);
        })) : h('div', { class: 'empty' }, h('p', null, 'Nothing is scheduled for today.'));

        const calControls = CAL ? h('section', { class: 'hcard', 'aria-label': 'Calendar export' },
          h('h2', null, 'Calendar export (.ics)'),
          h('p', { class: 'muted small-text' }, 'Download standard RFC 5545 calendar events for Apple Calendar, Google Calendar, or Outlook. Local wall-clock time is used; personal notes are excluded unless you opt in.'),
          h('div', { class: 'drill-filters two' },
            h('div', null, h('label', { for: 'cal-start' }, 'Start time'),
              h('input', { id: 'cal-start', type: 'time', value: calStart, onchange: function (ev) { calStart = ev.target.value || '09:00'; } })),
            h('div', null, h('label', { class: 'chk' },
              h('input', { id: 'cal-notes', type: 'checkbox', onchange: function (ev) { calIncludeNotes = !!ev.target.checked; } }),
              ' Include personal question notes in descriptions'))),
          h('div', { class: 'q-actions' },
            t.tasks.length ? h('button', { class: 'btn small', type: 'button', onclick: function () {
              const evs = CAL.buildDayEvents(t, day, { startTime: calStart, includeNotes: calIncludeNotes, notes: notesMap });
              download('interviewgearup-' + day + '.ics', CAL.buildIcs(evs, { startTime: calStart, includeNotes: calIncludeNotes }), 'text/calendar;charset=utf-8');
            } }, 'Export today (.ics)') : null,
            h('button', { class: 'btn small', type: 'button', onclick: function () {
              const evs = CAL.buildWeekEvents(profile, u.bank, ctx, day, { days: 7, startTime: calStart, includeNotes: calIncludeNotes, notes: notesMap });
              download('interviewgearup-week-' + day + '.ics', CAL.buildIcs(evs, { startTime: calStart, includeNotes: calIncludeNotes }), 'text/calendar;charset=utf-8');
            } }, 'Export 7-day plan (.ics)'))) : null;

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
          calControls,
          weeklyBlock(h, wk, u),
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
        store.set('history', IGU.adaptive.logAttempt(store.get('history', []), cur.id, g, day));
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
  /* Rubric shown before practice: all three rubrics on the setup screen, the relevant one under each question. */
  function rubricGuide(h, kind) {
    const kinds = kind ? [kind] : Object.keys(MK.RUBRICS);
    return h('details', { class: 'rubric-guide' },
      h('summary', null, kind ? 'How this answer is assessed' : 'How answers are assessed'),
      kinds.map(function (k) {
        const R = MK.RUBRICS[k];
        return h('div', null, kind ? null : h('h3', null, R.title),
          h('ul', { class: 'rubric-criteria' }, R.criteria.map(function (c) {
            return h('li', null, h('strong', null, c[2]), h('span', { class: 'muted small-text' }, ' (' + (c[1] === 'content' ? 'content' : 'delivery') + ') '), c[3]);
          })));
      }),
      h('p', { class: 'muted small-text' }, 'Each criterion scores Missing, Thin, Good or Strong. The checks look for the ideas, not for exact words, and cannot verify correctness.'));
  }

  /* Per-answer feedback: content and delivery separately, the evidence behind each score, missing concepts and at most three next actions.
     Sessions saved by older versions lack group, why and actions; they still render. */
  function feedbackBlock(h, r, idx) {
    const groups = [['content', 'Content'], ['delivery', 'Delivery']];
    const rows = function (ds) {
      return ds.map(function (d) {
        return h('tr', null, h('th', { scope: 'row' }, d.label), h('td', { class: 'lv l' + d.level }, MK.LEVELS[d.level]),
          h('td', null, d.why ? h('span', { class: 'why' }, d.why + ' ') : null, d.level < 3 || !d.why ? d.note : null));
      });
    };
    const hasGroups = r.dims.some(function (d) { return d.group; });
    return h('div', { class: 'feedback' },
      r.offTopic ? h('p', { class: 'notice bad' }, 'This answer does not seem to address the question, so the content criteria score Missing.') : null,
      h('table', { class: 'rubric' }, h('caption', { class: 'sr-only' }, 'Rubric for question ' + (idx + 1)),
        hasGroups ? groups.map(function (g) {
          const ds = r.dims.filter(function (d) { return d.group === g[0]; });
          return ds.length ? h('tbody', null, h('tr', { class: 'rubric-group' }, h('th', { colspan: '3', scope: 'colgroup' }, g[1])), rows(ds)) : null;
        }) : h('tbody', null, rows(r.dims))),
      r.concepts && r.concepts.miss && r.concepts.miss.length ? h('p', { class: 'small-text' }, h('strong', null, 'Not mentioned from the reference answer: '), r.concepts.miss.slice(0, 6).join(', ') + '.') : null,
      r.actions && r.actions.length ? h('div', { class: 'next-actions' }, h('h4', null, 'Next ' + (r.actions.length === 1 ? 'step' : r.actions.length + ' steps')),
        h('ol', null, r.actions.map(function (a) { return h('li', null, a.text, a.example ? h('div', { class: 'muted small-text' }, 'For example: ' + a.example) : null); }))) : null);
  }

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
            h('p', { class: 'muted small-text' }, 'Answer each question in writing or out loud, about three minutes each. You see feedback at the end, like a real round. Feedback is a fixed rubric that checks which ideas and elements your answer contains; it cannot judge whether you are right.'),
            rubricGuide(h, null),
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
        const criteriaEl = h('div');
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
          qEl.textContent = e.q; area.value = '';
          fill(criteriaEl, rubricGuide(h, MK.kindForRubric(e))); t0 = Date.now(); clockEl.textContent = '0:00'; clockEl.classList.remove('late');
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
          qEl, criteriaEl, h('label', { for: 'mk-answer', class: 'sr-only' }, 'Your answer'), area,
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
            const meta = it.aiMeta ? (' (' + it.aiMeta + ')') : '';
            fill(aiOut, h('p', { class: 'muted small-text' }, 'AI feedback' + meta + '. A study aid only, not a rating or a prediction of any interview.'), md(it.ai));
            aiOut.hidden = false;
          };
          if (it.ai) showAi();
          const aiMsg = h('p', { class: 'notice bad', role: 'alert', hidden: true });
          const aiCancel = h('button', { class: 'btn small ghost', type: 'button', hidden: true }, 'Cancel');
          let aiCtl = null;
          aiCancel.addEventListener('click', function () { if (aiCtl) aiCtl.abort(); });
          const aiBtn = h('button', { class: 'btn small', type: 'button', onclick: async function () {
            if (!u.aiAvailable()) { u.openSettings(); return; }
            aiCtl = typeof AbortController !== 'undefined' ? new AbortController() : null;
            aiBtn.disabled = true; aiBtn.textContent = 'Asking AI...'; aiMsg.hidden = true; aiCancel.hidden = false;
            try {
              const res = await IGU.ai.ask({ settings: store.get('settings', {}), system: MK.AI_SYSTEM, prompt: MK.aiPrompt(it.q, it.answer, session.roleName, session.level), signal: aiCtl ? aiCtl.signal : undefined });
              it.ai = res.text;
              it.aiMeta = [res.provider, res.model, res.at ? res.at.slice(0, 10) : '', res.usage ? (res.usage.inputTokens + res.usage.outputTokens) + ' tokens' : ''].filter(Boolean).join(' · ');
              persist(); showAi(); aiBtn.textContent = 'Ask again';
            } catch (err) { aiMsg.textContent = err.message; aiMsg.hidden = false; aiBtn.textContent = err.kind === 'cancelled' ? 'Get AI feedback' : 'Try again'; }
            aiBtn.disabled = false; aiCancel.hidden = true;
          } }, it.ai ? 'Ask again' : (u.aiAvailable() ? 'Get AI feedback' : 'Add API key for AI feedback'));
          return h('section', { class: 'mock-item' },
            h('h3', null, (idx + 1) + '. ' + it.q),
            h('p', { class: 'muted small-text' }, Math.round(it.secs) + 's · ' + (r.words || 0) + (r.words === 1 ? ' word' : ' words') + (r.empty ? '' : ' · ' + r.band + ' (' + r.total + ' of ' + r.max + ')')),
            r.empty ? h('p', { class: 'muted' }, 'No answer recorded for this question.') : feedbackBlock(h, r, idx),
            it.answer ? h('details', null, h('summary', null, 'Your answer'), h('p', { class: 'userq plain' }, it.answer)) : null,
            e ? h('p', { class: 'small-text' }, h('a', { href: '#/q/' + e.id }, Q.isReal(e) ? 'Open the reference answer' : 'Open this question'),
              e.follow && e.follow.length ? ' · Likely follow-ups: ' + e.follow.slice(0, 2).join(' / ') : '') : null,
            it.answer ? h('span', { class: 'q-actions' }, aiBtn, aiCancel) : null, aiMsg, aiOut);
        });
        const weakIds = session.items.filter(function (it) { return it.result.empty || it.result.band === 'Needs work' || it.result.band === 'Developing' || it.result.band === 'Off topic'; })
          .map(function (it) { return it.qid; }).filter(function (id) { return u.bank.some(function (e) { return e.id === id; }); });
        const addMsg = h('p', { class: 'notice ok', hidden: true, role: 'status' });
        fill(stage, h('div', { class: 'mock-results' },
          h('h2', null, 'Results' + (fromHistory ? ' (' + session.day + ')' : '')),
          h('p', { class: 'muted small-text' }, 'Content criteria check which ideas your answer mentions (key concepts from the reference answer, examples, trade-offs, failure modes, or the STAR and system design elements). Delivery checks structure and length. Each score says what it found. None of it can tell whether an answer is correct, and it is not a prediction of interview results.'),
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
