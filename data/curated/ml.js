/* ML / AI engineering: curated answers. AI-drafted, not yet reviewed by a person (see CONTRIBUTING.md). */
(function () {
  const IGU = window.IGU, L = IGU.L;
  const meta = function (difficulty) { return { difficulty: difficulty, reviewStatus: 'ai-drafted', contentVersion: 1 }; };

  // ml-100 was an exact copy of ml-99 (same question, same filler answer).
  IGU.retire('ml-100', 'ml-99');

  IGU.revise([
    Object.assign(meta('medium'), {
      id: "ml-11",
      short: "Cross-validation estimates how a model will perform on unseen data by training and testing on several different splits. K-fold rotates which of k folds is held out; stratified k-fold keeps class proportions in each fold for imbalanced data; a time-series split always trains on the past and tests on the future so it never uses future information.",
      detail: L(
        "- **K-fold**: split the data into k parts, train on k − 1 and validate on the held-out part, repeat k times and average the scores (k = 5 or 10 is typical). The spread of the scores tells you how stable the estimate is.",
        "- **Stratified k-fold**: each fold keeps roughly the class ratio of the full data. Use it for classification, especially with rare classes, so no fold ends up with almost no positives.",
        "- **Group k-fold**: keeps all rows from one group (a user, a patient) in the same fold. Without it the same entity appears in both training and validation and the score is inflated.",
        "- **Time-series split** (forward chaining): train on the first t periods, validate on the next h, then expand the window. Random shuffling would let the model learn from the future, which is data leakage.",
        "",
        "```python",
        "from sklearn.model_selection import StratifiedKFold",
        "skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)",
        "for train_idx, val_idx in skf.split(X, y):",
        "    ...  # fit on train_idx, score on val_idx",
        "```",
        "",
        "**Pitfalls**: do preprocessing (scaling, imputation, feature selection) *inside* each fold, for example with a pipeline, or information leaks from the validation fold. Keep a separate final test set that you touch once, and use nested cross-validation when tuning hyperparameters."
      ),
      follow: ["Why can scaling the whole dataset before cross-validation leak information?", "When is leave-one-out cross-validation a bad idea?"],
      tags: ["cross-validation", "k-fold", "validation", "data leakage", "time series"]
    }),
    Object.assign(meta('medium'), {
      id: "ml-15",
      short: "Batch gradient descent computes the gradient over the whole dataset for each update: stable but slow and memory-hungry. SGD updates after each single example: cheap and noisy. Mini-batch uses small batches (commonly 32 to 512), balancing stable gradients with fast, hardware-friendly updates, and is what deep learning uses in practice.",
      detail: L(
        "The update is `w ← w − η · ∇L(w)`, where η is the learning rate and the gradient is estimated on some subset of the data.",
        "",
        "- **Batch**: exact gradient and smooth convergence, but only one update per full pass, which is impractical for large datasets.",
        "- **Stochastic (SGD)**: one example per update, so steps are very frequent and noisy. The noise can help escape shallow local minima but makes the loss bounce around the optimum, so you usually decay the learning rate.",
        "- **Mini-batch**: averages the gradient over a batch. There is less noise than with SGD, and a GPU processes a batch in parallel almost as fast as a single example.",
        "",
        "#### Beyond plain SGD",
        "- **Momentum** accumulates a velocity that smooths the noise and speeds up progress along consistent directions.",
        "- **Adam and AdamW** keep per-parameter adaptive learning rates and are the default for many deep networks; SGD with momentum often generalizes well in vision.",
        "- **Learning-rate schedules** (warmup, cosine decay) matter as much as the optimizer.",
        "",
        "**Batch size trade-off**: larger batches give steadier gradients and better hardware use but need more memory and, past a point, can generalize worse or need a scaled learning rate."
      ),
      follow: ["Why does a learning rate that is too high make the loss diverge?", "What does Adam add on top of momentum?"],
      tags: ["gradient descent", "sgd", "mini-batch", "optimization", "adam"]
    }),
    Object.assign(meta('easy'), {
      id: "ml-17",
      short: "Min-max normalization rescales a feature to a fixed range, usually [0, 1], with (x − min) / (max − min). Standardization (z-score) subtracts the mean and divides by the standard deviation, giving mean 0 and variance 1. Min-max is sensitive to outliers; standardization is the safer default for distance-based and gradient-based models.",
      detail: L(
        "#### Why scale",
        "Models that use distances (k-NN, k-means, SVM) or gradient descent (linear and logistic regression, neural networks) are dominated by features with large numeric ranges. Tree-based models such as random forests and gradient boosting are scale-invariant and do not need it.",
        "",
        "- **Min-max**: bounded output, useful for pixel intensities or when an algorithm needs a fixed range. One extreme outlier squeezes all other values into a tiny interval.",
        "- **Standardization**: centred with unit variance; works well when features are roughly bell-shaped. Outliers still influence the mean and standard deviation.",
        "- **Robust scaling** uses the median and interquartile range, which reduces outlier influence.",
        "- **Log transform** helps heavily skewed features such as prices or counts.",
        "",
        "**Leakage warning**: compute the min, max, mean and standard deviation on the **training set only**, then apply the same transformation to validation and test data and at serving time. Fitting the scaler on all the data leaks information, and a mismatch between training and serving scaling is a classic production bug."
      ),
      follow: ["Why do tree-based models not need feature scaling?", "How do you make sure the same scaling is applied in production?"],
      tags: ["feature scaling", "normalization", "standardization", "preprocessing", "outliers"]
    }),
    Object.assign(meta('hard'), {
      id: "ml-45",
      short: "RLHF aligns a language model with human preferences in three stages: supervised fine-tuning on good demonstrations, training a reward model from human rankings of response pairs, then optimizing the model against that reward with reinforcement learning (typically PPO) while a KL penalty keeps it close to the original model.",
      detail: L(
        "#### The stages",
        "1. **SFT**: fine-tune the pretrained model on curated prompt and response pairs to get a sensible starting policy.",
        "2. **Reward model**: for each prompt, sample several responses and have people rank them. Train a model that outputs a scalar score using a pairwise loss so that preferred responses score higher (Bradley-Terry): `−log σ(r(chosen) − r(rejected))`.",
        "3. **RL optimization**: generate responses from the policy, score them with the reward model and update with PPO. The objective subtracts a **KL divergence** term measured against the reference (SFT) model.",
        "",
        "#### Why the KL penalty",
        "Without it the policy finds ways to exploit the reward model (**reward hacking**): verbose, flattering or odd outputs that score well without being better. The KL term keeps outputs fluent and close to the distribution the reward model was trained on.",
        "",
        "#### Costs and problems",
        "- PPO keeps several large models in memory (policy, reference, reward and value), and training is unstable and sensitive to hyperparameters.",
        "- Human labels are expensive and noisy, and they reflect the annotators' views.",
        "- Alternatives: DPO and similar methods optimize preferences directly without a separate reward model or RL loop; RLAIF replaces some human labels with model feedback."
      ),
      follow: ["What is reward hacking and how do you detect it?", "How does DPO remove the need for a reward model?"],
      tags: ["rlhf", "ppo", "reward model", "alignment", "llm"]
    }),
    Object.assign(meta('hard'), {
      id: "ml-50",
      short: "FlashAttention computes exact attention without writing the N×N score matrix to GPU high-bandwidth memory. It splits Q, K and V into tiles that fit in fast on-chip SRAM, processes them block by block with an online softmax, and fuses the steps into one kernel. This cuts memory traffic and reduces attention memory from O(N²) to O(N).",
      detail: L(
        "**The bottleneck is memory bandwidth, not arithmetic**: standard attention materializes `S = QKᵀ` and `P = softmax(S)` in HBM (each N × N), reading and writing them several times. For long sequences those transfers dominate the runtime.",
        "",
        "#### How tiling works",
        "For each block of queries, loop over blocks of keys and values: load tiles into SRAM, compute the partial scores and update running results. The softmax is the hard part, because it needs the maximum and sum over the whole row. The **online softmax** keeps a running maximum and normalizer and rescales earlier partial outputs as new blocks arrive, so the exact result can be built one tile at a time.",
        "",
        "#### Effects",
        "- Attention memory goes from O(N²) to O(N), which enables much longer contexts.",
        "- Fewer HBM reads and writes give a speedup of a few times in practice; the FLOP count is unchanged, because this is exact attention and not an approximation.",
        "- The backward pass **recomputes** attention blocks instead of storing them, trading extra compute for memory.",
        "- Later versions improve work partitioning and use newer GPU features.",
        "",
        "It complements PagedAttention in serving: FlashAttention speeds up the computation, while PagedAttention manages KV-cache memory."
      ),
      follow: ["Why is standard attention memory-bound rather than compute-bound?", "What is the online softmax trick?"],
      tags: ["flashattention", "attention", "gpu", "memory", "transformers"]
    })
  ]);
})();
