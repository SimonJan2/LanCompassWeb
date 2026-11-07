---
title: "MikroTik"
description: "גילוי RouterOS לקריאה בלבד — REST מעל HTTPS, אימות HTTP Basic, ממשקים, רשתות VLAN, DHCP ו־ARP; רק קריאות GET, כי POST מריץ פקודות."
category: "integrations"
keywords: "MikroTik, RouterOS, נתב, מקור"
version: "0.7.0"
order: 51
stale: false
---

# MikroTik

RouterOS ≥7.1 של MikroTik מספק שכבת REST תחת שירות ה־`www-ssl` — מערכי
JSON חשופים, אימות HTTP Basic, וכל קריאה שהקונקטור צריך:

    GET /rest/system/identity        -> מי
    GET /rest/system/routerboard     -> דגם/סידורי
    GET /rest/interface + /interface/vlan
    GET /rest/ip/address             -> subnets + SVIs
    GET /rest/ip/dhcp-server/lease   -> לקוחות (דגלי dynamic/reserved)
    GET /rest/ip/pool                -> pools של DHCP
    GET /rest/ip/arp                 -> טבלת ARP

**ה־GET-only כאן הוא תשתיתי**: ב־REST של RouterOS, `POST` הוא הרצת פקודות
מרחוק (`/rest/system/reboot` הוא נקודה אמיתית). הקונקטור חושף רק נתיב
`_get` — אין קוד POST שמבחן יכול לעקוף, והסוויטה מכיחה את זה.

## תפקיד לקריאה בלבד

*שכבת קהילה — ממשיכים לעבוד, בלי קריאות חדשות; ⁦RouterOS 7.1⁩ ומעלה, לא נבדק מול מכשיר.*

1. קבוצה עם `read,api,rest-api` בלבד (בלי `write`, בלי `policy`): `/user group add name=lancompass-ro policy=read,api,rest-api`.
2. משתמש בקבוצה: `/user add name=lancompass group=lancompass-ro`.
3. הגבילו את השירות `www-ssl` לשרת ⁦LanCompass⁩: `/ip service set www-ssl address=<the LanCompass host>/32`.

**מה ⁦LanCompass⁩ קוראת:** `/rest/system/identity` ו־`routerboard`, הממשקים ורשתות ה־⁦VLAN⁩, כתובות ⁦IPv4⁩ ו־⁦IPv6⁩, החכרות ומאגרי ⁦DHCP⁩, ⁦ARP⁩ ושכני ⁦IPv6⁩ — ⁦GET⁩ בלבד.

## לפני שמתחילים

- **RouterOS ≥ 7.1** עם שירות `www-ssl` דולק (או `www` אם אתם מתעקשים על
  HTTP נקי — אל תעשו, ברשת שחשובה).
- **הגעה ב־TCP/443** מ־⁦LanCompass⁩ לראוטר.
- **משתמש RouterOS לקריאה בלבד** — בערך חמש דקות.

## שלב 1 — שירות ה־REST + משתמש קריאה־בלבד

```routeros
/ip service enable www-ssl
/user group add name=read-api policy=read,api
/user add name=lancompass group=read-api password=<strong>
```

תעודה: התקינו אמיתית (`/certificate`) או כבו *verify TLS* על המקור לתעודת
ה־self-signed של ברירת המחדל. המשתמש צריך מדיניות `read` + `api` — שום
דבר מעבר.

## שלב 2 — הוספת המקור

Settings → Integrations → **New source** → סוג **MikroTik**, כתובת בסיס
`https://<router>`, משתמש + סיסמה, **Test & discover**. תווית הסקופ נקראת
**ממשקים** — סמנו ממשקים כדי לתחום את קריאות ה־VLAN/SVI/ARP.

## מה מיובא

| נתוני RouterOS                                 | אובייקט ⁦LanCompass⁩                      |
| ---------------------------------------------- | ------------------------------------ |
| שורות `/interface/vlan`                        | VLANים (vid + שם + הורה)             |
| שורות `/ip/address`                            | Subnets — ביטי ה־host הופכים ל־gateway; ממשק `vlanX` ממפה את ה־VID |
| טווחי `/ip/pool`                               | טווחי IP                             |
| השכרות DHCP (דגלי `dynamic`/`reserved`)        | כתובות — `lease`/`reservation`       |
| `/ip/arp` (רשומות שלמות)                       | כתובות (`source=integration`)        |
| הראוטר עצמו                                    | מכשיר (`source=integration`)          |

## סייגים

- **GET-only הוא החוז** — אם צנרת השינוי שלכם צריכה כתיבה ל־RouterOS, זה
  לא הקונקטור; POST היה הרצת פקודות מרוחקת, לא קריאת נתונים.
- **רשומות ARP לא־שלמות** (`complete=false` — resolution באמצע) מדולגות;
  הן היו מכערות את טבלת הכתובות.
- **קריאות לפי־ממשק**: השכרות DHCP לא נושאות שדה ממשק, ולכן סקופ לא יכול
  לייחס אותן — השכרות תמיד מיובאות; צד ה־ARP/SVI כן מסנן. מתועד במקום
  מנוחש.
- **CHR** (תמונת ה־Cloud Hosted Router החינמית) היא יעד המעבדה הזול
  ביותר — קונטיינר או VM, וכל שכבת הקריאה עונה.

## מה כל הודעה אומרת

| הודעה | מה היא אומרת ← מה עושים |
|---|---|
| *…: בקשה שגויה — ה־⁦REST⁩ של ⁦RouterOS⁩ דורש 7.1 ומעלה* | הנתב מריץ ⁦RouterOS 6⁩ ← שדרגו ל־7.1 ומעלה |
| *…: האימות נכשל (401)* | המשתמש או הסיסמה שגויים ← הזינו אותם שוב |
| *…: הבקשה לא נענתה בזמן* | `www-ssl` לא עונה מ־⁦LanCompass⁩ ← בדקו את הכתובת המותרת של השירות |
