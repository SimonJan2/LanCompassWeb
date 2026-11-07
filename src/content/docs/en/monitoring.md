---
title: "Monitoring"
description: "Per-target health checks (ping/TCP/HTTP) and notification channels."
category: "operations"
version: "0.7.0"
order: 33
---

# Monitoring

Scans answer "what is out there" in sweeps. Monitoring answers "is it alive
right now": continuous per-target health checks on a dedicated worker lane,
plus **notification channels** that carry state transitions, certificate
warnings, scan failures, source-sync failures, security lockouts and
maintenance events to webhook, SMTP, Discord, Telegram or syslog.

## Targets

A monitor target anchors to **exactly one** object:

- a **device** — the check probes the device's first active IP (falling back
  to its lowest-id address), so renumbering doesn't break the monitor;
- an **IP address** — the check probes that address directly.

Deleting the device or address deletes its monitors — a monitor without a
target has nothing to check. Create targets from **Monitoring**, the
**Monitor** section on a device page, or the IP drawer.

## Check kinds

| Kind | Up means | Fields |
|---|---|---|
| `ping` | any of the echoes is answered in time | — |
| `tcp` | TCP connect succeeds | `port` |
| `http` | GET matches the expectation | `port`, `http_path`, `http_expect` |
| `https` | TLS handshake, then GET matches the expectation | `port`, `http_path`, `http_expect`, `tls_verify` |

`http` requests go to `http://{ip}:{port}{http_path}` (plain HTTP).
`https` completes a TLS handshake with the target first — a TLS port that
accepts the connection and never speaks reads **down**, where a `tcp:443`
check would say up — then sends one GET and closes. The certificate's
expiry is kept on the target (`tls_not_after`) and shown as the days it has
left; with **Check the certificate** (`tls_verify`) the chain and the name
must also be valid, otherwise any certificate is accepted (the usual case
for a device's self-signed one). `http_expect` grammar (both kinds):

- *empty* — any `2xx`/`3xx` status is up;
- `status:NNN` — the status code must match exactly (`status:401` is a neat
  trick for "service is up but auth-gated");
- anything else — a case-sensitive substring matched against the response
  body (e.g. `"status":"ok"`).

## Hysteresis and states

Every target carries `state` (`unknown` → `up` / `down`) and a
`consecutive_failures` counter:

- A **down** transition fires only when failures reach `down_after`
  (default 2) — one dropped packet won't page anyone.
- A **up** transition fires on the first success while `down`.
- `unknown → up` on first contact is silent; `unknown → down` after
  `down_after` failures does alert.

`interval_seconds` (min 5s) controls check cadence per target. The worker
tick runs every minute and hands **every** due target to **one** batched
sweep job, the target checked longest ago first — monitoring never starves
scans; they share the `max_jobs` pool. A target is due when its last check
*started* at least its interval ago, give or take five seconds, so a
60-second target is checked every minute (60 s ± 5 s).

- **The re-check.** A failed check below `down_after` is repeated
  `monitor_retry_seconds` (default 15) after it started, inside the same
  sweep; a target that really is down is therefore confirmed within one
  interval plus the re-check delay (at most 90 s at 60 s and `down_after`
  2), and a one-off loss is cleared by the re-check.
- **The time box.** The sweep stops starting new checks
  `monitor_sweep_budget_seconds` (default 50) after its tick; whatever it did
  not reach stays due and goes first next minute, so no target waits longer
  than its interval plus a minute, whatever the number of targets.
- **The probes.** `ping` sends `monitor_icmp_count` echoes 200 ms apart
  (default 3) and is up if any is answered within `monitor_icmp_timeout`
  (default 2 s); `tcp` connects with `monitor_tcp_timeout` (default 3 s) and
  tries once more when that times out — a refused connection is down at
  once; `http` and `https` use `monitor_http_timeout` (default 5 s). The
  scanner's timeouts no longer decide what a monitor says.
- **The error says which failure it was:** no answer (timed out),
  connection refused, no route to the target, an HTTP status, or a TLS
  problem — in the reader's language on every screen and message.

State columns (`state`, `consecutive_failures`, `last_*`) are written via
bulk updates that bypass the changelog — steady-state probing produces no
audit noise. Only create/edit/delete of the target itself is audited.

## Status legend

Every status in LanCompass is one of seven meanings, each with its own
colour and its own shape, so it still reads in black and white or with
colour-blindness:

| Shape | Meaning | For example |
|---|---|---|
| ● filled circle | OK | an active address, a completed scan |
| ▲ triangle | Needs attention | a reserved address, a certificate close to expiry |
| ■ square | Problem | a monitor that is down, a failed scan, an offline address |
| ○ ring | Information | a DHCP address, a queued scan |
| ▬ dash | Inactive or unknown | a monitor in the unknown state, a cancelled scan |
| ✦ four-point star | Discovered | an address discovery found and nobody documented |
| ◉ circle with a ring | Live | a monitor that is up, a running scan |

On this page the summary cards and each target's badge use the same marks:
up is the live circle with its ring, down the square, unknown the dash.

## What the counts mean

Every count of up, down and unknown — the summary cards here, the
dashboard's monitor gauges and stats, the wall's monitor list, the gallery
entries — is about **live** targets: enabled, and not paused by a retired
device. A disabled or paused target keeps its last state on its row but is
counted apart as **paused**, never as up or down.

The page lists every target, 200 to a page, problems first (down, then
unknown, then up); **Down** shows only the targets that are down, and the
line under the cards says how the checks themselves keep up: **Checks on
time** (the share of the due targets the last sweep reached inside its
time box) and when that sweep ran. The dashboard's **Monitor status**
widget is computed on the server over every live target: its counts are
the whole install's (or the site's), and its rows are the targets down
longest first, each with when it went down. The gallery's **Monitoring
SLA** draws availability over the last 30 days against the 99.9 % target
(see "History and availability").

