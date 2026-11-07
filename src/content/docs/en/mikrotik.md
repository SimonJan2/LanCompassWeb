---
title: "MikroTik"
description: "Read-only RouterOS discovery — REST over www-ssl, basic auth, interfaces/VLANs/DHCP/ARP. GET-only is load-bearing: POST is command execution."
category: "integrations"
version: "0.7.0"
order: 51
---

# MikroTik

MikroTik's RouterOS ≥7.1 ships a REST surface under the `www-ssl`
service — bare JSON arrays, HTTP Basic auth, and every read this
connector needs:

    GET /rest/system/identity        -> who
    GET /rest/system/routerboard     -> model/serial
    GET /rest/interface + /interface/vlan
    GET /rest/ip/address             -> subnets + SVIs
    GET /rest/ip/dhcp-server/lease   -> clients (dynamic/reserved flags)
    GET /rest/ip/pool                -> DHCP pools
    GET /rest/ip/arp                 -> ARP table

**GET-only is load-bearing here**: in RouterOS REST, `POST` is arbitrary
command execution (`/rest/system/reboot` is a real endpoint). The
connector exposes only a `_get` path — there is no POST code for a test
to bypass, and the suite asserts it.

## Read-only role

*Community tier — kept working, no new reads; RouterOS 7.1 or later, not checked against a device.*

1. A group with only `read,api,rest-api` (no `write`, no `policy`): `/user group add name=lancompass-ro policy=read,api,rest-api`.
2. A user in it: `/user add name=lancompass group=lancompass-ro`.
3. Limit the `www-ssl` service to the LanCompass host: `/ip service set www-ssl address=<the LanCompass host>/32`.

**What LanCompass reads:** `/rest/system/identity` and `routerboard`, the interfaces and VLANs, the IPv4 and IPv6 addresses, the DHCP leases and pools, ARP and the IPv6 neighbours — GET only.

## Before you start

- **RouterOS ≥ 7.1** with the `www-ssl` service enabled (or `www` if you
  insist on plain HTTP — don't, on a network that matters).
- **TCP/443 reach** from LanCompass to the router.
- **A read-only RouterOS user** — about five minutes.

## Step 1 — The REST service + a read-only user

```routeros
/ip service enable www-ssl
/user group add name=read-api policy=read,api,!local,!telnet,!ssh,...
/user add name=lancompass group=read-api password=<strong>
```

A certificate: use a real one (`/certificate`) or leave *verify TLS* off
on the source for the self-signed default. The user needs `read` + `api`
policy — nothing else.

## Step 2 — Add the source

Settings → Integrations → **New source** → kind **MikroTik**, base URL
`https://<router>`, user + password, **Test & discover**. The scope label
reads **Interfaces** — tick interfaces to scope the VLAN/SVI/ARP reads.

## What it imports

| RouterOS data                                  | LanCompass object                       |
| ---------------------------------------------- | ------------------------------------ |
| `/interface/vlan` rows                         | VLANs (vid + name + parent)          |
| `/ip/address` rows                             | Subnets — host bits become the gateway; the `vlanX` interface maps the VID |
| `/ip/pool` ranges                              | IP ranges                            |
| DHCP leases (`dynamic`/`reserved` flags)       | Addresses — `lease`/`reservation`    |
| `/ip/arp` (complete entries)                   | Addresses (`source=integration`)     |
| The router itself                              | A device (`source=integration`)      |

## Caveats

- **GET-only is the contract** — if your change pipeline needs RouterOS
  writes, this connector is not it; POST would be remote command
  execution, not a data read.
- **Incomplete ARP entries** (`complete=false` — a resolution in-flight)
  are skipped; they'd churn the address table.
- **Interface-scoped reads**: DHCP leases carry no interface field, so
  scoping can't attribute them — leases always import; the ARP/SVI side
  does filter. Documented rather than guessed.
- **CHR** (the free Cloud Hosted Router image) is the trivially cheap
  lab target — a container or a VM, and the whole read surface answers.

## What each message means

| Message | What it means → what to do |
|---|---|
| *…: bad request — RouterOS REST needs >= 7.1* | the router runs RouterOS 6 → upgrade to 7.1 or later |
| *…: authentication failed (401)* | the user or password is wrong → enter them again |
| *…: request timed out* | `www-ssl` does not answer from LanCompass → check the service's allowed address |
