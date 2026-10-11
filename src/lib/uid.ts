let counter = 0;

/** Deterministic, build-unique ids for inline SVG defs and form fields. */
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}
