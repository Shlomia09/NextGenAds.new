# פרומט ל-Claude Code — עדכון ה-Hero בדף הנחיתה (Wall of Creatives + Cursor Spotlight)

> **הערה לפני שמתחילים:** בדקתי את `design-system.md` שהעלית לשיחה הזו והוא מגיע רק
> עד סעיף 45 (חלק ט', No Fake Data) — אין בו את חלק י"ב (56-58, מודל עסקי) שכבר
> קיים אצלכם לפי סשן קודם. כנראה הקובץ שהועלה כאן הוא לא הגרסה החיה העדכנית
> ביותר. **אל תדביק את התוספת למטה על גבי קובץ ישן** — תוודא קודם שאתה עובד על
> ה-`Docs/nextadsgen-design-system.md` האמיתי בריפו, ואז תוסיף את סעיף 59 בסוף
> חלק י"ב (אחרי 58).

---

## שלב 0 — קבצים שצריך בריפו לפני ההרצה

```
Docs/
├── nextadsgen-design-system.md          ← הקובץ החי האמיתי (לא זה שהעליתי)
├── nextadsgen-landing-cinematic-v2.html ← המימוש הקיים (יש כבר ב-production)
└── nextadsgen-landing-home-v3.html      ← הרפרנס החדש (מצורף) — hero בלבד השתנה
public/assets/hero-wall.png              ← התמונה (מצורפת) — להעתיק לתיקיית האסטים שלכם
```

---

## תוספת ל-design-system.md — חלק י"ב, סעיף 59 (להדביק אחרי 58)

```
## 59. Landing Hero — Wall of Creatives + Cursor Spotlight

רפרנס חי: Docs/nextadsgen-landing-home-v3.html

הרעיון: קיר mood-board צפוף של קריאטיבים (בקבוקי סרום, קלוז-אפים, קלטת פולארויד),
כהה מאוד במנוחה, שהעכבר "מאיר" עליו כמו פנס. לא לייזר, לא beam — spotlight רך.

מבנה שכבות (מהתחתונה לעליונה):
1. .wall — תמונת הרקע (hero-wall.png), scale(1.06), filter: brightness(0.46)
   saturate(0.9) כברירת מחדל. כהה מאוד במנוחה — זה בכוונה.
2. .grain — טקסטורת film grain עדינה (SVG feTurbulence), opacity .05,
   mix-blend-mode: overlay.
3. .vignette — radial-gradient שמכהה משמעותית את מרכז הטקסט (עד ~0.82 opacity
   באמצע) כדי שהכותרת תישאר קריאה מעל תמונה עמוסה. נחלש קלות בגלילה (§ גלילה למטה).
4. .spotlight — עוקב אחרי העכבר עם lag/easing (לא נדבק 1:1): עדכון מיקום ב-
   requestAnimationFrame, lerp factor 0.14. קוטר 460px, radial-gradient רך עם
   blur(22px) כבד (זה קריטי — בלי blur חזק זה נראה כמו "בלוב" זוהר בולט במקום
   אור עמום). mix-blend-mode: screen. שקיפות מקסימלית באמצע רק ~0.36 (נמוך
   בכוונה — "פנס קלאסי עמום", לא זרקור, לא כדור אור). דועך (opacity 0) כשהעכבר
   עוזב את אזור ה-hero.
5. Hotspots — 6 נקודות דאטה קבועות על הקיר. מופעלות כשה-spotlight (לא העכבר
   הגולמי) בטווח ~95px מהמרכז שלהן. בועת glass עולה עם מטריקה (CTR/CPC/ROAS/CPM/CVR).

גלילה (לא scroll-jack, לא beam על מסלול): ה-hero נשאר sticky ל-100vh בתוך wrapper
של 300vh. בזמן הגלילה: .wall עושה zoom איטי (scale 1.06→1.16), וה-.vignette
נחלש בעדינות (opacity ×(1-progress×0.4)) — "התעוררות" הדרגתית, לא אפקט דרמטי.

מובייל/מגע (אין עכבר) — fallback חובה:
- זיהוי: matchMedia('(hover: hover) and (pointer: fine)').
- אם false: spotlight מקבל class .ambient — זוהר קבוע במרכז עם נשימה עדינה
  (opacity .4, קנה מידה 1↔1.12 בלופ של 6s). ה-hotspots נפתחות בהקשה (tap
  מחליף active, לא hover).
- prefers-reduced-motion: לבטל את אנימציית ה-ambient breathe ואת ה-transition
  על ה-spotlight; שאר האנימציות (fade-in של טקסט) נשארות סטטיות (opacity:1 מיידי).

[PLACEHOLDER] — לפי חלק ט' (§41-45), הנתונים בבועות ה-hotspot (CTR 4.8%,
CPC €2.10, ROAS 3.4×, CPM €35, CVR 2.1%, CTR 5.6%) הם דוגמאות בלבד. לפני עלייה
לאוויר: לחבר לדאטה אמיתי לפי קריאטיב (Meta API / Supabase), או להשמיט hotspot
במקום שאין לו דאטה אמיתי — אף פעם לא להשאיר מספר בדוי.

טוקנים בשימוש: --accent, --accent-soft, --border, --bg, --text-2, --font-mono —
בלי hex חדשים. שם הצבע "רוז-גולד" בקוד = var(--accent), לא #E3A88E מחורז ידנית.
```

---

## הפרומט עצמו — להדביק ל-Claude Code

```
קרא את Docs/nextadsgen-design-system.md חלק י"ב סעיף 59 (Landing Hero — Wall of
Creatives + Cursor Spotlight) וגם את הרפרנס החי Docs/nextadsgen-landing-home-v3.html.
עדכן את ה-hero הקיים ב-Docs/nextadsgen-landing-cinematic-v2.html (או היכן שהוא
מיושם ב-production) לפי הרפרנס החדש. זה שינוי ל-hero בלבד — כל שאר הדף (stats band,
features grid, how-it-works, CTA סופי, footer) נשאר בדיוק כמו שהוא, לא לגעת.

חוק-על — מודל עסקי (חלק י"ב, אם קיים אצלכם עד סעיף 58 — לא לסטות):
- CTA תמיד "Get started", לעולם לא "Start free"/"Try free".
- אם יש שורת guarantee קיימת ליד ה-CTA הראשי — להשאיר אותה בדיוק כמו שהיא,
  אל תמחק ואל תשנה מספר ימים.

מה משתנה בפועל:
1. התמונה: public/assets/hero-wall.png (מצורף) — קובץ אמיתי, לא base64. ברפרנס
   שצירפתי היא מוטמעת כ-base64 רק כדי שיהיה קובץ HTML עצמאי לבדיקה — בפרודקשן
   תמיד לטעון אותה כ-asset רגיל (img/next-image/CSS url() לנתיב אמיתי), בלי
   base64 בקוד. אם יש לכם pipeline לאופטימיזציית תמונות (next/image וכו') —
   תשתמשו בו, כולל WebP/AVIF fallback אם רלוונטי.
2. מחליפים את ה-.hero-glow (הזוהר הרוז-גולד הפשוט הקיים) בשכבות מסעיף 59:
   wall + grain + vignette + spotlight + hotspots. כל הפרמטרים המדויקים (גדלים,
   שקיפויות, מהירויות) מפורטים שם — אל תמציא ערכים משלך.
3. שומרים את כל תוכן ה-hero הקיים (badge, h1, p, hero-actions, hero-preview עם
   ה-KPIs וה-chart, scroll-hint) בדיוק כמו שהוא — הוא רק יושב עכשיו מעל השכבות
   החדשות במקום מעל ה-glow הישן.
4. הוסיפו hover/touch detection ו-reduced-motion fallback בדיוק לפי סעיף 59 —
   זה לא אופציונלי, יש משתמשים בלי עכבר ומשתמשים שביקשו פחות אנימציה.

בדיקה לפני שמסמנים כגמור:
- [ ] הטקסט קריא בכל מקום בגלילה (ה-vignette חייב להספיק, גם עם הזום שקורה בגלילה)
- [ ] ה-spotlight לא "שוטף" את כל המסך — זה פנס ממוקד, לא זרקור
- [ ] hotspots לא מתנגשים ויזואלית עם hero-preview הרחב — אם כן, תזיז אותם
      (המיקומים בסעיף 59 הם ניחוש שלי לפי % קבוע, לא נבדקו על viewport אמיתי)
- [ ] מובייל: fallback עובד (glow אמביינטי + tap), לא קורס
- [ ] prefers-reduced-motion: נבדק
- [ ] כל hotspot מסומן [PLACEHOLDER] בקוד או מחובר לדאטה אמיתי — לא נתון בדוי בלי הערה
- [ ] אין hex חדש בקוד — רק var(--accent) וכו'

אם משהו לא ברור (מיקום hotspots, גודל התמונה בפועל, קונפליקט עם hero-preview) —
עצור ושאל, אל תנחש.
```

---

## הערות

- **התמונה** (`hero-wall.png`, ~9MB) — כדאי לדחוס/להמיר ל-WebP לפני production,
  9MB זה כבד מדי לטעינת hero. זה לא משהו ש-Claude Code צריך להחליט לבד — תגידו לו
  איזה pipeline דחיסה יש לכם, או שאני אכין גרסה דחוסה יותר אם תרצה.
- **hotspots** — המיקומים (% קבועים) הם ניחוש שלי בלי לראות רינדור אמיתי מול
  ה-hero-preview הרחב. תכף שתראה את זה חי, תגיד לי אילו לזוז ואני אעדכן את הרפרנס.
