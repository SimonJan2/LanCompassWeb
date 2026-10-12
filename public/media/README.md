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
`media-library/videos/<set>-<ui>/`, then copy them here under these names (posters as WebP).

Videos never autoplay and load nothing until the visitor scrolls near them or presses play.
No caption track is marked `default`; both are in the player's menu.
