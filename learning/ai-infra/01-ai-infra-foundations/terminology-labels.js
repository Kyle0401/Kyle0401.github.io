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

  function findDimensionParagraph() {
    var paragraphs = Array.prototype.slice.call(article.querySelectorAll('p'));
    var target = null;

    paragraphs.some(function (paragraph) {
      if (!isDimensionParagraph(paragraph)) return false;
      target = paragraph;
      return true;
    });

    return target;
  }

  function insertDimensionNote() {
    if (article.querySelector('[data-dim-index-note]')) return;

    var target = findDimensionParagraph();
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

  function findThreadBlocksAndGridParagraph() {
    var anchor = article.querySelector('#section-1-2-2-1');
    var heading = anchor && anchor.closest ? anchor.closest('h1, h2, h3, h4, h5, h6') : null;

    if (!heading) {
      Array.prototype.some.call(article.querySelectorAll('h1, h2, h3, h4, h5, h6'), function (candidate) {
        if (String(candidate.textContent || '').indexOf('线程块和网格') === -1) return false;
        heading = candidate;
        return true;
      });
    }

    if (!heading) return null;

    var headingLevel = Number(heading.tagName.slice(1));
    var node = heading.nextElementSibling;

    while (node) {
      if (/^H[1-6]$/.test(node.tagName)) {
        var nextLevel = Number(node.tagName.slice(1));
        if (nextLevel <= headingLevel) break;
      }

      if (node.tagName === 'P') return node;

      var paragraph = node.querySelector && node.querySelector('p');
      if (paragraph) return paragraph;
      node = node.nextElementSibling;
    }

    return null;
  }

  function insertCudaThreadMeaningNote() {
    var target = findThreadBlocksAndGridParagraph();
    if (!target) return;

    var existing = article.querySelector('[data-cuda-thread-meaning-note]');
    if (existing) {
      if (existing.previousElementSibling === target) return;
      existing.remove();
    }

    var note = document.createElement('aside');
    note.className = 'markdown-alert markdown-alert-note';
    note.setAttribute('role', 'note');
    note.setAttribute('data-cuda-thread-meaning-note', '');

    var title = document.createElement('p');
    title.className = 'markdown-alert-title';
    title.textContent = '补充：这里的“线程”是什么？';

    var distinction = document.createElement('p');
    distinction.textContent = '这里的线程不是由操作系统单独创建和调度的 CPU 线程，而是 CUDA 编程模型中的 GPU 逻辑线程。它不是独立的进程或操作系统线程对象；一次内核启动会按照网格和线程块配置批量产生大量 CUDA 线程，再由 GPU 将它们组织成线程束并调度到 SM 上执行。';

    var lifetime = document.createElement('p');
    lifetime.textContent = '一个 CUDA 线程对应某一次内核启动中的一个独立逻辑执行实例。它从内核函数入口开始，根据自己的 blockIdx 和 threadIdx 处理相应数据，并在该内核实例执行结束时终止。同一个内核函数被再次启动时，会产生一批新的 CUDA 线程。';

    var instruction = document.createElement('p');
    instruction.textContent = '线程也不是针对某一条指令而言的。一个线程在其生命周期内会执行内核中的许多语句和机器指令，也可以经历循环、条件分支以及设备函数调用；指令只是该线程执行内核代码过程中的一个步骤。';

    note.appendChild(title);
    note.appendChild(distinction);
    note.appendChild(lifetime);
    note.appendChild(instruction);
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
    insertCudaThreadMeaningNote();
    explainNumbaCudaCorrection();
  }

  var observer = new MutationObserver(enhanceArticle);
  observer.observe(article, { childList: true, subtree: true });
  enhanceArticle();
})();