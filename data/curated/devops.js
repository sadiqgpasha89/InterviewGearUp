/* DevOps / SRE / Cloud: curated answers. AI-drafted, not yet reviewed by a person (see CONTRIBUTING.md). */
(function () {
  const IGU = window.IGU, L = IGU.L;
  const meta = function (difficulty) { return { difficulty: difficulty, reviewStatus: 'ai-drafted', contentVersion: 1 }; };

  IGU.revise([
    Object.assign(meta('easy'), {
      id: "do-9",
      short: "CPU utilization is the percentage of time the CPUs were busy. Load average is the average number of tasks that are running or waiting to run (on Linux also those in uninterruptible I/O wait) over 1, 5 and 15 minutes. Compare load with the core count: load 8 on 8 cores is full, but on 2 cores it is heavily overloaded.",
      detail: L(
        "```text",
        "$ uptime",
        " 10:15:02 up 12 days,  load average: 3.20, 2.10, 1.40",
        "```",
        "- The three numbers are the 1, 5 and 15-minute averages. If the 1-minute figure is above the 15-minute one, load is rising.",
        "- **Divide by the core count** (`nproc`): load per core near 1.0 means saturated; well above 1 means tasks are queuing.",
        "",
        "#### Why they differ",
        "On Linux, load includes tasks in **uninterruptible sleep** (state `D`), typically waiting for disk or network storage. A machine with slow storage can show high load and low CPU utilization. High utilization with low load is also possible, for example a few busy threads on a large machine.",
        "",
        "#### How to investigate",
        "Use `top` or `htop` for CPU and process states, `vmstat 1` (the `r` column is runnable tasks, `b` is blocked), `iostat -x` for disk wait, and `pidstat`. Decide whether the pressure is CPU, I/O or memory (swapping) before changing anything."
      ),
      follow: ["Why can load average be high while CPU usage is low?", "What does the wa figure in top mean?"],
      tags: ["linux", "load average", "cpu", "performance", "monitoring"]
    }),
    Object.assign(meta('hard'), {
      id: "do-39",
      short: "A service mesh moves cross-cutting network concerns out of application code into a layer of proxies. Each pod gets a sidecar proxy (Envoy in Istio, linkerd2-proxy in Linkerd) managed by a control plane, giving automatic mutual TLS, retries, timeouts, traffic splitting and telemetry at the cost of extra latency, resources and operational complexity.",
      detail: L(
        "**Architecture**: the **data plane** is the set of proxies that handle all pod traffic; the **control plane** (istiod, or Linkerd's control plane) distributes configuration and issues short-lived workload certificates.",
        "",
        "#### What you get",
        "- **mTLS** between services with automatic certificate rotation, giving encryption and service identity without code changes.",
        "- **Traffic management**: weighted routing for canary releases, retries, timeouts, circuit breaking and fault injection.",
        "- **Observability**: uniform golden-signal metrics, traces and access logs for every hop.",
        "- **Policy**: which services may call which.",
        "",
        "#### Costs and trade-offs",
        "- Added latency per hop and CPU and memory per pod; sidecars complicate startup and shutdown ordering, and jobs that must terminate.",
        "- One more critical system: a bad mesh configuration can take down all traffic, and upgrades need care.",
        "- Debugging has another layer to inspect. Sidecar-less or node-level modes (Istio ambient mode, Cilium) reduce the overhead.",
        "",
        "#### When to adopt",
        "It pays off with many services, a need for mTLS and consistent policy, and a platform team to run it. For a handful of services, client libraries, an ingress controller and network policies are often enough."
      ),
      follow: ["How does a sidecar get traffic redirected through it?", "What would you check first if requests start failing after enabling strict mTLS?"],
      tags: ["service mesh", "istio", "linkerd", "mtls", "kubernetes"]
    }),
    Object.assign(meta('hard'), {
      id: "do-89",
      short: "Kubernetes avoids split-brain by keeping all cluster state in etcd, which uses the Raft consensus protocol: only the partition holding a majority (quorum) of etcd members can accept writes. The minority side cannot change cluster state, so there is never a second authoritative copy.",
      detail: L(
        "**Control plane vs workloads**: API servers are stateless and sit in front of etcd. In a partition, API servers that cannot reach an etcd quorum cannot serve writes; those on the quorum side keep working.",
        "",
        "#### What happens to running workloads",
        "Pods already running on nodes in the minority keep running; the kubelet keeps running the containers it knows about. On the majority side, the node controller marks unreachable nodes `NotReady` and, after the toleration period (5 minutes by default through taints), evicts their pods so they are rescheduled. Stateful workloads need care: use StatefulSets and storage that enforces single attachment, because a pod can briefly run in two places if its node was only partitioned, not dead.",
        "",
        "#### Design guidance",
        "- Run an **odd number** of etcd members (3 or 5) spread across failure domains. Three tolerate one failure and five tolerate two. Never split members evenly across two sites.",
        "- Keep etcd on fast disks, monitor leader changes and fsync latency, and take regular snapshots (`etcdctl snapshot save`).",
        "- The controller manager and scheduler use leader-election leases stored in the API, so only one active instance runs at a time.",
        "- For two regions, either place the majority in one region or run separate clusters per region."
      ),
      follow: ["What happens if you lose etcd quorum entirely, and how do you recover?", "How do leases prevent two controller managers from acting at once?"],
      tags: ["kubernetes", "etcd", "raft", "split-brain", "high availability"]
    }),
    Object.assign(meta('medium'), {
      id: "do-28",
      short: "The control plane is the cluster's brain: the API server is the front door and the only component that talks to etcd, etcd stores all cluster state, the scheduler assigns unscheduled pods to nodes, and the controller manager runs reconcile loops that move actual state toward desired state.",
      detail: L(
        "#### Components",
        "- **kube-apiserver**: validates and serves the REST API, handles authentication, authorisation and admission, persists objects to etcd and offers **watch** streams so other components react to changes. Nothing else reads or writes etcd directly.",
        "- **etcd**: a consistent key-value store using the Raft protocol; holds every object. Losing it without a backup means losing the cluster's state.",
        "- **kube-scheduler**: watches for pods with no node, **filters** nodes that cannot run the pod (resources, taints, affinity) and **scores** the rest, then binds the pod to one.",
        "- **kube-controller-manager**: many controllers (Deployment, ReplicaSet, Node, Endpoints and more), each a loop that compares desired and observed state and acts.",
        "- **cloud-controller-manager**: integrates with a cloud provider for load balancers, routes and node lifecycle.",
        "",
        "#### Flow of `kubectl apply` for a Deployment",
        "1. The API server authenticates, authorises, runs admission and stores the Deployment.",
        "2. The Deployment controller creates a ReplicaSet; the ReplicaSet controller creates Pods.",
        "3. The scheduler binds each Pod to a node.",
        "4. The **kubelet** on that node sees the assignment, asks the container runtime to start containers and reports status back.",
        "",
        "The components never call each other directly; they communicate through the API server by watching and updating objects.",
        "",
        "#### High availability",
        "Run several API servers behind a load balancer, an odd number of etcd members (3 or 5) for Raft quorum, and let the scheduler and controller manager use **leader election** so only one is active at a time. Managed services such as EKS, GKE and AKS operate the control plane for you."
      ),
      follow: ["What happens to running workloads if the control plane goes down?", "Why does etcd need an odd number of members?", "How does the kubelet learn which pods to run?"],
      tags: ["kubernetes", "control plane", "api server", "etcd", "scheduler"]
    }),
    Object.assign(meta('medium'), {
      id: "do-36",
      short: "A PodDisruptionBudget sets how many pods of an application must stay available (minAvailable) or may be down (maxUnavailable) during voluntary disruptions. Node drains, upgrades and autoscaler scale-downs use the Eviction API, which respects the budget, so the app keeps serving while nodes are rolled.",
      detail: L(
        "```yaml",
        "apiVersion: policy/v1",
        "kind: PodDisruptionBudget",
        "metadata:",
        "  name: web-pdb",
        "spec:",
        "  maxUnavailable: 1          # or minAvailable: 2 / '80%'",
        "  selector:",
        "    matchLabels:",
        "      app: web",
        "```",
        "",
        "#### What it covers",
        "- **Voluntary disruptions** that go through the Eviction API: `kubectl drain`, node upgrades, cluster autoscaler removing a node.",
        "- It does **not** stop involuntary disruptions such as a node crash, a kernel panic or an out-of-memory kill. Deleting a pod directly with `kubectl delete pod` also bypasses it.",
        "",
        "#### During a drain",
        "The drain evicts pods one by one. If an eviction would drop the app below the budget, the API refuses it and the drain retries until another replica is ready. This lets a rolling node upgrade proceed without taking the service down.",
        "",
        "#### Pitfalls",
        "- `minAvailable` equal to the replica count, or `maxUnavailable: 0`, **blocks drains forever** and stalls upgrades.",
        "- A single-replica deployment cannot be protected this way; run at least two replicas.",
        "- A PDB does not help if the replicas share one node or zone, so combine it with anti-affinity or topology spread constraints.",
        "- Pods that never become Ready can keep a budget exhausted; the `unhealthyPodEvictionPolicy` setting controls how unhealthy pods are treated.",
        "- Give containers a sensible `terminationGracePeriodSeconds` and a readiness probe so that traffic drains before the pod stops."
      ),
      follow: ["Why can a drain hang when minAvailable equals the replica count?", "How do PDBs interact with the cluster autoscaler?", "What protects an app from node crashes, which PDBs do not cover?"],
      tags: ["kubernetes", "poddisruptionbudget", "drain", "availability", "upgrades"]
    }),
    Object.assign(meta('medium'), {
      id: "do-37",
      short: "Node affinity and pod (anti-)affinity attract pods to nodes or to other pods, while taints on nodes repel pods unless they carry a matching toleration. A toleration permits scheduling but does not force it, so dedicating nodes needs a taint plus a node selector or affinity.",
      detail: L(
        "#### Attract",
        "- **nodeSelector**: simple label match.",
        "- **Node affinity**: richer rules on node labels. `requiredDuringSchedulingIgnoredDuringExecution` is a hard rule, `preferredDuringScheduling...` is a weighted preference. 'IgnoredDuringExecution' means pods already running are not moved if labels change later.",
        "- **Pod affinity** places pods near others (for example a cache next to its client) and **pod anti-affinity** spreads them apart (replicas on different nodes). Both use a `topologyKey` such as `kubernetes.io/hostname` or `topology.kubernetes.io/zone` to define 'near'.",
        "",
        "#### Repel",
        "A **taint** on a node has a key, value and effect:",
        "- `NoSchedule`: new pods without a toleration are not scheduled there.",
        "- `PreferNoSchedule`: the scheduler tries to avoid it.",
        "- `NoExecute`: also evicts running pods that do not tolerate it (optionally after `tolerationSeconds`).",
        "",
        "```yaml",
        "# Node:  kubectl taint nodes gpu-1 gpu=true:NoSchedule",
        "tolerations:",
        "- key: gpu",
        "  operator: Equal",
        "  value: 'true'",
        "  effect: NoSchedule",
        "```",
        "",
        "#### Putting them together",
        "A toleration only **allows** a pod onto a tainted node. To reserve GPU nodes for GPU jobs, taint the nodes so other pods stay away **and** give the GPU pods a node selector or affinity so they actually land there.",
        "",
        "#### Notes",
        "Kubernetes adds taints itself, for example when a node is not ready. Pod anti-affinity is expensive to evaluate on large clusters, and **topology spread constraints** are often a simpler way to spread replicas evenly across zones."
      ),
      follow: ["How would you reserve a node pool for a single team's workloads?", "How do topology spread constraints differ from pod anti-affinity?", "What does NoExecute do to pods already running on the node?"],
      tags: ["kubernetes", "scheduling", "taints", "affinity", "tolerations"]
    }),
    Object.assign(meta('medium'), {
      id: "do-60",
      short: "A blameless postmortem treats an outage as a chance to learn about the system, not to punish people. Write a timeline, impact and contributing factors, ask why the failure was possible, and finish with prioritised action items that have owners and dates and are tracked until closed.",
      detail: L(
        "#### Principles",
        "People act on the information and tools they had. If one human error can cause an outage, the system allowed it, so the fix is better guardrails, not a reprimand. Blame makes people hide information, and then you cannot learn.",
        "",
        "#### Typical contents",
        "1. **Summary and impact**: what broke, for whom, how long, and the customer or revenue effect.",
        "2. **Timeline** (with timestamps): detection, first response, key decisions, mitigation, resolution. Include what responders knew at each point.",
        "3. **Contributing factors**: usually several, such as a risky change, missing alert, unclear runbook, hidden dependency or capacity limit. Avoid ending at a single 'root cause' or at 'human error'.",
        "4. **What went well, what went badly, where we got lucky.**",
        "5. **Action items**: each with an owner, a priority and a due date, grouped into prevent, detect and mitigate.",
        "",
        "#### Running the process",
        "- Hold the review within a few days while memory is fresh, with a neutral facilitator and everyone involved in the room.",
        "- Ask 'how' and 'what made this possible' rather than 'who'.",
        "- Track actions in the normal backlog and review their status; a postmortem whose actions are never completed teaches nothing.",
        "- Share the document widely, including with other teams, so lessons spread.",
        "- Record measures such as time to detect and time to mitigate to see improvement over time.",
        "",
        "#### Triggers",
        "Define when one is required: a severity threshold, customer data impact, any on-call page that needed escalation, or a near miss that revealed a serious gap."
      ),
      follow: ["How do you respond when a postmortem draft blames an individual?", "How do you decide which action items are worth doing?", "What is the difference between a root cause analysis and a contributing-factors approach?"],
      tags: ["postmortem", "blameless", "incident", "sre", "reliability"]
    })
  ]);

  IGU.add([
    Object.assign(meta('easy'), {
      id: "do-101", role: "devops", level: 1, topic: "Infrastructure as code",
      q: "What is Infrastructure as Code and why is it preferred over configuring cloud resources by hand?",
      short: "Infrastructure as Code describes servers, networks and permissions in version-controlled files (Terraform, CloudFormation, Pulumi) that a tool applies. It makes environments repeatable, reviewable and recoverable, and reduces configuration drift compared with clicking through a console.",
      detail: L(
        "#### Benefits",
        "- **Repeatable**: create identical dev, staging and production environments from the same code.",
        "- **Reviewable**: changes go through pull requests, with history and a clear audit trail.",
        "- **Recoverable**: rebuild after a disaster instead of remembering what was clicked.",
        "- **Less drift**: the code is the source of truth, and tools can show differences (`terraform plan`).",
        "",
        "#### Declarative vs imperative",
        "Declarative tools (Terraform, CloudFormation) describe the desired end state and work out the steps. Imperative scripts describe the steps. Declarative code is easier to re-run safely, because applying it twice changes nothing (it is idempotent).",
        "",
        "#### Pitfalls worth mentioning",
        "- State files must be stored remotely and locked, and they may contain secrets.",
        "- Manual console edits cause drift; restrict write access and detect drift in CI.",
        "- Always review the plan before applying, and apply through a pipeline rather than from laptops."
      ),
      follow: ["What is configuration drift and how do you detect it?", "Why should you review terraform plan output before applying?"],
      tags: ["iac", "terraform", "automation", "devops", "configuration drift"]
    }),
    Object.assign(meta('easy'), {
      id: "do-102", role: "devops", level: 1, topic: "Containers",
      q: "How do you write a Dockerfile that builds quickly and produces a small image?",
      short: "Order instructions from least to most frequently changing so Docker can reuse cached layers (copy dependency manifests and install before copying source), use a small base image, put cleanup in the same layer as the install, and use a multi-stage build so build tools do not end up in the final image.",
      detail: L(
        "```dockerfile",
        "# build stage",
        "FROM node:22 AS build",
        "WORKDIR /app",
        "COPY package*.json ./",
        "RUN npm ci",
        "COPY . .",
        "RUN npm run build",
        "",
        "# runtime stage",
        "FROM node:22-slim",
        "WORKDIR /app",
        "COPY --from=build /app/dist ./dist",
        "USER node",
        "CMD [\"node\", \"dist/server.js\"]",
        "```",
        "",
        "- **Layer cache**: each instruction creates a layer, and Docker reuses it if the instruction and its inputs are unchanged. Copying `package*.json` first means dependencies are only reinstalled when they change.",
        "- **Multi-stage builds** keep compilers and dev dependencies out of the runtime image.",
        "- Use a `.dockerignore` (excluding `.git` and `node_modules`) to shrink the build context.",
        "- Pin base image versions, run as a non-root user, and clean package-manager caches in the same `RUN` that created them. Deleting files in a later layer does not shrink the image.",
        "- Rebuild regularly to pick up base-image security patches."
      ),
      follow: ["Why does deleting a file in a later layer not reduce the image size?", "What is the difference between CMD and ENTRYPOINT?"],
      tags: ["docker", "dockerfile", "containers", "layers", "multi-stage"]
    })
  ]);
})();
