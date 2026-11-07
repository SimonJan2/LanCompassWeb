---
title: "VLANs"
description: "VLAN groups and VLANs, linked to sites and prefixes."
category: "ipam"
version: "0.7.0"
order: 16
---

# VLANs

Two levels: **VLAN groups** bundle related VLANs (e.g. per-site or per-role),
and **VLANs** carry the actual VID. Prefixes link to a VLAN so the subnet
list shows which L2 domain each network rides on.

## VLAN fields

| Field | Notes |
|---|---|
| **VID** | The 802.1Q tag (1–4094) |
| **Name** | e.g. `Users`, `Mgmt`, `IoT` |
| **Group** | Optional VLAN group membership |
| **Site** | Optional site link |
| **Status** | `active`, `reserved`, or `deprecated` |
| **Source** | `manual`, `snmp`, or `integration` provenance |

## VLAN numbers per site

A VID is unique within its **group**, or — for a VLAN with no group — within
its **site**. VLAN 10 can therefore exist at every branch, each the site's
own; a second VLAN 10 at the same site, or moving one onto a site that has
it, is refused. VLANs with neither a group nor a site share one scope.
Numbers stored twice under the old install-wide rule stay as they are — the
rule only allows more. Review's **Duplicate VLAN numbers** follows the same
scopes, so VLAN 10 at two branches is not listed. The Add network wizard and
the site planner propose the next free number at the site.

## Statuses

- **active** — in production use
- **reserved** — allocated but not yet deployed
- **deprecated** — being retired; kept for history

## Ranges & planning

Groups can declare named **ranges** — VID pools like `100–199 prod` — so a
VLAN is claimed *from* a named block instead of a flat numbered list.

- **Editing** — the group dialog carries a ranges editor (label + start–end
  rows, at most 64 per group). Ranges must not overlap *within* a group;
  overlaps across groups are legal — groups are separate pools.
- **Free-VID picker** — create or edit a VLAN with a ranged group selected
  and the VID field suggests free values from the pools.
- **Outside range** — a VLAN whose VID sits outside its group's ranges is
  allowed (ranges are planning labels, not law) and gets an amber
  **Outside range** badge on the list.
- **Usage** — the bar-chart button on a group row opens a drawer with
  per-range usage bars: used and free counts plus the first free VIDs.

## Observed vs planned

SNMP inventory sync writes VLANs with `snmp` (or `integration`) provenance;
rows you create or edit are `manual` — editing an observed row *claims* it.
The [Review](/docs/review/) **VLAN drift** section diffs the two:

- **unplanned** — a sync-observed VLAN no planned row covers at its site.
  A flag, never a delete: own it (edit to claim) or dismiss it.
- **outside range** — a planned VLAN whose VID is outside its group's
  ranges. Off-script hotfixes stay visible until the plan catches up.

## Saving, deleting and the list

- **Two people, one number.** Two VLANs created with the same VID in the
  same scope at the same moment: one is created, the other is refused —
  never both. Editing a VLAN someone saved after you opened it is refused
  with **This changed since you opened it** (**Reload** or **Overwrite**).
- **Deleting a VLAN** unlinks its prefixes; each unlink is written to that
  prefix's [changelog](/docs/changelog/).
- **The list pages on the server** — 200 VLANs a page, sorted and filtered
  by the server — so a large install never draws thousands of rows.
- **Export** — `GET /vlans/export.csv`; the workbook import reads it back
  ([Your own exports, back in](/docs/import/)).

## Tips

- A VLAN with no group is already its site's own — VLAN 10 at every branch
  needs no group per site. Use groups for pools and roles that span sites.
- Linking a VLAN to a prefix is done from the prefix dialog, not here.
- Lists support the usual affordances: reorder, pin, tag, row color, history.
