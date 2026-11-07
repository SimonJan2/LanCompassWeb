---
title: "Proxmox"
description: "הכנת אשכול או צומת Proxmox VE כמקור מחשוב לקריאה בלבד — אימות באסימון API, התפקיד PVEAuditor, ומה מיובא."
category: "integrations"
keywords: "Proxmox, וירטואליזציה, אשכול, מכונה וירטואלית"
version: "0.7.0"
order: 45
stale: false
---

# Proxmox

Proxmox הוא הידידותי מבין ה־connectors של ה־compute: ה־API שלו הוא REST
אמיתי (`GET /api2/json/…`), אימות ה־token הוא מבוסס-header בלי ריקוד
סשנים, וזה hypervisor חינמי שאפשר להרים ב־VM לבדיקה. אם רוצים לראות את
שכבת ה־compute עובדת מקצה לקצה לפני רישוי vCenter — זה הראשון לנסות.

קריאה בלבד מובנית — `GET`s בלבד; הוא לא יכול להדליק, לכבות או ליצור guest.

## תפקיד לקריאה בלבד

*נבדק מול ⁦Proxmox VE 9.0⁩ ו־⁦8.4⁩ (⁦8⁩ במאמץ הטוב ביותר מאז סוף החיים שלו באוגוסט 2026) — הסימולטור של המעבדה.*

1. *⁦Datacenter⁩* ← *⁦Permissions⁩* ← *⁦Users⁩* ← *⁦Add⁩*: `lancompass`, ⁦realm⁩ `pve`.
2. *⁦Datacenter⁩* ← *⁦Permissions⁩* ← *⁦API Tokens⁩* ← *⁦Add⁩*: המשתמש `lancompass@pve`, מזהה האסימון `lancompass`, **⁦Privilege Separation⁩** מסומן; העתיקו את הסוד — הוא מוצג פעם אחת.
3. *⁦Datacenter⁩* ← *⁦Permissions⁩* ← *⁦Add⁩* ← *⁦API Token Permission⁩*: הנתיב `/`, האסימון `lancompass@pve!lancompass`, התפקיד `PVEAuditor`, **⁦Propagate⁩**.
4. ב־⁦PVE 9⁩ אין צורך ביותר: ל־`PVEAuditor` יש `VM.GuestAgent.Audit`, כך שהכתובות של המכונות הווירטואליות נקראות. ב־⁦PVE 8⁩ השאירו את `PVEAuditor` וקבלו מכונות וירטואליות בלי כתובות, או הוסיפו `VM.Monitor`, בידיעה שהיא פותחת גם את ה־⁦QEMU monitor⁩.
5. אותו הדבר במעטפת של צומת: `pveum user add lancompass@pve`, `pveum user token add lancompass@pve lancompass --privsep 1`, `pveum acl modify / --tokens 'lancompass@pve!lancompass' --roles PVEAuditor`.

**מה ⁦LanCompass⁩ קוראת:** `/api2/json/version`, `/nodes`, ולכל צומת `network`, `qemu` ו־`lxc`, ולכל מכונה וירטואלית `agent/network-get-interfaces` ולכל קונטיינר `interfaces` — ⁦GET⁩ בלבד.

## שלב 1 — משתמש ייעודי + API token

אימות PVE מפריד בין *מי אתה* (משתמש) לבין *מה רשאי לקרוא* (token), והצורה
הנכונה לאינטגרציה היא משתמש ייעודי + token, לא ה־`root@pam` שלכם.

**בממשק הווב:**

1. **Datacenter → Permissions → Users → Add** — `lancompass`, realm `pve`,
   בלי תוקף.
2. **Datacenter → Permissions → API Tokens → Add** — משתמש `lancompass@pve`,
   token ID למשל `lancompass`. **Privilege Separation**: להשאיר *מסומן*
   (מומלץ) ולתת ל־token ACL משלו, או לבטל כדי לרשת את הרשאות המשתמש — שניהם
   עובדים; מסומן מסודר יותר.
3. **שמרו → העתיקו את הסוד עכשיו** — ערך ה־token (`…-uuid`) מוצג פעם אחת
   ולעולם לא שוב. לאבד אותו = למחוק וליצור מחדש.
4. **Datacenter → Permissions → Add → API Token Permission** (או User
   Permission אם privsep כבוי): path `/`, token `lancompass@pve!lancompass`,
   תפקיד **`PVEAuditor`**, מסמנים **Propagate**. PVEAuditor קורא הכול
   ומשנה כלום — החוזה המדויק.

**כתובות האורחים והגרסה של ⁦PVE⁩.** הכתובות של מכונה וירטואלית מגיעות
מ־⁦QEMU guest agent⁩ (`…/qemu/{vmid}/agent/network-get-interfaces`), וההרשאה
שהקריאה הזו צריכה תלויה בגרסה:

