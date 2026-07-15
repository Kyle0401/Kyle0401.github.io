'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var docs = require('../cuda-docs.js');
var quiz = require('../exercises/quiz.js');

var root = path.resolve(__dirname, '..');
var bankPath = path.join(root, 'exercises', 'question-bank.json');
var bank = JSON.parse(fs.readFileSync(bankPath, 'utf8').replace(/^\uFEFF/, ''));
var quizSource = fs.readFileSync(path.join(root, 'exercises', 'quiz.js'), 'utf8');
var quizIndex = fs.readFileSync(path.join(root, 'exercises', 'index.html'), 'utf8');
var quizStyle = fs.readFileSync(path.join(root, 'exercises', 'quiz.css'), 'utf8');
var sourceMarkdown = fs.readFileSync(path.join(root, 'cuda-programming-guide-zh.md'), 'utf8');

function findSet(id) {
  return bank.sets.find(function (set) { return set.id === id; });
}

function findQuestion(type, setId) {
  return findSet(setId).questions.find(function (question) { return question.type === type; });
}

function correctAnswer(question) {
  if (question.type === 'fill') return question.acceptedAnswers[0];
  return question.correctOptionIds.slice();
}

function wrongChoiceAnswer(question) {
  var wrong = question.options.find(function (option) {
    return question.correctOptionIds.indexOf(option.id) === -1;
  });
  return wrong ? [wrong.id] : [];
}

assert.strictEqual(bank.schemaVersion, 1);
assert.strictEqual(bank.release, '13.3');
assert.strictEqual(bank.sets.length, 3);
assert.deepStrictEqual(bank.sets.map(function (set) { return set.id; }), [
  'quiz-1-1', 'quiz-1-2', 'quiz-1-3'
]);
assert.deepStrictEqual(bank.sets.map(function (set) { return set.questions.length; }), [6, 10, 8]);
assert.deepStrictEqual(bank.sets.map(function (set) {
  return ['single', 'multiple', 'fill'].map(function (type) {
    return set.questions.filter(function (question) { return question.type === type; }).length;
  });
}), [[4, 1, 1], [5, 3, 2], [4, 2, 2]]);
assert.strictEqual(new Set(bank.sets.flatMap(function (set) {
  return set.questions.map(function (question) { return question.id; });
})).size, 24);

bank.sets.forEach(function (quizSet) {
  var answerKey = {};
  quizSet.questions.forEach(function (question) {
    answerKey[question.id] = correctAnswer(question);
  });
  var perfect = quiz.gradeQuiz(quizSet, answerKey);
  assert.strictEqual(perfect.correct, quizSet.questions.length);
  assert.strictEqual(perfect.incorrect, 0);
  assert.strictEqual(perfect.unanswered, 0);
  assert.strictEqual(perfect.percentage, 100);
});

['quiz-1-1', 'quiz-1-2', 'quiz-1-3'].forEach(function (id) {
  var parsed = quiz.parseQuizHash('#' + id);
  assert.strictEqual(parsed.kind, 'quiz');
  assert.strictEqual(parsed.id, id);
});
assert.strictEqual(quiz.parseQuizHash('').kind, 'hub');
assert.strictEqual(quiz.parseQuizHash('#not-a-quiz').kind, 'hub');
assert.strictEqual(quiz.parseQuizHash('#quiz-9-9').kind, 'hub');
assert.ok(!quiz.safeArticleRoute('../#section-1-2-2"><script>alert(1)</script>'));

assert.strictEqual(quiz.normalizeFillAnswer('  Streaming   Multiprocessor  ', false), 'streaming multiprocessor');
assert.strictEqual(quiz.normalizeFillAnswer('ＳＭ＿１２０', false), 'sm_120');
assert.strictEqual(quiz.normalizeFillAnswer('CUDA', true), 'CUDA');
assert.strictEqual(quiz.normalizeFillAnswer('CUDA', false), 'cuda');

var single = findQuestion('single', 'quiz-1-1');
assert.strictEqual(quiz.gradeQuestion(single, correctAnswer(single)).answered, true);
assert.strictEqual(quiz.gradeQuestion(single, correctAnswer(single)).correct, true);
assert.strictEqual(quiz.gradeQuestion(single, wrongChoiceAnswer(single)).correct, false);
assert.strictEqual(quiz.gradeQuestion(single, []).answered, false);

var multiple = findQuestion('multiple', 'quiz-1-2');
assert.strictEqual(quiz.gradeQuestion(multiple, correctAnswer(multiple)).correct, true);
assert.strictEqual(quiz.gradeQuestion(multiple, multiple.correctOptionIds.slice(0, -1)).correct, false);
assert.strictEqual(quiz.gradeQuestion(multiple, multiple.correctOptionIds.concat(['not-an-option'])).correct, false);

var syntheticFill = {
  id: 'synthetic-fill',
  type: 'fill',
  acceptedAnswers: ['Streaming Multiprocessor', 'SM'],
  caseSensitive: false,
  displayAnswer: 'Streaming Multiprocessor (SM)'
};
assert.strictEqual(quiz.gradeQuestion(syntheticFill, ' streaming   multiprocessor ').correct, true);
assert.strictEqual(quiz.gradeQuestion(syntheticFill, 'ｓｍ').correct, true);
assert.strictEqual(quiz.gradeQuestion(syntheticFill, 'streaming multiprocess').correct, false);
assert.strictEqual(quiz.gradeQuestion(syntheticFill, '   ').answered, false);

var set = findSet('quiz-1-1');
var emptyState = quiz.createEmptySetState(set);
var unansweredSubmission = quiz.submitQuiz(emptyState, set, false);
assert.strictEqual(unansweredSubmission.needsConfirmation, true);
assert.strictEqual(unansweredSubmission.lastAction.type, 'confirm-unanswered');
assert.strictEqual(unansweredSubmission.lastAction.unanswered, set.questions.length);

