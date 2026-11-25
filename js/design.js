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
    { id: 'bottlenecks', label: 'Bottlenecks, reliability, security, failures', hint: 'What breaks first, how you detect and recover, what you protect.' },
    { id: 'tradeoffs', label: 'Trade-offs', hint: 'What you chose, what you gave up, and what you would change at 10x.' },
    { id: 'outline', label: 'Final answer outline', hint: 'The 5 to 10 steps you would say out loud in the interview.' }
  ];
  const LEVELS = ['Not addressed', 'Thin', 'Good', 'Strong'];
  const MAX_TEXT = 6000;

  function blank(problemId) {
    const sections = {}; SECTIONS.forEach(function (s) { sections[s.id] = ''; });
    return { problemId: problemId, sections: sections, checks: {}, diagram: '', revealed: 0, updatedAt: '' };
  }

  function clean(ws, problemId) {
    const out = blank(problemId);
    ws = ws || {};
    SECTIONS.forEach(function (s) { out.sections[s.id] = String((ws.sections || {})[s.id] || '').slice(0, MAX_TEXT); });
    Object.keys(ws.checks || {}).slice(0, 60).forEach(function (k) { if (ws.checks[k]) out.checks[k] = 1; });
    out.diagram = String(ws.diagram || '').slice(0, 3000);
    out.revealed = Math.max(0, Math.min(4, Math.floor(Number(ws.revealed) || 0)));
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
    const add = function (id, label, level, ok, gap) { dims.push({ id: id, label: label, level: cap(level), note: cap(level) >= 3 ? ok : gap }); };

    add('requirements', 'Requirements', (checked / Math.max(1, prompts)) * 2 + (words(s.requirements) >= 40 ? 1 : words(s.requirements) >= 15 ? 0.5 : 0),
      'Requirements were clarified and written down.', 'Ask more clarifying questions (tick the prompts you covered) and write functional and non-functional requirements.');
    const nums = (s.estimation.match(/\d[\d,.]*/g) || []).length;
    add('scale', 'Scale and estimation', (nums >= 6 ? 2 : nums >= 3 ? 1.5 : nums >= 1 ? 1 : 0) + (/per second|qps|rps|\/s|gb|tb|mb|bandwidth/i.test(s.estimation) ? 1 : 0),
      'Numbers with units that drive design decisions.', 'Estimate requests per second, storage and bandwidth, and say which number drives the design.');
    add('architecture', 'Architecture', (flows.nodes.length >= 4 ? 1.5 : flows.nodes.length >= 3 ? 1 : 0) + (flows.edges.length >= 3 ? 0.5 : 0) + (words(s.architecture) >= 40 ? 1 : words(s.architecture) >= 15 ? 0.5 : 0) + (flows.nodes.length >= 3 && flows.edges.length >= 3 ? 0.5 : 0),
      'Components and request flow are described.', 'List at least three components and how a request flows between them (one "A -> B: label" per line).');
    add('data', 'Data and API', hitCount([/sql|nosql|key-?value|document|wide-?column|relational|graph/i, /index|partition|shard|replica|schema|table|primary key/i, /get |post |put |delete |\/[a-z{]/i], s.data + ' ' + s.api) + (words(s.data) >= 30 ? 0.5 : 0),
      'Storage choice, access patterns and API are covered.', 'Name the entities and access patterns, choose a store and say why, and sketch the main API calls.');
    add('reliability', 'Reliability and failure', hitCount([/fail|outage|down|crash/i, /replica|redundan|failover|backup|multi-?az|region/i, /retry|timeout|backoff|circuit/i, /cache|queue|rate limit|throttl/i, /monitor|alert|metric|log/i, /auth|encrypt|secur|abuse/i], s.bottlenecks) * 0.6,
      'Failure modes, mitigation and security are covered.', 'Say what fails first, how you detect it, how you recover, and what you protect.');
    add('tradeoffs', 'Trade-offs', hitCount([/trade-?off/i, /because|since|so that/i, /instead of|alternative|versus|vs\.?|rather than/i, /cost|latency|consisten|complex/i], s.tradeoffs) * 0.8,
      'Choices come with reasons and alternatives.', 'For each major choice say what you gave up and what the alternative was.');
    const steps = s.outline.split('\n').filter(function (l) { return l.trim().length > 5; }).length;
    add('communication', 'Communication', (words(s.outline) >= 60 ? 1.5 : words(s.outline) >= 25 ? 1 : 0) + (steps >= 5 ? 1.5 : steps >= 3 ? 1 : 0),
      'A clear, ordered outline you can say out loud.', 'Write the outline as 5 to 10 ordered steps you could say in about 30 minutes.');

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
    const parsed = parseFlows(ws.diagram);
    if (parsed.nodes.length) out.push('## Diagram', '', '```mermaid', toMermaid(parsed), '```', '');
    out.push('## Self-review (fixed rubric)', '', '> Checks whether each part was addressed. It cannot judge whether the design is good.', '');
    r.dims.forEach(function (d) { out.push('- ' + d.label + ': ' + LEVELS[d.level]); });
    return out.join('\n');
  }

  IGU.design = { SECTIONS: SECTIONS, LEVELS: LEVELS, blank: blank, clean: clean, parseFlows: parseFlows, toMermaid: toMermaid, review: review, relatedQuestions: relatedQuestions, toMarkdown: toMarkdown };
})();
