---
title: "Integrations"
description: "Read-only controller discovery — point LanCompass at a firewall, hypervisor, or SDN controller and let it report its VLANs, subnets, DHCP leases, and ARP clients."
category: "integrations"
version: "0.7.0"
order: 42
---

# Integrations

Scanning learns what answers an ARP in the local segment. **Integrations**
make your controllers *report themselves*: a firewall already knows its
interfaces, VLANs, DHCP leases, and ARP table — including clients on routed
segments where a local scan can't reach; a hypervisor knows its guests and
their NIC→IP mapping. A source is a second observation channel into the
same reconcile engine.

All connectors are **read-only**: LanCompass never provisions, never pushes,
never changes a rule. Read-only comes in three shapes, each enforced in
code: pure `GET` (OPNsense, Proxmox, FortiGate, UniFi, MikroTik, PAN-OS,
NetBox); one auth-handshake `POST` followed by GETs (vCenter, Omada); or
an RPC-over-POST surface structurally limited to a declared allowlist
(Check Point's `show-*` commands, PAN-OS `show …` ops, Nutanix's
`v3/*/list`).

## Connectors

| Kind              | Credentials              | Reads                                              |
| ----------------- | ------------------------ | -------------------------------------------------- |
| **OPNsense**      | API key + secret         | Interfaces, VLANs, subnets, DHCP leases/ranges, ARP, the firewall device |
| **Check Point**   | user + password          | Gateways & servers, network objects (subnets), host objects — published management state |
| **vCenter / ESXi**| user + password          | Hosts, VMs linked under them, guest IPs (Tools-gated) |
| **Proxmox VE**    | API token id + secret    | Cluster nodes, QEMU/LXC guests, bridge VLANs/SVIs, guest IPs |
| **FortiGate**     | API token                | VDOMs, interfaces/VLANs, subnets, DHCP leases, ARP, device inventory |
| **PAN-OS**        | API key                  | vsys-scoped address objects, interfaces, DHCP defs, ARP, live leases |
| **Nutanix Prism** | user + password          | Clusters, AHV hosts, VMs linked under them, subnets, IP pools |
| **UniFi**         | API key                  | Sites, networks/VLANs, devices (APs→wifi), clients   |
| **Omada**         | client ID + secret       | Sites, LAN networks, devices, clients              |
| **MikroTik**      | user + password          | Interfaces, VLANs, SVIs, DHCP pools/leases, ARP    |
| **Active Directory** | read-only bind (or anonymous) | Computers → devices, Sites & Services → sites/subnets, AD-integrated DNS zones and PTR → hostnames |
| **NetBox**        | API token                | Sites, devices, prefixes (subnets), IP addresses — a live mirror |
| **Windows DHCP**  | none — the server uploads its export | Scopes → subnets and DHCP ranges, reservations, leases (IPv4 and IPv6) |

Guests from the compute connectors import as devices with
`family=compute`, linked under their hypervisor via `host_device_id` —
the device view shows hosts with their VMs nested underneath.

## The flow

Settings → **Integrations** → **New source**. Enter the controller's base
URL and credentials, then:

1. **Test & discover** — a live probe: reachability, the controller's
   identity (product, version, hostname), and counts of what it can see.
2. **Tick the scope** — which data sets (VLANs, subnets, DHCP ranges,
   addresses, devices) and which *things* to read — the noun changes per
   kind: interfaces on OPNsense and MikroTik, nodes on Proxmox, VDOMs on
   FortiGate, virtual systems on PAN-OS, clusters on Nutanix, sites on
   UniFi and Omada. Scope persists and applies to scheduled syncs too.
3. **Preview** — a dry-run diff: every observed object classified as
   *create*, *update*, *exists*, *conflict*, *skip*, or *error*, with a
   field-level diff where something would change. Nothing is written.
4. **Apply** — ticked rows write in one transaction. Apply re-fetches the
   controller rather than replaying the preview, so you never commit
   stale data.

Each apply — manual or scheduled — records an import batch for
provenance; the source's **Recent syncs** list shows them.

### Long previews

A preview, an apply or a *Test* of a large directory or vCenter can take a
minute or two — thousands of computers or VMs read one page at a time.
The page waits for it (up to ten minutes) and, after 10 seconds, a line
under the button says so: *Still reading … — a large directory or vCenter
takes a minute or two.* The directory's group search in Settings →
Account & Security shows the same line. An Active Directory **preview**
reads a sample of 64 reverse-DNS names from the window a sync reads;
**Apply** and the schedule still read the whole window (512 a sync), so a
preview after a large workbook import stays quick and a sync still fills
every name.

