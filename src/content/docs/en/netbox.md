---
title: "NetBox"
description: "Read-only live mirror of a NetBox — Token-auth GETs over the REST API: sites, devices, prefixes, IP addresses. Import vs. source, scope filters, bounded pagination, honest skips."
category: "integrations"
version: "0.7.0"
order: 53
---

# NetBox

NetBox is the IPAM/DCIM most shops already run. There are two ways its
data reaches LanCompass:

- **File import** (Settings → Import) — a one-shot CSV/ZIP cutover for
  the day you leave NetBox behind. See [Import](/docs/import/).
- **This connector** — a live mirror: `Token`-auth `GET`s over the
  REST API, reconciled by the same sync plan every connector feeds.
  Run the two side-by-side, reconcile in the UI, cut over when
  convinced.

Every request is a `GET` against `/api/`:

    GET /api/dcim/sites/          -> sites + the scope tick-list
    GET /api/ipam/vrfs/           -> VRF id resolution — only when the
                                     scope names a VRF
    GET /api/dcim/devices/        -> devices + the device→site map
    GET /api/ipam/prefixes/       -> subnets
    GET /api/ipam/ip-addresses/   -> addresses

**GET-only is structural**: the connector's transport can't send a
non-GET — a token with write rights still can't write through it.
Read-only is the code, not a permission hope.

## Read-only role

*Checked against NetBox 4.4 (the lab) and 4.5's v2 tokens.*

1. *Admin* → *Users* → add `lancompass`; *Groups* → `lancompass-readers` with object permissions *view* on `dcim.site`, `dcim.device`, `ipam.prefix`, `ipam.ipaddress`, `ipam.vrf`.
2. *Admin* → *API Tokens* → *Add* for `lancompass`, **Write enabled** off; optionally the allowed IPs the LanCompass host.
3. Copy the token. A NetBox 4.5 v2 token (`nbt_…`) is sent as `Authorization: Bearer`, an older one as `Authorization: Token` — paste it as it was shown.

**What LanCompass reads:** `GET /api/status/`, sites, devices, prefixes and IP addresses — GET only.

## Before you start

- **NetBox 3.x or 4.x** — field names that drifted between majors
  (`role`/`device_role`, `site`/`scope`, `{value,label}` statuses) are
  all read tolerantly; a missing field is a dropped detail, never a
  crash.
- **TCP/443 reach** from LanCompass to NetBox (or whatever your reverse
  proxy fronts).
- **An API token** — your user menu → **API Tokens**. A read-only
  permission set is all the connector can use anyway.

## Step 1 — Add the source

Settings → Integrations → **New source** → kind **NetBox**, base URL
`https://netbox.example.com` (the front-page address — `/api/…` is
appended for you), the token in **API token**, **Test & discover**.

The test line reports the NetBox version (from the `API-Version`
response header) plus counts of what the token can see, and the scope
tick-list reads **Sites** — site names discovered on the pull.

## Scope — what the fields land as

