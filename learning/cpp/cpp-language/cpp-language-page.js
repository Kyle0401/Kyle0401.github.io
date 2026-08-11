(function () {
    'use strict';

    var previousFetch = window.fetch;
    var outlineGroupState = Object.create(null);

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
            '.outline-group {',
            '    min-width: 0;',
            '    max-width: 100%;',
            '}',
            '.outline-parent-row {',
            '    display: grid;',
            '    grid-template-columns: minmax(0, 1fr);',
            '    align-items: start;',
            '    min-width: 0;',
            '}',
            '.outline-parent-row.has-children {',
            '    grid-template-columns: minmax(0, 1fr) 24px;',
            '}',
            '.outline-parent-row > .outline-level-4 {',
            '    min-width: 0;',
            '}',
            '.outline-group-toggle {',
            '    display: inline-flex;',
            '    align-items: center;',
            '    justify-content: center;',
            '    width: 24px;',
            '    height: 28px;',
            '    margin: 0;',
            '    padding: 0;',
            '    border: 0;',
            '    border-radius: 6px;',
            '    color: var(--docker-muted);',
            '    background: transparent;',
            '    cursor: pointer;',
            '}',
            '.outline-group-toggle:hover {',
            '    color: var(--docker-deep);',
            '    background: rgba(20, 109, 160, .08);',
            '}',
            '.outline-group-toggle:focus-visible {',
            '    outline: 2px solid var(--note-accent);',
            '    outline-offset: 1px;',
            '}',
            '.outline-group-toggle-indicator {',
            '    display: inline-flex;',
            '    align-items: center;',
            '    justify-content: center;',
            '    font-size: 15px;',
            '    line-height: 1;',
            '    transition: transform .18s ease;',
            '}',
            '.outline-group.is-collapsed .outline-group-toggle-indicator {',
            '    transform: rotate(-90deg);',
            '}',
            '.outline-group.is-collapsed .outline-group-children {',
            '    display: none;',
            '}',
            '.outline-group-children {',
            '    min-width: 0;',
            '    max-width: 100%;',
            '}',
            'html[data-theme="dark"] .page-outline {',
            '    scrollbar-color: rgba(88, 166, 255, .45) transparent;',
            '}',
            'html[data-theme="dark"] .page-outline::-webkit-scrollbar-thumb {',
            '    background: rgba(88, 166, 255, .35);',
            '}',
            'html[data-theme="dark"] .page-outline::-webkit-scrollbar-thumb:hover {',
            '    background: rgba(88, 166, 255, .55);',
            '}',
            'html[data-theme="dark"] .outline-group-toggle:hover {',
            '    color: #79c0ff;',
            '    background: rgba(88, 166, 255, .10);',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function setupGroupedOutline() {
        var outline = document.getElementById('page-outline');
        var links = document.getElementById('outline-links');
        if (!outline || !links || !window.MutationObserver) return;

        outline.classList.remove('is-collapsed');

        var oldGlobalToggle = document.getElementById('page-outline-toggle');
        if (oldGlobalToggle) {
            var title = document.createElement('p');
            title.className = 'page-outline-title';
            title.textContent = '本章内容';
            oldGlobalToggle.replaceWith(title);
        }

        if (links.getAttribute('data-grouped-outline-observer') === 'true') return;
        links.setAttribute('data-grouped-outline-observer', 'true');

        var enhancing = false;

        function hasOwnState(key) {
            return Object.prototype.hasOwnProperty.call(outlineGroupState, key);
        }

        function enhanceGroups() {
            if (enhancing) return;

            var children = Array.prototype.slice.call(links.children);
            var hasDirectLevel4 = children.some(function (node) {
                return node.matches && node.matches('a.outline-level-4');
            });

            if (!hasDirectLevel4) return;

            enhancing = true;

            var fragment = document.createDocumentFragment();
            var currentGroup = null;
            var currentChildren = null;

            children.forEach(function (node) {
                if (node.matches && node.matches('a.outline-level-4')) {
                    var group = document.createElement('div');
                    var row = document.createElement('div');
                    var childBox = document.createElement('div');
                    var groupKey = node.getAttribute('href') || (node.textContent || '').trim();
                    var collapsed = hasOwnState(groupKey) ? outlineGroupState[groupKey] : true;

                    group.className = collapsed ? 'outline-group is-collapsed' : 'outline-group';
                    group.setAttribute('data-outline-group-key', groupKey);
                    row.className = 'outline-parent-row';
                    childBox.className = 'outline-group-children';

                    row.appendChild(node);
                    group.appendChild(row);
                    group.appendChild(childBox);
                    fragment.appendChild(group);

                    currentGroup = group;
                    currentChildren = childBox;
                    return;
                }

                if (
                    currentGroup &&
                    node.matches &&
                    node.matches('a.outline-level-5, a.outline-level-6')
                ) {
                    currentChildren.appendChild(node);
                    return;
                }

                fragment.appendChild(node);
                currentGroup = null;
                currentChildren = null;
            });

            links.replaceChildren(fragment);

            Array.prototype.forEach.call(links.querySelectorAll('.outline-group'), function (group) {
                var row = group.querySelector('.outline-parent-row');
                var parentLink = row && row.querySelector('a.outline-level-4');
                var childBox = group.querySelector('.outline-group-children');
                if (!row || !parentLink || !childBox || !childBox.children.length) return;

                row.classList.add('has-children');

                var button = document.createElement('button');
                var indicator = document.createElement('span');
                var label = (parentLink.textContent || '').trim();
                var groupKey = group.getAttribute('data-outline-group-key') || parentLink.getAttribute('href') || label;
                var collapsed = group.classList.contains('is-collapsed');

                button.type = 'button';
                button.className = 'outline-group-toggle';
                button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
                button.setAttribute(
                    'aria-label',
                    (collapsed ? '展开“' : '折叠“') + label + '”的子目录'
                );

                indicator.className = 'outline-group-toggle-indicator';
                indicator.setAttribute('aria-hidden', 'true');
                indicator.textContent = '⌄';

                button.appendChild(indicator);
                row.appendChild(button);

                button.addEventListener('click', function () {
                    var nextCollapsed = group.classList.toggle('is-collapsed');
                    outlineGroupState[groupKey] = nextCollapsed;
                    button.setAttribute('aria-expanded', nextCollapsed ? 'false' : 'true');
                    button.setAttribute(
                        'aria-label',
                        (nextCollapsed ? '展开“' : '折叠“') + label + '”的子目录'
                    );
                });
            });

            enhancing = false;
        }

        var observer = new MutationObserver(function () {
            if (enhancing) return;
            enhanceGroups();
        });

        observer.observe(links, { childList: true });
        enhanceGroups();
    }

    installOutlineStyles();
    setupGroupedOutline();

    var baseScript = document.createElement('script');
    baseScript.src = './cpp-language-page-base.js?v=20260811b';
    baseScript.async = false;
    baseScript.addEventListener('load', function () {
        setupGroupedOutline();
    });
    document.head.appendChild(baseScript);
})();