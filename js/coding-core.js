/* Test runner core for the coding lab. It runs inside a dedicated Web Worker (js/runner-worker.js), never in the page.
   The same file is loaded by test/run.js so every problem's reference solution is checked against its tests. */
(function () {
  const root = typeof window !== 'undefined' ? window : self;
  const IGU = (root.IGU = root.IGU || {});

  const show = function (v) {
    let s;
    try { s = v === undefined ? 'undefined' : JSON.stringify(v); } catch (e) { s = String(v); }
    s = String(s);
    return s.length > 160 ? s.slice(0, 157) + '...' : s;
  };

  /* Structural equality for JSON-like values (arrays, plain objects, primitives, NaN). */
  function deepEqual(a, b) {
    if (a === b || (a !== a && b !== b)) return true;
    if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every(function (k) { return Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]); });
  }

  /* Returns { error?, logs, results:[{pass, got, expected, error?}] }. Each test gets a fresh copy of its arguments. */
  function runTests(code, fnName, tests) {
    const logs = [];
    const fakeConsole = {};
    ['log', 'info', 'warn', 'error'].forEach(function (k) { fakeConsole[k] = function () { if (logs.length < 20) logs.push(Array.prototype.map.call(arguments, show).join(' ').slice(0, 200)); }; });
    let fn;
    try {
      fn = new Function('console', '"use strict";\n' + String(code) + '\n;return (typeof ' + fnName + ' === "function") ? ' + fnName + ' : undefined;')(fakeConsole);
    } catch (e) { return { error: (e && e.name ? e.name + ': ' : '') + (e && e.message || e), logs: logs, results: [] }; }
    if (typeof fn !== 'function') return { error: 'Define a function named ' + fnName + '.', logs: logs, results: [] };
    const results = tests.map(function (t) {
      try {
        const got = fn.apply(null, JSON.parse(JSON.stringify(t.args)));
        return { pass: deepEqual(got, t.expected), got: show(got), expected: show(t.expected) };
      } catch (e) { return { pass: false, got: '', expected: show(t.expected), error: (e && e.name ? e.name + ': ' : '') + (e && e.message || e) }; }
    });
    return { error: '', logs: logs, results: results };
  }

  /* ---------- Coding feedback rubric (Phase 3) ----------
     Built from the real test run plus simple checks on the code text. Correctness and edge cases come from tests;
     complexity, decomposition and code quality are hints from the source, not proofs. Returns
     { dims:[{id,label,level,why,note}], actions:[max 3], total, max }. Testing and communication cannot be observed
     from code alone, so they are left to the learner's self-check. */
  const isEdge = function (t) {
    const a = JSON.stringify(t.args);
    return /\[\]|""|\[\[\]\]|^\[0\]$|^\[\[-?\d+\]\]$|^\["."\]$/.test(a) || (Array.isArray(t.args[0]) && t.args[0].length <= 1) || (typeof t.args[0] === 'string' && t.args[0].length <= 1);
  };
  function loopDepth(code) {
    const src = String(code).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    let depth = 0, max = 0;
    const stack = [];
    const re = /\b(for|while)\b|\.(forEach|map|filter|reduce|some|every|find|findIndex|indexOf|includes)\s*\(|[{}]/g;
    let m, pendingLoop = false;
    while ((m = re.exec(src))) {
      if (m[0] === '{') { stack.push(pendingLoop); if (pendingLoop) { depth++; max = Math.max(max, depth); } pendingLoop = false; }
      else if (m[0] === '}') { if (stack.pop()) depth--; }
      else if (m[1]) pendingLoop = true;
      else if (/indexOf|includes/.test(m[2]) && depth > 0) max = Math.max(max, depth + 1); // linear scan inside a loop
      else if (m[2]) pendingLoop = true;
    }
    return max;
  }
  function expectedTime(problem) {
    const c = String(problem.solution && problem.solution.complexity || '');
    const m = c.match(/Time\s+(O\([^)]*\))/i) || c.match(/(O\([^)]*\))/);
    return m ? m[1].replace(/\s+/g, '') : '';
  }
  function review(code, problem, run) {
    const src = String(code || '');
    const dims = [];
    const add = function (id, label, level, why, note) { dims.push({ id: id, label: label, level: Math.max(0, Math.min(3, level)), why: why, note: note }); };
    const results = (run && run.results) || [];
    const total = problem.tests.length, passed = results.filter(function (r) { return r.pass; }).length;
    const ran = run && run.state === 'done' && !run.error;
    add('correctness', 'Correctness', !ran ? 0 : passed === total ? 3 : passed / total >= 0.75 ? 2 : passed ? 1 : 0,
      ran ? passed + ' of ' + total + ' tests pass.' : 'The code did not run: ' + ((run && run.error) || 'no result') + '.',
      'Trace a failing test by hand with the input shown, and fix the first place your values differ.');
    const edgeIdx = problem.tests.map(function (t, i) { return isEdge(t) ? i : -1; }).filter(function (i) { return i >= 0; });
    if (edgeIdx.length) {
      const ep = edgeIdx.filter(function (i) { return results[i] && results[i].pass; }).length;
      add('edges', 'Edge cases', !ran ? 0 : ep === edgeIdx.length ? 3 : ep ? 1 : 0, ep + ' of ' + edgeIdx.length + ' edge-case tests (empty or single-element input) pass.',
        'Handle the smallest inputs first: empty, one element' + (problem.solution && problem.solution.edgeCases ? ', and ' + problem.solution.edgeCases.slice(0, 2).join(', ').toLowerCase() : '') + '.');
    }
    const exp = expectedTime(problem), depth = loopDepth(src);
    const fastExpected = /O\((1|n|logn|n\+m|nlogn|n\+mlogm)\)/i.test(exp);
    const stated = /O\([^)]*\)/.test(src);
    const cx = !src.trim() ? 0 : (fastExpected && depth >= 2 ? 1 : 3) - (stated ? 0 : 1);
    add('complexity', 'Complexity and optimisation', cx,
      (depth >= 2 ? 'Nested loops found (usually O(n^2) or worse). ' : depth === 1 ? 'A single pass over the input. ' : 'No loops found. ') + (exp ? 'The reference solution is ' + exp + '. ' : '') + (stated ? 'You stated a complexity.' : 'You did not state the complexity.'),
      depth >= 2 && fastExpected ? 'Look for a data structure (a Map or Set) that replaces the inner loop.' : 'Add a comment with the time and space complexity, as you would say it aloud.');
    const lines = src.split('\n').filter(function (l) { return l.trim(); }).length;
    const helpers = (src.match(/\bfunction\b|=>/g) || []).length;
    const shortNames = (src.match(/\b(?:let|const|var)\s+([a-z])\b/g) || []).filter(function (d) { return !/\s[ijkn]$/.test(d); }).length;
    add('decomposition', 'Problem decomposition', !src.trim() ? 0 : lines > 45 && helpers < 2 ? 1 : shortNames > 2 ? 2 : 3,
      lines + ' non-empty lines, ' + helpers + ' function' + (helpers === 1 ? '' : 's') + (shortNames ? ', ' + shortNames + ' one-letter variable names' : '') + '.',
      lines > 45 ? 'Split the work into small named steps or helpers.' : 'Use names that say what a value holds (seen, left, result).');
    const issues = [];
    if (/\bvar\b/.test(src)) issues.push('uses var');
    if (/console\.log/.test(src)) issues.push('leftover console.log');
    if (/==[^=]/.test(src.replace(/[!=]==/g, ''))) issues.push('loose equality (==)');
    add('quality', 'Code quality', !src.trim() ? 0 : 3 - issues.length, issues.length ? 'Found: ' + issues.join(', ') + '.' : 'No var, no loose equality, no leftover logging.',
      'Prefer const and let, strict equality and no debug output in the final answer.');
    const actions = dims.filter(function (d) { return d.level < 3; }).sort(function (a, b) { return a.level - b.level; }).slice(0, 3).map(function (d) { return d.label + ': ' + d.note; });
    const t = dims.reduce(function (n, d) { return n + d.level; }, 0);
    return { dims: dims, actions: actions, total: t, max: dims.length * 3 };
  }

  IGU.codingCore = { deepEqual: deepEqual, runTests: runTests, review: review, loopDepth: loopDepth, expectedTime: expectedTime };
})();
