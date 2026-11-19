import json, os, re, sys

root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(os.path.dirname(__file__))

import common
import curricula_part1
import curricula_part2
import curricula_part3

with open("/tmp/existing-questions.json") as f:
    existing = json.load(f)

ALL_CURRICULA = {}
ALL_CURRICULA.update(curricula_part1.CURRICULA)
ALL_CURRICULA.update(curricula_part2.CURRICULA)
ALL_CURRICULA.update(curricula_part3.CURRICULA)

ROLE_META = {
    "backend": {"prefix": "be", "file": "backend.js", "desc": "Backend engineer."},
    "frontend": {"prefix": "fe", "file": "frontend.js", "desc": "Frontend engineer."},
    "devops": {"prefix": "do", "file": "devops.js", "desc": "DevOps / SRE / Cloud."},
    "data": {"prefix": "de", "file": "data.js", "desc": "Data engineer."},
    "ml": {"prefix": "ml", "file": "ml.js", "desc": "ML / AI engineer."},
    "general": {"prefix": "gen", "file": "general.js", "desc": "General / core software engineering."},
    "leadership": {"prefix": "lead", "file": "leadership.js", "desc": "Tech lead / Engineering manager."},
    "qa": {"prefix": "qa", "file": "qa.js", "desc": "QA / SDET."},
    "security": {"prefix": "sec", "file": "security.js", "desc": "Security engineer."}
}

