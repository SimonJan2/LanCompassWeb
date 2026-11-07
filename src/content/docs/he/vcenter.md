---
title: "vCenter / ESXi"
description: "הכנת vCenter (או ESXi עצמאי) כמקור מחשוב לקריאה בלבד — אימות בהתחברות, תפקיד עם הרשאות מינימליות, ומה מיובא."
category: "integrations"
keywords: "vCenter, ESXi, VMware, וירטואליזציה"
version: "0.7.0"
order: 44
stale: false
---

# vCenter / ESXi

מקור vCenter הוא שכבת ה־compute: חוות ה־hypervisor *מדווחת על עצמה* —
hosts, ה־VMs שרצים עליהם, ו(כש־VMware Tools משתף פעולה) מיפוי NIC→IP
האמיתי של כל guest. זה ערוץ התצפית השני לחצי ה־compute של המלאי, באותה
זרימת test → preview → apply כמו מקור firewall.

קריאה בלבד מובנית כמו כל connector. החריג היחיד למוסכמת ה־GET בלבד הוא
לחיצת היד של האימות: `POST /api/session` מחליף basic-auth באסימון סשן. כל
קריאת נתונים אחריו היא `GET` מול `/api/*` — הוא לא יכול ליצור, להדליק או
לשנות שום דבר.

## תפקיד לקריאה בלבד

*נבדק מול ⁦vSphere 9⁩ ו־⁦8⁩ (⁦7⁩ במאמץ הטוב ביותר מאז סוף התמיכה הכללית בו) — סימולטור ה־⁦REST⁩ של המעבדה.*

1. *⁦Administration⁩* ← *⁦Single Sign On⁩* ← *⁦Users and Groups⁩* ← הוסיפו את `svc-lancompass@vsphere.local`.
2. *⁦Hosts and Clusters⁩* ← שורש ה־⁦vCenter⁩ ← *⁦Permissions⁩* ← *⁦Add⁩*: המשתמש, התפקיד **⁦Read-only⁩**, **⁦Propagate to children⁩**.
3. אין צורך ביותר: רשתות האורחים מגיעות דרך ⁦VMware Tools⁩ ונקראות בהרשאות קריאה; ⁦LanCompass⁩ סוגרת את ההפעלה שלה אחרי כל בדיקה וכל סנכרון.

**מה ⁦LanCompass⁩ קוראת:** `POST /api/session` (הקריאה היחידה שנראית ככתיבה — כניסה), ואז ⁦GET⁩ של המארחים, המכונות הווירטואליות לפי מארח, הרשומה ורשת האורח של כל מכונה, האשכולות, מאגרי האחסון וקבוצות הפורטים, ו־`DELETE /api/session` כדי לסגור.

## לאיזה endpoint להצביע

| יש לכם…                            | המקור מצביע על                 | מה הוא רואה                                      |
| ---------------------------------- | ------------------------------ | ------------------------------------------------ |
| ⁦vCenter Server (VCSA)⁩ 9 או 8       | `https://<vcenter>`            | הכול: hosts, VMs, אשכולות, אחסון, port groups, כתובות IP של guests (נתמך) |
| ⁦vCenter Server⁩ 7.0                 | `https://<vcenter>`            | אותו דבר, במאמץ סביר — מחוץ לתמיכה הכללית מאז 2025-10-02 |
| ESXi 7.0+ עצמאי (בלי vCenter)      | `https://<esxi>`               | ה־host + ה־VMs שלו (דל יותר — בלי מבט cluster)   |
| כל דבר בן 6.7 או ישן יותר          | —                              | ישן מדי ל־REST API; לשדרג או לדלג                |

vCenter הוא תמיד היעד הטוב יותר — מקור אחד מכסה את כל ה־cluster במקום מקור
לכל ESXi. ESXi ישיר הוא הגיבוי למכונה בודדת.

## שלב 1 — יצירת משתמש עם הרשאות מינימליות

הרשאות vCenter הן role-based. התפקיד המובנה **Read only** הוא בדיוק הנכון —
אינטגרציה צריכה *לראות* מלאי, לא יותר.

1. **vSphere Client → Administration → Single Sign-On → Users and Groups**:
   יוצרים משתמש שירות, למשל `lancompass-reader@vsphere.local` (או חשבון AD אם
   ה־vCenter מצורף לדומיין).
2. **Administration → Access Control → Roles**: מוודאים שקיים שיבוט של
   **Read only** (התפקיד הסטנדרטי טוב כמו שהוא).
3. **בוחרים את אובייקט ה־root של ה־vCenter → Permissions → +**: מוסיפים את
   המשתמש עם תפקיד **Read only**, ומסמנים **Propagate to children**.
   ההפצה היא מה שהופך כל host+VM לגלוי; הקצאה על תיקייה מגבילה את ה־scope
   אליה — דרך לגיטימית לגדור את הסנכרון ל־cluster אחד.
