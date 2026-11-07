---
title: "Certificates"
description: "Certificate inventory with expiry countdown and alerts."
category: "inventory"
version: "0.7.0"
order: 23
---

# Certificates

Track certificate expiry across your estate so nothing silently lapses.

## Fields

| Field | Notes |
|---|---|
| **Platform** | Where the cert lives (LB, web server, appliance…) |
| **Target** | The protected endpoint |
| **Server name** | Host the cert is installed on |
| **Cert name** | Friendly certificate name |
| **Expires on** | The tracked date — drives the countdown |
| **Device** | The box the cert lives on — links to the device page |
| **Serial** | Raw serial string |
| **Notes** | Free text |

## Expiry tracking

- Rows show an **expiry badge** with a live countdown.
- The **dashboard** surfaces certificates expiring within **30 days**
  (`certs_expiring_30d`) so renewals are visible the moment you log in.
- Pair with a [color rule](/docs/row-colors/) like *"expires_on within 7 days
  → red"* to make urgent renewals impossible to miss.
- Link the cert to a **device** and the device page lists it under
  *Related* with the same countdown chip; the review-center expiry item
  names the box. Deleting a device orphans the cert (link cleared, row
  kept) — never deletes it.

## Working with the list

The **device filter** above the table narrows the list to certs on one
box (also reachable from the device column's links).

Full list affordances: reorder, pin, tag, row color, inline edits, per-row
history. Certificates are searchable from the command palette and covered by
backup + changelog like every other entity.

## Discovered certificates

When [discovery](/docs/discovery/) is on, any TLS endpoint a probe reaches has
its certificate fingerprint, expiry and source recorded as a row keyed by
**(host, port, fingerprint)** — so the same cert on the same listener is one
row that refreshes instead of a pile of duplicates. These carry
`source = discovery` and count toward the same expiry surfaces: the
30-day dashboard metric, the review-center expiry item, report digest
callouts, and the *Exposed services* findings (self-signed, expiring, or
expired certs raise the matching baseline rules). Delete a discovery row and
it is re-created on the next run that sees the cert; the cert itself is only
gone when it stops being presented.

**A certificate you edit is yours.** Change any field of a discovered
certificate — its server name, its notes, the expiry you know — and it
becomes `source = manual`: no later run puts those values back. A run still
finds the row by its host and port and never adds a second one beside it;
when the listener presents a different certificate, the run records a
`tls_changed` discovery drift item with the new fingerprint and expiry
instead of rewriting your row.
