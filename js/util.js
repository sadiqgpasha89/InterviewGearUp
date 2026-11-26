/* DOM helpers, a tiny safe markdown renderer, and storage. No innerHTML anywhere:
   user-supplied text is only ever inserted as text nodes, so posts cannot inject markup. */
(function () {
  const IGU = (window.IGU = window.IGU || {});

  const PROPS = new Set(['value', 'checked', 'selected', 'disabled']);

  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (PROPS.has(k)) el[k] = v;
        else el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }

  function append(el, kid) {
    if (kid === null || kid === undefined || kid === false) return;
    if (Array.isArray(kid)) kid.forEach(function (k) { append(el, k); });
    else if (kid instanceof Node) el.appendChild(kid);
    else el.appendChild(document.createTextNode(String(kid)));
  }

  /* Only same-page hash links and https links are allowed in rendered markdown. */
  function safeHref(u) {
    return /^(#\/|https:\/\/)/.test(u) ? u : null;
  }

  function inline(text) {
    const out = [];
    const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      const t = m[0];
      if (m[1]) out.push(h('code', null, t.slice(1, -1)));
      else if (m[2]) out.push(h('strong', null, inline(t.slice(2, -2))));
      else {
        const mm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(t);
        const href = safeHref(mm[2]);
        out.push(href ? h('a', { href: href, rel: 'noopener noreferrer' }, mm[1]) : mm[1]);
      }
      last = m.index + t.length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  /* Supports: paragraphs, #### headings, - bullets, 1. lists, > quotes, ``` code fences. */
  /* Split a markdown table row on unescaped pipes; "\|" is a literal pipe. */
  function tableCells(line) {
    let t = line.trim();
    if (t.charAt(0) === '|') t = t.slice(1);
    if (t.charAt(t.length - 1) === '|' && t.charAt(t.length - 2) !== '\\') t = t.slice(0, -1);
    const cells = [];
    let cur = '';
    for (let k = 0; k < t.length; k++) {
      if (t.charAt(k) === '\\' && t.charAt(k + 1) === '|') { cur += '|'; k++; }
      else if (t.charAt(k) === '|') { cells.push(cur.trim()); cur = ''; }
      else cur += t.charAt(k);
    }
    cells.push(cur.trim());
    return cells;
  }
  const TABLE_SEP = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

  function md(src) {
    const root = document.createDocumentFragment();
    const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      if (/^```/.test(line)) {
        const buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        root.appendChild(h('pre', null, h('code', null, buf.join('\n'))));
        continue;
      }
      const hm = /^(#{3,4})\s+(.*)$/.exec(line);
      if (hm) { root.appendChild(h('h4', null, inline(hm[2]))); i++; continue; }
      if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
        root.appendChild(h('blockquote', null, inline(buf.join(' '))));
        continue;
      }
      if (/^\s*\|/.test(line) && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
        const head = tableCells(line);
        i += 2;
        const body = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) body.push(tableCells(lines[i++]));
        const tbl = h('table', null,
          h('thead', null, h('tr', null, head.map(function (c) { return h('th', null, inline(c)); }))),
          h('tbody', null, body.map(function (r) { return h('tr', null, r.map(function (c) { return h('td', null, inline(c)); })); })));
        root.appendChild(h('div', { class: 'md-table' }, tbl));
        continue;
      }
      if (/^\s*[-*]\s+/.test(line)) {
        const ul = h('ul');
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) ul.appendChild(h('li', null, inline(lines[i++].replace(/^\s*[-*]\s+/, ''))));
        root.appendChild(ul);
        continue;
      }
      if (/^\s*\d+[.)]\s+/.test(line)) {
        const ol = h('ol', { start: parseInt(line, 10) });
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) ol.appendChild(h('li', null, inline(lines[i++].replace(/^\s*\d+[.)]\s+/, ''))));
        root.appendChild(ol);
        continue;
      }
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(```|\s*\||#{3,4}\s|>\s?|\s*[-*]\s+|\s*\d+[.)]\s+)/.test(lines[i])) buf.push(lines[i++]);
      root.appendChild(h('p', null, inline(buf.join(' '))));
    }
    return root;
  }

  /* localStorage that never throws (private windows, blocked storage). */
  const mem = {};
  const store = {
    get: function (key, fallback) {
      try {
        const raw = window.localStorage.getItem('igu.' + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return key in mem ? mem[key] : fallback;
      }
    },
    set: function (key, value) {
      mem[key] = value;
      try { window.localStorage.setItem('igu.' + key, JSON.stringify(value)); } catch (e) { /* in-memory only */ }
    },
    remove: function (key) {
      delete mem[key];
      try { window.localStorage.removeItem('igu.' + key); } catch (e) { /* ignore */ }
    },
    wipe: function () {
      Object.keys(mem).forEach(function (k) { delete mem[k]; });
      try {
        Object.keys(window.localStorage).filter(function (k) { return k.indexOf('igu.') === 0; })
          .forEach(function (k) { window.localStorage.removeItem(k); });
      } catch (e) { /* nothing to clear */ }
    }
  };

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  IGU.util = { h: h, md: md, store: store, uid: uid };
})();
