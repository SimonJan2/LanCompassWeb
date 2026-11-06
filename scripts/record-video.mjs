#!/usr/bin/env node
/**
 * Records one product video from a running LanCompass demo estate: since W5, the throwaway
 * capture stack `lcweb-cap` loaded from the signed bundle (scripts/capture-stack/README.md).
 *
 *   LANCOMPASS_DEMO_URL=http://127.0.0.1:4186 \
 *   LANCOMPASS_DEMO_USER=... LANCOMPASS_DEMO_PASS=... \
 *   LANCOMPASS_CAPTURE_THEME=survey|night-chart LANCOMPASS_VIDEO_UI=en|he \
 *   LANCOMPASS_VIDEO_WRITES=lcweb-cap LANCOMPASS_WRITES_LOG=<file.jsonl> \
 *   node scripts/record-video.mjs <key> [--check] [--publish]
 *   node scripts/record-video.mjs <key> --cards <dir>
 *
 * Keys: drift-review-queue, documented-vs-observed, hebrew-native (always he UI).
 *
 *   (default)   records media-library/videos/<set>-<ui>/<key>.webm, a poster (.jpg and .webp)
 *               taken at the step marked `poster`, and captions in English and Hebrew
 *               (.en.vtt, .he.vtt)
 *   --check     signs in and walks every step without recording, waiting or writing, and fails
 *               if a link or element a step needs is missing, so a broken path is found before
 *               a recording is spent
 *   --publish   after recording, also copies the files to public/media/<set>/<key>.<ui>.*
 *   --cards     renders the title and end card to <dir>/<key>.<set>-<ui>.{title,end}.png; needs
 *               neither the product nor a login
 *
 * Sets are the product's official themes, the site's own pair (W3): Survey (`survey`, light
 * builds) and Night chart (`night-chart`, dark builds). The product keeps the theme only in the
 * browser, so it is set in `lancompass:prefs` (with the interface language and the finished
 * tour) before the first page loads; the account's own language is never set.
 *
 * Each video is a storyboard: a title card, five { seconds, en, he, claims } steps and an end
 * card, written in src/content/videos.json, plus each step's `run` here. The captions, the card
 * text and the site's "What the video shows" list (VideoSlot.astro) all come from that file;
 * every line cites its rows of docs/claims.md (tests/claims.spec.ts holds them to the register).
 * A step's clock starts once its page has loaded (network idle, fonts ready).
 * The cards are local pages rendered in the capture browser only (scripts/video-cards/card.html
 * as a data: URL). Playwright does not draw the mouse pointer, so the capture page gets a small
 * pointer dot that follows page.mouse, with a short ring over things a narrator would point at.
 *
 * Writes (DECISIONS.md D-VIDEO-WRITES): the queue story applies one group as one batch and then
 * undoes it in one step. A write is a storyboard step's `c.act`, and it runs only when
 * LANCOMPASS_VIDEO_WRITES=lcweb-cap and the URL is the capture stack's own web port (4186 or
 * 4196); every write is appended to LANCOMPASS_WRITES_LOG. Anything else is read-only: theme,
 * language and tourDone in this browser's localStorage, then navigation, hover, scrolling, the
 * Q key and opening a card or a preview (view state). --check never writes.
 * Credentials only ever come from the environment. Run it in the Playwright container.
 */
