---
title: "Nutanix Prism"
description: "Read-only Nutanix Prism Central discovery — clusters, AHV hosts, VMs linked under them with their categories as tags, subnets and IP pools; v4 GETs with a v3 list-RPC fallback."
category: "integrations"
version: "0.7.0"
order: 48
---

# Nutanix Prism

Nutanix is the wave's second compute connector: guests import as devices
with `family=compute`, linked under their AHV host — the device tree
shows hypervisors with their VMs nested underneath, same as vCenter and
Proxmox.

Two API generations live on one box, and the connector speaks both:

- **v4** (Prism Central 2024.x and pc.7.x): clean `GET` lists — VMs from
  `/api/vmm/v4.0/ahv/config/vms`, clusters and AHV hosts from cluster
  management (`/api/clustermgmt/v4.0/config/clusters` and `…/hosts` —
  hosts are not a `vmm` resource), subnets from `networking` and
  categories from `/api/prism/v4.0/config/categories`. Every list pages by
  `$page` with `$limit` at its ceiling, **100** (Prism Central answers 400
  to a larger page), until a short page or the answer's total;
- **v3 fallback**: `POST /api/nutanix/v3/{kind}/list` — RPC-over-POST,
  the same documented-exception pattern as Check Point. The connector's
  POST allowlist is exactly `^/api/nutanix/v3/\w+/list$` — anything else
  is refused in code before it leaves. Only *list* calls exist.

Which surface answers decides automatically: the connector probes a v4
endpoint first and falls back to v3 when it 404s.

## Read-only role

*Checked against Prism Central pc.7.6 and pc.7.5 (pc.2024.3 best effort) over v4, pc.2022.6 over v3 — the lab's simulator.*

1. Prism Central → *Admin Center* → *IAM* → *Users* → add `svc-lancompass` (a local user, or your directory's).
2. Give it the built-in **Prism Viewer** role, scope all clusters.
3. Enter its user name and password as the source's credentials (HTTP Basic works on every release).

**What LanCompass reads:** the v2 cluster identity, then v4 lists at 100 a page — clusters and hosts (cluster management), categories, subnets, VMs — or, on a Prism Central without v4, v3's `/list` calls; GET, and v3's list POSTs only.

## Before you start

- **Prism Central** (the multi-cluster manager). Prism Element on a
  single cluster answers the v3 surface — the connector reaches it, but
  Central is the supported shape.
- **TCP/443 reach** from the LanCompass host to the PC VIP or FQDN.
- **TLS** — PC ships a self-signed cert; leave *verify TLS* off or
  install a proper one.
- **A local or SAML-backed user** with at least **Viewer** — read-only is
  all the connector needs.

## Step 1 — Create a read-only user

1. Prism Central → **Administration → IAM → Users** (or your AD/SAML
   group mapping).
2. Grant the **Viewer** role (or a custom role with only *List/Get*).
3. The source's credential fields are **Username** + **Password** — HTTP
   Basic, which works on every PC version.

> Service accounts (`X-Ntnx-Api-Key`) exist on PC 2024.3+ but are
> IAM-CLI-managed only — not creatable in the UI. Basic auth is the
> supported shape today; the key header is the documented follow-on.

## Step 2 — Add the source

Settings → Integrations → **New source** → kind **Nutanix**, base URL
`https://<pc>:9440`, user + password, **Test & discover**. The scope
label reads **Clusters** — tick which clusters' VMs/hosts to read; an
empty list reads everything.

## What it imports

| Nutanix data                                   | LanCompass object                       |
| ---------------------------------------------- | ------------------------------------ |
| Clusters                                       | Device groups — one per cluster, its AHV hosts as members (the source owns the group); also the scope vocabulary |
| AHV hosts (cluster management)                 | Devices — `hypervisor`, family=compute, with their cluster on the device page |
| VMs (`host`/`extId` resolved to names)         | Devices — `virtual machine`, linked under their host; their cluster and power state on the device page |
| VM categories (`Environment: Production`, …)   | Tags `key: value` on the VM — the source adds and removes only the tags it put there; a tag you add stays |
| Networking subnets (incl. VLAN + gateway)      | VLANs + Subnets                      |
| Subnet IP pools                                | IP ranges                            |
| Guest NIC IPs                                  | Addresses (`source=integration`)     |

Guests reporting no NIC IPs still import — address-less, same rule as
vCenter.

The connector reads a subnet's and a host's fields under the names
Nutanix's v4 SDK gives them (`ipConfig[].ipv4.ipSubnet`, `poolList[].startIp`
and `endIp`, a VLAN subnet's `networkId`; `hostName`,
`hypervisor.externalAddress`, `cluster.uuid`) and under the older names
(`ipv4Config.subnetIp`, `startAddress`, `vlanId`; `name`, `hypervisor.ip`),
whichever the answer holds. A v3 pool's range is read as `start-end` or
`start end`.

**Releases checked** (the lab's simulator, written from Nutanix's public
references): pc.7.6 and pc.7.5 — the current and the previous train —
and pc.2024.3 over v4; pc.2022.6 over v3. A real Prism Central's answer is
welcome through the field kit (Docs → Support → *Field kit*).

## Caveats

- **Guest IPs depend on the tools**: AHV reports IPs only for guests
  running NGT/virtio drivers that report them — unreported guests import
  without addresses.
- **v3 POSTs are list-RPCs only** — if your proxy/WAF flags POST traffic
  to Nutanix, that is the *read* path on pre-7.3, not a write.
- **Community Edition on a single node** is a real (heavy) smoke target —
  the connector was developed against recorded v4+v3 fixtures.
- **Host names**: a guest's host is matched by the host's `extId`, so a
  renamed or migrated host keeps its guests on the next sync.
- **A role that cannot read a list**: *Test* names each read — identity,
  clusters, categories, hosts, subnets, VMs — with its rows, and a list
  that answers 403 as *denied — the role needs Prism Viewer*.

## What each message means

| Message | What it means → what to do |
|---|---|
| *…: authentication failed (401)* | the user or password is wrong → enter them again |
| *…: denied (403) — the role needs Prism Viewer* | the user lacks the role on that list → give **Prism Viewer** on all clusters |
| *…: HTTP 400* | the Prism Central refused a page — a release the lab has not seen → record it with the field kit |
| *tls: …'s certificate … is not the pinned one* | Prism Central's certificate changed → compare its fingerprint, then *Trust this certificate* in *Test* |
| *…: request timed out* | Prism Central does not answer on 9440 from LanCompass → check the route |
