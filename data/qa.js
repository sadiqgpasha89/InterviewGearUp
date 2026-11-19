/* QA / SDET. */
(function () {
  const IGU = window.IGU, L = IGU.L;
  IGU.add([
    {
      id: 'qa-1', role: 'qa', level: 1, topic: 'Testing basics',
      q: 'What is the test pyramid?',
      short: "Write many fast unit tests, fewer integration tests, and very few slow end-to-end UI tests, because lower-level tests are cheaper, faster and point to the failure more precisely.",
      detail: L(
        "- **Unit**: one function or class in isolation, milliseconds each, mocks for collaborators.",
        "- **Integration or service**: components working together with a real database, queue or API, catching wiring and contract mistakes.",
        "- **End-to-end**: a real browser through the whole stack. High confidence for key journeys, but slow, flaky and expensive to maintain.",
        "",
        "The anti-pattern is the **ice-cream cone**: mostly manual or UI tests on top of few unit tests. Some teams prefer a 'testing trophy' with more weight on integration tests.",
        "",
        "Guidance: test behaviour rather than implementation details. When a bug is found by a high-level test, add a lower-level test that would have caught it. Keep a small end-to-end smoke suite for critical journeys such as sign-up and checkout.",
        "",
        "Do not forget non-functional testing: performance, security and accessibility."
      ),
      follow: ['What should you mock and what should you not?', 'What belongs in an end-to-end test?', 'What is contract testing?'],
      tags: ['test pyramid', 'unit test', 'integration', 'e2e', 'testing strategy']
    },
    {
      id: 'qa-2', role: 'qa', level: 1, topic: 'Bug reporting',
      q: 'What is the difference between severity and priority? What makes a good bug report?',
      short: "Severity is how badly a defect harms the system or user; priority is how soon it should be fixed given business needs. A typo in the company name on the homepage can be low severity but high priority.",
      detail: L(
        "#### Examples",
        "- **High severity, high priority**: payment fails for all users.",
        "- **High severity, low priority**: a crash in a rarely used legacy browser with a workaround.",
        "- **Low severity, high priority**: wrong brand name on the homepage before a launch.",
        "- **Low severity, low priority**: small misalignment on a page almost nobody visits.",
        "",
        "QA usually proposes severity; the product owner decides priority.",
        "",
        "#### A good bug report",
        "A specific title, numbered steps to reproduce, expected versus actual result, environment and build, evidence (screenshot, video, logs), how often it happens and who is affected, and any workaround. Reduce it to the smallest reproduction."
      ),
      follow: ['Write a bug report for a login failure.', 'What do you do when a developer says it is not a bug?', 'How do you triage a large bug backlog?'],
      tags: ['severity', 'priority', 'bug report', 'defect', 'triage', 'manual testing']
    },
    {
      id: 'qa-3', role: 'qa', level: 2, topic: 'Automation',
      q: 'Your automated UI tests are flaky. How do you fix that?',
      short: "Flaky tests pass and fail without code changes. Find the cause (timing, shared state, test order, environment, external dependencies), fix the root cause with proper waits and isolation, and quarantine the test meanwhile.",
      detail: L(
        "#### Typical causes",
        "Hard-coded sleeps and async timing, shared or dirty test data, order dependence, real clocks, randomness or third-party services, resource contention in CI, brittle selectors.",
        "",
        "#### Fixes",
        "- Wait for explicit conditions, not fixed sleeps (or use auto-waiting tools such as Playwright).",
        "- Create unique, isolated test data per test and clean it up.",
        "- Fake the clock, seed randomness, stub external services.",
        "- Use stable locators such as `data-testid`.",
        "- Run in containers with fixed resources.",
        "",
        "#### Process",
        "Detect with rerun history, tag flaky tests, **quarantine** them so they do not block the mainline, give each an owner, track the flake rate, and delete tests that are not worth their cost.",
        "",
        "Be careful with blanket automatic retries: they hide real defects. If you use them, report every retry and treat it as a temporary measure."
      ),
      follow: ['Why are fixed sleeps a bad idea?', 'Would you add automatic retries?', 'How do you measure flakiness?']
      ,
      tags: ['flaky', 'automation', 'selenium', 'playwright', 'test stability', 'ci']
    },
    {
      id: 'qa-4', role: 'qa', level: 2, topic: 'Test design',
      q: 'Design test cases for an age field that accepts 18 to 60. How would you test a login page?',
      short: "Equivalence partitioning splits inputs into groups that should behave alike and tests one from each; boundary value analysis adds tests at the edges, where off-by-one bugs live.",
      detail: L(
        "#### Age field (valid 18 to 60)",
        "- Partitions: below 18 (invalid), 18 to 60 (valid), above 60 (invalid), plus empty, text, decimal and negative.",
        "- Boundaries: 17, 18, 19, 59, 60, 61.",
        "",
        "#### Other techniques",
        "Decision tables for combinations of rules, state-transition testing (for example, account locks after 3 failed logins), pairwise testing for configuration combinations, error guessing, and exploratory sessions.",
        "",
        "#### Login page",
        "- **Functional**: valid and invalid credentials, lockout, password reset, remember me.",
        "- **Validation**: empty fields, length limits, whitespace, case sensitivity.",
        "- **Security**: SQL injection, brute-force throttling, session handling, HTTPS only, no credentials in URLs or logs.",
        "- **Usability and accessibility**: keyboard navigation, screen reader labels, error messages.",
        "- **Performance and compatibility**: concurrent logins, browsers and devices.",
        "",
        "Prioritise by risk: security and core flows first."
      ),
      follow: ['Design test cases for an ATM withdrawal.', 'What is pairwise testing?', 'Give an example of state-transition testing.'],
      tags: ['test design', 'boundary value', 'equivalence partitioning', 'login', 'test cases', 'manual testing']
    },
    {
      id: 'qa-5', role: 'qa', level: 3, topic: 'Test strategy',
      q: 'What is your test strategy for a payments microservice?',
      short: "Layer tests around risk: unit tests for money logic, consumer-driven contract tests, integration tests against a provider sandbox, a few end-to-end flows, plus idempotency, fault injection and reconciliation checks.",
      detail: L(
        "**Risks**: double charges, lost payments, wrong amounts or rounding, inconsistent state, fraud, card data exposure.",
        "",
        "#### Layers",
        "- **Unit**: decimal arithmetic, rounding and currency, state-machine transitions.",
        "- **Contract tests** (for example Pact) so API changes do not break consumers.",
        "- **Integration** with the provider sandbox: declines, 3-D Secure, timeouts, and webhooks that arrive late, duplicated or out of order.",
        "- **Idempotency**: the same request retried must not create a second charge.",
        "- **Fault injection**: a timeout after the charge succeeded.",
        "- **Data checks**: ledger balances, reconciliation with provider reports.",
        "- **Security**: no card data in logs, authorisation on every endpoint.",
        "- **Performance** at peak load.",
        "",
        "#### In production",
        "Synthetic transactions, canary releases, feature flags and fast rollback, with monitoring of payment success rate.",
        "",
        "Use deterministic test cards and isolated test accounts."
      ),
      follow: ['How do you test webhooks?', 'What is consumer-driven contract testing?', 'How do you test safely in production?'],
      tags: ['payments', 'test strategy', 'contract testing', 'microservices', 'idempotency', 'fintech']
    },
    {
      id: 'qa-6', role: 'qa', level: 4, topic: 'Quality leadership',
      q: 'Your team ships weekly but quality is inconsistent. What quality strategy would you build?',
      short: "Make quality the whole team's job by shifting testing left: engineers own automated tests in the pipeline, QA coaches on risk and exploratory testing, and you measure outcomes (escaped defects, lead time, change failure rate), not test counts.",
      detail: L(
        "**Diagnose first**: where do defects escape, which tests are trusted, what is slow?",
        "",
        "#### Strategy",
        "1. **Risk-based testing** per service: define what must never break.",
        "2. **Enforce the pyramid in CI** with a fast gate (under 10 minutes), a flake budget, and coverage on changed code as a signal rather than a target.",
        "3. **Roles**: developers write unit and integration tests; QA engineers build tooling, design tests for risk, run exploratory testing and own release confidence.",
        "4. **Testability**: on-demand environments, test data tooling, feature flags, production observability.",
        "5. **Progressive delivery**: trunk-based development, canary releases, automated rollback, post-release monitoring.",
        "6. **Metrics**: the four DORA measures, escaped defects by severity, time to detect, flake rate, pipeline duration, customer-reported bugs.",
        "7. **Culture**: blameless defect reviews that feed the gaps back into tests.",
        "",
        "Roll it out by piloting with one team, showing the data, and iterating. Avoid chasing 100% coverage."
      ),
      follow: ['Is 100% code coverage a good goal?', 'How do you persuade developers to own testing?', 'Which metrics would you report to leadership?'],
      tags: ['quality', 'strategy', 'shift left', 'dora', 'leadership', 'automation']
    }
  ]);
})();
