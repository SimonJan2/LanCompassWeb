# Media library

Product imagery captured from the LanCompass demo estate, kept for later use. The site only
reads `src/assets/screens/` and `public/media/`; nothing in this folder is built or served.

Every file shows the fictional demo estate only. It was captured read-only: the scripts sign
in, set the theme and language in the capture browser's `localStorage`, navigate and scroll.
They never approve, dismiss, edit or save anything in the product.

## Screens — `screens/<theme>/<locale>/<screen>.png`

2× PNGs at 1440 × 900 (2880 × 1800 px), one per site screenshot slot, in both interface
languages and two product themes:

| Theme                | Folder               | Use                                                                        |
| -------------------- | -------------------- | -------------------------------------------------------------------------- |
| Light                | `screens/light/`     | The set the site uses today (copied into `src/assets/screens/`).           |
| LanCompass Nightwire | `screens/nightwire/` | The product's default dark theme, kept for a future dark mode of the site. |

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

## Videos — `videos/<theme>-<ui>/drift-review-queue.*`

The "drift review queue" walkthrough (≈ 30 s, 1280 × 720 WebM), recorded by
`scripts/record-review-video.mjs`, with a poster (`.jpg`) and captions in English and Hebrew
(`.en.vtt`, `.he.vtt`) timed to the same steps.

| Folder                 | Theme     | Interface language | Use                                            |
| ---------------------- | --------- | ------------------ | ---------------------------------------------- |
| `videos/light-en/`     | Light     | English            | The copy the site serves from `public/media/`. |
| `videos/light-he/`     | Light     | Hebrew             | Alternative for the Hebrew page.               |
| `videos/nightwire-en/` | Nightwire | English            | Future dark mode.                              |
| `videos/nightwire-he/` | Nightwire | Hebrew             | Future dark mode.                              |

Not recorded: the "Hebrew Excel import" and "Check Point gateway pull" videos. Both need a
write to the demo estate (an import, or enabling the disabled demo source), which the capture
rules do not allow. Their slots on the home page still show "Video coming soon".
