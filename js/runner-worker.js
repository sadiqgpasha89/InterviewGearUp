/* Dedicated worker that runs the learner's code. It has no DOM, no access to localStorage or the page, and the main
   thread terminates it if it runs too long. Network and storage APIs are removed before any user code runs (best effort). */
importScripts('coding-core.js');
(function () {
  const core = self.IGU.codingCore;
  ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'indexedDB', 'caches', 'BroadcastChannel', 'Worker', 'SharedWorker', 'WebTransport'].forEach(function (k) {
    try { Object.defineProperty(self, k, { value: undefined, configurable: false, writable: false }); } catch (e) { try { self[k] = undefined; } catch (x) { /* ignore */ } }
  });
  try { Object.defineProperty(self.navigator, 'sendBeacon', { value: undefined }); } catch (e) { /* ignore */ }
  self.onmessage = function (ev) {
    const m = ev.data || {};
    const out = core.runTests(m.code, m.fn, m.tests || []);
    self.postMessage(out);
  };
})();
