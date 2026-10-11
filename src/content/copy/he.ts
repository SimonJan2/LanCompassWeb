import type { Copy } from "./en";

/**
 * העתק העברי של הדפים המובנים. נכתב בעברית, לא תורגם מילה במילה; העובדות זהות
 * לאנגלית. מונחים לטיניים עטופים ב־<bdi>, וקוד ומספרים עם סימנים ב־<bdi> או <code>.
 * TODO(operator): native Hebrew copy review of this file before going public.
 */
export const he: Copy = {
  meta: {
    home: {
      title: "LanCompass — תיעוד רשת שמסכים עם הרשת",
      description:
        "ניהול כתובות, ארונות, גילוי רכיבים ובקרת סטיות במערכת אחת שרצה אצלכם, בפקודת docker compose up אחת. עובדת במלואה בלי אינטרנט, קוראת בלבד כברירת מחדל, ב־24 שפות עם עברית מלאה מימין לשמאל.",
    },
    product: {
      title: "המוצר — LanCompass",
      description:
        "ניהול כתובות, ארונות ותשתית פיזית, גילוי רכיבים, SNMP וטופולוגיה, גיבוי תצורות ותאימות, NAC, ניטור והפלטפורמה שמתחת — בהתקנה אחת שרצה אצלכם.",
    },
    security: {
      title: "אבטחה — LanCompass",
      description:
        "המידע לא יוצא מהרשת שלכם. בלי טלמטריה, רק שני נתיבי כתיבה שמופעלים לפי בחירה, סודות מוצפנים במנוחה, נעילת מפתחות SSH ויומן ביקורת מלא.",
    },
    "design-partners": {
      title: "שותפי פיתוח — LanCompass",
      description:
        "עבדו איתנו על LanCompass: התקנה מלווה, העברה מקובץ האקסל שלכם, קשר ישיר למהנדס והשפעה מוקדמת על מה שיוצא הלאה.",
    },
    contact: {
      title: "יצירת קשר — LanCompass",
      description: "שאלות על LanCompass, מהדורות או תוכניות תמיכה. כתבו לנו.",
    },
    accessibility: {
      title: "הצהרת נגישות — LanCompass",
      description: "איך האתר עומד ב־WCAG 2.1 AA ובתקן הישראלי 5568, ואיך מדווחים על בעיה.",
    },
    privacy: {
      title: "פרטיות — LanCompass",
      description: "האתר לא שומר עוגיות ולא טוען דבר מצד שלישי. מה הטפסים אוספים ולמה.",
    },
    notFound: {
      title: "הדף לא נמצא — LanCompass",
      description: "הדף הזה לא קיים. המצפן עדיין מצביע הביתה.",
    },
  },

  home: {
    hero: {
      chips: ["מותקנת אצלכם", "עובדת במלואה בלי אינטרנט", "קריאה בלבד כברירת מחדל"],
      title: "התיעוד והרשת שלכם סוף סוף מספרים אותו סיפור.",
      lead: "<bdi>LanCompass</bdi> מרכזת את ניהול הכתובות, הארונות והכבילה במערכת אחת שרצה אצלכם, מגלה מה באמת מחובר לרשת, ומסמנת כל מקום שבו התיעוד והמציאות נפרדים.",
      primary: "להצטרפות כשותפי פיתוח",
      secondary: "איך זה עובד",
    },
    facts: [
      { value: "24 שפות", label: "מימין לשמאל באמת, עם עברית וערבית מלאות." },
      {
        value: "12 אינטגרציות",
        label: "קודם כול <bdi>Check Point</bdi>, ואחריה חומות אש, וירטואליזציה ובקרים.",
      },
      {
        value: "בלי טלמטריה. בלי ענן.",
        label: "עובדת במלואה בלי אינטרנט. שום דבר לא מדווח החוצה.",
      },
      {
        value: "פקודה אחת: <code>docker compose up</code>",
        label: "מותקנת אצלכם, על שרת לינוקס משלכם.",
      },
    ],
    loop: {
      eyebrow: "איך זה עובד",
      title: "מתעדים. צופים. מיישבים.",
      lead: "לולאה אחת שומרת על תיעוד אמין. אתם רושמים איך הרשת אמורה להיראות, <bdi>LanCompass</bdi> בודקת מה יש בה בפועל, ואתם מחליטים מה נכון.",
      steps: [
        {
          name: "מתעדים",
          screen: "ipam-tree",
          text: "רושמים איך הרשת אמורה להיראות, מהתת־רשת ועד פאנל הניתוב.",
          bullets: [
            "אתרים, <bdi>VRF</bdi>, תתי־רשתות, כתובות <bdi>IP</bdi>, <bdi>VLAN</bdi> וטווחי <bdi>DHCP</bdi>",
            "ארונות, רכיבים, כבלים ופאנלי ניתוב, עם 1,594 סוגי רכיבים מובנים",
            "ייבוא מקובצי אקסל, גם בעברית, או מקובצי <bdi>CSV</bdi> של <bdi>NetBox</bdi>",
          ],
        },
        {
          name: "צופים",
          screen: "topology-observed",
          text: "<bdi>LanCompass</bdi> בודקת מה באמת מחובר, לעומק שאתם בוחרים.",
          bullets: [
            "סריקה מהירה כברירת מחדל; גילוי מעמיק וגילוי פסיבי (האזנה בלבד) לפי בחירה",
            "העשרה ב־<bdi>SNMP v1/v2c/v3</bdi>, מלכודות <bdi>SNMP</bdi> ושכנים ב־<bdi>LLDP</bdi> וב־<bdi>CDP</bdi>",
            "נתוני זמן ריצה מ־12 אינטגרציות, ובראשן <bdi>Check Point</bdi>",
          ],
        },
        {
          name: "מיישבים",
          screen: "review",
          text: "עוברים על כל מקום שבו התיעוד והרשת לא מסכימים, ומכריעים.",
          bullets: [
            "השכבה המתועדת והשכבה הנצפית על אותה טופולוגיה",
            "תור סקירה לסטיות",
            "גיבויי תצורה שנבדקים מול חבילות תאימות",
          ],
        },
      ],
    },
    bento: {
      eyebrow: "הכול בקופסה אחת",
      title: "התקנה אחת מכסה את הרשת, מתוכנית הכתובות ועד ההתראה.",
      lead: "בלי שרתי תוספת, בלי מסד נתונים שני, בלי חשבון בענן. כל חלק קורא מאותו תיעוד.",
      link: "לכל היכולות",
      tiles: [
        {
          key: "ipam",
          title: "ניהול כתובות ותשתית פיזית",
          text: "אתרים, <bdi>VRF</bdi>, תתי־רשתות, כתובות <bdi>IP</bdi>, <bdi>VLAN</bdi> וטווחי <bdi>DHCP</bdi>. ארונות, רכיבים, כבלים ופאנלי ניתוב, עם 1,594 סוגי רכיבים מובנים.",
          screen: "rack",
        },
        {
          key: "discovery",
          title: "גילוי רכיבים",
          text: "סריקה מהירה כברירת מחדל. גילוי מעמיק וגילוי פסיבי (האזנה בלבד) לפי בחירה, עם זיהוי רכיבים.",
        },
        {
          key: "snmp",
          title: "<bdi>SNMP</bdi> וטופולוגיה",
          text: "העשרה ומלכודות ב־<bdi>SNMP v1/v2c/v3</bdi>. שכני <bdi>LLDP</bdi> ו־<bdi>CDP</bdi> משרטטים את השכבה הנצפית.",
        },
        {
          key: "nac",
          title: "<bdi>NAC</bdi>",
          text: "קודם כול זיהוי. האכיפה אופציונלית, מוגנת, וכבויה כברירת מחדל.",
        },
        {
          key: "monitoring",
          title: "ניטור והתראות",
          text: "בדיקות <bdi>ping</bdi>, ‏<bdi>TCP</bdi> ו־<bdi>HTTP</bdi>. התראות ל־<bdi>webhook</bdi>, דוא״ל, <bdi>Discord</bdi>, ‏<bdi>Telegram</bdi> ו־<bdi>syslog</bdi>.",
        },
        {
          key: "config",
          title: "גיבוי תצורות ותאימות",
          text: "גיבוי תצורות ב־<bdi>SSH</bdi> עם נעילת מפתח המארח. חבילות תאימות ל־<bdi>Cisco IOS</bdi>, ‏<bdi>MikroTik RouterOS</bdi>, ‏<bdi>Check Point Gaia</bdi> ו־<bdi>FortiOS</bdi>.",
          screen: "compliance",
        },
        {
          // TODO(operator): confirm a one-line description of the Design studio; only the topology layers are in the claims list.
          key: "studios",
          title: "סטודיו הטופולוגיה וסטודיו התכנון",
          text: "השכבה המתועדת והשכבה הנצפית זו לצד זו, כך שאפשר לראות את הסטייה.",
        },
        {
          // TODO(operator): confirm report and dashboard specifics before naming any; this line stays generic on purpose.
          key: "reports",
          title: "דוחות ולוחות בקרה",
          text: "דוחות ולוחות בקרה על אותו תיעוד, באותה התקנה.",
        },
      ],
    },
    offline: {
      eyebrow: "אבטחה",
      title: "בנויה לרשתות שאסור להן לדבר עם העולם.",
      lead: "<bdi>LanCompass</bdi> מותקנת ורצה בלי חיבור לאינטרנט. היא קוראת את הרשת, ולא משנה בה דבר אלא אם ביקשתם.",
      points: [
        {
          title: "התקנה בלי אינטרנט",
          text: "פקודת <code>docker compose up</code> אחת. בלי תלות בענן, בלי טלמטריה.",
        },
        {
          title: "קריאה בלבד כברירת מחדל",
          text: "הכתיבות היחידות לרשת הן פרסום רשומות <bdi>DNS PTR</bdi> ופעולות פורט של <bdi>NAC</bdi>. שתיהן מופעלות רק לפי בחירה, וכבויות כברירת מחדל.",
        },
        {
          title: "סודות מוצפנים במנוחה",
          text: "פרטי גישה שמורים מוצפנים ב־<bdi>AES-256-GCM</bdi>.",
        },
        {
          title: "נעילת מפתח המארח",
          text: "גיבויי התצורה נועלים את מפתח ה־<bdi>SSH</bdi> של כל רכיב.",
        },
        {
          title: "<bdi>SSO</bdi>, ‏<bdi>LDAP</bdi> ו־<bdi>MFA</bdi>",
          text: "חשבונות מקומיים עם <bdi>TOTP</bdi>, כניסה יחידה ב־<bdi>OIDC</bdi>, ‏<bdi>LDAP</bdi> ו־<bdi>Active Directory</bdi>.",
        },
        {
          title: "ביקורת ל־<bdi>syslog</bdi>",
          text: "השינויים נשמרים ביומן ביקורת שאפשר להעביר ל־<bdi>syslog</bdi>.",
        },
      ],
      link: "איך אנחנו מטפלים באבטחה",
    },
    hebrew: {
      eyebrow: "עברית מהיסוד",
      title: "נבנתה בעברית, לא תורגמה אליה.",
      lead: "כל מסך עובד מימין לשמאל: טבלאות, עצים, טפסים ותצוגות ארון. עברית, ערבית, אנגלית ועוד 21 שפות, 24 בסך הכול.",
      enCaption: "אנגלית",
      heCaption: "עברית",
      screen: "dashboard",
    },
    integrations: {
      eyebrow: "אינטגרציות",
      title: "קוראת מהמערכות שכבר יש לכם.",
      lead: "שתים־עשרה אינטגרציות מביאות נתונים מהמערכות שכבר רצות אצלכם, וארבעה מנהלי התקן לתצורות מגבים ובודקים את תצורות הרכיבים.",
      highlight: {
        title: "נתוני זמן ריצה מ־<bdi>Check Point</bdi>",
        text: "<bdi>ARP</bdi>, ‏<bdi>DHCP</bdi> ו־<bdi>VPN</bdi>, לכל שער בנפרד.",
      },
      groupIntegrations: "אינטגרציות",
      groupDrivers: "מנהלי התקן לתצורות וחבילות תאימות",
      items: [
        "Check Point",
        "FortiGate",
        "Palo Alto PAN-OS",
        "OPNsense",
        "VMware vCenter / ESXi",
        "Proxmox",
        "Nutanix",
        "UniFi",
        "Omada",
        "MikroTik",
        "Active Directory / LDAP",
        "NetBox",
      ],
      drivers: ["Cisco IOS", "MikroTik RouterOS", "Check Point Gaia", "FortiOS"],
      extras: {
        title: "ועוד, מובנה",
        items: [
          "פרסום רשומות <bdi>DNS PTR</bdi> ל־<bdi>PowerDNS</bdi> או ב־<bdi>RFC 2136</bdi> (לפי בחירה)",
          "נקודת קצה למלאי של <bdi>Ansible</bdi>",
          "אסימוני <bdi>API</bdi> עם הרשאות מוגדרות",
        ],
      },
    },
    imports: {
      eyebrow: "מעבר",
      title: "תביאו את האקסל. או את ה־<bdi>NetBox</bdi>.",
      lead: "מתחילים מהתיעוד שכבר יש לכם, לא ממסך ריק.",
      cards: [
        {
          title: "קובצי אקסל",
          text: "מייבאים את הקובץ שהצוות מתחזק כבר שנים, בעברית או באנגלית. רואים תצוגה מקדימה לפני שמשהו נשמר.",
          bullets: ["ייבוא שמבין עברית", "תצוגה מקדימה לפני שמירה"],
        },
        {
          title: "קובצי <bdi>CSV</bdi> מ־<bdi>NetBox</bdi>",
          text: "מביאים קובצי <bdi>CSV</bdi> מגרסאות <bdi>3.6</bdi> עד <bdi>4.2</bdi> ומעלה. דוח כיסוי מראה מה עבר.",
          bullets: ["<bdi>NetBox 3.6–4.2+</bdi>", "דוח כיסוי אחרי הייבוא"],
        },
      ],
    },
    videos: {
      eyebrow: "צפייה",
      title: "שלושה סרטונים קצרים, משימה אחת בכל אחד.",
      items: [
        { key: "hebrew-excel-import", title: "ייבוא קובץ אקסל בעברית" },
        {
          key: "check-point-gateway-pull",
          title: "משיכת נתוני זמן ריצה משער <bdi>Check Point</bdi>",
        },
        { key: "drift-review-queue", title: "עבודה על תור סקירת הסטיות" },
      ],
    },
    partners: {
      eyebrow: "שותפי פיתוח",
      title: "בואו לעצב את <bdi>LanCompass</bdi> איתנו.",
      lead: "אנחנו מחפשים מספר קטן של צוותי רשת שיריצו את <bdi>LanCompass</bdi> על רשתות אמיתיות ויגידו לנו מה חסר.",
      getsTitle: "מה תקבלו",
      gets: [
        "התקנה מלווה על החומרה שלכם",
        "העברה מהאקסל שלכם, יחד איתכם",
        "קשר ישיר למהנדס שבונה את המוצר",
        "השפעה מוקדמת על מה שיוצא הלאה",
      ],
      asksTitle: "מה נבקש",
      asks: ["משוב כן, באופן קבוע", "המלצה, אם זה עובד לכם"],
      cta: "להצטרפות כשותפי פיתוח",
    },
  },

  product: {
    eyebrow: "המוצר",
    title: "כל מה ש־<bdi>LanCompass</bdi> עושה, חלק אחר חלק.",
    lead: "התקנה אחת שרצה אצלכם מכסה כתובות, תשתית פיזית, גילוי רכיבים, תצורות, בקרת גישה וניטור. כל חלק נגמר במגבלות שכדאי להכיר.",
    sections: [
      {
        id: "ipam",
        nav: "ניהול כתובות",
        title: "ניהול כתובות (<bdi>IPAM</bdi>)",
        intro:
          "מתכננים ועוקבים אחרי מרחב הכתובות כמו שהרשת בנויה באמת. אתרים, <bdi>VRF</bdi>, תתי־רשתות, כתובות, <bdi>VLAN</bdi> וטווחי <bdi>DHCP</bdi> יושבים בעץ אחד.",
        screen: "ipam-tree",
        bullets: [
          "אתרים ו־<bdi>VRF</bdi> עם תתי־רשתות מקוננות",
          "כתובות <bdi>IP</bdi> ו־<bdi>VLAN</bdi>",
          "טווחי <bdi>DHCP</bdi>",
          "ייבוא מקובצי אקסל, גם בעברית",
          "ייבוא מקובצי <bdi>CSV</bdi> של <bdi>NetBox</bdi> (<bdi>3.6–4.2+</bdi>)",
          "פרסום רשומות <bdi>DNS PTR</bdi> ל־<bdi>PowerDNS</bdi> או ב־<bdi>RFC 2136</bdi>",
        ],
        note: "פרסום <bdi>DNS PTR</bdi> הוא אחת משתי הכתיבות היחידות לרשת. הוא מופעל רק לפי בחירה, וכבוי כברירת מחדל.",
      },
      {
        id: "dcim",
        nav: "ארונות ותשתית",
        title: "ארונות ותשתית פיזית (<bdi>DCIM</bdi>)",
        intro: "מתעדים את השכבה הפיזית עד פאנל הניתוב. תצוגות הארון מראות מה יושב איפה.",
        screen: "rack",
        bullets: [
          "ארונות ותצוגות ארון",
          "רכיבים והכבלים שלהם",
          "פאנלי ניתוב",
          "1,594 סוגי רכיבים מובנים",
        ],
        note: "ספריית סוגי הרכיבים מגיעה בתוך ההתקנה, כך שהיא זמינה גם בלי אינטרנט.",
      },
      {
        id: "discovery",
        nav: "גילוי רכיבים",
        title: "גילוי רכיבים",
        intro:
          "מתחילים בסריקה מהירה, ומעמיקים רק איפה שבוחרים. הגילוי המעמיק והגילוי הפסיבי מזהים את הרכיבים שהם מוצאים.",
        screen: "deep-discovery",
        bullets: [
          "סריקה מהירה",
          "גילוי מעמיק, לפי בחירה",
          "גילוי פסיבי בהאזנה בלבד, לפי בחירה",
          "זיהוי רכיבים",
        ],
        note: "הגילוי המעמיק והפסיבי כבויים עד שמפעילים אותם. ברירת המחדל היא הסריקה המהירה.",
      },
      {
        id: "snmp",
        nav: "<bdi>SNMP</bdi> וטופולוגיה",
        title: "<bdi>SNMP</bdi> וטופולוגיה",
        intro:
          "<bdi>SNMP</bdi> משלים את מה שסריקה לא רואה. נתוני השכנים משרטטים את הטופולוגיה הנצפית ליד זו שתיעדתם.",
        screen: "topology-observed",
        bullets: [
          "העשרה ב־<bdi>SNMP v1</bdi>, ‏<bdi>v2c</bdi> ו־<bdi>v3</bdi>",
          "מלכודות <bdi>SNMP</bdi>",
          "שכנים ב־<bdi>LLDP</bdi> וב־<bdi>CDP</bdi>",
          "שכבה מתועדת ושכבה נצפית בטופולוגיה",
        ],
        note: "השכבה הנצפית מציגה קישורים רק איפה שהרכיבים מפרסמים שכני <bdi>LLDP</bdi> או <bdi>CDP</bdi>.",
      },
      {
        id: "config",
        nav: "תצורות ותאימות",
        title: "תצורות ותאימות",
        intro:
          "מגבים תצורות רכיבים ב־<bdi>SSH</bdi> ובודקים אותן מול חבילות תאימות. מפתח ה־<bdi>SSH</bdi> של כל רכיב ננעל.",
        screen: "compliance",
        bullets: [
          "גיבוי תצורות ב־<bdi>SSH</bdi>",
          "נעילת מפתח המארח ב־<bdi>SSH</bdi>",
          "חבילות תאימות: <bdi>Cisco IOS</bdi>, ‏<bdi>MikroTik RouterOS</bdi>, ‏<bdi>Check Point Gaia</bdi>, ‏<bdi>FortiOS</bdi>",
          "סודות בתצורות השמורות מוסתרים; צפייה בגרסה דורשת את ההרשאה <code>config:read</code>",
        ],
        note: "הגיבוי רק קורא תצורות. <bdi>LanCompass</bdi> אף פעם לא דוחפת תצורה לרכיב.",
      },
      {
        id: "nac",
        nav: "<bdi>NAC</bdi>",
        title: "בקרת גישה לרשת (<bdi>NAC</bdi>)",
        intro: "מתחילים בזיהוי. אכיפה קיימת, אבל היא אופציונלית, מוגנת, וכבויה כברירת מחדל.",
        screen: "nac",
        bullets: [
          "זיהוי <bdi>NAC</bdi>",
          "אכיפה אופציונלית ומוגנת",
          "פעולות פורט מופעלות רק לפי בחירה, וכבויות כברירת מחדל",
        ],
        note: "אכיפת <bdi>NAC</bdi> כבויה כברירת מחדל ודורשת <bdi>SNMPv3</bdi> עם הצפנה.",
      },
      {
        id: "monitoring",
        nav: "ניטור והתראות",
        title: "ניטור והתראות",
        intro: "בודקים שמה שתיעדתם עונה. וכשלא, מודיעים למי שצריך לדעת.",
        screen: "dashboard",
        bullets: [
          "בדיקות <bdi>ping</bdi>, ‏<bdi>TCP</bdi> ו־<bdi>HTTP</bdi>",
          "התראות ל־<bdi>webhook</bdi> ולדוא״ל",
          "התראות ל־<bdi>Discord</bdi> ול־<bdi>Telegram</bdi>",
          "התראות ל־<bdi>syslog</bdi>",
        ],
        note: "התראות נשלחות רק לערוצים שהגדרתם.",
      },
      {
        // TODO(operator): the studios have no entry in the claims list beyond the documented/observed layers; confirm what else to say.
        id: "studios",
        nav: "סטודיו",
        title: "סטודיו הטופולוגיה וסטודיו התכנון",
        intro: "תצוגת הטופולוגיה מפרידה בין הרשת המתועדת לרשת הנצפית, כך שאפשר להצביע על אי־התאמה.",
        screen: "topology-observed",
        bullets: ["שכבה מתועדת", "שכבה נצפית", "סטייה מסומנת במקום שבו השתיים שונות"],
        note: "הקישורים הנצפים מגיעים משכני <bdi>LLDP</bdi> ו־<bdi>CDP</bdi>, ולכן מופיעים איפה שהרכיבים מפרסמים אותם.",
      },
      {
        // TODO(operator): reports and dashboards have no entry in the claims list; confirm specifics before listing any.
        id: "reports",
        nav: "דוחות ולוחות בקרה",
        title: "דוחות ולוחות בקרה",
        intro: "דוחות ולוחות בקרה קוראים מאותו תיעוד כמו כל השאר. אין שרת דוחות נפרד להריץ.",
        screen: "dashboard",
        bullets: ["לוחות בקרה באותה התקנה", "דוחות על אותם נתונים"],
        note: "הדוחות רצים על השרת שלכם, כמו כל <bdi>LanCompass</bdi>.",
      },
      {
        id: "platform",
        nav: "פלטפורמה",
        title: "פלטפורמה",
        intro:
          "החלקים שמאפשרים להריץ את <bdi>LanCompass</bdi> שנים: כניסה, אוטומציה, גיבויים והתאוששות. הכול מותקן בפקודת <code>docker compose up</code> אחת.",
        screen: null,
        bullets: [
          "חשבונות מקומיים עם <bdi>TOTP MFA</bdi>, כניסה יחידה ב־<bdi>OIDC</bdi>, וכניסה ב־<bdi>LDAP</bdi> וב־<bdi>Active Directory</bdi>",
          "אסימוני <bdi>API</bdi> עם הרשאות מוגדרות ונקודת קצה למלאי של <bdi>Ansible</bdi>",
          "גיבויים מתוזמנים עם תרגילי שחזור אוטומטיים",
          "שרת המתנה חם (<bdi>warm standby</bdi>)",
          "חבילת תמיכה לפתרון תקלות",
          "24 שפות ממשק, עם עברית וערבית מלאות מימין לשמאל",
        ],
        note: "עובדת במלואה בלי אינטרנט: בלי תלות בענן ובלי טלמטריה.",
      },
    ],
    cta: {
      title: "תראו אותה על הרשת שלכם.",
      text: "שותפי פיתוח מקבלים התקנה מלווה ועזרה בהעברת התיעוד הקיים.",
      button: "להצטרפות כשותפי פיתוח",
    },
  },

  partners: {
    eyebrow: "שותפי פיתוח",
    title: "הריצו את <bdi>LanCompass</bdi> על רשת אמיתית, עם המהנדס על הקו.",
    lead: "<bdi>LanCompass</bdi> מוכנה לשותפים הראשונים: צוותי רשת של אחד עד עשרה אנשים, שמחזיקים את הרשת באוויר ואת התיעוד אמין, הרבה פעמים בארגונים מפוקחים והרבה פעמים על <bdi>Check Point</bdi>.",
    getsTitle: "מה תקבלו",
    gets: [
      { title: "התקנה מלווה", text: "מתקינים יחד איתכם, על החומרה שלכם, עם אינטרנט או בלעדיו." },
      { title: "העברה מהאקסל שלכם", text: "מעבירים את הקובץ הקיים יחד, ובודקים את התוצאה ביחד." },
      { title: "קשר ישיר למהנדס", text: "השאלות מגיעות למי שכתב את הקוד, לא לתור פניות." },
      { title: "השפעה מוקדמת", text: "מה שאתם צריכים משפיע על מה שיוצא הלאה." },
    ],
    asksTitle: "מה נבקש",
    asks: [
      { title: "משוב", text: "ספרו לנו מה עובד, מה לא, ומה חסר." },
      {
        title: "המלצה, אם זה עובד",
        text: "רק אם <bdi>LanCompass</bdi> תרוויח אותה, ורק בהסכמתכם.",
      },
    ],
    stepsTitle: "איך זה מתנהל",
    steps: [
      { title: "פונים", text: "מספרים לנו על הרשת בטופס שלמטה." },
      { title: "מדברים", text: "שיחה קצרה כדי לבדוק אם <bdi>LanCompass</bdi> מתאימה." },
      { title: "מתקינים", text: "התקנה מלווה וייבוא ראשון מהתיעוד שלכם." },
      { title: "משתמשים, ומספרים לנו", text: "פגישות מעקב קבועות בזמן שאתם עובדים איתה." },
    ],
    pricing: "מהדורות ותוכניות תמיכה בדרך — דברו איתנו.",
    formTitle: "בקשה להצטרף כשותפי פיתוח",
    formLead: "כמה שאלות על הרשת שלכם, כדי שהשיחה הראשונה תהיה מועילה.",
  },

  contact: {
    eyebrow: "יצירת קשר",
    title: "דברו איתנו.",
    lead: "שאלות על <bdi>LanCompass</bdi>, על שותפות פיתוח, או על אינטגרציה שאתם צריכים.",
    pricing: "מהדורות ותוכניות תמיכה בדרך — דברו איתנו.",
    emailLabel: "דוא״ל",
    formTitle: "שליחת הודעה",
  },

  notFound: {
    eyebrow: "404",
    title: "הדף הזה מחוץ למפה.",
    lead: "ייתכן שהכתובת זזה, או שהיא מעולם לא הייתה קיימת. המצפן עדיין מצביע הביתה.",
    home: "חזרה לדף הבית",
  },
};
