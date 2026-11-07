---
title: "Accounts & Roles"
description: "First-run setup, login, sessions, and the four permission tiers."
category: "getting-started"
version: "0.7.0"
order: 4
---

# Accounts & Roles

LanCompass uses session-cookie login with role-based access control (RBAC)
enforced on every API route — the UI only *hides* what you can't do; the
backend is the authority.

## First run

On a fresh install the UI redirects to `/setup`, where you create the first
administrator account. Alternatively, pre-provision a password with
`LANCOMPASS_PASSWORD` (or `LANCOMPASS_PASSWORD_FILE` for Docker secrets) before
first launch.

## Signing in

Log in at `/login`. Sessions are cookie-based and expire after
`LANCOMPASS_SESSION_HOURS` (default: 168 — one week). Two brute-force
protections apply:

- **5-strike lockout** per (user, IP) pair after repeated failures.
- A per-IP **credential-stuffing backstop** independent of username.

Every sign-in attempt is a row in the [change log](/docs/changelog/) — the
password, two-factor, SSO and directory lanes, successes and failures
alike — with the method (`local`, `ldap`, `oidc`), the IP and the verdict,
never the password. A refused local sign-in reads `denied` (a disabled
account `denied: account disabled`), whether the password was wrong, the
user unknown or the account a directory one; filter the log on `auth.login`
to read them. An attempt the lockout already refuses never reaches the
password and writes no row — the lockout itself is the `auth.lockout`
notification, sent once when it starts.

## The four roles

| Role | Tier | Can do |
|---|---|---|
| **Administrator** | Admin | Everything: users & roles, system settings, backups, all data including deletes |
| **Operator** | Tier-1 | Add, edit and delete data; trigger and download backups. No user management or system settings |
| **Contributor** | Tier-2 | View, add and edit data. Cannot delete, trigger backups, or manage users |
| **Viewer** | Tier-3 | Read-only access to data and reports |

Your tier is shown in the sidebar footer next to your username.

### Where the boundaries sit

- **Settings.** Every role opens the Settings sections it is allowed, but
  only an administrator reads the install's configuration. Every other
  role sees the display settings only — the language, the time zone, the
  banner, the label and Rackula addresses, and the thresholds and switches
  the screens draw with; a section an administrator configures shows them
  a note instead. The sign-in role maps (SSO and LDAP), the LDAP filters,
  the scanner's targets and the database and Redis addresses never reach
  them.
- **Deletes.** A Contributor never deletes — monitor targets, maintenance
  windows, compliance rules and packs, exposure-rule packs and rack photos
  included. An Operator deletes them.
- **The VPN view** (`/vpn`) is read-only at Viewer: every role reads the
  communities and tunnel peers of each Check Point source's last sync.
  The sync's notes, and the source itself, stay with administrators.

## Managing accounts

Admins use **Settings → Users & Roles** to create accounts, change roles, and
reset passwords. An admin can step their own account down once a second admin
exists — you can never lock the last administrator out of adminship.

### Disable or delete

**Disable** (the crossed-out person on the account's row) stops an account
at once and keeps it. It cannot sign in by any lane — password, two-factor,
SSO or the directory — its API tokens stop answering, and every session it
has open ends at that moment: an open tab gets "Sign in to continue" on its
next action. The row wears a **Disabled** badge; the account, its history,
its tokens and its subscriptions stay, and **Enable** gives them back. A
directory or SSO sign-in that succeeds at the identity provider does not
re-enable it — disabling is LanCompass's decision. Each disable and enable
is its own change-log row (`auth.user_disabled`, `auth.user_enabled`)
naming the administrator who did it.

**Delete** removes the account and its tokens for good. Disable when a
person leaves or an account is under review; delete when it should never
come back. Neither works on your own account, and the only administrator
who can still sign in can be neither disabled, demoted nor deleted — a
disabled administrator does not count as the second one.

A change an [API token](/docs/api-tokens/) makes is logged as
`token:<name>` and names the token's owner on the same row (**Token
owner**); when an administrator created the token for someone else, the row
names that administrator too (**Token created by**).

## Your own account

**Settings → Account & Security** lets you change your password and review
active sessions (created time, IP, user agent, expiry). From there you can
also sign out every *other* session while keeping the current one.

These changes need a browser session. An [API token](/docs/api-tokens/)
cannot change a password, set up or turn off two-factor, sign sessions out
or save dashboard preferences — the request answers 403 "use a browser
session", just as a token cannot create or revoke tokens.

## Insecure mode

`LANCOMPASS_ALLOW_INSECURE=true` disables authentication entirely — every request
is treated as an admin. Only use it behind a trusted reverse proxy that does
its own auth; the server logs a loud warning on startup when it's on.
