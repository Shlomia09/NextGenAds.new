# Known issues

נמצאו במהלך מיגרציית Rouge (`redesign/rouge-v3`). אף אחד מהם לא תוקן בענף הזה.
מספרי השורות נכונים ל-`redesign/rouge-v3` בזמן הכתיבה.

---

## אבטחה — לפני השקה

### 1. `meta-oauth` לוקח את זהות המשתמש מפרמטר לא מאומת

- **קבצים:** `supabase/config.toml:9-10` (`verify_jwt = false`), `supabase/functions/meta-oauth/index.ts:21`
- **מה קורה בפועל:** הפונקציה רצה בלי אימות JWT, וה-`userId` נלקח מ-`url.searchParams.get('state')`.
  שום דבר לא בודק שה-state שייך למי ששלח את הבקשה. הטוקנים של Meta נשמרים ל-`ad_accounts`
  תחת ה-userId הזה, עם service role.
- **למה זה חשוב:** מי שיודע מזהה משתמש יכול לשייך חשבון מודעות שלו (וטוקן) למשתמש אחר.
  ה-state ב-OAuth אמור להיות nonce חתום, לא מזהה גלוי.
- **Owner branch:** מסלול אבטחה נפרד.

### 2. ה-access token של Meta חוזר לדפדפן

- **קבצים:** `supabase/functions/meta-oauth/index.ts:153`, `src/pages/MetaCallback.tsx:133`
- **מה קורה בפועל:** תגובת ה-JSON של `meta-oauth` כוללת את ה-long-lived token.
  `MetaCallback` משתמש בו כ-fallback כדי לשמור את הטוקן ב-insert מהלקוח.
- **למה זה חשוב:** טוקן ארוך-טווח עם `ads_management` חשוף ב-JS של הדפדפן (תוספים, XSS, לוגים).
  ההסרה דורשת קודם שהשמירה תעבור כולה לצד השרת (ראה ממצא 3), אחרת חיבור חשבון חדש יישבר.
- **Owner branch:** מסלול אבטחה נפרד (תלוי בתיקון ממצא 3).

---

## נתונים

### 3. כל insert של חשבון חדש ב-`meta-oauth` נכשל בשקט

- **קבצים:** `supabase/functions/meta-oauth/index.ts:141`; constraint על `ad_accounts.status` בדאטהבייס החי
- **מה קורה בפועל:** ה-constraint מתיר `active | error | disconnected`. `meta-oauth` מכניס חשבון חדש
  עם `status: 'pending'`, ה-insert נדחה, והשגיאה רק נרשמת ללוג. החשבון נשמר בפועל רק אחר כך,
  מ-`MetaCallback`, מצד הלקוח — ולכן הוא צריך את הטוקן מהתגובה (ממצא 2).
- **למה זה חשוב:** הזרימה עובדת במקרה ולא בתכנון, ו-`accounts_stored` מדווח מספר שגוי.
  זה גם מה שמונע להוציא את הטוקן מהתגובה.
- **Owner branch:** `feature/onboarding-data`.

### 4. מטבע: EUR כברירת מחדל כמעט בכל מקום

- **קבצים:** `src/lib/benchmarks.ts:162` (`formatCurrency(value, currency = 'EUR')`),
  ו-`src/pages/Onboarding.tsx:103` (`currency: 'EUR'`)
- **מה קורה בפועל:** `formatCurrency` נקראת ב-41 מקומות במסכי המוצר, כמעט תמיד בלי מטבע,
  ובנוסף יש 29 מקומות עם `'€'` קשיח (יחידות בבנצ'מרקים, צירי צ'ארטים, Salon / Wholesale, Audit).
- **למה זה חשוב:** מפרסם שעובד בדולר או בפאונד רואה סימן מטבע שגוי על כל מספר במערכת.
  `feature/onboarding-data` כבר מביא את מטבע החשבון מ-Meta; נשאר להעביר אותו לתצוגה.
- **Owner branch:** `feature/onboarding-data` (הנתון), ואחריו חוב פתוח לתצוגה.

---

## מוצר

### 5. `MONTHLY_LOSS` במסך Audit הוא מספר מקובע

- **קבצים:** `src/pages/Audit.tsx:18` (`const MONTHLY_LOSS = 3200; // mock`), מוצג ב-`:248`
- **מה קורה בפועל:** "Estimated monthly loss vs benchmark brands" מציג €3,200/mo לכל משתמש,
  באדום, כאילו חושב מהחשבון שלו.
- **למה זה חשוב:** מפר את "בלי נתוני דמה" ב-CLAUDE.md — מספר מומצא שמוצג כנתון אמיתי.
  אין דאטה → empty state, לא מספר.
- **Owner branch:** חוב פתוח.

### 6. DemoDashboard בלי breakpoint

- **קבצים:** `src/pages/DemoDashboard.tsx:131` (`<aside style={{ width: 220, … }}>`)
- **מה קורה בפועל:** הסיידבר ברוחב קבוע 220px בכל רוחב מסך, ואזור התוכן נחתך ב-`overflow: hidden`.
  מתחת ל-768px כותרת העמוד, ה-KPI וכרטיסי הבנצ'מרק נחתכים מימין.
- **למה זה חשוב:** הדמו הוא הדבר הראשון שמבקר רואה מהלנדינג ומה-Login, וחלק גדול מהתנועה במובייל.
- **Owner branch:** חוב פתוח.