- **⁦PVE 9⁩** — `VM.GuestAgent.Audit`, שכבר נמצאת ב־PVEAuditor: כתובות
  האורחים עובדות בקריאה בלבד, ואין מה להוסיף.
- **⁦PVE 8⁩** (סוף החיים שלו באוגוסט 2026; במאמץ הטוב ביותר) — `VM.Monitor`,
  שאינה נמצאת ב־PVEAuditor. בחרו אחת מהשתיים:
  - **להשאיר רק PVEAuditor** (מומלץ) ולקבל שמכונות וירטואליות מיובאות בלי
    כתובות — הסנכרון נשאר שלם, והמקור מציג הערה אחת: *15 מכונות אורחות
    בלי כתובות: לאסימון חסרה ההרשאה ⁦VM.Monitor⁩ (⁦PVE 8.4.1⁩)*; קונטיינרים
    שומרים על הכתובות שלהם (הממשקים שלהם צריכים רק `VM.Audit`);
  - או **להעניק גם `VM.Monitor`**, בידיעה שהיא פותחת גם את ה־⁦QEMU monitor⁩
    של כל מכונה — יותר מקריאה.

**או ה־CLI על כל node:**

```bash
pveum user add lancompass@pve --comment "⁦LanCompass read-only sync⁩"
pveum user token add lancompass@pve lancompass --privsep 1
# → מדפיס את הסוד פעם אחת
pveum acl modify / --tokens 'lancompass@pve!lancompass' --roles PVEAuditor
```

## שלב 2 — מוכיחים ידנית

```bash
curl -sk 'https://<pve>:8006/api2/json/nodes' \
  -H 'Authorization: PVEAPIToken=lancompass@pve!lancompass=<uuid-secret>'
# → [{"node":"pve1","status":"online",…}]  — מוכנים.
# 401 = token שגוי / איות user@realm שגוי. 403 = חסר תפקיד.
```

## שלב 3 — הוספת המקור ב־⁦LanCompass⁩

הגדרות → **אינטגרציות** → **מקור חדש**:

| שדה        | ערך                                                        |
| ---------- | ----------------------------------------------------------- |
| Kind       | `Proxmox VE`                                                 |
| Base URL   | `https://<node-or-cluster>:8006` — פורט הניהול               |
| אישורים    | token id `lancompass@pve!lancompass` + סוד ה־UUID                  |
| Verify TLS | **כבוי** — תעודת ברירת המחדל של PVE היא self-signed           |
| Site / VRF | לאן אובייקטי ה־compute נוחתים                                |
| סנכרון כל  | 15–60 דקות                                                   |

base URL אחד על PVE מקלסטר רואה את כל ה־cluster — `/api2/json/nodes`
מונה את כל החברים דרך כל node שאליו מצביעים, וה־connector עובר על רשימת
ה־guests של כל node משם. מצביעים על ה־node הכי אמין. במקור רב-nodes
תיבות הסימון של scope תחת **Interfaces** הופכות לבורר *nodes* — ביטול
סימון של node מוציא אותו (ואת ה־guests שלו) מהסנכרון.

## מה הוא מייבא

| נתוני Proxmox                             | אובייקט ב־⁦LanCompass⁩                                   |
| ----------------------------------------- | ---------------------------------------------------- |
| Nodes (`/api2/json/nodes`)                | Devices — `family=compute`, סוג *hypervisor*         |
| QEMU VMs (`/nodes/{n}/qemu`)              | Devices — `family=compute`, מקושרים ל־node           |
| LXC containers (`/nodes/{n}/lxc`)         | Devices — `family=compute`, מקושרים ל־node           |
| IPs של NICs ב־guest (QEMU agent / conf של LXC) | Addresses (`source=integration`)                |
| ממשקי bridge מתויגים (`vmbr0.30`)         | VLANs                                                |
| כתובת + netmask של ממשק bridge            | רשתות משנה (מבט ה־SVI של ה־node); השער הוא ה־`gateway` של ה־bridge בתשובת הרשת של ה־node, ואם אין — אין שער; לעולם לא הכתובת של ה־node עצמו |

vnets מוגדרי SDN הם המשך מתוכנן — גרסה 1 לומדת סגמנטים מהממשקים
המוגדרים של כל node, שזו בכל מקרה תמונת ה־ground-truth.

Guests נוחתים תחת ה־node שלהם דרך `host_device_id` — תצוגת ה־device מראה
את ה־hypervisor עם ה־VMs מקוננים מתחתיו.

## הסתייגויות כנות

