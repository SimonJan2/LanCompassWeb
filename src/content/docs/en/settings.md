---
title: "Settings"
description: "Every settings section — runtime values, backup, users, appearance."
category: "system"
version: "0.7.0"
order: 55
---

# Settings

The settings area (`/settings`) is a sidebar of sections — each mirrors a
deployment concern. Sections you lack permission for are hidden.

Only an administrator reads the install's configuration. Any other role
sees the display settings only (language, time zone, banner, addresses and
the thresholds the screens draw with): where a section holds more, it says
"the rest of this section is shown to administrators", and General shows
neither the LAN nor the environment summary. The sign-in role maps, the
LDAP filters, the scanner's targets and the database and Redis addresses
never reach a non-administrator — nor an [API token](/docs/api-tokens/),
whose owner's role does not matter here.

## The hybrid settings model

Operational settings follow **`.env` default → database override**:

- `.env` provides the deployment default.
- Saving in the UI writes an `app_settings` row that takes effect without a
  restart (scanner changes reach the worker within a minute).
- Each field shows its **source** (db / env / default) and a reset button
  that deletes the override and falls back to the env value.

## The sections

The sections, in the order of the Settings menu:

| Section | What it does |
|---|---|
| **General** | System info — app version, alembic revision, detected LAN interface/CIDR, env summary, and the **HTTPS** card (below) — the LAN, the env summary and the HTTPS details for administrators only |
| **Features** | Behavior toggles grouped by concern — *Branding* (admin-set topbar banner: `|`-separated phrases with a cycle/marquee/shimmer/static effect and an inline/edge-to-edge top-strip layout, empty = header unchanged), *Scanner reconciliation* (offline marking, grace scans, reactivation, inbox, MAC/hostname/device-type policy), *Scan targeting* (**Auto-create prefixes for scans** — off by default: a scan of a network no subnet covers files nothing and proposes the subnet on the Scans page and in the Discovery inbox; an install that stored it on keeps creating the subnet — and VRF inference), *Discovery inbox* expiry, the **Identity proposal threshold (%)** — 80 by default: a fused identity at or above it is proposed, below it never (see [Who owns an address's values](/docs/addresses/#who-owns-an-address-s-values)) — the **Identities recomputed per tick (hosts)** — 1,000 by default: how many hosts with new evidence one discovery tick fuses (boot default `DISCOVERY_IDENTITY_DRAIN_LIMIT`) — and the decision batches' **Largest decision batch (rows)** (500, an operator's or admin's), **Largest contributor batch (rows)** (50) and **Undo a decision for (days)** (7) (see [Deciding in bulk](/docs/discovery/#deciding-in-bulk)), and **Suggest decommissioning after (days)** — 14 by default: a gone thing is suggested for decommissioning once every source that saw it has been silent this long, at once when a source says it was removed or disabled (boot default `GONE_SUGGEST_DAYS`; see [Gone, decided in one place](/docs/discovery/#gone-decided-in-one-place)), *Data retention* (changelog + scan history auto-purge; **Team-page versions kept per page** — 0, the default, keeps every version, N keeps each page's newest N and every approved one; boot default `LANCOMPASS_DOCS_PAGE_VERSIONS_KEEP`), *Certificates* warn window, *Site cascade*, *Single sign-on* (the toggle, the group → role map, the default role — empty on a new install — and **Trust the IdP's e-mail** for AD FS and Entra ID, off by default; boot default `LANCOMPASS_OIDC_TRUST_IDP_EMAIL` — see [Single sign-on](/docs/sso/#who-may-sign-in)). All defaults reproduce the original behavior, except that a scan no longer creates a subnet by itself |
| **Scanning** | Runtime scanner config: networks, exclusions, schedule, rate limits, timeouts, ports |
| **IPAM** | Capacity thresholds for subnets and ranges (warning and critical, and the alert when one is crossed), and the site planner's templates — how each subnet of a new site is carved |
| **Deep discovery** | The deep discovery profiles (off until an admin enables them), what each one collects, the `no-active-scan` tag that keeps a host out of them, and the **Vendor list (OUI)** card: the IEEE registry shipped with the release, which an administrator can update by uploading the IEEE CSV files — see [Discovery](/docs/discovery/) |
| **Monitoring** | Notification channels (email, webhook, Discord, Telegram, syslog) and their routing, daily and weekly digests (the weekly report digest's **Digest day** and **Digest hour**, Sunday 07:00 in the display time zone by default; boot defaults `LANCOMPASS_REPORT_EMAIL_WEEKDAY`, `LANCOMPASS_REPORT_EMAIL_HOUR` — see [Reports](/docs/reports/)), config compliance rules and compliance packs, maintenance windows, the delivery log and the syslog BOM marker — see [Monitoring](/docs/monitoring/) |
| **NAC** | What feeds port control (link and MAC-notification traps), the responses (quarantine VLAN or port shutdown), rogue-device detection and respecting maintenance windows — see [NAC](/docs/nac/) |
| **Integrations** | Read-only sources — firewalls, hypervisors, controllers, NetBox and Active Directory — with test, preview and sync, and the schedule's **Hold a shrunken answer (%)**: a scheduled answer with fewer rows than this percent of the last good sync's, or none, waits for a person instead of applying (50 by default, 0 turns the hold off; boot default `SOURCE_SHRINK_HOLD_PCT`), and **What a scheduled sync applies**: *New rows and the source's own rows* (the default — every change on a row a person, an import or another source owns waits as a conflict) or *Nothing — every sync waits for a person* (boot default `SOURCES_AUTO_APPLY`, `owned` or `none`), and **What a schedule does with new computers and VMs**: *Propose them in the Discovery queue* (the default — a scheduled sync's new AD computers and VMs wait as a queue group a person creates in one batch) or *Create them as devices* (as before; boot default `SOURCES_SCHEDULE_CREATES`, `propose` or `create` — see [New rows from a schedule](/docs/integrations/#new-rows-from-a-schedule)), and **Read firewall rules every (minutes)**: how often the access and NAT rules of the sources ticked to read them are read — never on the sync schedule (1440, daily, by default; 0 never; boot default `POLICY_SYNC_MINUTES`) — see [Integrations](/docs/integrations/) and [Check Point](/docs/checkpoint/) |
| **Backup & Restore** | Download a `.json.gz` snapshot, restore on any install, schedule recurring backups and restore drills |
| **Support** | Download a [support bundle](/docs/support/) — a sanitized diagnostics ZIP with no secrets or credentials |
| **License** | Whose licence the install runs under and until when, for everyone; the upload, the removal and the licence's details for administrators — see [License](#license) |
| **Account & Security** | Your password, two-factor (authenticator app + recovery codes), and active sessions (revoke others remotely), plus the [secrets-at-rest](/docs/secrets/) master-key status; for administrators, **Links** — read-only links for people without an account (below) — and the directory sign-in card: the groups mapped by SID, the default role, and **Re-check every (minutes)** — how often every directory account is read again (15 by default, 0 turns it off; boot default `LANCOMPASS_LDAP_RECHECK_MINUTES` — see [Deprovisioning](/docs/sso/#deprovisioning)) |
| **Users & Roles** | Admin console — create users, set [roles](/docs/accounts-and-roles/) |
| **Dashboards** | Admin — the [dashboard gallery](/docs/dashboard-gallery/)'s suggestion queue, featured entries (up to six), retired entries, the home / pinned / recommended assignments to roles, users and directory groups, and **Preview as** a user |
| **Appearance** | Theme — Survey (the default), Night chart, Survey · high contrast and Night chart · high contrast; the Classic themes LanCompass Nightwire and Indigo; or System, which follows the operating system: Survey by day, Night chart under a dark one. A browser that held a retired theme opens its successor: Light, LocalSend Mint and NetBox Light open Survey, Dark, LocalSend Dark and NetBox Dark open Night chart, and Indigo carries the night palette that was there before. Effects are calm by default — no ambient motion; Nightwire's scanlines, glitch and HUD stay off until you switch them on. Density, list preferences |
| **Color Rules** | Admin-managed conditional row coloring — see [Row Colors](/docs/row-colors/) |
| **Data & Maintenance** | Purge scans/changelog/discovery, trigger a backup now, factory reset |

## Find a setting

The **Search settings** box at the top of **General** (`/settings`) finds a
setting by its name, so you need not guess its page. Type a word —
*LDAP*, *backup*, *retention* — and it lists, in your language:

- the Settings pages and their sections whose name holds it;
- every runtime setting whose label or description holds it, or whose key
  does, as `.env` and these pages spell it (`backup_keep`, or *backup keep*);
- for an administrator, the settings that live in `.env` alone, by their
  `.env` name (`LANCOMPASS_REPLICATION_PORT`).

Each line names its page; click it to open that page. Only the pages your
role opens are searched. With no match the box says *No setting matches …*.
The words stay in the address (`/settings?q=ldap`), so a search can be
bookmarked or sent.

## Settings that live in .env

Most `.env` settings have a twin in Settings: the `.env` value is only the
boot default, and the page is where the setting lives (the hybrid model,
above). Thirty-five have no twin — the deployment, the secrets and the
single sign-on wiring. Each is shown, read only, on the page it governs
under **Set in .env**, with the value the server runs with. To change one,
edit `.env` and restart the stack.

| Page | Its `.env` settings |
|---|---|
| **General**, *Operations endpoints* | `METRICS_TOKEN` |
| **Features**, *Single sign-on (OIDC)* | `LANCOMPASS_OIDC_ISSUER`, `LANCOMPASS_OIDC_CLIENT_ID`, `LANCOMPASS_OIDC_CLIENT_SECRET`, `LANCOMPASS_OIDC_CLIENT_SECRET_FILE`, `LANCOMPASS_OIDC_REDIRECT_URI` |
| **Monitoring**, *Curated packs* | `LANCOMPASS_COMPLIANCE_PACKS_DIR` |
| **Backup & Restore**, *Warm standby* | `LANCOMPASS_REPLICATION_PASSWORD`, `LANCOMPASS_REPLICATION_PASSWORD_FILE`, `LANCOMPASS_REPLICATION_BIND`, `LANCOMPASS_REPLICATION_PORT`, `LANCOMPASS_STANDBY_MAX_WAL`, `LANCOMPASS_PRIMARY_HOST` |
| **Backup & Restore**, its own card | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `BACKUP_DIR`, `LANCOMPASS_REQUIRE_UPGRADE_BACKUP` |
| **Support**, its own card | `LANCOMPASS_VERSION`, `LANCOMPASS_IMAGE_PREFIX`, `API_PORT`, `API_BIND`, `WEB_PORT`, `REDIS_PORT`, `NEXT_PUBLIC_API_URL`, `COMPOSE_FILE` |
| **Account & Security**, its own card | `LANCOMPASS_PASSWORD`, `LANCOMPASS_PASSWORD_FILE`, `LANCOMPASS_SECRET_KEY`, `LANCOMPASS_SECRET_KEY_FILE`, `LANCOMPASS_ALLOW_INSECURE`, `LANCOMPASS_COOKIE_SECURE`, `LANCOMPASS_HSTS`, `LANCOMPASS_TRUSTED_PROXIES`, `CORS_ORIGINS` |

- **A secret reads *Set* or *Not set*, never its value** — the database and
  replication passwords, the master key and its file, the OIDC client secret
  and its file, `METRICS_TOKEN`. The value never reaches a screen or an API
  answer.
- **A setting only Docker Compose reads** — the ports, the images, the web's
  build, the standby's wiring, `LANCOMPASS_HSTS` — reads *Read by Docker
  Compose, not by the server*: the server cannot see it, so the page says
  where it lives instead of guessing.
- The rows are for administrators only.

Two names look like `.env`-only settings and are not:
`LANCOMPASS_LDAP_DEFAULT_ROLE` and `LANCOMPASS_LDAP_RECHECK_MINUTES` are the
boot defaults of **Fallback role** and **Re-check every (minutes)** on
**Account & Security**'s directory card, where they are edited.

## HTTPS

**Settings → General → HTTPS** shows how the web address is served:
**Built-in HTTPS** on or off, whether the session cookie is `Secure`, and
the certificate in `certs/tls.crt` — its subject, the names it covers,
when it expires, whether it is self-signed, and its **SHA-256
fingerprint**. A browser warns about a self-signed certificate until you
trust it; compare the fingerprint the browser shows with this one before
you continue. From the host the same details come from:

```sh
docker compose exec api python -m app.cli tls status
```

which exits 1 when the certificate expires within 30 days.

- **On or off.** HTTPS is on when `.env` has
  `COMPOSE_FILE=docker-compose.yml:docker-compose.tls.yml`. A fresh
  offline install (`install.sh`) adds that line and generates the
  certificate; upgrades, source checkouts and `install.sh --no-tls` stay
  on plain HTTP. Removing the line and running `docker compose up -d`
  turns HTTPS off.
- **Generated or your own.** The generated certificate is self-signed for
  the host's names and addresses (`python -m app.cli tls init` made it).
  Your own `certs/tls.crt` + `certs/tls.key` replace it and are never
  overwritten; restart the web service after replacing them, and the card
  shows the new fingerprint.
- **Expiry.** Inside 30 days of its end the card warns, and the
  notification event **HTTPS certificate expires** (`tls.expiring`) goes
  out once a day to the channels that route it (Settings → Monitoring).
- **HSTS** is off unless `LANCOMPASS_HSTS=on`: browsers that see it refuse
  plain HTTP to the host for a year, so turn it on only once the
  certificate is stable.

The installation guide (`INSTALL.md` in the offline bundle) has the
commands for each of these.

## Read-only links

**Account & Security → Links** (administrators) is where read-only links
are turned on and kept track of. A read-only link lets someone without an
account — a support vendor for a week — open one page, rack, design or
report as it was when the link was made, and nothing else of the install.
Links are made from **Send outside** (see
[Pages & Attachments](/docs/attachments/)).

- **Off by default.** **Allow read-only links** turns them on; boot
  default `LANCOMPASS_SHARE_LINKS_ENABLED=false`. Turning it off again
  stops every link at once: each answers "not available".
- **HTTPS only.** A link can be made and opened only while HTTPS is on
  (above): over plain HTTP the address would cross the network in clear.
  The card says when HTTPS is off.
- **Days a link works**: 7 by default, 1 to 30 (`LANCOMPASS_SHARE_LINK_MAX_DAYS`).
- **One link per person.** The address is shown once, to the
  administrator who made it; only its fingerprint is stored, so a copy of
  the database opens nothing.
- **The list** shows every link — for whom, what, created (and by whom),
  expires, opens and last opened — and **Revoke** stops one at once; the
  other people's links stay. A link also stops when the person who made it
  is disabled or deleted, and when the master key is rotated
  (`app.cli secrets rotate`).
- **The log.** Each link writes `share.link` when it is made,
  `share.revoke` when it stops and `share.open` — with the address and the
  browser — every time it is opened. An address that tries more than 30
  times a minute is refused for the rest of that minute.
- A link and its file are deleted 30 days after the link expires; a
  restore of a backup never brings a link back.

## Internal targets

LanCompass dials out to what you configure: a source's address
(Integrations), a webhook or Discord URL (Monitoring → channels), a DNS
server (DNS zones). Before it connects, it refuses an **internal target**
— the LanCompass host itself, or the cloud underneath it:

- **this machine** — `localhost`, `127.0.0.0/8`, `::1`. The scanner shares
  the host's network, so from there that is the host's own database and
  Redis;
- **link-local and cloud metadata** — `169.254.0.0/16` (with the metadata
  address `169.254.169.254`), `fe80::/10`, `metadata.google.internal`;
- **the unspecified and reserved blocks** — `0.0.0.0`, multicast, and the
  documentation ranges; `192.0.2.0/24` is LanCompass's own Compose
  network, where its database answers.

Addresses on your LAN (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`,
`100.64.0.0/10`, IPv6 ULA) are never refused — they are what LanCompass is
for. A name is checked by every address it resolves to. A refused save or
**Test** names the host and the address, never the rest of a webhook URL.

When a target really is on this machine — a controller or a webhook
receiver on the LanCompass host — an administrator turns on **Allow an
internal target** for that one source (Integrations → the source →
Connect) or channel (Monitoring → the channel → Configure; webhook and
Discord). Turning it off while the internal address is still there is
refused. DNS zones have no such switch: point a zone at the server's LAN
address. **General → Public address** refuses link-local, metadata and
reserved addresses too; `localhost` stays allowed there.

## Two-factor authentication

Local accounts can add a second factor in **Account & Security →
Authenticator app**: scan the QR (or type the manual key) into any
RFC 6238 authenticator, confirm with a live code, then store the eight
one-time recovery codes — they render exactly once. Existing
authenticator entries keep working after the rename — the secret is
unchanged; only the issuer shown for **new** enrolments is LanCompass.

- Only accounts with a **local password** can enroll — SSO and
  directory users inherit MFA from their provider, and the card says
  so instead of offering a button.
- With MFA on, password sign-in gains a second step: the 6-digit code,
  or a recovery code when the phone is gone. Five bad codes kill the
  pending ticket; repeated failures trip the normal login lockout.
- Secret and recovery-code digests are stored encrypted
  (`totp_secret_enc`, `totp_recovery_enc`); the plaintext appears in a
  response exactly once, at enrollment.
- **Disable** asks for the password *and* a current code (a recovery
  code works too). **Users & Roles → Reset MFA** is the admin escape
  for lost phone + lost codes — it clears the factor and writes an
  `auth.mfa_reset` audit row.

## Backup & Restore notes

- Snapshots cover every data table; **user accounts are excluded by
  default** (admins always are) with an admin opt-in for non-admin accounts.
- Per-site dashboard history (`site_snapshots`) is carried, so a restore
  keeps every site's trend; the estate-wide daily rollup is not — the
  worker rebuilds it from today on.
- Restores are **atomic**, preserve IDs, work on a fresh install, and keep
  you logged in.
- Scheduled snapshots go to a Docker volume (`BACKUP_DIR`), retained per
  `backup_keep`; `backup_interval_minutes=0` means manual only.
- **A new install backs itself up nightly**: the bundle's `.env.example`
  sets `BACKUP_INTERVAL_MINUTES=1440` and `BACKUP_KEEP=14`, so the first
  backup lands the first night. An upgrade keeps its own `.env` (and its
  own value); set `BACKUP_INTERVAL_MINUTES=0` to stop the schedule.
- A drill with no backup to read says so — *No backup yet — take one in
  Settings → Backup, or turn on the nightly schedule.* — and when no
  schedule is on either, the weekly verify sends no
  `backup.verify_failed`: a fresh install's first alert is never a failure
  it could not have avoided.
- A drill of a backup older than the code (an upgrade's pre-upgrade file)
  notes the tables newer than it — *Tables newer than this backup start
  empty: …* — instead of failing: a restore starts them empty too.
- The containers run as a non-root user (`app`, uid 10001), so
  `BACKUP_DIR` — and the import folder inside it — must be writable by
  uid 10001. `install.sh` and `upgrade.sh` set that; a source checkout
  runs this once (the api names the command in its log at start when it
  is needed):
  `docker compose run --rm --no-deps --user 0 --entrypoint chown api -R 10001:10001 /backups`.
- Before a restore you get a **preview**: format version, source app version,
  per-table row counts, and warnings.
- **Restore drills** (the Verification card): a scheduled drill restores the
  newest snapshot into a throwaway `ipam_drill` schema, checks every table's
  row count, probes every foreign key, and field-compares a sampled row —
  then drops the schema. `backup_verify` (`off` / `daily` / `weekly`,
  default weekly) rides the scheduler's daily gate after the backup tick;
  failures emit `backup.verify_failed`, a pass stays quiet except on a
  fail→pass recovery. "Run drill now" works against any stored file.

## Language and region

The install's language (`default_language`, Settings → General) is the
language every signed-out page — sign-in, setup, a read-only link — opens
in, and the one a person who has not chosen their own sees.

- **Setup sets it.** The language the setup page was in becomes the
  install's language when none is stored yet: set up in Hebrew and every
  colleague's sign-in page opens in Hebrew. An administrator changes it
  later in Settings → General.
- **Before anyone chooses**, a signed-out page follows the browser's own
  languages (the first one LanCompass ships), else English — a Hebrew
  machine meets a fresh install in Hebrew.
- **A person's own choice** (the language menu, Settings → Appearance)
  wins over both. Signed in, it is saved to their account as well as to
  this browser, so it follows them: the next time they sign in — from any
  browser, or on a shared PC after a colleague — the pages open in their
  language. Until they pick one, this browser's choice applies, then the
  install's. Choosing the install's default clears the account's.
- **Signed out**, a page knows no account: it shows this browser's choice,
  then the install's language, as above — on a shared PC, the last choice
  made in that browser.
- **Their own alerts** — what the subscriptions they made send them —
  arrive in their language too, unless a subscription names a language of
  its own; a channel's other recipients keep the channel's language, then
  the install's.
- A directory or SSO colleague starts with no language of their own —
  nothing is read from the directory — so the browser's and then the
  install's apply until they pick. An administrator sees each person's
  language in Settings → Users & Roles but cannot set it.

A Hebrew setup also sets the display time zone to Asia/Jerusalem when it
is still the default.

## License

**Settings → License** names whose licence the install runs under — the
customer, the kind of licence, its edition, the dates it runs between and
the days left — for everyone signed in. An administrator also sees the
licence's ID, its features and limits, its notes, the key that signed it,
the **install ID** (with a copy button: support names an install by it)
and the signing keys this build trusts.

A licence is a `.lclic` file that the operator's licence authority,
LanCompassLicense, signs offline. LanCompass checks it on the server, with
no network call; changing one character of the file makes it invalid.

| State | What LanCompass does |
|---|---|
| **Evaluation** | No licence yet: everything works for 30 days from the install's first start. Administrators see a yellow banner in the last 7 days |
| **Valid** | Everything works |
| **Ending soon** | 30 days or fewer left: everything works; administrators see a yellow banner, and a `license.expiring` notice goes out at 30, 14, 7 and 1 days left |
| **Ended — grace period** | The end date has passed: everything still works for the licence's grace (14 days unless the licence says otherwise); everyone sees a red banner, and a `license.grace` notice goes out each day |
| **Ended — read-only**, **Evaluation ended — read-only** | After the grace, or after 30 days without a licence: read-only (below), with one `license.expired` notice |

A licence that is revoked, has not started yet or does not check counts as
no licence; Settings → License tells an administrator why. The notices go
through the channels administrators already set up (see
[Monitoring](/docs/monitoring/)).

**Uploading.** An administrator uploads the file with **Upload a licence
file**. It is checked before it is stored: a file that does not check —
changed after it was signed, signed by a key this install does not trust,
revoked, not started yet or already ended — is refused with its reason,
and the licence in place stays. A renewal replaces the licence it renews.
**Remove the licence** returns the install to its evaluation, or to
read-only once the evaluation has ended. Both are recorded in the
[changelog](/docs/changelog/).

**Read-only.** Every page still opens and every record still reads;
nothing is hidden or deleted. Exports, backups and their drills, and the
[support bundle](/docs/support/) keep working; signing in and out and
two-factor work; and the background work that watches the network —
scans, syncs, polls, monitors — keeps running. A change made by a person
or an [API token](/docs/api-tokens/) is refused with the code
`license_read_only`, and a grey banner says since when. Uploading a valid
licence ends read-only at once.

**The clock.** LanCompass keeps the latest time it has seen and checks the
licence against it, so winding the server's clock back does not stretch a
licence; a clock more than a day behind that time is shown to
administrators. The install record, the clock's mark and the licence
belong to the install: a restore and a factory reset keep them.

## Danger zone

**Data & Maintenance** holds the irreversible tools — factory reset wipes
data tables (users survive), purges truncate history. These are audited and
permission-gated; treat them as such.
