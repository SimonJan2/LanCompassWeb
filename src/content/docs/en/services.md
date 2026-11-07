---
title: "Services"
description: "The service catalog — beneficiaries, sites, and documentation links."
category: "inventory"
version: "0.7.0"
order: 30
---

# Services

The service catalog — what the network *serves*, not just what it's made of.

## Fields

| Field | Notes |
|---|---|
| **Name** | Service name (e.g. `CRM`, `File share`) |
| **Beneficiary** | Who consumes it — team, dept, customer |
| **Site / Site code** | Where it's anchored |
| **Device** | The box that runs it — links to the device page |
| **Doc path** | Link to runbooks or external docs |
| **Test info** | How to verify the service is healthy |
| **Notes** | Free text |

## Why track services in an IPAM?

When a subnet changes or a scan finds drift, the question is always "who
cares?" Linking services to sites gives you the blast radius: the circuits,
certificates, and assets of the same site are one hop away.

Linking to a **device** answers "which box runs it" — the device page lists
its services under *Related*, and deleting the device orphans the catalog
row (link cleared) rather than deleting it.

## Working with the list

The **device filter** above the table narrows the list to services on one
box (also reachable from the device column's links).

Same affordances as every list — reorder, pin, tag, row color, inline edits,
history. Searchable from the palette under "Services", and usually populated
via [workbook import](/docs/import/).
