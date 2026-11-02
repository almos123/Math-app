/* times.js — תרגול לוח הכפל (עד 100) כתוכנית נפרדת מההכנה למבדק.
   10 שאלות בכל פעם; הרמה עולה ויורדת לפי התשובות; ברמה 4 מצטרף חילוק, וברמה 5 גם "מספר חסר".
   התוכנית שומרת פרופיל משלה (רמה, היסטוריה, וסטטיסטיקה לכל תרגיל בנפרד) כדי לזהות אילו תרגילים חזקים ואילו חלשים.
   UMD: חלון הדפדפן (window.TimesEngine) ו-Node לבדיקות. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.TimesEngine = factory(root.MathEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';

  const ID = 'times';
  const PER_SESSION = 10;
  const MAX_LEVEL = 5;
  // הטבלאות שמופיעות בכל רמה (המכפל השני תמיד 1 עד 10, ולכן התוצאה תמיד עד 100)
  const TABLES = { 1: [2, 5, 10], 2: [1, 2, 3, 4, 5, 10], 3: [2, 3, 4, 5, 6, 10], 4: [2, 3, 4, 5, 6, 7, 8, 10], 5: [2, 3, 4, 5, 6, 7, 8, 9, 10] };
  const LEVEL_INFO = { 1: 'טבלאות 2, 5 ו-10', 2: 'טבלאות 1 עד 5 ו-10', 3: 'טבלאות עד 6 וטבלת 10', 4: 'טבלאות עד 8, וגם שאלות חילוק', 5: 'כל הטבלאות עד 100, חילוק ומספר חסר' };
  // הרכב השאלות לפי רמה: כפל תמיד, חילוק מרמה 4, מספר חסר ברמה 5
  const MIX = { 1: { mul: 1 }, 2: { mul: 1 }, 3: { mul: 1 }, 4: { mul: 0.7, div: 0.3 }, 5: { mul: 0.45, div: 0.35, miss: 0.2 } };
  const DIVISION_FROM = 4;

  const clampLv = l => Math.max(1, Math.min(MAX_LEVEL, l | 0));
  const factKey = (a, b) => Math.min(a, b) + 'x' + Math.max(a, b);

  // ---------- פרופיל ----------
  function newProfile() {
    return { v: 1, levels: { times: 1 }, windows: { times: [] }, stats: { times: { answered: 0, correct: 0 } }, hist: { times: '' },
      baseline: { times: { n: 0, c: 0 } }, skills: {}, start: null, lastCounts: {}, days: {}, facts: {}, rlog: [] };
  }
  function ensureProfile(p) {
    const b = newProfile();
    p = p || {};
    ['levels', 'windows', 'stats', 'hist', 'baseline'].forEach(k => { p[k] = p[k] || {}; if (p[k].times === undefined) p[k].times = b[k].times; });
    p.skills = p.skills || {}; p.days = p.days || {}; p.facts = p.facts || {}; p.lastCounts = p.lastCounts || {}; p.rlog = Array.isArray(p.rlog) ? p.rlog : [];
    if (p.start === undefined) p.start = null;
    p.v = 1;
    return p;
  }
  function recordFact(profile, q, ok) {
    const f = profile.facts[q.fact] || (profile.facts[q.fact] = { n: 0, c: 0, r: '' });
    f.n++; if (ok) f.c++; f.r = (f.r + (ok ? '1' : '0')).slice(-6);
  }
  // רישום תשובה: אותם כללי עלייה וירידה של המנוע הראשי, ובנוסף סטטיסטיקה לכל תרגיל
  function record(profile, q, ok, day) {
    const res = E.recordAnswer(profile, ID, ok, day, q.skill);
    recordFact(profile, q, ok);
    return res;
  }
  // זמן: ליום ולנושא (במנוע הראשי), ולכל תרגיל בנפרד. יומן סבבים (30 אחרונים) לצפייה של ההורה בלבד.
  function recordTime(profile, q, day, ms, correct) {
    const m = E.recordTime(profile, ID, day, ms, correct);
    const f = profile.facts[q.fact] || (profile.facts[q.fact] = { n: 0, c: 0, r: '' });
    f.ms = (f.ms || 0) + m; f.t = (f.t || 0) + 1;
    return m;
  }
  function recordSkip(profile, q, day) {
    E.recordSkip(profile, ID, day, q.skill);
    const f = profile.facts[q.fact] || (profile.facts[q.fact] = { n: 0, c: 0, r: '' });
    f.sk = (f.sk || 0) + 1;
  }
  function logRound(profile, day, info) {
    const e = { d: day, n: info.n, ok: info.ok, ms: Math.round(info.ms), lv: info.lv };
    if (info.sk) e.sk = info.sk;
    if (info.partial) e.p = 1; // סבב שהופסק באמצע
    profile.rlog = (profile.rlog || []).concat([e]).slice(-30);
  }
  function factStatus(f) {
    if (!f || !f.n) return 'new';
    const acc = f.c / f.n, last = f.r.slice(-1);
    if (last === '0' || (f.n >= 2 && acc < 0.6)) return 'weak';
    if (f.n >= 2 && acc >= 0.75 && f.r.slice(-2) === '11') return 'strong';
    return 'mid';
  }
  // משקל לבחירת תרגיל: תרגילים חדשים וכאלה שנכשלו מופיעים יותר, וכאלה ששלטו בהם פחות
  function weight(profile, a, b) {
    const f = profile.facts[factKey(a, b)], st = factStatus(f);
    let w = st === 'new' ? 2 : st === 'weak' ? 4 : st === 'strong' ? 0.4 : 1;
    if (a === 1 || b === 1) w *= 0.4;
    return w;
  }
  function weighted(rng, items, wf) {
    let tot = 0; const ws = items.map(i => { const w = wf(i); tot += w; return w; });
    let r = rng() * tot;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }

  // ---------- הסברים: איך מחשבים ----------
  const PRIORITY = [10, 1, 2, 5, 9, 4, 3, 6, 8, 7];
  function strategy(a, b) {
    const f = PRIORITY.find(p => a === p || b === p), x = a === f ? b : a;
    switch (f) {
      case 10: return `כפל ב-10: מוסיפים אפס. ${x} × 10 = ${x * 10}.`;
      case 1: return `כפל ב-1 לא משנה את המספר: ${x} × 1 = ${x}.`;
      case 2: return `כפל ב-2 הוא הכפלה של המספר: ${x} + ${x} = ${2 * x}.`;
      case 5: return `כפל ב-5 הוא חצי מכפל ב-10: ${x} × 10 = ${10 * x}, וחצי מזה הוא ${5 * x}.`;
      case 9: return `כפל ב-9: כפל ב-10 פחות פעם אחת. ${x} × 10 = ${10 * x}, ואז ${10 * x} − ${x} = ${9 * x}.`;
      case 4: return `כפל ב-4: מכפילים פעמיים. ${x} × 2 = ${2 * x}, ואז ${2 * x} × 2 = ${4 * x}.`;
      case 3: return `כפל ב-3: כפל ב-2 ועוד פעם אחת. ${x} × 2 = ${2 * x}, ואז ${2 * x} + ${x} = ${3 * x}.`;
      case 6: return `כפל ב-6: כפל ב-5 ועוד פעם אחת. ${x} × 5 = ${5 * x}, ואז ${5 * x} + ${x} = ${6 * x}.`;
      case 8: return `כפל ב-8: מכפילים שלוש פעמים. ${x} × 2 = ${2 * x}, ${2 * x} × 2 = ${4 * x}, ${4 * x} × 2 = ${8 * x}.`;
      default: return `כפל ב-7: כפל ב-5 ועוד כפל ב-2. ${x} × 5 = ${5 * x}, ${x} × 2 = ${2 * x}, ואז ${5 * x} + ${2 * x} = ${7 * x}.`;
    }
  }
  // מערך נקודות: a שורות של b נקודות
  function arraySvg(rows, cols) {
    const s = Math.min(20, Math.floor(200 / Math.max(rows, cols))), w = cols * s, h = rows * s;
    let c = '';
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) c += `<circle class="dotc" cx="${(j * s + s / 2)}" cy="${(i * s + s / 2)}" r="${(s * 0.36).toFixed(1)}"/>`;
    return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${rows} שורות של ${cols}" style="max-width:${Math.min(w, 200)}px">${c}</svg>`;
  }

  // ---------- יצירת שאלה ----------
  function pickType(rng, level) {
    const mix = MIX[level]; let r = rng(), acc = 0;
    for (const t of Object.keys(mix)) { acc += mix[t]; if (r < acc) return t; }
    return 'mul';
  }
  function build(type, a, b, rng, lv) {
    const prod = a * b, flip = rng() < 0.5;
    const q = { topic: ID, gen: type, meta: { a, b }, kind: 'num', level: lv, skill: type, fact: factKey(a, b), svgAfter: arraySvg(a, b) };
    if (type === 'mul') {
      const [x, y] = flip ? [b, a] : [a, b];
      q.text = 'כמה זה?'; q.eq = `${x} × ${y} = ▢`; q.answer = prod;
      q.explain = `${x} × ${y} = ${prod}. ${strategy(a, b)}`;
    } else if (type === 'div') {
      q.text = 'כמה זה?'; q.eq = `${prod} ÷ ${a} = ▢`; q.answer = b;
      q.explain = `חילוק הוא ההפך מכפל. ${prod} ÷ ${a} = ▢ אומר ${a} × ▢ = ${prod}. מכיוון ש-${a} × ${b} = ${prod}, אז ${prod} ÷ ${a} = ${b}. ${strategy(a, b)}`;
    } else {
      q.text = 'איזה מספר חסר?'; q.eq = flip ? `▢ × ${a} = ${prod}` : `${a} × ▢ = ${prod}`; q.answer = b;
      q.explain = `מחלקים את התוצאה בגורם הידוע: ${prod} ÷ ${a} = ${b}. בדיקה: ${a} × ${b} = ${prod}. ${strategy(a, b)}`;
    }
    return q;
  }
  const seenKey = q => q.gen + ':' + q.fact + ':' + q.meta.a + ':' + q.meta.b;
  // seen: קבוצת תרגילים שכבר הופיעו בסבב הנוכחי (כדי לא לחזור בתוך 10 שאלות)
  function generateQuestion(profile, level, rng, seen) {
    const lv = clampLv(level), tables = TABLES[lv];
    let first = null;
    for (let t = 0; t < 40; t++) {
      const type = pickType(rng, lv);
      const cand = [];
      tables.forEach(a => { if (type === 'div' && a < 2) return; for (let b = 1; b <= 10; b++) cand.push([a, b]); });
      const [a, b] = weighted(rng, cand, ([x, y]) => weight(profile, x, y));
      const q = build(type, a, b, rng, lv);
      if (!first) first = q;
      if (!seen || !(seen.has(seenKey(q)) || seen.has('f:' + q.fact))) return q;
    }
    return first;
  }
  const checkAnswer = (q, given) => E.checkAnswer(q, given);

  // ---------- ניתוח תרגילים וטבלאות (להורה ולפידבק) ----------
  function allFacts(profile) {
    const out = [];
    for (let a = 1; a <= 10; a++) for (let b = a; b <= 10; b++) out.push({ key: a + 'x' + b, a, b, st: factStatus(profile.facts[a + 'x' + b]), f: profile.facts[a + 'x' + b] || null });
    return out;
  }
  function weakFacts(profile, n) {
    return allFacts(profile).filter(x => x.st === 'weak' && x.f && x.f.n >= 1 && !(x.a === 1))
      .sort((p, q) => (q.f.n - q.f.c) - (p.f.n - p.f.c) || p.f.c / p.f.n - q.f.c / q.f.n).slice(0, n || 5);
  }
  // סטטיסטיקה לטבלה t: כל התרגילים שבהם t הוא אחד הגורמים
  function tableStats(profile) {
    const out = [];
    for (let t = 2; t <= 10; t++) {
      let n = 0, c = 0, seen = 0, strong = 0;
      for (let o = 1; o <= 10; o++) { const f = profile.facts[factKey(t, o)]; if (f && f.n) { n += f.n; c += f.c; seen++; if (factStatus(f) === 'strong') strong++; } }
      out.push({ t, n, c, acc: n ? c / n : null, seen, strong });
    }
    return out;
  }
  // רצף ימים: יום נחשב אם בוצע בו אחד מהתרגולים (מבדק: 15 שאלות, לוח הכפל: 10 שאלות)
  function streakAny(testProfile, timesProfile, today) {
    const day = k => ((testProfile && testProfile.days[k] ? testProfile.days[k].answered : 0) >= E.ROUND_MIN) || ((timesProfile && timesProfile.days[k] ? timesProfile.days[k].answered : 0) >= PER_SESSION);
    const cur = new Date((today || E.dayKey()) + 'T12:00:00'); let n = 0;
    if (!day(E.dayKey(cur))) cur.setDate(cur.getDate() - 1);
    while (day(E.dayKey(cur))) { n++; cur.setDate(cur.getDate() - 1); }
    return n;
  }

  return { ID, PER_SESSION, MAX_LEVEL, TABLES, LEVEL_INFO, MIX, DIVISION_FROM, factKey, newProfile, ensureProfile, record, recordFact, recordTime, recordSkip, logRound, factStatus,
    generateQuestion, seenKey, checkAnswer, strategy, arraySvg, allFacts, weakFacts, tableStats, streakAny };
});
