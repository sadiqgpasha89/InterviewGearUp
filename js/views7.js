/* Views for Phase 18+ features: Flashcards (#/flashcards). Registered in IGU.routes. No innerHTML. */
(function () {
  const IGU = window.IGU;
  IGU.routes = IGU.routes || {};
  const FC = IGU.flashcards;
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
})();
