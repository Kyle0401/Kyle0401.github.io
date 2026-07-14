'use strict';

var assert = require('assert');
var docs = require('../cuda-docs.js');

var pages = [];
for (var top = 1; top <= 6; top++) {
  var pageCount = top <= 4 ? 8 : 7;
  for (var pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    var chapter = top + '.' + pageNumber;
    pages.push({
      chapter: chapter,
      titleZh: '压力测试页 ' + chapter,
      titleEn: 'Stress fixture ' + chapter,
      route: docs.chapterToRoute(chapter),
      titleAnchor: docs.sectionToId(chapter),
      topLevelChapter: String(top)
    });
  }
}
assert.strictEqual(pages.length, 46);

var figures = [];
var imageReferences = [];
for (var imageIndex = 1; imageIndex <= 67; imageIndex++) {
  var assetIndex = imageIndex === 67 ? 1 : imageIndex;
  var file = assetIndex <= 57
    ? 'assets/figures/figure-' + String(assetIndex).padStart(3, '0') + '.png'
    : 'assets/figures/unnumbered-' + String(assetIndex - 57).padStart(3, '0') + '.png';
  figures.push({ file: file, captionZh: '压力测试图片 ' + imageIndex, altZh: '压力测试图片 ' + imageIndex });
  imageReferences.push('![压力测试图片 ' + imageIndex + '](./' + file + ')');
}
assert.strictEqual(new Set(figures.map(function (figure) { return figure.file; })).size, 66);

var paragraph = 'CUDA stress fixture paragraph preserves __global__, cudaMemcpyAsync, blockIdx.x, and technical punctuation.\n\n';
var pageBody = paragraph.repeat(650);
var markdownParts = ['# Synthetic CUDA guide stress fixture'];
pages.forEach(function (page, index) {
  markdownParts.push('## ' + page.chapter + ' ' + page.titleEn);
  markdownParts.push('### ' + page.chapter + '.1 Numeric section anchor');
  if (index === 0) markdownParts.push(imageReferences.join('\n\n'));
  markdownParts.push(pageBody);
});
var markdown = markdownParts.join('\n\n');
var byteLength = Buffer.byteLength(markdown, 'utf8');
assert.ok(byteLength >= 2 * 1024 * 1024, 'stress fixture should be at least 2 MiB');
assert.ok(byteLength <= 4 * 1024 * 1024, 'stress fixture should stay within 4 MiB');

var splitStart = Date.now();
var splitPages = docs.splitMarkdown(markdown, pages);
var splitMilliseconds = Date.now() - splitStart;
assert.strictEqual(splitPages.length, 46);
assert.ok(splitPages.every(function (page) { return !page.missing && page.body.length > 0; }));
assert.ok(splitPages[45].sections.indexOf('section-6-7-1') !== -1);

var runtime = {
  markdownit: require('../vendor/markdown-it/markdown-it.min.js'),
  markdownitFootnote: require('../vendor/markdown-it-footnote/markdown-it-footnote.min.js'),
  katex: require('../vendor/katex/katex.min.js'),
  hljs: require('../vendor/highlight.js/highlight.min.js')
};
var renderer = docs.createMarkdownRenderer(runtime);
var renderStart = Date.now();
var representativeHtml = renderer.render(splitPages[0].body, {
  page: splitPages[0],
  manifest: { figures: figures }
});
var renderMilliseconds = Date.now() - renderStart;
var renderedFigures = representativeHtml.match(/<figure class="figure/g) || [];
assert.strictEqual(renderedFigures.length, 67);
assert.ok(representativeHtml.indexOf('loading="lazy"') !== -1);

console.log('cuda-docs-stress.test.js: ' + byteLength + ' bytes, 46 pages, 67 refs/66 assets, split=' + splitMilliseconds + 'ms, representative-render=' + renderMilliseconds + 'ms');
