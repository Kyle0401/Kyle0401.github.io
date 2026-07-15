'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var docs = require('../cuda-docs.js');

var root = path.resolve(__dirname, '..');
var manifest = JSON.parse(fs.readFileSync(path.join(root, 'content-manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
var markdown = fs.readFileSync(path.join(root, manifest.sourceMarkdown), 'utf8');

assert.strictEqual(docs.chapterToRoute('4.20'), '#page-4-20');
assert.strictEqual(docs.sectionToId('4.1.4.2'), '#section-4-1-4-2');
assert.strictEqual(docs.routeToChapter('#page-6-3'), '6.3');
assert.strictEqual(docs.idToSection('#section-4-1-4-2'), '4.1.4.2');
assert.deepStrictEqual(docs.parseHash('#page-4-20'), { kind: 'page', chapter: '4.20', id: 'page-4-20' });
assert.deepStrictEqual(docs.parseHash('#section-4-20-1'), { kind: 'section', section: '4.20.1', id: 'section-4-20-1' });
assert.strictEqual(docs.parseHash('#not-a-route').kind, 'default');

assert.deepStrictEqual(docs.getExerciseCta('1.1'), {
  id: 'quiz-1-1',
  chapter: '1.1',
  questionCount: 6,
  typeSummary: '4 道单选 · 1 道多选 · 1 道填空',
  href: './exercises/#quiz-1-1'
});
assert.strictEqual(docs.getExerciseCta('1.2').questionCount, 10);
assert.strictEqual(docs.getExerciseCta('1.3').questionCount, 8);
assert.strictEqual(docs.getExerciseCta('2.1'), null);
assert.ok(docs.renderExerciseCta('1.1').indexOf('href="./exercises/#quiz-1-1"') !== -1);
assert.ok(docs.renderExerciseCta('1.1').indexOf('刷新即清空') !== -1);
assert.strictEqual(docs.renderExerciseCta('4.20'), '');

assert.deepStrictEqual(docs.extractHeadingNumber('### 4.1.4.2 Device scope'), {
  level: 3,
  number: '4.1.4.2',
  title: 'Device scope'
});
assert.strictEqual(docs.extractHeadingNumber('### Unnumbered heading'), null);

var errors = docs.validateManifest(manifest);
assert.deepStrictEqual(errors, []);

var pages = docs.splitMarkdown(markdown, manifest.pages);
assert.strictEqual(pages.length, manifest.pages.length);
assert.strictEqual(pages[0].route, '#page-1-1');
assert.ok(pages.every(function (page) { return !page.missing && page.body.length > 0; }));
assert.strictEqual(pages.find(function (page) { return page.chapter === '4.20'; }).route, '#page-4-20');
assert.strictEqual(pages.find(function (page) { return page.chapter === '6.3'; }).route, '#page-6-3');
assert.ok(pages.every(function (page) {
  return page.sections.every(function (section) { return /^section-\d+(?:-\d+)+$/.test(section); });
}));
assert.strictEqual(pages[0].body.indexOf('英文原题：'), -1);
if (manifest.fixture) {
  assert.strictEqual(pages[0].body.indexOf('官方原文：'), -1);
} else {
  assert.ok(pages[0].body.indexOf('非官方中文翻译') !== -1);
  assert.ok(pages[0].body.indexOf('官方原文：') !== -1);
}
assert.strictEqual(docs.findPageByChapter(pages, '6.3').route, '#page-6-3');
assert.strictEqual(docs.findPageBySection(pages, '4.20.1').route, '#page-4-20');
assert.strictEqual(docs.findPageBySection(pages, '6.3').route, '#page-6-3');
assert.strictEqual(docs.findPageBySection(pages, '9.9.9'), null);

assert.strictEqual(docs.isSafeRelativeImage('./assets/figures/figure-001.png'), true);
assert.strictEqual(docs.isSafeRelativeImage('assets/figures/unnumbered-001.png'), true);
assert.strictEqual(docs.isSafeRelativeImage('./assets/notes/example.png'), true);
assert.strictEqual(docs.isSafeRelativeImage('https://example.com/hotlink.png'), false);
assert.strictEqual(docs.isSafeRelativeImage('../private.png'), false);
assert.strictEqual(docs.isSafeRelativeImage('C:\\private.png'), false);
assert.strictEqual(docs.isSafeRelativeImage('data:image/png;base64,unsafe'), false);
assert.strictEqual(docs.isSafeMarkdownSource('./cuda-programming-guide-zh.md'), true);
assert.strictEqual(docs.isSafeMarkdownSource('https://example.com/content.md'), false);
assert.strictEqual(docs.isSafeMarkdownSource('../private.md'), false);
assert.strictEqual(docs.isSafeOfficialUrl('https://docs.nvidia.com/cuda/cuda-programming-guide/index.html'), true);
assert.strictEqual(docs.isSafeOfficialUrl('javascript:alert(1)'), false);

var unsafeManifest = JSON.parse(JSON.stringify(manifest));
unsafeManifest.sourceMarkdown = 'https://example.com/remote.md';
unsafeManifest.pages[0].officialSourceUrl = 'javascript:alert(1)';
assert.ok(docs.validateManifest(unsafeManifest).length >= 2);

var runtime = {
  markdownit: require('../vendor/markdown-it/markdown-it.min.js'),
  markdownitFootnote: require('../vendor/markdown-it-footnote/markdown-it-footnote.min.js'),
  katex: require('../vendor/katex/katex.min.js'),
  hljs: require('../vendor/highlight.js/highlight.min.js')
};
var renderer = docs.createMarkdownRenderer(runtime);
var codeHtml = renderer.render(
  '```cuda\n__global__ void kernel() {}\n```',
  { page: pages[0], manifest: manifest }
);
var tableHtml = renderer.render(
  '| 层级 | CUDA 标识符 |\n| --- | --- |\n| 线程 | `threadIdx` |',
  { page: pages[0], manifest: manifest }
);
var featureHtml = renderer.render(
  '> [!NOTE]\n> 告警渲染夹具。\n\n行内公式 $x + y$。\n\n$$\nx + y\n$$\n\n脚注[^contract]。\n\n[^contract]: 契约测试脚注。',
  { page: pages[0], manifest: manifest }
);
var imageHtml = renderer.render(
  '![图片加载属性测试](assets/figures/figure-001.png)',
  { page: pages[0], manifest: manifest }
);
var escapedHtml = renderer.render('<script>alert("unsafe")</script>', { page: pages[0], manifest: manifest });
var unsafeLinkHtml = renderer.render('[不安全链接](javascript:alert(1))', { page: pages[0], manifest: manifest });
var figureCaptionHtml = renderer.render(
  '![中文无障碍说明](assets/figures/figure-001.png)\n\n*图 1 重复的 Markdown 图题*',
  {
    page: pages[0],
    manifest: {
      figures: [{
        file: 'assets/figures/figure-001.png',
        altZh: '清单中的中文无障碍说明',
        captionZh: '清单中的中文可见图题'
      }]
    }
  }
);
var unnumberedCaptionHtml = renderer.render(
  '![无编号正文插图说明](assets/figures/unnumbered-001.png)\n\n*无编号正文插图说明*',
  { page: pages[0], manifest: { figures: [] } }
);
var reusedAssetHtml = renderer.render(
  '![图 11 线程块网格](assets/figures/figure-003.png)\n\n*图 11 线程块网格*',
  {
    page: { chapter: '2.3' },
    manifest: {
      figures: [
        { file: 'assets/figures/figure-003.png', sourcePage: '1.2', altZh: '图 3 说明', captionZh: '图 3 线程块网格' },
        { file: 'assets/figures/figure-003.png', sourcePage: '2.3', altZh: '图 11 说明', captionZh: '图 11 线程块网格' }
      ]
    }
  }
);

assert.ok(codeHtml.indexOf('class="code-block"') !== -1);
assert.ok(imageHtml.indexOf('loading="lazy"') !== -1);
assert.ok(imageHtml.indexOf('decoding="async"') !== -1);
assert.ok(tableHtml.indexOf('class="table-wrap"') !== -1);
assert.ok(featureHtml.indexOf('markdown-alert-note') !== -1);
assert.ok(featureHtml.indexOf('class="katex"') !== -1);
assert.ok(featureHtml.indexOf('class="footnotes"') !== -1);
assert.ok(figureCaptionHtml.indexOf('alt="清单中的中文无障碍说明"') !== -1);
assert.ok(figureCaptionHtml.indexOf('<figcaption>清单中的中文可见图题</figcaption>') !== -1);
assert.strictEqual(figureCaptionHtml.indexOf('重复的 Markdown 图题'), -1);
assert.strictEqual((unnumberedCaptionHtml.match(/无编号正文插图说明/g) || []).length, 3);
assert.strictEqual(unnumberedCaptionHtml.indexOf('<em>无编号正文插图说明</em>'), -1);
assert.ok(reusedAssetHtml.indexOf('alt="图 11 说明"') !== -1);
assert.ok(reusedAssetHtml.indexOf('<figcaption>图 11 线程块网格</figcaption>') !== -1);
assert.strictEqual(reusedAssetHtml.indexOf('图 3 线程块网格'), -1);
assert.ok(escapedHtml.indexOf('<script>') === -1);
assert.ok(escapedHtml.indexOf('&lt;script&gt;') !== -1);
assert.strictEqual(unsafeLinkHtml.indexOf('href="javascript:'), -1);

var deferredManifestPages = manifest.pages.slice(0, 2);
var deferredImageMarkdown = [
  '## ' + deferredManifestPages[0].chapter + '. 当前页',
  '',
  '当前页正文。',
  '',
  '## ' + deferredManifestPages[1].chapter + '. 非当前页',
  '',
  '![非当前页图片](assets/figures/figure-001.png)'
].join('\n');
var deferredPages = docs.splitMarkdown(deferredImageMarkdown, deferredManifestPages);
var currentOnlyHtml = renderer.render(deferredPages[0].body, { page: deferredPages[0], manifest: manifest });
var deferredHtml = renderer.render(deferredPages[1].body, { page: deferredPages[1], manifest: manifest });
assert.strictEqual(currentOnlyHtml.indexOf('<img '), -1);
assert.ok(deferredHtml.indexOf('loading="lazy"') !== -1);

if (!manifest.fixture) {
  var completeHtml = pages.map(function (page) {
    return renderer.render(page.body, { page: page, manifest: manifest });
  }).join('\n');
  assert.strictEqual((completeHtml.match(/<figure class="figure/g) || []).length, manifest.expectedCounts.totalFigures);
  assert.strictEqual((completeHtml.match(/<div class="table-wrap"/g) || []).length, manifest.expectedCounts.totalTables);
  assert.strictEqual(completeHtml.indexOf('class="image-error"'), -1);
  assert.strictEqual(completeHtml.indexOf('{{B'), -1);
  assert.strictEqual(new Set(manifest.figures.map(function (figure) { return figure.file; })).size, manifest.expectedCounts.uniqueFigureAssets);
}

console.log('cuda-docs.test.js: all renderer contract tests passed');
