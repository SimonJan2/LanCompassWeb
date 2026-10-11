import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The compass app icon (dark tile), read at build time for favicons and OG images. */
export function compassIconSvg(): string {
  return readFileSync(
    join(process.cwd(), "src", "assets", "brand", "compass-app-icon.svg"),
    "utf8",
  );
}

/** The compass without its tile. */
export function compassMarkSvg(): string {
  return readFileSync(join(process.cwd(), "src", "assets", "brand", "compass.svg"), "utf8");
}
