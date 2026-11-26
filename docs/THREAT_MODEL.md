# Threat model: optional private sync

Scope: `js/sync.js` and the `#/sync` page. Sync is **off by default**. Nothing is sent until a learner ticks the consent box, supplies a GitHub token and a passphrase, and presses Upload or Download. The default product remains account-free and tracker-free.

## What it does

- Builds the same backup object as "Download backup" (`IGU.stats.makeBackup`). That list of keys is fixed in `BACKUP_KEYS` (including `storyPractice`, `history`, `jdTarget`, `readiness`, etc.). It never contains the AI provider key (`settings`) or the sync token (`sync`).
- Encrypts it in the browser: AES-256-GCM, key from the passphrase with PBKDF2-SHA256 (210,000 iterations), random 16-byte salt and 12-byte IV per upload.
- Stores the ciphertext as one file in a **secret gist** in the learner's own GitHub account, through `https://api.github.com` only (already the only GitHub host in the page's Content Security Policy).
- Download and file restore both use `IGU.stats.applyBackup`, which validates every section before writing and replaces local `BACKUP_KEYS` atomically (rolling back if a write fails). It does not merge.

## Assets and who might attack them

| Asset | Where it lives | Main risks |
|---|---|---|
| Progress, notes, stories, drafts | Browser storage; encrypted copy in the gist | Reading by someone with the gist URL or token; loss |
| GitHub token (`gist` scope) | `sessionStorage` for the tab; `localStorage` only if the learner ticks "remember" | Theft by script injection or by someone using the device; misuse to read or change the learner's gists |
| Passphrase | Typed into a field, used once, never stored or logged | Weak passphrase; forgetting it |

## Threats and what the design does about them

| Threat | Mitigation | Residual risk |
|---|---|---|
| GitHub, or anyone with the secret gist URL, reads the data | Data is encrypted client-side; the gist holds ciphertext only. Secret gists are unlisted, not access-controlled, so encryption is mandatory, not optional | A weak passphrase can be guessed offline. A 10-character minimum is enforced; stronger is better |
| Token leaks to another site | Token is sent only in an `Authorization` header to `api.github.com`, never in a URL, never logged, never put in the backup or in error messages. `referrerPolicy: no-referrer`, `cache: no-store` | Anything that can run script on this origin can read browser storage |
| Cross-site scripting on this site | No `innerHTML`, strict CSP (`script-src 'self'`, no inline script), all text escaped | A future bug could weaken this. The token is therefore kept in `sessionStorage` by default and the "remember" option carries a warning |
| Over-powerful token | The page links to a token form pre-set to the `gist` scope only and says to use no more | The learner can still paste a broader token. The page cannot check its scopes without a call that reveals them |
| Tampering with the gist | AES-GCM authenticates the data; a modified file fails to decrypt and is rejected. Decrypted data is re-validated by `readBackup` and only known keys are applied | An attacker with the token could delete or overwrite the gist (availability loss). Keep a downloaded backup |
| Two devices overwrite each other | Upload reads the remote `savedAt` first and refuses when the gist has newer data than this browser last saw, unless the learner confirms | Sync is replace-not-merge; the last confirmed writer wins |
| Large data silently truncated | GitHub truncates gist files over about 1 MB in API responses. Uploads above 900 KB are refused with a message | Very heavy users must use file backups |
| Malicious file loaded as a "sync file" | Format and version checks, authenticated decryption, `readBackup` validation. Nothing is executed or rendered as HTML | None known |
| Passphrase forgotten | Not recoverable by design | The page says so and recommends a file backup |
| Telemetry creep | No analytics, no third-party hosts. Only `api.github.com` on a button press | None |

## Consent and disclosure

The page states, before any action: what is uploaded, that it is encrypted, where it goes, that the token and AI key are excluded, that data is replaced not merged, and that a forgotten passphrase cannot be recovered. The "Forget token and gist id" button clears local sync state; deleting the gist itself is done on gist.github.com.

## Not covered

- Real-device and cross-browser testing of the Web Crypto path.
- Protection if the device or browser profile is already compromised.
- Multi-device merge, conflict resolution at field level, and sharing between people.
- A formal external security review. This document is a design record, not an audit.

## Changing this code

Keep the token gist-only and out of backups. Never store the passphrase. Never add another network host. Update this file and the tests (`test/run.js`, "sync") in the same change.
