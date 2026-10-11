/**
 * Fonts for the OG renderer. Converts the self-hosted Inter (Latin) and Heebo
 * (Hebrew) WOFF2 files to TrueType once per build and registers both with
 * Pango. If that fails, OG text falls back to the system's DejaVu Sans and the
 * build logs a warning; the site itself is not affected.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import sharp from "sharp";
import { woff2ToTtf } from "./woff2";

interface OgFonts {
  display: string;
  body: string;
  fontfile: string | null;
}

let cached: Promise<OgFonts> | null = null;

async function prepare(): Promise<OgFonts> {
  const fallback: OgFonts = { display: "DejaVu Sans Bold", body: "DejaVu Sans", fontfile: null };
  try {
    const require = createRequire(join(process.cwd(), "package.json"));
    const dir = join(process.cwd(), "node_modules", ".cache", "lancompass-og");
    mkdirSync(dir, { recursive: true });
    const files = [
      ["@fontsource-variable/heebo/files/heebo-hebrew-wght-normal.woff2", "heebo-hebrew.ttf"],
      ["@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", "inter-latin.ttf"],
    ] as const;
    const ttfs = files.map(([pkgPath, name]) => {
      const out = join(dir, name);
      writeFileSync(out, woff2ToTtf(readFileSync(require.resolve(pkgPath))));
      return out;
    });
    // Rendering once with each fontfile registers it with fontconfig for later calls.
    for (const fontfile of ttfs) {
      await sharp({ text: { text: "LanCompass", font: "Inter 12", fontfile, rgba: true } })
        .png()
        .toBuffer();
    }
    return {
      display: "Inter,Heebo,DejaVu Sans Bold",
      body: "Inter,Heebo,DejaVu Sans Medium",
      fontfile: ttfs[1] ?? null,
    };
  } catch (error) {
    console.warn(`[og] brand fonts unavailable, using DejaVu Sans: ${(error as Error).message}`);
    return fallback;
  }
}

export function ogFonts(): Promise<OgFonts> {
  cached ??= prepare();
  return cached;
}
