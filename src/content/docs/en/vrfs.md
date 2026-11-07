---
title: "VRFs"
description: "Routing instances — overlapping address space done safely."
category: "ipam"
version: "0.7.0"
order: 15
---

# VRFs

VRFs (virtual routing & forwarding instances) model separate routing tables.
They're the answer to "the same subnet exists in two places": overlapping
CIDRs are allowed **across** VRFs but are rejected **within** a single VRF —
enforced by a PostgreSQL exclusion constraint, not by convention.

## Fields

| Field | Notes |
|---|---|
| **Name** | Unique, e.g. `Global`, `Management`, `Guest` — or derived **from site code** when you pick a site |
| **RD** | Route distinguisher, free text and unique (e.g. `65000:100`) |
| **Site** | Optional site link |
| **Description** | Free text |

A **Global VRF** is seeded by the initial migration so a fresh install always
has somewhere to put prefixes.

## One routing table, or one per site

Most networks are one routing table: give every site's subnets the
**Global** VRF and overlap checking compares all of them. The workbook
import does exactly that by default; **A VRF per site** is the explicit
choice for sites that truly are separate routing domains, and then two
sites' equal networks are never compared. Either way the import preview's
overlap report lists the networks that overlap between sites — see
[Overlapping networks](/docs/import/).

A VRF's site link is a label; it does not decide where its subnets appear.
The [hierarchy](/docs/hierarchy/) places each subnet under its own site, and
a VRF with subnets at several sites appears under each of them.

## Overlap rules in practice

- `10.0.0.0/24` in VRF `A` **and** in VRF `B` → allowed.
- `10.0.0.0/24` and `10.0.0.0/25` both inside VRF `A` → rejected unless one is
  a `container` prefix holding the other as a child.
- The same network twice in one VRF → refused, whatever either one's status;
  duplicates saved before this rule are listed under **Duplicate networks**
  in [Review](/docs/review/).
- A container inside a subnet → refused, and so is a subnet that would hold
  an existing container. See [Overlap safety](/docs/subnets/).
- Scans that don't name a VRF are assigned one automatically when an
  exact-match prefix lives in exactly one VRF.

## Moving and deleting

- **Moving a prefix to another VRF** takes its addresses and its ranges
  (DHCP scopes, reserved blocks) with it, each move in the
  [changelog](/docs/changelog/).
- **Deleting a VRF** deletes its prefixes, their addresses and their ranges.
  The confirm dialog counts each — *N prefixes are deleted*, *N addresses
  are deleted*, *N ranges (DHCP scopes, reserved blocks) are deleted* — and,
  when ten or more rows go with it, asks you to type `DELETE`; every row
  that goes is written to the changelog.

## When two people edit one VRF

The edit dialog saves only the fields you changed. If someone saved the VRF
after you opened it, your save is refused with **This changed since you
opened it**: **Reload** shows their version, **Overwrite** saves your
changed fields over theirs.

## Working with the list

Same list affordances as everywhere: drag-to-reorder, pinning, inline
descriptions, tags, row colors, and per-row history. See
[Tags](/docs/tags/) and [Row Colors](/docs/row-colors/). The VRFs export as
CSV through the API (`GET /vrfs/export.csv`), and the workbook import reads
that file back ([Your own exports, back in](/docs/import/)).
