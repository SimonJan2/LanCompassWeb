---
title: "Dashboard gallery"
description: "Browse ready-made dashboards, follow or copy them, suggest your own, and — as an admin — give each role, user or directory group the home it should open."
category: "getting-started"
version: "0.7.0"
order: 3
---

# Dashboard gallery

The gallery is where dashboards are shared across the install. Everyone
can browse it, follow an entry, make a copy of their own, and suggest one
of their dashboards for it. Administrators publish suggestions, feature
the entries everyone should see first, and decide which dashboard each
role, user or directory group lands on.

Open it from the dashboard switcher (**Browse gallery**) or at `/gallery`.

## Browsing

The page shows three rows:

1. **Featured** — up to six entries an administrator picked, in their
   order.
2. **Recommended for you** — what an administrator pinned or recommended
   to you, your role or one of your groups.
3. **Every dashboard** — all entries, with a search box and filters for
   who an entry is for and whether it is ready for you.

Under the filters the entries sit in **collections**, one section each:
**Showcase** first (its first entry as a wide card), then **Every day**,
**Planning**, **Security**, **Wall screens**, **Executive**, **Vendors**
and **One site**. The search and the filters apply to every section; a
collection with nothing left to show disappears.

Each card draws the layout of the dashboard (numbers, charts and lists as
shaded blocks, and a small glyph for each of the newer charts), its name,
who it is for and the **one question it answers**. The card itself asks
for no data. A **✦** before the name marks a dashboard made in the
showcase look ([Reading the new charts](/docs/dashboards/)); **New** marks
an entry that arrived in the release you are running.

The badge on a card says whether the entry is ready **for you**:

| Badge | Meaning |
|---|---|
| **Ready** | Everything it shows has data on this install. |
| **Needs data** | Something it reads is missing — for example no scan has run yet, there are no racks or monitors, or a source of a given kind is not configured. The card names what is missing and links to where you add it. |
| **Needs access** | Some widgets need a permission your role does not have. Those widgets show **Needs operator access** and ask for nothing; the rest of the dashboard works. |

**Preview** renders the entry live with your own data. It is read-only and
saves nothing.

The gallery never shows you more than your role can already read: every
widget still asks the same endpoint as everywhere else, with the same
permission check.

## Follow or make it mine

| | Follow | Make it mine |
|---|---|---|
| What you get | The entry in your switcher under **Followed** | A private dashboard of your own under **Mine** |
| Can you change it? | No — it is read-only | Yes — it is yours |
| When the gallery version changes | You see the change at once | You see **A newer version is available** |

On a copy whose gallery version moved on:

- **See what changed** lists the widgets added, removed and changed
  between the version you copied and the current one.
- **Update my copy** replaces your layout with the gallery's. Your current
  layout is kept in **History**, so nothing is lost.

An entry that asks for a parameter (for example a site) is copied or
assigned, not followed.

## Suggesting a dashboard

From the **⋯** menu of a dashboard you own, choose **Suggest to the
gallery…** and say who it is for, the one question it answers and,
optionally, a short description.

An administrator then either **publishes** it — the gallery gets a *copy*
of your dashboard, so your later edits never change the published one —
or **declines** it with a note of up to 280 characters, which you see on
your dashboard. You can change the dashboard and suggest it again.

## The switcher

The dashboard switcher groups what you can open:

- **Home ★** — the dashboard you land on;
- **Pinned** — what an administrator pinned for you (it always stays; a
  lock marks it) and what you pinned yourself;
- **From your admin** — recommendations, with a **New** mark until you
  open one; you can hide a recommendation;
- **Mine**, **Followed** and **Shared**.

A group with nothing in it is not shown. The **⋯** next to the switcher
makes the open dashboard your home, pins or hides it, or follows it.

Your home, pins, hidden recommendations and follows are stored on the
server, so they follow you to another browser or machine.

## Which dashboard opens first

Without a dashboard in the address, the page opens the first of these that
you can read:

1. **your own home** (★ in the switcher);
2. a **home** an administrator assigned to **you**;
3. a **home** assigned to one of your **directory groups** — when several
   groups have one, the most recently assigned wins;
4. a **home** assigned to your **role**;
5. the **install default**;
6. the built-in **Overview**.

