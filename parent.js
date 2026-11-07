// parent.js — לוח בקרה להורה: משפחה וקוד, ילדים, ולכל ילד: סיכום מילולי, השוואה להתחלה, רמות, דיוק, מגמה וטעויות.
// מקור הנתונים: Firestore (אחרי כניסה עם Google). אם Firebase לא הוגדר — רק מה ששמור במכשיר הזה.
import { firebaseConfigured, loadFirebase } from './fb.js';
import { getFamily, loadKid } from './store.js';
import { listFamilies, createFamily, addChild, removeChild, setTest, setEnName, inviteParent, removeParent, showCode, MAX_KIDS } from './family.js';

const E = window.MathEngine, I = window.Insights, A = window.Ability;
const app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const G4 = window.Grade4;
const topic = id => (id === 'times' ? { short: 'לוח הכפל', icon: '✖️' } : E.TOPICS.find(t => t.id === id) || G4.TOPICS.find(t => t.id === id) || { short: id, icon: '', name: id });
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
    const started = used(p.days) || used(d.programs.times.days) || used(d.programs.english.days) || used(d.programs.g4.days);
    return { kid: k, profile: started ? Object.assign({}, p, { streak: window.TimesEngine.streakAny(p, d.programs.times, undefined, d.programs.english), programs: d.programs }) : null,
      sessions: Object.values(d.sessions).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14) };
  });
}
async function fromRemote(code, roster) {
  const { db, fs } = await loadFirebase();
  return Promise.all(roster.map(async k => {
    const [snap, qs] = await Promise.all([
      fs.getDoc(fs.doc(db, 'families', code, 'kids', k.id)),
      fs.getDocs(fs.query(fs.collection(db, 'families', code, 'kids', k.id, 'sessions'), fs.orderBy('date', 'desc'), fs.limit(14))).catch(() => null),
    ]);
    const profile = snap.exists() ? snap.data() : null;
    return { kid: k, profile, sessions: profile && qs ? qs.docs.map(d => d.data()) : [] };
  }));
}
// מטמון תצוגה אחרונה (במכשיר ההורה בלבד): מציג מיד, ומתרענן ברקע
const CK = 'mathapp:parent:cache';
const readCache = () => { try { return JSON.parse(localStorage.getItem(CK) || 'null'); } catch (e) { return null; } };
const writeCache = v => { try { localStorage.setItem(CK, JSON.stringify(v)); } catch (e) { /* ignore */ } };

// ---------- רכיבים ----------
function chart(days, mode) { // דיוק יומי (ברירת מחדל) או ציון יכולת (mode='score') — סדרה אחת, קו דק, תווית רק לערך האחרון
  const W = 360, H = 150, L = 38, R = 14, T = 18, B = 26;
  const sc = mode === 'score', unit = sc ? '' : '%', what = sc ? 'ציון' : 'דיוק יומי';
  const pts = days.map(d => ({ day: d.day, v: sc ? d.sc : pct(d.correct, d.answered), n: d.answered }));
  if (!pts.length) return '';
  const x = i => (pts.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (pts.length - 1));
  const y = v => T + (1 - v / 100) * (H - T - B);
  const grid = [0, 50, 100].map(v => `<line class="axis" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}${unit}</text>`).join('');
  const line = pts.length > 1 ? `<polyline class="ln" points="${pts.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')}"/>` : '';
  const dots = pts.map((p, i) => `<circle class="pt" cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="5"><title>${dm(p.day)}: ${p.v}${unit}${sc ? '' : ` (${p.n} תרגילים)`}</title></circle>`).join('');
  const last = pts[pts.length - 1];
  const lastLbl = `<text class="val" x="${x(pts.length - 1).toFixed(1)}" y="${(y(last.v) - 10).toFixed(1)}" text-anchor="middle">${last.v}${unit}</text>`;
  const xl = `<text x="${x(0)}" y="${H - 6}" text-anchor="middle">${dm(pts[0].day)}</text>` + (pts.length > 1 ? `<text x="${x(pts.length - 1)}" y="${H - 6}" text-anchor="middle">${dm(last.day)}</text>` : '');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${what}: ${pts.map(p => dm(p.day) + ' ' + p.v + unit).join(', ')}" direction="ltr">${grid}${line}${dots}${lastLbl}${xl}</svg>`;
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
  const rtable = rows.length ? `<details><summary>סבבים אחרונים עם זמן</summary><table class="t"><thead><tr><th>יום</th><th class="n">תוצאה</th><th class="n">זמן</th><th class="n">ממוצע לשאלה</th><th>הערה</th></tr></thead><tbody>${rows.map(r => `<tr><td>${dm(r.d)}</td><td class="n">${r.ok}/${r.n}</td><td class="n">${I.fmtDur(r.ms)}</td><td class="n">${I.fmtAvg(r.ms / r.n)}</td><td>${[r.p ? 'הופסק באמצע' : '', r.sk ? `דילוגים: ${r.sk}` : ''].filter(Boolean).join(', ')}</td></tr>`).join('')}</tbody></table></details>` : '';
  const slow = tm.slowFacts.length ? `<p><b>תרגילים שלוקחים יותר זמן:</b> ${tm.slowFacts.map(f => `<span dir="ltr">${esc(f.text)}</span> (${I.fmtAvg(f.avgMs)})`).join(' · ')}</p>` : '';
  const bt = tm.byTopic.length ? `<p><b>ממוצע לשאלה לפי נושא:</b> ${tm.byTopic.map(t => `${esc(t.short)} ${I.fmtAvg(t.avgMs)}`).join(' · ')}</p>` : '';
  return `<div class="timeblk"><h4>⏱ זמני תרגול (מוצג להורים בלבד)</h4>${tm.paragraphs.map(x => `<p>${esc(x)}</p>`).join('')}${slow}${bt}${rtable}</div>`;
}
const dayTime = d => (d && d.tn ? [I.fmtDur(d.ms), I.fmtAvg(d.ms / d.tn)] : ['לא זמין', 'לא זמין']);


