---
title: "אסימוני API"
description: "אסימונים מוגבלים לסקריפטים, למחברים ולאוטומציה — גישה של מכונה בלי למסור את הסיסמה."
category: "system"
keywords: "אסימון, אסימונים, API, סקריפט, אוטומציה"
version: "0.7.0"
order: 60
stale: false
---

# אסימוני API

אסימוני API הם צד המכונה של האימות: credentials ארוכי-חיים מסוג bearer
לסקריפטים, לאקוסיסטם של ה־connectors ולצנרת CI. הם חיים לצד sessions של
דפדפן — שניהם מתחברים לאותו מודל הרשאות — וחשבונות מקומיים נשארים
גיבוי הכניסה.

אסימון קשור למשתמש שלך ומוגבל לתת-קבוצה של ההרשאות שלך. **אסימון לעולם לא
יכול לעשות יותר ממה שאתה יכול**: בכל בקשה ההרשאות שלו מחותכות עם הרשאות
התפקיד, וה־changelog מתעד פעילות אסימון תחת `token:<name>`.

## יצירת אסימון

הגדרות ← אבטחה ← **אסימוני API** ← *אסימון חדש*. בחר שם, הרשאה אחת או יותר,
ואורך חיים בימים (אופציונלי).

האסימון (`ipam_<43 תווים אקראיים>`) מוצג **פעם אחת** — העתק אותו לפני
סגירת הדיאלוג. בשרת נשמר רק ה־SHA-256 שלו; אם איבדת אותו, בטל וצור חדש.

| הרשאה | מאפשרת |
|---|---|
| `data:read` | קריאת אובייקטים — הרצפה שכל `GET` צריך |
| `data:write` | יצירה ועדכון של אובייקטים |
| `data:delete` | מחיקת אובייקטים |
| `backup:access` | ייצוא ושחזור גיבויים |
| `config:read` | קריאת טקסט הגדרות שמור (גרסה, diff) — סודות מוסתרים |

הרשאות שמיועדות למנהלים בלבד (`users:manage`, `system:admin`) אף פעם לא
יכולות להיות הרשאות אסימון — credential של מכונה לא מנהל חשבונות.

## שימוש

```bash
curl -H "Authorization: Bearer ipam_a1b2…" \
     https://ipam.example.com/api/v1/devices
```

כשבקשה נושאת גם cookie של session וגם bearer token, **האסימון מנצח** —
סקריפט לעולם לא מוצל על ידי cookie דפדפן ישן. אסימון בלי `data:read`
נדחה ב־endpoints של `GET`; אסימון בלי `data:write` מקבל `403` על מוטציות.

אסימונים לא יכולים לנהל אסימונים: יצירה, רשימה או ביטול של אסימון עם
bearer credential מחזירים `403` — אסימון `data:read` דולף לעולם לא הופך
למפעל credentials.

## צריכת ה־API

שני endpoints קיימים במיוחד עבור אוטומציה — שניהם עובדים על הרשאות
אסימון בלי שכבת אימות נוספת.

### מלאי דינמי (Ansible)

`GET /api/v1/inventory` משרת את פורמט ה־dynamic-inventory של Ansible
ישר מתוך טבלאות המכשירים והכתובות — `_meta.hostvars` לפי שם מכשיר
ועוד קבוצות `site_*` / `type_*` / `family_*` תחת `all.children`.
נדרש `data:read` בלבד, והוא לעולם לא מפליט סודות: ה־hostvars נושאים
`ansible_host`, `device_type`, `family`, `manufacturer`, `site`, `rack`
ומזהה המכשיר — credentials לעולם לא חלק מהתשובה, לא משנה מה המכשיר מחזיק.

```bash
curl -sH "Authorization: Bearer ipam_a1b2…" \
     https://ipam.example.com/api/v1/inventory | jq .
```

מחברים ל־Ansible עם סקריפט מלאי executable בן שתי שורות:

```bash
# lancompass-inventory.sh  (chmod +x, ואז: ansible-inventory -i lancompass-inventory.sh --list)
#!/bin/sh
curl -fsS -H "Authorization: Bearer ipam_a1b2…" \
     https://ipam.example.com/api/v1/inventory
```

מסננים מצמצמים את הסט המוגש: `?site=` (מזהה אתר, slug, קוד או שם —
עובד גם ב־CSV), `?type=` (`device_type` מדויק), `?family=`
(`network|compute|storage|wifi|power|other`), `?status=` (סטטוס ה־IP
הגרוע ביותר: `active|reserved|dhcp|discovered|offline|unmonitored`).

הערות על שמות hosts: מכשירים מופיעים תחת שמם; התנגשות שמות משאירה את
שני ה־hosts — המאוחר מסופח `name#id`. מכשיר בלי IP מקושר פשוט נשאר
בלי מפתח `ansible_host` (אף פעם לא null), אז ה־playbooks יכולים לדלג
עליו או להתאים לפי חברות ב־`family_*`/`site_*`.

