/* Views for the behavioral story bank (#/stories), job description analyzer (#/jd) and system design workspace (#/design).
   Registered in IGU.routes; everything is stored in this browser only. No innerHTML. */
(function () {
  const IGU = window.IGU;
  IGU.routes = IGU.routes || {};
  const meta = IGU.meta, ST = IGU.stories, JD = IGU.jd, DS = IGU.design, PL = IGU.planner, Q = IGU.quality;
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
  const field = function (h, id, label, control, hint) {
    return h('div', { class: 'field' }, h('label', { for: id }, label, hint ? h('span', { class: 'hint' }, ' ' + hint) : null), control);
  };
  const roleOptions = function (h) { return meta.roles.map(function (r) { return h('option', { value: r.id }, r.name); }); };
  const gearOptions = function (h) { return meta.levels.map(function (l) { return h('option', { value: String(l.n) }, l.n + ' ' + l.name); }); };
  const rubricTable = function (h, dims, labels, caption) {
    return h('table', { class: 'rubric' }, h('caption', { class: 'sr-only' }, caption),
      h('tbody', null, dims.map(function (d) { return h('tr', null, h('th', { scope: 'row' }, d.label), h('td', { class: 'lv l' + d.level }, labels[d.level]), h('td', null, d.why ? h('span', { class: 'why' }, d.why + ' ') : null, d.note)); })));
  };

  /* A button that asks an AI provider (only after explicit confirmation of what is sent) with cancel support and metadata display. */
  function aiButton(u, label, sendNote, build, out, msg) {
    const h = u.h;
    const btn = h('button', { class: 'btn small', type: 'button' }, u.aiAvailable() ? label : 'Add API key for AI feedback');
    const cancelBtn = h('button', { class: 'btn small ghost', type: 'button', hidden: true }, 'Cancel');
    let ctl = null;
    cancelBtn.addEventListener('click', function () { if (ctl) ctl.abort(); });
    btn.addEventListener('click', async function () {
      if (!u.aiAvailable()) { u.openSettings(); return; }
      if (!confirm(sendNote + '\n\nIt is sent to your AI provider using your own key and may be billed to you. Continue?')) return;
      ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      btn.disabled = true; msg.hidden = true; btn.textContent = 'Asking AI...'; cancelBtn.hidden = false;
      try {
        const b = build();
        const res = await IGU.ai.ask({ settings: u.store.get('settings', {}), system: b.system, prompt: b.prompt, signal: ctl ? ctl.signal : undefined });
        const metaTxt = [res.provider, res.model, res.at ? res.at.slice(0, 10) : '', res.usage ? (res.usage.inputTokens + res.usage.outputTokens) + ' tokens' : ''].filter(Boolean).join(' · ');
        fill(out,
          h('p', { class: 'muted small-text' }, 'AI output (' + metaTxt + '). Study aid only, not a rating or hiring prediction.'),
          res.truncated ? h('p', { class: 'notice' }, 'Output hit the token limit and may be truncated.') : null,
          u.md(res.text),
          h('button', { class: 'btn small ghost', type: 'button', onclick: function () { fill(out); out.hidden = true; } }, 'Dismiss AI feedback'));
        out.hidden = false; btn.textContent = 'Ask again';
      } catch (e) { msg.textContent = e.message; msg.hidden = false; btn.textContent = e.kind === 'cancelled' ? label : 'Try again'; }
      btn.disabled = false; cancelBtn.hidden = true;
    });
    return h('span', { class: 'q-actions' }, btn, cancelBtn);
  }

  /* ================= Behavioral stories ================= */
  IGU.routes.stories = {
    title: 'Behavioral stories',
    render: function () {
      const u = ui(), h = u.h, store = u.store, app = u.app, day = u.today();
      const load = function () { return (store.get('stories', []) || []).map(function (s) { return ST.clean(s).story; }); };
      const save = function (list) { store.set('stories', list.slice(0, ST.MAX_STORIES)); };
      const clock = function (s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
      let query = '', tag = '', status = '';
      const root = h('div', { class: 'plan-page' });
      fill(app, root);
      list();

      function list() {
        const stories = load();
        const cov = ST.coverage(stories);
        const over = ST.overused(stories);
        const qIn = h('input', { id: 'st-q', type: 'search', placeholder: 'Search your stories', value: query, 'aria-label': 'Search your stories', oninput: function () { query = qIn.value; paintList(); } });
        const tagSel = h('select', { id: 'st-tag', 'aria-label': 'Filter by competency', onchange: function () { tag = tagSel.value; paintList(); } }, [h('option', { value: '' }, 'All competencies')].concat(ST.TAGS.map(function (t) { return h('option', { value: t }, t); })));
        tagSel.value = tag;
        const stSel = h('select', { id: 'st-status', 'aria-label': 'Filter by status', onchange: function () { status = stSel.value; paintList(); } }, [
          h('option', { value: '' }, 'All statuses'),
          h('option', { value: 'complete' }, 'Complete STAR'),
          h('option', { value: 'draft' }, 'Drafts (needs work)')
        ]);
        stSel.value = status;
        const results = h('div', { 'aria-live': 'polite' });
        function paintList() {
          const rows = ST.search(load(), query, tag, status);
          fill(results, rows.length ? h('ul', { class: 'story-list' }, rows.map(function (s) {
            const c = ST.completeness(s);
            return h('li', null,
              h('div', { class: 'story-h' }, h('strong', null, s.title), ' ',
                h('span', { class: 'pill ' + (c.complete ? 'conf-high' : 'conf-medium') }, 'STAR ' + c.score + '/' + c.max + (c.complete ? '' : ' · missing ' + c.missing.join(', ')))),
              h('div', { class: 'muted small-text' }, (s.tags.join(', ') || 'no tags') + ' · ' + s.questionIds.length + ' linked question' + (s.questionIds.length === 1 ? '' : 's') + (c.hasLessons ? ' · has reflection' : '')),
              h('div', { class: 'q-actions' },
                h('button', { class: 'btn small', type: 'button', onclick: function () { edit(s); } }, 'Edit'),
                h('button', { class: 'btn small ghost', type: 'button', onclick: function () { download('story-' + s.id + '.md', ST.toMarkdown(s), 'text/markdown'); } }, 'Export'),
                h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Delete ' + s.title, onclick: function () {
                  if (!confirm('Delete "' + s.title + '"? This cannot be undone.')) return;
                  save(load().filter(function (x) { return x.id !== s.id; })); list();
                } }, 'Delete')));
          })) : h('p', { class: 'muted' }, stories.length ? 'No stories match this filter.' : 'No stories yet. Write your first from a real experience; the site never writes one for you.'));
        }
        fill(root,
          h('h1', null, 'Behavioral stories'),
          h('p', { class: 'lede' }, 'Keep your own experiences as private, reusable STAR-L stories and practise delivering them under time. Stored only in this browser unless you request AI feedback on a single story.'),
          h('div', { class: 'tag-cov', role: 'group', 'aria-label': 'Story coverage by competency' }, ST.TAGS.map(function (t) {
            return h('button', { type: 'button', class: 'chip' + (cov.by[t] ? ' on' : ''), 'aria-pressed': tag === t ? 'true' : 'false', onclick: function () { tag = tag === t ? '' : t; tagSel.value = tag; paintList(); list(); } }, t + ': ' + cov.by[t]);
          })),
          cov.uncovered.length ? h('p', { class: 'muted small-text' }, 'Missing competencies (' + cov.uncovered.length + '): ' + cov.uncovered.join(', ') + '.') : h('p', { class: 'notice ok' }, 'All ' + ST.TAGS.length + ' competencies have at least one story.'),
          over.length ? h('div', { class: 'notice' }, h('strong', null, 'Overused story check: '), h('ul', null, over.map(function (o) { return h('li', null, h('strong', null, o.story.title), ' — ', o.reason); }))) : null,
          h('div', { class: 'q-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: function () { edit(null); } }, 'New story')),
          h('div', { class: 'drill-filters three' },
            h('div', null, h('label', { for: 'st-q', class: 'sr-only' }, 'Search'), qIn),
            h('div', null, h('label', { for: 'st-tag', class: 'sr-only' }, 'Competency'), tagSel),
            h('div', null, h('label', { for: 'st-status', class: 'sr-only' }, 'Status'), stSel)),
          results, practice(stories));
        paintList();
      }

      function practice(stories) {
        const prompts = ST.behavioralQuestions(u.bank).map(function (e) { return { id: e.id, q: e.q, tags: ST.tagsForQuestion(e.q) }; })
          .concat(ST.PROMPTS.map(function (p) { return { id: p.id, q: p.q, tags: p.tag ? [p.tag] : ST.tagsForQuestion(p.q) }; }));
        const pTagSel = h('select', { id: 'st-ptag', 'aria-label': 'Filter practice questions by competency' },
          [h('option', { value: '' }, 'All competencies')].concat(ST.TAGS.map(function (t) { return h('option', { value: t }, t); })));
        const sel = h('select', { id: 'st-prompt', 'aria-label': 'Practice question' });
        let filtered = prompts;
        function fillPrompts() {
          const want = pTagSel.value;
          filtered = want ? prompts.filter(function (p) { return p.tags.indexOf(want) >= 0; }) : prompts;
          if (!filtered.length) filtered = prompts;
          sel.replaceChildren();
          filtered.forEach(function (p) { sel.appendChild(h('option', { value: p.id }, p.q)); });
        }
        fillPrompts();

        const clockEl = h('span', { class: 'timer', role: 'timer', 'aria-label': 'Elapsed practice time' }, '0:00');
        const notes = h('textarea', { id: 'st-pnotes', rows: '4', maxlength: '2500', placeholder: 'Optional bullet points as you speak out loud (Situation -> Task -> Action -> Result -> Lessons). Target: ~2:00.' });
        const out = h('div', { 'aria-live': 'polite' });
        const reflectBox = h('div', { 'aria-live': 'polite' });
        const histBox = h('div', { 'aria-live': 'polite' });
        let t0 = 0, elapsed = 0, timer = null;
        const totalSecs = function () { return elapsed + (timer ? (Date.now() - t0) / 1000 : 0); };
        const stopTimer = function () { if (timer) { clearInterval(timer); timer = null; elapsed += (Date.now() - t0) / 1000; } };
        const startTimer = function () {
          if (timer) return;
          t0 = Date.now();
          timer = setInterval(function () {
            const s = totalSecs();
            clockEl.textContent = clock(s);
            clockEl.classList.toggle('late', s > 150);
          }, 400);
        };
        const resetTimer = function () { stopTimer(); elapsed = 0; clockEl.textContent = '0:00'; clockEl.classList.remove('late'); };
        u.setCleanup(function () { if (timer) clearInterval(timer); });

        const currentPrompt = function () { return filtered.filter(function (x) { return x.id === sel.value; })[0] || filtered[0]; };
        const showMatches = function () {
          const p = currentPrompt();
          const m = ST.storiesFor(load(), p);
          fill(out, h('p', { class: 'drill-q' }, p.q),
            p.tags.length ? h('p', { class: 'muted small-text' }, 'Competencies: ' + p.tags.join(', ')) : null,
            m.length ? h('details', null, h('summary', null, 'Matching stories (' + m.length + ') — keep collapsed while practising from memory'),
              h('ul', { class: 'plain-list' }, m.map(function (x) {
                return h('li', null, h('button', { class: 'linkish', type: 'button', onclick: function () { edit(x.story); } }, x.story.title), ' ', h('span', { class: 'muted small-text' }, '(' + x.why + ')'));
              })))
              : h('p', { class: 'muted small-text' }, 'None of your stories match yet. Write one from a real experience; the site will not invent one for you.'));
        };

        const paintHistory = function () {
          const hist = store.get('storyPractice', []) || [];
          fill(histBox, hist.length ? h('details', null, h('summary', null, 'Recent behavioral attempts (' + hist.length + ')'),
            h('ul', { class: 'res-list' }, hist.slice(0, 8).map(function (x) {
              return h('li', null, h('strong', null, x.day + ' · ' + clock(x.secs) + ' · ' + (x.rating === 'solid' ? 'Solid' : 'Needs work')),
                h('div', { class: 'small-text' }, x.question),
                x.reflection ? h('div', { class: 'muted small-text' }, 'Reflection: ' + x.reflection) : null);
            }))) : null);
        };

        const finishAndReflect = function () {
          stopTimer();
          const secs = Math.round(totalSecs());
          const p = currentPrompt();
          const curStories = load();
          const usedSel = h('select', { id: 'st-used' }, [h('option', { value: '' }, 'No saved story selected')].concat(curStories.map(function (s) { return h('option', { value: s.id }, s.title); })));
          const ratingSel = h('select', { id: 'st-rate' }, [
            h('option', { value: 'solid' }, 'Solid — clear STAR, stayed concise'),
            h('option', { value: 'needs-work' }, 'Needs work — tighten or add metrics')
          ]);
          const refNote = h('textarea', { id: 'st-ref', rows: '2', maxlength: '600', placeholder: 'What went well, and what would you tighten next time?' });
          fill(reflectBox, h('div', { class: 'hcard' },
            h('h3', null, 'Post-attempt reflection (' + clock(secs) + ')'),
            h('p', { class: 'muted small-text' }, secs > 150 ? 'Ran past 2:30 — try trimming Situation to 2 sentences.' : secs < 45 ? 'Under 45s — check that Action and Result have enough detail.' : 'Good pacing (aiming for ~2 minutes).'),
            field(h, 'st-used', 'Story used', usedSel),
            field(h, 'st-rate', 'Self-check', ratingSel),
            field(h, 'st-ref', 'Reflection note', refNote, '(saved only on this device)'),
            h('div', { class: 'q-actions' },
              h('button', { class: 'btn primary small', type: 'button', onclick: function () {
                const next = ST.recordAttempt(store.get('storyPractice', []), { day: day, qid: p.id, question: p.q, storyId: usedSel.value, secs: secs, reflection: refNote.value, rating: ratingSel.value });
                store.set('storyPractice', next); u.touchActivity();
                fill(reflectBox, h('p', { class: 'notice ok' }, 'Attempt and reflection saved on this device.'));
                resetTimer(); notes.value = ''; paintHistory();
              } }, 'Save reflection'),
              h('button', { class: 'btn ghost small', type: 'button', onclick: function () { fill(reflectBox); } }, 'Dismiss'))));
        };

        pTagSel.addEventListener('change', function () { fillPrompts(); showMatches(); });
        sel.addEventListener('change', showMatches);
        setTimeout(function () { showMatches(); paintHistory(); }, 0);

        return h('section', { class: 'mock-history' }, h('h2', null, 'Timed behavioral practice'),
          h('p', { class: 'muted small-text' }, 'Pick a prompt, start the 2-minute timer, answer aloud (or jot quick bullet points), then record a short reflection.'),
          h('div', { class: 'drill-filters' },
            h('div', null, h('label', { for: 'st-ptag' }, 'Competency'), pTagSel),
            h('div', null, h('label', { for: 'st-prompt' }, 'Question'), sel)),
          h('div', { class: 'q-actions' },
            h('button', { class: 'btn', type: 'button', onclick: function () { sel.selectedIndex = Math.floor(Math.random() * filtered.length); resetTimer(); fill(reflectBox); showMatches(); } }, 'Random question'),
            h('button', { class: 'btn primary', type: 'button', onclick: function () { if (timer) stopTimer(); else startTimer(); } }, 'Start / pause timer'),
            h('button', { class: 'btn', type: 'button', onclick: finishAndReflect }, 'Finish & reflect'),
            h('button', { class: 'btn ghost', type: 'button', onclick: function () { resetTimer(); notes.value = ''; fill(reflectBox); } }, 'Reset'),
            clockEl),
          out,
          field(h, 'st-pnotes', 'Practice notes', notes, '(optional, cleared on save)'),
          reflectBox, histBox);
      }

      function edit(existing) {
        const s = existing ? ST.clean(existing).story : ST.newStory();
        const inputs = {};
        const area = function (id, label, hint, rows) { inputs[id] = h('textarea', { id: 'st-' + id, rows: String(rows || 3), maxlength: '2000' }); inputs[id].value = s[id] || ''; return field(h, 'st-' + id, label, inputs[id], hint); };
        const title = h('input', { id: 'st-title', maxlength: '120', value: s.title });
        const tagBoxes = ST.TAGS.map(function (t) { return h('label', { class: 'chk' }, h('input', { type: 'checkbox', value: t, checked: s.tags.indexOf(t) >= 0 }), ' ' + t); });
        const qs = ST.behavioralQuestions(u.bank).map(function (e) { return { id: e.id, q: e.q }; }).concat(ST.PROMPTS);
        const qBoxes = qs.map(function (q) { return h('label', { class: 'chk' }, h('input', { type: 'checkbox', value: q.id, checked: s.questionIds.indexOf(q.id) >= 0 }), ' ' + q.q); });
        const notesEl = h('div', { 'aria-live': 'polite' });
        const err = h('p', { class: 'notice bad', role: 'alert', hidden: true });
        const aiOut = h('div', { class: 'ai-feedback', hidden: true }), aiMsg = h('p', { class: 'notice bad', role: 'alert', hidden: true });
        const gather = function () {
          const draft = Object.assign({}, s, { title: title.value, tags: tagBoxes.map(function (b) { return b.firstChild; }).filter(function (c) { return c.checked; }).map(function (c) { return c.value; }),
            questionIds: qBoxes.map(function (b) { return b.firstChild; }).filter(function (c) { return c.checked; }).map(function (c) { return c.value; }) });
          ST.FIELDS.forEach(function (f) { draft[f] = inputs[f].value; });
          return ST.clean(draft);
        };
        const check = function () {
          const r = gather(); const n = ST.suggest(r.story);
          const comp = ST.completeness(r.story);
          fill(notesEl,
            h('p', { class: 'muted small-text' }, 'STAR completeness: ' + comp.score + ' of ' + comp.max + (comp.hasMetrics ? ' · has impact metrics' : '') + (comp.hasLessons ? ' · has reflection' : '') + '.'),
            n.length ? h('div', null, h('h3', null, 'Suggestions'), h('ul', null, n.map(function (x) { return h('li', null, x); }))) : h('p', { class: 'notice ok' }, 'Nothing to flag. Read it aloud and time it: aim for about two minutes.'));
        };
        fill(root, h('h1', null, existing ? 'Edit story' : 'New story'),
          h('p', { class: 'lede' }, 'Write from your real experience. Use "I" for what you did and credit your team separately. Saved privately on this device.'),
          h('form', { class: 'plan-form', novalidate: true, onsubmit: function (ev) {
            ev.preventDefault();
            const r = gather();
            if (r.problems.length) { err.textContent = r.problems.join(' '); err.hidden = false; return; }
            r.story.updatedAt = new Date().toISOString();
            const all = load().filter(function (x) { return x.id !== r.story.id; });
            save([r.story].concat(all)); u.touchActivity(); list();
          } },
            err, field(h, 'st-title', 'Title', title, '(for you, e.g. "Checkout outage during the sale")'),
            h('fieldset', null, h('legend', null, 'Competency tags'), h('div', { class: 'chk-grid' }, tagBoxes)),
            area('situation', 'Situation', ST.FIELD_PROMPTS.situation),
            area('task', 'Task', ST.FIELD_PROMPTS.task),
            area('action', 'Action', ST.FIELD_PROMPTS.action, 5),
            area('result', 'Result', ST.FIELD_PROMPTS.result),
            area('metrics', 'Impact and metrics', '(optional) ' + ST.FIELD_PROMPTS.metrics, 2),
            area('lessons', 'Lessons', '(optional) ' + ST.FIELD_PROMPTS.lessons),
            h('details', null, h('summary', null, 'Link to questions (' + qs.length + ')'), h('div', { class: 'chk-list' }, qBoxes)),
            h('div', { class: 'formfoot' }, h('button', { class: 'btn primary', type: 'submit' }, 'Save story'),
              h('button', { class: 'btn', type: 'button', onclick: check }, 'Check my story'),
              aiButton(u, 'AI feedback', 'This story text (title, situation, task, action, result, metrics, lessons) will be sent to the AI provider. AI will only review clarity and structure and will not invent accomplishments. Do not include confidential details.',
                function () { return { system: ST.AI_SYSTEM, prompt: ST.aiPrompt(gather().story) }; }, aiOut, aiMsg),
              h('button', { class: 'btn ghost', type: 'button', onclick: list }, 'Cancel'))),
          notesEl, aiMsg, aiOut);
      }
    }
  };

  /* ================= Job description analyzer ================= */
  IGU.routes.jd = {
    title: 'Job description analyzer',
    render: function () {
      const u = ui(), h = u.h, store = u.store, app = u.app, day = u.today();
      const root = h('div', { class: 'plan-page' });
      fill(app, root);
      form();

      function form(prefill) {
        const p = prefill || {};
        const title = h('input', { id: 'jd-title', maxlength: '120', value: p.title || '' });
        const company = h('input', { id: 'jd-company', maxlength: '80', value: p.company || '' });
        const url = h('input', { id: 'jd-url', type: 'url', placeholder: 'https://...', value: p.url || '' });
        const text = h('textarea', { id: 'jd-text', rows: '10', maxlength: '12000', placeholder: 'Paste the job description text here' }); text.value = p.text || '';
        const err = h('p', { class: 'notice bad', role: 'alert', hidden: true });
        const saved = store.get('jds', []);
        fill(root, h('h1', null, 'Job description analyzer'),
          h('p', { class: 'lede' }, 'Paste a job description to see which skills it mentions, which of our questions cover them, and what is not covered. It runs in your browser with simple keyword matching; nothing is sent anywhere unless you press an AI button.'),
          h('form', { class: 'plan-form', novalidate: true, onsubmit: function (ev) {
            ev.preventDefault();
            if (text.value.trim().length < 60) { err.textContent = 'Paste at least a few sentences of the job description.'; err.hidden = false; return; }
            if (url.value.trim() && !JD.cleanUrl(url.value)) { err.textContent = 'The link must start with https://. (It is only stored as a note; the page is never fetched.)'; err.hidden = false; return; }
            results({ title: title.value.trim(), company: company.value.trim(), url: JD.cleanUrl(url.value), text: text.value.slice(0, 12000) });
          } }, err,
            field(h, 'jd-title', 'Job title', title, '(optional)'), field(h, 'jd-company', 'Company', company, '(optional)'),
            field(h, 'jd-url', 'Link to the posting', url, '(optional, stored as a note only)'), field(h, 'jd-text', 'Job description', text),
            h('div', { class: 'formfoot' }, h('button', { class: 'btn primary', type: 'submit' }, 'Analyze'))),
          saved.length ? h('section', { class: 'mock-history' }, h('h2', null, 'Saved analyses'), h('ul', { class: 'plain-list' }, saved.map(function (s, i) {
            return h('li', null, h('button', { class: 'linkish', type: 'button', onclick: function () { results(s); } }, (s.title || 'Untitled') + (s.company ? ' at ' + s.company : '') + ' (' + s.day + ')'), ' ',
              h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Delete saved analysis ' + (s.title || ''), onclick: function () { const n = saved.slice(); n.splice(i, 1); store.set('jds', n); form(); } }, 'Delete'));
          }))) : null);
      }

      function results(jd) {
        const ex = JD.extract(jd.text);
        const kept = {}; (jd.skills || ex.skills.map(function (s) { return s.id; })).forEach(function (id) { kept[id] = 1; });
        let role = jd.role || JD.guessRole(ex.skills, jd.text);
        let level = jd.level || ex.seniority.level || 2;
        const out = h('div');
        const roleSel = h('select', { id: 'jd-role', onchange: function () { role = roleSel.value; paint(); } }, roleOptions(h)); roleSel.value = role;
        const lvlSel = h('select', { id: 'jd-level', onchange: function () { level = Number(lvlSel.value); paint(); } }, gearOptions(h)); lvlSel.value = String(level);
        const addSel = h('select', { id: 'jd-add', 'aria-label': 'Add a skill' }, [h('option', { value: '' }, 'Add a skill the posting needs...')].concat(JD.SKILLS.filter(function (s) { return !ex.skills.some(function (x) { return x.id === s.id; }); }).map(function (s) { return h('option', { value: s.id }, s.name); })));
        addSel.addEventListener('change', function () { if (addSel.value) { kept[addSel.value] = 1; extra.push(addSel.value); paint(); } });
        const extra = [];
        const msg = h('p', { class: 'notice', hidden: true, role: 'status' });
        const aiOut = h('div', { class: 'ai-feedback', hidden: true }), aiMsg = h('p', { class: 'notice bad', role: 'alert', hidden: true });

        function paint() {
          const selected = Object.keys(kept);
          const pl = JD.plan(selected, u.bank, role, level);
          const byId = {}; ex.skills.forEach(function (s) { byId[s.id] = s; });
          const rows = pl.maps.map(function (m) {
            const sk = byId[m.id];
            const links = m.map.ids.map(function (id) { const e = u.bank.filter(function (x) { return x.id === id; })[0]; return h('li', null, h('a', { href: '#/q/' + id }, e.q), Q.isReal(e) ? '' : h('span', { class: 'muted small-text' }, ' (answer pending)'), m.map.reasons && m.map.reasons[id] ? h('div', { class: 'muted small-text' }, 'Why: ' + m.map.reasons[id] + '.') : null); });
            return h('li', { class: 'skill' },
              h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: true, 'aria-label': 'Keep ' + m.name, onchange: function (ev) { if (!ev.target.checked) delete kept[m.id]; paint(); } }), ' ', h('strong', null, m.name)),
              ' ', sk ? h('span', { class: 'pill ' + (sk.match === 'inferred' ? 'conf-medium' : 'conf-high') }, sk.match === 'inferred' ? 'inferred' : 'named in posting') : h('span', { class: 'pill' }, 'added by you'),
              ' ', h('span', { class: 'pill conf-' + m.map.confidence }, m.map.confidence === 'none' ? 'not covered' : m.map.confidence + ' confidence · ' + m.map.total + ' question' + (m.map.total === 1 ? '' : 's')),
              sk ? h('div', { class: 'muted small-text' }, (sk.match === 'inferred' ? 'Implied by ' : 'Found ') + (sk.phrases && sk.phrases.length ? sk.phrases.map(function (x) { return '"' + x + '"'; }).join(', ') : 'it') + ' in: "' + sk.evidence + '"') : h('div', { class: 'muted small-text' }, 'You added this skill.'),
              m.map.confidenceWhy ? h('div', { class: 'muted small-text' }, 'Confidence: ' + m.map.confidenceWhy) : null,
              links.length ? h('details', null, h('summary', null, 'Matching questions'), h('ul', null, links), h('p', { class: 'muted small-text' }, m.map.how)) : h('p', { class: 'muted small-text' }, 'No question in the bank mentions this yet. Nothing is made up for it.'));
          });
          fill(out, 
            h('div', { class: 'drill-filters three' }, h('div', null, h('label', { for: 'jd-role' }, 'Role'), roleSel), h('div', null, h('label', { for: 'jd-level' }, 'Gear'), lvlSel), h('div', null, h('label', { for: 'jd-add' }, 'Skills'), addSel)),
            h('p', { class: 'muted small-text' }, 'Heuristic estimate from the text, not a fact about the job: ' + (ex.seniority.signals.join(', ') || 'no seniority signals found') + '. Role guessed from the skills and the title. Check both above.'),
            h('p', { class: 'muted small-text' }, 'Untick a skill to drop it, or add one the posting needs. "Named" skills appear in the text; "inferred" ones are implied by a framework or service it names.'),
            ex.themes.length ? h('p', null, 'Likely interview themes: ' + ex.themes.join(', ') + '.') : null,
            ex.responsibilities.length ? h('details', null, h('summary', null, 'Responsibilities found (' + ex.responsibilities.length + ')'), h('ul', null, ex.responsibilities.map(function (r) { return h('li', null, r); }))) : null,
            h('h2', null, 'Skills (' + pl.maps.length + ')'), pl.maps.length ? h('ul', { class: 'plain-list' }, rows) : h('p', { class: 'muted' }, 'No known skills were found in this text. Add them from the list above.'),
            pl.uncovered.length ? h('p', { class: 'notice' }, 'Not covered by the bank: ' + pl.uncovered.map(function (m) { return m.name; }).join(', ') + '.') : null,
            h('h2', null, 'Interview focus checklist'), h('ul', null, pl.checklist.map(function (c) { return h('li', null, c); })),
            pl.modules && pl.modules.length ? h('div', null, h('h3', null, 'Practise these skills'), h('ul', { class: 'plain-list' }, pl.modules.map(function (m) { return h('li', null, h('a', { href: m.href }, m.label), h('span', { class: 'muted small-text' }, ' · ' + m.why)); }))) : null,
            h('div', { class: 'q-actions' },
              h('button', { class: 'btn primary', type: 'button', onclick: function () {
                const cur = store.get('plan', {});
                if (cur.profile && !confirm('Replace your current plan profile with this one? Your progress is kept.')) return;
                const res = PL.validateProfile({ role: role, level: level, company: jd.company, minutes: (cur.profile && cur.profile.minutes) || 45, weakTopics: pl.maps.map(function (m) { return m.name; }), createdDay: day }, day);
                if (!res.ok) { msg.textContent = res.errors.join(' '); msg.hidden = false; return; }
                store.set('plan', Object.assign({}, cur, { profile: res.profile, skipped: {} }));
                msg.className = 'notice ok'; msg.textContent = 'Plan updated. Open the Plan tab to see today\'s tasks.'; msg.hidden = false;
              } }, 'Create study plan'),
              h('a', { class: 'btn', href: '#/mock?role=' + pl.mock.role + '&level=' + pl.mock.level }, 'Start a mock for this role'),
              h('button', { class: 'btn', type: 'button', onclick: function () {
                const n = (store.get('jds', []) || []).filter(function (x) { return x.text !== jd.text; });
                n.unshift({ title: jd.title, company: jd.company, url: jd.url, text: jd.text, skills: Object.keys(kept), role: role, level: level, day: day });
                store.set('jds', n.slice(0, 10)); msg.className = 'notice ok'; msg.textContent = 'Saved on this device.'; msg.hidden = false;
              } }, 'Save analysis'),
              h('button', { class: 'btn', type: 'button', onclick: function () {
                store.set('jdTarget', { title: jd.title || 'Untitled role', company: jd.company || '', skills: Object.keys(kept), role: role, level: level, day: day });
                msg.className = 'notice ok'; msg.textContent = 'Set as your target job. Its skills now appear on the Readiness page.'; msg.hidden = false;
              } }, 'Use as my target job'),
              aiButton(u, 'AI: likely interview themes', 'The job description text you pasted will be sent to the AI provider.', function () { return { system: JD.AI_SYSTEM, prompt: JD.aiPrompt(jd.text, jd) }; }, aiOut, aiMsg),
              h('button', { class: 'btn ghost', type: 'button', onclick: function () { form(jd); } }, 'Edit text')),
            msg, aiMsg, aiOut);
        }
        fill(root, h('h1', null, jd.title || 'Analysis'), jd.company || jd.url ? h('p', { class: 'muted' }, jd.company || '', jd.url ? h('span', null, ' ', h('a', { href: jd.url, rel: 'noopener noreferrer', target: '_blank' }, 'Original posting')) : null) : null,
          h('details', null, h('summary', null, 'Source text (what was analyzed)'), h('p', { class: 'userq plain' }, jd.text)), out);
        paint();
      }
    }
  };

  /* ================= System design workspace ================= */
  IGU.routes.design = {
    title: 'System design',
    render: function (params) {
      const u = ui(), h = u.h, store = u.store, app = u.app;
      const id = params.get('p');
      const problem = IGU.designProblems.filter(function (p) { return p.id === id; })[0];
      const root = h('div', { class: 'plan-page' });
      fill(app, root);
      if (!problem) { index(); return; }
      workspace(problem);

      function index() {
        const all = store.get('designs', {});
        fill(root, h('h1', null, 'System design'),
          h('p', { class: 'lede' }, 'Guided design exercises. Each gives clarifying questions and scale hints, a place to write your design, a fixed self-review, and a staged reference you reveal only when you choose. Works without an AI key.'),
          h('ul', { class: 'design-list' }, IGU.designProblems.map(function (p) {
            const ws = all[p.id], started = ws && DS.SECTIONS.some(function (s) { return String(ws.sections && ws.sections[s.id] || '').trim(); });
            return h('li', null, h('a', { href: '#/design?p=' + p.id }, h('strong', null, p.title)), h('div', { class: 'muted small-text' }, p.summary), started ? h('span', { class: 'pill conf-medium' }, 'in progress') : null);
          })));
      }

      function workspace(p) {
        const all = store.get('designs', {});
        const ws = DS.clean(all[p.id], p.id);
        const status = h('span', { class: 'muted small-text', role: 'status', 'aria-live': 'polite' }, ws.updatedAt ? 'Saved' : '');
        let timer = null;
        const persist = function () {
          ws.updatedAt = new Date().toISOString();
          const cur = store.get('designs', {}); cur[p.id] = ws; store.set('designs', cur);
          status.textContent = 'Saved'; u.touchActivity();
          if (typeof paintRef === 'function') paintRef();
          if (typeof paintSteps === 'function') paintSteps();
        };
        const later = function () { status.textContent = 'Saving...'; clearTimeout(timer); timer = setTimeout(persist, 400); };
        u.setCleanup(function () { clearTimeout(timer); });

        const tick = function (kind, texts) {
          return h('ul', { class: 'plain-list' }, texts.map(function (t, i) {
            const k = kind + i;
            return h('li', null, h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !!ws.checks[k], onchange: function (ev) { if (ev.target.checked) ws.checks[k] = 1; else delete ws.checks[k]; later(); } }), ' ' + t));
          }));
        };
        const areas = DS.SECTIONS.map(function (s) {
          const t = h('textarea', { id: 'ds-' + s.id, rows: s.id === 'outline' ? '6' : '5', maxlength: '6000' }); t.value = ws.sections[s.id];
          t.addEventListener('input', function () { ws.sections[s.id] = t.value; later(); });
          return field(h, 'ds-' + s.id, s.label, t, s.hint);
        });
        const diagram = h('textarea', { id: 'ds-diagram', rows: '6', maxlength: '3000', placeholder: 'One connection per line, e.g.\nClient -> Load balancer: HTTPS\nLoad balancer -> API service' }); diagram.value = ws.diagram;
        const flowOut = h('div', { 'aria-live': 'polite' });
        const paintFlow = function () {
          const parsed = DS.parseFlows(ws.diagram);
          fill(flowOut, 
            parsed.bad.length ? h('p', { class: 'notice' }, 'Could not read line' + (parsed.bad.length === 1 ? ' ' : 's ') + parsed.bad.join(', ') + '. Use "A -> B: label".') : null,
            parsed.edges.length ? h('ul', null, parsed.edges.map(function (e) { return h('li', null, parsed.nodes[e.from] + ' → ' + parsed.nodes[e.to] + (e.label ? ' (' + e.label + ')' : '')); })) : h('p', { class: 'muted small-text' }, 'No connections yet.'),
            parsed.nodes.length ? diagramSvg(parsed) : null,
            parsed.nodes.length ? h('div', { class: 'q-actions' },
              h('button', { class: 'btn small', type: 'button', onclick: function () { download('design-' + p.id + '.svg', new XMLSerializer().serializeToString(diagramSvg(parsed)), 'image/svg+xml'); } }, 'Download diagram (.svg)'),
              h('button', { class: 'btn small ghost', type: 'button', onclick: function () { download('design-' + p.id + '.mmd', DS.toMermaid(parsed), 'text/plain'); } }, 'Download Mermaid')) : null,
            parsed.nodes.length ? h('details', null, h('summary', null, 'Mermaid code'), h('pre', { class: 'code' }, DS.toMermaid(parsed))) : null);
        };
        /* Diagram preview drawn as SVG with DOM calls (no innerHTML); text is set as text nodes. */
        function diagramSvg(parsed) {
          const L = DS.layout(parsed), NS = 'http://www.w3.org/2000/svg';
          const el = function (tag, attrs, text) { const x = document.createElementNS(NS, tag); Object.keys(attrs).forEach(function (k) { x.setAttribute(k, String(attrs[k])); }); if (text) x.textContent = text; return x; };
          const svg = el('svg', { xmlns: NS, viewBox: '0 0 ' + L.width + ' ' + L.height, width: L.width, height: L.height, role: 'img', class: 'ds-svg', 'aria-label': 'Diagram: ' + parsed.edges.map(function (e) { return parsed.nodes[e.from] + ' to ' + parsed.nodes[e.to]; }).join(', ') });
          const defs = el('defs', {}); const mk = el('marker', { id: 'arrow-' + p.id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
          mk.appendChild(el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#5b6475' })); defs.appendChild(mk); svg.appendChild(defs);
          L.edges.forEach(function (e) {
            const a = L.nodes[e.from], b = L.nodes[e.to];
            const x1 = a.x + L.nodeW, y1 = a.y + L.nodeH / 2, x2 = b.x, y2 = b.y + L.nodeH / 2;
            const back = x2 <= x1;
            const d = back ? 'M ' + (a.x + L.nodeW / 2) + ' ' + (a.y + L.nodeH) + ' C ' + (a.x + L.nodeW / 2) + ' ' + (a.y + L.nodeH + 30) + ', ' + (b.x + L.nodeW / 2) + ' ' + (b.y + L.nodeH + 30) + ', ' + (b.x + L.nodeW / 2) + ' ' + (b.y + L.nodeH)
              : 'M ' + x1 + ' ' + y1 + ' C ' + (x1 + 30) + ' ' + y1 + ', ' + (x2 - 30) + ' ' + y2 + ', ' + x2 + ' ' + y2;
            svg.appendChild(el('path', { d: d, fill: 'none', stroke: '#5b6475', 'stroke-width': 1.5, 'marker-end': 'url(#arrow-' + p.id + ')' }));
            if (e.label && !back) svg.appendChild(el('text', { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 6, 'text-anchor': 'middle', 'font-size': 11, fill: '#5b6475' }, e.label.slice(0, 22)));
          });
          L.nodes.forEach(function (n) {
            svg.appendChild(el('rect', { x: n.x, y: n.y, width: L.nodeW, height: L.nodeH, rx: 8, fill: '#ffffff', stroke: '#1d2433', 'stroke-width': 1.5 }));
            svg.appendChild(el('text', { x: n.x + L.nodeW / 2, y: n.y + L.nodeH / 2 + 4, 'text-anchor': 'middle', 'font-size': 13, fill: '#1d2433' }, n.name.length > 20 ? n.name.slice(0, 19) + '…' : n.name));
          });
          return svg;
        }
        diagram.addEventListener('input', function () { ws.diagram = diagram.value; paintFlow(); later(); });

        const reviewOut = h('div', { 'aria-live': 'polite' });
        const refOut = h('div', { 'aria-live': 'polite' });
        const paintRef = function () {
          const written = DS.SECTIONS.reduce(function (n, s) { return n + ws.sections[s.id].trim().length; }, 0);
          fill(refOut, 
            ws.revealed ? h('div', null, p.reference.slice(0, ws.revealed).map(function (st, i) { return h('section', { class: 'ref-stage' }, h('h3', null, (i + 1) + '. ' + st.stage), h('ul', null, st.points.map(function (x) { return h('li', null, x); }))); })) : null,
            ws.revealed < p.reference.length ? h('div', null,
              h('button', { class: 'btn', type: 'button', disabled: written < 80, onclick: function () { ws.revealed++; persist(); paintRef(); } }, (ws.revealed ? 'Reveal next stage' : 'Reveal first stage') + ' (' + (ws.revealed + 1) + ' of ' + p.reference.length + ')'),
              written < 80 ? h('p', { class: 'muted small-text' }, 'Write some of your own design first (at least a few sentences). The reference is talking points, not the one right answer.') : null)
              : h('p', { class: 'muted small-text' }, 'All stages revealed. AI-drafted talking points, not yet reviewed by a person.'));
        };
        /* Checkpoints: the steps of a design interview, ticked as the workspace fills in. */
        const stepsOut = h('ol', { class: 'ds-steps', 'aria-label': 'Design steps' });
        const paintSteps = function () {
          fill(stepsOut, DS.steps(ws).map(function (st) { return h('li', { class: st.done ? 'done' : '' }, h('span', { class: 'sr-only' }, st.done ? 'Done: ' : 'To do: '), st.label); }));
        };

        /* Editable capacity assumptions with the arithmetic shown. */
        const calcOut = h('div', { 'aria-live': 'polite' });
        const aIn = {};
        const cur = ws.assumptions || DS.cleanAssumptions({});
        const calcFields = DS.ASSUMPTION_FIELDS.map(function (f) {
          const inp = h('input', { id: 'as-' + f.id, type: 'number', min: String(f.min), max: String(f.max), step: 'any', inputmode: 'decimal', value: String(cur[f.id]) });
          aIn[f.id] = inp;
          inp.addEventListener('input', function () { readCalc(); later(); });
          return field(h, 'as-' + f.id, f.label, inp);
        });
        const readCalc = function () {
          const a = {}; Object.keys(aIn).forEach(function (k) { a[k] = aIn[k].value; });
          ws.assumptions = DS.cleanAssumptions(a); ws.assumptionsSet = true;
          fill(calcOut, h('ul', null, DS.estimate(ws.assumptions).lines.map(function (l) { return h('li', null, l); })));
        };
        const copyCalc = h('button', { class: 'btn small', type: 'button', onclick: function () {
          readCalc();
          const t = document.getElementById('ds-estimation');
          const add = DS.estimate(ws.assumptions).lines.join('\n');
          ws.sections.estimation = (ws.sections.estimation.trim() ? ws.sections.estimation.trim() + '\n' : '') + add;
          if (t) t.value = ws.sections.estimation;
          persist();
        } }, 'Add these numbers to my estimate');

        /* Failure scenarios. */
        const failures = DS.FAILURES.map(function (f) {
          const t = h('textarea', { id: 'fail-' + f.id, rows: '3', maxlength: '1500', placeholder: 'What users see, how you detect it, how you recover.' });
          t.value = (ws.failures && ws.failures[f.id]) || '';
          t.addEventListener('input', function () { ws.failures = ws.failures || {}; if (t.value.trim()) ws.failures[f.id] = t.value; else delete ws.failures[f.id]; later(); });
          return h('details', { class: 'ds-fail', open: !!t.value.trim() }, h('summary', null, f.label), h('p', { class: 'muted small-text' }, f.prompt), h('label', { for: 'fail-' + f.id, class: 'sr-only' }, f.label), t);
        });

        const related = DS.relatedQuestions(u.bank, p);
        fill(root, 
          h('p', null, h('a', { href: '#/design' }, '← All problems')),
          h('h1', null, p.title), h('p', { class: 'lede' }, p.summary),
          h('section', { class: 'ds-steps-wrap' }, h('h2', { class: 'sr-only' }, 'Steps'), stepsOut),
          h('section', null, h('h2', null, 'Clarify requirements'), h('p', { class: 'muted small-text' }, 'Tick the questions you would ask the interviewer, and write the answers you assume.'),
            h('h3', null, 'Functional'), tick('f', p.functional), h('h3', null, 'Non-functional'), tick('n', p.nonfunctional),
            h('h3', null, 'Scale hints'), h('ul', null, p.constraints.map(function (c) { return h('li', null, c); })),
            h('details', null, h('summary', null, 'Estimation hints'), h('ul', null, p.estimate.map(function (c) { return h('li', null, c); })))),
          h('section', null, h('h2', null, 'Capacity calculator'),
            h('p', { class: 'muted small-text' }, 'Change the assumptions to match what the interviewer told you. The arithmetic is shown so you can say it out loud.'),
            h('div', { class: 'plan-form ds-calc' }, calcFields), calcOut, copyCalc),
          h('section', null, h('h2', null, 'Your design'), h('div', { class: 'plan-form' }, areas),
            h('h3', null, 'Components and flow'), field(h, 'ds-diagram', 'Connections', diagram, '(text diagram, exports to Mermaid and SVG)'), flowOut, status),
          h('section', null, h('h2', null, 'Failure scenarios'), h('p', { class: 'muted small-text' }, 'Interviewers probe what happens when things break. Answer at least three.'), failures),
          h('div', { class: 'q-actions' },
            h('button', { class: 'btn primary', type: 'button', onclick: function () {
              persist();
              const r = DS.review(ws, p);
              fill(reviewOut, h('h2', null, 'Self-review: ' + r.band + ' (' + r.total + ' of ' + r.max + ')'), h('p', { class: 'muted small-text' }, 'A fixed rubric on whether each part was addressed. It cannot judge whether the design is good.'), rubricTable(h, r.dims, DS.LEVELS, 'Design review rubric'));
            } }, 'Review my design'),
            h('button', { class: 'btn', type: 'button', onclick: function () { persist(); download('design-' + p.id + '.md', DS.toMarkdown(ws, p), 'text/markdown'); } }, 'Export (.md)'),
            h('button', { class: 'btn', type: 'button', onclick: function () { persist(); window.print(); } }, 'Print or save as PDF'),
            h('button', { class: 'btn ghost', type: 'button', onclick: function () {
              if (!confirm('Clear everything you wrote for this problem?')) return;
              const cur = store.get('designs', {}); delete cur[p.id]; store.set('designs', cur); u.render();
            } }, 'Clear workspace')),
          reviewOut,
          h('section', null, h('h2', null, 'Reference (revealed in stages)'), refOut),
          related.length ? h('section', null, h('h2', null, 'Related questions'), h('ul', null, related.map(function (e) { return h('li', null, h('a', { href: '#/q/' + e.id }, e.q), Q.isReal(e) ? '' : h('span', { class: 'muted small-text' }, ' (answer pending)')); }))) : null);
        paintFlow(); paintRef(); paintSteps();
        if (ws.assumptionsSet) readCalc(); else fill(calcOut, h('ul', null, DS.estimate(cur).lines.map(function (l) { return h('li', null, l); })));
      }
    }
  };
})();
