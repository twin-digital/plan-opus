// Drives the village-guard protection probes against a real Bedrock dedicated server, headless.
//
//   node run.mjs [runs]     # default 3; writes OUTPUT.txt beside this file
//
// The server is this directory's compose stack, the pack is ./pack, and every observation reaches
// the container log through console.warn — no client attaches at any point. Each pass triggers the
// three sets in order and waits for each set's own `complete` line, so a set that stops early is
// visible as a missing line rather than as a truncated pass.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "OUTPUT.txt");
const COMPOSE = path.join(DIR, "compose.yaml");
const CONTAINER = "gap-probe-bedrock-1";
const PACK_UUID = "b1f8d240-3c77-4e6a-9a15-8d40e2c7f931";
const ALL_SETS = ["zeroclamp", "subclamp", "water", "restore", "operator", "hazard", "convert"];
// node run.mjs [runs] [set,set,...]
const SETS = (process.argv[3] ?? "").split(",").filter(Boolean);
if (SETS.length === 0) SETS.push(...ALL_SETS);
const RUNS = Number(process.argv[2] ?? 3);

const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const compose = (...args) =>
  execFileSync("docker", ["compose", "-f", COMPOSE, ...args], { encoding: "utf8", maxBuffer: 256 << 20 });
const send = (c) => { try { compose("exec", "-T", "bedrock", "send-command", c); } catch { /* replies do not reach the log */ } };
const logs = () => compose("logs", "--no-log-prefix", "bedrock");
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const waitFor = (needle, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (logs().includes(needle)) return true;
    sleep(5000);
  }
  return false;
};
const countOf = (needle) => logs().split(needle).length - 1;

fs.writeFileSync(OUT, "");
log(`# village-guard protection probe — ${RUNS} run(s)`);

// bring the stack up and install the pack fresh, so a run never inherits a previous session's
// subscribers or arena
compose("up", "-d");
if (!waitFor("Server started", 300_000)) { log("SERVER DID NOT START"); process.exit(1); }
// clear the destination first: `docker cp <dir> <container>:<existing-dir>` copies the source
// *into* it, so a second run against a live container nests the new pack under the old one and the
// server keeps executing the script from the first run
compose("exec", "-T", "bedrock", "rm", "-rf", "/data/development_behavior_packs/vggap");
execFileSync("docker", ["cp", path.join(DIR, "pack"), `${CONTAINER}:/data/development_behavior_packs/vggap`]);
const activation = path.join(DIR, "world_behavior_packs.json");
fs.writeFileSync(activation, JSON.stringify([{ pack_id: PACK_UUID, version: [0, 1, 0] }]));
execFileSync("docker", ["cp", activation, `${CONTAINER}:/data/worlds/dev/world_behavior_packs.json`]);
compose("restart", "bedrock");
if (!waitFor("[vggap] boot :: ready", 300_000)) { log("PACK DID NOT LOAD"); process.exit(1); }

const version = (logs().match(/Version: ([\d.]+)/) ?? [])[1] ?? "unknown";
log(`server=${version} pack=${PACK_UUID}`);

for (let run = 1; run <= RUNS; run++) {
  for (const set of SETS) {
    const want = countOf(`${set} :: complete`) + 1;
    log(`\n--- run ${run} / set ${set} ---`);
    send(`scriptevent vggap:${set}`);
    const deadline = Date.now() + 900_000;
    let done = false;
    while (Date.now() < deadline) {
      if (countOf(`${set} :: complete`) >= want) { done = true; break; }
      sleep(5000);
    }
    if (!done) log(`SET ${set} DID NOT COMPLETE (run ${run})`);
  }
}

log("\n=== raw [vggap] lines, delivery order ===");
for (const line of logs().split("\n")) if (line.includes("[vggap]")) log(line.trimEnd());
log("\n=== end ===");
