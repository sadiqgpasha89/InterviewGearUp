# Contributing to InterviewGearUp

The biggest gap in this project is **real, accurate answers**. Most of the bank is still placeholder text (run `npm run content:status` for the current count and the questions that most need an answer).

## Content rules

- **Original wording only.** Write the question and answer yourself. Do not paste text from books, paid courses, other sites or AI output you have not checked.
- **No confidential material.** Do not post anything covered by an NDA or taken from a real interview loop. Describe the topic in your own words. Questions posted to the community board are public.
- **Attribute what you build on.** Put official docs, RFCs and papers in `references` (https links only).
- **Be accurate and say what depends on context.** A wrong answer is worse than a missing one.

## How an answer is stored

Answers live in `data/*.js` (the original bank) and `data/curated/*.js` (rewritten and new answers). A curated file looks like this:

```js
const meta = (d) => ({ difficulty: d, reviewStatus: 'ai-drafted', contentVersion: 1 });
IGU.revise([ Object.assign(meta('medium'), { id: 'be-65', short: '...', detail: L('...'), follow: ['...', '...'], tags: ['...', '...', '...'] }) ]);
```

- `IGU.revise` replaces the text of an **existing** id and keeps its role and gear, so saved progress and shared links keep working. It throws on an unknown id.
- `IGU.add` adds a new question. `IGU.retire(oldId, replacementId)` removes a duplicate and redirects old links.
- `short` is the 30-second answer (60 to 420 characters). `detail` needs at least 400 characters, at least 2 `follow` questions and at least 3 `tags`.

## Review status

| Value | Meaning |
| --- | --- |
| *(none, filler text)* | Placeholder. Shown as "answer not written yet". |
| `ai-drafted` | Written with AI help; no person has checked it. Shown as such. |
| `reviewed` | A person checked it. Requires `lastReviewed: 'YYYY-MM-DD'`. Do not set this unless you really reviewed it. |

Bump `contentVersion` when an answer changes materially.

## Before you open a pull request

```sh
npm test            # schema, metadata, duplicates, coverage ratchet
npm run content:status
```

Coverage per role and gear may not go down (`test/coverage-baseline.json`). If your change raises it, regenerate the baseline in the same PR.

## Reporting a wrong answer

Use "Report a problem with this answer" under any answer, or the *Content feedback* issue template. Reports are triaged by maintainers; abusive or off-topic reports are closed.

## Moderation of community questions

Issues labelled `community-question` are shown on the board. The AI-answer workflow only runs for maintainers' issues or after a maintainer adds the `approved` label. AI answers are labelled `ai-answered` by the bot and are study aids, not authoritative.

### Labels that control what the board shows

Status comes only from GitHub labels that a maintainer applies; text inside an issue never changes it.

| Label | Effect |
|---|---|
| `approved` | Shown as "Reviewed by a maintainer". Also allows the AI answer workflow to run. |
| `needs-review` | Shown as "Awaiting review". |
| none of these | Shown as "Unreviewed community report". |
| `rejected`, `duplicate`, `confidential`, `inappropriate` | Hidden from the board and company pages. Use `confidential` for anything that looks like NDA or proprietary material. |

`ai-answered` is applied by the bot and marks a generated answer. Do not apply it by hand.
