// app.js — אפליקציית הילד: קוד משפחה (פעם אחת) → בחירת ילד (פעם אחת) → בית → סבב (כל הנושאים, 3–5 שאלות בכל נושא) → פידבק.
import { getFamily, joinFamily, refreshFamily, leaveFamily, loadKid, saveKid, restoreKid, onStatus, getStatus, syncNow } from './store.js';
import { normCode, showCode } from './family.js';

const E = window.MathEngine, I = window.Insights, T = window.TimesEngine;
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
const topicOf = id => (id === 'times' ? TIMES_META : E.TOPICS.find(t => t.id === id));
const inT = short => 'ב' + String(short).replace(/^ה/, ''); // "בלוח הכפל", "במיליון"
const levelOf = id => (id === 'times' ? data.programs.times.levels.times : data.profile.levels[id]);
const profileOf = program => (program === 'times' ? data.programs.times : data.profile);
const isLtrChoice = c => /^[\d,<>=+\-×÷ .▢]+$/.test(c);
const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const g = (m, f) => (kid && kid.gender === 'f' ? f : m);

const readMe = () => { try { return localStorage.getItem(ME); } catch (e) { return null; } };
const writeMe = v => { try { v ? localStorage.setItem(ME, v) : localStorage.removeItem(ME); } catch (e) { /* ignore */ } };

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
  million: 'מספרים גדולים עד מיליון', addsub: 'חיבור, חיסור ובעיות מילוליות', fractions: 'חלקים של שלם',
  muldiv: 'כפל, חילוק ושארית', geometry: 'צורות, צלעות ואלכסונים', times: 'כפל וחילוק עד 100',
};
const BURST = { million: '✨', addsub: '➕', fractions: '🍕', muldiv: '✖️', geometry: '🔷', times: '⭐' };
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
    <h1>מי מתרגל?</h1>
    ${roster.length ? `<div class="who-btns">${roster.map(k => `<button class="kid-btn" data-act="pick" data-id="${esc(k.id)}" style="--kc:${esc(k.color || '#2F63D6')}"><span class="em" aria-hidden="true">${esc(k.emoji || '🙂')}</span>${esc(k.name)}</button>`).join('')}</div>`
      : `<p class="lead">עדיין אין ילדים במשפחה הזו. ההורה מוסיף אותם בלוח ההורה.</p><button class="btn" data-act="reload">רענון</button>`}
    <div class="spacer"></div>
    ${family.mode === 'family' ? '<button class="link" data-act="leave">החלפת קוד משפחה</button>' : ''}
  </main>`;
}

function viewHome() {
  view = 'home'; run = null;
  const today = E.dayKey(), tp = data.profile, xp = data.programs.times;
  const dt = tp.days[today] || { answered: 0, correct: 0, rounds: 0 }, dx = xp.days[today] || { answered: 0, correct: 0, rounds: 0 };
  const streak = T.streakAny(tp, xp), cd = countdownText();
  const answered = dt.answered + dx.answered, rounds = (dt.rounds || 0) + (dx.rounds || 0);
  const goal = Math.min(1, Math.max(dt.answered / E.ROUND_MIN, dx.answered / T.PER_SESSION));
  const lvX = xp.levels.times;
  const labT = (dt.rounds || 0) > 0 ? 'סבב נוסף' : dt.answered > 0 ? 'ממשיכים' : 'מתחילים';
  const labX = (dx.rounds || 0) > 0 ? 'עוד תרגול' : 'מתחילים';
  app.innerHTML = `<main class="screen">
    <div class="top"><h1>שלום ${esc(kid.name)} ${esc(kid.emoji || '')}</h1><button class="link" data-act="switch">לא ${esc(kid.name)}?</button></div>
    <section class="today" aria-label="תרגול היום">
      <div class="row"><span>היום</span><b>${answered} שאלות${rounds ? ` · ${rounds} ${rounds === 1 ? 'סבב' : 'סבבים'}` : ''}</b></div>
      <div class="goalbar" aria-hidden="true"><i style="width:${Math.round(goal * 100)}%"></i></div>
      <div class="ev">${goal >= 1 ? 'יעד היום הושג ✓' : 'יעד יומי: סבב אחד בהכנה למבדק (15 שאלות) או בלוח הכפל (10 שאלות)'}${streak > 0 ? ` · ${streak === 1 ? 'יום אחד ברצף' : streak + ' ימים ברצף'}` : ''}</div>
    </section>
    <p class="lead pick">מה מתרגלים?</p>
    <section class="prog t-test" aria-label="הכנה למבדק">
      <div class="ph"><span class="pi" aria-hidden="true">📝</span><div><h2>הכנה למבדק</h2><p class="ev">5 נושאים, 3 עד 5 שאלות בכל נושא</p></div></div>
      ${cd ? `<div class="countdown">${esc(cd)}</div>` : ''}
      <ul class="minilv" aria-label="רמות לפי נושא">${E.TOPICS.map(t => `<li aria-label="${esc(t.short)}, רמה ${tp.levels[t.id]}"><span aria-hidden="true">${t.icon}</span><b>${tp.levels[t.id]}</b></li>`).join('')}</ul>
      <button class="btn primary big" data-act="start" data-program="test">${labT}</button>
    </section>
    <section class="prog t-times" aria-label="לוח הכפל">
      <div class="ph"><span class="pi" aria-hidden="true">✖️</span><div><h2>לוח הכפל</h2><p class="ev">10 שאלות, עד 100${lvX >= T.DIVISION_FROM ? ', כולל חילוק' : ''}</p></div></div>
      <div class="lvrow"><span class="pips" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= lvX ? 'on' : ''}"></i>`).join('')}</span><span class="ev">רמה ${lvX} · ${E.LEVEL_NAMES[lvX]}: ${T.LEVEL_INFO[lvX]}</span></div>
      <button class="btn primary big" data-act="start" data-program="times">${labX}</button>
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
    <div class="qprog"><span>שאלה ${run.qi + 1} מתוך ${b.count}</span><div class="dots" aria-hidden="true">${dots}</div></div>
    <section class="qcard">
      <div class="tp"><span class="tic" aria-hidden="true">${t.icon}</span> ${esc(t.short)}</div>
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
  const total = run.blocks.reduce((a, b) => a + b.n, 0), ok = run.correct;
  const fb = run.fb;
  const evFor = id => {
    const ev = run.events.filter(e => e.topic === id), up = ev.filter(e => e.event === 'up').length, dn = ev.length - up;
    return [up ? `↑ עלית ${up === 1 ? 'רמה' : up + ' רמות'}` : '', dn ? '↓ חוזרים צעד לחיזוק' : ''].filter(Boolean).join(', ');
  };
  const good = ok / total >= 0.7;
  app.innerHTML = `<main class="screen done">
    ${confetti(good ? 30 : 8)}
    <div class="medal" aria-hidden="true">${ok / total >= 0.9 ? '🏆' : good ? '🌟' : '💪'}</div>
    <h1>${esc(fb.title)}</h1>
    <div class="score">${ok} <small>מתוך ${total}</small></div>
    <section class="fb good"><h2>מה היה טוב</h2><ul>${fb.praise.map(p => `<li>${esc(p)}</li>`).join('')}</ul></section>
    ${fb.improve.length ? `<section class="fb tip"><h2>איך משתפרים</h2><ul>${fb.improve.map(p => `<li>${esc(p)}</li>`).join('')}</ul></section>` : ''}
    <p class="closing">${esc(fb.closing.join(' '))}</p>
    <ul class="sum">${run.blocks.map(b => { const t = topicOf(b.id), lv = levelOf(b.id); return `<li class="t-${t.id}"><span aria-hidden="true">${t.icon}</span><span>${esc(t.short)}<br><span class="ev">רמה ${lv} · ${E.LEVEL_NAMES[lv]} ${evFor(b.id)}</span></span><span class="res">${b.ok} מתוך ${b.n}</span></li>`; }).join('')}</ul>
    <div class="spacer"></div>
    <button class="btn primary big" data-act="start" data-program="${run.program}">${run.program === 'times' ? 'עוד תרגול' : 'עוד סבב'}</button>
    <button class="btn big" data-act="home">סיום</button>
  </main>`;
}

