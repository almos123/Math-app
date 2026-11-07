// ink.js — כתיבת אותיות באנגלית באצבע: תבניות קווים לכל אות (גדולה וקטנה), בדיקת הכתיבה והסבר בעברית.
// יחידות: y=0 הקו העליון, y=0.5 הקו המקווקו, y=1 קו הבסיס, y=1.45 קו הזנבות. x ביחידות של גובה האות הגדולה.
// עובד גם בדפדפן (window.Ink) וגם ב-Node (לבדיקות).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Ink = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const D2R = Math.PI / 180;
  // ---------- בניית קווים ----------
  function seg(x1, y1, x2, y2) {
    const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 0.04) + 1), out = [];
    for (let i = 0; i < n; i++) { const t = i / (n - 1); out.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]); }
    return out;
  }
  function poly(...pts) { // קו שבור דרך כמה נקודות, בלי להרים
    let out = [];
    for (let i = 0; i < pts.length - 1; i++) out = join(out, seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
    return out;
  }
  function arc(cx, cy, rx, ry, a0, a1) { // זווית במעלות; y כלפי מטה, ולכן 90 = למטה, -90 = למעלה
    const n = Math.max(4, Math.ceil(Math.abs(a1 - a0) / 8) + 1), out = [];
    for (let i = 0; i < n; i++) { const a = (a0 + (a1 - a0) * i / (n - 1)) * D2R; out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
    return out;
  }
  function join(a, b) { if (!a.length) return b.slice(); const l = a[a.length - 1]; return a.concat(Math.hypot(l[0] - b[0][0], l[1] - b[0][1]) < 1e-6 ? b.slice(1) : b); }
  const cat = (...parts) => parts.reduce((acc, p) => join(acc, p), []);
  const dot = (x, y) => [[x, y]];

  // ---------- תבניות: אותיות גדולות ----------
  const UP = {
    A: { w: 0.8, s: [seg(0.4, 0, 0, 1), seg(0.4, 0, 0.8, 1), seg(0.15, 0.62, 0.65, 0.62)],
      steps: ['מתחילים בקו העליון: קו באלכסון למטה ושמאלה, עד קו הבסיס.', 'חוזרים לאותה נקודה למעלה: קו באלכסון למטה וימינה.', 'קו שוכב באמצע, משמאל לימין.'] },
    B: { w: 0.62, s: [seg(0, 0, 0, 1), cat(seg(0, 0, 0.32, 0), arc(0.32, 0.25, 0.25, 0.25, -90, 90), seg(0.32, 0.5, 0, 0.5)), cat(seg(0, 0.5, 0.36, 0.5), arc(0.36, 0.75, 0.26, 0.25, -90, 90), seg(0.36, 1, 0, 1))],
      steps: ['קו ישר מהקו העליון עד קו הבסיס.', 'חוזרים למעלה: בטן קטנה ימינה, עד האמצע.', 'מהאמצע: בטן שנייה, קצת גדולה יותר, עד קו הבסיס.'] },
    C: { w: 0.75, s: [arc(0.4, 0.5, 0.4, 0.5, -40, -320)],
      steps: ['מתחילים קצת מתחת לקו העליון בצד ימין ומסובבים שמאלה: למעלה, שמאלה, למטה, ועוצרים בצד ימין. עיגול שלא נסגר.'] },
    D: { w: 0.7, s: [seg(0, 0, 0, 1), cat(seg(0, 0, 0.2, 0), arc(0.2, 0.5, 0.5, 0.5, -90, 90), seg(0.2, 1, 0, 1))],
      steps: ['קו ישר מהקו העליון עד קו הבסיס.', 'חוזרים למעלה: בטן גדולה ימינה, עד קו הבסיס.'] },
    E: { w: 0.62, s: [seg(0, 0, 0, 1), seg(0, 0, 0.6, 0), seg(0, 0.5, 0.5, 0.5), seg(0, 1, 0.6, 1)],
      steps: ['קו ישר מלמעלה למטה.', 'קו שוכב על הקו העליון, משמאל לימין.', 'קו שוכב באמצע, קצת קצר יותר.', 'קו שוכב על קו הבסיס.'] },
    F: { w: 0.6, s: [seg(0, 0, 0, 1), seg(0, 0, 0.6, 0), seg(0, 0.5, 0.5, 0.5)],
      steps: ['קו ישר מלמעלה למטה.', 'קו שוכב על הקו העליון, משמאל לימין.', 'קו שוכב באמצע.'] },
    G: { w: 0.8, s: [cat(arc(0.4, 0.5, 0.4, 0.5, -40, -360), seg(0.8, 0.5, 0.45, 0.5))],
      steps: ['מתחילים כמו C: מצד ימין למעלה מסובבים שמאלה ולמטה, עולים בצד ימין עד האמצע וממשיכים בקו קצר פנימה, שמאלה.'] },
    H: { w: 0.7, s: [seg(0, 0, 0, 1), seg(0.7, 0, 0.7, 1), seg(0, 0.5, 0.7, 0.5)],
      steps: ['קו ישר מלמעלה למטה בצד שמאל.', 'קו ישר מלמעלה למטה בצד ימין.', 'קו שוכב באמצע שמחבר ביניהם.'] },
    I: { w: 0.5, s: [seg(0.25, 0, 0.25, 1)], alt: [[seg(0.25, 0, 0.25, 1), seg(0, 0, 0.5, 0), seg(0, 1, 0.5, 1)]],
      steps: ['קו ישר מהקו העליון עד קו הבסיס. אפשר להוסיף קו קטן למעלה וקו קטן למטה.'] },
    J: { w: 0.6, s: [cat(seg(0.5, 0, 0.5, 0.75), arc(0.27, 0.75, 0.23, 0.25, 0, 180))],
      steps: ['מתחילים בקו העליון: קו ישר למטה, וקרוב לקו הבסיס מסובבים שמאלה, כמו מקל של מטרייה.'] },
    K: { w: 0.65, s: [seg(0, 0, 0, 1), seg(0.62, 0, 0, 0.6), seg(0.2, 0.45, 0.65, 1)],
      steps: ['קו ישר מלמעלה למטה.', 'מהקו העליון בצד ימין: קו באלכסון אל המקל, קצת מתחת לאמצע.', 'מהמקל: קו באלכסון למטה וימינה, עד קו הבסיס.'] },
    L: { w: 0.55, s: [poly([0, 0], [0, 1], [0.55, 1])],
      steps: ['קו ישר מלמעלה למטה, ובלי להרים את האצבע: קו שוכב ימינה על קו הבסיס.'] },
    M: { w: 0.85, s: [seg(0, 0, 0, 1), poly([0, 0], [0.42, 0.65], [0.85, 0]), seg(0.85, 0, 0.85, 1)],
      steps: ['קו ישר מלמעלה למטה.', 'חוזרים למעלה: קו באלכסון למטה עד האמצע, ומשם באלכסון למעלה.', 'קו ישר מלמעלה למטה בצד ימין.'] },
    N: { w: 0.7, s: [seg(0, 0, 0, 1), seg(0, 0, 0.7, 1), seg(0.7, 1, 0.7, 0)],
      steps: ['קו ישר מלמעלה למטה.', 'חוזרים למעלה: קו באלכסון עד קו הבסיס בצד ימין.', 'משם קו ישר למעלה, עד הקו העליון.'] },
    O: { w: 0.8, s: [arc(0.4, 0.5, 0.4, 0.5, -90, -450)],
      steps: ['מתחילים בקו העליון ומסובבים שמאלה (נגד כיוון השעון): למטה עד קו הבסיס וחזרה למעלה, עד שהעיגול נסגר.'] },
    P: { w: 0.6, s: [seg(0, 0, 0, 1), cat(seg(0, 0, 0.32, 0), arc(0.32, 0.27, 0.27, 0.27, -90, 90), seg(0.32, 0.54, 0, 0.54))],
      steps: ['קו ישר מלמעלה למטה.', 'חוזרים למעלה: בטן ימינה, עד האמצע.'] },
    Q: { w: 0.85, s: [arc(0.4, 0.5, 0.4, 0.5, -90, -450), seg(0.48, 0.7, 0.85, 1.05)],
      steps: ['כותבים O: מתחילים למעלה ומסובבים שמאלה עד שהעיגול נסגר.', 'קו קטן באלכסון שחוצה את התחתית, למטה וימינה.'] },
    R: { w: 0.62, s: [seg(0, 0, 0, 1), cat(seg(0, 0, 0.32, 0), arc(0.32, 0.27, 0.27, 0.27, -90, 90), seg(0.32, 0.54, 0, 0.54)), seg(0.3, 0.54, 0.62, 1)],
      steps: ['קו ישר מלמעלה למטה.', 'חוזרים למעלה: בטן ימינה, עד האמצע.', 'מהבטן: קו באלכסון למטה וימינה, עד קו הבסיס.'] },
    S: { w: 0.62, s: [cat(arc(0.31, 0.25, 0.29, 0.25, -20, -270), arc(0.31, 0.75, 0.31, 0.25, -90, 160))],
      steps: ['מתחילים למעלה בצד ימין, מסובבים שמאלה, יורדים באלכסון לצד ימין ומסובבים חזרה שמאלה על קו הבסיס. כמו נחש.'] },
    T: { w: 0.7, s: [seg(0.35, 0, 0.35, 1), seg(0, 0, 0.7, 0)],
      steps: ['קו ישר מלמעלה למטה, באמצע.', 'קו שוכב על הקו העליון, משמאל לימין.'] },
    U: { w: 0.7, s: [cat(seg(0, 0, 0, 0.62), arc(0.35, 0.62, 0.35, 0.38, 180, 0), seg(0.7, 0.62, 0.7, 0))],
      steps: ['מתחילים בקו העליון: יורדים, מסובבים בתחתית ועולים בצד ימין עד הקו העליון.'] },
    V: { w: 0.7, s: [poly([0, 0], [0.35, 1], [0.7, 0])],
      steps: ['קו באלכסון מהקו העליון עד קו הבסיס, ובלי להרים: קו באלכסון למעלה.'] },
    W: { w: 1.0, s: [poly([0, 0], [0.25, 1], [0.5, 0.35], [0.75, 1], [1, 0])],
      steps: ['כמו שני V צמודים: למטה, למעלה, למטה, למעלה, בלי להרים את האצבע.'] },
    X: { w: 0.7, s: [seg(0, 0, 0.7, 1), seg(0.7, 0, 0, 1)],
      steps: ['קו באלכסון מלמעלה-שמאל למטה-ימין.', 'קו באלכסון מלמעלה-ימין למטה-שמאל.'] },
    Y: { w: 0.7, s: [seg(0, 0, 0.35, 0.5), seg(0.7, 0, 0.35, 0.5), seg(0.35, 0.5, 0.35, 1)],
      steps: ['קו קצר באלכסון מלמעלה-שמאל עד האמצע.', 'קו קצר באלכסון מלמעלה-ימין עד האמצע.', 'מהאמצע: קו ישר למטה, עד קו הבסיס.'] },
    Z: { w: 0.65, s: [poly([0, 0], [0.65, 0], [0, 1], [0.65, 1])],
      steps: ['קו שוכב למעלה משמאל לימין, קו באלכסון למטה ושמאלה, וקו שוכב על קו הבסיס, בלי להרים את האצבע.'] },
  };
  // ---------- תבניות: אותיות קטנות ----------
  const bowl = () => arc(0.22, 0.75, 0.22, 0.25, -20, -340); // עיגול של a, d, g, q
  const LO = {
    a: { w: 0.5, s: [bowl(), seg(0.45, 0.5, 0.45, 1)],
      steps: ['מתחילים מתחת לקו המקווקו בצד ימין ומסובבים שמאלה עיגול קטן, בין הקו המקווקו לקו הבסיס.', 'קו ישר מהקו המקווקו למטה, צמוד לעיגול מימין.'] },
    b: { w: 0.5, s: [seg(0, 0, 0, 1), arc(0.23, 0.75, 0.23, 0.25, 180, 540)],
      steps: ['קו ישר ארוך מהקו העליון עד קו הבסיס.', 'מהמקל: בטן עגולה בצד ימין, בין הקו המקווקו לקו הבסיס. ב-b הבטן מימין למקל.'] },
    c: { w: 0.45, s: [arc(0.23, 0.75, 0.23, 0.25, -40, -320)],
      steps: ['עיגול קטן שלא נסגר: מתחילים מימין מתחת לקו המקווקו, מסובבים שמאלה ולמטה ועוצרים מימין.'] },
    d: { w: 0.5, s: [bowl(), seg(0.45, 0, 0.45, 1)],
      steps: ['קודם עיגול קטן, כמו c שנסגר, בין הקו המקווקו לקו הבסיס.', 'קו ישר ארוך מהקו העליון עד קו הבסיס, צמוד לעיגול מימין. ב-d הבטן משמאל למקל.'] },
    e: { w: 0.48, s: [cat(seg(0, 0.75, 0.46, 0.75), arc(0.23, 0.75, 0.23, 0.25, 0, -320))],
      steps: ['קו שוכב קצר באמצע הבטן, משמאל לימין, ובלי להרים: מסובבים למעלה ושמאלה ועוצרים מימין למטה.'] },
    f: { w: 0.45, s: [cat(arc(0.33, 0.17, 0.13, 0.15, -20, -180), seg(0.2, 0.17, 0.2, 1)), seg(0, 0.5, 0.42, 0.5)],
      steps: ['מתחילים ליד הקו העליון: וו קטן שמאלה, ואז קו ישר למטה עד קו הבסיס.', 'קו שוכב קצר על הקו המקווקו.'] },
    g: { w: 0.5, s: [bowl(), cat(seg(0.45, 0.5, 0.45, 1.25), arc(0.25, 1.25, 0.2, 0.2, 0, 160))],
      steps: ['עיגול קטן בין הקו המקווקו לקו הבסיס, כמו ב-a.', 'קו ישר מהקו המקווקו למטה, מתחת לקו הבסיס, ומסיימים בוו שמאלה.'] },
    h: { w: 0.48, s: [seg(0, 0, 0, 1), cat(arc(0.23, 0.75, 0.23, 0.25, 180, 360), seg(0.46, 0.75, 0.46, 1))],
      steps: ['קו ישר ארוך מהקו העליון עד קו הבסיס.', 'מהמקל: גשר קטן למעלה עד הקו המקווקו, ויורדים בצד ימין עד קו הבסיס.'] },
    i: { w: 0.1, s: [seg(0.05, 0.5, 0.05, 1), dot(0.05, 0.3)],
      steps: ['קו ישר קצר מהקו המקווקו עד קו הבסיס.', 'נקודה מעל, בין הקו העליון לקו המקווקו.'] },
    j: { w: 0.35, s: [cat(seg(0.3, 0.5, 0.3, 1.25), arc(0.12, 1.25, 0.18, 0.2, 0, 160)), dot(0.3, 0.3)],
      steps: ['קו ישר מהקו המקווקו למטה, מתחת לקו הבסיס, ומסיימים בוו שמאלה.', 'נקודה מעל.'] },
    k: { w: 0.45, s: [seg(0, 0, 0, 1), poly([0.42, 0.5], [0, 0.78], [0.45, 1])],
      steps: ['קו ישר ארוך מהקו העליון עד קו הבסיס.', 'מהקו המקווקו בצד ימין: קו באלכסון אל המקל, ומשם באלכסון למטה וימינה.'] },
    l: { w: 0.1, s: [seg(0.05, 0, 0.05, 1)],
      steps: ['קו ישר ארוך מהקו העליון עד קו הבסיס.'] },
    m: { w: 0.8, s: [seg(0, 0.5, 0, 1), cat(arc(0.2, 0.72, 0.2, 0.22, 180, 360), seg(0.4, 0.72, 0.4, 1)), cat(arc(0.6, 0.72, 0.2, 0.22, 180, 360), seg(0.8, 0.72, 0.8, 1))],
      steps: ['קו ישר קצר מהקו המקווקו עד קו הבסיס.', 'גשר ראשון: עולים מהמקל, מסובבים ויורדים.', 'גשר שני, צמוד לראשון.'] },
    n: { w: 0.48, s: [seg(0, 0.5, 0, 1), cat(arc(0.24, 0.74, 0.24, 0.24, 180, 360), seg(0.48, 0.74, 0.48, 1))],
      steps: ['קו ישר קצר מהקו המקווקו עד קו הבסיס.', 'גשר אחד: עולים מהמקל, מסובבים ויורדים עד קו הבסיס.'] },
    o: { w: 0.48, s: [arc(0.24, 0.75, 0.24, 0.25, -90, -450)],
      steps: ['עיגול קטן בין הקו המקווקו לקו הבסיס: מתחילים למעלה ומסובבים שמאלה עד שהוא נסגר.'] },
    p: { w: 0.5, s: [seg(0, 0.5, 0, 1.45), arc(0.24, 0.75, 0.24, 0.25, 180, 540)],
      steps: ['קו ישר מהקו המקווקו למטה, עד מתחת לקו הבסיס.', 'מהמקל: בטן עגולה בצד ימין, בין הקו המקווקו לקו הבסיס.'] },
    q: { w: 0.5, s: [bowl(), seg(0.45, 0.5, 0.45, 1.45)],
      steps: ['עיגול קטן בין הקו המקווקו לקו הבסיס, כמו ב-a.', 'קו ישר מהקו המקווקו למטה, עד מתחת לקו הבסיס, צמוד לעיגול מימין.'] },
    r: { w: 0.4, s: [seg(0, 0.5, 0, 1), arc(0.22, 0.74, 0.22, 0.22, 180, 315)],
      steps: ['קו ישר קצר מהקו המקווקו עד קו הבסיס.', 'מהמקל: קשת קטנה למעלה וימינה, חצי גשר.'] },
    s: { w: 0.4, s: [cat(arc(0.2, 0.625, 0.19, 0.125, -20, -270), arc(0.2, 0.875, 0.2, 0.125, -90, 160))],
      steps: ['S קטנה בין הקו המקווקו לקו הבסיס: מתחילים מימין, מסובבים שמאלה, יורדים לצד ימין וחוזרים שמאלה.'] },
    t: { w: 0.4, s: [seg(0.15, 0.15, 0.15, 1), seg(0, 0.5, 0.38, 0.5)],
      steps: ['קו ישר מעט מתחת לקו העליון, עד קו הבסיס.', 'קו שוכב קצר על הקו המקווקו.'] },
    u: { w: 0.48, s: [cat(seg(0, 0.5, 0, 0.76), arc(0.23, 0.76, 0.23, 0.24, 180, 0), seg(0.46, 0.76, 0.46, 0.5)), seg(0.46, 0.5, 0.46, 1)],
      steps: ['מהקו המקווקו: יורדים, מסובבים בתחתית ועולים בצד ימין עד הקו המקווקו.', 'קו ישר קצר למטה, בצד ימין.'] },
    v: { w: 0.48, s: [poly([0, 0.5], [0.24, 1], [0.48, 0.5])],
      steps: ['קו באלכסון מהקו המקווקו עד קו הבסיס, ובלי להרים: באלכסון למעלה עד הקו המקווקו.'] },
    w: { w: 0.7, s: [poly([0, 0.5], [0.175, 1], [0.35, 0.62], [0.525, 1], [0.7, 0.5])],
      steps: ['כמו שני v צמודים, בין הקו המקווקו לקו הבסיס: למטה, למעלה, למטה, למעלה.'] },
    x: { w: 0.45, s: [seg(0, 0.5, 0.45, 1), seg(0.45, 0.5, 0, 1)],
      steps: ['קו באלכסון מהקו המקווקו (משמאל) עד קו הבסיס (מימין).', 'קו באלכסון מהקו המקווקו (מימין) עד קו הבסיס (משמאל).'] },
    y: { w: 0.5, s: [seg(0, 0.5, 0.25, 1), seg(0.5, 0.5, 0.1, 1.45)],
      steps: ['קו קצר באלכסון מהקו המקווקו (משמאל) עד קו הבסיס.', 'קו ארוך באלכסון מהקו המקווקו (מימין), למטה ושמאלה, עד מתחת לקו הבסיס.'] },
    z: { w: 0.45, s: [poly([0, 0.5], [0.45, 0.5], [0, 1], [0.45, 1])],
      steps: ['קו שוכב על הקו המקווקו, קו באלכסון למטה ושמאלה, וקו שוכב על קו הבסיס, בלי להרים את האצבע.'] },
  };
  const ASC = 'bdfhklt', DESC = 'gjpqy';
  const tmpl = ch => UP[ch] || LO[ch] || null;
  const isUpper = ch => !!UP[ch];

  // כלל המיקום של האות בין הקווים (הסבר על אות גדולה וקטנה)
  function caseRule(ch) {
    if (isUpper(ch)) return `${ch} היא אות גדולה (Capital). אות גדולה תמיד מתחילה בקו העליון ונגמרת בקו הבסיס.`;
    if (ASC.includes(ch)) return `${ch} היא אות קטנה עם מקל ארוך: המקל עולה עד הקו העליון, והבטן או הגוף נמצאים בין הקו המקווקו לקו הבסיס.`;
    if (DESC.includes(ch)) return `${ch} היא אות קטנה עם זנב: הגוף שלה בין הקו המקווקו לקו הבסיס, והזנב יורד מתחת לקו הבסיס.`;
    if (ch === 'i' || ch === 'j') return `${ch} היא אות קטנה: הגוף שלה מתחיל בקו המקווקו, והנקודה מעליו.`;
    return `${ch} היא אות קטנה: כל כולה נכתבת בין הקו המקווקו לקו הבסיס.`;
  }
  const GENERAL = [
    'באנגלית כותבים משמאל לימין, הפוך מעברית.',
    'אות גדולה (Capital) מתחילה בקו העליון ונגמרת בקו הבסיס.',
    'אות קטנה נכתבת בין הקו המקווקו לקו הבסיס. לחלק מהאותיות הקטנות יש מקל שעולה עד הקו העליון (b d f h k l t), ולחלק יש זנב שיורד מתחת לקו הבסיס (g j p q y).',
    'קווים ישרים כותבים מלמעלה למטה, ועיגולים מתחילים למעלה ומסובבים שמאלה (נגד כיוון השעון).',
  ];

  // ---------- גאומטריה ----------
  const bbox = pts => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(p => { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; });
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  };
  const len = s => { let L = 0; for (let i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); return L; };
  function resampleStroke(s, n) {
    if (s.length < 2 || n < 2) return [s[0]];
    const L = len(s), step = L / (n - 1), out = [s[0].slice()];
    let acc = 0, prev = s[0];
    for (let i = 1; i < s.length && out.length < n; i++) {
      let cur = s[i], d = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
      while (acc + d >= step && out.length < n) {
        const t = (step - acc) / d, p = [prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t];
        out.push(p); prev = p; d = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]); acc = 0;
      }
      acc += d; prev = cur;
    }
    while (out.length < n) out.push(s[s.length - 1].slice());
    return out;
  }
  const DOT_MAX = 0.07; // קו קצר מזה נחשב לנקודה
  // המרת קווים לסט נקודות אחיד: N נקודות לפי אורך, ונקודה נחשבת כמה פעמים
  function smooth(s) { // החלקה קלה של רעד האצבע
    if (s.length < 5) return s;
    return s.map((p, i) => { if (i === 0 || i === s.length - 1) return p; const a = s[i - 1], b = s[i + 1]; return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4]; });
  }
  function withTangents(pts) { // לכל נקודה: כיוון הקו (בלי סימן), כדי שקשקוש לא ייחשב כאות
    return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); return [p[0], p[1], L ? dx / L : 0, L ? dy / L : 0]; });
  }
  function sample(strokes, N) {
    const parts = strokes.map(s => ({ s, dot: s.length < 2 || len(s) < DOT_MAX }));
    const lines = parts.filter(p => !p.dot), total = lines.reduce((a, p) => a + len(p.s), 0) || 1;
    const out = [];
    parts.forEach(p => {
      if (p.dot) { const b = bbox(p.s), c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0, 0]; for (let k = 0; k < 3; k++) out.push(c); return; }
      withTangents(resampleStroke(p.s, Math.max(3, Math.round(N * len(p.s) / total)))).forEach(q => out.push(q));
    });
    return out;
  }
  function normalize(pts) {
    const b = bbox(pts), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, s = Math.max(b.w, b.h, 0.05);
    return pts.map(p => [(p[0] - cx) / s, (p[1] - cy) / s, p[2] || 0, p[3] || 0]);
  }
  const TAN_W = 0.06;
  function oneWay(a, b) {
    let sum = 0;
    for (const p of a) {
      let m = Infinity;
      for (const q of b) {
        const d = Math.sqrt((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2);
        if (d - TAN_W >= m) continue;
        const tw = (p[2] || p[3]) && (q[2] || q[3]) ? 1 - Math.abs(p[2] * q[2] + p[3] * q[3]) : 0;
        const c = d + TAN_W * tw;
        if (c < m) m = c;
      }
      sum += m;
    }
    return sum / a.length;
  }
  const chamfer = (a, b) => { const x = oneWay(a, b), y = oneWay(b, a); return 0.5 * Math.max(x, y) + 0.25 * (x + y); };
  const N = 56;
  const tCache = {};
  function tPoints(ch, alt) { const k = ch + (alt || 0); if (!tCache[k]) { const t = tmpl(ch), s = alt ? t.alt[alt - 1] : t.s; tCache[k] = normalize(sample(s, N)); } return tCache[k]; }
  function shapeDist(kidNorm, ch) {
    const t = tmpl(ch); let best = chamfer(kidNorm, tPoints(ch));
    (t.alt || []).forEach((_, i) => { best = Math.min(best, chamfer(kidNorm, tPoints(ch, i + 1))); });
    return best;
  }
  // סדר המועמדים: כל האותיות באותה צורת כתיבה (גדולות או קטנות)
  const UPPERS = Object.keys(UP), LOWERS = Object.keys(LO);
  function classify(kidUnits, pool) {
    const kn = normalize(sample(kidUnits, N));
    return (pool || LOWERS).map(ch => ({ ch, d: shapeDist(kn, ch) })).sort((a, b) => a.d - b.d);
  }
  const signedArea = s => { let a = 0; for (let i = 1; i < s.length; i++) a += s[i - 1][0] * s[i][1] - s[i][0] * s[i - 1][1]; return a / 2; };

  // ---------- בדיקת הכתיבה ----------
  // strokes: מערך קווים בפיקסלים [[x,y]...]; guide: {top, base} בפיקסלים (y של הקו העליון ושל קו הבסיס)
  const SHAPE_OK = 0.115, SHAPE_CLOSE = 0.14, POS_TOL = 0.22, TIE = 0.006, TURN_MAX = 4.0;
  function toUnits(strokes, guide) {
    const H = guide.base - guide.top;
    return strokes.filter(s => s && s.length).map(s => smooth(s.map(p => [(Array.isArray(p) ? p[0] : p.x) / H, ((Array.isArray(p) ? p[1] : p.y) - guide.top) / H])));
  }
  function evaluate(strokesPx, guide, ch) {
    const t = tmpl(ch);
    const res = { letter: ch, ok: false, stars: 0, issues: [], tips: [], guess: null, d: null };
    const ku = toUnits(strokesPx, guide).filter(s => s.length);
    const totalLen = ku.reduce((a, s) => a + len(s), 0);
    if (!ku.length || totalLen < 0.12) { res.issues.push('empty'); res.tips.push('לא ראיתי כתיבה. כותבים את האות בגדול, על הקווים.'); return res; }
    const upper = isUpper(ch), pool = upper ? UPPERS : LOWERS;
    const ranked = classify(ku, pool);
    // מתחרה נחשב רק אם גם המיקום שלו על הקווים מתאים לכתיבה (למשל p יורדת מתחת לקו הבסיס ו-r לא)
    const kb0 = bbox([].concat(...ku));
    const fits = c => { if (c === ch) return true; const b = bbox([].concat(...tmpl(c).s)); return Math.abs(kb0.y0 - b.y0) <= 0.35 && Math.abs(kb0.y1 - b.y1) <= 0.35; };
    const mine = ranked.find(r => r.ch === ch), top = ranked.find(r => fits(r.ch)) || ranked[0];
    res.d = mine.d; res.guess = top.ch;
    const other = upper ? ch.toLowerCase() : ch.toUpperCase();
    const kn = normalize(sample(ku, N));
    const dOther = shapeDist(kn, other);
    const shapeOk = mine.d <= SHAPE_OK && (top.ch === ch || mine.d - top.d < TIE);
    // אות מהצורה השנייה (גדולה במקום קטנה או להפך), כשהצורות שונות
    const sameShape = 'cosuvwxzpjk'.includes(ch.toLowerCase());
    if (!sameShape && dOther + 0.03 < mine.d && dOther <= SHAPE_OK) {
      res.issues.push('case');
      res.tips.push(upper ? `כתבת ${other} קטנה. כאן כותבים ${ch} גדולה.` : `כתבת ${other} גדולה. כאן כותבים ${ch} קטנה.`);
      return finish(res, false);
    }
    // נקודה חסרה ב-i וב-j
    if (ch === 'i' || ch === 'j') {
      const dots = ku.filter(s => len(s) < DOT_MAX * 1.6 && bbox(s).y1 < 0.5);
      if (!dots.length) { res.issues.push('dot'); res.tips.push(`חסרה הנקודה של ${ch}. בלי נקודה זו אות אחרת.`); return finish(res, false); }
    }
    // אורך הדיו ביחס לאות (קשקוש ארוך מדי, או קו קצר מדי)
    const normLen = strokes => { const b = bbox([].concat(...strokes)), s = Math.max(b.w, b.h, 0.05); return strokes.reduce((a, st) => a + len(st), 0) / s; };
    const ratio = normLen(ku) / normLen(t.s);
    // כמה הקו מתפתל: קשקוש מסתובב הרבה יותר מכל אות
    const turning = strokes => strokes.reduce((acc, st) => {
      const L = len(st); if (L < DOT_MAX) return acc;
      const r = resampleStroke(st, Math.max(4, Math.round(L / 0.12) + 1));
      for (let i = 2; i < r.length; i++) {
        const a1 = Math.atan2(r[i - 1][1] - r[i - 2][1], r[i - 1][0] - r[i - 2][0]), a2 = Math.atan2(r[i][1] - r[i - 1][1], r[i][0] - r[i - 1][0]);
        let da = Math.abs(a2 - a1); if (da > Math.PI) da = 2 * Math.PI - da; acc += da;
      }
      return acc;
    }, 0);
    const kLen = ku.reduce((a, st) => a + len(st), 0), tLen = t.s.reduce((a, st) => a + len(st), 0);
    res.turn = turning(ku) / Math.max(kLen, 1) - turning(t.s) / Math.max(tLen, 1); // פיתול עודף ליחידת אורך
    if (res.turn > TURN_MAX) { res.issues.push('shape'); res.tips.push('הקו יצא מתפתל מדי. מוחקים, צופים בהדגמה וכותבים לאט, קו אחרי קו.'); return finish(res, false); }
    if (ratio > 1.9 || ratio < 0.5) { res.issues.push('shape'); res.tips.push(ratio > 1.9 ? 'יש כאן הרבה קווים. מוחקים, צופים בהדגמה וכותבים רק את קווי האות.' : 'האות עוד לא שלמה. צפו בהדגמה וכתבו את כל הקווים.'); return finish(res, false); }
    const roughOk = !shapeOk && top.ch === ch && mine.d <= SHAPE_CLOSE; // צורה מבולגנת אבל ברור שזו האות
    if (roughOk) { res.issues.push('neat'); res.tips.push('זיהיתי את האות! נסו לכתוב אותה קצת יותר ברור, עם קווים ישרים ועיגולים סגורים.'); }
    if (!shapeOk && !roughOk) {
      if (top.ch !== ch && top.d <= SHAPE_OK) {
        res.issues.push('other');
        res.tips.push(`זה נראה לי כמו ${top.ch}.` + confusionTip(ch, top.ch));
      } else if (mine.d <= SHAPE_CLOSE) {
        res.issues.push('shape'); res.tips.push('כמעט! הצורה עוד לא ברורה מספיק. צפו בהדגמה ונסו שוב, לאט ובגדול.');
      } else {
        res.issues.push('shape'); res.tips.push('האות עוד לא יצאה. צפו בהדגמה ונסו שוב: לאט, בגדול, קו אחרי קו.');
      }
      return finish(res, false);
    }
    // מיקום על הקווים (גודל)
    const kb = bbox([].concat(...ku)), tb = bbox([].concat(...t.s));
    const tooHigh = kb.y0 < tb.y0 - POS_TOL, tooLow = kb.y1 > tb.y1 + POS_TOL, startsLow = kb.y0 > tb.y0 + POS_TOL, endsHigh = kb.y1 < tb.y1 - POS_TOL;
    if (tooHigh || tooLow || startsLow || endsHigh) {
      res.issues.push('pos');
      if (upper) {
        if (startsLow && endsHigh) res.tips.push('האות קטנה מדי. אות גדולה מתחילה בקו העליון ונגמרת בקו הבסיס.');
        else if (startsLow) res.tips.push('אות גדולה מתחילה בקו העליון. נסו להתחיל גבוה יותר.');
        else if (tooHigh) res.tips.push('האות יצאה מעל הקו העליון. אות גדולה מתחילה בדיוק בקו העליון.');
        if (tooLow) res.tips.push('האות ירדה מתחת לקו הבסיס. היא צריכה לעמוד על קו הבסיס.');
        else if (endsHigh && !startsLow) res.tips.push('האות לא הגיעה עד קו הבסיס.');
      } else if (DESC.includes(ch) && endsHigh) res.tips.push(`הזנב של ${ch} יורד מתחת לקו הבסיס.`);
      else if (ASC.includes(ch) && startsLow) res.tips.push(`המקל של ${ch} עולה עד הקו העליון.`);
      else if (tooHigh) res.tips.push(`${ch} היא אות קטנה: היא נכתבת בין הקו המקווקו לקו הבסיס, ולא עולה למעלה.`);
      else if (tooLow && !DESC.includes(ch)) res.tips.push(`ל-${ch} אין זנב: היא עומדת על קו הבסיס ולא יורדת מתחתיו.`);
      else if (startsLow) res.tips.push(`${ch} מתחילה בקו המקווקו. נסו לכתוב אותה קצת יותר גדולה.`);
      else res.tips.push(`${ch} עומדת על קו הבסיס.`);
    }
    // כיוון הכתיבה: רק כשמספר הקווים זהה לתבנית (אחרת אי אפשר להשוות קו לקו)
    const kLines = ku.filter(s => len(s) >= DOT_MAX), tLines = t.s.filter(s => s.length > 1);
    if (kLines.length === tLines.length) {
      const all = [].concat(...ku), b = bbox(all), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, sc = Math.max(b.w, b.h, 0.05);
      const tAll = [].concat(...t.s), tb2 = bbox(tAll), tcx = (tb2.x0 + tb2.x1) / 2, tcy = (tb2.y0 + tb2.y1) / 2, tsc = Math.max(tb2.w, tb2.h, 0.05);
      const nk = kLines.map(s => s.map(p => [(p[0] - cx) / sc, (p[1] - cy) / sc]));
      const nt = tLines.map(s => s.map(p => [(p[0] - tcx) / tsc, (p[1] - tcy) / tsc]));
      const used = new Set();
      let reversed = 0, orient = 0;
      nt.forEach(ts => {
        let bi = -1, bd = Infinity;
        nk.forEach((ks, i) => { if (used.has(i)) return; const d = chamfer(resampleStroke(ks, 16), resampleStroke(ts, 16)); if (d < bd) { bd = d; bi = i; } });
        if (bi < 0) return; used.add(bi);
        const ks = nk[bi], d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
        const ts0 = ts[0], ts1 = ts[ts.length - 1], k0 = ks[0], k1 = ks[ks.length - 1];
        const closed = d(ts0, ts1) < 0.2;
        if (closed) { const a1 = signedArea(ts), a2 = signedArea(ks); if (Math.abs(a2) > 0.02 && Math.sign(a1) !== Math.sign(a2)) orient++; }
        else if (d(k0, ts1) + d(k1, ts0) < d(k0, ts0) + d(k1, ts1) - 0.25) reversed++;
      });
      if (reversed) { res.issues.push('dir'); res.tips.push(reversed > 1 ? 'כמה קווים נכתבו בכיוון הפוך. כותבים מלמעלה למטה ומשמאל לימין.' : 'אחד הקווים נכתב בכיוון הפוך. כותבים מלמעלה למטה ומשמאל לימין.'); }
      if (orient) { res.issues.push('dir'); res.tips.push('את העיגול מתחילים למעלה ומסובבים שמאלה, נגד כיוון השעון.'); }
    }
    return finish(res, true);
  }
  function finish(res, ok) {
    res.ok = ok;
    res.stars = !ok ? (res.issues.includes('empty') ? 0 : 1) : res.issues.length ? 2 : 3;
    return res;
  }
  const PAIRS = { 'b|d': 'ב-b המקל בא קודם ואחריו הבטן (כמו ב-B גדולה). ב-d קודם העיגול ואחריו המקל.', 'p|q': 'ב-p הבטן מימין למקל, וב-q משמאל.', 'n|u': 'n היא גשר שפתוח למטה, ו-u היא כוס שפתוחה למעלה.', 'm|w': 'm היא שני גשרים שפתוחים למטה, ו-w פתוחה למעלה.', 'h|n': 'ל-h יש מקל ארוך עד הקו העליון, ול-n מקל קצר.', 'b|p': 'ב-b המקל עולה למעלה, וב-p הוא יורד מתחת לקו הבסיס.', 'd|q': 'ב-d המקל עולה למעלה, וב-q הוא יורד מתחת לקו הבסיס.', 'i|l': 'ל-i יש נקודה ומקל קצר, ול-l מקל ארוך בלי נקודה.', 'M|W': 'M עומדת על שתי רגליים והחודים למעלה, ו-W היא ההפך.', 'N|Z': 'ב-N שני המקלות עומדים, וב-Z הקווים שוכבים.' };
  function confusionTip(want, got) {
    const k1 = `${want}|${got}`, k2 = `${got}|${want}`;
    return PAIRS[k1] || PAIRS[k2] ? ' ' + (PAIRS[k1] || PAIRS[k2]) : ` כאן כותבים ${want}.`;
  }

  // ---------- ציור ----------
  // מחזיר את קווי התבנית בפיקסלים, כשהאות ממורכזת ב-cx
  function templatePx(ch, guide, cx) {
    const t = tmpl(ch), H = guide.base - guide.top, x0 = cx - (t.w * H) / 2;
    return t.s.map(s => s.map(p => [x0 + p[0] * H, guide.top + p[1] * H]));
  }
  return { UP, LO, ASC, DESC, GENERAL, tmpl, isUpper, caseRule, evaluate, classify, toUnits, templatePx, confusionTip, sample, normalize, chamfer, SHAPE_OK };
});
