// app.js — אפליקציית הילד: קוד משפחה (פעם אחת) → בחירת ילד (פעם אחת) → בית → סבב (כל הנושאים, 3–5 שאלות בכל נושא) → פידבק.
import { getFamily, joinFamily, refreshFamily, leaveFamily, loadKid, saveKid, restoreKid, onStatus, getStatus, syncNow, isPreview, getPreviewLevel, previewReset } from './store.js';
import { normCode, showCode } from './family.js';
import * as EUI from './english-ui.js';

const E = window.MathEngine, I = window.Insights, T = window.TimesEngine, A = window.Ability, EN = window.EnglishEngine, G4 = window.Grade4;
const app = document.getElementById('app');
const ME = 'mathapp:v2:me';

let family = null, kid = null, data = null, run = null, view = '';

// ---------- עזרי תצוגה ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function rich(s) { // שברים ⟦מונה|מכנה⟧ ותיבת ▢ → HTML
  return esc(s)
    .replace(/⟦(\d+|▢)\|(\d+)⟧/g, (m, n, d) => `<span class="fr" dir="ltr"><span>${n === '▢' ? '<i class="box"></i>' : n}</span><span>${d}</span></span>`)
    .replace(/▢/g, '<i class="box"></i>');
}
const plain = s => String(s).replace(/⟦(\d+|▢)\|(\d+)⟧/g, '$1/$2');
// משוואה: סימן הפעולה נשאר צמוד למספר שאחריו, ושבירת שורה מותרת רק בין איברים
function eqHtml(s) {
  const p = String(s).split(' '), out = [];
  for (let i = 0; i < p.length; i++) {
    if (/^[+−×÷=]$/.test(p[i]) && i + 1 < p.length) { out.push(`<span class="nb">${rich(p[i])}&nbsp;${rich(p[i + 1])}</span>`); i++; }
    else out.push(`<span class="nb">${rich(p[i])}</span>`);
  }
  return out.join(' ');
}
const eqSize = s => (plain(s).length > 26 ? 'sm' : plain(s).length > 16 ? 'md' : '');
// תוכניות תרגול: "test" (הכנה למבדק, 5 נושאים) ו-"times" (לוח הכפל). להוספת תוכנית חדשה ראו README.
const TIMES_META = { id: 'times', short: 'לוח הכפל', icon: '✖️' };
const topicOf = id => (id === 'times' ? TIMES_META : E.TOPICS.find(t => t.id === id) || G4.TOPICS.find(t => t.id === id));
const isG4 = id => G4.IDS.includes(id);
const inT = short => 'ב' + String(short).replace(/^ה/, ''); // "בלוח הכפל", "במיליון"
const levelOf = id => (id === 'times' ? data.programs.times.levels.times : isG4(id) ? data.programs.g4.levels[id] : data.profile.levels[id]);
const profileOf = program => (program === 'times' ? data.programs.times : program === 'g4' ? data.programs.g4 : data.profile);
const isLtrChoice = c => /^[\d,<>=+\-×÷ .▢]+$/.test(c);
const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const g = (m, f) => (kid && kid.gender === 'f' ? f : m);

const readMe = () => { try { return localStorage.getItem(ME); } catch (e) { return null; } };
const writeMe = v => { if (isPreview()) return; try { v ? localStorage.setItem(ME, v) : localStorage.removeItem(ME); } catch (e) { /* ignore */ } };

function daysToTest() {
  if (!family || !family.test || !family.test.date) return null;
  return Math.round((new Date(family.test.date + 'T00:00:00') - new Date(E.dayKey() + 'T00:00:00')) / 864e5);
}
function countdownText() {
  const d = daysToTest();
  if (d === null) return '';
  if (d > 1) return `עד ${family.test.name || 'המבדק'}: ${d} ימים`;
  if (d === 1) return `${family.test.name || 'המבדק'} מחר`;
  if (d === 0) return `${family.test.name || 'המבדק'} היום`;
  return '';
}
const syncText = s => ({ ok: 'התוצאות נשלחו להורים ✓', pending: 'שולח תוצאות…', offline: 'התוצאות יישלחו כשיהיה חיבור', error: 'התוצאות יישלחו כשיהיה חיבור', off: '' }[s] || '');

