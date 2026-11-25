/* Data engineering: curated answers. AI-drafted, not yet reviewed by a person (see CONTRIBUTING.md). */
(function () {
  const IGU = window.IGU, L = IGU.L;
  const meta = function (difficulty) { return { difficulty: difficulty, reviewStatus: 'ai-drafted', contentVersion: 1 }; };

  IGU.revise([
    Object.assign(meta('hard'), {
      id: "de-52",
      short: "Flink periodically injects checkpoint barriers into the data streams. When an operator has received the barrier on all its inputs, it snapshots its state to durable storage and forwards the barrier, producing a consistent global snapshot without stopping the job. After a failure, Flink restores every operator from the last completed checkpoint and replays the sources from the recorded offsets.",
      detail: L(
        "**Flow**: the coordinator triggers a checkpoint; sources record their offsets and emit a barrier. Barriers travel with the records. An operator with several inputs performs **barrier alignment**: it buffers records from channels that already delivered the barrier until all channels have, then snapshots its state and forwards the barrier. Completion is acknowledged to the coordinator.",
        "",
        "#### Making it fast",
        "- **Asynchronous snapshots**: state is copied in the background. The RocksDB state backend supports **incremental** checkpoints that upload only changed files.",
        "- **Unaligned checkpoints** let barriers overtake buffered data to cut checkpoint time under backpressure, at the cost of storing in-flight records.",
        "",
        "#### Guarantees",
        "State is exactly-once within Flink after recovery. End-to-end exactly-once also needs a replayable source (such as Kafka offsets) and an idempotent or transactional sink.",
        "",
        "#### Operating it",
        "Tune the interval (trading recovery time against overhead), set a timeout and a minimum pause between checkpoints, watch checkpoint duration and alignment time, and use **savepoints** for planned upgrades."
      ),
      follow: ["What is barrier alignment and when would you prefer unaligned checkpoints?", "How does a two-phase-commit sink fit into checkpointing?"],
      tags: ["flink", "checkpointing", "streaming", "exactly-once", "state"]
    }),
    Object.assign(meta('hard'), {
      id: "de-85",
      short: "Data mesh is an organizational approach with four principles: domain-oriented ownership of data, data as a product, a self-serve data platform, and federated computational governance. It moves responsibility for analytical data from a central data team to the domain teams that know the data, with a platform team providing shared tooling and global rules.",
      detail: L(
        "#### The four principles",
        "1. **Domain ownership**: the team that produces the data (orders, payments) owns its analytical datasets, not only the operational system.",
        "2. **Data as a product**: each dataset has an owner, documentation, SLAs for freshness and quality, a stable schema and a discoverable address, and consumers are treated as customers.",
        "3. **Self-serve platform**: a platform team provides storage, pipelines, cataloging, access control and monitoring so domain teams can publish without becoming infrastructure experts.",
        "4. **Federated governance**: common standards (identity, privacy classification, interoperability) are defined by a council of domain and platform representatives and enforced as automated policy.",
        "",
        "#### When it helps",
        "Large organizations where a central team has become a bottleneck and domains differ widely.",
        "",
        "#### Risks",
        "- It is mostly organizational change; buying tools does not create it.",
        "- Domain teams need data-engineering skills and capacity, or quality gets worse.",
        "- Without strong standards you get silos and inconsistent definitions.",
        "- It is overkill for small or mid-size companies, where a well-run central platform is simpler.",
        "",
        "A practical start: pick two or three domains, define a data product contract (schema, SLA, owner), and build just enough platform to publish and discover them."
      ),
      follow: ["What belongs in a data product contract?", "How would you decide whether your organization is ready for data mesh?"],
      tags: ["data mesh", "data products", "governance", "architecture", "ownership"]
    })
  ]);

  IGU.add([
    Object.assign(meta('easy'), {
      id: "de-101", role: "data", level: 1, topic: "Fundamentals",
      q: "What is the difference between a data warehouse and a data lake?",
      short: "A data warehouse stores cleaned, structured data in a modelled schema (often star schemas) optimized for SQL analytics, using schema-on-write. A data lake stores raw data in any format in cheap object storage and applies structure when it is read (schema-on-read). A lakehouse adds table formats and SQL engines on top of lake storage.",
      detail: L(
        "#### Warehouse",
        "- Structured, curated, modelled data with fast SQL, governed access and consistent metric definitions.",
        "- Schema-on-write: data is transformed before loading, which takes effort up front but makes queries predictable.",
        "- Examples: Snowflake, BigQuery, Redshift.",
        "",
        "#### Lake",
        "- Raw files (JSON, CSV, Parquet, logs, images) in object storage such as S3; very cheap and flexible, and good for data science and unstructured data.",
        "- Schema-on-read: structure is applied at query time, which risks a data swamp without cataloging, quality checks and ownership.",
        "",
        "#### Lakehouse",
        "Open table formats (Delta Lake, Apache Iceberg, Hudi) add transactions, schema evolution and time travel to lake files, so one copy of the data can serve both BI and machine learning.",
        "",
        "**How to choose**: heavy reporting with strict definitions leans towards a warehouse; large volumes of raw or varied data lean towards a lake. Many teams keep raw data in a lake and serve curated marts from a warehouse or lakehouse."
      ),
      follow: ["What problems do table formats like Iceberg solve compared with plain Parquet files?", "What is a data swamp and how do you avoid it?"],
      tags: ["data warehouse", "data lake", "lakehouse", "architecture", "schema-on-read"]
    }),
    Object.assign(meta('medium'), {
      id: "de-102", role: "data", level: 1, topic: "SQL",
      q: "How do you remove duplicate rows in SQL while keeping the most recent one?",
      short: "Rank rows within each duplicate group using ROW_NUMBER() OVER (PARTITION BY key ORDER BY updated_at DESC) and keep rank 1. SELECT DISTINCT only removes rows that are identical in every selected column, so it cannot choose which of several different versions to keep.",
      detail: L(
        "```sql",
        "SELECT *",
        "FROM (",
        "  SELECT t.*,",
        "         ROW_NUMBER() OVER (",
        "           PARTITION BY customer_id",
        "           ORDER BY updated_at DESC, id DESC",
        "         ) AS rn",
        "  FROM customers t",
        ") x",
        "WHERE rn = 1;",
        "```",
        "",
        "- `PARTITION BY` defines what counts as a duplicate; `ORDER BY` decides which row wins. Add a tie-breaker (here `id`) so the result is deterministic.",
        "- To delete duplicates in place, delete the rows where `rn > 1`, using a CTE or the table's physical row identifier.",
        "- `GROUP BY` with `MAX(updated_at)` also works but needs a join back to fetch the other columns.",
        "- `DISTINCT ON (customer_id)` in PostgreSQL, and `QUALIFY` in Snowflake and BigQuery, are shorter forms of the same idea.",
        "",
        "In pipelines, prevent duplicates at the source with a unique key and an upsert (`MERGE`) so that cleanup is not needed."
      ),
      follow: ["How does RANK differ from ROW_NUMBER when there are ties?", "How would you prevent duplicates from arriving in the first place?"],
      tags: ["sql", "window functions", "deduplication", "row_number"]
    })
  ]);
})();
