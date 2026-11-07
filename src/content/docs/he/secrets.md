---
title: "סודות במנוחה"
description: "מפתח המאסטר שמצפין את פרטי ההתחברות השמורים — הגדרה והחלפה."
category: "system"
keywords: "סוד, סודות, הצפנה, מפתח מאסטר"
version: "0.7.0"
order: 57
stale: false
---

# סודות במנוחה

תכונות שמדברות עם מערכות אחרות צריכות credentials — סיסמת SMTP לניטור,
community-ים של SNMP, אסימונים של API לבקרים, הסוד של OIDC client. ⁦LanCompass⁩
שומר אותם מוצפנים תחת **מפתח מאסטר אחד**, כך ש־dump של בסיס הנתונים או גיבוי
אף פעם לא מפיק plaintext.

## מפתח המאסטר

שני משתני סביבה, הקובץ מנצח — אותה מוסכמה כמו `LANCOMPASS_PASSWORD_FILE`:

| משתנה | מה |
|---|---|
| `LANCOMPASS_SECRET_KEY` | הסיסמה, inline ב־`.env` |
| `LANCOMPASS_SECRET_KEY_FILE` | נתיב לקובץ שמכיל את הסיסמה — מנצח כשמוגדר |

הגדירו אחד מהם ב־`.env`, הפעילו מחדש את `api` (ואת `scanner` — ה־worker
צריך אותו כדי לפענח credentials שהוא משתמש בהם).

**שמרו את המפתח בקובץ** — זו השמירה המומלצת. ערך ב־⁦`.env`⁩ מגיע לסביבה של
הקונטיינרים, ושם כל מי שיכול להריץ ⁦`docker inspect`⁩ קורא אותו; קובץ מעוגן
לא. שימו את המפתח בקובץ כמו ש־⁦`certs/`⁩ מחזיקה את מפתח ה־⁦HTTPS⁩ — שורה
אחת, בבעלות המשתמש של הקונטיינרים (⁦uid 10001⁩), הרשאות ⁦400⁩ — עגנו אותו
לקריאה בלבד ל־⁦`api`⁩, ⁦`scanner`⁩ ו־⁦`discovery`⁩ בקובץ ⁦override⁩ של
⁦Compose⁩, הגדירו ⁦`LANCOMPASS_SECRET_KEY_FILE=/run/secrets/lancompass.key`⁩,
ואז רוקנו את ⁦`LANCOMPASS_SECRET_KEY`⁩ — צעד אחר צעד בהמשך. כשהקובץ מוגדר
אבל לא נותן לקונטיינרים מפתח, ה־⁦api⁩ כותב זאת ביומן שלו בעלייה (והמפתח
נופל לערך שב־⁦`.env`⁩). **Settings → General** מציג מחוון
`secret_key_configured` לקריאה בלבד. **Settings → Account & Security** תחת
*Secrets at rest* אומר גם מאיפה המפתח מגיע, וכשהקובץ לא נותן מפתח — למה: לא
מעוגן, לא קריא, או ריק. אין UI להזנת המפתח — הוא מגיע מהסביבה בלבד.

מאחורי הקלעים הסיסמה מוזנת ל-`HKDF(SHA-256, salt="lancompass-secrets",
info="v1")` כדי לגזור מפתח נתונים של 32 בתים, וכל סוד נחתם עם
AES-256-GCM תחת nonce אקראי — מאוחסן כטקסט `v1:<base64>`. שני סודות
זהים מוצפנים ל־blobs שונים, ופענוח עם מפתח שגוי נכשל בצורה סגורה.

## צעד אחר צעד: המפתח בקובץ

הריצו את הפקודות בתיקיית LanCompass — זו שיש בה `docker-compose.yml`
ו־`.env`. אותם צעדים מתאימים להתקנה מהחבילה הלא מקוונת ולעותק של קוד המקור.

**1. מצאו את המפתח הנוכחי.** בדקו את שורת המפתח ב־`.env`:

```sh
grep '^LANCOMPASS_SECRET_KEY=' .env
```

