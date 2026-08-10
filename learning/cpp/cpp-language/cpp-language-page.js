(function () {
    'use strict';

    var previousFetch = window.fetch;

    var chapter13SectionPromise = previousFetch('./chapter13-stl.md?v=20260811b')
        .then(function (response) {
            if (!response.ok) {
                throw new Error('Failed to load chapter 13 STL notes.');
            }
            return response.text();
        })
        .catch(function () {
            return '';
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
                        '\n\n' + chapter13Section + '\n\n### 14、类型别名声明（using别名）'
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

    var baseScript = document.createElement('script');
    baseScript.src = './cpp-language-page-base.js?v=20260811a';
    baseScript.async = false;
    document.head.appendChild(baseScript);
})();
