/* Frontend engineer. */
(function () {
  const IGU = window.IGU, L = IGU.L;
  IGU.add([
    {
      id: 'fe-1', role: 'frontend', level: 1, topic: 'JavaScript',
      q: 'What is a closure in JavaScript?',
      short: "A closure is a function bundled with references to the variables from the scope where it was created, so it can keep using them after the outer function has returned.",
      detail: L(
        "```js",
        "function makeCounter() {",
        "  let count = 0;",
        "  return () => ++count;   // remembers `count`",
        "}",
        "const next = makeCounter();",
        "next(); // 1",
        "next(); // 2",
        "```",
        "",
        "`count` cannot be reached from outside, yet the inner function keeps it alive. That gives you private state without classes.",
        "",
        "**Uses**: private variables, function factories, event handlers and callbacks, memoisation, partial application.",
        "",
        "**Classic bug**: `for (var i = 0; i < 3; i++) setTimeout(() => console.log(i))` prints 3, 3, 3 because `var` is function-scoped, so every callback shares one `i`. With `let`, each iteration gets its own binding and it prints 0, 1, 2.",
        "",
        "**Memory**: a closure keeps captured variables alive, so a long-lived handler that captures a large object can leak memory."
      ),
      follow: ['Why does the var loop print 3, 3, 3?', 'How would you implement a once() helper?', 'Can closures cause memory leaks?'],
      tags: ['closure', 'scope', 'javascript', 'lexical']
    },
    {
      id: 'fe-2', role: 'frontend', level: 1, topic: 'CSS',
      q: 'Explain the CSS box model, and when to use Flexbox versus Grid.',
      short: "Every element is content plus padding, border and margin. Use Flexbox to lay items out along one axis, and Grid to lay them out in rows and columns at the same time.",
      detail: L(
        "#### Box model",
        "By default (`box-sizing: content-box`) `width` covers only the content, so padding and border make the element larger. Most projects set `box-sizing: border-box` so `width` includes padding and border. Vertical margins between siblings can collapse into one.",
        "",
        "#### Flexbox",
        "One-dimensional and content-driven: navbars, toolbars, a row of buttons, centring one item. Key properties: `justify-content` (main axis), `align-items` (cross axis), `gap`, and `flex` for growth and shrink.",
        "",
        "#### Grid",
        "Two-dimensional and layout-driven: page layouts, card galleries, dashboards. For a responsive gallery with no media queries:",
        "",
        "```css",
        ".cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }",
        "```",
        "",
        "They combine well: Grid for the page structure, Flexbox inside components. To centre anything: `display: grid; place-items: center;`."
      ),
      follow: ['How does margin collapsing work?', 'What does flex: 1 mean?', 'How would you build a responsive layout without media queries?'],
      tags: ['css', 'box model', 'flexbox', 'grid', 'layout']
    },
    {
      id: 'fe-3', role: 'frontend', level: 2, topic: 'JavaScript',
      q: 'Explain the JavaScript event loop. What is the output order of a script mixing setTimeout and Promises?',
      short: "JavaScript runs one task at a time. After each task it drains the microtask queue (promise callbacks) before taking the next macrotask (timers, I/O, UI events), so a resolved promise's callback runs before a setTimeout of 0.",
      detail: L(
        "```js",
        "console.log('A');",
        "setTimeout(() => console.log('B'), 0);",
        "Promise.resolve().then(() => console.log('C'));",
        "console.log('D');",
        "// A D C B",
        "```",
        "",
        "Synchronous code runs first (A, D). Then the microtask queue is drained (C). Then the timer callback, a macrotask, runs (B).",
        "",
        "Code after an `await` is a microtask continuation. The browser can render between macrotasks, after microtasks have finished, so a long synchronous task or an endless microtask chain blocks painting and makes the page feel frozen.",
        "",
        "**Practical consequences**: move heavy CPU work to a Web Worker, split long loops into chunks, and avoid recursive promise chains that never yield. In Node the idea is the same, with phases (timers, poll, check) and `process.nextTick` running before promise callbacks."
      ),
      follow: ['Where does requestAnimationFrame fit?', 'How do you keep the UI responsive during heavy computation?', 'What is the difference between process.nextTick and setImmediate in Node?'],
      tags: ['event loop', 'promise', 'microtask', 'settimeout', 'async']
    },
    {
      id: 'fe-4', role: 'frontend', level: 2, topic: 'React',
      q: 'How does React reconciliation work, and why do list keys matter?',
      short: "React builds a lightweight tree of your UI, diffs it against the previous tree and applies only the needed DOM changes. Keys give list items a stable identity so React can match, move and preserve them instead of recreating them.",
      detail: L(
        "#### Reconciliation rules",
        "- Different element types at the same position: tear down the old subtree and build a new one.",
        "- Same type: keep the instance and update props.",
        "- Lists: items are matched by `key`.",
        "",
        "#### Why keys matter",
        "Without stable keys, or with array indexes as keys, React matches by position. If you insert or reorder items, state and DOM belonging to one item can end up attached to another: a typed value stays in row 1 while the data moves to row 2.",
        "",
        "- Use a stable unique id from the data.",
        "- Index keys are acceptable only for static lists that never reorder.",
        "- Never use `Math.random()`: it creates a new identity every render, so every item remounts.",
        "",
        "A useful trick: changing a component's `key` deliberately resets its state.",
        "",
        "The virtual DOM is not faster than hand-written DOM updates; its value is a declarative model with acceptable cost."
      ),
      follow: ['What goes wrong with index keys when you delete the first item?', 'How can you reset a component state using key?', 'What is React Fiber?'],
      tags: ['react', 'keys', 'reconciliation', 'virtual dom', 'diff']
    },
    {
      id: 'fe-5', role: 'frontend', level: 2, topic: 'React',
      q: 'A React screen feels slow because of unnecessary re-renders. How do you fix it?',
      short: "Find out why it re-renders first (React DevTools Profiler), then fix the cause: keep state local, memoise only the expensive children, and split context so unrelated consumers do not update.",
      detail: L(
        "#### Why components re-render",
        "A parent rendered, state or context changed, or a new object or function identity was passed as a prop.",
        "",
        "#### Fixes, roughly in order of preference",
        "1. **Move state down** to the component that needs it, or lift static content up and pass it as `children`, so unaffected subtrees are skipped.",
        "2. **`React.memo`** on expensive children, with stable props (`useCallback` and `useMemo` for functions and objects you pass down).",
        "3. **Split context** or use selector-based stores (Zustand, Redux selectors) so consumers subscribe only to the slice they use.",
        "4. **Virtualise long lists** so only visible rows render.",
        "5. **Defer non-urgent updates** with `useTransition` or `useDeferredValue`.",
        "",
        "Memoisation has its own cost and clutters code, so apply it only where the Profiler shows a problem. Newer React versions with the React Compiler can add memoisation automatically, but understanding the cause is still what lets you fix it."
      ),
      follow: ['When does useMemo make things worse?', 'Why can context cause performance problems?', 'How would you profile a slow interaction?'],
      tags: ['react', 'performance', 'memo', 'rerender', 'context']
    },
    {
      id: 'fe-6', role: 'frontend', level: 3, topic: 'Performance',
      q: 'A page loads slowly on mobile. How do you diagnose and improve it?',
      short: "Measure first with field data and a lab trace, find which Core Web Vital is bad (LCP, INP or CLS), then fix its biggest contributor: network and bundle size for LCP, main-thread work for INP, reserved space for CLS.",
      detail: L(
        "#### Metrics and thresholds",
        "- **LCP** (loading): good is 2.5 seconds or less.",
        "- **INP** (responsiveness): good is 200 ms or less.",
        "- **CLS** (visual stability): good is 0.1 or less.",
        "",
        "#### Process",
        "Look at real-user data segmented by device and network, reproduce with CPU and network throttling, then read the waterfall and the Performance panel.",
        "",
        "- **LCP**: improve server response and caching (CDN), preload the hero image and key font, serve responsive modern image formats, remove render-blocking CSS and JS, consider SSR or streaming.",
        "- **INP**: break up long tasks (over 50 ms), ship less JavaScript (code splitting, tree shaking), defer third-party scripts, move work to workers.",
        "- **CLS**: set width and height or `aspect-ratio` on media, reserve space for embeds and ads, load fonts with `font-display` and a matching fallback.",
        "",
        "#### Senior touch",
        "Prevent regressions with performance budgets in CI, and prioritise by business impact (conversion by speed band), not by Lighthouse score."
      ),
      follow: ['How is INP different from the older FID?', 'How do you stop performance regressions?', 'SSR versus CSR: what are the trade-offs for LCP?'],
      tags: ['performance', 'core web vitals', 'lcp', 'inp', 'cls', 'lighthouse']
    },
    {
      id: 'fe-7', role: 'frontend', level: 3, topic: 'Security',
      q: 'How do you protect a single-page app from XSS and CSRF, and where should auth tokens be stored?',
      short: "Stop XSS first (escape output, avoid innerHTML, strict CSP) because any XSS can read JavaScript-accessible storage. Prefer HttpOnly, Secure, SameSite cookies for session tokens and add CSRF protection when using cookies.",
      detail: L(
        "#### XSS defences",
        "Framework auto-escaping (do not bypass it with `innerHTML` or `dangerouslySetInnerHTML`), sanitise any untrusted HTML with an allow-list library such as DOMPurify, a Content Security Policy without `unsafe-inline` (use nonces or hashes), and Trusted Types.",
        "",
        "#### Token storage",
        "- `localStorage` is readable by any script on the page, so one XSS steals the token.",
        "- An `HttpOnly` cookie cannot be read by JavaScript, but the browser sends it automatically, which brings CSRF risk. Mitigate with `SameSite=Lax` or `Strict`, CSRF tokens, and Origin header checks.",
        "- Keep access tokens short-lived and rotate refresh tokens. A backend-for-frontend (BFF) keeps tokens on the server entirely.",
        "",
        "#### Also",
        "Third-party scripts are a supply-chain risk (minimise them, use Subresource Integrity). Use `frame-ancestors` against clickjacking. With cross-origin APIs, never combine `Access-Control-Allow-Origin: *` with credentials."
      ),
      follow: ['What does SameSite actually do?', 'How does CSP limit the damage of XSS?', 'What is a backend-for-frontend?'],
      tags: ['xss', 'csrf', 'security', 'csp', 'tokens', 'cookies']
    },
    {
      id: 'fe-8', role: 'frontend', level: 4, topic: 'Architecture',
      q: 'Six teams contribute to one web app. How would you structure the frontend?',
      short: "Optimise for independent delivery without fragmenting the experience: a shared design system and platform tooling, ownership by product domain, and micro-frontends only if teams truly need separate deploys.",
      detail: L(
        "Start with the actual pain: merge conflicts, coupled releases, inconsistent UX, slow builds? The answer differs.",
        "",
        "#### Options",
        "1. **Modular monolith in a monorepo** (Nx or Turborepo) with enforced module boundaries, CODEOWNERS and trunk-based development with feature flags. Simplest, and enough for most organisations.",
        "2. **Micro-frontends** (module federation, web components, edge composition) when teams need separate deploy cadences. Costs: duplicated dependencies, runtime integration, harder consistent UX and performance, versioned contracts between modules.",
        "",
        "#### Platform pieces either way",
        "Design system with tokens and accessible components, a shared shell for routing, auth and telemetry, performance budgets, contract tests between modules, and per-team observability.",
        "",
        "#### Governance and migration",
        "RFCs for cross-cutting changes, deprecation policy, inner-source contribution. Migrate legacy code incrementally with the strangler pattern, one vertical slice first. Remember that team structure shapes architecture (Conway's law)."
      ),
      follow: ['How do you share state between micro-frontends?', 'How do you keep the UX consistent across teams?', 'How would you migrate a legacy app incrementally?'],
      tags: ['architecture', 'micro-frontends', 'monorepo', 'design system', 'leadership']
    }
  ]);
})();
