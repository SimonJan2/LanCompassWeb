---
title: "IP Addresses"
description: "Statuses, roles, NAT links, bulk ops, and CSV import/export."
category: "ipam"
version: "0.7.0"
order: 20
---

# IP Addresses

Individual addresses live inside a [prefix](/docs/subnets/) and carry both
*documented* intent and *observed* reality.

## Statuses

| Status | Meaning |
|---|---|
| `active` | Documented and expected live |
| `reserved` | Allocated, not deployed |
| `dhcp` | Handed out dynamically |
| `discovered` | Seen by a scan but not yet confirmed — review in the [Discovery Inbox](/docs/discovery/) |
| `offline` | A scan-found host the recent scans stopped finding (or a status a person set) |

The status is the plan: **a scan never changes the status of an address a
person documented** (manual, import, request or demo rows). What the scans
saw is its **presence** beside it — *answering*, *not answering* or *not
scanned yet*. Only rows a scan created (source `scan` or `passive`) go
`offline` when they stop answering, and a `discovered` one that answers
again is `discovered` again — only a person confirms a discovery.

Health reads both: a documented `active` address that is not answering
counts as offline in its device's health (the rack LED, the topology dot,
the dashboard's device counts, Review's Offline devices), while the address
counts by status keep it `active` — the dashboard's *Addresses not
answering* counts it on its own.

## Documented and observed

Each address carries what a person documented — MAC, vendor, device type,
hostname — and, beside it, what the scans **observed**: the observed MAC,
vendor, type and hostname. A scan, passive discovery and a scan-file import
write only the observed side on an address they did not create; the
documented side changes only when a person changes it. Where the two differ,
the address waits in [Review](/docs/review/) → **Address drift**, and the IP
drawer shows *Documented* and *Observed* side by side with the difference
marked and the same three decisions: **Accept observed**, **Keep
documented**, **Ignore 30 days**.

On the subnet page each cell keeps its documented status colour and carries
**two marks**: the documented status at its start corner and the observed
mark — answering, missing, changed, conflict or discovered — at its end
corner, each in its own shape, with a legend keyed *Documented* and
*Observed*. Picking a cell opens the page's **detail panel** with the
documented and observed values side by side and the decisions; **Edit**
opens the IP drawer's form. To take a new address, the subnet's **Find &
reserve** tab lists the next free ones and shows the PTR record a DNS name
would publish ([Subnets](/docs/subnets/)). The filter rail has **Presence**
and **Drift** facets beside Status.
The CSV export carries `observed_mac`, `observed_vendor`,
`observed_hostname`, `observed_type` and `presence` after the documented
columns.

## Roles

`vip`, `vrrp`, `hsrp`, `glbp`, `carp`, `secondary` — mark addresses that
float between devices so reconciliation doesn't treat them as ordinary
hosts.

## Fields worth knowing

- **MAC / vendor** — vendor is resolved from the bundled IEEE OUI database.
- **Hostname, open ports, device type** — filled by scans (router / printer /
  camera / nas / phone / tv / iot / vm / server / workstation).
- **NAT inside** — link an outside address to its inside translation.
- **Serial, switch name/port, counter location, custom fields, notes** —
  inventory-grade metadata per address. The switch fields also have a
  structured sibling — **connected interface** (below) — that points at a
  real port; the free text stays as the import record.
