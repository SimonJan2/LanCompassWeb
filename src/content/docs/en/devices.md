---
title: "Devices"
description: "First-class hosts — rack placement, multi-IP ownership, health rollup."
category: "inventory"
version: "0.7.0"
order: 27
---

# Devices

First-class hosts — a device *exists* independently of any rack and owns any
number of IP addresses.

A device is the thing that has a rack placement (optionally), has IPs (often
several — management + service + iLO), and may link an
[asset](/docs/inventory/) record for lifecycle/catalog data. Devices used to
live inside racks as `rack_devices` rows; now they're their own entity — the
same rows appear on rack elevations, but they survive being unracked and can
carry many addresses.

## The list

Devices works like the other entity pages: column sort, pin,
drag to reorder, row colors, history. Each row shows the device's
**placement** (rack + U range, or *unracked*), its **IP count**, the
freshest **last seen by scan** across its linked IPs, and its
**health rollup**.

The **Filters** button opens a faceted panel (a Sheet on narrow screens)
with live counts — search on top, then facets for health (the five IP
statuses + *unmonitored*), family, lifecycle, placement (racked / unracked /
in-carrier), site, rack, rack group, device group, source, manufacturer /
model / category / device type (substring, Hebrew-folded, with datalists of
values present), face, has-IP, and wiring (cabled / partial / uncabled —
computed from the interface/cable rollup).
Active facets render as removable chips in the toolbar, and every facet is a
URL param (`?unracked=1&site_id=3&face=front&wiring=uncabled`), so a filtered
view is bookmarkable, survives reload, and can be named via **Saved views**
(built-ins: *Unracked inventory*, *Offline*, *No IP linked*).

The table shows **one page of 100 devices** at a time — the pager sits in
the toolbar, the page is `?page=` in the URL, and any other change returns
to page 1. The server filters, sorts (any column, in the order the table
always used: digit runs compare as numbers, so `sw-2` comes before `sw-10`)
and counts, so the browser never downloads the whole estate. Each facet's
counts apply every *other* active filter, so with nothing picked they cover
the whole estate. The header checkbox selects the devices on the page; a
selection survives paging and filtering, and fleet actions take up to 500
devices.

- **New device** creates unracked inventory. Place it later with **Place**
  on its own page (see *Device detail*), from a rack's **Add device →
  Existing device** tab, or by patching `rack_id`/`u_position`. The rack
  editor moves devices that are already racked; it does not pick up
  unracked ones.
- Clicking a row opens the device detail page.

The **search box** above the table searches without opening Filters: it
writes the same `?q=` the Filters sheet does — name, address (any linked
IP, e.g. `10.0.3.`), serial, MAC, model, rack and site — and the exports
replay it.

**Edit fields** (in the fleet bar's actions, with devices selected) sets
site, family, manufacturer, model or lifecycle on the selection. Each field
starts at *keep*; only the ones you set are written. Every device is
written on its own through the device's normal save, with the version the
list loaded, so each gets its own changelog row; a device someone changed
since the list loaded, or a racked device whose rack has another site, is
listed as failed with the reason and the others still save. There is no
bulk delete.

**Saved views** on this page and on Racks are stored with your account, so
a view saved in one browser is offered in another; they are private to
you. The first visit after the upgrade moves the views this browser kept
into your account once (a view of the same name already in your account
wins). With sign-in disabled, views stay in the browser.

Below 640 px the list reads as **cards**: the name wraps on whole words,
the family, lifecycle, health, model, site and rack sit under it, and the
row actions (history, edit, pin, delete) are in the card's menu.

## Device detail

`/devices/[id]` is the device's home. Under the name, a **summary strip**
says what needs attention — offline, monitors down, cable flags, failing
compliance rules, observed links with no cable that name the device, and a
lifecycle other than active — each item a link to the section that
explains it. *Nothing needs attention* when there is nothing to say.

The page has five tabs, and the URL carries the one shown (`?tab=ports`):
**Overview** (placement, identity, notes, attachments, monitors, guests,
related) · **Ports & cables** (addresses, the port grid, the cable list) ·
**Config & compliance** (SNMP, config backup, compliance) · **Access**
(NAC, discovered services) · **History**. Links from Review and the map
(`?trace=`, `?cable=`, `#snmp`) open the right tab.

- **Placement card** — the rack name (linking straight to its elevation at
  the right U), U range, face; or "unracked". Carrier children see their
  carrier + slot; carriers see their slot layout. **Place** (unracked) or
  **Move** (racked) opens a dialog on the device's own page: **Find a
  place** asks with the device's own height, power, weight and depth (at
  its site, or everywhere) and each rack it fits fills the form; or pick a
  rack, a face and a start U, with **Find free U** for the lowest span that
  fits. The save is the device's normal update with the version the page
  loaded. A retired device is set back to active first; a carrier's child
  moves with its carrier, and a VM guest is never racked.
