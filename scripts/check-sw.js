#!/usr/bin/env node
/* Checks service-worker precache integrity, cache versioning, missing files, and manifest consistency.
   Run: npm run sw:check */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function verify(root) {
  const swSrc = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));

  const ctx = { self: { addEventListener: () => {} } };
  vm.createContext(ctx);
  vm.runInContext(swSrc + '\n;this.__CACHE = CACHE; this.__SHELL = SHELL;', ctx, { filename: 'sw.js' });

  const cacheName = ctx.__CACHE;
  const shell = Array.from(ctx.__SHELL || []);
  const errors = [];

  if (!/^igu-v\d+$/.test(String(cacheName || ''))) {
    errors.push('Invalid CACHE version name: ' + cacheName);
  }
  const seen = new Set();
  shell.forEach((entry) => {
    if (seen.has(entry)) errors.push('Duplicate entry in sw.js SHELL: ' + entry);
    seen.add(entry);
    if (entry === './') return;
    if (!fs.existsSync(path.join(root, entry))) errors.push('Missing file in sw.js SHELL: ' + entry);
  });

  const loaded = [...html.matchAll(/(?:src|href)="((?:js|data|css|assets)\/[^"]+|favicon\.svg|manifest\.webmanifest)"/g)].map((m) => m[1]);
  loaded.forEach((f) => {
    if (!seen.has(f)) errors.push('Asset loaded by index.html is not precached in sw.js: ' + f);
    if (!fs.existsSync(path.join(root, f))) errors.push('Asset loaded by index.html is missing on disk: ' + f);
  });

  (manifest.icons || []).forEach((ic) => {
    if (!seen.has(ic.src)) errors.push('Manifest icon is not precached in sw.js: ' + ic.src);
    if (!fs.existsSync(path.join(root, ic.src))) errors.push('Manifest icon missing on disk: ' + ic.src);
  });

  if (!/caches\.delete/.test(swSrc)) errors.push('sw.js activate handler must delete old caches.');
  if (!/navigate/.test(swSrc)) errors.push('sw.js fetch fallback should guard index.html fallback to navigation/document requests.');

  return { ok: errors.length === 0, cacheName, shellCount: shell.length, errors };
}

if (require.main === module) {
  const res = verify(path.join(__dirname, '..'));
  if (!res.ok) {
    console.error('Service worker check failed:\n- ' + res.errors.join('\n- '));
    process.exit(1);
  }
  console.log('Service worker ok (' + res.cacheName + ', ' + res.shellCount + ' precached entries).');
}

module.exports = { verify };
