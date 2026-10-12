interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_CONTACT_EMAIL?: string;
  readonly PUBLIC_FORM_ENDPOINT?: string;
  readonly PUBLIC_GITHUB_URL?: string;
  readonly PUBLIC_DOCS_URL?: string;
  readonly PUBLIC_SITE_THEME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
