# InterviewGearUp roadmap and scope

InterviewGearUp is a free, static, privacy-first interview preparation site for IT roles, organised by seniority "gear". This file sets out what the product is for, what is in and out of scope, what has shipped, and what comes next.

## Product scope

**Who it is for**

- Engineers preparing for interviews from their first job (Gear 1) to staff or engineering-manager loops (Gear 4).
- People who want to practise answering out loud, not just read answers.
- Contributors who want to share questions they were actually asked.

**Principles that bound the scope**

1. **Static and free to host.** GitHub Pages only. Anything server-like goes through GitHub Issues, GitHub Actions or the visitor's own API key.
2. **Private by default.** Progress, notes and keys stay in the browser. No accounts, analytics or trackers.
3. **No build step, no runtime dependencies.** Vanilla HTML, CSS and JavaScript, strict CSP, no `innerHTML`.
4. **Study aids, not scripts.** Answers explain ideas and trade-offs; they are not something to memorise word for word.

**Out of scope (deliberately)**

- User accounts, server-side databases or paid tiers.
- Live human mock interviews or scheduling.
- Proprietary or NDA-covered question dumps.
- Third-party analytics or ad scripts.

## Shipped

### v1.0

- Question bank: 901 questions across 9 roles and 4 gears. (Correction: at the time only about 66 had a real written answer; the rest were templated placeholder text. See v1.2.)
- Drill mode with a timer.
- Community board backed by GitHub Issues, answered automatically by an LLM through GitHub Actions.
- Bring-your-own-key generation in the browser (Gemini, Claude, OpenAI) with an offline template fallback.

### v1.1

