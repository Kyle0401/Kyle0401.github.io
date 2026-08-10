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

    if (!content || !pageNav || !outlineLinks || !pagination) return;

    var pages = [];
    var groups = [];
    var siteTitle = 'C++语言学习';
    var currentPageIndex = 0;
    var outlineObserver = null;
    var circleLength = 2 * Math.PI * 21;
    var md = null;

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function showLoadError(message) {
        pageNav.innerHTML = '<p class="nav-loading">目录暂时无法加载。</p>';
        outlineLinks.innerHTML = '<p class="outline-empty">当前无可用目录</p>';
        pagination.innerHTML = '';
        content.innerHTML =
            '<header class="doc-page-header"><p class="doc-page-kicker">C++20 · LANGUAGE NOTES</p><h1>C++语言学习</h1></header>' +
            '<div class="load-error" role="alert"><h2>笔记加载失败</h2><p>' + escapeHtml(message) + '</p>' +
            '<a href="./C++语言学习.md">直接查看 Markdown 原文</a></div>';
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

    function plainText(value) {
        var node = document.createElement('div');
        node.innerHTML = String(value || '');
        return (node.textContent || node.innerText || '').trim();
    }

    function inlineMarkdown(value) {
        return md.renderInline(String(value || ''));
    }

    function fenceMarker(line) {
        var match = String(line || '').match(/^\s*(`{3,}|~{3,})/);
        return match ? match[1] : '';
    }

    function hasContent(lines) {
        return lines.some(function (line) { return line.trim(); });
    }

    function preparePages(markdown) {
        var lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
        var currentGroup = null;
        var currentPage = null;
        var introLines = [];
        var pendingGroupLines = [];
        var activeFence = '';

        pages = [];
        groups = [];

        function addLine(line) {
            if (currentPage) currentPage.lines.push(line);
            else if (currentGroup) pendingGroupLines.push(line);
            else introLines.push(line);
        }

        function finishPage() {
            if (!currentPage) return;
            currentPage.index = pages.length;
            currentPage.route = 'chapter-' + (currentPage.index + 1);
            currentPage.titleHtml = inlineMarkdown(currentPage.title);
            currentPage.plainTitle = plainText(currentPage.titleHtml);
            pages.push(currentPage);
            currentPage.group.pages.push(currentPage);
            currentPage = null;
        }

        lines.forEach(function (line) {
            var marker = fenceMarker(line);
            var wasInsideFence = Boolean(activeFence);

            if (activeFence) {
                if (marker && marker.charAt(0) === activeFence.charAt(0) && marker.length >= activeFence.length) {
                    activeFence = '';
                }
            } else if (marker) {
                activeFence = marker;
            }

            if (wasInsideFence || marker) {
                addLine(line);
                return;
            }

            var documentTitle = line.match(/^#\s+(.+)$/);
            if (documentTitle) {
                siteTitle = plainText(inlineMarkdown(documentTitle[1])) || siteTitle;
                return;
            }

            var groupHeading = line.match(/^##\s+(.+)$/);
            if (groupHeading) {
                finishPage();
                currentGroup = {
                    index: groups.length,
                    title: groupHeading[1],
                    plainTitle: plainText(inlineMarkdown(groupHeading[1])),
                    pages: []
                };
                groups.push(currentGroup);
                pendingGroupLines = [];
                return;
            }

            var chapterHeading = line.match(/^###\s+(.+)$/);
            if (chapterHeading) {
                finishPage();

                if (!currentGroup) {
                    currentGroup = {
                        index: groups.length,
                        title: '学习笔记',
                        plainTitle: '学习笔记',
                        pages: []
                    };
                    groups.push(currentGroup);
                }

                var leadingLines = [];
                if (!pages.length && hasContent(introLines)) leadingLines = leadingLines.concat(introLines);
                if (!currentGroup.pages.length && hasContent(pendingGroupLines)) leadingLines = leadingLines.concat(pendingGroupLines);
                introLines = [];
                pendingGroupLines = [];

                currentPage = {
                    title: chapterHeading[1],
                    lines: leadingLines,
                    group: currentGroup
                };
                return;
            }

            addLine(line);
        });

        finishPage();
        groups = groups.filter(function (group) { return group.pages.length; });
        groups.forEach(function (group, index) { group.index = index; });

        if (!pages.length) {
            var fallbackGroup = {
                index: 0,
                title: '学习笔记',
                plainTitle: '学习笔记',
                pages: []
            };
            var fallbackPage = {
                index: 0,
                route: 'chapter-1',
                title: siteTitle,
                titleHtml: inlineMarkdown(siteTitle),
                plainTitle: siteTitle,
                lines: lines.filter(function (line) { return !/^#\s+/.test(line); }),
                group: fallbackGroup
            };
            fallbackGroup.pages.push(fallbackPage);
            groups = [fallbackGroup];
            pages = [fallbackPage];
        }

        if (docsTitle) docsTitle.textContent = siteTitle;
        if (chapterCount) chapterCount.textContent = groups.length + ' 个分组 · ' + pages.length + ' 个章节';
    }

    function normalizeLanguage(language) {
        var normalized = String(language || '').trim().toLowerCase().replace(/[^a-z0-9_+.-]/g, '');
        if (normalized === 'c++' || normalized === 'cplusplus' || normalized === 'cxx') return 'cpp';
        if (normalized === 'shell' || normalized === 'sh' || normalized === 'zsh') return 'bash';
        if (!normalized) return 'text';
        return normalized;
    }

    function displayLanguage(language) {
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
            if (/^https?:\/\//i.test(href)) {
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
            }
        });
    }

    function assignHeadingIds() {
        var headingIndex = 0;
        Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body h4, .doc-page-body h5, .doc-page-body h6'), function (heading) {
            headingIndex += 1;
            var label = heading.textContent.trim();
            var anchor = document.createElement('a');
            heading.id = 'section-' + (currentPageIndex + 1) + '-' + headingIndex;
            heading.setAttribute('data-outline-label', label);
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

        var headings = Array.prototype.slice.call(content.querySelectorAll('.doc-page-body h4, .doc-page-body h5, .doc-page-body h6'));
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
        var bodyHtml = md.render(page.lines.join('\n'));

        content.innerHTML =
            '<header class="doc-page-header">' +
                '<p class="doc-page-kicker">C++20 · ' + escapeHtml(page.group.plainTitle) + ' · 第 ' + (currentPageIndex + 1) + ' / ' + pages.length + ' 章</p>' +
                '<h1 id="' + escapeHtml(page.route) + '">' + page.titleHtml + '</h1>' +
            '</header>' +
            '<div class="doc-page-body">' + bodyHtml + '</div>';

        assignHeadingIds();
        enhanceCallouts();
        enhanceTables();
        enhanceLinks();
        enhanceCodeBlocks();
        buildPageNavigation();
        buildOutline();
        buildPagination();
        closeMobileNavigation(false);
        document.title = page.plainTitle + ' · C++语言学习 · Kyle';

        window.requestAnimationFrame(function () {
            var target = targetId ? document.getElementById(targetId) : null;
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
        var hash = decodedHash();
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

        renderPage(currentPageIndex, null);
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
            try { window.localStorage.setItem('cpp-language-theme', normalized); }
            catch (error) {}
        }
    }

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
        if (event.key === 'Escape') {
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

    function addBlockScopeSection(markdown) {
        if (markdown.indexOf('#### 4.1 块（compound statement）与块作用域（block scope）') !== -1) return markdown;

        var blockScopeSection = [
            '#### 4.1 块（compound statement）与块作用域（block scope）',
            '',
            '在 C++ 中，一对花括号 `{ ... }` 可以组成一个 **compound statement（复合语句，也常简称 block，块）**。块不仅可以用于 `if`、`for`、`while`、函数体等结构，也可以单独出现。',
            '',
            '```cpp',
            '{',
            '    int x = 10;',
            '}',
            '```',
            '',
            '这种单独的 `{ ... }` 并不只是为了视觉上的代码分组，它还会建立一个新的 **block scope（块作用域）**。在块中声明的普通局部变量，其名字通常只能在该块以及它内部更深的嵌套块中使用。',
            '',
            '例如：',
            '',
            '```cpp',
            '{',
            '    int x = 10;',
            '    std::cout << x;   // 正确：x 仍在作用域内',
            '}',
            '',
            '// std::cout << x;    // 错误：x 已经离开作用域',
            '```',
            '',
            '可以把嵌套作用域理解为“里面能看到外面，外面看不到里面”：',
            '',
            '```cpp',
            '{',
            '    int a = 1;',
            '',
            '    {',
            '        int b = 2;',
            '        std::cout << a << b;  // a、b 都可以访问',
            '    }',
            '',
            '    std::cout << a;           // 可以访问 a',
            '    // std::cout << b;        // 错误：b 已离开作用域',
            '}',
            '```',
            '',
            '块作用域还会影响自动存储期对象的生命周期。对于在块内创建的普通局部对象，当程序正常执行离开这个块时，对象会被析构。',
            '',
            '```cpp',
            '{',
            '    std::vector<int> vec{1, 2, 3, 4, 5};',
            '    // 使用 vec',
            '} // vec 的生命周期在这里结束，析构函数被调用',
            '```',
            '',
            '因此练习题中经常会看到下面这样的结构：',
            '',
            '```cpp',
            '{',
            '    std::vector vec{1, 2, 3, 4, 5};',
            '',
            '    {',
            '        // 测试初始状态',
            '    }',
            '',
            '    {',
            '        vec.push_back(6);',
            '        // 测试 push_back / pop_back',
            '    }',
            '',
            '    {',
            '        // 继续测试同一个 vec',
            '    }',
            '}',
            '```',
            '',
            '这里内层的 `{ ... }` 主要用于**组织不同测试逻辑，并限制其中临时变量的作用域**；它们不会销毁定义在外层作用域中的 `vec`。只有执行到最外层对应的 `}` 时，这个 `vec` 的生命周期才结束。',
            '',
            '> [!IMPORTANT]',
            '> `{ ... }` 既可以起到代码分组的作用，也具有真正的 C++ 语义：它形成块作用域，并影响局部名字的可见范围以及自动存储期对象的生命周期。',
            '',
            '参考：[cppreference：Statements - Compound statements](https://en.cppreference.com/w/cpp/language/statements)、[cppreference：Scope - Block scope](https://en.cppreference.com/w/cpp/language/scope)。',
            ''
        ].join('\n');

        return markdown.replace(
            '\n### 5、函数',
            '\n\n' + blockScopeSection + '\n### 5、函数'
        );
    }

    function addArraySection(markdown) {
        if (markdown.indexOf('#### 13.1 `std::array`：固定大小连续容器') !== -1) return markdown;

        var arraySection = [
            '#### 13.1 `std::array`：固定大小连续容器',
            '',
            '`std::array<T, N>` 是 C++11 提供的固定大小容器，定义在 `<array>` 中。它保存恰好 `N` 个 `T` 类型元素，元素在内存中连续存储，并提供和其他标准容器相似的接口。',
            '',
            '```cpp',
            '#include <array>',
            '',
            'std::array<int, 5> arr{{1, 2, 3, 4, 5}};',
            '```',
            '',
            '这里 `int` 是元素类型，`5` 是数组长度，同时也是模板参数的一部分，因此 `std::array<int, 5>` 与 `std::array<int, 6>` 是不同类型。',
            '',
            '##### 13.1.1 `size()`：取得元素个数',
            '',
            '`size()` 返回容器中保存的**元素个数**：',
            '',
            '```cpp',
            'std::array<int, 5> arr{{1, 2, 3, 4, 5}};',
            '',
            'arr.size();  // 5',
            '```',
            '',
            '因此：',
            '',
            '```cpp',
            'ASSERT(arr.size() == 5, "size should be 5");',
            '```',
            '',
            '需要特别区分 `arr.size()` 与 `sizeof(arr)`：',
            '',
            '| 表达式 | 含义 | 本例结果 |',
            '| --- | --- | --- |',
            '| `arr.size()` | 元素数量 | `5` |',
            '| `sizeof(arr)` | 整个 `std::array` 对象占用的字节数 | `5 * sizeof(int)` |',
            '',
            '`size()` 的单位是“元素”，而 `sizeof` 的单位是“字节”。不要因为本例恰好满足 `sizeof(arr) == arr.size() * sizeof(int)`，就把二者理解成同一个概念。',
            '',
            '##### 13.1.2 `data()`：取得连续元素的首地址',
            '',
            '`std::array` 本身是一个容器对象，不会像内置数组那样在普通表达式中自动退化成元素指针。需要把底层连续元素交给只接受指针的接口时，可以调用：',
            '',
            '```cpp',
            'arr.data()',
            '```',
            '',
            '对于非 `const std::array<int, 5>`，返回类型是 `int*`，指向第一个元素；对于 `const` 对象则返回 `const int*`。当数组非空时，可以把它近似理解为：',
            '',
            '```cpp',
            'arr.data() == &arr[0]',
            '```',
            '',
            '例如：',
            '',
            '```cpp',
            'std::array<int, 5> arr{{1, 2, 3, 4, 5}};',
            'int ans[]{1, 2, 3, 4, 5};',
            '',
            'ASSERT(',
            '    std::memcmp(arr.data(), ans, 5 * sizeof(int)) == 0,',
            '    "The object representations should match."',
            ');',
            '```',
            '',
            '这里三个参数分别表示：',
            '',
            '```text',
            'arr.data()       → 第一块内存的起始地址',
            'ans              → 第二块内存的起始地址；内置数组在这里退化为指向首元素的指针',
            '5 * sizeof(int)  → 比较的字节数',
            '```',
            '',
            '`std::memcmp` 的第三个参数单位是**字节**，不是元素个数。两个 `int[5]` 所占的元素存储共有 `5 * sizeof(int)` 字节，因此这里必须传入对应的字节数。',
            '',
            '`std::memcmp(...) == 0` 表示指定范围内的**对象表示（字节序列）完全相同**。',
            '',
            '> [!WARNING]',
            '> `memcmp` 比较的是字节表示，不是 C++ 意义上的通用“元素值相等”操作。对于含填充字节、指针、浮点特殊表示或具有非平凡语义的类型，字节相同与值相等不能简单等同。比较普通标准容器的元素值时通常优先使用 `operator==`；这里使用 `memcmp` 是为了理解连续存储、`data()` 和字节数参数。',
            '',
            '因此这道题中的核心关系可以记成：',
            '',
            '```text',
            'size()  → 有多少个元素',
            'data()  → 元素从哪里开始存',
            'sizeof  → 占多少个字节',
            'memcmp  → 从两个地址开始逐字节比较指定长度',
            '```',
            '',
            '参考：[cppreference：`std::array`](https://en.cppreference.com/w/cpp/container/array)、[cppreference：`std::array::size`](https://en.cppreference.com/w/cpp/container/array/size)、[cppreference：`std::array::data`](https://en.cppreference.com/w/cpp/container/array/data)、[cppreference：`std::memcmp`](https://en.cppreference.com/w/cpp/string/byte/memcmp)。',
            ''
        ].join('\n');

        return markdown.replace(
            '\n### 14、类型别名声明（using别名）',
            '\n\n' + arraySection + '\n### 14、类型别名声明（using别名）'
        );
    }

    function addVectorDataSection(markdown) {
        if (markdown.indexOf('#### 13.2 `std::vector::data()`：取得底层连续存储的首地址') !== -1) return markdown;

        var vectorDataSection = [
            '#### 13.2 `std::vector::data()`：取得底层连续存储的首地址',
            '',
            '`std::vector` 会把元素连续存储在一块动态分配的内存中。`data()` 用于取得这块连续元素存储区域的起始地址，也就是指向第一个元素的指针。',
            '',
            '例如：',
            '',
            '```cpp',
            '#include <vector>',
            '',
            'std::vector vec{1, 2, 3, 4, 5};',
            '```',
            '',
            '这里通过类模板实参推导得到的类型是：',
            '',
            '```cpp',
            'std::vector<int>',
            '```',
            '',
            '因此：',
            '',
            '```cpp',
            'vec.data()',
            '```',
            '',
            '对于这个非 `const std::vector<int>`，返回类型是：',
            '',
            '```cpp',
            'int*',
            '```',
            '',
            '它指向 `vec` 的第一个元素。当 `vec` 非空时，可以把它理解为：',
            '',
            '```cpp',
            'vec.data() == &vec[0]',
            '```',
            '',
            '因此可以把 `vector` 底层的连续元素交给需要原始指针的接口。例如：',
            '',
            '```cpp',
            'std::vector vec{1, 2, 3, 4, 5};',
            'int ans[]{1, 2, 3, 4, 5};',
            '',
            'ASSERT(',
            '    std::memcmp(vec.data(), ans, sizeof(ans)) == 0,',
            '    "The object representations should match."',
            ');',
            '```',
            '',
            '这里：',
            '',
            '```text',
            'vec.data()  → vector 底层连续元素的首地址',
            'ans         → 内置数组在函数调用中退化为指向首元素的指针',
            'sizeof(ans) → 整个 ans 数组占用的字节数',
            '```',
            '',
            '> [!IMPORTANT]',
            '> `vec.data()` 指向的是 **vector 管理的元素存储区域**，并不是 `std::vector` 管理对象本身的地址。因此 `sizeof(vec)` 与 `vec.data()` 所指向的动态元素区域大小是两个不同概念。',
            '',
            '还要注意，可能导致 `vector` 重新分配存储空间的操作（例如容量不足时的 `push_back`、某些 `insert`、`reserve` 等）会使之前取得的 `data()` 指针失效，因此不要在重新分配后继续使用旧指针。',
            '',
            '##### 13.2.1 `insert()` / `erase()`：按迭代器位置插入和删除',
            '',
            '`std::vector::insert()` 和 `std::vector::erase()` 都使用**迭代器**来表示操作位置，而不是直接传入数组下标。对于 `std::vector`，迭代器属于随机访问迭代器，因此可以使用 `vec.begin() + n` 得到下标 `n` 对应位置的迭代器。',
            '',
            '例如，假设当前容器是：',
            '',
            '```cpp',
            'std::vector<double> vec{1, 2, 3, 4, 6};',
            '```',
            '',
            '如果希望在下标 `1` 的位置插入 `1.5`：',
            '',
            '```cpp',
            'vec.insert(vec.begin() + 1, 1.5);',
            '```',
            '',
            '执行后：',
            '',
            '```text',
            '下标：     0    1    2    3    4    5',
            '元素：     1   1.5   2    3    4    6',
            '```',
            '',
            '`vec.begin()` 指向第 `0` 个元素，因此：',
            '',
            '```cpp',
            'vec.begin() + 0   // 指向 vec[0]',
            'vec.begin() + 1   // 指向 vec[1]',
            'vec.begin() + 2   // 指向 vec[2]',
            'vec.begin() + 3   // 指向 vec[3]',
            '```',
            '',
            '接着如果要删除值为 `3` 的元素，此时它位于下标 `3`：',
            '',
            '```cpp',
            'vec.erase(vec.begin() + 3);',
            '```',
            '',
            '删除后得到：',
            '',
            '```cpp',
            '{1, 1.5, 2, 4, 6}',
            '```',
            '',
            '所以练习题中的两个位置参数分别可以写成：',
            '',
            '```cpp',
            'vec.insert(vec.begin() + 1, 1.5);',
            'vec.erase(vec.begin() + 3);',
            '```',
            '',
            '> [!NOTE]',
            '> `insert(1, 1.5)` 或 `erase(3)` 这种写法不表示“下标 1 / 下标 3”，因为这些重载的位置参数要求的是迭代器。需要把下标转换成对应位置时，可以对 `std::vector` 使用 `vec.begin() + 下标`。',
            '',
            '> [!WARNING]',
            '> 上面的 `1.5` 示例使用的是 `std::vector<double>`。如果容器实际是 `std::vector<int>`，把 `1.5` 插入进去会发生数值转换，保存的不会是 `1.5`。',
            '',
            '###### 插入和删除的时间复杂度',
            '',
            '`std::vector` 的元素必须连续存储，因此在**中间位置**插入或删除元素时，操作位置后面的元素通常需要移动。',
            '',
            '中间插入可以直观理解为：',
            '',
            '```text',
            '原来：  1 | 2 | 3 | 4 | 6',
            '              ↓ 在这里插入 1.5',
            '',
            '结果：  1 | 1.5 | 2 | 3 | 4 | 6',
            '                    → 后面的元素需要向后移动',
            '```',
            '',
            '中间删除则相反，删除位置后面的元素通常需要向前移动来填补空位。因此可以把常见复杂度记为：',
            '',
            '| 操作 | 时间复杂度 | 主要原因 |',
            '| --- | --- | --- |',
            '| `vec[i]` | `O(1)` | 随机访问，可直接定位 |',
            '| `push_back()` | 摊销 `O(1)` | 通常直接在尾部构造；偶尔扩容会搬移全部元素 |',
            '| `pop_back()` | `O(1)` | 直接删除最后一个元素 |',
            '| 中间 `insert()` | `O(n)` | 需要移动插入位置之后的元素；发生扩容时还可能搬移整个存储区 |',
            '| 中间 `erase()` | `O(n)` | 需要把删除位置之后的元素向前移动 |',
            '',
            '这里说 `push_back()` 是**摊销 `O(1)`**，是因为并不是每次追加元素都会重新分配内存。容量足够时只需在尾部构造一个元素；只有容量不足时才需要申请更大的连续内存，并搬移或复制已有元素。把多次 `push_back()` 的总成本平均下来，每次追加的摊销复杂度为常数。',
            '',
            '> [!IMPORTANT]',
            '> `std::vector` 的连续存储带来了优秀的随机访问和缓存局部性，但也意味着中间插入、删除通常需要移动后续元素。这正是 `vector` “随机访问快、尾部操作快、中间插删相对慢”的核心原因。',
            '',
            '还应注意迭代器失效：`insert()` 如果触发重新分配，会使指向该 `vector` 的所有迭代器和引用失效；如果没有重新分配，插入点及其后的迭代器和引用会失效。`erase()` 会使被删除位置以及其后的迭代器和引用失效。',
            '',
            '参考：[cppreference：`std::vector::insert`](https://en.cppreference.com/w/cpp/container/vector/insert)、[cppreference：`std::vector::erase`](https://en.cppreference.com/w/cpp/container/vector/erase)、[cppreference：`std::vector`](https://en.cppreference.com/w/cpp/container/vector)。',
            '',
            '参考：[cppreference：`std::vector::data`](https://en.cppreference.com/w/cpp/container/vector/data)。',
            ''
        ].join('\n');

        return markdown.replace(
            '\n### 14、类型别名声明（using别名）',
            '\n\n' + vectorDataSection + '\n### 14、类型别名声明（using别名）'
        );
    }

    function addMemcmpSection(markdown) {
        if (markdown.indexOf('##### 16.2.1 `std::memcmp()`') !== -1) return markdown;

        var memcmpSection = [
            '#### 16.2 `<cstring>`',
            '',
            '`<cstring>` 提供一组处理 C 风格字符串和原始字节序列的函数。`std::memcmp` 用于比较两块内存的对象表示。',
            '',
            '##### 16.2.1 `std::memcmp()`',
            '',
            '`std::memcmp` 的函数接口可以写成：',
            '',
            '```cpp',
            'int std::memcmp(const void* s1, const void* s2, std::size_t n);',
            '```',
            '',
            '三个参数的含义是：',
            '',
            '| 参数 | 含义 |',
            '| --- | --- |',
            '| `s1` | 第一块内存的起始地址 |',
            '| `s2` | 第二块内存的起始地址 |',
            '| `n` | 要比较的**字节数** |',
            '',
            '返回值用于表示按字节比较的结果：',
            '',
            '| 返回值 | 含义 |',
            '| --- | --- |',
            '| `< 0` | 第一块内存在第一个不同字节处小于第二块 |',
            '| `== 0` | 指定的 `n` 个字节完全相同 |',
            '| `> 0` | 第一块内存在第一个不同字节处大于第二块 |',
            '',
            '例如：',
            '',
            '```cpp',
            '#include <array>',
            '#include <cstring>',
            '',
            'std::array<int, 5> arr{{1, 2, 3, 4, 5}};',
            'int ans[]{1, 2, 3, 4, 5};',
            '',
            'std::memcmp(arr.data(), ans, 5 * sizeof(int));',
            '```',
            '',
            '这里最容易出错的是第三个参数：',
            '',
            '```cpp',
            '5 * sizeof(int)',
            '```',
            '',
            '`n` 表示的是**比较多少个字节（byte）**，而不是“比较多少个元素”。如果有 `5` 个 `int`，需要比较的总字节数就是：',
            '',
            '```text',
            '元素个数 × 每个元素的字节数',
            '    5    ×    sizeof(int)',
            '```',
            '',
            '因此不能简单写成：',
            '',
            '```cpp',
            'std::memcmp(arr.data(), ans, 5);  // 只比较前 5 个字节',
            '```',
            '',
            '假设某个平台上 `sizeof(int) == 4`，那么 5 个 `int` 一共占：',
            '',
            '```text',
            '5 × 4 = 20 字节',
            '```',
            '',
            '所以应写：',
            '',
            '```cpp',
            'std::memcmp(arr.data(), ans, 5 * sizeof(int))',
            '```',
            '',
            '如果要判断指定范围的字节是否完全相同，则判断返回值是否为 `0`：',
            '',
            '```cpp',
            'if (std::memcmp(arr.data(), ans, 5 * sizeof(int)) == 0) {',
            '    // 两块内存的这 5 * sizeof(int) 个字节完全相同',
            '}',
            '```',
            '',
            '> [!WARNING]',
            '> `std::memcmp` 比较的是**对象表示，也就是原始字节序列**，并不是通用的 C++ “值相等”操作。对于具有填充字节、不同但等价的对象表示，或者带有更复杂语义的类型，不应把 `memcmp == 0` 当作普遍的相等判断。普通 C++ 对象和标准容器通常应优先使用它们自己的 `operator==` 或标准算法。',
            '',
            '可以把它简单记成：',
            '',
            '```text',
            'memcmp = memory compare',
            '         内存比较',
            '',
            '第三个参数 = 比较的字节数',
            '```',
            '',
            '参考：[cppreference：`std::memcmp`](https://en.cppreference.com/w/cpp/string/byte/memcmp)。',
            ''
        ].join('\n');

        return markdown.replace(
            '\n### 17、异常处理机制',
            '\n\n' + memcmpSection + '\n### 17、异常处理机制'
        );
    }

    fetch('./C++语言学习.md?v=20260808a')
        .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.text();
        })
        .then(function (markdown) {
            markdown = addBlockScopeSection(markdown);
            markdown = addArraySection(markdown);
            markdown = addVectorDataSection(markdown);
            markdown = addMemcmpSection(markdown);
            preparePages(markdown);
            routeFromHash();
        })
        .catch(function (error) {
            var detail = error && error.message ? '（' + error.message + '）' : '';
            showLoadError('笔记文件暂时无法读取' + detail + '，请稍后刷新或直接查看原文。');
        });
})();
