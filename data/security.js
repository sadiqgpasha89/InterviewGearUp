/* Security engineer. */
(function () {
  const IGU = window.IGU, L = IGU.L;
  IGU.add([
    {
      id: 'sec-1', role: 'security', level: 1, topic: 'Cryptography',
      q: 'What is the difference between encoding, encryption and hashing?',
      short: "Encoding transforms data for transport and is trivially reversible (Base64). Encryption hides data and is reversible with a key. Hashing is one-way and used to verify integrity or store passwords.",
      detail: L(
        "- **Encoding** gives no secrecy. Anyone can decode Base64.",
        "- **Symmetric encryption** (AES-GCM): one shared key, fast, for bulk data.",
        "- **Asymmetric encryption** (RSA, elliptic curves): a key pair. Used for key exchange, signatures and certificates. Slower.",
        "- **Hashing** (SHA-256): a fixed-size fingerprint for integrity checks.",
        "- **Password hashing**: use a deliberately slow, salted algorithm (Argon2id, bcrypt, scrypt) so brute force is expensive. Never encrypt stored passwords, and never use MD5 or SHA-1 for security.",
        "- **HMAC**: a hash combined with a secret key to authenticate a message.",
        "- **Digital signature**: sign with a private key, verify with the public key.",
        "",
        "TLS combines these: asymmetric cryptography to agree on a session key, symmetric encryption for the data.",
        "",
        "A **salt** is a unique random value per password that defeats precomputed rainbow tables."
      ),
      follow: ['Why do we salt passwords?', 'What does GCM give you over CBC mode?', 'Hash versus HMAC versus signature?'],
      tags: ['hashing', 'encryption', 'encoding', 'password', 'cryptography', 'aes']
    },
    {
      id: 'sec-2', role: 'security', level: 1, topic: 'Web security',
      q: 'Explain SQL injection and cross-site scripting, and how to prevent each.',
      short: "SQL injection happens when user input is concatenated into a query and changes its logic; fix it with parameterised queries. XSS happens when untrusted input is rendered as HTML or script; fix it with output encoding and a strict Content Security Policy.",
      detail: L(
        "#### SQL injection",
        "Example: building `\"SELECT * FROM users WHERE name='\" + name + \"'\"` with input `' OR '1'='1` returns every user.",
        "",
        "- Use prepared statements or bound parameters (the database treats input as data, never as SQL).",
        "- Give the application database account least privilege.",
        "- Validate input as defence in depth, but never rely on escaping alone.",
        "",
        "#### Cross-site scripting",
        "Types: **stored** (saved, shown to others), **reflected** (in a URL), **DOM-based**. Impact: stealing sessions, acting as the victim, defacing pages.",
        "",
        "- Encode output for its context (HTML, attribute, JavaScript, URL).",
        "- Use frameworks that auto-escape, and do not bypass them with `innerHTML`.",
        "- Sanitise rich text with an allow-list library.",
        "- Send a Content Security Policy and set `HttpOnly` on session cookies.",
        "",
        "Both come from mixing **data** with **code**. In the OWASP Top 10, broken access control is the most common category."
      ),
      follow: ['Why are prepared statements safe?', 'Stored versus reflected XSS?', 'What does a Content Security Policy do?'],
      tags: ['sql injection', 'xss', 'owasp', 'web security', 'input validation']
    },
    {
      id: 'sec-3', role: 'security', level: 2, topic: 'Networking',
      q: 'How does the TLS handshake work?',
      short: "The client authenticates the server through its certificate, both sides agree on fresh session keys with an ephemeral key exchange, and from then on traffic is encrypted with fast symmetric ciphers.",
      detail: L(
        "#### TLS 1.3 in outline",
        "1. **ClientHello**: supported cipher suites and the client's key share.",
        "2. **ServerHello**: chosen suite and the server's key share, then the certificate and a signature proving it holds the private key.",
        "3. Both sides derive session keys using ephemeral Diffie-Hellman.",
        "4. **Finished** messages confirm the handshake. Application data is then encrypted. Takes one round trip.",
        "",
        "#### Certificate validation",
        "The client checks the chain up to a trusted certificate authority, the hostname, validity dates and revocation status (OCSP stapling).",
        "",
        "#### Why ephemeral keys",
        "**Forward secrecy**: if the server's long-term key leaks later, recorded past traffic still cannot be decrypted.",
        "",
        "**Mutual TLS** has the client present a certificate as well, common between internal services.",
        "",
        "Common problems: expired certificates, incomplete chains, old protocol versions, weak ciphers. Use HSTS to force HTTPS, and debug with `openssl s_client -connect host:443`."
      ),
      follow: ['What is forward secrecy?', 'What is mutual TLS used for?', 'How does certificate pinning work?'],
      tags: ['tls', 'ssl', 'handshake', 'certificate', 'https', 'forward secrecy', 'mtls']
    },
    {
      id: 'sec-4', role: 'security', level: 2, topic: 'Identity',
      q: 'Explain the OAuth 2.0 authorization code flow with PKCE.',
      short: "The app redirects the user to the identity provider, gets back a short-lived code, and exchanges it for tokens along with a one-time secret (the code verifier) that proves it is the same app that started the flow.",
      detail: L(
        "**Roles**: user, client app, authorization server, resource server (API).",
        "",
        "1. The client creates a random `code_verifier`, hashes it into a `code_challenge`, and sends the challenge with `state` and `redirect_uri` in the authorisation request.",
        "2. The user logs in and consents at the identity provider.",
        "3. The provider redirects back with an authorisation `code`.",
        "4. The client posts the code and the original `code_verifier` to the token endpoint and receives an access token (plus refresh token, and an ID token with OpenID Connect).",
        "5. The client calls the API with the bearer access token.",
        "",
        "**What PKCE prevents**: an attacker who intercepts the code cannot redeem it without the verifier. It is required for public clients (single-page and mobile apps) and recommended for all.",
        "",
        "**OAuth versus OIDC**: OAuth handles delegated authorisation; OpenID Connect adds authentication. Avoid the deprecated implicit flow.",
        "",
        "Validate `state`, match redirect URIs exactly, check token issuer, audience and expiry, request least-privilege scopes, and rotate refresh tokens."
      ),
      follow: ['Why is the implicit flow discouraged?', 'What is the difference between OAuth and OIDC?', 'What is the state parameter for?'],
      tags: ['oauth', 'pkce', 'oidc', 'authentication', 'authorization', 'tokens', 'identity']
    },
    {
      id: 'sec-5', role: 'security', level: 3, topic: 'Secure design',
      q: 'How do you threat-model a new feature?',
      short: "Draw the data flows and trust boundaries, enumerate threats with STRIDE for each element, rank them by likelihood and impact, decide mitigations, and turn accepted ones into tickets and tests.",
      detail: L(
        "**Four questions**: What are we building? What can go wrong? What will we do about it? Did we do a good job?",
        "",
        "#### Steps",
        "1. Draw a data-flow diagram: actors, processes, data stores, flows, and **trust boundaries** (internet to app, app to database, tenant to tenant).",
        "2. Apply **STRIDE** to each element: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege.",
        "3. Rank threats by likelihood and impact.",
        "4. Choose mitigations: design changes beat added controls, which beat monitoring alone. Record assumptions and residual risk.",
        "",
        "#### Example: file upload",
        "Malware upload, path traversal, SSRF through a fetch-by-URL option, oversized files for denial of service, access to other users' files by guessing IDs, content-type sniffing.",
        "",
        "Keep it lightweight and early in design, done with the engineers who know the system, and revisit it when the architecture changes."
      ),
      follow: ['What is a trust boundary?', 'Apply STRIDE to a password reset feature.', 'How do you keep threat models up to date?'],
      tags: ['threat modeling', 'stride', 'secure design', 'risk', 'appsec']
    },
    {
      id: 'sec-6', role: 'security', level: 3, topic: 'Incident response',
      q: 'A cloud access key was committed to a public repository. What do you do?',
      short: "Treat it as compromised: revoke or rotate the credential immediately, check logs for misuse, contain any damage, remove the secret from the repo, then fix the process that let it happen.",
      detail: L(
        "1. **Triage**: what does the credential reach, how long was it public? Bots scan public repositories within minutes.",
        "2. **Contain**: disable or rotate the key first. Deleting the commit is not enough; copies exist in forks, caches and clones.",
        "3. **Investigate**: review audit logs (for example CloudTrail) for use from unknown IPs, new users or roles, unusual resources (crypto-mining instances), and data access. Look for persistence such as new keys or backdoor roles.",
        "4. **Remediate**: revoke sessions, rotate related secrets, delete attacker-created resources.",
        "5. **Clean up**: purge the secret from history with `git filter-repo` or BFG, while assuming it is already exposed.",
        "6. **Communicate**: follow the incident process, and involve legal or compliance if data may be exposed.",
        "7. **Prevent**: secret scanning with push protection, pre-commit hooks, short-lived credentials through IAM roles or OIDC instead of static keys, a secrets manager, least privilege, and billing alerts.",
        "",
        "Finish with a blameless postmortem."
      ),
      follow: ['Why is deleting the commit not enough?', 'How do you detect that the key was misused?', 'How do you avoid long-lived cloud keys in CI?'],
      tags: ['incident response', 'secrets', 'leaked key', 'cloud security', 'git', 'credentials']
    },
    {
      id: 'sec-7', role: 'security', level: 4, topic: 'Program',
      q: 'How would you build an application security program for a 200-engineer company?',
      short: "Embed security in how engineers already work: secure defaults on a paved road, automated checks in CI, threat modelling for risky changes, and security champions in teams. Measure risk reduction and developer friction, not the number of findings.",
      detail: L(
        "**Start with risk**: inventory applications, classify data, identify top threats, and pick a baseline (OWASP SAMM or ASVS).",
        "",
        "#### Pillars",
        "1. **Secure by default**: hardened templates and libraries for authentication, logging and crypto; policy as code.",
        "2. **Pipeline checks**: static analysis, dependency scanning with an SBOM, secret scanning, container and IaC scans, tuned for low false positives and blocking only on high-confidence critical issues.",
        "3. **Design**: threat modelling and security design review for high-risk features, with response-time targets.",
        "4. **Verification**: penetration tests, plus a bug bounty for exposed products.",
        "5. **Runtime**: monitoring, WAF where useful, incident response runbooks.",
        "6. **People**: a champions programme and training based on real bugs.",
        "",
        "#### Governance",
        "Risk-based fix deadlines (for example critical issues within 7 days), an exception process, and regular reporting to leadership.",
        "",
        "#### Metrics",
        "Mean time to remediate, recurring vulnerability classes, percentage of services on the paved road, scan coverage.",
        "",
        "A small central team cannot review everything, so scale through tooling and champions. Align with SOC 2 or ISO 27001 without letting compliance become a checkbox exercise."
      ),
      follow: ['How do you handle noisy scanners?', 'How would you prioritise a backlog of 5,000 vulnerabilities?', 'How do you win developer buy-in?'],
      tags: ['appsec', 'program', 'devsecops', 'leadership', 'shift left', 'champions', 'strategy']
    }
  ]);
})();
