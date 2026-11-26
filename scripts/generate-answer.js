#!/usr/bin/env node
/**
 * Auto-generates LLM answers for community questions submitted as GitHub issues.
 *
 * Can be run in GitHub Actions on issue events (opened, labeled), or locally.
 * Supported LLM providers:
 *   - Google Gemini (via GEMINI_API_KEY) - default model: gemini-2.5-flash
 *   - Anthropic Claude (via ANTHROPIC_API_KEY) - default model: claude-sonnet-5-5
 *   - OpenAI (via OPENAI_API_KEY) - default model: gpt-4o-mini
 *   - GitHub Models (via GITHUB_MODELS_TOKEN or GITHUB_TOKEN if enabled)
 *   - Offline fallback scaffold (if no API keys are present)
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;

// Load site config and engine
function loadAppEngine() {
  const ctx = { window: {} };
  ctx.window = ctx;
  vm.createContext(ctx);

  const files = ['js/config.js', 'js/quality.js', 'js/engine.js'];
  require('./lib/data-files').dataFiles(root).forEach((f) => files.push(f));

  files.forEach((f) => {
    const fullPath = path.join(root, f);
    if (fs.existsSync(fullPath)) {
      vm.runInContext(fs.readFileSync(fullPath, 'utf8'), ctx, { filename: f });
    }
  });

  return ctx.IGU || {};
}

/**
 * Parses issue body markdown created by GitHub issue forms into field key-values.
 */
function parseIssueBody(body) {
  const text = String(body || '');
  const fields = {};
  const chunks = text.split(/^### /m).slice(1);

  chunks.forEach((chunk) => {
    const nl = chunk.indexOf('\n');
    if (nl === -1) return;
    const rawKey = chunk.slice(0, nl).trim().toLowerCase();
    const val = chunk.slice(nl + 1).trim();
    if (val === '_No response_') return;

    // Normalize keys
    if (rawKey.includes('company')) fields.company = val;
    else if (rawKey.includes('role')) fields.role = val;
    else if (rawKey.includes('level')) fields.level = val;
    else if (rawKey.includes('domain')) fields.domain = val;
    else if (rawKey.includes('round')) fields.round = val;
    else if (rawKey.includes('year')) fields.year = val;
    else if (rawKey.includes('question')) fields.question = val;
    else if (rawKey.includes('answer') && !rawKey.includes('auto-generated')) fields.answer = val;
    else if (rawKey.includes('auto-generated answer')) fields['auto-generated answer'] = val;
    else fields[rawKey] = val;
  });

  return fields;
}

/**
 * Parses level number (1-4) from string.
 */
function parseLevel(val) {
  const m = String(val || '').match(/\b([1-4])\b/);
  return m ? parseInt(m[1], 10) : 2;
}

/**
 * Detect potential confidential, NDA, or PII content before calling an LLM or publishing.
 */
function hasSensitiveInput(text) {
  const s = String(text || '');
  const hits = [];
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(s)) hits.push('email address');
  if (/\b(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/.test(s)) hits.push('phone number');
  if (/\b(under nda|strictly confidential|internal only|proprietary|trade secret)\b/i.test(s)) hits.push('confidential/NDA wording');
  return hits;
}

/**
 * Find an existing bank question with high word overlap (>= 0.75 Jaccard on meaningful words) to avoid duplicate answers.
 */
function findBankDuplicate(question, bank) {
  const stop = new Set(['the', 'and', 'how', 'what', 'why', 'when', 'does', 'did', 'you', 'your', 'for', 'with', 'from', 'that', 'this', 'explain', 'describe', 'tell']);
  const words = (s) => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
    .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w))
    .filter((w) => w.length > 2 && !stop.has(w)));
  const qw = words(question);
  if (qw.size < 3 || !Array.isArray(bank)) return null;
  let best = null, bestSim = 0;
  for (const e of bank) {
    const ew = words(e.q);
    if (!ew.size) continue;
    let inter = 0;
    qw.forEach((w) => { if (ew.has(w)) inter++; });
    const sim = inter / (qw.size + ew.size - inter);
    if (sim >= 0.75 && sim > bestSim) { bestSim = sim; best = { entry: e, similarity: Math.round(sim * 100) }; }
  }
  return best;
}