// ---------- נושאים: צבע, תיאור ואנימציית פתיחה ----------
const TAG = {
  numline: 'ישר המספרים ומספרים שליליים', gematria: 'מספרים באותיות עבריות', order: 'סדר פעולות, 0 ו-1 וחזקות', divis: 'סימני התחלקות ומספרים ראשוניים',
  fracops: 'חיבור וחיסור שברים', measure: 'שטח, היקף, נפח וזמן', data: 'דיאגרמות וסיכויים', shapes: 'משולשים, תיבות וסימטרייה',
  million: 'מספרים גדולים עד מיליון', addsub: 'חיבור, חיסור ובעיות מילוליות', fractions: 'חלקים של שלם',
  muldiv: 'כפל, חילוק ושארית', geometry: 'צורות, צלעות ואלכסונים', times: 'כפל וחילוק עד 100',
};
const BURST = { numline: '📏', gematria: '✡️', order: '🧮', divis: '🔍', fracops: '🥧', measure: '📐', data: '📊', shapes: '🔺', million: '✨', addsub: '➕', fractions: '🍕', muldiv: '✖️', geometry: '🔷', times: '⭐' };
function slicePath(i, n, r, cx, cy) {
  const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
  const p = (a) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  return `M${cx} ${cy} L${p(a0)} A${r} ${r} 0 0 1 ${p(a1)} Z`;
}
function hero(id) {
  if (id === 'million') {
    return `<div class="hero h-million" aria-hidden="true"><div class="digits">${'1,000,000'.split('').map((c, i) => `<b style="--i:${i}">${c}</b>`).join('')}</div>
      <i class="sp" style="--x:12%;--y:18%;--d:0s">✦</i><i class="sp" style="--x:86%;--y:26%;--d:.6s">✦</i><i class="sp" style="--x:70%;--y:78%;--d:1.1s">✦</i><i class="sp" style="--x:22%;--y:74%;--d:1.6s">✦</i></div>`;
  }
  if (id === 'addsub') {
    return `<div class="hero h-addsub" aria-hidden="true"><div class="beam"><span class="pan l"><b>+</b></span><span class="pan r"><b>−</b></span></div><i class="stand"></i></div>`;
  }
  if (id === 'fractions') {
    const n = 8;
    return `<div class="hero h-fractions" aria-hidden="true"><svg viewBox="0 0 140 140"><g class="pizza">${Array.from({ length: n }, (_, i) =>
      `<path class="sl" style="--i:${i}" d="${slicePath(i, n, 56, 70, 70)}"/>`).join('')}</g></svg></div>`;
  }
  if (id === 'muldiv') {
    const rows = 3, cols = 5;
    return `<div class="hero h-muldiv" aria-hidden="true"><div class="grid">${Array.from({ length: rows * cols }, (_, k) =>
      `<i style="--r:${Math.floor(k / cols)};--c:${k % cols}"></i>`).join('')}</div><div class="eqn">3 × 5 = 15</div></div>`;
  }
  if (id === 'times') { // צפרדע שקופצת על ציר המספרים בקפיצות של 4 (ספירה בקפיצות = כפל)
    return `<div class="hero h-times" aria-hidden="true"><div class="jump"><span class="frog"><i>🐸</i></span></div>
      <div class="nline">${[0, 4, 8, 12, 16, 20].map(n => `<b>${n}</b>`).join('')}</div><div class="eqn">4 × 5 = 20</div></div>`;
  }
  if (isG4(id)) { const t = topicOf(id); return `<div class="hero h-g4" aria-hidden="true"><b class="g4ic">${t.icon}</b><i class="sp" style="--x:14%;--y:22%;--d:0s">✦</i><i class="sp" style="--x:84%;--y:30%;--d:.7s">✦</i><i class="sp" style="--x:72%;--y:80%;--d:1.2s">✦</i></div>`; }
  const pts = Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * 2 * Math.PI - Math.PI / 2; return [70 + 52 * Math.cos(a), 70 + 52 * Math.sin(a)]; });
  const pp = pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
  return `<div class="hero h-geometry" aria-hidden="true"><svg viewBox="0 0 140 140"><polygon class="shape" points="${pp}"/>
    ${[2, 3, 4].map(k => `<line class="diag" style="--k:${k}" x1="${pts[0][0].toFixed(1)}" y1="${pts[0][1].toFixed(1)}" x2="${pts[k][0].toFixed(1)}" y2="${pts[k][1].toFixed(1)}"/>`).join('')}
    ${pts.map((p, i) => `<circle class="vx" style="--i:${i}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5"/>`).join('')}</svg></div>`;
}
function burst(topic, ok) { // חלקיקים עולים מכרטיס השאלה אחרי תשובה נכונה
  if (reduced()) return;
  const card = document.querySelector('.qcard');
  if (!card) return;
  const r = card.getBoundingClientRect(), box = document.createElement('div');
  box.className = 'burst'; box.setAttribute('aria-hidden', 'true');
  box.style.left = (r.left + r.width / 2) + 'px'; box.style.top = (r.top + r.height / 2) + 'px';
  box.innerHTML = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * 2 * Math.PI, d = 70 + Math.random() * 60;
    return `<span style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d - 40)}px;--r:${Math.round(Math.random() * 120 - 60)}deg;--s:${(0.9 + Math.random() * 0.8).toFixed(2)}">${BURST[topic]}</span>`;
  }).join('');
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 1100);
}
function confetti(n) {
  const cols = ['#FFC83D', '#2F63D6', '#E0524A', '#0E6B4C', '#7C3AED'];
  return `<div class="confetti" aria-hidden="true">${Array.from({ length: n }, (_, i) =>
    `<i style="--x:${Math.round(Math.random() * 100)}%;--d:${(Math.random() * 1.2).toFixed(2)}s;--t:${(2.2 + Math.random() * 1.6).toFixed(2)}s;--c:${cols[i % cols.length]};--r:${Math.round(Math.random() * 360)}deg"></i>`).join('')}</div>`;
}

// ---------- דמות: "ספרון", דמות מקורית שמלווה את הילד. מצב רוח: happy | cheer | think | oops ----------
function mascot(mood) {
  const eyes = mood === 'cheer'
    ? '<path class="mk" d="M33 47 Q39 39 45 47 M55 47 Q61 39 67 47" fill="none"/>'
    : mood === 'oops'
      ? '<circle cx="39" cy="47" r="6.5" fill="#fff"/><circle cx="61" cy="47" r="6.5" fill="#fff"/><circle cx="40" cy="49" r="3.2" fill="#1B2A4A"/><circle cx="62" cy="49" r="3.2" fill="#1B2A4A"/>'
      : '<circle cx="39" cy="47" r="6.5" fill="#fff"/><circle cx="61" cy="47" r="6.5" fill="#fff"/><circle cx="40" cy="46" r="3.2" fill="#1B2A4A"/><circle cx="62" cy="46" r="3.2" fill="#1B2A4A"/>';
  const mouth = mood === 'cheer' ? '<path d="M38 60 Q50 80 62 60 Z" fill="#1B2A4A"/><path d="M44 68 Q50 74 56 68 Q50 65 44 68Z" fill="#FF8FA3"/>'
    : mood === 'think' ? '<path class="mk" d="M42 66 L58 66" fill="none"/><path class="mk" d="M54 38 L66 35" fill="none"/>'
    : mood === 'oops' ? '<ellipse cx="50" cy="67" rx="4.5" ry="5" fill="#1B2A4A"/>'
    : '<path class="mk" d="M38 62 Q50 74 62 62" fill="none"/>';
  const arms = mood === 'cheer' ? '<path class="mk arm" d="M20 60 Q8 44 14 32 M80 60 Q92 44 86 32" fill="none"/>' : '<path class="mk arm" d="M20 64 Q12 70 15 78 M80 64 Q88 70 85 78" fill="none"/>';
  return `<svg class="mascot ${mood}" viewBox="0 0 100 100" role="img" aria-label="ספרון, הדמות שמתרגלת איתך" focusable="false">
    <g class="ant"><path class="mk" d="M50 24 L50 11" fill="none"/><path class="star" d="M50 2 L52.6 7.4 L58.6 8.2 L54.2 12.3 L55.3 18.2 L50 15.4 L44.7 18.2 L45.8 12.3 L41.4 8.2 L47.4 7.4Z"/></g>
    <ellipse class="bd" cx="50" cy="56" rx="33" ry="31"/><ellipse class="bl" cx="50" cy="66" rx="19" ry="14"/>
    ${arms}${eyes}<circle cx="29" cy="58" r="5" fill="#FF8FA3" opacity=".55"/><circle cx="71" cy="58" r="5" fill="#FF8FA3" opacity=".55"/>${mouth}
    <ellipse class="ft" cx="38" cy="87" rx="9" ry="4.5"/><ellipse class="ft" cx="62" cy="87" rx="9" ry="4.5"/></svg>`;
}
const OOPS = ['לא נורא, לומדים מזה', 'כמעט! נסו שוב בפעם הבאה', 'כל טעות מלמדת משהו'];

