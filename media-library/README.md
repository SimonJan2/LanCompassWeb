# Media library

Product imagery captured from the LanCompass demo estate, kept for later use. The site only
reads `src/assets/screens/` and `public/media/`; nothing in this folder is built or served.

Every file shows the fictional demo estate only. It was captured read-only: the scripts sign
in, set the theme and language in the capture browser's `localStorage`, navigate and scroll.
They never approve, dismiss, edit or save anything in the product.

## Screens — `screens/<theme>/<locale>/<screen>.png`

2× PNGs at 1440 × 900 (2880 × 1800 px), one per site screenshot slot, in both interface
languages and two product themes:

| Theme                | Folder               | Use                                                                |
| -------------------- | -------------------- | ------------------------------------------------------------------ |
| Light                | `screens/light/`     | The light site's set (copied into `src/assets/screens/light/`).    |
| LanCompass Nightwire | `screens/nightwire/` | The dark site's set (copied into `src/assets/screens/nightwire/`). |

| Screen              | Product route                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `dashboard`         | `/`                                                                                                                  |
| `ipam-tree`         | `/tree` (prefix hierarchy)                                                                                           |
| `rack`              | `/racks/<DC-A01>` (elevation)                                                                                        |
| `topology-observed` | `/topology?scope=…&focus=edge:obs-…` (the review queue's ghost-link deep link; Observed layer on in view state only) |
| `review`            | `/review`                                                                                                            |
| `deep-discovery`    | `/discovery` (the demo estate has no Deep Discovery identities, so this is the discovery inbox)                      |
| `nac`               | `/nac`                                                                                                               |
| `compliance`        | `/reports`, scrolled to the compliance section                                                                       |

Re-capture:

```bash
docker run --rm --network host --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -e LANCOMPASS_DEMO_URL=http://localhost:3010 -e LANCOMPASS_DEMO_USER -e LANCOMPASS_DEMO_PASS \
  -e LANCOMPASS_CAPTURE_THEME=nightwire -e LANCOMPASS_CAPTURE_DIR=/app/media-library/screens/nightwire \
  -v "$PWD":/app -w /app mcr.microsoft.com/playwright:v1.64.0-noble node scripts/capture-screenshots.mjs
```

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
