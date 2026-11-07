---
title: "Review Center"
description: "One queue for every flag — mismatches, aging, expiry, unresolved refs."
category: "operations"
version: "0.7.0"
order: 31
---

# Review Center

One queue for every flag the system raises. LanCompass already detects MAC
mismatches, cable mismatches, duplicate MACs, aging discoveries, offline
hosts, expiring certificates, unresolved switch references, unmanaged
SNMP senders, uncabled and unracked devices, config-compliance
violations — they all land on
**Operations → Review** (`g v`) as live, computed sections.
Nothing here is a stale snapshot: each section is a query run on read, so
the queue is always current.

## Sections

| Section | What it catches |
|---|---|
| Monitoring incidents | The first section: the monitoring incidents still open and those resolved in the last 24 hours — each with its site, how many targets, how long and who owns it ("nobody on it" while open and unowned); the row opens the incident ([Monitoring → Incidents](/docs/monitoring/)) |
| Config compliance | A stored config revision violates a declared rule — the offending line(s) ride the row |
| MAC mismatches | A scan saw a different MAC than inventory documented |
| Cable mismatches | SNMP evidence contradicts documented cabling — cabled-but-down, far-end MACs absent, or an LLDP neighbor on an uncabled port |
| Duplicate MACs | One MAC on multiple addresses — a multi-NIC host or bad data |
| Aging discoveries | `discovered` rows older than `discovery_expire_days` |
| Offline devices | Devices where **every** linked IP is `offline` or not answering, and at least one went that way by scan miss — one row per all-dark box, not N per-IP rows |
| Offline hosts | `offline` rows past the `scan_offline_grace_scans` hysteresis |
| Certificates expiring | `expires_on` within `cert_warn_days` (or already past) |
| Unmatched switch refs | Legacy `switch_name`/`switch_port` text with no linked interface |
| Uncabled devices | Devices with interfaces but zero cables |
| Unracked devices | Devices with no rack placement — inventory hygiene |
| Capacity forecast | A snapshot-backed trend projects exhaustion inside 90 days at medium confidence or better — estate IP utilization, rack U capacity, IPs used vs the live total, and the top-20 hottest prefixes. Fingerprints pin the entity + metric pair, so a dismissal survives the projected date drifting |
| VLAN drift | Sync-observed VLANs with no planned row covering their site, and planned VIDs sitting outside their group's declared ranges — flags only; the finding never deletes a row |
| Duplicate VLAN numbers | One VID held twice in one VLAN group (or twice without a group) — keep one, move its prefixes to it, delete the rest on the VLANs page |
| Duplicate networks | One network held twice in one VRF, saved before duplicates were refused — each copy with its status, site, addresses and ranges; keep one, move the addresses and ranges to it, delete the rest |
| Address drift | Per subnet, where what scans saw differs from what is documented: **changed** (the observed MAC, vendor or type), **missing** (a documented active host not answering), **conflict** (the observed MAC is documented on another address or device port — both named) and **new** (discovered, not confirmed) |
| Undocumented adjacency | Ghost links: an LLDP/CDP neighbour or bridge-table sighting between two devices with no documented cable between them — open it on the map or document it as a cable |
| Exposed services | Deep discovery's exposure findings: a plain-text management service, an expired, expiring or self-signed certificate, and a listener on every address — each with its port |
| Discovery drift | What changed between deep discovery runs on a host — a port or service that appeared, changed or went away, before → after; each row is its own finding and acknowledging closes it |
| IP requests | Self-service requests waiting for approval — addresses or a prefix — approved and allocated atomically from the row ([IP Requests](/docs/requests/)) |
| NAC findings | Port-control findings: a rogue device on a policed port, more MACs than the port allows, and responses waiting for approval ([NAC](/docs/nac/)) |
| Unmanaged SNMP senders | Devices sending traps with no SNMP credentials — adding them makes the device managed |
| SSH host keys | A host key that changed, or was never approved, on a config pull — trust the new key or check before the pull goes on |
| Rack audits due | Racks whose next audit date has passed ([Racks → audit](/docs/racks/)) |
| Rack audit findings | What a rack audit found and nobody has handled yet: a missing device, an unexpected one, or one that moved |

Counts are honest; each list caps at ~50 rows with a "showing N of M" note.

**Offline devices** is the per-device rollup of the per-IP offline
section: a device flags when ≥1 address is linked, *all* of them are
`offline` or not answering (a documented active address keeps its status
and goes *not answering* instead — the rule device health reads too), and
at least one crossed `scan_offline_grace_scans` on missed
scans — so a box offlined by hand doesn't qualify, and neither does one
whose only address is `reserved`/`dhcp` (intentional statuses, never
offline). Both sections coexist on purpose: the device row says "the
whole box went quiet", the per-IP rows still name which addresses. It's
derived state — one NIC answering a scan drops the device out of the
section for free. MAC-mismatch rows name and link their owning device
when the address has one.

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

