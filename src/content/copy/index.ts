import type { Locale } from "../../i18n/locales";
import { en, type Copy } from "./en";
import { he } from "./he";

const copies: Record<Locale, Copy> = { en, he };

export function getCopy(locale: Locale): Copy {
  return copies[locale];
}

export type { Copy };
