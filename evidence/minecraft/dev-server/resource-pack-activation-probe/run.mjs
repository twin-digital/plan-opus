// Does a resource pack deployed into `/data/development_resource_packs` and named in the world's
// `world_resource_packs.json` actually activate?
//
// The load output cannot answer it: the Pack Stack line names behavior packs only, and a resource
// pack runs no script that could report itself. So the observer is a person with a client attached,
// and the probe drives the server around them in phases.
//
//   node run.mjs setup       # server up, pack in the pool, NOT in the activation list
//   node run.mjs activate    # add it to world_resource_packs.json, restart
//   node run.mjs deactivate  # empty the list again, restart
//   node run.mjs teardown    # down -v
//
// The pack carries one `texts/en_US.lang` line renaming the diamond sword. That is the observation:
// a client that sees the overridden name is seeing an activated resource pack, and one that sees
// the stock name is not. Nothing else about the pack changes, so nothing else can explain the
// difference.
//
// Each phase prints what to look for and waits for nothing — the person watching runs the next one.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "OUTPUT.txt");
const RP_POOL = "/data/development_resource_packs";
const WORLD = "/data/worlds/dev";
const UUID = "c0ffee00-0000-4000-8000-0000000000rp".replace("rp", "01");
const MODULE_UUID = "c0ffee00-0000-4000-8000-000000000002";
const OVERRIDE = "RESOURCE PACK IS ACTIVE";

const phase = process.argv[2];
const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const compose = (...args) =>
  execFileSync("docker", ["compose", "-f", path.join(DIR, "compose.yaml"), ...args], {
    encoding: "utf8", maxBuffer: 64 << 20,
  });
const logs = () => compose("logs", "--no-log-prefix", "bedrock").split("\n");
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const putList = (entries) => {
  const tmp = path.join(DIR, ".list");
  fs.writeFileSync(tmp, JSON.stringify(entries, null, 2) + "\n");
  compose("cp", tmp, `bedrock:${WORLD}/world_resource_packs.json`);
  fs.rmSync(tmp);
  log(`  world_resource_packs.json = ${JSON.stringify(entries)}`);
};

const waitReady = (from) => {
  for (let i = 0; i < 60; i++) {
    sleep(2000);
    const l = logs().slice(from);
    if (l.some((x) => x.includes("Server started"))) { sleep(4000); return l.filter((x) => x.includes("Pack Stack")); }
  }
  return ["<timed out>"];
};

const restart = () => { const b = logs().length; compose("restart", "bedrock"); return waitReady(b); };

if (phase === "setup") {
  fs.writeFileSync(OUT, "");
  log("=== environment");
  log(execFileSync("docker", ["compose", "version"], { encoding: "utf8" }).trim());
  log(`DOCKER_HOST=${process.env.DOCKER_HOST ?? "(local socket)"}`);
  compose("down", "-v");
  compose("up", "-d");
  const b0 = logs().length - 1;
  waitReady(b0);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rp-"));
  fs.mkdirSync(path.join(dir, "texts"));
  fs.writeFileSync(path.join(dir, "texts/en_US.lang"), `item.diamond_sword.name=${OVERRIDE}\n`);
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({
    format_version: 2,
    header: { name: "rp activation probe", description: "renames the diamond sword", uuid: UUID, version: [1, 0, 0], min_engine_version: [1, 26, 0] },
    modules: [{ type: "resources", uuid: MODULE_UUID, version: [1, 0, 0] }],
  }, null, 2) + "\n");
  compose("exec", "-T", "bedrock", "sh", "-c", `rm -rf ${RP_POOL}/* && mkdir -p ${RP_POOL}/${UUID}`);
  compose("cp", dir + "/.", `bedrock:${RP_POOL}/${UUID}`);
  fs.rmSync(dir, { recursive: true });

  log("\n=== phase: setup — the pack is in the pool and NOT in the activation list");
  putList([]);
  log("  pool now holds: " + compose("exec", "-T", "bedrock", "ls", "-1", RP_POOL).trim());
  log("  pack contents: " + compose("exec", "-T", "bedrock", "find", `${RP_POOL}/${UUID}`, "-type", "f").trim().replace(/\n/g, ", "));
  log("  " + restart().join("\n  ").trim());
  log("\n  OBSERVE: join the server, open the creative inventory, and find the diamond sword.");
  log(`  Expect the STOCK name ("Diamond Sword"), not "${OVERRIDE}".`);
  log("  A pooled-but-unlisted pack should do nothing — this is the control.");
} else if (phase === "activate") {
  log("\n=== phase: activate — the same pack, now named in the activation list");
  putList([{ pack_id: UUID, version: [1, 0, 0] }]);
  log("  " + restart().join("\n  ").trim());
  log("  list as the server left it: " + compose("exec", "-T", "bedrock", "cat", `${WORLD}/world_resource_packs.json`).trim().replace(/\n/g, " "));
  log("\n  OBSERVE: rejoin and look at the diamond sword again.");
  log(`  A name of "${OVERRIDE}" means listing the pack activated it.`);
  log("  The stock name means it did not, whatever the list says.");
  log("  Note any download prompt the client shows on joining, and report it either way.");
} else if (phase === "deactivate") {
  log("\n=== phase: deactivate — emptied again, to show the observation tracks the list");
  putList([]);
  log("  " + restart().join("\n  ").trim());
  log("\n  OBSERVE: rejoin once more. The stock name should be back.");
} else if (phase === "teardown") {
  log("\n=== phase: teardown");
  compose("down", "-v");
  log("  down, volume removed");
} else {
  console.error("usage: node run.mjs setup|activate|deactivate|teardown");
  process.exit(2);
}
