/* Renders specs/overview.html: lists all spec docs and lets the user view one inline.
   Fetches markdown from the GitHub raw URL (works on Pages since it's a public repo). */
(function () {
  'use strict';
  const { el, clear } = window.EVAL;

  // minimal markdown -> html renderer (headings, bold, code, tables, lists, paragraphs)
  function renderMarkdown(md) {
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function inline(s) {
      return esc(s)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }
    const lines = md.split('\n');
    let html = '';
    let i = 0;
    let inList = false, inOl = false;
    function closeList() { if (inList) { html += '</ul>'; inList = false; } if (inOl) { html += '</ol>'; inOl = false; } }
    while (i < lines.length) {
      let line = lines[i];
      // fenced code block
      if (/^```/.test(line)) {
        closeList();
        const lang = line.replace(/^```/, '').trim();
        let buf = '';
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) { buf += lines[i] + '\n'; i++; }
        i++; // skip closing fence
        html += '<pre><code>' + esc(buf.replace(/\n$/, '')) + '</code></pre>';
        continue;
      }
      // table
      if (line.indexOf('|') >= 0 && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
        closeList();
        const headers = line.split('|').map(function (s) { return s.trim(); }).filter(function (s) { return s.length || true; });
        // strip empty leading/trailing
        while (headers.length && headers[0] === '') headers.shift();
        while (headers.length && headers[headers.length - 1] === '') headers.pop();
        i += 2; // skip header separator
        let tbody = '';
        while (i < lines.length && lines[i].indexOf('|') >= 0) {
          const cells = lines[i].split('|').map(function (s) { return s.trim(); });
          while (cells.length && cells[0] === '') cells.shift();
          while (cells.length && cells[cells.length - 1] === '') cells.pop();
          tbody += '<tr>' + cells.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>';
          i++;
        }
        html += '<div class="table-wrap"><table><thead><tr>' + headers.map(function (h) { return '<th>' + inline(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + tbody + '</tbody></table></div>';
        continue;
      }
      // headings
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        closeList();
        const level = h[1].length;
        html += '<h' + level + '>' + inline(h[2]) + '</h' + level + '>';
        i++; continue;
      }
      // blockquote
      if (/^>\s?/.test(line)) {
        closeList();
        let buf = '';
        while (i < lines.length && /^>\s?/.test(lines[i])) { buf += lines[i].replace(/^>\s?/, '') + '\n'; i++; }
        html += '<blockquote style="border-left:3px solid var(--border);padding-left:16px;margin:12px 0;color:var(--text-dim);">' + inline(buf.trim()) + '</blockquote>';
        continue;
      }
      // unordered list
      if (/^\s*[-*]\s+/.test(line)) {
        if (!inList) { closeList(); html += '<ul>'; inList = true; }
        html += '<li>' + inline(line.replace(/^\s*[-*]\s+/, '')) + '</li>';
        i++; continue;
      }
      // ordered list
      if (/^\s*\d+\.\s+/.test(line)) {
        if (!inOl) { closeList(); html += '<ol>'; inOl = true; }
        html += '<li>' + inline(line.replace(/^\s*\d+\.\s+/, '')) + '</li>';
        i++; continue;
      }
      // blank line
      if (line.trim() === '') { closeList(); i++; continue; }
      // horizontal rule
      if (/^---+$/.test(line.trim())) { closeList(); html += '<hr>'; i++; continue; }
      // paragraph
      closeList();
      html += '<p>' + inline(line) + '</p>';
      i++;
    }
    closeList();
    return html;
  }

  document.addEventListener('DOMContentLoaded', function () {
    const data = window.EVAL_DATA;

    // specs list
    const list = document.getElementById('specs-list');
    if (list) {
      clear(list);
      data.specDocs.forEach(function (d) {
        const card = el('div', { class: 'card' });
        card.appendChild(el('h3', { style: 'margin-top:0;' }, [
          el('a', { href: 'https://github.com/wildelaw/resellers-inventory-mgmt/blob/main/' + d.path, target: '_blank', rel: 'noopener' }, d.name)
        ]));
        card.appendChild(el('p', { class: 'dim', style: 'font-size:13px;margin-bottom:8px;' }, d.path));
        card.appendChild(el('p', {}, d.blurb));
        list.appendChild(card);
      });
    }

    // viewer buttons
    const buttons = document.getElementById('spec-buttons');
    const viewer = document.getElementById('spec-viewer');
    const title = document.getElementById('spec-viewer-title');
    const body = document.getElementById('spec-viewer-body');
    if (buttons && viewer) {
      clear(buttons);
      data.specDocs.forEach(function (d) {
        const btn = el('button', { class: 'btn', 'data-path': d.path }, d.name);
        btn.addEventListener('click', function () { loadSpec(d); });
        buttons.appendChild(btn);
      });
    }

    function loadSpec(d) {
      viewer.hidden = false;
      title.textContent = d.name;
      clear(body);
      body.appendChild(el('p', { class: 'dim' }, 'Loading ' + d.path + '...'));
      const rawUrl = 'https://raw.githubusercontent.com/wildelaw/resellers-inventory-mgmt/main/' + d.path;
      fetch(rawUrl)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(function (md) {
          clear(body);
          const rendered = el('div', { class: 'markdown-rendered' });
          rendered.innerHTML = renderMarkdown(md);
          body.appendChild(rendered);
        })
        .catch(function (err) {
          clear(body);
          body.appendChild(el('p', { class: 'dim' }, 'Could not load ' + d.path + ' from GitHub: ' + err.message + '. View it directly: '));
          body.appendChild(el('a', { href: 'https://github.com/wildelaw/resellers-inventory-mgmt/blob/main/' + d.path, target: '_blank', rel: 'noopener' }, 'open on GitHub →'));
        });
    }
  });
})();