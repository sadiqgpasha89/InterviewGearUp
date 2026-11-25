# InterviewGearUp

🌐 **Live Application:** [https://sadiqgpasha89.github.io/InterviewGearUp/](https://sadiqgpasha89.github.io/InterviewGearUp/)  
👨‍💻 **Portfolio:** [https://sadiqgpasha89.github.io](https://sadiqgpasha89.github.io)

Interview preparation for IT roles, organised by **gear**:
* **Gear 1 — Junior** (0 to 2 years)
* **Gear 2 — Mid-level** (2 to 5 years)
* **Gear 3 — Senior** (5 to 8 years)
* **Gear 4 — Lead / Staff** (8+ years)

---

## Highlights

- **Question bank**: 918 interview questions across 9 tech roles and 4 gears, but **only 414 have a full written answer so far** (30-second answer, in-depth breakdown, pitfalls, follow-ups). The rest are real questions whose answer is still being written; the site says so on each one and shows a practice structure instead of filler. Use the **Full answer** filter to see only the written ones, and see [CONTRIBUTING.md](CONTRIBUTING.md) to help close the gap. Written answers are currently marked *AI-drafted, not yet reviewed by a person*.
- **Plan**: a daily list built from your role, gear, optional interview date and time budget: reviews that are due first, then new questions with a written answer, plus a mock round every third day. It is a rule-based schedule, not a readiness prediction.
- **Review (spaced repetition)**: questions you grade in Drill or Review come back on a schedule (again 1 day, partly 3, good 7 then growing, mastered 14 then 30 and up). Daily goal, role and gear filters, a "how it works" explainer and a reset. Days are your local calendar days.
- **Mock interview**: a timed round of 3, 5 or 7 questions (mixed, technical, behavioral or design). You get a deterministic rubric at the end (structure, specifics, trade-offs, coverage of the reference points, fit to the question type), likely follow-ups, a history, a downloadable Markdown report, and optional AI feedback with your own key. The rubric checks the shape of an answer, not correctness, and is not a prediction of interview results.
- **Behavioral story bank**: write STAR stories in your own words (situation, task, action, result, reflection), tag them (ownership, conflict, failure, leadership and more), see which behavioral questions each story could answer and which tags you have no story for. Rule-based tips flag a missing result or too many "we" statements. Optional AI feedback is told not to invent facts. Stories stay on your device.
- **Job description analyzer**: paste a job description to extract skills, a rough seniority estimate and the matching role, then get a prep plan linked to bank questions. The estimate is a heuristic, the pasted text stays in your browser unless you choose AI feedback, and it is treated as untrusted text in prompts.
- **System design workspace**: 12 design problems with requirements and estimate prompts, an 8-section template that autosaves, a text-to-diagram box (`A -> B: label`, shown as Mermaid-style source), a staged reference revealed only after you have written your own, and a deterministic seven-point rubric.
- **Coding lab**: 8 JavaScript problems with progressive hints, a timed mode and a solution walkthrough. Your code runs in an isolated Web Worker with no network, storage or page access, and is stopped after 3 seconds. JavaScript only; if the browser has no Worker support the lab is editor-only.
- **Company pages**: community reports grouped by company, with rounds, roles and a generic prep checklist. Reports are unverified unless a maintainer has labelled them `approved`; companies have not endorsed anything here.
- **Voice practice**: optional dictation (the browser's speech recognition, which may use a cloud service; you are asked first) or typing, then timing, pace, filler-word and structure checks on the text. Transcripts are not saved unless you tick the box, and can be deleted or exported. No emotion or personality inference.
- **Drill mode**: Practice out loud with random questions and a timer. Grade yourself (confident, mastered, partly, practise again); grades feed the review schedule. Keyboard shortcuts: `N` next, `R` reveal, `Y` confident, `M` mastered, `B` partly, `P` practise again.
- **Save, annotate, filter**: Star questions for later, keep personal notes on any question, and filter the bank by To prepare / Prepared / Saved / Needs practice / With notes / Full answer / Answer pending. Press `/` to jump to search.
- **Report a problem**: every answer has a link that opens a pre-filled GitHub issue (question id, role, gear, content version; no personal data).
- **Progress page**: Overall %, study streak, and a role × gear coverage matrix. **Backup and restore** your progress, review schedule, plan and mock history as a JSON file (API keys are never exported).
- **Works offline**: Installable as an app (PWA); the question bank, plan, review and mock keep working without a connection (AI features need a connection).
- **Light / Dark / Auto theme** toggle.
- **Community board**: Interview questions reported by community members, filterable by company, role, gear, round and business domain, with a clear status on each (reviewed, awaiting review or unreviewed).
- **LLM answers for community questions**: answered by a GitHub Action for maintainers' issues or after a maintainer adds the `approved` label (to prevent cost abuse). The bot marks them with an `ai-answered` label; treat them as study aids.
- **Post a question**: Register locally with a display name, write questions you were asked in real interviews, and receive an instant answer.
- **Zero bloat**: Static site built with vanilla HTML, modern CSS, and lightweight JavaScript. No frameworks, no build steps, no tracking, and no external dependencies.

See **[ROADMAP.md](ROADMAP.md)** for the product scope, what shipped in each release, and what is planned next.

---

## Roles covered

| Role | Questions (written answers) | Focus Topics |
|---|---|---|
| **Software Engineer (Core)** | 101 (13) | Algorithms, data structures, concurrency, OOP patterns, bit manipulation, systems programming |
| **Frontend Engineer** | 101 (13) | DOM rendering, CRP, JavaScript internals, React Fiber, Core Web Vitals, CSS architecture, accessibility |
| **Backend Engineer** | 102 (14) | Microservices, database indexing, MVCC, transactions, messaging queues, event sourcing, caching |
| **DevOps / SRE / Cloud** | 102 (13) | Kubernetes, CI/CD, Linux internals, Prometheus observability, GitOps, cloud networking, SRE |
| **Data Engineer** | 102 (11) | Spark optimization, Iceberg/Delta Lake, ETL/ELT pipelines, dimensional modeling, Kafka, Airflow |
| **ML / AI Engineer** | 99 (12) | Deep learning, Transformers, Attention derivations, LLM serving (vLLM/FlashAttention), RAG, MLOps |
| **QA / SDET** | 102 (11) | Test automation pyramids, Playwright/Selenium, API contract testing, performance (k6), flaky tests |
| **Security Engineer** | 103 (12) | OWASP Top 10, cryptographic primitives, OAuth2/OIDC, cloud IAM, Zero Trust, threat modeling |
| **Tech Lead / EM** | 106 (14) | Engineering 1-on-1s, delivery execution, ADRs, RFC culture, blameless postmortems, team topologies |

---

## How It Works on a Static Host

Because GitHub Pages does not run a server backend, sharing and AI answer generation leverage GitHub's public API, GitHub Actions, and browser-direct API calls:

```
[ Contributor submits question ]
            │
            ▼
[ Opens pre-filled GitHub Issue ] ── (label: community-question)
            │
            ▼
[ GitHub Actions Workflow runs ] ── only for maintainers' issues or after a maintainer adds the `approved` label
            │
            ├─► Calls LLM (Gemini 2.5 Flash / Claude / OpenAI)
            ├─► Formats answer for the stated role & gear
            └─► Appends `### Auto-generated Answer` to issue body
            │
            ▼
[ InterviewGearUp Website ] ── (Community Tab)
            │
            └─► Fetches open issues via GitHub API (cached 10 min)
            └─► Displays full LLM answers to all visitors for free!
```

| Component | Implementation |
|---|---|
| **Identity & Registration** | Saved in browser `localStorage`. No accounts or passwords to manage. |
| **Local Drafts** | Questions stay private on your local browser until you choose to share them. |
| **Sharing with the Community** | Clicking **Share with the community** opens a pre-populated issue form in this repository. Issues labeled `community-question` are retrieved via the GitHub API. |
| **Auto-generated Answers (LLM)** | A GitHub Actions automation (`.github/workflows/generate-answer.yml`) triggers when a question issue is opened, generates a structured response using an LLM, and appends it to the issue body so every visitor sees it without requiring an API key. |
| **In-Browser AI Generation** | Add an API key in **Settings** (Google Gemini free tier, Anthropic Claude, or OpenAI) to generate or regenerate answers directly in your browser. Keys remain strictly within local storage. |
| **Offline Scaffold Fallback** | When offline or without API keys, a local engine (`js/engine.js`) classifies the question, recommends answer structures, and references matching questions from the curated bank. |

---

## Setting Up LLM Answers in Your Repository

When you fork or deploy this repository, enable the automated AI answer workflow in three steps:

1. **Obtain an API Key**:
   - **Google Gemini** *(Recommended, free tier without credit card)*: Get an API key at [Google AI Studio](https://aistudio.google.com).
   - **Anthropic Claude**: Get an API key from the [Anthropic Console](https://console.anthropic.com).
   - **OpenAI**: Get an API key from the [OpenAI Platform](https://platform.openai.com).

2. **Add Repository Secret**:
   - Go to your repository on GitHub: **Settings > Secrets and variables > Actions**.
   - Create a new repository secret:
     - `GEMINI_API_KEY` *(Default model: `gemini-2.5-flash`)*, or
     - `ANTHROPIC_API_KEY` *(Default model: `claude-sonnet-5-5`)*, or
     - `OPENAI_API_KEY` *(Default model: `gpt-4o-mini`)*

3. **Verify the Action**:
   - When a new issue is submitted with label `community-question`, `.github/workflows/generate-answer.yml` executes `scripts/generate-answer.js`, appends the response to the issue, and posts a comment.

---

## In-Browser Settings

Visitors can also use their own API key directly within the browser:

1. Click **Settings** in the top navigation bar.
2. Select your AI provider (**Google Gemini**, **Anthropic Claude**, or **OpenAI**).
3. Paste your API key. (Optionally specify a custom model name such as `gemini-2.5-flash` or `gpt-4o-mini`).
4. Click **Save**.

Now, posting a question or clicking **Regenerate with AI** calls the LLM directly from your browser.

---

## Local Development & Testing

Run the site locally with any static web server:

```bash
# Start a local web server (Python 3)
python3 -m http.server 8000

# Open in your browser
# http://localhost:8000
```

Run validation tests (schema, metadata, duplicates, coverage ratchet, spaced repetition, planner, mock rubric, AI adapter, workflow gate):

```bash
npm test                  # all automated tests
npm run test:goal         # also enforces the 15-real-answers-per-role-and-gear target (fails until it is met)
npm run content:status    # real vs placeholder answers per role and gear, and the next questions to write
```

Manual checks that need a person and real devices are listed in [docs/MANUAL_QA.md](docs/MANUAL_QA.md). The starting-point audit is in [docs/BASELINE_AUDIT.md](docs/BASELINE_AUDIT.md).

Test the answer generation script in standalone mode:

```bash
# Runs self-test of prompt building and parsing
node scripts/generate-answer.js
```

---

## Deploy to GitHub Pages

The application is deployed live at: **[https://sadiqgpasha89.github.io/InterviewGearUp/](https://sadiqgpasha89.github.io/InterviewGearUp/)**

1. In your GitHub repository, navigate to **Settings > Pages**.
2. Under **Build and deployment > Source**, select **Deploy from a branch**.
3. Choose branch `main` and folder `/ (root)`.
4. If you fork the repository, update `owner` and `repo` in `js/config.js` so that the Community tab and issue submission point to your repository.

---

## Adding or Editing Questions

Questions are organised in `data/*.js` by role. Each entry adheres to the schema:

```js
{
  id: 'be-10',
  role: 'backend',
  level: 3, // 1: Junior, 2: Mid-level, 3: Senior, 4: Lead/Staff
  topic: 'Databases',
  q: 'The question as an interviewer would ask it?',
  short: 'The 30-second answer (60 to 420 characters).',
  detail: L(
    'Detailed explanation paragraphs.',
    '',
    '- Bullet points with concrete details',
    '- Trade-offs and performance implications'
  ),
  follow: [
    'Likely follow-up question one?',
    'Likely follow-up question two?'
  ],
  tags: ['database', 'indexing', 'b-tree', 'performance']
}
```

Run `npm test` after adding questions to verify that IDs are unique, fields meet length constraints, code fences are balanced, and issue templates match the options.

---

## Security & Privacy

- **No `innerHTML`**: All dynamic content (including markdown from GitHub issues and LLM responses) is parsed into DOM text nodes via `util.js`.
- **Strict Content Security Policy (CSP)**: `index.html` restricts scripts and styles to `self` and limits outbound connections strictly to:
  - `https://api.github.com`
  - `https://generativelanguage.googleapis.com`
  - `https://api.anthropic.com`
  - `https://api.openai.com`
  - `manifest-src` and `worker-src` are limited to `self` for the offline service worker and the coding-lab runner worker.
- **Code isolation**: coding-lab code is never evaluated in the page. It runs only in a dedicated Web Worker (`js/runner-worker.js`) with network and storage globals removed and a hard 3 second timeout. This limits accidents; it is not a security boundary against a determined attacker, so do not paste secrets into the editor.
- **Safe Link Rendering**: The built-in markdown parser only allows internal hash routes (`#/`) and secure external links (`https://`).
- **Local Data Control**: User profiles, saved drafts, preparation progress, notes, and stored API keys can be deleted anytime using **Settings > Delete my local data**.
- **API keys**: Keys in browser storage can be read by anyone with access to that browser profile, and calls are billed to the key owner. Use a dedicated key with a low spending limit.

---

## License

MIT License. See [LICENSE](LICENSE).
