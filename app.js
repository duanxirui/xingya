(function () {
  'use strict';

  const DATA = window.LEARNING_DATA;
  const LESSONS = DATA.lessons;
  const SUBJECTS = DATA.subjects;
  const GRADES = DATA.grades;
  const SEMESTERS = DATA.semesters;
  // 沿用二年级旧版的存储键，更新后已有学习记录不会丢失。
  const STORAGE_KEY = 'xingya-grade2-learning-v1';
  const SUBJECT_MAP = Object.fromEntries(SUBJECTS.map(item => [item.id, item]));
  const LESSON_MAP = Object.fromEntries(LESSONS.map(item => [item.id, item]));
  const LESSON_QUESTION_BANK = LESSONS.flatMap(lesson => lesson.questions.map((question, index) => ({
    id: `${lesson.id}-${index}`,
    grade: lesson.grade,
    semester: lesson.semester,
    lessonId: lesson.id,
    subject: lesson.subject,
    unit: lesson.unit,
    lessonTitle: lesson.title,
    prompt: question[0],
    options: question[1],
    answer: question[2],
    explanation: question[3]
  })));
  const QUESTION_BANK = [...LESSON_QUESTION_BANK, ...(DATA.examQuestions || [])];
  const QUESTION_MAP = Object.fromEntries(QUESTION_BANK.map(item => [item.id, item]));
  const SUPPLEMENTAL_BY_LESSON = new Map();
  (DATA.examQuestions || []).forEach(question => {
    if (!question.lessonId || !LESSON_MAP[question.lessonId]) return;
    if (!SUPPLEMENTAL_BY_LESSON.has(question.lessonId)) SUPPLEMENTAL_BY_LESSON.set(question.lessonId, []);
    SUPPLEMENTAL_BY_LESSON.get(question.lessonId).push(
      [question.prompt, question.options, question.answer, question.explanation]);
  });

  function lessonQuestions(lesson) {
    return [...lesson.questions, ...(SUPPLEMENTAL_BY_LESSON.get(lesson.id) || [])];
  }

  function lessonsForGrade(grade) {
    return LESSONS.filter(lesson => lesson.grade === grade);
  }

  function lessonsForSemester(grade, semester) {
    return LESSONS.filter(lesson => lesson.grade === grade && lesson.semester === semester);
  }

  function semesterIsAvailable(grade, semester) {
    return gradeIsAvailable(grade) && lessonsForSemester(grade, semester).length > 0;
  }

  function semesterName(semester) {
    return SEMESTERS.find(item => item.id === semester)?.name || '上学期';
  }

  function gradeIsAvailable(grade) {
    return Array.isArray(DATA.openGrades) && DATA.openGrades.includes(grade) && lessonsForGrade(grade).length > 0;
  }

  function gradeName(grade) {
    return (GRADES.find(item => item.id === grade) || GRADES[1]).name;
  }

  function gradeConfig(grade) {
    return GRADES.find(item => item.id === grade);
  }

  function gradeSubjectNames(grade, role) {
    const config = gradeConfig(grade);
    const ids = config && Array.isArray(config[role]) ? config[role] : [];
    return ids.map(id => SUBJECT_MAP[id]?.name).filter(Boolean).join('、');
  }

  function subjectRole(subjectId, grade) {
    const config = gradeConfig(grade);
    return config && Array.isArray(config.mainSubjects) && config.mainSubjects.includes(subjectId) ? 'main' : 'none';
  }

  // 老数据未记录学期。按可识别的课程 ID 或课程名称归属；无法判断的综合测试归上学期。
  function recordSemester(record) {
    if (Number(record.semester) === 1 || Number(record.semester) === 2) return Number(record.semester);
    const matchedById = LESSON_MAP[record.sourceId];
    if (matchedById) return matchedById.semester;
    const grade = Number(record.grade) || 2;
    if (typeof record.title === 'string') {
      const matched = lessonsForGrade(grade).find(lesson =>
        record.title.endsWith(` · ${lesson.title}`) || record.title.includes(` · ${lesson.title}小测`));
      if (matched) return matched.semester;
    }
    return 1;
  }

  function migrateSemesterStars(saved, gradeStars) {
    if (saved.starsBySemester && typeof saved.starsBySemester === 'object' && !Array.isArray(saved.starsBySemester)) {
      return saved.starsBySemester;
    }
    const result = {};
    for (const grade of GRADES) {
      const lowerLessons = lessonsForSemester(grade.id, 2);
      const lowerDone = lowerLessons.reduce((sum, lesson) => sum +
        (saved.previewDone?.includes(lesson.id) ? 2 : 0) +
        (saved.reviewDone?.includes(lesson.id) ? 3 : 0), 0);
      const lowerTests = (Array.isArray(saved.tests) ? saved.tests : [])
        .filter(test => (Number(test.grade) || 2) === grade.id && recordSemester(test) === 2)
        .reduce((sum, test) => sum + (Number(test.correct) || 0) * 2, 0);
      const total = Math.max(0, Number(gradeStars[grade.id]) || 0);
      const lower = Math.min(total, lowerDone + lowerTests);
      result[grade.id] = { 1: total - lower, 2: lower };
    }
    return result;
  }

  function loadState() {
    const fallback = { name: '小星', grade: 2, semester: 1, semestersByGrade: {}, previewDone: [], reviewDone: [], tests: [], mistakes: {}, activities: [], stars: 0, starsByGrade: { 1: 0, 2: 0 }, starsBySemester: {} };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const historicalStars = Number.isFinite(saved.stars) ? saved.stars : 0;
      // 旧版只有总星星数，全部属于二年级；新版分年级累加，历史记录不丢失。
      const savedStars = saved.starsByGrade && typeof saved.starsByGrade === 'object' && !Array.isArray(saved.starsByGrade)
        ? saved.starsByGrade : { 2: historicalStars };
      const grade = gradeIsAvailable(Number(saved.grade)) ? Number(saved.grade) : fallback.grade;
      const semestersByGrade = saved.semestersByGrade && typeof saved.semestersByGrade === 'object' && !Array.isArray(saved.semestersByGrade)
        ? saved.semestersByGrade : {};
      const preferred = Number(semestersByGrade[grade] || saved.semester || 1);
      const semester = semesterIsAvailable(grade, preferred) ? preferred :
        (SEMESTERS.find(item => semesterIsAvailable(grade, item.id))?.id || 1);
      semestersByGrade[grade] = semester;
      return {
        name: typeof saved.name === 'string' && saved.name.trim() ? saved.name.slice(0, 12) : fallback.name,
        grade, semester, semestersByGrade,
        previewDone: Array.isArray(saved.previewDone) ? saved.previewDone : [],
        reviewDone: Array.isArray(saved.reviewDone) ? saved.reviewDone : [],
        tests: Array.isArray(saved.tests) ? saved.tests : [],
        mistakes: saved.mistakes && typeof saved.mistakes === 'object' && !Array.isArray(saved.mistakes) ? saved.mistakes : {},
        activities: Array.isArray(saved.activities) ? saved.activities : [],
        stars: historicalStars,
        starsByGrade: savedStars,
        starsBySemester: migrateSemesterStars(saved, savedStars)
      };
    } catch (_) { return fallback; }
  }

  const state = loadState();

  function currentLessons() {
    return semesterIsAvailable(state.grade, state.semester) ? lessonsForSemester(state.grade, state.semester) : [];
  }

  function currentSubjects(role = 'all') {
    const available = new Set(currentLessons().map(lesson => lesson.subject));
    const config = gradeConfig(state.grade);
    const planned = [...(config.mainSubjects || [])];
    const orderedIds = [...new Set([...planned, ...SUBJECTS.map(subject => subject.id)])];
    return orderedIds
      .filter(id => available.has(id) && SUBJECT_MAP[id] &&
        subjectRole(id, state.grade) === 'main' && (role === 'all' || role === 'main'))
      .map(id => SUBJECT_MAP[id]);
  }

  function currentTests() {
    // 旧版本没有 grade 字段，全部是二年级记录。
    return state.tests.filter(test => (Number(test.grade) || 2) === state.grade && recordSemester(test) === state.semester);
  }

  function currentActivities() {
    return state.activities.filter(event => (Number(event.grade) || 2) === state.grade && recordSemester(event) === state.semester);
  }

  function currentStars() {
    return Number(state.starsBySemester?.[state.grade]?.[state.semester]) || 0;
  }

  const ui = {
    page: 'dashboard', subject: 'all', search: '', detail: null, step: 0,
    reveal: false, flipped: new Set(), showingBack: new Set(), quiz: null, result: null,
    mistakeExpanded: new Set(), profileOpen: false, reminderOpen: false, gradeOpen: false,
    catalog: { grade: state.grade, semester: state.semester, subject: 'all', lessonId: null, query: '', answersVisible: false },
    menuOpen: false, toast: '', toastTimer: null
  };

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (_) { notify('浏览器未允许本地保存，请检查隐私设置。'); }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function icon(name, size = 20) {
    const paths = {
      home: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
      book: '<path d="M12 7v14M3 18V5a2 2 0 0 1 2-2h4a3 3 0 0 1 3 3 3 3 0 0 1 3-3h4a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-4a3 3 0 0 0-3 1 3 3 0 0 0-3-1H5a2 2 0 0 1-2-2Z"/>',
      layers: '<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M7 21h10M8 8h8M8 12h5"/>',
      quiz: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3.5h6M9 11l2 2 4-4M9 17h6"/>',
      mistakes: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5h.01"/>',
      chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20V7M2 20h22"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
      right: '<path d="m9 18 6-6-6-6"/>',
      left: '<path d="m15 18-6-6 6-6"/>',
      arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      circleCheck: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
      sparkles: '<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3ZM20 17l.7 2.3L23 20l-2.3.7L20 23l-.7-2.3L17 20l2.3-.7L20 17Z"/>',
      target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
      star: '<path d="m12 2 3.1 6.3 7 1-5.1 5 .9 7-5.9-3.3-6 3.3 1.1-7-5.1-5 7-1L12 2Z"/>',
      award: '<circle cx="12" cy="8" r="5"/><path d="m8 12-2 10 6-3 6 3-2-10"/>',
      close: '<path d="M18 6 6 18M6 6l12 12"/>',
      volume: '<path d="M11 5 6 9H3v6h3l5 4V5ZM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>',
      rotate: '<path d="M3 11a9 9 0 1 1 3 7M3 4v7h7"/>',
      bulb: '<path d="M9 18h6m-5 3h4M8 15c-1.4-1-2.5-2.6-2.5-5A6.5 6.5 0 0 1 12 3.5 6.5 6.5 0 0 1 18.5 10c0 2.4-1.1 4-2.5 5l-1 2H9l-1-2Z"/>',
      menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
      edit: '<path d="M12 20h9M4 17.5V20h2.5L18.7 7.8l-2.5-2.5L4 17.5ZM14.8 6.7l2.5 2.5"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
      help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.1 1.9C12.4 12 12 12.3 12 14M12 17h.01"/>',
      trophy: '<path d="M8 3h8v8a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4M16 5h4v3a4 4 0 0 1-4 4M12 15v4M8 21h8M8 19h8"/>',
      fire: '<path d="M12 22a8 8 0 0 0 8-8c0-3.5-2.2-5.5-4-7 0 3-2 4-2 4-1-4-4-7-6-9 0 4-4 7-4 12a8 8 0 0 0 8 8Z"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
      chevronDown: '<path d="m6 9 6 6 6-6"/>'
    };
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.star}</svg>`;
  }

  function getDateKey(value = new Date()) {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function dateLabel(value, short = false) {
    const date = new Date(value);
    return date.toLocaleDateString('zh-CN', short ? { month: 'numeric', day: 'numeric' } : { month: 'long', day: 'numeric', weekday: 'long' });
  }

  function activity(kind, subject, title) {
    state.activities.unshift({ grade: state.grade, semester: state.semester, kind, subject, title, at: new Date().toISOString() });
    state.activities = state.activities.slice(0, 300);
  }

  function progressForSubject(id) {
    const lessons = currentLessons().filter(l => l.subject === id);
    const previews = lessons.filter(l => state.previewDone.includes(l.id)).length;
    const reviews = lessons.filter(l => state.reviewDone.includes(l.id)).length;
    return { lessons, previews, reviews, percent: lessons.length ? Math.round((previews + reviews) / (lessons.length * 2) * 100) : 0 };
  }

  function todayCounts() {
    const today = getDateKey();
    const events = currentActivities().filter(a => getDateKey(a.at) === today);
    return {
      preview: events.filter(a => a.kind === 'preview').length,
      review: events.filter(a => a.kind === 'review').length,
      test: events.filter(a => a.kind === 'test').length
    };
  }

  function weekData() {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - (6 - i));
      const key = getDateKey(date);
      return {
        key,
        day: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
        count: currentActivities().filter(a => getDateKey(a.at) === key).length,
        isToday: i === 6
      };
    });
  }

  function streak() {
    const days = new Set(currentActivities().map(a => getDateKey(a.at)));
    let date = new Date();
    date.setHours(12, 0, 0, 0);
    if (!days.has(getDateKey(date))) date.setDate(date.getDate() - 1);
    let count = 0;
    while (days.has(getDateKey(date))) {
      count++;
      date.setDate(date.getDate() - 1);
    }
    return count;
  }

  function notify(message) {
    ui.toast = message;
    const el = document.querySelector('#toast');
    if (el) { el.textContent = message; el.classList.add('is-visible'); }
    clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(() => {
      ui.toast = '';
      const toastEl = document.querySelector('#toast');
      if (toastEl) toastEl.classList.remove('is-visible');
    }, 3000);
  }

  function nav(page) {
    if (page === 'catalog' && ui.page !== 'catalog') {
      ui.catalog.grade = state.grade;
      ui.catalog.semester = state.semester;
      ui.catalog.subject = 'all';
      ui.catalog.lessonId = null;
      ui.catalog.query = '';
      ui.catalog.answersVisible = false;
    }
    ui.page = page;
    ui.detail = null;
    ui.quiz = null;
    ui.result = null;
    ui.menuOpen = false;
    ui.profileOpen = false;
    ui.reminderOpen = false;
    ui.gradeOpen = false;
    if (page !== 'preview' && page !== 'review') ui.search = '';
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function switchGrade(grade) {
    if (!gradeIsAvailable(grade)) return;
    state.grade = grade;
    const preferred = Number(state.semestersByGrade[grade]) || 1;
    state.semester = semesterIsAvailable(grade, preferred) ? preferred :
      (SEMESTERS.find(item => semesterIsAvailable(grade, item.id))?.id || 1);
    state.semestersByGrade[grade] = state.semester;
    ui.subject = 'all';
    ui.search = '';
    ui.mistakeExpanded = new Set();
    saveState();
    nav('dashboard');
    notify(`已切换到${gradeName(grade)}${semesterName(state.semester)}！`);
  }

  function switchSemester(semester) {
    if (!semesterIsAvailable(state.grade, semester)) {
      notify(`${gradeName(state.grade)}${semesterName(semester)}课程尚未开放。`);
      return;
    }
    state.semester = semester;
    state.semestersByGrade[state.grade] = semester;
    ui.subject = 'all';
    ui.search = '';
    ui.mistakeExpanded = new Set();
    saveState();
    nav('dashboard');
    notify(`已经进入${gradeName(state.grade)}${semesterName(semester)}！`);
  }

  function openLesson(mode, id) {
    if (!semesterIsAvailable(state.grade, state.semester) || !LESSON_MAP[id] || LESSON_MAP[id].grade !== state.grade || LESSON_MAP[id].semester !== state.semester) return;
    ui.page = mode;
    ui.detail = { mode, id };
    ui.quiz = null;
    ui.result = null;
    ui.step = 0;
    ui.reveal = false;
    ui.flipped = new Set();
    ui.showingBack = new Set();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function markLesson(kind, id) {
    const lesson = LESSON_MAP[id];
    const list = kind === 'preview' ? state.previewDone : state.reviewDone;
    if (!semesterIsAvailable(state.grade, state.semester) || !lesson || lesson.grade !== state.grade || lesson.semester !== state.semester || list.includes(id)) return;
    list.push(id);
    const gained = kind === 'preview' ? 2 : 3;
    state.stars += gained;
    state.starsByGrade[state.grade] = (Number(state.starsByGrade[state.grade]) || 0) + gained;
    if (!state.starsBySemester[state.grade]) state.starsBySemester[state.grade] = {};
    state.starsBySemester[state.grade][state.semester] = currentStars() + gained;
    activity(kind, lesson.subject, `${kind === 'preview' ? '完成预习' : '完成复习'} · ${lesson.title}`);
    saveState();
    render();
    notify(kind === 'preview' ? '预习完成！收获 2 颗星星 ⭐' : '复习完成！收获 3 颗星星 ⭐');
  }

  function nextTask(subjectId) {
    const lessons = currentLessons().filter(l => l.subject === subjectId);
    const needPreview = lessons.find(l => !state.previewDone.includes(l.id));
    if (needPreview) return { kind: 'preview', lesson: needPreview, text: '去预习', detail: '课前预习' };
    const needReview = lessons.find(l => !state.reviewDone.includes(l.id));
    if (needReview) return { kind: 'review', lesson: needReview, text: '去复习', detail: '课后复习' };
    return { kind: 'quiz', lesson: null, text: '去挑战', detail: '巩固测试' };
  }

  const EXAM_LENGTHS = { unit: 10, midterm: 20, final: 30 };

  function isExam(kind) {
    return Object.prototype.hasOwnProperty.call(EXAM_LENGTHS, kind);
  }

  function examUnits(subjectId) {
    const units = [...new Set(currentLessons()
      .filter(lesson => lesson.subject === subjectId && lesson.textbook !== false)
      .map(lesson => lesson.unit))];
    // 只选正式编号单元：排除“我上学了”、实践活动及学期末“复习与关联”。
    const formal = units.filter(unit =>
      /^(第[一二三四五六七八九十]+单元|[一二三四五六七八九十]+\s*[·、．]|Unit\s+[1-9]\d*\b)/i.test(unit) &&
      !/复习与关联|整理和复习|总复习/.test(unit));
    return formal.length ? formal : units.filter(unit => !/复习与关联|整理和复习|总复习|Revision|Recycle/.test(unit));
  }

  function examUnitPool(subjectId, unit) {
    return QUESTION_BANK.filter(question => question.grade === state.grade &&
      question.semester === state.semester && question.subject === subjectId && question.unit === unit);
  }

  function examScope(kind, id) {
    if (!isExam(kind)) return null;
    let subjectId = id;
    let unit = null;
    if (kind === 'unit') {
      const separator = id.indexOf('::');
      if (separator === -1) return null;
      subjectId = id.slice(0, separator);
      unit = id.slice(separator + 2);
    }
    if (!currentSubjects('main').some(subject => subject.id === subjectId)) return null;
    const available = examUnits(subjectId);
    if (kind === 'unit' && !available.includes(unit)) return null;
    const midpoint = Math.ceil(available.length / 2);
    const units = kind === 'unit' ? [unit] : kind === 'midterm' ? available.slice(0, midpoint) : available;
    const subjectName = SUBJECT_MAP[subjectId].name;
    const label = kind === 'unit' ? `${subjectName} · ${unit} · 单元测试`
      : `${subjectName} · ${kind === 'midterm' ? '期中测试' : '期末测试'}`;
    return { subjectId, units, label };
  }

  function shuffleQuestions(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function makeExamPaper(scope, kind) {
    // 优先使用近期同学科考试未出现的题目；题数不足时再复用已见过的题。
    const recent = new Set(currentTests()
      .filter(test => isExam(test.kind) && test.subjectId === scope.subjectId)
      .slice(0, 3)
      .flatMap(test => Array.isArray(test.questionIds) ? test.questionIds : []));
    const groups = shuffleQuestions(scope.units).map(unit => {
      const pool = examUnitPool(scope.subjectId, unit);
      return {
        fresh: shuffleQuestions(pool.filter(question => !recent.has(question.id))),
        older: shuffleQuestions(pool.filter(question => recent.has(question.id)))
      };
    });
    const selected = [];
    const prompts = new Set();
    const limit = EXAM_LENGTHS[kind];
    // 各单元轮流抽取，降低整张试卷偏向个别单元的机会。
    for (const bucket of ['fresh', 'older']) {
      while (selected.length < limit && groups.some(group => group[bucket].length)) {
        let advanced = false;
        for (const group of groups) {
          let candidate;
          while (group[bucket].length && !candidate) {
            const next = group[bucket].pop();
            if (!prompts.has(next.prompt)) candidate = next;
          }
          if (candidate) {
            selected.push(candidate);
            prompts.add(candidate.prompt);
            advanced = true;
          }
          if (selected.length === limit) break;
        }
        if (!advanced) break;
      }
    }
    return selected;
  }

  function startQuiz(kind, id = '') {
    if (!semesterIsAvailable(state.grade, state.semester)) return;
    const exam = examScope(kind, id);
    if (isExam(kind) && !exam) { notify('该年级、学期或学科暂无可用的考试范围。'); return; }
    let pool = QUESTION_BANK.filter(question => question.grade === state.grade && question.semester === state.semester);
    let label = '主学科综合挑战';
    if (exam) {
      pool = makeExamPaper(exam, kind);
      label = exam.label;
    } else if (kind === 'subject') {
      pool = pool.filter(q => q.subject === id);
      label = `${SUBJECT_MAP[id] ? SUBJECT_MAP[id].name : '学科'}专项挑战`;
    } else if (kind === 'lesson') {
      pool = pool.filter(q => q.lessonId === id);
      label = `${LESSON_MAP[id] ? LESSON_MAP[id].title : '本课'}小测`;
    } else if (kind === 'mistakes') {
      pool = pool.filter(q => state.mistakes[q.id]);
      label = '错题巩固练习';
    } else if (kind === 'mixed') {
      pool = pool.filter(q => subjectRole(q.subject, state.grade) === 'main');
    }
    if (!pool.length) { notify('当前没有可以练习的题目。'); return; }
    ui.quiz = {
      kind, id, label,
      subjectId: exam?.subjectId || null,
      units: exam?.units || [],
      questions: exam ? pool : shuffleQuestions(pool).slice(0, Math.min(5, pool.length)),
      index: 0, selected: null, checked: false, answers: []
    };
    ui.page = 'quiz';
    ui.result = null;
    ui.detail = null;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function confirmAnswer() {
    const quiz = ui.quiz;
    if (!quiz || quiz.checked) return;
    if (quiz.selected == null) { notify('先选择一个答案吧～'); return; }
    const question = quiz.questions[quiz.index];
    if (isExam(quiz.kind)) {
      // 正式考试逐题提交，答完统一批改，不提前透露正确选项。
      quiz.answers.push({ id: question.id, selected: quiz.selected, correct: quiz.selected === question.answer });
      if (quiz.index === quiz.questions.length - 1) finishQuiz();
      else { quiz.index++; quiz.selected = null; render(); }
      return;
    }
    quiz.checked = true;
    quiz.answers.push({ id: question.id, selected: quiz.selected, correct: quiz.selected === question.answer });
    render();
  }

  function finishQuiz() {
    const quiz = ui.quiz;
    if (!quiz) return;
    const correct = quiz.answers.filter(a => a.correct).length;
    const total = quiz.questions.length;
    const attempt = {
      id: String(Date.now()), at: new Date().toISOString(),
      grade: state.grade, semester: state.semester,
      kind: quiz.kind, sourceId: quiz.id, label: quiz.label,
      subjectId: quiz.subjectId,
      units: quiz.units,
      correct, total, score: Math.round(correct / total * 100),
      questionIds: quiz.questions.map(question => question.id)
    };
    quiz.answers.forEach(answer => {
      if (answer.correct) delete state.mistakes[answer.id];
      else {
        const previous = state.mistakes[answer.id] || { count: 0 };
        state.mistakes[answer.id] = {
          count: previous.count + 1,
          selected: answer.selected,
          at: attempt.at
        };
      }
    });
    state.tests.unshift(attempt);
    state.tests = state.tests.slice(0, 100);
    state.stars += correct * 2;
    state.starsByGrade[state.grade] = (Number(state.starsByGrade[state.grade]) || 0) + correct * 2;
    if (!state.starsBySemester[state.grade]) state.starsBySemester[state.grade] = {};
    state.starsBySemester[state.grade][state.semester] = currentStars() + correct * 2;
    activity('test', quiz.subjectId || (quiz.kind === 'subject' ? quiz.id : 'all'), `完成测试 · ${quiz.label}（${attempt.score}分）`);
    saveState();
    ui.result = { ...attempt, answers: quiz.answers, questions: quiz.questions };
    ui.quiz = null;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function mascot() {
    return `<svg class="hero-illustration" viewBox="0 0 440 290" role="img" aria-label="快乐的小星星坐在书本上学习">
      <defs><linearGradient id="bookA" x1="0" x2="1"><stop stop-color="#FFF8C6"/><stop offset="1" stop-color="#FFE48F"/></linearGradient><linearGradient id="planetA" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFCE75"/><stop offset="1" stop-color="#FF9F79"/></linearGradient></defs>
      <circle cx="228" cy="144" r="117" fill="#ffffff" opacity=".11"/><circle cx="228" cy="144" r="91" fill="#ffffff" opacity=".08"/>
      <path d="M90 73l6 12 13 2-10 9 2 13-11-6-12 6 3-13-10-9 13-2Z" fill="#FFF1A5"/><path d="m358 30 4 8 9 1-7 7 2 9-8-4-8 4 2-9-7-7 9-1Z" fill="#FDF2AE"/><circle cx="389" cy="128" r="6" fill="#BCE6FF"/><circle cx="99" cy="178" r="4" fill="#D2C6FF"/>
      <ellipse cx="237" cy="254" rx="165" ry="19" fill="#5142A6" opacity=".24"/>
      <path d="M92 209c36-16 87-19 143 10 56-29 109-27 147-8v40c-45-19-96-20-147 6-50-27-101-24-143-6Z" fill="#F6D56D"/>
      <path d="M95 194c45-20 91-17 140 15 52-31 101-33 146-15v38c-43-19-92-17-146 12-49-31-98-30-140-12Z" fill="url(#bookA)" stroke="#FFF9D9" stroke-width="4"/>
      <path d="M235 210v34" stroke="#E8AD60" stroke-width="3"/><path d="M115 209c37-11 77-7 106 11M259 220c33-18 72-22 104-11" fill="none" stroke="#E7B778" stroke-width="3" stroke-linecap="round"/>
      <path d="M196 192 176 171l-10 5 17 28M275 192l19-21 10 6-16 27" fill="#FFBF86" stroke="#F49D75" stroke-width="3" stroke-linejoin="round"/>
      <path d="M230 48c9 0 16 28 22 42 3 8 9 11 17 12l37 6c10 2 14 14 6 22l-27 27c-5 5-7 12-6 19l7 37c2 11-7 18-17 13l-33-18c-6-3-13-3-19 0l-33 18c-10 5-19-2-17-13l7-37c1-7-1-14-6-19l-27-27c-8-8-4-20 6-22l37-6c8-1 14-4 17-12 6-14 13-42 22-42Z" fill="url(#planetA)" stroke="#FFE1AD" stroke-width="5"/>
      <path d="M202 139q9-10 18 0M246 139q9-10 18 0" fill="none" stroke="#7C4D60" stroke-width="5" stroke-linecap="round"/><path d="M217 157q19 18 36 0" fill="none" stroke="#9B5670" stroke-width="5" stroke-linecap="round"/><ellipse cx="190" cy="153" rx="11" ry="6" fill="#F58D91" opacity=".75"/><ellipse cx="277" cy="153" rx="11" ry="6" fill="#F58D91" opacity=".75"/>
      <path d="M191 109q44-13 80 1" fill="none" stroke="#FFF7E0" opacity=".65" stroke-width="5" stroke-linecap="round"/>
      <path d="M153 152q-27 0-31-17M316 153q28-4 31-18" fill="none" stroke="#FFC58F" stroke-width="13" stroke-linecap="round"/>
      <path d="M135 61q13-25 27-3M325 88q25-18 32 8" fill="none" stroke="#DBDAFF" stroke-width="5" stroke-linecap="round"/>
    </svg>`;
  }

  function logo() {
    return `<span class="logo-mark"><svg viewBox="0 0 44 44" width="30" height="30" aria-hidden="true"><path d="m22 3 5.5 11.5 12.6 1.8-9.1 8.8 2.2 12.5L22 31.7 10.8 37.6 13 25.1l-9.1-8.8 12.6-1.8Z" fill="#FFF2AE"/><circle cx="17" cy="21" r="1.5" fill="#7262B7"/><circle cx="27" cy="21" r="1.5" fill="#7262B7"/><path d="M18.5 25q3.5 3 7 0" fill="none" stroke="#7262B7" stroke-width="1.8" stroke-linecap="round"/></svg></span>`;
  }

  function navItem(page, iconName, text, extra = '') {
    return `<button class="nav-item ${ui.page === page ? 'active' : ''}" data-nav="${page}" ${extra}>
      <span class="nav-icon">${icon(iconName, 19)}</span><span>${text}</span>${ui.page === page ? '<i class="nav-active-dot"></i>' : ''}</button>`;
  }

  function renderSemesterTabs(context = 'sidebar') {
    return `<div class="semester-tabs ${context === 'modal' ? 'semester-tabs-modal' : 'semester-tabs-sidebar'}" role="group" aria-label="选择学期">
      ${SEMESTERS.map(semester => {
        const available = semesterIsAvailable(state.grade, semester.id);
        return `<button type="button" class="semester-tab ${state.semester === semester.id ? 'active' : ''}" data-semester="${semester.id}" aria-pressed="${state.semester === semester.id}" ${available ? '' : 'disabled title="本学期课程尚未开放"'}>${semester.name}${!available ? ' 🔒' : ''}</button>`;
      }).join('')}
    </div>`;
  }

  function pageTitle() {
    return ({ dashboard: '学习总览', catalog: '课程目录', preview: '课前预习', review: '课后复习', quiz: '测试与考试', mistakes: '错题本', report: '学习报告' })[ui.page];
  }

  function render() {
    const today = todayCounts();
    const totalToday = Math.min(3, Number(today.preview > 0) + Number(today.review > 0) + Number(today.test > 0));
    document.getElementById('app').innerHTML = `
      <div class="app-shell">
        <div class="mobile-shade ${ui.menuOpen ? 'visible' : ''}" data-action="close-menu"></div>
        <aside class="sidebar ${ui.menuOpen ? 'show' : ''}">
          <button class="brand" data-nav="dashboard" aria-label="返回学习总览">
            ${logo()}<span><strong>星芽学堂</strong><small>让每颗好奇心发光</small></span>
          </button>
          <button class="grade-pill" data-action="grade-picker" aria-label="切换学习年级与学期"><span class="grade-emoji">🎒</span><span>${gradeName(state.grade)}成长营</span><span class="grade-heart">${icon('chevronDown', 16)}</span></button>
          ${renderSemesterTabs()}
          <div class="nav-caption">学习空间</div>
          <nav aria-label="主导航">
            ${navItem('dashboard', 'home', '学习总览')}
            ${navItem('catalog', 'book', '课程目录')}
            ${navItem('preview', 'book', '课前预习')}
            ${navItem('review', 'layers', '课后复习')}
            ${navItem('quiz', 'quiz', '测试与考试')}
          </nav>
          <div class="nav-caption nav-caption-second">成长记录</div>
          <nav aria-label="学习记录">
            ${navItem('mistakes', 'mistakes', '我的错题本')}
            ${navItem('report', 'chart', '学习报告')}
          </nav>
          <div class="sidebar-bottom">
            <div class="sidebar-goal">
              <div class="sidebar-goal-head"><span class="goal-sun">☀️</span><span>今日小目标</span><strong>${totalToday}/3</strong></div>
              <div class="track"><span style="width:${totalToday / 3 * 100}%"></span></div>
              <p>每天学一点，收获大进步！</p>
            </div>
            <div class="sidebar-footer">Made for curious little minds <span>✳</span></div>
          </div>
        </aside>
        <main class="main-area">
          <header class="topbar">
            <div class="topbar-heading">
              <button class="icon-button mobile-menu" data-action="toggle-menu" aria-label="打开菜单">${icon('menu', 22)}</button>
              <div><div class="top-eyebrow">${escapeHtml(dateLabel(new Date()))} <span class="day-dot">●</span> 元气满满的一天</div><div class="top-location">${pageTitle()}</div></div>
            </div>
            <div class="topbar-tools">
              <label class="search-box">${icon('search', 18)}<input aria-label="搜索课程" data-search placeholder="搜索你想学的课程..." value="${escapeHtml(ui.page === 'catalog' ? ui.catalog.query : ui.search)}" /><span class="search-shortcut">↵</span></label>
              <button class="top-grade-picker" data-action="grade-picker" aria-label="当前${gradeName(state.grade)}${semesterName(state.semester)}，点击切换年级或学期">${icon('book', 16)} ${gradeName(state.grade)} · ${semesterName(state.semester)} ${icon('chevronDown', 14)}</button>
              <button class="icon-button notification-button" data-action="reminders" aria-label="学习提醒">${icon('bell', 20)}${totalToday < 3 ? '<span class="notify-dot"></span>' : ''}</button>
              <button class="profile-button" data-action="profile"><span class="avatar">${escapeHtml(state.name.charAt(0))}</span><span class="profile-label"><strong>${escapeHtml(state.name)}同学</strong><small>快乐学习中 ${icon('chevronDown', 12)}</small></span></button>
            </div>
          </header>
          <div class="content-wrap">${renderPage()}</div>
          <footer class="page-footer">星芽学堂 · 陪伴每一个小小探索家 <span>✦</span> 学习记录仅保存在当前浏览器</footer>
        </main>
      </div>
      ${ui.profileOpen ? renderProfileModal() : ''}
      ${ui.reminderOpen ? renderReminderModal(today) : ''}
      ${ui.gradeOpen ? renderGradeModal() : ''}
      <div id="toast" class="toast ${ui.toast ? 'is-visible' : ''}" role="status">${escapeHtml(ui.toast)}</div>`;
  }

  function renderPage() {
    if (ui.quiz) return renderQuizPlaying();
    if (ui.result) return renderQuizResult();
    if (ui.detail) return renderLessonDetail();
    if (ui.page === 'dashboard') return renderDashboard();
    if (ui.page === 'catalog') return renderCatalog();
    if (ui.page === 'preview' || ui.page === 'review') return renderLessonList(ui.page);
    if (ui.page === 'quiz') return renderQuizHub();
    if (ui.page === 'mistakes') return renderMistakes();
    return renderReport();
  }

  function sectionHeader(title, subtitle, button = '') {
    return `<div class="section-head"><div><h2>${title}</h2><p>${subtitle}</p></div>${button}</div>`;
  }

  function weekChart(compact = false) {
    const days = weekData();
    const max = Math.max(3, ...days.map(d => d.count));
    return `<div class="week-chart ${compact ? 'compact' : ''}">
      ${days.map(d => `<div class="week-day"><span class="bar-count">${d.count || ''}</span><div class="bar-bg"><div class="bar-fill ${d.isToday ? 'today' : ''}" style="height:${d.count ? Math.max(10, d.count / max * 100) : 4}%"></div></div><span class="week-label ${d.isToday ? 'is-today' : ''}">${d.isToday ? '今' : d.day}</span></div>`).join('')}
    </div>`;
  }

  function renderSubjectCard(subject) {
    const progress = progressForSubject(subject.id);
    return `<button class="subject-card tone-${subject.tone}" data-action="subject-course" data-id="${subject.id}">
      <div class="subject-card-top"><span class="subject-icon">${subject.emoji}</span><span class="subject-arrow">${icon('arrow', 17)}</span></div>
      <div class="subject-label">教材学科</div>
      <h3>${subject.name}</h3><p>${subject.subtitle}</p>
      <div class="subject-progress-top"><span>学习进度</span><strong>${progress.percent}%</strong></div>
      <div class="track"><span style="width:${progress.percent}%"></span></div>
    </button>`;
  }

  // 目录浏览与学习打卡分开，仅对已开放年级提供内容。
  function catalogLessons() {
    const catalog = ui.catalog;
    if (!semesterIsAvailable(catalog.grade, catalog.semester)) return [];
    const query = catalog.query.trim().toLocaleLowerCase();
    const listed = lessonsForSemester(catalog.grade, catalog.semester)
      .filter(lesson => lesson.textbook !== false && (catalog.subject === 'all' || lesson.subject === catalog.subject) &&
        (!query || [lesson.title, lesson.unit, lesson.description, SUBJECT_MAP[lesson.subject]?.name,
          ...lesson.goals].join(' ').toLocaleLowerCase().includes(query)));
    const order = [...(gradeConfig(catalog.grade)?.mainSubjects || [])];
    return listed.sort((a, b) => {
      const aOrder = order.indexOf(a.subject);
      const bOrder = order.indexOf(b.subject);
      return (aOrder < 0 ? 999 : aOrder) - (bOrder < 0 ? 999 : bOrder);
    });
  }

  function catalogSubjects() {
    if (!semesterIsAvailable(ui.catalog.grade, ui.catalog.semester)) return [];
    const config = gradeConfig(ui.catalog.grade);
    const fromGrade = [...(config?.mainSubjects || [])];
    const fromLessons = lessonsForSemester(ui.catalog.grade, ui.catalog.semester)
      .filter(l => l.textbook !== false).map(l => l.subject);
    return [...new Set([...fromGrade, ...fromLessons])]
      .filter(id => SUBJECT_MAP[id] && fromGrade.includes(id) && fromLessons.includes(id))
      .map(id => SUBJECT_MAP[id]);
  }

  function catalogGroup(lessons, subject) {
    const subjectLessons = lessons.filter(l => l.subject === subject.id);
    if (!subjectLessons.length) return '';
    const units = new Map();
    subjectLessons.forEach(lesson => {
      if (!units.has(lesson.unit)) units.set(lesson.unit, []);
      units.get(lesson.unit).push(lesson);
    });
    const book = DATA.textbookBooks?.find(item => item.grade === ui.catalog.grade &&
      item.semester === ui.catalog.semester && item.subject === subject.id);
    let lessonIndex = 0;
    return `<section class="catalog-directory-group tone-${subject.tone}">
      <div class="catalog-directory-heading"><span class="catalog-subject-icon">${subject.emoji}</span><div><h3>${escapeHtml(subject.name)} <span class="catalog-role">教材学科</span></h3>
        <p>${subjectLessons.length} 个学习条目 · ${escapeHtml(book?.edition || semesterName(ui.catalog.semester))}</p></div>
        ${book?.sourceUrl ? `<a class="catalog-source-link" href="${escapeHtml(book.sourceUrl)}" target="_blank" rel="noopener noreferrer">目录核对链接 ↗</a>` : ''}</div>
      ${[...units].map(([unit, courses]) => `<div class="catalog-unit-heading"><h4>${escapeHtml(unit)}</h4><span>${courses.length} 项</span></div>
        <div class="catalog-course-grid">${courses.map(lesson => `<button type="button" class="catalog-course-card" data-catalog-open="${escapeHtml(lesson.id)}">
          <span class="catalog-course-number">${lesson.subject === 'chinese' ? '课程' : '学习主题'} ${String(++lessonIndex).padStart(2, '0')} <span>${icon('clock', 13)} ${lesson.minutes} 分钟导学</span></span>
          <div class="catalog-course-body"><span class="catalog-course-emoji">${lesson.emoji}</span><div><h4>${escapeHtml(lesson.title)}</h4><p>${escapeHtml(lesson.unit)}</p></div></div>
          <p class="catalog-course-summary">${escapeHtml(lesson.description)}</p>
          <span class="catalog-course-more">查看原创导学与练习 ${icon('arrow', 16)}</span>
        </button>`).join('')}</div>`).join('')}</section>`;
  }

  function renderCatalogContents(lesson, all) {
    const subject = SUBJECT_MAP[lesson.subject];
    const questions = lessonQuestions(lesson);
    const index = all.findIndex(l => l.id === lesson.id);
    const previous = all[index - 1];
    const next = all[index + 1];
    const showAnswers = ui.catalog.answersVisible;
    return `<div class="catalog-reader-layout">
      <nav class="catalog-toc" aria-label="本学期课程目录">
        <div class="catalog-toc-head"><strong>${escapeHtml(gradeName(ui.catalog.grade))} · ${escapeHtml(semesterName(ui.catalog.semester))}</strong><span>${all.length} 课</span></div>
        <button type="button" class="catalog-toc-home" data-action="catalog-back">${icon('left', 16)} 返回完整目录</button>
        ${all.map((item, i) => `<button type="button" class="catalog-toc-link ${item.id === lesson.id ? 'is-current' : ''}" data-catalog-open="${escapeHtml(item.id)}" ${item.id === lesson.id ? 'aria-current="page"' : ''}>
          <span>${String(i + 1).padStart(2, '0')}</span><span>${escapeHtml(item.title)}</span>${item.id === lesson.id ? icon('right', 14) : ''}
        </button>`).join('')}
      </nav>
      <article class="catalog-reading">
        <div class="catalog-reading-head tone-${subject.tone}">
          <div class="catalog-reading-meta"><span>${subject.emoji} ${escapeHtml(subject.name)} · 教材内容</span>
            <span>${icon('clock', 14)} ${lesson.minutes} 分钟</span></div>
          <span class="catalog-reading-emoji">${lesson.emoji}</span>
          <h2>${escapeHtml(lesson.title)}</h2><p>${escapeHtml(lesson.description)}</p>
          <span class="catalog-reading-unit">${escapeHtml(lesson.unit)}</span>
        </div>
        <div class="catalog-reading-body">
          <div class="catalog-readonly-note">${icon('info', 17)}
            <span>教材对应：${escapeHtml(lesson.edition || '平台原创')} · 依照所标教材版本编排单元；部分数学小节和英语训练主题由本站拆分设计，未必是教材原有课题名称。以下讲解、复习及试题均为本站原创，不是教材原文或官方习题。
            ${lesson.sourceUrl ? `<a href="${escapeHtml(lesson.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看目录核对页面 ↗</a>` : ''} 浏览不会更改学习记录。</span></div>
          <div class="catalog-reading-tools"><span>本课共 ${lesson.concepts.length} 个知识点、${lesson.review.length} 张复习卡、${questions.length} 道原创练习题</span>
            <button type="button" data-action="catalog-toggle-answers">${icon(showAnswers ? 'close' : 'bulb', 16)} ${showAnswers ? '隐藏答案' : '查看参考答案'}</button></div>
          <section class="catalog-reading-section">
            <h3><span>🎯</span> 本课学习目标</h3>
            <ul class="catalog-goal-list">${lesson.goals.map(goal => `<li>${icon('check', 16)} ${escapeHtml(goal)}</li>`).join('')}</ul>
          </section>
          <section class="catalog-reading-section">
            <h3><span>💭</span> 课前想一想</h3><div class="catalog-think-box"><strong>${escapeHtml(lesson.think)}</strong><p>提示：${escapeHtml(lesson.hint)}</p></div>
          </section>
          <section class="catalog-reading-section">
            <h3><span>📖</span> 核心知识讲解</h3>
            ${lesson.concepts.map((concept, i) => `<div class="catalog-concept"><span class="catalog-concept-index">${String(i + 1).padStart(2, '0')}</span>
              <div><h4>${escapeHtml(concept.title)}</h4><p>${escapeHtml(concept.text)}</p><div class="catalog-concept-example">${icon('sparkles', 15)} ${escapeHtml(concept.example)}</div></div></div>`).join('')}
          </section>
          <section class="catalog-reading-section">
            <h3><span>✏️</span> 课前练习</h3><div class="catalog-practice"><strong>${escapeHtml(lesson.practice)}</strong>
              ${showAnswers ? `<div class="catalog-solution"><b>参考答案</b><p>${escapeHtml(lesson.practiceAnswer)}</p></div>` : '<p>想好答案后，可以在页面下方统一查看参考答案。</p>'}</div>
          </section>
          <section class="catalog-reading-section">
            <h3><span>🧠</span> 课后知识复习</h3>
            <div class="catalog-review-list">${lesson.review.map(([question, answer], i) => `<div class="catalog-review-item"><div><b>${i + 1}.</b> ${escapeHtml(question)}</div>
              ${showAnswers ? `<p>参考答案：${escapeHtml(answer)}</p>` : ''}</div>`).join('')}</div>
          </section>
          <section class="catalog-reading-section">
            <div class="catalog-question-heading"><h3><span>📝</span> 原创巩固小测</h3><span>${questions.length} 道选择题</span></div>
            ${questions.length ? `<div class="catalog-question-list">${questions.map(([prompt, options, answer, explanation], i) => `
              <div class="catalog-question"><h4>${i + 1}. ${escapeHtml(prompt)}</h4><div class="catalog-options">${options.map((option, oi) => `<div class="${showAnswers && oi === answer ? 'is-answer' : ''}"><b>${'ABCD'[oi]}.</b> ${escapeHtml(option)}</div>`).join('')}</div>
                ${showAnswers ? `<div class="catalog-answer"><strong>正确答案：${'ABCD'[answer]}</strong><p>${escapeHtml(explanation)}</p></div>` : ''}</div>`).join('')}</div>` :
                '<p class="catalog-no-quiz">这一目录条目暂未配备选择题，可以先完成上面的原创导学与复习活动。</p>'}
          </section>
          <button type="button" class="outline-button catalog-reveal" data-action="catalog-toggle-answers">${icon(showAnswers ? 'close' : 'bulb', 17)} ${showAnswers ? '隐藏参考答案与解析' : '查看全部参考答案与解析'}</button>
        </div>
        <div class="catalog-reading-footer">
          <button type="button" class="outline-button" data-catalog-open="${previous ? escapeHtml(previous.id) : ''}" ${previous ? '' : 'disabled'}>${icon('left', 16)} 上一课</button>
          <button type="button" class="outline-button" data-action="catalog-back">课程目录</button>
          <button type="button" class="button primary-button" data-catalog-open="${next ? escapeHtml(next.id) : ''}" ${next ? '' : 'disabled'}>下一课 ${icon('right', 16)}</button>
        </div>
      </article>
    </div>`;
  }

  function renderCatalog() {
    const catalog = ui.catalog;
    if (!gradeIsAvailable(catalog.grade)) {
      catalog.grade = state.grade;
      catalog.semester = state.semester;
      catalog.subject = 'all';
      catalog.lessonId = null;
      catalog.query = '';
      catalog.answersVisible = false;
    }
    if (!semesterIsAvailable(catalog.grade, catalog.semester)) {
      catalog.semester = SEMESTERS.find(item => semesterIsAvailable(catalog.grade, item.id))?.id || state.semester;
      catalog.lessonId = null;
    }
    const all = catalogLessons();
    const grade = gradeConfig(catalog.grade);
    const count = lessonsForSemester(catalog.grade, catalog.semester).filter(l => l.textbook !== false).length;
    const books = (DATA.textbookBooks || []).filter(item => item.grade === catalog.grade && item.semester === catalog.semester);
    const selected = LESSON_MAP[catalog.lessonId];
    const lesson = selected && selected.grade === catalog.grade && selected.semester === catalog.semester && all.some(item => item.id === selected.id)
      ? selected : null;
    return `<div class="catalog-page fade-in">
      <div class="page-heading"><div><span class="page-kicker">COURSE LIBRARY · 自由探索</span><h1>课程目录<span class="heading-dot">.</span></h1>
        <p>按年级、学期、教材学科与单元浏览课名，配套原创导学、复习与练习。</p></div><div class="heading-sticker">🗂️</div></div>
      <div class="catalog-selector panel">
        <div class="catalog-selector-heading"><div><h2>选择年级</h2><p>一、二年级已开放；三至六年级暂未开放</p></div><span class="catalog-browse-badge">${icon('book', 16)} 课程资料库</span></div>
        <div class="catalog-grade-grid" role="group" aria-label="浏览年级">
          ${GRADES.map(item => {
            const available = gradeIsAvailable(item.id);
            const count = available ? lessonsForGrade(item.id).filter(l => l.textbook !== false).length : 0;
            return `<button type="button" class="catalog-grade-choice ${catalog.grade === item.id ? 'selected' : ''} ${available ? '' : 'is-locked'}" data-catalog-grade="${item.id}" aria-pressed="${catalog.grade === item.id}" ${available ? '' : 'disabled aria-disabled="true"'}>
              <span class="catalog-grade-emoji">${available ? item.emoji : '🔒'}</span><strong>${escapeHtml(item.name)}</strong><small>${available ? count + ' 条目录' : '暂未开放'}</small>
            </button>`;
          }).join('')}
        </div>
        <div class="catalog-selector-bottom">
          <div><h3>选择学期</h3><div class="catalog-semesters" role="group" aria-label="浏览学期">
            ${SEMESTERS.map(item => `<button type="button" class="catalog-semester-choice ${catalog.semester === item.id ? 'selected' : ''}" data-catalog-semester="${item.id}" aria-pressed="${catalog.semester === item.id}">${escapeHtml(item.name)}<span>${lessonsForSemester(catalog.grade, item.id).filter(l => l.textbook !== false).length} 项</span></button>`).join('')}
          </div></div>
          <div class="catalog-current"><span>正在浏览</span><strong>${escapeHtml(grade.name)} · ${escapeHtml(semesterName(catalog.semester))}</strong><small>主学科：${escapeHtml(gradeSubjectNames(catalog.grade, 'mainSubjects'))}</small></div>
        </div>
      </div>
      ${books.length ? `<div class="catalog-edition-bar"><div><strong>📚 本学期教材版本</strong><p>${books.map(book => `${escapeHtml(SUBJECT_MAP[book.subject]?.name || book.subject)}：${escapeHtml(book.edition)}`).join(' · ')}</p></div><span>按教材单元配套原创学习主题，非官方逐课复刻；标为“学校版本须核对”的教材请先核对封面与年份。</span></div>` : ''}
      <div class="catalog-toolbar">
        <div><h2>${escapeHtml(grade.name)}${escapeHtml(semesterName(catalog.semester))} · ${lesson ? '课程导学' : '教材目录'}</h2><p>${count ? `已收录 ${count} 个教材目录条目，按单元查看原创导学资料` : '该学期的教材目录尚未录入'}</p></div>
        <div class="catalog-search"><label>${icon('search', 17)}<input data-catalog-search aria-label="搜索此学期课程" placeholder="搜索课程名称或知识点" value="${escapeHtml(catalog.query)}" /></label><button type="button" data-action="catalog-search">搜索</button></div>
      </div>
      <div class="catalog-filters" role="group" aria-label="浏览学科"><button class="filter-chip ${catalog.subject === 'all' ? 'selected' : ''}" data-catalog-subject="all">全部学科</button>
        ${catalogSubjects().map(subject => `<button class="filter-chip ${catalog.subject === subject.id ? 'selected' : ''}" data-catalog-subject="${subject.id}">${subject.emoji} ${escapeHtml(subject.name)}</button>`).join('')}
      </div>
      ${lesson ? renderCatalogContents(lesson, all) : all.length ? `
        <div class="catalog-directories">${catalogSubjects().map(subject => catalogGroup(all, subject)).join('')}</div>
      ` : `<div class="catalog-empty"><span>${count ? '🔎' : '📚'}</span><h3>${count ? '没有找到匹配的课程' : '这个学期的课程正在准备中'}</h3>
        <p>${count ? '换一个学科或关键词，继续寻找吧。' : `${escapeHtml(grade.name)}${escapeHtml(semesterName(catalog.semester))}目前还没有课程，录入后会自动出现在这里。`}</p>
        ${count ? '<button class="outline-button" data-action="catalog-clear">查看本学期全部课程</button>' : '<span class="catalog-empty-hint">可以继续选择其他年级或学期浏览</span>'}
      </div>`}
      <div class="catalog-note">${icon('info', 17)} 目前仅开放一、二年级的统编语文与人教数学。三至六年级教材资料已保留，后续开放；浏览不会修改学习记录。</div>
    </div>`;
  }

  function renderDashboard() {
    const lessons = currentLessons();
    const previews = lessons.filter(l => state.previewDone.includes(l.id)).length;
    const reviews = lessons.filter(l => state.reviewDone.includes(l.id)).length;
    const tests = currentTests();
    const avg = tests.length ? Math.round(tests.reduce((n, t) => n + t.score, 0) / tests.length) : null;
    const today = todayCounts();
    const totalToday = Number(today.preview > 0) + Number(today.review > 0) + Number(today.test > 0);
    return `<div class="dashboard-page fade-in">
      <div class="grade-context"><span class="grade-context-icon">${GRADES.find(g => g.id === state.grade).emoji}</span><span>当前 <strong>${gradeName(state.grade)} · ${semesterName(state.semester)}</strong> · 主学科：${gradeSubjectNames(state.grade, 'mainSubjects')}</span><button data-action="grade-picker">切换年级／学期 ${icon('chevronDown', 14)}</button></div>
      <section class="hero-banner">
        <div class="hero-speck speck-one"></div><div class="hero-speck speck-two"></div>
        <div class="hero-content">
          <span class="hero-kicker">${icon('sparkles', 15)} 你好呀，小小探索家！</span>
          <h1>${escapeHtml(state.name)}，准备好开启<br/><em>今天的知识冒险</em>了吗？</h1>
          <p>每一次勇敢尝试，都会让你离梦想更近一点。<br/>预习、复习、闯关，今天也一起加油吧！</p>
          <button class="button hero-cta" data-action="continue">继续学习 ${icon('arrow', 18)}</button>
        </div>
        <div class="hero-art">${mascot()}<span class="hero-mini-tag">⭐ 已收集 ${currentStars()} 颗星星</span></div>
      </section>

      <section class="stats-grid" aria-label="学习数据">
        <div class="stat-card"><div class="stat-icon purple">${icon('book', 22)}</div><div class="stat-content"><span>已完成预习</span><strong>${previews}<small> / ${lessons.length} 课</small></strong></div><span class="stat-corner">↗</span></div>
        <div class="stat-card"><div class="stat-icon orange">${icon('layers', 22)}</div><div class="stat-content"><span>已完成复习</span><strong>${reviews}<small> / ${lessons.length} 课</small></strong></div><span class="stat-corner">↗</span></div>
        <div class="stat-card"><div class="stat-icon green">${icon('target', 22)}</div><div class="stat-content"><span>测试平均分</span><strong>${avg == null ? '—' : avg}<small>${avg == null ? ' 快去挑战' : ' 分'}</small></strong></div><span class="stat-corner">↗</span></div>
        <div class="stat-card"><div class="stat-icon pink">${icon('star', 22)}</div><div class="stat-content"><span>成长小星星</span><strong>${currentStars()}<small> 颗</small></strong></div><span class="stat-corner">↗</span></div>
      </section>

      <div class="dashboard-columns">
        <section class="dashboard-primary">
          ${sectionHeader('今日主学科任务 <span class="header-spark">✦</span>', '优先预习和复习本年级的主学科课程', `<button class="text-link" data-nav="catalog">浏览课程目录 ${icon('arrow', 16)}</button>`)}
          <div class="task-list">
            ${currentSubjects('main').map(subject => {
              const task = nextTask(subject.id);
              return `<article class="task-card tone-${subject.tone}">
                <div class="task-art">${subject.emoji}</div>
                <div class="task-copy"><div class="task-line"><span class="task-category">${subject.name} · ${task.detail}</span><span class="task-minutes">${icon('clock', 13)} ${task.lesson ? task.lesson.minutes : 5} 分钟</span></div>
                  <h3>${task.lesson ? escapeHtml(task.lesson.title) : `${subject.name}知识挑战`}</h3>
                  <p>${task.lesson ? escapeHtml(task.lesson.description) : '预习和复习都完成了，用小测验巩固知识吧！'}</p></div>
                <button class="task-arrow" data-action="task" data-task-kind="${task.kind}" data-task-id="${task.lesson ? task.lesson.id : subject.id}" aria-label="${task.text}${subject.name}">${icon('arrow', 21)}</button>
              </article>`;
            }).join('') || '<div class="subject-empty">主学科课程正在补充，先到课程列表看看其他内容吧。</div>'}
          </div>

          ${sectionHeader('主学科小宇宙', '每个年级按自己的主学科安排学习', `<button class="text-link" data-nav="report">查看报告 ${icon('arrow', 16)}</button>`)}
          <div class="subject-grid main-subject-grid">
            ${currentSubjects('main').map(renderSubjectCard).join('')}
          </div>
        </section>

        <aside class="dashboard-aside">
          <section class="panel daily-panel">
            <div class="panel-title"><div class="panel-title-icon">${icon('target', 19)}</div><h3>今日成长目标</h3><span class="panel-emoji">🎯</span></div>
            <p class="muted small">完成 3 件小事，做自己的学习小达人</p>
            <div class="daily-ring-row"><div class="progress-ring" style="--progress:${totalToday / 3 * 100}%"><div><strong>${totalToday}<small>/3</small></strong><span>已完成</span></div></div>
              <div class="daily-targets">
                ${[['preview', '预习一节新课'], ['review', '复习一个知识点'], ['test', '完成一次小测试']].map(([key, label]) => `<div class="daily-target ${today[key] ? 'done' : ''}"><span class="target-check">${today[key] ? icon('check', 12) : ''}</span>${label}</div>`).join('')}
              </div>
            </div>
            <button class="outline-button wide" data-action="continue">${totalToday === 3 ? '再接再厉' : '完成今日计划'} ${icon('right', 16)}</button>
          </section>

          <section class="panel weekly-panel">
            <div class="panel-title"><div class="panel-title-icon soft-blue">${icon('chart', 19)}</div><h3>本周学习足迹</h3></div>
            <p class="muted small">每一根小柱子，都是认真学习的证明</p>
            ${weekChart(true)}
            <div class="weekly-foot"><span>${icon('fire', 17)} 连续学习 <strong>${streak()}</strong> 天</span><button class="text-link" data-nav="report">详情 ${icon('right', 15)}</button></div>
          </section>

          <section class="tip-panel"><div class="tip-stars">✦ ✳</div><div class="tip-icon">💡</div><strong>学习小锦囊</strong><p>“先预习，再听课，课后及时复习”，知识就会记得更牢哦！</p></section>
        </aside>
      </div>
    </div>`;
  }

  function subjectFilters() {
    return `<div class="subject-filters" role="group" aria-label="筛选学科">
      <button class="filter-chip ${ui.subject === 'all' ? 'selected' : ''}" data-filter="all">全部学科</button>
      ${currentSubjects().map(s => `<button class="filter-chip ${ui.subject === s.id ? 'selected' : ''}" data-filter="${s.id}"><span>${s.emoji}</span>${s.name}</button>`).join('')}
    </div>`;
  }

  function renderLessonGroup(lessons, role, completed, mode) {
    if (!lessons.length) return '';
    return `<section class="curriculum-group" aria-label="教材课程">
      <div class="curriculum-group-title"><div><h3>📚 本学期教材课程</h3><p>按教材的课程和单元进度进行预习、复习与练习</p></div><span>${lessons.length} 节</span></div>
      <div class="lesson-grid">${lessons.map(lesson => {
        const subject = SUBJECT_MAP[lesson.subject];
        const done = completed.includes(lesson.id);
        return `<article class="lesson-card tone-${subject.tone}"><div class="lesson-card-top"><span class="lesson-unit">${escapeHtml(lesson.unit)}</span><span class="lesson-emoji">${lesson.emoji}</span></div>
          <span class="lesson-subject">${subject.name} · 教材导学</span><h3>${escapeHtml(lesson.title)}</h3><p>${escapeHtml(lesson.description)}</p>
          <div class="lesson-tags"><span>${icon('clock', 14)} ${lesson.minutes} 分钟</span><span>${icon('book', 14)} ${lesson.goals.length} 个目标</span></div>
          <div class="lesson-card-bottom"><span class="lesson-status ${done ? 'done' : ''}">${done ? icon('circleCheck', 15) + ' 已完成' : '● 等待探索'}</span><button data-open-lesson="${lesson.id}" data-mode="${mode}" class="lesson-go" aria-label="${done ? '再次学习' : '开始学习'}${escapeHtml(lesson.title)}">${icon('arrow', 19)}</button></div></article>`;
      }).join('')}</div>
    </section>`;
  }

  function renderLessonList(mode) {
    const isPreview = mode === 'preview';
    const completed = isPreview ? state.previewDone : state.reviewDone;
    const filtered = currentLessons().filter(l => (ui.subject === 'all' || l.subject === ui.subject) &&
      (`${l.title} ${l.unit} ${l.description} ${SUBJECT_MAP[l.subject].name}`).toLowerCase().includes(ui.search.trim().toLowerCase()));
    return `<div class="course-page fade-in">
      <div class="page-heading"><div><span class="page-kicker">${gradeName(state.grade)} · ${semesterName(state.semester)} · ${isPreview ? 'BEFORE CLASS · 快乐探索' : 'AFTER CLASS · 温故知新'}</span><h1>${isPreview ? '课前预习' : '课后复习'}<span class="heading-dot">.</span></h1><p>${isPreview ? '先认识新知识，带着问题走进课堂。' : '翻一翻知识卡片，把学过的内容牢牢记住。'}</p></div><div class="heading-sticker">${isPreview ? '📚' : '🧠'}</div></div>
      <div class="course-explainer ${isPreview ? 'explainer-purple' : 'explainer-peach'}"><span class="explainer-icon">${isPreview ? '🔎' : '✨'}</span><div><strong>${isPreview ? '预习三步走' : '复习小妙招'}</strong><p>${isPreview ? '想一想 → 学一学 → 练一练，简单三步开启新知识。' : '先自己想答案，再翻开知识卡，最后做个小测试！'}</p></div><span class="explainer-stars">✧ ✧</span></div>
      <div class="course-toolbar"><div><h2>选择一个学习主题</h2><p>共 ${filtered.length} 个主题 · 已完成 ${filtered.filter(l => completed.includes(l.id)).length} 个</p></div>${subjectFilters()}</div>
      <div class="mobile-course-search"><label>${icon('search', 17)}<input data-course-search placeholder="输入课程名称，按回车搜索" value="${escapeHtml(ui.search)}" /></label><button data-action="search-course">搜索</button></div>
      ${filtered.length ? `
        ${renderLessonGroup(filtered, 'main', completed, mode)}
      ` : `<div class="empty-state"><span>🔎</span><h3>没有找到对应的课程</h3><p>换个关键词或者切换学科看看吧。</p><button class="outline-button" data-action="clear-search">查看全部课程</button></div>`}
    </div>`;
  }

  function renderLessonDetail() {
    const lesson = LESSON_MAP[ui.detail.id];
    const subject = SUBJECT_MAP[lesson.subject];
    const preview = ui.detail.mode === 'preview';
    const done = (preview ? state.previewDone : state.reviewDone).includes(lesson.id);
    return `<div class="lesson-detail fade-in tone-${subject.tone}">
      <div class="breadcrumb"><button data-action="back-lessons">${icon('left', 16)} 返回课程列表</button><span>/</span><span>${subject.name}</span><span>/</span><strong>${escapeHtml(lesson.title)}</strong></div>
      <section class="lesson-detail-banner"><div class="lesson-banner-info"><span class="lesson-banner-tag">${semesterName(state.semester)} · ${subject.emoji} ${subject.name} · 教材导学 · ${preview ? '课前预习' : '课后复习'}</span><h1>${escapeHtml(lesson.title)}</h1><p>${escapeHtml(lesson.description)}</p><div class="lesson-banner-bottom"><span>${icon('clock', 15)} 约 ${lesson.minutes} 分钟</span><span>${icon('target', 15)} ${lesson.goals.length} 个学习目标</span></div></div><div class="lesson-banner-art"><span>${lesson.emoji}</span><i>✦</i><b>✳</b></div></section>
      <div class="lesson-content-layout"><div class="lesson-content-main">${preview ? renderPreviewContent(lesson, done) : renderReviewContent(lesson, done)}</div>
        <aside class="lesson-right">
          <div class="panel lesson-goal-panel"><div class="panel-title"><div class="panel-title-icon">${icon('target', 19)}</div><h3>本课学习目标</h3></div><div class="goal-list">${lesson.goals.map((g, i) => `<div><span>${icon('check', 15)}</span><p>${escapeHtml(g)}</p></div>`).join('')}</div></div>
          <div class="lesson-side-tip"><div>🌟</div><strong>${preview ? '预习小提示' : '复习小提示'}</strong><p>${preview ? '先自己想一想，遇到不明白的地方可以在课堂上向老师提问。' : '翻开答案前，先认真回想一遍。能自己说出来，就真的学会啦！'}</p></div>
          <button class="outline-button wide" data-action="speak" data-lesson="${lesson.id}">${icon('volume', 17)} ${lesson.subject === 'english' ? '朗读英语重点' : '朗读本课知识'}</button>
        </aside></div>
    </div>`;
  }

  function renderPreviewContent(lesson, done) {
    const steps = [{ name: '想一想', sub: '带着好奇出发' }, { name: '学一学', sub: '发现新知识' }, { name: '练一练', sub: '动手试试看' }];
    let section = '';
    if (ui.step === 0) {
      section = `<div class="step-eyebrow">STEP 01 · THINK</div><h2>先来动动小脑筋 🤔</h2><p class="step-desc">不用着急找答案，说出你的想法就是很棒的开始。</p>
        <div class="think-box"><span class="bubble-label">💭 课前小问题</span><h3>${escapeHtml(lesson.think)}</h3><button class="hint-link" data-action="toggle-reveal">${icon('bulb', 17)} ${ui.reveal ? '收起小提示' : '给我一点提示'} ${icon('chevronDown', 15)}</button>${ui.reveal ? `<p class="revealed-hint">${escapeHtml(lesson.hint)}</p>` : ''}</div>`;
    } else if (ui.step === 1) {
      section = `<div class="step-eyebrow">STEP 02 · LEARN</div><h2>今天要认识的新知识 📚</h2><p class="step-desc">认真读一读重点知识和小例子，试着用自己的话说一遍。</p>
        <div class="concept-list">${lesson.concepts.map((c, i) => `<div class="concept-card"><span class="concept-index">0${i + 1}</span><div><h3>${escapeHtml(c.title)}</h3><p>${escapeHtml(c.text)}</p><div class="concept-example">${icon('sparkles', 16)} ${escapeHtml(c.example)}</div></div></div>`).join('')}</div>`;
    } else {
      section = `<div class="step-eyebrow">STEP 03 · PRACTICE</div><h2>轮到你来试一试啦 ✏️</h2><p class="step-desc">先自己完成小练习，再看参考答案。答错也没关系！</p>
        <div class="practice-box"><span class="bubble-label">📝 预习小练习</span><h3>${escapeHtml(lesson.practice)}</h3><button class="outline-button" data-action="toggle-reveal">${ui.reveal ? '收起参考答案' : '完成思考，查看答案'} ${icon('chevronDown', 16)}</button>${ui.reveal ? `<div class="practice-answer"><strong>✅ 参考答案 / 示例</strong><p>${escapeHtml(lesson.practiceAnswer)}</p></div>` : ''}</div>`;
    }
    return `<div class="learning-panel"><div class="learning-panel-head"><div><span class="panel-kicker">我的预习路线</span><h2>跟着星芽，分三步学</h2></div><span class="step-counter">${ui.step + 1} / 3</span></div>
        <div class="steps">${steps.map((s, i) => `<button class="step-item ${i === ui.step ? 'current' : ''} ${i < ui.step ? 'visited' : ''}" data-step="${i}"><span class="step-circle">${i < ui.step ? icon('check', 16) : i + 1}</span><span><strong>${s.name}</strong><small>${s.sub}</small></span></button>`).join('')}</div>
        <div class="step-content">${section}</div><div class="learning-actions">${ui.step > 0 ? `<button class="outline-button" data-action="prev-step">${icon('left', 17)} 上一步</button>` : '<span></span>'}
          ${ui.step < 2 ? `<button class="button primary-button" data-action="next-step">下一步 ${icon('arrow', 17)}</button>` : done ? `<div class="completed-actions"><span class="done-caption">${icon('circleCheck', 18)} 预习已完成</span><button class="button primary-button" data-action="go-review" data-lesson="${lesson.id}">去复习 ${icon('arrow', 17)}</button></div>` : `<button class="button primary-button" data-action="finish-preview" data-lesson="${lesson.id}">${icon('check', 18)} 完成预习，收集星星</button>`}
        </div></div>`;
  }

  function renderReviewContent(lesson, done) {
    const total = lesson.review.length;
    return `<div class="learning-panel"><div class="learning-panel-head"><div><span class="panel-kicker">我的知识回忆卡</span><h2>翻一翻，记得更牢 🧠</h2></div><span class="step-counter">${ui.flipped.size} / ${total} 张</span></div>
      <div class="review-intro">${icon('info', 18)} 先读题目想答案，再点击卡片翻面。每张卡片都翻过，就能完成复习啦！</div>
      <div class="flash-grid">${lesson.review.map(([front, back], i) => {
        const flipped = ui.showingBack.has(i);
        return `<button class="flash-card ${flipped ? 'flipped' : ''}" data-flip="${i}" aria-label="${flipped ? '答案：' + escapeHtml(back) : '问题：' + escapeHtml(front)}"><span class="flash-top">${flipped ? '✨ 知识答案' : `💭 知识卡片 0${i + 1}`}</span><strong>${escapeHtml(flipped ? back : front)}</strong><span class="flash-bottom">${flipped ? '点击再看问题' : '点击翻开答案'} ${icon('rotate', 14)}</span></button>`;
      }).join('')}</div>
      <div class="review-progress"><span>知识卡片回顾进度</span><strong>${Math.round(ui.flipped.size / total * 100)}%</strong><div class="track"><span style="width:${ui.flipped.size / total * 100}%"></span></div></div>
      <div class="learning-actions review-actions"><button class="outline-button" data-action="lesson-quiz" data-lesson="${lesson.id}">${icon('quiz', 18)} 做本课小测</button>
        ${done ? `<span class="done-caption">${icon('circleCheck', 18)} 已完成复习</span>` : `<button class="button primary-button" data-action="finish-review" data-lesson="${lesson.id}" ${ui.flipped.size < total ? 'disabled' : ''}>${icon('check', 18)} 完成复习 +3 ⭐</button>`}
      </div>${!done && ui.flipped.size < total ? `<p class="review-note">再翻开 ${total - ui.flipped.size} 张知识卡片就可以完成复习。</p>` : ''}</div>`;
  }

  function renderExamSection() {
    const subjects = currentSubjects('main').filter(subject => examUnits(subject.id).length);
    const recentExams = currentTests().filter(test => isExam(test.kind)).slice(0, 6);
    return `<section class="exam-board" aria-label="单元期中期末测试">
      <div class="exam-heading"><div><span class="exam-eyebrow">TERM EXAMS · 阶段学习检测</span><h2>📝 单元 · 期中 · 期末测试</h2>
        <p>根据${escapeHtml(gradeName(state.grade))}${escapeHtml(semesterName(state.semester))}对应教材单元组卷。独立原创试题，作答完成后统一评分与查看解析。</p></div>
        <span class="exam-heading-icon">🎓</span></div>
      ${subjects.length ? `<div class="exam-subject-grid">${subjects.map(subject => {
        const units = examUnits(subject.id);
        const mid = examScope('midterm', subject.id);
        const end = examScope('final', subject.id);
        const enabled = units.filter(unit => examUnitPool(subject.id, unit).length);
        const midCount = mid.units.reduce((sum, unit) => sum + examUnitPool(subject.id, unit).length, 0);
        const finalCount = end.units.reduce((sum, unit) => sum + examUnitPool(subject.id, unit).length, 0);
        return `<div class="exam-subject-card tone-${subject.tone}">
          <div class="exam-subject-top"><span class="exam-subject-emoji">${subject.emoji}</span><div><strong>${escapeHtml(subject.name)}</strong><small>${units.length} 个正式单元 · ${escapeHtml(semesterName(state.semester))}</small></div></div>
          <label class="exam-field-label" for="exam-unit-${subject.id}">单元测试 · 选择一个单元</label>
          <select id="exam-unit-${subject.id}" data-exam-unit="${subject.id}" class="exam-unit-select" ${enabled.length ? '' : 'disabled'}>
            ${enabled.map(unit => `<option value="${escapeHtml(unit)}">${escapeHtml(unit)} · 题库 ${examUnitPool(subject.id, unit).length} 题</option>`).join('')}
          </select>
          <button type="button" class="exam-unit-start" data-action="start-unit-exam" data-subject="${subject.id}" ${enabled.length ? '' : 'disabled'}>开始单元测试 · ${EXAM_LENGTHS.unit}题 ${icon('arrow', 17)}</button>
          <div class="exam-stage-row">
            <button type="button" class="exam-stage-button" data-action="start-quiz" data-kind="midterm" data-id="${subject.id}" ${midCount ? '' : 'disabled'}><span>📘 期中测试 · ${EXAM_LENGTHS.midterm}题</span><small>前 ${mid.units.length} 个单元 · 题库 ${midCount} 题</small></button>
            <button type="button" class="exam-stage-button" data-action="start-quiz" data-kind="final" data-id="${subject.id}" ${finalCount ? '' : 'disabled'}><span>🏆 期末测试 · ${EXAM_LENGTHS.final}题</span><small>全 ${end.units.length} 个单元 · 题库 ${finalCount} 题</small></button>
          </div></div>`;
      }).join('')}</div>` : '<div class="exam-no-subject">该年级当前学期还没有可用的正式单元测试题，后续补充课程及试题后自动开放。</div>'}
      <p class="exam-policy">每次单元测试固定 10 题、期中固定 20 题、期末固定 30 题，自动随机组卷；如对应题库不足，则以实际可用题数为准。优先抽取近期未考过的题，题目不足时才重复。期中按前半学期正式单元，期末覆盖全部正式单元；综合实践和“复习与关联”不单独计入考试单元。所有试题均为平台原创巩固题，不是学校或出版社官方试卷。</p>
      ${recentExams.length ? `<div class="exam-records"><h3>最近考试成绩</h3><div class="exam-record-grid">${recentExams.map(test => `<div class="exam-record"><div><strong>${escapeHtml(test.label)}</strong><small>${dateLabel(test.at, true)} · 答对 ${test.correct}/${test.total} 题</small></div><b>${test.score} <small>分</small></b></div>`).join('')}</div></div>` : ''}
    </section>`;
  }

  function renderQuizHub() {
    const latest = currentTests().slice(0, 4);
    const mainSubjects = currentSubjects('main');
    const challengeCard = (subject, index) => `<button class="challenge-card tone-${subject.tone}" data-action="start-quiz" data-kind="subject" data-id="${subject.id}">
      <span class="challenge-number">LEVEL 0${index + 1}</span><span class="challenge-art">${subject.emoji}</span><h3>${subject.name}挑战</h3><p>${subject.slogan}</p>
      <span class="challenge-foot"><span>${icon('quiz', 15)} 学科练习 · 5 道题</span><span class="challenge-arrow">${icon('arrow', 18)}</span></span></button>`;
    return `<div class="quiz-hub fade-in"><div class="page-heading"><div><span class="page-kicker">${gradeName(state.grade)} · ${semesterName(state.semester)} · 闯关与阶段考试</span><h1>测试与考试<span class="heading-dot">.</span></h1><p>既可以做每次 5 题的趣味挑战，也可以选择单元、期中和期末考试。</p></div><div class="heading-sticker">🏆</div></div>
      <section class="quiz-intro-banner"><div class="quiz-intro-icon">🚀</div><div><span>${gradeName(state.grade)}教材学科闯关</span><h2>小小知识家，今天要闯哪一关？</h2><p>从本年级、本学期的语文、数学和已开设的英语学科中抽题练习。</p></div><button class="button white-button" data-action="start-quiz" data-kind="mixed" ${mainSubjects.length ? '' : 'disabled'}>综合随机测验 ${icon('arrow', 17)}</button></section>
      ${renderExamSection()}
      ${mainSubjects.length ? `${sectionHeader('主学科挑战', `${gradeName(state.grade)}主学科：${mainSubjects.map(s => s.name).join('、')}`)}<div class="challenge-grid">
        ${mainSubjects.map((s, i) => challengeCard(s, i)).join('')}
        <button class="challenge-card mixed-card" data-action="start-quiz" data-kind="mixed"><span class="challenge-number">BONUS LEVEL</span><span class="challenge-art">🌟</span><h3>主学科综合挑战</h3><p>${mainSubjects.map(s => s.name).join('、')}一起上阵，点亮全能小脑袋</p><span class="challenge-foot"><span>${icon('quiz', 15)} 5 道随机题</span><span class="challenge-arrow">${icon('arrow', 18)}</span></span></button>
      </div>` : '<div class="subject-empty">这个年级的主学科测试题正在准备中。</div>'}
      ${sectionHeader('最近的闯关记录', '每一次认真作答都值得被记录', `<button class="text-link" data-nav="report">查看学习报告 ${icon('arrow', 16)}</button>`)}
      ${latest.length ? `<div class="history-list">${latest.map(t => `<div class="history-item"><span class="history-badge">${icon('trophy', 20)}</span><div><strong>${escapeHtml(t.label)}</strong><small>${dateLabel(t.at, true)} · ${t.correct}/${t.total} 题正确</small></div><strong class="history-score">${t.score} <small>分</small></strong></div>`).join('')}</div>` : `<div class="no-history"><span>📋</span><p>还没有闯关记录，完成第一场测试后就能在这里看到成绩啦。</p></div>`}
    </div>`;
  }

  function renderQuizPlaying() {
    const quiz = ui.quiz;
    const question = quiz.questions[quiz.index];
    const subject = SUBJECT_MAP[question.subject];
    const examMode = isExam(quiz.kind);
    const percentage = (quiz.index + (quiz.checked ? 1 : 0)) / quiz.questions.length * 100;
    return `<div class="quiz-playing fade-in"><div class="breadcrumb"><button data-nav="quiz">${icon('left', 16)} 返回挑战中心</button><span>/</span><strong>${escapeHtml(quiz.label)}</strong></div>
      <div class="quiz-heading"><div><span class="page-kicker">${examMode ? 'STAGE EXAM · 原创阶段测验' : 'BRAIN POWER · 动动小脑筋'}</span><h1>${escapeHtml(quiz.label)}</h1><p>${examMode ? '请独立完成本次考试，提交后进入下一题，全部答完统一公布成绩和解析。' : '认真读题，选出你认为正确的答案。'}</p></div><span class="quiz-progress-number"><strong>${quiz.index + 1}</strong> / ${quiz.questions.length}</span></div>
      <div class="quiz-track"><span style="width:${percentage}%"></span></div>
      <div class="question-panel"><div class="question-meta"><span class="question-tag tone-${subject.tone}">${subject.emoji} ${subject.name} · 教材知识点 · ${escapeHtml(question.lessonTitle)}</span><span>单选题 · 选择一个答案</span></div>
        <h2><span class="question-numeral">Q${String(quiz.index + 1).padStart(2, '0')}.</span> ${escapeHtml(question.prompt)}</h2>
        <div class="answer-grid">${question.options.map((option, index) => {
          let type = '';
          if (quiz.checked) type = index === question.answer ? 'is-correct' : index === quiz.selected ? 'is-incorrect' : 'is-muted';
          return `<button class="answer-option ${quiz.selected === index ? 'is-selected' : ''} ${type}" data-option="${index}" ${quiz.checked ? 'disabled' : ''}><span class="answer-letter">${'ABCD'[index]}</span><span>${escapeHtml(option)}</span><span class="answer-indicator">${quiz.checked && index === question.answer ? icon('check', 18) : (quiz.selected === index ? icon('circleCheck', 18) : '')}</span></button>`;
        }).join('')}</div>
        ${quiz.checked ? `<div class="explanation-box ${quiz.selected === question.answer ? 'explanation-good' : 'explanation-wrong'}"><div><span>${quiz.selected === question.answer ? '🎉' : '💡'}</span><strong>${quiz.selected === question.answer ? '答对啦，你真棒！' : '没关系，又学会了一个知识点！'}</strong></div><p><b>正确答案：${'ABCD'[question.answer]}。</b>${escapeHtml(question.explanation)}</p></div>` : `<div class="question-hint">${icon('bulb', 16)} ${examMode ? '考试过程中不会显示正确答案，交卷后统一查看题目解析。' : '小提示：可以点击选项，也可以按键盘数字 1～4 选择。'}</div>`}
        <div class="question-actions"><span>${examMode ? `已答 ${quiz.answers.length} / ${quiz.questions.length} 题` : quiz.checked ? '知识又增加一点点 ✨' : `${quiz.index + 1} / ${quiz.questions.length} · 加油！`}</span>
          ${quiz.checked ? `<button class="button primary-button" data-action="next-question">${quiz.index === quiz.questions.length - 1 ? '查看我的成绩' : '下一题'} ${icon('arrow', 17)}</button>` : `<button class="button primary-button" data-action="confirm-answer" ${quiz.selected == null ? 'disabled' : ''}>${examMode ? (quiz.index === quiz.questions.length - 1 ? '交卷并查看成绩' : '提交本题 · 下一题') : '确认答案'} ${icon('arrow', 17)}</button>`}</div>
      </div></div>`;
  }

  function renderExamBreakdown(result) {
    if (!isExam(result.kind)) return '';
    const units = new Map();
    result.answers.forEach(answer => {
      const question = QUESTION_MAP[answer.id];
      if (!question) return;
      const unit = question.unit || '其他知识点';
      if (!units.has(unit)) units.set(unit, { total: 0, correct: 0 });
      const record = units.get(unit);
      record.total++;
      if (answer.correct) record.correct++;
    });
    return `<section class="exam-breakdown" aria-label="考试单元得分分析"><div class="exam-breakdown-title"><h2>📚 单元掌握情况</h2><p>看看哪些单元已经掌握，哪些还可以继续练习。</p></div>
      <div class="exam-breakdown-list">${[...units].map(([unit, stats]) => `<div class="exam-breakdown-item"><div><strong>${escapeHtml(unit)}</strong><span>答对 ${stats.correct}/${stats.total} 题</span></div>
        <div class="exam-breakdown-track"><span style="width:${Math.round(stats.correct / stats.total * 100)}%"></span></div></div>`).join('')}</div></section>`;
  }

  function renderQuizResult() {
    const result = ui.result;
    const excellent = result.score >= 80;
    return `<div class="quiz-result fade-in"><div class="result-celebration"><span class="confetti confetti-a">✦</span><span class="confetti confetti-b">✳</span><span class="confetti confetti-c">✧</span><div class="result-trophy">${excellent ? '🏆' : '🌈'}</div><span class="page-kicker">${isExam(result.kind) ? 'EXAM COMPLETED · 阶段测试已交卷' : 'CHALLENGE COMPLETED'}</span><h1>${isExam(result.kind) ? escapeHtml(result.label) + ' · 成绩单' : excellent ? '哇！你是知识小达人！' : '闯关完成，进步看得见！'}</h1><p>${excellent ? '认真练习取得好成绩，继续保持！' : '每一道错题都是一次学习机会，继续加油！'}</p><div class="result-score"><strong>${result.score}</strong><span>分</span></div><div class="result-summary"><span>${icon('circleCheck', 18)} 答对 ${result.correct} / ${result.total} 题</span><span>${icon('star', 18)} 收获 ${result.correct * 2} 颗星星</span></div>
        <div class="result-buttons"><button class="outline-button" data-nav="quiz">返回挑战中心</button><button class="button primary-button" data-action="retry-quiz" data-kind="${result.kind}" data-id="${escapeHtml(result.sourceId)}">再挑战一次 ${icon('rotate', 17)}</button></div></div>
      ${renderExamBreakdown(result)}
      <div class="result-review">${sectionHeader('题目回顾', '看看哪些知识已经掌握，哪些还可以再练一练')}
        ${result.answers.map((answer, i) => {
          const q = QUESTION_MAP[answer.id];
          return `<div class="result-answer"><span class="result-answer-symbol ${answer.correct ? 'success' : 'error'}">${answer.correct ? icon('check', 17) : icon('close', 17)}</span><div><div class="result-question-top"><strong>${i + 1}. ${escapeHtml(q.prompt)}</strong><span>${answer.correct ? '回答正确' : '继续加油'}</span></div><p>你的答案：${escapeHtml(q.options[answer.selected])}　·　正确答案：${escapeHtml(q.options[q.answer])}</p><small>${escapeHtml(q.explanation)}</small></div></div>`;
        }).join('')}
      </div></div>`;
  }

  function renderMistakes() {
    const all = Object.entries(state.mistakes).filter(([id]) => QUESTION_MAP[id] && QUESTION_MAP[id].grade === state.grade && QUESTION_MAP[id].semester === state.semester);
    const filtered = all.filter(([id]) => ui.subject === 'all' || QUESTION_MAP[id].subject === ui.subject);
    return `<div class="mistakes-page fade-in"><div class="page-heading"><div><span class="page-kicker">${gradeName(state.grade)} · ${semesterName(state.semester)} · 错题会变成经验</span><h1>我的错题本<span class="heading-dot">.</span></h1><p>把暂时不会的题目再看一遍，下次一定更有把握！</p></div><div class="heading-sticker">📝</div></div>
      <div class="mistake-summary"><div class="mistake-summary-icon">💪</div><div><span>正在攻克的知识点</span><h2>${all.length} <small>道错题</small></h2><p>${all.length ? '不要怕犯错，认真订正就是最棒的成长。' : '太棒啦！目前没有待巩固的错题。'}</p></div>${all.length ? `<button class="button primary-button" data-action="start-quiz" data-kind="mistakes">集中练一练 ${icon('arrow', 17)}</button>` : ''}</div>
      <div class="course-toolbar mistake-toolbar"><div><h2>错题整理</h2><p>答对后，题目会自动从错题本移除</p></div>${subjectFilters()}</div>
      ${filtered.length ? `<div class="mistake-list">${filtered.map(([id, record], i) => {
        const q = QUESTION_MAP[id]; const s = SUBJECT_MAP[q.subject]; const opened = ui.mistakeExpanded.has(id);
        return `<div class="mistake-card"><div class="mistake-card-top"><span class="question-tag tone-${s.tone}">${s.emoji} ${s.name} · ${escapeHtml(q.lessonTitle)}</span><span class="mistake-count">错过 ${record.count} 次</span></div><h3>${escapeHtml(q.prompt)}</h3><div class="mistake-options">${q.options.map((option, index) => `<span class="${opened && index === q.answer ? 'right-option' : ''}">${'ABCD'[index]}. ${escapeHtml(option)}</span>`).join('')}</div>
          ${opened ? `<div class="mistake-explanation"><strong>${icon('bulb', 16)} 正确答案：${'ABCD'[q.answer]}</strong><p>${escapeHtml(q.explanation)}</p></div>` : ''}
          <button class="hint-link mistake-toggle" data-action="toggle-mistake" data-id="${id}">${opened ? '收起解析' : '查看答案与解析'} ${icon('chevronDown', 16)}</button></div>`;
      }).join('')}</div>` : `<div class="empty-state"><span>${all.length ? '🔎' : '🎉'}</span><h3>${all.length ? '这个学科没有错题' : '错题本干干净净！'}</h3><p>${all.length ? '试试选择其他学科。' : '去挑战几道新题，继续探索新知识吧。'}</p><button class="outline-button" data-nav="quiz">去趣味测试 ${icon('arrow', 16)}</button></div>`}</div>`;
  }

  function renderReportSubjectGroup(role) {
    const subjects = currentSubjects(role);
    if (!subjects.length) return '';
    return `<div class="report-subject-group">
      <div class="report-group-label">📚 教材学科</div>
      ${subjects.map(subject => {
        const progress = progressForSubject(subject.id);
        return `<div class="subject-report-row"><div class="report-subject-emoji tone-${subject.tone}">${subject.emoji}</div><div class="subject-report-body"><div><strong>${subject.name}</strong><span>预习 ${progress.previews}/${progress.lessons.length} · 复习 ${progress.reviews}/${progress.lessons.length}</span><b>${progress.percent}%</b></div><div class="track tone-${subject.tone}"><span style="width:${progress.percent}%"></span></div></div></div>`;
      }).join('')}</div>`;
  }

  function renderReport() {
    const tests = currentTests();
    const avg = tests.length ? Math.round(tests.reduce((acc, t) => acc + t.score, 0) / tests.length) : 0;
    const weekTotal = weekData().reduce((acc, d) => acc + d.count, 0);
    const latestActivities = currentActivities().slice(0, 6);
    const lessons = currentLessons();
    const previews = lessons.filter(lesson => state.previewDone.includes(lesson.id)).length;
    const reviews = lessons.filter(lesson => state.reviewDone.includes(lesson.id)).length;
    const stars = currentStars();
    return `<div class="report-page fade-in"><div class="page-heading"><div><span class="page-kicker">${gradeName(state.grade)} · ${semesterName(state.semester)} · 成长记录</span><h1>学习报告<span class="heading-dot">.</span></h1><p>用小小的数字，记录大大的成长与努力。</p></div><div class="heading-sticker">📈</div></div>
      <div class="report-top-grid"><div class="report-big-stat"><span class="report-big-stat-icon">⭐</span><p>本学期成长星星</p><h2>${stars} <small>颗</small></h2><span class="report-small-note">坚持学习，每天都有新收获</span></div><div class="report-small-stat"><span class="report-icon purple">${icon('book', 21)}</span><p>完成学习任务</p><h3>${previews + reviews} <small>次</small></h3></div><div class="report-small-stat"><span class="report-icon blue">${icon('quiz', 21)}</span><p>完成知识测试</p><h3>${tests.length} <small>次</small></h3></div><div class="report-small-stat"><span class="report-icon green">${icon('award', 21)}</span><p>测试平均成绩</p><h3>${tests.length ? avg : '—'} <small>${tests.length ? '分' : '待开启'}</small></h3></div></div>
      <div class="report-columns"><div class="report-left"><section class="panel report-week-panel"><div class="section-head"><div><h2>近 7 天学习记录</h2><p>本周共完成 ${weekTotal} 项学习活动</p></div><span class="report-chart-badge">${icon('chart', 16)} 最近一周</span></div>${weekChart()}</section>
        <section class="panel report-subjects"><div class="section-head"><div><h2>学科成长进度</h2><p>${gradeName(state.grade)}当前教材学科的学习进度</p></div></div>
          ${renderReportSubjectGroup('main')}</section></div>
        <div class="report-right"><section class="panel report-achievements"><div class="section-head"><div><h2>成长徽章</h2><p>努力就能点亮更多徽章</p></div></div><div class="achievement-list">
          ${[
            ['🌱', '启程小萌芽', '完成第一次预习', previews >= 1],
            ['📚', '记忆小高手', '完成 3 次复习', reviews >= 3],
            ['🏅', '勇敢闯关王', '完成 3 次测试', tests.length >= 3],
            ['🌟', '星星收藏家', '收集 50 颗星星', stars >= 50]
          ].map(([emoji, title, detail, unlocked]) => `<div class="achievement ${unlocked ? 'unlocked' : ''}"><span>${emoji}</span><div><strong>${title}</strong><small>${detail}</small></div><span class="achievement-status">${unlocked ? '已解锁' : '待解锁'}</span></div>`).join('')}
        </div></section><section class="panel report-timeline"><div class="section-head"><div><h2>最近学习动态</h2><p>成长的脚步，一步一步来</p></div></div>${latestActivities.length ? `<div class="timeline">${latestActivities.map(a => `<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${escapeHtml(a.title)}</strong><small>${dateLabel(a.at, true)} · ${new Date(a.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</small></div></div>`).join('')}</div>` : `<div class="timeline-empty">🌿<p>学习记录会出现在这里，开启你的第一课吧！</p></div>`}</section></div>
      </div></div>`;
  }

  function renderProfileModal() {
    return `<div class="modal-overlay" data-overlay="true"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="profile-title"><button class="modal-close" data-action="close-modal" aria-label="关闭">${icon('close', 20)}</button><div class="modal-emoji">🌟</div><h2 id="profile-title">设置我的学习昵称</h2><p>取一个你喜欢的名字，让星芽学堂认识你。</p><label for="name-field">学习昵称（最多 12 个字）</label><input id="name-field" maxlength="12" value="${escapeHtml(state.name)}" placeholder="例如：小星" /><button class="button primary-button wide" data-action="save-profile">保存昵称 ${icon('check', 17)}</button></div></div>`;
  }

  function renderGradeModal() {
    return `<div class="modal-overlay" data-overlay="true"><section class="modal-card grade-modal" role="dialog" aria-modal="true" aria-labelledby="grade-modal-title">
      <button class="modal-close" data-action="close-modal" aria-label="关闭年级选择">${icon('close', 20)}</button>
      <div class="modal-emoji">🎒</div><h2 id="grade-modal-title">选择年级和学期</h2>
      <p>每个年级都有上下学期，学习记录按年级和学期分别展示。</p>
      <div class="grade-picker-grid">${GRADES.map(grade => {
        const available = gradeIsAvailable(grade.id);
        const count = lessonsForGrade(grade.id).length;
        const upperCount = lessonsForSemester(grade.id, 1).length;
        const lowerCount = lessonsForSemester(grade.id, 2).length;
        const active = grade.id === state.grade;
        return `<button class="grade-option ${active ? 'is-current' : ''} ${available ? '' : 'is-locked'}" data-grade="${grade.id}" ${available ? '' : 'disabled aria-disabled="true"'}>
          <span class="grade-option-emoji">${grade.emoji}</span>
          <span class="grade-option-copy"><strong>${grade.name}</strong><small class="grade-main-subjects">主学科：${gradeSubjectNames(grade.id, 'mainSubjects') || '待配置'}</small><small>${available ? `上学期 ${upperCount} 项 · 下学期 ${lowerCount} 项${active ? ' · 当前年级' : ''}` : '暂未开放'}</small></span>
          <span class="grade-option-symbol">${available ? (active ? icon('circleCheck', 20) : icon('right', 19)) : '🔒'}</span>
        </button>`;
      }).join('')}</div>
      <div class="grade-modal-semester"><h3>${gradeName(state.grade)} · 选择学期</h3><p>切换后只显示这个学期的课程与学习记录</p>${renderSemesterTabs('modal')}</div>
      <div class="grade-note">${icon('book', 17)} 当前开放一、二年级统编语文和人教数学；三至六年级暂时锁定，课程与历史记录均已保留。</div>
    </section></div>`;
  }

  function renderReminderModal(today) {
    const checks = [today.preview, today.review, today.test];
    return `<div class="modal-overlay" data-overlay="true"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="reminder-title"><button class="modal-close" data-action="close-modal" aria-label="关闭">${icon('close', 20)}</button><div class="modal-emoji">🔔</div><h2 id="reminder-title">今天的学习提醒</h2><p>给自己定下三个轻松的小目标吧！</p><div class="reminder-list">${['预习一节新课', '复习一个知识点', '完成一次小测试'].map((label, i) => `<div>${checks[i] ? icon('circleCheck', 19) : icon('clock', 19)} <span>${label}</span><strong>${checks[i] ? '已完成' : '待完成'}</strong></div>`).join('')}</div><button class="button primary-button wide" data-action="reminder-go">开始学习 ${icon('arrow', 17)}</button></div></div>`;
  }

  function continueLearning() {
    const lessons = currentLessons().filter(lesson => subjectRole(lesson.subject, state.grade) === 'main');
    if (!lessons.length) { notify('当前学期暂无课程。'); return; }
    const today = todayCounts();
    if (!today.preview) {
      const next = lessons.find(l => !state.previewDone.includes(l.id)) || lessons[0];
      openLesson('preview', next.id);
    } else if (!today.review) {
      const next = lessons.find(l => state.previewDone.includes(l.id) && !state.reviewDone.includes(l.id)) || lessons.find(l => !state.reviewDone.includes(l.id)) || lessons[0];
      openLesson('review', next.id);
    } else if (!today.test) startQuiz('mixed');
    else {
      const next = lessons.find(l => !state.previewDone.includes(l.id));
      next ? openLesson('preview', next.id) : startQuiz('mixed');
    }
  }

  function speakLesson(id) {
    const lesson = LESSON_MAP[id];
    if (!lesson || !('speechSynthesis' in window)) { notify('当前浏览器暂不支持朗读。'); return; }
    window.speechSynthesis.cancel();
    const text = lesson.subject === 'english'
      ? lesson.concepts.map(c => c.example.split('（')[0]).join(' ')
      : lesson.concepts.map(c => `${c.title}。${c.text}。${c.example}`).join('。');
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = lesson.subject === 'english' ? 'en-US' : 'zh-CN';
    speech.rate = 0.86;
    window.speechSynthesis.speak(speech);
    notify('正在朗读本课知识 🔊');
  }

  document.addEventListener('click', event => {
    if (event.target.matches('[data-overlay]')) {
      ui.profileOpen = false; ui.reminderOpen = false; ui.gradeOpen = false; render(); return;
    }
    const gradeButton = event.target.closest('[data-grade]');
    if (gradeButton) { switchGrade(Number(gradeButton.dataset.grade)); return; }
    const semesterButton = event.target.closest('[data-semester]');
    if (semesterButton) { switchSemester(Number(semesterButton.dataset.semester)); return; }
    const catalogGrade = event.target.closest('[data-catalog-grade]');
    if (catalogGrade) {
      const grade = Number(catalogGrade.dataset.catalogGrade);
      if (!gradeIsAvailable(grade)) return;
      ui.catalog.grade = grade;
      if (!semesterIsAvailable(grade, ui.catalog.semester)) {
        ui.catalog.semester = SEMESTERS.find(item => semesterIsAvailable(grade, item.id))?.id || 1;
      }
      ui.catalog.subject = 'all'; ui.catalog.lessonId = null; ui.catalog.query = ''; ui.catalog.answersVisible = false;
      render(); return;
    }
    const catalogSemester = event.target.closest('[data-catalog-semester]');
    if (catalogSemester) {
      const semester = Number(catalogSemester.dataset.catalogSemester);
      if (!semesterIsAvailable(ui.catalog.grade, semester)) return;
      ui.catalog.semester = semester;
      ui.catalog.subject = 'all'; ui.catalog.lessonId = null; ui.catalog.query = ''; ui.catalog.answersVisible = false;
      render(); return;
    }
    const catalogSubject = event.target.closest('[data-catalog-subject]');
    if (catalogSubject) {
      ui.catalog.subject = catalogSubject.dataset.catalogSubject;
      ui.catalog.lessonId = null; ui.catalog.answersVisible = false;
      render(); return;
    }
    const catalogOpen = event.target.closest('[data-catalog-open]');
    if (catalogOpen) {
      const id = catalogOpen.dataset.catalogOpen;
      if (!catalogLessons().some(lesson => lesson.id === id)) return;
      ui.catalog.lessonId = id; ui.catalog.answersVisible = false;
      render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return;
    }
    const navButton = event.target.closest('[data-nav]');
    if (navButton) {
      ui.subject = navButton.dataset.subjectFilter || 'all';
      nav(navButton.dataset.nav); return;
    }
    const filter = event.target.closest('[data-filter]');
    if (filter) { ui.subject = filter.dataset.filter; render(); return; }
    const lessonButton = event.target.closest('[data-open-lesson]');
    if (lessonButton) { openLesson(lessonButton.dataset.mode, lessonButton.dataset.openLesson); return; }
    const step = event.target.closest('[data-step]');
    if (step && ui.detail) { ui.step = Number(step.dataset.step); ui.reveal = false; render(); return; }
    const flip = event.target.closest('[data-flip]');
    if (flip && ui.detail) {
      const i = Number(flip.dataset.flip);
      ui.flipped.add(i);
      ui.showingBack.has(i) ? ui.showingBack.delete(i) : ui.showingBack.add(i);
      render(); return;
    }
    const option = event.target.closest('[data-option]');
    if (option && ui.quiz && !ui.quiz.checked) { ui.quiz.selected = Number(option.dataset.option); render(); return; }
    const action = event.target.closest('[data-action]');
    if (!action) return;
    const a = action.dataset.action;
    if (a === 'catalog-search') {
      ui.catalog.query = document.querySelector('[data-catalog-search]')?.value || '';
      ui.catalog.lessonId = null; ui.catalog.answersVisible = false;
      render(); return;
    }
    if (a === 'catalog-clear') {
      ui.catalog.query = ''; ui.catalog.subject = 'all'; ui.catalog.lessonId = null;
      render(); return;
    }
    if (a === 'catalog-back') {
      ui.catalog.lessonId = null; ui.catalog.answersVisible = false;
      render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return;
    }
    if (a === 'catalog-toggle-answers') {
      const scrollPosition = window.scrollY;
      ui.catalog.answersVisible = !ui.catalog.answersVisible;
      render(); window.scrollTo(0, scrollPosition); return;
    }
    if (a === 'toggle-menu') { ui.menuOpen = !ui.menuOpen; render(); }
    else if (a === 'close-menu') { ui.menuOpen = false; render(); }
    else if (a === 'profile') { ui.profileOpen = true; render(); setTimeout(() => document.getElementById('name-field')?.focus(), 0); }
    else if (a === 'grade-picker') { ui.gradeOpen = true; ui.menuOpen = false; render(); }
    else if (a === 'reminders') { ui.reminderOpen = true; render(); }
    else if (a === 'close-modal') { ui.profileOpen = false; ui.reminderOpen = false; ui.gradeOpen = false; render(); }
    else if (a === 'save-profile') {
      const input = document.getElementById('name-field');
      const name = input ? input.value.trim().slice(0, 12) : '';
      if (!name) { notify('请输入一个可爱的学习昵称。'); return; }
      state.name = name; saveState(); ui.profileOpen = false; render(); notify('昵称已经保存啦！');
    }
    else if (a === 'continue' || a === 'reminder-go') { ui.reminderOpen = false; continueLearning(); }
    else if (a === 'task') {
      const kind = action.dataset.taskKind; const id = action.dataset.taskId;
      kind === 'quiz' ? startQuiz('subject', id) : openLesson(kind, id);
    }
    else if (a === 'subject-course') { ui.subject = action.dataset.id; nav('preview'); }
    else if (a === 'clear-search') { ui.search = ''; ui.subject = 'all'; render(); }
    else if (a === 'search-course') { ui.search = document.querySelector('[data-course-search]')?.value || ''; render(); }
    else if (a === 'back-lessons') { ui.detail = null; render(); }
    else if (a === 'next-step') { ui.step = Math.min(2, ui.step + 1); ui.reveal = false; render(); }
    else if (a === 'prev-step') { ui.step = Math.max(0, ui.step - 1); ui.reveal = false; render(); }
    else if (a === 'toggle-reveal') { ui.reveal = !ui.reveal; render(); }
    else if (a === 'finish-preview') markLesson('preview', action.dataset.lesson);
    else if (a === 'finish-review') {
      const lesson = LESSON_MAP[action.dataset.lesson];
      if (lesson && ui.flipped.size === lesson.review.length) markLesson('review', lesson.id);
    }
    else if (a === 'go-review') openLesson('review', action.dataset.lesson);
    else if (a === 'lesson-quiz') startQuiz('lesson', action.dataset.lesson);
    else if (a === 'speak') speakLesson(action.dataset.lesson);
    else if (a === 'start-unit-exam') {
      const subjectId = action.dataset.subject;
      const unit = document.querySelector(`[data-exam-unit="${subjectId}"]`)?.value;
      if (unit) startQuiz('unit', `${subjectId}::${unit}`);
      else notify('请先选择要测试的单元。');
    }
    else if (a === 'start-quiz' || a === 'retry-quiz') {
      const kind = action.dataset.kind;
      const subjectId = action.dataset.id || '';
      startQuiz(kind, subjectId);
    }
    else if (a === 'confirm-answer') confirmAnswer();
    else if (a === 'next-question') {
      if (!ui.quiz || !ui.quiz.checked) return;
      if (ui.quiz.index === ui.quiz.questions.length - 1) finishQuiz();
      else { ui.quiz.index++; ui.quiz.selected = null; ui.quiz.checked = false; render(); }
    }
    else if (a === 'toggle-mistake') {
      const id = action.dataset.id;
      ui.mistakeExpanded.has(id) ? ui.mistakeExpanded.delete(id) : ui.mistakeExpanded.add(id);
      render();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (ui.profileOpen || ui.reminderOpen || ui.gradeOpen)) {
      ui.profileOpen = false; ui.reminderOpen = false; ui.gradeOpen = false; render(); return;
    }
    if (event.target.matches('[data-search]') && event.key === 'Enter') {
      if (ui.page === 'catalog') {
        ui.catalog.query = event.target.value;
        ui.catalog.lessonId = null; ui.catalog.answersVisible = false;
        render(); return;
      }
      ui.search = event.target.value;
      ui.subject = 'all';
      nav('preview'); return;
    }
    if (event.target.matches('[data-catalog-search]') && event.key === 'Enter') {
      event.preventDefault();
      ui.catalog.query = event.target.value;
      ui.catalog.lessonId = null; ui.catalog.answersVisible = false;
      render(); return;
    }
    if (event.target.matches('[data-course-search]') && event.key === 'Enter') {
      ui.search = event.target.value;
      render(); return;
    }
    if (event.target.id === 'name-field' && event.key === 'Enter') {
      event.preventDefault(); document.querySelector('[data-action="save-profile"]')?.click(); return;
    }
    if (!ui.quiz || event.target.matches('input, textarea, select')) return;
    if (/^[1-4]$/.test(event.key) && !ui.quiz.checked) {
      ui.quiz.selected = Number(event.key) - 1;
      render();
    } else if (event.key === 'Enter' && event.target === document.body) {
      if (!ui.quiz.checked) confirmAnswer();
      else document.querySelector('[data-action="next-question"]')?.click();
    }
  });

  render();
})();
