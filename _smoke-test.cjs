// 本地功能烟雾检查。运行：node _smoke-test.cjs
const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');

const store = new Map();
const root = { innerHTML: '' };
const handlers = {};
let selectedUnit = '';
const document = {
  getElementById: (id) => id === 'app' ? root : null,
  querySelector: (selector) => selector.startsWith('[data-exam-unit=') ? { value: selectedUnit } : null,
  addEventListener: (eventName, handler) => { handlers[eventName] = handler; }
};
const window = { scrollTo: () => {}, scrollY: 0 };
const localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value)
};
const context = vm.createContext({
  window, document, localStorage,
  setTimeout: () => 1, clearTimeout: () => {},
  console
});
for (const filename of ['data.js', 'data-pep-2024.js', 'data-grade3-6.js', 'data-exams.js', 'data-question-expansion.js']) {
  vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
}
const data = window.LEARNING_DATA;
const lessons = data.lessons;
assert.equal(data.textbookBooks.length, 32);
assert.equal(lessons.length, 1058);
assert.equal(data.openGrades.join(','), '1,2', '当前应仅开放一、二年级');
assert(data.extraQuestionCount > 5000, '扩充题库未加载');
assert.equal(new Set(lessons.map(l => l.id)).size, lessons.length);
assert(data.grades.every(g => g.extensionSubjects.length === 0));
const expandedIds = new Set();
const expandedPrompts = new Set();
for (const q of data.examQuestions) {
  assert(q.options.length === 4 && new Set(q.options).size === 4, '题目选项重复或缺失：' + q.id);
  assert(q.answer >= 0 && q.answer < 4, '正确答案下标错误：' + q.id);
  assert(!expandedIds.has(q.id), '题目 ID 重复：' + q.id);
  expandedIds.add(q.id);
  const identity = [q.grade, q.semester, q.subject, q.unit, q.prompt].join('|');
  assert(!expandedPrompts.has(identity), '相同单元题干重复：' + q.id);
  expandedPrompts.add(identity);
}
for (const lesson of lessons) {
  assert(lesson.textbook && lesson.edition && lesson.sourceUrl, '教材信息缺失：' + lesson.id);
  assert([1, 2].includes(lesson.semester), '学期错误：' + lesson.id);
  assert(lesson.review.length > 0 && Array.isArray(lesson.questions), '学习内容缺失：' + lesson.id);
  for (const q of lesson.questions) {
    assert(q.length === 4 && q[1].length === 4 && Number.isInteger(q[2]) && q[2] >= 0 && q[2] < 4, '错误试题：' + lesson.id);
  }
}

function click(dataset = {}) {
  const target = {
    dataset,
    matches: (selector) => selector === '[data-overlay]' && Boolean(dataset.overlay),
    closest: (selector) => {
      const match = /^\[data-([a-z-]+)\]$/.exec(selector);
      if (!match) return null;
      const key = match[1].replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      return Object.hasOwn(dataset, key) ? target : null;
    }
  };
  handlers.click({ target });
}
function saved() {
  return JSON.parse(store.get('xingya-grade2-learning-v1') || '{}');
}
function expect(value, description) {
  assert(root.innerHTML.includes(value), description + ': ' + value);
}
function completeExam(kind, subject, unit) {
  const before = (saved().tests || []).length;
  if (kind === 'unit') {
    selectedUnit = unit;
    click({ action: 'start-unit-exam', subject });
  } else {
    click({ action: 'start-quiz', kind, id: subject });
  }
  expect('data-action="confirm-answer"', '考试未开启：' + kind);
  let iterations = 0;
  while ((saved().tests || []).length === before && iterations < 45) {
    click({ option: 0 });
    click({ action: 'confirm-answer' });
    iterations++;
  }
  assert.equal((saved().tests || []).length, before + 1, '考试无法提交：' + kind);
  const score = saved().tests[0];
  assert.equal(score.kind, kind);
  assert.equal(score.total, { unit: 10, midterm: 20, final: 30 }[kind],
    `阶段考试没有固定题数：${score.grade}年级${score.semester}学期 ${subject} ${kind} ${unit || ''}`);
  assert.equal(score.questionIds.length, score.total, '考试题号没有保存');
  assert.equal(new Set(score.questionIds).size, score.total, '考试内部出现重复题号');
  assert(score.score >= 0 && score.score <= 100);
  expect('data-action="retry-quiz"', '成绩详情未显示');
}

