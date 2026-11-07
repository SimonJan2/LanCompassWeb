---
title: "First run: demo estate + tour"
description: "The guided first-run experience — a removable demo estate, a spotlight tour, and a getting-started checklist that detects real progress."
category: "getting-started"
version: "0.7.0"
order: 1
---

# First run: demo estate + tour

A fresh install doesn't have to be a blank page. Right after `/setup`
creates the admin account, you get a choice: **explore a demo estate** or
**start empty**. The demo estate loads a complete fictional network —
every surface populated, deliberately drifting — so you can evaluate the
product before you model your own.

## The demo estate

**Load demo estate** writes a deterministic, invented-values estate under
a single `kind='demo'` import batch:

- **IPAM** — sites with mixed Hebrew/English names, Global/Guest/OT VRFs,
  IPv4 and IPv6 prefixes, hundreds of addresses across statuses and roles,
  pools and reserved ranges.
- **Physical** — a DC rack row and a branch comms cabinet with real
  rack-library device images, structured interfaces, and cabling.
- **Drift** — intentional contradictions: scan vs. documentation
  mismatches, an offline device, MAC and VLAN drift, an expiring
  certificate, a hot prefix forecast, a pending IP request, a failing
  compliance rule, an open rack audit. The review queue ships populated.
- **Integrations** — a `demo` source whose connector replays a bundled
  fixture through the real test → preview → apply path, fully offline.
  The source row is *disabled* so no scheduled sync mutates the estate in
  the background; enabling it is possible, but rows a later sync applies
  live outside the estate's manifest and purge will name them as
  entanglements rather than removing them silently.
- **History** — a scripted 30-day story backfilled into dashboard
  snapshots: growth, one outage arc, recovery. Forecast chips and
  utilization curves get real data from day one.
- **Content** — dashboards, custom lists, tags, docs pages, color rules,
  monitor targets in mixed states, config revisions, requests, a DNS
  zone, circuits, services, assets, Wi-Fi, storage.

All values are fictional — sites, people, vendors, serials, and circuit
IDs are invented; no demo user accounts are created; nothing is probed
on the network. Loading is all-or-nothing and refuses to run twice.

## Removing the demo

The estate is data, not a mode — and it must leave cleanly.
**Settings → Data → Demo estate → Remove demo estate** deletes every row
the load created, through the same delete paths user data uses.

Before deleting, purge checks for **entanglement**: rows you created that
reference demo rows (a real cable plugged into a demo device, a doc
linked to a demo site). If it finds any, it refuses and names them —
untangle or delete those rows yourself, then purge again. Demo deletes
are never silently broken, and non-demo data is never touched.

## The guided tour

The spotlight tour walks the product with dim-overlay highlights on real
UI elements — nav items, dashboard cards, the review queue, topology,
racks, docs.

- **Two scripts.** With the demo estate loaded, the tour walks the
  populated estate (drift findings, review, topology, racks, forecast,
  docs). On an empty install it walks the setup surfaces (import,
  sources, monitors, backups, inviting a user).
- **Stop anywhere.** Esc, the ✕ button, or clicking outside ends the
  tour mid-step — your position is saved in browser prefs.
- **Resume honestly.** Continue from Settings → Appearance, the docs
  index, or the ⌘K `tour:` command. It never restarts uninvited.
- **Motion-safe.** Reduced motion or effects-off replaces the animated
  spotlight with a static accent ring; print strips the overlay.

## The first screen

The default dashboard opens on one row that says what the product is for:
what the wire shows that nobody documented. It sits above the
getting-started checklist and shows three numbers, each a link:

- **observed hosts nobody documented** — the addresses scans and passive
  discovery found that nobody has documented yet (the dashboard's
  *Discovered* count), plus the hosts the last scan saw in a range no
  subnet covers yet (a scan files nothing there; the inbox proposes the
  subnet), opening the **Discovery** inbox;
- **undocumented links** — the links the evidence (LLDP, MAC tables, ARP)
  shows between devices that no cable records, the topology World's own
  number, opening the topology. It is read from the evidence pass the
  topology and the review queue already keep, never computed for the row:
  while that pass is not cached (new evidence arrived seconds ago, or
  Redis cannot be reached) it reads "—" until the next refresh;
- **Last scan** — when the last scan ran, opening **Scans**.

Before the first scan has completed, the row asks for the one step that
fills it — "Scan your first network to see what nobody documented." — with
the **Quick scan** button. The row is on the default dashboard only — the
home you land on while it is a built-in dashboard (a fresh install's
**Morning check**), the install's default or the Overview — never on a
saved or custom dashboard; dismiss it with its ✕ and it stays dismissed in
this browser.

## The getting-started checklist

A card on the dashboard (also in Settings → Data) tracks real progress —
no manual ticks:

- scan your first network — the first step opens **Quick scan** and is
  done once a scan has completed,
