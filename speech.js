// speech.js — הקראה באנגלית (קול של המכשיר), זיהוי דיבור של הילד, והקלטה כדי שהילד ישמע את עצמו.
// כל יכולת נבדקת לפני שימוש: אם המכשיר לא תומך, האפליקציה עוברת לחלופה (הקלטה והשוואה).

let voice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const vs = speechSynthesis.getVoices() || [];
  const en = vs.filter(v => /^en[-_]/i.test(v.lang));
  voice = en.find(v => /en[-_]US/i.test(v.lang) && /samantha|google us|aria|jenny|allison|ava/i.test(v.name))
    || en.find(v => /en[-_]US/i.test(v.lang) && v.localService) || en.find(v => /en[-_]US/i.test(v.lang))
    || en.find(v => /en[-_]GB/i.test(v.lang)) || en[0] || null;
  return voice;
}
if ('speechSynthesis' in window) { pickVoice(); try { speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch (e) { /* ignore */ } }

export const canSpeak = () => 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
// אומר טקסט באנגלית. slow: לאט יותר (לחזרה אחרי טעות)
export function say(text, o = {}) {
  return new Promise(resolve => {
    if (!canSpeak() || !text) return resolve(false);
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = (voice && voice.lang) || 'en-US';
      if (voice || pickVoice()) u.voice = voice;
      u.rate = o.slow ? 0.6 : 0.85; u.pitch = 1.05;
      let done = false; const fin = ok => { if (!done) { done = true; resolve(ok); } };
      u.onend = () => fin(true); u.onerror = () => fin(false);
      setTimeout(() => fin(true), 4000 + text.length * 120);
      speechSynthesis.speak(u);
    } catch (e) { resolve(false); }
  });
}
export function stopSpeaking() { try { if (canSpeak()) speechSynthesis.cancel(); } catch (e) { /* ignore */ } }

// ---------- זיהוי דיבור ----------
const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
let recBroken = false; // אם השירות סירב (למשל אין הרשאה), עוברים להקלטה בלבד עד סוף השימוש
export const canRecognize = () => !!Rec && !recBroken;
let active = null;
// מחזיר { alts:[...], error } — error: 'no-speech' | 'not-allowed' | 'network' | 'unsupported' | 'aborted' | ...
export function listen(o = {}) {
  return new Promise(resolve => {
    if (!canRecognize()) return resolve({ alts: [], error: 'unsupported' });
    stopSpeaking();
    let r;
    try { r = new Rec(); } catch (e) { recBroken = true; return resolve({ alts: [], error: 'unsupported' }); }
    r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
    let settled = false, alts = [];
    const fin = res => { if (settled) return; settled = true; active = null; clearTimeout(timer); try { r.abort(); } catch (e) { /* ignore */ } resolve(res); };
    r.onresult = e => {
      for (let i = e.resultIndex; i < e.results.length; i++) for (let j = 0; j < e.results[i].length; j++) alts.push(e.results[i][j].transcript);
      fin({ alts });
    };
    r.onerror = e => {
      const code = e.error || 'error';
      if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'language-not-supported') recBroken = true;
      fin({ alts, error: code });
    };
    r.onend = () => fin({ alts, error: alts.length ? null : 'no-speech' });
    const timer = setTimeout(() => fin({ alts, error: alts.length ? null : 'no-speech' }), o.timeoutMs || 7000);
    active = r;
    try { r.start(); } catch (e) { fin({ alts: [], error: 'busy' }); }
  });
}
export function stopListening() { if (active) { try { active.stop(); } catch (e) { /* ignore */ } } }

// ---------- הקלטה ושמיעה עצמית ----------
export const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
let recorder = null, stream = null;
export async function record(ms = 3000) {
  if (!canRecord()) return { error: 'unsupported' };
  stopSpeaking();
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
    recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(res => { recorder.onstop = res; });
    recorder.start();
    const t = setTimeout(() => { if (recorder && recorder.state === 'recording') recorder.stop(); }, ms);
    await stopped; clearTimeout(t);
    stream.getTracks().forEach(tr => tr.stop()); stream = null;
    const blob = new Blob(chunks, { type: recorder.mimeType || type || 'audio/mp4' });
    recorder = null;
    return { url: URL.createObjectURL(blob) };
  } catch (e) {
    if (stream) { stream.getTracks().forEach(tr => tr.stop()); stream = null; }
    return { error: e && e.name === 'NotAllowedError' ? 'not-allowed' : 'error' };
  }
}
export function stopRecording() { if (recorder && recorder.state === 'recording') recorder.stop(); }
export function play(url) {
  return new Promise(res => { try { const a = new Audio(url); a.onended = () => res(true); a.onerror = () => res(false); a.play().catch(() => res(false)); } catch (e) { res(false); } });
}
