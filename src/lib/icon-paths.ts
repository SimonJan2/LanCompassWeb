/**
 * The site's line icons (24 px grid, 1.5 px stroke, round caps, currentColor), drawn once in
 * /icons.svg (src/pages/icons.svg.ts) and referenced by <use> from components/Icon.astro, so a
 * page's HTML does not repeat their coordinates (W2: the home page stays inside its first round
 * trip). The same pattern as the section contours (src/pages/contours/).
 */
export const iconPaths = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  "chevron-down": '<path d="M6 9l6 6 6-6"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  ipam: '<rect x="9" y="3" width="6" height="4" rx="1"/><rect x="3" y="17" width="6" height="4" rx="1"/><rect x="15" y="17" width="6" height="4" rx="1"/><path d="M12 7v5M6 17v-3h12v3"/>',
  rack: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M5 8h14M5 13h14M8 5.5h.01M8 10.5h.01M8 15.5h.01M12 18h4"/>',
  radar:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l6-6"/><circle cx="15.5" cy="14.5" r="1"/>',
  topology:
    '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 6h10M6.2 7.7l4.6 8.6M17.8 7.7l-4.6 8.6"/>',
  backup:
    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 14.5l2 2 4-4"/>',
  shield: '<path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z"/><path d="M9 12l2 2 4-4"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  studio: '<rect x="3" y="4" width="18" height="14" rx="1.5"/><path d="M7 14l3-3 2 2 4-4M8 21h8"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
  plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>',
  users:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
  offline:
    '<path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4-2.5M19 13a10 10 0 0 0-2.6-1.9M2 9.5a15 15 0 0 1 4.4-3M22 9.5A15 15 0 0 0 11 5.1M12 20h.01"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3.5 6l8.5 7 8.5-7"/>',
  log: '<path d="M4 6h16M4 10h10M4 14h16M4 18h8"/>',
  excel:
    '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M3 14h18M9 4v16M15 4v16"/>',
  import: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
} as const;

export type IconName = keyof typeof iconPaths;

/** /icons.svg: every icon as a <symbol>, its id the icon's name. The symbols carry geometry
 *  only: fill, stroke and its width and caps come from the `.icon` rule (global.css) on the
 *  page's <svg>, and inherit into the <use>, as the attributes on the inline <svg> did. */
export function iconSprite(): string {
  const symbols = Object.entries(iconPaths)
    .map(([name, body]) => `<symbol id="${name}" viewBox="0 0 24 24">${body}</symbol>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg">${symbols}</svg>\n`;
}
