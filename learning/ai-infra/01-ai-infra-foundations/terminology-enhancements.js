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

  function explainWarpParallelExecution() {
    Array.prototype.some.call(content.querySelectorAll('.doc-page-body > p'), function (paragraph) {
      if (paragraph.textContent.indexOf('在线程块中，线程被组织成每组 32 个线程的') === -1) return false;

      var insertAfter = paragraph;
      var sibling = paragraph.nextElementSibling;
      while (sibling && sibling.classList.contains('markdown-alert')) {
        if (sibling.hasAttribute('data-warp-parallel-execution-note')) return true;
        if (sibling.hasAttribute('data-simt-explanation-note')) insertAfter = sibling;
        sibling = sibling.nextElementSibling;
      }

      var note = document.createElement('aside');
      note.className = 'markdown-alert markdown-alert-note';
      note.setAttribute('role', 'note');
      note.setAttribute('data-warp-parallel-execution-note', '');

      var title = document.createElement('p');
      title.className = 'markdown-alert-title';
      title.textContent = '补充：线程束中的 32 个线程是真正并行的吗？';

      var simtSemantics = document.createElement('p');
      simtSemantics.textContent = '从 CUDA 的 SIMT 语义看，是并行的：一个线程束中当前处于活动状态的线程通常共同执行同一条指令，但每个线程使用自己的寄存器和数据，因此可以同时处理 32 份不同的数据。';

      var controlFlow = document.createElement('p');
      controlFlow.textContent = '不过，这 32 个线程并不是 32 个完全独立、能够任意执行 32 条不同指令的 CPU 核心。一个线程束通常由一条公共的线程束指令驱动；当线程选择不同的条件分支时，各条路径需要分别执行，执行某条路径时不属于该路径的线程会被暂时屏蔽，因此此时未必有 32 个线程都在进行有效计算。';

      var hardware = document.createElement('p');
      hardware.textContent = '还要区分编程模型与物理实现：32 个逻辑线程具有并行执行语义，但不保证它们对应的底层操作一定在同一个物理时钟周期开始并完成。指令的实际执行宽度、流水线阶段和所需周期取决于具体 GPU 架构。因此，最准确的理解是：线程束中的活动线程以 SIMT 方式并行处理不同数据，同时在控制流和指令发射上受线程束组织约束。';

      note.appendChild(title);
      note.appendChild(simtSemantics);
      note.appendChild(controlFlow);
      note.appendChild(hardware);
      insertAfter.insertAdjacentElement('afterend', note);
      return true;
    });
  }

  function explainInstructionIssueCycle() {
    Array.prototype.some.call(content.querySelectorAll('.doc-page-body > p'), function (paragraph) {
      if (paragraph.textContent.indexOf('每个指令发射周期中，线程束调度器') === -1) return false;

      var next = paragraph.nextElementSibling;
      if (!next || !next.hasAttribute('data-instruction-issue-cycle-note')) {
        var note = document.createElement('aside');
        note.className = 'markdown-alert markdown-alert-note';
        note.setAttribute('role', 'note');
        note.setAttribute('data-instruction-issue-cycle-note', '');

        var title = document.createElement('p');
        title.className = 'markdown-alert-title';
        title.textContent = '补充：什么是指令发射周期？';

        var definition = document.createElement('p');
        definition.textContent = '指令发射周期（instruction issue cycle）是线程束调度器进行一次调度选择，并尝试将某个已就绪线程束的下一条指令送入相应执行流水线的时机。它描述的是“发射”动作的节拍，并不等同于一条指令从开始执行到完成所需的总时间；指令进入流水线后，可能还需要多个时钟周期才能完成。';

        var scheduling = document.createElement('p');
        scheduling.textContent = '当某个线程束因数据依赖、内存访问或执行资源冲突而尚未就绪时，调度器可以在后续发射周期选择其他已就绪线程束，从而隐藏等待延迟。每个周期能够发射多少条指令、由多少个线程束调度器并行发射，则取决于具体的 GPU 架构。';

        note.appendChild(title);
        note.appendChild(definition);
        note.appendChild(scheduling);
        paragraph.insertAdjacentElement('afterend', note);
      }

      return true;
    });
  }

  function explainKernelHistoricalName() {
    Array.prototype.some.call(content.querySelectorAll('.doc-page-body > p'), function (paragraph) {
      if (paragraph.textContent.indexOf('出于历史原因，在 GPU 上被调用执行的函数称为') === -1) return false;
      if (paragraph.textContent.indexOf('启动内核') === -1) return false;

      var sibling = paragraph.nextElementSibling;
      while (sibling && sibling.classList.contains('markdown-alert')) {
        if (sibling.hasAttribute('data-kernel-history-explanation-note')) return true;
        sibling = sibling.nextElementSibling;
      }

      var note = document.createElement('aside');
      note.className = 'markdown-alert markdown-alert-note';
      note.setAttribute('role', 'note');
      note.setAttribute('data-kernel-history-explanation-note', '');

      var title = document.createElement('p');
      title.className = 'markdown-alert-title';
      title.textContent = '补充：为什么称为“内核”？';

      var explanation = document.createElement('p');
      explanation.textContent = '这里的“历史原因”是指 CUDA 沿用了在它之前已经存在的流式并行计算和 GPGPU 编程术语。例如，早期的 Brook GPU 流式编程系统就把对输入流中各个元素重复应用的并行函数称为 kernel；CUDA 延续了这一叫法，用它表示由大量 GPU 线程并行执行的设备函数。这里的 kernel 与操作系统内核不是同一概念：前者是计算函数，后者是负责管理硬件、进程和内存等系统资源的核心软件。';

      note.appendChild(title);
      note.appendChild(explanation);
      paragraph.insertAdjacentElement('afterend', note);
      return true;
    });
  }

  function explainSmRegisterAllocation() {
    Array.prototype.some.call(content.querySelectorAll('.doc-page-body > p'), function (paragraph) {
      if (paragraph.textContent.indexOf('每个 SM 都有一组在线程束之间划分的 32 位寄存器') === -1) return false;
      if (paragraph.textContent.indexOf('确定一个线程块所分配寄存器总数与共享内存总量的方法') === -1) return false;

      var sibling = paragraph.nextElementSibling;
      while (sibling && sibling.classList.contains('markdown-alert')) {
        if (sibling.hasAttribute('data-sm-register-allocation-note')) return true;
        sibling = sibling.nextElementSibling;
      }

      var note = document.createElement('aside');
      note.className = 'markdown-alert markdown-alert-note';
      note.setAttribute('role', 'note');
      note.setAttribute('data-sm-register-allocation-note', '');

      var title = document.createElement('p');
      title.className = 'markdown-alert-title';
      title.textContent = '补充：SM 的寄存器如何划分？';

      var allocation = document.createElement('p');
      allocation.textContent = '“在线程束之间划分”表示：所有驻留在同一个 SM 上的线程束共同消耗该 SM 有限的物理寄存器资源。寄存器在 CUDA 编程模型中仍然是线程私有的；由于一个线程束通常包含 32 个线程，一个线程束所需的寄存器数量来自这 32 个线程各自的寄存器需求。它并不表示每个线程束会永久获得一块大小固定且彼此相等的寄存器区域。';

      var quantity = document.createElement('p');
      quantity.textContent = '这里的“一组”没有统一的固定数量，而是取决于 GPU 架构和设备的计算能力。CUDA 设备属性 regsPerMultiprocessor 表示每个 SM 可用的 32 位寄存器数量；这里统计的是“多少个 32 位寄存器”，而不是字节数。某个内核每个线程实际使用多少寄存器则由编译器决定，并可通过编译器的资源使用报告查看。';

      var registerFile = document.createElement('p');
      registerFile.textContent = '从 CUDA 编程模型的角度看，这组 32 位寄存器就是前文所说的 SM 寄存器文件（register file），也就是供当前驻留线程和线程束分配使用的物理寄存器池。具体 GPU 的硬件实现可能还会把寄存器文件进一步分区或分 bank，但 CUDA 文档通常以每个 SM 的可用寄存器总量来描述和计算资源限制。';

      note.appendChild(title);
      note.appendChild(allocation);
      note.appendChild(quantity);
      note.appendChild(registerFile);
      paragraph.insertAdjacentElement('afterend', note);
      return true;
    });
  }

  function enhanceTerminology() {
    expandWarpAndSimt();
    explainWarpParallelExecution();
    explainInstructionIssueCycle();
    explainKernelHistoricalName();
    explainSmRegisterAllocation();
  }

  new MutationObserver(enhanceTerminology).observe(content, { childList: true, subtree: true });
  enhanceTerminology();
})();