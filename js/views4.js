/* Views for learner-made learning paths (#/paths) and optional private sync (#/sync). Registered in IGU.routes.
   Paths are stored in this browser only. Sync is off until the learner turns it on; see docs/THREAT_MODEL.md. No innerHTML. */
(function () {
  const IGU = window.IGU;
  IGU.routes = IGU.routes || {};
  const PA = IGU.paths, SY = IGU.sync, Q = IGU.quality;
  const ui = function () { return IGU.ui; };
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

  /* ================= Learning paths ================= */
  IGU.routes.paths = {
    title: 'Learning paths',
    render: function (params) {
      const u = ui(), h = u.h, store = u.store, app = u.app, bank = u.bank;
      const byId = {}; bank.forEach(function (e) { byId[e.id] = e; });
      const known = new Set(Object.keys(byId));
      const load = function () { return (store.get('paths', []) || []).map(function (p) { return PA.clean(p, known).path; }); };
      const save = function (list) { store.set('paths', list.slice(0, PA.MAX_PATHS)); };
      const root = h('div', { class: 'plan-page' });
      fill(app, root);
      const open = load().filter(function (p) { return p.id === params.get('p'); })[0];
      if (open) detail(open.id); else index();

      function bar(p) {
        const pr = PA.progress(p, byId, store.get('done', {}));
        return h('span', { class: 'muted small-text' }, pr.prepared + ' of ' + pr.total + ' prepared' + (pr.real < pr.total ? ' · ' + (pr.total - pr.real) + ' without a written answer yet' : ''));
      }

      function index() {
        const mine = load();
        const msg = h('p', { class: 'notice bad', role: 'alert', hidden: true });
        const fileIn = h('input', { type: 'file', accept: 'application/json,.json', id: 'path-file', class: 'sr-only' });
        fileIn.addEventListener('change', function () {
          const f = fileIn.files && fileIn.files[0]; if (!f) return;
          const rd = new FileReader();
          rd.onload = function () {
            const r = PA.importPath(String(rd.result), known);
            if (r.error) { msg.textContent = r.error; msg.hidden = false; return; }
            save(load().concat([r.path]));
            u.go('#/paths?p=' + r.path.id);
          };
          rd.readAsText(f);
        });
        fill(root, h('h1', null, 'Learning paths'),
          h('p', { class: 'lede' }, 'Put questions in the order you want to study them. Paths are stored in this browser and are part of your backup. You can export one as a file to share or to suggest it to the project.'),
          msg,
          h('div', { class: 'q-actions' },
            h('button', { class: 'btn primary', type: 'button', onclick: function () {
              const np = PA.newPath(); np.title = 'My path';
              save(load().concat([np])); u.go('#/paths?p=' + np.id);
            } }, 'New path'),
            h('button', { class: 'btn ghost', type: 'button', onclick: function () { fileIn.value = ''; fileIn.click(); } }, 'Import a path file'),
            h('label', { for: 'path-file', class: 'sr-only' }, 'Learning path file'), fileIn),
          h('h2', null, 'Your paths'),
          mine.length ? h('ul', { class: 'design-list' }, mine.map(function (p) {
            return h('li', null, h('a', { href: '#/paths?p=' + p.id }, h('strong', null, p.title || 'Untitled path')), ' ', bar(p));
          })) : h('p', { class: 'muted' }, 'You have no paths yet. Start a new one, or copy a starter path below.'),
          h('h2', null, 'Starter paths'),
          h('p', { class: 'muted small-text' }, 'Assembled by AI from questions that have written answers. A person has not reviewed them. Copy one to make it yours.'),
          h('ul', { class: 'design-list' }, (IGU.starterPaths || []).map(function (sp) {
            const c = PA.clean(sp, known).path;
            return h('li', null, h('strong', null, sp.title), ' ', h('span', { class: 'muted small-text' }, c.ids.length + ' questions'),
              h('div', { class: 'muted small-text' }, sp.note),
              h('div', { class: 'q-actions' }, h('button', { class: 'btn small', type: 'button', onclick: function () {
                const np = Object.assign(PA.newPath(), { title: c.title, note: c.note, ids: c.ids });
                save(load().concat([np])); u.go('#/paths?p=' + np.id);
              } }, 'Copy to my paths')));
          })));
      }

      function detail(id) {
        const p0 = load().filter(function (x) { return x.id === id; })[0];
        let p = p0;
        const persist = function () { save(load().map(function (x) { return x.id === p.id ? PA.clean(p, known).path : x; })); };
        const title = h('input', { id: 'pa-title', maxlength: '100', value: p.title });
        const note = h('textarea', { id: 'pa-note', rows: '2', maxlength: '500' }); note.value = p.note;
        title.addEventListener('change', function () { p.title = title.value; persist(); });
        note.addEventListener('change', function () { p.note = note.value; persist(); });
        const listEl = h('div', { 'aria-live': 'polite' });
        const results = h('div', { 'aria-live': 'polite' });
        const search = h('input', { id: 'pa-search', type: 'search', placeholder: 'Search the question bank to add', 'aria-label': 'Search the question bank to add' });
        search.addEventListener('input', function () {
          const t = search.value.trim().toLowerCase();
          if (t.length < 3) { fill(results); return; }
          const hits = bank.filter(function (e) { return p.ids.indexOf(e.id) < 0 && (e.q + ' ' + e.topic + ' ' + (e.tags || []).join(' ')).toLowerCase().indexOf(t) >= 0; })
            .sort(function (a, b) { return Number(!Q.isPlaceholder(b)) - Number(!Q.isPlaceholder(a)); }).slice(0, 8);
          fill(results, hits.length ? h('ul', { class: 'plain-list' }, hits.map(function (e) {
            return h('li', null, h('button', { class: 'btn small', type: 'button', 'aria-label': 'Add: ' + e.q, onclick: function () {
              if (p.ids.length >= PA.MAX_IDS) return; p.ids = p.ids.concat([e.id]); persist(); paint(); search.dispatchEvent(new Event('input'));
            } }, 'Add'), ' ', u.gearBadge(e.level), ' ', e.q, Q.isPlaceholder(e) ? h('span', { class: 'muted small-text' }, ' (no written answer yet)') : null);
          })) : h('p', { class: 'muted small-text' }, 'No matching questions that are not already in the path.'));
        });
        function move(i, d) { const j = i + d; if (j < 0 || j >= p.ids.length) return; const a = p.ids.slice(); const t = a[i]; a[i] = a[j]; a[j] = t; p.ids = a; persist(); paint(); }
        function paint() {
          const done = store.get('done', {});
          const pr = PA.progress(p, byId, done);
          fill(listEl,
            h('p', null, bar(p), pr.next ? [' · ', h('a', { class: 'btn small primary', href: '#/q/' + pr.next }, 'Study the next one')] : (p.ids.length ? ' · All prepared.' : '')),
            p.ids.length ? h('ol', { class: 'path-list' }, p.ids.map(function (qid, i) {
              const e = byId[qid];
              return h('li', null,
                h('span', { class: done[qid] ? 'path-done' : '' }, done[qid] ? 'Prepared: ' : '', h('a', { href: '#/q/' + qid }, e ? e.q : qid), e && Q.isPlaceholder(e) ? h('span', { class: 'muted small-text' }, ' (no written answer yet)') : null),
                h('span', { class: 'q-actions' },
                  h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Move up: ' + (e ? e.q : qid), disabled: i === 0, onclick: function () { move(i, -1); } }, 'Up'),
                  h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Move down: ' + (e ? e.q : qid), disabled: i === p.ids.length - 1, onclick: function () { move(i, 1); } }, 'Down'),
                  h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Remove: ' + (e ? e.q : qid), onclick: function () { p.ids = p.ids.filter(function (x) { return x !== qid; }); persist(); paint(); } }, 'Remove')));
            })) : h('p', { class: 'muted' }, 'This path is empty. Search below to add questions.'));
        }
        fill(root, h('p', null, h('a', { href: '#/paths' }, 'All paths')), h('h1', null, 'Edit path'),
          h('div', { class: 'field' }, h('label', { for: 'pa-title' }, 'Title'), title),
          h('div', { class: 'field' }, h('label', { for: 'pa-note' }, 'Note ', h('span', { class: 'hint' }, '(optional)')), note),
          listEl,
          h('h2', null, 'Add questions'), search, results,
          h('div', { class: 'q-actions' },
            h('button', { class: 'btn', type: 'button', onclick: function () { p.title = title.value; p.note = note.value; persist(); download('learning-path-' + p.id + '.json', JSON.stringify(PA.exportPath(p), null, 2), 'application/json'); } }, 'Export as file'),
            h('a', { class: 'btn ghost', href: 'https://github.com/' + IGU.config.owner + '/' + IGU.config.repo + '/issues/new?template=learning-path.yml', target: '_blank', rel: 'noopener noreferrer' }, 'Suggest to the project'),
            h('button', { class: 'btn ghost', type: 'button', onclick: function () {
              if (!confirm('Delete this path? The questions themselves are not affected.')) return;
              save(load().filter(function (x) { return x.id !== p.id; })); u.go('#/paths');
            } }, 'Delete path')),
          h('p', { class: 'muted small-text' }, 'Suggesting a path opens a GitHub issue form. Paste the exported file there; nothing is sent from this page.'));
        paint();
      }
    }
  };

  /* ================= Private sync (optional) ================= */
  IGU.routes.sync = {
    title: 'Private sync',
    render: function () {
      const u = ui(), h = u.h, store = u.store, app = u.app, S = IGU.stats;
      const root = h('div', { class: 'plan-page' });
      fill(app, root);
      const sess = {
        get: function () { try { return window.sessionStorage.getItem('igu.sync.token') || ''; } catch (e) { return ''; } },
        set: function (v) { try { if (v) window.sessionStorage.setItem('igu.sync.token', v); else window.sessionStorage.removeItem('igu.sync.token'); } catch (e) { /* not available */ } }
      };
      const state = function () { return store.get('sync', {}) || {}; };
      const saveState = function (patch) { store.set('sync', Object.assign({}, state(), patch)); };

      const consent = h('input', { type: 'checkbox', id: 'sy-consent' });
      const token = h('input', { type: 'password', id: 'sy-token', autocomplete: 'off', spellcheck: 'false', value: state().token || sess.get() });
      const remember = h('input', { type: 'checkbox', id: 'sy-remember', checked: !!state().token });
      const pass = h('input', { type: 'password', id: 'sy-pass', autocomplete: 'off', spellcheck: 'false' });
      const gist = h('input', { id: 'sy-gist', autocomplete: 'off', spellcheck: 'false', value: state().gistId || '' });
      const msg = h('p', { class: 'notice', role: 'status', 'aria-live': 'polite', hidden: true });
      const say = function (text, bad) { msg.className = 'notice' + (bad ? ' bad' : ''); msg.textContent = text; msg.hidden = false; };
      const btns = [];
      const sync = function () { btns.forEach(function (b) { b.disabled = !consent.checked; }); };
      consent.addEventListener('change', sync);

      function gather() {
        const t = SY.checkToken(token.value); if (t.error) { say(t.error, true); return null; }
        const p = SY.checkPassphrase(pass.value); if (p.error) { say(p.error, true); return null; }
        sess.set(t.token);
        saveState({ token: remember.checked ? t.token : undefined });
        return { token: t.token, pass: pass.value, gistId: gist.value.trim() };
      }
      async function run(b, label, fn) {
        b.disabled = true; const old = b.textContent; b.textContent = label; msg.hidden = true;
        try { await fn(); } catch (e) { say(e.message || 'Something went wrong.', true); }
        b.textContent = old; b.disabled = !consent.checked;
      }
      const pushBtn = h('button', { class: 'btn primary', type: 'button', disabled: true }, 'Upload encrypted copy');
      const pullBtn = h('button', { class: 'btn', type: 'button', disabled: true }, 'Download and replace this browser');
      btns.push(pushBtn, pullBtn);
      function pushNow(force) {
        const g = gather(); if (!g) return;
        return run(pushBtn, 'Uploading...', async function () {
          const backup = S.makeBackup(function (k) { return store.get(k, null); });
          try {
            const r = await SY.push({ token: g.token, pass: g.pass, gistId: g.gistId, backup: backup, last: state().last, force: force });
            gist.value = r.gistId; saveState({ gistId: r.gistId, last: { remoteSavedAt: r.savedAt, at: new Date().toISOString() } });
            say('Uploaded. Keep this gist id to sync another device: ' + r.gistId);
          } catch (e) {
            if (e.conflict && confirm(e.message + '\n\nReplace the synced copy with what is in this browser?')) { pushNow(true); return; }
            throw e;
          }
        });
      }
      pushBtn.addEventListener('click', function () { pushNow(false); });
      pullBtn.addEventListener('click', function () {
        const g = gather(); if (!g) return;
        run(pullBtn, 'Downloading...', async function () {
          const r = await SY.pull({ token: g.token, pass: g.pass, gistId: g.gistId });
          if (!confirm('Replace the progress, notes and drafts in this browser with the synced copy saved ' + (r.savedAt || 'earlier') + '? Your AI key is not affected.')) return;
          Object.keys(r.backup).forEach(function (k) { store.set(k, r.backup[k]); });
          saveState({ gistId: g.gistId, last: { remoteSavedAt: r.savedAt, at: new Date().toISOString() } });
          say('Done. This browser now matches the synced copy.');
        });
      });
      const forget = h('button', { class: 'btn ghost', type: 'button', onclick: function () {
        sess.set(''); store.set('sync', {}); token.value = ''; gist.value = ''; remember.checked = false; pass.value = '';
        say('Forgot the token and gist id on this device. The gist on GitHub is untouched; delete it at gist.github.com if you want it gone.');
      } }, 'Forget token and gist id here');
      const field = function (id, label, control, hint) { return h('div', { class: 'field' }, h('label', { for: id }, label, hint ? h('span', { class: 'hint' }, ' ' + hint) : null), control); };

      fill(root, h('p', null, h('a', { href: '#/progress' }, 'Progress')), h('h1', null, 'Private sync (optional)'),
        h('p', { class: 'lede' }, 'Move your progress between devices through a secret GitHub Gist in your own account. Off unless you use it. There is no InterviewGearUp server and no account here.'),
        h('div', { class: 'notice' }, h('strong', null, 'How it works'), h('ul', null,
          h('li', null, 'Your backup (progress, saved questions, notes, stories, drafts, paths) is encrypted in this browser with your passphrase before it is sent. GitHub stores only ciphertext.'),
          h('li', null, 'Your AI key and this sync token are never included.'),
          h('li', null, 'Only api.github.com is contacted, and only when you press a button.'),
          h('li', null, 'If you forget the passphrase, nobody can recover the data. Download a backup as well.'),
          h('li', null, 'Use a token that has only the "gist" permission (classic personal access token). Anyone with the token can read and change your gists.'))),
        h('p', null, h('a', { href: 'https://github.com/settings/tokens/new?scopes=gist&description=InterviewGearUp%20sync', target: '_blank', rel: 'noopener noreferrer' }, 'Create a gist-only token on GitHub'), h('span', { class: 'muted small-text' }, ' (opens github.com)')),
        h('label', { class: 'chk' }, consent, ' I understand what is uploaded and where, and I want to use sync.'),
        field('sy-token', 'GitHub token', token, '(kept for this tab only unless you tick the box below)'),
        h('label', { class: 'chk' }, remember, ' Remember the token on this device (stored in this browser, readable by anything that runs on this site)'),
        field('sy-pass', 'Passphrase', pass, '(at least ' + SY.MIN_PASS + ' characters; never stored)'),
        field('sy-gist', 'Gist id', gist, '(leave empty the first time; fill in on a second device)'),
        msg,
        h('div', { class: 'q-actions' }, pushBtn, pullBtn, forget),
        h('p', { class: 'muted small-text' }, 'Sync replaces data; it does not merge. Upload from the device you trust most, then download on the others. Full details: ', h('a', { href: 'https://github.com/' + IGU.config.owner + '/' + IGU.config.repo + '/blob/main/docs/THREAT_MODEL.md', target: '_blank', rel: 'noopener noreferrer' }, 'threat model'), '.'));
    }
  };
})();