## OPNsense

The reference connector reads the OPNsense REST API
(`/api/core/system/status`, `/api/interfaces/overview`, diagnostics ARP,
and DHCPv4 leases) — GETs only.

**Credentials** are an API key/secret pair: System → Access → Users →
pick (or create) a user → *API keys* → the `+` generates a key and
downloads the secret. A read-only-privileged user is all LanCompass needs —
it never calls a write endpoint. The key goes in the **API key** field,
the secret in **API secret**.

**What it imports:**

| Controller data                          | LanCompass object                |
| ---------------------------------------- | ----------------------------- |
| Interfaces with VLAN tags                | VLANs                         |
| Interface subnet assignments             | Subnets (prefixes)            |
| DHCPv4 ranges                            | IP ranges                     |
| DHCPv4 leases, ARP entries               | Addresses (`source=integration`) |
| The firewall itself                      | A device (`source=integration`) |

DHCP reservations import as `reserved`; plain leases and ARP entries as
`discovered`. Rows the connector reports are stamped
`source: integration` — use the source facet on the address list to
filter them.

*Community tier — kept working, no new reads (with UniFi, Omada and MikroTik).*

### Read-only role

*Not checked against a device this release (community tier); the privilege names are OPNsense 25.x's.*

1. *System* → *Access* → *Groups* → *Add* `lancompass-ro` with only these privileges: **Lobby: Dashboard**, **Status: Interfaces**, **Status: DHCP leases**, **Diagnostics: ARP Table**, **Diagnostics: NDP Table**.
2. *System* → *Access* → *Users* → *Add* `lancompass`, a member of `lancompass-ro` only, no shell, a long random password nobody signs in with.
3. On that user, *API keys* → `+`: OPNsense downloads the key and the secret once. Paste the key into **API key** and the secret into **API secret**.

**What LanCompass reads:** `/api/core/system/status`, `/api/interfaces/overview`, `/api/dhcpv4/leases`, `/api/diagnostics/interface/getArp` and `getNdp` — GET only.

### What each message means

| Message | What it means → what to do |
|---|---|
| *…: authentication failed (401)* | the key or the secret is wrong, or was deleted → create a new key on the user |
| *…: authentication failed (403)* | the user's group lacks the read's privilege → add it to `lancompass-ro` (*Test connection* names the read) |
| *…: not found* | this OPNsense release has neither path for the read → update OPNsense; the other reads still sync |
| *…: request timed out* | the firewall does not answer from LanCompass → check the route and the web GUI's listen interfaces |
| *no endpoints answered* | not one read answered → check the base URL and the certificate (see *Certificates*) |

## NetBox

The NetBox connector is the **live mirror** counterpart of the
[NetBox file import](/docs/import/): token-auth `GET`s over
`/api/dcim/sites/`, `/dcim/devices/`, `/ipam/prefixes/`, and
`/ipam/ip-addresses/` — the transport can't send a non-GET, so even a
write-enabled token can't write through it. Run LanCompass alongside a
running NetBox to evaluate or audit; when the cutover day comes, the
one-shot file import is the other half of the story.

Scope rides query filters: **NetBox VRF** (name, RD, or id → `?vrf=`),
**Site slug** plus the Sites tick-list (→ `?site=` on prefixes; devices
and IP addresses attribute client-side through the device map), and
**Object status** (`?status=` on prefixes/addresses, `active` default).
Pulls are bounded — 500-row pages, 40 pages per endpoint — and a
failing endpoint records an error and lets the rest of the pull
finish. The dedicated guide: **[NetBox](/docs/netbox/)**.

## Windows DHCP

LanCompass reads Windows DHCP from the **file the server exports** — it
speaks no Windows protocol to the DHCP server and needs no right on it.
A scheduled task on the server runs `Export-DhcpServer -Leases` (one XML
file of every IPv4 and IPv6 scope, its reservations and its leases) and
sends the file to the source with an API token that can do nothing else.

1. **Add the source.** Settings → Integrations → *Add source*, type
   **Windows DHCP**. The URL is `upload://` and the server's name
   (`upload://dhcp01.corp.example`) — a label, never dialled.
   *Warn when the export is older than* sets how old the newest file may
   be (36 hours by default) before a sync says so.
2. **Mint the token.** Settings → API tokens: a token with the scope
   **Upload a source's export** (`sources:upload`) and nothing else. It can
   send this file and is refused everywhere else, `/sources` included.
