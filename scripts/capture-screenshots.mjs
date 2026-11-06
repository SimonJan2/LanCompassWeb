#!/usr/bin/env node
/**
 * Captures the site's product screens (W3) from the capture stack: the signed release bundle
 * on its own throwaway Compose project (scripts/capture-stack/README.md), in the product's
 * official themes, Survey (`survey`, the light set) and Night chart (`night-chart`, the dark
 * set), in English and Hebrew.
 *
 *   LANCOMPASS_DEMO_URL=http://127.0.0.1:4186 LANCOMPASS_DEMO_USER=… LANCOMPASS_DEMO_PASS=… \
 *   LANCOMPASS_CAPTURE_THEME=survey node scripts/capture-screenshots.mjs [--check] \
 *     [--keys dashboard,rack] [--locales en,he] [--probe <key>]
 *
 * Per key and locale it writes, at 1440 × 900 CSS px and device scale 2:
 *   src/assets/screens/<set>/<locale>/<key>.png        the full window (2880 × 1800)
 *   src/assets/screens/<set>/<locale>/<key>.focus.png  a crop around the key's focus element:
 *                                                      its box plus 24 px, at least
 *                                                      760 × 475 CSS px, inside the window
 * and a copy of both in media-library/screens/<set>/<locale>/. It merges into
 * src/content/screen-anchors.json the key's named anchors ({ name, x, y, w, h } in image
 * pixels, for the full window and the crop, with the crop's clip) and into
 * media-library/screens/CAPTURED.json the capture's record (product version, bundle checksum,
 * release key, capture date, demo load time, routes, ready and focus selectors, staged writes).
 *
 * --check   walks every key and locale and fails on a missing route or element; writes nothing.
 * --probe   prints, for one key, the page's data-* attributes and headings (to choose selectors).
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
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const check = flag("--check");
const probe = option("--probe");

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
const outRoot = process.env.LANCOMPASS_CAPTURE_DIR || join(root, "src", "assets", "screens", set);
const libraryRoot = join(root, "media-library", "screens", set);
const anchorsFile = join(root, "src", "content", "screen-anchors.json");
const recordFile = join(root, "media-library", "screens", "CAPTURED.json");
const locales = (option("--locales") || "en,he").split(",");
const VIEW = { width: 1440, height: 900 };
const SCALE = 2;
const PAD = 24;
const MIN = { width: 760, height: 475 };

/**
 * The fifteen keys (DECISIONS.md D-SCREENS). route(ids, locale) builds the path; follow opens
 * the first matching link; ready proves the screen rendered; prepare does view-only steps;
 * focus is the element the crop is cut around; anchors are up to four named elements.
 */
