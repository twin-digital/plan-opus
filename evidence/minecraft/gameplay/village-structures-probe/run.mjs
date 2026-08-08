// Drives the village-structure probes against a real Bedrock dedicated server, headless.
//
//   node run.mjs <scenario> [--ticks N]   # writes <SCENARIO>-OUTPUT.txt beside this file
//
// Scenarios: api, baseline, beds, jobs, bell, wreck.
//
// The primary measurement is the world's own village records, read out of its LevelDB. The driver
// steps the village one command at a time and takes a database snapshot between steps, so each
// destruction is a before/after diff of what the engine itself recorded. The behavioural readings
// the pack logs — births, golem spawns, professions — corroborate it.
//
// A snapshot uses Bedrock's backup protocol over `send-command`: `save hold`, then `save query`
// polled until the log carries the ready line and its `<path>:<bytes>` list, then each named file
// copied out and truncated to that length, then `save resume` — always, including on error paths.
//
// Entity handles go stale after the first run in a session, so drive one scenario per destroyed and
// rebuilt volume (`docker compose -f compose.yaml down -v`) rather than several against one.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const COMPOSE = path.join(DIR, "compose.yaml");
// One scenario per destroyed and rebuilt volume, and scenarios are long, so `STACK=b` gives a
// second independent project and container to run one alongside another.
const PROJECT = `village-structures-probe${process.env.STACK ? `-${process.env.STACK}` : ""}`;
const CONTAINER = `${PROJECT}-bedrock-1`;
const PACK_UUID = "682a9bae-4a8a-40f2-9d38-020ae1313337";
const SNAPDIR = process.env.SNAP_DIR ?? path.join(DIR, ".snapshots");
const LDB_MODULES = process.env.LDB_MODULES ?? "";

const scenario = process.argv[2] ?? "baseline";
const ticksArg = (() => {
  const i = process.argv.indexOf("--ticks");
  return i > 0 ? Number(process.argv[i + 1]) : 0;
})();
const OUT = path.join(DIR, process.env.OUT_FILE ?? `${scenario.toUpperCase()}-OUTPUT.txt`);

const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const compose = (...args) =>
  execFileSync("docker", ["compose", "-p", PROJECT, "-f", COMPOSE, ...args], { encoding: "utf8", maxBuffer: 256 << 20 });
const send = (c) => { try { compose("exec", "-T", "bedrock", "send-command", c); } catch { /* replies land in the log, not here */ } };
const logs = () => compose("logs", "--no-log-prefix", "bedrock");
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const countOf = (needle) => logs().split(needle).length - 1;

const waitFor = (needle, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (logs().includes(needle)) return true;
    sleep(4000);
  }
  return false;
};

// ------------------------------------------------------------------ snapshots

const READY = "Data saved. Files are now ready to be copied.";

// `save query` answers with the ready line followed by a `<path>:<bytes>` list. The lengths are the
// point of the protocol: the files on disk carry bytes past the consistent snapshot.
const snapshot = (name) => {
  const dest = path.join(SNAPDIR, name);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  let files = null;
  try {
    const before = countOf(READY);
    send("save hold");
    sleep(2000);
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      send("save query");
      sleep(3000);
      const all = logs();
      if (all.split(READY).length - 1 > before) {
        const after = all.slice(all.lastIndexOf(READY) + READY.length);
        const line = after.split("\n").map((l) => l.trim()).find((l) => l.includes(":") && l.includes("/db/"));
        if (line) { files = line.split(",").map((p) => p.trim()).filter(Boolean); break; }
      }
    }
    if (!files) { log(`SNAPSHOT ${name} :: save query never named files`); return null; }
    log(`snapshot ${name} :: files=${files.length} [${files.join(" ")}]`);
    for (const spec of files) {
      const idx = spec.lastIndexOf(":");
      const rel = spec.slice(0, idx);
      const bytes = Number(spec.slice(idx + 1));
      const local = path.join(dest, rel);
      fs.mkdirSync(path.dirname(local), { recursive: true });
      execFileSync("docker", ["cp", `${CONTAINER}:/data/worlds/${rel}`, local]);
      const actual = fs.statSync(local).size;
      if (actual > bytes) fs.truncateSync(local, bytes);
      if (actual !== bytes) log(`snapshot ${name} :: truncated ${rel} ${actual} -> ${bytes}`);
    }
  } finally {
    send("save resume");
    sleep(1500);
  }
  return path.join(dest, "dev");
};

