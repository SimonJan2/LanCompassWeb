#!/usr/bin/env node
/**
 * Captures the site's product screens from the capture stack: the signed release bundle on its
 * own throwaway Compose project (scripts/capture-stack/README.md), in the product's official
 * themes, Survey (`survey`, the light set) and Night chart (`night-chart`, the dark set), in
 * English and Hebrew (W3); since W11 every slot that draws a screen gets a crop of its own size
 * around the one thing its caption names (src/content/screen-slots.json).
 *
 *   LANCOMPASS_DEMO_URL=http://127.0.0.1:4186 LANCOMPASS_DEMO_USER=… LANCOMPASS_DEMO_PASS=… \
 *   LANCOMPASS_CAPTURE_THEME=survey node scripts/capture-screenshots.mjs [--check] \
 *     [--keys dashboard,rack] [--locales en,he] [--probe <key>]
 *   LANCOMPASS_CAPTURE_THEME=survey node scripts/capture-screenshots.mjs --derive
 *
 * The browser renders the product's 1440 × 900 CSS px window at device scale 3. Per key and
 * locale it writes into media-library/screens/<set>/<locale>/:
 *   <key>.png               the full window, 2880 × 1800 (scaled from the render at device scale 3)
 *   <key>.<slot>.png        per slot the key appears in (screen-slots.json): a clip of the
 *                           slot's crop size (CSS px) around the slot's task focus, inside the
 *                           window, scaled to the slot's serve width (two pixels per CSS px of
 *                           the slot as drawn, from the render at device scale 3: never enlarged)
 *   <key>.<slot>-phone.png  the same for the slot's phone crop, where it has one
 * then derives the served files (--derive does only this, without a browser):
 * public/screens/<set>/<locale>/<key>.<slot>[-phone].webp, <key>.loop.webp (the loop's whole
 * window at its serve width) and <key>.webp (the whole window, 2880 px, for a figure's "Open the
 * full screen"). It merges into src/content/screen-anchors.json the key's named anchors
 * ({ name, x, y, w, h } in units of 2 per CSS px, inside each picture; an anchor outside a crop
 * is absent for that crop) with each crop's clip in CSS px, and into
 * media-library/screens/CAPTURED.json the capture's record (product version, bundle checksum,
 * release key, capture date, demo load time, routes, ready selectors, each slot's focus and
 * clip, staged writes).
 *
 * The clip: centred on the focus when the focus is smaller, from its start edge when larger —
 * its left in English, its right in Hebrew (the product mirrors itself) — then kept inside the
 * window. A focus outside the window is scrolled into view first.
 *
 * --check   walks every key, locale and slot and fails on a missing route, element or focus, or
 *           a focus that stays outside the window; writes nothing.
 * --probe   for one key: the page's data-* attributes and headings, each slot's focus box and
 *           clip, and a screenshot of the window (LANCOMPASS_PROBE_DIR, default .tmp/probe).
 *
 * Theme and language live in the capture browser's localStorage (`lancompass:prefs`), set
 * before the first page load and checked before every frame (html[data-theme], lang, dir).
 * Ids (the site Demo HQ, the rack DC-A01, the prefix 10.130.100.0/24, the two demo designs, an
 * address to ask the map about) are looked up through the product's API at capture time. The
 * capture only navigates, scrolls, hovers, selects and opens panels; the writes a frame needs
 * are made beforehand by scripts/capture-stack/api.mjs (`stage`) on the throwaway stack only.
 * Credentials come only from LANCOMPASS_DEMO_USER / LANCOMPASS_DEMO_PASS and are never written.
 * Run it in the Playwright container (README.md → Screenshots).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const check = flag("--check");
const probe = option("--probe");
const deriveOnly = flag("--derive");

const base = (process.env.LANCOMPASS_DEMO_URL || "http://127.0.0.1:4186").replace(/\/$/, "");
const user = process.env.LANCOMPASS_DEMO_USER || "";
const pass = process.env.LANCOMPASS_DEMO_PASS || "";
/** The capture set → the product's theme id (lib/theme-registry.ts at v0.7.0). */
const themes = { survey: "survey", "night-chart": "night-chart" };
const set = process.env.LANCOMPASS_CAPTURE_THEME || "survey";
if (!(set in themes)) {
  console.error(`capture: LANCOMPASS_CAPTURE_THEME must be survey or night-chart (got "${set}")`);
  process.exit(2);
}
const productTheme = themes[set];
const colorScheme = set === "survey" ? "light" : "dark";
const libraryRoot = join(root, "media-library", "screens", set);
const servedRoot = join(root, "public", "screens", set);
const anchorsFile = join(root, "src", "content", "screen-anchors.json");
const recordFile = join(root, "media-library", "screens", "CAPTURED.json");
const slotsFile = join(root, "src", "content", "screen-slots.json");
const probeDir = process.env.LANCOMPASS_PROBE_DIR || join(root, ".tmp", "probe");
const locales = (option("--locales") || "en,he").split(",");
const VIEW = { width: 1440, height: 900 };
/** The render's device scale: every picture is scaled down from it, never up. */
const RENDER = 3;
/** The record's full window: two pixels per CSS px (W3's 2880 × 1800). */
const FULL = 2;
/** Anchors are stored in units of 2 per CSS px (W3's image pixels), whatever the file's size. */
const UNIT = 2;
/** The space kept around a focus that fits its clip, CSS px. */
const PAD = 16;

