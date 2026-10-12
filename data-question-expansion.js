// 分单元扩展的原创题库。全部为根据现有导学主题生成的练习，非出版社原题。
// 题目具有稳定 ID，便于跨考试去重、保存成绩和错题。
(function () {
  'use strict';
  const data = window.LEARNING_DATA;
  const all = data.lessons;
  const extra = [];
  const seen = new Set((data.examQuestions || []).map(q => [q.grade, q.semester, q.subject, q.unit, q.prompt].join('|')));

  function hash(str) {
    let result = 2166136261;
    for (const char of str) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
    return result >>> 0;
  }

  function add(lesson, key, prompt, correct, wrong, explanation) {
    const answer = String(correct);
    const distractors = [...new Set(wrong.map(String))].filter(value => value !== answer).slice(0, 3);
    if (distractors.length !== 3 || !prompt || !explanation) return;
    const identity = [lesson.grade, lesson.semester, lesson.subject, lesson.unit, prompt].join('|');
    if (seen.has(identity)) return;
    seen.add(identity);
    const index = hash(lesson.id + ':' + key) % 4;
    const options = distractors.slice();
    options.splice(index, 0, answer);
    extra.push({
      id: `xp-${lesson.id}-${key}`, lessonId: lesson.id,
      grade: lesson.grade, semester: lesson.semester, subject: lesson.subject,
      unit: lesson.unit, lessonTitle: lesson.title,
      prompt, options, answer: index, explanation
    });
  }

  function integer(lesson, key, prompt, result, explanation, step = 1, suffix = '') {
    const num = Number(result);
    if (!Number.isFinite(num)) return;
    const n = value => String(Number(value.toFixed(3))) + suffix;
    const candidates = [num + step, num - step, num + 2 * step, num - 2 * step,
      num + 3 * step, num + 4 * step, num * 2, num / 2];
    const wrong = [...new Set(candidates.map(n))].filter(value => value !== n(num)).slice(0, 3);
    add(lesson, key, prompt, n(num), wrong, explanation);
  }

  function wordsQuestion(lesson, key, prompt, correct, alternatives, explanation) {
    const wrong = [...new Set(alternatives.map(String))].filter(item => item !== String(correct));
    if (wrong.length < 3) return;
    add(lesson, key, prompt, correct, wrong, explanation);
  }

  function mathKind(lesson) {
    const t = lesson.title;
    const u = lesson.unit;
    const both = t + ' ' + u;
    if (/圆柱|圆锥/.test(both)) return 'cylinder';
    if (/圆的|扇形|圆周|圆面积|第五单元 · 圆/.test(both)) return 'circle';
    if (/长方体|正方体|体积|容积|表面积/.test(both)) return 'volume';
    if (/分数.*(乘法|除法|加法|减法)|分数乘|分数除|倒数/.test(both)) return 'fractionOperation';
    if (/分数的初步认识|分数的意义|分数的基本性质|约分|通分/.test(both)) return 'fraction';
    if (/百分数|折扣|税率|成数|利率/.test(both)) return 'percent';
    if (/比例|按比例|比例尺|正比例|反比例|比的意义|化简比|^第四单元 · 比$/.test(both)) return 'ratio';
    if (/简易方程|等式的性质|列方程|解简易方程/.test(both)) return 'equation';
    if (/小数乘/.test(both)) return 'decimalMultiply';
    if (/小数除/.test(both)) return 'decimalDivide';
    if (/小数加|小数的加法|小数的减法/.test(both)) return 'decimalAdd';
    if (/小数|近似数/.test(both)) return 'decimal';
    if (/负数/.test(both)) return 'negative';
    if (/鸡兔同笼/.test(both)) return 'chicken';
    if (/鸽巢/.test(both)) return 'pigeon';
    if (/植树问题/.test(both)) return 'planting';
    if (/搭配|排列|组合/.test(both)) return 'pairing';
    if (/找次品/.test(both)) return 'weighing';
    if (/数学广角|优化|数与形|规律/.test(both)) return 'pattern';
    if (/可能性/.test(both)) return 'probability';
    if (/统计|平均数|数据分析/.test(both)) return 'statistics';
    if (/年、月、日|年月日|时计时|经过时间|时间在哪里/.test(both)) return 'time';
    if (/公顷|平方千米/.test(both)) return 'hectare';
    if (lesson.grade === 4 && lesson.semester === 1 && /平行四边形和梯形/.test(u)) return 'quadrilateral';
    if (lesson.grade === 4 && lesson.semester === 2 && /三角形/.test(u)) return 'triangle';
    if (/面积|三角形|梯形|平行四边形/.test(both) && !/平面图形/.test(both)) return 'area';
    if (/角的|角度|线和角|射线|直线|垂直|平行线/.test(both)) return 'angles';
    if (/图形的运动|平移|旋转|轴对称/.test(both)) return 'transform';
    if (/观察物体/.test(both)) return 'observe';
    if (/立体图形|平面图形/.test(both)) return 'shape';
    if (/千米|厘米|毫米|分米|长度|身体上的尺/.test(both)) return 'length';
    if (/克|千克|称重|质量/.test(both)) return 'weight';
    if (/方向|路线图|校园小导游/.test(both)) return 'direction';
    if (/位置|数对/.test(both)) return 'position';
    if (/混合运算|四则运算|运算定律/.test(both)) return 'mixed';
    if (/有余数|除数是|除法|乘除关系|表内除/.test(both)) return 'divide';
    if (/乘法|多位数乘|笔算乘|表内乘/.test(both)) return 'multiply';
    if (/加、减|加法|减法|加减|退位|进位/.test(both)) return 'add';
    if (/数的认识|读写|万以内|11～20|数位|大数|数的大小|认识5|0的认识/.test(both)) return 'place';
    if (/分类|整理/.test(both)) return 'classify';
    return 'add';
  }

  function addMath(lesson) {
    const kind = mathKind(lesson);
    const seed = hash(lesson.id);
    const grade = lesson.grade;
    const pick = (i, start, size, factor = 1, offset = 0) => start + ((seed + offset + i * factor) % size);
    for (let i = 0; i < 12; i++) {
      const key = `m${i}`;
      const n = pick(i, 2, 7, 13);
      const m = pick(i, 3, 8, 19);
      const small = grade === 1 ? 4 : grade === 2 ? 10 : grade === 3 ? 30 : 100;
      const left = pick(i, 1, small, 17);
      const right = pick(i, 1, small, 23, 3);
      let prompt, result, explanation, step = 1, suffix = '';
      if (kind === 'add') {
        const upper = grade === 1 ? (/5以内/.test(lesson.unit) ? 5 : /6～10/.test(lesson.unit) ? 10 : 20)
          : grade === 2 ? (/万以内/.test(lesson.unit) ? 9999 : 100) : grade === 3 ? 999 : 9999;
        const start = /退位/.test(lesson.unit) ? 11 : Math.max(2, Math.floor(upper / 3));
        const a = pick(i, start, Math.max(1, upper - start), 17);
        const b = pick(i, 1, Math.max(2, upper - 1), 23, 7);
        if (/退位/.test(lesson.unit) || i % 3 === 0) {
          const take = /退位/.test(lesson.unit) ? Math.min(a, (a % 10) + 1 + i % 3) : Math.min(a, b);
          prompt = `有${a}本书，借走${take}本，还剩几本？`;
          result = a - take; explanation = `${a}－${take}＝${result}（本）。`;
        } else {
          const second = Math.min(b, upper - a);
          prompt = i % 3 === 1 ? `${a}＋${second}＝？` : `原来有${a}支铅笔，新买${second}支，现在一共有多少支？`;
          result = a + second; explanation = `${a}＋${second}＝${result}。`;
        }
      } else if (kind === 'place') {
        const base = grade === 1 ? 20 : grade === 2 ? (/万以内/.test(lesson.unit) ? 9999 : 100) : grade === 3 ? 999 : 100000;
        const value = pick(i, 10, base - 9, 109), digit = Math.floor(value / 10) % 10;
        if (i % 3 === 0) {
          prompt = `数${value}的十位数字是几？`; result = digit;
          explanation = `十位从右边数第二位，${value}的十位是${digit}。`;
        } else if (i % 3 === 1) {
          prompt = `数${value}的个位数字是几？`; result = value % 10;
          explanation = `${value}的个位是${result}。`;
        } else {
          const stepValue = grade === 1 ? 1 : base <= 100 ? 10 : 100;
          const operation = value + stepValue <= base ? '加上' : '减去';
          prompt = `${value}${operation}${stepValue}等于多少？`;
          result = operation === '加上' ? value + stepValue : value - stepValue;
          explanation = `${value}${operation}${stepValue}，得到${result}。`;
        }
      } else if (kind === 'multiply') {
        const multiplicationTableLimit = /1～6/.test(lesson.unit) ? 6 : 9;
        const a = grade <= 2 ? 2 + ((n + i) % (multiplicationTableLimit - 1))
          : grade === 3 ? (/两位数乘两位数/.test(lesson.unit) ? 10 + n : 10 + 3 * n) : 100 + 9 * n;
        const b = grade <= 2 ? 2 + ((m + i * 2) % (multiplicationTableLimit - 1))
          : grade === 3 && /两位数乘两位数/.test(lesson.unit) ? 10 + m : grade === 3 ? m : 10 + m;
        prompt = i % 2 ? `${a}×${b}＝？` : `每组${a}人，有${b}组，一共有多少人？`;
        result = a * b; explanation = `${a}×${b}＝${result}。`;
      } else if (kind === 'divide') {
        const tableLimit = /1～6/.test(lesson.unit) ? 6 : 9;
        const divisor = grade <= 2 ? 2 + ((n + i) % (tableLimit - 1)) : n;
        const quotient = grade <= 2 ? 2 + ((m + i) % (tableLimit - 1)) : m + 10;
        const remainder = /有余数/.test(lesson.unit) ? (i % (divisor - 1)) + 1 : 0;
        const total = divisor * quotient + remainder;
        if (remainder && i % 2 === 1) {
          prompt = `${total}颗糖，每袋装${divisor}颗，装满${quotient}袋后还剩几颗？`;
          result = remainder; explanation = `${total}＝${divisor}×${quotient}＋${remainder}。`;
        } else {
          prompt = `${total}个苹果，每盒能装${divisor}个，最多能装满几盒？`;
          result = quotient; explanation = `${total}÷${divisor}＝${quotient}${remainder ? `余${remainder}` : ''}。`;
        }
      } else if (kind === 'mixed') {
        if (i % 2) {
          prompt = `（${n}＋${m}）×${n}＝？`; result = (n + m) * n;
          explanation = `先算括号里的${n}＋${m}，再乘${n}，得${result}。`;
        } else {
          prompt = `${n}＋${m}×${n}＝？`; result = n + m * n;
          explanation = `先算乘法，再算加法，得${result}。`;
        }
      } else if (kind === 'length') {
        const factors = grade <= 2 ? [['米', '厘米', 100], ['厘米', '米', 0.01]] :
          [['千米', '米', 1000], ['米', '分米', 10], ['分米', '厘米', 10], ['厘米', '毫米', 10]];
        const [from, to, factor] = factors[i % factors.length];
        const quantity = factor < 1 ? n * 100 : n;
        prompt = `${quantity}${from}＝多少${to}？`; result = quantity * factor;
        explanation = `1米＝100厘米，所以${quantity}${from}＝${result}${to}。`;
      } else if (kind === 'weight') {
        prompt = `${n}千克＝多少克？`; result = n * 1000;
        explanation = `1千克＝1000克，${n}千克＝${result}克。`;
      } else if (kind === 'decimalMultiply' || kind === 'decimalDivide' || kind === 'decimalAdd' || kind === 'decimal') {
        const a = n / 10, b = m / 10;
        if (kind === 'decimalMultiply') {
          prompt = `${a}×${m}＝？`; result = a * m;
          explanation = `先计算${n}×${m}，再将结果缩小到十分之一：${result}。`;
        } else if (kind === 'decimalDivide') {
          prompt = `${Number((n * m / 10).toFixed(2))}÷${a}＝？`; result = m;
          explanation = `被除数和除数同时扩大10倍，商为${m}。`;
        } else if (kind === 'decimalAdd') {
          prompt = i % 2 ? `${a}＋${b}＝？` : `${a + b}－${a}＝？`;
          result = i % 2 ? a + b : b;
          explanation = `小数加减应相同数位对齐，结果是${Number(result.toFixed(2))}。`;
        } else {
          prompt = `${n}个十分之一写成小数是多少？`; result = a;
          explanation = `${n}/10写成小数是${a}。`;
        }
        step = 0.1;
      } else if (kind === 'fraction' || kind === 'fractionOperation') {
        const den = 3 + (i % 6), numerator = 1 + (i % (den - 1));
        if (kind === 'fraction' || i % 3 === 0) {
          const promptF = `一个蛋糕平均分成${den}份，取走${numerator}份，占整个蛋糕的几分之几？`;
          const correct = `${numerator}/${den}`;
          wordsQuestion(lesson, key, promptF, correct,
            [`${den}/${numerator}`, `${numerator + 1}/${den}`, `${numerator}/${den + 1}`, `${den - numerator}/${den + 1}`],
            `分母表示平均分的份数${den}，分子表示取出的份数${numerator}。`);
          continue;
        }
        if (i % 3 === 1) {
          prompt = `${n}÷(1/${m})＝？`; result = n * m;
          explanation = `除以1/${m}，等于乘${m}，得${result}。`;
        } else {
          prompt = `(1/${n})×${n * m}＝？`; result = m;
          explanation = `把${n * m}平均分成${n}份，每份${m}。`;
        }
      } else if (kind === 'percent') {
        const original = 20 * n, discount = 5 + (i % 5);
        prompt = `${original}元的商品按${discount}折出售，现价多少元？`;
        result = original * discount / 10;
        explanation = `${discount}折相当于原价的${discount * 10}%，现价${result}元。`;
      } else if (kind === 'ratio') {
        const k = 2 + i % 5;
        const a = n * k, b = m * k;
        if (i % 2) {
          const correct = n % m === 0 ? String(n / m) : `${n}/${m}`;
          wordsQuestion(lesson, key, `比${a}:${b}的比值是多少？`, correct,
            [`${m}/${n}`, `${n + 1}/${m}`, `${n}/${m + 1}`, `${n + m}/${m}`, String(n + m)],
            `比值＝前项÷后项：${a}÷${b}＝${n}÷${m}＝${correct}。`);
          continue;
        } else {
          const correct = `${n}:${m}`;
          wordsQuestion(lesson, key, `${a}:${b}同时约去公因数${k}后得到什么比？`, correct,
            [`${m}:${n}`, `${a}:${m}`, `${n}:${b}`, `${a + 1}:${b}`],
            `${a}和${b}都除以${k}，得到${n}:${m}。`);
          continue;
        }
      } else if (kind === 'equation') {
        const x = n + m, a = n * 2;
        prompt = `方程 x＋${a}＝${x + a}，x＝？`;
        result = x; explanation = `等式两边同时减去${a}，x＝${x}。`;
      } else if (kind === 'negative') {
        const below = n, rise = m;
        prompt = `气温是零下${below}℃，又回升${rise}℃，现在气温是多少℃？`;
        result = rise - below; explanation = `零下${below}℃记作-${below}℃，回升${rise}℃后是${result}℃。`;
      } else if (kind === 'area' || kind === 'hectare') {
        if (kind === 'hectare') {
          prompt = `${n}公顷＝多少平方米？`; result = n * 10000;
          explanation = `1公顷＝10000平方米，所以${n}公顷＝${result}平方米。`;
        } else if (/三角形/.test(lesson.title)) {
          prompt = `底为${n * 2}厘米、高为${m}厘米的三角形，面积多少平方厘米？`;
          result = n * m; explanation = `三角形面积＝底×高÷2＝${result}。`;
        } else if (/梯形/.test(lesson.title)) {
          prompt = `梯形上底${n}厘米、下底${n + m}厘米、高${m * 2}厘米，面积多少平方厘米？`;
          result = (2 * n + m) * m;
          explanation = `梯形面积＝（上底＋下底）×高÷2＝${result}。`;
        } else {
          prompt = `长方形长${n + m}厘米、宽${n}厘米，面积是多少平方厘米？`;
          result = (n + m) * n; explanation = `长方形面积＝长×宽＝${result}。`;
        }
      } else if (kind === 'volume' || kind === 'cylinder' || kind === 'circle') {
        if (kind === 'volume') {
          prompt = `长方体长${n}厘米、宽${m}厘米、高${n + 1}厘米，体积多少立方厘米？`;
          result = n * m * (n + 1); explanation = `体积＝长×宽×高＝${result}立方厘米。`;
        } else if (kind === 'cylinder') {
          const area = 3 * n * m, height = m;
          const cone = /圆锥/.test(lesson.title) || i % 2 === 1;
          prompt = `一个${cone ? '圆锥' : '圆柱'}底面积为${area}平方厘米，高${height}厘米，体积多少立方厘米？`;
          result = area * height / (cone ? 3 : 1);
          explanation = `${cone ? '圆锥体积＝底面积×高÷3' : '圆柱体积＝底面积×高'}，得${result}立方厘米。`;
        } else {
          const isArea = i % 2 === 0, coefficient = isArea ? n * n : 2 * n;
          const label = `${coefficient}π`;
          wordsQuestion(lesson, key, `圆的半径为${n}厘米，${isArea ? '面积（平方厘米）' : '周长（厘米）'}是多少？`, label,
            [`${n}π`, `${n + 1}π`, `${2 * n * n}π`, `${n * n + 1}π`, `${coefficient + 2}π`],
            isArea ? `面积＝πr²＝${n * n}π。` : `周长＝2πr＝${2 * n}π。`);
          continue;
        }
      } else if (kind === 'statistics') {
        prompt = `某组数据有${n}、${n + m}、${n + 2 * m}，它们的平均数是多少？`;
        result = n + m; explanation = `三个数等距，平均数为中间数${result}。`;
      } else if (kind === 'time') {
        const hours = 8 + i % 8, elapsed = 1 + i % 3;
        prompt = `活动从${hours}:00开始，持续${elapsed}小时，结束时是几时？`;
        result = hours + elapsed; explanation = `${hours}＋${elapsed}＝${result}时。`;
      } else if (kind === 'probability') {
        const red = n + m, blue = n;
        wordsQuestion(lesson, key, `口袋里有${red}个红球和${blue}个蓝球，随机摸出1个，哪种情况更可能出现？`, '摸到红球',
          ['摸到蓝球', '一定摸不到红球', '两色机会相同', '必定摸到蓝球'],
          `红球${red}个比蓝球${blue}个多，摸到红球的可能性更大。`);
        continue;
      } else if (kind === 'direction') {
        const routes = [['东', '西'], ['西', '东'], ['南', '北'], ['北', '南']];
        const [toward, opposite] = routes[i % routes.length];
        wordsQuestion(lesson, key, `从学校向${toward}走${n * 100}米到图书馆，返回学校应向哪个方向走？`, opposite,
          routes.map(pair => pair[0]).filter(value => value !== opposite),
          `${toward}与${opposite}互为相反方向，返回时走的距离仍为${n * 100}米。`);
        continue;
      } else if (kind === 'position') {
        const a = n, b = m;
        wordsQuestion(lesson, key, `在方格纸上用数对（${a}，${b}）表示位置，它表示什么？`, `第${a}列第${b}行`,
          [`第${b}列第${a}行`, `第${a}行第${a}列`, `第${b}行第${b}列`, '没有指定位置'],
          '数对先列后行，两个数字分别表示列与行。');
        continue;
      } else if (kind === 'angles') {
        const degrees = [30, 45, 60, 90, 100, 120, 150, 180];
        const angle = degrees[(i + seed) % degrees.length];
        const answer = angle < 90 ? '锐角' : angle === 90 ? '直角' : angle === 180 ? '平角' : '钝角';
        wordsQuestion(lesson, key, `量角器测得一个角为${angle}°，它是什么角？`, answer,
          ['锐角', '直角', '钝角', '平角'],
          '小于90°为锐角，90°为直角，90°到180°之间为钝角，180°为平角。');
        continue;
      } else if (kind === 'triangle') {
        const first = 30 + (i % 5) * 10, second = 40 + (i % 4) * 10;
        prompt = `三角形的两个内角分别为${first}°和${second}°，第三个内角是多少度？`;
        result = 180 - first - second; suffix = '°';
        explanation = `三角形内角和180°，180－${first}－${second}＝${result}°。`;
      } else if (kind === 'pairing') {
        prompt = `有${n}种上衣和${m}种裤子，每次选一件上衣和一条裤子，有多少种不同搭配？`;
        result = n * m; explanation = `每种上衣都能配${m}种裤子，共${n}×${m}＝${result}种。`;
      } else if (kind === 'chicken') {
        const rabbits = n, chickens = m;
        prompt = `笼中有鸡兔共${rabbits + chickens}只，腿共${4 * rabbits + 2 * chickens}条，兔子有几只？`;
        result = rabbits; explanation = `假设全是鸡，少的腿数除以2得到兔子只数${rabbits}。`;
      } else if (kind === 'planting') {
        prompt = `在长${n * m}米的直路一侧每隔${m}米种一棵树，两端都种，共需多少棵？`;
        result = n + 1; explanation = `间隔${n}段，两端都种，棵数＝间隔数＋1＝${result}。`;
      } else if (kind === 'pigeon') {
        prompt = `将${n * m + 1}件物品放入${n}个盒子，至少有一个盒子里有多少件？`;
        result = m + 1; explanation = `平均每盒${m}件还余1件，所以至少有一盒${m + 1}件。`;
      } else if (kind === 'weighing') {
        const balls = 3 ** (1 + i % 4);
        prompt = `${balls}个外观相同的球中恰好有1个较轻，用无砝码天平最少称几次能保证找到？`;
        result = 1 + i % 4;
        explanation = `每次分成三组逐步比较，${balls}＝3的${result}次方，所以至少称${result}次。`;
      } else if (kind === 'pattern') {
        const start = n, gap = m;
        prompt = `按规律排列：${start}、${start + gap}、${start + 2 * gap}、${start + 3 * gap}、（ ），空缺处填多少？`;
        result = start + 4 * gap; explanation = `每次增加${gap}，下一项是${result}。`;
      } else if (kind === 'shape') {
        const shapes = [
          ['篮球的外形通常接近什么立体图形？', '球', ['长方体', '正方体', '圆柱'], '篮球近似球体。'],
          ['魔方外形最接近什么立体图形？', '正方体', ['球', '圆锥', '长方形'], '魔方外形通常近似正方体。'],
          ['饮料罐的罐身通常接近什么立体图形？', '圆柱', ['圆锥', '球', '正方体'], '罐身通常近似圆柱。'],
          ['正方体有几个面？', '6', ['4', '5', '8'], '正方体有6个相同的正方形面。'],
          ['长方形有几条边？', '4', ['3', '5', '6'], '长方形有4条边。'],
          ['三角形有几个顶点？', '3', ['2', '4', '5'], '三角形有3个顶点。']
        ];
        const item = shapes[(seed + i) % shapes.length];
        add(lesson, key, item[0], item[1], item[2], item[3]);
        continue;
      } else if (kind === 'observe') {
        const items = [
          ['站在正方体正前方观察，通常看到的面是什么图形？', '正方形', ['三角形', '圆形', '椭圆形'], '正方体的每个面都是正方形。'],
          ['同一个物体从前面与侧面观察，看到的形状可能怎样？', '不同', ['一定相同', '一定都是圆形', '一定都是三角形'], '观察方向不同，形状可能发生变化。'],
          ['从上面观察竖放的圆柱，通常看到什么形状？', '圆形', ['三角形', '五角星', '梯形'], '圆柱顶部的底面为圆形。'],
          ['判断搭建积木的形状时，应当怎样观察？', '从多个方向观察', ['只看颜色', '只数玩具名称', '不看物体'], '不同视角有助于了解物体结构。'],
          ['从不同方向观察同一个立体图形，哪些特征保持不变？', '物体本身的大小与结构', ['观察到的轮廓必定相同', '每个视图的方向', '所有遮挡关系'], '观察者移动不会改变物体本身。']
        ];
        const item = items[(seed + i) % items.length];
        add(lesson, key, item[0], item[1], item[2], item[3]);
        continue;
      } else if (kind === 'quadrilateral') {
        const items = [
          ['平行四边形有几组对边互相平行？', '2组', ['0组', '1组', '3组'], '平行四边形两组对边分别平行。'],
          ['四边形中，只有一组对边平行的图形通常叫什么？', '梯形', ['三角形', '圆形', '五边形'], '按照小学教材常用定义，梯形只有一组对边平行。'],
          ['长方形的相邻两条边通常是什么关系？', '互相垂直', ['总是互相平行', '没有交点', '永远不相等'], '长方形的每个内角都是直角。'],
          ['用直尺检验两条直线是否平行，应关注什么？', '在同一平面内是否相交', ['颜色是否相同', '长度是否相同', '粗细是否相同'], '在同一平面内不相交的两条直线互相平行。']
        ];
        const item = items[(seed + i) % items.length];
        add(lesson, key, item[0], item[1], item[2], item[3]);
        continue;
      } else if (kind === 'transform') {
        const items = [
          ['把一个图形向右平移，哪项不会改变？', '形状和大小', ['位置', '与左边框的距离', '所在的列数'], '平移只改变位置，不改变形状和大小。'],
          ['绕着一个固定点转动图形的运动叫作什么？', '旋转', ['平移', '放大', '缩小'], '旋转需要旋转中心、方向与角度。'],
          ['正方形有几条对称轴？', '4条', ['1条', '2条', '3条'], '正方形有4条对称轴。'],
          ['把一个图形平移后，面积通常会怎样？', '保持不变', ['变成两倍', '减半', '变成零'], '平移不改变面积。']
        ];
        const item = items[(seed + i) % items.length];
        add(lesson, key, item[0], item[1], item[2], item[3]);
        continue;
      } else if (kind === 'classify') {
        if (i % 2 === 0) {
          prompt = `图书角按类别整理图书，有${n}本故事书、${m}本科普书，一共有多少本图书？`;
          result = n + m;
          explanation = `分类统计后合计：${n}＋${m}＝${result}（本）。`;
          integer(lesson, key, prompt, result, explanation);
          continue;
        }
        const items = [
          ['把苹果、香蕉、梨放在一组，最合适的分类名称是什么？', '水果', ['交通工具', '文具', '服装'], '三者都属于水果。'],
          ['下列哪个物品属于学习文具？', '铅笔', ['苹果', '雨伞', '毛巾'], '铅笔是文具。'],
          ['图书按类型分类，哪种分组方法合理？', '童话书放一组、科普书放一组', ['按心情随意摆放', '都按厚薄混放', '故意不区分类别'], '分类要使用一致的标准。'],
          ['整理统计结果时，哪种办法方便核对？', '分类计数并记录', ['只猜一个数', '反复改变标准', '不检查记录'], '整理数据应先确定分类标准。']
        ];
        const item = items[(seed + i) % items.length];
        add(lesson, key, item[0], item[1], item[2], item[3]);
        continue;
      } else {
        prompt = `${left}＋${right}＝？`;
        result = left + right; explanation = `两数相加得${result}。`;
      }
      integer(lesson, key, prompt, result, explanation, step, suffix);
    }
  }

  // 英语每单元的词汇来自同一单元的原创词汇学习卡，而非其他学科或其他单元。
  function addEnglish(lessons) {
    const lesson = lessons[0];
    const vocabulary = lesson.concepts.find(c => c.text.includes(' — '));
    if (!vocabulary) return;
    const words = vocabulary.text.split('；').map(pair => pair.split(' — ')).filter(pair => pair.length === 2);
    if (words.length < 4) return;
    for (let i = 0; i < words.length; i++) {
      const [english, chinese] = words[i];
      wordsQuestion(lessons[i % lessons.length], `en-to-cn-${i}`, `在本单元词汇训练中，“${english}”的中文意思是什么？`, chinese,
        words.filter((_, index) => index !== i).map(word => word[1]), `${english} — ${chinese}。`);
      wordsQuestion(lessons[(i + 1) % lessons.length], `cn-to-en-${i}`, `英语词汇练习：中文“${chinese}”对应哪个单词？`, english,
        words.filter((_, index) => index !== i).map(word => word[0]), `${chinese}对应${english}。`);
    }
    const sentence = lesson.concepts.find(c => c.title.includes('情境表达'))?.text.split('。')[0] || '';
    for (let i = 0; i < words.length; i++) {
      const [english] = words[i];
      const regex = new RegExp(`\\b${english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (!regex.test(sentence)) continue;
      const blank = sentence.replace(regex, '____');
      wordsQuestion(lessons[(i + 2) % lessons.length], `en-blank-${i}`, `选择正确的单词补全练习句：“${blank}”`, english,
        words.filter((_, index) => index !== i).map(word => word[0]),
        `本单元例句为“${sentence}”。`);
    }
  }

  // 短文由平台原创，按教材单元的阅读技能选用，不冒充原课文内容。
  const READINGS = {
    nature: [
      ['清晨，薄雾像轻纱一样笼罩着田野。阳光渐渐升起，露珠在草叶上闪闪发亮。远处传来几声清脆的鸟鸣。', [
        ['短文主要描写什么时间的景色？', '清晨', ['深夜', '傍晚', '正午'], '短文第一句明确写了清晨。'],
        ['“薄雾像轻纱一样”使用了什么修辞？', '比喻', ['反问', '夸张', '设问'], '把薄雾比作轻纱，是比喻。'],
        ['文中从哪个方面描写了鸟鸣？', '声音', ['气味', '温度', '重量'], '“清脆的鸟鸣”是听觉描写。']
      ]],
      ['雨停了，石板路上积着浅浅的水。小树抖落了雨珠，天空露出一角蓝色。小朋友绕过水洼走向学校。', [
        ['这段话发生在什么天气之后？', '雨后', ['大雪后', '沙尘后', '大雾后'], '“雨停了”说明刚下过雨。'],
        ['“小树抖落了雨珠”把小树写得像什么？', '会动作的人', ['冰块', '钟表', '房屋'], '把小树写得像人一样，是拟人化表达。'],
        ['小朋友为什么绕开水洼？', '避免踩到积水', ['寻找雪人', '摘树上的果子', '观看星星'], '联系雨后路面有积水，可以推断其原因。']
      ]],
      ['山路弯弯，松树在风里沙沙作响。登上山顶后，村庄变得像棋盘上的小方格，河流像银色的带子伸向远方。', [
        ['作者观察村庄的位置在哪里？', '山顶', ['河底', '村中广场', '树林地下'], '登上山顶后才看到远处村庄。'],
        ['“河流像银色的带子”主要突出河流什么特点？', '弯曲而延伸', ['发出钟声', '完全静止', '变得透明'], '作者借带子的形状表现河流延伸的样子。'],
        ['从山顶看村庄像小方格，说明观察角度发生了什么变化？', '由近处到高处俯视', ['由高处到井底', '由白天到夜晚', '由室内到海中'], '从山顶向下看属于俯视角度。']
      ]]
    ],
    story: [
      ['小熊发现桥上的木板松了，先在桥边竖起提醒标志，再去请大象叔叔帮忙。大家修好木板，森林里的朋友又能安全过桥了。', [
        ['小熊首先做了什么？', '竖起提醒标志', ['独自拆掉桥', '立刻跳进河里', '躲回家睡觉'], '先提醒他人注意危险。'],
        ['故事按照什么顺序展开？', '发现问题、提醒、修桥', ['修桥、发现问题、提醒', '提醒、庆祝、发现问题', '过桥、睡觉、下雨'], '抓住起因、经过、结果可理清故事。'],
        ['这个故事主要赞扬了什么？', '认真负责并合作解决问题', ['遇到危险不提醒别人', '做事只顾自己', '发现问题不处理'], '小熊发现危险并联合大家修桥。']
      ]],
      ['小松鼠种下一颗种子，每天浇一点水。几天后没发芽，它有些着急，但仍然坚持观察。过了一周，泥土里冒出了嫩绿的小芽。', [
        ['小松鼠起初为什么着急？', '种子迟迟没发芽', ['忘记种子在哪', '突然下起大雪', '水壶不见了'], '几天没有发芽使它着急。'],
        ['种子最终发生了什么变化？', '长出了嫩芽', ['变成了石头', '飞到了树上', '结出了西瓜'], '短文结尾写泥土冒出了嫩芽。'],
        ['这个故事说明了什么？', '观察和耐心很重要', ['每天都不用照料植物', '等待时不能观察', '只要着急就会发芽'], '小松鼠坚持照料并观察后看到了变化。']
      ]],
      ['小兔答应帮朋友保管一盒彩笔。放学路上，它把彩笔落在长椅上，发现后马上沿路寻找，最终找回彩笔并主动道歉。', [
        ['小兔丢失彩笔的原因是什么？', '忘在长椅上', ['送给了老师', '放在书柜里', '借给了小鸟'], '短文交代把彩笔落在长椅上。'],
        ['小兔发现问题后采取了什么行动？', '沿路寻找', ['假装没发生', '责怪朋友', '把书包扔掉'], '它马上返回寻找。'],
        ['小兔的哪些行为表现了负责？', '找回彩笔并道歉', ['故意说谎', '不归还东西', '推卸责任'], '它对保管失误承担了责任。']
      ]]
    ],
    character: [
      ['运动会上，小东跑得很快，发现队友的鞋带散了，便停下来提醒他。队友系好鞋带后，两人一起跑向终点。', [
        ['小东为什么停下来？', '提醒队友系鞋带', ['想回家吃饭', '突然下雨', '找不到操场'], '小东看到队友鞋带散开。'],
        ['哪个细节最能表现小东关心队友？', '停下来提醒', ['跑得很快', '运动会开始', '操场很宽'], '停下来是主动帮助的具体行为。'],
        ['短文中的人物主要表现出什么品质？', '关心同伴', ['自私自利', '推卸责任', '随意取笑'], '小东关心队友的安全。']
      ]],
      ['图书角的书被雨水打湿了，值日生小兰拿来干布，把书一本本移到干燥处。她又请老师帮忙整理，并提醒同学关好窗户。', [
        ['小兰发现什么问题？', '图书被雨水打湿', ['图书不见了', '桌子坏了', '灯泡灭了'], '开头说明了问题。'],
        ['小兰的行动按照怎样的顺序进行？', '移书、求助、提醒', ['提醒、回家、买书', '看书、睡觉、关灯', '丢书、跑步、吃饭'], '按事情发生顺序整理可看出她的处理过程。'],
        ['哪些行动反映了小兰的责任感？', '保护图书并提醒大家', ['不管受潮图书', '故意开窗', '随意毁坏图书'], '小兰主动保护公共图书。']
      ]],
      ['社区停电时，志愿者分头帮助居民。有人拿手电照亮楼道，有人关心行动不便的老人，还有人传递恢复供电的信息。', [
        ['志愿者做了哪些事情？', '照亮楼道、帮助老人、传递信息', ['购买烟花、开派对', '比赛唱歌、画画', '只顾自己回家'], '三件事分别在短文中出现。'],
        ['这段文字采用了什么写法介绍活动？', '列举不同人物的行动', ['只说明天气变化', '专门描绘外貌', '只列日期'], '不同志愿者的行动共同体现互助。'],
        ['这段文字的中心意思是什么？', '社区互助解决困难', ['志愿者不做事', '人人都要独自行动', '停电后不能帮人'], '围绕志愿服务表现互助精神。']
      ]]
    ],
    science: [
      ['小明把两盆相同的绿豆放在不同的位置，一盆接受阳光，一盆放在黑暗处。每天浇同样多的水，几天后记录两盆绿豆的生长情况。', [
        ['这个实验主要比较什么条件？', '是否有阳光', ['盆的颜色', '浇水人的名字', '记录本的大小'], '两盆绿豆接受的光照条件不同。'],
        ['为什么每天浇同样多的水？', '控制其他条件一致', ['让水全部蒸发', '为了节约纸张', '避免观察生长'], '减少其他因素干扰，才能比较光照的影响。'],
        ['怎样才能更可靠地得到实验结论？', '持续观察并记录', ['只看第一天', '猜想后不记录', '随意改变多个条件'], '记录数据帮助分析实验结果。']
      ]],
      ['一枚冰块放在碗里，过了一会儿变成了水。小朋友把水放入冰箱冷冻室，第二天它又结成了冰。', [
        ['冰块变成水的过程叫什么？', '融化', ['凝固', '燃烧', '蒸发成石头'], '固态冰变成液态水是融化。'],
        ['水在冷冻室里结成冰属于什么变化？', '凝固', ['生长', '发芽', '融化'], '液态水变成固态冰是凝固。'],
        ['短文说明了什么？', '温度变化会影响水的状态', ['水只能是冰', '冰遇热永远不化', '水一定变成金属'], '冰和水可以随温度变化相互转化。']
      ]],
      ['校园里连续三天测量气温：周一18℃、周二21℃、周三19℃。小组把数据写进表格，又画成折线统计图。', [
        ['三天中哪天气温最高？', '周二', ['周一', '周三', '三天相同'], '21℃高于18℃和19℃。'],
        ['使用折线统计图更容易看到什么？', '气温变化的趋势', ['每个同学的姓名', '教室墙面颜色', '纸张重量'], '折线统计图适合观察随时间变化的趋势。'],
        ['整理这些测量数据时应注意什么？', '记录日期与对应气温', ['任意修改测量结果', '只记录最高温', '忽略单位'], '准确记录日期、数值和单位是科学观察基础。']
      ]]
    ],
    culture: [
      ['端午节前，奶奶将洗净的粽叶折成小漏斗，放入糯米，再用棉线扎紧。孩子们在一旁学习包粽子，听长辈讲节日习俗。', [
        ['短文介绍的是哪个传统节日？', '端午节', ['元宵节', '中秋节', '重阳节'], '包粽子是端午节的常见习俗。'],
        ['包粽子的步骤是怎样的？', '折粽叶、装米、扎紧', ['装米、吃粽子、洗叶', '扎紧、装米、折叶', '先吃完再包'], '动作描写按制作先后顺序。'],
        ['短文还表现了什么？', '习俗通过家庭活动传承', ['传统节日完全没有活动', '只介绍天气', '人们不需要学习习俗'], '长辈带孩子体验传统习俗。']
      ]],
      ['书法社团举办作品展。老师告诉同学们，书写汉字既要注意笔画与结构，也要保持适当的间距。大家边欣赏边交流自己的发现。', [
        ['书写汉字时需要注意什么？', '笔画、结构和间距', ['只看纸张颜色', '只写一个笔画', '完全忽略布局'], '短文指出了三个书写要点。'],
        ['同学们怎样学习书法作品？', '欣赏并交流发现', ['不看作品', '随意涂改他人作品', '只讨论天气'], '边欣赏边交流能获得更多认识。'],
        ['这段文字围绕什么主题？', '汉字书写与欣赏', ['体育比赛', '科学实验', '餐桌礼仪'], '整段介绍书法展及汉字书写。']
      ]],
      ['村里的老人教孩子们制作纸灯笼。大家先搭起骨架，再贴上彩纸，最后写上祝福语。夜晚，一盏盏灯笼映亮了小院。', [
        ['制作灯笼的最后一步是什么？', '写上祝福语', ['搭骨架', '贴彩纸', '寻找竹子'], '“最后写上祝福语”明确指出。'],
        ['文中的“先、再、最后”起什么作用？', '表示制作顺序', ['表示颜色变化', '说明人物年龄', '描写声音大小'], '这些词语连接有先后次序的步骤。'],
        ['短文主要写了什么？', '学习制作传统灯笼', ['去海边游泳', '了解交通规则', '观察小动物'], '全文围绕制作灯笼展开。']
      ]]
    ],
    language: [
      ['小小的花园里开满了花。红花像火，白花像雪。蜜蜂嗡嗡地忙着采蜜，孩子们轻轻地走过花间的小路。', [
        ['文中“红花像火”使用什么修辞手法？', '比喻', ['设问', '反问', '对比说明'], '将红花的颜色比作火。'],
        ['“嗡嗡”主要模仿什么声音？', '蜜蜂飞行的声音', ['小狗叫声', '雨点打鼓声', '钟声'], '“嗡嗡”是表示蜂鸣的拟声词。'],
        ['怎样概括这段文字最合适？', '花园的景色与活动', ['火车站的人群', '沙漠中的风', '教室里的考试'], '花、蜜蜂和孩子构成花园场景。']
      ]],
      ['下课后，班长把图书搬进书柜。小雨整理桌椅，小林把地上的纸屑捡起。大家分工合作，教室很快变整洁了。', [
        ['这段话的主要内容是什么？', '大家分工整理教室', ['有人去动物园', '下了一场大雪', '学校举办舞会'], '不同同学做不同整理工作。'],
        ['哪一句说明大家合作后的结果？', '教室很快变整洁了', ['下课后', '班长把图书搬进书柜', '小林捡起纸屑'], '最后一句概括整理后的变化。'],
        ['“整理桌椅”中的“整理”是什么意思？', '使物品有条理', ['随意丢弃', '故意损坏', '完全不动'], '结合上下文理解，整理使教室整洁。']
      ]],
      ['放学时，天空飘起小雨。同学们撑起伞，排队走出校门。小刚看见同桌没有雨伞，就和他一起撑伞走到公交站。', [
        ['“撑起伞”说明当时发生什么事？', '下雨了', ['太阳特别刺眼', '刮起了沙尘暴', '下起了大雪'], '前文已经交代飘起小雨。'],
        ['小刚的行为表现了什么？', '关心同学', ['故意捉弄', '不守秩序', '不愿分享'], '和同桌共撑伞体现友善。'],
        ['短文中事情发生的地点主要在哪里？', '校门口到公交站的路上', ['医院的病房里', '大海里', '山顶上'], '从走出校门到公交站是主要场景。']
      ]]
    ]
  };

  const BEGINNER_LANGUAGE = [
    ['下列哪个字带三点水“氵”？', '河', ['林', '草', '山'], '“河”字左边是三点水。'],
    ['下列哪个字带草字头“艹”？', '花', ['树', '水', '鸟'], '“花”的偏旁是草字头。'],
    ['“大小”的反义词搭配是哪个？', '大—小', ['大—高', '小—红', '多—白'], '大和小表示相反的意思。'],
    ['“上”的反义词是什么？', '下', ['中', '左', '后'], '上和下是一组反义词。'],
    ['“高”的反义词是什么？', '矮', ['长', '多', '快'], '高和矮可以表示身高的相反特点。'],
    ['“早上好！”句末可以使用什么标点？', '感叹号', ['书名号', '冒号', '顿号'], '表达问候时可使用感叹号。'],
    ['“你去哪里”是问句，句末应加什么？', '问号', ['逗号', '顿号', '引号'], '提出问题通常用问号。'],
    ['“小鸟在天空飞。”句子中的动作是什么？', '飞', ['小鸟', '天空', '在'], '“飞”表示小鸟的动作。'],
    ['描写晴朗的天空，哪种搭配更合适？', '蓝蓝的天空', ['甜甜的石头', '红红的空气', '软软的时间'], '颜色形容词应与事物特点相匹配。'],
    ['“一（ ）小鱼”填什么量词更合适？', '条', ['本', '把', '支'], '通常说“一条小鱼”。'],
    ['“一（ ）书”应该填什么量词？', '本', ['只', '匹', '条'], '通常说“一本书”。'],
    ['“小明把桌子擦干净了。”说的是哪件事？', '擦桌子', ['写作业', '放风筝', '去买菜'], '通过动作“擦”可以知道发生的事情。'],
    ['下面哪个词语表示季节？', '春天', ['中午', '今天', '明天'], '春天是四季之一。'],
    ['“先洗手，再吃饭。”说明什么关系？', '先后顺序', ['大小比较', '颜色变化', '相反方向'], '“先……再……”常用来描述顺序。'],
    ['把“我们 / 爱护 / 图书”组成完整句子，哪项正确？', '我们爱护图书。', ['图书爱护我们。', '爱护我们图书。', '我们图书爱护。'], '陈述句一般要表达完整的意思。'],
    ['“你真棒！”属于什么语气？', '赞美', ['疑问', '命令', '猜测'], '感叹号与“真棒”表达赞美。']
  ];

  const ADVANCED_LANGUAGE = [
    ['“星星像无数颗宝石”运用了什么修辞？', '比喻', ['反问', '设问', '引用'], '把星星比作宝石是比喻。'],
    ['“花儿在风中点头”运用了什么修辞？', '拟人', ['列数字', '作比较', '举例子'], '把花写得像人一样会点头。'],
    ['“他走得快，跑得快，跳得也快”突出了什么？', '动作迅速', ['天气寒冷', '景色美丽', '食物香甜'], '重复描写几个动作，强调人物动作快。'],
    ['“教室里静得连针掉地都能听见”主要写什么？', '非常安静', ['声音很吵', '屋子很大', '桌椅很多'], '夸张的表达突出安静程度。'],
    ['阅读说明文时，遇到“约三米高”应关注什么？', '数字及其表示的大小', ['只看标点', '只看作者姓名', '忽略说明对象'], '数字帮助说明具体特征。'],
    ['“因为下雨，所以比赛延期。”表示什么关系？', '因果关系', ['并列关系', '选择关系', '转折关系'], '前半句是原因，后半句是结果。'],
    ['“虽然路很远，但是他仍然坚持走完。”表示什么关系？', '转折关系', ['因果关系', '并列关系', '假设关系'], '“虽然……但是……”表达转折。'],
    ['文章中的中心句一般有什么作用？', '概括段落或文章的主要意思', ['说明页码', '列出所有汉字', '替代全部细节'], '中心句常用来概括主要内容。'],
    ['一篇写人文章最能表现人物品质的材料是什么？', '典型事件与具体行动', ['纸张的尺寸', '页码的奇偶', '无关的数字'], '具体事件能说明人物特点。'],
    ['按时间顺序写一次活动，下列哪种排序更清楚？', '准备、进行、结束', ['结束、准备、进行', '进行、结束、准备', '结束、结束、准备'], '按活动发展的顺序展开更易理解。'],
    ['比较两种观点时应该怎么做？', '分别寻找事实和理由', ['只看谁说得大声', '忽略所有证据', '随意改动原话'], '有证据支持的观点更容易判断。'],
    ['阅读古诗词时遇到生僻词语，通常先做什么？', '结合注释和上下文理解', ['只数笔画不读诗', '随意猜一个字义', '跳过全首诗'], '结合注释与语境能帮助理解诗意。'],
    ['转述别人说的话时，最重要的是什么？', '准确表达原意', ['任意添加事实', '故意改变观点', '只记最后一个字'], '转述应保持信息准确。'],
    ['写观察日记，哪种记录方式更可靠？', '记录时间与真实变化', ['随意编造过程', '只写天气好', '不看观察对象'], '观察记录应有时间线和具体发现。'],
    ['介绍一种物品时，哪种写法更清楚？', '围绕外形、用途等特征分点介绍', ['反复说“很好”', '只写无关故事', '故意打乱逻辑'], '按特征分类介绍有利于说明。'],
    ['“湖面平得像镜子”突出湖面什么特点？', '平静', ['滚烫', '拥挤', '喧闹'], '用镜子比喻平静的湖面。'],
    ['缩写故事时，怎样处理内容最恰当？', '保留主要情节，删去次要细节', ['只留第一个标点', '任意改变结局', '加入大量无关人物'], '缩写要概括主干、忠于原意。'],
    ['小说描写环境通常可以起什么作用？', '烘托氛围并衬托人物', ['代替全部对话', '使人物消失', '只标记行数'], '环境描写常服务于情节和人物。']
  ];

  const PHONICS = {
    2: [
      ['下列哪个是单韵母？', 'a', ['b', 'p', 'm'], 'a 是单韵母。'],
      ['下列哪组都是单韵母？', 'a、o、e', ['b、p、m', 'd、t、n', 'g、k、h'], 'a、o、e都是单韵母。'],
      ['下列哪个字母是声母？', 'p', ['a', 'e', 'o'], 'p是声母。'],
      ['“mā”标注的是第几声？', '第一声', ['第二声', '第三声', '第四声'], 'ā上的横线表示第一声。'],
      ['“má”标注的是第几声？', '第二声', ['第一声', '第三声', '第四声'], 'á上向上扬的声调符号表示第二声。'],
      ['“mǎ”标注的是第几声？', '第三声', ['第一声', '第二声', '第四声'], 'ǎ表示第三声。'],
      ['“mà”标注的是第几声？', '第四声', ['第一声', '第二声', '第三声'], 'à上的下降符号表示第四声。'],
      ['b与哪个声母容易混淆字形？', 'p', ['a', 'o', 'e'], 'b和p的书写形状相似，需注意方向。'],
      ['下列哪组都是声母？', 'd、t、n', ['a、o、e', 'ai、ei、ui', 'an、en、in'], 'd、t、n都是声母。']
    ],
    3: [
      ['“zh”属于哪类声母？', '翘舌音', ['平舌音', '单韵母', '复韵母'], 'zh是翘舌声母。'],
      ['“z”属于哪类声母？', '平舌音', ['翘舌音', '鼻韵母', '整体认读音节'], 'z是平舌声母。'],
      ['下列哪个是整体认读音节？', 'zhi', ['zh', 'sh', 'ch'], 'zhi可直接整体认读。'],
      ['下列哪个是整体认读音节？', 'chi', ['ch', 'sh', 'zh'], 'chi是整体认读音节。'],
      ['g、k、h是什么？', '声母', ['韵母', '汉字', '声调'], 'g、k、h都是声母。'],
      ['下列哪组是翘舌声母？', 'zh、ch、sh', ['z、c、s', 'a、o、e', 'ai、ei、ui'], 'zh、ch、sh是翘舌声母。'],
      ['下列哪组是平舌声母？', 'z、c、s', ['zh、ch、sh', 'a、o、e', 'an、ang、en'], 'z、c、s是平舌声母。'],
      ['“yi”属于哪一类？', '整体认读音节', ['声调', '汉字', '量词'], 'yi是整体认读音节。'],
      ['j、q、x属于什么类别？', '声母', ['复韵母', '声调符号', '汉字'], 'j、q、x是声母。']
    ],
    4: [
      ['下列哪组都是复韵母？', 'ai、ei、ui', ['a、o、e', 'b、p、m', 'z、c、s'], 'ai、ei、ui是复韵母。'],
      ['“ao”由哪两个单韵母组成？', 'a和o', ['a和e', 'u和i', 'e和u'], 'ao由a、o组合。'],
      ['下列哪个是前鼻韵母？', 'an', ['ang', 'ong', 'ing'], 'an的韵尾为n。'],
      ['下列哪个是后鼻韵母？', 'ang', ['an', 'en', 'in'], 'ang以ng结尾。'],
      ['下列哪个韵母以ng结尾？', 'eng', ['en', 'an', 'in'], 'eng属于后鼻韵母。'],
      ['“un”属于哪种韵母？', '前鼻韵母', ['后鼻韵母', '单韵母', '声母'], 'un以n结尾。'],
      ['“ie”属于哪种韵母？', '复韵母', ['声母', '声调', '汉字'], 'ie属于复韵母。'],
      ['哪一个是复韵母？', 'ou', ['b', 'm', 'n'], 'ou由两个单韵母组合而成。'],
      ['“ing”属于哪类韵母？', '后鼻韵母', ['前鼻韵母', '声母', '单韵母'], 'ing以ng结尾。']
    ]
  };

  function chineseCategory(lessons) {
    const first = lessons[0];
    if (first.grade === 1 && first.semester === 1 && /拼音/.test(first.unit)) return 'phonics';
    if (/识字|汉字文化|拼音/.test(first.unit)) return 'language';
    const scope = first.unit + ' ' + lessons.map(l => l.title).join(' ');
    if (/数学|信息|科技|科学|实验|发现|研究|提问|说明|探索|观察发现/.test(scope)) return 'science';
    if (/节日|传统|书法|民俗|诗歌|古典|名著|汉字|文化/.test(scope)) return 'culture';
    if (/童话|寓言|故事|小说|神话|想象|人物故事|外国名著/.test(scope)) return 'story';
    if (/人物|品质|家国|革命|英雄|情怀|成长|童年|母爱|父母|朋友|感恩/.test(scope)) return 'character';
    if (/自然|山河|四时|乡村|景物|风景|春天|秋天|金秋|春夏|雨|山川|观潮|海滨|动物|植物/.test(scope)) return 'nature';
    return first.grade <= 2 ? 'language' : 'story';
  }

  function addChineseUnit(lessons) {
    const first = lessons[0];
    if (first.grade === 1 && first.semester === 1 && /拼音/.test(first.unit)) {
      const part = /第二单元/.test(first.unit) ? 2 : /第三单元/.test(first.unit) ? 3 : 4;
      PHONICS[part].forEach(([prompt, correct, wrong, explanation], i) => {
        add(lessons[i % lessons.length], 'pinyin-' + i, prompt, correct, wrong, explanation);
      });
    }
    const category = chineseCategory(lessons);
    const readings = READINGS[category === 'phonics' ? 'language' : category];
    readings.forEach(([passage, questions], groupIndex) => {
      questions.forEach(([prompt, correct, wrong, explanation], index) => {
        const itemIndex = groupIndex * 3 + index;
        add(lessons[itemIndex % lessons.length], 'read-' + groupIndex + '-' + index,
          '阅读原创短文：“' + passage + '”\n' + prompt, correct, wrong, explanation);
      });
    });
    const items = first.grade <= 2 ? BEGINNER_LANGUAGE : ADVANCED_LANGUAGE;
    const offset = hash(first.unit + ':' + first.grade + ':' + first.semester) % items.length;
    for (let i = 0; i < 12; i++) {
      const [prompt, correct, wrong, explanation] = items[(offset + i) % items.length];
      add(lessons[(i + 2) % lessons.length], 'language-' + i, prompt, correct, wrong, explanation);
    }
    // 让每课的具体学习重点进入题库（与同年级的其他单元知识点作比较）。
    const contrast = all.filter(l => l.subject === 'chinese' &&
      l.grade === first.grade && l.semester === first.semester && l.unit !== first.unit);
    const alternate = [...new Set(contrast.map(l => l.description))];
    lessons.forEach((lesson, index) => {
      const wrong = alternate.filter(text => text !== lesson.description);
      if (wrong.length < 3) return;
      const rotated = [...wrong.slice(index * 3), ...wrong.slice(0, index * 3)];
      wordsQuestion(lesson, 'course-focus', '学习《' + lesson.title + '》时，哪一项最符合本课的阅读与表达重点？',
        lesson.description, rotated,
        '本课的导学目标是：' + lesson.description);
    });
  }

  const groups = new Map();
  for (const lesson of all) {
    if (lesson.subject === 'math') addMath(lesson);
    const id = [lesson.grade, lesson.semester, lesson.subject, lesson.unit].join(':');
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(lesson);
  }
  for (const group of groups.values()) {
    if (group[0].subject === 'english') addEnglish(group);
    if (group[0].subject === 'chinese') addChineseUnit(group);
  }
  if (!Array.isArray(data.examQuestions)) data.examQuestions = [];
  data.examQuestions.push(...extra);
  data.extraQuestionCount = extra.length;
})();
