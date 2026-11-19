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
| Auto-generated answers | By default an offline engine (`js/engine.js`) classifies the question, calibrates to the level and company domain, gives a structure for the answer, and quotes the closest entries in the curated bank. It is template-based, not a language model, and says so on screen. |
| Tailored answers (optional) | Add an Anthropic API key in **Settings** and each question gets a Claude-written answer. The call goes from the browser straight to `api.anthropic.com`. The key stays in local storage on that device. Use a key with a low spend limit and remove it on shared computers. |

Limits to know about: the GitHub API allows 60 unauthenticated requests per hour per visitor, so the shared list is cached for 10 minutes. Shared posts are unmoderated until someone closes the issue, so review the Issues tab now and then.

## Run it locally

```bash
python3 -m http.server 8000     # then open http://localhost:8000
npm test                        # data validation and answer-engine tests (Node 18 or newer, no install needed)
```

## Deploy on GitHub Pages

Settings, Pages, deploy from branch `main`, folder `/ (root)`. If you fork the project, change `owner` and `repo` in `js/config.js` so sharing and the Community tab point at your repository.

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
- A Content Security Policy in `index.html` restricts scripts and styles to this site and network calls to `api.github.com` and `api.anthropic.com`.
- The markdown renderer only allows `#/` and `https://` links.
- Do not post confidential material or anything covered by an NDA. Describe questions in your own words.

## Licence

MIT. See `LICENSE`.