A dashboard you can no longer read (deleted, or made private) is skipped,
so the page always opens something.

## Assignments (administrators)

**Settings → Dashboards** (after Users) holds:

- **Suggestions** — publish or decline, with a note to the owner;
- **Gallery entries** — feature up to six, retire a published one (it
  leaves the list; follows, copies and assignments keep working), publish
  a retired one again;
- **Assignments** — give a built-in entry, a published dashboard or a
  shared dashboard to a **role**, a **user** or a **directory group**, as
  their **Home**, **Pinned** or **Recommended**. A private dashboard
  cannot be assigned. Each dashboard is assigned once per audience;
- **Preview as** — type a user name to see the home they would get, why
  (their own choice, their group, their role…), and their pins and
  recommendations. It changes nothing.

Directory groups are the groups your LDAP / Active Directory or SSO
sign-in reports for each user, stored at every sign-in. The group picker
offers those and the group names of the role maps; names match without
regard to case. Local accounts have no directory groups.

Assigning needs the user-management permission; publishing, featuring and
retiring need system administration. Assignments, publishing, retiring,
approving and declining are recorded in the changelog; personal
preferences and follows are not.

**Starter kits.** When the first administrator completes setup, each role
gets a starting point: administrators and operators open **Morning check**
(administrators also get **Resilience** recommended, operators **Change &
audit**); contributors open **Documentation truth** (with **IP steward**
recommended); viewers get **Documentation truth** recommended. On an
install that existed before, **Apply starter kits** in Settings →
Dashboards adds the ones that are missing and leaves your own assignments
alone.

**Usage.** Settings → Dashboards can count how often each gallery entry
and assigned dashboard is opened — once per browser session, per dashboard
and day, never per user. It is off until you turn it on; counts older than
400 days are removed.

**Packs.** Export the published entries as a `.lancompass-pack.json` file
and import it on another install: each entry arrives as a suggestion in
the queue, sites are matched by name, and the import lists every widget it
dropped and every filter it cleared. An entry whose widget no longer
exists in the catalog shows **Needs attention** to administrators.

## The built-in entries

Each entry answers one question for one kind of reader. What it needs is
what makes it **Ready**; a widget your role cannot read says **Needs
operator access** and the rest still works.

### Overview (`overview`)

**For:** everyone. **Answers:** what does the estate look like right now?
The install's starting page: counts, capacity, expiring certificates,
mismatches and recent activity.

### Morning check (`morningCheck`)

**For:** administrators. **Answers:** did anything break overnight? The
last 24 hours: offline devices, scans that failed, hours since the last
backup, certificates expiring within 7 days, monitor events, discovery
changes, recent scans and the certificates that expire next. **Needs:**
monitors. Backup age needs backup access. Version 2 brought the failed
scans and the 7-day certificates; a copy made from version 1 offers the
update.

### Documentation truth (`docTruth`)

**For:** documentation owners. **Answers:** does our documentation match
the network? Coverage per site first, then undocumented links by site,
hosts not in the inventory, and the review and drift trends. **Needs:** a
scan.

### Network lead (`networkLead`)

**For:** network leads. **Answers:** where do I look first? Site tiles,
coverage, runway, the fullest prefixes and the utilization trend.
**Needs:** a scan.

### IP steward (`ipSteward`)

**For:** IP stewards. **Answers:** who is waiting for an address, and where
will we run out? Pending requests, utilization, free addresses, the
runway, the fullest prefixes and the pending-request trend. Pending
requests need write access.

### Capacity planner (`capacity`)

**For:** capacity planners. **Answers:** what runs out first, and when? The
runway, prefixes by utilization, the utilization forecast, racks by power
and rack space. **Needs:** racks. (Revised in this version: a copy of the
earlier "Capacity watch" offers the update.)

### Data centre (`dataCentre`)

**For:** data-centre engineers. **Answers:** where do I have rack space and
power? Rack space, racks by power, a rack face and device health.
**Needs:** racks.

### Security & exposure (`security`)

**For:** security. **Answers:** what is exposed that should not be? Open
exposure findings, drift, unexpected MACs, the exposure trend and
discovery changes. **Needs:** a scan.

### Certificates & renewals (`certificates`)

**For:** operators. **Answers:** which certificates expire next? What
expires within 30 days, the share still valid, the list and the expiry
windows. **Needs:** certificates.