// ---------- מצב פתיחה/סגירה (נשמר במכשיר ההורה) ----------
const OPEN_KEY = 'mathapp:parent:closed';
const readClosed = () => { try { return JSON.parse(localStorage.getItem(OPEN_KEY) || '{}'); } catch (e) { return {}; } };
const writeClosed = o => { try { localStorage.setItem(OPEN_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } };
const isOpen = (key, def = true) => { const v = readClosed()[key]; return v === undefined ? def : !v; };

// ---------- ציון יכולת ----------
const bandCls = s => (s === null || s === undefined ? 'na' : s >= 80 ? 'b4' : s >= 60 ? 'b3' : s >= 40 ? 'b2' : 'b1');
function scoreChip(score, label) {
  return `<span class="sc ${bandCls(score)}" title="${esc(label || 'ציון יכולת')}">${score === null || score === undefined ? 'לא זמין' : `<b>${score}</b>/100`}</span>`;
}
function scoreBlock(ab, days) {
  const pts = Object.keys(days || {}).filter(d => days[d].sc).sort().slice(-30).map(d => ({ day: d, sc: days[d].sc, answered: days[d].answered }));
  const top = ab.topics.filter(t => t.included && ab.topics.length > 1).map(t => `<li><span>${esc(t.id === 'times' ? 'לוח הכפל' : I.SHORT[t.id])}</span>${scoreChip(t.score)}</li>`).join('');
  return `<div class="scoreblk"><div class="sc-h"><h4>ציון יכולת</h4>${scoreChip(ab.score)}${ab.score !== null ? `<span class="p-sub">${esc(A.band(ab.score))}</span>` : ''}</div>
    ${ab.score !== null ? `<div class="scbar" aria-hidden="true"><i class="${bandCls(ab.score)}" style="width:${ab.score}%"></i></div>` : `<p class="p-sub">לא זמין: ${esc(ab.need)}</p>`}
    ${top ? `<ul class="topsc">${top}</ul>` : ''}
    <p class="p-sub note">הציון אינו אחוז תשובות נכונות. הוא נשען על הרמה שהילד הגיע אליה ועל ההבנה ברמה הזו (דיוק בתשובות האחרונות), ובתשובות נכונות גם על המהירות (עד 12% מהציון${ab.score !== null && !ab.speedUsed ? '; עדיין אין מספיק נתוני זמן, ולכן המהירות נלקחה כניטרלית' : ''}). הוא אינו ציון בית-ספרי.</p>
    ${pts.length >= 2 ? `<div><h4>גרף התקדמות (ציון לפי יום)</h4>${chart(pts.map(x => ({ day: x.day, sc: x.sc, answered: x.answered })), 'score')}</div>` : `<p class="p-sub">גרף ההתקדמות יופיע אחרי שיהיו ציונים משני ימי תרגול לפחות.</p>`}</div>`;
}
function engagementLine(en, f) {
  if (!en || (!en.skips && !en.partial)) return '';
  const bits = [];
  if (en.skips) bits.push(`דילוגים: ${en.skips} (${pct(en.skips, en.answered + en.skips)}% מהשאלות שהוצגו)`);
  if (en.partial) bits.push(`${en.partial} ${en.partial === 1 ? 'תרגול הופסק' : 'תרגולים הופסקו'} באמצע (${en.partialQ} תשובות עד ההפסקה)`);
  return `<p class="engl"><b>התנהלות בתרגול:</b> ${bits.join(' · ')}. דילוג אינו נחשב כטעות, והשאלה חוזרת בסוף אותו חלק; סבב שהופסק אינו נספר כסבב מלא.</p>`;
}
const section = (key, title, score, inner) => `<details class="prog-sec" data-open-key="${esc(key)}"${isOpen(key) ? ' open' : ''}><summary><span class="st-t">${title}</span>${scoreChip(score)}</summary>${inner}</details>`;

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
  const table = `<table class="t"><thead><tr><th>יום</th><th class="n">תרגילים</th><th class="n">נכונים</th><th class="n">דיוק</th><th class="n">זמן</th><th class="n">ממוצע</th><th class="n">דילוגים</th><th class="n">הופסק</th></tr></thead><tbody>${series.slice().reverse().map(d => { const tt = dayTime(days[d.day]); return `<tr><td>${dm(d.day)}</td><td class="n">${d.answered}</td><td class="n">${d.correct}</td><td class="n">${pct(d.correct, d.answered)}%</td><td class="n">${tt[0]}</td><td class="n">${tt[1]}</td><td class="n">${days[d.day].sk || 0}</td><td class="n">${days[d.day].part || 0}</td></tr>`; }).join('')}</tbody></table>`;
  const tm = I.analyzeTiming({ days, stats: xp.stats, rlog: xp.rlog, facts: xp.facts });
  const tb = { id: 'times', short: 'לוח הכפל', level: a.level, startLevel: a.startLevel, answered: a.total, recentAcc: a.recentAcc, baseAcc: a.baseAcc };
  const ab = A.abilityScore(xp, 'times'), en = A.engagement(xp.days, xp.stats);
  const inner = `<span class="chip ${cls}" style="align-self:start">${lbl}</span>${scoreBlock(ab, xp.days)}${engagementLine(en)}
    <section class="summary"><h3>סיכום</h3>${a.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}${a.weekly ? `<p>${esc(a.weekly.text)}</p>` : ''}</section>
    <div class="bar" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= a.level ? 'on' : ''}"></i>`).join('')}</div>
    <dl class="cmp"><div><dt>התחלה</dt><dd>${fmtStart(tb)}</dd></div><div><dt>עכשיו</dt><dd>${fmtNow(tb)}</dd></div><div><dt>היום</dt><dd>${t.answered} שאלות</dd></div></dl>
    ${timeBlock(tm, xp.rlog)}
    ${a.total >= 5 ? `<div><h4>מפת התרגילים</h4>${gridHtml(a.facts)}</div>` : ''}
    ${a.weakFacts.length ? `<div><h4>תרגילים לחיזוק</h4><ul class="weakl">${a.weakFacts.map(w => `<li><b>${esc(w.text)}</b> (${w.right} נכון מתוך ${w.tries})<br>${esc(w.tip)}</li>`).join('')}</ul></div>` : ''}
    <div><h4>המלצות להמשך</h4><ul class="recs">${a.recommendations.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>
    ${series.length ? `<div><h4>דיוק יומי</h4>${chart(series)}</div><details><summary>טבלת ימים</summary>${table}</details>` : ''}`;
  return inner;
}


// ---------- סיכום להורים (חוזקות, קשיים, הסבר והמלצות) ----------
let lastRows = [];
function reportHtml(rep) {
  const sc = A.band(rep.overall.score);
  const list = (arr, fn) => (arr.length ? `<ul>${arr.map(fn).join('')}</ul>` : '');
  const prog = p => {
    if (!p.started) return `<section class="rp"><h3>${p.icon} ${esc(p.title)}</h3><p>עוד לא תורגל.</p></section>`;
    return `<section class="rp"><h3>${p.icon} ${esc(p.title)} ${scoreChip(p.ability.score)}</h3>
      ${p.ability.score === null ? `<p class="p-sub">ציון: לא זמין. ${esc(p.ability.need)}</p>` : `<p>${esc(sc && A.band(p.ability.score))} (${p.ability.score} מתוך 100)</p>`}
      ${(p.summaryParas || []).slice(0, 2).map(x => `<p>${esc(x)}</p>`).join('')}
      <h4>מה חזק</h4>${p.strengths.length ? list(p.strengths, s => `<li><b>${esc(s.title)}</b>${s.evidence ? ` <span class="p-sub">(${esc(s.evidence)})</span>` : ''}</li>`) : '<p class="p-sub">עדיין לא זוהה תחום חזק במובהק. נדרש עוד תרגול.</p>'}
      <h4>מה דורש חיזוק</h4>${p.focus.length ? p.focus.map(f => `<div class="focus"><b>${esc(f.title)}</b>${f.evidence ? `<div class="p-sub">${esc(f.evidence)}</div>` : ''}
        ${f.why.length ? `<div class="why"><b>למה זה קשה:</b>${list(f.why, w => `<li>${esc(w)}</li>`)}</div>` : ''}
        ${f.how.length ? `<div class="how"><b>איך משפרים:</b>${list(f.how, h => `<li>${esc(h)}</li>`)}</div>` : ''}</div>`).join('') : '<p class="p-sub">לא זוהו תחומים חלשים במובהק.</p>'}
      ${p.timing ? `<p class="p-sub">זמן: ממוצע ${I.fmtAvg(p.timing.avgMs)} לשאלה (${p.timing.timed} שאלות נמדדו).</p>` : ''}
      ${engagementLine(p.engagement)}</section>`;
  };
  return `<div class="report"><h2>סיכום יכולות: ${esc(rep.name)}</h2><p class="p-sub">${esc(rep.date)}</p>
    <div class="rp-ov">ציון כללי ${scoreChip(rep.overall.score, 'ציון כללי')} ${rep.overall.score !== null ? `<span>${esc(rep.overall.band)}</span>` : '<span class="p-sub">לא זמין (אין מספיק נתונים)</span>'}</div>
    <p class="p-sub note">הציון מודד את הרמה ואת ההבנה במערכת התרגול, ובתשובות נכונות גם את המהירות. הוא אינו אחוז תשובות נכונות ואינו ציון בית-ספרי.</p>
    ${rep.programs.map(prog).join('')}
    ${rep.notes.length ? `<section class="rp"><h3>התנהלות בתרגול</h3>${list(rep.notes, n => `<li>${esc(n)}</li>`)}</section>` : ''}
    ${rep.nextSteps.length ? `<section class="rp"><h3>מה כדאי לעשות בבית</h3>${list(rep.nextSteps, n => `<li>${esc(n)}</li>`)}</section>` : ''}</div>`;
}
const REPORT_CSS = 'body{font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif;max-width:720px;margin:0 auto;padding:18px;line-height:1.55;color:#1B2A4A}h2{margin:.2em 0}h3{border-bottom:2px solid #1B2A4A;padding-bottom:4px;margin-top:1.4em}h4{margin:1em 0 .2em}.p-sub{color:#55607A}.sc{display:inline-block;padding:1px 10px;border-radius:999px;border:2px solid #1B2A4A;font-size:15px}.focus{border:2px solid #C9D2E8;border-radius:12px;padding:8px 12px;margin:8px 0}li{margin:.2em 0}.how{background:#E9F6EF;border-radius:8px;padding:4px 10px;margin-top:6px}.why{background:#FFF6DF;border-radius:8px;padding:4px 10px;margin-top:6px}';
function reportFile(rep) {
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>סיכום יכולות: ${esc(rep.name)}</title><style>${REPORT_CSS}</style></head><body>${reportHtml(rep)}</body></html>`;
}
function openReport(id) {
  const row = lastRows.find(r => r.kid.id === id); if (!row || !row.profile) return;
  const rep = A.buildReport(row.kid, row.profile, { today: E.dayKey() });
  window.__lastReport = rep; rep.kidId = id;
  const m = document.createElement('div');
  m.className = 'modal rmodal'; m.id = 'rmodal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'סיכום להורים');
  m.innerHTML = `<div class="mbox rbox"><div class="rbar"><button class="btn" data-act="rdownload">הורדת קובץ</button><button class="btn" data-act="rcopy">העתקת טקסט</button><button class="btn" data-act="rshare">שיתוף</button><button class="btn primary" data-act="rpdf">📤 PDF לשיתוף</button><button class="btn" data-act="rprint">הדפסה</button><button class="btn" data-act="rclose">סגירה</button></div><p class="p-sub" id="rmsg" role="status"></p>${reportHtml(rep)}</div>`;
  app.appendChild(m);
}
async function reportAction(act) {
  const rep = window.__lastReport; if (!rep) return;
  const msg = document.getElementById('rmsg'), say = t => { if (msg) msg.textContent = t; };
  if (act === 'rclose') { const m = document.getElementById('rmodal'); if (m) m.remove(); return; }
  if (act === 'rprint') { document.body.classList.add('printing-report'); window.print(); setTimeout(() => document.body.classList.remove('printing-report'), 500); return; }
  if (act === 'rcopy') { try { await navigator.clipboard.writeText(A.reportText(rep)); say('הסיכום הועתק. אפשר להדביק בהודעה או במסמך.'); } catch (e) { say('לא הצלחתי להעתיק. אפשר להוריד כקובץ.'); } return; }
  if (act === 'rshare') {
    if (navigator.share) { try { await navigator.share({ title: `סיכום יכולות: ${rep.name}`, text: A.reportText(rep) }); } catch (e) { /* בוטל */ } }
    else say('השיתוף לא נתמך בדפדפן הזה. אפשר להעתיק או להוריד.');
    return;
  }
  if (act === 'rdownload') {
    const blob = new Blob([reportFile(rep)], { type: 'text/html;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `סיכום-${rep.name}-${rep.date}.html`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000); say('הקובץ הורד. אפשר לפתוח אותו, להדפיס או לשמור כ-PDF.');
  }
}

// ---------- PDF לשיתוף ----------
const loadScript = src => new Promise((res, rej) => {
  if (document.querySelector(`script[data-lib="${src}"]`)) return res();
  const s = document.createElement('script'); s.src = src; s.dataset.lib = src; s.onload = () => res(); s.onerror = () => rej(new Error('lib'));
  document.head.appendChild(s);
});
async function loadPdfLibs() {
  if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  if (!window.jspdf) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
}
async function makePdf(id, btn) {
  const row = lastRows.find(r => r.kid.id === id);
  if (!row || !row.profile) { alert('אין עדיין נתונים להפקת PDF.'); return; }
  const note = document.getElementById('rmsg');
  const say = t => { if (note) note.textContent = t; else if (btn) btn.textContent = t; };
  const label = btn && btn.textContent;
  if (btn) btn.disabled = true;
  say('מכין PDF…');
  let host;
  try {
    await loadPdfLibs();
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* ignore */ } }
    const rep = A.buildReport(row.kid, row.profile, { today: E.dayKey() });
    host = document.createElement('div');
    host.className = 'pdfroot'; host.setAttribute('dir', 'rtl'); host.setAttribute('aria-hidden', 'true');
    host.innerHTML = reportHtml(rep) + `<div class="pdf-full"><h2 class="pdf-h">כל התוצאות</h2>${kidCard(row)}</div>` + `<p class="p-sub note">הופק מ"לומדים כל יום" · ${esc(rep.date)}</p>`;
    host.querySelectorAll('.kc-act, .kc-sub').forEach(e => e.remove());
    host.querySelectorAll('details').forEach(d => { d.open = true; });
    document.body.appendChild(host);
    const W = 520, scale = Math.min(2, window.devicePixelRatio || 2);
    const canvas = await window.html2canvas(host, { scale, backgroundColor: '#ffffff', width: W, windowWidth: W, useCORS: true, logging: false });
    // עימוד: חיתוך רק בין בלוקים; כותרות נשארות עם התוכן שאחריהן; תיבות, גרפים וטבלאות לא נחתכים
    const hostTop = host.getBoundingClientRect().top;
    const T = el => (el.getBoundingClientRect().top - hostTop) * scale, Bm = el => (el.getBoundingClientRect().bottom - hostTop) * scale;
    const heads = Array.from(host.querySelectorAll('h2, h3, h4, summary, .tb-h, .pdf-h, .rp-ov, thead, .bar')).map(Bm);
    const cuts = Array.from(host.querySelectorAll('p, li, tr, div, dl > div, details, .focus, svg.chart, .grid')).map(Bm).filter(c => !heads.some(h => Math.abs(h - c) < 3)).sort((x, y) => x - y);
    const boxes = Array.from(host.querySelectorAll('.focus, .summary, .cmp, .scoreblk, .tb, .timeblk, li, table, svg.chart, .grid, .why, .how, dl')).map(el => [T(el), Bm(el)]);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 26, foot = 22;
    const ratio = (pw - 2 * m) / canvas.width, pageH = (ph - 2 * m - foot) / ratio; // גובה אזור תוכן בפיקסלי קנבס
    const ranges = [];
    for (let y = 0; y < canvas.height - 2;) {
      let end = Math.min(y + pageH, canvas.height);
      if (end < canvas.height) {
        const inside = c => boxes.some(([t, b]) => c > t + 3 && c < b - 3 && b - t < pageH * 0.9);
        const ok = cuts.filter(c => c > y + pageH * 0.3 && c <= end && !inside(c));
        if (ok.length) end = ok[ok.length - 1];
      }
      end = Math.max(end, y + 1); ranges.push([y, end]); y = end;
    }
    const N = ranges.length, fam = (getComputedStyle(document.body).fontFamily || 'sans-serif');
    ranges.forEach(([y0, y1], i) => {
      const h = Math.round(y1 - y0), part = document.createElement('canvas');
      part.width = canvas.width; part.height = Math.round(pageH + foot / ratio);
      const ctx = part.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, part.width, part.height);
      ctx.drawImage(canvas, 0, Math.round(y0), canvas.width, h, 0, 0, canvas.width, h);
      ctx.strokeStyle = '#C9D2E8'; ctx.lineWidth = scale; ctx.beginPath(); ctx.moveTo(0, part.height - 24 * scale); ctx.lineTo(part.width, part.height - 24 * scale); ctx.stroke();
      ctx.fillStyle = '#55607A'; ctx.font = `${13 * scale}px ${fam}`; ctx.direction = 'rtl'; ctx.textAlign = 'right';
      ctx.fillText(`לומדים כל יום · ${row.kid.name} · ${rep.date}`, part.width - 4 * scale, part.height - 7 * scale);
      ctx.textAlign = 'left'; ctx.fillText(`עמוד ${i + 1} מתוך ${N}`, 4 * scale, part.height - 7 * scale);
      if (i) pdf.addPage();
      pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', m, m, canvas.width * ratio, part.height * ratio);
    });
    const blob = pdf.output('blob'), name = `סיכום-${row.kid.name}-${rep.date}.pdf`;
    const file = new File([blob], name, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: `סיכום יכולות: ${row.kid.name}` }); say('ה-PDF מוכן.'); return; }
      catch (e) { if (e && e.name === 'AbortError') { say(''); return; } }
    }
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 8000); say('ה-PDF הורד למכשיר.');
  } catch (e) {
    console.warn(e); say('לא הצלחתי להפיק PDF (נדרש חיבור לאינטרנט). אפשר להשתמש ב"הדפסה" ולשמור כ-PDF.');
  } finally {
    if (host) host.remove();
    if (btn) { btn.disabled = false; if (label && !note) setTimeout(() => { btn.textContent = label; }, 2500); }
  }
}

