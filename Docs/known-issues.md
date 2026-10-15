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

### 7. טענות על הדאטהסט: מספר מותגים וטווח שנים שגויים

- **קבצים:** `src/pages/Login.tsx:63`, `src/pages/Audit.tsx:133, 229, 268`, `src/pages/DemoDashboard.tsx:233`,
  `src/components/ui/BenchmarkAvailabilityBadge.tsx:53`, `src/components/dashboard/EcommerceDashboard.tsx:157`
- **מה קרה בפועל:** מספר מותגים וטווח שנים קשיחים, שניהם שגויים, הופיעו בשמונה מקומות והוצגו ללקוח כעובדה.
  בנוסף, ספירת שנים ("X years") הופיעה בכ-40 מקומות במוצר, ב-Landing, ב-Pricing, ב-`index.html` וב-Docs.
  הערכים המקוריים נשמרים בהיסטוריה, ב-diff של הקומיט `fix(data): correct dataset claims`.
- **הנתון הנכון:** 20,000+ קמפיינים, מתחילת 2018 ועד היום. ספירת שנים הוחלפה ב-"since 2018",
  כי מספר שנים מתיישן כל ינואר.
- **Owner branch:** נסגר.

---

## מודל המוצר

### 8. פער בין המודל המשווק לקוד — **חוסם שיווק**

- **קבצים:** `supabase/functions/claude-chat/index.ts:166, 182, 281, 595-611`;
  `supabase/functions/execute-recommendation/index.ts:48-53` (`auto_executable`);
  `src/components/billing/UpgradeModal.tsx:16`; `supabase/functions/generate-recommendations/index.ts:227`
- **מה קורה בפועל:** `CLAUDE.md` והלנדינג מתארים ניהול אוטונומי בתוך תקרה שהלקוח מגדיר:
  עצירות, העברות תקציב ובדיקות קהל רצות לבד; רק מה שמוציא יותר מחכה ללקוח.
  הקוד מיישם אישור לכל פעולה: הפרומט של הצ'אט אומר "Nothing executes on its own",
  כל פעולה עוברת דרך `action_proposal` רק אחרי אישור מפורש, ו-`execute-recommendation`
  מריץ רק המלצה מסומנת `auto_executable`. **אין בשום מקום מושג של ceiling.**
  `UpgradeModal` ("Human-approved campaign execution") ו-`generate-recommendations`
  ("generate… recommendations") ממסגרים את המוצר כהמלצות.
- **למה זה חשוב:** הלנדינג מבטיח ללקוח משהו שהמוצר לא עושה. הפרומט של הצ'אט נשאר כמו שהוא
  בכוונה — הוא מתאר נכון את מה שקורה היום, ולהגיד ל-Rouge שהיא פועלת לבד כשהיא לא יכולה
  זה לשקר ללקוח. הפער נסגר מצד הקוד, לא מצד הפרומט.
- **Owner branch:** מסלול אוטונומיה. **חוסם שיווק** — לא לפרסם את הלנדינג לפני שזה נסגר.

### 9. Privacy ו-Terms לא קיימים כמסלולים

- **קבצים:** `src/App.tsx` (אין route); הפוטר ב-`src/components/marketing/MarketingChrome.tsx`
- **מה קורה בפועל:** אין עמודי Privacy ו-Terms. ה-catch-all מחזיר כל כתובת לא מוכרת לדף הבית,
  ולכן הם לא קושרו מהפוטר.
- **למה זה חשוב:** SaaS שגובה תשלום (Stripe checkout כבר מחובר ב-Pricing) צריך אותם —
  משפטית, ול-Stripe ול-Meta App Review.
- **Owner branch:** חוב פתוח.

### 10. תוכנית Starter "צופה ומדווחת" — החלטת מוצר פתוחה

- **קבצים:** `supabase/billing_schema.sql:27` (`starter` עם `can_execute = false`);
  `src/components/marketing/PricingSection.tsx` (הכרטיס אומר "Watches and reports — does not act in the account")
- **מה קורה בפועל:** Starter לא יכולה לבצע שום פעולה בחשבון. היא מערכת המלצות —
  בדיוק מה שהמיצוב אומר שאף אחד לא משלם עליו, והיא סותרת את "Rouge runs the account".
- **האפשרויות:** או ש-Starter מקבלת ביצוע בתקרה נמוכה, או שהיא לא צריכה להתקיים.
  **לא הוחלט.** דורש החלטה משותפת, כולל שלומי — לא להחליט לבד בקוד.
- **Owner branch:** החלטת מוצר.

---

## טענות

### 11. טענות ביצועים ללא מקור בפרומטים, שמגיעות ללקוח דרך המודל — **חוסם שיווק**

- **קבצים:**
  - `supabase/functions/analyze-creative/index.ts:13, 14, 25, 26, 37, 39, 40` — שבע טענות העלאה באחוזים
    ("67% better CTR", "increases CTR 23%", "outperform… by 31%", "+18% AOV", "44% better conversion",
    "reduces CPL by 35%", "28% higher CTR")
  - `supabase/functions/generate-recommendations/index.ts:49` ("convert 40% better"),
    `supabase/functions/claude-chat/index.ts:318` ("by ~40%"), `supabase/functions/claude-chat/index.ts:97`
    ו-`src/lib/conversionConfig.ts:195` ("20-30% lower quality")
  - `supabase/functions/generate-recommendations/index.ts:269` — שדה `impact`
  - בממשק: `src/components/dashboard/SpaDashboard.tsx:176` ("Gift voucher CTR peaks +320% in Q4"),
    `src/components/ui/TrueRoasCard.tsx:166` ("Industry: 25–35%"), `src/pages/DemoDashboard.tsx:61` ("15-25%")
- **מה קורה בפועל:** הפרומטים מכילים טענות העלאה מספריות בלי מקור. המודל מצטט אותן ללקוח
  כממצא, וחלקן מוצגות ישירות בממשק.
  שדה `impact` (`"Expected improvement (e.g., CPL -20% in 7 days)"`) מבקש מהמודל תחזית מספרית
  בלי בסיס, והיא מוצגת ללקוח כנתון. **זו ההוראה המסוכנת מכולן: היא לא מצטטת מספר שגוי, היא מייצרת אחד.**
- **הכרעה נדרשת לכל טענה:** ניתנת לחישוב מהדאטהסט → לחשב ולצטט מהמקור.
  לא ניתנת → להוריד את המספר ולהשאיר ניסוח כיווני.
  **שדה `impact` יורד ללא קשר** — אסור לבקש מהמודל תחזית מספרית.
- **לאישור:** הערכים שסווגו כדאטת בנצ'מרק (ממוצעי CTR, שיעורי הגעה 40–60% וכו', ב-`claude-chat`,
  `generate-recommendations` ו-`conversionConfig.ts`) — שלומי צריך לאשר שהם באמת מהדאטהסט.
- **Owner branch:** מסלול טענות. **חוסם שיווק.**

---

## כלל

**כל מספר שמוצג ללקוח חייב מקור.** אם אין מקור — לנסח בלי מספר.
