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
    videos: {
      title: "The videos, in words — LanCompass",
      description:
        "What each of the three LanCompass videos shows, step by step: the text version of every recording.",
    },
    security: {
      title: "Security — LanCompass",
      // C-NET-2, C-RO-1, C-SEC-5, C-INST-4, C-SEC-1, C-SEC-14
      description:
        "Your network data stays on your network. No telemetry, two opt-in writes, HTTPS by default, signed bundles, secrets encrypted at rest and an audit trail.",
    },
    verify: {
      title: "Verify a download — LanCompass",
      // C-VER-2, C-INST-4, C-VER-1, C-VER-6
      description:
        "Check a LanCompass bundle before you install it: the release’s files with their SHA-256, the three checks, the release key’s fingerprint and the SBOM.",
    },
    pilot: {
      title: "Pilot — LanCompass",
      // C-PILOT-2, C-PILOT-4, C-PILOT-6, C-PILOT-9
      description:
        "Run LanCompass on your own network: the first 30 days as ten steps, three success criteria you sign, support in Hebrew or English, and a clean exit.",
    },
    licensing: {
      title: "Licensing — LanCompass",
      // C-LIC-1, C-LIC-2, C-LIC-4, C-LIC-5
      description:
        "How the LanCompass licence works: 30 days to try with no licence file, a signed file checked offline, what each state does, and read-only that hides and deletes nothing.",
    },
    contact: {
      title: "Contact — LanCompass",
      description: "Questions about LanCompass, a pilot or the licence. Write to us.",
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
    docs: {
      title: "Docs — LanCompass",
      // C-DOCS-1, C-DOCS-2
      description:
        "The help built into LanCompass 0.7.0, in English and Hebrew: getting started, how-to guides, IPAM, inventory, integrations, operations and the system.",
    },
    changelog: {
      title: "Release notes — LanCompass",
      // C-NOTES-2
      description:
        "The notes of every LanCompass release, newest first, as the product writes them: what changed, how to upgrade and the known issues.",
    },
  },

  home: {
    hero: {
      // C-NET-1, C-RO-1
      chips: ["Self-hosted", "Runs fully offline", "Read-only by default"],
      title: "Your documentation and your network, in agreement.",
      // C-PRD-1
      lead: "LanCompass keeps IPAM, racks and cabling in one self-hosted system, discovers what is really on the wire, and shows every place where the two drift apart.",
      primary: "Start a pilot",
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
      /** W8: the link to the newest release's notes. */
      notes: "Read the release notes",
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
      // W5: each slot's title is its storyboard's (src/content/videos.json, cited there).
      items: [
        { key: "drift-review-queue" },
        { key: "documented-vs-observed" },
        { key: "hebrew-native" },
      ],
    },
    /** W7: the pilot band (was the design-partners band). */
    pilot: {
      eyebrow: "Pilot",
      title: "Try it on your own network.",
      // C-PILOT-1
      lead: "A pilot runs LanCompass on your server, under a written pilot agreement.",
      getsTitle: "What a pilot gives you",
      gets: [
        // C-PILOT-2
        "The first 30 days as ten steps, each with its “done”",
        // C-PILOT-4
        "Three success criteria, signed before day one",
        // C-PILOT-9
        "A clean exit, confirmed in writing",
      ],
      cta: "Start a pilot",
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
      // C-PILOT-2, C-PILOT-4, C-PILOT-9
      text: "A pilot: 30 days in ten steps, signed criteria, a clean exit.",
      button: "Start a pilot",
    },
  },

  /** W5: /videos/, each video's text alternative (its steps come from src/content/videos.json). */
  videoText: {
    eyebrow: "The videos, in words",
    title: "What each video shows, step by step.",
    lead: "The three videos on the home page are silent. Here is what each one shows, in the order it shows it, for anyone who cannot or would rather not play them. The captions say the same.",
    inShort: "In short",
    back: "Back to the videos",
  },

  /** W4: the annotated screens. Per screen key, the caption after "Fig. n —" and one note per
   *  capture anchor W3 recorded (src/content/screen-anchors.json), keyed by the anchor's name.
   *  A note names what is on the screen and nothing more. */
  figures: {
    "ipam-tree": {
      // C-IPAM-1
      caption: "The prefix hierarchy: sites, VRFs and prefixes in one tree.",
      // C-IPAM-1
      notes: { tree: "A site opens to its VRFs, and each VRF to its prefixes." },
    },
    rack: {
      // C-RACK-3
      caption: "A rack in Rack Studio, its lenses beside the elevation.",
      // C-RACK-1
      notes: { elevation: "The front elevation: each device drawn in the units it fills." },
    },
    "discovery-queue": {
      // C-DISC-5
      caption: "The Discovery queue: everything that waits for a decision.",
      // C-DISC-5
      notes: {
        queue: "What waits for a decision, counted at the top.",
        "first-group": "A group, named for what its rows would become.",
      },
    },
    "map-ages": {
      // C-MAP-1, C-MAP-2
      caption: "Demo HQ’s map: one line per cable, and each line says how old it is.",
      // W11: the figure is a crop around the open card; the Changes lens's note went with the
      // window's top bar it pointed at (C-MAP-4 stays cited in the map section above).
      notes: {
        // C-MAP-2
        canvas: "A cable’s card: when it was last verified on the wire.",
      },
    },
    "ask-the-map": {
      // C-MAP-5
      caption: "Ask the map: a question, and its answer under the bar.",
      // C-MAP-5
      notes: { answer: "The answer: which device the address belongs to." },
    },
    "design-studio": {
      // C-STU-6
      caption: "A branch design in the studio, with one switch selected.",
      notes: {
        // C-STU-1
        canvas: "The canvas: the design, drawn inside a slide.",
        // C-STU-6
        selected: "The selected switch; the inspector beside it holds its own look.",
      },
    },
    compliance: {
      // C-CFG-2
      caption: "Compliance findings on the stored configs, by severity, pack and site.",
      // C-CFG-2
      notes: { section: "Each finding: the device, the rule, its pack and its references." },
    },
    nac: {
      // C-NAC-1, C-NAC-2
      caption: "NAC in its default mode: detection only.",
      // C-NAC-2
      notes: { mode: "The mode banner: detection only, dry run on, and no port touched." },
    },
    dashboard: {
      // C-MON-1, C-DASH-1
      caption: "The dashboard: what is offline, what failed, and the monitors’ events.",
      // C-MON-1, C-DASH-1
      notes: { grid: "Widgets on one record: offline devices, failed scans, monitor events." },
    },
    gallery: {
      // C-DASH-3
      caption: "The Dashboard Gallery, with its Showcase row.",
      // C-DASH-3
      notes: { showcase: "An entry to preview, to follow, or to make your own." },
    },
    licence: {
      // C-LIC-1
      caption:
        "Settings → License in the evaluation: checked on this server, with no network call.",
      // C-LIC-1
      notes: { state: "The licence state: Evaluation, while no licence file is uploaded." },
    },
  },

  /** W4: "What talks to what" (HowItRuns.astro): the drawing's labels and its text alternative. */
  howItRuns: {
    eyebrow: "What talks to what",
    // C-INST-1, C-NET-1, C-RO-1
    title: "One host, four images, nothing to the internet.",
    desc: "Seven numbered parts; the numbered list under the drawing says what each one is.",
    items: [
      // C-INST-1, C-INST-2
      "One Linux host with Docker: your own server, installed from one signed offline bundle.",
      // C-INST-12
      "Four images: the web tier, the API, PostgreSQL and Redis. The API’s scanner and discovery workers use the host’s network for layer-2 scans.",
      // C-SEC-5
      "People reach it in a browser, over HTTPS.",
      // C-RO-2, C-INT-2, C-DISC-1
      "It reads your network, with the scans and SNMP polls you configure, and your systems, through read-only connectors.",
      // C-RO-1
      "It writes to the network in only two places, DNS PTR publishing and NAC port actions, both opt-in and off by default: the dashed line.",
      // C-NET-1, C-NET-2, C-LIC-1
      "Nothing goes to the internet: no telemetry, and the licence is checked on the host.",
      // C-INST-13, C-INST-7
      "Backups go to a folder on the host, with restore drills.",
    ],
    labels: {
      // C-INST-1, C-INST-2
      host: "Your Linux host · Docker",
      // C-SEC-5
      people: "People, in a browser",
      https: "HTTPS",
      // C-NET-1, C-NET-2
      internet: "The internet",
      nothing: "nothing sent",
      // C-INST-12
      web: "web",
      api: "API",
      workers: "scanner, discovery: host network",
      db: "PostgreSQL",
      redis: "Redis",
      // C-INST-13, C-INST-7
      backups: "backups/ · restore drills",
      // C-RO-2, C-DISC-1
      network: "Your network",
      networkSub: "scans, SNMP polls",
      // C-INT-2
      systems: "Your systems",
      systemsSub: "read-only connectors",
      reads: "reads",
      // C-RO-1
      writes: "DNS PTR, NAC port actions",
      writesSub: "opt-in, off by default",
    },
  },

  /** W6: /verify/. Every file name, size, hash and fingerprint on the page comes from
   *  src/content/releases.json and src/content/fingerprints.json (read from the bundle by
   *  command), and every command is built from them (src/lib/verify.ts): none is typed here.
   *  `{version}`, `{date}`, `{format}`, `{components}` and `{bytes}` are filled from that data. */
  verify: {
    eyebrow: "Verify a download",
    title: "Check the bundle before you install it.",
    // C-INST-1, C-INST-4, C-VER-4
    lead: "LanCompass reaches you as one signed offline bundle. Three checks, with tools every Linux host has, show that it is the bundle we released and that nothing in it changed on the way.",
    release: {
      title: "The current release",
      // C-REL-1, C-VER-2
      text: "LanCompass {version}, released on {date}: a signed offline bundle.",
    },
    // C-VER-2
    files: {
      title: "Its files",
      // C-VER-9
      lead: "A pilot receives the first two files from us. The third, the software bill of materials, is served from this page.",
      caption: "The files of LanCompass {version}, each with its size and its SHA-256",
      file: "File",
      bytes: "Size (bytes)",
      sha256: "SHA-256",
    },
    check: {
      title: "How to check it",
      // C-VER-3
      lead: "Put the two files in one folder on the host and run the three steps there. Each step gives the command to copy, the output to expect, and what to do when you see anything else.",
      run: "Run",
      expect: "Expect",
      otherwise: "If it differs",
      checksum: {
        title: "The checksum",
        // C-VER-3
        text: "The output must end in <code>OK</code>.",
        // C-VER-3
        otherwise:
          "If it says <code>FAILED</code>, or anything but <code>OK</code>, the file was damaged or changed on the way. <strong>Do not install it; ask us for the bundle again.</strong>",
      },
      installer: {
        title: "The installer’s own check",
        // C-INST-4
        text: "Extract the bundle and run its installer. Before it touches Docker, it checks every file against <code>SHA256SUMS</code>, checks the Ed25519 signature over <code>SHA256SUMS</code> with <code>openssl</code>, and prints the fingerprint of the key that signed it.",
        // C-INST-4
        otherwise:
          "On any mismatch it stops before Docker is touched, and says that nothing was installed. <strong>Do not install; ask us for the bundle again.</strong>",
        // C-INST-4, C-VER-4
        byHand:
          "To check by hand without installing, as a security reviewer would, run the two <code>openssl</code> lines the installer runs, in the extracted folder. The first checks the signature; the second prints the key’s fingerprint, in lower case and without colons.",
      },
      compare: {
        title: "Compare the fingerprint",
        // C-VER-4
        text: "Compare the fingerprint the installer printed with the release key below, on this page — not only with the <code>INSTALL.md</code> inside the bundle.",
        // C-VER-4
        why: "The bundle carries its own public key and its own <code>INSTALL.md</code>: whoever could replace the bundle could replace both, so only a fingerprint read from a second place proves the key is ours.",
        otherwise: "<strong>If they differ, do not install; ask us for the bundle again.</strong>",
      },
    },
    // C-VER-1
    key: {
      title: "The release key",
      lead: "The key that signs every LanCompass bundle. The installer prints its fingerprint: compare the two, pair by pair.",
      caption: "The release key’s SHA-256 fingerprint",
      key: "Key",
      purpose: "Purpose",
      fingerprint: "SHA-256 fingerprint",
      historyTitle: "Key history",
      historyCaption: "Every key that has signed LanCompass bundles",
      first: "First release",
      last: "Last release",
      state: "State",
      active: "Active",
      retired: "Retired",
      retiredNone:
        "Retired keys: none. When the key changes, the old key stays in this table with its last release, so an older bundle can still be checked.",
    },
    inside: {
      title: "What is inside the bundle",
      // C-VER-5
      lead: "The bundle’s top folder, as <code>tar -tzf</code> lists it. <code>SHA256SUMS</code> lists every file, and the signature covers that list.",
      // C-VER-5
      items: [
        {
          files: ["install.sh"],
          text: "The installer: it checks the bundle, loads the images, creates <code>.env</code> and starts LanCompass.",
        },
        {
          files: ["upgrade.sh"],
          text: "The upgrade to this version: a backup first, a restore drill after, the rollback steps printed.",
        },
        {
          files: ["INSTALL.md", "INSTALL.he.md"],
          text: "The install guide in English and in Hebrew, with the release key’s fingerprint in its first section.",
        },
        {
          files: ["LICENSE"],
          text: "The licence: LanCompass is used only under a written agreement.",
        },
        { files: ["CHANGELOG.md"], text: "The notes of every release, this one first." },
        {
          files: [
            "SECURITY.md",
            "THREAT_MODEL.md",
            "THREAT_MODEL.he.md",
            "docs/SECURITY_ANSWERS.md",
          ],
          // C-VER-5, C-SEC-12
          text: "The security reviewer’s pack: how an install is defended, what it protects and from whom, and 63 answers, each beside the test or file that proves it.",
        },
        { files: ["sbom.cdx.json"], text: "The software bill of materials (below)." },
        {
          files: ["MANIFEST.json"],
          text: "The version, the commit it was built from, the build time and the four images.",
        },
        {
          files: ["SHA256SUMS", "SHA256SUMS.sig", "lancompass-release.pub"],
          text: "The checksum of every file, the Ed25519 signature over that list, and the public key that checks it.",
        },
        {
          files: ["images.tar.gz"],
          text: "The four container images: <code>lancompass/api</code>, <code>lancompass/web</code>, <code>postgres:16-alpine</code> and <code>redis:7-alpine</code>.",
        },
        {
          files: ["docker-compose.yml", "docker-compose.tls.yml", "docker-compose.primary.yml"],
          text: "The Compose file, its HTTPS overlay, and the primary’s overlay for the opt-in warm standby.",
        },
        {
          files: [".env.example"],
          text: "The settings template the installer copies into <code>.env</code>.",
        },
        {
          files: ["deploy/"],
          text: "The warm standby kit, with its runbook in English and Hebrew, and a PostgreSQL access file for it.",
        },
      ],
    },
    sbom: {
      title: "The SBOM",
      // C-VER-6, C-SEC-13
      text: "Every bundle carries a software bill of materials, <code>sbom.cdx.json</code>: a {format} file that lists {components} components — the four images, their operating systems and the libraries inside them.",
      // C-VER-6
      same: "The file served here is that same file: its SHA-256, in the table above, equals its line in the bundle’s <code>SHA256SUMS</code>.",
      link: "Download the SBOM ({bytes} bytes)",
    },
    upgrades: {
      title: "Supported versions and upgrades",
      // C-VER-7
      fixes: "Security fixes go to the latest release.",
      // C-VER-10, C-INST-5
      upgrade:
        "An upgrade is a new bundle with a new version number and its notes (<code>CHANGELOG.md</code> inside it). It upgrades from the version you run now: its <code>upgrade.sh</code> takes a backup first, runs a restore drill after, and prints the rollback steps.",
    },
    get: {
      title: "How to get the bundle",
      // C-VER-9
      text: "There is no public download. A pilot receives the bundle and its <code>.sha256</code> file from us, with the release key’s fingerprint.",
      ask: "Ask us for the bundle",
    },
  },

  /** W7: /pilot/ — the product's own way in, in its own words: Docs first-run.md (§ The first
   *  30 days, § Success criteria), support.md (§ The pilot, § For a security review) and
   *  LICENSE at v0.7.0. No step, promise or figure is added; the agreement's terms are not
   *  stated (it is named, and the page stops there). */
  pilot: {
    eyebrow: "Pilot",
    // C-PILOT-2
    title: "Run LanCompass on your own network for 30 days.",
    // C-PILOT-2, C-PILOT-4, C-PILOT-9
    lead: "A pilot is the product’s own first month: ten steps on your server, three outcomes you agree and sign before day one, support while it runs, and a clean exit at the end.",
    what: {
      title: "What a pilot is",
      // C-PILOT-1
      text: "A pilot runs LanCompass on your own server, under a written pilot agreement that names its term, its sites and its users. The licence file that comes with the agreement is uploaded on day one.",
      // C-VER-9, C-LIC-1, C-LIC-4, C-LIC-5
      trying:
        'To try LanCompass, you ask us for the bundle; no licence file is needed for its first 30 days. If no licence is uploaded by then, it becomes read-only: every page and record still opens, nothing is hidden or deleted, and a valid licence ends read-only at once. <a href="/licensing/">How the licence works</a>.',
    },
    need: {
      title: "What you need before day one",
      items: [
        // C-INST-2
        "A Linux host, a VM or bare metal, with Docker Engine 24 or newer and the Compose v2 plugin.",
        // C-INST-3
        "About 3 GB of disk space for the images, plus room for your data.",
        // C-PILOT-10
        "A user that can run Docker: <code>root</code>, or a member of the <code>docker</code> group; and <code>sha256sum</code>, <code>tar</code> and <code>gzip</code>.",
        // C-PILOT-10
        "A read-only account for each system you connect, such as Active Directory, vCenter and the firewall.",
      ],
    },
    // C-PILOT-2, C-PILOT-3
    days: {
      title: "The first 30 days",
      lead: "Ten steps, in order: the same path the release rehearsal walks on a server with no route out, in Hebrew first. Each step says where it happens and what “done” looks like.",
      done: "Done:",
      steps: [
        {
          title: "Install",
          text: "On the server, follow sections 1–3 of <code>INSTALL.he.md</code> (or <code>INSTALL.md</code>): check the bundle with <code>sha256sum -c</code>, extract it, run <code>sh install.sh</code>.",
          done: "the installer ends with <code>LanCompass &lt;version&gt; is running.</code> and the <code>https://</code> address, and the fingerprint it printed first matches the release key’s.",
        },
        {
          title: "Set up in Hebrew",
          text: "Open that address, choose Hebrew on the setup page and create the administrator. Then upload the licence file in <strong>Settings → License</strong>.",
          done: "the dashboard opens in Hebrew, a colleague’s sign-in page is in Hebrew too, and Settings → License names your organisation.",
        },
        {
          title: "Import",
          text: "<strong>Import</strong> your address workbook (<code>.xlsx</code>) or a NetBox export; read the preview, then apply.",
          done: "the plan’s rows are created, or skipped with a reason, and <strong>Subnets</strong> lists your subnets.",
        },
        {
          title: "Scan",
          text: "Run the dashboard’s <strong>Quick scan</strong> on one office subnet.",
          done: "the scan completes, the first screen’s three counts fill, and what nobody documented waits in the <strong>Discovery Inbox</strong> for a person’s decision.",
        },
        {
          title: "Connect",
          text: "In <strong>Settings → Integrations</strong>, connect Active Directory, vCenter and the firewall, each with a read-only account: <em>Test</em>, <em>Preview</em>, then <em>Apply</em>.",
          done: "each test passes, each preview shows its plan (a long one says it is still reading after 10 s), and the applied rows appear on their pages.",
        },
        {
          title: "An alert",
          text: "In <strong>Settings → Monitoring</strong>, add a mail channel to your relay and test it; then monitor one device.",
          done: "the test mail arrives in Hebrew, and when that device stops answering, one message says so.",
        },
        {
          title: "Colleagues over HTTPS",
          text: "Turn on sign-in with Active Directory, with roles from your AD groups.",
          done: "a colleague signs in at the <code>https://</code> address with their directory account and gets their group’s role.",
        },
        {
          title: "Back up",
          text: "In <strong>Settings → Backup &amp; Restore</strong>: nightly backups (on by default on a fresh install, 14 kept) and a restore drill.",
          done: "a backup file in <code>backups/</code>, the drill passes, and a copy of one backup and of <code>.env</code> is kept off the server.",
        },
        {
          title: "Upgrade",
          text: "When the next bundle arrives, extract it into <code>incoming/</code> and run its <code>upgrade.sh</code> from the install folder.",
          done: "it ends with <code>LanCompass is upgraded to &lt;version&gt;</code> and prints the rollback steps.",
        },
        {
          title: "A support bundle",
          text: "Download one in <strong>Settings → Support</strong> and send it as the pilot agreement says.",
          done: "a ZIP with <code>manifest.json</code> reaches support, and the changelog records its SHA-256.",
        },
      ],
    },
    // C-PILOT-4, C-PILOT-5
    criteria: {
      title: "Success criteria",
      lead: "Before day one, the pilot’s champion (who runs it) and its economic buyer (who decides to buy) agree on what the pilot must show, and sign it. A worksheet to copy into the pilot agreement:",
      caption: "Success criteria: three outcomes, each measured in LanCompass",
      columns: [
        "Outcome we need",
        "How LanCompass shows it",
        "Day one",
        "Target for day 30",
        "Day 30",
      ],
      rows: [
        {
          outcome: "Our documentation matches the network",
          shows:
            "The first screen’s <em>observed hosts nobody documented</em> and <strong>Discovery</strong>’s open items",
        },
        {
          outcome: "We hear about an outage before our users do",
          shows:
            "<strong>Incidents</strong> and each monitor’s availability; the alert’s time beside the outage’s",
        },
        {
          outcome: "An auditor’s question is answered in minutes",
          shows:
            "<strong>Reports</strong>: the period’s report and its evidence pack, and the time it took",
        },
      ],
      note: "Fill in the Day one column on the install day, from the product, and agree each target before you start. Replace an outcome with your own if it matters more — keep three, each measured in the product.",
      signCaption: "Signed before day one",
      signColumns: ["Signed", "Name", "Role", "Date"],
      signRows: ["Champion", "Economic buyer"],
      reviewTitle: "The day-30 review",
      review:
        "Open each measure in the product together, write its value beside the target, and decide: an order, an extension with new targets, or the end of the pilot.",
    },
    support: {
      title: "Support during the pilot",
      items: [
        // C-PILOT-6
        "<strong>Answers</strong> in Hebrew or English, on business days: a first answer by the next business day.",
        // C-PILOT-7
        "<strong>Upgrades</strong>: at most one every two weeks, each a bundle with a new version number and its notes, from the version you run now, with a backup first and a restore drill.",
        // C-PILOT-8, C-INST-6
        "<strong>Backups</strong>: a fresh install backs up nightly and keeps 14; the weekly restore drill checks the newest.",
        // C-PILOT-8
        "<strong>A support bundle</strong>, when support asks for one: you can open it yourself first, and the changelog keeps its SHA-256.",
      ],
    },
    // C-PILOT-9
    ends: {
      title: "How a pilot ends",
      lead: "Both sides leave cleanly, and say so in writing:",
      steps: [
        "Keep what you want first: a backup, a report, an export.",
        "In the install folder, stop LanCompass and delete its data volumes: <code>docker compose down -v</code>.",
        "Delete the install folder (<code>backups/</code>, <code>certs/</code> and <code>.env</code> are in it), the bundle files you copied, and the images it loaded.",
        "Delete every support bundle you downloaded. Support deletes every support bundle it received, and both sides confirm it in writing.",
      ],
    },
    reviewer: {
      title: "For your security reviewer",
      // C-SEC-12
      text: "Every bundle carries the reviewer’s pack: <code>SECURITY.md</code>, the threat model in English and Hebrew, and <code>docs/SECURITY_ANSWERS.md</code> — 63 questions, each answer beside the test or file that proves it. Send your reviewer the pack rather than a summary.",
      security: "How LanCompass handles security",
      verify: "How to check the bundle you receive",
    },
    partner: {
      title: "Become a design partner",
      lead: "LanCompass is looking for its first design partners: network teams of one to ten people who keep the network running and the documentation honest, often in regulated places, often on Check Point.",
      getsTitle: "What a partner gets",
      gets: [
        "A guided install, with you, on your hardware, online or air-gapped.",
        "Your existing workbook moved across with you, and the result checked together.",
        "A direct line to the engineer who wrote the code, not a queue.",
        "Early influence: what you need shapes what ships next.",
      ],
      asksTitle: "What we ask",
      asks: [
        "Regular feedback: what works, what doesn’t, and what is missing.",
        "A reference, only if LanCompass earns it.",
      ],
      // C-PILOT-9
      leave:
        "Either side can leave the way a pilot ends: cleanly, and in writing. Publicity is opt-in: we name you, quote you or show your logo only with your written agreement.",
      none: "No partner is named on this site.",
    },
    apply: {
      title: "Apply for a pilot",
      lead: "A few questions about your network, so the first call is a useful one.",
      // C-PILOT-6, C-LIC-7
      pricing:
        'Pilots come with support in Hebrew or English. Editions and prices follow the pilot: <a href="/licensing/">how the licence works</a>.',
    },
  },

  /** W7: /licensing/ — the licence as built (Docs settings.md § License, support.md § The
   *  licence, LICENSE, license.py at v0.7.0). Key ids, the trust store and the issuer are not
   *  stated (operator internals); no edition, price or "free" (D-EDITIONS, D-PRICING). */
  licensing: {
    eyebrow: "Licensing",
    title: "How the licence works.",
    // C-LIC-1, C-LIC-2, C-LIC-5
    lead: "Try LanCompass for 30 days without a licence file. Then a signed file, checked on your own server; and when a licence ends, read-only, with nothing hidden or deleted.",
    try: {
      title: "Try it first",
      // C-LIC-1, C-NET-1
      text: "No licence file is needed to try LanCompass: with none uploaded, everything works for 30 days from the install’s first start, offline.",
      // C-PILOT-1
      agreement:
        'As every install, it runs under a written agreement: for a pilot, the pilot agreement. <a href="/pilot/">How a pilot works</a>.',
    },
    licence: {
      title: "The licence",
      // C-LIC-2
      text: "A licence is a signed <code>.lclic</code> file. An administrator uploads it in <strong>Settings → License</strong>, and LanCompass checks it on your server, with no network call: changing one character of the file makes it invalid. Settings → License shows everyone signed in the customer, the kind of licence, the dates it runs between and the days left.",
      // C-LIC-3
      refused:
        "A file that does not check — changed after it was signed, signed by a key the install does not trust, revoked, not started yet or already ended — is refused with its reason, and the licence in place stays. A renewal replaces the licence it renews.",
    },
    // C-LIC-4
    states: {
      title: "Before it ends",
      lead: "Settings → License shows the licence’s state. What LanCompass does in each:",
      caption: "The licence’s states, and what LanCompass does in each",
      state: "State",
      does: "What LanCompass does",
      rows: [
        {
          state: "Evaluation",
          does: "No licence yet: everything works for 30 days from the install’s first start. Administrators see a yellow banner in the last 7 days.",
        },
        { state: "Valid", does: "Everything works." },
        {
          state: "Ending soon",
          does: "30 days or fewer left: everything works. Administrators see a yellow banner, and a notice goes out at 30, 14, 7 and 1 days left.",
        },
        {
          state: "Ended — grace period",
          does: "The end date has passed: everything still works for the licence’s grace, 14 days unless the licence says otherwise. Everyone sees a red banner, and a notice goes out each day.",
        },
        {
          state: "Ended — read-only",
          does: "After the grace, or after 30 days without a licence (<em>Evaluation ended — read-only</em>): read-only, below, with one notice.",
        },
      ],
      notices: "The notices go through the channels your administrators already set up.",
    },
    // C-LIC-5, C-LIC-6
    readOnly: {
      title: "Read-only, exactly",
      stops:
        "What stops: a change made by a person or an API token. It is refused, and a grey banner says since when.",
      keepsTitle: "What keeps working:",
      keeps: [
        "Every page opens and every record reads. Nothing is hidden or deleted.",
        "Exports, backups and their restore drills, and the support bundle.",
        "Signing in and out, and two-factor.",
        "The work that watches the network: scans, syncs, polls and monitors.",
      ],
      end: "Uploading a valid licence ends read-only at once.",
      clock:
        "LanCompass checks the licence against the latest time it has seen, so winding the server’s clock back does not stretch a licence.",
    },
    editions: {
      title: "Editions and prices",
      // C-LIC-7
      text: "At 0.7.0 every licence includes every feature. Editions and prices follow the pilot — talk to us.",
      link: "Start a pilot",
    },
    faq: {
      title: "Questions buyers ask",
      items: [
        {
          q: "Does LanCompass call home?",
          // C-NET-2, C-LIC-1
          a: "No. It has no agent, no cloud account and no telemetry, and the licence is checked on your server with no network call.",
        },
        {
          q: "What happens when a licence ends?",
          // C-LIC-4, C-LIC-5
          a: "Everything keeps working through the grace period, 14 days unless the licence says otherwise. Then LanCompass is read-only: nothing is hidden or deleted, and a valid licence ends read-only at once.",
        },
        {
          q: "Do we need a licence to try it?",
          // C-LIC-1, C-VER-9
          a: "Not a licence file: everything works for 30 days from the install’s first start. You need the bundle, which we send for a pilot.",
        },
        {
          q: "Does it run with no route out?",
          // C-NET-1, C-LIC-1
          a: "Yes. Everything it needs is inside the bundle, nothing is downloaded during the install or fetched while it runs, and the licence check makes no network call.",
        },
        {
          q: "Is it open source?",
          // C-LIC-8
          a: 'No. LanCompass is not open source: its licence is proprietary. Third-party components keep their own licences, <a href="/verify/#sbom">listed in the SBOM</a>.',
        },
        {
          q: "Are there editions?",
          // C-LIC-7
          a: "Not yet. At 0.7.0 every licence includes every feature; editions and prices follow the pilot.",
        },
        {
          q: "How do we get the bundle?",
          // C-VER-9
          a: 'Ask us: there is no public download. A pilot receives the bundle and its checksum file with the release key’s fingerprint; <a href="/verify/">Verify a download</a> shows how to check them.',
        },
      ],
    },
  },

  /** W7: the page left at /design-partners/ for static hosts without the nginx 301. */
  moved: {
    title: "This page has moved — LanCompass",
    text: "The design-partner page is now the pilot page.",
    link: "Go to the pilot page",
  },

  contact: {
    eyebrow: "Contact",
    title: "Talk to us.",
    lead: "Questions about LanCompass, a pilot, or an integration you need.",
    // C-PILOT-6, C-LIC-7
    pricing:
      'Pilots come with support in Hebrew or English. Editions and prices follow the pilot: <a href="/licensing/">how the licence works</a>.',
    emailLabel: "Email",
    formTitle: "Send a message",
  },

  notFound: {
    eyebrow: "404",
    title: "This page is off the map.",
    lead: "The address may have moved, or it never existed. The compass still points home.",
    home: "Back to the home page",
  },

  /**
   * W8: /changelog/ and each release's page. The notes themselves are the product's
   * (src/content/changelog/en); these are the site's words around them. `{version}`, `{date}`,
   * `{count}`, `{first}`, `{last}` and `{href}` are filled in by the pages.
   */
  changelog: {
    eyebrow: "Release notes",
    title: "What changed in each release",
    // C-NOTES-2
    lead: "Every LanCompass release, newest first, in the product’s own notes: what changed and, from 0.6.0 on, how to upgrade and what a pilot can still meet.",
    latest: "Latest",
    // C-NOTES-1 (each release's line shows its summary: releases.json summary_en / summary_he)
    read: "The {version} notes",
    feed: "Follow the release notes (Atom feed)",
    feedTitle: "LanCompass release notes",
    feedSubtitle: "The notes of every LanCompass release, as the product writes them.",
    releaseTitle: "LanCompass {version}",
    dateLabel: "Date",
    glance: {
      title: "At a glance",
      from: "Upgrades from",
      fromNone: "No upgrade section in these notes",
      migrations: "Database migrations",
      migrationsValue: "{count}: {first} → {last}",
      migrationsNone: "None counted in these notes",
      known: "Known issues",
      knownNone: "None listed in these notes",
      upgradeLink: "How to upgrade",
      knownLink: "The known issues",
    },
    notes: "The notes",
    others: "Other releases",
    older: "Older: {version}",
    newer: "Newer: {version}",
    all: "All releases",
    // C-VER-1, C-VER-2
    verify:
      'Before you install {version}, check its bundle: <a href="{href}">verify a download</a>.',
    /** The Hebrew pages only: what the summary is, and the link to the full English notes. */
    authority: "",
    english: "",
  },

  /**
   * W9: /docs/ and each article. The articles are the product's (src/content/docs/<locale>);
   * these are the site's words around them. The category names, "On this page", "All guides",
   * "Previous" / "Next" and the stale notice are the product's own UI strings at v0.7.0
   * (frontend/src/i18n/messages/en.json: docs.category.*, docs.onThisPage, docs.allGuides,
   * common.previous, common.next, docs.i18n.stale).
   */
  docs: {
    eyebrow: "Docs",
    // C-DOCS-1
    title: "The help built into LanCompass",
    // C-DOCS-1, C-DOCS-2
    lead: "These are the product’s own help pages, as they ship inside LanCompass {version}: 65 articles in seven categories, in English and in Hebrew, the two languages the product reviews in full.",
    // C-DOCS-1
    versionLine: "Docs for LanCompass {version} — the help built into the product",
    categories: {
      "getting-started": "Getting Started",
      "how-to": "How-to guides",
      ipam: "IPAM",
      inventory: "Inventory",
      integrations: "Integrations",
      operations: "Operations",
      system: "System",
    },
    nav: "Guides",
    allGuides: "All guides",
    onThisPage: "On this page",
    previous: "Previous",
    next: "Next",
    stale: "This translation may be outdated — the English article changed since",
    index: "All the docs",
  },
};

export type Copy = typeof en;
