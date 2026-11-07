---
title: "Single sign-on (OIDC)"
description: "Sign in with your identity provider — verified-email admission plus group→role mapping."
category: "system"
keywords: ""
version: "0.7.0"
order: 58
---

# Single sign-on (OIDC)

LanCompass can delegate sign-in to an external identity provider — Keycloak,
Authentik, Entra ID and friends — over OpenID Connect. SSO lands in the
same session machinery as password logins: the cookie, session list and
sign-out behave identically, and **local accounts stay the fallback auth**.

## IdP setup

Register a confidential client (authorization-code flow) with this
redirect URI — per-provider walkthroughs (Keycloak, Authentik, Entra,
Okta, Google, Authelia, Pocket ID) live in
[SSO provider setup](/docs/sso-providers/):

```
{origin}/api/v1/auth/oidc/callback
```

e.g. `https://ipam.example.com/api/v1/auth/oidc/callback`. Then provide
the connection through environment variables — secrets never become
settings fields:

| Variable | Purpose |
|---|---|
| `LANCOMPASS_OIDC_ISSUER` | Issuer URL — `{issuer}/.well-known/openid-configuration` must resolve |
| `LANCOMPASS_OIDC_CLIENT_ID` | Client id |
| `LANCOMPASS_OIDC_CLIENT_SECRET` / `LANCOMPASS_OIDC_CLIENT_SECRET_FILE` | Client secret (`_FILE` wins) |
| `LANCOMPASS_OIDC_REDIRECT_URI` | Optional absolute callback override when a proxy hides the origin |

## Runtime settings

Settings → Features → *Single sign-on* holds the toggle and the mapping:

- **Enable SSO login** — the master switch; the button appears only when
  this is on *and* the env is complete.
- **Provider display name** — the login button reads “Continue with …”
  (default `SSO`).
- **Role claim** — the token/userinfo claim carrying group membership
  (default `groups`).
- **Group → role map** — JSON `{"idp_group": "role"}`; when several
  groups map, the strongest role wins.
- **Default role** — role for verified users no group matched;
  *Deny* refuses unknown users entirely. Empty (*Deny*) on a new install
  — see [Who may sign in](#who-may-sign-in).
- **Trust the IdP's e-mail** — off by default. On, an IdP that sends no
  `email_verified` (AD FS, Entra ID) is trusted: see
  [Who may sign in](#who-may-sign-in).

## Admission rules

- `email_verified` must be true — unverified identities are refused,
  unless **Trust the IdP's e-mail** is on.
- No mapping match and no default role → `403`. Nobody is silently
  let in as a viewer.
- Users are matched by `oidc_sub`, then by email (case-folded). Matching
  a local account links it: `auth_kind` stays `local` and the password
  keeps working as a fallback.
- SSO-provisioned accounts have `auth_kind="oidc"` and no local
  password — the password login path refuses them. An admin setting a
  password converts the account to `local` — the deliberate break-glass
  for an IdP outage.
- Roles re-sync from the IdP on every login — except demoting the last
  administrator, which is skipped so the install never locks itself out.
- IdP-initiated logout is out of scope; sign-out stays a local-session
  logout.
- MFA for SSO accounts is the IdP's job — the local second factor
  (TOTP under Settings → Account & Security) gates only the
  local-password path, including break-glass passwords on
  directory-linked accounts.

## Who may sign in

Both sign-in lanes — SSO and the directory ([Active Directory](/docs/activedirectory/#signing-in-with-active-directory))
— admit an account only through a role: a mapped group, else the lane's
**default role**.

- **A new install admits only mapped groups.** Both default roles start
  empty (*Deny*): an account in no mapped group is refused, not let in as
  a viewer.
- **An upgrade keeps what it did.** An install that had a lane on and never
  chose its default role keeps `viewer` — and the settings page says so
  while it is `viewer`: *“Every directory user who can sign in becomes a
  viewer — map a viewers group instead”* (Settings → Security) and the
  same for SSO (Settings → Features). Map a viewers group, then set the
  default role to *Deny*.
- **Trust the IdP's e-mail** (SSO, off by default). AD FS and Entra ID
  send no `email_verified`, so today's rule refuses every account they
  sign in. With the switch on, such an account is admitted on its stable
  `sub`, named by its `upn`, else `preferred_username`, else `email`.
  That name is not a verified address, so it never links an existing
  account: a clash is refused (`409`) until an administrator links the
  two. Turn it on only for an IdP you run; its role still comes from its
  groups (names from AD FS, object ids from Entra ID).

## Roles by SID

The directory lane reads a user's groups with one read of their
`tokenGroups` — every security group they are in, nested ones and their
primary group included, whatever the user search base. Each group comes
back with its **SID**, its name and its DN.

- **Map groups by SID.** In Settings → Security → *Group → role mapping*,
  **Find a group** searches the directory and **Add** stores the group's
  SID with the role you pick; the page shows the group's name and DN
  beside it. A SID survives a rename, and another OU's group with the
  same name never matches.
- **Older maps keep working.** A name key counts only while it names
  exactly one group in the domain; a name that matches several (two
  groups called *Admins* in two OUs) grants nothing and the page says
  *““Admins” matches 2 groups — pick one by its location”* with each
  candidate's DN. A DN key counts while its DN names a group. **Convert
  to SID** (one key) or **Convert every name to its SID** rewrites the map
  — review it, then save.
- **Test a user** (same page) lists each group's SID, name and DN, which
  map entry matched, and any name refused as ambiguous.
- A directory without `tokenGroups` (not Active Directory) keeps the
  earlier memberOf walk under the user search base.

## Deprovisioning

Every **15 minutes** (Settings → Security → *Re-check every (minutes)*,
`ldap_auth_recheck_minutes`, env `LANCOMPASS_LDAP_RECHECK_MINUTES`; `0`
turns it off) LanCompass re-reads each directory account with the
directory source's read-only service account — by its objectGUID, so a
move or a rename does not lose it:

| The directory says | LanCompass does |
|---|---|
| disabled, expired, locked, deleted, or no longer in a mapped group (while the default role is *Deny*) | disables the account (its state shown), ends every session, refuses its API tokens, logs `auth.directory_disabled` (actor `directory`) and sends the *auth.directory_disabled* event to the channels that take it |
| back to normal | lifts a disable the re-check made itself (`auth.directory_enabled`) — never one a person made |
| different groups | the role follows the map (`auth.directory_role`, before and after) |

- **The last administrator** who can sign in is never disabled or
  demoted by the directory; `auth.directory_kept` records what would have
  happened. Keep a local break-glass administrator.
- **A directory that does not answer disables nobody.** The Active
  Directory source's status turns *Error* with the reason; the next
  successful sync clears it.
- The re-check only reads: the connection is read-only and a pass leaves
  the domain controller's `highestCommittedUSN` where it was.
- A person's own disable (Settings → Users) always wins: the directory
  saying yes again does not lift it.
- The re-check runs while a directory source is selected for sign-in,
  even with *Enable directory sign-in* off — an account's API tokens
  outlive that switch.
