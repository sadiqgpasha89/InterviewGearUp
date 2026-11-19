# InterviewGearUp

Interview preparation for IT roles, organised by **gear**: 1 junior, 2 mid-level, 3 senior, 4 lead or staff.

- **Question bank**: 66 questions across 9 roles (core software engineering, frontend, backend, DevOps/SRE/cloud, data, ML/AI, QA/SDET, security, tech lead/manager). Every question has a 30-second answer, an in-depth explanation and likely follow-ups, written for the stated level.
- **Drill**: random questions with a timer for practising out loud. Questions you mark as prepared come up less often.
- **Community**: questions engineers were asked at real companies, filterable by company, role, gear and domain.
- **Post a question**: register, post a question for a company, role, level, domain and round, and get an answer draft immediately.

It is a static site: plain HTML, CSS and JavaScript. No framework, no build step, no dependencies, no analytics, and no third-party requests except the two optional API calls described below.

## How the pieces work on a static host

GitHub Pages cannot run a server, so sharing and answer generation use what is available:

| Feature | How it works |
|---|---|
| Registration | A profile (display name, optional GitHub username) saved in your browser's local storage. |
| Your posts | Saved in local storage, so they are private to your browser until you share them. |
| Sharing with everyone | **Share with the community** opens a pre-filled issue form in this repository. Issues labelled `community-question` are read through the public GitHub API and shown on the Community tab for all visitors. The GitHub account is the identity, and closing an issue removes the post. |
| Auto-generated answers (LLM) | Community questions get full AI-generated answers powered by an LLM (calibrated for role, gear level, and company domain). When an issue is posted, a GitHub Action automatically runs and generates the answer using Gemini, Claude, or OpenAI, saving it directly to the issue body so all visitors see it. |
| In-browser AI answers | Add an API key (Google Gemini free tier, Anthropic Claude, or OpenAI) in **Settings** to generate or re-generate tailored answers instantly from your browser. The key stays in your browser's local storage. |
| Offline fallback | If no LLM API key or network connection is available, an offline engine (`js/engine.js`) classifies the question and provides a structured scaffold quoting the closest curated bank entries. |

Limits to know about: the GitHub API allows 60 unauthenticated requests per hour per visitor, so the shared list is cached for 10 minutes. Shared posts are unmoderated until someone closes the issue, so review the Issues tab now and then.

## Run it locally

```bash
python3 -m http.server 8000     # then open http://localhost:8000
npm test                        # data validation and answer-engine tests (Node 18 or newer, no install needed)
```

## Deploy on GitHub Pages

Settings, Pages, deploy from branch `main`, folder `/ (root)`. If you fork the project, change `owner` and `repo` in `js/config.js` so sharing and the Community tab point at your repository.

### Enable automated LLM answers for community questions

To have GitHub Actions automatically generate AI answers when community questions are submitted:
1. In your repository on GitHub, go to **Settings > Secrets and variables > Actions**.
2. Add a repository secret: `GEMINI_API_KEY` (recommended, free from [Google AI Studio](https://aistudio.google.com)), `ANTHROPIC_API_KEY`, or `OPENAI_API_KEY`.
3. Whenever an issue with the label `community-question` is opened, the `.github/workflows/generate-answer.yml` workflow generates the answer using the LLM and saves it to the issue body for all visitors to see.

## Add or edit questions

Questions live in `data/*.js`, one file per role. Each entry:

```js
{
  id: 'be-10', role: 'backend', level: 3, topic: 'Databases',
  q: 'The question as an interviewer would ask it?',
  short: 'The 30-second answer.',
  detail: L('Paragraphs, "- " bullets, numbered lists, fenced code blocks, **bold**, `inline code`.'),
  follow: ['Likely follow-up one', 'Likely follow-up two'],
  tags: ['keywords', 'used', 'for', 'matching']
}
```

`npm test` checks that ids are unique, every role and gear is covered, answers are complete, and the GitHub issue form options still match the app. If you add a role, domain or round, update `js/config.js` and `.github/ISSUE_TEMPLATE/question.yml` together.

## Security notes

- User text is only ever inserted as text nodes (no `innerHTML`), including text from GitHub issues and from the AI.
- A Content Security Policy in `index.html` restricts scripts and styles to this site and network calls to `api.github.com`, `api.anthropic.com`, `generativelanguage.googleapis.com`, and `api.openai.com`.
- The markdown renderer only allows `#/` and `https://` links.
- Do not post confidential material or anything covered by an NDA. Describe questions in your own words.

## Licence

MIT. See `LICENSE`.
