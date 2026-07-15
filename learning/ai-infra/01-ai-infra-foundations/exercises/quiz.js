(function (root, factory) {
  'use strict';
  var api = factory(root || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.CudaQuiz = api;
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', api.boot, { once: true });
    } else {
      api.boot();
    }
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var QUIZ_IDS = ['quiz-1-1', 'quiz-1-2', 'quiz-1-3'];
  var stateBySet = new Map();
  var bank = null;
  var markdown = null;
  var dom = {};

  function parseQuizHash(hash, validIds) {
    var raw = typeof hash === 'string' ? hash.trim() : '';
    var ids = Array.isArray(validIds) && validIds.length ? validIds : QUIZ_IDS;
    if (!raw || raw === '#') return { kind: 'hub', invalidHash: false };
    var match = raw.match(/^#(quiz-\d+-\d+)$/);
    if (match && ids.indexOf(match[1]) !== -1) return { kind: 'quiz', id: match[1] };
    return { kind: 'hub', invalidHash: true, hash: raw };
  }

  function normalizeFillAnswer(value, caseSensitive) {
    var normalized = value === null || value === undefined ? '' : String(value);
    if (typeof normalized.normalize === 'function') normalized = normalized.normalize('NFKC');
    normalized = normalized.trim().replace(/\s+/gu, ' ');
    if (!caseSensitive) {
      normalized = normalized.replace(/[A-Z]/g, function (letter) {
        return String.fromCharCode(letter.charCodeAt(0) + 32);
      });
    }
    return normalized;
  }

  function selectedIds(answer) {
    if (answer instanceof Set) return Array.from(answer);
    if (Array.isArray(answer)) return answer.slice();
    if (answer === null || answer === undefined || answer === '') return [];
    return [String(answer)];
  }

  function isAnswered(question, answer) {
    if (!question) return false;
    if (question.type === 'fill') return normalizeFillAnswer(answer, true) !== '';
    return selectedIds(answer).length > 0;
  }

  function gradeQuestion(question, answer) {
    var answered = isAnswered(question, answer);
    if (!answered) return { answered: false, correct: false };

    if (question.type === 'fill') {
      var caseSensitive = question.caseSensitive === true;
      var candidate = normalizeFillAnswer(answer, caseSensitive);
      var accepted = Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : [];
      var correct = accepted.some(function (item) {
        return candidate === normalizeFillAnswer(item, caseSensitive);
      });
      return { answered: true, correct: correct };
    }

    var expected = Array.isArray(question.correctOptionIds) ? question.correctOptionIds : [];
    var actual = Array.from(new Set(selectedIds(answer).map(String)));
    var expectedSet = new Set(expected.map(String));
    var correctSet = actual.length === expectedSet.size && actual.every(function (id) {
      return expectedSet.has(id);
    });
    return { answered: true, correct: correctSet };
  }

  function answerForQuestion(answers, questionId) {
    if (answers instanceof Map) return answers.get(questionId);
    return answers && Object.prototype.hasOwnProperty.call(answers, questionId) ? answers[questionId] : undefined;
  }

  function gradeQuiz(questionsOrSet, answers) {
    var questions = Array.isArray(questionsOrSet) ? questionsOrSet : ((questionsOrSet && questionsOrSet.questions) || []);
    var results = {};
    var correct = 0;
    var incorrect = 0;
    var unanswered = 0;

    questions.forEach(function (question) {
      var result = gradeQuestion(question, answerForQuestion(answers, question.id));
      var status = !result.answered ? 'unanswered' : (result.correct ? 'correct' : 'incorrect');
      results[question.id] = { answered: result.answered, correct: result.correct, status: status };
      if (!result.answered) unanswered += 1;
      else if (result.correct) correct += 1;
      else incorrect += 1;
    });

    return {
      total: questions.length,
      correct: correct,
      incorrect: incorrect,
      unanswered: unanswered,
      percentage: questions.length ? Math.round((correct / questions.length) * 100) : 0,
      results: results
    };
  }

  function createEmptySetState(set) {
    return {
      setId: set && set.id ? set.id : '',
      answers: {},
      statuses: {},
      errors: {},
      submitted: false,
      needsConfirmation: false,
      summary: null,
      lastAction: null
    };
  }

  function copyObject(value) {
    return Object.assign({}, value || {});
  }

  function setDraftAnswer(state, questionId, answer) {
    var current = state || createEmptySetState(null);
    if (current.submitted || current.statuses[questionId]) return current;
    var next = Object.assign({}, current, {
      answers: copyObject(current.answers),
      errors: copyObject(current.errors),
      needsConfirmation: false,
      lastAction: { type: 'draft', questionId: questionId }
    });
    next.answers[questionId] = answer instanceof Set ? Array.from(answer) : (Array.isArray(answer) ? answer.slice() : answer);
    delete next.errors[questionId];
    return next;
  }

  function checkQuestion(state, set, questionId) {
    var current = state || createEmptySetState(set);
    if (current.submitted || current.statuses[questionId]) return current;
    var question = set && Array.isArray(set.questions) ? set.questions.find(function (item) { return item.id === questionId; }) : null;
    if (!question) return current;
    var result = gradeQuestion(question, current.answers[questionId]);
    var next = Object.assign({}, current, {
      statuses: copyObject(current.statuses),
      errors: copyObject(current.errors),
      needsConfirmation: false
    });
    if (!result.answered) {
      next.errors[questionId] = true;
      next.lastAction = { type: 'empty', questionId: questionId };
      return next;
    }
    delete next.errors[questionId];
    next.statuses[questionId] = {
      answered: true,
      correct: result.correct,
      status: result.correct ? 'correct' : 'incorrect'
    };
    next.lastAction = { type: 'checked', questionId: questionId };
    return next;
  }

  function submitQuiz(state, set, force) {
    var current = state || createEmptySetState(set);
    if (current.submitted) return current;
    var summary = gradeQuiz(set, current.answers);
    if (summary.unanswered > 0 && !force) {
      return Object.assign({}, current, {
        needsConfirmation: true,
        summary: null,
        lastAction: { type: 'confirm-unanswered', unanswered: summary.unanswered }
      });
    }
    return Object.assign({}, current, {
      statuses: summary.results,
      errors: {},
      submitted: true,
      needsConfirmation: false,
      summary: summary,
      lastAction: { type: 'submitted' }
    });
  }

  function resetQuestion(state, questionId) {
    var current = state || createEmptySetState(null);
    if (current.submitted) return current;
    var next = Object.assign({}, current, {
      answers: copyObject(current.answers),
      statuses: copyObject(current.statuses),
      errors: copyObject(current.errors),
      needsConfirmation: false,
      lastAction: { type: 'reset-question', questionId: questionId }
    });
    delete next.answers[questionId];
    delete next.statuses[questionId];
    delete next.errors[questionId];
    return next;
  }

  function resetQuiz(set) {
    var state = createEmptySetState(set);
    state.lastAction = { type: 'reset-quiz' };
    return state;
  }

  function safeHttpsUrl(value) {
    if (typeof value !== 'string' || !/^https:\/\//i.test(value.trim())) return null;
    try {
      var parsed = new URL(value.trim());
      return parsed.protocol === 'https:' ? parsed.href : null;
    } catch (error) {
      return null;
    }
  }

  function safeArticleRoute(value) {
    if (typeof value !== 'string') return null;
    return /^\.\.\/#(?:page|section)-\d+(?:-\d+)*$/.test(value) ? value : null;
  }

  function validateQuestionBank(value) {
    var errors = [];
    if (!value || typeof value !== 'object') return { valid: false, errors: ['题库不是对象。'] };
    if (value.schemaVersion !== 1) errors.push('schemaVersion 必须为 1。');
    if (value.release !== '13.3') errors.push('release 必须为 13.3。');
    if (!Array.isArray(value.sets) || !value.sets.length) errors.push('sets 必须是非空数组。');
    var setIds = new Set();
    var questionIds = new Set();
    (value.sets || []).forEach(function (set) {
      if (!set || typeof set.id !== 'string' || !/^quiz-\d+-\d+$/.test(set.id)) errors.push('练习集 ID 无效。');
      else if (setIds.has(set.id)) errors.push('练习集 ID 重复：' + set.id);
      else setIds.add(set.id);
      if (!Array.isArray(set.questions)) errors.push((set.id || '未知练习集') + ' 缺少 questions。');
      (set.questions || []).forEach(function (question) {
        if (!question || typeof question.id !== 'string' || questionIds.has(question.id)) errors.push('题目 ID 缺失或重复。');
        else questionIds.add(question.id);
        if (['single', 'multiple', 'fill'].indexOf(question.type) === -1) errors.push((question.id || '未知题目') + ' 题型无效。');
        if (!question.stemMd || !question.explanationMd) errors.push((question.id || '未知题目') + ' 缺少题干或解析。');
        if (question.type === 'fill' && (!Array.isArray(question.acceptedAnswers) || !question.acceptedAnswers.length)) errors.push(question.id + ' 缺少可接受答案。');
        if (question.type !== 'fill' && (!Array.isArray(question.correctOptionIds) || !question.correctOptionIds.length)) errors.push(question.id + ' 缺少正确选项。');
        if (!safeArticleRoute(question.articleRoute)) errors.push(question.id + ' 正文锚点无效。');
        if (!safeHttpsUrl(question.officialAnswerUrl)) errors.push(question.id + ' 官方依据 URL 无效。');
        if (!question.provenance || !safeHttpsUrl(question.provenance.sourceUrl)) errors.push(question.id + ' 来源 URL 无效。');
      });
    });
    return { valid: errors.length === 0, errors: errors };
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function createMarkdown() {
    if (typeof root.markdownit !== 'function') return null;
    var instance = root.markdownit({ html: false, linkify: false, typographer: false, breaks: false });
    instance.validateLink = function (url) { return safeHttpsUrl(url) !== null; };
    var fallback = instance.renderer.rules.link_open || function (tokens, index, options, env, self) {
      return self.renderToken(tokens, index, options);
    };
    instance.renderer.rules.link_open = function (tokens, index, options, env, self) {
      var hrefIndex = tokens[index].attrIndex('href');
      var href = hrefIndex >= 0 ? tokens[index].attrs[hrefIndex][1] : '';
      var safe = safeHttpsUrl(href);
      if (!safe) {
        if (hrefIndex >= 0) tokens[index].attrs.splice(hrefIndex, 1);
      } else {
        tokens[index].attrSet('href', safe);
        tokens[index].attrSet('target', '_blank');
        tokens[index].attrSet('rel', 'noopener noreferrer');
      }
      return fallback(tokens, index, options, env, self);
    };
    return instance;
  }

  function renderInline(value) {
    if (!markdown) return escapeHtml(value);
    return markdown.renderInline(String(value || ''));
  }

  function renderBlock(value) {
    if (!markdown) return '<p>' + escapeHtml(value) + '</p>';
    return markdown.render(String(value || ''));
  }

  function difficultyLabel(value) {
    return { easy: '基础', medium: '进阶', hard: '挑战' }[value] || String(value || '练习');
  }

  function typeLabel(value) {
    return { single: '单选题', multiple: '多选题', fill: '填空题' }[value] || '练习题';
  }

  function sourceKindLabel(provenance) {
    var type = provenance && provenance.type;
    if (type === 'reported-interview-adapted') return '公开面经改编';
    if (type === 'interview-style-original') return '面试型原创';
    return '官方资料改编';
  }

  function setDescription(set) {
    var topics = [];
    (set.questions || []).forEach(function (question) {
      if (question.topic && topics.indexOf(question.topic) === -1) topics.push(question.topic);
    });
    return topics.slice(0, 3).join('、') + (topics.length > 3 ? '等考点' : '');
  }

  function answerText(question) {
    if (question.type === 'fill') return escapeHtml(question.displayAnswer || (question.acceptedAnswers || []).join(' / '));
    var correct = new Set((question.correctOptionIds || []).map(String));
    return (question.options || []).filter(function (option) {
      return correct.has(String(option.id));
    }).map(function (option) {
      return '<span><strong>' + escapeHtml(option.id) + '.</strong> ' + renderInline(option.textMd) + '</span>';
    }).join('<br>');
  }

  function sourceLinks(question) {
    var links = [];
    var provenance = question.provenance || {};
    var article = safeArticleRoute(question.articleRoute);
    var official = safeHttpsUrl(question.officialAnswerUrl);
    var source = safeHttpsUrl(provenance.sourceUrl);
    if (article) links.push('<a href="' + escapeHtml(article) + '">回看译文知识点 →</a>');
    if (official) links.push('<a href="' + escapeHtml(official) + '" target="_blank" rel="noopener noreferrer">NVIDIA 官方依据 ↗</a>');
    if (source) {
      var prefix = provenance.type === 'reported-interview-adapted' ? '查看候选人自述面经' : '查看题目来源';
      links.push('<a href="' + escapeHtml(source) + '" target="_blank" rel="noopener noreferrer">' + prefix + ' ↗</a>');
    }
    var sourceName = provenance.sourceTitle || '';
    var companyRole = [provenance.company, provenance.role].filter(Boolean).join(' · ');
    var note = sourceName || companyRole
      ? '<p class="quiz-source-note"><strong>题目来源：</strong>' + escapeHtml(sourceName) + (companyRole ? '<span>' + escapeHtml(companyRole) + '</span>' : '') + (provenance.adapted ? '<em>已改编</em>' : '') + '</p>'
      : '';
    return note + (links.length ? '<div class="quiz-sources">' + links.join('') + '</div>' : '');
  }

  function renderFeedback(question, status) {
    if (!status) return '';
    var labels = {
      correct: { icon: '✓', title: '回答正确', className: 'is-correct' },
      incorrect: { icon: '✕', title: '回答错误', className: 'is-incorrect' },
      unanswered: { icon: '—', title: '本题未作答', className: 'is-unanswered' }
    };
    var view = labels[status.status] || labels.unanswered;
    return '<div class="quiz-feedback" id="feedback-' + escapeHtml(question.id) + '" tabindex="-1" role="status" aria-live="polite">' +
      '<p class="quiz-feedback-title ' + view.className + '"><span aria-hidden="true">' + view.icon + '</span><span>' + view.title + '</span></p>' +
      '<p class="quiz-answer"><strong>标准答案：</strong> ' + answerText(question) + '</p>' +
      '<div class="quiz-explanation"><strong>解析：</strong>' + renderBlock(question.explanationMd) + '</div>' +
      sourceLinks(question) +
      '</div>';
  }

  function renderChoiceInputs(question, answer, locked, hasError) {
    var selected = new Set(selectedIds(answer).map(String));
    var inputType = question.type === 'multiple' ? 'checkbox' : 'radio';
    var describedBy = hasError ? 'error-' + question.id : (locked ? 'feedback-' + question.id : 'hint-' + question.id);
    return '<div class="quiz-options">' + (question.options || []).map(function (option) {
      var id = 'option-' + question.id + '-' + option.id;
      return '<label class="quiz-option" for="' + escapeHtml(id) + '">' +
        '<input id="' + escapeHtml(id) + '" type="' + inputType + '" name="answer-' + escapeHtml(question.id) + '" value="' + escapeHtml(option.id) + '" data-question-id="' + escapeHtml(question.id) + '"' +
        (selected.has(String(option.id)) ? ' checked' : '') + (locked ? ' disabled' : '') +
        ' aria-describedby="' + escapeHtml(describedBy) + '"' + (hasError ? ' aria-invalid="true"' : '') + '>' +
        '<span class="quiz-option-copy"><strong>' + escapeHtml(option.id) + '.</strong> ' + renderInline(option.textMd) + '</span>' +
        '</label>';
    }).join('') + '</div>';
  }

  function renderFillInput(question, answer, locked, hasError) {
    var describedBy = hasError ? 'error-' + question.id : (locked ? 'feedback-' + question.id : 'hint-' + question.id);
    return '<label class="quiz-fill-label" for="fill-' + escapeHtml(question.id) + '">' +
      '<span>请填写答案（按题目声明精确匹配，不进行模糊判定）</span>' +
      '<input class="quiz-fill-input" id="fill-' + escapeHtml(question.id) + '" name="answer-' + escapeHtml(question.id) + '" type="text" autocomplete="off" spellcheck="false" data-question-id="' + escapeHtml(question.id) + '" value="' + escapeHtml(answer || '') + '"' +
      (locked ? ' disabled' : '') + ' aria-describedby="' + escapeHtml(describedBy) + '"' + (hasError ? ' aria-invalid="true"' : '') + '>' +
      '</label>';
  }

  function renderQuestion(question, index, state) {
    var status = state.statuses[question.id];
    var locked = state.submitted || Boolean(status);
    var hasError = Boolean(state.errors[question.id]);
    var statusClass = status ? ' is-' + status.status : (hasError ? ' has-empty-error' : '');
    var provenanceClass = question.provenance && question.provenance.type === 'reported-interview-adapted' ? ' is-interview' : '';
    var inputs = question.type === 'fill'
      ? renderFillInput(question, state.answers[question.id], locked, hasError)
      : renderChoiceInputs(question, state.answers[question.id], locked, hasError);
    var emptyFeedback = hasError ? '<p class="quiz-empty-feedback" id="error-' + escapeHtml(question.id) + '" role="alert">请先作答，再检查本题。</p>' : '';
    var controls = state.submitted ? '' : '<div class="quiz-question-actions">' +
      (status
        ? '<button class="quiz-button is-secondary" type="button" data-action="reset-question" data-question-id="' + escapeHtml(question.id) + '">重新作答</button>'
        : '<button class="quiz-button is-secondary" type="button" data-action="check-question" data-question-id="' + escapeHtml(question.id) + '">检查本题</button>') +
      '</div>';
    var hint = '<span class="quiz-visually-hidden" id="hint-' + escapeHtml(question.id) + '">' + (question.type === 'multiple' ? '多选题必须完整匹配所有正确选项。' : '每题一分。') + '</span>';

    return '<section class="quiz-question' + statusClass + '" id="question-' + escapeHtml(question.id) + '" data-question-id="' + escapeHtml(question.id) + '" tabindex="-1">' +
      '<fieldset' + (hasError ? ' aria-invalid="true"' : '') + '>' +
      '<legend>' +
      '<span class="quiz-question-heading"><span class="quiz-question-number">第 ' + (index + 1) + ' 题 · ' + typeLabel(question.type) + '</span>' +
      '<span class="quiz-question-meta"><span class="quiz-difficulty">' + escapeHtml(difficultyLabel(question.difficulty)) + '</span><span class="quiz-source-kind' + provenanceClass + '">' + escapeHtml(sourceKindLabel(question.provenance)) + '</span></span></span>' +
      '<span class="quiz-stem">' + renderInline(question.stemMd) + '</span>' +
      '</legend>' + hint + inputs + emptyFeedback +
      '</fieldset>' + controls + renderFeedback(question, status) +
      '</section>';
  }

  function renderScore(summary) {
    if (!summary) return '';
    return '<section class="quiz-score-summary" id="quiz-score-summary" tabindex="-1" aria-live="polite" aria-labelledby="quiz-score-title">' +
      '<h2 id="quiz-score-title">交卷完成 · ' + summary.correct + ' / ' + summary.total + ' 分</h2>' +
      '<div class="quiz-score-grid">' +
      '<div class="quiz-score-item"><strong>' + summary.percentage + '%</strong><span>正确率</span></div>' +
      '<div class="quiz-score-item"><strong>' + summary.correct + '</strong><span>✓ 正确</span></div>' +
      '<div class="quiz-score-item"><strong>' + summary.incorrect + '</strong><span>✕ 错误</span></div>' +
      '<div class="quiz-score-item"><strong>' + summary.unanswered + '</strong><span>— 未答</span></div>' +
      '</div></section>';
  }

  function renderSubmitPanel(state, set) {
    if (state.submitted) {
      return '<section class="quiz-submit-panel"><p>本节全部题目已锁定，逐题解析已展开。你可以清空本节状态后重新作答。</p>' +
        '<div class="quiz-form-actions"><button class="quiz-button is-danger" type="button" data-action="reset-quiz">重新做本节</button><a class="quiz-button is-secondary" href="' + escapeHtml(safeArticleRoute(set.sourcePageRoute) || '../') + '">返回本节正文</a></div></section>';
    }
    var confirm = '';
    if (state.needsConfirmation) {
      var ungraded = gradeQuiz(set, state.answers);
      confirm = '<div class="quiz-unanswered-confirm" id="quiz-unanswered-confirm" tabindex="-1" role="alert" aria-live="assertive">' +
        '<strong>还有 ' + ungraded.unanswered + ' 题未作答</strong><p>你可以回到第一道未答题，也可以仍然交卷；未答题按 0 分计。</p>' +
        '<div class="quiz-confirm-actions"><button class="quiz-button is-secondary" type="button" data-action="first-unanswered">返回第一道未答题</button><button class="quiz-button" type="button" data-action="submit-anyway">仍然交卷</button></div></div>';
    }
    return '<section class="quiz-submit-panel">' + confirm + '<p>每题 1 分；多选题必须完整匹配，不设部分分。交卷后将锁定本节并展开全部解析。</p>' +
      '<div class="quiz-form-actions"><button class="quiz-button" type="submit">交卷并查看总评</button><button class="quiz-button is-danger" type="button" data-action="reset-quiz">清空本节答案</button></div></section>';
  }

  function renderQuiz(set, state) {
    var sourcePage = safeArticleRoute(set.sourcePageRoute) || '../';
    return '<header class="quiz-page-header">' +
      '<div class="quiz-page-kicker"><span class="quiz-meta-pill">' + escapeHtml(set.chapter) + '</span><span class="quiz-meta-pill">' + set.questions.length + ' 题 · 每题 1 分</span></div>' +
      '<h1 id="quiz-title" tabindex="-1">' + escapeHtml(set.titleZh) + '</h1>' +
      '<p class="quiz-page-subtitle" lang="en">' + escapeHtml(set.titleEn || '') + '</p>' +
      '<p class="quiz-page-intro">可逐题检查，也可全部完成后统一交卷。<a href="' + escapeHtml(sourcePage) + '">返回本节正文 →</a></p>' +
      '</header>' +
      '<p class="quiz-disclaimer"><strong>来源说明：</strong>' + escapeHtml(bank.disclaimerZh || '公开面经来自候选人自述，不代表企业官方题库，也不保证再次出现。') + ' 所有面经题均经重新表述，并以 NVIDIA Release 13.3 官方资料校验答案。</p>' +
      renderScore(state.summary) +
      '<form class="quiz-form" id="quiz-form" novalidate>' +
      set.questions.map(function (question, index) { return renderQuestion(question, index, state); }).join('') +
      renderSubmitPanel(state, set) +
      '</form>';
  }

  function renderHub(invalidHash) {
    var warning = invalidHash ? '<p class="quiz-invalid-route" role="alert">没有找到这个练习路由。请从下面三套练习中选择；页面未自动跳转。</p>' : '';
    return warning + '<header class="quiz-hero">' +
      '<p class="quiz-eyebrow">Chapter 1 · Practice Center</p>' +
      '<h1 id="quiz-title" tabindex="-1">CUDA 第一章课后练习</h1>' +
      '<p>三套练习分别对应 1.1、1.2 与 1.3，覆盖官方知识点与经过重新表述的公开面经。答题状态仅存在于当前标签页内存中。</p>' +
      '</header>' +
      '<section class="quiz-hub-grid" aria-label="选择练习集">' + bank.sets.map(function (set) {
        var interviewCount = set.questions.filter(function (question) { return question.provenance && question.provenance.type === 'reported-interview-adapted'; }).length;
        return '<a class="quiz-hub-card" href="' + escapeHtml(set.route) + '">' +
          '<span class="quiz-hub-number">' + escapeHtml(set.chapter) + '</span>' +
          '<h2>' + escapeHtml(set.titleZh.replace(/^\d+\.\d+\s*/, '')) + '</h2>' +
          '<p>' + escapeHtml(setDescription(set)) + '</p>' +
          '<span class="quiz-hub-meta"><span class="quiz-meta-pill">' + set.questions.length + ' 题</span>' +
          '<span class="quiz-meta-pill">' + (interviewCount ? interviewCount + ' 题面经改编' : '官方资料改编') + '</span></span>' +
          '</a>';
      }).join('') + '</section>';
  }

  function getSet(id) {
    return bank && bank.sets ? bank.sets.find(function (set) { return set.id === id; }) : null;
  }

  function getState(set) {
    if (!stateBySet.has(set.id)) stateBySet.set(set.id, createEmptySetState(set));
    return stateBySet.get(set.id);
  }

  function setState(set, state) {
    stateBySet.set(set.id, state);
  }

  function renderSidebar(currentId) {
    dom.setNav.innerHTML = '<a class="quiz-set-link' + (!currentId ? ' is-active' : '') + '" href="./" data-hub-link>' +
      '<strong>练习中心首页</strong><span>选择 1.1–1.3 练习</span></a>' +
      bank.sets.map(function (set) {
        return '<a class="quiz-set-link' + (currentId === set.id ? ' is-active' : '') + '" href="' + escapeHtml(set.route) + '"' + (currentId === set.id ? ' aria-current="page"' : '') + '>' +
          '<strong>' + escapeHtml(set.titleZh) + '</strong><span>' + set.questions.length + ' 题 · 即时解析</span></a>';
      }).join('');
  }

  function renderStatusRail(set, state) {
    if (!set) {
      dom.statusContent.innerHTML = '<p class="outline-empty">选择一套练习开始作答。</p>';
      return;
    }
    var answered = set.questions.filter(function (question) { return isAnswered(question, state.answers[question.id]); }).length;
    var progress = set.questions.length ? Math.round((answered / set.questions.length) * 100) : 0;
    var jumps = set.questions.map(function (question, index) {
      var status = state.statuses[question.id];
      var className = status ? ' is-' + status.status : (isAnswered(question, state.answers[question.id]) ? ' is-answered' : '');
      var label = status ? ({ correct: '正确', incorrect: '错误', unanswered: '未答' }[status.status]) : (isAnswered(question, state.answers[question.id]) ? '已作答' : '未作答');
      return '<a class="' + className.trim() + '" href="#question-' + escapeHtml(question.id) + '" data-question-jump="' + escapeHtml(question.id) + '" aria-label="第 ' + (index + 1) + ' 题，' + label + '">' + (index + 1) + '</a>';
    }).join('');
    dom.statusContent.innerHTML = '<div class="quiz-rail-progress"><strong>' + answered + ' / ' + set.questions.length + '</strong><span>已作答 · ' + progress + '%</span>' +
      '<div class="quiz-rail-bar" aria-hidden="true" style="--quiz-progress:' + progress + '%"><span></span></div></div>' +
      '<div class="quiz-question-jumps">' + jumps + '</div>' +
      '<p class="quiz-rail-legend">圆点状态同时通过文字与符号呈现；交卷后显示最终正误。</p>';
  }

  function focusSoon(selector) {
    if (!selector) return;
    root.setTimeout(function () {
      var element = root.document.querySelector(selector);
      if (element && typeof element.focus === 'function') element.focus({ preventScroll: false });
    }, 0);
  }

  function currentRoute() {
    return parseQuizHash(root.location.hash, bank ? bank.sets.map(function (set) { return set.id; }) : QUIZ_IDS);
  }

  function renderCurrent(options) {
    options = options || {};
    var route = currentRoute();
    var set = route.kind === 'quiz' ? getSet(route.id) : null;
    renderSidebar(set && set.id);
    if (set) {
      var state = getState(set);
      dom.app.innerHTML = renderQuiz(set, state);
      renderStatusRail(set, state);
    } else {
      dom.app.innerHTML = renderHub(route.invalidHash);
      renderStatusRail(null, null);
    }
    closeNavigation(false);
    if (options.focusSelector) focusSoon(options.focusSelector);
    else if (options.focusHeading) focusSoon('#quiz-title');
  }

  function answerFromDom(question) {
    var section = root.document.getElementById('question-' + question.id);
    if (!section) return undefined;
    if (question.type === 'fill') {
      var input = section.querySelector('input[type="text"]');
      return input ? input.value : '';
    }
    var checked = Array.prototype.map.call(section.querySelectorAll('input:checked'), function (input) { return input.value; });
    return question.type === 'single' ? (checked[0] || '') : checked;
  }

  function captureAnswers(set, state) {
    var next = state;
    set.questions.forEach(function (question) {
      if (state.submitted || state.statuses[question.id]) return;
      next = setDraftAnswer(next, question.id, answerFromDom(question));
    });
    return next;
  }

  function firstUnansweredQuestion(set, state) {
    return set.questions.find(function (question) {
      return !isAnswered(question, state.answers[question.id]);
    });
  }

  function handleFormSubmit(event) {
    if (!event.target.matches('#quiz-form')) return;
    event.preventDefault();
    var route = currentRoute();
    var set = route.kind === 'quiz' ? getSet(route.id) : null;
    if (!set) return;
    var state = captureAnswers(set, getState(set));
    state = submitQuiz(state, set, false);
    setState(set, state);
    renderCurrent({ focusSelector: state.needsConfirmation ? '#quiz-unanswered-confirm' : '#quiz-score-summary' });
  }

  function handleAppClick(event) {
    var button = event.target.closest('[data-action]');
    if (!button) return;
    var route = currentRoute();
    var set = route.kind === 'quiz' ? getSet(route.id) : null;
    if (!set) return;
    var state = captureAnswers(set, getState(set));
    var action = button.getAttribute('data-action');
    var questionId = button.getAttribute('data-question-id');
    var focusSelector = null;

    if (action === 'check-question') {
      state = checkQuestion(state, set, questionId);
      focusSelector = state.errors[questionId] ? '#question-' + questionId + ' input' : '#feedback-' + questionId;
    } else if (action === 'reset-question') {
      state = resetQuestion(state, questionId);
      focusSelector = '#question-' + questionId + ' input';
    } else if (action === 'reset-quiz') {
      state = resetQuiz(set);
      focusSelector = '#quiz-title';
    } else if (action === 'submit-anyway') {
      state = submitQuiz(state, set, true);
      focusSelector = '#quiz-score-summary';
    } else if (action === 'first-unanswered') {
      state = Object.assign({}, state, { needsConfirmation: false, lastAction: { type: 'return-unanswered' } });
      var first = firstUnansweredQuestion(set, state);
      focusSelector = first ? '#question-' + first.id + ' input' : '#quiz-form button[type="submit"]';
    } else {
      return;
    }
    setState(set, state);
    renderCurrent({ focusSelector: focusSelector });
  }

  function handleAnswerInput(event) {
    var input = event.target.closest('[data-question-id]');
    if (!input) return;
    var route = currentRoute();
    var set = route.kind === 'quiz' ? getSet(route.id) : null;
    if (!set) return;
    var questionId = input.getAttribute('data-question-id');
    var question = set.questions.find(function (item) { return item.id === questionId; });
    if (!question) return;
    var state = setDraftAnswer(getState(set), questionId, answerFromDom(question));
    setState(set, state);
    var section = root.document.getElementById('question-' + questionId);
    if (section && state.errors[questionId] === undefined) {
      section.classList.remove('has-empty-error');
      var fieldset = section.querySelector('fieldset');
      if (fieldset) fieldset.removeAttribute('aria-invalid');
      Array.prototype.forEach.call(section.querySelectorAll('[aria-invalid="true"]'), function (element) {
        element.removeAttribute('aria-invalid');
        element.setAttribute('aria-describedby', 'hint-' + questionId);
      });
      var error = section.querySelector('.quiz-empty-feedback');
      if (error) error.remove();
    }
    renderStatusRail(set, state);
  }

  function handleQuestionJump(event) {
    var link = event.target.closest('[data-question-jump]');
    if (!link) return;
    event.preventDefault();
    var target = root.document.getElementById('question-' + link.getAttribute('data-question-jump'));
    if (target) {
      target.scrollIntoView({ behavior: root.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      var input = target.querySelector('input:not(:disabled)');
      (input || target).focus({ preventScroll: true });
    }
  }

  function syncThemeControls() {
    var dark = root.document.documentElement.getAttribute('data-theme') === 'dark';
    dom.themeToggle.setAttribute('aria-pressed', String(dark));
    dom.themeToggle.setAttribute('aria-label', dark ? '切换到日间模式' : '切换到夜览模式');
    dom.themeToggle.setAttribute('title', dark ? '切换到日间模式' : '切换到夜览模式');
    dom.themeIcon.textContent = dark ? '☀' : '☾';
    dom.themeLabel.textContent = dark ? '日览' : '夜览';
    dom.themeColor.setAttribute('content', dark ? '#10140e' : '#76b900');
  }

  function toggleTheme() {
    var html = root.document.documentElement;
    var nextTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', nextTheme);
    try {
      root.localStorage.setItem('cuda-docs-theme', nextTheme);
    } catch (error) {
      // Theme persistence is optional; quiz answers always remain memory-only.
    }
    syncThemeControls();
  }

  function openNavigation() {
    root.document.body.classList.add('nav-open');
    dom.navToggle.setAttribute('aria-expanded', 'true');
    var focusable = dom.sidebar.querySelector('a, button');
    if (focusable) focusable.focus();
  }

  function closeNavigation(restoreFocus) {
    if (!root.document.body.classList.contains('nav-open')) return;
    root.document.body.classList.remove('nav-open');
    dom.navToggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) dom.navToggle.focus();
  }

  function handleGlobalKeydown(event) {
    if (!root.document.body.classList.contains('nav-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeNavigation(true);
      return;
    }
    if (event.key !== 'Tab') return;
    var focusable = Array.prototype.filter.call(dom.sidebar.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])'), function (element) {
      return element.getClientRects().length > 0;
    });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && root.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && root.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function bindDom() {
    dom.shell = root.document.getElementById('quiz-shell');
    dom.app = root.document.getElementById('quiz-app');
    dom.loadStatus = root.document.getElementById('quiz-load-status');
    dom.setNav = root.document.getElementById('quiz-set-nav');
    dom.statusContent = root.document.getElementById('quiz-status-content');
    dom.navToggle = root.document.getElementById('mobile-nav-toggle');
    dom.sidebar = root.document.getElementById('quiz-sidebar');
    dom.overlay = root.document.getElementById('docs-overlay');
    dom.themeToggle = root.document.getElementById('theme-toggle');
    dom.themeIcon = root.document.getElementById('theme-toggle-icon');
    dom.themeLabel = root.document.getElementById('theme-toggle-label');
    dom.themeColor = root.document.getElementById('theme-color');
  }

  function showFatal(error) {
    dom.loadStatus.hidden = true;
    dom.app.innerHTML = '<section class="quiz-error-panel" role="alert"><h1>练习题加载失败</h1><p>' + escapeHtml(error && error.message ? error.message : '请检查网络后重试。') + '</p>' +
      '<div class="quiz-error-actions"><button class="quiz-button" type="button" data-action="retry-load">重新加载</button><a class="quiz-button is-secondary" href="../">返回 CUDA 正文</a></div></section>';
    dom.shell.setAttribute('aria-busy', 'false');
  }

  function loadBank() {
    dom.loadStatus.hidden = false;
    dom.loadStatus.textContent = '正在加载练习题…';
    return root.fetch('./question-bank.json', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('题库请求失败（HTTP ' + response.status + '）。');
        return response.json();
      })
      .then(function (value) {
        var validation = validateQuestionBank(value);
        if (!validation.valid) throw new Error('题库结构校验失败：' + validation.errors[0]);
        bank = value;
        dom.loadStatus.hidden = true;
        dom.shell.setAttribute('aria-busy', 'false');
        renderCurrent({ focusHeading: false });
      })
      .catch(showFatal);
  }

  function boot() {
    bindDom();
    if (!dom.app || !dom.shell) return;
    markdown = createMarkdown();
    syncThemeControls();

    dom.themeToggle.addEventListener('click', toggleTheme);
    dom.navToggle.addEventListener('click', function () {
      if (root.document.body.classList.contains('nav-open')) closeNavigation(true);
      else openNavigation();
    });
    dom.overlay.addEventListener('click', function () { closeNavigation(true); });
    dom.sidebar.addEventListener('click', function (event) {
      var hub = event.target.closest('[data-hub-link]');
      if (hub) {
        event.preventDefault();
        if (root.location.hash) root.history.pushState(null, '', root.location.pathname + root.location.search);
        renderCurrent({ focusHeading: true });
      }
      if (event.target.closest('a')) closeNavigation(false);
    });
    dom.app.addEventListener('submit', handleFormSubmit);
    dom.app.addEventListener('click', function (event) {
      var retry = event.target.closest('[data-action="retry-load"]');
      if (retry) {
        bank = null;
        stateBySet.clear();
        dom.app.innerHTML = '';
        loadBank();
        return;
      }
      handleAppClick(event);
    });
    dom.app.addEventListener('input', handleAnswerInput);
    dom.app.addEventListener('change', handleAnswerInput);
    dom.statusContent.addEventListener('click', handleQuestionJump);
    root.addEventListener('hashchange', function () { renderCurrent({ focusHeading: true }); });
    root.addEventListener('resize', function () { if (root.innerWidth > 900) closeNavigation(false); });
    root.document.addEventListener('keydown', handleGlobalKeydown);

    loadBank();
  }

  return {
    QUIZ_IDS: QUIZ_IDS.slice(),
    parseQuizHash: parseQuizHash,
    normalizeFillAnswer: normalizeFillAnswer,
    isAnswered: isAnswered,
    gradeQuestion: gradeQuestion,
    gradeQuiz: gradeQuiz,
    createEmptySetState: createEmptySetState,
    setDraftAnswer: setDraftAnswer,
    checkQuestion: checkQuestion,
    submitQuiz: submitQuiz,
    resetQuestion: resetQuestion,
    resetQuiz: resetQuiz,
    safeHttpsUrl: safeHttpsUrl,
    safeArticleRoute: safeArticleRoute,
    validateQuestionBank: validateQuestionBank,
    escapeHtml: escapeHtml,
    boot: boot
  };
}));