const readJson = (file, fallback) =>
  existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback;
const slotTable = readJson(slotsFile, null);
if (!slotTable) {
  console.error(`capture: ${slotsFile} is missing`);
  process.exit(2);
}

/**
 * The pictures a key is cut into: one per slot kind that shows it, plus the slot's phone crop.
 * { name: "figure" | "figure-phone" | …, slot, width, height (CSS px), serve (px) }.
 */
function picturesOf(key) {
  const out = [];
  for (const [slot, s] of Object.entries(slotTable.slots)) {
    if (!s.keys.includes(key)) continue;
    if (s.crop) out.push({ name: slot, slot, ...s.crop });
    if (s.phone) out.push({ name: `${slot}-phone`, slot, ...s.phone });
  }
  return out;
}

/** The served files a key needs beyond its crops: the loop's window, a figure's full window. */
function wholeWindowsOf(key) {
  const out = [];
  for (const [slot, s] of Object.entries(slotTable.slots)) {
    if (!s.keys.includes(key)) continue;
    if (s.full) out.push({ file: `${key}.${slot}.webp`, serve: s.full.serve });
    if (slot === "figure") out.push({ file: `${key}.webp`, serve: VIEW.width * FULL });
  }
  return out;
}

/**
 * The fifteen keys (DECISIONS.md D-SCREENS). route(ids, locale) builds the path; follow opens
 * the first matching link; ready proves the screen rendered; prepare does view-only steps;
 * anchors are up to four named elements (the notes of src/content/copy/*.ts → figures name
 * them). The task focus of each slot is in screen-slots.json → focus.
 */