- **Edit** — the device's fields, its lifecycle, and its **site**. While
  the device sits in a rack that has a site, the site field shows the
  rack's site and is fixed: a racked device always takes its rack's site.
- **Identity card** — manufacturer/model, serial, MAC, site, linked
  [asset](/docs/inventory/), power/weight.
- **IP addresses** — the device's whole address set with status and last
  seen; the panel header shows *last seen by scan* — the freshest
  `last_seen` across those linked addresses, stamped by each scan's
  reconcile pass. Link an existing address with the picker (type to
  search across all addresses — hostname, vendor and address all match)
  and unlink with the broken-link icon. Linking an address that's on
  another device moves it — one IP belongs to at most one device.
- **Interfaces** — the device's port grid: generate a whole set in one
  click (`Gi1/0/` × 48, or a patch panel's front+back via a pair prefix),
  **apply a template** to stamp a whole catalog layout, cable ports to
  other devices, and trace the L1 path (through up to 64 cables — patch
  panel pass-throughs are free; past that the sheet names the port where
  the path continues). Ports flagged by
  [cable validation](/docs/snmp/) carry an amber ⚠ (tooltip = the
  mismatch reason + peer detail) and the header shows a *N cable flags*
  badge. See
  [Cabling](/docs/cabling/). Below the grid, the **cable list** has one row
  per cabled port — the peer device and port, the cable's kind, label and
  lifecycle, and **Trace** — so it always matches the grid's cabled count.
- **SNMP, Config backup and NAC write access** keep their credential forms
  closed behind **Configure**; the status, the stored-credential chips and
  the test/poll/pull buttons stay visible.
- **Related** — the certificates and services whose `device_id` points at
  this box, each linking back to its list page (certs carry their expiry
  countdown chip). Deleting the device orphans those rows — the link
  clears, the record survives.
- **Notes** — inline-editable.
- **History** — every create/update/delete, including placement moves
  (rack → unrack → rack changes are audited as updates), and the address
  rows that link, unlink or move an address to or from this device — so
  losing an address shows on the device that lost it.

## Lifecycle

Every device has a **lifecycle**: `planned`, `active` (the default — every
existing device reads active), `decommissioning` or `retired`. Set it in the
device's edit dialog, on create, in bulk with *Edit fields*, or with the
`status` column of the CSV/XLSX import and export; the list filters and
counts by it (`?status=planned,decommissioning`). Anything but active shows
as a badge on the list and the page.

**Retire** (the archive button on the device page) sets `retired`, stamps
`retired_at` and takes the device out of its rack (a carrier's children
leave with it). Its ports, cables and addresses are kept — nothing is
deleted; **Delete** stays for mistakes, with its count of the ports and
cables that go with it. A retired device raises no Review item (offline,
unracked, uncabled, cable mismatch) and its monitors are paused: they send
no notification while it is retired. Setting it back to active from Edit
clears `retired_at`; place it again with **Place**.

**Not seen since** — a device every source's word calls gone (its addresses
stopped answering scans, vCenter removed its VM, Active Directory disabled
its computer, its switch neighbour left the port) carries a card under the
hero with each source's word and age, and LanCompass suggests **Start
decommissioning**: at once on a source's own word, otherwise after
**Suggest decommissioning after (days)** (14 by default) of silence. The
button moves the device one step, *active* → *decommissioning*, as a batch
you can undo; *retired* stays the separate **Retire**. **Keep…** keeps it
with a reason until a source sees it again — see
[Gone, decided in one place](/docs/discovery/#gone-decided-in-one-place).

**Cables** have a lifecycle too: `planned`, `active` or `decommissioning`.
A new cable to or from a planned device starts `planned`, every other new
cable `active` — or pick one in the cable dialog. The trace sheet and the
device's cable list show it.

## Config backup

The box that documents your devices also holds their last-known-good
configs: the **Config backup** card on the device page pulls the running
config over SSH, stores every *change* as a revision, and diffs any two
of them in the UI. Pull-only by design — drivers run read commands
(`show running-config`, `/export compact`, …); there is no push, deploy
or write path anywhere in the feature.

**Setup** (write permission): pick a **driver**, store an **SSH
credential** (username + password, or username + an OpenSSH private key
with an optional passphrase — plus an optional enable password for
ios-style privilege escalation — a write-only v6 secrets blob, same
contract as the SNMP card: fields start blank, the *SSH creds stored*
chip marks that one exists), then flip the nightly toggle. The pull
targets the device's first linked IP — link an address first.

| driver    | what it runs                                             |
|-----------|----------------------------------------------------------|
| `ios`     | PTY shell: `enable` → `terminal length 0` → `show running-config` |
| `routeros`| exec `/export compact` — the sanitized export (deliberately *not* `show-sensitive`, which would write plaintext creds into the DB) |
| `linux`   | a system fingerprint — `os-release`, `uname`, `ip addr`, `/etc/network/interfaces` |
| `generic` | your own one-line command, stored per device (no shell metachars, ≤255 chars) |
| `gaia`    | PTY shell, clish: `show configuration`, its `-- More --` pager answered; an account that lands in expert mode (`[Expert@…]#`) runs `clish -c "show configuration"` |
| `fortios` | PTY shell: `show`, its `--More--` pager answered — never `config`, `set`, `execute` or `show full-configuration` |

**Runs**: the nightly sweep (first UTC minute of each day, 4-way
semaphore, jittered) pulls every enabled+credentialed device; **Pull
now** does one inline. Connect timeout 15 s, per-command 30 s, output
capped at 1 MB (truncated revisions are flagged, not failed). A pull
whose SHA-256 matches the newest revision stores *nothing* — nightly
noise stays at zero rows — while a changed config stores a revision,
prunes the history to the newest 20, and emits a `config.changed`
notification (a failed pull emits `config.pull_failed` once, on the
first failure — repeated nights stay silent until it recovers).

**Revisions**: the list shows when each revision was pulled, its size,
driver and sha prefix, plus a diff preview. *View* renders the full text
in a monospace LTR pane with in-text search; the diff pickers color any
pair's unified diff (+/− lines).

**Secret masking**: on every pull, for every driver, known secret values
become `<redacted>` before the config is hashed, stored or checked by
compliance rules — SNMP communities, `username` and `enable` secrets and
passwords, TACACS+/RADIUS keys, `key-string`, pre-shared keys, NTP
authentication keys and PEM private-key blocks, plus each driver's own
forms (Gaia `password-hash` and SNMP communities; FortiOS `ENC` values,
`psksecret`, `passwd` and certificate blocks; RouterOS SNMP community
names and SNMPv3 passwords). The keyword and the line stay, so rules
still see the shape, and a secret that changes on its own no longer
stores a revision. Factory defaults (`public`, `private`, `cisco`,
`admin`, `password`, `secret`) are never masked: they are not secrets,
and the compliance packs exist to flag them. Upgrading to 0.4.1 re-masks
the revisions and findings already stored, once, in place
(`python -m app.cli remask-configs` does the same by hand). Backup files
written before 0.4.1 are not rewritten and still hold unmasked text.

**Who reads config text**: the revision list, pull status, host-key
state and compliance findings need only read access. Opening a revision
or a diff needs the `config:read` permission — Contributor, Operator and
Administrator hold it, Viewer does not — and an API token needs the
`config:read` scope for those two routes.

**Security notes**: credentials authenticate by password or OpenSSH
public key (private key + optional passphrase; no telnet or SCP/SFTP
paths), are never returned by the API, and any echo of them is stripped
from captured text before it reaches the DB. SSH host keys are **pinned
per device**: the pull probes the presented key *before* credentials are
sent and verifies it against the stored pin. `config_host_key_policy`
(Settings → Features) picks the posture — `tofu` (default) trusts the
first key a device presents, `strict` parks every new key as *pending*
until an admin approves it, `off` keeps the pre-V54 unverified lane. A
changed key fails the pull, lands in **Review → SSH host keys** with
both fingerprints, and fires `config.host_key_changed` once on the
transition; the card shows the trusted fingerprint, who trusted it and
when it last verified, and admins get **Trust new key** / **Reject** /
**Forget host key** rulings (all audited). Revision text is sensitive
and lives in the database; it is included in backups (the history is the
point — encrypt backup files at rest as you would the DB).

## Config compliance

The box that holds the configs also *reads* them: **Compliance rules**
(Settings → Monitoring) are declared regex policy evaluated against
every stored revision. A `must` rule fails when its pattern is absent
(a required line like `ntp server`), a `must_not` rule fails per
matching line (a forbidden string like a plaintext `password`), and
each rule scopes to all devices, one config driver, one family, or one
site. Bounds are the point: ≤200 rules, patterns ≤500 chars, ≤5 matched
lines kept per (rule, device), evaluation over the same 1 MB window
the pull enforces.

Every new revision is evaluated the moment it lands. A violating rule
opens a **finding** — one row per (rule, device), carrying the
offending line(s) with line numbers — emits `config.compliance_failed`
once per transition, and the finding lands in the **Review** queue's
Config compliance section, worst-severity-first. A rule still broken
across later revisions updates the row in place and stays silent; a
clean pull deletes it; a fail → clean → fail cycle is a new transition
and pages again. Dismissal rides the review machinery keyed to the
(rule, device) pair, so a dismissed finding stays dismissed even when
its row is recreated.

Rules are data, never code — `re.compile` at eval time, no execution
of anything user-supplied, and a regex match is an *observation*, not
proof: the review item shows the matched line so an operator verifies.
The **Compliance** card on the device page shows every in-scope rule's
verdict with expandable matched lines, and the rule dialog's **test**
dry-runs a draft against the fleet's latest revisions before saving —
nothing is persisted. Rule edits and device-side scope drift are caught
by a sweep that re-evaluates latest revisions (never history) on the
next scheduler tick, plus an unconditional nightly pass — every device
that holds a stored revision, its nightly pull on or off (the sweep reads
the stored text, never the device). Until that sweep has run, a rule
added after a device's latest revision (a pack just installed) reads
**not evaluated** on its card, never *passed*. A *Pull now* whose config
has not changed stores nothing and evaluates nothing.

> [!details] Step-by-step — configure compliance from zero
>
> A rule can only read what the box stores — work through these in order.
>
> **1. Confirm configs are being pulled.** Every device you want covered
> needs a config driver (`ios`, `routeros`, `linux`, `generic`, `gaia`,
> `fortios`) and
> working SSH credentials. Open a device → Config tab → *Pull now* and
> confirm a revision lands. A device with no stored revision reports
> **not evaluated** — never a false pass.
>
> **2. Create the rule.** Settings → Monitoring → *Compliance rules* →
> *New rule*:
> - **Name** — what operators see in Review, e.g. "No plaintext
>   passwords".
> - **Enabled** — leave on; disabled rules are skipped entirely.
> - **Severity** — `info` / `warn` / `crit`; sorts findings in the
>   Review queue.
> - **Match** — `must_not` flags each *matching* line (forbidden
>   pattern); `must` flags when the pattern is *absent* (required
>   pattern).
> - **Pattern** — a regex such as `password\s+\S+`. Max 500 chars;
>   invalid regexes are refused on save.
> - **Scope** — all devices, one config driver, one family, or one site.
>
> **3. Dry-run it.** Press **Test** inside the dialog — the draft is
> evaluated against the fleet's latest revisions and lists would-be
> findings. Nothing is persisted; iterate on pattern and scope until
> the preview matches your intent, then save.
>
> **4. Let it evaluate.** Every new pull is checked as it lands; the
> scheduler sweep re-evaluates latest revisions on the next tick, so
> already-stored configs are covered within a minute — plus an
> unconditional nightly pass. Identical pulls store no revision and
> skip evaluation.
>
> **5. Watch a violation land.** Pull a config containing the pattern:
> the device's **Compliance** card flips to *fail* with the offending
> line(s), the finding appears in **Review → Config compliance**
> (worst severity first), and `config.compliance_failed` emits once —
> the transition, not every eval.
>
> **6. Route the notification.** The event exists out of the box; to
> deliver it, enable `config.compliance_failed` on a notification
> channel (Settings → Monitoring → *channels*). One notification per
> fail transition — a still-broken rule stays silent; fail → clean →
> fail pages again.
>
> **7. Review, fix, verify.** The review item shows the matched line so
> an operator judges — a regex is an observation, not proof. Dismiss if
> the hit is expected: the dismissal is keyed to (rule, device) and
> survives re-evals and finding-row recreation. Fix the device, pull
> again — a clean revision deletes the finding.
>
> **Day two.** Toggle rules off/on from the card; editing pattern or
> scope re-evaluates on the next sweep; deleting a rule cascades its
> findings. Budgets: ≤200 rules, ≤5 evidence lines per (rule, device).
>
> **Starter patterns** (scope: one driver or all):
> - `must_not` `password\s+\S+` — plaintext password lines
> - `must` `ntp server` — NTP configured
> - `must_not` `(^|\s)telnet` — telnet anywhere in the config
> - `must` `service password-encryption` — Cisco credentials encrypted
> - `must_not` `community\s+public` — default SNMP community string

## Device groups & fleet bulk ops

Devices are addressable by site, tag, family and rack — and by nothing
else. "All access switches" isn't a site, isn't a tag somebody remembered
to apply, isn't a rack: it's a *fleet*. A **device group** is a named,
colored fleet with **explicit membership** — devices join and leave only
because somebody (or a bulk action) added or removed them. There is no
rule engine on purpose: smart membership over facets reads like a query
that silently rewrites itself, and the honest group is a named set an
operator maintains. Tags say what a device *is*; a group says which fleet
it *belongs to* — both exist because they answer different questions.

Groups live under **Devices → Groups**: a list with name, color, member
count and description, plus a membership editor (search-and-add device
picker, remove-per-row). Membership caps at 5000 devices per group. The
devices list gains a **Device groups** facet (`?group=` — deliberately a
different param than `group_id`, which is the *rack* group) and a
**Groups** column of square-swatch chips, and the device detail's
identity card shows the same chips. A chip links back to the list
pre-filtered to its fleet.

The point of a fleet is acting on it. Tick the checkboxes on device rows
(select-all covers the visible page) and the bulk bar offers five
actions, each a real per-device write path — not a bulk bypass:

- **Assign SNMP credentials** — writes the encrypted `snmp_cred_enc`
  blob per member (v1/v2c community or v3 user/auth/priv; an optional
  version stamp pairs with it). Sets the credential only — the
  `snmp_enabled` flag stays per-device and deliberate.
- **Set config backup** — driver, nightly-pull enablement and an
  optional generic command + SSH credential per member, validated by the
  same merged-state rules the single-device PATCH applies.
- **Enroll monitor** — creates a real monitor target (ping / TCP port /
  HTTP) per member; a member that already has an identical target is
  *skipped*, not duplicated.
- **Apply template** — the template's interface + power-port layout per
  member (merge, or replace — which fails honestly on cabled ports).
- **Add/remove group** — membership moves, the same join rows the
  members editor writes.

Every action is **preview-first**: the dialog resolves the member set and
lists exactly which devices are about to be touched (first 200 listed,
"+N more" after) before *Apply* unlocks. Applying then runs N sequential
per-member commits — a failed member rolls back only itself — and reports
an honest result set: `applied` / `skipped` (with the reason — *already a
member*, *nothing to change*) / `failed` (with the per-device error) /
`missing` (ids that stopped resolving mid-run). Bulk selection caps at
**500 devices per action**. Each member write produces its own changelog
row with your user as actor — never a single opaque "bulk" entry — and
credential blobs are sealed end to end: write-only in, never rendered in
results, logs, or audit diffs.

Out of scope by design: rule-based ("smart") membership, nested groups,
per-group dashboards, bulk *destructive* actions (delete stays a
single-row decision), group-level alerting rules, and API-token group
scoping.

## Device templates

A **device template** is a reusable, typed port layout — "a 48-port
switch is the same 48 ports every time". Templates live under
**Devices → Templates** and stamp a device's whole interface set in one
apply instead of clicking `/interfaces/generate` per range.

- A template carries the catalog fields (manufacturer, model,
  `device_type` slug, U height, default face, colour, category, watts,
  weight) plus its `interfaces` list — `{name, kind, speed_mbps,
  position, pair}` — and optional `power_ports` (PSU inlets / PDU
  outlets, stamped as `kind=power` ports).
- **Paired ports**: an entry's `pair` names a sibling entry — the two
  stamp with reciprocal `pair_interface_id` links, the same convention
  the generate dialog's *pair prefix* uses (patch-panel `p1..24` ↔
  `b1..24`). Pairs must be declared on both entries and share their
  position index.