function kidCard(r) {
  const { kid, profile, sessions } = r;
  const f = kid.gender === 'f';
  const head = `<header><h2>${esc(kid.emoji || '')} ${esc(kid.name)}</h2>`;
  if (!profile) return `<article class="kidcard">${head}</header><p class="empty">עוד לא התחיל${f ? 'ה' : ''} לתרגל.</p></article>`;

  const today = E.dayKey(), days = profile.days || {};
  const xp = profile.programs && profile.programs.times, xdays = (xp && xp.days) || {};
  const used = d => Object.keys(d).filter(k => d[k].answered > 0);
  const ep = profile.programs && profile.programs.english, edays = (ep && ep.days) || {};
  const gdays = (profile.programs && profile.programs.g4 && profile.programs.g4.days) || {};
  const dayList = used(days).sort(), xList = used(xdays), eList = used(edays), gList = used(gdays);
  const lastDay = dayList.concat(xList, eList, gList).sort().pop();
  const since = lastDay ? daysSince(lastDay) : null;
  const mistakes = sessions.flatMap(s => (s.mistakes || []).map(m => Object.assign({ day: s.date }, m))).sort((x, y) => (y.t || y.day).localeCompare(x.t || x.day)).slice(0, 15);
  const mist = mistakes.length
    ? `<ul class="mist">${mistakes.map(m => `<li><div class="q"><b>${topic(m.topic).icon} ${esc(topic(m.topic).short)}</b> · ${dm(m.day)}<br>${esc(m.q)}</div><div class="a">${f ? 'ענתה' : 'ענה'}: <b dir="ltr">${esc(m.given)}</b> · נכון: <b dir="ltr">${esc(m.correct)}</b></div></li>`).join('')}</ul>`
    : '<p class="empty">אין טעויות שמורות.</p>';
  const ov = A.overallScore(profile);
  const key = kid.id + ':card';
  return `<details class="kidcard" data-open-key="${esc(key)}"${isOpen(key) ? ' open' : ''}>
    <summary class="kc-sum"><h2 class="kc-name">${esc(kid.emoji || '')} ${esc(kid.name)}</h2>${scoreChip(ov.score, 'ציון כללי')}<span class="p-sub kc-sub">${ov.score !== null ? `ציון כללי · ${esc(ov.band)}` : 'ציון כללי: לא זמין'} · מתמטיקה ${ov.math === null ? 'לא זמין' : ov.math} · אנגלית ${ov.english.score === null ? 'לא זמין' : ov.english.score}${lastDay ? ` · תרגול אחרון: ${since === 0 ? 'היום' : since === 1 ? 'אתמול' : dm(lastDay)}` : ''}${profile.streak ? ` · ${profile.streak} ${profile.streak === 1 ? 'יום' : 'ימים'} ברצף` : ''}</span></summary>
    ${since !== null && since >= 2 ? `<p class="warn">לא ${f ? 'תרגלה' : 'תרגל'} ${since} ימים (מאז ${dm(lastDay)}).</p>` : ''}
    <div class="kc-act"><button class="btn" data-act="report" data-id="${esc(kid.id)}">📄 סיכום להורים: חוזקות, קשיים והמלצות</button><button class="btn primary" data-act="pdf" data-id="${esc(kid.id)}">📤 PDF לשיתוף</button></div>
    ${mathSubject(kid, profile, sessions, today, ov, mist, mistakes.length)}
    ${englishSubject(kid, ep, today, ov, eList.length)}
  </details>`;
}