const screens = [
  {
    key: "dashboard",
    route: () => "/",
    ready: '[data-tour-id="tour:dash-grid"]',
    anchors: [{ name: "grid", selector: '[data-tour-id="tour:dash-grid"]' }],
  },
  {
    key: "ipam-tree",
    route: () => "/tree",
    ready: '[role="tree"] [role="treeitem"]',
    prepare: async (page, ids) => {
      // Demo HQ's branch, expanded (view state only).
      const item = page.locator('[role="treeitem"]', { hasText: ids.siteName }).first();
      if ((await item.count()) && (await item.getAttribute("aria-expanded")) === "false")
        await item
          .locator("button, [aria-label]")
          .first()
          .click({ timeout: 3000 })
          .catch(() => {});
    },
    anchors: [{ name: "tree", selector: '[role="tree"]' }],
  },
  {
    key: "rack",
    route: (ids) => `/racks/${ids.rackId}`,
    ready: "main svg",
    anchors: [{ name: "elevation", spec: { selector: "main svg", largest: true } }],
  },
  {
    key: "topology-observed",
    route: () => "/review",
    follow: 'a[href*="/topology?"][href*="focus=edge:obs-"]',
    ready: ".react-flow__edge.topo-focus",
    anchors: [{ name: "edge", selector: ".react-flow__edge.topo-focus" }],
  },
  {
    key: "review",
    route: () => "/review",
    ready: "[data-page-meta]",
    // The ghost-link section at the top of the window (the page opens on "Monitoring
    // incidents 0", an empty group the frame-quality list keeps out of a frame).
    prepare: async (page) => {
      await page.evaluate(() => {
        let el = document.querySelector('a[href*="focus=edge:obs-"]');
        while (el && el !== document.body) {
          const cs = getComputedStyle(el);
          if (
            el.tagName === "SECTION" ||
            (parseFloat(cs.borderTopWidth) > 0 && el.offsetWidth > 600)
          )
            break;
          el = el.parentElement;
        }
        if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 80);
      });
      await page.waitForTimeout(600);
    },
    anchors: [
      { name: "summary", selector: "[data-page-meta]" },
      {
        name: "ghost-links",
        spec: { selector: 'a[href*="focus=edge:obs-"]', card: 600 },
      },
    ],
  },
  {
    key: "nac",
    route: () => "/nac",
    ready: "[data-nac-banner]",
    anchors: [{ name: "mode", selector: "[data-nac-banner]" }],
  },
  {
    key: "compliance",
    route: () => "/reports",
    ready: "#report-compliance",
    scrollTo: "#report-compliance",
    anchors: [{ name: "section", selector: "#report-compliance" }],
  },
  {
    key: "discovery-queue",
    route: () => "/discovery",
    ready: "[data-queue] li[data-queue-group]",
    anchors: [
      { name: "queue", selector: "[data-queue]" },
      { name: "first-group", selector: "[data-queue] li[data-queue-group]" },
    ],
  },
  {
    key: "map-ages",
    route: (ids) => `/topology?scope=site:${ids.siteId}&view=1&since=7d`,
    ready: ".topo-canvas .react-flow__edge",
    // One line's card says how old it is: click a line (view state; view=1 keeps it read-only).
    // Prefer a line verified on the wire ("Verified on the wire … ago"), else any line's age.
    prepare: async (page) => {
      const verified = /Verified on the wire|אומת ברשת לפני/;
      const anyAge = /verified on the wire|אומת ברשת/i;
      // The click goes to the edge element itself (no coordinates), so it can never land on a
      // node and open a device page; a changed URL is undone.
      const start = page.url();
      const edges = page.locator(".react-flow__edge");
      const n = Math.min(await edges.count(), 40);
      let fallback = -1;
      const at = async (i) => {
        const b = await edges
          .nth(i)
          .boundingBox()
          .catch(() => null);
        return b ? { clientX: b.x + b.width / 2, clientY: b.y + b.height / 2 } : {};
      };
      for (let i = 0; i < n; i++) {
        await edges
          .nth(i)
          .dispatchEvent("click", await at(i))
          .catch(() => {});
        await page.waitForTimeout(500);
        if (page.url() !== start) {
          await page.goto(start, { waitUntil: "networkidle" });
          continue;
        }
        const text = await page.locator("body").innerText();
        if (verified.test(text)) return;
        if (fallback < 0 && anyAge.test(text)) fallback = i;
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }
      if (fallback >= 0) {
        await edges
          .nth(fallback)
          .dispatchEvent("click", await at(fallback))
          .catch(() => {});
        await page.waitForTimeout(600);
      }
    },
    anchors: [
      { name: "lens", selector: "[data-since-picker]" },
      // W11: the note names a cable's card, so the anchor is the open card itself.
      { name: "canvas", spec: { text: "verified on the wire|אומת ברשת", card: 250 } },
    ],
  },
  {
    key: "ask-the-map",
    route: (ids, locale) =>
      `/topology?scope=site:${ids.siteId}&view=1&q=${encodeURIComponent(
        `${locale === "he" ? "איפה" : "where is"} ${ids.askAbout}`,
      )}`,
    ready: "[data-question-answer]",
    anchors: [{ name: "answer", selector: "[data-question-answer]" }],
  },
  {
    key: "design-studio",
    route: (ids, locale) => `/topology?d=${locale === "he" ? ids.designHe : ids.designEn}`,
    ready: ".design-canvas",
    // One object selected (the switch the staged comment is on), the inspector's Style open.
    prepare: async (page) => {
      const node = page
        .locator('.react-flow__node[data-id*="-sw"], .react-flow__node[data-id*="core"]')
        .first();
      await node.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(800);
      const style = page.getByRole("button", { name: /^(Style|סגנון)$/ }).first();
      if (await style.count()) await style.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(800);
    },
    anchors: [
      { name: "canvas", selector: ".design-canvas" },
      { name: "selected", selector: ".react-flow__node.selected" },
    ],
  },
  {
    key: "rack-studio",
    route: (ids) => `/racks/${ids.rackId}?lens=power`,
    ready: '[data-lens="power"][aria-pressed="true"]',
    anchors: [
      { name: "rack", spec: { selector: "main svg", largest: true } },
      { name: "lens", selector: '[data-lens="power"]' },
    ],
  },
  {
    key: "ip-plan",
    route: (ids) => `/prefixes/${ids.prefixId}?tab=plan&view=grid`,
    ready: "[data-address-map]",
    anchors: [{ name: "map", selector: "[data-address-map]" }],
  },
  {
    key: "licence",
    route: () => "/settings/license",
    ready: '[data-license-state="evaluation"]',
    anchors: [{ name: "state", selector: '[data-license-state="evaluation"]' }],
  },
  {
    key: "gallery",
    route: () => "/gallery",
    ready: '[data-gallery-collection="showcase"]',
    anchors: [{ name: "showcase", selector: '[data-gallery-collection="showcase"]' }],
  },
];