- **יש ערך אחרי ה־`=`:** זה המפתח שלכם. שמרו עליו — פרטי ההתחברות שכבר
  שמורים נפתחים רק איתו.
- **אין כלום אחרי ה־`=`,** ו־*Secrets at rest* מציג *לא מוגדר*: עוד לא הוצפן
  כלום, ולכן מתחילים עם מפתח חדש.

**2. כתבו את המפתח לקובץ.** כשיש מפתח ב־`.env`, העתיקו אותו:

```sh
mkdir -p secrets
sed -n 's/^LANCOMPASS_SECRET_KEY=//p' .env > secrets/lancompass.key
```

כשעוד אין מפתח, צרו חדש:

```sh
mkdir -p secrets
head -c 48 /dev/urandom | base64 | tr -d '\n' > secrets/lancompass.key
```

בקובץ שורה אחת: המפתח, בלי מירכאות. לעולם אל תקלידו ערך לדוגמה ממדריך —
המפתח הוא מה שמגן על כל פרטי ההתחברות השמורים.

**3. העבירו את הקובץ למשתמש של הקונטיינרים.** הקונטיינרים `api`, `scanner`
ו־`discovery` רצים כ־`uid 10001`:

```sh
sudo chown 10001:10001 secrets/lancompass.key
sudo chmod 400 secrets/lancompass.key
```

מעכשיו רק המשתמש הזה ו־root יכולים לקרוא אותו (`sudo cat
secrets/lancompass.key`).

**4. עגנו את הקובץ בקונטיינרים.** ⁦Compose⁩ קורא לבד קובץ בשם
`docker-compose.override.yml` שליד `docker-compose.yml`. אם עוד אין לכם
כזה, צרו אותו עם:

```yaml
services:
  api:
    volumes:
      - ./secrets/lancompass.key:/run/secrets/lancompass.key:ro
  scanner:
    volumes:
      - ./secrets/lancompass.key:/run/secrets/lancompass.key:ro
  discovery:
    volumes:
      - ./secrets/lancompass.key:/run/secrets/lancompass.key:ro
```

אם כבר יש לכם אחד, השאירו את מה שיש בו והוסיפו את שורות ה־`volumes:` תחת כל
אחד משלושת השירותים — שירות שלא מופיע בקובץ מקבל רשומה משלו. לדוגמה, קובץ
שמגדיר `extra_hosts` נהיה:

```yaml
services:
  api:
    extra_hosts:
      - "dc.example.lan:192.168.1.20"
    volumes:
      - ./secrets/lancompass.key:/run/secrets/lancompass.key:ro
  scanner:
    extra_hosts:
      - "dc.example.lan:192.168.1.20"
    volumes:
      - ./secrets/lancompass.key:/run/secrets/lancompass.key:ro
  discovery:
    volumes:
      - ./secrets/lancompass.key:/run/secrets/lancompass.key:ro
```

ה־`volumes:` האלה מתווספים לאלה שב־`docker-compose.yml` (כמו `./backups`);
הם לא מחליפים אותם. כש־⁦HTTPS⁩ פעיל, ב־`.env` יש שורת `COMPOSE_FILE=`
ו־⁦Compose⁩ קורא רק את הקבצים שהיא מונה: הוסיפו `:docker-compose.override.yml`
לסוף השורה.

**5. הפנו את `.env` לקובץ — אחרון.** צעד 2 מעתיק את המפתח מתוך `.env`, ולכן
שנו את שתי השורות האלה רק עכשיו:

```sh
LANCOMPASS_SECRET_KEY=
LANCOMPASS_SECRET_KEY_FILE=/run/secrets/lancompass.key
```

**6. הפעילו מחדש.**

```sh
docker compose up -d
```

**7. בדקו.**

```sh
docker compose logs api | grep SECRET_KEY_FILE
```

אין פלט — כל הקונטיינרים קראו את הקובץ. ב־**Settings → Account & Security**
← *Secrets at rest* מפתח המאסטר מוצג *מוגדר*, נקרא מקובץ המפתח
`/run/secrets/lancompass.key`.

