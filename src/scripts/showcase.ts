/**
 * W13 (DECISIONS.md D-SHOWCASE): /product's script for B and C (bundled with scrollspy.ts into
 * the page's one chunk, so no other page pays for it).
 *
 * B — the slider (CompareSlider.astro): enabled here; each input moves the boundary through one
 * custom property set in the CSSOM (no style attribute: the CSP), and the value text follows.
 *
 * C — a "Survey | Night chart" control on each figure's frame (AnnotatedScreen.astro), cloned from
 * the page's <template data-fig-sets>, so the markup is written once and nothing shows without
 * JavaScript. It defaults to the page's scheme; choosing the other set points every candidate of
 * that figure's <picture> at the other set's crop (the same file names: the marks stay), which the
 * browser fetches only then. Choosing the page's set again restores the picture as it was, and a
 * change of the page's scheme (the site switch's data-theme, or the system's under no override)
 * puts every figure back on it.
 */
const range = document.querySelector<HTMLInputElement>("[data-compare] input");
if (range) {
  const frame = range.parentElement!;
  const text = range.dataset["text"]!;
  range.disabled = false;
  range.addEventListener("input", () => {
    frame.style.setProperty("--compare", `${range.value}%`);
    range.ariaValueText = text.replace("{s}", range.value).replace("{n}", `${100 - +range.value}`);
  });
}

const control = document.querySelector<HTMLTemplateElement>("[data-fig-sets]");
if (control) {
  const root = document.documentElement;
  /** The page's own set: what its colour scheme renders (a build's theme, the system's scheme, or
   *  the switch's override — the stylesheet has already decided). */
  const pageSet = () => (getComputedStyle(root).colorScheme == "dark" ? "night-chart" : "survey");
  const figures: ((set?: string) => void)[] = [];
  document.querySelectorAll(".fig .shot").forEach((shot) => {
    const sets = control.content.firstElementChild!.cloneNode(true) as HTMLElement;
    shot.append(sets);
    const candidates: [Element, string, string][] = [];
    shot.querySelectorAll("source, img").forEach((el) => {
      const attr = el.tagName == "IMG" ? "src" : "srcset";
      candidates.push([el, attr, el.getAttribute(attr)!]);
    });
    /** Show one set's crop, or (none) the picture as built, which follows the page's scheme. */
    const show = (set?: string) => {
      for (const [el, attr, value] of candidates)
        el.setAttribute(attr, set ? value.replace(/(survey|night-chart)\//, set + "/") : value);
      for (const b of sets.children as HTMLCollectionOf<HTMLElement>)
        b.ariaPressed = `${b.dataset["set"] == (set || pageSet())}`;
    };
    sets.addEventListener("click", (e) => {
      const set = (e.target as HTMLElement).dataset["set"];
      if (set) show(set == pageSet() ? "" : set);
    });
    show();
    figures.push(show);
  });
  const reset = () => figures.forEach((show) => show());
  new MutationObserver(reset).observe(root, { attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", reset);
}
