// parent.js — לוח בקרה להורה: משפחה וקוד, ילדים, ולכל ילד: סיכום מילולי, השוואה להתחלה, רמות, דיוק, מגמה וטעויות.
// מקור הנתונים: Firestore (אחרי כניסה עם Google). אם Firebase לא הוגדר — רק מה ששמור במכשיר הזה.
import { firebaseConfigured, loadFirebase } from './fb.js';
import { getFamily, loadKid } from './store.js';
import { listFamilies, createFamily, addChild, removeChild, setTest, inviteParent, removeParent, showCode, MAX_KIDS } from './family.js';

const E = window.MathEngine, I = window.Insights;
const app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const topic = id => (id === 'times' ? { short: 'לוח הכפל', icon: '✖️' } : E.TOPICS.find(t => t.id === id) || { short: id, icon: '', name: id });
const dm = day => { const [, m, d] = day.split('-'); return `${Number(d)}.${Number(m)}`; };
const pct = (c, n) => (n ? Math.round(100 * c / n) : null);
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5);
const daysSince = day => daysBetween(day, E.dayKey());

let fam = null, user = null;   // משפחה נוכחית (מצב Firebase)

// ---------- מקורות נתונים ----------
function fromLocal() {
  const f = getFamily();
  return f.roster.map(k => {
    const d = loadKid(k.id), p = d.profile;
    const used = days => Object.keys(days || {}).some(x => days[x].answered > 0);
    const started = used(p.days) || used(d.programs.times.days);
    return { kid: k, profile: started ? Object.assign({}, p, { streak: window.TimesEngine.streakAny(p, d.programs.times), programs: d.programs }) : null,
      sessions: Object.values(d.sessions).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14) };
  });
}
async function fromRemote(code, roster) {
  const { db, fs } = await loadFirebase();
  const out = [];
  for (const k of roster) {
    const snap = await fs.getDoc(fs.doc(db, 'families', code, 'kids', k.id));
    const profile = snap.exists() ? snap.data() : null;
    let sessions = [];
    if (profile) {
      const qs = await fs.getDocs(fs.query(fs.collection(db, 'families', code, 'kids', k.id, 'sessions'), fs.orderBy('date', 'desc'), fs.limit(14)));
      sessions = qs.docs.map(d => d.data());
    }
    out.push({ kid: k, profile, sessions });
  }
  return out;
}

