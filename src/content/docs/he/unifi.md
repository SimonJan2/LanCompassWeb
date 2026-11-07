---
title: "UniFi"
description: "גילוי UniFi Network לקריאה בלבד דרך ה־Integration API הרשמי — מפתח API מהקונסולה, טווח לפי אתר, מכשירים, לקוחות ורשתות."
category: "integrations"
keywords: "UniFi, Ubiquiti, נקודת גישה, בקר"
version: "0.7.0"
order: 49
stale: false
---

# UniFi

UniFi מדבר דרך **ה־Integration API הרשמי** — השכבה ה־stateless שמתועדת
ב־OpenAPI ומשותפת לקונסולות UniFi OS (UDM/UXG/UCG/UNAS…) ול־UniFi OS
Server:

    GET {base}/proxy/network/integration/v1/info
    GET {base}/proxy/network/integration/v1/sites
    GET {base}/proxy/network/integration/v1/sites/{id}/networks
    GET {base}/proxy/network/integration/v1/sites/{id}/devices
    GET {base}/proxy/network/integration/v1/sites/{id}/clients

כל קריאה היא `GET` עם כותרת `X-API-KEY` — הצורה הנקייה בגל. האתרים הם
שם־הסקופ: רשימת הסקופ מציגה את האתרים שהקונסולה מדווחת.

## תפקיד לקריאה בלבד

*שכבת קהילה — ממשיכים לעבוד, בלי קריאות חדשות; לא נבדק מול מכשיר (התוכנה שלו דורשת ⁦EULA⁩ שהמעבדה לא מקבלת).*

1. הקונסולה של ⁦UniFi⁩ ← *⁦Settings⁩* ← *⁦Control Plane⁩* ← *⁦Integrations⁩* ← צרו מפתח ⁦API⁩.
2. הדביקו את המפתח כמפתח של המקור: ה־⁦Integration API⁩ הוא ⁦GET⁩ בלבד מעצם הגדרתו.

**מה ⁦LanCompass⁩ קוראת:** `info`, את האתרים, ולכל אתר את המכשירים ואת הלקוחות — ⁦GET⁩ בלבד.

## לפני שמתחילים

- **קונסולת UniFi OS** (Dream Machine / Cloud Gateway / UNVR / UniFi OS
  Server) עם אפליקציית UniFi Network עדכנית — ה־Integration API הגיע עם
  בניות מהדור של Network 8.6; עדכנו את האפליקציה אם
  `/integration/v1/info` לא עונה.
- **הגעה ב־TCP/443** ממארח ה־⁦LanCompass⁩ לקונסולה.
- **בערך חמש דקות** ב־UI של הקונסולה.

## שלב 1 — יצירת מפתח API

1. קונסולת UniFi → **Settings → System → Integrations** (בבניות חדשות:
   **Control Plane → Integrations → API**).
2. **Create API key**, שם כמו `lancompass`. המפתחות הם ברמת־קונסולה —
   אין נתיב כתיבה להגביל; הקונקטור פשוט אף פעם לא מוציא לא־GET.
3. העתיקו את המפתח לשדה **API key** של המקור — הוא מוצג פעם אחת.

## שלב 2 — הוספת המקור

Settings → Integrations → **New source** → סוג **UniFi**, כתובת בסיס
`https://<console>`, המפתח, **Test & discover**. תווית הסקופ נקראת
**אתרים** — סמנו אתרים לקריאה; רשימה ריקה קוראת את כולם.

## מה מיובא

| נתוני UniFi                                    | אובייקט ⁦LanCompass⁩                      |
| ---------------------------------------------- | ------------------------------------ |
| אתרים                                          | אוצר הסקופ (לא מיובא)                |
| הגדרות רשת (VLAN + `ipSubnet`)                 | VLANים + Subnets (ה־SVI כ־gateway)   |
| טווחי pool של DHCP                             | טווחי IP                             |
| מכשירים (APים, switchים, gateways)              | מכשירים — APים נוחתים ב־`family=wifi` |
| לקוחות                                         | כתובות (`source=integration`)        |

## סייגים

- **ה־API העצמי־המתארח הישן** (`/api/s/{site}/stat/sta` על :8443, קוקי +
  CSRF) הוא *לא* הקונקטור הזה — ה־Integration API לא מכסה אותו. אם
  הקונטרולר שלכם קדם ל־Integration API, המקור לא יענה; התיקון הוא שדרוג,
  לא אישור אחר.
- **פרוקסי הענן Site-Manager** (`api.ui.com`) מתועד כאן ובכוונה לא נבנה:
  הוא היה שולח את מפתח ה־API שלכם מחוץ לתיבה וערבויות ההגעה שלו שונות.
  כוונו את המקור לקונסולה עצמה.
- **שורות לקוחות הן מבט הקונטרולר** — לקוח כבוי נעלם בין סריקות; ה־diffs
  של התוכנית משקפים את זה ביושר.

## מה כל הודעה אומרת

| הודעה | מה היא אומרת ← מה עושים |
|---|---|
| *…: האימות נכשל (401)* | מפתח ה־⁦API⁩ שגוי או שהוסר ← צרו מפתח חדש |
| *…: לא נמצא* | הקונסולה לא מציעה את ה־⁦Integration API⁩ ← עדכנו את ⁦UniFi Network⁩ |
| *…: הבקשה לא נענתה בזמן* | הקונסולה לא עונה מ־⁦LanCompass⁩ ← בדקו את הניתוב |
