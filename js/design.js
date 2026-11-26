/* System design workspace helpers: workspace shape, Mermaid export, deterministic rubric, related questions.
   The rubric checks whether each part of the exercise was addressed; it cannot judge whether the design is good. Pure functions. */
(function () {
  const IGU = (window.IGU = window.IGU || {});
  const Q = IGU.quality;

  const SECTIONS = [
    { id: 'requirements', label: 'Requirements', hint: 'Functional and non-functional requirements, and what is out of scope.' },
    { id: 'estimation', label: 'Capacity estimation', hint: 'Users, requests per second, storage, bandwidth. Show your arithmetic.' },
    { id: 'api', label: 'API design', hint: 'Main endpoints or events with inputs and outputs.' },
    { id: 'data', label: 'Data model and storage', hint: 'Entities, access patterns, database choice and why, partitioning.' },
    { id: 'architecture', label: 'Architecture notes', hint: 'How a request flows through the components.' },
    { id: 'bottlenecks', label: 'Bottlenecks and reliability', hint: 'What breaks first under load, replication, failover, retries and backpressure.' },
    { id: 'observability', label: 'Observability', hint: 'SLOs, the metrics and alerts you would add, logs and traces, and how on-call finds the cause.' },
    { id: 'security', label: 'Security and abuse', hint: 'Authentication, authorisation, data protection, rate limits and abuse cases.' },
    { id: 'tradeoffs', label: 'Trade-offs', hint: 'What you chose, what you gave up, and what you would change at 10x.' },
    { id: 'outline', label: 'Final answer outline', hint: 'The 5 to 10 steps you would say out loud in the interview.' }
  ];
  const LEVELS = ['Not addressed', 'Thin', 'Good', 'Strong'];
  const MAX_TEXT = 6000;

  /* Failure scenarios every design should survive (Phase 8). The learner writes what happens and how the design copes. */
  const FAILURES = [
    { id: 'db', label: 'Database failure', prompt: 'The primary database becomes unavailable for 5 minutes. What do users see, and how do you recover without losing writes?' },
    { id: 'queue', label: 'Queue lag', prompt: 'Consumers fall an hour behind the queue. What is delayed, how do you notice, and how do you catch up?' },
    { id: 'hotkey', label: 'Hot keys', prompt: 'One key (a celebrity, a viral link) gets 100x the traffic of any other. Where does that hurt and what do you change?' },
    { id: 'retry', label: 'Retry storm', prompt: 'A dependency slows down and every client retries at once. How do you stop retries from making it worse?' },
    { id: 'region', label: 'Regional outage', prompt: 'A whole region goes down. What keeps working, what is the recovery point and recovery time?' },
    { id: 'consistency', label: 'Data inconsistency', prompt: 'Two replicas or services disagree about the same record. How would you detect it and which one wins?' },
    { id: 'spike', label: 'Traffic spike', prompt: 'Traffic jumps 10x in a minute. What scales automatically, what is shed, and what is the first bottleneck?' },
    { id: 'cache', label: 'Cache failure', prompt: 'The cache cluster is flushed or lost. How do you protect the database while it warms up?' },
    { id: 'abuse', label: 'Abuse and rate limiting', prompt: 'A bot sends a flood of expensive requests. How do you limit it without blocking real users?' }
  ];

  /* Editable capacity assumptions and the arithmetic they imply. Inputs are clamped; outputs are rounded estimates. */
  const ASSUMPTION_FIELDS = [
    { id: 'dau', label: 'Daily active users', def: 1000000, min: 1, max: 5e9 },
    { id: 'perUser', label: 'Requests per user per day', def: 20, min: 0, max: 100000 },
    { id: 'writeShare', label: 'Writes, % of requests', def: 10, min: 0, max: 100 },
    { id: 'peak', label: 'Peak to average ratio', def: 3, min: 1, max: 100 },
    { id: 'bytes', label: 'Bytes stored per write', def: 1000, min: 0, max: 1e9 },
    { id: 'years', label: 'Years of data kept', def: 3, min: 0, max: 50 }
  ];
  function cleanAssumptions(a) {
    const out = {};
    ASSUMPTION_FIELDS.forEach(function (f) {
      const n = Number(a && a[f.id]);
      out[f.id] = isFinite(n) && a && a[f.id] !== '' && a[f.id] !== null && a[f.id] !== undefined ? Math.max(f.min, Math.min(f.max, n)) : f.def;
    });
    return out;
  }
  const human = function (n) {
    const u = [[1e12, ' T'], [1e9, ' B'], [1e6, ' M'], [1e3, ' K']];
    for (let i = 0; i < u.length; i++) if (n >= u[i][0]) return (Math.round(n / u[i][0] * 10) / 10) + u[i][1];
    return String(Math.round(n * 10) / 10);
  };
  const bytes = function (n) {
    const u = [[1e15, ' PB'], [1e12, ' TB'], [1e9, ' GB'], [1e6, ' MB'], [1e3, ' KB']];
    for (let i = 0; i < u.length; i++) if (n >= u[i][0]) return (Math.round(n / u[i][0] * 10) / 10) + u[i][1];
    return Math.round(n) + ' B';
  };
  function estimate(a) {
    a = cleanAssumptions(a);
    const perDay = a.dau * a.perUser;
    const avg = perDay / 86400;
    const writes = avg * a.writeShare / 100;
    const storage = writes * 86400 * 365 * a.years * a.bytes;
    return {
      assumptions: a,
      requestsPerDay: perDay, avgRps: avg, peakRps: avg * a.peak, writesPerSec: writes, readsPerSec: avg - writes, storageBytes: storage,
      lines: [
        'Requests per day = ' + human(a.dau) + ' users x ' + a.perUser + ' = ' + human(perDay) + '.',
        'Average = ' + human(perDay) + ' / 86,400 s = ' + human(avg) + ' requests per second; peak x' + a.peak + ' = ' + human(avg * a.peak) + ' per second.',
        'Writes = ' + a.writeShare + '% = ' + human(writes) + ' per second; reads = ' + human(avg - writes) + ' per second.',
        'Storage = ' + human(writes) + ' writes/s x 86,400 x 365 x ' + a.years + ' years x ' + bytes(a.bytes) + ' = ' + bytes(storage) + ' (before replication).'
      ]
    };
  }

  /* Interview-shaped steps, done when the parts they need have some writing. Used as checkpoints in the workspace. */
  function steps(ws) {
    const w = function (id) { return words(ws.sections[id] || ''); };
    const failuresDone = Object.keys(ws.failures || {}).filter(function (k) { return words(ws.failures[k]) >= 8; }).length;
    return [
      { id: 'requirements', label: 'Clarify requirements', done: w('requirements') >= 15 || Object.keys(ws.checks).length >= 3 },
      { id: 'estimation', label: 'Estimate scale', done: w('estimation') >= 10 || !!ws.assumptionsSet },
      { id: 'api', label: 'API and data model', done: w('api') >= 8 && w('data') >= 10 },
      { id: 'architecture', label: 'Architecture and flow', done: w('architecture') >= 15 || parseFlows(ws.diagram).edges.length >= 3 },
      { id: 'failures', label: 'Failures and reliability', done: failuresDone >= 3 || w('bottlenecks') >= 20 },
      { id: 'operate', label: 'Observability and security', done: w('observability') >= 10 && w('security') >= 10 },
      { id: 'tradeoffs', label: 'Trade-offs and outline', done: w('tradeoffs') >= 15 && w('outline') >= 15 }
    ];
  }

  /* Layered layout for the diagram preview: each node sits one column right of its furthest predecessor (cycles are broken). */
  function layout(parsed) {
    const n = parsed.nodes.length, layer = new Array(n).fill(0);
    /* Drop back edges found by a depth-first walk, so the rest is acyclic, then take the longest path to each node. */
    const out = parsed.nodes.map(function () { return []; });
    parsed.edges.forEach(function (e, i) { out[e.from].push(i); });
    const state = new Array(n).fill(0), back = {};
    const visit = function (v) {
      state[v] = 1;
      out[v].forEach(function (i) { const w = parsed.edges[i].to; if (state[w] === 1) back[i] = 1; else if (state[w] === 0) visit(w); });
      state[v] = 2;
    };
    for (let v = 0; v < n; v++) if (!state[v]) visit(v);
    const dag = parsed.edges.filter(function (e, i) { return !back[i] && e.from !== e.to; });
    for (let pass = 0; pass < n; pass++) {
      let changed = false;
      dag.forEach(function (e) { if (layer[e.to] < layer[e.from] + 1) { layer[e.to] = layer[e.from] + 1; changed = true; } });
      if (!changed) break;
    }
    const cols = {}, pos = [];
    layer.forEach(function (l, i) { cols[l] = cols[l] || []; pos[i] = { col: l, row: cols[l].length }; cols[l].push(i); });
    const W = 150, H = 44, GX = 60, GY = 26;
    const rows = Object.keys(cols).reduce(function (m, k) { return Math.max(m, cols[k].length); }, 0);
    const ncols = Object.keys(cols).length;
    return {
      width: Math.max(1, ncols) * (W + GX) - GX + 20, height: Math.max(1, rows) * (H + GY) - GY + 20, nodeW: W, nodeH: H,
      nodes: parsed.nodes.map(function (name, i) { return { name: name, x: 10 + pos[i].col * (W + GX), y: 10 + pos[i].row * (H + GY) }; }),
      edges: parsed.edges
    };
  }

  function blank(problemId) {
    const sections = {}; SECTIONS.forEach(function (s) { sections[s.id] = ''; });
    return { problemId: problemId, sections: sections, checks: {}, diagram: '', revealed: 0, failures: {}, assumptions: null, assumptionsSet: false, updatedAt: '' };
  }

  function clean(ws, problemId) {
    const out = blank(problemId);
    ws = ws || {};
    SECTIONS.forEach(function (s) { out.sections[s.id] = String((ws.sections || {})[s.id] || '').slice(0, MAX_TEXT); });
    Object.keys(ws.checks || {}).slice(0, 60).forEach(function (k) { if (ws.checks[k]) out.checks[k] = 1; });
    out.diagram = String(ws.diagram || '').slice(0, 3000);
    out.revealed = Math.max(0, Math.min(4, Math.floor(Number(ws.revealed) || 0)));
    FAILURES.forEach(function (f) { const t = String((ws.failures || {})[f.id] || '').slice(0, 1500); if (t.trim()) out.failures[f.id] = t; });
    out.assumptionsSet = !!ws.assumptionsSet;
    out.assumptions = ws.assumptions ? cleanAssumptions(ws.assumptions) : null;
    out.updatedAt = String(ws.updatedAt || '');
    return out;
  }

  /* One edge per line: "Client -> API gateway: HTTPS". Unparseable lines are reported, not silently dropped. */
  function parseFlows(text) {
    const nodes = [], edges = [], bad = [];
    const idx = function (n) { let i = nodes.indexOf(n); if (i < 0) { if (nodes.length >= 40) return -1; nodes.push(n); i = nodes.length - 1; } return i; };
    String(text || '').split('\n').forEach(function (line, n) {
      line = line.trim(); if (!line) return;
      const m = /^(.+?)\s*(?:->|→)\s*(.+?)(?:\s*:\s*(.*))?$/.exec(line);
      if (!m) { bad.push(n + 1); return; }
      const a = idx(m[1].trim().slice(0, 40)), b = idx(m[2].trim().slice(0, 40));
      if (a < 0 || b < 0 || edges.length >= 80) { bad.push(n + 1); return; }
      edges.push({ from: a, to: b, label: (m[3] || '').trim().slice(0, 40) });
    });
    return { nodes: nodes, edges: edges, bad: bad };
  }

  const safe = function (s) { return String(s).replace(/["`<>{}\[\]()|\;#&]/g, ' ').replace(/\s+/g, ' ').trim() || 'node'; };

  function toMermaid(parsed) {
    const lines = ['flowchart LR'];
    parsed.nodes.forEach(function (n, i) { lines.push('  n' + i + '["' + safe(n) + '"]'); });
    parsed.edges.forEach(function (e) { lines.push('  n' + e.from + (e.label ? ' -->|' + safe(e.label) + '| ' : ' --> ') + 'n' + e.to); });
    return lines.join('\n');
  }

  const words = function (t) { return t.trim() ? t.trim().split(/\s+/).length : 0; };
  const hitCount = function (res, t) { return res.filter(function (r) { return r.test(t); }).length; };
  const cap = function (n) { return Math.max(0, Math.min(3, Math.round(n))); };

  /* Deterministic review. Returns { dims:[{id,label,level,note}], total, max, band }. */
  function review(ws, problem) {
    const s = ws.sections;
    const flows = parseFlows(ws.diagram);
    const prompts = problem.functional.length + problem.nonfunctional.length;
    const checked = Object.keys(ws.checks).length;
    const dims = [];
    const add = function (id, label, level, ok, gap, why) { dims.push({ id: id, label: label, level: cap(level), note: cap(level) >= 3 ? ok : gap, why: why || '' }); };

    add('requirements', 'Requirements', (checked / Math.max(1, prompts)) * 2 + (words(s.requirements) >= 40 ? 1 : words(s.requirements) >= 15 ? 0.5 : 0),
      'Requirements were clarified and written down.', 'Ask more clarifying questions (tick the prompts you covered) and write functional and non-functional requirements.',
      checked + ' of ' + prompts + ' clarifying questions ticked; ' + words(s.requirements) + ' words of requirements.');
    const nums = (s.estimation.match(/\d[\d,.]*/g) || []).length;
    add('scale', 'Scale and estimation', (nums >= 6 ? 2 : nums >= 3 ? 1.5 : nums >= 1 ? 1 : 0) + (/per second|qps|rps|\/s|gb|tb|mb|bandwidth/i.test(s.estimation) ? 1 : 0),
      'Numbers with units that drive design decisions.', 'Estimate requests per second, storage and bandwidth, and say which number drives the design.',
      nums + ' numbers in your estimate' + (/per second|qps|rps|\/s|gb|tb|mb|bandwidth/i.test(s.estimation) ? ', with units' : ', no rate or size units') + '.');
    add('architecture', 'Architecture', (flows.nodes.length >= 4 ? 1.5 : flows.nodes.length >= 3 ? 1 : 0) + (flows.edges.length >= 3 ? 0.5 : 0) + (words(s.architecture) >= 40 ? 1 : words(s.architecture) >= 15 ? 0.5 : 0) + (flows.nodes.length >= 3 && flows.edges.length >= 3 ? 0.5 : 0),
      'Components and request flow are described.', 'List at least three components and how a request flows between them (one "A -> B: label" per line).',
      flows.nodes.length + ' components and ' + flows.edges.length + ' connections in the diagram; ' + words(s.architecture) + ' words of notes.');
    add('data', 'Data and API', hitCount([/sql|nosql|key-?value|document|wide-?column|relational|graph/i, /index|partition|shard|replica|schema|table|primary key/i, /get |post |put |delete |\/[a-z{]/i], s.data + ' ' + s.api) + (words(s.data) >= 30 ? 0.5 : 0),
      'Storage choice, access patterns and API are covered.', 'Name the entities and access patterns, choose a store and say why, and sketch the main API calls.',
      'Store type, keys or partitioning, and API calls found: ' + hitCount([/sql|nosql|key-?value|document|wide-?column|relational|graph/i, /index|partition|shard|replica|schema|table|primary key/i, /get |post |put |delete |\/[a-z{]/i], s.data + ' ' + s.api) + ' of 3.');
    const failTexts = FAILURES.map(function (f) { return ws.failures && ws.failures[f.id] || ''; });
    const failDone = failTexts.filter(function (t) { return words(t) >= 8; }).length;
    const relText = s.bottlenecks + ' ' + failTexts.join(' ');
    add('reliability', 'Reliability', hitCount([/fail|outage|down|crash/i, /replica|redundan|failover|backup|multi-?az|region/i, /retry|timeout|backoff|circuit|idempot/i, /cache|queue|rate limit|throttl|shed|backpressure/i], relText) * 0.75,
      'Replication, failover, retries and backpressure are covered.', 'Say what fails first under load and how replication, timeouts, retries with backoff and load shedding keep it up.',
      'Reliability terms found in your bottlenecks and failure notes: ' + hitCount([/fail|outage|down|crash/i, /replica|redundan|failover|backup|multi-?az|region/i, /retry|timeout|backoff|circuit|idempot/i, /cache|queue|rate limit|throttl|shed|backpressure/i], relText) + ' of 4 groups.');
    add('failures', 'Failure scenarios', failDone >= 6 ? 3 : failDone >= 3 ? 2 : failDone >= 1 ? 1 : 0,
      'Most failure scenarios are worked through.', 'Work through the failure scenarios: what users see, how you detect it, how you recover.',
      failDone + ' of ' + FAILURES.length + ' failure scenarios answered (8 or more words each).');
    add('observability', 'Observability', hitCount([/slo|sli|error budget|latency target|p9\d/i, /metric|dashboard|prometheus|counter|histogram/i, /alert|page|on-?call/i, /log|trace|tracing|span|correlation id/i], s.observability) * 0.75 + (words(s.observability) >= 30 ? 0.5 : 0),
      'SLOs, metrics, alerts and traces are defined.', 'Name the SLO, the metrics you alert on, and how logs and traces lead on-call to the cause.',
      'Observability groups found (SLOs, metrics, alerts, logs or traces): ' + hitCount([/slo|sli|error budget|latency target|p9\d/i, /metric|dashboard|prometheus|counter|histogram/i, /alert|page|on-?call/i, /log|trace|tracing|span|correlation id/i], s.observability) + ' of 4.');
    add('security', 'Security and abuse', hitCount([/auth|oauth|token|session|login/i, /permission|authori[sz]|role|acl|tenant/i, /encrypt|tls|pii|secret|key management|kms/i, /rate limit|abuse|captcha|bot|ddos|quota/i], s.security + ' ' + (ws.failures && ws.failures.abuse || '')) * 0.75 + (words(s.security) >= 30 ? 0.5 : 0),
      'Authentication, authorisation, data protection and abuse limits are covered.', 'Cover who can call what, how data is protected, and how abuse is limited.',
      'Security groups found (authentication, authorisation, data protection, abuse): ' + hitCount([/auth|oauth|token|session|login/i, /permission|authori[sz]|role|acl|tenant/i, /encrypt|tls|pii|secret|key management|kms/i, /rate limit|abuse|captcha|bot|ddos|quota/i], s.security + ' ' + (ws.failures && ws.failures.abuse || '')) + ' of 4.');
    add('tradeoffs', 'Trade-offs', hitCount([/trade-?off/i, /because|since|so that/i, /instead of|alternative|versus|vs\.?|rather than/i, /cost|latency|consisten|complex/i], s.tradeoffs) * 0.8,
      'Choices come with reasons and alternatives.', 'For each major choice say what you gave up and what the alternative was.',
      'Trade-off signals found (trade-off, because, alternative, cost or latency): ' + hitCount([/trade-?off/i, /because|since|so that/i, /instead of|alternative|versus|vs\.?|rather than/i, /cost|latency|consisten|complex/i], s.tradeoffs) + ' of 4.');
    const steps = s.outline.split('\n').filter(function (l) { return l.trim().length > 5; }).length;
    add('communication', 'Communication', (words(s.outline) >= 60 ? 1.5 : words(s.outline) >= 25 ? 1 : 0) + (steps >= 5 ? 1.5 : steps >= 3 ? 1 : 0),
      'A clear, ordered outline you can say out loud.', 'Write the outline as 5 to 10 ordered steps you could say in about 30 minutes.',
      steps + ' outline steps, ' + words(s.outline) + ' words.');

    const total = dims.reduce(function (n, d) { return n + d.level; }, 0), max = dims.length * 3, f = total / max;
    return { dims: dims, total: total, max: max, band: f < 0.35 ? 'Early draft' : f < 0.6 ? 'Developing' : f < 0.85 ? 'Solid' : 'Thorough' };
  }

  function relatedQuestions(bank, problem, limit) {
    const res = problem.related.map(function (w) { return new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); });
    return bank.filter(function (e) { return res.some(function (r) { return r.test(e.q + ' ' + e.topic); }); })
      .sort(function (a, b) { return (Q.isReal(b) - Q.isReal(a)) || (a.id < b.id ? -1 : 1); }).slice(0, limit || 6);
  }

  function toMarkdown(ws, problem) {
    const r = review(ws, problem);
    const out = ['# System design: ' + problem.title, '', '_' + problem.summary + '_', ''];
    SECTIONS.forEach(function (s) { out.push('## ' + s.label, '', ws.sections[s.id].trim() || '_Not written._', ''); });
    if (ws.assumptionsSet && ws.assumptions) { out.push('## Capacity assumptions', ''); estimate(ws.assumptions).lines.forEach(function (l) { out.push('- ' + l); }); out.push(''); }
    const fl = FAILURES.filter(function (f) { return ws.failures && String(ws.failures[f.id] || '').trim(); });
    if (fl.length) { out.push('## Failure scenarios', ''); fl.forEach(function (f) { out.push('### ' + f.label, '', '_' + f.prompt + '_', '', ws.failures[f.id].trim(), ''); }); }
    const parsed = parseFlows(ws.diagram);
    if (parsed.nodes.length) out.push('## Diagram', '', '```mermaid', toMermaid(parsed), '```', '');
    out.push('## Self-review (fixed rubric)', '', '> Checks whether each part was addressed. It cannot judge whether the design is good.', '');
    r.dims.forEach(function (d) { out.push('- ' + d.label + ': ' + LEVELS[d.level] + (d.why ? '. ' + d.why : '')); });
    return out.join('\n');
  }

  IGU.design = { FAILURES: FAILURES, ASSUMPTION_FIELDS: ASSUMPTION_FIELDS, cleanAssumptions: cleanAssumptions, estimate: estimate, steps: steps, layout: layout, SECTIONS: SECTIONS, LEVELS: LEVELS, blank: blank, clean: clean, parseFlows: parseFlows, toMermaid: toMermaid, review: review, relatedQuestions: relatedQuestions, toMarkdown: toMarkdown };
})();
