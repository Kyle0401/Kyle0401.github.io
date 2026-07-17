(function () {
  'use strict';

  var content = document.getElementById('article-content');
  if (!content) return;

  function expandWarpAndSimt() {
    Array.prototype.some.call(content.querySelectorAll('.doc-page-body > p'), function (paragraph) {
      if (paragraph.textContent.indexOf('在线程块中，线程被组织成每组 32 个线程的') === -1) return false;

      var emphasizedTerms = paragraph.querySelectorAll('em');
      var warpExpanded = false;
      var simtExpanded = false;

      Array.prototype.forEach.call(emphasizedTerms, function (term) {
        var label = term.textContent.trim();

        if (!warpExpanded && label === '线程束') {
          var nextWarpNode = term.nextSibling;
          var nextWarpText = nextWarpNode && nextWarpNode.nodeType === Node.TEXT_NODE ? nextWarpNode.nodeValue : '';
          if (nextWarpText.indexOf('（warp）') !== 0) {
            term.insertAdjacentText('afterend', '（warp）');
          }
          warpExpanded = true;
        }

        if (!simtExpanded && label === '单指令多线程') {
          var node = term.nextSibling;
          while (node) {
            if (node.nodeType === Node.TEXT_NODE && node.nodeValue.indexOf('（SIMT）') !== -1) {
              node.nodeValue = node.nodeValue.replace(
                '（SIMT）',
                '（Single Instruction, Multiple Threads，SIMT）'
              );
              simtExpanded = true;
              break;
            }
            if (node.nodeType === Node.ELEMENT_NODE) break;
            node = node.nextSibling;
          }
        }
      });

      return true;
    });
  }

  new MutationObserver(expandWarpAndSimt).observe(content, { childList: true, subtree: true });
  expandWarpAndSimt();
})();
