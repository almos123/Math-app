/* ability.js — ציון יכולת 1–100, התנהלות (דילוגים והפסקות) וסיכום מפורט להורה.
   UMD. הכול נגזר מהנתונים השמורים: אין "הערכות" שלא נשענות על תשובות, זמנים ודילוגים שנמדדו.
   הציון אינו אחוז תשובות נכונות. הוא נשען על:
   1) סולם הרמות: הרמה הנוכחית ועוד הדיוק ברמה הזו (15 התשובות האחרונות), כלומר איפה הילד נמצא על סולם הקושי.
   2) מהירות: רק בתשובות נכונות, מול זמן יעד לנושא. משפיעה עד 12% מהציון, כדי שהבנה תישאר הגורם המרכזי.
   ציון מוצג רק כשיש מספיק נתונים. אחרת: "לא זמין". */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./insights.js'), require('./engine.js'), require('./times.js'), require('./english.js'));
  else root.Ability = factory(root.Insights, root.MathEngine, root.TimesEngine, root.EnglishEngine);
})(typeof self !== 'undefined' ? self : this, function (I, E, T, EN) {
  'use strict';

  // זמני יעד לתשובה נכונה (מילי-שניות). אלה פרמטרים של המערכת ולא מדד רשמי; ניתן לשנות כאן.
  const TARGET_MS = { million: 20000, addsub: 25000, fractions: 25000, muldiv: 30000, geometry: 20000, times: 6000 };
  const MIN_TOPIC = 8;            // תשובות אחרונות בנושא כדי שייכנס לציון
  const SPEED_WEIGHT = 0.12;      // כמה הציון יכול לרדת בגלל איטיות (ברירת מחדל ניטרלית כשאין נתוני זמן)
  const TEST_TOPICS = ['million', 'addsub', 'fractions', 'muldiv', 'geometry'];
  const PROGRAMS = {
    test: { id: 'test', title: 'הכנה למבדק', icon: '📝', topics: TEST_TOPICS, minTopics: 3, minAnswers: 30 },
    times: { id: 'times', title: 'לוח הכפל', icon: '✖️', topics: ['times'], minTopics: 1, minAnswers: 15 },
  };
  const SHORT = Object.assign({}, I.SHORT, { times: 'לוח הכפל' });
  const pct = x => Math.round(x * 100);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const g = (gender, m, f) => (gender === 'f' ? f : m);

  function band(score) {
    if (score === null || score === undefined) return null;
    return score >= 80 ? 'חזק מאוד' : score >= 60 ? 'טוב' : score >= 40 ? 'בינוני' : 'בתחילת הדרך';
  }

  function recent(profile, id) {
    const h = ((profile.hist || {})[id] || '').slice(-15);
    return { n: h.length, acc: h.length ? [...h].filter(c => c === '1').length / h.length : null };
  }
  // ציון לנושא אחד
  function topicScore(profile, id) {
    const r = recent(profile, id), st = (profile.stats || {})[id] || {};
    const level = ((profile.levels || {})[id]) || 1;
    if (r.n < MIN_TOPIC) return { id, n: r.n, included: false };
    const ladder = clamp((level - 1 + r.acc) / E.MAX_LEVEL, 0, 1);
    let avgCorrectMs = null, speed = null;
    if (st.ctn >= 5 && st.cms > 0) {
      avgCorrectMs = st.cms / st.ctn;
      const ratio = avgCorrectMs / (TARGET_MS[id] || 20000);
      speed = clamp(1 - (ratio - 1) / 2, 0, 1); // עד זמן היעד: 1. פי 3 מהיעד: 0
    }
    const score = clamp(Math.round(100 * ladder * (1 - SPEED_WEIGHT + SPEED_WEIGHT * (speed === null ? 0.5 : speed))), 1, 100);
    return { id, n: r.n, included: true, level, acc: r.acc, ladder, speed, avgCorrectMs, score };
  }
  // ציון לתוכנית: 'test' (profile = פרופיל הילד) או 'times' (profile = programs.times)
  function abilityScore(profile, program) {
    const P = PROGRAMS[program];
    const out = { program, score: null, enough: false, ladder: null, speed: null, speedUsed: false, topics: [], answered: 0, need: '' };
    if (!P || !profile) { out.need = 'אין נתונים'; return out; }
    const topics = P.topics.map(id => topicScore(profile, id));
    out.topics = topics;
    out.answered = P.topics.reduce((a, id) => a + ((((profile.stats || {})[id]) || {}).answered || 0), 0);
    const inc = topics.filter(t => t.included);
    out.enough = inc.length >= P.minTopics && out.answered >= P.minAnswers;
    if (!out.enough) {
      out.need = program === 'times'
        ? `נדרשות לפחות ${P.minAnswers} תשובות בלוח הכפל (כרגע ${out.answered}).`
        : `נדרשות לפחות ${P.minAnswers} תשובות ולפחות ${P.minTopics} נושאים עם ${MIN_TOPIC} תשובות אחרונות או יותר (כרגע ${out.answered} תשובות, ${inc.length} נושאים).`;
      return out;
    }
    out.ladder = inc.reduce((a, t) => a + t.ladder, 0) / inc.length;
    const sp = inc.filter(t => t.speed !== null);
    if (sp.length) { out.speed = sp.reduce((a, t) => a + t.speed, 0) / sp.length; out.speedUsed = true; }
    const factor = 1 - SPEED_WEIGHT + SPEED_WEIGHT * (out.speed === null ? 0.5 : out.speed);
    out.score = clamp(Math.round(100 * out.ladder * factor), 1, 100);
    return out;
  }
  // ציון כללי לילד: ממוצע המקצועות שיש להם ציון (מתמטיקה = ממוצע ההכנה למבדק ולוח הכפל; אנגלית)
  function overallScore(profile) {
    const test = abilityScore(profile, 'test');
    const xp = profile && profile.programs && profile.programs.times;
    const times = abilityScore(xp, 'times');
    const ep = profile && profile.programs && profile.programs.english;
    const english = EN && ep ? EN.abilityScore(EN.ensureProfile(ep)) : { score: null, need: 'אין נתונים', areas: [] };
    const mh = [test, times].filter(x => x.score !== null);
    const math = mh.length ? Math.round(mh.reduce((a, x) => a + x.score, 0) / mh.length) : null;
    const have = [math, english.score].filter(x => x !== null);
    const score = have.length ? Math.round(have.reduce((a, x) => a + x, 0) / have.length) : null;
    return { score, band: band(score), test, times, english, math, programs: mh.length + (english.score !== null ? 1 : 0) };
  }

  // ---------- התנהלות: דילוגים והפסקות באמצע ----------
  function engagement(days, stats, sinceDay) {
    const keys = Object.keys(days || {}).filter(d => !sinceDay || d >= sinceDay);
    const sum = f => keys.reduce((a, d) => a + (days[d][f] || 0), 0);
    const answered = sum('answered'), skips = sum('sk'), partial = sum('part'), partialQ = sum('pq'), rounds = sum('rounds');
    return { answered, skips, skipRate: answered + skips ? skips / (answered + skips) : null, partial, partialQ, rounds };
  }

  // ---------- למה קשה ומה עושים ----------
  const WHY = {
    digitValue: 'ערך הספרה תלוי במקום שלה, ויש ילדים שמתבלבלים בין "הספרה" לבין "הערך שלה" (3 במקום האלפים שווה 3,000).',
    expanded: 'פירוק מספר דורש להבין שכל מקום שווה פי 10 מהמקום שמימינו, ושמקום ריק מסומן באפס.',
    missingPart: 'השלמת חלק חסר משלבת פירוק לפי מקומות עם חישוב הפוך, ולכן שגיאה כאן מרמזת בדרך כלל על חולשה בפירוק עצמו.',
    compare: 'השוואת מספרים ארוכים נעשית ספרה אחרי ספרה מהמקום הגבוה, וטעות נפוצה היא להסתכל על הספרה האחרונה.',
    extreme: 'מציאת הגדול או הקטן מצריכה השוואה שיטתית של כמה מספרים, והקושי נובע לרוב מהשוואה חפוזה.',
    step: 'הוספה של 10,000 או 100,000 דורשת לדעת איזו ספרה משתנה, וקושי כאן מעיד על חוסר יציבות בשמות המקומות.',
    cross: 'במעבר מ-999 ל-1,000 או למיליון כמה ספרות משתנות בבת אחת, וזה מקום שבו נוצרות הרבה טעויות.',
    read: 'כתיבת מספר מתוך קריאתו דורשת להכיר את שלוש הקבוצות (מיליונים, אלפים, יחידות) ולהשלים באפסים.',
    thousands: 'ספירת האלפים במספר מבוססת על ההבנה שאלף הוא 1,000 ועל חילוק בו.',
    asPlain: 'בחיבור וחיסור בעמודות הטעויות נובעות בדרך כלל מ"נשארת" שנשכחה, מפריטה או מיישור עמודות לא מדויק.',
    'asPlain:-': 'בחיסור בעמודות הקושי המרכזי הוא פריטה (במיוחד כשיש אפסים), או היפוך בין הספרה הגדולה לקטנה בעמודה.',
    'asPlain:+': 'בחיבור בעמודות הטעויות הנפוצות הן "נשארת" שנשכחה או יישור עמודות לא מדויק.',
    asMissing: 'מחובר חסר דורש להבין את הקשר בין חיבור לחיסור (השלם פחות החלק).',
    asWord: 'בבעיה מילולית הקושי הוא בדרך כלל בהחלטה איזו פעולה לבצע, ולא בחישוב עצמו.',
    asTwoStep: 'בעיה בשני שלבים דורשת לתכנן סדר פעולות ולשמור תוצאת ביניים, ולכן קל לאבד את החוט.',
    fracBar: 'זיהוי שבר מציור דורש לספור חלקים שווים (מכנה) וחלקים צבועים (מונה) ולא להתבלבל ביניהם.',
    fracFood: 'שבר מתוך סיפור דורש לתרגם מילים לחלקים שווים ולהחליט מה המונה ומה המכנה.',
    fracTerm: 'בלבול בין מונה למכנה הוא אחד הקשיים הנפוצים בתחילת הלימוד של שברים.',
    fracCompare: 'השוואת שברים הפוכה לאינטואיציה: כשהמונה זהה, דווקא המכנה הקטן יותר נותן שבר גדול יותר.',
    fracWhole: 'כאן צריך להבין ששלם הוא n חלקים של 1/n, והקושי הוא בעיקר בחיבור בין המושג לדימוי.',
    fracComplete: 'השלמה לשלם דורשת להבין ששלם הוא n/n ולחשב את מה שחסר.',
    fracUnitOf: 'שבר יחידה של כמות הוא בעצם חילוק, והקושי נובע מהקישור בין שבר לחילוק.',
    fracKOf: 'שבר של כמות משלב שני שלבים (חילוק ואז כפל), וטעות נפוצה היא לעצור אחרי השלב הראשון.',
    fracWholeFromPart: 'מציאת השלם מתוך חלק היא פעולה הפוכה, ולכן קשה יותר לילד שרגיל להתחיל מהשלם.',
    fracLeft: 'בחיבור וחיסור שברים עם אותו מכנה טעות נפוצה היא לחבר או לחסר גם את המכנים.',
    mulMeaning: 'הבנת המשמעות של כפל כקבוצות שוות היא הבסיס, וחסר בה גורם לשינון בלי הבנה.',
    divMeaning: 'הבנת החילוק כחלוקה שווה היא הבסיס, וחסר בה גורם לטעויות בבעיות מילוליות.',
    table: 'לוח הכפל דורש שינון, ותרגילים עם 6 עד 9 קשים במיוחד כי אין להם דפוס קל לזכירה.',
    mulPow: 'כפל ב-10, 100 ו-1,000 מבוסס על ערך מקום, ופעמים רבות הילד "מוסיף אפס" בלי להבין למה.',
    divPow: 'חילוק ב-10, 100 ו-1,000 מבוסס על ערך מקום, וטעות נפוצה היא לגרוע אפסים בלי להתאים למספר.',
    mulTens: 'כפל בעשרות מחייב לפרק לשני שלבים ולא לשכוח את האפס.',
    mulMissing: 'גורם חסר הוא חילוק מוסווה, ולכן הוא קשה לילד שעוד לא ראה את הקשר בין כפל לחילוק.',
    divOne: 'חילוק ארוך דורש לשלב כפל, חיסור והורדת ספרה בכל שלב, ושגיאה באחד השלבים שוברת את כל התרגיל.',
    mulTwoOne: 'כפל דו-ספרתי דורש לפרק, לכפול ולחבר, ולכן הוא עומס על הזיכרון העובד.',
    remainder: 'חילוק עם שארית דורש להבין שהחלוקה אינה מדויקת ושהשארית תמיד קטנה מהמחלק.',
    wordMul: 'בבעיות מילוליות הקושי הוא זיהוי הפעולה (כפל או חילוק) ולא החישוב.',
    wordDiv: 'בבעיות מילוליות הקושי הוא זיהוי הפעולה ולא החישוב עצמו.',
    wordPack: 'בבעיות אריזה צריך להבין שמחלקים את הכמות הכוללת בגודל האריזה, ושנוכל לקבל שארית.',
    polySides: 'בספירת צלעות או קדקודים טעות נפוצה היא לספור פעמיים או לדלג, ולכן עוזר לסמן כל אחד תוך כדי ספירה.',
    polyFacts: 'מעבר משם המצולע למספר הצלעות דורש היכרות עם השמות (משולש, מרובע, מחומש…).',
    polyName: 'שמות המצולעים נלמדים בשינון, והקושי הוא בדרך כלל בבלבול בין שמות דומים (משושה, משובע).',
    def_par: 'הגדרות גאומטריות דורשות להבדיל בין מושגים דומים, ובמיוחד בין מקבילות למאונכות.',
    def_perp: 'מאונכות מתבלבלת בקלות עם מקבילות, והגדרה בעל פה פחות עוזרת מציור וסימון זווית.',
    def_diag: 'אלכסון מתבלבל בקלות עם צלע, והפתרון הוא ציור עם סימון של כל קטע.',
    parPairs: 'כדי לזהות מקבילות צריך לבדוק גם צלעות שלא נוגעות זו בזו, וטעות נפוצה היא להסתכל רק על צלעות סמוכות.',
    rightAngles: 'זיהוי זווית ישרה דורש לבדוק כל קדקוד בנפרד ולא להסתפק במראה כללי של הצורה.',
    whichShape: 'זיהוי צורה לפי תכונות דורש להחזיק כמה תכונות יחד ולעבור על כל הצורות בשיטתיות.',
    diagTotal: 'ספירת אלכסונים דורשת שיטה או נוסחה, וקשה לעשות אותה בעין בלי לספור פעמיים.',
    diagVertex: 'צריך להבין שמקדקוד לא יוצא אלכסון אל עצמו ואל שני שכניו.',
    mul: 'תרגילי כפל בלוח הכפל דורשים שינון, והקושי הגדול ביותר הוא בתרגילים עם 6 עד 9.',
    div: 'חילוק בלוח הכפל נשען על הכפל בכיוון ההפוך: כדי לחשב 56 ÷ 7 צריך לדעת ש-7 × 8 הוא 56.',
    miss: 'מספר חסר בתרגיל דורש להבין את הקשר בין כפל לחילוק.',
  };
  const TOPIC_WHY = {
    million: 'מספרים גדולים דורשים הבנה יציבה של ערך מקום, וקושי בנושא נובע לרוב מבלבול בין מקומות שונים במספר.',
    addsub: 'בחיבור וחיסור הקושי נובע בדרך כלל מפריטה, מ"נשארת" או מתרגום בעיה מילולית לפעולה.',
    fractions: 'שברים דורשים לחשוב על חלקים של שלם ולא על מספרים שלמים, וזה מעבר מחשבתי שקשה לחלק מהילדים.',
    muldiv: 'כפל וחילוק משלבים שינון והבנה, ושחיקה באחד מהם פוגעת במשימות מורכבות יותר.',
    geometry: 'גאומטריה דורשת לחבר מושגים (צלע, קדקוד, אלכסון) עם ראייה של צורה, וקל להתבלבל בין מושגים דומים.',
    times: 'לוח הכפל נשען על שינון, ואצל רוב הילדים נשארים כמה תרגילים מסוימים שלא התקבעו.',
  };
  const whyOf = k => WHY[k] || WHY[String(k).split(':')[0]] || null;

  const STRATEGY = {
    rushing: 'לבקש לבדוק את התשובה בפעולה הפוכה לפני שהוא לוחץ על אישור, ולהאט בכוונה בשאלות הקשות.',
    slow: 'לתרגל בעל פה בקטעים קצרים וקבועים (5 דקות ביום) כדי שהידע יהפוך לאוטומטי ויחסוך זמן.',
    skipping: 'לעודד לנסות גם כשלא בטוחים. כדאי לשבת יחד על שאלה אחת שאפשר היה לדלג עליה ולפתור בקול רם, צעד אחרי צעד.',
    lowLevel: 'לחזור צעד אחורה ולפתור יחד שאלה אחת ביום בקול רם, עם ציור, ורק אחר כך להעלות קושי.',
    general: 'תרגול קצר ותכוף (10 דקות ביום) יעיל יותר מתרגול ארוך אחת לכמה ימים.',
  };
  function signals(profile, id, gen) {
    const st = (profile.stats || {})[id] || {}, out = [];
    const ans = st.answered || 0, tn = st.tn || 0, target = TARGET_MS[id] || 20000;
    const acc = ans ? (st.correct || 0) / ans : null;
    if (tn >= 8 && st.ms > 0) {
      const avg = st.ms / tn;
      if (acc !== null && acc < 0.6 && avg < target * 0.5) out.push({ code: 'rushing', text: `ממוצע התשובות מהיר (${I.fmtAvg(avg)}) בזמן שהדיוק נמוך (${pct(acc)}%), ונראה ש${g(gen, 'הילד עונה', 'הילדה עונה')} מהר מדי.` });
      if (acc !== null && acc >= 0.8 && avg > target * 1.5) out.push({ code: 'slow', text: `הדיוק טוב (${pct(acc)}%) אבל התשובות איטיות (${I.fmtAvg(avg)} בממוצע), והידע קיים אך עדיין לא אוטומטי.` });
    }
    const sk = st.sk || 0;
    if (sk >= 3 && sk / (ans + sk) >= 0.2) out.push({ code: 'skipping', text: `${g(gen, 'דילג', 'דילגה')} על ${sk} שאלות בנושא (${pct(sk / (ans + sk))}% מהשאלות שהוצגו), מה שעשוי להעיד על חוסר ביטחון בנושא.` });
    return out;
  }

  // =====================================================================
  // סיכום מלא לילד אחד
  // kid: { name, gender }; profile: מסמך הילד (כולל programs.times); o: { today }
  // =====================================================================
  function buildReport(kid, profile, o) {
    const name = kid.name, gen = kid.gender === 'f' ? 'f' : 'm', today = (o && o.today) || E.dayKey();
    const ov = overallScore(profile);
    const rep = { name, gender: gen, date: today, overall: ov, programs: [], nextSteps: [], notes: [] };
    const used = days => Object.keys(days || {}).some(k => days[k].answered > 0);

    // ---- הכנה למבדק ----
    const test = { id: 'test', title: PROGRAMS.test.title, icon: PROGRAMS.test.icon, ability: ov.test, strengths: [], focus: [], engagement: null, timing: null, started: used(profile.days) };
    if (test.started) {
      const a = I.analyzeKid(profile, { name, gender: gen, today });
      a.topics.forEach(t => {
        const ts = ov.test.topics.find(x => x.id === t.id);
        if (t.flag === 'strong' || (ts && ts.included && ts.level >= 4 && ts.acc >= 0.85)) test.strengths.push({ title: t.short, evidence: `רמה ${t.level} (${I.LEVEL_NAMES[t.level]}), ${t.recentAcc === null ? '' : pct(t.recentAcc) + '% נכונות בתשובות האחרונות'}`.replace(/, $/, '') });
        t.strengths.forEach(s => test.strengths.push({ title: `${t.short}: ${s}`, evidence: '' }));
      });
      const skills = profile.skills || {};
      I.BY_TOPIC && Object.keys(I.BY_TOPIC).forEach(tid => {
        const ts = ov.test.topics.find(x => x.id === tid);
        const mine = Object.keys(skills).filter(k => I.skillTopic(k) === tid).map(k => {
          const s = skills[k], r = s.r || '', rn = r.length;
          return { key: k, rn, ra: rn ? [...r].filter(c => c === '1').length / rn : null, sk: s.sk || 0, n: s.n || 0 };
        });
        const weakSk = mine.filter(s => s.rn >= 5 && s.ra <= 0.6).sort((x, y) => x.ra - y.ra).slice(0, 2);
        const topicWeak = a.topics.find(x => x.id === tid);
        const sig = signals(profile, tid, gen);
        const lowLevel = topicWeak && (topicWeak.flag === 'weak' || topicWeak.status === 'declined');
        if (!weakSk.length && !lowLevel && !sig.some(x => x.code === 'skipping' || x.code === 'rushing')) return;
        const why = [], how = [];
        weakSk.forEach(s => { const w = whyOf(s.key); if (w && !why.includes(w)) why.push(w); const tp = I.skillTip(s.key); if (tp && !how.includes(tp)) how.push(tp); });
        if (!why.length) why.push(TOPIC_WHY[tid]);
        if (!how.length && I.TIPS) how.push(topicWeak && topicWeak.tip ? topicWeak.tip : TOPIC_WHY[tid]);
        sig.forEach(x => { why.push(x.text); how.push(STRATEGY[x.code]); });
        if (lowLevel && ts && ts.included && ts.level <= 2) how.push(STRATEGY.lowLevel);
        const title = weakSk.length ? `${SHORT[tid]}: ${weakSk.map(s => I.skillLabel(s.key)).join(', ')}` : `${SHORT[tid]}`;
        const evid = weakSk.map(s => `${I.skillLabel(s.key)}: ${pct(s.ra)}% נכונות ב-${s.rn} האחרונות`);
        if (ts && ts.included) evid.push(`רמה ${ts.level} (${I.LEVEL_NAMES[ts.level]}), ${pct(ts.acc)}% נכונות בתשובות האחרונות`);
        test.focus.push({ title, evidence: evid.join(' · '), why, how: how.filter(Boolean).slice(0, 4) });
      });
      test.engagement = engagement(profile.days, profile.stats);
      const tm = I.analyzeTiming({ days: profile.days, stats: profile.stats });
      test.timing = tm.timed ? { avgMs: tm.avgMs, timed: tm.timed, byTopic: tm.byTopic } : null;
      test.summaryParas = a.paragraphs;
    }
    rep.programs.push(test);

    // ---- לוח הכפל ----
    const xp = profile.programs && profile.programs.times;
    const tprog = { id: 'times', title: PROGRAMS.times.title, icon: PROGRAMS.times.icon, ability: ov.times, strengths: [], focus: [], engagement: null, timing: null, started: !!xp && used(xp.days) };
    if (tprog.started) {
      const a = I.analyzeTimes(xp, { name, gender: gen, today });
      if (a.strongTables.length) tprog.strengths.push({ title: `טבלאות: ${a.strongTables.join(', ')}`, evidence: 'דיוק של 90% ומעלה בתרגילים האחרונים' });
      if (a.byType.mul.acc !== null && a.byType.mul.rn >= 6 && a.byType.mul.acc >= 0.9) tprog.strengths.push({ title: 'כפל', evidence: `${pct(a.byType.mul.acc)}% נכונות ב-${a.byType.mul.rn} התשובות האחרונות` });
      if (a.byType.div.acc !== null && a.byType.div.rn >= 6 && a.byType.div.acc >= 0.9) tprog.strengths.push({ title: 'חילוק', evidence: `${pct(a.byType.div.acc)}% נכונות ב-${a.byType.div.rn} התשובות האחרונות` });
      const why = [], how = [];
      if (a.weakFacts.length) {
        a.weakFacts.slice(0, 3).forEach(w => { how.push(`${w.text}: ${w.tip}`); });
        why.push(`התרגילים שהתקשה בהם: ${a.weakFacts.map(w => `${w.text} (${w.right} נכון מתוך ${w.tries})`).join(', ')}.`);
        why.push(WHY.mul);
        tprog.focus.push({ title: 'תרגילים לחיזוק', evidence: a.weakFacts.map(w => w.text).join(' · '), why, how: how.slice(0, 3) });
      }
      if (a.weakTables.length) tprog.focus.push({ title: `טבלאות: ${a.weakTables.map(t => t.t).join(', ')}`, evidence: a.weakTables.map(t => `${t.t}: ${pct(t.acc)}% נכונות`).join(' · '), why: [WHY.table], how: [`לתרגל בקפיצות (למשל ${a.weakTables[0].t}, ${a.weakTables[0].t * 2}, ${a.weakTables[0].t * 3}…) ובעל פה.`] });
      if (a.byType.div.rn >= 5 && a.byType.mul.acc !== null && a.byType.div.acc !== null && a.byType.div.acc < a.byType.mul.acc - 0.2) {
        tprog.focus.push({ title: 'חילוק', evidence: `${pct(a.byType.div.acc)}% בחילוק לעומת ${pct(a.byType.mul.acc)}% בכפל`, why: [WHY.div], how: ['לשאול "7 כפול כמה שווה 56?" כדי לחשב 56 ÷ 7, ולחזור על משפחות תרגילים (7×8, 8×7, 56÷7, 56÷8).'] });
      }
      const sig = signals(xp, 'times', gen);
      if (sig.length) tprog.focus.push({ title: 'קצב ועקביות', evidence: '', why: sig.map(x => x.text), how: sig.map(x => STRATEGY[x.code]) });
      tprog.engagement = engagement(xp.days, xp.stats);
      const tm = I.analyzeTiming({ days: xp.days, stats: xp.stats, rlog: xp.rlog, facts: xp.facts });
      tprog.timing = tm.timed ? { avgMs: tm.avgMs, timed: tm.timed, slowFacts: tm.slowFacts, trendText: tm.trendText } : null;
      tprog.summaryParas = a.paragraphs;
    }
    rep.programs.push(tprog);

    // ---- אנגלית ----
    const ep = profile.programs && profile.programs.english;
    if (EN) {
      const eprog = EN.report({ name, gender: gen }, EN.ensureProfile(ep ? ep : EN.newProfile()));
      eprog.ability = ov.english;
      (eprog.notes || []).forEach(n => rep.notes.push(n));
      rep.programs.push(eprog);
    }

    // ---- התנהלות כוללת והמלצות ----
    const sk = rep.programs.reduce((a, p) => a + (p.engagement ? p.engagement.skips : 0), 0);
    const part = rep.programs.reduce((a, p) => a + (p.engagement ? p.engagement.partial : 0), 0);
    const ans = rep.programs.reduce((a, p) => a + (p.engagement ? p.engagement.answered : 0), 0);
    rep.engagement = { skips: sk, partial: part, answered: ans, skipRate: ans + sk ? sk / (ans + sk) : null };
    if (sk) rep.notes.push(`${name} ${g(gen, 'דילג', 'דילגה')} על ${sk} שאלות (${pct(rep.engagement.skipRate)}% מהשאלות שהוצגו). שאלה שדילגו עליה חוזרת בסוף אותו חלק, ובתשובה עליה לא נרשם דבר שונה מרגיל.`);
    if (part) rep.notes.push(`${part} ${part === 1 ? 'תרגול הופסק' : 'תרגולים הופסקו'} באמצע. תשובות שניתנו עד ההפסקה נספרות בתוצאות, וסבב שהופסק אינו נספר כסבב מלא.`);
    if (sk >= 5 && rep.engagement.skipRate >= 0.15) rep.nextSteps.push(STRATEGY.skipping);
    rep.programs.forEach(p => p.focus.slice(0, 1).forEach(f => f.how.slice(0, 1).forEach(h => rep.nextSteps.push(`${p.title}, ${f.title}: ${h}`))));
    if (!rep.nextSteps.length && ov.programs) rep.nextSteps.push(STRATEGY.general);
    rep.nextSteps = rep.nextSteps.slice(0, 4);
    return rep;
  }

  // נוסח טקסט פשוט (להעתקה ולשיתוף)
  function reportText(rep) {
    const L = [], g2 = (m, f) => (rep.gender === 'f' ? f : m);
    const fmtScore = s => (s === null || s === undefined ? 'לא זמין (אין מספיק נתונים)' : `${s} מתוך 100 (${band(s)})`);
    L.push(`סיכום יכולות: ${rep.name}`, `תאריך: ${rep.date}`, '');
    L.push(`ציון כללי: ${fmtScore(rep.overall.score)}`);
    L.push('הציון מודד את הרמה ואת ההבנה במערכת התרגול (ולא אחוז תשובות נכונות), ובתשובות נכונות גם את המהירות. הוא אינו ציון בית-ספרי.');
    rep.programs.forEach(p => {
      L.push('', `== ${p.title} ==`);
      if (!p.started) { L.push('עוד לא תורגל.'); return; }
      L.push(`ציון: ${fmtScore(p.ability.score)}`);
      if (p.ability.score === null && p.ability.need) L.push(p.ability.need);
      if (p.summaryParas) p.summaryParas.slice(0, 2).forEach(x => L.push(x));
      L.push('', 'מה חזק:');
      if (p.strengths.length) p.strengths.forEach(s => L.push(`- ${s.title}${s.evidence ? ` (${s.evidence})` : ''}`)); else L.push('- עדיין לא זוהה תחום חזק במובהק (נדרש עוד תרגול).');
      L.push('', 'מה דורש חיזוק:');
      if (p.focus.length) p.focus.forEach(f => {
        L.push(`- ${f.title}${f.evidence ? ` (${f.evidence})` : ''}`);
        f.why.forEach(w => L.push(`  למה זה קשה: ${w}`));
        f.how.forEach(h => L.push(`  איך משפרים: ${h}`));
      }); else L.push('- לא זוהו תחומים חלשים במובהק.');
      if (p.timing) L.push('', `זמן: ממוצע ${I.fmtAvg(p.timing.avgMs)} לשאלה (${p.timing.timed} שאלות נמדדו).`);
      if (p.engagement && (p.engagement.skips || p.engagement.partial)) L.push(`דילוגים: ${p.engagement.skips}. תרגולים שהופסקו באמצע: ${p.engagement.partial}.`);
    });
    if (rep.notes.length) { L.push('', 'התנהלות בתרגול:'); rep.notes.forEach(n => L.push(`- ${n}`)); }
    if (rep.nextSteps.length) { L.push('', 'מה כדאי לעשות בבית:'); rep.nextSteps.forEach(n => L.push(`- ${n}`)); }
    return L.join('\n');
  }

  return { TARGET_MS, PROGRAMS, band, topicScore, abilityScore, overallScore, engagement, signals, buildReport, reportText, WHY, STRATEGY };
});
