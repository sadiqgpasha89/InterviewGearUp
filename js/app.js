/* InterviewGearUp UI. Hash routing, no framework. All dynamic text goes through h()/md(), which never use innerHTML. */
(function () {
  const IGU = window.IGU;
  const U = IGU.util, h = U.h, md = U.md, store = U.store;
  const cfg = IGU.config, meta = IGU.meta, engine = IGU.engine;
  const bank = IGU.bank;
  const app = document.getElementById('app');
  const PAGE = 40;

  const roleName = function (id) { const r = meta.roles.filter(function (x) { return x.id === id; })[0]; return r ? r.name : 'Other'; };
  const roleId = function (name) { const r = meta.roles.filter(function (x) { return x.name === name; })[0]; return r ? r.id : 'other'; };
  const levelOf = function (n) { return meta.levels.filter(function (l) { return l.n === Number(n); })[0]; };
  const levelLabel = function (n) { const l = levelOf(n); return l ? l.n + ' ' + l.name + ' (' + l.years + ')' : ''; };
  const trim = function (s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  let cleanup = null; // called when leaving a route (timers etc.)

  /* ---------------- routing ---------------- */
  function parseRoute() {
    const raw = location.hash.replace(/^#/, '') || '/questions';
    const parts = raw.split('?');
    return { seg: parts[0].split('/').filter(Boolean), params: new URLSearchParams(parts[1] || '') };
  }

  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

  function render() {
    if (cleanup) { cleanup(); cleanup = null; }
    const r = parseRoute();
    const tab = r.seg[0] === 'q' ? 'questions' : (r.seg[0] || 'questions');
    document.querySelectorAll('#tabs a').forEach(function (a) {
      if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    app.replaceChildren();
    const titles = { questions: 'Question bank', drill: 'Drill', community: 'Community', post: 'Post a question' };
    document.title = (titles[tab] || 'Question bank') + ' | InterviewGearUp';
    if (tab === 'drill') drillView();
    else if (tab === 'community') communityView(r.params);
    else if (tab === 'post') postView();
    else questionsView(r);
    if (!(r.seg[0] === 'q')) { window.scrollTo(0, 0); }
  }

  /* ---------------- shared pieces ---------------- */
  function gearBadge(n) { return h('span', { class: 'gear g' + n, title: 'Gear ' + n + ': ' + (levelOf(n) || {}).name }, String(n)); }

  function answerBody(e) {
    const f = document.createDocumentFragment();
    f.appendChild(h('div', { class: 'short' }, h('h4', null, 'In 30 seconds'), md(e.short)));
    f.appendChild(h('h4', null, 'Explained in depth'));
    f.appendChild(md(e.detail));
    if (e.follow && e.follow.length) {
      f.appendChild(h('h4', null, 'Likely follow-ups'));
      f.appendChild(h('ul', null, e.follow.map(function (x) { return h('li', null, x); })));
    }
    return f;
  }

  const done = {
    all: function () { return store.get('done', {}); },
    has: function (id) { return !!store.get('done', {})[id]; },
    toggle: function (id) { const d = store.get('done', {}); if (d[id]) delete d[id]; else d[id] = 1; store.set('done', d); return !!d[id]; }
  };

  function selectField(id, label, options, value, extra) {
    return h('div', null,
      h('label', { for: id }, label),
      h('select', { id: id }, options.map(function (o) {
        return h('option', { value: o.value, selected: String(o.value) === String(value) }, o.label);
      })),
      extra);
  }

  /* ---------------- question bank ---------------- */
  function questionsView(r) {
    const openId = r.seg[0] === 'q' ? r.seg[1] : null;
    const f = {
      role: r.params.get('role') || '',
      level: Number(r.params.get('level')) || 0,
      q: r.params.get('q') || '',
      limit: PAGE
    };
    const openEntry = openId ? bank.filter(function (e) { return e.id === openId; })[0] : null;

    function matches(e, skipRole) {
      if (!skipRole && f.role && e.role !== f.role) return false;
      if (f.level && e.level !== f.level) return false;
      if (f.q.trim()) {
        const hay = (e.q + ' ' + e.topic + ' ' + (e.tags || []).join(' ') + ' ' + e.short + ' ' + e.detail).toLowerCase();
        return f.q.toLowerCase().split(/\s+/).filter(Boolean).every(function (t) { return hay.indexOf(t) >= 0; });
      }
      return true;
    }

    const shifter = h('ol', { class: 'shifter', 'aria-label': 'Level' });
    const knob = h('span', { class: 'knob', 'aria-hidden': 'true' });
    const roleList = h('ul', { class: 'roles' });
    const list = h('div', { class: 'qlist' });
    const status = h('div', { class: 'status', 'aria-live': 'polite' });
    const more = h('div', { class: 'more' });
    const input = h('input', {
      type: 'search', id: 'search', value: f.q, autocomplete: 'off', placeholder: 'Search: caching, closures, Kubernetes, CAP theorem',
      'aria-label': 'Search questions',
      oninput: function () { f.q = input.value; f.limit = PAGE; sync(); paint(); }
    });

    function sync() {
      const p = new URLSearchParams();
      if (f.role) p.set('role', f.role);
      if (f.level) p.set('level', f.level);
      if (f.q.trim()) p.set('q', f.q.trim());
      const s = p.toString();
      history.replaceState(null, '', '#/questions' + (s ? '?' + s : ''));
    }

    function paintSide() {
      shifter.replaceChildren();
      const stops = [{ n: 0, name: 'All levels', years: 'Every gear' }].concat(meta.levels);
      stops.forEach(function (l) {
        shifter.appendChild(h('li', null, h('button', {
          type: 'button', 'aria-pressed': f.level === l.n ? 'true' : 'false',
          onclick: function () { f.level = l.n; f.limit = PAGE; sync(); paint(); }
        }, h('span', { class: 'detent' }, l.n ? String(l.n) : 'N'),
        h('span', null, h('span', { class: 'gname' }, l.name), h('span', { class: 'gyears' }, l.years)))));
      });
      knob.textContent = f.level ? String(f.level) : 'N';
      knob.style.setProperty('--i', String(f.level));
      shifter.appendChild(knob);

      roleList.replaceChildren();
      const all = [{ id: '', name: 'All roles' }].concat(meta.roles);
      all.forEach(function (ro) {
        const c = bank.filter(function (e) { return (!ro.id || e.role === ro.id) && matches(e, true); }).length;
        roleList.appendChild(h('li', null, h('button', {
          type: 'button', 'aria-pressed': f.role === ro.id ? 'true' : 'false',
          onclick: function () { f.role = ro.id; f.limit = PAGE; sync(); paint(); }
        }, h('span', null, ro.name), h('span', { class: 'count' }, String(c)))));
      });
    }

    function paintList() {
      const rows = bank.filter(function (e) { return matches(e, false); })
        .sort(function (a, b) { return a.level - b.level || a.id.localeCompare(b.id, undefined, { numeric: true }); });
      list.replaceChildren();
      more.replaceChildren();
      const shown = rows.slice(0, f.limit);
      if (openEntry && shown.indexOf(openEntry) < 0 && matches(openEntry, false)) shown.unshift(openEntry);
      shown.forEach(function (e) { list.appendChild(qRow(e, openEntry && e.id === openId)); });
      if (!rows.length) {
        list.appendChild(h('div', { class: 'empty' }, h('strong', null, 'No questions match.'),
          'Try fewer words or a different gear. Something missing? ',
          h('a', { href: '#/post' }, 'Post the question you were asked'), '.'));
      }
      if (rows.length > f.limit) {
        more.appendChild(h('button', { class: 'btn ghost', type: 'button', onclick: function () { f.limit += PAGE; paintList(); } },
          'Show ' + Math.min(PAGE, rows.length - f.limit) + ' more'));
      }
      paintStatus(rows);
    }

    /* Counts and progress. The bar width is set through the CSSOM because the page's
       Content Security Policy blocks inline style attributes. */
    function paintStatus(rows) {
      rows = rows || bank.filter(function (e) { return matches(e, false); });
      const d = done.all();
      const total = rows.length, doneN = rows.filter(function (e) { return d[e.id]; }).length;
      const fill = h('i');
      fill.style.width = (total ? Math.round(100 * doneN / total) : 0) + '%';
      status.replaceChildren(
        h('span', null, total + (total === 1 ? ' question' : ' questions')),
        total ? h('span', null, doneN + ' prepared') : null,
        total ? h('span', { class: 'progress', role: 'img', 'aria-label': doneN + ' of ' + total + ' prepared' }, fill) : null);
    }

    function paint() { paintSide(); paintList(); }

    function qRow(e, open) {
      const mark = h('span', { class: 'done' + (done.has(e.id) ? ' on' : ''), title: 'Prepared' }, '✓');
      const d = h('details', { class: 'q', id: 'q-' + e.id, open: open },
        h('summary', null, gearBadge(e.level),
          h('div', null, h('div', { class: 'qt' }, e.q),
            h('div', { class: 'qm' }, h('span', null, roleName(e.role)), h('span', null, e.topic))),
          mark));
      function build() {
        if (d.dataset.built) return;
        d.dataset.built = '1';
        const prepared = h('button', { class: 'btn small', type: 'button' }, done.has(e.id) ? 'Prepared. Undo' : 'Mark as prepared');
        prepared.addEventListener('click', function () {
          const on = done.toggle(e.id);
          prepared.textContent = on ? 'Prepared. Undo' : 'Mark as prepared';
          mark.classList.toggle('on', on);
          paintStatus();
        });
        const copy = h('button', { class: 'btn small ghost', type: 'button' }, 'Copy link');
        copy.addEventListener('click', function () {
          const url = location.href.split('#')[0] + '#/q/' + e.id;
          const ok = function () { copy.textContent = 'Link copied'; };
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { location.hash = '#/q/' + e.id; });
          else location.hash = '#/q/' + e.id;
        });
        d.appendChild(h('div', { class: 'q-body' }, answerBody(e), h('div', { class: 'q-actions' }, prepared, copy)));
      }
      d.addEventListener('toggle', function () { if (d.open) build(); });
      if (open) build();
      return d;
    }

    app.appendChild(h('div', { class: 'bank' },
      h('aside', { class: 'side' },
        h('div', { class: 'block' }, h('h2', null, 'Gear'), shifter),
        h('div', { class: 'block' }, h('h2', null, 'Role'), roleList)),
      h('section', null,
        h('h1', null, 'Pick your gear'),
        h('p', { class: 'lede' }, 'Questions run from first gear (junior) to fourth (lead or staff). Open one for a 30-second answer, then the full explanation.'),
        openId && !openEntry ? h('p', { class: 'notice bad' }, 'That question link is not in the bank. Showing everything instead.') : null,
        h('div', { class: 'search' }, input),
        status, list, more)));
    paint();
    if (openEntry) {
      const el = document.getElementById('q-' + openId);
      if (el) setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 0);
    }
  }

  /* ---------------- drill ---------------- */
  function drillView() {
    const st = { role: '', level: 0, current: null, shown: false, t0: 0, timer: null, last: null };
    const stage = h('div');
    function pool() {
      return bank.filter(function (e) { return (!st.role || e.role === st.role) && (!st.level || e.level === st.level); });
    }
    function draw() {
      const p = pool();
      if (!p.length) { st.current = null; paint(); return; }
      const d = done.all();
      let fresh = p.filter(function (e) { return !d[e.id] && e.id !== st.last; });
      if (!fresh.length) fresh = p.filter(function (e) { return e.id !== st.last; });
      if (!fresh.length) fresh = p;
      st.current = fresh[Math.floor(Math.random() * fresh.length)];
      st.last = st.current.id;
      st.shown = false;
      st.t0 = Date.now();
      startTimer();
      paint();
    }
    function startTimer() {
      stopTimer();
      st.timer = setInterval(function () {
        const el = document.getElementById('timer');
        if (!el) return;
        const s = Math.floor((Date.now() - st.t0) / 1000);
        el.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        el.classList.toggle('late', s > 120);
      }, 500);
    }
    function stopTimer() { if (st.timer) { clearInterval(st.timer); st.timer = null; } }
    cleanup = stopTimer;

    function paint() {
      stage.replaceChildren();
      if (!st.current) {
        stage.appendChild(h('div', { class: 'drill-card' }, h('p', { class: 'muted' }, pool().length ? 'Press Draw a question to start.' : 'No questions in this selection. Pick another role or gear.'),
          h('div', { class: 'drill-row' }, h('button', { class: 'btn primary', type: 'button', disabled: !pool().length, onclick: draw }, 'Draw a question'))));
        return;
      }
      const e = st.current;
      const card = h('div', { class: 'drill-card' },
        h('div', { class: 'drill-row' }, gearBadge(e.level), h('span', { class: 'muted' }, roleName(e.role) + ', ' + e.topic), h('span', { class: 'grow' }),
          h('span', { class: 'timer', id: 'timer', role: 'timer', 'aria-label': 'Time spent' }, '0:00')),
        h('div', { class: 'drill-q' }, e.q),
        h('p', { class: 'muted' }, 'Answer out loud first. Aim for about two minutes, then reveal the answer and compare.'));
      if (!st.shown) {
        card.appendChild(h('div', { class: 'drill-row' },
          h('button', { class: 'btn primary', type: 'button', onclick: function () { st.shown = true; stopTimer(); paint(); } }, 'Reveal answer'),
          h('button', { class: 'btn ghost', type: 'button', onclick: draw }, 'Skip')));
      } else {
        const body = h('div', { class: 'q-body' }, answerBody(e));
        body.style.padding = '0';
        card.appendChild(body);
        card.appendChild(h('div', { class: 'q-actions' },
          h('button', { class: 'btn primary', type: 'button', onclick: function () { if (!done.has(e.id)) done.toggle(e.id); draw(); } }, 'I could answer this'),
          h('button', { class: 'btn', type: 'button', onclick: draw }, 'Needs more practice')));
      }
      stage.appendChild(card);
    }

    const roleSel = h('select', { id: 'd-role', onchange: function () { st.role = roleSel.value; st.current = null; stopTimer(); paint(); } },
      [h('option', { value: '' }, 'All roles')].concat(meta.roles.map(function (r) { return h('option', { value: r.id }, r.name); })));
    const lvlSel = h('select', { id: 'd-level', onchange: function () { st.level = Number(lvlSel.value); st.current = null; stopTimer(); paint(); } },
      [h('option', { value: '0' }, 'All gears')].concat(meta.levels.map(function (l) { return h('option', { value: String(l.n) }, l.n + ' ' + l.name); })));

    app.appendChild(h('div', { class: 'drill' },
      h('h1', null, 'Drill'),
      h('p', { class: 'lede' }, 'Random questions with a timer, for practising answers out loud. Questions you mark as prepared come up less often.'),
      h('div', { class: 'drill-filters' }, h('div', null, h('label', { for: 'd-role' }, 'Role'), roleSel), h('div', null, h('label', { for: 'd-level' }, 'Gear'), lvlSel)),
      stage));
    paint();
  }

  /* ---------------- profile and posting ---------------- */
  const posts = {
    all: function () { return store.get('posts', []); },
    save: function (list) { store.set('posts', list); }
  };

  function postView() {
    const profile = store.get('profile', null);
    const wrap = h('div', { class: 'narrow' });
    app.appendChild(wrap);
    wrap.appendChild(h('h1', null, 'Post a question'));

    if (!profile) {
      wrap.appendChild(h('p', { class: 'lede' }, 'Register once to post. Your profile lives in this browser; the name you choose appears next to your posts.'));
      const name = h('input', { id: 'r-name', maxlength: '40', required: true, autocomplete: 'nickname' });
      const gh = h('input', { id: 'r-gh', maxlength: '39', autocomplete: 'off', placeholder: 'optional' });
      const err = h('p', { class: 'notice bad', hidden: true });
      err.hidden = true;
      wrap.appendChild(h('form', {
        onsubmit: function (ev) {
          ev.preventDefault();
          const n = name.value.trim(), g = gh.value.trim().replace(/^@/, '');
          if (n.length < 2) { err.textContent = 'Enter a display name of at least 2 characters.'; err.hidden = false; return; }
          if (g && !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(g)) { err.textContent = 'That does not look like a GitHub username.'; err.hidden = false; return; }
          store.set('profile', { name: n, gh: g, at: new Date().toISOString() });
          render();
        }
      },
      err,
      h('label', { for: 'r-name' }, 'Display name'), name,
      h('label', { for: 'r-gh' }, 'GitHub username ', h('span', { class: 'hint' }, '(lets you share posts with everyone)')), gh,
      h('div', { class: 'formfoot' }, h('button', { class: 'btn primary', type: 'submit' }, 'Register'))));
      return;
    }

    wrap.appendChild(h('p', { class: 'lede' }, 'Share a question you were asked. You get an answer draft straight away; share it to the community board so others preparing for the same company can see it.'));
    wrap.appendChild(h('p', { class: 'muted' }, 'Posting as ', h('strong', null, profile.name), '. ',
      h('button', { class: 'btn small ghost', type: 'button', onclick: function () { store.set('profile', null); render(); } }, 'Switch profile')));

    const err = h('p', { class: 'notice bad', hidden: true });
    const company = h('input', { id: 'p-company', maxlength: '60', required: true, list: 'p-companies', autocomplete: 'off' });
    const companies = h('datalist', { id: 'p-companies' });
    const known = {};
    posts.all().forEach(function (p) { known[p.company] = 1; });
    Object.keys(known).forEach(function (c) { companies.appendChild(h('option', { value: c })); });
    const year = h('input', { id: 'p-year', type: 'number', min: '2000', max: String(new Date().getFullYear()), value: String(new Date().getFullYear()) });
    const roleSel = h('select', { id: 'p-role' }, meta.roles.map(function (r) { return h('option', { value: r.id }, r.name); }));
    const lvlSel = h('select', { id: 'p-level' }, meta.levels.map(function (l) { return h('option', { value: String(l.n), selected: l.n === 2 }, levelLabel(l.n)); }));
    const domSel = h('select', { id: 'p-domain' }, meta.domains.map(function (d) { return h('option', { value: d }, d); }));
    const roundSel = h('select', { id: 'p-round' }, meta.rounds.map(function (d) { return h('option', { value: d }, d); }));
    const question = h('textarea', { id: 'p-question', maxlength: '1500', required: true, placeholder: 'Write the question as it was asked, including any constraints the interviewer gave.' });
    const answer = h('textarea', { id: 'p-answer', maxlength: '2500', placeholder: 'Optional. If you add one, you also get feedback on it.' });
    const btn = h('button', { class: 'btn primary', type: 'submit' }, 'Post and generate answer');

    wrap.appendChild(h('form', {
      onsubmit: async function (ev) {
        ev.preventDefault();
        const q = question.value.trim();
        if (company.value.trim().length < 2) { err.textContent = 'Enter the company name.'; err.hidden = false; return; }
        if (q.length < 15) { err.textContent = 'Write the full question (at least 15 characters).'; err.hidden = false; return; }
        const p = {
          id: 'local-' + U.uid(), createdAt: new Date().toISOString(),
          author: { name: profile.name, gh: profile.gh },
          company: company.value.trim(), role: roleSel.value, level: Number(lvlSel.value),
          domain: domSel.value, round: roundSel.value, year: Number(year.value) || new Date().getFullYear(),
          question: q, answer: answer.value.trim()
        };
        p.roleName = roleName(p.role);
        p.gen = engine.generate({ question: p.question, role: p.role, level: p.level, company: p.company, domain: p.domain, round: p.round, answer: p.answer }, bank);
        btn.disabled = true;
        posts.save([p].concat(posts.all()));
        go('#/community?open=' + encodeURIComponent(p.id));
      }
    },
    err,
    h('div', { class: 'row2' },
      h('div', null, h('label', { for: 'p-company' }, 'Company'), company, companies),
      h('div', null, h('label', { for: 'p-year' }, 'Year asked'), year)),
    h('div', { class: 'row2' },
      h('div', null, h('label', { for: 'p-role' }, 'Role'), roleSel),
      h('div', null, h('label', { for: 'p-level' }, 'Level'), lvlSel)),
    h('div', { class: 'row2' },
      h('div', null, h('label', { for: 'p-domain' }, 'Domain'), domSel),
      h('div', null, h('label', { for: 'p-round' }, 'Round'), roundSel)),
    h('label', { for: 'p-question' }, 'Question'), question,
    h('label', { for: 'p-answer' }, 'Your answer ', h('span', { class: 'hint' }, '(optional)')), answer,
    h('p', { class: 'muted small-text' }, 'Do not post confidential material or anything covered by an NDA. Describe the question in your own words.'),
    h('div', { class: 'formfoot' }, btn)));
  }

  /* ---------------- community ---------------- */
  function parseIssue(i) {
    const body = String(i.body || '');
    const fields = {};
    body.split(/^### /m).slice(1).forEach(function (chunk) {
      const nl = chunk.indexOf('\n');
      const key = chunk.slice(0, nl).trim().toLowerCase();
      const val = chunk.slice(nl + 1).trim();
      fields[key] = val === '_No response_' ? '' : val;
    });
    const lvl = parseInt(fields.level, 10);
    return {
      id: 'gh-' + i.number, createdAt: i.created_at, remote: true, url: i.html_url,
      author: { name: i.user && i.user.login, gh: i.user && i.user.login },
      company: trim(fields.company || 'Unknown', 60),
      role: roleId(fields.role), level: lvl >= 1 && lvl <= 4 ? lvl : 2,
      domain: trim(fields.domain || 'Other', 60), round: trim(fields.round || '', 40),
      year: parseInt(fields.year, 10) || new Date(i.created_at).getFullYear(),
      question: trim(fields.question || i.title, 1500), answer: trim(fields.answer || '', 2500)
    };
  }

  async function fetchShared() {
    const cached = store.get('shared', null);
    if (cached && Date.now() - cached.t < cfg.cacheMinutes * 60000) return cached.items;
    const url = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/issues?labels=' + encodeURIComponent(cfg.issueLabel) + '&state=open&per_page=100';
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(res.status === 403 ? 'GitHub rate limit reached' : 'GitHub returned ' + res.status);
    const data = await res.json();
    const items = data.filter(function (i) { return !i.pull_request; }).map(parseIssue);
    store.set('shared', { t: Date.now(), items: items });
    return items;
  }

  function shareUrl(p) {
    const q = new URLSearchParams({
      template: 'question.yml',
      title: '[' + p.company + '] ' + trim(p.question, 70),
      company: p.company, role: roleName(p.role), level: levelLabel(p.level), domain: p.domain, round: p.round,
      year: String(p.year), question: p.question.slice(0, 1500), answer: (p.answer || '').slice(0, 1200)
    });
    return 'https://github.com/' + cfg.owner + '/' + cfg.repo + '/issues/new?' + q.toString();
  }

  async function askClaude(p) {
    const s = store.get('settings', {});
    if (!s.key) throw new Error('Add an API key in Settings first.');
    const payload = Object.assign({}, p, { roleName: roleName(p.role) });
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json', 'x-api-key': s.key, 'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: s.model || cfg.defaultModel, max_tokens: 1800, system: engine.AI_SYSTEM, messages: [{ role: 'user', content: engine.aiPrompt(payload) }] })
    });
    if (!res.ok) {
      let msg = 'Claude request failed (' + res.status + ').';
      try { const j = await res.json(); if (j && j.error && j.error.message) msg = j.error.message; } catch (e) { /* keep default */ }
      throw new Error(msg);
    }
    const j = await res.json();
    const text = (j.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n').trim();
    if (!text) throw new Error('Claude returned an empty answer.');
    return { mode: 'claude', model: s.model || cfg.defaultModel, md: text, at: new Date().toISOString() };
  }

  function aiCache() { return store.get('ai', {}); }
  function saveAi(id, gen) {
    const c = aiCache(); c[id] = gen;
    const keys = Object.keys(c);
    if (keys.length > 40) delete c[keys[0]];
    store.set('ai', c);
  }

  function answerBlock(p) {
    const wrap = h('div', { class: 'ans' });
    function render() {
      wrap.replaceChildren();
      const gen = aiCache()[p.id] || p.gen || engine.generate({ question: p.question, role: p.role, level: p.level, company: p.company, domain: p.domain, round: p.round, answer: p.answer }, bank);
      const hasKey = !!store.get('settings', {}).key;
      const msg = h('p', { class: 'notice bad', hidden: true });
      const btn = h('button', { class: 'btn small', type: 'button' }, hasKey ? (gen.mode === 'claude' ? 'Regenerate with Claude' : 'Generate with Claude') : 'Add API key for a tailored answer');
      btn.addEventListener('click', async function () {
        if (!hasKey) { openSettings(); return; }
        btn.disabled = true; btn.textContent = 'Asking Claude...'; msg.hidden = true;
        try { saveAi(p.id, await askClaude(p)); render(); }
        catch (e) { btn.disabled = false; btn.textContent = 'Try again'; msg.textContent = e.message; msg.hidden = false; }
      });
      wrap.appendChild(h('div', { class: 'ans-h' },
        h('span', null, gen.mode === 'claude' ? 'Answer written by Claude' : 'Auto-generated answer (offline draft)'), btn));
      wrap.appendChild(msg);
      wrap.appendChild(h('div', { class: 'q-body' }, md(gen.md)));
      if (gen.mode !== 'claude') wrap.appendChild(h('p', { class: 'muted small-text' }, 'Built from templates and the curated question bank, not by a language model. Treat it as a structure to fill with your own experience.'));
    }
    render();
    return wrap;
  }

  function communityView(params) {
    const openId = params.get('open');
    const f = { company: '', role: '', level: 0, domain: '' };
    const status = h('div', { class: 'status', 'aria-live': 'polite' }, 'Loading shared questions...');
    const list = h('div', { class: 'qlist' });
    const datalist = h('datalist', { id: 'c-companies' });
    let remote = [];

    const company = h('input', { id: 'c-company', list: 'c-companies', autocomplete: 'off', placeholder: 'Any company', oninput: function () { f.company = company.value.trim().toLowerCase(); paint(); } });
    const role = h('select', { id: 'c-role', onchange: function () { f.role = role.value; paint(); } },
      [h('option', { value: '' }, 'All roles')].concat(meta.roles.map(function (r) { return h('option', { value: r.id }, r.name); })));
    const level = h('select', { id: 'c-level', onchange: function () { f.level = Number(level.value); paint(); } },
      [h('option', { value: '0' }, 'All gears')].concat(meta.levels.map(function (l) { return h('option', { value: String(l.n) }, l.n + ' ' + l.name); })));
    const domain = h('select', { id: 'c-domain', onchange: function () { f.domain = domain.value; paint(); } },
      [h('option', { value: '' }, 'All domains')].concat(meta.domains.map(function (d) { return h('option', { value: d }, d); })));

    function all() {
      const local = posts.all();
      const seen = {};
      return local.concat(remote).filter(function (p) { if (seen[p.id]) return false; seen[p.id] = 1; return true; })
        .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    }

    function paint() {
      const items = all();
      datalist.replaceChildren();
      const names = {};
      items.forEach(function (p) { names[p.company] = 1; });
      Object.keys(names).sort().forEach(function (c) { datalist.appendChild(h('option', { value: c })); });
      const rows = items.filter(function (p) {
        return (!f.company || p.company.toLowerCase().indexOf(f.company) >= 0) && (!f.role || p.role === f.role) &&
          (!f.level || p.level === f.level) && (!f.domain || p.domain === f.domain);
      });
      list.replaceChildren();
      if (!rows.length) {
        list.appendChild(h('div', { class: 'empty' },
          h('strong', null, items.length ? 'Nothing matches those filters.' : 'No community questions yet.'),
          items.length ? 'Clear a filter to see more.' : 'Be the first: ', items.length ? null : h('a', { href: '#/post' }, 'post a question you were asked'), items.length ? null : '.'));
      }
      rows.forEach(function (p) { list.appendChild(row(p, p.id === openId)); });
    }

    function row(p, open) {
      const d = h('details', { class: 'q', id: 'c-' + p.id, open: open },
        h('summary', null, gearBadge(p.level),
          h('div', null, h('div', { class: 'qt' }, trim(p.question, 150)),
            h('div', { class: 'qm' }, h('span', null, h('strong', null, p.company)), h('span', null, roleName(p.role)), h('span', null, p.domain),
              p.round ? h('span', null, p.round) : null, h('span', null, String(p.year)))),
          h('span', { class: 'badge' + (p.remote ? ' shared' : '') }, p.remote ? 'Shared' : 'This device')));
      function build() {
        if (d.dataset.built) return;
        d.dataset.built = '1';
        const actions = h('div', { class: 'q-actions' });
        if (p.remote) actions.appendChild(h('a', { class: 'btn small ghost', href: p.url, rel: 'noopener noreferrer' }, 'View on GitHub'));
        else {
          actions.appendChild(h('a', { class: 'btn small signal', href: shareUrl(p), rel: 'noopener noreferrer', target: '_blank' }, 'Share with the community'));
          actions.appendChild(h('button', { class: 'btn small danger-ghost', type: 'button', onclick: function () {
            if (!confirm('Delete this post from this device?')) return;
            posts.save(posts.all().filter(function (x) { return x.id !== p.id; })); paint();
          } }, 'Delete'));
        }
        d.appendChild(h('div', { class: 'q-body' },
          h('h4', null, 'Question'), h('p', { class: 'userq' }, p.question),
          h('p', { class: 'muted small-text' }, 'Posted by ' + (p.author && p.author.name || 'unknown') + ' on ' + String(p.createdAt).slice(0, 10) + '. Level: ' + levelLabel(p.level) + '.'),
          p.answer ? h('div', null, h('h4', null, 'Answer from the contributor'), h('p', { class: 'userq' }, p.answer)) : null,
          answerBlock(p), actions));
      }
      d.addEventListener('toggle', function () { if (d.open) build(); });
      if (open) build();
      return d;
    }

    app.appendChild(h('div', null,
      h('h1', null, 'Questions asked at real companies'),
      h('p', { class: 'lede' }, 'Posted by engineers after their interviews. Filter by company, role and gear, and every question comes with an auto-generated answer.'),
      h('div', { class: 'filters' },
        h('div', null, h('label', { for: 'c-company' }, 'Company'), company, datalist),
        h('div', null, h('label', { for: 'c-role' }, 'Role'), role),
        h('div', null, h('label', { for: 'c-level' }, 'Gear'), level),
        h('div', null, h('label', { for: 'c-domain' }, 'Domain'), domain)),
      status, list));
    paint();
    if (openId) { const el = document.getElementById('c-' + openId); if (el) setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 0); }

    fetchShared().then(function (items) {
      remote = items;
      status.textContent = items.length + ' shared on GitHub. ' + posts.all().length + ' saved on this device.';
      paint();
    }, function (e) {
      status.replaceChildren('Could not load shared questions (' + e.message + '). Showing posts saved on this device. ',
        h('a', { href: 'https://github.com/' + cfg.owner + '/' + cfg.repo + '/issues?q=label%3A' + cfg.issueLabel, rel: 'noopener noreferrer' }, 'Browse them on GitHub'), '.');
    });
  }

  /* ---------------- settings dialog ---------------- */
  const dlg = document.getElementById('settings');
  function openSettings() {
    const s = store.get('settings', {});
    document.getElementById('set-key').value = s.key || '';
    document.getElementById('set-model').value = s.model || cfg.defaultModel;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  document.getElementById('open-settings').addEventListener('click', openSettings);
  dlg.addEventListener('close', function () {
    if (dlg.returnValue !== 'save') return;
    store.set('settings', {
      key: document.getElementById('set-key').value.trim(),
      model: document.getElementById('set-model').value.trim() || cfg.defaultModel
    });
    render();
  });
  document.getElementById('wipe').addEventListener('click', function () {
    if (!confirm('Delete your profile, posts, progress and API key from this browser?')) return;
    store.wipe();
    dlg.close('cancel');
    location.hash = '#/questions';
    location.reload();
  });

  const links = document.getElementById('foot-links');
  const repo = 'https://github.com/' + cfg.owner + '/' + cfg.repo;
  links.appendChild(h('a', { href: repo, rel: 'noopener noreferrer' }, 'Source on GitHub'));
  links.appendChild(h('a', { href: repo + '/issues/new', rel: 'noopener noreferrer' }, 'Report a wrong answer'));

  window.addEventListener('hashchange', render);
  render();
})();
