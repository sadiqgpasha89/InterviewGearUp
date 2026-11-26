/* Company pages and community moderation status. Everything here is community-reported and unverified by default:
   a company has not endorsed any of it. Status comes only from labels that maintainers apply on GitHub. Pure functions. */
(function () {
  const IGU = (window.IGU = window.IGU || {});

  /* Moderation flow: submitted -> needs-review -> approved -> published. rejected/duplicate/confidential/inappropriate/pii are hidden. */
  const HIDDEN = ['rejected', 'duplicate', 'confidential', 'inappropriate', 'pii'];
  const STALE_DAYS = 540; // ~18 months
  const RECENT_DAYS = 180; // ~6 months
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

  /* Report freshness: compares createdAt (or fallback year) against `now` (timestamp or Date or ISO string). */
  function freshness(post, now) {
    const ref = now !== undefined ? new Date(now).getTime() : Date.now();
    const raw = post && post.createdAt ? Date.parse(post.createdAt) : NaN;
    let days = NaN;
    if (!isNaN(raw) && !isNaN(ref)) {
      days = Math.max(0, Math.floor((ref - raw) / 86400000));
    } else if (post && post.year && !isNaN(ref)) {
      const y = new Date(ref).getUTCFullYear();
      const diffY = Math.max(0, y - Number(post.year));
      days = diffY * 365;
    }
    if (isNaN(days)) return { id: 'unknown', label: 'Date not recorded', days: null, stale: false };
    if (days <= RECENT_DAYS) return { id: 'recent', label: 'Recent (last 6 months)', days: days, stale: false };
    if (days <= STALE_DAYS) return { id: 'aging', label: '6 to 18 months old', days: days, stale: false };
    return { id: 'stale', label: 'Older report (> 18 months) — format may have changed', days: days, stale: true };
  }

  function isStale(post, now) {
    return freshness(post, now).stale;
  }

  /* Filter visible (non-hidden) reports by role, gear, round, freshness, and verification status. */
  function filter(posts, f, now) {
    f = f || {};
    return (posts || []).filter(function (p) {
      if (statusOf(p) === 'hidden') return false;
      if (f.role && p.role !== f.role) return false;
      if (f.level && Number(p.level) !== Number(f.level)) return false;
      if (f.round && p.round !== f.round) return false;
      if (f.status === 'approved' && statusOf(p) !== 'approved') return false;
      if (f.status === 'unreviewed' && statusOf(p) === 'approved') return false;
      if (f.freshness) {
        const fr = freshness(p, now);
        if (f.freshness === 'recent' && fr.id !== 'recent') return false;
        if (f.freshness === '18m' && fr.id !== 'recent' && fr.id !== 'aging') return false;
        if (f.freshness === 'stale' && !fr.stale) return false;
      }
      return true;
    });
  }

  /* Detect likely duplicate reports (Jaccard word overlap >= 0.70 within the same company). */
  const words = function (s) {
    const out = new Set();
    norm(s).split(/\s+/).forEach(function (w) { if (w.length > 2) out.add(w); });
    return out;
  };
  function duplicates(posts) {
    const byCo = {};
    (posts || []).forEach(function (p) {
      if (statusOf(p) === 'hidden') return;
      const k = norm(p.company);
      if (!k || k === 'unknown') return;
      (byCo[k] = byCo[k] || []).push({ post: p, w: words(p.question) });
    });
    const out = [];
    Object.keys(byCo).forEach(function (k) {
      const list = byCo[k];
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i].w, b = list[j].w;
          if (!a.size || !b.size) continue;
          let inter = 0;
          a.forEach(function (w) { if (b.has(w)) inter++; });
          const sim = inter / (a.size + b.size - inter);
          if (sim >= 0.7) out.push({ a: list[i].post.id, b: list[j].post.id, similarity: Math.round(sim * 100) });
        }
      }
    });
    return out;
  }

  /* Distinct company names with counts and freshness summary, from visible (non-hidden) posts. */
  function companies(posts, now) {
    const by = {};
    posts.forEach(function (p) {
      if (statusOf(p) === 'hidden') return;
      const k = norm(p.company);
      if (!k || k === 'unknown') return;
      const cur = by[k] = by[k] || { key: k, name: p.company, count: 0, reviewed: 0, recent: 0, latestAt: '' };
      cur.count++;
      if (statusOf(p) === 'approved') cur.reviewed++;
      if (freshness(p, now).id === 'recent') cur.recent++;
      const d = String(p.createdAt || '').slice(0, 10);
      if (d && d > cur.latestAt) cur.latestAt = d;
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.count - a.count || (a.name < b.name ? -1 : 1); });
  }

  const tally = function (items, fn) {
    const m = {};
    items.forEach(function (p) { const k = fn(p); if (k) m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(function (k) { return { label: k, count: m[k] }; }).sort(function (a, b) { return b.count - a.count || (a.label < b.label ? -1 : 1); });
  };

  /* A page for one company: what the community has reported, split by how much has been reviewed and how fresh it is. */
  function summarize(posts, name, now) {
    const key = norm(name);
    const mine = posts.filter(function (p) { return norm(p.company) === key && statusOf(p) !== 'hidden'; });
    const sorted = mine.slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    let staleCount = 0, recentCount = 0, needsReview = 0, unreviewed = 0, local = 0;
    mine.forEach(function (p) {
      const st = statusOf(p);
      if (st === 'needs-review') needsReview++;
      else if (st === 'unreviewed') unreviewed++;
      else if (st === 'local') local++;
      const fr = freshness(p, now);
      if (fr.stale) staleCount++;
      if (fr.id === 'recent') recentCount++;
    });
    return {
      name: mine.length ? mine[0].company : name, total: mine.length,
      reviewed: mine.filter(function (p) { return statusOf(p) === 'approved'; }).length,
      needsReview: needsReview, unreviewed: unreviewed, local: local,
      staleCount: staleCount, recentCount: recentCount,
      newestAt: sorted.length ? String(sorted[0].createdAt || '').slice(0, 10) : '',
      duplicatePairs: duplicates(mine),
      rounds: tally(mine, function (p) { return p.round; }), roles: tally(mine, function (p) { return p.role; }),
      levels: tally(mine, function (p) { return 'Gear ' + p.level; }), domains: tally(mine, function (p) { return p.domain; }),
      items: sorted
    };
  }

  /* Generic + community-informed checklist: deliberately separates official guidance from unverified reports. */
  function checklist(summary) {
    const out = ['Read the job description and the company\'s own engineering or careers pages (official sources).',
      'Ask your recruiter which rounds to expect; do not rely on reports from strangers for the format.'];
    if (summary.staleCount && summary.staleCount === summary.total) {
      out.push('All ' + summary.total + ' report(s) here are older than 18 months; assume interview loops may have changed and confirm with your recruiter.');
    } else if (summary.staleCount > 0) {
      out.push(summary.staleCount + ' of ' + summary.total + ' report(s) are older than 18 months; weigh recent reports more heavily.');
    }
    summary.rounds.slice(0, 4).forEach(function (r) { out.push('Community reports mention a "' + r.label + '" round (' + r.count + ' report' + (r.count === 1 ? '' : 's') + '). Prepare for it, but confirm with the recruiter.'); });
    if (summary.domains && summary.domains.length && summary.domains[0].label !== 'Other') {
      out.push('Review domain considerations for ' + summary.domains[0].label + ' (reliability, privacy, compliance, or scale trade-offs).');
    }
    out.push('Practise questions for your role and gear, and prepare stories from your own experience.');
    return out;
  }

  /* Pre-filled GitHub issue to report outdated, inaccurate, duplicate, or confidential/PII community reports. */
  function reportUrl(post, cfg) {
    cfg = cfg || IGU.config || { owner: 'sadiqgpasha89', repo: 'InterviewGearUp' };
    const id = String(post && post.id || '');
    const params = [
      ['template', 'content-feedback.yml'],
      ['title', '[Report feedback] ' + (post && post.company ? post.company + ' ' : '') + id],
      ['question-id', id],
      ['context', 'Community report' + (post && post.url ? ': ' + post.url : '') + (post && post.createdAt ? ' (reported ' + String(post.createdAt).slice(0, 10) + ')' : '') + '. Issue may be outdated, inaccurate, duplicate, or contain confidential/PII details.']
    ].map(function (kv) { return encodeURIComponent(kv[0]) + '=' + encodeURIComponent(kv[1]); }).join('&');
    return 'https://github.com/' + cfg.owner + '/' + cfg.repo + '/issues/new?' + params;
  }

  /* Warn contributors before saving or sharing text that appears to contain PII or confidential material. */
  function hasSensitiveHint(text) {
    const s = String(text || '');
    const hits = [];
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(s)) hits.push('an email address');
    if (/\b(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/.test(s)) hits.push('a phone number');
    if (/\b(under nda|strictly confidential|internal only|proprietary|trade secret)\b/i.test(s)) hits.push('confidential/NDA wording');
    return hits;
  }

  IGU.company = {
    HIDDEN: HIDDEN, STALE_DAYS: STALE_DAYS, RECENT_DAYS: RECENT_DAYS, STATUS_TEXT: STATUS_TEXT,
    statusOf: statusOf, freshness: freshness, isStale: isStale, filter: filter, duplicates: duplicates,
    companies: companies, summarize: summarize, checklist: checklist, reportUrl: reportUrl, hasSensitiveHint: hasSensitiveHint, norm: norm
  };
})();
