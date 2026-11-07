// store.js — שמירה מקומית (מקור האמת של הילד) + סנכרון ל-Firestore עבור ההורה.
// מקומית קודם: האפליקציה עובדת בלי חיבור, והסנכרון חוזר על עצמו עד שמצליח.
// משפחה: ללא Firebase — מצב מקומי עם LOCAL_KIDS. עם Firebase — הילד מזין קוד משפחה פעם אחת.
import { LOCAL_KIDS, TEST } from './config.js';
import { firebaseConfigured, ensureKidAuth } from './fb.js';
import { normCode, validCode, fetchFamilyDoc } from './family.js';

const E = () => window.MathEngine;
const T = () => window.TimesEngine;
const EN = () => window.EnglishEngine;
const G4 = () => window.Grade4;
const FAM_KEY = 'mathapp:v2:family';
// מצב תצוגה להורים (index.html?preview=1): ילדים לדוגמה, בלי קוד, בלי שמירה במכשיר ובלי שליחה לענן
const PREVIEW = typeof location !== 'undefined' && new URLSearchParams(location.search).has('preview');
const PREVIEW_KIDS = [{ id: 'demo-m', name: 'דני', gender: 'm', emoji: '👦', color: '#2F63D6' }, { id: 'demo-f', name: 'דנה', gender: 'f', emoji: '👧', color: '#C2410C' }];
let previewLevel = 2;
export const isPreview = () => PREVIEW;
export const getPreviewLevel = () => previewLevel;
const kidKey = (code, id) => `mathapp:v2:${code}:${id}`;
const MAX_RECENT = 150;

// ---------- משפחה ----------
function readFamily() {
  if (PREVIEW) return { code: 'preview', mode: 'preview', roster: PREVIEW_KIDS, test: null };
  if (!firebaseConfigured()) return { code: 'local', mode: 'local', roster: LOCAL_KIDS, test: TEST };
  try {
    const f = JSON.parse(localStorage.getItem(FAM_KEY));
    if (f && validCode(f.code) && Array.isArray(f.roster)) return Object.assign(f, { mode: 'family' });
  } catch (e) { /* ignore */ }
  return null;
}
let family = readFamily();
export const getFamily = () => family;
function persistFamily() { try { localStorage.setItem(FAM_KEY, JSON.stringify({ code: family.code, roster: family.roster, test: family.test })); } catch (e) { /* ignore */ } }
export async function joinFamily(input) {
  const code = normCode(input);
  if (!validCode(code)) throw new Error('bad-code');
  let d;
  try { d = await fetchFamilyDoc(await ensureKidAuth(), code); }
  catch (e) { throw new Error(navigator.onLine === false ? 'offline' : 'network'); }
  if (!d) throw new Error('not-found');
  family = { code, mode: 'family', roster: d.roster || [], test: d.test || null };
  persistFamily();
  return family;
}
// רענון רשימת הילדים והמבדק מהענן (ברקע; בלי חיבור נשארים עם מה ששמור)
export async function refreshFamily() {
  if (!family || family.mode !== 'family') return family;
  try {
    const d = await fetchFamilyDoc(await ensureKidAuth(), family.code);
    if (d) { family.roster = d.roster || []; family.test = d.test || null; persistFamily(); }
  } catch (e) { /* ignore */ }
  return family;
}
export function leaveFamily() { family = null; try { localStorage.removeItem(FAM_KEY); } catch (e) { /* ignore */ } }

