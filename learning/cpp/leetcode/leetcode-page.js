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

    if (!content || !pageNav || !outlineLinks || !pagination || !window.markdownit) return;

    var pages = [];
    var siteTitle = 'Leetcode Hot 100 刷题记录';
    var currentPageIndex = 0;
    var outlineObserver = null;
    var circleLength = 2 * Math.PI * 21;
    var md = window.markdownit({
        html: false,
        linkify: true,
        typographer: false
    });

    function escapeHtml(value) {
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

    function inlineMarkdown(value) {
        return md.renderInline(String(value || ''));
    }

    function fenceMarker(line) {
        var match = String(line || '').match(/^\s*(`{3,}|~{3,})/);
        return match ? match[1] : '';
    }

    function preparePages(markdown) {
        var lines = markdown.replace(/\r\n/g, '\n').split('\n').filter(function (line) {
            return line.trim().toUpperCase() !== '[TOC]';
        });
        var titleLine = -1;
        var intro = [];
        var current = null;
        var activeFence = '';

        lines.forEach(function (line, index) {
            if (titleLine >= 0) return;
            if (fenceMarker(line)) return;
            var title = line.match(/^#\s+(.+)$/);
            if (title) {
                titleLine = index;
                siteTitle = plainText(inlineMarkdown(title[1]));
            }
        });

        lines.forEach(function (line, index) {
            var marker = fenceMarker(line);

            if (activeFence) {
                if (marker && marker.charAt(0) === activeFence.charAt(0) && marker.length >= activeFence.length) {
                    activeFence = '';
                }
            } else if (marker) {
                activeFence = marker;
            }

            var pageHeading = !activeFence && !marker ? line.match(/^##\s+(.+)$/) : null;
            if (pageHeading) {
                if (current) pages.push(current);
                current = {
                    title: pageHeading[1],
                    lines: [],
                    route: 'chapter-' + (pages.length + 1)
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
                route: 'chapter-1'
            });
        } else if (intro.some(function (line) { return line.trim(); })) {
            pages[0].lines = intro.concat(pages[0].lines);
        }

        pages.forEach(function (page, index) {
            page.index = index;
            page.route = 'chapter-' + (index + 1);
            page.titleHtml = inlineMarkdown(page.title);
            page.plainTitle = plainText(page.titleHtml);
        });

        if (docsTitle) docsTitle.textContent = siteTitle;
        if (chapterCount) chapterCount.textContent = pages.length + ' 个章节';
    }

    function renderMarkdown(markdown) {
        return md.render(markdown);
    }

    function normalizeLanguage(language) {
        var normalized = String(language || '').trim().toLowerCase();
        if (normalized === 'c++' || normalized === 'cplusplus' || normalized === 'cxx') return 'cpp';
        if (normalized === 'shell' || normalized === 'sh') return 'bash';
        if (!normalized) return 'text';
        return normalized;
    }

    function displayLanguage(language) {
        if (language === 'cpp') return 'C++';
        if (language === 'bash') return 'Shell';
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
            button.setAttribute('aria-label', '复制这段代码');

            if (language !== 'text' && window.hljs && typeof window.hljs.getLanguage === 'function' && window.hljs.getLanguage(language)) {
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
            title.textContent = type === 'NOTE' ? '提示' : type;
            quote.classList.add('callout');
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

    function enhanceImages() {
        Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body img'), function (image, index) {
            var source = image.getAttribute('src') || '';
            var originalAlt = (image.getAttribute('alt') || '').trim();
            var parent = image.parentElement;

            image.loading = 'lazy';
            image.decoding = 'async';
            if (!originalAlt || /^image-\d+$/i.test(originalAlt)) {
                image.alt = 'Leetcode Hot 100 笔记配图 ' + (index + 1);
            }

            if (!parent || parent.tagName !== 'P' || parent.children.length !== 1) return;

            var figure = document.createElement('figure');
            var imageLink = document.createElement('a');
            var caption = document.createElement('figcaption');
            var captionText = document.createElement('span');
            var originalLink = document.createElement('a');

            figure.className = 'article-figure';
            imageLink.className = 'image-link';
            imageLink.href = source;
            imageLink.target = '_blank';
            imageLink.rel = 'noopener noreferrer';
            imageLink.setAttribute('aria-label', '在新标签页查看配图 ' + (index + 1) + ' 原图');

            captionText.textContent = originalAlt && !/^image-\d+$/i.test(originalAlt)
                ? originalAlt
                : '笔记配图 ' + (index + 1);
            originalLink.href = source;
            originalLink.target = '_blank';
            originalLink.rel = 'noopener noreferrer';
            originalLink.textContent = '查看原图';

            parent.parentNode.insertBefore(figure, parent);
            imageLink.appendChild(image);
            caption.appendChild(captionText);
            caption.appendChild(originalLink);
            figure.appendChild(imageLink);
            figure.appendChild(caption);
            parent.remove();
        });
    }

    function assignHeadingIds() {
        var headingIndex = 0;
        Array.prototype.forEach.call(content.querySelectorAll('.doc-page-body h2, .doc-page-body h3, .doc-page-body h4, .doc-page-body h5'), function (heading) {
            headingIndex += 1;
            var label = heading.textContent.trim();
            var anchor = document.createElement('a');
            heading.id = 'section-' + (currentPageIndex + 1) + '-' + headingIndex;
            anchor.className = 'heading-anchor';
            anchor.href = '#' + heading.id;
            anchor.textContent = '#';
            anchor.setAttribute('aria-label', '定位到“' + label + '”');
            heading.appendChild(anchor);
        });
    }

    function buildPageNavigation() {
        pageNav.innerHTML = pages.map(function (page, index) {
            var active = index === currentPageIndex ? ' is-active' : '';
            var current = index === currentPageIndex ? ' aria-current="page"' : '';
            var number = String(index + 1).padStart(2, '0');
            return '<a class="page-nav-link' + active + '" href="#' + page.route + '"' + current + '>' +
                '<span class="page-nav-index">' + number + '</span>' +
                '<span>' + escapeHtml(page.plainTitle) + '</span></a>';
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

        var headings = Array.prototype.slice.call(content.querySelectorAll('.doc-page-body h2, .doc-page-body h3, .doc-page-body h4, .doc-page-body h5'));
        if (!headings.length) {
            outlineLinks.innerHTML = '<p class="outline-empty">本章暂无子标题</p>';
            return;
        }

        outlineLinks.innerHTML = headings.map(function (heading) {
            var level = heading.tagName.toLowerCase().replace('h', '');
            var label = heading.firstChild ? heading.firstChild.textContent : heading.textContent;
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
            ? '<a class="previous" href="#' + previous.route + '"><span class="pagination-label">← 上一章</span><span class="pagination-title">' + escapeHtml(previous.plainTitle) + '</span></a>'
            : '<span class="pagination-spacer" aria-hidden="true"></span>';
        var nextHtml = next
            ? '<a class="next" href="#' + next.route + '"><span class="pagination-label">下一章 →</span><span class="pagination-title">' + escapeHtml(next.plainTitle) + '</span></a>'
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
        var bodyHtml = renderMarkdown(page.lines.join('\n'));

        content.innerHTML =
            '<header class="doc-page-header">' +
                '<p class="doc-page-kicker">LEETCODE HOT 100 · 第 ' + (currentPageIndex + 1) + ' / ' + pages.length + ' 题</p>' +
                '<h1 id="' + escapeHtml(page.route) + '-title">' + page.titleHtml + '</h1>' +
            '</header>' +
            '<div class="doc-page-body">' + bodyHtml + '</div>';

        assignHeadingIds();
        enhanceCallouts();
        enhanceTables();
        enhanceLinks();
        enhanceImages();
        enhanceCodeBlocks();
        buildPageNavigation();
        buildOutline();
        buildPagination();
        closeMobileNavigation();
        document.title = page.plainTitle + ' · Leetcode Hot 100 · Kyle';

        window.requestAnimationFrame(function () {
            var target = targetId ? document.getElementById(targetId) : null;
            if (target) target.scrollIntoView({ block: 'start' });
            else window.scrollTo({ top: 0, left: 0 });
            updateReadingProgress();
        });
    }

    function routeFromHash() {
        var hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
        var pageMatch = hash.match(/^chapter-(\d+)$/);
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
            try { window.localStorage.setItem('leetcode-hot-100-theme', normalized); }
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

    fetch('./Leetcode%20Hot%20100刷题记录.md?v=20260718a')
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
            content.innerHTML =
                '<header class="doc-page-header"><p class="doc-page-kicker">LEETCODE HOT 100</p><h1>Leetcode Hot 100 刷题记录</h1></header>' +
                '<p>笔记文件暂时无法读取，请稍后刷新或直接查看 Markdown 原文。</p>';
            updateReadingProgress();
        });
})();