const screens = [
  {
    key: "dashboard",
    route: () => "/",
    ready: '[data-tour-id="tour:dash-grid"]',
    focus: '[data-tour-id="tour:dash-grid"]',
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
    focus: '[role="tree"]',
    anchors: [{ name: "tree", selector: '[role="tree"]' }],
  },
  {
    key: "rack",
    route: (ids) => `/racks/${ids.rackId}`,
    ready: "main svg",
    focus: "main svg",
    anchors: [{ name: "elevation", selector: "main svg" }],
  },
  {
    key: "topology-observed",
    route: () => "/review",
    follow: 'a[href*="/topology?"][href*="focus=edge:obs-"]',
    ready: ".react-flow__edge.topo-focus",
    focus: ".react-flow__edge.topo-focus",
    anchors: [{ name: "edge", selector: ".react-flow__edge.topo-focus" }],
  },
  {
    key: "review",
    route: () => "/review",
    ready: "[data-page-meta]",
    focus: "main",
    anchors: [{ name: "summary", selector: "[data-page-meta]" }],
  },
  {
    key: "nac",
    route: () => "/nac",
    ready: "main table, main [role=table]",
    focus: "main table, main [role=table]",
    anchors: [{ name: "table", selector: "main table, main [role=table]" }],
  },
  {
    key: "compliance",
    route: () => "/reports",
    ready: "#report-compliance",
    scrollTo: "#report-compliance",
    focus: "#report-compliance",
    anchors: [{ name: "section", selector: "#report-compliance" }],
  },
  {
    key: "discovery-queue",
    route: () => "/discovery",
    ready: "[data-queue] li[data-queue-group]",
    focus: "[data-queue]",
    anchors: [
      { name: "queue", selector: "[data-queue]" },
      { name: "first-group", selector: "[data-queue] li[data-queue-group]" },
    ],
  },
  {
    key: "map-ages",
    route: (ids) => `/topology?scope=site:${ids.siteId}&view=1&since=7d`,
    ready: ".topo-canvas .react-flow__edge",
    focus: ".topo-canvas",
    anchors: [{ name: "canvas", selector: ".topo-canvas" }],
  },
  {
    key: "ask-the-map",
    route: (ids, locale) =>
      `/topology?scope=site:${ids.siteId}&view=1&q=${encodeURIComponent(
        `${locale === "he" ? "איפה" : "where is"} ${ids.askAbout}`,
      )}`,
    ready: "[data-question-answer]",
    focus: "[data-question-answer]",
    anchors: [{ name: "answer", selector: "[data-question-answer]" }],
  },
  {
    key: "design-studio",
    route: (ids, locale) => `/topology?d=${locale === "he" ? ids.designHe : ids.designEn}`,
    ready: ".design-canvas",
    focus: ".design-canvas",
    anchors: [{ name: "canvas", selector: ".design-canvas" }],
  },
  {
    key: "rack-studio",
    route: (ids) => `/racks/${ids.rackId}?lens=power`,
    ready: '[data-lens="power"][aria-pressed="true"]',
    focus: "main svg",
    anchors: [
      { name: "rack", selector: "main svg" },
      { name: "lens", selector: '[data-lens="power"]' },
    ],
  },
  {
    key: "ip-plan",
    route: (ids) => `/prefixes/${ids.prefixId}?tab=plan&view=grid`,
    ready: "[data-address-map]",
    focus: "[data-address-map]",
    anchors: [{ name: "map", selector: "[data-address-map]" }],
  },
  {
    key: "licence",
    route: () => "/settings/license",
    ready: '[data-license-state="evaluation"]',
    focus: '[data-license-state="evaluation"]',
    anchors: [{ name: "state", selector: '[data-license-state="evaluation"]' }],
  },
  {
    key: "gallery",
    route: () => "/gallery",
    ready: '[data-gallery-collection="showcase"]',
    focus: '[data-gallery-collection="showcase"]',
    anchors: [{ name: "showcase", selector: '[data-gallery-collection="showcase"]' }],
  },
];
/** Focus helpers: a box (CSS px) computed in the page, for elements a single selector misses. */
const boxOf = (fn, arg) => async (page) => page.evaluate(fn, arg);
/** The largest element matching a selector (the rack elevation among the page's svgs). */
const largest = (selector) =>
  boxOf((sel) => {
    let best = null;
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (!best || r.width * r.height > best.width * best.height)
        best = { x: r.x, y: r.y, width: r.width, height: r.height };
    }
    return best;
  }, selector);
/** The nearest card-like ancestor (a section or bordered box) of the first match. */
const cardOf = (selector) =>
  boxOf((sel) => {
    let el = document.querySelector(sel);
    while (el && el !== document.body) {
      const cs = getComputedStyle(el);
      if (el.tagName === "SECTION" || (parseFloat(cs.borderTopWidth) > 0 && el.offsetWidth > 300)) {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }
      el = el.parentElement;
    }
    return null;
  }, selector);
/** The union of several elements' boxes (each selector's first match). */
const union = (selectors) =>
  boxOf((sels) => {
    const rs = sels
      .map((s) => document.querySelector(s))
      .filter(Boolean)
      .map((el) => el.getBoundingClientRect());
    if (!rs.length) return null;
    const x = Math.min(...rs.map((r) => r.x));
    const y = Math.min(...rs.map((r) => r.y));
    return {
      x,
      y,
      width: Math.max(...rs.map((r) => r.right)) - x,
      height: Math.max(...rs.map((r) => r.bottom)) - y,
    };
  }, selectors);

