import type { APIRoute } from "astro";
import { site } from "../config/site";
import { palettes } from "../lib/palette";

/** A manifest has one colour pair: the night page for dark, paper for light and auto. */
const colour = palettes[site.theme === "dark" ? "dark" : "light"].page.toUpperCase();

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        name: "LanCompass",
        short_name: "LanCompass",
        start_url: "/",
        display: "browser",
        background_color: colour,
        theme_color: colour,
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      null,
      2,
    ),
    { headers: { "Content-Type": "application/manifest+json" } },
  );
