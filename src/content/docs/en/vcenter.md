---
title: "vCenter / ESXi"
description: "Prepare a vCenter (or standalone ESXi) host as a read-only compute source — session auth, a least-privilege role, and what gets imported."
category: "integrations"
version: "0.7.0"
order: 44
---

# vCenter / ESXi

A vCenter source is the compute tier: the hypervisor estate *reports
itself* — hosts, the VMs running on them, and (when VMware Tools cooperates)
each guest's actual NIC→IP mapping. This is the second observation channel
for the compute half of the inventory, in the same test → preview → apply
flow as a firewall source.

Read-only by construction like every connector. The one exception to the
GET-only convention is the auth handshake: `POST /api/session` exchanges
basic auth for a session token. Every data read after that is a `GET`
against `/api/*` — it cannot create, power, or reconfigure anything.

## Read-only role

*Checked against vSphere 9 and 8 (7 best effort since its end of general support) — the lab's REST simulator.*

1. *Administration* → *Single Sign On* → *Users and Groups* → add `svc-lancompass@vsphere.local`.
2. *Hosts and Clusters* → the vCenter root → *Permissions* → *Add*: the user, role **Read-only**, **Propagate to children**.
3. Nothing else: guest networking comes through VMware Tools and reads with read rights; LanCompass closes its session after every Test and sync.

**What LanCompass reads:** `POST /api/session` (the one write-shaped call, a sign-in) then `GET` the hosts, the VMs per host, each VM's record and guest networking, the clusters, datastores and port groups, and `DELETE /api/session` to close it.

## Which endpoint to point at

| You have…                          | Point the source at            | What it can see                                  |
| ---------------------------------- | ------------------------------ | ------------------------------------------------ |
| vCenter Server (VCSA) 9 or 8       | `https://<vcenter>`            | Everything: hosts, VMs, clusters, datastores, port groups, guest IPs (supported) |
| vCenter Server 7.0                 | `https://<vcenter>`            | The same, best effort — out of general support since 2025-10-02 |
| Standalone ESXi 7.0+ (no vCenter)  | `https://<esxi>`               | Host + its VMs (thinner — no cluster view)       |
| Anything 6.7 or older              | —                              | Too old for the REST API; upgrade or skip        |

vCenter is always the better target — one source covers the whole cluster
instead of one source per ESXi box. Direct ESXi is the fallback for a lone
host.

## Step 1 — Create a least-privilege user

vCenter permissions are role-based. The built-in **Read only** role is
exactly right — an integration needs to *see* inventory, nothing else.

1. **vSphere Client → Administration → Single Sign-On → Users and Groups**:
   create a service user, e.g. `lancompass-reader@vsphere.local` (or use an AD
   account if vCenter is domain-joined).
2. **Administration → Access Control → Roles**: confirm a **Read only**
   clone exists (the stock role is fine as-is).
3. **Select the vCenter root object → Permissions → +**: add the user with
   role **Read only**, tick **Propagate to children**. Propagated is what
   makes every host+VM visible; assigning on a folder limits scope to it —
   a legitimate way to fence the sync to one cluster.
4. Log out/in and verify the user sees inventory but every action is greyed
   out. That's the whole privilege check.

## Step 2 — Prove the REST API by hand

```bash
# 1. Session token — basic auth exchange
curl -sk -X POST https://<vcenter>/api/session \
  -u 'lancompass-reader@vsphere.local:<pw>'
# → "d4ff…"   a bare token string (401 = bad creds, 403 = no rights)

# 2. A read with the token
curl -sk https://<vcenter>/api/vcenter/host \
  -H "vmware-api-session-id: d4ff…"
# → [{"host":"host-1","name":"esx01.lan",…}]  — you're ready.
```

The connector opens one session for each *Test* and each sync and closes
it when done (`DELETE /api/session`), whatever happened in between — no
session is left behind to idle out on the appliance.

## Step 3 — Add the source in LanCompass

Settings → **Integrations** → **New source**:

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Kind         | `vCenter / ESXi` — same kind covers a standalone host |
| Base URL     | `https://<vcenter>` — no path                       |
| Credentials  | the step-1 user + password                          |
| Verify TLS   | **off** if VCSA still runs its self-signed cert     |
| Site / VRF   | where compute objects land                          |
| Sync every   | 15–60 min is plenty; the estate doesn't churn fast  |

Then **Test & discover** → tick scope → **Preview** → **Apply**.

## What it imports

