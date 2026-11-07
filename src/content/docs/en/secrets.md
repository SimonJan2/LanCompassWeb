---
title: "Secrets at Rest"
description: "The master key that encrypts stored credentials — setup and rotation."
category: "system"
version: "0.7.0"
order: 57
---

# Secrets at Rest

Features that talk to other systems need credentials — monitoring SMTP
passwords, SNMP communities, controller API tokens, the OIDC client secret.
LanCompass stores them encrypted under **one master key**, so a database dump
or backup never yields plaintext.

## The master key

Two env vars, file wins — the same convention as `LANCOMPASS_PASSWORD_FILE`:

| Var | What |
|---|---|
| `LANCOMPASS_SECRET_KEY` | The passphrase, inline in `.env` |
| `LANCOMPASS_SECRET_KEY_FILE` | Path to a file holding the passphrase — wins when set |

Set either one in `.env`, restart `api` (and `scanner` — the worker needs it
to decrypt credentials it uses).

**Keep the key in a file** — the recommended custody. A value in `.env`
reaches the containers' environment, where anyone who can run
`docker inspect` reads it; a mounted file does not. Put the key in a file
the way `certs/` holds the HTTPS key — one line, owned by the containers'
user (uid 10001), mode 400 — mount it read-only into `api`, `scanner` and
`discovery` with a Compose override, set
`LANCOMPASS_SECRET_KEY_FILE=/run/secrets/lancompass.key`, then empty
`LANCOMPASS_SECRET_KEY` — step by step below. When the file is set but
gives the containers no key, the api says so in its log at start (the key
then falls back to the `.env` value). **Settings → General** shows a
read-only `secret_key_configured` indicator. **Settings → Account &
Security** under *Secrets at rest* also says where the key comes from, and
when the file gives none, why: not mounted, not readable, or empty. There
is no UI for entering the key — it comes from the environment only.

Under the hood the passphrase feeds `HKDF(SHA-256, salt="lancompass-secrets",
info="v1")` to derive a 32-byte data key, and each secret is sealed with
AES-256-GCM under a random nonce — stored as `v1:<base64>` text. Two
identical secrets encrypt to different blobs, and decrypting with the wrong
key fails closed.

## Step by step: keep the key in a file

Run these in the LanCompass folder — the one with `docker-compose.yml` and
`.env`. The same steps work for an offline-bundle install and a source
checkout.

**1. Find your current key.** Look at the key line in `.env`:

```sh
grep '^LANCOMPASS_SECRET_KEY=' .env
```

- **A value after the `=`:** that is your key. Keep it — the credentials
  already stored open only with it.
- **Nothing after the `=`,** and *Secrets at rest* says *not configured*:
  nothing has been encrypted yet, so you start with a new key.

**2. Write the key into a file.** With a key in `.env`, copy it:

```sh
mkdir -p secrets
sed -n 's/^LANCOMPASS_SECRET_KEY=//p' .env > secrets/lancompass.key
```

With no key yet, generate a new one:

```sh
mkdir -p secrets
head -c 48 /dev/urandom | base64 | tr -d '\n' > secrets/lancompass.key
```

The file holds one line: the key, with no quotes. Never type an example
value from a guide — the key is what protects every stored credential.

**3. Give the file to the containers' user.** The `api`, `scanner` and
`discovery` containers run as uid 10001:

```sh
sudo chown 10001:10001 secrets/lancompass.key
sudo chmod 400 secrets/lancompass.key
```

From now on only that user and root can read it (`sudo cat
secrets/lancompass.key`).

**4. Mount the file into the containers.** Compose reads a file named
`docker-compose.override.yml` next to `docker-compose.yml` by itself. If
you have none yet, create it with:

```yaml
services:
  api:
    volumes:
      - ./secrets/lancompass.key:/run/secrets/lancompass.key:ro
  scanner:
    volumes:
      - ./secrets/lancompass.key:/run/secrets/lancompass.key:ro
  discovery:
    volumes:
      - ./secrets/lancompass.key:/run/secrets/lancompass.key:ro
```

