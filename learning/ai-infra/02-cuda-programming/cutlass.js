(function (root) {
  'use strict';

  var document = root.document;
  var elements = {
    app: document.getElementById('docs-app'),
    body: document.getElementById('doc-body'),
    loadStatus: document.getElementById('load-status'),
    pageNav: document.getElementById('page-nav'),
    outline: document.getElementById('outline-links'),
    sidebar: document.getElementById('docs-sidebar'),
    mobileToggle: document.getElementById('mobile-nav-toggle'),
    overlay: document.getElementById('docs-overlay'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-toggle-icon'),
    themeLabel: document.getElementById('theme-toggle-label'),
    themeColor: document.getElementById('theme-color'),
    progress: document.getElementById('reading-progress'),
    progressValue: document.getElementById('reading-progress-value'),
    progressLabel: document.getElementById('reading-progress-label')
  };

  if (!elements.body || !elements.pageNav || !elements.outline) return;

  var state = {
    sectionObserver: null,
    outlineObserver: null,
    circleLength: 2 * Math.PI * 21
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function safeLanguage(value) {
    var language = String(value || '').trim().split(/\s+/)[0].toLowerCase();
    var aliases = {
      cxx: 'cpp',
      cu: 'cpp',
      cuda: 'cpp',
      console: 'bash',
      sh: 'bash',
      shell: 'bash',
      text: 'plaintext',
      txt: 'plaintext'
    };
    language = aliases[language] || language || 'plaintext';
    return /^[a-z0-9_+-]+$/.test(language) ? language : 'plaintext';
  }

  function isSafeImage(source) {
    var normalized = String(source || '').replace(/^\.\//, '');
    return /^assets\/[a-zA-Z0-9._/-]+\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(normalized) &&
      normalized.indexOf('..') === -1 &&
      normalized.indexOf('\\') === -1;
  }

  function createRenderer() {
    if (typeof root.markdownit !== 'function') throw new Error('Markdown 渲染器未加载。');

    var md = root.markdownit({
      html: false,
      linkify: true,
      typographer: false,
      breaks: false
    });

    var originalLinkOpen = md.renderer.rules.link_open || function (tokens, index, options, env, renderer) {
      return renderer.renderToken(tokens, index, options);
    };

    md.renderer.rules.link_open = function (tokens, index, options, env, renderer) {
      var href = tokens[index].attrGet('href') || '';
      if (/^https?:\/\//i.test(href)) {
        tokens[index].attrSet('target', '_blank');
        tokens[index].attrSet('rel', 'noopener noreferrer');
      }
      return originalLinkOpen(tokens, index, options, env, renderer);
    };

    md.renderer.rules.table_open = function () {
      return '<div class="table-wrap" role="region" aria-label="可横向滚动的表格" tabindex="0"><table>\n';
    };
    md.renderer.rules.table_close = function () {
      return '</table></div>\n';
    };

    md.renderer.rules.image = function (tokens, index) {
      var token = tokens[index];
      var source = token.attrGet('src') || '';
      var alt = String(token.content || '').trim();
      if (!isSafeImage(source)) {
        return '<span class="image-error" role="alert">图片路径无效，已停止渲染。</span>';
      }
      if (!alt) alt = '教程插图';
      var normalized = './' + source.replace(/^\.\//, '');
      var safeSource = escapeHtml(normalized);
      var safeAlt = escapeHtml(alt);
      return '<figure class="figure">' +
        '<a href="' + safeSource + '" target="_blank" rel="noopener noreferrer" aria-label="查看原图：' + safeAlt + '">' +
          '<img src="' + safeSource + '" alt="' + safeAlt + '" loading="lazy" decoding="async">' +
        '</a>' +
        '<figcaption>' + safeAlt + '</figcaption>' +
      '</figure>';
    };

    function renderFence(tokens, index) {
      var token = tokens[index];
      var language = safeLanguage(token.info);
      var highlighted;
      if (root.hljs && language !== 'plaintext' && root.hljs.getLanguage(language)) {
        try {
          highlighted = root.hljs.highlight(token.content, {
            language: language,
            ignoreIllegals: true
          }).value;
        } catch (error) {
          highlighted = md.utils.escapeHtml(token.content);
        }
      } else {
        highlighted = md.utils.escapeHtml(token.content);
      }

      var languageLabel = language === 'plaintext' ? 'text' : language;
      return '<div class="code-block">' +
        '<div class="code-language">' +
          '<span>' + escapeHtml(languageLabel) + '</span>' +
          '<button class="copy-code-button" type="button" data-copy-code aria-label="复制代码">复制</button>' +
        '</div>' +
        '<pre><code class="hljs language-' + escapeHtml(language) + '">' + highlighted + '</code></pre>' +
      '</div>\n';
    }

    md.renderer.rules.fence = renderFence;
    md.renderer.rules.code_block = function (tokens, index) {
      tokens[index].info = 'plaintext';
      return renderFence(tokens, index);
    };

    return md;
  }

  function headingId(heading, index, used) {
    var text = heading.textContent.trim();
    var numeric = text.match(/^(\d+(?:\.\d+)*)[.\s、：:]/);
    var base;
    if (numeric) {
      base = 'section-' + numeric[1].replace(/\./g, '-');
    } else if (text === '目录') {
      base = 'contents';
    } else if (text.indexOf('小结') === 0) {
      base = 'summary';
    } else {
      base = 'heading-' + (index + 1);
    }

    var id = base;
    var suffix = 2;
    while (used[id]) {
      id = base + '-' + suffix;
      suffix += 1;
    }
    used[id] = true;
    return id;
  }

  function assignHeadingIds() {
    var used = {};
    Array.prototype.forEach.call(elements.body.querySelectorAll('h2, h3, h4'), function (heading, index) {
      heading.id = headingId(heading, index, used);
    });
  }

  function sectionLabel(heading) {
    var match = heading.textContent.trim().match(/^(\d+(?:\.\d+)*)[.\s、：:]\s*(.*)$/);
    return match ? { number: match[1], title: match[2] } : null;
  }

  function focusAnchorDestination(link) {
    var href = link && link.getAttribute('href');
    if (!href || href.charAt(0) !== '#') {
      closeMobileNavigation(false);
      return;
    }

    var id;
    try {
      id = decodeURIComponent(href.slice(1));
    } catch (error) {
      id = href.slice(1);
    }
    var target = document.getElementById(id);
    closeMobileNavigation(false);
    if (!target) return;
    target.setAttribute('tabindex', '-1');
    root.setTimeout(function () {
      target.focus({ preventScroll: true });
    }, 0);
  }

  function setActiveNavigation(id) {
    Array.prototype.forEach.call(elements.pageNav.querySelectorAll('a'), function (link) {
      var active = link.getAttribute('href') === '#' + id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function buildNavigation() {
    if (state.sectionObserver) state.sectionObserver.disconnect();
    elements.pageNav.innerHTML = '';

    var headings = Array.prototype.filter.call(elements.body.querySelectorAll('h2'), function (heading) {
      return sectionLabel(heading) !== null;
    });

    var group = document.createElement('section');
    group.className = 'page-nav-group';
    var groupTitle = document.createElement('p');
    groupTitle.className = 'page-nav-chapter';
    groupTitle.textContent = 'GEMM 优化主线';
    group.appendChild(groupTitle);

    headings.forEach(function (heading) {
      var label = sectionLabel(heading);
      var link = document.createElement('a');
      link.href = '#' + heading.id;
      link.className = 'page-nav-link';
      var number = document.createElement('span');
      number.className = 'page-nav-number';
      number.textContent = label.number;
      var title = document.createElement('span');
      title.textContent = label.title;
      link.appendChild(number);
      link.appendChild(title);
      link.addEventListener('click', function () {
        focusAnchorDestination(link);
      });
      group.appendChild(link);
    });

    elements.pageNav.appendChild(group);
    if (!headings.length) {
      elements.pageNav.innerHTML = '<p class="nav-loading">当前没有可用章节。</p>';
      return;
    }

    setActiveNavigation(headings[0].id);
    if (!('IntersectionObserver' in root)) return;

    state.sectionObserver = new root.IntersectionObserver(function (entries) {
      var visible = entries.filter(function (entry) { return entry.isIntersecting; });
      if (!visible.length) return;
      visible.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      setActiveNavigation(visible[0].target.id);
    }, {
      rootMargin: '-94px 0px -72% 0px',
      threshold: [0, 1]
    });
    headings.forEach(function (heading) {
      state.sectionObserver.observe(heading);
    });
  }

  function setActiveOutline(id) {
    Array.prototype.forEach.call(elements.outline.querySelectorAll('a'), function (link) {
      link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
    });
  }

  function buildOutline() {
    if (state.outlineObserver) state.outlineObserver.disconnect();
    elements.outline.innerHTML = '';

    var headings = Array.prototype.slice.call(elements.body.querySelectorAll('h3, h4'));
    if (!headings.length) {
      elements.outline.innerHTML = '<p class="outline-empty">本页暂无子标题</p>';
      return;
    }

    headings.forEach(function (heading) {
      var link = document.createElement('a');
      link.href = '#' + heading.id;
      link.className = 'outline-link outline-level-' + heading.tagName.slice(1);
      link.textContent = heading.textContent;
      link.addEventListener('click', function () {
        focusAnchorDestination(link);
      });
      elements.outline.appendChild(link);
    });
    setActiveOutline(headings[0].id);

    if (!('IntersectionObserver' in root)) return;
    state.outlineObserver = new root.IntersectionObserver(function (entries) {
      var visible = entries.filter(function (entry) { return entry.isIntersecting; });
      if (!visible.length) return;
      visible.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      setActiveOutline(visible[0].target.id);
    }, {
      rootMargin: '-94px 0px -68% 0px',
      threshold: [0, 1]
    });
    headings.forEach(function (heading) {
      state.outlineObserver.observe(heading);
    });
  }

  function fallbackCopy(text) {
    return new Promise(function (resolve, reject) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      var copied = false;
      try {
        copied = document.execCommand('copy');
      } catch (error) {
        copied = false;
      }
      document.body.removeChild(textarea);
      if (copied) resolve();
      else reject(new Error('copy failed'));
    });
  }

  function copyText(text) {
    if (root.navigator.clipboard && root.isSecureContext) {
      return root.navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopy(text);
      });
    }
    return fallbackCopy(text);
  }

  function bindCodeCopy() {
    Array.prototype.forEach.call(elements.body.querySelectorAll('[data-copy-code]'), function (button) {
      button.addEventListener('click', function () {
        var block = button.closest('.code-block');
        var code = block && block.querySelector('code');
        if (!code) return;
        button.disabled = true;
        copyText(code.textContent).then(function () {
          button.textContent = '已复制';
          button.classList.add('is-copied');
          root.setTimeout(function () {
            button.textContent = '复制';
            button.classList.remove('is-copied');
            button.disabled = false;
          }, 1400);
        }, function () {
          button.textContent = '复制失败';
          button.classList.add('is-copy-failed');
          root.setTimeout(function () {
            button.textContent = '复制';
            button.classList.remove('is-copy-failed');
            button.disabled = false;
          }, 1800);
        });
      });
    });
  }

  function decorateArticle() {
    var sourceHeading = elements.body.querySelector('h1');
    if (sourceHeading) sourceHeading.remove();
    assignHeadingIds();

    var contentsHeading = document.getElementById('contents');
    var contentsList = contentsHeading && contentsHeading.nextElementSibling;
    if (contentsList && contentsList.tagName === 'OL') contentsList.classList.add('article-toc');

    Array.prototype.forEach.call(elements.body.querySelectorAll('a[href^="#"]'), function (link) {
      link.addEventListener('click', function () {
        focusAnchorDestination(link);
      });
    });

    buildNavigation();
    buildOutline();
    bindCodeCopy();
  }

  function closeMobileNavigation(restoreFocus) {
    document.body.classList.remove('nav-open');
    if (elements.mobileToggle) elements.mobileToggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus && elements.mobileToggle) elements.mobileToggle.focus();
  }

  function setTheme(theme, persist) {
    var dark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (elements.themeToggle) {
      elements.themeToggle.setAttribute('aria-pressed', String(dark));
      elements.themeToggle.setAttribute('aria-label', dark ? '切换到日间模式' : '切换到夜览模式');
      elements.themeToggle.setAttribute('title', dark ? '切换到日间模式' : '切换到夜览模式');
    }
    if (elements.themeIcon) elements.themeIcon.textContent = dark ? '☀' : '☾';
    if (elements.themeLabel) elements.themeLabel.textContent = dark ? '日间' : '夜览';
    if (elements.themeColor) elements.themeColor.setAttribute('content', dark ? '#10140e' : '#76b900');
    if (persist) {
      try {
        root.localStorage.setItem('cutlass-docs-theme', dark ? 'dark' : 'light');
      } catch (error) {}
    }
  }

  function updateReadingProgress() {
    if (!elements.progress || !elements.progressValue || !elements.progressLabel) return;
    var rect = elements.body.getBoundingClientRect();
    var pageTop = rect.top + root.scrollY - 94;
    var pageBottom = pageTop + elements.body.offsetHeight - root.innerHeight * 0.35;
    var span = Math.max(1, pageBottom - pageTop);
    var percent = Math.round(((root.scrollY - pageTop) / span) * 100);
    percent = Math.max(0, Math.min(100, percent));
    elements.progressValue.style.strokeDasharray = String(state.circleLength);
    elements.progressValue.style.strokeDashoffset = String(state.circleLength * (1 - percent / 100));
    elements.progressLabel.textContent = percent + '%';
    elements.progress.setAttribute('aria-label', '本页已阅读 ' + percent + '%，返回页面顶部');
  }

  function scrollToInitialHash() {
    if (!root.location.hash) return;
    var id;
    try {
      id = decodeURIComponent(root.location.hash.slice(1));
    } catch (error) {
      id = root.location.hash.slice(1);
    }
    var target = document.getElementById(id);
    if (target) {
      root.requestAnimationFrame(function () {
        target.scrollIntoView({ block: 'start' });
      });
    }
  }

  function showError(error) {
    if (elements.app) elements.app.setAttribute('aria-busy', 'false');
    if (elements.loadStatus) elements.loadStatus.hidden = true;
    elements.pageNav.innerHTML = '<p class="nav-loading">目录暂时无法加载。</p>';
    elements.outline.innerHTML = '<p class="outline-empty">当前无可用目录。</p>';
    elements.body.innerHTML = '<div class="load-error" role="alert">' +
      '<strong>教程加载失败。</strong><br>' +
      escapeHtml(error && error.message ? error.message : error) +
      '<br><a href="./CUTLASS.md">直接阅读 Markdown 源文</a>' +
    '</div>';
  }

  if (elements.mobileToggle) {
    elements.mobileToggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      elements.mobileToggle.setAttribute('aria-expanded', String(open));
      if (open) {
        var firstLink = elements.pageNav.querySelector('a');
        if (firstLink) firstLink.focus();
      }
    });
  }

  if (elements.overlay) {
    elements.overlay.addEventListener('click', function () {
      closeMobileNavigation(true);
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
      closeMobileNavigation(true);
      return;
    }
    if (event.key === 'Tab' && document.body.classList.contains('nav-open') && elements.sidebar) {
      var focusable = Array.prototype.slice.call(elements.sidebar.querySelectorAll('a[href]'));
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  if (elements.themeToggle) {
    elements.themeToggle.addEventListener('click', function () {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      setTheme(dark ? 'light' : 'dark', true);
    });
  }

  if (elements.progress) {
    elements.progress.addEventListener('click', function () {
      root.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  root.addEventListener('scroll', updateReadingProgress, { passive: true });
  root.addEventListener('resize', updateReadingProgress);
  root.addEventListener('hashchange', scrollToInitialHash);
  setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);

  root.fetch('./CUTLASS.md', {
    credentials: 'same-origin',
    cache: 'no-store'
  })
    .then(function (response) {
      if (!response.ok) throw new Error('CUTLASS.md 请求失败（HTTP ' + response.status + '）。');
      return response.text();
    })
    .then(function (markdown) {
      var renderer = createRenderer();
      elements.body.innerHTML = renderer.render(markdown.replace(/^\uFEFF/, ''));
      decorateArticle();
      if (elements.loadStatus) elements.loadStatus.hidden = true;
      if (elements.app) elements.app.setAttribute('aria-busy', 'false');
      scrollToInitialHash();
      updateReadingProgress();
    })
    .catch(showError);
})(window);