/**
 * The box (CSS px, in the window) of a focus or anchor spec, measured in the page:
 *   selector  the first visible match (or, with largest, the largest one)
 *   text      the first leaf element in <main> (else <body>) whose text matches this pattern
 *   card      climb from the match to the nearest <section> or bordered box at least this wide
 *   count     the union of the first n visible matches of selector (rows of a list)
 *   union     the union of each selector's first visible match
 *   scroll    true: when the box is not wholly inside the window, scroll it to the middle first
 * Returns null when nothing matches.
 */
function measure(spec) {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== "hidden";
  };
  const rect = (els) => {
    const rs = els.map((e) => e.getBoundingClientRect());
    if (!rs.length) return null;
    const x = Math.min(...rs.map((r) => r.left));
    const y = Math.min(...rs.map((r) => r.top));
    return {
      x,
      y,
      width: Math.max(...rs.map((r) => r.right)) - x,
      height: Math.max(...rs.map((r) => r.bottom)) - y,
    };
  };
  const pick = (s) => {
    let els = [];
    if (s.text) {
      const re = new RegExp(s.text, "i");
      const scope = document.querySelector("main") ?? document.body;
      const leaf = [...scope.querySelectorAll("*")].find(
        (e) => e.children.length === 0 && re.test(e.textContent || "") && visible(e),
      );
      const any =
        leaf ??
        [...document.body.querySelectorAll("*")].find(
          (e) => e.children.length === 0 && re.test(e.textContent || "") && visible(e),
        );
      if (any) els = [any];
    } else if (s.selector) {
      const all = [...document.querySelectorAll(s.selector)].filter(visible);
      if (s.largest) {
        all.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return rb.width * rb.height - ra.width * ra.height;
        });
        els = all.slice(0, 1);
      } else els = all.slice(0, s.count ?? 1);
    }
    if (s.card && els[0]) {
      let el = els[0];
      while (el && el !== document.body) {
        const cs = getComputedStyle(el);
        if (
          el.tagName === "SECTION" ||
          (parseFloat(cs.borderTopWidth) > 0 && el.offsetWidth >= s.card)
        )
          break;
        el = el.parentElement;
      }
      els = el && el !== document.body ? [el] : [];
    }
    return els;
  };
  // A union is each part's first match (a part is a selector or a spec of its own).
  const find = () =>
    spec.union
      ? spec.union.map((s) => pick(typeof s === "string" ? { selector: s } : s)[0]).filter(Boolean)
      : pick(spec);
  let els = find();
  let box = rect(els);
  // Scroll only when the focus's top is outside the window, or the clip (spec.need px tall)
  // would not fit below the focus's top; a focus taller than the clip goes to the top (its start
  // is what a crop shows), a smaller one to the middle.
  const need = spec.need ?? 200;
  if (box && spec.scroll && (box.y < 0 || box.y + Math.min(box.height, need) > innerHeight)) {
    // Clear of the product's page bar, which stays on top as the page scrolls (view state in
    // the capture browser only).
    els[0].style.scrollMarginTop = "120px";
    els[0].scrollIntoView({
      block: box.height > need ? "start" : "center",
      inline: "nearest",
    });
    els = find();
    box = rect(els);
  }
  return box;
}

/** A clip of size (w, h) CSS px around a box: centred when the box fits, from its start edge
 *  (left, or right when rtl; with edge "end", the other one) when it does not, `pad` px outside
 *  it, then kept inside the window. */
function clipAround(box, w, h, rtl, pad = PAD, edge = "start", fit = "centre") {
  const fromRight = rtl !== (edge === "end");
  let x;
  if (box.width + 2 * pad <= w && fit !== "start") x = box.x + box.width / 2 - w / 2;
  else x = fromRight ? box.x + box.width + pad - w : box.x - pad;
  let y;
  if (box.height + 2 * pad <= h) y = box.y + box.height / 2 - h / 2;
  else y = box.y - pad;
  x = Math.max(0, Math.min(x, VIEW.width - w));
  y = Math.max(0, Math.min(y, VIEW.height - h));
  return { x: Math.round(x), y: Math.round(y), width: w, height: h };
}

/** A box in anchor units (2 per CSS px), clipped to an area (CSS px) and made relative to its
 *  origin; null when less than 4 CSS px of it lies inside the area. */
function toUnits(box, area) {
  const x0 = Math.max(box.x, area.x);
  const y0 = Math.max(box.y, area.y);
  const x1 = Math.min(box.x + box.width, area.x + area.width);
  const y1 = Math.min(box.y + box.height, area.y + area.height);
  if (x1 - x0 < 4 || y1 - y0 < 4) return null;
  // Round the edges, not the size, so an anchor never ends a unit past its picture.
  const left = Math.round((x0 - area.x) * UNIT);
  const top = Math.round((y0 - area.y) * UNIT);
  return {
    x: left,
    y: top,
    w: Math.round((x1 - area.x) * UNIT) - left,
    h: Math.round((y1 - area.y) * UNIT) - top,
  };
}

