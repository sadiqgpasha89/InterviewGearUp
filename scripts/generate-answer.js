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
 * Calls Google Gemini API
 */
async function callGemini(apiKey, model, systemPrompt, userPrompt) {
  const m = model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text || '').join('\n').trim();
  if (!text) throw new Error('Gemini returned an empty response.');
  return { text, model: m, provider: 'Google Gemini' };
}

/**
 * Calls Anthropic Claude API
 */
async function callAnthropic(apiKey, model, systemPrompt, userPrompt) {
  const m = model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: m,
      max_tokens: 1800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  if (!text) throw new Error('Anthropic returned an empty response.');
  return { text, model: m, provider: 'Anthropic Claude' };
}

/**
 * Calls OpenAI or OpenAI-compatible endpoint
 */
async function callOpenAI(apiKey, model, systemPrompt, userPrompt, endpoint = 'https://api.openai.com/v1/chat/completions') {
  const m = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: m,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1800
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
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

  // 1. Google Gemini
  if (process.env.GEMINI_API_KEY) {
    console.log('Generating answer using Google Gemini...');
    return await callGemini(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL, systemPrompt, prompt);
  }

  // 2. Anthropic Claude
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('Generating answer using Anthropic Claude...');
    return await callAnthropic(process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_MODEL, systemPrompt, prompt);
  }

  // 3. OpenAI
  if (process.env.OPENAI_API_KEY) {
    console.log('Generating answer using OpenAI...');
    return await callOpenAI(process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL, systemPrompt, prompt);
  }

  // 4. GitHub Models (Azure AI Inference endpoint)
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

  // 5. Offline template fallback
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
 * Appends the generated answer to the issue body under the '### Auto-generated Answer' header.
 */
function appendAnswerToBody(originalBody, answerMarkdown, metaInfo) {
  const trimmed = String(originalBody || '').trimEnd();
  answerMarkdown = neutralise(answerMarkdown);
  const header = '### Auto-generated Answer';
  const metaNote = `*Answer generated by ${metaInfo.model || 'LLM'} for ${metaInfo.roleName || 'Software engineer'} · Gear ${metaInfo.level}*\n\n`;

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

  // Fetch issue details
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
  if (!question || question.trim().length < 10) {
    console.log(`Issue #${issueNumber} has no valid question text. Skipping.`);
    return;
  }

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

  // Generate answer using LLM
  const result = await generateAnswerWithLlm(IGU, postData);

  // Update issue body
  const updatedBody = appendAnswerToBody(issue.body, result.text, {
    model: result.model,
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

  // Provenance: only the bot can apply this label (contributors cannot forge it), and the site only
  // shows a section as LLM-written when the issue carries it.
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

  // A short pointer, not a second copy of the answer.
  const commentRes = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'InterviewGearUp-AutoAnswerBot'
    },
    body: JSON.stringify({
      body: `An AI-generated study draft (${neutralise(result.provider || 'LLM')}, ${neutralise(result.model || 'unknown model')}) was added to this post. ` +
        `It is a starting point, not a verified answer. Read it on the [Community tab](https://${repo.split('/')[0]}.github.io/${repo.split('/')[1]}/#/community).`
    })
  });
  if (!commentRes.ok) console.warn(`Could not post comment to issue #${issueNumber}: HTTP ${commentRes.status}`);

  console.log(`✓ Successfully generated and saved answer for issue #${issueNumber}!`);
}

module.exports = {
  loadAppEngine,
  parseIssueBody,
  parseLevel,
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
