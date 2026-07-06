(function () {
  var screenshots = {
    '通过 CNB 端口访问 code-server 的浏览器界面': 'image-20260703022125604.png',
    'CNB 制品页面中的 Docker 镜像制品': 'image-20260706031930791.png',
    'CNB Docker 制品的使用方式选择界面': 'image-20260706032005537.png',
    'CNB Docker 制品的本地命令行推送指引': 'image-20260706032048008.png',
    'CNB 个人设置中的访问令牌创建界面': 'image-20260706032302171.png',
    'CNB 访问令牌创建成功页面': 'image-20260706032406427-redacted.png',
    'CNB 制品列表中的 docker-learning 镜像': 'image-20260706033226226.png',
    'CNB docker-learning 镜像详情页': 'image-20260706033939536.png'
  };

  function applyRealScreenshots() {
    Array.prototype.forEach.call(document.querySelectorAll('#article-content figure'), function (figure) {
      var caption = figure.querySelector('figcaption');
      var preview = figure.querySelector('.figure-ui');
      if (!caption || !preview) return;
      var filename = screenshots[caption.textContent.trim()];
      if (!filename) return;

      var link = document.createElement('a');
      link.className = 'figure-original';
      link.href = './assets/' + filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = '在新窗口查看原图';

      var image = document.createElement('img');
      image.src = './assets/' + filename + '?v=20260706h';
      image.alt = caption.textContent.trim();
      image.loading = 'lazy';
      image.decoding = 'async';

      link.appendChild(image);
      preview.replaceWith(link);
    });
  }

  var root = document.getElementById('article-content');
  if (!root) return;
  var observer = new MutationObserver(function () { applyRealScreenshots(); });
  observer.observe(root, { childList: true, subtree: true });
  applyRealScreenshots();
})();
