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

    fetch('./C++语言学习.md?v=20260808a')
        .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.text();
        })
        .then(function (markdown) {
            preparePages(markdown);
            routeFromHash();
        })
        .catch(function (error) {
            var detail = error && error.message ? '（' + error.message + '）' : '';
            showLoadError('笔记文件暂时无法读取' + detail + '，请稍后刷新或直接查看原文。');
        });
})();