// ---------- שעון נסתר: מודד זמן תשובה בלי להציג אותו לילד. נעצר כשהאפליקציה ברקע ----------
const clock = { t0: 0, acc: 0, on: false, paused: false };
function clockStart() { clock.acc = 0; clock.t0 = performance.now(); clock.on = true; clock.paused = false; }
function clockStop() { if (clock.on) { clock.acc += performance.now() - clock.t0; clock.on = false; } clock.paused = false; return clock.acc; }
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (clock.on) { clock.acc += performance.now() - clock.t0; clock.on = false; clock.paused = true; } }
  else if (clock.paused) { clock.t0 = performance.now(); clock.on = true; clock.paused = false; }
});

// ---------- מהלך סבב ----------
function startRun(program) {
  program = program === 'times' ? 'times' : 'test';
  const rng = E.mulberry32((Date.now() ^ 0x5bd1e995) >>> 0);
  const plan = program === 'times' ? [{ topic: 'times', count: T.PER_SESSION }] : E.planRound(data.profile, rng);
  run = {
    program, rng, plan, b: 0, qi: 0, correct: 0, ms: 0, seen: new Set(), events: [], typed: '', locked: false, q: null, fb: null,
    blocks: plan.map(p => ({ id: p.topic, n: 0, ok: 0, levelBefore: levelOf(p.topic), levelAfter: levelOf(p.topic), results: [] })),
  };
  viewIntro();
}
function nextQ() {
  const b = run.plan[run.b];
  if (run.qi >= b.count) {
    run.blocks[run.b].levelAfter = levelOf(b.topic);
    run.b++; run.qi = 0;
    return run.b >= run.plan.length ? finishRound() : viewIntro();
  }
  const topic = b.topic;
  let q;
  if (run.program === 'times') {
    q = T.generateQuestion(data.programs.times, levelOf('times'), run.rng, run.seen);
    run.seen.add(T.seenKey(q)); run.seen.add('f:' + q.fact); // לוח הכפל: חזרה בין סבבים רצויה, ולכן בלי "recent"
  } else {
    for (let t = 0; t < 20; t++) {
      q = E.generateQuestion(topic, data.profile.levels[topic], run.rng);
      const k = E.qKey(q);
      if (!run.seen.has(k) && !data.recent.includes(k)) break;
    }
    const k = E.qKey(q);
    run.seen.add(k); data.recent.push(k);
  }
  run.q = q; run.typed = ''; run.locked = false;
  viewQuiz(); clockStart();
}
function finishRound() {
  const day = E.dayKey(), counts = {};
  run.plan.forEach(p => { counts[p.topic] = p.count; });
  E.completeRound(profileOf(run.program), day, counts);
  const s = data.sessions[day];
  if (s) s.rounds = (s.rounds || 0) + 1;
  if (run.program === 'times') {
    const b = run.blocks[0];
    run.fb = I.timesFeedback({ n: b.n, ok: b.ok, levelBefore: b.levelBefore, levelAfter: levelOf('times'), results: b.results, prev: data.lastTimes, seed: Date.now() % 997 });
    data.lastTimes = { n: b.n, ok: b.ok };
    T.logRound(data.programs.times, day, { n: b.n, ok: b.ok, ms: run.ms, lv: b.levelBefore });
  } else {
    run.fb = I.kidFeedback({ topics: run.blocks, prev: data.lastRound, seed: Date.now() % 997 });
    data.lastRound = Object.fromEntries(run.blocks.map(b => [b.id, { n: b.n, ok: b.ok }]));
  }
  saveKid(kid.id, data, day);
  viewDone();
}

