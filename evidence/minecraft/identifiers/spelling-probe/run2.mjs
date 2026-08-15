// Second half of the namespace probe, against the same container and world run.mjs left behind.
//
//   node gen-rp2.mjs && node run2.mjs      # writes OUTPUT2.txt and RAW-OUTPUT2.txt
//
// Phase 3 (case-follow-up): the registry and the query paths disagreed about uppercase, so read
// both sides against one live entity.
// Phase 4 (rp-broken-control): the same resource pack plus deliberately broken geometry and client
// entity files, deployed into both resource pack pools, to establish whether this server reads
// resource pack content at all.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "OUTPUT2.txt");
const COMPOSE = path.join(DIR, "compose.yaml");
const CONTAINER = "ns-probe-bedrock-1";

const BP = { id: "5f2c1c4e-1d7a-4f3b-9d21-6a7c0f1e2b30", dir: "bp", name: "nsprobebp" };
const RP = { id: "3d8f9b02-6a41-4c55-9f7e-2b0c8d16a4f7", dir: "rp", name: "nsproberp" };
const RP2 = { id: "b41d7e26-3a90-4f18-9c02-5e7d1a638b4c", dir: "rp2", name: "nsproberp2" };

const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const compose = (...args) =>
  execFileSync("docker", ["compose", "-f", COMPOSE, ...args], { encoding: "utf8", maxBuffer: 512 << 20 });
const send = (c) => { try { compose("exec", "-T", "bedrock", "send-command", c); } catch { /* replies do not reach the log */ } };
const logs = () => compose("logs", "--no-log-prefix", "bedrock");
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const countOf = (needle) => logs().split(needle).length - 1;
const waitCount = (needle, want, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (countOf(needle) >= want) return true;
    sleep(5000);
  }
  return false;
};

fs.writeFileSync(OUT, "");
log("# bedrock namespace-character probe, part 2");
const mark = logs().length;

compose("exec", "-T", "bedrock", "rm", "-rf", `/data/development_behavior_packs/${BP.name}`);
execFileSync("docker", ["cp", path.join(DIR, "packs", BP.dir), `${CONTAINER}:/data/development_behavior_packs/${BP.name}`]);
// The broken-content pack goes into both pools, so a server that reads only one still sees it.
for (const [pool, p] of [["development_resource_packs", RP2], ["resource_packs", RP2]]) {
  compose("exec", "-T", "bedrock", "mkdir", "-p", `/data/${pool}`);
  compose("exec", "-T", "bedrock", "rm", "-rf", `/data/${pool}/${p.name}`);
  execFileSync("docker", ["cp", path.join(DIR, "packs", p.dir), `${CONTAINER}:/data/${pool}/${p.name}`]);
}

const activate = (rpIds) => {
  const bp = [{ pack_id: BP.id, version: [0, 1, 0] }];
  const rp = rpIds.map((id) => ({ pack_id: id, version: [0, 1, 0] }));
  for (const [file, list] of [["world_behavior_packs.json", bp], ["world_resource_packs.json", rp]]) {
    const local = path.join(DIR, file);
    fs.writeFileSync(local, JSON.stringify(list));
    execFileSync("docker", ["cp", local, `${CONTAINER}:/data/worlds/dev/${file}`]);
  }
  return `bp=${JSON.stringify(bp)} rp=${JSON.stringify(rp)}`;
};

const PHASES = [
  { label: "case-follow-up", rp: [RP.id], event: "nsprobe:case" },
  { label: "rp-broken-control", rp: [RP2.id], event: "nsprobe:case" },
];

for (const phase of PHASES) {
  const json = activate(phase.rp);
  const bootWant = countOf("[nsprobe] boot :: ready") + 1;
  compose("restart", "bedrock");
  if (!waitCount("[nsprobe] boot :: ready", bootWant, 300_000)) { log(`PACK DID NOT LOAD (${phase.label})`); process.exit(1); }
  log(`\n--- ${phase.label} ${json} ---`);
  const want = countOf(`${phase.label} :: complete`) + 1;
  send(`${"scriptevent"} ${phase.event} ${phase.label}`);
  if (!waitCount(`${phase.label} :: complete`, want, 600_000)) log(`PHASE ${phase.label} DID NOT COMPLETE`);
}

const all = logs();
const raw = all.slice(mark);
fs.writeFileSync(path.join(DIR, "RAW-OUTPUT2.txt"), raw);
const version = (all.match(/Version: ([\d.]+)/) ?? [])[1] ?? "unknown";
log(`\nserver=${version} bp=${BP.id} rp=${RP.id} rp2=${RP2.id}`);

log("\n=== raw [nsprobe] lines from this part, delivery order ===");
for (const line of raw.split("\n")) if (line.includes("[nsprobe]")) log(line.trimEnd());

log("\n=== every non-scripting WARN/ERROR line from this part ===");
for (const line of raw.split("\n")) {
  if (line.includes("[Scripting]")) continue;
  if (/WARN|ERROR/.test(line)) log(line.trimEnd());
}
log("\n=== every Pack Stack line from this part ===");
for (const line of raw.split("\n")) if (line.includes("Pack Stack")) log(line.trimEnd());
log("\n=== end ===");
