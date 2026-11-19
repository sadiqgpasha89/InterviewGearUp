# InterviewGearUp

Interview preparation for IT roles, organised by **gear**:
* **Gear 1 — Junior** (0 to 2 years)
* **Gear 2 — Mid-level** (2 to 5 years)
* **Gear 3 — Senior** (5 to 8 years)
* **Gear 4 — Lead / Staff** (8+ years)

---

## Highlights

- **Question bank**: 66 in-depth questions across 9 tech roles. Every entry provides a 30-second summary answer, deep technical breakdown, pitfalls & trade-offs, and likely follow-up questions tailored to that level.
- **Drill mode**: Practice out loud with random questions and a timer. Questions marked as prepared automatically appear less frequently.
- **Community board**: Real interview questions asked at top companies, filterable by company, role, gear, and business domain.
- **Auto-generated LLM answers**: Community questions are automatically answered by an LLM (Google Gemini, Anthropic Claude, or OpenAI) calibrated for the stated role, company domain, and gear level.
- **Post a question**: Register locally with a display name, write questions you were asked in real interviews, and receive an instant answer.
- **Zero bloat**: Static site built with vanilla HTML, modern CSS, and lightweight JavaScript. No frameworks, no build steps, no tracking, and no external dependencies.

---

## Roles Covered

| Role | Focus Topics |
|---|---|
| **Software Engineer (Core)** | Algorithms, concurrency, distributed systems, caching, API design |
| **Frontend Engineer** | DOM rendering, state management, web performance, CSS architecture, accessibility |
| **Backend Engineer** | Microservices, database indexing, transactions, messaging queues, event sourcing |
| **DevOps / SRE / Cloud** | Kubernetes, CI/CD, observability, containerisation, infrastructure-as-code |
| **Data Engineer** | ETL pipelines, partitioning, data lakes, streaming vs. batch, SQL optimization |
| **ML / AI Engineer** | Model evaluation, embeddings, RAG architectures, feature pipelines, drift detection |
| **QA / SDET** | Test automation pyramids, flaky test mitigation, contract testing, mocking |
| **Security Engineer** | Threat modeling, zero trust, OAuth2/OIDC, secrets management, input sanitization |
| **Tech Lead / EM** | System architecture, technical debt management, mentorship, stakeholder alignment |

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
[ GitHub Actions Workflow runs ] ── (.github/workflows/generate-answer.yml)
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
     - `ANTHROPIC_API_KEY` *(Default model: `claude-3-5-sonnet-20241022`)*, or
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

Run validation tests:

```bash
# Executes data validation, search engine checks, and parser tests
npm test
```

Test the answer generation script in standalone mode:

```bash
# Runs self-test of prompt building and parsing
node scripts/generate-answer.js
```

---

## Deploy to GitHub Pages

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
- **Safe Link Rendering**: The built-in markdown parser only allows internal hash routes (`#/`) and secure external links (`https://`).
- **Local Data Control**: User profiles, saved drafts, preparation progress, and stored API keys can be deleted anytime using **Settings > Delete my local data**.

---

## License

MIT License. See [LICENSE](LICENSE).
