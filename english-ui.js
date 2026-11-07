// english-ui.js — מסכי האנגלית של הילד: תפריט נושאים, כרטיסי לימוד, שאלות, כתיבה באצבע, דיבור, איות וסיכום.
import { say, canSpeak, listen, canRecognize, record as recordAudio, canRecord, play, stopSpeaking } from './speech.js';

const EN = window.EnglishEngine, Ink = window.Ink;
let C = null;          // הקשר מהאפליקציה: app, data(), kid(), save(day), mascot(mood), confetti(n), home(), setView(v), dayKey()
let run = null;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const prof = () => C.data().programs.english;
const g = (m, f) => (C.kid() && C.kid().gender === 'f' ? f : m);
const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const CHEERS = ['Great job!', 'Super!', 'Well done!', 'Yes!', 'Awesome!', 'Perfect!'];
const CHEERS_HE = ['מצוין!', 'כל הכבוד!', 'נכון מאוד!', 'יופי!', 'בדיוק!'];
const KIND_ICON = { L_hear: '👂', L_name: '🔤', L_case: '🅰️', L_first: '🔊', L_pic: '🖼️', V_pic2word: '🧩', V_word2he: '🧩', V_he2word: '🧩', H_word2pic: '👂', H_word2he: '👂', R_word2pic: '📖', R_word2he: '📖', F_rhyme: '🎵', F_mid: '🎵', F_end: '🎵', K_mean: '💬', K_reply: '💬', R_sent: '📖', W_letter: '✍️', S_letter: '🗣️', S_word: '🗣️', P_hand: '📝', P_type: '⌨️' };
const enTxt = s => `<span class="en" dir="ltr">${esc(s)}</span>`;

export function init(ctx) {
  C = ctx;
  C.app.addEventListener('click', onClick);
  document.addEventListener('visibilitychange', () => { if (document.hidden && run) run.hiddenAt = performance.now(); else if (run && run.hiddenAt) { run.t0 += performance.now() - run.hiddenAt; run.hiddenAt = 0; } });
}

// ---------- תפריט נושאי האנגלית ----------
export function renderMenu() {
  C.setView('english'); run = null; stopSpeaking();
  const p = prof(), locks = C.preview ? {} : EN.locks(p), today = C.dayKey(), d = p.days[today] || { answered: 0 };
  const info = t => {
    if (t.id === 'letters') return `${p.intro.L.length} מתוך 26 אותיות · ${EN.masteredList(p, 'lname').length} ${g('יודע', 'יודעת')} היטב`;
    if (t.id === 'write') return `${EN.masteredList(p, 'wup').length + EN.masteredList(p, 'wlo').length} אותיות כתובות יפה (מתוך 52)`;
    if (t.id === 'words') return `${p.intro.W.length} מילים · ${EN.masteredList(p, 'vocab').length} ${g('יודע', 'יודעת')} היטב`;
    if (t.id === 'phonics') return `${EN.masteredList(p, 'phon').length} משימות צליל ${g('שולט', 'שולטת')} בהן`;
    if (t.id === 'talk') return `${p.intro.C.length} מתוך ${EN.CHUNKS.length} ביטויים · ${EN.masteredList(p, 'chunk').length} ${g('יודע', 'יודעת')} היטב`;
    if (t.id === 'speak') return `${EN.masteredList(p, 'speak').length} אותיות ומילים נאמרו נכון`;
    if (t.id === 'read') return `${EN.masteredList(p, 'read').length} מילים ומשפטים נקראו`;
    return `${EN.masteredList(p, 'spell').length} מילים נכתבו נכון`;
  };
  const prog = t => { const A = t.areas.map(a => EN.areaInfo(p, a)); return Math.round(100 * A.reduce((x, a) => x + a.progress, 0) / A.length); };
  C.app.innerHTML = `<main class="screen en-menu">
    <div class="sub-top"><button class="back" data-eact="back" aria-label="חזרה לבחירת מקצוע">→</button><h1><span class="abc" aria-hidden="true"><b>A</b><b>b</b><b>C</b></span> אנגלית</h1></div>
    <div class="en-hero" aria-hidden="true">${C.mascot('happy')}<div class="bubble"><b class="en" dir="ltr">Hello! 👋</b><span>שלום ${esc(C.kid().name)}, בוא${g('', 'י')} נלמד אנגלית</span></div></div>
    ${d.answered ? `<p class="ev center">היום: ${d.answered} תשובות באנגלית ⭐ ${d.st || 0}</p>` : ''}
    <div class="en-topics">${EN.TOPICS.map((t, i) => {
      const lk = locks[t.id], pc = EN.pace(p, t.id), pr = prog(t);
      return `<button class="en-topic c-${t.color}${lk ? ' locked' : ''}" data-eact="topic" data-id="${t.id}" style="--i:${i}" ${lk ? 'aria-disabled="true"' : ''}>
        <span class="et-ic" aria-hidden="true">${lk ? '🔒' : t.icon}</span>
        <span class="et-tx"><b>${esc(t.title)}</b><small>${esc(lk ? lk.need : t.desc)}</small>
        ${lk ? `<span class="et-bar" aria-hidden="true"><i style="width:${Math.round(100 * lk.have / lk.of)}%"></i></span>` : `<small class="et-info">${esc(info(t))}</small><span class="et-bar" aria-hidden="true"><i style="width:${Math.max(3, pr)}%"></i></span>`}
        ${!lk && pc.mode === 'reinforce' ? '<small class="et-pace">💪 מחזקים</small>' : !lk && pc.mode === 'fast' ? '<small class="et-pace">🚀 בקצב מהיר</small>' : ''}</span></button>`;
    }).join('')}</div>
    ${canSpeak() ? '' : '<p class="ev center">במכשיר הזה אין קול באנגלית, ולכן ההקראה לא תעבוד. אפשר להמשיך בלי קול.</p>'}
  </main>`;
}

