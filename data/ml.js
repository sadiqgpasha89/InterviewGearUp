/* ML / AI engineer. */
(function () {
  const IGU = window.IGU, L = IGU.L;
  IGU.add([
    {
      id: 'ml-1', role: 'ml', level: 1, topic: 'Fundamentals',
      q: 'Explain the bias-variance trade-off and how you deal with overfitting.',
      short: "Bias is error from a model too simple to capture the pattern (underfitting). Variance is error from a model so flexible it learns noise (overfitting). Low training error with high validation error signals overfitting; both high signals underfitting.",
      detail: L(
        "Total error is roughly bias squared plus variance plus irreducible noise. Diagnose with learning curves: compare training and validation error as data grows.",
        "",
        "#### Reduce variance (overfitting)",
        "More data, regularisation (L1, L2, dropout), a simpler model, early stopping, feature selection, data augmentation, bagging and ensembling.",
        "",
        "#### Reduce bias (underfitting)",
        "A richer model, better features, less regularisation, longer training.",
        "",
        "Use **cross-validation** to estimate generalisation instead of trusting one split.",
        "",
        "Example: a degree-1 polynomial underfits a curved relationship; a degree-15 polynomial fits the noise. Very large neural networks show more complex behaviour (double descent), but this workflow is still how you debug models in practice."
      ),
      follow: ['How does regularisation work?', 'What is cross-validation?', 'What does early stopping do?'],
      tags: ['bias', 'variance', 'overfitting', 'underfitting', 'regularization', 'machine learning']
    },
    {
      id: 'ml-2', role: 'ml', level: 1, topic: 'Metrics',
      q: 'Explain precision, recall and F1. When do you prefer each?',
      short: "Precision is the share of predicted positives that are correct; recall is the share of actual positives you found. Favour recall when a miss is costly (disease screening, fraud) and precision when false alarms are costly. F1 balances both.",
      detail: L(
        "- **Precision** = TP / (TP + FP)",
        "- **Recall** = TP / (TP + FN)",
        "- **F1** = harmonic mean of the two",
        "",
        "**Why not accuracy?** With 99% legitimate transactions, a model that always says 'not fraud' scores 99% accuracy and catches nothing.",
        "",
        "**Threshold trade-off**: lowering the decision threshold raises recall and lowers precision. Pick the threshold from the precision-recall curve and the real cost of each error type.",
        "",
        "**ROC-AUC versus PR-AUC**: PR-AUC is more informative when positives are rare.",
        "",
        "For multi-class problems, macro averaging treats classes equally and micro averaging weights by frequency.",
        "",
        "Always frame it in business terms: what does a false positive cost compared with a false negative?"
      ),
      follow: ['Why is accuracy misleading on imbalanced data?', 'ROC curve versus precision-recall curve?', 'How do you choose the decision threshold?'],
      tags: ['precision', 'recall', 'f1', 'metrics', 'imbalanced', 'classification']
    },
    {
      id: 'ml-3', role: 'ml', level: 2, topic: 'Data',
      q: 'What is data leakage? Give examples and how you prevent it.',
      short: "Leakage is when information that will not exist at prediction time slips into training, so validation scores look great and production results disappoint. Prevent it by splitting before any preprocessing and respecting time order.",
      detail: L(
        "#### Common forms",
        "- **Target leakage**: a feature derived from the outcome, such as a discharge code when predicting hospital readmission.",
        "- **Train-test contamination**: fitting a scaler, imputer or encoder on all data before splitting. Do it inside a pipeline fitted only on training folds.",
        "- **Duplicates** present in both train and test sets.",
        "- **Temporal leakage**: a random split on time-dependent data. Use time-based splits or walk-forward validation.",
        "- **Group leakage**: the same user or patient in both sets. Use grouped cross-validation.",
        "",
        "#### Detection",
        "Suspiciously high scores, one odd feature dominating importance, a big gap between offline and online metrics.",
        "",
        "#### Prevention",
        "Define the exact prediction moment, then ask of each feature: would I know this value then? Use point-in-time-correct joins in a feature store so training features match what serving will see."
      ),
      follow: ['How would you split time series data?', 'How does a feature store help prevent leakage?', 'What would a 0.99 AUC make you suspect?'],
      tags: ['data leakage', 'validation', 'feature store', 'time series', 'machine learning']
    },
    {
      id: 'ml-4', role: 'ml', level: 2, topic: 'LLMs',
      q: 'What is RAG, and how does it work? Where does it fail?',
      short: "Retrieval-augmented generation fetches relevant passages from your own documents at query time and gives them to the LLM as context, so answers are grounded in current, private data without retraining.",
      detail: L(
        "#### Pipeline",
        "Ingest and clean documents, **chunk** them (often a few hundred tokens, with some overlap, respecting document structure), embed the chunks, and store them in a vector index with metadata. At query time embed the question, retrieve the top-k chunks (best with hybrid search: keyword BM25 plus vectors), optionally rerank, build the prompt, and generate an answer with citations.",
        "",
        "#### Failure modes",
        "- Bad chunking splits an answer across chunks.",
        "- Retrieval misses the right passage (vocabulary mismatch, weak embeddings).",
        "- Irrelevant context distracts the model.",
        "- Outdated or conflicting documents.",
        "- Prompt injection hidden in retrieved text.",
        "- The model answers anyway when evidence is absent. Instruct it to say it does not know.",
        "",
        "#### Improving it",
        "Hybrid search, a reranker, query rewriting, metadata filters, parent-document retrieval. Evaluate retrieval (recall@k) separately from generation (faithfulness to sources). Enforce document permissions at retrieval time."
      ),
      follow: ['How do you choose a chunk size?', 'Why use hybrid search?', 'How do you enforce document-level permissions?'],
      tags: ['rag', 'retrieval', 'embeddings', 'vector database', 'llm', 'chunking']
    },
    {
      id: 'ml-5', role: 'ml', level: 3, topic: 'LLMs',
      q: 'How do you evaluate an LLM-powered application?',
      short: "Build a representative evaluation set from real usage, define task-specific metrics, combine automated checks (exact match, rubric-based LLM judges, retrieval metrics) with human review, run it on every prompt or model change, and track online signals after launch.",
      detail: L(
        "1. **Dataset**: real queries, edge cases and adversarial inputs, labelled with reference answers or rubrics. Keep a held-out set you do not tune against.",
        "2. **Define good**: correctness or faithfulness to sources, completeness, tone, safety, latency and cost.",
        "3. **Metrics**: use deterministic checks wherever possible (valid format, citations present, correct tool call). For subjective qualities use an LLM judge, calibrated against human labels, watching for position and verbosity bias (compare pairs in both orders). For RAG, separate retrieval metrics (recall@k, MRR) from groundedness of the answer.",
        "4. **Regression suite** in CI. Compare versions by failure category, not just the average.",
        "5. **Online**: user feedback, task success, escalation rate, A/B tests, sampled human review, drift and cost monitoring.",
        "6. **Safety**: jailbreaks, PII leakage, prompt injection.",
        "",
        "Pitfalls: tuning prompts against the test set, evaluating on too few examples, and trusting an uncalibrated judge. With no users yet, bootstrap with expert-written cases and synthetic variations, then replace them with real traffic."
      ),
      follow: ['How do you decide whether to trust an LLM judge?', 'Offline versus online evaluation?', 'How would you build the first dataset with no users?'],
      tags: ['llm', 'evaluation', 'eval', 'llm judge', 'metrics', 'testing', 'generative ai']
    },
    {
      id: 'ml-6', role: 'ml', level: 3, topic: 'LLMs',
      q: 'Prompting, RAG or fine-tuning: how do you decide?',
      short: "Start with prompting, add RAG when the model needs knowledge it lacks or that changes often, and fine-tune when you need consistent style, format or a specialised skill prompting cannot deliver, or a smaller and cheaper model.",
      detail: L(
        "#### The ladder",
        "1. **Prompting**: clear instructions, examples, structured output. Cheapest to try.",
        "2. **RAG**: dynamic or private knowledge, citations, easy updates, access control.",
        "3. **Fine-tuning** (supervised, preference tuning, LoRA): teaches behaviour, tone, output formats and narrow tasks, or distils a large model into a small one. It is **not** a reliable way to inject facts.",
        "",
        "#### Costs of fine-tuning",
        "Collecting and labelling data, training and evaluation, maintenance when the base model changes, and regression risk.",
        "",
        "#### How to decide",
        "Measure a baseline with an evaluation set first and look at what still fails. **Knowledge gaps** point to RAG. **Behaviour or format gaps** point to fine-tuning. Combining them is common. Also weigh latency, cost per call, data privacy and what your vendor supports."
      ),
      follow: ['Why not fine-tune a model to add knowledge?', 'What is LoRA?', 'How would you decide using data?'],
      tags: ['fine-tuning', 'rag', 'prompting', 'llm', 'lora', 'decision']
    },
    {
      id: 'ml-7', role: 'ml', level: 4, topic: 'System design',
      q: 'Design an enterprise AI assistant that answers from company documents and can take actions.',
      short: "Design around trust: permission-aware retrieval, grounded answers with citations, guardrails and human escalation, a continuous evaluation loop, and cost and latency controls. Launch to one narrow use case first and widen.",
      detail: L(
        "**Requirements**: users, use cases, data sources, accuracy bar, risk level (regulated?), SLAs.",
        "",
        "#### Architecture",
        "Gateway (authentication, rate limits, PII redaction, logging), then an orchestrator (prompt assembly, tool use), retrieval over connectors that enforces each user's access rights, one or more models with routing (small model for easy queries, larger for hard ones), output checks (grounding, policy), and a UI with citations and feedback buttons.",
        "",
        "#### Actions",
        "Least-privilege tools, human confirmation before anything that changes state, and audit logs.",
        "",
        "#### Safety",
        "Treat retrieved content as untrusted (prompt-injection defence), separate instructions from data, restrict tool scope, address data residency and vendor terms (no training on your data).",
        "",
        "#### Quality and cost",
        "Evaluation harness with golden sets, shadow mode before launch, red-teaming, monitoring of answer quality and escalation rate. Control cost with caching, prompt compression, model routing and batch processing.",
        "",
        "#### Rollout",
        "Pilot cohort, feedback loop, kill switch, named owners, and success metrics tied to business outcomes."
      ),
      follow: ['How do you defend against prompt injection from documents?', 'How would you control cost?', 'When would you let the assistant take actions on its own?'],
      tags: ['llm', 'enterprise', 'assistant', 'system design', 'guardrails', 'agents', 'rag', 'security']
    }
  ]);
})();
