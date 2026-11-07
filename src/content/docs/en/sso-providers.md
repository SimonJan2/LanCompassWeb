---
title: "SSO provider setup"
description: "Step-by-step IdP guides — Keycloak, Authentik, Entra ID, Okta, Google Workspace, Authelia, Pocket ID."
category: "system"
keywords: ""
version: "0.7.0"
order: 59
---

# SSO provider setup

Every provider follows the same shape: register a **confidential**
authorization-code client, give it the callback URL, take the issuer +
client id + secret into `.env`, then map groups to roles in Settings.

The callback URL to register is always:

```
{origin}/api/v1/auth/oidc/callback
```

e.g. `https://ipam.example.com/api/v1/auth/oidc/callback`. Use the URL
users actually browse to (the frontend proxies `/api/*` to the API).
When a reverse proxy hides that origin from the API container, set
`LANCOMPASS_OIDC_REDIRECT_URI` to the absolute URL instead of relying on
detection.

> LanCompass requires `email_verified` in the token/userinfo claims —
> providers that cannot emit it (notably Entra ID) are refused at
> admission. Each guide notes where that claim comes from.

## Keycloak

1. **Realm** — pick or create the realm (e.g. `lancompass`). The issuer is
   `https://keycloak.example.com/realms/<realm>`.
2. **Clients → Create client** — type *OpenID Connect*, client id
   `lancompass`.
3. **Capability config** — *Client authentication* ON (confidential),
   keep *Standard flow* (authorization code) enabled.
4. **Login settings** — add the callback URL to *Valid redirect URIs*.
5. **Credentials tab** — copy the *Client Secret*.
6. **Groups claim** — the `groups` mapper is not on by default:
   *Client scopes → `lancompass-dedicated` → Add mapper → By configuration
   → Group Membership*. Set *Token Claim Name* `groups`, turn *Full
   group path* OFF for plain names (`lancompass-admins`), enable *Add to ID
   token* and *Add to userinfo*.
7. **Groups** — create `lancompass-admins`, `lancompass-operators`, … and add
   users to them. Mark each user's email verified (or turn on *Verify
   email*) — Keycloak emits `email_verified` from that flag.

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
   authorization flow `default-provider-authorization-implicit-consent`
   (or explicit), client type **Confidential**.
2. **Redirect URIs** — strict match, the callback URL.
3. **Signing Key** — pick any RS256 keypair (the authentik self-signed
   certificate works); JWTs must be asymmetric for JWKS validation.
4. Note the *Client ID* and *Client Secret* on the provider page.
5. **Applications → Create** — name *LanCompass*, slug `lancompass`, bind the
   provider. The issuer is per-application:
   `https://authentik.example.com/application/o/lancompass/`.
6. **Directory → Groups** — create groups and add users. authentik's
   default `profile` scope mapping already emits a `groups` claim (the
   group *names*); the `email` scope mapping emits `email_verified`.

```env
LANCOMPASS_OIDC_ISSUER=https://authentik.example.com/application/o/lancompass/
LANCOMPASS_OIDC_CLIENT_ID=<provider client id>
LANCOMPASS_OIDC_CLIENT_SECRET=<provider client secret>
```

## Microsoft Entra ID

