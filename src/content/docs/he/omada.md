---
title: "Omada"
description: "גילוי Omada SDN לקריאה בלבד — אימות OpenAPI בפרטי לקוח, טווח לפי אתר, מכשירים, רשתות LAN ולקוחות."
category: "integrations"
keywords: "Omada, TP-Link, נקודת גישה, בקר"
version: "0.7.0"
order: 50
stale: false
---

# Omada

Omada SDN מדבר על שכבת ה־**OpenAPI** שלה: לחיצת יד של client-credentials,
ואז קריאות `GET` בלבד.

    GET  /api/info                              -> omadacId (בלי אימות)
    POST /openapi/authorize/token               -> accessToken (כ־שעתיים)
    GET  /openapi/v1/{omadacId}/sites
    GET  /openapi/v1/{omadacId}/sites/{id}/devices
    GET  /openapi/v1/{omadacId}/sites/{id}/clients
    GET  /openapi/v1/{omadacId}/sites/{id}/networks/lan-networks

ה־POST של האסימון הוא חריג לחיצת־האימות — הנתיב היחיד שהקונקטור יכול ל־POST
אליו (נאכף בקוד, אותה משמעת כמו קריאת ה־session של vCenter). כל קריאה
אחריו היא `GET` של v1 נושאת `Authorization: AccessToken=<token>`.

## תפקיד לקריאה בלבד

*שכבת קהילה — ממשיכים לעבוד, בלי קריאות חדשות; לא נבדק מול מכשיר (התוכנה שלו דורשת ⁦EULA⁩ שהמעבדה לא מקבלת).*

1. בקר ⁦Omada⁩ ← *⁦Global View⁩* ← *⁦Settings⁩* ← *⁦Platform Integration⁩* ← *⁦Open API⁩* ← *⁦Add New App⁩*, מצב *⁦Client⁩*.
2. תנו לאפליקציה את התפקיד **⁦Viewer⁩** ואת האתרים לקריאה; העתיקו את ה־⁦client ID⁩ ואת הסוד שלה.
3. הזינו את ה־⁦client ID⁩ ואת הסוד כפרטי ההתחברות של המקור.

**מה ⁦LanCompass⁩ קוראת:** `api/info`, את קבלת האסימון של ה־⁦OpenAPI⁩ (בקשת ה־⁦POST⁩ היחידה — כניסה), את האתרים, ולכל אתר את המכשירים ואת הלקוחות — ⁦GET⁩ בכל השאר.

## לפני שמתחילים

- **קונטרולר Omada 5.x** (תוכנה, חומרת OC200/OC300, או ענן) — שכבת ה־
  OpenAPI צריכה ≥5.0; ראו *סייגים* על שינויי 6.2.
- **הגעה ב־TCP/8043** (או פורט ה־HTTPS של הקונטרולר שלכם) מ־⁦LanCompass⁩.
- **בערך עשר דקות** ליצירת אפליקציית OpenAPI.

## שלב 1 — יצירת אפליקציית OpenAPI

1. קונטרולר Omada → **Settings → Platform Integration → OpenAPI →
   New Application**.
2. שם `lancompass`, הרשאות **קריאה** בלבד, ובחרו את האתרים שהאפליקציה רשאית
   לראות — המיפוי הזה *הוא* גבול הסקופ הראשון שלכם.
3. העתיקו את **Client ID** ואת **Client Secret** — שני שדות האישור של
   המקור.

## שלב 2 — הוספת המקור

Settings → Integrations → **New source** → סוג **Omada**, כתובת בסיס
`https://<controller>:8043`, client + secret, **Test & discover**. תווית
הסקופ נקראת **אתרים** — סמנו אתרים לקריאה; ריק = כל מה שהאפליקציה מגיעה
אליו.

## מה מיובא

| נתוני Omada                                    | אובייקט ⁦LanCompass⁩                      |
| ---------------------------------------------- | ------------------------------------ |
| אתרים                                          | אוצר הסקופ (לא מיובא)                |
| רשתות LAN (VLAN + subnet + gateway)            | VLANים + Subnets                     |
| טווחי DHCP                                     | טווחי IP                             |
| מכשירים (APים, switchים, gateways)              | מכשירים — APים נוחתים ב־`family=wifi` |
| לקוחות                                         | כתובות (`source=integration`)        |

## סייגים

- **שינויי גרסה אמיתיים**: קונטרולר 6.2 העביר את הלקוחות לשכבת v2
  מחולקת־לדפים ב־POST. הקונקטור הזה נשאר על ה־GETים של v1 ומדווח שגיאת
  מקטע שממנת את הנקודה כשהן נכשלות — הסנכרון עדיין מנחית את כל השאר.
  אם אתם רואים `clients:<site>: not found`, זה צוק ה־v2 של 6.2, לא בעיית
  אישורים.
- **חיי אסימון**: ה־accessToken של כשעתיים נשמר למטמון לכל סנכרון — אין מה
  לטפל בו; אסימון מיושן פשוט מחליף לחיצת יד מחדש.
- **אתרים הם הסקופ היחיד** — Omada לא חושפת סינון ברמת־ממשק על השכבה
  הזו; קריאות צרות יותר מגיעות מהרשאת האתרים של האפליקציה משלב 1.

## מה כל הודעה אומרת

| הודעה | מה היא אומרת ← מה עושים |
|---|---|
| *…: לא נמצא — ייתכן שהבקר בגרסה בלי ממשק ⁦v1⁩ הזה* | הבקר ישן מ־⁦OpenAPI v1⁩ ← עדכנו אותו |
| *קבלת האסימון לא החזירה ⁦accessToken⁩* | ה־⁦client ID⁩ או הסוד שגויים ← העתיקו אותם שוב |
| *…: הבקשה לא נענתה בזמן* | הבקר לא עונה מ־⁦LanCompass⁩ ← בדקו את הניתוב |
