/**
 * A minimal WOFF2 → TrueType decoder, used only at build time so the OG image
 * renderer (Pango through sharp, which cannot read WOFF2) can set text in the
 * same Inter and Heebo fonts as the site. Node's built-in Brotli does the
 * decompression; the glyf/loca and hmtx transforms follow the W3C WOFF2 spec
 * (section 5). No collections, no metadata blocks.
 */
import { brotliDecompressSync } from "node:zlib";

const KNOWN_TAGS = [
  "cmap",
  "head",
  "hhea",
  "hmtx",
  "maxp",
  "name",
  "OS/2",
  "post",
  "cvt ",
  "fpgm",
  "glyf",
  "loca",
  "prep",
  "CFF ",
  "VORG",
  "EBDT",
  "EBLC",
  "gasp",
  "hdmx",
  "kern",
  "LTSH",
  "PCLT",
  "VDMX",
  "vhea",
  "vmtx",
  "BASE",
  "GDEF",
  "GPOS",
  "GSUB",
  "EBSC",
  "JSTF",
  "MATH",
  "CBDT",
  "CBLC",
  "COLR",
  "CPAL",
  "SVG ",
  "sbix",
  "acnt",
  "avar",
  "bdat",
  "bloc",
  "bsln",
  "cvar",
  "fdsc",
  "feat",
  "fmtx",
  "fvar",
  "gvar",
  "hsty",
  "just",
  "lcar",
  "mort",
  "morx",
  "opbd",
  "prop",
  "trak",
  "Zapf",
  "Silf",
  "Glat",
  "Gloc",
  "Feat",
  "Sill",
];

class Reader {
  pos: number;
  constructor(
    readonly buf: Buffer,
    start = 0,
  ) {
    this.pos = start;
  }
  u8(): number {
    return this.buf.readUInt8(this.pos++);
  }
  u16(): number {
    const v = this.buf.readUInt16BE(this.pos);
    this.pos += 2;
    return v;
  }
  i16(): number {
    const v = this.buf.readInt16BE(this.pos);
    this.pos += 2;
    return v;
  }
  u32(): number {
    const v = this.buf.readUInt32BE(this.pos);
    this.pos += 4;
    return v;
  }
  bytes(n: number): Buffer {
    const v = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return v;
  }
  base128(): number {
    let acc = 0;
    for (let i = 0; i < 5; i++) {
      const b = this.u8();
      acc = acc * 128 + (b & 0x7f);
      if ((b & 0x80) === 0) return acc;
    }
    throw new Error("woff2: bad UIntBase128");
  }
  u255(): number {
    const code = this.u8();
    if (code === 253) return this.u16();
    if (code === 255) return this.u8() + 253;
    if (code === 254) return this.u8() + 506;
    return code;
  }
}

interface Entry {
  tag: string;
  origLength: number;
  transformVersion: number;
  length: number;
  data?: Buffer;
}

function withSign(flag: number, base: number): number {
  return flag & 1 ? base : -base;
}