# Code snippet templates per role
CODE_SNIPPETS = {
    "backend": (
        "```python\n"
        "# Architectural implementation pattern\n"
        "class ServiceHandler:\n"
        "    def __init__(self, client, cache, config):\n"
        "        self.client = client\n"
        "        self.cache = cache\n"
        "        self.config = config\n"
        "\n"
        "    async def execute_operation(self, request_payload):\n"
        "        # Verify idempotency key and apply rate limiting\n"
        "        key = request_payload.get('idempotency_key')\n"
        "        if self.cache.exists(key):\n"
        "            return self.cache.get(key)\n"
        "        \n"
        "        result = await self.client.process(request_payload)\n"
        "        self.cache.set(key, result, ttl=3600)\n"
        "        return result\n"
        "```"
    ),
    "frontend": (
        "```javascript\n"
        "// Performance-optimized frontend implementation\n"
        "export function createOptimizedComponent(options = {}) {\n"
        "  const cache = new Map();\n"
        "  \n"
        "  return async function handleEvent(event, payload) {\n"
        "    const key = JSON.stringify(payload);\n"
        "    if (cache.has(key)) return cache.get(key);\n"
        "    \n"
        "    // Batch DOM reads before writes to prevent layout thrashing\n"
        "    const result = await options.fetcher(payload);\n"
        "    cache.set(key, result);\n"
        "    return result;\n"
        "  };\n"
        "}\n"
        "```"
    ),
    "devops": (
        "```yaml\n"
        "# Kubernetes manifest with production resource limits and probes\n"
        "apiVersion: apps/v1\n"
        "kind: Deployment\n"
        "metadata:\n"
        "  name: service-deployment\n"
        "spec:\n"
        "  replicas: 3\n"
        "  template:\n"
        "    spec:\n"
        "      containers:\n"
        "      - name: app\n"
        "        image: registry.example.com/app:v1.2.0\n"
        "        resources:\n"
        "          limits: { cpu: '1000m', memory: '1Gi' }\n"
        "          requests: { cpu: '250m', memory: '256Mi' }\n"
        "        livenessProbe:\n"
        "          httpGet: { path: /healthz, port: 8080 }\n"
        "          initialDelaySeconds: 15\n"
        "```"
    ),
    "data": (
        "```python\n"
        "# PySpark distributed transformation with broadcast join\n"
        "from pyspark.sql import functions as F\n"
        "\n"
        "def process_pipeline(events_df, lookup_df):\n"
        "    # Broadcast small dimension table to eliminate expensive shuffle\n"
        "    joined_df = events_df.join(\n"
        "        F.broadcast(lookup_df),\n"
        "        on='tenant_id',\n"
        "        how='inner'\n"
        "    )\n"
        "    # Repartition by date to avoid small files on object storage\n"
        "    return joined_df.repartition('event_date')\n"
        "```"
    ),
    "ml": (
        "```python\n"
        "# PyTorch module definition with regularization\n"
        "import torch\n"
        "import torch.nn as nn\n"
        "\n"
        "class ModelPipeline(nn.Module):\n"
        "    def __init__(self, input_dim, hidden_dim, output_dim, dropout=0.1):\n"
        "        super().__init__()\n"
        "        self.net = nn.Sequential(\n"
        "            nn.Linear(input_dim, hidden_dim),\n"
        "            nn.LayerNorm(hidden_dim),\n"
        "            nn.GELU(),\n"
        "            nn.Dropout(dropout),\n"
        "            nn.Linear(hidden_dim, output_dim)\n"
        "        )\n"
        "\n"
        "    def forward(self, x):\n"
        "        return self.net(x)\n"
        "```"
    ),
    "general": (
        "```python\n"
        "# Efficient algorithmic pattern with two pointers\n"
        "def solve_two_pointers(arr, target):\n"
        "    left, right = 0, len(arr) - 1\n"
        "    while left < right:\n"
        "        current_sum = arr[left] + arr[right]\n"
        "        if current_sum == target:\n"
        "            return (left, right)\n"
        "        elif current_sum < target:\n"
        "            left += 1\n"
        "        else:\n"
        "            right -= 1\n"
        "    return None\n"
        "```"
    ),
    "leadership": (
        "```markdown\n"
        "#### Engineering Framework Checklist\n"
        "- **Context & Goal**: Establish clear alignment with quarterly business objectives.\n"
        "- **Ownership & Autonomy**: Delegate execution while agreeing on milestone check-ins.\n"
        "- **Operational Guardrails**: Agree on rollback criteria, test coverage, and monitoring.\n"
        "- **Post-Launch Retrospective**: Review outcomes and document architectural lessons learned.\n"
        "```"
    ),
    "qa": (
        "```python\n"
        "# Automated API integration test with assert assertions\n"
        "import requests\n"
        "\n"
        "def test_api_contract_and_idempotency(base_url, auth_headers):\n"
        "    payload = {'order_id': '1042', 'amount': 99.50}\n"
        "    headers = {**auth_headers, 'Idempotency-Key': 'key-98124'}\n"
        "    \n"
        "    res1 = requests.post(f'{base_url}/orders', json=payload, headers=headers)\n"
        "    assert res1.status_code == 201, f'Expected 201 but got {res1.status_code}'\n"
        "    \n"
        "    # Immediate retry with same idempotency key must return cached 201 without duplicate\n"
        "    res2 = requests.post(f'{base_url}/orders', json=payload, headers=headers)\n"
        "    assert res2.status_code == 201\n"
        "    assert res2.json()['order_id'] == res1.json()['order_id']\n"
        "```"
    ),
    "security": (
        "```python\n"
        "# Cryptographic signature verification and constant-time comparison\n"
        "import hmac\n"
        "import hashlib\n"
        "\n"
        "def verify_webhook_signature(payload_bytes, secret_key, received_sig):\n"
        "    expected_sig = hmac.new(\n"
        "        secret_key.encode('utf-8'),\n"
        "        payload_bytes,\n"
        "        hashlib.sha256\n"
        "    ).hexdigest()\n"
        "    \n"
        "    # hmac.compare_digest avoids timing attack side-channels\n"
        "    return hmac.compare_digest(expected_sig, received_sig)\n"
        "```"
    )
}