var firstQuestion = set.questions[0];
var draftedState = quiz.setDraftAnswer(emptyState, firstQuestion.id, correctAnswer(firstQuestion));
assert.notStrictEqual(draftedState, emptyState);
assert.strictEqual(quiz.isAnswered(firstQuestion, draftedState.answers[firstQuestion.id]), true);
var checkedState = quiz.checkQuestion(draftedState, set, firstQuestion.id);
assert.strictEqual(checkedState.statuses[firstQuestion.id].correct, true);
assert.strictEqual(checkedState.statuses[firstQuestion.id].status, 'correct');
assert.strictEqual(quiz.setDraftAnswer(checkedState, firstQuestion.id, wrongChoiceAnswer(firstQuestion)), checkedState);
var resetQuestionState = quiz.resetQuestion(checkedState, firstQuestion.id);
assert.strictEqual(quiz.isAnswered(firstQuestion, resetQuestionState.answers[firstQuestion.id]), false);
assert.strictEqual(Boolean(resetQuestionState.statuses[firstQuestion.id]), false);

var submittedState = quiz.submitQuiz(emptyState, set, true);
assert.strictEqual(submittedState.submitted, true);
assert.strictEqual(submittedState.summary.unanswered, set.questions.length);
assert.strictEqual(submittedState.summary.correct, 0);
var resetSetState = quiz.resetQuiz(set);
assert.strictEqual(resetSetState.submitted, false);
assert.strictEqual(Object.keys(resetSetState.answers).length, 0);
assert.strictEqual(Object.keys(resetSetState.statuses).length, 0);

assert.ok(quiz.safeHttpsUrl('https://docs.nvidia.com/cuda/cuda-programming-guide/'));
assert.ok(!quiz.safeHttpsUrl('javascript:alert(1)'));
assert.ok(!quiz.safeHttpsUrl('http://example.com/insecure'));
assert.ok(!quiz.safeHttpsUrl('data:text/html,unsafe'));
var bankValidation = quiz.validateQuestionBank(bank);
assert.strictEqual(bankValidation.valid, true);
assert.deepStrictEqual(bankValidation.errors, []);
var unsafeBank = JSON.parse(JSON.stringify(bank));
unsafeBank.sets[0].questions[0].stemMd = '<script>alert("unsafe")</script>';
unsafeBank.sets[0].questions[0].officialAnswerUrl = 'javascript:alert(1)';
unsafeBank.sets[0].questions[0].provenance.sourceUrl = 'http://example.com/insecure';
var unsafeValidation = quiz.validateQuestionBank(unsafeBank);
assert.strictEqual(unsafeValidation.valid, false);
assert.ok(unsafeValidation.errors.length >= 2);
assert.ok(/html\s*:\s*false/.test(quizSource));
assert.strictEqual(quiz.escapeHtml('<script>alert("unsafe")</script>'), '&lt;script&gt;alert(&quot;unsafe&quot;)&lt;/script&gt;');
var exerciseStorageSource = quizIndex + '\n' + quizSource;
var themeStorageKeys = Array.from(exerciseStorageSource.matchAll(/(?:window|root)\.localStorage\.(?:getItem|setItem)\(\s*['"]([^'"]+)['"]/g), function (match) {
  return match[1];
});
assert.deepStrictEqual(themeStorageKeys, ['cuda-docs-theme', 'cuda-docs-theme']);
assert.strictEqual((exerciseStorageSource.match(/\blocalStorage\b/g) || []).length, themeStorageKeys.length);
assert.strictEqual(/\b(?:sessionStorage|indexedDB|document\.cookie|serviceWorker|sendBeacon)\b/i.test(exerciseStorageSource), false);
assert.ok(/data-question-id="' \+ escapeHtml\(question\.id\) \+ '" tabindex="-1"/.test(quizSource));
assert.ok(/@media\s*\(max-width:\s*1180px\)/.test(quizStyle));
assert.ok(/@media\s*\(max-width:\s*900px\)/.test(quizStyle));
assert.ok(/@media\s*\(max-width:\s*680px\)/.test(quizStyle));
assert.ok(/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(quizStyle));
assert.ok(/@media\s*\(forced-colors:\s*active\)/.test(quizStyle));
assert.ok(/\.quiz-question-jumps a\s*\{[\s\S]*?min-height:\s*44px/.test(quizStyle));

var markdownSections = new Set(Array.from(sourceMarkdown.matchAll(/^#{2,6}\s+(\d+(?:\.\d+)+)\.?\s+/gm), function (match) {
  return match[1];
}));
bank.sets.forEach(function (quizSet) {
  quizSet.questions.forEach(function (question) {
    var section = question.articleRoute.replace(/^\.\.\/#section-/, '').replace(/-/g, '.');
    assert.ok(markdownSections.has(section), question.id + ' must link to an existing translated section');
  });
});

var ctaChapters = ['1.1', '1.2', '1.3'];
ctaChapters.forEach(function (chapter, index) {
  var cta = docs.getExerciseCta(chapter);
  assert.ok(cta);
  assert.strictEqual(cta.href, './exercises/#quiz-' + chapter.replace('.', '-'));
  assert.strictEqual(cta.questionCount, [6, 10, 8][index]);
});
['2.1', '3.1', '4.20', '5.8', '6.3'].forEach(function (chapter) {
  assert.strictEqual(docs.getExerciseCta(chapter), null);
  assert.strictEqual(docs.renderExerciseCta(chapter), '');
});

console.log('cuda-exercises.test.js: all exercise contract tests passed');