// ---------- מהלך שיעור ----------
function startTopic(id) {
  const p = prof(), rng = mulberry((Date.now() ^ 0x9e3779b9) >>> 0);
  const plan = EN.planSession(p, id, rng, C.dayKey(), { ignoreLocks: !!C.preview });
  if (plan.locked) { toast(plan.locked.need); return; }
  if (!plan.tasks.length) { toast('אין כרגע מה לתרגל כאן. נסו נושא אחר.'); return; }
  run = { topic: id, rng, plan, queue: plan.tasks.slice(), i: 0, n: 0, ok: 0, ms: 0, stars: 0, sk: 0, retried: new Set(), again: new Set(), events: [], t0: 0, locked: false, task: null, attempts: 0, byArea: {} };
  C.setView('english-run');
  viewStart();
}
function viewStart() {
  const T = EN.TOPIC[run.topic], pc = run.plan.pace, intros = run.plan.tasks.filter(t => !t.area).length, n = run.plan.tasks.filter(t => t.area).length;
  C.app.innerHTML = `<main class="screen en-start c-${T.color}">
    <div class="qhead"><button class="x" data-eact="quit" aria-label="חזרה">✕</button><span></span><span></span></div>
    <div class="en-big-ic" aria-hidden="true">${T.icon}</div>
    <h1>${esc(T.title)}</h1>
    <p class="lead">${esc(EN.PACE_TEXT[pc.mode])}</p>
    <p class="ev">${n} משימות${intros ? ` · ${intros} ${run.topic === 'words' ? (intros === 1 ? 'מילה חדשה' : 'מילים חדשות') : (intros === 1 ? 'אות חדשה' : 'אותיות חדשות')}` : ''}</p>
    ${run.topic === 'write' ? `<div class="rules"><h2>איך כותבים באנגלית?</h2><ul>${Ink.GENERAL.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${linesLegend()}</div>` : ''}
    ${run.topic === 'speak' ? `<p class="ev">${canRecognize() ? 'לוחצים על המיקרופון ואומרים בקול. האפליקציה מקשיבה ובודקת.' : 'במכשיר הזה אין זיהוי דיבור אוטומטי, אז נקליט, נשמע ונשווה.'}</p>` : ''}
    <div class="spacer"></div>
    <div class="dock"><button class="btn primary big" data-eact="begin">${enTxt("Let's go!")} יאללה</button></div>
  </main>`;
}
function linesLegend() {
  return `<div class="legend" aria-label="הקווים במחברת"><svg viewBox="0 0 220 90" direction="ltr" aria-hidden="true"><line x1="0" y1="12" x2="220" y2="12" class="lt"/><line x1="0" y1="40" x2="220" y2="40" class="lm"/><line x1="0" y1="68" x2="220" y2="68" class="lb"/><line x1="0" y1="84" x2="220" y2="84" class="ld"/>
    <text x="10" y="68" class="lg">A</text><text x="66" y="68" class="lg">a</text><text x="114" y="68" class="lg">b</text><text x="162" y="68" class="lg">g</text></svg>
    <ul><li><i class="k lt"></i>הקו העליון</li><li><i class="k lm"></i>הקו המקווקו (אמצע)</li><li><i class="k lb"></i>קו הבסיס</li></ul></div>`;
}
function next() {
  stopSpeaking();
  if (run.i >= run.queue.length) return finish(false);
  const t = run.queue[run.i];
  run.task = t; run.locked = false; run.attempts = 0; run.t0 = performance.now(); run.hiddenAt = 0;
  if (t.kind === 'introL') return viewIntroL(t);
  if (t.kind === 'introW') return viewIntroW(t);
  if (t.kind === 'introC') return viewIntroC(t);
  if (t.kind === 'introP') return viewIntroP(t);
  if (t.kind === 'W_letter') return viewWrite(t);
  if (t.kind === 'S_letter' || t.kind === 'S_word') return viewSpeak(t);
  if (t.kind === 'P_hand') return viewSpellHand(t);
  if (t.kind === 'P_type') return viewSpellType(t);
  return viewChoice(t);
}
const answeredTasks = () => run.queue.filter(t => t.area).length;
function head() {
  const tasks = run.queue.filter(t => t.area), done = run.queue.slice(0, run.i).filter(t => t.area).length;
  const dots = tasks.map((t, i) => `<i class="${t.res === true ? 'ok' : t.res === false ? 'bad' : i === done ? 'cur' : ''}"></i>`).join('');
  const T = EN.TOPIC[run.topic];
  return `<div class="qhead"><button class="x" data-eact="quit" aria-label="סיום">✕</button><span class="en-chip">${T.icon} ${esc(T.title)}</span><span class="en-stars" aria-label="${run.stars} כוכבים">⭐ ${run.stars}</span></div>
    <div class="qprog"><span>${Math.min(done + 1, tasks.length)} מתוך ${tasks.length}</span><div class="dots" aria-hidden="true">${dots}</div></div>`;
}
const skipBtn = t => (run.retried.has(t) ? '<span class="retag">משימה שדילגת עליה</span>' : '<button class="skipbtn" data-eact="skip" aria-label="דילוג, המשימה תחזור בסוף">דלג ↷</button>');
const spk = (text, label, cls) => (canSpeak() ? `<button class="spk ${cls || ''}" data-eact="say" data-t="${esc(text)}" aria-label="${esc(label || 'השמעה')}">🔊</button>` : '');

// ---------- כרטיסי לימוד ----------
function viewIntroL(t) {
  const L = EN.LET[t.item], w = EN.WD[L.kw];
  C.app.innerHTML = `<main class="screen en-card c-violet">
    ${head()}
    <p class="new-tag">✨ אות חדשה ✨</p>
    <div class="big-letter" dir="ltr" aria-label="האות ${L.u} ${L.l}"><b class="up">${L.u}</b><b class="lo">${L.l}</b></div>
    <div class="facts">
      <div class="fact"><span class="fl">השם</span><b>${esc(L.he)}</b>${spk(L.name, 'שם האות')}</div>
      <div class="fact"><span class="fl">הצליל</span><b>${esc(L.snd)}</b></div>
      <div class="fact kw"><span class="fl">כמו ב-</span><span class="kwem" aria-hidden="true">${w.em}</span><b>${enTxt(w.en)}</b><span class="ev">${esc(w.he)}</span>${spk(w.en, 'המילה')}</div>
    </div>
    <div class="mini-demo" dir="ltr"><canvas class="demo-c" data-ch="${L.u}" width="150" height="110" aria-label="הדגמת כתיבה של ${L.u}"></canvas><canvas class="demo-c" data-ch="${L.l}" width="150" height="110" aria-label="הדגמת כתיבה של ${L.l}"></canvas></div>
    <p class="ev center">גדולה: <b>${L.u}</b> · קטנה: <b>${L.l}</b></p>
    <div class="spacer"></div>
    <div class="dock"><button class="btn primary big" data-eact="cont">הבנתי! ממשיכים</button></div>
  </main>`;
  EN.markIntro(prof(), 'introL', t.item, C.dayKey()); C.save(C.dayKey());
  document.querySelectorAll('.demo-c').forEach((c, i) => miniDemo(c, c.dataset.ch, 300 + i * 1400));
  say(L.name).then(() => say(w.en));
}
function viewIntroW(t) {
  const w = EN.WD[t.item];
  C.app.innerHTML = `<main class="screen en-card c-teal">
    ${head()}
    <p class="new-tag">✨ מילה חדשה ✨</p>
    <div class="word-pic" aria-hidden="true">${w.em || '💬'}</div>
    <div class="word-big">${enTxt(w.en)} ${spk(w.en, 'השמעה')}${canSpeak() ? `<button class="spk slow" data-eact="say" data-slow="1" data-t="${esc(w.en)}" aria-label="השמעה לאט">🐢</button>` : ''}</div>
    <p class="word-he">${esc(w.he)}</p>
    <p class="ev center">האותיות: <span class="en" dir="ltr">${esc(spellOut(w.en))}</span></p>
    <div class="spacer"></div>
    <div class="dock"><button class="btn primary big" data-eact="cont">הבנתי! ממשיכים</button></div>
  </main>`;
  EN.markIntro(prof(), 'introW', t.item, C.dayKey()); C.save(C.dayKey());
  say(w.en);
}
function viewIntroC(t) {
  const c = EN.CD[t.item];
  C.app.innerHTML = `<main class="screen en-card c-orange">
    ${head()}
    <p class="new-tag">✨ ביטוי חדש לשיחה ✨</p>
    <div class="word-pic" aria-hidden="true">💬</div>
    <div class="sent-q">${enTxt(c.en)} ${spk(c.en, 'השמעה')}${canSpeak() ? `<button class="spk slow" data-eact="say" data-slow="1" data-t="${esc(c.en)}" aria-label="השמעה לאט">🐢</button>` : ''}</div>
    <p class="word-he">${esc(c.he)}</p>
    ${c.reply ? `<div class="fact"><span class="fl">עונים</span><b>${enTxt(c.reply)}</b>${spk(c.reply, 'השמעת התשובה')}</div>` : ''}
    <div class="spacer"></div>
    <div class="dock"><button class="btn primary big" data-eact="cont">הבנתי! ממשיכים</button></div>
  </main>`;
  EN.markIntro(prof(), 'introC', t.item, C.dayKey()); C.save(C.dayKey());
  say(c.en).then(() => { if (c.reply) say(c.reply); });
}
function viewIntroP() {
  C.app.innerHTML = `<main class="screen en-card c-blue">
    ${head()}
    <p class="new-tag">🎵 צלילים וחרוזים 🎵</p>
    <div class="word-pic" aria-hidden="true">🐱🎩</div>
    <div class="sent-q">${enTxt('cat – hat')} ${spk('cat, hat', 'השמעה')}</div>
    <div class="rules"><ul>
      <li><b>חרוז</b>: מילים שנגמרות באותו צליל, כמו cat ו-hat.</li>
      <li><b>הצליל באמצע</b>: ב-c_t שומעים a. מקשיבים טוב ובוחרים את האות.</li>
      <li><b>הצליל בסוף</b>: באיזו אות נגמרת המילה? אומרים אותה לאט ומקשיבים לסוף.</li></ul></div>
    <div class="spacer"></div>
    <div class="dock"><button class="btn primary big" data-eact="cont">יאללה!</button></div>
  </main>`;
  say('cat, hat');
}
const spellOut = en => en.split('').filter(c => /[a-z]/.test(c)).join(' - ');

// ---------- שאלת בחירה ----------
function viewChoice(t) {
  let q = '';
  if (t.kind === 'L_hear') q = `<div class="listen-big">${spk(t.say, 'השמעה שוב', 'xl')}<p class="ev">לחצו כדי לשמוע שוב</p></div>`;
  else if (t.kind === 'L_name' || t.kind === 'L_case') q = `<div class="show-letter" dir="ltr">${esc(t.show)}</div>`;
  else if (t.kind === 'L_first') q = `<div class="pic-q"><span class="pq-em">${t.em}</span>${spk(t.say, 'השמעת המילה', 'lg')}</div>`;
  else if (t.kind === 'L_pic') q = `<div class="show-letter sm" dir="ltr">${esc(t.show.split('').join(' '))}</div>`;
  else if (t.kind === 'V_pic2word') q = `<div class="pic-q"><span class="pq-em">${t.em}</span></div>`;
  else if (t.kind === 'V_word2he') q = `<div class="word-q">${enTxt(t.show)} ${spk(t.say, 'השמעה')}</div>`;
  else if (t.kind === 'V_he2word') q = `<div class="word-q he">${esc(t.showHe)}</div>`;
  else if (t.kind === 'H_word2pic') q = `<div class="listen-big">${spk(t.say, 'השמעה שוב', 'xl')}<p class="ev">לחצו כדי לשמוע שוב</p></div>`;
  else if (t.kind === 'R_word2pic') q = `<div class="word-q">${enTxt(t.show)}</div>`;
  else if (t.kind === 'R_sent') q = `<div class="sent-q">${enTxt(t.show)}</div>`;
  else if (t.kind === 'R_word2he') q = `<div class="word-q">${enTxt(t.show)}</div>`;
  else if (t.kind === 'H_word2he') q = `<div class="listen-big">${spk(t.say, 'השמעה שוב', 'xl')}<p class="ev">לחצו כדי לשמוע שוב</p></div>`;
  else if (t.kind === 'F_rhyme' || t.kind === 'F_end') q = `<div class="pic-q"><span class="pq-em">${t.em}</span>${spk(t.say, 'השמעת המילה', 'lg')}</div>`;
  else if (t.kind === 'F_mid') q = `<div class="pic-q"><span class="pq-em">${t.em}</span>${spk(t.say, 'השמעת המילה', 'lg')}</div><div class="pattern en" dir="ltr">${esc(t.pattern)}</div>`;
  else if (t.kind === 'K_mean' || t.kind === 'K_reply') q = `<div class="sent-q">${enTxt(t.show)} ${spk(t.say, 'השמעה')}</div>`;
  const pics = t.choices.some(c => c.pic);
  C.app.innerHTML = `<main class="screen en-q c-${EN.TOPIC[run.topic].color}">
    ${head()}
    <section class="qcard"><div class="tp"><span aria-hidden="true">${KIND_ICON[t.kind] || ''}</span> ${esc(t.prompt)}${skipBtn(t)}</div>${q}</section>
    <section class="answer"><div class="choices en-ch ${pics ? 'pics' : ''} ${t.choices.length === 4 ? 'two' : ''}" role="group" aria-label="תשובות">${t.choices.map((c, i) =>
      `<div class="chw"><button class="choice${c.en ? ' ltr en' : ''}${c.pic ? ' pic' : ''}" data-eact="choose" data-i="${i}">${c.pic ? `<span class="em">${c.label}</span>` : c.en ? enTxt(c.label) : esc(c.label)}</button>${c.say && canSpeak() ? `<button class="spk mini" data-eact="say" data-t="${esc(c.say)}" aria-label="השמעה">🔊</button>` : ''}</div>`).join('')}</div></section>
    <div id="sheet"></div>
  </main>`;
  if (t.say && !t.noAudio && t.kind !== 'V_word2he') say(t.say);
}
function choose(i) {
  const t = run.task; if (run.locked) return;
  run.locked = true;
  const c = t.choices[i], ok = c.v === t.answer, ms = Math.min(60000, Math.round(performance.now() - run.t0));
  const res = commit(t, ok, { ms, timed: true, given: c.v });
  document.querySelectorAll('.choice').forEach((b, j) => { b.disabled = true; if (t.choices[j].v === t.answer) b.classList.add('ok'); else if (j === i) b.classList.add('bad'); });
  if (ok) {
    sparkle();
    const reinforce = reinforceLine(t);
    sheet(true, reinforce, res);
    const s = sayAnswer(t); if (s) say(s);
  } else {
    sheet(false, EN.explain(t, c.v), res, correctAudio(t));
    const s = sayAnswer(t); if (s) setTimeout(() => say(s, { slow: true }), 250);
  }
}
function sayAnswer(t) {
  if (t.kind.startsWith('L_')) { if (t.kind === 'L_first') return EN.WD[t.word].en; if (t.kind === 'L_pic') return EN.WD[t.answer].en; return EN.LET[t.item].name; }
  if (t.kind === 'R_sent') return EN.SD[t.answer].en;
  if (t.kind === 'F_rhyme') return `${EN.WD[t.word].en}, ${EN.WD[t.answer].en}`;
  if (t.kind === 'F_mid' || t.kind === 'F_end') return EN.WD[t.word].en;
  if (t.kind === 'K_mean') return EN.CD[t.answer].en;
  if (t.kind === 'K_reply') return `${EN.CD[t.answer].en} ${EN.CD[t.answer].reply}`;
  return EN.WD[t.answer] ? EN.WD[t.answer].en : '';
}
function correctAudio(t) { const s = sayAnswer(t); return s ? [{ t: s, label: 'איך אומרים' }] : []; }
function reinforceLine(t) {
  if (t.kind === 'L_hear' || t.kind === 'L_name') { const L = EN.LET[t.item]; return [`${L.u} ${L.l} נקראת "${L.he}"`]; }
  if (t.kind === 'L_case') { const L = EN.LET[t.item]; return [`${L.u} גדולה, ${L.l} קטנה`]; }
  if (t.kind === 'L_first' || t.kind === 'L_pic') { const w = EN.WD[t.kind === 'L_first' ? t.word : t.answer]; return [`${w.em} ${w.en} = ${w.he}`]; }
  if (t.kind === 'R_sent') { const s = EN.SD[t.answer]; return [`${s.en} = ${s.he}`]; }
  if (t.kind === 'F_rhyme') return [`${EN.WD[t.word].en} – ${EN.WD[t.answer].en}: חרוז!`];
  if (t.kind === 'F_mid' || t.kind === 'F_end') { const w = EN.WD[t.word]; return [`${w.en} ${w.em} = ${w.he}`]; }
  if (t.kind === 'K_mean') { const c = EN.CD[t.answer]; return [`${c.en} = ${c.he}`]; }
  if (t.kind === 'K_reply') { const c = EN.CD[t.answer]; return [`${c.en} → ${c.reply}`]; }
  const w = EN.WD[t.answer]; return w ? [`${w.en} = ${w.he} ${w.em || ''}`] : [];
}

// רישום תשובה + חזרה על פריט שנכשל בסוף השיעור
function commit(t, ok, o) {
  const day = C.dayKey(), p = prof();
  const r = EN.record(p, t, ok, day, o);
  t.res = ok; run.n++; if (ok) { run.ok++; run.stars++; }
  if (o.ms && o.timed) run.ms += o.ms;
  const a = run.byArea[t.area] || (run.byArea[t.area] = { n: 0, ok: 0 }); a.n++; if (ok) a.ok++;
  if (!ok && !run.again.has(t.area + ':' + t.item) && !/^(S_|P_)/.test(t.kind)) { // נחזור לזה פעם אחת בסוף
    run.again.add(t.area + ':' + t.item);
    const again = regen(t); if (again) run.queue.push(again);
  }
  C.save(day);
  return r;
}
function regen(t) {
  const p = prof(), rng = run.rng;
  if (t.kind === 'W_letter') return { kind: 'W_letter', area: t.area, item: t.item };
  if (t.kind.startsWith('L_')) return EN.mkLetterTask(t.kind === 'L_pic' ? 'L_first' : t.kind === 'L_name' ? 'L_hear' : t.kind, t.item, rng, p);
  if (t.kind === 'R_sent') return null;
  if (t.kind.startsWith('F_')) return EN.mkPhonTask(t.kind, t.word, rng);
  if (t.kind.startsWith('K_')) return EN.mkChunkTask(t.kind, t.answer, rng);
  const id = String(t.item).replace(/^W:/, '');
  return EN.mkWordTask(t.kind === 'V_he2word' ? 'V_pic2word' : t.kind, id, rng, p);
}
function sheet(ok, lines, res, audio, extra) {
  const el = document.getElementById('sheet'); if (!el) return;
  const last = run.i >= run.queue.length - 1;
  const up = res && res.mastered ? `<p class="note">🏅 ${g('למדת', 'למדת')} את זה היטב!</p>` : '';
  el.innerHTML = ok
    ? `<div class="sheet ok" role="status"><div class="shd">${C.mascot('cheer')}<strong>${enTxt(CHEERS[(run.ok + run.i) % CHEERS.length])} <small>${CHEERS_HE[(run.ok + run.i) % CHEERS_HE.length]}</small></strong><span class="star-pop" aria-hidden="true">⭐</span></div>${(lines || []).map(l => `<p class="rf">${esc(l)}</p>`).join('')}${up}${extra || ''}<button class="btn" data-eact="next" id="nextbtn">${last ? 'לסיכום' : 'הבא'}</button></div>`
    : `<div class="sheet bad" role="status"><div class="shd">${C.mascot('oops')}<strong>${esc(['כמעט! בואו נלמד את זה', 'לא נורא, ככה לומדים', 'טעות היא חלק מהלמידה'][(run.i) % 3])}</strong></div>${(lines || []).map(l => `<p class="why">${esc(l)}</p>`).join('')}${(audio || []).filter(() => canSpeak()).map(a => `<button class="btn ghost" data-eact="say" data-t="${esc(a.t)}">🔊 ${esc(a.label)}</button>`).join('')}${extra || ''}<button class="btn" data-eact="next" id="nextbtn">${last ? 'לסיכום' : 'הבנתי, ממשיכים'}</button></div>`;
  const nb = document.getElementById('nextbtn'); if (nb) nb.focus({ preventScroll: true });
}
function sparkle() {
  if (reduced()) return;
  const card = document.querySelector('.qcard') || document.querySelector('.pad-wrap'); if (!card) return;
  const r = card.getBoundingClientRect(), box = document.createElement('div');
  box.className = 'burst'; box.setAttribute('aria-hidden', 'true');
  box.style.left = (r.left + r.width / 2) + 'px'; box.style.top = (r.top + r.height / 2) + 'px';
  const em = ['⭐', '✨', '🌈', '💜', '🎈'];
  box.innerHTML = Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * 2 * Math.PI, d = 70 + Math.random() * 60; return `<span style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d - 40)}px;--r:${Math.round(Math.random() * 120 - 60)}deg;--s:${(0.9 + Math.random() * 0.8).toFixed(2)}">${em[i % em.length]}</span>`; }).join('');
  document.body.appendChild(box); setTimeout(() => box.remove(), 1100);
}

