/* engine.js — מנוע תרגילים והתאמת רמה לכיתה ד' (מבדק 18.11).
   UMD: רץ בדפדפן (window.MathEngine) וב-Node (require). בלי תלויות.
   כל שאלה נושאת gen + meta — פרמטרים גולמיים שמאפשרים לבדוק את התשובה בנפרד. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MathEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_LEVEL = 5;
  const START_LEVEL = 2;
  const ROUND_MIN = 15; // סבב = כל 5 הנושאים, 3–5 שאלות בכל אחד (15–25 שאלות)
  const ROUND_MAX = 25;

  // הנושאים לפי חוברת "חומר למבדק במתמטיקה – שכבת ד'" (ההפרדה בין המיליון לחיבור/חיסור לפי בקשת ההורה)
  const TOPICS = [
    { id: 'million',   name: 'המיליון',                                        short: 'המיליון',        icon: '🔢' },
    { id: 'addsub',    name: 'חיבור וחיסור בתחום הרבבה ושאלות מילוליות',        short: 'חיבור וחיסור',    icon: '➕' },
    { id: 'fractions', name: 'השבר הפשוט',                                     short: 'שברים',          icon: '🍕' },
    { id: 'muldiv',    name: 'כפל וחילוק',                                     short: 'כפל וחילוק',      icon: '✖️' },
    { id: 'geometry',  name: 'גיאומטריה: מצולעים, אלכסונים, מקבילות ומאונכות',   short: 'גיאומטריה',      icon: '📐' },
  ];
  const LEVEL_NAMES = ['', 'התחלה', 'בסיס', 'בינוני', 'מתקדם', 'אלוף'];

  // ---------- עזרים ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  function shuffle(r, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const frac = (n, d) => `⟦${n}|${d}⟧`;
  const BOX = '▢';

  function mk(topic, level, gen, o) {
    return Object.assign({ topic, level, gen, kind: 'num' }, o);
  }
  function choicesOf(r, answer, distractors, n) {
    const out = [answer];
    for (const d of distractors) {
      if (!out.includes(d)) out.push(d);
      if (out.length >= (n || 4)) break;
    }
    return shuffle(r, out);
  }
  function randDigits(r, len) {
    const ds = [ri(r, 1, 9)];
    for (let i = 1; i < len; i++) ds.push(ri(r, 0, 9));
    return ds;
  }
  function distinctDigits(r, len) {
    const first = ri(r, 1, 9);
    const rest = shuffle(r, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(x => x !== first)).slice(0, len - 1);
    return [first].concat(rest);
  }

  // =====================================================================
  // 1) המיליון
  // =====================================================================
  const PLACE = ['היחידות', 'העשרות', 'המאות', 'האלפים', 'עשרות האלפים', 'מאות האלפים', 'המיליונים'];

  function qDigitValue(r, level, len) {
    const ds = distinctDigits(r, len);
    const n = Number(ds.join(''));
    const cand = [];
    ds.forEach((d, i) => { if (d !== 0) cand.push(i); });
    const i = pick(r, cand), d = ds[i], pos = len - 1 - i, v = d * Math.pow(10, pos);
    return mk('million', level, 'digitValue', {
      text: `מהו ערך הספרה ${d} במספר הבא?`, eq: fmt(n), answer: v,
      explain: `הספרה ${d} נמצאת במקום ${PLACE[pos]}, ולכן ערכה ${fmt(v)}.`,
      meta: { n, d, pos, show: [n] },
    });
  }
  function partsOf(ds) {
    const len = ds.length, p = [];
    ds.forEach((d, i) => { if (d) p.push(d * Math.pow(10, len - 1 - i)); });
    return p;
  }
  function expandedDigits(r, len) {
    const minParts = len >= 5 ? 3 : 2;
    for (;;) {
      const ds = [ri(r, 1, 9)];
      for (let i = 1; i < len; i++) ds.push(r() < 0.3 ? 0 : ri(r, 1, 9));
      if (partsOf(ds).length >= minParts) return ds;
    }
  }
  function qExpanded(r, level, len) {
    const ds = expandedDigits(r, len), n = Number(ds.join('')), p = partsOf(ds);
    return mk('million', level, 'expanded', {
      text: 'חברו את הערכים וכתבו את המספר:',
      eq: p.map(fmt).join(' + ') + ' = ?', answer: n,
      explain: `מחברים את כל הערכים: ${p.map(fmt).join(' + ')} = ${fmt(n)}.`,
      meta: { n, parts: p, show: p },
    });
  }
  function qMissingPart(r, level, len) {
    const ds = expandedDigits(r, len), n = Number(ds.join('')), p = partsOf(ds);
    const h = ri(r, 0, p.length - 1);
    const shown = p.map((v, i) => (i === h ? BOX : fmt(v)));
    return mk('million', level, 'missingPart', {
      text: 'מה הערך שחסר בפירוק המספר?',
      eq: `${fmt(n)} = ${shown.join(' + ')}`, answer: p[h],
      explain: `פירוק לפי ערך הספרות: ${p.map(fmt).join(' + ')}. הערך החסר הוא ${fmt(p[h])}.`,
      meta: { n, parts: p, hidden: h, show: [n] },
    });
  }
  function qCompare(r, level, len) {
    const da = randDigits(r, len), db = da.slice();
    if (r() >= 0.1) {
      const k = ri(r, 1, len - 2);
      for (let i = k; i < len; i++) db[i] = ri(r, 0, 9);
      if (db.join('') === da.join('')) db[len - 1] = (db[len - 1] + 1) % 10;
    }
    const a = Number(da.join('')), b = Number(db.join(''));
    const ans = a < b ? '<' : a > b ? '>' : '=';
    return mk('million', level, 'compare', {
      kind: 'choice', text: 'איזה סימן מתאים?', eq: `${fmt(a)} ${BOX} ${fmt(b)}`,
      choices: ['<', '>', '='], answer: ans,
      explain: `משווים מהספרה השמאלית (הגדולה ביותר) ימינה, עד לספרה הראשונה שונה. ${fmt(a)} ${ans} ${fmt(b)}.`,
      meta: { a, b, show: [a, b] },
    });
  }
  function qExtreme(r, level, len, count, mode) {
    const pre = ri(r, 1, len - 3);
    const head = randDigits(r, pre);
    const set = new Set();
    while (set.size < count) {
      const t = [];
      for (let i = pre; i < len; i++) t.push(ri(r, 0, 9));
      set.add(Number(head.concat(t).join('')));
    }
    const nums = shuffle(r, Array.from(set));
    const ans = mode === 'max' ? Math.max.apply(null, nums) : Math.min.apply(null, nums);
    return mk('million', level, 'extreme', {
      kind: 'choice', text: mode === 'max' ? 'איזה מספר הוא הגדול ביותר?' : 'איזה מספר הוא הקטן ביותר?',
      choices: nums.map(fmt), answer: fmt(ans),
      explain: `משווים ספרה אחרי ספרה משמאל. ${mode === 'max' ? 'הגדול' : 'הקטן'} ביותר הוא ${fmt(ans)}.`,
      meta: { nums, mode, show: nums },
    });
  }
  function qStep(r, level) {
    const step = pick(r, [1000, 10000, 100000]);
    const up = r() < 0.5;
    const n = up ? ri(r, 100000, 999999 - step) : ri(r, 100000 + step, 999999);
    return mk('million', level, 'step', {
      text: `מהו המספר שגדול ב-${fmt(step)} מ-${fmt(n)}?`.replace('שגדול', up ? 'שגדול' : 'שקטן'),
      answer: up ? n + step : n - step,
      explain: `${up ? 'מוסיפים' : 'מחסירים'} ${fmt(step)} — משנים רק את הספרה במקום המתאים: ${fmt(up ? n + step : n - step)}.`,
      meta: { n, step, up, show: [n, step] },
    });
  }
  function qCross(r, level) {
    const m = pick(r, [1, 10, 100, 1000, 10000]);
    const base = 1000000 - m;
    return mk('million', level, 'cross', {
      text: `מהו המספר שגדול ב-${fmt(m)} מ-${fmt(base)}?`, answer: 1000000,
      explain: `${fmt(base)} + ${fmt(m)} = 1,000,000 (מיליון).`,
      meta: { m, base, show: [m, base] },
    });
  }
  function qRead(r, level) {
    const a = ri(r, 1, 9), b = ri(r, 3, 999), c = ri(r, 3, 999);
    const n = a * 1000000 + b * 1000 + c;
    return mk('million', level, 'read', {
      text: `כתבו בספרות: ${a} מיליון, ${b} אלף ו-${c}`, answer: n,
      explain: `${a} מיליון = ${fmt(a * 1000000)}, ${b} אלף = ${fmt(b * 1000)}, ועוד ${c}. סך הכול ${fmt(n)}. שימו לב לאפסים בקבוצת האלפים והיחידות.`,
      meta: { a, b, c, show: [a, b, c] },
    });
  }
  function qThousands(r, level) {
    const j = ri(r, 100, 999) * 10, n = j * 1000;
    return mk('million', level, 'thousands', {
      text: `כמה אלפים יש במספר ${fmt(n)}?`, answer: j,
      explain: `${fmt(n)} ÷ 1,000 = ${fmt(j)}.`,
      meta: { n, j, show: [n] },
    });
  }

  // =====================================================================
  // 2) חיבור וחיסור בתחום הרבבה + שאלות מילוליות
  // =====================================================================
  function asNums(r, level, allowMissing) {
    const add = r() < 0.5;
    let a, b;
    if (level === 1) {
      if (add) { a = ri(r, 100, 899); b = ri(r, 100, 999 - a); }
      else { a = ri(r, 300, 999); b = ri(r, 100, a - 100); }
    } else if (level === 2) {
      if (add) { a = ri(r, 1000, 8000); b = ri(r, 100, Math.min(9999 - a, 5000)); }
      else { a = ri(r, 1000, 5000); b = ri(r, 100, 999); }
    } else if (level === 3) {
      if (add) { a = ri(r, 1000, 8000); b = ri(r, 1000, 9999 - a); }
      else { a = ri(r, 2000, 9999); b = ri(r, 1000, a - 1); }
    } else { // רמה 4
      const t = r();
      if (t < 0.4) {
        a = pick(r, [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000]);
        b = ri(r, 101, a - 1);
        if (b % 100 === 0) b += 7;
        return { op: '-', a, b };
      }
      if (t < 0.7 && allowMissing) {
        const x = ri(r, 1200, 7800), y = ri(r, 1100, 10000 - x);
        return { op: 'missing', a: x, b: y, s: x + y };
      }
      if (t < 0.85) { a = ri(r, 3000, 9000); b = ri(r, 100, 10000 - a); return { op: '+', a, b }; }
      a = ri(r, 4000, 9999); b = ri(r, 1500, a - 100);
      return { op: '-', a, b };
    }
    return { op: add ? '+' : '-', a, b };
  }
  const WORD_ADD = [
    (a, b) => `בספרייה היו ${fmt(a)} ספרים. הגיעו עוד ${fmt(b)} ספרים. כמה ספרים יש עכשיו בספרייה?`,
    (a, b) => `במגרש החנייה עמדו ${fmt(a)} מכוניות בבוקר, ובצהריים נכנסו עוד ${fmt(b)} מכוניות. כמה מכוניות יש עכשיו במגרש?`,
    (a, b) => `באתר מסוים ביקרו ${fmt(a)} אנשים ביום שני ו-${fmt(b)} אנשים ביום שלישי. כמה אנשים ביקרו בשני הימים?`,
    (a, b) => `לדני יש ${fmt(a)} מדבקות ולרותם יש ${fmt(b)} מדבקות. כמה מדבקות יש להם יחד?`,
  ];
  const WORD_SUB = [
    (a, b) => `בחנות היו ${fmt(a)} כדורים. נמכרו ${fmt(b)} כדורים. כמה כדורים נשארו בחנות?`,
    (a, b) => `בבית הספר למדו ${fmt(a)} תלמידים. ${fmt(b)} תלמידים יצאו לטיול. כמה תלמידים נשארו בבית הספר?`,
    (a, b) => `למפעל היו ${fmt(a)} בקבוקים. ${fmt(b)} בקבוקים נשברו. כמה בקבוקים נשארו שלמים?`,
    (a, b) => `בעיר א' יש ${fmt(a)} תושבים ובעיר ב' יש ${fmt(b)} תושבים. כמה תושבים יותר יש בעיר א' מאשר בעיר ב'?`,
  ];
  function qPlainAS(r, level) {
    const n = asNums(r, level, true);
    if (n.op === 'missing') {
      return mk('addsub', level, 'asMissing', {
        text: 'מה המספר החסר?', eq: `${fmt(n.a)} + ${BOX} = ${fmt(n.s)}`, answer: n.b,
        explain: `המספר החסר = ${fmt(n.s)} − ${fmt(n.a)} = ${fmt(n.b)}.`,
        meta: { a: n.a, s: n.s, show: [n.a, n.s] },
      });
    }
    const ans = n.op === '+' ? n.a + n.b : n.a - n.b;
    return mk('addsub', level, 'asPlain', {
      text: 'חשבו:', eq: `${fmt(n.a)} ${n.op === '+' ? '+' : '−'} ${fmt(n.b)} = ?`, answer: ans,
      explain: `${fmt(n.a)} ${n.op === '+' ? '+' : '−'} ${fmt(n.b)} = ${fmt(ans)}. כתבו בעמודות וזכרו להעביר/לפרוק כשצריך.`,
      meta: { op: n.op, a: n.a, b: n.b, show: [n.a, n.b] },
    });
  }
  function qWordAS(r, level) {
    const n = asNums(r, level, false);
    const ans = n.op === '+' ? n.a + n.b : n.a - n.b;
    const tpl = n.op === '+' ? pick(r, WORD_ADD) : pick(r, WORD_SUB);
    return mk('addsub', level, 'asWord', {
      text: tpl(n.a, n.b), answer: ans,
      explain: `${n.op === '+' ? 'מחברים' : 'מחסרים'}: ${fmt(n.a)} ${n.op === '+' ? '+' : '−'} ${fmt(n.b)} = ${fmt(ans)}.`,
      meta: { op: n.op, a: n.a, b: n.b, show: [n.a, n.b] },
    });
  }
  function qTwoStep(r, level) {
    const t = ri(r, 1, 4);
    let a, b, c, text, ans, how;
    if (t === 1) {
      a = ri(r, 2000, 6000); b = ri(r, 500, 2500); c = ri(r, 100, a + b - 500);
      ans = a + b - c;
      text = `בבית הספר למדו ${fmt(a)} תלמידים. בתחילת השנה הצטרפו ${fmt(b)} תלמידים, ובסוף השנה עזבו ${fmt(c)} תלמידים. כמה תלמידים למדו בבית הספר בסוף השנה?`;
      how = `${fmt(a)} + ${fmt(b)} − ${fmt(c)}`;
    } else if (t === 2) {
      a = ri(r, 4000, 9999); b = ri(r, 500, 3000); c = ri(r, 500, Math.min(3000, a - b - 100));
      ans = a - b - c;
      text = `בחנות היו ${fmt(a)} ספרים. ביום ראשון נמכרו ${fmt(b)} ספרים, וביום שני נמכרו ${fmt(c)} ספרים. כמה ספרים נשארו בחנות?`;
      how = `${fmt(a)} − ${fmt(b)} − ${fmt(c)}`;
    } else if (t === 3) {
      a = ri(r, 1000, 3300); b = ri(r, 1000, 3300); c = ri(r, 1000, 3300);
      ans = a + b + c;
      text = `ילדי הכיתה קראו ${fmt(a)} עמודים ביום ראשון, ${fmt(b)} עמודים ביום שני ו-${fmt(c)} עמודים ביום שלישי. כמה עמודים קראו בשלושת הימים?`;
      how = `${fmt(a)} + ${fmt(b)} + ${fmt(c)}`;
    } else {
      a = ri(r, 2000, 6000); b = ri(r, 500, 2500); c = ri(r, 100, a + b - 500);
      ans = a + b - c;
      text = `בקופה היו ${fmt(a)} שקלים. הכניסו אליה ${fmt(b)} שקלים והוציאו ממנה ${fmt(c)} שקלים. כמה שקלים יש בקופה עכשיו?`;
      how = `${fmt(a)} + ${fmt(b)} − ${fmt(c)}`;
    }
    return mk('addsub', level, 'asTwoStep', {
      text, answer: ans, explain: `פותרים בשני שלבים: ${how} = ${fmt(ans)}.`,
      meta: { tpl: t, a, b, c, show: [a, b, c] },
    });
  }

  // =====================================================================
  // 3) השבר הפשוט
  // =====================================================================
  function barSvg(n, k) {
    const W = 300, H = 54, w = W / n;
    let s = `<svg viewBox="0 0 ${W + 4} ${H + 4}" role="img" aria-label="מלבן שמחולק ל-${n} חלקים שווים, ${k} מהם צבועים">`;
    for (let i = 0; i < n; i++) {
      s += `<rect class="seg${i < k ? ' on' : ''}" x="${(2 + i * w).toFixed(1)}" y="2" width="${w.toFixed(1)}" height="${H}"/>`;
    }
    return s + '</svg>';
  }
  const sameFrac = (x, y) => x[0] * y[1] === x[1] * y[0];
  function fracChoices(r, ans, cands, count) {
    const out = [ans];
    for (const c of cands) {
      if (c[0] <= 0 || c[1] <= 0) continue;
      if (out.some(o => sameFrac(o, c))) continue;
      out.push(c);
      if (out.length >= count) break;
    }
    let extra = 1;
    while (out.length < count) {
      const c = [ans[0], ans[1] + extra++];
      if (!out.some(o => sameFrac(o, c))) out.push(c);
    }
    return shuffle(r, out).map(x => frac(x[0], x[1]));
  }
  function qFracBar(r, level) {
    const n = ri(r, 3, 8), k = ri(r, 1, n - 1);
    const ch = fracChoices(r, [k, n], [[n - k, n], [k, n - k], [k + 1, n], [k, n + 1], [n, k]], 4);
    return mk('fractions', level, 'fracBar', {
      kind: 'choice', text: 'איזה שבר מייצג את החלק הצבוע?', svg: barSvg(n, k),
      choices: ch, answer: frac(k, n),
      explain: `המלבן מחולק ל-${n} חלקים שווים, ${k} מהם צבועים — לכן השבר הוא ${frac(k, n)}.`,
      meta: { n, k, show: [] },
    });
  }
  function qFracFood(r, level) {
    const n = ri(r, 4, 10), k = ri(r, 1, n - 1), eaten = r() < 0.5;
    const ans = eaten ? [k, n] : [n - k, n];
    const ch = fracChoices(r, ans, [[n - ans[0], n], [ans[0], n - ans[0]], [ans[0] + 1, n], [ans[0], n + 1]], 4);
    return mk('fractions', level, 'fracFood', {
      kind: 'choice',
      text: `שוקולד חולק ל-${n} חלקים שווים. אכלו ${k} חלקים. איזה שבר מהשוקולד ${eaten ? 'נאכל' : 'נשאר'}?`,
      choices: ch, answer: frac(ans[0], ans[1]),
      explain: `${eaten ? 'אכלו' : 'נשארו'} ${ans[0]} חלקים מתוך ${n} — השבר ${frac(ans[0], ans[1])}.`,
      meta: { n, k, eaten, show: [n, k] },
    });
  }
  function qFracTerm(r, level) {
    const n = ri(r, 3, 12), k = ri(r, 1, n - 1), num = r() < 0.5;
    return mk('fractions', level, 'fracTerm', {
      text: `בשבר ${frac(k, n)} — מהו ה${num ? 'מונה' : 'מכנה'}?`, answer: num ? k : n,
      explain: `המונה הוא המספר העליון (כמה חלקים לוקחים) והמכנה הוא התחתון (לכמה חלקים שווים חילקו את השלם). בשבר ${frac(k, n)} ה${num ? 'מונה' : 'מכנה'} הוא ${num ? k : n}.`,
      meta: { n, k, num, show: [] },
    });
  }
  function qFracCompare(r, level, mode) {
    let a, b, ans, why;
    if (mode === 'unit') {
      do { a = ri(r, 2, 10); b = ri(r, 2, 10); } while (a === b);
      const x = [1, a], y = [1, b];
      ans = a < b ? x : y;
      why = 'כשהמונים שווים, השבר עם המכנה הקטן יותר גדול יותר (השלם מחולק לפחות חלקים, אז כל חלק גדול יותר).';
      return mk('fractions', level, 'fracCompare', {
        kind: 'choice', text: 'איזה שבר גדול יותר?', choices: shuffle(r, [frac(1, a), frac(1, b)]),
        answer: frac(ans[0], ans[1]), explain: why, meta: { mode, a: [1, a], b: [1, b], show: [] },
      });
    }
    if (mode === 'sameNum') {
      const k = ri(r, 2, 5);
      do { a = ri(r, k + 1, 12); b = ri(r, k + 1, 12); } while (a === b);
      ans = a < b ? [k, a] : [k, b];
      return mk('fractions', level, 'fracCompare', {
        kind: 'choice', text: 'איזה שבר גדול יותר?', choices: shuffle(r, [frac(k, a), frac(k, b)]),
        answer: frac(ans[0], ans[1]),
        explain: 'כשהמונים שווים, השבר עם המכנה הקטן יותר גדול יותר.', meta: { mode, a: [k, a], b: [k, b], show: [] },
      });
    }
    const d = ri(r, 4, 12);
    do { a = ri(r, 1, d - 1); b = ri(r, 1, d - 1); } while (a === b);
    ans = a > b ? [a, d] : [b, d];
    return mk('fractions', level, 'fracCompare', {
      kind: 'choice', text: 'איזה שבר גדול יותר?', choices: shuffle(r, [frac(a, d), frac(b, d)]),
      answer: frac(ans[0], ans[1]),
      explain: 'כשהמכנים שווים, השבר עם המונה הגדול יותר גדול יותר.', meta: { mode, a: [a, d], b: [b, d], show: [] },
    });
  }
  function qFracWhole(r, level) {
    const n = ri(r, 3, 12);
    return mk('fractions', level, 'fracWhole', {
      text: `כמה חלקים של ${frac(1, n)} יש בשלם אחד?`, answer: n,
      explain: `השלם מחולק ל-${n} חלקים שווים, ולכן ${n} חלקים של ${frac(1, n)} מרכיבים שלם.`,
      meta: { n, show: [] },
    });
  }
  function qFracComplete(r, level) {
    const n = ri(r, 4, 12), k = ri(r, 1, n - 1);
    return mk('fractions', level, 'fracComplete', {
      text: 'מה המונה שחסר כדי להשלים לשלם?', eq: `${frac(k, n)} + ${frac(BOX, n)} = 1`, answer: n - k,
      explain: `שלם אחד הוא ${frac(n, n)}. ${n} − ${k} = ${n - k}, לכן חסר ${frac(n - k, n)}.`,
      meta: { n, k, show: [] },
    });
  }
  function qFracUnitOf(r, level) {
    const n = pick(r, [2, 3, 4, 5, 6, 8, 10]), m = ri(r, 2, 12);
    return mk('fractions', level, 'fracUnitOf', {
      text: `מהו ${frac(1, n)} מ-${n * m}?`, answer: m,
      explain: `מחלקים ל-${n} חלקים שווים: ${n * m} ÷ ${n} = ${m}.`,
      meta: { n, k: 1, m, show: [n * m] },
    });
  }
  function qFracKOf(r, level) {
    const n = pick(r, [3, 4, 5, 6, 8, 10]), k = ri(r, 2, n - 1), m = ri(r, 2, 10);
    return mk('fractions', level, 'fracKOf', {
      text: `מהו ${frac(k, n)} מ-${n * m}?`, answer: k * m,
      explain: `קודם ${frac(1, n)}: ${n * m} ÷ ${n} = ${m}. אחר כך ${k} × ${m} = ${k * m}.`,
      meta: { n, k, m, show: [n * m] },
    });
  }
  function qFracWholeFromPart(r, level) {
    const n = pick(r, [3, 4, 5, 6, 8]), k = ri(r, 2, n - 1), m = ri(r, 2, 9);
    return mk('fractions', level, 'fracWholeFromPart', {
      text: `${frac(k, n)} מהכמות הם ${k * m}. מהי הכמות כולה?`, answer: n * m,
      explain: `${k} חלקים הם ${k * m}, אז חלק אחד (${frac(1, n)}) הוא ${k * m} ÷ ${k} = ${m}. כל ${n} החלקים: ${n} × ${m} = ${n * m}.`,
      meta: { n, k, m, show: [k * m] },
    });
  }
  function qFracLeft(r, level) {
    const n = ri(r, 6, 12);
    const a = ri(r, 1, n - 3), b = ri(r, 1, n - a - 1);
    const left = n - a - b;
    const ch = fracChoices(r, [left, n], [[a + b, n], [n - a, n], [n - b, n], [left, n - 1]], 4);
    return mk('fractions', level, 'fracLeft', {
      kind: 'choice',
      text: `אכלו ${frac(a, n)} מהעוגה, ואחר כך עוד ${frac(b, n)} מהעוגה. איזה שבר מהעוגה נשאר?`,
      choices: ch, answer: frac(left, n),
      explain: `נאכלו ${a} + ${b} = ${a + b} חלקים מתוך ${n}. נשארו ${n} − ${a + b} = ${left} חלקים: ${frac(left, n)}.`,
      meta: { n, a, b, show: [] },
    });
  }

  // =====================================================================
  // 4) כפל וחילוק
  // =====================================================================
  function qMulMeaning(r, level) {
    const g = ri(r, 2, 9), s = ri(r, 2, 9);
    return mk('muldiv', level, 'mulMeaning', {
      text: `ב-${g} קופסאות יש ${s} עפרונות בכל קופסה. כמה עפרונות יש בסך הכול?`, answer: g * s,
      explain: `${g} קבוצות של ${s}: ${g} × ${s} = ${g * s}.`,
      meta: { a: g, b: s, show: [g, s] },
    });
  }
  function qDivMeaning(r, level) {
    const d = ri(r, 2, 9), q = ri(r, 2, 9);
    return mk('muldiv', level, 'divMeaning', {
      text: `חילקו ${d * q} מדבקות שווה בשווה בין ${d} ילדים. כמה מדבקות קיבל כל ילד?`, answer: q,
      explain: `${d * q} ÷ ${d} = ${q}, כי ${d} × ${q} = ${d * q}.`,
      meta: { total: d * q, d, show: [d * q, d] },
    });
  }
  function qTable(r, level) {
    const a = ri(r, 2, 9), b = ri(r, 2, 9);
    return mk('muldiv', level, 'table', {
      text: 'חשבו:', eq: `${a} × ${b} = ?`, answer: a * b,
      explain: `${a} × ${b} = ${a * b}.`, meta: { a, b, show: [a, b] },
    });
  }
  function qMulPow(r, level) {
    const f = pick(r, [10, 100, 1000]), n = ri(r, 2, 99);
    return mk('muldiv', level, 'mulPow', {
      text: 'חשבו:', eq: `${n} × ${fmt(f)} = ?`, answer: n * f,
      explain: `כפל ב-${fmt(f)}: מוסיפים ${String(f).length - 1} אפסים. ${n} × ${fmt(f)} = ${fmt(n * f)}.`,
      meta: { n, f, show: [n] },
    });
  }
  function qMulTens(r, level) {
    const a = ri(r, 2, 9), b = ri(r, 2, 9);
    return mk('muldiv', level, 'mulTens', {
      text: 'חשבו:', eq: `${a * 10} × ${b} = ?`, answer: a * 10 * b,
      explain: `${a} × ${b} = ${a * b}, ואז כופלים ב-10: ${a * 10 * b}.`,
      meta: { a: a * 10, b, show: [a * 10, b] },
    });
  }
  function qDivPow(r, level) {
    const f = pick(r, [10, 100, 1000]), n = ri(r, 2, 99);
    return mk('muldiv', level, 'divPow', {
      text: 'חשבו:', eq: `${fmt(n * f)} ÷ ${fmt(f)} = ?`, answer: n,
      explain: `חילוק ב-${fmt(f)}: מסירים ${String(f).length - 1} אפסים. ${fmt(n * f)} ÷ ${fmt(f)} = ${n}.`,
      meta: { n, f, show: [n * f] },
    });
  }
  function qMulMissing(r, level) {
    const f = pick(r, [10, 100, 1000]), n = ri(r, 2, 99);
    return mk('muldiv', level, 'mulMissing', {
      text: 'מה המספר החסר?', eq: `${n} × ${BOX} = ${fmt(n * f)}`, answer: f,
      explain: `${fmt(n * f)} ÷ ${n} = ${fmt(f)}.`, meta: { n, f, show: [n] },
    });
  }
  function qDivOneDigit(r, level, big) {
    const d = ri(r, 2, 9);
    const lo = big ? Math.ceil(1000 / d) : Math.ceil(40 / d);
    const hi = big ? Math.floor(9000 / d) : Math.floor(999 / d);
    const q = ri(r, lo, hi);
    return mk('muldiv', level, 'divOne', {
      text: 'חשבו:', eq: `${fmt(d * q)} ÷ ${d} = ?`, answer: q,
      explain: `בודקים עם כפל: ${d} × ${fmt(q)} = ${fmt(d * q)}. לכן ${fmt(d * q)} ÷ ${d} = ${fmt(q)}.`,
      meta: { total: d * q, d, show: [d * q, d] },
    });
  }
  function qMulTwoByOne(r, level) {
    const a = ri(r, 12, 99), b = ri(r, 2, 9);
    return mk('muldiv', level, 'mulTwoOne', {
      text: 'חשבו:', eq: `${a} × ${b} = ?`, answer: a * b,
      explain: `${a} × ${b}: פרקו ${a} לעשרות ויחידות — ${Math.floor(a / 10) * 10} × ${b} + ${a % 10} × ${b} = ${a * b}.`,
      meta: { a, b, show: [a, b] },
    });
  }
  function qRemainder(r, level) {
    const d = ri(r, 2, 9), n = ri(r, 100, 999);
    if (n % d === 0) return qRemainder(r, level);
    return mk('muldiv', level, 'remainder', {
      text: `מהי השארית בחילוק ${n} ÷ ${d}?`, answer: n % d,
      explain: `${d} × ${Math.floor(n / d)} = ${d * Math.floor(n / d)}. ${n} − ${d * Math.floor(n / d)} = ${n % d}, זו השארית.`,
      meta: { n, d, show: [n, d] },
    });
  }
  function qWordMulDiv(r, level, hard) {
    const t = ri(r, 1, 3);
    if (t === 1) {
      const rows = hard ? ri(r, 12, 40) : ri(r, 3, 9), s = hard ? ri(r, 3, 9) : ri(r, 3, 9);
      return mk('muldiv', level, 'wordMul', {
        text: `בכל שורה בכיתה יושבים ${s} תלמידים. יש ${rows} שורות. כמה תלמידים יושבים בכיתה?`, answer: rows * s,
        explain: `${rows} × ${s} = ${rows * s}.`, meta: { a: rows, b: s, show: [rows, s] },
      });
    }
    if (t === 2) {
      const d = ri(r, 3, 9), q = hard ? ri(r, 120, 900) : ri(r, 10, 99);
      return mk('muldiv', level, 'wordDiv', {
        text: `חילקו ${fmt(d * q)} ספרים שווה בשווה בין ${d} כיתות. כמה ספרים קיבלה כל כיתה?`, answer: q,
        explain: `${fmt(d * q)} ÷ ${d} = ${fmt(q)}.`, meta: { total: d * q, d, show: [d * q, d] },
      });
    }
    const d = ri(r, 3, 9), q = hard ? ri(r, 20, 400) : ri(r, 5, 60);
    return mk('muldiv', level, 'wordPack', {
      text: `אורזים ${fmt(d * q)} ביצים בקרטונים של ${d} ביצים. כמה קרטונים יתמלאו?`, answer: q,
      explain: `${fmt(d * q)} ÷ ${d} = ${fmt(q)} קרטונים.`, meta: { total: d * q, d, show: [d * q, d] },
    });
  }

  // =====================================================================
  // 5) גיאומטריה
  // =====================================================================
  function polySvg(n, diagonals) {
    let pts;
    if (n === 4) pts = [[30, 25], [170, 25], [170, 115], [30, 115]];
    else {
      const cx = 100, cy = 72, R = 60;
      pts = [];
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + 2 * Math.PI * i / n;
        pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
      }
    }
    const f = v => v.toFixed(1);
    let s = `<svg viewBox="0 0 200 144" role="img" aria-label="מצולע בעל ${n} צלעות">`;
    s += `<polygon class="poly" points="${pts.map(p => f(p[0]) + ',' + f(p[1])).join(' ')}"/>`;
    if (diagonals) { // האלכסונים מעל המילוי, מתחת לקדקודים
      for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        s += `<line class="dg" x1="${f(pts[i][0])}" y1="${f(pts[i][1])}" x2="${f(pts[j][0])}" y2="${f(pts[j][1])}"/>`;
      }
    }
    s += pts.map(p => `<circle class="vtx" cx="${f(p[0])}" cy="${f(p[1])}" r="3.5"/>`).join('');
    return s + '</svg>';
  }
  const POLY = {
    3: { name: 'משולש', inn: 'במשולש' }, 4: { name: 'מרובע', inn: 'במרובע' },
    5: { name: 'מחומש', inn: 'במחומש' }, 6: { name: 'משושה', inn: 'במשושה' },
    7: { name: 'משובע', inn: 'במשובע' }, 8: { name: 'מתומן', inn: 'במתומן' },
  };
  // רק עובדות חד-משמעיות (מצולעים משוכללים / צורות מוגדרות). fig: קדקודים, זוגות צלעות מקבילות (אינדקס צלע i = קדקוד i עד i+1), וקדקודים עם זווית ישרה.
  const regPts = (n, cx, cy, R) => Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + 2 * Math.PI * i / n; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
  const SHAPES = [
    { name: 'מלבן', inn: 'במלבן', par: 2, right: 4, fig: { pts: [[30, 28], [170, 28], [170, 116], [30, 116]], pairs: [[0, 2], [1, 3]], rights: [0, 1, 2, 3] } },
    { name: 'ריבוע', inn: 'בריבוע', par: 2, right: 4, fig: { pts: [[56, 24], [144, 24], [144, 112], [56, 112]], pairs: [[0, 2], [1, 3]], rights: [0, 1, 2, 3] } },
    { name: 'משולש שווה צלעות', inn: 'במשולש שווה צלעות', par: 0, right: 0, fig: { pts: [[100, 18], [162, 126], [38, 126]], pairs: [], rights: [] } },
    { name: 'משולש ישר זווית', inn: 'במשולש ישר זווית', par: 0, right: 1, fig: { pts: [[44, 20], [44, 124], [164, 124]], pairs: [], rights: [1] } },
    { name: 'מחומש משוכלל', inn: 'במחומש משוכלל', par: 0, right: 0, fig: { pts: regPts(5, 100, 74, 60), pairs: [], rights: [] } },
    { name: 'משושה משוכלל', inn: 'במשושה משוכלל', par: 3, right: 0, fig: { pts: regPts(6, 100, 72, 60), pairs: [[0, 3], [1, 4], [2, 5]], rights: [] } },
  ];
  // ציור צורה מוגדרת. marks: { par: true | [אינדקסי זוגות], right: true | [אינדקסי קדקודים] } — בציור השאלה אין סימונים כדי לא לגלות את התשובה.
  function shapeSvg(name, marks) {
    const sh = SHAPES.find(x => x.name === name); if (!sh) return '';
    const P = sh.fig.pts, n = P.length, f = v => v.toFixed(1);
    const mk2 = marks || {};
    let s = `<svg viewBox="0 0 200 144" role="img" aria-label="${name}">`;
    s += `<polygon class="poly" points="${P.map(p => f(p[0]) + ',' + f(p[1])).join(' ')}"/>`;
    const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    if (mk2.par) {
      const which = mk2.par === true ? sh.fig.pairs.map((_, i) => i) : mk2.par;
      which.forEach(pi => {
        const [i, j] = sh.fig.pairs[pi];
        const u1 = unit(P[i], P[(i + 1) % n]);
        [i, j].forEach(side => {
          const a = P[side], b = P[(side + 1) % n];
          let u = unit(a, b); if (u[0] * u1[0] + u[1] * u1[1] < 0) u = [-u[0], -u[1]]; // כל החצים באותו כיוון
          const v = [-u[1], u[0]], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, cnt = pi + 1;
          for (let k = 0; k < cnt; k++) {
            const o = (k - (cnt - 1) / 2) * 8, cx = mx + u[0] * o, cy = my + u[1] * o;
            s += `<path class="pm" d="M${f(cx - u[0] * 4 + v[0] * 5)},${f(cy - u[1] * 4 + v[1] * 5)} L${f(cx + u[0] * 4)},${f(cy + u[1] * 4)} L${f(cx - u[0] * 4 - v[0] * 5)},${f(cy - u[1] * 4 - v[1] * 5)}"/>`;
          }
        });
      });
    }
    if (mk2.right) {
      const which = mk2.right === true ? sh.fig.rights : mk2.right;
      which.forEach(vi => {
        const p = P[vi], u1 = unit(p, P[(vi + n - 1) % n]), u2 = unit(p, P[(vi + 1) % n]), z = 11;
        s += `<path class="ra" d="M${f(p[0] + u1[0] * z)},${f(p[1] + u1[1] * z)} L${f(p[0] + (u1[0] + u2[0]) * z)},${f(p[1] + (u1[1] + u2[1]) * z)} L${f(p[0] + u2[0] * z)},${f(p[1] + u2[1] * z)}"/>`;
      });
    }
    s += P.map(p => `<circle class="vtx" cx="${f(p[0])}" cy="${f(p[1])}" r="3.5"/>`).join('');
    return s + '</svg>';
  }
  function qPolySides(r, level, maxN) {
    const n = ri(r, 3, maxN), vert = r() < 0.4;
    return mk('geometry', level, 'polySides', {
      text: `כמה ${vert ? 'קדקודים' : 'צלעות'} יש במצולע שבציור?`, svg: polySvg(n), answer: n,
      explain: `סופרים את ה${vert ? 'קדקודים (הנקודות)' : 'צלעות (הקווים)'}: ${n}. במצולע מספר הצלעות שווה למספר הקדקודים.`,
      meta: { n, vert, show: [] },
    });
  }
  function qPolyFacts(r, level) {
    const n = ri(r, 3, 8), vert = r() < 0.4;
    return mk('geometry', level, 'polyFacts', {
      text: `כמה ${vert ? 'קדקודים' : 'צלעות'} יש ${POLY[n].inn}?`, answer: n, svg: polySvg(n),
      explain: `${POLY[n].name} הוא מצולע בעל ${n} צלעות ו-${n} קדקודים.`,
      meta: { n, vert, show: [] },
    });
  }
  function qPolyName(r, level, maxN) {
    const n = ri(r, 3, maxN);
    const names = [3, 4, 5, 6, 7, 8].filter(x => x !== n).map(x => POLY[x].name);
    return mk('geometry', level, 'polyName', {
      kind: 'choice', text: 'איך נקרא המצולע שבציור?', svg: polySvg(n),
      choices: choicesOf(r, POLY[n].name, shuffle(r, names), 4), answer: POLY[n].name,
      explain: `למצולע ${n} צלעות, לכן הוא נקרא ${POLY[n].name}.`, meta: { n, show: [] },
    });
  }
  function qDef(r, level, which) {
    const D = {
      par: { text: 'צלעות מקבילות הן צלעות ש...', good: 'אינן נפגשות לעולם, גם אם מאריכים אותן', bad: ['יוצרות ביניהן זווית ישרה', 'שוות זו לזו באורכן', 'נפגשות בקדקוד אחד'],
        why: 'צלעות מקבילות נמצאות תמיד באותו מרחק זו מזו ולעולם אינן נפגשות.' },
      perp: { text: 'צלעות מאונכות הן צלעות ש...', good: 'יוצרות ביניהן זווית ישרה', bad: ['אינן נפגשות לעולם', 'שוות זו לזו באורכן', 'יוצרות ביניהן זווית קהה'],
        why: 'צלעות מאונכות נפגשות בזווית ישרה (90°).' },
      diag: { text: 'אלכסון במצולע הוא קטע שמחבר...', good: 'שני קדקודים שאינם סמוכים זה לזה', bad: ['שני קדקודים סמוכים', 'אמצעים של שתי צלעות סמוכות', 'קדקוד אחד לעצמו'],
        why: 'אלכסון מחבר שני קדקודים שאינם סמוכים. קטע שמחבר קדקודים סמוכים הוא צלע.' },
    }[which];
    const fig = which === 'par' ? shapeSvg('מלבן', { par: [0] }) : which === 'perp' ? shapeSvg('מלבן', { right: [0] }) : polySvg(5, true);
    return mk('geometry', level, 'def_' + which, {
      kind: 'choice', text: D.text, choices: shuffle(r, [D.good].concat(D.bad)), answer: D.good,
      explain: D.why, svgAfter: fig, meta: { which, show: [] },
    });
  }
  function qParPairs(r, level, pool) {
    const s = pick(r, pool);
    return mk('geometry', level, 'parPairs', {
      text: `כמה זוגות של צלעות מקבילות יש ${s.inn}?`, answer: s.par, svg: shapeSvg(s.name), svgAfter: shapeSvg(s.name, { par: true }),
      explain: s.par === 0 ? `${s.inn} אין צלעות מקבילות.` : `${s.inn} יש ${s.par} זוגות של צלעות מקבילות.`,
      meta: { shape: s.name, show: [] },
    });
  }
  function qRightAngles(r, level, pool) {
    const s = pick(r, pool);
    return mk('geometry', level, 'rightAngles', {
      text: `כמה זוויות ישרות יש ${s.inn}?`, answer: s.right, svg: shapeSvg(s.name), svgAfter: shapeSvg(s.name, { right: true }),
      explain: s.right === 0 ? `${s.inn} אין זוויות ישרות.` : `${s.inn} יש ${s.right} זוויות ישרות.`,
      meta: { shape: s.name, show: [] },
    });
  }
  function qWhichShape(r, level, pool) {
    const prop = r() < 0.5 ? 'par' : 'right';
    const target = pick(r, pool);
    const v = target[prop];
    const others = shuffle(r, SHAPES.filter(s => s[prop] !== v));
    if (others.length < 3) return qWhichShape(r, level, pool);
    const opts = shuffle(r, [target].concat(others.slice(0, 3)));
    let text;
    if (prop === 'par') {
      text = v === 0 ? 'באיזו צורה אין אף זוג צלעות מקבילות?'
        : `באיזו צורה יש בדיוק ${v === 1 ? 'זוג אחד' : v + ' זוגות'} של צלעות מקבילות?`;
    } else {
      text = v === 0 ? 'באיזו צורה אין אף זווית ישרה?'
        : v === 1 ? 'באיזו צורה יש בדיוק זווית ישרה אחת?' : `באיזו צורה יש בדיוק ${v} זוויות ישרות?`;
    }
    return mk('geometry', level, 'whichShape', {
      kind: 'choice', text, choices: opts.map(s => s.name), answer: target.name,
      explain: `${target.inn} ${prop === 'par' ? (v === 0 ? 'אין צלעות מקבילות' : `יש ${v} זוגות של צלעות מקבילות`) : (v === 0 ? 'אין זוויות ישרות' : `יש ${v} זוויות ישרות`)}, ובשאר הצורות המספר שונה.`.replace('יש 1 זוגות', 'יש זוג אחד').replace('יש 1 זוויות ישרות', 'יש זווית ישרה אחת'),
      svgAfter: shapeSvg(target.name, prop === 'par' ? { par: true } : { right: true }),
      meta: { prop, value: v, shape: target.name, options: opts.map(s => s.name), show: [] },
    });
  }
  function qDiagTotal(r, level, ns) {
    const n = pick(r, ns), ans = n * (n - 3) / 2;
    const mq = mk('geometry', level, 'diagTotal', {
      text: `כמה אלכסונים יש ${POLY[n].inn}?`, svg: polySvg(n),
      answer: ans,
      explain: `מכל קדקוד יוצאים ${n - 3} אלכסונים (לא לקדקוד עצמו ולא לשני השכנים). ${n} × ${n - 3} = ${n * (n - 3)}, וכל אלכסון נספר פעמיים, לכן ${n * (n - 3)} ÷ 2 = ${ans}.`,
      svgAfter: polySvg(n, true),
      meta: { n, show: [] },
    });
    return mq;
  }
  function qDiagFromVertex(r, level, ns) {
    const n = pick(r, ns);
    return mk('geometry', level, 'diagVertex', {
      text: `כמה אלכסונים יוצאים מקדקוד אחד ${POLY[n].inn}?`, svg: polySvg(n), answer: n - 3,
      explain: `מקדקוד אחד אפשר לחבר לכל הקדקודים חוץ מעצמו ומשני השכנים שלו: ${n} − 3 = ${n - 3}.`,
      meta: { n, show: [] },
    });
  }

  // =====================================================================
  // הרכבה לפי נושא ורמה
  // =====================================================================
  const GEN = {
    million: {
      1: [r => qDigitValue(r, 1, ri(r, 4, 5)), r => qExpanded(r, 1, 4)],
      2: [r => qExpanded(r, 2, ri(r, 5, 6)), r => qMissingPart(r, 2, ri(r, 5, 6)), r => qDigitValue(r, 2, 6)],
      3: [r => qCompare(r, 3, 6), r => qExtreme(r, 3, 6, 3, r() < 0.5 ? 'max' : 'min'), r => qExpanded(r, 3, 6), r => qMissingPart(r, 3, 6)],
      4: [r => qDigitValue(r, 4, 7), r => qStep(r, 4), r => qCompare(r, 4, 7), r => qExtreme(r, 4, 7, 4, r() < 0.5 ? 'max' : 'min'), r => qExpanded(r, 4, 7)],
      5: [r => qRead(r, 5), r => qThousands(r, 5), r => qCross(r, 5), r => qExtreme(r, 5, 7, 4, r() < 0.5 ? 'max' : 'min'), r => qMissingPart(r, 5, 7)],
    },
    addsub: {
      1: [r => (r() < 0.2 ? qWordAS(r, 1) : qPlainAS(r, 1))],
      2: [r => (r() < 0.35 ? qWordAS(r, 2) : qPlainAS(r, 2))],
      3: [r => (r() < 0.5 ? qWordAS(r, 3) : qPlainAS(r, 3))],
      4: [r => (r() < 0.6 ? qWordAS(r, 4) : qPlainAS(r, 4))],
      5: [r => (r() < 0.8 ? qTwoStep(r, 5) : qWordAS(r, 4))],
    },
    fractions: {
      1: [r => qFracBar(r, 1), r => qFracFood(r, 1), r => qFracTerm(r, 1)],
      2: [r => qFracCompare(r, 2, 'unit'), r => qFracCompare(r, 2, 'sameDen'), r => qFracBar(r, 2), r => qFracTerm(r, 2)],
      3: [r => qFracWhole(r, 3), r => qFracComplete(r, 3), r => qFracCompare(r, 3, 'sameNum'), r => qFracCompare(r, 3, 'sameDen')],
      4: [r => qFracUnitOf(r, 4), r => qFracComplete(r, 4), r => qFracLeft(r, 4)],
      5: [r => qFracKOf(r, 5), r => qFracWholeFromPart(r, 5), r => qFracLeft(r, 5), r => qFracUnitOf(r, 5)],
    },
    muldiv: {
      1: [r => qMulMeaning(r, 1), r => qDivMeaning(r, 1), r => qTable(r, 1)],
      2: [r => qMulPow(r, 2), r => qMulTens(r, 2), r => qTable(r, 2)],
      3: [r => qDivPow(r, 3), r => qMulMissing(r, 3), r => qMulPow(r, 3), r => qWordMulDiv(r, 3, false)],
      4: [r => qDivOneDigit(r, 4, false), r => qMulTwoByOne(r, 4), r => qWordMulDiv(r, 4, false)],
      5: [r => qDivOneDigit(r, 5, true), r => qRemainder(r, 5), r => qWordMulDiv(r, 5, true)],
    },
    geometry: {
      1: [r => qPolySides(r, 1, 7), r => qPolyName(r, 1, 6), r => qPolyFacts(r, 1)],
      2: [r => qDef(r, 2, 'par'), r => qDef(r, 2, 'perp'), r => qParPairs(r, 2, SHAPES.slice(0, 4)), r => qRightAngles(r, 2, SHAPES.slice(0, 4)), r => qPolyName(r, 2, 8), r => qWhichShape(r, 2, SHAPES.slice(0, 4))],
      3: [r => qDef(r, 3, 'diag'), r => qDiagTotal(r, 3, [4, 5]), r => qParPairs(r, 3, SHAPES), r => qRightAngles(r, 3, SHAPES), r => qWhichShape(r, 3, SHAPES)],
      4: [r => qDiagTotal(r, 4, [5, 6]), r => qParPairs(r, 4, SHAPES), r => qRightAngles(r, 4, SHAPES), r => qDiagFromVertex(r, 4, [4, 5, 6]), r => qWhichShape(r, 4, SHAPES)],
      5: [r => qDiagFromVertex(r, 5, [5, 6, 7, 8]), r => qDiagTotal(r, 5, [6, 7]), r => qParPairs(r, 5, SHAPES), r => qDef(r, 5, pick(r, ['par', 'perp', 'diag'])), r => qWhichShape(r, 5, SHAPES)],
    },
  };

  function generateQuestion(topicId, level, rng) {
    const lv = Math.max(1, Math.min(MAX_LEVEL, level | 0));
    const list = GEN[topicId][lv];
    const q = pick(rng, list)(rng);
    q.level = lv; // הרמה היא המשבצת שממנה נבחרה השאלה
    q.skill = q.gen + (q.meta.op ? ':' + q.meta.op : '') + (q.gen === 'fracCompare' ? ':' + q.meta.mode : '');
    return q;
  }
  const qKey = q => q.topic + '|' + q.gen + '|' + JSON.stringify(q.meta) + '|' + q.text + '|' + (q.eq || '');

  // ---------- בדיקת תשובה ----------
  function parseNumber(s) {
    const t = String(s).replace(/[^\d]/g, '');
    return t === '' ? NaN : Number(t);
  }
  function checkAnswer(q, given) {
    if (q.kind === 'choice') return given === q.answer;
    return parseNumber(given) === q.answer;
  }

  // ---------- פרופיל והתאמת רמה ----------
  function newProfile() {
    const levels = {}, windows = {}, stats = {}, hist = {}, baseline = {};
    TOPICS.forEach(t => {
      levels[t.id] = START_LEVEL; windows[t.id] = []; stats[t.id] = { answered: 0, correct: 0 };
      hist[t.id] = ''; baseline[t.id] = { n: 0, c: 0 };
    });
    return { v: 2, levels, windows, stats, hist, baseline, skills: {}, start: null, lastCounts: {}, days: {} };
  }
  function ensureProfile(p) { // משלים שדות חסרים בפרופילים ישנים
    const b = newProfile();
    ['levels', 'windows', 'stats', 'hist', 'baseline'].forEach(k => {
      p[k] = p[k] || {};
      TOPICS.forEach(t => { if (p[k][t.id] === undefined) p[k][t.id] = b[k][t.id]; });
    });
    p.skills = p.skills || {}; p.lastCounts = p.lastCounts || {}; p.days = p.days || {};
    if (p.start === undefined) p.start = null;
    p.v = 2;
    return p;
  }
  function dayKey(d) {
    d = d || new Date();
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  /* כללי ההתאמה (לכל נושא בנפרד, אחרי כל תשובה):
     עלייה: לפחות 4 תשובות נכונות מתוך 5 האחרונות ברמה הנוכחית (ולפחות 4 תשובות ברמה).
     ירידה: 3 טעויות מתוך 4 התשובות האחרונות ברמה הנוכחית.
     אחרי כל שינוי רמה החלון מתאפס — כדי לחזור ולעלות צריך להוכיח שליטה מחדש.
     בנוסף נשמרים: היסטוריית תשובות אחרונות לכל נושא, פתיחה (10 התשובות הראשונות), ודיוק לכל מיומנות — לצורך ניתוח. */
  function recordAnswer(profile, topicId, correct, day, skill) {
    if (!profile.start) profile.start = Object.assign({}, profile.levels);
    const st = profile.stats[topicId];
    st.answered++; if (correct) st.correct++;
    const dk = day || dayKey();
    const d = profile.days[dk] || (profile.days[dk] = { answered: 0, correct: 0 });
    d.answered++; if (correct) d.correct++;
    const bit = correct ? '1' : '0';
    profile.hist[topicId] = ((profile.hist[topicId] || '') + bit).slice(-60);
    const bl = profile.baseline[topicId];
    if (bl.n < 10) { bl.n++; if (correct) bl.c++; }
    if (skill) {
      const s = profile.skills[skill] || (profile.skills[skill] = { n: 0, c: 0, r: '' });
      s.n++; if (correct) s.c++; s.r = (s.r + bit).slice(-10);
    }
    const w = profile.windows[topicId];
    w.push(correct ? 1 : 0);
    while (w.length > 5) w.shift();
    const sum = w.reduce((a, b) => a + b, 0);
    let event = null;
    if (w.length >= 4 && sum >= 4 && profile.levels[topicId] < MAX_LEVEL) {
      profile.levels[topicId]++; profile.windows[topicId] = []; event = 'up';
    } else {
      const last4 = w.slice(-4), wrong = last4.length - last4.reduce((a, b) => a + b, 0);
      if (last4.length >= 3 && wrong >= 3 && profile.levels[topicId] > 1) {
        profile.levels[topicId]--; profile.windows[topicId] = []; event = 'down';
      } else if (w.length >= 4 && sum >= 4 && profile.levels[topicId] === MAX_LEVEL) {
        profile.windows[topicId] = w.slice(-4); // נשארים באלוף
      }
    }
    d.levels = Object.assign({}, profile.levels); // תמונת מצב של הרמות בסוף היום
    const keys = Object.keys(profile.days).sort();
    while (keys.length > 90) delete profile.days[keys.shift()];
    return { event, level: profile.levels[topicId] };
  }
  function completeRound(profile, day, counts) {
    const dk = day || dayKey();
    const d = profile.days[dk] || (profile.days[dk] = { answered: 0, correct: 0 });
    d.rounds = (d.rounds || 0) + 1;
    if (counts) Object.assign(profile.lastCounts, counts);
  }
  // זמן תשובה (מילי-שניות): נשמר רק לצפייה של ההורה. מוגבל כדי שהפסקה באמצע שאלה לא תעוות את הממוצע.
  const TIME_CAP_MS = 120000;
  function recordTime(profile, topicId, day, ms, correct) {
    const m = Math.max(0, Math.min(TIME_CAP_MS, Math.round(Number(ms) || 0)));
    const dk = day || dayKey();
    const d = profile.days[dk] || (profile.days[dk] = { answered: 0, correct: 0 });
    d.ms = (d.ms || 0) + m; d.tn = (d.tn || 0) + 1;
    const st = profile.stats[topicId];
    if (st) {
      st.ms = (st.ms || 0) + m; st.tn = (st.tn || 0) + 1;
      if (correct) { st.cms = (st.cms || 0) + m; st.ctn = (st.ctn || 0) + 1; } // זמן בתשובות נכונות בלבד: משפיע על ציון היכולת
    }
    return m;
  }
  // דילוג על שאלה (השאלה חוזרת בסוף אותו חלק). אינו משפיע על הרמה או על הדיוק, אך נספר להורה.
  function recordSkip(profile, topicId, day, skill) {
    const dk = day || dayKey();
    const d = profile.days[dk] || (profile.days[dk] = { answered: 0, correct: 0 });
    d.sk = (d.sk || 0) + 1;
    const st = profile.stats[topicId]; if (st) st.sk = (st.sk || 0) + 1;
    if (skill) { const k = profile.skills[skill] || (profile.skills[skill] = { n: 0, c: 0, r: '' }); k.sk = (k.sk || 0) + 1; }
  }
  // סיום באמצע: תרגול שהופסק לפני שנגמר (עם תשובה אחת לפחות)
  function recordPartial(profile, day, answered) {
    const dk = day || dayKey();
    const d = profile.days[dk] || (profile.days[dk] = { answered: 0, correct: 0 });
    d.part = (d.part || 0) + 1; d.pq = (d.pq || 0) + (answered || 0);
  }
  function accuracy(profile, topicId) {
    const s = profile.stats[topicId];
    return s.answered ? s.correct / s.answered : null;
  }
  function recentAccuracy(profile, topicId, n) {
    const h = (profile.hist[topicId] || '').slice(-(n || 15));
    if (!h.length) return { n: 0, acc: null };
    let c = 0; for (const ch of h) if (ch === '1') c++;
    return { n: h.length, acc: c / h.length };
  }
  // שליטה אמיתית: רמה 4 ומעלה, לפחות 12 תשובות אחרונות, ולפחות 90% נכונות
  function isMastered(profile, topicId) {
    const r = recentAccuracy(profile, topicId, 15);
    return profile.levels[topicId] >= 4 && r.n >= 12 && r.acc >= 0.9;
  }
  function isWeak(profile, topicId) {
    const r = recentAccuracy(profile, topicId, 15);
    return profile.levels[topicId] <= 1 || (r.n >= 8 && r.acc < 0.65);
  }
  /* כמה שאלות בנושא בסבב הזה: נושא חלש 5; נושא בינוני 4 או 5; נושא שנשלט היטב 3 או 4.
     כשיש אפשרות בחירה — מעדיפים כמות שונה מהסבב הקודם. */
  function questionsPerTopic(profile, topicId, rng) {
    const allowed = isMastered(profile, topicId) ? [3, 4] : isWeak(profile, topicId) ? [5] : [4, 5];
    const last = profile.lastCounts[topicId];
    let pool = allowed;
    if (allowed.length > 1 && allowed.includes(last) && rng() < 0.8) pool = allowed.filter(x => x !== last);
    return pick(rng, pool);
  }
  // סבב: כל הנושאים, בסדר אקראי, כל נושא בבלוק של 3–5 שאלות
  function planRound(profile, rng) {
    return shuffle(rng, TOPICS.map(t => t.id)).map(id => ({ topic: id, count: questionsPerTopic(profile, id, rng) }));
  }
  function streak(profile, today) {
    const cur = new Date((today || dayKey()) + 'T12:00:00');
    let count = 0;
    const done = k => (profile.days[k] ? profile.days[k].answered : 0) >= ROUND_MIN;
    if (!done(dayKey(cur))) cur.setDate(cur.getDate() - 1);
    while (done(dayKey(cur))) { count++; cur.setDate(cur.getDate() - 1); }
    return count;
  }

  return {
    TOPICS, LEVEL_NAMES, MAX_LEVEL, START_LEVEL, ROUND_MIN, ROUND_MAX,
    mulberry32, fmt, generateQuestion, qKey, checkAnswer, parseNumber,
    newProfile, ensureProfile, recordAnswer, recordTime, recordSkip, recordPartial, TIME_CAP_MS, completeRound, accuracy, recentAccuracy,
    isMastered, isWeak, questionsPerTopic, planRound, streak, dayKey,
    _internals: { SHAPES, POLY, shapeSvg, polySvg },
  };
});
