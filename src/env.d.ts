interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_CONTACT_EMAIL?: string;
  readonly PUBLIC_FORM_ENDPOINT?: string;
  readonly PUBLIC_DOCS_URL?: string;
  readonly PUBLIC_SITE_THEME?: string;
  readonly PUBLIC_SITE_INDEXING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** W13: true in an auto build (astro.config.mjs → vite.define); the switch's code needs it. */
declare const __LC_AUTO__: boolean;

/** The figure marks' positions, generated at build time (astro.config.mjs → figureMarksCss). */
declare module "virtual:lancompass/figure-marks.css";

declare namespace App {
  interface Locals {
    /** Set by a page: every Icon on it is drawn inline, none as a <use> of /icons.svg. */
    inlineIcons?: boolean;
  }
}
