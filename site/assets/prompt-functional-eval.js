/* Renders the prompt page: loads the prompt text and adds a copy button. */
(function () {
  'use strict';
  const { el, clear, copyToClipboard } = window.EVAL;

  document.addEventListener('DOMContentLoaded', function () {
    const pre = document.getElementById('prompt-text');
    const text = window.FUNCTIONAL_PROMPT_TEXT || '(prompt text missing — see docs/FUNCTIONAL_EVAL_PROMPT.md)';
    pre.textContent = text;

    const btn = document.getElementById('copy-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        copyToClipboard(text, btn);
      });
    }
  });
})();