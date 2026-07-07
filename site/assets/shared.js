/* shared helpers for all pages */
(function () {
  'use strict';

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (attrs[k] == null || attrs[k] === false) continue;
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function stars(n) {
    return Array.from({ length: 5 }, function (_, i) {
      return i < n ? '\u2605' : '\u2606';
    }).join('');
  }

  function statusChip(value) {
    if (value == null || value === '—') return el('span', { class: 'chip chip-na' }, '—');
    const v = String(value).toLowerCase();
    if (v === 'pass' || v === 'yes' || v === '\u2713' || v === 'true' || v === 'exit 0') return el('span', { class: 'chip chip-pass' }, value);
    if (v === 'fail' || v === 'no' || v === '\u2717' || v === 'false' || v.indexOf('exit 1') === 0 || v.indexOf('broken') >= 0) return el('span', { class: 'chip chip-fail' }, value);
    if (v.indexOf('partial') >= 0 || v.indexOf('default') >= 0 || v.indexOf('login-only') >= 0) return el('span', { class: 'chip chip-partial' }, value);
    if (v === '0' || v === 'n/a') return el('span', { class: 'chip chip-na' }, value);
    return el('span', { class: 'chip chip-info' }, String(value));
  }

  function sevChip(sev) {
    const cls = 'chip chip-sev-' + sev;
    return el('span', { class: cls }, sev);
  }

  // Render a data table from rows + columns
  function dataTable(target, columns, rows, opts) {
    opts = opts || {};
    clear(target);
    const wrap = el('div', { class: 'table-wrap' });
    const table = el('table');
    const thead = el('thead');
    const tr = el('tr');
    columns.forEach(function (col, i) {
      const th = el('th', { class: (col.sticky ? 'col-sticky ' : '') + (col.numeric ? 'numeric' : '') + (col.wrap ? 'wrap' : '') }, col.label);
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);
    const tbody = el('tbody');
    rows.forEach(function (row) {
      const r = el('tr');
      columns.forEach(function (col, i) {
        const val = row[col.key];
        const td = el('td', { class: (col.sticky ? 'col-sticky ' : '') + (col.numeric ? 'numeric' : '') + (col.wrap ? 'wrap' : '') });
        if (col.render) {
          const rendered = col.render(val, row);
          if (rendered) td.appendChild(rendered);
        } else if (col.chip) {
          td.appendChild(statusChip(val));
        } else if (col.html) {
          td.innerHTML = val == null ? '' : String(val);
        } else {
          td.textContent = val == null ? '—' : String(val);
        }
        r.appendChild(td);
      });
      tbody.appendChild(r);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    target.appendChild(wrap);
  }

  // Branch name -> HTML href (prefix-aware so it works from any subfolder)
  function branchHref(branch) {
    const p = sitePrefix();
    return p + 'branches/' + branch + '.html';
  }

  // Compute path prefix from current location so links work from any subfolder
  // (handles repo-root Pages URLs like /resellers-inventory-mgmt/ and subdirs).
  function sitePrefix() {
    // pathname examples:
    //   /resellers-inventory-mgmt/index.html                       (root page)
    //   /resellers-inventory-mgmt/branches/build-claude-glm-5.2.html (subfolder page)
    //   /branches/build-pi-glm-5.1.html                             (local serving, subfolder)
    // Split into segments, drop the filename, then look at the directory name.
    const parts = window.location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    if (parts.length && parts[parts.length - 1].indexOf('.') >= 0) parts.pop();
    // The site root is the directory containing index.html. Files in
    // `branches/` or `specs/` are one level below root and need a `../` prefix.
    const dir = parts[parts.length - 1] || '';
    const inSubfolder = dir === 'branches' || dir === 'specs';
    return inSubfolder ? '../' : '';
  }

  // Header injection
  function renderHeader(active) {
    const p = sitePrefix();
    const links = [
      { href: p + 'index.html', label: 'Overview' },
      { href: p + 'static-eval.html', label: 'Static Eval' },
      { href: p + 'functional-eval.html', label: 'Functional Eval' },
      { href: p + 'prompt-functional-eval.html', label: 'Eval Prompt' },
      { href: p + 'specs/overview.html', label: 'Specs' },
      { href: p + 'about.html', label: 'About' }
    ];
    const header = document.querySelector('[data-site-header]');
    if (!header) return;
    clear(header);
    const container = el('div', { class: 'container' });
    const brand = el('a', { class: 'brand', href: p + 'index.html' }, [
      'Resell Inventory Manager v2',
      el('span', { class: 'badge' }, 'Build Eval')
    ]);
    const nav = el('nav', { class: 'nav' });
    links.forEach(function (l) {
      const a = el('a', { href: l.href }, l.label);
      if (l.label === active) a.className = 'active';
      nav.appendChild(a);
    });
    container.appendChild(brand);
    container.appendChild(nav);
    header.appendChild(container);
  }

  function renderFooter() {
    const footer = document.querySelector('[data-site-footer]');
    if (!footer) return;
    const meta = window.EVAL_DATA.meta;
    clear(footer);
    footer.appendChild(el('div', { class: 'container' }, [
      el('div', { class: 'footer' }, [
        el('span', { text: 'Generated from ' }, null),
        el('a', { href: meta.repoUrl }, 'wildelaw/resellers-inventory-mgmt'),
        el('span', { text: ' \u00B7 Latest static eval: ' + (meta.staticEvalDate || '—') + (meta.functionalEvalDate ? ' \u00B7 Functional eval: ' + meta.functionalEvalDate : '') })
      ])
    ]));
  }

  function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(function () {
      const original = btn.textContent;
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      setTimeout(function () {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 1500);
    });
  }

  window.EVAL = {
    el: el,
    clear: clear,
    stars: stars,
    statusChip: statusChip,
    sevChip: sevChip,
    dataTable: dataTable,
    branchHref: branchHref,
    renderHeader: renderHeader,
    renderFooter: renderFooter,
    copyToClipboard: copyToClipboard
  };

  document.addEventListener('DOMContentLoaded', function () {
    renderHeader();
    renderFooter();
  });
})();