### Check Point estate (`checkpoint`)

**For:** firewall administrators. **Answers:** are the gateways in sync and
their certificates valid? Gateways, sync issues, VPN peers, certificate
health and the lists behind them. **Needs:** a Check Point source.

### NOC wall (`nocWall`)

**For:** the NOC. **Answers:** is anything down right now? Made for a wall
screen — **Open as wall** shows it full screen, refreshing by itself.
**Needs:** monitors.

### Change & audit (`changeAudit`)

**For:** auditors. **Answers:** what changed, and who changed it? Stale
config backups, open compliance findings, maintenance in the next 7 days,
drift, the change log and trend, upcoming maintenance and topology changes.

### Site manager (`siteManager`)

**For:** site managers. **Answers:** how is my site doing? One site's
devices, monitors, coverage, runway and utilization. You pick the site
when you make it yours or assign it, so it is copied or assigned, not
followed.

### Management one-pager (`mgmtOnePager`)

**For:** managers. **Answers:** how healthy is the estate, on one page? Six
numbers and three 90-day trends that print on one A4 landscape page.

### Resilience (`resilience`)

**For:** administrators. **Answers:** could we recover if we lost the
server tonight? Hours since the last backup, days since a good restore
drill, the drill success rate over 90 days, recent drills and failing
sources. Needs backup access (failing sources: system administration).

### Config compliance (`configCompliance`)

**For:** security. **Answers:** which devices break our configuration
rules? Open findings, devices failing a rule, stale config backups, the
lists and the trend. **Needs:** an enabled compliance rule.

### Ops overview (`ops`)

**For:** operators. **Answers:** what needs attention right now? Review
queue, monitors, offline devices, expiring certificates, the monitor board
and events, recent changes and mismatches. **Needs:** monitors.

### Vitals (`vitals`)

**For:** managers. **Answers:** is the estate healthy at a glance? Four
gauges over device, review and certificate breakdowns and the utilization
trend. **Needs:** monitors and certificates.

## Showcase and the newer entries

These entries are built on the newer charts. The ones marked ✦ come in
the showcase look: borderless cards on a soft backdrop, large numbers, one
question and one accent each.

### ✦ Pulse (`pulse`)

**For:** network leads. **Answers:** when does my network change? A
365-day calendar of discovery changes (its total is the big number), a
punch card of when scans run, and the targets that are down. **Needs:** a
completed scan.

### ✦ Address Atlas (`atlas`)

**For:** IP stewards. **Answers:** what does our address space look like?
Addresses tracked, utilization and free addresses; the busiest /16 as an
address map; prefixes as a sunburst (VRF → container → prefix) and as a
treemap by size and fill; a used / free waffle. **Needs:** a prefix.

### ✦ The Lifecycle (`lifecycle`)

**For:** documentarians. **Answers:** where do discovered hosts end up? The
discovery lifecycle as a flow — discovered, identified or ignored,
documented, monitored — with the documented share as its big number, and
the hosts discovered per site as small multiples. **Needs:** a completed
scan.

### ✦ Site Constellation (`constellation`)

**For:** network leads. **Answers:** how does each site compare with the
others? Sites, utilization and open review items; a radar of up to six
sites on six shares; utilization per site on one scale; a tile per site.
**Needs:** two sites.

### ✦ Year in Review (`yearInReview`)

**For:** managers. **Answers:** what did this year look like? Four totals;
calendars of scans, discovery changes and monitor events; the 365-day
utilization trend with its events. Its range is fixed to the last 365
days. **Needs:** a completed scan. (The monthly bars of hosts discovered
the brief listed did not fit the eight-widget limit; the scans calendar
carries that story.)

### ✦ Night Watch (`nightWatch`)

**For:** the NOC. **Answers:** is anything down now, and how has it been?
Monitors up as a big number against its 99.9 % target, offline devices, the monitor board, a punch
card of monitor events by hour and a 90-day calendar of them — composed for
a dark wall screen and refreshing by itself. **Needs:** monitors.

### ✦ Data Centre Panorama (`dcPanorama`)

