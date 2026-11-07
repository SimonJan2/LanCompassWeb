---
title: "Discovery Inbox"
description: "Newly found hosts from scans, and deep discovery profiles that stay off until an admin enables them."
category: "operations"
version: "0.7.0"
order: 36
---

# Discovery Inbox

The reconciliation queue. When a [scan](/docs/scans/) finds a host that isn't
documented — or contradicts what is — it lands here instead of silently
mutating your data.

## Monday morning

**Discovery — what waits for a decision** is one queue for everything the
week left. Its strip counts **To decide**, **Groups**, **Decided this week**,
**Gone** and **Can be undone**; under it every group is named for what its
rows would become, with its count, and its button opens the decision
preview for the whole group (the apply button says how many and what):

| Group | What it becomes |
|---|---|
| *10 printers in Lab*, and the other fleets by role, maker and site | devices, one batch (see [Creating devices in bulk](#creating-devices-in-bulk)) |
| *N addresses that are devices already*, *pairs of devices to merge*, *machines with several addresses*, *hosts that moved* | links and merges the matcher proposes |
| *N cables the wire proposes*, port links, *Devices the switch sees* | cables and ports |
| *N addresses to document*, *DHCP clients* | documented addresses |
| *hosts not sure yet* | decided row by row — their identity is below the proposal threshold |
| *exposure findings to acknowledge*, *devices NAC saw, to learn* | the findings decided |
| *things gone* | decommissioning started (see [Gone, decided in one place](#gone-decided-in-one-place)) |
| *networks no subnet covers* | subnets, from the Scans page |
| *new computers / virtual machines from a source* | devices from a schedule's held rows (see [New rows from a schedule](/docs/integrations/#new-rows-from-a-schedule)) |
| *Documented, but no source sees it* | a question: documented devices no directory, hypervisor or scan has seen for the gone-days line |

**Show rows** lists a group 200 rows at a time; the inbox table below also
pages by 200, so the page never loads a large inbox whole. After a decision
on inbox rows, the queue may offer **The same for the 9 others like this
(Canon, printer, 10.237.5.0/24)?** — the rows that share the decided rows'
role, maker and subnet, as a new preview. It is only an offer: nothing
applies by itself, and no rule is stored. Right under the groups, **Also
waiting for you** holds the places outside discovery that wait for the same
person, as groups of their own (below). Under the batches list (who, when,
what and until when it can be undone) the ignored list shows every live
ignore with its reason and its end. Review keeps its sections; each observed
item names its queue group.

On a phone a row's decisions sit in one **Decisions** menu; at 1280 px and
wider a row's decisions come right after its address and identity, with its
type, ports and last seen on a details line.

### Everything else that waits

Under the discovery groups, **Also waiting for you** gathers the other places
where work waits for a person, each as a group with its count and its first
rows. You see only the groups your role decides on the group's own page, and
the server counts every group in the queue's one read. A row's decision in
place is exactly its own page's — the same button, the same permission, the
same changelog row. **Open** goes to that page; **Show rows** pages through
the rest.

| Group | Who it waits for | Deciding it here |
|---|---|---|
| **Address requests to decide** | Contributors and up | **Approve** opens the requests page's own dialog — *Approve* or *Approve and activate*, with the subnet or VRF when the allocation needs one; **Reject** asks for the note the requester reads. Never offered on your own request. |
| **Incidents to acknowledge** | Contributors and up | **Acknowledge** makes the incident yours, as on the Incidents page; everyone its opening reached is told. |
| **Team pages to approve** | Operators and up | **Approve** approves the page's newest version, as its version history does. |
| **Import rows to decide** | Contributors and up | Each upload that was previewed but neither committed nor discarded, with its rows to create, update or settle; **Open** returns to the import. |
| **Backup checks that failed** | Operators and up | Every check that failed since the last one that passed; **Open** goes to Settings → Backup & Restore to run a new one. |
| **Open compliance findings** | Contributors and up | The findings counted by pack; each row opens its device's compliance tab. |
| **Subnets about to fill** | Contributors and up | Subnets at or past their warning threshold — their own, else the install's 80 % and 95 % — the critical ones first. |
| **Certificates about to expire** | Contributors and up | Certificates that expire within 30 days, or already did, the soonest first. |
| **Source plans to review** | Administrators | Each source whose last plan holds conflicts or gone rows; **Open** goes to Settings → Integrations. |

If one group cannot be read, its line says **This group did not load. Try
again.** with **Retry**, and the rest of the queue still shows. Every old
page and its address is unchanged.

## What lands in the inbox

- **New hosts** — seen live, matching no documented address. They arrive as
  `discovered` addresses with whatever the scan learned (MAC, vendor, open
  ports, device type, PTR name).
- **MAC mismatches** — a scan saw a different MAC than the stored one. The
  live value wins, but the address is flagged `mac_mismatch` and counted on
  the dashboard until you review it.

## Confirming

**Active** promotes a discovered host into your documentation — it becomes a
normal `active` address you can edit like any other. **Reserve** documents it
as `reserved`, and **Create device** turns it into a device linked to the
address. Decide row by row, or select rows and choose **Review and apply…**
— see [Deciding in bulk](#deciding-in-bulk). The
identity chip on each row (and the role/OS/confidence filters above the list)
shows who LanCompass thinks the host is before you decide — see
[Identity fusion](#identity-fusion).

**A confirmed host is yours.** Whichever decision you take — here, in bulk,
or **Accept** of a new host in [Review](/docs/review/) — the address is
stamped `source = manual` at that moment, exactly as documenting it from a
subnet's Reconcile tab does. From then on no scan, passive listener, SNMP
poll or identity fusion rewrites its status, hostname, MAC, vendor, type or
port link: what they see lands in the address's *observed* values, and a
difference shows in Review as a *changed* item you accept or keep — see
[Who owns an address's values](/docs/addresses/#who-owns-an-address-s-values).

**DHCP client** — a host inside a DHCP or pool range offers **DHCP client**
instead of **Active**. A static `active` address inside a pool would collide
with the DHCP server, so **Active** there is refused, as before; **DHCP
client** records the host as `dhcp` and clears it from the inbox.

**A network nobody documented.** A scan of a network no subnet covers files
nothing. The [Scans](/docs/scans/) page and this inbox say *No subnet covers
10.0.1.0/24 — 5 hosts answered* with **Document this subnet**, which opens
the new-subnet dialog filled with the network; once the subnet exists, the
next scan files its hosts here. The passive listener does the same: an
address it hears outside every subnet is kept as evidence of its MAC only,
and the listener's status counts it as *uncovered*. (Earlier versions created
the subnet by themselves; an install that stored **Auto-create prefixes for scans** on
keeps that behaviour — see [Settings](/docs/settings/).)

**Delete** rejects the finding, one row at a time and for operators only: the
row goes away as a one-row batch, the changelog records the decision, and
**Undo** brings the row back with its notes and evidence. There is no bulk
delete — to clear many hosts that are not yours, use **Ignore…** (see
[Ignore with a reason](#ignore-with-a-reason)).

## Deciding in bulk

Select rows and choose **Review and apply…**. Nothing changes yet: the
preview lists every selected row and every field the decision would write,
with its value before and after. A row that cannot take the decision says
why — inside a DHCP or pool range, no longer in the inbox, already linked to
a device — and is left out; untick any other row to leave it out too. The
apply button says how many rows and what: *Apply to 12 rows as one batch*.
Past 200 rows the list shows 200 at a time, with **Previous** and **Next**.

Applied, the decision is **one batch**: one entry that names who decided,
when and what, and keeps every field it changed. The toast says
*Batch #12 — Mark active · dana* with **Undo**, and the **Decision batches**
list on this page keeps each batch with *Undo until {date}*. Undo puts back
each field that still holds the batch's value; a row someone changed since is
kept as it is and counted. The batch's own account can undo it, and so can an
operator or admin, for **7 days** by default (**Undo a decision for (days)**
in [Settings](/docs/settings/) → Features).

How big one batch may be depends on the role: a contributor up to **50**
rows, an operator or admin up to **500** (**Largest contributor batch** and
**Largest decision batch**). A bigger selection is never split behind your
back — the preview shows it whole and offers *Apply to the first 500*; the
rest stay in the inbox for the next batch. A decision your role may not take
is shown disabled, with the reason.

The same batches record a one-row decision here, Review's group decisions
(see [Undo a decision](/docs/review/#undo-a-decision)), a script's
`POST /api/v1/addresses/bulk`, a switch's inventory sync and the nightly
purge of stale discoveries — each of them can be undone the same way.

## Creating devices in bulk

A team with forty printers should not click forty times. Turn on **Group by
what they would become** above the inbox: the identified rows — a role at or
above the identity's proposal threshold (**80 %** by default), not joined to
a known device, not ignored — show as groups by role, maker and the subnet's
site, such as *10 printers in Lab — Tel Aviv*. Each group has **Review and
create…**; the rows a proposal says are devices you already have form one
more group, *3 addresses are devices you already have*, with **Review and
link…**.

The preview lists every row and every field the batch will write. Each new
device is named as the network names the host — its host name, else the name
it was heard by (DHCP, NetBIOS, mDNS, a lease), else the address — typed by
its role, with the maker and model from its identity, the address's MAC and
the subnet's site; the address is linked to it and confirmed out of the
inbox. A row a source already knows is refused, with *A source already knows
this host — link it instead*. Applied, the group is **one batch** with
**Undo**: each device goes and each address is back in the inbox, unless
someone changed it since. A group bigger than your role's batch is previewed
whole and applied to its first 500 (see [Deciding in bulk](#deciding-in-bulk)).

Selected rows work the same way: **Create devices…** in the bulk bar, and
**Link to device…**, which asks which existing device the addresses belong to
and previews the links as one batch.

Any row can become a device, identified or not. **Create device** on a row
with no identity opens a short form with only what is known — the name it was
heard by, its MAC and its site — and the type marked *not sure yet*; the
device, the link and the confirmation are still one step you can undo. A
device made here says so on its page: *From discovery — batch #12*, with the
identity it was made from (see [Devices](/docs/devices/#from-the-discovery-inbox)).

## Merging two devices

When two devices are one machine — a VM vCenter keeps beside the device
someone made from the inbox, a workstation the directory and a person both
added — merge them. A device page offers **Merge with…** (pick the other
device), and the matcher's own word, *Probably the same device as …* (the
same source id, serial number or MAC), offers **Merge…**.

The preview shows the two devices side by side. The device kept is the one a
source holds, else the older; **Swap** keeps the other. Every field shows both
values and which one stays — the kept device's, unless it is empty — and you
can pick the other side, field by field. The preview also says what moves to
the kept device: its addresses, ports (with their cables), tags, attachments
and source records. A port whose name the kept device already uses arrives
renamed, *eth0 (old name)*.

Applied, the merge is one batch. Nothing is deleted: the other device is
**retired**, with *Merged into …* in its notes, and keeps its history. **Undo**
moves everything back and restores the other device's lifecycle — except an
address, port or cable someone changed since the merge, which stays where it
is and is listed. A merge counts the rows it moves toward your role's batch
size.

## Ignore with a reason

**Ignore…** takes a host out of the inbox and keeps it out — also after it is
purged and found again by the next scan. It asks three things:

- **Why** — *Not ours — another tenant's or a provider's device*, *A guest or
  personal device*, *Lab or test equipment*, *Already documented under
  another record*, or *Other*, with an optional note.
- **What to key on** — *This MAC* (the host wherever it shows up; a phone's
  random MAC changes, so only a globally administered MAC can be keyed on),
  *This address*, or *Everything like this* (the same subnet, vendor and
  role).
- **Until** — *Until the evidence changes* (the default), *Until {date}*, or
  *Always*.

An ignore *until the evidence changes* lapses when the address shows a new
MAC or vendor, or when the MAC turns up at another address. The host then
comes back to the inbox and says why — *Back: its MAC changed*. An ignore
holds across the product: Review counts a matching item as dismissed, with
the ignore's reason and person; an ignored port neighbour or learned bridge
entry no longer flags its port; and a source's plan row for an ignored object
is skipped, never applied. Those three — a neighbour, a bridge entry, a
source's object — have no inbox row, so they are ignored through the API
(`POST /api/v1/decisions/ignored` with the scope, its key, a reason and an
end), each a batch like any other.

The **Ignored** button shows the ignored rows instead of the inbox, each with
its reason and **Recall**, and a list of everything the team chose not to
look at, of every kind — these ignores, Review dismissals, drift ignored for
30 days, exposure exemptions, NAC allowlist entries and the `no-active-scan`
tag — each with its reason, person and end. An ignore is itself a batch, so
**Undo** takes it back too. A recalled or lapsed ignore is deleted 90 days
after it ended; a batch's undo record is cleared 30 days after its undo
window closed, and the batch's line stays as history.

## The other direction: going quiet

Reconciliation works both ways. A documented host — one a person confirmed
or documented — that stops answering scans keeps its status: its presence
becomes *missing*, and Review lists it as a missing host until it answers
again or you decide (mark it offline, or free the address). A host still in
the inbox goes `offline` and returns to `discovered` when it answers again —
no inbox round-trip needed. Only genuinely *new* things require a human
decision. When *every* address linked to a device has gone dark, the whole
box surfaces once in [Review](/docs/review/) → **Offline devices** — see
[Scans](/docs/scans/#reconciliation).

### Gone, decided in one place

Everything LanCompass knows about a thing going away is one **gone item**
per thing — a device with its addresses (and the documented address the
matcher proposes as that device), or a documented address no device holds —
with every source's last word beside it and when it said so:

| Source | What it says |
|---|---|
| Scans | *stopped answering* (a documented address the scans no longer find — its first missing scan is kept, so the age is exact) or *offline*, with the missed scans and the last answer |
| vCenter and the other hypervisors | *removed* — a complete answer no longer holds the VM — or *still listed* |
| Active Directory | *disabled* or *no sign-in for a long time* (stale), with the last sign-in |
| Switch (LLDP) | *left its port* — a neighbour the switch's last poll had on a port and this poll no longer finds |
| NAC | the last time a port saw its MAC |

The item's age is the newest sighting of any source. **Start
decommissioning** is suggested at once when a source says the thing was
removed or disabled — never on the word of a source whose last sync was
incomplete — and otherwise once every source has been silent for
**Suggest decommissioning after (days)** (14 by default, Settings →
Features). A suggestion never changes anything: a person's batch moves the
device one step, *active* → *decommissioning*, and the batch can be undone
from **Decision batches**; *retired* stays a second, separate decision on
the device page. The addresses keep their presence; freeing one stays its
own decision. Deciding the item settles the source's own row too: vCenter's
*gone* row and Active Directory's *disabled* row read a decommissioning
device as decided.

**Keep…** says the thing is off on purpose — *Off on purpose*, *Seasonal*,
*Moved to another site* or *Other*, with a note — and it stops being
suggested until a source sees it again (or a source newly says removed or
disabled), or until the date you pick. The keep is an ignore record like
any other: it is listed with its reason in the ignored list and can be
recalled.

The device page shows the item as a card, **Not seen since** and the date,
with each source's word and age. Review's **Offline devices**, **Offline hosts**
and **Address drift: missing** keep their sections; each item links to its
gone item.

## Workflow tips

- Run a scan, then work the inbox top-down: review and apply the expected,
  ignore what is not yours, investigate the weird.
- A MAC mismatch usually means a NIC swap or a spoof — check `mac_was` vs
  `mac_seen` on the dashboard's mismatch list.
- Purge stale discoveries in bulk from **Settings → Data & Maintenance**.

## Deep discovery

Quick scan is unchanged. **Settings → Discovery** holds a master switch
(`discovery_enabled`, off by default, `system:admin`) and three built-in
profiles. Built-ins cannot be deleted. While the switch is off, the
discovery service idles and sends nothing.

| Profile | What it sends |
|---|---|
| Quick | Today's scan: ARP, ICMP, five TCP ports. |
| Standard | TCP connects on the standard port list, one retry, optional banners and TLS. |
| Deep | Standard, plus one UDP query each for DNS, NTP, mDNS, SSDP and NetBIOS. |
| Passive | Nothing — it only listens. See below. |

A deep run does not hunt for hosts. It uses addresses that were alive in
the newest quick scan of that CIDR in the last 24 hours, and queues a
quick scan first when there isn't one. Preview
(**Scans**, pick a profile) counts hosts, exclusions, probes and an
estimate, and sends nothing. More than 1,024 hosts needs the CIDR typed
again. Outside the profile's window the run waits; it does not start early.

Skipped, both when the run is planned and again before each host: the
`no-active-scan` tag (on the address, its device, or its prefix),
excluded CIDRs, excluded device types (printer and camera by default),
and `SCAN_EXCLUDE_NETWORKS`.

Banners and certificates are stored. The IP and device pages show them
under **Network services**. **Add to service catalog** only opens the
Services form filled in — nothing is added automatically.

No credentials are tried and no exploits are run. The packets leave from
the host running the `discovery` container. Allowlist that address in an
IDS before enabling standard or deep on a network you do not own. Import
of nmap XML and masscan JSON/XML is preview then apply, on the Import page.

Everything a remote party controls is treated as hostile before it is
stored: banners, TLS fields, mDNS/SSDP strings and imported values pass a
single sanitizer that removes control and bidi-formatting characters and
enforces column bounds, so an offensive service banner cannot smuggle
markup, terminal escapes or bidirectional overrides into the UI or the
database.

## Passive discovery

The `passive` profile never sends a packet — the discovery container
opens a read-only capture and learns from frames other devices
broadcast. It is built for networks where even one probe is forbidden:
hospitals, utilities, plant floors.

**What it captures** — and the evidence it stores:

- **DHCP** requests: hostname, vendor class (option 60), the ordered
  parameter-request list (option 55), FQDN (option 81), the client
  identifier (option 61, as hex — an id that survives an address change),
  client MAC and requested IP.
- **mDNS** announcements: service types and instance names, and the TXT
  keys that name a device's make and model (`ty`, `product`, `model`,
  `md`, `usb_MFG`, `usb_MDL`, each up to 128 characters) — a printer's
  announced model reaches its identity.
- **SSDP** announcements: `SERVER`, `USN` and the `LOCATION` host — the
  URL itself is never fetched.
- **NetBIOS** and **LLMNR**: names and workgroup memberships.
- **LLDP** and **CDP** frames: the switch's name, platform, port and
  management address — also shown as your passive uplink on the status
  card. From LLDP also the system description and the LLDP-MED inventory
  (hardware, firmware and software revision, serial number, manufacturer,
  model, asset id), so a desk phone's serial and model reach its identity.
- **ARP**: sender MAC/IP pairs. An unknown pair becomes a `discovered`
  address in the inbox with source `passive`; a known address just gets
  an evidence row. Two MACs claiming one IP inside 60 seconds is filed
  as an `arp_conflict`.
- **TCP** `SYN`/`SYN-ACK` headers only: initial TTL, window size, MSS,
  window scale, option order and the DF bit — once per host per hour.

**What it never captures:** DNS query names (mDNS self-announcements are
the only DNS it reads), HTTP or any other payload, TLS SNI — nothing
past the fields listed above; everything else is dropped in memory. It
never transmits: the capture filter is a classic-BPF program shipped with
the release (compiled once from the filter expression, so the image needs
no libpcap), attached in the kernel to a read-only capture socket that
cannot send, and the code path imports no send functions at all.

**A repeated announcement is one fact.** A host that says the same thing
again — the same mDNS, SSDP, NetBIOS, LLMNR or DHCP value — adds an
evidence row at most once every five minutes, as an ARP pair does, so a
chatty segment fills the table with what is new rather than with repeats.
Evidence heard before its address exists (a DHCP request sent from
`0.0.0.0`) joins the address once the host is known by its MAC, or by the
address the DHCP request asked for.

**What the status card says.** Each interface reads *listening*, with the
frames seen, kept and dropped and the last frame's age; *stopped* with its
error when the capture could not open or died inside (it is opened again
after a minute); and *Listening on {interface} — nothing heard for {n}
minutes* when a capture that is up has kept no frame for ten minutes — a
wrong interface, a port that sees no broadcasts, or a mirror session that
stopped. The status never says *listening* for a capture that is dead or
deaf.

**Where to point it.** A passive listener hears only what the switch
shows it. For full visibility, mirror the traffic you care about to the
listener's port — a SPAN/mirror session on a managed switch, or a tap.
On an ordinary access port it still hears broadcast protocols (ARP, DHCP
requests, mDNS, LLMNR and CDP from the switch) and the SYN fingerprints
of hosts that talk to it — useful, just narrower.

Promiscuous mode is enabled only on the interfaces listed in the passive
settings; no other interface configuration is touched. The profile is
off by default, and while it is off no capture is even created. Turn it
on with the `passive` profile switch under **Settings → Discovery**.
The interface list defaults to the scan interface — add more
(comma-separated) on a host with several VLANs to cover. The
packets-per-second cap samples bursts instead of letting them load the
database, and the status card counts what was dropped.

Passive-only operation: leave `discovery_enabled` off, enable the
`passive` profile, and the system learns the network entirely by ear —
nothing is sent, ever.

## Identity fusion

Every signal above — passive DHCP, mDNS, SSDP, NetBIOS, LLMNR, CDP/LLDP
frames and TCP fingerprints, active banners, TLS certificates, DNS/NTP
answers, SNMP `sysDescr`/`sysObjectID`, imports and the MAC's OUI vendor —
lands in the same per-host evidence list, but until now each row sat on
its own. Identity fusion turns that pile into one answer per address:
vendor, model, OS family and version, role, and a 0–100 confidence.

A rules file (`identify_rules.json`) matches each evidence row and casts
weighted votes. A rule votes once per distinct fact on a host — nine
copies of the same NetBIOS name are one vote, never enough to outweigh a
different, stronger signal. The highest-scoring value wins each field;
confidence drops when strong evidence disagrees.

**Confidence** is how much of what the product wants to know is backed by
agreeing votes: the denominator is the role's weight plus the weights of
the fields that have a vote (role 40, OS family 30, vendor 20, model 5,
OS version 5). A host known only by its MAC vendor reads 33 %; a printer
whose role, vendor and model agree reads 100 %. Below the proposal
threshold (80) the chip says *Not sure yet* and nothing is proposed.

**Roles** — router, switch, access point, firewall, UPS, NAS, printer,
camera, IoT, phone, TV, server and workstation. A server whose network
card is a hypervisor's (VMware, Microsoft Hyper-V, QEMU) is a server
marked *virtual*. A printer's model comes from its mDNS TXT record, a desk
phone's from LLDP-MED; an Axis camera announces itself over mDNS, and an
open RTSP port beside a camera maker's network card is a camera; a Mac's
device-info model outweighs the services it shares with an iPhone. A phone on a randomized MAC gets
no OUI vote — the U/L bit is checked — so iPhones and Androids are
named by their DHCP and mDNS chatter instead of their prefix. The result
shows wherever the address does: the inbox, the IP drawer, the device
page, search results.

**Why** — click the identity chip for the vote map: which rules fired,
what each voted, which evidence rows were cited, and whether the value
won or lost — strongest first, each with its weight — and one line,
*What would make it surer*, naming the heaviest field nothing voted on
yet (a role, an OS signal, a vendor, a model). The cited evidence is
shown raw so the answer is always explainable, never a black box.

**The vendor list.** A MAC's vendor comes from the IEEE registry shipped
with the release (refreshed 2026-10-29). An administrator can update it
without a release: download the IEEE MA-L, MA-M and MA-S CSV files
(`oui.csv`, `mam.csv`, `oui36.csv`) on any computer with internet and
upload them under **Settings → Discovery → Vendor list (OUI)**. They are
kept beside the backups and laid over the shipped list; a file that is
not an IEEE registry CSV is refused.

**High confidence acts.** When confidence clears the apply threshold,
the winning role lands on the address's `device_type` — but only when
the field is scanner-owned or empty. A type you set by hand, imported or
pushed by an integration is never overwritten. The same fused vendor is
the fallback for NAC's expected-vendor check, so a randomized-MAC phone
can still fail — or pass — against its real maker instead of passing
blind.

**Manual control.** On the IP drawer's identity panel you can override
any field; an override locks the row so fusion never undoes it. Unlock
hands it back to fusion at the next pass. Every manual change is one
changelog entry. Recomputation is debounced after new evidence lands
and runs in full nightly — both inside the discovery tick, so a system
with discovery disabled simply keeps the identities it already has.

**Settings** — `discovery_identity_apply_threshold` (default 80) sets the
confidence at or above which an identity is proposed;
`discovery_identity_drain_limit` (default 1,000) is how many hosts with
new evidence one discovery tick recomputes, so a 5,000-host import is
identified within minutes (both on **Settings → Features**).

## One host, many sources

A machine reaches LanCompass by several roads at once: the scanner sees
its address and MAC, the passive listener hears its DHCP and mDNS, a
FortiGate or Windows DHCP lease names it, Active Directory knows its
computer object and vCenter its VM. Each is a separate record until a
person joins them — and the inbox's *Create device* used to make a second
device for a machine a connector already held.

**The matcher** looks for records that are one real thing, by the field's
own order — stable identifiers first, names last:

1. a source's vendor id (an AD `objectGUID`, a vCenter VM id);
2. a serial number (a device's, an LLDP-MED inventory's);
3. a globally administered MAC (an address's, a device's or its ports', a
   lease's, a vCenter VM's network cards);
4. an SSH host key or a TLS certificate seen on two addresses;
5. an FQDN;
6. a host name — only when exactly one candidate holds it and no stronger
   identifier on both sides disagrees.

A locally administered (randomized) MAC never matches. Two candidates at
the same level match nothing — a person decides. The matcher runs after
each identity pass and after each sync, and it only **proposes**: nothing
is linked, merged or moved until a person accepts.

**In the inbox** a row with a proposal says *This is srv-app-02 — matched
by MAC 00:1C:14:A0:49:35* and offers **Link** and **Not the same…**
instead of *Create device*. *Link* is a decision like any other — one
batch, with *Undo* in its toast and on the batches card. *Not the same…*
asks why (different machines · shared hardware, a dock or a KVM · other);
the reason is kept and the pair is not proposed again until a new
identifier joins them. *Create device* on a host a source already holds
(levels 1–4) is refused with the device's name and a link to it.

**One machine, several addresses.** A vCenter VM's network cards, or two
addresses that present the same SSH key or certificate, are one *same
host* proposal: accepting it links every address to one device.

**A host that moved.** The same globally administered MAC or DHCP client id
(option 61) at a new address while the old one went missing is a *moved*
proposal: the new address joins the device and the old row goes offline.
A phone that rotates its private MAC is offered by its own mDNS or DHCP
name — *Probably the same device* — and only when no other host holds that
name; two phones both called *iPhone* are never joined.

**Names from the network.** A lease's host name, DHCP option 12 or 81, the
NetBIOS name and the mDNS host become the identity's name (a matched
directory device's name first), and *Create device* fills it in before the
vendor. A heard name fills an empty host name only when a person accepts
it (*Fill host names…* on the selected rows: previewed, in bulk, undoable).

Two devices that are one (a duplicate made before the matcher) are
proposed for merging when a vendor id, a serial or a MAC joins them. An
open proposal goes when one of its rows is deleted; a decided one is kept
a year.

## Findings: exposed services and drift

Collecting services and certificates is only half the job — the other
half is raising it when what answers disagrees with what should be
there. Two surfaces do that:

**Exposure findings** evaluate every service a run observed against a
rule pack. The built-in `lancompass-baseline` pack (~20 rules) flags
cleartext and legacy protocols (Telnet, FTP, SNMPv1, TLS 1.0/1.1),
weak ciphers, self-signed and expired/expiring certificates, admin
surfaces on hosts that are not infrastructure, promiscuous listeners,
and default application installs. A finding carries the rule, the
severity (`crit`/`warn`/`info`), and the evidence — service, product,
banner, TLS summary — that matched.

Findings are triage records, not alerts you lose: each has a state —
**open → acknowledged → exempted → resolved**. A repeat run refreshes
`last_seen`; two consecutive runs without the match resolve the row;
an exemption takes a required reason and can expire, after which the
next matching run re-opens the finding. Everything lands in
[Review](/docs/review/) → **Exposed services**, where acknowledge,
exempt, and *exclude host* (the `no-active-scan` tag) are one click.

**Discovery drift** is the change ledger: between runs, a port that
opened or closed, a service that changed, a TLS stack that shifted, an
OS or identity the fusion revised — each becomes a drift row under
[Review](/docs/review/) → **Discovery drift**, before/after values
attached. Drift is acknowledged, never deleted; retention follows the
`discovery_evidence_days` window.

Both surfaces feed the rest of the product the way compliance and NAC
do: **notifications** (`discovery.exposure_found`, `discovery.drift` —
the drift event batches per host), the **report** gains Exposed
services and Discovery drift sections with a digest callout, the
**topology** gets an `exposure` lens painting findings and drift on
device and site nodes, the **dashboard** shows open findings by
severity and the drift-per-day trend, and the **support bundle**
carries aggregate counts — never banners, hostnames, or addresses.

Certificates a probe saw are upserted into the
[certificate inventory](/docs/certificates/) by
(host, port, fingerprint) with `source = discovery`, so an expired or
self-signed card on a console shows up in the same expiry tracking as
hand-entered rows.

**Settings** — `discovery_findings_enabled` (default on once discovery
is enabled) gates findings and their notification/report/widget
surfaces; `discovery_drift_kinds` restricts which drift kinds are
recorded (empty = all). Both are `system:admin` runtime settings.

## What the product knows about your network

The discovery arc closed by running its audit again on a fictional test
network: 64 interfaces (workstations, servers and VMs, printers, desk and
mobile phones, cameras, a switch, a firewall, a UPS), seen over three
visits by every source — the scan, deep discovery, the passive listener,
the switch's SNMP, Active Directory and vCenter. What it measured, and what
that means for a real office:

| What | On the test network | What it means for you |
|---|---|---|
| Maker | right every time one was proposed; proposed for 95 % of hosts | a maker in the queue can be trusted; a host without one sent nothing the product could read |
| Role (printer, server, phone…) | right every time one was proposed; proposed for 90 % of hosts | a group such as *10 printers* holds what it says; a host below the proposal threshold waits in *not sure yet* |
| Model | 10 of the 14 printers and desk phones that announce one | printers' models come from their own announcements; a desk phone's model reaches the passive listener only where it can hear the phone's port |
| Operating system | right 93 % of the times one was proposed | |
| One real thing, one device | following the queue's proposals: no device doubled for the hosts Active Directory and vCenter know, and no two hosts merged | before creating a device for a firewall the queue shows, check that its connector has not already made one — its own device is not yet proposed for its scanned address |
| Silent changes | none: over three visits the scan, SNMP and the discovery worker wrote nothing on a row a person had decided | a person's decision stays theirs |
| A mistake | 500 rows accepted by mistake, put back by one **Undo** | |
| Monday morning | the week decided through the queue: 19 batches, 38 clicks — about 5 minutes for a team of three, 6–9 minutes for one person, reading included | |
| Hebrew and the phone | every discovery page right-to-left, nothing outside a 390 px phone screen | the decision preview still shows each change's field name and value as stored (in English) |

The test network cannot show your office's own devices, your directory or
your team's Monday: run discovery on one real network for a week, then
clear its queue and note where you stopped.
