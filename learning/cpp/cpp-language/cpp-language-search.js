(function () {
    'use strict';

    var sidebar = document.getElementById('docs-sidebar');
    var sidebarHeading = sidebar && sidebar.querySelector('.docs-sidebar-heading');
    var pageNav = document.getElementById('page-nav');
    if (!sidebar || !sidebarHeading || !pageNav) return;
    if (document.getElementById('cpp-global-search')) return;

    var recordsPromise = null;
    var activeIndex = -1;
    var visibleResults = [];

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function unescapeMarkdown(value) {
        return String(value || '').replace(/\\([\\`*_{}\[\]()#+\-.!<>|~])/g, '$1');
    }

    function normalizeText(value) {
        return unescapeMarkdown(String(value || '')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
            // 只移除常见 HTML 标签，不要用 /<[^>]+>/，否则 C++ 的 <int>、<T> 等模板参数也会被删掉。
            .replace(/<\/?(?:br|div|span|p|a|strong|em|code|pre|details|summary|table|thead|tbody|tr|th|td|ul|ol|li|blockquote|kbd|sup|sub|hr)\b[^>]*>/gi, ' '))
            // 保留 C++ 标识符和语法中的特殊符号，例如 _、*、::、< >、[]、|、~、#。
            .replace(/\s+/g, ' ')
            .trim();
    }

    function normalizeQuery(value) {
        return unescapeMarkdown(value)
            .replace(/\s+/g, ' ')
            .trim();
    }

    function buildRecords(markdown) {
        var lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
        var records = [];
        var chapterIndex = 0;
        var sectionIndex = 0;
        var currentChapter = null;
        var currentRecord = null;
        var fenceMarker = '';

        function finishRecord() {
            if (!currentRecord) return;
            currentRecord.body = normalizeText(currentRecord.bodyLines.join(' '));
            delete currentRecord.bodyLines;
            records.push(currentRecord);
            currentRecord = null;
        }

        lines.forEach(function (line) {
            var markerMatch = line.match(/^\s*(`{3,}|~{3,})/);
            if (markerMatch) {
                var marker = markerMatch[1];
                if (!fenceMarker) fenceMarker = marker;
                else if (marker.charAt(0) === fenceMarker.charAt(0) && marker.length >= fenceMarker.length) fenceMarker = '';
                return;
            }
            if (fenceMarker) {
                if (currentRecord) currentRecord.bodyLines.push(line);
                return;
            }

            var chapterMatch = line.match(/^###\s+(.+)$/);
            if (chapterMatch) {
                finishRecord();
                chapterIndex += 1;
                sectionIndex = 0;
                currentChapter = normalizeText(chapterMatch[1]);
                currentRecord = {
                    type: 'chapter',
                    title: currentChapter,
                    chapter: currentChapter,
                    href: '#chapter-' + chapterIndex,
                    bodyLines: []
                };
                return;
            }

            var sectionMatch = line.match(/^(#{4,6})\s+(.+)$/);
            if (sectionMatch && chapterIndex) {
                finishRecord();
                sectionIndex += 1;
                var title = normalizeText(sectionMatch[2]);
                currentRecord = {
                    type: 'section',
                    title: title,
                    chapter: currentChapter || '',
                    href: '#section-' + chapterIndex + '-' + sectionIndex,
                    bodyLines: []
                };
                return;
            }

            if (currentRecord) currentRecord.bodyLines.push(line);
        });

        finishRecord();
        return records;
    }

    function loadRecords() {
        if (recordsPromise) return recordsPromise;
        recordsPromise = window.fetch('./C++语言学习.md?v=20260813-symbol-search')
            .then(function (response) {
                if (!response.ok) throw new Error('search source unavailable');
                return response.text();
            })
            .then(buildRecords)
            .catch(function () { return []; });
        return recordsPromise;
    }

    function countMatches(text, query) {
        var haystack = String(text || '').toLocaleLowerCase();
        var needle = query.toLocaleLowerCase();
        if (!needle) return 0;
        var count = 0;
        var position = 0;
        while ((position = haystack.indexOf(needle, position)) !== -1) {
            count += 1;
            position += needle.length;
        }
        return count;
    }

    function scoreRecord(record, query) {
        var title = record.title.toLocaleLowerCase();
        var chapter = record.chapter.toLocaleLowerCase();
        var body = record.body.toLocaleLowerCase();
        var q = query.toLocaleLowerCase();
        var score = 0;

        if (title === q) score += 1000;
        if (title.indexOf(q) === 0) score += 500;
        if (title.indexOf(q) !== -1) score += 300 + countMatches(title, q) * 30;
        if (chapter.indexOf(q) !== -1) score += 90;
        if (body.indexOf(q) !== -1) score += 40 + Math.min(8, countMatches(body, q)) * 8;
        return score;
    }

    function makeSnippet(record, query) {
        var source = record.body || '';
        var lower = source.toLocaleLowerCase();
        var q = query.toLocaleLowerCase();
        var index = lower.indexOf(q);
        if (index === -1) return record.chapter === record.title ? '章节标题命中' : record.chapter;

        var start = Math.max(0, index - 42);
        var end = Math.min(source.length, index + query.length + 70);
        var snippet = source.slice(start, end).trim();
        if (start > 0) snippet = '…' + snippet;
        if (end < source.length) snippet += '…';
        return snippet;
    }

    function highlight(text, query) {
        var value = String(text || '');
        if (!query) return escapeHtml(value);
        var lower = value.toLocaleLowerCase();
        var q = query.toLocaleLowerCase();
        var output = '';
        var cursor = 0;
        var index;

        while ((index = lower.indexOf(q, cursor)) !== -1) {
            output += escapeHtml(value.slice(cursor, index));
            output += '<mark>' + escapeHtml(value.slice(index, index + query.length)) + '</mark>';
            cursor = index + query.length;
        }
        output += escapeHtml(value.slice(cursor));
        return output;
    }

    function installStyles() {
        if (document.getElementById('cpp-global-search-styles')) return;
        var style = document.createElement('style');
        style.id = 'cpp-global-search-styles';
        style.textContent = [
            '.cpp-global-search { position: relative; padding: 0 14px 12px; }',
            '.cpp-global-search-box { position: relative; }',
            '.cpp-global-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--docker-muted); font-size: 14px; pointer-events: none; }',
            '.cpp-global-search-input { box-sizing: border-box; width: 100%; min-height: 38px; padding: 8px 34px 8px 32px; border: 1px solid rgba(20,109,160,.22); border-radius: 10px; background: rgba(255,255,255,.78); color: inherit; font: inherit; font-size: 13px; outline: none; transition: border-color .16s ease, box-shadow .16s ease, background .16s ease; }',
            '.cpp-global-search-input:focus { border-color: var(--note-accent); box-shadow: 0 0 0 3px rgba(20,109,160,.10); background: #fff; }',
            '.cpp-global-search-shortcut { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); padding: 2px 5px; border: 1px solid rgba(20,109,160,.18); border-radius: 5px; color: var(--docker-muted); background: rgba(20,109,160,.04); font-size: 10px; line-height: 1.3; pointer-events: none; }',
            '.cpp-global-search-results { display: none; position: absolute; z-index: 60; top: calc(100% - 7px); left: 14px; right: 14px; max-height: min(58vh, 520px); overflow: auto; border: 1px solid rgba(20,109,160,.20); border-radius: 12px; background: rgba(255,255,255,.98); box-shadow: 0 16px 38px rgba(20,55,80,.16); }',
            '.cpp-global-search.is-open .cpp-global-search-results { display: block; }',
            '.cpp-search-status { padding: 12px; color: var(--docker-muted); font-size: 12px; }',
            '.cpp-search-result { display: block; padding: 10px 12px; border-bottom: 1px solid rgba(20,109,160,.09); color: inherit; text-decoration: none !important; }',
            '.cpp-search-result:last-child { border-bottom: 0; }',
            '.cpp-search-result:hover, .cpp-search-result.is-active { background: rgba(20,109,160,.08); }',
            '.cpp-search-result-title { display: block; color: var(--docker-deep); font-size: 13px; font-weight: 700; line-height: 1.45; }',
            '.cpp-search-result-chapter { display: block; margin-top: 2px; color: var(--docker-muted); font-size: 11px; line-height: 1.4; }',
            '.cpp-search-result-snippet { display: block; margin-top: 5px; color: var(--docker-muted); font-size: 11px; line-height: 1.5; }',
            '.cpp-global-search mark { padding: 0 1px; border-radius: 2px; background: rgba(255,196,0,.32); color: inherit; }',
            'html[data-theme="dark"] .cpp-global-search-input { border-color: rgba(88,166,255,.26); background: rgba(13,17,23,.72); }',
            'html[data-theme="dark"] .cpp-global-search-input:focus { border-color: #58a6ff; box-shadow: 0 0 0 3px rgba(88,166,255,.12); background: #0d1117; }',
            'html[data-theme="dark"] .cpp-global-search-results { border-color: rgba(88,166,255,.25); background: rgba(13,17,23,.98); box-shadow: 0 18px 42px rgba(0,0,0,.42); }',
            'html[data-theme="dark"] .cpp-search-result { border-bottom-color: rgba(88,166,255,.10); }',
            'html[data-theme="dark"] .cpp-search-result:hover, html[data-theme="dark"] .cpp-search-result.is-active { background: rgba(88,166,255,.10); }',
            'html[data-theme="dark"] .cpp-search-result-title { color: #c9d1d9; }',
            '@media (max-width: 980px) { .cpp-global-search-results { max-height: 48vh; } }'
        ].join('\n');
        document.head.appendChild(style);
    }

    installStyles();

    var root = document.createElement('div');
    root.className = 'cpp-global-search';
    root.id = 'cpp-global-search';
    root.innerHTML =
        '<div class="cpp-global-search-box">' +
            '<span class="cpp-global-search-icon" aria-hidden="true">⌕</span>' +
            '<input class="cpp-global-search-input" id="cpp-global-search-input" type="search" autocomplete="off" spellcheck="false" aria-label="全文搜索 C++ 笔记" aria-controls="cpp-global-search-results" aria-expanded="false" placeholder="搜索全文关键词、术语或 C++ 符号…">' +
            '<span class="cpp-global-search-shortcut" aria-hidden="true">Ctrl K</span>' +
        '</div>' +
        '<div class="cpp-global-search-results" id="cpp-global-search-results" role="listbox" aria-label="搜索结果"></div>';

    sidebar.insertBefore(root, pageNav);

    var input = document.getElementById('cpp-global-search-input');
    var resultsBox = document.getElementById('cpp-global-search-results');
    if (!input || !resultsBox) return;

    function setOpen(open) {
        root.classList.toggle('is-open', Boolean(open));
        input.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function updateActiveResult(nextIndex) {
        var links = Array.prototype.slice.call(resultsBox.querySelectorAll('.cpp-search-result'));
        if (!links.length) {
            activeIndex = -1;
            return;
        }
        activeIndex = Math.max(0, Math.min(nextIndex, links.length - 1));
        links.forEach(function (link, index) {
            link.classList.toggle('is-active', index === activeIndex);
            link.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');
        });
        links[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    function renderResults(records, query) {
        visibleResults = records;
        activeIndex = -1;

        if (!query) {
            resultsBox.innerHTML = '';
            setOpen(false);
            return;
        }

        if (!records.length) {
            resultsBox.innerHTML = '<div class="cpp-search-status">没有找到“' + escapeHtml(query) + '”相关内容。</div>';
            setOpen(true);
            return;
        }

        resultsBox.innerHTML = records.map(function (record, index) {
            var chapterLabel = record.type === 'chapter' ? '章节' : record.chapter;
            return '<a class="cpp-search-result" role="option" aria-selected="false" data-search-index="' + index + '" href="' + escapeHtml(record.href) + '">' +
                '<span class="cpp-search-result-title">' + highlight(record.title, query) + '</span>' +
                '<span class="cpp-search-result-chapter">' + escapeHtml(chapterLabel) + '</span>' +
                '<span class="cpp-search-result-snippet">' + highlight(makeSnippet(record, query), query) + '</span>' +
            '</a>';
        }).join('');
        setOpen(true);
    }

    function runSearch() {
        var rawQuery = input.value.trim();
        var query = normalizeQuery(rawQuery);
        if (!query) {
            renderResults([], '');
            return;
        }

        resultsBox.innerHTML = '<div class="cpp-search-status">正在检索全文…</div>';
        setOpen(true);

        loadRecords().then(function (records) {
            if (input.value.trim() !== rawQuery) return;
            var ranked = records
                .map(function (record) {
                    return { record: record, score: scoreRecord(record, query) };
                })
                .filter(function (item) { return item.score > 0; })
                .sort(function (a, b) {
                    if (b.score !== a.score) return b.score - a.score;
                    return a.record.title.localeCompare(b.record.title, 'zh-CN');
                })
                .slice(0, 12)
                .map(function (item) { return item.record; });
            renderResults(ranked, query);
        });
    }

    input.addEventListener('input', runSearch);
    input.addEventListener('focus', function () {
        if (input.value.trim()) runSearch();
    });

    input.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            updateActiveResult(activeIndex + 1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            updateActiveResult(activeIndex <= 0 ? visibleResults.length - 1 : activeIndex - 1);
        } else if (event.key === 'Enter' && activeIndex >= 0) {
            var active = resultsBox.querySelectorAll('.cpp-search-result')[activeIndex];
            if (active) {
                event.preventDefault();
                active.click();
            }
        } else if (event.key === 'Escape') {
            input.value = '';
            renderResults([], '');
            input.blur();
        }
    });

    resultsBox.addEventListener('click', function (event) {
        var link = event.target.closest && event.target.closest('.cpp-search-result');
        if (!link) return;
        setOpen(false);
        input.blur();
    });

    document.addEventListener('click', function (event) {
        if (!root.contains(event.target)) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
        var isShortcut = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k';
        if (!isShortcut) return;
        event.preventDefault();
        input.focus();
        input.select();
    });

    loadRecords();
})();