4. מתנתקים/מתחברים ומוודאים שהמשתמש רואה את המלאי אבל כל פעולה אפורה. זו
   כל בדיקת ההרשאות.

## שלב 2 — מוכיחים שה־REST API עובד ידנית

```bash
# 1. session token — החלפת basic auth
curl -sk -X POST https://<vcenter>/api/session \
  -u 'lancompass-reader@vsphere.local:<pw>'
# → "d4ff…"   מחרוזת token חשופה (401 = אישורים שגויים, 403 = אין הרשאות)

# 2. קריאה עם ה-token
curl -sk https://<vcenter>/api/vcenter/host \
  -H "vmware-api-session-id: d4ff…"
# → [{"host":"host-1","name":"esx01.lan",…}]  — אתם מוכנים.
```

ה־connector פותח session אחד לכל *Test* ולכל סנכרון וסוגר אותו בסיום
(`DELETE /api/session`), מה שלא יקרה בדרך — שום session לא נשאר להתייבש
על ה־appliance.

## שלב 3 — הוספת המקור ב־⁦LanCompass⁩

הגדרות → **אינטגרציות** → **מקור חדש**:

| שדה        | ערך                                                    |
| ---------- | ------------------------------------------------------- |
| Kind       | `vCenter / ESXi` — אותו kind מכסה גם מכונה עצמאית        |
| Base URL   | `https://<vcenter>` — בלי path                           |
| אישורים    | המשתמש + סיסמה משלב 1                                    |
| Verify TLS | **כבוי** אם ה־VCSA עדיין מריץ תעודה self-signed          |
| Site / VRF | לאן אובייקטי ה־compute נוחתים                            |
| סנכרון כל  | 15–60 דקות זה מספיק; החווה לא משתנה מהר                  |

ואז **Test & discover** → סימון scope → **Preview** → **Apply**.

## מה הוא מייבא

| נתוני vSphere                                | אובייקט ב־⁦LanCompass⁩                                    |
| -------------------------------------------- | ---------------------------------------------------- |
| ESXi hosts (`/api/vcenter/host`)             | Devices — `family=compute`, סוג *hypervisor*; בדף של ה־host — האשכול שלו והאחסון שהוא מגיע אליו (שם, סוג, מקום פנוי מתוך הקיבולת) |
| VMs, לפי host (`/api/vcenter/vm?hosts=<host>`) | Devices — `family=compute`, מקושרים ל־host שברשימה שלו הם מופיעים |
| הרשומה של כל VM (`/api/vcenter/vm/{vm}`)     | כתובת ה־MAC שלו (עם ⁦VMware Tools⁩ או בלעדיו); בדף של ה־VM — מצב ההפעלה, מערכת ההפעלה האורחת, האשכול והרשת של כל NIC |
| IPs של NICs ב־guest (`guest/networking/interfaces`) | Addresses (`source=integration`), *Tools בלבד*  |
| IP של guest + אורך prefix                    | Subnets — הסגמנט שבו ה־guest באמת יושב               |
| אשכולות (`/api/vcenter/cluster`, `/api/vcenter/host?clusters=<cluster>`) | קבוצות מכשירים שהמקור מחזיק, ה־hosts שלהן כחברים |
| אחסון (`/api/vcenter/datastore`)             | בדף של כל host (מה שהדיסקים של ה־VMs שלו יושבים עליו) |
| port groups (`/api/vcenter/network`), רגילים ו־distributed | נשמרים עם המקור; ה־port group של כל NIC בדף של ה־VM |

**כל VM על ה־host שלו.** ה־VMs נקראים host אחר host, כך שה־host של כל VM
הוא ה־host שברשימה שלו הוא מופיע — VM שעבר ב־vMotion עובר איתו בסנכרון
הבא. רשימה עוצרת ב־4,000 VMs לתשובה; host שהרשימה שלו מחזיקה 4,000 נקרא
שוב לפי מצב הפעלה, וחלק שעדיין ב־4,000 נאמר על המקור (הסנכרון *חתוך*, לא
קצר בשקט).

**הרשומה של VM.** נקראת בסנכרון הראשון, ושוב רק כשהתקציר של ה־VM (שם, מצב
הפעלה, CPU, זיכרון) השתנה — סנכרון מאוחר יותר של חווה שלא השתנתה לא קורא
אף רשומה. כתובות ה־MAC של ה־NICs באות ממנה, כך שגם ל־VM בלי Tools, או
כבוי, יש את כתובות ה־MAC שלו.

**אשכולות כקבוצות מכשירים.** כל אשכול הופך לקבוצת מכשירים שמקור ה־vCenter
מחזיק, בשם האשכול, וה־hosts שלו חברים בה; host שעבר לאשכול אחר עובר
קבוצה, חבר שהוספתם בעצמכם נשאר, וקבוצה באותו שם שיצרתם בעצמכם לעולם לא
נלקחת.