async function postJson(url, headers, body, opts) {
  opts = opts || {};
  const doFetch = opts.fetch || fetch;
  const sleep = opts.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const retries = opts.retries === undefined ? MAX_RETRIES : opts.retries;
  const timeoutMs = opts.timeoutMs || TIMEOUT_MS;

  for (let attempt = 1; ; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await doFetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctl.signal });
      clearTimeout(timer);
      if (res.ok) return await res.json();
      const retryable = res.status === 429 || res.status >= 500;
      const errText = await res.text();
      if (!retryable || attempt > retries) throw new Error(`API error (${res.status}): ${errText.slice(0, 300)}`);
      const ra = res.headers && res.headers.get && Number(res.headers.get('retry-after'));
      await sleep(ra > 0 ? Math.min(ra * 1000, 5000) : 500 * Math.pow(2, attempt - 1));
    } catch (err) {
      clearTimeout(timer);
      if (attempt > retries || /API error \(4(?!29)\d\d\)/.test(err.message)) throw err;
      await sleep(500 * Math.pow(2, attempt - 1));
    }
  }
}

/**
 * Calls Google Gemini API (key in header, never in URL)
 */
async function callGemini(apiKey, model, systemPrompt, userPrompt, opts) {
  const m = model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`;
  const data = await postJson(url, { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] }
  }, opts);
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text || '').join('\n').trim();
  if (!text) throw new Error('Gemini returned an empty response.');
  return { text, model: m, provider: 'Google Gemini' };
}

/**
 * Calls Anthropic Claude API
 */
async function callAnthropic(apiKey, model, systemPrompt, userPrompt, opts) {
  const m = model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
  const data = await postJson('https://api.anthropic.com/v1/messages', {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  }, {
    model: m,
    max_tokens: 1800,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  }, opts);
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  if (!text) throw new Error('Anthropic returned an empty response.');
  return { text, model: m, provider: 'Anthropic Claude' };
}

/**
 * Calls OpenAI or OpenAI-compatible endpoint
 */
async function callOpenAI(apiKey, model, systemPrompt, userPrompt, endpoint = 'https://api.openai.com/v1/chat/completions', opts) {
  const m = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const data = await postJson(endpoint, {
    'content-type': 'application/json',
    authorization: `Bearer ${apiKey}`
  }, {
    model: m,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 1800
  }, opts);
  const text = data.choices?.[0]?.message?.content || '';
  if (!text.trim()) throw new Error('OpenAI returned an empty response.');
  return { text: text.trim(), model: m, provider: 'OpenAI' };
}

/**
 * Selects and calls the best available LLM provider based on environment variables.
 */
async function generateAnswerWithLlm(IGU, postData) {
  const prompt = IGU.engine.aiPrompt(postData);
  const systemPrompt = IGU.engine.AI_SYSTEM;

  if (process.env.GEMINI_API_KEY) {
    console.log('Generating answer using Google Gemini...');
    return await callGemini(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL, systemPrompt, prompt);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('Generating answer using Anthropic Claude...');
    return await callAnthropic(process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_MODEL, systemPrompt, prompt);
  }
  if (process.env.OPENAI_API_KEY) {
    console.log('Generating answer using OpenAI...');
    return await callOpenAI(process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL, systemPrompt, prompt);
  }

  const ghToken = process.env.GITHUB_MODELS_TOKEN || process.env.GITHUB_TOKEN;
  if (ghToken) {
    try {
      console.log('Attempting generation with GitHub Models...');
      return await callOpenAI(
        ghToken,
        process.env.GITHUB_MODEL || 'gpt-4o-mini',
        systemPrompt,
        prompt,
        'https://models.inference.ai.azure.com/chat/completions'
      );
    } catch (err) {
      console.warn('GitHub Models not available or unauthorized:', err.message);
    }
  }

  console.log('No LLM API keys provided; falling back to template engine with setup guide...');
  const offline = IGU.engine.generate(postData, IGU.bank || []);
  const note =
    '> [!NOTE]\n' +
    '> **Automated offline draft:** To enable AI answers powered by an LLM (Gemini, Claude, or OpenAI), ' +
    'add `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` to GitHub Repository Secrets (`Settings > Secrets and variables > Actions`).\n\n';

  return {
    text: note + offline.md,
    model: 'offline-template-fallback',
    provider: 'Template Engine'
  };
}

/**
 * LLM output is untrusted text that ends up in a public issue: stop it from pinging people with @mentions
 * and cap its size.
 */
function neutralise(text) {
  return String(text || '')
    .replace(/(^|[^\w`])@(?=[A-Za-z0-9_-]{1,39}\b)/g, '$1@\u200b')
    .slice(0, 12000);
}

