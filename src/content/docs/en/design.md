---
title: "Design language"
description: "Roles, tones and shapes, type, themes, motion and print — how LanCompass looks and why."
category: "system"
version: "0.7.0"
order: 56
---

# Design language

LanCompass draws every screen from one small set of **roles**. A theme
is a handful of inputs; one function turns them into the roles, moving
only a role that misses its contrast floor. Components read the roles,
never a colour, so a new screen looks like the rest in every theme, in
every language and on paper.

## Roles

| Group | Roles |
|---|---|
| Surfaces | `surface-page`, `surface-card`, `surface-sunk`, `surface-raised`, `surface-overlay` |
| Inks | `ink`, `ink-muted`, `ink-faint` |
| Edges | `edge-rule`, `edge-control`, `edge-strong` |
| Action and focus | `action`, `action-ink`, `focus` |
| Tones | `tone-ok`, `tone-warn`, `tone-bad`, `tone-info`, `tone-neutral`, `tone-discovered` — each with a `-wash`, an `-edge` and an `-ink` |

The floors every theme is held to: text 4.5:1 (7:1 for body ink in the
high-contrast themes), edges and the focus ring 3:1 (4.5:1 in high
contrast), and an APCA Lc of 60 for body text and 45 for other text.
The paper palette (print) is held to the same pairs.

## Tones and shapes

A status is one of seven meanings. Each has one tone and one shape, so
it reads in colour, in black and white and for a colour-blind reader
alike.

| Shape | Meaning | Tone | Shape name |
|---|---|---|---|
| ● | OK | `tone-ok` | circle |
| ▲ | Needs attention | `tone-warn` | triangle |
| ■ | Problem | `tone-bad` | square |
| ○ | Information | `tone-info` | ring |
| ▬ | Inactive or unknown | `tone-neutral` | dash |
| ✦ | Discovered | `tone-discovered` | star4 |
| ◉ | Live | `tone-ok` | live |

## Type

One family in every direction: **IBM Plex Sans** for Latin with **IBM
Plex Sans Hebrew** behind it, **IBM Plex Mono** with tabular, slashed
figures for addresses and numbers, and Noto Sans Arabic under Arabic.
The fonts ship with LanCompass; nothing is fetched.

| Step | Size | Line |
|---|---|---|
| `2xs` | 11 px | 16 px |
| `xs` | 12 px | 16 px |
| `sm` | 13 px | 20 px |
| `base` | 14 px | 20 px |
| `md` | 16 px | 24 px |
| `lg` | 20 px | 28 px |
| `xl` | 24 px | 32 px |

## Themes

| Theme | Kind |
|---|---|
| Survey | light — the default |
| Night chart | dark |
| Survey · high contrast | light, high contrast |
| Night chart · high contrast | dark, high contrast |
| LanCompass Nightwire | dark (Classic) |
| Indigo | dark (Classic) |

*System* follows the operating system: Survey by day, Night chart by
night. Survey and Night chart are the website's own palettes; every
surface and accent role stays well away from other products' colours.

## Motion

| Token | Duration |
|---|---|
| `--dur-instant` | 80 ms |
| `--dur-fast` | 150 ms |
| `--dur-med` | 300 ms |
| `--dur-slow` | 500 ms |

Effects are calm by default and no animation runs forever. *Reduce
motion* in the operating system, or *Ambient effects → Off* in Settings →
Appearance, removes the rest.

## Print

Every print view prints one light sheet in every theme: the paper
palette, A4 portrait (the dashboards keep their own picker), and the
same header and footer on every page — the mark, the install's name,
the page's title, the time it was generated and "Page 1 of 2". See
[Reports](/docs/reports/) for the page sizes.

## Page header

- **Eyebrow** — above every list and detail page's title, the name of
  its group in the sidebar (*Inventory* over *Devices*). Latin scripts
  set it in small caps, tracked 0.08 em; Hebrew and Arabic have no
  capitals, so it is set plain, with no letter-spacing.
- **Meta line** — under the title, in IBM Plex Mono at the smallest
  text step in the faint ink: the page's count ("38 devices"), the time
  its numbers are from ("Updated 09:47"), or the evidence line.
- **Toolbar** — one filled action, at most four outlined buttons; the
  rest are quiet icons or sit in the page's *More* menu.

## Signature details

- **Registration marks** — a crosshair tick at each corner, in the rule
  edge, like the corners of a survey sheet. Four surfaces carry them:
  the sign-in card, the topology canvas, the design canvas and a
  Showcase dashboard's backdrop. Nothing else does.
- **Contours** — the website's height lines, at low strength, behind
  every empty state and behind the topology's world view. They never
  move, never print and never sit behind data in a chart or a list.
- **Evidence lines** — a chart that plots documented, observed or drift
  series draws them as the topology draws links: documented solid in
  ink, observed dotted in the info tone, drift dashed in the bad tone.
  The legend shows the same line.
- **Layers** — in Survey a card is a layer above the page: a 1 px
  hairline and a 2 px soft shadow in the ink at 6 %. The dark themes
  step their surfaces lighter instead and keep no shadow.

## Charts

- **One measure, one ramp** — a chart of a single measure (the
  utilisation gauge, capacity and subnet-utilisation bars, the address
  map, the calendar and the punch card) uses the theme's sequential
  ramp, from the card towards the ink.
- **Calm status** — in a status donut or status bar the healthy (ok)
  part is drawn in its tone's wash, outlined in the tone itself; a
  problem is drawn at full strength, so it is the strongest colour on
  its chart.
- **Large areas** — a status share larger than a quarter of a chart (a
  waffle, a bullet's bands) is its tone's wash with an outline, never a
  field of full colour.
- **Categories** — eight series from four of the website's hue families
  (cobalt, drift pink, a warm survey neutral and indigo ink), a strong
  and a light step each, no two neighbours from one family and no
  emerald. Neighbours stay distinguishable under deuteranopia and
  protanopia.
- **Tones are statuses** — a chart colours a category by tone only when
  the category is a status; a selected, pressed or active control never
  wears a tone (it is the raised surface in ink).

## High contrast

*Survey · high contrast* and *Night chart · high contrast* raise every
text role, not only body text: the muted and faint ink, the placeholder
and every tone reach 7:1 (APCA Lc 75) on the page and on a card, and a
tone keeps 7:1 on its own wash. Edges and focus rings reach 4.5:1. The
design matrix fails any text sample under 7:1 (4.5:1 for large text) in
either high-contrast theme.

## Lists

A name stays on one line: up to 24 characters it is whole, and a longer
one ends in "…" with the full name in its tooltip — a name never breaks
at a hyphen. The row actions column stays pinned at the end of a wide
table, with a soft edge shadow while the rows scroll under it.