/** The served WebP files of one set, from the record's PNGs (never enlarged). */
async function derive(sharp, keys, locs) {
  const written = [];
  for (const locale of locs) {
    const lib = join(libraryRoot, locale);
    if (!existsSync(lib)) continue;
    const out = join(servedRoot, locale);
    mkdirSync(out, { recursive: true });
    for (const key of keys) {
      for (const p of picturesOf(key)) {
        const src = join(lib, `${key}.${p.name}.png`);
        if (!existsSync(src)) continue;
        const file = `${key}.${p.name}.webp`;
        // A slot may ask for a lower quality (screen-slots.json: What's new loads before the
        // English hero paints, so its bytes count against the home page's LCP budget).
        await sharp(src)
          .webp({ quality: p.quality ?? 80, smartSubsample: true, effort: 6 })
          .toFile(join(out, file));
        written.push(`${set}/${locale}/${file}`);
      }
      const full = join(lib, `${key}.png`);
      if (!existsSync(full)) continue;
      for (const w of wholeWindowsOf(key)) {
        await sharp(full)
          .resize({ width: Math.min(w.serve, VIEW.width * FULL) })
          .webp({ quality: 80, smartSubsample: true, effort: 6 })
          .toFile(join(out, w.file));
        written.push(`${set}/${locale}/${w.file}`);
      }
    }
  }
  return written;
}

const keysWanted = option("--keys") ? option("--keys").split(",") : null;
const selected = probe
  ? screens.filter((s) => s.key === probe)
  : screens.filter((s) => !keysWanted || keysWanted.includes(s.key));

const { default: sharp } = await import("sharp");

if (deriveOnly) {
  const written = await derive(
    sharp,
    selected.map((s) => s.key),
    locales,
  );
  console.log(`capture: derived ${written.length} served files (${set})`);
  console.log(`FINISHED-capture-${set}-derive`);
  process.exit(0);
}

if (!user || !pass) {
  console.error(
    "capture: LANCOMPASS_DEMO_USER and LANCOMPASS_DEMO_PASS must be set; nothing captured.",
  );
  process.exit(2);
}

const { chromium } = await import("@playwright/test");

/** Text that must never be in a kept frame (the W3 frame-quality list). */
const forbiddenText = [
  /background work/i,
  /העבודה ברקע/,
  /0 VRFs/i,
  /unmatched/i,
  /evaluation ends|licen[cs]e (expired|ends)/i,
];

async function signIn(page) {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  if (!page.url().includes("/login")) return;
  await page
    .locator('input[name="username"], input[autocomplete="username"], input[type="text"]')
    .first()
    .fill(user);
  await page.locator('input[type="password"]').first().fill(pass);
  await Promise.all([
    page.waitForLoadState("networkidle"),
    page.locator('button[type="submit"]').first().click(),
  ]);
  await page.waitForTimeout(1500);
  if (page.url().includes("/login")) throw new Error("sign-in failed");
}

/** The ids the routes need, through the product's API with the browser's session. */
async function lookUp(request) {
  const get = async (path) => {
    const r = await request.get(`${base}/api/v1${path}`);
    if (!r.ok()) throw new Error(`GET ${path} → ${r.status()}`);
    return r.json();
  };
  const list = (x) => (Array.isArray(x) ? x : (x?.items ?? x?.results ?? []));
  const sites = list(await get("/sites"));
  // The demo's HQ is named in both languages ("מטה דמו — Demo HQ").
  const site = sites.find((s) => String(s.name).includes("Demo HQ"));
  const racks = list(await get("/racks"));
  const rack = racks.find((r) => r.name === "DC-A01");
  const prefixes = list(await get("/prefixes"));
  const prefix = prefixes.find((p) =>
    [p.cidr, p.prefix, p.network].some((v) => String(v) === "10.130.100.0/24"),
  );
  const diagrams = list(await get("/diagrams"));
  const en = diagrams.find((d) => d.name === "Branch refresh");
  const he = diagrams.find((d) => d.name === "תכנון DMZ חדש");
  const missing = [];
  if (!site) missing.push("site Demo HQ");
  if (!rack) missing.push("rack DC-A01");
  if (!prefix) missing.push("prefix 10.130.100.0/24");
  if (!en) missing.push("design Branch refresh");
  if (!he) missing.push("design תכנון DMZ חדש");
  // An address the map can place on a switch port: ask the product's own "where" lookup.
  let askAbout = process.env.LANCOMPASS_ASK_ABOUT || null;
  if (!askAbout) {
    // Addresses cabled to a switch port first (connected_interface_id), the HQ subnet first.
    const all = list(await get("/addresses?limit=1000").catch(() => []));
    const addresses = all
      .filter((a) => a.connected_interface_id != null)
      .sort((a, b) => Number(b.prefix_id === prefix?.id) - Number(a.prefix_id === prefix?.id));
    for (const a of addresses.slice(0, 60)) {
      const ip = a.address ?? a.ip;
      if (!ip) continue;
      const w = await request.get(`${base}/api/v1/topology/where?q=${encodeURIComponent(ip)}`);
      if (!w.ok()) continue;
      const hit = list(await w.json())[0];
      if (hit?.port_name && hit?.switch_name) {
        askAbout = String(ip).split("/")[0];
        break;
      }
    }
    // The 0.7.0 demo estate links no address to an edge port (no poll has run), so "where is"
    // answers with the address's device: an HQ address that belongs to one.
    if (!askAbout) {
      const owned = all.find((a) => a.device_id != null && a.prefix_id === prefix?.id);
      if (owned) askAbout = String(owned.address).split("/")[0];
    }
  }
  if (!askAbout) missing.push("an address the map can place");
  return {
    ids: {
      siteId: site?.id,
      siteName: site?.name,
      rackId: rack?.id,
      prefixId: prefix?.id,
      designEn: en?.id,
      designHe: he?.id,
      askAbout,
    },
    missing,
  };
}

