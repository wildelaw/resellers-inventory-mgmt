/* Renders functional-eval.html. Shows pending state until data.functional.status === 'complete'. */
(function () {
  'use strict';
  const { el, clear, statusChip, dataTable, branchHref } = window.EVAL;

  document.addEventListener('DOMContentLoaded', function () {
    const data = window.EVAL_DATA;
    const f = data.functional;

    // status banner
    const banner = document.getElementById('status-banner');
    if (f.status === 'pending') {
      banner.appendChild(el('div', { class: 'pending-banner' }, [
        el('div', { class: 'spinner' }),
        el('div', {}, [
          el('strong', {}, 'Functional evaluation pending.'),
          el('p', { class: 'dim', style: 'margin:4px 0 0;' }, 'Run the prompt on the Eval Prompt page to populate Playwright E2E results across all six builds.')
        ])
      ]));
      renderPending();
    } else if (f.status === 'partial') {
      banner.appendChild(el('div', { class: 'callout warn' }, [
        el('strong', {}, 'Partial: functional evaluation in progress.'),
        el('p', { class: 'dim' }, 'Some branches evaluated; ' + (f.dateCompleted ? 'last updated ' + f.dateCompleted : '') + '.')
      ]));
      renderResults();
    } else {
      banner.appendChild(el('div', { class: 'callout' }, [
        el('strong', {}, 'Functional evaluation complete.'),
        el('p', { class: 'dim' }, 'Date completed: ' + (f.dateCompleted || 'unknown') + '.')
      ]));
      renderResults();
    }

    function renderPending() {
      // e2e flows list
      const ef = document.getElementById('e2e-flows');
      if (ef) {
        dataTable(ef, [
          { key: 'id', label: 'Flow ID', sticky: true, render: function (v) { return el('code', null, v); } },
          { key: 'file', label: 'Spec file', render: function (v) { return el('code', null, v); } },
          { key: 'blurb', label: 'What it tests', wrap: true }
        ], data.e2eFlows);
      }
      // regression scenarios list
      const rs = document.getElementById('regression-scenarios');
      if (rs) {
        dataTable(rs, [
          { key: 'id', label: 'ID', sticky: true, render: function (v) { return el('code', null, v); } },
          { key: 'scenario', label: 'Scenario', wrap: true },
          { key: 'category', label: 'Category' },
          { key: 'priority', label: 'Priority', render: function (v) { return el('span', { class: 'chip chip-' + (v === 'Critical' ? 'fail' : v === 'High' ? 'partial' : 'info') }, v); } }
        ], data.regressionScenarios);
      }
    }

    function renderResults() {
      // hide pending section, show result sections
      const pending = document.getElementById('pending-section');
      if (pending) pending.hidden = true;
      ['methodology-section', 'cross-section', 'regression-section', 'aggregate-section', 'effort-section', 'functional-winner-section', 'per-branch-section'].forEach(function (id) {
        const s = document.getElementById(id);
        if (s) s.hidden = false;
      });

      // methodology
      const meth = document.getElementById('methodology');
      if (f.methodology) {
        clear(meth);
        meth.appendChild(el('p', { class: 'dim', style: 'white-space:pre-wrap;' }, f.methodology));
      }

      // cross-branch E2E flow matrix
      const cm = document.getElementById('cross-matrix');
      if (cm && f.branches) {
        const branches = Object.keys(f.branches);
        const rows = data.e2eFlows.map(function (flow) {
          const row = { id: flow.id, blurb: flow.blurb };
          branches.forEach(function (b) {
            const fr = (f.branches[b].flows || []).find(function (x) { return x.id === flow.id; });
            row[b] = fr ? fr.status : '—';
          });
          return row;
        });
        const cols = [{ key: 'id', label: 'Flow', sticky: true, render: function (v) { return el('code', null, v); } }, { key: 'blurb', label: 'What it tests', wrap: true }];
        branches.forEach(function (b) {
          cols.push({ key: b, label: b.replace('build-', ''), render: function (v) { return statusChip(v); } });
        });
        dataTable(cm, cols, rows);
      }

      // regression matrix
      const rm = document.getElementById('regression-matrix');
      if (rm && f.branches) {
        const branches = Object.keys(f.branches);
        const rows = data.regressionScenarios.map(function (reg) {
          const row = { id: reg.id, scenario: reg.scenario };
          branches.forEach(function (b) {
            const rr = (f.branches[b].regressions || []).find(function (x) { return x.id === reg.id; });
            row[b] = rr ? rr.status : '—';
          });
          return row;
        });
        const cols = [{ key: 'id', label: 'ID', sticky: true, render: function (v) { return el('code', null, v); } }, { key: 'scenario', label: 'Scenario', wrap: true }];
        branches.forEach(function (b) {
          cols.push({ key: b, label: b.replace('build-', ''), render: function (v) { return statusChip(v); } });
        });
        dataTable(rm, cols, rows);
      }

      // aggregate findings
      const af = document.getElementById('aggregate-findings');
      if (af) {
        if (f.aggregateFindings && f.aggregateFindings.length) {
          dataTable(af, [
            { key: 'sev', label: 'Sev', render: function (v) { return window.EVAL.sevChip(v); } },
            { key: 'branch', label: 'Branch', sticky: true, render: function (v) { return el('a', { class: 'mono', href: branchHref(v), style: 'font-size:12px;' }, v); } },
            { key: 'finding', label: 'Finding', wrap: true },
            { key: 'flowId', label: 'Flow' },
            { key: 'scenarioId', label: 'Scenario' }
          ], f.aggregateFindings);
        } else {
          af.appendChild(el('p', { class: 'dim' }, 'No aggregate findings recorded.'));
        }
      }

      // effort summary
      const es = document.getElementById('effort-summary');
      if (es) {
        if (f.effortSummary && f.effortSummary.length) {
          dataTable(es, [
            { key: 'branch', label: 'Branch', sticky: true, render: function (v) { return el('a', { class: 'mono', href: branchHref(v), style: 'font-size:13px;' }, v); } },
            { key: 'total', label: 'Total failures', numeric: true },
            { key: 'S', label: 'S (<15m)', numeric: true },
            { key: 'M', label: 'M (<60m)', numeric: true },
            { key: 'L', label: 'L (<240m)', numeric: true },
            { key: 'XL', label: 'XL (>240m)', numeric: true },
            { key: 'estimatedHours', label: 'Est. hours', numeric: true }
          ], f.effortSummary);
        } else {
          es.appendChild(el('p', { class: 'dim' }, 'No effort summary recorded.'));
        }
      }

      // winner
      const fw = document.getElementById('functional-winner');
      if (fw) {
        clear(fw);
        if (f.functionalWinner) {
          fw.appendChild(el('h3', { style: 'border:0;padding:0;margin-bottom:6px;' }, [
            'Functional winner: ',
            el('span', { class: 'mono' }, f.functionalWinner)
          ]));
        }
        if (f.recommendation) {
          fw.appendChild(el('p', { class: 'dim' }, f.recommendation));
        }
      }

      // per-branch links
      const pbl = document.getElementById('per-branch-links');
      if (pbl) {
        clear(pbl);
        Object.keys(f.branches).forEach(function (b) {
          const card = el('div', { class: 'card' });
          card.appendChild(el('h3', { style: 'margin-top:0;' }, [el('a', { href: branchHref(b) }, b)]));
          const bData = f.branches[b];
          if (bData.functionalScore != null) {
            card.appendChild(el('p', {}, 'Functional score: ' + bData.functionalScore + '/100'));
          }
          if (bData.summary) {
            card.appendChild(el('p', { class: 'dim', style: 'font-size:13px;' }, bData.summary));
          }
          pbl.appendChild(card);
        });
      }
    }
  });
})();