// ---------- משטח כתיבה ----------
function makePad(host, o) {
  const wrap = document.createElement('div'); wrap.className = 'pad-wrap'; host.appendChild(wrap);
  const cv = document.createElement('canvas'); cv.className = 'ink'; cv.setAttribute('aria-label', o.label || 'משטח כתיבה'); wrap.appendChild(cv);
  const W = Math.min(host.clientWidth || 340, 440), Hh = Math.round(Math.max(190, Math.min(W * 0.8, 330, (window.innerHeight || 700) * 0.37)));
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = Hh * dpr; cv.style.width = W + 'px'; cv.style.height = Hh + 'px';
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const H = Math.round(Hh * 0.47), top = Math.round(Hh * 0.1), base = top + H, mid = top + H / 2, desc = base + Math.round(H * 0.45);
  const guide = { top, base }, cx = W / 2;
  const pad = { strokes: [], guide, cx, cv, letter: o.letter, trace: !!o.trace, anim: 0 };
  const colors = ['#7C3AED', '#E0527A', '#0E8A7E', '#2F63D6', '#E07B1F'];
  function lines() {
    ctx.clearRect(0, 0, W, Hh);
    ctx.fillStyle = '#FFFDF6'; ctx.fillRect(0, 0, W, Hh);
    const ln = (y, col, dash, w) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w || 2; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(W - 6, y); ctx.stroke(); ctx.restore(); };
    ln(top, '#5B8DEF'); ln(mid, '#8FA8D8', [9, 7]); ln(base, '#E5534B', null, 2.5); ln(desc, '#C9D3E8', [3, 6], 1.5);
  }
  function drawTemplate(alpha, upto) {
    if (!pad.letter) return;
    const strokes = Ink.templatePx(pad.letter, guide, cx);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokes.forEach((s, si) => {
      const pts = upto !== undefined && si === Math.floor(upto) ? s.slice(0, Math.max(1, Math.ceil(s.length * (upto - si)))) : upto !== undefined && si > upto ? [] : s;
      if (!pts.length) return;
      ctx.strokeStyle = `rgba(124,58,237,${alpha})`; ctx.lineWidth = Math.max(10, H * 0.11);
      if (pts.length === 1) { ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], ctx.lineWidth / 1.6, 0, 7); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); pts.forEach(q => ctx.lineTo(q[0], q[1])); ctx.stroke(); }
    });
    // נקודות התחלה ממוספרות + חץ כיוון
    strokes.forEach((s, si) => {
      if (upto !== undefined && si > upto) return;
      const p0 = s[0], p1 = s[Math.min(s.length - 1, 3)];
      ctx.fillStyle = '#22A06B'; ctx.beginPath(); ctx.arc(p0[0], p0[1], 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(si + 1), p0[0], p0[1] + 0.5);
      if (s.length > 2) { const a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), x = p0[0] + Math.cos(a) * 18, y = p0[1] + Math.sin(a) * 18; ctx.strokeStyle = '#22A06B'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - Math.cos(a - 0.5) * 7, y - Math.sin(a - 0.5) * 7); ctx.lineTo(x, y); ctx.lineTo(x - Math.cos(a + 0.5) * 7, y - Math.sin(a + 0.5) * 7); ctx.stroke(); }
    });
    ctx.restore();
  }
  function ink() {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(7, H * 0.075);
    pad.strokes.forEach((s, i) => { ctx.strokeStyle = colors[i % colors.length]; if (s.length === 1) { ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(s[0][0], s[0][1], ctx.lineWidth / 2, 0, 7); ctx.fill(); return; } ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); s.forEach(q => ctx.lineTo(q[0], q[1])); ctx.stroke(); });
    ctx.restore();
  }
  pad.redraw = () => { lines(); if (pad.trace) drawTemplate(0.16); ink(); };
  pad.clear = () => { pad.strokes = []; pad.redraw(); };
  pad.demo = () => new Promise(res => {
    cancelAnimationFrame(pad.anim);
    if (!pad.letter) return res();
    const n = Ink.tmpl(pad.letter).s.length, dur = 750 * n, t0 = performance.now();
    const step = now => { const u = Math.min(1, (now - t0) / dur) * n; lines(); drawTemplate(0.85, Math.min(u, n - 0.0001)); if (u < n) pad.anim = requestAnimationFrame(step); else setTimeout(() => { pad.redraw(); res(); }, 600); };
    if (reduced()) { lines(); drawTemplate(0.85); setTimeout(() => { pad.redraw(); res(); }, 1200); return; }
    pad.anim = requestAnimationFrame(step);
  });
  let cur = null;
  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', e => { if (pad.disabled) return; e.preventDefault(); cancelAnimationFrame(pad.anim); try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } cur = [pos(e)]; pad.strokes.push(cur); pad.redraw(); });
  cv.addEventListener('pointermove', e => {
    if (!cur) return; e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    evs.forEach(ev => { const p = pos(ev), l = cur[cur.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) >= 1.5) cur.push(p); });
    pad.redraw();
  });
  const end = () => { cur = null; if (o.onStroke) o.onStroke(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('pointerleave', () => { if (cur) end(); });
  pad.redraw();
  return pad;
}
// במסכים נמוכים: גוללים כך שמשטח הכתיבה וכפתוריו יהיו בתוך המסך
function fitPad() {
  const b = document.querySelector('.pad-btns'); if (!b) return;
  const r = b.getBoundingClientRect();
  if (r.bottom > window.innerHeight) window.scrollBy(0, r.bottom - window.innerHeight + 8);
}
// הדגמה קטנה (בכרטיס אות חדשה)
function miniDemo(cv, ch, delay) {
  const ctx = cv.getContext('2d'), W = cv.width, Hh = cv.height, H = Hh * 0.46, top = Hh * 0.12, base = top + H;
  const s = Ink.templatePx(ch, { top, base }, W / 2), n = s.length, dur = 600 * n;
  let t0 = performance.now() + (delay || 0);
  const frame = now => {
    if (!document.body.contains(cv)) return;
    ctx.clearRect(0, 0, W, Hh);
    [[top, '#5B8DEF', null], [top + H / 2, '#8FA8D8', [6, 5]], [base, '#E5534B', null]].forEach(([y, c, d]) => { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 1.5; if (d) ctx.setLineDash(d); ctx.beginPath(); ctx.moveTo(4, y); ctx.lineTo(W - 4, y); ctx.stroke(); ctx.restore(); });
    const u = reduced() ? n : Math.max(0, Math.min(1, (now - t0) / dur)) * n;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = '#7C3AED'; ctx.fillStyle = '#7C3AED';
    s.forEach((st, i) => { if (i > u || u === 0) return; const pts = i === Math.floor(u) ? st.slice(0, Math.max(1, Math.ceil(st.length * (u - i)))) : st; if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], 4, 0, 7); ctx.fill(); return; } ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); pts.forEach(q => ctx.lineTo(q[0], q[1])); ctx.stroke(); });
    if (!reduced() && now - t0 > dur + 1800) t0 = now + 300; // מציגים שוב ושוב
    if (!reduced()) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---------- כתיבת אות ----------
