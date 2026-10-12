// 星芽学堂的基础配置；教材学习数据由 data-pep-2024.js 与 data-grade3-6.js 加载。
window.LEARNING_DATA = {
  // 当前开放的年级；后续开放三至六年级，只需在这里增加对应 ID。
  openGrades: [1, 2],
  semesters: [
    { id: 1, name: '上学期', short: '上' },
    { id: 2, name: '下学期', short: '下' }
  ],
  grades: [
    { id: 1, name: '一年级', emoji: '🌱', slogan: '从好奇开始，发现学习的快乐', mainSubjects: ['chinese', 'math'], extensionSubjects: [] },
    { id: 2, name: '二年级', emoji: '🚀', slogan: '每天进步一点点，成为知识小达人', mainSubjects: ['chinese', 'math'], extensionSubjects: [] },
    { id: 3, name: '三年级', emoji: '🌻', slogan: '持续探索，收获新本领', mainSubjects: ['chinese', 'math', 'english'], extensionSubjects: [] },
    { id: 4, name: '四年级', emoji: '🪁', slogan: '勇敢思考，自信成长', mainSubjects: ['chinese', 'math', 'english'], extensionSubjects: [] },
    { id: 5, name: '五年级', emoji: '🔭', slogan: '用知识打开更广阔的世界', mainSubjects: ['chinese', 'math', 'english'], extensionSubjects: [] },
    { id: 6, name: '六年级', emoji: '🏅', slogan: '积累实力，迎接新的旅程', mainSubjects: ['chinese', 'math', 'english'], extensionSubjects: [] }
  ],
  subjects: [
    { id: 'chinese', name: '语文', short: '语', emoji: '📖', subtitle: '识字 · 阅读 · 表达', tone: 'orange', slogan: '在文字里发现美好' },
    { id: 'math', name: '数学', short: '数', emoji: '🧮', subtitle: '计算 · 思维 · 应用', tone: 'blue', slogan: '让每道题都变有趣' },
    { id: 'english', name: '英语', short: '英', emoji: '🌈', subtitle: '单词 · 对话 · 听说', tone: 'green', slogan: '勇敢说出第一句英语' }
  ],
  lessons: []
};