async function frameState(page, locale) {
  const s = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    lang: document.documentElement.lang,
    dir: document.documentElement.dir || getComputedStyle(document.documentElement).direction,
  }));
  const problems = [];
  if (s.theme !== productTheme) problems.push(`theme ${s.theme}, want ${productTheme}`);
  if (!String(s.lang).startsWith(locale)) problems.push(`lang ${s.lang}, want ${locale}`);
  if ((locale === "he") !== (s.dir === "rtl")) problems.push(`dir ${s.dir}`);
  return { state: s, problems };
}

/** The text drawn inside an area of the window (CSS px): the frame-quality check, per picture. */
async function visibleText(page, area) {
  return page.evaluate((a) => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom < a.y || r.top > a.y + a.height || r.right < a.x || r.left > a.x + a.width)
        continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
      const t = (n.textContent || "").trim();
      if (t) out.push(t);
    }
    return out.join("\n");
  }, area);
}

async function probeDom(page) {
  return page.evaluate(() => {
    const attrs = new Map();
    for (const el of document.querySelectorAll("main *")) {
      for (const a of el.attributes) {
        if (!a.name.startsWith("data-") || a.name.startsWith("data-radix")) continue;
        const k = `${el.tagName.toLowerCase()}[${a.name}${a.value && a.value.length < 30 ? `="${a.value}"` : ""}]`;
        attrs.set(k, (attrs.get(k) ?? 0) + 1);
      }
    }
    const heads = [...document.querySelectorAll("main h1, main h2, main h3")]
      .slice(0, 15)
      .map((h) => h.textContent.trim().slice(0, 60));
    return { attrs: [...attrs.entries()].slice(0, 120), heads };
  });
}

/** The page and its scrolling boxes back at their starting scroll. */
async function scrollHome(page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const el of document.querySelectorAll("*"))
      if (el.scrollTop || el.scrollLeft) {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      }
  });
  await page.waitForTimeout(300);
}

