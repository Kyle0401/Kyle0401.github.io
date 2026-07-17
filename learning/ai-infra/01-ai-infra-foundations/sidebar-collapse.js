(function () {
  'use strict';

  var nav = document.getElementById('page-nav');
  if (!nav) return;

  function topLevelChapterFromHash() {
    var hash = String(window.location.hash || '');
    var match = hash.match(/^#(?:page|section)-(\d+)/);
    return match ? match[1] : '1';
  }

  function chapterNumber(group) {
    var heading = group.querySelector('.page-nav-chapter');
    var text = heading ? heading.textContent : '';
    var match = String(text || '').trim().match(/^(\d+)/);
    return match ? match[1] : '';
  }

  function setExpanded(group, expanded) {
    var button = group.querySelector('.page-nav-toggle');
    var items = group.querySelector('.page-nav-items');
    if (!button || !items) return;

    group.classList.toggle('is-collapsed', !expanded);
    button.setAttribute('aria-expanded', String(expanded));
    items.hidden = !expanded;
  }

  function enhanceGroup(group, index) {
    if (group.dataset.collapsibleReady === 'true') return;

    var heading = group.querySelector('.page-nav-chapter');
    if (!heading) return;

    var links = Array.prototype.slice.call(group.querySelectorAll(':scope > .page-nav-link'));
    if (!links.length) return;

    var chapter = chapterNumber(group);
    var items = document.createElement('div');
    var itemsId = 'page-nav-items-' + (chapter || index + 1);
    items.className = 'page-nav-items';
    items.id = itemsId;
    links.forEach(function (link) { items.appendChild(link); });

    var button = document.createElement('button');
    button.className = 'page-nav-toggle';
    button.type = 'button';
    button.setAttribute('aria-controls', itemsId);

    var label = document.createElement('span');
    label.className = 'page-nav-toggle-label';
    label.textContent = heading.textContent;

    var chevron = document.createElement('span');
    chevron.className = 'page-nav-chevron';
    chevron.setAttribute('aria-hidden', 'true');

    button.appendChild(label);
    button.appendChild(chevron);
    heading.textContent = '';
    heading.appendChild(button);
    group.appendChild(items);
    group.dataset.collapsibleReady = 'true';

    button.addEventListener('click', function () {
      setExpanded(group, button.getAttribute('aria-expanded') !== 'true');
    });

    setExpanded(group, chapter === topLevelChapterFromHash());
  }

  function enhanceNavigation() {
    Array.prototype.forEach.call(nav.querySelectorAll('.page-nav-group'), enhanceGroup);
  }

  function revealCurrentChapter() {
    var current = topLevelChapterFromHash();
    Array.prototype.forEach.call(nav.querySelectorAll('.page-nav-group'), function (group) {
      if (chapterNumber(group) === current) setExpanded(group, true);
    });
  }

  var observer = new MutationObserver(function () {
    enhanceNavigation();
    revealCurrentChapter();
  });

  observer.observe(nav, { childList: true, subtree: true });
  window.addEventListener('hashchange', revealCurrentChapter);
  enhanceNavigation();
})();
