/* Search, relevance ranking, acronym expansion, bounded typo tolerance, topic navigation,
   related questions, and prerequisite concepts for the question bank. Pure functions, no DOM. */
(function () {
  const IGU = (window.IGU = window.IGU || {});

  const STOP = new Set(('a an the of to in on for with and or is are was were be been being do does did how what why when ' +
    'which who whom this that these those it its as at by from into than then so if you your we our they their i me my can ' +
    'could should would will shall may might must about between explain describe tell give example examples ' +
    'vs versus use used using have has had not no yes any some more most much many very also just like').split(' '));

  /* Bidirectional technical acronym & synonym groups. Keep entries lowercase tokens. */
  const SYNONYM_GROUPS = [
    ['k8s', 'kubernetes'],
    ['js', 'javascript'],
    ['ts', 'typescript'],
    ['py', 'python'],
    ['db', 'database', 'databases'],
    ['tf', 'terraform'],
    ['cicd', 'ci/cd', 'continuous integration', 'continuous deployment', 'continuous delivery'],
    ['auth', 'authentication', 'authorization'],
    ['authn', 'authentication'],
    ['authz', 'authorization'],
    ['jwt', 'json web token'],
    ['rag', 'retrieval augmented generation'],
    ['llm', 'large language model'],
    ['ml', 'machine learning'],
    ['dl', 'deep learning'],
    ['nlp', 'natural language processing'],
    ['cv', 'computer vision'],
    ['sre', 'site reliability'],
    ['iac', 'infrastructure as code'],
    ['rbac', 'role based access control'],
    ['tls', 'ssl', 'transport layer security'],
    ['cdn', 'content delivery network'],
    ['lb', 'load balancer', 'load balancing'],
    ['mvcc', 'multi version concurrency control'],
    ['acid', 'atomicity consistency isolation durability'],
    ['cap', 'consistency availability partition'],
    ['oltp', 'online transaction processing'],
    ['olap', 'online analytical processing'],
    ['etl', 'extract transform load'],
    ['elt', 'extract load transform'],
    ['cdc', 'change data capture'],
    ['dag', 'directed acyclic graph'],
    ['a11y', 'accessibility'],
    ['cwv', 'core web vitals'],
    ['crp', 'critical rendering path'],
    ['dom', 'document object model'],
    ['ssr', 'server side rendering'],
    ['spa', 'single page application'],
    ['xss', 'cross site scripting'],
    ['csrf', 'cross site request forgery'],
    ['sqli', 'sql injection'],
    ['iam', 'identity and access management'],
    ['ddos', 'distributed denial of service'],
    ['oop', 'object oriented'],
    ['dp', 'dynamic programming'],
    ['bfs', 'breadth first search'],
    ['dfs', 'depth first search'],
    ['lru', 'least recently used'],
    ['ttl', 'time to live'],
    ['slo', 'service level objective'],
    ['sla', 'service level agreement'],
    ['sli', 'service level indicator'],
    ['adr', 'architecture decision record'],
    ['rfc', 'request for comments'],
    ['orm', 'object relational mapping'],
    ['qa', 'quality assurance'],
    ['e2e', 'end to end'],
    ['tdd', 'test driven development'],
    ['pr', 'pull request']
  ];

  const SYN_MAP = new Map();
  SYNONYM_GROUPS.forEach(function (group) {
    group.forEach(function (term) {
      if (term.indexOf(' ') >= 0 || term.indexOf('/') >= 0) return;
      const peers = SYN_MAP.get(term) || new Set();
      group.forEach(function (other) { if (other !== term) peers.add(other); });
      SYN_MAP.set(term, peers);
    });
  });

  function stem(w) {
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 5 && /(ing|ed)$/.test(w)) return w.replace(/(ing|ed)$/, '');
    if (w.length > 4 && /es$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  }

  function tokenize(text, keepStop) {
    const m = String(text || '').toLowerCase().match(/[a-z0-9][a-z0-9+#./-]*/g) || [];
    const out = [];
    m.forEach(function (raw) {
      const w = raw.replace(/[.-]+$/g, '');
      if (!w) return;
      if (!keepStop && STOP.has(w)) return;
      out.push(w);
      const st = stem(w);
      if (st !== w) out.push(st);
      if (w.indexOf('/') >= 0) {
        const joined = w.replace(/\//g, '');
        if (joined.length > 1) out.push(joined);
        w.split('/').forEach(function (p) { if (p.length > 1 && (keepStop || !STOP.has(p))) out.push(p); });
      }
      if (w.indexOf('-') > 0) {
        w.split('-').forEach(function (p) { if (p.length > 1 && (keepStop || !STOP.has(p))) out.push(stem(p)); });
      }
      if (w.indexOf('.') > 0) {
        w.split('.').forEach(function (p) { if (p.length > 1 && (keepStop || !STOP.has(p))) out.push(stem(p)); });
      }
    });
    return out;
  }

  /* Bounded Damerau-Levenshtein distance with early exit when > maxDist. */
  function editDistance(a, b, maxDist) {
    if (a === b) return 0;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > maxDist) return maxDist + 1;
    const dp = Array.from({ length: la + 1 }, function () { return new Array(lb + 1).fill(0); });
    for (let i = 0; i <= la; i++) dp[i][0] = i;
    for (let j = 0; j <= lb; j++) dp[0][j] = j;
    for (let i = 1; i <= la; i++) {
      let rowMin = maxDist + 1;
      for (let j = 1; j <= lb; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          v = Math.min(v, dp[i - 2][j - 2] + cost);
        }
        dp[i][j] = v;
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > maxDist) return maxDist + 1;
    }
    return dp[la][lb];
  }

  const indexCache = new WeakMap();

  function surfaceWords(text) {
    return String(text || '').toLowerCase().match(/[a-z0-9][a-z0-9+#.-]*/g) || [];
  }

  function buildIndex(bank) {
    const vocabSet = new Set();
    const docs = bank.map(function (e) {
      const qL = String(e.q || '').toLowerCase();
      const tL = String(e.topic || '').toLowerCase();
      const tagsL = (e.tags || []).join(' ').toLowerCase();
      const sL = String(e.short || '').toLowerCase();
      const dL = String(e.detail || '').toLowerCase();
      const qToks = new Set(tokenize(qL, true));
      const tToks = new Set(tokenize(tL, true));
      const tagToks = new Set(tokenize(tagsL, true));
      const bodyToks = new Set(tokenize(sL + ' ' + dL, false));
      surfaceWords(qL + ' ' + tL + ' ' + tagsL).forEach(function (w) {
        const clean = w.replace(/[.-]+$/g, '');
        if (clean.length >= 3 && !STOP.has(clean)) vocabSet.add(clean);
      });
      return {
        e: e, qL: qL, tL: tL, tagsL: tagsL, sL: sL, dL: dL,
        allL: qL + ' ' + tL + ' ' + tagsL + ' ' + sL + ' ' + dL,
        qToks: qToks, tToks: tToks, tagToks: tagToks, bodyToks: bodyToks,
        relToks: new Set(tokenize(qL + ' ' + tL + ' ' + tagsL, false))
      };
    });
    const vocab = Array.from(vocabSet);
    return { docs: docs, vocab: vocab, n: bank.length };
  }

  function getIndex(bank) {
    let idx = indexCache.get(bank);
    if (!idx || idx.n !== bank.length) {
      idx = buildIndex(bank);
      indexCache.set(bank, idx);
    }
    return idx;
  }

  function bestTypo(term, vocab) {
    if (term.length < 4) return '';
    const maxD = term.length >= 7 ? 2 : 1;
    let best = '', bestD = maxD + 1;
    for (let i = 0; i < vocab.length; i++) {
      const w = vocab[i];
      if (Math.abs(w.length - term.length) > maxD) continue;
      if (w[0] !== term[0] && term.length < 6) continue;
      const d = editDistance(term, w, maxD);
      if (d > 0 && d < bestD) { bestD = d; best = w; if (d === 1) break; }
    }
    return best;
  }

  function scoreDoc(doc, rawPhrase, termSpecs) {
    let score = 0;
    let exactTerms = 0;
    for (let i = 0; i < termSpecs.length; i++) {
      const sp = termSpecs[i];
      let matched = false;
      const t = sp.term;
      const st = sp.stem;

      if (doc.qToks.has(t) || doc.qToks.has(st)) { score += 16; matched = true; exactTerms++; }
      if (doc.tToks.has(t) || doc.tToks.has(st)) { score += 14; matched = true; exactTerms++; }
      if (doc.tagToks.has(t) || doc.tagToks.has(st)) { score += 13; matched = true; exactTerms++; }
      if (doc.bodyToks.has(t) || doc.bodyToks.has(st)) { score += 4; matched = true; }

      if (!matched && sp.syns.length) {
        for (let j = 0; j < sp.syns.length; j++) {
          const syn = sp.syns[j];
          if (syn.indexOf(' ') >= 0) {
            if (doc.qL.indexOf(syn) >= 0 || doc.tL.indexOf(syn) >= 0 || doc.tagsL.indexOf(syn) >= 0) { score += 10; matched = true; break; }
            if (doc.sL.indexOf(syn) >= 0 || doc.dL.indexOf(syn) >= 0) { score += 4; matched = true; break; }
          } else {
            if (doc.qToks.has(syn) || doc.tToks.has(syn) || doc.tagToks.has(syn)) { score += 10; matched = true; break; }
            if (doc.bodyToks.has(syn)) { score += 3.5; matched = true; break; }
          }
        }
      }

      if (!matched) {
        if (doc.qL.indexOf(t) >= 0 || doc.tL.indexOf(t) >= 0 || doc.tagsL.indexOf(t) >= 0) { score += 6; matched = true; }
        else if (doc.sL.indexOf(t) >= 0 || doc.dL.indexOf(t) >= 0) { score += 2; matched = true; }
      }

      if (!matched && sp.typo) {
        const ty = sp.typo;
        if (doc.qToks.has(ty) || doc.tToks.has(ty) || doc.tagToks.has(ty)) { score += 4; matched = true; }
        else if (doc.bodyToks.has(ty)) { score += 1.5; matched = true; }
      }

      if (!matched) return 0;
    }

    if (rawPhrase && rawPhrase.indexOf(' ') >= 0) {
      if (doc.qL.indexOf(rawPhrase) >= 0) score += 45;
      else if (doc.tL.indexOf(rawPhrase) >= 0) score += 35;
      else if (doc.tagsL.indexOf(rawPhrase) >= 0) score += 25;
      else if (doc.sL.indexOf(rawPhrase) >= 0) score += 10;
    }
    if (doc.tL === rawPhrase) score += 30;
    if (exactTerms > 0) score += exactTerms;
    return score;
  }

  function parseTerms(qText, vocab) {
    const rawTokens = String(qText || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    const meaningful = rawTokens.filter(function (t) { return !STOP.has(t); });
    const use = meaningful.length ? meaningful : rawTokens;
    return use.map(function (raw) {
      const t = raw.replace(/^[.,;:?!()]+|[.,;:?!()]+$/g, '');
      const clean = t || raw;
      const synsSet = new Set();
      const addSyns = function (k) {
        const s = SYN_MAP.get(k);
        if (s) s.forEach(function (v) { synsSet.add(v); });
      };
      addSyns(clean);
      if (clean.indexOf('/') >= 0) addSyns(clean.replace(/\//g, ''));
      const st = stem(clean);
      addSyns(st);
      const exactHit = vocab.indexOf(clean) >= 0 || vocab.indexOf(st) >= 0;
      const typo = !exactHit && synsSet.size === 0 ? bestTypo(clean, vocab) : '';
      return { term: clean, stem: st, syns: Array.from(synsSet), typo: typo };
    });
  }

  /* Query the bank with filtering, relevance ranking, acronym expansion, and bounded typo fallback. */
  function query(bank, qText, opts) {
    opts = opts || {};
    const idx = getIndex(bank);
    const raw = String(qText || '').toLowerCase().trim();
    const filterFn = opts.filterFn || function () { return true; };

    const passes = function (e, ignoreScope) {
      if (!ignoreScope && opts.role && e.role !== opts.role) return false;
      if (!ignoreScope && opts.level && e.level !== opts.level) return false;
      if (!ignoreScope && opts.topic && e.topic !== opts.topic) return false;
      if (!ignoreScope && !filterFn(e)) return false;
      return true;
    };

    if (!raw) {
      const list = bank.filter(function (e) { return passes(e, false); })
        .sort(function (a, b) { return a.level - b.level || a.id.localeCompare(b.id, undefined, { numeric: true }); });
      return { items: opts.limit ? list.slice(0, opts.limit) : list, suggestions: [], relaxedCount: list.length };
    }

    const specs = parseTerms(raw, idx.vocab);
    const suggestions = specs.filter(function (s) { return s.typo; }).map(function (s) { return s.typo; });
    const scored = [];
    let relaxedCount = 0;

    for (let i = 0; i < idx.docs.length; i++) {
      const d = idx.docs[i];
      const s = scoreDoc(d, raw, specs);
      if (s <= 0) continue;
      relaxedCount++;
      if (passes(d.e, false)) scored.push({ e: d.e, score: s });
    }

    scored.sort(function (a, b) {
      return (b.score - a.score) || (a.e.level - b.e.level) || a.e.id.localeCompare(b.e.id, undefined, { numeric: true });
    });

    const items = scored.map(function (x) { return x.e; });
    return {
      items: opts.limit ? items.slice(0, opts.limit) : items,
      suggestions: suggestions,
      relaxedCount: relaxedCount
    };
  }

  /* Distinct topics with question counts for the selected role/level/filter. */
  function topics(bank, opts) {
    opts = opts || {};
    const counts = {};
    bank.forEach(function (e) {
      if (opts.role && e.role !== opts.role) return;
      if (opts.level && e.level !== opts.level) return;
      if (opts.filterFn && !opts.filterFn(e)) return;
      counts[e.topic] = (counts[e.topic] || 0) + 1;
    });
    return Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || (a < b ? -1 : 1); })
      .map(function (t) { return { topic: t, count: counts[t] }; });
  }

  /* Related questions for a bank entry, scored by topic, shared tags, and title/topic token overlap. */
  function related(entry, bank, limit) {
    if (!entry) return [];
    const idx = getIndex(bank);
    const eTags = new Set(entry.tags || []);
    const eToks = new Set(tokenize(entry.q + ' ' + entry.topic, false));
    const scored = [];
    for (let i = 0; i < idx.docs.length; i++) {
      const d = idx.docs[i];
      if (d.e.id === entry.id) continue;
      let s = 0;
      if (d.e.topic === entry.topic) s += d.e.role === entry.role ? 6 : 3;
      (d.e.tags || []).forEach(function (t) { if (eTags.has(t)) s += 3; });
      let overlap = 0;
      eToks.forEach(function (t) { if (d.relToks.has(t)) overlap++; });
      s += Math.min(overlap, 5);
      if (s >= 4) {
        if (d.e.role === entry.role) s += 1;
        if (Math.abs(d.e.level - entry.level) <= 1) s += 0.5;
        scored.push({ e: d.e, score: s });
      }
    }
    scored.sort(function (a, b) { return b.score - a.score || a.e.level - b.e.level; });
    return scored.slice(0, limit || 4).map(function (x) { return x.e; });
  }

  /* Lower-gear prerequisite questions for Gear 2..4 entries. */
  function prerequisites(entry, bank, limit) {
    if (!entry || entry.level <= 1) return [];
    const idx = getIndex(bank);
    const eTags = new Set(entry.tags || []);
    const eToks = new Set(tokenize(entry.q + ' ' + entry.topic, false));
    const scored = [];
    for (let i = 0; i < idx.docs.length; i++) {
      const d = idx.docs[i];
      if (d.e.id === entry.id || d.e.level >= entry.level) continue;
      let s = 0;
      if (d.e.role === entry.role && d.e.topic === entry.topic) s += 7;
      else if (d.e.topic === entry.topic) s += 3;
      let tagHits = 0;
      (d.e.tags || []).forEach(function (t) { if (eTags.has(t)) tagHits++; });
      s += tagHits * 2.5;
      let overlap = 0;
      eToks.forEach(function (t) { if (d.relToks.has(t)) overlap++; });
      s += Math.min(overlap, 4);
      if (s >= 4 && (d.e.role === entry.role || tagHits >= 2 || d.e.topic === entry.topic)) {
        if (d.e.role === entry.role) s += 2;
        if (d.e.level === entry.level - 1) s += 1;
        scored.push({ e: d.e, score: s });
      }
    }
    scored.sort(function (a, b) { return b.score - a.score || b.e.level - a.e.level; });
    return scored.slice(0, limit || 3).map(function (x) { return x.e; });
  }

  function pickRandom(items, lastId, rng) {
    if (!items || !items.length) return null;
    if (items.length === 1) return items[0];
    const pool = lastId ? items.filter(function (x) { return x.id !== lastId; }) : items;
    const use = pool.length ? pool : items;
    const r = typeof rng === 'function' ? rng() : Math.random();
    return use[Math.min(use.length - 1, Math.floor(r * use.length))];
  }

  IGU.search = {
    SYNONYM_GROUPS: SYNONYM_GROUPS, tokenize: tokenize, editDistance: editDistance,
    query: query, topics: topics, related: related, prerequisites: prerequisites, pickRandom: pickRandom
  };
})();
