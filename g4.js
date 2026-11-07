// g4.js — "כל נושאי כיתה ד'": נושאים מתוכנית הלימודים במתמטיקה של משרד החינוך לכיתה ד' שאינם בחוברת המבדק.
// מקור: תוכנית הלימודים במתמטיקה לכיתות א–ו (משרד החינוך), פרק כיתה ד': ישר המספרים, שיטת האלף-בית, סדר פעולות, 0 ו-1, חזקות,
// ראשוניים ופריקים, סימני התחלקות ב-3, 6, 9, פעולות בשברים (היכרות ראשונה), שטח, היקף ונפח, זמן ולוח שנה, חקר נתונים וסיכויים,
// משולשים, תיבות וסימטרייה. כל נושא בחמש רמות, כמו בשאר האפליקציה.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Grade4 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TOPICS = [
    { id: 'numline', name: 'ישר המספרים ומספרים מכוונים', short: 'ישר המספרים', icon: '📏', area: 'מספרים ופעולות' },
    { id: 'gematria', name: 'שיטת האלף-בית (מספרים באותיות)', short: 'אלף-בית ומספרים', icon: 'א', area: 'מספרים ופעולות' },
    { id: 'order', name: 'סדר פעולות, סוגריים, 0 ו-1 וחזקות', short: 'סדר פעולות וחזקות', icon: '🧮', area: 'מספרים ופעולות' },
    { id: 'divis', name: 'מספרים ראשוניים ופריקים, סימני התחלקות', short: 'התחלקות וראשוניים', icon: '🔍', area: 'מספרים ופעולות' },
    { id: 'fracops', name: 'פעולות בשברים (היכרות ראשונה)', short: 'חיבור וחיסור שברים', icon: '🥧', area: 'שברים' },
    { id: 'measure', name: 'שטח, היקף, נפח, זמן ולוח שנה', short: 'מדידות', icon: '📐', area: 'מדידות' },
    { id: 'data', name: 'חקר נתונים וניתוח סיכויים', short: 'נתונים וסיכויים', icon: '📊', area: 'חקר נתונים' },
    { id: 'shapes', name: 'משולשים, תיבות וסימטרייה', short: 'משולשים, תיבות וסימטרייה', icon: '🔺', area: 'גאומטריה' },
  ];
  const IDS = TOPICS.map(t => t.id);
  const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  function shuffle(r, a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const neg = n => (n < 0 ? `−${Math.abs(n)}` : String(n));
  const frac = (n, d) => `⟦${n}|${d}⟧`;
  function mixed(n, d) { const w = Math.floor(n / d), k = n % d; return w && k ? `${w}${frac(k, d)}` : w ? String(w) : frac(k, d); }
  function mk(topic, level, gen, o) { return Object.assign({ topic, level, gen, kind: 'num', meta: {} }, o); }
  function choices(r, ans, ds, n) { const out = [ans]; ds.forEach(d => { if (out.length < (n || 4) && !out.includes(d)) out.push(d); }); return shuffle(r, out); }

  // ---------- ציורים ----------
  function lineSvg(start, step, count, labels, mark) {
    const W = 320, x0 = 18, dx = (W - 2 * x0) / (count - 1);
    let s = `<svg viewBox="0 0 ${W} 74" direction="ltr" role="img" aria-label="ישר מספרים"><line x1="6" y1="40" x2="${W - 6}" y2="40" class="nl"/>`;
    s += `<path d="M${W - 6} 40 l-8 -5 v10 z" class="nla"/><path d="M6 40 l8 -5 v10 z" class="nla"/>`;
    for (let i = 0; i < count; i++) {
      const x = x0 + i * dx, v = start + i * step;
      s += `<line x1="${x.toFixed(1)}" y1="33" x2="${x.toFixed(1)}" y2="47" class="nl"/>`;
      if (labels.includes(i)) s += `<text x="${x.toFixed(1)}" y="66" text-anchor="middle" class="nlt">${neg(v)}</text>`;
      if (i === mark) s += `<path d="M${x.toFixed(1)} 30 l-6 -14 h12 z" class="nlm"/>`;
    }
    return s + '</svg>';
  }
  function barsSvg(cats, vals, step) {
    const W = 320, H = 170, left = 30, bottom = 140, top = 12, max = Math.ceil(Math.max(...vals) / step) * step, bw = (W - left - 10) / cats.length;
    const y = v => bottom - (bottom - top) * v / max;
    let s = `<svg viewBox="0 0 ${W} ${H}" direction="ltr" role="img" aria-label="דיאגרמת עמודות">`;
    for (let v = 0; v <= max; v += step) s += `<line x1="${left}" y1="${y(v).toFixed(1)}" x2="${W - 6}" y2="${y(v).toFixed(1)}" class="gl"/><text x="${left - 4}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" class="gt">${v}</text>`;
    cats.forEach((c, i) => {
      const x = left + i * bw + bw * 0.18, w = bw * 0.64;
      s += `<rect x="${x.toFixed(1)}" y="${y(vals[i]).toFixed(1)}" width="${w.toFixed(1)}" height="${(bottom - y(vals[i])).toFixed(1)}" class="bar b${i % 5}"/><text x="${(x + w / 2).toFixed(1)}" y="${bottom + 18}" text-anchor="middle" class="gt c">${c}</text>`;
    });
    return s + `<line x1="${left}" y1="${bottom}" x2="${W - 6}" y2="${bottom}" class="ax"/></svg>`;
  }
  function polySvg(pts, extra) {
    return `<svg viewBox="0 0 200 150" role="img" aria-label="צורה"><polygon points="${pts.map(p => p.join(',')).join(' ')}" class="shp"/>${extra || ''}</svg>`;
  }
  const regular = (n, cx, cy, R, rot) => Array.from({ length: n }, (_, i) => { const a = rot + (i / n) * 2 * Math.PI; return [+(cx + R * Math.cos(a)).toFixed(1), +(cy + R * Math.sin(a)).toFixed(1)]; });
  const SYM = {
    'ריבוע': { pts: [[55, 25], [145, 25], [145, 115], [55, 115]], n: 4 },
    'מלבן': { pts: [[30, 40], [170, 40], [170, 110], [30, 110]], n: 2 },
    'משולש שווה צלעות': { pts: regular(3, 100, 82, 62, -Math.PI / 2), n: 3 },
    'משולש שווה שוקיים': { pts: [[100, 18], [150, 130], [50, 130]], n: 1 },
    'משולש שונה צלעות': { pts: [[40, 125], [170, 125], [70, 25]], n: 0 },
    'מחומש משוכלל': { pts: regular(5, 100, 80, 62, -Math.PI / 2), n: 5 },
    'משושה משוכלל': { pts: regular(6, 100, 75, 62, 0), n: 6 },
    'מקבילית': { pts: [[45, 110], [140, 110], [165, 40], [70, 40]], n: 0 },
  };
  function rectSvg(a, b, unit) {
    const s = Math.min(150 / Math.max(a, b), 18), w = a * s, h = b * s, x = (200 - w) / 2, y = (150 - h) / 2;
    return `<svg viewBox="0 0 200 150" role="img" aria-label="מלבן ${a} על ${b}"><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" class="shp"/><text x="100" y="${(y - 6).toFixed(1)}" text-anchor="middle" class="gt">${a} ${unit}</text><text x="${(x + w + 6).toFixed(1)}" y="${(y + h / 2 + 4).toFixed(1)}" class="gt">${b} ${unit}</text></svg>`;
  }

  // ---------- 1. ישר המספרים ----------
  function qLineRead(r, level) {
    const step = level === 1 ? pick(r, [1, 2, 5]) : pick(r, [10, 25, 50, 100]), start = level === 1 ? ri(r, 0, 10) * step : ri(r, 0, 20) * step;
    const count = 9, mark = ri(r, 1, count - 2), labels = [0, count - 1];
    const ans = start + mark * step;
    return mk('numline', level, 'lineRead', { text: 'איזה מספר מסומן בחץ?', svg: lineSvg(start, step, count, labels, mark), answer: ans,
      explain: `המרחק בין שני קווים שכנים הוא ${step} (מ-${fmt(start)} עד ${fmt(start + (count - 1) * step)} יש ${count - 1} קפיצות). החץ נמצא ${mark} קפיצות אחרי ${fmt(start)}: ${fmt(start)} + ${mark} × ${step} = ${fmt(ans)}.`, meta: { step } });
  }
  function qTemp(r, level) {
    const a = ri(r, -6, 4), up = r() < 0.5, d = ri(r, 2, 8), b = up ? a + d : a - d;
    const ds = [b + 2, b - 2, -b, up ? a - d : a + d].filter(x => x !== b).map(neg);
    return mk('numline', level, 'temp', { kind: 'choice', text: `בבוקר הטמפרטורה הייתה ${neg(a)} מעלות. היא ${up ? 'עלתה' : 'ירדה'} ב-${d} מעלות. מה הטמפרטורה עכשיו?`, choices: choices(r, neg(b), ds), answer: neg(b),
      explain: `על ישר המספרים זזים ${d} צעדים ${up ? 'ימינה (למעלה)' : 'שמאלה (למטה)'} מ-${neg(a)}, ומגיעים ל-${neg(b)}. מתחת לאפס המספרים שליליים.`, meta: { op: up ? 'up' : 'down' } });
  }
  function qNegCompare(r, level) {
    let a = ri(r, -12, 6), b = ri(r, -12, 6); while (b === a) b = ri(r, -12, 6);
    const big = Math.max(a, b);
    return mk('numline', level, 'negCmp', { kind: 'choice', text: 'איזה מספר גדול יותר?', choices: shuffle(r, [neg(a), neg(b)]), answer: neg(big),
      explain: `על ישר המספרים, מספר שנמצא יותר ימינה הוא הגדול. ${neg(big)} נמצא ימינה מ-${neg(Math.min(a, b))}${a < 0 && b < 0 ? ' (במספרים שליליים: ככל שהמספר אחרי המינוס גדול יותר, המספר קטן יותר)' : ''}.`, meta: {} });
  }
  function qDistance(r, level) {
    const a = ri(r, -9, -1), b = ri(r, 1, 12);
    return mk('numline', level, 'dist', { text: `כמה צעדים יש על ישר המספרים מ-${neg(a)} עד ${b}?`, answer: b - a,
      explain: `מ-${neg(a)} עד 0 יש ${-a} צעדים, ומ-0 עד ${b} יש עוד ${b}. ביחד ${-a} + ${b} = ${b - a}.`, meta: {} });
  }

  // ---------- 2. שיטת האלף-בית ----------
  const UNITS = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], HUND = ['', 'ק', 'ר', 'ש', 'ת'];
  const VAL = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400 };
  function hebRaw(n) {
    let s = '', h = Math.floor(n / 100), rest = n % 100;
    while (h >= 4) { s += 'ת'; h -= 4; }
    s += HUND[h];
    if (rest === 15) s += 'טו'; else if (rest === 16) s += 'טז'; else s += TENS[Math.floor(rest / 10)] + UNITS[rest % 10];
    return s;
  }
  function heb(n) { const s = hebRaw(n); return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1); }
  const hebVal = s => [...s].reduce((a, c) => a + (VAL[c] || 0), 0);
  const WORDS = ['אב', 'יד', 'לב', 'דג', 'גן', 'ים', 'בית', 'אור', 'ספר', 'שמש', 'חלון', 'מים'];
  function qHebLetter(r, level) {
    const n = level === 1 ? pick(r, [ri(r, 1, 9), ri(r, 1, 9) * 10]) : ri(r, 11, 99);
    return mk('gematria', level, 'hebVal', { text: `מה הערך של ${heb(n)}?`, answer: n,
      explain: `${[...hebRaw(n)].map(c => `${c} = ${VAL[c]}`).join(', ')}${hebRaw(n).length > 1 ? `. ביחד: ${n}` : ''}.${n % 100 === 15 || n % 100 === 16 ? ' 15 ו-16 נכתבים ט״ו וט״ז ולא י״ה וי״ו.' : ''}`, meta: { range: level } });
  }
  function qHebWrite(r, level) {
    const n = level <= 3 ? ri(r, 11, 99) : ri(r, 101, 799);
    const ds = [heb(n + 1), heb(n + 10 <= 999 ? n + 10 : n - 10), heb(Math.max(1, n - 1))];
    if (n % 100 === 15) ds.unshift(hebRaw(n).slice(0, -2) + 'י״ה');
    if (n % 100 === 16) ds.unshift(hebRaw(n).slice(0, -2) + 'י״ו');
    return mk('gematria', level, 'hebWrite', { kind: 'choice', text: `איך כותבים ${n} באותיות?`, choices: choices(r, heb(n), ds), answer: heb(n),
      explain: `מפרקים: ${n >= 100 ? `${Math.floor(n / 100) * 100} + ` : ''}${n % 100}. ${[...hebRaw(n)].map(c => `${c} = ${VAL[c]}`).join(', ')}. לפני האות האחרונה מוסיפים גרשיים (״).`, meta: {} });
  }
  function qHebHundreds(r, level) {
    const n = ri(r, 101, 899);
    return mk('gematria', level, 'hebHund', { text: `מה הערך של ${heb(n)}?`, answer: n,
      explain: `${[...hebRaw(n)].map(c => `${c} = ${VAL[c]}`).join(', ')}. ביחד: ${n}. (ת = 400, ולכן 500 = ת״ק, 600 = ת״ר.)`, meta: {} });
  }
  function qHebWord(r, level) {
    if (r() < 0.5) {
      const w = pick(r, WORDS), v = hebVal(w);
      return mk('gematria', level, 'hebWord', { text: `מה הערך המספרי של המילה "${w}"?`, answer: v, explain: `${[...w].map(c => `${c} = ${VAL[c]}`).join(', ')}. ביחד: ${v}.${/[ךםןףץ]/.test(w) ? ' אות סופית שווה כמו האות הרגילה.' : ''}`, meta: {} });
    }
    const y = ri(r, 770, 799);
    return mk('gematria', level, 'hebYear', { text: `השנה העברית ה׳${heb(y)}. מה ערך האותיות ${heb(y)} (בלי ה׳ של האלפים)?`, answer: y,
      explain: `${[...hebRaw(y)].map(c => `${c} = ${VAL[c]}`).join(', ')}. ביחד ${y}. ה׳ בהתחלה מסמנת 5,000, ולכן השנה היא ${5000 + y}.`, meta: {} });
  }

  // ---------- 3. סדר פעולות, 0 ו-1, חזקות ----------
  function qOrder(r, level) {
    let eq, ans, ex;
    if (level <= 1) { const a = ri(r, 2, 20), b = ri(r, 2, 9), c = ri(r, 2, 9); eq = `${a} + ${b} × ${c} =`; ans = a + b * c; ex = `קודם כפל: ${b} × ${c} = ${b * c}, ואז חיבור: ${a} + ${b * c} = ${ans}.`; }
    else if (level === 2) {
      if (r() < 0.5) { const a = ri(r, 2, 9), b = ri(r, 2, 9), c = ri(r, 2, 6); eq = `(${a} + ${b}) × ${c} =`; ans = (a + b) * c; ex = `קודם מה שבסוגריים: ${a} + ${b} = ${a + b}, ואז ${a + b} × ${c} = ${ans}.`; }
      else { const c = ri(r, 2, 9), q = ri(r, 2, 9), a = ri(r, q * 0 + 20, 60); eq = `${a} − ${c * q} ÷ ${c} =`; ans = a - q; ex = `קודם חילוק: ${c * q} ÷ ${c} = ${q}, ואז חיסור: ${a} − ${q} = ${ans}.`; }
    } else {
      const a = ri(r, 2, 9), b = ri(r, 2, 9), c = ri(r, 2, 9), d = ri(r, 1, 9);
      eq = `${a} × ${b} − ${c} × ${d} + 10 =`; ans = a * b - c * d + 10;
      if (ans < 0) { eq = `${a} × ${b} + ${c} × ${d} − 1 =`; ans = a * b + c * d - 1; ex = `קודם הכפל: ${a * b} ו-${c * d}. אחר כך משמאל לימין: ${a * b} + ${c * d} − 1 = ${ans}.`; }
      else ex = `קודם הכפל: ${a} × ${b} = ${a * b}, ${c} × ${d} = ${c * d}. אחר כך חיבור וחיסור לפי הסדר: ${a * b} − ${c * d} + 10 = ${ans}.`;
    }
    return mk('order', level, 'order', { text: 'חשבו (שימו לב לסדר הפעולות):', eq, answer: ans, explain: ex, meta: {} });
  }
  function qZeroOne(r, level) {
    const n = ri(r, 12, 999), t = pick(r, ['x0', '0div', 'x1', 'div1', 'plus0', 'divself']);
    const M = { x0: [`${n} × 0 =`, 0, 'כל מספר כפול 0 שווה 0.'], '0div': [`0 ÷ ${n} =`, 0, '0 מחולק בכל מספר (שאינו 0) שווה 0.'], x1: [`${n} × 1 =`, n, 'כל מספר כפול 1 שווה לעצמו.'],
      div1: [`${n} ÷ 1 =`, n, 'כל מספר מחולק ב-1 שווה לעצמו.'], plus0: [`${n} + 0 =`, n, 'הוספת 0 לא משנה את המספר.'], divself: [`${n} ÷ ${n} =`, 1, 'מספר (שאינו 0) מחולק בעצמו שווה 1.'] };
    const [eq, ans, ex] = M[t];
    return mk('order', level, 'zeroOne', { text: 'חשבו:', eq, answer: ans, explain: ex + ' ואסור לחלק ב-0.', meta: { op: t } });
  }
  function qPower(r, level) {
    let b, e;
    if (level <= 4) { b = ri(r, 2, 10); e = b === 10 ? pick(r, [2, 3]) : b <= 5 ? pick(r, [2, 3]) : 2; }
    else { b = pick(r, [2, 3, 10]); e = b === 2 ? ri(r, 3, 5) : b === 3 ? 3 : ri(r, 3, 4); }
    const ans = Math.pow(b, e), sup = e === 2 ? '²' : e === 3 ? '³' : e === 4 ? '⁴' : '⁵';
    const plus = level === 5 && r() < 0.5 ? ri(r, 2, 9) : 0;
    return mk('order', level, 'power', { text: 'חשבו:', eq: plus ? `${b}${sup} + ${plus} × 2 =` : `${b}${sup} =`, answer: ans + plus * 2,
      explain: `${b}${sup} פירושו ${Array(e).fill(b).join(' × ')} = ${fmt(ans)}${plus ? `. קודם החזקה, אחר כך הכפל ${plus} × 2 = ${plus * 2}, ואז החיבור: ${ans + plus * 2}` : ''}. זה לא ${b} × ${e}!`, meta: { e } });
  }

  // ---------- 4. התחלקות וראשוניים ----------
  const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
  const isPrime = n => PRIMES.includes(n);
  const dsum = n => String(n).split('').reduce((a, c) => a + Number(c), 0);
  function qDivBy(r, level) {
    const d = level <= 1 ? pick(r, [2, 5, 10]) : level === 2 ? 3 : pick(r, [9, 6, 3]);
    const k = ri(r, 12, 400), ans = d * k;
    const bad = []; let t = 0;
    while (bad.length < 3 && t++ < 200) { const x = ri(r, 100, 3000); if (x % d && !bad.includes(x)) bad.push(x); }
    const rule = { 2: 'מספר זוגי (ספרת האחדות 0, 2, 4, 6 או 8)', 5: 'ספרת האחדות 0 או 5', 10: 'ספרת האחדות 0', 3: 'סכום הספרות מתחלק ב-3', 9: 'סכום הספרות מתחלק ב-9', 6: 'מתחלק גם ב-2 (זוגי) וגם ב-3 (סכום הספרות מתחלק ב-3)' };
    return mk('divis', level, 'divBy', { kind: 'choice', text: `איזה מספר מתחלק ב-${d} בלי שארית?`, choices: shuffle(r, [ans, ...bad].map(String)), answer: String(ans),
      explain: `סימן ההתחלקות ב-${d}: ${rule[d]}. ב-${fmt(ans)}${d === 3 || d === 9 || d === 6 ? ` סכום הספרות הוא ${dsum(ans)}` : ''}. ${fmt(ans)} ÷ ${d} = ${fmt(k)}.`, meta: { op: String(d) } });
  }
  function qPrime(r, level) {
    const p = pick(r, PRIMES.filter(x => x > 3 && x < (level >= 5 ? 98 : 50)));
    const comp = []; let t = 0;
    while (comp.length < 3 && t++ < 200) { const x = ri(r, 4, level >= 5 ? 98 : 50); if (!isPrime(x) && !comp.includes(x) && x % 2) comp.push(x); if (comp.length < 3 && r() < 0.2 && !isPrime(x) && !comp.includes(x)) comp.push(x); }
    const cdiv = comp.map(c => { for (let i = 2; i < c; i++) if (c % i === 0) return `${c} = ${i} × ${c / i}`; return ''; });
    return mk('divis', level, 'prime', { kind: 'choice', text: 'איזה מספר ראשוני?', choices: shuffle(r, [p, ...comp].map(String)), answer: String(p),
      explain: `מספר ראשוני מתחלק רק ב-1 ובעצמו. ${p} ראשוני. האחרים פריקים: ${cdiv.join('; ')}.`, meta: {} });
  }
  function qDivisors(r, level) {
    const n = pick(r, [6, 8, 10, 12, 15, 16, 18, 20, 24, 30, 36]);
    const ds = []; for (let i = 1; i <= n; i++) if (n % i === 0) ds.push(i);
    return mk('divis', level, 'divisors', { text: `כמה מחלקים יש למספר ${n}? (כולל 1 ו-${n})`, answer: ds.length, explain: `המחלקים של ${n}: ${ds.join(', ')}. סך הכול ${ds.length}.`, meta: {} });
  }

  // ---------- 5. פעולות בשברים ----------
  function qFracAdd(r, level) {
    const d = ri(r, 4, 12), sub = level === 2 || (level >= 4 && r() < 0.4);
    let a = ri(r, 1, d - 1), b = ri(r, 1, d - 1);
    if (sub && a < b) [a, b] = [b, a];
    if (sub && a === b) a = Math.min(d - 1, a + 1);
    if (!sub && a + b > d && level < 3) b = d - a > 1 ? ri(r, 1, d - a - 1) : 1;
    const res = sub ? a - b : a + b, ans = res >= d ? mixed(res, d) : frac(res, d);
    const ds = [frac(sub ? a + b : Math.abs(a - b) || 1, d), frac(res, d + d), frac(res + 1, d), res >= d ? frac(res, d) : frac(res, d * 2)].filter(x => x !== ans);
    return mk('fracops', level, 'fracAdd', { kind: 'choice', text: sub ? 'חשבו:' : 'חשבו:', eq: `${frac(a, d)} ${sub ? '−' : '+'} ${frac(b, d)} =`, choices: choices(r, ans, ds), answer: ans,
      explain: `כשהמכנים שווים, ${sub ? 'מחסרים' : 'מחברים'} רק את המונים: ${a} ${sub ? '−' : '+'} ${b} = ${res}, והמכנה נשאר ${d}: ${frac(res, d)}${res >= d ? ` = ${mixed(res, d)}` : ''}.`, meta: { op: sub ? 'sub' : 'add' } });
  }
  function qMixedAdd(r, level) {
    const d = ri(r, 3, 9), w1 = ri(r, 1, 4), w2 = ri(r, 1, 3), a = ri(r, 1, d - 1), b = ri(r, 1, d - 1 - (a >= d - 1 ? 0 : 0));
    const tot = (w1 + w2) * d + a + b, ans = mixed(tot, d);
    const ds = [mixed(tot + d, d), mixed(tot - 1, d), `${w1 + w2}${frac(a + b, d)}`, mixed(tot + 1, d)].filter(x => x !== ans);
    return mk('fracops', level, 'mixedAdd', { kind: 'choice', text: 'חשבו:', eq: `${w1}${frac(a, d)} + ${w2}${frac(b, d)} =`, choices: choices(r, ans, ds), answer: ans,
      explain: `מחברים שלמים: ${w1} + ${w2} = ${w1 + w2}. מחברים שברים: ${frac(a, d)} + ${frac(b, d)} = ${frac(a + b, d)}${a + b >= d ? ` = ${mixed(a + b, d)}` : ''}. ביחד: ${ans}.`, meta: {} });
  }
  function qWholeTimesFrac(r, level) {
    const d = ri(r, 3, 8), a = ri(r, 1, d - 1), k = ri(r, 2, 5), tot = a * k, ans = tot >= d ? mixed(tot, d) : frac(tot, d);
    const ds = [frac(a * k, d * k), frac(a + k, d), mixed(tot + 1, d), frac(a, d * k)].filter(x => x !== ans);
    return mk('fracops', level, 'wholeTimes', { kind: 'choice', text: 'חשבו (כפל כחיבור חוזר):', eq: `${k} × ${frac(a, d)} =`, choices: choices(r, ans, ds), answer: ans,
      explain: `${k} × ${frac(a, d)} זה ${Array(k).fill(frac(a, d)).join(' + ')} = ${frac(tot, d)}${tot >= d ? ` = ${mixed(tot, d)}` : ''}. כופלים רק את המונה.`, meta: {} });
  }
  function qFracWord(r, level) {
    const d = pick(r, [6, 8, 10, 12]), a = ri(r, 1, d / 2 - 1), b = ri(r, 1, d / 2 - 1), left = d - a - b, ans = frac(left, d);
    const ds = [frac(a + b, d), frac(left, d * 2), frac(left + 1, d), frac(d - a, d)].filter(x => x !== ans);
    return mk('fracops', level, 'fracWord', { kind: 'choice', text: `פיצה חולקה ל-${d} משולשים שווים. דנה אכלה ${frac(a, d)} מהפיצה, ויואב אכל ${frac(b, d)}. איזה חלק מהפיצה נשאר?`, choices: choices(r, ans, ds), answer: ans,
      explain: `נאכלו ${frac(a, d)} + ${frac(b, d)} = ${frac(a + b, d)}. השלם הוא ${frac(d, d)}, ולכן נשאר ${frac(d, d)} − ${frac(a + b, d)} = ${ans}.`, meta: {} });
  }

  // ---------- 6. מדידות ----------
  function qPerimeter(r, level) {
    const a = ri(r, 3, 15), b = ri(r, 2, 12), area = r() < 0.5 && level >= 2;
    return mk('measure', level, area ? 'area' : 'perim', { text: area ? `מה השטח של המלבן? (בסמ״ר)` : `מה ההיקף של המלבן? (בס״מ)`, svg: rectSvg(a, b, 'ס״מ'), answer: area ? a * b : 2 * (a + b),
      explain: area ? `שטח מלבן = אורך × רוחב = ${a} × ${b} = ${a * b} סמ״ר (ריבועים של סנטימטר על סנטימטר).` : `היקף = סכום כל הצלעות = ${a} + ${b} + ${a} + ${b} = ${2 * (a + b)} ס״מ.`, meta: { op: area ? 'area' : 'perim' } });
  }
  function qMissingSide(r, level) {
    const a = ri(r, 3, 12), b = ri(r, 2, 10), byArea = r() < 0.5;
    return mk('measure', level, 'missingSide', { text: byArea ? `שטח מלבן הוא ${a * b} סמ״ר ואורכו ${a} ס״מ. מה רוחבו? (בס״מ)` : `היקף מלבן הוא ${2 * (a + b)} ס״מ ואורכו ${a} ס״מ. מה רוחבו? (בס״מ)`, answer: b,
      explain: byArea ? `שטח = אורך × רוחב, ולכן רוחב = ${a * b} ÷ ${a} = ${b}.` : `חצי מההיקף הוא אורך + רוחב: ${2 * (a + b)} ÷ 2 = ${a + b}. רוחב = ${a + b} − ${a} = ${b}.`, meta: { op: byArea ? 'area' : 'perim' } });
  }
  function qVolume(r, level) {
    const a = ri(r, 2, 6), b = ri(r, 2, 5), c = ri(r, 2, 5);
    return mk('measure', level, 'volume', { text: `לתיבה אורך ${a} ס״מ, רוחב ${b} ס״מ וגובה ${c} ס״מ. מה הנפח שלה? (בסמ״ק)`, answer: a * b * c,
      explain: `נפח תיבה = אורך × רוחב × גובה = ${a} × ${b} × ${c} = ${a * b * c} סמ״ק (קוביות של סנטימטר).`, meta: {} });
  }
  function qTime(r, level) {
    const t = pick(r, ['minutes', 'days', 'units']);
    if (t === 'minutes') { const h = ri(r, 1, 4), m = ri(r, 5, 55); return mk('measure', level, 'time', { text: `כמה דקות יש ב-${h} שעות ו-${m} דקות?`, answer: h * 60 + m, explain: `בשעה 60 דקות: ${h} × 60 = ${h * 60}, ועוד ${m} = ${h * 60 + m} דקות.`, meta: { op: 'min' } }); }
    if (t === 'days') { const w = ri(r, 2, 9), d = ri(r, 1, 6); return mk('measure', level, 'time', { text: `כמה ימים יש ב-${w} שבועות ו-${d} ימים?`, answer: w * 7 + d, explain: `בשבוע 7 ימים: ${w} × 7 = ${w * 7}, ועוד ${d} = ${w * 7 + d} ימים.`, meta: { op: 'days' } }); }
    const m = ri(r, 2, 9);
    return mk('measure', level, 'units', { text: `כמה סמ״ר יש ב-${m} מ״ר?`, answer: m * 10000, explain: `מטר מרובע הוא ריבוע של 100 ס״מ על 100 ס״מ, כלומר 100 × 100 = 10,000 סמ״ר. ${m} × 10,000 = ${fmt(m * 10000)}.`, meta: { op: 'units' } });
  }

  // ---------- 7. חקר נתונים וסיכויים ----------
  const CATS = [['🍎', '🍌', '🍇', '🍊'], ['⚽', '🏀', '🎾', '🏐'], ['🐶', '🐱', '🐟', '🐰']];
  function graph(r) {
    const cats = pick(r, CATS), step = pick(r, [1, 2, 5]), vals = cats.map(() => ri(r, 1, 8) * step);
    return { cats, vals, svg: barsSvg(cats, vals, step) };
  }
  function qGraphRead(r, level) {
    const g = graph(r), i = ri(r, 0, g.cats.length - 1);
    return mk('data', level, 'graphRead', { text: `בכיתה שאלו מה אוהבים. כמה ילדים בחרו ב-${g.cats[i]}?`, svg: g.svg, answer: g.vals[i],
      explain: `מסתכלים על ראש העמודה של ${g.cats[i]} וממשיכים בקו ישר אל הציר: ${g.vals[i]}. שימו לב בכמה עולה כל קו בציר.`, meta: {} });
  }
  function qGraphCompare(r, level) {
    const g = graph(r); let i = 0, j = 1;
    for (let t = 0; t < 20 && g.vals[i] === g.vals[j]; t++) { i = ri(r, 0, 3); j = ri(r, 0, 3); if (i === j) j = (i + 1) % 4; }
    if (level >= 3 && r() < 0.5) return mk('data', level, 'graphTotal', { text: 'כמה ילדים ענו בסך הכול?', svg: g.svg, answer: g.vals.reduce((a, b) => a + b, 0),
      explain: `מחברים את כל העמודות: ${g.vals.join(' + ')} = ${g.vals.reduce((a, b) => a + b, 0)}.`, meta: {} });
    return mk('data', level, 'graphDiff', { text: `בכמה ילדים יותר בחרו ב-${g.vals[i] > g.vals[j] ? g.cats[i] : g.cats[j]} מאשר ב-${g.vals[i] > g.vals[j] ? g.cats[j] : g.cats[i]}?`, svg: g.svg, answer: Math.abs(g.vals[i] - g.vals[j]),
      explain: `${Math.max(g.vals[i], g.vals[j])} − ${Math.min(g.vals[i], g.vals[j])} = ${Math.abs(g.vals[i] - g.vals[j])}.`, meta: {} });
  }
  function qChance(r, level) {
    const red = ri(r, 0, 6), blue = ri(r, 0, 6) || 1, kind = pick(r, ['red', 'blue', 'green']);
    const n = { red, blue, green: 0 }[kind];
    const ans = n === 0 ? 'בלתי אפשרי' : n === red + blue ? 'ודאי' : 'אפשרי';
    const name = { red: 'אדום', blue: 'כחול', green: 'ירוק' }[kind];
    return mk('data', level, 'chance', { kind: 'choice', text: `בקופסה ${red} כדורים אדומים ו-${blue} כדורים כחולים. מוציאים כדור אחד בלי להסתכל. שהכדור יהיה ${name} זה מאורע...`, choices: ['ודאי', 'אפשרי', 'בלתי אפשרי'], answer: ans,
      explain: ans === 'ודאי' ? `כל הכדורים ${name === 'אדום' ? 'אדומים' : 'כחולים'}, ולכן זה בטוח יקרה.` : ans === 'בלתי אפשרי' ? `אין בקופסה כדורים ${name === 'ירוק' ? 'ירוקים' : name === 'אדום' ? 'אדומים' : 'כחולים'}, ולכן זה לא יכול לקרות.` : `יש בקופסה ${n} כדורים כאלה וגם כדורים אחרים, ולכן זה יכול לקרות, אבל לא בטוח.`, meta: { op: ans } });
  }
  function qChanceCompare(r, level) {
    let a = ri(r, 1, 9), b = ri(r, 1, 9); while (a === b) b = ri(r, 1, 9);
    const ans = a > b ? 'כדור צהוב' : 'כדור ירוק';
    return mk('data', level, 'chanceCmp', { kind: 'choice', text: `בשקית ${a} כדורים צהובים ו-${b} כדורים ירוקים. מוציאים כדור אחד בלי להסתכל. מה סביר יותר?`, choices: ['כדור צהוב', 'כדור ירוק', 'הסיכוי שווה'], answer: ans,
      explain: `יש יותר כדורים ${a > b ? 'צהובים' : 'ירוקים'} (${Math.max(a, b)} לעומת ${Math.min(a, b)}), ולכן הסיכוי להוציא כזה גדול יותר.`, meta: {} });
  }

  // ---------- 8. משולשים, תיבות וסימטרייה ----------
  function qBox(r, level) {
    const t = pick(r, [['פאות', 6], ['מקצועות', 12], ['קודקודים', 8]]);
    if (level >= 5 && r() < 0.5) { const a = ri(r, 2, 9), b = ri(r, 2, 9), c = ri(r, 2, 9); return mk('shapes', level, 'boxEdges', { text: `לתיבה מקצועות באורך ${a}, ${b} ו-${c} ס״מ. מה סכום האורכים של כל 12 המקצועות?`, answer: 4 * (a + b + c), explain: `בתיבה יש 4 מקצועות מכל אורך: 4 × (${a} + ${b} + ${c}) = ${4 * (a + b + c)} ס״מ.`, meta: {} }); }
    return mk('shapes', level, 'box', { text: `כמה ${t[0]} יש לתיבה?`, svg: boxSvg(), answer: t[1], explain: 'לתיבה 6 פאות (מלבנים), 12 מקצועות (הקווים) ו-8 קודקודים (הפינות).', meta: { op: t[0] } });
  }
  function boxSvg() { return '<svg viewBox="0 0 200 150" role="img" aria-label="תיבה"><path d="M40 55 h90 v70 h-90 z M40 55 l35 -30 h90 l-35 30 M165 25 v70 l-35 30" class="shp"/><path d="M40 125 l35 -30 h90 M75 95 v-70" class="shp dash"/></svg>'; }
  function qSymmetry(r, level) {
    const names = level <= 2 ? ['ריבוע', 'מלבן', 'משולש שווה צלעות', 'משולש שווה שוקיים'] : Object.keys(SYM);
    const nm = pick(r, names), s = SYM[nm];
    return mk('shapes', level, 'symmetry', { text: `כמה צירי סימטרייה יש ל${nm}?`, svg: polySvg(s.pts), answer: s.n,
      explain: `ציר סימטרייה מחלק את הצורה לשני חלקים שמתאימים זה לזה כמו בתמונת ראי. ל${nm} יש ${s.n === 0 ? 'אפס צירים: אין קו שמחלק אותו כך' : s.n}.${nm === 'מלבן' ? ' האלכסונים של מלבן אינם צירי סימטרייה.' : ''}`, meta: { op: nm } });
  }
  function qTriSides(r, level) {
    const t = pick(r, ['eq', 'iso', 'sc']), a = ri(r, 3, 9);
    const sides = t === 'eq' ? [a, a, a] : t === 'iso' ? shuffle(r, [a, a, a + ri(r, 1, 3)]) : [a, a + 1, a + 3];
    const ans = { eq: 'שווה צלעות', iso: 'שווה שוקיים', sc: 'שונה צלעות' }[t];
    return mk('shapes', level, 'triSides', { kind: 'choice', text: `למשולש צלעות באורך ${sides.join(', ')} ס״מ. איזה משולש זה?`, choices: ['שווה צלעות', 'שווה שוקיים', 'שונה צלעות'], answer: ans,
      explain: 'שווה צלעות: שלוש צלעות שוות. שווה שוקיים: שתי צלעות שוות. שונה צלעות: כל הצלעות שונות.', meta: { op: t } });
  }
  function qTriAngles(r, level) {
    if (level >= 5 || r() < 0.5) {
      const a = ri(r, 30, 90), b = ri(r, 20, 150 - a);
      return mk('shapes', level, 'triMissing', { text: `במשולש יש זווית של ${a}° וזווית של ${b}°. מה גודל הזווית השלישית? (במעלות)`, answer: 180 - a - b, explain: `סכום הזוויות במשולש הוא 180°. 180 − ${a} − ${b} = ${180 - a - b}.`, meta: {} });
    }
    const big = pick(r, [90, ri(r, 95, 140), ri(r, 60, 85)]), other = ri(r, 20, Math.min(80, 170 - big)), third = 180 - big - other;
    const mx = Math.max(big, other, third), ans = mx === 90 ? 'ישר זווית' : mx > 90 ? 'קהה זווית' : 'חד זווית';
    return mk('shapes', level, 'triAngles', { kind: 'choice', text: `לזוויות של משולש: ${big}°, ${other}°, ${third}°. איזה משולש זה?`, choices: ['חד זווית', 'ישר זווית', 'קהה זווית'], answer: ans,
      explain: `הזווית הגדולה היא ${mx}°. ${ans === 'ישר זווית' ? 'יש זווית ישרה (90°)' : ans === 'קהה זווית' ? 'יש זווית גדולה מ-90° (קהה)' : 'כל הזוויות קטנות מ-90° (חדות)'}.`, meta: {} });
  }

  // ---------- הרכבה לפי נושא ורמה ----------
  const GEN = {
    numline: { 1: [r => qLineRead(r, 1)], 2: [r => qLineRead(r, 2)], 3: [r => qTemp(r, 3), r => qNegCompare(r, 3)], 4: [r => qNegCompare(r, 4), r => qTemp(r, 4), r => qLineRead(r, 4)], 5: [r => qDistance(r, 5), r => qTemp(r, 5), r => qNegCompare(r, 5)] },
    gematria: { 1: [r => qHebLetter(r, 1)], 2: [r => qHebLetter(r, 2)], 3: [r => qHebWrite(r, 3), r => qHebLetter(r, 3)], 4: [r => qHebHundreds(r, 4), r => qHebWrite(r, 4)], 5: [r => qHebWord(r, 5), r => qHebHundreds(r, 5), r => qHebWrite(r, 5)] },
    order: { 1: [r => qOrder(r, 1), r => qZeroOne(r, 1)], 2: [r => qOrder(r, 2), r => qZeroOne(r, 2)], 3: [r => qOrder(r, 3), r => qPower(r, 3)], 4: [r => qPower(r, 4), r => qOrder(r, 4)], 5: [r => qPower(r, 5), r => qOrder(r, 5)] },
    divis: { 1: [r => qDivBy(r, 1)], 2: [r => qDivBy(r, 2)], 3: [r => qDivBy(r, 3)], 4: [r => qPrime(r, 4), r => qDivBy(r, 4)], 5: [r => qPrime(r, 5), r => qDivisors(r, 5), r => qDivBy(r, 5)] },
    fracops: { 1: [r => qFracAdd(r, 1)], 2: [r => qFracAdd(r, 2)], 3: [r => qFracAdd(r, 3), r => qMixedAdd(r, 3)], 4: [r => qWholeTimesFrac(r, 4), r => qMixedAdd(r, 4), r => qFracAdd(r, 4)], 5: [r => qFracWord(r, 5), r => qWholeTimesFrac(r, 5), r => qMixedAdd(r, 5)] },
    measure: { 1: [r => qPerimeter(r, 1)], 2: [r => qPerimeter(r, 2)], 3: [r => qMissingSide(r, 3), r => qPerimeter(r, 3)], 4: [r => qVolume(r, 4), r => qTime(r, 4), r => qMissingSide(r, 4)], 5: [r => qTime(r, 5), r => qVolume(r, 5), r => qMissingSide(r, 5)] },
    data: { 1: [r => qGraphRead(r, 1)], 2: [r => qGraphCompare(r, 2), r => qChance(r, 2)], 3: [r => qGraphCompare(r, 3), r => qChance(r, 3)], 4: [r => qChanceCompare(r, 4), r => qGraphCompare(r, 4), r => qChance(r, 4)], 5: [r => qChanceCompare(r, 5), r => qGraphCompare(r, 5)] },
    shapes: { 1: [r => qBox(r, 1)], 2: [r => qSymmetry(r, 2), r => qTriSides(r, 2)], 3: [r => qSymmetry(r, 3), r => qTriSides(r, 3), r => qTriAngles(r, 3)], 4: [r => qTriAngles(r, 4), r => qSymmetry(r, 4), r => qBox(r, 4)], 5: [r => qTriAngles(r, 5), r => qBox(r, 5), r => qSymmetry(r, 5)] },
  };
  function generateQuestion(topicId, level, rng) {
    const lv = Math.max(1, Math.min(5, level | 0));
    const q = pick(rng, GEN[topicId][lv])(rng);
    q.level = lv; q.skill = q.gen + (q.meta && q.meta.op ? ':' + q.meta.op : '');
    return q;
  }
  // פרופיל באותו מבנה כמו ההכנה למבדק, כדי להשתמש באותו מנגנון רמות ורישום
  function newProfile() {
    const levels = {}, windows = {}, stats = {}, hist = {}, baseline = {};
    IDS.forEach(id => { levels[id] = 1; windows[id] = []; stats[id] = { answered: 0, correct: 0 }; hist[id] = ''; baseline[id] = { n: 0, c: 0 }; });
    return { v: 1, levels, windows, stats, hist, baseline, skills: {}, start: null, lastCounts: {}, days: {} };
  }
  function ensureProfile(p) {
    const b = newProfile(); p = p && typeof p === 'object' ? p : b;
    ['levels', 'windows', 'stats', 'hist', 'baseline'].forEach(k => { p[k] = p[k] || {}; IDS.forEach(id => { if (p[k][id] === undefined) p[k][id] = b[k][id]; }); });
    p.skills = p.skills || {}; p.lastCounts = p.lastCounts || {}; p.days = p.days || {}; if (p.start === undefined) p.start = null;
    return p;
  }
  // סבב: 4 נושאים, 4 שאלות בכל נושא; מעדיפים נושאים שתורגלו פחות או שהדיוק בהם נמוך
  function planRound(p, rng) {
    const score = id => { const st = p.stats[id] || { answered: 0 }, h = (p.hist[id] || '').slice(-10), acc = h.length ? [...h].filter(c => c === '1').length / h.length : 0.5; return st.answered + 20 * acc + rng() * 12; };
    return IDS.slice().sort((a, b) => score(a) - score(b)).slice(0, 4).map(id => ({ topic: id, count: 4 }));
  }
  const used = p => !!p && Object.keys(p.days || {}).some(k => p.days[k].answered > 0);
  const WHY = {
    numline: 'מספרים שליליים הם רעיון חדש: מתחת לאפס המספר "הגדול" אחרי המינוס הוא בעצם הקטן.',
    gematria: 'צריך לזכור את ערך כל אות, ולשים לב לחריגים (ט״ו, ט״ז) ולמאות מעל 400.',
    order: 'הנטייה הטבעית היא לחשב משמאל לימין, אבל כפל וחילוק קודמים לחיבור וחיסור, וסוגריים קודמים לכולם. חזקה היא כפל חוזר ולא כפל במעריך.',
    divis: 'סימני ההתחלקות ב-3, 6 ו-9 נשענים על סכום הספרות, וזה לא אינטואיטיבי. ראשוני דורש לבדוק שאין מחלקים נוספים.',
    fracops: 'הטעות הנפוצה היא לחבר גם את המכנים. צריך להבין שהמכנה הוא "סוג החלק" ולכן הוא לא משתנה.',
    measure: 'מתבלבלים בין היקף (אורך הגבול) לשטח (כמה ריבועים בפנים), ובין יחידות (ס״מ, סמ״ר, סמ״ק).',
    data: 'קריאת גרף דורשת לשים לב לקפיצות בציר. מושגי סיכוי (ודאי, אפשרי, בלתי אפשרי) חדשים.',
    shapes: 'צירי סימטרייה, סוגי משולשים ומבנה התיבה דורשים לדמיין את הצורה ולבדוק כל אפשרות.',
  };
  const HOW = {
    numline: ['לצייר ישר מספרים עם אפס באמצע ולזוז עליו בצעדים.', 'לדבר על מדחום: מינוס 3 קר יותר ממינוס 1.'],
    gematria: ['לכתוב טבלה של ערכי האותיות ולתרגל עם תאריכים עבריים ומספרי עמודים בסידור או בספר.'],
    order: ['לסמן קודם בעיגול את הכפל והחילוק, ורק אחר כך לחשב חיבור וחיסור.', 'לכתוב חזקה כפל מלא: 3³ = 3 × 3 × 3.'],
    divis: ['לחבר את הספרות ולבדוק אם הסכום בלוח הכפל של 3 או 9.', 'לבדוק ראשוני: לנסות לחלק ב-2, 3, 5, 7.'],
    fracops: ['לצייר פיצה מחולקת ולספור חלקים: שלושה שמיניות ועוד שתי שמיניות זה חמש שמיניות.'],
    measure: ['למדוד שולחן או ספר בבית ולחשב היקף ושטח.', 'לצייר מלבן על נייר משבצות ולספור ריבועים.'],
    data: ['לבנות יחד גרף מסקר קטן במשפחה (פרי אהוב) ולשאול שאלות עליו.', 'לשחק בקובייה ולדבר על מה ודאי, אפשרי ובלתי אפשרי.'],
    shapes: ['לקפל צורות מנייר לאורך קו כדי לבדוק סימטרייה.', 'לספור פאות, מקצועות וקודקודים על קופסת נעליים.'],
  };
  return { TOPICS, IDS, GEN, generateQuestion, newProfile, ensureProfile, planRound, used, heb, hebVal, WHY, HOW };
});
