/* Optional bring-your-own-key AI calls from the browser. One adapter for Gemini, Anthropic and OpenAI:
   timeout, bounded retry with backoff on transient failures, no retry on auth/quota errors, and friendly messages
   that can never contain the API key. fetch and sleep are injectable so test/run.js can exercise every branch. */
(function () {
  const IGU = (window.IGU = window.IGU || {});
  const cfg = IGU.config || { providers: {} };

  const TIMEOUT_MS = 30000;
  const MAX_RETRIES = 2;

  function AiError(kind, message, status) {
    const e = new Error(message);
    e.name = 'AiError';
    e.kind = kind;
    e.status = status || 0;
    e.retryable = kind === 'rate' || kind === 'server' || kind === 'network' || kind === 'timeout';
    return e;
  }

  const MESSAGES = {
    auth: 'The AI provider rejected your API key. Check it in Settings.',
    quota: 'The AI provider says this key is out of quota or credit.',
    rate: 'The AI provider is rate limiting requests. Wait a minute and try again.',
    server: 'The AI provider had a temporary problem. Try again shortly.',
    network: 'Could not reach the AI provider. Check your connection.',
    timeout: 'The AI provider took too long to answer.',
    empty: 'The AI provider returned an empty answer.',
    bad: 'The AI provider could not process this request.'
  };

  function kindForStatus(status) {
    if (status === 401 || status === 403) return 'auth';
    if (status === 402) return 'quota';
    if (status === 429) return 'rate';
    if (status >= 500) return 'server';
    return 'bad';
  }

  function detectProvider(s) {
    if (s.provider) return s.provider;
    const key = (s.key || '').trim();
    if (key.indexOf('AIza') === 0) return 'gemini';
    if (key.indexOf('sk-ant') === 0) return 'anthropic';
    if (key.indexOf('sk-') === 0) return 'openai';
    const model = (s.model || '').toLowerCase();
    if (model.indexOf('gemini') >= 0) return 'gemini';
    if (model.indexOf('claude') >= 0) return 'anthropic';
    if (model.indexOf('gpt') >= 0) return 'openai';
    return cfg.defaultProvider || 'gemini';
  }

  function request(provider, key, model, system, prompt) {
    const m = model || (cfg.providers[provider] && cfg.providers[provider].defaultModel);
    if (provider === 'gemini') {
      return { model: m, name: 'Google Gemini',
        // The key goes in a header, not the URL, so it cannot end up in logs, history or referrers.
        url: 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(m) + ':generateContent',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: { contents: [{ role: 'user', parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: system }] } },
        read: function (j) {
          const c = (j.candidates && j.candidates[0]) || {};
          return ((c.content && c.content.parts) || []).map(function (p) { return p.text || ''; }).join('\n');
        } };
    }
    if (provider === 'anthropic') {
      return { model: m, name: 'Anthropic Claude', url: 'https://api.anthropic.com/v1/messages',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: { model: m, max_tokens: 1800, system: system, messages: [{ role: 'user', content: prompt }] },
        read: function (j) { return (j.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n'); } };
    }
    if (provider === 'openai') {
      return { model: m, name: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
        body: { model: m, max_tokens: 1800, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] },
        read: function (j) { return (((j.choices || [])[0] || {}).message || {}).content || ''; } };
    }
    throw AiError('bad', 'Unsupported AI provider: ' + provider);
  }

  function redact(text, key) {
    text = String(text || '');
    return key ? text.split(key).join('[key hidden]') : text;
  }

  async function once(req, key, doFetch, timeoutMs) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let timer = null, timedOut = false;
    const timeout = new Promise(function (_, reject) {
      timer = setTimeout(function () { timedOut = true; if (ctl) ctl.abort(); reject(AiError('timeout', MESSAGES.timeout)); }, timeoutMs);
    });
    try {
      const res = await Promise.race([
        doFetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(req.body), signal: ctl ? ctl.signal : undefined }),
        timeout
      ]);
      if (!res.ok) {
        const e = AiError(kindForStatus(res.status), MESSAGES[kindForStatus(res.status)], res.status);
        const ra = res.headers && res.headers.get && Number(res.headers.get('retry-after'));
        if (ra > 0) e.retryAfterMs = Math.min(ra * 1000, 5000);
        try { const j = await res.json(); const m = j && j.error && j.error.message; if (m && e.kind === 'bad') e.message = redact(m, key).slice(0, 300); } catch (x) { /* keep default */ }
        throw e;
      }
      let j;
      try { j = await res.json(); } catch (x) { throw AiError('bad', MESSAGES.bad); }
      const text = String(req.read(j) || '').trim();
      if (!text) throw AiError('empty', MESSAGES.empty);
      return text;
    } catch (e) {
      if (e && e.name === 'AiError') throw e;
      if (timedOut) throw AiError('timeout', MESSAGES.timeout);
      throw AiError('network', MESSAGES.network);
    } finally {
      clearTimeout(timer);
    }
  }

  /* opts: { settings:{provider,key,model}, system, prompt, fetch, sleep, timeoutMs, retries }
     Resolves { text, model, provider, attempts }; rejects with an AiError (kind, status, retryable, friendly message). */
  async function ask(opts) {
    const s = opts.settings || {};
    if (!s.key) throw AiError('auth', 'Add an AI API key in Settings first.');
    const req = request(detectProvider(s), s.key, s.model, opts.system, opts.prompt);
    const doFetch = opts.fetch || (typeof fetch !== 'undefined' ? fetch.bind(window) : null);
    if (!doFetch) throw AiError('network', MESSAGES.network);
    const sleep = opts.sleep || function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    const retries = opts.retries === undefined ? MAX_RETRIES : opts.retries;
    let attempt = 0;
    for (;;) {
      attempt++;
      try {
        const text = await once(req, s.key, doFetch, opts.timeoutMs || TIMEOUT_MS);
        return { text: text, model: req.model, provider: req.name, attempts: attempt };
      } catch (e) {
        if (!e.retryable || attempt > retries) { e.attempts = attempt; throw e; }
        await sleep(e.retryAfterMs || 500 * Math.pow(2, attempt - 1));
      }
    }
  }

  IGU.ai = { ask: ask, detectProvider: detectProvider, kindForStatus: kindForStatus, MESSAGES: MESSAGES, TIMEOUT_MS: TIMEOUT_MS, MAX_RETRIES: MAX_RETRIES };
})();
