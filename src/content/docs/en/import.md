---
title: "Import"
description: "Excel workbook import — preview, per-sheet detection, commit/rollback."
category: "operations"
version: "0.7.0"
order: 38
---

# Import

The **Import** wizard ingests a `Network_Address.xlsx`-style workbook and
turns messy real-world spreadsheets into clean IPAM data — with a full
dry-run before anything is committed.

## The pipeline

```
upload → per-sheet type detection → dry-run preview → commit
```

1. **Upload** — the file lands under `IMPORT_DIR` as a batch you can
   re-preview or commit later. Every imported row keeps an
   `import_batch_id` back to this upload.
2. **Detection** — each sheet is classified by header signature (Hebrew and
   English variants) into a family: sites-master, site sheet, circuits,
   certificates, assets, services, inventory, servers, or unknown/empty.
   The **Import as** column lets you override the target per sheet —
   *Custom list* preserves the sheet's own columns as a
   [custom list](/docs/lists/) instead of dissolving it into typed entities.
   Unknown-family sheets suggest this automatically. Optionally the sheet
   *also* feeds its normal IPAM targets, so a server sheet lands in both
   `ip_addresses` and the list. Re-importing the same sheet **merges by key
   column**: changed cells update, new rows are created, vanished rows are
   kept and reported, and hand-edited rows win conflicts.
3. **Preview** — a per-row report of what *would* happen:
   `create / update / skip / conflict / error`, plus sheet-level warnings.
   Every row is there: the counts cover the whole file, and **Every row**
   pages through it 200 rows at a time, filtered by action. Each row's
   sentence is in your language — here, in the NetBox preview and in the
   rack and device dry runs — with names, addresses and counts kept as the
   file writes them. The API answers it as `key` and `params` beside the
   English `detail` (a sentence joined from several adds `more`), and the
   error report's CSV keeps the English.
4. **Commit** — all-or-nothing per run, or partial with **per-sheet
   rollback** if a sheet fails. The commit reports against the preview you
   read: for an unchanged plan its counts are the preview's, and a row the
   commit did differently says what was planned.

A sheet may be formatted far to the right of its data (column `IV` is
common); it is read by the columns that hold values. The limit is 1,024
columns of data per sheet and 2,000,000 cells per file; a file over either
is refused with a sentence that names the sheet and the limit.

## Racks and Devices exports

The workbook card also takes LanCompass's own **Racks** and **Devices**
exports — `racks.xlsx`, `devices.xlsx`, a rack group or single-rack
bundle — and a workbook that mixes them with IPAM sheets.

**Supported sheets.** A sheet whose headers match one of the rack
importer's families — *groups*, *racks*, *devices*, *interfaces*,
*cables* — is a rack/device sheet. Every other sheet is detected as
described above. A sheet that also carries an IPAM header signature (a
sites master, an inventory sheet, a site sheet with an IP column) stays an
IPAM sheet, so existing workbooks import exactly as before.

**Sheets step.** Each rack/device sheet shows its family, row count and
mapped and unmapped columns, with a checkbox to skip it. Four options apply
to all of them — the same ones as the import dialog on the Racks page:

- **When a rack matches** — *Skip existing* (the default) leaves a matched
  rack and everything in it untouched; *Update matched* updates the rack
  and its devices; *Merge* keeps the rack as it is and only adds devices.
- **Import racks into group** — puts every rack in the file into one
  existing rack group instead of the group the file names.
- **Replace devices** — un-racks a matched rack's current devices before
  the file's devices are placed. They stay as unracked inventory: import
  never deletes.
- **Unracked when rack/group missing** — a device whose rack or rack group
  exists neither in the file nor in LanCompass becomes unracked inventory
  instead of an error row. Use it for a devices-only file on a new install.

**Import order.** One commit is one transaction:

1. IPAM rows (sites, VRFs, prefixes, ranges, addresses and the other
   workbook families)
2. sites, rack groups and racks
3. devices
4. interfaces
5. cables
6. device IP links

A device's `ips` cell may name an address that an IPAM sheet in the same
file creates. The preview marks that row **links on commit**, and the
commit links it. An error in either part rolls back both parts;
**Commit partial** applies the good rows of both. Dropping the same file
again previews as all skips. The batch is a normal workbook batch, and the
history lists its rack/device families next to the file name.

