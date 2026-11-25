/* Security engineering: curated answers. AI-drafted, not yet reviewed by a person (see CONTRIBUTING.md). */
(function () {
  const IGU = window.IGU, L = IGU.L;
  const meta = function (difficulty) { return { difficulty: difficulty, reviewStatus: 'ai-drafted', contentVersion: 1 }; };

  IGU.revise([
    Object.assign(meta('easy'), {
      id: "sec-8",
      short: "The OWASP Top 10 is a periodically updated ranking of the most critical web application security risks, built from real vulnerability data. In the 2021 edition the top item is broken access control, followed by cryptographic failures and injection. Use it as an awareness baseline and check owasp.org for the current edition.",
      detail: L(
        "#### 2021 edition (check owasp.org for the latest)",
        "- **A01 Broken access control**: users acting outside their permissions, such as changing an ID in a URL to see someone else's data.",
        "- **A02 Cryptographic failures**: weak or missing encryption, plaintext secrets, poor hashing.",
        "- **A03 Injection**: SQL, command and XSS-style injection from untrusted input.",
        "- **A04 Insecure design**: missing security thinking at design time, such as no threat model or rate limits.",
        "- **A05 Security misconfiguration**: default credentials, open cloud storage, verbose errors.",
        "- **A06 Vulnerable and outdated components**: unpatched libraries.",
        "- **A07 Identification and authentication failures**: weak passwords, no MFA, session flaws.",
        "- **A08 Software and data integrity failures**: unsigned updates, insecure CI/CD pipelines.",
        "- **A09 Security logging and monitoring failures**: attacks go unnoticed.",
        "- **A10 Server-side request forgery (SSRF)**: the server is tricked into fetching internal URLs.",
        "",
        "#### How to talk about it in an interview",
        "Pick two or three and give the cause and the fix. For example, for broken access control: enforce authorization on the server for every request using the user's identity, deny by default, and test with another user's IDs. Mention that the list is an awareness tool rather than a complete standard; OWASP ASVS is the more detailed verification checklist."
      ),
      follow: ["How would you test an application for broken access control?", "What is the difference between the OWASP Top 10 and ASVS?"],
      tags: ["owasp", "web security", "vulnerabilities", "appsec"]
    }),
    Object.assign(meta('hard'), {
      id: "sec-54",
      short: "Zero trust assumes the network is hostile and never grants access just because a request comes from inside the perimeter. Every request is authenticated, authorized and evaluated against identity, device health and context, with least privilege. Microsegmentation limits lateral movement, and continuous verification re-checks trust during a session instead of only at login.",
      detail: L(
        "#### Core principles (NIST SP 800-207)",
        "- **Verify explicitly**: strong identity for users, devices and workloads (MFA, device posture, mutual TLS) on every request.",
        "- **Least privilege**: just-enough, just-in-time access to specific resources, not to a whole network.",
        "- **Assume breach**: design so that one compromised host or credential cannot reach everything, and log everything for detection.",
        "",
        "#### Building blocks",
        "- **Policy decision and enforcement points**: a central engine decides, and proxies and gateways enforce.",
        "- **Microsegmentation**: network policies and service identity (for example SPIFFE IDs or a service mesh) restrict which workloads may talk to which, shrinking the blast radius.",
        "- **Continuous verification**: risk signals such as a new location, a compromised device or impossible travel can trigger step-up authentication or revoke access mid-session.",
        "- **Identity-aware access** to applications (ZTNA) replaces broad VPN access.",
        "",
        "#### Making it real",
        "It is a program, not a product: inventory assets and data flows, protect the most sensitive systems first, adopt strong identity and device management, then segment and monitor. Expect pushback from legacy systems that assume a trusted network, and measure user friction so that security does not push people towards workarounds."
      ),
      follow: ["How does microsegmentation differ from a traditional network firewall?", "Where would you start a zero trust program in a company with a flat internal network?"],
      tags: ["zero trust", "microsegmentation", "network security", "identity", "architecture"]
    }),
    Object.assign(meta('hard'), {
      id: "sec-77",
      short: "SLSA (Supply-chain Levels for Software Artifacts) is a framework of increasing build-integrity guarantees, such as a scripted build, a hosted build platform and signed provenance showing how and from what source an artifact was produced. An SBOM is an inventory of the components inside software. SLSA shows how it was built; an SBOM shows what is in it.",
      detail: L(
        "#### SLSA",
        "The build track defines levels that raise the cost of tampering: from documented, scripted builds, through a hosted build service that generates signed **provenance** (which source, which builder, which parameters), to hardened, isolated builds where the provenance cannot be forged by the project's own users. Consumers verify provenance before deploying, so a compromised developer laptop or a swapped artifact is detected.",
        "",
        "#### SBOM",
        "A machine-readable list of components and versions, in formats such as SPDX or CycloneDX. It lets you answer 'are we affected?' within minutes when a vulnerability like Log4Shell appears, and supports license and compliance checks. Pair it with vulnerability data, and with VEX statements that say which CVEs are actually exploitable.",
        "",
        "#### Putting it together",
        "- Generate an SBOM in CI for each release, store it with the artifact and monitor it against vulnerability feeds.",
        "- Build on a hosted, ephemeral runner, sign artifacts (Sigstore and cosign), and verify signatures and provenance at deploy time with admission policies.",
        "- Pin and review dependencies, use a private registry or proxy, and require code review and protected branches.",
        "",
        "Limit: an SBOM can be incomplete or out of date, and provenance proves the process, not that the code is free of vulnerabilities."
      ),
      follow: ["What does signed provenance protect against that an SBOM does not?", "How would you enforce signature verification in a Kubernetes cluster?"],
      tags: ["slsa", "sbom", "supply chain", "sigstore", "provenance"]
    })
  ]);

  IGU.add([
    Object.assign(meta('easy'), {
      id: "sec-102", role: "security", level: 1, topic: "Fundamentals",
      q: "What is the principle of least privilege and how do you apply it?",
      short: "Least privilege means giving every user, service and process only the access it needs to do its job, for only as long as it needs it. It limits the damage from mistakes and compromised credentials. Apply it with role-based access, narrow service permissions, short-lived credentials and regular access reviews.",
      detail: L(
        "**Why**: if an attacker steals a credential or exploits a bug, the blast radius equals what that identity could do. A read-only reporting job that cannot delete anything cannot be used to delete anything.",
        "",
        "#### Examples",
        "- **Cloud IAM**: a function that reads one S3 bucket gets `s3:GetObject` on that bucket, not `s3:*` on every resource.",
        "- **Databases**: the application connects as a user with `SELECT`, `INSERT` and `UPDATE` on its own tables, not as the owner or a superuser; migrations use a separate account.",
        "- **Operating systems and containers**: run as a non-root user, drop Linux capabilities and mount file systems read-only.",
        "- **People**: grant admin access just in time, with approval and expiry, instead of permanently.",
        "",
        "#### Practical approach",
        "1. Start from deny and add specific permissions.",
        "2. Use roles and groups rather than individual grants.",
        "3. Prefer short-lived, automatically rotated credentials to long-lived keys.",
        "4. Review and remove unused permissions (access analyzers show which were never used).",
        "5. Log privileged actions.",
        "",
        "**Trade-off**: overly tight permissions cause outages and slow developers down, so provide a quick, audited way to request more access."
      ),
      follow: ["How would you find which permissions a service account actually uses?", "What is just-in-time access?"],
      tags: ["least privilege", "iam", "access control", "security principles"]
    }),
    Object.assign(meta('medium'), {
      id: "sec-103", role: "security", level: 1, topic: "Authentication",
      q: "How should an application store user passwords?",
      short: "Never store passwords in plaintext or with fast hashes like MD5 or SHA-256. Store the output of a slow, salted password-hashing function such as Argon2id, bcrypt or scrypt, with a unique random salt per password, and check passwords with the library's verify function. Also support multi-factor authentication and rate limiting.",
      detail: L(
        "**Why a slow hash**: if the database leaks, attackers can try billions of guesses per second against fast hashes using GPUs. Password-hashing functions are deliberately expensive in time (and, for Argon2 and scrypt, memory), so each guess costs real resources.",
        "",
        "- **Salt**: a unique random value per user stops precomputed (rainbow table) attacks and hides the fact that two users share a password. Libraries generate the salt and store it inside the hash string.",
        "- **Work factor**: tune it so that a hash takes a noticeable fraction of a second on your servers (roughly 100 to 500 ms) and revisit it as hardware improves. Store the parameters so you can rehash on the next login.",
        "- **Pepper (optional)**: a secret key stored outside the database, for example in a KMS or HSM, mixed into the hash so that a database-only leak is not enough.",
        "- Use the library's `verify` function, which compares in constant time.",
        "",
        "#### Around the hash",
        "- Enforce a sensible minimum length and check new passwords against breached-password lists; avoid arbitrary complexity rules.",
        "- Rate-limit and monitor login attempts, offer MFA or passkeys, and return generic error messages.",
        "- Better still, delegate authentication to an identity provider."
      ),
      follow: ["Why is SHA-256 a poor choice for passwords even with a salt?", "How would you migrate users from an old hashing scheme to Argon2?"],
      tags: ["passwords", "hashing", "argon2", "bcrypt", "authentication"]
    })
  ]);
})();