If you already have one, keep what is in it and add the `volumes:` lines
under each of the three services — a service missing from the file gets
its own entry. For example, an override that sets `extra_hosts` becomes:

```yaml
services:
  api:
    extra_hosts:
      - "dc.example.lan:192.168.1.20"
    volumes:
      - ./secrets/lancompass.key:/run/secrets/lancompass.key:ro
  scanner:
    extra_hosts:
      - "dc.example.lan:192.168.1.20"
    volumes:
      - ./secrets/lancompass.key:/run/secrets/lancompass.key:ro
  discovery:
    volumes:
      - ./secrets/lancompass.key:/run/secrets/lancompass.key:ro
```

These `volumes:` add to the ones in `docker-compose.yml` (such as
`./backups`); they do not replace them. With HTTPS on, `.env` has a
`COMPOSE_FILE=` line and Compose reads only the files it names: add
`:docker-compose.override.yml` to the end of that line.

**5. Point `.env` at the file — last.** Step 2 copies the key out of
`.env`, so change these two lines only now:

```sh
LANCOMPASS_SECRET_KEY=
LANCOMPASS_SECRET_KEY_FILE=/run/secrets/lancompass.key
```

**6. Restart.**

```sh
docker compose up -d
```

**7. Check.**

```sh
docker compose logs api | grep SECRET_KEY_FILE
```

No output means every container read the file. **Settings → Account &
Security** → *Secrets at rest* shows the master key as *configured*, read
from the key file `/run/secrets/lancompass.key`.

**8. Keep a copy off this machine** — in your password manager, apart
from the backups. Without the key, a restored backup's credentials cannot
be opened. In a source checkout `secrets/` is already in `.gitignore`, so
the key is never committed.

### When Settings shows a problem

| *Secrets at rest* says | Cause | Fix |
|---|---|---|
| the file is not inside the containers | the mount is missing, or the containers were not recreated | step 4, then step 6 |
| the containers' user cannot read it | the file is not owned by uid 10001 | step 3 |
| the file is empty | step 2 wrote nothing (often: `.env` was emptied first) | step 1 and 2 again, then step 3 |
| neither variable is set | `.env` has no key and no file | the whole guide, with a new key |

In the first three cases the key falls back to `LANCOMPASS_SECRET_KEY`:
if that line still holds the key, nothing stops working while you fix it.

## Rotating the key

Rotation re-wraps every stored credential from the old key to the new one,
so nothing has to be re-entered:

```sh
docker compose stop api scanner discovery
docker compose run --rm --no-deps --user "$(id -u):$(id -g)" -v "$PWD/keys:/keys:ro" api \
  python -m app.cli secrets rotate --old-key-file /keys/old.key --new-key-file /keys/new.key
```

- It counts first — per encrypted column: how many to re-wrap, how many
  are already under the new key, how many open under neither — and
  `--dry-run` stops there.
- It then rewrites one table at a time, each in one transaction, and
  writes one `secrets.rotate` audit row with the counts (never a value).
  A credential the old key cannot open is listed by table and row and
  left as it is — it was unreadable before the rotation too.
- Run it again after an interruption: it skips what is already done. It
  refuses when the old key opens none of the stored credentials (the
  wrong old key).
- Then put the new key where the install reads it (the key file, or
  `LANCOMPASS_SECRET_KEY`) and start the stack (`docker compose up -d`).

**Changing the key any other way invalidates every stored credential** —
decryption fails and the values must be re-entered. The status indicator
only tells you a key is *set*, not that it's the right one — keep the
passphrase in your password manager. Rehearse a rotation on a test copy
before you need one.

## What features store

The convention every credential feature follows:

- A secret field is a `<name>_enc` column holding the `v1:…` blob.
- API responses never carry the blob or the plaintext — they report
  `<name>_set: true/false` and the `updated_at` timestamp.
- Editing a secret writes the encrypted column; a separate *test* action
  proves the stored secret actually works server-side.

Without a configured key, credential endpoints answer a clean
`503 — set LANCOMPASS_SECRET_KEY` rather than an error trace.
