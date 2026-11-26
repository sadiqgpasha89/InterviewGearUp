/* Daily 10-minute interview warm-up (Phase 20). Pure functions; integrates with SRS, practice, and adaptive history. */
(function () {
  const IGU = (window.IGU = window.IGU || {});

  const SLOTS = ['technical', 'scenario', 'behavioral'];
  const SLOT_INFO = {
    technical: { label: 'Technical', minutes: 3 },
    scenario: { label: 'Scenario', minutes: 4 },
    behavioral: { label: 'Behavioral', minutes: 3 }
  };
  const TARGET_MINUTES = 10;
  const MAX_HISTORY = 60;

  function classifySlot(e) {
    const q = e && typeof e === 'object' ? e.q : e;
    const type = IGU.engine ? IGU.engine.classify(q) : 'concept';
    if (type === 'behavioral') return 'behavioral';
    if (type === 'design' || type === 'debug') return 'scenario';
    return 'technical';
  }

  function storyFallbackEntry(prompt, role, level) {
    return {
      id: prompt.id,
      role: role || 'general',
      level: level || 2,
      topic: 'Behavioral (' + prompt.tag + ')',
      q: prompt.q,
      short: 'Deliver a 2–3 minute STAR-L answer grounded in a real project: concise Situation/Task, step-by-step personal Action (~60%), measurable Result, and Reflection.',
      detail: 'Structure your response from your real experience:\n\n- **Situation & Task (~30s)**: State the team, stakes, and what was specifically yours to solve.\n- **Action (~90s)**: Walk through decisions you personally made, alternatives considered, and how you aligned others.\n- **Result & Reflection (~45s)**: Quantify the outcome or concrete change, then name what you would do differently next time.',
      follow: [
        'What was the hardest trade-off you had to make in that situation?',
        'What would you do differently if you faced the same constraint again?'
      ],
      tags: [prompt.tag, 'behavioral', 'star'],
      isStoryPrompt: true
    };
  }

  function buildSession(bank, opts) {
    opts = opts || {};
    const role = opts.role || 'backend';
    const level = [1, 2, 3, 4].indexOf(Number(opts.level)) >= 0 ? Number(opts.level) : 2;
    const day = opts.day || '';
    const practice = opts.practice || {};
    const srs = opts.srs || {};
    const done = opts.done || {};
    const recent = new Set(opts.recentIds || []);
    const isReal = function (e) { return IGU.quality ? IGU.quality.isReal(e) : !!(e && e.short && e.detail); };
    const sig = IGU.adaptive ? IGU.adaptive.weakSignals({ bank: bank || [], today: day, history: opts.history || [], practice: practice, srs: srs }) : { byTopic: {}, byId: {} };

    const realBank = (bank || []).filter(isReal);
    const pool = realBank.length ? realBank : (bank || []);
    const usedIds = new Set();

    const weakScore = function (e) {
      let w = 0;
      const byQ = sig.byId && sig.byId[e.id];
      const byT = sig.byTopic && sig.byTopic[e.role + '|' + e.topic];
      if (byQ && byQ.score) w += byQ.score;
      if (byT && byT.score) w += Math.min(4, byT.score);
      if (practice[e.id] && practice[e.id].last === 'again') w += 2;
      if (srs[e.id] && (srs[e.id].grade === 'again' || srs[e.id].grade === 'partial')) w += 2;
      return w;
    };

    const pickForSlot = function (slot) {
      const candidates = pool.filter(function (e) { return !usedIds.has(e.id) && classifySlot(e) === slot; });
      candidates.sort(function (a, b) {
        const ra = recent.has(a.id) ? 1 : 0, rb = recent.has(b.id) ? 1 : 0;
        if (ra !== rb) return ra - rb;
        const roleA = a.role === role ? 0 : a.role === 'general' ? 1 : 2;
        const roleB = b.role === role ? 0 : b.role === 'general' ? 1 : 2;
        if (roleA !== roleB) return roleA - roleB;
        const wa = weakScore(a), wb = weakScore(b);
        if (wa !== wb) return wb - wa;
        const la = Math.abs(a.level - level), lb = Math.abs(b.level - level);
        if (la !== lb) return la - lb;
        const da = done[a.id] ? 1 : 0, db = done[b.id] ? 1 : 0;
        if (da !== db) return da - db;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });

      let chosen = candidates[0];
      if (!chosen && slot === 'behavioral' && IGU.stories && IGU.stories.PROMPTS && IGU.stories.PROMPTS.length) {
        const prompts = IGU.stories.PROMPTS.filter(function (p) { return !usedIds.has(p.id); });
        prompts.sort(function (a, b) { return (recent.has(a.id) ? 1 : 0) - (recent.has(b.id) ? 1 : 0); });
        chosen = storyFallbackEntry(prompts[0] || IGU.stories.PROMPTS[0], role, level);
      }
      if (!chosen) {
        const anyLeft = pool.filter(function (e) { return !usedIds.has(e.id); });
        chosen = anyLeft[0] || null;
      }
      if (!chosen) return null;
      usedIds.add(chosen.id);

      let reason = 'Role & gear warm-up';
      if (chosen.isStoryPrompt) reason = 'Core behavioral STAR-L prompt';
      else if (weakScore(chosen) > 0) reason = 'Targets weak topic: ' + chosen.topic;
      else if (chosen.role !== role) reason = 'Cross-role ' + SLOT_INFO[slot].label.toLowerCase() + ' warm-up';
      else if (chosen.level !== level) reason = 'Adjacent gear ' + chosen.level + ' warm-up';

      return {
        slot: slot,
        label: SLOT_INFO[slot].label,
        minutes: SLOT_INFO[slot].minutes,
        reason: reason,
        entry: chosen
      };
    };

    const items = SLOTS.map(pickForSlot).filter(Boolean);
    return { role: role, level: level, day: day, targetMinutes: TARGET_MINUTES, items: items };
  }

  function feedback(item, answerText) {
    const text = String(answerText || '').trim();
    const qText = item && item.entry ? item.entry.q : '';
    const type = qText && IGU.engine ? IGU.engine.classify(qText) : 'concept';
    if (text.length < 20) {
      return {
        ok: false,
        type: type,
        wordCount: text ? text.split(/\s+/).length : 0,
        passed: [],
        missing: [],
        notes: ['Outline at least a few concrete sentences (20+ characters) before running the offline self-check.']
      };
    }
    const checks = (IGU.engine && IGU.engine.CHECKS && IGU.engine.CHECKS[type]) || [];
    const passed = checks.filter(function (c) { return c[1].test(text); }).map(function (c) { return c[0]; });
    const missing = checks.filter(function (c) { return !c[1].test(text); }).map(function (c) { return c[0]; });
    const notes = IGU.engine ? IGU.engine.critique(text, type) : [];
    return {
      ok: true,
      type: type,
      wordCount: text.split(/\s+/).length,
      passed: passed,
      missing: missing,
      notes: notes
    };
  }

  function recordItem(state, item, grade, secs, today) {
    state = state || {};
    const practice = Object.assign({}, state.practice || {});
    let srs = Object.assign({}, state.srs || {});
    let history = (state.history || []).slice();
    const done = Object.assign({}, state.done || {});
    const id = item.entry.id;
    const isOk = grade === 'solid' || grade === 'mastered';

    const cur = practice[id] || { count: 0, again: 0, ok: 0 };
    practice[id] = {
      count: cur.count + 1,
      again: cur.again + (isOk ? 0 : 1),
      ok: cur.ok + (isOk ? 1 : 0),
      last: isOk ? 'ok' : 'again',
      secs: Math.max(0, Math.round(Number(secs) || 0)),
      day: today
    };

    if (!item.entry.isStoryPrompt) {
      if (IGU.srs && IGU.srs.review) srs = IGU.srs.review(srs, id, grade, today);
      if (IGU.adaptive && IGU.adaptive.logAttempt) history = IGU.adaptive.logAttempt(history, id, grade, today);
      if (isOk) done[id] = 1;
    }

    return { practice: practice, srs: srs, history: history, done: done };
  }

  function completeSession(warmupHistory, summary) {
    const clean = {
      day: String(summary.day || ''),
      role: String(summary.role || 'general'),
      level: Number(summary.level) || 2,
      elapsedSecs: Math.max(0, Math.round(Number(summary.elapsedSecs) || 0)),
      items: (summary.items || []).slice(0, 5).map(function (x) {
        return { id: String(x.id || ''), slot: String(x.slot || ''), grade: String(x.grade || 'again') };
      })
    };
    return [clean].concat(Array.isArray(warmupHistory) ? warmupHistory : []).slice(0, MAX_HISTORY);
  }

  function recentIds(warmupHistory) {
    const out = [];
    (warmupHistory || []).slice(0, 6).forEach(function (s) {
      (s && s.items || []).forEach(function (x) { if (x && x.id) out.push(x.id); });
    });
    return out;
  }

  IGU.warmup = {
    SLOTS: SLOTS,
    SLOT_INFO: SLOT_INFO,
    TARGET_MINUTES: TARGET_MINUTES,
    MAX_HISTORY: MAX_HISTORY,
    classifySlot: classifySlot,
    buildSession: buildSession,
    feedback: feedback,
    recordItem: recordItem,
    completeSession: completeSession,
    recentIds: recentIds
  };
})();