// ---------- מסכים ----------
function viewCode(err) {
  view = 'code';
  app.innerHTML = `<main class="screen who">
    <h1>קוד משפחה</h1>
    <p class="lead">ההורה מקבל קוד בלוח ההורה, ומזינים אותו כאן פעם אחת.</p>
    <input id="code" class="code-in" dir="ltr" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="9" placeholder="ABCD-EFGH" aria-label="קוד משפחה">
    <p class="err" id="err" role="alert">${err ? esc(err) : ''}</p>
    <button class="btn primary big" data-act="join">כניסה</button>
  </main>`;
  const el = document.getElementById('code');
  el.addEventListener('input', () => { const c = normCode(el.value).slice(0, 8); el.value = c.length > 4 ? c.slice(0, 4) + '-' + c.slice(4) : c; });
  el.addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });
}
async function doJoin() {
  const el = document.getElementById('code'), btn = document.querySelector('[data-act="join"]');
  if (!el || btn.disabled) return;
  btn.disabled = true; btn.textContent = 'בודק…';
  try {
    family = await joinFamily(el.value);
    viewWho();
  } catch (e) {
    const m = { 'bad-code': 'הקוד צריך להיות 8 תווים (אותיות באנגלית ומספרים).', 'not-found': 'לא מצאתי משפחה עם הקוד הזה. כדאי לבדוק מול ההורה.', offline: 'אין חיבור לאינטרנט. מתחברים לרשת ומנסים שוב.', network: 'לא הצלחתי להתחבר. מנסים שוב בעוד רגע.' }[e.message] || 'משהו השתבש. מנסים שוב.';
    viewCode(m);
    const n = document.getElementById('code'); if (n) { n.value = el.value; n.focus(); }
  }
}

function viewWho() {
  view = 'who';
  const roster = family.roster;
  app.innerHTML = `<main class="screen who">
    <h1>מי מתרגל?</h1>${family.mode === 'preview' ? '<p class="lead">ילדים לדוגמה לבדיקת האפליקציה. אפשר לבחור למעלה באיזו רמה יהיו השאלות. כל מה שעונים כאן לא נשמר ולא נספר בציון.</p>' : ''}
    ${roster.length ? `<div class="who-btns">${roster.map(k => `<button class="kid-btn" data-act="pick" data-id="${esc(k.id)}" style="--kc:${esc(k.color || '#2F63D6')}"><span class="em" aria-hidden="true">${esc(k.emoji || '🙂')}</span>${esc(k.name)}</button>`).join('')}</div>`
      : `<p class="lead">עדיין אין ילדים במשפחה הזו. ההורה מוסיף אותם בלוח ההורה.</p><button class="btn" data-act="reload">רענון</button>`}
    <div class="spacer"></div>
    ${family.mode === 'family' ? '<button class="link" data-act="leave">החלפת קוד משפחה</button>' : ''}
  </main>`;
}

