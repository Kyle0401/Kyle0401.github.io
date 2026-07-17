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

      var next = paragraph.nextElementSibling;
      if (!next || !next.hasAttribute('data-simt-explanation-note')) {
        var note = document.createElement('aside');
        note.className = 'markdown-alert markdown-alert-note';
        note.setAttribute('role', 'note');
        note.setAttribute('data-simt-explanation-note', '');

        var title = document.createElement('p');
        title.className = 'markdown-alert-title';
        title.textContent = '补充：什么是 SIMT？';

        var model = document.createElement('p');
        model.textContent = 'SIMT（Single Instruction, Multiple Threads，单指令多线程）是 CUDA 的线程执行模型。程序员编写的是一个线程要执行的内核代码，GPU 则把多个线程组织成线程束，并由线程束调度器向其中当前处于活动状态的线程发出同一条指令。每个线程仍拥有独立的寄存器、线程索引、内存地址和执行状态，因此它们处理的数据可以不同。';

        var divergence = document.createElement('p');
        divergence.textContent = '当同一线程束中的线程遇到条件分支并选择不同路径时，会发生分支发散。GPU 通常需要分别执行各条分支路径，并在执行某条路径时暂时屏蔽不属于该路径的线程，之后再在适当位置重新汇合。因此，SIMT 并不要求所有线程始终具有完全相同的控制流，但同一线程束中的线程执行路径越一致，执行资源通常利用得越充分。';

        var distinction = document.createElement('p');
        distinction.textContent = 'SIMT 与 SIMD（Single Instruction, Multiple Data，单指令多数据）概念相近，但抽象层次不同：SIMD 通常把一条指令显式作用于一个数据向量；SIMT 则向程序员暴露多个具有独立身份和状态的线程，再由硬件以线程束为单位协同调度和执行。';

        note.appendChild(title);
        note.appendChild(model);
        note.appendChild(divergence);
        note.appendChild(distinction);
        paragraph.insertAdjacentElement('afterend', note);
      }

      return true;
    });
  }

  new MutationObserver(expandWarpAndSimt).observe(content, { childList: true, subtree: true });
  expandWarpAndSimt();
})();
