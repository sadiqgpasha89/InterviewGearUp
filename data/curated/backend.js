/* Backend: curated answers. AI-drafted, not yet reviewed by a person (see CONTRIBUTING.md). */
(function () {
  const IGU = window.IGU, L = IGU.L;
  const meta = function (difficulty) { return { difficulty: difficulty, reviewStatus: 'ai-drafted', contentVersion: 1 }; };

  IGU.revise([
    Object.assign(meta('easy'), {
      id: "be-65",
      short: "A parameterized query sends the SQL text and the values separately: the database parses and plans the statement first and then binds the values as data, so user input can never change the structure of the query. String concatenation mixes input into the SQL text, which lets an attacker add their own SQL.",
      detail: L(
        "```python",
        "# Vulnerable: input becomes part of the SQL",
        "cur.execute(\"SELECT * FROM users WHERE email = '\" + email + \"'\")",
        "# email = \"x' OR '1'='1\" returns every row",
        "",
        "# Safe: placeholder, value bound separately",
        "cur.execute(\"SELECT * FROM users WHERE email = %s\", (email,))",
        "```",
        "",
        "With a placeholder the statement is compiled with a hole in it; whatever is bound to that hole is treated as a literal value, even if it contains quotes or semicolons. Many drivers do this on the server (prepared statements); some emulate it by escaping on the client, which is weaker.",
        "",
        "#### Limits",
        "- Placeholders only work for **values**. Table names, column names and `ORDER BY` direction cannot be bound, so validate them against an allow-list.",
        "- ORMs use parameters under the hood, but their raw-query escape hatches (and any string-built `WHERE`) are still injectable.",
        "- Add defense in depth: least-privilege database accounts, input validation, and never showing database errors to users."
      ),
      follow: ["How would you safely build a dynamic ORDER BY column from user input?", "Does using stored procedures prevent SQL injection?"],
      tags: ["sql injection", "prepared statements", "security", "database"]
    }),
    Object.assign(meta('hard'), {
      id: "be-44",
      short: "A saga replaces a distributed transaction with a sequence of local transactions, each with a compensating action that undoes it if a later step fails. In choreography, services react to each other's events; in orchestration, a central coordinator tells each service what to do next and triggers compensations.",
      detail: L(
        "**Example**: place order, reserve stock, charge payment, schedule shipping. If payment fails, run compensations in reverse: release the stock, cancel the order.",
        "",
        "#### Choreography vs orchestration",
        "- **Choreography**: each service publishes events and listens for others. There is no central point of failure and coupling is loose, but the flow is implicit, hard to see and debug, and cyclic dependencies creep in as it grows.",
        "- **Orchestration**: an orchestrator (a workflow engine such as Temporal or AWS Step Functions, or your own state machine) holds the flow and its state. It is easier to reason about, monitor and change, at the cost of a central component.",
        "",
        "#### What makes sagas hard",
        "- **No isolation**: other transactions can see intermediate states. Use semantic locks (a `PENDING` status), commutative updates or re-reads.",
        "- **Compensations are not rollbacks**: you cannot un-send an email. A compensation may be a refund or an apology, and it must itself be retryable.",
        "- **Idempotency and the outbox pattern**: handlers must tolerate duplicate messages, and publishing an event must be atomic with the local database write.",
        "- Timeouts, stuck sagas and manual intervention need to be designed in.",
        "",
        "Rule of thumb: choreography for two or three steps, orchestration once the flow has branches or many participants."
      ),
      follow: ["How does the transactional outbox pattern help sagas?", "How would you handle a compensation that fails?"],
      tags: ["saga", "distributed transactions", "microservices", "choreography", "orchestration"]
    }),
    Object.assign(meta('hard'), {
      id: "be-51",
      short: "Raft keeps a replicated log consistent using a single leader. Nodes start as followers; one that hears no heartbeat becomes a candidate and asks for votes in a new term, and a majority makes it leader. The leader appends entries, replicates them to followers, and commits an entry once a majority has stored it.",
      detail: L(
        "#### Leader election",
        "Every node waits a randomized election timeout. If no heartbeat arrives, it increments its **term**, votes for itself and asks the others for votes. A node grants one vote per term, and only to a candidate whose log is at least as up to date as its own. A majority of votes makes the candidate leader. Randomized timeouts make split votes rare, and the next term retries them.",
        "",
        "#### Log replication",
        "Clients send commands to the leader, which appends them to its log and sends `AppendEntries` to followers. Each request carries the index and term of the preceding entry; a follower rejects it if that does not match, and the leader backs up until the logs agree, then overwrites any conflicting entries. An entry is **committed** once it is stored on a majority; the leader then applies it and tells followers in later messages.",
        "",
        "#### Safety properties",
        "- At most one leader per term. A committed entry is never lost, because any new leader needs votes from a majority, and that majority overlaps the one that stored the entry.",
        "- A leader only commits entries from its **own term** by counting replicas; earlier entries become committed indirectly.",
        "",
        "#### Practical notes",
        "Three or five nodes tolerate one or two failures. Every write pays a majority round trip, and a minority partition cannot make progress. etcd, Consul and CockroachDB use Raft."
      ),
      follow: ["What happens when a leader is partitioned away from the majority?", "Why does adding a fourth node to a three-node cluster not improve fault tolerance?"],
      tags: ["raft", "consensus", "distributed systems", "leader election", "replication"]
    })
  ]);

  IGU.add([
    Object.assign(meta('easy'), {
      id: "be-101", role: "backend", level: 1, topic: "Databases",
      q: "What is the difference between SQL and NoSQL databases, and how do you choose between them?",
      short: "SQL databases store data in tables with a fixed schema, support joins and ACID transactions, and usually scale up first. NoSQL covers several models (key-value, document, wide-column, graph) that trade some of that for flexible schemas or easier horizontal scaling. Choose by access pattern and consistency needs, not by fashion.",
      detail: L(
        "#### Main NoSQL families",
        "- **Key-value** (Redis, DynamoDB): lookups by key, very fast and simple.",
        "- **Document** (MongoDB): JSON-like records with a flexible schema, good for data that is read together as one aggregate.",
        "- **Wide-column** (Cassandra): very high write throughput across many nodes.",
        "- **Graph** (Neo4j): relationship-heavy queries.",
        "",
        "#### How to choose",
        "- Need multi-row transactions, ad-hoc queries and reporting? Start with a relational database. PostgreSQL covers more than most people expect, including JSON columns.",
        "- Known, simple access patterns at huge scale, or a schema that varies per record? A NoSQL store can fit better, but you design the data around your queries and often give up joins and cross-record transactions.",
        "- Many systems use both: a relational source of truth plus a cache or search index.",
        "",
        "**Common mistake**: saying 'NoSQL is faster' or 'SQL does not scale'. Each choice has trade-offs. Many NoSQL systems default to eventual consistency, though several now offer transactions."
      ),
      follow: ["When would you put JSON in a relational database instead of using a document store?", "What does eventually consistent mean for the user of an application?"],
      tags: ["sql", "nosql", "databases", "trade-offs", "consistency"]
    }),
    Object.assign(meta('easy'), {
      id: "be-102", role: "backend", level: 1, topic: "Databases",
      q: "What is a database index and what does it cost?",
      short: "An index is a separate sorted structure, usually a B-tree, that lets the database find rows by a column without scanning the whole table, turning a full scan into roughly a logarithmic lookup. The cost is extra storage and slower writes, because every insert, update or delete must also maintain each index.",
      detail: L(
        "**How it helps**: `SELECT * FROM orders WHERE customer_id = 42` on a million rows reads every row without an index. With an index on `customer_id`, the database walks a tree to the matching entries. Indexes also speed up `ORDER BY`, range filters and joins on the indexed columns.",
        "",
        "#### Costs and gotchas",
        "- **Write overhead**: each extra index slows `INSERT`, `UPDATE` and `DELETE`.",
        "- **Storage**: indexes can be as large as the table itself.",
        "- **Not always used**: low-selectivity columns (like a boolean) rarely help, and a function on the column (`WHERE lower(email) = ...`) prevents use of a plain index unless you index the expression.",
        "- **Composite indexes** follow the *leftmost prefix* rule: an index on `(a, b)` helps filters on `a`, or on `a` and `b`, but not on `b` alone.",
        "",
        "Check with `EXPLAIN` that a query actually uses the index. Add indexes for real, frequent queries rather than for every column."
      ),
      follow: ["Why does the order of columns in a composite index matter?", "What is a covering index?"],
      tags: ["index", "b-tree", "sql", "performance", "explain"]
    })
  ]);
})();
