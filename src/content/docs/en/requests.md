---
title: "IP Requests"
description: "Self-service portal — ask for addresses or prefixes, reviewers approve atomically."
category: "ipam"
version: "0.7.0"
order: 21
---

# IP Requests

The requests portal lets any signed-in user ask for IP space without
holding write permissions — a reviewer approves, and the allocation
happens atomically. No ticket queue, no side-channel chat.

## Filing a request

Open **Requests** in the sidebar and hit **New request**:

- **IP addresses** — pick a site (or a specific subnet), a count up to
  1024, and an optional hostname hint. Leave the prefix blank and the
  reviewer picks it at approval time.
- **New prefix** — give the CIDR you need (e.g. `10.40.0.0/22`, up to a
  /16 for IPv4 or /48 for IPv6) and optionally a site and VRF.

The **justification** is required — it's what the reviewer reads, and it
stays attached to the request's history. A requester may have at most 10
open requests at a time.

## The lifecycle

| Status | Meaning |
|---|---|
| `pending` | Filed, waiting in the review queue |
| `approved` | A reviewer approved — the allocation exists |
| `rejected` | A reviewer declined, with a note |
| `cancelled` | Withdrawn by the requester (or an approver) |

Pending requests land in the **Review** queue under *IP requests*, and a
reviewer's **Requests** page lists everyone's pending asks with **Approve**
and **Reject** on each row. A reviewer sees who asked, where, how much, and
why — then:

- **Approve** — allocates the addresses or the prefix inside the same
  transaction that marks the request approved. Site-scoped asks make the
  reviewer pick the concrete prefix. A double-click can't allocate
  twice.
- **Reject** — requires a note; it lands in the requester's history and
  notification.

**Nobody approves their own request** — whatever their role. The buttons
are absent on your own row, and the API refuses a self-approval (`403`,
naming the rule); an admin who must decide their own ask has another
reviewer do it.

Allocated rows carry `source=request` provenance and link back to the
request, so the audit trail answers "who asked for this, and who said
yes".

## Approve and activate

**Approve** reserves an address request's addresses (`reserved`): the
address is held, but DNS publishes only `active` addresses, so a
requester's name never reaches the reverse zone until someone changes the
status. Two more buttons beside it decide that in the same step:

- **Approve and activate** — the addresses are `active` instead of
  `reserved`, inside the approval's one transaction (a failure leaves the
  request pending and no address, as for Approve).
- **Approve, activate and publish to DNS** — offered only to a system
  admin, and only when an enabled publishing zone (Settings →
  Integrations → DNS publishing) covers the subnet. After the approval
  commits, each zone that covers the addresses publishes **their PTRs
  only** — nothing else in the zone is added, changed or deleted — with
  the zone's own validation, and the changelog records `dns.publish`. If a
  zone refuses, the approval and the activation stand: the dialog shows
  the zone's own error, and the PTR waits in the zone's plan for the next
  publish. Anyone else asking to publish is refused with "Only an
  administrator can publish to DNS. The request was not approved." and the
  request stays pending.

A prefix request has nothing to activate: its new prefix is active already.

**Expected, not Missing.** A new address is often live before its host is
plugged in. For 7 days after the request was decided, an address a
request activated that no scan has seen yet is not reported **Missing**:
the subnet's **Reconcile** tab lists it under **Expected** — "Activated by
request #42 on 30 Oct 2026; no scan has seen it yet." After the 7 days it
is Missing as any other documented host that does not answer; an address
a scan has seen once is Missing as soon as it stops answering.

## Notifications

Every transition fires a keyed event — `ip_request.submitted`,
`approved`, `rejected`, `cancelled` — routable to any configured
[notification channel](/docs/monitoring/).

## API

`POST /api/v1/requests` files a request; `GET` lists your own (reviewers
add `?all=true&status=pending`). Approve/reject/cancel are `POST` on the
request. Bearer tokens with the `data:write` scope can file requests, so
automation can ride the same workflow humans use.