**port groups ו־VLANs.** ה־VLAN של port group לא נמצא בתשובת ה־REST של
vSphere — ⁦LanCompass⁩ לעולם לא מנחשת אותו משם ה־port group (`PG-VLAN-101`
הוא שם, לא VLAN). רשתות המשנה עדיין נלמדות ממה שה־guests מדווחים.

קשר ה־VM→host הוא העניין: ה־VM נוחת תחת ה־host שלו דרך
`host_device_id`,
כך ש־guests יורשים את הקונטקסט של ארון/site של ה־host ומופיעים בתצוגת
ה־device שלו.

## הסתייגויות כנות

- **VMware Tools הוא השער ל־IP של guest.** `guest/networking/interfaces`
  מחזיר נתונים רק כש־Tools (או חבילת open-vm-tools) מותקן *ורץ* ב־guest.
  בלעדיו ה־VM עדיין מיובא — כ־device עם כתובות ה־MAC שלו (מהרשומה שלו)
  ובלי addresses, מסומן ביושר כלא-מדווח במקום לדלג בשקט.
- **VMs כבויים** לא מדווחים guest networking (ה־connector לא שואל) —
  device כן, MAC כן, IPs לא.
- **סשנים**: אחד לכל *Test* או סנכרון, נסגר בסופו. אל תפציצו —
  `sync_minutes` 15+ הוא הרצפה ההגונה לחוות גדולות.
- ***Test* קורא מדגם**: הגרסה, ספירת ה־hosts וה־VMs, הרשימה של host אחד,
  הרשומה של VM אחד וה־guest networking שלו, האשכול הראשון, ורשימות האחסון
  וה־port groups — שניות בכל גודל. הקריאה המלאה היא של הסנכרון.
- **אין נתיב כתיבה.** הוא לא יכול ליצור VM, לא לכבות אחד, לא לתייג port
  group — הטענה של קריאה בלבד היא מבנית.

## פתרון תקלות

| סימפטום                              | סיבה סבירה → פתרון                                       |
| ------------------------------------ | --------------------------------------------------------- |
| `authentication failed`              | סיומת user@domain שגויה — `vsphere.local` מול דומיין AD; או שהתפקיד לא הופץ |
| שגיאת TLS verify                     | תעודת VCSA self-signed → *Verify TLS* כבוי, או התקינו תעודת CA אמיתית |
| Test תקין, hosts מופיעים, VMs חסרים | הרשאה הוקצתה על תת-תיקייה במקום root, או propagation כבוי |
| VMs קיימים, אין כתובות IP            | VMware Tools לא מותקן/רץ — השער שתואר למעלה                |
| סנכרון ראשון איטי בחווה גדולה       | הסנכרון הראשון קורא את הרשומה ואת ה־guest networking של כל VM; סנכרונים מאוחרים קוראים רק רשומות שהשתנו — להעלות `sync_minutes` אם קריאות ה־guest עדיין שולטות |
| *חתוך* על host אחד                   | יותר מ־4,000 VMs במצב הפעלה אחד על host אחד — מה שמעבר לא נקרא; ההערה נותנת את שם ה־host |
| מקור ESXi רואה פחות מ־vCenter       | צפוי — מצב עצמאי הוא הגרסה הדלה                           |

## הערות אבטחה

- האישורים מוצפנים במנוחה (`cred_enc`, AES-256-GCM); ה־API מחזיר רק
  `cred_set`.
- דגימת LAN בלבד — ⁦LanCompass⁩ יוזם ל־vCenter; שום דבר נכנס לא נדרש. אם
  ה־vCenter שלכם air-gapped, זה עדיין עובד; אם הוא cloud-managed, זה הכלי
  הלא נכון.
- שורות `integration` הן בעדיפות אמצעית (מתחת manual/import, מעל scan);
  סתירות מוצגות כשורות conflict — מדווחות, אף פעם לא מיושמות.

## מה כל הודעה אומרת

| הודעה | מה היא אומרת ← מה עושים |
|---|---|
| *⁦session⁩: האימות נכשל (401)* | המשתמש או הסיסמה שגויים ← הזינו אותם שוב |
| *…: האימות נכשל (403)* | התפקיד לא מגיע לאובייקט הזה ← תנו **⁦Read-only⁩** בשורש עם **⁦Propagate to children⁩** |
| *⁦session⁩: אסימון ריק* | השרת קיבל את הכניסה בלי הפעלה ← בדקו את שירות ה־⁦API⁩ של ה־⁦vCenter⁩ |
| *⁦tls⁩: התעודה של … אינה התעודה המוצמדת* | התעודה של ה־⁦vCenter⁩ השתנתה ← השוו את טביעת האצבע שלה, ואז *לסמוך על התעודה הזו* בבדיקה |
| *…: הבקשה לא נענתה בזמן* | ה־⁦vCenter⁩ לא עונה ב־443 מ־⁦LanCompass⁩ ← בדקו את הניתוב |
