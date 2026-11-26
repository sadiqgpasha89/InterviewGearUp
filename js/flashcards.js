/* Flashcards and 6-step progressive Answer Outline Mode (Phase 18).
   Works offline without an AI key; integrates with spaced repetition (IGU.srs) and adaptive history. Pure functions. */
(function () {
  const IGU = (window.IGU = window.IGU || {});
  const MAX_CARDS = 200;

  const OUTLINE_STEPS = [
    { id: 'define', title: 'Define the concept', prompt: 'State what it is in 1–2 crisp sentences without jargon.' },
    { id: 'how', title: 'Explain how it works', prompt: 'Describe the core mechanism, data flow, or lifecycle under the hood.' },
    { id: 'example', title: 'Give an example', prompt: 'Anchor it in a concrete system, query, code path, or real incident.' },
    { id: 'tradeoffs', title: 'Explain trade-offs', prompt: 'Compare alternatives and say clearly when you would choose each.' },
    { id: 'failures', title: 'Describe failure cases', prompt: 'Name edge cases, bottlenecks, or how it breaks under load or bad input.' },
    { id: 'advanced', title: 'Discuss advanced considerations', prompt: 'Cover scale, security, observability, or team and operational impact.' }
  ];

  function outlineFor(entry) {
    const topic = entry && entry.topic ? entry.topic : 'this topic';
    const tags = entry && Array.isArray(entry.tags) && entry.tags.length ? entry.tags.slice(0, 3).join(', ') : '';
    const lv = entry && entry.level ? Number(entry.level) : 2;
    return OUTLINE_STEPS.map(function (st, idx) {
      let hint = st.prompt;
      if (idx === 1 && tags) hint += ' (Relevant terms: ' + tags + '.)';
      if (idx === 2) hint += ' Tie it to ' + topic + '.';
      if (idx === 5 && lv >= 3) hint += ' Emphasise Senior/Staff decisions, cost, and org impact.';
      return { id: st.id, step: idx + 1, title: st.title, prompt: hint };
    });
  }

  function cleanCard(c) {
    c = c && typeof c === 'object' ? c : {};
    const st = c.stats && typeof c.stats === 'object' ? c.stats : {};
    return {
      id: String(c.id || ('fc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5))).slice(0, 48),
      qid: String(c.qid || '').slice(0, 32),
      role: String(c.role || '').slice(0, 32),
      level: Number(c.level) >= 1 && Number(c.level) <= 4 ? Number(c.level) : 2,
      topic: String(c.topic || 'General').trim().slice(0, 80),
      front: String(c.front || '').trim().slice(0, 600),
      back: String(c.back || '').trim().slice(0, 2000),
      createdAt: String(c.createdAt || new Date().toISOString()),
      stats: {
        attempts: Math.max(0, Number(st.attempts) || 0),
        ok: Math.max(0, Number(st.ok) || 0),
        again: Math.max(0, Number(st.again) || 0),
        lastDay: String(st.lastDay || ''),
        lastGrade: String(st.lastGrade || '')
      }
    };
  }

  function fromQuestion(entry) {
    const follow = Array.isArray(entry.follow) && entry.follow.length
      ? '\n\nFollow-ups to check:\n- ' + entry.follow.slice(0, 2).join('\n- ')
      : '';
    return cleanCard({
      id: 'fc-' + entry.id,
      qid: entry.id,
      role: entry.role,
      level: entry.level,
      topic: entry.topic,
      front: entry.q,
      back: String(entry.short || '').trim() + follow
    });
  }

  /* Create flashcards from weak drill items and SRS lapses without overwriting existing cards. */
  function buildFromWeak(bank, practice, srs, existingCards) {
    const existing = Array.isArray(existingCards) ? existingCards.map(cleanCard) : [];
    const seenQids = new Set(existing.map(function (c) { return c.qid; }).filter(Boolean));
    const seenIds = new Set(existing.map(function (c) { return c.id; }));
    const weakIds = new Set(IGU.stats
      ? IGU.stats.weak(practice || {})
      : Object.keys(practice || {}).filter(function (id) { return practice[id] && practice[id].last === 'again'; }));
    Object.keys(srs || {}).forEach(function (id) {
      const s = srs[id];
      if (s && (s.lapses > 0 || s.grade === 'again' || s.grade === 'partial')) weakIds.add(id);
    });
    const added = [];
    (bank || []).forEach(function (e) {
      if (existing.length + added.length >= MAX_CARDS) return;
      if (!weakIds.has(e.id) || seenQids.has(e.id) || seenIds.has('fc-' + e.id)) return;
      const card = fromQuestion(e);
      added.push(card);
      seenQids.add(e.id);
      seenIds.add(card.id);
    });
    return { cards: added.concat(existing).slice(0, MAX_CARDS), added: added.length };
  }

  /* Grade recall: updates card stats AND feeds IGU.srs + IGU.adaptive for revision scheduling. */
  function gradeCard(cards, cardId, grade, srs, history, today) {
    const ok = grade === 'solid' || grade === 'mastered';
    let targetKey = cardId;
    const nextCards = (cards || []).map(function (raw) {
      const c = cleanCard(raw);
      if (c.id !== cardId) return c;
      targetKey = c.qid || c.id;
      c.stats = {
        attempts: c.stats.attempts + 1,
        ok: c.stats.ok + (ok ? 1 : 0),
        again: c.stats.again + (ok ? 0 : 1),
        lastDay: today,
        lastGrade: grade
      };
      return c;
    });
    const nextSrs = IGU.srs ? IGU.srs.review(srs || {}, targetKey, grade, today) : (srs || {});
    const nextHist = IGU.adaptive && targetKey && !/^fc-/.test(targetKey)
      ? IGU.adaptive.logAttempt(history || [], targetKey, grade, today)
      : (history || []);
    return { cards: nextCards, srs: nextSrs, history: nextHist, srsKey: targetKey };
  }

  function dueCards(cards, srs, today) {
    const list = (cards || []).map(cleanCard).filter(function (c) { return c.front && c.back; });
    return list.map(function (c) {
      const key = c.qid || c.id;
      const s = (srs || {})[key];
      const dueDay = s && s.due ? s.due : '';
      const isDue = !s || !dueDay || dueDay <= today;
      return { card: c, srs: s || null, dueDay: dueDay, isDue: isDue };
    }).sort(function (a, b) {
      if (a.isDue !== b.isDue) return a.isDue ? -1 : 1;
      if (a.dueDay && b.dueDay && a.dueDay !== b.dueDay) return a.dueDay < b.dueDay ? -1 : 1;
      return a.card.stats.attempts - b.card.stats.attempts;
    });
  }

  IGU.flashcards = {
    MAX_CARDS: MAX_CARDS, OUTLINE_STEPS: OUTLINE_STEPS,
    outlineFor: outlineFor, cleanCard: cleanCard, fromQuestion: fromQuestion,
    buildFromWeak: buildFromWeak, gradeCard: gradeCard, dueCards: dueCards
  };
})();