import { readFileSync } from "node:fs";
import { appendFile, copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
/** The storyboards' text (src/content/videos.json): titles, steps and takeaways, en and he. */
const text = JSON.parse(readFileSync(join(root, "src/content/videos.json"), "utf8"));

/** Card length, the longest a recording may run, and the room left for page loads. */
export const CARD_SECONDS = 2.5;
export const MAX_SECONDS = 45;
const LOAD_ALLOWANCE = 5;

/** The capture set → the product's theme id (lib/theme-registry.ts at v0.7.0). */
export const SETS = { survey: "survey", "night-chart": "night-chart" };
/** The capture stack's web ports (scripts/capture-stack/make-env.mjs, sets 1 and 2). */
const CAPTURE_PORTS = ["4186", "4196"];

const GHOST_CARD = 'a[href*="/topology?"][href*="focus=edge:obs-"]';
/** The edge a `focus=edge:` deep link highlights. */
const FOCUS = ".react-flow__edge.topo-focus";
const CANVAS = ".topo-canvas";

/**
 * What each step does, in order; its text is the same step in src/content/videos.json. `title`
 * names the video on the title card (in the recording's interface language); `takeaway` is the
 * end card's one line. Both are also the first and last caption.
 */
const runs = {
  "drift-review-queue": [
    {
      run: async (c) => {
        await c.goto("/");
        await c.point('[data-thesis-item="hosts"]', "the undocumented hosts", { hold: 1400 });
        await c.point('[data-thesis-item="links"]', "the undocumented links", { hold: 1000 });
      },
    },
    {
      run: async (c) => {
        await c.goto("/discovery");
        await c.point("[data-queue-strip]", "the queue's counts", { dx: 0.2, hold: 1300 });
        const titles = c.page.locator("[data-queue] li[data-queue-group] [data-group-title]");
        if ((await titles.count()) < 3) throw new Error("missing: three queue groups");
        for (let i = 0; i < 3; i++)
          await c.point(titles.nth(i), `queue group ${i + 1}`, { dx: 0.4, ms: 600, hold: 500 });
        await c.point(c.group.title, "the group this story decides", { dx: 0.4, hold: 600 });
      },
    },
    {
      run: async (c) => {
        await c.open(c.group.review, "the group's Review button", "[data-decision-preview]");
        const rows = c.page.locator("[data-decision-preview] [data-preview-row]");
        if ((await rows.count()) < 2) throw new Error("missing: two preview rows");
        await c.point(rows.nth(0), "a preview row", { dx: 0.5, hold: 900 });
        await c.point(rows.nth(1), "the next preview row", { dx: 0.5, ms: 500, hold: 500 });
        await c.poster({ pointer: false });
        await c.point("[data-preview-apply]", "the Apply button", { hold: 700 });
      },
    },
    {
      run: async (c) => {
        await c.act("[data-preview-apply]", "Apply the group as one batch", {
          response: "/api/v1/decisions/apply",
        });
        await c.find("[data-queue-strip]", "the queue's counts");
        await c.wait(500);
        await c.point("[data-queue-strip]", "the counts after the batch", { dx: 0.15, hold: 1200 });
        await c.point(
          '[data-strip="undoable"], [data-queue-strip] > div:last-child',
          "can be undone",
          {
            hold: 900,
          },
        );
      },
    },
    {
      run: async (c) => {
        // Only the batch this story applied: never another batch (the demo's own load is one).
        const batch = c.writes.at(-1)?.batch;
        if (!batch && !c.checking) throw new Error("no batch id from the apply: nothing undone");
        // The batch's own toast carries Undo and refreshes the queue; the batches list's Undo
        // does not refresh the queue's counts (the product at 0.7.0), so that path reloads.
        const toastUndo = c.page
          .locator("[data-sonner-toast] button[data-action], [data-sonner-toast] [data-button]")
          .first();
        if (!c.checking && (await toastUndo.isVisible().catch(() => false))) {
          await c.act(toastUndo, "Undo the batch in one step (its toast)", {
            response: `/decisions/${batch}/undo`,
          });
        } else {
          const line = batch ? `[data-batch="${batch}"]` : "[data-decision-batches] li[data-batch]";
          await c.act(`${line} button`, "Undo the batch in one step (the batches list)", {
            response: `/decisions/${batch}/undo`,
          });
          if (!c.checking) await c.goto("/discovery");
        }
        await c.wait(400);
        await c.point("[data-queue-strip]", "the counts, as they were", { dx: 0.15, hold: 1300 });
      },
    },
  ],
  "documented-vs-observed": [
    {
      run: async (c) => {
        await c.goto(c.ids.mapPath);
        await c.lineCard();
        await c.poster({ pointer: true });
        await c.wait(1200);
      },
    },
    {
      run: async (c) => {
        await c.goto("/review");
        const link = c.page.locator(GHOST_CARD).first();
        await c.point(link, "a ghost link's Show on map", { hold: 1200 });
      },
    },
    {
      run: async (c) => {
        await c.follow(c.page.locator(GHOST_CARD).first(), "Show on map");
        await c.wait(700);
        await c.point(FOCUS, "the focused ghost link", { hold: 600 });
        await c.edgeCard(FOCUS, "the ghost link's card");
        await c.wait(900);
      },
    },
    {
      run: async (c) => {
        await c.goto(c.ids.changesPath);
        await c.point("[data-since-picker]", "the Changes lens and its 7 days", { hold: 1000 });
        await c.point(CANVAS, "the map under the lens", { dx: 0.55, dy: 0.5, hold: 900 });
      },
    },
    {
      run: async (c) => {
        await c.goto(c.ids.mapPath);
        await c.point("[data-question-input]", "the question bar", { dx: 0.15, hold: 300 });
        await c.ask(c.ids.question[c.ui]);
        await c.point("[data-question-answer]", "the answer", { dx: 0.2, hold: 1500 });
      },
    },
  ],
  "hebrew-native": [
    {
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
      run: async (c) => {
        await c.goto(c.ids.planPath);
        await c.point("main h1, main [data-page-title]", "the subnet and its site", {
          dx: 0.8,
          hold: 1000,
        });
        await c.point("[data-address-map]", "the address map", { dx: 0.7, dy: 0.3, hold: 1400 });
      },
    },
    {
      run: async (c) => {
        await c.goto(c.ids.rackPath);
        await c.point("main h1", "the rack's name", { dx: 0.8, hold: 700 });
        await c.point(c.page.locator("main svg").last(), "the rack elevation", {
          dx: 0.5,
          dy: 0.3,
          hold: 1300,
        });
      },
    },
    {
      run: async (c) => {
        await c.goto(c.ids.designPath);
        await c.point(".design-canvas", "the design canvas", { dx: 0.6, dy: 0.35, hold: 1400 });
      },
    },
    {
      run: async (c) => {
        await c.goto("/discovery");
        await c.point("[data-queue-strip]", "the queue's counts", { dx: 0.8, hold: 900 });
        const titles = c.page.locator("[data-queue] li[data-queue-group] [data-group-title]");
        await c.point(titles.nth(1), "a queue group", { dx: 0.7, hold: 900 });
      },
    },
  ],
};

/** The storyboards: the text of src/content/videos.json, each step with its `run`. */
export const storyboards = Object.fromEntries(
  Object.entries(runs).map(([key, steps]) => {
    const board = text[key];
    if (!board || board.steps.length !== steps.length)
      throw new Error(`src/content/videos.json: ${key} needs ${steps.length} steps`);
    return [key, { ...board, steps: board.steps.map((s, i) => ({ ...s, run: steps[i].run })) }];
  }),
);

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
    if (!l.claims?.length) problems.push(`line ${i + 1}: cites no claim row`);
  }
  return problems;
}

