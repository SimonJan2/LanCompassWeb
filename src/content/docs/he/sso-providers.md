---
title: "הגדרת ספק SSO"
description: "מדריכים צעד אחר צעד לספקי זהות — Keycloak, Authentik, Entra ID, Okta, Google Workspace, Authelia ו־Pocket ID."
category: "system"
keywords: "SSO, ספק זהות, OIDC, כניסה"
version: "0.7.0"
order: 59
stale: false
---

# הגדרת ספק SSO

כל הספקים עובדים באותו תבנית: רושמים **client סודי** מסוג
authorization-code, נותנים לו את כתובת ה־callback, לוקחים את ה־issuer,
מזהה ה־client והסוד ל־`.env`, ואז ממפים קבוצות לתפקידים בהגדרות.

כתובת ה־callback שרושמים היא תמיד:

```
{origin}/api/v1/auth/oidc/callback
```

למשל `https://ipam.example.com/api/v1/auth/oidc/callback`. השתמשו בכתובת
שהמשתמשים גולשים אליה בפועל (ה־frontend מעביר את `/api/*` ל־API). כש
reverse proxy מסתיר את ה־origin ממיכל ה־API, הגדירו
`LANCOMPASS_OIDC_REDIRECT_URI` לכתובת המוחלטת במקום לסמוך על זיהוי.

> ⁦LanCompass⁩ דורש `email_verified` ב־claims של ה־token/userinfo — ספקים
> שלא יכולים לשדר אותו (בעיקר Entra ID) יידחו בכניסה. כל מדריך מציין
> מאיפה ה־claim מגיע.

## Keycloak

1. **Realm** — בחרו או צרו realm (למשל `lancompass`). ה־issuer הוא
   `https://keycloak.example.com/realms/<realm>`.
2. **Clients → Create client** — סוג *OpenID Connect*, מזהה client
   `lancompass`.
3. **Capability config** — *Client authentication* מופעל (confidential),
   השאירו *Standard flow* (authorization code) פעיל.
4. **Login settings** — הוסיפו את כתובת ה־callback ל־*Valid redirect
   URIs*.
5. **Credentials tab** — העתיקו את ה־*Client Secret*.
6. **Groups claim** — ה־mapper של `groups` לא מופעל כברירת מחדל:
   *Client scopes → `lancompass-dedicated` → Add mapper → By configuration
   → Group Membership*. הגדירו *Token Claim Name* ל־`groups`, כבו *Full
   group path* לשמות פשוטים (`lancompass-admins`), הפעילו *Add to ID
   token* ו־*Add to userinfo*.
7. **Groups** — צרו `lancompass-admins`, `lancompass-operators` וכו׳ ושייכו
   משתמשים. סמנו את ה־email של כל משתמש כמאומת (או הפעילו *Verify
   email*) — Keycloak שודר `email_verified` מהדגל הזה.

```env
LANCOMPASS_OIDC_ISSUER=https://keycloak.example.com/realms/lancompass
LANCOMPASS_OIDC_CLIENT_ID=lancompass
LANCOMPASS_OIDC_CLIENT_SECRET=<credentials-tab secret>
```

```json
{"lancompass-admins": "admin", "lancompass-operators": "operator", "lancompass-users": "viewer"}
```

## Authentik

1. **Applications → Providers → Create** — *OAuth2/OpenID Provider*,
   זרימת הרשאה `default-provider-authorization-implicit-consent`
   (או explicit), סוג client **Confidential**.
2. **Redirect URIs** — התאמה מדויקת, כתובת ה־callback.
3. **Signing Key** — בחרו keypair מסוג RS256 כלשהו (אישור ה־authentik
   self-signed עובד); ה־JWTs חייבים להיות אסימטריים לצורך אימות JWKS.
4. רשמו את *Client ID* ו־*Client Secret* מעמוד ה־provider.
5. **Applications → Create** — שם *⁦LanCompass⁩*, slug `lancompass`, קשרו את
   ה־provider. ה־issuer הוא לכל application:
   `https://authentik.example.com/application/o/lancompass/`.
