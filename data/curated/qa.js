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
    }),
    Object.assign(meta('medium'), {
      id: "qa-10",
      short: "A decision table lists every combination of conditions (columns are rules) and the action each one triggers. It turns tangled business rules into a checkable grid: each rule becomes at least one test, and gaps, contradictions and impossible combinations in the requirements show up as you fill it in.",
      detail: L(
        "#### Example: discount rules",
        "Conditions: is a member? has coupon? order over 100? Actions: discount, free shipping.",
        "",
        "| | R1 | R2 | R3 | R4 | R5 |",
        "|---|---|---|---|---|---|",
        "| Member | Y | Y | Y | N | N |",
        "| Coupon | Y | N | N | Y | N |",
        "| Order over 100 | - | Y | N | - | - |",
        "| **10% discount** | Y | Y | N | Y | N |",
        "| **Free shipping** | Y | Y | N | N | N |",
        "",
        "A dash means the condition does not affect the outcome (a 'don't care'), which collapses several combinations into one rule.",
        "",
        "#### How to build one",
        "1. List all conditions and the possible actions.",
        "2. Enumerate combinations: n true/false conditions give 2^n columns before you merge them.",
        "3. Fill in the expected action for each, and merge rules that behave the same.",
        "4. Mark rules that are impossible or undefined and **ask the product owner**. Many requirement bugs are found right here.",
        "5. Write at least one test per rule.",
        "",
        "#### Strengths and limits",
        "- Catches missing, overlapping and contradictory rules early, and gives a clear traceable list of tests.",
        "- Grows quickly with many conditions. Then split the logic into smaller tables, use pairwise testing, or draw a cause-effect graph.",
        "- Combine with boundary value analysis for numeric conditions (is 100 over 100?), and with equivalence classes to limit the input values per condition."
      ),
      follow: ["What do you do when the table has too many conditions to enumerate?", "How do you discover rules that the requirements never mentioned?", "How does a decision table relate to boundary value analysis?"],
      tags: ["decision table", "test design", "business rules", "black-box testing", "requirements"]
    }),
    Object.assign(meta('medium'), {
      id: "qa-11",
      short: "State transition testing models the system as states, events and the transitions between them, then designs tests that cover transitions and sequences, including events that must be rejected in a given state. It suits lifecycles such as orders, accounts and workflows.",
      detail: L(
        "#### Model first",
        "Draw the states and the events that move between them, with any **guard conditions** and actions. An order might be: Created, Paid, Shipped, Delivered, Cancelled, Refunded.",
        "",
        "| State | Pay | Ship | Cancel | Deliver |",
        "|---|---|---|---|---|",
        "| Created | Paid | invalid | Cancelled | invalid |",
        "| Paid | invalid | Shipped | Cancelled | invalid |",
        "| Shipped | invalid | invalid | invalid | Delivered |",
        "",
        "#### Coverage levels",
        "- **All states**: every state is visited at least once.",
        "- **All transitions** (0-switch): every valid transition is exercised.",
        "- **N-switch**: sequences of N+1 transitions in a row, which finds bugs that depend on history (pay, cancel, then pay again).",
        "- **Invalid transitions**: the empty cells of the table. Check that the system rejects them with a clear error and **leaves the state unchanged**.",
        "",
        "#### What to check after each step",
        "The new state in the UI, the database and any emitted events, plus side effects such as stock changes, emails and refunds.",
        "",
        "#### Account lifecycle example",
        "Active moves to Locked after 5 failed logins, Locked returns to Active by reset, and Active moves to Suspended by an admin. Test the fifth failure versus the fourth, a login attempt while locked, and a password reset on a suspended account.",
        "",
        "#### Extra cases",
        "Repeated or duplicate events (idempotency: paying twice), concurrent events (cancel while shipping), and timeouts that cause automatic transitions."
      ),
      follow: ["What is the difference between 0-switch and 1-switch coverage?", "How would you test concurrent events, such as cancelling an order at the moment it ships?", "Why test invalid transitions as well as valid ones?"],
      tags: ["state transition", "test design", "lifecycle", "black-box testing", "model-based testing"]
    }),
    Object.assign(meta('medium'), {
      id: "qa-13",
      short: "Exploratory testing combines learning, test design and execution at the same time, guided by a goal rather than a script. Session-based test management keeps it structured: time-boxed sessions (60 to 120 minutes), each with a charter stating the mission, notes taken during the session, and a short debrief afterwards.",
      detail: L(
        "#### Charters",
        "A charter is a one-sentence mission, not a list of steps:",
        "`Explore <area> with <resources, data, tools> to discover <information or risk>`",
        "Example: \"Explore checkout with expired, international and declined cards to discover gaps in error handling.\" Keep it narrow enough to finish in one session.",
        "",
        "#### Running a session",
        "- Time-box it (often 60 to 120 minutes), without interruptions.",
        "- Take notes as you go: what you tried, what you saw, bugs, questions, ideas for later, and what you did **not** cover.",
        "- Track the split between testing, bug investigation and setup, to see where time is lost.",
        "- Use heuristics to generate ideas: SFDIPOT (Structure, Function, Data, Interfaces, Platform, Operations, Time), tours (such as the money tour or the back-alley tour), boundaries, CRUD, interruptions and slow networks.",
        "",
        "#### Debrief",
        "Spend 10 to 15 minutes with a lead or a peer to review the notes and bugs, agree follow-up charters and decide what to automate. A common prompt is PROOF: Past, Results, Obstacles, Outlook, Feelings.",
        "",
        "#### Doing it as a team",
        "- Split the product into charters and assign them, then rotate areas so fresh eyes find new problems.",
        "- Pair or mob for tricky areas, and invite developers, designers and support staff to run a session.",
        "- Run sessions on new features, high-risk areas and before releases.",
        "- Convert useful findings into automated regression tests. Exploratory testing finds what scripts did not anticipate, and automation protects against recurrence."
      ),
      follow: ["How do you report exploratory testing progress to a manager who wants numbers?", "How does exploratory testing differ from ad hoc testing?", "Which heuristics would you use to explore a file upload feature?"],
      tags: ["exploratory testing", "session-based testing", "test charter", "heuristics", "manual testing"]
    }),
    Object.assign(meta('hard'), {
      id: "qa-24",
      short: "Playwright waits automatically before each action: it checks that the element is attached, visible, stable, enabled and not covered, and retries until a timeout. Web-first assertions retry too, and route() lets tests mock or block network calls. Together these remove most fixed sleeps, the usual cause of timing flakiness.",
      detail: L(
        "#### Auto-waiting",
        "Locators are lazy: each action finds the element again and runs **actionability checks** first. For a click that means attached to the DOM, visible, **stable** (not moving between animation frames), able to receive events (not hidden behind an overlay) and enabled. If checks fail, Playwright retries until the timeout, then fails with a useful log.",
        "",
        "```ts",
        "await page.getByRole('button', { name: 'Pay' }).click();     // waits until clickable",
        "await expect(page.getByText('Payment received')).toBeVisible();  // retries until true or timeout",
        "```",
        "",
        "Web-first assertions (`expect(locator)...`) poll until the condition holds. Avoid reading a value once and asserting on it, which reintroduces a race.",
        "",
        "#### Network control",
        "```ts",
        "await page.route('**/api/orders', (route) =>",
        "  route.fulfill({ json: [{ id: 1, status: 'paid' }] }));      // deterministic backend",
        "```",
        "`route` can fulfil, modify, abort or continue requests, so you can simulate errors and slow responses. `page.waitForResponse` waits for a specific call, and HAR replay records and replays traffic.",
        "",
        "#### Architecture points",
        "Each test gets an isolated **browser context** (cookies, storage), which is cheap to create and keeps tests independent. Playwright talks to the browser out of process through a control protocol.",
        "",
        "#### Limits",
        "Auto-waiting does not fix shared test data, unawaited backend work or animation your app controls. Avoid `waitForTimeout`, use `expect.poll` for non-UI conditions, and use the trace viewer to debug the remaining failures."
      ),
      follow: ["What does the stable check in actionability mean and why does it matter?", "How would you make a test deterministic when it depends on a slow third-party API?", "When is waitForTimeout acceptable, if ever?"],
      tags: ["playwright", "auto-waiting", "flaky tests", "network mocking", "e2e testing"]
    }),
    Object.assign(meta('hard'), {
      id: "qa-28",
      short: "Consumer-driven contract testing lets each consumer record the requests it makes and the response fields it needs. With Pact, those expectations become a pact file, which the provider replays against its real implementation in its own CI. It catches breaking API changes without running both services together.",
      detail: L(
        "#### The flow",
        "1. **Consumer test**: the consumer's code is run against a Pact mock provider. The interactions it exercises (request, expected response shape) are written to a **pact file**.",
        "2. **Publish** the pact to a Pact Broker (or PactFlow), tagged with the consumer version and branch.",
        "3. **Provider verification**: the provider's CI fetches the pacts, replays each request against the real service, and checks the responses satisfy the expectations. **Provider states** ('a user with id 7 exists') set up the data first.",
        "4. **can-i-deploy**: before releasing either side, ask the broker whether this version is compatible with what is deployed in the target environment.",
        "",
        "#### Why it is useful",
        "- The contract contains only what consumers really use, so the provider is free to change or remove everything else.",
        "- Failures point to the exact consumer and interaction that would break.",
        "- Tests are fast and need no shared environment, so they scale across many microservices.",
        "",
        "#### Good practice",
        "- Use **matchers** (type, regex) rather than exact values so the contract does not break on harmless data changes.",
        "- Keep contracts minimal. Over-specifying makes them brittle.",
        "- Message pacts cover asynchronous events (Kafka, queues) as well as HTTP.",
        "",
        "#### Limits",
        "Contract tests check compatibility of requests and responses, not business correctness, performance or end-to-end journeys, so you still need some integration and functional tests. It works best when teams agree to maintain the broker and provider states. Provider-driven approaches, such as OpenAPI schema validation, are an alternative or a complement."
      ),
      follow: ["What are provider states and why are they needed?", "How does can-i-deploy prevent a breaking release?", "How do contract tests differ from end-to-end tests?"],
      tags: ["contract testing", "pact", "microservices", "api testing", "consumer-driven"]
    }),
    Object.assign(meta('medium'), {
      id: "qa-39",
      short: "Flaky tests come from timing and race conditions, shared or leftover state, non-deterministic data such as time or randomness, unstable external services, and resource contention in CI. Fix the root cause first; quarantine a flaky test with an owner and deadline; treat automatic retries as a diagnostic aid, not a cure.",
      detail: L(
        "#### Common root causes",
        "- **Timing**: fixed sleeps, assertions that run before the UI or backend has settled, race between test and app.",
        "- **Shared state and test order**: tests that depend on data left by others, global singletons, or a database that is not reset.",
        "- **Non-determinism**: real clocks and timezones, random values, unordered collections, floating-point comparisons.",
        "- **External dependencies**: third-party APIs, email or network calls that fail or slow down.",
        "- **Environment**: CPU or memory pressure in shared CI runners, parallel tests colliding on ports or files.",
        "- **Brittle selectors** and animation in UI tests.",
        "",
        "#### Strategies",
        "1. **Reproduce** by running the test many times, in a loop, under load or in the same order as CI.",
        "2. **Fix the cause**: wait for conditions instead of time, isolate data per test (unique ids, transactions, containers), inject fake clocks and seeded random numbers, replace external services with mocks or virtual services.",
        "3. **Quarantine**: move a known-flaky test out of the blocking path, **track it with an owner and a deadline**, and restore or delete it. Quarantine without follow-up becomes a graveyard.",
        "4. **Retries**: a limited retry (one or two) keeps pipelines moving, but record every retried pass as a flake. Unbounded retries hide real, intermittent product bugs.",
        "5. **Measure**: track flake rate per test and per suite and make it visible, so the team sees the cost.",
        "",
        "Remember that some flakes are real bugs, such as race conditions in the application, so investigate before assuming it is the test."
      ),
      follow: ["How would you measure and report the flake rate of a large suite?", "When is it better to delete a flaky test than to fix it?", "How do you tell a flaky test from a real intermittent bug?"],
      tags: ["flaky tests", "test reliability", "ci", "quarantine", "test automation"]
    }),
    Object.assign(meta('hard'), {
      id: "qa-42",
      short: "Mutation testing makes small deliberate changes to the code, such as flipping > to >= or deleting a call, and reruns the tests. A mutant that makes a test fail is killed, one that survives shows an assertion gap. The mutation score measures whether tests detect bugs, which line coverage cannot.",
      detail: L(
        "#### How it works",
        "A tool (Stryker for JavaScript, TypeScript and C#, Pitest for Java, mutmut for Python) generates **mutants**: it changes `>` to `>=`, `+` to `-`, negates a condition, removes a statement or returns a constant. It runs the suite against each mutant.",
        "- **Killed**: at least one test fails, so the tests noticed the change.",
        "- **Survived**: all tests pass, so the change was not detected. That points to a missing or weak assertion.",
        "- **Mutation score** = killed / (total mutants minus ignored or equivalent ones).",
        "",
        "```js",
        "function isAdult(age) { return age >= 18; }",
        "// mutant: age > 18  -> survives unless a test uses exactly 18",
        "```",
        "",
        "#### Why not just coverage?",
        "Coverage tells you which lines ran, not whether any assertion would notice if they were wrong. A test that calls a function without asserting anything gives 100% line coverage and a very low mutation score.",
        "",
        "#### Costs and mitigations",
        "- It runs the suite hundreds or thousands of times, so it is slow. Run it **incrementally on changed files**, on critical modules, or nightly, and use per-mutant test selection (only tests that cover the mutated line).",
        "- **Equivalent mutants** change code without changing behaviour, so they cannot be killed and add noise. Review survivors manually and ignore known equivalents.",
        "- Mutants that cause infinite loops are handled with timeouts.",
        "",
        "#### Using the result",
        "Treat survivors as a to-do list for better assertions and boundary tests, not as a goal of reaching 100%. Track the trend on important code."
      ),
      follow: ["What is an equivalent mutant and why is it a problem?", "How would you introduce mutation testing in a large CI pipeline without slowing it down?", "Why can a suite have 100% coverage and a low mutation score?"],
      tags: ["mutation testing", "test quality", "stryker", "pitest", "coverage"]
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