### אירועים נכנסים

`POST /api/v1/events` מתעד אירוע *מחוץ* לקופסה — צנרת CI, DCIM אחר,
גשר webhook — לתוך ה־changelog ומפיץ אותו דרך כל ערוץ התראות שמקשיב
לכל האירועים. נדרש `data:write`.

```bash
curl -X POST -H "Authorization: Bearer ipam_a1b2…" \
     -H 'content-type: application/json' \
     -d '{
       "event_type": "external.deploy.finished",
       "summary": "deploy v42 finished on web-1",
       "source_name": "ci-bot",
       "entity": {"kind": "device", "ref": "web-1"},
       "payload": {"build": 42, "result": "ok"}
     }' \
     https://ipam.example.com/api/v1/events
```

החוזה:

- `event_type` חייב להתאים ל־`external.*` (אותיות קטנות, מנוקד) —
  אירועים זרים נשארים ממורחבי-שם ולעולם לא מתנגשים בקטלוג ה־notify
  הפנימי.
- `summary` עד 300 תווים (נוחת ככותרת רשומת ה־changelog),
  `source_name` עד 100, `payload` עד 4KB של JSON, `entity` עד 1KB.
- ה־actor ב־changelog מנקוב בשם ה־credential — `api-token:<prefix>` —
  כך ששביל ה־audit מראה איזה אסימון דיווח מה.
- מגבלת קצב: 60 אירועים לדקה לאסימון, חלון קבוע. חריגה מחזירה `429`
  כן עם `Retry-After`.
- שליחה חוזרת בבטחה: תנו לאירוע `dedup_key` (עד 120 תווים). אותו
  אסימון ששולח שוב את אותו מפתח בתוך חלון ה־dedup
  (`event_dedup_minutes`, ברירת מחדל 60) מקבל `200` עם ה־`id` של
  האירוע הראשון ו־`"duplicate": true`, ושום דבר לא נרשם או נשלח שוב —
  כך שאירוע שנדחה ב־`429`, או אירוע שהתשובה עליו לא הגיעה, אפשר פשוט
  לשלוח שוב. שליחה חוזרת אינה נספרת במגבלת הקצב. בלי `dedup_key`,
  ניסיון חוזר יוצר רשומה שנייה.

אירועים חיצוניים מופיעים ב־changelog עם action מסוג `event` (מסנן
`?action=event`) ומרונדרים דרך תבנית `notify.external.event` המשותפת —
שורה אחת keyed, בלי פיזור בקטלוג.

## קודי שגיאה

סירוב שומר על קוד ה־⁨HTTP⁩ שלו ועל ה־`detail` באנגלית — סקריפטים ויומנים
קוראים את אותו הטקסט כמו קודם — ולצדו יכולים להופיע `code` קבוע
וה־`params` שלו:

```json
{"detail": "10.99.10.0/24 already exists in this VRF (id=18, active) — a network is documented once per VRF",
 "code": "errors.prefix.exists", "params": {"cidr": "10.99.10.0/24", "id": 18}}
```

- `code` הוא מפתח הודעה שממשק הרשת מנסח בשפת הקורא; `params` הם
  הערכים שבה. כדאי להשוות ל־`code` ולא לטקסט באנגלית.
- תשובת אימות `422` שומרת את הרשימה של ⁨FastAPI⁩ ב־`detail`; כל פריט מקבל
  `code` (‏`validation.missing`, ‏`validation.string_too_short`,
  ‏`validation.less_than_equal` וכו׳, או קוד של השדה עצמו, כמו
  `errors.cidr.invalid`) ו־`params` (‏`field`, והגבול או הערך).
- הקודים בשימוש: `errors.permission.<permission>` (‏`403`, למשל
  `errors.permission.dataWrite`), ‏`errors.auth.required` (‏`401`),
  ‏`errors.notFound` (‏`404`, עם `entity` ו־`id`), ‏`errors.prefix.exists`,
  ‏`errors.address.taken`, ‏`errors.address.outside`, ‏`errors.site.exists`,
  ‏`errors.cidr.invalid`, ‏`errors.ip.invalid`, ‏`errors.mac.invalid`,
  ‏`upload.undecodable` (‏`422`, עם `row`). תשובת הכתובת „תפוסה” שומרת על
  ה־`code: "taken"` הוותיק שלה.
- תשובה בלי `code` לא השתנתה: קוראים את ה־`detail` שלה.

## ביטול

הגדרות ← אבטחה ← אסימוני API ← ביטול. השורה נשמרת לצורכי audit —
`revoked_at` מסומן והאסימון מת מיד. `last_used_at` נרשם לכל היותר פעם
בדקה, כך שסופת בקשות לא הופכת לסופת כתיבות.

מנהלים רואים את האסימונים של כל משתמש תחת הגדרות ← משתמשים (סמל מפתח)
ויכולים לבטל אותם — הסוד עצמו בלתי ניתן לשחזור by design, אז אין מה
נוסף להציג.
