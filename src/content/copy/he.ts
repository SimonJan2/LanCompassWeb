import type { Copy } from "./en";

/**
 * העתק העברי של הדפים המובנים. נכתב בעברית מהעובדות שברשימת הטענות, לא תורגם
 * מהאנגלית. כללי הקול, הפנייה, הפיסוק והמונחים: docs/copy/he-voice.md. מונחים
 * לטיניים עטופים ב־<bdi>, וקוד ב־<code>. כל מחרוזת כאן מופיעה עם תרגום חוזר
 * באנגלית ב־docs/copy/he-review.md.
 * TODO(operator): native Hebrew copy review of this file (docs/copy/he-review.md) before going public.
 */
export const he: Copy = {
  meta: {
    home: {
      title: "LanCompass — תיעוד רשת שתואם את המציאות",
      description:
        "ניהול כתובות, ארונות וגילוי רכיבים במערכת אחת שמותקנת אצלכם, עם תור סקירה לכל פער בין התיעוד לרשת. עובדת בלי אינטרנט, קוראת בלבד כברירת מחדל, ב־24 שפות עם עברית מלאה.",
    },
    product: {
      title: "המוצר — LanCompass",
      description:
        "ניהול כתובות, ארונות ותשתית פיזית, גילוי רכיבים, SNMP וטופולוגיה, גיבוי תצורות ותאימות, NAC וניטור — הכול בהתקנה אחת שרצה אצלכם.",
    },
    security: {
      title: "אבטחה — LanCompass",
      description:
        "המידע נשאר ברשת שלכם. בלי טלמטריה, רק שתי פעולות כתיבה וכברירת מחדל שתיהן כבויות, סודות מוצפנים, נעילת מפתחות SSH ויומן ביקורת.",
    },
    "design-partners": {
      title: "שותפי פיתוח — LanCompass",
      description:
        "התקנה מלווה, מעבר מהאקסל שלכם, קו ישיר למהנדס שכותב את הקוד והשפעה מוקדמת על מה שייבנה בהמשך.",
    },
    contact: {
      title: "יצירת קשר — LanCompass",
      description: "שאלות על LanCompass, על מהדורות או על תוכניות תמיכה? כתבו לנו.",
    },
    accessibility: {
      title: "הצהרת נגישות — LanCompass",
      description: "איך האתר עומד ב־WCAG 2.1 ברמה AA ובת״י 5568, ואיך לדווח לנו על בעיה.",
    },
    privacy: {
      title: "פרטיות — LanCompass",
      description: "האתר לא שומר עוגיות ולא טוען שום דבר מצד שלישי. מה הטפסים אוספים, ולמה.",
    },
    notFound: {
      title: "הדף לא נמצא — LanCompass",
      description: "הכתובת הזו לא מגיעה לשום דף. המצפן עדיין מכוון הביתה.",
    },
  },

  home: {
    hero: {
      chips: ["מותקנת אצלכם", "עובדת בלי אינטרנט", "קריאה בלבד כברירת מחדל"],
      title: "מה שכתוב בתיעוד זה מה שיש ברשת.",
      lead: "<bdi>LanCompass</bdi> מרכזת את ניהול הכתובות, הארונות והכבלים במערכת אחת שמותקנת אצלכם, בודקת מה באמת מחובר לרשת, ומסמנת כל פער בין התיעוד לבין מה שקורה בפועל.",
      primary: "להצטרפות כשותפי פיתוח",
      secondary: "איך זה עובד",
      marginalia: ["10.20.0.0/16", "10.20.12.0/24 · lobby", "sw-core-02 → ap-lobby-3"],
    },
    datasheet: {
      title: "מפרט",
      note: "כל שורה כאן היא עובדה על המוצר, כמו שהוא היום.",
      rows: [
        {
          label: "התקנה",
          value: "פקודת <code>docker compose up</code> אחת, על שרת לינוקס שלכם",
        },
        { label: "גישה לאינטרנט", value: "לא נדרשת. בלי ענן, בלי טלמטריה" },
        {
          label: "ברירת מחדל",
          value:
            "קריאה בלבד. שתי כתיבות לפי בחירה: <bdi>DNS PTR</bdi> ופעולות פורט ב־<bdi>NAC</bdi>",
        },
        { label: "שפות", value: "24, עם עברית וערבית מלאות מימין לשמאל" },
        { label: "אינטגרציות", value: "12, ובראשן <bdi>Check Point</bdi>" },
        { label: "סוגי רכיבים", value: "1,594, כלולים בהתקנה" },
        {
          label: "כניסה",
          value: "חשבון מקומי עם <bdi>TOTP</bdi>, ‏<bdi>OIDC SSO</bdi>, ‏<bdi>LDAP / AD</bdi>",
        },
        {
          label: "ייבוא",
          value: "אקסל (גם בעברית), <bdi>CSV</bdi> מ־<bdi>NetBox 3.6–4.2+</bdi>",
        },
      ],
    },
    loop: {
      eyebrow: "איך זה עובד",
      title: "מתעדים. בודקים. סוגרים פערים.",
      lead: "לולאה אחת שומרת על תיעוד אמין. אתם כותבים איך הרשת אמורה להיראות, <bdi>LanCompass</bdi> בודקת מה יש בה בפועל, ואתם מחליטים מה נכון.",
      steps: [
        {
          name: "מתעדים",
          text: "כותבים איך הרשת אמורה להיראות, מהקידומת ועד פאנל הפאץ׳.",
          bullets: [
            "אתרים, <bdi>VRF</bdi>, קידומות, כתובות <bdi>IP</bdi>, <bdi>VLAN</bdi> וטווחי <bdi>DHCP</bdi>",
            "ארונות, רכיבים, כבלים ופאנלי פאץ׳, עם 1,594 סוגי רכיבים מובנים",
            "ייבוא מאקסל, גם בעברית, או מקובצי <bdi>CSV</bdi> של <bdi>NetBox</bdi>",
          ],
        },
        {
          name: "בודקים",
          text: "<bdi>LanCompass</bdi> בודקת מה באמת מחובר, ואתם קובעים כמה לעומק.",
          bullets: [
            "סריקה מהירה כברירת מחדל; גילוי מעמיק וגילוי סביל (האזנה בלבד) רק אם מפעילים אותם",
            "העשרה ב־<bdi>SNMP v1/v2c/v3</bdi>, ‏<bdi>SNMP traps</bdi>, ושכנים מ־<bdi>LLDP</bdi> ומ־<bdi>CDP</bdi>",
            "נתונים חיים מ־12 אינטגרציות, ובראשן <bdi>Check Point</bdi>",
          ],
        },
        {
          name: "סוגרים פערים",
          text: "עוברים על כל מקום שבו התיעוד והרשת לא תואמים, ומחליטים מה נכון.",
          bullets: [
            "שכבה מתועדת ושכבה נצפית על אותה טופולוגיה",
            "תור סקירה לסטיות",
            "גיבויי תצורה שנבדקים מול חבילות תאימות",
          ],
        },
      ],
      figure: {
        screen: "review",
        caption: "תור הסקירה: כל פער בין התיעוד לרשת, אחד אחרי השני.",
      },
    },
    atlas: {
      eyebrow: "הכול בקופסה אחת",
      title: "התקנה אחת, מתוכנית הכתובות ועד ההתראה.",
      lead: "בלי שרתים נוספים, בלי מסד נתונים שני, בלי חשבון ענן. כל חלק קורא מאותו תיעוד.",
      link: "לכל היכולות",
      previewLabel: "תצוגה מקדימה של המסך",
      rows: [
        {
          key: "ipam",
          title: "ניהול כתובות ותשתית פיזית",
          text: "קידומות, <bdi>VLAN</bdi>, ארונות ופאנלי פאץ׳, עם 1,594 סוגי רכיבים מובנים.",
          screen: "rack",
          section: "ipam",
        },
        {
          key: "discovery",
          title: "גילוי רכיבים",
          text: "סריקה מהירה כברירת מחדל. גילוי מעמיק וסביל רק אם מפעילים אותם.",
          screen: "deep-discovery",
          section: "discovery",
        },
        {
          key: "snmp",
          title: "<bdi>SNMP</bdi> וטופולוגיה",
          text: "<bdi>SNMP v1/v2c/v3</bdi>, ‏<bdi>traps</bdi>, ושכנים מ־<bdi>LLDP</bdi> ומ־<bdi>CDP</bdi>.",
          screen: "topology-observed",
          section: "snmp",
        },
        {
          key: "config",
          title: "גיבוי תצורות ותאימות",
          text: "גיבוי ב־<bdi>SSH</bdi> עם נעילת מפתח המארח, ובדיקה מול ארבע חבילות תאימות.",
          screen: "compliance",
          section: "config",
        },
        {
          key: "nac",
          title: "<bdi>NAC</bdi>",
          text: "קודם כול זיהוי. האכיפה אופציונלית, מוגנת וכבויה כברירת מחדל.",
          screen: "nac",
          section: "nac",
        },
        {
          key: "monitoring",
          title: "ניטור והתראות",
          text: "בדיקות <bdi>ping</bdi>, ‏<bdi>TCP</bdi> ו־<bdi>HTTP</bdi>. התראות ל־<bdi>webhook</bdi>, לדוא״ל, ל־<bdi>Discord</bdi>, ל־<bdi>Telegram</bdi> ול־<bdi>syslog</bdi>.",
          screen: "dashboard",
          section: "monitoring",
        },
        {
          // TODO(operator): confirm a one-line description of the Design studio; only the topology layers are in the claims list.
          key: "studios",
          title: "סטודיו הטופולוגיה וסטודיו התכנון",
          text: "השכבה המתועדת והשכבה הנצפית זו לצד זו, כך שרואים את הסטייה.",
          screen: "topology-observed",
          section: "studios",
        },
        {
          // TODO(operator): confirm report and dashboard specifics before naming any; this line stays generic on purpose.
          key: "reports",
          title: "דוחות ולוחות בקרה",
          text: "על אותו תיעוד, באותה התקנה.",
          screen: "dashboard",
          section: "reports",
        },
      ],
    },
    offline: {
      eyebrow: "אבטחה",
      title: "בנויה לרשתות שלא יוצאות לאינטרנט.",
      lead: "<bdi>LanCompass</bdi> מותקנת ועובדת בלי חיבור לאינטרנט. היא קוראת את הרשת, ולא משנה בה כלום אם לא ביקשתם.",
      points: [
        {
          title: "התקנה בלי אינטרנט",
          text: "פקודת <code>docker compose up</code> אחת. בלי תלות בענן, בלי טלמטריה.",
        },
        {
          title: "קריאה בלבד כברירת מחדל",
          text: "הכתיבות היחידות לרשת הן פרסום רשומות <bdi>DNS PTR</bdi> ופעולות פורט ב־<bdi>NAC</bdi>. את שתיהן מפעילים רק אם רוצים, וכברירת מחדל הן כבויות.",
        },
        {
          title: "סודות מוצפנים",
          text: "פרטי הגישה השמורים מוצפנים ב־<bdi>AES-256-GCM</bdi>.",
        },
        {
          title: "נעילת מפתח המארח",
          text: "גיבויי התצורה נועלים את מפתח ה־<bdi>SSH</bdi> של כל רכיב.",
        },
        {
          title: "<bdi>SSO</bdi>, ‏<bdi>LDAP</bdi> ו־<bdi>MFA</bdi>",
          text: "חשבונות מקומיים עם <bdi>TOTP</bdi>, כניסה אחידה ב־<bdi>OIDC</bdi>, ‏<bdi>LDAP</bdi> ו־<bdi>Active Directory</bdi>.",
        },
        {
          title: "ביקורת ל־<bdi>syslog</bdi>",
          text: "כל שינוי נרשם ביומן ביקורת, ואפשר להעביר אותו ל־<bdi>syslog</bdi>.",
        },
      ],
      link: "לפרטים על האבטחה",
    },
    hebrew: {
      eyebrow: "עברית מהיסוד",
      title: "נכתבה בעברית. לא תורגמה אליה.",
      lead: "כל מסך עובד מימין לשמאל: טבלאות, עצים, טפסים ושרטוטי ארון. עברית, ערבית, אנגלית ועוד 21 שפות — 24 בסך הכול.",
      enCaption: "אנגלית",
      heCaption: "עברית",
      screen: "dashboard",
    },
    integrations: {
      eyebrow: "אינטגרציות",
      title: "מתחברת למערכות שכבר עובדות אצלכם.",
      lead: "שתים־עשרה אינטגרציות מושכות נתונים מהמערכות הקיימות, וארבעה דרייברים לתצורות מגבים ובודקים את התצורה של כל רכיב.",
      legendTitle: "מקרא",
      highlight: {
        name: "Check Point",
        title: "נתונים חיים מ־<bdi>Check Point</bdi>",
        text: "<bdi>ARP</bdi>, ‏<bdi>DHCP</bdi> ו־<bdi>VPN</bdi>, לכל שער בנפרד.",
      },
      groupIntegrations: "אינטגרציות · 12",
      groupDrivers: "דרייברים לתצורות וחבילות תאימות · 4",
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
        title: "ומובנה בפנים",
        items: [
          "פרסום רשומות <bdi>DNS PTR</bdi> ל־<bdi>PowerDNS</bdi> או ב־<bdi>RFC 2136</bdi> (לפי בחירה)",
          "נקודת קצה למלאי של <bdi>Ansible</bdi>",
          "אסימוני <bdi>API</bdi> עם הרשאות מוגבלות",
        ],
      },
    },
    imports: {
      eyebrow: "מעבר",
      title: "מתחילים מהאקסל. או מ־<bdi>NetBox</bdi>.",
      lead: "לא מתחילים ממסך ריק, אלא מהתיעוד שכבר יש לכם.",
      cards: [
        {
          title: "קובצי אקסל",
          text: "מייבאים את הקובץ שהצוות מתחזק כבר שנים, בעברית או באנגלית, ורואים תצוגה מקדימה לפני ששום דבר נשמר.",
          bullets: ["ייבוא שמבין עברית", "תצוגה מקדימה לפני שמירה"],
        },
        {
          title: "ייצוא <bdi>CSV</bdi> מ־<bdi>NetBox</bdi>",
          text: "מביאים קובצי <bdi>CSV</bdi> מגרסאות <bdi>3.6</bdi> עד <bdi>4.2</bdi> ומעלה, ודוח כיסוי מראה מה עבר.",
          bullets: ["<bdi>NetBox 3.6–4.2+</bdi>", "דוח כיסוי אחרי הייבוא"],
        },
      ],
    },
    videos: {
      eyebrow: "סרטונים",
      title: "שלושה סרטונים קצרים, משימה בכל אחד.",
      items: [
        { key: "hebrew-excel-import", title: "ייבוא קובץ אקסל בעברית" },
        {
          key: "check-point-gateway-pull",
          title: "משיכת נתונים חיים משער <bdi>Check Point</bdi>",
        },
        { key: "drift-review-queue", title: "עבודה עם תור הסקירה" },
      ],
    },
    partners: {
      eyebrow: "שותפי פיתוח",
      title: "בואו לעצב איתנו את <bdi>LanCompass</bdi>.",
      lead: "אנחנו מחפשים כמה צוותי רשת שיריצו את <bdi>LanCompass</bdi> על רשת אמיתית ויגידו לנו מה חסר.",
      getsTitle: "מה אתם מקבלים",
      gets: [
        "התקנה מלווה על החומרה שלכם",
        "מעבר מהאקסל, יחד איתכם",
        "קו ישיר למהנדס שכותב את הקוד",
        "השפעה מוקדמת על מה שייבנה בהמשך",
      ],
      asksTitle: "מה אנחנו מבקשים",
      asks: ["משוב כן, באופן קבוע", "המלצה, אם זה עובד לכם"],
      cta: "להצטרפות כשותפי פיתוח",
    },
  },

  product: {
    eyebrow: "המוצר",
    title: "כל מה ש־<bdi>LanCompass</bdi> עושה.",
    lead: "התקנה אחת שרצה אצלכם מכסה כתובות, תשתית פיזית, גילוי, תצורות, בקרת גישה וניטור. כל חלק נגמר במגבלות שכדאי לדעת עליהן.",
    sections: [
      {
        id: "ipam",
        nav: "ניהול כתובות",
        title: "ניהול כתובות (<bdi>IPAM</bdi>)",
        intro:
          "מתכננים ועוקבים אחרי מרחב הכתובות כמו שהרשת בנויה באמת. אתרים, <bdi>VRF</bdi>, קידומות, כתובות, <bdi>VLAN</bdi> וטווחי <bdi>DHCP</bdi> — בעץ אחד.",
        screen: "ipam-tree",
        bullets: [
          "אתרים ו־<bdi>VRF</bdi> עם קידומות מקוננות",
          "כתובות <bdi>IP</bdi> ו־<bdi>VLAN</bdi>",
          "טווחי <bdi>DHCP</bdi>",
          "ייבוא מאקסל, גם בעברית",
          "ייבוא מקובצי <bdi>CSV</bdi> של <bdi>NetBox</bdi> (<bdi>3.6–4.2+</bdi>)",
          "פרסום רשומות <bdi>DNS PTR</bdi> ל־<bdi>PowerDNS</bdi> או ב־<bdi>RFC 2136</bdi>",
        ],
        note: "פרסום <bdi>DNS PTR</bdi> הוא אחת משתי הכתיבות היחידות לרשת. מפעילים אותו רק אם רוצים, וכברירת מחדל הוא כבוי.",
      },
      {
        id: "dcim",
        nav: "ארונות ותשתית",
        title: "ארונות ותשתית פיזית (<bdi>DCIM</bdi>)",
        intro: "מתעדים את השכבה הפיזית עד פאנל הפאץ׳. שרטוט הארון מראה מה יושב איפה.",
        screen: "rack",
        bullets: [
          "ארונות ושרטוטי ארון",
          "רכיבים והכבלים שלהם",
          "פאנלי פאץ׳",
          "1,594 סוגי רכיבים מובנים",
        ],
        note: "ספריית סוגי הרכיבים כלולה בהתקנה, ולכן זמינה גם בלי אינטרנט.",
      },
      {
        id: "discovery",
        nav: "גילוי רכיבים",
        title: "גילוי רכיבים",
        intro:
          "מתחילים בסריקה מהירה, ומעמיקים רק איפה שבוחרים. הגילוי המעמיק והגילוי הסביל מזהים את הרכיבים שהם מוצאים.",
        screen: "deep-discovery",
        bullets: [
          "סריקה מהירה",
          "גילוי מעמיק, לפי בחירה",
          "גילוי סביל (האזנה בלבד), לפי בחירה",
          "זיהוי רכיבים",
        ],
        note: "הגילוי המעמיק והסביל כבויים עד שמפעילים אותם. ברירת המחדל היא סריקה מהירה.",
      },
      {
        id: "snmp",
        nav: "<bdi>SNMP</bdi> וטופולוגיה",
        title: "<bdi>SNMP</bdi> וטופולוגיה",
        intro:
          "<bdi>SNMP</bdi> משלים את מה שסריקה לא רואה. נתוני השכנים משרטטים את הטופולוגיה הנצפית לצד זו שתיעדתם.",
        screen: "topology-observed",
        bullets: [
          "העשרה ב־<bdi>SNMP v1</bdi>, ‏<bdi>v2c</bdi> ו־<bdi>v3</bdi>",
          "<bdi>SNMP traps</bdi>",
          "שכנים מ־<bdi>LLDP</bdi> ומ־<bdi>CDP</bdi>",
          "שכבה מתועדת ושכבה נצפית בטופולוגיה",
        ],
        note: "השכבה הנצפית מציגה קישור רק כשהרכיבים מפרסמים שכנים ב־<bdi>LLDP</bdi> או ב־<bdi>CDP</bdi>.",
      },
      {
        id: "config",
        nav: "תצורות ותאימות",
        title: "גיבוי תצורות ותאימות",
        intro:
          "מגבים את תצורת הרכיבים ב־<bdi>SSH</bdi> ובודקים אותה מול חבילות תאימות. מפתח ה־<bdi>SSH</bdi> של כל רכיב ננעל.",
        screen: "compliance",
        bullets: [
          "גיבוי תצורות ב־<bdi>SSH</bdi>",
          "נעילת מפתח המארח",
          "חבילות תאימות: <bdi>Cisco IOS</bdi>, ‏<bdi>MikroTik RouterOS</bdi>, ‏<bdi>Check Point Gaia</bdi>, ‏<bdi>FortiOS</bdi>",
          "סודות בתצורות השמורות מוסתרים; כדי לצפות בגרסה צריך את ההרשאה <code>config:read</code>",
        ],
        note: "הגיבוי רק קורא. <bdi>LanCompass</bdi> לא דוחפת תצורה לאף רכיב.",
      },
      {
        id: "nac",
        nav: "<bdi>NAC</bdi>",
        title: "בקרת גישה לרשת (<bdi>NAC</bdi>)",
        intro: "מתחילים בזיהוי. יש גם אכיפה, אבל היא אופציונלית, מוגנת וכבויה כברירת מחדל.",
        screen: "nac",
        bullets: [
          "זיהוי ב־<bdi>NAC</bdi>",
          "אכיפה אופציונלית ומוגנת",
          "פעולות פורט רק לפי בחירה, וכבויות כברירת מחדל",
        ],
        note: "אכיפת <bdi>NAC</bdi> כבויה כברירת מחדל, ודורשת <bdi>SNMPv3</bdi> עם הצפנה.",
      },
      {
        id: "monitoring",
        nav: "ניטור והתראות",
        title: "ניטור והתראות",
        intro: "בודקים שמה שתיעדתם באמת עונה. וכשלא — מודיעים למי שצריך לדעת.",
        screen: "dashboard",
        bullets: [
          "בדיקות <bdi>ping</bdi>, ‏<bdi>TCP</bdi> ו־<bdi>HTTP</bdi>",
          "התראות ל־<bdi>webhook</bdi> ולדוא״ל",
          "התראות ל־<bdi>Discord</bdi> ול־<bdi>Telegram</bdi>",
          "התראות ל־<bdi>syslog</bdi>",
        ],
        note: "התראות יוצאות רק לערוצים שהגדרתם.",
      },
      {
        // TODO(operator): the studios have no entry in the claims list beyond the documented/observed layers; confirm what else to say.
        id: "studios",
        nav: "סטודיו",
        title: "סטודיו הטופולוגיה וסטודיו התכנון",
        intro:
          "תצוגת הטופולוגיה מפרידה בין הרשת המתועדת לרשת הנצפית, כך שאפשר להצביע בדיוק על הפער.",
        screen: "topology-observed",
        bullets: ["שכבה מתועדת", "שכבה נצפית", "סימון הסטייה במקום שבו השתיים שונות"],
        note: "קישורים נצפים מגיעים משכני <bdi>LLDP</bdi> ו־<bdi>CDP</bdi>, ולכן מופיעים רק איפה שהרכיבים מפרסמים אותם.",
      },
      {
        // TODO(operator): reports and dashboards have no entry in the claims list; confirm specifics before listing any.
        id: "reports",
        nav: "דוחות ולוחות",
        title: "דוחות ולוחות בקרה",
        intro: "דוחות ולוחות בקרה קוראים מאותו תיעוד כמו כל השאר. אין שרת דוחות נפרד.",
        screen: "dashboard",
        bullets: ["לוחות בקרה באותה התקנה", "דוחות על אותם נתונים"],
        note: "הדוחות רצים על השרת שלכם, כמו כל <bdi>LanCompass</bdi>.",
      },
      {
        id: "platform",
        nav: "פלטפורמה",
        title: "פלטפורמה",
        intro:
          "מה שמאפשר להריץ את <bdi>LanCompass</bdi> לאורך שנים: כניסה, אוטומציה, גיבויים והתאוששות. הכול עולה בפקודת <code>docker compose up</code> אחת.",
        screen: null,
        bullets: [
          "חשבונות מקומיים עם <bdi>TOTP MFA</bdi>, כניסה אחידה ב־<bdi>OIDC</bdi>, וכניסה ב־<bdi>LDAP</bdi> וב־<bdi>Active Directory</bdi>",
          "אסימוני <bdi>API</bdi> עם הרשאות מוגבלות, ונקודת קצה למלאי של <bdi>Ansible</bdi>",
          "גיבויים מתוזמנים עם תרגולי שחזור אוטומטיים",
          "שרת גיבוי חם (<bdi>warm standby</bdi>)",
          "חבילת תמיכה לפתרון תקלות",
          "24 שפות ממשק, עם עברית וערבית מלאות מימין לשמאל",
        ],
        note: "עובדת בלי אינטרנט: בלי תלות בענן ובלי טלמטריה.",
      },
    ],
    cta: {
      title: "תראו אותה עובדת על הרשת שלכם.",
      text: "שותפי פיתוח מקבלים התקנה מלווה ועזרה בהעברת התיעוד הקיים.",
      button: "להצטרפות כשותפי פיתוח",
    },
  },

  partners: {
    eyebrow: "שותפי פיתוח",
    title: "<bdi>LanCompass</bdi> על רשת אמיתית, עם המהנדס על הקו.",
    lead: "<bdi>LanCompass</bdi> מוכנה לשותפים הראשונים: צוותי רשת של אחד עד עשרה אנשים, שמחזיקים את הרשת באוויר ואת התיעוד מעודכן — הרבה פעמים בארגונים מפוקחים, והרבה פעמים על <bdi>Check Point</bdi>.",
    getsTitle: "מה אתם מקבלים",
    gets: [
      { title: "התקנה מלווה", text: "מתקינים יחד איתכם, על החומרה שלכם, עם אינטרנט או בלי." },
      { title: "מעבר מהאקסל", text: "מעבירים יחד את הקובץ הקיים, ובודקים ביחד את התוצאה." },
      { title: "קו ישיר למהנדס", text: "השאלות מגיעות למי שכתב את הקוד, לא לתור פניות." },
      { title: "השפעה מוקדמת", text: "מה שאתם צריכים משפיע על מה שייבנה בהמשך." },
    ],
    asksTitle: "מה אנחנו מבקשים",
    asks: [
      { title: "משוב", text: "ספרו לנו מה עובד, מה לא ומה חסר." },
      {
        title: "המלצה, אם זה עובד",
        text: "רק אם <bdi>LanCompass</bdi> תרוויח אותה, ורק בהסכמתכם.",
      },
    ],
    stepsTitle: "איך זה מתנהל",
    steps: [
      { title: "פונים", text: "מספרים לנו על הרשת בטופס שלמטה." },
      { title: "מדברים", text: "שיחה קצרה, כדי לבדוק אם <bdi>LanCompass</bdi> מתאימה לכם." },
      { title: "מתקינים", text: "התקנה מלווה וייבוא ראשון מהתיעוד שלכם." },
      { title: "עובדים ומספרים לנו", text: "פגישות מעקב קבועות בזמן שאתם עובדים איתה." },
    ],
    pricing: "מהדורות ותוכניות תמיכה בדרך — דברו איתנו.",
    formTitle: "בקשת הצטרפות לשותפי הפיתוח",
    formLead: "כמה שאלות על הרשת שלכם, כדי שכבר בשיחה הראשונה נדבר לעניין.",
  },

  contact: {
    eyebrow: "יצירת קשר",
    title: "יש שאלה? כתבו לנו.",
    lead: "שאלות על <bdi>LanCompass</bdi>, על שותפות פיתוח, או על אינטגרציה שחסרה לכם.",
    pricing: "מהדורות ותוכניות תמיכה בדרך — דברו איתנו.",
    emailLabel: "דוא״ל",
    formTitle: "שליחת הודעה",
  },

  notFound: {
    eyebrow: "404",
    title: "הדף הזה לא על המפה.",
    lead: "אולי הכתובת זזה, ואולי היא אף פעם לא הייתה קיימת. המצפן עדיין מכוון הביתה.",
    home: "חזרה לדף הבית",
  },
};
