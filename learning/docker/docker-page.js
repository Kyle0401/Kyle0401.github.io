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

  if (!content || !pageNav || !outlineLinks || !pagination) return;

  var pages = [];
  var siteTitle = 'Docker 学习记录';
  var currentPageIndex = 0;
  var outlineObserver = null;
  var circleLength = 2 * Math.PI * 21;

  var safeFigures = {
    '通过 CNB 端口访问 code-server 的浏览器界面': ['code-server', '通过 PORTS 地址访问浏览器中的 code-server', ['工作区编辑器', '终端与文件树', '端口 8000 服务']],
    '在代码仓库中创建 Dockerfile': ['dockerfile', '在工作区中创建镜像构建文件', ['Dockerfile 文件', '构建指令', '版本控制']],
    '在 VS Code 扩展详情中查看 Go 扩展 Identifier': ['extension', '从扩展详情获取安装标识', ['Go 扩展', 'Identifier', 'golang.go']],
    'CNB 制品页面中的 Docker 镜像制品': ['registry', '在 CNB 制品页查看 Docker 镜像', ['Docker 镜像制品', '标签与版本', '使用 Docker 制品']],
    'CNB Docker 制品的使用方式选择界面': ['use', '选择 Docker 制品的使用方式', ['本地命令行推送', '流水线中使用', '拉取并运行']],
    'CNB Docker 制品的本地命令行推送指引': ['guide', '本地命令行推送使用指引', ['docker login', 'docker tag', 'docker push']],
    'CNB 个人设置中的访问令牌创建界面': ['credential', '个人设置中的访问令牌入口', ['访问令牌', '创建新令牌', '权限与有效期']],
    'CNB 访问令牌创建成功页面': ['credential', '访问令牌创建成功页面', ['令牌名称', 'Git Username', 'Token']],
    'CNB 制品列表中的 docker-learning 镜像': ['list', '制品列表中的 docker-learning 镜像', ['docker-learning', 'latest', '镜像摘要与大小']],
    'CNB docker-learning 镜像详情页': ['detail', 'docker-learning 镜像详情', ['标签与摘要', '镜像层', '拉取使用指引']]
  };

  function esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function codeLanguage(value) {
    var language = String(value || '').trim().toLowerCase();
    var aliases = { sh: 'bash', shell: 'bash', console: 'bash', txt: 'plaintext', text: 'plaintext' };
    if (!language) return 'plaintext';
    language = aliases[language] || language;
    return /^[a-z0-9_+-]+$/.test(language) ? language : 'plaintext';
  }

  function inline(value) {
    var parts = [];
    var result = esc(value);
    result = result.replace(/`([^`]+)`/g, function (_, code) {
      var key = '@@C' + parts.length + '@@';
      parts.push('<code>' + code + '</code>');
      return key;
    });
    result = result.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    result = result.replace(/\[([^\]]+)\]\((#[a-zA-Z0-9_-]+)\)/g, '<a href="$2">$1</a>');
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
    parts.forEach(function (part, index) {
      result = result.replace('@@C' + index + '@@', part);
    });
    return result;
  }

  function plainText(value) {
    var node = document.createElement('div');
    node.innerHTML = inline(value);
    return node.textContent || node.innerText || String(value);
  }

  function cells(line) {
    return line.trim().replace(/^\||\|$/g, '').split('|').map(function (item) { return item.trim(); });
  }

  function blockStart(line, next) {
    return /^#{1,6}\s+/.test(line) ||
      /^```/.test(line) ||
      /^-{3,}\s*$/.test(line) ||
      /^>\s*\[!NOTE\]/.test(line) ||
      /^[-*]\s+/.test(line) ||
      (/^\|/.test(line) && /^\|?\s*:?-{3,}/.test(next || '')) ||
      /^!\[.*?\]\(.+?\)$/.test(line);
  }

  function schematic(caption, spec) {
    var rows = spec[2].map(function (row, index) {
      return '<div class="figure-ui-row"><span class="figure-ui-icon"></span><span>' + esc(row) + '</span><span class="figure-ui-badge">' + (index === 1 ? 'latest' : 'Docker') + '</span></div>';
    }).join('');
    return '<figure class="figure"><div class="figure-ui" role="img" aria-label="' + esc(caption) + '"><div class="figure-ui-top"><span>CNB · Docker Registry</span><span>界面图</span></div><div class="figure-ui-body"><div><div class="figure-ui-title">' + esc(spec[0] === 'code-server' ? 'code-server · Browser IDE' : 'CNB Docker 制品') + '</div><div class="figure-ui-sub">' + esc(spec[1]) + '</div></div>' + rows + '<div class="figure-ui-actions"><span class="figure-ui-button">查看使用指引</span><span class="figure-ui-button ghost">更多操作</span></div></div></div><figcaption>' + inline(caption) + '</figcaption></figure>';
  }

  function figure(caption) {
    if (safeFigures[caption]) return schematic(caption, safeFigures[caption]);
    return '<div class="figure-token-note"><span>🔒</span><span><strong>凭据创建成功页未展示。</strong>公开学习记录不保留可识别的访问凭据。</span></div>';
  }

  function parse(lines, headingIds) {
    var ids = headingIds || [];
    var output = [];
    var index = 0;

    while (index < lines.length) {
      var line = lines[index];
      var next = lines[index + 1] || '';

      if (!line.trim()) {
        index++;
        continue;
      }

      if (/^```/.test(line)) {
        var language = line.slice(3).trim() || 'text';
        var code = [];
        index++;
        while (index < lines.length && !/^```/.test(lines[index])) {
          code.push(lines[index]);
          index++;
        }
        if (index < lines.length) index++;
        output.push('<div class="code-block"><div class="code-language"><span class="code-language-text">' + esc(language) + '</span></div><pre><code class="language-' + esc(codeLanguage(language)) + '">' + esc(code.join('\n')) + '</code></pre></div>');
        continue;
      }

      if (/^>\s*\[!NOTE\]/.test(line)) {
        var note = [];
        index++;
        while (index < lines.length && (lines[index].startsWith('>') || !lines[index].trim())) {
          note.push(lines[index].startsWith('>') ? lines[index].replace(/^>\s?/, '') : '');
          index++;
        }
        output.push('<div class="callout"><div>' + parse(note, []) + '</div></div>');
        continue;
      }

      if (/^-{3,}\s*$/.test(line)) {
        output.push('<hr>');
        index++;
        continue;
      }

      var heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        var level = heading[1].length;
        var id = level <= 4 && ids.length ? ids.shift() : '';
        output.push('<h' + level + (id ? ' id="' + esc(id) + '"' : '') + '>' + inline(heading[2]) + '</h' + level + '>');
        index++;
        continue;
      }

      if (/^\|/.test(line) && /^\|?\s*:?-{3,}/.test(next)) {
        var heads = cells(line);
        var rows = [];
        index += 2;
        while (index < lines.length && /^\|/.test(lines[index])) {
          rows.push(cells(lines[index]));
          index++;
        }
        var table = '<div class="table-wrap"><table><thead><tr>' + heads.map(function (item) { return '<th>' + inline(item) + '</th>'; }).join('') + '</tr></thead><tbody>';
        rows.forEach(function (row) {
          table += '<tr>' + heads.map(function (_, cellIndex) { return '<td>' + inline(row[cellIndex] || '') + '</td>'; }).join('') + '</tr>';
        });
        output.push(table + '</tbody></table></div>');
        continue;
      }

      if (/^[-*]\s+/.test(line)) {
        var items = [];
        while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
          items.push(lines[index].replace(/^[-*]\s+/, ''));
          index++;
        }
        output.push('<ul>' + items.map(function (item) { return '<li>' + inline(item) + '</li>'; }).join('') + '</ul>');
        continue;
      }

      var image = line.match(/^!\[(.*?)\]\((.+?)\)$/);
      if (image) {
        output.push(figure(image[1]));
        index++;
        continue;
      }

      var paragraph = [];
      while (index < lines.length && lines[index].trim() && !blockStart(lines[index], lines[index + 1] || '')) {
        paragraph.push(lines[index].trim());
        index++;
      }
      if (paragraph.length) output.push('<p>' + inline(paragraph.join('<br>')) + '</p>');
      else index++;
    }

    return output.join('');
  }

  function preparePages(markdown) {
    var lines = markdown.replace(/\r\n/g, '\n').split('\n');
    var headingIdByLine = {};
    var headingNumber = 0;
    var titleLine = -1;
    var intro = [];
    var current = null;

    lines.forEach(function (line, lineIndex) {
      var heading = line.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        headingNumber++;
        headingIdByLine[lineIndex] = 'section-' + headingNumber;
        if (heading[1].length === 1 && titleLine < 0) {
          titleLine = lineIndex;
          siteTitle = plainText(heading[2]);
        }
      }
    });

    pages = [];
    lines.forEach(function (line, lineIndex) {
      var pageHeading = line.match(/^##\s+(.+)$/);
      if (pageHeading) {
        if (current) pages.push(current);
        current = {
          title: pageHeading[1],
          anchorId: headingIdByLine[lineIndex],
          lines: [],
          headingIds: [],
          allIds: [headingIdByLine[lineIndex]]
        };
        return;
      }

      if (!current) {
        if (lineIndex !== titleLine) intro.push(line);
        return;
      }

      current.lines.push(line);
      if (headingIdByLine[lineIndex]) {
        current.headingIds.push(headingIdByLine[lineIndex]);
        current.allIds.push(headingIdByLine[lineIndex]);
      }
    });

    if (current) pages.push(current);

    if (!pages.length) {
      var fallbackId = headingIdByLine[titleLine] || 'section-1';
      pages.push({
        title: siteTitle,
        anchorId: fallbackId,
        lines: lines.filter(function (_, lineIndex) { return lineIndex !== titleLine; }),
        headingIds: [],
        allIds: [fallbackId]
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
      try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
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

  function addSyntaxHighlighting() {
    if (!window.hljs || typeof window.hljs.highlightElement !== 'function') return;
    Array.prototype.forEach.call(content.querySelectorAll('.code-block pre code'), function (code) {
      if (code.classList.contains('hljs')) return;
      try { window.hljs.highlightElement(code); }
      catch (error) { code.classList.add('nohighlight'); }
    });
  }

  function addCopyButtons() {
    Array.prototype.forEach.call(content.querySelectorAll('.code-block'), function (block) {
      if (block.querySelector('.copy-code-button')) return;
      var languageBar = block.querySelector('.code-language');
      var code = block.querySelector('pre code');
      if (!languageBar || !code) return;

      var button = document.createElement('button');
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
      languageBar.appendChild(button);
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

  function closeMobileNavigation() {
    document.body.classList.remove('nav-open');
    if (mobileNavToggle) mobileNavToggle.setAttribute('aria-expanded', 'false');
  }

  function renderPage(index, targetId) {
    if (!pages.length) return;
    currentPageIndex = Math.max(0, Math.min(index, pages.length - 1));
    var page = pages[currentPageIndex];
    var bodyHtml = parse(page.lines.slice(), page.headingIds.slice());

    content.innerHTML = '<header class="doc-page-header"><p class="doc-page-kicker">Docker 学习 · 第 ' + (currentPageIndex + 1) + ' / ' + pages.length + ' 页</p><h1 id="' + esc(page.anchorId) + '">' + inline(page.title) + '</h1><p class="doc-page-summary">按章节分页阅读，右侧目录仅展示当前页内容。</p></header><div class="doc-page-body">' + bodyHtml + '</div>';

    document.title = page.plainTitle + ' · Docker学习 · Kyle';
    addSyntaxHighlighting();
    addCopyButtons();
    buildPageNavigation();
    buildOutline();
    buildPagination();
    closeMobileNavigation();

    window.requestAnimationFrame(function () {
      var target = targetId ? document.getElementById(targetId) : null;
      if (target) target.scrollIntoView({ block: 'start' });
      else window.scrollTo({ top: 0, left: 0 });
      updateReadingProgress();
    });
  }

  function findPageBySection(sectionId) {
    for (var index = 0; index < pages.length; index++) {
      if (pages[index].allIds.indexOf(sectionId) !== -1) return index;
    }
    return -1;
  }

  function routeFromHash() {
    var hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    var pageMatch = hash.match(/^page-(\d+)$/);
    var sectionMatch = hash.match(/^section-\d+$/);

    if (pageMatch) {
      renderPage(Number(pageMatch[1]) - 1, null);
      return;
    }

    if (sectionMatch) {
      var pageIndex = findPageBySection(hash);
      renderPage(pageIndex >= 0 ? pageIndex : 0, hash);
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

  fetch('./Docker学习.md?v=20260711a')
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
      content.innerHTML = '<header class="doc-page-header"><p class="doc-page-kicker">Docker 学习</p><h1>Docker学习记录</h1></header><p>笔记文件暂时无法读取。</p>';
      updateReadingProgress();
    });
})();
