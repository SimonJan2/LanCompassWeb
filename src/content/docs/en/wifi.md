---
title: "WiFi Networks"
description: "Logical SSIDs — site, VLAN binding, and which APs broadcast."
category: "inventory"
version: "0.7.0"
order: 28
---

# WiFi networks

WiFi networks are **logical SSIDs** — each row models one wireless network
the way you intend it to exist: which site it belongs to, which VLAN it
binds to, and which access points broadcast it.

This is desired-state documentation, not a controller sync — scans and
[SNMP](/docs/snmp/) keep observing reality; this page is where you record
what *should* be broadcasting.

## The list

WiFi lists every SSID with its band, security mode, bound VLAN,
site, and the number of broadcasting devices. SSIDs are **unique per
site** — the same name at a different site is a different row.

- **Band** — `2.4`, `5`, `6` GHz or `dual`.
- **Security** — `open`, `wpa2`, `wpa3`, or `enterprise` (802.1X).
- **Hidden** — non-broadcasting SSID flag; hidden rows get a badge.
- **Enabled** — flip off to keep the record while marking it retired;
  disabled rows render dimmed.
- **Bound VLAN** — the [VLAN](/docs/vlans/) clients land on. This is the
  answer to "which subnet does this SSID hand out" — the column most
  reports actually ask for.

## Broadcast devices

Click the AP count in a row (or open the row with `Enter`) to manage the
**broadcast set** — the [devices](/docs/devices/) carrying this SSID.
Members must be `family=wifi` devices: set an AP's family on its device
record first, then it appears in the picker. Saving replaces the whole
set in one write — the diff is computed server-side, so toggling is safe
mid-audit.

## API sketch

```
GET    /api/v1/wifi-networks?q=&site_id=&vlan_id=&band=&security=
       &enabled=&hidden=          # every column facet is a param
POST   /api/v1/wifi-networks      # site+ssid unique — 409 on a repeat
GET    /api/v1/wifi-networks/{id}
PATCH  /api/v1/wifi-networks/{id}
DELETE /api/v1/wifi-networks/{id}
PUT    /api/v1/wifi-networks/{id}/devices   # {device_ids:[…]} — whole set;
                                           # non-wifi members are a 422
```

Rows are audited — every SSID change lands in the
[changelog](/docs/changelog/), and backups carry the network + broadcast
join tables.
