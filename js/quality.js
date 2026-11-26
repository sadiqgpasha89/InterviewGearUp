/* Content quality helpers. Pure functions, no DOM.

   Review status of a question:
   - 'placeholder' : DERIVED. The entry still carries the generated filler answer (see isPlaceholder). The question text may be fine,
                     but there is no real reference answer yet. Never set by hand.
   - 'unreviewed'  : DERIVED default for hand-written entries that have no recorded review.
   - 'ai-drafted'  : written by an AI assistant and not yet checked by a human maintainer.
   - 'reviewed'    : checked by a human. Requires a valid lastReviewed date.
   - 'needs-correction' : a person found a problem that is not fixed yet. Requires a correctionNote saying what is wrong.
   Only the last three are ever stored in data files, and only when true.

   In the UI and docs the states read: Pending (placeholder), Origin not recorded (unreviewed), AI-drafted, Human-reviewed, Needs correction. */
(function () {
  const IGU = (window.IGU = window.IGU || {});

  const STATUSES = ['placeholder', 'unreviewed', 'ai-drafted', 'reviewed', 'needs-correction'];
  const STORED_STATUSES = ['ai-drafted', 'reviewed', 'needs-correction'];
  const STATUS_NAMES = {
    placeholder: 'Pending', unreviewed: 'Origin not recorded', 'ai-drafted': 'AI-drafted', reviewed: 'Human-reviewed', 'needs-correction': 'Needs correction'
  };
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
    if (e.reviewStatus === 'needs-correction' && !(typeof e.correctionNote === 'string' && e.correctionNote.trim().length >= 10 && e.correctionNote.length <= 400)) p.push('needs-correction entries need a correctionNote of 10 to 400 characters');
    if ('correctionNote' in e && e.reviewStatus !== 'needs-correction') p.push('correctionNote is only for needs-correction entries');
    if ('contentVersion' in e && !(Number.isInteger(e.contentVersion) && e.contentVersion >= 1)) p.push('contentVersion must be a positive integer');
    if ('references' in e) {
      if (!Array.isArray(e.references)) p.push('references must be an array');
      else e.references.forEach(function (r) {
        if (!r || typeof r.title !== 'string' || !/^https:\/\//.test(String(r.url || ''))) p.push('each reference needs a title and an https url');
      });
    }
    return p;
  }

  /* One sentence telling the learner how far to trust an answer. Shared by the app and the static pages. */
  function label(e) {
    const st = status(e);
    if (st === 'reviewed') return 'Human-reviewed ' + e.lastReviewed;
    if (st === 'ai-drafted') return 'AI-drafted, not yet reviewed by a person';
    if (st === 'needs-correction') return 'Needs correction: a reviewer found a problem that is not fixed yet';
    if (st === 'unreviewed') return 'Not yet reviewed by a person (origin not recorded)';
    return 'Pending: no written answer yet';
  }

  /* ---------- Answer quality signals (Phase 1 rubric) ----------
     Cheap, deterministic text checks that point a human reviewer at likely gaps. They cannot judge technical correctness,
     so they never change an answer's review status; they only order the review queue. */
  const RX = {
    example: /```|\bfor example\b|\be\.g\.|\bfor instance\b|\bsuch as\b|\bexample\b|\bimagine\b|\bsay you\b|\bconsider\b/i,
    tradeoff: /trade-?offs?|\bversus\b|\b(?:better|worse|faster|slower|cheaper|simpler) (?:than|for|when)\b|advantage|drawback|limitation|\bwhen should\b|\bcompar|\boption|\balternative|\bvs\.?\b|\bat the cost of\b|\bdownside|\bupside|\bcost(s|ly)?\b|\bwhen (?:to|not to) use\b|\bprefer\b|\binstead\b|\bbut\b/i,
    edge: /pitfall|edge case|corner case|\bfails?\b|failure|gotcha|caveat|\bbreaks?\b|\bwatch out\b|\bmistake|\bunless\b|\bnull\b|\bempty\b|\boverflow\b|\btimeout/i,
    decision: /\bdecid|\bwhen should\b|\bdepends on\b|\brequirement|\btrade-?off|\bapproach\b|\bmigrat|\brollout|\bincident|\bdecision|\bchoose|\bchoosing|\bstakeholder|\bambigu|\bprioriti|\bconstraint|\bjudg(e)?ment|\brisk\b|\balign/i,
    generic: /\bin today's (?:world|fast-paced)|\bplays a (?:crucial|vital|key) role\b|\bvarious factors\b|\bit is important to note\b|\bleverag(e|ing) best practices\b|\bseamless(ly)?\b|\brobust and scalable\b|\bcutting-edge\b|\bin conclusion\b/gi
  };
  function wordCount(s) { return (String(s || '').match(/[A-Za-z0-9][A-Za-z0-9'+#.-]*/g) || []).length; }

  function signals(e) {
    const text = String(e.short || '') + '\n' + String(e.detail || '');
    const generic = (text.match(RX.generic) || []).length;
    return {
      words: wordCount(text),
      example: RX.example.test(text),
      tradeoffs: RX.tradeoff.test(text),
      edgeCases: RX.edge.test(text),
      decision: RX.decision.test(text),
      followUps: Array.isArray(e.follow) ? e.follow.length : 0,
      references: Array.isArray(e.references) ? e.references.length : 0,
      generic: generic
    };
  }

  /* Rubric gaps worth a reviewer's attention. Placeholders get one flag only: they need writing, not reviewing. */
  const FLAG_TEXT = {
    pending: 'No written answer yet',
    thin: 'Short explanation (under 180 words)',
    'no-example': 'No example or concrete scenario',
    'no-tradeoffs': 'No trade-offs or alternatives',
    'no-edge-cases': 'No pitfalls, edge cases or failure modes',
    'few-follow-ups': 'Fewer than 3 follow-up questions',
    'no-references': 'No reference to authoritative documentation',
    'senior-calibration': 'Gear 3 or 4 answer without decision-making, constraints or trade-offs',
    'junior-calibration': 'Gear 1 answer is very long; check it stays on fundamentals',
    generic: 'Generic filler phrasing',
    'needs-correction': 'A reviewer marked this answer as wrong or outdated'
  };
  function flags(e) {
    if (isPlaceholder(e)) return ['pending'];
    const s = signals(e), out = [];
    if (e.reviewStatus === 'needs-correction') out.push('needs-correction');
    if (s.words < 180) out.push('thin');
    if (!s.example) out.push('no-example');
    if (!s.tradeoffs) out.push('no-tradeoffs');
    if (!s.edgeCases) out.push('no-edge-cases');
    if (s.followUps < 3) out.push('few-follow-ups');
    if (!s.references) out.push('no-references');
    if (e.level >= 3 && !s.decision) out.push('senior-calibration');
    if (e.level === 1 && s.words > 900) out.push('junior-calibration');
    if (s.generic >= 2) out.push('generic');
    return out;
  }

  /* Review priority: higher first. Correction requests and unreviewed fundamentals come first, because they are
     studied most (every plan starts in the learner's gear and Gear 1-2 questions sit on more learning paths).
     `extra` is an optional { onPath: {id: 1} } so starter-path questions rank higher. Deterministic. */
  const FLAG_WEIGHT = { 'needs-correction': 50, pending: 0, thin: 4, 'no-example': 3, 'no-tradeoffs': 3, 'no-edge-cases': 2, 'few-follow-ups': 1, 'no-references': 1, 'senior-calibration': 4, 'junior-calibration': 2, generic: 4 };
  function reviewPriority(e, extra) {
    if (isPlaceholder(e) || status(e) === 'reviewed') return 0;
    const f = flags(e);
    let p = f.reduce(function (n, k) { return n + (FLAG_WEIGHT[k] || 0); }, 0);
    if (status(e) === 'unreviewed') p += 3;           // origin unknown: check it first
    if (e.level <= 2) p += 2;                          // fundamentals are studied by more learners
    if (extra && extra.onPath && extra.onPath[e.id]) p += 3;
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
    STATUSES: STATUSES, STORED_STATUSES: STORED_STATUSES, STATUS_NAMES: STATUS_NAMES, DIFFICULTIES: DIFFICULTIES,
    label: label, signals: signals, flags: flags, FLAG_TEXT: FLAG_TEXT, reviewPriority: reviewPriority,
    isPlaceholder: isPlaceholder, isReal: isReal, status: status, validDate: validDate,
    metaProblems: metaProblems, coverage: coverage, nearDuplicates: nearDuplicates
  };
})();
