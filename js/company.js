/* Company pages and community moderation status. Everything here is community-reported and unverified by default:
   a company has not endorsed any of it. Status comes only from labels that maintainers apply on GitHub. Pure functions. */
(function () {
  const IGU = (window.IGU = window.IGU || {});

  /* Moderation flow: submitted -> needs-review -> approved -> published. rejected/duplicate/confidential are hidden. */
  const HIDDEN = ['rejected', 'duplicate', 'confidential', 'inappropriate'];
  const STATUS_TEXT = {
    approved: 'Reviewed by a maintainer',
    'needs-review': 'Awaiting review',
    unreviewed: 'Unreviewed community report',
    local: 'Your draft (this device only)'
  };

  function statusOf(post) {
    if (!post.remote) return 'local';
    const names = (post.labels || []).map(function (l) { return String(l).toLowerCase(); });
    if (names.some(function (n) { return HIDDEN.indexOf(n) >= 0; })) return 'hidden';
    if (names.indexOf('approved') >= 0) return 'approved';
    if (names.indexOf('needs-review') >= 0) return 'needs-review';
    return 'unreviewed';
  }

  const norm = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); };

  /* Distinct company names with counts, from visible (non-hidden) posts. */
  function companies(posts) {
    const by = {};
    posts.forEach(function (p) {
      if (statusOf(p) === 'hidden') return;
      const k = norm(p.company);
      if (!k || k === 'unknown') return;
      by[k] = by[k] || { key: k, name: p.company, count: 0 };
      by[k].count++;
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.count - a.count || (a.name < b.name ? -1 : 1); });
  }

  const tally = function (items, fn) {
    const m = {};
    items.forEach(function (p) { const k = fn(p); if (k) m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(function (k) { return { label: k, count: m[k] }; }).sort(function (a, b) { return b.count - a.count || (a.label < b.label ? -1 : 1); });
  };

  /* A page for one company: what the community has reported, split by how much has been reviewed. */
  function summarize(posts, name) {
    const key = norm(name);
    const mine = posts.filter(function (p) { return norm(p.company) === key && statusOf(p) !== 'hidden'; });
    const sorted = mine.slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    return {
      name: mine.length ? mine[0].company : name, total: mine.length,
      reviewed: mine.filter(function (p) { return statusOf(p) === 'approved'; }).length,
      rounds: tally(mine, function (p) { return p.round; }), roles: tally(mine, function (p) { return p.role; }),
      levels: tally(mine, function (p) { return 'Gear ' + p.level; }), domains: tally(mine, function (p) { return p.domain; }),
      items: sorted
    };
  }

  /* Generic checklist: deliberately says nothing about what the company asks. */
  function checklist(summary) {
    const out = ['Read the job description and the company\'s own engineering or careers pages (official sources).',
      'Ask your recruiter which rounds to expect; do not rely on reports from strangers for the format.'];
    summary.rounds.slice(0, 4).forEach(function (r) { out.push('Reports mention a "' + r.label + '" round (' + r.count + ' report' + (r.count === 1 ? '' : 's') + '). Prepare for it, but confirm with the recruiter.'); });
    out.push('Practise questions for your role and gear, and prepare stories from your own experience.');
    return out;
  }

  IGU.company = { HIDDEN: HIDDEN, STATUS_TEXT: STATUS_TEXT, statusOf: statusOf, companies: companies, summarize: summarize, checklist: checklist, norm: norm };
})();
