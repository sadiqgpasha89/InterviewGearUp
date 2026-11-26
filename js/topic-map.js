/* Curated topic dependency maps for all 10 roles (Phase 19).
   Relationships are explicitly curated (never auto-guessed) and every question ID resolves to the real bank. Pure functions. */
(function () {
  const IGU = (window.IGU = window.IGU || {});

  const MAPS = {
    general: [
      { id: 'complexity', title: 'Time & Space Complexity', topic: 'Complexity', summary: 'Big-O analysis underpins every algorithm and data structure trade-off.', prereqs: [], related: ['bit'], next: ['ds', 'algo'], qids: ['gen-1', 'gen-54', 'gen-55'] },
      { id: 'ds', title: 'Core Data Structures', topic: 'Data structures', summary: 'Arrays, hash maps, stacks, queues, trees and LRU caches.', prereqs: ['complexity'], related: ['oop'], next: ['algo', 'graphs'], qids: ['gen-9', 'gen-10', 'gen-4'] },
      { id: 'algo', title: 'Searching, Sorting & Recursion', topic: 'Algorithms', summary: 'Binary search, divide-and-conquer, two pointers and sliding windows.', prereqs: ['ds'], related: ['graphs'], next: ['dp'], qids: ['gen-11', 'gen-12', 'gen-21'] },
      { id: 'graphs', title: 'Trees & Graphs', topic: 'Graphs', summary: 'BFS, DFS, shortest paths, topological sort and cycle detection.', prereqs: ['ds'], related: ['algo'], next: ['dp', 'sysdesign'], qids: ['gen-26', 'gen-27', 'gen-25'] },
      { id: 'dp', title: 'Dynamic Programming', topic: 'Dynamic programming', summary: 'Memoization, tabulation and state transitions on overlapping subproblems.', prereqs: ['algo', 'graphs'], related: ['complexity'], next: ['sysdesign'], qids: ['gen-44', 'gen-45', 'gen-46'] },
      { id: 'oop', title: 'OOP & Design Patterns', topic: 'OOP', summary: 'Clean interfaces, composition over inheritance, and maintainable modules.', prereqs: ['ds'], related: ['patterns'], next: ['systems'], qids: ['gen-63', 'gen-64', 'gen-65'] },
      { id: 'patterns', title: 'Design Patterns', topic: 'Design patterns', summary: 'Factory, strategy, observer and dependency injection in practice.', prereqs: ['oop'], related: ['systems'], next: ['sysdesign'], qids: ['gen-68', 'gen-69', 'gen-70'] },
      { id: 'systems', title: 'OS, Memory & Concurrency', topic: 'Systems', summary: 'Processes, threads, locks, memory layout and I/O models.', prereqs: ['ds'], related: ['patterns'], next: ['sysdesign'], qids: ['gen-80', 'gen-81', 'gen-83'] },
      { id: 'bit', title: 'Bit Manipulation', topic: 'Bit manipulation', summary: 'Bitmasks, XOR tricks and compact representations.', prereqs: ['complexity'], related: ['ds'], next: [], qids: ['gen-51', 'gen-52', 'gen-53'] },
      { id: 'sysdesign', title: 'System Design', topic: 'System design', summary: 'End-to-end distributed architecture, rate limiters and scaling.', prereqs: ['systems', 'graphs'], related: ['patterns'], next: [], qids: ['gen-5', 'gen-7', 'gen-102'] }
    ],
    frontend: [
      { id: 'html', title: 'Semantic HTML & DOM', topic: 'DOM', summary: 'Document structure, event bubbling/delegation and browser tree.', prereqs: [], related: ['css'], next: ['js', 'a11y'], qids: ['fe-105', 'fe-9', 'fe-10'] },
      { id: 'css', title: 'CSS Layout & Cascade', topic: 'CSS', summary: 'Box model, specificity, Flexbox, Grid and responsive layout.', prereqs: [], related: ['html'], next: ['perf', 'a11y'], qids: ['fe-2', 'fe-22', 'fe-24'] },
      { id: 'js', title: 'JavaScript Internals', topic: 'JavaScript', summary: 'Closures, prototypes, event loop, microtasks and async/await.', prereqs: ['html'], related: ['browser'], next: ['react', 'state'], qids: ['fe-1', 'fe-3', 'fe-13'] },
      { id: 'browser', title: 'Browser APIs & Storage', topic: 'Browser APIs', summary: 'Fetch, Service Workers, Web Workers, storage and CORS.', prereqs: ['js'], related: ['perf'], next: ['security', 'arch'], qids: ['fe-52', 'fe-53', 'fe-55'] },
      { id: 'react', title: 'React & Rendering', topic: 'React', summary: 'Reconciliation, keys, hooks rules and concurrent rendering.', prereqs: ['js'], related: ['state'], next: ['perf', 'arch'], qids: ['fe-4', 'fe-5', 'fe-30'] },
      { id: 'state', title: 'Client State Management', topic: 'State', summary: 'Local vs server state, caching, normalization and stale data.', prereqs: ['js', 'react'], related: ['arch'], next: ['arch'], qids: ['fe-38', 'fe-39'] },
      { id: 'a11y', title: 'Accessibility (a11y)', topic: 'Accessibility', summary: 'Keyboard navigation, ARIA semantics, focus management and contrast.', prereqs: ['html', 'css'], related: ['react'], next: ['arch'], qids: ['fe-57', 'fe-58', 'fe-115'] },
      { id: 'perf', title: 'Rendering & Web Performance', topic: 'Performance', summary: 'Critical rendering path, Core Web Vitals, code splitting and memoization.', prereqs: ['css', 'react'], related: ['browser'], next: ['arch'], qids: ['fe-6', 'fe-40', 'fe-41'] },
      { id: 'security', title: 'Frontend Security', topic: 'Security', summary: 'XSS, CSRF, CSP, safe token handling and supply-chain risks.', prereqs: ['browser'], related: ['arch'], next: [], qids: ['fe-7', 'fe-47', 'fe-48'] },
      { id: 'arch', title: 'Frontend Architecture', topic: 'Architecture', summary: 'Multi-team apps, micro-frontends, design systems and testing.', prereqs: ['react', 'perf', 'security'], related: ['state'], next: [], qids: ['fe-8', 'fe-56', 'fe-82'] }
    ],
    backend: [
      { id: 'apis', title: 'HTTP & API Design', topic: 'APIs', summary: 'REST semantics, status codes, pagination, idempotency and versioning.', prereqs: [], related: ['security'], next: ['db', 'cache', 'arch'], qids: ['be-1', 'be-10', 'be-11'] },
      { id: 'sql', title: 'SQL & Relational Foundations', topic: 'SQL', summary: 'Joins, aggregations, NULL semantics and set-based thinking.', prereqs: [], related: ['db'], next: ['db'], qids: ['be-2'] },
      { id: 'db', title: 'Databases, Indexes & MVCC', topic: 'Databases', summary: 'B+ trees, transactions, isolation levels, sharding and replication.', prereqs: ['sql', 'apis'], related: ['cache'], next: ['distributed', 'perf'], qids: ['be-3', 'be-13', 'be-14'] },
      { id: 'cache', title: 'Caching & Eviction', topic: 'Caching', summary: 'Cache-aside, write-through, TTLs, stampedes and invalidation.', prereqs: ['apis', 'db'], related: ['perf'], next: ['distributed'], qids: ['be-4', 'be-25', 'be-27'] },
      { id: 'concurrency', title: 'Concurrency & Locks', topic: 'Concurrency', summary: 'Mutexes, deadlocks, async pools, backpressure and optimistic locking.', prereqs: ['db'], related: ['perf'], next: ['distributed'], qids: ['be-53', 'be-54', 'be-55'] },
      { id: 'messaging', title: 'Queues & Event-Driven Systems', topic: 'Messaging', summary: 'Kafka/RabbitMQ, delivery guarantees, dead-letter queues and outbox.', prereqs: ['apis', 'db'], related: ['reliability'], next: ['distributed', 'arch'], qids: ['be-31', 'be-32', 'be-34'] },
      { id: 'security', title: 'Backend Auth & Security', topic: 'Security', summary: 'AuthN vs AuthZ, JWTs, OAuth2/PKCE, SQLi and rate limiting.', prereqs: ['apis'], related: ['reliability'], next: ['arch'], qids: ['be-5', 'be-59', 'be-60'] },
      { id: 'reliability', title: 'Reliability & Payments', topic: 'Reliability', summary: 'Retries with backoff, circuit breakers, idempotency keys and timeouts.', prereqs: ['apis', 'messaging'], related: ['cache'], next: ['distributed'], qids: ['be-70', 'be-71', 'be-7'] },
      { id: 'perf', title: 'Latency & Profiling', topic: 'Performance', summary: 'Connection pooling, query plans, tail latency and bottleneck analysis.', prereqs: ['db', 'cache'], related: ['concurrency'], next: ['arch'], qids: ['be-8', 'be-56', 'be-57'] },
      { id: 'distributed', title: 'Distributed Systems & Consensus', topic: 'Distributed systems', summary: 'CAP theorem, Raft, consistent hashing and clock skew.', prereqs: ['db', 'cache', 'reliability'], related: ['messaging'], next: ['arch'], qids: ['be-6', 'be-43', 'be-48'] },
      { id: 'arch', title: 'Service Architecture', topic: 'Architecture', summary: 'Monolith vs microservices, saga patterns and multi-region scale.', prereqs: ['distributed', 'security'], related: ['perf'], next: [], qids: ['be-9', 'be-38', 'be-39'] }
    ],
    devops: [
      { id: 'linux', title: 'Linux Internals', topic: 'Linux', summary: 'Processes, cgroups, namespaces, file descriptors and kernel tuning.', prereqs: [], related: ['net'], next: ['containers'], qids: ['do-9', 'do-10', 'do-11'] },
      { id: 'net', title: 'Cloud & Container Networking', topic: 'Networking', summary: 'DNS, TLS, TCP, VPCs, load balancers and ingress routing.', prereqs: [], related: ['linux'], next: ['k8s', 'cloud'], qids: ['do-16', 'do-17', 'do-18'] },
      { id: 'containers', title: 'Containers & Images', topic: 'Containers', summary: 'Dockerfiles, multi-stage builds, layers and container isolation.', prereqs: ['linux'], related: ['cicd'], next: ['k8s'], qids: ['do-1', 'do-22', 'do-23'] },
      { id: 'cicd', title: 'CI/CD Pipelines', topic: 'CI/CD', summary: 'Build, test, artifact signing, canary and blue-green rollouts.', prereqs: ['containers'], related: ['gitops'], next: ['iac', 'k8s'], qids: ['do-2', 'do-49', 'do-50'] },
      { id: 'iac', title: 'Infrastructure as Code', topic: 'IaC', summary: 'Terraform state, locking, drift detection and modular environments.', prereqs: ['net'], related: ['cicd'], next: ['gitops', 'cloud'], qids: ['do-5', 'do-42', 'do-101'] },
      { id: 'k8s', title: 'Kubernetes Operations', topic: 'Kubernetes', summary: 'Pods, probes, scheduling, CrashLoopBackOff debugging and autoscaling.', prereqs: ['containers', 'net'], related: ['gitops'], next: ['obs', 'sre'], qids: ['do-3', 'do-4', 'do-28'] },
      { id: 'gitops', title: 'GitOps', topic: 'GitOps', summary: 'Declarative reconciliation loops with Argo CD / Flux and rollbacks.', prereqs: ['k8s', 'cicd'], related: ['iac'], next: ['sre'], qids: ['do-46', 'do-47', 'do-48'] },
      { id: 'obs', title: 'Observability', topic: 'Observability', summary: 'Metrics, structured logs, distributed traces and alert noise reduction.', prereqs: ['k8s'], related: ['sre'], next: ['sre'], qids: ['do-53', 'do-54', 'do-55'] },
      { id: 'cloud', title: 'Cloud Architecture & Security', topic: 'Cloud', summary: 'Multi-AZ design, IAM least privilege, secrets and FinOps.', prereqs: ['net', 'iac'], related: ['sre'], next: ['sre'], qids: ['do-73', 'do-74', 'do-75'] },
      { id: 'sre', title: 'SRE & Incident Response', topic: 'SRE', summary: 'SLIs/SLOs, error budgets, postmortems and capacity planning.', prereqs: ['obs', 'k8s'], related: ['cloud'], next: [], qids: ['do-60', 'do-61', 'do-62'] }
    ],
    data: [
      { id: 'sql', title: 'Analytical SQL', topic: 'SQL', summary: 'Window functions, CTEs, query execution plans and skew.', prereqs: [], related: ['modeling'], next: ['warehouse', 'transform'], qids: ['de-3', 'de-102', 'de-103'] },
      { id: 'modeling', title: 'Dimensional Data Modeling', topic: 'Data Modeling', summary: 'OLTP vs OLAP, star schemas, SCD Type 2 and grain selection.', prereqs: [], related: ['sql'], next: ['warehouse', 'lakehouse'], qids: ['de-1', 'de-8', 'de-9'] },
      { id: 'storage', title: 'File Formats & Storage', topic: 'Storage', summary: 'Parquet/ORC columnar storage, partitioning, compaction and small files.', prereqs: [], related: ['modeling'], next: ['spark', 'lakehouse'], qids: ['de-25', 'de-26', 'de-27'] },
      { id: 'transform', title: 'ETL / ELT & Idempotency', topic: 'Transformation', summary: 'ETL vs ELT, dbt, idempotent backfills and late-arriving data.', prereqs: ['sql'], related: ['quality'], next: ['orch', 'spark'], qids: ['de-2', 'de-4', 'de-40'] },
      { id: 'spark', title: 'Distributed Compute (Spark)', topic: 'Spark', summary: 'Memory management, shuffles, broadcast joins and skew mitigation.', prereqs: ['storage', 'transform'], related: ['lakehouse'], next: ['arch'], qids: ['de-5', 'de-15', 'de-16'] },
      { id: 'lakehouse', title: 'Open Table Formats', topic: 'Lakehouse', summary: 'Apache Iceberg, Delta Lake, ACID transactions and time travel.', prereqs: ['storage', 'modeling'], related: ['spark'], next: ['arch'], qids: ['de-28', 'de-29', 'de-30'] },
      { id: 'warehouse', title: 'Cloud Data Warehouses', topic: 'Warehouses', summary: 'Clustering, micro-partitions, workload isolation and cost tuning.', prereqs: ['sql', 'modeling'], related: ['lakehouse'], next: ['quality', 'arch'], qids: ['de-34', 'de-35', 'de-37'] },
      { id: 'streaming', title: 'Streaming Pipelines', topic: 'Streaming', summary: 'Kafka/Flink event time, watermarks, exactly-once and CDC.', prereqs: ['transform'], related: ['spark'], next: ['arch'], qids: ['de-48', 'de-49', 'de-50'] },
      { id: 'orch', title: 'Orchestration', topic: 'Orchestration', summary: 'Airflow DAG design, retries, SLAs and dependency management.', prereqs: ['transform'], related: ['quality'], next: ['arch'], qids: ['de-43', 'de-44', 'de-45'] },
      { id: 'quality', title: 'Data Quality & Governance', topic: 'Data Quality', summary: 'Data contracts, lineage, PII masking and anomaly checks.', prereqs: ['transform'], related: ['orch'], next: ['arch'], qids: ['de-54', 'de-55', 'de-47'] },
      { id: 'arch', title: 'Data Platform Architecture', topic: 'Architecture', summary: 'Lambda vs Kappa, medallion layers and multi-tenant data platforms.', prereqs: ['spark', 'lakehouse', 'streaming'], related: ['quality'], next: [], qids: ['de-13', 'de-14', 'de-61'] }
    ],
    ml: [
      { id: 'fund', title: 'ML Fundamentals', topic: 'Fundamentals', summary: 'Bias-variance, regularization, gradient descent and loss functions.', prereqs: [], related: ['metrics'], next: ['prep', 'trees', 'dl'], qids: ['ml-1', 'ml-8', 'ml-9'] },
      { id: 'metrics', title: 'Evaluation & Metrics', topic: 'Metrics', summary: 'Precision/recall, PR-AUC, calibration and offline vs online metrics.', prereqs: ['fund'], related: ['prep'], next: ['trees', 'llms'], qids: ['ml-2', 'ml-12', 'ml-13'] },
      { id: 'prep', title: 'Data Prep & Leakage', topic: 'Data', summary: 'Feature scaling, class imbalance, temporal splits and data leakage.', prereqs: ['fund'], related: ['metrics'], next: ['trees', 'dl'], qids: ['ml-3', 'ml-17', 'ml-18'] },
      { id: 'trees', title: 'Tree Models & Ensembles', topic: 'Tree Models', summary: 'XGBoost/LightGBM, bagging vs boosting and tabular baselines.', prereqs: ['fund', 'prep'], related: ['metrics'], next: ['mlops'], qids: ['ml-21', 'ml-22', 'ml-23'] },
      { id: 'dl', title: 'Deep Learning', topic: 'Deep Learning', summary: 'Backpropagation, normalization, optimizers and training stability.', prereqs: ['fund'], related: ['trees'], next: ['trans'], qids: ['ml-26', 'ml-27', 'ml-28'] },
      { id: 'trans', title: 'Transformers & Attention', topic: 'Transformers', summary: 'Self-attention, positional encoding, KV cache and scaling laws.', prereqs: ['dl'], related: ['llms'], next: ['llms', 'rag'], qids: ['ml-35', 'ml-36', 'ml-37'] },
      { id: 'llms', title: 'LLMs & Inference', topic: 'LLMs', summary: 'Prompting vs fine-tuning, quantization, vLLM serving and evals.', prereqs: ['trans', 'metrics'], related: ['rag'], next: ['agents', 'sys'], qids: ['ml-4', 'ml-5', 'ml-6'] },
      { id: 'rag', title: 'Retrieval-Augmented Generation', topic: 'RAG', summary: 'Chunking, hybrid search, reranking and groundedness checks.', prereqs: ['llms'], related: ['agents'], next: ['agents', 'sys'], qids: ['ml-51', 'ml-52', 'ml-53'] },
      { id: 'agents', title: 'LLM Agents & Tool Use', topic: 'Agents', summary: 'Planning loops, tool sandboxing, memory and failure recovery.', prereqs: ['llms', 'rag'], related: ['mlops'], next: ['sys'], qids: ['ml-126', 'ml-127', 'ml-128'] },
      { id: 'mlops', title: 'MLOps & Monitoring', topic: 'MLOps', summary: 'Feature stores, drift detection, canary rollouts and retraining.', prereqs: ['trees', 'metrics'], related: ['sys'], next: ['sys'], qids: ['ml-59', 'ml-60', 'ml-61'] },
      { id: 'sys', title: 'ML System Design', topic: 'System design', summary: 'End-to-end ranking, recommendation and low-latency LLM architectures.', prereqs: ['llms', 'mlops'], related: ['agents'], next: [], qids: ['ml-7', 'ml-105', 'ml-110'] }
    ],
    datascience: [
      { id: 'stats', title: 'Probability & Statistics', topic: 'Statistics', summary: 'Distributions, confidence intervals, p-values and power analysis.', prereqs: [], related: ['sql'], next: ['exp', 'prep'], qids: ['ds-1', 'ds-4', 'ds-9'] },
      { id: 'sql', title: 'SQL & Python for Analytics', topic: 'SQL for data science', summary: 'Funnel queries, cohort retention and vectorized pandas.', prereqs: [], related: ['stats'], next: ['prep', 'exp'], qids: ['ds-8', 'ds-26', 'ds-15'] },
      { id: 'prep', title: 'Data Preparation & Features', topic: 'Data preparation', summary: 'Missingness mechanisms, outliers, leakage and feature engineering.', prereqs: ['stats', 'sql'], related: ['eval'], next: ['model'], qids: ['ds-5', 'ds-12', 'ds-22'] },
      { id: 'model', title: 'Statistical & ML Modeling', topic: 'Modeling', summary: 'Linear/logistic regression, regularization and tree ensembles.', prereqs: ['stats', 'prep'], related: ['eval'], next: ['causal', 'unsup'], qids: ['ds-10', 'ds-18', 'ds-19'] },
      { id: 'eval', title: 'Model Evaluation', topic: 'Model evaluation', summary: 'Cross-validation, class imbalance, calibration and business KPIs.', prereqs: ['stats', 'model'], related: ['exp'], next: ['causal'], qids: ['ds-3', 'ds-7', 'ds-21'] },
      { id: 'exp', title: 'A/B Testing & Experimentation', topic: 'Experimentation', summary: 'Sample size, novelty effects, peeking, CUPED and network interference.', prereqs: ['stats'], related: ['eval'], next: ['causal'], qids: ['ds-16', 'ds-33', 'ds-34'] },
      { id: 'unsup', title: 'Clustering & Segmentation', topic: 'Unsupervised learning', summary: 'K-means, hierarchical clustering, PCA and validation.', prereqs: ['model'], related: ['prep'], next: [], qids: ['ds-27', 'ds-28'] },
      { id: 'causal', title: 'Causal Inference', topic: 'Causal inference', summary: 'Confounding, propensity scores, difference-in-differences and uplift.', prereqs: ['exp', 'model'], related: ['eval'], next: [], qids: ['ds-31', 'ds-32', 'ds-47'] }
    ],
    qa: [
      { id: 'fund', title: 'Testing Fundamentals & Pyramid', topic: 'Fundamentals', summary: 'Test pyramid, equivalence partitioning, boundary values and risk.', prereqs: [], related: ['defects'], next: ['api', 'ui', 'strat'], qids: ['qa-7', 'qa-8', 'qa-4'] },
      { id: 'defects', title: 'Bug Reporting & Triage', topic: 'Defects', summary: 'Severity vs priority, minimal repros and root-cause collaboration.', prereqs: [], related: ['fund'], next: ['strat'], qids: ['qa-2', 'qa-14', 'qa-15'] },
      { id: 'api', title: 'API & Contract Testing', topic: 'API Testing', summary: 'HTTP assertions, schema validation, mocking and consumer contracts.', prereqs: ['fund'], related: ['db'], next: ['perf', 'sec'], qids: ['qa-26', 'qa-27', 'qa-30'] },
      { id: 'ui', title: 'UI & Browser Automation', topic: 'UI Automation', summary: 'Playwright/Selenium selectors, auto-waiting and flaky-test elimination.', prereqs: ['fund'], related: ['fw'], next: ['infra'], qids: ['qa-16', 'qa-17', 'qa-18'] },
      { id: 'fw', title: 'Test Frameworks & Architecture', topic: 'Frameworks', summary: 'Page objects/screenplay, test data isolation and parallel runs.', prereqs: ['ui', 'api'], related: ['infra'], next: ['infra'], qids: ['qa-23', 'qa-24', 'qa-25'] },
      { id: 'db', title: 'Database & State Verification', topic: 'Database', summary: 'Test data seeding, idempotency checks and transaction rollback.', prereqs: ['api'], related: ['perf'], next: ['rel'], qids: ['qa-37', 'qa-55', 'qa-85'] },
      { id: 'perf', title: 'Load & Performance Testing', topic: 'Performance', summary: 'k6/JMeter scenarios, p95/p99 SLAs and bottleneck isolation.', prereqs: ['api'], related: ['rel'], next: ['strat'], qids: ['qa-32', 'qa-33', 'qa-35'] },
      { id: 'sec', title: 'Security Testing', topic: 'Security', summary: 'Auth bypass checks, injection payloads and dependency scanning.', prereqs: ['api'], related: ['strat'], next: [], qids: ['qa-45', 'qa-69', 'qa-72'] },
      { id: 'infra', title: 'CI/CD & Test Infrastructure', topic: 'Infrastructure', summary: 'Ephemeral environments, sharding, containers and artifact reports.', prereqs: ['fw'], related: ['rel'], next: ['strat'], qids: ['qa-38', 'qa-87', 'qa-100'] },
      { id: 'rel', title: 'Reliability & Release Quality', topic: 'Reliability', summary: 'Chaos checks, synthetic monitors and release readiness gates.', prereqs: ['perf', 'infra'], related: ['strat'], next: ['strat'], qids: ['qa-39', 'qa-63', 'qa-75'] },
      { id: 'strat', title: 'Quality Strategy', topic: 'Strategy', summary: 'Shift-left quality, microservice test plans and risk-based coverage.', prereqs: ['api', 'ui', 'perf'], related: ['rel'], next: [], qids: ['qa-5', 'qa-47', 'qa-48'] }
    ],
    security: [
      { id: 'fund', title: 'Security Fundamentals & Threat Modeling', topic: 'Fundamentals', summary: 'CIA triad, least privilege, defense in depth and STRIDE.', prereqs: [], related: ['crypto'], next: ['web', 'iam'], qids: ['sec-102', 'sec-104', 'sec-105'] },
      { id: 'crypto', title: 'Applied Cryptography & TLS', topic: 'Cryptography', summary: 'Symmetric vs asymmetric, hashing, TLS 1.3 and key rotation.', prereqs: [], related: ['fund'], next: ['iam', 'appsec'], qids: ['sec-1', 'sec-22', 'sec-29'] },
      { id: 'web', title: 'Web Security (XSS, CSRF, SQLi)', topic: 'Web security', summary: 'Input/output encoding, CSP, same-site cookies and parameterized queries.', prereqs: ['fund'], related: ['appsec'], next: ['apis', 'appsec'], qids: ['sec-2', 'sec-107', 'sec-112'] },
      { id: 'iam', title: 'IAM, OAuth2 & OIDC', topic: 'IAM', summary: 'Authentication flows, PKCE, RBAC/ABAC and token scoping.', prereqs: ['fund', 'crypto'], related: ['apis'], next: ['cloud'], qids: ['sec-32', 'sec-33', 'sec-4'] },
      { id: 'appsec', title: 'Application Security', topic: 'AppSec', summary: 'SSRF, deserialization, secrets management and SAST/DAST.', prereqs: ['web', 'crypto'], related: ['apis'], next: ['arch'], qids: ['sec-8', 'sec-9', 'sec-10'] },
      { id: 'apis', title: 'API & Perimeter Security', topic: 'APIs', summary: 'mTLS, rate limiting, BOLA/IDOR prevention and WAF trade-offs.', prereqs: ['web', 'iam'], related: ['appsec'], next: ['cloud'], qids: ['sec-69', 'sec-70', 'sec-52'] },
      { id: 'cloud', title: 'Cloud & Container Security', topic: 'Cloud', summary: 'Workload identity, KMS, network segmentation and image signing.', prereqs: ['iam'], related: ['k8s'], next: ['k8s', 'arch'], qids: ['sec-40', 'sec-41', 'sec-44'] },
      { id: 'k8s', title: 'Kubernetes Security', topic: 'Kubernetes', summary: 'Pod security standards, network policies, RBAC and runtime isolation.', prereqs: ['cloud'], related: ['ops'], next: ['arch'], qids: ['sec-46', 'sec-47', 'sec-48'] },
      { id: 'ops', title: 'Detection & Incident Response', topic: 'Operations', summary: 'SIEM signals, containment, forensics and blast-radius reduction.', prereqs: ['cloud'], related: ['k8s'], next: ['arch'], qids: ['sec-55', 'sec-56', 'sec-57'] },
      { id: 'arch', title: 'Zero Trust & Data Security Architecture', topic: 'Architecture', summary: 'End-to-end encryption, tokenization, Zero Trust and compliance.', prereqs: ['appsec', 'k8s', 'ops'], related: [], next: [], qids: ['sec-54', 'sec-87', 'sec-117'] }
    ],
    leadership: [
      { id: 'behav', title: 'Behavioral & Core Collaboration', topic: 'Behavioral', summary: 'Code review disagreements, learning fast and cross-team trust.', prereqs: [], related: ['comm'], next: ['people', 'delivery'], qids: ['lead-101', 'lead-102', 'lead-110'] },
      { id: 'comm', title: 'Communication & Alignment', topic: 'Communication', summary: 'RFCs, ADRs, stakeholder updates and framing technical trade-offs.', prereqs: [], related: ['behav'], next: ['strategy', 'org'], qids: ['lead-30', 'lead-75', 'lead-106'] },
      { id: 'people', title: '1-on-1s, Coaching & Performance', topic: 'People', summary: 'Feedback loops, underperformance plans, growth paths and retention.', prereqs: ['behav'], related: ['hiring'], next: ['mgmt', 'culture'], qids: ['lead-1', 'lead-7', 'lead-8'] },
      { id: 'hiring', title: 'Hiring & Onboarding', topic: 'Hiring', summary: 'Structured interviews, calibration, 30-60-90 plans and bar raising.', prereqs: ['people'], related: ['culture'], next: ['org'], qids: ['lead-6', 'lead-15', 'lead-16'] },
      { id: 'delivery', title: 'Execution & Prioritisation', topic: 'Delivery', summary: 'Scope slicing, technical debt balance, risk management and milestones.', prereqs: ['behav', 'comm'], related: ['ops'], next: ['strategy'], qids: ['lead-5', 'lead-25', 'lead-2'] },
      { id: 'ops', title: 'Operational Excellence & Postmortems', topic: 'Operations', summary: 'On-call health, blameless postmortems and reliability ownership.', prereqs: ['delivery'], related: ['culture'], next: ['mgmt'], qids: ['lead-32', 'lead-33', 'lead-34'] },
      { id: 'culture', title: 'Engineering Culture', topic: 'Culture', summary: 'Psychological safety, RFC culture and autonomy with accountability.', prereqs: ['people'], related: ['ops'], next: ['org'], qids: ['lead-13', 'lead-46', 'lead-49'] },
      { id: 'mgmt', title: 'Engineering Management', topic: 'Management', summary: 'Delegation, conflict resolution and managing through tech leads.', prereqs: ['people', 'delivery'], related: ['culture'], next: ['org', 'strategy'], qids: ['lead-42', 'lead-43', 'lead-44'] },
      { id: 'strategy', title: 'Technical Direction & Strategy', topic: 'Strategy', summary: 'Multi-team technical vision, build vs buy and platform bets.', prereqs: ['comm', 'delivery'], related: ['mgmt'], next: ['org'], qids: ['lead-4', 'lead-18', 'lead-19'] },
      { id: 'org', title: 'Org Design & Scaling', topic: 'Organization', summary: 'Team topologies, Conway\'s Law, cross-org dependencies and governance.', prereqs: ['mgmt', 'strategy', 'hiring'], related: ['culture'], next: [], qids: ['lead-38', 'lead-39', 'lead-40'] }
    ]
  };

  /* Topological sort of a role's curated map (deterministic tie-break by original array order). */
  function orderNodes(nodes) {
    const byId = {}, indeg = {}, adj = {}, pos = {};
    nodes.forEach(function (n, i) { byId[n.id] = n; indeg[n.id] = (n.prereqs || []).length; adj[n.id] = []; pos[n.id] = i; });
    nodes.forEach(function (n) { (n.prereqs || []).forEach(function (p) { if (adj[p]) adj[p].push(n.id); }); });
    const ready = nodes.filter(function (n) { return indeg[n.id] === 0; }).map(function (n) { return n.id; });
    const out = [];
    while (ready.length) {
      ready.sort(function (a, b) { return pos[a] - pos[b]; });
      const id = ready.shift();
      out.push(byId[id]);
      (adj[id] || []).forEach(function (nxt) { indeg[nxt]--; if (indeg[nxt] === 0) ready.push(nxt); });
    }
    return out;
  }

  /* Compute status and weak-prerequisite alerts for a role's dependency map using local progress. */
  function forRole(roleId, bank, state) {
    const raw = MAPS[roleId] || MAPS.general;
    const ordered = orderNodes(raw);
    state = state || {};
    const done = state.done || {};
    const practice = state.practice || {};
    const byId = {};
    (bank || []).forEach(function (e) { byId[e.id] = e; });

    const nodes = ordered.map(function (n, idx) {
      const curated = (n.qids || []).map(function (id) { return byId[id]; }).filter(Boolean);
      const topicMatches = (bank || []).filter(function (e) { return e.role === roleId && e.topic === n.topic; });
      const seen = new Set(curated.map(function (e) { return e.id; }));
      const qs = curated.concat(topicMatches.filter(function (e) { return !seen.has(e.id); })).slice(0, 5);
      const prepared = qs.filter(function (e) { return !!done[e.id]; }).length;
      const weakQs = qs.filter(function (e) { return practice[e.id] && practice[e.id].last === 'again'; }).length;
      const attempted = qs.filter(function (e) { return !!practice[e.id] || !!done[e.id]; }).length;
      const status = weakQs > 0 ? 'weak' : (prepared >= Math.min(2, qs.length) && qs.length > 0) ? 'strong' : attempted > 0 ? 'in-progress' : 'unstarted';
      return Object.assign({}, n, {
        step: idx + 1,
        questions: qs,
        prepared: prepared,
        total: qs.length,
        weakCount: weakQs,
        status: status,
        href: '#/questions?role=' + encodeURIComponent(roleId) + '&topic=' + encodeURIComponent(n.topic)
      });
    });

    const nodeById = {};
    nodes.forEach(function (n) { nodeById[n.id] = n; });
    nodes.forEach(function (n) {
      n.weakPrereqs = (n.prereqs || []).map(function (pid) { return nodeById[pid]; }).filter(function (p) {
        if (!p) return false;
        return p.status === 'weak' || (p.status === 'unstarted' && n.status !== 'unstarted');
      }).map(function (p) {
        return { id: p.id, title: p.title, reason: p.status === 'weak' ? 'has weak questions in Drill' : 'not started yet' };
      });
    });

    return { role: roleId, nodes: nodes, byId: nodeById };
  }

  function validate(bank) {
    const ids = new Set((bank || []).map(function (e) { return e.id; }));
    const errors = [];
    Object.keys(MAPS).forEach(function (role) {
      const list = MAPS[role];
      const nodeIds = new Set(list.map(function (n) { return n.id; }));
      if (orderNodes(list).length !== list.length) errors.push(role + ': cycle in prerequisites');
      list.forEach(function (n) {
        ['prereqs', 'related', 'next'].forEach(function (k) {
          (n[k] || []).forEach(function (ref) { if (!nodeIds.has(ref)) errors.push(role + '.' + n.id + ': unknown ' + k + ' ' + ref); });
        });
        if (!n.qids || !n.qids.length) errors.push(role + '.' + n.id + ': missing qids');
        (n.qids || []).forEach(function (qid) { if (!ids.has(qid)) errors.push(role + '.' + n.id + ': unknown qid ' + qid); });
      });
    });
    return { ok: errors.length === 0, errors: errors };
  }

  IGU.topicMap = { MAPS: MAPS, orderNodes: orderNodes, forRole: forRole, validate: validate };
})();
