---
title: "Reports"
description: "The estate on one page — print view, per-section CSV, multi-sheet XLSX."
category: "operations"
version: "0.7.0"
order: 41
---

# Reports

**Reports** (`/reports`) is the estate on one page: every aggregate the
other pages compute, assembled into a single print-ready report — per-site
fill, address status, utilization outliers, rack capacity, expiring
certificates, scan history, open flags, device health and monitor state.
Reports are **derived**: nothing is stored, nothing appears in the
changelog, and every number is the same calculation the underlying page
runs. If the report disagrees with the dashboard, that's a bug.

## Scoping

The site picker scopes the whole report — headline strip and every
section, with no exception. Each object counts at the site it belongs to:

- **Prefixes and addresses** — the prefix's site.
- **Devices** — the device's own site; a device with no site that sits in
  a rack counts at the rack's site (the dashboard's rule too).
- **Racks and rack audits** — the rack's site; a site with no audits
  shows 0.
- **Certificates** — the site of the device the certificate is on, else
  the site of its address's prefix. A certificate tied to neither appears
  only in the report for all sites (its site reads "—"), and a site's
  Certificates section says how many such certificates exist.
- **Scans** — the job's resolved prefix; a scan with no prefix belongs to
  no site.
- **Monitors** — the device's site or the address's prefix site. Up,
  down and unknown count live targets only; disabled targets and targets
  on a retired device are counted apart as **Paused**.

## Period

Without a period the report is today's: every figure as of the moment it
was computed. The **Period** picker adds one — **Now** (none), **Last 7
days** (today and the six days before it), **Last month** and **Last
quarter** (the previous calendar month or quarter), or **Custom** (two
days of your choice). Days are calendar days in the install's display
time zone (`display_timezone`), both ends included.

A report for a period has two kinds of section:

- **The period's sections** come first, each marked with the period:
  **Changes in the period** (by object type, by action and the busiest
  actors, with a link to the Changelog for the same days), **Equipment
  placed and removed** (a device's rack or U position changing — placed,
  removed or moved, with the rack and the U before and after), **Devices
  added and removed**, **Scans in the period** (jobs started, failed,
  hosts found), **Certificates expired in the period** and **Sign-ins in
  the period** (every sign-in and every LDAP refusal; a sign-in belongs to
  the whole install, so a site's report counts them all and says so).
  **Availability** sums the period's days instead of the last 30. Each
  counts the changelog, scan and certificate rows whose time falls inside
  the period, at the site the way the rest of the report places them.
- **Every other section** is marked **As of** — the same figures as
  without a period, the state when the report was computed. LanCompass
  keeps no snapshot of the past, so no figure claims to be the state on
  the period's last day; the line under the headline says which numbers
  are which.

The print, the workbook, the CSVs and the mail carry the period: the
print's frame prints it under the title, and the report ends with
**Prepared by** and **Approved by** lines to sign; the About sheet has a
Period line; every file's name carries `-<from>_<to>` before its day; the
mail's subject names it — "LanCompass report — North Branch — 2026-09-01
to 2026-09-30". A
link to `/reports?period=custom&since=2026-09-01&until=2026-09-30` opens
the same report. The API takes `since` and `until` (ISO days, both or
neither) on `/reports/summary`, `/reports/export.xlsx`,
`/reports/<section>.csv` and `POST /reports/email`.

## Sections

| Section | What it measures | Link target |
|---|---|---|
| Sites | Per-site prefix count, addresses used/usable, fill %, device count | `/sites` |
| Address status | Counts and share per status (active/reserved/dhcp/discovered/offline) + the dashboard's used/usable/utilization totals | `/prefixes` |
| Utilization | Fullest 10 + emptiest 5 IPv4 prefixes (containers excluded — same rule as the dashboard chart) | `/prefixes` |
| Rack capacity | Per rack group: racks, used/free U, fill %, Σ watts, Σ kg — rolled up from `stamp_rack_stats` | `/racks` |
| Certificates | Expiring within the effective `cert_warn_days` window + expired, oldest first | `/certificates` |
| Scans | Status totals + hosts seen (all jobs) and the last 20 jobs | `/scans` |
| Flags | Detection-state counts: MAC mismatches, cable mismatches, duplicate MACs, unconfirmed discovered hosts | `/review` |
| Devices | By category, by health (worst linked-IP status, same as the devices page), racked vs unracked | `/devices` |
| Monitors | Up/down/unknown of the live targets, Paused apart, kind mix, enabled count, due-for-check now | `/monitoring` |
| Availability | The last 30 complete days (display timezone): per site its availability, downtime, maintenance and unchecked minutes and transitions, then its 20 lowest targets, with the formula sentence under the table — the figures are signed off from here (see below) | `/monitoring` |
| Rack audits | Placeholder section that appears only if the v9 `rack_audits` table exists | `/review` |

**Availability** = up ÷ (up + down), summing the seconds of every target
of the site over every day of the period; maintenance and unchecked time
are left out and shown apart. With `availability_counts_maintenance` on,
downtime inside a maintenance window counts as down, and the sentence
under the table says so. The section reads the kept monitor history
(kept `monitor_history_days`, 400 by default): a day before history
began is not kept, never 100 % — see
[Monitoring → History and availability](/docs/monitoring/). Print it
(**Print** → save as PDF) to sign a month's availability in the page's
language with the formula on the sheet.

On the page each section shows its first **50 rows**, with **Show all**
under the table for the rest, and the page draws its sections a few at a
time, so a big estate's report never holds the browser still. The print
carries up to **500 rows** a section and says so when there are more:
"Showing the first 500 of 2,000 rows. The workbook and the CSV carry all
2,000." The workbook and the per-section CSVs always carry every row.

## Export

- **Print** — `/reports/print` renders every section as a flat detail
  table for `window.print()` (save-as-PDF works there). Charts don't
  print; the tables are the report.
- **Export .xlsx** — one workbook: first an **About** sheet that says
  what the file is when it is opened alone — the install, what it is,
  its scope (the site, or all sites), as of when (the moment the numbers
  were computed, in the install's time zone), who produced it, the rows
  on each sheet and the version — then one sheet per section in the
  page's order, **every row** of every section (the page's 500-row cap
  does not apply). Every sheet opens designed: the header row frozen, a
  filter on it, columns as wide as their values, and timestamps as real
  dates that sort and filter as dates. Filename:
  `lancompass-report[-<site-slug>]-YYYY-MM-DD.xlsx` — the date is the day
  it was true; the browser keeps the name the server gives. The workbook follows
  your language: sheet names, a row of column labels above the machine
  header, and each section's note under its table are in the language
  the page is in, and a Hebrew or Arabic workbook opens right to left. In
  English the file is exactly as before; a script that reads it can ask
  for `?lang=en`.

The section notes on the page and in print (what a figure counts, where
to triage it) are in your language too.
- **Per-section CSV** — the `⤓` button on each card downloads
  `lancompass-report-<section>[-<site>]-YYYY-MM-DD.csv` with a UTF-8 BOM
  (the Hebrew-in-Excel convention) and every row of that section; only
  that section is computed for it. A CSV stays pure data — no title row;
  what it is and when travel in its name.

Every file LanCompass hands out is named the same way:
`lancompass-<what>[-<scope>][-<from>_<to>]-YYYY-MM-DD.<ext>` — devices,
racks, a rack or a rack group, a rack audit, the IPAM lists, the docs,
the changelog (with the period when you filtered one) — and every
workbook (devices, racks, rack audits, this report) opens on its About
sheet. A cell that would start a formula (`=`, `+`, `-`, `@`, a tab or
a line break, or their full-width forms) is written with one leading `'`
— in the server's files and in the files the browser makes (a
dashboard widget's CSV, a design's bill of materials, an import's error
report, a list's CSV) — so a device named `=HYPERLINK(…)` stays text.

**Email** links to the report on the install's public address when
*Settings → Features → Public address* is set; without it the mail's
link line says where the report is and how to get a link.

## Printing

Every print view — this report, a prefix, a rack sheet, a rack audit
and a dashboard — prints **one light sheet in every theme and
language**: paper, ink and the six status tones from the paper palette,
whatever theme the screen is in, and every status chip at 4.5:1 or
better on white. Statuses print as words in your language, never as raw
values such as `active`.

| Print view | Page |
|---|---|
| Report (`/reports/print`) | A4 portrait; the chips switch to A3, Letter or landscape |
| Prefix (`/prefixes/<id>/print`) | A4 portrait; the chips switch to A3 or landscape |
| Rack sheet and rack audit | A4 portrait; the chips switch to A3 or landscape |
| Dashboard (`/print`) | A4 landscape; the picker switches to A3 or portrait |
| Team page and help chapter (`/docs/pages/<slug>/print`, `/docs/<slug>/print`) | A4 portrait; the chips switch to A3 or landscape |

A link can choose the paper: `?paper=A3-landscape` on any of them but the
dashboard (which takes `?paper=A3&orient=portrait`).

Every sheet carries the same **frame** on every page, with the four facts
a signed page needs:

- **At the top:** the LanCompass mark and name, the install's name (the
  host of *Settings → Features → Public address* when it is set,
  otherwise the address you opened LanCompass on), and the page's
  **title with its scope** — "Site report — North Branch" on every page
  of a branch's report (never just "Estate report"), the dashboard's
  site filter or "All sites", a subnet's or a rack's site. A page that
  covers a period prints it under the title.
