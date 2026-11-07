---
title: "SNMP Enrichment"
description: "Devices report their own ports — IF-MIB interfaces, link state, and bridge-MAC links."
category: "operations"
version: "0.7.0"
order: 34
---

# SNMP Enrichment

Scans learn what answers an ARP. SNMP enrichment makes your own devices
*report themselves*: a switch tells LanCompass which ports it has, whether
they're up, how fast they're running, and which MACs it has learned behind
each port. That data upserts real interfaces and fills the structured
`connected_interface_id` links between IP addresses and switch ports.

All polling is **read-only** — LanCompass only ever sends SNMP GET/WALK
requests to devices you configure. No SET operations, ever.

## Setting up a device

Open a device page and find the **SNMP** card:

1. Flip the toggle on. The card expands when enabled.
2. Pick the **version** — `v1`, `v2c`, or `v3` — and the **UDP port**
   (default 161).
3. Enter the credential:
   - v1/v2c: the read-only **community** string.
   - v3: **user**, **auth key** + protocol (SHA family or MD5), and
     optionally **priv key** + protocol (AES family, DES/3DES). Set only a
     user for authNoPriv; add auth key for authNoPriv→authPriv basics.
4. **Save**. The credential is encrypted at rest (AES-256-GCM under the
   server master key) and is *write-only* — the form always renders it
   empty, a "credential set" chip tells you one is stored, and it never
   appears in API responses, logs, or error messages.
5. Press **Test** — a live sysName/sysDescr probe. A reachable device
   answers with its identity; the response is shown inline.
6. **Poll now** runs a full enrichment pass immediately, without waiting
   for the scheduler.

Enabling SNMP without a stored (or freshly typed) credential is rejected —
a poll that can't authenticate would just burn timeouts.

## What a poll does

In order: `sysName`/`sysDescr` liveness check → IF-MIB interface walk →
bridge-MAC walk → LLDP neighbour walk → optional CDP neighbour walk.

**Interfaces** (`ifIndex`, `ifDescr`/`ifName`, `ifOperStatus`,
`ifAdminStatus`, `ifHighSpeed`, `ifPhysAddress`): every reported port is
upserted into the interface list, keyed by the device's `ifIndex` and
falling back to exact name match. Every reported port gets its
operational and admin state refreshed each poll, and its speed and
physical address land in the **observed** columns (`observed_speed_mbps`,
`observed_mac`). The documented `speed_mbps` and `mac_address` are never
written by a poll: a port the poller creates (`source: snmp`) starts with
them equal to that first observation, and from then on only a person
changes them (see [Cabling → documented and observed](/docs/cabling/)).
Interfaces the device stops
reporting are **not deleted** — their `snmp_seen_at` just goes stale and
the tile dims (about two poll intervals), which is the difference between
"a renamed port" and "a documented truth".

**Bridge MACs** (`dot1dTpFdbPort` and `dot1qTpFdbPort`): each learned MAC
is looked up in `ip_addresses.mac_address`. On a match, the IP gains
`connected_interface_id` pointing at the port — visible as the green link
on the interface tile and in the IP drawer. A link a person set is never
replaced: the poll moves an existing link only when the poll lane itself
wrote it last (its [changelog](/docs/changelog/) row's actor is `snmp`) and
the address's source ranks below `snmp`. When the bridge places a
protected address behind another port, that port is flagged
`link_mismatch` instead.

**LLDP** (`lldpRemTable` + the agent's own `lldpLocPortTable` for local
port identity): neighbors land in each interface's `validation` evidence
blob and feed the cable-validation checks below.

**CDP** (`CISCO-CDP-MIB`, `cdpCacheTable`): read on every poll when
`snmp_walk_cdp` is on (default **on**, editable with `system:admin` in
Settings → Features → SNMP). Cisco devices with LLDP disabled can report
neighbours through CDP. Local ports resolve only by `ifIndex`, never by
guessing names. IPv4 addresses, platform and capability bits are retained;
other address types are not resolved. An unsupported table returns no
neighbours; a failing CDP walk never fails the poll.

The blob key stays `validation.lldp`. Each row carries `proto: lldp`, `cdp`
or `lldp+cdp`; old rows without `proto` mean LLDP. Matching remote name and
port on the same local interface fuse into one row, keeping LLDP's MAC and
CDP's IP/platform/capabilities. Interface tiles show the protocol and CDP
platform/IP. At most 16 neighbours are stored per interface. A failed or
disabled source keeps its last-known evidence; only fresh evidence raises
new findings. This is SNMP reading only, not transmission of CDP frames.

## Cable validation — documented vs observed

The tail of every poll compares what the cabling layer *documents*
against what the switch *reports*, and writes the outcome into each
interface's `validation` blob (`cable_mismatch` flag + `lldp` neighbors
+ bounded `macs_seen` + `checked_at`). Six checks, in priority order — a
port carries one flag, the first that fires:

| Reason | Fires when |
|---|---|
| `documented_down` | a cable is documented on the port AND the live IF-MIB pass reports `operStatus=down` |
| `far_end_absent` | the documented far-end device has known MACs (its interfaces' documented and observed MACs ∪ its owned IPs), the bridge table learned *other* MACs on the port, and none of them match |
| `lldp_neighbor` | LLDP or CDP reports a neighbour on a port with NO documented cable (the reason key stays unchanged) |
| `speed_mismatch` | the port's documented speed and the speed this poll observed are both set and differ — a port reporting down has no negotiated speed and is not compared |
| `mac_mismatch` | the port's documented MAC and the MAC this poll observed are both set and differ |
| `link_mismatch` | the bridge learned an address's MAC on this port while a person linked that address to another port — the link stays, this port is flagged |

Review reads each as a sentence naming its values ("Runs at 1G,
documented as 10G"). **Accept observed** on the port tile copies the
observed speed or MAC into the documented field — a normal port edit with
a changelog row, which needs write permission and clears the flag.

Honest-evidence rules:

- **Absent evidence is not a violation** — a missing/failed bridge or
  LLDP walk skips its check entirely; it can neither raise nor clear a
  flag. A silent port (no MACs learned) never flags `far_end_absent`.
- **Flags, never fixes** — a mismatch never deletes or rewrites the
  cable; the human confirms what is true.
- **Self-healing** — each flag clears on the poll where its own check is
  disproved by fresh evidence (a speed or MAC flag when a fresh reading
  agrees). Editing the cable or the port — the documented value included
  — clears the flag keys immediately; the next poll re-derives
  everything.
- **Sticky dismissal** — suppressing a finding from
  [Review → Cable mismatches](/docs/review/) writes a `review_dismissals`
  row keyed on the flag's fingerprint (reason + cable/neighbor identity),
  so re-flagging the same thing stays quiet while a genuinely different
  finding resurfaces.

A `cable.mismatch` notification fires once per poll when new flags are
raised; recoveries and persistent flags stay silent. Flagged ports show
an amber ⚠ on the device's interface grid (tooltip = reason + detail),
roll up as `flagged_count` on the device header, and count beside
`mac_mismatches` on the dashboard's mismatch card.

## What enrichment writes — and what it never does

Writes:

- new `source: snmp` interfaces for ports the device reports and the
  inventory lacks;
- observed state on every reported port (`oper_status`, `admin_status`,
  `observed_speed_mbps`, `observed_mac`, `snmp_seen_at`) — bulk-updated,
  no changelog noise; a new `source: snmp` port's documented speed and
  MAC start equal to its first observation;
- `connected_interface_id` on IPs whose MAC the bridge table places
  behind a port — ORM writes, so they appear in the changelog;
- the `validation` evidence blob on each evaluated port — bulk-updated
  like the rest of the observed state, no changelog noise;
- device stamps: `snmp_sys_name`, `snmp_sys_descr`,
  `snmp_last_ok_at`, `snmp_last_error`.

Never:

- documented port fields — no poll rewrites a port's documented speed or
  MAC, kind, name or `source`, on a manual or an snmp-created port; a
  disagreement is a `speed_mismatch` / `mac_mismatch` flag;
- manual IP links — `snmp` only fills an empty `connected_interface_id` on
  an address it may write (a scanned, passive or SNMP address), or moves a
  link the poll itself set there. A link a person set — on a scanned
  address too — always wins, and a disagreement is flagged
  `link_mismatch`; an empty link on a person's address stays empty (see
  [Bridge links](#bridge-links));
- deletions — nothing is removed because a device stopped reporting it;
- SNMP SET — the poller is physically incapable of writing to a device.

## Bridge links

The bridge table tells a poll which port each MAC sits behind. A poll fills
an address's empty port link only on an address it may write — a scanned,
passive or SNMP address. On an address a person owns it writes nothing,
even when the link is empty (a person may have cleared it on purpose): the
poll's answer lists it as a *proposed* link instead (`links_proposed` and
`link_proposals` — the address and the port). A link a person set always
wins; a link a poll set moves when the MAC moves.

Every link a poll writes is the poll's in the change log — actor `snmp` —
whoever pressed **Poll now**; the person who did rides the same change-log row
as `triggered_by`. So a link a person's *Poll* wrote is the next poll's to
move, exactly as a scheduled poll's is.

## Neighbours

A poll reads each port's LLDP neighbours — the far end's system name, its
port id, its chassis id and, when the agent gives it, its port description —
and the subtype columns that say what each id is. A port id or chassis id of
the *macAddress* subtype reads as a MAC, `00:15:65:A0:B1:5B`, wherever the
port's neighbour shows (the port's chip, Review, the topology), even when its
six bytes happen to look like text; an id of any other subtype stays text,
and an agent that gives no subtype still has six non-text bytes read as a
MAC. A MAC beside Hebrew text keeps its order.

What the neighbours and the bridge table name becomes proposals after the
poll, never writes: a cable for each neighbour on a port nobody cabled, and a
port link for each person's address the bridge saw on a port (see
[Cables the wire proposes](/docs/cabling/#cables-the-wire-proposes)). A
proposal on a port a person cabled is never made.

## Inventory sync — the switch teaches you its truth

Enrichment describes ports. **Pull inventory** (on the same SNMP card)
goes further: the switch hands over its VLAN database, its L3 interface
addresses, and its ARP cache — subnets and neighbors the scanner can't
see because they live on VLANs with no routable SVI. Everything runs
through a **preview → apply** flow, identical in spirit to the workbook
importer: nothing writes until you approve a plan, and apply is one
transaction.

Pick a **target VRF** (and optionally a site) in the dialog, press
**Preview**, and LanCompass walks three tables read-only:

| Table | OIDs | Becomes |
|---|---|---|
| VLANs | Q-BRIDGE `dot1qVlanStaticName` + `dot1qVlanStaticEgressPorts`/`dot1qVlanCurrentEgressPorts` | `vlans` rows (name + member ports, resolved through `dot1dBasePortIfIndex`) |
| L3 interfaces | IP-MIB `ipAddressIfIndex`/`ipAddressPrefix` (legacy `ipAdEnt*` fallback) | `prefixes` rows — the CIDR of each SVI/L3 port; the interface's own address fills `gateway` |
| ARP cache | `ipNetToMediaPhysAddress` + `ipNetToPhysicalPhysAddress` | `ip_addresses` rows at `status: discovered`, `source: snmp` |

The preview groups rows into **VLANs / subnets / addresses** with an
action badge per row:

- **create** — nothing like it exists; applying writes it;
- **exists** — already recorded identically (a re-run is all `exists`);
- **update** — exists, but the device knows more (e.g. an ARP-observed
  MAC on an address that has none);
- **conflict** — the device's truth disagrees with a row a *higher*
  authority owns: a VID that exists under a different name, or an IP
  whose stored MAC differs. Conflicts render red with the stored value —
  they are **reported, never overwritten**.

Precedence follows the shared `SOURCE_RANK`: `scan` < `snmp` <
`integration` < `import` < `manual`. An address you imported or typed
keeps its MAC; a scan-discovered one can be enriched. Prefix creation
still honors `check_overlap`, so a subnet that would collide is a
conflict row, not a silent write. Subnet matching is scoped to the VRF
you picked — the same CIDR in a different VRF is a separate coexistence,
not a match.

Uncheck any row before **Apply**. Apply re-walks the device (the plan is
always against fresh truth), applies your selection in **one
transaction**, and records a committed `import_batches` row with
`kind: snmp` — the same provenance trail file imports get, so the
changelog and the import history both show where the data came from.
Mid-apply failure rolls the whole thing back. Created addresses carry
`source: snmp` and `import_batch_id` back to that batch.

Honest-sync rules:

- **Preview writes nothing** — it is a pure read; the only thing it
  costs is a device walk.
- **No deletions** — a VLAN or address the device stops reporting is
  never removed; absence is evidence of nothing.
- **Not a DHCP scope pull** — contiguous ARP spans are neighbors, not
  pools. A device that genuinely exposes a DHCP scope table is a future
  slice; today `ranges` is deliberately a no-op.
- **Read-only, always** — inventory sync shares the poller's guarantee:
  GET/WALK only.

## Runtime controls

Settings → **Features → SNMP enrichment**:

| Setting | Default | Effect |
|---|---|---|
| SNMP polling enabled | off | Global kill switch — the worker lane enqueues nothing. Test/Poll buttons still work. |
| Poll interval | 60 min | A device is due when its last poll is older than this. |
| Poll concurrency | 4 | Parallel device polls inside the single per-tick sweep. |
| Per-device timeout | 2 s | SNMP request timeout — a dead device costs only this. |
| Learn interfaces | on | Off = collect but don't create/update ports. |
| Fill connected IP | on | Off = collect MACs but don't write links. |
| Collect CDP neighbours (`snmp_walk_cdp`) | on | Read Cisco neighbours on every poll; off skips the CDP walk. |
| Ports with at most this many MACs can place a host (`bridge_edge_port_max_macs`) | 8 | 1–64; env `BRIDGE_EDGE_PORT_MAX_MACS`. A port with no cable to a switch, router or access point, no LLDP or CDP neighbour that forwards, not an aggregate (`Po*`, `ae*`, `bond*`), that learned at most this many MACs, is an edge port: only its bridge table links an address to a port. Any other port's MACs are *behind* it (see [Observed neighbours](/docs/topology/#observed-neighbours)). A change applies from the next poll. |
| Trap receiver | off | Worker opens a UDP trap listener (below). |
| Trap listen port | 162 | UDP port the receiver binds — privileged under 1024. |
| Traps kept per sender per minute (`trap_store_per_minute`) | 120 | 10–6000; env `TRAP_STORE_PER_MINUTE`. Past it, the rest of that sender's traps in that minute are counted in one summary row, not stored one by one. |
| Trap log retention (`trap_retention_days`) | 30 days | 1–365; env `TRAP_RETENTION_DAYS`. The retention sweep deletes older trap rows. |
| Minutes between health polls (`snmp_health_interval_minutes`) | 5 | 0–1440, 0 = off; env `SNMP_HEALTH_INTERVAL_MINUTES`. The light health poll ([Device health](#device-health)). |
| Errors per 5 minutes that flag a port (`interface_error_threshold`) | 50 | Errors plus discards since the last health poll, scaled to the time between polls; env `INTERFACE_ERROR_THRESHOLD`. |
| CPU percent that flags a device (`device_cpu_threshold_pct`) | 90 | On two health polls in a row; env `DEVICE_CPU_THRESHOLD_PCT`. |
| Sessions as percent of the limit (`device_sessions_threshold_pct`) | 85 | On two health polls in a row, for a device that publishes its limit; env `DEVICE_SESSIONS_THRESHOLD_PCT`. |
| Failed polls before unreachable (`snmp_unreachable_after`) | 2 | Failed health polls in a row; env `SNMP_UNREACHABLE_AFTER`. |
| Days before a vanished tunnel is forgotten (`tunnel_forget_days`) | 30 | env `TUNNEL_FORGET_DAYS`. |
| Most watched ports (`if_watch_cap`) | 500 | 0–2000, 0 = watched ports off; env `IF_WATCH_CAP`. Marking a port past it is refused ([Watched ports](#watched-ports-traffic-for-the-uplinks-that-matter)). |
| Hours of 5-minute samples kept (`if_raw_hours`) | 48 | 24–168; env `IF_RAW_HOURS`. Whole days older than this are dropped. |
| Days of hourly rows kept (`if_hour_days`) | 400 | 30–1100; env `IF_HOUR_DAYS`. Whole months older than this are dropped. |
| Years of daily rows kept (`if_day_years`) | 3 | 1–10; env `IF_DAY_YEARS`. |
| Storage ceiling for watched ports (`if_storage_ceiling_mb`) | 1024 MB | 10–102400; env `IF_STORAGE_CEILING_MB`. Above it sampling pauses and one message says so. |
| Busy-port threshold (`if_util_threshold_pct`) | 85 % | 1–100; env `IF_UTIL_THRESHOLD_PCT`. Three samples in a row at it report the port. |

Polls run on the worker's own lane — one job per minute that iterates the
due set under a small semaphore, so a fleet of dead devices can't starve
scans or monitoring.

## Trap receiver — near-realtime link state

Polling is on a schedule; a `linkDown` shouldn't wait for the next
interval. Enabling the trap receiver makes the worker open a UDP listener
(default **port 162** — the standard trap port, privileged, so the
container needs to run rootful — pick a higher port like 1162 otherwise)
and turn traps into interface state in seconds.

The scanner container runs `network_mode: host`, so the listener binds
the host's UDP port directly — there is no `ports:` mapping to publish,
just open the firewall for inbound UDP to the port you configured.

**Point devices at it** — one line per vendor family:

| Family | Config sketch |
|---|---|
| Cisco IOS / NX-OS | `snmp-server host <lancompass> version 2c <community>` + `snmp-server enable traps snmp linkdown linkup coldstart warmstart` |
| Arista EOS | `snmp-server host <lancompass> version 2c <community>` + `snmp-server enable traps` |
| Juniper JunOS | `set snmp trap-group rackpad targets <lancompass>` + `set snmp trap-group rackpad categories link` |
| MikroTik RouterOS | `/snmp set trap-target=<lancompass> trap-community=<community> trap-version=2` |
| net-snmp (Linux) | `trap2sink <lancompass> <community>` in `snmpd.conf` |
| Quick test | `snmptrap -v2c -c <community> <lancompass> '' 1.3.6.1.6.3.1.1.5.3 1.3.6.1.2.1.2.2.1.1.2 i 2` (a linkDown for ifIndex 2) |

**Attribution:** the trap's community string is matched against the
stored v1/v2c credentials of SNMP-enabled devices; when several devices
share one community, the trap's *source IP* is compared to each
candidate's linked IP addresses. A trap that resolves flips the
interface's `oper_status`, stamps `snmp_last_trap_at`/`snmp_last_ok_at`
on the device (visible as "last trap" on the SNMP card), and emits
`link.down`/`link.up` notifications on real transitions only.

**Traps handled:** `linkDown`, `linkUp`, `coldStart`/`warmStart` (clear
the last-error stamp, trigger a refresh poll when due, and a
`device.restarted` notification — once per device per ten minutes),
`authenticationFailure` (a `snmp.auth_failure` notification, debounced),
and the vendor notifications of the trap map (below). Any other
notification is stored and counted, never told.

## The trap log — what the device said, and when

Every trap the listener decodes is written to the trap log **before
anything else happens to it**: resolved to a device or not, a known
notification or not. "What did the switch say at 03:00?" is a question
the log answers:

- the device page's SNMP card lists **Recent traps** — the last 20 of the
  last 24 hours, each with its age, what it was and the event it was told
  as (or the maintenance window that kept it from paging);
- **`/snmp/traps`** (administrators; "All traps" on the card) lists every
  stored trap with filters for the device, the notification OID, the
  sender and the period, the counts per notification — an OID nothing
  maps is marked **Not mapped** — and the counts per sender, where a
  sender no device could be resolved for shows as **Not resolved**;
- the API is `GET /api/v1/snmp/traps?device_id=&oid=&source_ip=&since=&limit=`
  (a device's own traps are any reader's; the whole log is an
  administrator's).

The log is bounded twice. Each sender may store
`trap_store_per_minute` traps a minute (default 120); past that, the rest
of its traps that minute are counted in **one summary row** ("N more
traps not stored"), so a trap storm costs one row per sender per minute.
Rows older than `trap_retention_days` (default 30) are deleted by the
retention sweep. The trap log is not part of a backup — a bounded
operational log, like the topology snapshots. So that a storm is not
dropped before the listener reads it, its socket asks the kernel for a
4 MiB receive buffer; a host whose `net.core.rmem_max` is lower caps it,
and `netstat -su` counts what the kernel dropped ("receive buffer
errors").

**The trap map.** A vendor notification becomes a named event through
data, not code: `backend/app/data/trap_map.json` maps a notification OID
to an event and names the varbinds that carry its details. Each entry
names the MIB module its OID was read from:

| Vendor | Notifications | Event | MIB |
|---|---|---|---|
| Fortinet FortiGate | `fgTrapVpnTunDown`, `fgTrapVpnTunUp` | `vpn.tunnel_down`, `vpn.tunnel_up` | `FORTINET-FORTIGATE-MIB` |
| Palo Alto Networks | `panVPNTunnelStatusDownTrap`, `panVPNTunnelStatusUpTrap` | `vpn.tunnel_down`, `vpn.tunnel_up` | `PAN-TRAPS` |
| VMware vCenter | `vpxdAlarmInfo`, `vpxdAlarm` | `vcenter.alarm` | `VMWARE-VC-EVENT-MIB` |

A tunnel is named by its phase-1 name (FortiGate) or the log object
(Palo Alto); its down and its up are each told once per transition
("up again" only after a down). Check Point is not in the map: neither
`CHECKPOINT-MIB` nor `CHECKPOINT-TRAP-MIB` defines a VPN tunnel
notification — a gateway's tunnel alert goes out through its own alert
command with an OID the administrator chooses, which is stored and
counted under **Not mapped**.

**Maintenance windows cover traps.** A device inside an active window's
scope — at a site the window covers, or owning one of the window's
monitor targets (directly or through one of its addresses), or under an
"all" window — has its `link.*`, `device.restarted`, `vpn.*` and
`vcenter.alarm` events kept from paging: the port's state still changes,
the trap is stored with its event and the window, and nobody is woken.
`snmp.auth_failure` is never silenced — it is a security signal.

**Unmanaged senders:** a trap from an IP that has an `ip_addresses` row
but no SNMP-credentialed device lands in **Review → Unmanaged SNMP
senders** — LanCompass's version of "device auto-learn", pointed at a queue
for human triage instead of silently creating devices. Traps from
undocumented sources are only logged.

**Limits:** SNMPv1 and v2c only — v3 traps need the sender's engineID to
localize keys, which devices don't report, so v3 packets are dropped at
the security layer (the poll lane's v3 support is unaffected — outbound
auth knows the engineID after discovery). Malformed datagrams are dropped
with a debug log — a bad packet can never crash the worker. SNMP informs
are acknowledged by the receiver but processed like plain traps.

## Device health

Beside the full poll (its own interval, 60 minutes by default) a **light
health poll** runs every `snmp_health_interval_minutes` (default 5; 0 =
off) over every SNMP-enabled device. It reads only:

- `sysUpTime` and, on every port, `ifInErrors`, `ifOutErrors`,
  `ifInDiscards`, `ifOutDiscards` and `ifCounterDiscontinuityTime`
  (IF-MIB, RFC 2863);
- the vendor's own rows, chosen by the `sysObjectID` the full poll stores:
  - **Check Point** (enterprise 2620, CHECKPOINT-MIB): `tunnelTable` —
    the row index is the peer's address, the name `tunnelPeerObjName`,
    the state `tunnelState` (active = up; destroy, idle, phase1, down =
    down; anything else unknown) — and `procUsage` for CPU, `fwNumConn`
    against `fwConnTableLimit` for sessions (a limit of 0 means no fixed
    table: no percentage);
  - **FortiGate** (12356, FORTINET-FORTIGATE-MIB): `fgVpnTunTable` — the
    name `fgVpnTunEntPhase1Name` (with the phase 2 name when one tunnel has
    several), the peer `fgVpnTunEntRemGwyIp`, the state
    `fgVpnTunEntStatus` (down/up) — and `fgSysCpuUsage`, `fgSysSesCount`
    (FortiGate publishes no session limit there: the count is shown, no
    percentage);
  - **Palo Alto** (25461, PAN-COMMON-MIB): `panSessionActive` against
    `panSessionMax`; **no tunnel table** is read — PAN-COMMON-MIB documents
    none, so a Palo Alto tunnel's state comes only from its traps
    (`panVPNTunnelStatusDownTrap`/`UpTrap`, [the trap log](#the-trap-log-what-the-device-said-and-when));
  - **any other device**: CPU as `hrProcessorLoad` (HOST-RESOURCES-MIB)
    averaged over its processors.

It never walks the port, bridge or neighbour tables (the full poll does),
never writes to a device, and stores **no series**: each port keeps one
set of counters, each device one health document, each tunnel one row.

What it tells (once each, to every channel that takes the event):

| Event | When |
|---|---|
| `interface.errors` | a port's errors + discards since the last poll reach `interface_error_threshold` per 5 minutes (scaled to the real gap) — "{device} {port}: {errors} errors, {discards} discards in {minutes} min" |
| `interface.errors_cleared` | two polls in a row under it — "{device} {port}: errors stopped" |
| `vpn.tunnel_down` / `vpn.tunnel_up` | a polled tunnel changes to down, and back up after a told down — the trap's own events and words; a drop a trap already told is not told again |
| `device.cpu_high` / `device.sessions_high` | CPU at `device_cpu_threshold_pct`, or sessions at `device_sessions_threshold_pct` of the limit, on two polls in a row |
| `device.health_ok` | both back under their thresholds |
| `snmp.unreachable` / `snmp.reachable` | `snmp_unreachable_after` failed polls in a row, then the next answer; meanwhile the device's ports show their age as stale |

A reboot (`sysUpTime` went backwards) or a counter reset the agent
announces (`ifCounterDiscontinuityTime` changed) re-bases the counters and
tells nothing; a 32-bit counter that wrapped counts its real increase.

Where it shows: the device page's **Health** card (CPU and sessions with
how old each value is, the ports taking errors, the tunnels with their
state and since when, a device that stopped answering) — nothing for a
value never read; the Monitoring page's **SNMP on time** line (the full
poll's backlog against its interval and the health poll's last pass); and
`/metrics` (`lancompass_tunnels{state}`, `lancompass_interfaces_flagged`).
A tunnel the firewall stopped reporting is forgotten after
`tunnel_forget_days`.

## Watched ports — traffic for the uplinks that matter

The health poll can tell you a port is up and taking errors now, but not
how full an uplink was during last night's slowdown. For that, **mark the
ports that matter as watched**: LanCompass then keeps their traffic and
errors, and only theirs. Keeping every interface's traffic is refused on
purpose — at a large estate it would be tens of gigabytes; 500 watched
uplinks and trunks keep about 0.65 GB.

**Marking.** On a device's *Ports & cables* tab, each port has a **Watch**
toggle (an eye, beside edit and delete; it needs `data:write` and writes a
changelog row). **Watch uplinks** on the same tab lists the ports that look
like uplinks — an LLDP or CDP neighbour that is a switch, or more than one
egress VLAN (a trunk) — and marks them only after you confirm the list.
At most `if_watch_cap` ports (default 500) can be watched in the whole
install; marking past it is refused with the count. `if_watch_cap` 0 turns
watched ports off: nothing is asked or kept.

**What is read.** On each health poll, for the watched ports only:
`ifHCInOctets` and `ifHCOutOctets` (RFC 2863's 64-bit counters). A port
whose agent has no 64-bit counters is read from the 32-bit `ifInOctets` /
`ifOutOctets` only when it runs at 20 Mb/s or less (a faster 32-bit counter
can wrap unseen between polls); a faster one keeps its errors and no
traffic. Each sample has the traffic in and out (bits per second), the
errors and discards since the last poll, and the utilisation against the
port's observed speed. A sample across a reboot (`sysUpTime` went back) or
a counter reset (`ifCounterDiscontinuityTime` changed) is never written:
a reboot never draws a spike.

**What is kept, and for how long.**

| Series | Resolution | Kept | Setting |
|---|---|---|---|
| Raw samples | every health poll (5 minutes by default) | 48 hours | `if_raw_hours` — whole UTC days are dropped once they are older |
| Hourly rows | the average and the highest of each hour | 400 days | `if_hour_days` — whole months are dropped |
| Daily rows | the average and the highest of each day | 3 years | `if_day_years` — deleted by day |

The worker rolls the previous hour up every hour and the previous day once
a day (a missed hour is rolled up late, once). Above
`if_storage_ceiling_mb` (default 1024 MB) the pass stops writing samples
and tells `storage.ceiling` once — "Watched-port history is using … MB of
its … MB — sampling paused" — until the tables are back under it.

**Where it shows.** A watched port's tile carries a 24-hour sparkline (the
highest use per half hour); clicking it opens the **Traffic** drawer: a day
of 5-minute samples, a week of hourly rows, a year of daily rows — in and
out, errors, the highest use against the port's speed — and every chart
says its resolution and how old its newest point is. Dashboards get the
**Watched ports** widget (the busiest watched ports with their sparklines)
and the `if_util_pct` series (the watched ports' highest use per hour or
per day); `/metrics` has `lancompass_watched_ports`,
`lancompass_watched_ports_cap` and `lancompass_if_storage_bytes`.

A watched port at `if_util_threshold_pct` (default 85 %) of its speed on
three samples in a row tells `interface.util_high` — "{device} {port} at
{pct}% of {speed} for {minutes} min" — once, and `interface.util_cleared`
— "{device} {port} back to {pct}%" — after three samples under it.

**What is not kept.** Any port you did not mark; firewall CPU and session
history (the Health card keeps current values only); flows, billing
percentiles and forecasts. A backup carries the hourly and daily rows and
which ports are watched, not the 48 hours of raw samples (rebuilt by
sampling). Unwatching a port keeps its history until it ages out.

## Vendor notes

- **Per-VLAN bridge tables (Cisco and friends):** these devices keep one
  FDB per VLAN, reachable via *community indexing* — poll with community
  `public@vlan-id` (e.g. `public@10`). The poller tries the plain
  community first, then walks `community@1`…`community@N` for the VLANs
  the device reports. Store the plain community; VLAN expansion is
  automatic.
- **Q-BRIDGE (`dot1qTpFdbPort`):** devices that expose the Q-BRIDGE table
  directly don't need community indexing — the poller walks it in the
  same pass.
- **v1-only gear:** works, but `ifHighSpeed` doesn't exist on v1 — speed
  falls back to `ifSpeed`, which saturates at ~4 Gbps.
- **v3 authPriv:** SHA auth + AES privacy are supported (plus MD5/DES for
  legacy gear). Passwords must be at least 8 characters on most agents.
  Agents that scope data behind a non-default context (e.g. snmpsim,
  some appliances) need the credential's optional `context` field —
  empty means the default context.
- **Firewalls:** the poller needs UDP 161 (or your `snmp_port`) from the
  worker container to the device — same reachability as the scanner.

## Troubleshooting

- *Test shows nothing*: check community string, UDP/161 reachability, and
  that the device ACL allows the worker's IP. `snmp_last_error` on the
  card shows the last failure (credentials are never included).
- *Interfaces appear but no links*: the IPs must already have
  `mac_address` set (from ARP scans or manual entry) — the bridge table
  keys on MAC, not IP.
- *Port names doubled*: if a manual port's name doesn't match what the
  device reports (e.g. `Gi1/0/1` vs `GigabitEthernet1/0/1`), the poller
  creates a second `snmp` port rather than renaming yours. Delete or
  rename the manual one to merge.