- **Connected interface** — the far-end port (usually a switch's) this
  address is patched into, picked in the drawer as device → interface.
  See [Cabling](/docs/cabling/) for the full L1 model and the
  `match-free-text` transition helper.
- **Last seen** — the last scan that observed the host.
- **MAC mismatch** — the observed MAC differs from the documented one. The
  documented MAC stays; the mismatch stands in Review (and counts on the
  dashboard) until the two agree or a person decides — it never clears
  itself.

## Provenance

Every address records **where it came from** in `source`:

`manual` — created or reserved in the UI · `import` — workbook/CSV import ·
`scan` — first seen by the network scanner · `request` — allocated by an
approved [IP request](/docs/requests/) (`snmp` and `integration` are
reserved for future writers).

The scanner records what it saw (last seen, presence, open ports and the
observed MAC, vendor, type and hostname) on any address but **never claims
ownership** — a manual or imported row keeps its source and its documented
fields, so a scan can't launder curated data into "discovered". Hosts from
an nmap or masscan file are observations too: they arrive as `scan` rows,
inside the subnet that holds them, never as a `/32` prefix each. The filter
panel's **Source** facet and the `?source=` API/export parameter select by
it, and the IP drawer shows it as a badge next to status.

Users without write access don't add addresses directly — they file an
[IP request](/docs/requests/), a reviewer approves it, and the allocated
row lands here with `request` provenance pointing back.

## Who owns an address's values

An address's documented values — status, hostname, MAC, vendor, type, role,
device, port link and notes — belong to whoever its `source` names, and an
automatic writer changes them only on the rows it owns:

| `source` | Who changes the documented values |
|---|---|
| `scan`, `passive` | the scanner and the passive listener, and people |
| `snmp` | the SNMP poll, and people |
| `integration` | the source sync that created the row, and people |
| `manual`, `import`, `demo`, `request` | people only |

The moment a person decides, a scanned, passive or SNMP address becomes
`manual`: confirming, reserving or marking a host as a DHCP client in the
[Discovery inbox](/docs/discovery/#confirming), creating a device from it,
changing its status or role in bulk, accepting a new host in
[Review](/docs/review/), or editing one of those values by hand. What a lane
sees afterwards lands in the observed values only, and the difference is
Review's address drift. A tag or a custom field on its own leaves the row
with the lane that made it.

The scanner's guess at a type fills an empty type, and the scanner keeps
only its own guess current. While the host is still in the inbox, a fused
identity at or above **Identity proposal threshold**
(`discovery_identity_apply_threshold`, 80 by default) may replace that
guess once — and from then on neither of them rewrites the other's value.
On an address a person decided, the identity's role is only observed, never
written.

## Bulk operations

Select rows (or drag a span in the [subnet matrix](/docs/subnets/)) to set
status, set role, assign tags, or delete — all at once, each change logged.

## Where an address may go

- **Inside its prefix, in the deepest subnet.** An address is attached to
  the deepest non-container prefix of its VRF that holds it; naming the
  container above a subnet answers with the subnet instead. An address
  outside the prefix it names is refused. See
  [Where an address belongs](/docs/subnets/).
- **Not on the network or broadcast address** of an IPv4 prefix of /30 or
  shorter: documenting one asks for **Document anyway**, and the row keeps
  a `boundary_override` mark. /31 and /32 use every address. An IPv6 prefix
  shorter than /127 never hands out its subnet-router anycast address.
- **Not static inside a DHCP scope or pool** without **Assign anyway** (the
  audited `pool_override`, below).
- **Next free and Find & reserve** skip all three: the boundaries, the
  documented rows and, by default, the ranges.

## CSV import & export

- **Export** produces UTF-8-BOM CSV that opens cleanly in Excel — and honors
  the active filters, so a filtered view exports exactly what you see. Each
  row carries its prefix and VRF by name beside their ids.
- **Import** is all-or-nothing with a per-row error report when anything
  fails validation. It reads its own export back: an address already in its
  VRF is skipped when it is the same and updates only the columns that
  differ, so exporting and importing again changes nothing. A row on a
  network or broadcast address needs `force=1`. See
  [Your own exports, back in](/docs/import/).

## The IP drawer

Opening an address slides out a detail panel: every field, its tag chips,
the NAT partner, the owning [device](/docs/devices/) link, the **connected
interface** picker (far-end switch port — the structured sibling of the
switch_name/switch_port free text, which still shows as fallback), pool
membership when the address sits inside an IP range, and the object's own
[changelog](/docs/changelog/) history. Saving a static (active/reserved)
address inside a dhcp/pool range is blocked by a conflict dialog — *Assign
anyway* applies the audited `pool_override`.

## When two people edit one address

The drawer saves only the fields you changed, together with the moment it
loaded the address. If someone saved the address after you opened it —
another person, you in another tab, or a device link made on the device
page — your save is refused with **This changed since you opened it**:
**Reload** shows their version (your edit is dropped), **Overwrite** saves
your changed fields over theirs. A field you did not touch (a device link,
a connected interface, a MAC) is never written back, even on Overwrite.
The inline cells in the address list (status, hostname, colour) follow the
same rule. Scripts and API tokens that send no token keep the old
last-writer-wins behaviour (`PATCH /addresses/{id}` takes an optional
`expected_updated_at`; a stale one answers `409 {"detail": "stale"}`).
