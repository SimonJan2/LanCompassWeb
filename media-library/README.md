# Media library

Product imagery captured from the LanCompass demo estate, kept for later use. The site only
reads `src/assets/screens/` and `public/media/`; nothing in this folder is built or served.

Every file shows the fictional demo estate only. Screens come from the signed release bundle on
a throwaway stack (`scripts/capture-stack/`), where the capture only navigates, scrolls,
selects and opens panels; the few writes a frame needs (a comment with a reply and a signed
version on each demo design) are staged on that stack beforehand and listed in
`screens/CAPTURED.json`. Videos were recorded read-only on a development stack (W1.3; W5
re-records them).

## Screens — `screens/<set>/<locale>/<key>.png` and `<key>.focus.png`

2× PNGs at 1440 × 900 (2880 × 1800 px) of the full window, and a focus crop around each key's
main element (its box plus 24 px, at least 760 × 475 CSS px), in both interface languages and
the product's two official themes. `scripts/capture-screenshots.mjs` writes them into
`src/assets/screens/<set>/` (what the site builds) and copies them here.

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

## Videos — `videos/<theme>-<ui>/<key>.*`

Product walkthroughs (1280 × 720 WebM, at most 45 s) recorded by `scripts/record-video.mjs <key>`,
each with a poster (`.jpg` and `.webp`, from the step marked `poster`) and captions in English
and Hebrew (`.en.vtt`, `.he.vtt`) timed to the same steps. Each is a storyboard: a title card,
five steps and an end card, in the site's identity, with a pointer dot the recorder draws in the
capture page. The site's copies live in `public/media/<theme>/<key>.<ui>.*`.

| Key                      | Story                                                                                                                      | Poster frame                   | Recorded (W1.3)                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------- |
| `drift-review-queue`     | "From a finding to a decision": the queue and its count, groups, why one finding was flagged, its ghost link, the decision | the ghost link on the topology | all four: light-en, light-he, nightwire-en, nightwire-he |
| `documented-vs-observed` | "Seen on the wire, missing from the record": one site's topology, the queue's ghost links, three of them on the map        | the first ghost link           | all four                                                 |
| `hebrew-native`          | "Built in Hebrew, not translated": dashboard, prefix hierarchy, the DC-A01 rack, the review queue, all in Hebrew RTL       | the RTL dashboard              | light-he, nightwire-he (always he UI)                    |

Folders: `videos/light-en/`, `videos/light-he/`, `videos/nightwire-en/`, `videos/nightwire-he/`.

Not planned for read-only recording: the "Hebrew Excel import" and "Check Point gateway pull"
videos. Both need a write to the demo estate (an import, or enabling the disabled demo source),
which the capture rules do not allow; they wait for a later wave with a scratch estate.
