# Claude Code — Rouge design migration

> מאומת מול `origin/main @ 8d693d6`. אם main זז — קרא קבצים לפני עריכה.
> המפרט המלא והנימוקים: ראה את "Rouge Migration Spec" ו-"Rouge Brand Book".
> **שישה קומיטים נפרדים, בסדר הזה.** אל תמזג הכל לאחד.

---

## המשימה

העברת כל המערכת לעיצוב החדש — **שני מצבים, יום ולילה** — כולל המוצר, דף המכירה, ושאלון הלקוח.

ענף: `redesign/rouge-v3`. אל תדחוף ל-main (Vercel מפרסם אוטומטית). PR בסוף.

**הכיוון בשורה אחת:** Rouge היא הסמכות המקצועית של ענף הביוטי, לא מותג ביוטי. עורכי, חזק, דאטה-פורוורד. לא רך, לא קרמי, לא רוז'-גולד.

**ארכיטקטורה:** אדום אחד, שני רקעים. **Bone לשיווק** (לנדינג, תמחור, אונבורדינג, לוגין) · **Ink למוצר** (דשבורד והלאה). Dark נשאר ברירת המחדל ב-`:root`.

---

## קומיט 1 — `CLAUDE.md` (לפני כל קוד)

שני באגים בקובץ הזה גרמו לחצי מהדריפט:

1. הוא מפנה ל-`docs/design-system.md` — **הקובץ הזה לא קיים.** האמיתי הוא `Docs/nextadsgen-design-system.md`. תקן את הנתיב.
2. הסעיף "כללי ברזל" עדיין אומר רוז'-גולד, Manrope, JetBrains, וצל על כל כרטיס. **תחליף את הסעיף, אל תוסיף לידו.**

החלף את כל "כללי ברזל" ואת "הכיוון" בזה:

```markdown
## הכיוון: עורכי, חזק, דאטה-מוכוון

Rouge היא הסמכות המקצועית של ענף הביוטי — לא מותג ביוטי. הרפרנס הוא העיתונות
המקצועית (WWD, BoF, Glossy): טיפוגרפיה כבדה, ניגודיות גבוהה, מספרים גדולים.
לא רך, לא קרמי, לא עדין.

**אדום אחד, שני רקעים.** Bone לשיווק, Ink למוצר. Dark הוא ברירת המחדל.
הצפיפות נשארת — שלוש שכבות בכל מסך אנליטי (KPI, צ'ארטים, טבלה). הרכות הלכה.

## כללי ברזל

- **צבעים:** רק CSS variables. אסור hardcoded hex בקומפוננטות.
- **האדום הוא גם צבע ההתראה.** זו התזה, לא התנגשות — המוצר קיים כדי לסמן מה גוסס.
  אדום לא עולה על ~6% ממסך. פלאט בלבד: בלי גרדיאנט, בלי שקיפות, בלי גוון.
- **אדום אף פעם לא נושא טקסט רץ.** מינימום 24px, או 18.5px במשקל 700. מתחת לזה
  זה נכשל בנגישות (יחס 4.1 על bone). זה הכלל שהכי קל לשבור בטעות.
- **שני ערכי אדום:** `#E8102F` על bone, `#FB2343` על ink. אותו גוון (351), ערך
  שונה. אסור להשתמש באחד על הרקע של השני.
- **פונטים:** דיספליי ← `Archivo` 800/900. UI ← `Inter` 400-600. מספרים ←
  `IBM Plex Mono`. אקסנט ← `Bodoni Moda` איטליק, **מילה אחת למסך**.
- **רדיוס 3px.** 0 על סלאבים ותאי טבלה. 999px רק על status pills.
- **בלי צללים.** הפרדה בין משטחים נעשית ב-surface + קו 1px, לא בבלור.
  `--shadow` נשאר רק למודאלים ודרופדאונים.
- **גבולות:** `--rule` דקורטיבי בלבד. כל גבול פונקציונלי (אינפוט, פוקוס, טוגל)
  חייב `--control` — הוא היחיד שעובר 3:1.
