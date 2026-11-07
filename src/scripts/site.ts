/**
 * The one script every page loads (under 2 KB): header hairline on scroll, the
 * mobile menu sheet, closing disclosure menus and the video caption language.
 * Everything works without it; it only enhances. Section reveals are CSS scroll-driven animations (global.css).
 */

function headerOnScroll(): void {
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  if (!header) return;
  const update = () => header.setAttribute("data-scrolled", String(window.scrollY > 8));
  update();
  window.addEventListener("scroll", update, { passive: true });
}

function mobileMenu(): void {
  const opener = document.querySelector<HTMLElement>("[data-menu-open]");
  const sheet = document.querySelector<HTMLDialogElement>("[data-menu-sheet]");
  if (!opener || !sheet || typeof sheet.showModal !== "function") return;
  opener.setAttribute("role", "button");
  opener.setAttribute("aria-expanded", "false");
  opener.addEventListener("click", (event) => {
    event.preventDefault();
    sheet.showModal();
    opener.setAttribute("aria-expanded", "true");
  });
  opener.addEventListener("keydown", (event) => {
    if (event.key === " ") {
      event.preventDefault();
      opener.click();
    }
  });
  sheet.querySelector("[data-menu-close]")?.addEventListener("click", () => sheet.close());
  sheet.addEventListener("close", () => {
    opener.setAttribute("aria-expanded", "false");
    opener.focus();
  });
  // Following an in-page link closes the sheet first.
  sheet
    .querySelectorAll("a")
    .forEach((link) => link.addEventListener("click", () => sheet.close()));
  // Close when the layout grows past the mobile breakpoint.
  window.matchMedia("(min-width: 960px)").addEventListener("change", (e) => {
    if (e.matches && sheet.open) sheet.close();
  });
}

function disclosures(): void {
  const menus = Array.from(
    document.querySelectorAll<HTMLDetailsElement>("details[data-disclosure]"),
  );
  if (menus.length === 0) return;
  document.addEventListener("click", (event) => {
    for (const menu of menus) {
      if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    for (const menu of menus) {
      if (menu.open) {
        menu.open = false;
        menu.querySelector("summary")?.focus();
      }
    }
  });
}

/**
 * Captions follow the page. No track is `default` (a default track is fetched with the
 * page), so when captions turn on, by the CC button, the OS caption preference or a choice
 * remembered from another site, the browser alone picks the track and may pick the other
 * language. The first time any caption track shows, on the first play or a track change,
 * the page language's track is made the showing one. After that the visitor's own choice
 * in the menu stands. Nothing here fetches a track: a track loads only once it is on.
 */
function captionLanguage(): void {
  const lang = document.documentElement.lang;
  document.querySelectorAll<HTMLVideoElement>("figure[data-video] video").forEach((video) => {
    const tracks = video.textTracks;
    let settled = false;
    const follow = () => {
      const list = Array.from(tracks);
      if (settled || !list.some((t) => t.mode === "showing")) return;
      settled = true;
      const own = list.find((t) => t.language === lang);
      if (!own) return;
      for (const t of list) if (t !== own && t.mode === "showing") t.mode = "disabled";
      own.mode = "showing";
    };
    video.addEventListener("play", follow);
    tracks.addEventListener("change", follow);
  });
}

headerOnScroll();
mobileMenu();
disclosures();
captionLanguage();

/**
 * W13 (DECISIONS.md D-SWITCH): the light/dark switch, in an auto build only (__LC_AUTO__ is false
 * in a light or dark build, and this block is dropped there). It first applies a stored override
 * (`data-theme` "light" or "dark" in place of "auto") and sets `data-js`, which shows the switch.
 * Not before the first paint: the brief's blocking boot script in <head> cost the English home and
 * /docs/topology/ their LCP budget in auto (1,803 ms against 1,800, early or late in <head>), so
 * this is its fallback, step 3 — a brief flash, only for a visitor who chose an override. A press
 * renders the opposite of the scheme on screen; `lc-theme` is kept only when that
 * differs from the system's scheme and removed when it matches (a storage error still switches
 * this view); another tab follows through the `storage` event. Under an override, every media
 * query on the scheme (the pictures' and videos' Night chart sources, the theme-color metas)
 * becomes `all` without its scheme part for the override's own scheme and `not all` for the other,
 * and itself again when the override goes. Without an override the system's scheme decides, as
 * before: CSS and the media queries follow it on their own. What only one page has watches
 * `data-theme` there: the home's atlas previews and videos (src/scripts/home-theme.ts), /product's
 * figures (src/scripts/showcase.ts). Kept small on purpose: the form pages and /product carry it
 * within their 2,048 B (gzip) of JavaScript.
 */
if (__LC_AUTO__) {
  const root = document.documentElement;
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const keyed: [HTMLSourceElement | HTMLMetaElement, string][] = [];
  document
    .querySelectorAll<HTMLSourceElement | HTMLMetaElement>("[media*=prefers-color-scheme]")
    .forEach((el) => keyed.push([el, el.media]));
  const apply = (o: string | null) => {
    for (const [el, m] of keyed)
      el.media = !o
        ? m
        : m.includes(o + ")")
          ? m.replace(/\(prefers-color-scheme: \w+\)( and )?/, "") || "all"
          : "not all";
    // Last, so whatever watches data-theme sees the sources already pointed (the home's atlas
    // and videos: src/scripts/home-theme.ts; /product's figures: src/scripts/showcase.ts).
    root.dataset["theme"] = o || "auto";
  };
  /** Only "light" and "dark" are overrides; anything else (or nothing) is none. */
  const stored = (v: string | null | undefined) => (v == "light" || v == "dark" ? v : null);
  document.querySelectorAll("[data-theme-switch]").forEach((button) =>
    button.addEventListener("click", () => {
      const system = dark.matches ? "dark" : "light";
      // The system's scheme on screen → an override of the other; an override on screen → none.
      const o =
        (stored(root.dataset["theme"]) || system) == system
          ? system == "dark"
            ? "light"
            : "dark"
          : null;
      try {
        if (o) localStorage.setItem("lc-theme", o);
        else localStorage.removeItem("lc-theme");
      } catch {
        // No storage (a private window, blocked site data): this view still switches.
      }
      apply(o);
    }),
  );
  addEventListener("storage", () => apply(stored(localStorage.getItem("lc-theme"))));
  try {
    const o = stored(localStorage.getItem("lc-theme"));
    if (o) apply(o);
  } catch {
    // No storage: no override; the system's scheme decides.
  }
  root.dataset["js"] = "";
}