function viewHome() {
  view = 'home'; run = null;
  const today = E.dayKey(), tp = data.profile, xp = data.programs.times, ep = data.programs.english, gp = data.programs.g4;
  const dt0 = tp.days[today] || { answered: 0, correct: 0, rounds: 0 }, dg = gp.days[today] || { answered: 0, rounds: 0 };
  const dt = { answered: dt0.answered + dg.answered, rounds: (dt0.rounds || 0) + (dg.rounds || 0) }, dx = xp.days[today] || { answered: 0, correct: 0, rounds: 0 }, de = ep.days[today] || { answered: 0, rounds: 0 };
  const streak = T.streakAny(tp, xp, undefined, ep);
  const answered = dt.answered + dx.answered + de.answered, rounds = (dt.rounds || 0) + (dx.rounds || 0) + (de.rounds || 0);
  const goal = Math.min(1, Math.max(dt.answered / E.ROUND_MIN, dx.answered / T.PER_SESSION, de.answered / 8));
  const sumSt = pr => Object.keys(pr.days || {}).reduce((s, d) => s + (pr.days[d].st || 0), 0), totalStars = sumSt(tp) + sumSt(xp) + sumSt(ep) + sumSt(gp);
  const cd = countdownText();
  app.innerHTML = `<main class="screen">
    <div class="top"><div class="greet"><div class="hm" aria-hidden="true">${mascot('happy')}</div><div><h1>שלום ${esc(kid.name)} ${esc(kid.emoji || '')}</h1><p class="ev">${esc(g('מוכן', 'מוכנה'))} להרפתקה של היום?</p></div></div><button class="link" data-act="switch">לא ${esc(kid.name)}?</button></div>
    <div class="chips" aria-label="הישגים"><span class="chip-s" aria-label="${totalStars} כוכבים">⭐ <b>${totalStars}</b></span>${streak > 0 ? `<span class="chip-s fire" aria-label="${streak} ימים ברצף">🔥 <b>${streak}</b></span>` : ''}</div>
    <section class="today" aria-label="תרגול היום">
      <div class="row"><span>היום</span><b>${answered} שאלות${rounds ? ` · ${rounds} ${rounds === 1 ? 'סבב' : 'סבבים'}` : ''}</b></div>
      <div class="goalbar" aria-hidden="true"><i style="width:${Math.round(goal * 100)}%"></i></div>
      <div class="ev">${goal >= 1 ? 'יעד היום הושג ✓' : 'יעד יומי: סבב אחד במתמטיקה או שיעור אחד באנגלית'}${streak > 0 ? ` · ${streak === 1 ? 'יום אחד ברצף' : streak + ' ימים ברצף'}` : ''}</div>
    </section>
    <p class="lead pick">מה לומדים היום?</p>
    <div class="subjects">
      <button class="subj s-math" data-act="subject" data-s="math" aria-label="מתמטיקה">
        <span class="sj-ic" aria-hidden="true"><b class="d1">7</b><b class="op">×</b><b class="d2">3</b></span>
        <span class="sj-tx"><b>מתמטיקה</b><small>הכנה למבדק · לוח הכפל · כל נושאי כיתה ד'</small>${cd ? `<small class="cdm">${esc(cd)}</small>` : ''}</span>
        <span class="sj-go" aria-hidden="true">←</span></button>
      <button class="subj s-eng" data-act="subject" data-s="english" aria-label="אנגלית">
        <span class="sj-ic" aria-hidden="true"><b class="d1">A</b><b class="op">b</b><b class="d2">C</b></span>
        <span class="sj-tx"><b>אנגלית</b><small>אותיות · מילים · כתיבה · דיבור</small>${ep.intro.L.length || ep.intro.W.length ? `<small class="cdm">${ep.intro.L.length} אותיות · ${ep.intro.W.length} מילים</small>` : ''}</span>
        <span class="sj-go" aria-hidden="true">←</span></button>
    </div>
    <p class="sync" id="sync">${syncText(getStatus())}</p>
  </main>`;
}
function viewMath() {
  view = 'math'; run = null;
  const today = E.dayKey(), tp = data.profile, xp = data.programs.times, g4 = data.programs.g4;
  const dt = tp.days[today] || { answered: 0, correct: 0, rounds: 0 }, dx = xp.days[today] || { answered: 0, correct: 0, rounds: 0 }, dg = g4.days[today] || { answered: 0, rounds: 0 };
  const cd = countdownText(), lvX = xp.levels.times;
  const labT = (dt.rounds || 0) > 0 ? 'סבב נוסף' : dt.answered > 0 ? 'ממשיכים' : 'מתחילים';
  const labX = (dx.rounds || 0) > 0 ? 'עוד תרגול' : 'מתחילים';
  app.innerHTML = `<main class="screen">
    <div class="sub-top"><button class="back" data-act="home" aria-label="חזרה לבחירת מקצוע">→</button><h1>🔢 מתמטיקה</h1></div>
    <p class="lead pick">מה מתרגלים?</p>
    <section class="prog t-test" aria-label="הכנה למבדק">
      <div class="ph"><span class="pi" aria-hidden="true"><i>📝</i><b class="fl f1">➕</b><b class="fl f2">🔷</b><b class="fl f3">🍕</b></span><div><h2>הכנה למבדק</h2><p class="ev">5 נושאי המבדק של בית הספר, 3 עד 5 שאלות בכל נושא</p></div></div>
      ${cd ? `<div class="countdown">${esc(cd)}</div>` : ''}
      <ul class="minilv" aria-label="רמות לפי נושא">${E.TOPICS.map(t => `<li aria-label="${esc(t.short)}, רמה ${tp.levels[t.id]}"><span aria-hidden="true">${t.icon}</span><b>${tp.levels[t.id]}</b></li>`).join('')}</ul>
      <button class="btn primary big" data-act="start" data-program="test">${labT}</button>
    </section>
    <section class="prog t-times" aria-label="לוח הכפל">
      <div class="ph"><span class="pi" aria-hidden="true"><i>✖️</i><b class="fl f1">7</b><b class="fl f2">🐸</b><b class="fl f3">9</b></span><div><h2>לוח הכפל</h2><p class="ev">10 שאלות, עד 100${lvX >= T.DIVISION_FROM ? ', כולל חילוק' : ''}</p></div></div>
      <div class="lvrow"><span class="pips" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= lvX ? 'on' : ''}"></i>`).join('')}</span><span class="ev">רמה ${lvX} · ${E.LEVEL_NAMES[lvX]}: ${T.LEVEL_INFO[lvX]}</span></div>
      <button class="btn primary big" data-act="start" data-program="times">${labX}</button>
    </section>
    <section class="prog t-g4" aria-label="כל נושאי כיתה ד'">
      <div class="ph"><span class="pi" aria-hidden="true"><i>🎓</i><b class="fl f1">📊</b><b class="fl f2">א</b><b class="fl f3">🔺</b></span><div><h2>כל נושאי כיתה ד'</h2><p class="ev">נושאים נוספים מתוכנית משרד החינוך, 4 נושאים בכל סבב</p></div></div>
      <ul class="minilv g4lv" aria-label="רמות לפי נושא">${G4.TOPICS.map(t => `<li aria-label="${esc(t.short)}, רמה ${g4.levels[t.id]}"><span aria-hidden="true">${t.icon}</span><b>${g4.levels[t.id]}</b></li>`).join('')}</ul>
      <button class="btn primary big" data-act="start" data-program="g4">${(dg.rounds || 0) > 0 ? 'עוד סבב' : 'מתחילים'}</button>
    </section>
    <p class="sync" id="sync">${syncText(getStatus())}</p>
  </main>`;
}

function viewIntro() {
  view = 'intro';
  const b = run.plan[run.b], t = topicOf(b.topic), lv = levelOf(b.topic), isT = b.topic === 'times';
  app.innerHTML = `<main class="screen intro t-${t.id}">
    <div class="qhead"><button class="x" data-act="quit" aria-label="חזרה למסך הבית">✕</button>${stepsHtml()}<span class="lvlchip"></span></div>
    <p class="ev">${isT ? 'תרגול' : `נושא ${run.b + 1} מתוך ${run.plan.length}`}</p>
    ${hero(t.id)}
    <h1>${t.icon} ${esc(t.short)}</h1>
    <p class="lead">${TAG[t.id]}</p>
    <p class="ev">${b.count} שאלות · רמה ${lv} (${E.LEVEL_NAMES[lv]})</p>
    ${isT ? `<p class="ev">${esc(T.LEVEL_INFO[lv])}</p>` : ''}
    <div class="spacer"></div>
    <div class="dock"><button class="btn primary big" data-act="begin">יאללה</button></div>
  </main>`;
}
function stepsHtml() {
  return `<div class="steps" role="img" aria-label="נושא ${run.b + 1} מתוך ${run.plan.length}">${run.plan.map((p, i) =>
    `<span class="st${i < run.b ? ' done' : i === run.b ? ' cur' : ''}">${topicOf(p.topic).icon}</span>`).join('')}</div>`;
}

function viewQuiz() {
  view = 'quiz';
  const q = run.q, t = topicOf(q.topic), b = run.plan[run.b];
  const dots = Array.from({ length: b.count }, (_, i) => {
    const r = run.blocks[run.b].results[i];
    return `<i class="${r ? (r.ok ? 'ok' : 'bad') : i === run.qi ? 'cur' : ''}"></i>`;
  }).join('');
  let input;
  if (q.kind === 'choice') {
    const ltr = q.choices.every(isLtrChoice);
    const long = q.choices.some(c => (!isLtrChoice(c) && plain(c).length > 18) || (isLtrChoice(c) && plain(c).length > 7));
    const layout = long ? '' : q.choices.length === 3 && ltr ? 'three' : (q.choices.length === 2 || q.choices.length === 4) ? 'two' : '';
    input = `<div class="choices ${layout}" role="group" aria-label="תשובות">${q.choices.map((c, i) =>
      `<button class="choice${isLtrChoice(c) ? ' ltr' : ''}" data-act="choose" data-i="${i}">${rich(c)}</button>`).join('')}</div>`;
  } else {
    input = `<div class="typed empty" id="typed" aria-live="off">כתבו את התשובה</div>
      <div class="pad" aria-label="מקלדת מספרים">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-act="key" data-k="${n}">${n}</button>`).join('')}
        <button data-act="del" aria-label="מחיקה">⌫</button><button data-act="key" data-k="0">0</button><button class="go" data-act="ok" aria-label="בדיקה">✓</button>
      </div>`;
  }
  app.innerHTML = `<main class="screen t-${t.id}">
    <div class="qhead"><button class="x" data-act="quit" aria-label="חזרה למסך הבית">✕</button>${stepsHtml()}<span class="lvlchip">רמה ${q.level}</span></div>
    <div class="qprog"><span>שאלה ${run.qi + 1} מתוך ${b.count}${run.skipped.length ? ` · ${run.skipped.length} ${run.skipped.length === 1 ? 'שאלה תחזור' : 'שאלות יחזרו'} בסוף` : ''}</span><div class="dots" aria-hidden="true">${dots}</div></div>
    <section class="qcard">
      <div class="tp"><span class="tic" aria-hidden="true">${t.icon}</span> ${esc(t.short)}${q.retried ? '<span class="retag">שאלה שדילגת עליה</span>' : ''}${q.retried ? '' : '<button class="skipbtn" data-act="skip" aria-label="דילוג על השאלה, היא תחזור בסוף">דלג ↷</button>'}</div>
      <p class="qtext">${rich(q.text)}</p>
      ${q.eq ? `<div class="eq ${eqSize(q.eq)}">${eqHtml(q.eq)}</div>` : ''}
      ${q.svg ? `<div class="fig">${q.svg}</div>` : ''}
    </section>
    <section class="answer">${input}</section>
    <div id="sheet"></div>
  </main>`;
}

