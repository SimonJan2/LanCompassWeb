/**
 * Two sheets controller (well under 1 KB): pauses the loop while the figure is
 * offscreen or the tab is hidden. The pause switch itself is CSS-only.
 */
const figure = document.querySelector<HTMLElement>("[data-two-sheets]");

if (figure && "IntersectionObserver" in window) {
  let visible = true;
  const sync = () => figure.toggleAttribute("data-offscreen", !visible || document.hidden);
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    sync();
  }).observe(figure);
  document.addEventListener("visibilitychange", sync);
}