/** Latin runs inside Hebrew, isolated (U+2066 … U+2069) for captions; <bdi> for cards. */
const LATIN = /[A-Za-z][A-Za-z0-9./-]*(?:[ -][A-Za-z0-9][A-Za-z0-9./-]*)*/g;
export const isolate = (text) => text.replace(LATIN, (m) => `⁦${m}⁩`);
/** A Hebrew cue starts with U+200F (RIGHT-TO-LEFT MARK), so WebVTT lays it out right to left
 *  whatever its first word is (W5; research §7.8). */
export const hebrewCue = (text) => `‏${isolate(text)}`;
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
      const text = lang === "he" ? hebrewCue(c.he) : c.en;
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

/** The site's colours (src/lib/palette.ts) per recording set: Survey → light, Night chart →
 *  dark, the same pair the product wears inside the recording. */
async function cardPalette(set) {
  const source = await readFile(join(root, "src/lib/palette.ts"), "utf8");
  const block = source.split(set === "night-chart" ? "dark: {" : "light: {")[1] ?? "";
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

/** The capture browser's own preferences (`lancompass:prefs`, the product keeps them in the
 *  browser only), set before the first page loads: theme, interface language, the finished
 *  tour, no first-run checklist, comfortable density. The account is never changed. */
function prefsScript([lang, mode]) {
  try {
    const prefs = JSON.parse(localStorage.getItem("lancompass:prefs") || "{}");
    localStorage.setItem(
      "lancompass:prefs",
      JSON.stringify({
        ...prefs,
        theme: mode,
        language: lang,
        tourActive: false,
        tourDone: true,
        checklistDismissed: true,
        density: "comfortable",
      }),
    );
  } catch {
    /* a data: card page has no storage */
  }
}

/* ------------------------------------------------------------------ the capture helpers */

/** The step helpers a storyboard's `run` receives. In --check mode nothing waits or writes. */
function helpers(page, base, { fast, posterPath, writes, log }) {
  const c = {
    page,
    x: 640,
    y: 360,
    clock: 0,
    ids: null,
    group: null,
    ui: "en",
    writes: [],
    checking: fast,
  };
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
  /** Moves the pointer to a part of an element (dx, dy as fractions) and holds. Hover only.
   *  `optional`: a missing element is skipped (the hold still runs). */
  c.point = async (
    target,
    what,
    { dx = 0.5, dy = 0.5, ms = 800, hold = 0, optional = false } = {},
  ) => {
    let loc;
    try {
      loc = await c.find(target, what);
    } catch (error) {
      if (!optional) throw error;
      return void (await sleep(hold));
    }
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
  /** Opens a view (a preview dialog): point, click, wait for `opened`. View state only. */
  c.open = async (target, what, opened) => {
    const loc = await c.find(target, what);
    await c.point(loc, what, { hold: 350 });
    await page.mouse.click(c.x, c.y);
    await c.find(opened, `${what} → ${opened}`);
    await page.waitForLoadState("networkidle");
    await sleep(300);
  };
  /** A write (D-VIDEO-WRITES): only on the capture stack, only when allowed, logged; in
   *  --check mode the target is found and nothing is clicked. */
  c.act = async (target, what, { response } = {}) => {
    const loc = await c.find(target, what);
    if (fast) return;
    if (!writes) throw new Error(`refusing the write "${what}": not the capture stack`);
    await c.point(loc, what, { hold: 400 });
    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => r.request().method() === "POST" && r.url().includes(response) && r.status() < 400,
        { timeout: 15_000 },
      ),
      page.mouse.click(c.x, c.y),
    ]);
    const body = await res.json().catch(() => ({}));
    const entry = {
      at: new Date().toISOString(),
      what,
      request: `POST ${new URL(res.url()).pathname}`,
      status: res.status(),
      batch: body?.id ?? null,
      rows: body?.counts?.rows ?? body?.undone ?? null,
    };
    c.writes.push(entry);
    await log(entry);
    await page.waitForLoadState("networkidle");
  };
  /** Opens one line's card on the map, the line found before the recording (c.ids.edge): a
   *  click sent to the edge itself, so it can never land on a node. View state only. */
  c.lineCard = async () => {
    const edge = c.ids.edge
      ? page.locator(
          `.react-flow__edge[data-id="${c.ids.edge}"], [data-testid="rf__edge-${c.ids.edge}"]`,
        )
      : page.locator(".react-flow__edge");
    await c.edgeCard(edge, "a line verified on the wire");
  };
  c.edgeCard = async (target, what) => {
    const loc = await c.find(target, what);
    await c.reveal(loc);
    const b = await loc.boundingBox();
    if (!b) throw new Error(`missing on ${new URL(page.url()).pathname}: ${what} (no box)`);
    await c.move(b.x + b.width / 2, b.y + b.height / 2, fast ? 0 : 700);
    await loc.dispatchEvent("click", { clientX: b.x + b.width / 2, clientY: b.y + b.height / 2 });
    await sleep(700);
  };
  /** Asks the map: the Q key focuses the question bar; the question is typed and sent. */
  c.ask = async (question) => {
    await c.find("[data-question-input]", "the question bar");
    await page.keyboard.press("KeyQ");
    await sleep(300);
    await page.keyboard.type(question, { delay: fast ? 0 : 45 });
    await sleep(250);
    await page.keyboard.press("Enter");
    await c.find("[data-question-answer]", "the map's answer");
    await page.waitForLoadState("networkidle");
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

/* ------------------------------------------------------------------ before the recording */

/** The ids and paths the storyboards need, read with the signed-in browser (not recorded). */
async function lookUp(page, base, ui) {
  const get = async (path) => {
    const r = await page.request.get(`${base}/api/v1${path}`);
    if (!r.ok()) throw new Error(`GET ${path} → ${r.status()}`);
    return r.json();
  };
  const list = (x) => (Array.isArray(x) ? x : (x?.items ?? x?.results ?? []));
  const site = list(await get("/sites")).find((s) => String(s.name).includes("Demo HQ"));
  const rack = list(await get("/racks")).find((r) => r.name === "DC-A01");
  const prefix = list(await get("/prefixes")).find((p) =>
    [p.cidr, p.prefix, p.network].some((v) => String(v) === "10.130.100.0/24"),
  );
  const design = list(await get("/diagrams")).find((d) => d.name === "תכנון DMZ חדש");
  const missing = [
    !site && "site Demo HQ",
    !rack && "rack DC-A01",
    !prefix && "prefix 10.130.100.0/24",
    !design && "design תכנון DMZ חדש",
  ].filter(Boolean);
  if (missing.length) throw new Error(`the demo estate lacks: ${missing.join(", ")}`);
  const about = process.env.LANCOMPASS_ASK_ABOUT || "10.130.100.246";
  const mapPath = `/topology?scope=site:${site.id}&view=1`;
  // The line whose card says "Verified on the wire … ago": found here, clicked in the video.
  await page.goto(`${base}${mapPath}`, { waitUntil: "networkidle" });
  const edge = await page.evaluate(async () => {
    const verified = /Verified on the wire|אומת ברשת לפני/;
    const edges = [...document.querySelectorAll(".react-flow__edge")].slice(0, 40);
    for (const el of edges) {
      const r = el.getBoundingClientRect();
      el.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          clientX: r.x + r.width / 2,
          clientY: r.y + r.height / 2,
        }),
      );
      await new Promise((ok) => setTimeout(ok, 450));
      if (verified.test(document.body.innerText))
        return (
          el.getAttribute("data-id") ||
          (el.getAttribute("data-testid") || "").replace(/^rf__edge-/, "")
        );
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await new Promise((ok) => setTimeout(ok, 150));
    }
    return null;
  });
  return {
    mapPath,
    changesPath: `${mapPath}&since=7d`,
    rackPath: `/racks/${rack.id}`,
    planPath: `/prefixes/${prefix.id}?tab=plan&view=grid`,
    designPath: `/topology?d=${design.id}`,
    question: { en: `where is ${about}`, he: `איפה ${about}` },
    edge,
    ui,
  };
}

