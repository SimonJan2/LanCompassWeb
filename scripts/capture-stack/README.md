# The capture stack

Product pictures on this site come from the **signed release bundle**, run on a throwaway
Compose project of their own, `lcweb-cap`, beside whatever else runs on the host (W3). Nothing
here touches another LanCompass: one project name, loopback ports, its own bridge, scans limited
to that bridge, and every Compose call through `dc.sh`, which refuses any other project.

| File           | What it does                                                                                                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dc.sh`        | The only way to run `docker compose` for the stack: project `lcweb-cap`, the bundle's `docker-compose.yml` plus `override.yml`, the env file. Any other project name exits 2 before Docker is called.                                                               |
| `override.yml` | Rebinds Postgres, Redis and the web tier to loopback ports, gives the stack its own bridge and the web tier's pinned address on it, points the host-network workers at the loopback ports, keeps scans on the stack's bridge, and puts backups in a scratch folder. |
| `make-env.mjs` | Writes `<folder>/lcweb-cap.env` (mode 600) with generated secrets and the capture's sign-in, and `<folder>/backups`.                                                                                                                                                |
| `api.mjs`      | Setup, sign-in, the demo estate, an account language, the ids the capture needs, and the staged writes. Talks only to the stack's API port.                                                                                                                         |

Node 18 or newer and Docker with Compose v2 on the host; no dependency. The ports and bridge:

| Set             | Web  | API  | Postgres | Redis | Bridge                     |
| --------------- | ---- | ---- | -------- | ----- | -------------------------- |
| 1 (default)     | 4186 | 4187 | 4188     | 4189  | `10.240.181.0/24` `lcweb0` |
| 2 (`--ports 2`) | 4196 | 4197 | 4198     | 4199  | `10.240.182.0/24` `lcweb1` |

Every port is bound to `127.0.0.1`. Check them free first (`ss -ltn`, and the subnets in
`docker network ls`), and take set 2 when set 1 is in use.

## Re-capture at a release

Use a scratch folder outside the repository (`$S` below) and the new bundle in
`LanCompass/dist/`. Replace `0.7.0` with the release.

1. **Check the bundle**, in place, before anything is loaded. Stop on any failure.

   ```sh
   cd /home/simonj/Documents/github/LanCompass/dist
   sha256sum -c lancompass-0.7.0-offline.tar.gz.sha256          # must end in OK
   mkdir -p "$S/bundle" && tar -xzf lancompass-0.7.0-offline.tar.gz -C "$S/bundle"
   cd "$S/bundle/lancompass-0.7.0-offline"
   sha256sum -c SHA256SUMS                                        # every line OK
   openssl pkeyutl -verify -pubin -inkey lancompass-release.pub -rawin -in SHA256SUMS -sigfile SHA256SUMS.sig
   openssl pkey -pubin -in lancompass-release.pub -outform DER | sha256sum
   ```

   The last line must equal the release key's fingerprint in `INSTALL.md` §1 at the release
   tag (`git -C …/LanCompass show v0.7.0:scripts/release/INSTALL.md`), colons removed.

2. **Load the images and start the stack.** Record `docker image ls` first: teardown removes
   only the tags the load added.

   ```sh
   docker load -i "$S/bundle/lancompass-0.7.0-offline/images.tar.gz"
   node scripts/capture-stack/make-env.mjs "$S/stack"
   export BUNDLE="$S/bundle/lancompass-0.7.0-offline" ENV_FILE="$S/stack/lcweb-cap.env"
   sh scripts/capture-stack/dc.sh lcweb-cap up -d --no-build --wait
   ```

3. **The admin, the demo estate and the first tick** (load the demo on the capture day: its
   lines' ages count from the load).

   ```sh
   node scripts/capture-stack/api.mjs "$ENV_FILE" setup
   node scripts/capture-stack/api.mjs "$ENV_FILE" demo load
   node scripts/capture-stack/api.mjs "$ENV_FILE" wait-tick
   node scripts/capture-stack/api.mjs "$ENV_FILE" ids "$S/stack/ids.json"
   node scripts/capture-stack/api.mjs "$ENV_FILE" stage "$S/stack/ids.json" "$S/stack/staged.json"
   ```

4. **Capture** in the Playwright container (README → Screenshots), with
   `LANCOMPASS_DEMO_URL`, `LANCOMPASS_DEMO_USER` and `LANCOMPASS_DEMO_PASS` from the env file
   passed to the container for that run only, never written down. `--check` first.

5. **Tear down** and prove it:

   ```sh
   sh scripts/capture-stack/dc.sh lcweb-cap down -v
   docker compose ls; docker volume ls; docker network ls; docker image ls
   ```

   Remove every image tag the load added (none when the host already had the release's images
   under the same ids), then the scratch folder: the env file holds the generated secrets.
