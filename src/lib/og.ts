/**
 * Open Graph images (1200×630), rendered at build time with sharp: ink
 * background, grid paper, the drift-map motif, the compass mark, the wordmark
 * and the page title. Text is set with Pango, which handles Hebrew bidi.
 */
import sharp from "sharp";
import { compassMarkSvg } from "./brand";
import { ogFonts } from "./og-fonts";

const W = 1200;
const H = 630;
const PAD = 80;

function escapeMarkup(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function background(rtl: boolean): string {
  const grid: string[] = [];
  for (let x = 0; x <= W; x += 48) grid.push(`<path d="M${x} 0V${H}"/>`);
  for (let y = 6; y <= H; y += 48) grid.push(`<path d="M0 ${y}H${W}"/>`);
  // The drift motif sits on the side opposite the text start.
  const ox = rtl ? 70 : 760;
  const n = (x: number, y: number, w = 96) =>
    `<rect x="${ox + x - w / 2}" y="${y - 14}" width="${w}" height="28" rx="7" fill="#171c22" stroke="rgba(255,255,255,0.16)"/>` +
    `<circle cx="${ox + x - w / 2 + 12}" cy="${y}" r="3" fill="#10b981"/>`;
  const l = (x1: number, y1: number, x2: number, y2: number) =>
    `<path d="M${ox + x1} ${y1}L${ox + x2} ${y2}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="${rtl ? 0.2 : 0.8}" cy="0.25" r="0.6">
      <stop offset="0" stop-color="#10b981" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#10b981" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#0b0d10"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g stroke="rgba(255,255,255,0.045)" stroke-width="1">${grid.join("")}</g>
  <g stroke="#10b981" stroke-opacity="0.75" stroke-width="2" fill="none">
    ${l(190, 90, 90, 200)}${l(190, 90, 300, 200)}${l(90, 200, 300, 200)}${l(90, 200, 150, 320)}
  </g>
  <path d="M${ox + 300} 200L${ox + 330} 330" stroke="#f5b544" stroke-width="2.5" stroke-dasharray="8 8" fill="none"/>
  ${n(190, 90)}${n(90, 200)}${n(300, 200)}${n(150, 320)}${n(330, 330)}
  <rect x="${rtl ? W - PAD - 64 : PAD}" y="${H - PAD - 4}" width="64" height="4" rx="2" fill="#10b981"/>
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
      spacing: 6,
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
  const textWidth = 660;
  const markSize = 64;
  const mark = await sharp(Buffer.from(compassMarkSvg()), { density: 400 })
    .resize(markSize, markSize)
    .png()
    .toBuffer();
  const word = await text(
    `<span foreground="#eef1f4">LanCompass</span>`,
    `${fonts.display} 40`,
    600,
    "left",
  );
  const eyebrow = await text(
    `<span foreground="#34d399">${escapeMarkup(opts.eyebrow)}</span>`,
    `${fonts.body} 24`,
    textWidth,
    align,
  );
  const title = await text(
    `<span foreground="#eef1f4">${escapeMarkup(opts.title)}</span>`,
    `${fonts.display} 54`,
    textWidth,
    align,
  );
  const x = (w: number) => (rtl ? W - PAD - w : PAD);
  // The mark and wordmark stay left-to-right in both locales: a logo is never mirrored.
  const brandWidth = markSize + 18 + word.width;
  const brandX = rtl ? W - PAD - brandWidth : PAD;
  const titleTop = 250;
  return sharp(Buffer.from(background(rtl)))
    .composite([
      { input: mark, left: brandX, top: PAD },
      {
        input: word.data,
        left: brandX + markSize + 18,
        top: PAD + Math.round((markSize - word.height) / 2),
      },
      { input: eyebrow.data, left: x(eyebrow.width), top: titleTop - eyebrow.height - 18 },
      { input: title.data, left: x(title.width), top: titleTop },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}
