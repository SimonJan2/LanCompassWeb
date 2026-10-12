# Videos

The home page has three video slots. Each recording lives in the folder of the product theme
it was recorded in: `light/` (light and auto builds) and `nightwire/` (dark and auto builds).
Until a file exists in either folder, its slot shows "Video coming soon". Rebuild after adding
files. `src/lib/media.ts` resolves theme → page language → fallback (the other language, then
the other folder).

| Slot                   | Key                      | Recording                 | Poster                    | Captions (WebVTT, timed to that recording)           |
| ---------------------- | ------------------------ | ------------------------- | ------------------------- | ---------------------------------------------------- |
| Drift review queue     | `drift-review-queue`     | `<set>/<key>.<ui>.webm`   | `<set>/<key>.<ui>.webp`   | `<set>/<key>.<ui>.en.vtt`, `<set>/<key>.<ui>.he.vtt` |
| Documented vs observed | `documented-vs-observed` | same pattern              | same pattern              | same pattern                                         |
| Hebrew, right to left  | `hebrew-native`          | same pattern, `<ui>` = he | same pattern, `<ui>` = he | same pattern                                         |

`<set>` is `light` or `nightwire`; `<ui>` is the product's interface language (`en` or `he`).
The English page shows the `en` variant and the Hebrew page the `he` variant; `hebrew-native`
is always `he`. Record them with `scripts/record-video.mjs <key>` (README → Screenshots) into
`media-library/videos/<set>-<ui>/`, then copy them here under these names (posters as WebP), or pass `--publish`.

Videos never autoplay, have no sound, and load nothing until the visitor scrolls near them or
presses play. No caption track is marked `default` (a default track is fetched with the page);
both are in the player's menu. When captions turn on, `src/scripts/site.ts` makes the page
language's track the showing one; after that the visitor's own choice in the menu stands.

Every recording here comes from `scripts/record-video.mjs` (W1.3 storyboards): a title card,
five steps and an end card, 1280 × 720, at most 45 s and 10 MB. Each `.vtt` starts with a
`NOTE storyboard <key>` line, and `tests/media.spec.ts` checks the cue count against the
storyboard. `record-video.mjs <key> --publish` copies a recording here under these names.
