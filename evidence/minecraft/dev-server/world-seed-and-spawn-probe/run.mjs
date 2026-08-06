// Can a run fix the world it generates — its seed, and where a player arrives?
//
//   node run.mjs            # writes OUTPUT.txt beside this file
//
// d-41m3iws5 proposes that a seed reaches the server as the generated project's level seed, and
// that the spawn point is set with a console command once the world has loaded because the server
// offers no setting for it. Neither half was evidenced when it was written. This probe tests both.
//
//   seed      three fresh worlds — the same seed twice, then a different one — fingerprinted by
//             the blocks the generator produced at fixed coordinates. Same seed, same fingerprint,
//             and a different seed differing, is the seed taking effect.
//   spawn     `send-command setworldspawn x y z` against a running world, then the world's default
//             spawn read back.
//
// The reader is a behavior pack whose script reports through an uncaught error, since that is what
// survives a reload (f:bedrock-script-console-output-is-not-a-deploy-signal). The read is deferred
// a tick: World::getDefaultSpawnLocation cannot be called during module evaluation.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "OUTPUT.txt");
const POOL = "/data/development_behavior_packs";
const WORLD = "/data/worlds/dev";
const UUID = "5eed0000-0000-4000-8000-000000000001";
const MODULE_UUID = "5eed0000-0000-4000-8000-000000000002";
const SAMPLES = [[8, 64, 8], [40, 70, 40], [-24, 62, 16], [100, 68, -100]];

fs.writeFileSync(OUT, "");
const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const compose = (...args) =>
  execFileSync("docker", ["compose", "-f", path.join(DIR, "compose.yaml"), ...args], {
    encoding: "utf8", maxBuffer: 64 << 20,
  });
const logs = () => compose("logs", "--no-log-prefix", "bedrock").split("\n");
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const SCRIPT = `import { world, system } from "@minecraft/server";
system.run(() => {
  let out = "";
  try {
    const l = world.getDefaultSpawnLocation();
    out += "spawn=" + l.x + "," + l.y + "," + l.z;
    const d = world.getDimension("overworld");
    out += " blocks=" + ${JSON.stringify(SAMPLES)}.map((c) => {
      try { const b = d.getBlock({ x: c[0], y: c[1], z: c[2] }); return b ? b.typeId : "unloaded"; }
      catch (e) { return "err"; }
    }).join("/");
  } catch (e) { out = "FAILED " + e; }
  throw new Error("PROBE " + out);
});
`;

/** Bring a brand-new world up under `seed`, deploy the reader, and return its report. */
const freshWorld = (seed) => {
  compose("down", "-v");
  const env = { ...process.env };
  if (seed !== null) env.LEVEL_SEED = String(seed);
  execFileSync("docker", ["compose", "-f", path.join(DIR, "compose.yaml"), "up", "-d"],
    { encoding: "utf8", env, maxBuffer: 64 << 20 });
  for (let i = 0; i < 90; i++) { sleep(2000); if (logs().some((l) => l.includes("Server started"))) break; }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "seed-"));
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.writeFileSync(path.join(dir, "scripts/main.js"), SCRIPT);
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({
    format_version: 2,
    header: { name: "seed probe", description: "reads spawn and generated blocks", uuid: UUID, version: [1, 0, 0], min_engine_version: [1, 26, 0] },
    modules: [{ type: "script", language: "javascript", entry: "scripts/main.js", uuid: MODULE_UUID, version: [1, 0, 0] }],
    dependencies: [{ module_name: "@minecraft/server", version: "2.0.0" }],
  }, null, 2) + "\n");
  compose("exec", "-T", "bedrock", "sh", "-c", `rm -rf ${POOL}/* && mkdir -p ${POOL}/${UUID}`);
  compose("cp", dir + "/.", `bedrock:${POOL}/${UUID}`);
  const lt = path.join(dir, "l.json");
  fs.writeFileSync(lt, JSON.stringify([{ pack_id: UUID, version: [1, 0, 0] }]));
  compose("cp", lt, `bedrock:${WORLD}/world_behavior_packs.json`);
  fs.rmSync(dir, { recursive: true });

  log(`  level-seed in server.properties: ${compose("exec", "-T", "bedrock", "sh", "-c", "grep '^level-seed' /data/server.properties").trim()}`);
  readReport();                       // first load; no chunks are resident with nobody connected
  compose("exec", "-T", "bedrock", "send-command", "tickingarea", "add", "circle", "0", "64", "0", "4", "probe");
  sleep(12000);                       // let the area load the chunks the samples sit in
  return reloadReport();
};

/** Re-evaluate the pack in place and return its PROBE line — used once chunks are resident. */
const reloadReport = () => {
  const before = logs().length;
  compose("exec", "-T", "bedrock", "send-command", "reload");
  for (let i = 0; i < 25; i++) {
    sleep(2000);
    if (logs().slice(before).some((x) => x.includes("PROBE "))) { sleep(3000); break; }
  }
  const hit = logs().slice(before).find((l) => l.includes("PROBE ") && l.includes("[seed probe]"));
  return (hit ?? "<no PROBE line>").trim();
};

/** Restart and return the PROBE line the fresh world load emitted. */
const readReport = () => {
  const before = logs().length;
  compose("restart", "bedrock");
  for (let i = 0; i < 60; i++) {
    sleep(2000);
    const l = logs().slice(before);
    if (l.some((x) => x.includes("PROBE "))) { sleep(3000); break; }
  }
  const hit = logs().slice(before).find((l) => l.includes("PROBE ") && l.includes("[seed probe]"));
  return (hit ?? "<no PROBE line>").trim();
};

log("=== environment");
log(execFileSync("docker", ["compose", "version"], { encoding: "utf8" }).trim());
log(execFileSync("docker", ["version", "--format", "Docker Engine {{.Server.Version}}"], { encoding: "utf8" }).trim());
log(`DOCKER_HOST=${process.env.DOCKER_HOST ?? "(local socket)"}`);
log(`sampled coordinates: ${JSON.stringify(SAMPLES)}`);

const results = {};
for (const [label, seed] of [["A-first", 424242], ["A-again", 424242], ["B", 999111]]) {
  log(`\n=== fresh world, LEVEL_SEED=${seed}   (${label})`);
  results[label] = freshWorld(seed);
  log("  " + results[label]);
}

log("\n=== same seed twice");
log(`  A-first  ${results["A-first"].replace(/^.*PROBE /, "")}`);
log(`  A-again  ${results["A-again"].replace(/^.*PROBE /, "")}`);
log(`  => identical: ${results["A-first"].replace(/^.*PROBE /, "") === results["A-again"].replace(/^.*PROBE /, "")}`);
log("=== a different seed");
log(`  B        ${results["B"].replace(/^.*PROBE /, "")}`);
log(`  => differs from A: ${results["B"].replace(/^.*PROBE /, "") !== results["A-first"].replace(/^.*PROBE /, "")}`);

// ---------------------------------------------------------------- the spawn point
log("\n=== setworldspawn against the running world (seed B)");
const before = logs().length;
const said = compose("exec", "-T", "bedrock", "send-command", "setworldspawn", "123", "70", "-456");
log(`  send-command returned: ${said.trim() || "(no output)"}`);
sleep(4000);
log("  server said: " + logs().slice(before).filter((l) => l.trim() && !l.includes("[Scripting]")).slice(-3).map((l) => l.trim()).join(" | "));
log("  spawn read back after a restart:");
log("  " + readReport());
log("  (a spawn of 123,70,-456 is the console command taking effect)");

log("\n=== done");
compose("down", "-v");