**8. שמרו עותק מחוץ למחשב הזה** — במנהל הסיסמאות, בנפרד מהגיבויים. בלי
המפתח אי אפשר לפתוח את פרטי ההתחברות שבגיבוי משוחזר. בעותק של קוד המקור
`secrets/` כבר נמצא ב־`.gitignore`, כך שהמפתח לא נכנס ל־⁦commit⁩.

### כש־Settings מציג בעיה

| *Secrets at rest* אומר | הסיבה | התיקון |
|---|---|---|
| הקובץ לא נמצא בתוך הקונטיינרים | העיגון חסר, או שהקונטיינרים לא נוצרו מחדש | צעד 4, ואז צעד 6 |
| המשתמש של הקונטיינרים לא יכול לקרוא אותו | הקובץ לא בבעלות `uid 10001` | צעד 3 |
| הקובץ ריק | צעד 2 לא כתב כלום (לרוב: `.env` רוקן קודם) | צעדים 1 ו־2 שוב, ואז צעד 3 |
| אף משתנה לא מוגדר | ב־`.env` אין מפתח ואין קובץ | כל המדריך, עם מפתח חדש |

בשלושת המקרים הראשונים המפתח נופל ל־`LANCOMPASS_SECRET_KEY`: אם בשורה הזו
עדיין יש את המפתח, שום דבר לא מפסיק לעבוד בזמן התיקון.

## סיבוב המפתח

הסיבוב עוטף מחדש כל ⁦credential⁩ שמור מהמפתח הישן למפתח החדש, כך שאין צורך
להזין שום דבר מחדש:

```sh
docker compose stop api scanner discovery
docker compose run --rm --no-deps --user "$(id -u):$(id -g)" -v "$PWD/keys:/keys:ro" api \
  python -m app.cli secrets rotate --old-key-file /keys/old.key --new-key-file /keys/new.key
```

- קודם הוא סופר — לכל עמודה מוצפנת: כמה לעטוף מחדש, כמה כבר תחת המפתח
  החדש, וכמה לא נפתחים באף אחד מהם — ו־⁦`--dry-run`⁩ עוצר שם.
- אחר כך הוא כותב מחדש טבלה אחת בכל פעם, כל אחת בטרנזקציה אחת, וכותב שורת
  ביקורת אחת ⁦`secrets.rotate`⁩ עם הספירות (אף פעם לא ערך). ⁦credential⁩
  שהמפתח הישן לא פותח מופיע ברשימה לפי טבלה ושורה ונשאר כמו שהוא — הוא לא
  היה קריא גם לפני הסיבוב.
- אחרי הפסקה מריצים שוב: הוא מדלג על מה שכבר נעשה. הוא מסרב כשהמפתח הישן
  לא פותח אף ⁦credential⁩ שמור (מפתח ישן שגוי).
- אחר כך שמים את המפתח החדש במקום שממנו ההתקנה קוראת אותו (קובץ המפתח, או
  ⁦`LANCOMPASS_SECRET_KEY`⁩) ומפעילים את המערכת (⁦`docker compose up -d`⁩).

**החלפת המפתח בכל דרך אחרת מבטלת כל credential מאוחסן** — הפענוח נכשל
והערכים חייבים להיות מוזנים מחדש. מחוון הסטטוס אומר לכם רק שמפתח *מוגדר*,
לא שהוא הנכון — שמרו את הסיסמה במנהל הסיסמאות שלכם. תרגלו סיבוב על עותק
בדיקה לפני שתצטרכו אותו.

## מה תכונות שומרות

המוסכמה שכל תכונת credential ממלאת:

- שדה סוד הוא עמודת `<name>_enc` שמחזיקה את ה־blob `v1:…`.
- תגובות API אף פעם לא נושאות את ה־blob או ה־plaintext — הן מדווחות
  `<name>_set: true/false` ואת חותמת `updated_at`.
- עריכת סוד כותבת את העמודה המוצפנת; פעולת *test* נפרדת מוכיחה שהסוד
  המאוחסן באמת עובד בצד השרת.

בלי מפתח מוגדר, endpoints של credentials עונים `503 — set
LANCOMPASS_SECRET_KEY` נקי במקום stack trace.
