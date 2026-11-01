// family.js — משפחות: קוד משפחה, רשימת ילדים, ופעולות ההורה מול Firestore.
// מבנה: families/{קוד} (בעלים, רשימת ילדים, מבדק) ← kids/{ילד} ← sessions/{יום}
import { loadFirebase } from './fb.js';

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // בלי 0/O ו-1/I כדי למנוע בלבול
export const normCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const validCode = c => /^[A-HJ-NP-Z2-9]{8}$/.test(c);
export const showCode = c => (c && c.length === 8 ? c.slice(0, 4) + '-' + c.slice(4) : c || '');
export function genCode() {
  const a = new Uint8Array(8); crypto.getRandomValues(a);
  return Array.from(a, x => ALPHA[x % 32]).join('');
}
const AV = { f: ['🦄', '🌸', '🦋', '🐱', '🌈', '🐬'], m: ['🚀', '🦖', '⚽', '🐻', '🦁', '🤖'] };
const COLORS = ['#C2410C', '#2F63D6', '#0E6B4C', '#7C3AED', '#B45309', '#BE185D'];
export const MAX_KIDS = 8;
export const avatar = (gender, i) => ({ emoji: AV[gender === 'f' ? 'f' : 'm'][i % 6], color: COLORS[i % 6] });

// ---------- צד הילד ----------
export async function fetchFamilyDoc(f, code) {
  const snap = await f.fs.getDoc(f.fs.doc(f.db, 'families', code));
  return snap.exists() ? snap.data() : null;
}

// ---------- צד ההורה ----------
export const MAX_PARENTS = 5;
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export async function listFamilies(user) {
  const { db, fs } = await loadFirebase();
  const email = (user.email || '').toLowerCase();
  const col = fs.collection(db, 'families');
  const mine = await fs.getDocs(fs.query(col, fs.where('parentUids', 'array-contains', user.uid)));
  const out = new Map(mine.docs.map(d => [d.id, Object.assign({ code: d.id }, d.data())]));
  // הזמנות שממתינות לחשבון הזה: מצטרפים אוטומטית כהורה נוסף
  const inv = await fs.getDocs(fs.query(col, fs.where('invitedEmails', 'array-contains', email)));
  for (const d of inv.docs) {
    if (out.has(d.id)) continue;
    const f = d.data();
    const upd = {
      parentUids: (f.parentUids || []).concat(user.uid),
      parentEmails: (f.parentEmails || []).concat(email),
      invitedEmails: (f.invitedEmails || []).filter(x => x !== email),
    };
    await fs.updateDoc(d.ref, upd);
    out.set(d.id, Object.assign({ code: d.id }, f, upd));
  }
  return Array.from(out.values());
}
export async function createFamily(user) {
  const { db, fs } = await loadFirebase();
  const code = genCode(), email = (user.email || '').toLowerCase();
  await fs.setDoc(fs.doc(db, 'families', code), {
    ownerUid: user.uid, ownerEmail: email, parentUids: [user.uid], parentEmails: [email], invitedEmails: [],
    createdAt: fs.serverTimestamp(), roster: [], kidIds: [], test: null,
  });
  return code;
}
export async function addChild(code, name, gender) {
  const { db, fs } = await loadFirebase();
  const ref = fs.doc(db, 'families', code), snap = await fs.getDoc(ref), d = snap.data();
  const roster = d.roster || [];
  if (roster.length >= MAX_KIDS) throw new Error('too-many');
  const g = gender === 'f' ? 'f' : 'm';
  const id = 'k' + Array.from(crypto.getRandomValues(new Uint8Array(6)), x => ALPHA[x % 32]).join('').toLowerCase();
  const kid = Object.assign({ id, name: String(name).trim().slice(0, 20), gender: g }, avatar(g, roster.length));
  await fs.updateDoc(ref, { roster: roster.concat(kid), kidIds: (d.kidIds || []).concat(id) });
  return kid;
}
export async function removeChild(code, kidId) {
  const { db, fs } = await loadFirebase();
  const ref = fs.doc(db, 'families', code), d = (await fs.getDoc(ref)).data();
  const ss = await fs.getDocs(fs.collection(db, 'families', code, 'kids', kidId, 'sessions'));
  for (const s of ss.docs) await fs.deleteDoc(s.ref);
  await fs.deleteDoc(fs.doc(db, 'families', code, 'kids', kidId));
  await fs.updateDoc(ref, { roster: (d.roster || []).filter(k => k.id !== kidId), kidIds: (d.kidIds || []).filter(i => i !== kidId) });
}
export async function setTest(code, test) {
  const { db, fs } = await loadFirebase();
  await fs.updateDoc(fs.doc(db, 'families', code), { test });
}
// הזמנת הורה נוסף לצפייה בתוצאות (לפי כתובת המייל של חשבון Google שלו)
export async function inviteParent(code, rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!emailOk(email)) throw new Error('bad-email');
  const { db, fs } = await loadFirebase();
  const ref = fs.doc(db, 'families', code), d = (await fs.getDoc(ref)).data();
  if ((d.parentEmails || []).includes(email) || (d.invitedEmails || []).includes(email)) throw new Error('exists');
  if ((d.parentUids || []).length + (d.invitedEmails || []).length >= MAX_PARENTS) throw new Error('too-many');
  await fs.updateDoc(ref, { invitedEmails: (d.invitedEmails || []).concat(email) });
}
// ביטול הזמנה או הסרת הורה (הבעלים בלבד; אי אפשר להסיר את הבעלים)
export async function removeParent(code, email) {
  const { db, fs } = await loadFirebase();
  const ref = fs.doc(db, 'families', code), d = (await fs.getDoc(ref)).data();
  const i = (d.parentEmails || []).indexOf(email);
  if (i > 0) { // 0 הוא הבעלים
    const uids = (d.parentUids || []).slice(), em = d.parentEmails.slice(); uids.splice(i, 1); em.splice(i, 1);
    await fs.updateDoc(ref, { parentUids: uids, parentEmails: em });
  } else if (i < 0) await fs.updateDoc(ref, { invitedEmails: (d.invitedEmails || []).filter(x => x !== email) });
}
