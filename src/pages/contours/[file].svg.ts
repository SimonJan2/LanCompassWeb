import type { APIRoute, GetStaticPaths } from "astro";
import {
  contourMaps,
  contourSvg,
  contourTones,
  type ContourMap,
  type ContourTone,
} from "../../lib/contour-maps";

/** /contours/<map>-<tone>.svg: the section backgrounds, built once and cached by the browser. */
export const getStaticPaths = (() =>
  (Object.keys(contourMaps) as ContourMap[]).flatMap((map) =>
    (Object.keys(contourTones) as ContourTone[]).map((tone) => ({
      params: { file: `${map}-${tone}` },
      props: { map, tone },
    })),
  )) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { map, tone } = props as { map: ContourMap; tone: ContourTone };
  return new Response(contourSvg(map, tone), { headers: { "Content-Type": "image/svg+xml" } });
};
