import sharp from "sharp";
import { compassIconSvg } from "./brand";

const PAPER = { r: 0xf4, g: 0xf1, b: 0xea, alpha: 1 };

/**
 * A square PNG icon in the site's identity: the compass on its app-icon tile
 * (the mark itself is unchanged), centred on survey paper. The 32 px favicon
 * is the tile alone, so it stays legible at that size.
 */
export async function iconPng(size: number): Promise<Response> {
  const tileSize = size <= 32 ? size : Math.round(size * 0.78);
  const tile = await sharp(Buffer.from(compassIconSvg()), { density: Math.max(72, size * 3) })
    .resize(tileSize, tileSize)
    .png()
    .toBuffer();
  const png =
    tileSize === size
      ? await sharp(tile).png({ compressionLevel: 9 }).toBuffer()
      : await sharp({ create: { width: size, height: size, channels: 4, background: PAPER } })
          .composite([{ input: tile, gravity: "center" }])
          .png({ compressionLevel: 9 })
          .toBuffer();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
}