| Area | Enhancement |
|---|---|
| Study workflow | **Save for later** (★) on any question, and **personal notes** per question saved in the browser. Notes show up again in Drill after you reveal the answer. |
| Question bank | **Status filters**: All, To prepare, Prepared, Saved, Needs practice, With notes. Kept in the URL (`?show=`), so filtered views can be bookmarked. Press **/** to jump to search. |
| Drill | **Self-grading** records each attempt and time spent. A **Needs practice** pool drills only the questions you struggled with. Other pools: Saved, Not yet prepared. **Keyboard shortcuts** (N next, R reveal, Y confident, P practise again), per-question history, session summary, and **"Drill this"** deep links from the bank (`#/drill?id=`). |
| Progress page | New `#/progress` tab: overall %, **study streak**, drill counts, and a **role × gear coverage matrix** where each cell links to what is left to prepare. |
| Portability | **Backup and restore** progress, saved questions, notes and drafts as a JSON file. API keys are never exported, and imports cannot overwrite settings. |
| Offline / PWA | Service worker and web manifest. The site can be installed and works offline (network first, so new deploys show up straight away when online). |
| Appearance | **Light / Dark / Auto theme toggle** applied before first paint (no flash). Print stylesheet for reading questions on paper. |
| Trust and safety | Settings now explain where the key is stored, that calls are billed to the visitor's account, and recommend a restricted, low-limit key. Fixed a CSP violation from an inline style. |
| Sharing | Open Graph and Twitter meta tags for link previews. |
| Housekeeping | Removed committed `__pycache__` files and added `.gitignore`. Aligned the GitHub Action's default Claude model with the browser default. Tests added for progress, streaks, backups and service-worker precache coverage. |

## v1.2: honesty, review loop and mock interviews

Source: `InterviewGearUp_plan.md`. This release does the P0 track (phases 0 to 4, plus the reliability, hardening and test parts of 11 to 13).

| Phase | Status | What changed |
|---|---|---|
| 0 Baseline audit | Done | `docs/BASELINE_AUDIT.md`. Found that 805 of 918 questions are placeholders; fixed workflow abuse and provenance forgery. |
| 1 Content quality | **Partly done** | Placeholders are labelled in the UI and excluded from retrieval; 47 real answers added (66 to 113 real); metadata (difficulty, review status, last reviewed, version, references) with validation; report-a-problem links; duplicate and coverage-ratchet tests; `CONTRIBUTING.md`. **Done: every role and gear now has at least 15 written answers (the 15-per-cell goal); more questions still have only a practice structure** (content batch 1 added 50, 113 to 163 real; batch 2 added 50, 163 to 213 real; batch 3 added 50, now 263 real; batch 4 added 50, now 313 real; batch 4 added 50, now 313 real; batch 5 added 50, now 363 real; batch 6 added 51, now 414 real; batch 7 added 50, now 464 real; batch 8 added 49, now 513 real; batch 9 added 45, now 558 real). **Full-answer pass: all 1,153 questions now have a written answer (0 placeholders), including a new Data scientist role with 60 questions.** All written answers are AI-drafted and unreviewed by a person. |
| 2 Planner | Done | `#/plan`: profile, rule-based daily tasks, skip, regenerate, edit, reset. |
| 3 Spaced repetition | Done | `#/review`, versioned `igu.schema` migration (non-destructive), local-day logic, DST and month-end tests, four grades. |
| 4 Mock interview | Done (deterministic) | `#/mock`: timed rounds, rubric scorecard, history, Markdown report, optional AI feedback. No server, no voice. |
| 11 UX, a11y, PWA | Partly | Header fits all widths, 44px targets in new views, labelled controls, live regions. Manual a11y and device testing still needed (`docs/MANUAL_QA.md`). |
| 12 AI reliability | Done | `js/ai.js`: timeout, bounded retry, no retry on auth or quota, friendly errors, key redacted from messages, Gemini key moved from the URL to a header, delimiter hardening against prompt injection. |
| 13 Tests and CI | Done | 40+ tests, `ci.yml` runs them on every PR. Action versions use tags, not commit SHAs. |

## v1.3: practice tools and moderation

Phases 5 to 10 from the plan.

| Phase | Status | What changed |
|---|---|---|
| 5 Story bank | Done | `#/stories`: STAR editor, 10 tags, question matching, coverage by tag, rule-based tips, optional AI review, Markdown export. |
| 6 JD analyzer | Done (heuristic) | `#/jd`: skill extraction, estimated seniority, role guess, mapping to bank questions with a confidence label, plan. Job text is untrusted in prompts. |
| 7 System design | Done | `#/design`: 12 problems, 8-section autosaved notes, flow-to-Mermaid source, staged reference, 7-point rubric. All reference content is AI-drafted. |
| 8 Coding lab | Done (JavaScript only) | `#/coding`: 8 problems, isolated Worker runner with 3s timeout, hints, timed and review modes. Every reference solution is tested in `npm test`. |
| 9 Company tracks | Done | `#/company` and board filters; status comes only from maintainer-applied labels (`approved`, `needs-review`; hidden: `rejected`, `duplicate`, `confidential`, `inappropriate`). |
| 10 Voice practice | Done (needs device testing) | `#/voice`: optional dictation, typed fallback, pace, fillers, rubric, opt-in transcript history. Real speech recognition has not been tried on devices. |

## v1.4: Phase 14, optional growth and sync (this release)

The plan marks Phase 14 as exploratory. These parts are built because they fit a static, tracker-free site; the rest is listed honestly below.

| Item from the plan | Status | What changed |
|---|---|---|
| Private sync through a user-controlled mechanism | Done (needs real-device testing) | `#/sync`: opt-in, encrypted in the browser (AES-GCM, PBKDF2) before upload to a secret Gist in the learner's own account. Token is gist-only, kept for the tab unless the learner opts in, and never in backups; passphrase is never stored; only `api.github.com` is contacted. Threat model in `docs/THREAT_MODEL.md`. Replace, not merge. |
| User-submitted learning paths | Done | `#/paths`: build, reorder, export and import paths (stored in the backup); 4 starter paths (AI-assembled, unreviewed); *Suggest a learning path* issue form. A maintainer still has to review and add any suggested path. |
| Static SEO pages | Done | `npm run seo` writes `q/<id>.html` for every question with a written answer, plus `q/index.html`, `sitemap.xml` and `robots.txt`. Pages state the review status, contain no script, and `npm test` fails if they are stale. Search engines may take a while to index them; no ranking is promised. |
| Community contribution improvements | Done | Pull request template with a checklist, learning-path issue form, CONTRIBUTING sections for paths, sync and `npm run seo`. |
| More role tracks (mobile, platform, data science, analytics, product engineering) | Not built | Each role needs 60 or more written answers across four gears to meet the coverage standard. Placeholder roles would break the "no filler" rule. |
| Localization | Not built | Needs a string catalogue across all views and human translators. Machine translations of interview answers would be unreviewed twice over. |
| Privacy-preserving, opt-in usage analytics | Not built, on purpose | There is no server to receive it, and the plan says the default product stays tracker-free. |

## v1.5: content trust and a front door (this release)

Source: the product improvement plan (23 phases). This release does Phases 0 to 2; the rest stay open below.

| Phase | Status | What changed |
|---|---|---|
| 0 Re-baseline | Done | `docs/PRODUCT_GAP_AUDIT.md`: test and content results, feature status, verified defects, UX, content, technical and accessibility gaps, prioritised backlog. Layout checked in headless Chromium only; no real devices. |
| 1 Content quality and trust | Done (tooling and first fixes); human review still open | Five honest states (Pending, Origin not recorded, AI-drafted, Human-reviewed, Needs correction with a required note and an in-app warning). 66 answers that showed no label now say their origin is not recorded. Rubric signals, flags and a review priority in `js/quality.js`; `npm run content:audit` writes `docs/CONTENT_QUALITY.md` (checked by `npm test`). The 10 thinnest, most-studied fundamentals rewritten (version 2, still AI-drafted). Primary-source references on 41 questions; `npm run refs:check`. Human review workflow and rubric in CONTRIBUTING. README statistics are now tested against the data. |
| 2 First-run and dashboard | Done (needs device testing) | `#/home` is the new start page: optional 4-question onboarding with Skip, a privacy note, and a dashboard with Continue preparation, today's tasks and minutes, reviews due, weak topics, mock suggestion, gear progress and completed counts (`js/dashboard.js`, pure and tested). Navigation regrouped into Home, Questions, Prepare, Practice and Community. Profile can be changed or reset from Home. |

## v1.6: feedback and adaptive planning (plan phases 3 and 4)

| Phase | Status | What changed |
|---|---|---|
| 3 Answer evaluation and feedback | Done | Mock answers are scored with one of three published rubrics (technical; behavioral STAR with ownership, impact and reflection; system design with requirements, scale, architecture, APIs, data model, reliability, security, trade-offs), shown before practice and under each question. Content and delivery are scored separately, each score states the evidence it found, missing reference concepts are listed, off-topic answers are detected, and every answer gets at most three prioritised next steps with an example. Coding lab attempts get a rubric from the real test run (correctness, edge-case tests) plus code hints (complexity versus the reference, decomposition, quality). Fixed question classification that treated technical questions about failures or write conflicts as behavioral. |
| 4 Adaptive preparation | Done | `js/adaptive.js`: local attempt history, recency-weighted mastery over repeated attempts, weak-topic evidence from drills, reviews and mock scores, topic trends and a weekly summary on the Plan page. Planner: reviews are capped so one new-question slot is always kept, the backlog is carried forward with a note, welcome-back note after missed days, notes when the interview date leaves less time than the gear needs, estimated minutes per question, workload limits (new questions, reviews, rest days), at most two questions per topic per day, Swap and Tomorrow per task, and a reason on every task. Deterministic and tested. |

## v1.7: job targeting and readiness evidence (plan phases 5 and 6)

| Phase | Status | What changed |
|---|---|---|
| 5 Job description analyzer | Done | Shows the exact phrases found, separates skills named in the posting from skills inferred from a framework or service (Spring Boot implies Java, EKS implies AWS and Kubernetes), explains each question match and each confidence level, fixes "rest" being read as REST, labels role and seniority as heuristic, links matched skills to the coding lab, design workspace, story bank and mock, and lets you pick a target job that feeds Readiness. Tested with empty, noisy, control-character and prompt-injection input. |
| 6 Readiness evidence | Done | New `#/readiness` page (`js/readiness.js`): Strong, Developing, Needs practice or Not assessed per topic and per interview round (technical, coding, system design, behavioral, mock), and per skill of the target job. Every status follows a published rule and shows its evidence; sparse evidence is labelled; no overall score and no predictions. Next three actions, six-week progression rebuilt from dated history, and a non-destructive reset that counts evidence from today. |

## v1.8: coding lab and system design workspace (plan phases 7 and 8)

| Phase | Status | What changed |
|---|---|---|
| 7 Coding lab | Done, async problems still open | Seven new JavaScript problems covering linked lists, trees, graphs, queues (topological sort), backtracking, heaps and dynamic programming (15 in total), each with reference solution, edge-case tests and wrong-solution tests. Every problem shows a target complexity and an estimated time. Test summaries name the first failure; errors say whether the code did not run, timed out or crashed. Phone editor uses 16 px text and no wrapping. The lab states that client-side tests are practice feedback, not a secure grading boundary. New problems are JavaScript-only for now and say so. Still open: JavaScript async/concurrency problems need async support in the worker runner. |
| 8 System design workspace | Done | Interview steps as checkpoints, an editable capacity calculator that shows its arithmetic, nine failure scenarios (database, queue lag, hot keys, retry storms, regional outage, inconsistency, traffic spike, cache failure, abuse), separate observability and security sections, an SVG diagram preview with SVG and Mermaid downloads, a print or PDF view, staged reference reveal with a stage counter, and a rubric that shows the evidence behind each score and covers failures, observability and security. |

## Next

- [ ] Phases 5 to 17 and 18 to 22 from the product improvement plan (see `docs/PRODUCT_GAP_AUDIT.md` for priorities).
- [ ] People to work through the review queue in `docs/CONTENT_QUALITY.md`; merge single-question topics.
- [ ] Mobile header still wraps to two rows below about 420 px; move focus to the main region on route change.

- [ ] Keep writing answers for the questions that still have only a practice structure (`npm run content:status` lists them) and have people review the AI-drafted ones, then set `reviewStatus: 'reviewed'` with a date.
- [ ] Retire semantic-duplicate placeholder questions.
- [x] Moderation labels for community posts (done in v1.3; a maintainer still has to apply them).
- [ ] Pin GitHub Actions to commit SHAs.
- [ ] Real-device accessibility testing.
- [x] Phases 5 to 10 from the plan.
- [x] Phase 14 parts that fit a static site (sync, paths, SEO pages, contribution templates). Role tracks, localization and analytics are still open.
- [ ] Real-device testing of private sync (Safari, Firefox, mobile) and a person's review of the threat model.
- [ ] Review of the starter paths by a person.
- [ ] More coding problems and review of the AI-drafted ones; other languages need a safe runtime first.
- [ ] Real-device testing of dictation.
