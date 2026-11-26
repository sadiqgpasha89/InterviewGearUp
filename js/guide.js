/* Product validation, walkthrough, demo scenarios, release notes, and opt-in feedback (Phase 22).
   Pure functions. Strictly privacy-first: zero hidden analytics, zero beacons, and automatic redaction of key-like tokens. */
(function () {
  const IGU = (window.IGU = window.IGU || {});

  const WALKTHROUGH = [
    { step: 1, title: 'Set your target in 30 seconds', route: '#/home', summary: 'Pick target role, gear (1-4), optional interview date, and daily minutes, or skip and browse immediately.' },
    { step: 2, title: 'Start with a 10-minute warm-up', route: '#/warmup', summary: 'Mix 1 technical, 1 scenario/debugging, and 1 behavioral prompt prioritized around weak spots.' },
    { step: 3, title: 'Close prerequisite gaps', route: '#/map', summary: 'Follow role dependency maps, drill weak topics (#/drill), and convert tough concepts into spaced-repetition flashcards (#/flashcards).' },
    { step: 4, title: 'Simulate real interview rounds', route: '#/mock', summary: 'Combine timed mock interviews, the JavaScript Coding Lab (#/coding), System Design workspaces (#/design), and STAR-L stories (#/stories).' },
    { step: 5, title: 'Inspect readiness & export schedule', route: '#/readiness', summary: 'Review evidence-backed topic and round statuses and export today or this week as an .ics calendar file from Plan (#/plan).' }
  ];

  const DEMO_SCENARIOS = [
    {
      id: 'backend-mid',
      label: 'Backend Engineer · Gear 2 (30 min/day)',
      description: '30-minute daily plan focused on Caching, Databases, and APIs with 2 sample flagged questions to see weak-area detection and Readiness immediately.',
      profile: { role: 'backend', level: 2, company: '', interviewDate: '', minutes: 30, weakTopics: ['caching', 'databases'], maxNew: 0, maxReviews: 0, restDays: [] },
      practice: { 'be-1': { count: 1, ok: 1, again: 0, last: 'ok' }, 'be-4': { count: 2, ok: 0, again: 2, last: 'again' } },
      done: { 'be-1': 1 }
    },
    {
      id: 'frontend-senior',
      label: 'Frontend Engineer · Gear 3 (45 min/day)',
      description: 'Senior frontend prep highlighting Rendering Performance, React, and Accessibility.',
      profile: { role: 'frontend', level: 3, company: '', interviewDate: '', minutes: 45, weakTopics: ['performance', 'accessibility'], maxNew: 0, maxReviews: 0, restDays: [] },
      practice: { 'fe-1': { count: 1, ok: 1, again: 0, last: 'ok' }, 'fe-6': { count: 1, ok: 0, again: 1, last: 'again' } },
      done: { 'fe-1': 1 }
    },
    {
      id: 'ml-lead',
      label: 'ML / AI Engineer · Gear 4 (45 min/day)',
      description: 'Lead/Staff ML architecture prep covering LLMs, RAG, and production evaluation.',
      profile: { role: 'ml', level: 4, company: '', interviewDate: '', minutes: 45, weakTopics: ['llms', 'rag'], maxNew: 0, maxReviews: 0, restDays: [] },
      practice: { 'ml-1': { count: 1, ok: 1, again: 0, last: 'ok' }, 'ml-51': { count: 1, ok: 0, again: 1, last: 'again' } },
      done: { 'ml-1': 1 }
    }
  ];

  const RELEASES = [
    { version: 'v1.20', title: 'Walkthrough, Demo Scenarios & Opt-in Feedback', route: '#/guide', notes: 'Interactive onboarding guide, safe starter scenarios, release notes, and secret-redacting opt-in feedback export.' },
    { version: 'v1.19', title: 'Calendar Export (.ics)', route: '#/plan', notes: 'Download single tasks, today\'s study block, or a 7-day plan in standard RFC 5545 format using local wall-clock time.' },
    { version: 'v1.18', title: 'Daily 10-Minute Warm-up', route: '#/warmup', notes: 'Balanced 3-question mix (technical, scenario, behavioral) with timer, offline self-check, optional AI feedback, and SRS integration.' },
    { version: 'v1.17', title: 'Topic Dependency Map', route: '#/map', notes: 'Curated acyclic prerequisite and extension maps for all 10 roles surfacing weak foundations before advanced topics.' },
    { version: 'v1.16', title: 'Flashcards & 6-Step Outlines', route: '#/flashcards', notes: 'Six-step explanation outlines and editable flashcards built from weak questions and graded with SRS.' },
    { version: 'v1.15', title: 'Offline & Update UX + PWA Hardening', route: '#/home', notes: 'Live offline/online status and one-click update banners, navigation-only SW fallback, and strict precache CI validation.' }
  ];

  const MODULES = ['Home / Onboarding', 'Question Bank & Search', 'Daily Plan & Calendar Export', 'Daily Warm-up', 'Drill & Flashcards', 'Spaced Repetition Review', 'Topic Map', 'Mock Interview', 'Coding Lab', 'System Design', 'Behavioral Stories', 'JD Analyzer & Readiness', 'Community & Company Pages'];

  function redactSecrets(text) {
    return String(text || '')
      .replace(/AIza[0-9A-Za-z\-_]{20,}/g, '[REDACTED_KEY]')
      .replace(/sk-(?:ant-|proj-)?[0-9A-Za-z\-_]{16,}/g, '[REDACTED_KEY]')
      .replace(/(?:ghp|gho|github_pat)_[0-9A-Za-z_]{16,}/g, '[REDACTED_TOKEN]');
  }

  function buildFeedbackReport(input, cfg) {
    input = input || {};
    cfg = cfg || IGU.config || {};
    const clean = function (v, max) { return redactSecrets(String(v || '').trim()).slice(0, max || 800); };
    const role = clean(input.role || 'Not specified', 40);
    const gear = clean(input.gear || 'Not specified', 20);
    const timeToStart = clean(input.timeToStart || 'Not measured', 40);
    const mostUseful = clean(input.mostUseful || 'Not selected', 80);
    const confusing = clean(input.confusing || 'None noted', 600);
    const worked = clean(input.worked || 'Yes', 120);
    const suggestions = clean(input.suggestions || '', 1200);
    const day = clean(input.day || '', 20);

    const mdLines = [
      '# InterviewGearUp Feedback & Usability Note',
      day ? ('Date: ' + day) : '',
      '- Target role & gear: ' + role + ' (Gear ' + gear + ')',
      '- Time to start first session: ' + timeToStart,
      '- Most useful workflow: ' + mostUseful,
      '- Did workflows finish clearly without broken buttons? ' + worked,
      '- Confusing UI or missing guidance: ' + confusing,
      suggestions ? ('- Suggestions:\n\n' + suggestions) : '- Suggestions: None'
    ].filter(Boolean);

    const markdown = mdLines.join('\n') + '\n';
    const owner = cfg.owner || 'sadiqgpasha89';
    const repo = cfg.repo || 'InterviewGearUp';
    const title = 'Product feedback: ' + (mostUseful !== 'Not selected' ? mostUseful : 'General') + ' (' + role + ')';
    const githubIssueUrl = 'https://github.com/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) +
      '/issues/new?labels=feedback&title=' + encodeURIComponent(title.slice(0, 120)) +
      '&body=' + encodeURIComponent(markdown.slice(0, 1800));

    return { markdown: markdown, githubIssueUrl: githubIssueUrl };
  }

  IGU.guide = {
    WALKTHROUGH: WALKTHROUGH,
    DEMO_SCENARIOS: DEMO_SCENARIOS,
    RELEASES: RELEASES,
    MODULES: MODULES,
    redactSecrets: redactSecrets,
    buildFeedbackReport: buildFeedbackReport
  };
})();
