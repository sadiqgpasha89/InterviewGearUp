#!/usr/bin/env node
/* Prints how much of the question bank has a real written answer, per role x gear, and which placeholder questions to
   write next. Usage: node scripts/content-status.js [--goal 15] [--list 5] */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const arg = (name, dflt) => { const i = process.argv.indexOf('--' + name); return i > 0 ? Number(process.argv[i + 1]) : dflt; };
const goal = arg('goal', 15), list = arg('list', 3);

const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
['js/config.js', 'js/quality.js', 'js/engine.js'].concat(require('./lib/data-files').dataFiles(root))
  .forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const { bank, meta, quality } = ctx.IGU;

const cov = quality.coverage(bank, meta);
const real = bank.filter(quality.isReal).length;
console.log(`Questions: ${bank.length}. With a real written answer: ${real}. Placeholder answers: ${bank.length - real}.`);
console.log(`Goal: ${goal} real answers per role x gear (${goal * meta.roles.length * meta.levels.length} total).\n`);
console.log('role'.padEnd(14) + meta.levels.map((l) => ('G' + l.n).padStart(6)).join('') + '   missing');
let missing = 0;
meta.roles.forEach((r) => {
  const row = cov[r.id];
  const miss = row.reduce((a, n) => a + Math.max(0, goal - n), 0);
  missing += miss;
  console.log(r.id.padEnd(14) + row.map((n) => String(n).padStart(6)).join('') + String(miss).padStart(10));
});
console.log(`\nStill to write to reach the goal: ${missing}.\n`);
console.log(`Next placeholder questions to answer (up to ${list} per thin cell):`);
meta.roles.forEach((r) => meta.levels.forEach((l) => {
  if (cov[r.id][l.n - 1] >= goal) return;
  const ph = bank.filter((e) => e.role === r.id && e.level === l.n && quality.isPlaceholder(e)).slice(0, list);
  ph.forEach((e) => console.log(`  ${e.id} (${r.id}, gear ${l.n}): ${e.q}`));
}));