## How site sheets resolve their site

A site sheet is matched to a site by (in order): declared octet-pair blocks,
site code, site name — checked against both existing DB rows and sites
planned earlier in the same batch. Inactive sites can't claim new rows, and
title/name matching uses Hebrew-aware folding. A nameless master row becomes
`Site N` instead of being dropped.

## Where site sheets land

Before the preview, **Where site sheets land** chooses the VRF:

- **The Global VRF** (the default) — every site's networks go into the
  install's Global VRF, so overlap checking sees them all.
- **A VRF per site** — each site sheet gets a VRF of its own (no RD).
  Choose it only where your sites really are separate routing domains:
  overlap checking never compares two VRFs.

## Overlapping networks

The preview lists every network a site sheet claims that overlaps another
site's: the same network at two sites, or one inside the other. In the
Global VRF the same network becomes one prefix — the first site's — and a
network inside another becomes its child; with a VRF per site the pair is
kept apart and overlap checking will not see it. Read the list before you
commit and decide which are real duplicates.

## Rows that are not imported

- **Address-map sheets** — a sheet whose header row is the host numbers
  0–255, one address per column, is listed as *address map layout — not
  imported* with its sheet name. It is never an error and never silently
  dropped.
- **Network and broadcast addresses** — in an IPv4 prefix of /30 or
  shorter, a row for the network or the broadcast address is previewed as
  *network or broadcast address — skipped*, with its row number.

A new address is attached to the deepest prefix of its VRF that holds it
and is not a container — a /26 the same file declares inside a /24 takes
its rows, and the /24 becomes the /26's container.

## The same file again

