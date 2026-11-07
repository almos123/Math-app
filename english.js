// english.js — לימוד אנגלית למתחילים (כיתה ד'): אותיות (שם, צליל, גדולה/קטנה, כתיבה), מילים (משמעות, שמיעה, קריאה, איות, דיבור).
// מודל שליטה לכל פריט (קופסאות 0–5), קצב שמתאים את עצמו לילד, ציון יכולת ודוח להורים.
// עובד בדפדפן (window.EnglishEngine) וב-Node (לבדיקות).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EnglishEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- אותיות ----------
  // name: איך מנוע הדיבור אומר את שם האות; he: שם האות בעברית; snd: הצליל; kw: מילת מפתח
  const LETTERS = [
    ['a', 'ay', 'אֵיי', 'אַ (כמו ב-apple)', 'apple'], ['b', 'bee', 'בִּי', 'בּ', 'ball'], ['c', 'see', 'סִי', 'ק (כמו ב-cat)', 'cat'],
    ['d', 'dee', 'דִּי', 'ד', 'dog'], ['e', 'ee', 'אִי', 'אֶ (כמו ב-egg)', 'egg'], ['f', 'eff', 'אֶף', 'פ (f)', 'fish'],
    ['g', 'gee', "גִ'י", 'ג (כמו ב-gift)', 'gift'], ['h', 'aitch', "אֵייץ'", 'ה', 'hat'], ['i', 'eye', 'אַיי', 'אִ (כמו ב-insect)', 'insect'],
    ['j', 'jay', "גֵ'יי", "ג' (כמו ב-juice)", 'juice'], ['k', 'kay', 'קֵיי', 'ק', 'key'], ['l', 'el', 'אֶל', 'ל', 'leg'],
    ['m', 'em', 'אֶם', 'מ', 'milk'], ['n', 'en', 'אֶן', 'נ', 'nose'], ['o', 'oh', 'אוֹ', 'אוֹ (כמו ב-octopus)', 'octopus'],
    ['p', 'pee', 'פִּי', 'פּ', 'pen'], ['q', 'cue', 'קְיוּ', 'קוּ (כמו ב-queen)', 'queen'], ['r', 'ar', 'אַר', 'ר', 'rain'],
    ['s', 'ess', 'אֶס', 'ס', 'sun'], ['t', 'tee', 'טִי', 'ט', 'tree'], ['u', 'you', 'יוּ', 'אַ (כמו ב-up)', 'up'],
    ['v', 'vee', 'וִי', 'ו (כמו ב-violin)', 'violin'], ['w', 'double you', 'דַּאבֶּל יוּ', 'וו (כמו ב-window)', 'window'], ['x', 'ex', 'אֶקְס', 'קס (כמו בסוף box)', 'box'],
    ['y', 'why', 'וַאי', 'י (כמו ב-yellow)', 'yellow'], ['z', 'zee', 'זִי', 'ז', 'zebra'],
  ].map(([l, name, he, snd, kw]) => ({ l, u: l.toUpperCase(), name, he, snd, kw }));
  const LET = Object.fromEntries(LETTERS.map(x => [x.l, x]));
  // סדר לימוד לפי צלילים (כך אפשר לקרוא מילים קצרות כבר אחרי הקבוצה הראשונה)
  const GROUPS = ['satpin', 'mdgock', 'eurhbf', 'ljvwyz', 'qx'];
  const CONFUSE = { b: 'dpq', d: 'bpq', p: 'qbd', q: 'pdb', m: 'nw', n: 'mhu', u: 'nv', w: 'mv', h: 'nk', i: 'lj', l: 'it', j: 'ig', f: 't', t: 'f', c: 'eo', e: 'ca', a: 'eo', o: 'ac', v: 'wy', y: 'vg', g: 'qy', s: 'z', z: 's', r: 'n', k: 'h', x: 'k' };
  const SAME_SOUND = { c: 'kq', k: 'cq', q: 'ck', s: 'c', j: 'g', g: 'j' }; // לא מציגים כמסיחים אותיות עם אותו צליל

  // ---------- מילים: לפי רשימת המילים של משרד החינוך (Lexical Pre-Band I & Band I, Elementary School, נובמבר 2020) ----------
  // band: PB = Pre-Band I (כיתה ג' ותחילת ד'), C1 = Band I Core I (כיתה ד' עד אמצע ה'), C2 = Band I Core II (אמצע ה' עד סוף ו'),
  // X = לא ברשימה (נשאר רק כמילת דוגמה לצליל של אות, או מגרסה קודמת). em: תמונה (null = מילה בלי תמונה ברורה, מתורגלת בטקסט)
  const THEMES = [
    { id: 'first', he: 'מילים ראשונות', icon: '⭐' }, { id: 'people', he: 'אנשים ומשפחה', icon: '👨‍👩‍👧' }, { id: 'actions', he: 'פעולות', icon: '🏃' },
    { id: 'talk', he: 'מילים לשיחה', icon: '💬' }, { id: 'colors', he: 'צבעים', icon: '🎨' }, { id: 'numbers', he: 'מספרים', icon: '🔢' },
    { id: 'animals', he: 'בעלי חיים', icon: '🐾' }, { id: 'food', he: 'אוכל', icon: '🍎' }, { id: 'body', he: 'הגוף', icon: '✋' },
    { id: 'home', he: 'בבית, בבית הספר ובחוץ', icon: '🏠' }, { id: 'nature', he: 'טבע וזמן', icon: '🌳' }, { id: 'describe', he: 'מילים שמתארות', icon: '✨' },
    { id: 'extra', he: 'עוד מילים', icon: '➕' },
  ];
  const W = (th, band, list) => list.map(([en, he, em]) => ({ id: en.replace(/[^a-z]/g, ''), en, he, em: em || null, th, band }));
  const WORDS = [].concat(
    // שלב 1–3: Pre-Band I
    W('first', 'PB', [['cat', 'חתול', '🐱'], ['dog', 'כלב', '🐶'], ['sun', 'שמש', '☀️'], ['hat', 'כובע', '🎩'], ['bag', 'תיק', '🎒'], ['pen', 'עט', '🖊️'], ['bed', 'מיטה', '🛏️'], ['bus', 'אוטובוס', '🚌'], ['box', 'קופסה', '📦'], ['egg', 'ביצה', '🥚'], ['milk', 'חלב', '🥛'], ['hand', 'יד', '✋'], ['gift', 'מתנה', '🎁'], ['pencil', 'עיפרון', '✏️'], ['desk', 'שולחן כתיבה', null], ['net', 'רשת', '🥅'], ['fan', 'מאוורר', '🪭'], ['pet', 'חיית מחמד', '🐾'], ['up', 'למעלה', '⬆️']]),
    W('people', 'PB', [['mom', 'אמא', '👩‍👧'], ['dad', 'אבא', '👨‍👦'], ['boy', 'ילד', '👦'], ['man', 'איש', '👨'], ['kid', 'ילד/ה (kid)', '🧒'], ['friend', 'חבר/ה', '🤝']]),
    W('actions', 'PB', [['run', 'לרוץ', '🏃'], ['swim', 'לשחות', '🏊'], ['sleep', 'לישון', '😴'], ['sit', 'לשבת', null], ['stand', 'לעמוד', '🧍'], ['talk', 'לדבר', '🗣️'], ['help', 'לעזור', null], ['go', 'ללכת / לנסוע', null], ['have', 'יש ל... (have)', null]]),
    W('talk', 'PB', [['yes', 'כן', '✅'], ['no', 'לא', '❌'], ['hello', 'שלום', '👋'], ['goodbye', 'להתראות', null], ['thank you', 'תודה', '🙏'], ['fine', 'בסדר', null]]),
    W('describe', 'PB', [['red', 'אדום', '🟥'], ['big', 'גדול', null], ['fast', 'מהיר', '🏎️'], ['hot', 'חם', '🥵'], ['sad', 'עצוב', '😢']]),
    W('numbers', 'PB', [['three', 'שלוש', '3️⃣'], ['six', 'שש', '6️⃣'], ['ten', 'עשר', '🔟']]),
    // שלב 4 והלאה: Band I Core I
    W('colors', 'C1', [['blue', 'כחול', '🟦'], ['green', 'ירוק', '🟩'], ['yellow', 'צהוב', '🟨'], ['black', 'שחור', '⬛'], ['white', 'לבן', '⬜'], ['orange', 'כתום', '🟧'], ['brown', 'חום', '🟫'], ['pink', 'ורוד', '🩷']]),
    W('numbers', 'C1', [['one', 'אחת', '1️⃣'], ['two', 'שתיים', '2️⃣'], ['four', 'ארבע', '4️⃣'], ['five', 'חמש', '5️⃣'], ['seven', 'שבע', '7️⃣'], ['eight', 'שמונה', '8️⃣'], ['nine', 'תשע', '9️⃣']]),
    W('animals', 'C1', [['fish', 'דג', '🐟'], ['bird', 'ציפור', '🐦'], ['horse', 'סוס', '🐴'], ['cow', 'פרה', '🐄'], ['monkey', 'קוף', '🐒'], ['sheep', 'כבשה', '🐑']]),
    W('food', 'C1', [['apple', 'תפוח', '🍎'], ['banana', 'בננה', '🍌'], ['bread', 'לחם', '🍞'], ['water', 'מים', '💧'], ['cake', 'עוגה', '🎂'], ['pizza', 'פיצה', '🍕'], ['juice', 'מיץ', '🧃'], ['chicken', 'עוף', '🍗'], ['rice', 'אורז', '🍚'], ['sandwich', 'כריך', '🥪'], ['chocolate', 'שוקולד', '🍫'], ['tea', 'תה', '🍵'], ['coffee', 'קפה', '☕'], ['salad', 'סלט', '🥗'], ['meat', 'בשר', '🥩'], ['fruit', 'פרי', null], ['food', 'אוכל', '🍽️']]),
    W('people', 'C1', [['girl', 'ילדה', '👧'], ['woman', 'אישה', '👩'], ['sister', 'אחות', '👭'], ['brother', 'אח', '👬'], ['baby', 'תינוק', '👶'], ['grandmother', 'סבתא', '👵'], ['grandfather', 'סבא', '👴'], ['family', 'משפחה', '👨‍👩‍👧‍👦'], ['teacher', 'מורה', '🧑‍🏫']]),
    W('body', 'C1', [['eye', 'עין', '👁️'], ['ear', 'אוזן', '👂'], ['nose', 'אף', '👃'], ['mouth', 'פה', '👄'], ['foot', 'כף רגל', '🦶'], ['leg', 'רגל', '🦵'], ['arm', 'זרוע', '💪'], ['finger', 'אצבע', '☝️'], ['head', 'ראש', null], ['face', 'פנים', null], ['hair', 'שיער', null]]),
    W('home', 'C1', [['house', 'בית', '🏠'], ['door', 'דלת', '🚪'], ['window', 'חלון', '🪟'], ['ball', 'כדור', '⚽'], ['car', 'מכונית', '🚗'], ['cup', 'כוס', null], ['book', 'ספר', '📖'], ['chair', 'כיסא', '🪑'], ['clock', 'שעון', '🕐'], ['table', 'שולחן', null], ['room', 'חדר', null], ['kitchen', 'מטבח', null], ['garden', 'גינה', null], ['park', 'פארק', '🏞️'], ['game', 'משחק', '🎮'], ['shoe', 'נעל', '👟'], ['dress', 'שמלה', '👗'], ['coat', 'מעיל', '🧥'], ['computer', 'מחשב', '💻'], ['picture', 'תמונה', '🖼️'], ['zoo', 'גן חיות', null]]),
    W('nature', 'C1', [['tree', 'עץ', '🌳'], ['flower', 'פרח', '🌸'], ['rain', 'גשם', '🌧️'], ['sea', 'ים', '🌊'], ['day', 'יום', null], ['night', 'לילה', '🌃'], ['morning', 'בוקר', '🌅']]),
    W('describe', 'C1', [['happy', 'שמח', '😀'], ['cold', 'קר', '🥶'], ['tired', 'עייף', '🥱'], ['small', 'קטן', null], ['new', 'חדש', null], ['old', 'ישן / זקן', null], ['good', 'טוב', null], ['slow', 'איטי', '🐢'], ['nice', 'נחמד', null]]),
    W('actions', 'C1', [['sing', 'לשיר', '🎤'], ['write', 'לכתוב', '✍️'], ['cook', 'לבשל', '🍳'], ['drink', 'לשתות', '🥤'], ['walk', 'ללכת ברגל', '🚶'], ['eat', 'לאכול', '😋'], ['play', 'לשחק', null], ['read', 'לקרוא', null], ['come', 'לבוא', null], ['see', 'לראות', null], ['look', 'להסתכל', '👀'], ['like', 'לאהוב / לחבב', '👍'], ['want', 'לרצות', null], ['listen', 'להקשיב', null], ['draw', 'לצייר', '🖍️'], ['wash', 'לרחוץ / לשטוף', '🧼'], ['fly', 'לעוף', null]]),
    W('talk', 'C1', [['please', 'בבקשה', null], ['sorry', 'סליחה / מצטער', null], ['birthday', 'יום הולדת', '🥳'], ['name', 'שם', '📛'], ['age', 'גיל', null]]),
    // Band I Core II
    W('animals', 'C2', [['rabbit', 'ארנב', '🐰'], ['elephant', 'פיל', '🐘'], ['mouse', 'עכבר', '🐭'], ['pig', 'חזיר', '🐷'], ['snake', 'נחש', '🐍']]),
    W('food', 'C2', [['tomato', 'עגבנייה', '🍅'], ['cheese', 'גבינה', '🧀'], ['candy', 'סוכרייה', '🍬']]),
    W('home', 'C2', [['phone', 'טלפון', '📱'], ['key', 'מפתח', '🔑'], ['umbrella', 'מטרייה', '☂️'], ['ruler', 'סרגל', '📏'], ['school', 'בית ספר', '🏫']]),
    W('body', 'C2', [['tooth', 'שן', '🦷']]),
    W('nature', 'C2', [['star', 'כוכב', '⭐'], ['snow', 'שלג', '❄️'], ['cloud', 'ענן', '☁️']]),
    W('actions', 'C2', [['dance', 'לרקוד', '💃']]),
    W('extra', 'C2', [['queen', 'מלכה', '👑']]),
    // לא ברשימה: מילות דוגמה לצליל של אות, ומילים מגרסה קודמת של האפליקציה (לא נכנסות לשלבי הלימוד)
    W('extra', 'X', [['insect', 'חרק', '🐛'], ['octopus', 'תמנון', '🐙'], ['violin', 'כינור', '🎻'], ['zebra', 'זברה', '🦓'], ['ant', 'נמלה', '🐜'], ['yo-yo', 'יו-יו', '🪀'],
      ['lion', 'אריה', '🦁'], ['frog', 'צפרדע', '🐸'], ['bear', 'דוב', '🐻'], ['duck', 'ברווז', '🦆'], ['hen', 'תרנגולת', '🐔'], ['fox', 'שועל', '🦊'], ['bee', 'דבורה', '🐝'],
      ['purple', 'סגול', '🟪'], ['lemon', 'לימון', '🍋'], ['carrot', 'גזר', '🥕'], ['grapes', 'ענבים', '🍇'], ['bike', 'אופניים', '🚲'], ['kite', 'עפיפון', '🪁'], ['scissors', 'מספריים', '✂️'],
      ['map', 'מפה', '🗺️'], ['angry', 'כועס', '😠'], ['moon', 'ירח', '🌙'], ['mother', 'אמא (mother)', null], ['father', 'אבא (father)', null]]),
  );
  const WD = Object.fromEntries(WORDS.map(w => [w.id, w]));
  // שלבי לימוד המילים: מ-Pre-Band I ל-Core I ואז Core II (בתוך שלב: לפי נושא)
  const STAGES = [
    { he: 'מילים ראשונות (Pre-Band I)', ids: ['cat', 'dog', 'sun', 'hat', 'bag', 'pen', 'bed', 'bus', 'box', 'egg', 'milk', 'hand', 'gift', 'pencil'] },
    { he: 'אנשים ומילים לשיחה (Pre-Band I)', ids: ['mom', 'dad', 'boy', 'man', 'kid', 'friend', 'yes', 'no', 'hello', 'goodbye', 'thankyou', 'fine', 'red', 'three', 'six', 'ten'] },
    { he: 'פעולות ותיאורים (Pre-Band I)', ids: ['run', 'swim', 'sleep', 'sit', 'stand', 'talk', 'help', 'go', 'have', 'big', 'fast', 'hot', 'sad', 'desk', 'net', 'fan', 'pet', 'up'] },
    { he: 'צבעים ומספרים (Core I)', ids: WORDS.filter(w => w.band === 'C1' && (w.th === 'colors' || w.th === 'numbers')).map(w => w.id) },
    { he: 'בעלי חיים ואוכל (Core I)', ids: WORDS.filter(w => w.band === 'C1' && (w.th === 'animals' || w.th === 'food')).map(w => w.id) },
    { he: 'משפחה והגוף (Core I)', ids: WORDS.filter(w => w.band === 'C1' && (w.th === 'people' || w.th === 'body')).map(w => w.id) },
    { he: 'בבית ובחוץ (Core I)', ids: WORDS.filter(w => w.band === 'C1' && w.th === 'home').map(w => w.id) },
    { he: 'טבע, תיאורים ושיחה (Core I)', ids: WORDS.filter(w => w.band === 'C1' && (w.th === 'nature' || w.th === 'describe' || w.th === 'talk')).map(w => w.id) },
    { he: 'פעולות (Core I)', ids: WORDS.filter(w => w.band === 'C1' && w.th === 'actions').map(w => w.id) },
    { he: 'מילים מתקדמות (Core II)', ids: WORDS.filter(w => w.band === 'C2').map(w => w.id) },
  ];
  const BAND_HE = { PB: 'Pre-Band I', C1: 'Band I · Core I', C2: 'Band I · Core II', X: 'מחוץ לרשימה' };
  // מילים שהצליל הראשון שלהן לא "רגיל" לאות (לא מתאימות לשאלות צליל פותח)
  const NOT_FIRST = new Set(['write', 'one', 'eight', 'ear', 'eye', 'eat', 'age', 'arm', 'old', 'orange', 'three', 'thankyou', 'chair', 'cheese', 'chicken', 'chocolate', 'phone', 'school', 'scissors', 'sheep', 'shoe', 'yoyo', 'tooth', 'two', 'knee']);
  const firstSoundWords = l => WORDS.filter(w => w.em && w.band !== 'X' && w.en[0] === l && !NOT_FIRST.has(w.id) && /^[a-z]+$/.test(w.en));

  // משפטים לקריאה: k = מילים מהמאגר שצריך להכיר. מבנים מתוכנית 2020 לכיתה ד': to be, can, have, like, There is, This is
  const SENTENCES = [
    ['I see a cat.', '🐱', 'אני רואה חתול.', ['cat']], ['This is my dog.', '🐶', 'זה הכלב שלי.', ['dog']], ['The sun is hot.', '☀️', 'השמש חמה.', ['sun', 'hot']],
    ['I like pizza.', '🍕', 'אני אוהב/ת פיצה.', ['pizza', 'like']], ['I have a ball.', '⚽', 'יש לי כדור.', ['ball', 'have']], ['The fish can swim.', '🐟', 'הדג יודע לשחות.', ['fish', 'swim']],
    ['My mom is happy.', '👩😀', 'אמא שלי שמחה.', ['mom', 'happy']], ['I can run.', '🏃', 'אני יכול/ה לרוץ.', ['run']], ['The apple is red.', '🍎', 'התפוח אדום.', ['apple', 'red']],
    ['There is a hat on the bed.', '🎩🛏️', 'יש כובע על המיטה.', ['hat', 'bed']], ['I have two books.', '📚', 'יש לי שני ספרים.', ['two', 'book', 'have']], ['This is a pen.', '🖊️', 'זה עט.', ['pen']],
    ['The bird can fly.', '🐦', 'הציפור יכולה לעוף.', ['bird', 'fly']], ['I drink milk.', '🥛', 'אני שותה חלב.', ['drink', 'milk']], ['There are six eggs.', '🥚🥚🥚🥚🥚🥚', 'יש שש ביצים.', ['six', 'egg']],
    ['I sleep in my bed.', '🛏️', 'אני ישן/ה במיטה שלי.', ['sleep', 'bed']], ['The cat is sad.', '😿', 'החתול עצוב.', ['cat', 'sad']], ['I see three stars.', '⭐⭐⭐', 'אני רואה שלושה כוכבים.', ['three', 'star']],
    ['I have a bag.', '🎒', 'יש לי תיק.', ['bag', 'have']], ['The tree is green.', '🌳', 'העץ ירוק.', ['tree', 'green']], ['It is cold.', '🥶', 'קר.', ['cold']],
    ['It is hot.', '🥵', 'חם.', ['hot']], ['I eat a banana.', '🍌', 'אני אוכל/ת בננה.', ['banana', 'eat']], ['The dog is big.', '🐕', 'הכלב גדול.', ['dog', 'big']],
    ['I see a car.', '🚗', 'אני רואה מכונית.', ['car']], ['The baby is sleeping.', '👶😴', 'התינוק ישן.', ['baby', 'sleep']], ['I have one nose.', '👃', 'יש לי אף אחד.', ['one', 'nose']],
    ['Look at the rain.', '🌧️', 'תראו את הגשם.', ['rain', 'look']], ['My dad can cook.', '👨🍳', 'אבא שלי יודע לבשל.', ['dad', 'cook']], ['My friend is on the bus.', '🧑🚌', 'החבר שלי באוטובוס.', ['friend', 'bus']],
  ].map(([en, em, he, k], i) => ({ id: 's' + (i + 1), en, em, he, k }));
  const SD = Object.fromEntries(SENTENCES.map(s => [s.id, s]));

  // ---------- צלילים וחרוזים (Pre-Foundation: phonemic awareness, CVC) ----------
  const RHYMES = [['cat', 'hat'], ['pen', 'ten'], ['bed', 'red'], ['sun', 'run'], ['net', 'pet'], ['fan', 'man'], ['dad', 'sad'], ['box', 'fox'], ['dog', 'frog']];
  const CVC = ['cat', 'hat', 'bag', 'fan', 'man', 'dad', 'sad', 'pen', 'ten', 'bed', 'net', 'pet', 'red', 'six', 'kid', 'box', 'hot', 'dog', 'sun', 'run', 'bus', 'map', 'pig', 'hen', 'fox'];
  // ---------- ביטויים לשיחה (מתוך "Conversational Phrases and Chunks" בתוכנית Pre-Foundation) ----------
  const CHUNKS = [
    ['Hello!', 'שלום!', 'Hello!'], ['Good morning!', 'בוקר טוב!', 'Good morning!'], ['Goodbye!', 'להתראות!', 'Goodbye!'], ['Good night!', 'לילה טוב!', 'Good night!'],
    ["What's your name?", 'מה שמך?', 'My name is Dana.'], ['How are you?', 'מה שלומך?', "I'm fine, thank you."], ['How old are you?', 'בן/בת כמה את/ה?', 'I am ten years old.'],
    ['Thank you!', 'תודה!', "You're welcome!"], ['Where do you live?', 'איפה את/ה גר/ה?', 'I live in Israel.'], ['What is this?', 'מה זה?', 'This is a book.'],
    ['What color is it?', 'איזה צבע זה?', 'It is red.'], ['Do you like pizza?', 'את/ה אוהב/ת פיצה?', 'Yes, I do!'], ['What time is it?', 'מה השעה?', "It's three o'clock."],
    ["What's the weather today?", 'מה מזג האוויר היום?', "It's hot today."], ['Happy birthday!', 'יום הולדת שמח!', 'Thank you!'], ["I'm sorry.", 'אני מצטער/ת.', 'No problem!'],
    ['Excuse me, please.', 'סליחה (כשפונים למישהו).', null], ['Well done!', 'כל הכבוד!', null], ['Sit down, please.', 'שבו בבקשה.', null], ['Stand up, please.', 'קומו בבקשה.', null],
    ['Be quiet, please!', 'שקט בבקשה!', null], ['Are you ready?', 'את/ה מוכן/ה?', "I'm ready!"], ['What do you see?', 'מה את/ה רואה?', 'I see a cat.'], ['Good luck!', 'בהצלחה!', 'Thank you!'],
    ['Who is this?', 'מי זה?', 'This is my mom.'], ["Let's play a game!", 'בואו נשחק משחק!', 'OK!'], ['How many?', 'כמה?', 'Three.'], ['Take care!', 'שמור/שמרי על עצמך!', 'You too!'],
  ].map(([en, he, reply], i) => ({ id: 'c' + (i + 1), en, he, reply }));
  const CD = Object.fromEntries(CHUNKS.map(c => [c.id, c]));

  // ---------- תחומים ונושאים ----------
  const AREAS = {
    lname: { title: 'שמות האותיות', icon: '🔤', target: 26, unit: 'אותיות' },
    lsound: { title: 'צלילי האותיות', icon: '🔊', target: 26, unit: 'אותיות' },
    lcase: { title: 'אותיות גדולות וקטנות', icon: '🅰️', target: 26, unit: 'זוגות' },
    wup: { title: 'כתיבת אותיות גדולות', icon: '✍️', target: 26, unit: 'אותיות' },
    wlo: { title: 'כתיבת אותיות קטנות', icon: '✏️', target: 26, unit: 'אותיות' },
    vocab: { title: 'אוצר מילים ומשמעות', icon: '🧩', target: 100, unit: 'מילים' },
    listen: { title: 'הבנת הנשמע', icon: '👂', target: 100, unit: 'מילים' },
    read: { title: 'קריאה', icon: '📖', target: 60, unit: 'מילים ומשפטים' },
    spell: { title: 'כתיבת מילים (איות)', icon: '📝', target: 50, unit: 'מילים' },
    speak: { title: 'דיבור והגייה', icon: '🗣️', target: 50, unit: 'אותיות ומילים' },
    phon: { title: 'צלילים וחרוזים', icon: '🎵', target: 40, unit: 'משימות צליל' },
    chunk: { title: 'שיחה: ביטויים ושאלות', icon: '💬', target: CHUNKS.length, unit: 'ביטויים' },
  };
  const GRADE4_WORDS = WORDS.filter(w => w.band === 'PB' || w.band === 'C1').length; // יעד אוצר המילים: כל מילות Pre-Band I ו-Core I שבמאגר
  AREAS.vocab.target = GRADE4_WORDS; AREAS.listen.target = WORDS.filter(w => (w.band === 'PB' || w.band === 'C1') && w.em).length;
  const AREA_IDS = Object.keys(AREAS);
  // curr: למה זה נדרש לפי תוכנית הלימודים (Curriculum 2020, Elementary; Pre-Foundation Can-Do Descriptors)
  const TOPICS = [
    { id: 'letters', title: 'אותיות: שמות וצלילים', icon: '🔤', areas: ['lname', 'lsound', 'lcase'], n: 10, color: 'violet', desc: 'איך קוראים לאות ואיזה צליל היא עושה',
      curr: 'Pre-A1: מזהים את כל האותיות, גדולות וקטנות ("Can recognize the letters of the alphabet in upper and lower case"), והקשר בין אות לצליל (grapheme–phoneme correspondences).' },
    { id: 'phonics', title: 'צלילים וחרוזים', icon: '🎵', areas: ['phon'], n: 8, color: 'blue', desc: 'חרוזים, הצליל באמצע והצליל בסוף',
      curr: 'Pre-Foundation: מודעות פונולוגית: חרוזים, צליל פותח, אמצעי וסופי, ומילים קצרות מסוג CVC (כמו cat, pen).' },
    { id: 'write', title: 'כותבים אותיות', icon: '✍️', areas: ['wup', 'wlo'], n: 6, color: 'pink', desc: 'אותיות גדולות וקטנות, באצבע על המסך',
      curr: 'Pre-A1: כתיבת האותיות הגדולות והקטנות בכתב דפוס, בגובה הנכון ועל קווי הכתיבה ("using correct heights and parts of the writing line").' },
    { id: 'words', title: 'מילים ומשמעות', icon: '🧩', areas: ['vocab', 'listen'], n: 10, color: 'teal', desc: 'מה המילה אומרת ואיך היא נשמעת',
      curr: 'אוצר מילים לפי רשימת משרד החינוך: קודם Pre-Band I (כיתה ג\' ותחילת ד\'), אחר כך Band I Core I (כיתה ד\' עד אמצע ה\').' },
    { id: 'talk', title: 'שיחה באנגלית', icon: '💬', areas: ['chunk'], n: 8, color: 'orange', desc: 'שלום, מה שלומך, מה שמך ועוד',
      curr: 'Social interaction: ביטויים ושאלות קצרים מתוך רשימת "Conversational Phrases and Chunks" של שלב Pre-Foundation.' },
    { id: 'speak', title: 'מדברים אנגלית', icon: '🗣️', areas: ['speak'], n: 6, color: 'orange', desc: 'אומרים אותיות ומילים בקול',
      curr: 'הגייה ודיבור: אומרים אותיות ומילים מהרשימה בקול ("Pronounces novel phonemes").' },
    { id: 'read', title: 'קוראים', icon: '📖', areas: ['read'], n: 8, color: 'blue', desc: 'קוראים מילים ומשפטים קצרים',
      curr: 'קריאה: מילים מהרשימה ומשפטים קצרים עם מבנים של כיתה ד\' (to be, can, have, There is/are).' },
    { id: 'spell', title: 'כותבים מילים', icon: '📝', areas: ['spell'], n: 5, color: 'green', desc: 'כותבים מילה אות אחרי אות',
      curr: 'איות: מילים קצרות (CVC) ומילים שנלמדו מהרשימה ("Spells CVC and CV words and the taught Band 1 words").' },
  ];
  const TOPIC = Object.fromEntries(TOPICS.map(t => [t.id, t]));
  const TARGET_MS = 8000;      // זמן יעד לתשובה בשאלת בחירה (פרמטר תכנון)
  const MIN_AREA = 8;          // תשובות אחרונות בתחום כדי שייכנס לציון
  const MASTER = 3;            // קופסה 3 ומעלה = שולט

  // ---------- פרופיל ----------
  function newProfile() {
    return { v: 2, start: null, lg: 1, wg: 1, wt: 1, intro: { L: '', W: [], C: [] }, st: {}, r: {}, tr: {}, days: {}, stats: {}, hw: {}, conf: {}, miss: {}, sp: { tries: 0, ok: 0, self: 0, na: 0 }, rlog: [] };
  }
  function ensureProfile(p) {
    const d = newProfile();
    p = p && typeof p === 'object' ? p : d;
    Object.keys(d).forEach(k => { if (p[k] === undefined || p[k] === null) p[k] = d[k]; });
    p.intro.L = p.intro.L || ''; p.intro.W = Array.isArray(p.intro.W) ? p.intro.W.filter(id => WD[id]) : []; p.intro.C = Array.isArray(p.intro.C) ? p.intro.C : [];
    if (p.wt > STAGES.length) p.wt = STAGES.length; // מעבר מגרסה עם נושאים אחרים
    AREA_IDS.forEach(a => { p.st[a] = p.st[a] || {}; });
    return p;
  }
  const rec = (p, area, item) => (p.st[area] && p.st[area][item]) || null;
  const box = (p, area, item) => { const r = rec(p, area, item); return r ? r[0] : 0; };
  const mastered = (p, area, item) => box(p, area, item) >= MASTER;
  const recentAcc = s => (s && s.length ? [...s].filter(c => c === '1').length / s.length : null);

  // ---------- התקדמות ונעילות ----------
  const activeLetters = n => GROUPS.slice(0, Math.max(1, Math.min(GROUPS.length, n))).join('');
  const STAGE_OF = {}; STAGES.forEach((s, i) => s.ids.forEach(id => { if (STAGE_OF[id] === undefined) STAGE_OF[id] = i; }));
  const activeWords = p => WORDS.filter(w => STAGE_OF[w.id] !== undefined && STAGE_OF[w.id] < p.wt);
  function countMastered(p, area, items) { return items.filter(it => mastered(p, area, it)).length; }
  function masteredList(p, area) { return Object.keys(p.st[area] || {}).filter(k => p.st[area][k][0] >= MASTER); }
  function locks(p) {
    const lettersM = masteredList(p, 'lname').length, vocabM = masteredList(p, 'vocab').length, wloM = masteredList(p, 'wlo').length;
    return {
      letters: null, write: null, words: null,
      phonics: p.intro.L.length >= 6 ? null : { need: `נפתח אחרי שלומדים 6 אותיות (עכשיו ${p.intro.L.length}).`, have: p.intro.L.length, of: 6 },
      talk: p.intro.W.length >= 6 ? null : { need: `נפתח אחרי שלומדים 6 מילים (עכשיו ${p.intro.W.length}).`, have: p.intro.W.length, of: 6 },
      speak: p.intro.L.length + p.intro.W.length >= 3 ? null : { need: 'נפתח אחרי שלומדים כמה אותיות או מילים (בנושא "אותיות" או "מילים").', have: p.intro.L.length + p.intro.W.length, of: 3 },
      read: lettersM >= 12 && vocabM >= 10 ? null : { need: `נפתח כששולטים ב-12 שמות של אותיות (עכשיו ${lettersM}) וב-10 מילים (עכשיו ${vocabM}).`, have: Math.min(lettersM, 12) + Math.min(vocabM, 10), of: 22 },
      spell: wloM >= 8 && vocabM >= 8 ? null : { need: `נפתח כשכותבים יפה 8 אותיות קטנות (עכשיו ${wloM}) ומכירים 8 מילים (עכשיו ${vocabM}).`, have: Math.min(wloM, 8) + Math.min(vocabM, 8), of: 16 },
    };
  }
  // פתיחת קבוצות חדשות כשהקודמות נשלטות
  function advance(p) {
    const ev = [];
    const act = activeLetters(p.lg);
    if (p.lg < GROUPS.length && [...act].every(l => p.intro.L.includes(l))) {
      const ok = [...act].filter(l => box(p, 'lname', l) >= MASTER && box(p, 'lsound', l) >= 2).length;
      if (ok >= act.length * 0.8) { p.lg++; ev.push({ type: 'letters', text: `נפתחו אותיות חדשות: ${GROUPS[p.lg - 1].split('').join(' ')}` }); }
    }
    const wact = activeLetters(p.wg);
    if (p.wg < GROUPS.length) {
      const items = [...wact].map(l => ['wup', l.toUpperCase()]).concat([...wact].map(l => ['wlo', l]));
      const ok = items.filter(([a, it]) => box(p, a, it) >= MASTER).length;
      if (ok >= items.length * 0.75) { p.wg++; ev.push({ type: 'write', text: `אפשר לכתוב אותיות חדשות: ${GROUPS[p.wg - 1].split('').join(' ')}` }); }
    }
    const aw = activeWords(p);
    if (p.wt < STAGES.length && aw.every(w => p.intro.W.includes(w.id))) {
      const ok = aw.filter(w => box(p, 'vocab', w.id) >= MASTER).length;
      if (ok >= aw.length * 0.7) { p.wt++; ev.push({ type: 'words', text: `נפתח שלב מילים חדש: ${STAGES[p.wt - 1].he}` }); }
    }
    return ev;
  }

  // ---------- קצב: כמה חדש היום ----------
  function pace(p, topicId) {
    const acc = recentAcc((p.tr || {})[topicId]), n = ((p.tr || {})[topicId] || '').length;
    if (n < 6) return { mode: 'start', acc };
    return { mode: acc >= 0.85 ? 'fast' : acc >= 0.65 ? 'steady' : 'reinforce', acc };
  }
  const PACE_TEXT = { start: 'מתחילים!', fast: 'הולך לך מצוין, היום יש יותר חדשים', steady: 'ממשיכים בקצב טוב', reinforce: 'היום מחזקים את מה שכבר למדנו' };

  // ---------- עזרי אקראיות ----------
  function shuffle(a, rng) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const pick = (a, rng) => a[Math.floor(rng() * a.length)];
  function weighted(items, wfn, rng) { const ws = items.map(wfn), tot = ws.reduce((a, b) => a + b, 0); let r = rng() * tot; for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; } return items[items.length - 1]; }
  const BOXW = [6, 5, 3, 1.3, 0.6, 0.3];
  function itemWeight(p, area, item) { const r = rec(p, area, item); if (!r) return 6; const w = BOXW[Math.min(5, r[0])]; return r[2] > r[1] ? w * 1.6 : w; }

  // ---------- מסיחים ----------
  function letterDistractors(l, n, rng, pool) {
    const ban = new Set([l].concat((SAME_SOUND[l] || '').split('')));
    const conf = (CONFUSE[l] || '').split('').filter(x => !ban.has(x));
    const rest = shuffle((pool || LETTERS.map(x => x.l)).filter(x => !ban.has(x) && !conf.includes(x)), rng);
    const out = []; for (const x of shuffle(conf, rng).slice(0, 2).concat(rest)) { if (out.length >= n) break; if (!out.includes(x)) out.push(x); }
    if (out.length < n) shuffle(LETTERS.map(x => x.l).filter(x => !ban.has(x) && !out.includes(x)), rng).slice(0, n - out.length).forEach(x => out.push(x));
    return out;
  }
  function wordDistractors(w, n, rng, p, needPic) {
    const known = new Set(p.intro.W);
    const okw = x => x.id !== w.id && x.he !== w.he && x.en !== w.en && (!needPic || (x.em && x.em !== w.em)) && x.band !== 'X';
    const sameTh = shuffle(WORDS.filter(x => okw(x) && x.th === w.th), rng);
    const knownOther = shuffle(WORDS.filter(x => okw(x) && known.has(x.id) && x.th !== w.th), rng);
    const out = [];
    for (const x of sameTh.slice(0, 2).concat(knownOther, sameTh.slice(2), shuffle(WORDS.filter(okw), rng))) { if (out.length >= n) break; if (!out.find(o => o.id === x.id || (needPic && o.em === x.em) || o.he === x.he)) out.push(x); }
    return out;
  }

  // ---------- יצירת משימות ----------
  const L1 = l => LET[l];
  function mkLetterTask(kind, l, rng, p) {
    const L = L1(l);
    if (kind === 'L_hear') {
      const ch = shuffle([l].concat(letterDistractors(l, 3, rng)), rng);
      return { kind, area: 'lname', item: l, say: L.name, prompt: 'איזו אות שמעתם?', choices: ch.map(x => ({ v: x, label: L1(x).u + ' ' + x, en: true })), answer: l };
    }
    if (kind === 'L_name') {
      const ch = shuffle([l].concat(letterDistractors(l, 3, rng)), rng), showUp = rng() < 0.5;
      return { kind, area: 'lname', item: l, show: showUp ? L.u : l, prompt: 'איך קוראים לאות הזו?', choices: ch.map(x => ({ v: x, label: L1(x).he })), answer: l };
    }
    if (kind === 'L_case') {
      const toLower = rng() < 0.6, ch = shuffle([l].concat(letterDistractors(l, 3, rng)), rng);
      return { kind, area: 'lcase', item: l, show: toLower ? L.u : l, prompt: toLower ? 'מה האות הקטנה של האות הגדולה הזו?' : 'מה האות הגדולה של האות הקטנה הזו?', choices: ch.map(x => ({ v: x, label: toLower ? x : L1(x).u, en: true })), answer: l, toLower };
    }
    if (kind === 'L_first') {
      const words = l === 'x' ? [WD.box, WD.fox] : firstSoundWords(l);
      const w = words.length ? pick(words, rng) : WD[L.kw];
      const ch = shuffle([l].concat(letterDistractors(l, 3, rng)), rng);
      return { kind, area: 'lsound', item: l, word: w.id, em: w.em, say: w.en, prompt: l === 'x' ? 'איזו אות שומעים בסוף המילה?' : 'באיזו אות מתחילה המילה?', choices: ch.map(x => ({ v: x, label: x, en: true })), answer: l, end: l === 'x' };
    }
    if (kind === 'L_pic') {
      const words = l === 'x' ? [] : firstSoundWords(l);
      if (!words.length) return mkLetterTask('L_first', l, rng, p);
      const w = pick(words, rng);
      const ban = new Set([l].concat((SAME_SOUND[l] || '').split('')));
      const others = shuffle(WORDS.filter(x => x.em && x.band !== 'X' && !ban.has(x.en[0]) && /^[a-z]/.test(x.en) && x.em !== w.em), rng).slice(0, 2);
      const ch = shuffle([w].concat(others), rng);
      return { kind, area: 'lsound', item: l, show: L.u + l, prompt: `איזו מילה מתחילה בצליל של ${l}?`, choices: ch.map(x => ({ v: x.id, label: x.em, say: x.en, pic: true })), answer: w.id };
    }
    return null;
  }
  const PIC_KINDS = ['V_pic2word', 'H_word2pic', 'R_word2pic'];
  function mkWordTask(kind, id, rng, p) {
    const w = WD[id];
    if (PIC_KINDS.includes(kind) && !w.em) kind = kind === 'V_pic2word' ? 'V_he2word' : kind === 'H_word2pic' ? 'H_word2he' : 'R_word2he';
    const pic = PIC_KINDS.includes(kind), ds = wordDistractors(w, 3, rng, p, pic), all = shuffle([w].concat(ds), rng);
    if (kind === 'V_pic2word') return { kind, area: 'vocab', item: id, em: w.em, prompt: 'מה המילה באנגלית?', choices: all.map(x => ({ v: x.id, label: x.en, en: true })), answer: id };
    if (kind === 'V_word2he') return { kind, area: 'vocab', item: id, show: w.en, say: w.en, prompt: 'מה פירוש המילה?', choices: all.map(x => ({ v: x.id, label: x.he })), answer: id };
    if (kind === 'V_he2word') return { kind, area: 'vocab', item: id, showHe: w.he, prompt: 'איך אומרים באנגלית?', choices: all.map(x => ({ v: x.id, label: x.en, en: true })), answer: id };
    if (kind === 'H_word2pic') return { kind, area: 'listen', item: id, say: w.en, prompt: 'הקשיבו: איזו תמונה מתאימה למילה?', choices: all.map(x => ({ v: x.id, label: x.em, pic: true })), answer: id };
    if (kind === 'H_word2he') return { kind, area: 'listen', item: id, say: w.en, prompt: 'הקשיבו: מה פירוש המילה ששמעתם?', choices: all.map(x => ({ v: x.id, label: x.he })), answer: id };
    if (kind === 'R_word2pic') return { kind, area: 'read', item: 'W:' + id, show: w.en, prompt: 'קראו את המילה ובחרו תמונה', choices: all.map(x => ({ v: x.id, label: x.em, pic: true })), answer: id, noAudio: true };
    if (kind === 'R_word2he') return { kind, area: 'read', item: 'W:' + id, show: w.en, prompt: 'קראו את המילה ובחרו מה היא אומרת', choices: all.map(x => ({ v: x.id, label: x.he })), answer: id, noAudio: true };
    return null;
  }
  // ---------- צלילים וחרוזים ----------
  const ending = en => en.slice(-2);
  const VOWELS = ['a', 'e', 'i', 'o', 'u'];
  function mkPhonTask(kind, word, rng) {
    const w = WD[word];
    if (kind === 'F_rhyme') {
      const pair = RHYMES.find(r => r.includes(word)), partner = WD[pair[0] === word ? pair[1] : pair[0]];
      const others = shuffle(CVC.map(id => WD[id]).filter(x => x && x.em && ending(x.en) !== ending(w.en) && x.em !== w.em && x.em !== partner.em), rng).slice(0, 2);
      const ch = shuffle([partner].concat(others), rng);
      return { kind, area: 'phon', item: 'R:' + word, word, em: w.em, say: w.en, prompt: `איזו מילה מתחרזת עם ${w.en}?`, choices: ch.map(x => ({ v: x.id, label: x.em, say: x.en, pic: true })), answer: partner.id };
    }
    if (kind === 'F_mid') {
      const v = w.en[1], ch = shuffle([v].concat(shuffle(VOWELS.filter(x => x !== v), rng).slice(0, 2)), rng);
      return { kind, area: 'phon', item: 'M:' + word, word, em: w.em, say: w.en, pattern: `${w.en[0]} _ ${w.en[2]}`, prompt: 'איזה צליל שומעים באמצע המילה?', choices: ch.map(x => ({ v: x, label: x, en: true })), answer: v };
    }
    if (kind === 'F_end') {
      const l = w.en[w.en.length - 1], ch = shuffle([l].concat(letterDistractors(l, 3, rng)), rng);
      return { kind, area: 'phon', item: 'E:' + word, word, em: w.em, say: w.en, prompt: 'באיזו אות נגמרת המילה?', choices: ch.map(x => ({ v: x, label: x, en: true })), answer: l };
    }
    return null;
  }
  // ---------- שיחה ----------
  function mkChunkTask(kind, cid, rng) {
    const c = CD[cid];
    if (kind === 'K_reply' && c.reply) {
      const others = [];
      shuffle(CHUNKS.filter(x => x.id !== cid && x.reply && x.reply !== c.reply), rng).forEach(x => { if (others.length < 2 && !others.some(o => o.reply === x.reply)) others.push(x); });
      const all = shuffle([c].concat(others), rng);
      return { kind, area: 'chunk', item: 'K:' + cid, show: c.en, say: c.en, prompt: 'מה עונים?', choices: all.map(x => ({ v: x.id, label: x.reply, en: true })), answer: cid };
    }
    const others = shuffle(CHUNKS.filter(x => x.id !== cid && x.he !== c.he), rng).slice(0, 2), all = shuffle([c].concat(others), rng);
    return { kind: 'K_mean', area: 'chunk', item: 'K:' + cid, show: c.en, say: c.en, prompt: 'מה פירוש המשפט?', choices: all.map(x => ({ v: x.id, label: x.he })), answer: cid };
  }
  function mkSentenceTask(sid, rng) {
    const s = SD[sid], others = shuffle(SENTENCES.filter(x => x.id !== sid && x.em !== s.em), rng).slice(0, 2), all = shuffle([s].concat(others), rng);
    const pics = rng() < 0.6;
    return { kind: 'R_sent', area: 'read', item: 'S:' + sid, show: s.en, prompt: pics ? 'קראו את המשפט ובחרו תמונה' : 'קראו את המשפט ובחרו מה הוא אומר', choices: all.map(x => ({ v: x.id, label: pics ? x.em : x.he, pic: pics })), answer: sid, noAudio: true };
  }

  // הסבר חיובי לטעות (וגם מה פירוש התשובה שנבחרה)
  function explain(task, given) {
    const k = task.kind;
    if (k.startsWith('L_')) {
      const L = L1(task.item);
      if (k === 'L_hear' || k === 'L_name') {
        const G = L1(given);
        return [`זו האות ${L.u} ${L.l}, וקוראים לה "${L.he}".`, G ? `בחרת ${G.u} ${G.l}, שקוראים לה "${G.he}".` : '', pairTip(task.item, given)].filter(Boolean);
      }
      if (k === 'L_case') {
        const G = L1(given);
        return [task.toLower ? `האות הקטנה של ${L.u} היא ${L.l}.` : `האות הגדולה של ${L.l} היא ${L.u}.`, G ? (task.toLower ? `${G.l} היא האות הקטנה של ${G.u}.` : `${G.u} היא האות הגדולה של ${G.l}.`) : '', pairTip(task.item, given)].filter(Boolean);
      }
      if (k === 'L_first') {
        const w = WD[task.word];
        return [task.end ? `במילה ${w.en} ${w.em} שומעים בסוף "קס", וזו האות x.` : `המילה ${w.en} ${w.em} מתחילה בצליל ${L.snd.split(' ')[0]}, וזו האות ${L.l}.`, given && L1(given) ? `האות ${given} עושה את הצליל ${L1(given).snd}.` : ''].filter(Boolean);
      }
      if (k === 'L_pic') {
        const w = WD[task.answer], g = WD[given];
        return [`${w.em} ${w.en} מתחילה ב-${task.item}.`, g ? `${g.em} ${g.en} מתחילה ב-${g.en[0]}.` : ''].filter(Boolean);
      }
    }
    if (k === 'F_rhyme') {
      const w = WD[task.word], a = WD[task.answer], g = WD[given];
      return [`${w.en} ו-${a.en} מתחרזות: שתיהן נגמרות בצליל "${ending(w.en)}".`, g ? `${g.en} ${g.em} נגמרת ב-"${ending(g.en)}", ולכן לא מתחרזת.` : '', 'טיפ: אומרים את שתי המילים בקול ומקשיבים לסוף שלהן.'].filter(Boolean);
    }
    if (k === 'F_mid') {
      const w = WD[task.word], L = LET[task.answer];
      return [`במילה ${w.en} ${w.em} שומעים באמצע ${L.snd.split(' ')[0]}, וזו האות ${task.answer}.`, LET[given] ? `האות ${given} עושה את הצליל ${LET[given].snd}.` : ''].filter(Boolean);
    }
    if (k === 'F_end') {
      const w = WD[task.word], L = LET[task.answer];
      return [`המילה ${w.en} ${w.em} נגמרת בצליל ${L.snd.split(' ')[0]}, וזו האות ${task.answer}.`].filter(Boolean);
    }
    if (k === 'K_mean' || k === 'K_reply') {
      const c = CD[task.answer], g = CD[given];
      return k === 'K_reply'
        ? [`על "${c.en}" (${c.he}) עונים: "${c.reply}".`, g ? `"${g.reply}" היא תשובה לשאלה "${g.en}".` : '']
        : [`"${c.en}" פירושו: ${c.he}`, g ? `"${g.en}" פירושו: ${g.he}` : ''];
    }
    if (k === 'R_sent') {
      const s = SD[task.answer], g = SD[given];
      return [`"${s.en}" פירושו: ${s.he}`, g ? `התשובה שבחרת מתאימה למשפט "${g.en}".` : '', 'טיפ: מחפשים במשפט מילה שמכירים, והיא עוזרת להבין את כולו.'].filter(Boolean);
    }
    const w = WD[task.answer], g = WD[given];
    return [`${w.en} ${w.em} = ${w.he}`, g ? `בחרת ${g.en} ${g.em} = ${g.he}` : ''].filter(Boolean);
  }
  const PAIR = { 'b|d': 'b ו-d הן כמו תמונת ראי. ב-b המקל בא קודם ואחריו הבטן, וב-d קודם הבטן ואחריה המקל.', 'p|q': 'ב-p הבטן מימין למקל, וב-q משמאל.', 'b|p': 'ב-b המקל עולה למעלה, וב-p יורד למטה.', 'd|q': 'ב-d המקל עולה למעלה, וב-q יורד למטה.', 'm|n': 'ל-m יש שני גשרים ול-n גשר אחד.', 'n|u': 'n היא גשר, ו-u היא כוס.', 'm|w': 'm היא שני גשרים, ו-w היא שני עמקים.', 'i|l': 'ל-i יש נקודה.', 'e|a': 'e נשמעת כמו אֶ ו-a כמו אַ.', 'a|o': 'a נשמעת כמו אַ ו-o כמו אוֹ.', 'g|j': 'g נשמעת כמו ג ו-j כמו ג\'.', 'v|w': 'v נשמעת כמו ו, ו-w כמו וו (שפתיים עגולות).', 'u|a': 'u נשמעת כמו אַ ב-umbrella, ו-a כמו אַ ב-apple. הן קרובות, ולכן לומדים אותן עם מילים.' };
  const pairTip = (a, b) => PAIR[`${a}|${b}`] || PAIR[`${b}|${a}`] || '';

  // ---------- תכנון שיעור ----------
  function planSession(p, topicId, rng, day, opts) {
    ensureProfile(p);
    const T = TOPIC[topicId], pc = pace(p, topicId);
    const tasks = [], intro = [];
    const lockInfo = opts && opts.ignoreLocks ? null : locks(p)[topicId];
    if (lockInfo) return { topic: topicId, locked: lockInfo, tasks: [], pace: pc };
    let n = T.n + (pc.mode === 'fast' ? 2 : 0);
    const used = {}, push = t => { if (t) { tasks.push(t); used[t.area + ':' + t.item] = (used[t.area + ':' + t.item] || 0) + 1; } };

    if (topicId === 'letters') {
      const act = activeLetters(p.lg), fresh = [...act].filter(l => !p.intro.L.includes(l));
      const k = Math.min(fresh.length, p.intro.L.length === 0 ? 3 : pc.mode === 'fast' ? 3 : pc.mode === 'steady' ? 2 : pc.mode === 'start' ? 2 : p.intro.L.length < 4 ? 1 : 0);
      fresh.slice(0, k).forEach(l => { intro.push(l); tasks.push({ kind: 'introL', item: l, area: null }); push(Object.assign(mkLetterTask('L_hear', l, rng, p), { afterIntro: true })); });
      const known = p.intro.L + intro.join('');
      let guard = 0;
      while (tasks.filter(t => t.area).length < n && guard++ < 200) {
        const area = weighted(['lname', 'lsound', 'lcase'], a => (a === 'lcase' ? 0.8 : 1), rng);
        const l = weighted([...known], x => itemWeight(p, area, x) / (1 + 2 * (used[area + ':' + x] || 0)), rng);
        const kind = area === 'lname' ? pick(['L_hear', 'L_hear', 'L_name'], rng) : area === 'lsound' ? pick(['L_first', 'L_pic'], rng) : 'L_case';
        const last = tasks[tasks.length - 1];
        if (last && last.item === l && known.length > 1) continue;
        push(mkLetterTask(kind, l, rng, p));
      }
      return { topic: topicId, tasks, intro, pace: pc };
    }
    if (topicId === 'write') {
      const act = activeLetters(p.wg);
      const tried = l => rec(p, 'wup', l.toUpperCase()) || rec(p, 'wlo', l);
      const fresh = [...act].filter(l => !tried(l));
      const k = Math.min(fresh.length, pc.mode === 'fast' ? 2 : pc.mode === 'reinforce' && [...act].some(tried) ? 0 : 1);
      fresh.slice(0, k).forEach(l => { push({ kind: 'W_letter', area: 'wup', item: l.toUpperCase(), first: true }); push({ kind: 'W_letter', area: 'wlo', item: l, first: true }); });
      const pool = [...act].filter(l => tried(l) || fresh.slice(0, k).includes(l));
      if (!pool.length) pool.push(act[0]);
      let guard = 0;
      while (tasks.length < n && guard++ < 100) {
        const area = rng() < 0.5 ? 'wup' : 'wlo';
        const l = weighted(pool, x => itemWeight(p, area, area === 'wup' ? x.toUpperCase() : x) / (1 + 3 * (used[area + ':' + (area === 'wup' ? x.toUpperCase() : x)] || 0)), rng);
        const item = area === 'wup' ? l.toUpperCase() : l;
        if (used[area + ':' + item] >= 2) continue;
        push({ kind: 'W_letter', area, item });
      }
      return { topic: topicId, tasks, intro, pace: pc };
    }
    if (topicId === 'words') {
      const act = activeWords(p), fresh = act.filter(w => !p.intro.W.includes(w.id));
      const k = Math.min(fresh.length, p.intro.W.length === 0 ? 4 : pc.mode === 'fast' ? 5 : pc.mode === 'steady' || pc.mode === 'start' ? 3 : p.intro.W.length < 5 ? 2 : 0);
      fresh.slice(0, k).forEach(w => { intro.push(w.id); tasks.push({ kind: 'introW', item: w.id, area: null }); });
      const known = p.intro.W.concat(intro);
      intro.forEach(id => push(Object.assign(mkWordTask(pick(['V_pic2word', 'H_word2pic'], rng), id, rng, p), { afterIntro: true })));
      let guard = 0;
      while (tasks.filter(t => t.area).length < n && guard++ < 200) {
        const area = rng() < 0.65 ? 'vocab' : 'listen';
        const id = weighted(known, x => itemWeight(p, area, x) / (1 + 2 * (used[area + ':' + x] || 0)), rng);
        const kind = area === 'vocab' ? pick(['V_pic2word', 'V_word2he', 'V_he2word'], rng) : 'H_word2pic';
        const last = tasks[tasks.length - 1];
        if (last && last.item === id && known.length > 1) continue;
        push(mkWordTask(kind, id, rng, p));
      }
      return { topic: topicId, tasks, intro, pace: pc };
    }
    if (topicId === 'phonics') {
      const known = new Set(p.intro.L.split(''));
      const all = CVC.filter(id => WD[id] && WD[id].em);
      const kn = all.filter(id => [...WD[id].en].every(c => known.has(c)));
      const pool = kn.length >= 5 ? kn : all;
      if (!Object.keys(p.st.phon || {}).length) tasks.push({ kind: 'introP', item: 'phon', area: null });
      let guard = 0;
      while (tasks.filter(t => t.area).length < n && guard++ < 200) {
        const kind = pick(['F_rhyme', 'F_mid', 'F_mid', 'F_end'], rng);
        let word;
        if (kind === 'F_rhyme') { const rp = RHYMES.filter(r => r.every(id => WD[id] && WD[id].em)); word = pick(pick(rp, rng), rng); }
        else word = pick(pool, rng);
        const key = kind[2] + ':' + word;
        const itemKey = (kind === 'F_rhyme' ? 'R:' : kind === 'F_mid' ? 'M:' : 'E:') + word;
        if (used['phon:' + itemKey]) continue;
        if (rng() > itemWeight(p, 'phon', itemKey) / 6 + 0.15) continue; // מעדיפים מה שעוד לא נשלט
        push(mkPhonTask(kind, word, rng));
      }
      return { topic: topicId, tasks, intro, pace: pc };
    }
    if (topicId === 'talk') {
      const fresh = CHUNKS.filter(c => !p.intro.C.includes(c.id));
      const k = Math.min(fresh.length, p.intro.C.length === 0 ? 3 : pc.mode === 'fast' ? 4 : pc.mode === 'reinforce' ? (p.intro.C.length < 4 ? 1 : 0) : 3);
      fresh.slice(0, k).forEach(c => { intro.push(c.id); tasks.push({ kind: 'introC', item: c.id, area: null }); push(Object.assign(mkChunkTask('K_mean', c.id, rng), { afterIntro: true })); });
      const known = p.intro.C.concat(intro);
      let guard = 0;
      while (tasks.filter(t => t.area).length < n && guard++ < 200) {
        const id = weighted(known, x => itemWeight(p, 'chunk', 'K:' + x) / (1 + 2 * (used['chunk:K:' + x] || 0)), rng);
        const last = tasks[tasks.length - 1];
        if (last && last.item === 'K:' + id && known.length > 1) continue;
        push(mkChunkTask(CD[id].reply && rng() < 0.55 ? 'K_reply' : 'K_mean', id, rng));
      }
      return { topic: topicId, tasks, intro, pace: pc };
    }
    if (topicId === 'speak') {
      const items = [...p.intro.L].map(l => 'L:' + l).concat(p.intro.W.map(w => 'W:' + w));
      let guard = 0;
      while (tasks.length < n && guard++ < 100) {
        const it = weighted(items, x => itemWeight(p, 'speak', x) / (1 + 4 * (used['speak:' + x] || 0)), rng);
        if (used['speak:' + it]) continue;
        push(it[0] === 'L' ? { kind: 'S_letter', area: 'speak', item: it, letter: it.slice(2), say: L1(it.slice(2)).name } : { kind: 'S_word', area: 'speak', item: it, word: it.slice(2), say: WD[it.slice(2)].en });
      }
      return { topic: topicId, tasks, intro, pace: pc };
    }
    if (topicId === 'read') {
      const words = p.intro.W.filter(id => box(p, 'vocab', id) >= 2 && /^[a-z-]+$/.test(WD[id].en));
      const sents = SENTENCES.filter(s => s.k.every(id => p.intro.W.includes(id)));
      let guard = 0;
      while (tasks.length < n && guard++ < 200) {
        const useS = sents.length && rng() < (masteredList(p, 'vocab').length >= 20 ? 0.6 : 0.35);
        if (useS) { const s = weighted(sents, x => itemWeight(p, 'read', 'S:' + x.id) / (1 + 4 * (used['read:S:' + x.id] || 0)), rng); if (used['read:S:' + s.id]) continue; push(mkSentenceTask(s.id, rng)); }
        else if (words.length) { const id = weighted(words, x => itemWeight(p, 'read', 'W:' + x) / (1 + 4 * (used['read:W:' + x] || 0)), rng); if (used['read:W:' + id] && words.length > n) continue; push(mkWordTask('R_word2pic', id, rng, p)); }
      }
      return { topic: topicId, tasks, intro, pace: pc };
    }
    if (topicId === 'spell') {
      const wlo = new Set(masteredList(p, 'wlo'));
      const cand = p.intro.W.map(id => WD[id]).filter(w => /^[a-z]+$/.test(w.en) && w.en.length <= 7).sort((a, b) => a.en.length - b.en.length);
      const easy = cand.filter(w => [...w.en].every(c => wlo.has(c)));
      const pool = (easy.length >= 4 ? easy : cand).slice(0, 25);
      const typing = masteredList(p, 'spell').length >= 10; // שלב מתקדם: משלבים גם מקלדת
      let guard = 0;
      while (tasks.length < n && guard++ < 100 && pool.length) {
        const w = weighted(pool, x => itemWeight(p, 'spell', x.id) * (x.en.length <= 4 ? 1.5 : 1) / (1 + 4 * (used['spell:' + x.id] || 0)), rng);
        if (used['spell:' + w.id]) { if (pool.length <= tasks.length) break; continue; }
        push({ kind: typing && tasks.length % 3 === 2 ? 'P_type' : 'P_hand', area: 'spell', item: w.id, word: w.id });
      }
      return { topic: topicId, tasks, intro, pace: pc };
    }
    return { topic: topicId, tasks: [], intro, pace: pc };
  }

  // ---------- רישום ----------
  function dayOf(p, day) { return p.days[day] || (p.days[day] = { answered: 0, correct: 0, rounds: 0, by: {} }); }
  function markIntro(p, kind, item, day) {
    if (!p.start) p.start = day;
    if (kind === 'introL' && !p.intro.L.includes(item)) p.intro.L += item;
    if (kind === 'introW' && !p.intro.W.includes(item)) p.intro.W.push(item);
    if (kind === 'introC' && !p.intro.C.includes(item)) p.intro.C.push(item);
  }
  // o: { ms, timed, given, trace, hw (תוצאת כתב יד), self }
  function record(p, task, ok, day, o) {
    o = o || {};
    if (!p.start) p.start = day;
    const area = task.area, item = task.item;
    const st = p.st[area] || (p.st[area] = {});
    const r = st[item] || (st[item] = [0, 0, 0, day]);
    const before = r[0];
    if (ok) {
      const firstEver = r[1] === 0 && r[2] === 0;
      let nb = firstEver && !task.afterIntro && /^(L_|V_|H_|R_|F_|K_)/.test(task.kind) ? 2 : r[0] + 1;
      if (o.trace) nb = Math.min(nb, 2); // העתקה על גבי האות לא מספיקה לשליטה
      r[0] = Math.min(5, Math.max(r[0], nb)); r[1]++;
    } else { r[0] = Math.max(0, r[0] - 2); r[2]++; }
    r[3] = day;
    p.r[area] = ((p.r[area] || '') + (ok ? '1' : '0')).slice(-20);
    const tid = TOPICS.find(t => t.areas.includes(area)).id;
    p.tr[tid] = ((p.tr[tid] || '') + (ok ? '1' : '0')).slice(-20);
    const s = p.stats[area] || (p.stats[area] = { answered: 0, correct: 0 });
    s.answered++; if (ok) s.correct++;
    const d = dayOf(p, day);
    d.answered++; if (ok) { d.correct++; d.st = (d.st || 0) + 1; }
    const b = d.by[area] || (d.by[area] = [0, 0]); b[0]++; if (ok) b[1]++;
    if (o.ms && o.timed) { s.ms = (s.ms || 0) + o.ms; s.tn = (s.tn || 0) + 1; if (ok) { s.cms = (s.cms || 0) + o.ms; s.ctn = (s.ctn || 0) + 1; } d.ms = (d.ms || 0) + o.ms; d.tn = (d.tn || 0) + 1; }
    // בלבולים בין אותיות ומילים שנשכחות
    if (!ok && o.given && task.kind && task.kind.startsWith('L_') && L1(o.given)) { const k = `${task.item}>${o.given}`; p.conf[k] = (p.conf[k] || 0) + 1; }
    if (!ok && o.hwGuess && o.hwGuess.toLowerCase() !== item.toLowerCase()) { const k = `${item.toLowerCase()}>${o.hwGuess.toLowerCase()}`; p.conf[k] = (p.conf[k] || 0) + 1; }
    if (!ok && ['vocab', 'listen', 'read', 'spell'].includes(area)) { const id = String(item).replace(/^W:/, ''); if (WD[id]) p.miss[id] = (p.miss[id] || 0) + 1; }
    if (o.hw) { p.hw.n = (p.hw.n || 0) + 1; (o.hw.issues || []).forEach(i => { p.hw[i] = (p.hw[i] || 0) + 1; }); }
    if (area === 'speak') { p.sp.tries++; if (ok) p.sp.ok++; }
    return { before, after: r[0], mastered: before < MASTER && r[0] >= MASTER };
  }
  function recordSkip(p, task, day) { const d = dayOf(p, day); d.sk = (d.sk || 0) + 1; if (task.area) { const s = p.stats[task.area] || (p.stats[task.area] = { answered: 0, correct: 0 }); s.sk = (s.sk || 0) + 1; } }
  function recordSelf(p, day) { p.sp.self = (p.sp.self || 0) + 1; const d = dayOf(p, day); d.self = (d.self || 0) + 1; } // תרגול דיבור בלי זיהוי אוטומטי (לא נספר בציון)
  function recordPartial(p, day, answered) { const d = dayOf(p, day); d.part = (d.part || 0) + 1; d.pq = (d.pq || 0) + answered; }
  function completeSession(p, day, topicId, o) {
    const d = dayOf(p, day); if (!o.partial) d.rounds = (d.rounds || 0) + 1;
    p.rlog = (p.rlog || []).concat([{ d: day, t: topicId, n: o.n, ok: o.ok, ms: o.ms || 0, ...(o.partial ? { p: 1 } : {}), ...(o.sk ? { sk: o.sk } : {}) }]).slice(-30);
    return advance(p);
  }

  // ---------- זיהוי דיבור ----------
  const LETTER_SAY = { a: ['a', 'ay', 'hey', 'eh', 'ae', 'ei'], b: ['b', 'be', 'bee', 'bea'], c: ['c', 'see', 'sea', 'si', 'cee'], d: ['d', 'dee', 'de', 'the'], e: ['e', 'ee', 'he', 'ii'], f: ['f', 'ef', 'eff', 'if'], g: ['g', 'gee', 'ji', 'jee', 'gi'], h: ['h', 'aitch', 'age', 'each', 'ach', 'eitch', 'hetch'], i: ['i', 'eye', 'aye', 'ai', 'hi', 'ay'], j: ['j', 'jay', 'jey', 'jae'], k: ['k', 'kay', 'okay', 'ok', 'cay', 'ke'], l: ['l', 'el', 'elle', 'ell', 'al'], m: ['m', 'em', 'am', 'emm'], n: ['n', 'en', 'and', 'in', 'an'], o: ['o', 'oh', 'owe', 'ow'], p: ['p', 'pee', 'pea', 'pe'], q: ['q', 'queue', 'cue', 'kew', 'kyu', 'que'], r: ['r', 'are', 'our', 'ar', 'or'], s: ['s', 'es', 'ess', 'yes', 'as'], t: ['t', 'tee', 'tea', 'ti'], u: ['u', 'you', 'yu', 'ewe', 'yo'], v: ['v', 'vee', 'we', 've', 'vi'], w: ['w', 'double you', 'double u', 'doubleu', 'dabliu'], x: ['x', 'ex', 'eggs', 'ax', 'ecks'], y: ['y', 'why', 'wai', 'wy'], z: ['z', 'zee', 'zed', 'zi', 'see'] };
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z' -]/g, ' ').replace(/\s+/g, ' ').trim();
  function lev(a, b) { const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i].concat(Array(n).fill(0))); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
  // alts: מחרוזות שזוהו (כמה אפשרויות); target: {letter} או {word}
  function matchSpeech(alts, target) {
    const list = (alts || []).map(norm).filter(Boolean);
    if (!list.length) return { ok: false, heard: '' };
    if (target.letter) {
      const ok = LETTER_SAY[target.letter] || [target.letter];
      for (const a of list) {
        const toks = a.split(' ');
        if (ok.includes(a) || toks.some(t => ok.includes(t)) || ok.some(o => o.includes(' ') && a.includes(o)) || a === `letter ${target.letter}` || a.replace(/\s/g, '') === target.letter) return { ok: true, heard: a };
      }
      return { ok: false, heard: list[0] };
    }
    const w = norm(WD[target.word] ? WD[target.word].en : target.word);
    const variants = [w, w.replace(/-/g, ' '), w.replace(/-/g, ''), w + 's', 'a ' + w, 'an ' + w, 'the ' + w];
    for (const a of list) {
      if (variants.includes(a)) return { ok: true, heard: a };
      const toks = a.split(' ');
      if (toks.includes(w) || toks.includes(w + 's')) return { ok: true, heard: a };
      if (w.length >= 5 && toks.some(t => lev(t, w) <= 1)) return { ok: true, heard: a };
    }
    return { ok: false, heard: list[0] };
  }

  // ---------- ציון ודוח להורים ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pct = x => Math.round(x * 100);
  function areaInfo(p, area) {
    const st = p.st[area] || {}, items = Object.keys(st), A = AREAS[area];
    const m = items.filter(k => st[k][0] >= MASTER).length, r = p.r[area] || '', acc = recentAcc(r), s = p.stats[area] || {};
    const progress = clamp(m / A.target, 0, 1);
    const out = { id: area, title: A.title, icon: A.icon, unit: A.unit, target: A.target, mastered: m, seen: items.length, answered: s.answered || 0, recentN: r.length, acc, progress, included: r.length >= MIN_AREA, score: null, speed: null };
    if (out.included) {
      if (s.ctn >= 5) { const ratio = (s.cms / s.ctn) / TARGET_MS; out.speed = clamp(1 - (ratio - 1) / 2, 0, 1); out.avgCorrectMs = s.cms / s.ctn; }
      const ladder = 0.7 * progress + 0.3 * acc;
      out.score = clamp(Math.round(100 * ladder * (0.88 + 0.12 * (out.speed === null ? 0.5 : out.speed))), 1, 100);
    }
    return out;
  }
  function abilityScore(p) {
    const out = { program: 'english', score: null, enough: false, areas: [], answered: 0, need: '', speedUsed: false, topics: [] };
    if (!p) { out.need = 'אין נתונים'; return out; }
    ensureProfile(p);
    out.areas = AREA_IDS.map(a => areaInfo(p, a));
    out.topics = out.areas.map(a => ({ id: a.id, included: a.included, score: a.score, title: a.title }));
    out.answered = out.areas.reduce((x, a) => x + a.answered, 0);
    const inc = out.areas.filter(a => a.included);
    out.enough = inc.length >= 2 && out.answered >= 30;
    if (!out.enough) { out.need = `נדרשות לפחות 30 תשובות באנגלית ולפחות 2 תחומים עם ${MIN_AREA} תשובות אחרונות או יותר (כרגע ${out.answered} תשובות, ${inc.length} תחומים).`; return out; }
    out.score = clamp(Math.round(inc.reduce((x, a) => x + a.score, 0) / inc.length), 1, 100);
    out.speedUsed = inc.some(a => a.speed !== null);
    return out;
  }
  const used = p => !!p && Object.keys(p.days || {}).some(k => p.days[k].answered > 0);
  const practicedDay = (p, day) => !!(p && p.days && p.days[day] && p.days[day].answered >= 8);

  const WHY = {
    lname: 'לכל אות באנגלית יש שם שונה מהצליל שלה (למשל G נקראת "ג\'י" ונשמעת ג), ויש אותיות שנראות דומות. לוקח זמן עד שהשמות נקלטים.',
    lsound: 'הצליל של האות שונה מהשם שלה. לדוברי עברית קשה במיוחד עם התנועות a, e, i, o, u, שבאנגלית נכתבות באותיות נפרדות ונשמעות קרוב זו לזו.',
    lcase: 'חלק מהאותיות הקטנות שונות לגמרי מהגדולות (a/A, b/B, d/D, g/G, q/Q, r/R), ולכן צריך ללמוד כל זוג בנפרד.',
    wup: 'באנגלית כותבים משמאל לימין, הפוך מעברית, ועל ארבעה קווים. צריך זמן כדי שהיד תתרגל לכיוון ולמבנה של האותיות.',
    wlo: 'האותיות הקטנות צריכות לשבת במקום מדויק בין הקווים (גוף, מקל למעלה או זנב למטה), וחלקן דומות זו לזו (b/d, p/q, n/u).',
    vocab: 'מילה חדשה נקלטת רק אחרי שפוגשים אותה פעמים רבות ובהקשרים שונים.',
    listen: 'באנגלית יש צלילים שאין בעברית (כמו th, w והצליל של a ב-cat), ולכן לפעמים קשה לזהות מילה מוכרת כשהיא נשמעת.',
    read: 'קריאה דורשת לחבר את הצלילים של האותיות למילה, ובאנגלית יש מילים שלא נקראות כפי שהן נכתבות.',
    spell: 'באנגלית אותו צליל נכתב לפעמים בדרכים שונות, ולכן צריך לזכור את צורת המילה ולא רק לשמוע אותה.',
    speak: 'יש צלילים באנגלית שאין בעברית, ולפעמים יש גם מבוכה לדבר בקול בשפה חדשה.',
    phon: 'בעברית התנועות כמעט לא נכתבות, ולכן קשה בהתחלה לשמוע את ההבדל בין a, e, i, o, u באמצע מילה, ולזהות חרוזים.',
    chunk: 'ביטויים לשיחה נלמדים כיחידה שלמה ("How are you?") ולא מילה במילה, ולכן צריך לשמוע ולומר אותם הרבה פעמים במצבים אמיתיים.',
  };
  const HOW = {
    lname: ['לשיר יחד את שיר ה-ABC ולהצביע על כל אות.', 'משחק "מצא את האות" על שלטים, קופסאות וספרים.', 'חמש דקות ביום עם כרטיסיות של אותיות.'],
    lsound: ['משחק "אני רואה משהו שמתחיל ב..." עם הצליל (בּ) ולא עם השם (בִּי).', 'לומר יחד מילה ולהקשיב לצליל הראשון: b-b-ball.'],
    lcase: ['משחק זיכרון עם קלפים: אות גדולה וזוג קטן שלה.', 'לסמן בספר באנגלית כל זוג של אות גדולה וקטנה.'],
    wup: ['לתרגל במחברת עם ארבעה קווים: כל אות שלוש פעמים, לאט ובכיוון הנכון.', 'לכתוב אותיות באצבע על השולחן או בחול, מלמעלה למטה.'],
    wlo: ['לתרגל במחברת עם ארבעה קווים ולשים לב איפה כל אות "יושבת".', 'לחזור על הכלל: אות קטנה בין הקו המקווקו לקו הבסיס; מקל עולה, זנב יורד.'],
    vocab: ['להדביק פתקים עם מילים באנגלית על חפצים בבית.', 'לשאול "What is this?" ולענות יחד באנגלית.', 'לעבור על 3–5 מילים חדשות ביום, ולחזור עליהן גם למחרת.'],
    listen: ['להאזין לשירים ולסיפורים קצרים באנגלית ולחפש מילים מוכרות.', 'משחק "מה שמעת?": ההורה אומר מילה והילד מצביע על התמונה.'],
    read: ['לקרוא יחד מילים קצרות (cat, dog, sun) ולהעביר אצבע מתחת לכל אות.', 'מילים קצרות ושכיחות כמו the, is, I לזכור כמו תמונה.'],
    spell: ['שיטת "מסתכלים, אומרים, מכסים, כותבים, בודקים": כותבים מילה, מכסים, כותבים שוב מהזיכרון ובודקים.', 'להתחיל ממילים קצרות של שלוש אותיות.'],
    speak: ['לחזור בקול אחרי ההקלטה של האפליקציה, לאט ובבירור.', 'לשאול שאלות קצרות באנגלית בבית ("What color is it?") ולענות במילה אחת.'],
    phon: ['משחק חרוזים בעל פה: cat, hat, bat… מי ממשיך?', 'לומר מילה קצרה לאט ולהפריד לצלילים: c-a-t, ולשאול "מה שמעת באמצע?".'],
    chunk: ['לפתוח כל בוקר בביטוי אחד באנגלית ("Good morning! How are you?") ולענות יחד.', 'משחק תפקידים קצר: חנות, היכרות, יום הולדת.'],
  };
  function report(kid, p, o) {
    const name = kid.name, gen = kid.gender === 'f' ? 'f' : 'm', g = (m, f) => (gen === 'f' ? f : m);
    const ab = abilityScore(p);
    const prog = { id: 'english', title: 'אנגלית', icon: '🔤', ability: ab, strengths: [], focus: [], engagement: null, timing: null, started: used(p) };
    if (!prog.started) return prog;
    ensureProfile(p);
    const areas = ab.areas.filter(a => a.recentN >= 5);
    areas.forEach(a => {
      if (a.acc >= 0.85 && a.mastered >= 3) prog.strengths.push({ title: a.title, evidence: `שליטה ב-${a.mastered} ${a.unit} מתוך ${a.target} · ${pct(a.acc)}% נכונות ב-${a.recentN} התשובות האחרונות` });
    });
    areas.filter(a => a.acc < 0.7).sort((x, y) => x.acc - y.acc).forEach(a => {
      const why = [WHY[a.id]], how = HOW[a.id].slice(0, 2);
      const ev = [`${pct(a.acc)}% נכונות ב-${a.recentN} התשובות האחרונות`, `שליטה ב-${a.mastered} ${a.unit} מתוך ${a.target}`];
      prog.focus.push({ title: a.title, evidence: ev.join(' · '), why, how });
    });
    // בלבולים בין אותיות
    const confs = Object.keys(p.conf || {}).map(k => ({ k, n: p.conf[k] })).filter(x => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 4);
    if (confs.length) {
      const why = [], how = [];
      confs.forEach(c => { const [a, b] = c.k.split('>'); const t = pairTip(a, b); if (t && !why.includes(t)) why.push(t); });
      if (!why.length) why.push('אותיות שנראות או נשמעות דומה מתבלבלות בהתחלה. זה שלב טבעי בלמידה.');
      if (confs.some(c => /^(b>d|d>b)$/.test(c.k))) how.push('טריק "המיטה" (bed): שתי ידיים קפוצות עם אגודל למעלה יוצרות את המילה bed. השמאלית היא b והימנית d.');
      how.push('לכתוב את שתי האותיות זו ליד זו ולומר בקול את הצליל של כל אחת.');
      prog.focus.push({ title: 'אותיות שמתבלבלות', evidence: confs.map(c => { const [a, b] = c.k.split('>'); return `${a} ↔ ${b} (${c.n} פעמים)`; }).join(' · '), why, how });
    }
    // כתב יד
    const hw = p.hw || {};
    if ((hw.n || 0) >= 6) {
      const bits = [], why = [], how = [];
      if ((hw.dir || 0) / hw.n >= 0.2) { bits.push(`כיוון כתיבה: ${hw.dir} פעמים`); why.push('חלק מהקווים נכתבים מלמטה למעלה או בכיוון הפוך. בעברית כותבים מימין לשמאל, וזה משפיע.'); how.push('לפני כל אות לצפות בהדגמה ולהתחיל מהנקודה הירוקה: קווים מלמעלה למטה, עיגולים נגד כיוון השעון.'); }
      if ((hw.pos || 0) / hw.n >= 0.2) { bits.push(`מיקום על הקווים: ${hw.pos} פעמים`); why.push('האותיות לא תמיד "יושבות" נכון על הקווים: אות קטנה שעולה עד הקו העליון, או זנב שלא יורד.'); how.push('לתרגל במחברת עם ארבעה קווים ולומר בקול: "גדולה מלמעלה עד הבסיס; קטנה בין המקווקו לבסיס".'); }
      if ((hw.case || 0) >= 2) { bits.push(`אות גדולה במקום קטנה (או להפך): ${hw.case} פעמים`); why.push(WHY.lcase); how.push(HOW.lcase[0]); }
      if (bits.length) prog.focus.push({ title: 'כתיבת אותיות: איך כותבים', evidence: bits.join(' · '), why, how });
    }
    // מילים שנשכחות
    const miss = Object.keys(p.miss || {}).filter(id => p.miss[id] >= 2 && box(p, 'vocab', id) < MASTER).sort((a, b) => p.miss[b] - p.miss[a]).slice(0, 6);
    if (miss.length) prog.focus.push({ title: 'מילים לחזרה', evidence: miss.map(id => `${WD[id].en} (${WD[id].he})`).join(' · '), why: [WHY.vocab], how: [`לחזור על המילים האלה השבוע: ${miss.map(id => WD[id].en).join(', ')}.`, HOW.vocab[0]] });
    // דיבור
    if (p.sp.tries === 0 && (p.sp.self || 0) > 0) prog.notes = ['תרגול הדיבור נעשה בהקלטה והשוואה (במכשיר הזה אין זיהוי דיבור אוטומטי), ולכן אין לו ציון.'];
    const days = p.days || {};
    const sum = f => Object.keys(days).reduce((a, d) => a + (days[d][f] || 0), 0);
    prog.engagement = { answered: sum('answered'), skips: sum('sk'), partial: sum('part'), partialQ: sum('pq'), rounds: sum('rounds'), skipRate: null };
    prog.engagement.skipRate = prog.engagement.answered + prog.engagement.skips ? prog.engagement.skips / (prog.engagement.answered + prog.engagement.skips) : null;
    const tn = sum('tn'); prog.timing = tn >= 5 ? { avgMs: sum('ms') / tn, timed: tn } : null;
    const L = masteredList(p, 'lname').length, V = masteredList(p, 'vocab').length;
    prog.summaryParas = [
      `${name} ${g('למד', 'למדה')} עד עכשיו ${p.intro.L.length} אותיות ו-${p.intro.W.length} מילים, ${g('ושולט', 'ושולטת')} ב-${L} שמות של אותיות וב-${V} מילים.`,
      `אותיות פתוחות לתרגול: ${activeLetters(p.lg).split('').join(' ')}. שלב המילים הנוכחי: ${STAGES[Math.min(p.wt, STAGES.length) - 1].he}.`,
    ];
    prog.curriculum = curriculum(p);
    return prog;
  }
  // התאמה לתוכנית משרד החינוך: כמה מילים מכל רשימה נלמדו ונשלטו (מתוך המילים שבמאגר האפליקציה)
  function curriculum(p) {
    ensureProfile(p);
    const out = {};
    ['PB', 'C1', 'C2'].forEach(b => {
      const ws = WORDS.filter(w => w.band === b);
      out[b] = { label: BAND_HE[b], inBank: ws.length, learned: ws.filter(w => p.intro.W.includes(w.id)).length, mastered: ws.filter(w => box(p, 'vocab', w.id) >= MASTER).length };
    });
    out.letters = { learned: p.intro.L.length, nameMastered: masteredList(p, 'lname').length, upper: masteredList(p, 'wup').length, lower: masteredList(p, 'wlo').length };
    out.chunks = { learned: p.intro.C.length, of: CHUNKS.length, mastered: masteredList(p, 'chunk').length };
    return out;
  }

  return { STAGES, BAND_HE, CHUNKS, CD, RHYMES, CVC, curriculum, mkPhonTask, mkChunkTask, LETTERS, LET, GROUPS, WORDS, WD, THEMES, SENTENCES, SD, AREAS, AREA_IDS, TOPICS, TOPIC, TARGET_MS, MASTER, PACE_TEXT,
    newProfile, ensureProfile, box, mastered, masteredList, activeLetters, activeWords, locks, advance, pace, planSession, explain, pairTip,
    markIntro, record, recordSkip, recordSelf, recordPartial, completeSession, matchSpeech, areaInfo, abilityScore, report, used, practicedDay, WHY, HOW, mkLetterTask, mkWordTask, letterDistractors };
});
