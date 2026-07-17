(function () {
    'use strict';

    var content = document.getElementById('article-content');
    var outlineLinks = document.getElementById('outline-links');
    if (!content || !outlineLinks) return;

    var cleanupScheduled = false;

    function copyHeadingContent(heading, container) {
        Array.prototype.forEach.call(heading.childNodes, function (node) {
            if (node.nodeType === 1 && node.classList.contains('heading-anchor')) return;
            container.appendChild(node.cloneNode(true));
        });
    }

    function removeOutlineLink(id) {
        if (!id) return;
        Array.prototype.forEach.call(outlineLinks.querySelectorAll('a'), function (link) {
            if (link.getAttribute('href') === '#' + id) link.remove();
        });
    }

    function cleanupOutline() {
        cleanupScheduled = false;

        var embeddedHeadings = content.querySelectorAll(
            '.doc-page-body blockquote h2, ' +
            '.doc-page-body blockquote h3, ' +
            '.doc-page-body blockquote h4, ' +
            '.doc-page-body blockquote h5'
        );

        Array.prototype.forEach.call(embeddedHeadings, function (heading) {
            var replacement = document.createElement('p');
            var label = document.createElement('strong');

            replacement.className = 'embedded-heading embedded-heading-' + heading.tagName.toLowerCase();
            copyHeadingContent(heading, label);
            replacement.appendChild(label);

            removeOutlineLink(heading.id);
            heading.parentNode.replaceChild(replacement, heading);
        });
    }

    function scheduleCleanup() {
        if (cleanupScheduled) return;
        cleanupScheduled = true;
        window.requestAnimationFrame(cleanupOutline);
    }

    new MutationObserver(scheduleCleanup).observe(content, {
        childList: true,
        subtree: true
    });

    window.addEventListener('hashchange', scheduleCleanup);
    scheduleCleanup();
})();
