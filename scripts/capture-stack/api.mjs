#!/usr/bin/env node
/**
 * The capture stack's API client (W3): first-run setup, sign-in, the demo estate, an account
 * language, the ids the capture needs, and the few writes a frame needs and the demo lacks.
 * Node 18 or newer (global fetch), no dependency, runs on the host. It reads the stack's env
 * file (make-env.mjs) and talks only to that file's API port on 127.0.0.1 (4187 or 4197); any
 * other address is refused, so it can never reach another LanCompass. It never prints a
 * password.
 *
 *   node scripts/capture-stack/api.mjs <env-file> <command> [arguments]
 *
 *   setup                    POST /auth/setup: the admin, the generated password, language en
 *                            (that sets only the install's default language)
 *   check                    sign in and print who
 *   demo load|status|purge   the demo estate (load it on the capture day: its ages count from
 *                            the load)
 *   liveness                 the scheduler's last tick
 *   wait-tick [seconds]      wait until the scheduler has ticked (default 240 s)
 *   language en|he|null      the signed-in account's own language (null clears it)
 *   ids <out.json>           look up the ids the capture's routes need, write them as JSON
 *   stage <ids.json> <out.json>
 *                            the staged writes: on each of the two demo designs one comment
 *                            pinned to an object with one reply, and one signed version;
 *                            each write is recorded in <out.json>
 *   get <path>               GET an API path and print the JSON (for looking around)
 */
import { readFileSync, writeFileSync } from "node:fs";