## How old is this: stale monitors and stopped background work

A monitor's state is only as current as its last check. A live target
that nobody checked for `monitor_stale_factor` of its intervals (default
3: a 60-second ping not checked for three minutes) is **stale**: it keeps
its last state, but the chip is greyed and reads **Not checked for 12
min**. The stale ones are counted apart — "3 stale" beside the counts on
this page, on the **Monitor status** widget, on the Monitors stat and on
the device page — and they still count in up, down and unknown, because
that is the state they last showed. A target of the loaded demo estate
keeps its own **Demo — not checked** label and is never stale.

The device page's monitor row answers "down since when, checked when":
the state, **since** the moment it last changed, **checked … ago**
(always, even while it is up), and the probe's error on its own line
below.

The checks, the SNMP polls, the trap listener and the scans all run from
the scheduler's minute tick. When that tick is older than
`worker_stale_seconds` (default 180), every page and the wall show one
status line: **Background work stopped 12 min ago — checks, SNMP, traps
and scans are not running; what you see is from 10:18 PM**. It never
blocks the page; it goes away by itself at the next tick. If the line
cannot be read, a quieter **Cannot read background status** takes its
place. The same facts are `GET /api/v1/system/liveness`: the last tick,
the monitor lane's last sweep end, the SNMP lane's last pass end and the
trap listener's last receive. Restart the stopped container (`docker
compose up -d`) to bring the work back; to see the line later, raise
`worker_stale_seconds`.

## History and availability

Every state change a monitor makes is kept: when it happened (the moment
the check that saw it started), from what to what, the probe's error, the
maintenance window that silenced its notification and whether the sweep or
a check by hand wrote it. The upgrade that brought history writes one row
per enabled target with its state at that moment; nothing before it is
kept, and an earlier day reads **not kept**, never 100 %. When a target was
not being checked for a while — disabled, on a retired device, the lane
switched off, the worker stopped — the first check after it records that
stretch as **not checked**, from one interval after the check before it.

Each day (in the install's display timezone) is rolled up per live target
once it is over, by the first scheduler tick after midnight: seconds up,
down, inside a maintenance window and not checked. The figure is

**Availability = up ÷ (up + down)**

summing the seconds of every target and every day before dividing — never
a mean of percentages. Time inside a maintenance window over the target
and time nobody checked are left out of the ratio and shown apart. An
operator who signs SLAs that include maintenance can switch
`availability_counts_maintenance` on: a window's downtime then counts as
down and its uptime as up, and every figure says which formula it used.
Transitions and the daily rows are kept `monitor_history_days` (400 by
default); each target keeps the newest transition before that cutoff, the
state it carried into the kept period.

To ask "was it down at 03:00 yesterday, and for how long?":

- the device page's **Availability** card per target: a 7-day strip (red
  where it was down, hatched where a window covered part of the day),
  **Down since** or **Up since**, the 7-day and 30-day figures, and the
  **Was it up at…?** box — pick a time and it answers with the state then,
  since when, until when and for how long;
- on this page, a row's **last change** opens its history: the last 20
  transitions, newest first;
- **Reports → Availability** — per site and its 20 lowest targets over the
  last 30 complete days, with the formula sentence, on screen, in print
  and in the workbook;
- the API: `GET /api/v1/monitor-targets/{id}/history?since=&until=` (up to
  1,000 transitions), `…/{id}/state-at?at=`, `…/{id}/availability?days=`
  (daily rows and their total), and `GET /api/v1/availability?site_id=&from=&to=`
  (per site and per target, with the formula used); all read with the same
  permission as the targets themselves;
- who was told: every delivery row of a monitor event names its target —
  `GET /api/v1/notification-log?monitor_target_id=`.

The dashboards' **Availability** gauge and bullet (`availability_pct`, 30
days), the **Availability** series and the **Availability strip** widget
read the same rolled-up days ([Dashboards](/docs/dashboards/)).

## Incidents

An outage is one object, not forty rows. When targets of one site go
down together, the channels hear about the **site** once — "North Branch
unreachable — 40 targets down (first: nb-dev-01 · 10.0.1.1)" — and once
more when it is back, with how long it lasted: "North Branch back after
9 min — 40 targets". Forty targets cost two messages per channel, not
eighty.

- **Grouping** — `incident_site_min` targets of one site (default 3) going
  down in the same round open a **site incident** (`incident.opened`); a
  target of that site going down within `incident_group_seconds` (default
  180) of its opening joins it silently. Fewer targets are **target
  incidents**, told as before (`monitor.down`). A target's site is its
  device's (or its rack's), or its address's prefix's — the same rule as
  maintenance windows. `notify_group_by_site` off: one message per target,
  as before v151.
- **Recovery** — a site incident closes, and `incident.resolved` is told,
  when the last of its targets answers again; the targets that come back
  before it are not told one by one. A target incident's recovery is
  `monitor.up` with the duration: "web-01 answers again after 12 min".
- **Flapping** — a target whose state changes `flap_transitions` times
  (default 6) inside `flap_window_minutes` (default 30) is **flapping**:
  the change that makes it so is told as `monitor.flapping` ("web-01 is
  flapping — 6 changes in 30 min"), every change after it is silent,
  and `monitor.flapping_stopped` follows once it has held one state for the
  whole window — two messages for the whole flap, however long it lasts.
- **The page** — **Incidents** (`/incidents`), in the sidebar's
  Operations group right after Monitoring, so the page an alert leads to is
  one click from every page (Monitoring and the Incident banner link to it
  too). It lists 50, open
  first and the worst first (the most targets at the peak): each with its
  targets and their first failed check, how long it lasted (or has lasted),
  the messages sent per channel for it (delivered, failed, attempts) and its
  latest 20 transitions — the whole timeline is one click away.
  `GET /api/v1/incidents?state=open|resolved&site_id=&limit=` (50 by
  default, at most 200) and `GET /api/v1/incidents/{id}` (one incident,
  up to 200 transitions) read the same, for any reader.
- **The wall** — the **Incident banner** widget shows the open incidents,
  worst first (most targets down, then the oldest), each with how many
  targets are down and for how long; Night Watch opens with it at full
  width ([Dashboards](/docs/dashboards/)). The **Incidents** series counts
  incidents opened per day, by the incident's own site.
- **Kept** — a resolved incident goes with the history it summarises
  (`monitor_history_days`); an open one stays. Incidents travel in backups.
- **The root** — when a site incident opens or grows it names the device
  that took the others down: the down target whose device every other down
  target's device reaches the site's gateway through (the device holding a
  prefix's gateway address at the site, else its router, else its
  firewall), over documented cables and direct LLDP/CDP neighbours — never
  a "behind this port" guess. The message and the page say it first:
  "Root: hq-dist-1 — 5 more unreachable behind it", and the page lists the
  five under it. When no single device explains the others (two unrelated
  switches down, a site with no known gateway, a device on no documented
  cable), the incident names no root: a wrong root is worse than none.
  Incidents from before this release name none.
- **Suppressing the children** — off by default. List a site's id in
  **Settings → Features → Topology → Suppress the children of a down root
  at these sites** (`incident_parent_suppress_sites`) and, while a root is
  down there, the devices behind it send no message of their own — no
  `monitor.down` for them, no recovery, and no `incident.opened` for an
  incident made only of them; their states, their incidents and the root's
  incident still record everything. The root's own message, and the site
  incident it is in, are told as before.

### Owning an incident: acknowledge, repeats, escalation

An incident has one owner, and everyone can see who.

- **Acknowledge** — on the incident's card, **Acknowledge** with an
  optional note (up to 500 characters) makes you its owner (`data:write`).
  Every channel and subscriber its opening message reached is told —
  "North Branch: alice is on it — on my way" (`incident.acknowledged`) —
  whatever their event filters. A second person pressing it is told who
  already has it. The card, the Review section and the wall's banner show
  "Owned by alice · 12 min". **Release** lets it go at a shift change (the
  owner, or an administrator); the incident is nobody's again. Both are in
  the audit trail. `POST /api/v1/incidents/{id}/ack` `{"note": "…"}` and
  `POST /api/v1/incidents/{id}/unack` do the same.
- **Repeats** — while an open incident has no owner, it is told again every
  `incident_repeat_minutes` (default 30; 0 = never), counted from the
  moment it was first told, to the same channels and subscribers:
  "Still open, nobody on it: North Branch — 40 targets down for 1 h"
  (`incident.repeat`). A worker that was stopped sends one repeat, not
  every one it missed.
- **Escalation** — an open incident still without an owner after
  `incident_escalate_minutes` (default 15; 0 = never) is sent once to the
  channels chosen as `incident_escalation_channel_ids` in **Settings →
  Monitoring** — "Escalated: North Branch down for 15 min, nobody has
  acknowledged" (`incident.escalated`). Nothing escalates until a channel
  is chosen.
- **Quiet hours and digests** — repeats and escalations obey a
  subscriber's quiet hours (held for the message at the window's end) and
  never wait in a daily digest: they are for now or not at all.
- **Silence** — **Silence for 1 h**, **Silence for 4 h** or **Silence until
  resolved** on the card creates a one-off maintenance window over the
  incident's targets, named "Silenced from incident 12" and created by
  you; while it runs the incident is not told again (its resolution
  included, as with any window). "Until resolved" ends when the incident
  resolves. `POST /api/v1/incidents/{id}/silence` `{"for": "1h" | "4h" |
  "resolved"}`.
- **The link** — with `public_base_url` set, every `incident.*` message
  ends with the incident's address (`/incidents?focus={id}`) on its own
  line, so the reader lands on the buttons after signing in. A link that
  acknowledges by itself is deliberately not offered.
- **Review** — the **Monitoring incidents** section opens the Review queue:
  the open incidents and those resolved in the last 24 hours, each with its
  site, how many targets, how long and who owns it.

### Delivery: off the check path, with retries

Every delivery — one event to one channel or one subscriber — is a job on
the notification lane, its own queue in the scanner worker with its own 16
slots: the sweep and the trap handler only hand the message over, so a
channel that hangs costs its own job's timeout and never the next minute's
checks. A failed delivery is tried again after 30 s, 2 min and 10 min
(`notify_retries`, default 3, 0–5; a fourth and fifth wait 30 and 60 min);
each attempt is a row in the delivery log with its number, so "three
retries, then given up" reads in the log.

Events raised in the API (an IP request, an import) take the same lane as
the worker's own (a monitor going down, a scan failing): the scanner
worker sends them all, with its names, routes and network. With no worker
running, the API's events wait in the queue and go out when it starts.

A channel **Test** takes the lane too: the scanner worker runs it, exactly
where a real event would leave, and the page waits up to 15 seconds for
its answer — so a Test that passes is a delivery that works, and a name
only the API's container resolves fails the Test just as it would fail the
event. With no worker answering in time the Test says so ("No worker
answered within 15 seconds") and sends nothing later; a worker that took
the Test but has not finished says it is still running, and the result
lands in the delivery log. A passed Test reads "Sent from the scanner
worker".

An external event sent through `POST /api/v1/events` with a `dedup_key` is
answered once: the same token sending the same key again within
`event_dedup_minutes` (default 60) gets the first event's id and nothing
is sent again — so a refused (`429`) or uncertain event can simply be sent
again ([API tokens](/docs/api-tokens/)).

## Notification channels

Every event fans out to each enabled channel **whose event filter selects
it** — `events = null` means "everything" (the default, so existing channels
are unchanged), and a filter set mixes exact event types with `prefix.*`
wildcards (`monitor.*`, `auth.*`, `source.*`, …). The wizard's **Events**
step is the same declared vocabulary `emit()` routes by — exact match or
`prefix.*` only. A skipped channel writes no log noise: a skip is not a
delivery attempt. Base routing is **per-channel**; per-user subscriptions
layer on top for channels flagged `subscribable` (below).

Delivery failures are recorded in the notification log — a broken channel
never breaks a check.

| Kind | Config (plain `config`) | Secret (`secret_enc`, write-only) |
|---|---|---|
| `webhook` | HTTP method (`POST`/`PUT`) | Webhook URL — tokens in the path are why it's encrypted |
| `discord` | — | Discord webhook URL |
| `telegram` | `chat_id` | Bot token |
| `smtp` | host, port, from, from_name, to\[], starttls, username | Password (optional) |
| `syslog` | host[:port] (default 514), proto (`udp`/`tcp`), facility (default `local0`), `audit_forward` (default `false`) | — none — the wire is plaintext by design |

Payload shapes:

- **webhook**: `{"event": "monitor.down", "summary": "…", "payload": {…}, "ts": "…"}`
  — the event id is a field here, for integrations
- **discord**: the summary in bold as `content` text — no event id
- **telegram**: `sendMessage` to `chat_id` with the summary — no event id
- **smtp**: a designed mail — the subject is `<summary> · LanCompass`
  (no event id, so a Hebrew subject reads right to left); the body is the
  summary, the payload fields a person reads, each under its label
  (Target, IP address, Error…), and the time in the install's
  `display_timezone` with the zone named ("Time: 2026-10-22 00:30 (Israel
  time)"); a last line says which language the mail is in and where to
  change it. A plain-text part comes first and an HTML part follows — set
  right to left for Hebrew, Arabic and Persian, every value isolated — and
  the `Content-Language` header names the language
- **syslog**: one RFC 5424-lite line per event —
  `<PRI>1 <ts> <host> lancompass[pid]: <EVENT_TYPE> <summary> k="v"…`
  where PRI = `facility*8 + severity` (failures/security/maintenance → err,
  traps and anomalies → warning, recoveries/reports → info). Payload scalar
  fields ride as `key="value"` pairs; anything secret-shaped is dropped.
  The line carries no bidi control characters, and a message that is not
  plain ASCII (a Hebrew summary) starts, after the event type, with the
  UTF-8 byte-order mark RFC 5424 asks for — turn `syslog_bom` off if your
  collector shows it as a stray character.
  Syslog is **plaintext honesty** — event text only, never secrets or
  credentials; route it on a trusted segment. UDP is fire-and-forget (the
  syslog contract); `tcp` sends RFC 6587 octet-counted framing over a
  one-shot connection.

### Audit forward

Event routing forwards the *notifications* the system chooses to emit.
A syslog channel can additionally forward the **audit trail itself** —
every changelog row, create/update/delete with actor, object and field
diffs — by enabling **Forward audit trail** in the channel wizard
(`config.audit_forward`, off by default, syslog only).

Once enabled, the worker's every-minute tick streams new rows to the
collector, one RFC 5424-lite line each:

```
<PRI>1 <ts> <host> lancompass[pid]: AUDIT id=<row> ts=<row ts>
    actor=<who> action=<verb> object=<type>#<id|-> repr="<repr>"
    changes=<json, ≤500 chars>
