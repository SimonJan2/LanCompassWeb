---
title: "Proxmox"
description: "Prepare a Proxmox VE cluster or node as a read-only compute source — API token auth, the PVEAuditor role, and what gets imported."
category: "integrations"
version: "0.7.0"
order: 45
---

# Proxmox

Proxmox is the friendliest of the compute connectors: its API is genuinely
REST (`GET /api2/json/…`), token auth is header-based with no session
dance, and a free hypervisor you can spin in a VM to test against. If you
want to see the compute tier work end-to-end before vCenter licensing, this
is the one to try first.

Read-only by construction — `GET`s only; it cannot start, stop, or create
a guest.

## Read-only role

*Checked against Proxmox VE 9.0 and 8.4 (8 best effort since its end of life in August 2026) — the lab's simulator.*

1. *Datacenter* → *Permissions* → *Users* → *Add*: `lancompass`, realm `pve`.
2. *Datacenter* → *Permissions* → *API Tokens* → *Add*: user `lancompass@pve`, token ID `lancompass`, **Privilege Separation** ticked; copy the secret — it is shown once.
3. *Datacenter* → *Permissions* → *Add* → *API Token Permission*: path `/`, token `lancompass@pve!lancompass`, role `PVEAuditor`, **Propagate**.
4. On PVE 9 nothing more: PVEAuditor holds `VM.GuestAgent.Audit`, so the VMs' addresses read. On PVE 8 keep PVEAuditor and accept VMs without addresses, or add `VM.Monitor`, knowing it also opens the QEMU monitor.
5. The same on a node's shell: `pveum user add lancompass@pve`, `pveum user token add lancompass@pve lancompass --privsep 1`, `pveum acl modify / --tokens 'lancompass@pve!lancompass' --roles PVEAuditor`.

**What LanCompass reads:** `/api2/json/version`, `/nodes`, each node's `network`, `qemu` and `lxc`, each VM's `agent/network-get-interfaces` and each container's `interfaces` — GET only.

## Step 1 — Dedicated user + API token

PVE auth splits *who you are* (user) from *what may call* (token), and the
right integration shape is a dedicated user + token, not your `root@pam`.

**In the web UI:**

1. **Datacenter → Permissions → Users → Add** — `lancompass`, realm `pve`,
   no expiry needed.
2. **Datacenter → Permissions → API Tokens → Add** — user `lancompass@pve`,
   token ID e.g. `lancompass`. **Privilege Separation**: leave it *checked*
   (recommended) and give the token its own ACL, or uncheck to inherit the
   user's permissions — either works; checked is tidier.
3. **Save → copy the secret NOW** — the token value (`…-uuid`) displays
   once and never again. Losing it = delete + recreate.
4. **Datacenter → Permissions → Add → API Token Permission** (or User
   Permission if separation unchecked): path `/`, token
   `lancompass@pve!lancompass`, role **`PVEAuditor`**, tick **Propagate**.
   PVEAuditor reads everything and can change nothing — the exact contract.

**Guest addresses and your PVE release.** A VM's addresses come from the
QEMU guest agent (`…/qemu/{vmid}/agent/network-get-interfaces`), and the
privilege that read needs depends on the release:

- **PVE 9** — `VM.GuestAgent.Audit`, which PVEAuditor already holds:
  guest addresses work read-only, nothing to add.
- **PVE 8** (end of life since August 2026; best effort) — `VM.Monitor`,
  which PVEAuditor does **not** hold. Choose one:
  - **keep PVEAuditor only** (recommended) and accept that VMs import
    without addresses — the sync stays whole, and the source shows one
    note: *15 guests without addresses: the token lacks VM.Monitor
    (PVE 8.4.1)*; containers keep their addresses (their interfaces need
    only `VM.Audit`);
  - or **grant `VM.Monitor`** as well, knowing that it also opens the QEMU
    monitor of every VM — more than reading.

**Or the CLI on any node:**

```bash
pveum user add lancompass@pve --comment "LanCompass read-only sync"
pveum user token add lancompass@pve lancompass --privsep 1
# → prints the secret once
pveum acl modify / --tokens 'lancompass@pve!lancompass' --roles PVEAuditor
```

## Step 2 — Prove it by hand

```bash
curl -sk 'https://<pve>:8006/api2/json/nodes' \
  -H 'Authorization: PVEAPIToken=lancompass@pve!lancompass=<uuid-secret>'
# → [{"node":"pve1","status":"online",…}]  — ready.
# 401 = bad token / wrong user@realm spelling. 403 = role missing.
```

## Step 3 — Add the source in LanCompass

Settings → **Integrations** → **New source**:

