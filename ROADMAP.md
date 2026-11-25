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
| 1 Content quality | **Partly done** | Placeholders are labelled in the UI and excluded from retrieval; 47 real answers added (66 to 113 real); metadata (difficulty, review status, last reviewed, version, references) with validation; report-a-problem links; duplicate and coverage-ratchet tests; `CONTRIBUTING.md`. **Not done: 45 more answers are needed to reach 15 per role and gear** (content batch 1 added 50, 113 to 163 real; batch 2 added 50, 163 to 213 real; batch 3 added 50, now 263 real; batch 4 added 50, now 313 real; batch 4 added 50, now 313 real; batch 5 added 50, now 363 real; batch 6 added 51, now 414 real; batch 7 added 50, now 464 real; batch 8 added 49, now 513 real). All written answers are AI-drafted and unreviewed by a person. |
| 2 Planner | Done | `#/plan`: profile, rule-based daily tasks, skip, regenerate, edit, reset. |
| 3 Spaced repetition | Done | `#/review`, versioned `igu.schema` migration (non-destructive), local-day logic, DST and month-end tests, four grades. |
| 4 Mock interview | Done (deterministic) | `#/mock`: timed rounds, rubric scorecard, history, Markdown report, optional AI feedback. No server, no voice. |
| 11 UX, a11y, PWA | Partly | Header fits all widths, 44px targets in new views, labelled controls, live regions. Manual a11y and device testing still needed (`docs/MANUAL_QA.md`). |
| 12 AI reliability | Done | `js/ai.js`: timeout, bounded retry, no retry on auth or quota, friendly errors, key redacted from messages, Gemini key moved from the URL to a header, delimiter hardening against prompt injection. |
| 13 Tests and CI | Done | 40+ tests, `ci.yml` runs them on every PR. Action versions use tags, not commit SHAs. |

## v1.3: practice tools and moderation (this release)

Phases 5 to 10 from the plan.

| Phase | Status | What changed |
|---|---|---|
| 5 Story bank | Done | `#/stories`: STAR editor, 10 tags, question matching, coverage by tag, rule-based tips, optional AI review, Markdown export. |
| 6 JD analyzer | Done (heuristic) | `#/jd`: skill extraction, estimated seniority, role guess, mapping to bank questions with a confidence label, plan. Job text is untrusted in prompts. |
| 7 System design | Done | `#/design`: 12 problems, 8-section autosaved notes, flow-to-Mermaid source, staged reference, 7-point rubric. All reference content is AI-drafted. |
| 8 Coding lab | Done (JavaScript only) | `#/coding`: 8 problems, isolated Worker runner with 3s timeout, hints, timed and review modes. Every reference solution is tested in `npm test`. |
| 9 Company tracks | Done | `#/company` and board filters; status comes only from maintainer-applied labels (`approved`, `needs-review`; hidden: `rejected`, `duplicate`, `confidential`, `inappropriate`). |
| 10 Voice practice | Done (needs device testing) | `#/voice`: optional dictation, typed fallback, pace, fillers, rubric, opt-in transcript history. Real speech recognition has not been tried on devices. |

### Not started

Phase 14 (optional sync and growth) is exploratory in the plan and not built. The 15-per-role-and-gear content goal is still open (see Next).

## Next

- [ ] Write the remaining ~45 answers, in batches of 50 (thinnest role and gear cells first) (`npm run content:status` lists them) and have people review the AI-drafted ones, then set `reviewStatus: 'reviewed'` with a date.
- [ ] Retire semantic-duplicate placeholder questions.
- [x] Moderation labels for community posts (done in v1.3; a maintainer still has to apply them).
- [ ] Pin GitHub Actions to commit SHAs.
- [ ] Real-device accessibility testing.
- [x] Phases 5 to 10 from the plan.
- [ ] Phase 14, only if there is demand.
- [ ] More coding problems and review of the AI-drafted ones; other languages need a safe runtime first.
- [ ] Real-device testing of dictation.
