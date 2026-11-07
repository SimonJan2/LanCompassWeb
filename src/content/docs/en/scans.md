---
title: "Scans"
description: "LAN scanning — pipeline, schedules, exclusions, and live progress."
category: "operations"
version: "0.7.0"
order: 37
---

# Scans

The scanner container runs Scapy with raw sockets (`network_mode: host`,
`NET_ADMIN`/`NET_RAW`, Linux only) and reconciles what it finds against your
documentation.

## The pipeline

Each target CIDR goes through five stages:

1. **Neighbor discovery** — ARP on IPv4 targets, NDP (ICMPv6 neighbor solicitation) on IPv6 — L2 discovery on the local segment. On-link ranges only (see *Scanning routed networks* below).
2. **ICMP sweep** — ping-socket for hosts silent at L2 (ICMPv6 echo on IPv6 targets), paced at `scan_rate_pps`; routed ranges get one late-reply pass.
3. **TCP probe** — connection attempts on the configured port list
   (default `22,80,443,445,8080`) for hosts silent on L2+L3 — or, with
   `scan_tcp_discovery: silent`, for every silent address of a routed range.
4. **PTR lookups** — reverse-DNS hostnames.
5. **OUI resolution** — vendor from the bundled 58k-entry IEEE database.

Per host it persists `open_ports` and a best-effort `device_type`.

## Running a scan

- **Quick scan** — the header button (needs *data:write*). Enter a CIDR and
  watch live progress.
- **Scans page** — full history: status (`queued → running →
  completed/failed/cancelled`), progress bar with ETA, per-CIDR rate limit
  (`scan_min_interval_seconds`), cancel button, and a live SSE stream of
  found-host deltas as chunks complete.
- **Scheduled** — `scan_interval_minutes` > 0 runs recurring scans of the
  configured networks from the worker.
- **One subnet** — a subnet page's **Reconcile** tab has **Scan this subnet
  now**, under the same policy; the tab lists what the scan found next to
  what is documented, and nothing changes until a person decides
  ([Reconcile](/docs/subnets/)).

## Targeting policy

| Setting | Effect |
|---|---|
| `scan_networks` | CIDRs the scanner may touch (empty = auto-detect local LAN) |
| `scan_exclude_networks` | Never scanned — wins in both directions over any target |
| `scan_only_configured` | Refuse targets outside `scan_networks` |
| `scan_max_hosts` | Refuse targets above this usable-host count |
| `scan_v6_min_prefixlen` | Refuse IPv6 targets broader than this prefixlen — a /64 can't be scanned honestly (default 120) |
| `scan_interface` | Pin a specific interface (empty = default route) |

Exclusions are enforced identically by the API route, the scheduler, and the
worker — a job that slips through one layer is stopped by the next.

## Scanning routed networks

Before a quick scan sends anything, the scanner asks the kernel how it
reaches the range (`ip route get` on the first usable address). A range
behind a gateway (the route has a `via`) is **routed**; a range on a local
interface is **on-link**. When the lookup fails, the scan runs as it did
before and says so (`route_unknown`).

What each method can see:

| Method | On-link range | Routed range |
|---|---|---|
| ARP / NDP | Every powered-on host, even behind a host firewall | Nothing — ARP does not cross a router, so it is not sent |
| Ping (ICMP echo) | Hosts that answer ping | Hosts that answer ping **and** whose replies the network lets back |
| Late-reply pass | Not used — ARP already answered | Addresses still silent get one more echo and a longer wait |
| TCP discovery | Only when nothing else answered | Only when nothing answered, or every silent address (`silent` mode) |

A refused connection (TCP RST) proves the address is reachable with the
port closed. It is counted as "reachable, port closed" and never marks a
host as found.

### The three settings

All three are in **Settings → Scanning → Advanced** (needs *system:admin*):

