// fb.js — טעינה עצלה של Firebase SDK (רק כשהוגדר פרויקט ויש חיבור).
import { FIREBASE_CONFIG } from './config.js';

const V = '10.12.2';
export const firebaseConfigured = () => !!FIREBASE_CONFIG.apiKey && !/PASTE/.test(FIREBASE_CONFIG.apiKey);

let promise = null;
export function loadFirebase() {
  if (!firebaseConfigured()) return Promise.reject(new Error('not-configured'));
  if (!promise) {
    promise = (async () => {
      const base = `https://www.gstatic.com/firebasejs/${V}/`;
      const [appMod, authMod, fs] = await Promise.all([
        import(base + 'firebase-app.js'),
        import(base + 'firebase-auth.js'),
        import(base + 'firebase-firestore.js'),
      ]);
      const app = appMod.initializeApp(FIREBASE_CONFIG);
      return { app, auth: authMod.getAuth(app), db: fs.getFirestore(app), authMod, fs };
    })().catch(e => { promise = null; throw e; });
  }
  return promise;
}

// מכשיר של ילד: כניסה אנונימית (מאפשרת כתיבה בלבד — ראו firestore.rules)
export async function ensureKidAuth() {
  const f = await loadFirebase();
  const user = await new Promise(res => {
    const un = f.authMod.onAuthStateChanged(f.auth, u => { un(); res(u); });
  });
  if (!user) await f.authMod.signInAnonymously(f.auth);
  return f;
}
