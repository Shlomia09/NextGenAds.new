# Rouge — מפרט לנדינג ותמחור (קומיט 6) · גרסה 2

רקע Bone. ‏`src/pages/Landing.tsx` ו-`src/pages/Pricing.tsx`.
זה המסמך היחיד שקובע את מבנה העמוד ואת הקופי. ‏`CLAUDE.md` קובע את הטוקנים.

**מה השתנה מגרסה 1:** ההירו לא נשען יותר על מספר קבוע. ‏"19 ימים" ו-"יום 4"
ירדו לגמרי. הסיבה בסעיף הבא, והיא לא טכנית — היא מיצובית.

---

## הכלל שמעל הכל — אין מספר בלי מקור

העמוד הזה לא טוען שום טענה מספרית שלקוח יכול להפריך מול החשבון שלו.

**למה "19 ימים" ירד:** חיי קריאייטיב משתנים לפי מותג, לפי AOV, לפי שוק
ולפי סוג קריאייטיב. מנהל פרפורמנס שיראה בחשבון שלו קריאייטיב שרץ 40 יום
יגיד "לא נכון אצלי" — וצדק. טענה שאפשר להפריך בשלושים שניות הורגת את
האמון בכל שאר העמוד.

**וזה דווקא מחזק את העמדה.** אם חיי הקריאייטיב היו קבועים, לא היה צורך
ב-Rouge — תזכורת ביומן הייתה מספיקה. הם משתנים, **ובדיוק בגלל זה צריך
משהו שצופה בכל קריאייטיב בחשבון שלך בנפרד.** זו התזה, לא התנצלות.

**המספר הדרמטי עובר מהשיווק למוצר.** הלנדינג שואל את השאלה. הדמו עונה
עליה עם המספר של הלקוח. מספר משלו הוא לא יכול להתווכח איתו.

שלושת המספרים היחידים שמותר להם להופיע בעמוד, וכולם מאומתים:

| מספר | איפה | מקור |
|---|---|---|
| **20,000+** קמפיינים | פס ההוכחה | הדאטהסט |
| **2018** תחילת הדאטה | פס ההוכחה | הדאטהסט |
| **מחירי התוכניות** | סעיף 7 | `src/hooks/usePlan.ts` בלבד |

כל מספר אחר — לא נכנס.

---

## הכללים הויזואליים

- **רקע:** ‏`--bg` במצב light (‏`#F3F0EA` ‏Bone). הלנדינג תמיד light.
  אם יש משתנים מקומיים שמכריחים כהה — להסיר.
- **אין שקיפויות, הילות, גרדיאנטים או צללים.** פלאט.
- **אדום** לפי הכלל ב-`CLAUDE.md`: מילוי בכל גודל, טקסט רק מ-24px או
  כמילת אקסנט. לכל סקשן לכל היותר אדום אחד שאינו סטטוס.
- **טיפוגרפיה:** ‏`--font-display` (Archivo) 800–900 לכותרות,
  ‏`--font-ui` לגוף, ‏`--font-mono` לכל מספר,
  ‏`--font-accent` (Bodoni Moda italic) למילת האקסנט בלבד.
- **הסולם:** ‏`--t-display` לכותרת ההירו — זה המקום שחיפשנו לטוקן הזה.
  ‏`--t-h1` לכותרות סקשן, ‏`--t-h3` לכותרות כרטיס, ‏`--t-metric` למספרים.
- **אסור hex קשיח.** רק טוקנים.
- **למחוק את ההגדרה המקומית של `.btn-primary`** ב-Landing וב-Pricing.
  הגלובלי הוא מילוי ומספיק.

---

## מבנה — שבעה סקשנים

### 1 · הירו

```
EYEBROW (--t-label, --track-label, --text-2)
BEAUTY CAMPAIGN INTELLIGENCE

H1 (--t-display, Archivo 900, --track-display, --lh-display)
How many good days
does this ad have left?

SUB (--t-h3 במשקל 400, --text-2, max-width 54ch)
Nobody can tell you that from outside your account. Rouge reads yours
every morning, names the creative that's dying, and tells you why —
frequency, hook-rate, CPM, or landing page.
All four look identical on a ROAS chart.

CTA ראשי   Get started          (.btn-primary, מילוי)
CTA משני   See how it works     (מסגרת --border-control, טקסט --text)

שורה קטנה מתחת (--t-label, --text-3):
30-day money-back guarantee · No setup fee
```

