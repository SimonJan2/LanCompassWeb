/**
 * The one script every page loads (under 1 KB): header hairline on scroll, the
 * mobile menu sheet and closing disclosure menus. Everything works without it;
 * it only enhances. Section reveals are CSS scroll-driven animations (global.css).
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

headerOnScroll();
mobileMenu();
disclosures();
