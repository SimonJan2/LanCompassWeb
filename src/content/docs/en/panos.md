---
title: "PAN-OS"
description: "Read-only Palo Alto discovery — REST inventory plus the show-* XML operational tables, X-PAN-KEY auth, each vsys a routing domain, Panorama, and the security and NAT rules daily."
category: "integrations"
version: "0.7.0"
order: 47
---

# PAN-OS

PAN-OS exposes two API shapes on the same box, and the connector uses
both — both are `GET`-transport reads:

- the **REST config API** (`/restapi/v<release>/...`) for the published
  inventory: the virtual systems, the interfaces, DHCP server definitions
  and address objects — and, once a day if you ask for it, address groups
  and the security and NAT rules;
- the **XML operational API** (`GET /api/?type=op&cmd=<show …>`) for the
  runtime tables — system info, ARP, the IPv6 neighbours and live DHCP
  leases.

The op endpoint is the same discipline as Check Point's RPC: the
connector can only ever issue commands beginning with `show ` — anything
else is refused in code before it leaves. `set`, `commit`, `delete`,
`request` — none of them exist for it to call.

## Read-only role

*Checked against PAN-OS 12.1 and 11.2 (11.1 and 10.2 best effort) and Panorama — the lab's simulator.*

1. *Device* → *Admin Roles* → *Add* `lancompass-ro`: *Web UI* none; *XML API* only **Operational Requests**; *REST API* read of *Objects → Addresses* and *Address Groups*, *Policies → Security* and *NAT*, *Network* interfaces and DHCP servers, *Device → Virtual Systems*; *Command Line* none.
2. *Device* → *Administrators* → *Add* `lancompass` with the role-based profile `lancompass-ro`, then *Commit*.
3. Generate the key once with that admin (`/api/?type=keygen` — you do it; LanCompass never calls keygen) and paste it: LanCompass sends it only in the `X-PAN-KEY` header.
4. Panorama: the same as a *Panorama* admin role with *Device Group and Template* access; set the source's target to the firewall's serial.

**What LanCompass reads:** `show system info` and the other `show` operational commands, then the REST API of the firewall's own version — interfaces, VLANs, DHCP servers, virtual systems, addresses, groups and, once a day if ticked, security and NAT rules — GET only.

## Before you start

- **PAN-OS 12.1 or 11.2** (supported); **11.1 and 10.2** are best effort.
- **TCP/443 reach** from the LanCompass host to the firewall or Panorama.
- **An admin that can only read** — the key below inherits its rights.
  The built-in *Superuser (read-only)* role is enough; a custom *Admin
  Role* profile should allow, on its **REST API** tab, *Device → Virtual
  Systems*, the *Network* interface and *DHCP Servers* resources and
  *Objects → Addresses* — plus *Objects → Address Groups* and *Policies →
  Security* and *NAT* for the rules (Panorama: the pre and post
  rulebases and *Panorama → Device Groups*); on its **XML API** tab only
  *Operational Requests* (the `show` commands). Never *Configuration*
  writes, *Commit*, *User-ID Agent* or *Import* — the connector sends
  `GET` only, and the role keeps it so.
- **About ten minutes** for the one-time keygen step.

## Step 1 — Mint an API key (one-time, outside the UI)

PAN-OS API keys come from the keygen endpoint — a one-time shell step:

```bash
curl -k "https://<fw>/api/?type=keygen&user=<admin>&password=<pw>"
# → <response><result><key>LUFRPT1…</key></result></response>
```

Paste that key into the source's **API key** field. The connector sends
it as the `X-PAN-KEY` **header** — never `&key=` in the URL, where it
would land in logs and proxies. Use a read-only admin so the key is a
read capability only.

## Step 2 — Add the source

Settings → Integrations → **New source** → kind **PAN-OS**, base URL
`https://<fw-or-panorama>`, paste the key, **Test & discover**. On
multi-vsys firewalls the scope label reads **Virtual systems** — tick the
vsys to read (reads pass `location=vsys&vsys=<name>`).

**Panorama**: the same endpoints proxy to a managed firewall via
`target=<serial>` — set it in the source's `scope.target` (editable in the
source JSON via the API) and the connector reads that firewall's tables
through Panorama.

## The REST version

The connector asks the firewall which release it runs (`show system
info`, its `sw-version`) and reads the REST tree of that release —
`/restapi/v12.1/`, `v11.2`, `v11.1`, `v11.0` or `v10.2`. If that tree
answers 404 it steps down one release at a time; every read then uses the
tree that answered. No version list is guessed in advance.

## Virtual systems and the routing-domain map

A vsys is its own routing domain: two vsys may both hold
`172.29.10.0/24`, and a host in each is two different hosts. LanCompass
keeps them apart:

- **One vsys** — its subnets and addresses land in the source's VRF, as
  always.
