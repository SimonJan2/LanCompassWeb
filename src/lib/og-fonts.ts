/**
 * Fonts for the OG renderer. Converts the self-hosted IBM Plex Sans (Latin,
 * variable), IBM Plex Sans Hebrew (600) and IBM Plex Mono WOFF2 files to
 * TrueType once per build and registers them with Pango. If that fails, OG text falls back to the system's DejaVu Sans and the
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
  mono: string;
  fontfile: string | null;
}

let cached: Promise<OgFonts> | null = null;

async function prepare(): Promise<OgFonts> {
  const fallback: OgFonts = {
    display: "DejaVu Sans Bold",
    body: "DejaVu Sans",
    mono: "DejaVu Sans Mono",
    fontfile: null,
  };
  try {
    const require = createRequire(join(process.cwd(), "package.json"));
    const dir = join(process.cwd(), "node_modules", ".cache", "lancompass-og");
    mkdirSync(dir, { recursive: true });
    const files = [
      [
        "@fontsource/ibm-plex-sans-hebrew/files/ibm-plex-sans-hebrew-hebrew-600-normal.woff2",
        "plex-sans-hebrew-600.ttf",
      ],
      [
        "@fontsource/ibm-plex-sans-hebrew/files/ibm-plex-sans-hebrew-hebrew-400-normal.woff2",
        "plex-sans-hebrew-400.ttf",
      ],
      ["@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2", "plex-mono.ttf"],
      [
        "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2",
        "plex-sans-latin.ttf",
      ],
    ] as const;
    const ttfs = files.map(([pkgPath, name]) => {
      const out = join(dir, name);
      writeFileSync(out, woff2ToTtf(readFileSync(require.resolve(pkgPath))));
      return out;
    });
    // Rendering once with each fontfile registers it with fontconfig for later calls.
    for (const fontfile of ttfs) {
      await sharp({ text: { text: "LanCompass", font: "IBM Plex Sans 12", fontfile, rgba: true } })
        .png()
        .toBuffer();
    }
    return {
      // The static Hebrew 600 face names its family "IBM Plex Sans Hebrew SemiBold".
      display: "IBM Plex Sans,IBM Plex Sans Hebrew SemiBold,DejaVu Sans Bold",
      body: "IBM Plex Sans,IBM Plex Sans Hebrew,DejaVu Sans",
      mono: "IBM Plex Mono,IBM Plex Sans Hebrew,DejaVu Sans Mono",
      fontfile: ttfs[3] ?? null,
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
