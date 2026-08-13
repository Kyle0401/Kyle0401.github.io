(function () {
  'use strict';
  var rootElement = document.documentElement;
  var themeToggle = document.getElementById('theme-toggle');
  var themeToggleIcon = document.getElementById('theme-toggle-icon');
  var themeToggleLabel = document.getElementById('theme-toggle-label');
  var themeColor = document.getElementById('theme-color');
  var content = document.getElementById('article-content');

  function currentTheme() {
    return rootElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function syncThemeControls(theme) {
    var isDark = theme === 'dark';
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.setAttribute('aria-label', isDark ? '切换到日间模式' : '切换到夜览模式');
      themeToggle.setAttribute('title', isDark ? '切换到日间模式' : '切换到夜览模式');
    }
    if (themeToggleIcon) themeToggleIcon.textContent = isDark ? '☀' : '☾';
    if (themeToggleLabel) themeToggleLabel.textContent = isDark ? '日览' : '夜览';
    if (themeColor) themeColor.setAttribute('content', isDark ? '#10140e' : '#76b900');
  }

  function syncUtterancesTheme() {
    var frame = document.querySelector('iframe.utterances-frame');
    if (!frame || !frame.contentWindow) return;
    if (!frame.hasAttribute('data-theme-sync-bound')) {
      frame.setAttribute('data-theme-sync-bound', '');
      frame.addEventListener('load', syncUtterancesTheme);
    }
    frame.contentWindow.postMessage({
      type: 'set-theme',
      theme: currentTheme() === 'dark' ? 'github-dark' : 'github-light'
    }, 'https://utteranc.es');
  }

  function applyTheme(theme, persist) {
    var normalized = theme === 'dark' ? 'dark' : 'light';
    rootElement.setAttribute('data-theme', normalized);
    syncThemeControls(normalized);
    if (persist) {
      try {
        localStorage.setItem('cuda-docs-theme', normalized);
      } catch (error) {}
    }
    syncUtterancesTheme();
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
    });
  }
  applyTheme(currentTheme(), false);

  new MutationObserver(syncUtterancesTheme).observe(document.body, { childList: true, subtree: true });

  if (!content) return;

  content.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[href^="#"]');
    if (!link || !content.contains(link)) return;
    var id;
    try {
      id = decodeURIComponent(link.getAttribute('href').slice(1));
    } catch (error) {
      id = link.getAttribute('href').slice(1);
    }
    if (!/^(?:fn|fnref|figure-)/.test(id)) return;
    var target = document.getElementById(id);
    if (!target || !content.contains(target)) return;
    event.preventDefault();
    target.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  function removeLegalNoticeItems() {
    Array.prototype.forEach.call(content.querySelectorAll('li > strong:first-child'), function (label) {
      var text = label.textContent.replace(/\s+/g, '');
      if (text !== '法律声明：' && text !== '授权说明：') return;
      var item = label.closest('li');
      if (item) item.remove();
    });
  }

  function addCudaFullName() {
    Array.prototype.forEach.call(content.querySelectorAll('em'), function (term) {
      if (term.textContent.trim() !== '统一计算设备架构') return;
      var node = term.nextSibling;
      while (node) {
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue.indexOf('（CUDA）') !== -1) {
          node.nodeValue = node.nodeValue.replace('（CUDA）', '（Compute Unified Device Architecture，CUDA）');
          return;
        }
        node = node.nextSibling;
      }
    });
  }

  function addDslFullName() {
    Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body > p'), function (paragraph) {
      if (paragraph.textContent.indexOf('领域特定语言（DSL）') === -1) return;
      var walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
      var node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue.indexOf('领域特定语言（DSL）') === -1) continue;
        node.nodeValue = node.nodeValue.replace('领域特定语言（DSL）', '领域特定语言（Domain-Specific Language，DSL）');
      }
    });
  }

  function addGpuArchitectureFullNames() {
    var body = content.querySelector('.doc-page-body');
    if (!body) return;

    function expandEmphasizedTerm(label, abbreviation, fullName) {
      Array.prototype.forEach.call(body.querySelectorAll('em'), function (term) {
        if (term.textContent.trim() !== label) return;
        var node = term.nextSibling;
        while (node) {
          if (node.nodeType === Node.TEXT_NODE && node.nodeValue.indexOf('（' + abbreviation + '）') !== -1) {
            node.nodeValue = node.nodeValue.replace(
              '（' + abbreviation + '）',
              '（' + fullName + '，' + abbreviation + '）'
            );
            return;
          }
          if (node.nodeType === Node.ELEMENT_NODE) return;
          node = node.nextSibling;
        }
      });
    }

    expandEmphasizedTerm('流式多处理器', 'SM', 'Streaming Multiprocessor');
    expandEmphasizedTerm('图形处理簇', 'GPC', 'Graphics Processing Cluster');

    var replacements = {
      '流式多处理器（SM）': '流式多处理器（Streaming Multiprocessor，SM）',
      '图形处理簇（GPC）': '图形处理簇（Graphics Processing Cluster，GPC）'
    };
    var walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      Object.keys(replacements).forEach(function (source) {
        if (node.nodeValue.indexOf(source) !== -1) {
          node.nodeValue = node.nodeValue.split(source).join(replacements[source]);
        }
      });
    }
  }

  function addRegisterFileExplanationNote() {
    Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body > p'), function (paragraph) {
      if (paragraph.textContent.indexOf('每个 SM 都包含本地寄存器文件、统一数据缓存，以及多个执行计算的功能单元') === -1) return;

      var sibling = paragraph.nextElementSibling;
      var smNote = null;
      while (sibling && sibling.classList.contains('markdown-alert')) {
        if (sibling.hasAttribute('data-register-file-explanation-note')) return;
        if (sibling.hasAttribute('data-sm-explanation-note')) smNote = sibling;
        sibling = sibling.nextElementSibling;
      }

      var note = document.createElement('aside');
      note.className = 'markdown-alert markdown-alert-note';
      note.setAttribute('role', 'note');
      note.setAttribute('data-register-file-explanation-note', '');

      var title = document.createElement('p');
      title.className = 'markdown-alert-title';
      title.textContent = '补充：为什么叫“寄存器文件”？';

      var explanation = document.createElement('p');
      explanation.textContent = '寄存器文件（register file）不是磁盘上的文件，而是由大量寄存器及其读写电路组成的硬件集合。在计算机体系结构中，file 在这里表示“按编号组织、可以被选择读写的一组条目”；因此，一个寄存器只是其中的一个存储单元，而寄存器文件可以理解为“寄存器组”或“寄存器池”。在 GPU 中，SM 的物理寄存器文件由驻留在该 SM 上的线程共同划分，而每个线程在编程模型中看到的是自己私有的寄存器。';

      note.appendChild(title);
      note.appendChild(explanation);
      if (smNote) {
        smNote.insertAdjacentElement('beforebegin', note);
      } else {
        paragraph.insertAdjacentElement('afterend', note);
      }
    });
  }

  function addSmExplanationNote() {
    Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body > p'), function (paragraph) {
      if (paragraph.textContent.indexOf('每个 SM 都包含本地寄存器文件、统一数据缓存，以及多个执行计算的功能单元') === -1) return;

      var insertAfter = paragraph;
      var sibling = paragraph.nextElementSibling;
      while (sibling && sibling.classList.contains('markdown-alert')) {
        if (sibling.hasAttribute('data-sm-explanation-note')) return;
        if (sibling.hasAttribute('data-register-file-explanation-note')) insertAfter = sibling;
        sibling = sibling.nextElementSibling;
      }

      var note = document.createElement('aside');
      note.className = 'markdown-alert markdown-alert-note';
      note.setAttribute('role', 'note');
      note.setAttribute('data-sm-explanation-note', '');

      var title = document.createElement('p');
      title.className = 'markdown-alert-title';
      title.textContent = '补充：什么是 SM？';

      var scheduling = document.createElement('p');
      scheduling.textContent = 'SM 是 GPU 执行线程的基本硬件单元。CUDA 内核启动后，线程会先组成线程块；一个线程块会被整体调度到某个 SM 上，并在该 SM 上使用寄存器、共享内存和执行单元完成计算。一个 SM 通常可以同时驻留并交错执行多个线程块和多个 warp（线程束），以隐藏访存或指令等待带来的延迟。';

      var streaming = document.createElement('p');
      streaming.textContent = 'SM 名称中的 Streaming（流式）强调的是面向吞吐量的连续处理方式：SM 会保存大量线程的执行状态，并由 warp 调度器不断从多个已就绪的线程束中选择可执行者，把指令持续送入不同功能单元。某个线程束因访存或数据依赖暂时等待时，SM 可以迅速切换去执行其他就绪线程束，从而让执行流水线尽量保持忙碌。这里的 Streaming 不是 CUDA Stream（流）API，也不表示线程按顺序排成一条“数据流”。';

      var comparison = document.createElement('p');
      comparison.textContent = 'SM 不能简单等同于一个 CPU 核心。CPU 核心强调低延迟和强单线程性能；SM 则包含大量面向并行吞吐的执行资源，负责同时管理和执行许多线程。不同 GPU 架构中的 SM 组成、可驻留线程数、寄存器容量、共享内存容量及功能单元配置可能不同，因此性能优化需要结合具体架构分析。';

      note.appendChild(title);
      note.appendChild(scheduling);
      note.appendChild(streaming);
      note.appendChild(comparison);
      insertAfter.insertAdjacentElement('afterend', note);
    });
  }

  function addCudaCoreExplanationNote() {
    Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body > p'), function (paragraph) {
      if (paragraph.textContent.indexOf('每个 SM 都包含本地寄存器文件、统一数据缓存，以及多个执行计算的功能单元') === -1) return;

      var insertAfter = paragraph;
      var sibling = paragraph.nextElementSibling;
      while (sibling && sibling.classList.contains('markdown-alert')) {
        if (sibling.hasAttribute('data-cuda-core-explanation-note')) return;
        if (
          sibling.hasAttribute('data-register-file-explanation-note') ||
          sibling.hasAttribute('data-sm-explanation-note')
        ) {
          insertAfter = sibling;
        }
        sibling = sibling.nextElementSibling;
      }

      var note = document.createElement('aside');
      note.className = 'markdown-alert markdown-alert-note';
      note.setAttribute('role', 'note');
      note.setAttribute('data-cuda-core-explanation-note', '');

      var title = document.createElement('p');
      title.className = 'markdown-alert-title';
      title.textContent = '补充：为什么这里没有单独介绍 CUDA Core / SP？';

      var abstraction = document.createElement('p');
      abstraction.textContent = '本指南在这里使用更高层的“功能单元（functional units）”来概括 SM 内部的计算资源，并没有把 CUDA Core 作为 CUDA 编程模型中的一个独立层级来展开。CUDA Core 也不是“功能单元”的同义词：在具体 NVIDIA GPU 微架构资料中，CUDA Core 通常指 SM 内用于普通标量算术的一类执行核心（例如 FP32 CUDA Core）；Tensor Core、LD/ST 单元、SFU 等则是 SM 内的其他执行资源。';

      var portability = document.createElement('p');
      portability.textContent = '这种表述有意保持跨架构抽象。不同 GPU 架构中，各类执行单元的数量、类型与组织方式都可能变化，而线程（Thread）、线程束（Warp）、线程块（Block）和 SM 等编程模型概念相对稳定。因此，在本指南中看到“功能单元”时，可以把 CUDA Core 理解为其中一类具体的硬件执行资源，而不是缺失了一个与 SM 并列的层级。';

      var terminology = document.createElement('p');
      terminology.textContent = '关于 SP 的称呼也要结合资料来源理解：当前 NVIDIA PTX ISA 使用 Scalar Processor（SP）core，而 SM 是 Streaming Multiprocessor。部分旧资料或教学课件会把 SP 展开为 Streaming Processor。若要研究 CUDA Core / SP 的具体组成，应进一步查阅 PTX ISA 以及对应 GPU 架构的官方资料。';

      var references = document.createElement('p');
      references.appendChild(document.createTextNode('参考：'));
      var programmingModelLink = document.createElement('a');
      programmingModelLink.href = 'https://docs.nvidia.com/cuda/cuda-programming-guide/01-introduction/programming-model.html';
      programmingModelLink.target = '_blank';
      programmingModelLink.rel = 'noopener noreferrer';
      programmingModelLink.textContent = 'CUDA Programming Guide：Programming Model';
      references.appendChild(programmingModelLink);
      references.appendChild(document.createTextNode('；'));
      var ptxLink = document.createElement('a');
      ptxLink.href = 'https://docs.nvidia.com/cuda/parallel-thread-execution/';
      ptxLink.target = '_blank';
      ptxLink.rel = 'noopener noreferrer';
      ptxLink.textContent = 'NVIDIA PTX ISA';
      references.appendChild(ptxLink);
      references.appendChild(document.createTextNode('。'));

      note.appendChild(title);
      note.appendChild(abstraction);
      note.appendChild(portability);
      note.appendChild(terminology);
      note.appendChild(references);
      insertAfter.insertAdjacentElement('afterend', note);
    });
  }

  function fixLocalReferenceTargets() {
    var figureTargets = {};
    Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body .figure'), function (figure) {
      var caption = figure.querySelector('figcaption');
      if (!caption) return;
      var match = caption.textContent.trim().match(/^图\s*(\d+)(?:\s|$)/);
      if (!match) return;
      var id = 'figure-' + match[1];
      figure.id = id;
      figureTargets[match[1]] = id;
    });

    Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body a'), function (link) {
      var match = link.textContent.trim().match(/^图\s*(\d+)$/);
      if (!match || !figureTargets[match[1]]) return;
      link.setAttribute('href', '#' + figureTargets[match[1]]);
    });
  }

  function addInterconnectExplanationNote() {
    var figures = content.querySelectorAll('.doc-page-body .figure');
    var figure = null;
    Array.prototype.some.call(figures, function (item) {
      var caption = item.querySelector('figcaption');
      if (!caption || !/^图\s*2(?:\s|$)/.test(caption.textContent.trim())) return false;
      figure = item;
      return true;
    });
    if (!figure) return;
    var next = figure.nextElementSibling;
    if (next && next.hasAttribute('data-interconnect-explanation-note')) return;

    var note = document.createElement('aside');
    note.className = 'markdown-alert markdown-alert-note';
    note.setAttribute('role', 'note');
    note.setAttribute('data-interconnect-explanation-note', '');

    var title = document.createElement('p');
    title.className = 'markdown-alert-title';
    title.textContent = '补充：PCIe 与 NVLink';

    var pcie = document.createElement('p');
    pcie.textContent = 'PCIe（Peripheral Component Interconnect Express）是通用高速互连总线，通常用于连接 CPU、GPU 与其他外设。在独立显卡系统中，主机内存与设备内存之间的数据传输通常经过 PCIe；其实际带宽和时延取决于 PCIe 代际、链路宽度以及整机拓扑。';

    var nvlink = document.createElement('p');
    nvlink.textContent = 'NVLink 是 NVIDIA 设计的高带宽、低时延互连技术，主要用于受支持平台中的 GPU–GPU 通信，也可在部分系统中用于 CPU–GPU 互连。它通常能提供比单条 PCIe 链路更高的聚合带宽，但是否支持，以及具体拓扑和带宽，均取决于 GPU 架构与整机平台。两者都是设备间的数据通路，并不会改变 CUDA 的主机—设备编程模型。';

    note.appendChild(title);
    note.appendChild(pcie);
    note.appendChild(nvlink);
    figure.insertAdjacentElement('afterend', note);
  }

  function addCudaExplanationNote() {
    Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body > p'), function (paragraph) {
      if (paragraph.textContent.indexOf('使各种计算工作负载都能脱离图形 API，利用 GPU 的高吞吐能力') === -1) return;
      var next = paragraph.nextElementSibling;
      if (next && next.hasAttribute('data-cuda-explanation-note')) return;

      var note = document.createElement('div');
      note.className = 'markdown-alert markdown-alert-note';
      note.setAttribute('data-cuda-explanation-note', '');

      var title = document.createElement('p');
      title.className = 'markdown-alert-title';
      title.textContent = '笔记';

      var text = document.createElement('p');
      text.textContent = 'CUDA 之前，通用计算通常要借助 OpenGL、Direct3D 等图形 API，把数据处理包装成渲染任务。CUDA 允许程序员直接编写 GPU 核函数、管理显存并启动计算，使 GPU 从图形处理器扩展为通用并行计算设备。这里的“高吞吐”强调单位时间内并行处理大量相似任务，而不是单个线程一定比 CPU 更快。';

      note.appendChild(title);
      note.appendChild(text);
      paragraph.insertAdjacentElement('afterend', note);
    });
  }

  function syncArticleAdjustments() {
    removeLegalNoticeItems();
    addCudaFullName();
    addDslFullName();
    addGpuArchitectureFullNames();
    addRegisterFileExplanationNote();
    addSmExplanationNote();
    addCudaCoreExplanationNote();
    fixLocalReferenceTargets();
    addInterconnectExplanationNote();
    addCudaExplanationNote();
  }

  new MutationObserver(syncArticleAdjustments).observe(content, { childList: true, subtree: true });
  syncArticleAdjustments();
})();
