#!/usr/bin/env node
/**
 * Posts curated interview questions sourced from LinkedIn candidate posts to GitHub Issues
 * for display on https://sadiqgpasha89.github.io/InterviewGearUp/#/community
 * 
 * Each post includes:
 *  - Company, Role, Level (Gear 1-4), Domain, Round, Year
 *  - Real interview question prompt as asked
 *  - Full LLM-generated comprehensive answer calibrated for the role & gear level
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repo = process.env.GITHUB_REPOSITORY || 'sadiqgpasha89/InterviewGearUp';

const questions = [
  {
    company: 'Google',
    role: 'Software engineer (core)',
    level: '2 Mid-level (2 to 5 years)',
    domain: 'Cloud / Infrastructure',
    round: 'Coding',
    year: '2026',
    title: '[Google] Thread-safe Sliding Window Rate Limiter',
    question: `Given a stream of incoming HTTP requests with timestamps, implement a thread-safe sliding window rate limiter class RateLimiter that allows at most max_requests within any sliding window of window_seconds.

Requirements & Constraints:
- Method signature: allowRequest(userId: string, timestamp: number): boolean
- Memory efficiency: Memory should not grow unbounded for inactive users or old timestamps.
- Concurrency: Must be thread-safe for high-concurrency multi-threaded environments.
- Discuss time and space complexity, and how this compares to Token Bucket and Leaky Bucket.`,
    model: 'Gemini 3.8 Flash',
    answer: `#### 30-second answer
A sliding window log rate limiter tracks request timestamps per user in a sorted double-ended queue (or ring buffer / Redis sorted set). For each incoming request at timestamp \`t\`, timestamps older than \`t - window_seconds\` are evicted from the head, and the request is permitted if the remaining queue length is less than \`max_requests\`. To ensure thread safety without global lock contention, we use per-user locks or striped mutexes. While sliding window logs offer 100% precision against boundary burst attacks, sliding window counter approximations (blending the previous and current window counts) reduce memory from $O(N)$ requests to $O(1)$ space.

#### In-depth algorithmic breakdown
1. **Sliding Window Log Implementation (Exact Precision):**
\`\`\`python
from collections import deque
import threading
import time

class SlidingWindowRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.user_records = {}
        self.lock = threading.Lock()

    def allow_request(self, user_id: str, timestamp: float = None) -> bool:
        t = timestamp if timestamp is not None else time.time()
        window_start = t - self.window_seconds

        with self.lock:
            if user_id not in self.user_records:
                self.user_records[user_id] = deque()
            
            queue = self.user_records[user_id]
            # Evict expired timestamps from the left
            while queue and queue[0] <= window_start:
                queue.popleft()

            # Check capacity
            if len(queue) < self.max_requests:
                queue.append(t)
                return True
            return False
\`\`\`

2. **Complexity Analysis:**
- **Time Complexity:** $O(E)$ amortized per request where $E$ is the number of evicted expired entries (each timestamp is inserted and popped at most once). $O(1)$ amortized.
- **Space Complexity:** $O(U \times M)$ where $U$ is the number of active users and $M$ is \`max_requests\` stored in memory.

3. **Comparison of Rate Limiting Algorithms:**
- **Sliding Window Log:** Guarantees 0% burst leakage across arbitrary window boundaries; memory usage is proportional to request volume.
- **Sliding Window Counter:** Blends weight of previous fixed window: \`count = prev_count * ((window_size - offset) / window_size) + curr_count\`. Uses $O(1)$ memory per user while keeping error within 5%.
- **Token Bucket:** Best for handling bursts while enforcing a steady average rate; tokens replenish continuously.

#### Key trade-offs & edge cases
- **Memory Leak Prevention:** Inactive users whose timestamps have completely drained must be evicted via background TTL or a Least Recently Used (LRU) cache (e.g., Python \`functools.lru_cache\` or Redis key expiration).
- **Distributed Scale:** When running across multiple API gateway nodes, user state must be stored in Redis using an atomic pipeline (\`ZREMRANGEBYSCORE\`, \`ZCARD\`, \`ZADD\`, \`EXPIRE\`) or an atomic Lua script to avoid distributed race conditions.

#### Likely follow-ups
- How would you implement this atomically in Redis across multiple servers without split-brain?
- What are the pros and cons of using a Lua script vs. Redis transactions (\`MULTI\`/\`EXEC\`)?
- How do you protect against clock drift across distributed servers?`
  },
  {
    company: 'Google',
    role: 'DevOps / SRE / Cloud',
    level: '3 Senior (5 to 8 years)',
    domain: 'Cloud / Infrastructure',
    round: 'System design',
    year: '2026',
    title: '[Google] Real-time Multi-Region Telemetry & Log Aggregation Pipeline',
    question: `Design a real-time telemetry and log aggregation pipeline for Google Cloud / multi-region Kubernetes clusters.

Constraints & Scale:
- Ingestion rate: 5 million log and metric events per second globally.
- Real-time alerting: P99 latency from log generation to alerting rule evaluation must be under 3 seconds.
- Storage & Search: Hot index for real-time querying (7 days), warm index (30 days), cold compressed archive (1 year compliance).
- Multi-tenancy: Strict team isolation, rate limiting per service, and zero data loss on collector restarts.`,
    model: 'Gemini 3.8 Flash',
    answer: `#### 30-second answer
A multi-region telemetry pipeline deploys edge daemon agents (Fluentbit / OpenTelemetry Collector) buffering events in local memory/disk queues. Regional ingest gateways publish to high-throughput partition brokers (Apache Kafka or Google Cloud Pub/Sub) partitioned by \`tenant_id + service\`. Stream processors (Apache Flink / Google Cloud Dataflow) compute sliding window metric rollups and trigger sub-second alerting rules. Processed events are simultaneously multiplexed into an Elasticsearch/ClickHouse hot storage tier for live querying and batched into Parquet files written to Cloud Storage with lifecycle policies for cold compliance archiving.

#### In-depth architectural breakdown
1. **Edge Collection & Ingestion Layer:**
   - **DaemonSet Agent:** Run OpenTelemetry Collector / Fluent Bit on every Kubernetes node, capturing \`stdout\`/\`stderr\` via CRI-O sockets and system cgroups.
   - **Backpressure & Disk Buffering:** In-memory circular ring buffer with disk-backed fallback to absorb network partitions or ingestion hiccups without dropping logs.

2. **Message Ingestion & Partitioning:**
   - Regional Pub/Sub / Kafka clusters deployed per Google Cloud region.
   - Partitioning key: \`hash(tenant_id) : hash(service_id)\` ensures chronological ordering per service instance and even partition distribution.

3. **Stream Processing & Real-time Alerting (<3s SLA):**
   - Apache Flink / Dataflow streaming pipelines consume from Kafka with exactly-once stream semantics.
   - Evaluates sliding threshold rules (e.g., error rate > 5% over 1 min) in memory and dispatches immediate webhook alerts to PagerDuty/Slack.

4. **Tiered Storage Architecture:**
   - **Hot Tier (0-7 days):** ClickHouse / OpenSearch cluster with column-oriented compression. High indexing throughput and sub-second SQL aggregation.
   - **Warm Tier (8-30 days):** Compaction into read-only partitions with reduced replica factor.
   - **Cold Tier (30-365 days):** Hourly micro-batch jobs write compressed Zstandard Snappy Parquet files to Google Cloud Storage (Nearline/Archive storage class), queryable via BigQuery external tables.

#### Key trade-offs & edge cases
- **Handling Logging Spikes (Log Flooding):** A runaway microservice printing stack traces can saturate network bandwidth. Ingestion gateways enforce client-side token bucket quotas and dynamic sampling (dropping \`DEBUG\` logs when queue depth exceeds 80%).
- **PII Scrubbing:** Stream processors run regex and NLP maskers to sanitize credit card numbers, auth tokens, and personal data before persistence.

#### Likely follow-ups
- How do you guarantee exactly-once processing when Flink checkpointing occurs during a node crash?
- ClickHouse vs. Elasticsearch: Why choose a columnar store over an inverted index for modern log pipelines?
- How do you handle out-of-order events caused by mobile or client-side timestamp skew?`
  },
  {
    company: 'Stripe',
    role: 'Backend engineer',
    level: '3 Senior (5 to 8 years)',
    domain: 'Fintech / Banking',
    round: 'System design',
    year: '2026',
    title: '[Stripe] Idempotent Payment Processing Gateway Architecture',
    question: `Design an idempotent payment processing system that guarantees zero duplicate charges even under network timeouts, client retries, and concurrent duplicate submissions.

Requirements:
- Client supplies an Idempotency-Key header with every payment mutation request.
- P99 latency < 250ms for first-time requests.
- Immediate consistent response for duplicate concurrent requests (avoiding double execution).
- Handle edge cases where the payment provider takes 30 seconds to respond or the gateway crashes mid-transaction.`,
    model: 'Gemini 3.8 Flash',
    answer: `#### 30-second answer
Idempotency in financial APIs is achieved using a dedicated distributed idempotency store (Redis + PostgreSQL) with atomic state machine transitions: \`STARTED\`, \`EXECUTING\`, \`COMPLETED\`, \`FAILED\`. An incoming request with an \`Idempotency-Key\` attempts an atomic conditional insert (\`INSERT ... ON CONFLICT\`). If the key is already \`COMPLETED\`, the cached response payload and HTTP status are returned immediately. If \`EXECUTING\`, concurrent requests block or poll with exponential backoff. If the server crashes mid-flight, a background reconciliation worker queries downstream payment processors using the idempotency key as the merchant reference to resolve ambiguous transactions safely.

#### In-depth architectural breakdown
1. **Idempotency Record Schema:**
\`\`\`sql
CREATE TABLE idempotency_keys (
  key_id VARCHAR(255) PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL,
  request_hash VARCHAR(64) NOT NULL,     -- SHA-256 of request body and path
  status VARCHAR(20) NOT NULL,          -- PENDING, PROCESSING, RESOLVED, REJECTED
  response_code INT,
  response_body JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  locked_until TIMESTAMP WITH TIME ZONE
);
\`\`\`

2. **Step-by-Step Request Flow:**
- **Step 1: Check & Lock:** On receipt of request, compute SHA-256 hash of payload. Attempt atomic insert with status \`PROCESSING\` and a 2-minute lock timeout.
  - If key exists and hash matches:
    - If status == \`RESOLVED\`: return cached response body immediately.
    - If status == \`PROCESSING\` and \`locked_until > NOW()\`: return HTTP 409 Conflict ("Transaction in progress") or wait with a bounded timeout.
  - If key exists and hash DOES NOT match: reject immediately with HTTP 422 ("Idempotency key reused with different parameters").
- **Step 2: Downstream Execution:** Send payment request to acquiring bank / card network forwarding the idempotency key as the unique transaction tracking ID.
- **Step 3: Atomic Finalization:** In a local database transaction, record the payment ledger entry and update \`idempotency_keys\` to \`RESOLVED\` with the HTTP status and serialized response payload.

3. **Crash Recovery & Ambiguous State Handling:**
- If network drops between gateway and payment processor: the transaction status remains \`PROCESSING\`.
- A background reconciliation worker scans keys where \`locked_until < NOW()\` and queries the payment processor's inquiry API with the idempotency key before either retrying or releasing the lock.

#### Key trade-offs & edge cases
- **Hash Verification:** It is critical to store the hash of the original request body. Without hash verification, an attacker or buggy client could accidentally replay a \\$500 payment request with the idempotency key previously used for a \\$5 payment.
- **Cache vs. Database Storage:** In-memory stores like Redis provide sub-millisecond check latency, but must be paired with durable relational database storage (PostgreSQL) to ensure idempotency guarantees survive cache restarts.

#### Likely follow-ups
- How do you implement distributed locking if the database is sharded across multiple regional clusters?
- What happens if the downstream processor does not support native idempotency keys?
- How do you manage retention and cleanup for billions of historical idempotency records?`
  },
  {
    company: 'Uber',
    role: 'Backend engineer',
    level: '3 Senior (5 to 8 years)',
    domain: 'Other',
    round: 'System design',
    year: '2026',
    title: '[Uber] Real-Time Geospatial Driver Location Tracking & Dispatch Matching',
    question: `Design the real-time location ingestion and dispatch matching engine for Uber.

Key Requirements:
- Ingestion of 2 million active driver GPS locations every 4 seconds (500k writes/sec).
- Real-time rider dispatch: Given a rider location, find the top 10 closest available drivers within 3km in < 100ms.
- Scalable geospatial indexing with minimal battery consumption and high network efficiency.`,
    model: 'Gemini 3.8 Flash',
    answer: `#### 30-second answer
Uber's real-time location engine uses hierarchical hexagonal spatial indexing (Uber H3) rather than square grids or raw latitude/longitude distance calculations. Mobile driver apps stream compact binary Protobuf packets over persistent WebSockets/gRPC. The Location Ingestion Service maps GPS coordinates into H3 hexagon index cells at resolution 8 (~460m edge length) and updates a memory-optimized in-memory geospatial store (Redis Cluster with geospatial indices or custom Go/Rust ring buffer services). Dispatch matching queries the rider's H3 cell and immediate concentric rings (\`k-ring\`), filtering candidate drivers by availability state and ETA calculated via routing engines.

#### In-depth architectural breakdown
1. **Geospatial Indexing Choice (Why H3 Hexagons):**
   - **Hexagons vs. Squares:** Hexagons have uniform distance between cell centroid and all 6 adjacent neighbors. Square grids (Geohash) suffer from the "diagonal neighbor" problem (diagonal neighbors are $\\sqrt{2} \\times$ farther than orthogonal neighbors), causing distortion in radius lookups.
   - **Resolution:** H3 resolution 8 (cell area $\\approx 0.737 \\text{ km}^2$) allows fast $k$-ring radius expansions ($k=1, 2, 3$) to cover 1km–5km search areas in $O(1)$ constant time.

2. **Ingestion & Streaming Pipeline:**
   - **Client Optimization:** Driver app batches GPS pings and sends over gRPC/HTTP2, throttling location updates when stationary (detected via accelerometer/gyroscope).
   - **Ingestion Gateways:** Stateless microservices parse coordinates, resolve H3 cell ID, and write to Kafka partition: \`hash(H3_resolution_6_parent_cell)\`.
   - **In-Memory Location Cache:** Distributed memory grid partitioned by geographic region. Each node maintains a spatial map: \`H3_Cell_ID -> Set of (Driver_ID, Status, Timestamp, Precise_Lat_Lon)\`.

3. **Dispatch Matching Algorithm:**
   - **Candidate Selection:** Rider requests pickup at coordinate $(lat, lon)$. System determines rider's H3 cell $C_0$ and fetches drivers in $C_0 \\cup \\text{kRing}(C_0, k=3)$.
   - **Filtering:** Filters out drivers with status $\\ne \\text{AVAILABLE}$ or stale timestamps (> 15 seconds).
   - **Ranking (ETA & Route):** Computes estimated driving time (ETA) using routing engines (OSRM / OpenStreetMap graph routing) taking into account road topology and one-way streets rather than Euclidean distance.

#### Key trade-offs & edge cases
- **High-Write Geospatial Updates:** Traditional B-tree or R-tree indexes lock on frequent node splits under 500k writes/sec. By bucketing drivers into static H3 cell hash sets in memory, updates become simple $O(1)$ set additions and removals.
- **Cell Boundary "Edge Effect":** A driver 50 meters away might be across a cell boundary; querying concentric $k$-rings completely eliminates the boundary blindness.

#### Likely follow-ups
- How do you prevent multiple riders from simultaneously dispatching and claiming the exact same driver (race condition)?
- How would you handle driver tracking in tunnels or urban canyons with severe GPS multipath reflection?
- How do you shard dispatch services when demand surges in a single dense neighborhood (e.g., stadium concert exit)?`
  },
  {
    company: 'Netflix',
    role: 'Backend engineer',
    level: '4 Lead / Staff (8+ years)',
    domain: 'Gaming / Media',
    round: 'System design',
    year: '2026',
    title: '[Netflix] Multi-Region Distributed Cache Architecture with Zero Cache Stampedes',
    question: `Design a multi-region distributed caching tier (like Netflix EVCache) supporting tens of millions of QPS with active-active cross-region replication and resilient protection against cache stampedes.

Key Focus:
- Sub-5ms read latency at 99.9th percentile.
- Active-active multi-region deployment (AWS us-east-1, us-west-2, eu-west-1).
- What techniques prevent cache stampedes (thundering herd) during cache evictions or service warmups?`,
    model: 'Gemini 3.8 Flash',
    answer: `#### 30-second answer
A multi-region distributed caching tier deploys Memcached/RocksDB clusters co-located with application microservices in each cloud region, fronted by an intelligent client library (EVCache client). Reads are served strictly from the local region cache within 1-2ms. Cache mutations write locally and asynchronously propagate cross-region via Kafka streams with vector clocks for conflict resolution. To eliminate cache stampedes (thundering herd), the architecture uses probabilistic early recomputation (XFetch algorithm) combined with single-flight mutexes (Go \`singleflight\` / Java \`Striped\`) and probabilistic background refresh before expiration.

#### In-depth architectural breakdown
1. **Multi-Region Caching Topology:**
   - **Local Cache Reads:** Microservices always read from their local AWS region cache pool to guarantee sub-2ms network round-trip.
   - **Cross-Region Asynchronous Replication:** Writes update the local cache and produce an invalidation/update event to a global Kafka cluster. Remote region consumers update their local cache clusters.
   - **Conflict Resolution:** Keys carry a monotonic version sequence or Lamport timestamp; out-of-order Kafka events are discarded if their timestamp is older than the existing cache entry version.

2. **Cache Stampede (Thundering Herd) Prevention Mechanisms:**
   - **Problem:** When a popular key (e.g. homepage top-trending show metadata) expires, 10,000 concurrent requests miss the cache simultaneously and slam the backend database.
   - **Defense 1: Single-Flight Request Coalescing:** The application gateway intercepts cache misses for key $K$. Exactly one worker acquires a lock to query the primary database, while all other concurrent requests await that single flight promise.
   - **Defense 2: Probabilistic Early Expiration (XFetch Algorithm):**
     Instead of waiting for TTL to hit 0, client evaluates:
     $$\\Delta - \\beta \\cdot \\ln(\\text{rand}()) > \\text{TTL}$$
     where $\\Delta$ is computation time and $\\beta > 0$. As remaining TTL shrinks, the probability of an early background fetch approaches 1.0, refreshing the value in the background without user-facing latency.
   - **Defense 3: Jittered TTLs:** All cache TTLs are assigned a $\\pm 10\\%$ random jitter ($TTL = BaseTTL + \\text{random}(-J, +J)$) to prevent simultaneous cascading expirations.

3. **High Availability & Fault Isolation:**
   - **Zone-Aware Sharding:** Cache nodes are sharded using consistent hashing across all Availability Zones (AZs) in a region. If an entire AZ fails, consistent hashing seamlessly redistributes lookups to sister AZs without data loss.

#### Key trade-offs & edge cases
- **Eventual Consistency Lag:** Because cross-region replication is asynchronous (typical replication lag: 50-100ms), a user who modifies their watchlist in us-east and immediately queries from eu-central might read a stale cache. Solved using session affinity (read-your-own-writes sticky routing).
- **Cold Cache Warmup:** Deploying a brand new cache cluster risks overwhelming backend databases. Netflix utilizes cache replication shadowing to mirror traffic to warm up new nodes before switching live traffic.

#### Likely follow-ups
- How do you prove mathematically that the XFetch algorithm prevents thundering herds with minimum duplicate fetches?
- How do you detect and handle poisoned or corrupted cache payloads across regions?
- How does RocksDB-backed caching compare to Memcached in terms of memory fragmentation and garbage collection pauses?`
  },
  {
    company: 'Amazon',
    role: 'Backend engineer',
    level: '3 Senior (5 to 8 years)',
    domain: 'Cloud / Infrastructure',
    round: 'System design',
    year: '2026',
    title: '[Amazon] Distributed Task Scheduler (Distributed Cron) at Planetary Scale',
    question: `Design a fault-tolerant distributed task scheduler (similar to Amazon EventBridge Scheduler or internal distributed Cron) that schedules, triggers, and tracks millions of recurring and one-off asynchronous jobs.

Key Requirements:
- Precision: Tasks must trigger within 1 second of their scheduled wall-clock time.
- Exactly-once (or at-least-once with idempotency) execution guarantee.
- Support recurring cron expressions and delayed execution (e.g., execute in 14 days).
- High availability: Resilient to worker crashes, network partitions, and database failover.`,
    model: 'Gemini 3.8 Flash',
    answer: `#### 30-second answer
A planetary-scale distributed scheduler organizes jobs into two tiers: long-term durable storage (DynamoDB/PostgreSQL) and short-term execution time-bucketed queues (Redis Sorted Sets or Kafka topics partitioned by time slice). A leader-elected Sweeper Service scans the upcoming 1-minute time window using range queries on timestamps, dispatches ready tasks into an execution broker (SQS/Kafka), and distributed worker pools consume tasks with distributed lease locks. Worker execution results are recorded with idempotency tokens to ensure tasks are never executed twice.

#### In-depth architectural breakdown
1. **Data Model & Job Partitioning:**
\`\`\`sql
CREATE TABLE scheduled_tasks (
  task_id UUID PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  cron_expression VARCHAR(64),          -- NULL for one-off tasks
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL,          -- SCHEDULED, QUEUED, RUNNING, COMPLETED, FAILED
  idempotency_token VARCHAR(128) UNIQUE NOT NULL,
  shard_id INT NOT NULL                 -- For distributed query partitioning
);
CREATE INDEX idx_tasks_schedule ON scheduled_tasks(shard_id, scheduled_time) WHERE status = 'SCHEDULED';
\`\`\`

2. **Time Bucket Sweeper & Dispatch Engine:**
   - **Time Partitioning:** Instead of scanning millions of rows across a single table, tasks are sharded into $N$ shards (e.g., 64 shards).
   - **Windowed Sweeper:** Every 10 seconds, coordinator nodes poll tasks where \`scheduled_time <= NOW() + 10s\` for their assigned shards.
   - **Queueing:** Dispatches task payloads to SQS FIFO / Kafka with \`MessageDeduplicationId = idempotency_token\`.

3. **Execution & Worker Failure Handling:**
   - **Distributed Lease / Visibility Timeout:** When a worker picks up a job, it acquires a lease (e.g. 30 seconds). If the worker crashes mid-task, SQS visibility timeout expires or Redis distributed lock TTL releases the job for redelivery.
   - **Next Recurring Instance Calculation:** For recurring cron jobs, the dispatcher computes \`next_scheduled_time = cron_next(cron_expression, current_time)\` and inserts the future task record immediately upon dispatch.

#### Key trade-offs & edge cases
- **Handling Database Hotspots on Top-of-Hour Bursts:** Millions of cron jobs are scheduled for \`:00\` past the hour. The scheduler uses jittered dispatch (firing within a configurable $\\pm 5$ second window for non-critical jobs) to smooth out traffic spikes.
- **Clock Drift:** System relies on NTP synchronized clocks (Amazon Time Sync Service) across all dispatch nodes with leap-second smoothing to prevent double triggers or delayed executions.

#### Likely follow-ups
- How do you guarantee isolation so one rogue tenant scheduling 10 million jobs does not starve other tenants?
- How do you handle job dependency trees (DAG execution similar to Apache Airflow)?
- What database indexing strategy prevents write stalls as the scheduled tasks table grows past hundreds of millions of rows?`
  },
  {
    company: 'Meta',
    role: 'Frontend engineer',
    level: '3 Senior (5 to 8 years)',
    domain: 'Gaming / Media',
    round: 'System design',
    year: '2026',
    title: '[Meta] Infinite Scroll Feed with Virtualized Rendering & Optimistic Updates',
    question: `Design an infinite scrolling content feed (like Facebook or Instagram News Feed) for web browsers.

Key Considerations:
- DOM performance: Smooth 60 FPS scrolling with tens of thousands of dynamic items without browser tab memory crashes.
- Dynamic heights: Feed items have variable, unpredictable heights (images, text, video carousels, comments).
- Network resilience: Optimistic UI updates for likes and comments with seamless offline support and rollback handling on network failure.`,
    model: 'Gemini 3.8 Flash',
    answer: `#### 30-second answer
A production-grade infinite feed combines custom windowing (DOM virtualization) with a dynamic height estimation cache and an optimistic state manager. The viewport renders only the items currently visible plus a small buffer window (3-5 items above and below), replacing offscreen items with top and bottom spacer divs to preserve native scrollbar positioning. Dynamic heights are measured after DOM rendering via \`ResizeObserver\` and stored in an interval tree. Mutations (likes/comments) apply immediately to client state with temporary optimistic IDs; on network rejection, an undo event reverts state and surfaces a retry banner.

#### In-depth architectural breakdown
1. **Windowing Virtualization with Variable Heights:**
   - **Why naive rendering fails:** Rendering 2,000 complex feed cards creates over 50,000 DOM nodes, triggering catastrophic style recalculations, memory bloat, and garbage collection stutter during scroll.
   - **Virtualizer Architecture:**
     - Maintain an array of estimated item heights (e.g. default 400px).
     - Calculate \`totalHeight = sum(itemHeights)\`.
     - Container has a single inner wrapper set to \`totalHeight\`.
     - Translate or position rendered items using \`transform: translateY(offsetY px)\` (avoids layout reflows by staying on the compositor thread).
   - **Dynamic Measurement via ResizeObserver:**
     - Attach a shared \`ResizeObserver\` to rendered items.
     - When an image or dynamic card finishes rendering and changes height, record the delta and adjust all subsequent offsets in $O(\\log N)$ time using a Fenwick Tree (Binary Indexed Tree) or Prefix Sum array.

2. **Scroll Anchoring & Content Jumps:**
   - As new items are prepended to the top of the feed (e.g. "5 new posts"), the user's viewport will jump unless scroll anchoring is enforced.
   - Use CSS \`overflow-anchor: auto\` and programmatically adjust \`window.scrollBy(0, deltaHeight)\` before paint.

3. **Optimistic UI Engine:**
   - Action dispatched: \`LIKE_POST(postId)\`.
   - Update normalized store cache immediately: \`post.isLiked = true\`, \`post.likeCount += 1\`.
   - Fire network mutation with idempotency key.
   - If HTTP 200: replace temporary optimistic transaction state with server timestamp.
   - If HTTP 4xx/5xx: rollback state cleanly, show toast with "Retry" action.

#### Key trade-offs & edge cases
- **Media Preloading & Memory Pressure:** Video players in offscreen feed cards must pause and detach MediaSource handles to prevent memory leaks and mobile GPU memory exhaustion.
- **Fast Scroll Thrashing:** During high-speed wheel or flick scrolling, disable full card rendering and display lightweight skeleton placeholders until scroll velocity drops below a threshold.

#### Likely follow-ups
- How do you implement infinite scroll pagination using cursor-based pagination vs. offset/limit?
- How do you test virtualized lists with automated accessibility (a11y) screen readers?
- How do you handle bidirectional infinite scrolling (infinite items above and below)?`
  }
];

async function main() {
  console.log(`Starting community interview question publisher for ${repo}...`);
  console.log(`Loaded ${questions.length} curated questions from LinkedIn posts.`);

  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];
    console.log(`\n[${idx + 1}/${questions.length}] Processing: ${q.title}...`);

    const issueBody = [
      '### Company',
      q.company,
      '',
      '### Role',
      q.role,
      '',
      '### Level',
      q.level,
      '',
      '### Domain',
      q.domain,
      '',
      '### Round',
      q.round,
      '',
      '### Year asked',
      q.year,
      '',
      '### Question',
      q.question,
      '',
      '### Your answer (optional)',
      '_No response_',
      '',
      '### AI Model',
      q.model,
      '',
      '### Auto-generated Answer',
      `*Answer generated by ${q.model} for ${q.role} · Gear ${q.level.slice(0, 1)}*`,
      '',
      q.answer.trim()
    ].join('\n');

    const tempFile = path.join('/tmp', `issue-${Date.now()}-${idx}.md`);
    fs.writeFileSync(tempFile, issueBody, 'utf8');

    try {
      const cmd = `gh issue create --repo ${repo} --title "${q.title.replace(/"/g, '\\"')}" --label "community-question" --body-file "${tempFile}"`;
      const out = execSync(cmd, { encoding: 'utf8' }).trim();
      console.log(`✓ Published successfully: ${out}`);
    } catch (err) {
      console.error(`✗ Failed to create issue for "${q.title}":`, err.message);
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  }

  console.log('\nAll questions processed!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