- **Two or more vsys** — under **Routing domains** on the Credentials
  step, *Test* lists the vsys it found; pick a LanCompass VRF for each,
  once. Until a vsys is mapped, its rows wait in the plan as **Map … to a
  VRF** — never merged into another vsys's table.

Each interface belongs to the vsys that imports it (*Device → Virtual
Systems*), and its subnet, its ARP neighbours and its leases go where
that vsys is mapped.

## Interfaces, gateways and VLANs

The interfaces come from the five resources the REST reference lists —
`Network/EthernetInterfaces`, `AggregateEthernetInterfaces`,
`VLANInterfaces`, `LoopbackInterfaces` and `TunnelInterfaces`:

- a tagged subinterface (`ethernet1/1.20`, tag 20) becomes VLAN 20;
- every interface address becomes its subnet, with that address as the
  subnet's gateway;
- a loopback's `/32` is the firewall's own address — no subnet, no VLAN.

## Security and NAT rules (daily)

Tick **Read the security and NAT rules (daily)** on the source to read,
once a day and per vsys, `Objects/Addresses` and `Objects/AddressGroups`
(the vsys's and the `shared` ones), `Policies/SecurityRules` and
`Policies/NATRules` (GET only):

- an `ip-netmask` or `ip-range` object resolves to its addresses; an
  `fqdn` object stays a name; a static group expands to its members (found
  in its vsys, then in `shared`); a dynamic group is a name; `any` is
  **Any**; an address written in the rule itself is read as written;
- each security rule's source and destination become rows of the rules
  table (its position, name, action, enabled or not, its vsys as the
  layer); a negated cell is counted with the **Any** rules;
- each NAT rule keeps its original source and destination and its
  translated ones — a published server is found from its outside address
  and its inside one, a hidden subnet from its own range and the address
  it leaves by.

**Through Panorama** (`scope.target` set): the device groups that hold
that firewall (or every one, or the list in `scope.device_groups`) — each
group's objects, Panorama's `shared` ones, and its pre- and post-rulebases
(`Policies/SecurityPreRules`, `SecurityPostRules`, `NATPreRules`,
`NATPostRules`), the layer `<group>/pre` or `<group>/post`.

A subnet's page then lists **Rules that touch …** with the PAN-OS rules
beside the other firewalls'. A vsys's rules appear only on the subnets of
the VRF that vsys is mapped to; a Panorama device group's rules appear in
every VRF. The cadence is Settings → Integrations → **Read firewall rules
every (minutes)** — daily by default, never on the sync schedule. App-ID,
security profiles, decryption and policy-based forwarding rules are not
read.

## What it imports

| PAN-OS data                                    | LanCompass object                       |
| ---------------------------------------------- | ------------------------------------ |
| Virtual systems (`Device/VirtualSystems`)      | Routing domains — each mapped to a VRF |
| The five interface resources                   | Subnets + VLANs, the interface address as gateway, in the vsys's VRF |
| DHCP server definitions                        | DHCP pools (IP ranges)               |
| Address objects *ip-netmask* (a network)       | Subnets (prefixes)                   |
| Address objects *ip-netmask* of one address    | Documented addresses — active, never "seen" |
| `show arp all`, `show neighbor interface all`  | Addresses (`source=integration`)     |
| `show dhcp server lease all`                   | Addresses — lease rows               |
| The firewall itself                            | A device (`source=integration`)      |
| Objects, groups, security and NAT rules (opt-in, daily) | The rules panel on a subnet's page and an address's drawer |

## Caveats

- **Config vs runtime**: the REST side reads *candidate/published* state;
  the ARP/lease tables are live. An uncommitted interface shows in the
  connector but not on the wire — run **Commit** on the box first.
- **No free PAN-OS VM exists** — the connector is proved against a lab
  simulator written from Palo Alto's public REST pages and against
  recorded field-kit bundles; record your firewall with the field kit
  when a new release arrives.
- **Shared and device-group objects** are read to resolve the rules; they
  belong to no vsys, so they are not imported as subnets or addresses. An
  *ip-range* or *fqdn* object is a rule's address too, never an IP range
  or an address of its own.
- **vsys scoping**: a vsys left out of the tick-list is not read — its
  interfaces, neighbours and rules stay out too.

## What each message means

| Message | What it means → what to do |
|---|---|
| *…: no REST version answered* | the role lacks the REST API's read, or the version is older than the lab's → give the role REST read; record the firewall with the field kit |
| *op:…: authentication failed (403)* | the key is wrong or the role lacks *Operational Requests* → tick it, generate a new key |
| *op command … is not a show read* | a command outside the `show` reads was asked for → nothing ran; report it |
| *tls: …'s certificate … is not the pinned one* | the firewall's certificate changed → compare its fingerprint, then *Trust this certificate* in *Test* |
| *…: request timed out* | the firewall does not answer on its management port from LanCompass → check the route and the management profile |