6. **Directory → Groups** — צרו קבוצות ושייכו משתמשים. ה־scope mapping
   של `profile` ב־authentik כבר משדר claim של `groups` (שמות הקבוצות);
   ה־scope mapping של `email` משדר `email_verified`.

```env
LANCOMPASS_OIDC_ISSUER=https://authentik.example.com/application/o/lancompass/
LANCOMPASS_OIDC_CLIENT_ID=<provider client id>
LANCOMPASS_OIDC_CLIENT_SECRET=<provider client secret>
```

## Microsoft Entra ID

‏Entra לא שולח את ה־claim הסטנדרטי `email_verified` (ה־tokens שלו נושאים
`email` עם `verified_primary_email` / `verified_secondary_email`), ולכן
‏⁦LanCompass⁩ דוחה את החשבונות שלו עם *"the IdP did not verify this email"*
עד שמפעילים **לסמוך על הדוא״ל של ספק הזהות** (הגדרות ← Features ← *כניסה
מאוחדת*). אז כל חשבון מתקבל לפי ה־`sub` היציב שלו, בשם לפי `upn`, אחרת
`preferred_username`, אחרת `email` — ראו
[מי יכול להתחבר](/he/docs/sso/#מי-יכול-להתחבר). הפעילו רק עבור ה־tenant שלכם.

1. **Entra admin center → App registrations → New registration** —
   שם *⁦LanCompass⁩*, redirect URI מסוג *Web* = כתובת ה־callback.
2. **Certificates & secrets → New client secret** — העתיקו את
   ה־**Value** של הסוד (ה־Secret ID הוא לא הסוד).
3. ה־issuer הוא נקודת ה־v2.0:
   `https://login.microsoftonline.com/<tenant-id>/v2.0`.
4. **Token configuration → Add optional claim → ID → `email`** — Entra
   לא תמיד כולל claim של `email` בלי זה.
5. **Token configuration → Add groups claim** — בחרו *Security groups*
   (או *Groups assigned to the application* ל־token קטן יותר) ושדרו
   ב־**ID token**. claims של קבוצות מגיעים כ־**GUIDs של אובייקטים**, לא
   שמות תצוגה — מפתחות ה־role map חייבים להיות ה־GUIDs:

```json
{"3f2c…-guid-admins": "admin", "9d1e…-guid-operators": "operator"}
```

```env
LANCOMPASS_OIDC_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0
LANCOMPASS_OIDC_CLIENT_ID=<application (client) id>
LANCOMPASS_OIDC_CLIENT_SECRET=<client secret value>
```

6. הגדרות ← Features ← *כניסה מאוחדת*: הפעילו **לסמוך על הדוא״ל של ספק
   הזהות**, הגדירו את מיפוי התפקידים לפי ה־GUID של הקבוצה, והשאירו את
   **תפקיד ברירת מחדל** על *דחה* כדי שרק קבוצות ממופות ייכנסו.

## AD FS

‏Active Directory Federation Services (‏Windows Server 2016 ואילך) מדבר
OpenID Connect דרך *application group*. כמו Entra הוא לא שולח
`email_verified`; המשתמשים שלו מגיעים עם `upn` ו־`unique_name`.

1. **AD FS Management → Application Groups → Add Application Group** —
   *Server application accessing a web API*, או *Web browser accessing a
   web application* עם client סודי. ‏Redirect URI = כתובת ה־callback;
   העתיקו את ה־client identifier וצרו סוד.
2. **Issuance transform rules** על האפליקציה: *Send LDAP Attributes as
   Claims* — `User-Principal-Name` → `upn`, ו־*Token-Groups - Unqualified
   Names* → `groups` (שמות הקבוצות ש־⁦LanCompass⁩ ממפה).
3. ה־issuer הוא `https://<adfs-host>/adfs`.
4. הגדרות ← Features ← *כניסה מאוחדת*: **לסמוך על הדוא״ל של ספק הזהות**
   דולק (החשבון נקרא לפי ה־`upn` שלו), מיפוי התפקידים לפי שם הקבוצה
   (`{"LC-Admins": "admin"}`), **תפקיד ברירת מחדל** על *דחה*.

```env
LANCOMPASS_OIDC_ISSUER=https://adfs.example.com/adfs
LANCOMPASS_OIDC_CLIENT_ID=<client identifier>
LANCOMPASS_OIDC_CLIENT_SECRET=<client secret>
```

## Okta

1. **Applications → Create App Integration** — *OIDC – OpenID Connect*,
   סוג application *Web Application*.
2. **Sign-in redirect URIs** — כתובת ה־callback; grant type
   *Authorization Code*.
3. שייכו את ה־app לאנשים/קבוצות (לשונית *Assignments*), ואז העתיקו את
   *Client ID* ו־*Client Secret* מ־*General*.
4. ה־issuer של ה־**org** (`https://<org>.okta.com`) לא יכול לייצר
   claims מותאמים — השתמשו ב־authorization server המותאם:
   `https://<org>.okta.com/oauth2/default`.
5. **Security → API → Authorization Servers → `default` → Claims → Add
   claim** — שם `groups`, כלול ב־*ID token* / *Always*, סוג ערך
   *Groups*, מסנן למשל *Matches regex `lancompass-.*`*.
6. Okta משדר `email_verified` דרך ה־scope של `email` — אין עבודה
   נוספת.

```env
LANCOMPASS_OIDC_ISSUER=https://<org>.okta.com/oauth2/default
LANCOMPASS_OIDC_CLIENT_ID=<app client id>
LANCOMPASS_OIDC_CLIENT_SECRET=<app client secret>
```

```json
{"lancompass-admins": "admin", "lancompass-netops": "operator"}
```

## Google Workspace

> ב־Google OIDC **אין claim של קבוצות** — מיפוי קבוצה→תפקיד בלתי
> אפשרי. שלבו עם **default role**, ושימו לב שהתפקיד חוזר ל־default בכל
> כניסה (העלאת רמת משתמש בודד דורשת IdP אחר).

1. **Google Cloud console → APIs & Services → OAuth consent screen** —
   סוג משתמש **Internal** (Workspace בלבד). *Internal* הוא מה שמרחיק
   חשבונות gmail.com שרירותיים — כש־default role מוגדר, כל מי שמשלים
   consent מתקבל.
2. **Credentials → Create Credentials → OAuth client ID** — *Web
   application*, הוסיפו את כתובת ה־callback תחת *Authorized redirect
   URIs*.
3. העתיקו את *Client ID* ו־*Client secret*.
4. Issuer: `https://accounts.google.com`. גוגל משדר `email_verified`
   לחשבונות מתארחים.

```env
LANCOMPASS_OIDC_ISSUER=https://accounts.google.com
LANCOMPASS_OIDC_CLIENT_ID=<client id>.apps.googleusercontent.com
LANCOMPASS_OIDC_CLIENT_SECRET=<client secret>
```

ואז Settings → Features → Single sign-on: השאירו את מפת הקבוצות ריקה
ובחרו **Default role** (למשל `viewer`). *Deny* הופך כניסות Google
לחסרות משמעות — אין claim למפות.

## Authelia

1. `configuration.yml` — תחת `identity_providers.oidc.clients` הוסיפו:

```yaml
- client_id: lancompass
  client_name: ⁦LanCompass⁩
  client_secret: '$pbkdf2-sha512$…'   # `authelia crypto hash generate pbkdf2`
  redirect_uris:
    - https://ipam.example.com/api/v1/auth/oidc/callback
  scopes: [openid, profile, email, groups]
  token_endpoint_auth_method: client_secret_basic
```

2. אתחלו את Authelia. ה־issuer הוא ה־origin של הפורטל,
   `https://auth.example.com`.
3. ה־scope `groups` משדר claim של `groups` (שמות הקבוצות ב־Authelia) —
   `oidc_role_claim` בברירת המחדל מתאים. `email_verified` משדר עבור
   backends שמסמנים כתובות כמאומתות (LDAP `mail` נחשב מאומת; משתמשי
   file-backend אולי צריכים את הדגל).

```env
LANCOMPASS_OIDC_ISSUER=https://auth.example.com
LANCOMPASS_OIDC_CLIENT_ID=lancompass
LANCOMPASS_OIDC_CLIENT_SECRET=<סוד plaintext — ה-hash נשאר ב-Authelia>
```

## Pocket ID

1. **Administration → OIDC Clients → Add** — שם *⁦LanCompass⁩*, callback
   `https://ipam.example.com/api/v1/auth/oidc/callback`.
2. העתיקו את *Client ID* ו־*Client Secret*.
3. **User Groups** — צרו קבוצות, שייכו משתמשים, וב־client הפעילו *User
   groups* כדי שישודר claim של `groups`.
4. ה־issuer הוא ה־origin של Pocket ID: `https://id.example.com`.

```env
LANCOMPASS_OIDC_ISSUER=https://id.example.com
LANCOMPASS_OIDC_CLIENT_ID=<client id>
LANCOMPASS_OIDC_CLIENT_SECRET=<client secret>
```

## כל ספק אחר

רשימת בדיקה ל־IdP שלא מופיע כאן:

- Client מסוג **authorization-code** סודי (או לפחות עם PKCE) — לא
  implicit, לא device-code.
- Redirect URI בדיוק `{origin}/api/v1/auth/oidc/callback`.
- `{issuer}/.well-known/openid-configuration` מחזיר JSON עם
  `authorization_endpoint`, `token_endpoint` ו־`jwks_uri`, ומיכל ה־API
  יכול להגיע אליו.
- ID tokens חתומים RS256/ES256 ונקודת ה־JWKS מופיעה במסמך ה־discovery.
- תגובת ה־token או ה־userinfo נושאת `email`, `email_verified` ואת claim
  הקבוצות (הגדירו *Role claim* אם הוא לא `groups`).

## ואז ב־⁦LanCompass⁩

1. שימו issuer + client id + secret ב־`.env` (או
   `LANCOMPASS_OIDC_CLIENT_SECRET_FILE` לקובץ סוד ממופה) ואתחלו את ה־stack.
2. Settings → Features → *Single sign-on* → **הפעל SSO**, הגדירו שם
   תצוגה, מלאו **מפת קבוצה → תפקיד** (`{"idp_group": "role"}`) ובחרו
   **Default role** — או *Deny* לסירוב משתמשים לא ממופים.
3. פתחו את דף הכניסה בחלון פרטי: *Continue with <name>* אמור להפנות
   ל־IdP ולחזור מחוברים.
4. בדקו את המשתמש תחת Settings → Users — חשבונות SSO מציגים
   `auth_kind` *sso* ואין להם סיסמה (admin שמגדיר אחת מחזיר את החשבון
   ל־`local` — ה־break-glass למקרה של IdP מושבת).

## פתרון בעיות

| תסמין | סיבה סבירה |
|---|---|
| כפתור הכניסה לא מופיע | `oidc_enabled` כבוי, או issuer/client id חסרים ב־env |
| `sso is not configured` (404) | אותו דבר — env חסר או toggle כבוי |
| `invalid or expired login state` | מעל 10 דקות בין ההפניה ל־callback, Redis רוקן, או cookies חסומים |
| `the IdP did not verify this email` (403) | הספק לא שידר `email_verified=true` (Entra, משתמשי Keycloak לא מאומתים) |
| `no role mapping for this account` (403) | אף קבוצה לא תאמה את המפה ו־default role הוא *Deny* |
| כולם נוחתים על default role | שם claim שגוי או claim חסר — בדקו את הגדרת ה־mapper/scope ב־IdP מול `oidc_role_claim` |
| `IdP endpoint returned HTTP …` (502) | מיכל ה־API לא יכול להגיע ל־issuer — DNS/TLS בתוך המיכל |