- **מספרים גדולים.** המספר הראשי בכל מסך אנליטי 72px+ ב-Archivo 900.
- **שני מצבים:** כל שינוי נבדק ב-dark וב-light. ה-light הוא שנשבר.
- **Sentence case** בטקסט רץ. דיספליי ב-UPPERCASE.
```

---

## קומיט 2 — טוקנים · `src/styles/theme.css`

**אל תמחק את בלוק ה-aliases.** יש שם ~60 כינויים (`--rose`, `--copper`, `--danger`...) שכל הקוד משתמש בהם. **שנה רק את טוקני הבסיס** והכל יתעדכן לבד. זה מה שהופך את ההגירה לזולה.

### בלוק משותף

```css
:root {
  --font-display: 'Archivo', Impact, system-ui, sans-serif;
  --font-ui:      'Inter', -apple-system, sans-serif;
  --font-mono:    'IBM Plex Mono', monospace;
  --font-accent:  'Bodoni Moda', Georgia, serif;
  --font-sans:    var(--font-ui);

  --tracking-display: -0.045em;
  --tracking-title:   -0.03em;

  --radius:      3px;
  --radius-sm:   2px;
  --radius-lg:   3px;
  --radius-xl:   3px;
  --radius-full: 999px;

  --transition: 0.15s ease;
}
```

מחק את `--font-serif` לגמרי (שריד מ-Fraunces).

### DARK · ink — ברירת מחדל

```css
:root,
[data-theme="dark"] {
  --bg:             #121113;
  --bg-sidebar:     #0C0B0D;
  --surface:        #1A191C;
  --surface-2:      #211F24;
  --surface-hover:  #2A272E;

  --border:         #2E2C31;   /* דקורטיבי */
  --border-soft:    #222025;
  --border-control: #6B6772;   /* פונקציונלי — 3.4:1 */

  --text:           #EDEBE8;
  --text-2:         #A8A5A0;
  --text-3:         #78746C;

  --accent:         #FB2343;
  --accent-deep:    #D4102E;
  --accent-soft:    rgba(251, 35, 67, 0.12);

  --green:          #4FC98A;
  --green-soft:     rgba(79, 201, 138, 0.14);
  --blue:           #6FA8DC;
  --blue-soft:      rgba(111, 168, 220, 0.14);
  --amber:          #E0A93F;
  --amber-soft:     rgba(224, 169, 63, 0.14);
  --champagne:      #E0A93F;
  --champagne-soft: rgba(224, 169, 63, 0.12);
  --red:            #FB2343;
  --red-soft:       rgba(251, 35, 67, 0.12);

  --shadow:    0 10px 34px rgba(0,0,0,0.55);   /* מודאלים בלבד */
  --shadow-sm: none;
  --shadow-lg: 0 18px 50px rgba(0,0,0,0.7);
  --grid:      #2E2C31;

  --logo-grad: none;
}
```

### LIGHT · bone

```css
[data-theme="light"] {
  --bg:             #F3F0EA;
  --bg-sidebar:     #EAE6DE;
  --surface:        #EAE6DE;
  --surface-2:      #DEDAD1;
  --surface-hover:  #DCD6CA;

  --border:         #D5CFC3;
  --border-soft:    #E2DDD3;
  --border-control: #8C857A;   /* פונקציונלי — 3.2:1 */

  --text:           #121113;
  --text-2:         #4A4842;
  --text-3:         #78746C;

  --accent:         #E8102F;
  --accent-deep:    #B80B24;
  --accent-soft:    rgba(232, 16, 47, 0.10);

  --green:          #1B6E45;
  --green-soft:     rgba(27, 110, 69, 0.12);
  --blue:           #2F5F8F;
  --blue-soft:      rgba(47, 95, 143, 0.12);
  --amber:          #8A5E00;
  --amber-soft:     rgba(138, 94, 0, 0.12);
  --champagne:      #8A5E00;
  --champagne-soft: rgba(138, 94, 0, 0.12);
  --red:            #E8102F;
  --red-soft:       rgba(232, 16, 47, 0.10);

  --shadow:    0 10px 30px rgba(18,17,19,0.10);
  --shadow-sm: none;
  --shadow-lg: 0 18px 44px rgba(18,17,19,0.16);
  --grid:      #D5CFC3;

  --logo-grad: none;
}
```

הוסף לשני הבלוקים, בתוך ה-aliases:

```css
  --border-strong:  var(--border-control);
  --on-accent:      var(--bg);