- **At the bottom:** **"As of"** — when the content was true, an absolute
  date and time with its zone (for the report, the moment the server
  computed the numbers; for a sheet, the moment its data was read; for a
  rack audit, the audit's own completion; for a team page, its last
  save), **"Produced by"** the account that printed it, and "Page 1 of 2".

**No relative time on paper.** A time counted back from the moment you
look means nothing on a sheet filed for a year, so every such time on
the screen prints as a date on paper — a subnet's *last seen*, a certificate's
expiry, a dashboard list's times, a team page's *updated*. The screen
keeps its words. Addresses, MACs, host names and dates never break
across lines on paper; free text wraps. In Hebrew and Arabic the sheet
runs right to left and keeps every address whole. Each report section
starts with its heading, and a table's head repeats on every page it
spans. A rack's QR label is unframed, by design: it is stuck on a rack.

## Email

**Email** (requires write permission) sends a text digest — headline
metrics plus open flags, expiring certs, monitors down, failed scans —
to every enabled notification channel, with a link back to `/reports`.
No attachment by design: channels carry text.

A weekly digest rides the same path when *Settings → Monitoring → Weekly
report digest* is on (`report_email_weekly`, off by default). It goes on
its **day and hour** in the display time zone (*Digest day*, *Digest
hour*: Sunday 07:00 by default; `LANCOMPASS_REPORT_EMAIL_WEEKDAY`,
`LANCOMPASS_REPORT_EMAIL_HOUR`) — switching it on waits for them instead
of sending at once. The week is marked done only after a delivery went out
(or when no channel takes the digest); a send that failed on every channel
is tried again on the next minute, up to three times, then logged as
failed. The scheduler's stamps live in Redis alongside the other schedule
marks.

## Schedules

