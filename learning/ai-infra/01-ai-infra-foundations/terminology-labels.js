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
    if (article.textContent.indexOf(expandedTerm) !== -1) return;

    var walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    var node;

    while ((node = walker.nextNode())) {
      if (!node.nodeValue || node.nodeValue.indexOf(sourceTerm) === -1) continue;
      node.nodeValue = node.nodeValue.replace(sourceTerm, expandedTerm);
      return;
    }
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

  function explainNumbaCudaCorrection() {
    var notes = Array.prototype.slice.call(article.querySelectorAll('.markdown-alert-note'));

    notes.some(function (note) {
      var text = String(note.textContent || '');
      if (text.indexOf('原文勘误') === -1 || text.indexOf('Numba CUDA 的真实 API 语义') === -1) return false;
      if (note.querySelector('[data-numba-cuda-explanation]')) return true;

      var explanation = document.createElement('p');
      explanation.setAttribute('data-numba-cuda-explanation', '');
      explanation.innerHTML =
        '<strong>Numba-CUDA 是什么：</strong>Numba 是面向 Python 的即时编译（JIT）编译器；' +
        '<strong>Numba-CUDA</strong> 是其面向 NVIDIA GPU 的 CUDA 编程后端，可将受支持的 Python 代码编译为遵循 CUDA 执行模型的 GPU 内核和设备函数。' +
        '本节中的 <code>cuda.threadIdx.x</code>、<code>cuda.gridDim.x</code> 等属于 Numba-CUDA 的 Python API；' +
        '在 CUDA C++ 中，对应写法分别是 <code>threadIdx.x</code>、<code>gridDim.x</code>。' +
        '二者表达的是同一套线程、线程块与网格层次，只是所使用的语言接口不同。';

      note.appendChild(explanation);
      return true;
    });
  }

  function enhanceArticle() {
    expandTerm();
    insertDimensionNote();
    explainNumbaCudaCorrection();
  }

  var observer = new MutationObserver(enhanceArticle);
  observer.observe(article, { childList: true, subtree: true });
  enhanceArticle();
})();