function viewWrite(t) {
  const p = prof(), ch = t.item, b = EN.box(p, t.area, ch), trace = b < 2;
  const L = EN.LET[ch.toLowerCase()], upper = ch === ch.toUpperCase(), tm = Ink.tmpl(ch);
  C.app.innerHTML = `<main class="screen en-write c-pink">
    ${head()}
    <section class="qcard wq"><div class="tp"><span aria-hidden="true">✍️</span> כותבים את האות <b class="en" dir="ltr">${ch}</b> ${upper ? 'הגדולה' : 'הקטנה'}${spk(L.name, 'שם האות')}${skipBtn(t)}</div>
      <p class="rule">${esc(Ink.caseRule(ch))}</p>
      ${trace ? '<p class="ev">עוברים באצבע על האות הסגולה, מתחילים בנקודה הירוקה ⓵.</p>' : '<p class="ev">עכשיו לבד! אפשר ללחוץ על "איך כותבים" כדי לראות שוב.</p>'}
    </section>
    <div id="padhost" class="padhost"></div>
    <div class="pad-btns"><button class="btn ghost" data-eact="demo">▶️ הדגמה</button><button class="btn ghost" data-eact="clear">🧽 מחיקה</button><button class="btn primary" data-eact="check">✓ סיימתי</button></div>
    <details class="steps-d"${t.first ? ' open' : ''}><summary>שלבי הכתיבה</summary><ol>${tm.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>
    <div id="sheet"></div>
  </main>`;
  run.pad = makePad(document.getElementById('padhost'), { letter: ch, trace, label: `משטח כתיבה לאות ${ch}` });
  fitPad();
  run.trace = trace; run.tryN = 0;
  if (t.first || trace) setTimeout(() => run && run.pad && run.pad.demo(), 350);
}
function checkWrite() {
  const t = run.task, pad = run.pad; if (!pad || pad.disabled) return;
  if (!pad.strokes.length) { toast('כותבים את האות באצבע על הקווים'); return; }
  const r = Ink.evaluate(pad.strokes, pad.guide, t.item);
  run.tryN++;
  const starsHtml = `<p class="hw-stars" aria-label="${r.stars} כוכבים">${[1, 2, 3].map(i => `<i class="${i <= r.stars ? 'on' : ''}" style="--i:${i}">⭐</i>`).join('')}</p>`;
  if (run.tryN === 1) { // רק הניסיון הראשון נספר
    run.locked = true;
    const res = commit(t, r.ok, { hw: r, trace: run.trace, hwGuess: r.ok ? null : r.guess });
    if (r.ok) sparkle();
    const lines = r.ok ? (r.stars === 3 ? ['כתיבה מדויקת, בכיוון הנכון ועל הקווים!'] : ['האות יצאה טובה. ועוד טיפ קטן:'].concat(r.tips)) : ['ניסיון יפה! ' + (r.tips[0] || '')].concat(r.tips.slice(1));
    const extra = starsHtml + (r.ok ? '' : '<button class="btn ghost" data-eact="retry">✍️ לנסות שוב (בלי לחץ)</button>');
    pad.disabled = true;
    sheet(r.ok, lines, res, [], extra);
    if (!r.ok) setTimeout(() => run && run.pad && run.pad.demo(), 400);
  } else {
    sheet(r.ok, r.ok ? ['הרבה יותר טוב! ככה כותבים ' + t.item + '.'].concat(r.stars < 3 ? r.tips : []) : ['ממשיכים לתרגל את זה. ' + (r.tips[0] || '')], null, [], starsHtml);
    if (r.ok) sparkle();
    pad.disabled = true;
  }
}

