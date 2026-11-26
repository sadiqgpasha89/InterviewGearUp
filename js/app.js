/* InterviewGearUp UI. Hash routing, no framework. All dynamic text goes through h()/md(), which never use innerHTML. */
(function () {
  const IGU = window.IGU;
  const U = IGU.util, h = U.h, md = U.md, store = U.store;
  const cfg = IGU.config, meta = IGU.meta, engine = IGU.engine;
  const bank = IGU.bank;
  const detectProvider = IGU.ai.detectProvider;
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
    const raw = location.hash.replace(/^#/, '') || '/home';
    const parts = raw.split('?');
    return { seg: parts[0].split('/').filter(Boolean), params: new URLSearchParams(parts[1] || '') };
  }

  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

  function render(fromNav) {
    if (cleanup) { cleanup(); cleanup = null; }
    const r = parseRoute();
    const tab = r.seg[0] === 'q' ? 'questions' : (r.seg[0] || 'home');
    document.querySelectorAll('#tabs a').forEach(function (a) {
      if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.querySelectorAll('#tabs details.menu').forEach(function (d) {
      d.removeAttribute('open');
      d.classList.toggle('current', !!d.querySelector('a[aria-current="page"]'));
    });
    app.replaceChildren();
    const extra = IGU.routes && IGU.routes[tab];
    const titles = { questions: 'Question bank', drill: 'Drill', progress: 'Progress', community: 'Community', post: 'Post a question' };
    document.title = ((extra && extra.title) || titles[tab] || 'Question bank') + ' | InterviewGearUp';
    if (extra) extra.render(r.params);
    else if (tab === 'drill') drillView(r.params);
    else if (tab === 'progress') progressView();
    else if (tab === 'community') communityView(r.params);
    else if (tab === 'post') postView();
    else questionsView(r);
    if (!(r.seg[0] === 'q')) { window.scrollTo(0, 0); }
    if (fromNav && app.focus) { try { app.focus({ preventScroll: true }); } catch (e) { app.focus(); } }
  }

  /* ---------------- shared pieces ---------------- */
  function gearBadge(n) { return h('span', { class: 'gear g' + n, title: 'Gear ' + n + ': ' + (levelOf(n) || {}).name }, String(n)); }

  const Q = IGU.quality;

  /* Pre-filled GitHub issue for a wrong, outdated or unclear answer. Contains the question id and context, never any local data. */
  function feedbackUrl(e, title, context) {
    const q = new URLSearchParams({ template: 'content-feedback.yml', title: title + e.id + ': ' + trim(e.q, 70), 'question-id': e.id, context: context });
    return 'https://github.com/' + cfg.owner + '/' + cfg.repo + '/issues/new?' + q.toString();
  }
  function reportUrl(e) {
    return feedbackUrl(e, '[Answer feedback] ', roleName(e.role) + ', Gear ' + e.level + ', topic: ' + e.topic + ', content version ' + (e.contentVersion || 1) +
      '. Link: ' + location.href.split('#')[0] + '#/q/' + e.id);
  }
  function contributeUrl(e) {
    return feedbackUrl(e, '[Write answer] ', 'I would like to help write the reference answer. ' + roleName(e.role) + ', Gear ' + e.level + '.');
  }

  /* Review status and difficulty, shown only when the data file records them and they validate (quality.metaProblems). */
  function metaLine(e) {
    if (Q.metaProblems(e).length) return null;
    const bits = [];
    if (e.difficulty) bits.push('Difficulty: ' + e.difficulty);
    bits.push(Q.label(e));
    if (e.contentVersion > 1) bits.push('Version ' + e.contentVersion);
    return h('p', { class: 'muted small-text meta-line' }, bits.join(' · '));
  }
  /* A reviewer flagged this answer: say so above the answer, with their note, instead of hiding the answer. */
  function correctionNotice(e) {
    if (Q.status(e) !== 'needs-correction' || Q.metaProblems(e).length) return null;
    return h('p', { class: 'notice bad', role: 'note' }, h('strong', null, 'Needs correction. '),
      'A reviewer found a problem with this answer that is not fixed yet: ' + e.correctionNote + ' ',
      h('a', { href: reportUrl(e), rel: 'noopener noreferrer', target: '_blank' }, 'Help fix it'), '.');
  }

  function referencesBlock(e) {
    if (!Array.isArray(e.references) || !e.references.length || Q.metaProblems(e).length) return null;
    return h('p', { class: 'muted small-text' }, 'References: ',
      e.references.map(function (r, i) { return [i ? ', ' : '', h('a', { href: r.url, rel: 'noopener noreferrer' }, r.title)]; }));
  }

  /* Entries that still hold generic filler: show an honest notice and the offline scaffold instead of the filler. */
  function placeholderBody(e) {
    const f = document.createDocumentFragment();
    f.appendChild(h('p', { class: 'notice' }, h('strong', null, 'No reference answer yet. '),
      'This is a real interview question, but its stored answer is generic filler, so it is not shown. Answer it in your own words first, then compare with the structure below. ',
      h('a', { href: contributeUrl(e), rel: 'noopener noreferrer', target: '_blank' }, 'Help write the answer'), '.'));
    f.appendChild(answerBlock({ id: 'bank-' + e.id, question: e.q, role: e.role, level: e.level, company: '', domain: '', round: '', answer: '' }));
    return f;
  }

  function answerBody(e) {
    if (Q.isPlaceholder(e)) return placeholderBody(e);
    const f = document.createDocumentFragment();
    const ml = metaLine(e);
    if (ml) f.appendChild(ml);
    const cn = correctionNotice(e);
    if (cn) f.appendChild(cn);
    f.appendChild(h('div', { class: 'short' }, h('h4', null, 'In 30 seconds'), md(e.short)));
    f.appendChild(h('h4', null, 'Explained in depth'));
    f.appendChild(md(e.detail));
    if (e.follow && e.follow.length) {
      f.appendChild(h('h4', null, 'Likely follow-ups'));
      f.appendChild(h('ul', null, e.follow.map(function (x) { return h('li', null, x); })));
    }
    const refs = referencesBlock(e);
    if (refs) f.appendChild(refs);
    f.appendChild(h('p', { class: 'small-text' }, h('a', { href: reportUrl(e), rel: 'noopener noreferrer', target: '_blank' }, 'Report a problem with this answer')));
    return f;
  }

  const S = IGU.stats;
  const today = function () { return S.day(Date.now()); };
  function touchActivity() { store.set('activity', S.touch(store.get('activity', []))); }

  /* A set of question ids kept in localStorage under one key. */
  function idSet(key) {
    return {
      all: function () { return store.get(key, {}); },
      has: function (id) { return !!store.get(key, {})[id]; },
      toggle: function (id) { const d = store.get(key, {}); if (d[id]) delete d[id]; else d[id] = 1; store.set(key, d); touchActivity(); return !!d[id]; }
    };
  }
  const done = idSet('done');
  const saved = idSet('saved');
  const notes = {
    get: function (id) { return store.get('notes', {})[id] || ''; },
    set: function (id, text) {
      const n = store.get('notes', {});
      if (text.trim()) n[id] = text.slice(0, 4000); else delete n[id];
      store.set('notes', n);
    }
  };

  /* Status filters shared by the bank (?show=) and drill pool. */
  const SHOW = [
    { id: '', label: 'All' },
    { id: 'todo', label: 'To prepare' },
    { id: 'done', label: 'Prepared' },
    { id: 'saved', label: 'Saved' },
    { id: 'weak', label: 'Needs practice' },
    { id: 'notes', label: 'With notes' },
    { id: 'real', label: 'Full answer' },
    { id: 'pending', label: 'Answer pending' }
  ];
  function showFilter(mode) {
    if (!mode) return function () { return true; };
    const d = done.all(), sv = saved.all(), nt = store.get('notes', {});
    const wk = {}; S.weak(store.get('practice', {})).forEach(function (id) { wk[id] = 1; });
    return function (e) {
      if (mode === 'todo') return !d[e.id];
      if (mode === 'done') return !!d[e.id];
      if (mode === 'saved') return !!sv[e.id];
      if (mode === 'weak') return !!wk[e.id];
      if (mode === 'notes') return !!nt[e.id];
      if (mode === 'real') return Q.isReal(e);
      if (mode === 'pending') return Q.isPlaceholder(e);
      return true;
    };
  }

  function selectField(id, label, options, value, extra) {
    return h('div', null,
      h('label', { for: id }, label),
      h('select', { id: id }, options.map(function (o) {
        return h('option', { value: o.value, selected: String(o.value) === String(value) }, o.label);
      })),
      extra);
  }

  /* ---------------- question bank ---------------- */
  const SE = IGU.search;
  function questionsView(r) {
    const rawId = r.seg[0] === 'q' ? r.seg[1] : null;
    const openId = rawId && (IGU.retired && IGU.retired[rawId]) || rawId;
    const f = {
      role: r.params.get('role') || '',
      level: Number(r.params.get('level')) || 0,
      topic: r.params.get('topic') || '',
      q: r.params.get('q') || '',
      show: r.params.get('show') || '',
      limit: PAGE
    };
    if (!SHOW.some(function (s) { return s.id === f.show; })) f.show = '';
    const openEntry = openId ? bank.filter(function (e) { return e.id === openId; })[0] : null;
    let showOk = showFilter(f.show);
    let lastRandomId = '';

    function queryBank(opts) {
      opts = opts || {};
      if (SE) {
        return SE.query(bank, 'q' in opts ? opts.q : f.q, {
          role: 'role' in opts ? opts.role : f.role,
          level: 'level' in opts ? opts.level : f.level,
          topic: 'topic' in opts ? opts.topic : f.topic,
          filterFn: 'filterFn' in opts ? opts.filterFn : showOk
        });
      }
      const q = String('q' in opts ? opts.q : f.q).toLowerCase().trim();
      const role = 'role' in opts ? opts.role : f.role;
      const level = 'level' in opts ? opts.level : f.level;
      const topic = 'topic' in opts ? opts.topic : f.topic;
      const fn = 'filterFn' in opts ? opts.filterFn : showOk;
      const items = bank.filter(function (e) {
        if (role && e.role !== role) return false;
        if (level && e.level !== level) return false;
        if (topic && e.topic !== topic) return false;
        if (!fn(e)) return false;
        if (!q) return true;
        const hay = (e.q + ' ' + e.topic + ' ' + (e.tags || []).join(' ') + ' ' + e.short + ' ' + e.detail).toLowerCase();
        return q.split(/\s+/).filter(Boolean).every(function (t) { return hay.indexOf(t) >= 0; });
      }).sort(function (a, b) { return a.level - b.level || a.id.localeCompare(b.id, undefined, { numeric: true }); });
      return { items: items, suggestions: [], relaxedCount: items.length };
    }

    const shifter = h('ol', { class: 'shifter', 'aria-label': 'Level' });
    const knob = h('span', { class: 'knob', 'aria-hidden': 'true' });
    const roleList = h('ul', { class: 'roles' });
    const topicSel = h('select', { id: 'q-topic', class: 'topic-select', 'aria-label': 'Filter by topic' });
    const list = h('div', { class: 'qlist' });
    const status = h('div', { class: 'status', 'aria-live': 'polite' });
    const more = h('div', { class: 'more' });
    const input = h('input', {
      type: 'search', id: 'search', value: f.q, autocomplete: 'off', placeholder: 'Search: caching, k8s, closures, CAP theorem',
      'aria-label': 'Search questions',
      oninput: function () { f.q = input.value; f.limit = PAGE; sync(false); paint(); }
    });
    topicSel.addEventListener('change', function () { f.topic = topicSel.value; f.limit = PAGE; sync(true); paint(); });

    function sync(push) {
      const p = new URLSearchParams();
      if (f.role) p.set('role', f.role);
      if (f.level) p.set('level', f.level);
      if (f.topic) p.set('topic', f.topic);
      if (f.q.trim()) p.set('q', f.q.trim());
      if (f.show) p.set('show', f.show);
      const s = p.toString();
      const target = '#/questions' + (s ? '?' + s : '');
      if (push && location.hash !== target) history.pushState(null, '', target);
      else history.replaceState(null, '', target);
    }

    function paintSide() {
      shifter.replaceChildren();
      const stops = [{ n: 0, name: 'All levels', years: 'Every gear' }].concat(meta.levels);
      stops.forEach(function (l) {
        shifter.appendChild(h('li', null, h('button', {
          type: 'button', 'aria-pressed': f.level === l.n ? 'true' : 'false',
          onclick: function () { f.level = l.n; f.limit = PAGE; sync(true); paint(); }
        }, h('span', { class: 'detent' }, l.n ? String(l.n) : 'N'),
        h('span', null, h('span', { class: 'gname' }, l.name), h('span', { class: 'gyears' }, l.years)))));
      });
      knob.textContent = f.level ? String(f.level) : 'N';
      knob.style.setProperty('--i', String(f.level));
      shifter.appendChild(knob);

      roleList.replaceChildren();
      const all = [{ id: '', name: 'All roles' }].concat(meta.roles);
      all.forEach(function (ro) {
        const c = queryBank({ role: ro.id, topic: '' }).items.length;
        roleList.appendChild(h('li', null, h('button', {
          type: 'button', 'aria-pressed': f.role === ro.id ? 'true' : 'false',
          onclick: function () { f.role = ro.id; f.topic = ''; f.limit = PAGE; sync(true); paint(); }
        }, h('span', null, ro.name), h('span', { class: 'count' }, String(c)))));
      });

      const topicsList = SE ? SE.topics(bank, { role: f.role, level: f.level, filterFn: showOk }) : [];
      if (f.topic && !topicsList.some(function (t) { return t.topic === f.topic; })) f.topic = '';
      topicSel.replaceChildren(h('option', { value: '' }, 'All topics (' + topicsList.length + ')'));
      topicsList.forEach(function (t) {
        topicSel.appendChild(h('option', { value: t.topic, selected: t.topic === f.topic }, t.topic + ' (' + t.count + ')'));
      });
      topicSel.value = f.topic;
    }

    function paintList() {
      const res = queryBank();
      const rows = res.items;
      list.replaceChildren();
      more.replaceChildren();
      const shown = rows.slice(0, f.limit);
      if (openEntry && shown.indexOf(openEntry) < 0 && rows.indexOf(openEntry) >= 0) shown.unshift(openEntry);
      shown.forEach(function (e) { list.appendChild(qRow(e, openEntry && e.id === openId)); });
      if (!rows.length) {
        const actions = [];
        if (res.suggestions && res.suggestions.length) {
          actions.push(h('p', { class: 'small-text' }, 'Did you mean: ',
            res.suggestions.map(function (s, i) {
              return [i ? ', ' : '', h('button', { class: 'linkish', type: 'button', onclick: function () { f.q = s; input.value = s; f.limit = PAGE; sync(true); paint(); } }, s)];
            }), '?'));
        }
        if ((f.role || f.level || f.topic || f.show) && res.relaxedCount > 0) {
          actions.push(h('button', { class: 'btn small primary', type: 'button', onclick: function () {
            f.role = ''; f.level = 0; f.topic = ''; f.show = ''; showOk = showFilter(''); f.limit = PAGE; sync(true); paint();
          } }, 'Search all roles & gears (' + res.relaxedCount + ' match' + (res.relaxedCount === 1 ? '' : 'es') + ')'));
        } else if (f.role || f.level || f.topic || f.show || f.q) {
          actions.push(h('button', { class: 'btn small', type: 'button', onclick: function () {
            f.role = ''; f.level = 0; f.topic = ''; f.show = ''; f.q = ''; input.value = ''; showOk = showFilter(''); f.limit = PAGE; sync(true); paint();
          } }, 'Clear all filters'));
        }
        list.appendChild(h('div', { class: 'empty' }, h('strong', null, 'No questions match.'),
          ' Try fewer words, a broader topic, or another gear. ',
          actions.length ? h('div', { class: 'q-actions' }, actions) : null,
          'Something missing? ', h('a', { href: '#/post' }, 'Post the question you were asked'), '.'));
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
      rows = rows || queryBank().items;
      const d = done.all();
      const total = rows.length, doneN = rows.filter(function (e) { return d[e.id]; }).length;
      const fill = h('i');
      fill.style.width = (total ? Math.round(100 * doneN / total) : 0) + '%';
      status.replaceChildren(
        h('span', null, total + (total === 1 ? ' question' : ' questions')),
        total ? h('span', null, doneN + ' prepared') : null,
        total ? h('span', { class: 'progress', role: 'img', 'aria-label': doneN + ' of ' + total + ' prepared' }, fill) : null);
    }

    const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Show' });
    function paintChips() {
      chips.replaceChildren();
      const anyPending = bank.some(Q.isPlaceholder);
      SHOW.forEach(function (s) {
        if ((s.id === 'pending' || s.id === 'real') && !anyPending && f.show !== s.id) return; // nothing to separate: every question has an answer
        chips.appendChild(h('button', {
          type: 'button', class: 'chip', 'aria-pressed': f.show === s.id ? 'true' : 'false',
          onclick: function () { f.show = s.id; showOk = showFilter(f.show); f.limit = PAGE; sync(true); paint(); }
        }, s.label));
      });
    }

    function paint() { paintChips(); paintSide(); paintList(); }

    function qRow(e, open) {
      const mark = h('span', { class: 'done' + (done.has(e.id) ? ' on' : ''), title: 'Prepared' }, '✓');
      const star = h('span', { class: 'star' + (saved.has(e.id) ? ' on' : ''), title: 'Saved', 'aria-hidden': 'true' }, '★');
      const d = h('details', { class: 'q', id: 'q-' + e.id, open: open },
        h('summary', null, gearBadge(e.level),
          h('div', null, h('div', { class: 'qt' }, e.q),
            h('div', { class: 'qm' }, h('span', null, roleName(e.role)), h('span', null, e.topic),
              Q.isPlaceholder(e) ? h('span', { class: 'pending-badge' }, 'Answer pending') : null,
              notes.get(e.id) ? h('span', { class: 'has-note' }, 'Has notes') : null)),
          h('span', { class: 'marks' }, star, mark)));
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
        const save = h('button', { class: 'btn small ghost', type: 'button', 'aria-pressed': saved.has(e.id) ? 'true' : 'false' }, saved.has(e.id) ? '★ Saved' : '☆ Save for later');
        save.addEventListener('click', function () {
          const on = saved.toggle(e.id);
          save.textContent = on ? '★ Saved' : '☆ Save for later';
          save.setAttribute('aria-pressed', on ? 'true' : 'false');
          star.classList.toggle('on', on);
        });
        const noteId = 'note-' + e.id;
        const noteBox = h('textarea', { id: noteId, class: 'note', maxlength: '4000', placeholder: 'Your own talking points, a story from your experience, or what to revisit. Saved in this browser only.' });
        noteBox.value = notes.get(e.id);
        const noteState = h('span', { class: 'muted small-text', 'aria-live': 'polite' });
        let noteTimer = null;
        noteBox.addEventListener('input', function () {
          clearTimeout(noteTimer);
          noteTimer = setTimeout(function () { notes.set(e.id, noteBox.value); noteState.textContent = 'Saved'; }, 400);
        });
        const prereqs = SE ? SE.prerequisites(e, bank, 3) : [];
        const rel = SE ? SE.related(e, bank, 4) : [];
        const discovery = (prereqs.length || rel.length) ? h('div', { class: 'related-box' },
          prereqs.length ? [h('h4', null, 'Prerequisite concepts'), h('ul', null, prereqs.map(function (x) {
            return h('li', null, gearBadge(x.level), ' ', h('a', { href: '#/q/' + x.id }, x.q), ' ', h('span', { class: 'muted small-text' }, '(' + x.topic + ')'));
          }))] : null,
          rel.length ? [h('h4', null, 'Related questions'), h('ul', null, rel.map(function (x) {
            return h('li', null, gearBadge(x.level), ' ', h('a', { href: '#/q/' + x.id }, x.q), ' ', h('span', { class: 'muted small-text' }, '(' + roleName(x.role) + ')'));
          }))] : null) : null;
        d.appendChild(h('div', { class: 'q-body' }, answerBody(e),
          h('div', { class: 'notes' }, h('label', { for: noteId }, 'My notes ', noteState), noteBox),
          h('div', { class: 'q-actions' }, prepared, save, copy,
            h('a', { class: 'btn small ghost', href: '#/drill?id=' + encodeURIComponent(e.id) }, 'Drill this'),
            h('a', { class: 'btn small ghost', href: '#/questions?role=' + encodeURIComponent(e.role) + '&topic=' + encodeURIComponent(e.topic) }, 'More on ' + e.topic)),
          discovery));
      }
      d.addEventListener('toggle', function () { if (d.open) build(); });
      if (open) build();
      return d;
    }

    const randomBtn = h('button', { class: 'btn ghost', type: 'button', onclick: function () {
      const items = queryBank().items;
      const pick = SE ? SE.pickRandom(items, lastRandomId) : items[Math.floor(Math.random() * items.length)];
      if (!pick) return;
      lastRandomId = pick.id;
      go('#/q/' + encodeURIComponent(pick.id));
    } }, 'Random question');

    app.appendChild(h('div', { class: 'bank' },
      h('aside', { class: 'side' },
        h('div', { class: 'block' }, h('h2', null, 'Gear'), shifter),
        h('div', { class: 'block' }, h('h2', null, 'Role'), roleList),
        h('div', { class: 'block' }, h('h2', null, h('label', { for: 'q-topic' }, 'Topic')), topicSel)),
      h('section', null,
        h('h1', null, 'Pick your gear'),
        h('p', { class: 'lede' }, 'Questions run from first gear (junior) to fourth (lead or staff). Open one for a 30-second answer, then the full explanation.'),
        (function () {
          const real = bank.filter(Q.isReal).length;
          const reviewed = bank.filter(function (e) { return Q.status(e) === 'reviewed'; }).length;
          return h('p', { class: 'muted small-text' },
            real === bank.length ? 'Every one of the ' + bank.length + ' questions has a written answer. '
              : real + ' of ' + bank.length + ' questions have a written answer; the rest show a practice structure instead (',
            real === bank.length ? null : h('a', { href: '#/questions?show=real' }, 'show only full answers'), real === bank.length ? null : '). ',
            reviewed ? reviewed + ' have been reviewed by a person; the rest are AI-drafted or of unrecorded origin, so verify anything you rely on. '
              : 'None has been reviewed by a person yet: they are AI-drafted or of unrecorded origin, so verify anything you rely on. ',
            h('a', { href: 'https://github.com/' + cfg.owner + '/' + cfg.repo + '/blob/main/docs/CONTENT_QUALITY.md', rel: 'noopener noreferrer' }, 'Content quality report'), '.');
        })(),
        openId && !openEntry ? h('p', { class: 'notice bad' }, 'That question link is not in the bank. Showing everything instead.') : null,
        h('div', { class: 'search-bar' }, h('div', { class: 'search' }, input), randomBtn),
        chips,
        status, list, more)));
    paint();
    const slash = function (ev) {
      if (ev.key !== '/' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const t = ev.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      ev.preventDefault(); input.focus();
    };
    document.addEventListener('keydown', slash);
    cleanup = function () { document.removeEventListener('keydown', slash); };
    if (openEntry) {
      const el = document.getElementById('q-' + openId);
      if (el) setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 0);
    }
  }

  /* ---------------- drill ---------------- */
  function drillView(params) {
    const st = {
      role: (params && params.get('role')) || '',
      level: Number(params && params.get('level')) || 0,
      pool: (params && params.get('pool')) || '',
      topic: (params && params.get('topic')) || '',
      current: null, shown: false, t0: 0, secs: 0, timer: null, last: null,
      session: { n: 0, ok: 0, again: 0, secs: 0 }
    };
    if (!SHOW.some(function (s) { return s.id === st.pool; })) st.pool = '';
    const POOLS = [
      { id: '', label: 'Everything (unprepared first)' },
      { id: 'weak', label: 'Needs practice' },
      { id: 'saved', label: 'Saved for later' },
      { id: 'todo', label: 'Not yet prepared' }
    ];
    const stage = h('div');
    const summary = h('p', { class: 'muted small-text', 'aria-live': 'polite' });
    function syncDrill() {
      const p = new URLSearchParams();
      if (st.role) p.set('role', st.role);
      if (st.level) p.set('level', st.level);
      if (st.pool) p.set('pool', st.pool);
      if (st.topic) p.set('topic', st.topic);
      const s = p.toString();
      history.replaceState(null, '', '#/drill' + (s ? '?' + s : ''));
    }
    function pool() {
      const ok = showFilter(st.pool);
      return bank.filter(function (e) { return (!st.role || e.role === st.role) && (!st.level || e.level === st.level) && (!st.topic || e.topic === st.topic) && ok(e); });
    }
    function begin(e) {
      st.current = e;
      st.last = e.id;
      st.shown = false;
      st.t0 = Date.now();
      startTimer();
      paint();
    }
    function draw() {
      const p = pool();
      if (!p.length) { st.current = null; paint(); return; }
      const d = done.all();
      let fresh = p.filter(function (e) { return !d[e.id] && e.id !== st.last; });
      if (!fresh.length) fresh = p.filter(function (e) { return e.id !== st.last; });
      if (!fresh.length) fresh = p;
      begin(fresh[Math.floor(Math.random() * fresh.length)]);
    }
    /* grade: 'again' | 'partial' | 'solid' | 'mastered'. practice keeps its original two outcomes. */
    function grade(g) {
      const e = st.current;
      const outcome = (g === 'solid' || g === 'mastered') ? 'ok' : 'again';
      store.set('practice', S.record(store.get('practice', {}), e.id, outcome, st.secs));
      if (IGU.adaptive) store.set('history', IGU.adaptive.logAttempt(store.get('history', []), e.id, outcome, today()));
      store.set('srs', IGU.srs.review(store.get('srs', {}), e.id, g, today()));
      touchActivity();
      if (outcome === 'ok' && !done.has(e.id)) done.toggle(e.id);
      st.session.n++; st.session[outcome]++; st.session.secs += st.secs;
      paintSummary();
      draw();
    }
    function paintSummary() {
      const s = st.session;
      summary.textContent = s.n ? 'This session: ' + s.n + ' answered, ' + s.ok + ' confident, ' + s.again + ' to revisit, average ' +
        Math.round(s.secs / s.n) + 's per question.' : '';
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
    function reveal() { st.shown = true; st.secs = (Date.now() - st.t0) / 1000; stopTimer(); paint(); }

    /* Shortcuts: R reveal, N skip/next, Y could answer, P needs practice. Ignored while typing. */
    function onKey(ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const t = ev.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const k = ev.key.toLowerCase();
      if (!st.current) { if (k === 'n' && pool().length) { ev.preventDefault(); draw(); } return; }
      if (!st.shown && k === 'r') { ev.preventDefault(); reveal(); }
      else if (!st.shown && k === 'n') { ev.preventDefault(); draw(); }
      else if (st.shown && k === 'y') { ev.preventDefault(); grade('solid'); }
      else if (st.shown && k === 'm') { ev.preventDefault(); grade('mastered'); }
      else if (st.shown && k === 'b') { ev.preventDefault(); grade('partial'); }
      else if (st.shown && k === 'p') { ev.preventDefault(); grade('again'); }
    }
    document.addEventListener('keydown', onKey);
    cleanup = function () { stopTimer(); document.removeEventListener('keydown', onKey); };

    function paint() {
      stage.replaceChildren();
      if (!st.current) {
        const n = pool().length;
        const empty = st.pool === 'weak' ? 'Nothing marked "needs practice" yet. Drill a few questions first.' :
          st.pool === 'saved' ? 'No saved questions in this selection. Use "Save for later" in the question bank.' :
          'No questions in this selection. Pick another role or gear.';
        stage.appendChild(h('div', { class: 'drill-card' }, h('p', { class: 'muted' }, n ? n + (n === 1 ? ' question' : ' questions') + ' in this pool. Press Draw a question (or N) to start.' : empty),
          h('div', { class: 'drill-row' }, h('button', { class: 'btn primary', type: 'button', disabled: !n, onclick: draw }, 'Draw a question'))));
        return;
      }
      const e = st.current;
      const hist = store.get('practice', {})[e.id];
      const card = h('div', { class: 'drill-card' },
        h('div', { class: 'drill-row' }, gearBadge(e.level), h('span', { class: 'muted' }, roleName(e.role) + ', ' + e.topic), h('span', { class: 'grow' }),
          h('span', { class: 'timer', id: 'timer', role: 'timer', 'aria-label': 'Time spent' }, st.shown ? Math.floor(st.secs / 60) + ':' + String(Math.floor(st.secs % 60)).padStart(2, '0') : '0:00')),
        h('div', { class: 'drill-q' }, e.q),
        hist ? h('p', { class: 'muted small-text' }, 'Drilled ' + hist.n + (hist.n === 1 ? ' time' : ' times') + ': ' + hist.ok + ' confident, ' + hist.again + ' to revisit.') : null,
        h('p', { class: 'muted' }, 'Answer out loud first. Aim for about two minutes, then reveal the answer and compare.'));
      if (!st.shown) {
        card.appendChild(h('div', { class: 'drill-row' },
          h('button', { class: 'btn primary', type: 'button', onclick: reveal }, 'Reveal answer'),
          h('button', { class: 'btn ghost', type: 'button', onclick: draw }, 'Skip'),
          h('span', { class: 'kbd-hint' }, h('kbd', null, 'R'), ' reveal  ', h('kbd', null, 'N'), ' skip')));
      } else {
        const body = h('div', { class: 'q-body flush' }, answerBody(e));
        card.appendChild(body);
        const note = notes.get(e.id);
        if (note) card.appendChild(h('div', { class: 'short' }, h('h4', null, 'Your notes'), h('p', { class: 'userq plain' }, note)));
        card.appendChild(h('div', { class: 'q-actions' },
          h('button', { class: 'btn primary', type: 'button', onclick: function () { grade('solid'); } }, 'I could answer this'),
          h('button', { class: 'btn', type: 'button', onclick: function () { grade('mastered'); } }, 'Mastered'),
          h('button', { class: 'btn', type: 'button', onclick: function () { grade('partial'); } }, 'Partly'),
          h('button', { class: 'btn', type: 'button', onclick: function () { grade('again'); } }, 'Needs more practice'),
          h('span', { class: 'kbd-hint' }, h('kbd', null, 'Y'), ' confident  ', h('kbd', null, 'M'), ' mastered  ', h('kbd', null, 'B'), ' partly  ', h('kbd', null, 'P'), ' practise again')));
      }
      stage.appendChild(card);
    }

    const resetDraw = function () { st.current = null; stopTimer(); syncDrill(); paint(); };
    const roleSel = h('select', { id: 'd-role', onchange: function () { st.role = roleSel.value; resetDraw(); } },
      [h('option', { value: '' }, 'All roles')].concat(meta.roles.map(function (r) { return h('option', { value: r.id }, r.name); })));
    roleSel.value = st.role;
    const lvlSel = h('select', { id: 'd-level', onchange: function () { st.level = Number(lvlSel.value); resetDraw(); } },
      [h('option', { value: '0' }, 'All gears')].concat(meta.levels.map(function (l) { return h('option', { value: String(l.n) }, l.n + ' ' + l.name); })));
    lvlSel.value = String(st.level);
    const poolSel = h('select', { id: 'd-pool', onchange: function () { st.pool = poolSel.value; resetDraw(); } },
      POOLS.map(function (p) { return h('option', { value: p.id }, p.label); }));
    poolSel.value = st.pool;

    app.appendChild(h('div', { class: 'drill' },
      h('h1', null, 'Drill'),
      h('p', { class: 'lede' }, 'Random questions with a timer, for practising answers out loud. Grade yourself after each one: questions you struggle with go into a "Needs practice" pool you can drill on their own.'),
      h('div', { class: 'drill-filters three' },
        h('div', null, h('label', { for: 'd-role' }, 'Role'), roleSel),
        h('div', null, h('label', { for: 'd-level' }, 'Gear'), lvlSel),
        h('div', null, h('label', { for: 'd-pool' }, 'Pool'), poolSel)),
      stage, summary));
    const want = params && params.get('id');
    const pick = want ? bank.filter(function (e) { return e.id === want; })[0] : null;
    if (pick) begin(pick); else paint();
  }

  /* ---------------- progress ---------------- */
  function progressView() {
    const m = S.matrix(bank, done.all(), meta);
    const practice = store.get('practice', {});
    const weakIds = S.weak(practice);
    const drilled = Object.keys(practice).length;
    const streakDays = S.streak(store.get('activity', []));
    const savedN = Object.keys(saved.all()).length;
    const notesN = Object.keys(store.get('notes', {})).length;
    const pct = function (a, b) { return b ? Math.round(100 * a / b) : 0; };
    const bar = function (a, b, label) {
      const fill = h('i'); fill.style.width = pct(a, b) + '%';
      return h('span', { class: 'progress', role: 'img', 'aria-label': label || (a + ' of ' + b + ' prepared') }, fill);
    };

    const tiles = h('div', { class: 'tiles' },
      tile(pct(m.done, m.total) + '%', m.done + ' of ' + m.total + ' prepared', '#/questions?show=done'),
      tile(String(streakDays), streakDays === 1 ? 'day study streak' : 'days study streak', null),
      tile(String(drilled), drilled === 1 ? 'question drilled' : 'questions drilled', '#/drill'),
      tile(String(weakIds.length), 'need more practice', weakIds.length ? '#/questions?show=weak' : null),
      tile(String(savedN), 'saved for later', savedN ? '#/questions?show=saved' : null),
      tile(String(notesN), 'with your notes', notesN ? '#/questions?show=notes' : null));
    function tile(big, small, href) {
      const inner = [h('strong', null, big), h('span', null, small)];
      return href ? h('a', { class: 'tile', href: href }, inner) : h('div', { class: 'tile' }, inner);
    }

    const table = h('table', { class: 'matrix' },
      h('caption', { class: 'sr-only' }, 'Prepared questions by role and gear'),
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Role'),
        meta.levels.map(function (l) { return h('th', { scope: 'col' }, 'Gear ' + l.n, h('span', { class: 'gyears' }, l.name)); }),
        h('th', { scope: 'col' }, 'Total'))),
      h('tbody', null, m.rows.map(function (r) {
        return h('tr', null,
          h('th', { scope: 'row' }, h('a', { href: '#/questions?role=' + r.role }, r.name)),
          r.cells.map(function (c) {
            return h('td', null, h('a', { href: '#/questions?role=' + r.role + '&level=' + c.level + '&show=todo', title: 'Show what is left to prepare' },
              h('span', { class: 'num' }, c.done + '/' + c.total), bar(c.done, c.total)));
          }),
          h('td', null, h('span', { class: 'num' }, pct(r.done, r.total) + '%'), bar(r.done, r.total)));
      })));

    const weakList = weakIds.length ? h('ul', { class: 'plain-list' }, weakIds.slice(0, 15).map(function (id) {
      const e = bank.filter(function (x) { return x.id === id; })[0];
      return e ? h('li', null, gearBadge(e.level), h('a', { href: '#/q/' + e.id }, e.q)) : null;
    })) : h('p', { class: 'muted' }, 'Nothing yet. In Drill, press "Needs more practice" on questions you struggle with and they collect here.');

    /* Backup: progress lives in this browser only, so let people move it between devices. API keys are never exported. */
    const msg = h('p', { class: 'notice', hidden: true, 'aria-live': 'polite' });
    const fileIn = h('input', { type: 'file', accept: 'application/json,.json', id: 'import-file', class: 'sr-only' });
    fileIn.addEventListener('change', function () {
      const file = fileIn.files && fileIn.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        let parsed;
        try { parsed = JSON.parse(String(reader.result)); } catch (e) { parsed = null; }
        const res = S.readBackup(parsed);
        if (res.error) { msg.className = 'notice bad'; msg.textContent = res.error; msg.hidden = false; return; }
        if (!confirm('Replace the progress in this browser with the backup?')) return;
        Object.keys(res.data).forEach(function (k) { store.set(k, res.data[k]); });
        render();
      };
      reader.readAsText(file);
    });
    const exportBtn = h('button', { class: 'btn', type: 'button' }, 'Download backup');
    exportBtn.addEventListener('click', function () {
      const blob = new Blob([JSON.stringify(S.makeBackup(function (k) { return store.get(k, null); }), null, 2)], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: 'interviewgearup-backup-' + new Date().toISOString().slice(0, 10) + '.json' });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      msg.className = 'notice'; msg.textContent = 'Backup downloaded. It contains progress, saved questions, notes and drafts, but never your API key.'; msg.hidden = false;
    });

    app.appendChild(h('div', { class: 'progress-page' },
      h('h1', null, 'Your progress'),
      h('p', { class: 'lede' }, 'Everything here is stored in this browser only. Download a backup to move it to another device.'),
      tiles,
      h('h2', null, 'Coverage by role and gear'),
      h('div', { class: 'table-wrap' }, table),
      h('h2', null, 'Needs more practice'),
      weakList,
      weakIds.length ? h('p', null, h('a', { class: 'btn primary', href: '#/drill' }, 'Drill these'), ' ', h('span', { class: 'muted small-text' }, 'Choose the "Needs practice" pool.')) : null,
      h('h2', null, 'Backup and restore'),
      msg,
      h('div', { class: 'q-actions' }, exportBtn,
        h('button', { class: 'btn ghost', type: 'button', onclick: function () { fileIn.value = ''; fileIn.click(); } }, 'Restore from backup'),
        h('label', { for: 'import-file', class: 'sr-only' }, 'Backup file'), fileIn),
      h('p', { class: 'muted small-text' }, 'Want to move progress between devices without files? ', h('a', { href: '#/sync' }, 'Optional private sync'), ' (off by default, encrypted, uses your own GitHub account).')));
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
        const sens = IGU.company && IGU.company.hasSensitiveHint ? IGU.company.hasSensitiveHint(q + ' ' + answer.value) : [];
        if (sens.length && !confirm('Your post appears to include ' + sens.join(' and ') + '. Do not post confidential, NDA-covered, or personally identifying information. Save anyway?')) return;
        const p = {
          id: 'local-' + U.uid(), createdAt: new Date().toISOString(),
          author: { name: profile.name, gh: profile.gh },
          company: company.value.trim(), role: roleSel.value, level: Number(lvlSel.value),
          domain: domSel.value, round: roundSel.value, year: Number(year.value) || new Date().getFullYear(),
          question: q, answer: answer.value.trim()
        };
        p.roleName = roleName(p.role);
        btn.disabled = true;
        const s = store.get('settings', {});
        if (s.key) {
          btn.textContent = 'Generating answer with AI...';
          try {
            p.gen = await askLlm(p);
            saveAi(p.id, p.gen);
          } catch (e) {
            console.warn('AI answer generation failed, using offline fallback:', e.kind || e.name);
            p.gen = engine.generate({ question: p.question, role: p.role, level: p.level, company: p.company, domain: p.domain, round: p.round, answer: p.answer }, bank);
            p.gen.fallbackNote = e.message;
          }
        } else {
          p.gen = engine.generate({ question: p.question, role: p.role, level: p.level, company: p.company, domain: p.domain, round: p.round, answer: p.answer }, bank);
        }
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
      if (nl === -1) return;
      const key = chunk.slice(0, nl).trim().toLowerCase();
      const val = chunk.slice(nl + 1).trim();
      fields[key] = val === '_No response_' ? '' : val;
    });
    const lvl = parseInt(fields.level, 10);
    const aiAnswer = fields['auto-generated answer'] || fields['generated answer'] || fields['ai answer'] || '';
    const item = {
      id: 'gh-' + i.number, createdAt: i.created_at, remote: true, url: i.html_url,
      author: { name: i.user && i.user.login, gh: i.user && i.user.login },
      company: trim(fields.company || 'Unknown', 60),
      role: roleId(fields.role), level: lvl >= 1 && lvl <= 4 ? lvl : 2,
      domain: trim(fields.domain || 'Other', 60), round: trim(fields.round || '', 40),
      year: parseInt(fields.year, 10) || new Date(i.created_at).getFullYear(),
      question: trim(fields.question || i.title, 1500), answer: trim(fields.answer || '', 2500),
      labels: (i.labels || []).map(function (l) { return l && l.name; }).filter(Boolean)
    };
    item.review = IGU.company.statusOf(item);
    const botLabelled = (i.labels || []).some(function (l) { return (l && l.name) === 'ai-answered'; });
    // A "generated answer" section is only shown as LLM-written when the bot applied the label; anyone can type that heading into an issue.
    if (aiAnswer && botLabelled) {
      item.gen = {
        mode: 'llm',
        model: fields['model'] || fields['ai model'] || 'LLM',
        md: aiAnswer,
        at: i.updated_at || i.created_at
      };
    }
    return item;
  }
  IGU.parseIssue = parseIssue;
  IGU.detectProvider = detectProvider;

  async function fetchShared() {
    const cached = store.get('shared', null);
    if (cached && Date.now() - cached.t < cfg.cacheMinutes * 60000) return cached.items;
    const url = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/issues?labels=' + encodeURIComponent(cfg.issueLabel) + '&state=open&per_page=100';
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(res.status === 403 ? 'GitHub rate limit reached' : 'GitHub returned ' + res.status);
    const data = await res.json();
    const items = data.filter(function (i) { return !i.pull_request; }).map(parseIssue).filter(function (p) { return p.review !== 'hidden'; });
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

  async function askLlm(p) {
    const s = store.get('settings', {});
    const payload = Object.assign({}, p, { roleName: roleName(p.role) });
    const result = await IGU.ai.ask({ settings: s, system: engine.AI_SYSTEM, prompt: engine.aiPrompt(payload) });
    return { mode: 'llm', provider: result.provider, model: result.model, md: result.text, at: new Date().toISOString() };
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
      const isLlm = gen.mode === 'llm' || gen.mode === 'claude' || gen.mode === 'gemini' || gen.mode === 'openai';
      const hasKey = !!store.get('settings', {}).key;
      const msg = h('p', { class: 'notice bad', hidden: true });
      const btnLabel = hasKey ? (isLlm ? 'Regenerate with AI' : 'Generate with AI') : 'Add API key in Settings';
      const btn = h('button', { class: 'btn small', type: 'button' }, btnLabel);
      btn.addEventListener('click', async function () {
        if (!hasKey) { openSettings(); return; }
        btn.disabled = true; btn.textContent = 'Asking AI...'; msg.hidden = true;
        try { saveAi(p.id, await askLlm(p)); render(); }
        catch (e) { btn.disabled = false; btn.textContent = 'Try again'; msg.textContent = e.message; msg.hidden = false; }
      });
      const headerTitle = isLlm ? ('Answer generated by ' + (gen.model || gen.provider || 'AI')) : 'Auto-generated answer (offline draft)';
      wrap.appendChild(h('div', { class: 'ans-h' }, h('span', null, headerTitle), btn));
      wrap.appendChild(msg);
      if (gen.fallbackNote) wrap.appendChild(h('p', { class: 'notice' }, 'AI answer not generated: ' + gen.fallbackNote + ' Showing the offline draft instead.'));
      wrap.appendChild(h('div', { class: 'q-body' }, md(gen.md)));
      if (isLlm) {
        wrap.appendChild(h('p', { class: 'muted small-text' }, 'Generated by a language model for interview preparation. Calibrated to the stated role, level, and company domain.'));
      } else {
        wrap.appendChild(h('p', { class: 'muted small-text' }, 'Built from templates and the curated question bank, not by a language model. Add an API key in Settings or share to GitHub for an LLM answer.'));
      }
    }
    render();
    return wrap;
  }

  function communityView(params) {
    const openId = params.get('open');
    const f = { company: '', role: '', level: 0, domain: '', round: '' };
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

    const round = h('select', { id: 'c-round', onchange: function () { f.round = round.value; paint(); } },
      [h('option', { value: '' }, 'All rounds')].concat(meta.rounds.map(function (d) { return h('option', { value: d }, d); })));
    if (params.get('company')) { company.value = params.get('company'); f.company = company.value.trim().toLowerCase(); }

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
          (!f.level || p.level === f.level) && (!f.domain || p.domain === f.domain) && (!f.round || p.round === f.round);
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
          h('span', { class: 'badge' + (p.remote ? ' shared' : '') }, p.remote ? (p.review === 'approved' ? 'Reviewed' : 'Shared, unreviewed') : 'This device')));
      function build() {
        if (d.dataset.built) return;
        d.dataset.built = '1';
        const actions = h('div', { class: 'q-actions' });
        if (p.remote) {
          actions.appendChild(h('a', { class: 'btn small ghost', href: p.url, rel: 'noopener noreferrer' }, 'View on GitHub'));
          if (IGU.company && IGU.company.reportUrl) actions.appendChild(h('a', { class: 'btn small ghost', href: IGU.company.reportUrl(p, cfg), rel: 'noopener noreferrer', target: '_blank' }, 'Report outdated or PII'));
        }
        else {
          actions.appendChild(h('a', { class: 'btn small signal', href: shareUrl(p), rel: 'noopener noreferrer', target: '_blank' }, 'Share with the community'));
          actions.appendChild(h('button', { class: 'btn small danger-ghost', type: 'button', onclick: function () {
            if (!confirm('Delete this post from this device?')) return;
            posts.save(posts.all().filter(function (x) { return x.id !== p.id; })); paint();
          } }, 'Delete'));
        }
        const fr = IGU.company && IGU.company.freshness ? IGU.company.freshness(p) : null;
        d.appendChild(h('div', { class: 'q-body' },
          h('h4', null, 'Question'), h('p', { class: 'userq' }, p.question),
          h('p', { class: 'muted small-text' }, IGU.company.STATUS_TEXT[p.remote ? (p.review || 'unreviewed') : 'local'] + '. Reported by a community member, not confirmed by ' + p.company + '. Posted by ' + (p.author && p.author.name || 'unknown') + ' on ' + String(p.createdAt).slice(0, 10) + (fr && fr.id !== 'unknown' ? ' (' + fr.label + ')' : '') + '. Level: ' + levelLabel(p.level) + '.'),
          p.answer ? h('div', null, h('h4', null, 'Answer from the contributor'), h('p', { class: 'userq' }, p.answer)) : null,
          answerBlock(p), actions));
      }
      d.addEventListener('toggle', function () { if (d.open) build(); });
      if (open) build();
      return d;
    }

    app.appendChild(h('div', null,
      h('h1', null, 'Questions asked at real companies'),
      h('p', { class: 'lede' }, 'Questions that community members say they were asked. Filter by company, role, gear, domain and round. Answers are AI-generated study aids.'),
      h('div', { class: 'filters' },
        h('div', null, h('label', { for: 'c-company' }, 'Company'), company, datalist),
        h('div', null, h('label', { for: 'c-role' }, 'Role'), role),
        h('div', null, h('label', { for: 'c-level' }, 'Gear'), level),
        h('div', null, h('label', { for: 'c-domain' }, 'Domain'), domain),
        h('div', null, h('label', { for: 'c-round' }, 'Round'), round)),
      h('p', { class: 'muted small-text' }, 'These are reports from community members. Unless marked Reviewed, nobody has checked them, and the companies have not confirmed or endorsed any of it. ', h('a', { href: '#/company' }, 'Browse by company'), '.'),
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
  const providerSel = document.getElementById('set-provider');
  const keyInput = document.getElementById('set-key');
  const modelInput = document.getElementById('set-model');

  function updateSettingsPlaceholders() {
    if (!providerSel || !keyInput || !modelInput) return;
    const prov = providerSel.value;
    if (prov === 'gemini') {
      keyInput.placeholder = 'AIzaSy... (free key via aistudio.google.com)';
      modelInput.placeholder = 'gemini-2.5-flash (default)';
    } else if (prov === 'anthropic') {
      keyInput.placeholder = 'sk-ant-...';
      modelInput.placeholder = 'claude-sonnet-5-5 (default)';
    } else if (prov === 'openai') {
      keyInput.placeholder = 'sk-...';
      modelInput.placeholder = 'gpt-4o-mini (default)';
    }
  }
  if (providerSel) providerSel.addEventListener('change', updateSettingsPlaceholders);

  function openSettings() {
    const s = store.get('settings', {});
    if (providerSel) providerSel.value = s.provider || detectProvider(s) || 'gemini';
    if (keyInput) keyInput.value = s.key || '';
    if (modelInput) modelInput.value = s.model || '';
    updateSettingsPlaceholders();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  document.getElementById('open-settings').addEventListener('click', openSettings);
  dlg.addEventListener('close', function () {
    if (dlg.returnValue !== 'save') return;
    const prov = providerSel ? providerSel.value : 'gemini';
    store.set('settings', {
      provider: prov,
      key: keyInput ? keyInput.value.trim() : '',
      model: modelInput ? modelInput.value.trim() : ''
    });
    render();
  });
  document.getElementById('wipe').addEventListener('click', function () {
    if (!confirm('Delete your profile, posts, progress, notes, saved questions and API key from this browser? Download a backup from the Progress page first if you want to keep them.')) return;
    store.wipe();
    dlg.close('cancel');
    location.hash = '#/questions';
    location.reload();
  });

  const links = document.getElementById('foot-links');
  const repo = 'https://github.com/' + cfg.owner + '/' + cfg.repo;
  links.appendChild(h('a', { href: 'https://sadiqgpasha89.github.io', rel: 'noopener noreferrer' }, 'Portfolio'));
  links.appendChild(h('a', { href: repo, rel: 'noopener noreferrer' }, 'Source on GitHub'));
  links.appendChild(h('a', { href: repo + '/issues/new', rel: 'noopener noreferrer' }, 'Report a wrong answer'));

  /* Theme: Auto (follow OS) -> Light -> Dark. theme.js applies the saved choice before first paint. */
  const themeBtn = document.getElementById('theme-toggle');
  const THEMES = ['auto', 'light', 'dark'];
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
    if (themeBtn) {
      themeBtn.textContent = t === 'light' ? 'Light' : t === 'dark' ? 'Dark' : 'Auto';
      themeBtn.setAttribute('aria-label', 'Colour theme: ' + t + '. Click to change.');
      themeBtn.title = 'Theme: ' + t;
    }
  }
  if (themeBtn) {
    applyTheme(store.get('theme', 'auto'));
    themeBtn.addEventListener('click', function () {
      const cur = store.get('theme', 'auto');
      const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
      store.set('theme', next);
      applyTheme(next);
    });
  }

  /* Offline support: cache the app shell and question bank so it works on a flight or a patchy commute. */
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('Offline mode unavailable:', e); });
    });
  }

  /* Shared pieces for view files that register routes in IGU.routes (js/views.js). */
  IGU.ui = {
    h: h, md: md, store: store, bank: bank, today: today, roleName: roleName, levelLabel: levelLabel, gearBadge: gearBadge,
    go: go, render: render, answerBody: answerBody, notes: notes, done: done, touchActivity: touchActivity,
    openSettings: openSettings, fetchShared: fetchShared, localPosts: function () { return posts.all(); }, setCleanup: function (fn) { cleanup = fn; }, app: app, aiAvailable: function () { return !!store.get('settings', {}).key; }
  };

  /* Versioned, additive storage migration; a newer schema than this build knows is left alone. */
  try { IGU.migrate.run(store, today()); } catch (e) { console.warn('Storage migration skipped:', e); }

  /* Grouped menus: close on Escape or a click elsewhere. */
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    document.querySelectorAll('#tabs details.menu[open]').forEach(function (d) { d.removeAttribute('open'); const sm = d.querySelector('summary'); if (sm) sm.focus(); });
  });
  document.addEventListener('click', function (ev) {
    document.querySelectorAll('#tabs details.menu[open]').forEach(function (d) { if (!d.contains(ev.target)) d.removeAttribute('open'); });
  });

  let lastHash = location.hash;
  function onNav() {
    if (location.hash === lastHash) return;
    lastHash = location.hash;
    render(true);
  }
  window.addEventListener('hashchange', onNav);
  window.addEventListener('popstate', onNav);
  render(false);
})();
