/* Renders index.html sections from EVAL_DATA */
(function () {
  'use strict';
  const { el, clear, stars, statusChip, dataTable, branchHref } = window.EVAL;

  document.addEventListener('DOMContentLoaded', function () {
    const data = window.EVAL_DATA;
    const completed = data.rankings;

    // ---- meta row: static eval date, functional status, branch counts ----
    const sed = document.querySelector('[data-static-eval-date]');
    if (sed) sed.textContent = data.meta.staticEvalDate || '—';

    const bc = document.querySelector('[data-branch-counts]');
    if (bc) {
      const profiles = data.profiles || [];
      const attempted = profiles.length;
      const incomplete = profiles.filter(function (p) { return p.branch === 'build-ibm-bob' || (p.note && /incomplete|did not complete/i.test(p.note)); }).length;
      const completedCount = attempted - incomplete;
      bc.textContent = attempted + ' attempted, ' + completedCount + ' completed, ' + incomplete + ' incomplete';
    }
    const bcCap = document.querySelectorAll('[data-branch-count-completed]');
    if (bcCap.length) {
      const profiles = data.profiles || [];
      const incomplete = profiles.filter(function (p) { return p.branch === 'build-ibm-bob' || (p.note && /incomplete|did not complete/i.test(p.note)); }).length;
      const completedCount = profiles.length - incomplete;
      const word = completedCount === 1 ? 'One' : completedCount === 2 ? 'Two' : completedCount === 3 ? 'Three' : completedCount === 4 ? 'Four' : completedCount === 5 ? 'Five' : completedCount === 6 ? 'Six' : completedCount === 7 ? 'Seven' : completedCount === 8 ? 'Eight' : completedCount === 9 ? 'Nine' : completedCount === 10 ? 'Ten' : String(completedCount);
      bcCap.forEach(function (node) { node.textContent = word; });
    }
    const bcLc = document.querySelectorAll('[data-branch-count-completed-lc]');
    if (bcLc.length) {
      const profiles = data.profiles || [];
      const incomplete = profiles.filter(function (p) { return p.branch === 'build-ibm-bob' || (p.note && /incomplete|did not complete/i.test(p.note)); }).length;
      const completedCount = profiles.length - incomplete;
      const word = completedCount === 1 ? 'one' : completedCount === 2 ? 'two' : completedCount === 3 ? 'three' : completedCount === 4 ? 'four' : completedCount === 5 ? 'five' : completedCount === 6 ? 'six' : completedCount === 7 ? 'seven' : completedCount === 8 ? 'eight' : completedCount === 9 ? 'nine' : completedCount === 10 ? 'ten' : String(completedCount);
      bcLc.forEach(function (node) { node.textContent = word; });
    }

    // ---- functional status badge ----
    const fs = document.querySelector('[data-functional-status]');
    if (fs) {
      const status = data.functional.status;
      fs.textContent = status === 'pending' ? 'pending — run the eval prompt' : (data.functional.dateCompleted || status);
      if (status === 'complete') fs.style.color = 'var(--green)';
      else if (status === 'partial') fs.style.color = 'var(--yellow)';
    }

    // ---- recommendation ----
    // Surface the baseline's rank #1 + composite so the "recommended baseline" label
    // is backed by a visible score (per BUILD_EVAL_PROMPT.md rev 3).
    const recB = document.querySelector('[data-rec-branch]');
    const recS = document.querySelector('[data-rec-summary]');
    if (recB) recB.textContent = data.recommendation.baseline;
    if (recS) {
      const baseBranch = data.recommendation.baseline;
      const rk = (data.rankings || []).find(function (r) { return r.branch === baseBranch; });
      const prefix = rk ? 'Static rank #' + rk.rank + ' · composite ' + (rk.composite != null ? rk.composite.toFixed(2) : '—') + '. ' : '';
      recS.textContent = prefix + data.recommendation.summary;
    }

    // ---- leaderboard ----
    const lb = document.getElementById('leaderboard');
    if (lb) {
      // attach functional score from data.functional.branches to each ranking row
      const rows = completed.map(function (r) {
        const fb = data.functional && data.functional.branches && data.functional.branches[r.branch];
        return Object.assign({}, r, {
          functionalScore: fb ? fb.functionalScore : (r.functionalScore != null ? r.functionalScore : null)
        });
      });
      dataTable(lb, [
        { key: 'rank', label: 'Rank', numeric: true },
        {
          key: 'branch', label: 'Branch', sticky: true,
          render: function (v) {
            return el('a', { class: 'mono', href: branchHref(v), style: 'font-size:13px;' }, v);
          }
        },
        { key: 'spec', label: 'Spec', render: function (v) { return el('span', { class: 'chip-stars', title: v + '/5' }, stars(v)); } },
        { key: 'maintain', label: 'Maintain', render: function (v) { return el('span', { class: 'chip-stars' }, stars(v)); } },
        { key: 'security', label: 'Security', render: function (v) { return el('span', { class: 'chip-stars' }, stars(v)); } },
        { key: 'complexity', label: 'Complexity', render: function (v) { return el('span', { class: 'chip-stars' }, stars(v)); } },
        { key: 'testSignalStar', label: 'Test sig', render: function (v) { return el('span', { class: 'chip-stars', title: (v || 0) + '/5' }, stars(v || 0)); } },
        {
          key: 'functionalScore', label: 'Functional', numeric: true,
          render: function (v) {
            if (v == null) return el('span', { class: 'chip chip-na' }, '—');
            const cls = v >= 90 ? 'chip chip-pass' : v >= 60 ? 'chip chip-partial' : 'chip chip-fail';
            return el('span', { class: cls, title: v + '/100 E2E' }, v + '/100');
          }
        },
        {
          key: 'composite', label: 'Composite', numeric: true,
          render: function (v) {
            if (v == null) return el('span', { class: 'chip chip-na' }, '—');
            return el('span', { class: 'chip chip-info', title: 'weighted aggregate (0.20·spec + 0.20·maintain + 0.20·security + 0.15·complexity + 0.10·testSig + 0.15·functional/20)' }, v.toFixed(2));
          }
        },
        { key: 'testSignal', label: 'Test signal (raw)', wrap: true }
      ], rows);
    }

    // ---- dimension winners ----
    // Each card surfaces the winner's star/score on that dimension so the "winner" label
    // is backed by a visible score (per BUILD_EVAL_PROMPT.md rev 3 — no rank without its score).
    const w = document.getElementById('winners');
    if (w) {
      clear(w);
      const byBranch = {};
      (data.rankings || []).forEach(function (r) { byBranch[r.branch] = r; });
      const dimKey = { 'Spec conformance': 'spec', 'Maintainability': 'maintain', 'Vulnerabilities': 'security', 'Complexity': 'complexity', 'Test signal': 'testSignalStar' };
      data.dimensionWinners.forEach(function (d) {
        const card = el('div', { class: 'winner-card' });
        card.appendChild(el('div', { class: 'dim' }, d.dimension));
        card.appendChild(el('div', { class: 'winner' }, [
          el('a', { href: branchHref(d.winner) }, d.winner)
        ]));
        const k = dimKey[d.dimension];
        const wr = byBranch[d.winner];
        if (k && wr && wr[k] != null) {
          card.appendChild(el('div', { class: 'score', style: 'font-size:12px; margin-top:2px;' }, [
            stars(wr[k]),
            el('span', { class: 'dim', style: 'margin-left:6px;' }, wr[k] + '/5')
          ]));
        }
        card.appendChild(el('div', { class: 'note' }, d.note));
        w.appendChild(card);
      });
    }

    // ---- test signal bar chart ----
    const tc = document.getElementById('test-chart');
    if (tc) {
      clear(tc);
      // parse pass counts from rankings.testSignal strings like "23 files / 186 tests / lint exit 0"
      const chart = el('div', { class: 'bar-chart' });
      const maxTests = 186; // claude-5.2
      completed.forEach(function (r) {
        const m = r.testSignal.match(/(\d+)\s*tests/);
        const n = m ? parseInt(m[1], 10) : 0;
        const lintOk = /lint exit 0/i.test(r.testSignal);
        const lintBroken = /lint script broken|next lint/i.test(r.testSignal) && !lintOk;
        const row = el('div', { class: 'bar-row ' + (lintOk ? 'bar-pass' : lintBroken ? 'bar-fail' : 'bar-warn') });
        row.appendChild(el('div', { class: 'bar-label' }, [
          el('a', { href: branchHref(r.branch) }, r.branch)
        ]));
        const track = el('div', { class: 'bar-track' });
        const fill = el('div', { class: 'bar-fill', style: 'width:' + (n / maxTests * 100) + '%' });
        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(el('div', { class: 'bar-value' }, n + ' tests'));
        chart.appendChild(row);
      });
      tc.appendChild(chart);
      tc.appendChild(el('p', { class: 'dim', style: 'margin-top:12px; font-size:12px;' }, 'Green bar = lint clean · Red = lint pipeline broken · Yellow = lint emits errors'));
    }

    // ---- branches list ----
    const bl = document.getElementById('branches-list');
    if (bl) {
      clear(bl);
      data.profiles.forEach(function (p) {
        const card = el('div', { class: 'card' });
        const title = el('h3', { style: 'margin-top:0;' });
        title.appendChild(el('a', { href: branchHref(p.branch) }, p.branch));
        if (p.branch === 'build-ibm-bob') {
          title.appendChild(el('span', { class: 'chip chip-na', style: 'margin-left:8px;' }, 'incomplete'));
        }
        card.appendChild(title);
        card.appendChild(el('p', { class: 'dim', style: 'font-size:13px; margin-bottom:12px;' }, p.agent + (p.agentVersion && p.agentVersion !== '—' ? ' ' + p.agentVersion : '') + ' · ' + p.model + (p.commit !== '—' ? ' · ' + p.commit : '')));
        if (p.note) {
          card.appendChild(el('p', { class: 'dim', style: 'font-size:13px;' }, p.note));
        } else {
          const stats = el('div', { class: 'kv-list' });
          const fb = data.functional && data.functional.branches && data.functional.branches[p.branch];
          const fScore = fb ? fb.functionalScore : null;
          [
            ['API routes', p.apiRoutes], ['Pages', p.pages],
            ['Unit tests', p.unit], ['Functional tests', p.functional],
            ['Integration tests', p.integration], ['E2E specs', p.e2e],
            ['Functional score', fScore != null ? fScore + '/100' : '—'],
            ['ts/tsx files', p.tsFiles], ['ts/tsx bytes', p.tsBytes ? p.tsBytes.toLocaleString() : '—']
          ].forEach(function (kv) {
            stats.appendChild(el('div', { class: 'kv' }, [
              el('span', { class: 'k' }, kv[0]),
              el('span', { class: 'v' }, String(kv[1] == null ? '—' : kv[1]))
            ]));
          });
          card.appendChild(stats);
        }
        bl.appendChild(card);
      });
    }
  });
})();