/** The group the queue story decides: an "addresses to document" group (many rows, each with a
 *  plain before → after), else the first group with a preview. */
async function pickGroup(page) {
  const groups = page.locator("[data-queue] li[data-queue-group]");
  await groups.first().waitFor({ state: "visible", timeout: 15_000 });
  const kinds = await groups.evaluateAll((els) =>
    els.map((el) => ({
      key: el.getAttribute("data-queue-group"),
      review: el.querySelector("[data-group-review]")?.getAttribute("data-group-review") ?? null,
      title: el.querySelector("[data-group-title]")?.textContent?.trim() ?? "",
    })),
  );
  const prefer = process.env.LANCOMPASS_QUEUE_GROUP;
  const pick =
    kinds.find((k) => prefer && k.key === prefer && k.review !== null) ??
    kinds.find((k) => /addresses to document|כתובות לתיעוד/i.test(k.title) && k.review !== null) ??
    kinds.find((k) => k.review !== null);
  if (!pick) throw new Error("no queue group with a preview");
  const at = `[data-queue] li[data-queue-group="${pick.key}"]`;
  return { ...pick, title: `${at} [data-group-title]`, review: `${at} [data-group-review]` };
}

/** The queue's counts, to prove the undo left it as it was. */
const strip = (page) =>
  page
    .locator("[data-queue-strip] [data-strip]")
    .evaluateAll((els) =>
      els.map(
        (el) => `${el.getAttribute("data-strip")}=${el.textContent.replace(/\s+/g, " ").trim()}`,
      ),
    );