| Setting | Default | Effect |
|---|---|---|
| `scan_rate_pps` | `500` | Echo requests and TCP connections per second (10–5000). The ping wait starts after the last echo; 500 per second adds about 0.5 s to a /24. |
| `scan_retry_timeout` | `5.0` s | Routed ranges only: the late-reply pass. `0` turns it off. |
| `scan_tcp_discovery` | `fallback` | `fallback`: TCP only when nothing answered. `silent`: on routed ranges, probe every address still silent after ping. |

`scan_icmp_timeout` (1.0 s) and `scan_tcp_timeout` (0.6 s) keep their
defaults, so an on-link scan finds the same hosts as before.

### Reading the diagnostics

On the **Scans** page every finished quick scan has a **How hosts were
found** panel (the stethoscope button; it opens by itself when a completed
scan found 0 hosts). It shows the route, the ARP / ping / late / TCP
counts, and any warning with its next step:

| Warning | Meaning | Next step |
|---|---|---|
| `icmp_unavailable` | The scanner could not open an ICMP socket (the OS error is shown) | Give the scanner `NET_RAW`, or allow ping sockets (`net.ipv4.ping_group_range`) |
| `route_unknown` | The route lookup failed; the scan ran as before | Check that the scanner host has a route to the range |
| `routed_all_silent` | A routed range gave 0 answers to N probes | Ask the network team (below), or try `silent` TCP discovery |
| `late_replies` | The late pass found hosts; the warning names the ICMP timeout that would have caught them | Keep the pass on, or raise `scan_icmp_timeout` to that value |
| `refused_only` | Only refused connections (RSTs) came back | Add a port those hosts listen on, or ask for ICMP |

Scans that ran before this version have no diagnostics.

### What to ask the network team

- Let the **scanner's source address** through to the range — it is the
  `src` on the panel's route line.
- Allow **ICMP echo request and reply**, plus the **scan ports**
  (`scan_tcp_ports`, default `22,80,443,445,8080`).
- **Exempt that address from sweep detection.** A firewall that delays or
  rate-limits ping sweeps shows up as `late_replies`; once the exemption is
  in place, the late count should drop to 0.

## When a scan finds nothing

The **scan troubleshooter** runs, from the scanner host, the checks an
engineer would otherwise run by hand, and ends with a verdict, its evidence
and the fix. Open it from **Scans → Troubleshoot a network**, or with the
wrench button on a scan that found 0 hosts or raised a warning (the CIDR
and the scan are filled in). Starting it needs `data:write`; it is refused
while another troubleshooter run, or a scan of an overlapping network, is
running, and the network must pass the same targeting policy as a scan.

It sends only what a quick scan sends — one ARP to the next hop, ICMP
echo, and TCP connects to the scan ports — only to addresses inside the
network, never inside an excluded network, and never more than twice the
network's usable addresses plus 64 packets. It never changes a setting by
itself.

### The checks

They run in this order; each shows its status (passed, warning, failed,
skipped) and its evidence as it finishes:

| Check | What it looks at |
|---|---|
| Scan policy | The scan's own result and error, excluded networks, only-configured networks, and `scan_max_hosts` |
| Scanner sockets | Whether the scanner can open an ICMP socket (raw or ping socket), and an `AF_PACKET` socket for ARP |
| Route | The route to the network (as in the diagnostics panel), and any local interface or Docker bridge that overlaps it |
| Next hop | Routed networks only: one ARP to the gateway the route goes through |
| Sample probes | Up to 8 addresses — the prefix's gateway, then IPAM addresses that were seen or are active/reserved, then the first and last usable address. Each gets one ping (10 s wait, round-trip time shown) and one TCP connect per scan port (5 s wait: open, refused or no answer) |
| Paced sweep | Only when a sample answered a single ping: one sweep of the whole network at `scan_rate_pps`, waiting 10 s. For each answering sample it shows whether the reply came in time for the scan, late, or not at all |

### The verdicts

The first verdict that matches, in this order, wins:

