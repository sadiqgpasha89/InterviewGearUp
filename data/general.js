/* Software engineer (core): data structures, algorithms, design, behavioral. */
(function () {
  const IGU = window.IGU, L = IGU.L;
  IGU.add([
    {
      id: 'gen-1', role: 'general', level: 1, topic: 'Complexity',
      q: 'What is Big-O notation? Explain with examples.',
      short: "Big-O describes how an algorithm's running time or memory grows as the input size n grows, ignoring constants and small terms. It lets you compare approaches independent of hardware.",
      detail: L(
        "Count how the number of basic steps scales with n, keep the fastest-growing term and drop constants. Common classes, from best to worst:",
        "",
        "- **O(1)**: array index, hash map lookup (on average).",
        "- **O(log n)**: binary search, because each step halves the problem.",
        "- **O(n)**: one pass over the data.",
        "- **O(n log n)**: efficient comparison sorts such as merge sort.",
        "- **O(n^2)**: nested loops over the same data.",
        "- **O(2^n)**: naive recursion over all subsets.",
        "",
        "Example: finding a value in an unsorted array is O(n) because in the worst case you inspect every element. In a sorted array, binary search is O(log n).",
        "",
        "Big-O is an upper bound and is usually quoted for the worst case. Also state **space complexity**. Constants still matter in practice: an O(n) algorithm with a large constant can lose to an O(n log n) one for realistic input sizes."
      ),
      follow: ['Can you sort faster than O(n log n)?', 'What is the difference between worst, average and amortized cost?', 'Why is a hash map lookup only O(1) on average?'],
      tags: ['big-o', 'complexity', 'time', 'space', 'algorithm']
    },
    {
      id: 'gen-2', role: 'general', level: 1, topic: 'Arrays and hashing',
      q: 'Given an array of numbers and a target, return the indices of two numbers that add up to the target.',
      short: "Scan once with a hash map from value to index: for each number, check whether target minus the number was already seen. O(n) time, O(n) space.",
      detail: L(
        "The brute force tries every pair, which is O(n^2). The map version trades memory for speed:",
        "",
        "```js",
        "function twoSum(nums, target) {",
        "  const seen = new Map();            // value -> index",
        "  for (let i = 0; i < nums.length; i++) {",
        "    const need = target - nums[i];",
        "    if (seen.has(need)) return [seen.get(need), i];",
        "    seen.set(nums[i], i);",
        "  }",
        "  return [];                         // no pair found",
        "}",
        "```",
        "",
        "Checking for the complement **before** inserting the current number stops you using the same element twice, and still handles duplicates: for `[3, 3]` and target 6, the first 3 is stored and the second finds it.",
        "",
        "Edge cases to mention: empty array, no solution, negative numbers. If the array is already sorted and you must use O(1) extra space, use two pointers moving inward, but note that you then return values unless you track original indices."
      ),
      follow: ['What if there are many valid pairs and you need all unique pairs?', 'How would you extend it to three numbers?', 'What changes if the data does not fit in memory?'],
      tags: ['hash map', 'array', 'two sum', 'leetcode', 'coding']
    },
    {
      id: 'gen-3', role: 'general', level: 2, topic: 'Operating systems',
      q: 'What is the difference between a process and a thread?',
      short: "A process is an isolated program instance with its own memory; threads are lightweight execution units inside a process that share its memory. Threads are cheaper and communicate easily but need synchronisation; processes give isolation and fault containment.",
      detail: L(
        "- **Memory**: each process has its own address space. Threads of one process share the heap and globals but each has its own stack.",
        "- **Cost**: creating a process and switching between processes is heavier than for threads.",
        "- **Communication**: processes use IPC (pipes, sockets, shared memory). Threads just read and write shared variables, which is fast but causes race conditions unless guarded by locks or atomics.",
        "- **Failure**: a crashing process does not take down others. A crashing thread, or memory corruption in one, can bring down the whole process.",
        "",
        "Real-world use: browsers run one process per site for security and stability. Servers use thread pools or event loops to handle many connections.",
        "",
        "Language detail worth knowing: in standard CPython the Global Interpreter Lock prevents threads from running Python bytecode in parallel, so CPU-bound Python work uses multiple processes, while threads still help with I/O-bound work.",
        "",
        "Related problems to be ready for: race conditions, deadlocks (four conditions: mutual exclusion, hold and wait, no preemption, circular wait) and how consistent lock ordering avoids them."
      ),
      follow: ['What causes a deadlock and how do you prevent one?', 'How would you size a thread pool for CPU-bound versus I/O-bound work?', 'What happens during a context switch?'],
      tags: ['process', 'thread', 'concurrency', 'os', 'deadlock']
    },
    {
      id: 'gen-4', role: 'general', level: 2, topic: 'Data structures',
      q: 'Implement an LRU cache with O(1) get and put.',
      short: "Combine a hash map (O(1) lookup) with a doubly linked list (O(1) reordering). Move a key to the front on every access and evict from the tail when over capacity.",
      detail: L(
        "The map alone cannot tell you which item is least recently used; a list alone cannot find a key quickly. Together: the map points to list nodes, and the list orders nodes by recency.",
        "",
        "In JavaScript a `Map` remembers insertion order, which can stand in for the list:",
        "",
        "```js",
        "class LRU {",
        "  constructor(cap) { this.cap = cap; this.m = new Map(); }",
        "  get(k) {",
        "    if (!this.m.has(k)) return -1;",
        "    const v = this.m.get(k);",
        "    this.m.delete(k); this.m.set(k, v);          // mark as most recent",
        "    return v;",
        "  }",
        "  put(k, v) {",
        "    this.m.delete(k); this.m.set(k, v);",
        "    if (this.m.size > this.cap) this.m.delete(this.m.keys().next().value); // evict oldest",
        "  }",
        "}",
        "```",
        "",
        "Say aloud that this works because of the Map's ordering guarantee, and that in Java, C++ or Go you would write the doubly linked list with head and tail sentinel nodes so insert and remove need no special cases.",
        "",
        "Production concerns: thread safety (a lock, or sharded caches to reduce contention), TTL expiry, and memory bounds measured in bytes rather than item count."
      ),
      follow: ['How would you make it thread-safe?', 'How would an LFU cache differ?', 'How would you add per-entry expiry?'],
      tags: ['lru', 'cache', 'linked list', 'hash map', 'design']
    },
    {
      id: 'gen-5', role: 'general', level: 3, topic: 'System design',
      q: 'Design a URL shortener.',
      short: "Generate a unique short key per URL (base62 of an ID, or random with a collision check), store key to URL in a key-value store, redirect with 301 or 302, and cache hot keys. Reads far outnumber writes, so design for read throughput.",
      detail: L(
        "#### Requirements and numbers",
        "Shorten a URL, redirect fast, optional custom alias and expiry, basic analytics. Suppose 100M new links a month: about 40 writes per second. At 100 reads per link that is roughly 4,000 reads per second on average, with higher peaks.",
        "",
        "#### Key generation",
        "- Seven base62 characters give 62^7, about 3.5 trillion keys.",
        "- **ID plus base62**: no collisions, but sequential keys are guessable. Allocate ID ranges to each app server to avoid a central bottleneck, and scramble if guessability matters.",
        "- **Random key plus insert-if-absent**: simple, with rare retries on collision.",
        "- **Hash of the URL, truncated**: dedupes identical URLs but collides, so you need handling anyway.",
        "",
        "#### Storage and serving",
        "A key-value store keyed by short code (DynamoDB, Cassandra, or a sharded SQL table) with Redis or a CDN in front for hot keys. A 301 is cacheable by browsers and cuts load but hides repeat clicks from your analytics; a 302 keeps traffic flowing through you.",
        "",
        "#### Hardening",
        "Rate-limit creation, check destinations against malware and phishing lists, block internal addresses, send click events to a queue so analytics never slows the redirect, and replicate across regions."
      ),
      follow: ['How do you avoid ID collisions across many servers?', 'How would you record analytics without slowing redirects?', 'How would link expiry and deletion work?'],
      tags: ['url shortener', 'system design', 'base62', 'cache', 'key-value']
    },
    {
      id: 'gen-6', role: 'general', level: 3, topic: 'Behavioral',
      q: 'Tell me about a time you disagreed with a teammate on a technical decision.',
      short: "Choose a real disagreement with stakes. Show that you listened first, used evidence to reach a decision, committed to the outcome even if it was not your option, and kept the relationship intact.",
      detail: L(
        "At senior level the interviewer is checking whether you argue from evidence rather than ego, understand the other person's constraints, and know when to escalate.",
        "",
        "#### Shape of a strong answer",
        "1. **Situation**: what was being decided (database choice, build versus buy, refactor versus rewrite) and the deadline or risk.",
        "2. **Their view, fairly stated**: show you understood why a reasonable person disagreed.",
        "3. **Action**: you proposed decision criteria, a time-boxed benchmark or a prototype, and involved the person who owned the decision.",
        "4. **Outcome**: the decision, what happened after it, and what the team learned. If you lost the argument, say how you supported the result.",
        "",
        "#### Avoid",
        "Making the other person a villain, stories where nothing was at stake, and conclusions that amount to 'I was right'. A story where you changed your mind is strong evidence of judgement.",
        "",
        "Prepare one example with a peer and one with someone more senior, since follow-ups often ask about that."
      ),
      follow: ['What if the other person was your manager?', 'What if you were the one who was wrong?', 'What do you do when you cannot reach agreement?'],
      tags: ['behavioral', 'conflict', 'disagree', 'star', 'teamwork']
    },
    {
      id: 'gen-7', role: 'general', level: 4, topic: 'System design',
      q: 'Design a rate limiter for an API platform.',
      short: "Pick the algorithm (token bucket is the usual default), enforce it at the edge using a shared fast store such as Redis with atomic operations, return 429 with Retry-After, and decide up front whether to fail open or closed if the limiter is down.",
      detail: L(
        "#### Clarify first",
        "What is limited (user, API key, IP, endpoint), what limits apply, whether bursts are allowed, and whether limits are global or per region.",
        "",
        "#### Algorithms",
        "- **Fixed window**: simple, but allows up to double the limit across a window boundary.",
        "- **Sliding window log**: exact, memory-heavy.",
        "- **Sliding window counter**: cheap approximation.",
        "- **Token bucket**: constant memory (token count and last refill time), allows controlled bursts. Common default.",
        "- **Leaky bucket**: smooths output rate.",
        "",
        "#### Distributed enforcement",
        "A central Redis with a Lua script makes check-and-decrement atomic. At very high scale, use local counters that sync periodically: slightly approximate, much lower latency. Shard by key to avoid hot nodes.",
        "",
        "#### Lead-level concerns",
        "Fail open versus closed, fairness between tenants, priority classes, dry-run mode to roll out new limits safely, visibility into who is being throttled, and client guidance: exponential backoff with jitter. Put the limiter in the gateway or a sidecar and protect it from becoming a single point of failure."
      ),
      follow: ['How do you keep limits accurate across regions?', 'How do you handle a single hot key?', 'How would you roll out new limits without breaking customers?'],
      tags: ['rate limiter', 'token bucket', 'redis', 'api gateway', 'system design']
    },
    {
      id: 'gen-8', role: 'general', level: 4, topic: 'Behavioral',
      q: 'Tell me about a technical decision you made that you later regretted.',
      short: "Pick a decision with real cost, own it without blaming others, explain what you knew at the time, what you would do differently, and the process you changed so the team decides better afterwards.",
      detail: L(
        "At lead or staff level this tests judgement and humility. Separate a **bad outcome** from a **bad decision**: sometimes a sound decision fails, and sometimes a lucky outcome hides a poor process.",
        "",
        "#### Structure",
        "1. Context and constraints when you decided, and why the choice looked reasonable.",
        "2. The signal that showed it was wrong, and how quickly you noticed.",
        "3. How you corrected course (migration, rollback, communication to stakeholders) and the cost in time or money.",
        "4. The lesson turned into a mechanism: decision records, pilots before commitment, explicit review dates, making choices reversible.",
        "",
        "#### Avoid",
        "Fake weaknesses ('I care too much'), blaming vendors or teammates, and stories with no concrete cost. Typical honest examples: adopting a technology too early, skipping load testing, or letting a rewrite's scope grow."
      ),
      follow: ['How do you decide which decisions deserve heavy analysis?', 'How do you make decisions reversible?', 'Who did you tell, and when?'],
      tags: ['behavioral', 'decision', 'regret', 'leadership', 'judgement']
    }
  ]);
})();
