// Drives the identifier-withdrawal probe against a real Bedrock dedicated server, headless.
//
//   node run.mjs            # writes OUTPUT.txt beside this file
//
// Three phases against one persistent world, each ended with a clean server `stop`:
//   p1-declared   data pack v0.1.0 declares probe:subject / probe:plain; spawn five entities
//   p2-withdrawn  same pack uuid at v0.2.0 declares probe:renamed / probe:plain_renamed only
//   p3-restored   back to v0.1.0
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, process.env.OUT_FILE ?? "OUTPUT.txt");
const COMPOSE = path.join(DIR, "compose.yaml");
const CONTAINER = "rename-probe-bedrock-1";

const SCRIPT = { id: "09ee7b49-12d6-4cb0-a3a0-283d3b33a3ae", name: "probescript", dir: "script", version: [0, 1, 0] };
const DATA_V1 = { id: "02ea60ca-92a8-4e23-9244-be3a9066c911", name: "probedata", dir: "data-v1", version: [0, 1, 0] };
const DATA_V2 = { id: "02ea60ca-92a8-4e23-9244-be3a9066c911", name: "probedata", dir: "data-v2", version: [0, 2, 0] };

const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const compose = (...args) =>
  execFileSync("docker", ["compose", "-f", COMPOSE, ...args], { encoding: "utf8", maxBuffer: 256 << 20 });
const send = (c) => { try { compose("exec", "-T", "bedrock", "send-command", c); } catch { /* replies do not reach the log */ } };
const logs = () => compose("logs", "--no-log-prefix", "bedrock");
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const countOf = (needle) => logs().split(needle).length - 1;
const running = () =>
  execFileSync("docker", ["inspect", "-f", "{{.State.Running}}", CONTAINER], { encoding: "utf8" }).trim() === "true";

const waitCount = (needle, want, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (countOf(needle) >= want) return true;
    sleep(5000);
  }
  return false;
};

// Runs against the volume, so it works whether or not the server container is up.
const rmInVolume = (p) =>
  execFileSync("docker", ["run", "--rm", "-v", "rename-probe_data:/data", "--entrypoint", "rm",
    "itzg/minecraft-bedrock-server", "-rf", p], { encoding: "utf8" });

const deploy = (pack) => {
  rmInVolume(`/data/development_behavior_packs/${pack.name}`);
  execFileSync("docker", ["cp", path.join(DIR, "packs", pack.dir), `${CONTAINER}:/data/development_behavior_packs/${pack.name}`]);
};

const activate = (packs) => {
  const list = packs.map((p) => ({ pack_id: p.id, version: p.version }));
  const file = path.join(DIR, "world_behavior_packs.json");
  fs.writeFileSync(file, JSON.stringify(list));
  execFileSync("docker", ["cp", file, `${CONTAINER}:/data/worlds/dev/world_behavior_packs.json`]);
  return JSON.stringify(list);
};

const cleanStop = () => {
  send("stop");
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (!running()) return true;
    sleep(3000);
  }
  compose("stop", "-t", "60");
  return false;
};

fs.writeFileSync(OUT, "");
log("# identifier-withdrawal probe (probe:subject -> probe:renamed -> probe:subject)");

// Phase 0: first boot, so /data exists and packs can be copied in.
compose("up", "-d");
if (!waitCount("Server started", 1, 600_000)) { log("SERVER DID NOT START"); process.exit(1); }
deploy(SCRIPT);
deploy(DATA_V1);

const PHASES = [
  { label: "p1-declared", data: DATA_V1, events: ["probe:spawn", "probe:tryspawn", "probe:census"] },
  { label: "p2-withdrawn", data: DATA_V2, events: ["probe:census", "probe:tryspawn"] },
  { label: "p3-restored", data: DATA_V1, events: ["probe:census", "probe:tryspawn"] },
];

for (const phase of PHASES) {
  if (running()) { log(`\n### ${phase.label}: clean stop of previous server: ${cleanStop() ? "exited" : "TIMED OUT"}`); }
  deploy({ ...SCRIPT, dir: "script" });
  deploy(phase.data);
  const json = activate([SCRIPT, phase.data]);
  const bootWant = countOf("[probe] boot :: ready") + 1;
  compose("up", "-d");
  if (!waitCount("[probe] boot :: ready", bootWant, 600_000)) { log(`PACK DID NOT LOAD (${phase.label})`); process.exit(1); }
  log(`\n--- ${phase.label} pack=${phase.data.dir} world_behavior_packs.json=${json} ---`);
  for (const ev of phase.events) {
    const tag = `${phase.label}/${ev.split(":")[1]}`;
    const want = countOf(`${tag} :: complete`) + 1;
    send(`scriptevent ${ev} ${tag}`);
    if (!waitCount(`${tag} :: complete`, want, 600_000)) log(`PHASE ${tag} DID NOT COMPLETE`);
  }
}
log(`\n### final clean stop: ${cleanStop() ? "exited" : "TIMED OUT"}`);

const raw = logs();
fs.writeFileSync(path.join(DIR, "RAW-OUTPUT.txt"), raw);
const version = (raw.match(/Version: ([\d.]+)/) ?? [])[1] ?? "unknown";
log(`\nserver=${version} script=${SCRIPT.id} data=${DATA_V1.id} (v0.1.0 / v0.2.0)`);

log("\n=== raw [probe] lines, delivery order ===");
for (const line of raw.split("\n")) if (line.includes("[probe]")) log(line.trimEnd());
log("\n=== content log lines mentioning probe identifiers (non-[probe]) ===");
for (const line of raw.split("\n")) {
  if (/probe:subject|probe:plain|probe:renamed|probedata|probe_family/i.test(line) && !line.includes("[probe]")) log(line.trimEnd());
}
log("\n=== warnings and errors ===");
for (const line of raw.split("\n")) {
  if (/\b(ERROR|WARN|Error|error:|failed|Failed)\b/.test(line) && !line.includes("[probe]")) log(line.trimEnd());
}
log("\n=== end ===");