function viewDone() {
  view = 'done';
  const blocks = run.blocks.filter(b => b.n > 0);
  const total = blocks.reduce((a, b) => a + b.n, 0), ok = run.correct;
  const fb = run.fb;
  const evFor = id => {
    const ev = run.events.filter(e => e.topic === id), up = ev.filter(e => e.event === 'up').length, dn = ev.length - up;
    return [up ? `↑ עלית ${up === 1 ? 'רמה' : up + ' רמות'}` : '', dn ? '↓ חוזרים צעד לחיזוק' : ''].filter(Boolean).join(', ');
  };
  const good = ok / total >= 0.7;
  const left = run.skipped.length, back = run.skips - left;
  const skipLine = run.skips ? `<p class="closing">${back > 0 ? `דילגת על ${run.skips} ${run.skips === 1 ? 'שאלה' : 'שאלות'} וחזרת ${back === 1 ? 'אליה' : 'אליהן'} בסוף. זו דרך חכמה להתמודד עם שאלה קשה.` : `דילגת על ${run.skips} ${run.skips === 1 ? 'שאלה' : 'שאלות'}. בפעם הבאה אפשר לנסות גם אותן.`}</p>` : '';
  app.innerHTML = `<main class="screen done">
    ${confetti(good ? 34 : 8)}
    <div class="medal" aria-hidden="true">${ok / total >= 0.9 ? '🏆' : good ? '🌟' : '💪'}</div>
    <div class="dmasc">${mascot(good ? 'cheer' : 'happy')}</div>
    <h1>${esc(run.partial ? 'עצרת באמצע, ויפה שהתחלת' : fb.title)}</h1>
    <div class="score">${ok} <small>מתוך ${total}</small></div>
    <p class="stars-row" aria-label="${run.stars} כוכבים בתרגול הזה">${Array.from({ length: Math.min(run.stars, 25) }, (_, i) => `<i style="--i:${i}">⭐</i>`).join('')}<b>${run.stars ? `${run.stars} כוכבים` : ''}</b></p>
    <section class="fb good"><h2>מה היה טוב</h2><ul>${fb.praise.map(p => `<li>${esc(p)}</li>`).join('')}</ul></section>
    ${fb.improve.length ? `<section class="fb tip"><h2>איך משתפרים</h2><ul>${fb.improve.map(p => `<li>${esc(p)}</li>`).join('')}</ul></section>` : ''}
    <p class="closing">${esc(run.partial ? 'אפשר להמשיך בפעם אחרת. מה שענית נשמר.' : fb.closing.join(' '))}</p>
    ${skipLine}
    <ul class="sum">${blocks.map(b => { const t = topicOf(b.id), lv = levelOf(b.id); return `<li class="t-${t.id}"><span aria-hidden="true">${t.icon}</span><span>${esc(t.short)}<br><span class="ev">רמה ${lv} · ${E.LEVEL_NAMES[lv]} ${evFor(b.id)}</span></span><span class="res">${b.ok} מתוך ${b.n}</span></li>`; }).join('')}</ul>
    <div class="spacer"></div>
    <button class="btn primary big" data-act="start" data-program="${run.program}">${run.program === 'times' ? 'עוד תרגול' : 'עוד סבב'}</button>
    <button class="btn big" data-act="mathmenu">סיום</button>
  </main>`;
}

