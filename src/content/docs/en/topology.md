---
title: "Topology Map"
description: "The device-adjacency canvas — documented cables drawn as edges."
category: "ipam"
version: "0.7.0"
order: 19
---

# Topology Map

**Topology** (`/topology`) draws the network as a canvas: every device is a
node, and edges are *documented cables* — the map shows measured adjacency,
not a diagram guessed from hierarchy.

It complements the [Hierarchy tree](/docs/hierarchy/): `/tree` answers "where
does this subnet live?", `/topology` answers "what is physically patched to
what?".

## Finding a canvas

Every canvas belongs somewhere: a site's live view, a design linked to a
site, or the World. The **canvas picker** is built around that.

- **Open it** from the canvas name in the toolbar, or press **/** anywhere
  on a canvas — the search box is focused and empty each time. Inside the
  box, `/` just types.
- **Type** a canvas name, a site name or code, or an owner. Results update
  on every key, best match first: the exact name, then a word of the name
  that starts with what you typed, then the site, then the owner, then
  looser matches (letters in order, one typo in words of five letters or
  more). The matched letters are marked. Hebrew final letters and niqqud
  don't get in the way: `ארצ` finds `ארץ`.
- **Search inside drawings** looks at what is drawn in each canvas — device
  labels, sublabels, addresses, ports, VLANs, notes, and labels on an
  atlas whiteboard. A hit says why it matched ("Port Gi0/1 · on
  FW-TLV-01"); opening it filters the design to that object. In the
  switcher it runs when you ask for it or when no name matched; on the
  canvases page it is on by default.
- **Without a query** the picker lists **Pinned**, **Recent** (the five you
  opened last), the **World**, then one group per site in the Sites page
  order — each with its device count, its undocumented links and
  **New design here** — then **Unlinked designs** and **Shared with me**.
  Click a group's name to fold it; the picker remembers.
- **Chips** narrow the list: All · Atlas · Designs · Mine · Shared ·
  a site · Changed in the last 7 days. They are remembered too; the search
  text is not.
- **Keyboard**: arrows, Home/End and PageUp/PageDown move through the
  results, **Enter** opens, **Shift+Enter** opens in a new tab, **Esc**
  clears the box and then closes the picker, and the context-menu key
  opens a row's menu. A screen reader hears how many canvases matched.
- **The ⋯ menu** of a row (or a right-click): Open, Open in new tab, Pin,
  and — when you may edit it — Rename, Link to a site…, Duplicate, Share
  view and Delete. Pins are yours alone.
- **Thumbnails** show each canvas's shape — zones, devices as dots,
  links as lines — never any text.

**The site on every title.** Both canvases show a breadcrumb: **World ›
site › canvas**. Click the site to open the picker filtered to it. A design
or custom canvas with no site shows **No site** and, for someone who may
edit it, **Link…**.

**All canvases** (`/topology/canvases`, from the toolbar, the picker's
*Show all canvases…* or ⌘K) is the same picker as a page, in a list or a
grid, with a **New** menu and a **Select** mode to pin several at once. Its
search, site and kind ride the address (`?q=…&site=…&kind=…`), so a search
can be shared as a link.

**⌘K** lists the best five canvases for what you type, plus the matches
**inside drawings** ("FW-TLV-01 · in DMZ plan (Tel Aviv HQ)").

On the **Sites** page each site has a **Diagrams (N)** button: its canvases
with thumbnails, **Open live view**, **New design here** (the dialog opens
with the site already chosen) and **Import Visio here**. The New canvas
and New design dialogs ask for the site first and warn when that site
already has a canvas with the same name.

## What an edge means

An edge between two devices means one or more [cables](/docs/devices/)
directly join their interfaces. Parallel cables collapse into a single edge
with a `×N` count badge; click an edge to list its member cables and jump to
the cable trace on either device.

A **link aggregate** (a LAG, a port-channel, an MLAG leg) is one logical
link: when the switches report that the cables' ports are members of an
aggregate on each side (SNMP `ifStackTable`, or the LACP table where the
switch answers it), the edge reads "LAG · 2 × 10G" instead of "×2", and its
card names the two aggregates ("Po1 ⟷ Po1") above the member cables.
Membership comes from the wire, never from a port's name. The poll records
it on the ports it learned itself; a port you documented is never changed
— if you recorded it in another aggregate than the switch reports, the
port is flagged in Review ("The switch says this port belongs to Po2"). An
aggregate's ports are never read as a host's access port.

Each cable in that list says when the wire last agreed with it: "Verified
on the wire 3 days ago" — the newest LLDP, CDP or bridge sighting that
confirms it — or "Never verified on the wire". A cable whose last
confirmation is older than the grey age (see
[How old a line is](#how-old-a-line-is)) draws grey with "seen 9 days ago";
a documented cable never leaves the canvas.

On the World, a **VPN tunnel** line carries the state its gateway's health
poll last read (the tunnel table of [device health](/docs/snmp/)): a tunnel
that is down draws red dashed and says "Tunnel down since …"; a tunnel no
poll reports says "Tunnel state not polled" — never "up". Every WAN line
says how old its record is: "Record as of …" — the Check Point sync's commit
for a VPN line, the circuit's last edit for a circuit. When a Check Point
source's newest sync read communities but no tunnels (its runtime reads are
off, the default), the World says "Tunnels not read — runtime reads are off
for <source>" in the layer rail.

Every documented circuit is a line on the World. A circuit with an
aggregation node (or environment) draws to that provider hub; a circuit with
neither draws to one provider cloud per line type ("Cellular line"), shared
by every site on that kind of line, and a circuit with no line type to a
cloud of its own ("Line, type not recorded"). The World draws at most 40
hubs and 60 clouds; when those caps leave lines out, the layer rail says "4
more WAN links not drawn" instead of looking complete.

Edges are deliberately *direct cables only* — a device → patch panel → device
run renders as two edges ending at the panel, not a synthesized hop. The L1
trace already resolves panel pass-through; the map keeps documented fact and
derived path separate.

A second edge kind draws **guest → host** containment: a `family=compute`
device with `host_device_id` gets a dashed, edgeless-count edge from the
guest to its hypervisor host. These edges carry no cables — the popup lists
them as *guest of* links instead of a cable table. A guest with no site of
its own (a VM a vCenter sync knows only by its host) is drawn on its host's
site canvas, beside the host; its record keeps no site.

Each node also renders a **family glyph** (switch, server, database, wifi,
plug, box) colored by the device's [family](/docs/devices/#entity-families),
so a glance separates the VMs and APs from the switching fabric.

## Observed neighbours

The **observed** layer adds adjacency from LLDP, CDP and learned bridge
MACs. Evidence labels show **LLDP**, **CDP** or **LLDP + CDP**. A matching
documented cable is verified; an observation without a cable is an
observed-only link, not an automatic inventory edit.

**How a neighbour is matched.** The map and the cable proposals in Review
use one resolver, so they never disagree about the same row. A neighbour
row resolves to a device only on one unambiguous identity, strongest
first:

1. its port ID or chassis ID is the MAC of one interface (documented or
   observed) — that port;
2. that MAC belongs to exactly one device — its own, one of its ports', or
   one of its addresses' (documented, or seen by the scanner; a
   randomized, locally administered MAC on an address never identifies a
   device);
3. its system name is exactly one device's name, or the name that device
   advertises itself (its SNMP sysName, which the poll stores) — first
   exactly, then by host part, so `hq-dist-1.lab.test` is `hq-dist-1`, and
   a router you call `n-rtr-1` that calls itself `n-gw-1` is still that
   router;
4. its CDP address is one device's IPAM address. An address that
   different devices hold in overlapping VRFs is ambiguous and is not
   guessed.

The far port is then matched by name in short form: CDP's
`TenGigabitEthernet1/1/1` is the inventory's `Te1/1/1` (`GigabitEthernet`
is `Gi`, `FastEthernet` is `Fa`). LLDP and CDP rows of one port that name
the same far device are one edge, labelled **LLDP + CDP**, with both rows
in its card.

**When a neighbour stays unresolved.** A name no device carries draws an
observed-only line to what the wire reported. When two devices carry the
same name (one hostname at two sites), the map does not guess: the name
resolves only to the device at the far end of the port's documented cable,
or to the one device whose own ports report this switch back. Otherwise
the ghost card says "Two devices are named sw-edge — pick one in the cable
form" and lists both, with their sites.

**A phone is a host on its port.** A neighbour says what kind of device it
is: the poll reads the capabilities each LLDP neighbour has turned on. One
that is a telephone or a station (a desk phone's LLDP-MED row, a laptop)
and not a bridge, a router or a wireless access point is an end host. It
never draws a ghost line, never raises "Neighbour on uncabled port" and
never makes its port an uplink: its row is one more sighting of the host's
own address on that port, so with **Unlinked hosts** on the host's line
carries **LLDP** as its evidence. A neighbour that is a telephone *and* a
bridge, a bridge or a router, or one that reports no capabilities at all,
is judged as before — an undocumented switch is still a ghost.

**A port that is down.** A switch can keep listing a neighbour for a while
after the cable is pulled. A neighbour row on a port whose last poll
reported it down confirms nothing: no observed line is drawn, the
documented cable stays unverified, and its card says "Listed by the
switch, but the port is down". When the port comes back up, the same row
confirms the cable again.

### How old a line is

Every observed line says when it was last seen, and the age is its own:
each neighbour row remembers the poll that last listed it, so a cable
unplugged long ago that its switch still lists keeps its old age instead
of looking minutes old. A row on a port that is down is never refreshed,
and a row the poll did not walk (its protocol's walk failed) keeps its age
until it leaves. A host's link to its port carries the last time an edge
port's bridge table showed that address there; a link older than this
release, or one a person made that no poll has seen yet, has no age
("unknown", never "now").

| Setting | Default | Meaning |
|---|---|---|
| Grey a line after this many days without a sighting (`topology_evidence_grey_days`) | 7 | 1–365; env `TOPOLOGY_EVIDENCE_GREY_DAYS`. An observed line — or a documented cable whose last confirmation is — older than this draws grey, with "seen 9 days ago". Settings → Features → Topology. |
| Hide a line after this many days without a sighting (`topology_evidence_hide_days`) | 30 | 1–365; env `TOPOLOGY_EVIDENCE_HIDE_DAYS`. An observed line older than this leaves the canvas; its card and Review keep it. A documented cable only greys. |

A weekly-polled estate looks greyer than a daily one: that is how current
its evidence is.

Learned bridge MACs confirm a documented cable when the port learned the
far device's MAC — including a MAC only the scanner saw on the far
device's address.

**Bundles.** Several cables between one pair of devices draw as one line,
and its card says how many the wire verified: "1 of 2 cables verified".
The line counts as verified only when every cable is, so a cable that is
gone never hides behind one that works.

**Gone from the wire.** When a neighbour disappears from a port, the
poll records a departure — on the next poll that covers the port, so a
neighbour that aged out of the switch's table between polls still counts.
A departure whose neighbour no address or device MAC names (a switch that
speaks LLDP by name) joins the far end of the port's documented cable: that
device's item in the gone queue says "Cable no longer seen on the wire".

**Proposed cables.** What the wire proposes as a cable (an LLDP or CDP
neighbour on an uncabled port whose far port is known) draws amber dashed
where the cable would be — "Proposed by the wire — not yet a cable" in the
legend, on the Observed row. Click one and **Select for one batch**; pick
as many as you like, then **Preview** in the bar at the bottom ("Create 2
cables on 4 ports"): the preview lists every row the decision would write,
and **Apply** writes them as one batch with your name on it, which its
toast's **Undo** takes back in one go. A ghost whose ports the wire also
proposes opens the same preview from its card's **Document this link**. Nothing
becomes a cable without that press; anyone with `data:write` may decide.

**Edge ports and what is behind a port.** A switch's bridge table says
which MACs a port has *seen*, not what is plugged into it: an uplink sees
every device behind it. So the map trusts a bridge table only on an
**edge port** — a port with no documented cable to a switch, router or
access point, no LLDP or CDP neighbour that forwards traffic (a desk
phone on its own access port does not count), not an aggregate (`Po1`,
`Port-channel1`, `ae0`, `bond0`), and that learned at most
`bridge_edge_port_max_macs` MACs (default 8, so a small desk switch behind
a port still counts; Settings → Features → SNMP). A device seen on an edge
port is drawn as an observed link. A device seen on any other port is
**behind that port**: the layer rail's **Behind a port (inferred)** row
draws it as a dotted grey line, off by default; its card says "Seen behind
hq-core-1 · Po1, 5 minutes ago — no cable is implied" and offers no
*Document link*. An inferred line is never a ghost, never a conflict, never
counted in Review or on the World, and path trace never uses it as a hop.
A MAC of the documented far device of a cabled uplink still confirms that
cable. The lines come from the poll's whole bridge table, not the
32-MAC sample a port keeps, so which ones appear never depends on sort
order.

CDP collection is controlled by `snmp_walk_cdp` (default on, `system:admin`,
Settings → Features → SNMP). See [SNMP enrichment](/docs/snmp/). Existing
neighbour rows without `proto` still count as LLDP.

### How much the map knows

The evidence pass is computed once per poll and cached; every canvas, the
World and Review read the same one. Under the **Observed** row the layer
rail says how much of the scope it covers, for example "LLDP/CDP on 12 of
48 ports · as of 14:05". The count is the ports of switches, routers and
access points (the `network` and `wifi` families) that report an LLDP or
CDP neighbour, out of all their ports. Learned bridge MACs do not count:
they show a host behind a port, not the port's neighbour. "As of" is when
the evidence itself was observed — the newest poll of a port that
reported a neighbour, or the newest sighting on an edge — not when the
pass was cached, and the badge next to the canvas name reads **evidence
observed 12 min ago**. When polling stops, that age keeps growing. (The
API keeps both: `evidence_as_of`, the observation, and `computed_at`, when
the pass ran.)

**Zero is not "no drift".** "No LLDP/CDP seen on this site's 4 switches"
means the map has no neighbour data for that site, not that every link is
documented. The link next to it opens the first switch's SNMP settings:
check that the device is polled and that LLDP or CDP is enabled on it.
Review lists every site in that state under **Undocumented adjacency**.
The row is disabled only when the scope has no switch or router at all.

The same numbers appear on the World's site cards ("12/48 ports ·
4 undocumented") and in the badge next to the canvas name. On a first
visit with no last-used canvas, /topology opens the saved site canvas with
the most ghosts, else the busiest site, else the World. Pointing at a
ghost edge highlights both ends and names them from the LLDP/CDP data,
without a click (on a touch screen, tap it).

## What changed since

The map normally shows only "now". Once a day, the same daily run that
records the dashboard's history also stores a snapshot of the map: per site,
which devices, cables and observed links existed and which links were
observed only (ghosts). The snapshot holds ids and keys, never names or
addresses, and the last 90 days are kept.

Choose **Changes since** in the lens select (or open a canvas with
`?since=7d`) to compare the canvas with a snapshot. A second select picks
the window: **1 day**, **7 days** or **30 days**; a link may also carry a
day (`?since=2026-10-01`). Everything that did not change dims, and each
change is marked:

| Mark | State | Meaning |
|---|---|---|
| Green ring or line + | New | A device or cable created inside the window, or a ghost link the snapshot did not have. |
| Amber ring or line ~ | Changed | A device that moved into this site, a device pair whose cables are not the ones the snapshot had, a documented cable the wire showed then and does not show now ("Not seen on the wire since …"), a host on another port, or a virtual machine on another host. |
| Dashed grey line ✓ | Resolved | A ghost link in the snapshot that is documented now, or no longer seen. |
| Dashed grey outline − | Removed | A device or cable in the snapshot that is gone from the inventory. The device reads **Removed**, with its old id. |
| Dimmed | Unchanged | Everything else. |

The layer rail says how many changes there are, for example "12 changes
since 7 days ago", and the legend lists the five states. On the World each
site card carries its own count. When no snapshot is old enough, the map
compares with the oldest one and says when history starts; before the
first snapshot, only devices and cables created inside the window count.

**Lost evidence, hosts and guests.** The snapshot also keeps which
documented cables an observation confirmed that day, which port each
linked address was on, and which host each virtual machine ran on. So an
unplugged cable is a change the next morning — its pair turns amber with
"Not seen on the wire since <time>" (its last sighting, else the snapshot
that still had it) — and so are a host moved to another port and a VM
moved to another host. A snapshot taken before this release holds none of
the three: against it they are unknown, never "removed". A change says
when it happened: the first snapshot that holds it, else now.

The demo estate comes with its last week on the map: a cable added three
days ago and an undocumented link that resolved yesterday, so **Changes
since · 7 days** has something to show. Removing the demo takes its sites
out of those days and leaves every other site's history as it was.

A ghost link's card (**Details**) adds a day-by-day strip for the window:
seen and not documented, seen and documented, not seen, or no snapshot
that day. In Review, each undocumented link has **See on the map · 7 days**,
which opens its site with the last week's changes. The dashboard's
**Topology changes** widget lists, per site, what is new, resolved and
removed over the last 7 days, from the stored snapshots.

## Tracing a path

"Trace the path from this user's port" is answered on the canvas: the hops
are numbered and ringed, every link between them is highlighted, and
everything else dims. Tracing only reads, so a viewer can trace, and it
works on a shared read-only view (`?view=1`).

- **Trace from here.** Open a device's card. Optionally choose one of its
  cabled ports, then choose **Trace from here…**. A banner asks for the
  other end: click a device on the canvas, or press ⌘K and choose a device
  in the search. **Esc** (or **Cancel**) stops the pick.
- **Trace from this port.** In the same card, choose a port and **Trace
  from this port**, or use the trace button next to either end of a cable
  in a link's popup. This draws the documented chain from that port to its
  end, through every patch panel on the way.

The path is the shortest one by hop count over **documented cables**. A
patch panel is a pass-through: the path goes in on one port and out on its
front/back pair, never across to another port of the panel. A port you
start or end on is read by what holds it: on a switch or an access point
it is where the path enters or leaves that device (a user's access port),
and the device forwards on through any of its ports; on a server or any
other host it is the port the path must use. The sheet can
also **Include observed links** (LLDP/CDP neighbours and bridge MACs from
the evidence pass); when a documented path and one with observed links are
the same length, the documented one wins. Observed hops are dashed and
labelled "observed". A path is at most 32 hops long.

The trace sheet lists each hop: its number, the device, the port it comes
in on, the port it goes out on, and the cable (its label) or the evidence
that joins it to the hop before. **Copy as text** copies the same table as
lines you can paste into a ticket or a note, in the interface language.
**Clear** removes the trace. When there is no path, the sheet says why:

| Reason | Meaning |
|---|---|
| No documented path | No chain of documented cables joins the two ends. Try **Include observed links**. |
| Different sites | The ends are in different sites, and neither a documented cable nor a VPN tunnel or circuit on the World joins the sites. |
| Hop limit | A path exists, but it is longer than 32 hops. |
| No known link | A VPN tunnel or circuit joins the sites, but one leg of the path is not documented. The sheet names where the path stops ("No known link from HQ — the path stops at hq-sw") and lists the hops up to there. |

**Across sites.** When two ends are in different sites and no documented
cable joins them, the path is answered at layer 3, through the sites'
gateways and the links the World draws between them: the documented path
to the gateway, one hop per VPN tunnel or circuit, then the documented path
on to the far end. A site's gateway is the device holding the gateway
address of one of its subnets; without one, its router, else its firewall
(by device type). A VPN hop leaves and enters at the tunnel's own gateways
(or the community's members); a circuit to a shared provider hub
(the circuit's aggregation node) joins the sites through their gateways,
and is used only when no VPN joins them. Tunnel and circuit hops are
dashed and named in the sheet ("VPN · hq-fw-1", "Circuit · isp-alpha"),
and the sheet's summary says "across sites, through the WAN".

The trace rides the URL as `?trace=<from>:<to>` (a device is `dev-12`, a
port is `if-34`; `?trace=if-34` alone is the single-ended chain), so a
traced view can be shared like any other. When motion is on, the
documented links of a trace show a slow flow; with reduced motion or
effects off they are drawn still. VLAN paths and live traffic are not
traced, and a path across sites follows the World's links, not a routing
table.

## Groups and lanes

Nodes nest inside compound containers — **site → rack group → rack** — laid
out automatically. Devices with no rack sit in a dashed *No rack* lane inside
their site; devices with no site land in *No site*.

## Health overlay

Each node carries a colored dot rolled up from its linked addresses' worst
status (same worst-of rule as the device list): offline → discovered → dhcp →
reserved → active, a documented address not answering counting as offline.
Devices with no addresses show a hollow "unmonitored" dot.
Toggle **Health** in the toolbar to hide the overlay — the choice persists
per browser.

Edges flagged by cable validation (interface speed/type mismatches) draw in
red with a `⚠`.

**Monitoring wins in an outage.** A device whose monitor target is down (a
target on the device, or on one of its addresses) draws down on every
canvas within one sweep, whatever its addresses' status says; its card says
**Monitor: down since 12:04** beside the address rollup (or **Monitor: up**,
or **Monitor: not checked yet**). On the World a site with a device its
monitoring says is down counts it offline, so the site goes red too. A VPN
tunnel whose gateway's monitor is down — or whose gateway's own poll reports
it down — draws down, red and dashed, and the dead gateway's line to its VPN
community does too. When monitoring opens a site incident, the incident page
names its root (see [Monitoring](/docs/monitoring/), "Incidents").

## Unlinked hosts

Discovered addresses that belong to a prefix but to no device appear in a
dimmed *Unlinked hosts* lane — the map stays honest about what isn't
documented. Toggle them with **Unlinked hosts** (off by default — on real
inventories they can outnumber devices many times over); the filter is part
of the URL, so a filtered view is bookmarkable.

**Where a host is plugged in.** The SNMP poll links an address to the
port its MAC was learned on only when that port is an edge port (see
[Observed neighbours](#observed-neighbours)). A host's MAC is learned on
every switch between it and the core; before, whichever switch was polled
last won, so a PC could show up "on" a core's `Po1`. Now the access port
wins in any poll order, a host that moves to another access port is
followed on the next poll, and a link a person set is never moved: the
edge port that saw the address flags `link_mismatch` instead (Review), and
the uplinks that also learned the MAC flag nothing. A host whose only MAC
is the one the scanner saw is placed the same way. If a host stays on an
uplink, that port has more than `bridge_edge_port_max_macs` MACs or a
neighbour — check the setting, or document the cable.

## Layouts

The initial layout is computed automatically. You can drag nodes (and whole
groups) to rearrange, but nothing persists until you hit **Save view**.
Positions save **per named canvas**: every canvas in the switcher (the World,
the Main canvas, each saved site canvas, your own) keeps its own arrangement,
and **Save view** writes the canvas you are looking at (see
[Sharing a view](#sharing-a-view) for who may). **Auto-layout** resets the
canvas to the computed arrangement. Saved positions apply only to nodes that
still exist; new nodes fall back to the computed spot.

Without `data:write` the canvas is read-only: you can pan, zoom, select and
open node cards, but nodes don't drag — there is nothing you could not save.

Two people (or two tabs) saving the same canvas no longer overwrite each
other silently. If the canvas changed since you opened it, Save asks: **Reload**
shows the saved version, **Overwrite** replaces it with yours. A link that
opens a hidden layer to show you an edge (`?focus=`) never changes what the
canvas saves.

The **Main canvas** draws every device. Above the device limit (500 by
default, `system:admin` in **Settings → Features → Topology**) it shows a
**pick a site** list instead, sites ordered by device count; site canvases
are never capped.

The canvas is a lens, not an editor — rack placement and cabling still happen
in their own UIs.

**How the computed layout is chosen.** Layers run left to right (every card's
cables leave from its sides), and inside every site, rack group and rack the
layout minimises crossings with a two-sided greedy switch and network-simplex
placement that favours straight lines — 28 sweeps up to 200 nodes, fewer on a
bigger canvas so it still lays out in time. When four or more devices share
the same two neighbours, each is placed between them, so a rack's PDU A and
PDU B sit on either side of the servers they feed instead of in one column
whose two fans cross; and every cable is drawn from its left end. On the
busiest factor-50 site this takes the drawn crossings from about 650 to about
40.

**A change moves as little as it can.** A canvas nobody has saved positions
for keeps the places its nodes had for the rest of your browser session: when
a device appears or a cable changes, the nodes that were there stay put, the
new ones find room in their rack or site (below what is there when they would
overlap), and a note says how much moved — **Re-laid — 3 nodes moved**.
**Auto-layout** still lays the whole canvas out fresh. Saved positions always
win and are never re-laid without **Auto-layout**.

**Who saves positions on a shared canvas.** Only its owner, or an admin on a
built-in canvas (the World, the Main canvas). Anyone else can still drag
nodes — the arrangement is theirs for the session — and **Save as my canvas**
keeps it as a canvas of their own. A positions write from someone else is
refused (`errors.diagrams.positions_owner_only`).

**The World at forty sites and more** is a grid: every site joins the WAN hub
(a circuit provider or a VPN community) it has the most links to, each hub
leads a block of its sites sorted by name, and the blocks fill a page busiest
first. At the fit zoom each card is one line — its name, its health dot and
its ghost count — and the hub lines fade so the blocks read; zoom past 60 %
for the full card. A smaller World keeps the layered layout.

**The chrome never covers the drawing.** Fit to view (the **f** key, the fit
button, and every first paint) pads by the layer rail, the legend, the minimap
and the zoom controls, wherever they are — each on the side that leaves the
drawing the most room (a wide drawing keeps its width, a tall one its height). Below a 1,600 px wide window the
rail and the legend start collapsed; opening them lasts for the session.
Node names and sub-lines wrap to two lines instead of one line cut short; a
label that still does not fit shows in full when you hover the card, and
prints in full. When the header gets tight, the breadcrumb shows only the
current canvas instead of running into the evidence badge.

**A first visit** (no canvas remembered in this browser) opens the busiest
site — the most devices, ties to the most ghosts — on its saved canvas when
there is one, with its evidence badge beside the name; the World is one click
up the breadcrumb.

## Sharing a view

Looking at a canvas and saving it are two different acts.

- **Layers and lens are yours until you save.** Ticking a layer or picking a
  lens on a saved canvas changes only your view, in this browser tab (it
  survives a reload, and is gone when the tab closes). Nobody else's canvas
  changes. **Reset to saved** (the view-options menu, the sliders icon) drops
  your changes.
- **Save view** writes the layers, the lens, the node positions and the zoom
  you see as the canvas's saved view. Only the canvas's **owner** may do that —
  and, for the built-in canvases (the World, the Main canvas), a
  `system:admin`. Everyone else with `data:write` sees **Save as my canvas**
  instead: it copies the canvas with your current view into a canvas of your
  own and opens it.
- **Share view** copies a link to exactly what you see:
  `/topology?d=<canvas>&view=1&layers=…&lens=…` (plus `focus=` when a node or
  link is focused). If the browser won't copy (for example over plain HTTP),
  a dialog shows the link already selected.

Two parameters make that link a view, not an edit:

| Parameter | What it does |
|---|---|
| `view=1` | Read-only. Save, Edit, Auto-layout, the whiteboard palette and every other write are hidden, and the page sends nothing but reads. A **Viewing** chip says so; people who may edit get **Open to edit**, which drops the parameter. |
| `layers=documented,labels` | Shows exactly these layers (`documented`, `observed`, `planned`, `zones`, `labels`, `minimap`, `live`, `iso`), over the saved and the session set. It is never saved. Unknown names are ignored. |

Design canvases share the same way: `?d=<design>&view=1` opens the drawing
read-only.

A link with a scope the map can't read (`?scope=` with a typo) says so and
opens the default canvas.

## Design canvases

A **design** is the other kind of diagram: a freestyle canvas for what you
*plan* to build, not what you have. Open the diagram switcher, switch to the
**Designs** tab and choose **New design…**. The dialog asks how to start:
**Start from a template** (home lab, SMB office, branch office, DMZ
three-tier, leaf-spine, Proxmox cluster, smart home, OT Purdue, dual-ISP
edge, campus — or blank) or **Copy from atlas**, which redraws a site canvas
or the world map as design objects and links, each remembering the inventory
row it came from. An empty canvas offers the same two ways in. A design
lives beside the atlas canvases at `/topology?d=<id>` but fetches no
inventory graph.

Designs are drawings, never devices: dragging a Proxmox node, a firewall or
a rack onto the canvas creates an object with a label — nothing lands in
inventory. The palette (left rail) carries ~180 keyed network types in
groups — WAN, routing/switching, security, wireless, virtualization,
compute, storage, services, end-user, IoT, OT/industrial, voice, power and
places — plus zone presets, shapes (boxes, frames, and the generic diamond,
triangle, arrow, cylinder, cloud and hexagon), sticky notes and your own
uploaded icons.

The editor floor: click or drag to place, drop onto a container (◆) or zone
to nest, drag a child out to unparent, wrap a selection in a zone with
`⌘/Ctrl+G`, align and distribute from the inspector, snap to grid with
smart guides, undo/redo with `⌘/Ctrl+Z`. `?` opens the full shortcut card.
**Save** writes the canvas; a debounced local draft covers crashes and
offers a restore prompt on reopen. When someone else saved the design since
you opened it, Save offers **Reload (keep mine as a draft)** — your version
goes into that draft slot, ready to restore — or **Overwrite**.

Custom icons (**My icons** in the palette) upload as SVG or PNG under
admin-tunable limits in **Settings → Features → Design Studio** (size, count
and pixel size — an SVG's declared width and height count like a PNG's).
SVGs are sanitized server-side and PNGs verified by magic bytes before they
ever reach a canvas. You can also **paste or drop an image** straight onto
the canvas: it goes through the same sanitized upload and lands as an image
object sized to its pixels, at most 480 px wide. When icon uploads are off,
the canvas says so and places nothing.

On a phone or tablet the canvas answers touch and pen: tap selects, drag
moves, two fingers pan, a pinch zooms, and a long press opens the context
menu. Toolbar buttons grow to 44 px at phone widths.

### Starting from text

A Mermaid flowchart in a README, or a spreadsheet of devices and links,
becomes a design without drawing it again. **New design…** offers **From
text (Mermaid)** and **From CSV files** beside the file imports, and
**Import** on an open design offers the same two on its first step.

- **From text (Mermaid)** — paste a `flowchart` or `graph` (any direction:
  `TB`, `LR`, `BT`, `RL`). Nodes in the six common shapes come in as
  shapes — `A[box]`, `A(rounded)`, `A((circle))`, `A{diamond}`,
  `A[(database)]`, `A{{hexagon}}` — edges as links with their labels,
  arrowheads (`-->`, `---`, `--o`, `--x`, `<-->`), dotted (`-.->`) and thick
  (`==>`) lines, and each `subgraph … end` as a zone around its nodes.
- **From CSV files** — a **devices** file with the columns name, type,
  site, IP and VLAN, and a **links** file with from, to, label and speed;
  the first row names the columns (comma, semicolon or tab). A type is a
  catalog type or its name; any other type lands as a generic device. Each
  site becomes a zone holding its devices.

**Read** shows the import report before anything lands: how many objects,
links and zones, and — by line number — every line it left out (styling,
`click`, a subgraph's own direction, a shape outside the six, which is
drawn as a box), every type the catalog does not know and every link end
that names no device. Nothing is guessed. **Import** lands the design in one
undoable step, laid out by the studio's own auto-layout in the text's
direction, and **Close** saves it once, as a version ("Imported from …"), as
the file imports do. A text or file over 512 KB is refused; labels are
always text, never HTML.

### Links on shapes and pages

Any shape, device, zone or note can lead somewhere: the inspector's **Link**
section picks **Another design**, **A frame in this design** or **A web
address** (`http` or `https` only). A linked object carries a small badge in
its corner; the badge — or `Ctrl`-click (`⌘`-click) on the object — follows
the link. A web address opens in a new tab without a referrer; another
design opens in the studio in a new tab, so the design you are editing is
never replaced; a frame is brought into view. A design you cannot open says
**You can't open this design**. A top-level drawing can link each site to
its own site design and drill down from there.

A design's frames are its **Pages**: the layers drawer lists them in order
at the top — a click shows a page, drag a row (or its up and down arrows)
to reorder. Presentation mode and the Visio export follow that order. A web
link is written to SVG as a link you can click, to `.drawio` as draw.io's
own link and to Visio as a hyperlink; a design or frame link is written as
its name.

### Comments and who is here

A design is reviewed on the design itself. Right-click an object, a link
or an empty spot and choose **Add comment** (or find it in the `⌘/Ctrl+K`
palette): the **Comments** panel opens with a new thread pinned there — to
the object when one object is selected, to the link when one link is, else
to the point. Anyone who can open the design can comment, a viewer
included; commenting never needs edit rights and never changes the design
or its undo.

- **Pins.** An open thread shows a pin beside its object, at the middle of
  its link or on its point, with the number of comments in it. Click a pin
  or a thread to centre the canvas on it. Pins are for the screen only: an
  export (SVG, PNG, print, Visio, draw.io), a share link and presentation
  mode never show them.
- **The panel.** **Comments** in the toolbar opens it: open threads first,
  then resolved ones, newest first, each with its replies. **Reply**
  answers a thread.
- **Who may do what.** Only a comment's author edits its text. The author,
  the design's owner or an admin can **Resolve** a thread, **Reopen** it
  or delete a comment (a thread goes with its replies). When someone other
  than the author deletes a comment, the change log keeps one row naming
  the design, the thread and the author.
- **When the object goes.** A thread keeps the place its object or link
  had at the last save, so deleting a switch leaves its thread where the
  switch was, marked **Object removed** (or **Link removed**).
- **How long comments live.** As long as the design: resolved threads are
  kept, never swept, and deleting the design deletes its comments. A backup
  carries them and a restore brings them back.

**Who is here.** While a design is open, the toolbar names everyone else
who has it open — or counts them (**4 others here**) when there are more
than three. An open design tells the server every 10 seconds that you are there;
30 seconds without that and you are gone from the others' toolbars. Who is
here is kept in memory only — never in the database and never in the
change log.

**A save someone else would lose.** When another person saved the design
after you opened it, your **Save** is refused, and the dialog says who and
when: *Dana saved this design 3 minutes ago — load their changes before
saving*. **Reload (keep mine as a draft)** loads their version and keeps
yours as a draft to restore; **Overwrite** replaces theirs with yours.

#### Editing together

Several people can edit one design at once. Everyone who can edit it — its
owner, and an admin on a shared design — edits the same **shared draft**:
each change (a move, a label, a style, a new object, a delete) reaches the
others within a moment, and anyone else who has the design open (a viewer
too) watches it happen. You also see the others' **selections** as an
outline in their colour with their name, and their **pointers** as a
labelled cursor.

- **When two people change the same thing.** The last change to a field
  wins (one person's label, the other's colour on the same box both stay);
  deleting an object wins over someone else's edit of it, and a link whose
  end was deleted goes with it.
- **Save.** Anyone who can edit saves the shared draft with **Save**, as
  before, and everyone's canvas says **Saved by** that person. Unsaved
  work is kept for 24 hours after the last change; your browser's own
  draft is the backstop.
- **Discard.** **Discard everyone's unsaved changes** throws the shared
  draft away after a confirmation that names whose changes go; everyone's
  canvas goes back to the saved design.
- **Joining.** Opening a design that others are already changing loads
  their unsaved work, and says how many changes and by whom.
- **Undo.** `⌘/Ctrl+Z` undoes only your own changes. When someone else
  has changed the same thing since, your step is skipped and the canvas
  says so (*Skipped — Dana changed this since*).
- **A lost connection.** The canvas says *Live editing paused —
  reconnecting* and keeps your changes in a queue; when the connection is
  back they go out, after whatever the others did meanwhile. After 30
  seconds without a connection **Save** works as it does for one person —
  and a save someone else made in the meantime is refused, naming them.

Scripts and older clients that save the whole design keep working as
before.

## What Design Studio can do today

**Links and routing.** Drag from one object to another to draw a link; 55
typed links in groups (copper, fibre, power, WAN, logical, wireless, virtual)
each carry their own style. A link routes straight, orthogonal (around
objects), curved or manual with waypoints; crossings draw line jumps, parallel
links fan out, and a link can pin to a named port or a side. Links carry a
mid label, end labels, speed, VLANs, a count, a head at each end and a
status (planned, active, down). Labels that would sit on each other slide apart along
their own link; a label you dragged into place stays where you put it.

**Connection points appear under the hand.** An object shows its connection
points — the four side magnets and its named ports — while the pointer is
over it, while it is the only object selected, or once you long-press it on
a touch screen; while you drag a new link, the objects under and near the
pointer show theirs, so the link lands on a port as before. At rest only the
ports a link is pinned to show, as dots. To move the end of a link to another
object or port, click the link first: its two ends become handles you drag
(a free end, too, is a handle once its link is selected). Keyboard connect
(**Connect to…**) picks a port without any of them showing. Big designs stay
light this way: a canvas holds no connection point nobody is using.

**Free connectors.** A link may end in empty space, like a draw.io
connector: drag a connection out and choose **Leave the end free here**, or
select a link and drag its end handle off its object. The free end is a small
handle you can drag anywhere once its link is selected — or back onto an
object to attach it. A free end counts
as a link towards the canvas cap (and under its type in the legend), but
never as a cable: the bill of materials and **Promote** leave it alone.

**Styling — every object its own look.** The inspector's **Style** section
gives any object its own **fill**, **outline** colour, **outline width**
(1–4), **transparency** (0–90 %) and a **shadow**; a link takes a head at
each end — **None**, **Arrow**, **Open arrow**, **Diamond**, **Circle** or
**Bar** — and its own **colour**. A label can be **italic** or
**underlined** (a link's can be bold too), and **Format \*\*bold\*\* and
\*italic\* in the label** makes part of one label bold or italic: with it
on, `**Core** switch` shows “Core” in bold; with it off the asterisks show
as typed. Every control has its own ↺ (**Reset to the theme**), and **Reset
the style to the theme** clears them all. Objects also take an **accent** (a
theme tint or any `#rrggbb`) and a **font** (UI, mono or serif); links a
**width** (1–4) and a **dash** (solid, dashed, dotted — fibre keeps its
double stroke). The format painter copies the whole look: **Copy style**,
then **Paste style** or the **Format painter** onto other objects or links.

**Context menus and ⌘K.** Right-click an object, a link or the canvas for the
actions that apply there. `⌘K` (`Ctrl+K`) inside the canvas opens the design
command palette — every command, searchable, with its shortcut; `?` shows the
shortcut card. **Find and replace** (from ⌘K) searches labels, sublabels,
text, notes and link labels — in the selection or the whole canvas, matching
case or not — shows a live count, and **Replace all** is one undo step.
Locked objects are left alone.

**Layers drawer.** Hide or lock any object, or a whole link type, without
deleting it. **Named layers** (up to 32 per design) group objects and links
into bands you can show, hide, lock, rename and reorder: everything on a
higher layer draws above everything on a lower one, within a layer the usual
front/back order applies, and **Move selection to layer** (context menu or ⌘K) moves
the selection. Objects without a layer sit on the default layer, so a design
saved before layers existed opens, saves and exports exactly as it did.

**Clipboard.** Copy puts the selection — objects and the links between
them, free ends included — on the system clipboard as a
`lancompass-design-clip@1` envelope, so it pastes into another design,
another tab or another browser with fresh ids. An icon the receiving
install lacks shows the placeholder. Inside one tab, paste works without
clipboard permission.

**Legend, bill of materials and lens.** **Add legend** places a legend
object whose rows follow the canvas as you edit — the legend updates itself.
The **bill of materials** counts devices and links by type, vendor, speed
and status, totals ports in use, and exports CSV (UTF-8, so Hebrew labels
survive in Excel). The **View** lens recolours the canvas **by VLAN** or
**by subnet** without changing it.

**Templates and themes.** Start a design from a template or insert one into
a canvas you already have. Four themes (Clean, Blueprint, Sketch, Print)
restyle the whole canvas; the theme saves with the design. A theme colours
everything without a colour of its own: an object's own fill, outline and
accent, and a link's own colour, keep their colours in all four. In the
high-contrast interface themes (and in Windows high contrast) the theme's
colours replace them, so the canvas stays readable.

**Interchange.** Import and export `.drawio` files — layers, pages, images,
shapes, free connectors and styling travel both ways; see
[Importing from diagrams.net](#importing-from-diagrams-net). The native
`.lancompass-design.json` file carries the whole design, custom icons
included (SVG icons stay SVG). Images, print and PDF go through the export
dialog — see
[Exporting and printing](#exporting-and-printing).

**Versions.** **Save version** keeps up to 50 named snapshots per design.
Preview any of them read-only; **Restore** first saves the current state as a
version of its own, so nothing is lost.

**Presentation.** Frames become slides: **Present** walks them in order;
the arrow keys, `Space` and `Page Up`/`Page Down` move between them and
`Esc` exits. Until the canvas has a frame the button is greyed and says
**Add a frame to start**. In right-to-left locales the next slide is to the
left.

**Promote.** **Promote to inventory** turns drawn devices and links into
real devices and cables in reviewed steps — pick the scope, review every row
(new, already exists, conflict) and apply in one transaction. A drawn
device whose name matches an inventory device is attached to it only when
you **tick** its row in the review: the row starts unticked and is skipped,
with the cables that depend on it, until you do. Devices promoted earlier,
or copied from the atlas, match by id and need no tick. Promote needs
`data:write` and edit rights on the design; a failure rolls everything
back.

**Site-linked designs.** The site chip in the design toolbar links a design
to a site; the switcher then lists it under that site's name. Unlinking makes
it a free canvas again.

**Filter drawer.** **Filter** narrows the canvas by text, kind, type, link
type, link status, VLAN and state (grouped, locked, promoted, unlinked);
everything outside the filter dims. The filter is
part of the URL, so a filtered view can be shared.

**Showcase designs.** The demo estate (**Settings → Data & Maintenance → Demo estate**) ships two
finished designs to explore: **תכנון DMZ חדש** (Hebrew, linked to the HQ
site) and **Branch refresh** (English) — zones, frames, typed devices,
several link types, a legend and one named layer each. Purging the demo
estate removes them with everything else it seeded.

**Racks on the canvas.** The palette's **Racks** group places two kinds of
rack. A rack **from the inventory** is drawn from its own elevation — the
cabinet and its devices at their U, read again each time the design opens —
and is read-only on the canvas: **Open rack** (on its menu and in the
inspector) edits it on the rack's page. A **planned rack** is drawn in the
design: 42 U to start (1–60), front or rear face shown, and devices from the
catalog dropped onto a U land in that U (servers and storage take 2 U; the
inspector changes a device's name, U, height and face). A planned device
obeys the rules a real rack obeys: a second device on a taken U is refused
with **"U40 is taken by core-sw"**. A link drawn to a device in a planned
rack attaches to its slot and follows the rack when it moves. **Promote**
creates a planned rack at the design's site and each of its devices at its
U, with the preview promote always shows (a link to a rack is cabled on the
rack's page). The bill of materials counts planned racks and their devices;
SVG, PNG, print, `.drawio` and Visio carry a rack as grouped shapes with its
U labels.

**Pen, highlighter and eraser.** Circle a switch or sketch a missing link by
hand: the toolbar's **Pen** (`P`) and **Highlighter** (`M`) draw a stroke
wherever you drag — over objects too — in the colour and width the small
panel under the toolbar offers (a highlighter draws at 40 % opacity). A
shaky hand still draws a clean line: the stroke is simplified to within
half a pixel at the zoom you drew it at and drawn as a smooth curve. Each
stroke is an object of its own, on the default layer: with **Select** (`V`)
it selects, moves, groups, goes onto a named layer and locks like any
object, has no connection points, and its colour and transparency are the
inspector's **Style**. The **Eraser** (`E`) removes every stroke it touches —
drag across several, they go together, and one **Undo** brings them all
back. On a tablet a stylus draws with the pen tool while a finger pans the
canvas (two fingers still zoom). `Esc` puts the pen down. A design holds at
most 2,000 points in one stroke and 200,000 in all. Strokes leave with the
design: SVG, PNG and print draw them as paths, `.drawio` as a freehand path
(it comes back as a stroke on import) and Visio as a polyline.

**Laser pointer.** While presenting, the slide bar's **Laser pointer** turns
the pointer into a red dot with a short fading trail, for pointing at a
slide. It is never saved; everyone else who has the design open sees it on
their own canvas, with the presenter's name.

**Cloud, flowchart and more shapes.** The palette's **Cloud & services**
group draws what a provider runs beside the network, with generic marks —
never a provider's logo: region, virtual network and subnet (each holds what
you drop into it), load balancer, gateway, VPN gateway, API gateway,
firewall service, object storage, block storage, database, cache, queue,
function, container, cluster (it holds pods) and pod, registry, CDN, DNS
zone, identity, key vault, monitoring and backup vault. The search finds
them by their usual names too ("lambda", "s3", "vpc"). **Promote** leaves
them out: a cloud service is design intent, not an inventory row. The
**Flowchart** group holds process, start or end, document, multiple
documents, data, predefined process, manual input, preparation, delay,
stored data, connector and off-page connector, with the diamond as the
decision; **Shapes** adds parallelogram, trapezoid, pentagon, octagon, star,
callout, brace and cross. The search finds every shape by its name. They
leave as the other tools' own shapes — `.drawio` names draw.io's flowchart
and basic shapes, Visio gets each outline on a master of its usual name
("Process", "Document", "Off-page reference"…) — and come back as
themselves.

**Your team's own stencils.** **My stencils → Import a stencil** turns a
Visio stencil (`.vssx`) or a diagrams.net library (`.xml`) into a palette:
each master, or each entry of the library, becomes a shape named as it is in
the file — its own picture when it has one (PNG or SVG; JPEG, GIF and BMP
are turned into PNG), else its drawing. A shape you place keeps its
stencil's proportions. A stencil is **Shared with everyone** by default
(the box under the button; untick it to keep the next one to yourself), and
other people's shared stencils are under **Shared stencils**; the search
finds a stencil's shapes by their names. Every shape is a custom icon —
the same sanitised upload and the same limits — and the summary lists each
shape left out and why: an EMF or WMF picture a browser cannot draw, a
diagrams.net stencil this reader cannot draw, a shape over the icon limits,
past the 500 shapes a palette holds, or the install's icon limit reached.
The file is read in your browser and refused before anything is unpacked
when it holds more than 2,000 parts or would unpack to more than 50 MB.
**Who can delete one:** the person who brought it, or an admin (the bin
beside its name). Its shapes leave the palette; a shape that a design, a
kept version or another stencil still uses stays, so no design ever loses a
shape.

## Importing from diagrams.net

A `.drawio` file from diagrams.net (draw.io) imports into a design as
editable objects: **Import** on the design toolbar → choose the file →
review → **Import**. Compressed and plain pages both read. Nothing is
fetched while a file imports — not even an image a diagram links to.

**Pick the pages.** A file with one page imports as before. With several,
pick any of them (or **All pages**): each page becomes a **frame** named
after the page, laid out in a row left to right, 200 px apart, so
**Present** walks them as slides. Up to 32 pages are listed; a bigger file
says “Showing 32 of 2,000 pages”.

**What maps to what.**

| In draw.io | In the design |
|---|---|
| A layer | A named layer with the same name, hidden and locked as it was (more than 32 layers: everything lands on the default layer, and the summary says so) |
| A Cisco, VMware, AWS, Azure or `mxgraph.networks` stencil | The matching device type — 50 stencil names are known; an unknown stencil becomes a generic device that keeps the stencil name |
| Rhombus, triangle, ellipse, cylinder, cloud, hexagon | The generic shape of the same name |
| Sticky note, text | A note, a text object |
| Swimlane / container | A zone |
| Group | A group (its members select and move together) |
| An embedded PNG or SVG image | An image object — the picture goes through the same sanitised upload as a custom icon, under the same limits |
| An image linked from the web | A placeholder image; the link is kept in its notes and never fetched |
| A connector | A link: `edgeStyle=none` or no style → straight, any other edge style → orthogonal, waypoints kept; dashed, dotted, width and colour become the link's dash, width and colour; `startArrow` and `endArrow` become the head at each end (a connector without `endArrow` gets draw.io's own end arrow); the link type comes from the words in its label (“OS2”, “trunk”, “IPsec”…), never from its colour |
| A connector end that is not attached | A free end at the same point |
| A fill, line colour, line width, transparency or shadow | The object's own fill, outline, outline width, transparency and shadow, kept exactly — on every shape, zone, note and text box, and on a plain box that becomes a generic device; a vendor stencil's colours are its look, so a mapped device keeps its own icon's colours instead |
| **Bold** and *italic* in a label | Bold text (a note keeps both as markdown); line breaks stay line breaks; any other markup becomes plain text. Bold, italic and underline set on the whole label (`fontStyle`) stay bold, italic and underlined |

Hebrew and mixed labels keep their characters and direction; bidi control
characters are removed.

**The summary.** Before you import, the review step shows what the file
will become; afterwards the same sheet shows what it did: objects, links,
pages, layers, images converted, images left as placeholders (with the
reason — external, not PNG or SVG, uploads off, refused by the icon check),
shapes that became generic devices, and anything dropped or trimmed, by
reason. When icon uploads are off (**Settings → Features → Design
Studio**), every image stays a placeholder that says so.

**Saved when you close.** After **Import**, closing the summary —
**Close**, Escape or the × — saves the design with the import in it, as
one version named “Imported from <file>”, the same as a Visio import into
the design you are on. The design is never left with unsaved changes. A
LanCompass design file (`.json`) still lands as an edit you save yourself.

**Limits.** A file over 5 MB is refused, as is a page larger than 16 MB
after decompression or with more than 65,536 cells. Coordinates are
clamped to ±1,000,000, a link keeps at most 32 bends, and nesting stops at
6 levels — the summary counts each of these.

**And back.** **Export → Draw.io (.drawio)** writes one page that diagrams.net opens
as drawn: one draw.io layer per named layer, generic shapes as their
draw.io shapes, groups as groups, image objects with their picture inside
the file, free ends as unattached connector ends, and every look as its
style: fills, outlines and their widths, transparency, shadows, both heads
of every link, its dash, width and colour, bold, italic and underlined
labels, and a label's **bold** and *italic* runs. Importing that file again
gives back the same objects, links, layers and every look.

## Importing from Visio

A Visio drawing imports into a design as editable objects: **Import** on
the design toolbar → choose one or more Visio files → **Files → Pages →
Icons → Recognise → Review → Done**. One file lands in the design you
are on (or in a new one, your choice); several become one design each,
named after the file. Nothing leaves the browser while a file is read:
the only requests are the inventory lookup of the Recognise step and
the icon uploads for pictures you keep. The same journey starts from
**New design… → From Visio or draw.io files**.

**Nothing left behind.** When **New design… → From Visio or draw.io
files** made the design and you close the journey with nothing imported
into it — no file picked, a file that did not import, or every file
landing in a design of its own — the empty design is removed and the page
says “Nothing was imported — the empty design was removed”. Only the
person who made it removes it this way, and never once something is in
it; an import opened from the toolbar never removes its design.

**Accepted formats.** `.vsdx` and `.vsdm` (macros are ignored) and the
plain-XML `.vdx`. A binary `.vsd` is refused: open it in Visio and save
as `.vsdx`. A stencil (`.vssx`) is not a drawing: bring it in from the
palette's **My stencils → Import a stencil** instead, as a palette of your
team's shapes. A file is at most 25 MB; what it holds is bounded at 96 MB
unpacked, 32 MB per part, 32 pages, 65,536 shapes per page, 32 layers
and 64 pictures of 8 MB each. A package that lies about its size (a
"zip bomb") is refused in well under two seconds, and nothing inside it
is ever fetched from the web.

**What maps to what.**

| In Visio | In the design |
|---|---|
| A master from the Network, Cisco, Servers, Computers or Storage stencils — with or without a `.12` or `(2)` suffix, in English or Hebrew | The matching device type; about 120 names are known. An unknown master becomes a generic device that keeps the master's name |
| A cloud master (virtual network, subnet, VPN gateway, storage account, function app, key vault…) or a flowchart shape (process, decision, start/end, document, data, predefined process, off-page reference…) | The matching type of the **Cloud & services** group, or the flowchart shape (the decision is the diamond) |
| A container, a group on the Container layer, or a rectangle drawn around three or more shapes | A zone holding what it encloses, with the fill and line colour the shape sets itself; a preset tint like its fill only when it sets none |
| A connector (any 1-D shape) | A link. Glued ends attach where Visio glued them; an unglued end snaps to the nearest shape border within a quarter inch (the inspector says so); anything further is a free end. The begin and end arrows give the head at each end (Visio's line ends fold onto arrow, open arrow, diamond, circle and bar), the line pattern the dash, the weight the width, a non-theme colour the link's colour. `Comm-link` is a WAN leased line, an `Ethernet` bus is a trunk to every device glued to it; otherwise the words on the connector ("OS2", "trunk", "IPsec"…) decide, else the default type |
| A text box | A text object |
| `Revision cloud` | A note |
| A picture (a logo, a pasted image) | An image object; the PNG goes through the same sanitised upload as a custom icon, under the same limits. JPEG, and an image linked from outside the file, stay placeholders; the link is kept in the notes and never fetched |
| An EMF or WMF stencil image | The modern icon the Icons step suggests — a browser cannot draw EMF |
| Visio layers | Named layers with their names (Hebrew included), visibility and lock; the Connector layer is not created |
| Pages | Frames in a row, 200 px apart; or one design per page (a switch on the Pages step) |

Positions keep Visio's layout: inches become pixels at 96 per inch, the
drawing is scaled once so its widest extent fits 6,000 px, and rotation
is kept. **Tidy routing** (on by default) re-routes connectors with the
canvas router; off keeps Visio's own bends as waypoints, 32 at most.
After the import every device that is not locked is sized to its label
(its centre kept), and a legend is added unless **Add legend** is switched
off in Review.

**Colours are kept.** A fill, line colour or line weight a shape sets
itself — not one it takes from its master or the document's theme, and
not plain white — becomes the object's own fill, outline and outline
width, exactly; so do its fill transparency and its shadow, and the
text's bold, italic and underline. A shape that sets no colour of its
own takes the theme's, as before, and a zone without a fill of its own a
preset tint like its master's fill. Switching the design's theme later
leaves the kept colours as they are.

**A file LanCompass exported** (**Export → Visio (.vsdx)**) comes back as
it went out: each object's kind and type, its label as written, its tint,
its facts read from their own shape data rows (never guessed from the
text), and each connector's type, route, port and colour — see
[Exporting and printing](#exporting-and-printing).

**What the text says.** The first line of a shape's text is its label.
Addresses (IPv4, IPv6, CIDR) become the object's IP and address list,
`NAT=` pairs its NAT, interface tokens (`Gi0/1`, `GE0/1`, `Eth1/06`,
`FW_ETH1-06`, `SW P.46`) its ports, part numbers (`JL726A`, `WS-C…`,
`ISR…`, `FG-…`, `PA-…`, `EX…`) its vendor and model, vendor words with
up to two typos (`Junipre`, `PaloAlto`) its vendor, and carrier ids
(`קוד בזק: N`, `צומת N`, `circuit N`) keyed note lines. Everything else
stays in the notes. Visio shape data (IP, serial, location, model,
manufacturer, owner) and hyperlinks land on the same fields or in the
notes. The inspector's **From Visio** section lists each field with the
line it came from and the master's name. Bidi control characters never
survive; Hebrew and mixed text keeps its characters.

**The Icons step** shows one tile per master used across the files: how
Visio drew it on the left (its own geometry, or its PNG), the catalog
icon it becomes on the right, a picker to change it, and **Accept all**.
Choices are remembered on this browser, so the next file needs no
clicks. A picture master can stay an image instead of taking an icon.

**The Recognise step** asks the inventory which imported devices it
already holds: by address (an address attached to a device), by hostname
(case and spaces ignored) or by a similar name (two typos at most, six
characters or more; unticked by default). Ticked rows attach the object
to that device, so the [reality lens](#comparing-a-design-with-reality)
and Promote see it at once. Nothing is written to the inventory. A file
or page name that matches a site is offered as the design's site link,
off by default.

**What is dropped and why.** Guides; decorative lines with no text and
no fill; pages past the 32nd (counted as unlisted); shapes past the
2,000-object or 4,000-link caps; nesting deeper than six levels (the
object stays, top-level); layers past 32 (everything lands on the
default layer); a connector whose geometry is not a number. Shape data
beyond the listed labels goes to the notes; OLE objects, VBA, comments
and validation are ignored. The import summary counts each of these.

**Migrating a Visio library.** In Visio, save every drawing as `.vsdx`
(File → Save As, into one folder). Then **Import** → pick the whole
folder's files at once: one wizard, one Icons step covering every master
the library uses, one design per file, each named after its file. Look
at the unknown masters the summary lists and pick their icons once; the
choice sticks for the next batch.

## Comparing a design with reality

A design is what you plan; the inventory and the network's own evidence are
what you have. Choose **View → Reality** (or open the design with
`?lens=reality`) to paint, on the drawing, where the two disagree. The lens
only reads: it never promotes, saves or changes the design or the inventory.

Each typed device is filled by what the inventory says about it:

| Fill | State | Meaning |
|---|---|---|
| Green ● | Matches inventory | The object stands for a real device (promoted from it, copied from the atlas, or the same name), and the name, site and vendor the design states agree with it. |
| Amber ◆ | Differs from inventory | It stands for a real device, but a field differs — the inspector lists which. |
| Grey ○ | Not in inventory | No device stands for it yet; **Promote** would create it. |
| Red ✕ | Contradicted by evidence | The device exists, but LLDP/CDP on one of its cabled ports sees a different neighbour than the documented cable. |

Each physical link is stroked the same way: green when a cable already joins
the two devices, grey when none does, amber when no cable is documented but
the network sees the two devices talking (**Seen, not documented**), and red
when the cable exists but evidence on its port sees someone else. Notes,
zones, shapes, services and logical or wireless links have no state and keep
their normal look. The planned, active and decommissioned status keeps its
ring: status and reality are separate.

Select an object to see its **Reality** section in the inspector: the fields
that differ (design next to inventory), the contradiction with a link to the
evidence on the map, and **Open device**. The legend switches to the four
device states and the four link states with their counts, and the filter
drawer gains a **Reality** facet that narrows the canvas to any of them (it
is part of the URL as `df_r`). SVG, PNG and print exports carry the fills
and the legend rows.

The comparison reads the **saved** design. It runs when you switch the lens
on, after each **Save**, and when you press **Refresh** on the badge at the
bottom of the canvas — not on every edit. The badge shows how many
differences there are and the time of the evidence pass it used.

### A design that stays true

An object copied from the map (**Import → Copy from atlas**, or a new design
made from an atlas canvas) stays **bound** to its device. Its bound fields
come from the inventory: the name (as the label), the addresses, the vendor,
the model, the serial number and the status. Its position, size, look,
notes and links are yours and are never touched.

The label follows the device only while it still is the device's name. Once
you type your own label on a bound object, it is **yours**: no refresh
changes it again, even if you later type the device's name back.

When you open a design whose bound devices changed in the inventory since it
was saved, a notice in the corner of the canvas says **"N changes in the
inventory since you last looked"**. **Preview** lists each change — the
object, the field, what the design says and what the inventory says now — and
**Apply** takes them all in as **one step**: **Undo** takes them back. With
others in the design it is one change for everyone. A device deleted from the
inventory is never removed from the drawing: it is marked **Gone from the
inventory**. **Not now** hides the notice until the inventory changes again.
Nothing here ever changes the inventory; **Promote** is the way back.

A design that follows a site (its own site, or the site every copied object
came from) also has **Import → Refresh from the map**. It previews the
devices and documented links the site's map gained, which are added beside
the drawing (bound, every field as the inventory says), and the ones it lost,
which are marked — **Gone from the inventory**, or **No longer on the site's
map** for a device that moved elsewhere — never removed. It is applied as one
step too.

**Signing a version.** In **Versions**, the design's owner or an admin can
**Sign** a named version: the version the team agreed on. A signed version
says **"Signed by {name} on {date}"**, cannot be deleted (remove its
signature first) and is never pruned by the 50-version limit. On the reality
lens's badge, **Since signed** compares the inventory with the newest signed
version instead of the saved design — **"Since signed by {name} on {date}"** —
so drift is measured from what was agreed. When the printed drawing is a
signed version (the version under preview, or a saved design unchanged since
it was signed), the stamp on SVG, PNG, PDF and **Print A3** carries the
signer and the date; any other print looks as it always did.

## Exporting and printing

Both canvases export the same way. **Export** (the download icon on the
atlas; **Export → Image or PDF…** on a design) opens one dialog:

| Choice | Options |
|---|---|
| Format | **SVG** (vector), **PNG** (image), **Print / PDF**, and on a design **Visio (.vsdx)** |
| PNG scale | 1×, 2×, 3× (very large canvases are capped at 8,192 px on the long edge, and say so) |
| Paper (print) | A4 or A3, landscape or portrait |
| Pages (print) | **Fit to one page** (the default) or **Tile across pages** — tiles print at full size, each sheet labelled “Page 2 / 4” |
| Include | title, legend, stamp, grid |
| Colours (print, on a design) | **Print in theme colours** — off by default: a print keeps the design's own colours; on, every own fill, outline and colour gives way to the theme's |

The dialog remembers your last choices.

- **What's in the file is what's on screen.** The PNG is the SVG export
  rasterised, so both carry the same nodes, ports, link labels, glyphs,
  legend and stamp — and every own look: fills, outlines, transparency,
  shadows, arrowheads and bold or italic runs. Objects inside a zone or
  frame sit where they sit, and a Hebrew title keeps its word order.
- **The stamp** names the canvas, its site, LanCompass, the date in your
  language's format, your locale, and — on a design shown from **Versions**
  — the version's name. It runs in your interface's direction. On the map's
  canvases it adds how current the evidence is: "Evidence as of <time> ·
  LLDP/CDP on 31 of 48 ports · documented only: 5 cables" — when the
  evidence was observed (not the print time), how many ports report
  neighbours, and how many documented cables nothing on the wire confirms.
  SVG, PNG, PDF and Print A3 all carry it.
- **The SVG opens anywhere**: it declares a font stack (system fonts,
  Noto Sans Hebrew and Arabic, then sans-serif) and carries uploaded icons
  inside the file, so Inkscape or a plain browser shows it as LanCompass
  does.
- **Print** puts the canvas on sheets of the chosen paper: title, legend,
  stamp and page number on every sheet, nothing else from the page, no
  “React Flow” mark. Your view of the canvas doesn't move.
- **PDF** is the browser's print dialog — choose **Save as PDF** as the
  printer.
- **Print A3** (on both toolbars) is the wall chart in one click: A3
  landscape, fitted to one sheet, with title, legend and stamp.
- **Layers travel.** A design with named layers exports one
  `<g data-layer="…">` group per layer, default layer first, in the SVG —
  so Inkscape or Illustrator can hide a layer the way the canvas does — and
  one draw.io layer per named layer in the `.drawio` file.

Exporting never saves anything, and works on a read-only view (`?view=1`).

**What goes out and comes back.** Three formats round-trip: the design file
(**Export → Design file (.lancompass-design.json)**), **Draw.io
(.drawio)** and **Visio (.vsdx)** — export, import, and the same objects,
links, layers and styling come back. SVG, PNG, PDF and Print A3 are
outputs, made to be read rather than imported.

**Handing a design back as Visio.** **Export → Visio (.vsdx)** (or the
format in the export dialog) writes a drawing Visio opens:

- **Pages.** One page per frame, in reading order — top to bottom, then
  left to right — each the frame's size and named after it, holding the
  objects whose centre lies in the frame. Objects outside every frame go on
  one more page, “Outside the frames”. A design without frames is one page
  named after the design.
- **Shapes.** Every object sits on a master of the export's own: rectangle,
  rounded rectangle, ellipse, diamond, triangle, hexagon, cylinder, cloud,
  arrow, a container for a zone (its devices inside it), text, note, and
  for each device type a box with the type's own glyph as a picture —
  never a vendor's mark. An object that came from a Visio import goes back
  on a master of its master's name, its shape data under the labels it had.
- **Connectors** are glued at both ends — to the port's connection point
  when the link is pinned to a port, else to the shape — so a link stays
  attached when a shape moves in Visio; they keep their waypoints, label,
  both heads, dash, width and colour. A free end stays free at its point.
- **The look and the facts.** Fills, outlines, widths, transparency and
  shadows; font size, bold, italic and underline, bold and italic runs;
  Hebrew and Arabic text with its paragraphs marked right to left. Name, IP
  addresses, NAT, VLAN, subnet, serial, vendor and model, owner, location,
  ports and notes travel as shape data; the design's layers as Visio
  layers, each shape on its own; groups as groups.
- **Left out**, and said so in the dialog and when the file is saved: the
  design's theme, the reality lens and comments — and, counted, a link
  whose two ends are on two different pages and any hidden object.

Importing the file again — **Import** on a design, the same Visio journey
as any drawing — gives back the same objects, links, labels, colours,
pages (as frames), layers and shape data, each object within a pixel of
where it was. A design wider than 6,000 px comes back scaled to fit, as any
Visio drawing does. The journey's own steps still apply: each device is
sized to its label, and with **Add legend** on the import adds a legend
beside the one the file carries.

**The official drawing.** On a design you may edit, **Export → Save as
official drawing** saves the canvas's SVG — the same file as the SVG
export, stamp and legend included — as an attachment of the design. Under
the toolbar the design then says "Official drawing saved <date> by
<user>". The evidence pack on Reports carries each design's newest official
drawing with that date (`data/diagrams/<name>_<date>.svg`), and names a
shared design that has none, so the drawing an auditor receives is the one
its owner chose. Saving another replaces it in the pack; the earlier ones
stay as the design's attachments until the design is deleted. Only the
person who owns the design (an admin for a shared or built-in one) can save
it; the automatic topology views are never stored — the pack's inventory
and cables rebuild them.

On a design, **Fit to label** (right-click a device, or ⌘K) sizes the
selected devices — or every device — to their names, as one undo step. New
devices and inserted templates already start at the size their names need;
a name too long even for the widest box shows in full on hover and in the
inspector.

## Keyboard and screen readers

Both canvases can be used without a mouse.

- **Skip to content** is the first thing Tab reaches on every page; on a
  canvas page it lands on the canvas toolbar.
- **Tab walks the canvas in reading order**: the toolbar, the layer rail,
  then the devices, then the links, then the legend. Shift+Tab walks back.
- Every control has a name a screen reader reads out, and a focused device
  or link shows a ring — in Windows High Contrast too, where the selection
  is drawn as an outline in your system's highlight colour.

| Key | Atlas (site and world canvases) | Design |
|---|---|---|
| Tab / Shift+Tab | devices, then links | objects, then links |
| Enter | open the focused device's card | select the focused object and open its inspector |
| Arrows | move to the linked device in that direction (while editing, nudge the selection) | nudge the selection by the grid step |
| Shift + arrows | nudge by ten | nudge by ten grid steps |
| Esc | close the card, clear the selection | cancel, clear the selection |
| P / M / E | — | the pen, the highlighter, the eraser (`V` or `Esc` to select again) |
| ? | the shortcut card | the shortcut card |

**What is announced.** One polite live region says, once and without
coordinates: a layer turned on or off, the lens you picked, the canvas you
switched to (by name), how many items are selected, that the canvas was
saved (or that the save failed, or that someone else changed it first), and
that an export is ready. Each announcement clears after five seconds.

A link with a lens the canvas doesn't know (`?lens=…`) says so in a toast
and shows the Health lens.

**The map as a table.** **Show as table** on either toolbar lays the
canvas out as two tables over it: the nodes (name, type, site — on a
design, the zone it sits in — and health, or a design's status) and the
links (both ends, type, evidence, and how old the evidence is). Each column
sorts from its heading, and the heading says which way; the arrow keys
move from row to row, Page Up and Page Down by ten, Home and End to the
ends; Escape (or the ×) goes back to the map and to the button. The table
lists what the canvas draws — turn a layer on and its lines join the
table. Each canvas has a name a screen reader reads: “Map of <canvas>”. A
pen or highlighter stroke is a row of its own: its type is **Drawing** and
it is named by the layer it is on.

## Getting around

- **Ask the map.** The bar above the canvas takes a question in words —
  "where is 10.0.5.101", "path from pc-01 to n-pc-01", "what breaks if
  dist-1" (in Hebrew: "איפה…", "מסלול מ… אל…", "מה נופל אם…"). Press **Q**
  to put the cursor in it (the same physical key on a Hebrew keyboard);
  `/` stays the global search.
  - **Where is…** takes an address, a MAC or a name and answers with the
    switch port the address was last seen on and when ("pc-01 is on acc-1 ·
    Gi0/2, seen 7 minutes ago"); the switch is focused on the canvas, or
    **Show on map** opens its site's canvas.
  - **Path from… to…** opens the trace sheet between the two (a port an
    address was seen on, or the device).
  - **What breaks if…** opens the impact view on that device: every device
    that would lose its path to its site's gateway is tinted, the
    redundant links that keep the others connected are drawn bold, and the
    bar says "3 devices lose their path · 1 redundant links keep 2". It
    counts documented cables and direct neighbours only (never a "behind
    this port" sighting). A site with no gateway (no subnet gateway
    address, router or firewall) says so instead of guessing.
  - The question rides the URL (`?q=`) with what it opened (`trace`,
    `focus` or `impact`), so an answer can be shared. **×** clears it.
- **Show on map.** A device's page (beside Placement, and on each cable of
  its Ports & cables tab), a rack, a subnet, a VLAN, a circuit (its row's
  menu), a monitor, an incident and a device's row in Review open the map
  at that object: the site's saved canvas first, else the site's canvas,
  with the object focused (a subnet shows its zone, a circuit its site on
  the World).
- **Ports on the card.** A device's card on the canvas lists its ports
  with their documented cable, the neighbour the wire reports on each,
  and how many devices are seen behind it.
- `g t` jumps straight to the map; it's also in the IPAM nav group and the
  command palette.
- Minimap + zoom controls are built in; click a node for a summary panel,
  double-click to open the device.
- **Drill down in a design.** A shape with a link (its corner badge) opens
  the design or web address it leads to in a new tab, or brings its frame
  into view — click the badge or `Ctrl`-click (`⌘`-click) the shape. The
  layers drawer's **Pages** list jumps to any page of a many-page design.
