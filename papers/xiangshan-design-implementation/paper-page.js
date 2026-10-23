(function () {
    'use strict';

    var content = document.getElementById('article-content');
    var pageNav = document.getElementById('page-nav');
    var outlineLinks = document.getElementById('outline-links');
    var pagination = document.getElementById('page-pagination');
    var docsTitle = document.getElementById('docs-title');
    var chapterCount = document.getElementById('chapter-count');
    var mobileNavToggle = document.getElementById('mobile-nav-toggle');
    var docsOverlay = document.getElementById('docs-overlay');
    var progressButton = document.getElementById('reading-progress');
    var progressValue = document.getElementById('reading-progress-value');
    var progressLabel = document.getElementById('reading-progress-label');
    var themeToggle = document.getElementById('theme-toggle');
    var searchRoot = document.getElementById('paper-search');
    var searchInput = document.getElementById('paper-search-input');
    var searchClear = document.getElementById('paper-search-clear');
    var searchStatus = document.getElementById('paper-search-status');
    var searchResults = document.getElementById('paper-search-results');

    if (!content || !pageNav || !outlineLinks || !pagination) return;

    var pages = [];
    var groups = [];
    var siteTitle = '香山论文阅读';
    var currentPageIndex = 0;
    var outlineObserver = null;
    var circleLength = 2 * Math.PI * 21;
    var md = null;
    var searchRecords = [];
    var visibleSearchResults = [];
    var searchReady = false;
    var searchComposing = false;
    var searchTimer = null;
    var searchedQuery = '';
    var activeSearchIndex = -1;
    var pendingSearchFocusTarget = null;
    var renderVersion = 0;

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function showLoadError(message) {
        setSearchUnavailable('全文检索暂不可用：笔记加载失败，请刷新重试。');
        pageNav.innerHTML = '<p class="nav-loading">目录暂时无法加载。</p>';
        outlineLinks.innerHTML = '<p class="outline-empty">当前无可用目录</p>';
        pagination.innerHTML = '';
        content.innerHTML =
            '<header class="doc-page-header"><p class="doc-page-kicker">XIANGSHAN · PAPER NOTES</p><h1>香山论文阅读</h1></header>' +
            '<div class="load-error" role="alert"><h2>笔记加载失败</h2><p>' + escapeHtml(message) + '</p>' +
            '<a href="./notes.md">直接查看 Markdown 原文</a></div>';
        updateReadingProgress();
    }

    if (!window.markdownit) {
        showLoadError('本地 Markdown 渲染组件未能加载，请刷新页面或查看原文。');
        return;
    }

    md = window.markdownit({
        html: false,
        linkify: true,
        typographer: false
    });

  function mathPlugin(md, katex) {
    function escaped(position, source) {
      var backslashes = 0;
      for (var index = position - 1; index >= 0 && source[index] === '\\'; index--) backslashes++;
      return backslashes % 2 === 1;
    }

    md.inline.ruler.before('escape', 'math_parentheses', function (state, silent) {
      var start = state.pos;
      if (state.src.slice(start, start + 2) !== '\\(' || escaped(start, state.src)) return false;
      var end = state.src.indexOf('\\)', start + 2);
      if (end === -1) return false;
      var content = state.src.slice(start + 2, end);
      if (!content.trim()) return false;
      if (!silent) {
        var token = state.push('math_inline', 'math', 0);
        token.content = content;
      }
      state.pos = end + 2;
      return true;
    });

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
          throwOnError: true,
          strict: 'ignore',
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


    md.use(mathPlugin, window.katex);

    function plainText(value) {
        var node = document.createElement('div');
        node.innerHTML = String(value || '');
        return (node.textContent || node.innerText || '').trim();
    }

    function inlineMarkdown(value) {
        return md.renderInline(String(value || ''));
    }

    function preparePages(markdown) {
        var source = String(markdown || '').replace(/\r\n?/g, '\n');
        var lines = source.split('\n');
        var tokens = md.parse(source, {});
        var chapters = [];
        var introStart = 0;

        // Top-level Markdown tokens exclude heading-like text in code fences and blockquotes.
        tokens.forEach(function (token, index) {
            if (token.type !== 'heading_open' || token.level !== 0 || !token.map) return;
            var titleToken = tokens[index + 1];
            if (!titleToken || titleToken.type !== 'inline') return;
            if (token.tag === 'h1' && !chapters.length) {
                siteTitle = plainText(inlineMarkdown(titleToken.content)) || siteTitle;
                introStart = token.map[1];
            } else if (token.tag === 'h2') {
                chapters.push({ title: titleToken.content, start: token.map[0], bodyStart: token.map[1] });
            }
        });

        var group = { index: 0, title: '论文章节', plainTitle: '论文章节', pages: [] };
        var intro = chapters.length ? lines.slice(introStart, chapters[0].start) : [];
        pages = chapters.map(function (chapter, index) {
            var pageLines = lines.slice(chapter.bodyStart, index + 1 < chapters.length ? chapters[index + 1].start : lines.length);
            // Keep the document introduction, including the original PDF link, in chapter one.
            if (!index && intro.some(function (line) { return line.trim(); })) pageLines = intro.concat(pageLines);
            var titleHtml = inlineMarkdown(chapter.title);
            return {
                index: index,
                route: 'chapter-' + (index + 1),
                title: chapter.title,
                titleHtml: titleHtml,
                plainTitle: plainText(titleHtml),
                lines: pageLines,
                group: group
            };
        });
        if (!pages.length) {
            pages = [{ index: 0, route: 'chapter-1', title: siteTitle, titleHtml: inlineMarkdown(siteTitle),
                plainTitle: siteTitle, lines: lines.slice(introStart), group: group }];
        }
        group.pages = pages;
        groups = [group];
        searchRecords = [];
        pages.forEach(function (page) {
            var fragment = document.createElement('div');
            fragment.innerHTML = md.render(page.lines.join('\n'));
            // Index and render the same fragment, with one shared heading-numbering rule.
            assignHeadingIds(fragment, page.index, false);
            page.bodyHtml = fragment.innerHTML;
            collectSearchRecords(page, fragment);
        });
        if (docsTitle) docsTitle.textContent = siteTitle;
        if (chapterCount) chapterCount.textContent = pages.length + ' 个章节 · 按章阅读';
    }

    function normalizeSearchText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function visitSearchText(node, append, onHeading) {
        if (node.nodeType === 3) {
            append(node.nodeValue);
            return;
        }
        if (node.nodeType !== 1) return;
        var tag = node.tagName;
        if (onHeading && /^H[3-6]$/.test(tag)) {
            onHeading(node);
            return;
        }
        if (/^(SCRIPT|STYLE|BUTTON)$/.test(tag) || node.classList.contains('heading-anchor') ||
            node.classList.contains('code-language')) return;

        if (node.classList.contains('math-inline') || node.classList.contains('math-display')) {
            // KaTeX contains both MathML and HTML; its annotation keeps one copy of the TeX.
            var annotation = node.querySelector('annotation[encoding="application/x-tex"]');
            var tex = annotation ? annotation.textContent : node.textContent;
            append(node.classList.contains('math-display') ? ' ' + tex + ' ' : tex);
            return;
        }
        if (tag === 'IMG') {
            append(' ' + (node.getAttribute('alt') || '') + ' ');
            return;
        }
        if (tag === 'BR' || tag === 'HR') {
            append(' ');
            return;
        }

        var block = /^(P|DIV|UL|OL|LI|BLOCKQUOTE|PRE|TABLE|THEAD|TBODY|TFOOT|TR|TH|TD|DL|DT|DD)$/.test(tag);
        if (block) append(' ');
        Array.prototype.forEach.call(node.childNodes, function (child) {
            visitSearchText(child, append, onHeading);
        });
        if (block) append(' ');
    }

    function searchText(node) {
        var parts = [];
        visitSearchText(node, function (value) { parts.push(value); });
        return normalizeSearchText(parts.join(''));
    }

    function collectSearchRecords(page, fragment) {
        function makeRecord(title, targetId) {
            return { title: title, targetId: targetId, chapter: page.plainTitle,
                pageIndex: page.index, parts: [] };
        }

        var current = makeRecord(normalizeSearchText(page.plainTitle), page.route);
        function finishRecord() {
            current.body = normalizeSearchText(current.parts.join(''));
            current.titleLower = current.title.toLowerCase();
            current.bodyLower = current.body.toLowerCase();
            delete current.parts;
            searchRecords.push(current);
        }

        visitSearchText(fragment, function (value) {
            current.parts.push(value);
        }, function (heading) {
            finishRecord();
            current = makeRecord(searchText(heading), heading.id);
        });
        finishRecord();
    }

    function setSearchOpen(open) {
        if (!searchRoot || !searchInput || !searchResults) return;
        searchRoot.classList.toggle('is-open', Boolean(open));
        searchResults.hidden = !open;
        searchInput.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (!open) {
            activeSearchIndex = -1;
            searchInput.removeAttribute('aria-activedescendant');
            Array.prototype.forEach.call(searchResults.querySelectorAll('.paper-search-result'), function (link) {
                link.classList.remove('is-active');
                link.setAttribute('aria-selected', 'false');
            });
        }
    }

    function cancelSearchTimer() {
        if (searchTimer !== null) window.clearTimeout(searchTimer);
        searchTimer = null;
    }

    function closeSearchResults() {
        var wasPending = searchTimer !== null;
        cancelSearchTimer();
        setSearchOpen(false);
        if (wasPending && searchReady && searchStatus) {
            searchStatus.textContent = '检索已收起，继续输入或聚焦搜索框可再次检索。';
        }
    }

    function resetSearchResults() {
        closeSearchResults();
        searchedQuery = '';
        visibleSearchResults = [];
        if (searchResults) searchResults.innerHTML = '';
        if (searchClear && searchInput) searchClear.hidden = !searchInput.value.length;
        if (searchStatus && searchReady) {
            searchStatus.textContent = '搜索本篇 ' + pages.length + ' 章的标题、正文、表格和代码。';
        }
    }

    function setSearchUnavailable(message) {
        searchReady = false;
        resetSearchResults();
        if (searchInput) searchInput.disabled = true;
        if (searchClear) {
            searchClear.hidden = true;
            searchClear.disabled = true;
        }
        if (searchRoot) searchRoot.setAttribute('aria-busy', 'false');
        if (searchStatus) searchStatus.textContent = message;
    }

    function highlightSearchText(text, query) {
        var value = String(text || '');
        if (!query) return escapeHtml(value);
        var lower = value.toLowerCase();
        var needle = query.toLowerCase();
        var output = '';
        var cursor = 0;
        var index;
        while ((index = lower.indexOf(needle, cursor)) !== -1) {
            output += escapeHtml(value.slice(cursor, index));
            output += '<mark>' + escapeHtml(value.slice(index, index + query.length)) + '</mark>';
            cursor = index + query.length;
        }
        return output + escapeHtml(value.slice(cursor));
    }

    function searchSnippet(record, query) {
        var source = record.body;
        if (!source) return '章节或小节标题命中';
        var index = record.bodyLower.indexOf(query.toLowerCase());
        var start = index < 0 ? 0 : Math.max(0, index - 42);
        var end = Math.min(source.length, index < 0 ? 112 : index + query.length + 70);
        return (start > 0 ? '…' : '') + source.slice(start, end).trim() + (end < source.length ? '…' : '');
    }

    function runSearch() {
        cancelSearchTimer();
        if (!searchReady || !searchInput || !searchResults || searchComposing) return;
        var query = normalizeSearchText(searchInput.value);
        if (searchClear) searchClear.hidden = !searchInput.value.length;
        if (!query) {
            resetSearchResults();
            return;
        }

        var needle = query.toLowerCase();
        var titleMatches = [];
        var bodyMatches = [];
        searchRecords.forEach(function (record) {
            if (record.titleLower.indexOf(needle) !== -1) titleMatches.push(record);
            else if (record.bodyLower.indexOf(needle) !== -1) bodyMatches.push(record);
        });
        visibleSearchResults = titleMatches.concat(bodyMatches);
        searchedQuery = query;
        activeSearchIndex = -1;
        searchInput.removeAttribute('aria-activedescendant');
        searchResults.innerHTML = visibleSearchResults.map(function (record, index) {
            var path = record.targetId === pages[record.pageIndex].route
                ? '第 ' + (record.pageIndex + 1) + ' 章 · 章节正文' : record.chapter;
            return '<a class="paper-search-result" id="paper-search-result-' + index +
                '" role="option" aria-selected="false" data-search-index="' + index +
                '" href="#' + escapeHtml(record.targetId) + '">' +
                '<span class="paper-search-result-title">' + highlightSearchText(record.title, query) + '</span>' +
                '<span class="paper-search-result-path">' + escapeHtml(path) + '</span>' +
                '<span class="paper-search-result-snippet">' + highlightSearchText(searchSnippet(record, query), query) + '</span>' +
                '</a>';
        }).join('');
        searchResults.scrollTop = 0;
        if (searchStatus) {
            searchStatus.textContent = visibleSearchResults.length
                ? '找到 ' + visibleSearchResults.length + ' 条结果 · 本篇 ' + pages.length + ' 章'
                : '没有找到“' + query + '”相关内容。';
        }
        setSearchOpen(visibleSearchResults.length > 0);
    }

    function scheduleSearch() {
        if (!searchReady || !searchInput) return;
        cancelSearchTimer();
        if (searchClear) searchClear.hidden = !searchInput.value.length;
        if (searchComposing) return;
        if (!normalizeSearchText(searchInput.value)) {
            resetSearchResults();
            return;
        }
        setSearchOpen(false);
        if (searchStatus) searchStatus.textContent = '正在检索全文…';
        searchTimer = window.setTimeout(runSearch, 150);
    }

    function updateActiveSearchResult(index) {
        if (!searchResults || !visibleSearchResults.length) return;
        var links = searchResults.querySelectorAll('.paper-search-result');
        activeSearchIndex = (index + links.length) % links.length;
        Array.prototype.forEach.call(links, function (link, linkIndex) {
            var active = linkIndex === activeSearchIndex;
            link.classList.toggle('is-active', active);
            link.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        var active = links[activeSearchIndex];
        searchInput.setAttribute('aria-activedescendant', active.id);
        active.scrollIntoView({ block: 'nearest' });
    }

    function navigateToSearchResult(record) {
        if (!record) return;
        closeSearchResults();
        if (searchInput) searchInput.blur();
        pendingSearchFocusTarget = record.targetId;
        if (decodedHash() === record.targetId) routeFromHash();
        else window.location.hash = record.targetId;
        closeMobileNavigation(false);
    }

    function initializeSearch() {
        if (!searchRoot || !searchInput || !searchClear || !searchStatus || !searchResults) return;
        searchInput.disabled = true;
        searchClear.hidden = true;
        searchRoot.setAttribute('aria-busy', 'true');
        searchStatus.textContent = '正在加载本篇笔记，加载完成后可搜索。';
        setSearchOpen(false);

        searchInput.addEventListener('input', scheduleSearch);
        searchInput.addEventListener('focus', function () {
            if (normalizeSearchText(searchInput.value)) runSearch();
        });
        searchInput.addEventListener('compositionstart', function () {
            searchComposing = true;
            closeSearchResults();
        });
        searchInput.addEventListener('compositionend', function () {
            searchComposing = false;
            scheduleSearch();
        });
        searchInput.addEventListener('keydown', function (event) {
            if (searchComposing || event.isComposing || event.keyCode === 229) return;
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter') return;
            if (searchTimer !== null || normalizeSearchText(searchInput.value) !== searchedQuery ||
                !searchRoot.classList.contains('is-open')) runSearch();
            if (!visibleSearchResults.length) return;
            event.preventDefault();
            if (event.key === 'Enter') {
                navigateToSearchResult(visibleSearchResults[activeSearchIndex < 0 ? 0 : activeSearchIndex]);
            } else {
                var next = event.key === 'ArrowDown' ? activeSearchIndex + 1
                    : activeSearchIndex < 0 ? visibleSearchResults.length - 1 : activeSearchIndex - 1;
                updateActiveSearchResult(next);
            }
        });
        searchClear.addEventListener('click', function () {
            searchInput.value = '';
            resetSearchResults();
            searchInput.focus();
        });
        searchResults.addEventListener('click', function (event) {
            var link = event.target.closest && event.target.closest('.paper-search-result');
            if (!link || !searchResults.contains(link) || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            navigateToSearchResult(visibleSearchResults[Number(link.getAttribute('data-search-index'))]);
        });
        document.addEventListener('click', function (event) {
            if (!searchRoot.contains(event.target)) closeSearchResults();
        });
    }

    if (window.hljs && typeof window.hljs.registerLanguage === 'function') {
        window.hljs.registerLanguage('riscvasm', function (hljs) {
            return {
                name: 'RISC-V Assembly',
                case_insensitive: true,
                keywords: {
                    $pattern: '[A-Za-z][A-Za-z0-9_.]*',
                    keyword: 'add addi addw addiw sub subw mul mulh mulw div divu divw divuw rem remu and andi or ori xor xori sll slli srl srli sra srai slt slti sltu sltiu lui auipc lb lbu lh lhu lw lwu ld sb sh sw sd beq bne blt bge bltu bgeu jal jalr j jr ret call tail mv li la nop fence fence.i ecall ebreak csrr csrw csrrw fadd.s fadd.d fsub.s fsub.d fmul.s fmul.d fdiv.s fdiv.d fsqrt.s fsqrt.d flw fld fsw fsd'
                },
                contains: [
                    hljs.COMMENT('#', '$'),
                    { className: 'variable', begin: /\b(?:[xf](?:[12]?\d|3[01])|zero|ra|sp|gp|tp|[ast]\d+)\b/ },
                    { className: 'symbol', begin: /^[A-Za-z_][\w.]*:/ },
                    hljs.C_NUMBER_MODE
                ]
            };
        });
    }

    function normalizeLanguage(language) {
        var normalized = String(language || '').trim().toLowerCase().replace(/[^a-z0-9_+.-]/g, '');
        if (normalized === 'c++' || normalized === 'cplusplus' || normalized === 'cxx') return 'cpp';
        if (normalized === 'asm' || normalized === 'riscv') return 'riscvasm';
        if (normalized === 'shell' || normalized === 'sh' || normalized === 'zsh') return 'bash';
        if (!normalized) return 'text';
        return normalized;
    }

    function displayLanguage(language) {
        if (language === 'riscvasm') return 'RISC-V';
        if (language === 'cpp') return 'C++';
        if (language === 'bash') return 'Shell';
        if (language === 'console') return 'Console';
        if (language === 'text') return 'Text';
        return language;
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

    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).catch(function () {
                return fallbackCopy(text);
            });
        }
        return fallbackCopy(text);
    }

    function enhanceCodeBlocks() {
        Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body pre > code'), function (code) {
            var pre = code.parentElement;
            if (!pre || (pre.parentElement && pre.parentElement.classList.contains('code-block'))) return;

            var languageMatch = (code.className || '').match(/(?:^|\s)language-([^\s]+)/);
            var language = normalizeLanguage(languageMatch ? languageMatch[1] : '');
            var wrapper = document.createElement('div');
            var toolbar = document.createElement('div');
            var label = document.createElement('span');
            var button = document.createElement('button');

            wrapper.className = 'code-block';
            toolbar.className = 'code-language';
            label.className = 'code-language-text';
            label.textContent = displayLanguage(language);
            button.type = 'button';
            button.className = 'copy-code-button';
            button.textContent = '复制';
            button.setAttribute('aria-label', '复制这段' + displayLanguage(language) + '代码');

            if (language !== 'text' && language !== 'console' && window.hljs &&
                typeof window.hljs.getLanguage === 'function' && window.hljs.getLanguage(language)) {
                code.className = 'language-' + language;
                try { window.hljs.highlightElement(code); }
                catch (error) { code.classList.add('nohighlight'); }
            } else {
                code.classList.add('nohighlight');
            }

            button.addEventListener('click', function () {
                button.disabled = true;
                copyText(code.textContent).then(function () {
                    button.textContent = '已复制';
                    button.classList.add('is-copied');
                    window.setTimeout(function () {
                        button.textContent = '复制';
                        button.classList.remove('is-copied');
                        button.disabled = false;
                    }, 1400);
                }, function () {
                    button.textContent = '复制失败';
                    button.classList.add('is-copy-failed');
                    window.setTimeout(function () {
                        button.textContent = '复制';
                        button.classList.remove('is-copy-failed');
                        button.disabled = false;
                    }, 1800);
                });
            });

            pre.parentNode.insertBefore(wrapper, pre);
            toolbar.appendChild(label);
            toolbar.appendChild(button);
            wrapper.appendChild(toolbar);
            wrapper.appendChild(pre);
        });
    }

    function enhanceTables() {
        Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body table'), function (table) {
            if (table.parentElement && table.parentElement.classList.contains('table-wrap')) return;
            var wrapper = document.createElement('div');
            wrapper.className = 'table-wrap';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });
    }

    function enhanceCallouts() {
        var labels = {
            NOTE: '提示',
            TIP: '技巧',
            IMPORTANT: '重要',
            WARNING: '警告',
            CAUTION: '注意'
        };

        Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body blockquote'), function (quote) {
            var first = quote.firstElementChild;
            if (!first) return;
            var match = first.textContent.trim().match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i);
            if (!match) return;

            var type = match[1].toUpperCase();
            var remaining = first.textContent.replace(match[0], '').trim();
            if (remaining) first.textContent = remaining;
            else first.remove();

            var title = document.createElement('span');
            title.className = 'callout-title';
            title.textContent = labels[type] || type;
            quote.classList.add('callout', 'callout-' + type.toLowerCase());
            quote.insertBefore(title, quote.firstChild);
        });
    }

    function enhanceLinks() {
        Array.prototype.forEach.call(content.querySelectorAll('a[href]'), function (link) {
            var href = link.getAttribute('href') || '';
            if (/^https?:\/\//i.test(href) || /(?:^|\/)paper\.pdf(?:[?#]|$)/i.test(href)) {
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
            }
        });
    }

    function assignHeadingIds(root, pageIndex, addAnchors) {
        var headingIndex = 0;
        Array.prototype.forEach.call(root.querySelectorAll('h3, h4, h5, h6'), function (heading) {
            headingIndex += 1;
            var label = heading.getAttribute('data-outline-label') || heading.textContent.trim();
            heading.id = 'section-' + (pageIndex + 1) + '-' + headingIndex;
            heading.setAttribute('data-outline-label', label);
            if (!addAnchors || heading.querySelector('.heading-anchor')) return;
            var anchor = document.createElement('a');
            anchor.className = 'heading-anchor';
            anchor.href = '#' + heading.id;
            anchor.textContent = '#';
            anchor.setAttribute('aria-label', '定位到“' + label + '”');
            heading.appendChild(anchor);
        });
    }

    function buildPageNavigation() {
        pageNav.innerHTML = groups.map(function (group) {
            var isCurrent = group === pages[currentPageIndex].group ? ' is-current' : '';
            var groupNumber = String(group.index + 1).padStart(2, '0');
            var links = group.pages.map(function (page) {
                var active = page.index === currentPageIndex ? ' is-active' : '';
                var current = page.index === currentPageIndex ? ' aria-current="page"' : '';
                var number = String(page.index + 1).padStart(2, '0');
                return '<a class="page-nav-link' + active + '" href="#' + page.route + '"' + current + '>' +
                    '<span class="page-nav-index">' + number + '</span>' +
                    '<span>' + escapeHtml(page.plainTitle) + '</span></a>';
            }).join('');

            return '<section class="page-nav-group' + isCurrent + '" aria-label="' + escapeHtml(group.plainTitle) + '">' +
                '<h2 class="page-nav-group-title">' + groupNumber + ' · ' + escapeHtml(group.plainTitle) + '</h2>' +
                '<div class="page-nav-group-pages">' + links + '</div></section>';
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

        var headings = Array.prototype.slice.call(content.querySelectorAll('.doc-page-body h3, .doc-page-body h4, .doc-page-body h5, .doc-page-body h6'));
        if (!headings.length) {
            outlineLinks.innerHTML = '<p class="outline-empty">本章暂无子标题</p>';
            return;
        }

        outlineLinks.innerHTML = headings.map(function (heading) {
            var level = heading.tagName.toLowerCase().replace('h', '');
            var label = heading.getAttribute('data-outline-label') || heading.textContent;
            return '<a class="outline-link outline-level-' + level + '" href="#' + escapeHtml(heading.id) + '">' + escapeHtml(label.trim()) + '</a>';
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
            ? '<a class="previous" href="#' + previous.route + '" aria-keyshortcuts="Alt+ArrowLeft"><span class="pagination-label">← 上一章</span><span class="pagination-title">' + escapeHtml(previous.plainTitle) + '</span></a>'
            : '<span class="pagination-spacer" aria-hidden="true"></span>';
        var nextHtml = next
            ? '<a class="next" href="#' + next.route + '" aria-keyshortcuts="Alt+ArrowRight"><span class="pagination-label">下一章 →</span><span class="pagination-title">' + escapeHtml(next.plainTitle) + '</span></a>'
            : '<span class="pagination-spacer" aria-hidden="true"></span>';
        pagination.innerHTML = previousHtml + nextHtml;
    }

    function closeMobileNavigation(restoreFocus) {
        var wasOpen = document.body.classList.contains('nav-open');
        document.body.classList.remove('nav-open');
        if (mobileNavToggle) mobileNavToggle.setAttribute('aria-expanded', 'false');
        if (restoreFocus && wasOpen && mobileNavToggle) mobileNavToggle.focus();
    }

    function renderPage(index, targetId) {
        if (!pages.length) return;

        currentPageIndex = Math.max(0, Math.min(index, pages.length - 1));
        var page = pages[currentPageIndex];
        var version = ++renderVersion;

        content.innerHTML =
            '<header class="doc-page-header">' +
                '<p class="doc-page-kicker">XIANGSHAN · 论文笔记' + ' · 第 ' + (currentPageIndex + 1) + ' / ' + pages.length + ' 章</p>' +
                '<h1 id="' + escapeHtml(page.route) + '">' + page.titleHtml + '</h1>' +
            '</header>' +
            '<div class="doc-page-body">' + page.bodyHtml + '</div>';

        assignHeadingIds(content.querySelector('.doc-page-body'), currentPageIndex, true);
        enhanceCallouts();
        enhanceTables();
        enhanceLinks();
        enhanceCodeBlocks();
        buildPageNavigation();
        buildOutline();
        buildPagination();
        closeMobileNavigation(false);
        document.title = page.plainTitle + ' · 香山论文阅读 · Kyle';

        window.requestAnimationFrame(function () {
            if (version !== renderVersion) return;
            var target = targetId ? document.getElementById(targetId) : null;
            if (target && pendingSearchFocusTarget === target.id) {
                pendingSearchFocusTarget = null;
                target.setAttribute('tabindex', '-1');
                target.focus({ preventScroll: true });
            }
            if (target) target.scrollIntoView({ block: 'start' });
            else window.scrollTo({ top: 0, left: 0 });
            updateReadingProgress();
        });
    }

    function decodedHash() {
        try { return decodeURIComponent(window.location.hash.replace(/^#/, '')); }
        catch (error) { return window.location.hash.replace(/^#/, ''); }
    }

    function routeFromHash() {
        if (!pages.length) return;
        var hash = decodedHash();
        if (pendingSearchFocusTarget && pendingSearchFocusTarget !== hash) pendingSearchFocusTarget = null;
        var pageMatch = hash.match(/^chapter-(\d+)$/);
        var sectionMatch = hash.match(/^section-(\d+)-(\d+)$/);

        if (pageMatch) {
            renderPage(Number(pageMatch[1]) - 1, hash);
            return;
        }

        if (sectionMatch) {
            renderPage(Number(sectionMatch[1]) - 1, hash);
            return;
        }

        // An empty hash is the first chapter; same-page utility links keep the current chapter.
        if (hash && document.getElementById(hash)) {
            document.getElementById(hash).scrollIntoView({ block: 'start' });
            return;
        }
        renderPage(0, null);
    }

    function navigateBy(offset) {
        var targetIndex = currentPageIndex + offset;
        if (targetIndex < 0 || targetIndex >= pages.length) return;
        var route = '#' + pages[targetIndex].route;
        if (window.location.hash === route) renderPage(targetIndex, pages[targetIndex].route);
        else window.location.hash = route;
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

    function applyTheme(theme, persist) {
        var normalized = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', normalized);
        document.documentElement.style.colorScheme = normalized;

        if (themeToggle) {
            var isDark = normalized === 'dark';
            themeToggle.setAttribute('aria-pressed', String(isDark));
            themeToggle.setAttribute('aria-label', isDark ? '切换到日间模式' : '切换到夜览模式');
        }

        if (persist) {
            try { window.localStorage.setItem('paper-note-theme', normalized); }
            catch (error) {}
        }
    }

    initializeSearch();

    if (themeToggle) {
        applyTheme(document.documentElement.getAttribute('data-theme'), false);
        themeToggle.addEventListener('click', function () {
            var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(next, true);
        });
    }

    if (mobileNavToggle) {
        mobileNavToggle.addEventListener('click', function () {
            var open = document.body.classList.toggle('nav-open');
            mobileNavToggle.setAttribute('aria-expanded', String(open));
        });
    }

    if (docsOverlay) docsOverlay.addEventListener('click', function () { closeMobileNavigation(true); });

    document.addEventListener('keydown', function (event) {
        if (searchComposing || event.isComposing || event.keyCode === 229) return;
        var isSearchShortcut = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey &&
            String(event.key).toLowerCase() === 'k';
        if (isSearchShortcut && searchInput && !searchInput.disabled) {
            event.preventDefault();
            if (mobileNavToggle && window.getComputedStyle(mobileNavToggle).display !== 'none') {
                document.body.classList.add('nav-open');
                mobileNavToggle.setAttribute('aria-expanded', 'true');
            }
            searchInput.focus();
            searchInput.select();
            return;
        }
        if (event.key === 'Escape') {
            if (searchTimer !== null || (searchRoot && searchRoot.classList.contains('is-open'))) {
                event.preventDefault();
                closeSearchResults();
                return;
            }
            closeMobileNavigation(true);
            return;
        }

        var target = event.target;
        var editable = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
        if (editable || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            navigateBy(-1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            navigateBy(1);
        }
    });

    if (progressButton) {
        progressButton.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    window.addEventListener('scroll', updateReadingProgress, { passive: true });
    window.addEventListener('resize', updateReadingProgress);
    window.addEventListener('hashchange', routeFromHash);

    fetch('./notes.md?v=20261023a')
        .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.text();
        })
        .then(function (markdown) {
            preparePages(markdown);
            routeFromHash();
            searchReady = true;
            if (searchInput) searchInput.disabled = false;
            if (searchClear) searchClear.disabled = false;
            if (searchRoot) searchRoot.setAttribute('aria-busy', 'false');
            resetSearchResults();
        })
        .catch(function (error) {
            var detail = error && error.message ? '（' + error.message + '）' : '';
            showLoadError('笔记文件暂时无法读取' + detail + '，请稍后刷新或直接查看原文。');
        });
})();