// ---------- שעון נסתר: מודד זמן תשובה בלי להציג אותו לילד. נעצר כשהאפליקציה ברקע ----------
const clock = { t0: 0, acc: 0, on: false, paused: false };
function clockStart() { clock.acc = 0; clock.t0 = performance.now(); clock.on = true; clock.paused = false; }
function clockPause() { if (clock.on) { clock.acc += performance.now() - clock.t0; clock.on = false; } }
function clockResume() { if (!clock.on) { clock.t0 = performance.now(); clock.on = true; } }
function clockStop() { if (clock.on) { clock.acc += performance.now() - clock.t0; clock.on = false; } clock.paused = false; return clock.acc; }
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (clock.on) { clock.acc += performance.now() - clock.t0; clock.on = false; clock.paused = true; } }
  else if (clock.paused) { clock.t0 = performance.now(); clock.on = true; clock.paused = false; }
});

// ---------- מהלך סבב ----------
function startRun(program) {
  program = program === 'times' || program === 'g4' ? program : 'test';
  const rng = E.mulberry32((Date.now() ^ 0x5bd1e995) >>> 0);
  const plan = program === 'times' ? [{ topic: 'times', count: T.PER_SESSION }] : program === 'g4' ? G4.planRound(data.programs.g4, rng) : E.planRound(data.profile, rng);
  run = {
    program, rng, plan, b: 0, qi: 0, correct: 0, ms: 0, stars: 0, skips: 0, fresh: 0, skipped: [], partial: false, seen: new Set(), events: [], typed: '', locked: false, q: null, fb: null,
    blocks: plan.map(p => ({ id: p.topic, n: 0, ok: 0, sk: 0, levelBefore: levelOf(p.topic), levelAfter: levelOf(p.topic), results: [] })),
  };
  viewIntro();
}
function nextQ() {
  const b = run.plan[run.b];
  if (run.qi >= b.count) {
    run.blocks[run.b].levelAfter = levelOf(b.topic);
    run.b++; run.qi = 0; run.fresh = 0; run.skipped = [];
    return run.b >= run.plan.length ? finishRound() : viewIntro();
  }
  const topic = b.topic;
  let q;
  if (run.fresh >= b.count && run.skipped.length) {
    q = run.skipped.shift(); // שאלה שדילגו עליה חוזרת בסוף אותו חלק (ואי אפשר לדלג עליה שוב)
  } else if (run.program === 'g4') {
    for (let t = 0; t < 20; t++) { q = G4.generateQuestion(topic, levelOf(topic), run.rng); if (!run.seen.has(E.qKey(q))) break; }
    run.seen.add(E.qKey(q)); run.fresh++;
  } else if (run.program === 'times') {
    q = T.generateQuestion(data.programs.times, levelOf('times'), run.rng, run.seen);
    run.seen.add(T.seenKey(q)); run.seen.add('f:' + q.fact); // לוח הכפל: חזרה בין סבבים רצויה, ולכן בלי "recent"
    run.fresh++;
  } else {
    for (let t = 0; t < 20; t++) {
      q = E.generateQuestion(topic, data.profile.levels[topic], run.rng);
      const k = E.qKey(q);
      if (!run.seen.has(k) && !data.recent.includes(k)) break;
    }
    const k = E.qKey(q);
    run.seen.add(k); data.recent.push(k);
    run.fresh++;
  }
  run.q = q; run.typed = ''; run.locked = false;
  viewQuiz(); clockStart();
}
// דילוג: השאלה לא נספרת כתשובה, חוזרת בסוף אותו חלק, ונרשמת להורה
function skipQ() {
  if (!run || !run.q || run.locked || run.q.retried) return;
  const q = run.q, day = E.dayKey();
  clockStop();
  q.retried = true;
  if (run.program === 'times') T.recordSkip(data.programs.times, q, day); else E.recordSkip(profileOf(run.program), q.topic, day, q.skill);
  const s = sessionOf(day), bt = s.byTopic[q.topic] || (s.byTopic[q.topic] = { answered: 0, correct: 0 });
  bt.sk = (bt.sk || 0) + 1;
  run.blocks[run.b].sk++; run.skips++;
  run.skipped.push(q);
  saveKid(kid.id, data, day);
  nextQ();
}
function answeredCount() { return run ? run.blocks.reduce((a, b) => a + b.n, 0) : 0; }
function openStop() {
  if (!run) return viewMath();
  if (answeredCount() === 0) return viewMath();
  clockPause();
  const n = answeredCount();
  const m = document.createElement('div');
  m.className = 'modal'; m.id = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'סיום התרגול');
  m.innerHTML = `<div class="mbox">${mascot('think')}<h2>רוצים לסיים עכשיו?</h2><p>עד עכשיו ענית על ${n} ${n === 1 ? 'שאלה' : 'שאלות'}. אפשר להמשיך, או לסיים ולראות סיכום. מה שענית כבר נשמר.</p>
    <button class="btn primary big" data-act="resume">להמשיך לתרגל</button><button class="btn big" data-act="finish">לסיים ולראות סיכום</button><button class="link" data-act="exit">לצאת בלי סיכום</button></div>`;
  app.appendChild(m);
  const f = m.querySelector('[data-act="resume"]'); if (f) f.focus();
}
function closeStop() { const m = document.getElementById('modal'); if (m) m.remove(); }
function stopRun(showSummary) {
  closeStop();
  const n = answeredCount();
  if (n === 0) return viewMath();
  run.partial = true;
  if (showSummary) finishRound(true); else { recordPartial(); viewMath(); }
}
function recordPartial() {
  const day = E.dayKey(), prof = profileOf(run.program), n = answeredCount();
  E.recordPartial(prof, day, n);
  if (run.program === 'times') T.logRound(data.programs.times, day, { n, ok: run.correct, ms: run.ms, lv: run.blocks[0].levelBefore, sk: run.skips, partial: true });
  snapshotScore(run.program, day);
  saveKid(kid.id, data, day);
}
// צילום יומי של ציון היכולת (לגרף ההתקדמות של ההורה). נשמר רק כשיש נתונים מספיקים.
function snapshotScore(program, day) {
  const prof = profileOf(program), r = A.abilityScore(prof, program);
  if (r.score !== null && prof.days[day]) prof.days[day].sc = r.score;
}
function sessionOf(day) {
  return data.sessions[day] || (data.sessions[day] = { date: day, kidId: kid.id, answered: 0, correct: 0, rounds: 0, byTopic: {}, levelStart: Object.assign({}, data.profile.levels), levelEnd: {}, mistakes: [] });
}
function finishRound(partial) {
  const day = E.dayKey(), counts = {};
  run.plan.forEach(p => { counts[p.topic] = p.count; });
  run.blocks.forEach(bk => { bk.levelAfter = levelOf(bk.id); });
  if (partial) { recordPartial(); }
  else {
    E.completeRound(profileOf(run.program), day, counts);
    const s = data.sessions[day];
    if (s) s.rounds = (s.rounds || 0) + 1;
  }
  const done = run.blocks.filter(b => b.n > 0);
  if (run.program === 'times') {
    const b = run.blocks[0];
    run.fb = I.timesFeedback({ n: b.n, ok: b.ok, levelBefore: b.levelBefore, levelAfter: levelOf('times'), results: b.results, prev: data.lastTimes, seed: Date.now() % 997 });
    if (!partial) {
      data.lastTimes = { n: b.n, ok: b.ok };
      T.logRound(data.programs.times, day, { n: b.n, ok: b.ok, ms: run.ms, lv: b.levelBefore, sk: run.skips });
    }
  } else {
    const g = run.program === 'g4';
    run.fb = I.kidFeedback({ topics: done, prev: g ? data.lastG4 : data.lastRound, seed: Date.now() % 997 });
    if (!partial) { const lr = Object.fromEntries(run.blocks.map(b => [b.id, { n: b.n, ok: b.ok }])); if (g) data.lastG4 = lr; else data.lastRound = lr; }
  }
  snapshotScore(run.program, day);
  saveKid(kid.id, data, day);
  viewDone();
}