```

- `id` is the `change_log` id — a resend after a failed tick carries the
  same id, so a SIEM can dedupe. `changes` is the terminal field
  (whitespace-flattened JSON, truncated at 500 chars — parse it with
  `changes=(.*)$`; the full diff is one export call away). Severity is
  `warning` for deletes, `info` otherwise; facility follows the channel.
- The feed is **watermark-driven**: `app_settings._audit_cursor` stores
  the last `id` every enabled forward channel accepted. The cursor only
  advances past fully-sent rows — a restart resumes mid-table, never
  replays the whole trail and never skips. A stalled channel holds the
  watermark for everyone (duplicates beat gaps); its failures land in
  the delivery log as `audit.forward` rows.
- Rows whose diffs carry a sensitive-looking field name are withheld as
  `[redacted]` — the write-time secret filters already keep `*_enc`
  blobs out of the trail; this is the belt-and-suspenders read pass.

Secrets follow the [secrets contract](/docs/secrets/) — AES-256-GCM under the
master key (`LANCOMPASS_SECRET_KEY`/`_FILE`), write-only in the API (`secret_set`
is all a client sees). Without a configured master key, channel create/test
returns `503`.

### The channel wizard

Create/edit is a guided journey — **kind → configure → events → test** —
not a flat form:

- **Kind** — the five kinds as cards with a one-line purpose each.
- **Configure** — per-kind fields. SMTP gets provider presets (Local
  relay / Gmail / Microsoft 365 / Custom) that *fill* the fields without
  hiding them — presets are convenience only, everything stays editable.
  Port chips (25/465/587/custom) set the TLS mode and say it in words:
  `465 → implicit TLS`, `587 → STARTTLS upgrade`, `25 → plaintext relay
  (LAN only)` — the footgun becomes a decision, and a plaintext posture
  gets an honest amber hint instead of a hidden trap.
- **Events** — the routing set: "all events" (default) or a grouped
  multiselect of the declared vocabulary, exact types and `prefix.*`
  wildcards.
- **Test** — exercises the *draft* config before saving
  (`POST /notification-channels/test`, throttled per user — a draft-test
  endpoint can't become a spam/relay oracle). For SMTP this renders the
  **diagnostic ladder** — `resolve → connect → tls → auth → send` — each
  stage with pass/fail, millisecond timing and the real server error on
  the rung that broke ("auth: 535 credentials rejected", not "send
  failed"). A `send to` override redirects the test to a single address so
  probing a new relay can't fan out to the ops list. A red or skipped test
  warns but never blocks saving — some relays legitimately refuse test
  traffic.

The saved-row **test** button uses the same ladder over the stored
credentials, run by the scanner worker like every Test (above). Channel
rows carry the **last real delivery** — a green "last sent", or a rose
"last failed" with the transport's error beside it, from the delivery log;
a Test, an event queued for a digest and one held by quiet hours are not
deliveries, so a channel whose events never left says "never delivered" —
plus a transport-posture badge (`TLS`, `STARTTLS`, `plaintext`,
`udp`/`tcp`), and a subscribable channel wears **Subscribers only** (it
never broadcasts; below). The test email itself
is a designed body — instance, channel, actor, the time in the install's
zone and the event set the channel carries — with the same HTML part and
language line as an alert.

Each channel can pin a **notification language**: empty follows the
install's `default_language`, and any shipped locale can be picked — the
same event lands Hebrew on the ops Telegram and English on the SIEM
webhook. A new channel starts in the language of the admin who creates
it. A personal subscription's own language beats the channel's for that
subscriber. The notification log records the rendered locale per delivery.

## Personal subscriptions (quiet hours & digests)

Channels decide *where* events go; **subscriptions** decide *who* gets
them and *when*. A channel flagged **Users can subscribe** (Events step)
becomes a subscription-only sink — it never broadcasts on its own; its
`events` set turns into the *ceiling* subscribers pick inside. Flagging an
SMTP channel once lets every operator opt in on their own terms — "I want
`monitor.*` and `source.sync_failed` to the ops mailbox, nothing else".

**Settings → Security → Notifications** is self-service: every signed-in
user lists, creates, edits and deletes *only their own* subscriptions
(there is no admin path into another user's settings — admins manage
channels, users manage subs). The pick list shows name/kind/locale and
the channel's routing ceiling — never config or secrets. A subscription
carries:

- **events** — the same vocabulary as channel routing; empty means
  "everything the channel routes". The effective set is always the
  intersection with the channel's ceiling.
- **cadence** — `instant` sends each matching event as it happens;
  `daily digest` queues matching events in Redis and delivers **one**
  roll-up at the picked UTC hour (the picker labels each option with your
  local equivalent). A queue caps at 200 events — the oldest drop and the
  digest says how many were discarded; a failed flush requeues rather
  than losing events. The digest opens with one line per kind of event
  and its count ("80 × monitor checks"), then the outage — incidents,
  monitors, link traps, VPN tunnels — before anything else, then the rest,
  up to 50 lines.
- **quiet hours** — an optional window (e.g. 22:00–07:00, overnight
  ranges wrap midnight, weekdays optional) that *holds delivery, never
  events*: a held instant event still writes a log row marked
  **suppressed**, so the audit trail proves silenced ≠ sent, and when the
  window ends the subscriber gets **one** message with everything it held
  — "While quiet hours were on: 140 events, 2 still open" and the lines,
  the outage first (same cap as the digest). The digest cadence *is* the
  overnight buffer — quiet hours don't hold events for a digest
  subscriber, they ride the roll-up.
- **language** — optional per-user override that beats the channel's
  locale for that subscriber's deliveries only.
- **enabled** — pause without deleting.

The log row stamps the subscription owner (`for <user>`) on every
sub-routed attempt, suppression or digest — broadcast rows stay
unattributed. The per-sub **test** button fires the channel's canned
test through the subscription (same staged ladder, rendered in the sub's
locale, throttled like the admin test); it reports — never enforces —
whether quiet hours are active right now.

## Maintenance windows

Planned work shouldn't page anyone. A **maintenance window**
(**Settings → Monitoring**) is a named, scoped, scheduled *silence*:
while a window is active, matching monitor targets still run checks and
still record every state transition to history (`state`,
`last_change_at`, the works) — only the notification is suppressed.
Hidden state is worse than noisy state, so a silenced flap keeps its row
on the board and shows a **silenced** chip naming the window that caught
it ("down · silenced by Patch Sunday").

- **Scope** — `all` silences every enabled target; `sites` silences
  targets whose effective site is in the list (device site — or its
  rack's — and address targets via their prefix's site); `targets`
  silences the picked monitor targets only. Scope lists cap at 500 ids;
  saving a window that currently matches nothing warns rather than
  blocking.
- **Time** — `start_at` is a UTC instant; the picker works in your
  browser timezone and converts. One-off windows run
  `[start, start + duration)` — start inclusive, end exclusive — then
  go inert forever. `weekly` repeats on the picked `weekday` at
  `start_at`'s UTC time-of-day, starting with the first aligned instant
  that isn't before `start_at` itself; a duration may cross midnight and
  week boundaries honestly.
- **Next occurrence** is computed server-side — the card renders it
  verbatim, no browser-side recurrence math.
- **Traps** — a window also covers the SNMP traps of the devices in its
  scope (a device at a covered site, a device that owns one of a
  `targets` window's monitors — directly or through one of its
  addresses — or any device under `all`): their `link.*`,
  `device.restarted`, `vpn.*` and `vcenter.alarm` events page nobody,
  and the trap log keeps each trap with the event and the window
  ([SNMP → The trap log](/docs/snmp/)). `snmp.auth_failure` is never
  silenced.
- **The window's end** — a target the window silenced that is still down
  when it ends is told once, `monitor.still_down` ("nb-dev-12 is still
  down after maintenance “Patch Sunday”"), and opens its
  incident; its recovery is then told with how long it was down. A target
  whose down the window silenced and that answers again is never told
  recovering: no "answers again" for an outage nobody heard of.

Create/edit/delete rides the audit log like any config; windows travel
in backups. A disabled or expired window is inert — it never matches.

## Event sources

One service emits every event:

- `monitor.down` / `monitor.up` — target state transitions only (`monitor.up`
  says how long the target was down);
- `incident.opened` / `incident.resolved` — a site's outage and its end,
  once per channel; `monitor.flapping` / `monitor.flapping_stopped` — the
  flap rule; `monitor.still_down` — a maintenance window ended on a target
  that is still down ([Incidents](#incidents));
- `cert.expiring` — certificates within `cert_warn_days`, once per cert per
  day;
- `scan.failed` — watchdog-reaped and worker-restart-failed scan jobs;
- `mac_mismatch` — a stored-vs-seen MAC disagreement, once per flag;
- `source.sync_failed` — a scheduled source sync flips ok→error, then at
  most once per 24h while it stays dead (a dead connector nags daily, not
  minutely); `source.sync_recovered` fires once on the error→ok flip;
- `auth.lockout` — the *transition* into a credential-stuffing lockout,
  per-user and per-IP-aggregate (`scope` says which); per-attempt failures
  stay silent;
- `maintenance.purge` / `maintenance.factory_reset` — destructive
  maintenance ops, carrying the audit actor;
- `backup.failed` — a scheduled backup job fails;
- `import.commit_failed` — an import batch fails to commit;
- `link.down` / `link.up`, `snmp.auth_failure`, `cable.mismatch` — SNMP
  trap-derived events;
- `report.requested` / `report.scheduled` — report generation and the
  weekly digest;
- `ipam.capacity` — a subnet or a DHCP or pool range rose past its warning
  or critical threshold, or fell back under the warning one: once per
  crossing, from the daily snapshot writer (at most every 15 minutes),
  never again while it stays above. Thresholds are per subnet and range,
  else the install's (Settings → IPAM, 80 % and 95 %); the message names
  the subnet, its site, its utilization and its projected full day
  ([Subnets → Capacity](/docs/subnets/)).

## Monitoring tools

LanCompass keeps each target's current state, its transitions, its daily
availability and the incidents; the series, the dashboards and the paging
stay with the monitoring tool a team already runs. Nothing below is
stored as a series by LanCompass: every value is read when it is asked
for. Setup for each tool: [Integrations → Monitoring tools](/docs/integrations/#monitoring-tools).

**The scrape.** `GET /metrics` answers in the Prometheus text format,
every series with its `# HELP` and `# TYPE`:

- `lancompass_monitor_targets{state}` — live targets (enabled, not paused
  by a retired device) by `up`, `down`, `unknown`; every state always
  present, at 0 too;
- `lancompass_monitor_targets_late` — live targets not checked for
  `monitor_stale_factor` intervals (the stale ones above);
- `lancompass_monitor_sweep_seconds`,
  `lancompass_monitor_last_sweep_timestamp_seconds` — the last sweep's
  duration and its end;
- `lancompass_scheduler_last_tick_timestamp_seconds` — the scheduler's
  last minute tick: when it stops moving, background work stopped;
- `lancompass_notify_deliveries_total{kind,result}` — deliveries by
  channel kind and `ok`, `failed` (each attempt), `held` (quiet hours) or
  `digest`; counters in Redis that restart at 0 with it, which `rate()`
  handles;
- `lancompass_incidents_open`, `lancompass_incidents_unowned` — open
  incidents, and those nobody acknowledged;
- `lancompass_snmp_devices_due`, `lancompass_snmp_last_pass_seconds` —
  SNMP devices due for a poll now, and how long the last pass took;
- `lancompass_tunnels{state}`, `lancompass_interfaces_flagged` — firewall
  VPN tunnels by `up`, `down`, `unknown` and the ports taking errors, as
  the SNMP health poll last read them ([SNMP → Device health](/docs/snmp/#device-health)).

A value the app has not recorded yet (no sweep, no tick, no SNMP pass
since Redis started) is left out, never shown as 0.

**Per target, behind a token.** `lancompass_monitor_up{target_id,site}`
(1 up, 0 down; a target in `unknown` is left out) appears only when the
server has `METRICS_TOKEN` set and the scrape presents it as a bearer
token. Its labels are the target's id and its site's slug — never an
address or a hostname. Without the token, or with a wrong one, the scrape
gets the aggregate series only.

```yaml
scrape_configs:
  - job_name: lancompass
    scrape_interval: 15s
    static_configs:
      - targets: ["ipam.example.com:8001"]
    authorization:
      credentials: the-METRICS_TOKEN-value
```

The API answers on `API_BIND:API_PORT`: `127.0.0.1:8001` with a `.env`
made from `.env.example` since V134, `0.0.0.0:8001` with an older one. On
loopback a Prometheus on another host needs `API_BIND` set to an address
it reaches (`0.0.0.0`), or a reverse proxy that passes `/metrics`.

**Alerts in.** `POST /api/v1/events/alertmanager` takes the Alertmanager
webhook body (version 4) with an API token holding `data:write`. Each
alert becomes the external event `external.alertmanager.<alertname>`
(lowercase) on every channel that takes all events, with the `dedup_key`
`{fingerprint}:{status}:{startsAt}`: Alertmanager's repeats and retries of
the same alert in the same state arrive once. A firing alert reads its
`summary` annotation, else its `alertname` and `instance`; a resolved one
reads "Resolved: …" in the channel's language. An alert whose `instance`
host is a device's primary address, its name or its address's hostname is
recorded on that device (`entity.device_id`); an unknown host, or one two
devices share, is recorded on none, and nothing is ever created. The rate
limit (60 a minute per token) counts alerts, not requests: when some are
refused the answer is `429` with `Retry-After`, and the re-sent body costs
the taken ones nothing. At most 100 alerts a request (`413` above); each
alert's labels and annotations are cut to fit 4 KB, and the payload then
says `"truncated": true`.

**Graphs out.** With `external_graph_url_template` set, every device page
and the monitor history drawer of a device's target show a **Graphs**
button: the template with `{hostname}` (the primary address's hostname,
else the device's name), `{ip}` (the primary address), `{device_id}` and
`{site}` (the site's slug, the same value as the `site` label above)
filled in, URL-encoded, opened in a new tab. Only `http://` and `https://`
templates are accepted; empty = no button.

## Settings

**Settings → Monitoring** (admin): channel CRUD + test, the runtime toggles,
and the notification log viewer. The same toggles also appear under
**Settings → Features → Monitoring**:

- `monitoring_enabled` — master switch; off makes the tick a no-op;
- `monitor_concurrency` — parallel probes inside one sweep (default 64);
- `monitor_http_timeout` — per-request HTTP and HTTPS timeout (default 5s);
- `monitor_retry_seconds` — seconds before a failed check is repeated (the
  confirming re-check; default 15, 5–300; env `MONITOR_RETRY_SECONDS`);
- `monitor_sweep_budget_seconds` — the minute sweep stops starting new
  checks after this many seconds; the rest go first next minute (default
  50, 10–55; env `MONITOR_SWEEP_BUDGET_SECONDS`);
- `monitor_icmp_count` — echoes per ping check, up if any answers (default
  3, 1–10; env `MONITOR_ICMP_COUNT`);
- `monitor_icmp_timeout` — seconds all the echoes may take to be answered
  (default 2.0, 0.5–10; env `MONITOR_ICMP_TIMEOUT`);
- `monitor_tcp_timeout` — seconds to wait for a TCP connect, retried once
  on a timeout (default 3.0, 0.5–30; env `MONITOR_TCP_TIMEOUT`);
- `monitor_stale_factor` — intervals without a check before a monitor
  shows as stale (default 3, 1–100; env `MONITOR_STALE_FACTOR`);
- `worker_stale_seconds` — seconds without a scheduler tick before the app
  says background work stopped (default 180, 60–86400; env
  `WORKER_STALE_SECONDS`);
- `monitor_history_days` — days of monitor transitions and daily
  availability to keep (default 400, 30–3650; env `MONITOR_HISTORY_DAYS`);
- `availability_counts_maintenance` — on: downtime inside a maintenance
  window counts against availability (default off; env
  `AVAILABILITY_COUNTS_MAINTENANCE`);
- `notify_group_by_site` — one incident per site outage (default on; env
  `NOTIFY_GROUP_BY_SITE`);
- `incident_site_min` — targets of one site down together that open a site
  incident (default 3, 2–1000; env `INCIDENT_SITE_MIN`);
- `incident_group_seconds` — seconds in which a site's failures join its
  incident (default 180, 30–3600; env `INCIDENT_GROUP_SECONDS`);
- `flap_transitions` / `flap_window_minutes` — the flap rule (default 6
  changes in 30 minutes; 3–100 and 5–1440; env `FLAP_TRANSITIONS`,
  `FLAP_WINDOW_MINUTES`);
- `notify_retries` — tries after a failed delivery (default 3, 0–5; env
  `NOTIFY_RETRIES`);
- `event_dedup_minutes` — minutes a repeated external event's `dedup_key`
  is answered with the first event (default 60, 1–1440; env
  `EVENT_DEDUP_MINUTES`);
- `incident_repeat_minutes` — minutes between repeats of an open incident
  nobody acknowledged (default 30, 0–1440, 0 = never; env
  `INCIDENT_REPEAT_MINUTES`);
- `incident_escalate_minutes` — minutes before an unacknowledged incident
  goes to the escalation channels (default 15, 0–1440, 0 = never; env
  `INCIDENT_ESCALATE_MINUTES`);
- `incident_escalation_channel_ids` — the channels that receive
  escalations (default none = no escalation; env
  `INCIDENT_ESCALATION_CHANNEL_IDS`, comma-separated ids);
- `incident_parent_suppress_sites` — the sites where the children of a
  down root are not told while it is down (default none = off everywhere;
  edited in **Settings → Features → Topology**; env
  `INCIDENT_PARENT_SUPPRESS_SITES`, comma-separated site ids);
- `notify_retention_days` — auto-purge for the notification log (0 = keep);
- `syslog_bom` — the UTF-8 byte-order mark before a non-ASCII syslog
  message (default on; env `LANCOMPASS_SYSLOG_BOM`);
- `external_graph_url_template` — the device page's Graphs link, with
  `{hostname}`, `{ip}`, `{device_id}`, `{site}` (default empty = no link;
  `http://` or `https://` only; env `EXTERNAL_GRAPH_URL_TEMPLATE`).

`METRICS_TOKEN` (env only, never shown in Settings) is the bearer token
that unlocks the per-target series on `/metrics`; empty (the default) =
aggregate series only.

## How fast LanCompass tells you

Measured on a fault lab of this release (V157, a throwaway stack with its
own target containers and a local mail, syslog and webhook sink; every
target at the defaults: a check every 60 s, down after 2 failures, the
15-second re-check):

| What happened | What LanCompass did |
|---|---|
| A target stopped answering for 5 minutes | confirmed down **21 s** after it stopped (at most one interval plus the re-check, 75 s); told it answers again **5 s** after it came back, with the outage's length |
| Forty targets of one site went dark together | confirmed in **18 s**, in one sweep; **one message per channel** when the incident opened and **one** when the site was back ("North Branch back after 5 min — 40 targets") |
| The same outage with three channels that never answer | the sweep took **19 s** and every minute's check still ran; the healthy channels heard it within **1 s** of each other; each failed delivery was tried again after 30 s, 2 min and 10 min |
| Outages shorter than one check (30 s, 20 s) | not seen — a check every 60 s cannot see them; a 45-second outage was seen when a check fell inside it |
| A slow but working path (30 % loss, 800 ms) for 30 minutes | **0 minutes** reported down (three echoes per ping check, the TCP check retried once) |
| A target still down when its maintenance window ended | told at the window's end, once; its recovery told with its length |
| Events during a subscriber's quiet hours | held, then sent as **one** message when the quiet hours ended, the outage first |
| A port's error counters climbing, a firewall's VPN tunnel dropping, a switch that stops answering SNMP (the health poll every minute in the lab; 5 minutes by default) | told **once** each within two polls |
| 5,000 enabled targets on a factor-50 estate | every one checked every minute (each sweep about 5 s) |

**Reproduce it.** Every pull request runs the CI step "Monitor truth (lab)"
(`scripts/ci/monitor_truth.py`): two throwaway target containers on the
stack's network and a webhook sink; one target stopped for 3 minutes and a
site of five stopped together. It fails when a down is confirmed later than
one interval plus the re-check (90 s), when the site is told more than once
or its targets one by one, or when a recovery comes without its length. To
run it against your own throwaway stack (never a production one — it adds
two sites, two devices and a channel, and removes its six monitors when it
ends):

```bash
SMOKE_USER=admin SMOKE_PASS='…' python3 scripts/ci/monitor_truth.py --api http://localhost:8001
```

The lane's coverage at scale is held by the scale suite
(`LANCOMPASS_SCALE=1 pytest tests/scale -k monitor_lane_coverage`): 5,000
enabled targets, every one checked within two intervals through a
simulated hour of ticks.

## Limits (by design)

No SNMP monitors, no dependency trees (a site incident groups a site's
targets by how many fail together, not by topology), no recurrence beyond
weekly windows, no on-call schedules or rotations (escalation goes to the
chosen channels; a team's paging tool is a webhook), no acknowledging by
replying to a message or by a link, no per-*target* routing (channels and
subscriptions route by event class), no user-defined webhook URLs
(subscriptions reference admin-managed channels only), no business-hours
SLA schedule (availability counts every hour of every day).
PagerDuty/Opsgenie/ntfy/Slack aren't separate kinds — the `webhook` kind
already covers their inbound APIs.
