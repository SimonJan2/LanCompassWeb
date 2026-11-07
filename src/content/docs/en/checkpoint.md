---
title: "Check Point"
description: "Prepare a Check Point management server as a read-only source — Web API, least-privilege credentials, and what gets imported."
category: "integrations"
version: "0.7.0"
order: 43
---

# Check Point

Check Point is the management-server play: the SmartCenter (or MDS domain)
holds the object database — gateways, networks, host objects, VPN
communities — and the ICA certificate registry, while each gateway holds
the *runtime* state (ARP table, DHCP leases, live VPN tunnels). The
connector reads all of it: the management-side inventory (gateway devices,
network objects as subnets, host objects as addresses, community
topology), the per-gateway runtime tables — and the certificate register
with real expiry dates — see *Runtime tables* below.

Check Point's Web API is **RPC-over-POST** — even reads are POSTs to
`/web_api/<command>`. The connector stays read-only *structurally*: the only
commands it can ever issue are `login`, `logout`, the `show-*` reads, and
the `run-script`/`show-task` pair that serves the runtime hop. That list is
enforced in code — no `set-`, `add-`, `delete-`, `publish`, or
`install-policy` exists for it to call.

## Read-only role

*Checked against Check Point R82 and R81.20 (the lab's simulator; R82.10 once Check Point names it a recommended release).*

1. SmartConsole → *Manage & Settings* → *Permissions & Administrators* → *Permission Profiles* → *New* → *Customized*.
2. Object access: *Read* in every category, no *Write*; under *Management* enable **Management API Login**.
3. Only if you want the gateways' runtime tables (ARP, DHCP, VPN tunnels, the ICA registry): *Others* → **Run One Time Script**. Know what it means: the right runs scripts at expert level on every gateway — LanCompass sends five fixed read commands, but a leaked credential with it is a root shell. New sources leave the runtime tables off.
4. *Administrators* → *New* → `lancompass-reader`, authentication *Check Point Password* (or an API key), assign the profile, then *Publish*.
5. On a Multi-Domain server, set the source's domain.

**What LanCompass reads:** `show-*` commands of the management API (hosts, networks, gateways, VPN communities, and — once a day if ticked — the access and NAT rulebases), in a session opened `read-only`; with the runtime tables, five fixed `run-script` reads.

## Before you start

- **A management server** — SmartCenter (single domain) or an MDS domain.
  The Web API runs on the management, not on the gateways. R80.10 or later;
  R81.x recommended.
- **Network reach** — the LanCompass host must reach the management server on
  TCP/443 (or your custom `web api` port).
- **TLS** — Gaia ships a self-signed certificate. Plan to leave
  *verify TLS* off in the source, or install a CA-signed certificate on the
  management portal.
- **About 15 minutes** in SmartConsole + Gaia.

## Step 1 — Enable the Management API

The Web API is off until you switch it on and say who may call it.

**Via the Gaia portal** (easiest):

1. Browse to `https://<mgmt>` → log in → **Manage & Settings →
   Blades → Management API** (on some releases: **Network Management →
   Management API**).
2. Check **Enable web API**.
3. Set **Access permissions**: prefer **"Only the following IP addresses"**
   and list the LanCompass host. `All IP addresses` works but widens the
   attack surface — the least-privilege answer is a host ACL here *and* a
   read-only user in step 2.
4. Save.

**Via the CLI** (expert mode on the management):

```bash
api status                 # is it running? which port?
mgmt_cli set web-api-config enable true   # or via clish: set web api enabled true
```

Check the port: `api status` prints it (default **443**). On MDS, run this
per domain (`mdsenv <domain>`) — the API is per-domain.

Verify it answers:

```bash
curl -sk https://<mgmt>/web_api/login -H 'Content-Type: application/json' -d '{}'
# → {"message":"Missing header: [X-chkp-sid] or authentication"...} — the
# API is alive; auth is exercised in step 3.
```

## Step 2 — Create a read-only administrator

Never give an integration your own admin. Build a purpose user with a
customized profile that can read objects and sign in to the API — and run
scripts only if you want the runtime tables:

1. SmartConsole → **Manage & Settings → Permissions & Administrators →
   Permission Profiles → New → Customized**.
2. Object access: **Read** for every category, **Write** for none. Under
   *Management* enable **Management API Login**. The profile must NOT
   include "Manage Sessions" write rights or policy install.
3. **Runtime tables only:** under *Others* tick **Run One Time Script**.
   Know what it means: `run-script` runs at expert level on every gateway.
   LanCompass sends only its fixed read commands, but a leaked credential
   with this right is a root shell on the gateways — leave it out unless
   you turn the runtime tables on (they are off for a new source).
4. **Administrators → New Administrator**:
   - name e.g. `lancompass-reader`
   - authentication: **Check Point password** (or your RADIUS/AD account —
     whichever the management authenticates) — or, on R80.40 and later,
     an **API key** (the administrator's *API Key* authentication; copy the
     key when it is shown)
   - permission profile: the customized profile from step 1
   - on MDS: create it inside the **domain** you intend to sync.
5. Save — and **Publish** (permission changes are objects too; an
   unpublished admin can't log in).

LanCompass signs in with `read-only: true`: the management server itself
refuses any change in that session, whatever the profile allows.

## Step 3 — Prove reachability by hand (optional but useful)

A 60-second sanity check before touching LanCompass:

```bash
# 1. Login → session token (sid), read-only as LanCompass signs in
curl -sk https://<mgmt>/web_api/login \
  -H 'Content-Type: application/json' \
  -d '{"user":"lancompass-reader","password":"<pw>","read-only":true}'
# → {"sid":"<token>","uid":"..."}    a 401 here = credentials or profile

# 2. A read call with the sid
curl -sk https://<mgmt>/web_api/show-gateways-and-servers \
  -H 'Content-Type: application/json' -H 'X-chkp-sid: <token>' \
  -d '{"limit":5}'
# → {"objects":[...]} — you're ready.
```

On MDS add `"domain":"<domain name>"` to the login body. Note the `sid`
expires (default idle timeout ~10 minutes) — the connector logs in fresh
each sync, so nothing to manage.

## Step 4 — Add the source in LanCompass

Settings → **Integrations** → **New source**:

| Field            | Value                                              |
| ---------------- | -------------------------------------------------- |
| Kind             | `Check Point`                                       |
| Name             | e.g. `HQ Check Point`                              |
| Base URL         | `https://<mgmt>` — the *management* server, no path |
| Credentials      | user / password from step 2 — or tick **Sign in with an API key** and paste the key |
| MDS domain       | multi-domain only — the domain the login scopes to; empty on a single SmartCenter |
| Gateway runtime tables | **off** for a new source — per-gateway runtime reads via the allowlisted `run-script`; turn it on only after the profile has **Run One Time Script** (step 2) |
| Read-write session for the runtime tables | **off** — only for a server that refuses scripts in a read-only session (below) |
| Runtime targets  | optional comma-separated gateway names — empty polls every gateway the management knows |
| DHCP leases      | **off** — also read Gaia DHCP leases; only for gateways that run the Gaia DHCP server (uncommon) |
| VPN tunnels      | **on** — community topology (management) + `vpn tu tlist` per gateway; peer IPs become `vpn-peer` address rows |
| Certificate registry | **on** — `cpca_client lscert` on the management server; every ICA-issued cert (SIC + IKE/VPN) lands on the Certificates page with its expiry |
| Read the access and NAT rules (daily) | **off** — tick it to show the rules that touch each subnet on its page (below) |
| Verify TLS       | **off** if the Gaia cert is self-signed             |
| Site / VRF       | the default landing zone for imported objects       |
| Sync every       | 0 = manual; or e.g. 60 min                          |

**On MDS (multi-domain):** set the *MDS domain* field to the domain the
login should scope to — the connector then logs into that domain's
published database. (The scope is also PATCHable:
`{"scope": {"domain": "<domain name>"}}`.)

Then the usual loop: **Test & discover** → tick the scope → **Preview** the
diff → **Apply** the ticked rows → optionally schedule.

## Runtime tables

The second hop: after the management pull, the connector asks each gateway
for its live tables through the Management API's `run-script` — the one
exec-shaped call in the family, fenced twice:

- The command allowlist admits `run-script`/`show-task` beside the
  `show-*` reads — nothing else.
- The `script`/`script-name` pair is a *second* allowlist: only these
  exact script bodies, under their fixed task labels, can ever run —

| Purpose      | `script`                          | Target | Runs when                          |
| ------------ | -------------------------------------- | ------ | ---------------------------------- |
| ARP table    | `clish -c "show arp dynamic all"`      | each gateway and cluster member | always (while the runtime hop is on) |
| DHCP leases  | `clish -c "show dhcp server leases"`   | each gateway and cluster member | only with *DHCP leases* ticked       |
| VPN tunnels  | `vpn tu tlist`                          | each gateway and cluster member | while *VPN tunnels* is ticked (default) |
| Cert registry | `cpca_client lscert`                  | the management server (`CpmiHostCkp`) once | while *Certificate registry* is ticked (default) |

Scripts go to the machines that can run them: the simple gateways and the
cluster members — never a cluster object, which is not a machine.

**The runtime hop is off for a new source.** It needs the expert-level
**Run One Time Script** right on every gateway (step 2), so a new Check
Point source brings objects, gateways and VPN communities but no ARP,
DHCP, tunnels or ICA certificates until you turn it on. A source you
added before this release keeps the setting it had.

**The read-only session.** Every read runs in one session opened with
`read-only: true`, named *LanCompass (read-only)*, with a 600-second idle
timeout, and closed when the read ends. A server that refuses
`run-script` in a read-only session answers the first script with 403:
the runtime hop is then skipped, with one note on the sync naming both
ways out — give the account **Run One Time Script**, or tick **Open a
read-write session for the runtime tables**. With that tick the connector
opens a second session, not read-only, for `run-script` and `show-task`
only, and closes it when the scripts are done; every other read stays in
the read-only session.

All four are read commands — Gaia `show`/`vpn tu` output and the ICA
registry dump. Nothing operator-supplied can reach `script` or
`script-name`: the connector maps a fixed purpose key
to the declared pair, so a scope field, an object name, or an error message can never
become a script. Read-only is enforced by code, not by care.

`cpca_client lscert` answers on the management — that's where the
internal CA's registry lives (every issued SIC trust cert and IKE/VPN
cert, with `Not_After` expiry). Each cert row lands in **Certificates**
with the CN as the server name and the kind+serial as the cert name; a
cert whose CN names a discovered gateway links to that device.

A certificate the sync creates is the source's: later syncs refresh its
expiry. A certificate you entered or edited by hand — a renewed gateway
certificate whose new date you typed — keeps your date: when the
management still reports the old one, the plan review shows a conflict
with both dates, and the source's date is written only if you choose
**Take it** (see [Who owns a value](/docs/integrations/)).

The hop is **fail-soft per gateway**: one gateway timing out or erroring
lands as a note on the sync (`gw-2: run-script timeout`), never a failed
pull — a dead gateway can't starve the others. Results are task-polled
(`show-task` at `details-level: full`, bounded rounds, output base64) and row-capped like every other section.

The scope keys, for API-driven setups: `runtime` (bool — the master
switch; `false` for a source created now, and a source stored without the
key keeps running the hop), `runtime_rw_session` (bool, default `false` —
the runtime hop's own read-write session), `gateways` (list of names —
explicit targeting, max 64), `dhcp` (bool, default `false`), `tunnels`
(bool, default `true` — community topology plus the per-gateway tunnel
table), `certs` (bool, default `true` — the ICA registry dump on the
management server), `policy` (bool, default `false` — the daily rules
read below), `domain` (MDS login domain).

## Rules that touch a subnet

The firewall team's first question about a subnet — which rules touch
it — is answered on the subnet's own page. With **Read the access and
NAT rules (daily)** ticked on the source, LanCompass reads the
management server's policy once a day, in the same read-only session:

- every policy package's access layers (`show-access-rulebase`) and its
  NAT rulebase (`show-nat-rulebase`), paged, at `details-level standard`
  with the object dictionary;
- the objects the rules name (`show-networks`, `show-hosts`,
  `show-address-ranges`, `show-groups`, `show-gateways-and-servers`), so
  every group is expanded — nested groups too — and every object becomes
  its addresses: a network its range, an address range its first and last
  address, a host or gateway its address. A cell that says **Any** (or is
  negated) is counted, not listed.

Only `show-*` commands are added; the rulebase is never written (there is
nothing in the connector that could). The rules land in a read-only table
that each read replaces — there is no history — and that goes with the
source when you delete it.

**The cadence.** Rules are the heaviest reads on a management server, so
they never run on the source's sync schedule: Settings → **Integrations**
→ **Read firewall rules every (minutes)** — 1440 (daily) by default, 0
never (boot default `POLICY_SYNC_MINUTES`). Only sources with the tick
are read.

**The panel.** A subnet's page shows **Rules that touch 10.20.1.0/24**
after its Documentation panel: per firewall, each rule's number and
name, its layer (or NAT package), its action, which side names the subnet
(source, destination, or NAT's original and translated source and
destination), the object (a group's member as `group / member`, with its
addresses), and when the rules were read; below it, how many more rules
use **Any**. An address's drawer shows the same for the one address. Any
signed-in reader sees it (`data:read`); the connector's settings stay with
the administrators. Threat prevention, HTTPS inspection and application
control layers, and hit counts, are not read.

## What it imports

| Check Point data                                 | LanCompass object                     |
| ------------------------------------------------ | ---------------------------------- |
| Gateways & servers (`show-gateways-and-servers`) | Devices (`source=integration`) — simple gateways and cluster members as *firewall* (a member names its cluster), the cluster as *firewall-cluster*, the management server (`CpmiHostCkp`) as *firewall-management*; any other type a *firewall* with its type kept |
| Gateway `ipv4-address` fields                     | Addresses — documented in the policy (`active`, never marked as seen) |
| `show-networks` objects (`subnet4` + mask)       | Subnets (prefixes)                 |
| `show-hosts` objects (`ipv4-address`)            | Addresses — documented in the policy: created `active`, with no *last seen* and no observed value; the object's name fills an empty host name only, and an address the network showed (ARP) keeps what it showed |
| Per-gateway ARP (`run-script`, runtime hop)      | Addresses (`arp` client rows)      |
| Per-gateway DHCP leases (`run-script`, opt-in)   | Addresses (`lease` client rows)    |
| `vpn tu tlist` per gateway                        | Addresses (`vpn-peer` rows) + tunnel detail in sync provenance |
| VPN communities (star/meshed `show-*`)           | Sync provenance — the tunnel topology (who peers with whom) |
| `cpca_client lscert` on the management           | Certificate register rows — SIC/IKE certs with real expiry |
| Access and NAT rulebases (opt-in, daily)          | The rules panel on a subnet's page and an address's drawer |

Every object is read — up to 50,000 per kind, paged to the answer's
total; a source that holds more says so on the sync.

The VPN surface — communities plus the last sync's per-gateway tunnel peers — gets its own page at `/vpn`: not in the menu; it opens from the lock icon on a Check Point source row in Settings → Integrations.

Dashboard widgets cover the same surface — the add-widget wizard's **Check Point** goal bundles sync health, the gateway roster, tunnel peers (stat, bars, trend), communities and certificate-expiry charts, all fed by the sync provenance and the certificate register.

One read stays **deferred to a follow-up**: per-gateway interface tables
(VLANs + interface subnets). The management inventory plus the runtime
tables above are already the bulk of what the firewall knows about your
addressing.

## The honest caveats

- **Published state only.** The API sees the last-published database.
  Objects an admin edited but didn't publish won't appear in a sync — and
  nothing in LanCompass can publish them (read-only by design).
- **Two-hop latency.** Reading ARP from 40 gateways means 40 `run-script`
  calls; on a big estate keep `sync_minutes` ≥ 15 rather than per-minute.
- **Sessions are finite.** Each sync opens one read-only session (and the
  runtime hop's read-write one only when ticked) and logs out when it
  ends — but don't script parallel pulls against the same account.
- **Permissions drift.** If objects silently stop appearing, someone
  narrowed the profile — re-check step 2.

## Troubleshooting

| Symptom                                   | Likely cause → fix                                   |
| ----------------------------------------- | ---------------------------------------------------- |
| Test → `unreachable`                      | Management API off (step 1), or the ACL doesn't allow the LanCompass host |
| Test → `authentication failed`            | Wrong user/password, or the admin wasn't **published**, or wrong domain (MDS) |
| TLS verify error                          | Self-signed Gaia cert → set *Verify TLS* off          |
| Test OK but zero objects                  | Objects exist only as unpublished changes; or profile has no read rights |
| A gateway's ARP rows are missing          | `run-script` reported a per-gateway note on the sync (timeout, or `show arp` unsupported on that Gaia build) — check the gateway's Gaia version/API access; the rest of the pull still landed |
| Everything stale after a policy push      | Normal — syncs see published state; wait for the next sync or run Apply |

## Security notes

- Credentials live encrypted in `cred_enc` (AES-256-GCM); the API returns
  `cred_set` only, never the secret.
- The source is LAN-side by design — LanCompass calls out to the controller,
  nothing calls in. Keep the management API ACL tight regardless.
- `integration`-sourced rows sit mid-precedence: above scan/SNMP
  observations, below manual/import-owned data. Conflicts are reported in
  the preview and as `N conflicts skipped` on the source — never applied
  silently.

## What each message means

| Message | What it means → what to do |
|---|---|
| *login: authentication failed (401)* | the user, password or API key is wrong → enter them again |
| *… authentication failed (403)* | the profile lacks *Management API Login* or the command's read → tick it, *Publish* |
| *runtime script … is not allowlisted* | a script outside LanCompass's five fixed reads was asked for → nothing ran; report it |
| *tls: …'s certificate … is not the pinned one* | the management server's certificate changed → compare its fingerprint in SmartConsole, then *Trust this certificate* in *Test* |
| *…: request timed out* | the management server does not answer on 443 from LanCompass → check the route and the gateway's policy |
