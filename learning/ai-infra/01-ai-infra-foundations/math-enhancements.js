(function () {
  'use strict';

  var content = document.getElementById('article-content');
  if (!content) return;

  var warpCountFormula = '\\text{ceil}\\left( \\frac{T}{W_{size}}, 1 \\right)';

  function renderWarpCountFormula() {
    Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body > p'), function (paragraph) {
      var normalized = paragraph.textContent.replace(/\s+/g, '');
      if (normalized.indexOf('\\text{ceil}\\left(\\frac{T}{W_{size}},1\\right)') === -1) return;

      var display = document.createElement('div');
      display.className = 'math-display';
      display.setAttribute('data-warp-count-formula', '');

      if (window.katex && typeof window.katex.render === 'function') {
        window.katex.render(warpCountFormula, display, {
          displayMode: true,
          throwOnError: false,
          strict: 'warn',
          trust: false,
          output: 'htmlAndMathml'
        });
      } else {
        display.className += ' math-error';
        display.textContent = warpCountFormula;
      }

      paragraph.replaceWith(display);
    });
  }

  new MutationObserver(renderWarpCountFormula).observe(content, { childList: true, subtree: true });
  renderWarpCountFormula();
})();