**מילת האקסנט: `left`** — ‏`--font-accent` באיטליק, ‏`--accent`.
זה האדום היחיד בסקשן חוץ מכפתור ה-CTA.

**ויזואל ההירו:** בלי תמונות סטוק של פנים. אם יש היום רקע כזה — להסיר.
במקומו: ארבעה קווי דעיכה שטוחים באורכים שונים, כל אחד נגמר בנקודה אחרת,
בצבע `--text-3`. אחד מהם ב-`--accent` עם נקודה. התווית מתחת:
`Four creatives. One account. Four different lifespans.`
זה הויזואל שמוכיח את הטענה במקום לטעון אותה.
אם אין זמן לבנות אותו — להשאיר את ההירו טיפוגרפי נקי. לא להמציא תחליף.

---

### 2 · פס ההוכחה

רצועה דקה מתחת להירו. רקע `--surface`.
המספרים `--font-mono`, ‏`--t-metric`, ‏`--text`.
התוויות `--t-label`, ‏`--text-2`. **בלי אדום.**

```
20,000+    Beauty campaigns analysed
2018       First campaign in the dataset
1          Vertical. Nothing else.
```

---

### 3 · הבעיה

```
EYEBROW   THE PROBLEM

H2 (--t-h1)
There is no
calendar for this.

גוף (--t-h3 במשקל 400, --text-2, max-width 56ch)
A creative stops being profitable long before the ROAS chart admits it.
Frequency climbs, hook-rate drops, CPM drifts, the landing page stalls —
and all four look the same on the chart you're watching.

How long it takes is different for every brand, every price point,
every market. That's exactly why it can't be scheduled, and exactly
why something has to be watching each one.

By the time the number moves, the budget is already spent.
```

**ויזואל:** אותם קווי דעיכה מההירו, מוגדלים, עם ציר ימים.
בלי לנקוב במספר על הציר — הציר מסומן `WEEK 1 / 2 / 3 / 4` ולא בימים.

---

### 4 · מה זה עושה

חמישה כרטיסים. רקע `--surface`, גבול `--border`, בלי צל, radius 3px.
מספור `--font-mono`, ‏`--text-3`. כותרות `--t-h3` Archivo 700.
גוף `--t-body`, `--text-2`. **בלי אדום על הכרטיסים.**

```
EYEBROW   WHAT IT DOES

H2 (--t-h1)
An operator,
not an advisor.

01 · Watches
It names the cause of death — not just that the number dropped.
Frequency, hook-rate, CPM, or landing page. Each needs a different fix.

02 · Runs it
Pausing, pacing, reallocation and audience tests run on their own,
inside the ceiling you set. Anything that spends more waits for you.

03 · Builds
New campaigns constructed with you. Structure, objective,
audience, budget — from what already worked in your account.

04 · Writes the copy
Pulled from the ads that already won in your account.
Never from thin air.

05 · Your tool. Your credits.
Visuals run on the creative account you connect, on your credits,
at your request. We never resell you pixels.
```

---

### 5 · איך זה עובד — מנגנון האמון

הסקשן שמוכר למנהל פרפורמנס שחושש שמערכת תיגע לו בתקציב.

```
EYEBROW   HOW IT WORKS

H2 (--t-h1)
It runs the account.
You set the ceiling.

שתי עמודות. כותרות --t-label + --track-label.

RUNS ON ITS OWN
Pauses creatives below break-even.
Moves budget between ads inside a campaign.
Tests audiences within the budget you set.
Kills what's dying before it drains the week.

ASKS YOU FIRST
Raising the budget.
Launching a new campaign.
Scaling past your ceiling.
Anything that spends more than yesterday.

שורת סיכום מתחת (--t-h3, max-width 48ch):
Rouge can move your money. It can't spend more of it without you.
Every action is watched for 48 hours after it runs.
```

