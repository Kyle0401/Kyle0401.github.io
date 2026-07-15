(function (root, factory) {
  'use strict';

  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CudaDocs = api;
  if (root && root.document) api.bootstrap();
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';

  function trimHash(value) {
    return String(value || '').trim().replace(/^#/, '');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  var exerciseCtas = {
    '1.1': {
      id: 'quiz-1-1',
      questionCount: 6,
      typeSummary: '4 道单选 · 1 道多选 · 1 道填空'
    },
    '1.2': {
      id: 'quiz-1-2',
      questionCount: 10,
      typeSummary: '5 道单选 · 3 道多选 · 2 道填空'
    },
    '1.3': {
      id: 'quiz-1-3',
      questionCount: 8,
      typeSummary: '4 道单选 · 2 道多选 · 2 道填空'
    }
  };

  function getExerciseCta(chapter) {
    var meta = exerciseCtas[String(chapter || '').trim()];
    if (!meta) return null;
    return {
      id: meta.id,
      chapter: String(chapter).trim(),
      questionCount: meta.questionCount,
      typeSummary: meta.typeSummary,
      href: './exercises/#' + meta.id
    };
  }

  function renderExerciseCta(chapter) {
    var meta = getExerciseCta(chapter);
    if (!meta) return '';
    return '<aside class="exercise-cta" aria-labelledby="exercise-cta-title-' + escapeHtml(meta.id) + '">' +
      '<div class="exercise-cta-copy">' +
        '<p class="exercise-cta-eyebrow">课后自测 · ' + escapeHtml(String(meta.questionCount)) + ' 题</p>' +
        '<h2 id="exercise-cta-title-' + escapeHtml(meta.id) + '">完成本节练习</h2>' +
        '<p>' + escapeHtml(meta.typeSummary) + '。支持分题检查与整卷交卷，提交后立即查看答案依据和解析。</p>' +
        '<p class="exercise-cta-note">无需登录；答题仅保存在当前标签页内存中，刷新即清空。</p>' +
      '</div>' +
      '<a class="exercise-cta-link" href="' + escapeHtml(meta.href) + '">开始练习<span aria-hidden="true"> →</span></a>' +
    '</aside>';
  }

  function chapterToRoute(chapter) {
    return '#page-' + String(chapter || '').trim().replace(/\./g, '-');
  }

  function sectionToId(section) {
    return '#section-' + String(section || '').trim().replace(/\./g, '-');
  }

  function routeToChapter(route) {
    var match = trimHash(route).match(/^page-(\d+(?:-\d+)*)$/);
    return match ? match[1].replace(/-/g, '.') : '';
  }

  function idToSection(id) {
    var match = trimHash(id).match(/^section-(\d+(?:-\d+)*)$/);
    return match ? match[1].replace(/-/g, '.') : '';
  }

  function parseHash(hash) {
    var clean;
    try {
      clean = decodeURIComponent(trimHash(hash));
    } catch (error) {
      clean = trimHash(hash);
    }

    var page = clean.match(/^page-(\d+(?:-\d+)*)$/);
    if (page) return { kind: 'page', chapter: page[1].replace(/-/g, '.'), id: clean };

    var section = clean.match(/^section-(\d+(?:-\d+)*)$/);
    if (section) return { kind: 'section', section: section[1].replace(/-/g, '.'), id: clean };

    return { kind: 'default', id: '' };
  }

  function extractHeadingNumber(line) {
    var match = String(line || '').match(/^(#{1,6})\s+(\d+(?:\.\d+)*)(?:\.)?\s+(.+?)\s*$/);
    if (!match) return null;
    return {
      level: match[1].length,
      number: match[2],
      title: match[3]
    };
  }

  function cloneObject(source) {
    var target = {};
    Object.keys(source || {}).forEach(function (key) { target[key] = source[key]; });
    return target;
  }

  function stripStandalonePageMetadata(lines) {
    var output = (lines || []).slice();
    var cursor = 0;
    var removed = 0;
    while (cursor < output.length && !output[cursor].trim()) cursor++;
    while (cursor < output.length && removed < 2) {
      if (/^\*(?:英文原题|官方原文)：.+\*\s*$/.test(output[cursor])) {
        output.splice(cursor, 1);
        removed++;
        while (cursor < output.length && !output[cursor].trim()) output.splice(cursor, 1);
        continue;
      }
      break;
    }
    return output;
  }

  function splitMarkdown(markdown, manifestPages) {
    var lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
    var headings = [];
    lines.forEach(function (line, index) {
      var heading = extractHeadingNumber(line);
      if (heading) {
        heading.line = index;
        headings.push(heading);
      }
    });

    var levelTwo = headings.filter(function (heading) { return heading.level === 2; });
    var firstBoundary = levelTwo.length ? levelTwo[0].line : 0;
    var intro = lines.slice(0, firstBoundary).filter(function (line) {
      return !/^#\s+/.test(line);
    });

    return (manifestPages || []).map(function (manifestPage, pageIndex) {
      var page = cloneObject(manifestPage);
      var startHeading = null;
      var startPosition = -1;

      levelTwo.some(function (heading, headingIndex) {
        if (heading.number !== String(page.chapter)) return false;
        startHeading = heading;
        startPosition = headingIndex;
        return true;
      });

      page.route = page.route || chapterToRoute(page.chapter);
      page.titleAnchor = page.titleAnchor || sectionToId(page.chapter);
      page.index = pageIndex;
      page.sections = [trimHash(page.titleAnchor)];

      if (!startHeading) {
        page.missing = true;
        page.body = '> [!WARNING]\n> 内容清单中存在本页，但 Markdown 中未找到对应的二级标题。';
        return page;
      }

      var endLine = startPosition + 1 < levelTwo.length ? levelTwo[startPosition + 1].line : lines.length;
      var bodyLines = stripStandalonePageMetadata(lines.slice(startHeading.line + 1, endLine));
      if (pageIndex === 0 && intro.some(function (line) { return line.trim(); })) {
        bodyLines = intro.concat(['']).concat(bodyLines);
      }

      headings.forEach(function (heading) {
        if (heading.line < startHeading.line || heading.line >= endLine) return;
        var id = trimHash(sectionToId(heading.number));
        if (page.sections.indexOf(id) === -1) page.sections.push(id);
      });

      page.body = bodyLines.join('\n').trim();
      return page;
    });
  }

  function validateManifest(manifest) {
    var errors = [];
    if (!manifest || typeof manifest !== 'object') return ['内容清单不是有效对象。'];
    if (Number(manifest.schemaVersion) !== 1) errors.push('不支持的内容清单版本。');
    if (!/^\d+\.\d+$/.test(String(manifest.release || ''))) errors.push('Release 字段无效。');
    if (!Array.isArray(manifest.chapters) || !manifest.chapters.length) errors.push('缺少顶层章节。');
    if (!Array.isArray(manifest.pages) || !manifest.pages.length) errors.push('缺少分页清单。');
    if (!manifest.sourceMarkdown) errors.push('缺少 Markdown 数据源。');
    if (manifest.sourceMarkdown && !isSafeMarkdownSource(manifest.sourceMarkdown)) errors.push('Markdown 数据源必须是站点内的相对 .md 文件。');
    if (!isSafeOfficialUrl(manifest.officialUrl)) errors.push('官方原文链接必须位于 NVIDIA CUDA Programming Guide。');
    if (!isSafeOfficialUrl(manifest.noticesUrl)) errors.push('NVIDIA Notices 链接无效。');

    var routes = {};
    var anchors = {};
    (manifest.pages || []).forEach(function (page, index) {
      var label = '第 ' + (index + 1) + ' 个分页';
      if (!/^\d+\.\d+$/.test(String(page.chapter || ''))) errors.push(label + '的章节号无效。');
      if (page.route !== chapterToRoute(page.chapter)) errors.push(label + '的 route 与章节号不一致。');
      if (page.titleAnchor !== sectionToId(page.chapter)) errors.push(label + '的 titleAnchor 与章节号不一致。');
      if (!page.titleZh || !page.titleEn) errors.push(label + '缺少中英文标题。');
      if (!isSafeOfficialUrl(page.officialSourceUrl || manifest.officialUrl)) errors.push(label + '的官方来源链接无效。');
      if (String(page.topLevelChapter) !== String(page.chapter || '').split('.')[0]) errors.push(label + '的顶层章节映射无效。');
      if (routes[page.route]) errors.push('分页 route 重复：' + page.route);
      if (anchors[page.titleAnchor]) errors.push('标题锚点重复：' + page.titleAnchor);
      routes[page.route] = true;
      anchors[page.titleAnchor] = true;
    });

    if (!manifest.fixture && manifest.expectedCounts) {
      if ((manifest.chapters || []).length !== Number(manifest.expectedCounts.chapters)) errors.push('顶层章节数量与目标不一致。');
      if ((manifest.pages || []).length !== Number(manifest.expectedCounts.pages)) errors.push('分页数量与目标不一致。');
      if ((manifest.figures || []).length !== Number(manifest.expectedCounts.totalFigures)) errors.push('插图数量与目标不一致。');
    }
    return errors;
  }

  function safeLanguage(value) {
    var language = String(value || '').trim().split(/\s+/)[0].toLowerCase();
    var aliases = { sh: 'bash', shell: 'bash', console: 'bash', cxx: 'cpp', cu: 'cpp', cuda: 'cpp', txt: 'plaintext', text: 'plaintext' };
    language = aliases[language] || language || 'plaintext';
    return /^[a-z0-9_+-]+$/.test(language) ? language : 'plaintext';
  }

  function isSafeRelativeImage(source) {
    var value = String(source || '').replace(/^\.\//, '');
    if (value.indexOf('..') !== -1 || value.indexOf('\\') !== -1) return false;
    return /^assets\/(figures|notes)\/[a-zA-Z0-9._/-]+$/.test(value);
  }

  function isSafeMarkdownSource(source) {
    var value = String(source || '').replace(/^\.\//, '');
    if (!value || value.indexOf('..') !== -1 || value.indexOf('\\') !== -1) return false;
    return /^[a-zA-Z0-9._/-]+\.md$/.test(value);
  }

  function isSafeOfficialUrl(source) {
    var prefix = 'https://docs.nvidia.com/cuda/cuda-programming-guide';
    var value = String(source || '').trim().toLowerCase();
    return value === prefix || value.indexOf(prefix + '/') === 0;
  }

  function normalizeAssetPath(source) {
    return String(source || '').replace(/^\.\//, '').replace(/\\/g, '/');
  }

  function findFigureMeta(manifest, source, page) {
    var normalized = normalizeAssetPath(source);
    var figures = manifest && Array.isArray(manifest.figures) ? manifest.figures : [];
    var matches = figures.filter(function (figure) {
      return normalizeAssetPath(figure.file) === normalized;
    });
    var chapter = page && String(page.chapter || '');
    if (chapter) {
      for (var index = 0; index < matches.length; index++) {
        if (String(matches[index].sourcePage || '') === chapter) return matches[index];
      }
    }
    return matches.length ? matches[0] : null;
  }

  function findPageByChapter(pages, chapter) {
    for (var index = 0; index < (pages || []).length; index++) {
      if (String(pages[index].chapter) === String(chapter)) return pages[index];
    }
    return null;
  }

  function findPageBySection(pages, section) {
    var id = trimHash(sectionToId(section));
    for (var index = 0; index < (pages || []).length; index++) {
      if ((pages[index].sections || []).indexOf(id) !== -1) return pages[index];
    }

    var candidates = (pages || []).filter(function (page) {
      return section === page.chapter || section.indexOf(page.chapter + '.') === 0;
    });
    candidates.sort(function (a, b) { return b.chapter.length - a.chapter.length; });
    return candidates[0] || null;
  }

  function mathPlugin(md, katex) {
    function escaped(position, source) {
      var backslashes = 0;
      for (var index = position - 1; index >= 0 && source[index] === '\\'; index--) backslashes++;
      return backslashes % 2 === 1;
    }

    md.inline.ruler.after('escape', 'math_inline', function (state, silent) {
      var start = state.pos;
      if (state.src[start] !== '$' || state.src[start + 1] === '$' || escaped(start, state.src)) return false;

      var end = start + 1;
      while ((end = state.src.indexOf('$', end)) !== -1) {
        if (!escaped(end, state.src)) break;
        end++;
      }
      if (end === -1) return false;

      var content = state.src.slice(start + 1, end);
      if (!content.trim() || /^\s|\s$/.test(content)) return false;
      if (!silent) {
        var token = state.push('math_inline', 'math', 0);
        token.content = content;
      }
      state.pos = end + 1;
      return true;
    });

    md.block.ruler.after('blockquote', 'math_block', function (state, startLine, endLine, silent) {
      var start = state.bMarks[startLine] + state.tShift[startLine];
      var maximum = state.eMarks[startLine];
      var first = state.src.slice(start, maximum).trim();
      if (first.slice(0, 2) !== '$$') return false;
      if (silent) return true;

      var content = [];
      var nextLine = startLine;
      var remainder = first.slice(2);
      if (/\$\$$/.test(remainder)) {
        content.push(remainder.replace(/\$\$$/, '').trim());
        nextLine++;
      } else {
        if (remainder.trim()) content.push(remainder);
        nextLine++;
        while (nextLine < endLine) {
          var lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
          var lineEnd = state.eMarks[nextLine];
          var line = state.src.slice(lineStart, lineEnd);
          if (/\$\$\s*$/.test(line)) {
            content.push(line.replace(/\$\$\s*$/, ''));
            nextLine++;
            break;
          }
          content.push(line);
          nextLine++;
        }
      }

      var token = state.push('math_block', 'math', 0);
      token.block = true;
      token.map = [startLine, nextLine];
      token.content = content.join('\n').trim();
      state.line = nextLine;
      return true;
    }, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });

    function renderMath(content, displayMode) {
      if (!katex || typeof katex.renderToString !== 'function') {
        return '<code class="math-error">' + md.utils.escapeHtml(content) + '</code>';
      }
      try {
        return katex.renderToString(content, {
          displayMode: displayMode,
          throwOnError: false,
          strict: 'warn',
          trust: false,
          output: 'htmlAndMathml'
        });
      } catch (error) {
        return '<code class="math-error">' + md.utils.escapeHtml(content) + '</code>';
      }
    }

    md.renderer.rules.math_inline = function (tokens, index) {
      return '<span class="math-inline">' + renderMath(tokens[index].content, false) + '</span>';
    };
    md.renderer.rules.math_block = function (tokens, index) {
      return '<div class="math-display">' + renderMath(tokens[index].content, true) + '</div>\n';
    };
  }

  function githubAlertsPlugin(md) {
    var labels = { NOTE: 'Note', TIP: 'Tip', IMPORTANT: 'Important', WARNING: 'Warning', CAUTION: 'Caution' };

    function stripPrefix(inlineToken, type) {
      inlineToken.content = inlineToken.content.replace(new RegExp('^\\[!' + type + '\\]\\s*(?:\\n|$)', 'i'), '');
      var children = inlineToken.children || [];
      for (var index = 0; index < children.length; index++) {
        if (children[index].type !== 'text') continue;
        var pattern = new RegExp('^\\[!' + type + '\\]\\s*', 'i');
        if (!pattern.test(children[index].content)) return;
        children[index].content = children[index].content.replace(pattern, '');
        if (!children[index].content) {
          children.splice(index, 1);
          if (children[index] && children[index].type === 'softbreak') children.splice(index, 1);
        }
        return;
      }
    }

    md.core.ruler.after('inline', 'github_alerts', function (state) {
      var tokens = state.tokens;
      for (var index = 0; index < tokens.length; index++) {
        if (tokens[index].type !== 'blockquote_open') continue;
        var closeIndex = -1;
        var depth = 0;
        for (var cursor = index + 1; cursor < tokens.length; cursor++) {
          if (tokens[cursor].type === 'blockquote_open') depth++;
          if (tokens[cursor].type === 'blockquote_close') {
            if (depth === 0) {
              closeIndex = cursor;
              break;
            }
            depth--;
          }
        }
        if (closeIndex < 0) continue;

        var inlineIndex = -1;
        for (var child = index + 1; child < closeIndex; child++) {
          if (tokens[child].type === 'inline') {
            inlineIndex = child;
            break;
          }
        }
        if (inlineIndex < 0) continue;
        var match = tokens[inlineIndex].content.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s|$)/i);
        if (!match) continue;

        var type = match[1].toUpperCase();
        stripPrefix(tokens[inlineIndex], type);
        tokens[index].meta = tokens[index].meta || {};
        tokens[closeIndex].meta = tokens[closeIndex].meta || {};
        tokens[index].meta.alertType = type;
        tokens[closeIndex].meta.alertType = type;
      }
    });

    md.renderer.rules.blockquote_open = function (tokens, index, options, env, renderer) {
      var type = tokens[index].meta && tokens[index].meta.alertType;
      if (!type) return renderer.renderToken(tokens, index, options);
      return '<aside class="markdown-alert markdown-alert-' + type.toLowerCase() + '" role="note"><p class="markdown-alert-title">' + labels[type] + '</p>\n';
    };
    md.renderer.rules.blockquote_close = function (tokens, index, options, env, renderer) {
      if (tokens[index].meta && tokens[index].meta.alertType) return '</aside>\n';
      return renderer.renderToken(tokens, index, options);
    };
  }

  function createMarkdownRenderer(runtimeRoot) {
    if (!runtimeRoot || typeof runtimeRoot.markdownit !== 'function') throw new Error('markdown-it 未加载。');

    var md = runtimeRoot.markdownit({
      html: false,
      linkify: true,
      typographer: false,
      breaks: false
    });

    var footnote = runtimeRoot.markdownitFootnote || runtimeRoot.markdownItFootnote;
    if (typeof footnote !== 'function') throw new Error('markdown-it-footnote 未加载。');
    md.use(footnote);
    mathPlugin(md, runtimeRoot.katex);
    githubAlertsPlugin(md);

    md.core.ruler.after('inline', 'dedupe_generated_figure_captions', function (state) {
      var tokens = state.tokens;
      var index = 0;
      while (index <= tokens.length - 6) {
        var imageOpen = tokens[index];
        var imageInline = tokens[index + 1];
        var imageClose = tokens[index + 2];
        var captionOpen = tokens[index + 3];
        var captionInline = tokens[index + 4];
        var captionClose = tokens[index + 5];
        var imageChildren = imageInline && imageInline.children;
        var imageSource = imageChildren && imageChildren.length === 1 && imageChildren[0].type === 'image'
          ? imageChildren[0].attrGet('src') || ''
          : '';
        var imageAlt = imageSource ? imageChildren[0].content.trim() : '';
        var figureMeta = findFigureMeta(
          state.env && state.env.manifest,
          imageSource,
          state.env && state.env.page
        );
        var captionMarkdown = captionInline && captionInline.type === 'inline'
          ? captionInline.content.trim()
          : '';
        var captionText = /^\*[^*]+\*$/.test(captionMarkdown)
          ? captionMarkdown.slice(1, -1).trim()
          : '';
        var isStandaloneImage = imageOpen.type === 'paragraph_open' &&
          imageInline.type === 'inline' &&
          imageClose.type === 'paragraph_close' &&
          imageChildren && imageChildren.length === 1 &&
          imageChildren[0].type === 'image' &&
          isSafeRelativeImage(imageSource);
        var isGeneratedCaption = captionOpen.type === 'paragraph_open' &&
          captionInline.type === 'inline' &&
          captionClose.type === 'paragraph_close' &&
          Boolean(captionText) && (
            captionText === imageAlt ||
            (figureMeta && captionText === String(figureMeta.captionZh || '').trim()) ||
            (figureMeta && captionText === String(figureMeta.altZh || '').trim()) ||
            /^(?:图\s*\d+|译者补充图)/.test(captionText)
          );

        if (isStandaloneImage && isGeneratedCaption) {
          tokens.splice(index + 3, 3);
          continue;
        }
        index++;
      }
    });

    md.core.ruler.push('numeric_heading_ids', function (state) {
      var used = {};
      for (var index = 0; index < state.tokens.length - 1; index++) {
        var open = state.tokens[index];
        var inline = state.tokens[index + 1];
        if (open.type !== 'heading_open' || inline.type !== 'inline') continue;

        var numeric = inline.content.match(/^(\d+(?:\.\d+)*)(?:\.)?\s+/);
        var base = numeric
          ? trimHash(sectionToId(numeric[1]))
          : 'heading-' + trimHash((state.env.page && state.env.page.route) || 'page') + '-' + (index + 1);
        var id = base;
        var suffix = 2;
        while (used[id]) {
          id = base + '-' + suffix;
          suffix++;
        }
        used[id] = true;
        open.attrSet('id', id);
      }
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

    md.renderer.rules.table_open = function () { return '<div class="table-wrap" role="region" aria-label="可横向滚动的表格" tabindex="0"><table>\n'; };
    md.renderer.rules.table_close = function () { return '</table></div>\n'; };

    md.renderer.rules.image = function (tokens, index, options, env) {
      var token = tokens[index];
      var source = token.attrGet('src') || '';
      if (!isSafeRelativeImage(source)) {
        return '<p class="image-error" role="alert">图片路径被拒绝：仅允许 <code>assets/figures/</code> 与 <code>assets/notes/</code> 下的相对资源。</p>';
      }

      var meta = findFigureMeta(env.manifest, source, env.page);
      var markdownAlt = token.content || '';
      var alt = meta && meta.altZh ? meta.altZh : markdownAlt;
      var caption = meta && meta.captionZh ? meta.captionZh : alt;
      if (!String(alt || '').trim() || !String(caption || '').trim()) {
        return '<p class="image-error" role="alert">图片缺少中文替代文本，已停止渲染。</p>';
      }

      var safeSource = md.utils.escapeHtml(source);
      var safeAlt = md.utils.escapeHtml(alt);
      var safeCaption = md.utils.escapeHtml(caption);
      var noteClass = normalizeAssetPath(source).indexOf('assets/notes/') === 0 ? ' is-note' : '';
      return '<figure class="figure' + noteClass + '"><a href="' + safeSource + '" target="_blank" rel="noopener noreferrer" aria-label="查看原图：' + safeCaption + '"><img src="' + safeSource + '" alt="' + safeAlt + '" loading="lazy" decoding="async"></a><figcaption>' + safeCaption + '</figcaption></figure>';
    };

    function renderFence(tokens, index) {
      var token = tokens[index];
      var language = safeLanguage(token.info);
      var highlighted = '';
      if (runtimeRoot.hljs && language !== 'plaintext' && runtimeRoot.hljs.getLanguage(language)) {
        try {
          highlighted = runtimeRoot.hljs.highlight(token.content, { language: language, ignoreIllegals: true }).value;
        } catch (error) {
          highlighted = md.utils.escapeHtml(token.content);
        }
      } else {
        highlighted = md.utils.escapeHtml(token.content);
      }
      return '<div class="code-block"><div class="code-language"><span>' + escapeHtml(language) + '</span><button class="copy-code-button" type="button" data-copy-code aria-label="复制代码">复制</button></div><pre><code class="hljs language-' + escapeHtml(language) + '">' + highlighted + '</code></pre></div>\n';
    }

    md.renderer.rules.fence = renderFence;
    md.renderer.rules.code_block = function (tokens, index) {
      tokens[index].info = 'plaintext';
      return renderFence(tokens, index);
    };

    return md;
  }

  function bootstrap() {
    var document = root.document;
    var elements = {
      app: document.getElementById('docs-app'),
      content: document.getElementById('article-content'),
      loadStatus: document.getElementById('load-status'),
      pageNav: document.getElementById('page-nav'),
      outline: document.getElementById('outline-links'),
      pagination: document.getElementById('page-pagination'),
      docsTitle: document.getElementById('docs-title'),
      docsRelease: document.getElementById('docs-release'),
      releaseBadge: document.getElementById('release-badge'),
      officialLink: document.getElementById('official-link'),
      noticesLink: document.getElementById('notices-link'),
      mobileToggle: document.getElementById('mobile-nav-toggle'),
      overlay: document.getElementById('docs-overlay'),
      progress: document.getElementById('reading-progress'),
      progressValue: document.getElementById('reading-progress-value'),
      progressLabel: document.getElementById('reading-progress-label'),
      commentsSection: document.getElementById('comments-section'),
      commentsThread: document.getElementById('comments-thread')
    };
    if (!elements.content || !elements.pageNav || !elements.outline || !elements.pagination) return;

    var state = {
      manifest: null,
      pages: [],
      markdown: null,
      currentPage: null,
      outlineObserver: null,
      md: null,
      circleLength: 2 * Math.PI * 21
    };

    function fetchText(url) {
      return root.fetch(url, { credentials: 'same-origin', cache: 'no-store' }).then(function (response) {
        if (!response.ok) throw new Error(url + ' 请求失败（HTTP ' + response.status + '）。');
        return response.text();
      });
    }

    function closeMobileNavigation(restoreFocus) {
      document.body.classList.remove('nav-open');
      if (elements.mobileToggle) elements.mobileToggle.setAttribute('aria-expanded', 'false');
      if (restoreFocus && elements.mobileToggle) elements.mobileToggle.focus();
    }

    function currentChapterMeta(number) {
      var chapters = state.manifest.chapters || [];
      for (var index = 0; index < chapters.length; index++) {
        if (String(chapters[index].number) === String(number)) return chapters[index];
      }
      return null;
    }

    function buildNavigation() {
      elements.pageNav.innerHTML = '';
      var grouped = {};
      state.pages.forEach(function (page) {
        var key = String(page.topLevelChapter);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(page);
      });

      (state.manifest.chapters || []).forEach(function (chapter) {
        var pages = grouped[String(chapter.number)] || [];
        if (!pages.length) return;

        var group = document.createElement('section');
        group.className = 'page-nav-group';
        var heading = document.createElement('p');
        heading.className = 'page-nav-chapter';
        heading.textContent = chapter.number + ' · ' + chapter.titleZh;
        group.appendChild(heading);

        pages.forEach(function (page) {
          var link = document.createElement('a');
          link.href = page.route;
          link.className = 'page-nav-link';
          link.dataset.route = page.route;
          var number = document.createElement('span');
          number.className = 'page-nav-number';
          number.textContent = page.chapter;
          var title = document.createElement('span');
          title.textContent = page.titleZh;
          link.appendChild(number);
          link.appendChild(title);
          group.appendChild(link);
        });
        elements.pageNav.appendChild(group);
      });
    }

    function syncActiveNavigation() {
      Array.prototype.forEach.call(elements.pageNav.querySelectorAll('a[data-route]'), function (link) {
        var active = state.currentPage && link.dataset.route === state.currentPage.route;
        link.classList.toggle('is-active', active);
        if (active) {
          link.setAttribute('aria-current', 'page');
          link.scrollIntoView({ block: 'nearest' });
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    function setActiveOutline(id) {
      Array.prototype.forEach.call(elements.outline.querySelectorAll('a'), function (link) {
        link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
      });
    }

    function buildOutline() {
      if (state.outlineObserver) {
        state.outlineObserver.disconnect();
        state.outlineObserver = null;
      }

      var headings = Array.prototype.slice.call(elements.content.querySelectorAll('.doc-page-body h2, .doc-page-body h3, .doc-page-body h4, .doc-page-body h5'));
      elements.outline.innerHTML = '';
      if (!headings.length) {
        var empty = document.createElement('p');
        empty.className = 'outline-empty';
        empty.textContent = '本页暂无子标题';
        elements.outline.appendChild(empty);
        return;
      }

      headings.forEach(function (heading) {
        var link = document.createElement('a');
        link.href = '#' + heading.id;
        link.className = 'outline-link outline-level-' + heading.tagName.slice(1);
        link.textContent = heading.textContent;
        elements.outline.appendChild(link);
      });
      setActiveOutline(headings[0].id);

      if (!('IntersectionObserver' in root)) return;
      state.outlineObserver = new root.IntersectionObserver(function (entries) {
        var visible = entries.filter(function (entry) { return entry.isIntersecting; });
        if (!visible.length) return;
        visible.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
        setActiveOutline(visible[0].target.id);
      }, { rootMargin: '-94px 0px -68% 0px', threshold: [0, 1] });
      headings.forEach(function (heading) { state.outlineObserver.observe(heading); });
    }

    function paginationLink(page, direction) {
      if (!page) {
        var spacer = document.createElement('span');
        spacer.className = 'pagination-spacer';
        spacer.setAttribute('aria-hidden', 'true');
        return spacer;
      }
      var link = document.createElement('a');
      link.href = page.route;
      link.className = direction;
      var label = document.createElement('span');
      label.className = 'pagination-label';
      label.textContent = direction === 'previous' ? '← 上一页' : '下一页 →';
      var title = document.createElement('span');
      title.className = 'pagination-title';
      title.textContent = page.chapter + ' ' + page.titleZh;
      link.appendChild(label);
      link.appendChild(title);
      return link;
    }

    function buildPagination() {
      elements.pagination.innerHTML = '';
      var index = state.currentPage.index;
      elements.pagination.appendChild(paginationLink(state.pages[index - 1], 'previous'));
      elements.pagination.appendChild(paginationLink(state.pages[index + 1], 'next'));
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
        try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
        document.body.removeChild(textarea);
        if (copied) resolve();
        else reject(new Error('copy failed'));
      });
    }

    function copyText(text) {
      if (root.navigator.clipboard && root.isSecureContext) {
        return root.navigator.clipboard.writeText(text).catch(function () { return fallbackCopy(text); });
      }
      return fallbackCopy(text);
    }

    function bindCodeCopy() {
      Array.prototype.forEach.call(elements.content.querySelectorAll('[data-copy-code]'), function (button) {
        button.addEventListener('click', function () {
          var code = button.closest('.code-block').querySelector('code');
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

    function syncComments(page) {
      var repo = String(state.manifest.commentsRepo || '');
      if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
        elements.commentsSection.hidden = true;
        return;
      }

      elements.commentsSection.hidden = false;
      elements.commentsThread.innerHTML = '';
      var script = document.createElement('script');
      script.src = 'https://utteranc.es/client.js';
      script.setAttribute('repo', repo);
      script.setAttribute('issue-term', 'cuda-pg-' + state.manifest.release + '-page-' + page.chapter);
      script.setAttribute('label', 'documentation');
      script.setAttribute('theme', 'github-light');
      script.setAttribute('crossorigin', 'anonymous');
      script.async = true;
      elements.commentsThread.appendChild(script);
    }

    function updateReadingProgress() {
      if (!elements.progress || !elements.progressValue || !elements.progressLabel || !state.currentPage) return;
      var rect = elements.content.getBoundingClientRect();
      var pageTop = rect.top + root.scrollY - 94;
      var pageBottom = pageTop + elements.content.offsetHeight - root.innerHeight * .35;
      var span = Math.max(1, pageBottom - pageTop);
      var percent = Math.round(((root.scrollY - pageTop) / span) * 100);
      percent = Math.max(0, Math.min(100, percent));
      elements.progressValue.style.strokeDasharray = String(state.circleLength);
      elements.progressValue.style.strokeDashoffset = String(state.circleLength * (1 - percent / 100));
      elements.progressLabel.textContent = percent + '%';
      elements.progress.setAttribute('aria-label', '本页已阅读 ' + percent + '%，返回页面顶部');
    }

    function renderPage(page, targetId) {
      state.currentPage = page;
      var chapter = currentChapterMeta(page.topLevelChapter);
      var chapterTitle = chapter ? chapter.titleZh : 'CUDA Programming Guide';
      var body = state.md.render(page.body || '', { page: page, manifest: state.manifest });
      var exerciseCta = renderExerciseCta(page.chapter);

      elements.content.innerHTML =
        '<header class="doc-page-header">' +
          '<p class="doc-page-kicker">' + escapeHtml(chapterTitle) + ' · 第 ' + (page.index + 1) + ' / ' + state.pages.length + ' 页</p>' +
          '<h1 id="' + escapeHtml(trimHash(page.titleAnchor)) + '">' + escapeHtml(page.chapter + ' ' + page.titleZh) + '</h1>' +
          '<p class="doc-page-subtitle" lang="en">' + escapeHtml(page.titleEn) + '</p>' +
          '<p class="doc-page-source"><a href="' + escapeHtml(page.officialSourceUrl || state.manifest.officialUrl) + '" target="_blank" rel="noopener noreferrer">本页官方英文来源 ↗</a></p>' +
        '</header>' +
        '<div class="doc-page-body">' + body + '</div>' +
        exerciseCta;

      document.title = page.chapter + ' ' + page.titleZh + ' · CUDA Programming Guide v' + state.manifest.release + ' · Kyle';
      elements.officialLink.href = page.officialSourceUrl || state.manifest.officialUrl;
      bindCodeCopy();
      syncActiveNavigation();
      buildOutline();
      buildPagination();
      syncComments(page);
      closeMobileNavigation(false);

      root.requestAnimationFrame(function () {
        var target = targetId ? document.getElementById(targetId) : null;
        if (target) target.scrollIntoView({ block: 'start' });
        else root.scrollTo({ top: 0, left: 0 });
        updateReadingProgress();
      });
    }

    function routeFromHash() {
      var route = parseHash(root.location.hash);
      var page = null;
      var target = null;
      if (route.kind === 'page') page = findPageByChapter(state.pages, route.chapter);
      if (route.kind === 'section') {
        page = findPageBySection(state.pages, route.section);
        target = route.id;
      }
      if (!page) {
        page = state.pages[0];
        if (route.kind !== 'default') root.history.replaceState(null, '', page.route);
      }
      renderPage(page, target);
    }

    function showError(error) {
      if (elements.app) elements.app.setAttribute('aria-busy', 'false');
      elements.loadStatus.hidden = true;
      elements.pageNav.innerHTML = '<p class="nav-loading">目录暂时无法加载。</p>';
      elements.outline.innerHTML = '<p class="outline-empty">当前无可用目录。</p>';
      elements.content.innerHTML = '<div class="load-error" role="alert"><strong>译本加载失败。</strong><br>' + escapeHtml(error && error.message ? error.message : error) + '</div>';
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
    if (elements.overlay) elements.overlay.addEventListener('click', function () { closeMobileNavigation(true); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && document.body.classList.contains('nav-open')) closeMobileNavigation(true);
    });
    if (elements.progress) elements.progress.addEventListener('click', function () { root.scrollTo({ top: 0, behavior: 'smooth' }); });
    root.addEventListener('scroll', updateReadingProgress, { passive: true });
    root.addEventListener('resize', updateReadingProgress);
    root.addEventListener('hashchange', routeFromHash);

    fetchText('./content-manifest.json')
      .then(function (text) {
        state.manifest = JSON.parse(text.replace(/^\uFEFF/, ''));
        var manifestErrors = validateManifest(state.manifest);
        if (manifestErrors.length) throw new Error(manifestErrors.join(' '));
        return fetchText(state.manifest.sourceMarkdown);
      })
      .then(function (markdown) {
        state.md = createMarkdownRenderer(root);
        state.pages = splitMarkdown(markdown, state.manifest.pages);
        if (!state.pages.length) throw new Error('内容清单没有可渲染分页。');

        elements.docsTitle.textContent = state.manifest.titleZh;
        elements.docsRelease.textContent = 'Release ' + state.manifest.release;
        elements.releaseBadge.textContent = 'Release ' + state.manifest.release;
        elements.noticesLink.href = state.manifest.noticesUrl;
        elements.loadStatus.hidden = true;
        if (elements.app) elements.app.setAttribute('aria-busy', 'false');
        buildNavigation();
        routeFromHash();
      })
      .catch(showError);
  }

  return {
    bootstrap: bootstrap,
    chapterToRoute: chapterToRoute,
    sectionToId: sectionToId,
    routeToChapter: routeToChapter,
    idToSection: idToSection,
    parseHash: parseHash,
    extractHeadingNumber: extractHeadingNumber,
    splitMarkdown: splitMarkdown,
    validateManifest: validateManifest,
    createMarkdownRenderer: createMarkdownRenderer,
    isSafeRelativeImage: isSafeRelativeImage,
    isSafeMarkdownSource: isSafeMarkdownSource,
    isSafeOfficialUrl: isSafeOfficialUrl,
    findPageByChapter: findPageByChapter,
    findPageBySection: findPageBySection,
    normalizeAssetPath: normalizeAssetPath,
    getExerciseCta: getExerciseCta,
    renderExerciseCta: renderExerciseCta
  };
});
