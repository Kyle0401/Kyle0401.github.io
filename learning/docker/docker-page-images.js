(function () {
  var positions = {
    '通过 CNB 端口访问 code-server 的浏览器界面': [0, 0],
    'CNB 制品页面中的 Docker 镜像制品': [1, 0],
    'CNB Docker 制品的使用方式选择界面': [0, 1],
    'CNB Docker 制品的本地命令行推送指引': [1, 1],
    'CNB 个人设置中的访问令牌创建界面': [0, 2],
    'CNB 制品列表中的 docker-learning 镜像': [1, 2],
    'CNB docker-learning 镜像详情页': [0, 3]
  };

  function applyRealScreenshots() {
    Array.prototype.forEach.call(document.querySelectorAll('#article-content figure'), function (figure) {
      var caption = figure.querySelector('figcaption');
      var preview = figure.querySelector('.figure-ui');
      if (!caption || !preview) return;
      var pos = positions[caption.textContent.trim()];
      if (!pos) return;

      var crop = document.createElement('div');
      crop.className = 'figure-crop';
      var image = document.createElement('img');
      image.src = './assets/docker-screens.webp?v=20260706f';
      image.alt = caption.textContent.trim();
      image.loading = 'lazy';
      image.style.setProperty('--cell-x', pos[0]);
      image.style.setProperty('--cell-y', pos[1]);
      crop.appendChild(image);
      preview.replaceWith(crop);
    });
  }

  var root = document.getElementById('article-content');
  if (!root) return;
  var observer = new MutationObserver(function () { applyRealScreenshots(); });
  observer.observe(root, { childList: true, subtree: true });
  applyRealScreenshots();
})();