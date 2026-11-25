/* Markdown to HTML for the static pages, mirroring the subset that js/util.js md() renders in the browser.
   Everything is escaped; the only attributes ever emitted are href (https or in-app links), start and class. */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function href(u, appBase) {
  if (/^https:\/\//.test(u)) return u;
  if (/^#\//.test(u)) return appBase + u;
  return null;
}

function inline(text, appBase) {
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let out = '', last = 0, m;
  while ((m = re.exec(text))) {
    out += esc(text.slice(last, m.index));
    const t = m[0];
    if (m[1]) out += '<code>' + esc(t.slice(1, -1)) + '</code>';
    else if (m[2]) out += '<strong>' + inline(t.slice(2, -2), appBase) + '</strong>';
    else {
      const mm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(t);
      const link = href(mm[2], appBase);
      out += link ? '<a href="' + esc(link) + '" rel="noopener noreferrer">' + esc(mm[1]) + '</a>' : esc(mm[1]);
    }
    last = m.index + t.length;
  }
  return out + esc(text.slice(last));
}

function tableCells(line) {
  let t = line.trim();
  if (t[0] === '|') t = t.slice(1);
  if (t[t.length - 1] === '|' && t[t.length - 2] !== '\\') t = t.slice(0, -1);
  const cells = []; let cur = '';
  for (let k = 0; k < t.length; k++) {
    if (t[k] === '\\' && t[k + 1] === '|') { cur += '|'; k++; }
    else if (t[k] === '|') { cells.push(cur.trim()); cur = ''; }
    else cur += t[k];
  }
  cells.push(cur.trim());
  return cells;
}
const SEP = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

function mdToHtml(src, appBase) {
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^```/.test(line)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>');
      continue;
    }
    const hm = /^(#{3,4})\s+(.*)$/.exec(line);
    if (hm) { out.push('<h4>' + inline(hm[2], appBase) + '</h4>'); i++; continue; }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push('<blockquote>' + inline(buf.join(' '), appBase) + '</blockquote>');
      continue;
    }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && SEP.test(lines[i + 1])) {
      const head = tableCells(line); i += 2;
      const body = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) body.push(tableCells(lines[i++]));
      out.push('<div class="md-table"><table><thead><tr>' + head.map((c) => '<th>' + inline(c, appBase) + '</th>').join('') + '</tr></thead><tbody>' +
        body.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c, appBase) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push('<li>' + inline(lines[i++].replace(/^\s*[-*]\s+/, ''), appBase) + '</li>');
      out.push('<ul>' + items.join('') + '</ul>');
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const start = parseInt(line, 10), items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push('<li>' + inline(lines[i++].replace(/^\s*\d+[.)]\s+/, ''), appBase) + '</li>');
      out.push('<ol start="' + start + '">' + items.join('') + '</ol>');
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(```|\s*\||#{3,4}\s|>\s?|\s*[-*]\s+|\s*\d+[.)]\s+)/.test(lines[i])) buf.push(lines[i++]);
    out.push('<p>' + inline(buf.join(' '), appBase) + '</p>');
  }
  return out.join('\n');
}

module.exports = { mdToHtml, esc };
