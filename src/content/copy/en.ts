/**
 * English page copy for the structured pages. Long-form pages (security,
 * privacy, accessibility) live in `src/content/pages/en/*.mdx`.
 *
 * Every product statement here must trace to the "Claims the site may make"
 * row of the W1 brief. Strings may contain inline HTML (<bdi>, <code>,
 * <strong>); they are rendered with set:html and are authored here only.
 */
export const en = {
  meta: {
    home: {
      title: "LanCompass — network documentation that agrees with your network",
      description:
        "Self-hosted IPAM, racks, discovery and drift review in one docker compose up. Runs fully offline, read-only by default, in 24 languages with real right-to-left.",
    },
    product: {
      title: "Product — LanCompass",
      description:
        "IPAM, DCIM and racks, discovery, SNMP and topology, config backup and compliance, NAC, monitoring and the platform underneath, in one self-hosted install.",
    },
    security: {
      title: "Security — LanCompass",
      description:
        "Your data never leaves your network. No telemetry, two opt-in write paths, secrets encrypted at rest, SSH host-key pinning and a full audit trail.",
    },
    "design-partners": {
      title: "Design partners — LanCompass",
      description:
        "Work with us on LanCompass: a guided install, migration from your Excel, a direct line to the engineer, and early influence on what ships next.",
    },
    contact: {
      title: "Contact — LanCompass",
      description: "Questions about LanCompass, editions or support plans. Write to us.",
    },
    accessibility: {
      title: "Accessibility statement — LanCompass",
      description:
        "How this site meets WCAG 2.1 AA and Israeli Standard 5568, and how to report a problem.",
    },
    privacy: {
      title: "Privacy — LanCompass",
      description:
        "This site sets no cookies and loads nothing from third parties. What the forms collect and why.",
    },
    notFound: {
      title: "Page not found — LanCompass",
      description: "This page does not exist. The compass is still pointing home.",
    },
  },

  home: {
    hero: {
      chips: ["Self-hosted", "Runs fully offline", "Read-only by default"],
      title: "Your documentation and your network, finally in agreement.",
      lead: "LanCompass keeps IPAM, racks and cabling in one self-hosted system, discovers what is really on the network, and shows every place where the two drift apart.",
      primary: "Become a design partner",
      secondary: "See how it works",
    },
    facts: [
      { value: "24 languages", label: "Real right-to-left, with full Hebrew and Arabic." },
      {
        value: "12 integrations",
        label: "Check Point first, then firewalls, hypervisors and controllers.",
      },
      { value: "No telemetry. No cloud.", label: "Runs fully offline. Nothing phones home." },
      { value: "One <code>docker compose up</code>", label: "Self-hosted on your own Linux host." },
    ],
    loop: {
      eyebrow: "How it works",
      title: "Document. Observe. Reconcile.",
      lead: "One loop keeps the record honest. You write down what the network should be, LanCompass looks at what is there, and you decide what is true.",
      steps: [
        {
          name: "Document",
          screen: "ipam-tree",
          text: "Write down what the network should be, from the prefix down to the patch panel.",
          bullets: [
            "Sites, VRFs, prefixes, IPs, VLANs and DHCP ranges",
            "Racks, devices, cables and patch panels, with 1,594 bundled device types",
            "Import Excel workbooks, including Hebrew ones, or NetBox CSV exports",
          ],
        },
        {
          name: "Observe",
          screen: "topology-observed",
          text: "Let LanCompass look at what is really connected, at the depth you choose.",
          bullets: [
            "A quick scan by default; deep and passive (listen-only) discovery when you opt in",
            "SNMP v1, v2c and v3 enrichment, traps, and LLDP and CDP neighbours",
            "Runtime data from 12 integrations, Check Point first",
          ],
        },
        {
          name: "Reconcile",
          screen: "review",
          text: "Review each place where the record and the network disagree, and settle it.",
          bullets: [
            "Documented and observed layers on the same topology",
            "A review queue for drift",
            "Config backups checked against compliance packs",
          ],
        },
      ],
    },
    bento: {
      eyebrow: "Everything in one box",
      title: "One install covers the network, from address plan to alert.",
      lead: "No add-on servers, no second database, no cloud account. Each part reads from the same record.",
      link: "See every capability",
      tiles: [
        {
          key: "ipam",
          title: "IPAM & DCIM",
          text: "Sites, VRFs, prefixes, IPs, VLANs and DHCP ranges. Racks, devices, cables and patch panels, with 1,594 bundled device types.",
          screen: "rack",
        },
        {
          key: "discovery",
          title: "Discovery",
          text: "A quick scan by default. Deep and passive (listen-only) discovery when you opt in, with device identification.",
        },
        {
          key: "snmp",
          title: "SNMP & topology",
          text: "SNMP v1, v2c and v3 enrichment and traps. LLDP and CDP neighbours draw the observed layer.",
        },
        {
          key: "nac",
          title: "NAC",
          text: "Detection first. Enforcement is optional, guarded, and off by default.",
        },
        {
          key: "monitoring",
          title: "Monitoring & alerts",
          text: "Ping, TCP and HTTP checks. Alerts to webhook, email, Discord, Telegram and syslog.",
        },
        {
          key: "config",
          title: "Config backup & compliance",
          text: "Config backup over SSH with host-key pinning. Compliance packs for Cisco IOS, MikroTik RouterOS, Check Point Gaia and FortiOS.",
          screen: "compliance",
        },
        {
          // TODO(operator): confirm a one-line description of the Design studio; only the topology layers are in the claims list.
          key: "studios",
          title: "Topology & Design studios",
          text: "Documented and observed layers side by side, so drift is something you can see.",
        },
        {
          // TODO(operator): confirm report and dashboard specifics before naming any; this line stays generic on purpose.
          key: "reports",
          title: "Reports & dashboards",
          text: "Reports and dashboards over the same record, inside the same install.",
        },
      ],
    },
    offline: {
      eyebrow: "Security",
      title: "Built for networks that can’t phone home.",
      lead: "LanCompass installs and runs with no internet connection. It reads the network; it doesn’t change it unless you ask.",
      points: [
        {
          title: "Offline install",
          text: "One <code>docker compose up</code>. No cloud dependency, no telemetry.",
        },
        {
          title: "Read-only by default",
          text: "The only network writes are DNS PTR publishing and NAC port actions. Both are opt-in and off by default.",
        },
        {
          title: "Secrets encrypted at rest",
          text: "Stored credentials are encrypted with AES-256-GCM.",
        },
        { title: "SSH host-key pinning", text: "Config backups pin each device’s SSH host key." },
        {
          title: "SSO, LDAP and MFA",
          text: "Local accounts with TOTP, OIDC single sign-on, LDAP and Active Directory.",
        },
        {
          title: "Audit to syslog",
          text: "Changes are kept in an audit trail that can forward to syslog.",
        },
      ],
      link: "How we handle security",
    },
    hebrew: {
      eyebrow: "Hebrew-native",
      title: "Built in Hebrew, not translated into it.",
      lead: "Every screen works right-to-left: tables, trees, forms and rack elevations. English, Hebrew, Arabic and 21 more languages, 24 in total.",
      enCaption: "English",
      heCaption: "Hebrew",
      screen: "dashboard",
    },
    integrations: {
      eyebrow: "Integrations",
      title: "Reads the systems you already run.",
      lead: "Twelve integrations bring in data from the systems you already run, and four config drivers back up and check device configs.",
      highlight: {
        title: "Check Point runtime data",
        text: "ARP, DHCP and VPN, per gateway.",
      },
      groupIntegrations: "Integrations",
      groupDrivers: "Config drivers and compliance packs",
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
        title: "Also built in",
        items: [
          "DNS PTR publishing to PowerDNS or RFC 2136 (opt-in)",
          "An Ansible inventory endpoint",
          "Scoped API tokens",
        ],
      },
    },
    imports: {
      eyebrow: "Migration",
      title: "Bring your Excel. Or your NetBox.",
      lead: "Start from the record you already have, not from an empty screen.",
      cards: [
        {
          title: "Excel workbooks",
          text: "Import the workbook your team has kept for years, in Hebrew or English. You see a preview before anything is committed.",
          bullets: ["Hebrew-aware import", "Preview before commit"],
        },
        {
          title: "NetBox CSV exports",
          text: "Bring NetBox CSV exports from versions 3.6 to 4.2 and later. A coverage report shows what came across.",
          bullets: ["NetBox 3.6–4.2+", "Coverage report after import"],
        },
      ],
    },
    videos: {
      eyebrow: "Watch",
      title: "Three short videos, each one task.",
      items: [
        { key: "hebrew-excel-import", title: "Import a Hebrew Excel workbook" },
        { key: "check-point-gateway-pull", title: "Pull runtime data from a Check Point gateway" },
        { key: "drift-review-queue", title: "Work through the drift review queue" },
      ],
    },
    partners: {
      eyebrow: "Design partners",
      title: "Shape LanCompass with us.",
      lead: "We are looking for a small number of network teams to run LanCompass on real networks and tell us what is missing.",
      getsTitle: "What you get",
      gets: [
        "A guided install on your own hardware",
        "Migration from your Excel, done with you",
        "A direct line to the engineer who builds it",
        "Early influence on what ships next",
      ],
      asksTitle: "What we ask",
      asks: ["Honest feedback, regularly", "A reference, if it works for you"],
      cta: "Become a design partner",
    },
  },

  product: {
    eyebrow: "Product",
    title: "Everything LanCompass does, section by section.",
    lead: "One self-hosted install covers addressing, the physical layer, discovery, configs, access control and monitoring. Each section ends with the limits worth knowing.",
    sections: [
      {
        id: "ipam",
        nav: "IPAM",
        title: "IPAM",
        intro:
          "Plan and track address space the way your network is really built. Sites, VRFs, prefixes, IPs, VLANs and DHCP ranges live in one tree.",
        screen: "ipam-tree",
        bullets: [
          "Sites and VRFs with nested prefixes",
          "IP addresses and VLANs",
          "DHCP ranges",
          "Import from Excel workbooks, including Hebrew ones",
          "Import from NetBox CSV exports (3.6–4.2+)",
          "DNS PTR publishing to PowerDNS or RFC 2136",
        ],
        note: "DNS PTR publishing is one of only two network writes. It is opt-in and off by default.",
      },
      {
        id: "dcim",
        nav: "DCIM & racks",
        title: "DCIM & racks",
        intro:
          "Document the physical layer down to the patch panel. Rack elevations show what sits where.",
        screen: "rack",
        bullets: [
          "Racks and rack elevations",
          "Devices and their cables",
          "Patch panels",
          "1,594 bundled device types",
        ],
        note: "The device-type library ships inside the install, so it works offline too.",
      },
      {
        id: "discovery",
        nav: "Discovery",
        title: "Discovery",
        intro:
          "Start with a quick scan and go deeper only where you choose. Deep and passive discovery identify the devices they find.",
        screen: "deep-discovery",
        bullets: [
          "Quick scan",
          "Deep discovery, opt-in",
          "Passive, listen-only discovery, opt-in",
          "Device identification",
        ],
        note: "Deep and passive discovery are off until you turn them on. The quick scan is the default.",
      },
      {
        id: "snmp",
        nav: "SNMP & topology",
        title: "SNMP & topology",
        intro:
          "SNMP fills in what a scan can’t see. Neighbour data draws the observed topology next to the one you documented.",
        screen: "topology-observed",
        bullets: [
          "SNMP v1, v2c and v3 enrichment",
          "SNMP traps",
          "LLDP and CDP neighbours",
          "Documented and observed topology layers",
        ],
        note: "The observed layer shows links only where devices advertise LLDP or CDP neighbours.",
      },
      {
        id: "config",
        nav: "Config & compliance",
        title: "Config & compliance",
        intro:
          "Back up device configs over SSH and check them against compliance packs. Each device’s SSH host key is pinned.",
        screen: "compliance",
        bullets: [
          "Config backup over SSH",
          "SSH host-key pinning",
          "Compliance packs: Cisco IOS, MikroTik RouterOS, Check Point Gaia, FortiOS",
          "Secrets in stored configs are masked; viewing a revision needs the <code>config:read</code> permission",
        ],
        note: "Backup only reads configs. LanCompass never pushes a configuration to a device.",
      },
      {
        id: "nac",
        nav: "NAC",
        title: "NAC",
        intro:
          "Start with detection. Enforcement exists, but it is optional, guarded, and off by default.",
        screen: "nac",
        bullets: [
          "NAC detection",
          "Optional, guarded enforcement",
          "Port actions are opt-in and off by default",
        ],
        note: "NAC enforcement is off by default and needs SNMPv3 with encryption.",
      },
      {
        id: "monitoring",
        nav: "Monitoring & alerts",
        title: "Monitoring & alerts",
        intro:
          "Check that the things you documented answer. When they don’t, tell the people who need to know.",
        screen: "dashboard",
        bullets: [
          "Ping, TCP and HTTP checks",
          "Alerts to webhook and email",
          "Alerts to Discord and Telegram",
          "Alerts to syslog",
        ],
        note: "Alerts go only to the channels you configure.",
      },
      {
        // TODO(operator): the studios have no entry in the claims list beyond the documented/observed layers; confirm what else to say.
        id: "studios",
        nav: "Studios",
        title: "Topology & Design studios",
        intro:
          "The topology view keeps the documented and the observed network apart, so a disagreement is something you can point at.",
        screen: "topology-observed",
        bullets: ["Documented layer", "Observed layer", "Drift shown where the two differ"],
        note: "Observed links come from LLDP and CDP neighbours, so they appear where devices advertise them.",
      },
      {
        // TODO(operator): reports and dashboards have no entry in the claims list; confirm specifics before listing any.
        id: "reports",
        nav: "Reports & dashboards",
        title: "Reports & dashboards",
        intro:
          "Reports and dashboards read the same record as everything else. There is no separate reporting server to run.",
        screen: "dashboard",
        bullets: ["Dashboards inside the same install", "Reports over the same data"],
        note: "Reports run on your host, like the rest of LanCompass.",
      },
      {
        id: "platform",
        nav: "Platform",
        title: "Platform",
        intro:
          "The parts that make LanCompass something you can run for years: sign-in, automation, backups and recovery. All of it installs with one <code>docker compose up</code>.",
        screen: null,
        bullets: [
          "Local accounts with TOTP MFA, OIDC SSO, LDAP and Active Directory sign-in",
          "Scoped API tokens and an Ansible inventory endpoint",
          "Scheduled backups with automatic restore drills",
          "Warm standby",
          "A support bundle for troubleshooting",
          "24 interface languages, with full Hebrew and Arabic right-to-left",
        ],
        note: "Runs fully offline: no cloud dependency and no telemetry.",
      },
    ],
    cta: {
      title: "See it on your own network.",
      text: "Design partners get a guided install and help moving their existing records across.",
      button: "Become a design partner",
    },
  },

  partners: {
    eyebrow: "Design partners",
    title: "Run LanCompass on a real network, with the engineer on call.",
    lead: "LanCompass is ready for its first partners: network teams of one to ten people who keep the network running and the documentation honest, often in regulated places, often on Check Point.",
    getsTitle: "What you get",
    gets: [
      {
        title: "A guided install",
        text: "We install it with you, on your hardware, online or air-gapped.",
      },
      {
        title: "Migration from your Excel",
        text: "We move your existing workbook across with you and check the result together.",
      },
      {
        title: "A direct line to the engineer",
        text: "Questions go to the person who wrote the code, not to a queue.",
      },
      { title: "Early influence", text: "What you need shapes what ships next." },
    ],
    asksTitle: "What we ask",
    asks: [
      { title: "Feedback", text: "Tell us what works, what doesn’t, and what is missing." },
      {
        title: "A reference, if it works",
        text: "Only if LanCompass earns it, and only with your agreement.",
      },
    ],
    stepsTitle: "How it goes",
    steps: [
      { title: "Apply", text: "Tell us about your network in the form below." },
      { title: "Talk", text: "A short call to see whether LanCompass fits." },
      { title: "Install", text: "A guided install and the first import from your records." },
      { title: "Use it, then tell us", text: "Regular check-ins while you run it." },
    ],
    pricing: "Editions and support plans are coming — talk to us.",
    formTitle: "Apply to be a design partner",
    formLead: "A few questions about your network, so the first call is a useful one.",
  },

  contact: {
    eyebrow: "Contact",
    title: "Talk to us.",
    lead: "Questions about LanCompass, a design partnership, or an integration you need.",
    pricing: "Editions and support plans are coming — talk to us.",
    emailLabel: "Email",
    formTitle: "Send a message",
  },

  notFound: {
    eyebrow: "404",
    title: "This page is off the map.",
    lead: "The address may have moved, or it never existed. The compass still points home.",
    home: "Back to the home page",
  },
};

export type Copy = typeof en;
