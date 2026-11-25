/* Coding lab (page side): starts the isolated worker, enforces a hard time limit and reports the outcome.
   Code is NEVER evaluated in the page itself. If workers are unavailable the lab falls back to editor-only practice. */
(function () {
  const IGU = (window.IGU = window.IGU || {});
  const LIMIT_MS = 3000, MAX_CODE = 8000;

  function supported() { return typeof Worker !== 'undefined'; }

  /* Resolves { state: 'done'|'timeout'|'crash'|'unsupported', error, logs, results, passed, total }. */
  function run(code, problem, opts) {
    const limit = (opts && opts.limitMs) || LIMIT_MS;
    return new Promise(function (resolve) {
      if (!supported()) { resolve({ state: 'unsupported', error: 'This browser cannot run code in an isolated worker. Use editor-only practice and check against the tests by hand.', logs: [], results: [], passed: 0, total: problem.tests.length }); return; }
      let w;
      try { w = new Worker('js/runner-worker.js'); } catch (e) { resolve({ state: 'unsupported', error: 'Could not start the isolated runner.', logs: [], results: [], passed: 0, total: problem.tests.length }); return; }
      let done = false;
      const finish = function (r) { if (done) return; done = true; clearTimeout(t); w.terminate(); resolve(r); };
      const t = setTimeout(function () {
        finish({ state: 'timeout', error: 'Stopped after ' + (limit / 1000) + ' seconds. Check for an infinite loop or an algorithm that is too slow.', logs: [], results: [], passed: 0, total: problem.tests.length });
      }, limit);
      w.onmessage = function (ev) {
        const d = ev.data || {};
        const passed = (d.results || []).filter(function (x) { return x.pass; }).length;
        finish({ state: 'done', error: d.error || '', logs: d.logs || [], results: d.results || [], passed: passed, total: problem.tests.length });
      };
      w.onerror = function (ev) { finish({ state: 'crash', error: 'The runner stopped unexpectedly' + (ev && ev.message ? ': ' + ev.message : '.'), logs: [], results: [], passed: 0, total: problem.tests.length }); };
      w.postMessage({ code: String(code).slice(0, MAX_CODE), fn: problem.fn, tests: problem.tests });
    });
  }

  IGU.coding = { LIMIT_MS: LIMIT_MS, MAX_CODE: MAX_CODE, supported: supported, run: run };
})();