// ---------- רכיבים ----------
function chart(days) { // דיוק יומי — סדרה אחת, קו דק, תווית רק לערך האחרון
  const W = 360, H = 150, L = 38, R = 14, T = 18, B = 26;
  const pts = days.map(d => ({ day: d.day, v: pct(d.correct, d.answered), n: d.answered }));
  if (!pts.length) return '';
  const x = i => (pts.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (pts.length - 1));
  const y = v => T + (1 - v / 100) * (H - T - B);
  const grid = [0, 50, 100].map(v => `<line class="axis" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`).join('');
  const line = pts.length > 1 ? `<polyline class="ln" points="${pts.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')}"/>` : '';
  const dots = pts.map((p, i) => `<circle class="pt" cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="5"><title>${dm(p.day)}: ${p.v}% (${p.n} תרגילים)</title></circle>`).join('');
  const last = pts[pts.length - 1];
  const lastLbl = `<text class="val" x="${x(pts.length - 1).toFixed(1)}" y="${(y(last.v) - 10).toFixed(1)}" text-anchor="middle">${last.v}%</text>`;
  const xl = `<text x="${x(0)}" y="${H - 6}" text-anchor="middle">${dm(pts[0].day)}</text>` + (pts.length > 1 ? `<text x="${x(pts.length - 1)}" y="${H - 6}" text-anchor="middle">${dm(last.day)}</text>` : '');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="דיוק יומי: ${pts.map(p => dm(p.day) + ' ' + p.v + '%').join(', ')}" direction="ltr">${grid}${line}${dots}${lastLbl}${xl}</svg>`;
}

const STATUS = {
  improved: ['▲ שיפור', 'up'], stable: ['■ יציב', 'flat'], declined: ['▼ ירידה', 'down'],
  initial: ['מצב נוכחי בלבד', 'neutral'], insufficient: ['אין מספיק נתונים', 'neutral'],
};
const fmtNow = t => (t.answered ? `רמה ${t.level} (${E.LEVEL_NAMES[t.level]})${t.recentAcc === null ? '' : ` · ${Math.round(t.recentAcc * 100)}%`}` : 'לא זמין');
const fmtStart = t => (t.baseAcc === null || t.answered < 10 ? 'לא זמין' : `רמה ${t.startLevel} (${E.LEVEL_NAMES[t.startLevel]}) · ${Math.round(t.baseAcc * 100)}%`);

function topicBlock(t) {
  const [lbl, cls] = STATUS[t.status];
  const lines = [];
  if (t.strengths.length) lines.push(`<li><b>מיומנויות חזקות:</b> ${t.strengths.map(esc).join('; ')}</li>`);
  if (t.weaknesses.length) lines.push(`<li><b>לחיזוק:</b> ${t.weaknesses.map(esc).join('; ')}</li>`);
  if (t.tip) lines.push(`<li><b>טיפ לתרגול בבית:</b> ${esc(t.tip)}</li>`);
  return `<div class="tb">
    <div class="tb-h"><span class="nm">${topic(t.id).icon} ${esc(t.short)}</span><span class="chip ${cls}">${lbl}</span></div>
    <div class="bar" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= t.level ? 'on' : ''}"></i>`).join('')}</div>
    <dl class="cmp"><div><dt>התחלה</dt><dd>${fmtStart(t)}</dd></div><div><dt>עכשיו</dt><dd>${fmtNow(t)}</dd></div><div><dt>תשובות</dt><dd>${t.answered}</dd></div></dl>
    <p class="tx">${esc(t.text)}</p>
    ${lines.length ? `<ul class="tl">${lines.join('')}</ul>` : ''}
  </div>`;
}


// זמני תשובה: מוצגים להורה בלבד (אין שום שעון או זמן בצד הילד)
function timeBlock(tm, rlog) {
  if (!tm.timed) return '<div><h4>זמני תרגול</h4><p class="p-sub">הזמן מתחיל להימדד מהתרגול הבא.</p></div>';
  const rows = (rlog || []).filter(r => r.ms > 0).slice(-8).reverse();
  const rtable = rows.length ? `<details><summary>סבבים אחרונים עם זמן</summary><table class="t"><thead><tr><th>יום</th><th class="n">תוצאה</th><th class="n">זמן</th><th class="n">ממוצע לשאלה</th></tr></thead><tbody>${rows.map(r => `<tr><td>${dm(r.d)}</td><td class="n">${r.ok}/${r.n}</td><td class="n">${I.fmtDur(r.ms)}</td><td class="n">${I.fmtAvg(r.ms / r.n)}</td></tr>`).join('')}</tbody></table></details>` : '';
  const slow = tm.slowFacts.length ? `<p><b>תרגילים שלוקחים יותר זמן:</b> ${tm.slowFacts.map(f => `<span dir="ltr">${esc(f.text)}</span> (${I.fmtAvg(f.avgMs)})`).join(' · ')}</p>` : '';
  const bt = tm.byTopic.length ? `<p><b>ממוצע לשאלה לפי נושא:</b> ${tm.byTopic.map(t => `${esc(t.short)} ${I.fmtAvg(t.avgMs)}`).join(' · ')}</p>` : '';
  return `<div class="timeblk"><h4>⏱ זמני תרגול (מוצג להורים בלבד)</h4>${tm.paragraphs.map(x => `<p>${esc(x)}</p>`).join('')}${slow}${bt}${rtable}</div>`;
}
const dayTime = d => (d && d.tn ? [I.fmtDur(d.ms), I.fmtAvg(d.ms / d.tn)] : ['לא זמין', 'לא זמין']);

const TIMES_STATUS = STATUS;
function gridHtml(facts) {
  const by = {}; facts.forEach(f => { by[f.key] = f.status; });
  const MARK = { strong: '✓', weak: '✗', mid: '•', new: '' };
  let h = '<table class="mgrid" role="img" aria-label="מפת תרגילי לוח הכפל"><thead><tr><th></th>' + Array.from({ length: 10 }, (_, i) => `<th>${i + 1}</th>`).join('') + '</tr></thead><tbody>';
  for (let a = 1; a <= 10; a++) {
    h += `<tr><th>${a}</th>`;
    for (let b = 1; b <= 10; b++) { const st = by[Math.min(a, b) + 'x' + Math.max(a, b)] || 'new'; h += `<td class="s-${st}" title="${a} × ${b} = ${a * b}">${MARK[st]}</td>`; }
    h += '</tr>';
  }
  return h + '</tbody></table><p class="legend"><span>✓ שולט</span><span>• בתהליך</span><span>✗ לחיזוק</span><span>ריק: עוד לא תורגל</span></p>';
}
function timesSection(kid, xp, today) {
  const a = I.analyzeTimes(xp, { name: kid.name, gender: kid.gender, today });
  const [lbl, cls] = STATUS[a.status];
  const days = xp.days || {}, dl = Object.keys(days).filter(d => days[d].answered > 0).sort();
  const series = dl.slice(-14).map(d => ({ day: d, answered: days[d].answered, correct: days[d].correct }));
  const t = days[today] || { answered: 0, rounds: 0 };
  const table = `<table class="t"><thead><tr><th>יום</th><th class="n">תרגילים</th><th class="n">נכונים</th><th class="n">דיוק</th><th class="n">זמן</th><th class="n">ממוצע</th></tr></thead><tbody>${series.slice().reverse().map(d => { const tt = dayTime(days[d.day]); return `<tr><td>${dm(d.day)}</td><td class="n">${d.answered}</td><td class="n">${d.correct}</td><td class="n">${pct(d.correct, d.answered)}%</td><td class="n">${tt[0]}</td><td class="n">${tt[1]}</td></tr>`; }).join('')}</tbody></table>`;
  const tm = I.analyzeTiming({ days, stats: xp.stats, rlog: xp.rlog, facts: xp.facts });
  const tb = { id: 'times', short: 'לוח הכפל', level: a.level, startLevel: a.startLevel, answered: a.total, recentAcc: a.recentAcc, baseAcc: a.baseAcc };
  return `<section class="prog-sec" aria-label="לוח הכפל"><h3>✖️ לוח הכפל <span class="chip ${cls}">${lbl}</span></h3>
    <section class="summary"><h3>סיכום</h3>${a.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}${a.weekly ? `<p>${esc(a.weekly.text)}</p>` : ''}</section>
    <div class="bar" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= a.level ? 'on' : ''}"></i>`).join('')}</div>
    <dl class="cmp"><div><dt>התחלה</dt><dd>${fmtStart(tb)}</dd></div><div><dt>עכשיו</dt><dd>${fmtNow(tb)}</dd></div><div><dt>היום</dt><dd>${t.answered} שאלות</dd></div></dl>
    ${timeBlock(tm, xp.rlog)}
    ${a.total >= 5 ? `<div><h4>מפת התרגילים</h4>${gridHtml(a.facts)}</div>` : ''}
    ${a.weakFacts.length ? `<div><h4>תרגילים לחיזוק</h4><ul class="weakl">${a.weakFacts.map(w => `<li><b>${esc(w.text)}</b> (${w.right} נכון מתוך ${w.tries})<br>${esc(w.tip)}</li>`).join('')}</ul></div>` : ''}
    <div><h4>המלצות להמשך</h4><ul class="recs">${a.recommendations.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>
    ${series.length ? `<div><h4>דיוק יומי</h4>${chart(series)}</div><details><summary>טבלת ימים</summary>${table}</details>` : ''}
  </section>`;
}

function kidCard(r) {
  const { kid, profile, sessions } = r;
  const f = kid.gender === 'f';
  const head = `<header><h2>${esc(kid.emoji || '')} ${esc(kid.name)}</h2>`;
  if (!profile) return `<article class="kidcard">${head}</header><p class="empty">עוד לא התחיל${f ? 'ה' : ''} לתרגל.</p></article>`;

  const today = E.dayKey(), days = profile.days || {};
  const xp = profile.programs && profile.programs.times, xdays = (xp && xp.days) || {};
  const used = d => Object.keys(d).filter(k => d[k].answered > 0);
  const dayList = used(days).sort(), xList = used(xdays);
  const lastDay = dayList.concat(xList).sort().pop();
  const since = lastDay ? daysSince(lastDay) : null;
  const testHtml = dayList.length ? testSection(kid, profile, sessions, dayList, today) : '<p class="empty">עוד לא התחיל' + (f ? 'ה' : '') + ' את ההכנה למבדק.</p>';
  const mistakes = sessions.flatMap(s => (s.mistakes || []).map(m => Object.assign({ day: s.date }, m))).sort((x, y) => (y.t || y.day).localeCompare(x.t || x.day)).slice(0, 15);
  const mist = mistakes.length
    ? `<ul class="mist">${mistakes.map(m => `<li><div class="q"><b>${topic(m.topic).icon} ${esc(topic(m.topic).short)}</b> · ${dm(m.day)}<br>${esc(m.q)}</div><div class="a">${f ? 'ענתה' : 'ענה'}: <b dir="ltr">${esc(m.given)}</b> · נכון: <b dir="ltr">${esc(m.correct)}</b></div></li>`).join('')}</ul>`
    : '<p class="empty">אין טעויות שמורות.</p>';
  return `<article class="kidcard">
    ${head}<span class="p-sub">${lastDay ? `תרגול אחרון: ${since === 0 ? 'היום' : since === 1 ? 'אתמול' : dm(lastDay)}` : ''}${profile.streak ? ` · ${profile.streak} ${profile.streak === 1 ? 'יום' : 'ימים'} ברצף` : ''}</span></header>
    ${since !== null && since >= 2 ? `<p class="warn">לא ${f ? 'תרגלה' : 'תרגל'} ${since} ימים (מאז ${dm(lastDay)}).</p>` : ''}
    <section class="prog-sec" aria-label="הכנה למבדק"><h3>📝 הכנה למבדק</h3>${testHtml}</section>
    ${xList.length ? timesSection(kid, xp, today) : `<section class="prog-sec" aria-label="לוח הכפל"><h3>✖️ לוח הכפל</h3><p class="empty">עוד לא ${f ? 'תרגלה' : 'תרגל'} את לוח הכפל.</p></section>`}
    <details><summary>טעויות אחרונות (${mistakes.length})</summary>${mist}</details>
  </article>`;
}

function testSection(kid, profile, sessions, dayList, today) {
  const days = profile.days || {};
  const t = days[today] || { answered: 0, correct: 0, rounds: 0 };
  const week = dayList.filter(d => daysSince(d) < 7).reduce((a, d) => ({ n: a.n + days[d].answered, c: a.c + days[d].correct }), { n: 0, c: 0 });
  const wkPct = pct(week.c, week.n);
  const a = I.analyzeKid(profile, { name: kid.name, gender: kid.gender, today });
  const series = dayList.slice(-14).map(d => ({ day: d, answered: days[d].answered, correct: days[d].correct }));
  const table = `<table class="t"><thead><tr><th>יום</th><th class="n">תרגילים</th><th class="n">נכונים</th><th class="n">דיוק</th><th class="n">סבבים</th><th class="n">זמן</th><th class="n">ממוצע</th></tr></thead><tbody>${series.slice().reverse().map(d => { const tt = dayTime(days[d.day]); return `<tr><td>${dm(d.day)}</td><td class="n">${d.answered}</td><td class="n">${d.correct}</td><td class="n">${pct(d.correct, d.answered)}%</td><td class="n">${days[d.day].rounds || 0}</td><td class="n">${tt[0]}</td><td class="n">${tt[1]}</td></tr>`; }).join('')}</tbody></table>`;
  const tmT = I.analyzeTiming({ days, stats: profile.stats });
  const tmHtml = tmT.timed ? `<div class="timeblk"><h4>⏱ זמני תרגול (מוצג להורים בלבד)</h4><p>בכל התרגול שנמדד (${tmT.timed} שאלות): ממוצע ${I.fmtAvg(tmT.avgMs)} לשאלה, סך הכול ${I.fmtDur(tmT.totalMs)}.</p>${tmT.byTopic.length ? `<p><b>ממוצע לשאלה לפי נושא:</b> ${tmT.byTopic.map(t => `${esc(t.short)} ${I.fmtAvg(t.avgMs)}`).join(' · ')}</p>` : ''}</div>` : '';
  return `<section class="summary" aria-label="סיכום מילולי"><h3>סיכום</h3>${a.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}${a.weekly ? `<p>${esc(a.weekly.text)}</p>` : ''}</section>
    <div class="stats">
      <div class="stat"><b>${t.answered} שאלות${t.rounds ? ` · ${t.rounds} ${t.rounds === 1 ? 'סבב' : 'סבבים'}` : ''}</b><span>היום</span></div>
      <div class="stat"><b>${wkPct === null ? 'לא זמין' : wkPct + '%'}</b><span>דיוק ב-7 ימים (${week.n} תרגילים)</span></div>
    </div>
    <div><h4>השוואה בין ההתחלה למצב הנוכחי, לפי נושא</h4><div class="tbs">${a.topics.map(topicBlock).join('')}</div>
      <p class="p-sub note">"התחלה" היא 10 התשובות הראשונות בנושא, ו"עכשיו" הן 15 התשובות האחרונות. הרמה מתעדכנת אחרי כל תשובה, ולכן דיוק גבוה ברמה גבוהה יותר הוא שיפור גם אם אחוז ההצלחה דומה.</p></div>
    ${series.length ? `<div><h4>דיוק יומי</h4>${chart(series)}</div>` : ''}
    ${tmHtml}
    <details><summary>טבלת ימים</summary>${table}</details>`;
}

const isOwner = () => !!user && fam && fam.ownerUid === user.uid;
function parentsBlock() {
  const em = fam.parentEmails || [], inv = fam.invitedEmails || [], own = isOwner();
  return `<h3>הורים שעוקבים אחרי התוצאות</h3>
    <ul class="kids">${em.map((e, i) => `<li><span dir="ltr">${esc(e)}</span><span class="p-sub">${i === 0 ? 'בעלים' : 'הורה'}${own && i > 0 ? ` · <button class="link" data-act="rmparent" data-email="${esc(e)}">הסרה</button>` : ''}</span></li>`).join('')}
      ${inv.map(e => `<li><span dir="ltr">${esc(e)}</span><span class="p-sub">הזמנה ממתינה${own ? ` · <button class="link" data-act="rmparent" data-email="${esc(e)}">ביטול</button>` : ''}</span></li>`).join('')}</ul>
    ${own ? `<form class="addkid" data-form="invite"><label>הזמנת הורה נוסף (מייל של חשבון Google)<input id="pemail" type="email" inputmode="email" dir="ltr" autocomplete="off" autocapitalize="none" required></label>
      <button class="btn" type="submit">שליחת הזמנה</button></form>
      <p class="p-sub">ההורה הנוסף נכנס ל-parent.html עם אותו חשבון Google ורואה את תוצאות הילדים אוטומטית. הוא לא יכול לשנות ילדים או הגדרות.</p>` : ''}`;
}
function familyPanel() {
  const t = fam.test || {}, own = isOwner();
  return `<section class="kidcard famcard" aria-label="משפחה">
    <header><h2>המשפחה</h2></header>
    <div class="codebox"><div><span class="p-sub">קוד משפחה (לילדים, פעם אחת באפליקציה)</span><b class="code" dir="ltr" id="famcode">${esc(showCode(fam.code))}</b></div><button class="btn" data-act="copy">העתקה</button></div>
    <p class="p-sub" id="copied" role="status"></p>
    <h3>ילדים (${fam.roster.length} מתוך ${MAX_KIDS})</h3>
    ${fam.roster.length ? `<ul class="kids">${fam.roster.map(k => `<li><span>${esc(k.emoji || '')} ${esc(k.name)}</span>${own ? `<button class="link" data-act="rmkid" data-id="${esc(k.id)}">הסרה</button>` : ''}</li>`).join('')}</ul>` : '<p class="empty">עוד לא נוספו ילדים.</p>'}
    ${own && fam.roster.length < MAX_KIDS ? `<form class="addkid" data-form="add"><label>שם הילד/ה<input id="kname" maxlength="20" autocomplete="off" required></label>
      <fieldset><legend class="sr">מין</legend><label class="rd"><input type="radio" name="g" value="f" checked> בת</label><label class="rd"><input type="radio" name="g" value="m"> בן</label></fieldset>
      <button class="btn primary" type="submit">הוספה</button></form>` : ''}
    ${parentsBlock()}
    ${own ? `<details><summary>מבדק (אופציונלי)</summary><form class="addkid" data-form="test">
      <label>שם<input id="tname" maxlength="30" value="${esc(t.name || 'המבדק במתמטיקה')}"></label>
      <label>תאריך<input id="tdate" type="date" value="${esc(t.date || '')}"></label>
      <button class="btn" type="submit">שמירה</button></form><p class="p-sub">הילדים יראו ספירה לאחור עד התאריך. מחיקת התאריך מסירה את הספירה.</p></details>` : ''}
    <p class="p-sub">קישור לאפליקציית הילדים: <span dir="ltr">${esc(new URL('index.html', location.href).href)}</span></p>
  </section>`;
}

function renderDash(rows, banner, withFamily) {
  const f = getFamily(), test = withFamily ? fam.test : (f && f.test);
  let cd = '';
  if (test && test.date) {
    const d = daysBetween(E.dayKey(), test.date);
    cd = ` · ${d > 1 ? `עוד ${d} ימים` : d === 1 ? 'מחר' : d === 0 ? 'היום' : ''}`.replace(/ · $/, '');
  }
  app.innerHTML = `<main class="p-wrap">
    <div class="p-head"><div><h1>התקדמות הילדים</h1><p class="p-sub">${test && test.date ? `${esc(test.name || 'מבדק')} · ${dm(test.date)}${cd}` : ''}</p></div><div class="p-actions"><button class="btn" data-act="refresh">רענון</button>${user ? '<button class="link" data-act="signout">יציאה</button>' : ''}</div></div>
    ${banner ? `<p class="banner">${banner}</p>` : ''}
    ${withFamily ? familyPanel() : ''}
    ${rows.length ? rows.map(kidCard).join('') : '<p class="empty">הוסיפו ילד כדי להתחיל.</p>'}
  </main>`;
}
function renderGate(title, text, button, extra) {
  app.innerHTML = `<main class="p-wrap"><h1>${esc(title)}</h1><p>${text}</p>${button ? `<button class="btn primary big" data-act="${button.act}">${esc(button.label)}</button>` : ''}${extra || ''}</main>`;
}

// ---------- זרימה ----------
async function load() {
  if (!firebaseConfigured()) {
    renderDash(fromLocal(), '<b>מצב מקומי:</b> מוצגים רק נתונים ששמורים במכשיר הזה. כדי לראות את התוצאות מהטלפונים של הילדים, יש להשלים את הגדרת Firebase (README, שלב 2).', false);
    return;
  }
  app.innerHTML = '<main class="p-wrap"><p>טוען…</p></main>';
  try {
    if (!fam) {
      const list = await listFamilies(user);
      fam = list[0] || null;
    }
    if (!fam) {
      renderGate('ברוכים הבאים', 'עוד אין משפחה בחשבון הזה. יוצרים משפחה, מוסיפים ילדים, ומוסרים לכל ילד את קוד המשפחה.', { act: 'create', label: 'יצירת משפחה' });
      return;
    }
    const rows = await fromRemote(fam.code, fam.roster || []);
    fam.roster = fam.roster || [];
    renderDash(rows, `מעודכן ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`, true);
  } catch (e) {
    console.warn(e);
    renderGate('לא הצלחתי לטעון נתונים', 'בדקו חיבור לאינטרנט ושכללי האבטחה (firestore.rules) פורסמו.', { act: 'refresh', label: 'ניסיון נוסף' });
  }
}
async function reloadFamily() { fam = null; await load(); }

async function start() {
  if (!firebaseConfigured()) return load();
  try {
    const f = await loadFirebase();
    f.authMod.onAuthStateChanged(f.auth, u => {
      user = u && !u.isAnonymous && u.emailVerified ? u : null;
      if (!user) renderGate('התקדמות הילדים', 'כדי לראות את התוצאות יש להיכנס עם חשבון Google של ההורה.', { act: 'signin', label: 'כניסה עם Google' });
      else load();
    });
  } catch (e) {
    renderGate('אין חיבור', 'לא הצלחתי לטעון את Firebase. בדקו חיבור לאינטרנט.', { act: 'refresh', label: 'ניסיון נוסף' });
  }
}

const fail = (e, what) => { console.warn(e); alert(`${what}: ${(e && e.code === 'permission-denied') ? 'אין הרשאה. ודאו שהמייל שלכם ברשימת ההורים המורשים ב-firestore.rules.' : 'נסו שוב.'}`); };
app.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'refresh') { if (user) fam = null; return load(); }
  if (act === 'copy') {
    const el = document.getElementById('copied');
    try { await navigator.clipboard.writeText(fam.code); el.textContent = 'הקוד הועתק'; } catch (err) { el.textContent = 'לא הצלחתי להעתיק, אפשר להעתיק ידנית.'; }
    return;
  }
  if (act === 'create') { try { await createFamily(user); await reloadFamily(); } catch (err) { fail(err, 'יצירת המשפחה נכשלה'); } return; }
  if (act === 'rmkid') {
    const k = fam.roster.find(x => x.id === b.dataset.id);
    if (k && confirm(`להסיר את ${k.name} ואת כל ההיסטוריה שלו/ה? אי אפשר לשחזר.`)) { try { await removeChild(fam.code, k.id); await reloadFamily(); } catch (err) { fail(err, 'ההסרה נכשלה'); } }
    return;
  }
  if (act === 'rmparent') {
    const em = b.dataset.email;
    if (confirm(`להסיר את ${em} מהמעקב אחרי התוצאות?`)) { try { await removeParent(fam.code, em); await reloadFamily(); } catch (err) { fail(err, 'ההסרה נכשלה'); } }
    return;
  }
  const f = await loadFirebase();
  if (act === 'signin') {
    const provider = new f.authMod.GoogleAuthProvider();
    try { await f.authMod.signInWithPopup(f.auth, provider); }
    catch (err) { if (err && err.code !== 'auth/popup-closed-by-user') await f.authMod.signInWithRedirect(f.auth, provider); }
  } else if (act === 'signout') { fam = null; await f.authMod.signOut(f.auth); }
});
app.addEventListener('submit', async e => {
  e.preventDefault();
  const kind = e.target.dataset.form;
  if (kind === 'add') {
    const name = document.getElementById('kname').value.trim(); if (!name) return;
    const gender = e.target.querySelector('input[name="g"]:checked').value;
    try { await addChild(fam.code, name, gender); await reloadFamily(); } catch (err) { fail(err, 'ההוספה נכשלה'); }
  } else if (kind === 'invite') {
    try { await inviteParent(fam.code, document.getElementById('pemail').value); await reloadFamily(); }
    catch (err) { const m = { 'bad-email': 'כתובת המייל לא תקינה.', exists: 'ההורה הזה כבר ברשימה.', 'too-many': 'הגעתם למספר ההורים המקסימלי.' }[err.message]; if (m) alert(m); else fail(err, 'ההזמנה נכשלה'); }
  } else if (kind === 'test') {
    const date = document.getElementById('tdate').value, name = document.getElementById('tname').value.trim() || 'מבדק';
    try { await setTest(fam.code, date ? { name, date } : null); await reloadFamily(); } catch (err) { fail(err, 'השמירה נכשלה'); }
  }
});

window.__parent = { fromLocal, kidCard };
start();