// ---------- נתוני ילד ----------
function fresh() {
  return { rev: 0, profile: E().newProfile(), programs: { times: T().newProfile(), english: EN().newProfile(), g4: G4().newProfile() }, sessions: {}, dirty: { profile: false, sessions: {} }, recent: [], lastRound: null, lastTimes: null }; // ילד שלא תרגל לא נכתב לענן
}
function normalize(d) {
  d.profile = E().ensureProfile(d.profile || E().newProfile());
  d.sessions = d.sessions || {};
  d.dirty = d.dirty || { profile: false, sessions: {} };
  d.dirty.sessions = d.dirty.sessions || {};
  d.recent = d.recent || [];
  d.rev = d.rev || 0;
  d.lastRound = d.lastRound || null;
  d.lastTimes = d.lastTimes || null;
  d.programs = d.programs || {};
  d.programs.times = T().ensureProfile(d.programs.times); // תוכניות נוספות יתווספו כאן
  d.programs.english = EN().ensureProfile(d.programs.english);
  d.programs.g4 = G4().ensureProfile(d.programs.g4);
  return d;
}
function readKey(k) {
  try { const raw = localStorage.getItem(k); if (raw) { const d = JSON.parse(raw); if (d && d.profile) return d; } } catch (e) { /* אחסון חסום */ }
  return null;
}
const memory = {}; // גיבוי אם localStorage חסום
export function loadKid(id) {
  if (!family) return fresh();
  if (PREVIEW) { const k = 'preview:' + id; return memory[k] || (memory[k] = seedPreview(previewLevel)); }
  const k = kidKey(family.code, id);
  let d = readKey(k) || memory[k];
  if (!d && family.mode === 'local') d = readKey(`mathapp:v1:${id}`); // המשך מגרסה 1
  return d ? normalize(d) : fresh();
}
export function saveKid(id, data, day) {
  if (PREVIEW) { memory['preview:' + id] = data; return; } // תצוגה בלבד: נשמר רק בזיכרון עד סגירת הדף
  data.rev = (data.rev || 0) + 1;
  data.dirty.profile = true;
  if (day) data.dirty.sessions[day] = true;
  if (data.recent.length > MAX_RECENT) data.recent = data.recent.slice(-MAX_RECENT);
  const days = Object.keys(data.sessions).sort(); // שומרים רק 45 ימי סשנים מקומית
  while (days.length > 45) { const d = days.shift(); delete data.sessions[d]; delete data.dirty.sessions[d]; }
  const k = kidKey(family.code, id);
  try { localStorage.setItem(k, JSON.stringify(data)); } catch (e) { memory[k] = data; }
  queueSync(id);
}

// שחזור מהענן: מכשיר/דפדפן חדש של ילד שכבר תרגל (למשל מעבר מספארי לכרום). רק כשאין בו עדיין שום תרגול.
export async function restoreKid(id) {
  if (!family || family.mode !== 'family') return false;
  const cur = loadKid(id);
  if (cur.rev > 0) return false;
  try {
    const { db, fs } = await ensureKidAuth();
    const snap = await fs.getDoc(fs.doc(db, 'families', family.code, 'kids', id));
    if (!snap.exists()) return false;
    const c = snap.data();
    const used = days => days && Object.keys(days).some(k => days[k].answered > 0);
    const px = c.programs && c.programs.times, pe = c.programs && c.programs.english, pg = c.programs && c.programs.g4;
    if (!used(c.days) && !(px && used(px.days)) && !(pe && used(pe.days)) && !(pg && used(pg.days))) return false;
    const profile = E().ensureProfile({ levels: c.levels, stats: c.stats, days: c.days, hist: c.hist, baseline: c.baseline, skills: c.skills, start: c.start || null, lastCounts: c.lastCounts });
    const d = normalize({ rev: 1, profile, programs: { times: px ? T().ensureProfile(px) : T().newProfile(), english: EN().ensureProfile(pe ? JSON.parse(JSON.stringify(pe)) : null), g4: G4().ensureProfile(pg ? JSON.parse(JSON.stringify(pg)) : null) }, sessions: {}, dirty: { profile: false, sessions: {} }, recent: [] });
    const k = kidKey(family.code, id);
    try { localStorage.setItem(k, JSON.stringify(d)); } catch (e) { memory[k] = d; }
    return true;
  } catch (e) { return false; }
}

// נתוני דוגמה לתצוגה: כל הרמות לפי הרמה שנבחרה, ובאנגלית חלק מהאותיות והמילים כבר נלמדו (והשלב הבא פתוח, כדי לראות גם כרטיסי לימוד)
function seedPreview(level) {
  const d = fresh(), L = Math.max(1, Math.min(5, level)), X = EN(), en = X.ensureProfile(d.programs.english), day = E().dayKey();
  E().TOPICS.forEach(t => { d.profile.levels[t.id] = L; });
  d.programs.times.levels.times = L;
  G4().IDS.forEach(id => { d.programs.g4.levels[id] = L; });
  en.lg = Math.min(X.GROUPS.length, L + 1); en.wg = en.lg; en.wt = Math.min(X.STAGES.length, L * 2);
  const known = X.GROUPS.slice(0, en.lg - 1).join('');
  en.intro.L = known;
  [...known].forEach(l => { ['lname', 'lsound', 'lcase'].forEach(a => { en.st[a][l] = [3, 3, 0, day]; }); en.st.wup[l.toUpperCase()] = [3, 3, 0, day]; en.st.wlo[l] = [3, 3, 0, day]; });
  const stagesKnown = X.STAGES.slice(0, en.wt - 1);
  en.intro.W = [].concat(...stagesKnown.map(s => s.ids)).filter(id => X.WD[id]);
  en.intro.W.forEach(id => { en.st.vocab[id] = [3, 3, 0, day]; });
  en.intro.C = X.CHUNKS.slice(0, Math.min(X.CHUNKS.length - 3, 5 * L)).map(c => c.id);
  if (L >= 4) en.intro.W.filter(id => /^[a-z]+$/.test(X.WD[id].en)).slice(0, 12).forEach(id => { en.st.spell[id] = [3, 3, 0, day]; });
  return d;
}
export function previewReset(level) { previewLevel = level; Object.keys(memory).filter(k => k.startsWith('preview:')).forEach(k => delete memory[k]); }