const dump = (name, worldDir) => {
  if (!worldDir) return null;
  const out = path.join(SNAPDIR, `${name}.json`);
  try {
    const json = execFileSync("node", [path.join(DIR, "dump-village.mjs"), worldDir], {
      encoding: "utf8", maxBuffer: 128 << 20,
      env: { ...process.env, LDB_MODULES },
    });
    fs.writeFileSync(out, json);
    const o = JSON.parse(json);
    const ids = Object.keys(o.villages);
    log(`records ${name} :: totalKeys=${o.totalKeys} villages=${o.villageCount} ids=[${ids.join(",")}]`);
    for (const id of ids) {
      const v = o.villages[id];
      const poi = v.POI?.nbt?.POI ?? [];
      let instances = 0;
      const names = {};
      for (const p of poi) for (const i of p.instances ?? []) if (i.Name) { instances++; names[i.Name] = (names[i.Name] ?? 0) + 1; }
      const inf = v.INFO?.nbt ?? {};
      log(`village ${name} :: id=${id} dwellers=${(v.DWELLERS?.nbt?.Dwellers ?? []).map((g) => g.actors.length).join("/")} poiEntries=${poi.length} poiInstances=${instances} poiNames=${JSON.stringify(names)} players=${(v.PLAYERS?.nbt?.Players ?? []).length} bounds=${inf.X0},${inf.X1},${inf.Y0},${inf.Y1},${inf.Z0},${inf.Z1}`);
      for (const [kind, rec] of Object.entries(v)) {
        log(`record ${name} :: village=${id.slice(0, 8)} kind=${kind} bytes=${rec.bytes} nbt=${JSON.stringify(rec.nbt)}`);
      }
    }
    return o;
  } catch (e) {
    log(`RECORDS ${name} :: dump failed ${String(e?.message ?? e).split("\n")[0]}`);
    return null;
  }
};

// Village records reach the database one save behind: the save that first writes them lands the
// bytes past the length `save query` named, so the snapshot that triggered the write cannot see it.
// Every capture therefore saves twice and reads the second.
const capture = (name) => {
  log(`\n--- capture ${name} ---`);
  snapshot(`${name}-prime`);
  fs.rmSync(path.join(SNAPDIR, `${name}-prime`), { recursive: true, force: true });
  return dump(name, snapshot(name));
};

// ------------------------------------------------------------------ steps

let seq = 0;
const step = (cmd, msg = "", timeoutMs = 1_800_000) => {
  const name = cmd;
  const want = countOf(`${name} :: complete`) + 1;
  seq++;
  log(`\n[step ${seq}] ${name}${msg === "" ? "" : ` ${msg}`}`);
  send(`scriptevent vgvil:${name}${msg === "" ? "" : ` ${msg}`}`);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (countOf(`${name} :: complete`) >= want) return true;
    sleep(4000);
  }
  log(`STEP ${name} DID NOT COMPLETE`);
  return false;
};

// ------------------------------------------------------------------ scenarios

const T = ticksArg > 0 ? ticksArg : 6000;

const buildAndSettle = () => {
  step("build");
  step("label", "baseline");
  step("watch", String(T));
};

