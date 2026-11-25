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

  IGU.codingCore = { deepEqual: deepEqual, runTests: runTests };
})();