| vSphere data                                   | LanCompass object                                   |
| ---------------------------------------------- | ------------------------------------------------ |
| ESXi hosts (`/api/vcenter/host`)               | Devices — `family=compute`, type *hypervisor*; on the host's page its cluster and the datastores it reaches (name, type, free space of capacity) |
| VMs, listed per host (`/api/vcenter/vm?hosts=<host>`) | Devices — `family=compute`, linked to the host they are listed under |
| Each VM's own record (`/api/vcenter/vm/{vm}`)  | Its MAC (with or without VMware Tools); on the VM's page its power state, guest OS, cluster and each NIC's network |
| Guest NIC IPs (`guest/networking/interfaces`)  | Addresses (`source=integration`), *Tools only*   |
| Guest IP + prefix length                       | Subnets — the segment a guest actually sits in   |
| Clusters (`/api/vcenter/cluster`, `/api/vcenter/host?clusters=<cluster>`) | Device groups the source owns, its hosts as members |
| Datastores (`/api/vcenter/datastore`)          | On each host's page (the ones its VMs' disks are on) |
| Port groups (`/api/vcenter/network`), standard and distributed | Kept with the source; each VM NIC's port group on the VM's page |

**Every VM on its host.** The VMs are read host by host, so each VM's
host is the host it is listed under — a VM moved with vMotion follows its
host on the next sync. The list stops at 4,000 VMs per answer; a host
whose own list holds 4,000 is read again once per power state, and a part
still at 4,000 says so on the source (the sync is *capped*, never silently
short).

**A VM's record.** Read on the first sync and again only when the VM's
summary (name, power state, CPU, memory) changed — a later sync of an
unchanged estate reads no record. Its NICs' MACs come from it, so a VM
without Tools, or powered off, still has its MACs.

**Clusters as device groups.** Each cluster becomes a device group the
vCenter source owns, named after the cluster, its hosts as members; a
host moved to another cluster moves group, a member you add yourself
stays, and a group of that name you made yourself is never taken over.

**Port groups and VLANs.** A port group's VLAN is not in the vSphere REST
answer — LanCompass never guesses it from the port group's name
(`PG-VLAN-101` is a name, not a VLAN). The subnets still come from what
guests report.

The VM→host link is the point: a VM device lands under its host via
`host_device_id`, so guests inherit the host's rack/site context and show
in its device view.

## The honest caveats

- **VMware Tools is the guest-IP gate.** `guest/networking/interfaces`
  returns data only when Tools (or the open-vm-tools package) is installed
  *and running* in the guest. Without it the VM still imports — as a device
  with its MACs (from its own record) and no addresses, flagged as
  unreported rather than silently skipped.
- **Powered-off VMs** report no guest networking (the connector does not
  ask) — device yes, MACs yes, IPs no.
- **Sessions**: one per *Test* or sync, closed when it ends. Don't hammer —
  `sync_minutes` 15+ is the honest floor for big estates.
- ***Test* reads a sample**: the version, the host and VM counts, one
  host's list, one VM's record and its guest networking, the first
  cluster, the datastore and port-group lists — seconds at any size. The
  full read is the sync's.
- **No write path exists.** It can't create a VM, can't power one off,
  can't tag a port group — the read-only claim is structural.

## Troubleshooting

| Symptom                              | Likely cause → fix                                    |
| ------------------------------------ | ----------------------------------------------------- |
| `authentication failed`              | Wrong user@domain suffix — `vsphere.local` vs AD domain; or the role wasn't propagated |
| TLS verify error                     | VCSA self-signed cert → *Verify TLS* off, or install a proper CA cert |
| Test OK, hosts listed, VMs missing   | Permission assigned on a sub-folder instead of root, or propagation off |
| VMs present, no IP addresses         | VMware Tools not installed/running — the gate described above |
| Slow first sync on a big estate      | The first sync reads every VM's record and guest networking; later syncs read only the changed records — raise `sync_minutes` if guest calls still dominate |
| *Capped* on one host                 | Over 4,000 VMs in one power state on one host — the part beyond is not read; the note names the host |
| ESXi source sees less than vCenter   | Expected — standalone mode is the thin variant        |

## Security notes

- Credentials encrypt at rest (`cred_enc`, AES-256-GCM); the API returns
  `cred_set` only.
- LAN-side polling only — LanCompass initiates outbound to vCenter; nothing
  inbound is required. If your vCenter is air-gapped, this still works;
  if it's cloud-managed, this is the wrong tool.
- `integration` rows are mid-precedence (below manual/import, above scan);
  contradictions surface as conflict rows — reported, never applied.

## What each message means

| Message | What it means → what to do |
|---|---|
| *session: authentication failed (401)* | the user or password is wrong → enter them again |
| *…: authentication failed (403)* | the role does not reach that object → give **Read-only** at the root with **Propagate to children** |
| *session: empty token* | the server signed in without a session → check the vCenter's API service |
| *tls: …'s certificate … is not the pinned one* | the vCenter's certificate changed → compare its fingerprint, then *Trust this certificate* in *Test* |
| *…: request timed out* | the vCenter does not answer on 443 from LanCompass → check the route |