const browser = await chromium.launch();
const failures = [];
const notes = [];
const captured = [];
const anchors = readJson(anchorsFile, {});
const record = readJson(recordFile, {});
const focusTable = slotTable.focus ?? {};
let idsUsed = null;
try {
  for (const locale of locales) {
    const rtl = locale === "he";
    const context = await browser.newContext({
      viewport: VIEW,
      deviceScaleFactor: RENDER,
      locale: rtl ? "he-IL" : "en-US",
      reducedMotion: "reduce",
      colorScheme,
    });
    await context.addInitScript(
      ([lang, theme]) => {
        try {
          const prefs = JSON.parse(localStorage.getItem("lancompass:prefs") || "{}");
          localStorage.setItem(
            "lancompass:prefs",
            // Browser-only flags: no tour, no first-run checklist; comfortable density; the
            // design studio's stencil palette folded (W11: the English design's selected
            // switch then sits clear of the inspector).
            JSON.stringify({
              ...prefs,
              theme,
              language: lang,
              tourActive: false,
              tourDone: true,
              checklistDismissed: true,
              density: "comfortable",
              designPalette: false,
            }),
          );
        } catch {
          /* first visit */
        }
      },
      [locale, productTheme],
    );
    const page = await context.newPage();
    await signIn(page);
    const { ids, missing } = await lookUp(context.request);
    idsUsed = ids;
    if (missing.length) failures.push(`${locale}: ids missing — ${missing.join(", ")}`);
    for (const screen of selected) {
      const tag = `${set}/${locale}/${screen.key}`;
      try {
        const path = screen.route(ids, locale);
        const response = await page.goto(`${base}${path}`, {
          waitUntil: "networkidle",
          timeout: 45000,
        });
        if (!response || response.status() >= 400 || page.url().includes("/login"))
          throw new Error(`route ${path}: HTTP ${response?.status()}`);
        if (screen.follow) {
          const link = page.locator(screen.follow).first();
          await link.waitFor({ timeout: 15000 });
          const href = await link.getAttribute("href");
          await page.goto(new URL(href, base).toString(), {
            waitUntil: "networkidle",
            timeout: 45000,
          });
        }
        await page
          .locator(probe ? "main" : screen.ready)
          .first()
          .waitFor({ timeout: 20000 });
        if (probe) await page.waitForTimeout(3000);
        if (screen.prepare) await screen.prepare(page, ids, locale);
        if (screen.scrollTo) {
          await page
            .locator(screen.scrollTo)
            .first()
            .evaluate((el) =>
              window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 72),
            );
        }
        // Nothing the script left: no hover, no focus ring.
        await page.mouse.move(VIEW.width - 4, VIEW.height - 4);
        await page.evaluate(
          () => document.activeElement instanceof HTMLElement && document.activeElement.blur(),
        );
        await page.waitForTimeout(1200);
        const { problems } = await frameState(page, locale);
        if (problems.length) throw new Error(`frame state: ${problems.join("; ")}`);
        const window_ = { x: 0, y: 0, ...VIEW };
        const textAll = await visibleText(page, window_);
        const bad = forbiddenText.filter((re) => re.test(textAll)).map(String);
        if (bad.length) notes.push(`${tag} (window): frame text matches ${bad.join(", ")}`);
        const measureAnchors = async () => {
          const named = [];
          for (const a of screen.anchors.slice(0, 4)) {
            const b = await page
              .evaluate(measure, a.spec ?? { selector: a.selector })
              .catch(() => null);
            if (b && b.width >= 4 && b.height >= 4) named.push({ name: a.name, box: b });
          }
          return named;
        };
        // The whole window first, at the screen's own scroll.
        const fullShot = check ? null : await page.screenshot({ fullPage: false });
        const fullNamed = await measureAnchors();
        const pictures = picturesOf(screen.key);
        const cut = [];
        if (probe) {
          console.log(JSON.stringify({ tag, url: page.url(), ...(await probeDom(page)) }, null, 1));
          mkdirSync(probeDir, { recursive: true });
          await page.screenshot({
            path: join(probeDir, `${set}-${locale}-${screen.key}.png`),
          });
        }
        for (const p of pictures) {
          const spec = focusTable[screen.key]?.[p.name];
          if (!spec) throw new Error(`no focus for ${screen.key} in slot ${p.name}`);
          // Into view when the clip would not fit below it, then measured again once the scroll
          // has settled.
          await page.evaluate(measure, { ...spec, scroll: true, need: p.height + PAD });
          await page.waitForTimeout(400);
          const box = await page.evaluate(measure, spec);
          if (!box || box.width < 4 || box.height < 4)
            throw new Error(`focus of ${screen.key}.${p.name} not found (${JSON.stringify(spec)})`);
          const startX = rtl ? box.x + box.width : box.x;
          if (startX < -2 || startX > VIEW.width + 2 || box.y < -2 || box.y >= VIEW.height)
            throw new Error(
              `focus of ${screen.key}.${p.name} outside the window (${JSON.stringify(box)})`,
            );
          const clip = clipAround(
            box,
            p.width,
            p.height,
            rtl,
            spec.pad ?? PAD,
            spec.edge,
            spec.fit,
          );
          const text = await visibleText(page, clip);
          const badHere = forbiddenText.filter((re) => re.test(text)).map(String);
          if (badHere.length)
            notes.push(`${tag}.${p.name}: frame text matches ${badHere.join(", ")}`);
          const named = await measureAnchors();
          const focusBox = Object.fromEntries(
            Object.entries(box).map(([k, v]) => [k, Math.round(v * 10) / 10]),
          );
          if (probe || check)
            console.log(
              `${check ? "check ok" : "probe"} ${tag}.${p.name} focus ${JSON.stringify(focusBox)} clip ${JSON.stringify(clip)} anchors ${named.map((n) => n.name).join(",") || "-"}`,
            );
          if (!check && !probe) {
            const shot = await page.screenshot({ clip });
            cut.push({ p, clip, shot, named, focusBox });
          }
          await scrollHome(page);
        }
        if (check || probe) {
          if (check) captured.push(tag);
          continue;
        }
        const lib = join(libraryRoot, locale);
        mkdirSync(lib, { recursive: true });
        await sharp(fullShot)
          .resize({ width: VIEW.width * FULL, height: VIEW.height * FULL })
          .png({ compressionLevel: 9 })
          .toFile(join(lib, `${screen.key}.png`));
        anchors[set] ??= {};
        anchors[set][locale] ??= {};
        const entry = {
          clips: {},
          full: fullNamed
            .map((n) => ({ name: n.name, ...toUnits(n.box, window_) }))
            .filter((n) => n.w),
        };
        record.keys ??= {};
        record.keys[screen.key] ??= {};
        const rec = record.keys[screen.key];
        // W3 recorded one clip and one focus per key; W11 one per slot picture.
        if (!rec.clips || typeof rec.clips !== "object") rec.clips = {};
        rec.clips[`${set}/${locale}`] = {};
        if (!rec.focus || typeof rec.focus !== "object") rec.focus = {};
        for (const { p, clip, shot, named } of cut) {
          const height = Math.round((p.serve * p.height) / p.width);
          await sharp(shot)
            .resize({ width: p.serve, height })
            .png({ compressionLevel: 9 })
            .toFile(join(lib, `${screen.key}.${p.name}.png`));
          entry.clips[p.name] = clip;
          entry[p.name] = named
            .map((n) => ({ name: n.name, ...toUnits(n.box, clip) }))
            .filter((n) => n.w);
          rec.clips[`${set}/${locale}`][p.name] = clip;
          rec.focus[p.name] = focusTable[screen.key][p.name].note ?? null;
        }
        anchors[set][locale][screen.key] = entry;
        Object.assign(rec, {
          route: screen.route(
            {
              siteId: "<Demo HQ>",
              rackId: "<DC-A01>",
              prefixId: "<10.130.100.0/24>",
              designEn: "<Branch refresh>",
              designHe: "<תכנון DMZ חדש>",
              askAbout: "<an address>",
            },
            "en",
          ),
          follow: screen.follow ?? null,
          ready: screen.ready,
        });
        delete rec.focusNote;
        captured.push(tag);
        console.log(`captured ${tag} (${cut.map((c) => c.p.name).join(", ") || "window only"})`);
      } catch (error) {
        failures.push(`${tag}: ${error.message.split("\n")[0]}`);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

if (!check && !probe && captured.length) {
  // The file's own comment is rewritten, never carried over from an older capture.
  const { $comment: _old, $comment2: _older, ...sets } = anchors;
  const ordered = {
    $comment:
      "Capture anchors: { name, x, y, w, h } in units of 2 per CSS px per set, locale and key, for the full window and for each slot's crop (its clip in CSS px under clips). Written by scripts/capture-screenshots.mjs.",
    ...sets,
  };
  writeFileSync(anchorsFile, `${JSON.stringify(ordered, null, 2)}\n`);
  const staged = process.env.LANCOMPASS_STAGED_FILE
    ? readJson(process.env.LANCOMPASS_STAGED_FILE, [])
    : (record.staged_writes ?? []);
  Object.assign(record, {
    $comment:
      "Where the site's product screens come from (W3; W11's slot crops). Written by scripts/capture-screenshots.mjs.",
    product_version: process.env.LANCOMPASS_PRODUCT_VERSION || record.product_version || null,
    bundle_sha256: process.env.LANCOMPASS_BUNDLE_SHA256 || record.bundle_sha256 || null,
    release_key_fingerprint:
      process.env.LANCOMPASS_RELEASE_FPR || record.release_key_fingerprint || null,
    captured_on: new Date().toISOString().slice(0, 10),
    demo_estate_loaded_at:
      process.env.LANCOMPASS_DEMO_LOADED_AT || record.demo_estate_loaded_at || null,
    viewport: VIEW,
    device_scale_factor: RENDER,
    full_window_pixels: { width: VIEW.width * FULL, height: VIEW.height * FULL },
    sets: [...new Set([...(record.sets ?? []), set])].sort(),
    locales: [...new Set([...(record.locales ?? []), ...locales])].sort(),
    staged_writes: staged,
  });
  mkdirSync(dirname(recordFile), { recursive: true });
  writeFileSync(recordFile, `${JSON.stringify(record, null, 2)}\n`);
  const written = await derive(
    sharp,
    selected.map((s) => s.key),
    locales,
  );
  console.log(`capture: derived ${written.length} served files`);
}
console.log(
  `capture: ${check ? "checked" : probe ? "probed" : "captured"} ${captured.length} (${set}); ids ${JSON.stringify(idsUsed)}`,
);
for (const n of notes) console.log(`capture: note ${n}`);
if (failures.length) {
  console.log(`capture: failed ${failures.length}:\n  ${failures.join("\n  ")}`);
  process.exitCode = 1;
}
console.log(`FINISHED-capture-${set}${check ? "-check" : probe ? "-probe" : ""}`);
