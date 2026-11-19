/* Backend engineer. */
(function () {
  const IGU = window.IGU, L = IGU.L;
  IGU.add([
    {
      id: 'be-1', role: 'backend', level: 1, topic: 'APIs',
      q: 'What makes an API RESTful? Explain HTTP methods, status codes and idempotency.',
      short: "REST models things as resources addressed by URLs and manipulated with standard HTTP methods. GET, PUT and DELETE are idempotent (repeating them has the same effect as once); POST is not; status codes tell the client what happened.",
      detail: L(
        "#### Methods",
        "- **GET**: read, safe, idempotent.",
        "- **POST**: create or trigger an action, not idempotent.",
        "- **PUT**: replace a resource, idempotent.",
        "- **PATCH**: partial update, not guaranteed idempotent.",
        "- **DELETE**: remove, idempotent.",
        "",
        "#### Status codes to know",
        "200 OK, 201 Created (with a `Location` header), 204 No Content, 400 bad request, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 422 validation failed, 429 too many requests, 500 server error, 503 unavailable.",
        "",
        "#### Habits of a good REST API",
        "Plural nouns for resources (`/orders/42`), stateless requests, pagination for collections, a consistent error body, and versioning.",
        "",
        "Idempotency matters because networks retry: retrying a PUT is safe. For POST, accept an **idempotency key** so a retried request does not create a duplicate."
      ),
      follow: ['What is the difference between 401 and 403?', 'PUT versus PATCH?', 'How would you paginate a large collection?'],
      tags: ['rest', 'http', 'api', 'status codes', 'idempotent']
    },
    {
      id: 'be-2', role: 'backend', level: 1, topic: 'SQL',
      q: 'What is the difference between INNER JOIN and LEFT JOIN?',
      short: "INNER JOIN returns only rows with a match in both tables. LEFT JOIN returns every row from the left table and fills the right side with NULLs where there is no match.",
      detail: L(
        "```sql",
        "-- customers who placed orders",
        "SELECT c.name, o.id FROM customers c JOIN orders o ON o.customer_id = c.id;",
        "",
        "-- all customers; order columns are NULL when none exist",
        "SELECT c.name, o.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id;",
        "",
        "-- customers who never ordered",
        "SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL;",
        "```",
        "",
        "**Gotcha 1**: a condition on the right table in the `WHERE` clause of a LEFT JOIN removes the NULL rows and turns it into an inner join. Put such conditions in the `ON` clause.",
        "",
        "**Gotcha 2**: joining a one-to-many relationship multiplies rows, so aggregates over the parent can double count. Aggregate first or use `COUNT(DISTINCT ...)`.",
        "",
        "A primary key uniquely identifies a row; a foreign key refers to another table's primary key and enforces referential integrity."
      ),
      follow: ['How do you find customers who never placed an order?', 'What does a FULL OUTER JOIN do?', 'Why did my SUM double after adding a join?'],
      tags: ['sql', 'join', 'inner join', 'left join', 'database']
    },
    {
      id: 'be-3', role: 'backend', level: 2, topic: 'Databases',
      q: 'Explain ACID and transaction isolation levels. What anomalies can occur?',
      short: "ACID means a transaction is all-or-nothing (Atomic), keeps data valid (Consistent), is shielded from concurrent work to a degree set by its isolation level (Isolated), and survives crashes (Durable). Isolation levels trade anomalies for concurrency.",
      detail: L(
        "#### Anomalies",
        "Dirty read, non-repeatable read, phantom read, lost update, write skew.",
        "",
        "#### Isolation levels (SQL standard)",
        "- **Read uncommitted**: allows dirty reads, rarely used.",
        "- **Read committed**: no dirty reads. Default in PostgreSQL and Oracle.",
        "- **Repeatable read**: same row reads the same twice. Default in MySQL InnoDB. PostgreSQL's version is snapshot isolation, which also avoids phantoms but not write skew.",
        "- **Serializable**: behaves as if transactions ran one at a time. PostgreSQL may abort some, so the application must retry.",
        "",
        "#### Mechanisms",
        "MVCC lets readers avoid blocking writers. Locks (`SELECT ... FOR UPDATE`) serialise access to specific rows. Optimistic concurrency uses a version column and fails the update if the version changed.",
        "",
        "**Lost update example**: two requests read balance 100 and each write back 90. Fix with an atomic `UPDATE accounts SET balance = balance - 10 WHERE id = 1`, a row lock, or a version check.",
        "",
        "Choose the weakest level that still protects your invariants, and retry on serialisation failures."
      ),
      follow: ['What is write skew? Give an example.', 'How does MVCC work?', 'Optimistic versus pessimistic locking?'],
      tags: ['acid', 'transaction', 'isolation', 'mvcc', 'database', 'locking']
    },
    {
      id: 'be-4', role: 'backend', level: 2, topic: 'Caching',
      q: 'Describe caching strategies and how you deal with invalidation and cache stampedes.',
      short: "Cache-aside is the usual pattern: check the cache, on a miss read the database and fill the cache with a TTL. The hard parts are invalidation, stampedes when a hot key expires, and stale reads.",
      detail: L(
        "#### Patterns",
        "- **Cache-aside**: the application manages the cache.",
        "- **Read-through**: the cache loads data itself.",
        "- **Write-through**: write cache and database together. Consistent but slower writes.",
        "- **Write-behind**: write the database asynchronously. Fast, but risks losing data.",
        "",
        "#### Invalidation",
        "TTLs are simplest. Delete-on-write (update the database, then delete the key) is common, but a concurrent read can refill the cache with the old value, so keep a TTL as a safety net. Versioned keys avoid invalidation entirely.",
        "",
        "#### Stampede (many misses at once)",
        "Request coalescing (single-flight), a lock around the refill, jittered TTLs, refresh-ahead, or serving stale data while revalidating in the background.",
        "",
        "#### Other issues",
        "Cache penetration (lookups for keys that do not exist): cache negative results or use a Bloom filter. Eviction policy: LRU or LFU.",
        "",
        "Cache what is read-heavy, expensive, and tolerant of staleness. Track hit ratio and latency."
      ),
      follow: ['How do you prevent a cache stampede?', 'How would you cache user-specific data?', 'Redis versus an in-process cache?'],
      tags: ['cache', 'redis', 'invalidation', 'stampede', 'ttl', 'performance']
    },
    {
      id: 'be-5', role: 'backend', level: 2, topic: 'Security',
      q: 'What is the difference between authentication and authorization? Sessions versus JWTs?',
      short: "Authentication proves who you are; authorization decides what you may do. Server-side sessions are easy to revoke; JWTs are self-contained and scale across services but are hard to revoke, so keep them short-lived.",
      detail: L(
        "#### Sessions",
        "A random ID in a cookie, with state kept server-side (often Redis). Revocation is instant. Needs a shared store.",
        "",
        "#### JWT",
        "A signed token (header.payload.signature) carrying claims such as `sub`, `exp` and scopes. Any service can verify it locally with no lookup. The payload is encoded, **not encrypted**, so never put secrets in it.",
        "",
        "Weaknesses and fixes: revocation (short expiry plus refresh tokens, or a deny list), algorithm confusion (pin accepted algorithms; always validate `iss`, `aud` and `exp`), and theft (store carefully).",
        "",
        "#### Passwords",
        "Hash with Argon2id, bcrypt or scrypt with a per-user salt. Never encrypt passwords for storage or use plain MD5 or SHA-1.",
        "",
        "#### Authorization",
        "Enforce it on the server on every request. Check object-level access too, or you get IDOR bugs (changing `/orders/42` to `/orders/43`). Prefer an established OAuth2/OIDC provider over rolling your own."
      ),
      follow: ['How would you revoke a JWT?', 'Access tokens versus refresh tokens?', 'What is an IDOR vulnerability?'],
      tags: ['authentication', 'authorization', 'jwt', 'session', 'security', 'oauth']
    },
    {
      id: 'be-6', role: 'backend', level: 3, topic: 'Distributed systems',
      q: 'Explain the CAP theorem and how it affects your choice of database.',
      short: "When a network partition happens, a distributed system must choose between consistency (reads see the latest write) and availability (every request gets a response). With no partition you can have both, so the everyday trade-off is consistency versus latency.",
      detail: L(
        "Partitions cannot be avoided in a distributed system, so the real choice is what to give up **during** one.",
        "",
        "- **CP systems** refuse or fail some requests to stay consistent (etcd, ZooKeeper, HBase, Spanner-style systems).",
        "- **AP systems** keep answering with possibly stale data and reconcile later (Cassandra and Dynamo-style stores, at default settings).",
        "",
        "**PACELC** extends this: even without a partition, you trade latency against consistency.",
        "",
        "#### Consistency is a spectrum",
        "Linearizable, sequential, causal, read-your-writes, eventual.",
        "",
        "#### Choosing",
        "Money movement, inventory decrements and leader election need strong consistency. Feeds, likes, counters and catalogue browsing usually tolerate eventual consistency.",
        "",
        "Tools: quorums (R + W > N guarantees reads overlap the latest write), idempotent merges, CRDTs, careful conflict resolution (last-write-wins silently loses data).",
        "",
        "Avoid the shallow 'pick two of three'. Many databases are tunable per query, so the answer often depends on configuration."
      ),
      follow: ['What is a quorum?', 'How would you explain eventual consistency to a product manager?', 'What does PACELC add?'],
      tags: ['cap', 'consistency', 'availability', 'distributed', 'database', 'pacelc']
    },
    {
      id: 'be-7', role: 'backend', level: 3, topic: 'Payments',
      q: 'Design a payment API so that retries never charge a customer twice.',
      short: "Require a client-generated idempotency key on every payment request, store the key with a fingerprint of the request and its result in the same transaction as the payment, and return the stored result for any retry.",
      detail: L(
        "**Problem**: a timeout leaves the client not knowing whether the charge happened. A naive retry double charges.",
        "",
        "#### Flow",
        "1. Client sends `Idempotency-Key: <uuid>`.",
        "2. Server inserts a row for the key (unique constraint) with status `in_progress` and a hash of the request.",
        "3. If the key already exists: same hash and completed means return the saved response; in progress means respond 409 or wait; a different hash means reject with 422.",
        "4. Perform the charge, save the response and mark the key completed, in the same transaction as the business write.",
        "",
        "#### Calling an external payment provider",
        "Pass your own key downstream. If the service crashes between the provider call and saving the result, a reconciliation step queries the provider to find out what happened.",
        "",
        "#### Supporting design",
        "A payment state machine, a double-entry ledger, the transactional outbox pattern for events, deduplication of webhooks and queue messages by event id, key expiry (for example after 24 hours), audit logs and daily reconciliation against provider reports."
      ),
      follow: ['What if the service crashes after charging but before saving?', 'Is exactly-once delivery possible?', 'How do you reconcile with the payment provider?'],
      tags: ['payments', 'idempotency', 'fintech', 'api design', 'retries', 'outbox']
    },
    {
      id: 'be-8', role: 'backend', level: 3, topic: 'Performance',
      q: 'A database query is slow in production. How do you investigate and fix it?',
      short: "Confirm it is the query (metrics, slow query log), read its execution plan with EXPLAIN ANALYZE, fix the cause (missing or unusable index, bad join, too many rows, stale statistics, lock waits), and verify on production-like data.",
      detail: L(
        "1. **Scope**: since when, which endpoints, what changed (deploy, data growth, traffic).",
        "2. **Capture** the exact query and parameters (`pg_stat_statements`, slow query log).",
        "3. **Read the plan** with `EXPLAIN (ANALYZE, BUFFERS)`. Look for sequential scans on large tables, large gaps between estimated and actual rows (stale statistics: run `ANALYZE`), sorts spilling to disk, and nested loops over big inputs.",
        "4. **Fix**:",
        "   - Add a composite index matching the filters and sort order (column order matters).",
        "   - Do not wrap indexed columns in functions (`WHERE date(created_at) = ...`).",
        "   - Select only the columns you need.",
        "   - Use keyset pagination instead of large `OFFSET`.",
        "   - Pre-aggregate or denormalise for heavy reports.",
        "5. **Check waits**: blocked sessions, lock contention and connection pool exhaustion can look like a slow query.",
        "6. **Mitigate quickly** if needed: kill the runaway query, route reads to a replica, add caching.",
        "7. **Prevent**: alerting on query latency, and review plans for new queries.",
        "",
        "Indexes cost write speed and space. On a huge live table create them without blocking writes (for example `CREATE INDEX CONCURRENTLY` in PostgreSQL)."
      ),
      follow: ['Why might the planner ignore your index?', 'What is wrong with OFFSET pagination?', 'How do you add an index to a huge live table safely?'],
      tags: ['sql', 'slow query', 'explain', 'index', 'performance', 'postgres', 'debug']
    },
    {
      id: 'be-9', role: 'backend', level: 4, topic: 'Architecture',
      q: 'How would you migrate a monolith to microservices?',
      short: "Do not migrate for its own sake. Fix the pain you actually have, extract services incrementally with the strangler pattern along clear business boundaries, and invest in the platform (CI/CD, observability, ownership) before multiplying services.",
      detail: L(
        "**First ask why**: deploy coupling, scaling hotspots, team autonomy, technology limits? A well-structured modular monolith often solves it at far lower cost.",
        "",
        "#### If you proceed",
        "- Find bounded contexts (domain-driven design). Start with seams that have low entanglement or a high rate of change.",
        "- Put a facade or API gateway in front, extract one slice, run it in shadow or parallel, then cut traffic over.",
        "- Each service owns its data. Avoid a shared database. Handle cross-service consistency with sagas, the outbox pattern and eventual consistency.",
        "- Avoid a distributed monolith: chatty synchronous calls and lockstep deploys.",
        "",
        "#### Prerequisites",
        "Automated tests, CI/CD, distributed tracing and logging, SLOs and on-call.",
        "",
        "#### Costs to state honestly",
        "Network failure modes, latency, operational load, and harder data joins.",
        "",
        "Measure success by deploy frequency, lead time and change failure rate, not by number of services."
      ),
      follow: ['How would you split the database?', 'How do you handle transactions across services?', 'When would you decide not to use microservices?'],
      tags: ['microservices', 'monolith', 'architecture', 'strangler', 'migration', 'ddd']
    }
  ]);
})();