- **IPs של guests דורשים את ה־QEMU guest agent.** ב־qemu VMs, `qm agent`
  חייב להיות מופעל *ו־*`qemu-guest-agent` מותקן בתוך ה־guest — בלעדיו ה־VM
  מיובא בלי addresses (מסומן ביושר, לא מדולג בשקט). LXC containers מדווחים
  את הממשקים המוגדרים שלהם בכל מקרה.
- **אורח שהאסימון לא יכול לקרוא לעולם לא מפיל את הסנכרון.** תשובת 403
  לקריאת ה־agent משאירה את האורח בלי כתובות ומוסיפה את ההערה שלמעלה, עם
  ההרשאה של הגרסה של ה־node; רק אסימון שלא מתחבר (401) מפיל את הקריאה.
- **הפתעת privilege separation.** אם שלב ה־ACL של ה־token מדולג כש־privsep
  דולק, מקבלים 403 על קריאות — ל־token אין זכויות משלו.
- **Self-signed הוא ברירת המחדל.** כמעט כל מעבדת PVE תצטרך *Verify TLS*
  כבוי אלא אם התקנתם תעודות אמיתיות על ה־nodes.
- **אין תפוגת session.** אימות token הוא stateless — ה־connector הנקי
  מבין שלושת, ואין מה לחדש.

## פתרון תקלות

| סימפטום                            | סיבה סבירה → פתרון                                            |
| ---------------------------------- | ------------------------------------------------------------ |
| `authentication failed` (401)      | token id מאוית שגוי (`user@realm!id`) או סוד שגוי             |
| 403 על קריאות                      | חסר ACL ל־token — privsep אומר שה־token צריך הרשאות משלו; *בדיקה* מציגה כל קריאה ואת ההרשאה שקריאה שנדחתה צריכה (`Sys.Audit` ל־nodes ולרשתות, `VM.Audit` לרשימות האורחים) |
| *⁦N⁩ מכונות אורחות בלי כתובות: לאסימון חסרה ההרשאה ⁦VM.Monitor⁩ (⁦PVE 8.x⁩)* | הבחירה של ⁦PVE 8⁩ שלמעלה — להשאיר אותה, או להעניק `VM.Monitor` |
| *… חסרה ההרשאה ⁦VM.GuestAgent.Audit⁩ (⁦PVE 9.x⁩)* | תפקיד מותאם בלי הרשאת ה־agent של קבוצת הביקורת — השתמשו ב־PVEAuditor, או הוסיפו `VM.GuestAgent.Audit` |
| שגיאת TLS verify                   | `pve-ssl.pem` self-signed → *Verify TLS* כבוי                |
| Nodes מופיעים, ל־VMs אין IPs       | qemu-guest-agent לא מותקן/מופעל ב־guests                      |
| guests רק של node אחד מופיעים      | ה־token צריך ACL על `/` — ה־connector מונה את ה־cluster      |

## הערות אבטחה

- סוד ה־token מוצפן במנוחה (`cred_enc`, AES-256-GCM); ה־API מחזיר רק
  `cred_set`.
- דגימת LAN בלבד — ⁦LanCompass⁩ יוזם ל־PVE על 8006; שום דבר נכנס לא נדרש. token
  של PVEAuditor לא יכול לעשות נזק אפילו אם דולף — הוא קריאה-בלבד גם בצד
  הפלטפורמה.
- שורות `integration` הן בעדיפות אמצעית (מתחת manual/import, מעל scan);
  התנגשויות מדווחות, אף פעם לא מיושמות.

## מה כל הודעה אומרת

| הודעה | מה היא אומרת ← מה עושים |
|---|---|
| *…: האימות נכשל (401)* | מזהה האסימון (`user@realm!id`) או הסוד שלו שגויים ← הדביקו אותם שוב |
| *…: ההרשאה נדחתה (403)* | ל־⁦ACL⁩ של האסימון חסרה ההרשאה של הקריאה הזו ← תנו אותה על `/` עם **⁦Propagate⁩** |
| *⁦N⁩ מכונות אורחות בלי כתובות: לאסימון חסרה ההרשאה ⁦VM.Monitor⁩ (⁦PVE 8.x⁩)* | ⁦PVEAuditor⁩ ב־⁦PVE 8⁩ ← השאירו אותו, או הוסיפו `VM.Monitor` |
| *⁦tls⁩: התעודה של … אינה התעודה המוצמדת* | התעודה של הצומת השתנתה ← השוו את טביעת האצבע שלה ב־*⁦System → Certificates⁩*, ואז *לסמוך על התעודה הזו* בבדיקה |
| *…: הבקשה לא נענתה בזמן* | הצומת לא עונה ב־8006 מ־⁦LanCompass⁩ ← בדקו את הניתוב |
