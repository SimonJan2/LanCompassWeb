/**
 * English page copy for the structured pages. Long-form pages (security,
 * privacy, accessibility) live in `src/content/pages/en/*.mdx`.
 *
 * Every product statement here cites its row of docs/claims.md in a comment (`// C-MAP-1`):
 * a comment on its own line covers the next line, or the whole object or array that line
 * opens. Every figure in a product sentence appears in a row it cites (tests/claims.spec.ts).
 * Strings may contain inline HTML (<bdi>, <code>, <strong>); they are rendered with set:html
 * and are authored here only. `{version}` and `{date}` are filled from src/content/releases.json.
 */
export const en = {
  meta: {
    home: {
      // C-PRD-1
      title: "LanCompass — network documentation that agrees with your network",
      // C-PRD-1, C-MAP-2, C-STU-1, C-NET-1, C-RO-1
      description:
        "Self-hosted IPAM, racks and discovery, a map where every line says how old it is, and a design studio that hands designs back as Visio. Runs offline, read-only by default.",
    },
    product: {
      title: "Product — LanCompass",
      // C-IPAM-1, C-RACK-1, C-DISC-5, C-MAP-1, C-STU-1, C-CFG-2, C-NAC-1, C-MON-1, C-REP-1, C-DASH-3, C-INST-11
      description:
        "IPAM, racks, discovery, the map, the design studio, config backup and compliance, NAC, monitoring, reports and dashboards, in one self-hosted install.",
    },
    security: {
      title: "Security — LanCompass",
      // C-NET-2, C-RO-1, C-SEC-5, C-INST-4, C-SEC-1, C-SEC-14
      description:
        "Your network data stays on your network. No telemetry, two opt-in writes, HTTPS by default, signed bundles, secrets encrypted at rest and an audit trail.",
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
      // C-NET-1, C-RO-1
      chips: ["Self-hosted", "Runs fully offline", "Read-only by default"],
      title: "Your documentation and your network, in agreement.",
      // C-PRD-1
      lead: "LanCompass keeps IPAM, racks and cabling in one self-hosted system, discovers what is really on the wire, and shows every place where the two drift apart.",
      primary: "Become a design partner",
      secondary: "See how it works",
      marginalia: ["10.20.0.0/16", "10.20.12.0/24 · lobby", "sw-core-02 → ap-lobby-3"],
    },
    datasheet: {
      title: "Datasheet",
      note: "Every line is a fact about the product today.",
      rows: [
        {
          label: "Install",
          // C-INST-1, C-INST-2
          value:
            "One signed offline bundle and its installer, on your own Linux host with Docker and Compose v2",
        },
        {
          label: "Network access",
          // C-NET-1, C-NET-2, C-LIC-1
          value: "None required. No cloud, no telemetry; the licence is checked offline",
        },
        // C-RO-1
        { label: "Default mode", value: "Read-only. Two opt-in writes: DNS PTR, NAC port actions" },
        {
          label: "Languages",
          // C-LANG-1
          value: "24: English and Hebrew complete, Arabic partial, 21 with their core screens",
        },
        // C-INT-1, C-INT-2
        { label: "Integrations", value: "12 read-only connectors, Check Point first" },
        {
          label: "Imports",
          // C-IMP-1, C-IMP-2, C-IMP-3
          value: "Excel (Hebrew too), NetBox CSV 3.6–4.2+, Visio and draw.io drawings",
        },
        // C-AUTH-1, C-AUTH-2, C-AUTH-3
        { label: "Sign-in", value: "Local with TOTP MFA, OIDC SSO, LDAP / AD" },
      ],
      // C-REL-1 (the values come from src/content/releases.json)
      release: { label: "Release", value: "{version} · {date}" },
    },
    whatsNew: {
      // C-REL-1 (the values come from src/content/releases.json)
      eyebrow: "What’s new in {version} · {date}",
      // C-MAP-1, C-STU-1
      title: "A map that tells the truth, and designs that go out to Visio and back.",
      items: [
        {
          title: "The map tells the truth",
          // C-MAP-1, C-MAP-2, C-MAP-9
          text: "One line per cable, merged from LLDP, CDP and both ends’ reports, and every line says how old it is. On our test lab, 17 of 17 links were drawn and none was false.",
          screen: "map-ages",
          section: "map",
        },
        {
          title: "Ask the map",
          // C-MAP-5
          text: "Press Q and ask where an address, MAC or name is, the path from one thing to another, or what breaks if a device fails.",
          screen: "ask-the-map",
          section: "map",
        },
        {
          title: "The design studio",
          // C-STU-1, C-STU-3
          text: "Export a design to Visio and it comes back in as it left. People edit it together, live, and each sees the others’ changes within about a quarter of a second.",
          screen: "design-studio",
          section: "studio",
        },
      ],
    },
    loop: {
      eyebrow: "How it works",
      title: "Document. Observe. Reconcile.",
      // C-PRD-1
      lead: "One loop keeps the record honest. You write down what the network should be, LanCompass looks at what is there, and you decide what is true.",
      steps: [
        {
          name: "Document",
          text: "Write down what the network should be, from the prefix to the patch panel.",
          bullets: [
            // C-IPAM-1
            "Sites, VRFs, prefixes, IPs, VLANs and DHCP ranges",
            // C-RACK-1, C-RACK-2
            "Racks, devices, cables and patch panels, with 1,594 bundled device types",
            // C-IMP-1, C-IMP-2, C-IMP-3
            "Import Excel workbooks (Hebrew ones too), NetBox CSV exports or Visio drawings",
          ],
        },
        {
          name: "Observe",
          // C-DISC-1
          text: "Let LanCompass look at what is really connected, as deep as you choose.",
          bullets: [
            // C-MAP-2
            "Every line on the map says how old it is",
            // C-DISC-2
            "Passive discovery that only listens, when you turn it on",
            // C-INT-1, C-INT-2
            "12 read-only connectors, Check Point first",
          ],
        },
        {
          name: "Reconcile",
          text: "Review each place where the record and the network disagree, and settle it.",
          bullets: [
            // C-DISC-5
            "One queue for everything that waits for a decision",
            // C-DISC-4
            "Each decision is one previewed batch, with an undo",
            // C-DISC-3
            "No scan, poll or sync rewrites a value a person decided",
          ],
        },
      ],
      figure: {
        screen: "discovery-queue",
        // C-DISC-5
        caption:
          "The Discovery queue: everything that waits for a decision, in groups named for what their rows would become.",
      },
    },
    atlas: {
      eyebrow: "Everything in one box",
      title: "One install, from address plan to alert.",
      // C-INST-11
      lead: "No add-on servers, no second database, no cloud account. Each part reads the same record.",
      link: "See every capability",
      previewLabel: "Screen preview",
      rows: [
        {
          key: "ipam",
          title: "IPAM",
          // C-IPAM-1, C-IPAM-2
          text: "Sites, VRFs, prefixes and VLANs, and every subnet as an IP plan with Find & reserve.",
          screen: "ip-plan",
          section: "ipam",
        },
        {
          key: "dcim",
          title: "DCIM & Rack Studio",
          // C-RACK-1, C-RACK-2, C-RACK-3
          text: "Racks, devices and cables with 1,594 bundled device types, and lenses for power, health and lifecycle.",
          screen: "rack-studio",
          section: "dcim",
        },
        {
          key: "discovery",
          title: "Discovery",
          // C-DISC-4, C-DISC-5
          text: "One queue for everything that waits, each decision one batch with an undo.",
          screen: "discovery-queue",
          section: "discovery",
        },
        {
          key: "map",
          title: "The map",
          // C-MAP-1, C-MAP-2, C-MAP-5
          text: "One line per cable, each saying how old it is. Ask it where something is.",
          screen: "topology-observed",
          section: "map",
        },
        {
          key: "studio",
          title: "Design Studio",
          // C-STU-1, C-STU-3
          text: "Designs that go out to Visio and come back as they left, edited together, live.",
          screen: "design-studio",
          section: "studio",
        },
        {
          key: "config",
          title: "Config & compliance",
          // C-CFG-1, C-SEC-3, C-CFG-2
          text: "SSH backups with host-key pinning, checked against four compliance packs.",
          screen: "compliance",
          section: "config",
        },
        {
          key: "nac",
          title: "NAC",
          // C-NAC-1, C-NAC-2
          text: "Detection first. Enforcement is optional, guarded and off by default.",
          screen: "nac",
          section: "nac",
        },
        {
          key: "monitoring",
          title: "Monitoring & incidents",
          // C-MON-1, C-MON-2, C-MON-3
          text: "Ping, TCP and HTTP checks. A site outage is one incident, sent to the channels you choose.",
          screen: "dashboard",
          section: "monitoring",
        },
        {
          key: "reports",
          title: "Reports & evidence",
          // C-REP-1, C-REP-3, C-DASH-3
          text: "Printed pages that say their scope and when they were true, a sealed evidence pack, and a gallery of 40 dashboards.",
          screen: "gallery",
          section: "reports",
        },
      ],
    },
    offline: {
      eyebrow: "Security",
      title: "Built for networks that can’t phone home.",
      // C-NET-1, C-RO-1
      lead: "LanCompass installs and runs with no internet connection. It reads the network; it doesn’t change it unless you ask.",
      points: [
        {
          title: "Signed offline install",
          // C-INST-1, C-INST-4, C-NET-2, C-LIC-1
          text: "One offline bundle, its files and Ed25519 signature checked before Docker starts. No cloud, no telemetry; the licence is checked offline.",
        },
        {
          title: "Read-only by default",
          // C-RO-1
          text: "The only network writes are DNS PTR publishing and NAC port actions. Both are opt-in and off by default.",
        },
        {
          title: "HTTPS, non-root",
          // C-SEC-5, C-SEC-6, C-SEC-8
          text: "A fresh install serves HTTPS with security headers. Containers run as non-root users, and the API stays on loopback.",
        },
        {
          title: "Secrets and host keys",
          // C-SEC-1, C-SEC-3
          text: "Stored credentials are encrypted with AES-256-GCM, and config backups pin each device’s SSH host key.",
        },
        {
          title: "SSO, LDAP and MFA",
          // C-AUTH-1, C-AUTH-2, C-AUTH-3
          text: "Local accounts with TOTP, OIDC single sign-on, LDAP and Active Directory.",
        },
        {
          title: "Audit to syslog",
          // C-SEC-14
          text: "Every change is kept in an audit trail that you can export and forward to syslog.",
        },
      ],
      link: "How we handle security",
    },
    hebrew: {
      eyebrow: "Hebrew-native",
      // C-LANG-1
      title: "Built in Hebrew, not translated into it.",
      // C-LANG-1, C-LANG-2, C-LANG-3, C-LANG-4
      lead: "Hebrew, Arabic and Persian run right to left: tables, trees, forms and rack elevations. English and Hebrew are complete, Arabic is partial, and 21 more languages have their core screens. Notifications come in Hebrew with Israel time, and search and sort understand Hebrew.",
      enCaption: "English",
      heCaption: "Hebrew",
      screen: "dashboard",
    },
    integrations: {
      eyebrow: "Integrations",
      title: "Reads the systems you already run.",
      // C-INT-1, C-INT-2, C-INT-3
      lead: "12 read-only connectors bring in what your systems already know. Each one only reads: GET calls after a sign-in, or an allowlist of read commands. Nothing changes without a person — test, preview, apply — and a sync that wrote something can be undone in one go.",
      legendTitle: "Legend",
      highlight: {
        name: "Check Point",
        title: "Check Point runtime data",
        // C-INT-4
        text: "ARP, DHCP leases and VPN tunnels, per gateway.",
      },
      // C-INT-1
      groupIntegrations: "Read-only connectors · 12",
      // C-CFG-2
      groupDrivers: "Config backup and compliance packs · 4",
      // C-INT-1
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
      // C-CFG-2
      drivers: ["Cisco IOS", "MikroTik RouterOS", "Check Point Gaia", "FortiOS"],
      extras: {
        title: "Also built in",
        items: [
          // C-RO-1
          "DNS PTR publishing to PowerDNS or RFC 2136 (opt-in)",
          // C-AUTH-4
          "An Ansible inventory endpoint",
          // C-AUTH-4
          "Scoped API tokens",
        ],
      },
    },
    imports: {
      eyebrow: "Migration",
      // C-IMP-1, C-IMP-2, C-IMP-3
      title: "Bring your Excel, your NetBox or your Visio.",
      lead: "Start from the record you already have, not from an empty screen.",
      cards: [
        {
          title: "Excel workbooks",
          // C-IMP-1, C-LANG-5
          text: "Import the workbook your team has kept for years, in Hebrew or English. You see a preview before anything is committed.",
          // C-IMP-1
          bullets: ["Hebrew-aware import", "Preview before commit"],
        },
        {
          title: "NetBox CSV exports",
          // C-IMP-2
          text: "Bring NetBox CSV exports from versions 3.6 to 4.2 and later. A coverage report shows what came across.",
          // C-IMP-2
          bullets: ["NetBox 3.6–4.2+", "Coverage report after import"],
        },
        {
          title: "Your Visio drawings",
          // C-IMP-3, C-STU-1
          text: "Import a <code>.vsdx</code>: stencil shapes become device types, and names and addresses are read from each shape’s text. Export a design back to Visio, and it comes back in as it left.",
          // C-IMP-3, C-STU-1
          bullets: ["Stencils mapped on import", "Out to Visio and back, as it left"],
        },
      ],
    },
    videos: {
      eyebrow: "Watch",
      title: "Three short videos from the demo network.",
      items: [
        { key: "drift-review-queue", title: "Work through the drift review queue" },
        {
          key: "documented-vs-observed",
          title: "Links seen on the wire, missing from the documentation",
        },
        { key: "hebrew-native", title: "LanCompass in Hebrew, right to left" },
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
    // C-INST-11
    lead: "One self-hosted install covers addressing, the physical layer, discovery, the map, designs, configs, access control, monitoring and reporting. Each section ends with a limit worth knowing.",
    sections: [
      {
        id: "ipam",
        nav: "IPAM",
        title: "IPAM",
        // C-IPAM-1, C-IPAM-2
        intro:
          "Plan and track address space the way your network is really built. Sites, VRFs, prefixes, IPs, VLANs and DHCP ranges live in one tree, and every subnet opens as an IP plan.",
        screen: "ipam-tree",
        bullets: [
          // C-IPAM-2
          "The subnet as an IP plan, with Find & reserve and the PTR record previewed",
          // C-IPAM-3
          "Observed MAC, vendor and hostname beside each documented address, never editing it",
          // C-IPAM-4
          "Reconcile a subnet against the network, row by row or by group",
          // C-IPAM-5
          "A save over a newer change is refused, with Reload and Overwrite",
          // C-IPAM-6
          "Plan a site from a template; capacity thresholds with one notification per crossing, and a forecast",
          // C-IMP-1, C-IMP-2, C-IMP-4
          "Excel workbooks (Hebrew too) and NetBox CSV exports in; IPAM exports back in with zero changes",
        ],
        // C-RO-1
        note: "DNS PTR publishing is one of only two network writes. It is opt-in and off by default.",
      },
      {
        id: "dcim",
        nav: "DCIM & racks",
        title: "DCIM & racks",
        // C-RACK-1, C-RACK-3
        intro:
          "Document the physical layer down to the patch panel. Rack Studio shows a cabinet the way you need to see it: as a photo, by health, by power or by lifecycle.",
        screen: "rack",
        bullets: [
          // C-RACK-1
          "Racks, devices with their ports and cables, and patch panels",
          // C-RACK-2
          "1,594 bundled device types, with front and rear images",
          // C-RACK-3
          "Rack Studio lenses: Photo, Health, Power and Lifecycle",
          // C-RACK-3
          "PDUs, outlets and the power chain",
          // C-RACK-4
          "Power, weight and depth budgets, and Find a place",
          // C-RACK-5, C-RACK-6
          "Field audits on a schedule, with photos; elevations right to left in Hebrew and on paper",
        ],
        // C-RACK-2
        note: "The device-type library ships inside the install, so it works offline too.",
      },
      {
        id: "discovery",
        nav: "Discovery",
        title: "Discovery",
        // C-DISC-5, C-DISC-3
        intro:
          "Everything that waits for a decision is in one queue, in groups named for what their rows would become. A person’s decision stays theirs: no scan, poll or sync rewrites it.",
        screen: "discovery-queue",
        bullets: [
          // C-DISC-1
          "A quick scan by default; deep discovery when an administrator turns it on",
          // C-DISC-2
          "Passive discovery that only listens, never sending a packet",
          // C-DISC-4
          "Every decision one previewed batch, undone in one step",
          // C-DISC-6
          "One real thing, one device: the wire proposes devices and cables",
          // C-DISC-7
          "What has gone quiet, decided in one place",
          // C-DISC-5
          "On our test lab, a week decided in 19 groups and 38 clicks",
        ],
        // C-DISC-1, C-DISC-2
        note: "Deep and passive discovery are off until you turn them on. The quick scan is the default.",
      },
      {
        id: "map",
        nav: "The map",
        title: "The map",
        // C-MAP-1, C-MAP-2, C-MAP-9
        intro:
          "The map draws one line per cable and says how old every line is. On our test lab, 17 of 17 links were drawn and none was false.",
        screen: "map-ages",
        bullets: [
          // C-MAP-1, C-DISC-8
          "LLDP and CDP from SNMP v1, v2c and v3 polls, both ends’ reports merged into one line per cable",
          // C-MAP-2
          "“Verified on the wire … ago” on every documented cable, and grey after 7 days unseen",
          // C-MAP-3
          "A host only on its edge port; what an uplink sees on its own layer, off by default",
          // C-MAP-5
          "Ask the map: where is it, the path from one thing to another, what breaks if it fails",
          // C-MAP-4
          "A cable that leaves the wire reaches Discovery → Gone; proposed cables applied as one batch, undone in one step",
          // C-MAP-6, C-MAP-8
          "LAGs as one line, every circuit on the World view, and a site incident that names its root",
        ],
        // C-MAP-10
        note: "Cisco IP phones still draw as ghost lines to their switch: they report themselves as a bridge as well as a telephone.",
      },
      {
        id: "studio",
        nav: "Design Studio",
        title: "Design Studio",
        // C-STU-1, C-STU-4
        intro:
          "Design the network you are about to build, bound to the one you have. A design goes out to Visio and comes back in as it left.",
        screen: "design-studio",
        bullets: [
          // C-STU-1
          "Export → Visio (.vsdx), back in as it left, every position within a pixel",
          // C-STU-3
          "Edit together, live; undo takes back only your own steps",
          // C-STU-2
          "Comments and replies on an object, a link or a point",
          // C-STU-4
          "Devices bound to the inventory, and signed versions",
          // C-STU-5, C-STU-7
          "Racks on the canvas; pen, highlighter and laser pointer",
          // C-STU-8
          "24 cloud & services shapes, 12 flowchart shapes and your team’s own stencils",
        ],
        // C-STU-10
        note: "A Visio file exported and then imported again gains a legend unless Add legend is off in the import’s review, and a design wider than 6,000 px comes back scaled.",
      },
      {
        id: "config",
        nav: "Config & compliance",
        title: "Config & compliance",
        // C-CFG-1, C-CFG-2, C-SEC-3
        intro:
          "Back up device configs over SSH and check them against compliance packs. Each device’s SSH host key is pinned.",
        screen: "compliance",
        bullets: [
          // C-CFG-1
          "Config backup over SSH, every change kept as a revision",
          // C-SEC-3
          "SSH host-key pinning",
          // C-CFG-2
          "Compliance packs: Cisco IOS, MikroTik RouterOS, Check Point Gaia, FortiOS",
          // C-SEC-4
          "Secrets in stored configs are masked; viewing a revision needs the <code>config:read</code> permission",
        ],
        // C-RO-2
        note: "Backup only reads configs. LanCompass never pushes a configuration to a device.",
      },
      {
        id: "nac",
        nav: "NAC",
        title: "NAC",
        // C-NAC-1, C-NAC-2
        intro:
          "Start with detection. Enforcement exists, but it is optional, guarded, and off by default.",
        screen: "nac",
        bullets: [
          // C-NAC-1
          "Detection: MAC sightings per port, and rogue-device, MAC-move, port-overflow and spoofing detectors",
          // C-NAC-2
          "Optional, guarded enforcement, with dry run on",
          // C-NAC-2, C-RO-1
          "Port actions are opt-in and off by default",
        ],
        // C-NAC-2
        note: "NAC enforcement is off by default and needs SNMPv3 with encryption.",
      },
      {
        id: "monitoring",
        nav: "Monitoring & incidents",
        title: "Monitoring & incidents",
        // C-MON-1, C-MON-3
        intro:
          "Check that the things you documented answer. When a site goes down, it is one incident, sent to the people who need to know.",
        screen: "dashboard",
        bullets: [
          // C-MON-1
          "Ping, TCP and HTTP checks, each on time",
          // C-MON-3
          "One incident for a site outage, not forty messages",
          // C-MON-3
          "Acknowledge, repeat until someone owns it, one escalation",
          // C-MON-2
          "Notifications to webhook, email, Discord, Telegram and syslog",
          // C-MON-4, C-DISC-9
          "Availability kept 400 days; every SNMP trap kept",
          // C-MON-6
          "<code>/metrics</code>, an Alertmanager intake and a 5-minute device health poll",
        ],
        // C-MON-7
        note: "Notifications still go out one by one inside the monitor sweep, so a channel that never answers can hold up the sweep that confirms an outage.",
      },
      {
        id: "reports",
        nav: "Reports & evidence",
        title: "Reports & evidence",
        // C-REP-1
        intro:
          "Reports read the same record as everything else, and every printed page says what it covers, when it was true and who printed it.",
        screen: null,
        bullets: [
          // C-REP-1
          "Every printed page: its scope, “As of” with the time zone, who produced it, and the period",
          // C-REP-2
          "Reports on a schedule, to a person, in their language",
          // C-REP-3
          "A sealed evidence pack, its manifest’s SHA-256 on the cover",
          // C-REP-5
          "Print, an XLSX workbook, and a CSV per section",
          // C-REP-4
          "Read-only share links, made by an administrator, over HTTPS only",
        ],
        // C-REP-4
        note: "Share links are off by default; only an administrator makes one, and only while HTTPS is on.",
      },
      {
        id: "dashboards",
        nav: "Dashboards",
        title: "Dashboards",
        // C-DASH-1
        intro:
          "Dashboards draw on the same record, in one chart system that reads in every theme and as a table.",
        screen: "gallery",
        bullets: [
          // C-DASH-1
          "Colour-blind-safe palettes, text summaries and “view as table”",
          // C-DASH-2
          "Versions with restore",
          // C-DASH-2
          "A wall mode for the screen on the wall",
          // C-DASH-3
          "The Dashboard Gallery: 40 entries to browse, follow or copy",
        ],
        // C-DASH-4
        note: "On a 1920 × 1080 wall in comfortable density, the Availability gauge overlaps itself; compact density lays it out cleanly.",
      },
      {
        id: "platform",
        nav: "Platform",
        title: "Platform",
        // C-INST-1, C-INST-5
        intro:
          "The parts that make LanCompass something you can run for years: a signed install, upgrades with a way back, backups and recovery, and sign-in.",
        screen: "licence",
        bullets: [
          // C-INST-1
          "One installer, from a signed offline bundle",
          // C-INST-5
          "Upgrades from the version you run: a backup first, a restore drill after, and a printed rollback",
          // C-INST-6, C-INST-7
          "Nightly backups, 14 kept on a fresh install, with automatic restore drills",
          // C-INST-8, C-INST-9
          "Warm standby, and a support bundle for troubleshooting",
          // C-SEC-5, C-LIC-1
          "HTTPS by default, and the licence checked on your server with no network call",
          // C-AUTH-1, C-AUTH-2, C-AUTH-3, C-AUTH-4
          "Local accounts with TOTP, OIDC, LDAP and Active Directory sign-in; scoped API tokens",
        ],
        needs: {
          title: "What you need",
          items: [
            // C-INST-2
            "A Linux host, VM or bare metal. The scanner needs host networking, which Docker Desktop on macOS or Windows does not give.",
            // C-INST-2
            "Docker Engine 24 or newer, with Compose v2.",
            // C-INST-3
            "About 3 GB of disk for the images, plus your data.",
          ],
          // C-INST-10
          scale:
            "Tested at an estate of 50,000 addresses, 5,000 devices, 2,100 prefixes, 200 racks and 100 sites, on one 8-core test host. These are our local measurements, not a hardware recommendation or a maximum.",
        },
        // C-NET-1, C-NET-2
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