**מילת האקסנט: "more"** — `--font-accent` איטליק, `--accent`.
זה האדום היחיד בסקשן. התווית ASKS YOU FIRST לא אדומה.

---

### 6 · מה זה לא — בטיחות מותג

```
EYEBROW   BRAND SAFETY

H2 (--t-h1)
Your brand book
stays yours.

גוף (--t-h3 במשקל 400, --text-2, max-width 56ch)
Rouge doesn't generate your creative and doesn't make art-direction
calls. Your visuals are your brand's — built by the people you pay
to build them.

What Rouge does is make them perform: it tells you which one is dying
and why, drafts copy from the structures that already won in your
account, and — if you connect your own creative tool — runs it on
your credits, at your request.

Inside beauty accounts since 2018. Your brand book untouched.
```

**בלי אדום בכלל בסקשן הזה.** זה סקשן של הרגעה.

---

### 7 · תמחור ו-CTA

```
EYEBROW   PRICING

H2 (--t-h1)
Cheaper than
the hire.

SUB (--t-h3 במשקל 400, --text-2)
A performance manager who knows beauty costs €55,000–70,000 a year,
and still can't read the whole dataset while they sleep.
```

**המחירים והתוכניות מ-`src/hooks/usePlan.ts` בלבד.** אל תמציא ואל תשנה.
אם מחיר במפרט סותר את הקוד — הקוד קובע, ולדווח על הסתירה.

כרטיס תוכנית: שם, מחיר ב-`--font-mono` + `--t-metric`, תקופה, מה כלול,
כפתור. התוכנית המומלצת: גבול `--accent` 1px + תווית קטנה במילוי `--accent`.
**זה האדום היחיד בסקשן.**

מתחת:
```
30-day money-back guarantee. If Rouge doesn't find what your
reporting missed, you don't pay for the month.
```

CTA סוגר: `Get started` (`.btn-primary`).

**CTA תמיד "Get started". אף פעם לא "Start free" / "Try free".
30 יום כסף בחזרה — לא 60, לא טווח.**

---

## פוטר

`RougeLogo`, השורה `Beauty campaign intelligence`, ‏`askrouge.com`.
קישורים: Pricing, Login, Privacy, Terms. בלי אדום.

---

## אימות לפני הקומיט

```
# אין hex קשיח
grep -nE "#[0-9A-Fa-f]{6}" src/pages/Landing.tsx src/pages/Pricing.tsx
  → ריק

# אין מספר שאי אפשר לאמת
grep -nE "[0-9]+ days?|19|day 4|847|9 years" src/pages/Landing.tsx src/pages/Pricing.tsx
  → רק 20,000 / 2018 / מחירים / 30-day / 48 hours / €55,000–70,000

# CTA ושפה
grep -n "Start free\|Try free\|free trial" src/pages/Landing.tsx src/pages/Pricing.tsx
  → ריק
grep -n "NextAdsGen\|NextGenAds\|Intelligence Engine" src/pages/Landing.tsx src/pages/Pricing.tsx
  → ריק
grep -n "Manrope\|Fraunces\|JetBrains\|Playfair\|Outfit\|DM Mono" src/pages/Landing.tsx src/pages/Pricing.tsx
  → ריק

npx tsc --noEmit && npm run build
```

בדפדפן:
- רקע Bone בשני העמודים, בלי קשר למצב התצוגה של המערכת.
- לספור אדומים לכל סקשן ולדווח. לכל היותר אחד שאינו סטטוס.
- ברוחב 390px: אין גלישה אופקית, ה-H1 לא נשבר באמצע מילה,
  הכפתורים לא נחתכים.
- ה-H1 ב-Archivo 900 ולא בפונט ברירת מחדל.

---

## הודעת הקומיט

```
landing(bone): rebuild landing and pricing on the bone ground

- seven-section structure: question, proof, problem, capability,
  trust mechanism, brand safety, pricing
- hero asks the half-life question instead of asserting a fixed figure
  that varies per account and invites refutation
- only verifiable numbers on the page: 20K+ campaigns, since 2018, prices
- removes local .btn-primary overrides in favour of the global fill
- all colour via tokens; flat throughout
```
