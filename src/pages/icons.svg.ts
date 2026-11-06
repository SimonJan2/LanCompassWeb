import type { APIRoute } from "astro";
import { iconSprite } from "../lib/icon-paths";

/** /icons.svg: the site's line icons as <symbol>s, built once and cached by the browser. */
export const GET: APIRoute = () =>
  new Response(iconSprite(), { headers: { "Content-Type": "image/svg+xml" } });
