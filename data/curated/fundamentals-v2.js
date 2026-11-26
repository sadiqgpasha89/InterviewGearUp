/* Phase 1, content trust: second versions of the most-studied fundamentals.
   These ten answers came from the first release with no recorded author, and the content audit (docs/CONTENT_QUALITY.md)
   ranked them at the top of the review queue: short, few examples, no trade-offs or failure modes. They are rewritten here
   with worked examples, trade-offs and pitfalls. They are still AI-drafted and are labelled that way until a person reviews them.
   Ids, roles, gears, topics and question wording are unchanged, so saved progress and links keep working. */
(function () {
  const IGU = window.IGU, L = IGU.L;
  const v2 = function (difficulty) { return { difficulty: difficulty, reviewStatus: 'ai-drafted', contentVersion: 2 }; };

  IGU.revise([
    Object.assign(v2("medium"), {
      id: "do-5",
      short: "Terraform state is a JSON file that maps the resources in your configuration to the real objects in the cloud, with their IDs and attributes. Terraform diffs config against state to plan changes. A remote backend keeps one shared copy, and locking stops two applies from writing it at the same time and corrupting it.",
      detail: L(
        "#### What state is for",
        "Terraform cannot infer from the cloud API alone which bucket belongs to which block in your code. State records that mapping (`aws_s3_bucket.logs` is bucket `acme-logs-prod`), plus attribute values and dependency order. `terraform plan` compares three things: your configuration, the state, and a refresh of the real resources.",
        "",
        "#### Why remote, why locked",
        "- **Local state** lives on one laptop. A teammate who runs apply from another machine has a stale or missing copy and may try to recreate resources that already exist.",
        "- **Remote backend** (for example S3, GCS, Azure Blob or Terraform Cloud) gives everyone and CI the same copy, with versioning so you can roll back a bad write.",
        "- **Locking** (a DynamoDB table or the native lock of the backend) makes apply exclusive. Without it, two concurrent applies both read version N and both write N+1, and one set of changes is lost from state while still existing in the cloud.",
        "",
        "```hcl",
        "terraform {",
        "  backend \"s3\" {",
        "    bucket         = \"acme-tf-state\"",
        "    key            = \"payments/prod/terraform.tfstate\"",
        "    region         = \"eu-west-1\"",
        "    encrypt        = true",
        "    dynamodb_table = \"tf-locks\"",
        "  }",
        "}",
        "```",
        "",
        "#### Trade-offs in how you split state",
        "- **One big state**: simple, but every plan is slow, the blast radius of a mistake is the whole estate and every team needs write access.",
        "- **Per environment and per component** (network, data, app): faster plans and smaller blast radius, at the cost of passing outputs between states (`terraform_remote_state` or a data source) and more pipelines to run.",
        "",
        "#### Pitfalls",
        "- State stores attribute values in plain text, including generated passwords. Encrypt the bucket, restrict who can read it, and prefer secrets managers over Terraform-generated secrets.",
        "- **Drift**: someone changes a resource in the console. The next plan wants to revert it. Decide whether to accept the change in code or let Terraform restore it.",
        "- A stuck lock after a crashed CI job: `terraform force-unlock` only after confirming nothing is still running.",
        "- Never hand-edit the JSON. Use `terraform state mv`, `rm` and `import` (or `moved` and `import` blocks) so the change is reviewable."
      ),
      follow: [
        "How do you handle secrets that end up in state?",
        "How would you split state across teams and environments?",
        "What does terraform import do?",
        "A plan shows a resource will be destroyed and recreated after a refactor. How do you avoid that?"
      ]
    }),

    Object.assign(v2("easy"), {
      id: "sec-1",
      short: "Encoding changes the representation of data so a system can carry it (Base64, UTF-8) and anyone can reverse it. Encryption hides data so only key holders can reverse it (AES, RSA). Hashing is a one-way fingerprint of fixed length (SHA-256) used to check integrity or store passwords, and is not meant to be reversed.",
      detail: L(
        "#### Side by side",
        "| | Reversible? | Needs a key? | Purpose | Examples |",
        "|---|---|---|---|---|",
        "| Encoding | Yes, by anyone | No | Transport and compatibility | Base64, URL encoding, UTF-8 |",
        "| Encryption | Yes, with the key | Yes | Confidentiality | AES-GCM, ChaCha20-Poly1305, RSA-OAEP |",
        "| Hashing | No (one-way) | No (HMAC adds one) | Integrity, lookup, password storage | SHA-256, BLAKE2; bcrypt, Argon2 for passwords |",
        "",
        "#### Example",
        "A JWT header looks scrambled, but it is only Base64url-encoded: paste it into a decoder and you can read the claims. That is why a JWT must be **signed** (integrity) and should not carry secrets unless it is also encrypted (JWE).",
        "",
        "#### Passwords are a special case",
        "Store passwords with a slow, salted password hash (Argon2id, scrypt or bcrypt), never with encryption (an attacker who steals the key gets every password) and never with a fast hash like plain SHA-256 (GPUs try billions of guesses a second). The salt makes identical passwords hash differently, which defeats precomputed tables.",
        "",
        "#### Trade-offs and pitfalls",
        "- Symmetric encryption (AES) is fast but both sides need the same key; asymmetric (RSA, ECDH) solves key exchange but is slower, so TLS uses asymmetric crypto to agree a symmetric key.",
        "- A plain hash proves nothing about who produced it. To detect tampering by someone without the key, use an HMAC or a digital signature.",
        "- Use authenticated encryption (AES-GCM) so tampered ciphertext is rejected, and never reuse a nonce with the same key.",
        "- Calling Base64 \"encryption\" in a design review is a red flag interviewers listen for."
      ),
      follow: [
        "Why do we salt passwords?",
        "What does GCM give you over CBC mode?",
        "Hash versus HMAC versus signature?",
        "Why is a fast hash like SHA-256 a poor choice for passwords?"
      ]
    }),

    Object.assign(v2("medium"), {
      id: "be-4",
      short: "Common strategies are cache-aside (app reads cache, falls back to the database and fills the cache), read-through, write-through and write-behind. Invalidate with TTLs plus explicit deletes on writes, and accept a bounded staleness window. Prevent stampedes with request coalescing or a lock per key, early refresh before expiry and jittered TTLs.",
      detail: L(
        "#### Strategies",
        "- **Cache-aside**: read cache; on a miss read the database and set the cache. Simple and the most common. The app owns consistency.",
        "- **Read-through / write-through**: the cache library loads and writes the database for you. Write-through keeps the cache fresh but adds write latency.",
        "- **Write-behind**: write to the cache, flush to the database later. Fast writes, but you can lose data if the cache dies before flushing.",
        "",
        "#### Invalidation",
        "On update, write the database first, then **delete** the cache key (not set it). Deleting avoids a race where two writers set values in the wrong order. A TTL is the safety net for anything you miss.",
        "",
        "```python",
        "def get_product(pid):",
        "    key = f\"product:{pid}:v3\"          # version the key when the schema changes",
        "    val = cache.get(key)",
        "    if val is None:",
        "        val = db.load_product(pid)",
        "        cache.set(key, val, ttl=300 + random.randint(0, 60))  # jitter",
        "    return val",
        "",
        "def update_product(pid, data):",
        "    db.save_product(pid, data)",
        "    cache.delete(f\"product:{pid}:v3\")",
        "```",
        "",
        "#### Cache stampede",
        "A hot key expires and thousands of requests miss at once, all hitting the database. Fixes:",
        "- **Single flight / lock per key**: the first request recomputes, the rest wait briefly or get the stale value.",
        "- **Early or probabilistic refresh**: refresh slightly before expiry, while still serving the old value.",
        "- **Jittered TTLs** so many keys written together do not expire together (a cache avalanche).",
        "- **Negative caching** of \"not found\" for a short time so missing keys do not hit the database every time.",
        "",
        "#### Trade-offs",
        "Every cache trades freshness for speed. Ask how stale the data may be: a product description can be minutes old, an account balance cannot be cached at all without care. In-process caches are fastest but each instance has its own copy; Redis or Memcached are shared but add a network hop and another system to operate.",
        "",
        "#### Pitfalls",
        "Caching per-user data under a shared key (data leak), unbounded cache growth, caching errors as if they were results, and having no way to measure hit rate."
      ),
      follow: [
        "How do you prevent a cache stampede?",
        "How would you cache user-specific data?",
        "Redis versus an in-process cache?",
        "Why delete the key on update instead of writing the new value?"
      ]
    }),

    Object.assign(v2("medium"), {
      id: "fe-5",
      short: "Measure first with the React Profiler to find which components re-render and why. Then fix the cause: keep state close to where it is used, split contexts, pass stable props (useCallback, useMemo) to memoised children with React.memo, virtualise long lists, and move expensive work out of render. Re-measure to confirm.",
      detail: L(
        "#### 1. Measure",
        "Record the slow interaction in React DevTools Profiler with \"why did this render\" enabled. Look for components that render often and take long. A re-render is only a problem if it is expensive or very frequent.",
        "",
        "#### 2. Common causes and fixes",
        "- **State too high**: typing in a search box stored in the page component re-renders the whole page. Move the state down into the component that uses it.",
        "- **New object or function props every render** break `React.memo`:",
        "",
        "```jsx",
        "const Row = React.memo(function Row({ item, onSelect }) { /* ... */ });",
        "",
        "function List({ items }) {",
        "  const [selected, setSelected] = useState(null);",
        "  const onSelect = useCallback((id) => setSelected(id), []); // stable",
        "  return items.map((it) => <Row key={it.id} item={it} onSelect={onSelect} />);",
        "}",
        "```",
        "",
        "- **One big context**: every consumer re-renders when any value changes. Split it (state versus dispatch, or by concern) or use a store with selectors.",
        "- **Long lists**: render only what is visible with virtualisation (react-window or similar).",
        "- **Expensive render work**: memoise derived data with `useMemo`, or compute it once outside the component.",
        "- **Unstable keys** (index keys on reordered lists) cause remounts and lost state.",
        "",
        "#### Trade-offs",
        "`memo`, `useMemo` and `useCallback` cost memory and comparisons on every render. Wrapping everything makes code harder to read and can be slower. Apply them where the profiler shows a real cost. React's compiler (where adopted) memoises automatically, which changes this calculus.",
        "",
        "#### Pitfalls",
        "Optimising without measuring, memoising a child but passing it an inline object, and confusing a slow render with a slow network or a slow effect. Use `useTransition` or `useDeferredValue` to keep typing responsive when the expensive part cannot be avoided."
      ),
      follow: [
        "When does useMemo make things worse?",
        "Why can context cause performance problems?",
        "How would you profile a slow interaction?",
        "What do useTransition and useDeferredValue change?"
      ]
    }),

    Object.assign(v2("easy"), {
      id: "be-1",
      short: "REST models a system as resources identified by URLs, manipulated with standard HTTP methods, using stateless requests and representations such as JSON. Methods have defined meanings: GET reads, POST creates or triggers, PUT replaces, PATCH partially updates, DELETE removes. Idempotent methods (GET, PUT, DELETE) give the same result when repeated; POST does not.",
      detail: L(
        "#### Principles",
        "- **Resources and URLs**: nouns, not verbs: `GET /orders/42`, not `GET /getOrder?id=42`.",
        "- **Stateless**: each request carries what the server needs (auth token, parameters). This makes horizontal scaling easy.",
        "- **Uniform interface**: standard methods, status codes and headers (caching, content negotiation).",
        "",
        "#### Methods",
        "| Method | Use | Safe | Idempotent |",
        "|---|---|---|---|",
        "| GET | Read | Yes | Yes |",
        "| POST | Create, or run an action | No | No |",
        "| PUT | Replace the whole resource | No | Yes |",
        "| PATCH | Partial update | No | Not guaranteed |",
        "| DELETE | Remove | No | Yes |",
        "",
        "**Idempotent** means sending the same request twice leaves the server in the same state as sending it once. That matters because clients and proxies retry after timeouts. Example: a client sends `POST /payments`, the response is lost, and it retries: without protection the customer is charged twice. Fix it with an `Idempotency-Key` header that the server stores with the result.",
        "",
        "#### Status codes",
        "- `200 OK`, `201 Created` (with a `Location` header), `204 No Content`",
        "- `400` bad input, `401` not authenticated, `403` authenticated but not allowed, `404` not found, `409` conflict, `422` validation failed, `429` rate limited",
        "- `500` server bug, `503` temporarily unavailable (with `Retry-After`)",
        "",
        "#### Trade-offs",
        "REST is simple, cacheable and works everywhere, but clients may over-fetch or need several round trips for one screen. GraphQL lets clients ask for exactly what they need at the cost of harder caching and query-cost control; gRPC is faster for internal service calls but awkward in browsers.",
        "",
        "#### Pitfalls",
        "Returning `200` with an error body, verbs in URLs, breaking changes without versioning, and offset pagination on large, changing collections (prefer cursor pagination)."
      ),
      follow: [
        "What is the difference between 401 and 403?",
        "PUT versus PATCH?",
        "How would you paginate a large collection?",
        "How would you make POST /payments safe to retry?"
      ]
    }),

    Object.assign(v2("medium"), {
      id: "do-3",
      short: "A Deployment rolling update creates Pods from the new ReplicaSet a few at a time and removes old ones as new ones become Ready, bounded by maxSurge and maxUnavailable. Readiness decides whether a Pod receives traffic; liveness decides whether the container is restarted. A failing readiness probe stalls the rollout instead of breaking users.",
      detail: L(
        "#### How the rollout proceeds",
        "Changing the Pod template (for example the image tag) creates a new ReplicaSet. The controller scales it up and the old one down in steps:",
        "- `maxSurge: 25%`: how many extra Pods may exist above the desired count.",
        "- `maxUnavailable: 0`: never drop below the desired count of Ready Pods (safest for user traffic).",
        "A new Pod only counts once it is **Ready**. If new Pods never become Ready, the rollout stops and `progressDeadlineSeconds` marks it failed; `kubectl rollout undo` goes back.",
        "",
        "#### The three probes",
        "| Probe | On failure | Use it for |",
        "|---|---|---|",
        "| Readiness | Removed from Service endpoints, not restarted | Can I serve traffic right now? (warm-up, dependency down) |",
        "| Liveness | Container restarted | Is the process stuck beyond recovery? (deadlock) |",
        "| Startup | Other probes wait until it passes | Slow-starting apps, so liveness does not kill them during boot |",
        "",
        "```yaml",
        "readinessProbe:",
        "  httpGet: { path: /ready, port: 8080 }",
        "  periodSeconds: 5",
        "  failureThreshold: 3",
        "livenessProbe:",
        "  httpGet: { path: /live, port: 8080 }",
        "  periodSeconds: 10",
        "  failureThreshold: 6",
        "```",
        "",
        "#### Trade-offs",
        "Strict readiness protects users but can stall a rollout or empty a Service during a partial outage. Aggressive liveness catches hangs quickly but can turn a slow dependency into a restart storm.",
        "",
        "#### Pitfalls",
        "- Liveness that checks the database: the database blips and every Pod restarts at once. Liveness should check only the process itself.",
        "- Same endpoint for both probes, so a busy Pod is killed instead of being taken out of rotation.",
        "- No graceful shutdown: handle SIGTERM, fail readiness, finish in-flight requests within `terminationGracePeriodSeconds`.",
        "- Schema changes that are not backward compatible: during a rollout old and new versions run side by side."
      ),
      follow: [
        "What happens if the readiness probe is too strict?",
        "What is the difference between requests and limits?",
        "How does a Service find its Pods?",
        "Why should a liveness probe not call the database?"
      ]
    }),

    Object.assign(v2("medium"), {
      id: "fe-3",
      short: "JavaScript runs one task at a time on a call stack. After each task, the engine drains the whole microtask queue (Promise callbacks, queueMicrotask) before taking the next task (setTimeout, events) and before rendering. So synchronous code runs first, then all microtasks, then timers.",
      detail: L(
        "#### The loop in one picture",
        "1. Run one task to completion (a script, an event handler, a timer callback).",
        "2. Drain the **microtask** queue completely: `.then` callbacks, `await` continuations, `queueMicrotask`, MutationObserver. Microtasks added while draining run in the same drain.",
        "3. The browser may render (style, layout, paint), running `requestAnimationFrame` callbacks just before.",
        "4. Take the next **task** (macrotask) and repeat.",
        "",
        "#### Worked example",
        "```js",
        "console.log('A');",
        "setTimeout(() => console.log('B'), 0);",
        "Promise.resolve().then(() => console.log('C'))",
        "  .then(() => console.log('D'));",
        "queueMicrotask(() => console.log('E'));",
        "console.log('F');",
        "// A F C E D B",
        "```",
        "A and F are synchronous. C and E were queued as microtasks during the script; D is queued when C finishes, still in the same drain. B is a task, so it runs last even with a 0 ms delay.",
        "",
        "#### Why it matters",
        "- A long synchronous loop blocks clicks, typing and painting. Split work into chunks (`setTimeout`, `scheduler.yield()` where available) or move it to a Web Worker.",
        "- An endless chain of microtasks starves rendering just as badly as a busy loop.",
        "- `setTimeout(fn, 0)` is not immediate: it waits for a task slot and is clamped after nesting.",
        "",
        "#### Trade-offs and edge cases",
        "Workers keep the page responsive but need message passing and cannot touch the DOM. In Node the loop has phases; `process.nextTick` runs before Promise microtasks, and `setImmediate` runs in the check phase after I/O."
      ),
      follow: [
        "Where does requestAnimationFrame fit?",
        "How do you keep the UI responsive during heavy computation?",
        "What is the difference between process.nextTick and setImmediate in Node?",
        "What does await do to the code after it?"
      ]
    }),

    Object.assign(v2("medium"), {
      id: "sec-3",
      short: "In TLS 1.3 the client sends supported ciphers and a key share; the server picks a cipher, sends its key share and its certificate, and proves it owns the private key by signing the handshake. Both sides derive the same session keys from an ephemeral Diffie-Hellman exchange, then switch to fast symmetric encryption. It takes one round trip.",
      detail: L(
        "#### TLS 1.3 handshake",
        "1. **ClientHello**: supported versions and cipher suites, a random value, and a key share (an ephemeral ECDHE public key), plus SNI saying which host it wants.",
        "2. **ServerHello**: chosen cipher and the server's key share. Both sides now compute the shared secret, and everything after this is encrypted.",
        "3. **Certificate + CertificateVerify**: the server's certificate chain and a signature over the handshake transcript with its private key, proving it holds the key for that certificate.",
        "4. **Finished** from both sides: a MAC over the transcript, so any tampering with earlier messages is detected.",
        "",
        "The client validates the certificate: chain to a trusted root, hostname matches, not expired, not revoked.",
        "",
        "For example, `openssl s_client -connect example.com:443 -tls1_3` prints the negotiated cipher (such as `TLS_AES_256_GCM_SHA384`), the key exchange group and the certificate chain, which is a quick way to debug a failing handshake.",
        "",
        "#### What each part buys you",
        "- **Ephemeral Diffie-Hellman** gives forward secrecy: stealing the server's private key later does not decrypt recorded traffic.",
        "- **Certificate + signature** gives authentication: you are talking to the holder of the key for that name.",
        "- **AEAD ciphers** (AES-GCM, ChaCha20-Poly1305) give confidentiality and integrity for the data.",
        "",
        "#### Compared with TLS 1.2",
        "1.2 needed two round trips and allowed static RSA key exchange (no forward secrecy) and weaker ciphers. 1.3 removed them. 1.3 also offers 0-RTT resumption, which is fast but replayable, so only use it for idempotent requests.",
        "",
        "#### Pitfalls",
        "Disabling certificate validation in clients \"to make it work\", expired certificates (automate renewal), missing intermediate certificates, and terminating TLS at a load balancer and then sending sensitive traffic unencrypted inside the network."
      ),
      follow: [
        "What is forward secrecy?",
        "What is mutual TLS used for?",
        "How does certificate pinning work?",
        "Why is 0-RTT data a replay risk?"
      ]
    }),

    Object.assign(v2("easy"), {
      id: "fe-1",
      short: "A closure is a function together with the variables from the scope where it was created. The inner function keeps access to those variables even after the outer function has returned. Closures power private state, factories, callbacks and memoisation.",
      detail: L(
        "#### Example",
        "```js",
        "function makeCounter() {",
        "  let count = 0;                 // private: only the returned functions can see it",
        "  return {",
        "    inc: () => ++count,",
        "    get: () => count",
        "  };",
        "}",
        "const c = makeCounter();",
        "c.inc(); c.inc();",
        "c.get(); // 2",
        "```",
        "`count` lives on because the returned functions still reference it. Each call to `makeCounter` creates a fresh `count`.",
        "",
        "#### The classic loop bug",
        "```js",
        "for (var i = 0; i < 3; i++) setTimeout(() => console.log(i)); // 3 3 3",
        "for (let j = 0; j < 3; j++) setTimeout(() => console.log(j)); // 0 1 2",
        "```",
        "`var` is function-scoped, so all callbacks close over the same `i`, which is 3 when they run. `let` creates a new binding per iteration.",
        "",
        "#### Uses",
        "- Private state without classes (module pattern).",
        "- Function factories and partial application: `const add5 = (x) => x + 5`.",
        "- `once()`, debounce and memoise helpers that remember something between calls.",
        "- React hooks: event handlers close over the props and state of the render that created them.",
        "",
        "#### Pitfalls and trade-offs",
        "- **Stale closures**: a `useEffect` or interval callback keeps reading old state. Fix with the dependency array, functional updates or a ref.",
        "- **Memory**: a long-lived closure (a global event listener) keeps everything it references alive, such as a large array or a detached DOM node. Remove listeners when done.",
        "- Closures are cheap, but creating many inside hot loops adds allocation; usually irrelevant, occasionally measurable."
      ),
      follow: [
        "Why does the var loop print 3, 3, 3?",
        "How would you implement a once() helper?",
        "Can closures cause memory leaks?",
        "What is a stale closure in React and how do you fix it?"
      ]
    }),

    Object.assign(v2("easy"), {
      id: "ml-2",
      short: "Precision is the share of predicted positives that are correct, TP / (TP + FP). Recall is the share of actual positives you found, TP / (TP + FN). F1 is their harmonic mean. Prefer precision when false alarms are costly, recall when misses are costly, and F1 when you need one number that balances both on imbalanced data.",
      detail: L(
        "#### Worked example",
        "A fraud model flags 100 transactions; 80 are really fraud. There were 200 frauds in total.",
        "- Precision = 80 / 100 = **0.80** (of what we flagged, 80% was right)",
        "- Recall = 80 / 200 = **0.40** (we caught 40% of fraud)",
        "- F1 = 2 x 0.8 x 0.4 / (0.8 + 0.4) = **0.53**",
        "",
        "#### Which to favour",
        "| Situation | Favour | Why |",
        "|---|---|---|",
        "| Cancer screening, fraud detection | Recall | A miss is very costly; a human can review false alarms |",
        "| Spam filter moving mail out of the inbox | Precision | Losing a real email is worse than seeing some spam |",
        "| Search results top 10 | Precision at k | Users only look at the first few |",
        "| Balanced cost, imbalanced classes | F1 (or F-beta) | One number that punishes ignoring either side |",
        "",
        "F-beta weights recall beta times as much as precision (F2 for recall-heavy problems).",
        "",
        "#### Trade-off and threshold",
        "Most classifiers output a score; the threshold sets the trade-off. Lowering it raises recall and usually lowers precision. Choose the threshold from the business cost of a false positive versus a false negative, using a precision-recall curve on validation data, not the default 0.5.",
        "",
        "#### Pitfalls",
        "- **Accuracy on imbalanced data**: with 1% fraud, predicting \"never fraud\" is 99% accurate and useless.",
        "- ROC-AUC can look good on heavily imbalanced data because it includes true negatives; PR-AUC is more informative there.",
        "- Macro versus micro averaging changes multi-class results; say which you report.",
        "- Tuning the threshold on the test set leaks information; use a validation set."
      ),
      follow: [
        "Why is accuracy misleading on imbalanced data?",
        "ROC curve versus precision-recall curve?",
        "How do you choose the decision threshold?",
        "When would you use F2 instead of F1?"
      ]
    })
  ]);
})();
