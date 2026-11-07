# Media library

Product imagery captured from the LanCompass demo estate, kept as the record. The site only
reads `public/screens/` (derived from the screens here) and `public/media/`; nothing in this
folder is built or served.

Every file shows the fictional demo estate only. Screens come from the signed release bundle on
a throwaway stack (`scripts/capture-stack/`), where the capture only navigates, scrolls,
selects and opens panels; the few writes a frame needs (a comment with a reply and a signed
version on each demo design) are staged on that stack beforehand and listed in
`screens/CAPTURED.json`. Videos were recorded read-only on a development stack (W1.3; W5
re-records them).

## Screens — `screens/<set>/<locale>/<key>.png` and `<key>.<slot>[-phone].png`

PNGs of the full window at 1440 × 900 (2880 × 1800 px), and, for every slot that shows the key
(W11, `src/content/screen-slots.json`), a crop of the slot's own size around the one thing its
caption names, scaled from a render at device scale 3 to twice the width the slot draws it (never
enlarged), in both interface languages and the product's two official themes.
`scripts/capture-screenshots.mjs` writes them here and derives the served WebP files in
`public/screens/<set>/<locale>/` from them (`--derive` does that alone). W3's 760 × 475 focus
crops (`<key>.focus.png`) are gone: no slot drew them at a readable size.

| Theme       | Folder                 | Use                                   |
| ----------- | ---------------------- | ------------------------------------- |
| Survey      | `screens/survey/`      | The light site's set (`auto`: light). |
| Night chart | `screens/night-chart/` | The dark site's set (`auto`: dark).   |

| Key                 | Product route (ids looked up at capture time)                                        |
| ------------------- | ------------------------------------------------------------------------------------ |
| `dashboard`         | `/`                                                                                  |
| `ipam-tree`         | `/tree` (prefix hierarchy)                                                           |
| `rack`              | `/racks/<DC-A01>` (elevation)                                                        |
| `topology-observed` | `/review` → a ghost row's `focus=edge:obs-…` link                                    |
| `review`            | `/review`, scrolled to the ghost-link section                                        |
| `nac`               | `/nac` (overview: detection only)                                                    |
| `compliance`        | `/reports`, scrolled to the compliance section                                       |
| `discovery-queue`   | `/discovery` (the one queue)                                                         |
| `map-ages`          | `/topology?scope=site:<Demo HQ>&view=1&since=7d`, one line's card open (its age)     |
| `ask-the-map`       | `/topology?scope=site:<Demo HQ>&view=1&q=where is <an HQ address>`                   |
| `design-studio`     | `/topology?d=<Branch refresh \| תכנון DMZ חדש>`, the switch selected, inspector open |
| `rack-studio`       | `/racks/<DC-A01>?lens=power`                                                         |
| `ip-plan`           | `/prefixes/<10.130.100.0/24>?tab=plan&view=grid`                                     |
| `licence`           | `/settings/license` (evaluation)                                                     |
| `gallery`           | `/gallery`                                                                           |

Re-capture: `scripts/capture-stack/README.md` → "Re-capture at a release".

## Videos — `videos/<set>-<ui>/<key>.*`

Product walkthroughs (1280 × 720 WebM, at most 45 s) recorded by `scripts/record-video.mjs <key>`
on the throwaway capture stack loaded from the signed bundle (W5; `scripts/capture-stack/`), in
the product's official themes: `survey` (Survey) and `night-chart` (Night chart). Each has a
poster (`.jpg` and `.webp`, from the step marked `poster`) and captions in English and Hebrew
(`.en.vtt`, `.he.vtt`) timed to the same steps. Each is a storyboard from
`src/content/videos.json`: a title card, five steps and an end card, in the site's identity, with
a pointer dot the recorder draws in the capture page. The site's copies live in
`public/media/<set>/<key>.<ui>.*`.

| Key                      | Story                                                                                                                                                                          | Poster frame                  | Recorded (W5)                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | -------------------------------------------------------------- |
| `drift-review-queue`     | "From a finding to a decision": the dashboard's undocumented counts, the one queue, a group's preview, Apply as one batch, Undo in one step (writes on the capture stack only) | the batch's preview           | all four: survey-en, survey-he, night-chart-en, night-chart-he |
| `documented-vs-observed` | "Seen on the wire, missing from the record": Demo HQ's map and a line's age, Review's ghost links, the ghost link's card, the Changes lens, Ask the map                        | the aged line (its card open) | all four                                                       |
| `hebrew-native`          | "Built in Hebrew, not translated": the RTL dashboard, the IP plan, the DC-A01 rack, the Hebrew design "תכנון DMZ חדש", the queue                                               | the RTL dashboard             | survey-he, night-chart-he (always he UI)                       |

Folders: `videos/survey-en/`, `videos/survey-he/`, `videos/night-chart-en/`, `videos/night-chart-he/`.

Not planned: the "Hebrew Excel import" and "Check Point gateway pull" videos (the demo estate has
no data for them).
