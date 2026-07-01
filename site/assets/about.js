/* Renders the agents table on about.html */
(function () {
  'use strict';
  const { el, statusChip, branchHref } = window.EVAL;

  document.addEventListener('DOMContentLoaded', function () {
    const data = window.EVAL_DATA;
    const tbody = document.getElementById('agents-table');
    if (!tbody) return;
    data.profiles.forEach(function (p) {
      const tr = el('tr');
      tr.appendChild(el('td', {}, [el('a', { class: 'mono', href: branchHref(p.branch), style: 'font-size:13px;' }, p.branch)]));
      tr.appendChild(el('td', {}, p.agent));
      tr.appendChild(el('td', {}, p.model));
      const status = p.branch === 'build-ibm-bob' ? 'incomplete' : (p.tsc ? 'complete' : 'incomplete');
      tr.appendChild(el('td', {}, [statusChip(status === 'complete' ? 'pass' : 'fail')]));
      tbody.appendChild(tr);
    });
  });
})();