**Schedules** on Reports (admins: `system:admin` — a schedule sends the
estate's data out of LanCompass) mails one person their report on a day
and hour:

- **Recipient** (one address), **Language**, **Scope** (a site, or all
  sites), **Period** (week, month or quarter), its **Day** (a weekday for
  a week; 1–28 of the month, or of a quarter's first month) and **Hour**
  in the display time zone, the mail channel to **Send through** (an SMTP
  channel's server; the schedule's recipient replaces the channel's own
  list), **Attach the workbook** (on by default).
- On its day and hour the worker sends the report for the **previous
  complete period** — October's on 1 November — in the schedule's
  language: the subject names the schedule, the scope and the period, the
  body the headline, the period and the time the rest is as of, and the
  link to the same report on the public address. The workbook carries its
  About sheet and its period in its name; over 10 MB the mail carries the
  link only and says so.
- **Last sent** shows when the server took the message. A send the server
  refuses shows **Failed:** and its error, is not marked sent, and is
  tried once more on the next minute.
- **Send now** mails the current period so far, as a test; the schedule's
  own last send is not changed.
- No schedule exists until an admin makes one. Creating, editing and
  deleting a schedule are changelog rows; each send is a notification log
  row (kept under that log's retention). Deleting a site switches its
  schedules off rather than widening them to all sites.

## Evidence pack

**Evidence pack** on Reports (operators and admins: `backup:access`)
builds one ZIP for the page's scope and a period — the page's period, else
last quarter — that answers most of an auditor's request and can be
checked offline.

- **What it holds** (every part ticked; untick any): the asset inventory
  (the devices workbook), the IP plan (subnets with utilization, VLANs,
  VRFs, addresses), the racks workbook with **every rack's elevation**
  (`data/racks/<site>/<rack>.svg`: front and rear side by side, the
  rack's own U numbers, each device's name and status in your language,
  the 0U devices beside it), the **official drawing** of each design
  (`data/diagrams/<name>_<date>.svg`, the newest one saved with **Save as
  official drawing**; a design without one is named on the cover as "No
  official drawing saved"), **each device's configuration**
  (`data/config/<site>/<device>.txt`: the newest revision, masked again
  on export so no secret today's rules hide leaves — the cover gives when
  it was collected, its stored SHA-256, and says "Masked again on export"
  or "Truncated when it was collected" when that applies), the period's
  **configuration changes** (`data/config-changes/<device>_<from>_<to>.diff`:
  a unified diff of the first and last revision collected in the period,
  with the period's change summaries on the cover), the report for the period, the
  period's whole audit trail, `access.xlsx` (every user with role, how
  they sign in, MFA and last sign-in; the role → permission table; the API
  tokens' scopes and dates — no secret, hash or token value), `controls.xlsx`
  (changelog retention, the syslog channels that forward the trail with
  each one's newest delivery, the backup settings, the newest backups and
  the restore drills), the certificate register (every certificate, not
  only the expiring), the circuits, the team pages linked to the site (all
  of them for every site) with their attachments, and the period's
  sign-ins. A part left out — or one this install cannot give, such as the
  product's own security answers until they ship — is listed on the cover
  under "Not included in this pack".
- **Its shape** is a BagIt bag (RFC 8493) named
  `lancompass-evidence-<scope>-<from>_<to>-YYYY-MM-DD`: `data/` with the
  files, `manifest-sha256.txt` (one SHA-256 a file), `bagit.txt`,
  `bag-info.txt` (the install, the scope, the period, as of, who produced
  it, the version and the manifest's hash) and `index.html` — **the
  cover**. Print it on A4 (in your language; right to left in Hebrew): the
  contents with each file's rows, bytes and hash, the manifest's own
  SHA-256 in a box, how to verify, and two lines to sign — Prepared by,
  Received by.
- **How an outsider verifies it**, with no network and no LanCompass:
  unzip it, and in the pack's folder run `sha256sum manifest-sha256.txt` —
  the hash must equal the one printed on the cover — then
  `sha256sum -c manifest-sha256.txt`: every line must end in OK. On
  Windows the cover gives the same check with `Get-FileHash`. One changed
  byte in any file prints FAILED.

Nothing is stored on the server. Each pack writes one changelog row
(`evidence.pack`) with its scope, period, parts and manifest hash. A pack
proves that the files are the ones listed and that the manifest was not
rewritten after the cover was printed; it does not prove who built it —
there is no signature.

## Send outside

**Send outside** on Reports (operators and admins: `backup:access`) sends
this report to one person outside — an auditor, a manager at another
company — as one sealed ZIP,
`lancompass-share-report-<scope>[-<from>_<to>]-YYYY-MM-DD.zip`. Write
**For whom** first; the cover's first line names them ("Prepared for …
by … on …").

- `data/report.xlsx` — the workbook for the page's scope and period, the
  same file as **Export**.
- `data/report.html` — the same report ready to print on A4: the About
  sheet's facts, then each sheet as a table under its name, framed with
  the install, the scope and the period, as of, who produced it and page
  x of y.

It is checked like an evidence pack (`sha256sum -c manifest-sha256.txt`
in its folder), and each one writes a `share.pack` changelog row with
for whom and the manifest's hash. A team page, a rack or a design is sent
the same way from its own screen (see
[Pages & Attachments](/docs/attachments/)).

## Not here

- **No historical trending** — reports create no snapshots of their
  own. Every section but Availability is computed from live state at
  request time; Availability reads the monitor history the product keeps
  anyway.
- **No report-run records** — the report is re-derived on every load; the
  changelog gains nothing from a report view.