/** Rebuilds glyf and loca from the transformed glyf table. */
function reconstructGlyf(src: Buffer): {
  glyf: Buffer;
  loca: Buffer;
  xMins: number[];
  indexFormat: number;
} {
  const h = new Reader(src);
  h.u16(); // reserved
  const optionFlags = h.u16();
  const numGlyphs = h.u16();
  const indexFormat = h.u16();
  const sizes = Array.from({ length: 7 }, () => h.u32());
  let off = h.pos;
  const streams = sizes.map((size) => {
    const r = new Reader(src, off);
    off += size;
    return r;
  });
  const [nContourS, nPointsS, flagS, glyphS, compositeS, bboxS, instrS] = streams as [
    Reader,
    Reader,
    Reader,
    Reader,
    Reader,
    Reader,
    Reader,
  ];
  const overlap = optionFlags & 1 ? src.subarray(off, off + ((numGlyphs + 7) >> 3)) : null;
  const bboxBitmapLen = ((numGlyphs + 31) >> 5) << 2;
  const bboxBitmap = bboxS.bytes(bboxBitmapLen);

  const glyphs: Buffer[] = [];
  const xMins: number[] = [];
  for (let i = 0; i < numGlyphs; i++) {
    const nContours = nContourS.i16();
    const hasBbox = (bboxBitmap[i >> 3]! & (0x80 >> (i & 7))) !== 0;
    if (nContours === 0) {
      glyphs.push(Buffer.alloc(0));
      xMins.push(0);
      continue;
    }
    if (nContours === -1) {
      if (!hasBbox) throw new Error("woff2: composite glyph without bbox");
      const bbox = [bboxS.i16(), bboxS.i16(), bboxS.i16(), bboxS.i16()];
      const start = compositeS.pos;
      let flags = 0;
      let haveInstructions = false;
      do {
        flags = compositeS.u16();
        compositeS.u16(); // glyph index
        compositeS.pos += flags & 0x0001 ? 4 : 2;
        if (flags & 0x0008) compositeS.pos += 2;
        else if (flags & 0x0040) compositeS.pos += 4;
        else if (flags & 0x0080) compositeS.pos += 8;
        if (flags & 0x0100) haveInstructions = true;
      } while (flags & 0x0020);
      const composite = src.subarray(start, compositeS.pos);
      const parts: Buffer[] = [];
      const head = Buffer.alloc(10);
      head.writeInt16BE(-1, 0);
      bbox.forEach((v, k) => head.writeInt16BE(v!, 2 + k * 2));
      parts.push(head, composite);
      if (haveInstructions) {
        const len = glyphS.u255();
        const lenBuf = Buffer.alloc(2);
        lenBuf.writeUInt16BE(len, 0);
        parts.push(lenBuf, instrS.bytes(len));
      }
      glyphs.push(Buffer.concat(parts));
      xMins.push(bbox[0]!);
      continue;
    }
    // Simple glyph.
    const endPts: number[] = [];
    let total = 0;
    for (let c = 0; c < nContours; c++) {
      total += nPointsS.u255();
      endPts.push(total - 1);
    }
    const xs: number[] = [];
    const ys: number[] = [];
    const on: boolean[] = [];
    let x = 0;
    let y = 0;
    for (let p = 0; p < total; p++) {
      let flag = flagS.u8();
      on.push((flag & 0x80) === 0);
      flag &= 0x7f;
      let dx: number;
      let dy: number;
      if (flag < 10) {
        dx = 0;
        dy = withSign(flag, ((flag & 14) << 7) + glyphS.u8());
      } else if (flag < 20) {
        dx = withSign(flag, (((flag - 10) & 14) << 7) + glyphS.u8());
        dy = 0;
      } else if (flag < 84) {
        const b0 = flag - 20;
        const b1 = glyphS.u8();
        dx = withSign(flag, 1 + (b0 & 0x30) + (b1 >> 4));
        dy = withSign(flag >> 1, 1 + ((b0 & 0x0c) << 2) + (b1 & 0x0f));
      } else if (flag < 120) {
        const b0 = flag - 84;
        dx = withSign(flag, 1 + (Math.floor(b0 / 12) << 8) + glyphS.u8());
        dy = withSign(flag >> 1, 1 + (((b0 % 12) >> 2) << 8) + glyphS.u8());
      } else if (flag < 124) {
        const a = glyphS.u8();
        const b2 = glyphS.u8();
        const c3 = glyphS.u8();
        dx = withSign(flag, (a << 4) + (b2 >> 4));
        dy = withSign(flag >> 1, ((b2 & 0x0f) << 8) + c3);
      } else {
        const a = glyphS.u8();
        const b = glyphS.u8();
        const c3 = glyphS.u8();
        const d = glyphS.u8();
        dx = withSign(flag, (a << 8) + b);
        dy = withSign(flag >> 1, (c3 << 8) + d);
      }
      x += dx;
      y += dy;
      xs.push(x);
      ys.push(y);
    }
    const instrLen = glyphS.u255();
    const instructions = instrS.bytes(instrLen);
    let bbox: number[];
    if (hasBbox) {
      bbox = [bboxS.i16(), bboxS.i16(), bboxS.i16(), bboxS.i16()];
    } else {
      bbox = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    }
    const flagsOut: number[] = [];
    const xOut: number[] = [];
    const yOut: number[] = [];
    let px = 0;
    let py = 0;
    for (let p = 0; p < total; p++) {
      let f = on[p] ? 0x01 : 0;
      if (p === 0 && overlap && overlap[i >> 3]! & (0x80 >> (i & 7))) f |= 0x40;
      const dx = xs[p]! - px;
      const dy = ys[p]! - py;
      px = xs[p]!;
      py = ys[p]!;
      if (dx === 0) f |= 0x10;
      else if (Math.abs(dx) < 256) {
        f |= 0x02 | (dx > 0 ? 0x10 : 0);
        xOut.push(1, Math.abs(dx));
      } else xOut.push(2, dx);
      if (dy === 0) f |= 0x20;
      else if (Math.abs(dy) < 256) {
        f |= 0x04 | (dy > 0 ? 0x20 : 0);
        yOut.push(1, Math.abs(dy));
      } else yOut.push(2, dy);
      flagsOut.push(f);
    }
    const coordBytes = (arr: number[]) => {
      let n = 0;
      for (let k = 0; k < arr.length; k += 2) n += arr[k]!;
      return n;
    };
    const size = 10 + nContours * 2 + 2 + instrLen + total + coordBytes(xOut) + coordBytes(yOut);
    const g = Buffer.alloc(size);
    let o = 0;
    g.writeInt16BE(nContours, o);
    o += 2;
    for (const v of bbox) {
      g.writeInt16BE(v, o);
      o += 2;
    }
    for (const e of endPts) {
      g.writeUInt16BE(e, o);
      o += 2;
    }
    g.writeUInt16BE(instrLen, o);
    o += 2;
    instructions.copy(g, o);
    o += instrLen;
    for (const f of flagsOut) g.writeUInt8(f, o++);
    for (const arr of [xOut, yOut]) {
      for (let k = 0; k < arr.length; k += 2) {
        if (arr[k] === 1) g.writeUInt8(arr[k + 1]!, o++);
        else {
          g.writeInt16BE(arr[k + 1]!, o);
          o += 2;
        }
      }
    }
    glyphs.push(g);
    xMins.push(bbox[0]!);
  }

  const offsets: number[] = [0];
  const padded = glyphs.map((g) => {
    const pad = (4 - (g.length % 4)) % 4;
    const b = pad ? Buffer.concat([g, Buffer.alloc(pad)]) : g;
    offsets.push(offsets[offsets.length - 1]! + b.length);
    return b;
  });
  const glyf = Buffer.concat(padded);
  const loca = Buffer.alloc(offsets.length * (indexFormat ? 4 : 2));
  offsets.forEach((v, k) => {
    if (indexFormat) loca.writeUInt32BE(v, k * 4);
    else loca.writeUInt16BE(v / 2, k * 2);
  });
  return { glyf, loca, xMins, indexFormat };
}

