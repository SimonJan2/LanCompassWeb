import type { APIRoute } from "astro";
import { compassIconSvg } from "../lib/brand";

export const GET: APIRoute = () =>
  new Response(compassIconSvg(), { headers: { "Content-Type": "image/svg+xml" } });
