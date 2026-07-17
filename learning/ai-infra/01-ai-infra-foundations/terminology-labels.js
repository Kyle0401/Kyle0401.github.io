(function () {
  'use strict';

  var article = document.getElementById('article-content');
  if (!article) return;

  var sourceTerm = '线程束调度器';
  var expandedTerm = '线程束调度器（Warp Scheduler）';

  function expandTerm() {
    var walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    var nodes = [];
    var node;

    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.indexOf(sourceTerm) !== -1 && node.nodeValue.indexOf(expandedTerm) === -1) {
        nodes.push(node);
      }
    }

    nodes.forEach(function (textNode) {
      textNode.nodeValue = textNode.nodeValue.replace(sourceTerm, expandedTerm);
    });
  }

  var observer = new MutationObserver(expandTerm);
  observer.observe(article, { childList: true, subtree: true });
  expandTerm();
})();
