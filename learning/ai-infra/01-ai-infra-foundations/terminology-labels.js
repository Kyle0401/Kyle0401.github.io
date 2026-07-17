(function () {
  'use strict';

  var article = document.getElementById('article-content');
  if (!article) return;

  var sourceTerm = '线程束调度器';
  var expandedTerm = '线程束调度器（Warp Scheduler）';
  var dimensionNotePhrases = [
    '线程被组织成线程块',
    'gridDim',
    'blockDim',
    'blockIdx',
    'threadIdx',
    '唯一的全局线程索引'
  ];

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

  function isDimensionParagraph(paragraph) {
    var text = String(paragraph.textContent || '');
    return dimensionNotePhrases.every(function (phrase) {
      return text.indexOf(phrase) !== -1;
    });
  }

  function insertDimensionNote() {
    if (article.querySelector('[data-dim-index-note]')) return;

    var paragraphs = Array.prototype.slice.call(article.querySelectorAll('p'));
    var target = null;

    paragraphs.some(function (paragraph) {
      if (!isDimensionParagraph(paragraph)) return false;
      target = paragraph;
      return true;
    });

    if (!target) return;

    var note = document.createElement('aside');
    note.className = 'markdown-alert markdown-alert-note';
    note.setAttribute('role', 'note');
    note.setAttribute('data-dim-index-note', '');
    note.innerHTML =
      '<p class="markdown-alert-title">Dim 与 Idx 的含义</p>' +
      '<p><code>Dim</code> 是 <strong>Dimension</strong>（维度或尺寸）的缩写，<code>Idx</code> 是 <strong>Index</strong>（索引）的缩写。' +
      '<code>gridDim</code>（Grid Dimension）表示网格在各个维度上的线程块数量；' +
      '<code>blockDim</code>（Block Dimension）表示每个线程块在各个维度上的线程数量。' +
      '<code>blockIdx</code> 和 <code>threadIdx</code> 则分别表示当前线程块在网格中的索引，以及当前线程在线程块中的索引，索引均从 0 开始。</p>' +
      '<p>可以简单记为：<strong>Dim 回答“总共有多少”，Idx 回答“当前在哪里”</strong>。在一维情况下，线程的全局索引通常计算为 ' +
      '<code>blockIdx.x * blockDim.x + threadIdx.x</code>。</p>';

    target.insertAdjacentElement('afterend', note);
  }

  function enhanceArticle() {
    expandTerm();
    insertDimensionNote();
  }

  var observer = new MutationObserver(enhanceArticle);
  observer.observe(article, { childList: true, subtree: true });
  enhanceArticle();
})();