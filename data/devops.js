/* DevOps / SRE / Cloud. */
(function () {
  const IGU = window.IGU, L = IGU.L;
  IGU.add([
    {
      id: 'do-1', role: 'devops', level: 1, topic: 'Containers',
      q: 'What is the difference between a container and a virtual machine? And an image versus a container?',
      short: "A container packages an app and its dependencies and runs as an isolated process sharing the host kernel, so it starts in seconds and is light. A VM virtualises a whole machine with its own OS. An image is the read-only template; a container is a running instance of it.",
      detail: L(
        "**Isolation**: containers use Linux namespaces (process, network, mounts) for isolation and cgroups for resource limits. VMs use a hypervisor and run a full guest OS, giving stronger isolation at higher cost.",
        "",
        "**Image versus container**: an image is a layered, immutable filesystem built from a Dockerfile. A container is an image plus a writable layer plus a running process. Persistent data belongs in volumes.",
        "",
        "```dockerfile",
        "FROM node:22-slim AS build",
        "WORKDIR /app",
        "COPY package*.json ./",
        "RUN npm ci",
        "COPY . .",
        "RUN npm run build",
        "",
        "FROM node:22-slim",
        "WORKDIR /app",
        "COPY --from=build /app/dist ./dist",
        "USER node",
        'CMD ["node", "dist/server.js"]',
        "```",
        "",
        "**Good practice**: multi-stage builds for small images, copy dependency manifests before source so layers cache, run as a non-root user, pin versions, one main process per container, never bake secrets into images, and use a `.dockerignore`."
      ),
      follow: ['What are namespaces and cgroups?', 'CMD versus ENTRYPOINT?', 'How would you shrink a large image?'],
      tags: ['docker', 'container', 'vm', 'image', 'dockerfile', 'namespaces']
    },
    {
      id: 'do-2', role: 'devops', level: 1, topic: 'CI/CD',
      q: 'What are CI and CD, and what does a good pipeline look like?',
      short: "CI automatically builds and tests every change to catch problems early. Continuous delivery keeps every passing build releasable; continuous deployment ships every passing build to production automatically.",
      detail: L(
        "#### Typical stages",
        "Lint and format, unit tests, build the artifact **once**, security scans (dependencies, secrets, container image, IaC), deploy to staging, smoke and end-to-end tests, promote to production (manual approval or automatic), post-deploy verification.",
        "",
        "#### Principles",
        "- Fast feedback: aim for minutes, not hours.",
        "- Build once, promote the same artifact through environments.",
        "- Pipeline as code, reproducible environments.",
        "- Small pull requests, trunk-based development, feature flags to separate deploying from releasing.",
        "- Easy, rehearsed rollback.",
        "- Secrets come from a secret manager, never the repo.",
        "",
        "#### Measure it",
        "The four DORA metrics: deployment frequency, lead time for changes, change failure rate, time to restore service.",
        "",
        "Flaky tests erode trust in the pipeline, so treat them as bugs."
      ),
      follow: ['What is the difference between continuous delivery and continuous deployment?', 'How do you roll back a bad release?', 'How would you speed up a slow pipeline?'],
      tags: ['ci', 'cd', 'pipeline', 'devops', 'dora', 'deployment']
    },
    {
      id: 'do-3', role: 'devops', level: 2, topic: 'Kubernetes',
      q: 'How does a Kubernetes rolling update work? Explain readiness versus liveness probes.',
      short: "A Deployment manages ReplicaSets of Pods and does rolling updates by starting new Pods and stopping old ones gradually. Readiness decides when a Pod receives traffic; liveness decides when to restart it.",
      detail: L(
        "**Objects**: a Pod runs one or more containers; a Deployment declares replicas and update strategy; a Service gives a stable address that load-balances across Pods matching its label selector.",
        "",
        "**Rolling update**: a new ReplicaSet scales up while the old one scales down, limited by `maxSurge` and `maxUnavailable`. Roll back with `kubectl rollout undo`.",
        "",
        "**Probes**:",
        "- Failing **readiness**: the Pod is removed from Service endpoints, not restarted.",
        "- Failing **liveness**: the container is restarted. Use it for deadlocks, and do not make it depend on downstream services.",
        "- **Startup** probe: gives slow-starting apps time before liveness begins.",
        "",
        "```yaml",
        "readinessProbe:",
        "  httpGet: { path: /ready, port: 8080 }",
        "  periodSeconds: 5",
        "livenessProbe:",
        "  httpGet: { path: /healthz, port: 8080 }",
        "  initialDelaySeconds: 15",
        "```",
        "",
        "Also set resource requests and limits, a PodDisruptionBudget, and handle SIGTERM gracefully (finish in-flight requests, use `preStop` and `terminationGracePeriodSeconds`) so deployments do not drop traffic."
      ),
      follow: ['What happens if the readiness probe is too strict?', 'What is the difference between requests and limits?', 'How does a Service find its Pods?'],
      tags: ['kubernetes', 'rolling update', 'probes', 'deployment', 'readiness', 'liveness']
    },
    {
      id: 'do-4', role: 'devops', level: 2, topic: 'Kubernetes',
      q: 'A Pod is stuck in CrashLoopBackOff. How do you debug it?',
      short: "The container keeps starting and exiting, so Kubernetes backs off between restarts. Run kubectl describe pod for the exit reason and kubectl logs --previous for the crashed container's output.",
      detail: L(
        "1. `kubectl get pod` to see the restart count.",
        "2. `kubectl describe pod <name>`: check Last State, Reason, Exit Code and Events. Exit 137 or reason `OOMKilled` points to the memory limit; exit 1 is an application error; 127 means command not found; 143 is SIGTERM.",
        "3. `kubectl logs <name> --previous` to read the crashed container's output.",
        "4. Check the usual causes:",
        "   - Missing or wrong environment variable, ConfigMap or Secret.",
        "   - A dependency unreachable at startup (database, other service).",
        "   - Wrong command or arguments, or file permission problems.",
        "   - A liveness probe killing a slow-starting app (add a startup probe).",
        "   - Memory limit too low or a leak.",
        "5. To investigate interactively, override the command (for example `sleep`) and exec in, or use `kubectl debug` with an ephemeral container.",
        "6. Fix, roll out, and consider making the app retry its dependencies instead of exiting.",
        "",
        "Do not confuse it with `ImagePullBackOff`, which means the image could not be pulled (wrong tag, registry credentials)."
      ),
      follow: ['What is the difference between OOMKilled and an eviction?', 'How is ImagePullBackOff different?', 'How do you debug a distroless container that has no shell?'],
      tags: ['kubernetes', 'crashloopbackoff', 'debug', 'pod', 'troubleshooting', 'logs']
    },
    {
      id: 'do-5', role: 'devops', level: 2, topic: 'Infrastructure as code',
      q: 'What is Terraform state, and why use a remote backend with locking?',
      short: "State maps your configuration to the real resources and is how Terraform computes what to change. Keep it in a remote, encrypted backend with locking so a team shares one source of truth and two applies cannot run at once.",
      detail: L(
        "State holds resource IDs and sometimes secrets, so never commit it. Use S3 with locking, GCS, Azure Blob or Terraform Cloud.",
        "",
        "**Drift** is when someone changes a resource outside Terraform. `terraform plan` reveals it. Prevent it by routing all changes through code, and use `terraform import` to adopt existing resources.",
        "",
        "#### Workflow",
        "Pull request, `plan` posted for review, `apply` from CI with a least-privilege role.",
        "",
        "#### Structure",
        "Reusable modules, separate state per environment and per blast radius (not one giant state), pinned provider versions, `prevent_destroy` on critical resources.",
        "",
        "#### Danger zones",
        "A plan that replaces a stateful resource (database, disk) will destroy data. Read plans carefully and add policy-as-code checks (OPA, Sentinel, Checkov) in CI."
      ),
      follow: ['How do you handle secrets that end up in state?', 'How would you split state across teams and environments?', 'What does terraform import do?'],
      tags: ['terraform', 'state', 'iac', 'drift', 'infrastructure', 'backend']
    },
    {
      id: 'do-6', role: 'devops', level: 3, topic: 'Reliability',
      q: 'Explain SLIs, SLOs and error budgets. How would you define them for a service?',
      short: "An SLI measures user-visible behaviour (for example, the fraction of requests that succeed in under 300 ms). An SLO is the target for it (99.9% over 30 days). The error budget is the allowed shortfall (0.1%) that you spend on change and risk.",
      detail: L(
        "#### Choosing SLIs",
        "Start from the user journey: availability (good requests divided by total), latency (share under a threshold), freshness, correctness. Measure at the load balancer or client side rather than just server uptime.",
        "",
        "#### Setting the target",
        "Based on what users need and what your dependencies can support. Not 100%. For scale: 99.9% over 30 days allows about 43 minutes of failure; 99.99% allows about 4 minutes.",
        "",
        "#### Using the budget",
        "Agree an error budget policy: if the budget burns too fast, freeze risky releases and prioritise reliability work; if plenty remains, ship faster.",
        "",
        "#### Alerting",
        "Alert on **burn rate** over multiple windows (a fast burn pages someone, a slow burn files a ticket), not on raw CPU thresholds.",
        "",
        "An SLA is a contractual promise with penalties, and is looser than the internal SLO. Pitfalls: too many SLOs, targets nobody agreed to, and measuring machines instead of user success."
      ),
      follow: ['How much downtime does 99.99% allow per month?', 'How would you alert on an SLO?', 'What is the difference between an SLO and an SLA?'],
      tags: ['slo', 'sli', 'error budget', 'sre', 'reliability', 'alerting']
    },
    {
      id: 'do-7', role: 'devops', level: 3, topic: 'Incidents',
      q: 'Production latency has spiked. Walk me through how you respond.',
      short: "Stabilise first (roll back or shed load), then narrow it down with the golden signals: when it started, what changed, who is affected, and where in the request path time is spent. Confirm the root cause before closing.",
      detail: L(
        "1. **Declare the incident**, assign roles (incident commander, communications), and keep a timeline.",
        "2. **Assess impact**: which endpoints, regions and customers; error rate and p50, p95 and p99 latency.",
        "3. **Check what changed**: deploys, feature flags, config, traffic patterns, dependencies, scheduled jobs. If a change correlates, rolling back is the fastest mitigation.",
        "4. **Read the golden signals**: latency, traffic, errors, saturation (CPU, memory, DB connections, thread pools, queue depth).",
        "5. **Follow a trace** to the slow hop: database locks or slow queries, a downstream timeout or retry storm, GC pauses, connection pool exhaustion, DNS.",
        "6. **Mitigate**: scale out, shed non-critical load, disable the feature, add circuit breakers. Be careful: raising timeouts can make a retry storm worse.",
        "7. **Verify recovery** against SLIs, then communicate closure.",
        "8. **Blameless postmortem**: timeline, root cause and contributing factors, action items with owners covering detection, prevention and response.",
        "",
        "Mention retries with exponential backoff and jitter, and why unbounded retries amplify outages."
      ),
      follow: ['What if there was no recent deploy?', 'How do you avoid retry storms?', 'What goes into a good postmortem?'],
      tags: ['incident', 'latency', 'production', 'outage', 'postmortem', 'debug', 'golden signals']
    },
    {
      id: 'do-8', role: 'devops', level: 4, topic: 'Architecture',
      q: 'Design a multi-region setup for a critical service with a defined RTO and RPO.',
      short: "Start from the business RTO and RPO, then pick the simplest topology that meets them: backup and restore, pilot light, warm standby or active-active. Active-active gives the best availability but forces hard choices on data consistency, conflicts and cost.",
      detail: L(
        "**RTO** is how long you can be down; **RPO** is how much data you can lose. Set them per service tier, since not everything justifies active-active.",
        "",
        "#### Patterns, cheapest to costliest",
        "Backup and restore (hours), pilot light, warm standby (minutes), active-active (near zero downtime).",
        "",
        "#### Traffic",
        "Global load balancing or anycast with health checks. If you rely on DNS, remember TTLs.",
        "",
        "#### Data is the hard part",
        "- Single-writer region with asynchronous replicas: simple, but failover can lose recent writes (RPO above zero).",
        "- Multi-writer: needs conflict resolution or ownership of each tenant or user by one region.",
        "- Globally consistent database: strong guarantees at the price of write latency.",
        "",
        "#### Often forgotten",
        "Hidden single-region dependencies (identity, secrets, CI/CD, DNS), capacity in the surviving region to carry 100% of traffic, and regular failover drills. An untested disaster recovery plan is not a plan. Consider data-residency rules and total cost."
      ),
      follow: ['How do you avoid split-brain?', 'How would you test a regional failover?', 'How do you route users to the nearest healthy region?'],
      tags: ['multi-region', 'disaster recovery', 'rto', 'rpo', 'active-active', 'architecture', 'cloud']
    }
  ]);
})();
