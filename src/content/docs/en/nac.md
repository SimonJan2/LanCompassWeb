---
title: "NAC (port control)"
description: "Who is plugged in where, what each switch port expects, and — only when an administrator turns it on — quarantine or shutdown of a port over SNMPv3."
category: "operations"
version: "0.7.0"
order: 35
---

# NAC (port control)

NAC watches which MAC addresses appear on which switch port, compares them with
what each port is supposed to carry, and reports the difference. If an
administrator allows it, it can also shut a port down or move it to a
quarantine VLAN.

Everything is **off by default**. While **Settings → NAC → NAC** stays off,
LanCompass records no sightings, raises no findings, queues no jobs and sends
nothing to a switch.

## Where the data comes from

- **Scheduled SNMP polls.** The poll lane already reads each switch's
  forwarding table (see [SNMP](/docs/snmp/)). With NAC on, every poll also
  records *sightings*: one row per MAC, port and VLAN, with first and last seen.
- **Link-up traps** (on by default). A link-up trap queues one bounded
  forwarding-table re-poll of that switch within 30 seconds.
- **MAC-notification traps** (off by default). Cisco `CISCO-MAC-NOTIFICATION-MIB`
  traps are read as sightings.

Sightings are kept for 30 days by default, with a hard cap of 500,000 rows.

## Policies

A policy says what a port should carry. Its scope is a **port**, a **device**,
a **device group** or a **site**. The most specific *enabled* policy wins, and
it wins whole: fields are never merged from a broader policy.

| Mode | What it does |
|---|---|
| Monitor | Records sightings, never raises a finding. |
| Expected | A MAC not on the expected list is a rogue. |
| Sticky | Learns the first MAC it sees as expected (the learn is audited), then behaves like Expected. |
| Strict | Like Expected, but every unexpected MAC is critical. |

A policy can also **pin** its MACs (a pinned MAC seen elsewhere is a move), set
a **MAC limit** (1–64) and list **expected vendors** (OUI names). The
**Policies** tab shows the effective policy of any port, the policies it beat
and why.

## Infrastructure ports

A port is infrastructure when it has an LLDP or CDP neighbour, a documented cable to
network or wireless gear (traced through patch panels), more than one VLAN in
its egress membership, or is marked **Protect** on the device page.
Infrastructure ports are never policed and never acted on. The check runs again
at action time.

CDP-only ports show reason **CDP neighbour**; fused neighbour rows show both
protocol reasons. Old rows without `proto` still mean LLDP. Collection uses
`snmp_walk_cdp` (default on, `system:admin`, Settings → Features → SNMP).
A failed/disabled neighbour source keeps last-known evidence instead of
silently making an uplink eligible for policing. See [SNMP](/docs/snmp/).

## Detectors

Each detector is its own switch.

- **Rogue** (on by default): a MAC on a policed port that the policy does not
  expect and no allowlist entry covers.
- **MAC move**: a pinned MAC seen on another port or switch.
- **Port overflow**: more MACs than the policy's limit — usually a hub.
- **Spoof**: one MAC on two edge ports in the same poll cycle, or a known vendor
  outside the policy's expected vendors.

A finding emits one notification when it opens and resolves itself after two
clean polls. From the **Findings** tab or the review queue you can
**Acknowledge**, **Exempt** (an allowlist entry with a reason and an optional
expiry) or **Learn as expected**.

## Response

**Response mode** is one of:

- **Detection only** (default): findings and notifications.
- **Approval required**: each finding with an enabled action creates a pending
  action. An administrator approves it by typing the port name.
- **Automatic**: the action applies on its own, inside every guard below.

A policy can lower the mode for its scope, never raise it. The two actions are
**shut down the port** (`ifAdminStatus` down) and **move to the quarantine
VLAN** (Q-BRIDGE `dot1qPvid` or Cisco `vmVlan`, chosen per device). Both are off.
Turning on an action, automatic mode, or turning off dry run asks for a typed
confirmation.

**Request action** on a finding (an administrator, with an action turned on)
creates a pending action only when every guard below lets it: the response
mode allows it, the switch's writes are on and it holds an SNMPv3 authPriv
write user. Otherwise the request is refused and the message names each guard
that refused it ("response mode does not allow it; writes are not enabled on
this device; …"). **Approve** asks for the port's name, typed; with dry run on
the approved action is recorded as *dry run* and nothing is sent to the switch.

## Guards

Every write is checked again immediately before it is sent:

1. NAC is on, and the action is turned on (the VLAN action also needs a
   quarantine VLAN).
2. The response mode allows it (or a person approved it).
3. The device has **writes enabled** and a valid **SNMPv3 authPriv** write
   credential. SNMP v1, v2c, noAuthNoPriv and authNoPriv write credentials are
   refused when you save them.
4. The port is not infrastructure and not protected.
5. The hourly action cap (5 by default) is not reached; past it, actions wait
   for approval.
6. No maintenance window covers the device's site (in a window, automatic acts
   like approval required).
7. **Dry run** (on by default): the action is planned, checked and logged, but
   nothing is sent.
8. **Two-person** (off by default): the approver must differ from the requester
   and from whoever turned on automatic mode.

Each action sends exactly one SNMP SET, then reads the value back. A mismatch
marks it failed. Pending actions expire after 24 hours.

## Restore and revert

**Restore** writes the recorded previous state back through the same guarded
path. **Auto-restore** does it after a set number of minutes. An action
approved while dry run is on wrote nothing, so it offers no Restore — there is
nothing to put back; its row stays in the actions' history.

> [!WARNING]
> A SET changes the switch's **running** state only. A reboot or a config
> reload undoes it. Revert detection notices on the next poll, marks the action
> reverted and notifies you; in automatic mode, with the finding still open, the
> action is planned again.

NAC and DNS PTR publishing are the only features of LanCompass that write to
the network.

## Permissions

| Permission | Who | What |
|---|---|---|
| `data:read` | everyone | Read NAC data |
| `nac:manage` | Operator, Admin, API tokens | Policies, allowlist, protected ports, acknowledge, exempt, learn |
| `nac:enforce` | Admin only | Request, approve, reject, restore actions — never an API token |

Settings → NAC and device write credentials need `system:admin`.
