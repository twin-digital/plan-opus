// Drives the slash-in-identifier probe against a real Bedrock dedicated server, headless.
//
//   node run.mjs            # writes OUTPUT.txt beside this file
//
// One phase: a behavior pack declaring an identifier with a slash in the namespace half, one with
// a slash in the name half, and an underscore control, read back through every addressing path.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, process.env.OUT_FILE ?? "OUTPUT.txt");
const COMPOSE = path.join(DIR, "compose.yaml");
const CONTAINER = "slash-spelling-probe-bedrock-1";

const BP = { id: "206d4ca1-7780-484b-86cb-e3eef0f98766", dir: "bp", name: "slashprobebp" };

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
log("# slash-in-identifier spelling probe");

compose("up", "-d");
if (!waitFor("Server started", 300_000)) { log("SERVER DID NOT START"); process.exit(1); }

compose("exec", "-T", "bedrock", "rm", "-rf", `/data/development_behavior_packs/${BP.name}`);
execFileSync("docker", ["cp", path.join(DIR, "packs", BP.dir), `${CONTAINER}:/data/development_behavior_packs/${BP.name}`]);

const list = [{ pack_id: BP.id, version: [0, 1, 0] }];
const file = path.join(DIR, "world_behavior_packs.json");
fs.writeFileSync(file, JSON.stringify(list));
execFileSync("docker", ["cp", file, `${CONTAINER}:/data/worlds/dev/world_behavior_packs.json`]);

const bootWant = countOf("[slprobe] boot :: ready") + 1;
compose("restart", "bedrock");
if (!waitCount("[slprobe] boot :: ready", bootWant, 300_000)) { log("PACK DID NOT LOAD"); process.exit(1); }
log(`\n--- slash world_behavior_packs.json=${JSON.stringify(list)} ---`);

send("scriptevent slprobe:run slash");
if (!waitFor("slash :: complete", 600_000)) log("PHASE slash DID NOT COMPLETE");

const raw = logs();
const version = (raw.match(/Version: ([\d.]+)/) ?? [])[1] ?? "unknown";
log(`\nserver=${version} bp=${BP.id}`);

log("\n=== raw [slprobe] lines, delivery order ===");
for (const line of raw.split("\n")) if (line.includes("[slprobe]")) log(line.trimEnd());

log("\n=== other content-log lines mentioning a probe identifier ===");
for (const line of raw.split("\n")) {
  if (line.includes("[slprobe]")) continue;
  if (/spellfx|my-rpg|my_rpg|fam_ns_slash|fam_name_slash|identifier/i.test(line)) log(line.trimEnd());
}
log("\n=== end ===");