Review's section counts are chips: a section with items wears the
needs-attention colour, an empty one stays neutral.

## Actions are real writes

Every button goes through the normal endpoint, so the
[changelog](/docs/changelog/) stays honest:

- **Confirm** on aging discoveries marks the host active and makes it
  yours, as a one-row decision batch, as the
  [discovery inbox](/docs/discovery/) does.
- **Delete** calls the entity's own DELETE — it removes the underlying
  address/device/certificate row, not just the review entry.
- **Accept scanned MAC** writes the observed MAC to the address, as you.
  **Keep stored** leaves the documented MAC *and* dismisses that
  documented→observed pair — the scan keeps seeing it, but it stays out of
  the queue (the persistent, per-address form of `scan_stored_mac_wins`).
  This is the answer for shared dock/NIC MACs. A mismatch never clears
  itself: it stands until the two agree or you decide.
- **Address drift** has three decisions per item: **Accept observed** writes
  the observed value into the documented column as you, in one changelog
  row (for *missing* it sets the status to `offline`, for *new* it confirms
  the host); **Keep documented** dismisses this observation (a different one
  comes back); **Ignore 30 days** hides it for 30 days, then it returns. The
  IP drawer offers the same three beside its Documented | Observed panel.
  Above the list, **Reconcile by subnet:** names each subnet with open items
  and its count — one click opens that subnet's **Reconcile** tab, which
  lists the same items grouped Conflict, Changed, Missing, New, adds **Mark
  free** for a missing host and **Document** for a new one, and decides a
  whole group at once (see [Subnets](/docs/subnets/)). Every decision —
  here, on the tab or in the drawer — is one changelog row as you with the
  decision on it, and the subnet's **Decision history** lists it.
- **Run resolver** on the unmatched-switch section replays the legacy
  text matcher and reports matched / ambiguous / unmatched inline.
- **Open trace** on a cable mismatch jumps to that port's L1 trace
  drawer; **Edit cabling** lands on the device's interface panel. Cable
  flags self-heal when the next poll disproves them — dismissal is only
  for findings you accept as reality.
- **A link the switch contradicts comes with a move.** When an address you
  linked to one port is learned by the switch on another, the flag on the
  learned port ("is learned on this port but linked by hand to …") has a
  proposal waiting in the queue's group *links the switch contradicts*.
  **Review and accept…** shows each row as **Move the link to hq-acc-1 ·
  Gi0/7** before anything changes; pressing it moves the address's link
  from the port you linked to the port its MAC is learned on, as one
  decision batch with one changelog row naming both ports. **Undo** on the
  batch puts the link back and the proposal waits again. Nothing moves on
  its own: a link someone changed since the proposal is refused ("The link
  changed since — nothing to move"), and when the switch agrees with your
  link again the flag clears and its proposal closes with it.

## Dismissal is data, not deletion

**Dismiss** records a `review_dismissals` row keyed on the finding's
fingerprint — the MAC pair, the switch/port text, the duplicate-MAC group.
Dismissed items collapse under each section with who/when/why, and
**Restore** brings them back. Because the fingerprint pins the *content*
of the finding, a scan that re-flags the same thing stays dismissed while
a genuinely new flag resurfaces.

## Undo a decision

A decision can be taken back. **Confirm**, an address-drift decision — one
item, or a whole group on a subnet's **Reconcile** tab — and each NAC
finding's **Acknowledge**, **Exempt** or **Learn as expected** is written as
one *decision batch* that names who decided, as every decision in the
[discovery inbox](/docs/discovery/#deciding-in-bulk) is. The
**Decision batches** list on the discovery inbox shows each batch with who,
when, what and how many rows, and **Undo** while *Undo until {date}* has not
passed — 7 days by default (see [Settings](/docs/settings/)).

Undo puts a field back only while it still holds the batch's value: a row
someone changed since is kept and counted, and a deleted address that a new
row has replaced since is not restored over it. The batch's own account can
undo it, and so can an operator or admin; anyone else, a closed window or a
batch already undone is refused with the reason.

A host ignored with a reason (see
[Ignore with a reason](/docs/discovery/#ignore-with-a-reason)) is counted
under *dismissed* in every section that would raise it — aging discoveries,
offline hosts, duplicate MACs and exposure — with the ignore's reason and
person.

## Tips

- Work top-down — sections are ordered worst-first, and the dashboard
  review card always names the current worst.
- Dismiss with a note when the reason isn't obvious to the next operator.
- The queue pairs with [monitoring](/docs/monitoring/): a daily digest of
  open findings is a natural notification channel.
