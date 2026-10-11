/**
 * Drift map controller (well under 1 KB): pauses the loop while the map is
 * offscreen or the tab is hidden. The pause switch itself is CSS-only.
 */
const map = document.querySelector<HTMLElement>("[data-drift-map]");

if (map && "IntersectionObserver" in window) {
  let visible = true;
  const sync = () => map.toggleAttribute("data-offscreen", !visible || document.hidden);
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    sync();
  }).observe(map);
  document.addEventListener("visibilitychange", sync);
}
