/**
 * Open Graph images (1200×630), rendered at build time with sharp: survey
 * paper (or, in a dark build, the Night chart's indigo), faint contour lines, the two-sheets motif (a vellum sheet slightly out
 * of register over the observed sheet, with the drift link), the compass on
 * its app-icon tile, the wordmark and the page title in IBM Plex. Text is set
 * with Pango, which handles Hebrew bidi.
 */
import sharp from "sharp";
import { compassIconSvg } from "./brand";
import { contourPaths } from "./contours";
import { ogFonts } from "./og-fonts";
import { palettes, type PaletteName } from "./palette";

const W = 1200;
const H = 630;
const PAD = 80;

function escapeMarkup(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function background(rtl: boolean, tone: PaletteName): string {
  const { page, raised, sunk, contour, rule, ink, inkMuted, observed, drift, documented } =
    palettes[tone];
  const contours = contourPaths([
    { x: rtl ? 120 : 1080, y: 40, radius: 460, rings: 8, seed: 7 },
    { x: rtl ? 1100 : 100, y: 640, radius: 260, rings: 5, seed: 23 },
  ])
    .map((d) => `<path d="${d}"/>`)
    .join("");
  // The two sheets sit on the side opposite the text start; never mirrored inside.
  const ox = rtl ? 70 : 750;
  const oy = 170;
  const nodes: [number, number][] = [
    [190, 70],
    [90, 170],
    [300, 170],
    [150, 290],
    [320, 300],
  ];
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 2],
    [1, 3],
  ];
  const at = (i: number) => nodes[i]!;
  const line = (a: number, b: number, dx = 0, dy = 0) =>
    `<path d="M${ox + at(a)[0] + dx} ${oy + at(a)[1] + dy}L${ox + at(b)[0] + dx} ${oy + at(b)[1] + dy}"/>`;
  const sheet = (dx: number, dy: number, fill: string, opacity: number) =>
    `<rect x="${ox + dx}" y="${oy + dy}" width="400" height="360" rx="2" fill="${fill}" fill-opacity="${opacity}" stroke="${rule}"/>`;
  const reg = (x: number, y: number, color: string) =>
    `<g stroke="${color}" fill="none" stroke-width="1.2"><circle cx="${x}" cy="${y}" r="6"/><path d="M${x - 11} ${y}H${x + 11}M${x} ${y - 11}V${y + 11}"/></g>`;
  const corners = (dx: number, dy: number, color: string) =>
    [
      [20, 20],
      [380, 20],
      [20, 340],
      [380, 340],
    ]
      .map(([x, y]) => reg(ox + x! + dx, oy + y! + dy, color))
      .join("");
  // Vellum offset: slightly out of register, like the first frame of the loop.
  const vx = 14;
  const vy = -10;
  const box = (x: number, y: number) =>
    `<rect x="${ox + x + vx - 46}" y="${oy + y + vy - 13}" width="92" height="26" rx="2" fill="${raised}" stroke="${inkMuted}"/>` +
    `<circle cx="${ox + x + vx - 34}" cy="${oy + y + vy}" r="3" fill="${documented}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${page}"/>
  <g fill="none" stroke="${contour}" stroke-width="1.4">${contours}</g>
  ${sheet(0, 0, sunk, 1)}
  <g stroke="${observed}" stroke-opacity="0.6" stroke-width="1.6" stroke-dasharray="2 4" fill="none">
    ${edges.map(([a, b]) => line(a, b)).join("")}${line(2, 4)}
  </g>
  ${nodes.map(([x, y]) => `<circle cx="${ox + x}" cy="${oy + y}" r="5" fill="${observed}"/>`).join("")}
  ${corners(0, 0, observed)}
  ${sheet(vx, vy, raised, 0.8)}
  <g stroke="${ink}" stroke-opacity="0.7" stroke-width="2" fill="none">
    ${edges.map(([a, b]) => line(a, b, vx, vy)).join("")}
  </g>
  ${nodes.map(([x, y]) => box(x, y)).join("")}
  ${corners(vx, vy, ink)}
  <path d="M${ox + at(2)[0]} ${oy + at(2)[1]}L${ox + at(4)[0]} ${oy + at(4)[1]}" stroke="${drift}" stroke-width="3" stroke-dasharray="9 7" fill="none"/>
  <rect x="${rtl ? W - PAD - 72 : PAD}" y="${H - PAD - 2}" width="72" height="2" fill="${ink}"/>
</svg>`;
}

async function text(markup: string, font: string, width: number, align: "left" | "right") {
  const fonts = await ogFonts();
  const { data, info } = await sharp({
    text: {
      text: markup,
      font,
      ...(fonts.fontfile ? { fontfile: fonts.fontfile } : {}),
      width,
      dpi: 72,
      rgba: true,
      wrap: "word",
      align,
      spacing: 8,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export async function renderOgImage(opts: {
  title: string;
  eyebrow: string;
  rtl: boolean;
  /** "dark" renders the Night chart card; light and auto builds use paper. */
  tone?: PaletteName;
}): Promise<Buffer> {
  const { rtl, tone = "light" } = opts;
  const { ink, inkMuted } = palettes[tone];
  const fonts = await ogFonts();
  // Pango mirrors "left" for right-to-left paragraphs, so Hebrew lines align right.
  const align = "left";
  const textWidth = 600;
  const markSize = 60;
  // The compass on its own app-icon tile: the mark is unchanged and needs the tile on paper.
  const mark = await sharp(Buffer.from(compassIconSvg()), { density: 400 })
    .resize(markSize, markSize)
    .png()
    .toBuffer();
  const word = await text(
    `<span foreground="${ink}" weight="600">LanCompass</span>`,
    `${fonts.display} 38`,
    600,
    "left",
  );
  const eyebrow = await text(
    `<span foreground="${inkMuted}">${escapeMarkup(opts.eyebrow)}</span>`,
    `${fonts.mono} 21`,
    textWidth,
    align,
  );
  const title = await text(
    `<span foreground="${ink}" weight="600">${escapeMarkup(opts.title)}</span>`,
    `${fonts.display} 52`,
    textWidth,
    align,
  );
  const x = (w: number) => (rtl ? W - PAD - w : PAD);
  // The mark and wordmark stay left-to-right in both locales: a logo is never mirrored.
  const brandWidth = markSize + 18 + word.width;
  const brandX = rtl ? W - PAD - brandWidth : PAD;
  const titleTop = 262;
  return sharp(Buffer.from(background(rtl, tone)))
    .composite([
      { input: mark, left: brandX, top: PAD },
      {
        input: word.data,
        left: brandX + markSize + 18,
        top: PAD + Math.round((markSize - word.height) / 2),
      },
      { input: eyebrow.data, left: x(eyebrow.width), top: titleTop - eyebrow.height - 30 },
      { input: title.data, left: x(title.width), top: titleTop },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}
