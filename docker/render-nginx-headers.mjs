#!/usr/bin/env node
/**
 * Turns the built dist/_headers (the single source of the security headers,
 * already carrying the form endpoint's origin) into an nginx snippet.
 *
 * Strict-Transport-Security and the CSP's upgrade-insecure-requests only make
 * sense over HTTPS, and the container usually serves plain HTTP behind a TLS
 * proxy. They are emitted through $lc_hsts and $lc_upgrade, which the nginx
 * config sets only when the request arrived over HTTPS (directly or via
 * X-Forwarded-Proto). Usage: node render-nginx-headers.mjs dist/_headers out.conf
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , input = "dist/_headers", output = "security-headers.conf"] = process.argv;
const lines = readFileSync(input, "utf8").split("\n");

const headers = [];
let inGlobal = false;
for (const raw of lines) {
  if (raw.trim() === "" || raw.trimStart().startsWith("#")) continue;
  if (!/^\s/.test(raw)) {
    inGlobal = raw.trim() === "/*";
    continue;
  }
  if (!inGlobal) continue;
  const i = raw.indexOf(":");
  const name = raw.slice(0, i).trim();
  let value = raw.slice(i + 1).trim();
  if (name === "Strict-Transport-Security") {
    headers.push([name, "$lc_hsts"]);
    continue;
  }
  if (name === "Content-Security-Policy") {
    value = value.replace(/;\s*upgrade-insecure-requests/, "") + "$lc_upgrade";
  }
  headers.push([name, value]);
}

if (!headers.some(([n]) => n === "Content-Security-Policy")) {
  throw new Error(`${input}: no Content-Security-Policy in the /* block`);
}

const escape = (v) => v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const out = [
  "# Generated at image build from dist/_headers by docker/render-nginx-headers.mjs. Do not edit.",
  ...headers.map(([n, v]) => `add_header ${n} "${escape(v)}" always;`),
  "",
].join("\n");
writeFileSync(output, out);
console.log(`render-nginx-headers: ${headers.length} headers → ${output}`);