// ---------- דיבור ----------
function viewSpeak(t) {
  const isL = t.kind === 'S_letter', L = isL ? EN.LET[t.letter] : null, w = isL ? null : EN.WD[t.word];
  const rec = canRecognize();
  C.app.innerHTML = `<main class="screen en-speak c-orange">
    ${head()}
    <section class="qcard"><div class="tp"><span aria-hidden="true">🗣️</span> ${isL ? 'אמרו בקול את שם האות' : 'אמרו בקול את המילה באנגלית'}${skipBtn(t)}</div>
      ${isL ? `<div class="big-letter sm" dir="ltr"><b class="up">${L.u}</b><b class="lo">${L.l}</b></div>` : `${w.em ? `<div class="word-pic sm" aria-hidden="true">${w.em}</div>` : ''}<div class="word-big">${enTxt(w.en)}</div><p class="word-he">${esc(w.he)}</p>`}
      ${spk(t.say, 'איך אומרים', 'lg')}<span class="ev"> הקשיבו קודם</span>
    </section>
    <div class="mic-zone">
      ${rec ? '<button class="mic" data-eact="mic" aria-label="לחצו ואמרו"><span class="mic-ic">🎤</span><span class="waves" aria-hidden="true"><i></i><i></i><i></i></span></button><p class="ev" id="micmsg">לוחצים על המיקרופון ואומרים</p>'
    : '<button class="mic rec" data-eact="recself" aria-label="הקלטה"><span class="mic-ic">⏺️</span><span class="waves" aria-hidden="true"><i></i><i></i><i></i></span></button><p class="ev" id="micmsg">לוחצים, אומרים בקול, ושומעים את עצמכם</p>'}
      ${rec && canRecord() ? '<button class="link" data-eact="recself">⏺️ להקליט ולשמוע את עצמי</button>' : ''}
    </div>
    <div id="selfbox"></div>
    <div id="sheet"></div>
  </main>`;
  say(t.say);
}
async function doMic() {
  const t = run.task; if (run.locked || run.listening) return;
  const btn = document.querySelector('.mic'), msg = document.getElementById('micmsg');
  run.listening = true; if (btn) btn.classList.add('on'); if (msg) msg.textContent = 'מקשיב… אמרו עכשיו';
  const r = await listen({ timeoutMs: 6000 });
  run.listening = false; if (!run || run.task !== t) return;
  if (btn) btn.classList.remove('on');
  if (r.error === 'not-allowed' || r.error === 'service-not-allowed' || r.error === 'unsupported' || r.error === 'language-not-supported') {
    if (msg) msg.textContent = 'כדי שהאפליקציה תשמע אתכם צריך לאשר גישה למיקרופון. בינתיים נקליט ונשווה.';
    const z = document.querySelector('.mic-zone'); if (z) z.insertAdjacentHTML('beforeend', '<button class="btn" data-eact="recself">⏺️ הקלטה ושמיעה</button>');
    return;
  }
  if (!r.alts.length) { if (msg) msg.textContent = 'לא שמעתי. לוחצים על המיקרופון ואומרים בקול רם וברור.'; return; }
  const m = EN.matchSpeech(r.alts, t.kind === 'S_letter' ? { letter: t.letter } : { word: t.word });
  run.attempts++;
  if (m.ok) {
    run.locked = true; const res = commit(t, true, {}); sparkle();
    sheet(true, [`שמעתי: "${m.heard}" ✓`, run.attempts > 1 ? 'התמדה מנצחת!' : 'הגייה מעולה!'], res);
  } else if (run.attempts < 3) {
    if (msg) msg.innerHTML = `שמעתי: "<span class="en" dir="ltr">${esc(m.heard)}</span>". הקשיבו שוב 🔊 ונסו עוד פעם (ניסיון ${run.attempts + 1} מתוך 3)`;
    setTimeout(() => say(t.say, { slow: true }), 300);
  } else {
    run.locked = true; const res = commit(t, false, {});
    sheet(false, [`שמעתי: "${m.heard}".`, 'ממשיכים לתרגל את זה. כדאי להקשיב לאט ולחזור בקול כמה פעמים.', 'הזיהוי האוטומטי לא תמיד מבין קולות של ילדים, אז לא להתייאש!'], res, [{ t: t.say, label: 'איך אומרים' }]);
  }
}
async function doRecSelf() {
  const t = run.task; if (run.recording) return;
  const box = document.getElementById('selfbox'), msg = document.getElementById('micmsg');
  if (!canRecord()) { if (box) box.innerHTML = '<p class="ev">במכשיר הזה אי אפשר להקליט. אומרים בקול אחרי ההקראה, וממשיכים.</p><button class="btn" data-eact="selfok">אמרתי! ממשיכים</button>'; return; }
  run.recording = true;
  const btn = document.querySelector('.mic'); if (btn) btn.classList.add('on'); if (msg) msg.textContent = 'מקליט… אמרו עכשיו';
  const r = await recordAudio(2600);
  run.recording = false; if (!run || run.task !== t) return;
  if (btn) btn.classList.remove('on');
  if (r.error) { if (box) box.innerHTML = `<p class="ev">${r.error === 'not-allowed' ? 'צריך לאשר גישה למיקרופון כדי להקליט.' : 'ההקלטה לא הצליחה.'} אפשר לומר בקול ולהמשיך.</p><button class="btn" data-eact="selfok">אמרתי! ממשיכים</button>`; return; }
  run.selfUrl = r.url;
  if (box) box.innerHTML = `<div class="selfcmp"><button class="btn ghost" data-eact="playself">▶️ אני</button>${spk(t.say, 'האפליקציה')}<span class="ev">האפליקציה</span></div>
    <p class="lead">זה נשמע דומה?</p><div class="pad-btns"><button class="btn primary" data-eact="selfok">👍 כן!</button><button class="btn" data-eact="recself">🔁 עוד ניסיון</button></div>`;
  if (msg) msg.textContent = 'השוו בין ההקלטה שלכם לקול של האפליקציה';
  await play(r.url); await say(t.say);
}
function selfOk() {
  const t = run.task; if (run.locked) return;
  run.locked = true; EN.recordSelf(prof(), C.dayKey()); t.res = true; C.save(C.dayKey());
  sparkle(); sheet(true, ['כל הכבוד על התרגול בקול!', 'תרגול דיבור כזה עוזר לזכור ולהגות נכון.'], null);
}