function logAnswer(q, ok, givenText, before, ms) {
  const day = E.dayKey();
  const s = sessionOf(day);
  s.answered++; if (ok) s.correct++;
  const bt = s.byTopic[q.topic] || (s.byTopic[q.topic] = { answered: 0, correct: 0 });
  bt.answered++; if (ok) bt.correct++;
  bt.ms = (bt.ms || 0) + ms; bt.tn = (bt.tn || 0) + 1; // זמן: לצפיית ההורה בלבד
  s.levelEnd = Object.assign({}, data.profile.levels);
  if (!ok && s.mistakes.length < 40) {
    s.mistakes.push({ topic: q.topic, level: q.level, q: plain(q.text + (q.eq ? ' ' + q.eq : '')), given: givenText, correct: plain(q.kind === 'choice' ? q.answer : E.fmt(q.answer)), t: new Date().toISOString() });
  }
  saveKid(kid.id, data, day);
}

const CHEERS = ['נכון!', 'יפה!', 'בול!', 'מצוין!', 'כל הכבוד!'];
function submit(given, btnIndex) {
  if (run.locked) return;
  const q = run.q;
  if (q.kind === 'num' && !String(given).length) return;
  run.locked = true;
  const ms = Math.min(E.TIME_CAP_MS, Math.round(clockStop()));
  const ok = E.checkAnswer(q, given);
  const before = Object.assign({}, data.profile.levels);
  const res = run.program === 'times' ? T.record(data.programs.times, q, ok, E.dayKey()) : E.recordAnswer(profileOf(run.program), q.topic, ok, E.dayKey(), q.skill);
  if (run.program === 'times') T.recordTime(data.programs.times, q, E.dayKey(), ms, ok); else E.recordTime(profileOf(run.program), q.topic, E.dayKey(), ms, ok);
  if (ok) { const dd = profileOf(run.program).days[E.dayKey()]; dd.st = (dd.st || 0) + 1; run.stars++; } // כוכב על כל תשובה נכונה
  run.ms += ms;
  if (ok) run.correct++;
  const blk = run.blocks[run.b]; blk.n++; if (ok) blk.ok++; blk.results.push(run.program === 'times' ? { skill: q.skill, ok, gen: q.gen, a: q.meta.a, b: q.meta.b } : { skill: q.skill, ok });
  if (res.event) run.events.push({ topic: q.topic, event: res.event, level: res.level });
  logAnswer(q, ok, q.kind === 'choice' ? plain(given) : E.fmt(E.parseNumber(given)), before, ms);

  if (q.kind === 'choice') {
    document.querySelectorAll('.choice').forEach((b, i) => {
      b.disabled = true;
      if (q.choices[i] === q.answer) b.classList.add('ok');
      else if (i === btnIndex) b.classList.add('bad');
    });
  } else {
    const t = document.getElementById('typed'); t.classList.add(ok ? 'ok' : 'bad');
    document.querySelectorAll('.pad button').forEach(b => { b.disabled = true; });
  }
  document.querySelectorAll('.dots i')[run.qi].className = ok ? 'ok' : 'bad';
  const card = document.querySelector('.qcard');
  if (card) card.classList.add(ok ? 'right' : 'wrong');
  if (ok) burst(q.topic);

  const tp = topicOf(q.topic);
  const note = res.event === 'up' ? `עלית לרמה ${res.level} ${inT(tp.short)}!${run.program === 'times' && res.level === T.DIVISION_FROM ? ' מעכשיו יופיעו גם שאלות חילוק' : ''}`
    : res.event === 'down' ? `נתרגל ברמה ${res.level} ${inT(tp.short)} ונתחזק משם` : '';
  const blockLast = run.qi === run.plan[run.b].count - 1, roundLast = blockLast && run.b === run.plan.length - 1;
  const nextLbl = roundLast ? 'לסיכום' : blockLast ? 'לנושא הבא' : 'הבא';
  const correctText = q.kind === 'choice' ? rich(q.answer) : esc(E.fmt(q.answer));
  document.getElementById('sheet').innerHTML = ok
    ? `<div class="sheet ok" role="status"><div class="shd">${mascot('cheer')}<strong>${CHEERS[(run.correct + run.qi) % CHEERS.length]}</strong><span class="star-pop" aria-hidden="true">⭐</span></div>${note ? `<p class="note">${esc(note)}</p>` : ''}<button class="btn" data-act="next" id="nextbtn">${nextLbl}</button></div>`
    : `<div class="sheet bad" role="status"><div class="shd">${mascot('oops')}<strong>${OOPS[(run.qi + run.correct) % OOPS.length]}</strong></div><p>התשובה הנכונה: <b${q.kind === 'num' || isLtrChoice(q.answer) ? ' dir="ltr"' : ''}>${correctText}</b></p><p class="why">${rich(q.explain)}</p>${q.svgAfter ? `<div class="fig">${q.svgAfter}</div>` : ''}${note ? `<p class="note">${esc(note)}</p>` : ''}<button class="btn" data-act="next" id="nextbtn">${blockLast ? nextLbl : 'הבנתי, ממשיכים'}</button></div>`;
  const nb = document.getElementById('nextbtn'); if (nb) nb.focus({ preventScroll: true });
}

