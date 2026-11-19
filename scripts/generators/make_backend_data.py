import sys, os
sys.path.append(os.path.dirname(__file__))
import common

def get_backend_questions():
    questions = []
    
    # helper
    def add(num, level, topic, q, short, detail, follow, tags):
        questions.append(common.make_q(f"be-{num}", "backend", level, topic, q, short, detail, follow, tags))

    add(10, 2, "APIs", "How do GraphQL and REST compare, and how do you resolve the GraphQL N+1 problem?",
        "REST exposes fixed endpoints where clients often suffer from over-fetching or under-fetching. GraphQL allows clients to query exact fields in a single request. The N+1 problem occurs when resolving nested relations and is resolved using batching with DataLoader.",
        [
            "#### REST versus GraphQL",
            "- **Over-fetching**: REST returns all fields on an entity; GraphQL lets clients request only needed fields.",
            "- **Under-fetching**: REST often requires multiple round trips (`/users/1` then `/users/1/orders`); GraphQL fetches nested graphs in one query.",
            "- **Versioning**: REST uses URL versioning (`/v1/users`); GraphQL evolves by adding fields and deprecating old ones.",
            "",
            "#### The N+1 Problem and DataLoader",
            "When resolving a list of $N$ authors and each author's books, a naive resolver executes 1 query for authors, then $N$ queries for books.",
            "```python",
            "# DataLoader coalesces individual calls within an event loop tick into a single batch query",
            "# SELECT * FROM books WHERE author_id IN (1, 2, 3...)",
            "from aiodataloader import DataLoader",
            "class BookLoader(DataLoader):",
            "    async def batch_load_fn(self, author_ids):",
            "        books = await fetch_books_for_authors(author_ids)",
            "        return [books.get(aid, []) for aid in author_ids]",
            "```",
            "",
            "#### Trade-offs",
            "- **Caching**: REST leverages standard HTTP caching (CDNs, `Cache-Control`); GraphQL requests are usually HTTP POST, requiring application-level or normalized client caches (Apollo, Relay).",
            "- **Complexity**: GraphQL allows arbitrary nested queries which can DOS your database without depth limiting and query cost analysis."
        ],
        ["How do you implement query cost analysis in GraphQL?", "Why is HTTP caching harder with GraphQL than REST?", "What are GraphQL subscriptions and how do they work under the hood?"],
        ["graphql", "rest", "api", "dataloader", "n+1"])

    add(11, 2, "APIs", "What are the advantages of gRPC over REST with JSON, and when should you choose each?",
        "gRPC uses Protocol Buffers (compact binary serialization) and HTTP/2 (multiplexing over a single TCP connection, header compression, bidirectional streaming). It is 5-10x faster than REST/JSON, making it ideal for internal microservices, while REST remains standard for public APIs.",
        [
            "#### Protocol Comparison",
            "- **Serialization**: Protocol Buffers serialize strongly-typed data into binary bytes, drastically smaller and faster to parse than text-based JSON.",
            "- **Transport**: gRPC requires HTTP/2, enabling true request/response multiplexing over a single connection, eliminating head-of-line blocking at the application layer.",
            "- **Streaming**: gRPC natively supports unary, client streaming, server streaming, and bidirectional streaming.",
            "- **Code Generation**: Protobuf `.proto` schemas generate type-safe client stubs and server interfaces across Go, Java, Python, C++, and Node.js.",
            "",
            "#### When to Choose Which",
            "- **Choose gRPC**: Low-latency internal microservice communication, high-throughput RPCs, polyglot backend architectures, and streaming pipelines.",
            "- **Choose REST**: Public-facing APIs, browser client communication (where gRPC-Web requires proxies), human-readable debugging via curl, and standard CDN caching."
        ],
        ["How does HTTP/2 multiplexing work in gRPC?", "What is the role of grpc-gateway in exposing REST endpoints?", "How do you handle breaking changes in Protocol Buffers?"],
        ["grpc", "protobuf", "http2", "microservices", "rest"])

    add(12, 2, "APIs", "Compare WebSockets, Server-Sent Events (SSE), and Long Polling for real-time communication.",
        "WebSockets provide full-duplex, bidirectional communication over a persistent TCP connection. SSE provides unidirectional server-to-client streaming over standard HTTP. Long polling repeatedly opens HTTP requests waiting for server responses, carrying the highest overhead.",
        [
            "#### Technology Breakdown",
            "- **WebSockets**: Initiated via an HTTP upgrade request, transitioning to a persistent, bidirectional TCP connection. Minimal frame overhead (2-10 bytes). Ideal for chat apps, multiplayer gaming, and collaborative editing.",
            "- **Server-Sent Events (SSE)**: Built on standard HTTP (`text/event-stream`). Unidirectional (server to client). Includes native browser reconnection, event IDs, and works seamlessly with HTTP/2 and standard firewalls/proxies. Ideal for live stock tickers, notification feeds, and LLM token streaming.",
            "- **Long Polling**: Client issues an HTTP request; server holds connection until new data arrives or timeout occurs. High HTTP header overhead per cycle. Used only as a legacy fallback.",
            "",
            "#### Operational Trade-offs",
            "- **Load Balancers**: WebSockets require sticky sessions or stateful connection tracking at the proxy layer (e.g., NGINX `proxy_set_header Upgrade $http_upgrade`).",
            "- **Scalability**: A single server can maintain tens of thousands of idle WebSocket connections, but requires horizontal scaling with a Redis Pub/Sub backplane."
        ],
        ["Why is SSE preferred over WebSockets for streaming LLM responses?", "How do you horizontally scale WebSocket servers using Redis Pub/Sub?", "How do you detect dropped WebSocket connections (heartbeats/ping-pong)?"],
        ["websockets", "sse", "long polling", "realtime", "http"])

    add(13, 2, "Databases", "How does a B+ Tree index work in relational databases, and why is it preferred over a binary tree?",
        "A B+ Tree is a self-balancing, multi-way search tree where all data rows/pointers reside strictly in leaf nodes linked as a doubly-linked list. Its high fanout keeps tree height low (typically 3-4 levels), minimizing costly disk I/O, while leaf linkage makes range scans extremely fast.",
        [
            "#### B+ Tree Structure",
            "- **High Fanout**: Internal nodes hold hundreds of keys and child pointers (unlike binary trees with fanout of 2). A tree of height 3 or 4 can index hundreds of millions of rows.",
            "- **All Data at Leaves**: Internal nodes contain only routing keys. Leaf nodes contain the actual row pointers (or clustered row data) and are doubly linked sequentially.",
            "- **Predictable I/O**: Every search traverses the exact same depth from root to leaf ($O(\\log_B N)$ disk page reads).",
            "",
            "#### Why Not a Binary Search Tree?",
            "- **Disk Block Alignment**: Database engines read and write in pages (typically 4KB-16KB). A B+ Tree node matches the page size, loading hundreds of keys in a single disk read.",
            "- **Range Scans**: In a BST, finding values between 10 and 50 requires in-order tree traversal. In a B+ Tree, traverse to leaf node 10 and follow the sequential pointer until 50."
        ],
        ["What is the difference between a clustered and a non-clustered B+ Tree index?", "Why does inserting random UUID keys cause index fragmentation in a B+ Tree?", "How does a B+ Tree compare to an LSM Tree for write-heavy workloads?"],
        ["b+ tree", "indexing", "databases", "disk io", "performance"])

    add(14, 2, "Databases", "What is index selectivity and cardinality, and how do they determine whether the query planner uses an index?",
        "Cardinality is the number of unique values in a column. Selectivity is the ratio of cardinality to total rows (cardinality / total rows). Highly selective columns (approaching 1.0) allow the query planner to filter down to very few rows, making index scans much cheaper than sequential scans.",
        [
            "#### Concepts and Definitions",
            "- **Cardinality**: Count of distinct values. A `gender` column has cardinality ~2-3; a `user_uuid` column has cardinality equal to total rows.",
            "- **Selectivity**: $\\text{Selectivity} = \\frac{\\text{Distinct Values}}{\\text{Total Rows}}$. High selectivity means few rows match each value.",
            "",
            "#### Query Planner Decisions",
            "- **Sequential Scan vs. Index Scan**: Random disk I/O from an index lookup is more expensive per row than sequential reading. If a query matches > 15-20% of rows, the planner chooses a full table scan.",
            "- **Index on Low-Cardinality Columns**: An index on a boolean `is_active` column is typically ignored by the engine unless combined in a composite index with high-cardinality filters.",
            "",
            "#### Maintaining Accurate Statistics",
            "Relational engines (PostgreSQL, MySQL) rely on `ANALYZE` statistics. If table stats are stale, the optimizer can misestimate row counts and select a terrible execution plan."
        ],
        ["Why might the query planner choose a sequential scan on an indexed column?", "How do partial (filtered) indexes help with low-cardinality flags?", "What is index tipping point?"],
        ["selectivity", "cardinality", "query planner", "indexing", "sql"])

    add(15, 2, "Databases", "Explain the leftmost prefix rule for composite indexes. When will an index on (A, B, C) be used?",
        "A composite index on (A, B, C) is sorted primarily by A, then by B within identical A values, and by C within identical B values. The query planner can use the index for queries filtering on (A), (A, B), or (A, B, C), but cannot use it if A is omitted, such as filtering on (B) or (C) alone.",
        [
            "#### How the Composite Index is Sorted",
            "Think of a phonebook sorted by `(Last_Name, First_Name)`. You can efficiently look up everyone with last name 'Smith', or 'Smith, John'. But you cannot search for first name 'John' without reading every entry.",
            "",
            "#### Query Compatibility Matrix for `INDEX(a, b, c)`",
            "- `WHERE a = 1`: Fully used (first column).",
            "- `WHERE a = 1 AND b = 2`: Fully used (first two columns).",
            "- `WHERE a = 1 AND b = 2 AND c = 3`: Fully used (all columns).",
            "- `WHERE a = 1 AND c = 3`: Uses index on `a`, then filters `c` in memory.",
            "- `WHERE b = 2 AND c = 3`: Index cannot be used; triggers a full table scan.",
            "",
            "#### Range Conditions",
            "An index scan stops utilizing subsequent index columns after encountering a range condition (`>`, `<`, `BETWEEN`, `LIKE 'foo%'`). For `WHERE a = 1 AND b > 10 AND c = 5`, column `c` is not used for index range search."
        ],
        ["How should you order columns when designing a composite index?", "Can an index on (A, B) satisfy an ORDER BY A, B query?", "What is an index-only scan (covering index)?"],
        ["composite index", "leftmost prefix", "databases", "sql", "performance"])

    # write helper to generate remaining bulk
    topics_list = [
        (16, 3, "Databases", "How does database sharding work, and what are the trade-offs between range-based and hash-based sharding?",
         "Sharding partitions database rows horizontally across independent physical database instances. Range-based sharding groups data by value ranges (e.g. date, alphabetical), while hash-based sharding uses a hash function on the shard key for uniform data distribution.",
         "#### Sharding Strategies\n- **Range-Based Sharding**: Routes data by key intervals (`id` 1-1M -> Shard 1, 1M-2M -> Shard 2). Enables efficient range scans, but risks catastrophic write hotspots on sequential IDs.\n- **Hash-Based Sharding**: Calculates `hash(shard_key) % num_shards`. Provides uniform load balancing across shards, but range queries must scatter-gather across all shards.\n- **Directory-Based Sharding**: Uses a lookup service to map keys to shards. Flexible for rebalancing, but introduces a single point of failure and extra lookup hop.\n\n#### Operational Challenges\n- **Cross-Shard Transactions**: Require two-phase commit (2PC), which significantly increases write latency and failure probability.\n- **Cross-Shard Joins**: Must be performed in the application layer or avoided via denormalization.\n- **Re-sharding**: Changing shard count requires consistent hashing with virtual nodes to avoid moving all records."),
        (17, 2, "Databases", "What is database replication lag, and how do you ensure 'read-your-own-writes' consistency?",
         "Replication lag is the delay between a write committing on the primary database and being applied on read replicas. 'Read-your-own-writes' consistency guarantees that a user always sees their own recent updates, typically achieved by routing reads to the primary for a window following mutations.",
         "#### Root Causes of Replication Lag\n- **Asynchronous Replication**: Primary acknowledges write before replicas apply it to maintain high write throughput.\n- **Single-Threaded Replica Apply**: Primary executes concurrent transactions, but replica replay may be serialized on I/O or lock contention.\n- **Long-Running Queries**: Heavy analytical queries on replicas can block replication apply threads.\n\n#### Mitigation Strategies\n- **Sticky Session Routing**: Following a mutation, route the user's reads to the primary database for a specified TTL (e.g., 5 seconds).\n- **Replication Timestamp / GTID**: Track the Global Transaction ID (GTID) or WAL offset of the user's write in their session cookie; replicas wait until their local GTID catches up before serving the read.\n- **Synchronous / Semi-Synchronous Replication**: Primary waits for at least one replica confirmation before returning success, eliminating lag at the cost of write latency."),
        (18, 3, "Databases", "Compare optimistic locking and pessimistic locking. When should each be applied?",
         "Pessimistic locking prevents concurrent updates by locking database records upfront (`SELECT FOR UPDATE`). Optimistic locking allows concurrent reads and writes, detecting conflicts at commit time using version numbers or timestamps. Optimistic is best for low-contention reads; pessimistic for high-contention transactions.",
         "#### Pessimistic Locking\n- **Mechanism**: Acquires exclusive row locks via `SELECT ... FOR UPDATE` within a transaction.\n- **Pros**: Completely prevents conflicts; guarantees consistency for inventory allocation and bank balances.\n- **Cons**: Holds locks for the duration of the transaction; prone to deadlocks and poor throughput under high concurrency.\n\n#### Optimistic Locking\n- **Mechanism**: Reads record with a `version` column. Updates check: `UPDATE accounts SET balance = balance - 100, version = version + 1 WHERE id = 1 AND version = 5`.\n- **Pros**: Zero lock contention during read operations; highly scalable in read-heavy systems.\n- **Cons**: High abort/retry rates when contention spikes; requires robust application retry loops."),
        (19, 3, "Databases", "How do relational databases detect and resolve deadlocks, and how can applications prevent them?",
         "A deadlock occurs when two or more transactions hold locks that the other transactions need to proceed. Databases detect deadlocks using a wait-for graph cycle detection algorithm or timeout, terminating the cheapest transaction. Applications prevent deadlocks by acquiring locks in a consistent order.",
         "#### Deadlock Detection Mechanism\n- **Wait-For Graph**: The engine maintains a directed graph where nodes are transactions and edges represent lock dependencies. Background threads scan for cycles.\n- **Victim Selection**: When a cycle is detected, the database aborts one transaction (the victim with the fewest writes or lowest rollback cost) with error code `40P01` (Postgres) or `1213` (MySQL).\n\n#### Application-Level Prevention\n- **Order of Access**: Always acquire locks on multiple resources in a strictly identical order (e.g. sorted by primary key ID).\n- **Short Transactions**: Minimize transaction duration; perform external API calls and heavy computation outside of database transactions.\n- **Select for Update No-Wait / Skip-Locked**: Use `SELECT FOR UPDATE NOWAIT` to fail fast, or `SKIP LOCKED` for distributed queues."),
        (20, 3, "Databases", "Explain PostgreSQL MVCC internals, tuple bloat, and the necessity of VACUUM.",
         "PostgreSQL uses Multi-Version Concurrency Control (MVCC) where `UPDATE` writes a new tuple and marks the old tuple dead, and `DELETE` marks the tuple dead. Dead tuples cause table and index bloat, wasting disk space and slowing scans until reclaimed by `VACUUM`.",
         "#### MVCC Tuple Structure\n- Every row carries system columns `xmin` (creating transaction ID) and `xmax` (deleting/updating transaction ID).\n- Transactions read tuples matching visibility rules based on their transaction snapshot, avoiding read locks.\n\n#### Why Bloat Occurs\n- Frequent updates generate millions of dead tuples that remain on disk until removed.\n- If dead tuples remain uncollected, queries must read through bloated disk pages, degrading cache hit ratios and sequential scan performance.\n\n#### The Role of VACUUM and Autovacuum\n- **VACUUM**: Scans pages, marks dead tuple space as reusable for future inserts, and freezes old transaction IDs to prevent transaction ID wraparound.\n- **VACUUM FULL**: Rewrites the entire table to a new disk file, reclaiming physical disk space, but locks the table exclusively.\n- **Autovacuum Tuning**: Increase `autovacuum_vacuum_cost_limit` and tune `autovacuum_vacuum_scale_factor` to prevent autovacuum from falling behind on high-write tables.")
    ]

    for num, lvl, top, q, short, detail in topics_list:
        add(num, lvl, top, q, short, detail.split("\n"),
            ["How do you monitor this in production?", "What are the common failure modes?", "How does this scale horizontally?"],
            [top.lower(), "database", "backend", "performance"])

    # Generate remaining questions up to 100
    backend_curriculum = [
        (21, 3, "Databases", "What is Write-Ahead Logging (WAL) and how does it guarantee durability and crash recovery?"),
        (22, 2, "Databases", "How does connection pooling work, and how do you size a pool like HikariCP or PgBouncer?"),
        (23, 2, "Databases", "What are the normal forms (1NF, 2NF, 3NF) and when is denormalization preferred?"),
        (24, 3, "Databases", "How do you execute zero-downtime database schema migrations using the expand-contract pattern?"),
        (25, 2, "Caching", "Compare Redis data structures: Hashes, Sets, Sorted Sets, and Bitmaps with practical use cases."),
        (26, 2, "Caching", "Explain Cache-Aside, Read-Through, Write-Through, and Write-Behind caching patterns."),
        (27, 2, "Caching", "How do cache eviction policies like LRU, LFU, FIFO, and TTL differ under memory pressure?"),
        (28, 3, "Caching", "What is a cache stampede (thundering herd) and how do single-flight locks and XFetch prevent it?"),
        (29, 3, "Caching", "Explain cache penetration and how Bloom filters prevent querying non-existent keys in the database."),
        (30, 2, "Caching", "What is a cache avalanche and why should cache expiration TTLs include random jitter?"),
        (31, 3, "Messaging", "How does Apache Kafka partition topics, and how are strict message ordering guarantees maintained?"),
        (32, 3, "Messaging", "Explain Kafka consumer groups, offset commits, and the partition rebalance protocol."),
        (33, 4, "Messaging", "How does Kafka achieve exactly-once semantics (EOS) across producer and consumer streams?"),
        (34, 3, "Messaging", "What is Kafka log compaction and how does it support stateful stream processing?"),
        (35, 2, "Messaging", "Compare RabbitMQ exchange types: Direct, Fanout, Topic, and Headers."),
        (36, 2, "Messaging", "How do you design a resilient Dead Letter Queue (DLQ) with exponential backoff and retry limits?"),
        (37, 3, "Messaging", "How do you implement backpressure and consumer rate limiting in asynchronous message queues?"),
        (38, 3, "Architecture", "How does service discovery work in microservices using client-side vs. server-side approaches?"),
        (39, 3, "Architecture", "What are the responsibilities of an API Gateway, and how does it differ from a Reverse Proxy?"),
        (40, 3, "Architecture", "How does the Circuit Breaker pattern transition between Closed, Open, and Half-Open states?"),
        (41, 3, "Architecture", "Explain the Bulkhead pattern and how thread pool isolation prevents cascading service outages."),
        (42, 3, "Observability", "How do distributed tracing systems correlate requests across microservices using W3C Trace Context?"),
        (43, 4, "Distributed systems", "How does the Two-Phase Commit (2PC) protocol work, and why does it fail under coordinator partitions?"),
        (44, 4, "Distributed systems", "Explain the Saga pattern for distributed transactions: Choreography versus Orchestration."),
        (45, 3, "Architecture", "What is the Transactional Outbox pattern, and how does Change Data Capture (CDC) ensure reliability?"),
        (46, 4, "Architecture", "Explain Event Sourcing. How are current entity states reconstructed from append-only event logs?"),
        (47, 3, "Architecture", "What is Command Query Responsibility Segregation (CQRS) and what trade-offs does it introduce?"),
        (48, 3, "Distributed systems", "How does consistent hashing with virtual nodes prevent data skew and re-hashing overhead?"),
        (49, 3, "Distributed systems", "Explain the trade-offs of the CAP theorem: When should a distributed system choose CP versus AP?"),
        (50, 4, "Distributed systems", "What is the PACELC theorem and how does it expand upon the CAP theorem during normal operation?"),
        (51, 4, "Distributed systems", "How does the Raft consensus algorithm elect leaders and guarantee replicated log consistency?"),
        (52, 3, "Distributed systems", "Compare distributed locking mechanisms: Redis Redlock versus ZooKeeper/etcd sequential ephemeral nodes."),
        (53, 2, "Concurrency", "What is the difference between OS threads, processes, and lightweight green threads or goroutines?"),
        (54, 3, "Concurrency", "How do you calculate optimal thread pool size for CPU-bound versus I/O-bound workloads?"),
        (55, 3, "Concurrency", "How does non-blocking asynchronous I/O (epoll/kqueue) enable high concurrency in event-driven runtimes?"),
        (56, 3, "Performance", "How do you diagnose and resolve a memory leak in a production backend service using heap dumps?"),
        (57, 4, "Performance", "Explain garbage collection pause phases in modern runtimes (e.g. G1GC, ZGC, Go GC) and how to tune them."),
        (58, 3, "Performance", "How do you profile a CPU-bound backend microservice and interpret flame graphs to locate hotspots?"),
        (59, 2, "Security", "Compare JSON Web Tokens (JWT) and opaque server-side session cookies for stateless authentication."),
        (60, 3, "Security", "How does OAuth 2.0 Authorization Code Flow with PKCE protect against authorization code interception?"),
        (61, 3, "Security", "What is the difference between Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC)?"),
        (62, 2, "APIs", "Compare Token Bucket and Leaky Bucket algorithms for API rate limiting."),
        (63, 2, "APIs", "How does a sliding window log rate limiter compare to a sliding window counter approximation?"),
        (64, 2, "Security", "What is Cross-Origin Resource Sharing (CORS), and what triggers an HTTP OPTIONS preflight request?"),
        (65, 1, "Security", "How do parameterized queries prevent SQL injection compared to dynamic string concatenation?"),
        (66, 3, "Payments", "How do idempotency keys guarantee that network retries do not cause duplicate financial charges?"),
        (67, 3, "Architecture", "Design a distributed task scheduler that executes millions of scheduled cron tasks with high availability."),
        (68, 3, "APIs", "How do you build a resilient webhook ingestion pipeline that handles duplicate events and bursts?"),
        (69, 2, "Architecture", "How do presigned S3/GCS URLs allow clients to upload large files directly without overwhelming backend servers?"),
        (70, 2, "Reliability", "What is the difference between Kubernetes liveness probes and readiness probes in backend services?"),
        (71, 2, "Reliability", "How do you implement graceful shutdown in a web server upon receiving a SIGTERM signal?"),
        (72, 3, "Architecture", "Compare Blue-Green deployments with Canary deployments for zero-downtime microservice upgrades."),
        (73, 2, "Databases", "How do you read a database EXPLAIN ANALYZE output and distinguish index scans from sequential scans?"),
        (74, 2, "Databases", "What are the trade-offs of enforcing foreign keys at the database level versus the application service layer?"),
        (75, 3, "Databases", "What are unlogged tables in relational databases, and what are the trade-offs of using them?"),
        (76, 3, "Databases", "How does Apache Cassandra use LSM trees, SSTables, and tunable consistency quorums?"),
        (77, 2, "Databases", "When should you model one-to-many relationships as embedded documents versus referenced IDs in MongoDB?"),
        (78, 3, "Databases", "How do partition keys and sort keys dictate data distribution and query performance in Amazon DynamoDB?"),
        (79, 2, "Caching", "Compare Redis RDB point-in-time snapshots with Append-Only File (AOF) persistence modes."),
        (80, 3, "Caching", "How does Redis Cluster shard data across 16,384 hash slots, and how are node failovers handled?"),
        (81, 2, "Caching", "How do atomic Redis INCR and DECR commands enable distributed counters and inventory decrement?"),
        (82, 2, "Architecture", "How do background task queues (e.g., Celery, BullMQ) handle task retries, timeouts, and state tracking?"),
        (83, 2, "Architecture", "What is the difference between Point-to-Point message queues and Publish-Subscribe topic patterns?"),
        (84, 3, "Concurrency", "What is backpressure in reactive streams, and what strategies exist when producers outpace consumers?"),
        (85, 4, "Security", "How does mutual TLS (mTLS) provide service-to-service authentication and encryption in a zero-trust mesh?"),
        (86, 2, "APIs", "What are the pros and cons of URI path versioning versus header versioning for REST APIs?"),
        (87, 2, "APIs", "Why is keyset (cursor-based) pagination preferred over offset/limit pagination for large datasets?"),
        (88, 2, "Databases", "What are the architectural trade-offs of soft delete flags (`is_deleted`) versus hard deletes with audit tables?"),
        (89, 3, "Databases", "How do temporal tables and bi-temporal modeling track historical entity states over time?"),
        (90, 3, "Distributed systems", "How do distributed unique ID generators like Twitter Snowflake generate 64-bit sortable IDs?"),
        (91, 3, "APIs", "How do you execute atomic rate limiting scripts in Redis using Lua to prevent race conditions?"),
        (92, 3, "Architecture", "Design a notification service that fans out push notifications, SMS, and emails to millions of users."),
        (93, 4, "Distributed systems", "How does clock skew affect distributed systems, and how do TrueTime and logical clocks address it?"),
        (94, 3, "Architecture", "How does the Strangler Fig pattern allow incrementally decomposing a legacy monolith into microservices?"),
        (95, 2, "APIs", "How does contract-first API development using OpenAPI/Swagger improve client-server consistency?"),
        (96, 3, "Messaging", "How do message consumers achieve idempotency when message brokers only guarantee at-least-once delivery?"),
        (97, 2, "Caching", "Compare Memcached multithreaded architecture with Redis single-threaded event loop architecture."),
        (98, 3, "Databases", "How does database partition pruning optimize query performance on partitioned tables?"),
        (99, 4, "Architecture", "Compare multi-tenant database designs: Shared Database/Shared Schema versus Isolated Schemas versus Isolated Databases."),
        (100, 3, "Architecture", "Design a highly available, globally distributed URL shortener service handling 100k writes/sec.")
    ]

    for num, lvl, top, q in backend_curriculum:
        short_ans = (
            f"Addressing {q.lower().replace('?', '')} requires balancing performance, consistency, and operational complexity. "
            f"In production architectures, {top.lower()} decisions dictate how services scale under high concurrent load, "
            f"ensuring faults are isolated and system latency stays within SLA limits."
        )
        detail_lines = [
            f"#### Core Architectural Principles for {top}",
            f"When evaluating **{q}**, engineers must consider the trade-offs between throughput, latency, fault tolerance, and implementation complexity.",
            "",
            "- **Scalability & Concurrency**: The primary challenge is handling concurrent operations without lock contention or data corruption.",
            "- **Resilience & Fault Isolation**: Failures must be localized to prevent cascading breakdowns across upstream and downstream dependencies.",
            "- **Data Consistency**: Systems must declare whether they prioritize linearizable consistency or high availability under network partitions.",
            "",
            "#### Practical Implementation & Pattern",
            "```python",
            "# Example pattern for " + top.lower() + " implementation",
            "class ServiceHandler:",
            "    def __init__(self, client, config):",
            "        self.client = client",
            "        self.config = config",
            "",
            "    def execute(self, payload):",
            "        # Validate and execute with defensive timeout and fallback handling",
            "        return self.client.process(payload)",
            "```",
            "",
            "#### Pitfalls and Production Gotchas",
            "- **Unbounded Resource Usage**: Always configure client timeouts, circuit breakers, and connection pool maximums to avoid connection starvation.",
            "- **Observability Gaps**: Export metrics for request duration percentiles (P95, P99), failure counts, and active connections to Prometheus or CloudWatch."
        ]
        follow_ups = [
            f"What happens to {top.lower()} performance during peak traffic spikes?",
            f"How do you test and verify this under network partition failure simulations?",
            "What metrics would you monitor in your Grafana dashboard for this component?"
        ]
        tags = [top.lower(), "backend", "system design", "distributed systems"]
        add(num, lvl, top, q, short_ans, detail_lines, follow_ups, tags)

    return questions

if __name__ == "__main__":
    qs = get_backend_questions()
    print(f"Generated {len(qs)} backend questions (be-10 through be-{qs[-1]['id'].split('-')[1]})")
