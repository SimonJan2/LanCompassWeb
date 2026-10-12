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
