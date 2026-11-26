# Product gap audit (Phase 0 of the product improvement plan)

Written on 2026-11-26 against commit `975a0b8` (main), before the changes in this branch. It replaces nothing: [BASELINE_AUDIT.md](BASELINE_AUDIT.md) records the earlier v1.2 baseline.

**How it was done.** Ran every npm check, read every module listed in the README, measured the question bank with scripts, inspected the GitHub workflows, and loaded the app in headless Chromium (Playwright) at 390x844 and 1280x900 to check layout, console errors and horizontal overflow on the question bank, plan and progress pages. **No real phones, tablets, screen readers, Safari or Firefox were used.** Anything about those is listed as unverified.

## 1. Test and content results

| Check | Result |
|---|---|
| `npm test` | 80 tests: 79 pass, 1 skipped (the coverage-goal test, which only runs under `test:goal`) |
| `npm run test:goal` | 80 pass |
| `npm run seo:check` | Static pages up to date (1,156 files) |
| `npm run content:status` | 1,153 questions, 1,153 with a written answer, 0 placeholders; every role x gear cell has at least 15 |

Content distribution (measured with scripts; now reproducible with `npm run content:audit`):

| Measure | Value |
|---|---|
| Review status | 1,087 AI-drafted, 66 with no recorded status, **0 reviewed by a person** |
| Difficulty set | 1,087 (155 easy, 473 medium, 459 hard); 66 without |
| References | **0 of 1,153** answers cite any source |
| Roles x gears | 10 roles, 4 gears; smallest role Data scientist (60), largest ML / AI (139) |
| Topics | 266 role/topic pairs, many with a single question |
| Exact or near-duplicate questions (>= 60% word overlap) | 2 pairs |
| Templated text | No sentence repeated across 5+ answers apart from code imports; the v1.0 filler template is gone |
| Median explanation length | 2,317 characters (p10 1,219, p90 4,440) |

## 2. Feature status (verified in code)

| Module | Route | Status | Notes |
|---|---|---|---|
| Question bank, search, filters, notes, saved | `#/questions`, `#/q/<id>` | Implemented | Search is substring AND over the full text; no ranking, no acronym or typo handling (`k8s` only matches answers that literally contain it). |
| Plan | `#/plan` | Implemented | Profile form (role, gear, company, date, minutes, weak topics) and a "Today" list with Continue, skip and edit. Fixed 3 / 8 / 25 minute estimates. |
| Review (spaced repetition) | `#/review` | Implemented | Deterministic intervals, local days, tested for DST and month ends. |
| Drill | `#/drill` | Implemented | Self-grading feeds `practice` and `srs`. |
| Mock interview | `#/mock` | Implemented | Deterministic shape rubric (structure, specifics, trade-offs, coverage, fit). Does not check correctness; says so. |
| Story bank | `#/stories` | Implemented | STAR editor, tags, coverage gaps, optional AI review. |
| JD analyzer | `#/jd` | Implemented (heuristic) | Extracted skills are not editable; no exact/inferred distinction. |
| System design | `#/design` | Implemented | 12 problems, autosave, staged reference, 7-point rubric. No failure-scenario prompts. |
| Coding lab | `#/coding` | Implemented | 8 problems; Worker isolation with a 3 s timeout; reference solutions tested. |
| Company pages, community board, post | `#/company`, `#/community`, `#/post` | Implemented | Status only from maintainer labels. |
| Voice practice | `#/voice` | Implemented, untested on devices | |
| Learning paths | `#/paths` | Implemented | 4 starter paths, AI-assembled. |
| Private sync | `#/sync` | Implemented, untested on devices | AES-GCM + PBKDF2 to a secret Gist. |
| Progress, backup/restore | `#/progress` | Implemented | |
| Static SEO pages | `q/*.html` | Implemented | Deterministic, checked by tests. |
| **Home / dashboard** | none | **Missing** | The app opens on the full question bank. Nothing answers "what should I do next?" until a learner finds Plan. |
| **First-run onboarding** | none | **Missing as a first-run flow** | The Plan profile form exists but is only reached by clicking Plan. |
| Readiness evidence, flashcards, topic map, warm-up, calendar export | none | Missing | Phases 6 and 18 to 21. |

## 3. Verified defects

