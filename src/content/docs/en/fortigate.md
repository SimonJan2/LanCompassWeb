---
title: "FortiGate"
description: "Read-only FortiGate discovery — a REST API token, per-VDOM scope and routing, and what gets imported (interfaces, VLANs, DHCP, ARP, device inventory, policies and VIPs)."
category: "integrations"
version: "0.7.0"
order: 46
---

# FortiGate

FortiGate is the clean firewall follow-on: one API token, pure `GET`
reads against the FortiOS monitor and configuration endpoints. The
connector pulls the box's serial and FortiOS version, the interface list
(VLANs and SVIs included), DHCP leases, the ARP table, and the
user-device inventory — everything LanCompass needs to model the routed
segments the box sees — and, once a day if you ask for it, the address
objects, policies and VIPs, so a subnet's page lists the policies that
touch it.

On multi-VDOM systems each VDOM's tables sit under `?vdom=<name>` — after
the first **Test & discover** the scope dialog lists the VDOMs it found;
tick the ones to read. Each VDOM is its own routing table: map it to a
LanCompass VRF once (below).

## Read-only role

*Checked against FortiOS 8.0 and 7.6 (the lab's simulator).*

1. *System* → *Admin Profiles* → *Create New* `lancompass-ro`: every permission group **Read**, none *Read/Write*. On the CLI: `config system accprofile`, `edit "lancompass-ro"`, `set sysgrp read`, `set netgrp read`, `set fwgrp read`, `set authgrp read`, `end`.
2. *System* → *Administrators* → *Create New* → **REST API Admin** → name `lancompass`, profile `lancompass-ro`, **Trusted Hosts** the LanCompass host as a /32 (FortiOS refuses `0.0.0.0/0`); on a multi-VDOM box tick the VDOMs to read.
3. Copy the token — FortiOS shows it once — and paste it as the source's key.
4. The admin's own trusted-hosts list applies to API calls too: keep it and the API user's list aligned.

**What LanCompass reads:** `monitor/system/status`, `cmdb/system/vdom`, the interfaces (`monitor` and `cmdb/system/interface`), `monitor/system/dhcp`, `arp`, `ipv6-neighbor-cache`, the device table, and — once a day if ticked — `cmdb/firewall/address`, `address6`, `addrgrp`, `policy`, `vip` — GET only.

## Before you start

- **FortiOS 6.x or later** — the `/api/v2` REST surface is on by default.
  FortiOS **8.0 and 7.6** are supported; 7.4 and 7.2 are best effort.
- **HTTPS** — FortiOS enforces TLS on the API. Leave *verify TLS* on with
  a proper certificate, or off for the factory self-signed.
- **TCP/443 reachability** from the LanCompass host to the FortiGate.
- **About ten minutes** in the FortiGate GUI.

## Step 1 — Create a REST API admin

1. **System → Admin Profiles → Create New** `lancompass-ro`: every group
   **Read**, none *Read/Write* (CLI: `config system accprofile` →
   `edit "lancompass-ro"` → `set sysgrp read`, `set netgrp read`,
   `set fwgrp read`, `set loggrp read` …). The policy read needs
   **Firewall** read (`fwgrp`).
2. **System → Administrators → Create New → REST API Admin**: username
   e.g. `lancompass-reader`, the profile `lancompass-ro`.
3. Set **Trusted Hosts** to the LanCompass host as a /32 — FortiOS refuses
   `0.0.0.0/0`. The administrator's own trusted-hosts list applies to API
   calls too: keep both lists aligned. A host outside them is refused
   with 403, and *Test* says *This REST admin's trusted hosts do not
   include this server (…)*, naming the address the firewall saw.
4. **Multi-VDOM**: tick the VDOMs LanCompass should read.
5. Save. The console shows the token **once** — copy it straight into the
   source's **API token** field; there is no second view.

The connector sends it as `Authorization: Bearer <token>` — the header,
never the URL.

## Step 2 — Add the source

Settings → Integrations → **New source** → kind **FortiGate**, base URL
`https://<fortigate>`, paste the token, run **Test & discover**. The
response identifies the box (FortiOS version + hostname) and counts what
it can see; the scope label reads **VDOMs** when the firewall runs more
than one.

## VDOMs and the routing-domain map

A VDOM is its own routing table: two VDOMs may both hold
`172.29.10.0/24`, and a host in each is two different hosts. LanCompass
keeps them apart:

- **One VDOM** (or none) — its subnets and addresses land in the source's
  VRF, as always.
- **Two or more VDOMs** — under **Routing domains** on the Credentials
  step, *Test* lists the VDOMs it found; pick a LanCompass VRF for each,
  once. Until a VDOM is mapped, its rows wait in the plan as **Map … to a
  VRF** — never merged into another VDOM's table.

Every interface, subnet, lease, ARP row and device-table row keeps its
VDOM: the same address in two VDOMs becomes two addresses in two VRFs.

## Policies and VIPs (daily)

Tick **Read the policies and VIPs (daily)** on the source to read, once a
day and per VDOM, `cmdb/firewall/address`, `address6`, `addrgrp`,
`policy` and `vip` (GET only):

- an `ipmask` or `iprange` address object resolves to its addresses, a
  group to its members (groups inside groups too), `all` to **Any**; an
  `fqdn` object stays a name;
- each policy's source and destination addresses become rows of the rules
  table (its number, name, action, enabled or not, its VDOM as the layer);
- each VIP is a NAT row: its `extip` the original destination, its
  `mappedip` the translated one — a published service's outside and
  inside addresses both find it; a policy that names the VIP touches
  both.

A subnet's page then lists **Rules that touch …** with the FortiGate's
policies beside Check Point's rules, and a VDOM's rules appear only on
the subnets of the VRF that VDOM is mapped to. The cadence is Settings →
Integrations → **Read firewall rules every (minutes)** — daily by default,
never on the sync schedule. Security profiles, SD-WAN rules and local-in
policies are not read.

## What it imports

| FortiOS data                                     | LanCompass object                          |
| ------------------------------------------------ | ------------------------------------- |
| System status (`monitor/system/status`)          | The firewall's serial and FortiOS version |
| Interface VLAN tags (`cmdb` fallback for VIDs)   | VLANs                                 |
| Interface IP assignments                         | Subnets (prefixes) + the gateway IP, in the VDOM's VRF |
| DHCP leases (`monitor/system/dhcp`)              | Addresses — `reserved` for reservations |
| ARP table (`monitor/system/arp`)                 | Addresses (`source=integration`)       |
| Device inventory (`monitor/user/device/query`)   | Devices with last-seen                 |
| The firewall itself                              | A device (`source=integration`) — serial, `FortiGate <version>` |
| Address objects, policies, VIPs (opt-in, daily)  | The rules panel on a subnet's page and an address's drawer |

DHCP reservations import as `reserved`; plain leases and ARP rows as
`discovered`. The interface monitor's answer is read whether FortiOS
sends a list or an object keyed by interface name.

## Caveats

- **VDOMs**: the connector reads every VDOM the token reaches; the scope
  tick-list narrows it. A REST admin bound to one VDOM only sees that
  VDOM's tables — that's the least-privilege shape, not a bug.
- **VLAN IDs** on tagged interfaces come from the `cmdb` read; when only
  the monitor view answers, the interface's subnet still imports but the
  VID may be absent.
- **ARP churn**: FortiOS prunes the table quickly, so observed counts dip
  between polls. Expected — apply diffs tell the real story.
- **FortiManager** is a different API and is not read.

## What each message means

| Message | What it means → what to do |
|---|---|
| *This REST admin's trusted hosts do not include this server* | the first read was refused → add the LanCompass host's /32 to the REST admin's (and the admin's) trusted hosts |
| *dhcp: denied — the role needs …* | the admin profile leaves that read out → give the profile's group **Read** |
| *…: authentication failed (401)* | the token is wrong or was regenerated → paste the new one |
| *tls: …'s certificate … is not the pinned one* | the FortiGate's certificate changed → compare its fingerprint on the box, then *Trust this certificate* in *Test* |
| *…: request timed out* | the FortiGate does not answer on its admin port from LanCompass → check the route and the admin access on that interface |
