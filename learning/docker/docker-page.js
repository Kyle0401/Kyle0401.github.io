(function () {
  var content = document.getElementById('article-content');
  var toc = document.getElementById('toc');
  var layout = document.getElementById('note-layout');
  var tocLinks = document.getElementById('toc-links');
  var tocToggle = document.getElementById('toc-toggle');
  var bulkToggle = document.getElementById('toc-bulk-toggle');

  var safeFigures = {
    '通过 CNB 端口访问 code-server 的浏览器界面': ['code-server', '通过 PORTS 地址访问浏览器中的 code-server', ['工作区编辑器', '终端与文件树', '端口 8000 服务']],
    '在代码仓库中创建 Dockerfile': ['dockerfile', '在工作区中创建镜像构建文件', ['Dockerfile 文件', '构建指令', '版本控制']],
    '在 VS Code 扩展详情中查看 Go 扩展 Identifier': ['extension', '从扩展详情获取安装标识', ['Go 扩展', 'Identifier', 'golang.go']],
    'CNB 制品页面中的 Docker 镜像制品': ['registry', '在 CNB 制品页查看 Docker 镜像', ['Docker 镜像制品', '标签与版本', '使用 Docker 制品']],
    'CNB Docker 制品的使用方式选择界面': ['use', '选择 Docker 制品的使用方式', ['本地命令行推送', '流水线中使用', '拉取并运行']],
    'CNB Docker 制品的本地命令行推送指引': ['guide', '本地命令行推送使用指引', ['docker login', 'docker tag', 'docker push']],
    'CNB 个人设置中的访问令牌创建界面': ['credential', '个人设置中的访问令牌入口', ['访问令牌', '创建新令牌', '权限与有效期']],
    'CNB 访问令牌创建成功页面': ['credential', '访问令牌创建成功页面', ['令牌名称', 'Git Username', 'Token']],
    'CNB 制品列表中的 docker-learning 镜像': ['list', '制品列表中的 docker-learning 镜像', ['docker-learning', 'latest', '镜像摘要与大小']],
    'CNB docker-learning 镜像详情页': ['detail', 'docker-learning 镜像详情', ['标签与摘要', '镜像层', '拉取使用指引']]
  };

  function esc(v) { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function inline(v) {
    var parts = [];
    var s = esc(v);
    s = s.replace(/`([^`]+)`/g, function (_, code) { var key = '@@C' + parts.length + '@@'; parts.push('<code>' + code + '</code>'); return key; });
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
    parts.forEach(function (part, i) { s = s.replace('@@C' + i + '@@', part); });
    return s;
  }
  function cells(line) { return line.trim().replace(/^\||\|$/g, '').split('|').map(function (x) { return x.trim(); }); }
  function blockStart(line, next) { return /^#{1,6}\s+/.test(line) || /^```/.test(line) || /^-{3,}\s*$/.test(line) || /^>\s*\[!NOTE\]/.test(line) || /^[-*]\s+/.test(line) || (/^\|/.test(line) && /^\|?\s*:?-{3,}/.test(next || '')) || /^!\[.*?\]\(.+?\)$/.test(line); }

  function schematic(caption, spec) {
    var rows = spec[2].map(function (row, index) {
      return '<div class="figure-ui-row"><span class="figure-ui-icon"></span><span>' + esc(row) + '</span><span class="figure-ui-badge">' + (index === 1 ? 'latest' : 'Docker') + '</span></div>';
    }).join('');
    return '<figure class="figure"><div class="figure-ui" role="img" aria-label="' + esc(caption) + '"><div class="figure-ui-top"><span>CNB · Docker Registry</span><span>界面图</span></div><div class="figure-ui-body"><div><div class="figure-ui-title">' + esc(spec[0] === 'code-server' ? 'code-server · Browser IDE' : 'CNB Docker 制品') + '</div><div class="figure-ui-sub">' + esc(spec[1]) + '</div></div>' + rows + '<div class="figure-ui-actions"><span class="figure-ui-button">查看使用指引</span><span class="figure-ui-button ghost">更多操作</span></div></div></div><figcaption>' + inline(caption) + '</figcaption></figure>';
  }
  function figure(caption) {
    if (safeFigures[caption]) return schematic(caption, safeFigures[caption]);
    return '<div class="figure-token-note"><span>🔒</span><span><strong>凭据创建成功页未展示。</strong>公开学习记录不保留可识别的访问凭据。</span></div>';
  }

  function parse(lines) {
    var out = [], i = 0;
    while (i < lines.length) {
      var line = lines[i], next = lines[i + 1] || '';
      if (!line.trim()) { i++; continue; }
      if (/^```/.test(line)) {
        var lang = line.slice(3).trim() || 'text', code = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
        if (i < lines.length) i++;
        out.push('<div class="code-block"><div class="code-language"><span class="code-language-text">' + esc(lang) + '</span></div><pre><code>' + esc(code.join('\n')) + '</code></pre></div>');
        continue;
      }
      if (/^>\s*\[!NOTE\]/.test(line)) {
        var note = []; i++;
        while (i < lines.length && (lines[i].startsWith('>') || !lines[i].trim())) { note.push(lines[i].startsWith('>') ? lines[i].replace(/^>\s?/, '') : ''); i++; }
        out.push('<div class="callout"><div>' + parse(note) + '</div></div>');
        continue;
      }
      if (/^-{3,}\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
      var heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) { out.push('<h' + heading[1].length + '>' + inline(heading[2]) + '</h' + heading[1].length + '>'); i++; continue; }
      if (/^\|/.test(line) && /^\|?\s*:?-{3,}/.test(next)) {
        var heads = cells(line), rows = []; i += 2;
        while (i < lines.length && /^\|/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
        var table = '<div class="table-wrap"><table><thead><tr>' + heads.map(function (x) { return '<th>' + inline(x) + '</th>'; }).join('') + '</tr></thead><tbody>';
        rows.forEach(function (row) { table += '<tr>' + heads.map(function (_, n) { return '<td>' + inline(row[n] || '') + '</td>'; }).join('') + '</tr>'; });
        out.push(table + '</tbody></table></div>');
        continue;
      }
      if (/^[-*]\s+/.test(line)) {
        var items = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s+/, '')); i++; }
        out.push('<ul>' + items.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ul>');
        continue;
      }
      var image = line.match(/^!\[(.*?)\]\((.+?)\)$/);
      if (image) { out.push(figure(image[1])); i++; continue; }
      var paragraph = [];
      while (i < lines.length && lines[i].trim() && !blockStart(lines[i], lines[i + 1] || '')) { paragraph.push(lines[i].trim()); i++; }
      if (paragraph.length) out.push('<p>' + inline(paragraph.join('<br>')) + '</p>'); else i++;
    }
    return out.join('');
  }

  function setTocClosed(closed) { toc.classList.toggle('is-collapsed', closed); layout.classList.toggle('toc-collapsed', closed); tocToggle.setAttribute('aria-expanded', String(!closed)); tocToggle.setAttribute('aria-label', closed ? '展开文章目录' : '收起文章目录'); }
  function branches() { return Array.prototype.slice.call(tocLinks.querySelectorAll('.toc-item')).filter(function (item) { var child = item.querySelector(':scope > .toc-children'); return child && child.children.length; }); }
  function refreshBulk() { var list = branches(), all = list.length && list.every(function (x) { return x.classList.contains('is-collapsed'); }); bulkToggle.textContent = all ? '全部展开' : '全部折叠'; bulkToggle.disabled = !list.length; }
  function buildToc() {
    var headings = Array.prototype.slice.call(content.querySelectorAll('h1,h2,h3,h4'));
    var root = document.createElement('ul'), stack = [{ level: 0, list: root }];
    tocLinks.innerHTML = '';
    headings.forEach(function (heading, index) {
      var level = Number(heading.tagName.slice(1)), id = 'section-' + (index + 1);
      heading.id = id;
      while (stack.length > 1 && level <= stack[stack.length - 1].level) stack.pop();
      var li = document.createElement('li'), row = document.createElement('div'), btn = document.createElement('button'), link = document.createElement('a'), child = document.createElement('ul');
      li.className = 'toc-item toc-level-' + level; row.className = 'toc-row'; btn.type = 'button'; btn.className = 'toc-item-toggle is-placeholder'; btn.textContent = '⌄'; btn.tabIndex = -1;
      link.className = 'toc-link'; link.href = '#' + id; link.textContent = heading.textContent; child.className = 'toc-children';
      row.appendChild(btn); row.appendChild(link); li.appendChild(row); li.appendChild(child); stack[stack.length - 1].list.appendChild(li); stack.push({ level: level, list: child });
    });
    Array.prototype.forEach.call(root.querySelectorAll('.toc-item'), function (item) {
      var child = item.lastElementChild, btn = item.querySelector(':scope > .toc-row > .toc-item-toggle');
      if (child && child.children.length) { btn.classList.remove('is-placeholder'); btn.tabIndex = 0; btn.setAttribute('aria-expanded', 'true'); btn.addEventListener('click', function () { var closed = item.classList.toggle('is-collapsed'); btn.setAttribute('aria-expanded', String(!closed)); refreshBulk(); }); }
      else if (child) child.remove();
    });
    tocLinks.appendChild(root); refreshBulk();
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
      if (copied) resolve(); else reject(new Error('copy failed'));
    });
  }

  function copyCode(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(function () { return fallbackCopy(text); });
    return fallbackCopy(text);
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

  tocToggle.addEventListener('click', function () { setTocClosed(!toc.classList.contains('is-collapsed')); });
  bulkToggle.addEventListener('click', function () { var list = branches(), close = !list.every(function (x) { return x.classList.contains('is-collapsed'); }); list.forEach(function (item) { item.classList.toggle('is-collapsed', close); var btn = item.querySelector(':scope > .toc-row > .toc-item-toggle'); if (btn) btn.setAttribute('aria-expanded', String(!close)); }); refreshBulk(); });

  fetch('./Docker学习.md?v=20260707c').then(function (response) { if (!response.ok) throw new Error(); return response.text(); }).then(function (md) { content.innerHTML = parse(md.replace(/\r\n/g, '\n').split('\n')); addCopyButtons(); buildToc(); }).catch(function () { content.innerHTML = '<h1>Docker学习</h1><p>笔记文件暂时无法读取。</p>'; });
})();
