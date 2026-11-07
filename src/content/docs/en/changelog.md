---
title: "Changelog"
description: "Every create/update/delete with actor, timestamp, and field diffs."
category: "operations"
version: "0.7.0"
order: 39
---

# Changelog

Every create, update, and delete is recorded with **actor, timestamp, and
field-level before/after diffs**. Nothing changes silently.

## The global log

`/changelog` lists every change in the system, newest first:

| Column | Meaning |
|---|---|
| **Timestamp** | When it happened |
| **Actor** | Who did it (username, or the worker for scan-driven changes) |
| **Action** | `create` / `update` / `delete` |
| **Object** | Type + a readable repr (`Tag "core"`, `10.0.0.5`…) |
| **Changes** | Per-field before → after |

The type column and its filter name each object in your language
("Compliance rule", never `ComplianceRule`), and a change names its field
with a label ("Site" for `site_id`); a field without a label shows its
column name in code type. The exports keep the stored names.

Bulk operations write one entry per affected row — a 50-address bulk delete
produces 50 traceable entries, not one opaque event.

**From** and **To** above the list narrow it to a date range — calendar
days in the install's display time zone, both included — and **Export**
writes that range (its file name carries `-<from>_<to>`), so an auditor's
quarter is one filter and one export. The range lives in the page's
address (`/changelog?since=2026-07-01&until=2026-09-30`); a report for a
period links here with its own days.

## Exporting the trail

The **Export** menu on `/changelog` downloads **the whole audit trail**
that matches the page's active filters, oldest first and the newest change
last, however many rows it holds. The same URL also serves scripts and
tokens:

```
GET /api/v1/changelog/export?format=csv|jsonl
    &object_type=<t[,t…]>&object_id=<id>&action=<a[,a…]>&actor=<a[,a…]>
    &q=<text>&since=<iso>&until=<iso>&after_id=<id>&limit=<n>&all=true
```

- **`all=true`** — what the Export menu asks: every matching row in one
  file, read 50,000 at a time on the server (`limit` does not apply).
  Without it the export answers in pages, as below.

- **CSV** — `ts,actor,action,object_type,object_id,object_repr,changes`
  (changes as a JSON string; UTF-8 BOM so Excel renders Hebrew reprs).
- **JSONL** — one JSON object per line with the same fields.
- Filters mirror the list endpoint: comma-separated sets for
  `object_type`/`action`/`actor` (a value that contains a comma can be
  RFC-4180-quoted as `"doe,john"`), `q` as a literal substring on
  repr/type/actor — never a wildcard — and `since`/`until` bounding the
  timestamp (naive values read as UTC).
- Spreadsheet-safe: a cell whose value would parse as a formula
  (`=`, `+`, `-`, `@`) is exported disarmed with a leading `'`.
- Without `all=true`, rows stream oldest-first by `id`, capped at
  **50,000 per request** — a full page returns an `X-Next-Cursor` header
  and `X-Truncated: true`; continue with `?after_id=<that id>`. It is a
  cursor, never an OFFSET into a live table, so the export can't skip or
  repeat under concurrent writes.
- Requires `data:read` — an API token with `data:read` can pull the
  feed directly; nothing else about auth changes.
- Rows whose diffs name a sensitive-looking field are exported with the
  payload withheld as `[redacted]` — a raw-inserted row can't smuggle a
  secret out through the export.

## The trail as a syslog feed

A syslog notification channel flagged **Forward audit trail** streams
every new changelog row to its collector as an `AUDIT` line — the same
trail, as a live feed a SIEM can subscribe to. See
[Monitoring → audit forward](/docs/monitoring/#audit-forward).

## Per-object history

The same data scoped to one object:

- **History button** in row actions on entity lists.
- **IP drawer** — an address's own audit trail alongside its fields.

## Coverage

Changelog captures UI edits, API writes, bulk actions, deletes that cascade
to tag assignments, settings overrides, and scanner-driven status changes
(active ↔ offline, discovery confirms).

## Retention

Admins can purge the log from **Settings → Data & Maintenance** — itself a
logged action.
