#!/usr/bin/env node
/* Maintainer tool: checks that every reference link in the question bank still answers (HTTP status below 400).
   Needs network access, so it is not part of `npm test`. Usage: npm run refs:check */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { dataFiles } = require('./lib/data-files');

const root = path.join(__dirname, '..');
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
['js/config.js', 'js/quality.js', 'js/engine.js'].concat(dataFiles(root))
  .forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const urls = {};
ctx.IGU.bank.forEach((e) => (e.references || []).forEach((r) => { (urls[r.url] = urls[r.url] || []).push(e.id); }));

(async () => {
  let bad = 0;
  for (const url of Object.keys(urls).sort()) {
    let status = 'error';
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000) });
      status = res.status;
    } catch (e) { status = e.name; }
    const ok = typeof status === 'number' && status < 400;
    if (!ok) bad++;
    console.log((ok ? 'ok   ' : 'FAIL ') + status + ' ' + url + ' (' + urls[url].join(', ') + ')');
  }
  console.log('\n' + Object.keys(urls).length + ' links, ' + bad + ' failing.');
  process.exitCode = bad ? 1 : 0;
})();
