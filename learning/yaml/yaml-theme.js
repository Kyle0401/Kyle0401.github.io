(function () {
  'use strict';

  var root = document.documentElement;
  var toggle = document.getElementById('theme-toggle');
  var commentsThread = document.getElementById('comments-thread');
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

  applyTheme(currentTheme(), false);
})();