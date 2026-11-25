/* QA / SDET: curated answers. AI-drafted, not yet reviewed by a person (see CONTRIBUTING.md). */
(function () {
  const IGU = window.IGU, L = IGU.L;
  const meta = function (difficulty) { return { difficulty: difficulty, reviewStatus: 'ai-drafted', contentVersion: 1 }; };

  IGU.revise([
    Object.assign(meta('easy'), {
      id: "qa-9",
      short: "Equivalence partitioning splits possible inputs into classes that the system should treat the same way and tests one value per class. Boundary value analysis adds tests at the edges of each class, where off-by-one bugs live. For a quantity field accepting 1 to 100, try 0, 1, 2, 99, 100 and 101 plus one typical value.",
      detail: L(
        "#### Example: a quantity field that accepts whole numbers from 1 to 100",
        "**Equivalence classes**: invalid low (0 or less), valid (1 to 100), invalid high (101 or more), plus non-numeric input and empty input. One representative per class, such as −5, 50, 150, 'abc' and an empty value, is enough in theory, because any member of a class should behave alike.",
        "",
        "**Boundary values**: the minimum and maximum, and the values just outside and inside each: 0, 1, 2, 99, 100, 101.",
        "",
        "#### Why it works",
        "Developers often write `<` where `<=` was meant, so defects cluster at the boundaries. Together the two techniques give good coverage from a small number of test cases.",
        "",
        "#### Going further",
        "- Consider data type limits (255, 32767, 2,147,483,647), decimal and negative values, leading zeros and whitespace.",
        "- Apply the techniques to outputs and to multi-field rules such as date ranges (start must not be after end), and combine them with decision tables when several conditions interact.",
        "- Automate the boundary cases as parameterized tests so they run on every build."
      ),
      follow: ["How would you test a field that accepts 1 to 100 but only even numbers?", "What other techniques complement boundary value analysis, such as decision tables?"],
      tags: ["boundary value analysis", "equivalence partitioning", "test design", "black-box"]
    }),
    Object.assign(meta('easy'), {
      id: "qa-12",
      short: "Smoke testing is a fast check that the build works at all (it starts, you can log in, the main page loads) and decides whether deeper testing is worthwhile. Sanity testing is a narrow check that a specific change or fix works. Regression testing re-runs a broad suite to confirm that existing behaviour was not broken.",
      detail: L(
        "- **Smoke** (build verification): a handful of critical-path checks, a few minutes long, run on every build or deployment, including after deploying to production. If it fails, stop and reject the build.",
        "- **Sanity**: focused, shallow checks on the area that just changed, for example after a bug fix, to see that the fix works and nothing obvious nearby broke. Often unscripted.",
        "- **Regression**: a broad, usually automated suite covering existing features. It is slower, so teams run it nightly or before a release, and pick subsets by risk or by changed code for pull requests.",
        "",
        "#### How they fit together",
        "Build, then **smoke**, then (a change verified with **sanity**), then **regression**, then release. Terminology varies between companies, so confirm the definitions with your team.",
        "",
        "**Good practice**: keep the smoke suite tiny and reliable (a flaky smoke test blocks everyone), tag tests so suites can be composed, and add a regression test for every defect that escaped."
      ),
      follow: ["How would you decide which tests belong in the smoke suite?", "How do you keep a regression suite from growing too slow?"],
      tags: ["smoke testing", "sanity testing", "regression", "test strategy"]
    }),
    Object.assign(meta('easy'), {
      id: "qa-15",
      short: "A defect typically moves New, Assigned, In Progress, Fixed, Ready for Retest, Verified and Closed. It can be rejected as invalid, marked duplicate or deferred, and it is reopened if the retest fails. The aim is that every defect has a clear owner and status and that fixes are verified, not just claimed.",
      detail: L(
        "1. **New**: logged with steps to reproduce, expected and actual results, environment, evidence (logs, screenshots) and severity.",
        "2. **Triage**: the team checks that it is reproducible and not a duplicate, and sets the priority. Outcomes include *Rejected* (works as designed or not reproducible), *Duplicate* or *Deferred* to a later release.",
        "3. **Assigned and In progress**: a developer owns it and fixes the root cause.",
        "4. **Fixed and Ready for retest**: the change is merged and deployed to a test environment.",
        "5. **Retest and verify**: QA re-runs the original steps and nearby regression checks. If they pass the defect is *Verified* and *Closed*; if not it is *Reopened* with new evidence.",
        "",
        "#### Good practice",
        "- Keep **severity** (impact) separate from **priority** (urgency).",
        "- Track metrics such as time to fix, reopen rate and escaped defects (found in production) to improve the process.",
        "- Add an automated regression test for each fix.",
        "- Run a short root-cause review for serious defects, aimed at preventing the class of problem rather than blaming a person."
      ),
      follow: ["What would you do if a developer rejects a bug as working as designed?", "How do you decide that a defect can be deferred?"],
      tags: ["defect lifecycle", "bug tracking", "triage", "qa process"]
    })
  ]);

  IGU.add([
    Object.assign(meta('hard'), {
      id: "qa-101", role: "qa", level: 4, topic: "Reliability",
      q: "How do you measure and reduce test flakiness across an organization with hundreds of pipelines?",
      short: "Treat flakiness as a measured reliability problem: record every test's pass and fail history, compute a flake rate (a test that both passes and fails on the same commit), quarantine offenders with an owner and a deadline, and fix root causes such as shared state, timing and unstable environments. Make the signal trustworthy before adding more tests.",
      detail: L(
        "#### Measure",
        "- Detect flakes by **retrying a failed test on the same commit**; if it passes on retry, record a flake. Aggregate per test, per suite and per team: flake rate, retries consumed and developer time lost.",
        "- Track pipeline-level impact: the share of builds that fail for non-code reasons, and time to green.",
        "",
        "#### Respond",
        "- **Quarantine** flaky tests quickly (still run, but non-blocking) and file an owned ticket with a deadline. Delete tests that nobody will fix. Never leave them silently ignored.",
        "- Fix the usual causes: shared mutable state and test-order dependence, fixed sleeps instead of explicit waits, real clocks and randomness, network or third-party calls (use fakes), resource limits in CI, and uncleaned test data.",
        "- Make tests hermetic and run them in random order to expose hidden dependencies.",
        "",
        "#### Prevent",
        "Set flaky-test budgets per team, require new tests to pass a repeated-run check (for example 50 runs) before merging, and give clear guidance on the testing pyramid so fewer slow end-to-end tests exist.",
        "",
        "#### Organizational angle",
        "Publish a dashboard, set a target (for example under 1% of builds failing because of flakes) and give teams time to pay it down. Blindly retrying everything hides the problem rather than solving it."
      ),
      follow: ["Is automatically retrying failed tests a good policy?", "How would you decide whether to delete or fix a flaky end-to-end test?"],
      tags: ["flaky tests", "test reliability", "ci", "quarantine", "metrics"]
    }),
    Object.assign(meta('hard'), {
      id: "qa-102", role: "qa", level: 4, topic: "Strategy",
      q: "How do contract testing and testing in production complement end-to-end tests in a microservices architecture?",
      short: "End-to-end tests across many services are slow, flaky and hard to debug, so use them sparingly. Consumer-driven contract tests verify each pair of services independently against a shared contract; testing in production (canaries, feature flags, synthetic checks, observability) covers what pre-production cannot reproduce. Together they give fast feedback and real-world confidence.",
      detail: L(
        "#### Contract testing (for example Pact)",
        "The consumer records the requests it makes and the responses it relies on as a contract. The provider's pipeline replays that contract against its real implementation. A breaking change fails the provider's build before release, with no shared test environment. It checks the *shape and rules* of the interface, not whole business flows.",
        "",
        "#### Testing in production",
        "Pre-production never matches real data, traffic and dependencies. Safe techniques are:",
        "- **Canary and progressive rollouts** with automatic rollback when SLOs regress.",
        "- **Feature flags** to expose changes to a small cohort first.",
        "- **Synthetic monitoring**: scripted user journeys run against production.",
        "- **Observability** (metrics, traces, logs) so problems are detected and diagnosed quickly, plus chaos experiments where the team is mature.",
        "",
        "#### How to combine them",
        "Many unit tests, component tests per service using fakes, contract tests at the service boundaries, a *small* set of end-to-end journeys for the critical paths, and production monitoring. Guard rails matter: tag test traffic, avoid touching real customer data, and keep a fast rollback path."
      ),
      follow: ["What does a contract test not cover?", "How would you keep synthetic tests from polluting production data?"],
      tags: ["contract testing", "pact", "microservices", "testing in production", "strategy"]
    })
  ]);
})();
