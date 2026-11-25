/* Core software engineering: curated answers. IGU.revise replaces filler answers by id; IGU.add appends new questions.
   Every entry here is AI-drafted and not yet reviewed by a person (see CONTRIBUTING.md). */
(function () {
  const IGU = window.IGU, L = IGU.L;
  const meta = function (difficulty) { return { difficulty: difficulty, reviewStatus: 'ai-drafted', contentVersion: 1 }; };

  IGU.revise([
    Object.assign(meta('easy'), {
      id: "gen-9",
      short: "A dynamic array keeps a fixed-size buffer and, when it fills, allocates a larger one (typically 1.5x to 2x), copies the elements over and frees the old one. Most appends are O(1); the occasional resize is O(n), but spread over all appends the amortized cost is still O(1).",
      detail: L(
        "**Why geometric growth**: if the array grew by a fixed amount (say +10), n appends would copy about n²/10 elements in total, which is O(n²). Multiplying the capacity by a constant factor keeps the total copying proportional to n.",
        "",
        "#### Amortized argument",
        "With doubling, resizes happen at sizes 1, 2, 4, 8, ... up to n. The copy costs add up to 1 + 2 + 4 + ... + n, which is less than 2n. Add the n cheap writes and the total stays under 3n for n appends, so the average cost per append is O(1).",
        "",
        "#### Trade-offs",
        "- **Growth factor**: 2x can waste up to half the memory; smaller factors such as 1.5x waste less and let the allocator reuse earlier freed blocks. Real implementations differ (Java's ArrayList grows by about 1.5x, CPython's list by about 1.125x).",
        "- A resize invalidates pointers and iterators into the old buffer.",
        "- A single append can cost O(n), which matters for latency-sensitive code; reserve capacity up front when the size is known.",
        "- Appending and removing at the end are O(1); inserting in the middle is O(n)."
      ),
      follow: ["What happens if you also shrink the array when it is a quarter full, and why a quarter and not half?", "Why does a resize invalidate iterators in C++ std::vector?"],
      tags: ["dynamic array", "amortized analysis", "arrays", "complexity"]
    }),
    Object.assign(meta('easy'), {
      id: "gen-11",
      short: "Move a slow pointer one step and a fast pointer two steps at a time. If the list has a cycle they must meet inside it; if the fast pointer reaches null there is no cycle. It runs in O(n) time and O(1) space, unlike a hash set that costs O(n) space.",
      detail: L(
        "#### Detecting a cycle",
        "```python",
        "def has_cycle(head):",
        "    slow = fast = head",
        "    while fast and fast.next:",
        "        slow = slow.next",
        "        fast = fast.next.next",
        "        if slow is fast:",
        "            return True",
        "    return False",
        "```",
        "",
        "**Why they meet**: once both are inside the cycle, the gap between them shrinks by one each step (the fast pointer gains one node per iteration), so it reaches zero without jumping over the slow pointer.",
        "",
        "#### Finding where the cycle starts",
        "Let a be the distance from the head to the cycle entry and c the cycle length. When they meet, slow has walked a + b steps and fast has walked 2(a + b), where b is how far into the cycle they meet. The difference, a + b, is a whole number of laps: a + b = k·c, so a = k·c − b. Reset one pointer to the head and advance both one step at a time; they meet at the entry node.",
        "",
        "#### Edge cases",
        "An empty list, a single node pointing to itself, and two nodes. Always test `fast and fast.next` before reading `fast.next.next`."
      ),
      follow: ["How would you find the length of the cycle?", "How would you detect a cycle if you were allowed to modify nodes, and what are the risks of marking them?"],
      tags: ["linked list", "two pointers", "cycle detection", "floyd"]
    }),
    Object.assign(meta('easy'), {
      id: "gen-26",
      short: "BFS explores a graph level by level using a FIFO queue: visit a node, enqueue its unvisited neighbours and mark them visited when enqueued. It reaches nodes in order of edge count, so the first time it reaches a node is a shortest path in an unweighted graph. It runs in O(V + E) time and O(V) space.",
      detail: L(
        "```python",
        "from collections import deque",
        "",
        "def shortest_path(graph, start, goal):",
        "    prev = {start: None}",
        "    q = deque([start])",
        "    while q:",
        "        node = q.popleft()",
        "        if node == goal:",
        "            path = []",
        "            while node is not None:",
        "                path.append(node)",
        "                node = prev[node]",
        "            return path[::-1]",
        "        for nxt in graph[node]:",
        "            if nxt not in prev:",
        "                prev[nxt] = node",
        "                q.append(nxt)",
        "    return None",
        "```",
        "",
        "**Mark nodes visited when you enqueue them**, not when you dequeue them. Otherwise the same node can be queued many times and the queue can blow up on dense graphs.",
        "",
        "#### Why it finds shortest paths",
        "The queue always holds nodes at distance d followed by nodes at distance d + 1, so nodes are dequeued in non-decreasing distance. This only holds when every edge costs the same; with weights use Dijkstra, and with only 0 and 1 weights use 0-1 BFS with a deque.",
        "",
        "#### Typical uses",
        "Fewest hops in a grid or social graph, level-order traversal of a tree, connected components and word-ladder problems. Memory is the usual limit: the queue can hold a whole level, which is large in wide graphs, whereas DFS holds only one path."
      ),
      follow: ["How would you run BFS from both ends to speed up a search?", "When would DFS be a better choice than BFS?"],
      tags: ["bfs", "graphs", "queue", "shortest path"]
    }),
    Object.assign(meta('hard'), {
      id: "gen-62",
      short: "Keep a hash map from key to node, a hash map from frequency to a doubly linked list of keys at that frequency (oldest first), and a minFreq variable. A get or put moves a key from list f to list f+1; eviction removes the oldest key in the minFreq list. Every operation is O(1).",
      detail: L(
        "**The structure**",
        "- `nodes`: key to its value, frequency and list node.",
        "- `buckets`: frequency to a doubly linked list of keys at that frequency, ordered by recency, so ties are broken by least recently used.",
        "- `minFreq`: the smallest frequency that currently has a non-empty bucket.",
        "",
        "#### Operations",
        "- **get(key)**: find the node, unlink it from `buckets[f]` and append it to `buckets[f+1]`. If `buckets[f]` is now empty and `f == minFreq`, increment `minFreq`.",
        "- **put(key, value)**: if the key exists, update the value and bump it as in get. Otherwise, if the cache is full, evict the head of `buckets[minFreq]`, then insert the new key into `buckets[1]` and set `minFreq = 1`.",
        "",
        "`minFreq` never needs a scan: after a bump it either stays (other keys remain at that frequency) or moves up by exactly one, and after an insert it resets to 1.",
        "",
        "#### Trade-offs and pitfalls",
        "- Pure LFU keeps formerly popular items forever (cache pollution). Real systems add aging or a window, as in TinyLFU and W-TinyLFU, which use a compact frequency sketch to save memory.",
        "- Handle capacity 0, and evict before inserting.",
        "- Under concurrency a single lock serializes everything; shard by key hash."
      ),
      follow: ["How would you add time-based aging so that old popular keys can be evicted?", "How does a Count-Min sketch reduce the memory needed for frequency tracking?"],
      tags: ["lfu", "cache", "doubly linked list", "data structures", "o(1)"]
    })
  ]);

  IGU.add([
    Object.assign(meta('hard'), {
      id: "gen-101", role: "general", level: 4, topic: "Concurrency",
      q: "How does a lock-free queue work, and what is the ABA problem?",
      short: "Lock-free structures use atomic compare-and-swap (CAS) instead of locks: a thread reads the state, prepares a change and retries if another thread changed it first, so some thread always makes progress. The ABA problem is when a value changes from A to B and back to A, so a CAS succeeds even though the structure changed underneath.",
      detail: L(
        "**How a CAS loop works**: read the head pointer, compute the new head, then `compareAndSet(old, new)`. If another thread won the race the CAS fails and you retry. A stalled thread cannot block the others, which is the difference between lock-free (the system as a whole makes progress) and wait-free (every thread makes progress).",
        "",
        "#### Michael-Scott queue",
        "A linked list with a dummy node, a `head` and a `tail`. Enqueue CASes the last node's `next` from null to the new node, then tries to swing `tail`; any thread that sees a lagging tail helps advance it. Dequeue CASes `head` to `head.next`.",
        "",
        "#### The ABA problem",
        "Thread 1 reads head = A and is paused. Thread 2 pops A, pops B and pushes A back, possibly reusing the same memory address. Thread 1 resumes, its CAS sees A and succeeds, but the `next` pointer it read earlier is stale, which corrupts the list.",
        "- **Tagged pointers or version counters**: pair the pointer with a counter that changes on every update (a double-width CAS).",
        "- **Safe memory reclamation**: hazard pointers or epoch-based reclamation stop a node from being freed and reused while another thread can still see it. Garbage-collected languages avoid most ABA problems because an address is not reused while it is referenced.",
        "",
        "#### When not to use it",
        "Lock-free code is hard to get right and is often not faster under low contention. Prefer a well-tested library queue and measure first."
      ),
      follow: ["What memory-ordering guarantees do you need around the CAS (acquire and release)?", "What is the difference between lock-free and wait-free?"],
      tags: ["lock-free", "cas", "concurrency", "aba", "atomic"]
    })
  ]);
})();
