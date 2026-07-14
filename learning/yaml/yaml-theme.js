(function () {
  'use strict';

  var root = document.documentElement;
  var toggle = document.getElementById('theme-toggle');
  var commentsThread = document.getElementById('comments-thread');
  var articleContent = document.getElementById('article-content');
  var storageKey = 'yaml-theme';
  var mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function readStoredTheme() {
    try {
      var value = window.localStorage.getItem(storageKey);
      return value === 'dark' || value === 'light' ? value : null;
    } catch (error) {
      return null;
    }
  }

  function writeStoredTheme(theme) {
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch (error) {
      // 隐私模式或存储被禁用时，当前页面仍可正常切换主题。
    }
  }

  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function updateToggle(theme) {
    if (!toggle) return;
    var isDark = theme === 'dark';
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.setAttribute('aria-label', isDark ? '切换到日间模式' : '切换到夜览模式');
    toggle.title = isDark ? '切换到日间模式' : '切换到夜览模式';
  }

  function updateCommentsTheme(theme) {
    var frame = document.querySelector('.utterances-frame');
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({
      type: 'set-theme',
      theme: theme === 'dark' ? 'github-dark' : 'github-light'
    }, 'https://utteranc.es');
  }

  function applyTheme(theme, persist) {
    var normalized = theme === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', normalized);
    root.style.colorScheme = normalized;
    updateToggle(normalized);
    updateCommentsTheme(normalized);
    if (persist) writeStoredTheme(normalized);
  }

  function addPronunciationNote() {
    if (!articleContent || articleContent.querySelector('.yaml-pronunciation-note')) return;

    var headings = articleContent.querySelectorAll('.doc-page-body h3');
    var targetHeading = null;
    Array.prototype.some.call(headings, function (heading) {
      if (heading.textContent.trim() === 'YAML 是什么') {
        targetHeading = heading;
        return true;
      }
      return false;
    });

    if (!targetHeading) return;

    var firstParagraph = targetHeading.nextElementSibling;
    if (!firstParagraph || firstParagraph.tagName.toLowerCase() !== 'p') return;

    var note = document.createElement('blockquote');
    note.className = 'callout yaml-pronunciation-note';
    note.innerHTML = '<p><strong>YAML 通常读作：</strong><code>/ˈjæməl/</code>，接近英文单词 <em>camel</em> 去掉开头的 <code>c</code>。中文可近似读成“亚么尔”或“雅莫尔”。</p>';
    firstParagraph.insertAdjacentElement('afterend', note);
  }

  function findFollowingTable(heading) {
    var node = heading.nextElementSibling;
    while (node && !/^H[234]$/.test(node.tagName)) {
      if (node.matches('.table-wrap')) return node;
      if (node.matches('table')) return node;
      node = node.nextElementSibling;
    }
    return null;
  }

  function fixChompingSection() {
    if (!articleContent) return;

    var headings = articleContent.querySelectorAll('.doc-page-body h3');
    for (var index = 0; index < headings.length; index++) {
      var heading = headings[index];
      if (heading.textContent.trim() !== '末尾换行控制') continue;
      if (heading.dataset.chompingFixed === 'true') return;

      var tableContainer = findFollowingTable(heading);
      if (!tableContainer) return;

      var table = tableContainer.matches('table')
        ? tableContainer
        : tableContainer.querySelector('table');
      if (!table) return;

      table.innerHTML = ''
        + '<thead><tr><th>写法</th><th>末尾换行效果</th><th>近似结果</th></tr></thead>'
        + '<tbody>'
        + '<tr><td><code>|</code> 或 <code>&gt;</code></td><td>默认保留一个结尾换行</td><td><code>"内容\\n"</code></td></tr>'
        + '<tr><td><code>|-</code> 或 <code>&gt;-</code></td><td>删除所有结尾换行</td><td><code>"内容"</code></td></tr>'
        + '<tr><td><code>|+</code> 或 <code>&gt;+</code></td><td>保留原文末尾的全部空行</td><td><code>"内容\\n\\n…"</code></td></tr>'
        + '</tbody>';

      if (!articleContent.querySelector('.yaml-chomping-explanation')) {
        var explanation = document.createElement('div');
        explanation.className = 'callout yaml-chomping-explanation';
        explanation.innerHTML = '<p><strong>理解关键：</strong><code>|</code> 与 <code>&gt;</code>控制正文内部的换行；后面的无符号、<code>-</code> 或 <code>+</code>只控制整个字符串末尾保留多少个换行符 <code>\\n</code>。</p>';
        tableContainer.parentNode.insertBefore(explanation, tableContainer);
      }

      heading.dataset.chompingFixed = 'true';
      return;
    }
  }

  function enhanceArticle() {
    addPronunciationNote();
    fixChompingSection();
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
    });
  }

  if (mediaQuery) {
    var handleSystemThemeChange = function (event) {
      if (readStoredTheme()) return;
      applyTheme(event.matches ? 'dark' : 'light', false);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleSystemThemeChange);
    }
  }

  if (commentsThread && 'MutationObserver' in window) {
    new MutationObserver(function () {
      updateCommentsTheme(currentTheme());
    }).observe(commentsThread, { childList: true, subtree: true });
  }

  if (articleContent && 'MutationObserver' in window) {
    new MutationObserver(enhanceArticle).observe(articleContent, { childList: true, subtree: true });
  }

  applyTheme(currentTheme(), false);
  enhanceArticle();
})();