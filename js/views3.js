/* Views for the coding lab (#/coding), company pages (#/company) and voice practice (#/voice).
   Registered in IGU.routes. Code runs only in an isolated worker (js/coding.js). No innerHTML. */
(function () {
  const IGU = window.IGU;
  IGU.routes = IGU.routes || {};
  const meta = IGU.meta, CO = IGU.company, VO = IGU.voice, Q = IGU.quality;
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
  const clock = function (s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  /* ================= Coding lab ================= */
  IGU.routes.coding = {
    title: 'Coding lab',
    render: function (params) {
      const u = ui(), h = u.h, store = u.store, app = u.app, md = u.md;
      const root = h('div', { class: 'plan-page' });
      fill(app, root);
      const problem = IGU.codingProblems.filter(function (p) { return p.id === params.get('p'); })[0];
      if (!problem) { index(); return; }
      lab(problem, ['practice', 'timed', 'review'].indexOf(params.get('mode')) >= 0 ? params.get('mode') : 'practice');

      function index() {
        const all = store.get('coding', {});
        fill(root, h('h1', null, 'Coding lab'),
          h('p', { class: 'lede' }, 'Small problems you solve in your own core language: JavaScript, TypeScript, Python, Java, C++, Go or C#. Pick the language on any problem. JavaScript code runs against tests in an isolated worker in your browser (no network or page access, 3 second limit). Other languages are editor-only practice. If you get stuck, press Show solution and it appears in the language you chose.'),
          IGU.coding.supported() ? null : h('p', { class: 'notice' }, 'This browser cannot run the isolated worker, so the lab is editor-only: write your solution and check it against the examples yourself.'),
          h('ul', { class: 'design-list' }, IGU.codingProblems.map(function (p) {
            const st = all[p.id] || {};
            return h('li', null, h('a', { href: '#/coding?p=' + p.id }, h('strong', null, p.title)),
              h('div', { class: 'muted small-text' }, p.topic + ' · ' + p.difficulty + (p.minutes ? ' · about ' + p.minutes + ' min' : '') + (p.jsOnly ? ' · JavaScript only' : '')),
              st.status === 'solved' ? h('span', { class: 'pill conf-high' }, 'solved') : st.runs ? h('span', { class: 'pill conf-medium' }, 'attempted') : null);
          })),
          h('p', { class: 'muted small-text' }, 'Only JavaScript can be run here: there is no safe in-browser runtime bundled for the other languages, so check those against the listed test cases yourself. Tests run in your own browser, so they are practice feedback, not a secure grading system. All problems and solutions are AI-drafted and not yet reviewed by a person.'));
      }

      function lab(p, mode) {
        const all = store.get('coding', {});
        const st = Object.assign({ code: '', status: '', runs: 0, hints: 0 }, all[p.id]);
        // Code is kept per language so switching never loses work. `code` stays the JavaScript text for older backups.
        const codes = {};
        if (st.codes && typeof st.codes === 'object') Object.keys(st.codes).forEach(function (k) { if (typeof st.codes[k] === 'string') codes[k] = st.codes[k]; });
        if (st.code && !codes.javascript) codes.javascript = st.code;
        const LANGS = IGU.codingLanguages, extra = IGU.codingLangs[p.id] || {};
        const findLang = function (id) { return LANGS.filter(function (l) { return l.id === id; })[0]; };
        let lang = (findLang(store.get('codingLang', 'javascript')) || LANGS[0]).id;
        const starterFor = function (l) { return l === 'javascript' || !(extra[l] && extra[l].starter) ? p.starter : extra[l].starter; };
        const solutionFor = function (l) { return l === 'javascript' ? p.solution.code : (extra[l] && extra[l].code) || ''; };
        const canRun = function () { return lang === 'javascript' && IGU.coding.supported(); };
        const save = function () {
          const cur = store.get('coding', {});
          const out = {};
          Object.keys(codes).forEach(function (k) { out[k] = String(codes[k]).slice(0, IGU.coding.MAX_CODE); });
          cur[p.id] = { code: out.javascript || '', codes: out, status: st.status, runs: st.runs, hints: st.hints, at: new Date().toISOString() };
          store.set('coding', cur);
        };
        let timer = null, deadline = 0, timeUp = false, gaveUp = false, timeout = null;
        u.setCleanup(function () { if (timer) clearInterval(timer); clearTimeout(timeout); });

        const results = h('div', { 'aria-live': 'polite' });
        const hintBox = h('div', { 'aria-live': 'polite' });
        const solBox = h('div', { 'aria-live': 'polite' });
        const clockEl = h('span', { class: 'timer', role: 'timer', 'aria-label': 'Time remaining' }, '');
        const editor = h('textarea', { id: 'code', class: 'code-editor', rows: '14', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', wrap: 'off', 'aria-label': 'Your solution. In JavaScript, press Control plus Enter to run the tests.' });
        editor.value = codes[lang] || starterFor(lang);

        const paintHints = function () {
          fill(hintBox, st.hints ? h('ol', { class: 'hint-list' }, p.hints.slice(0, st.hints).map(function (x) { return h('li', null, x); })) : null,
            st.hints < p.hints.length ? h('button', { class: 'btn small', type: 'button', onclick: function () { st.hints++; save(); paintHints(); } }, 'Show hint ' + (st.hints + 1) + ' of ' + p.hints.length) : null);
        };
        const solutionAllowed = function () { return mode === 'review' || st.status === 'solved' || gaveUp || (mode === 'timed' ? timeUp : false) || (mode === 'practice' && false); };
        const paintSolution = function () {
          if (!solutionAllowed()) {
            fill(solBox, h('button', { class: 'btn small primary', type: 'button', onclick: function () {
              if (mode === 'timed' && !confirm('End the timed attempt and show the solution?')) return;
              gaveUp = true; paintSolution();
            } }, 'Show solution (' + findLang(lang).label + ')'));
            return;
          }
          const code = solutionFor(lang);
          fill(solBox, h('h2', null, 'Solution walkthrough'), md(p.solution.explanation), h('p', null, h('strong', null, 'Complexity: '), p.solution.complexity),
            h('p', null, h('strong', null, 'Edge cases: ')), h('ul', null, p.solution.edgeCases.map(function (x) { return h('li', null, x); })),
            h('h3', null, 'Solution in ' + findLang(lang).label),
            code ? h('pre', { class: 'code', 'data-lang': lang }, code) : h('p', { class: 'notice' }, 'No ' + findLang(lang).label + ' solution is available for this problem yet. Pick another language to see one.'),
            h('p', { class: 'muted small-text' }, 'AI-drafted reference solution' + (lang === 'csharp' ? ' (not compiled or run)' : '') + ', not yet reviewed by a person. Other correct solutions exist.'));
        };

        const run = async function () {
          if (!canRun()) return;
          codes[lang] = editor.value; st.code = codes.javascript || ''; st.runs++; save();
          fill(results, h('p', { class: 'muted' }, 'Running...'));
          const r = await IGU.coding.run(codes.javascript, p);
          const wasSolved = st.status === 'solved';
          if (r.state === 'done' && !r.error && r.passed === r.total) st.status = 'solved'; else if (!wasSolved) st.status = 'attempted';
          save(); if (st.status === 'solved' && !wasSolved) u.touchActivity();
          fill(results,
            r.error ? h('p', { class: 'notice bad', role: 'alert' }, (r.state === 'timeout' ? 'Time limit: ' : r.state === 'crash' ? 'Runner error: ' : 'Your code did not run: ') + r.error) :
              h('p', { class: r.passed === r.total ? 'notice ok' : 'notice' }, r.passed + ' of ' + r.total + ' tests passed.' + (r.passed === r.total ? ' Solved.' : (function () {
                const fi = r.results.findIndex(function (x) { return !x.pass; });
                return fi < 0 ? '' : ' First failure: test ' + (fi + 1) + (r.results[fi].error ? ' threw ' + r.results[fi].error : ' returned ' + r.results[fi].got + ' instead of ' + r.results[fi].expected) + '.';
              })())),
            r.results.length ? h('ul', { class: 'res-list' }, r.results.map(function (x, i) {
              const t = p.tests[i];
              return h('li', null, h('strong', null, (x.pass ? 'Pass' : 'Fail') + ' · '), h('code', null, p.fn + '(' + t.args.map(function (a) { return JSON.stringify(a); }).join(', ') + ')'),
                x.pass ? null : h('div', { class: 'muted small-text' }, x.error ? 'Error: ' + x.error : 'Got ' + x.got + ', expected ' + x.expected));
            })) : null,
            r.logs.length ? h('details', null, h('summary', null, 'Console output (' + r.logs.length + ')'), h('pre', { class: 'code' }, r.logs.join('\n'))) : null,
            r.state === 'done' ? (function () {
              const fb = IGU.codingCore.review(codes.javascript, p, r);
              return h('details', { class: 'feedback', open: r.passed === r.total },
                h('summary', null, 'Feedback on this attempt'),
                h('table', { class: 'rubric' }, h('caption', { class: 'sr-only' }, 'Coding rubric'),
                  h('tbody', null, fb.dims.map(function (d) {
                    return h('tr', null, h('th', { scope: 'row' }, d.label), h('td', { class: 'lv l' + d.level }, IGU.mock.LEVELS[d.level]), h('td', null, h('span', { class: 'why' }, d.why + ' '), d.level < 3 ? d.note : null));
                  }))),
                fb.actions.length ? h('div', { class: 'next-actions' }, h('h4', null, 'Next steps'), h('ol', null, fb.actions.map(function (a) { return h('li', null, a); }))) : null,
                h('p', { class: 'muted small-text' }, 'Correctness and edge cases come from the tests. Complexity, decomposition and quality are hints read from your code, not proof. Testing and explaining your approach aloud are up to you: say which extra cases you would test.'));
            })() : null);
          paintSolution();
        };
        editor.addEventListener('input', function () { codes[lang] = editor.value; clearTimeout(timeout); timeout = setTimeout(save, 400); });
        editor.addEventListener('keydown', function (ev) { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); run(); } });

        // Language switcher: keep each language's code, swap the editor, and repaint everything that depends on the language.
        const controls = h('div'), actions = h('div');
        const testList = function () {
          return h('ul', null, p.tests.map(function (t) { return h('li', null, h('code', null, p.fn + '(' + t.args.map(function (a) { return JSON.stringify(a); }).join(', ') + ')'), ' should return ', h('code', null, JSON.stringify(t.expected))); }));
        };
        const paintControls = function () {
          const langSel = h('select', { id: 'lang', 'aria-label': 'Programming language', onchange: function (ev) {
            codes[lang] = editor.value; save();
            lang = ev.target.value; store.set('codingLang', lang);
            editor.value = codes[lang] || starterFor(lang);
            fill(results);
            paintControls(); paintSolution();
            const again = document.getElementById('lang'); if (again) again.focus();
          } }, LANGS.map(function (l) { return h('option', { value: l.id, selected: l.id === lang }, l.label + (l.runnable ? ' (runs tests)' : ' (editor only)')); }));
          fill(controls,
            h('p', null, h('label', { for: 'lang' }, 'Language '), langSel),
            lang !== 'javascript' && !(extra[lang] && extra[lang].code) ? h('p', { class: 'notice' }, 'This problem has no ' + findLang(lang).label + ' starter or solution yet, only JavaScript. You can still write your answer here; the editor starts from the JavaScript starter and Show solution shows JavaScript.') : null,
            lang !== 'javascript' ? h('p', { class: 'notice' }, 'Tests only run for JavaScript. In ' + findLang(lang).label + ' write your solution in the editor and compare it with the test cases below. Stuck? Press Show solution to see it in ' + findLang(lang).label + '.') : null,
            lang === 'javascript' && !IGU.coding.supported() ? h('p', { class: 'notice' }, 'Editor-only: this browser cannot run the isolated worker. Check your code against the tests below by hand.') : null);
          fill(actions,
            h('div', { class: 'q-actions' },
              canRun() ? h('button', { class: 'btn primary', type: 'button', onclick: run }, 'Run tests') : null,
              h('button', { class: 'btn ghost', type: 'button', onclick: function () { if (confirm('Replace your ' + findLang(lang).label + ' code with the starter?')) { editor.value = starterFor(lang); codes[lang] = editor.value; save(); } } }, 'Reset code'),
              canRun() ? h('span', { class: 'kbd-hint' }, h('kbd', null, 'Ctrl'), '+', h('kbd', null, 'Enter'), ' run') : null),
            canRun() ? null : testList());
        };

        if (mode === 'timed') {
          deadline = Date.now() + 20 * 60000;
          const tick = function () {
            const left = (deadline - Date.now()) / 1000;
            clockEl.textContent = left > 0 ? clock(left) + ' left' : 'Time is up';
            if (left <= 0 && !timeUp) { timeUp = true; clearInterval(timer); paintSolution(); }
          };
          tick(); timer = setInterval(tick, 500);
        }

        const modeLink = function (m, label) { return h('a', { class: 'btn small' + (m === mode ? ' primary' : ' ghost'), href: '#/coding?p=' + p.id + '&mode=' + m, 'aria-current': m === mode ? 'true' : null }, label); };
        fill(root,
          h('p', null, h('a', { href: '#/coding' }, '← All problems')),
          h('h1', null, p.title), h('p', { class: 'muted small-text' }, p.topic + ' · ' + p.difficulty + (p.minutes ? ' · about ' + p.minutes + ' min to solve and explain' : '')),
          p.target ? h('p', { class: 'small-text' }, h('strong', null, 'Aim for: '), p.target + '.') : null,
          h('div', { class: 'q-actions' }, modeLink('practice', 'Practice'), modeLink('timed', 'Timed (20 min)'), modeLink('review', 'Review'), clockEl),
          md(p.statement),
          h('h2', null, 'Constraints'), h('ul', null, p.constraints.map(function (c) { return h('li', null, c); })),
          h('h2', null, 'Examples'), h('pre', { class: 'code' }, p.examples.map(function (e) { return e.input + '  // ' + e.output; }).join('\n')),
          mode === 'review' ? null : h('section', null,
            h('h2', null, 'Your solution'),
            controls,
            editor,
            actions,
            results),
          mode === 'review' ? null : h('section', null, h('h2', null, 'Hints'), hintBox),
          h('section', null, solBox));
        paintControls(); paintHints(); paintSolution();
      }
    }
  };

  /* ================= Company pages ================= */
  IGU.routes.company = {
    title: 'Companies',
    render: function (params) {
      const u = ui(), h = u.h, app = u.app;
      const root = h('div', { class: 'plan-page' });
      fill(app, root);
      const name = params.get('name');
      const status = h('p', { class: 'muted', 'aria-live': 'polite' }, 'Loading community reports...');
      fill(root, h('h1', null, name || 'Companies'), status);
      const done = function (remote, err) {
        const posts = u.localPosts().concat(remote);
        const seen = {}; const uniq = posts.filter(function (p) { if (seen[p.id]) return false; seen[p.id] = 1; return true; });
        const disclaimer = h('p', { class: 'notice' },
          h('strong', null, 'Community experiences, not official company policy. '),
          'Everything below comes from community members. Unless marked Reviewed by a maintainer, nobody has verified it, and no company has endorsed it. Confidential or personally identifying details are not permitted.');
        if (!name) {
          const allList = CO.companies(uniq);
          const qIn = h('input', { id: 'co-q', type: 'search', placeholder: 'Filter companies...', 'aria-label': 'Filter companies' });
          const revOnly = h('input', { id: 'co-rev', type: 'checkbox' });
          const listEl = h('div', { 'aria-live': 'polite' });
          const paintIndex = function () {
            const q = qIn.value.trim().toLowerCase();
            const filtered = allList.filter(function (c) {
              if (revOnly.checked && !c.reviewed) return false;
              return !q || c.name.toLowerCase().indexOf(q) >= 0;
            });
            fill(listEl, filtered.length ? h('ul', { class: 'design-list' }, filtered.map(function (c) {
              return h('li', null, h('a', { href: '#/company?name=' + encodeURIComponent(c.name) }, h('strong', null, c.name)),
                h('div', { class: 'muted small-text' }, c.count + ' report' + (c.count === 1 ? '' : 's') + ' · ' + c.reviewed + ' reviewed' + (c.latestAt ? ' · latest ' + c.latestAt : '')));
            })) : h('p', { class: 'muted' }, allList.length ? 'No companies match that filter.' : ['No company reports yet. ', h('a', { href: '#/post' }, 'Post a question you were asked'), ' (describe it in your own words; no confidential or NDA material).']));
          };
          qIn.addEventListener('input', paintIndex);
          revOnly.addEventListener('change', paintIndex);
          fill(root, h('h1', null, 'Companies'), disclaimer, err ? h('p', { class: 'notice' }, 'Showing what is on this device. ' + err) : null,
            allList.length ? h('div', { class: 'drill-filters' },
              h('div', null, h('label', { for: 'co-q', class: 'sr-only' }, 'Search companies'), qIn),
              h('label', { class: 'chk' }, revOnly, ' Has maintainer-reviewed reports')) : null,
            listEl);
          paintIndex();
          return;
        }
        const s = CO.summarize(uniq, name);
        const chips = function (arr, label, map) { return arr.length ? h('p', null, h('strong', null, label + ': '), arr.map(function (x) { return (map ? map(x.label) : x.label) + ' (' + x.count + ')'; }).join(', ')) : null; };
        const fRole = h('select', { id: 'co-role', 'aria-label': 'Filter by role' }, [h('option', { value: '' }, 'All roles')].concat(meta.roles.map(function (r) { return h('option', { value: r.id }, r.name); })));
        const fLevel = h('select', { id: 'co-level', 'aria-label': 'Filter by gear' }, [h('option', { value: '' }, 'All gears')].concat(meta.levels.map(function (l) { return h('option', { value: String(l.n) }, 'Gear ' + l.n + ': ' + l.name); })));
        const fRound = h('select', { id: 'co-round', 'aria-label': 'Filter by round' }, [h('option', { value: '' }, 'All rounds')].concat(meta.rounds.map(function (r) { return h('option', { value: r }, r); })));
        const fFresh = h('select', { id: 'co-fresh', 'aria-label': 'Filter by date' }, [
          h('option', { value: '' }, 'All dates'),
          h('option', { value: 'recent' }, 'Last 6 months'),
          h('option', { value: '18m' }, 'Last 18 months'),
          h('option', { value: 'stale' }, 'Older than 18 months')
        ]);
        const fStatus = h('select', { id: 'co-status', 'aria-label': 'Filter by verification status' }, [
          h('option', { value: '' }, 'All verification statuses'),
          h('option', { value: 'approved' }, 'Reviewed by maintainer only'),
          h('option', { value: 'unreviewed' }, 'Unreviewed / awaiting review')
        ]);
        const repBox = h('div', { 'aria-live': 'polite' });
        const paintReports = function () {
          const shown = CO.filter(s.items, { role: fRole.value, level: fLevel.value, round: fRound.value, freshness: fFresh.value, status: fStatus.value });
          fill(repBox,
            h('p', { class: 'muted small-text' }, 'Showing ' + shown.length + ' of ' + s.total + ' report' + (s.total === 1 ? '' : 's') + '.'),
            shown.length ? h('ul', { class: 'story-list' }, shown.map(function (p) {
              const st = CO.statusOf(p);
              const fr = CO.freshness(p);
              const dateBits = [p.year ? 'Asked ' + p.year : '', p.createdAt ? 'Reported ' + String(p.createdAt).slice(0, 10) : ''].filter(Boolean).join(' · ');
              return h('li', null,
                h('div', { class: 'story-h' }, h('strong', null, p.question.slice(0, 160)), ' ',
                  h('span', { class: 'pill ' + (st === 'approved' ? 'conf-high' : 'conf-medium') }, CO.STATUS_TEXT[st]), ' ',
                  fr.id !== 'unknown' ? h('span', { class: 'pill ' + (fr.stale ? 'rd-needs-practice' : 'conf-high') }, fr.label) : null),
                h('div', { class: 'muted small-text' }, [u.roleName(p.role), 'Gear ' + p.level, p.round, p.domain, dateBits].filter(Boolean).join(' · ')),
                h('div', { class: 'q-actions' },
                  p.remote && /^https:\/\/github\.com\//.test(String(p.url || '')) ? h('a', { class: 'small-text', href: p.url, rel: 'noopener noreferrer', target: '_blank' }, 'Source: GitHub issue') : null,
                  p.remote ? h('a', { class: 'small-text', href: CO.reportUrl(p, IGU.config), rel: 'noopener noreferrer', target: '_blank' }, 'Report outdated, duplicate or PII') : null));
            })) : h('p', { class: 'muted' }, s.total ? 'No reports match those filters.' : 'No reports for this company yet.'));
        };
        [fRole, fLevel, fRound, fFresh, fStatus].forEach(function (el) { el.addEventListener('change', paintReports); });

        fill(root, h('p', null, h('a', { href: '#/company' }, '← All companies')), h('h1', null, s.name), disclaimer,
          err ? h('p', { class: 'notice' }, 'Showing what is on this device. ' + err) : null,
          s.total ? h('p', null, s.total + ' report' + (s.total === 1 ? '' : 's') + ' · ' + s.reviewed + ' reviewed by a maintainer · ' + s.recentCount + ' recent (last 6 months)' + (s.staleCount ? ' · ' + s.staleCount + ' older than 18 months' : '') + '.') : h('p', { class: 'muted' }, 'No reports for this company yet.'),
          s.duplicatePairs.length ? h('p', { class: 'notice' }, s.duplicatePairs.length + ' possible duplicate report pair(s) detected here. Maintainers can mark duplicates on GitHub.') : null,
          chips(s.rounds, 'Rounds mentioned'), chips(s.roles, 'Roles', function (id) { return u.roleName(id); }), chips(s.levels, 'Gears'), chips(s.domains, 'Domains'),
          h('h2', null, 'Official & general preparation checklist'),
          h('p', { class: 'muted small-text' }, 'Official guidance comes first; community reports below are unverified individual experiences, never company policy.'),
          h('ul', null, CO.checklist(s).map(function (c) { return h('li', null, c); })),
          h('p', null, h('a', { class: 'btn', href: '#/community?company=' + encodeURIComponent(s.name) }, 'Filter the community board'), ' ', h('a', { class: 'btn ghost', href: '#/plan' }, 'Open my plan')),
          h('h2', null, 'Community reports'),
          s.total ? h('div', { class: 'filters' },
            h('div', null, h('label', { for: 'co-role' }, 'Role'), fRole),
            h('div', null, h('label', { for: 'co-level' }, 'Gear'), fLevel),
            h('div', null, h('label', { for: 'co-round' }, 'Round'), fRound),
            h('div', null, h('label', { for: 'co-fresh' }, 'Freshness'), fFresh),
            h('div', null, h('label', { for: 'co-status' }, 'Verification'), fStatus)) : null,
          repBox);
        paintReports();
      };
      u.fetchShared().then(function (items) { done(items, ''); }, function (e) { done([], e.message || 'Could not load shared reports.'); });
    }
  };

  /* ================= Voice practice ================= */
  IGU.routes.voice = {
    title: 'Voice practice',
    render: function () {
      const u = ui(), h = u.h, store = u.store, app = u.app;
      const day = u.today();
      const root = h('div', { class: 'plan-page' });
      fill(app, root);
      const prompts = u.bank.filter(function (e) { return Q.isReal(e); }).slice(0, 400).map(function (e) { return { id: e.id, q: e.q, e: e }; });
      const qSel = h('select', { id: 'vp-q', 'aria-label': 'Question' }, prompts.map(function (p) { return h('option', { value: p.id }, p.q.slice(0, 110)); }));
      const transcript = h('textarea', { id: 'vp-text', rows: '8', maxlength: '4000', placeholder: 'Type your answer, or press Start dictation and speak. You can edit the text before anything is analyzed.', 'aria-label': 'Transcript' });
      const clockEl = h('span', { class: 'timer', role: 'timer', 'aria-label': 'Elapsed time' }, '0:00');
      const out = h('div', { 'aria-live': 'polite' });
      const msg = h('p', { class: 'notice', hidden: true, role: 'status' });
      const keep = h('input', { type: 'checkbox', id: 'vp-keep' });
      let t0 = 0, elapsed = 0, timer = null, rec = null, listening = false;
      u.setCleanup(function () { if (timer) clearInterval(timer); if (rec) { try { rec.abort(); } catch (e) { /* stopped */ } } });
      const current = function () { return prompts.filter(function (p) { return p.id === qSel.value; })[0]; };
      const stopTimer = function () { if (timer) { clearInterval(timer); timer = null; elapsed += (Date.now() - t0) / 1000; } };
      const startTimer = function () { if (timer) return; t0 = Date.now(); timer = setInterval(function () { clockEl.textContent = clock(elapsed + (Date.now() - t0) / 1000); }, 500); };
      const total = function () { return elapsed + (timer ? (Date.now() - t0) / 1000 : 0); };

      const Ctor = VO.recognitionCtor();
      const micBtn = Ctor ? h('button', { class: 'btn', type: 'button', onclick: function () {
        if (listening) { rec.stop(); return; }
        if (!store.get('voiceConsent', false)) {
          if (!confirm('Dictation uses your browser\'s speech recognition. In Chrome and some other browsers the audio is sent to a cloud speech service run by the browser vendor. This site never receives or stores audio. Continue?')) return;
          store.set('voiceConsent', true);
        }
        rec = new Ctor(); rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US';
        rec.onresult = function (ev) { let add = ''; for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) add += ev.results[i][0].transcript + ' '; if (add) { transcript.value = (transcript.value + ' ' + add).trim().slice(0, 4000); } };
        rec.onend = function () { listening = false; micBtn.textContent = 'Start dictation'; stopTimer(); };
        rec.onerror = function (ev) { msg.className = 'notice bad'; msg.textContent = ev.error === 'not-allowed' ? 'Microphone permission was denied. You can type your answer instead.' : 'Dictation stopped: ' + (ev.error || 'unknown error') + '. You can type your answer instead.'; msg.hidden = false; };
        try { rec.start(); listening = true; micBtn.textContent = 'Stop dictation'; startTimer(); msg.hidden = true; } catch (e) { msg.textContent = 'Could not start dictation. You can type your answer instead.'; msg.hidden = false; }
      } }, 'Start dictation') : null;

      const analyze = function () {
        stopTimer();
        const p = current(), text = transcript.value.trim();
        if (text.length < 10) { fill(out, h('p', { class: 'notice' }, 'Write or dictate an answer first.')); return; }
        const secs = total();
        const r = VO.review(text, secs, p.e);
        const mt = r.metrics;
        if (keep.checked) {
          const hist = (store.get('voice', []) || []).filter(function (x) { return x.at !== day + p.id; });
          hist.unshift({ at: day + p.id, day: day, qid: p.id, q: p.q, seconds: Math.round(secs), transcript: text, words: mt.words, fillers: mt.fillers });
          store.set('voice', hist.slice(0, 30)); u.touchActivity(); paintHist();
        }
        fill(out, h('h2', null, 'Your answer'),
          h('ul', null, h('li', null, 'Time: ' + clock(secs) + ', ' + mt.words + ' words'), r.notes.map(function (n) { return h('li', null, n); })),
          r.rubric && !r.rubric.empty ? h('div', null, h('h3', null, 'Structure checks'), h('table', { class: 'rubric' }, h('tbody', null, r.rubric.dims.map(function (d) { return h('tr', null, h('th', { scope: 'row' }, d.label), h('td', { class: 'lv l' + d.level }, IGU.mock.LEVELS[d.level]), h('td', null, d.note)); })))) : null,
          h('p', { class: 'muted small-text' }, 'These checks look at the words and timing only. They say nothing about you as a person, and they are not a prediction of any interview.'),
          h('p', null, h('a', { href: '#/q/' + p.id }, 'Open the reference answer')));
      };
      const aiMsg = h('p', { class: 'notice bad', role: 'alert', hidden: true }), aiOut = h('div', { class: 'ai-feedback', hidden: true });
      const aiCancel = h('button', { class: 'btn small ghost', type: 'button', hidden: true }, 'Cancel');
      let aiCtl = null;
      aiCancel.addEventListener('click', function () { if (aiCtl) aiCtl.abort(); });
      const aiBtn = h('button', { class: 'btn', type: 'button', onclick: async function () {
        if (!u.aiAvailable()) { u.openSettings(); return; }
        const text = transcript.value.trim();
        if (text.length < 10) return;
        if (!confirm('The question and your transcript text will be sent to your AI provider using your own key (not audio). It may be billed to you. Continue?')) return;
        aiCtl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        aiBtn.disabled = true; aiMsg.hidden = true; aiCancel.hidden = false;
        try {
          const res = await IGU.ai.ask({ settings: store.get('settings', {}), system: VO.AI_SYSTEM, prompt: VO.aiPrompt(current().q, text), signal: aiCtl ? aiCtl.signal : undefined });
          const metaTxt = [res.provider, res.model, res.at ? res.at.slice(0, 10) : '', res.usage ? (res.usage.inputTokens + res.usage.outputTokens) + ' tokens' : ''].filter(Boolean).join(' · ');
          fill(aiOut, h('p', { class: 'muted small-text' }, 'AI feedback (' + metaTxt + '). A study aid, not a rating or a prediction.'),
            res.truncated ? h('p', { class: 'notice' }, 'Output hit the token limit and may be truncated.') : null,
            u.md(res.text),
            h('button', { class: 'btn small ghost', type: 'button', onclick: function () { fill(aiOut); aiOut.hidden = true; } }, 'Dismiss'));
          aiOut.hidden = false;
        } catch (e) { aiMsg.textContent = e.message; aiMsg.hidden = false; }
        aiBtn.disabled = false; aiCancel.hidden = true;
      } }, u.aiAvailable() ? 'AI feedback on the text' : 'Add API key for AI feedback');

      const histBox = h('div');
      const paintHist = function () {
        const hist = store.get('voice', []) || [];
        fill(histBox, hist.length ? h('section', { class: 'mock-history' }, h('h2', null, 'Saved transcripts'), h('ul', { class: 'res-list' }, hist.map(function (x, i) {
          return h('li', null, h('details', null, h('summary', null, x.day + ': ' + x.q.slice(0, 80)), h('p', { class: 'userq plain' }, x.transcript), h('p', { class: 'muted small-text' }, clock(x.seconds) + ', ' + x.words + ' words, ' + x.fillers + ' filler words')),
            h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Delete transcript from ' + x.day, onclick: function () { const n = hist.slice(); n.splice(i, 1); store.set('voice', n); paintHist(); } }, 'Delete'));
        })), h('div', { class: 'q-actions' },
          h('button', { class: 'btn small', type: 'button', onclick: function () { download('voice-transcripts.json', JSON.stringify(hist, null, 2), 'application/json'); } }, 'Export'),
          h('button', { class: 'btn small ghost', type: 'button', onclick: function () { if (confirm('Delete all saved transcripts?')) { store.set('voice', []); paintHist(); } } }, 'Delete all'))) : null);
      };
      fill(root, h('h1', null, 'Voice practice'),
        h('p', { class: 'lede' }, 'Answer out loud, then review the text of your answer. Dictation is optional; typing works the same way. Nothing is saved unless you tick the box below.'),
        h('div', { class: 'field' }, h('label', { for: 'vp-q' }, 'Question'), qSel),
        h('div', { class: 'q-actions' }, micBtn, h('button', { class: 'btn ghost', type: 'button', onclick: function () { timer ? stopTimer() : startTimer(); } }, 'Start / pause timer'), clockEl,
          h('button', { class: 'btn ghost', type: 'button', onclick: function () { stopTimer(); elapsed = 0; clockEl.textContent = '0:00'; transcript.value = ''; fill(out); aiOut.hidden = true; } }, 'Clear')),
        Ctor ? null : h('p', { class: 'muted small-text' }, 'This browser has no speech recognition, so dictation is unavailable. Type your answer.'),
        msg, h('div', { class: 'field' }, h('label', { for: 'vp-text' }, 'Transcript (editable)'), transcript),
        h('label', { class: 'chk' }, keep, ' Save this transcript in my history on this device (off by default)'),
        h('div', { class: 'q-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: analyze }, 'Review my answer'), aiBtn, aiCancel),
        out, aiMsg, aiOut,
        histBox);
      paintHist();
    }
  };
})();