- **Apply** (device detail → Interfaces → *Template*): *merge* adds the
  ports the device is missing and reports existing names as skipped;
  *replace* wipes the device's ports first — and is refused with a 409
  naming the offenders when any of them is cabled. Cabling is never
  silently dropped.
- **Create with a template**: both the /devices *New device* dialog and
  the rack's *Add device* form have a template picker. Choosing one
  prefills the fields and the save calls `instantiate` — device +
  interfaces land in a single transaction, rack placement included (a
  placement conflict refuses before anything writes).
- **Builtins**: the app seeds ~10 generic templates (`switch-48`,
  `patch-panel-24`, `generic-1u-server`, `pdu-8`, …) once at startup.
  Editing a builtin converts the row into your manual copy (the seed
  tombstone keeps it from re-appearing); the duplicate button forks one
  while leaving the builtin intact.
- The **editor** is a port grid — name / kind / speed / pairs-with per
  row — with a range expander (`Gi1/0/1..48 sfp28 25000`, optional rear
  range for paired patch ports). When `device_type` matches a
  rack-library slug the *prefill from library* button fills the catalog
  fields (the bundled library carries no port data, so the grid stays
  hand-authored).

## Entity families

Every device carries a **family** — `network` (the default), `compute`,
`storage`, `wifi`, `power`, or `other`. Family is classification, not a
parallel entity stack: all six share the same IP ownership, health
rollup, monitoring, interfaces, and cabling machinery. It shows up as a
facet on the devices list, a badge on device detail, an icon
on the [topology](/docs/topology/) canvas, and a glyph on the rack
elevation when no product image matches.

