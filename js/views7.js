/* Views for Phase 18+ features: Flashcards (#/flashcards) and Topic Map (#/map). Registered in IGU.routes. No innerHTML. */
(function () {
  const IGU = window.IGU;
  IGU.routes = IGU.routes || {};
  const FC = IGU.flashcards, TM = IGU.topicMap, WU = IGU.warmup, GD = IGU.guide, PL = IGU.planner, meta = IGU.meta;
  const ui = function () { return IGU.ui; };

  function fill(el) {
    el.replaceChildren();
    Array.prototype.slice.call(arguments, 1).forEach(function (k) { (Array.isArray(k) ? k : [k]).forEach(function (x) { if (x !== null && x !== undefined && x !== false) el.append(x); }); });
  }

  IGU.routes.flashcards = {
    title: 'Flashcards',
    render: function () {
      const u = ui(), h = u.h, store = u.store, app = u.app, day = u.today();
      const load = function () { return (store.get('flashcards', []) || []).map(FC.cleanCard); };
      const save = function (list) { store.set('flashcards', list.slice(0, FC.MAX_CARDS)); };
      const root = h('div', { class: 'plan-page' });
      fill(app, root);
      let revealed = false, editingId = '', notice = '';
      paint();

      function paint() {
        const cards = load();
        const srs = store.get('srs', {});
        const queue = FC.dueCards(cards, srs, day);
        const dueCount = queue.filter(function (x) { return x.isDue; }).length;
        const current = queue[0];

        const studySection = current ? (function () {
          const c = current.card;
          const dueLabel = current.srs ? ('Next due: ' + current.srs.due) : 'New card';
          return h('section', { class: 'drill-card', 'aria-label': 'Flashcard study' },
            h('div', { class: 'drill-row' },
              c.qid ? u.gearBadge(c.level) : null,
              h('span', { class: 'muted small-text' }, c.topic + ' · ' + dueLabel + ' · ' + c.stats.attempts + ' review' + (c.stats.attempts === 1 ? '' : 's')),
              h('span', { class: 'grow' }),
              h('span', { class: 'pill ' + (current.isDue ? 'conf-medium' : 'conf-high') }, current.isDue ? 'Due' : 'Ahead')),
            h('div', { class: 'drill-q' }, c.front),
            !revealed
              ? h('div', { class: 'q-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: function () { revealed = true; paint(); } }, 'Reveal back'))
              : h('div', { class: 'q-body flush' },
                h('div', { class: 'short' }, h('h4', null, 'Concept summary'), u.md(c.back)),
                c.qid ? h('p', { class: 'small-text' }, h('a', { href: '#/q/' + encodeURIComponent(c.qid) }, 'Open full question & outline')) : null,
                h('p', { class: 'muted small-text' }, 'Grade your recall (updates your spaced-repetition schedule):'),
                h('div', { class: 'q-actions grades' },
                  [['again', 'Again', '1 day'], ['partial', 'Partly', '3 days'], ['solid', 'Good', '7+ days'], ['mastered', 'Mastered', '14+ days']].map(function (g) {
                    return h('button', { class: 'btn' + (g[0] === 'solid' ? ' primary' : ''), type: 'button', onclick: function () {
                      const res = FC.gradeCard(load(), c.id, g[0], store.get('srs', {}), store.get('history', []), day);
                      save(res.cards); store.set('srs', res.srs); store.set('history', res.history);
                      u.touchActivity(); revealed = false; notice = 'Recorded "' + g[1] + '".'; paint();
                    } }, g[1], h('span', { class: 'sub' }, g[2]));
                  }))));
        })() : h('p', { class: 'notice' }, 'No flashcards yet. Generate cards from your weak questions or create one below.');

        const editor = editingId ? (function () {
          const base = editingId === '__new__' ? FC.cleanCard({ topic: 'General', front: '', back: '' }) : (cards.filter(function (x) { return x.id === editingId; })[0] || FC.cleanCard({}));
          const fFront = h('textarea', { id: 'fc-front', rows: '2', maxlength: '600', placeholder: 'Front prompt (question or concept)' }); fFront.value = base.front;
          const fBack = h('textarea', { id: 'fc-back', rows: '4', maxlength: '2000', placeholder: 'Back answer (concise explanation + key points)' }); fBack.value = base.back;
          const fTopic = h('input', { id: 'fc-topic', maxlength: '80', value: base.topic });
          const err = h('p', { class: 'notice bad', role: 'alert', hidden: true });
          return h('form', { class: 'hcard plan-form', onsubmit: function (ev) {
            ev.preventDefault();
            if (!fFront.value.trim() || !fBack.value.trim()) { err.textContent = 'Both front prompt and back answer are required.'; err.hidden = false; return; }
            const updated = FC.cleanCard(Object.assign({}, base, { front: fFront.value, back: fBack.value, topic: fTopic.value }));
            const next = editingId === '__new__' ? [updated].concat(load()) : load().map(function (x) { return x.id === updated.id ? updated : x; });
            save(next); editingId = ''; notice = 'Flashcard saved locally.'; paint();
          } },
            h('h2', null, editingId === '__new__' ? 'New flashcard' : 'Edit flashcard'),
            err,
            h('div', { class: 'field' }, h('label', { for: 'fc-topic' }, 'Topic'), fTopic),
            h('div', { class: 'field' }, h('label', { for: 'fc-front' }, 'Front prompt'), fFront),
            h('div', { class: 'field' }, h('label', { for: 'fc-back' }, 'Back answer'), fBack),
            h('div', { class: 'q-actions' },
              h('button', { class: 'btn primary', type: 'submit' }, 'Save card'),
              h('button', { class: 'btn ghost', type: 'button', onclick: function () { editingId = ''; paint(); } }, 'Cancel')));
        })() : null;

        fill(root,
          h('h1', null, 'Flashcards'),
          h('p', { class: 'lede' }, 'Short concept cards built from your weak areas or written by you. Cards stay in this browser and feed your spaced-repetition review schedule without needing AI.'),
          notice ? h('p', { class: 'notice ok', role: 'status' }, notice) : null,
          h('div', { class: 'q-actions' },
            h('button', { class: 'btn primary', type: 'button', onclick: function () {
              const res = FC.buildFromWeak(u.bank, store.get('practice', {}), store.get('srs', {}), load());
              save(res.cards);
              notice = res.added ? ('Added ' + res.added + ' card' + (res.added === 1 ? '' : 's') + ' from your weak questions and lapses.') : 'No new weak questions to import (all weak items are already in your deck, or drill some questions first).';
              revealed = false; paint();
            } }, 'Create from weak questions'),
            h('button', { class: 'btn', type: 'button', onclick: function () { editingId = '__new__'; paint(); } }, 'New custom card')),
          cards.length ? h('p', { class: 'muted small-text' }, cards.length + ' card' + (cards.length === 1 ? '' : 's') + ' · ' + dueCount + ' due now.') : null,
          editor,
          studySection,
          cards.length ? h('section', { class: 'mock-history' }, h('h2', null, 'Your deck (' + cards.length + ')'),
            h('ul', { class: 'story-list' }, cards.map(function (c) {
              const s = srs[c.qid || c.id];
              return h('li', null,
                h('div', { class: 'story-h' }, h('strong', null, c.front)),
                h('div', { class: 'muted small-text' }, c.topic + ' · ' + c.stats.ok + '/' + c.stats.attempts + ' recalled' + (s && s.due ? ' · due ' + s.due : '')),
                h('div', { class: 'q-actions' },
                  h('button', { class: 'btn small', type: 'button', onclick: function () { editingId = c.id; paint(); } }, 'Edit'),
                  h('button', { class: 'btn small ghost', type: 'button', onclick: function () {
                    if (!confirm('Delete this flashcard?')) return;
                    save(load().filter(function (x) { return x.id !== c.id; })); paint();
                  } }, 'Delete')));
            }))) : null);
      }
    }
  };

  /* ================= Topic dependency map (#/map) ================= */
  IGU.routes.map = {
    title: 'Topic map',
    render: function (params) {
      const u = ui(), h = u.h, store = u.store, app = u.app;
      const plan = store.get('plan', {}) || {};
      const prof = plan.profile && PL && PL.validateProfile(plan.profile, null).ok ? plan.profile : null;
      let role = (params && params.get('role')) || (prof ? prof.role : 'backend');
      if (!TM.MAPS[role]) role = 'backend';
      let selectedId = (params && params.get('topic')) || '';
      const root = h('div', { class: 'plan-page' });
      fill(app, root);
      paint();

      function paint() {
        const res = TM.forRole(role, u.bank, { done: u.done.all(), practice: store.get('practice', {}), history: store.get('history', []) });
        const nodes = res.nodes;
        const active = (selectedId && res.byId[selectedId]) || nodes[0];
        if (active) selectedId = active.id;

        const roleSel = h('select', { id: 'tm-role', 'aria-label': 'Role', onchange: function () {
          role = roleSel.value; selectedId = ''; u.go('#/map?role=' + encodeURIComponent(role));
        } }, meta.roles.map(function (r) { return h('option', { value: r.id, selected: r.id === role }, r.name); }));

        const weakNodes = nodes.filter(function (n) { return n.weakPrereqs && n.weakPrereqs.length; });
        const statusLabel = { strong: 'Strong', weak: 'Needs practice', 'in-progress': 'In progress', unstarted: 'Not started' };
        const statusCls = { strong: 'conf-high', weak: 'rd-needs-practice', 'in-progress': 'conf-medium', unstarted: '' };

        const linkList = function (ids, emptyTxt) {
          if (!ids || !ids.length) return h('span', { class: 'muted small-text' }, emptyTxt);
          return h('span', { class: 'q-actions' }, ids.map(function (id) {
            const n = res.byId[id];
            if (!n) return null;
            return h('button', { type: 'button', class: 'btn small ghost', onclick: function () { selectedId = n.id; paint(); } }, n.step + '. ' + n.title);
          }));
        };

        fill(root,
          h('h1', null, 'Topic dependency map'),
          h('p', { class: 'lede' }, 'Curated learning order for ' + u.roleName(role) + '. Follow prerequisites before tackling advanced topics, and spot weak foundations early.'),
          h('div', { class: 'field' }, h('label', { for: 'tm-role' }, 'Role'), roleSel),
          weakNodes.length ? h('div', { class: 'notice' },
            h('strong', null, 'Weak prerequisites spotted: '),
            h('ul', null, weakNodes.map(function (n) {
              return h('li', null, h('strong', null, n.title), ' depends on ',
                n.weakPrereqs.map(function (w, i) { return [i ? ', ' : '', h('button', { type: 'button', class: 'linkish', onclick: function () { selectedId = w.id; paint(); } }, w.title + ' (' + w.reason + ')')]; }));
            }))) : null,
          h('h2', null, 'Suggested learning sequence'),
          h('ol', { class: 'tm-grid' }, nodes.map(function (n) {
            return h('li', { class: 'tm-node' + (active && active.id === n.id ? ' active' : '') },
              h('button', { type: 'button', class: 'tm-btn', 'aria-pressed': active && active.id === n.id ? 'true' : 'false', onclick: function () { selectedId = n.id; paint(); } },
                h('span', { class: 'tm-step' }, String(n.step)),
                h('span', { class: 'tm-info' },
                  h('strong', null, n.title),
                  h('span', { class: 'muted small-text' }, n.prepared + '/' + n.total + ' prepared' + (n.weakPrereqs.length ? ' · weak prereq' : ''))),
                h('span', { class: 'pill ' + statusCls[n.status] }, statusLabel[n.status])));
          })),
          active ? h('section', { class: 'hcard', 'aria-label': active.title },
            h('p', { class: 'eyebrow' }, 'Step ' + active.step + ' of ' + nodes.length),
            h('h2', null, active.title),
            h('p', null, active.summary),
            active.weakPrereqs.length ? h('p', { class: 'notice bad' }, 'Strengthen prerequisite first: ' + active.weakPrereqs.map(function (w) { return w.title + ' (' + w.reason + ')'; }).join('; ') + '.') : null,
            h('p', null, h('strong', null, 'Prerequisites: '), linkList(active.prereqs, 'None (foundational topic)')),
            h('p', null, h('strong', null, 'Related concepts: '), linkList(active.related, 'None listed')),
            h('p', null, h('strong', null, 'Next / advanced extensions: '), linkList(active.next, 'Capstone / advanced topic')),
            h('h3', null, 'Curated questions'),
            h('ul', { class: 'plain-list' }, active.questions.map(function (e) {
              return h('li', null, u.gearBadge(e.level), h('a', { href: '#/q/' + encodeURIComponent(e.id) }, e.q),
                u.done.has(e.id) ? h('span', { class: 'pill conf-high' }, 'prepared') : null);
            })),
            h('div', { class: 'q-actions' },
              h('a', { class: 'btn primary small', href: active.href }, 'Open topic in bank'),
              h('a', { class: 'btn small', href: '#/drill?role=' + encodeURIComponent(role) + '&topic=' + encodeURIComponent(active.topic) }, 'Drill ' + active.topic))) : null);
      }
    }
  };

  IGU.routes.warmup = {
    title: 'Daily warm-up',
    render: function () {
      const u = ui(), h = u.h, store = u.store, app = u.app, day = u.today();
      const plan = store.get('plan', {}) || {};
      const validProf = plan.profile && PL.validateProfile(plan.profile, null).ok ? plan.profile : null;
      let role = validProf ? validProf.role : 'backend';
      let level = validProf ? validProf.level : 2;
      let session = null, idx = 0, revealed = false, elapsed = 0, paused = false;
      let results = [], notes = ['', '', ''], fb = [null, null, null], timer = null;

      const root = h('div', { class: 'plan-page' });
      fill(app, root);
      const stopTimer = function () { if (timer) { clearInterval(timer); timer = null; } };
      const clock = function (s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
      const startTimer = function (clockEl) {
        stopTimer();
        timer = setInterval(function () {
          if (!root.isConnected) { stopTimer(); return; }
          if (!paused && session && idx < session.items.length) {
            elapsed++;
            if (clockEl) clockEl.textContent = clock(elapsed) + ' / ' + session.targetMinutes + ':00';
          }
        }, 1000);
      };

      const startSession = function () {
        const hist = store.get('warmup', []);
        session = WU.buildSession(u.bank, {
          role: role, level: level, day: day,
          practice: store.get('practice', {}), srs: store.get('srs', {}),
          history: store.get('history', []), done: u.done.all(),
          recentIds: WU.recentIds(hist)
        });
        idx = 0; revealed = false; elapsed = 0; paused = false;
        results = []; notes = ['', '', '']; fb = [null, null, null];
        paint();
      };

      paint();

      function paint() {
        stopTimer();
        const warmupHist = store.get('warmup', []);
        if (!session) {
          const rSel = h('select', { id: 'wu-role', onchange: function () { role = rSel.value; } },
            meta.roles.map(function (r) { return h('option', { value: r.id, selected: r.id === role }, r.name); }));
          const gSel = h('select', { id: 'wu-level', onchange: function () { level = Number(gSel.value); } },
            meta.levels.map(function (l) { return h('option', { value: String(l.n), selected: l.n === level }, 'Gear ' + l.n + ' · ' + l.name); }));
          fill(root,
            h('h1', null, 'Daily 10-minute warm-up'),
            h('p', { class: 'lede' }, 'A focused 3-question mix — 1 technical, 1 scenario/debugging, and 1 behavioral — prioritizing your weak areas and feeding directly into spaced repetition and readiness.'),
            h('div', { class: 'drill-filters two' },
              h('div', null, h('label', { for: 'wu-role' }, 'Role'), rSel),
              h('div', null, h('label', { for: 'wu-level' }, 'Gear'), gSel)),
            h('div', { class: 'wu-slots' },
              h('span', { class: 'pill conf-high' }, '1. Technical (~3 min)'),
              h('span', { class: 'pill conf-medium' }, '2. Scenario / Design / Debug (~4 min)'),
              h('span', { class: 'pill conf-low' }, '3. Behavioral STAR-L (~3 min)')),
            h('div', { class: 'q-actions' },
              h('button', { class: 'btn primary', type: 'button', onclick: startSession }, 'Start 10-minute warm-up')),
            warmupHist.length ? h('section', { class: 'hcard', 'aria-label': 'Recent warm-ups' },
              h('h2', null, 'Recent warm-ups (' + warmupHist.length + ')'),
              h('ul', { class: 'plain-list' }, warmupHist.slice(0, 5).map(function (w) {
                const okN = (w.items || []).filter(function (x) { return x.grade === 'solid' || x.grade === 'mastered'; }).length;
                return h('li', null, w.day + ' · ' + u.roleName(w.role) + ' Gear ' + w.level + ' · ' + okN + '/' + (w.items || []).length + ' solid · ' + clock(w.elapsedSecs));
              }))) : null);
          return;
        }

        if (idx >= session.items.length) {
          const okCount = results.filter(function (r) { return r.grade === 'solid' || r.grade === 'mastered'; }).length;
          fill(root,
            h('h1', null, 'Warm-up complete'),
            h('p', { class: 'notice ok' }, 'Finished ' + results.length + ' warm-up questions in ' + clock(elapsed) + ' (' + okCount + '/' + results.length + ' solid or mastered). All grades updated your Drill stats and Review queue.'),
            h('ul', { class: 'plain-list' }, results.map(function (r) {
              return h('li', null, h('strong', null, r.label + ': '), r.q, ' ', h('span', { class: 'pill ' + (r.grade === 'solid' || r.grade === 'mastered' ? 'conf-high' : r.grade === 'partial' ? 'conf-medium' : 'conf-low') }, r.grade));
            })),
            h('div', { class: 'q-actions' },
              h('button', { class: 'btn primary', type: 'button', onclick: startSession }, 'Run another warm-up'),
              h('a', { class: 'btn', href: '#/home' }, 'Back to Home'),
              h('a', { class: 'btn ghost', href: '#/plan' }, 'Open today\'s plan')));
          return;
        }

        const item = session.items[idx];
        const e = item.entry;
        const clockEl = h('span', { class: 'pill wu-timer' }, clock(elapsed) + ' / ' + session.targetMinutes + ':00');
        const pauseBtn = h('button', { class: 'btn small ghost', type: 'button', onclick: function () { paused = !paused; pauseBtn.textContent = paused ? 'Resume timer' : 'Pause timer'; } }, paused ? 'Resume timer' : 'Pause timer');
        startTimer(clockEl);

        const pad = h('textarea', { class: 'wu-pad', rows: '4', maxlength: '4000', placeholder: 'Optional: jot bullet points or talk out loud before revealing the reference answer...', 'aria-label': 'Warm-up answer scratchpad' });
        pad.value = notes[idx] || '';
        pad.oninput = function () { notes[idx] = pad.value; };

        const aiOut = h('div', { class: 'ai-out', hidden: true });
        const aiMsg = h('p', { class: 'notice bad', role: 'alert', hidden: true });
        let aiCtl = null;
        const aiBtn = h('button', { class: 'btn small', type: 'button', onclick: async function () {
          if (!u.aiAvailable()) { u.openSettings(); return; }
          if (!pad.value.trim()) { aiMsg.textContent = 'Write a brief answer outline in the box first so AI feedback has something to critique.'; aiMsg.hidden = false; return; }
          if (!confirm('Send this warm-up question and your draft notes to your AI provider using your own API key?')) return;
          aiCtl = typeof AbortController !== 'undefined' ? new AbortController() : null;
          aiBtn.disabled = true; aiMsg.hidden = true; aiBtn.textContent = 'Asking AI...'; cancelAiBtn.hidden = false;
          try {
            const p = IGU.engine.aiPrompt(e.q + '\n\nCandidate draft:\n' + pad.value.trim(), session.role, session.level, {});
            const res = await IGU.ai.ask({ settings: store.get('settings', {}), system: p.system, prompt: p.prompt, signal: aiCtl ? aiCtl.signal : undefined });
            fill(aiOut, h('p', { class: 'muted small-text' }, 'AI feedback (' + res.provider + ' · ' + res.model + '). Study aid only.'), u.md(res.text));
            aiOut.hidden = false; aiBtn.textContent = 'Ask AI again';
          } catch (err) { aiMsg.textContent = err.message; aiMsg.hidden = false; aiBtn.textContent = err.kind === 'cancelled' ? 'AI feedback' : 'Try AI again'; }
          aiBtn.disabled = false; cancelAiBtn.hidden = true;
        } }, u.aiAvailable() ? 'AI feedback' : 'Add API key for AI feedback');
        const cancelAiBtn = h('button', { class: 'btn small ghost', type: 'button', hidden: true, onclick: function () { if (aiCtl) aiCtl.abort(); } }, 'Cancel');

        const f = fb[idx];
        fill(root,
          h('div', { class: 'drill-row' },
            h('strong', null, 'Warm-up ' + (idx + 1) + ' of ' + session.items.length + ' · ' + item.label),
            h('span', { class: 'grow' }),
            clockEl, pauseBtn),
          h('section', { class: 'drill-card', 'aria-label': item.label + ' warm-up question' },
            h('div', { class: 'drill-row' },
              u.gearBadge(e.level),
              h('span', { class: 'muted small-text' }, e.topic + ' · ' + item.reason + ' · ~' + item.minutes + ' min')),
            h('div', { class: 'drill-q' }, e.q),
            pad,
            h('div', { class: 'q-actions' },
              h('button', { class: 'btn small', type: 'button', onclick: function () { fb[idx] = WU.feedback(item, pad.value); paint(); } }, 'Offline self-check'),
              aiBtn, cancelAiBtn),
            f ? h('div', { class: 'notice' },
              h('p', null, h('strong', null, 'Offline rubric check (' + f.type + ', ' + f.wordCount + ' words): '),
                f.passed.length ? 'Covered: ' + f.passed.join(', ') + '. ' : '',
                f.missing.length ? 'Missing: ' + f.missing.join(', ') + '.' : (f.ok ? 'Core cues present.' : '')),
              f.notes.map(function (n) { return h('p', { class: 'small-text muted' }, n); })) : null,
            aiMsg, aiOut,
            !revealed
              ? h('div', { class: 'q-actions' },
                h('button', { class: 'btn primary', type: 'button', onclick: function () { revealed = true; paint(); } }, 'Reveal reference answer'),
                h('button', { class: 'btn ghost small', type: 'button', onclick: function () { session = null; paint(); } }, 'End warm-up'))
              : h('div', { class: 'q-body flush' },
                !e.isStoryPrompt ? u.answerBody(e) : h('div', { class: 'short' }, h('h4', null, 'STAR-L guide'), u.md(e.short), u.md(e.detail)),
                h('p', { class: 'muted small-text' }, 'How did that go? Grading updates your spaced-repetition schedule and daily stats:'),
                h('div', { class: 'q-actions grades' },
                  [['again', 'Again', '1 day'], ['partial', 'Partly', '3 days'], ['solid', 'Solid', '7+ days'], ['mastered', 'Mastered', '14+ days']].map(function (g) {
                    return h('button', { class: 'btn' + (g[0] === 'solid' ? ' primary' : ''), type: 'button', onclick: function () {
                      const upd = WU.recordItem({ practice: store.get('practice', {}), srs: store.get('srs', {}), history: store.get('history', []), done: u.done.all() }, item, g[0], Math.round(elapsed / (idx + 1)), day);
                      store.set('practice', upd.practice);
                      store.set('srs', upd.srs);
                      store.set('history', upd.history);
                      if (!e.isStoryPrompt && (g[0] === 'solid' || g[0] === 'mastered')) u.done.set(e.id, true);
                      u.touchActivity();
                      results.push({ id: e.id, slot: item.slot, label: item.label, q: e.q, grade: g[0] });
                      idx++; revealed = false;
                      if (idx >= session.items.length) {
                        store.set('warmup', WU.completeSession(store.get('warmup', []), { day: day, role: session.role, level: session.level, elapsedSecs: elapsed, items: results }));
                      }
                      paint();
                    } }, g[1], h('span', { class: 'sub' }, g[2]));
                  })))));
      }
    }
  };

  IGU.routes.guide = {
    title: 'Guide & feedback',
    render: function () {
      const u = ui(), h = u.h, store = u.store, app = u.app, day = u.today();
      const root = h('div', { class: 'plan-page' });
      fill(app, root);
      let notice = '', report = null;

      paint();

      function applyDemo(sc) {
        const existingDone = Object.keys(u.done.all()).length + Object.keys(store.get('practice', {})).length;
        if (existingDone && !confirm('Merge "' + sc.label + '" into your local browser plan? Existing prepared items are preserved, and your profile switches to this sample role/gear.')) return;
        const plan = store.get('plan', {}) || {};
        const prof = PL.validateProfile(Object.assign({}, sc.profile, { createdDay: day }), day).profile;
        store.set('plan', Object.assign({}, plan, { profile: prof, skipped: {}, completed: plan.completed || {} }));
        store.set('onboarding', { done: day });
        const curPractice = Object.assign({}, store.get('practice', {}));
        Object.keys(sc.practice).forEach(function (id) { if (!curPractice[id]) curPractice[id] = sc.practice[id]; });
        store.set('practice', curPractice);
        Object.keys(sc.done).forEach(function (id) { u.done.set(id, true); });
        notice = 'Loaded sample scenario "' + sc.label + '". Open Home, Plan, or Readiness to explore it with real local evidence.';
        paint();
      }

      function paint() {
        const plan = store.get('plan', {}) || {};
        const prof = plan.profile && PL.validateProfile(plan.profile, null).ok ? plan.profile : null;
        const fRole = h('select', { id: 'gd-role' }, [h('option', { value: 'Not specified' }, 'Any / General')].concat(meta.roles.map(function (r) { return h('option', { value: r.id, selected: prof && prof.role === r.id }, r.name); })));
        const fGear = h('select', { id: 'gd-gear' }, [1, 2, 3, 4].map(function (n) { return h('option', { value: String(n), selected: prof && prof.level === n }, 'Gear ' + n); }));
        const fTime = h('input', { id: 'gd-time', type: 'text', maxlength: '40', placeholder: 'e.g. ~45 seconds' });
        const fMod = h('select', { id: 'gd-mod' }, [h('option', { value: 'Not selected' }, 'Choose module')].concat(GD.MODULES.map(function (m) { return h('option', { value: m }, m); })));
        const fWorked = h('select', { id: 'gd-worked' }, ['Yes — clear and complete', 'Mostly — minor friction', 'No — found a bug or unclear step'].map(function (x) { return h('option', { value: x }, x); }));
        const fConfusing = h('textarea', { id: 'gd-confuse', rows: '2', maxlength: '600', placeholder: 'Which screen or workflow felt confusing, slow, or unclear?' });
        const fSuggest = h('textarea', { id: 'gd-suggest', rows: '3', maxlength: '1200', placeholder: 'What would make InterviewGearUp more useful for your real interviews?' });

        fill(root,
          h('h1', null, 'Guide, demo scenarios & opt-in feedback'),
          h('p', { class: 'lede' }, 'InterviewGearUp runs 100% locally in your browser with zero analytics, zero tracking cookies, and zero accounts. Explore the end-to-end loop, load a sample study setup, check recent updates, or share structured feedback only when you choose.'),
          notice ? h('p', { class: 'notice ok', role: 'status' }, notice) : null,

          h('section', { class: 'hcard', 'aria-label': '5-step preparation workflow' },
            h('h2', null, 'How the preparation loop works'),
            h('ol', { class: 'plain-list' }, GD.WALKTHROUGH.map(function (w) {
              return h('li', null, h('a', { href: w.route }, h('strong', null, w.step + '. ' + w.title)), ' — ', w.summary);
            }))),

          h('section', { class: 'hcard', 'aria-label': 'Try a sample scenario' },
            h('h2', null, 'Sample scenarios (zero-commitment preview)'),
            h('p', { class: 'muted small-text' }, 'Want to see Dashboard, Adaptive Plan, Topic Map, and Readiness populated right away? Load a sample profile in your browser; API keys and existing stories/notes stay untouched.'),
            h('div', { class: 'tm-grid' }, GD.DEMO_SCENARIOS.map(function (sc) {
              return h('div', { class: 'hcard' },
                h('h3', null, sc.label),
                h('p', { class: 'small-text' }, sc.description),
                h('button', { class: 'btn small', type: 'button', onclick: function () { applyDemo(sc); } }, 'Load sample'));
            }))),

          h('section', { class: 'hcard', 'aria-label': 'Recent releases' },
            h('h2', null, 'What shipped recently'),
            h('ul', { class: 'plain-list' }, GD.RELEASES.map(function (rel) {
              return h('li', null, h('strong', null, rel.version + ' · '), h('a', { href: rel.route }, rel.title), ' — ', rel.notes);
            }))),

          h('section', { class: 'hcard', 'aria-label': 'Opt-in usability and product feedback' },
            h('h2', null, 'Share opt-in feedback or usability notes'),
            h('p', { class: 'muted small-text' }, 'Nothing is sent automatically. Build a local Markdown report (any accidental API keys are scrubbed) to save or paste into GitHub.'),
            h('div', { class: 'drill-filters two' },
              h('div', null, h('label', { for: 'gd-role' }, 'Role'), fRole),
              h('div', null, h('label', { for: 'gd-gear' }, 'Gear'), fGear),
              h('div', null, h('label', { for: 'gd-time' }, 'Time to start preparing'), fTime),
              h('div', null, h('label', { for: 'gd-mod' }, 'Most useful module'), fMod),
              h('div', null, h('label', { for: 'gd-worked' }, 'Workflow clarity'), fWorked)),
            h('div', { class: 'field' }, h('label', { for: 'gd-confuse' }, 'Confusing UI or friction'), fConfusing),
            h('div', { class: 'field' }, h('label', { for: 'gd-suggest' }, 'Suggestions / next priority'), fSuggest),
            h('div', { class: 'q-actions' },
              h('button', { class: 'btn primary', type: 'button', onclick: function () {
                report = GD.buildFeedbackReport({
                  role: fRole.value, gear: fGear.value, timeToStart: fTime.value,
                  mostUseful: fMod.value, worked: fWorked.value, confusing: fConfusing.value, suggestions: fSuggest.value, day: day
                });
                paint();
              } }, 'Generate feedback report')),
            report ? h('div', { class: 'related-box' },
              h('h3', null, 'Generated report (local preview)'),
              h('pre', { class: 'small-text' }, report.markdown),
              h('div', { class: 'q-actions' },
                h('button', { class: 'btn small', type: 'button', onclick: function () {
                  const a = h('a', { href: URL.createObjectURL(new Blob([report.markdown], { type: 'text/markdown' })), download: 'interviewgearup-feedback-' + day + '.md' });
                  document.body.appendChild(a); a.click(); a.remove();
                } }, 'Download Markdown'),
                h('a', { class: 'btn small', href: report.githubIssueUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Open pre-filled GitHub issue'))) : null));
      }
    }
  };
})();
