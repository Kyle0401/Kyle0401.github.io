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

    function installOutlineStyles() {
        if (document.getElementById('cpp-outline-fix-styles')) return;

        var style = document.createElement('style');
        style.id = 'cpp-outline-fix-styles';
        style.textContent = [
            '.page-outline {',
            '    overflow-x: hidden !important;',
            '    overflow-y: auto !important;',
            '    scrollbar-width: thin;',
            '    scrollbar-color: rgba(20, 109, 160, .45) transparent;',
            '}',
            '.page-outline::-webkit-scrollbar {',
            '    width: 6px;',
            '    height: 0;',
            '}',
            '.page-outline::-webkit-scrollbar-track {',
            '    background: transparent;',
            '}',
            '.page-outline::-webkit-scrollbar-thumb {',
            '    background: rgba(20, 109, 160, .35);',
            '    border-radius: 999px;',
            '}',
            '.page-outline::-webkit-scrollbar-thumb:hover {',
            '    background: rgba(20, 109, 160, .55);',
            '}',
            '.page-outline-toggle {',
            '    width: 100%;',
            '    display: flex;',
            '    align-items: center;',
            '    justify-content: space-between;',
            '    gap: 10px;',
            '    margin: 0;',
            '    padding: 0;',
            '    border: 0;',
            '    color: inherit;',
            '    background: transparent;',
            '    font: inherit;',
            '    text-align: left;',
            '    cursor: pointer;',
            '    user-select: none;',
            '}',
            '.page-outline-toggle:focus-visible {',
            '    outline: 2px solid var(--note-accent);',
            '    outline-offset: 4px;',
            '    border-radius: 6px;',
            '}',
            '.page-outline-toggle-indicator {',
            '    display: inline-flex;',
            '    flex: 0 0 auto;',
            '    align-items: center;',
            '    justify-content: center;',
            '    width: 18px;',
            '    height: 18px;',
            '    font-size: 16px;',
            '    line-height: 1;',
            '    transition: transform .18s ease;',
            '}',
            '.page-outline.is-collapsed .page-outline-toggle-indicator {',
            '    transform: rotate(-90deg);',
            '}',
            '.page-outline.is-collapsed #outline-links {',
            '    display: none !important;',
            '}',
            '#outline-links {',
            '    min-width: 0;',
            '    max-width: 100%;',
            '    overflow-x: hidden !important;',
            '}',
            '#outline-links .outline-link {',
            '    box-sizing: border-box;',
            '    min-width: 0;',
            '    max-width: 100%;',
            '    white-space: normal;',
            '    overflow-wrap: anywhere;',
            '    word-break: break-word;',
            '}',
            'html[data-theme="dark"] .page-outline {',
            '    scrollbar-color: rgba(88, 166, 255, .45) transparent;',
            '}',
            'html[data-theme="dark"] .page-outline::-webkit-scrollbar-thumb {',
            '    background: rgba(88, 166, 255, .35);',
            '}',
            'html[data-theme="dark"] .page-outline::-webkit-scrollbar-thumb:hover {',
            '    background: rgba(88, 166, 255, .55);',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function setupOutlineToggle() {
        var outline = document.getElementById('page-outline');
        var links = document.getElementById('outline-links');
        if (!outline || !links) return;

        var existingButton = document.getElementById('page-outline-toggle');
        if (existingButton) return;

        var title = outline.querySelector('.page-outline-title');
        if (!title) return;

        var button = document.createElement('button');
        button.id = 'page-outline-toggle';
        button.type = 'button';
        button.className = 'page-outline-title page-outline-toggle';
        button.setAttribute('aria-controls', 'outline-links');
        button.setAttribute('aria-expanded', 'true');

        var label = document.createElement('span');
        label.className = 'page-outline-toggle-label';
        label.textContent = '本章内容';

        var indicator = document.createElement('span');
        indicator.className = 'page-outline-toggle-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        indicator.textContent = '⌄';

        button.appendChild(label);
        button.appendChild(indicator);
        title.replaceWith(button);

        function setCollapsed(collapsed) {
            outline.classList.toggle('is-collapsed', collapsed);
            button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            button.setAttribute('aria-label', collapsed ? '展开本章内容' : '折叠本章内容');
        }

        button.addEventListener('click', function () {
            setCollapsed(!outline.classList.contains('is-collapsed'));
        });

        setCollapsed(false);
    }

    installOutlineStyles();
    setupOutlineToggle();

    var baseScript = document.createElement('script');
    baseScript.src = './cpp-language-page-base.js?v=20260811b';
    baseScript.async = false;
    baseScript.addEventListener('load', function () {
        setupOutlineToggle();
    });
    document.head.appendChild(baseScript);
})();