// ---------- סנכרון ----------
const canSync = () => firebaseConfigured() && family && family.mode === 'family';
let status = canSync() ? 'pending' : 'off';
const listeners = new Set();
function setStatus(s) { status = s; listeners.forEach(fn => fn(s)); }
export const getStatus = () => status;
export function onStatus(fn) { listeners.add(fn); return () => listeners.delete(fn); }

const timers = {}; // טיימר נפרד לכל ילד
let inflight = false;
export function queueSync(id) {
  if (!canSync()) { setStatus('off'); return; }
  clearTimeout(timers[id]);
  timers[id] = setTimeout(() => flush(id), 700);
}
export const syncNow = id => queueSync(id);

async function flush(id) {
  if (!canSync()) return setStatus('off');
  if (inflight) return queueSync(id);
  const d = loadKid(id), code = family.code;
  const dirtyDays = Object.keys(d.dirty.sessions).filter(k => d.dirty.sessions[k]);
  if (!d.dirty.profile && !dirtyDays.length) return setStatus('ok');
  inflight = true; setStatus('pending');
  const snapshotRev = d.rev;
  try {
    const { db, fs } = await ensureKidAuth();
    const kid = family.roster.find(k => k.id === id) || {}, p = d.profile, x = d.programs.times, en = d.programs.english;
    const timesUsed = Object.keys(x.days).some(k => x.days[k].answered > 0);
    const engUsed = EN().used(en) || en.intro.L.length > 0 || en.intro.W.length > 0;
    const programs = {};
    if (timesUsed) programs.times = { levels: x.levels, stats: x.stats, days: x.days, hist: x.hist, baseline: x.baseline, skills: x.skills, start: x.start || null, facts: x.facts, rlog: x.rlog || [] };
    if (engUsed) programs.english = en;
    const g4 = d.programs.g4;
    if (G4().used(g4)) programs.g4 = { levels: g4.levels, stats: g4.stats, days: g4.days, hist: g4.hist, baseline: g4.baseline, skills: g4.skills, start: g4.start || null };
    await fs.setDoc(fs.doc(db, 'families', code, 'kids', id), {
      kidId: id, name: kid.name || id, gender: kid.gender === 'f' ? 'f' : 'm',
      levels: p.levels, stats: p.stats, days: p.days, hist: p.hist, baseline: p.baseline, skills: p.skills,
      start: p.start || null, lastCounts: p.lastCounts,
      streak: T().streakAny(p, x, undefined, en),
      ...(Object.keys(programs).length ? { programs } : {}),
      lastActive: new Date().toISOString(),
      updatedAt: fs.serverTimestamp(),
    }, { merge: true });
    for (const day of dirtyDays) {
      await fs.setDoc(fs.doc(db, 'families', code, 'kids', id, 'sessions', day), Object.assign({}, d.sessions[day], { updatedAt: fs.serverTimestamp() }), { merge: true });
    }
    const latest = loadKid(id);
    if (latest.rev === snapshotRev) {
      latest.dirty = { profile: false, sessions: {} };
      const k = kidKey(code, id);
      try { localStorage.setItem(k, JSON.stringify(latest)); } catch (e) { memory[k] = latest; }
      setStatus('ok');
    } else {
      setStatus('pending'); inflight = false; return queueSync(id); // נוספו תשובות בזמן השליחה
    }
  } catch (e) {
    console.warn('סנכרון נכשל:', e && e.message);
    setStatus(navigator.onLine === false ? 'offline' : 'error');
    setTimeout(() => queueSync(id), 30000); // ניסיון חוזר
  } finally {
    inflight = false;
  }
}
window.addEventListener('online', () => { if (family) family.roster.forEach(k => queueSync(k.id)); });