/* ------------------------------------------------------------------ main */

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const publish = args.includes("--publish");
  const cardsAt = args.indexOf("--cards");
  const cardsDir = cardsAt >= 0 ? args[cardsAt + 1] : "";
  const key = args.find((a, i) => !a.startsWith("--") && (cardsAt < 0 || i !== cardsAt + 1)) || "";
  const base = (process.env.LANCOMPASS_DEMO_URL || "http://127.0.0.1:4186").replace(/\/$/, "");
  const user = process.env.LANCOMPASS_DEMO_USER || "";
  const pass = process.env.LANCOMPASS_DEMO_PASS || "";
  const set = process.env.LANCOMPASS_CAPTURE_THEME || "survey";
  const theme = SETS[set];
  const ui = key === "hebrew-native" || process.env.LANCOMPASS_VIDEO_UI === "he" ? "he" : "en";
  const outDir =
    process.env.LANCOMPASS_VIDEO_DIR || join(root, `media-library/videos/${set}-${ui}`);
  const writes =
    process.env.LANCOMPASS_VIDEO_WRITES === "lcweb-cap" &&
    CAPTURE_PORTS.includes(new URL(base).port) &&
    ["127.0.0.1", "localhost"].includes(new URL(base).hostname);
  const writesLog = process.env.LANCOMPASS_WRITES_LOG || "";

  const problems = validate(key);
  if (problems.length) {
    console.error(`record: ${key}: ${problems.join("; ")}`);
    process.exit(1);
  }
  if (!theme) {
    console.error("record: LANCOMPASS_CAPTURE_THEME must be survey or night-chart.");
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
  const log = async (entry) => {
    const line = JSON.stringify({ key, set, ui, ...entry });
    console.log(`record: write ${line}`);
    if (writesLog) await appendFile(writesLog, `${line}\n`);
  };
  try {
    // Sign in and look up the ids first, in a context that is not recorded.
    const auth = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await auth.addInitScript(prefsScript, [ui, theme]);
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
    const ids = await lookUp(login, base, ui);
    await login.goto(`${base}/discovery`, { waitUntil: "networkidle" });
    const group = key === "drift-review-queue" ? await pickGroup(login) : null;
    const before = key === "drift-review-queue" ? await strip(login) : [];
    const storageState = await auth.storageState();
    await auth.close();
    console.log(
      `record: ${key} (${set}, ${ui}) map edge ${ids.edge ?? "none found"}${group ? `, group ${group.key} (${group.review ? "preview" : "no preview"})` : ""}`,
    );

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: ui === "he" ? "he-IL" : "en-US",
      colorScheme: set === "survey" ? "light" : "dark",
      storageState,
      ...(check ? {} : { recordVideo: { dir: tmp, size: { width: 1280, height: 720 } } }),
    });
    // Theme, language, the finished tour, no first-run checklist and comfortable density live
    // only in this browser's localStorage (W3's capture flags).
    await context.addInitScript(prefsScript, [ui, theme]);
    const colours = await cardPalette(set);
    await context.addInitScript(pointerScript, [colours.ink, colours.page]);
    const page = await context.newPage();
    const c = helpers(page, base, {
      fast: check,
      posterPath: check ? "" : posterPng,
      writes,
      log,
    });
    c.ids = ids;
    c.group = group;
    c.ui = ui;

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
    // The theme and language the recording was made in, read from the product page itself.
    const shown = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
    }));
    if (shown.theme !== theme || !shown.lang.startsWith(ui))
      throw new Error(`the product showed ${JSON.stringify(shown)}, not ${theme} / ${ui}`);
    if (key === "drift-review-queue" && !check) {
      const after = await strip(page);
      const same = JSON.stringify(after) === JSON.stringify(before);
      console.log(
        `record: queue before ${before.join(" ")} | after ${after.join(" ")} | ${same ? "as it was" : "DIFFERENT"}`,
      );
      await log({ what: "queue counts before and after", before, after, same });
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
