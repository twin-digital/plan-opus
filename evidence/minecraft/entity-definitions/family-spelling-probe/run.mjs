// Drives the family-token spelling probe against a real Bedrock dedicated server, headless.
//
//   node run.mjs            # writes OUTPUT.txt beside this file
//
// One phase: spawn the probe entities and read an underscore, a hyphenated, and a dotted family
// token back through the script paths, then drive the @e[family=] selector from the server
// console. Console matches surface as scriptevent-echoed [probe] lines in the content log.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, process.env.OUT_FILE ?? "OUTPUT.txt");
const COMPOSE = path.join(DIR, "compose.yaml");
const CONTAINER = "family-spelling-probe-bedrock-1";

const SCRIPT = { id: "93c91f34-a9f4-4ed5-a470-d9acea830bfc", dir: "script", name: "spellingscript" };
const DATA = { id: "3c384f42-b3b6-46d9-8341-93bd5322bf6b", dir: "data", name: "spellingdata" };

const TOKENS = [
  "probe_underscore_token",
  "mcdk_pack_twin-digital-village-guard",
  "mcdk_pack_dotted.pkg.name",
  "probe_absent_token",
];

const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const compose = (...args) =>
  execFileSync("docker", ["compose", "-f", COMPOSE, ...args], { encoding: "utf8", maxBuffer: 256 << 20 });
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
const waitFor = (needle, timeoutMs) => waitCount(needle, 1, timeoutMs);

fs.writeFileSync(OUT, "");
log("# family-token spelling probe (hyphen, dot, underscore)");

compose("up", "-d");
if (!waitFor("Server started", 300_000)) { log("SERVER DID NOT START"); process.exit(1); }

for (const p of [SCRIPT, DATA]) {
  compose("exec", "-T", "bedrock", "rm", "-rf", `/data/development_behavior_packs/${p.name}`);
  execFileSync("docker", ["cp", path.join(DIR, "packs", p.dir), `${CONTAINER}:/data/development_behavior_packs/${p.name}`]);
}

const list = [SCRIPT, DATA].map((p) => ({ pack_id: p.id, version: [0, 1, 0] }));
const file = path.join(DIR, "world_behavior_packs.json");
fs.writeFileSync(file, JSON.stringify(list));
execFileSync("docker", ["cp", file, `${CONTAINER}:/data/worlds/dev/world_behavior_packs.json`]);

const bootWant = countOf("[probe] boot :: ready") + 1;
compose("restart", "bedrock");
if (!waitCount("[probe] boot :: ready", bootWant, 300_000)) { log("PACK DID NOT LOAD"); process.exit(1); }
log(`\n--- spelling world_behavior_packs.json=${JSON.stringify(list)} ---`);

send("scriptevent probe:run spelling");
if (!waitFor("spelling :: complete", 600_000)) log("PHASE spelling DID NOT COMPLETE");

// Console-side selector checks: a hit line only lands if @e[family=<t>] matched from the console.
for (const t of TOKENS) {
  send(`execute if entity @e[family=${t}] run scriptevent probe:hit ${t}`);
  sleep(2000);
  send(`scriptevent probe:checked ${t}`);
  if (!waitFor(`console-selector :: checked ${t}`, 60_000)) log(`CONSOLE CHECK ${t} DID NOT ECHO`);
}

const version = (logs().match(/Version: ([\d.]+)/) ?? [])[1] ?? "unknown";
log(`\nserver=${version} script=${SCRIPT.id} data=${DATA.id}`);

log("\n=== raw [probe] lines, delivery order ===");
for (const line of logs().split("\n")) if (line.includes("[probe]")) log(line.trimEnd());
log("\n=== content log warnings/errors mentioning the probe ===");
for (const line of logs().split("\n")) {
  if (/probe:spelling|probe:under|probe:hyphen|probe:dot|mcdk_pack|probe_underscore|type_family/i.test(line) && !line.includes("[probe]")) log(line.trimEnd());
}
log("\n=== end ===");
