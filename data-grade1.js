// 一年级通用主题示例。每课含预习、复习卡片与 4 道选择题。
// 后续增加年级时可仿照本文件创建 data-grade3.js 等，加载顺序应在 app.js 之前。
(function () {
  'use strict';
  const data = window.LEARNING_DATA;
  if (!data || !Array.isArray(data.lessons)) throw new Error('请先加载 data.js');

  data.lessons.push(
    {
      id: 'g1-cn-pinyin', grade: 1, semester: 1, subject: 'chinese', title: '拼音朋友 b p m f',
      unit: '第一单元 · 汉语拼音', emoji: '🔤', minutes: 12,
      description: '认识四个声母，听一听、读一读，发现拼音的小秘密。',
      goals: ['认识声母 b、p、m、f', '分清 b 和 p 的字形', '尝试拼读简单音节'],
      think: '说“爸爸、妈妈”的时候，你听到了哪些熟悉的声音？',
      hint: '“爸”可以读作 bà，“妈”可以读作 mā。',
      concepts: [
        { title: '认识四个声母', text: 'b、p、m、f 都是声母。可以一边读一边观察嘴巴的动作。', example: '声母 b 加韵母 a，可以拼出 ba。' },
        { title: '区分 b 和 p', text: 'b 占上格和中格，p 占中格和下格。它们的半圆都在竖的右边，要注意竖伸出的方向。', example: '拼音卡片：b—ba，p—pa，m—ma，f—fa。' }
      ],
      practice: '在纸上写出 b、p、m、f，再和家人读一读。',
      practiceAnswer: '四个声母是 b、p、m、f。可以练习拼读 ba、pa、ma、fa。',
      review: [
        ['今天学的四个声母是什么？', 'b、p、m、f。'],
        ['“妈妈”的“妈”可以拼成哪个音节？', 'mā。'],
        ['声母 b 与韵母 a 可以拼成什么？', 'ba。']
      ],
      questions: [
        ['下面哪一个是声母？', ['a', 'o', 'm', 'e'], 2, 'm 是声母，a、o、e 是单韵母。'],
        ['声母 b 和 a 拼在一起是？', ['ma', 'ba', 'fa', 'pa'], 1, 'b + a = ba。'],
        ['“妈妈”的“妈”以哪个声母开头？', ['f', 'p', 'b', 'm'], 3, '“妈”的音节是 mā，声母是 m。'],
        ['下列哪组全部是声母？', ['a o e', 'i u ü', 'b p m f', 'a i b'], 2, 'b、p、m、f 都是声母。']
      ]
    },
    {
      id: 'g1-cn-characters', grade: 1, semester: 1, subject: 'chinese', title: '识字：日月水火',
      unit: '第二单元 · 识字', emoji: '☀️', minutes: 12,
      description: '从大自然认识四个汉字，了解有趣的象形字。',
      goals: ['认识“日、月、水、火”', '知道汉字可以组成词语', '尝试观察象形字的特点'],
      think: '太阳、月亮、河流和火苗，在汉字里分别叫什么？',
      hint: '想想“日出”“月亮”“喝水”“火山”这几个词。',
      concepts: [
        { title: '认一认', text: '日表示太阳，月表示月亮，水表示水，火表示火焰。', example: '组词：日出、月光、河水、火山。' },
        { title: '有趣的象形字', text: '一些古老汉字的形状来自事物的样子，这类字叫象形字。', example: '古时候“日”的字形像圆圆的太阳。' }
      ],
      practice: '用“日”或“月”组两个词，再选一个词说一句话。',
      practiceAnswer: '日出、月光。例句：夜晚的月光照在窗前。',
      review: [
        ['“日”表示什么？', '太阳。'],
        ['“水”可以组成什么词？', '河水、开水、喝水等。'],
        ['什么是象形字？', '字形来自事物形状的一类古老汉字。']
      ],
      questions: [
        ['“月”可以组成哪个词？', ['月亮', '大山', '小鸟', '桌子'], 0, '“月亮”的“月”就是今天认识的字。'],
        ['“日”表示？', ['树木', '太阳', '小鱼', '房子'], 1, '“日”本来就与太阳有关。'],
        ['下面哪个字与水有关？', ['火', '日', '水', '月'], 2, '“水”表示水流或水。'],
        ['“火山”中的第一个字是？', ['月', '水', '日', '火'], 3, '“火山”由“火”和“山”组成。']
      ]
    },
    {
      id: 'g1-cn-poem', grade: 1, semester: 2, subject: 'chinese', title: '古诗《静夜思》',
      unit: '第三单元 · 古诗', emoji: '🌙', minutes: 13,
      description: '跟着李白赏月，读懂诗人想念家乡的心情。',
      goals: ['朗读《静夜思》', '知道作者是李白', '理解“思故乡”的意思'],
      think: '晚上看到明亮的月亮时，你会想起什么人或地方？',
      hint: '想想你有没有想念远方家人的时候。',
      concepts: [
        { title: '读一读古诗', text: '床前明月光，疑是地上霜。举头望明月，低头思故乡。', example: '作者是唐代诗人李白。' },
        { title: '读懂诗人的心情', text: '“举头”是抬起头，“思故乡”是思念自己的家乡。', example: '诗人抬头望着月亮，又低头想起家乡。' }
      ],
      practice: '补全诗句：“举头望明月，________。”',
      practiceAnswer: '低头思故乡。',
      review: [
        ['《静夜思》的作者是谁？', '唐代诗人李白。'],
        ['“举头”是什么意思？', '抬起头。'],
        ['“低头思故乡”的上一句是什么？', '举头望明月。']
      ],
      questions: [
        ['《静夜思》的作者是？', ['李白', '杜甫', '王维', '孟浩然'], 0, '《静夜思》是李白写的。'],
        ['“举头”是什么意思？', ['低头', '抬头', '回头', '摇头'], 1, '“举头”就是抬头。'],
        ['“低头思故乡”中的“思”表示？', ['想念', '奔跑', '唱歌', '绘画'], 0, '这里的“思”表示思念。'],
        ['“举头望明月”的下一句是？', ['春眠不觉晓', '白日依山尽', '低头思故乡', '处处闻啼鸟'], 2, '最后两句是“举头望明月，低头思故乡”。']
      ]
    },
    {
      id: 'g1-cn-sentence', grade: 1, semester: 2, subject: 'chinese', title: '写话：我的校园',
      unit: '第四单元 · 口语与写话', emoji: '🏫', minutes: 12,
      description: '从身边熟悉的校园出发，练习说清一句完整的话。',
      goals: ['会用完整句子表达想法', '认识句号和问号的用途', '练习说一两句校园里的事情'],
      think: '在校园里，你最喜欢什么地方？为什么？',
      hint: '可以说“我最喜欢……，因为……”。',
      concepts: [
        { title: '把话说完整', text: '说清楚“谁在哪里做什么”，别人就容易听懂。', example: '下课了，同学们在操场上跳绳。' },
        { title: '标点小朋友', text: '说完一句话通常用句号“。”；提出问题通常用问号“？”。', example: '你喜欢校园里的花园吗？我喜欢。' }
      ],
      practice: '用一句完整的话介绍校园里你喜欢的一个地方。',
      practiceAnswer: '我喜欢学校的图书角，因为那里有很多有趣的书。',
      review: [
        ['完整句子通常要说清什么？', '谁在哪里做什么。'],
        ['一句表示疑问的话结尾用什么？', '问号（？）。'],
        ['介绍校园可以说些什么？', '自己喜欢的地点和原因。']
      ],
      questions: [
        ['下面哪一句表达完整？', ['我在', '学校很', '小鸟在树上唱歌。', '操场上有'], 2, '这句话清楚地说出了小鸟在做什么。'],
        ['问句最后应该用？', ['。', '，', '？', '、'], 2, '提问时要用问号。'],
        ['“我喜欢校园里的花园。”最后用的是？', ['句号', '问号', '逗号', '叹号'], 0, '陈述句通常用句号结束。'],
        ['哪一句在介绍校园？', ['我喜欢学校的操场。', '苹果是红色的。', '小鱼在水里游。', '月亮出来了。'], 0, '这句话说出了对校园操场的喜爱。']
      ]
    },
    {
      id: 'g1-ma-count', grade: 1, semester: 1, subject: 'math', title: '认识 0～10',
      unit: '第一单元 · 数的认识', emoji: '🔢', minutes: 10,
      description: '数一数生活中的物品，认识 0 到 10，比较大小。',
      goals: ['会按顺序数 0～10', '知道 0 可以表示一个也没有', '能比较 10 以内数的大小'],
      think: '桌上有 3 支铅笔，拿走 3 支，还剩几支？',
      hint: '没有剩下的物品，可以用数字 0 表示。',
      concepts: [
        { title: '数数真有趣', text: '数字依次是 0、1、2、3、4、5、6、7、8、9、10。', example: '5 后面是 6，9 后面是 10。' },
        { title: '比较大小', text: '比较两个数时，可以用 ＞、＜ 或 ＝。', example: '7 ＞ 4，3 ＜ 8，5 ＝ 5。' }
      ],
      practice: '填一填：3，4，__，6，__。',
      practiceAnswer: '依次填 5 和 7。',
      review: [
        ['数字 0 可以表示什么？', '一个也没有。'],
        ['6 后面是几？', '7。'],
        ['8 和 5 哪个大？', '8 更大。']
      ],
      questions: [
        ['5 后面的数是？', ['4', '6', '7', '3'], 1, '依次往后数，5 后面是 6。'],
        ['下面哪个数最大？', ['3', '7', '5', '2'], 1, '7 比 3、5、2 都大。'],
        ['篮子里一个苹果也没有，可以用几表示？', ['1', '2', '0', '10'], 2, '0 可以表示一个也没有。'],
        ['3 ＜（ ）', ['1', '2', '3', '4'], 3, '4 比 3 大，所以 3＜4。']
      ]
    },
    {
      id: 'g1-ma-add', grade: 1, semester: 1, subject: 'math', title: '10 以内加减法',
      unit: '第二单元 · 加减法', emoji: '🍎', minutes: 13,
      description: '用水果和小积木练习 10 以内的加法、减法。',
      goals: ['理解加法表示合起来', '理解减法表示拿走', '正确计算 10 以内加减法'],
      think: '你有 4 颗糖，朋友又送来 3 颗，现在有几颗？',
      hint: '合起来可以用加法：4 + 3。',
      concepts: [
        { title: '加法：合起来', text: '把两部分放在一起，可以用加法计算。', example: '4 + 3 = 7（颗）。' },
        { title: '减法：拿走了', text: '从原来的数量中拿走一部分，可以用减法计算。', example: '9 - 4 = 5（个）。' }
      ],
      practice: '树上有 8 只小鸟，飞走 3 只，还剩几只？',
      practiceAnswer: '8 - 3 = 5（只）。',
      review: [
        ['5 + 2 等于几？', '7。'],
        ['9 - 4 等于几？', '5。'],
        ['“拿走一部分”通常用什么运算？', '减法。']
      ],
      questions: [
        ['3 + 4 = ？', ['6', '7', '8', '9'], 1, '3 加 4 等于 7。'],
        ['9 - 6 = ？', ['2', '4', '3', '5'], 2, '9 减 6 等于 3。'],
        ['2 + 5 = ？', ['5', '6', '7', '8'], 2, '2+5=7。'],
        ['原来有 8 朵花，送走 2 朵，还剩？', ['6 朵', '10 朵', '5 朵', '4 朵'], 0, '8-2=6（朵）。']
      ]
    },
    {
      id: 'g1-ma-teen', grade: 1, semester: 2, subject: 'math', title: '20 以内进位加法',
      unit: '第三单元 · 计算', emoji: '🧮', minutes: 14,
      description: '学习“凑十法”，让 9 加几、8 加几变得简单。',
      goals: ['知道 10 可以拆成两个数', '尝试使用凑十法', '正确计算简单的进位加法'],
      think: '9 + 4 怎样算得更快？可以先把 9 变成 10 吗？',
      hint: '把 4 分成 1 和 3，先算 9+1。',
      concepts: [
        { title: '凑十法', text: '计算 9 + 4，先从 4 里面拿出 1 给 9 凑成 10，再加剩下的 3。', example: '9 + 4 = 10 + 3 = 13。' },
        { title: '拆分更容易', text: '8 + 5 可以把 5 分成 2 和 3，先算 8+2=10。', example: '8 + 5 = 10 + 3 = 13。' }
      ],
      practice: '用凑十法计算 9 + 6。',
      practiceAnswer: '9+6=9+1+5=15。',
      review: [
        ['9 + 4 = ？', '13。'],
        ['8 需要加几才能凑成 10？', '2。'],
        ['凑十法先要凑成什么数？', '10。']
      ],
      questions: [
        ['9 + 4 = ？', ['12', '13', '14', '15'], 1, '9+1=10，再加3，得到13。'],
        ['8 + 5 = ？', ['12', '14', '13', '15'], 2, '8+2=10，再加3，得到13。'],
        ['7 需要加几才能凑成 10？', ['2', '4', '5', '3'], 3, '7+3=10。'],
        ['9 + 6 = ？', ['13', '14', '15', '16'], 2, '9+1+5=15。']
      ]
    },
    {
      id: 'g1-ma-time', grade: 1, semester: 2, subject: 'math', title: '认识整时',
      unit: '第四单元 · 认识钟表', emoji: '⏰', minutes: 11,
      description: '找一找时针和分针，学会看钟面上的整点时间。',
      goals: ['认识钟面上的 12 个数字', '分清时针和分针', '能准确读出整时'],
      think: '你早上大约几点上学？钟面上的长针和短针有什么不同？',
      hint: '分针通常比较长，时针比较短。',
      concepts: [
        { title: '时针和分针', text: '钟面上较短的针一般是时针，较长的针一般是分针。', example: '看整时时，先找到时针指向的数字。' },
        { title: '整时怎么读', text: '分针指向 12，时针指向几，就是几点整。', example: '分针指向 12、时针指向 7，是 7:00（7 点整）。' }
      ],
      practice: '分针指向 12，时针指向 9，是几点整？',
      practiceAnswer: '9 点整，也可以写成 9:00。',
      review: [
        ['短针一般叫什么？', '时针。'],
        ['整时分针指向哪个数字？', '12。'],
        ['分针指向 12，时针指向 6，是几点？', '6:00（6 点整）。']
      ],
      questions: [
        ['钟面上比较短的针通常是？', ['分针', '时针', '秒针', '刻度'], 1, '较短的针一般是时针。'],
        ['整时的时候，分针指向？', ['3', '6', '9', '12'], 3, '分针指向12表示整时。'],
        ['分针指向12、时针指向8，是？', ['8:00', '8:30', '12:08', '6:00'], 0, '8:00 就是 8 点整。'],
        ['钟面上有几个小时数字？', ['10', '11', '12', '13'], 2, '钟面从1到12共有12个小时数字。']
      ]
    },
    {
      id: 'g1-en-hello', grade: 1, semester: 1, subject: 'english', title: 'Hello, Friends!',
      unit: '英语启蒙 · 问候', emoji: '👋', minutes: 9,
      description: '认识 Hello 和 Hi，学会友好地向朋友打招呼。',
      goals: ['会说 Hello 和 Hi', '知道 Goodbye 的意思', '敢于大声说一句英语'],
      think: '看见好朋友，你想用英语说什么？',
      hint: '可以挥挥手，说 Hello! 或 Hi!',
      concepts: [
        { title: 'Say Hello', text: 'Hello! 和 Hi! 都表示“你好”。', example: 'Hello, Amy! Hi, Tom!' },
        { title: 'Say Goodbye', text: '要分别的时候可以说 Goodbye!（再见）。', example: 'Goodbye, friends!' }
      ],
      practice: '向家人说一句 Hello，再用 Goodbye 告别。',
      practiceAnswer: 'Hello!（你好！）Goodbye!（再见！）',
      review: [
        ['“你好”可以说什么？', 'Hello / Hi。'],
        ['“再见”的英语是什么？', 'Goodbye。'],
        ['见到朋友能怎样打招呼？', 'Hello, friend!']
      ],
      questions: [
        ['“你好”的英语是？', ['Cat', 'Hello', 'Red', 'One'], 1, 'Hello 表示你好。'],
        ['“Goodbye”表示？', ['再见', '谢谢', '老师', '你好'], 0, 'Goodbye 是再见。'],
        ['下面哪个词也可以表示“你好”？', ['Dog', 'Two', 'Hi', 'Blue'], 2, 'Hi 和 Hello 都可以用来打招呼。'],
        ['见到朋友打招呼最合适说？', ['Goodbye!', 'A fish!', 'Three!', 'Hello!'], 3, 'Hello! 是常见的见面问候。']
      ]
    },
    {
      id: 'g1-en-numbers', grade: 1, semester: 1, subject: 'english', title: 'Numbers 1–10',
      unit: '英语启蒙 · 数字', emoji: '🔟', minutes: 10,
      description: '用英语从一数到十，边数边拍手。',
      goals: ['认识 one、two、three、four、five', '能跟着数 six 到 ten', '把单词和数字对应起来'],
      think: '你知道数字 1、2、3 用英语怎么说吗？',
      hint: '试着数 one, two, three!',
      concepts: [
        { title: 'Count 1 to 5', text: 'one 1，two 2，three 3，four 4，five 5。', example: 'One, two, three, four, five.' },
        { title: 'Count 6 to 10', text: 'six 6，seven 7，eight 8，nine 9，ten 10。', example: 'Six, seven, eight, nine, ten.' }
      ],
      practice: '边伸出手指边从 one 数到 five。',
      practiceAnswer: 'one, two, three, four, five。',
      review: [
        ['数字 1 的英语是什么？', 'one。'],
        ['数字 5 的英语是什么？', 'five。'],
        ['ten 对应数字几？', '10。']
      ],
      questions: [
        ['“three”表示数字几？', ['1', '2', '3', '4'], 2, 'three 是 3。'],
        ['数字 5 的英语是？', ['five', 'four', 'two', 'ten'], 0, 'five 表示5。'],
        ['“eight”表示？', ['6', '7', '8', '9'], 2, 'eight 是8。'],
        ['数字 10 的英语是？', ['six', 'nine', 'one', 'ten'], 3, 'ten 表示10。']
      ]
    },
    {
      id: 'g1-en-colors', grade: 1, semester: 2, subject: 'english', title: 'My Colors',
      unit: '英语启蒙 · 颜色', emoji: '🎨', minutes: 10,
      description: '认识红、黄、蓝、绿四种颜色的英语说法。',
      goals: ['会读 red、yellow、blue、green', '能把单词与颜色对应', '尝试说喜欢的颜色'],
      think: '你最喜欢什么颜色？找到它的英文名字吧！',
      hint: '红色 red，黄色 yellow。',
      concepts: [
        { title: 'Warm colors', text: 'red 是红色，yellow 是黄色。', example: 'Red! Yellow!' },
        { title: 'Cool colors', text: 'blue 是蓝色，green 是绿色。', example: 'Blue! Green!' }
      ],
      practice: '找一件红色物品，说出 red，再找一件蓝色物品说 blue。',
      practiceAnswer: 'red（红色），blue（蓝色）。',
      review: [
        ['红色用英语怎么说？', 'red。'],
        ['blue 是什么颜色？', '蓝色。'],
        ['green 是什么颜色？', '绿色。']
      ],
      questions: [
        ['红色的英语是？', ['green', 'blue', 'red', 'yellow'], 2, 'red 是红色。'],
        ['“yellow”表示？', ['黄色', '蓝色', '绿色', '红色'], 0, 'yellow 是黄色。'],
        ['蓝色的英语是？', ['red', 'blue', 'green', 'yellow'], 1, 'blue 是蓝色。'],
        ['“green”表示？', ['红色', '蓝色', '黄色', '绿色'], 3, 'green 是绿色。']
      ]
    },
    {
      id: 'g1-en-animals', grade: 1, semester: 2, subject: 'english', title: 'Animal Friends',
      unit: '英语启蒙 · 动物', emoji: '🐱', minutes: 9,
      description: '认识可爱的小猫、小狗、小鸟和小鱼。',
      goals: ['会读 cat、dog、bird、fish', '能看图想单词', '尝试介绍喜欢的小动物'],
      think: '你喜欢小猫还是小狗？它们用英语怎么说？',
      hint: '小猫 cat，小狗 dog。',
      concepts: [
        { title: 'Pets at home', text: 'cat 是猫，dog 是狗。', example: 'A cat. A dog.' },
        { title: 'Other animal friends', text: 'bird 是鸟，fish 是鱼。', example: 'A bird. A fish.' }
      ],
      practice: '指着一只小猫的图片，说出它的英语名字。',
      practiceAnswer: 'cat（猫）。',
      review: [
        ['dog 是什么动物？', '狗。'],
        ['小鸟的英语是什么？', 'bird。'],
        ['fish 是什么动物？', '鱼。']
      ],
      questions: [
        ['“cat”表示？', ['小狗', '小猫', '小鸟', '小鱼'], 1, 'cat 是猫。'],
        ['“dog”表示？', ['小鱼', '小鸟', '小狗', '小猫'], 2, 'dog 是狗。'],
        ['“bird”表示？', ['小鸟', '小狗', '小猫', '小鱼'], 0, 'bird 是鸟。'],
        ['“fish”表示？', ['小猫', '小狗', '小鸟', '小鱼'], 3, 'fish 是鱼。']
      ]
    }
  );
})();
