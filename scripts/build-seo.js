#!/usr/bin/env node
/* Builds crawlable static pages for every question that has a written answer: q/<id>.html, q/index.html, sitemap.xml, robots.txt.
   The app is a hash-routed single page, which search engines cannot index per question; these pages are the static view of the same text.
   Output is deterministic (no timestamps), so test/run.js can check that the committed files are up to date.
   Run: npm run seo        Check only: node scripts/build-seo.js --check */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { mdToHtml, esc } = require('./lib/md-html');
const { dataFiles } = require('./lib/data-files');

function loadBank(root) {
  const ctx = { setTimeout, clearTimeout, URL };
  ctx.window = ctx;
  vm.createContext(ctx);
  ['js/config.js', 'js/quality.js', 'js/engine.js'].concat(dataFiles(root))
    .forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
  return ctx.IGU;
}

const trim = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
const CSP = "default-src 'none'; style-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'";

function build(root) {
  const IGU = loadBank(root);
  const { bank, meta, config, quality } = IGU;
  const site = 'https://' + config.owner + '.github.io/' + config.repo;
  const repo = 'https://github.com/' + config.owner + '/' + config.repo;
  const roleName = (id) => (meta.roles.find((r) => r.id === id) || { name: 'Other' }).name;
  const level = (n) => meta.levels.find((l) => l.n === n);
  const real = bank.filter((e) => !quality.isPlaceholder(e)).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  const files = {};

  const head = (title, desc, canon, css) => '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<meta http-equiv="Content-Security-Policy" content="' + CSP + '">\n<title>' + esc(title) + '</title>\n<meta name="description" content="' + esc(desc) + '">\n' +
    '<link rel="canonical" href="' + esc(canon) + '">\n<meta property="og:title" content="' + esc(title) + '">\n<meta property="og:description" content="' + esc(desc) + '">\n<meta property="og:type" content="article">\n<meta property="og:url" content="' + esc(canon) + '">\n' +
    '<meta name="color-scheme" content="light dark">\n<link rel="icon" href="../favicon.svg" type="image/svg+xml">\n<link rel="stylesheet" href="' + css + '">\n</head>\n';
  const topbar = '<header class="top"><div class="top-in"><a class="brand" href="../"><span>InterviewGearUp</span></a></div></header>\n';
  const foot = '<footer class="foot"><p>Answers are study aids written to explain the ideas, not scripts to memorise. Verify anything you rely on. <a href="../">Open the app</a> · <a href="' + esc(repo) + '" rel="noopener noreferrer">Source on GitHub</a></p></footer>\n</body>\n</html>\n';

  real.forEach((e) => {
    const lv = level(e.level);
    const bits = [roleName(e.role), 'Gear ' + e.level + ' (' + lv.name + ')', e.topic];
    if (e.difficulty) bits.push('Difficulty: ' + e.difficulty);
    const review = quality.label(e);
    const app = '../';
    const issue = repo + '/issues/new?' + new URLSearchParams({ template: 'content-feedback.yml', title: '[Answer feedback] ' + e.id + ': ' + trim(e.q, 70), 'question-id': e.id, context: roleName(e.role) + ', Gear ' + e.level + ', topic: ' + e.topic + ', content version ' + (e.contentVersion || 1) + '. Link: ' + site + '/q/' + e.id + '.html' }).toString();
    const refs = Array.isArray(e.references) && e.references.length
      ? '<p class="muted small-text">References: ' + e.references.map((r) => '<a href="' + esc(r.url) + '" rel="noopener noreferrer">' + esc(r.title) + '</a>').join(', ') + '</p>\n' : '';
    files['q/' + e.id + '.html'] = head(e.q + ' | InterviewGearUp', trim(e.short, 155), site + '/q/' + e.id + '.html', '../css/style.css') +
      '<body>\n<a class="skip" href="#main">Skip to content</a>\n' + topbar +
      '<main id="main" class="static-page">\n<p class="muted small-text"><a href="index.html">All questions with written answers</a></p>\n<h1>' + esc(e.q) + '</h1>\n' +
      '<p class="muted small-text meta-line">' + esc(bits.join(' · ')) + ' · ' + esc(review) + '</p>\n' +
      (quality.status(e) === 'needs-correction' ? '<p class="notice bad"><strong>Needs correction.</strong> ' + esc(e.correctionNote) + '</p>\n' : '') +
      '<div class="short"><h4>In 30 seconds</h4>\n' + mdToHtml(e.short, app) + '</div>\n<h4>Explained in depth</h4>\n' + mdToHtml(e.detail, app) + '\n' +
      (e.follow && e.follow.length ? '<h4>Likely follow-ups</h4>\n<ul>' + e.follow.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>\n' : '') + refs +
      '<p><a class="btn primary" href="' + app + '#/q/' + esc(e.id) + '">Practise this question in the app</a></p>\n' +
      '<p class="small-text"><a href="' + esc(issue) + '" rel="noopener noreferrer">Report a problem with this answer</a></p>\n</main>\n' + foot;
  });

  let list = '';
  meta.roles.forEach((r) => {
    const items = real.filter((e) => e.role === r.id);
    if (!items.length) return;
    list += '<h2>' + esc(r.name) + '</h2>\n' + meta.levels.map((l) => {
      const g = items.filter((e) => e.level === l.n);
      return g.length ? '<h3>Gear ' + l.n + ': ' + esc(l.name) + '</h3>\n<ul>' + g.map((e) => '<li><a href="' + esc(e.id) + '.html">' + esc(e.q) + '</a></li>').join('\n') + '</ul>\n' : '';
    }).join('');
  });
  files['q/index.html'] = head('Interview questions with written answers | InterviewGearUp', 'Interview questions for ' + meta.roles.length + ' IT roles with written answers, by role and gear. Each page states whether a person has reviewed it.', site + '/q/', '../css/style.css') +
    '<body>\n<a class="skip" href="#main">Skip to content</a>\n' + topbar + '<main id="main" class="static-page">\n<h1>Questions with written answers</h1>\n<p class="muted">' + real.length + ' of ' + bank.length +
    ' questions have a written answer so far. Answers are not yet reviewed by a person unless a page says Human-reviewed; each page states its review status.</p>\n' + list + '</main>\n' + foot;

  files['sitemap.xml'] = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [site + '/', site + '/q/'].concat(real.map((e) => site + '/q/' + e.id + '.html')).map((u) => '  <url><loc>' + esc(u) + '</loc></url>').join('\n') + '\n</urlset>\n';
  files['robots.txt'] = 'User-agent: *\nAllow: /\n\nSitemap: ' + site + '/sitemap.xml\n';
  return files;
}

function existing(root) {
  const dir = path.join(root, 'q');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.html')).map((f) => 'q/' + f) : [];
}

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const files = build(root);
  if (process.argv.includes('--check')) {
    const stale = Object.keys(files).filter((f) => !fs.existsSync(path.join(root, f)) || fs.readFileSync(path.join(root, f), 'utf8') !== files[f]).concat(existing(root).filter((f) => !(f in files)));
    if (stale.length) { console.error('Static pages are out of date (' + stale.length + ' files). Run: npm run seo'); process.exit(1); }
    console.log('Static pages are up to date (' + Object.keys(files).length + ' files).');
  } else {
    fs.mkdirSync(path.join(root, 'q'), { recursive: true });
    existing(root).filter((f) => !(f in files)).forEach((f) => fs.unlinkSync(path.join(root, f)));
    Object.keys(files).forEach((f) => fs.writeFileSync(path.join(root, f), files[f]));
    console.log('Wrote ' + Object.keys(files).length + ' files.');
  }
}
module.exports = { build, existing };
