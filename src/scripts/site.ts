/**
 * The one script every page loads (~1 KB): header hairline on scroll, the
 * mobile menu sheet, closing disclosure menus, and the once-only section reveal.
 * Everything works without it; it only enhances.
 */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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

function reveal(): void {
  if (reduceMotion.matches || !("IntersectionObserver" in window)) return;
  const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
  const below = targets.filter((el) => el.getBoundingClientRect().top > window.innerHeight);
  if (below.length === 0) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        el.classList.add("reveal-shown");
        el.classList.remove("reveal-armed");
        observer.unobserve(el);
        el.addEventListener("transitionend", () => el.classList.remove("reveal-shown"), {
          once: true,
        });
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );
  for (const el of below) {
    el.classList.add("reveal-armed");
    observer.observe(el);
  }
}

headerOnScroll();
mobileMenu();
disclosures();
reveal();
