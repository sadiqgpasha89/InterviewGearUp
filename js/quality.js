/* Content quality helpers. Pure functions, no DOM.

   Review status of a question:
   - 'placeholder' : DERIVED. The entry still carries the generated filler answer (see isPlaceholder). The question text may be fine,
                     but there is no real reference answer yet. Never set by hand.
   - 'unreviewed'  : DERIVED default for hand-written entries that have no recorded review.
   - 'ai-drafted'  : written by an AI assistant and not yet checked by a human maintainer.
   - 'reviewed'    : checked by a human. Requires a valid lastReviewed date.
   Only the last two are ever stored in data files, and only when true. */
(function () {
  const IGU = (window.IGU = window.IGU || {});

  const STATUSES = ['placeholder', 'unreviewed', 'ai-drafted', 'reviewed'];
  const STORED_STATUSES = ['ai-drafted', 'reviewed'];
  const DIFFICULTIES = ['easy', 'medium', 'hard'];

  /* The generated filler answer: one template with the question text substituted. */
  function isPlaceholder(e) {
    return !e.reviewStatus &&
      /^Addressing .* requires balancing performance, reliability, and architectural complexity/.test(String(e.short || ''));
  }

  function status(e) {
    if (e.reviewStatus) return e.reviewStatus;
    return isPlaceholder(e) ? 'placeholder' : 'unreviewed';
  }

  /* Real = has an actual written answer, whatever its review state. */
  function isReal(e) { return !isPlaceholder(e); }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  function validDate(s) {
    if (!DATE_RE.test(String(s))) return false;
    const d = new Date(s + 'T00:00:00Z');
    return !isNaN(d) && d.toISOString().slice(0, 10) === s;
  }

  /* Returns a list of problems with the optional metadata fields (empty when fine). */
  function metaProblems(e) {
    const p = [];
    if ('difficulty' in e && DIFFICULTIES.indexOf(e.difficulty) < 0) p.push('difficulty must be one of ' + DIFFICULTIES.join('/'));
    if ('reviewStatus' in e && STORED_STATUSES.indexOf(e.reviewStatus) < 0) p.push('reviewStatus must be one of ' + STORED_STATUSES.join('/'));
    if ('lastReviewed' in e && !validDate(e.lastReviewed)) p.push('lastReviewed must be a real YYYY-MM-DD date');
    if (e.reviewStatus === 'reviewed' && !e.lastReviewed) p.push('reviewed entries need lastReviewed');
    if ('contentVersion' in e && !(Number.isInteger(e.contentVersion) && e.contentVersion >= 1)) p.push('contentVersion must be a positive integer');
    if ('references' in e) {
      if (!Array.isArray(e.references)) p.push('references must be an array');
      else e.references.forEach(function (r) {
        if (!r || typeof r.title !== 'string' || !/^https:\/\//.test(String(r.url || ''))) p.push('each reference needs a title and an https url');
      });
    }
    return p;
  }

  /* Count of real entries per role x gear. */
  function coverage(bank, meta) {
    const out = {};
    meta.roles.forEach(function (r) { out[r.id] = [0, 0, 0, 0]; });
    bank.forEach(function (e) { if (isReal(e) && out[e.role]) out[e.role][e.level - 1]++; });
    return out;
  }

  /* Normalised word set of a question, for near-duplicate detection. */
  function words(q) {
    return new Set((String(q).toLowerCase().match(/[a-z0-9+#]+/g) || []).filter(function (w) { return w.length > 2; }));
  }
  function similarity(a, b) {
    let inter = 0;
    a.forEach(function (x) { if (b.has(x)) inter++; });
    const union = a.size + b.size - inter;
    return union ? inter / union : 0;
  }
  function nearDuplicates(bank, threshold) {
    const ws = bank.map(function (e) { return words(e.q); });
    const out = [];
    for (let i = 0; i < bank.length; i++) {
      for (let j = i + 1; j < bank.length; j++) {
        const s = similarity(ws[i], ws[j]);
        if (s >= threshold) out.push({ a: bank[i].id, b: bank[j].id, similarity: s });
      }
    }
    return out;
  }

  IGU.quality = {
    STATUSES: STATUSES, STORED_STATUSES: STORED_STATUSES, DIFFICULTIES: DIFFICULTIES,
    isPlaceholder: isPlaceholder, isReal: isReal, status: status, validDate: validDate,
    metaProblems: metaProblems, coverage: coverage, nearDuplicates: nearDuplicates
  };
})();