const SCENARIOS = {
  api: () => { step("api"); },
  baseline: () => {
    capture("00-empty");
    buildAndSettle();
    capture("10-village-day");
    step("cycle", "on");
    step("label", "baseline-cycle");
    step("watch", String(T * 2));
    capture("20-village-after-a-night");
  },
  // Breeding needs a free bed, so a village that has bred up to its bed count stops on its own.
  // This one starts with four villagers against thirty beds, well under that ceiling, so the only
  // thing that can stop it in the middle phase is the removal.
  breed: () => {
    step("build", "4");
    step("label", "few-villagers-many-beds");
    step("watch", String(T));
    capture("10-breeding");
    step("destroy", "beds");
    step("label", "no-beds");
    step("watch", String(T));
    capture("20-no-beds");
    step("rebuild", "beds");
    step("label", "beds-rebuilt");
    step("watch", String(T));
    capture("30-beds-rebuilt");
  },
  beds: () => {
    buildAndSettle();
    capture("10-with-beds");
    step("mark");
    step("destroy", "beds");
    capture("20-beds-just-destroyed");
    step("label", "no-beds");
    step("watch", String(T));
    capture("30-no-beds");
    step("diff", "after-beds-destroyed");
    step("rebuild", "beds");
    step("label", "beds-rebuilt");
    step("watch", String(T));
    capture("40-beds-rebuilt");
  },
  jobs: () => {
    buildAndSettle();
    capture("10-with-jobs");
    step("mark");
    step("destroy", "jobs");
    capture("20-jobs-just-destroyed");
    step("label", "no-jobs");
    step("watch", String(T));
    capture("30-no-jobs");
    step("diff", "after-jobs-destroyed");
    step("mark");
    step("rebuild", "jobs");
    step("label", "jobs-rebuilt");
    step("watch", String(T));
    capture("40-jobs-rebuilt");
    step("diff", "after-jobs-rebuilt");
  },
  bell: () => {
    buildAndSettle();
    capture("10-with-bell");
    step("destroy", "bell");
    capture("20-bell-just-destroyed");
    step("label", "no-bell");
    step("watch", String(T));
    capture("30-no-bell");
  },
  wreck: () => {
    buildAndSettle();
    capture("10-intact");
    step("mark");
    step("destroy", "all");
    capture("20-just-razed");
    step("label", "razed");
    step("watch", String(T * 3));
    capture("30-razed");
    step("diff", "after-everything-destroyed");
    step("unload");
    capture("40-unloaded");
    step("reload");
    step("label", "after-reload");
    step("watch", String(T));
    capture("50-after-reload");
  },
};

// ------------------------------------------------------------------ main

const run = SCENARIOS[scenario];
if (!run) { console.error(`unknown scenario ${scenario}; have ${Object.keys(SCENARIOS).join(",")}`); process.exit(2); }

fs.writeFileSync(OUT, "");
log(`# village-guard village-structure probe — scenario ${scenario}, ticks ${T}`);

compose("up", "-d");
if (!waitFor("Server started", 300_000)) { log("SERVER DID NOT START"); process.exit(1); }
// clear the destination first: `docker cp <dir> <container>:<existing-dir>` copies the source
// *into* it, nesting the new pack under the old one
compose("exec", "-T", "bedrock", "rm", "-rf", "/data/development_behavior_packs/vgvil");
execFileSync("docker", ["cp", path.join(DIR, "pack"), `${CONTAINER}:/data/development_behavior_packs/vgvil`]);
const activation = path.join(SNAPDIR, "world_behavior_packs.json");
fs.mkdirSync(SNAPDIR, { recursive: true });
fs.writeFileSync(activation, JSON.stringify([{ pack_id: PACK_UUID, version: [0, 1, 0] }]));
execFileSync("docker", ["cp", activation, `${CONTAINER}:/data/worlds/dev/world_behavior_packs.json`]);
compose("restart", "bedrock");
if (!waitFor("[vgvil] boot :: ready", 300_000)) { log("PACK DID NOT LOAD"); process.exit(1); }

const version = (logs().match(/Version: ([\d.]+)/) ?? [])[1] ?? "unknown";
log(`server=${version} pack=${PACK_UUID} scenario=${scenario}`);

try {
  run();
} finally {
  send("save resume");
}

log("\n=== raw [vgvil] lines, delivery order ===");
for (const line of logs().split("\n")) if (line.includes("[vgvil]")) log(line.trimEnd());
log("\n=== end ===");