Entra does not send the standard `email_verified` claim (its tokens carry
`email` with `verified_primary_email` / `verified_secondary_email`), so
LanCompass refuses its accounts with *"the IdP did not verify this email"*
until you turn on **Trust the IdP's e-mail** (Settings → Features →
*Single sign-on*). Then each account is admitted on its stable `sub`,
named by `upn`, else `preferred_username`, else `email` — see
[Who may sign in](/docs/sso/#who-may-sign-in). Turn it on only for your own
tenant.

1. **Entra admin center → App registrations → New registration** —
   name *LanCompass*, redirect URI type *Web* = the callback URL.
2. **Certificates & secrets → New client secret** — copy the secret's
   **Value** (the Secret ID is not the secret).
3. The issuer is the v2.0 endpoint:
   `https://login.microsoftonline.com/<tenant-id>/v2.0`.
4. **Token configuration → Add optional claim → ID → `email`** — Entra
   does not always include an `email` claim otherwise.
5. **Token configuration → Add groups claim** — choose *Security groups*
   (or *Groups assigned to the application* for a smaller token) and
   emit it in the **ID token**. Group claims arrive as **object GUIDs**,
   not display names — the role map keys must be the GUIDs:

```json
{"3f2c…-guid-admins": "admin", "9d1e…-guid-operators": "operator"}
```

```env
LANCOMPASS_OIDC_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0
LANCOMPASS_OIDC_CLIENT_ID=<application (client) id>
LANCOMPASS_OIDC_CLIENT_SECRET=<client secret value>
```

6. Settings → Features → *Single sign-on*: turn on **Trust the IdP's
   e-mail**, set the role map by group GUID, and leave **Default role** on
   *Deny* so only mapped groups enter.

## AD FS

Active Directory Federation Services (Windows Server 2016 and later)
speaks OpenID Connect through an *application group*. Like Entra it sends
no `email_verified`; its users arrive with `upn` and `unique_name`.

1. **AD FS Management → Application Groups → Add Application Group** —
   *Server application accessing a web API*, or *Web browser accessing a
   web application* with a confidential client. Redirect URI = the
   callback URL; copy the client identifier and generate a secret.
2. **Issuance transform rules** on the application: *Send LDAP Attributes
   as Claims* — `User-Principal-Name` → `upn`, and *Token-Groups -
   Unqualified Names* → `groups` (the group names LanCompass maps).
3. The issuer is `https://<adfs-host>/adfs`.
4. Settings → Features → *Single sign-on*: **Trust the IdP's e-mail** on
   (the account is named by its `upn`), the role map by group name
   (`{"LC-Admins": "admin"}`), **Default role** on *Deny*.

```env
LANCOMPASS_OIDC_ISSUER=https://adfs.example.com/adfs
LANCOMPASS_OIDC_CLIENT_ID=<client identifier>
LANCOMPASS_OIDC_CLIENT_SECRET=<client secret>
```

## Okta

1. **Applications → Create App Integration** — *OIDC – OpenID Connect*,
   application type *Web Application*.
2. **Sign-in redirect URIs** — the callback URL; grant type
   *Authorization Code*.
3. Assign the app to people/groups (*Assignments* tab), then copy the
   *Client ID* and *Client Secret* from *General*.
4. The default **org** issuer (`https://<org>.okta.com`) cannot mint
   custom claims — use the custom authorization server:
   `https://<org>.okta.com/oauth2/default`.
5. **Security → API → Authorization Servers → `default` → Claims → Add
   claim** — name `groups`, include in *ID token* / *Always*, value type
   *Groups*, filter e.g. *Matches regex `lancompass-.*`*.
6. Okta emits `email_verified` via the `email` scope — no extra work.

```env
LANCOMPASS_OIDC_ISSUER=https://<org>.okta.com/oauth2/default
LANCOMPASS_OIDC_CLIENT_ID=<app client id>
LANCOMPASS_OIDC_CLIENT_SECRET=<app client secret>
```

```json
{"lancompass-admins": "admin", "lancompass-netops": "operator"}
```

## Google Workspace

> Google OIDC has **no groups claim** — group→role mapping is
> impossible. Combine with a **default role**, and note the role
> re-syncs to that default on every login (per-user elevation needs a
> different IdP).

1. **Google Cloud console → APIs & Services → OAuth consent screen** —
   User type **Internal** (Workspace only). *Internal* is what keeps
   arbitrary gmail.com accounts out — with a default role set, anyone
   who completes consent is admitted.
2. **Credentials → Create Credentials → OAuth client ID** — *Web
   application*, add the callback URL under *Authorized redirect URIs*.
3. Copy the *Client ID* and *Client secret*.
4. Issuer: `https://accounts.google.com`. Google emits
   `email_verified` for hosted accounts.

```env
LANCOMPASS_OIDC_ISSUER=https://accounts.google.com
LANCOMPASS_OIDC_CLIENT_ID=<client id>.apps.googleusercontent.com
LANCOMPASS_OIDC_CLIENT_SECRET=<client secret>
```

Then Settings → Features → Single sign-on: leave the group map empty
and pick a **Default role** (e.g. `viewer`). *Deny* makes Google logins
useless — there is no claim to map.

## Authelia

1. `configuration.yml` — under `identity_providers.oidc.clients` add:

```yaml
- client_id: lancompass
  client_name: LanCompass
  client_secret: '$pbkdf2-sha512$…'   # `authelia crypto hash generate pbkdf2`
  redirect_uris:
    - https://ipam.example.com/api/v1/auth/oidc/callback
  scopes: [openid, profile, email, groups]
  token_endpoint_auth_method: client_secret_basic
```

2. Restart Authelia. The issuer is your portal origin,
   `https://auth.example.com`.
3. The `groups` scope emits a `groups` claim (your Authelia group
   names) — the default `oidc_role_claim` fits. `email_verified` is
   emitted for backends that mark addresses verified (LDAP `mail` is
   treated as verified; file-backend users may need the flag).

```env
LANCOMPASS_OIDC_ISSUER=https://auth.example.com
LANCOMPASS_OIDC_CLIENT_ID=lancompass
LANCOMPASS_OIDC_CLIENT_SECRET=<plaintext secret — the hash stays in Authelia>
```

## Pocket ID

1. **Administration → OIDC Clients → Add** — name *LanCompass*, callback
   `https://ipam.example.com/api/v1/auth/oidc/callback`.
2. Copy the *Client ID* and *Client Secret*.
3. **User Groups** — create groups, add users, and on the client enable
   *User groups* so a `groups` claim is emitted.
4. Issuer is the Pocket ID origin: `https://id.example.com`.

```env
LANCOMPASS_OIDC_ISSUER=https://id.example.com
LANCOMPASS_OIDC_CLIENT_ID=<client id>
LANCOMPASS_OIDC_CLIENT_SECRET=<client secret>
```

## Any other provider

Checklist for an unlisted IdP:

- Confidential (or at least PKCE-capable) **authorization-code** client
  — not implicit, not device-code.
- Redirect URI exactly `{origin}/api/v1/auth/oidc/callback`.
- `{issuer}/.well-known/openid-configuration` returns JSON with
  `authorization_endpoint`, `token_endpoint` and `jwks_uri`, and the API
  container can reach it.
- ID tokens are RS256/ES256-signed and the JWKS endpoint is listed in
  the discovery document.
- The token or userinfo response carries `email`, `email_verified` and
  your group claim (set *Role claim* if it is not `groups`).

## Then in LanCompass

1. Put issuer + client id + secret in `.env` (or
   `LANCOMPASS_OIDC_CLIENT_SECRET_FILE` for a mounted secret file) and
   restart the stack.
2. Settings → Features → *Single sign-on* → **Enable SSO login**, set
   the display name, fill **Group → role map** (`{"idp_group": "role"}`)
   and choose a **Default role** — or *Deny* to refuse unmapped users.
3. Open the login page in a private window: *Continue with <name>*
   should redirect to the IdP and land back signed in.
4. Check the user under Settings → Users — SSO accounts show
   `auth_kind` *sso* and have no password (an admin setting one converts
   the account back to `local` — the IdP-outage break-glass).

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Login button absent | `oidc_enabled` off, or issuer/client id env incomplete |
| `sso is not configured` (404) | same — env incomplete or toggle off |
| `invalid or expired login state` | over 10 minutes between redirect and callback, Redis flushed, or cookies blocked |
| `the IdP did not verify this email` (403) | provider didn't emit `email_verified=true` (Entra, unverified Keycloak users) |
| `no role mapping for this account` (403) | no group matched the map and default role is *Deny* |
| Everyone lands on the default role | claim name wrong or claim missing — check the IdP's mapper/scope config against `oidc_role_claim` |
| `IdP endpoint returned HTTP …` (502) | API container cannot reach the issuer — DNS/TLS inside the container |