- model or import your first data,
- add a source integration,
- enroll a monitor target,
- schedule backups,
- invite a second user or wire SSO,
- take the tour / load the demo.

Each item deep-links to its surface and checks itself when the state is
real — import a prefix and the item completes on its own. Dismiss the
card and it stays dismissed (per-browser pref); the checklist section in
Settings → Data always remains.

## The first 30 days

A pilot's first month, as ten steps in order — the same path the release
rehearsal walks on a server with no route out, in Hebrew first. Each step
names where it happens and what "done" looks like.

1. **Install** — `INSTALL.he.md` (or `INSTALL.md`) §1–3 on the server:
   check the bundle with `sha256sum -c`, extract it, run `sh install.sh`.
   *Done:* the installer ends with `LanCompass <version> is running.` and
   the `https://` address, and the release key's fingerprint it printed
   first matches the one in §1.
2. **Set up in Hebrew** — open that address, choose עברית on the setup
   page and create the administrator. Then **Settings → License** →
   upload the licence file the pilot agreement came with. *Done:* the
   dashboard opens in Hebrew, a colleague's sign-in page is in Hebrew too,
   and Settings → License names your organisation.
3. **Import** — **Import**: your address workbook (`.xlsx`) or a NetBox
   export; read the preview, then apply. *Done:* the plan's rows are
   created or skipped with a reason, and **Subnets** lists your subnets.
4. **Scan** — the dashboard's **Quick scan** on one office subnet
   ([your first scan](/docs/howto-first-scan/)). *Done:* the scan completes,
   the first screen's three counts fill, and what nobody documented waits
   in the **Discovery Inbox** for a person's decision.
5. **Connect** — **Settings → Integrations**: Active Directory, vCenter
   and the firewall, each with a read-only account: *Test*, *Preview*,
   then *Apply*. *Done:* each *Test* passes, each preview shows its plan
   (a long one says it is still reading after 10 s), and the applied rows
   appear on their pages.
6. **An alert** — **Settings → Monitoring**: a mail channel to your relay,
   *Test*; then monitor one device
   ([alerts to a mailbox](/docs/howto-alerts-to-mailbox/)). *Done:* the test
   mail arrives in Hebrew, and when that device stops answering one
   message says so.
7. **Colleagues over HTTPS** — **Settings → Account & Security →
   Directory authentication**: sign-in with Active Directory, roles from
   your AD groups
   ([add a colleague](/docs/howto-add-colleague/)). *Done:* a colleague signs
   in at the `https://` address with their directory account and gets
   their group's role.
8. **Back up** — **Settings → Backup & Restore**: nightly backups (on by
   default on a fresh install, 14 kept) and a restore drill
   ([backup and drill](/docs/howto-backup-drill/)). *Done:* a backup file in
   `backups/`, the drill passes, and a copy of one backup and of `.env` is
   kept off the server.
9. **Upgrade** — when the next bundle arrives: `INSTALL.he.md` §6 — extract
   it into `incoming/` and run its `upgrade.sh` from the install folder.
   *Done:* it ends with `LanCompass is upgraded to <version>` and prints
   the rollback steps; if another restore drill was running, it waited for
   it first.
10. **A support bundle** — **Settings → Support → Download support
    bundle**, sent as [Support → The pilot](/docs/support/#the-pilot)
    describes. *Done:* a ZIP with `manifest.json` reaches support, and the
    changelog records its SHA-256.

## Success criteria

Before day one, the pilot's champion (who runs it) and its economic buyer
(who decides to buy) agree what the pilot must show, and sign it. A
worksheet to copy into the pilot agreement:

| # | Outcome we need | How LanCompass shows it | Day one | Target for day 30 | Day 30 |
|---|---|---|---|---|---|
| 1 | Our documentation matches the network | the first screen's *observed hosts nobody documented* and **Discovery**'s open items | | | |
| 2 | We hear about an outage before our users do | **Incidents** and each monitor's availability; the alert's time beside the outage's | | | |
| 3 | An auditor's question is answered in minutes | **Reports** → the period's report and its evidence pack, and the time it took | | | |

Fill in the *Day one* column on the install day, from the product, and
agree each target before you start. Replace an outcome with your own if
it matters more — keep three, each one measured in the product.

**The day-30 review.** Open each measure in the product together, write
its value beside the target, and decide: an order, an extension with new
targets, or the end of the pilot ([how it ends](/docs/support/#the-pilot)).

| Signed | Name | Role | Date |
|---|---|---|---|
| Champion | | | |
| Economic buyer | | | |

## Where it all lives

| Surface | What you get |
|---|---|
| `/setup` done step | Explore a demo estate / Start empty choice |
| Empty dashboard | Load demo estate + Take the tour |
| Dashboard card | Getting-started checklist with live ticks |
| Settings → Data | Demo estate status, load/remove, entanglements |
| Settings → Appearance | Resume tour |
| Docs index | This page + a tour entry point |
| ⌘K `tour:` | Start/resume the tour from anywhere |
