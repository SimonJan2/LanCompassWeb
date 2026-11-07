---
title: "Omada"
description: "Read-only Omada SDN discovery — OpenAPI client-credentials auth, per-site scope, devices, LAN networks, clients."
category: "integrations"
version: "0.7.0"
order: 50
---

# Omada

Omada SDN speaks its **OpenAPI** surface: a client-credentials token
handshake, then `GET` reads only.

    GET  /api/info                              -> omadacId (no auth)
    POST /openapi/authorize/token               -> accessToken (~2 h TTL)
    GET  /openapi/v1/{omadacId}/sites
    GET  /openapi/v1/{omadacId}/sites/{id}/devices
    GET  /openapi/v1/{omadacId}/sites/{id}/clients
    GET  /openapi/v1/{omadacId}/sites/{id}/networks/lan-networks

The token `POST` is the auth-handshake exception — the only path this
connector can ever POST to (enforced in code, same discipline as
vCenter's session call). Every read afterwards is a v1 `GET` carrying
`Authorization: AccessToken=<token>`.

## Read-only role

*Community tier — kept working, no new reads; not checked against a device (its software needs an EULA the lab does not accept).*

1. Omada controller → *Global View* → *Settings* → *Platform Integration* → *Open API* → *Add New App*, mode *Client*.
2. Give the app the **Viewer** role and the sites to read; copy its client ID and secret.
3. Enter the client ID and secret as the source's credentials.

**What LanCompass reads:** `api/info`, the OpenAPI token grant (the one POST, a sign-in), the sites and each site's devices and clients — GET otherwise.

## Before you start

- **Omada controller 5.x** (software, hardware OC200/OC300, or cloud) —
  the OpenAPI surface needs ≥5.0; see *Caveats* on the 6.2 churn.
- **TCP/8043 reach** (or your controller's HTTPS port) from LanCompass.
- **About ten minutes** to create the OpenAPI application.

## Step 1 — Create an OpenAPI application

1. Omada controller → **Settings → Platform Integration → OpenAPI →
   New Application**.
2. Name it `lancompass`, grant **read** rights only, and pick the sites the
   app may see — that mapping *is* your first scope boundary.
3. Copy the **Client ID** and **Client Secret** — the source's two
   credential fields.

## Step 2 — Add the source

Settings → Integrations → **New source** → kind **Omada**, base URL
`https://<controller>:8043`, client + secret, **Test & discover**. The
scope label reads **Sites** — tick sites to read; empty = all the app
can reach.

## What it imports

| Omada data                                     | LanCompass object                       |
| ---------------------------------------------- | ------------------------------------ |
| Sites                                          | The scope vocabulary (not imported)  |
| LAN networks (VLAN + subnet + gateway)         | VLANs + Subnets                      |
| DHCP ranges                                    | IP ranges                            |
| Devices (APs, switches, gateways)              | Devices — APs land in `family=wifi`  |
| Clients                                        | Addresses (`source=integration`)     |

## Caveats

- **Version churn is real**: controller 6.2 moved clients behind a
  POST-paged v2 surface. This connector stays on the v1 GETs and reports
  a section error naming the endpoint when they fail — the sync still
  lands everything else. If you see `clients:<site>: not found`, that's
  the 6.2 v2 cliff, not a credential problem.
- **Token TTL**: the ~2-hour accessToken is cached per sync — nothing to
  babysit; a stale token just re-handshakes.
- **Sites are the only scope** — Omada doesn't expose interface-level
  filtering on this surface; narrower reads come from the app's site
  grant in step 1.

## What each message means

| Message | What it means → what to do |
|---|---|
| *…: not found — controller may be on a version without this v1 surface* | the controller predates the OpenAPI v1 → update it |
| *token grant returned no accessToken* | the client ID or secret is wrong → copy them again |
| *…: request timed out* | the controller does not answer from LanCompass → check the route |
