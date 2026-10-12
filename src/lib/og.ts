/**
 * Open Graph images (1200×630), rendered at build time with sharp: survey
 * paper, faint contour lines, the two-sheets motif (a vellum sheet slightly out
 * of register over the observed sheet, with the drift link), the compass on
 * its app-icon tile, the wordmark and the page title in IBM Plex. Text is set
 * with Pango, which handles Hebrew bidi.
 */
import sharp from "sharp";
import { compassIconSvg } from "./brand";
import { contourPaths } from "./contours";
import { ogFonts } from "./og-fonts";

const W = 1200;
const H = 630;
const PAD = 80;

/* The site's tokens (src/styles/tokens.css), repeated here because sharp has no CSS. */
const PAPER = "#f4f1ea";
const RAISED = "#fbf9f4";
const SUNK = "#ece7dc";
const CONTOUR = "#e3dccd";
const RULE = "#bdb4a2";
const INK = "#1a1c22";
const INK_MUTED = "#4a4e5a";
const OBSERVED = "#2f5bd3";
const DRIFT = "#b4234a";
const DOCUMENTED = "#0b8a63";

function escapeMarkup(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function background(rtl: boolean): string {
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
    `<rect x="${ox + dx}" y="${oy + dy}" width="400" height="360" rx="2" fill="${fill}" fill-opacity="${opacity}" stroke="${RULE}"/>`;
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
    `<rect x="${ox + x + vx - 46}" y="${oy + y + vy - 13}" width="92" height="26" rx="2" fill="${RAISED}" stroke="${INK_MUTED}"/>` +
    `<circle cx="${ox + x + vx - 34}" cy="${oy + y + vy}" r="3" fill="${DOCUMENTED}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <g fill="none" stroke="${CONTOUR}" stroke-width="1.4">${contours}</g>
  ${sheet(0, 0, SUNK, 1)}
  <g stroke="${OBSERVED}" stroke-opacity="0.6" stroke-width="1.6" stroke-dasharray="2 4" fill="none">
    ${edges.map(([a, b]) => line(a, b)).join("")}${line(2, 4)}
  </g>
  ${nodes.map(([x, y]) => `<circle cx="${ox + x}" cy="${oy + y}" r="5" fill="${OBSERVED}"/>`).join("")}
  ${corners(0, 0, OBSERVED)}
  ${sheet(vx, vy, RAISED, 0.8)}
  <g stroke="${INK}" stroke-opacity="0.7" stroke-width="2" fill="none">
    ${edges.map(([a, b]) => line(a, b, vx, vy)).join("")}
  </g>
  ${nodes.map(([x, y]) => box(x, y)).join("")}
  ${corners(vx, vy, INK)}
  <path d="M${ox + at(2)[0]} ${oy + at(2)[1]}L${ox + at(4)[0]} ${oy + at(4)[1]}" stroke="${DRIFT}" stroke-width="3" stroke-dasharray="9 7" fill="none"/>
  <rect x="${rtl ? W - PAD - 72 : PAD}" y="${H - PAD - 2}" width="72" height="2" fill="${INK}"/>
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
}): Promise<Buffer> {
  const { rtl } = opts;
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
    `<span foreground="${INK}" weight="600">LanCompass</span>`,
    `${fonts.display} 38`,
    600,
    "left",
  );
  const eyebrow = await text(
    `<span foreground="${INK_MUTED}">${escapeMarkup(opts.eyebrow)}</span>`,
    `${fonts.mono} 21`,
    textWidth,
    align,
  );
  const title = await text(
    `<span foreground="${INK}" weight="600">${escapeMarkup(opts.title)}</span>`,
    `${fonts.display} 52`,
    textWidth,
    align,
  );
  const x = (w: number) => (rtl ? W - PAD - w : PAD);
  // The mark and wordmark stay left-to-right in both locales: a logo is never mirrored.
  const brandWidth = markSize + 18 + word.width;
  const brandX = rtl ? W - PAD - brandWidth : PAD;
  const titleTop = 262;
  return sharp(Buffer.from(background(rtl)))
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
