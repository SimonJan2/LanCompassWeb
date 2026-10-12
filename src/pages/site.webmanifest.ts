import type { APIRoute } from "astro";

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        name: "LanCompass",
        short_name: "LanCompass",
        start_url: "/",
        display: "browser",
        background_color: "#F4F1EA",
        theme_color: "#F4F1EA",
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