// ---------- איות בכתב יד ----------
function viewSpellHand(t) {
  const w = EN.WD[t.word];
  run.sp = { word: w.en, pos: 0, wrongs: 0, reveals: 0, tries: 0 };
  C.app.innerHTML = `<main class="screen en-spell c-green">
    ${head()}
    <section class="qcard"><div class="tp"><span aria-hidden="true">📝</span> כתבו את המילה באנגלית, אות אחרי אות${skipBtn(t)}</div>
      <div class="sp-q">${w.em ? `<span class="pq-em">${w.em}</span>` : ''}<span class="word-he">${esc(w.he)}</span>${spk(w.en, 'השמעת המילה', 'lg')}</div>
      <div class="slots" dir="ltr" id="slots">${[...w.en].map((c, i) => `<span class="slot${i === 0 ? ' cur' : ''}"></span>`).join('')}</div>
      <p class="ev" id="spmsg">כתבו את האות הראשונה (אות קטנה)</p></section>
    <div id="padhost" class="padhost"></div>
    <div class="pad-btns"><button class="btn ghost" data-eact="clear">🧽 מחיקה</button><button class="btn primary" data-eact="spcheck">✓ בדיקת האות</button></div>
    <div id="sheet"></div>
  </main>`;
  run.pad = makePad(document.getElementById('padhost'), { letter: null, trace: false, label: 'משטח כתיבה' });
  fitPad();
  say(w.en);
}
function spellCheck() {
  const t = run.task, s = run.sp, pad = run.pad; if (!pad || run.locked) return;
  if (!pad.strokes.length) { toast('כותבים את האות על הקווים'); return; }
  const want = s.word[s.pos], r = Ink.evaluate(pad.strokes, pad.guide, want), msg = document.getElementById('spmsg'), slots = document.querySelectorAll('.slot');
  if (r.ok) {
    slots[s.pos].textContent = want; slots[s.pos].className = 'slot ok'; s.pos++; s.tries = 0; pad.clear();
    if (s.pos >= s.word.length) return spellDone();
    slots[s.pos].classList.add('cur'); if (msg) msg.textContent = `יופי! עכשיו האות ה-${s.pos + 1}`;
    return;
  }
  s.tries++; s.wrongs++;
  if (s.tries === 1) {
    if (msg) msg.textContent = r.guess && r.guess !== want && r.issues.includes('other') ? `זו נראית כמו ${r.guess}, אבל במילה הזו צריך אות אחרת. הקשיבו שוב 🔊 ונסו.` : r.issues.includes('case') ? 'במילים כותבים אותיות קטנות. נסו שוב.' : 'האות לא יצאה ברורה. נסו שוב, לאט ובגדול.';
    say(s.word, { slow: true }); pad.clear();
  } else { // רמז: מראים את האות
    s.reveals++; s.tries = 0;
    slots[s.pos].textContent = want; slots[s.pos].className = 'slot hint'; s.pos++; pad.clear();
    if (msg) msg.textContent = `האות הייתה ${want}. ממשיכים!`;
    if (s.pos >= s.word.length) return spellDone();
    slots[s.pos].classList.add('cur');
  }
}
function spellDone() {
  const t = run.task, s = run.sp; run.locked = true;
  const ok = s.reveals === 0, res = commit(t, ok, {});
  const w = EN.WD[t.word];
  if (ok) sparkle();
  sheet(ok, ok ? [`${w.en} ${w.em} = ${w.he}`, s.wrongs ? 'תיקנת את עצמך, מצוין!' : 'כתבת את כל המילה נכון!'] : [`המילה נכתבת: ${w.en.split('').join(' - ')}`, 'נחזור עליה בפעם הבאה. כדאי לומר את הצלילים בזמן הכתיבה.'], res, [{ t: w.en, label: 'איך אומרים' }]);
  say(w.en);
}

