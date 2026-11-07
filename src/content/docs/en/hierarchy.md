---
title: "Hierarchy Tree"
description: "The Site → VRF → Prefix tree with roll-up utilization."
category: "ipam"
version: "0.7.0"
order: 18
---

# Hierarchy Tree

**Hierarchy** (`/tree`) renders the whole IPAM as an expandable tree:

```
Site → VRF → Prefix → child Prefix → …
```

It's the fastest way to see *where* a subnet lives and how full each branch
is.

## Reading the tree

- **Site nodes** — every prefix sits under **its own site** (the site set on
  the prefix, not its VRF's); the prefixes with no site gather under
  **No site**, in your language.
- **VRF nodes** — the VRFs a site's prefixes live in, with their RD. A VRF
  used at several sites (the Global VRF, typically) appears under each of
  them, holding that site's prefixes; a VRF with no prefix yet stays under
  its own site. The VRF row's bar is that site's allocated share of its
  usable IPv4 addresses — the [dashboard](/docs/dashboards/)'s rule.
- **Prefix nodes** — the CIDR, its status, linked VLAN, and utilization.
  Inside a site, a prefix nests under the deepest prefix of the same site and
  VRF that contains it; a subnet whose container belongs to another site is
  listed at the top of its own site, and its breadcrumb still names the
  container.

## Roll-up utilization

A subnet's bar counts its documented addresses and its DHCP, pool and
reserved ranges, each address once — the same figure as the
[subnet list](/docs/subnets/). A container's bar is worded **"… allocated"**:
`allocated_pct` is the share of the container its child prefixes hold (their
union, never the sum). Its tooltip adds the branch's size, `agg_used_ips`
(every documented address beneath the node) and the allocated addresses of
its whole subtree. A container that's 100 % allocated but 40 % used is fully
*assigned* yet still half *empty* — the tree surfaces that difference at a
glance.

## Tips

- Click a prefix to jump to its [subnet page](/docs/subnets/) — its **IP
  plan** (the map or the list, the ranges), **Find & reserve**,
  **Reconcile** and **Print sheet** tabs, and split, merge and resize.
- Expand/collapse state is per-session; use the tree for orientation and the
  [command palette](/docs/search-and-shortcuts/) for targeted jumps.
