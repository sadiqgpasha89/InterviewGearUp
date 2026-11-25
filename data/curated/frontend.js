/* Frontend: curated answers. AI-drafted, not yet reviewed by a person (see CONTRIBUTING.md). */
(function () {
  const IGU = window.IGU, L = IGU.L;
  const meta = function (difficulty) { return { difficulty: difficulty, reviewStatus: 'ai-drafted', contentVersion: 1 }; };

  IGU.revise([
    Object.assign(meta('easy'), {
      id: "fe-9",
      short: "The browser parses HTML into the DOM and CSS into the CSSOM, combines them into a render tree of visible nodes, computes layout (sizes and positions), then paints and composites layers. CSS blocks rendering and synchronous JavaScript blocks HTML parsing, so both delay first paint.",
      detail: L(
        "#### Steps",
        "1. **Parse HTML** into the DOM, incrementally as bytes arrive.",
        "2. **Parse CSS** into the CSSOM. Rendering waits for it, so CSS is *render-blocking*.",
        "3. **Build the render tree** from the DOM and CSSOM, leaving out nodes such as `display: none` elements and `<head>`.",
        "4. **Layout (reflow)**: compute the geometry of every box.",
        "5. **Paint** the pixels, then **composite** layers, often on the GPU.",
        "",
        "#### What blocks what",
        "- A normal `<script>` pauses HTML parsing while it downloads and runs, and it also waits for pending CSS because the script might read styles. Use `defer` (runs after parsing, in order) or `async` (runs as soon as it arrives).",
        "- Large CSS in the head delays first paint; inline the critical CSS and load the rest later.",
        "",
        "#### Optimizing",
        "Ship less render-blocking CSS and JavaScript, preload key resources such as fonts and the hero image, avoid layout thrashing (interleaving DOM reads and writes), and animate `transform` and `opacity`, which can skip layout and paint."
      ),
      follow: ["What is the difference between reflow and repaint?", "How do defer and async differ?"],
      tags: ["critical rendering path", "dom", "cssom", "performance", "rendering"]
    }),
    Object.assign(meta('easy'), {
      id: "fe-93",
      short: "`===` compares without type conversion: values of different types are never equal. `==` first coerces both sides to a common type using complicated rules, which gives surprises such as `0 == ''` being true. `Object.is` is like `===` except that `NaN` equals `NaN` and `+0` differs from `-0`. Use `===` by default.",
      detail: L(
        "#### Examples",
        "```js",
        "0 == ''               // true  (both coerce to 0)",
        "null == undefined     // true  (a special rule)",
        "null == 0             // false (null only equals undefined)",
        "'1' == 1              // true",
        "[] == false           // true  ([] -> '' -> 0, false -> 0)",
        "NaN === NaN           // false",
        "Object.is(NaN, NaN)   // true",
        "Object.is(0, -0)      // false, while 0 === -0 is true",
        "```",
        "",
        "**Rules of thumb**: use `===` for almost everything. The one common deliberate use of `==` is `x == null`, which is true for both `null` and `undefined`. Use `Number.isNaN(x)` to test for `NaN`, and `Object.is` when you must tell `-0` from `0`. React uses `Object.is` to compare state and dependency values.",
        "",
        "Objects are compared by reference with every operator: `{} === {}` is false."
      ),
      follow: ["Why does `typeof null` return 'object'?", "How does React decide whether a dependency has changed?"],
      tags: ["javascript", "equality", "coercion", "object.is"]
    }),
    Object.assign(meta('easy'), {
      id: "fe-61",
      short: "`undefined` means a variable exists but has no value yet, or a property or argument is missing; `null` is an explicit 'no value' that you assign on purpose. An undeclared variable does not exist at all: reading it throws a `ReferenceError`, although `typeof` on it safely returns 'undefined'.",
      detail: L(
        "```js",
        "let a;                  // declared, never assigned",
        "console.log(a);         // undefined",
        "const o = {};",
        "console.log(o.x);       // undefined (missing property)",
        "let b = null;           // deliberately empty",
        "console.log(c);         // ReferenceError: c is not defined",
        "console.log(typeof c);  // 'undefined' (no error)",
        "```",
        "",
        "- `typeof undefined` is `'undefined'`, while `typeof null` is `'object'`, a historical bug that cannot be fixed without breaking the web.",
        "- `null == undefined` is true but `null === undefined` is false.",
        "- JSON has `null` but no `undefined`: `JSON.stringify({ a: undefined })` drops the key.",
        "- **Temporal dead zone**: reading a `let` or `const` variable before its declaration also throws a `ReferenceError`, even though the variable is declared in that scope.",
        "",
        "In practice, use `null` for 'intentionally empty' and let `undefined` mean 'not provided'. Optional chaining (`a?.b`) and nullish coalescing (`a ?? 'default'`) treat both the same way."
      ),
      follow: ["What is the difference between `??` and `||`?", "What is the temporal dead zone?"],
      tags: ["javascript", "null", "undefined", "types"]
    }),
    Object.assign(meta('hard'), {
      id: "fe-56",
      short: "Micro-frontends split a large web app into independently built and deployed pieces owned by different teams. Module Federation (Webpack 5, and Vite through plugins) lets one build expose modules that another build loads from a remote URL at runtime, negotiating shared dependencies such as React so only one copy is loaded.",
      detail: L(
        "**How Module Federation works**: each app can `expose` modules and declare `remotes`. The host loads a small `remoteEntry.js` from the remote's URL at runtime, then imports the exposed module on demand. A `shared` configuration (with version ranges and `singleton: true` for libraries like React) makes host and remotes agree on a single instance.",
        "",
        "#### Why teams choose it",
        "- Independent deploys and release cadence per team, with a smaller blast radius.",
        "- Incremental migration away from a legacy app (the strangler pattern).",
        "",
        "#### The real costs",
        "- **Runtime version skew**: a remote deployed with an incompatible shared version can break the host in production, so you need contract tests, versioned remotes and fast rollback.",
        "- **Performance**: extra network round trips and duplicated code if sharing is misconfigured; measure bundle size and Core Web Vitals.",
        "- **UX consistency**: you need a shared design system and shared routing and auth conventions.",
        "- **Operational overhead**: many pipelines, harder local development and harder error tracking.",
        "",
        "#### When not to use it",
        "With a single team or a modest codebase, a well-structured monorepo with clear module boundaries gives most of the benefit without the runtime complexity. Alternatives are build-time composition (npm packages), iframes for hard isolation, and server-side composition."
      ),
      follow: ["How would you handle a breaking change in a shared library across remotes?", "How do you keep one design system consistent across independently deployed apps?"],
      tags: ["micro-frontends", "module federation", "architecture", "webpack", "vite"]
    })
  ]);

  IGU.add([
    Object.assign(meta('hard'), {
      id: "fe-101", role: "frontend", level: 4, topic: "Architecture",
      q: "How would you lead the migration of a large legacy frontend to a new framework without freezing feature work?",
      short: "Migrate incrementally with the strangler pattern: put a routing or composition layer in front, move one route or component at a time behind feature flags, keep shipping features, and track progress with metrics. Avoid a big-bang rewrite, which stops delivery, hides risk until the end and often never finishes.",
      detail: L(
        "#### Approach",
        "1. **Decide why**: write down the problem (hiring, performance, security, maintainability) and the success metric. If you cannot name one, do not migrate.",
        "2. **Create seams**: define a boundary that old and new code can share, such as route-level splitting, a shared design-token layer, or web components for leaf widgets.",
        "3. **Strangle by slice**: start with low-risk but visible slices, ship them behind feature flags, and compare them with the old version (errors, conversion, performance) before ramping up.",
        "4. **Stop the bleeding**: new features go in the new stack, and the old code gets bug fixes only.",
        "5. **Measure and publish progress**: share of traffic or routes migrated, bundle size, error rate and developer cycle time.",
        "",
        "#### Risks to manage",
        "- Two stacks at once means duplicated state, styling and auth. Share them through a thin interface.",
        "- A bundle that carries both frameworks: lazy-load and set a budget.",
        "- Migration fatigue: set a visible deadline for removing the old stack and name an owner.",
        "",
        "#### Leadership angle",
        "Get product agreement on a standing share of capacity (for example 20%) instead of repeated negotiations, and agree up front what 'done' means and when the old code is deleted."
      ),
      follow: ["How would you decide which slice to migrate first?", "What would make you stop the migration and keep the old stack?"],
      tags: ["migration", "strangler pattern", "architecture", "feature flags", "leadership"]
    })
  ]);
})();