// ---------- איות במקלדת (שלב מתקדם) ----------
function viewSpellType(t) {
  const w = EN.WD[t.word];
  run.typed = '';
  const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  C.app.innerHTML = `<main class="screen en-spell c-green">
    ${head()}
    <section class="qcard"><div class="tp"><span aria-hidden="true">⌨️</span> הקלידו את המילה באנגלית${skipBtn(t)}</div>
      <div class="sp-q">${w.em ? `<span class="pq-em">${w.em}</span>` : ''}<span class="word-he">${esc(w.he)}</span>${spk(w.en, 'השמעת המילה', 'lg')}</div>
      <div class="slots" dir="ltr" id="slots">${[...w.en].map(() => '<span class="slot"></span>').join('')}</div></section>
    <div class="kbd" dir="ltr">${rows.map(r => `<div class="kr">${[...r].map(c => `<button class="key en" data-eact="key" data-k="${c}">${c}</button>`).join('')}</div>`).join('')}
      <div class="kr"><button class="key wide" data-eact="bksp" aria-label="מחיקה">⌫</button><button class="key wide go" data-eact="typeok">✓ בדיקה</button></div></div>
    <div id="sheet"></div>
  </main>`;
  say(w.en);
}
function typeKey(k) {
  const w = EN.WD[run.task.word].en; if (run.locked) return;
  if (k === null) run.typed = run.typed.slice(0, -1); else if (run.typed.length < w.length) run.typed += k;
  document.querySelectorAll('.slot').forEach((s, i) => { s.textContent = run.typed[i] || ''; s.className = 'slot' + (i === run.typed.length ? ' cur' : ''); });
}
function typeCheck() {
  const t = run.task, w = EN.WD[t.word]; if (run.locked) return;
  if (run.typed.length < w.en.length) { toast(`למילה יש ${w.en.length} אותיות`); return; }
  run.locked = true;
  const ok = run.typed === w.en, ms = Math.min(60000, Math.round(performance.now() - run.t0));
  document.querySelectorAll('.slot').forEach((s, i) => { s.classList.add(run.typed[i] === w.en[i] ? 'ok' : 'bad'); });
  const res = commit(t, ok, { ms, timed: false });
  if (ok) sparkle();
  sheet(ok, ok ? [`${w.en} ${w.em} = ${w.he}`] : [`כתבת: ${run.typed}. נכון: ${w.en}`, 'האותיות האדומות הן המקומות לתיקון.'], res, [{ t: w.en, label: 'איך אומרים' }]);
  say(w.en);
}

