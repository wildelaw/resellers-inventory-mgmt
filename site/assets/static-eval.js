/* Renders static-eval.html sections from EVAL_DATA */
(function () {
  'use strict';
  const { el, clear, stars, statusChip, sevChip, dataTable, branchHref } = window.EVAL;

  const SHORT = {
    'build-claude-glm-5.2': 'claude-5.2',
    'build-claude-glm-5.1': 'claude-5.1',
    'build-opencode-glm-5.1': 'opencode-5.1',
    'build-opencode-glm-5.2': 'opencode-5.2',
    'build-pi-glm-5.2': 'pi-5.2',
    'build-pi-glm-5.1': 'pi-5.1',
    'build-vscode-glm-5.2': 'vscode-5.2',
    'build-codex-glm-5.2': 'codex-5.2'
  };

  document.addEventListener('DOMContentLoaded', function () {
    const data = window.EVAL_DATA;

    // ---- §1 rankings ----
    const rk = document.getElementById('rankings');
    if (rk) {
      dataTable(rk, [
        { key: 'rank', label: '#', numeric: true },
        { key: 'branch', label: 'Branch', sticky: true, render: function (v) { return el('a', { class: 'mono', href: branchHref(v), style: 'font-size:13px;' }, v); } },
        { key: 'spec', label: 'Spec', render: function (v) { return el('span', { class: 'chip-stars' }, stars(v)); } },
        { key: 'maintain', label: 'Maintain', render: function (v) { return el('span', { class: 'chip-stars' }, stars(v)); } },
        { key: 'security', label: 'Security', render: function (v) { return el('span', { class: 'chip-stars' }, stars(v)); } },
        { key: 'complexity', label: 'Complex', render: function (v) { return el('span', { class: 'chip-stars' }, stars(v)); } },
        { key: 'testSignal', label: 'Test signal', wrap: true }
      ], data.rankings);
    }

    // ---- §2 profiles ----
    const pr = document.getElementById('profiles');
    if (pr) {
      dataTable(pr, [
        { key: 'branch', label: 'Branch', sticky: true, render: function (v) { return el('a', { class: 'mono', href: branchHref(v), style: 'font-size:12px;' }, SHORT[v] || v); }, title: 'full name in branch page' },
        { key: 'agent', label: 'Agent', wrap: true },
        { key: 'agentVersion', label: 'Agent version', wrap: true, render: function (v) { return el('code', null, v == null ? '—' : v); } },
        { key: 'model', label: 'Model' },
        { key: 'commit', label: 'Commit', render: function (v) { return el('code', null, v); } },
        { key: 'tsFiles', label: 'ts files', numeric: true },
        { key: 'tsBytes', label: 'ts bytes', numeric: true, render: function (v) { return v == null ? '—' : v.toLocaleString(); } },
        { key: 'apiRoutes', label: 'API routes', wrap: true },
        { key: 'pages', label: 'Pages', numeric: true },
        { key: 'unit', label: 'Unit', numeric: true },
        { key: 'functional', label: 'Func', numeric: true },
        { key: 'integration', label: 'Integ', numeric: true },
        { key: 'e2e', label: 'E2E', numeric: true },
        { key: 'asAny', label: 'as any', numeric: true, render: function (v) { return v == null ? '—' : (v === 0 ? el('span', { class: 'chip chip-pass' }, '0') : v); } },
        { key: 'colonAny', label: ': any', numeric: true, render: function (v) { return v == null ? '—' : (v === 0 ? el('span', { class: 'chip chip-pass' }, '0') : v); } },
        { key: 'tsIgnore', label: '@ts-ignore', numeric: true },
        { key: 'middleware', label: 'Middleware', wrap: true, render: function (v) { return el('code', null, v); } },
        { key: 'lintScript', label: 'lint script', wrap: true, render: function (v) { return el('code', null, v); } },
        { key: 'eslintConfig', label: 'eslint.config.mjs', render: function (v) { return v ? el('span', { class: 'chip chip-pass' }, 'yes') : el('span', { class: 'chip chip-fail' }, 'no'); } },
        { key: 'npmCi', label: 'npm ci', render: function (v) { return v ? statusChip('pass') : el('span', { class: 'chip chip-na' }, '—'); } },
        { key: 'tsc', label: 'tsc', render: function (v) { return v ? statusChip('pass') : el('span', { class: 'chip chip-na' }, '—'); } },
        { key: 'vitest', label: 'vitest run', wrap: true },
        { key: 'lintResult', label: 'lint result', wrap: true, render: function (v) { return el('code', null, v); } },
        { key: 'nextAuth', label: 'next-auth', render: function (v) { return el('code', null, v); } },
        { key: 'zod', label: 'zod', render: function (v) { return el('code', null, v); } },
        { key: 'bcryptApp', label: 'bcrypt cost', wrap: true },
        { key: 'sameSite', label: 'SameSite', render: function (v) { return statusChip(v); } }
      ], data.profiles);
    }

    // ---- §3 conformance ----
    const cf = document.getElementById('conformance');
    if (cf) {
      clear(cf);
      Object.keys(data.conformance).forEach(function (section) {
        cf.appendChild(el('h3', {}, section));
        const rows = data.conformance[section];
        dataTable(cf, [
          { key: 'req', label: 'Requirement', sticky: true, wrap: true },
          { key: 'claude52', label: 'claude-5.2', chip: true, render: function (v) { return statusChip(v); } },
          { key: 'claude51', label: 'claude-5.1', chip: true, render: function (v) { return statusChip(v); } },
          { key: 'opencode17174', label: 'opencode-5.1', chip: true, render: function (v) { return statusChip(v); } },
          { key: 'opencode52', label: 'opencode-5.2', chip: true, render: function (v) { return statusChip(v); } },
          { key: 'pi52', label: 'pi-5.2', chip: true, render: function (v) { return statusChip(v); } },
          { key: 'pi51', label: 'pi-5.1', chip: true, render: function (v) { return statusChip(v); } },
          { key: 'vscode52', label: 'vscode-5.2', chip: true, render: function (v) { return statusChip(v); } },
          { key: 'codex52', label: 'codex-5.2', chip: true, render: function (v) { return statusChip(v); } },
          { key: 'evidence', label: 'Evidence', wrap: true }
        ], rows);
      });
    }

    // ---- §4 type discipline + lint ----
    const td = document.getElementById('type-discipline');
    if (td) {
      dataTable(td, [
        { key: 'branch', label: 'Branch', sticky: true, render: function (v) { return el('a', { class: 'mono', href: branchHref(v), style: 'font-size:13px;' }, v); } },
        { key: 'asAny', label: 'as any', numeric: true, render: function (v) { return v === 0 ? el('span', { class: 'chip chip-pass' }, '0') : v; } },
        { key: 'colonAny', label: ': any', numeric: true, render: function (v) { return v === 0 ? el('span', { class: 'chip chip-pass' }, '0') : v; } },
        { key: 'anyGeneric', label: '<any>', numeric: true, render: function (v) { return v === 0 ? el('span', { class: 'chip chip-pass' }, '0') : v; } },
        { key: 'tsIgnore', label: '@ts-ignore', numeric: true, render: function (v) { return v === 0 ? el('span', { class: 'chip chip-pass' }, '0') : v; } },
        { key: 'total', label: 'Total', numeric: true, render: function (v) { return v === 0 ? el('span', { class: 'chip chip-pass' }, '0') : el('span', { class: 'chip chip-fail' }, String(v)); } }
      ], data.typeDiscipline);
    }
    const lo = document.getElementById('lint-outcomes');
    if (lo) {
      dataTable(lo, [
        { key: 'branch', label: 'Branch', sticky: true, render: function (v) { return el('a', { class: 'mono', href: branchHref(v), style: 'font-size:13px;' }, v); } },
        { key: 'command', label: 'lint command', render: function (v) { return el('code', null, v); } },
        { key: 'result', label: 'Result', wrap: true, render: function (v) {
          if (/exit 0/i.test(v)) return statusChip('pass');
          if (/next lint|broken|removed/i.test(v)) return statusChip('fail');
          return statusChip('partial');
        } }
      ], data.lintOutcomes);
    }

    // ---- §6 complexity ----
    const cx = document.getElementById('complexity');
    if (cx) {
      dataTable(cx, [
        { key: 'branch', label: 'Branch', sticky: true, render: function (v) { return el('a', { class: 'mono', href: branchHref(v), style: 'font-size:13px;' }, v); } },
        { key: 'tsBytes', label: 'ts/tsx bytes', numeric: true, render: function (v) { return v.toLocaleString(); } },
        { key: 'files', label: 'Files', numeric: true },
        { key: 'largestModule', label: 'Largest module', wrap: true, render: function (v) { return el('code', null, v); } },
        { key: 'extraModules', label: 'Extra modules vs spec', wrap: true }
      ], data.complexity);
    }

    // ---- §7 variances ----
    const va = document.getElementById('variances');
    if (va) {
      dataTable(va, [
        { key: 'dimension', label: 'Dimension', sticky: true, wrap: true },
        { key: 'claude52', label: 'claude-5.2', wrap: true, render: function (v) { return el('span', { class: 'mono', style: 'font-size:12px;' }, v); } },
        { key: 'claude51', label: 'claude-5.1', wrap: true, render: function (v) { return el('span', { class: 'mono', style: 'font-size:12px;' }, v); } },
        { key: 'opencode17174', label: 'opencode-5.1', wrap: true, render: function (v) { return el('span', { class: 'mono', style: 'font-size:12px;' }, v); } },
        { key: 'opencode52', label: 'opencode-5.2', wrap: true, render: function (v) { return el('span', { class: 'mono', style: 'font-size:12px;' }, v); } },
        { key: 'pi52', label: 'pi-5.2', wrap: true, render: function (v) { return el('span', { class: 'mono', style: 'font-size:12px;' }, v); } },
        { key: 'pi51', label: 'pi-5.1', wrap: true, render: function (v) { return el('span', { class: 'mono', style: 'font-size:12px;' }, v); } },
        { key: 'vscode52', label: 'vscode-5.2', wrap: true, render: function (v) { return el('span', { class: 'mono', style: 'font-size:12px;' }, v); } },
        { key: 'codex52', label: 'codex-5.2', wrap: true, render: function (v) { return el('span', { class: 'mono', style: 'font-size:12px;' }, v); } }
      ], data.variances);
    }

    // ---- §8 findings ----
    const fd = document.getElementById('findings');
    if (fd) {
      dataTable(fd, [
        { key: 'sev', label: 'Sev', render: function (v) { return sevChip(v); } },
        { key: 'branch', label: 'Branch(es)', sticky: true, wrap: true, render: function (v) {
          // split on comma to render each as a mono link if it matches a known branch
          const parts = String(v).split(',').map(function (s) { return s.trim(); });
          const frag = document.createDocumentFragment();
          parts.forEach(function (p, i) {
            if (i > 0) frag.appendChild(document.createTextNode(', '));
            const known = data.profiles.some(function (pr) { return pr.branch === p; });
            if (known) {
              frag.appendChild(el('a', { class: 'mono', href: branchHref(p), style: 'font-size:12px;' }, p));
            } else {
              frag.appendChild(el('span', { class: 'mono', style: 'font-size:12px;' }, p));
            }
          });
          return frag;
        } },
        { key: 'finding', label: 'Finding', wrap: true },
        { key: 'location', label: 'Location', wrap: true, render: function (v) { return el('code', null, v); } }
      ], data.findings);
    }

    // ---- Appendix A raw verification ----
    const rv = document.getElementById('raw-verification');
    if (rv) {
      dataTable(rv, [
        { key: 'branch', label: 'Branch', sticky: true, render: function (v) { return el('a', { class: 'mono', href: branchHref(v), style: 'font-size:13px;' }, v); } },
        { key: 'npmCi', label: 'npm ci', render: function (v) { return statusChip(v); } },
        { key: 'lint', label: 'npm run lint', wrap: true, render: function (v) { return el('code', null, v); } },
        { key: 'tsc', label: 'tsc --noEmit', render: function (v) { return el('code', null, v); } },
        { key: 'vitest', label: 'vitest run', wrap: true, render: function (v) { return el('code', null, v); } }
      ], data.rawVerification);
    }
  });
})();