3. **Copy the two lines.** The source's *Credentials* step shows them
   under *Run on the DHCP server as a scheduled task*; paste the token to
   fill them in (it is not saved), then add them as a scheduled task on
   the DHCP server, at least daily:

   ```powershell
   Export-DhcpServer -File "$env:ProgramData\lancompass-dhcp-export.xml" -Leases -Force
   Invoke-RestMethod -Method Post -Uri "https://lancompass.example/api/v1/source-uploads/12" -Headers @{ Authorization = "Bearer ipam_…" } -InFile "$env:ProgramData\lancompass-dhcp-export.xml" -ContentType "application/xml"
   ```

4. **Test** reads the newest file and reports its scopes, reservations,
   leases and age; **Preview** and **Apply** run the usual plan.

What lands, through the same plan as any source:

- each **IPv4 scope** → a subnet (`ScopeId` / `SubnetMask`, its name,
  option 3 as the gateway) and its pool (`StartRange`–`EndRange`) as a
  DHCP range; each **IPv6 scope** → its /64;
- each **reservation** → a reserved address with its name (the client id
  as the MAC when it is one);
- each **lease** → an address with its `HostName` and client id (IPv4 and
  IPv6). A *Declined* lease — the server's `BAD_ADDRESS` mark — is no
  client and is left out.

**Uploads.** At most 50 MB, checked while the file arrives. The newest
upload and the one before are kept on the backups volume
(`<backup dir>/sources/<id>/`); a third removes the oldest. A file holding
a `<!DOCTYPE` — never part of an export, and how an XML entity attack
would arrive — is refused before it is read, as is any file that is not a
DHCP export.

**When the task stops.** A sync whose newest export is older than the
source's line is **partial**: the source's health says *“The DHCP export
is 2 days old — check the scheduled task on dhcp01”*, and the plan review
says it too. The data is as old as the last export — that is the price of
needing no Windows protocol and no right on the server.

## Who owns a value

A source changes only what it owns. A device, address, VLAN, subnet, site
or certificate is **this source's** while its sync created it and nobody
has changed it since; your edit to any field of such a row makes the row
**yours**, and a renewed certificate keeps the date you typed. The plan
review's **Owner** column says whose values each row would change:
*Yours*, *An import*, *This source*, *Another source: name* or *A scan*.

