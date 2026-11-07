/* insights.js — פידבק חיובי לילד אחרי סבב, וניתוח מילולי להורה (התחלה מול עכשיו).
   UMD. הכול נגזר ישירות מהנתונים: כל משפט נשען על מספר שנמדד, ואין "הערכות" שלא נתמכות בתשובות.
   ככל שמצטברות תשובות — נוספות השוואות וזיהוי מיומנויות חזקות/חלשות. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Insights = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SHORT = { million: 'המיליון', addsub: 'חיבור וחיסור', fractions: 'שברים', muldiv: 'כפל וחילוק', geometry: 'גיאומטריה',
    // נושאי כיתה ד' (g4.js)
    numline: 'ישר המספרים', gematria: 'האלף-בית והמספרים', order: 'סדר הפעולות', divis: 'ההתחלקות', fracops: 'פעולות בשברים', measure: 'המדידות', data: 'הנתונים והסיכויים', shapes: 'המשולשים והתיבות' };
  const LEVEL_NAMES = ['', 'התחלה', 'בסיס', 'בינוני', 'מתקדם', 'אלוף'];
  const TOPIC_IDS = ['million', 'addsub', 'fractions', 'muldiv', 'geometry'];

  const BY_TOPIC = {
    million: ['digitValue', 'expanded', 'missingPart', 'compare', 'extreme', 'step', 'cross', 'read', 'thousands'],
    addsub: ['asPlain', 'asMissing', 'asWord', 'asTwoStep'],
    fractions: ['fracBar', 'fracFood', 'fracTerm', 'fracCompare', 'fracWhole', 'fracComplete', 'fracUnitOf', 'fracKOf', 'fracWholeFromPart', 'fracLeft'],
    muldiv: ['mulMeaning', 'divMeaning', 'table', 'mulPow', 'mulTens', 'divPow', 'mulMissing', 'divOne', 'mulTwoOne', 'remainder', 'wordMul', 'wordDiv', 'wordPack'],
    geometry: ['polySides', 'polyFacts', 'polyName', 'def_par', 'def_perp', 'def_diag', 'parPairs', 'rightAngles', 'whichShape', 'diagTotal', 'diagVertex'],
  };

  const LABEL = {
    lineRead: 'קריאת ישר המספרים', temp: 'טמפרטורות ומספרים שליליים', negCmp: 'השוואת מספרים שליליים', dist: 'מרחק על ישר המספרים',
    hebVal: 'ערך של מספר באותיות', hebWrite: 'כתיבת מספר באותיות', hebHund: 'מאות באותיות', hebWord: 'ערך של מילה', hebYear: 'השנה העברית',
    order: 'סדר פעולות', zeroOne: 'תכונות 0 ו-1', power: 'חזקות', divBy: 'סימני התחלקות', prime: 'מספרים ראשוניים', divisors: 'מחלקים של מספר',
    fracAdd: 'חיבור וחיסור שברים', mixedAdd: 'חיבור מספרים מעורבים', wholeTimes: 'שלם כפול שבר', fracWord: 'בעיה מילולית בשברים',
    perim: 'היקף מלבן', area: 'שטח מלבן', missingSide: 'צלע חסרה במלבן', volume: 'נפח תיבה', time: 'חישובי זמן', units: 'יחידות שטח',
    graphRead: 'קריאת דיאגרמה', graphDiff: 'השוואה בדיאגרמה', graphTotal: 'סכום בדיאגרמה', chance: 'ודאי, אפשרי ובלתי אפשרי', chanceCmp: 'השוואת סיכויים',
    box: 'פאות, מקצועות וקודקודים', boxEdges: 'מקצועות של תיבה', symmetry: 'צירי סימטרייה', triSides: 'סוגי משולשים לפי צלעות', triAngles: 'סוגי משולשים לפי זוויות', triMissing: 'סכום הזוויות במשולש',
    digitValue: 'ערך הספרה לפי המקום שלה במספר', expanded: 'פירוק והרכבה של מספרים לפי ערך הספרות', missingPart: 'השלמת ערך חסר בפירוק מספר',
    compare: 'השוואת מספרים גדולים', extreme: 'מציאת המספר הגדול או הקטן ביותר', step: 'הוספה והחסרה של אלפים, עשרות אלפים ומאות אלפים',
    cross: 'מעבר למיליון', read: 'כתיבת מספר בספרות מתוך קריאתו', thousands: 'ספירת האלפים שבתוך מספר',
    'asPlain:+': 'חיבור בעמודות', 'asPlain:-': 'חיסור בעמודות (כולל פריטה)', asPlain: 'חיבור וחיסור בעמודות', asMissing: 'מציאת מחובר חסר',
    'asWord:+': 'בעיות מילוליות של חיבור', 'asWord:-': 'בעיות מילוליות של חיסור', asWord: 'בעיות מילוליות', asTwoStep: 'בעיות מילוליות בשני שלבים',
    fracBar: 'זיהוי שבר מתוך ציור', fracFood: 'שבר מתוך סיפור', fracTerm: 'מונה ומכנה',
    'fracCompare:unit': 'השוואת שברי יחידה', 'fracCompare:sameDen': 'השוואת שברים עם אותו מכנה', 'fracCompare:sameNum': 'השוואת שברים עם אותו מונה', fracCompare: 'השוואת שברים',
    fracWhole: 'כמה חלקים יש בשלם', fracComplete: 'השלמת שבר לשלם', fracUnitOf: 'שבר יחידה של כמות', fracKOf: 'שבר של כמות',
    fracWholeFromPart: 'מציאת השלם מתוך חלק', fracLeft: 'חיבור וחיסור שברים עם אותו מכנה',
    mulMeaning: 'משמעות הכפל', divMeaning: 'משמעות החילוק', table: 'לוח הכפל', mulPow: 'כפל ב-10, ב-100 וב-1,000', mulTens: 'כפל בעשרות שלמות',
    divPow: 'חילוק ב-10, ב-100 וב-1,000', mulMissing: 'מציאת גורם חסר', divOne: 'חילוק במחלק חד-ספרתי', mulTwoOne: 'כפל מספר דו-ספרתי במספר חד-ספרתי',
    remainder: 'חילוק עם שארית', wordMul: 'בעיות מילוליות של כפל', wordDiv: 'בעיות מילוליות של חילוק', wordPack: 'בעיות אריזה (חילוק)',
    polySides: 'ספירת צלעות וקדקודים בציור', polyFacts: 'ספירת צלעות וקדקודים לפי שם המצולע', polyName: 'שמות מצולעים',
    def_par: 'הגדרת צלעות מקבילות', def_perp: 'הגדרת צלעות מאונכות', def_diag: 'הגדרת אלכסון', parPairs: 'זוגות צלעות מקבילות בצורות',
    rightAngles: 'זוויות ישרות בצורות', whichShape: 'זיהוי צורה לפי תכונות', diagTotal: 'ספירת אלכסונים במצולע', diagVertex: 'אלכסונים היוצאים מקדקוד אחד',
    mul: 'כפל', div: 'חילוק', miss: 'מספר חסר',
  };

  const TIPS = {
    digitValue: 'לרשום את המספר בטבלת מקומות (יחידות, עשרות, מאות, אלפים…) ולראות באיזה מקום עומדת הספרה.',
    expanded: 'לפרק לפי מקומות: מאות אלפים, עשרות אלפים, אלפים, מאות, עשרות, יחידות. מקום ריק מסומן באפס.',
    missingPart: 'לפרק את המספר לפי מקומות ולהשוות לאיברים שכבר כתובים — מה שחסר הוא התשובה.',
    compare: 'להשוות משמאל לימין: קודם הספרה הגדולה ביותר, ורק אם היא שווה עוברים לספרה הבאה.',
    extreme: 'להשוות את המספרים ספרה אחרי ספרה, מהמקום הגבוה ביותר.',
    step: 'לזהות איזו ספרה משתנה: הוספת 10,000 משנה את ספרת עשרות האלפים, והוספת 100,000 את ספרת מאות האלפים.',
    cross: 'לתרגל את המעבר: 999 ועוד 1 הוא 1,000, ו-999,999 ועוד 1 הוא מיליון.',
    read: 'לכתוב בשלוש קבוצות: מיליונים | אלפים | יחידות. כשחסרות ספרות משלימים באפסים (27 נכתב 027).',
    thousands: 'אלף הוא 1,000. כדי לדעת כמה אלפים יש במספר מחלקים אותו ב-1,000.',
    'asPlain:+': 'חיבור בעמודות: מתחילים מהיחידות, וכשהסכום עובר 9 רושמים "נשארת" מעל העמודה הבאה.',
    'asPlain:-': 'חיסור בעמודות: כשהספרה העליונה קטנה "פורקים" עשרת מהעמודה השמאלית. אפשר לבדוק בחיבור חזרה.',
    asPlain: 'לכתוב בעמודות, לפעול מהיחידות, ולבדוק בפעולה ההפוכה.',
    asMissing: 'מחובר חסר: מחסרים את המחובר הידוע מהסכום, ובודקים בחיבור.',
    asWord: 'בבעיה מילולית: לסמן מה ידוע ומה שואלים, להחליט אם מוסיפים או מחסרים, ולבדוק שהתשובה הגיונית.',
    asTwoStep: 'בבעיה בשני שלבים: לפתור שלב אחרי שלב ולרשום תוצאת ביניים.',
    fracBar: 'לספור את כל החלקים השווים (המכנה) ואת החלקים הצבועים (המונה).',
    fracFood: 'לזהות לכמה חלקים שווים חילקו ואיזה חלק מהם נאכל או נשאר.',
    fracTerm: 'מונה: כמה חלקים לוקחים. מכנה: לכמה חלקים שווים חילקו את השלם.',
    fracCompare: 'באותו מכנה — המונה הגדול יותר נותן שבר גדול יותר. באותו מונה — דווקא המכנה הקטן יותר נותן שבר גדול יותר.',
    fracWhole: 'שלם הוא כל החלקים יחד: כמה חלקים של 1/n יש בשלם? n.',
    fracComplete: 'שלם הוא n/n. מה שחסר להשלמה הוא המכנה פחות המונה.',
    fracUnitOf: 'שבר יחידה של כמות: מחלקים את הכמות במכנה.',
    fracKOf: 'שבר של כמות: מחלקים במכנה כדי למצוא חלק אחד, ואז כופלים במונה.',
    fracWholeFromPart: 'אם ידוע כמה שווים k חלקים — מחלקים ב-k כדי למצוא חלק אחד, ואז כופלים במכנה.',
    fracLeft: 'לחבר את החלקים שנאכלו ואז לחסר מהשלם.',
    mulMeaning: 'כפל הוא קבוצות שוות: 4 × 6 הם 4 קבוצות של 6.',
    divMeaning: 'חילוק הוא חלוקה שווה: כמה בכל קבוצה, או כמה קבוצות יוצאות.',
    table: 'לתרגל בעל פה את השורות החלשות בלוח הכפל (למשל 6, 7 ו-8) עם קפיצות.',
    mulPow: 'כפל ב-10, ב-100 וב-1,000: מוסיפים אפס, שני אפסים או שלושה אפסים.',
    mulTens: 'לכפול את הספרות ואז להוסיף אפס: 30 × 4 זה 3 × 4 ועוד אפס.',
    divPow: 'חילוק ב-10, ב-100 וב-1,000: מורידים אפס, שני אפסים או שלושה אפסים.',
    mulMissing: 'גורם חסר: מחלקים את המכפלה בגורם הידוע.',
    divOne: 'חילוק מספר גדול במחלק חד-ספרתי: מחלקים ספרה אחרי ספרה, ובודקים בכפל חזרה.',
    mulTwoOne: 'לפרק את המספר הדו-ספרתי לעשרות ויחידות, לכפול כל חלק ולחבר.',
    remainder: 'שארית: מוצאים את הכפולה הגדולה ביותר שלא עוברת את המספר, והשארית היא ההפרש.',
    wordMul: 'בעיה מילולית של כפל: לזהות כמה קבוצות ומה גודל כל קבוצה.',
    wordDiv: 'בעיה מילולית של חילוק: לזהות מה מחלקים ובין כמה.',
    wordPack: 'בבעיות אריזה: מחלקים את הכמות הכוללת בגודל האריזה.',
    polySides: 'לסמן כל צלע או קדקוד תוך כדי ספירה, כדי לא לספור פעמיים.',
    polyFacts: 'במצולע מספר הצלעות שווה למספר הקדקודים. שם המצולע מרמז על המספר (משושה — 6).',
    polyName: 'ללמוד את השמות לפי מספר הצלעות: 3 משולש, 4 מרובע, 5 מחומש, 6 משושה, 7 משובע, 8 מתומן.',
    def_par: 'מקבילות: צלעות שלעולם לא נפגשות והמרחק ביניהן קבוע.',
    def_perp: 'מאונכות: צלעות שנפגשות בזווית ישרה (90°).',
    def_diag: 'אלכסון מחבר שני קדקודים שאינם סמוכים. קטע בין קדקודים סמוכים הוא צלע.',
    parPairs: 'לצייר את הצורה ולסמן כל זוג צלעות מקבילות.',
    rightAngles: 'לצייר את הצורה ולסמן את הזוויות הישרות במשולש ישר זווית ובמלבן.',
    whichShape: 'לעבור על הצורות אחת אחת ולבדוק כל תכונה בציור.',
    diagTotal: 'מכל קדקוד יוצאים n−3 אלכסונים, וכל אלכסון נספר פעמיים: n × (n−3) ÷ 2.',
    diagVertex: 'מקדקוד אחד אין אלכסון אל עצמו ואל שני השכנים: n−3 אלכסונים.',
  };
  const TOPIC_TIP = {
    million: 'לתרגל קריאה וכתיבה של מספרים גדולים בעזרת טבלת מקומות.',
    addsub: 'לתרגל חיבור וחיסור בעמודות, ולבדוק כל תשובה בפעולה ההפוכה.',
    fractions: 'לצייר שברים כמלבן או כעיגול מחולק לחלקים שווים.',
    muldiv: 'לתרגל את לוח הכפל ואת הקשר בין כפל לחילוק.',
    geometry: 'לצייר צורות ולסמן צלעות מקבילות, זוויות ישרות ואלכסונים.',
    numline: 'לצייר ישר מספרים עם אפס באמצע ולזוז עליו בצעדים.', gematria: 'לחזור על ערכי האותיות: א–ט אחדות, י–צ עשרות, ק–ת מאות.',
    order: 'קודם סוגריים, אחר כך כפל וחילוק, ובסוף חיבור וחיסור.', divis: 'לחבר את הספרות ולבדוק אם הסכום מתחלק ב-3 או ב-9.',
    fracops: 'כשהמכנים שווים מחברים רק את המונים.', measure: 'היקף = סכום הצלעות; שטח = אורך × רוחב.',
    data: 'לבדוק בכמה עולה כל קו בציר לפני שקוראים עמודה.', shapes: 'לבדוק כל קו אפשרי: האם הוא מחלק את הצורה לשני חלקים זהים?',
  };

  // ---------- עזרים ----------
  const pct = x => Math.round(x * 100);
  const inT = id => 'ב' + SHORT[id].replace(/^ה/, ''); // "במיליון", "בשברים"
  const g = (gender, m, f) => (gender === 'f' ? f : m);
  const baseOf = s => String(s).split(':')[0];
  const skillLabel = s => LABEL[s] || LABEL[baseOf(s)] || s;
  const skillTip = s => TIPS[s] || TIPS[baseOf(s)] || null;
  function skillTopic(s) {
    const b = baseOf(s);
    for (const t of TOPIC_IDS) if (BY_TOPIC[t].includes(b)) return t;
    return null;
  }
  const dayShift = (day, delta) => {
    const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + delta);
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };

  // =====================================================================
  // פידבק לילד בסוף סבב — תמיד חיובי: קודם מה הצליח, ואז טיפ קונקרטי לשיפור
  // o: { topics: [{ id, n, ok, levelBefore, levelAfter, results: [{skill, ok}] }], prev: { topicId: {n, ok} } | null, seed }
  // =====================================================================
  function kidFeedback(o) {
    const topics = (o.topics || []).filter(t => t.n > 0);
    const tot = topics.reduce((a, t) => a + t.n, 0), ok = topics.reduce((a, t) => a + t.ok, 0);
    const r = tot ? ok / tot : 0;
    const v = Math.abs(o.seed || 0) % 3;
    const TITLES = r >= 0.9 ? ['מעולה! סבב מרשים', 'איזה סבב! כל הכבוד', 'עבודה מצוינת']
      : r >= 0.7 ? ['כל הכבוד על סבב טוב', 'סבב טוב מאוד', 'יפה מאוד, ממשיכים להתקדם']
      : r >= 0.5 ? ['סבב רציני, ויש בו הרבה דברים טובים', 'עבדת קשה, וכבר יש הצלחות', 'התקדמת היום וצברת ניסיון']
      : ['המשכת עד הסוף, וזה הכי חשוב', 'התחלה טובה, כל סבב בונה ביטחון', 'עשית צעד קדימה, ויש במה להמשיך'];
    const praise = [];
    topics.filter(t => t.levelAfter > t.levelBefore).forEach(t => praise.push(`עלית לרמה ${t.levelAfter} ${inT(t.id)} (${LEVEL_NAMES[t.levelAfter]})`));
    topics.filter(t => t.ok === t.n && t.n >= 3).forEach(t => praise.push(`${inT(t.id)} ענית נכון על כל ${t.n} השאלות`));
    topics.filter(t => t.ok < t.n && t.ok / t.n >= 0.8).forEach(t => praise.push(`${inT(t.id)} ענית נכון על ${t.ok} מתוך ${t.n}`));
    topics.forEach(t => {
      const p = o.prev && o.prev[t.id];
      if (p && p.n && t.ok / t.n - p.ok / p.n >= 0.2) praise.push(`השתפרת ${inT(t.id)} לעומת הסבב הקודם`);
    });
    topics.forEach(t => {
      const bySkill = {};
      (t.results || []).forEach(x => { const s = bySkill[x.skill] || (bySkill[x.skill] = { n: 0, ok: 0 }); s.n++; if (x.ok) s.ok++; });
      Object.keys(bySkill).filter(k => bySkill[k].n >= 2 && bySkill[k].ok === bySkill[k].n).slice(0, 1)
        .forEach(k => praise.push(`פתרת נכון את כל התרגילים של ${skillLabel(k)}`));
    });
    if (!praise.length) praise.push(`סיימת את כל ${topics.length} הנושאים, וזה לא מובן מאליו`);

    const improve = [];
    topics.filter(t => t.ok < t.n).sort((a, b) => a.ok / a.n - b.ok / b.n).slice(0, 2).forEach(t => {
      const wrong = {};
      (t.results || []).filter(x => !x.ok).forEach(x => { wrong[x.skill] = (wrong[x.skill] || 0) + 1; });
      const top = Object.keys(wrong).sort((a, b) => wrong[b] - wrong[a])[0];
      if (top && skillTip(top)) improve.push(`${inT(t.id)} כדאי לחזק את ${skillLabel(top)}. ${skillTip(top)}`);
      else improve.push(`${inT(t.id)}: ${TOPIC_TIP[t.id]}`);
    });
    const closing = [];
    topics.filter(t => t.levelAfter < t.levelBefore).forEach(t => closing.push(`${inT(t.id)} נחזור לרמה ${t.levelAfter} כדי לבנות ביטחון, ומשם אפשר לעלות שוב.`));
    if (ok === tot && tot > 0) closing.push('בלי אף טעות. בסבב הבא מחכה אתגר גבוה יותר.');
    if (!closing.length) closing.push(['כל סבב עוזר להתקדם.', 'נתראה בסבב הבא!', 'אפשר להמשיך לסבב נוסף או לסיים להיום. כך או כך עשית עבודה טובה.'][v]);
    return { title: TITLES[v], praise: praise.slice(0, 3), improve, closing };
  }

  // =====================================================================
  // ניתוח להורה
  // profile: פרופיל מ-engine (או מסמך Firestore); o: { name, gender: 'm'|'f', today: 'YYYY-MM-DD' }
  // סטטוס לכל נושא: insufficient (<10 תשובות) | initial (10–24: מצב נוכחי בלבד) | improved | stable | declined
  // =====================================================================
  function analyzeKid(profile, o) {
    const name = o.name, gen = o.gender === 'f' ? 'f' : 'm', today = o.today;
    const stats = profile.stats || {}, levels = profile.levels || {}, hist = profile.hist || {}, baseline = profile.baseline || {}, skills = profile.skills || {}, days = profile.days || {};
    const start = profile.start || null;
    const N = TOPIC_IDS.reduce((a, t) => a + ((stats[t] && stats[t].answered) || 0), 0);
    const C = TOPIC_IDS.reduce((a, t) => a + ((stats[t] && stats[t].correct) || 0), 0);
    const activeDays = Object.keys(days).filter(d => days[d].answered > 0);
    const rounds = activeDays.reduce((a, d) => a + (days[d].rounds || 0), 0);
    const confidence = N < 60 ? 'low' : N < 200 ? 'medium' : 'high';

    const topics = TOPIC_IDS.map(t => {
      const ans = (stats[t] && stats[t].answered) || 0;
      const h = (hist[t] || '').slice(-15);
      const recN = h.length, recAcc = recN ? [...h].filter(c => c === '1').length / recN : null;
      const bl = baseline[t] || { n: 0, c: 0 };
      const baseAcc = bl.n >= 8 ? bl.c / bl.n : null;
      const lv = levels[t] != null ? levels[t] : 2, lv0 = start && start[t] != null ? start[t] : 2;
      const flag = recN >= 10 && lv >= 4 && recAcc >= 0.85 ? 'strong' : recN >= 10 && lv <= 2 && recAcc < 0.6 ? 'weak' : null;
      let status, text;
      if (ans < 10) {
        status = 'insufficient';
        text = `${inT(t)} יש עד כה ${ans} תשובות בלבד — עדיין אין מספיק נתונים להערכה.`;
      } else if (ans < 25 || baseAcc === null || recAcc === null) {
        status = 'initial';
        text = `${inT(t)}: ${pct(recAcc)}% נכונות ברמה ${lv} (${LEVEL_NAMES[lv]}), על סמך ${ans} תשובות. ההשוואה להתחלה תופיע אחרי כ-25 תשובות בנושא.`;
      } else {
        const dAcc = recAcc - baseAcc, dLv = lv - lv0;
        const line = `בהתחלה (10 התשובות הראשונות): ${pct(baseAcc)}% נכונות ברמה ${lv0}. כעת (15 התשובות האחרונות): ${pct(recAcc)}% נכונות ברמה ${lv}.`;
        if ((dLv >= 1 && recAcc >= 0.6) || (dAcc >= 0.15 && dLv >= 0)) {
          status = 'improved';
          text = `${name} ${g(gen, 'התקדם', 'התקדמה')} ${inT(t)}. ${line}` + (dLv >= 1 ? ' מכיוון שהתרגילים קשים יותר ככל שהרמה עולה, דיוק גבוה ברמה גבוהה יותר הוא שיפור של ממש.' : '');
        } else if (dLv <= -1 || (dAcc <= -0.15 && dLv <= 0)) {
          status = 'declined';
          text = `${inT(t)} נרשמה ירידה. ${line} כדאי לבדוק מה השתנה ולחזק את הנושא.`;
        } else {
          status = 'stable';
          text = `${inT(t)} אין שינוי משמעותי. ${line}` + (dLv >= 1 && recAcc < 0.6 ? ' הרמה עלתה, אך הדיוק ברמה החדשה עדיין נמוך — כדאי לתת זמן להתייצבות.' : flag === 'strong' ? ' היכולת בנושא טובה.' : flag === 'weak' ? ' זה נושא שעדיין דורש חיזוק.' : '');
        }
      }
      // מיומנויות חזקות וחלשות לפי 10 התשובות האחרונות בכל מיומנות
      const mine = Object.keys(skills).filter(k => skillTopic(k) === t).map(k => {
        const s = skills[k], r = s.r || '', rn = r.length, ra = rn ? [...r].filter(c => c === '1').length / rn : null;
        return { key: k, label: skillLabel(k), n: s.n, rn, ra };
      });
      const strengths = mine.filter(s => s.rn >= 6 && s.ra >= 0.9).sort((a, b) => b.n - a.n).slice(0, 2).map(s => `${s.label} (${pct(s.ra)}% ב-${s.rn} האחרונות)`);
      const weakSk = mine.filter(s => s.rn >= 5 && s.ra <= 0.6).sort((a, b) => a.ra - b.ra).slice(0, 2);
      const weaknesses = weakSk.map(s => `${s.label} (${pct(s.ra)}% ב-${s.rn} האחרונות)`);
      let tip = null;
      if (weakSk.length) tip = skillTip(weakSk[0].key);
      else if (status === 'declined' || flag === 'weak') tip = TOPIC_TIP[t];
      return { id: t, short: SHORT[t], status, flag, level: lv, startLevel: lv0, recentAcc: recAcc, baseAcc, answered: ans, text, strengths, weaknesses, tip };
    });

    // השוואה שבועית
    const sum = (from, to) => {
      let n = 0, c = 0;
      for (let i = from; i <= to; i++) { const d = days[dayShift(today, -i)]; if (d) { n += d.answered; c += d.correct; } }
      return { n, c, acc: n ? c / n : null };
    };
    const w1 = sum(0, 6), w0 = sum(7, 13);
    let weekly = null;
    if (w1.n >= 20 && w0.n >= 20) {
      const d = w1.acc - w0.acc;
      weekly = { thisWeek: w1, prevWeek: w0, trend: d >= 0.05 ? 'up' : d <= -0.05 ? 'down' : 'flat',
        text: `ב-7 הימים האחרונים: ${pct(w1.acc)}% נכונות (${w1.n} תשובות), לעומת ${pct(w0.acc)}% בשבוע שלפניו (${w0.n} תשובות).` };
    }

    // סיכום
    const by = s => topics.filter(t => t.status === s).map(t => t.short);
    const imp = by('improved'), stb = by('stable'), dec = by('declined');
    const cmp = imp.length + stb.length + dec.length;
    const paras = [];
    paras.push(N
      ? `${name} ${g(gen, 'תרגל', 'תרגלה')} ב-${activeDays.length} ${activeDays.length === 1 ? 'יום' : 'ימים'}${rounds ? `, ${rounds} ${rounds === 1 ? 'סבב' : 'סבבים'}` : ''}, עם ${N} תשובות סך הכול ו-${pct(C / N)}% נכונות.`
      : `${name} עדיין לא התחיל${g(gen, '', 'ה')} לתרגל.`);
    if (cmp) {
      const parts = [];
      if (imp.length) parts.push(`שיפור ב: ${imp.join(', ')}`);
      if (stb.length) parts.push(`ללא שינוי משמעותי ב: ${stb.join(', ')}`);
      if (dec.length) parts.push(`ירידה ב: ${dec.join(', ')}`);
      paras.push(`בהשוואה בין ההתחלה למצב הנוכחי (מתוך ${cmp} נושאים שאפשר כבר להשוות): ${parts.join('. ')}.`);
    } else if (N) {
      paras.push('עדיין אין מספיק תרגול כדי להשוות בין ההתחלה למצב הנוכחי. ההשוואה בכל נושא תופיע אחרי כ-25 תשובות בנושא (בערך 5 עד 6 סבבים).');
    }
    const strong = topics.filter(t => t.flag === 'strong').map(t => t.short), weak = topics.filter(t => t.flag === 'weak').map(t => t.short);
    if (strong.length) paras.push(`נושאים ש${g(gen, 'הוא שולט', 'היא שולטת')} בהם היטב: ${strong.join(', ')}.`);
    if (weak.length) paras.push(`נושאים שדורשים חיזוק: ${weak.join(', ')}.`);
    if (N) paras.push(confidence === 'low' ? 'זו תמונה ראשונית. ככל שיצטברו עוד ימי תרגול הניתוח יהיה מדויק יותר, ויתווספו השוואה להתחלה וזיהוי של מיומנויות חזקות וחלשות.'
      : confidence === 'medium' ? 'הניתוח מבוסס על תרגול של כמה ימים, והמגמות עדיין עשויות להשתנות.'
      : 'הניתוח מבוסס על כמות משמעותית של תשובות.');
    return { name, gender: gen, total: N, correct: C, activeDays: activeDays.length, rounds, confidence, paragraphs: paras, topics, weekly, counts: { improved: imp.length, stable: stb.length, declined: dec.length } };
  }


  // =====================================================================
  // לוח הכפל (תוכנית "times"): פידבק לילד וניתוח להורה
  // =====================================================================
  const T = (typeof module === 'object' && module.exports) ? require('./times.js') : (typeof self !== 'undefined' ? self : globalThis).TimesEngine;
  const hardFact = (a, b) => Math.min(a, b) >= 6 && Math.max(a, b) >= 7 && Math.max(a, b) <= 9; // 6×7, 7×8, 8×9 ...
  const factText = (a, b) => `${a} × ${b} = ${a * b}`;

  // o: { n, ok, levelBefore, levelAfter, results: [{ gen, a, b, ok }], prev: {n, ok} | null, seed }
  function timesFeedback(o) {
    const n = o.n, ok = o.ok, r = n ? ok / n : 0, v = Math.abs(o.seed || 0) % 3, res = o.results || [];
    const TITLES = r >= 0.9 ? ['מעולה! כמעט בלי טעויות', 'איזה תרגול! כל הכבוד', 'עבודה מצוינת בלוח הכפל']
      : r >= 0.7 ? ['כל הכבוד על תרגול טוב', 'יפה מאוד, ממשיכים להתקדם', 'תרגול טוב בלוח הכפל']
      : r >= 0.5 ? ['תרגול רציני, ויש בו הרבה הצלחות', 'עבדת קשה, וכבר רואים הצלחות', 'התקדמת וצברת ניסיון']
      : ['סיימת את כל התרגילים, וזה הכי חשוב', 'התחלה טובה, כל פעם זה נהיה קל יותר', 'עשית צעד קדימה, ויש במה להמשיך'];
    const praise = [];
    if (o.levelAfter > o.levelBefore) {
      let t = `עלית לרמה ${o.levelAfter} (${LEVEL_NAMES[o.levelAfter]})`;
      if (o.levelAfter >= T.DIVISION_FROM && o.levelBefore < T.DIVISION_FROM) t += '. מעכשיו יופיעו גם שאלות חילוק, כי חילוק הוא ההפך מכפל';
      else if (o.levelAfter === 5 && o.levelBefore < 5) t += '. מעכשיו יופיעו גם תרגילים עם מספר חסר';
      praise.push(t);
    }
    if (ok === n && n > 0) praise.push(`ענית נכון על כל ${n} התרגילים`);
    else if (r >= 0.6) praise.push(`ענית נכון על ${ok} מתוך ${n}`);
    let run = 0, best = 0; res.forEach(x => { run = x.ok ? run + 1 : 0; best = Math.max(best, run); });
    if (best >= 4 && ok < n) praise.push(`${best} תשובות נכונות ברצף`);
    const hard = res.find(x => x.ok && hardFact(x.a, x.b));
    if (hard) praise.push(`פתרת נכון תרגיל מהקשים: ${hard.gen === 'div' ? `${hard.a * hard.b} ÷ ${hard.a}` : `${hard.a} × ${hard.b}`}`);
    if (o.prev && o.prev.n && n && ok / n - o.prev.ok / o.prev.n >= 0.2) praise.push('השתפרת לעומת הפעם הקודמת');
    if (!praise.length) praise.push(`סיימת את כל ${n} השאלות, וזה לא מובן מאליו`);
    const improve = [], seen = new Set();
    res.filter(x => !x.ok).forEach(x => {
      const k = T.factKey(x.a, x.b); if (seen.has(k) || improve.length >= 3) return; seen.add(k);
      improve.push(x.gen === 'div'
        ? `${x.a * x.b} ÷ ${x.a} = ${x.b}, כי ${x.a} × ${x.b} = ${x.a * x.b}. ${T.strategy(x.a, x.b)}`
        : `${factText(x.a, x.b)}. ${T.strategy(x.a, x.b)}`);
    });
    const closing = [];
    if (o.levelAfter < o.levelBefore) closing.push(`נחזור לרמה ${o.levelAfter} כדי לבנות ביטחון, ומשם אפשר לעלות שוב.`);
    if (ok === n && n > 0) closing.push('בלי אף טעות. בפעם הבאה מחכה אתגר גבוה יותר.');
    if (!closing.length) closing.push(['כל תרגול עוזר לזכור את הטבלאות.', 'נתראה בתרגול הבא!', 'אפשר להמשיך עוד סבב או לסיים להיום. כך או כך עשית עבודה טובה.'][v]);
    return { title: TITLES[v], praise: praise.slice(0, 3), improve, closing };
  }

  function analyzeTimes(profile, o) {
    const name = o.name, gen = o.gender === 'f' ? 'f' : 'm', today = o.today;
    profile = T.ensureProfile(profile);
    const st = profile.stats.times, N = st.answered, C = st.correct, days = profile.days || {};
    const lv = profile.levels.times, lv0 = profile.start && profile.start.times != null ? profile.start.times : 1;
    const h = (profile.hist.times || '').slice(-15), recN = h.length, recAcc = recN ? [...h].filter(c => c === '1').length / recN : null;
    const bl = profile.baseline.times, baseAcc = bl.n >= 8 ? bl.c / bl.n : null;
    const activeDays = Object.keys(days).filter(d => days[d].answered > 0);
    const sessions = activeDays.reduce((a, d) => a + (days[d].rounds || 0), 0);
    const confidence = N < 30 ? 'low' : N < 100 ? 'medium' : 'high';
    let status, text;
    if (N < 10) { status = 'insufficient'; text = `בלוח הכפל יש עד כה ${N} תשובות בלבד, ועדיין אין מספיק נתונים להערכה.`; }
    else if (N < 25 || baseAcc === null || recAcc === null) { status = 'initial'; text = `בלוח הכפל: ${pct(recAcc)}% נכונות ברמה ${lv} (${LEVEL_NAMES[lv]}), על סמך ${N} תשובות. ההשוואה להתחלה תופיע אחרי כ-25 תשובות.`; }
    else {
      const dAcc = recAcc - baseAcc, dLv = lv - lv0;
      const line = `בהתחלה (10 התשובות הראשונות): ${pct(baseAcc)}% נכונות ברמה ${lv0}. כעת (15 התשובות האחרונות): ${pct(recAcc)}% נכונות ברמה ${lv}.`;
      if ((dLv >= 1 && recAcc >= 0.6) || (dAcc >= 0.15 && dLv >= 0)) { status = 'improved'; text = `${name} ${g(gen, 'התקדם', 'התקדמה')} בלוח הכפל. ${line}` + (dLv >= 1 ? ' הרמה עלתה והתרגילים קשים יותר, ולכן דיוק גבוה ברמה גבוהה יותר הוא שיפור של ממש.' : ''); }
      else if (dLv <= -1 || (dAcc <= -0.15 && dLv <= 0)) { status = 'declined'; text = `בלוח הכפל נרשמה ירידה. ${line} כדאי לחזור על הטבלאות החלשות.`; }
      else { status = 'stable'; text = `בלוח הכפל אין שינוי משמעותי. ${line}` + (dLv >= 1 && recAcc < 0.6 ? ' הרמה עלתה, אך הדיוק ברמה החדשה עדיין נמוך, ולכן כדאי לתת זמן להתייצבות.' : ''); }
    }
    const typeStat = k => { const s = profile.skills[k], r = s ? s.r : ''; return { key: k, n: s ? s.n : 0, rn: r.length, acc: r.length ? [...r].filter(c => c === '1').length / r.length : null }; };
    const byType = { mul: typeStat('mul'), div: typeStat('div'), miss: typeStat('miss') };
    const tables = T.tableStats(profile);
    const weakTables = tables.filter(t => t.n >= 6 && t.acc < 0.6).sort((a, b) => a.acc - b.acc).slice(0, 3);
    const strongTables = tables.filter(t => t.n >= 8 && t.acc >= 0.9).map(t => t.t);
    const weak = T.weakFacts(profile, 5).map(x => ({ key: x.key, text: factText(x.a, x.b), tip: T.strategy(x.a, x.b), tries: x.f.n, right: x.f.c }));
    const facts = T.allFacts(profile).map(x => ({ key: x.key, a: x.a, b: x.b, status: x.st }));
    const seenCount = facts.filter(f => f.status !== 'new').length, strongCount = facts.filter(f => f.status === 'strong').length;

    // השוואה שבועית
    const sum = (from, to) => { let n = 0, c = 0; for (let i = from; i <= to; i++) { const d = days[dayShift(today, -i)]; if (d) { n += d.answered; c += d.correct; } } return { n, c, acc: n ? c / n : null }; };
    const w1 = sum(0, 6), w0 = sum(7, 13); let weekly = null;
    if (w1.n >= 20 && w0.n >= 20) { const d = w1.acc - w0.acc; weekly = { trend: d >= 0.05 ? 'up' : d <= -0.05 ? 'down' : 'flat', text: `ב-7 הימים האחרונים: ${pct(w1.acc)}% נכונות (${w1.n} תשובות), לעומת ${pct(w0.acc)}% בשבוע שלפניו (${w0.n} תשובות).` }; }

    const paras = [];
    paras.push(N ? `${name} ${g(gen, 'תרגל', 'תרגלה')} את לוח הכפל ב-${activeDays.length} ${activeDays.length === 1 ? 'יום' : 'ימים'}${sessions ? `, ${sessions} ${sessions === 1 ? 'סבב' : 'סבבים'}` : ''}, עם ${N} תשובות ו-${pct(C / N)}% נכונות.` : `${name} עדיין לא ${g(gen, 'התחיל', 'התחילה')} לתרגל את לוח הכפל.`);
    if (N) {
      paras.push(`הרמה הנוכחית היא ${lv} מתוך 5 (${LEVEL_NAMES[lv]}): ${T.LEVEL_INFO[lv]}. ${lv >= T.DIVISION_FROM ? 'שאלות החילוק כבר נכללות בתרגול.' : 'שאלות חילוק יתווספו כשהרמה תגיע ל-4.'}`);
      paras.push(text);
      if (N >= 20) paras.push(`התרגילים שנבדקו עד כה: ${seenCount} מתוך ${facts.length} תרגילי לוח הכפל (בלי חשיבות לסדר הגורמים), ומתוכם ${strongCount} ${g(gen, 'הוא שולט', 'היא שולטת')} בהם היטב.`);
      if (byType.div.rn >= 5 && byType.div.acc !== null) paras.push(`בשאלות חילוק: ${pct(byType.div.acc)}% נכונות ב-${byType.div.rn} התשובות האחרונות, לעומת ${byType.mul.acc === null ? 'לא זמין' : pct(byType.mul.acc) + '%'} בכפל.`);
      paras.push(confidence === 'low' ? 'זו תמונה ראשונית. ככל שיצטברו עוד סבבי תרגול הניתוח יהיה מדויק יותר, ויתווספו השוואה להתחלה וזיהוי של תרגילים חלשים.' : confidence === 'medium' ? 'הניתוח מבוסס על תרגול של כמה ימים, והמגמות עדיין עשויות להשתנות.' : 'הניתוח מבוסס על כמות משמעותית של תשובות.');
    }
    // המלצות להמשך
    const rec = [];
    if (!N) rec.push('להתחיל בסבב קצר של 10 שאלות. אפשר לשלב אותו בכל יום ליד ההכנה למבדק.');
    else {
      const sinceLast = activeDays.length ? Math.round((new Date(today + 'T00:00:00') - new Date(activeDays.sort()[activeDays.length - 1] + 'T00:00:00')) / 864e5) : null;
      if (sinceLast !== null && sinceLast >= 2) rec.push(`לחזור לתרגול יומי קצר. עברו ${sinceLast} ימים מהתרגול האחרון.`);
      if (weak.length) rec.push(`לתרגל בעל פה ובשיחה ביתית את התרגילים: ${weak.map(w => w.text.split(' =')[0]).join(', ')}. מומלץ 5 דקות ביום, בשיטת החישוב שמוצגת לצד כל תרגיל.`);
      if (weakTables.length) rec.push(`${weakTables.length === 1 ? 'טבלה שדורשת חיזוק' : 'טבלאות שדורשות חיזוק'}: ${weakTables.map(t => `${t.t} (${pct(t.acc)}% נכונות)`).join(', ')}. כדאי לתרגל אותן בקפיצות (למשל ${weakTables[0].t}, ${weakTables[0].t * 2}, ${weakTables[0].t * 3}…).`);
      if (byType.div.rn >= 5 && byType.div.acc !== null && byType.mul.acc !== null && byType.div.acc < byType.mul.acc - 0.2) rec.push('בחילוק כדאי לחזור על הקשר לכפל: כדי לחשב 56 ÷ 7 שואלים "7 כפול כמה שווה 56?".');
      if (status === 'declined') rec.push('לבדוק אם משהו השתנה (עייפות, מהירות יתר) ולהוריד קצב לתרגול קצר ורגוע.');
      if (lv < T.DIVISION_FROM && recAcc !== null && recAcc >= 0.85) rec.push('הדיוק גבוה, וכנראה בקרוב תעלה הרמה וייווספו שאלות חילוק.');
      if (lv === 5 && recAcc !== null && recAcc >= 0.85) rec.push('השליטה גבוהה. אפשר להמשיך בתרגול קצר פעמיים בשבוע לשימור, ולהתמקד בהכנה למבדק.');
      if (!rec.length) rec.push('להמשיך בתרגול קבוע של 10 שאלות ביום. אין כרגע תרגיל או טבלה שבולטים כחלשים.');
    }
    return { name, gender: gen, total: N, correct: C, activeDays: activeDays.length, sessions, confidence, level: lv, startLevel: lv0, status, text, recentAcc: recAcc, baseAcc,
      paragraphs: paras, weakFacts: weak, weakTables, strongTables, facts, byType, recommendations: rec, weekly };
  }


  // ---------- זמני תשובה (להורה בלבד; הילד לא רואה שעון ולא מקבל פידבק על מהירות) ----------
  const fmtDur = ms => {
    const s = Math.round(ms / 1000);
    if (s < 60) return s + ' שנ׳';
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' דק׳';
  };
  const fmtAvg = ms => { const v = Math.round(ms / 100) / 10; return (Number.isInteger(v) ? v : v.toFixed(1)) + ' שנ׳'; };
  // days: {day:{ms,tn,answered,correct}}, stats: {topic:{ms,tn}}, rlog: [{d,n,ok,ms,lv}], facts: {key:{ms,t}}
  function analyzeTiming(o) {
    const days = o.days || {}, stats = o.stats || {}, rlog = (o.rlog || []).filter(r => r && r.n > 0 && r.ms > 0), facts = o.facts || {};
    let ms = 0, tn = 0;
    Object.keys(days).forEach(k => { if (days[k].tn) { ms += days[k].ms || 0; tn += days[k].tn; } });
    const out = { totalMs: ms, timed: tn, avgMs: tn ? ms / tn : null, lastRound: null, trend: null, trendText: '', slowFacts: [], byTopic: [], paragraphs: [] };
    if (!tn) return out;
    const lr = rlog[rlog.length - 1];
    if (lr) out.lastRound = { day: lr.d, n: lr.n, ok: lr.ok, ms: lr.ms, avgMs: lr.ms / lr.n };
    if (rlog.length >= 6) {
      const rec = rlog.slice(-3), prev = rlog.slice(-8, -3);
      const sum = a => a.reduce((x, r) => ({ ms: x.ms + r.ms, n: x.n + r.n, ok: x.ok + r.ok }), { ms: 0, n: 0, ok: 0 });
      const r = sum(rec), p = sum(prev), ra = r.ms / r.n, pa = p.ms / p.n, racc = r.ok / r.n, pacc = p.ok / p.n;
      out.trend = ra < pa * 0.85 ? 'faster' : ra > pa * 1.15 ? 'slower' : 'steady';
      const base = `בשלושת הסבבים האחרונים הממוצע לשאלה הוא ${fmtAvg(ra)}, לעומת ${fmtAvg(pa)} בסבבים שלפניהם`;
      const accNote = racc + 0.1 < pacc ? ' והדיוק ירד, ולכן כדאי להרגיע את הקצב ולתת תשובה בטוחה' : racc >= pacc - 0.05 ? ' והדיוק נשמר' : '';
      out.trendText = out.trend === 'faster' ? `${base}: מהיר יותר${accNote}.` : out.trend === 'slower' ? `${base}: איטי יותר${accNote}. זה טבעי כשהרמה עולה או כשתרגילים חדשים מופיעים.` : `${base}: קצב יציב${accNote}.`;
    }
    Object.keys(facts).forEach(k => {
      const f = facts[k];
      if (f && f.t >= 2 && f.ms > 0) { const [a, b] = k.split('x'); out.slowFacts.push({ key: k, text: `${a} × ${b}`, avgMs: f.ms / f.t, tries: f.t }); }
    });
    const typ = out.avgMs;
    out.slowFacts = out.slowFacts.filter(f => f.avgMs >= Math.max(typ * 1.4, 4000)).sort((x, y) => y.avgMs - x.avgMs).slice(0, 5);
    Object.keys(stats).forEach(id => {
      const t = stats[id];
      if (t && t.tn >= 5 && t.ms > 0) out.byTopic.push({ id, short: SHORT[id] || id, avgMs: t.ms / t.tn, n: t.tn });
    });
    if (out.lastRound) out.paragraphs.push(`בסבב האחרון: ${out.lastRound.ok} מתוך ${out.lastRound.n} תוך ${fmtDur(out.lastRound.ms)}, ממוצע ${fmtAvg(out.lastRound.avgMs)} לשאלה.`);
    out.paragraphs.push(`בכל התרגול שנמדד (${tn} שאלות): ממוצע ${fmtAvg(out.avgMs)} לשאלה.`);
    if (out.trendText) out.paragraphs.push(out.trendText);
    return out;
  }

  return { fmtDur, fmtAvg, analyzeTiming, SHORT, LEVEL_NAMES, LABEL, TIPS, BY_TOPIC, skillLabel, skillTip, skillTopic, kidFeedback, analyzeKid, timesFeedback, analyzeTimes };
});
