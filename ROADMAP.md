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

- Question bank: 900+ questions across 9 roles and 4 gears, each with a 30-second answer, an in-depth explanation and likely follow-ups.
- Drill mode with a timer.
- Community board backed by GitHub Issues, answered automatically by an LLM through GitHub Actions.
- Bring-your-own-key generation in the browser (Gemini, Claude, OpenAI) with an offline template fallback.

### v1.1 (this release)

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

## Next (v1.2): content quality and balance

The coverage matrix exposed an imbalance in the bank: **Gear 1 (Junior) has 60 questions and Gear 4 (Lead / Staff) has 59, against ~390 each for Gears 2 and 3.** Some cells are nearly empty (Tech lead / EM has no Gear 1 questions; Frontend and QA have 1 or 2 at Gear 4).

- [ ] Rebalance to at least **15 questions per role per gear** (540 minimum across the 36 cells), prioritising Junior and Lead / Staff.
- [ ] Add a test that fails when any role × gear cell drops below the minimum.
- [ ] Per-question **difficulty and "last reviewed" date**, shown in the UI.
- [ ] **"Report an issue with this answer"** button that pre-fills a GitHub issue with the question id.
- [ ] Moderation workflow for community posts: a `needs-review` label, a reviewed badge, and clear posting guidelines in `CONTRIBUTING.md`.
- [ ] Label each community answer with its provider, model and generation date (partly there today).

## Later (v1.3): practice depth

- [ ] **Spaced repetition** for the Needs practice pool (resurface after 1, 3, 7 and 14 days).
- [ ] **Mock interview mode**: a fixed set of N questions mixing rounds (coding, design, behavioural), with a countdown per question and a scorecard at the end.
- [ ] **AI feedback on your spoken answer**: Web Speech API transcription, then a rubric-based critique with the visitor's own key.
- [ ] **Study plans**: "Senior backend in 2 weeks" style curated paths with daily targets.
- [ ] Company-specific tracks built from community questions (e.g. everything tagged with one company and domain).

## Exploratory

- [ ] New roles: Mobile (iOS / Android), Platform / SRE leadership, Product-minded engineer, Data scientist / Analytics engineer.
- [ ] Behavioural question bank with STAR templates linked to your notes.
- [ ] Internationalisation of the UI.
- [ ] Optional sync of progress through a private GitHub Gist (still no server of our own).
- [ ] Static pre-rendered pages per question for search engines and no-JavaScript readers.

## How to propose changes

Open an issue describing the problem first. Content additions should follow the schema in the README and pass `npm test`.
