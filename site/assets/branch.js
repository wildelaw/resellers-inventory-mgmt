/* Renders any per-branch detail page. Reads branch name from body[data-branch]. */
(function () {
  'use strict';
  const { el, clear, stars, statusChip, sevChip, dataTable, branchHref } = window.EVAL;

  // map branch -> column key in conformance rows
  function conformanceKey(branch) {
    return {
      'build-claude-glm-5.2': 'claude52',
      'build-claude-glm-5.1': 'claude51',
      'build-opencode-glm-5.1': 'opencode17174',
      'build-opencode-glm-5.2': 'opencode52',
      'build-pi-glm-5.2': 'pi52',
      'build-pi-glm-5.1': 'pi51',
      'build-vscode-glm-5.2': 'vscode52'
    }[branch];
  }

  document.addEventListener('DOMContentLoaded', function () {
    const data = window.EVAL_DATA;
    const branch = document.body.getAttribute('data-branch');
    if (!branch) return;
    const profile = data.profiles.find(function (p) { return p.branch === branch; });
    const ranking = data.rankings.find(function (r) { return r.branch === branch; });
    const key = conformanceKey(branch);

    // title + subtitle
    document.getElementById('branch-title').textContent = branch;
    const subtitle = document.getElementById('branch-subtitle');
    if (profile) {
      subtitle.textContent = profile.agent + (profile.agentVersion && profile.agentVersion !== '—' ? ' ' + profile.agentVersion : '') + ' · ' + profile.model + (profile.commit && profile.commit !== '—' ? ' · commit ' + profile.commit : '');
    }

    // stats
    const stats = document.getElementById('branch-stats');
    if (profile && ranking) {
      clear(stats);
      [
        ['Rank', '#' + ranking.rank],
        ['Spec', stars(ranking.spec)],
        ['Maintain', stars(ranking.maintain)],
        ['Security', stars(ranking.security)],
        ['Complexity', stars(ranking.complexity)],
        ['Vitest', profile.vitest || '—'],
        ['Lint', profile.lintResult || '—']
      ].forEach(function (kv) {
        const s = el('div', { class: 'stat' });
        s.appendChild(el('span', { class: 'value' }, kv[1]));
        s.appendChild(el('span', { class: 'label' }, kv[0]));
        stats.appendChild(s);
      });
    }

    // profile kv
    const pf = document.getElementById('profile');
    if (profile) {
      if (branch === 'build-ibm-bob') {
        pf.appendChild(el('div', { class: 'callout warn' }, [
          el('p', {}, profile.note || 'Build did not complete; agent exhausted its usage quota on the lowest Pro plan mid-build. Branch remains in the repository for reference but is excluded from scoring and ranking.')
        ]));
      } else {
        const rows = [
          ['Agent', profile.agent], ['Agent version', profile.agentVersion || '—'], ['Model', profile.model], ['Commit', profile.commit],
          ['ts/tsx files', profile.tsFiles], ['ts/tsx bytes', profile.tsBytes ? profile.tsBytes.toLocaleString() : '—'],
          ['API routes', profile.apiRoutes], ['Pages', profile.pages],
          ['Unit tests', profile.unit], ['Functional tests', profile.functional],
          ['Integration tests', profile.integration], ['E2E specs', profile.e2e],
          ['as any', profile.asAny], [': any', profile.colonAny], ['@ts-ignore', profile.tsIgnore],
          ['Middleware', profile.middleware], ['lint script', profile.lintScript],
          ['eslint.config.mjs', profile.eslintConfig ? 'yes' : 'no'],
          ['npm ci', profile.npmCi ? 'exit 0' : '—'], ['tsc --noEmit', profile.tsc ? 'exit 0 (clean)' : '—'],
          ['vitest run', profile.vitest], ['lint result', profile.lintResult],
          ['Extra deps', profile.extraDeps], ['next-auth', profile.nextAuth], ['zod', profile.zod],
          ['bcrypt cost', profile.bcryptApp], ['SameSite', profile.sameSite]
        ];
        const kvList = el('div', { class: 'kv-list' });
        rows.forEach(function (r) {
          kvList.appendChild(el('div', { class: 'kv' }, [
            el('span', { class: 'k' }, r[0]),
            el('span', { class: 'v' }, String(r[1] == null ? '—' : r[1]))
          ]));
        });
        clear(pf);
        pf.appendChild(kvList);
      }
    }

    // conformance for this branch
    const cf = document.getElementById('conformance');
    if (cf && key) {
      clear(cf);
      Object.keys(data.conformance).forEach(function (section) {
        cf.appendChild(el('h3', {}, section));
        const rows = data.conformance[section].map(function (r) {
          return { req: r.req, status: r[key], evidence: r.evidence };
        });
        dataTable(cf, [
          { key: 'req', label: 'Requirement', sticky: true, wrap: true },
          { key: 'status', label: 'Result', render: function (v) { return statusChip(v); } },
          { key: 'evidence', label: 'Evidence', wrap: true }
        ], rows);
      });
    } else if (cf) {
      cf.appendChild(el('p', { class: 'dim' }, 'Conformance data not available for this branch.'));
    }

    // findings for this branch (substring match since finding.branch may list multiple)
    const fd = document.getElementById('findings');
    if (fd) {
      const branchFindings = data.findings.filter(function (f) {
        return f.branch.indexOf(branch) >= 0 || f.branch.indexOf(branch.replace('build-', '')) >= 0;
      });
      if (branchFindings.length === 0) {
        fd.appendChild(el('div', { class: 'callout' }, [
          el('p', {}, 'No findings recorded for this branch in the static analysis. ')
        ]));
      } else {
        dataTable(fd, [
          { key: 'sev', label: 'Sev', render: function (v) { return sevChip(v); } },
          { key: 'finding', label: 'Finding', wrap: true },
          { key: 'location', label: 'Location', wrap: true, render: function (v) { return el('code', null, v); } }
        ], branchFindings);
      }
    }

    // functional evaluation for this branch
    const fe = document.getElementById('functional');
    if (fe) {
      renderFunctional(fe, branch, data);
    }
  });

  function renderFunctional(target, branch, data) {
    clear(target);
    const f = data.functional;
    if (f.status === 'pending' || !f.branches[branch]) {
      target.appendChild(el('div', { class: 'pending-banner' }, [
        el('div', { class: 'spinner' }),
        el('div', {}, [
          el('strong', {}, 'Functional evaluation pending.'),
          el('p', { class: 'dim', style: 'margin:4px 0 0;' }, 'Run the prompt on the ' + 'Eval Prompt' + ' page to populate Playwright E2E results for this branch.')
        ])
      ]));
      return;
    }
    const b = f.branches[branch];
    if (f.status !== 'complete' || !b.flows || b.flows.length === 0) {
      target.appendChild(el('p', { class: 'dim' }, 'Functional evaluation not yet recorded for this branch.'));
      return;
    }

    // summary
    if (b.summary) {
      target.appendChild(el('div', { class: 'callout' }, [el('p', {}, b.summary)]));
    }
    if (b.functionalScore != null) {
      const score = el('div', { class: 'stat-row' });
      score.appendChild(el('div', { class: 'stat' }, [el('span', { class: 'value' }, String(b.functionalScore) + '/100'), el('span', { class: 'label' }, 'Functional score')]));
      if (b.bootMode) score.appendChild(el('div', { class: 'stat' }, [el('span', { class: 'value', style: 'font-size:18px;' }, b.bootMode), el('span', { class: 'label' }, 'Boot mode')]));
      target.appendChild(score);
    }

    // E2E flow results
    target.appendChild(el('h3', {}, 'E2E flow results'));
    if (b.flows && b.flows.length) {
      dataTable(target, [
        { key: 'id', label: 'Flow', sticky: true, render: function (v) { return el('code', null, v); } },
        { key: 'status', label: 'Status', render: function (v) { return statusChip(v); } },
        { key: 'attempts', label: 'Attempts', numeric: true },
        { key: 'error', label: 'Error / note', wrap: true }
      ], b.flows);
    } else {
      target.appendChild(el('p', { class: 'dim' }, 'No E2E flow results recorded.'));
    }

    // regression scenarios
    target.appendChild(el('h3', {}, 'Regression scenarios (REG-01..REG-18)'));
    if (b.regressions && b.regressions.length) {
      dataTable(target, [
        { key: 'id', label: 'ID', sticky: true, render: function (v) { return el('code', null, v); } },
        { key: 'scenario', label: 'Scenario', wrap: true },
        { key: 'category', label: 'Category' },
        { key: 'priority', label: 'Priority', render: function (v) { return el('span', { class: 'chip chip-' + (v === 'Critical' ? 'fail' : v === 'High' ? 'partial' : 'info') }, v); } },
        { key: 'status', label: 'Result', render: function (v) { return statusChip(v); } }
      ], b.regressions);
    } else {
      target.appendChild(el('p', { class: 'dim' }, 'No regression results recorded.'));
    }

    // failures with effort + remediation prompts
    target.appendChild(el('h3', {}, 'Failures & remediation prompts'));
    if (b.failures && b.failures.length) {
      b.failures.forEach(function (fail) {
        const card = el('div', { class: 'card' });
        card.appendChild(el('h4', { style: 'margin:0 0 6px;' }, (fail.flowId || fail.scenarioId || 'unknown') + ' — ' + (fail.error || 'failed')));
        if (fail.effort) {
          card.appendChild(el('p', { class: 'dim', style: 'font-size:13px; margin-bottom:8px;' }, 'Estimated effort: ' + fail.effort));
        }
        if (fail.prompt) {
          card.appendChild(el('div', { class: 'fix-prompt' }, fail.prompt));
        }
        target.appendChild(card);
      });
    } else {
      target.appendChild(el('div', { class: 'callout' }, [el('p', {}, 'No failures recorded for this branch. All E2E flows passed.')]));
    }
  }
})();