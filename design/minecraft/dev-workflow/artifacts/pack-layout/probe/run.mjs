// Probes what the dedicated server does with the two pack kinds: whether each has its own pool
// and world list, and what happens when a resource pack is deployed as if it were a behavior
// pack. Evidence for how much of the reconciler a later resource-pack scope would duplicate.
//
//   node run.mjs        # writes OUTPUT.txt beside this file
//
// Requires a Docker daemon (remote is fine — everything travels over the Docker API).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "OUTPUT.txt");
const WORLD = "/data/worlds/dev";
const BP_POOL = "/data/development_behavior_packs";
const RP_POOL = "/data/development_resource_packs";
const BP = JSON.parse(fs.readFileSync(path.join(DIR, "bp/manifest.json"), "utf8"));
const RP = JSON.parse(fs.readFileSync(path.join(DIR, "rp/manifest.json"), "utf8"));

fs.writeFileSync(OUT, "");
const log = (s = "") => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const compose = (...args) =>
  execFileSync("docker", ["compose", "-f", path.join(DIR, "compose.yaml"), ...args], { encoding: "utf8", maxBuffer: 64 << 20 });
const logs = () => compose("logs", "--no-log-prefix", "bedrock").split("\n");
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const restartAndReadStacks = () => {
  const before = logs().length;
  compose("restart", "bedrock");
  for (let i = 0; i < 90; i++) {
    const lines = logs().slice(before);
    const stack = lines.filter((l) => /Pack Stack|pack|Pack/.test(l) && /Stack|error|Error|failed/.test(l));
    if (stack.length && lines.some((l) => l.includes("Server started"))) return stack;
    sleep(2000);
  }
  return ["<timed out>"];
};

const putList = (file, entries) => {
  const tmp = path.join(DIR, file);
  fs.writeFileSync(tmp, JSON.stringify(entries, null, 2) + "\n");
  compose("cp", tmp, `bedrock:${WORLD}/${file}`);
  fs.rmSync(tmp);
  log(`  ${file} = ${JSON.stringify(entries)}`);
};
const clearList = (file) => { putList(file, []); };
const put = (src, dest) => { compose("exec", "-T", "bedrock", "mkdir", "-p", dest); compose("cp", path.join(DIR, src) + "/.", `bedrock:${dest}`); };
const rm = (dest) => { try { compose("exec", "-T", "bedrock", "rm", "-rf", dest); } catch {} };

log("=== environment");
log(execFileSync("docker", ["compose", "version"], { encoding: "utf8" }).trim());
log(`DOCKER_HOST=${process.env.DOCKER_HOST ?? "(local socket)"}`);
log(`behavior pack uuid=${BP.header.uuid} modules=${JSON.stringify(BP.modules.map((m) => m.type))}`);
log(`resource pack uuid=${RP.header.uuid} modules=${JSON.stringify(RP.modules.map((m) => m.type))}`);

// the world directory only exists once the server has booted and opened its level
const waitForWorld = () => {
  for (let i = 0; i < 90; i++) {
    if (logs().some((l) => l.includes("Server started"))) return true;
    sleep(2000);
  }
  return false;
};
log(`\nserver ready: ${waitForWorld()}`);

log("\n=== the server's own pack directories, before anything is deployed");
log(compose("exec", "-T", "bedrock", "ls", "-1", "/data").trim());

log("\n=== case 1: each pack in its own pool, each listed in its own world list");
put("bp", `${BP_POOL}/probe-bp`);
put("rp", `${RP_POOL}/probe-rp`);
putList("world_behavior_packs.json", [{ pack_id: BP.header.uuid, version: BP.header.version }]);
putList("world_resource_packs.json", [{ pack_id: RP.header.uuid, version: RP.header.version }]);
log(restartAndReadStacks().join("\n").trim());

log("\n=== case 2: the resource pack placed in the behavior pool and listed as a behavior pack");
rm(`${RP_POOL}/probe-rp`);
put("rp", `${BP_POOL}/probe-rp`);
putList("world_behavior_packs.json", [
  { pack_id: BP.header.uuid, version: BP.header.version },
  { pack_id: RP.header.uuid, version: RP.header.version },
]);
clearList("world_resource_packs.json");
log(restartAndReadStacks().join("\n").trim());

log("\n=== case 3: back to correct pools, behavior pack only listed");
rm(`${BP_POOL}/probe-rp`);
put("rp", `${RP_POOL}/probe-rp`);
putList("world_behavior_packs.json", [{ pack_id: BP.header.uuid, version: BP.header.version }]);
putList("world_resource_packs.json", [{ pack_id: RP.header.uuid, version: RP.header.version }]);
log(restartAndReadStacks().join("\n").trim());

log("\n=== how the pools look after the run");
log(compose("exec", "-T", "bedrock", "find", BP_POOL, RP_POOL, "-maxdepth", "2").trim());
log("\n=== done");