**VMs are devices.** A virtual machine is just an unracked
`family=compute` device with `host_device_id` pointing at its
hypervisor/physical host:

- The device form's family picker reveals a **Runs on host** field on
  compute rows; host links are one level deep (a guest can't host, and
  cycles are rejected).
- Guests stay unracked — setting both a host and a rack placement is a
  422. IPs, health, monitoring, ports and cables all work as usual.
- The guest's detail page links back to its host; the host's detail page
  lists its **guests**. Deleting a host *orphans* rather than deletes —
  guests keep their rows with `host_device_id` cleared, and the detail
  page flags the orphaned state.
- Guests never count against rack capacity — they consume the host's
  resources, not U space, watts or kilograms.

**Storage volumes** are the other satellite: a `family=storage` device's
detail page grows a *Volumes* card (name / pool / size GB / protocol /
thin). `GET /api/v1/volumes` is the flat reporting view.

WiFi SSIDs are logical satellites of their own — see
[WiFi networks](/docs/wifi/).

## Health rollup

Device health is the **worst status across its linked IPs** — that's what
the elevation dot and the list/detail badges show:

| Precedence (worst first) | Dot |
|---|---|
| `offline` | zinc |
| `discovered` | violet |
| `dhcp` | cyan |
| `reserved` | amber |
| `active` | green |
| *(no linked IPs)* | grey — unmonitored |

