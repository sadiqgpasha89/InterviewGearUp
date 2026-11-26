/* Optional bring-your-own-key AI calls from the browser. One adapter for Gemini, Anthropic and OpenAI:
   centralized provider config, timeout, cancellation (AbortSignal), bounded retry with backoff on transient failures,
   no retry on auth/billing/quota errors, token/truncation metadata, and friendly messages that never contain the API key.
   fetch and sleep are injectable so test/run.js can exercise every branch. */
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
    auth: 'The AI provider rejected your API key. Check or clear it in Settings.',
    quota: 'The AI provider says this key is out of quota, billing credit, or spending limit.',
    rate: 'The AI provider is rate limiting requests. Wait a minute and try again.',
    server: 'The AI provider had a temporary problem. Try again shortly.',
    network: 'Could not reach the AI provider. Check your connection.',
    timeout: 'The AI provider took too long to answer.',
    cancelled: 'AI request cancelled.',
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

  function isQuotaMessage(msg) {
    return /insufficient_quota|quota exceeded|billing|credit balance|spending limit|exceeded your current quota/i.test(String(msg || ''));
  }

  function defaultModel(provider) {
    return (cfg.providers && cfg.providers[provider] && cfg.providers[provider].defaultModel) || cfg.defaultModel || '';
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
    const m = String(model || '').trim() || defaultModel(provider);
    if (provider === 'gemini') {
      return { id: provider, model: m, name: (cfg.providers.gemini && cfg.providers.gemini.name) || 'Google Gemini',
        // The key goes in a header, not the URL, so it cannot end up in logs, history or referrers.
        url: 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(m) + ':generateContent',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: { contents: [{ role: 'user', parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: system }] } },
        read: function (j) {
          const c = (j.candidates && j.candidates[0]) || {};
          const u = j.usageMetadata || {};
          return {
            text: ((c.content && c.content.parts) || []).map(function (p) { return p.text || ''; }).join('\n'),
            truncated: c.finishReason === 'MAX_TOKENS',
            usage: (u.promptTokenCount || u.candidatesTokenCount) ? { inputTokens: u.promptTokenCount || 0, outputTokens: u.candidatesTokenCount || 0 } : null
          };
        } };
    }
    if (provider === 'anthropic') {
      return { id: provider, model: m, name: (cfg.providers.anthropic && cfg.providers.anthropic.name) || 'Anthropic Claude',
        url: 'https://api.anthropic.com/v1/messages',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: { model: m, max_tokens: 1800, system: system, messages: [{ role: 'user', content: prompt }] },
        read: function (j) {
          const u = j.usage || {};
          return {
            text: (j.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n'),
            truncated: j.stop_reason === 'max_tokens',
            usage: (u.input_tokens || u.output_tokens) ? { inputTokens: u.input_tokens || 0, outputTokens: u.output_tokens || 0 } : null
          };
        } };
    }
    if (provider === 'openai') {
      return { id: provider, model: m, name: (cfg.providers.openai && cfg.providers.openai.name) || 'OpenAI',
        url: 'https://api.openai.com/v1/chat/completions',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
        body: { model: m, max_tokens: 1800, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] },
        read: function (j) {
          const c = (j.choices || [])[0] || {};
          const u = j.usage || {};
          return {
            text: (c.message || {}).content || '',
            truncated: c.finish_reason === 'length',
            usage: (u.prompt_tokens || u.completion_tokens) ? { inputTokens: u.prompt_tokens || 0, outputTokens: u.completion_tokens || 0 } : null
          };
        } };
    }
    throw AiError('bad', 'Unsupported AI provider: ' + provider);
  }

  function redact(text, key) {
    text = String(text || '');
    return key ? text.split(key).join('[key hidden]') : text;
  }

  async function once(req, key, doFetch, timeoutMs, extSignal) {
    if (extSignal && extSignal.aborted) throw AiError('cancelled', MESSAGES.cancelled);
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let timer = null, timedOut = false, cancelled = false;
    const onAbort = function () { cancelled = true; if (ctl) ctl.abort(); };
    if (extSignal && extSignal.addEventListener) extSignal.addEventListener('abort', onAbort, { once: true });
    const timeout = new Promise(function (_, reject) {
      timer = setTimeout(function () { timedOut = true; if (ctl) ctl.abort(); reject(AiError('timeout', MESSAGES.timeout)); }, timeoutMs);
    });
    try {
      const res = await Promise.race([
        doFetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(req.body), signal: ctl ? ctl.signal : undefined }),
        timeout
      ]);
      if (!res.ok) {
        let kind = kindForStatus(res.status);
        let detail = '';
        try {
          const j = await res.json();
          const m = (j && j.error && (j.error.message || j.error.code || j.error.type)) || '';
          const code = (j && j.error && (j.error.code || j.error.type || j.error.status)) || '';
          detail = String(m || '');
          if (isQuotaMessage(detail + ' ' + code)) kind = 'quota';
        } catch (x) { /* keep default */ }
        const e = AiError(kind, MESSAGES[kind], res.status);
        const ra = res.headers && res.headers.get && Number(res.headers.get('retry-after'));
        if (ra > 0 && e.retryable) e.retryAfterMs = Math.min(ra * 1000, 5000);
        if (detail && e.kind === 'bad') e.message = redact(detail, key).slice(0, 300);
        throw e;
      }
      let j;
      try { j = await res.json(); } catch (x) { throw AiError('bad', MESSAGES.bad); }
      const parsed = req.read(j);
      const text = String((parsed && parsed.text) || '').trim();
      if (!text) throw AiError('empty', MESSAGES.empty);
      return { text: text, truncated: !!(parsed && parsed.truncated), usage: (parsed && parsed.usage) || null };
    } catch (e) {
      if (cancelled || (extSignal && extSignal.aborted)) throw AiError('cancelled', MESSAGES.cancelled);
      if (e && e.name === 'AiError') throw e;
      if (timedOut) throw AiError('timeout', MESSAGES.timeout);
      throw AiError('network', MESSAGES.network);
    } finally {
      clearTimeout(timer);
      if (extSignal && extSignal.removeEventListener) extSignal.removeEventListener('abort', onAbort);
    }
  }

  /* opts: { settings:{provider,key,model}, system, prompt, signal?, fetch?, sleep?, timeoutMs?, retries? }
     Resolves { text, model, provider, providerId, attempts, at, truncated, usage }; rejects with an AiError. */
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
      if (opts.signal && opts.signal.aborted) throw AiError('cancelled', MESSAGES.cancelled);
      attempt++;
      try {
        const out = await once(req, s.key, doFetch, opts.timeoutMs || TIMEOUT_MS, opts.signal);
        return {
          text: out.text, model: req.model, provider: req.name, providerId: req.id,
          attempts: attempt, at: new Date().toISOString(), truncated: out.truncated, usage: out.usage
        };
      } catch (e) {
        if (!e.retryable || attempt > retries || (opts.signal && opts.signal.aborted)) { e.attempts = attempt; throw e; }
        await sleep(e.retryAfterMs || 500 * Math.pow(2, attempt - 1));
      }
    }
  }

  IGU.ai = { ask: ask, detectProvider: detectProvider, defaultModel: defaultModel, kindForStatus: kindForStatus, MESSAGES: MESSAGES, TIMEOUT_MS: TIMEOUT_MS, MAX_RETRIES: MAX_RETRIES };
})();
