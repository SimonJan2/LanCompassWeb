---
title: "Search & Shortcuts"
description: "Command palette, IP jump, g-chords, and every keyboard binding."
category: "getting-started"
version: "0.7.0"
order: 5
---

# Search & Shortcuts

LanCompass is keyboard-first. Every shortcut is listed in the overlay opened by
`?` or the **keyboard button** next to Search in the header.

## Command palette

Open with **⌘K / Ctrl+K**, the `/` key, or the Search button in the header.
Type to search across the whole IPAM:

- IP addresses, subnets, sites, VRFs, VLANs
- Circuits, certificates, inventory assets, services
- Matching **Docs** guides (they appear as a "Docs" group)

Paste a bare IP address and the palette offers a **Jump** result that lands
directly on the owning prefix with the address highlighted — preferring the
address's documented owner, then the deepest containing prefix.

With no query, the palette shows your five most recent destinations.

### Searching in Hebrew

The palette, every list's search box and the docs search fold Hebrew the
same way on both sides, so you type the way a keyboard types:

- final letters equal their base forms — `שלום` matches `שלומי`;
- niqqud and cantillation are ignored — `שלום` matches `שָׁלוֹם`;
- the gershayim and geresh match the ASCII quote and apostrophe a keyboard
  types — `דוא"ל` matches `דוא״ל`, `ב'` matches `ב׳`;
- the maqaf matches a hyphen — `באר-שבע` matches `באר־שבע`, and back;
- case is ignored for Latin text.

A search with no Hebrew in it (an address, a MAC, a Latin name) matches as
typed. With the interface in Hebrew, name-sorted lists (sites, devices,
racks, VLANs, the palette's groups) sort in Hebrew order — digits, then
Hebrew with niqqud ignored, then Latin; in English they keep their order.
The docs search also matches each chapter's keywords in your language.

## Go-to chords

Press `g`, then one of:

| Keys | Destination |
|---|---|
| `g d` | Dashboard |
| `g v` | Review |
| `g p` | Subnets |
| `g s` | Scans |
| `g i` | Discovery inbox |
| `g c` | Changelog |
| `g r` | Racks |
| `g e` | Devices |
| `g m` | Monitoring |
| `g t` | Topology |
| `g h` | Docs (this section) |

## Table navigation

| Key | Action |
|---|---|
| `j` / `↓` | Next row |
| `k` / `↑` | Previous row |
| `Enter` | Open the focused row |
| `Home` / `End` | First / last row |
| `Alt+↑` / `Alt+↓` | Move the focused row (orderable lists) |

## Subnet grid

Inside a prefix's [subnet matrix](/docs/subnets/):

| Key / gesture | Action |
|---|---|
| `← ↑ ↓ →` | Move between addresses |
| `Enter` | Open the address |
| Drag | Select a span of addresses |
| `Esc` | Clear the span selection |

## Scope rules

Single-key shortcuts never fire while you're typing in a field or while a
dialog/menu is open — so `j`, `k`, `/` and `?` are safe to use as text.
**⌘K / Ctrl+K** is the exception: it toggles the palette from anywhere,
including inside dialogs.

## On the Hebrew keyboard layout

Every shortcut works with the Hebrew layout on: a letter key means the same
shortcut whatever letter it types, so **Ctrl+K** is the key that types `ל`,
`g` `e` are the keys that type `ע` `ק`, and `j` / `k` are `ח` / `ל`. The
slash key opens the palette although it types `.` on the Hebrew layout. The
shortcuts overlay (`?`) shows the Hebrew letter under each shortcut. On a
Latin layout a letter is read as typed (a German keyboard's Z is still Z).