| Field        | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| Kind         | `Proxmox VE`                                                  |
| Base URL     | `https://<node-or-cluster>:8006` — the management port        |
| Credentials  | token id `lancompass@pve!lancompass` + the UUID secret              |
| Verify TLS   | **off** — PVE's default cert is self-signed (`pve-ssl.pem`)   |
| Site / VRF   | where compute objects land                                    |
| Sync every   | 15–60 min                                                     |

One base URL on a clustered PVE sees the whole cluster —
`/api2/json/nodes` enumerates every member through whichever node you
point at, and the connector walks each node's guest list from there. Point
at whichever node is most reliable. On a multi-node source the **Interfaces**
scope tick-boxes become the *node* picker — untick a node to leave it (and
its guests) out of sync.

## What it imports

| Proxmox data                              | LanCompass object                                   |
| ----------------------------------------- | ------------------------------------------------ |
| Nodes (`/api2/json/nodes`)                | Devices — `family=compute`, type *hypervisor*    |
| QEMU VMs (`/nodes/{n}/qemu`)              | Devices — `family=compute`, linked to the node   |
| LXC containers (`/nodes/{n}/lxc`)         | Devices — `family=compute`, linked to the node   |
| Guest NIC IPs (QEMU agent / LXC net conf) | Addresses (`source=integration`)                 |
| Tagged bridge ifaces (`vmbr0.30`)         | VLANs                                            |
| Bridge interface address + netmask        | Subnets (the node's SVI view); the gateway is the bridge's `gateway` from the node's network answer, else none — never the node's own address |

SDN-defined vnets are a follow-up — v1 learns segments from each node's
configured interfaces, which is the grounded-truth view anyway.

Guests land under their node via `host_device_id` — the device view shows
the hypervisor with its VMs nested underneath.

## The honest caveats

- **Guest IPs need the QEMU guest agent.** For qemu VMs, `qm agent` must
  be enabled *and* `qemu-guest-agent` installed inside the guest — without
  it the VM imports with no addresses (honestly flagged, not silently
  skipped). LXC containers report their configured interfaces regardless.
- **A guest the token may not read never fails the sync.** A 403 on the
  agent read leaves that guest without addresses and adds the note above,
  naming the privilege for the node's release; only a token that does not
  sign in (401) fails the read.
- **Privilege separation surprise.** If the token ACL step is skipped with
  privsep on, you get 403s on reads — the token has no rights of its own.
- **Self-signed is the default.** Nearly every PVE lab will need
  *Verify TLS* off unless you put real certs on the nodes.
- **No session expiry.** Token auth is stateless — cleanest connector of
  the three, and nothing to renew.

## Troubleshooting

| Symptom                            | Likely cause → fix                                          |
| ---------------------------------- | ----------------------------------------------------------- |
| `authentication failed` (401)      | Token id misspelled (`user@realm!id`) or wrong secret       |
| 403 on reads                       | Token ACL missing — privsep means the token needs its own; *Test* names each read and the privilege a denied one needs (`Sys.Audit` for nodes and networks, `VM.Audit` for guest lists) |
| *N guests without addresses: the token lacks VM.Monitor (PVE 8.x)* | The PVE 8 choice above — keep it, or grant `VM.Monitor` |
| *… lacks VM.GuestAgent.Audit (PVE 9.x)* | A custom role without the audit group's agent privilege — use PVEAuditor, or add `VM.GuestAgent.Audit` |
| TLS verify error                   | Self-signed `pve-ssl.pem` → *Verify TLS* off                |
| Nodes listed, VMs have no IPs      | qemu-guest-agent not installed/enabled in the guests         |
| Only one node's guests appear      | Pointed at a node path style that's node-scoped — the connector enumerates the cluster; check the token's `/` ACL |

## Security notes

- The token secret encrypts at rest (`cred_enc`, AES-256-GCM); the API
  returns `cred_set` only.
- LAN-side polling only — LanCompass initiates to PVE on 8006; nothing
  inbound. A PVEAuditor token can't do damage even if it leaks — it's
  read-only on the platform side too.
- `integration` rows are mid-precedence (below manual/import, above
  scan); conflicts are reported, never applied.

## What each message means

| Message | What it means → what to do |
|---|---|
| *…: authentication failed (401)* | the token id (`user@realm!id`) or its secret is wrong → paste them again |
| *…: permission denied (403)* | the token's ACL lacks that read's privilege → grant it on `/` with **Propagate** |
| *N guests without addresses: the token lacks VM.Monitor (PVE 8.x)* | PVEAuditor on PVE 8 → keep it, or add `VM.Monitor` |
| *tls: …'s certificate … is not the pinned one* | the node's certificate changed → compare its fingerprint in *System → Certificates*, then *Trust this certificate* in *Test* |
| *…: request timed out* | the node does not answer on 8006 from LanCompass → check the route |