/**
 * Appends the generated answer to the issue body under the '### Auto-generated Answer' header with provenance metadata.
 */
function appendAnswerToBody(originalBody, answerMarkdown, metaInfo) {
  const trimmed = String(originalBody || '').trimEnd();
  answerMarkdown = neutralise(answerMarkdown);
  const header = '### Auto-generated Answer';
  const date = (metaInfo && metaInfo.generatedAt) || new Date().toISOString().slice(0, 10);
  const provider = metaInfo && metaInfo.provider ? ` (${neutralise(metaInfo.provider)})` : '';
  const metaNote = `*Answer generated by ${neutralise(metaInfo.model || 'LLM')}${provider} on ${date} for ${metaInfo.roleName || 'Software engineer'} · Gear ${metaInfo.level}*\n\n`;

  return `${trimmed}\n\n${header}\n\n${metaNote}${answerMarkdown.trim()}\n`;
}

/**
 * Main function for GitHub Actions execution.
 */
async function main() {
  const token = process.env.GITHUB_TOKEN;
  const issueNumber = process.env.ISSUE_NUMBER;
  const repo = process.env.GITHUB_REPOSITORY || 'sadiqgpasha89/InterviewGearUp';

  if (!issueNumber) {
    console.log('No ISSUE_NUMBER specified. Running in self-test mode.');
    const IGU = loadAppEngine();
    const mockPost = {
      question: 'Design a scalable rate limiter for our microservices architecture',
      role: 'backend',
      roleName: 'Backend engineer',
      level: 3,
      company: 'Stripe',
      domain: 'Fintech / Banking',
      round: 'System design'
    };
    const prompt = IGU.engine.aiPrompt(mockPost);
    console.log('Prompt successfully generated for test question:');
    console.log(prompt.slice(0, 300) + '...\n');
    console.log('Self-test complete.');
    return;
  }

  if (!token) {
    throw new Error('GITHUB_TOKEN is required to read/update issues in GitHub Actions.');
  }

  const IGU = loadAppEngine();
  console.log(`Processing issue #${issueNumber} in repository ${repo}...`);

  const issueUrl = `https://api.github.com/repos/${repo}/issues/${issueNumber}`;
  const res = await fetch(issueUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'InterviewGearUp-AutoAnswerBot'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch issue #${issueNumber}: HTTP ${res.status} ${await res.text()}`);
  }

  const issue = await res.json();

  if (issue.state !== 'open') {
    console.log(`Issue #${issueNumber} is not open. Skipping.`);
    return;
  }

  if (String(issue.body || '').length > 8000) {
    console.log(`Issue #${issueNumber} body is unusually long. Skipping to limit cost.`);
    return;
  }
  if ((issue.labels || []).some((l) => l.name === 'ai-answered')) {
    console.log(`Issue #${issueNumber} is already labelled ai-answered. Skipping.`);
    return;
  }

  const fields = parseIssueBody(issue.body);
  if (fields['auto-generated answer']) {
    console.log(`Issue #${issueNumber} already has an auto-generated answer. Skipping.`);
    return;
  }

  const question = fields.question || issue.title;
  if (!question || question.trim().length < 15) {
    console.log(`Issue #${issueNumber} question is too short or missing. Skipping.`);
    return;
  }

  const sensitive = hasSensitiveInput(question + '\n' + (fields.answer || ''));
  if (sensitive.length) {
    console.log(`Issue #${issueNumber} flagged for possible ${sensitive.join(', ')}. Skipping LLM generation.`);
    return;
  }

  const dup = findBankDuplicate(question, IGU.bank);
  const level = parseLevel(fields.level);
  const roleName = fields.role || 'Software engineer';
  const roleObj = (IGU.meta && IGU.meta.roles ? IGU.meta.roles : []).find(
    (r) => r.name.toLowerCase() === roleName.toLowerCase() || r.id === roleName.toLowerCase()
  );
  const roleId = roleObj ? roleObj.id : 'general';

  const postData = {
    question: question.trim(),
    role: roleId,
    roleName: roleName,
    level: level,
    company: fields.company || '',
    domain: fields.domain || 'Other',
    round: fields.round || '',
    answer: fields.answer || ''
  };

  const result = await generateAnswerWithLlm(IGU, postData);
  const generatedAt = new Date().toISOString().slice(0, 10);

  const updatedBody = appendAnswerToBody(issue.body, result.text, {
    model: result.model,
    provider: result.provider,
    generatedAt: generatedAt,
    roleName: roleName,
    level: level
  });

  console.log(`Updating issue #${issueNumber} body with LLM answer...`);
  const patchRes = await fetch(issueUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'InterviewGearUp-AutoAnswerBot'
    },
    body: JSON.stringify({ body: updatedBody })
  });

  if (!patchRes.ok) {
    throw new Error(`Failed to update issue #${issueNumber}: HTTP ${patchRes.status} ${await patchRes.text()}`);
  }

  const labelRes = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}/labels`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'InterviewGearUp-AutoAnswerBot'
    },
    body: JSON.stringify({ labels: ['ai-answered'] })
  });
  if (!labelRes.ok) console.warn(`Could not label issue #${issueNumber}: HTTP ${labelRes.status}`);

  const dupNote = dup
    ? `\n\nNote: This looks ${dup.similarity}% similar to existing question \`${dup.entry.id}\` ("${neutralise(dup.entry.q)}").`
    : '';
  const commentRes = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'InterviewGearUp-AutoAnswerBot'
    },
    body: JSON.stringify({
      body: `An AI-generated study draft (${neutralise(result.provider || 'LLM')}, \`${neutralise(result.model || 'unknown')}\`, ${generatedAt}) was added to this post. ` +
        `It is labelled \`ai-answered\` as a starting point, not a human-verified answer. Read it on the [Community tab](https://${repo.split('/')[0]}.github.io/${repo.split('/')[1]}/#/community?open=gh-${issueNumber}).${dupNote}`
    })
  });
  if (!commentRes.ok) console.warn(`Could not post comment to issue #${issueNumber}: HTTP ${commentRes.status}`);

  console.log(`✓ Successfully generated and saved answer for issue #${issueNumber}!`);
}

module.exports = {
  loadAppEngine,
  parseIssueBody,
  parseLevel,
  hasSensitiveInput,
  findBankDuplicate,
  postJson,
  appendAnswerToBody,
  neutralise,
  callGemini,
  callAnthropic,
  callOpenAI,
  generateAnswerWithLlm
};

if (require.main === module) {
  main().catch((err) => {
    console.error('Error generating answer:', err);
    process.exit(1);
  });
}