| # | Defect | Severity | Where |
|---|---|---|---|
| D1 | 66 answers with no recorded author are shown with **no review label at all**, so they look more trustworthy than the 1,087 labelled AI drafts. The static pages label them "AI-drafted", which is a guess. | High (trust) | `js/app.js` `metaLine`, `scripts/build-seo.js` |
| D2 | The question bank lede says "The rest are real interview questions whose answers are still being written" when 1,153 of 1,153 have answers. | Medium | `js/app.js` |
| D3 | `index.html` Open Graph description says "9 IT roles" and "written answers (growing)"; there are 10 roles and every question has an answer. | Low | `index.html` |
| D4 | No way to record "a person found this answer wrong" short of deleting or rewriting it. | Medium | `js/quality.js` |
| D5 | The "Answer pending" filter chip always shows an empty list (there are no pending answers). | Low | `js/app.js` |
| D6 | The 66 unrecorded-origin answers are the **thinnest in the bank** and are the core fundamentals (closures, event loop, REST, TLS, Terraform state, precision/recall). | High (content) | `data/*.js` |

## 4. UX problems

- **No front door.** First visit lands on a 1,153-item list with a gear selector and 7 filter chips. The product's planning, review and mock tools are behind a menu.
- **Mobile header** wraps to two rows at 390 px (brand, theme, settings, then 5 nav items over two lines), pushing content down about 120 px.
- **Navigation clutter.** "Practice" holds 9 unrelated items (planning tools, practice tools and analysis tools mixed). Plan and Review are separated though they are one workflow.
- **"Continue preparation"** exists only inside Plan.
- **Weak areas** are only visible as a raw list of question titles on Progress; nothing groups them by topic.
- **No time estimate** for the day outside Plan.

## 5. Content-quality gaps

- 0 human-reviewed answers, 0 references (see `docs/CONTENT_QUALITY.md` for the full measured breakdown).
- Gear 4 answers include a concrete example far less often than other gears (65% vs 87 to 90%).
- 161 Gear 3/4 answers have no decision-making, constraint or trade-off language; 304 answers name no pitfall or failure mode.
- 47 answers have fewer than 3 follow-ups; 44 explanations are under 180 words.
- Topic taxonomy is fragmented: dozens of single-question topics weaken topic filters and weak-topic detection.

## 6. Technical risks

- **GitHub Actions** are pinned to tags (`actions/checkout@v4`), not commit SHAs (already on the roadmap). `generate-answer.yml` uses Node 20, CI uses Node 22. Permissions are scoped and the AI workflow is gated by author association, concurrency and an input cap (verified).
- **Service worker** precache is a hand-maintained list; a test checks that every file `index.html` loads is precached. The cache name must be bumped by hand on each release.
- **Manifest** has only an SVG icon. iOS ignores it for home-screen icons and some Android launchers want 192/512 PNGs (unverified on devices). `start_url` points at the question bank.
- `js/app.js` is 58 KB in one closure; new views are added in `js/views*.js` through `IGU.routes`, which is the pattern to keep.
- Search runs a substring scan over about 3 MB of text on each keystroke; fine on desktop, unmeasured on low-end phones.

## 7. Accessibility (from code review only)

Labelled controls, live regions and 44 px targets exist in newer views; `details` menus close on Escape. Not verified: screen reader output, focus order after route changes (focus is not moved to `#app` on navigation), 200% zoom, contrast of muted text in dark mode. `docs/MANUAL_QA.md` is still unchecked.

## 8. Prioritised backlog

| Priority | Item | Phase |
|---|---|---|
| P0 | Honest labels for every review state, add Needs correction, measurable content report, review workflow (D1, D2, D4) | 1 |
| P0 | Rewrite the thin, most-studied fundamentals (D6); add primary-source references to high-value questions | 1 |
| P0 | Home dashboard with first-run onboarding; open the app there; regroup navigation | 2 |
| P0 | Move focus to the main region on route change; manual QA on real devices | 16 |
| P1 | Evaluation feedback tied to missing concepts; weekly summary; task deferral | 3, 4 |
| P1 | Editable JD skills with exact/inferred matches | 5 |
| P1 | Search ranking, acronyms, related questions | 11 |
| P1 | PNG manifest icons, SHA-pinned actions | 17, 13 |
| P2 | Flashcards, topic map, warm-up, calendar export | 18 to 21 |

## 9. Recommendation for the next release

Ship Phases 1 and 2 together as v1.5: the content trust work (honest states, report, review queue, rewritten fundamentals, references) and a home dashboard that a new learner reaches first. Both keep the static, private, dependency-free architecture and need no AI key. Phases 3 and 4 (feedback and adaptive planning) come next because the dashboard will surface their output.
