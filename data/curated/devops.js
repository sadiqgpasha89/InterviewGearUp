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