function setTyped(v) {
  run.typed = v;
  const el = document.getElementById('typed');
  if (!el) return;
  if (v) { el.textContent = E.fmt(v); el.classList.remove('empty'); }
  else { el.textContent = 'כתבו את התשובה'; el.classList.add('empty'); }
}

async function enter(k) {
  kid = k; data = loadKid(k.id);
  writeMe(family.code + ':' + k.id);
  if (family.mode === 'family' && data.rev === 0) { // מכשיר חדש: מנסים לשחזר התקדמות קיימת מהענן
    view = 'loading';
    app.innerHTML = '<main class="screen who"><h1>טוען…</h1><p class="lead">בודקים אם כבר יש התקדמות שמורה.</p></main>';
    const done = await Promise.race([restoreKid(k.id), new Promise(r => setTimeout(() => r(false), 4000))]);
    if (kid !== k) return; // הילד החליף בינתיים
    data = loadKid(k.id);
    if (done) { syncNow(k.id); view = 'home'; viewHome(); const t = document.querySelector('.pick'); if (t) t.insertAdjacentHTML('beforebegin', '<p class="ev restored">ההתקדמות שלך שוחזרה ✓</p>'); return; }
  }
  syncNow(k.id); viewHome();
}

// ---------- אירועים ----------
app.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'join') doJoin();
  else if (act === 'pick') enter(family.roster.find(k => k.id === b.dataset.id));
  else if (act === 'switch') { writeMe(null); kid = null; data = null; viewWho(); }
  else if (act === 'leave') { leaveFamily(); writeMe(null); family = null; kid = null; data = null; viewCode(); }
  else if (act === 'reload') refreshFamily().then(() => { family = getFamily(); viewWho(); });
  else if (act === 'start') startRun(b.dataset.program);
  else if (act === 'begin') nextQ();
  else if (act === 'home') viewHome();
  else if (act === 'mathmenu') viewMath();
  else if (act === 'subject') { if (b.dataset.s === 'english') EUI.renderMenu(); else viewMath(); }
  else if (act === 'quit') openStop();
  else if (act === 'resume') { closeStop(); clockResume(); }
  else if (act === 'finish') stopRun(true);
  else if (act === 'exit') stopRun(false);
  else if (act === 'skip') skipQ();
  else if (act === 'key') { if (!run.locked && run.typed.length < 9) setTyped(run.typed + b.dataset.k); }
  else if (act === 'del') { if (!run.locked) setTyped(run.typed.slice(0, -1)); }
  else if (act === 'ok') submit(run.typed);
  else if (act === 'choose') { const i = Number(b.dataset.i); submit(run.q.choices[i], i); }
  else if (act === 'next') { run.qi++; nextQ(); }
});
document.addEventListener('keydown', e => { // מקלדת פיזית (מחשב / מקלדת חיצונית)
  if (!run || !run.q || view !== 'quiz' || run.q.kind !== 'num') return;
  if (run.locked) { if (e.key === 'Enter') { const nb = document.getElementById('nextbtn'); if (nb && document.activeElement !== nb) nb.click(); } return; }
  if (/^\d$/.test(e.key) && run.typed.length < 9) setTyped(run.typed + e.key);
  else if (e.key === 'Backspace') setTyped(run.typed.slice(0, -1));
  else if (e.key === 'Enter') submit(run.typed);
});
onStatus(s => { const el = document.getElementById('sync'); if (el) el.textContent = syncText(s); });

EUI.init({ preview: isPreview(), app, data: () => data, kid: () => kid, save: day => saveKid(kid.id, data, day), mascot, confetti, home: () => viewHome(), setView: v => { view = v; run = null; }, dayKey: () => E.dayKey() });

// נקודת גישה לבדיקות אוטומטיות (לקריאה בלבד)
window.__mathapp = { get run() { return run; }, get data() { return data; }, get kid() { return kid; }, get family() { return family; }, get view() { return view; } };

// ---------- מצב תצוגה להורים ----------
function previewBar() {
  const bar = document.createElement('div');
  bar.className = 'pv-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'מצב תצוגה להורים');
  bar.innerHTML = `<span>👀 <b>תצוגה להורים</b> · לא נשמר ולא נשלח</span>
    <label>רמה <select id="pvlevel" aria-label="רמת השאלות לתצוגה">${[1, 2, 3, 4, 5].map(i => `<option value="${i}"${i === getPreviewLevel() ? ' selected' : ''}>${i} · ${E.LEVEL_NAMES[i]}</option>`).join('')}</select></label>
    <a href="parent.html" class="pv-back">חזרה ללוח ההורים</a>`;
  document.body.prepend(bar); document.body.classList.add('pv');
  bar.querySelector('#pvlevel').addEventListener('change', e => {
    previewReset(Number(e.target.value));
    if (kid) { data = loadKid(kid.id); viewHome(); } else viewWho();
  });
}

// ---------- התחלה ----------
if (isPreview()) previewBar();
family = getFamily();
if (!family) viewCode();
else {
  const [code, id] = (readMe() || '').split(':');
  const me = code === family.code && family.roster.find(k => k.id === id);
  if (me) enter(me); else viewWho();
  refreshFamily().then(f => { // רשימת הילדים והמבדק עשויים להשתנות אצל ההורה
    family = f;
    if (view === 'who') viewWho();
    else if (view === 'home') { if (!f.roster.find(k => k.id === kid.id)) { writeMe(null); viewWho(); } else viewHome(); }
  });
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* עובד גם בלי */ });
}
