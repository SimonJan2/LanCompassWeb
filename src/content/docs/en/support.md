---
title: "Support Bundle"
description: "A sanitized diagnostics ZIP you download and send to support yourself — what's inside, what's never inside, and how it's built."
category: "system"
version: "0.7.0"
order: 63
---

# Support Bundle

LanCompass usually runs on networks support can't reach. When something
misbehaves — a stalled scan, a dead worker, a migration that won't apply —
the **support bundle** is the safe way to hand over diagnostics: one ZIP,
built on demand, with secrets, addresses and customer data stripped out.

Nothing is collected continuously and nothing is uploaded anywhere — a
bundle exists because an administrator asked for one.

## Getting a bundle

Three equivalent ways:

- **Settings → Support** — *Download support bundle*. Requires the
  `system:admin` permission and is rate-limited to one bundle per minute.
- **API** — `POST /api/v1/system/support-bundle` with a `system:admin`
  token returns the same ZIP, with the same rate limit.
- **CLI** — on the server: `python -m app.cli support-bundle --out /tmp`.
  Works without the api process (it talks to the database and Redis
  directly) and prints the path, SHA-256 and size. `--no-redact-addresses`
  and `--no-logs` relax the defaults when support asks for them.

Every generation writes a [changelog](/docs/changelog/) event with the
options used, byte size and SHA-256 — an audit trail of who exported
diagnostics.

## What's inside