| Field             | Sent as            | Notes                                  |
| ----------------- | ------------------ | -------------------------------------- |
| **NetBox VRF**    | `?vrf_id=`/`?vrf=` | Name, RD (`65000:100`), or id — resolved against the fetched VRF table; an unresolvable value passes literally (it may be an RD a restricted token can't list). |
| **Site slug**     | `?site=`           | The *slug*, not the display name — prefixes only. |
| **Sites tick-list** | `?site=` union   | Site *names* resolved to slugs — unions with the slug field. |
| **Object status** | `?status=`         | Prefixes + IP addresses; `active` is the default, `any` drops the filter. A value one object type can't express (e.g. `dhcp` on prefixes) yields an empty section, not an error. |
| **Routing domains** | (the plan)       | Each NetBox VRF (and `global`, NetBox's global table) → the LanCompass VRF its prefixes and addresses land in. Listed by **Test** on the credentials step. |

Site scoping narrows prefixes server-side; devices and IP addresses
narrow client-side — `/ipam/ip-addresses/` has no site filter at all,
so an IP attributes through `assigned_object.device` → the devices
map. Rows that can't attribute are kept: can't attribute, never
dropped.

## What it imports

| NetBox object                   | LanCompass object                        |
| ------------------------------- | ------------------------------------- |
| `dcim/sites`                    | Sites                                 |
| `ipam/prefixes` (non-container) | Subnets — the site name rides for site matching |
| `ipam/ip-addresses`             | Addresses — mask stripped, `dns_name` → hostname, NetBox's status kept: `active` → active, `reserved` → reserved, `dhcp` → DHCP, `deprecated` → offline |
| `dcim/devices`                  | Devices — manufacturer/model from `device_type`, role → `device_type`, primary IPs as `addresses` |

Each row is matched next time by its NetBox id, so a renamed object
stays one row ([One object, one row](/docs/integrations/)).

### Routing domains — the VRF map

NetBox can hold the same subnet in two VRFs (`172.29.10.0/24` in *Corp*
and in *Tenant-B*). LanCompass keeps them apart: on the source's
credentials step, **Test** lists NetBox's VRFs under **Routing domains**,
and each gets a LanCompass VRF in **Maps to VRF**.

- One VRF and no map — everything lands in the source's VRF, as before.
- A mapped VRF — its prefixes and addresses are matched and created in
  that VRF only, so each VRF keeps its own `/24` and its own `.20`.
- Two or more VRFs, one not mapped — its rows wait in the plan as "Map
  Tenant-B to a VRF"; nothing is merged into another VRF.

### Not imported as objects

LanCompass has no object for NetBox's **tenants**, **regions** and
**locations**. They are kept as attributes of the rows that name them
(a site's region and tenant, a device's location), and the plan says so:
"Not imported as objects: 2 tenants, 2 regions, 1 location — kept as
attributes". Nothing NetBox sends is dropped without a word.

## Caveats

- **Container prefixes are dropped** — the plan grammar has no
  container create, and the row would only ever conflict against its
  own children.
- **Honest skips**: `/dcim/interfaces/`, `/ipam/ip-ranges/`, VLANs,
  VMs, tenancy, aggregates aren't fetched — no plan section consumes
  them. IP ranges in particular are DHCP-pool-shaped in LanCompass; a
  NetBox range with another role would lie.
- **Per-row VRFs ride the map** — with two or more NetBox VRFs, map
  each to a LanCompass VRF (above); an unmapped one waits in the plan.
- **Pagination is bounded** — `?limit=500&offset=` honoring the `next`
  cursor's offset (the absolute `next` URL is never followed — the
  client is pinned to your NetBox's host), 40 pages per endpoint, a
  hard row cap per section; an overflow is a capped-with-error note,
  never silent truncation.
- **Partial pulls report** — an endpoint that 404s or fails (an old
  NetBox without `/vrfs/`, an object the token can't see) lands an
  error entry; every other endpoint still imports.

## The CSV cutover (file import)

The one-shot migration is **Settings → Import → NetBox export** — a
ZIP of NetBox CSV exports, or the same files dropped in one at a
time. Exports from **NetBox 3.6–3.7**, **4.0–4.1**, and **4.2+** are
read; header drift between releases is normalized rather than
rejected:

- `device_role` (4.x) and `role` (3.x) both map to the device role.
- Prefix `site` (≤4.1) and the `scope_type`/`scope` pair (4.2+) both
  scope a prefix to a site.
- IP assignments on `virtual_machine`/`vminterface` (3.x) and
  `assigned_object_*` (4.x) both resolve.
- `vminterfaces.csv`, `vm_interfaces.csv`, and
  `virtual_machine_interfaces.csv` are all the VM-interfaces object.

### What maps where

| NetBox export                        | LanCompass |
| ------------------------------------ | ---------- |
| `sites`                              | Sites — region/site-group names fold into custom fields |
| `rack_groups`, `racks`               | Rack groups and racks — a location name rides the rack's room |
| `device_types` + `interface_templates` | Device types, with the port layout carried |
| `devices`                            | Devices — type, role, platform, tenant resolve to stored objects and custom fields; primary IPs ride |
| `virtual_machines`                   | VMs — cluster, site, tenant resolve the same way |
| `interfaces`, `vminterfaces`         | Interfaces wired to their device or VM |
| `cables`                             | Cables — an asserted endpoint that can't resolve is a **conflict** (the topology claim was made; it isn't silently dropped) |
| `vrfs`                               | VRFs — a blank VRF column joins the Global VRF; a *named* VRF that doesn't exist is an **error**, never a quiet fallback |
| `vlan_groups`, `vlans`               | VLAN groups and VLANs, scope included |
| `prefixes`                           | Subnets — site/scope resolved; tenant and region are noted in the row detail because the model has no custom fields |
| `ip_ranges`                          | IP ranges — masked endpoints (`10.0.0.1/24`) are normalized; a static address inside a range is stamped onto it (`pool_override`) |
| `ip_addresses`                       | Addresses — VRF, status, and the device/VM interface link |
| `wireless_lans`                      | Wi-Fi networks — only a site scope is imported; other scopes are reported rather than guessed |

### Reported but not imported

`clusters`, `regions`, `site_groups`, `locations`, `tenants`,
`manufacturers`, `device_roles`, `platforms`, `cluster_types`,
`cluster_groups`, `wireless_links`, `tenant_groups`, and
`wireless_lan_groups` have no LanCompass object — the rows appear in
the coverage report's *unmodelled* table with their counts and the
reason, and the data folds into the modelled rows that reference
them where a field exists (manufacturer on the device type, cluster
on the VM, tenant on custom fields). A file whose headers match no
NetBox object is listed the same way — nothing is silently dropped.

### Reading the coverage report

The import wizard has a **Coverage** step between Preview and Commit
(`GET /api/v1/imports/{batch}/netbox-coverage`, CSV at the same path
plus `.csv`). Per modelled object: CSV rows seen, then created /
updated / skipped / conflicted / errored counts — skips carry a
reason histogram (`identical`, `already exists`, …) so a skipped
estate explains itself. Before commit the report describes the plan;
after commit it's the stored commit coverage — the **Planned** /
**Committed** badge says which you're reading.

Re-importing a changed export is an update pass: every `update` row
shows a field-level *before → after* diff in its detail, so a
re-run is auditable rather than blind.

## What each message means

| Message | What it means → what to do |
|---|---|
| *…: authentication failed (403)* | the token is wrong, expired or limited to other IPs → paste a new one, check its allowed IPs |
| *…: not found* | the base URL is not NetBox's (a path missing or extra) → use the URL you open NetBox at |
| *map … to a VRF — … waits until it has one* | NetBox holds that VRF and LanCompass has none mapped → map it in the source's dialog |
| *tls: …'s certificate … is not the pinned one* | NetBox's certificate changed → compare its fingerprint, then *Trust this certificate* in *Test* |