**For:** data-centre engineers. **Answers:** how full is every rack? Racks,
units used and the share used as a bullet against an 80 % target; the
fullest rack's face standing beside racks as radial bars by space used and
the racks drawing the most power; a site → group → rack treemap across the
bottom. **Needs:** racks.

### ✦ Calm Glass (`calmGlass`)

**For:** managers. **Answers:** are we on target? Six bullets against their
targets (monitors up, certificates OK, devices online, utilization, review
items, compliance findings), the utilization trend with its forecast band
and the documentation coverage as a waffle — on one A4 landscape page.
Needs nothing; a bullet with nothing to measure stays empty.

### ✦ Morning Coffee (`morningCoffee`)

**For:** administrators. **Answers:** what happened overnight, at a glance?
The showcase twin of Morning check over the last 24 hours: offline
devices, open drift, failed scans, certificates due this week, a 7-day
punch card of changes, the monitor board and a 90-day calendar of
discovery changes. **Needs:** monitors.

### Capacity Horizon (`capacityHorizon`)

**For:** planners. **Answers:** which prefixes fill up next, and how sure
are we? Utilization with its forecast, free addresses, the runway (what
runs out first, with the forecast's confidence), a prefix treemap and
utilization per site on one scale. **Needs:** 14 days of history (the
forecast says "collecting" before that).

### Change Rhythm (`changeRhythm`)

**For:** operators. **Answers:** when is the quietest time for maintenance?
Punch cards of changes and of monitor events (each sentence names the
busiest and the quietest weekday hour), the maintenance already planned
for the coming year, and the changes trend with its events. Needs nothing.

### Monitoring SLA (`monitoringSla`)

**For:** the NOC. **Answers:** which targets missed their availability?
Monitors up against the 99.9 % target, the monitor board (worst first) and
a 90-day calendar of monitor events. **Needs:** monitors. (A per-target
daily availability strip was not built: the monitor events the product
logs do not name their target.)

### Discovery Radar (`discoveryRadar`)

**For:** security. **Answers:** what is new on the wire? Hosts discovered
per site, discovery changes over time, the discovery lifecycle, exposure
and open drift. **Needs:** a completed scan.

### Segmentation (`segmentation`)

**For:** network leads. **Answers:** how are VLANs, prefixes and sites tied
together? The VLAN → prefix → site flow, VLANs by status and the fullest
prefixes. **Needs:** VLANs.

### Device Fleet (`deviceFleet`)

**For:** operators. **Answers:** what is our fleet made of, and is it
healthy? A family → manufacturer → model treemap, device health, the
device count over 90 days and the addresses that are offline. **Needs:**
devices.

### Cable & Port Truth (`cablePortTruth`)

**For:** documentarians. **Answers:** do our cables match what the switches
see? Cable and MAC mismatches, documented against observed per site, the
observed links confirmed by documentation as a waffle, and the mismatches
themselves. **Needs:** a device with interfaces.

### Firewall Desk (`firewallDesk`)

**For:** firewall administrators. **Answers:** is the Check Point estate
healthy over time? Sync health, gateways and expiring certificates; the
Check Point series side by side on one scale; and a forward calendar of
certificate expiries. **Needs:** a Check Point source.

### Certificate Calendar (`certCalendar`)

**For:** operators. **Answers:** which certificates expire, and when?
Certificates OK, those due within 7 and 30 days, every expiry of the coming
year day by day, and the list of the next ones. **Needs:** certificates.

### Bring-up (`bringUp`)

**For:** site managers. **Answers:** is this new site documented yet? For
the one site you choose when you add or assign it: devices, scans and open
review items, documented against observed, the address map of its busiest
/16 and a 90-day calendar of the hosts found there.

### Audit Evidence (`auditEvidence`)

**For:** auditors. **Answers:** can we prove we are in control? Compliance
findings against a target of none, stale config backups, restore-drill
success (needs backup access), a 90-day calendar of changes and the latest
changes — on one printable page.

### Help Desk (`helpDesk`)

**For:** operators. **Answers:** where is it, and is it up? Links to find an
address, a device, the monitors and the sites; a short runbook; the
addresses that are offline; the monitor board. Ready on every install.

### Site Mosaic (`siteMosaic`)

**For:** site managers. **Answers:** which site needs a look? A tile per
site, the three weakest sites on a radar and the offline devices per site
on one scale — made for a wall screen.
