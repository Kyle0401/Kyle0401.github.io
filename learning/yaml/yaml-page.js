(function () {
  'use strict';

  var content = document.getElementById('article-content');
  var pageNav = document.getElementById('page-nav');
  var outlineLinks = document.getElementById('outline-links');
  var pagination = document.getElementById('page-pagination');
  var docsTitle = document.getElementById('docs-title');
  var mobileNavToggle = document.getElementById('mobile-nav-toggle');
  var docsOverlay = document.getElementById('docs-overlay');
  var progressButton = document.getElementById('reading-progress');
  var progressValue = document.getElementById('reading-progress-value');
  var progressLabel = document.getElementById('reading-progress-label');
  var commentsThread = document.getElementById('comments-thread');

  if (!content || !pageNav || !outlineLinks || !pagination) return;

  var pages = [];
  var siteTitle = 'YAML 学习笔记';
  var currentPageIndex = 0;
  var outlineObserver = null;
  var circleLength = 2 * Math.PI * 21;
  var currentIssueTerm = '';

  function esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function plainText(value) {
    var node = document.createElement('div');
    node.innerHTML = String(value || '');
    return (node.textContent || node.innerText || '').trim();
  }

  function preparePages(markdown) {
    var lines = markdown.replace(/\r\n/g, '\n').split('\n');
    var titleLine = -1;
    var intro = [];
    var current = null;

    lines.forEach(function (line, index) {
      var title = line.match(/^#\s+(.+)$/);
      if (title && titleLine < 0) {
        titleLine = index;
        siteTitle = plainText(title[1]);
      }
    });

    lines.forEach(function (line, index) {
      var pageHeading = line.match(/^##\s+(.+)$/);
      if (pageHeading) {
        if (current) pages.push(current);
        current = {
          title: pageHeading[1],
          lines: [],
          route: 'page-' + (pages.length + 1)
        };
        return;
      }

      if (!current) {
        if (index !== titleLine) intro.push(line);
      } else {
        current.lines.push(line);
      }
    });

    if (current) pages.push(current);

    if (!pages.length) {
      pages.push({
        title: siteTitle,
        lines: lines.filter(function (_, index) { return index !== titleLine; }),
        route: 'page-1'
      });
    } else if (intro.some(function (line) { return line.trim(); })) {
      pages[0].lines = intro.concat(pages[0].lines);
    }

    pages.forEach(function (page, index) {
      page.index = index;
      page.route = 'page-' + (index + 1);
      page.plainTitle = plainText(page.title);
    });

    if (docsTitle) docsTitle.textContent = siteTitle;
  }

  function renderMarkdown(markdown) {
    if (!window.marked || typeof window.marked.parse !== 'function') {
      throw new Error('Marked is unavailable');
    }
    window.marked.setOptions({ gfm: true, breaks: false });
    return window.marked.parse(markdown);
  }

  function fallbackCopy(text) {
    return new Promise(function (resolve, reject) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      var copied = false;
      try { copied = document.execCommand('copy'); }
      catch (error) { copied = false; }
      document.body.removeChild(textarea);
      if (copied) resolve();
      else reject(new Error('copy failed'));
    });
  }

  function copyCode(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return fallbackCopy(text); });
    }
    return fallbackCopy(text);
  }

  function enhanceCallouts() {
    Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body blockquote'), function (quote) {
      var first = quote.firstElementChild;
      if (!first || first.textContent.trim() !== '[!NOTE]') return;
      first.remove();
      quote.classList.add('callout');
    });
  }

  function enhanceTables() {
    Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body table'), function (table) {
      if (table.parentElement && table.parentElement.classList.contains('table-wrap')) return;
      var wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  function enhanceLinks() {
    Array.prototype.forEach.call(content.querySelectorAll('a[href]'), function (link) {
      var href = link.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href)) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });
  }

  function enhanceCodeBlocks() {
    Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body pre > code'), function (code) {
      var pre = code.parentElement;
      if (!pre || (pre.parentElement && pre.parentElement.classList.contains('code-block'))) return;

      var className = code.className || '';
      var languageMatch = className.match(/language-([a-zA-Z0-9_+-]+)/);
      var language = languageMatch ? languageMatch[1] : 'text';
      var wrapper = document.createElement('div');
      var languageBar = document.createElement('div');
      var languageText = document.createElement('span');
      var button = document.createElement('button');

      wrapper.className = 'code-block';
      languageBar.className = 'code-language';
      languageText.className = 'code-language-text';
      languageText.textContent = language;
      button.type = 'button';
      button.className = 'copy-code-button';
      button.setAttribute('aria-label', '复制代码');
      button.title = '复制代码';
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="2"></rect><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"></path></svg>';

      button.addEventListener('click', function () {
        button.disabled = true;
        copyCode(code.textContent).then(function () {
          button.classList.add('is-copied');
          button.setAttribute('aria-label', '代码已复制');
          button.title = '已复制';
          window.setTimeout(function () {
            button.classList.remove('is-copied');
            button.setAttribute('aria-label', '复制代码');
            button.title = '复制代码';
            button.disabled = false;
          }, 1400);
        }, function () {
          button.classList.add('is-copy-failed');
          button.setAttribute('aria-label', '复制失败');
          button.title = '复制失败，请手动复制';
          window.setTimeout(function () {
            button.classList.remove('is-copy-failed');
            button.setAttribute('aria-label', '复制代码');
            button.title = '复制代码';
            button.disabled = false;
          }, 1800);
        });
      });

      pre.parentNode.insertBefore(wrapper, pre);
      languageBar.appendChild(languageText);
      languageBar.appendChild(button);
      wrapper.appendChild(languageBar);
      wrapper.appendChild(pre);

      if (window.hljs && typeof window.hljs.highlightElement === 'function') {
        try { window.hljs.highlightElement(code); }
        catch (error) { code.classList.add('nohighlight'); }
      }
    });
  }

  function assignHeadingIds() {
    var headingIndex = 0;
    Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body h2, .doc-page-body h3, .doc-page-body h4'), function (heading) {
      headingIndex += 1;
      heading.id = 'section-' + (currentPageIndex + 1) + '-' + headingIndex;
    });
  }

  function buildPageNavigation() {
    pageNav.innerHTML = pages.map(function (page, index) {
      var active = index === currentPageIndex ? ' is-active' : '';
      var current = index === currentPageIndex ? ' aria-current="page"' : '';
      return '<a class="page-nav-link' + active + '" href="#' + page.route + '"' + current + '><span>' + esc(page.plainTitle) + '</span></a>';
    }).join('');
  }

  function setActiveOutline(id) {
    Array.prototype.forEach.call(outlineLinks.querySelectorAll('a'), function (link) {
      link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
    });
  }

  function buildOutline() {
    if (outlineObserver) {
      outlineObserver.disconnect();
      outlineObserver = null;
    }

    var headings = Array.prototype.slice.call(content.querySelectorAll('.doc-page-body h2, .doc-page-body h3, .doc-page-body h4'));
    if (!headings.length) {
      outlineLinks.innerHTML = '<p class="outline-empty">本页暂无子标题</p>';
      return;
    }

    outlineLinks.innerHTML = headings.map(function (heading) {
      var level = heading.tagName.toLowerCase().replace('h', '');
      return '<a class="outline-link outline-level-' + level + '" href="#' + esc(heading.id) + '">' + esc(heading.textContent) + '</a>';
    }).join('');

    setActiveOutline(headings[0].id);
    if (!('IntersectionObserver' in window)) return;

    outlineObserver = new IntersectionObserver(function (entries) {
      var visible = entries.filter(function (entry) { return entry.isIntersecting; });
      if (!visible.length) return;
      visible.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      setActiveOutline(visible[0].target.id);
    }, { rootMargin: '-92px 0px -68% 0px', threshold: [0, 1] });

    headings.forEach(function (heading) { outlineObserver.observe(heading); });
  }

  function buildPagination() {
    var previous = pages[currentPageIndex - 1];
    var next = pages[currentPageIndex + 1];
    var previousHtml = previous
      ? '<a class="previous" href="#' + previous.route + '"><span class="pagination-label">← 上一页</span><span class="pagination-title">' + esc(previous.plainTitle) + '</span></a>'
      : '<span class="pagination-spacer" aria-hidden="true"></span>';
    var nextHtml = next
      ? '<a class="next" href="#' + next.route + '"><span class="pagination-label">下一页 →</span><span class="pagination-title">' + esc(next.plainTitle) + '</span></a>'
      : '<span class="pagination-spacer" aria-hidden="true"></span>';
    pagination.innerHTML = previousHtml + nextHtml;
  }

  function syncComments(pageTitle) {
    if (!commentsThread) return;
    var issueTerm = 'YAML 学习笔记评论：' + pageTitle;
    if (issueTerm === currentIssueTerm && commentsThread.querySelector('.utterances')) return;
    currentIssueTerm = issueTerm;
    commentsThread.innerHTML = '';

    var script = document.createElement('script');
    script.src = 'https://utteranc.es/client.js';
    script.setAttribute('repo', 'Kyle0401/Kyle0401.github.io');
    script.setAttribute('issue-term', issueTerm);
    script.setAttribute('theme', 'github-light');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;
    commentsThread.appendChild(script);
  }

  function closeMobileNavigation() {
    document.body.classList.remove('nav-open');
    if (mobileNavToggle) mobileNavToggle.setAttribute('aria-expanded', 'false');
  }

  function renderPage(index, targetId) {
    if (!pages.length) return;
    currentPageIndex = Math.max(0, Math.min(index, pages.length - 1));
    var page = pages[currentPageIndex];
    var bodyHtml = renderMarkdown(page.lines.join('\n'));

    content.innerHTML = '<header class="doc-page-header"><p class="doc-page-kicker">YAML 学习 · 第 ' + (currentPageIndex + 1) + ' / ' + pages.length + ' 页</p><h1 id="' + esc(page.route) + '-title">' + page.title + '</h1><p class="doc-page-summary">按章节分页阅读，右侧目录仅展示当前页内容。</p></header><div class="doc-page-body">' + bodyHtml + '</div>';

    assignHeadingIds();
    enhanceCallouts();
    enhanceTables();
    enhanceLinks();
    enhanceCodeBlocks();
    buildPageNavigation();
    buildOutline();
    buildPagination();
    syncComments(page.plainTitle);
    closeMobileNavigation();
    document.title = page.plainTitle + ' · YAML学习 · Kyle';

    window.requestAnimationFrame(function () {
      var target = targetId ? document.getElementById(targetId) : null;
      if (target) target.scrollIntoView({ block: 'start' });
      else window.scrollTo({ top: 0, left: 0 });
      updateReadingProgress();
    });
  }

  function routeFromHash() {
    var hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    var pageMatch = hash.match(/^page-(\d+)$/);
    var sectionMatch = hash.match(/^section-(\d+)-\d+$/);

    if (pageMatch) {
      renderPage(Number(pageMatch[1]) - 1, null);
      return;
    }

    if (sectionMatch) {
      renderPage(Number(sectionMatch[1]) - 1, hash);
      return;
    }

    renderPage(currentPageIndex, null);
  }

  function updateReadingProgress() {
    if (!progressValue || !progressLabel || !progressButton) return;
    var root = document.documentElement;
    var scrollable = Math.max(0, root.scrollHeight - window.innerHeight);
    var percent = scrollable > 0 ? Math.round((window.scrollY / scrollable) * 100) : 0;
    percent = Math.max(0, Math.min(100, percent));
    progressValue.style.strokeDasharray = String(circleLength);
    progressValue.style.strokeDashoffset = String(circleLength * (1 - percent / 100));
    progressLabel.textContent = percent + '%';
    progressButton.setAttribute('aria-label', '已阅读 ' + percent + '%，返回页面顶部');
  }

  if (mobileNavToggle) {
    mobileNavToggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      mobileNavToggle.setAttribute('aria-expanded', String(open));
    });
  }

  if (docsOverlay) docsOverlay.addEventListener('click', closeMobileNavigation);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMobileNavigation();
  });

  if (progressButton) {
    progressButton.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  window.addEventListener('scroll', updateReadingProgress, { passive: true });
  window.addEventListener('resize', updateReadingProgress);
  window.addEventListener('hashchange', routeFromHash);

  fetch('./YAML学习.md?v=20260715a')
    .then(function (response) {
      if (!response.ok) throw new Error('Markdown request failed');
      return response.text();
    })
    .then(function (markdown) {
      preparePages(markdown);
      routeFromHash();
    })
    .catch(function () {
      pageNav.innerHTML = '<p class="nav-loading">目录暂时无法加载。</p>';
      outlineLinks.innerHTML = '<p class="outline-empty">当前无可用目录</p>';
      content.innerHTML = '<header class="doc-page-header"><p class="doc-page-kicker">YAML 学习</p><h1>YAML 学习笔记</h1></header><p>笔记文件暂时无法读取。</p>';
      updateReadingProgress();
    });
})();