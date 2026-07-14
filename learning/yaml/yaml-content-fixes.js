(function () {
  'use strict';

  var root = document.getElementById('article-content');
  if (!root) return;

  function findFollowingTable(heading) {
    var node = heading.nextElementSibling;
    while (node && !/^H[234]$/.test(node.tagName)) {
      if (node.matches('.table-wrap')) return node;
      if (node.matches('table')) return node;
      node = node.nextElementSibling;
    }
    return null;
  }

  function fixChompingSection() {
    var headings = root.querySelectorAll('.doc-page-body h3');
    for (var index = 0; index < headings.length; index++) {
      var heading = headings[index];
      if (heading.textContent.trim() !== '末尾换行控制') continue;
      if (heading.dataset.chompingFixed === 'true') return;

      var tableContainer = findFollowingTable(heading);
      if (!tableContainer) return;

      var table = tableContainer.matches('table') ? tableContainer : tableContainer.querySelector('table');
      if (!table) return;

      table.innerHTML = ''
        + '<thead><tr><th>写法</th><th>末尾换行效果</th><th>可理解为</th></tr></thead>'
        + '<tbody>'
        + '<tr><td><code>|</code> 或 <code>&gt;</code></td><td>默认只保留一个结尾换行</td><td><code>"内容\\n"</code></td></tr>'
        + '<tr><td><code>|-</code> 或 <code>&gt;-</code></td><td>删除所有结尾换行</td><td><code>"内容"</code></td></tr>'
        + '<tr><td><code>|+</code> 或 <code>&gt;+</code></td><td>保留原文结尾的全部空行</td><td><code>"内容\\n\\n…"</code></td></tr>'
        + '</tbody>';

      var explanation = document.createElement('div');
      explanation.className = 'callout yaml-chomping-explanation';
      explanation.innerHTML = '<p><strong>理解关键：</strong><code>|</code> 和 <code>&gt;</code>决定正文内部的换行如何处理；后面的 <code>-</code>、无符号或 <code>+</code>，只控制整个字符串末尾保留多少个不可见的换行符 <code>\\n</code>。</p>';
      tableContainer.parentNode.insertBefore(explanation, tableContainer);

      heading.dataset.chompingFixed = 'true';
      return;
    }
  }

  new MutationObserver(fixChompingSection).observe(root, { childList: true, subtree: true });
  fixChompingSection();
})();