// 模拟旧版本停留在五年级的用户，降级到已开放年级后仍须保留历史数据。
const archivedLesson = lessons.find(l => l.grade === 5 && l.semester === 2);
const archive = {
  grade: 5, semester: 2, semestersByGrade: { 5: 2 },
  previewDone: [archivedLesson.id], reviewDone: [],
  tests: [{ grade: 5, semester: 2, kind: 'unit', title: '五年级历史测试', correct: 1, total: 10 }],
  activities: [{ grade: 5, semester: 2, title: '五年级历史活动' }],
  mistakes: { 'historical-question': 1 },
  stars: 7, starsByGrade: { 5: 7 }, starsBySemester: { 5: { 2: 7 } }
};
store.set('xingya-grade2-learning-v1', JSON.stringify(archive));
vm.runInContext(fs.readFileSync('app.js', 'utf8'), context, { filename: 'app.js' });
expect('学习总览', '首页渲染');
expect('二年级', '历史高年级用户未回到已开放年级');
click({ grade: 2 });
assert.equal(saved().grade, 2, '恢复的年级未写入本地存储');
assert(saved().previewDone.includes(archivedLesson.id), '历史高年级预习记录丢失');
assert.equal(saved().tests[0].title, '五年级历史测试', '历史高年级成绩丢失');
assert.equal(saved().activities[0].title, '五年级历史活动', '历史高年级活动丢失');
assert.equal(saved().mistakes['historical-question'], 1, '历史高年级错题丢失');
assert.equal(saved().starsBySemester[5][2], 7, '历史高年级星星丢失');
click({ action: 'grade-picker' });
for (let lockedGrade = 3; lockedGrade <= 6; lockedGrade++) {
  assert(new RegExp(`class="grade-option[^"]*is-locked" data-grade="${lockedGrade}" disabled`).test(root.innerHTML),
    `${lockedGrade}年级的学习入口未锁定`);
  click({ grade: lockedGrade });
  assert.equal(saved().grade, 2, '锁定年级被模拟点击切换：' + lockedGrade);
}
click({ nav: 'catalog' });
for (let lockedGrade = 3; lockedGrade <= 6; lockedGrade++) {
  assert(new RegExp(`class="catalog-grade-choice[^"]*is-locked" data-catalog-grade="${lockedGrade}"[^>]*disabled`).test(root.innerHTML),
    `${lockedGrade}年级目录入口未锁定`);
  click({ catalogGrade: lockedGrade });
  assert(!root.innerHTML.includes(`data-catalog-open="${archivedLesson.id}"`), '目录泄露锁定年级课程');
}
click({ catalogOpen: archivedLesson.id });
assert(!root.innerHTML.includes('核心知识讲解'), '锁定年级课程详情可通过点击打开');
let semestersChecked = 0;
let examsChecked = 0;
for (let grade = 1; grade <= 2; grade++) {
  click({ grade });
  for (let semester = 1; semester <= 2; semester++) {
    click({ semester });
    assert.equal(saved().grade, grade);
    assert.equal(saved().semester, semester);
    const expectedSubjects = ['chinese', 'math'];
    const active = lessons.filter(l => l.grade === grade && l.semester === semester);
    for (const subject of expectedSubjects) {
      assert(active.some(l => l.subject === subject), '主学科缺失：' + grade + ',' + semester + ',' + subject);
      assert(data.textbookBooks.some(b => b.grade === grade && b.semester === semester && b.subject === subject));
    }
    const first = active.find(l => l.subject === 'chinese');
    click({ nav: 'catalog' });
    expect('课程目录', '目录页');
    click({ catalogGrade: grade });
    click({ catalogSemester: semester });
    click({ catalogOpen: first.id });
    expect('核心知识讲解', '课程详情');
    expect(first.title, '课程标题');
    click({ action: 'catalog-toggle-answers' });
    expect('参考答案', '查看答案');
    click({ action: 'catalog-back' });
    click({ nav: 'preview' });
    click({ openLesson: first.id, mode: 'preview' });
    expect(first.title, '预习页');
    click({ action: 'next-step' });
    click({ action: 'next-step' });
    click({ action: 'finish-preview', lesson: first.id });
    assert(saved().previewDone.includes(first.id), '预习未保存');
    click({ nav: 'review' });
    click({ openLesson: first.id, mode: 'review' });
    for (let index = 0; index < first.review.length; index++) click({ flip: index });
    click({ action: 'finish-review', lesson: first.id });
    assert(saved().reviewDone.includes(first.id), '复习未保存');
    click({ nav: 'quiz' });
    expect('单元 · 期中 · 期末测试', '考试入口');
    assert(!root.innerHTML.includes('data-exam-count'), '仍然显示选择题数的控件');
    for (const subject of expectedSubjects) {
      click({ nav: 'quiz' });
      const candidate = active.find(l => l.subject === subject &&
        /^(第[一二三四五六七八九十]+单元|[一二三四五六七八九十]+\s*[·、．]|Unit\s+[1-9]\d*\b)/i.test(l.unit) &&
        !/复习与关联|整理和复习|总复习/.test(l.unit));
      assert(candidate, '无学科正式单元：' + grade + ',' + semester + ',' + subject);
      for (const kind of ['unit', 'midterm', 'final']) {
        completeExam(kind, subject, candidate.unit);
        examsChecked++;
      }
    }
    semestersChecked++;
  }
}
// 固定题数，同一个范围再次开考仍然从题池随机抽题并尽量避免近期重复。
click({ grade: 2 });
click({ semester: 2 });
click({ nav: 'quiz' });
const targetMathLesson = lessons.find(l => l.grade === 2 && l.semester === 2 && l.subject === 'math' &&
  /^(第[一二三四五六七八九十]+单元|[一二三四五六七八九十]+\s*[·、．]|Unit\s+[1-9]\d*\b)/i.test(l.unit) &&
  !/复习与关联|整理和复习|总复习/.test(l.unit));
assert(targetMathLesson, '找不到二年级下学期正式数学单元');
const targetUnit = targetMathLesson.unit;
const examCountBefore = examsChecked;
for (const kind of ['unit', 'unit', 'midterm', 'final']) {
  click({ nav: 'quiz' });
  completeExam(kind, 'math', targetUnit);
  examsChecked++;
}
const lastFour = saved().tests.slice(0, 4);
const firstUnit = lastFour[2];
const secondUnit = lastFour[3];
assert.equal(firstUnit.kind, 'unit');
assert.equal(secondUnit.kind, 'unit');
assert.equal(firstUnit.questionIds.filter(id => secondUnit.questionIds.includes(id)).length, 0,
  '相邻两次单元考试没有优先避开已经考过的题');
assert.equal(examsChecked - examCountBefore, 4);
assert.equal(semestersChecked, 4);
assert.equal(examsChecked, 28);
console.log(JSON.stringify({
  passed: true, books: data.textbookBooks.length, lessons: lessons.length, extraQuestions: data.extraQuestionCount,
  semestersChecked, examsChecked, storedExams: (saved().tests || []).length
}));
