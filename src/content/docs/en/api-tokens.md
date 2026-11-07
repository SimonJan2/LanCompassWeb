---
title: "API tokens"
description: "Scoped bearer tokens for scripts, connectors and CI — machine access without handing over your password."
category: "system"
keywords: ""
version: "0.7.0"
order: 60
---

# API tokens

API tokens are the machine side of authentication: long-lived bearer
credentials for scripts, the connector ecosystem and CI pipelines. They
sit next to browser sessions — both plug into the same permission model —
and local accounts stay the fallback auth.

A token is tied to your user and scoped to a subset of your permissions.
**A token can never do more than you can**: at request time its scopes are
intersected with your role's permissions, and the changelog records token
activity under the actor `token:<name>`.

## Create a token

Settings → Security → **API tokens** → *New token*. Pick a name, one or
more scopes, and an optional lifetime in days.

The token (`ipam_<43 random characters>`) is shown **once** — copy it
before closing the dialog. Only its SHA-256 hash is stored; if you lose
it, revoke and mint a new one.

| Scope | Allows |
|---|---|
| `data:read` | Reading objects — the floor every `GET` needs |
| `data:write` | Creating and updating objects |
| `data:delete` | Deleting objects |
| `backup:access` | Backup export and restore |
| `config:read` | Reading stored config text (one revision, a diff) — secrets masked |

Admin-only permissions (`users:manage`, `system:admin`) are never valid
token scopes — a machine credential cannot administer accounts.

## Use it

```bash
curl -H "Authorization: Bearer ipam_a1b2…" \
     https://ipam.example.com/api/v1/devices
```

When a request carries both a session cookie and a bearer token, **the
token wins** — a script is never shadowed by a stale browser cookie.
A token without `data:read` is refused on `GET` endpoints; a token
without `data:write` gets `403` on mutations.

Tokens cannot manage tokens: creating, listing or revoking tokens with a
bearer credential returns `403` — a leaked `data:read` token never becomes
a credential factory.

## Consuming the API

Two endpoints exist specifically for automation — both ride token scopes
with no extra auth surface.

### Dynamic inventory (Ansible)

`GET /api/v1/inventory` serves the Ansible dynamic-inventory JSON shape
straight from the device/address tables — `_meta.hostvars` keyed by
device name plus `site_*` / `type_*` / `family_*` groups under
`all.children`. It needs `data:read` only, and it never emits secrets:
hostvars carry `ansible_host`, `device_type`, `family`, `manufacturer`,
`site`, `rack` and the device id — credentials are never part of the
response, whatever the device holds.

```bash
curl -sH "Authorization: Bearer ipam_a1b2…" \
     https://ipam.example.com/api/v1/inventory | jq .
```

Hand it to Ansible with a two-line executable inventory script:

```bash
# lancompass-inventory.sh  (chmod +x, then: ansible-inventory -i lancompass-inventory.sh --list)
#!/bin/sh
curl -fsS -H "Authorization: Bearer ipam_a1b2…" \
     https://ipam.example.com/api/v1/inventory
```

Filters narrow the served set: `?site=` (site id, slug, code or name —
comma-separated works), `?type=` (exact `device_type`), `?family=`
(`network|compute|storage|wifi|power|other`), `?status=` (worst
linked-IP status: `active|reserved|dhcp|discovered|offline|unmonitored`).

Host naming notes: devices appear under their name; a name collision
keeps both hosts — the later one is suffixed `name#id`. A device with no
linked IP simply has no `ansible_host` key (never a null), so playbooks
can skip it or match on `family_*`/`site_*` membership instead.

### Inbound events

`POST /api/v1/events` records an event from *outside* the box — a CI
pipeline, another DCIM, a webhook bridge — into the changelog and fans
it out through every notification channel that listens to all events.
It needs `data:write`.

```bash
curl -X POST -H "Authorization: Bearer ipam_a1b2…" \
     -H 'content-type: application/json' \
     -d '{
       "event_type": "external.deploy.finished",
       "summary": "deploy v42 finished on web-1",
       "source_name": "ci-bot",
       "entity": {"kind": "device", "ref": "web-1"},
       "payload": {"build": 42, "result": "ok"}
     }' \
     https://ipam.example.com/api/v1/events
```

The contract:

- `event_type` must match `external.*` (lowercase, dotted) — foreign
  events stay namespaced and never collide with the internal notify
  catalog.
- `summary` ≤ 300 chars (lands as the changelog entry's title),
  `source_name` ≤ 100, `payload` ≤ 4 KB of JSON, `entity` ≤ 1 KB.
- The changelog actor names the credential — `api-token:<prefix>` — so
  the audit trail shows which token reported what.
- Rate limit: 60 events/minute per token, fixed window. Exceed it and
  you get an honest `429` with `Retry-After`.
- Re-sending safely: give the event a `dedup_key` (up to 120 chars).
  The same token sending the same key again within the dedup window
  (`event_dedup_minutes`, default 60) gets `200` with the first event's
  `id` and `"duplicate": true`, and nothing is recorded or sent again —
  so an event refused with `429`, or one whose answer never arrived, can
  simply be sent again. A repeat does not count against the rate limit.
  Without a `dedup_key`, a retry gives a second row.

External events appear in the changelog with an `event` action (filter
`?action=event`) and render through the shared
`notify.external.event` template — one keyed line, no catalog sprawl.

## Error codes

A refusal keeps its HTTP status and its English `detail` — scripts and
logs read the same text as before — and may carry a stable `code` and
its `params` beside it:

```json
{"detail": "10.99.10.0/24 already exists in this VRF (id=18, active) — a network is documented once per VRF",
 "code": "errors.prefix.exists", "params": {"cidr": "10.99.10.0/24", "id": 18}}
```

- `code` is a message key the web interface words in the reader's
  language; `params` are the values in it. Match on `code` rather than on
  the English text.
- A validation `422` keeps FastAPI's list in `detail`; each item gains
  `code` (`validation.missing`, `validation.string_too_short`,
  `validation.less_than_equal`, … or the field's own, such as
  `errors.cidr.invalid`) and `params` (`field`, and the limit or value).
- Codes in use: `errors.permission.<permission>` (`403`, e.g.
  `errors.permission.dataWrite`), `errors.auth.required` (`401`),
  `errors.notFound` (`404`, with `entity` and `id`), `errors.prefix.exists`,
  `errors.address.taken`, `errors.address.outside`, `errors.site.exists`,
  `errors.cidr.invalid`, `errors.ip.invalid`, `errors.mac.invalid`,
  `upload.undecodable` (`422`, with `row`). The address "taken" answer
  keeps its older `code: "taken"`.
- An answer without `code` is unchanged: read its `detail`.

## Revoke

Settings → Security → API tokens → revoke. The row is kept for audit —
`revoked_at` is set and the token dies immediately. `last_used_at` stamps
at most once a minute, so a request storm is not a write storm.

Administrators see every user's tokens under Settings → Users (key icon)
and can revoke them — the secret itself is unrecoverable by design, so
there is nothing else to show.
