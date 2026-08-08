# Handoff: Wire "Approve & Execute" to the real backend

## הקשר (אין צורך לגעת — כבר פרוס וחי ב-Supabase)

ב-Supabase project `nplbghydqjapkycoiucl` (NextGenAds.new) כבר פרוס ופעיל:
- Migration שהוסיפה: `recommendations.campaign_id`, `recommendations.action_type`,
  `recommendations.auto_executable`, וכן `action_logs.campaign_id`,
  `action_logs.recommendation_id`, `action_logs.baseline_snapshot`,
  `action_logs.monitor_at`, `action_logs.monitoring_result`, `action_logs.monitoring_status`.
- Edge Function `execute-recommendation` (v2) — מקבלת `{ recommendation_id }`,
  מוודאת בעלות, שומרת baseline snapshot, קוראת ל-`meta-action` הקיימת, מתזמנת
  בדיקת תוצאה בעוד 48 שעות.
- Edge Function `check-recommendation-outcomes` — רצה על cron שעתי (pg_cron),
  משווה roas/cpl מול ה-baseline וקובעת verdict.
- `generate-recommendations` (v68) עודכנה: שומרת `action_type` בפועל (לא רק
  `action` הטקסטואלי), מקשרת `campaign_id` לפי התאמת שם קמפיין, וקובעת
  `auto_executable = true` רק אם action_type הוא אחד מ-
  `pause_campaign|scale_budget|activate_campaign` **וגם** יש campaign_id מקושר.

**כל ה-Backend הזה חי ועובד. המשימה כאן היא רק ה-Frontend.**

## המשימה: 3 שינויים ממוקדים, אל תיגע בשום דבר אחר

### 1. `src/types/index.ts` — הוסף שדות ל-interface Recommendation

הוסף (אל תמחק שדות קיימים):
```typescript
campaign_id?: string | null;
action_type?: string | null;
auto_executable?: boolean;
```

### 2. `src/lib/supabase.ts` — הוסף פונקציה חדשה

אחרי `updateRecommendationStatus` (או בכל מקום מתאים בקובץ), הוסף:

```typescript
// קוראת ל-execute-recommendation Edge Function: שומרת baseline snapshot,
// מבצעת את הפעולה בפועל ב-Meta דרך meta-action, ומתזמנת בדיקת תוצאה בעוד 48 שעות.
// עובדת רק על recommendations עם auto_executable=true.
export const executeRecommendation = async (id: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${supabaseUrl}/functions/v1/execute-recommendation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ recommendation_id: id }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Execution failed');
  return data;
};
```

(`supabaseUrl` ו-`supabaseAnonKey` כבר מוגדרים בראש הקובץ הזה — תשתמש בהם, אל תייבא מחדש.)

### 3. `src/pages/Dashboard.tsx` — חבר את הכפתור בפועל

**חשוב: הקובץ הזה כבר עבר שינויים אצלך (computeHealth, TrendChart, account stats).
בדוק את המבנה הנוכחי בפועל לפני שאתה נוגע — אל תניח שהוא זהה למה שמתואר כאן.**

הכוונה (intent), תתאים למבנה הקיים בפועל:

**א. import:**
הוסף `executeRecommendation` ל-import הקיים מ-`../lib/supabase`.

**ב. Mutation חדשה** (ליד `updateRecMutation` הקיימת, אם היא עדיין שם):
```typescript
const executeRecMutation = useMutation({
  mutationFn: (id: string) => executeRecommendation(id),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
  onError: (err: Error) => alert(`Execution failed: ${err.message}`),
});
```

**ג. באזור שמרנדר recommendations ("Needs your attention" / דומה) —**
כל recommendation שיש לה כפתור "Apply"/"Execute" צריכה:
- אם `rec.auto_executable === true` → כפתור שקורא ל-`executeRecMutation.mutate(rec.id)`,
  עם label "Approve & Execute" ומצב disabled/"Executing…" בזמן `executeRecMutation.isPending`.
- אם `rec.auto_executable !== true` → **לא** כפתור פעולה, אלא badge/טקסט:
  "Manual action needed" (+ אפשר להציג `rec.action_type` אם קיים) — כי אין מימוש
  אוטומטי לפעולות כמו refresh_creative / audit_audience / optimize_bidding / structural_fix.

## איך לבדוק שזה עבד

1. `npx tsc -b` — צריך לעבור בלי שגיאות.
2. תריץ את האפליקציה, תלחץ "Approve & Execute" על recommendation עם
   auto_executable=true, ותוודא שמופיעה הודעת שגיאה ברורה אם משהו נכשל
   (לא נופל בשקט).
3. אחרי לחיצה מוצלחת — בדוק ב-Supabase שנוצרה שורה חדשה ב-`action_logs`
   עם `status='confirmed'` ו-`baseline_snapshot` מלא.

## מגבלות מפורשות

- אל תיגע ב-BillingTab, UpgradeModal, או קבצים אחרים.
- אל תשנה את חלק ה-computeHealth/TrendChart/account stats הקיים ב-Dashboard.tsx.
- אל תעשה git push בעצמך — Shlomi יבדוק ויעלה בעצמו.
