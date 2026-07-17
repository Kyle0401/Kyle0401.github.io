(function () {
    'use strict';

    var content = document.getElementById('article-content');
    var toc = document.getElementById('toc');
    var tocContent = document.getElementById('toc-content');
    var tocLinks = document.getElementById('toc-links');
    var tocToggle = document.getElementById('toc-toggle');
    var tocBulkToggle = document.getElementById('toc-bulk-toggle');
    var layout = document.getElementById('note-layout');
    var progressValue = document.getElementById('reading-progress-value');
    var backToTop = document.getElementById('back-to-top');
    var skipLink = document.querySelector('.skip-link');

    if (!content || !toc || !tocLinks || !tocToggle || !layout) return;

    var imageDimensions = {
        'image-20250316215315593.png': [1826, 1163],
        'image-20250316220211614.png': [1152, 741],
        'image-20250317185849010.png': [1057, 873],
        'image-20250317190133448.png': [2178, 3476],
        'image-20250320113023799.png': [1418, 8778],
        'image-20250320113131585.png': [1380, 8778],
        'image-20250320113346712.png': [1312, 996],
        'image-20250320113406829.png': [1225, 1046],
        'image-20250327104949371.png': [1820, 3305],
        'image-20250328105937596.png': [2134, 5769],
        'image-20250913022829207.png': [1565, 298]
    };

    var articleHeadings = [];
    var activeHeadingId = '';
    var scrollScheduled = false;

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
        Array.prototype.forEach.call(content.querySelectorAll('pre > code'), function (code) {
            var pre = code.parentElement;
            if (!pre || (pre.parentElement && pre.parentElement.classList.contains('code-block'))) return;

            var languageMatch = (code.className || '').match(/(?:^|\s)language-([^\s]+)/);
            var language = normalizeLanguage(languageMatch ? languageMatch[1] : '');
            code.className = (code.className || '').replace(/(?:^|\s)language-[^\s]+/g, '').trim();

            if (language !== 'text' && window.hljs && typeof window.hljs.getLanguage === 'function' && window.hljs.getLanguage(language)) {
                code.classList.add('language-' + language);
                try { window.hljs.highlightElement(code); }
                catch (error) { code.classList.add('nohighlight'); }
            } else {
                code.classList.add('nohighlight');
            }

            var wrapper = document.createElement('div');
            var toolbar = document.createElement('div');
            var label = document.createElement('span');
            var button = document.createElement('button');

            wrapper.className = 'code-block';
            toolbar.className = 'code-toolbar';
            label.className = 'code-language';
            label.textContent = displayLanguage(language);
            button.type = 'button';
            button.className = 'copy-code-button';
            button.textContent = '复制';
            button.setAttribute('aria-label', '复制这段代码');

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
                    button.classList.add('is-failed');
                    window.setTimeout(function () {
                        button.textContent = '复制';
                        button.classList.remove('is-failed');
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
        Array.prototype.forEach.call(content.querySelectorAll('table'), function (table) {
            if (table.parentElement && table.parentElement.classList.contains('table-wrap')) return;
            var wrapper = document.createElement('div');
            wrapper.className = 'table-wrap';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });
    }

    function enhanceCallouts() {
        Array.prototype.forEach.call(content.querySelectorAll('blockquote'), function (quote) {
            var first = quote.firstElementChild;
            if (!first) return;
            var match = first.textContent.trim().match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i);
            if (!match) return;

            var remaining = first.textContent.replace(match[0], '').trim();
            if (remaining) first.textContent = remaining;
            else first.remove();

            var title = document.createElement('span');
            title.className = 'callout-title';
            title.textContent = match[1].toUpperCase() === 'NOTE' ? '提示' : match[1].toUpperCase();
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
        Array.prototype.forEach.call(content.querySelectorAll('img'), function (image, index) {
            var source = image.getAttribute('src') || '';
            var fileName = decodeURIComponent(source.split('/').pop() || '');
            var dimensions = imageDimensions[fileName];
            var originalAlt = (image.getAttribute('alt') || '').trim();

            image.loading = 'lazy';
            image.decoding = 'async';
            if (dimensions) {
                image.width = dimensions[0];
                image.height = dimensions[1];
            }
            if (!originalAlt || /^image-\d+$/i.test(originalAlt)) {
                image.alt = 'CCF-CSP 笔记配图 ' + (index + 1);
            }

            var parent = image.parentElement;
            if (!parent || parent.tagName !== 'P' || parent.children.length !== 1) return;

            var figure = document.createElement('figure');
            var imageLink = document.createElement('a');
            var caption = document.createElement('figcaption');
            var captionText = document.createElement('span');
            var originalLink = document.createElement('a');

            figure.className = 'article-figure';
            if (dimensions && dimensions[1] / dimensions[0] > 2.2) figure.classList.add('is-tall');

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

    function slugify(value, fallbackIndex, used) {
        var text = String(value || '').trim().toLowerCase();
        try { text = text.normalize('NFKC'); }
        catch (error) { /* Older browsers can use the unnormalized text. */ }

        var base = text
            .replace(/[`"'“”‘’]/g, '')
            .replace(/[^a-z0-9\u3400-\u9fff\u2460-\u24ff]+/g, '-')
            .replace(/^-+|-+$/g, '');

        if (!base) base = 'section-' + fallbackIndex;
        var count = used[base] || 0;
        used[base] = count + 1;
        return count ? base + '-' + (count + 1) : base;
    }

    function assignHeadingIds() {
        var used = {};
        var headings = content.querySelectorAll('h1, h2, h3, h4, h5');

        Array.prototype.forEach.call(headings, function (heading, index) {
            var label = heading.textContent.trim();
            var anchor = document.createElement('a');
            heading.id = slugify(label, index + 1, used);
            heading.dataset.headingLabel = label;
            anchor.className = 'heading-anchor';
            anchor.href = '#' + heading.id;
            anchor.textContent = '#';
            anchor.setAttribute('aria-label', '定位到“' + label + '”');
            heading.appendChild(anchor);
        });

        articleHeadings = Array.prototype.slice.call(content.querySelectorAll('h2, h3, h4, h5'));
    }

    function createTocTree(headings) {
        var roots = [];
        var stack = [];

        headings.forEach(function (heading) {
            var node = {
                id: heading.id,
                label: heading.dataset.headingLabel || heading.textContent.trim(),
                level: Number(heading.tagName.slice(1)),
                children: []
            };

            while (stack.length && stack[stack.length - 1].level >= node.level) stack.pop();
            if (stack.length) stack[stack.length - 1].children.push(node);
            else roots.push(node);
            stack.push(node);
        });

        return roots;
    }

    function setBranchCollapsed(item, toggle, collapsed) {
        item.classList.toggle('is-collapsed', collapsed);
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.setAttribute('aria-label', collapsed ? '展开子目录' : '收起子目录');
    }

    function renderTocNodes(nodes, isRoot) {
        var list = document.createElement('ul');
        list.className = isRoot ? 'toc-tree' : 'toc-children';

        nodes.forEach(function (node) {
            var item = document.createElement('li');
            var row = document.createElement('div');
            var toggle = document.createElement('button');
            var link = document.createElement('a');

            item.className = 'toc-item toc-level-' + node.level;
            row.className = 'toc-row';
            toggle.type = 'button';
            toggle.className = 'toc-item-toggle';
            toggle.textContent = '⌄';
            link.className = 'toc-link';
            link.href = '#' + node.id;
            link.dataset.target = node.id;
            link.textContent = node.label;

            if (node.children.length) {
                var initiallyCollapsed = node.level >= 3;
                setBranchCollapsed(item, toggle, initiallyCollapsed);
                toggle.addEventListener('click', function () {
                    setBranchCollapsed(item, toggle, !item.classList.contains('is-collapsed'));
                    updateBulkToggle();
                });
            } else {
                toggle.classList.add('is-placeholder');
                toggle.tabIndex = -1;
                toggle.setAttribute('aria-hidden', 'true');
            }

            row.appendChild(toggle);
            row.appendChild(link);
            item.appendChild(row);
            if (node.children.length) item.appendChild(renderTocNodes(node.children, false));
            list.appendChild(item);
        });

        return list;
    }

    function getBranchItems() {
        return Array.prototype.slice.call(tocLinks.querySelectorAll('.toc-item')).filter(function (item) {
            return item.querySelector(':scope > .toc-children');
        });
    }

    function updateBulkToggle() {
        if (!tocBulkToggle) return;
        var branches = getBranchItems();
        var allCollapsed = branches.length > 0 && branches.every(function (item) {
            return item.classList.contains('is-collapsed');
        });
        tocBulkToggle.disabled = branches.length === 0;
        tocBulkToggle.textContent = allCollapsed ? '全部展开' : '全部折叠';
        tocBulkToggle.setAttribute('aria-label', allCollapsed ? '展开全部子目录' : '折叠全部子目录');
    }

    function setAllBranchesCollapsed(collapsed) {
        getBranchItems().forEach(function (item) {
            var toggle = item.querySelector(':scope > .toc-row > .toc-item-toggle');
            if (toggle) setBranchCollapsed(item, toggle, collapsed);
        });
        updateBulkToggle();
    }

    function buildToc() {
        tocLinks.innerHTML = '';
        if (!articleHeadings.length) {
            tocLinks.innerHTML = '<p class="toc-loading">本文暂无子标题。</p>';
            updateBulkToggle();
            return;
        }

        tocLinks.appendChild(renderTocNodes(createTocTree(articleHeadings), true));
        updateBulkToggle();
    }

    function expandTocAncestors(link) {
        var item = link ? link.closest('.toc-item') : null;
        while (item) {
            var parentItem = item.parentElement ? item.parentElement.closest('.toc-item') : null;
            if (parentItem && parentItem.classList.contains('is-collapsed')) {
                var toggle = parentItem.querySelector(':scope > .toc-row > .toc-item-toggle');
                if (toggle) setBranchCollapsed(parentItem, toggle, false);
            }
            item = parentItem;
        }
        updateBulkToggle();
    }

    function setActiveHeading(id) {
        if (!id || id === activeHeadingId) return;
        activeHeadingId = id;
        var activeLink = null;

        Array.prototype.forEach.call(tocLinks.querySelectorAll('.toc-link'), function (link) {
            var active = link.dataset.target === id;
            link.classList.toggle('is-active', active);
            if (active) {
                link.setAttribute('aria-current', 'location');
                activeLink = link;
            } else {
                link.removeAttribute('aria-current');
            }
        });

        if (!activeLink) return;
        expandTocAncestors(activeLink);

        if (tocContent && window.innerWidth > 1040) {
            var containerRect = tocContent.getBoundingClientRect();
            var linkRect = activeLink.getBoundingClientRect();
            if (linkRect.top < containerRect.top + 42) {
                tocContent.scrollTop -= containerRect.top + 42 - linkRect.top;
            } else if (linkRect.bottom > containerRect.bottom - 16) {
                tocContent.scrollTop += linkRect.bottom - containerRect.bottom + 16;
            }
        }
    }

    function updateScrollState() {
        scrollScheduled = false;
        var scrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        var percent = scrollable ? Math.max(0, Math.min(1, window.scrollY / scrollable)) : 0;
        if (progressValue) progressValue.style.width = (percent * 100).toFixed(2) + '%';
        if (backToTop) backToTop.classList.toggle('is-visible', window.scrollY > 640);

        if (!articleHeadings.length) return;
        var active = articleHeadings[0];
        articleHeadings.forEach(function (heading) {
            if (heading.getBoundingClientRect().top <= 128) active = heading;
        });
        if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 12) {
            active = articleHeadings[articleHeadings.length - 1];
        }
        setActiveHeading(active.id);
    }

    function scheduleScrollState() {
        if (scrollScheduled) return;
        scrollScheduled = true;
        window.requestAnimationFrame(updateScrollState);
    }

    function setTocCollapsed(collapsed) {
        toc.classList.toggle('is-collapsed', collapsed);
        layout.classList.toggle('toc-collapsed', collapsed);
        tocToggle.setAttribute('aria-expanded', String(!collapsed));
        tocToggle.setAttribute('aria-label', collapsed ? '展开文章目录' : '收起文章目录');
    }

    tocToggle.addEventListener('click', function () {
        setTocCollapsed(!toc.classList.contains('is-collapsed'));
    });

    if (tocBulkToggle) {
        tocBulkToggle.addEventListener('click', function () {
            var branches = getBranchItems();
            var shouldCollapse = !branches.length || !branches.every(function (item) {
                return item.classList.contains('is-collapsed');
            });
            setAllBranchesCollapsed(shouldCollapse);
        });
    }

    if (backToTop) {
        backToTop.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (skipLink) {
        skipLink.addEventListener('click', function () {
            window.requestAnimationFrame(function () {
                try { content.focus({ preventScroll: true }); }
                catch (error) { content.focus(); }
            });
        });
    }

    window.addEventListener('scroll', scheduleScrollState, { passive: true });
    window.addEventListener('resize', scheduleScrollState);

    fetch('./CCF-CSP总结.md?v=20260717a')
        .then(function (response) {
            if (!response.ok) throw new Error('Markdown request failed');
            return response.text();
        })
        .then(function (markdown) {
            if (!window.markdownit) throw new Error('Markdown renderer unavailable');
            var renderer = window.markdownit({
                html: false,
                linkify: true,
                breaks: false,
                typographer: false
            });

            content.innerHTML = renderer.render(markdown);
            enhanceCallouts();
            enhanceTables();
            enhanceLinks();
            enhanceImages();
            enhanceCodeBlocks();
            assignHeadingIds();
            buildToc();
            scheduleScrollState();

            if (window.location.hash) {
                window.requestAnimationFrame(function () {
                    var hashId = window.location.hash.slice(1);
                    try { hashId = decodeURIComponent(hashId); }
                    catch (error) { /* Keep the raw hash when it is not valid percent-encoding. */ }
                    var target = document.getElementById(hashId);
                    if (target) target.scrollIntoView({ block: 'start' });
                });
            }
        })
        .catch(function () {
            content.innerHTML = '<h1>CCF-CSP 总结</h1><p>笔记暂时无法加载。你可以直接查看 <a href="./CCF-CSP总结.md">Markdown 原文</a>。</p>';
            tocLinks.innerHTML = '<p class="toc-loading">目录暂时无法加载。</p>';
            if (tocBulkToggle) tocBulkToggle.disabled = true;
            scheduleScrollState();
        });
})();
