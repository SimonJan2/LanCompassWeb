# Videos

The home page has three video slots. Each recording lives in the folder of the product theme
it was recorded in (W5): `survey/` (Survey: light and auto builds) and `night-chart/` (Night
chart: dark and auto builds) — the product's official pair, which is the site's own. Until a
file exists in either folder, its slot shows "Video coming soon". Rebuild after adding files.
`src/lib/media.ts` resolves theme → page language → fallback (the other language, then the other
folder).

| Slot                   | Key                      | Recording                 | Poster                    | Captions (WebVTT, timed to that recording)           |
| ---------------------- | ------------------------ | ------------------------- | ------------------------- | ---------------------------------------------------- |
| Drift review queue     | `drift-review-queue`     | `<set>/<key>.<ui>.webm`   | `<set>/<key>.<ui>.webp`   | `<set>/<key>.<ui>.en.vtt`, `<set>/<key>.<ui>.he.vtt` |
| Documented vs observed | `documented-vs-observed` | same pattern              | same pattern              | same pattern                                         |
| Hebrew, right to left  | `hebrew-native`          | same pattern, `<ui>` = he | same pattern, `<ui>` = he | same pattern                                         |

`<set>` is `survey` or `night-chart`; `<ui>` is the product's interface language (`en` or
`he`). The English page shows the `en` variant and the Hebrew page the `he` variant;
`hebrew-native` is always `he`. Record them with `scripts/record-video.mjs <key>` on the capture
stack (`scripts/capture-stack/README.md`) into `media-library/videos/<set>-<ui>/`, then pass
`--publish` to copy them here under these names (posters as WebP).

Videos never autoplay, have no sound, and load nothing until the visitor scrolls near them or
presses play. No caption track is marked `default` (a default track is fetched with the page);
both are in the player's menu. When captions turn on, `src/scripts/site.ts` makes the page
language's track the showing one; after that the visitor's own choice in the menu stands. Every
Hebrew cue starts with U+200F, so it reads right to left whatever its first word is.

Every recording here comes from `scripts/record-video.mjs` and the storyboards in
`src/content/videos.json` (W5): a title card, five steps and an end card, 1280 × 720, at most 45 s
and 10 MB. Each `.vtt` starts with a `NOTE storyboard <key>` line, and `tests/media.spec.ts`
checks the cue count against the storyboard. Each slot links ("What the video shows") to
`/videos/`, which lists the same steps: the videos' text alternative.
