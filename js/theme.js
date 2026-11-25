/* Applies the saved colour theme before first paint. Loaded in <head> because the CSP forbids inline scripts. */
(function () {
  try {
    const t = JSON.parse(window.localStorage.getItem('igu.theme') || 'null');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) { /* storage blocked: follow the OS */ }
})();
