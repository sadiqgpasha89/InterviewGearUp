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
      h('tbody', null, dims.map(function (d) { return h('tr', null, h('th', { scope: 'row' }, d.label), h('td', { class: 'lv l' + d.level }, labels[d.level]), h('td', null, d.note)); })));
  };

  /* A button that asks an AI provider (only after explicit confirmation of what is sent) and shows the reply in `out`. */
  function aiButton(u, label, sendNote, build, out, msg) {
    const h = u.h;
    const btn = h('button', { class: 'btn small', type: 'button' }, u.aiAvailable() ? label : 'Add API key for AI feedback');
    btn.addEventListener('click', async function () {
      if (!u.aiAvailable()) { u.openSettings(); return; }
      if (!confirm(sendNote + '\n\nIt is sent to your AI provider using your own key and may be billed to you. Continue?')) return;
      btn.disabled = true; msg.hidden = true; btn.textContent = 'Asking AI...';
      try {
        const b = build();
        const res = await IGU.ai.ask({ settings: u.store.get('settings', {}), system: b.system, prompt: b.prompt });
        fill(out, h('p', { class: 'muted small-text' }, 'AI output from a language model. A study aid, not a rating or a prediction of any interview or hiring decision.'), u.md(res.text));
        out.hidden = false; btn.textContent = 'Ask again';
      } catch (e) { msg.textContent = e.message; msg.hidden = false; btn.textContent = 'Try again'; }
      btn.disabled = false;
    });
    return btn;
  }

  /* ================= Behavioral stories ================= */
  IGU.routes.stories = {
    title: 'Behavioral stories',
    render: function () {
      const u = ui(), h = u.h, store = u.store, app = u.app;
      const load = function () { return (store.get('stories', []) || []).map(function (s) { return ST.clean(s).story; }); };
      const save = function (list) { store.set('stories', list.slice(0, ST.MAX_STORIES)); };
      let query = '', tag = '';
      const root = h('div', { class: 'plan-page' });
      fill(app, root);
      list();

      function list() {
        const stories = load();
        const cov = ST.coverage(stories);
        const shown = ST.search(stories, query, tag);
        const qIn = h('input', { id: 'st-q', type: 'search', placeholder: 'Search your stories', value: query, 'aria-label': 'Search your stories', oninput: function () { query = qIn.value; paintList(); } });
        const tagSel = h('select', { id: 'st-tag', 'aria-label': 'Filter by tag', onchange: function () { tag = tagSel.value; paintList(); } }, [h('option', { value: '' }, 'All tags')].concat(ST.TAGS.map(function (t) { return h('option', { value: t }, t); })));
        tagSel.value = tag;
        const results = h('div', { 'aria-live': 'polite' });
        function paintList() {
          const rows = ST.search(load(), query, tag);
          fill(results, rows.length ? h('ul', { class: 'story-list' }, rows.map(function (s) {
            const c = ST.completeness(s);
            return h('li', null,
              h('div', { class: 'story-h' }, h('strong', null, s.title), ' ', h('span', { class: 'muted small-text' }, c.complete ? 'complete' : 'draft: missing ' + c.missing.join(', '))),
              h('div', { class: 'muted small-text' }, s.tags.join(', ') || 'no tags'),
              h('div', { class: 'q-actions' },
                h('button', { class: 'btn small', type: 'button', onclick: function () { edit(s); } }, 'Edit'),
                h('button', { class: 'btn small ghost', type: 'button', onclick: function () { download('story-' + s.id + '.md', ST.toMarkdown(s), 'text/markdown'); } }, 'Export'),
                h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Delete ' + s.title, onclick: function () {
                  if (!confirm('Delete "' + s.title + '"? This cannot be undone.')) return;
                  save(load().filter(function (x) { return x.id !== s.id; })); list();
                } }, 'Delete')));
          })) : h('p', { class: 'muted' }, stories.length ? 'No stories match this search.' : 'No stories yet. Write your first from a real experience; the site never writes one for you.'));
        }
        fill(root, 
          h('h1', null, 'Behavioral stories'),
          h('p', { class: 'lede' }, 'Keep your own experiences as reusable stories and match them to questions. They stay in this browser unless you ask an AI provider for feedback on one.'),
          h('div', { class: 'tag-cov', role: 'group', 'aria-label': 'Story coverage by tag' }, ST.TAGS.map(function (t) {
            return h('span', { class: 'chip' + (cov.by[t] ? ' on' : '') }, t + ': ' + cov.by[t]);
          })),
          cov.uncovered.length ? h('p', { class: 'muted small-text' }, 'No story yet for: ' + cov.uncovered.join(', ') + '.') : h('p', { class: 'notice ok' }, 'Every tag has at least one story.'),
          h('div', { class: 'q-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: function () { edit(null); } }, 'New story')),
          h('div', { class: 'drill-filters' }, h('div', null, h('label', { for: 'st-q', class: 'sr-only' }, 'Search'), qIn), h('div', null, h('label', { for: 'st-tag', class: 'sr-only' }, 'Tag'), tagSel)),
          results, practice(stories));
        paintList();
      }

      function practice(stories) {
        const prompts = ST.behavioralQuestions(u.bank).map(function (e) { return { id: e.id, q: e.q }; }).concat(ST.PROMPTS);
        const sel = h('select', { id: 'st-prompt', 'aria-label': 'Practice question' }, prompts.map(function (p) { return h('option', { value: p.id }, p.q); }));
        const out = h('div', { 'aria-live': 'polite' });
        const show = function () {
          const p = prompts.filter(function (x) { return x.id === sel.value; })[0];
          const m = ST.storiesFor(load(), p);
          fill(out, h('p', { class: 'drill-q' }, p.q),
            m.length ? h('div', null, h('p', { class: 'muted small-text' }, 'Your stories that fit (' + (m.some(function (x) { return x.linked; }) ? 'linked first, then matching tags' : 'matching tags') + '). Answer out loud from your own notes.'),
              h('ul', { class: 'plain-list' }, m.map(function (x) { return h('li', null, h('button', { class: 'linkish', type: 'button', onclick: function () { edit(x.story); } }, x.story.title), x.linked ? ' (linked)' : ' (tags: ' + x.story.tags.join(', ') + ')'); })))
              : h('p', { class: 'muted' }, 'None of your stories match yet. Write one from a real experience; the site will not invent one for you.'));
        };
        sel.addEventListener('change', show);
        return h('section', { class: 'mock-history' }, h('h2', null, 'Practise a question'),
          h('label', { for: 'st-prompt', class: 'sr-only' }, 'Question'), sel,
          h('div', { class: 'q-actions' }, h('button', { class: 'btn', type: 'button', onclick: function () { sel.selectedIndex = Math.floor(Math.random() * prompts.length); show(); } }, 'Random question'), h('button', { class: 'btn ghost', type: 'button', onclick: show }, 'Show matching stories')), out);
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
          fill(notesEl, n.length ? h('div', null, h('h3', null, 'Suggestions'), h('ul', null, n.map(function (x) { return h('li', null, x); }))) : h('p', { class: 'notice ok' }, 'Nothing to flag. Read it aloud and time it: aim for about two minutes.'));
        };
        fill(root, h('h1', null, existing ? 'Edit story' : 'New story'),
          h('p', { class: 'lede' }, 'Write from your real experience. Use "I" for what you did and credit your team separately.'),
          h('form', { class: 'plan-form', novalidate: true, onsubmit: function (ev) {
            ev.preventDefault();
            const r = gather();
            if (r.problems.length) { err.textContent = r.problems.join(' '); err.hidden = false; return; }
            r.story.updatedAt = new Date().toISOString();
            const all = load().filter(function (x) { return x.id !== r.story.id; });
            save([r.story].concat(all)); u.touchActivity(); list();
          } },
            err, field(h, 'st-title', 'Title', title, '(for you, e.g. "Checkout outage during the sale")'),
            h('fieldset', null, h('legend', null, 'Tags'), h('div', { class: 'chk-grid' }, tagBoxes)),
            area('situation', 'Situation', 'Context in two or three sentences.'), area('task', 'Task', 'What you were responsible for.'),
            area('action', 'Action', 'What YOU did, step by step.', 5), area('result', 'Result', 'The outcome, with numbers if you have them.'),
            area('metrics', 'Impact and metrics', '(optional)', 2), area('lessons', 'Lessons', '(optional) what you learned or would change.'),
            h('details', null, h('summary', null, 'Link to questions (' + qs.length + ')'), h('div', { class: 'chk-list' }, qBoxes)),
            h('div', { class: 'formfoot' }, h('button', { class: 'btn primary', type: 'submit' }, 'Save story'),
              h('button', { class: 'btn', type: 'button', onclick: check }, 'Check my story'),
              aiButton(u, 'AI feedback', 'This story text (title, situation, task, action, result, metrics, lessons) will be sent to the AI provider. Do not include confidential details.',
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
            parsed.nodes.length ? h('details', null, h('summary', null, 'Mermaid code'), h('pre', { class: 'code' }, DS.toMermaid(parsed))) : null);
        };
        diagram.addEventListener('input', function () { ws.diagram = diagram.value; paintFlow(); later(); });

        const reviewOut = h('div', { 'aria-live': 'polite' });
        const refOut = h('div', { 'aria-live': 'polite' });
        const paintRef = function () {
          const written = DS.SECTIONS.reduce(function (n, s) { return n + ws.sections[s.id].trim().length; }, 0);
          fill(refOut, 
            ws.revealed ? h('div', null, p.reference.slice(0, ws.revealed).map(function (st, i) { return h('section', { class: 'ref-stage' }, h('h3', null, (i + 1) + '. ' + st.stage), h('ul', null, st.points.map(function (x) { return h('li', null, x); }))); })) : null,
            ws.revealed < p.reference.length ? h('div', null,
              h('button', { class: 'btn', type: 'button', disabled: written < 80, onclick: function () { ws.revealed++; persist(); paintRef(); } }, ws.revealed ? 'Reveal next stage' : 'Reveal first stage'),
              written < 80 ? h('p', { class: 'muted small-text' }, 'Write some of your own design first (at least a few sentences). The reference is talking points, not the one right answer.') : null)
              : h('p', { class: 'muted small-text' }, 'All stages revealed. AI-drafted talking points, not yet reviewed by a person.'));
        };
        const related = DS.relatedQuestions(u.bank, p);
        fill(root, 
          h('p', null, h('a', { href: '#/design' }, '← All problems')),
          h('h1', null, p.title), h('p', { class: 'lede' }, p.summary),
          h('section', null, h('h2', null, 'Clarify requirements'), h('p', { class: 'muted small-text' }, 'Tick the questions you would ask the interviewer, and write the answers you assume.'),
            h('h3', null, 'Functional'), tick('f', p.functional), h('h3', null, 'Non-functional'), tick('n', p.nonfunctional),
            h('h3', null, 'Scale hints'), h('ul', null, p.constraints.map(function (c) { return h('li', null, c); })),
            h('details', null, h('summary', null, 'Estimation hints'), h('ul', null, p.estimate.map(function (c) { return h('li', null, c); })))),
          h('section', null, h('h2', null, 'Your design'), h('div', { class: 'plan-form' }, areas),
            h('h3', null, 'Components and flow'), field(h, 'ds-diagram', 'Connections', diagram, '(text diagram, exports to Mermaid)'), flowOut, status),
          h('div', { class: 'q-actions' },
            h('button', { class: 'btn primary', type: 'button', onclick: function () {
              persist();
              const r = DS.review(ws, p);
              fill(reviewOut, h('h2', null, 'Self-review: ' + r.band + ' (' + r.total + ' of ' + r.max + ')'), h('p', { class: 'muted small-text' }, 'A fixed rubric on whether each part was addressed. It cannot judge whether the design is good.'), rubricTable(h, r.dims, DS.LEVELS, 'Design review rubric'));
            } }, 'Review my design'),
            h('button', { class: 'btn', type: 'button', onclick: function () { persist(); download('design-' + p.id + '.md', DS.toMarkdown(ws, p), 'text/markdown'); } }, 'Export (.md)'),
            h('button', { class: 'btn ghost', type: 'button', onclick: function () {
              if (!confirm('Clear everything you wrote for this problem?')) return;
              const cur = store.get('designs', {}); delete cur[p.id]; store.set('designs', cur); u.render();
            } }, 'Clear workspace')),
          reviewOut,
          h('section', null, h('h2', null, 'Reference (revealed in stages)'), refOut),
          related.length ? h('section', null, h('h2', null, 'Related questions'), h('ul', null, related.map(function (e) { return h('li', null, h('a', { href: '#/q/' + e.id }, e.q), Q.isReal(e) ? '' : h('span', { class: 'muted small-text' }, ' (answer pending)')); }))) : null);
        paintFlow(); paintRef();
      }
    }
  };
})();
