// config.js — כאן ממלאים את פרטי פרויקט ה-Firebase (ראו README, שלב 2).
// כל עוד הערכים מכילים PASTE האפליקציה עובדת במצב מקומי: הנתונים נשמרים רק במכשיר.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDgkwZGFbDLOMnqLTAzm_eSpt52hDwtyec',
  authDomain: 'almos-math.firebaseapp.com',
  projectId: 'almos-math',
  storageBucket: 'almos-math.firebasestorage.app',
  messagingSenderId: '843991911910',
  appId: '1:843991911910:web:4d4fa626b9dff9f6fd5a27',
};

// מצב מקומי בלבד (בלי Firebase): שני הילדים שמוצגים לבחירה. ב-Firebase הילדים מוגדרים בלוח ההורה, לכל משפחה בנפרד.
export const LOCAL_KIDS = [
  { id: 'emma',  name: 'אמה',  en: 'Emma', enLast: 'Almosninos', gender: 'f', emoji: '🦄', color: '#C2410C' },
  { id: 'eitan', name: 'איתן', en: 'Eitan', enLast: 'Almosninos', gender: 'm', emoji: '🚀', color: '#2F63D6' },
];

// תאריך מבדק למצב מקומי. ב-Firebase ההורה קובע תאריך בלוח הבקרה (אופציונלי).
export const TEST = { name: 'המבדק במתמטיקה', date: '2026-11-18' };