function logAnswer(q, ok, givenText, before, ms) {
  const day = E.dayKey();
  const s = data.sessions[day] || (data.sessions[day] = { date: day, kidId: kid.id, answered: 0, correct: 0, rounds: 0, byTopic: {}, levelStart: before, levelEnd: {}, mistakes: [] });
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
  const res = run.program === 'times' ? T.record(data.programs.times, q, ok, E.dayKey()) : E.recordAnswer(data.profile, q.topic, ok, E.dayKey(), q.skill);
  if (run.program === 'times') T.recordTime(data.programs.times, q, E.dayKey(), ms); else E.recordTime(data.profile, q.topic, E.dayKey(), ms);
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
    ? `<div class="sheet ok" role="status"><strong>${CHEERS[(run.correct + run.qi) % CHEERS.length]}</strong>${note ? `<p class="note">${esc(note)}</p>` : ''}<button class="btn" data-act="next" id="nextbtn">${nextLbl}</button></div>`
    : `<div class="sheet bad" role="status"><strong>כמעט</strong><p>התשובה הנכונה: <b${q.kind === 'num' || isLtrChoice(q.answer) ? ' dir="ltr"' : ''}>${correctText}</b></p><p class="why">${rich(q.explain)}</p>${q.svgAfter ? `<div class="fig">${q.svgAfter}</div>` : ''}${note ? `<p class="note">${esc(note)}</p>` : ''}<button class="btn" data-act="next" id="nextbtn">${blockLast ? nextLbl : 'הבנתי, ממשיכים'}</button></div>`;
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
  else if (act === 'home' || act === 'quit') viewHome();
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

// נקודת גישה לבדיקות אוטומטיות (לקריאה בלבד)
window.__mathapp = { get run() { return run; }, get data() { return data; }, get kid() { return kid; }, get family() { return family; }, get view() { return view; } };

// ---------- התחלה ----------
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
