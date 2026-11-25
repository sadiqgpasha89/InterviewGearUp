/* Learner-made learning paths: an ordered list of question ids with a title and note, stored only in this browser.
   Paths can be exported and imported as JSON (version 1), so they can be shared by hand or submitted for maintainers to review.
   Nothing here evaluates or runs imported content: every field is cleaned and text only. Pure functions. */
(function () {
  const IGU = (window.IGU = window.IGU || {});
  const MAX_PATHS = 50, MAX_IDS = 100, MAX_TITLE = 100, MAX_NOTE = 500, MAX_FILE = 200000;
  const ID_RE = /^[a-z]+-\d+$/;

  function newPath(now) {
    return { id: 'p' + (now || Date.now()).toString(36) + Math.random().toString(36).slice(2, 6), title: '', note: '', ids: [], createdAt: new Date(now || Date.now()).toISOString() };
  }

  /* Returns { path, problems }. Ids that are not in `known` (a Set or null to skip the check) are dropped and counted. */
  function clean(p, known) {
    const out = Object.assign(newPath(), p && typeof p === 'object' ? p : {});
    out.id = /^[a-z0-9]{2,24}$/.test(String(out.id)) ? String(out.id) : newPath().id;
    out.title = String(out.title || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, MAX_TITLE);
    out.note = String(out.note || '').slice(0, MAX_NOTE);
    let dropped = 0;
    const seen = {};
    out.ids = (Array.isArray(out.ids) ? out.ids : []).filter(function (id) {
      const ok = typeof id === 'string' && ID_RE.test(id) && (!known || known.has(id)) && !seen[id];
      if (!ok) dropped++; else seen[id] = 1;
      return ok;
    }).slice(0, MAX_IDS);
    out.createdAt = typeof out.createdAt === 'string' ? out.createdAt.slice(0, 30) : new Date().toISOString();
    const problems = [];
    if (!out.title) problems.push('Give the path a title.');
    if (!out.ids.length) problems.push('Add at least one question.');
    return { path: out, problems: problems, dropped: dropped };
  }

  function exportPath(p) { return { app: 'InterviewGearUp', kind: 'learning-path', version: 1, path: { title: p.title, note: p.note, ids: p.ids } }; }

  /* text: file contents. Returns { path, dropped } with a fresh local id, or { error }. */
  function importPath(text, known) {
    if (typeof text !== 'string' || text.length > MAX_FILE) return { error: 'That file is too large to be a learning path.' };
    let o; try { o = JSON.parse(text); } catch (e) { return { error: 'That file is not valid JSON.' }; }
    if (!o || o.app !== 'InterviewGearUp' || o.kind !== 'learning-path' || o.version !== 1 || !o.path || typeof o.path !== 'object') return { error: 'That is not an InterviewGearUp learning path file.' };
    const r = clean({ title: o.path.title, note: o.path.note, ids: o.path.ids, id: undefined, createdAt: undefined }, known);
    if (!r.path.ids.length) return { error: 'None of the questions in that path exist in this version of the site.' };
    if (!r.path.title) r.path.title = 'Imported path';
    return { path: r.path, dropped: r.dropped };
  }

  /* Progress for one path: prepared and written-answer counts. Placeholder questions are flagged, never counted as ready. */
  function progress(p, byId, done) {
    done = done || {};
    let prepared = 0, real = 0;
    p.ids.forEach(function (id) { const e = byId[id]; if (!e) return; if (done[id]) prepared++; if (IGU.quality && !IGU.quality.isPlaceholder(e)) real++; });
    return { total: p.ids.length, prepared: prepared, real: real, next: p.ids.filter(function (id) { return byId[id] && !done[id]; })[0] || null };
  }

  IGU.paths = { newPath: newPath, clean: clean, exportPath: exportPath, importPath: importPath, progress: progress, MAX_PATHS: MAX_PATHS, MAX_IDS: MAX_IDS };
})();
