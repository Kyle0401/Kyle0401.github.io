(function () {
  'use strict';

  var content = document.getElementById('article-content');
  var pageNav = document.getElementById('page-nav');
  var outlineLinks = document.getElementById('outline-links');
  var pagination = document.getElementById('page-pagination');
  var docsTitle = document.getElementById('docs-title');
  var docsSidebar = document.getElementById('docs-sidebar');
  var mobileNavToggle = document.getElementById('mobile-nav-toggle');
  var docsOverlay = document.getElementById('docs-overlay');
  var progressButton = document.getElementById('reading-progress');
  var progressValue = document.getElementById('reading-progress-value');
  var progressLabel = document.getElementById('reading-progress-label');
  var commentsThread = document.getElementById('comments-thread');

  if (!content || !pageNav || !outlineLinks || !pagination) return;

  var pages = [];
  var siteTitle = 'FreeRTOS 学习记录';
  var currentPageIndex = 0;
  var outlineObserver = null;
  var currentIssueTerm = '';
  var circleLength = 2 * Math.PI * 21;

  function esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function safeUrl(value, isImage) {
    var url = String(value || '').trim().replace(/^<|>$/g, '');
    var compact = url.replace(/[\u0000-\u0020\u007f]+/g, '').toLowerCase();
    var scheme = compact.match(/^([a-z][a-z0-9+.-]*):/);

    if (!url || /^(javascript|vbscript|file|data):/.test(compact)) return '';
    if (scheme && ['http', 'https', 'mailto', 'tel'].indexOf(scheme[1]) === -1) return '';
    if (isImage && scheme && ['http', 'https'].indexOf(scheme[1]) === -1) return '';
    return url;
  }

  function codeLanguage(value) {
    var language = String(value || '').trim().toLowerCase();
    var aliases = {
      'c++': 'cpp',
      cc: 'cpp',
      cxx: 'cpp',
      hpp: 'cpp',
      h: 'c',
      asm: 'armasm',
      assembly: 'armasm',
      s: 'armasm',
      sh: 'bash',
      shell: 'bash',
      console: 'bash',
      terminal: 'bash',
      cmd: 'bash',
      txt: 'plaintext',
      text: 'plaintext',
      plain: 'plaintext'
    };

    if (!language) return 'plaintext';
    language = aliases[language] || language;
    return /^[a-z0-9_+-]+$/.test(language) ? language : 'plaintext';
  }

  function linkHtml(label, destination, title) {
    var url = safeUrl(destination, false);
    if (!url) return inline(label);

    var external = /^(?:https?:)?\/\//i.test(url);
    var literalUrlLabel = String(label) === String(destination) && /^(?:https?:\/\/|mailto:)/i.test(String(label));
    var attributes = ' href="' + esc(url) + '"';
    if (title) attributes += ' title="' + esc(title) + '"';
    if (external) attributes += ' target="_blank" rel="noopener noreferrer"';
    return '<a' + attributes + '>' + (literalUrlLabel ? esc(label) : inline(label)) + '</a>';
  }

  function inline(value) {
    var parts = [];
    var source = String(value || '');

    function stash(html) {
      var token = '\u0001P' + parts.length + '\u0002';
      parts.push(html);
      return token;
    }

    source = source.replace(/(\x60+)([\s\S]*?)\1/g, function (_, marker, code) {
      return stash('<code>' + esc(code.trim()) + '</code>');
    });
    source = source.replace(/\\([!-/:-@\x5b-\x60{-~])/g, function (_, punctuation) {
      return stash(esc(punctuation));
    });
    source = source.replace(/<br\s*\/?>/gi, function () {
      return stash('<br>');
    });
    source = source.replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/gi, function (_, url) {
      return stash(linkHtml(url, url, ''));
    });
    source = source.replace(/\[([^\]]+)\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["']([^"']*)["'])?\s*\)/g, function (_, label, url, title) {
      return stash(linkHtml(label, url, title || ''));
    });
    source = source.replace(/(^|[\s(（【\[])((?:https?:\/\/)[A-Za-z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+)/gi, function (_, prefix, rawUrl) {
      var url = rawUrl;
      var suffix = '';
      while (/[),.!?;:，。！？；：）】》]$/.test(url)) {
        suffix = url.slice(-1) + suffix;
        url = url.slice(0, -1);
      }
      return prefix + stash(linkHtml(url, url, '')) + suffix;
    });

    var result = esc(source);
    result = result
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/(^|[^\w])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    result = result.replace(/ {2,}\n/g, '<br>').replace(/\n+/g, ' ');

    for (var partIndex = parts.length - 1; partIndex >= 0; partIndex--) {
      result = result.split('\u0001P' + partIndex + '\u0002').join(parts[partIndex]);
    }
    return result;
  }

  function plainText(value) {
    var node = document.createElement('div');
    node.innerHTML = inline(value);
    return (node.textContent || node.innerText || String(value)).trim();
  }

  function escapedAt(value, index) {
    var slashes = 0;
    for (var position = index - 1; position >= 0 && value.charAt(position) === '\\'; position--) slashes++;
    return slashes % 2 === 1;
  }

  function cells(line) {
    var value = String(line || '').trim();
    var result = [];
    var current = '';
    var inCode = false;

    if (value.charAt(0) === '|') value = value.slice(1);
    if (value.charAt(value.length - 1) === '|' && !escapedAt(value, value.length - 1)) value = value.slice(0, -1);

    for (var index = 0; index < value.length; index++) {
      var character = value.charAt(index);
      var next = value.charAt(index + 1);

      if (character === '\\' && next === '|') {
        current += '|';
        index++;
        continue;
      }
      if (character === '\x60') {
        inCode = !inCode;
        current += character;
        continue;
      }
      if (character === '|' && !inCode) {
        result.push(current.trim());
        current = '';
        continue;
      }
      current += character;
    }
    result.push(current.trim());
    return result;
  }

  function tableDelimiter(line) {
    var parts = cells(line);
    return parts.length > 0 && parts.every(function (part) {
      return /^:?-{3,}:?$/.test(part.trim());
    });
  }

  function hasTablePipe(line) {
    var value = String(line || '');
    for (var index = 0; index < value.length; index++) {
      if (value.charAt(index) === '|' && !escapedAt(value, index)) return true;
    }
    return false;
  }

  function tableStart(line, next) {
    return hasTablePipe(line) && hasTablePipe(next) && tableDelimiter(next);
  }

  function listItem(line) {
    var expanded = String(line || '').replace(/\t/g, '    ');
    var match = expanded.match(/^(\s*)([-+*]|\d+[.)])\s+(.+)$/);
    if (!match) return null;
    return {
      indent: match[1].length,
      marker: match[2],
      type: /^\d/.test(match[2]) ? 'ol' : 'ul',
      number: /^\d/.test(match[2]) ? Number(match[2].match(/^\d+/)[0]) : 1,
      text: match[3]
    };
  }

  function headingMatch(line) {
    return String(line || '').match(/^(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/);
  }

  function headingParts(value) {
    var text = String(value || '').trim();
    var explicit = text.match(/\s+\{#([A-Za-z0-9_\-:.]+)\}\s*$/);
    if (explicit) text = text.slice(0, explicit.index).trim();
    return { text: text, explicitId: explicit ? explicit[1] : '' };
  }

  function slugBase(value) {
    var slug = plainText(value)
      .toLowerCase()
      .replace(/&[a-z]+;/g, '')
      .replace(/[\s/]+/g, '-')
      .replace(/[^\w\u00c0-\uffff-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return slug;
  }

  function fenceStart(line) {
    var match = String(line || '').match(/^\s*(\x60{3,}|~{3,})\s*(.*)$/);
    return match ? { marker: match[1], info: match[2] || '' } : null;
  }

  function fenceClose(line, marker) {
    var value = String(line || '').trim();
    if (!marker || value.charAt(0) !== marker.charAt(0)) return false;
    return value.length >= marker.length && new RegExp('^' + (marker.charAt(0) === '~' ? '~' : '\\x60') + '{' + marker.length + ',}\\s*$').test(value);
  }

  function renderCodeBlock(code, fenceInfo) {
    var info = String(fenceInfo || '').trim();
    var language = info.split(/\s+/)[0] || 'text';
    var titleMatch = info.match(/(?:^|\s)title=(?:"([^"]*)"|'([^']*)'|([^\s]+))/);
    var label = language || 'text';

    if (titleMatch) {
      label = titleMatch[1] !== undefined ? titleMatch[1]
        : titleMatch[2] !== undefined ? titleMatch[2]
          : titleMatch[3];
    }

    return '<div class="code-block"><div class="code-language"><span class="code-language-text">' +
      esc(label) + '</span></div><pre><code class="language-' + esc(codeLanguage(language)) + '">' +
      esc(code.join('\n')) + '</code></pre></div>';
  }

  function readFence(lines, startIndex) {
    var start = fenceStart(lines[startIndex]);
    var code = [];
    var index = startIndex + 1;

    while (index < lines.length && !fenceClose(lines[index], start.marker)) {
      code.push(lines[index]);
      index++;
    }
    if (index < lines.length) index++;
    return { html: renderCodeBlock(code, start.info), index: index };
  }

  function markdownImage(line) {
    var match = String(line || '').trim().match(/^!\[([^\]]*)\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["']([^"']*)["'])?\s*\)$/);
    if (!match) return null;
    return {
      alt: match[1] || '',
      src: match[2] || '',
      title: match[3] || ''
    };
  }

  function renderFigure(srcValue, altValue, titleValue, widthValue, naturalScaleValue) {
    var src = safeUrl(srcValue, true);
    if (!src) return '';

    var alt = plainText(altValue || titleValue || '');
    var caption = altValue ? inline(altValue) : (titleValue ? inline(titleValue) : '');
    var style = '';
    var width = String(widthValue || '').trim();
    var naturalScale = Number(naturalScaleValue || 0);
    var naturalScaleAttribute = '';

    if (Number.isFinite(naturalScale) && naturalScale > 0 && naturalScale <= 5) {
      naturalScaleAttribute = ' data-natural-scale="' + esc(String(naturalScale)) + '"';
    } else if (/^\d+(?:\.\d+)?%$/.test(width)) style = ' style="width:' + esc(width) + ';max-width:100%"';
    else if (/^\d+(?:\.\d+)?(?:px|rem|em|vw)$/.test(width)) style = ' style="width:' + esc(width) + ';max-width:100%"';
    else if (/^\d+(?:\.\d+)?$/.test(width)) style = ' style="width:' + esc(width) + 'px;max-width:100%"';

    return '<figure class="figure"><img src="' + esc(src) + '" alt="' + esc(alt) +
      '" loading="lazy" decoding="async"' + naturalScaleAttribute + style + '>' +
      (caption ? '<figcaption>' + caption + '</figcaption>' : '') + '</figure>';
  }

  function htmlAttribute(tag, name) {
    var expression = new RegExp('\\b' + name + '\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))', 'i');
    var match = String(tag || '').match(expression);
    if (!match) return '';
    return match[1] !== undefined ? match[1] : match[2] !== undefined ? match[2] : match[3] || '';
  }

  function renderHtmlImages(html) {
    var tags = String(html || '').match(/<img\b[\s\S]*?>/gi) || [];
    var figures = tags.map(function (tag) {
      var src = htmlAttribute(tag, 'src');
      var alt = htmlAttribute(tag, 'alt');
      var title = htmlAttribute(tag, 'title');
      var width = htmlAttribute(tag, 'width');
      var zoom = tag.match(/zoom\s*:\s*["']?(\d+(?:\.\d+)?%)/i);
      var cssWidth = tag.match(/(?:^|[;"'])\s*width\s*:\s*(\d+(?:\.\d+)?(?:%|px|rem|em|vw)?)/i);
      var naturalScale = zoom ? parseFloat(zoom[1]) / 100 : 0;
      return renderFigure(src, alt, title, zoom ? '' : cssWidth ? cssWidth[1] : width, naturalScale);
    }).filter(Boolean);

    if (!figures.length) return '';
    if (figures.length === 1) return figures[0];
    return '<div class="image-gallery">' + figures.join('') + '</div>';
  }

  function unwrapElement(element) {
    var parent = element.parentNode;
    if (!parent) return;
    while (element.firstChild) parent.insertBefore(element.firstChild, element);
    parent.removeChild(element);
  }

  function sanitizeTrustedTable(html) {
    var template = document.createElement('template');
    var allowed = {
      TABLE: true, THEAD: true, TBODY: true, TFOOT: true, TR: true,
      TH: true, TD: true, CAPTION: true, COLGROUP: true, COL: true,
      P: true, BR: true, STRONG: true, B: true, EM: true, I: true,
      CODE: true, PRE: true, SPAN: true, SUB: true, SUP: true,
      A: true, IMG: true, UL: true, OL: true, LI: true
    };
    var blocked = { SCRIPT: true, STYLE: true, IFRAME: true, OBJECT: true, EMBED: true, FORM: true };

    template.innerHTML = String(html || '');
    Array.prototype.slice.call(template.content.querySelectorAll('*')).forEach(function (element) {
      if (!element.parentNode) return;
      if (blocked[element.tagName]) {
        element.parentNode.removeChild(element);
        return;
      }
      if (!allowed[element.tagName]) {
        unwrapElement(element);
        return;
      }

      Array.prototype.slice.call(element.attributes).forEach(function (attribute) {
        var name = attribute.name.toLowerCase();
        var value = attribute.value;
        var keep = false;

        if (/^(rowspan|colspan|span)$/.test(name) && /^\d{1,3}$/.test(value)) keep = true;
        if (/^(scope|headers|abbr|title)$/.test(name)) keep = true;
        if (/^(align|valign)$/.test(name) && /^(left|right|center|top|middle|bottom)$/i.test(value)) keep = true;
        if (element.tagName === 'A' && name === 'href' && safeUrl(value, false)) keep = true;
        if (element.tagName === 'IMG' && name === 'src' && safeUrl(value, true)) keep = true;
        if (element.tagName === 'IMG' && /^(alt|width|height)$/.test(name) && /^[^<>]*$/.test(value)) keep = true;
        if (!keep) element.removeAttribute(attribute.name);
      });

      if (element.tagName === 'A' && element.hasAttribute('href')) {
        var href = element.getAttribute('href');
        if (/^(?:https?:)?\/\//i.test(href)) {
          element.setAttribute('target', '_blank');
          element.setAttribute('rel', 'noopener noreferrer');
        }
      }
      if (element.tagName === 'IMG' && element.hasAttribute('src')) {
        element.setAttribute('loading', 'lazy');
        element.setAttribute('decoding', 'async');
      }
    });
    return template.innerHTML;
  }

  function readRawTable(lines, startIndex) {
    var table = [];
    var index = startIndex;
    while (index < lines.length) {
      table.push(lines[index]);
      if (/<\/table\s*>/i.test(lines[index])) {
        index++;
        break;
      }
      index++;
    }
    return {
      html: '<div class="table-wrap raw-table" tabindex="0">' + sanitizeTrustedTable(table.join('\n')) + '</div>',
      index: index
    };
  }

  function leadingIndent(line) {
    var match = String(line || '').replace(/\t/g, '    ').match(/^\s*/);
    return match ? match[0].length : 0;
  }

  function listItemHtml(text) {
    var task = String(text || '').match(/^\[([ xX])\]\s+(.+)$/);
    if (!task) return { className: '', html: inline(text) };
    return {
      className: ' class="task-list-item"',
      html: '<input type="checkbox" disabled' + (task[1].toLowerCase() === 'x' ? ' checked' : '') + '> ' + inline(task[2])
    };
  }

  function renderList(lines, startIndex, baseIndent) {
    var first = listItem(lines[startIndex]);
    var type = first.type;
    var startAttribute = type === 'ol' && first.number !== 1 ? ' start="' + first.number + '"' : '';
    var html = '<' + type + startAttribute + '>';
    var index = startIndex;
    var itemOpen = false;

    while (index < lines.length) {
      if (!lines[index].trim()) {
        var lookahead = index + 1;
        while (lookahead < lines.length && !lines[lookahead].trim()) lookahead++;
        var afterBlank = listItem(lines[lookahead]);
        if (afterBlank && afterBlank.indent >= baseIndent) {
          index = lookahead;
          continue;
        }
        break;
      }

      var item = listItem(lines[index]);
      if (!item) {
        if (itemOpen && leadingIndent(lines[index]) > baseIndent) {
          var continuation = lines[index].trim();
          var continuationImage = markdownImage(continuation);
          if (continuationImage) {
            html += renderFigure(continuationImage.src, continuationImage.alt, continuationImage.title, '');
          } else {
            html += '<br>' + inline(continuation);
          }
          index++;
          continue;
        }
        break;
      }
      if (item.indent < baseIndent) break;
      if (item.indent > baseIndent) {
        if (!itemOpen) break;
        var nested = renderList(lines, index, item.indent);
        html += nested.html;
        index = nested.index;
        continue;
      }
      if (item.type !== type) break;

      if (itemOpen) html += '</li>';
      var itemContent = listItemHtml(item.text);
      html += '<li' + itemContent.className + '>' + itemContent.html;
      itemOpen = true;
      index++;
    }

    if (itemOpen) html += '</li>';
    html += '</' + type + '>';
    return { html: html, index: index };
  }

  function calloutTitle(type) {
    var titles = {
      note: '说明',
      info: '说明',
      tip: '提示',
      important: '重要',
      warning: '注意',
      caution: '注意',
      danger: '警告'
    };
    return titles[type] || '说明';
  }

  function renderCallout(type, title, bodyLines) {
    var safeType = /^(?:warning|caution|danger)$/.test(type) ? type : '';
    var label = title || calloutTitle(type);
    return '<aside class="callout' + (safeType ? ' ' + safeType : '') + '"><div>' +
      '<strong class="callout-title">' + esc(label) + '</strong>' +
      parse(bodyLines, []) + '</div></aside>';
  }

  function blockStart(line, next) {
    var value = String(line || '');
    return Boolean(
      headingMatch(value) ||
      fenceStart(value) ||
      /^-{3,}\s*$/.test(value) ||
      /^>\s?/.test(value) ||
      listItem(value) ||
      tableStart(value, next || '') ||
      markdownImage(value) ||
      /^\s*<table\b/i.test(value) ||
      /^\s*<img\b/i.test(value) ||
      /^\s*:::\s*\w+/.test(value) ||
      /^\s*<!--/.test(value)
    );
  }

  function parse(lines, headingMetas) {
    var metas = (headingMetas || []).slice();
    var output = [];
    var index = 0;

    while (index < lines.length) {
      var line = lines[index];
      var next = lines[index + 1] || '';

      if (!line.trim()) {
        index++;
        continue;
      }

      if (/^\s*<!--/.test(line)) {
        while (index < lines.length && !/-->/.test(lines[index])) index++;
        if (index < lines.length) index++;
        continue;
      }

      var fence = fenceStart(line);
      if (fence) {
        var fenced = readFence(lines, index);
        output.push(fenced.html);
        index = fenced.index;
        continue;
      }

      var container = line.match(/^\s*:::\s*(note|info|tip|important|warning|caution|danger)\s*(.*)$/i);
      if (container) {
        var containerLines = [];
        index++;
        while (index < lines.length && !/^\s*:::\s*$/.test(lines[index])) {
          containerLines.push(lines[index]);
          index++;
        }
        if (index < lines.length) index++;
        output.push(renderCallout(container[1].toLowerCase(), container[2].trim(), containerLines));
        continue;
      }

      if (/^>\s?/.test(line)) {
        var quoteLines = [];
        while (index < lines.length) {
          if (/^>\s?/.test(lines[index])) {
            quoteLines.push(lines[index].replace(/^>\s?/, ''));
            index++;
            continue;
          }
          if (!lines[index].trim() && index + 1 < lines.length && /^>\s?/.test(lines[index + 1])) {
            quoteLines.push('');
            index++;
            continue;
          }
          break;
        }

        var callout = quoteLines[0] && quoteLines[0].match(/^\[!(NOTE|INFO|TIP|IMPORTANT|WARNING|CAUTION|DANGER)\]\s*(.*)$/i);
        if (callout) {
          quoteLines.shift();
          output.push(renderCallout(callout[1].toLowerCase(), callout[2].trim(), quoteLines));
        } else {
          output.push('<blockquote>' + parse(quoteLines, []) + '</blockquote>');
        }
        continue;
      }

      if (/^-{3,}\s*$/.test(line)) {
        output.push('<hr>');
        index++;
        continue;
      }

      var heading = headingMatch(line);
      if (heading) {
        var level = heading[1].length;
        var parts = headingParts(heading[2]);
        var meta = metas.length ? metas.shift() : null;
        var idAttribute = meta ? ' id="' + esc(meta.id) + '"' : '';
        var aliases = meta ? meta.aliases.map(function (alias) {
          return '<span class="heading-anchor-alias" id="' + esc(alias) + '" aria-hidden="true"></span>';
        }).join('') : '';
        output.push('<h' + level + idAttribute + '>' + aliases + inline(parts.text) + '</h' + level + '>');
        index++;
        continue;
      }

      if (/^\s*<table\b/i.test(line)) {
        var rawTable = readRawTable(lines, index);
        output.push(rawTable.html);
        index = rawTable.index;
        continue;
      }

      if (tableStart(line, next)) {
        var heads = cells(line);
        var delimiters = cells(next);
        var rows = [];
        index += 2;
        while (index < lines.length && lines[index].trim() && hasTablePipe(lines[index])) {
          rows.push(cells(lines[index]));
          index++;
        }

        var alignments = delimiters.map(function (delimiter) {
          var trimmed = delimiter.trim();
          if (/^:-+:$/.test(trimmed)) return 'center';
          if (/-+:$/.test(trimmed)) return 'right';
          if (/^:-+/.test(trimmed)) return 'left';
          return '';
        });
        var table = '<div class="table-wrap" tabindex="0"><table><thead><tr>' +
          heads.map(function (item, cellIndex) {
            var className = alignments[cellIndex] ? ' class="align-' + alignments[cellIndex] + '"' : '';
            return '<th' + className + '>' + inline(item) + '</th>';
          }).join('') + '</tr></thead><tbody>';
        rows.forEach(function (row) {
          table += '<tr>' + heads.map(function (_, cellIndex) {
            var className = alignments[cellIndex] ? ' class="align-' + alignments[cellIndex] + '"' : '';
            return '<td' + className + '>' + inline(row[cellIndex] || '') + '</td>';
          }).join('') + '</tr>';
        });
        output.push(table + '</tbody></table></div>');
        continue;
      }

      var item = listItem(line);
      if (item) {
        var list = renderList(lines, index, item.indent);
        output.push(list.html);
        index = list.index;
        continue;
      }

      var image = markdownImage(line);
      if (image) {
        output.push(renderFigure(image.src, image.alt, image.title, ''));
        index++;
        continue;
      }

      if (/^\s*<img\b/i.test(line)) {
        var imageHtml = [line];
        while (index + 1 < lines.length && !/>\s*$/.test(imageHtml[imageHtml.length - 1])) {
          index++;
          imageHtml.push(lines[index]);
        }
        var renderedImages = renderHtmlImages(imageHtml.join('\n'));
        if (renderedImages) output.push(renderedImages);
        index++;
        continue;
      }

      if (/^\s*<\/?(?:center|p)\b[^>]*>\s*$/i.test(line)) {
        index++;
        continue;
      }

      var paragraph = [];
      while (index < lines.length && lines[index].trim() && !blockStart(lines[index], lines[index + 1] || '')) {
        paragraph.push(lines[index].replace(/^\s+/, ''));
        index++;
      }
      if (paragraph.length) output.push('<p>' + inline(paragraph.join('\n')) + '</p>');
      else index++;
    }

    return output.join('');
  }

  function preparePages(markdown) {
    var lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n').map(function (line) {
      return line.replace(/^[\u200b\ufeff]+/, '');
    });
    var headingByLine = {};
    var usedAnchors = Object.create(null);
    var headingNumber = 0;
    var titleLine = -1;
    var activeFence = '';

    function uniqueAnchor(base) {
      var clean = String(base || '').replace(/^#/, '') || 'section';
      if (!usedAnchors[clean]) {
        usedAnchors[clean] = 1;
        return clean;
      }
      usedAnchors[clean]++;
      return clean + '-' + usedAnchors[clean];
    }

    lines.forEach(function (line, lineIndex) {
      var fence = fenceStart(line);
      if (fence) {
        if (!activeFence) activeFence = fence.marker;
        else if (fenceClose(line, activeFence)) activeFence = '';
        return;
      }
      if (activeFence) return;

      var heading = headingMatch(line);
      if (!heading) return;

      headingNumber++;
      var parts = headingParts(heading[2]);
      var sectionId = uniqueAnchor('section-' + headingNumber);
      var requestedAlias = parts.explicitId || slugBase(parts.text);
      var aliases = [];
      if (requestedAlias && requestedAlias !== sectionId) aliases.push(uniqueAnchor(requestedAlias));

      headingByLine[lineIndex] = {
        level: heading[1].length,
        text: parts.text,
        id: sectionId,
        aliases: aliases
      };
      if (heading[1].length === 1 && titleLine < 0) {
        titleLine = lineIndex;
        siteTitle = plainText(parts.text);
      }
    });

    pages = [];
    var introLines = [];
    var introMetas = [];
    var current = null;

    lines.forEach(function (line, lineIndex) {
      var meta = headingByLine[lineIndex] || null;
      if (meta && meta.level === 2) {
        if (current) pages.push(current);
        current = {
          title: meta.text,
          anchorId: meta.id,
          aliases: meta.aliases.slice(),
          lines: [],
          headingMetas: [],
          allIds: [meta.id].concat(meta.aliases)
        };
        return;
      }

      if (!current) {
        if (lineIndex !== titleLine) {
          introLines.push(line);
          if (meta) introMetas.push(meta);
        }
        return;
      }

      current.lines.push(line);
      if (meta) {
        current.headingMetas.push(meta);
        current.allIds.push(meta.id);
        current.allIds = current.allIds.concat(meta.aliases);
      }
    });

    if (current) pages.push(current);

    if (!pages.length) {
      var titleMeta = titleLine >= 0 ? headingByLine[titleLine] : null;
      var fallbackId = titleMeta ? titleMeta.id : uniqueAnchor('section-1');
      pages.push({
        title: siteTitle,
        anchorId: fallbackId,
        aliases: titleMeta ? titleMeta.aliases.slice() : [],
        lines: lines.filter(function (_, lineIndex) { return lineIndex !== titleLine; }),
        headingMetas: Object.keys(headingByLine).map(function (lineIndex) {
          return headingByLine[lineIndex];
        }).filter(function (meta) {
          return meta !== titleMeta;
        }),
        allIds: [fallbackId].concat(titleMeta ? titleMeta.aliases : [])
      });
      pages[0].headingMetas.forEach(function (meta) {
        pages[0].allIds.push(meta.id);
        pages[0].allIds = pages[0].allIds.concat(meta.aliases);
      });
    } else if (introLines.some(function (line) { return line.trim(); })) {
      pages[0].lines = introLines.concat(pages[0].lines);
      pages[0].headingMetas = introMetas.concat(pages[0].headingMetas);
      introMetas.forEach(function (meta) {
        pages[0].allIds.push(meta.id);
        pages[0].allIds = pages[0].allIds.concat(meta.aliases);
      });
    }

    pages.forEach(function (page, pageIndex) {
      page.index = pageIndex;
      page.route = 'page-' + (pageIndex + 1);
      page.plainTitle = plainText(page.title);
    });

    if (docsTitle) docsTitle.textContent = siteTitle;
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
      try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
      document.body.removeChild(textarea);
      if (copied) resolve();
      else reject(new Error('copy failed'));
    });
  }

  function copyCode(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return fallbackCopy(text); });
    }
    return fallbackCopy(text);
  }

  function addSyntaxHighlighting() {
    if (!window.hljs || typeof window.hljs.highlightElement !== 'function') return;
    Array.prototype.forEach.call(content.querySelectorAll('.code-block pre code'), function (code) {
      if (code.classList.contains('hljs')) return;
      try { window.hljs.highlightElement(code); }
      catch (error) { code.classList.add('nohighlight'); }
    });
  }

  function addCopyButtons() {
    Array.prototype.forEach.call(content.querySelectorAll('.code-block'), function (block) {
      if (block.querySelector('.copy-code-button')) return;
      var languageBar = block.querySelector('.code-language');
      var code = block.querySelector('pre code');
      if (!languageBar || !code) return;

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-code-button';
      button.setAttribute('aria-label', '复制代码');
      button.title = '复制代码';
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="2"></rect><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"></path></svg>';
      button.addEventListener('click', function () {
        button.disabled = true;
        copyCode(code.textContent).then(function () {
          button.classList.add('is-copied');
          button.setAttribute('aria-label', '代码已复制');
          button.title = '已复制';
          window.setTimeout(function () {
            button.classList.remove('is-copied');
            button.setAttribute('aria-label', '复制代码');
            button.title = '复制代码';
            button.disabled = false;
          }, 1400);
        }, function () {
          button.classList.add('is-copy-failed');
          button.setAttribute('aria-label', '复制失败');
          button.title = '复制失败，请手动复制';
          window.setTimeout(function () {
            button.classList.remove('is-copy-failed');
            button.setAttribute('aria-label', '复制代码');
            button.title = '复制代码';
            button.disabled = false;
          }, 1800);
        });
      });
      languageBar.appendChild(button);
    });
  }

  function buildPageNavigation() {
    pageNav.innerHTML = pages.map(function (page, pageIndex) {
      var active = pageIndex === currentPageIndex ? ' is-active' : '';
      var current = pageIndex === currentPageIndex ? ' aria-current="page"' : '';
      return '<a class="page-nav-link' + active + '" href="#' + page.route + '"' + current + '><span>' +
        esc(page.plainTitle) + '</span></a>';
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

    var headings = Array.prototype.slice.call(content.querySelectorAll('.doc-page-body h2, .doc-page-body h3, .doc-page-body h4')).filter(function (heading) {
      return Boolean(heading.id);
    });
    if (!headings.length) {
      outlineLinks.innerHTML = '<p class="outline-empty">本页暂无子标题</p>';
      return;
    }

    outlineLinks.innerHTML = headings.map(function (heading) {
      var level = heading.tagName.toLowerCase().replace('h', '');
      return '<a class="outline-link outline-level-' + level + '" href="#' + esc(heading.id) + '">' +
        esc(heading.textContent) + '</a>';
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
      ? '<a class="previous" href="#' + previous.route + '"><span class="pagination-label">← 上一章</span><span class="pagination-title">' + esc(previous.plainTitle) + '</span></a>'
      : '<span class="pagination-spacer" aria-hidden="true"></span>';
    var nextHtml = next
      ? '<a class="next" href="#' + next.route + '"><span class="pagination-label">下一章 →</span><span class="pagination-title">' + esc(next.plainTitle) + '</span></a>'
      : '<span class="pagination-spacer" aria-hidden="true"></span>';
    pagination.innerHTML = previousHtml + nextHtml;
  }

  function isMobileNavigation() {
    return window.matchMedia
      ? window.matchMedia('(max-width: 900px)').matches
      : window.innerWidth <= 900;
  }

  function syncSidebarAvailability() {
    if (!docsSidebar) return;
    var mobile = isMobileNavigation();
    var open = mobile && document.body.classList.contains('nav-open');

    if (!mobile) {
      document.body.classList.remove('nav-open');
      docsSidebar.removeAttribute('aria-hidden');
      docsSidebar.removeAttribute('inert');
      if ('inert' in docsSidebar) docsSidebar.inert = false;
      if (mobileNavToggle) mobileNavToggle.setAttribute('aria-expanded', 'false');
      return;
    }

    docsSidebar.setAttribute('aria-hidden', String(!open));
    if ('inert' in docsSidebar) docsSidebar.inert = !open;
    if (open) docsSidebar.removeAttribute('inert');
    else docsSidebar.setAttribute('inert', '');
  }

  function openMobileNavigation() {
    if (!isMobileNavigation()) return;
    document.body.classList.add('nav-open');
    if (mobileNavToggle) mobileNavToggle.setAttribute('aria-expanded', 'true');
    syncSidebarAvailability();
    window.requestAnimationFrame(function () {
      var activeLink = pageNav.querySelector('a.is-active') || pageNav.querySelector('a');
      if (activeLink) activeLink.focus();
    });
  }

  function closeMobileNavigation(returnFocus) {
    document.body.classList.remove('nav-open');
    if (mobileNavToggle) mobileNavToggle.setAttribute('aria-expanded', 'false');
    syncSidebarAvailability();
    if (returnFocus && isMobileNavigation() && mobileNavToggle) mobileNavToggle.focus();
  }

  function applyNaturalImageScale(image) {
    var scale = Number(image.getAttribute('data-natural-scale') || 0);
    if (!Number.isFinite(scale) || scale <= 0 || !image.naturalWidth) return;
    image.style.width = (Math.round(image.naturalWidth * scale * 100) / 100) + 'px';
    image.style.maxWidth = '100%';
  }

  function syncContentImages() {
    Array.prototype.forEach.call(content.querySelectorAll('img'), function (image) {
      var syncImage = function () {
        applyNaturalImageScale(image);
        updateReadingProgress();
      };
      if (image.complete && image.naturalWidth) syncImage();
      else image.addEventListener('load', syncImage, { once: true });
    });
  }

  function syncComments(page) {
    if (!commentsThread || !page) return;
    var issueTerm = 'FreeRTOS 学习笔记评论：' + page.plainTitle;
    if (issueTerm === currentIssueTerm && commentsThread.querySelector('.utterances')) return;
    currentIssueTerm = issueTerm;
    commentsThread.innerHTML = '';

    var script = document.createElement('script');
    script.src = 'https://utteranc.es/client.js';
    script.setAttribute('repo', 'Kyle0401/Kyle0401.github.io');
    script.setAttribute('issue-term', issueTerm);
    script.setAttribute('theme', 'github-light');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;
    commentsThread.appendChild(script);
  }

  function headerAliases(page) {
    return page.aliases.map(function (alias) {
      return '<span class="heading-anchor-alias" id="' + esc(alias) + '" aria-hidden="true"></span>';
    }).join('');
  }

  function renderPage(pageIndex, targetId) {
    if (!pages.length) return;
    currentPageIndex = Math.max(0, Math.min(pageIndex, pages.length - 1));
    var page = pages[currentPageIndex];
    var bodyHtml = parse(page.lines.slice(), page.headingMetas.slice());

    content.innerHTML = '<header class="doc-page-header"><p class="doc-page-kicker">FreeRTOS 学习 · 第 ' +
      (currentPageIndex + 1) + ' / ' + pages.length + ' 章</p><h1 id="' + esc(page.anchorId) + '">' +
      headerAliases(page) + inline(page.title) + '</h1><p class="doc-page-summary">按章节分页阅读，右侧目录仅展示当前页内容。</p></header>' +
      '<div class="doc-page-body">' + bodyHtml + '</div>';

    document.title = page.plainTitle + ' · FreeRTOS 学习 · Kyle';
    addSyntaxHighlighting();
    addCopyButtons();
    buildPageNavigation();
    buildOutline();
    buildPagination();
    syncComments(page);
    closeMobileNavigation();
    syncContentImages();

    window.requestAnimationFrame(function () {
      var target = targetId ? document.getElementById(targetId) : null;
      if (target) target.scrollIntoView({ block: 'start' });
      else window.scrollTo({ top: 0, left: 0 });
      updateReadingProgress();
    });
  }

  function findPageByAnchor(anchorId) {
    for (var pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      if (pages[pageIndex].allIds.indexOf(anchorId) !== -1) return pageIndex;
    }
    return -1;
  }

  function routeFromHash() {
    var rawHash = window.location.hash.replace(/^#/, '');
    var hash = rawHash;
    try { hash = decodeURIComponent(rawHash); } catch (error) { hash = rawHash; }
    var pageMatch = hash.match(/^page-(\d+)$/);

    if (pageMatch) {
      renderPage(Number(pageMatch[1]) - 1, null);
      return;
    }

    if (hash) {
      var anchorPage = findPageByAnchor(hash);
      if (anchorPage >= 0) {
        renderPage(anchorPage, hash);
        return;
      }
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

  if (mobileNavToggle) {
    mobileNavToggle.addEventListener('click', function () {
      if (document.body.classList.contains('nav-open')) closeMobileNavigation(false);
      else openMobileNavigation();
    });
  }
  pageNav.addEventListener('click', function (event) {
    var link = event.target.closest ? event.target.closest('a') : null;
    if (link && pageNav.contains(link)) closeMobileNavigation(true);
  });
  if (docsOverlay) docsOverlay.addEventListener('click', function () { closeMobileNavigation(true); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && document.body.classList.contains('nav-open')) closeMobileNavigation(true);
  });

  if (progressButton) {
    progressButton.addEventListener('click', function () {
      var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }

  window.addEventListener('scroll', updateReadingProgress, { passive: true });
  window.addEventListener('resize', function () {
    syncSidebarAvailability();
    updateReadingProgress();
  });
  window.addEventListener('load', addSyntaxHighlighting);
  window.addEventListener('hashchange', routeFromHash);
  syncSidebarAvailability();

  fetch('./FreeRTOS学习.md?v=20260721a')
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
      content.innerHTML = '<header class="doc-page-header"><p class="doc-page-kicker">FreeRTOS 学习</p><h1>FreeRTOS 学习记录</h1></header><p>笔记文件暂时无法读取，请确认通过本地静态服务器或 GitHub Pages 访问。</p>';
      if (commentsThread) commentsThread.innerHTML = '<p class="nav-loading">笔记加载后显示评论区。</p>';
      updateReadingProgress();
    });
})();