Importing a workbook you already committed creates nothing. Sites, VRFs,
prefixes, ranges and addresses are matched by their keys, and circuits,
certificates, services, assets, inventory and servers by the key their
preview row shows (a circuit's ID, a certificate's name, an asset's serial,
a service's name with its beneficiary and site): the same values are a
skip, changed values update only those columns (an empty cell changes
nothing), and only a row with no match is created. The second preview
shows zero create and zero update rows.

## Your own exports, back in

Every IPAM export reads back in — into the same install with zero changes,
and into a new one with the same objects:

- **Addresses** (a subnet's **Export**, or Settings → Data & Maintenance
  for every address) carry their prefix and VRF by name. Import them on a
  subnet's address list or here.
- **Prefixes, ranges, VLANs and VRFs** have exports of their own: prefixes
  on the subnet list (and Settings → Data & Maintenance), all four
  through the API (`GET /prefixes/export.csv`, `/ranges/export.csv`,
  `/vlans/export.csv`, `/vrfs/export.csv`). This wizard recognizes each by
  its header row — an address export is never mistaken for a devices
  sheet.

Into a new install, import them in this order: VRFs, VLANs, prefixes,
ranges, then addresses. A row whose object exists is skipped when it is
the same and updates only the columns that differ otherwise.

Some columns are **read only** — written for the reader, ignored on the
way back: a prefix's `used`, `usable`, `utilization_pct` and
`threshold_pct` (the subnet list's own figures and the warning threshold
that applies), a device's `os_description` (what SNMP says it runs), and
the counts and labels the devices and racks files already carried. A
workbook's first sheet, **About**, says what the file is and when it was
true; the importer skips it, and the data sheets keep the column headers
the importer reads (in every language — a Hebrew reader's sheets run
right to left, their headers stay the machine names). File names carry
what, scope and date (`lancompass-prefixes-2026-10-25.csv`); the importer
reads the header row, never the name.

Deleting a draft batch needs the delete permission, like every other
delete.

## What the normalizers handle

- **Split-octet IPs** (`172.20` + `15.1` fragments → assembled addresses)
- **Multi-IP cells** — several addresses in one cell become several rows
- **MACs** in four formats — normalized
- **Excel serial dates** — `44927` → a real date
- **Repeated headers and duplicated column blocks** — detected and skipped
- **Hebrew content** — final-letter folding, status mapping, RTL-safe values

## Encodings and Hebrew

Every upload — the workbook wizard, the device, rack and address importers
and the CSV files inside a NetBox export — is read by one decoder, in this
order:

1. **UTF-8 with a byte-order mark (BOM)** — Excel's "CSV UTF-8";
2. **UTF-16 with its BOM** — Excel's "Unicode Text", tab-separated, saved
   as `.txt`;
3. **UTF-8**;
4. **Windows-1255** — Excel's "CSV (Comma delimited)" on a Hebrew Windows.

The first that reads the whole file is used; a file with a BOM is read only
in the encoding the BOM declares. A file that none of them reads without
damage — or that already holds the replacement character `�` from an
earlier lossy save — is refused with the row of the first damaged
character, and nothing is stored. Save it as UTF-8 or as "Unicode Text"
and upload it again. Tabs or commas: the separator is found after the file
is read, so a tab-separated "Unicode Text" file imports like any CSV.

**Visual order.** Old DOS and ISO-8859-8 "visual" exports store Hebrew as
it was displayed, so each word reads backwards (`םש` for `שם`). In reading
order a Hebrew word never starts with a final letter (ם ן ץ ף ך), so the
import counts the words that do; when at least 20 % of at least 10 Hebrew
words look reversed, it says the file is in visual order. Nothing is
rewritten unless you choose to.

**What we found in the file.** Before the preview rows, the wizard and the
device and rack import dialogs show a health card: the encoding, how many
rows carry Hebrew and, for a visual-order file, a few names as found and
reversed, with two choices — **Reverse these names** (every Hebrew cell is
put in reading order, and the preview shows the result before you commit)
or **Keep as in the file**. The address import on a subnet page opens the
card when there is a choice to make.

The API answers with the same `health` object (`encoding`, `bom`,
`hebrew_rows`, `visual_suspects`, `visual_examples`) on the workbook upload
and preview and on the device and rack dry runs; `POST /addresses/import`
adds it with `?health=1`. The choice is `reverse_visual: true` (a preview
option in the wizard, a query parameter elsewhere). A refused file answers
`422` with `code: "upload.undecodable"` and `params: {"row": …}` beside
the English `detail`.

## NetBox exports

The **NetBox export** card accepts a `.zip` of NetBox per-object CSV
exports (or a single CSV — e.g. just `devices.csv`). Each file is
classified by its **header signature first, filename second**, so a
renamed export still detects correctly and an unrecognized file is
reported, never silently dropped.

Objects ingest in dependency order — sites → rack groups → racks →
device types → devices (and VMs) → interfaces → cables → VRFs → VLAN
groups/VLANs → prefixes → IP addresses → Wi-Fi networks — reusing the
same planners as the device and rack importers, so matching rules
(id → serial → MAC → name+site for devices, name+site for sites/racks,
address+VRF for IPs) and idempotent re-import behave identically.

- **Field mapping** — NetBox vocabulary is translated to LanCompass's:
  interface types (`1000base-t` → `rj45`, `25gbase-x-sfp28` → `sfp28`,
  …), cable kinds, status and face values. Columns LanCompass doesn't model
  (tenant, comments, NetBox custom fields) are stashed in the entity's
  `custom_fields` and listed in the object table.
- **Individual files need their ancestors** — `devices.csv` without
  `sites.csv` resolves sites by name against the existing DB; a device
  naming an unknown site gets an error row, not a silent skip.
- **Preview → commit** — identical to the workbook flow: per-row
  `create/update/skip/conflict/error`, then one transaction recorded as
  a `kind="netbox"` batch. Re-importing the same export is an all-skips
  preview.

**Import or source?** This page is the *one-shot cutover*: export from
NetBox once, review the preview, commit — the file path works fully
air-gapped. To *keep* a running NetBox and LanCompass side-by-side —
evaluating, auditing, or shadow-managing — use the
[NetBox source connector](/docs/netbox/) instead: a scheduled read-only
mirror over the REST API, not a file that rots the day after.

## CSV alternative

For flat data, the address list has its own
[CSV import/export](/docs/addresses/) — simpler, but all-or-nothing and
address-only. It reads its own export back: an address already in its VRF
is skipped when it is the same and updates only the columns that differ.

## Batches

The import page lists past batches (filename, sha256, status
`draft/committed/failed`, actor, row stats). Drafts can be committed later;
committed batches are the audit trail for where every row came from.