| The source would… | On this source's row | On anyone else's row |
| --- | --- | --- |
| create a row | applied | — |
| change a value | applied | a **conflict** that waits for you |
| fill an empty field (a gateway, a site, a description, a device's model or serial, the device an address belongs to) | applied | a **conflict**: "Fill gateway with 10.0.0.1?" |
| refresh a certificate's expiry | applied | a **conflict** showing both dates |

A conflict row (red) never applies by itself. In the plan review each one
offers **Keep mine** (the default — your value stays) and **Take it** (this
apply writes the source's value on that row only). Even on a conflict the
sync records what the source saw — an address keeps your MAC and host
name while its observed values and *last seen* move.

Nested subnets plan safely: a subnet that holds others is created as a
**container**, and one that would sit inside one of your non-container
prefixes waits as "Inside 10.0.0.0/16, which is not a container — make
10.0.0.0/16 a container to keep both". The plan never reaches the database
with an overlap, so one odd subnet no longer fails every later sync.

## One object, one row

Every source keeps a list of the objects it has seen, each under the
vendor's own id for it — an Active Directory computer's objectGUID, a
vCenter VM's id (`vm-1007`), a Proxmox guest's vmid, a Nutanix extId, a
NetBox id, a Check Point uid, a FortiGate or PAN-OS `<vdom|vsys>/<name>`
— never a name. That list is what makes these work:

| What happens at the source | What LanCompass does |
| --- | --- |
| An object is **renamed** | The same row is renamed (on a row the source owns; on anyone else's row the rename waits as "Renamed in vCenter: old → new"). Never a second device. |
| An object is **deleted** | After an answer that is complete (health **ok**), it is marked **Gone** — never after a partial, held or failed one. Nothing is deleted or retired by a schedule. |
| A VM **migrates** to another host | Its host link follows the host it runs on (on another's device the move waits as "Moved in vCenter to esx-2"). |
| Two sources name **one address** | The name belongs to the source whose sync created the address; another source's name is recorded only as what was seen (*Observed*). A DNS PTR answer never overwrites a name a firewall or a person gave. |
| Two **routing domains** hold the same subnet | Each lands in the VRF you mapped it to (see [NetBox](/docs/netbox/)) — never merged. |

Devices are matched by the source's own id first, then MAC, serial, the
full name, and the short host name only when one of the two names has no
domain — `ws-1.branch` is never `ws-1.corp`. Addresses match by VRF +
address, VLANs by VID, subnets by CIDR.

**Gone objects** wait for you in the plan review's **Gone from vCenter**
section (the source's name): **Retire** (a device is retired, an address set offline) or
**Keep** (it stays, and stops asking until it goes again). A gone object
says so on its page — "Gone from vCenter since 27.10.2026" — and a device
shows when each source last saw it ("Seen by vCenter 3 min ago"). An
object that comes back clears its mark. Deleting a source removes its
list, never the objects it created.

## When two sources see one machine

A VM is often known twice: vCenter holds it by its VM id and its network
cards, Active Directory by its computer object and `dNSHostName`. Each
sync keeps its own order (the source's id, then MAC, serial and name) and
never joins a row to another source's object by itself.

- **The domain is not a rename.** When a device another source holds by
  its vendor id is called `srv-app-02` and this source calls the same
  object `srv-app-02.lab.test`, the plan says *exists* — not a *rename*
  conflict on every sync. Another host part is still a rename a person
  decides.
- **Leases are evidence.** When a FortiGate or Windows DHCP sync applies,
  each lease's MAC, host name and client id are kept as the address's
  `lease` evidence (a preview writes none), so the identity and the
  network's name for the host come from what the DHCP server knows.
- **The matcher joins the rest — as proposals.** After every sync the
  matcher looks for addresses that are a source's device, a VM's several
  addresses and devices that are one; each join is a proposal in the
  Discovery inbox (*Link*, *Not the same…*), never applied by itself. See
  [One host, many sources](/docs/discovery/#one-host-many-sources).

## Credentials and secrets

The credential fields are **write-only**: the pair encrypts at rest
(AES-256-GCM under the server master key) into `cred_enc`, responses only
ever report `cred_set`, and the plaintext never appears in logs, plan
rows, or error messages. Leave both fields blank on edit to keep the
stored pair; submit an empty credential to clear it.

## Certificates

Every HTTPS source checks the server's certificate before the credential crosses the connection, on the worker and on the web alike:

- **Verify TLS** on, nothing else set: the system's trust store — enough for a public certificate.
- **CA certificate (PEM)**: the internal or self-signed CA the device's certificate chains to — one certificate or several. The device's own name is checked even though LanCompass connects to the address it resolved.
- **Certificate pin (SHA-256)**: exactly this certificate, refused if the server shows any other — even one a trusted CA signed. *Test connection* shows the certificate the server presented (subject, issuer, validity, names, SHA-256): compare the fingerprint with the device's console, then **Trust this certificate** pins it in one click.
- **Verify TLS** off: allowed, and every view of the source says the password crosses an unverified connection. A PEM or a pin turns verification back on.

### Rotating a CA

1. Before the change, paste the new CA below the old one in the source's **CA certificate (PEM)** field: both are trusted while the devices' certificates are reissued.
2. Reissue each device's certificate from the new CA and run *Test connection* on its source.
3. Once every device answers with a certificate from the new CA, remove the old CA from the field.
4. A pinned source refuses the reissued certificate: open *Test connection*, compare the new fingerprint with the device's console and trust it again.

Never turn verification off to get through a rotation.

## Network requirements

- `base_url` must be `http`/`https` — a literal IP or a resolvable name.
  Other schemes are rejected outright.
- The host resolves once when a sync starts and the session pins to that
  address — a DNS rebind mid-sync can't redirect the request.
- Self-signed certs are the norm on controllers: flip **Verify TLS
  certificate** off if yours uses one. LAN-local use only.
- Private (RFC 1918) and ULA addresses are what sources live on and are
  always allowed. Loopback (`localhost`, `127.0.0.1`), link-local
  addresses, the cloud metadata services (`169.254.169.254`,
  `fd00:ec2::254`) and this install's own address and port (**Public
  address (URL)** in Settings → Features) are refused — when you save the source, and
  again at the address its name resolves to on every sync — unless an
  administrator ticks **Allow an internal address (loopback or
  link-local)** on that source. A refused source says why: "This address
  is on the install itself, link-local or a metadata service — tick
  “Allow an internal address” to use it".
- Air-gap note: connectors poll the controller directly — nothing leaves
  the LAN. A controller unreachable from the LanCompass host simply can't
  be synced.

## Scheduled sync

Set **Sync every (min)** on the source (`0` = manual only) and flip the
global **Enable scheduled source sync** switch. The worker's once-a-minute
tick finds sources whose interval elapsed and runs the *same* merge path
as a manual apply — conflicts still skip and count into the source's
last-error line ("N conflicts wait for a person"), never auto-guessed. A
failed source records its error and isn't retried until the next interval.

**What a scheduled sync applies** (the Schedule card, `SOURCES_AUTO_APPLY`
in `.env`): *New rows and the source's own rows* — the default — applies
creates and changes on rows the source owns (see **Who owns a value**);
every other change waits for you. *Nothing — every sync waits for a
person* stores each scheduled plan instead: the source reads *Held —
waiting for a person* and you apply it from the plan review.

### New rows from a schedule

**What a schedule does with new computers and VMs** (the Schedule card;
`SOURCES_SCHEDULE_CREATES` in `.env` is documentation only): *Propose them
in the Discovery queue* — the default — keeps a scheduled sync's new
computers (Active Directory) and new virtual machines (vCenter, Proxmox,
Nutanix) out of the inventory: each waits in [Discovery](/docs/discovery/#monday-morning)
as a group, *12 new virtual machines from vCenter — lab*, beside the scanned
hosts they match, so the two meet before either becomes a device. *Review
and create…* reads the source again and creates them as one batch you can
undo; pick the rows in the preview to leave some for later. *Create them as
devices* keeps the way before. A person's **Apply** on the source's plan
always creates as before, and a schedule's updates to the rows the source
owns are the same either way. A firewall's or a controller's own device and
a hypervisor's hosts are created as before.

Imported rows appear under `source=integration` and keep that stamp on
every scheduled merge; decommissioning a source doesn't delete what it
imported — undo its syncs for that.

## Undo a sync

Every sync remembers each row it wrote: what it created, and each value
it changed with the value before. Open the source's row (the arrow beside
its chip) or finish an apply: **Recent syncs** offers **Undo this sync**
on every sync that wrote something.

The undo deletes the rows the sync created and puts back the values it
changed — in one go, last row first, as you. A row someone changed since
the sync, a row another row now points at (a prefix that holds your
address) and a row deleted since are **kept** and listed with the reason;
a deleted row is never re-created. The dialog ends with the counts — "41
rows undone", "2 rows kept — changed since this sync" — and the list.

**Pause this source's schedule** is ticked by default, so the next sync
does not bring the rows back five minutes later; turn the source back on
when its scope is right. A sync can be undone once; the undo is recorded
as its own run, with who undid what and when, and every reversed row
writes its own change-log entry. A sync applied before this version, an
import of a file and a NetBox migration cannot be undone here; committed
syncs are never deleted.

## Health

Every sync — scheduled or applied by a person — is judged by what each
**channel** returned. A channel is one read the connector makes: a
FortiGate's interfaces, DHCP leases and ARP table, a directory's
computers and PTR lookups, a Check Point's host objects and certificates.
The source's status chip says one of:

| State | Means |
| ----- | ----- |
| **ok** | Every channel the source's scope asks for answered, and no reader stopped at its limit. |
| **Partial** | At least one channel answered, but another failed, left a note, or stopped at its limit ("computers: stopped at 8,192 — the source holds more"). What answered is still applied. |
| **Held — waiting for a person** | A scheduled sync whose answer shrank (see below). Nothing was applied. |
| **error** | The source could not be read at all, or every channel its scope asks for failed — a vendor that answered nothing it was asked for is an error, not a quiet success. |
| **never** | The source has not synced yet. |

Open a source's row (the arrow beside its chip) to see **what each
channel returned**: its state, the rows it returned (**Seen**), the rows
that landed in the sections it feeds (**Applied** — never more than it
returned; channels that feed one section share its count) and the
connector's own note. A partial source names its failed channel there without opening a
batch; the **Recent syncs** list shows each run's state too.

**Last good sync** is its own column: it moves only on an *ok* sync,
never on an attempt that failed, came back partial or was held — read
freshness from it, not from the last attempt. A partial, held or failed
source sends **source.sync_failed** to the notification channels once a
day at most (the summary names the state and the failed channel), and
**source.sync_recovered** when it is *ok* again.

### The hold

The schedule never applies an answer that looks like an outage. When a
scheduled answer has fewer rows than **Hold a shrunken answer (%)** of
the last good sync's rows — 50 % by default — or comes back empty (unless
the last good sync was empty too; a first sync that answers empty is held),
the sync is **held**: nothing is written, the run's import batch stays a
draft naming the reason, and the chip reads *Held — waiting for a person*.
The setting is on the **Schedule** card (`SOURCE_SHRINK_HOLD_PCT` in
`.env`); `0` turns the hold off.

To land an intended shrink — a decommissioned VDOM, a cleaned-up
directory — open the source's sync, **Preview** it: the review shows
"This answer has 40% of the rows of the last good sync (date)" above the
plan. Read it, then **Apply**. A person's apply is never held, and an
*ok* apply makes it the new last good sync.

### Test runs where the schedule runs

**Test & discover** runs on the **scanner worker** — the process the
schedule runs in, with its own name resolution and routes — and the API
runs the same test beside it, shown as the step **From the web server**.
The **Resolve** step shows the address each one resolved the controller's
name to; when they differ, or one reaches the controller and the other
does not, Test says so, and the scanner worker's answer is the one that
counts. With no worker running, Test answers "No background worker
answered — the schedule is not running, so nothing will sync" within two
minutes instead of hanging.

When an apply breaks a database rule (for example two overlapping
prefixes), nothing is written and the message names the rule; the failed
run keeps the error's class and the rule's name, never the SQL.

## DNS publishing

Sources are the read half; **DNS publishing** is the write half of the
IPAM↔DNS loop. A *zone* under Settings → Integrations → **DNS
publishing** names a reverse zone (`in-addr.arpa` or `ip6.arpa`) plus
the authoritative server that owns it, and pushes PTR records generated
from your IPAM addresses. Two transports:

| Kind         | Server field              | Credentials                          |
| ------------ | ------------------------- | ------------------------------------ |
| **PowerDNS** | HTTP(S) API base URL      | `X-API-Key` API key                  |
| **RFC 2136** | nameserver `host[:port]`  | TSIG key name + secret (+ algorithm) |

The desired set is computed live: every **active** IP address with an
FQDN-shaped hostname whose address falls inside the zone's reverse
range becomes a `name → hostname.` PTR. Short hostnames are reported
*unpublishable* in the plan, never guessed at; two addresses claiming
one PTR name warn as a *collision* — the later row wins.

The flow mirrors sources: **test** probes reachability, auth, and that
the zone exists upstream; **plan** previews the truthful diff —
`add` / `update` / `delete` / `exists` rows, a *conflict* verdict when a
foreign record holds a name LanCompass wants (reported, never overwritten —
remove it upstream to publish), plus a *foreign* count of PTRs LanCompass
didn't create; **apply** recomputes the plan fresh before writing.
Sending the previewed counts with apply guards against drift — a zone
that changed under you returns a 409, not a blind publish.

Each row of the plan says what it will do before anything is written: its
operation, the PTR name, the name it holds today and the one it will hold, and
its reason in words — a *conflict* reads "foreign record holds this name —
remove it upstream to publish" (someone set that PTR by hand to another name
before LanCompass ever wrote it), and a *delete* of a name already gone reads
"already absent upstream — ledger row dropped". A released address's PTR — one
LanCompass published — is a plain *delete*, and a PTR LanCompass published that
someone later changed by hand is an *update* back to the documented name (the
row shows both names); the conflict is reported on every publish and never
written.

**The ledger owns deletes.** Every name LanCompass publishes lands in the
`dns_records` ledger, and deletes are computed *only* from that ledger —
"exists upstream but not in the diff" is a foreign record, reported and
never touched. Point a zone at a populated reverse zone and the only
names it will ever delete are ones it created. Deleting the zone row
drops the ledger, not the records — upstream PTRs simply become foreign.

Zone notes:

- **PowerDNS** rides the same pinned HTTP client as the sources —
  `verify_tls` honored, `X-API-Key` header auth.
- **RFC 2136** reads via inbound **AXFR** (`allow-transfer` must list
  the LanCompass host on the far side) and writes a TSIG-signed dynamic
  `UPDATE` over TCP — plain DNS, no URL, nothing leaves the LAN.
- **Auto-publish** is opt-in per zone: the scheduler's daily tick runs
  the same bounded publish as a manual apply and reports via the
  `dns.published` / `dns.publish_failed` notify events.
- The TTL applies to every published PTR (60s floor); v1 publishes PTRs
  only — forward zones, DNSSEC, and server-side zone creation are
  deliberately out of scope.

### Writing PTR records to an AD zone

An Active Directory–integrated zone set to **Secure only** (the default
for AD zones) takes only updates signed with Kerberos (GSS-TSIG). An
unsigned update is answered *REFUSED*, and one signed with a TSIG key the
DC does not know *BADSIG* — and an AD DNS server cannot be given a TSIG
key of its own. LanCompass does not sign with Kerberos, so when an AD
source's zone read says the zone is secure-only, a refusal says so:
*“This zone accepts only Kerberos-signed updates (Secure only) —
LanCompass does not sign with Kerberos; see the DNS chapter for the two
options”*. The two options:

1. **A delegated zone.** Run the reverse zone LanCompass writes on a
   PowerDNS or BIND server, and delegate it from AD's DNS: in the AD
   parent zone (`88.10.in-addr.arpa`), add a delegation of the child zone
   (`250.88.10.in-addr.arpa`) to that server (an NS record and its
   address). LanCompass then writes there with an API key or a TSIG key,
   and Windows clients still resolve the names through AD's DNS.
2. **Nonsecure and secure, on the reverse zone only.** In DNS Manager,
   the reverse zone's *Properties → Dynamic updates → Nonsecure and
   secure*. Any host that can reach the DC can then change that zone's
   records — keep it to the reverse zone LanCompass publishes, never a
   forward zone.

Kerberos signing (GSS-TSIG) is a decision of its own (D-KRB, answered
*no* for now) and would add a runtime dependency.

## Monitoring tools

LanCompass is the record of what the network is and what it was last
seen doing — not a metrics store. The work splits cleanly:

- **LanCompass keeps** the inventory, each monitor's current state, its
  transitions and daily availability, incidents and who owns them
  ([Monitoring](/docs/monitoring/)).
- **Your monitoring tool keeps** the series, the dashboards and the
  paging — Prometheus and Grafana, Zabbix, LibreNMS, Checkmk, Icinga.

Three plugs join the two, all read-only on the LanCompass side:

1. **The scrape** — `GET /metrics` in the Prometheus text format: the
   monitor lane (targets by state, late targets, the last sweep, the
   scheduler's tick), deliveries by channel kind and result, open and
   unowned incidents, the SNMP lane; per-target series only for a scraper
   holding `METRICS_TOKEN` ([Monitoring → Monitoring tools](/docs/monitoring/#monitoring-tools)).
2. **The intake** — Prometheus, Grafana and Alertmanager rules post to
   `POST /api/v1/events/alertmanager` as a webhook receiver; every other
   tool posts to `POST /api/v1/events` with a `dedup_key`
   ([API tokens → Inbound events](/docs/api-tokens/)). Either way the alert
   reaches LanCompass's channels and changelog once per state.
3. **The link** — a **Graphs** button on every device page, built from the
   template in **Settings → Monitoring** (`external_graph_url_template`),
   opens that device's graphs in your tool.

The API answers on `API_BIND:API_PORT`. A `.env` made from `.env.example`
since V134 sets `API_BIND=127.0.0.1` — loopback only — while an older one
(or none) leaves `0.0.0.0:8001`, every address of the host. On loopback a
scraper or alert manager on another host needs `API_BIND` set to an
address it reaches (`0.0.0.0`), or a reverse proxy that passes `/metrics`
and `/api/v1/events` through.

The examples below need an API token with `data:write` (**Settings → API
tokens**); `https://ipam.example.com` stands for your install.

### Alertmanager, Grafana

A webhook receiver (Grafana: a *Webhook* contact point) pointed at the
intake, with the token as its bearer credential:

```yaml
receivers:
  - name: lancompass
    webhook_configs:
      - url: https://ipam.example.com/api/v1/events/alertmanager
        http_config:
          authorization:
            credentials: ipam_a1b2…
        max_alerts: 100
```

Each alert becomes `external.alertmanager.<alertname>` (lowercase), keyed
`{fingerprint}:{status}:{startsAt}`: Alertmanager's repeats of a group,
and its retries, arrive once.

### Zabbix

A *Webhook* media type (**Alerts → Media types**) with the parameters
`url` = `https://ipam.example.com/api/v1/events`, `token`, `subject` =
`{ALERT.SUBJECT}`, `host` = `{HOST.NAME}`, `severity` =
`{EVENT.SEVERITY}`, `event_id` = `{EVENT.ID}`, `status` =
`{EVENT.STATUS}`, and this script:

```javascript
var p = JSON.parse(value);
var req = new HttpRequest();
req.addHeader('Content-Type: application/json');
req.addHeader('Authorization: Bearer ' + p.token);
req.post(p.url, JSON.stringify({
  event_type: 'external.zabbix.' + (p.status === 'RESOLVED' ? 'resolved' : 'problem'),
  summary: p.subject,
  source_name: 'zabbix',
  dedup_key: p.event_id + ':' + p.status,
  payload: { host: p.host, severity: p.severity }
}));
if (req.getStatus() >= 300) throw 'LanCompass answered ' + req.getStatus();
return 'OK';
```

### LibreNMS

An *API* alert transport: method `POST`, URL
`https://ipam.example.com/api/v1/events`, header `Authorization: Bearer
ipam_a1b2…`, and the body:

```json
{
  "event_type": "external.librenms.alert",
  "summary": "{{ $title }}",
  "source_name": "librenms",
  "dedup_key": "librenms-{{ $uid }}-{{ $state }}",
  "payload": {"host": "{{ $hostname }}", "severity": "{{ $severity }}"}
}
```

### Checkmk

A notification script in `~/local/share/check_mk/notifications/`
(executable), chosen in a notification rule with the token as its first
parameter:

```sh
#!/bin/sh
# LanCompass
WHAT=$(echo "$NOTIFY_WHAT" | tr 'A-Z' 'a-z')
curl -fsS -X POST https://ipam.example.com/api/v1/events \
  -H "Authorization: Bearer $NOTIFY_PARAMETER_1" \
  -H 'Content-Type: application/json' \
  -d "{\"event_type\": \"external.checkmk.$WHAT\",
       \"summary\": \"$NOTIFY_HOSTNAME $NOTIFY_SERVICEDESC $NOTIFY_SERVICESTATE$NOTIFY_HOSTSTATE\",
       \"source_name\": \"checkmk\",
       \"dedup_key\": \"$NOTIFY_HOSTNAME:$NOTIFY_SERVICEDESC:$NOTIFY_NOTIFICATIONTYPE:$NOTIFY_LASTSERVICESTATECHANGE$NOTIFY_LASTHOSTSTATECHANGE\"}"
```

### Icinga

A notification command that calls `curl`:

```
object NotificationCommand "lancompass" {
  command = [ "/usr/bin/curl", "-fsS", "-X", "POST",
    "-H", "Authorization: Bearer $lancompass_token$",
    "-H", "Content-Type: application/json",
    "-d", "{\"event_type\": \"external.icinga.notification\", \"summary\": \"$notification.type$ $host.name$ $service.name$ $service.state$\", \"source_name\": \"icinga\", \"dedup_key\": \"$host.name$:$service.name$:$notification.type$:$service.last_state_change$\"}",
    "$lancompass_url$/api/v1/events" ]
}
```

## Connector guides

Per-platform setup guides — credentials, least-privilege roles, what each
connector reads, and its honest caveats:

- **[Check Point](/docs/checkpoint/)** — management-server Web API,
  read-only admin profile, the two-hop gateway read.
- **[vCenter / ESXi](/docs/vcenter/)** — vSphere REST session auth, the
  Read-only role, and the VMware-Tools gate on guest IPs.
- **[Proxmox](/docs/proxmox/)** — API token auth, the PVEAuditor role, the
  QEMU guest-agent caveat.
- **[FortiGate](/docs/fortigate/)** — REST API admin token, per-VDOM scope,
  monitor-endpoint reads.
- **[PAN-OS](/docs/panos/)** — the one-time keygen, `X-PAN-KEY` header
  auth, vsys/Panorama scope, `show`-only operational reads.
- **[Nutanix Prism](/docs/nutanix/)** — Prism Central basic auth, v4 GETs
  and the v3 list-RPC fallback, guest→host linkage.
- **[UniFi](/docs/unifi/)** — the console-minted `X-API-KEY`, the
  Integration API, sites as scope.
- **[Omada](/docs/omada/)** — OpenAPI client-credentials, the token
  handshake, per-site scope, the 6.2 v2 caveat.
- **[MikroTik](/docs/mikrotik/)** — RouterOS REST over www-ssl, basic
  auth, and why GET-only is load-bearing there.
- **[Active Directory](/docs/activedirectory/)** — read-only LDAP against a
  Domain Controller: computer objects, Sites & Services topology,
  and PTR hostname enrichment.
- **[NetBox](/docs/netbox/)** — token-auth GET-only mirror of a live
  NetBox: sites, devices, prefixes, IP addresses — and how it differs
  from the one-shot file import.

UniFi, Omada, MikroTik and OPNsense are the **community tier — kept working, no new reads**: each still syncs what it read before, and *Test connection* lists those reads; nothing new is added to them.

The connector framework absorbs new kinds without a data-model change —
the credential form adapts to whatever the kind declares (one token field
or a pair), and each guide above walks the controller-side setup end to
end.
