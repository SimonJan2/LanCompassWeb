---
title: "UniFi"
description: "Read-only UniFi Network discovery via the official Integration API — console API key, per-site scope, devices, clients, networks."
category: "integrations"
version: "0.7.0"
order: 49
---

# UniFi

UniFi speaks through the **official Integration API** — the stateless,
OpenAPI-published surface UniFi OS consoles (UDM/UXG/UCG/UNAS…) and
UniFi OS Server share:

    GET {base}/proxy/network/integration/v1/info
    GET {base}/proxy/network/integration/v1/sites
    GET {base}/proxy/network/integration/v1/sites/{id}/networks
    GET {base}/proxy/network/integration/v1/sites/{id}/devices
    GET {base}/proxy/network/integration/v1/sites/{id}/clients

Every read is a `GET` with an `X-API-KEY` header — the cleanest shape in
the wave. Sites are the scope noun: the scope tick-list shows the sites
the console reports.

## Read-only role

*Community tier — kept working, no new reads; not checked against a device (its software needs an EULA the lab does not accept).*

1. The UniFi console → *Settings* → *Control Plane* → *Integrations* → create an API key.
2. Paste the key as the source's key: the Integration API is read-only GET by its own design.

**What LanCompass reads:** `info`, the sites, and each site's devices and clients — GET only.

## Before you start

- **A UniFi OS console** (Dream Machine / Cloud Gateway / UNVR / UniFi OS
  Server) running a recent UniFi Network application — the Integration
  API arrived with Network 8.6-era builds; update the application if
  `/integration/v1/info` doesn't answer.
- **TCP/443 reach** from the LanCompass host to the console.
- **About five minutes** in the console UI.

## Step 1 — Mint an API key

1. UniFi console → **Settings → System → Integrations** (newer builds:
   **Control Plane → Integrations → API**).
2. **Create API key**, name it e.g. `lancompass`, keep the role read-capable
   (the API keys are console-scoped; there is no write path to restrict —
   the connector simply never issues a non-GET).
3. Copy the key into the source's **API key** field — it's shown once.

## Step 2 — Add the source

Settings → Integrations → **New source** → kind **UniFi**, base URL
`https://<console>`, the key, **Test & discover**. The scope label reads
**Sites** — tick sites to read; an empty list reads them all.

## What it imports

| UniFi data                                     | LanCompass object                       |
| ---------------------------------------------- | ------------------------------------ |
| Sites                                          | The scope vocabulary (not imported)  |
| Network definitions (VLAN + `ipSubnet`)        | VLANs + Subnets (the SVI as gateway) |
| DHCP pool ranges                               | IP ranges                            |
| Devices (APs, switches, gateways)              | Devices — APs land in `family=wifi`  |
| Clients                                        | Addresses (`source=integration`)     |

## Caveats

- **The legacy self-hosted API** (`/api/s/{site}/stat/sta` on :8443,
  cookie+CSRF) is *not* this connector — the Integration API doesn't
  cover it. If your controller predates the Integration API, this source
  won't answer; the fix is upgrading, not a different credential.
- **Site-Manager cloud proxy** (`api.ui.com`) is documented here and
  deliberately not built: it would send your API key off-box and its
  reach guarantees differ. Point the source at the console itself.
- **Client rows are the controller's view** — a powered-off client
  vanishes between polls; plan diffs reflect that honestly.

## What each message means

| Message | What it means → what to do |
|---|---|
| *…: authentication failed (401)* | the API key is wrong or was removed → create a new one |
| *…: not found* | the console does not offer the Integration API → update UniFi Network |
| *…: request timed out* | the console does not answer from LanCompass → check the route |