for (const s of screens) {
  s.focusNote = {
    nac: "the detection banner and the first card (findings by kind)",
    rack: "the largest svg in main (the elevation)",
    "rack-studio": "the largest svg in main (the rack, power lens)",
    review: "the card holding the ghost-link rows",
  }[s.key];
  if (s.key === "map-ages") {
    // One line's card says how old it is: click a line (view state; view=1 keeps it read-only).
    // Prefer a line verified on the wire ("Verified on the wire … ago"), else any line's age.
    s.prepare = async (page) => {
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
    };
    s.ready = ".topo-canvas .react-flow__edge";
    s.focusNote = "the open line card with its age, and the Changes lens chip";
    s.focus = boxOf(() => {
      const age = /verified on the wire|אומת ברשת/i;
      let el = [...document.querySelectorAll("body *")].find(
        (e) => e.children.length === 0 && age.test(e.textContent || ""),
      );
      while (el && el !== document.body) {
        const cs = getComputedStyle(el);
        if (parseFloat(cs.borderTopWidth) > 0 && el.offsetWidth > 300) break;
        el = el.parentElement;
      }
      const chip = document.querySelector("[data-since-picker]");
      const rs = [el, chip]
        .filter((e) => e && e !== document.body)
        .map((e) => e.getBoundingClientRect());
      if (!rs.length) return null;
      const x = Math.min(...rs.map((r) => r.x));
      const y = Math.min(...rs.map((r) => r.y));
      return {
        x,
        y,
        width: Math.max(...rs.map((r) => r.right)) - x,
        height: Math.max(...rs.map((r) => r.bottom)) - y,
      };
    });
    s.anchors = [
      { name: "lens", selector: "[data-since-picker]" },
      { name: "canvas", selector: ".topo-canvas" },
    ];
  }
  if (s.key === "design-studio") {
    // One object selected (the switch the staged comment is on), the inspector's Style open.
    s.prepare = async (page) => {
      const node = page
        .locator('.react-flow__node[data-id*="-sw"], .react-flow__node[data-id*="core"]')
        .first();
      await node.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(800);
      const style = page.getByRole("button", { name: /^(Style|סגנון)$/ }).first();
      if (await style.count()) await style.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(800);
    };
    // The canvas's inner edge, where the selected switch sits, and the inspector beside it
    // (on the right in English, on the left in Hebrew).
    s.focusNote = "the selected object at the canvas's inner edge and the inspector beside it";
    s.focus = boxOf(() => {
      const c = document.querySelector(".design-canvas")?.getBoundingClientRect();
      if (!c) return null;
      const rtl = document.documentElement.dir === "rtl";
      const w = 712;
      const x = rtl ? Math.max(0, c.left - 260) : Math.min(innerWidth - 24, c.right + 260) - w;
      return { x, y: c.y, width: w, height: 472 };
    });
    s.anchors = [
      { name: "canvas", selector: ".design-canvas" },
      { name: "selected", selector: ".react-flow__node.selected" },
    ];
  }
  if (s.key === "nac") {
    s.ready = "[data-nac-banner]";
    s.focus = union(["[data-nac-banner]", "main h2"]);
    s.anchors = [{ name: "mode", selector: "[data-nac-banner]" }];
  }
  if (s.key === "rack") {
    s.focus = largest("main svg");
    s.anchors = [{ name: "elevation", box: largest("main svg") }];
  }
  if (s.key === "rack-studio") {
    s.focus = largest("main svg");
    s.anchors = [
      { name: "rack", box: largest("main svg") },
      { name: "lens", selector: '[data-lens="power"]' },
    ];
  }
  if (s.key === "review") {
    // The ghost-link section at the top of the window (the page opens on "Monitoring
    // incidents 0", an empty group the frame-quality list keeps out of a frame).
    s.prepare = async (page) => {
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
    };
    s.focus = cardOf('a[href*="focus=edge:obs-"]');
    s.anchors = [
      { name: "summary", selector: "[data-page-meta]" },
      { name: "ghost-links", box: cardOf('a[href*="focus=edge:obs-"]') },
    ];
  }
}

const keysWanted = option("--keys") ? option("--keys").split(",") : null;
const selected = probe
  ? screens.filter((s) => s.key === probe)
  : screens.filter((s) => !keysWanted || keysWanted.includes(s.key));