// ---------- דילוג, הפסקה וסיום ----------
function skip() {
  const t = run.task; if (run.locked || run.retried.has(t)) return;
  stopSpeaking(); EN.recordSkip(prof(), t, C.dayKey()); run.sk++;
  run.retried.add(t); run.queue.splice(run.i, 1); run.queue.push(t);
  C.save(C.dayKey()); next();
}
function openStop() {
  if (!run || run.n === 0) { run = null; return renderMenu(); }
  const m = document.createElement('div');
  m.className = 'modal'; m.id = 'emodal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
  m.innerHTML = `<div class="mbox">${C.mascot('think')}<h2>רוצים לסיים עכשיו?</h2><p>עד עכשיו ענית על ${run.n} ${run.n === 1 ? 'משימה' : 'משימות'}. מה שעשית כבר נשמר.</p>
    <button class="btn primary big" data-eact="resume">להמשיך ללמוד</button><button class="btn big" data-eact="finishnow">לסיים ולראות סיכום</button><button class="link" data-eact="exitnow">לצאת בלי סיכום</button></div>`;
  C.app.appendChild(m);
}
function closeStop() { const m = document.getElementById('emodal'); if (m) m.remove(); }
function finish(partial) {
  stopSpeaking();
  const day = C.dayKey(), p = prof();
  if (partial) EN.recordPartial(p, day, run.n);
  run.events = EN.completeSession(p, day, run.topic, { n: run.n, ok: run.ok, ms: run.ms, sk: run.sk, partial });
  const ab = EN.abilityScore(p); if (ab.score !== null && p.days[day]) p.days[day].sc = ab.score;
  C.save(day);
  viewDone(partial);
}
function viewDone(partial) {
  const T = EN.TOPIC[run.topic], good = run.n ? run.ok / run.n >= 0.7 : false;
  const AREA_LBL = Object.fromEntries(EN.AREA_IDS.map(a => [a, EN.AREAS[a].title]));
  C.app.innerHTML = `<main class="screen done en-done c-${T.color}">
    ${C.confetti(good ? 40 : 10)}
    <div class="medal" aria-hidden="true">${!run.n ? '🌱' : run.ok / run.n >= 0.9 ? '🏆' : good ? '🌟' : '💪'}</div>
    <div class="dmasc">${C.mascot(good ? 'cheer' : 'happy')}</div>
    <h1>${partial ? 'עצרת באמצע, ויפה שהתחלת' : good ? `${enTxt('Excellent!')} כל הכבוד!` : `${enTxt('Good work!')} ממשיכים להתאמן`}</h1>
    ${run.n ? `<div class="score">${run.ok} <small>מתוך ${run.n}</small></div>` : ''}
    <p class="stars-row" aria-label="${run.stars} כוכבים">${Array.from({ length: Math.min(run.stars, 25) }, (_, i) => `<i style="--i:${i}">⭐</i>`).join('')}<b>${run.stars ? `${run.stars} כוכבים` : ''}</b></p>
    ${run.events.length ? `<section class="fb good unlock"><h2>🎉 חדש!</h2><ul>${run.events.map(e => `<li>${esc(e.text)}</li>`).join('')}</ul></section>` : ''}
    ${run.plan.intro.length ? `<section class="fb good"><h2>מה למדנו היום</h2><p class="learned" dir="ltr">${run.plan.intro.map(x => EN.LET[x] ? `<b class="en">${EN.LET[x].u}${x}</b>` : EN.WD[x] ? `<b class="en">${EN.WD[x].em || ''} ${esc(EN.WD[x].en)}</b>` : EN.CD[x] ? `<b class="en">💬 ${esc(EN.CD[x].en)}</b>` : '').join(' ')}</p></section>` : ''}
    <ul class="sum">${Object.keys(run.byArea).map(a => `<li><span aria-hidden="true">${EN.AREAS[a].icon}</span><span>${esc(AREA_LBL[a])}</span><span class="res">${run.byArea[a].ok} מתוך ${run.byArea[a].n}</span></li>`).join('')}</ul>
    ${run.sk ? `<p class="closing">דילגת על ${run.sk} ${run.sk === 1 ? 'משימה' : 'משימות'} וחזרת אליהן בסוף. יפה!</p>` : ''}
    <p class="closing">${partial ? 'אפשר להמשיך בפעם אחרת. מה שעשית נשמר.' : good ? `${enTxt('See you tomorrow!')} נתראה מחר.` : 'כל תרגול מקרב. בפעם הבאה נחזור על מה שקשה.'}</p>
    <div class="spacer"></div>
    <button class="btn primary big" data-eact="topic" data-id="${run.topic}">עוד שיעור</button>
    <button class="btn big" data-eact="menu">לנושאי האנגלית</button>
  </main>`;
  run = null;
}

// ---------- אירועים ----------
function onClick(e) {
  const b = e.target.closest('[data-eact]'); if (!b) return;
  const a = b.dataset.eact;
  if (a === 'say') { say(b.dataset.t, { slow: !!b.dataset.slow }); return; }
  if (a === 'back') { stopSpeaking(); return C.home(); }
  if (a === 'menu') return renderMenu();
  if (a === 'topic') { if (b.getAttribute('aria-disabled') === 'true') { toast(EN.locks(prof())[b.dataset.id].need); return; } return startTopic(b.dataset.id); }
  if (!run) return;
  if (a === 'begin') return next();
  if (a === 'cont') { run.i++; return next(); }
  if (a === 'next') { run.i++; return next(); }
  if (a === 'choose') return choose(Number(b.dataset.i));
  if (a === 'skip') return skip();
  if (a === 'quit') return openStop();
  if (a === 'resume') return closeStop();
  if (a === 'finishnow') { closeStop(); return finish(true); }
  if (a === 'exitnow') { closeStop(); const p = prof(); EN.recordPartial(p, C.dayKey(), run.n); EN.completeSession(p, C.dayKey(), run.topic, { n: run.n, ok: run.ok, ms: run.ms, sk: run.sk, partial: true }); C.save(C.dayKey()); run = null; return renderMenu(); }
  if (a === 'demo' && run.pad) return run.pad.demo();
  if (a === 'clear' && run.pad) { if (!run.locked) run.pad.disabled = false; return run.pad.clear(); }
  if (a === 'check') return checkWrite();
  if (a === 'retry' && run.pad) { run.pad.disabled = false; run.pad.trace = true; run.pad.clear(); const sh = document.getElementById('sheet'); if (sh) sh.innerHTML = ''; return; }
  if (a === 'mic') return doMic();
  if (a === 'recself') return doRecSelf();
  if (a === 'playself') { if (run.selfUrl) play(run.selfUrl); return; }
  if (a === 'selfok') return selfOk();
  if (a === 'spcheck') return spellCheck();
  if (a === 'key') return typeKey(b.dataset.k);
  if (a === 'bksp') return typeKey(null);
  if (a === 'typeok') return typeCheck();
}
function toast(text) {
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = text;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
}
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// נקודת גישה לבדיקות אוטומטיות (לקריאה בלבד)
window.__english = { get run() { return run; } };