const [envFile, command, ...rest] = process.argv.slice(2);
if (!envFile || !command) {
  console.error("usage: api.mjs <env-file> <command> [arguments] (see the header)");
  process.exit(2);
}
const env = Object.fromEntries(
  readFileSync(envFile, "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const port = Number(env.API_PORT);
if (![4187, 4197].includes(port)) {
  console.error(`api: refusing API port ${env.API_PORT} (only the capture stack's 4187 or 4197)`);
  process.exit(2);
}
const base = `http://127.0.0.1:${port}/api/v1`;
const user = env.LANCOMPASS_DEMO_USER;
const pass = env.LANCOMPASS_DEMO_PASS;
let cookie = "";

async function call(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const set = res.headers.get("set-cookie");
  if (set) {
    const pairs = set
      .split(/,(?=\s*[\w.-]+=)/)
      .map((c) => c.split(";")[0].trim())
      .filter(Boolean);
    const jar = new Map(
      cookie
        .split("; ")
        .filter(Boolean)
        .map((c) => [c.split("=")[0], c]),
    );
    for (const p of pairs) jar.set(p.split("=")[0], p);
    cookie = [...jar.values()].join("; ");
  }
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

async function login() {
  await call("POST", "/auth/login", { username: user, password: pass });
}

const list = (x) => (Array.isArray(x) ? x : (x?.items ?? x?.results ?? x?.rows ?? []));
const named = (rows, name) => list(rows).find((r) => r.name === name || r.title === name);

async function ids(out) {
  await login();
  const sites = await call("GET", "/sites");
  // The demo's HQ is named in both languages ("מטה דמו — Demo HQ").
  const hq = list(sites).find((s) => String(s.name).includes("Demo HQ"));
  const racks = await call("GET", "/racks");
  const rack = named(racks, "DC-A01");
  const prefixes = await call("GET", "/prefixes");
  const cidr = "10.130.100.0/24";
  const prefix = list(prefixes).find((p) =>
    [p.cidr, p.prefix, p.network].some((v) => String(v) === cidr),
  );
  const diagrams = await call("GET", "/diagrams");
  const en = named(diagrams, "Branch refresh");
  const he = named(diagrams, "תכנון DMZ חדש");
  const found = {
    site: hq ? { id: hq.id, name: hq.name } : null,
    rack: rack ? { id: rack.id, name: rack.name } : null,
    prefix: prefix ? { id: prefix.id, cidr } : null,
    designs: {
      en: en ? { id: en.id, name: en.name } : null,
      he: he ? { id: he.id, name: he.name } : null,
    },
  };
  const missing = [];
  if (!found.site) missing.push(`site Demo HQ (sites: ${list(sites).length})`);
  if (!found.rack) missing.push(`rack DC-A01 (racks: ${list(racks).length})`);
  if (!found.prefix)
    missing.push(
      `prefix ${cidr} (prefixes: ${list(prefixes).length}; keys ${Object.keys(list(prefixes)[0] ?? {}).join(",")})`,
    );
  if (!en) missing.push("design Branch refresh");
  if (!he) missing.push("design תכנון DMZ חדש");
  writeFileSync(out, `${JSON.stringify(found, null, 2)}\n`);
  console.log(JSON.stringify(found));
  if (missing.length) console.log(`ids: missing ${missing.join("; ")}`);
  console.log("FINISHED-ids");
}

/** The object of a design to pin the comment to: its switch (the comment is about one), else
 *  a device, else any object. A design's objects are payload.design.objects at v0.7.0. */
function firstObject(diagram) {
  const design = diagram.payload?.design ?? diagram.payload ?? {};
  const nodes = design.objects ?? design.nodes ?? [];
  const kind = (n) => String(n.type ?? n.kind ?? "");
  const pick =
    nodes.find((n) => /switch/i.test(kind(n)) || /-sw(\b|-)/.test(String(n.id))) ??
    nodes.find((n) => kind(n) === "device") ??
    nodes.find((n) => !["zone", "frame", "text", "note"].includes(kind(n))) ??
    nodes[0];
  // A comment's place is design coordinates even when it is pinned to an object: its top right.
  return pick
    ? {
        id: String(pick.id),
        label: pick.props?.label ?? pick.label ?? pick.name ?? "",
        x: Number(pick.x ?? 0) + Number(pick.w ?? 0),
        y: Number(pick.y ?? 0),
      }
    : null;
}

const STAGED = {
  en: {
    comment: "Check the uplink speed on this switch before the cut-over.",
    reply: "Confirmed: 10G on both ends.",
    version: "Reviewed for the branch cut-over",
  },
  he: {
    comment: "לבדוק את מהירות הקישור במתג הזה לפני ההעברה.",
    reply: "נבדק: 10G בשני הקצוות.",
    version: "נבדק לפני ההעברה",
  },
};

async function stage(idsFile, out) {
  await login();
  const found = JSON.parse(readFileSync(idsFile, "utf8"));
  const record = [];
  for (const lang of ["en", "he"]) {
    const design = found.designs?.[lang];
    if (!design) {
      record.push({ lang, skipped: "design not found" });
      continue;
    }
    const d = await call("GET", `/diagrams/${design.id}`);
    const object = firstObject(d);
    const text = STAGED[lang];
    const existing = list(await call("GET", `/diagrams/${design.id}/comments`));
    let thread = existing.find((c) => c.body === text.comment && !c.parent_id);
    // A thread this kit pinned to a bare point (before it found the design's objects) is
    // removed and pinned again to the object; replies go with their thread.
    if (thread && object && thread.anchor !== "object") {
      await call("DELETE", `/diagrams/${design.id}/comments/${thread.id}`);
      record.push({ lang, removed_comment: thread.id, reason: "re-pinned to an object" });
      thread = undefined;
    }
    if (!thread)
      thread = await call("POST", `/diagrams/${design.id}/comments`, {
        body: text.comment,
        ...(object
          ? { anchor: "object", anchor_id: object.id, x: object.x, y: object.y }
          : { anchor: "point", x: 0, y: 0 }),
      });
    const replies = existing.filter((c) => c.parent_id === thread.id && c.body === text.reply);
    const reply =
      replies[0] ??
      (await call("POST", `/diagrams/${design.id}/comments`, {
        body: text.reply,
        parent_id: thread.id,
      }));
    const versions = list(await call("GET", `/diagrams/${design.id}/versions`));
    let version = versions.find((v) => v.name === text.version);
    if (!version)
      version = await call("POST", `/diagrams/${design.id}/versions`, { name: text.version });
    const signed = await call("POST", `/diagrams/${design.id}/versions/${version.id}/sign`);
    record.push({
      lang,
      design: design.name,
      design_id: design.id,
      comment: {
        id: thread.id,
        on: object ? `object ${object.id} ${object.label}` : "a point",
        body: text.comment,
      },
      reply: { id: reply.id, body: text.reply },
      version: { id: version.id, name: text.version, signed_at: signed.signed_at ?? null },
    });
  }
  writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify(record));
  console.log("FINISHED-stage");
}

async function waitTick(seconds) {
  await login();
  const until = Date.now() + seconds * 1000;
  for (;;) {
    const l = await call("GET", "/system/liveness");
    if (l.stopped === false) {
      console.log(`tick: scheduler running, last tick ${l.last_tick_at} (${l.tick_age_s} s ago)`);
      console.log("FINISHED-wait-tick");
      return;
    }
    if (Date.now() > until) {
      console.log(`tick: still stopped after ${seconds} s: ${JSON.stringify(l)}`);
      process.exit(1);
    }
    await new Promise((ok) => setTimeout(ok, 5000));
  }
}

try {
  if (command === "setup") {
    try {
      await call("POST", "/auth/setup", { username: user, password: pass, language: "en" });
      console.log("setup: admin created (install default language en)");
    } catch (e) {
      if (e.status !== 409) throw e;
      console.log("setup: already set up (409); signing in instead");
    }
    await login();
    console.log("FINISHED-setup");
  } else if (command === "check") {
    await login();
    const me = await call("GET", "/auth/status");
    console.log(`check: signed in as ${me?.username ?? me?.user?.username ?? "?"}`);
  } else if (command === "demo") {
    await login();
    const op = rest[0];
    const res =
      op === "load"
        ? await call("POST", "/demo-estate")
        : op === "purge"
          ? await call("DELETE", "/demo-estate")
          : await call("GET", "/demo-estate");
    console.log(`demo ${op}: ${JSON.stringify(res).slice(0, 400)}`);
    console.log(`FINISHED-demo-${op}`);
  } else if (command === "liveness") {
    await login();
    console.log(JSON.stringify(await call("GET", "/system/liveness")));
  } else if (command === "wait-tick") {
    await waitTick(Number(rest[0] ?? 240));
  } else if (command === "language") {
    await login();
    const code = rest[0] === "null" ? null : rest[0];
    console.log(
      `language: ${JSON.stringify(await call("PUT", "/auth/me/language", { language: code }))}`,
    );
  } else if (command === "ids") {
    await ids(rest[0] ?? "ids.json");
  } else if (command === "stage") {
    await stage(rest[0] ?? "ids.json", rest[1] ?? "staged.json");
  } else if (command === "find-ask") {
    // An address "where is …" places on a switch port (for the ask-the-map frame).
    await login();
    const all = list(await call("GET", "/addresses?limit=2000"));
    const order = [...all].sort(
      (a, b) => Number(b.connected_interface_id != null) - Number(a.connected_interface_id != null),
    );
    let found = null;
    let tried = 0;
    for (const a of order) {
      if (!a.address || tried >= 300) break;
      tried += 1;
      const hit = list(await call("GET", `/topology/where?q=${encodeURIComponent(a.address)}`))[0];
      if (hit?.port_name && hit?.switch_name) {
        found = {
          address: a.address,
          switch: hit.switch_name,
          port: hit.port_name,
          seen_at: hit.seen_at,
        };
        break;
      }
    }
    console.log(`find-ask: tried ${tried} of ${all.length}: ${JSON.stringify(found)}`);
  } else if (command === "get") {
    await login();
    console.log(JSON.stringify(await call("GET", rest[0]), null, 1).slice(0, 6000));
  } else {
    console.error(`api: unknown command ${command}`);
    process.exit(2);
  }
} catch (e) {
  console.error(`api: ${e.message}`);
  process.exit(1);
}
