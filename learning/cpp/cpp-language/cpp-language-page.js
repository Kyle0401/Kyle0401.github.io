(function () {
    'use strict';

    var previousFetch = window.fetch;

    function loadNote(path, errorMessage) {
        return previousFetch(path)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error(errorMessage);
                }
                return response.text();
            })
            .catch(function () {
                return '';
            });
    }

    function normalizeReferenceLabels(markdown) {
        return markdown.replace(/^参考：(.*)$/gm, function (line) {
            return line.replace(/`([^`]+)`/g, '$1');
        });
    }

    var chapter13SectionPromise = Promise.all([
        loadNote('./chapter13-stl.md?v=20260811c', 'Failed to load chapter 13 STL notes.'),
        loadNote('./chapter13-vector-bool.md?v=20260811b', 'Failed to load vector<bool> notes.')
    ]).then(function (sections) {
        return normalizeReferenceLabels(sections.filter(Boolean).join('\n\n'));
    });

    window.fetch = function () {
        var args = arguments;
        var input = args[0];
        var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');

        return previousFetch.apply(window, args).then(function (response) {
            var decodedUrl = url;
            try { decodedUrl = decodeURIComponent(url); }
            catch (error) {}

            if (decodedUrl.indexOf('C++语言学习.md') === -1) return response;

            return Promise.all([response.text(), chapter13SectionPromise]).then(function (results) {
                var markdown = results[0];
                var chapter13Section = results[1];

                if (
                    chapter13Section &&
                    markdown.indexOf('#### 13.1 `std::array`：固定大小连续容器') === -1
                ) {
                    markdown = markdown.replace(
                        '\n### 14、类型别名声明（using别名）',
                        '\n\n' + chapter13Section +
                        '\n\n[legacy-vector-data-section]: # "#### 13.2 `std::vector::data()`：取得底层连续存储的首地址"' +
                        '\n\n### 14、类型别名声明（using别名）'
                    );
                }

                var headers = new Headers(response.headers);
                headers.delete('content-length');
                return new Response(markdown, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: headers
                });
            });
        });
    };

    function enableCollapsibleOutline() {
        var outline = document.getElementById('page-outline');
        var title = outline && outline.querySelector('.page-outline-title');
        var links = document.getElementById('outline-links');

        if (!outline || !title || !links || title.classList.contains('is-collapsible')) {
            return;
        }

        var indicator = document.createElement('span');
        indicator.className = 'page-outline-toggle-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        indicator.textContent = '⌄';
        title.appendChild(indicator);

        title.classList.add('is-collapsible');
        title.setAttribute('role', 'button');
        title.setAttribute('tabindex', '0');
        title.setAttribute('aria-controls', 'outline-links');
        title.setAttribute('aria-expanded', 'true');

        function setCollapsed(collapsed) {
            outline.classList.toggle('is-collapsed', collapsed);
            links.hidden = collapsed;
            title.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        }

        function toggleOutline() {
            setCollapsed(!outline.classList.contains('is-collapsed'));
        }

        title.addEventListener('click', toggleOutline);
        title.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleOutline();
            }
        });

        var style = document.createElement('style');
        style.textContent = [
            '.page-outline-title.is-collapsible {',
            '    display: flex;',
            '    align-items: center;',
            '    justify-content: space-between;',
            '    gap: 10px;',
            '    cursor: pointer;',
            '    user-select: none;',
            '}',
            '.page-outline-title.is-collapsible:focus-visible {',
            '    outline: 2px solid var(--note-accent);',
            '    outline-offset: 4px;',
            '    border-radius: 6px;',
            '}',
            '.page-outline-toggle-indicator {',
            '    display: inline-flex;',
            '    flex: 0 0 auto;',
            '    font-size: 16px;',
            '    line-height: 1;',
            '    transition: transform .18s ease;',
            '}',
            '.page-outline.is-collapsed .page-outline-toggle-indicator {',
            '    transform: rotate(-90deg);',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    enableCollapsibleOutline();

    var baseScript = document.createElement('script');
    baseScript.src = './cpp-language-page-base.js?v=20260811a';
    baseScript.async = false;
    document.head.appendChild(baseScript);
})();