| File | Contents |
|---|---|
| `manifest.json` | App version, schema revision, generation time, options used, and the SHA-256 of every other file |
| `preflight.txt` | The `cli preflight` upgrade-readiness report |
| `health.json` | Database and Redis reachability, versions, memory, worker heartbeat, queue depth, last scheduled runs |
| `license.json` | The licence's state, ID, customer, kind, edition, dates and signing key, the install ID and the evaluation's end — see [The licence](#the-licence) |
| `settings.json` | Every runtime setting and where it came from (db/env/default); secret-valued settings report `set`/`unset` only |
| `env.json` | Which `LANCOMPASS_*`, `SCAN_*`, `BACKUP_*` variables exist — presence only, never values |
| `counts.json` | Row count per backed-up table |
| `backups.json` | Backup files (name, size, schema revision, age) and the last 20 restore-drill outcomes |
| `integrations.json` | Per source and DNS zone: kind, enabled, last status and error — hostnames tokenized, credentials absent |
| `notify.json` | Per channel: kind, enabled, last delivery verdict; 7-day event counts — no URLs or tokens |
| `config.json` | Config-backup posture per driver: device counts, pull verdicts, host-key states, findings by severity |
| `nac.json` | NAC posture: the `nac_*` settings, policies by scope and mode, allowlist, sighting and finding counts, actions by state, the write gate in numbers — no MACs or device names |
| `usage.json` | Only while **Count page visits** is on: page visits per route pattern and week — see [Page visits](#page-visits) |
| `logs/` | The last 2,000 api and worker log records |

A section that fails to build lands as `<name>.error.txt` with a sanitized
error instead of killing the bundle.

## What's never inside

- Device names, serials, hostnames or notes — counts, not rows.
- Config text or stored revision contents.
- Plaintext credentials — passwords, secrets, tokens, SNMP communities,
  SSH keys. Stored credentials stay encrypted and are excluded; the bundle
  reports only *that* a credential exists.
- Docs pages and attachment contents.
- SSH host-key fingerprints or key material.
- Anything from `certs/` — the web tier's HTTPS private key and its
  certificate. No section reads that folder, and the builder drops any
  file under `certs/`; a PEM private key quoted in a log line is masked
  too. To check the certificate itself, use **Settings → General →
  HTTPS** or `python -m app.cli tls status` (see [Settings](/docs/settings/)).
- Session and MFA tokens — live values are collected as redaction
  targets, never written.

## The licence

`license.json` says whose licence the install runs under without asking
the customer: the licence's state, its ID, customer, kind, edition, dates
and the key that signed it, the install ID and its first start, the
evaluation's end, and whether the server's clock is behind the latest time
LanCompass has seen. The licence file itself is never in the bundle. See
[License](/docs/settings/#license) for what each state does.

## Page visits

Which pages a team actually opens is the evidence for reorganising the
navigation later. **Settings → Support → Count page visits** counts them —
**off** by default, and turned on only with the customer's agreement (the
`usage_counts_enabled` setting; `USAGE_COUNTS_ENABLED=false` in `.env`).

- **What a count holds** — the page's route pattern, the ISO week and a
  number. Every segment of the path that is not one of the product's own
  route words is written `[id]`: `/prefixes/[id]`, never `/prefixes/435`;
  an address, a host name, a list's name or a UUID never reaches a count.
  The query string is dropped, and no person is recorded — a visit is
  counted, not who made it.
- **How long** — each week is kept until 12 weeks after it ends, then
  ages out by itself.
- **Where it shows** — the card "Page visits by week — no names, no
  addresses" on Settings → Support lists each route pattern with its
  visits in each of the last 12 weeks that has any ("Nothing counted
  yet." before the first). Only a system admin reads it
  (`GET /api/v1/usage`).
- **Where it goes** — nowhere by itself: the counts leave the install only
  as `usage.json` in a support bundle someone collects, and only while the
  switch is on.

Counting never slows or fails a page: while it is on, the browser sends
one small request per page and forgets it (the server answers 204 whether
it counted or not); while it is off, the browser sends nothing.

## Sanitization

The builder keeps one redactor for the whole archive:

- **Known secrets** — the master key, every decryptable credential this
  process knows, env passwords and connection-string passwords — are
  replaced verbatim, always.
- **Credential-shaped strings** — `password=…`, `Bearer …`, `ipam_…`
  tokens, session cookies, PEM blocks — are masked even with redaction
  off.
- **URLs** keep only `scheme://host:port`; paths (webhook secrets live
  there) are dropped.
- **Addresses**, with *redact addresses* on (the default): every IPv4,
  IPv6 and MAC becomes a stable token — `ip-a1b2c3`, `host-7b9cd4` —
  keyed by a per-bundle secret. The same value maps to the same token
  *inside one bundle*, so support can still correlate lines, but tokens
  differ between bundles.

## Logs

Each api and worker process keeps a bounded in-memory ring of its last
2,000 records — `WARNING` and above from every logger, plus `INFO` from
`lancompass.*`. Once a minute the worker replaces a bounded Redis key
(24 h TTL) with its ring, so a bundle built by the api or the CLI still
carries recent worker output even though they share no filesystem.
Redaction runs when the bundle is built — over every file, including the
logs — so a log line quoting an address or token ships masked.

## Privacy notes

"Sanitized" doesn't mean safe to publish: the bundle still describes your
deployment's shape — table counts, which integrations you run, error
strings. Treat it as operational metadata. Review it locally if you like
(it's a plain ZIP of JSON and text), then send it to support over your
usual channel — and delete local copies when the case closes.

## The pilot

A pilot runs LanCompass under the pilot agreement (`LICENSE` in the
bundle says so). What support covers for its length:

- **Upgrades** — at most one every two weeks. Each is a bundle with a new
  version number and its notes (`CHANGELOG.md` in the bundle), and it
  upgrades from the version you run now (N-1): its `upgrade.sh`, as
  `INSTALL.md` §6 describes, with a backup and a restore drill of its own.
- **Backups** — a fresh install backs up nightly and keeps 14
  (`BACKUP_INTERVAL_MINUTES=1440`, `BACKUP_KEEP=14` in `.env`), and the
  weekly restore drill checks the newest. **Settings → Backup & Restore**
  shows both.
- **Answers** — in Hebrew or English, on business days: a first answer by
  the next business day.
- **A support bundle** — when support asks for one (see
  [Getting a bundle](#getting-a-bundle)).

**How to send a bundle.** Download it in **Settings → Support →
Download support bundle** (or `python -m app.cli support-bundle --out
/tmp` on the server), open it yourself if you like — it is a plain ZIP —
and send it over the channel the pilot agreement names. The changelog
keeps its SHA-256, so both sides can tell which file was sent.

**How the pilot ends.** Both sides leave cleanly, and say so in writing:

1. Keep what you want first — a backup (**Settings → Backup & Restore**),
   a report, an export.
2. In the install folder (the one with `.env`), stop LanCompass and delete
   its data volumes:

   ```sh
   docker compose down -v
   ```

3. Delete the install folder — `backups/`, `certs/` and `.env` are in it —
   and the bundle files you copied. `docker image ls 'lancompass/*'` lists
   the images it loaded; remove them with `docker image rm`.
4. Delete every support bundle you downloaded. Support deletes every
   support bundle it received, and both sides confirm it in writing.

## For a security review

A buyer's security reviewer reads three files: `SECURITY.md` (how an
install is defended), `THREAT_MODEL.md` (what it protects, and from whom;
`THREAT_MODEL.he.md` in Hebrew) and `docs/SECURITY_ANSWERS.md` — the
questionnaire a regulated buyer asks, each answer beside the test or the
file that proves it. **They are in the bundle**, in its folder beside
`install.sh` (the answers under `docs/`), listed in its `SHA256SUMS` and
covered by its signature; a source checkout has them in the repository.
Send the reviewer that pack rather than a summary: the answers are
checked against the code on every test run, so a "yes" there has its
proof in the tree.

## Field kit

When an integration reads your Check Point, FortiGate, vCenter or
directory differently from what the device holds, support needs to see
what the device actually answered. The **field kit** records one
configured source exactly as a sync reads it — the connector's own read
requests and nothing else — and replaces every name, address, MAC address
and secret *before anything is written*. You read the result, search it
for your own sensitive words, and decide whether to send it. LanCompass
never sends it anywhere.

The bundle is a folder of three files: `manifest.json` (the device's
product and version, its counts, the counts LanCompass gets when it
replays the bundle, and how many values each rule replaced),
`exchanges.jsonl` (every request and answer, redacted) and `SHA256SUMS`.
The rules:

| Rule | Replaces |
|---|---|
| R1 secrets | Authorization headers, session ids, passwords, keys, tokens → `<redacted>` |
| R2 IPv4 | Every address → `10.255.x.y` — each /16 to its own, so each /24 stays together |
| R3 IPv6 | Every address → `2001:db8::/32` |
| R4 MAC | Every MAC → a locally administered one, `02:00:5e:…` |
| R5 names | Host names, object names, serials, descriptions, slugs, labels, account names → `host-0001`, `serial-0001`, `text-0001`, `user-0001`; your domains → `pilot.test` |
| R6 URL hosts | The host in every URL → `device.pilot.test` |
| R7 encoded payloads | Check Point run-script output (base64) is decoded, redacted by R1–R6 and encoded again |
| R8 directory values | DNs, `objectGUID`, `objectSid` (→ `S-1-5-21-0-0-0-<rid>`), `sAMAccountName`, UPNs, `dNSHostName`, DNS record data; account flags, timestamps and OS names are kept |

Each original value becomes the same placeholder everywhere in one
bundle, so the recording still replays: support runs it as a test on
every change, and your device is never contacted again.

### The checklist

For your own administrator, with the operator on a call. One source per
bundle.

**Before**

1. Give the source the read-only account its own chapter describes
   ([Check Point](/docs/checkpoint/) — leave *Run One Time Script* off
   unless you agreed to record the runtime tables).
2. Agree with the operator which source is recorded and on which
   LanCompass version; write both down.
3. Record from the LanCompass server that already reaches the device, as
   the source is configured — no new firewall rule, no internet.

**Record**

4. **Settings → Integrations** → the source's row → **Record for
   support** → **Record** (`system:admin`). Or on the server:
   `python -m app.cli fieldkit record --source <id>` — the bundle folder
   lands in `BACKUP_DIR/fieldkit` on the data volume (`--out <dir>` for
   another place). The kit uses the source's stored credentials and writes
   none of them.
5. The recorder sends only the connector's read requests. If the dialog
   (or the command) reports a request that is not a read, the recording
   stops and the bundle is marked unusable: send nothing and tell the
   operator.

**Read before you send**

6. Read *What was recorded* — the device's counts beside the replay's —
   and *Redacted*, the count for each rule (`manifest.json` holds the
   same).
7. Search the bundle (the dialog's search box, or `exchanges.jsonl`) for
   three things you know are sensitive — a host name, an address, your
   domain. Each search must find nothing.
8. **Download bundle**, unpack it and check it: `sha256sum -c SHA256SUMS`.
   Keep a copy yourself.

**Send**

9. Send the bundle to the operator over the channel you agreed (an
   encrypted archive, removable media). The operator turns it into a
   replay test; nobody contacts your device again.
10. Tell the operator what the device really holds that the counts do not
    show (a cluster, a VDOM, a second domain) — that is what the test
    must prove.

Every recording writes a `source.fieldkit` [changelog](/docs/changelog/)
event with the request count, the redaction counts and the bundle's
SHA-256. A source that reads no device (Windows DHCP's uploaded export)
has nothing to record.
