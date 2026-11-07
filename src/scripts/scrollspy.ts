/** Product page sub-navigation: marks the section in view with aria-current (~0.5 KB). */
const links = new Map<string, HTMLAnchorElement>();
document.querySelectorAll<HTMLAnchorElement>("[data-spy-link]").forEach((a) => {
  links.set(a.dataset["spyLink"] ?? "", a);
});
const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-spy-section]"));

if (links.size > 0 && sections.length > 0 && "IntersectionObserver" in window) {
  const visible = new Set<string>();
  const mark = () => {
    const current = sections.find((s) => visible.has(s.id))?.id;
    links.forEach((link, id) => {
      if (id === current) {
        link.setAttribute("aria-current", "true");
        link.scrollIntoView({ block: "nearest", inline: "nearest" });
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      }
      mark();
    },
    { rootMargin: "-30% 0px -60% 0px" },
  );
  sections.forEach((s) => observer.observe(s));
}

// W10: the bar scrolls sideways when its tabs do not fit, and a browser does not scroll a focused
// element that is already partly in view: Tab onto the last tab at 1440 px left 46 of its 82 px
// clipped. Bring the focused tab wholly into the bar.
document.querySelector("[data-scrollspy] ul")?.addEventListener("focusin", (e) => {
  (e.target as HTMLElement).scrollIntoView({ block: "nearest", inline: "nearest" });
});
