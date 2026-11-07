---
title: "Compliance packs"
description: "Curated baseline rules for Cisco IOS, MikroTik RouterOS, Check Point Gaia and FortiOS — installed, updated and removed through a plan."
category: "operations"
version: "0.7.0"
order: 32
---

# Compliance packs

A compliance pack is a curated set of config-compliance rules for one device
operating system. LanCompass ships four:

| Pack | Config driver | Covers |
|---|---|---|
| Cisco IOS baseline | `ios` | SSH v2 only, no Telnet or HTTP management, session timeouts, AAA, remote syslog, NTP, SNMP communities, banner, unused services |
| MikroTik RouterOS baseline | `routeros` | Clear-text services, Winbox and MAC access, SSH crypto, SNMP, DNS, NTP, remote logging |
| Check Point Gaia baseline | `gaia` | Telnet, allowed clients, CLI and web timeouts, password controls, remote AAA, SNMP v3, syslog, NTP, banner |
| FortiGate FortiOS baseline | `fortios` | Telnet and HTTP admin access, TLS versions, timeouts, lockout, trusted hosts, SNMP, logging, NTP, USB auto-install |

Each rule is a regular expression run against the stored config text, the same
engine as the rules you write yourself (see [Devices](/docs/devices/)).

> [!WARNING]
> A failing rule is an observation on the stored config, not proof. A passing
> rule does not certify that a device complies with CIS, a vendor guide or any
> regulation. References name where a rule comes from; they are identifiers only.

## Install, update, remove

Open **Settings → Monitoring → Curated packs**. Each card shows the pack version,
the rule count, the installed version, and **Update available** when the pack
file changed.

1. Select **Install** or **Update**. The plan lists every rule the pack would
   **add**, **update** or **remove**, worst severity first.
2. Select **Apply**. The server computes the plan again and writes it in one
   transaction. One audit row records the change for the whole pack.
3. Findings refresh on the next compliance sweep, usually within a minute.

**Remove** deletes the pack's rules and every open finding they raised. Your own
rules are not touched.

## What you can change on a pack rule

Pack rules show a lock icon and the pack badge in the rule list.

- You can switch a rule on or off and change its severity. An update keeps both.
- The pattern, match kind and scope belong to the pack. To drop one rule,
  switch it off.
- Pack rules count toward the 500-rule cap. An install that would pass the cap
  is refused before anything is written, and the plan shows how many slots are
  missing.

## Firewall config drivers

- **`gaia`** runs `show configuration`. If the account lands in expert mode or
  bash, it runs `clish -c "show configuration"` instead.
- **`fortios`** runs `show`. It never sends `config`, `set`, `execute` or
  `show full-configuration`.

Both answer the `-- More --` pager with a space; that keypress is the only input
they send besides the command. Gaia `password-hash` and `expert-password-hash`
values and SNMP community names, and FortiOS `ENC` values (`psksecret` among
them) and certificate bodies (their `BEGIN` and `END` lines kept), are replaced
with `<redacted>` before the revision is hashed and stored, so a re-encrypted
secret does not create a new revision and no hash is kept. Every other line is
stored as the device printed it.

## Findings and reports

Pack findings appear in **Review → Config compliance** with the pack badge, the
rule's rationale and its references; dismiss one there with a note to
acknowledge it. Right after a pack is installed, its rules read **not
evaluated** on a device's Compliance card until the next scheduler tick's sweep
has read the device's latest stored revision (a minute at most while the
worker runs) — never *passed*. The **Config compliance** section in
**Reports** counts findings by severity, by pack and per site, and lists each
finding with its device, rule, severity, first-seen date and references; on
paper a long reference wraps inside its column.

## Local packs

Set `LANCOMPASS_COMPLIANCE_PACKS_DIR` to a directory inside the api container
(for example under `/backups`) to load your own `<key>.json` packs beside the
bundled ones. A pack that fails validation — bad JSON, an unknown field, a
pattern that does not compile, or an example that does not evaluate as
declared — is skipped whole and logged once. A local pack cannot replace a
bundled pack with the same key.
