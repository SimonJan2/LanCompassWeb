# Hebrew voice

How the Hebrew site is written. It is written in Hebrew first, from the facts in the claims list, never translated from the English page. Sources: [`web-roadmap/research/W1_1_RESEARCH.md`](../../../lancompass-data/web-roadmap/research/W1_1_RESEARCH.md) §2, and the product's own Hebrew interface (`LanCompass/frontend/src/i18n/messages/he.json`) for terms.

`tests/hebrew.spec.ts` checks the mechanical rules on every `/he/` page. A native reviewer checks the rest with [`he-review.md`](he-review.md).

## Register

- Engineer to engineer. Short sentences, verbs before adjectives.
- Morning's warmth and brevity; Bynet's directness; none of anyone's superlatives.
- Headlines run 3–8 words.
- Say what the product does, not how good it is.

## Form of address

| Where                                                      | Form                                             | Example                                              |
| ---------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------- |
| Buttons, CTAs, menu items                                  | Infinitive with ל־, or a verbal noun             | להצטרפות כשותפי פיתוח · שליחת הבקשה · סגירת התפריט   |
| Body copy                                                  | Plural imperative and plural possessive are fine | כתבו לנו · הרשת שלכם                                 |
| Steps and how-to lines                                     | Impersonal present plural                        | מתעדים. בודקים. סוגרים פערים.                        |
| Consent                                                    | First person, gender-neutral                     | קראתי ואישרתי את הודעת הפרטיות                       |
| Never                                                      | Masculine-singular imperative                    | ~~שלח~~ ~~הירשם~~ ~~לחץ~~ ~~הצטרף~~ ~~בחר~~ ~~המשך~~ |
| Only in a form label, and only when nothing neutral exists | Slash form                                       | (none used today)                                    |

## Latin inside Hebrew

- Product and technical terms stay in Latin script: `LanCompass`, `Check Point`, `SNMP`, `VLAN`, `NetBox`. Never transliterate a product name (נטבוקס ✗).
- Every Latin run sits in `<bdi>` (or `<code>` for commands and identifiers).
- A Hebrew prefix attaches with the maqaf ־: `ב־<bdi>SSH</bdi>`, `ל־<bdi>syslog</bdi>`, `מ־<bdi>NetBox</bdi>`.
- After a comma, when the next item is Latin, put a right-to-left mark (U+200F) before the `<bdi>`, so the comma stays where a Hebrew reader expects it: `<bdi>TCP</bdi>, ‏<bdi>HTTP</bdi>`.
- Numbers with a range or a sign (`3.6–4.2+`, `100–500`) are isolated: `<bdi>` in HTML, U+2066 … U+2069 in plain-text places such as `<option>`.

## Punctuation

- Gershayim ״ in abbreviations: דוא״ל, ת״י. Never an ASCII `"` next to a Hebrew letter.
- Geresh ׳: פאנל פאץ׳.
- Maqaf ־ for a prefix before Latin or a number: ב־24 שפות.
- En dash – for ranges, inside an isolated run.
- An em dash — with spaces for an aside, sparingly.

## Glossary

Taken from the product's Hebrew interface where it has a term, so the site and the product say the same thing.

| English                         | Hebrew                         | Note                                               |
| ------------------------------- | ------------------------------ | -------------------------------------------------- |
| documentation, the record       | התיעוד                         |                                                    |
| documented                      | מתועד                          | product: `topo.layer.documented`                   |
| observed                        | נצפה                           | product: `topo.layer.observed`                     |
| drift                           | סטייה, סטיות                   | product: `dashEd.metric.driftOpen`; "פער" in prose |
| review queue                    | תור הסקירה                     | product: `tour.step.review.title`                  |
| prefix                          | קידומת                         | product: `entity.Prefix` (W1 used תת־רשת)          |
| rack / rack elevation           | ארון / שרטוט הארון             | product: `entity.Rack`, `tour.step.racks.title`    |
| patch panel                     | פאנל פאץ׳                      | product: `design.cat.net.patch-panel`              |
| deep discovery                  | גילוי מעמיק                    | product: `settings.nav.discovery`                  |
| passive (listen-only) discovery | גילוי סביל (האזנה בלבד)        | product: `discovery.profile.passive`               |
| compliance pack                 | חבילת תאימות                   | product: `entity.CompliancePack`                   |
| warm standby                    | שרת גיבוי חם                   | product: `settings.standby.title`                  |
| support bundle                  | חבילת תמיכה                    | product: `settings.support.downloaded`             |
| restore drill                   | תרגול שחזור                    |                                                    |
| host-key pinning                | נעילת מפתח המארח               |                                                    |
| runtime data                    | נתונים חיים                    | never "בזמן אמת"                                   |
| design partner                  | שותף פיתוח, שותפי פיתוח        |                                                    |
| self-hosted                     | מותקנת אצלכם                   |                                                    |
| read-only by default            | קריאה בלבד כברירת מחדל         |                                                    |
| config driver                   | דרייבר לתצורות                 |                                                    |
| scoped API token                | אסימון `API` עם הרשאות מוגבלות |                                                    |

## Banned

Marketing clichés: פתרון מקצה לקצה · המוביל · חדשני · פורץ דרך · מהפכני · הדבר הגדול הבא · ברמה הגבוהה ביותר · חוויית משתמש מושלמת · סינרגיה · בקליק אחד · העתיד כבר כאן.

Calques that give away a translation: באותו עמוד · לקחת … לשלב הבא · בסופו של יום · לעשות הבדל · מגיע עם · מופעל על ידי · בזמן אמת (unless it is literally real-time).
