import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { pages } from "./helpers";

/**
 * The originality guard. Every @surface and @accent colour token in
 * src/styles/tokens.css must sit at CIEDE2000 ΔE ≥ 15 from each NetBox Labs
 * colour (research table in docs/design/originality.md); @text tokens are
 * exempt. The home hero must be light, and the W1 grid-paper motif must not
 * come back. ΔE2000 is implemented here (Sharma, Wu & Dalal 2005), no dependency.
 */

const NETBOX = [
  "#090B0B",
  "#131515",
  "#02060A",
  "#252929",
  "#00F2D4",
  "#8FEEB4",
  "#90EEB4",
  "#023035",
  "#012229",
  "#FFAC00",
  "#FF2F13",
];
const MIN_DELTA_E = 15;
const PAPER: RGB = [0xf4, 0xf1, 0xea];

type RGB = [number, number, number];
type Lab = [number, number, number];

function toLab([r8, g8, b8]: RGB): Lab {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [lin(r8), lin(g8), lin(b8)];
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function deltaE2000([L1, a1, b1]: Lab, [L2, a2, b2]: Lab): number {
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hue = (b: number, a: number) => {
    if (a === 0 && b === 0) return 0;
    const h = Math.atan2(b, a) / rad;
    return h < 0 ? h + 360 : h;
  };
  const h1p = hue(b1, a1p);
  const h2p = hue(b2, a2p);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hbp += h1p + h2p < 360 ? 360 : -360;
    hbp /= 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hbp - 30) * rad) +
    0.24 * Math.cos(2 * hbp * rad) +
    0.32 * Math.cos((3 * hbp + 6) * rad) -
    0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const RC = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;
  const RT = -Math.sin(2 * dTheta * rad) * RC;
  return Math.sqrt(
    (dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH),
  );
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as RGB;
}

/** A colour value as opaque RGB; translucent colours are composited over paper. */
function parseColour(value: string): RGB | null {
  const v = value.trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(v)) return hexToRgb(v);
  const m = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)$/);
  if (!m) return null;
  const alpha = m[4] === undefined ? 1 : Number(m[4]);
  return [1, 2, 3].map((i, k) => Math.round(Number(m[i]) * alpha + PAPER[k]! * (1 - alpha))) as RGB;
}

interface Token {
  name: string;
  value: string;
  tag: string | null;
}

function readTokens(): Token[] {
  const css = readFileSync(join(process.cwd(), "src", "styles", "tokens.css"), "utf8");
  const tokens: Token[] = [];
  for (const line of css.split("\n")) {
    const m = line.match(/^\s*(--lc-[\w-]+):\s*([^;]+);(.*)$/);
    if (!m) continue;
    tokens.push({
      name: m[1]!,
      value: m[2]!.trim(),
      tag: m[3]!.match(/@(surface|accent|text)/)?.[1] ?? null,
    });
  }
  return tokens;
}

/** Follows var(--x) aliases to a literal value. */
function resolve(tokens: Token[], value: string, depth = 0): string {
  const m = value.match(/^var\((--lc-[\w-]+)\)$/);
  if (!m || depth > 8) return value;
  const target = tokens.find((t) => t.name === m[1]);
  return target ? resolve(tokens, target.value, depth + 1) : value;
}

test.describe("identity: distance from NetBox Labs", () => {
  const tokens = readTokens();

  test("tokens.css has colour tokens, and every one is tagged", () => {
    const colours = tokens.filter((t) => parseColour(resolve(tokens, t.value)) !== null);
    expect(colours.length).toBeGreaterThan(20);
    expect(colours.filter((t) => !t.tag).map((t) => t.name)).toEqual([]);
  });

  test("every @surface and @accent token is ΔE2000 ≥ 15 from every NetBox Labs colour", () => {
    const failures: string[] = [];
    let checked = 0;
    for (const token of tokens) {
      if (token.tag !== "surface" && token.tag !== "accent") continue;
      const rgb = parseColour(resolve(tokens, token.value));
      if (!rgb) {
        failures.push(`${token.name}: unparseable colour "${token.value}"`);
        continue;
      }
      checked++;
      for (const ref of NETBOX) {
        const d = deltaE2000(toLab(rgb), toLab(hexToRgb(ref)));
        if (d < MIN_DELTA_E)
          failures.push(`${token.name} ${token.value} vs ${ref}: ΔE ${d.toFixed(1)}`);
      }
    }
    expect(checked).toBeGreaterThan(20);
    expect(failures).toEqual([]);
  });

  test("the ΔE implementation matches the research table", () => {
    const d = (a: string, b: string) => deltaE2000(toLab(hexToRgb(a)), toLab(hexToRgb(b)));
    expect(d("#0B0D10", "#02060A")).toBeCloseTo(1.4, 1);
    expect(d("#F5B544", "#FFAC00")).toBeCloseTo(4.7, 1);
    expect(d("#F4F1EA", "#90EEB4")).toBeCloseTo(23.8, 1);
    expect(d("#1C2140", "#02060A")).toBeCloseTo(16.2, 1);
  });

  test("no grid-paper in the built CSS", () => {
    const dir = join(process.cwd(), "dist-test", "_astro");
    const css = readdirSync(dir)
      .filter((f) => f.endsWith(".css"))
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .join("\n");
    expect(css).not.toContain("grid-paper");
  });

  test("the home hero is light (L* ≥ 80) in both locales", async ({ page }) => {
    for (const path of ["/", "/he/"]) {
      await page.goto(path);
      const colour = await page.locator(".hero").evaluate((el) => {
        let node: Element | null = el;
        while (node) {
          const bg = getComputedStyle(node).backgroundColor;
          if (bg && bg !== "transparent" && !/rgba\(.*,\s*0\)$/.test(bg)) return bg;
          node = node.parentElement;
        }
        return "rgb(255, 255, 255)";
      });
      const rgb = parseColour(colour);
      expect(rgb, colour).not.toBeNull();
      expect(toLab(rgb!)[0], `${path} hero L*`).toBeGreaterThanOrEqual(80);
    }
  });

  for (const p of pages) {
    test(`${p.path}: no .grid-paper element, at most two night bands`, async ({ page }) => {
      await page.goto(p.path);
      await expect(page.locator(".grid-paper")).toHaveCount(0);
      expect(await page.locator(".surface-night").count()).toBeLessThanOrEqual(2);
    });
  }
});