```

**שים לב:** `--border-strong` היה ממופה ל-`--border`. עכשיו הוא מצביע ל-`--control`, כי כל מי שהשתמש בו התכוון לגבול פונקציונלי.

---

## קומיט 3 — פונטים · `index.html`

```html
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Bodoni+Moda:ital,opsz@1,6..96&display=swap" rel="stylesheet" />
```

הסר את Manrope, Fraunces ו-JetBrains Mono מה-link הקיים.

ב-`src/index.css` — חפש כל מקום שמגביל משקלים ל-500/600/700 בדיספליי ואפשר 800/900.

---

## קומיט 4 — מסכי המוצר (ink)

סדר: **הקלים קודם**, כדי שפערי טוקנים יצופו מוקדם. Dashboard אחרון.

`Login` → `Settings` → `Brands` → `Connect` → `Audit` → `DemoDashboard` → `MetaCallback` → `ShopifyCallback` → `Intelligence` → `Campaigns` → `CampaignWorkshop` → `CreativeStudio` → `Dashboard`

בכל מסך:

- החלף hex קשיח בטוקן. אם אין טוקן מתאים — **עצור ושאל**, אל תמציא.
- רדיוס → `var(--radius)`. הסר `box-shadow` מכרטיסים; השאר `--surface` + גבול 1px.
- המספר הראשי של המסך → `var(--font-display)`, 72px+, משקל 900.
- גבולות אינפוטים וטבעות פוקוס → `var(--border-control)`.
- **מסך Intelligence:** כשRouge מצטטת מספר בצ'אט, המספר ב-`--font-mono`. ההודעות שלה לא מקבלות בועה מעוגלת — קו שמאלי ב-`--accent` ורקע `--surface`.
- **CreativeStudio ו-CampaignWorkshop:** הוסף מתחת לכל טיוטת קופי שורת מקור —
  `"Derived from: <N> top performers in this account · 9-year beauty benchmark"`.
  אם אין דאטה אמיתית למקור — אל תמציא, הסתר את השורה.

### צ'ארטים

- סדרות, לפי הסדר: (1) spend = `--text-2`, (2) conversions / leads / purchases = `--green`, (3) impressions / reach = `--blue`, (4) frequency / audience = `--purple`, (5) = `--champagne`. benchmark = `--text-3` מקווקו. מקסימום 4 סדרות בצ'ארט אחד.
- אדום (`--accent`) אינו משבצת בפלטה אלא שכבת מצב: סדרה מקבלת אותו רק כשהיא מסומנת (Half-Life / דעיכה / מתחת לסף). המיקום ברשימה לעולם לא קובע אדום. spend לא מקבל אדום — לא בקו, לא ב-legend ולא בסכום.
- `grid` ← `var(--grid)`. עובי קו **2.5px** (היה 1.5 — נעלם על ink). מילוי עמודות 85% עם stroke ב-`--border-control`.
- **אל תיגע** במנגנון destroy+recreate בהחלפת theme. הוא נכון.

---

## קומיט 5 — אונבורדינג · `src/pages/Onboarding.tsx`

**קודם מסדרים מחדש, אחר כך מעצבים.** הסדר מחדש הוא החצי שמשנה המרה — כל שדה מעבר לארבעה מוריד השלמה בערך בחצי.

היום: Brand Basics → Business Type → Business Details → Account Stage, **כל זה לפני שהמשתמש רואה מספר אחד**.

החדש — שלושה שלבים:

**שלב 1 · Connect.** כפתור אחד לחיבור Meta. כלום אחר על המסך.

**שלב 2 · "Here's what we found."** Rouge קוראת את החשבון ומציגה: שם המותג, ניחוש קטגוריה, שווקים, הוצאה, וקריאת Half-Life ראשונה — **מולאו מראש וניתנים לעריכה**. המשתמש מתקן, לא מחבר. זו נקודת ההפעלה והיא צריכה להגיע תוך שתי דקות.

**שלב 3 · Business type.** השאלה היחידה שבאמת אי אפשר להסיק — ecommerce / clinic / spa, כי היא קובעת אילו KPI רלוונטיים. שלושה כרטיסים גדולים, קליק אחד.

**כל השאר** (AOV, שלב חשבון, פרוטוקול חימום, שווקים ידניים) עובר ל-Settings ונשאל בהקשר כשהוא באמת נדרש. אלה שאלות של חודש שני.

השאר את פס ההתקדמות ורשימת השלבים — הם מקטינים אורך נתפס. עכשיו הם סופרים ל-3.

אם חיבור Meta נכשל או מוחזר ריק — fallback לטופס הידני הקיים. **אל תמחק את הקוד הקיים, השאר אותו כמסלול חלופי.**

---

## קומיט 6 — דף מכירה ותמחור (bone)

`Landing.tsx` ו-`Pricing.tsx` עוברים ל-`data-theme="light"` כרקע קבוע.

מבנה הלנדינג, לפי הסדר:

1. **הירו — single-stat.** `19 DAYS` ב-240px+, Archivo 900, המספר ב-`--accent` והמילה ב-`--text`. תת-שורה: `then it's` + `dead weight.` ב-`--font-accent` איטליק. **CTA אחד: "Get started".** בלי וידאו אוטומטי, בלי סטוק, בלי CTA שני.
2. **פס הוכחה.** מיד מתחת להירו. שלושה מספרים ב-`--font-mono` על `--surface-2`: שנות דאטה, מספר חשבונות, נפח הוצאה. **מספרים אמיתיים בלבד** — אם אין, השאר empty state.
3. **הבעיה.** ארבע סיבות המוות כארבעה כרטיסים.
4. **מה Rouge עושה.** חמש היכולות, שורה כל אחת, עם צילום ממשק אמיתי — לא איור.
5. **הגבול.** "Rouge writes the words. Your brand owns the picture."
6. **תמחור.** 30 יום כסף בחזרה כתקופת ניסיון. השוואה מול שכירה של 55-70K€, לא מול כלי אחר.
7. **CTA דביק.** מופיע אחרי שההירו נגלל. כפתור אחד.

