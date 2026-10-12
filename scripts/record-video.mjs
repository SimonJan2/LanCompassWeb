#!/usr/bin/env node
/**
 * Records one product video from a locally running LanCompass demo estate.
 *
 *   LANCOMPASS_DEMO_URL=http://localhost:3010 \
 *   LANCOMPASS_DEMO_USER=... LANCOMPASS_DEMO_PASS=... \
 *   LANCOMPASS_CAPTURE_THEME=light|nightwire LANCOMPASS_VIDEO_UI=en|he \
 *   LANCOMPASS_VIDEO_DIR=media-library/videos/light-en \
 *   node scripts/record-video.mjs <key> [--check] [--publish]
 *   node scripts/record-video.mjs <key> --cards <dir>
 *
 * Keys: drift-review-queue, documented-vs-observed, hebrew-native (always he UI).
 *
 *   (default)   records <dir>/<key>.webm, a poster (.jpg and .webp) taken at the step marked
 *               `poster`, and captions in English and Hebrew (.en.vtt, .he.vtt)
 *   --check     signs in and walks every step without recording or waiting, and fails if a
 *               link or element a step needs is missing, so a broken path is found before a
 *               recording is spent
 *   --publish   after recording, also copies the files to public/media/<set>/<key>.<ui>.*
 *   --cards     renders the title and end card to <dir>/<key>.<ui>.{title,end}.png; needs
 *               neither the product nor a login
 *
 * Each video is a storyboard: a title card, five { seconds, en, he, run } steps and an end
 * card. The captions and the card text come from the same storyboard as the picture. A step's
 * clock starts once its page has loaded (network idle, fonts ready). The cards are local
 * pages rendered in the capture browser only (scripts/video-cards/card.html as a data: URL).
 * Playwright does not draw the mouse pointer, so the capture page gets a small pointer dot
 * that follows page.mouse, with a short ring over things a narrator would point at.
 *
 * Read-only, like the screenshot script: it signs in, sets theme, language and tourDone in
 * this browser's localStorage only, then navigates, hovers and scrolls. A click is used only
 * to follow a link. It never clicks a control that changes state: no layer toggles (a toggle
 * writes the saved diagram), approve, dismiss, acknowledge, save, import, sync or enable.
 * The Observed layer is shown only through the review queue's own `focus=edge:obs-…` deep
 * links, which lift it in view state. Credentials only ever come from the environment.
 * Run it in the Playwright container.
 */
import { copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

/** Card length, the longest a recording may run, and the room left for page loads. */
export const CARD_SECONDS = 2.5;
export const MAX_SECONDS = 45;
const LOAD_ALLOWANCE = 5;

const SECTION = '[data-settle-key^="sec:"]';
const TITLE = "> div:first-child > div:first-child";
const SECTION_TITLE = `${SECTION} ${TITLE}`;
const GHOST_TITLE = `[data-settle-key="sec:ghost_link"] ${TITLE}`;
const GHOST_ROW = '[data-settle-key^="ghost_link:"]';
const GHOST_LINK = 'a[href*="/topology?"][href*="focus=edge:obs-"]';
const CANVAS = ".topo-canvas";
/** The edge a `focus=edge:` deep link highlights. */
const FOCUS = ".react-flow__edge.topo-focus";

/**
 * The storyboards. `title` names the video on the title card (in the recording's interface
 * language); `takeaway` is the end card's one line. Both are also the first and last caption.
 * Every caption is a product statement from the W1 claims list.
 */
export const storyboards = {
  "drift-review-queue": {
    title: { en: "From a finding to a decision", he: "מממצא להחלטה" },
    takeaway: {
      en: "Every gap between the documentation and the network, in one queue. A person decides.",
      he: "כל פער בין התיעוד לרשת, בתור אחד. ההחלטה נשארת אצלכם.",
    },
    steps: [
      {
        seconds: 6,
        en: "The review queue: every gap between the documentation and the network, with the open count on top.",
        he: "תור הסקירה: כל פער בין התיעוד לרשת, ומספר הממצאים הפתוחים בראש הדף.",
        run: async (c) => {
          await c.goto("/review");
          await c.point("main h1 + p", "the open-findings count", { hold: 1200 });
          await c.point("main h1", "the queue title", { dx: 0.2, hold: 600 });
        },
      },
      {
        seconds: 7,
        en: "Findings are grouped by kind, and each group shows how many are open.",
        he: "הממצאים מקובצים לפי סוג, וליד כל קבוצה מספר הממצאים הפתוחים בה.",
        run: async (c) => {
          const titles = c.page.locator(SECTION_TITLE);
          if ((await titles.count()) < 2) throw new Error("missing: two finding groups");
          for (let i = 0; i < 2; i++)
            await c.point(titles.nth(i), `finding group ${i + 1}`, { dx: 0.3, hold: 1800 });
        },
      },
      {
        seconds: 7,
        en: "Each finding says why it was flagged. This one: a link the switches report over LLDP or CDP, with no cable on record.",
        he: "כל ממצא מסביר למה סומן. כאן: קישור שהמתגים מדווחים עליו ב־LLDP או ב־CDP, ואין לו כבל בתיעוד.",
        run: async (c) => {
          await c.point(GHOST_TITLE, "the ghost-link group", {
            dx: 0.3,
            hold: 700,
          });
          const row = c.page.locator(GHOST_ROW).first();
          await c.point(row.locator("td").nth(-4), "the ghost link's two ends", { hold: 900 });
          await c.point(row.locator("td").nth(-3), "why it was flagged", { dx: 0.3, hold: 1200 });
        },
      },
      {
        seconds: 7,
        poster: true,
        en: "On the topology it is a ghost link: seen on the wire, missing from the record.",
        he: "בטופולוגיה זה קישור רפאים: נצפה ברשת, וחסר בתיעוד.",
        run: async (c) => {
          await c.follow(c.page.locator(GHOST_ROW).first().locator(GHOST_LINK), "Show on map");
          await c.wait(900);
          await c.point(FOCUS, "the focused ghost link", { hold: 600 });
          await c.poster({ pointer: true });
        },
      },
      {
        seconds: 6,
        en: "Back in the queue, the reviewer decides: document the link, or dismiss the finding.",
        he: "חוזרים לתור ומחליטים: לתעד את הקישור, או לדחות את הממצא.",
        run: async (c) => {
          await c.goto("/review");
          const row = c.page.locator(GHOST_ROW).first();
          await c.point(row.locator('a[href*="cable="]'), "Document link", { hold: 1300 });
          await c.point(row.locator("button:has(svg.lucide-eye-off)"), "Dismiss", { hold: 1300 });
        },
      },
    ],
  },
  "documented-vs-observed": {
    title: { en: "Seen on the wire, missing from the record", he: "נצפה ברשת, חסר בתיעוד" },
    takeaway: {
      en: "Documented and observed, on one topology.",
      he: "המתועד והנצפה, בטופולוגיה אחת.",
    },
    steps: [
      {
        seconds: 5,
        en: "One site's topology: the documented links in solid lines, and dashed, links only seen on the wire.",
        he: "הטופולוגיה של אתר אחד: הקישורים המתועדים בקו רציף, ובקו מקווקו קישורים שנצפו ברשת בלבד.",
        run: async (c) => {
          await c.goto(`/topology?scope=site:${c.ghosts.site}`);
          await c.point(CANVAS, "the topology canvas", { dx: 0.35, dy: 0.4, hold: 500 });
          await c.point(CANVAS, "the topology canvas", { dx: 0.62, dy: 0.55, ms: 1200 });
        },
      },
      {
        seconds: 5,
        en: "The review queue lists the links seen on the wire that the record lacks.",
        he: "תור הסקירה מציג את הקישורים שנצפו ברשת וחסרים בתיעוד.",
        run: async (c) => {
          await c.goto("/review");
          await c.point(GHOST_TITLE, "the ghost-link group", {
            dx: 0.3,
            hold: 500,
          });
          const rows = c.page.locator(GHOST_ROW);
          for (let i = 0; i < Math.min(await rows.count(), 2); i++)
            await c.point(rows.nth(i).locator("td").nth(-4), `ghost link ${i + 1}`, { hold: 300 });
        },
      },
      {
        seconds: 6,
        poster: true,
        en: "Open the first: the map marks that ghost link, beside the documented ones.",
        he: "פותחים את הראשון: המפה מסמנת את קישור הרפאים, לצד הקישורים המתועדים.",
        run: async (c) => {
          await c.follow(c.page.locator(GHOST_ROW).first().locator(GHOST_LINK), "Show on map");
          await c.wait(600);
          await c.point(FOCUS, "the focused ghost link", { hold: 600 });
          await c.poster({ pointer: true });
        },
      },
      {
        seconds: 7,
        en: "A second and a third, in other parts of the network: neighbours the switches report over LLDP or CDP.",
        he: "קישור שני ושלישי, בחלקים אחרים של הרשת: שכנים שהמתגים מדווחים עליהם ב־LLDP או ב־CDP.",
        run: async (c) => {
          for (const href of c.ghosts.others) {
            await c.goto(href);
            await c.wait(500);
            await c.point(FOCUS, "the focused ghost link", { hold: 1000 });
          }
        },
      },
      {
        seconds: 5,
        en: "Next, the reviewer documents each link, or dismisses it.",
        he: "הצעד הבא: מתעדים כל קישור, או דוחים אותו.",
        run: async (c) => {
          await c.goto("/review");
          const row = c.page.locator(GHOST_ROW).first();
          await c.point(row.locator('a[href*="cable="]'), "Document link", { hold: 1200 });
          await c.point(row.locator("button:has(svg.lucide-eye-off)"), "Dismiss", { hold: 800 });
        },
      },
    ],
  },
  "hebrew-native": {
    title: { en: "Built in Hebrew, not translated", he: "נבנה בעברית, לא תורגם אליה" },
    takeaway: {
      en: "24 interface languages, with full Hebrew and Arabic right to left.",
      he: "ממשק ב־24 שפות, עם עברית וערבית מלאות מימין לשמאל.",
    },
    steps: [
      {
        seconds: 6,
        poster: true,
        en: "The dashboard in Hebrew, laid out right to left.",
        he: "לוח הבקרה בעברית, בפריסה מימין לשמאל.",
        run: async (c) => {
          await c.goto("/");
          await c.poster();
          await c.point('[data-tour-id^="nav:"]', "the navigation", { hold: 900 });
          await c.point('[data-tour-id="tour:dash-grid"]', "the dashboard grid", {
            dx: 0.7,
            dy: 0.15,
            hold: 900,
          });
        },
      },
      {
        seconds: 7,
        en: "The prefix hierarchy: Hebrew site names beside addresses in Latin script, each in its own direction.",
        he: "היררכיית הקידומות: שמות אתרים בעברית לצד כתובות באותיות לטיניות, כל אחד בכיוון שלו.",
        run: async (c) => {
          await c.goto("/tree");
          const rows = c.page.locator('[role="treeitem"]');
          for (let i = 0; i < 3; i++)
            await c.point(rows.nth(i * 2), `tree row ${i * 2 + 1}`, { dx: 0.75, hold: 700 });
          await c.glide('[role="tree"]', 220, 1500);
        },
      },
      {
        seconds: 6,
        en: "The DC-A01 rack elevation, labelled in Hebrew.",
        he: "שרטוט הארון DC-A01, עם תוויות בעברית.",
        run: async (c) => {
          await c.goto("/racks");
          await c.follow('a[href^="/racks/"]:has-text("DC-A01")', "the DC-A01 rack");
          await c.point("main", "the rack elevation", { dx: 0.5, dy: 0.35, hold: 1200 });
        },
      },
      {
        seconds: 6,
        en: "The review queue, in Hebrew too.",
        he: "וגם תור הסקירה, בעברית.",
        run: async (c) => {
          await c.goto("/review");
          await c.point("main h1", "the queue title", { dx: 0.8, hold: 900 });
          await c.point(SECTION_TITLE, "the first finding group", { dx: 0.7, hold: 900 });
        },
      },
      {
        seconds: 6,
        en: "The interface ships in 24 languages, with full Hebrew and Arabic right to left.",
        he: "הממשק זמין ב־24 שפות, עם עברית וערבית מלאות מימין לשמאל.",
        run: async (c) => {
          await c.glide("main", 420, 2400);
          await c.point(c.page.locator(SECTION_TITLE).nth(1), "a finding group", {
            dx: 0.7,
            hold: 600,
          });
        },
      },
    ],
  },
};

const HEBREW = /[֐-׿]/;

/** Static checks on a storyboard; returns a list of problems (empty when it is sound). */
export function validate(key) {
  const board = storyboards[key];
  if (!board) return [`unknown key "${key}"`];
  const problems = [];
  const total = board.steps.reduce((s, step) => s + step.seconds, 0) + 2 * CARD_SECONDS;
  if (total + LOAD_ALLOWANCE > MAX_SECONDS)
    problems.push(`${total} s of steps and cards leaves under ${LOAD_ALLOWANCE} s for loads`);
  if (board.steps.filter((s) => s.poster).length !== 1) problems.push("needs one poster step");
  const lines = [board.title, board.takeaway, ...board.steps];
  for (const [i, s] of board.steps.entries())
    if (s.seconds < 5 || s.seconds > 8) problems.push(`step ${i + 1}: ${s.seconds} s (5–8)`);
  for (const [i, l] of lines.entries()) {
    if (HEBREW.test(l.en)) problems.push(`line ${i + 1}: Hebrew in the English text`);
    if (!HEBREW.test(l.he)) problems.push(`line ${i + 1}: no Hebrew in the Hebrew text`);
  }
  return problems;
}

/** Latin runs inside Hebrew, isolated (U+2066 … U+2069) for captions; <bdi> for cards. */
const LATIN = /[A-Za-z][A-Za-z0-9./-]*(?:[ -][A-Za-z0-9][A-Za-z0-9./-]*)*/g;
export const isolate = (text) => text.replace(LATIN, (m) => `⁦${m}⁩`);
const escapeHtml = (s) =>
  s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const bdi = (text) => escapeHtml(text).replace(LATIN, (m) => `<bdi>${m}</bdi>`);

const stamp = (s) => {
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = (s % 60).toFixed(3).padStart(6, "0");
  return `${h}:${m}:${sec}`;
};

/** The WebVTT file for one language. The NOTE names the storyboard, which the tests read. */
export function vtt(key, cues, lang) {
  const body = cues
    .map((c, i) => {
      const text = lang === "he" ? isolate(c.he) : c.en;
      return `${i + 1}\n${stamp(c.from)} --> ${stamp(c.to)}\n${text}\n`;
    })
    .join("\n");
  const steps = storyboards[key].steps.length;
  return `WEBVTT\n\nNOTE storyboard ${key}: ${steps} steps and 2 cards\n\n${body}`;
}

/* ------------------------------------------------------------------ cards and pointer */

const cardWords = {
  en: {
    title: "From the demo network",
    end: "In short",
    documented: "Documented",
    observed: "Observed",
  },
  he: { title: "מרשת ההדגמה", end: "בקצרה", documented: "מתועד", observed: "נצפה" },
};

/** The site's colours (src/lib/palette.ts) per recording set. */
async function cardPalette(set) {
  const source = await readFile(join(root, "src/lib/palette.ts"), "utf8");
  const block = source.split(set === "nightwire" ? "dark: {" : "light: {")[1] ?? "";
  const colours = {};
  for (const m of block.split("}")[0].matchAll(/(\w+): "(#[0-9a-f]{6})"/gi)) colours[m[1]] = m[2];
  return colours;
}

async function fontFace(family, file, weight) {
  const data = await readFile(join(root, "node_modules", file));
  return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${data.toString("base64")}) format("woff2");font-weight:${weight};font-display:block}`;
}

/** The card page as a data: URL, in the recording's interface language and set. */
export async function cardUrl(key, kind, ui, set) {
  const board = storyboards[key];
  const text = kind === "title" ? board.title[ui] : board.takeaway[ui];
  const words = cardWords[ui];
  const colours = await cardPalette(set);
  const fonts = [
    await fontFace(
      "Plex Sans",
      "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2",
      "100 700",
    ),
    await fontFace(
      "Plex Sans Hebrew",
      "@fontsource/ibm-plex-sans-hebrew/files/ibm-plex-sans-hebrew-hebrew-400-normal.woff2",
      400,
    ),
    await fontFace(
      "Plex Sans Hebrew",
      "@fontsource/ibm-plex-sans-hebrew/files/ibm-plex-sans-hebrew-hebrew-600-normal.woff2",
      600,
    ),
    await fontFace(
      "Plex Mono",
      "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2",
      400,
    ),
  ].join("\n");
  const mark = (
    await readFile(join(root, "src/assets/brand/compass-app-icon.svg"), "utf8")
  ).replace(
    '<svg xmlns="http://www.w3.org/2000/svg"',
    '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true"',
  );
  const slots = {
    ...colours,
    lang: ui,
    dir: ui === "he" ? "rtl" : "ltr",
    fonts,
    mark,
    size: String(kind === "title" ? 64 : 48),
    kicker: escapeHtml(kind === "title" ? words.title : words.end),
    text: ui === "he" ? bdi(text) : escapeHtml(text),
    documentedLabel: words.documented,
    observedLabel: words.observed,
  };
  const template = await readFile(join(root, "scripts/video-cards/card.html"), "utf8");
  const html = template.replace(/\{\{(\w+)\}\}/g, (_, name) => slots[name] ?? "");
  return `data:text/html;base64,${Buffer.from(html).toString("base64")}`;
}

/**
 * Runs in every product page of the capture browser (not on the data: cards): a pointer dot
 * that follows the mouse, and a ring that opens briefly over a link, button or row. It is
 * re-attached on every move, because the product's client navigation can replace the body.
 */
function pointerScript([ink, edge]) {
  if (location.protocol === "data:") return;
  const make = (id, css) => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.setAttribute("aria-hidden", "true");
      el.style.cssText = css;
      document.documentElement.append(el);
    }
    return el;
  };
  const base =
    "position:fixed;left:0;top:0;pointer-events:none;z-index:2147483647;border-radius:50%;";
  const targets = 'a,button,[role="button"],[role="treeitem"],tr,summary,label,select,input';
  let last = null;
  document.addEventListener(
    "mousemove",
    (e) => {
      const dot = make(
        "lc-capture-dot",
        `${base}width:16px;height:16px;margin:-8px 0 0 -8px;background:${ink};outline:2.5px solid ${edge};opacity:.9`,
      );
      const ring = make(
        "lc-capture-ring",
        `${base}width:40px;height:40px;margin:-20px 0 0 -20px;border:2px solid ${ink};opacity:0;scale:.5;transition:opacity .25s cubic-bezier(0,0,.58,1),scale .35s cubic-bezier(0,0,.58,1)`,
      );
      dot.style.translate = ring.style.translate = `${e.clientX}px ${e.clientY}px`;
      const hit = e.target instanceof Element ? e.target.closest(targets) : null;
      if (hit && hit !== last) {
        ring.style.opacity = ".55";
        ring.style.scale = "1";
        clearTimeout(ring.dataset.timer);
        ring.dataset.timer = String(
          setTimeout(() => {
            ring.style.opacity = "0";
            ring.style.scale = ".5";
          }, 650),
        );
      }
      last = hit;
    },
    { capture: true, passive: true },
  );
}

/* ------------------------------------------------------------------ the capture helpers */

/** The step helpers a storyboard's `run` receives. In --check mode nothing waits. */
function helpers(page, base, { fast, posterPath }) {
  const c = { page, x: 640, y: 360, clock: 0, ghosts: null };
  const sleep = (ms) => (fast || ms <= 0 ? Promise.resolve() : page.waitForTimeout(ms));
  c.wait = sleep;
  c.settle = async () => {
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(c.x, c.y);
    if (!c.clock) c.clock = Date.now();
  };
  c.goto = async (path) => {
    await page.goto(new URL(path, base).toString(), { waitUntil: "networkidle" });
    await c.settle();
  };
  c.find = async (target, what) => {
    const loc = typeof target === "string" ? page.locator(target).first() : target.first();
    try {
      await loc.waitFor({ state: "visible", timeout: 10_000 });
    } catch {
      throw new Error(`missing on ${new URL(page.url()).pathname}: ${what}`);
    }
    return loc;
  };
  /** An eased in-page scroll of the nearest scrolling box around `node`. */
  const ease = (node, [dy, ms]) =>
    new Promise((done) => {
      let box = node;
      const scrolls = (el) =>
        el.scrollHeight > el.clientHeight + 1 &&
        /(auto|scroll)/.test(getComputedStyle(el).overflowY);
      while (box && box !== document.body && !scrolls(box)) box = box.parentElement;
      if (!box || box === document.body) box = document.scrollingElement;
      const from = box.scrollTop;
      const start = performance.now();
      const tick = (now) => {
        const t = ms > 0 ? Math.min(1, (now - start) / ms) : 1;
        const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        box.scrollTop = from + dy * e;
        if (t < 1) requestAnimationFrame(tick);
        else done();
      };
      requestAnimationFrame(tick);
    });
  c.glide = async (target, dy, ms) => {
    const loc = await c.find(target, "a scrolling area");
    await loc.evaluate(ease, [dy, fast ? 0 : ms]);
  };
  /** Glides the page until the element sits in the upper middle of the frame. */
  c.reveal = async (loc) => {
    const box = await loc.boundingBox();
    if (!box) return;
    if (box.y >= 90 && box.y + box.height <= 630) return;
    const dy = box.y + box.height / 2 - 300;
    await loc.evaluate(ease, [dy, fast ? 0 : Math.min(1600, 500 + Math.abs(dy))]);
    await sleep(150);
  };
  c.move = async (x, y, ms = 800) => {
    const [x0, y0] = [c.x, c.y];
    const start = Date.now();
    for (;;) {
      const t = fast ? 1 : Math.min(1, (Date.now() - start) / ms);
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e);
      if (t >= 1) break;
      await page.waitForTimeout(10);
    }
    [c.x, c.y] = [x, y];
  };
  /** Moves the pointer to a part of an element (dx, dy as fractions) and holds. Hover only. */
  c.point = async (target, what, { dx = 0.5, dy = 0.5, ms = 800, hold = 0 } = {}) => {
    const loc = await c.find(target, what);
    await c.reveal(loc);
    const box = await loc.boundingBox();
    if (!box) throw new Error(`missing on ${new URL(page.url()).pathname}: ${what} (no box)`);
    const x = Math.min(1270, Math.max(10, box.x + box.width * dx));
    const y = Math.min(710, Math.max(10, box.y + Math.min(box.height * dy, 600)));
    await c.move(x, y, ms);
    await sleep(hold);
  };
  /** Follows a link: point at it, click, wait for the new page. Navigation only. */
  c.follow = async (target, what) => {
    const loc = await c.find(target, what);
    const href = await loc.getAttribute("href");
    if (!href) throw new Error(`not a link: ${what}`);
    const before = page.url();
    const path = new URL(href, base).pathname;
    await c.point(loc, what, { hold: 350 });
    await Promise.all([
      page.waitForURL((url) => url.href !== before && url.pathname === path),
      page.mouse.click(c.x, c.y),
    ]);
    await c.settle();
  };
  /** The poster: this frame, without the pointer unless it marks the point of the frame. */
  c.poster = async ({ pointer = false } = {}) => {
    if (!posterPath) return;
    if (pointer) return void (await page.screenshot({ path: posterPath, type: "png" }));
    await page.evaluate(() =>
      document
        .querySelectorAll("#lc-capture-dot, #lc-capture-ring")
        .forEach((el) => (el.style.visibility = "hidden")),
    );
    await page.screenshot({ path: posterPath, type: "png" });
    await page.evaluate(() =>
      document
        .querySelectorAll("#lc-capture-dot, #lc-capture-ring")
        .forEach((el) => (el.style.visibility = "")),
    );
  };
  return c;
}

/** The ghost links the review queue lists: the first, its site, and two others elsewhere. */
async function readGhosts(page, base) {
  await page.goto(`${base}/review`, { waitUntil: "networkidle" });
  const hrefs = [
    ...new Set(
      await page
        .locator(`${GHOST_ROW} ${GHOST_LINK}`)
        .evaluateAll((as) => as.map((a) => a.getAttribute("href"))),
    ),
  ];
  if (hrefs.length < 3)
    throw new Error(`the review queue lists ${hrefs.length} ghost links (needs 3)`);
  const scope = (h) => /scope=site:(\d+)/.exec(h)?.[1] ?? "";
  const site = scope(hrefs[0]);
  if (!site) throw new Error("the first ghost link has no site scope");
  // Prefer links in another site, so the second and third are elsewhere in the estate.
  const rest = hrefs.slice(1).sort((a, b) => Number(scope(a) === site) - Number(scope(b) === site));
  return { first: hrefs[0], site, others: rest.slice(0, 2) };
}

/* ------------------------------------------------------------------ main */

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const publish = args.includes("--publish");
  const cardsAt = args.indexOf("--cards");
  const cardsDir = cardsAt >= 0 ? args[cardsAt + 1] : "";
  const key = args.find((a, i) => !a.startsWith("--") && (cardsAt < 0 || i !== cardsAt + 1)) || "";
  const base = (process.env.LANCOMPASS_DEMO_URL || "http://localhost:3010").replace(/\/$/, "");
  const user = process.env.LANCOMPASS_DEMO_USER || "";
  const pass = process.env.LANCOMPASS_DEMO_PASS || "";
  const set = process.env.LANCOMPASS_CAPTURE_THEME || "light";
  const theme = { light: "light", nightwire: "cyberpunk" }[set];
  const ui = key === "hebrew-native" || process.env.LANCOMPASS_VIDEO_UI === "he" ? "he" : "en";
  const outDir = process.env.LANCOMPASS_VIDEO_DIR || `media-library/videos/${set}-${ui}`;

  const problems = validate(key);
  if (problems.length) {
    console.error(`record: ${key}: ${problems.join("; ")}`);
    process.exit(1);
  }
  if (!theme) {
    console.error("record: LANCOMPASS_CAPTURE_THEME must be light or nightwire.");
    process.exit(1);
  }
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();

  if (cardsDir) {
    try {
      await mkdir(cardsDir, { recursive: true });
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      for (const kind of ["title", "end"]) {
        await page.goto(await cardUrl(key, kind, ui, set));
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: join(cardsDir, `${key}.${set}-${ui}.${kind}.png`) });
      }
      console.log(`record: wrote the ${key} cards (${set}, ${ui}) to ${cardsDir}`);
    } finally {
      await browser.close();
    }
    return;
  }

  if (!user || !pass) {
    await browser.close();
    console.error("record: set LANCOMPASS_DEMO_USER and LANCOMPASS_DEMO_PASS.");
    process.exit(1);
  }

  const board = storyboards[key];
  await mkdir(outDir, { recursive: true });
  const tmp = join(outDir, ".recording");
  const posterPng = join(outDir, `.${key}.poster.png`);
  try {
    // Sign in first, in a context that is not recorded.
    const auth = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const login = await auth.newPage();
    await login.goto(`${base}/login`, { waitUntil: "networkidle" });
    await login
      .locator('input[name="username"], input[autocomplete="username"], input[type="text"]')
      .first()
      .fill(user);
    await login.locator('input[type="password"]').first().fill(pass);
    await Promise.all([
      login.waitForLoadState("networkidle"),
      login.locator('button[type="submit"]').first().click(),
    ]);
    await login.waitForTimeout(1500);
    if (login.url().includes("/login")) throw new Error("sign-in failed");
    const ghosts = await readGhosts(login, base);
    const storageState = await auth.storageState();
    await auth.close();

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: ui === "he" ? "he-IL" : "en-US",
      colorScheme: theme === "light" ? "light" : "dark",
      storageState,
      ...(check ? {} : { recordVideo: { dir: tmp, size: { width: 1280, height: 720 } } }),
    });
    // Theme, language and the finished tour live only in this browser's localStorage.
    await context.addInitScript(
      ([lang, mode]) => {
        const prefs = JSON.parse(localStorage.getItem("lancompass:prefs") || "{}");
        localStorage.setItem(
          "lancompass:prefs",
          JSON.stringify({
            ...prefs,
            theme: mode,
            language: lang,
            tourActive: false,
            tourDone: true,
          }),
        );
      },
      [ui, theme],
    );
    const colours = await cardPalette(set);
    await context.addInitScript(pointerScript, [colours.ink, colours.page]);
    const page = await context.newPage();
    const c = helpers(page, base, { fast: check, posterPath: check ? "" : posterPng });
    c.ghosts = ghosts;

    const cues = [];
    const started = Date.now();
    const since = () => (Date.now() - started) / 1000;
    const card = async (kind, line) => {
      const from = cues.length ? cues.at(-1).to : 0;
      await page.goto(await cardUrl(key, kind, ui, set));
      await page.evaluate(() => document.fonts.ready);
      if (!check) await page.waitForTimeout(CARD_SECONDS * 1000);
      cues.push({ from, to: check ? from : since(), en: line.en, he: line.he });
    };

    await card("title", board.title);
    for (const [index, step] of board.steps.entries()) {
      const from = cues.at(-1).to;
      c.clock = 0;
      const t0 = Date.now();
      await step.run(c);
      const clock = c.clock || t0;
      const left = step.seconds * 1000 - (Date.now() - clock);
      if (!check && left > 0) await page.waitForTimeout(left);
      if (!check && left < -300)
        console.warn(`record: step ${index + 1} ran ${(-left / 1000).toFixed(1)} s over`);
      cues.push({ from, to: check ? from : since(), en: step.en, he: step.he });
      console.log(
        `record: ${key} step ${index + 1} ${check ? "ok" : `${(since() - from).toFixed(1)} s`}`,
      );
    }
    await card("end", board.takeaway);

    if (check) {
      await context.close();
      console.log(`record: --check ${key} (${set}, ${ui} UI): every step's targets are present`);
      return;
    }
    const video = page.video();
    await context.close();
    const total = cues.at(-1).to;
    if (total > MAX_SECONDS)
      throw new Error(`recording ran ${total.toFixed(1)} s (max ${MAX_SECONDS})`);
    await rename(await video.path(), join(outDir, `${key}.webm`));
    const sharp = (await import("sharp")).default;
    await sharp(posterPng)
      .jpeg({ quality: 82 })
      .toFile(join(outDir, `${key}.jpg`));
    await sharp(posterPng)
      .webp({ quality: 80 })
      .toFile(join(outDir, `${key}.webp`));
    for (const lang of ["en", "he"])
      await writeFile(join(outDir, `${key}.${lang}.vtt`), vtt(key, cues, lang));
    console.log(
      `record: wrote ${outDir}/${key}.{webm,jpg,webp,en.vtt,he.vtt} (${total.toFixed(1)} s, ${ui} UI)`,
    );
    if (publish) {
      const site = join(root, "public/media", set);
      await mkdir(site, { recursive: true });
      for (const ext of ["webm", "webp", "en.vtt", "he.vtt"])
        await copyFile(join(outDir, `${key}.${ext}`), join(site, `${key}.${ui}.${ext}`));
      console.log(`record: published to public/media/${set}/${key}.${ui}.*`);
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
    await rm(posterPng, { force: true });
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`record: ${error.message}`);
    process.exit(1);
  });
}