// ---------- אנגלית ----------
const EN = window.EnglishEngine;
function englishSubject(kid, ep, today, ov, n) {
  const f = kid.gender === 'f';
  if (!ep || !n) {
    const e0 = EN.ensureProfile(ep ? ep : EN.newProfile());
    const rows = EN.TOPICS.map(tp => trow(`${kid.id}:en:${tp.id}`, tp.icon, tp.title, 'עוד לא תורגל', null, `<p class="empty">עוד לא תורגל.</p><p class="p-sub note">לפי תוכנית הלימודים: ${esc(tp.curr)}</p>`)).join('');
    return subj(`${kid.id}:english`, '🔤 אנגלית', null, `עוד לא ${f ? 'התחילה' : 'התחיל'} ללמוד אנגלית`, rows);
  }
  const s = englishSection(kid, ep, today), ab = ov.english;
  const inc = (ab.areas || []).filter(a => a.included);
  const sub = inc.length ? inc.slice(0, 4).map(a => `${a.title} ${a.score}`).join(' · ') : 'אין עדיין מספיק נתונים לציון';
  return subj(`${kid.id}:english`, '🔤 אנגלית', s.score, sub, `${s.rows}
    ${trow(`${kid.id}:en:more`, '📋', 'סיכום, חוזקות והמלצות באנגלית', 'ציון, גרף, תחומים וטבלת ימים', s.score, s.details)}
    ${trow(`${kid.id}:en:curr`, '🏫', 'התאמה לתוכנית משרד החינוך', 'רשימות המילים ודרישות כיתה ד\'', null, s.curr)}`);
}
function englishSection(kid, ep, today) {
  EN.ensureProfile(ep);
  const ab = EN.abilityScore(ep), rep = EN.report(kid, ep), lk = EN.locks(ep), f = kid.gender === 'f';
  const days = ep.days || {}, dl = Object.keys(days).filter(d => days[d].answered > 0).sort();
  const series = dl.slice(-14).map(d => ({ day: d, answered: days[d].answered, correct: days[d].correct }));
  const t = days[today] || { answered: 0 };
  const status = a => {
    const tp = EN.TOPICS.find(x => x.areas.includes(a.id));
    if (!a.answered) return lk[tp.id] ? '<span class="chip neutral">נעול</span>' : '<span class="chip neutral">עוד לא התחיל</span>';
    if (!a.included) return '<span class="chip neutral">מעט נתונים</span>';
    return `<span class="chip ${a.score >= 60 ? 'up' : a.score >= 40 ? 'flat' : 'down'}">${esc(A.band(a.score))}</span>`;
  };
  const rows = ab.areas.map(a => `<tr><td>${a.icon} ${esc(a.title)}</td><td class="n">${a.mastered} מתוך ${a.target}</td><td class="n">${a.acc === null ? 'לא זמין' : Math.round(a.acc * 100) + '%'}</td><td class="n">${a.answered}</td><td>${status(a)}</td></tr>`).join('');
  const dot = (area, it) => { const r = (ep.st[area] || {})[it]; const b = r ? r[0] : 0; return `<i class="${!r ? 'n' : b >= EN.MASTER ? 'g' : r[2] > r[1] ? 'w' : 'm'}"></i>`; };
  const letters = EN.LETTERS.map(x => `<div class="lc${ep.intro.L.includes(x.l) || (ep.st.wlo || {})[x.l] ? '' : ' off'}"><b dir="ltr">${x.u}${x.l}</b><span>${dot('lname', x.l)}${dot('lsound', x.l)}${dot('wup', x.u)}${dot('wlo', x.l)}</span></div>`).join('');
  const known = ep.intro.W.map(id => EN.WD[id]).filter(Boolean);
  const wchip = w => { const b = EN.box(ep, 'vocab', w.id), r = (ep.st.vocab || {})[w.id]; return `<span class="wchip ${b >= EN.MASTER ? 'g' : r && r[2] > r[1] ? 'w' : 'm'}"><b dir="ltr">${esc(w.en)}</b> ${esc(w.he)}</span>`; };
  const hw = ep.hw || {}, sp = ep.sp || {};
  const hwLine = hw.n ? `<p>נבדקו ${hw.n} כתיבות של אותיות. ${[hw.dir ? `כיוון כתיבה הפוך: ${hw.dir}` : '', hw.pos ? `מיקום לא נכון על הקווים: ${hw.pos}` : '', hw.case ? `אות גדולה במקום קטנה (או להפך): ${hw.case}` : '', hw.dot ? `נקודה חסרה ב-i/j: ${hw.dot}` : '', hw.neat ? `כתיבה לא ברורה מספיק: ${hw.neat}` : ''].filter(Boolean).join(' · ') || 'לא נמצאו בעיות חוזרות.'}</p>` : '<p class="p-sub">עוד לא נבדקה כתיבה.</p>';
  const spLine = sp.tries || sp.self ? `<p>${sp.tries ? `ניסיונות דיבור שנבדקו אוטומטית: ${sp.tries}, מתוכם ${sp.ok} זוהו כנכונים (${pct(sp.ok, sp.tries)}%).` : ''} ${sp.self ? `תרגולי הקלטה ושמיעה עצמית (בלי בדיקה אוטומטית): ${sp.self}.` : ''}</p><p class="p-sub note">זיהוי הדיבור נעשה על ידי שירות הזיהוי של הדפדפן, והוא לא תמיד מדויק בקולות של ילדים. התוצאה היא אינדיקציה בלבד.</p>` : '<p class="p-sub">עוד לא היה תרגול דיבור.</p>';
  const table = `<table class="t"><thead><tr><th>יום</th><th class="n">משימות</th><th class="n">נכונות</th><th class="n">דיוק</th><th class="n">שיעורים</th><th class="n">ממוצע</th><th class="n">דילוגים</th><th class="n">הופסק</th></tr></thead><tbody>${series.slice().reverse().map(d => { const dd = days[d.day]; return `<tr><td>${dm(d.day)}</td><td class="n">${d.answered}</td><td class="n">${d.correct}</td><td class="n">${pct(d.correct, d.answered)}%</td><td class="n">${dd.rounds || 0}</td><td class="n">${dd.tn ? I.fmtAvg(dd.ms / dd.tn) : 'לא זמין'}</td><td class="n">${dd.sk || 0}</td><td class="n">${dd.part || 0}</td></tr>`; }).join('')}</tbody></table>`;
  const pts = dl.filter(d => days[d].sc).slice(-30).map(d => ({ day: d, sc: days[d].sc, answered: days[d].answered }));
  const list = (arr, fn) => (arr.length ? `<ul>${arr.map(fn).join('')}</ul>` : '');
  const en = { answered: rep.engagement.answered, skips: rep.engagement.skips, partial: rep.engagement.partial, partialQ: rep.engagement.partialQ };
  const detail = {
    letters: `<div><h4>מפת האותיות</h4><div class="lgrid">${letters}</div><p class="p-sub note">בכל אות ארבע נקודות: שם · צליל · כתיבת גדולה · כתיבת קטנה. ירוק = בשליטה, צהוב = בלמידה, אדום = מתקשה, אפור = עוד לא תורגל.</p></div>`,
    write: `<div class="timeblk"><h4>✍️ כתיבה באצבע</h4>${hwLine}</div>`,
    words: `<div><h4>מילים (${known.length} נלמדו, ${EN.masteredList(ep, 'vocab').length} בשליטה)</h4>${known.length ? `<div class="wchips">${known.map(wchip).join('')}</div>` : '<p class="p-sub">עוד לא נלמדו מילים.</p>'}</div>`,
    speak: `<div class="timeblk"><h4>🗣️ דיבור</h4>${spLine}</div>`,
    talk: `<div><h4>ביטויים שנלמדו (${ep.intro.C.length} מתוך ${EN.CHUNKS.length})</h4>${ep.intro.C.length ? `<div class="wchips">${ep.intro.C.map(id => EN.CD[id]).filter(Boolean).map(c => { const b = EN.box(ep, 'chunk', 'K:' + c.id); return `<span class="wchip ${b >= EN.MASTER ? 'g' : 'm'}"><b dir="ltr">${esc(c.en)}</b> ${esc(c.he)}</span>`; }).join('')}</div>` : '<p class="p-sub">עוד לא נלמדו ביטויים.</p>'}</div>`,
  };
  const cur = EN.curriculum(ep);
  const currHtml = `<p>התוכן באנגלית מותאם ל<b>תוכנית הלימודים באנגלית של משרד החינוך לבית הספר היסודי (2020)</b> ולרשימת המילים הרשמית <b>Lexical Pre-Band I &amp; Band I, Elementary School</b> (נובמבר 2020). לפי התוכנית, כיתה ד' נמצאת בסוף שלב Pre-A1 (Pre-Band I) ובתחילת A1 (Band I Core I).</p>
    <div class="tscroll"><table class="t"><thead><tr><th>רשימה</th><th class="n">במאגר</th><th class="n">נלמדו</th><th class="n">בשליטה</th></tr></thead><tbody>${['PB', 'C1', 'C2'].map(b => `<tr><td dir="ltr" style="text-align:right">${cur[b].label}</td><td class="n">${cur[b].inBank}</td><td class="n">${cur[b].learned}</td><td class="n">${cur[b].mastered}</td></tr>`).join('')}</tbody></table></div>
    <p class="p-sub note">"במאגר" הוא מספר המילים מכל רשימה שיש להן תרגול באפליקציה (בעיקר מילים שאפשר להציג בתמונה או בתרגום). הרשימות הרשמיות כוללות גם מילות קישור ומילים דקדוקיות (a, the, is, of…) שמתורגלות בתוך משפטים ולא כמילים בודדות. סיווג המילים לרשימות נבדק מול מסמך משרד החינוך בקריאה אוטומטית, ולכן ייתכנו טעויות בודדות.</p>
    <ul class="currl">${EN.TOPICS.map(t => `<li><b>${t.icon} ${esc(t.title)}:</b> ${esc(t.curr)}</li>`).join('')}</ul>`;
  const inner = `<div class="scoreblk"><div class="sc-h"><h4>ציון יכולת באנגלית</h4>${scoreChip(ab.score)}${ab.score !== null ? `<span class="p-sub">${esc(A.band(ab.score))}</span>` : ''}</div>
      ${ab.score !== null ? `<div class="scbar" aria-hidden="true"><i class="${bandCls(ab.score)}" style="width:${ab.score}%"></i></div>` : `<p class="p-sub">לא זמין: ${esc(ab.need)}</p>`}
      <ul class="topsc">${ab.areas.filter(a => a.included).map(a => `<li><span>${a.icon} ${esc(a.title)}</span>${scoreChip(a.score)}</li>`).join('')}</ul>
      <p class="p-sub note">הציון אינו אחוז תשובות נכונות. בכל תחום הוא נשען על כמה מתוכנית הלימוד הילד כבר שולט בה (70%) ועל הדיוק בתשובות האחרונות (30%), ובתשובות נכונות גם על המהירות (עד 12%). פריט נחשב "בשליטה" אחרי כמה תשובות נכונות ברצף, ולא אחרי פעם אחת. יעדי התוכנית (26 אותיות, 100 מילים ועוד) הם פרמטרי תכנון ולא תוכנית בית-ספרית רשמית.</p>
      ${pts.length >= 2 ? `<div><h4>גרף התקדמות (ציון לפי יום)</h4>${chart(pts, 'score')}</div>` : '<p class="p-sub">גרף ההתקדמות יופיע אחרי שיהיו ציונים משני ימי תרגול לפחות.</p>'}</div>
    ${engagementLine(en)}
    <section class="summary"><h3>סיכום</h3>${(rep.summaryParas || []).map(x => `<p>${esc(x)}</p>`).join('')}<p>היום: ${t.answered} משימות באנגלית.</p></section>
    <div><h4>תמונת מצב לפי תחום</h4><div class="tscroll"><table class="t en-areas"><thead><tr><th>תחום</th><th class="n">בשליטה</th><th class="n">דיוק אחרון</th><th class="n">תשובות</th><th>מצב</th></tr></thead><tbody>${rows}</tbody></table></div></div>
    <div><h4>מה חזק</h4>${rep.strengths.length ? list(rep.strengths, s => `<li><b>${esc(s.title)}</b>${s.evidence ? ` <span class="p-sub">(${esc(s.evidence)})</span>` : ''}</li>`) : '<p class="p-sub">עדיין לא זוהה תחום חזק במובהק. נדרש עוד תרגול.</p>'}</div>
    <div><h4>מה דורש חיזוק, למה, ואיך עוזרים</h4>${rep.focus.length ? rep.focus.map(x => `<div class="focus"><b>${esc(x.title)}</b>${x.evidence ? `<div class="p-sub">${esc(x.evidence)}</div>` : ''}<div class="why"><b>למה זה קשה:</b>${list(x.why, w => `<li>${esc(w)}</li>`)}</div><div class="how"><b>איך משפרים:</b>${list(x.how, h => `<li>${esc(h)}</li>`)}</div></div>`).join('') : '<p class="p-sub">לא זוהו תחומים חלשים במובהק.</p>'}</div>
    ${series.length ? `<div><h4>דיוק יומי</h4>${chart(series)}</div><details><summary>טבלת ימים</summary><div class="tscroll">${table}</div></details>` : ''}`;
  // שורות לפי הנושאים שהילד רואה בתפריט, עם ציון לכל נושא (ממוצע התחומים שיש להם ציון)
  const areaRow = a => `<tr><td>${a.icon} ${esc(a.title)}</td><td class="n">${a.mastered} מתוך ${a.target}</td><td class="n">${a.acc === null ? 'לא זמין' : Math.round(a.acc * 100) + '%'}</td><td class="n">${a.answered}</td><td>${status(a)}</td></tr>`;
  const topicRows = EN.TOPICS.map(tp => {
    const ar = tp.areas.map(id => ab.areas.find(a => a.id === id)), inc = ar.filter(a => a.included);
    const score = inc.length ? Math.round(inc.reduce((x, a) => x + a.score, 0) / inc.length) : null;
    const ans = ar.reduce((x, a) => x + a.answered, 0);
    const sub = lk[tp.id] && !ans ? 'נעול: ' + lk[tp.id].need : ans ? `${ans} תשובות · ${ar.map(a => `${a.mastered}/${a.target} ${a.unit}`).join(' · ')}` : 'עוד לא תורגל';
    const det = { letters: detail.letters, write: detail.write, words: detail.words, speak: detail.speak, talk: detail.talk }[tp.id] || '';
    return trow(`${kid.id}:en:${tp.id}`, tp.icon, tp.title, sub, score, `<div class="tscroll"><table class="t en-areas"><thead><tr><th>תחום</th><th class="n">בשליטה</th><th class="n">דיוק אחרון</th><th class="n">תשובות</th><th>מצב</th></tr></thead><tbody>${ar.map(areaRow).join('')}</tbody></table></div>${det}<p class="p-sub note">לפי תוכנית הלימודים: ${esc(tp.curr)}</p>`);
  }).join('');
  return { score: ab.score, rows: topicRows, details: inner, curr: currHtml };
}
// שורה של נושא: נפתחת בלחיצה
const trow = (key, icon, title, sub, score, inner) => `<details class="tpr" data-open-key="${esc(key)}"${isOpen(key, false) ? ' open' : ''}><summary><span class="tr-ic" aria-hidden="true">${icon}</span><span class="tr-t"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>${scoreChip(score)}</summary><div class="tr-in">${inner}</div></details>`;
const subj = (key, title, score, sub, inner) => `<details class="subj-sec" data-open-key="${esc(key)}"${isOpen(key, false) ? ' open' : ''}><summary><span class="st-t">${title}</span>${scoreChip(score)}<span class="p-sub sj-sub">${esc(sub)}</span></summary><p class="p-sub hint">לחצו על נושא כדי לראות את הפירוט.</p>${inner}</details>`;
// פירוט לנושא מ"כל נושאי כיתה ד'"
function g4Detail(g, ts, id) {
  const st = g.stats[id] || {}, h = g.hist[id] || '', bl = g.baseline[id] || { n: 0 }, tp = G4.TOPICS.find(t => t.id === id);
  if (!st.answered) return `<p class="empty">עוד לא תורגל. ${esc(tp.name)}.</p>`;
  const lv = g.levels[id], weak = ts && ts.included && (ts.acc < 0.6 || ts.level <= 1);
  return `<div class="bar" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</div>
    <dl class="cmp"><div><dt>התחלה</dt><dd>${bl.n >= 10 ? Math.round(100 * bl.c / bl.n) + '%' : 'לא זמין'}</dd></div><div><dt>עכשיו</dt><dd>רמה ${lv} (${E.LEVEL_NAMES[lv]})${h.length ? ` · ${Math.round(100 * [...h.slice(-15)].filter(c => c === '1').length / h.slice(-15).length)}%` : ''}</dd></div><div><dt>תשובות</dt><dd>${st.answered}</dd></div></dl>
    ${st.tn ? `<p class="p-sub">זמן ממוצע לשאלה: ${I.fmtAvg(st.ms / st.tn)}</p>` : ''}
    ${weak ? `<div class="focus"><div class="why"><b>למה זה קשה:</b> ${esc(G4.WHY[id])}</div><div class="how"><b>איך משפרים:</b><ul>${G4.HOW[id].map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>` : ''}
    <p class="p-sub note">לפי תוכנית הלימודים לכיתה ד': ${esc(tp.name)} (${esc(tp.area)}).</p>`;
}
function mathSubject(kid, profile, sessions, today, ov, mist, nMist) {
  const f = kid.gender === 'f', days = profile.days || {};
  const used = d => Object.keys(d || {}).filter(k => d[k].answered > 0);
  const dayList = used(days).sort();
  const xp = profile.programs && profile.programs.times, gp = profile.programs && profile.programs.g4;
  const g = G4.ensureProfile(gp ? gp : G4.newProfile());
  const a = dayList.length ? I.analyzeKid(profile, { name: kid.name, gender: kid.gender, today }) : null;
  const tsc = id => (ov.test.topics || []).find(t => t.id === id);
  const subT = (ts, st, lv) => (st && st.answered ? `רמה ${lv} · ${st.answered} תשובות${ts && ts.included ? ` · ${Math.round(ts.acc * 100)}% לאחרונה` : ''}` : 'עוד לא תורגל');
  const testRows = E.TOPICS.map(t => { const ts = tsc(t.id), st = (profile.stats || {})[t.id], blk = a && a.topics.find(x => x.id === t.id);
    return trow(`${kid.id}:m:${t.id}`, t.icon, t.short, subT(ts, st, (profile.levels || {})[t.id] || 1), ts && ts.included ? ts.score : null, blk && st && st.answered ? topicBlock(blk) : '<p class="empty">עוד לא תורגל.</p>'); }).join('');
  const testMore = dayList.length ? trow(`${kid.id}:m:testmore`, '📋', 'סיכום ופרטים: הכנה למבדק', 'ציון, גרף, זמנים וטבלת ימים', ov.test.score, testSection(kid, profile, sessions, dayList, today)) : '';
  const xList = used(xp && xp.days);
  const timesRow = trow(`${kid.id}:m:times`, '✖️', 'לוח הכפל', xList.length ? `רמה ${xp.levels.times} · ${xp.stats.times.answered} תשובות` : 'עוד לא תורגל', ov.times.score, xList.length ? timesSection(kid, xp, today) : `<p class="empty">עוד לא ${f ? 'תרגלה' : 'תרגל'} את לוח הכפל.</p>`);
  const g4Rows = G4.TOPICS.map(t => { const ts = (ov.g4.topics || []).find(x => x.id === t.id), st = g.stats[t.id];
    return trow(`${kid.id}:g4:${t.id}`, t.icon, t.short, subT(ts, st, g.levels[t.id]), ts && ts.included ? ts.score : null, g4Detail(g, ts, t.id)); }).join('');
  const sub = `הכנה למבדק ${ov.test.score === null ? 'לא זמין' : ov.test.score} · לוח הכפל ${ov.times.score === null ? 'לא זמין' : ov.times.score} · כיתה ד' ${ov.g4.score === null ? 'לא זמין' : ov.g4.score}`;
  const inner = `<h4 class="grp">📝 הכנה למבדק ${scoreChip(ov.test.score)}</h4>${testRows}${testMore}
    <h4 class="grp">✖️ לוח הכפל ${scoreChip(ov.times.score)}</h4>${timesRow}
    <h4 class="grp">🎓 כל נושאי כיתה ד' ${scoreChip(ov.g4.score)}</h4><p class="p-sub">נושאים מתוכנית הלימודים במתמטיקה של משרד החינוך לכיתה ד' שאינם בחוברת המבדק.${ov.g4.score === null && G4.used(g) ? ' ' + esc(ov.g4.need) : ''}</p>${g4Rows}
    ${trow(`${kid.id}:m:mist`, '❗', 'טעויות אחרונות', `${nMist} טעויות שמורות`, null, mist)}`;
  return subj(`${kid.id}:math`, '🔢 מתמטיקה', ov.math, sub, inner);
}

function testSection(kid, profile, sessions, dayList, today) {
  const days = profile.days || {};
  const t = days[today] || { answered: 0, correct: 0, rounds: 0 };
  const week = dayList.filter(d => daysSince(d) < 7).reduce((a, d) => ({ n: a.n + days[d].answered, c: a.c + days[d].correct }), { n: 0, c: 0 });
  const wkPct = pct(week.c, week.n);
  const a = I.analyzeKid(profile, { name: kid.name, gender: kid.gender, today });
  const series = dayList.slice(-14).map(d => ({ day: d, answered: days[d].answered, correct: days[d].correct }));
  const table = `<table class="t"><thead><tr><th>יום</th><th class="n">תרגילים</th><th class="n">נכונים</th><th class="n">דיוק</th><th class="n">סבבים</th><th class="n">זמן</th><th class="n">ממוצע</th><th class="n">דילוגים</th><th class="n">הופסק</th></tr></thead><tbody>${series.slice().reverse().map(d => { const tt = dayTime(days[d.day]); return `<tr><td>${dm(d.day)}</td><td class="n">${d.answered}</td><td class="n">${d.correct}</td><td class="n">${pct(d.correct, d.answered)}%</td><td class="n">${days[d.day].rounds || 0}</td><td class="n">${tt[0]}</td><td class="n">${tt[1]}</td><td class="n">${days[d.day].sk || 0}</td><td class="n">${days[d.day].part || 0}</td></tr>`; }).join('')}</tbody></table>`;
  const tmT = I.analyzeTiming({ days, stats: profile.stats });
  const tmHtml = tmT.timed ? `<div class="timeblk"><h4>⏱ זמני תרגול (מוצג להורים בלבד)</h4><p>בכל התרגול שנמדד (${tmT.timed} שאלות): ממוצע ${I.fmtAvg(tmT.avgMs)} לשאלה, סך הכול ${I.fmtDur(tmT.totalMs)}.</p>${tmT.byTopic.length ? `<p><b>ממוצע לשאלה לפי נושא:</b> ${tmT.byTopic.map(t => `${esc(t.short)} ${I.fmtAvg(t.avgMs)}`).join(' · ')}</p>` : ''}</div>` : '';
  const ab = A.abilityScore(profile, 'test'), en = A.engagement(days, profile.stats);
  const inner = `${scoreBlock(ab, days)}${engagementLine(en)}<section class="summary" aria-label="סיכום מילולי"><h3>סיכום</h3>${a.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}${a.weekly ? `<p>${esc(a.weekly.text)}</p>` : ''}</section>
    <div class="stats">
      <div class="stat"><b>${t.answered} שאלות${t.rounds ? ` · ${t.rounds} ${t.rounds === 1 ? 'סבב' : 'סבבים'}` : ''}</b><span>היום</span></div>
      <div class="stat"><b>${wkPct === null ? 'לא זמין' : wkPct + '%'}</b><span>דיוק ב-7 ימים (${week.n} תרגילים)</span></div>
    </div>
    <div><h4>השוואה בין ההתחלה למצב הנוכחי, לפי נושא</h4><div class="tbs">${a.topics.map(topicBlock).join('')}</div>
      <p class="p-sub note">"התחלה" היא 10 התשובות הראשונות בנושא, ו"עכשיו" הן 15 התשובות האחרונות. הרמה מתעדכנת אחרי כל תשובה, ולכן דיוק גבוה ברמה גבוהה יותר הוא שיפור גם אם אחוז ההצלחה דומה.</p></div>
    ${series.length ? `<div><h4>דיוק יומי</h4>${chart(series)}</div>` : ''}
    ${tmHtml}
    <details><summary>טבלת ימים</summary>${table}</details>`;
  return inner;
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
    ${fam.roster.length ? `<ul class="kids">${fam.roster.map(k => { const en = window.EnglishEngine.nameOf(k) || ''; return `<li><span>${esc(k.emoji || '')} ${esc(k.name)} <span class="enname">· באנגלית: ${own ? `<form class="enf" data-form="en" data-id="${esc(k.id)}"><input aria-label="השם של ${esc(k.name)} באנגלית" value="${esc(en)}" maxlength="12" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Name"><button class="link" type="submit">שמירה</button></form>` : `<b dir="ltr">${esc(en || 'לא הוגדר')}</b>`}</span></span>${own ? `<button class="link" data-act="rmkid" data-id="${esc(k.id)}">הסרה</button>` : ''}</li>`; }).join('')}</ul><p class="p-sub">השם באנגלית משמש לתרגול "כותבים את השם שלי" ולברכה באנגלית.</p>` : '<p class="empty">עוד לא נוספו ילדים.</p>'}
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
  lastRows = rows;
  const f = getFamily(), test = withFamily ? fam.test : (f && f.test);
  let cd = '';
  if (test && test.date) {
    const d = daysBetween(E.dayKey(), test.date);
    cd = ` · ${d > 1 ? `עוד ${d} ימים` : d === 1 ? 'מחר' : d === 0 ? 'היום' : ''}`.replace(/ · $/, '');
  }
  app.innerHTML = `<main class="p-wrap">
    <div class="p-head"><div><h1>התקדמות הילדים</h1><p class="p-sub">${test && test.date ? `${esc(test.name || 'מבדק')} · ${dm(test.date)}${cd}` : ''}</p></div><div class="p-actions"><a class="btn pv-link" href="index.html?preview=1">👀 האפליקציה של הילדים</a><button class="btn" data-act="openall">פתיחת הכול</button><button class="btn" data-act="closeall">סגירת הכול</button><button class="btn" data-act="refresh">רענון</button>${user ? '<button class="link" data-act="signout">יציאה</button>' : ''}</div></div>
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
  const cached = user && readCache();
  if (cached && cached.uid === user.uid && !fam) {
    fam = cached.fam;
    renderDash(cached.rows, `מוצגים נתונים מהביקור הקודם (${new Date(cached.t).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}) · מרענן…`, true);
    fam = null; // המשפחה והרשאות נבדקות מחדש מול השרת
  } else if (!document.querySelector('.p-wrap .p-head')) app.innerHTML = '<main class="p-wrap"><p>טוען…</p></main>';
  try {
    if (!fam) {
      const list = await listFamilies(user);
      fam = list[0] || null;
    }
    if (!fam) {
      try { localStorage.removeItem(CK); } catch (e) { /* ignore */ }
      renderGate('ברוכים הבאים', 'עוד אין משפחה בחשבון הזה. יוצרים משפחה, מוסיפים ילדים, ומוסרים לכל ילד את קוד המשפחה.', { act: 'create', label: 'יצירת משפחה' });
      return;
    }
    const rows = await fromRemote(fam.code, fam.roster || []);
    fam.roster = fam.roster || [];
    renderDash(rows, `מעודכן ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`, true);
    writeCache({ uid: user.uid, t: Date.now(), fam, rows });
  } catch (e) {
    console.warn(e);
    renderGate('לא הצלחתי לטעון נתונים', 'בדקו חיבור לאינטרנט ושכללי האבטחה (firestore.rules) פורסמו.', { act: 'refresh', label: 'ניסיון נוסף' });
  }
}
async function reloadFamily() { fam = null; try { localStorage.removeItem(CK); } catch (e) { /* ignore */ } await load(); }

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
  if (act === 'report') return openReport(b.dataset.id);
  if (act === 'pdf') return makePdf(b.dataset.id, b);
  if (act === 'rpdf') return makePdf(window.__lastReport && window.__lastReport.kidId, b);
  if (/^r(download|copy|share|print|close)$/.test(act)) return reportAction(act);
  if (act === 'openall' || act === 'closeall') {
    const open = act === 'openall', c = readClosed();
    document.querySelectorAll('details[data-open-key]').forEach(d => { d.open = open; const k = d.dataset.openKey; c[k] = open ? 0 : 1; });
    writeClosed(c); return;
  }
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
  } else if (kind === 'en') {
    try { await setEnName(fam.code, e.target.dataset.id, e.target.querySelector('input').value); await reloadFamily(); } catch (err) { fail(err, 'השמירה נכשלה'); }
  } else if (kind === 'test') {
    const date = document.getElementById('tdate').value, name = document.getElementById('tname').value.trim() || 'מבדק';
    try { await setTest(fam.code, date ? { name, date } : null); await reloadFamily(); } catch (err) { fail(err, 'השמירה נכשלה'); }
  }
});

// זוכרים אילו כרטיסים סגורים (במכשיר ההורה בלבד)
app.addEventListener('toggle', e => {
  const d = e.target, k = d && d.dataset && d.dataset.openKey;
  if (!k) return;
  const c = readClosed(); c[k] = d.open ? 0 : 1; writeClosed(c);
}, true);

window.__parent = { fromLocal, kidCard };
start();