function reconstructHmtx(
  src: Buffer,
  numGlyphs: number,
  numHMetrics: number,
  xMins: number[],
): Buffer {
  const r = new Reader(src);
  const flags = r.u8();
  const advances = Array.from({ length: numHMetrics }, () => r.u16());
  const lsbs = Array.from({ length: numHMetrics }, (_, i) => (flags & 1 ? xMins[i]! : r.i16()));
  const rest = Array.from({ length: numGlyphs - numHMetrics }, (_, i) =>
    flags & 2 ? xMins[numHMetrics + i]! : r.i16(),
  );
  const out = Buffer.alloc(numHMetrics * 4 + rest.length * 2);
  let o = 0;
  for (let i = 0; i < numHMetrics; i++) {
    out.writeUInt16BE(advances[i]!, o);
    out.writeInt16BE(lsbs[i]!, o + 2);
    o += 4;
  }
  for (const v of rest) {
    out.writeInt16BE(v, o);
    o += 2;
  }
  return out;
}

export function woff2ToTtf(input: Buffer): Buffer {
  const r = new Reader(input);
  if (r.u32() !== 0x774f4632) throw new Error("woff2: bad signature");
  const flavor = r.u32();
  r.u32(); // length
  const numTables = r.u16();
  r.u16(); // reserved
  r.u32(); // totalSfntSize
  const totalCompressedSize = r.u32();
  r.pos += 4 + 4 * 5; // version, meta and private blocks
  const entries: Entry[] = [];
  for (let i = 0; i < numTables; i++) {
    const flags = r.u8();
    const tag =
      (flags & 0x3f) === 0x3f
        ? r.bytes(4).toString("latin1")
        : (KNOWN_TAGS[flags & 0x3f] ?? "????");
    const transformVersion = (flags >> 6) & 3;
    const origLength = r.base128();
    const transformed =
      tag === "glyf" || tag === "loca" ? transformVersion !== 3 : transformVersion !== 0;
    const length = transformed ? r.base128() : origLength;
    entries.push({ tag, origLength, transformVersion, length });
  }
  const data = brotliDecompressSync(input.subarray(r.pos, r.pos + totalCompressedSize));
  let off = 0;
  for (const e of entries) {
    e.data = data.subarray(off, off + e.length);
    off += e.length;
  }
  const byTag = new Map(entries.map((e) => [e.tag, e]));
  const glyfEntry = byTag.get("glyf");
  let xMins: number[] = [];
  if (glyfEntry && glyfEntry.transformVersion === 0) {
    const rebuilt = reconstructGlyf(glyfEntry.data!);
    glyfEntry.data = rebuilt.glyf;
    byTag.get("loca")!.data = rebuilt.loca;
    xMins = rebuilt.xMins;
  }
  const hmtx = byTag.get("hmtx");
  if (hmtx && hmtx.transformVersion === 1) {
    const numGlyphs = byTag.get("maxp")!.data!.readUInt16BE(4);
    const numHMetrics = byTag.get("hhea")!.data!.readUInt16BE(34);
    hmtx.data = reconstructHmtx(hmtx.data!, numGlyphs, numHMetrics, xMins);
  }
  // head.checkSumAdjustment is left at zero; FreeType does not check it.
  const head = byTag.get("head");
  if (head?.data) {
    head.data = Buffer.from(head.data);
    head.data.writeUInt32BE(0, 8);
  }

  const sorted = [...entries].sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  const n = sorted.length;
  const entrySelector = Math.floor(Math.log2(n));
  const searchRange = 2 ** entrySelector * 16;
  const header = Buffer.alloc(12 + n * 16);
  header.writeUInt32BE(flavor, 0);
  header.writeUInt16BE(n, 4);
  header.writeUInt16BE(searchRange, 6);
  header.writeUInt16BE(entrySelector, 8);
  header.writeUInt16BE(n * 16 - searchRange, 10);
  const bodies: Buffer[] = [];
  let offset = header.length;
  sorted.forEach((e, k) => {
    const body = e.data!;
    const pad = (4 - (body.length % 4)) % 4;
    const padded = pad ? Buffer.concat([body, Buffer.alloc(pad)]) : body;
    let sum = 0;
    for (let q = 0; q < padded.length; q += 4) sum = (sum + padded.readUInt32BE(q)) >>> 0;
    const rec = 12 + k * 16;
    header.write(e.tag, rec, 4, "latin1");
    header.writeUInt32BE(sum, rec + 4);
    header.writeUInt32BE(offset, rec + 8);
    header.writeUInt32BE(body.length, rec + 12);
    bodies.push(padded);
    offset += padded.length;
  });
  return Buffer.concat([header, ...bodies]);
}