if (!user || !pass) {
  console.error(
    "capture: LANCOMPASS_DEMO_USER and LANCOMPASS_DEMO_PASS must be set; nothing captured.",
  );
  process.exit(2);
}

/** Text that must never be in a kept frame (the W3 frame-quality list). */
const forbiddenText = [
  /background work/i,
  /העבודה ברקע/,
  /0 VRFs/i,
  /unmatched/i,
  /evaluation ends|licen[cs]e (expired|ends)/i,
];

const readJson = (file, fallback) =>
  existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback;

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

/** The crop around a box: plus PAD, at least MIN, inside the window. CSS px. */
function clipFor(box) {
  let x = box.x - PAD;
  let y = box.y - PAD;
  let width = box.width + 2 * PAD;
  let height = box.height + 2 * PAD;
  if (width < MIN.width) {
    x -= (MIN.width - width) / 2;
    width = MIN.width;
  }
  if (height < MIN.height) {
    y -= (MIN.height - height) / 2;
    height = MIN.height;
  }
  width = Math.min(width, VIEW.width);
  height = Math.min(height, VIEW.height);
  x = Math.max(0, Math.min(x, VIEW.width - width));
  y = Math.max(0, Math.min(y, VIEW.height - height));
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/** A box in image pixels, clipped to an area (CSS px) and made relative to its origin. */
function toImage(box, area) {
  const x0 = Math.max(box.x, area.x);
  const y0 = Math.max(box.y, area.y);
  const x1 = Math.min(box.x + box.width, area.x + area.width);
  const y1 = Math.min(box.y + box.height, area.y + area.height);
  if (x1 - x0 < 4 || y1 - y0 < 4) return null;
  // Round the edges, not the size, so an anchor never ends a pixel past its image.
  const left = Math.round((x0 - area.x) * SCALE);
  const top = Math.round((y0 - area.y) * SCALE);
  return {
    x: left,
    y: top,
    w: Math.round((x1 - area.x) * SCALE) - left,
    h: Math.round((y1 - area.y) * SCALE) - top,
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

async function visibleText(page) {
  return page.evaluate(() => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
      const t = (n.textContent || "").trim();
      if (t) out.push(t);
    }
    return out.join("\n");
  });
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

const browser = await chromium.launch();
const failures = [];
const notes = [];
const captured = [];
const anchors = readJson(anchorsFile, {});
const record = readJson(recordFile, {});
let idsUsed = null;
try {
  for (const locale of locales) {
    const context = await browser.newContext({
      viewport: VIEW,
      deviceScaleFactor: SCALE,
      locale: locale === "he" ? "he-IL" : "en-US",
      reducedMotion: "reduce",
      colorScheme,
    });
    await context.addInitScript(
      ([lang, theme]) => {
        try {
          const prefs = JSON.parse(localStorage.getItem("lancompass:prefs") || "{}");
          localStorage.setItem(
            "lancompass:prefs",
            // Browser-only flags: no tour, no first-run checklist; comfortable density.
            JSON.stringify({
              ...prefs,
              theme,
              language: lang,
              tourActive: false,
              tourDone: true,
              checklistDismissed: true,
              density: "comfortable",
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
        if (probe) {
          console.log(JSON.stringify({ tag, url: page.url(), ...(await probeDom(page)) }, null, 1));
          mkdirSync(join(root, ".tmp", "probe"), { recursive: true });
          await page.screenshot({
            path: join(root, ".tmp", "probe", `${set}-${locale}-${screen.key}.png`),
          });
          continue;
        }
        // Nothing the script left: no hover, no focus ring.
        await page.mouse.move(VIEW.width - 4, VIEW.height - 4);
        await page.evaluate(
          () => document.activeElement instanceof HTMLElement && document.activeElement.blur(),
        );
        await page.waitForTimeout(1200);
        const { problems } = await frameState(page, locale);
        if (problems.length) throw new Error(`frame state: ${problems.join("; ")}`);
        const text = await visibleText(page);
        const bad = forbiddenText.filter((re) => re.test(text)).map(String);
        if (bad.length) notes.push(`${tag}: frame text matches ${bad.join(", ")}`);
        let box;
        if (typeof screen.focus === "function") box = await screen.focus(page);
        else {
          const focus = page.locator(screen.focus).first();
          await focus.waitFor({ timeout: 10000 });
          box = await focus.boundingBox();
        }
        if (!box || box.width < 4 || box.height < 4)
          throw new Error(`focus of ${screen.key} has no box`);
        const clip = clipFor(box);
        const named = [];
        for (const a of screen.anchors.slice(0, 4)) {
          const b = a.box
            ? await a.box(page)
            : await page
                .locator(a.selector)
                .first()
                .boundingBox()
                .catch(() => null);
          if (b) named.push({ name: a.name, box: b });
        }
        if (check) {
          captured.push(tag);
          console.log(`check ok ${tag} ${path} clip ${clip.width}x${clip.height}`);
          continue;
        }
        const dir = join(outRoot, locale);
        mkdirSync(dir, { recursive: true });
        const full = join(dir, `${screen.key}.png`);
        const crop = join(dir, `${screen.key}.focus.png`);
        await page.screenshot({ path: full, fullPage: false });
        await page.screenshot({ path: crop, clip });
        const lib = join(libraryRoot, locale);
        mkdirSync(lib, { recursive: true });
        copyFileSync(full, join(lib, `${screen.key}.png`));
        copyFileSync(crop, join(lib, `${screen.key}.focus.png`));
        const window_ = { x: 0, y: 0, ...VIEW };
        anchors[set] ??= {};
        anchors[set][locale] ??= {};
        anchors[set][locale][screen.key] = {
          clip,
          full: named.map((n) => ({ name: n.name, ...toImage(n.box, window_) })).filter((n) => n.w),
          focus: named.map((n) => ({ name: n.name, ...toImage(n.box, clip) })).filter((n) => n.w),
        };
        record.keys ??= {};
        record.keys[screen.key] ??= {};
        Object.assign(record.keys[screen.key], {
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
          focus: typeof screen.focus === "function" ? screen.focusNote : screen.focus,
        });
        record.keys[screen.key].clips ??= {};
        record.keys[screen.key].clips[`${set}/${locale}`] = clip;
        captured.push(tag);
        console.log(`captured ${tag}`);
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
  writeFileSync(
    anchorsFile,
    `${JSON.stringify({ $comment: "W3 capture anchors: { name, x, y, w, h } in image pixels per set, locale and key, for the full window and the focus crop (with its clip in CSS px). Written by scripts/capture-screenshots.mjs.", ...anchors, $comment2: undefined }, null, 2)}\n`,
  );
  const staged = process.env.LANCOMPASS_STAGED_FILE
    ? readJson(process.env.LANCOMPASS_STAGED_FILE, [])
    : (record.staged_writes ?? []);
  Object.assign(record, {
    $comment:
      "W3: where the site's product screens come from. Written by scripts/capture-screenshots.mjs.",
    product_version: process.env.LANCOMPASS_PRODUCT_VERSION || record.product_version || null,
    bundle_sha256: process.env.LANCOMPASS_BUNDLE_SHA256 || record.bundle_sha256 || null,
    release_key_fingerprint:
      process.env.LANCOMPASS_RELEASE_FPR || record.release_key_fingerprint || null,
    captured_on: new Date().toISOString().slice(0, 10),
    demo_estate_loaded_at:
      process.env.LANCOMPASS_DEMO_LOADED_AT || record.demo_estate_loaded_at || null,
    viewport: VIEW,
    device_scale_factor: SCALE,
    sets: [...new Set([...(record.sets ?? []), set])].sort(),
    locales: [...new Set([...(record.locales ?? []), ...locales])].sort(),
    staged_writes: staged,
  });
  mkdirSync(dirname(recordFile), { recursive: true });
  writeFileSync(recordFile, `${JSON.stringify(record, null, 2)}\n`);
}
console.log(
  `capture: ${check ? "checked" : "captured"} ${captured.length} (${set}); ids ${JSON.stringify(idsUsed)}`,
);
for (const n of notes) console.log(`capture: note ${n}`);
if (failures.length) {
  console.log(`capture: failed ${failures.length}:\n  ${failures.join("\n  ")}`);
  process.exitCode = 1;
}
console.log(`FINISHED-capture-${set}${check ? "-check" : ""}`);
