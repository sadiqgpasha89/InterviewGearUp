/* Data engineer. */
(function () {
  const IGU = window.IGU, L = IGU.L;
  IGU.add([
    {
      id: 'de-1', role: 'data', level: 1, topic: 'Data modelling',
      q: 'What is the difference between OLTP and OLAP? What is a star schema?',
      short: "OLTP systems handle many small, fast transactions on current data (orders, payments) with normalised, row-oriented storage. OLAP systems answer analytical queries that scan large volumes of history, usually with denormalised star schemas and columnar storage.",
      detail: L(
        "- **Workload**: OLTP does many short reads and writes. OLAP does fewer, heavy, read-mostly scans and aggregations.",
        "- **Schema**: OLTP is normalised to avoid duplication. OLAP is denormalised for fewer joins and simple queries.",
        "- **Storage**: row stores suit fetching whole records. Column stores read only the columns a query needs and compress well.",
        "",
        "#### Star schema",
        "A central **fact table** (measurable events such as sales, with foreign keys and numeric measures) surrounded by **dimension tables** (customer, product, date). Decide the **grain** first: what does one fact row represent?",
        "",
        "A snowflake schema normalises the dimensions further, trading simplicity for less duplication.",
        "",
        "#### Slowly changing dimensions",
        "Type 1 overwrites the old value. Type 2 adds a new row with validity dates, preserving history (for example, a customer's region over time)."
      ),
      follow: ['What is the grain of a fact table?', 'Give an example of a type 2 slowly changing dimension.', 'Why are column stores good for analytics?'],
      tags: ['oltp', 'olap', 'star schema', 'data warehouse', 'dimension', 'fact']
    },
    {
      id: 'de-2', role: 'data', level: 1, topic: 'Pipelines',
      q: 'ETL versus ELT: what is the difference and when do you choose each?',
      short: "ETL transforms data before loading it into the target; ELT loads raw data first and transforms inside the warehouse. ELT dominates now because cloud warehouses make compute cheap and raw data lets you re-transform when logic changes.",
      detail: L(
        "**ETL**: transformation runs in a separate engine. Useful when sensitive fields must be masked before data lands, or when the target has limited compute.",
        "",
        "**ELT**: land raw data, then build staging and modelled layers (raw, staging, marts, or bronze, silver, gold) with SQL. Tools like dbt add version control, tests and lineage to the transformations.",
        "",
        "#### Trade-offs",
        "ELT keeps more data (storage cost, and governance of raw personal data), but is flexible and auditable. ETL can become rigid because logic is baked into the load.",
        "",
        "#### Choosing",
        "Consider volume, compliance (where PII may land), team skills and target engine. An orchestrator such as Airflow or Dagster handles scheduling, dependencies and retries either way."
      ),
      follow: ['Where would you mask PII?', 'What does dbt do?', 'What is a medallion architecture?'],
      tags: ['etl', 'elt', 'dbt', 'warehouse', 'pipeline', 'airflow']
    },
    {
      id: 'de-3', role: 'data', level: 2, topic: 'SQL',
      q: 'Write SQL to find the top 2 earners in each department, and a running total of revenue by month.',
      short: "Use window functions: DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) and filter on the rank in an outer query; SUM(...) OVER (ORDER BY month) for running totals.",
      detail: L(
        "```sql",
        "SELECT * FROM (",
        "  SELECT name, dept, salary,",
        "         DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk",
        "  FROM employees",
        ") t",
        "WHERE rnk <= 2;",
        "",
        "SELECT month, revenue,",
        "       SUM(revenue) OVER (ORDER BY month) AS running_total,",
        "       revenue - LAG(revenue) OVER (ORDER BY month) AS change",
        "FROM monthly_revenue;",
        "```",
        "",
        "- `ROW_NUMBER` gives unique numbers. `RANK` gives ties the same rank and leaves gaps. `DENSE_RANK` gives ties the same rank with no gaps.",
        "- Window functions run after `WHERE` and `GROUP BY`, so filter on them in an outer query or CTE (some engines, such as Snowflake and BigQuery, offer `QUALIFY`).",
        "- A moving average uses a frame: `AVG(x) OVER (ORDER BY d ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`.",
        "- With `ORDER BY` and no explicit frame, the default frame is `RANGE` from the start to the current row, which treats ties as peers.",
        "",
        "To dedupe keeping the latest row per key, use `ROW_NUMBER() OVER (PARTITION BY key ORDER BY updated_at DESC) = 1`."
      ),
      follow: ['RANK versus DENSE_RANK?', 'How would you dedupe rows keeping the latest?', 'How do you compute a 7-day moving average?'],
      tags: ['sql', 'window function', 'rank', 'running total', 'lag', 'partition']
    },
    {
      id: 'de-4', role: 'data', level: 2, topic: 'Pipelines',
      q: 'How do you make a data pipeline idempotent and handle late-arriving data and backfills?',
      short: "Design every load so re-running it for the same time window gives the same result: write by partition with overwrite or MERGE on a business key, never blind appends, and separate event time from processing time to handle late data.",
      detail: L(
        "Retries, failures and backfills are normal, so rerunning must be safe.",
        "",
        "#### Idempotent writes",
        "- Overwrite the date partition (delete and insert in one transaction, or `INSERT OVERWRITE`).",
        "- `MERGE` (upsert) on a primary key, deduplicating by latest `updated_at`.",
        "- Stage data, then swap atomically.",
        "- Keep transforms deterministic: pass the logical run date as a parameter instead of calling `now()` inside logic.",
        "",
        "#### Late data",
        "Process by **event time**, not arrival time. Reprocess a trailing window (say the last 3 days) on every run, or rebuild affected partitions when late records arrive. In streaming, use watermarks with an allowed lateness.",
        "",
        "#### Backfills",
        "A parameterised job over a date range, run in parallel with limits, writing to the same idempotent targets.",
        "",
        "#### Safety nets",
        "Row-count and freshness audits, uniqueness and null checks that fail the run, and schema-change detection."
      ),
      follow: ['How would you backfill two years of data?', 'How do you detect duplicates?', 'What is the difference between event time and processing time?'],
      tags: ['idempotent', 'backfill', 'late data', 'merge', 'pipeline', 'partition']
    },
    {
      id: 'de-5', role: 'data', level: 3, topic: 'Spark',
      q: 'A Spark job is slow because of data skew. How do you diagnose and fix it?',
      short: "Skew means a few keys hold most of the data, so one or two tasks run far longer than the rest. Fix by broadcasting the small side of a join, enabling adaptive query execution, or salting hot keys.",
      detail: L(
        "**Diagnose**: in the Spark UI one stage shows a maximum task time far above the median, uneven shuffle read sizes, and sometimes spills or out-of-memory errors on a few tasks.",
        "",
        "#### Fixes",
        "1. **Broadcast join** when one side is small: `broadcast(smallDf)` avoids shuffling the large side.",
        "2. **Adaptive Query Execution** (Spark 3+, `spark.sql.adaptive.enabled`) can split skewed partitions in joins automatically.",
        "3. **Salting**: append a random suffix to the hot keys on the large side, replicate the small side across those suffixes, join, then aggregate the partial results.",
        "4. **Isolate the hot key**: a classic culprit is NULL or a default like 'unknown'. Filter it out or process it separately.",
        "5. **Pre-aggregate** before the shuffle (combiners, `reduceByKey`-style logic).",
        "6. **Tune partitioning**: better key, or `spark.sql.shuffle.partitions`.",
        "",
        "Also check for many small files and an inefficient file format (use Parquet).",
        "",
        "State the trade-offs: salting adds complexity, and broadcasting is limited by executor memory."
      ),
      follow: ['How do you spot skew in the Spark UI?', 'What does adaptive query execution do?', 'Why is a NULL key often the culprit?'],
      tags: ['spark', 'skew', 'shuffle', 'performance', 'join', 'salting', 'big data']
    },
    {
      id: 'de-6', role: 'data', level: 3, topic: 'System design',
      q: 'Design a clickstream analytics pipeline.',
      short: "Collect events with an SDK into a durable log (Kafka or a managed equivalent), validate against a schema, land raw data in object storage, process in streaming for fresh metrics and in batch for authoritative history, and serve through a warehouse or OLAP store.",
      detail: L(
        "**Clarify**: event volume (say 50,000 per second), freshness (seconds or hours), consumers (dashboards, ML features, ad-hoc analysis), retention, privacy.",
        "",
        "#### Architecture",
        "Client SDK, then a stateless collector that batches events, then Kafka topics (partitioned by user or session id). From there:",
        "- A **stream processor** (Flink or Spark Structured Streaming) for sessionisation, enrichment and near-real-time aggregates, serving a store such as ClickHouse, Druid or Pinot.",
        "- A **sink to object storage** as Parquet partitioned by date and hour, feeding batch models (for example dbt) for authoritative tables.",
        "",
        "#### Data quality",
        "Schema registry with Avro or Protobuf, a dead-letter topic for bad events, deduplication by `event_id`, watermarks for late events, bot filtering.",
        "",
        "#### Privacy",
        "Consent handling, hashing or removing PII, retention limits, and a way to honour deletion requests.",
        "",
        "#### Operations",
        "Replay from Kafka or the raw lake, monitoring of consumer lag, freshness and volume anomalies, and compaction of small files to control cost."
      ),
      follow: ['How do you handle duplicates and late events?', 'How would you sessionise clicks?', 'How would you honour a GDPR deletion request?'],
      tags: ['clickstream', 'kafka', 'streaming', 'pipeline', 'system design', 'analytics', 'flink']
    },
    {
      id: 'de-7', role: 'data', level: 4, topic: 'Strategy',
      q: 'Warehouse or lakehouse? How do you choose, and how do you govern data quality across teams?',
      short: "A warehouse gives managed, fast SQL on curated data. A lake gives cheap, flexible storage. A lakehouse adds table formats (Delta, Iceberg, Hudi) with ACID guarantees on open files, so one copy serves BI and ML. Choose by workloads, governance needs, skills and lock-in tolerance.",
      detail: L(
        "#### Decision factors",
        "Data variety (unstructured data and ML versus mostly relational BI), concurrency and latency needs, cost model (separation of storage and compute), open formats and portability (Iceberg is engine-neutral), governance features (catalog, lineage, row and column security), and team skills. Many organisations run both: a lakehouse for raw and large data, a warehouse for serving.",
        "",
        "#### Governance at scale",
        "- **Data contracts** between producers and consumers: schema, semantics, SLAs and named owners.",
        "- **Quality tests at ingestion**, with freshness and completeness SLAs.",
        "- **Ownership by domain**, with a central platform providing paved roads (data mesh only works if the organisation is big enough to staff it).",
        "- Cataloguing, PII classification and access policies.",
        "- Cost controls: tagging, query limits, lifecycle rules.",
        "",
        "#### Migration",
        "Move domain by domain, run old and new in parallel, and reconcile outputs before cutover. Avoid big-bang migrations.",
        "",
        "Success metrics: freshness, number of trusted datasets in use, data incidents, cost per query."
      ),
      follow: ['What do Iceberg or Delta give you over plain Parquet files?', 'What is a data contract?', 'When is data mesh a bad idea?'],
      tags: ['lakehouse', 'warehouse', 'governance', 'data quality', 'iceberg', 'delta', 'strategy', 'data contract']
    }
  ]);
})();
