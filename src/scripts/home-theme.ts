/**
 * W13 (DECISIONS.md D-SWITCH): on the home page of an auto build, what the site switch's override
 * needs beyond the media queries src/scripts/site.ts points:
 *  - the atlas previews (Survey only in auto, AtlasIndex.astro) show their Night chart files under
 *    a dark override, as the dark build does;
 *  - a video picks its source when the page builds it, so one that has not played since the
 *    scheme changed loads its source again on its first play — the override's recording. Not at
 *    the switch: a load() then makes Chrome fetch every video's metadata at once (the controls
 *    then show a duration the pure build's do not). A playing video keeps playing.
 * It watches <html data-theme>, which the switch sets after it has pointed the sources, and
 * applies a stored override at load too. Bundled with the home's own script (TwoSheets.astro);
 * dropped from light and dark builds (__LC_AUTO__ is false there).
 */
if (__LC_AUTO__) {
  const root = document.documentElement;
  const videos = document.querySelectorAll("video");
  const stale = new Set<HTMLVideoElement>();
  const follow = () => {
    const dark = root.dataset["theme"] == "dark";
    document.querySelectorAll<HTMLImageElement>("[data-atlas] img").forEach((img) => {
      img.src = img.src.replace(/(night-chart|survey)\//, dark ? "night-chart/" : "survey/");
    });
    videos.forEach((v) => v.played.length || stale.add(v));
  };
  videos.forEach((v) =>
    v.addEventListener("play", () => {
      if (!stale.delete(v)) return;
      v.load();
      v.play().catch(() => {});
    }),
  );
  new MutationObserver(follow).observe(root, { attributeFilter: ["data-theme"] });
  if (root.dataset["theme"] != "auto") follow();
}