**הערה:** המחקר מצא ש-"Start free trial" מנצח את "Get started" ב-9% — אבל רק כשיש trial חסר חיכוך. אין לך. **ה-CTA נשאר "Get started".**

---

## אימות — לפני כל קומיט

```bash
npx tsc -b --noEmit
npm run build
```

ואז ידנית, **בשני המצבים**:

```bash
# מצב פתיחה: 564 hex קשיחים ב-tsx. זה לא יירד לאפס בהגירה הזאת
# ואסור לנסות — זה גורר ריפקטור של 16 מסכים. המדד הוא ירידה, לא אפס.
grep -rcE "#[0-9A-Fa-f]{6}" src --include=*.tsx | awk -F: '{s+=$2} END {print "hardcoded hex:",s,"(baseline 564 — must go down, not up)"}'

# אלה כן חייבים לחזור ריק — צבעי המותג הישן
grep -rniE "E3A88E|C97B5E|BC6A48|9E5436|F7F3EE|0B0B0D|Manrope|JetBrains|Fraunces|Playfair" src index.html | grep -v "legacy aliases"
```

הראשון הוא מד התקדמות — כל מסך שאתה עובר אמור להוריד אותו. השני הוא שער: אם חוזר משהו, הצבע או הפונט הישן שרד.

בדיקות עין:

- כל מסך ב-dark **וב-light**. ה-light הוא שישבר.
- אין טקסט אדום מתחת ל-24px (אלא אם 700 ב-18.5px+).
- אין `box-shadow` על כרטיסים.
- אינפוטים עם `--border-control`, לא `--border`.
- צ'ארטים: החלף theme וּודא שהצבעים מתעדכנים.

---

## אסור לגעת

- `nextadsgen_active_brand_id` ו-`nextadsgen_active_account` ב-`BrandContext.tsx` / `ActiveAccountContext.tsx` — שינוי מנתק כל משתמש מהמותג והחשבון הפעילים.
- בלוק ה-aliases ב-`theme.css` — repoint לבסיס, לא למחוק.
- `:root` נשאר dark. Light הוא override.
- מנגנון destroy+recreate של הצ'ארטים.
- כללי מוצר: CTA "Get started", 30 יום כסף בחזרה, בלי נתונים מומצאים.

---

## סיום

קומיט נפרד לכל שלב, הודעות באנגלית, ואז:

```bash
git push -u origin redesign/rouge-v3
gh pr create --fill --base main
```

**אל תמזג.** תן לי את הקישור ל-PR, ודווח על: כל מקום שנדרשת בו החלטה שלא כתובה כאן, וכל טוקן שחסר.