So the box goes red-dot the moment its iLO drops off even if the service IP
is fine — the "health IP" shown on the rack panel is the worst-status
address driving that rollup.

An address counts as `offline` here when its status is `offline` **or** it
is a documented `active` address the scans stopped finding (*not answering*
— a scan never changes the status of an address a person documented; see
[IP Addresses](/docs/addresses/)). `reserved` and `dhcp` are intentional and
never count as offline. The same rule drives the rack LEDs, the topology
health dots, the dashboard's device counts and Review's Offline devices.

## Devices vs racks

- Placing a device (via `PATCH rack_id`, the rack form, the elevation
  editor, or create-with-placement) runs the same face-aware collision
  rules as always — see [Racks](/docs/racks/).
- **Unracking** (the rack row's unrack action, or `PATCH rack_id=null`)
  clears placement but keeps the device and every IP link.
- **Deleting a rack** unracks every device in it — devices are never
  cascade-deleted.
- **Deleting a device** (`/devices/[id]` → trash) removes the row itself:
  its IPs unlink (SET NULL — the addresses survive), carrier children
  unmount, and its ports and the cables on them are deleted with it —
  each cable with its own History row; the dialog says how many.
- The rack device form's **Linked IP** field adds one address — the
  device's other addresses stay linked. Taking an address another device
  owns asks first. Additive per-IP management lives here and on the IP
  drawer's **Device** field.
- **Site follows the rack**: placing a device in a rack sets its site to
  the rack's, and naming another site for a racked device is refused. The
  site filter, its counts and both exports place a racked device without a
  stored site at its rack's site.
- **Two editors, one device**: the edit dialogs send only the fields you
  changed. When someone saved the device after you opened the dialog, the
  save asks *Reload* (see theirs) or *Overwrite* (keep yours) instead of
  silently losing either.

## From the IP drawer

Every [IP address](/docs/addresses/) drawer has a **Device** field: pick an
existing device (name/model/serial search) or use **+ create device from
this IP** — it pre-fills the device from the address's hostname, MAC and
vendor, then links the address on save.

## From the Discovery inbox

A host the scanner or the passive listener found becomes a device from the
[Discovery](/docs/discovery/#creating-devices-in-bulk) inbox: **Create device**
on one row (a row without an identity opens a short form), or a whole group —
*10 printers in Lab — Tel Aviv* — with **Review and create…**, one batch
with **Undo**. The device is named as the network names the host, typed and
made from its identity, with the address's MAC and the subnet's site.

Its page then says how it was made: *From discovery — batch #12* (a link to
the decision batches, where the batch can be undone while its window lasts),
the address it came from, and that address's identity chip — **Why?** shows
the evidence.

Two devices that turn out to be one machine are merged from either page with
**Merge with…**: the preview chooses field by field, everything moves to the
device kept, and the other is retired, never deleted (see
[Merging two devices](/docs/discovery/#merging-two-devices)).

## Export & import

The toolbar's **Export** dropdown downloads the *currently filtered* set —
the URL's facet params are appended to the export URL, so a filtered view
exports exactly what it shows (the filename marks it `devices-filtered.*`).

- **CSV** — UTF-8 with BOM (opens cleanly in Excel, Hebrew included).
  `columns=` whitelists columns for lean exports.
- **XLSX** — a single `devices` sheet, plain values.

Column order is the round-trip contract: `id, name, device_type, family,
status, manufacturer, model, category, serial_number, mac_address, site,
rack, rack_group, u_position, u_height, u_label, face, carrier, slot,
slot_layout, host, watts, weight_kg, depth_mm, airflow, power_capacity_w,
mount_side, ips, ip_count, interface_count, cabled_count, source, notes,
created_at, os_description`. `u_position` is the physical slot and is what re-imports;
`u_label` is the same slot as the rack numbers it (export only), and
`os_description` the software the device runs where SNMP knows it (its
sysDescr; export only — the importer ignores it).
Site/rack/rack-group/carrier/`host` export as
**names** (`host` resolves back to `host_device_id` on import — a guest
listed *before* its host in the file still links, the importer resolves
pending names in a post-pass), `ips` as a space-separated address list,
and `id` stays so re-import can pin exact rows for updates.

**Import** (write permission) opens the smart-import dialog: pick a `.csv`
or `.xlsx`, review the auto-mapped columns (English, Hebrew and NetBox
headers all map — NetBox's `device_role`→device type, `device_type`→model,
`position`→U), fix any flagged-unmapped column, then **Run preview**.
Rows match existing devices by `id` → `serial_number` → `mac_address` →
`name`+site (an ambiguous name is an error, never a coin flip; an `id`
only matches when that device carries the row's name, so a file from
another install never renames or rewrites one of yours), and the
preview shows each row's action with honest `{field: [old, new]}` diffs in
update mode. Placement conflicts, unknown sites/racks/carriers and bad
values are per-row errors that name the offender; `unracked_on_missing`
salvages rows whose rack (or its rack_group qualifier) can't be resolved —
they land as unracked inventory with a note, ambiguity still errors. Carrier trays and their
children are handled two-pass — a file can mount children on a carrier it
also creates, and children inherit rack/U/face. `ips` only ever links
*existing* addresses (unknown tokens warn, never create). Commit is
all-or-nothing unless `force` is on; every write goes through the normal
device paths so the changelog records imported changes.

The same importer runs inside [rack bundles](/docs/racks/#export--import) —
a `devices` sheet in a rack/group workbook follows these exact rules, with
`name` matching scoped to the rack the row is being placed into.

## API sketch

```
GET    /api/v1/devices?q=&rack_id=&site_id=&group_id=&group=&unracked=
       &mounted=&face=&family=&status=&manufacturer=&model=&category=
       &device_type=&source=&has_ip=
       &wiring=&health=            # every page facet is a param; CSV sets
       &sort=&limit=&offset=       # (face=front,rear), AND semantics, 422
                                   # on bad values; every facet is SQL, so
                                   # total stays honest under limit/offset;
                                   # sort=name.asc,ip_count.desc — the
                                   # table's columns, ties in default order
GET    /api/v1/devices/facets       # same filters: counts per facet value
                                    # (each under the OTHER filters) + the
                                    # attribute fields' values
POST   /api/v1/devices              # unracked or placed (rack_id + u_position)
GET    /api/v1/devices/{id}         # detail: ips[], asset, rack, carrier, health
PATCH  /api/v1/devices/{id}         # attrs + placement (rack_id=null unracks)
DELETE /api/v1/devices/{id}         # real delete — IPs unlink
POST   /api/v1/devices/reorder
GET    /api/v1/devices/export.csv   # every list param + columns= whitelist
GET    /api/v1/devices/export.xlsx  # same set, one 'devices' sheet
POST   /api/v1/devices/import       # raw file + filename=; dry_run=1 (default),
                                    # on_match=skip|update, unracked_on_missing,
                                    # mapping={header:field}, force, detect
PATCH  /api/v1/addresses/{id}       # device_id link/unlink lives here too
POST   /api/v1/devices/{id}/retire  # {expected_updated_at}: retired, unracked;
                                    # ports, cables, addresses kept
GET    /api/v1/devices/{id}/summary # the strip: open compliance findings,
                                    # monitors by state, ghost links
POST   /api/v1/devices/bulk         # action=edit_fields, params {site_id,
                                    # family, manufacturer, model, status},
                                    # tokens {id: updated_at} — per device
GET/POST /api/v1/saved-views?page=devices|racks  # your own views
DELETE /api/v1/saved-views/{id}
POST   /api/v1/discovery/{ip_id}/create-device   # create + link + confirm,
                                    # one transaction, the subnet's site

GET    /api/v1/device-templates?q=            # template catalog
POST   /api/v1/device-templates               # JSONB layout validated on write
GET/PATCH/DELETE /api/v1/device-templates/{id}
POST   /api/v1/devices/{id}/apply-template    # {template_id, mode merge|replace}
                                            #   → {created, skipped, blocked};
                                            #   replace 409s naming cabled ports
POST   /api/v1/device-templates/{id}/instantiate
                                            # device + ports in one tx, through
                                            # the normal placement checks

# config backup (V38)
POST   /api/v1/devices/{id}/config/pull     # one SSH pull, inline (data:write)
GET    /api/v1/devices/{id}/config/revisions      # metadata list, newest first
GET    /api/v1/devices/{id}/config/revisions/{r}  # full text for one revision (config:read)
GET    /api/v1/devices/{id}/config/diff?a=&b=     # unified diff between two (config:read)

# config compliance (V39)
GET/POST/PATCH/DELETE /api/v1/compliance/rules[/{id}]
                                            # rule CRUD (write perms mutate)
POST   /api/v1/compliance/rules/test        # dry-run a draft, nothing saved
POST   /api/v1/compliance/rules/{id}/test   # dry-run the stored rule
GET    /api/v1/compliance/findings?device_id=&rule_id=   # open findings
GET    /api/v1/compliance/devices/{id}      # this device's per-rule verdicts

# device groups + fleet bulk ops (V48)
GET/POST/PATCH/DELETE /api/v1/device-groups[/{id}]
                                            # CRUD (write/delete perms mutate)
POST   /api/v1/device-groups/{id}/members   # {device_ids[]} → {added, already}
DELETE /api/v1/device-groups/{id}/members/{device_id}
POST   /api/v1/devices/bulk               # {action, device_ids[], params,
                                          #  preview} — preview=true resolves,
                                          #  false runs per-member real writes
                                          #  → {applied, skipped, failed, missing}
```

The rack routes (`/racks/{id}/devices…`) are unchanged — they manipulate the
same `devices` rows' placement columns, and a rack-side DELETE unracks
rather than deletes.