| Verdict | What it means | The fix |
|---|---|---|
| Policy | The scan settings refuse the target; nothing is sent | Change the target or the policy |
| No ICMP socket | The scanner can't open any ICMP socket | Give the scanner `NET_RAW`, or allow ping sockets (`net.ipv4.ping_group_range`) |
| Route conflict | The network overlaps a Docker bridge or another local interface, or the route leaves through an interface other than `scan_interface` | Move the overlapping network, or fix `scan_interface` |
| Next hop down | The gateway on the route did not answer ARP | Check the gateway and the scanner host's route |
| Path blocked | No sample answered ping or TCP, and none sent a TCP reset | Send the network request (below) |
| ICMP filtered | Samples answer TCP (open or reset) but not ping | Switch TCP discovery to `silent`, and ask for ICMP echo |
| Burst delayed | A single ping is answered fast, but during the sweep the reply comes after the scan stopped waiting | Raise `scan_retry_timeout` (routed) or `scan_icmp_timeout` (on-link) to the proposed value; ask for the exemption |
| Burst dropped | A single ping is answered, but not during the sweep | Lower `scan_rate_pps`; ask for the exemption |
| Healthy | The sweep's replies arrive in time | Nothing to fix — scan again |

A proposed settings change is shown as a preview (now → proposed). Only an
administrator (`system:admin`) sees **Apply**, which saves it through
**Settings → Scanning**'s own API; everyone else sees the list. The last
step, **Rescan**, starts a normal scan of the network.

### Using the network request

For a path, ICMP or sweep verdict, the **Fix** step has a request for the
network team, ready to copy in English or Hebrew. It names the scanner's
source address (the route's `src`), the network, ICMP echo plus the scan
ports, and asks for an exemption from ping-sweep and port-scan detection.
LanCompass never sends it anywhere: copy it into your ticket or email. After
the change, run the troubleshooter again — the verdict should move to
**Healthy**.

The last 200 runs are kept. A support bundle carries the last 10 as
`scan_diagnoses.json`: verdicts, check statuses, timings, counts and the
setting names recommended — no addresses, networks or request text.

## Runtime-tunable

Everything above — plus timeouts, concurrency, and TCP ports — is editable
live in **Settings → Scanning**. Changes persist in the `app_settings` table,
fall back to `.env` defaults, and reach the worker within a minute. No
restart needed.

## Reconciliation

**A scan never edits documented fields or status.** On an address a person
documented (manual, import, request), it writes only what it observed — the
observed MAC, vendor, type and hostname, last seen, open ports and the
**presence** (answering / not answering). Only rows the scan created
(source `scan`, or `passive` from passive discovery) get their MAC, vendor,
hostname and type refreshed as before, and only they go `offline` when they
stop answering. Every difference waits in [Review](/docs/review/) → **Address
drift** for a person; see [IP Addresses](/docs/addresses/).

The settings keep their names: `scan_marks_offline` and
`scan_reactivates_offline` drive the presence (and the status of scan-owned
rows), `scan_stored_mac_wins` and `scan_overwrites_hostname` apply to
scan-owned rows (a documented row's MAC and hostname always win).

Scanning a **container** (or any covering prefix) reaches the addresses its
subnets hold — rows are matched by VRF and address, never duplicated — and a
new host is filed in the deepest subnet that holds it. A scan of a network
no subnet covers files nothing: it completes and proposes the subnet (*No
subnet covers … — N hosts answered*, with **Document this subnet**) — see
[Discovery](/docs/discovery/#confirming). A failed scan stores a one-line
reason with its key (`address_conflict: …`, `too_many_hosts: …`); the raw
error stays in the worker's log. ARP leaves on the interface the kernel
routes the range through (named in the diagnostics), not the default
route's, unless *scan_interface* pins one.

Reconcile also rolls up to the device: after the per-address merge, every
device that owns a touched address gets `scan_last_seen_at` restamped to
the freshest `last_seen` across **all** its linked IPs — including
addresses outside the scanned range. The stamp shows on the device list
("Last seen" column) and detail page ("last seen by scan"), and a device
whose whole linked-IP set is `offline` or not answering by scan miss lands
as one row in [Review](/docs/review/) → **Offline devices**; its health is
offline wherever health shows.
