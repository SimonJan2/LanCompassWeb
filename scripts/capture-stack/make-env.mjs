#!/usr/bin/env node
/**
 * Writes the capture stack's env file (W3): <folder>/lcweb-cap.env, mode 600, with generated
 * secrets, and <folder>/backups for the stack's backups. Node 18 or newer, no dependency.
 *
 *   node scripts/capture-stack/make-env.mjs <folder> [--ports 2]
 *
 * Ports set 1 (default): web 4186, API 4187, Postgres 4188, Redis 4189, bridge
 * 10.240.181.0/24 named lcweb0, web at .10. Set 2 (when those are taken): 4196–4199,
 * 10.240.182.0/24, lcweb1. The admin's password (LANCOMPASS_DEMO_PASS) lives only in this file
 * and in the capture's environment; nothing here prints it. An existing file is never
 * overwritten.
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const folder = args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a));
if (!folder) {
  console.error("usage: make-env.mjs <folder> [--ports 2]");
  process.exit(2);
}
const which = args.includes("--ports") ? Number(args[args.indexOf("--ports") + 1]) : 1;
const sets = {
  1: { web: 4186, api: 4187, db: 4188, redis: 4189, net: "10.240.181", bridge: "lcweb0" },
  2: { web: 4196, api: 4197, db: 4198, redis: 4199, net: "10.240.182", bridge: "lcweb1" },
};
const s = sets[which];
if (!s) {
  console.error(`make-env: unknown ports set ${which} (1 or 2)`);
  process.exit(2);
}
const dir = resolve(folder);
const file = join(dir, "lcweb-cap.env");
if (existsSync(file)) {
  console.error(`make-env: ${file} exists; remove it first to make a new one`);
  process.exit(1);
}
mkdirSync(join(dir, "backups"), { recursive: true });
// The api, scanner and discovery containers run as uid 10001 (SECURITY.md): the scratch
// backups folder must be writable by them without root on the host.
chmodSync(join(dir, "backups"), 0o777);

const hex = (n) => randomBytes(n).toString("hex");
const env = {
  // The bundle's images (docker load) and the Compose project's own settings.
  LANCOMPASS_VERSION: "0.7.0",
  LANCOMPASS_IMAGE_PREFIX: "lancompass",
  LANCOMPASS_SECRET_KEY: randomBytes(48).toString("base64"),
  POSTGRES_USER: "ipam",
  POSTGRES_DB: "ipam",
  POSTGRES_PASSWORD: hex(24),
  // The admin comes from POST /api/v1/auth/setup, never from the environment.
  LANCOMPASS_PASSWORD: "",
  LANCOMPASS_ALLOW_INSECURE: "false",
  // Plain HTTP on loopback, no TLS overlay: the session cookie cannot be Secure.
  LANCOMPASS_COOKIE_SECURE: "false",
  API_BIND: "127.0.0.1",
  API_PORT: String(s.api),
  WEB_PORT: String(s.web),
  DB_PORT: String(s.db),
  REDIS_PORT: String(s.redis),
  NET_SUBNET: `${s.net}.0/24`,
  WEB_IP: `${s.net}.10`,
  BRIDGE_NAME: s.bridge,
  BACKUPS_DIR: join(dir, "backups"),
  NEXT_PUBLIC_API_URL: "",
  CORS_ORIGINS: `http://127.0.0.1:${s.web}`,
  BACKUP_INTERVAL_MINUTES: "0",
  // Scans: never on a schedule, and only ever the stack's own bridge.
  SCAN_INTERVAL_MINUTES: "0",
  SCAN_NETWORKS: `${s.net}.0/24`,
  SCAN_ONLY_CONFIGURED: "true",
  SCAN_INTERFACE: s.bridge,
  SNMP_TRAPS_ENABLED: "false",
  // The capture's sign-in (scripts/capture-screenshots.mjs, scripts/capture-stack/api.mjs).
  LANCOMPASS_DEMO_URL: `http://127.0.0.1:${s.web}`,
  LANCOMPASS_DEMO_API: `http://127.0.0.1:${s.api}`,
  LANCOMPASS_DEMO_USER: "admin",
  LANCOMPASS_DEMO_PASS: hex(16),
};
const text = Object.entries(env)
  .map(([k, v]) => `${k}=${v}`)
  .join("\n");
writeFileSync(file, `${text}\n`, { mode: 0o600 });
chmodSync(file, 0o600);
console.log(
  `make-env: wrote ${file} (mode 600): web ${s.web}, API ${s.api}, Postgres ${s.db}, Redis ${s.redis}, ${s.net}.0/24 on ${s.bridge}`,
);
console.log("FINISHED-make-env");
