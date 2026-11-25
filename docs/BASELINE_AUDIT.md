# Baseline audit (Phase 0)

Written before the P0 changes in this branch, from reading the code and running the data through scripts. Numbers can be reproduced with `npm run content:status` and `npm test`.

## What the product is

A static GitHub Pages SPA (vanilla JS, no build step, strict CSP). Hash routes: `#/questions`, `#/q/<id>`, `#/drill`, `#/progress`, `#/community`, `#/post`. Optional bring-your-own-key AI runs in the browser (Gemini, Anthropic or OpenAI). The community board uses GitHub issues as its backend, and a GitHub Action can generate an answer for a new issue.

## Local storage (all keys are prefixed `igu.`)

| Key | Shape | In backup | Notes |
| --- | --- | --- | --- |
| `done`, `saved` | `{id: 1}` | yes | question ids |
| `notes` | `{id: text}` | yes | 4000 chars max each |
| `practice` | `{id: {n, ok, again, secs, last}}` | yes | drill history. Kept as is; the review schedule is derived from it |
| `activity` | `["YYYY-MM-DD"]` | yes | study days. Was UTC days; now local days |
| `posts`, `profile` | list / object | yes | community drafts and identity |
| `settings` | `{provider, key, model}` | **never** | holds the API key |
| `ai`, `shared`, `theme` | caches / preference | no | |
| `schema` | integer | no | added in this branch, versions the migrations |
| `srs`, `plan`, `mocks` | see `js/srs.js`, `js/planner.js`, `js/mock.js` | yes (`srs`, `plan`, `mocks`) | added in this branch |

## Findings

| # | Finding | Severity | Status |
| --- | --- | --- | --- |
| 1 | 805 of 918 questions (88%, 93% of the original 901) are one templated answer with the topic swapped in. | Critical | UI now says so, filler is excluded from retrieval, 47 real answers added in this branch, honest counts everywhere. Not solved: 427 answers still missing for the 15-per-cell goal. |
| 2 | README, meta tags and the page lede claimed "900+ questions with detailed answers" and "100+ per role". | High | Corrected. |
| 3 | The community workflow ran on any issue, with no cap on input length or per-issue concurrency. | High | Gated to maintainers or an `approved` label, 8000 char cap, concurrency group, 5 minute timeout. |
| 4 | A contributor could add a fake `ai-answered` provenance line in an issue body. | High | Provenance now comes only from a bot-applied label. |
| 5 | Issue text and job descriptions went into AI prompts with no delimiter hardening. | Medium | `engine.untrusted()` strips our delimiter tags. |
| 6 | Streak used UTC days, so a late-evening session could count as tomorrow. | Medium | Local days. |
| 7 | One exact duplicate question (`ml-100` and `ml-99`). | Low | Retired non-destructively, old links redirect. |
| 8 | No test for content quality, no CI. | Medium | Metadata, duplicate and coverage ratchet tests; CI workflow added. |
| 9 | No retry, timeout or error classification on AI calls. | Medium | `js/ai.js`. |
| 10 | `CONTRIBUTING.md` was linked from the issue chooser but did not exist. | Low | Added. |

## Real coverage, role by gear (before: 66 real answers, after: 113)

After this branch (from `npm run content:status`):

```
role              G1    G2    G3    G4
general            5     2     2     4
frontend           5     3     2     3
backend            5     3     3     3
devops             5     3     2     3
data               4     2     2     3
ml                 5     2     2     3
qa                 5     2     1     3
security           5     2     2     3
leadership         6     0     3     5
```

The goal is 15 in every cell (540 total). Still to write: 427. `test/coverage-baseline.json` is a ratchet: coverage may not go down. `npm run test:goal` fails until the goal is met.

## Tests and CI

Node's built-in test runner loads the browser scripts in a `vm` context. There was no CI before this branch.

## Not verified here

No real-device or screen-reader testing was done. The manual checklist is in `docs/MANUAL_QA.md`.
