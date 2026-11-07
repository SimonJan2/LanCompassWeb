---
title: "Warm standby"
description: "An opt-in PostgreSQL streaming replica, monitoring and manual failover."
category: "system"
version: "0.7.0"
order: 64
---

# Warm standby

A second host can keep a streaming PostgreSQL 16 replica. This is **manual
promotion**, not automatic failover or a cluster. Ordinary installations do
not change: the primary overlay is opt-in and monitoring defaults off.
The offline bundle includes `docker-compose.primary.yml`, `deploy/standby/`
and the complete English/Hebrew runbooks in that directory.

## Set up and verify

Follow `deploy/standby/RUNBOOK.md` (Hebrew: `RUNBOOK.he.md`). Provision a strong
replication password through `LANCOMPASS_REPLICATION_PASSWORD` or `_FILE`,
choose a dedicated interface for `LANCOMPASS_REPLICATION_BIND`, and use the
**same resolved `LANCOMPASS_SECRET_KEY`** on both hosts. Copy database
credentials, image versions, scanner exclusions and host-side auth/configuration
separately. Replication is password-authenticated but **not encrypted**:
use a dedicated VLAN or a tunnel, and narrow `pg_hba.conf` to the standby.

On the primary, include the overlay:

```sh
docker compose -f docker-compose.yml -f docker-compose.primary.yml up -d
docker compose -f docker-compose.yml -f docker-compose.primary.yml exec -T api \
  python -m app.cli standby enable-primary
docker compose -f docker-compose.yml -f docker-compose.primary.yml exec -T api \
  python -m app.cli standby status
```

On the second host, from `deploy/standby/`, configure `LANCOMPASS_PRIMARY_HOST`
and start `docker compose up -d`. Only the replica starts. The empty volume
is initialized by a base backup; a valid existing volume is reused.

```sh
docker compose --profile failover run --rm --no-deps api \
  python -m app.cli standby status
```

Check both roles, streaming, the active `lancompass_standby` slot, retained
WAL against its cap (default 8GB), replay lag and credential decryption.
`mismatch` exits 1; correct the local master key. `no credentials` means
there is no stored encrypted credential to sample. The check is read-only
and never displays credential values.

## Monitor

In Settings → Backup, enable **Expect a standby** and choose the replay lag
threshold (30–86400 seconds, default 300). The primary worker checks each
minute. Route `standby.*` through a notification channel. Disconnection,
high lag and retained WAL above 75% of the cap notify only on transitions;
recovery notifies once all conditions clear. The card refreshes each minute.
An idle, caught-up replica reports zero lag. Unknown lag is not zero.

A completely down primary cannot send its own notifications. Use external
host monitoring. Disabling expectation does not stop replication or remove
its WAL-retaining slot.

## Fail over and fail back

Stop the old stack **including its scanner first** if it is reachable. If
not, a person must keep it isolated/fenced so it cannot restart and scan or
accept writes. Never run both scanners. Check replay and decryption, then:

```sh
docker compose --profile failover run --rm --no-deps api \
  python -m app.cli standby promote
docker compose --profile failover up -d
```

The promotion CLI refuses a primary and never starts containers itself.
The separate profile starts Redis, API, scanner and web. Redirect users and
verify sign-in, a stored credential and a normal write.

Asynchronous replication can lose writes not yet replayed. Redis sessions
and queued jobs are not replicated: users sign in again, queued/manual jobs
need review, and scheduled jobs resume with possible repeats. Host-side files
need separate recovery. Keep primary backups.

Fail back by rebuilding the old host into a **new empty standby volume**,
replicating from the promoted host. Preserve the old volume for investigation;
never restart it as a second primary or merge divergent writes. A later
planned switchover uses the same manual procedure. The runbook describes
exposing the promoted kit's replication port securely.

If a standby is permanently gone, stop it, then use
`standby drop-slot --yes-drop-slot` on the primary to release retained WAL.
The flag is mandatory and an active slot is refused. Disable expectation
if no replacement is planned. An invalidated slot requires a new base backup.