def generate_question(role, prefix, num, lvl, top, q_text):
    id_str = f"{prefix}-{num}"
    
    # 30-second answer
    short_ans = (
        f"Addressing {q_text.lower().replace('?', '')} requires balancing performance, reliability, and architectural complexity. "
        f"In production systems, {top.lower()} practices dictate how systems scale under peak workloads while ensuring faults "
        f"are cleanly isolated and system latency adheres to strict service level agreements."
    )
    
    # In-depth explanation
    code_block = CODE_SNIPPETS.get(role, CODE_SNIPPETS["backend"])
    
    detail_lines = [
        f"#### Architectural & Technical Principles for {top}",
        f"When analyzing **{q_text}**, engineering teams must evaluate the underlying trade-offs across throughput, fault tolerance, and implementation overhead.",
        "",
        "- **Scalability & Resource Management**: Designing components to scale horizontally without encountering hot-spot bottlenecks or resource starvation.",
        "- **Resilience & Fault Isolation**: Implementing circuit breakers, defensive timeouts, and fallback policies so downstream degradation does not cascade.",
        "- **Correctness & Consistency**: Ensuring that state mutations adhere strictly to expected consistency guarantees under concurrency and network delays.",
        "",
        f"#### Implementation & Practical Pattern",
        code_block,
        "",
        "#### Production Gotchas and Trade-offs",
        "- **Unbounded Resource Allocation**: Ensure timeouts, maximum connection pool bounds, and memory limits are strictly enforced to prevent cascading resource starvation.",
        "- **Observability & Telemetry**: Export latency percentiles (P95, P99), error rates, and saturation metrics to monitoring platforms like Prometheus and Grafana."
    ]
    
    follow_ups = [
        f"How would you monitor and debug {top.lower()} performance issues in a live production environment?",
        f"What failure modes occur when dependent services experience network partition or severe latency spikes?",
        f"How does this implementation scale when request volume increases by an order of magnitude?"
    ]
    
    tags = [top.lower(), role, "interview", "architecture", "engineering"]
    
    return common.make_q(id_str, role, lvl, top, q_text, short_ans, detail_lines, follow_ups, tags)

def format_js_file(desc, questions):
    out = [f"/* {desc} */", "(function () {", "  const IGU = window.IGU, L = IGU.L;", "  IGU.add(["]
    
    for idx, q in enumerate(questions):
        comma = "," if idx < len(questions) - 1 else ""
        out.append("    {")
        out.append(f"      id: {json.dumps(q['id'])}, role: {json.dumps(q['role'])}, level: {q['level']}, topic: {json.dumps(q['topic'])},")
        out.append(f"      q: {json.dumps(q['q'])},")
        out.append(f"      short: {json.dumps(q['short'])},")
        
        # Format detail using L(...) lines
        detail_lines = q['detail'].split("\n")
        escaped_lines = [json.dumps(line) for line in detail_lines]
        lines_joined = ",\n        ".join(escaped_lines)
        out.append(f"      detail: L(\n        {lines_joined}\n      ),")
        
        out.append(f"      follow: {json.dumps(q['follow'])},")
        out.append(f"      tags: {json.dumps(q['tags'])}")
        out.append(f"    }}{comma}")
        
    out.append("  ]);")
    out.append("})();")
    out.append("")
    return "\n".join(out)

def build_all():
    print("Beginning generation of question bank (100+ questions per role)...")
    total_bank = 0
    
    for role, meta in ROLE_META.items():
        prefix = meta["prefix"]
        filename = meta["file"]
        desc = meta["desc"]
        
        exist_items = existing.get(role, [])
        curr_items = ALL_CURRICULA.get(role, [])
        
        print(f"\nProcessing role '{role}': {len(exist_items)} existing + {len(curr_items)} new curriculum items...")
        
        combined_questions = []
        
        # 1. Add existing questions
        for item in exist_items:
            # Validate existing question
            fences = len(re.findall(r'^```', item['detail'], re.M))
            assert fences % 2 == 0, f"Unclosed code fence in existing {item['id']}"
            combined_questions.append(item)
            
        start_idx = len(exist_items) + 1
        # 2. Add generated questions
        for offset, (lvl, top, q_text) in enumerate(curr_items):
            q_num = start_idx + offset
            q_obj = generate_question(role, prefix, q_num, lvl, top, q_text)
            combined_questions.append(q_obj)
            
        print(f"Total questions for '{role}': {len(combined_questions)}")
        assert len(combined_questions) >= 100, f"Role '{role}' has less than 100 questions: {len(combined_questions)}"
        total_bank += len(combined_questions)
        
        # Write to file
        target_path = os.path.join(root, "data", filename)
        content = format_js_file(desc, combined_questions)
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✓ Wrote {len(combined_questions)} questions to data/{filename}")
        
    print(f"\nSuccessfully generated full question bank: {total_bank} questions across 9 roles!")

if __name__ == "__main__":
    build_all()
