import sharp from "sharp";
import { compassIconSvg } from "./brand";

/** A square PNG of the compass app icon (dark tile), rendered from the SVG. */
export async function iconPng(size: number): Promise<Response> {
  const png = await sharp(Buffer.from(compassIconSvg()), { density: Math.max(72, size * 3) })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
}
