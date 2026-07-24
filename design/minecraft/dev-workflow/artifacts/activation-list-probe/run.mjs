// Probes the shape of a world's behavior-pack activation list against a real Bedrock server.
//
//   node run.mjs            # writes OUTPUT.txt beside this file
//
// Requires a Docker daemon (remote is fine — everything travels over the Docker API).
// Steps: pool-only (no activation), header uuid + matching version, module uuid,
// mismatched version. Each step restarts the server and reports the Pack Stack line.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "OUTPUT.txt");
const POOL = "/data/development_behavior_packs/probe-pack";
const WORLD = "/data/worlds/dev";
const MANIFEST = JSON.parse(fs.readFileSync(path.join(DIR, "pack/manifest.json"), "utf8"));
const HEADER_UUID = MANIFEST.header.uuid;
const MODULE_UUID = MANIFEST.modules[0].uuid;

fs.writeFileSync(OUT, "");
const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const compose = (...args) =>
  execFileSync("docker", ["compose", "-f", path.join(DIR, "compose.yaml"), ...args], {
    encoding: "utf8", maxBuffer: 64 << 20,
  });

const logs = () => compose("logs", "--no-log-prefix", "bedrock").split("\n");
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// restart and return the Pack Stack lines the fresh world load emitted
const restartAndReadPackStack = () => {
  const before = logs().length;
  compose("restart", "bedrock");
  for (let i = 0; i < 90; i++) {
    const lines = logs().slice(before);
    const stack = lines.filter((l) => l.includes("Pack Stack"));
    if (stack.length && lines.some((l) => l.includes("Server started"))) return stack;
    sleep(2000);
  }
  return ["<timed out waiting for a Pack Stack line>"];
};

const putActivationList = (entries) => {
  const tmp = path.join(DIR, "world_behavior_packs.json");
  fs.writeFileSync(tmp, JSON.stringify(entries, null, 2) + "\n");
  compose("cp", tmp, `bedrock:${WORLD}/world_behavior_packs.json`);
  fs.rmSync(tmp);
  log(`  wrote ${WORLD}/world_behavior_packs.json = ${JSON.stringify(entries)}`);
};

const step = (title, fn) => { log(`\n=== ${title}`); fn(); };

log("=== environment");
log(execFileSync("docker", ["compose", "version"], { encoding: "utf8" }).trim());
log(`DOCKER_HOST=${process.env.DOCKER_HOST ?? "(local socket)"}`);
log(`header uuid = ${HEADER_UUID}`);
log(`module uuid = ${MODULE_UUID}`);
log(`manifest version = ${JSON.stringify(MANIFEST.header.version)}`);

step("world directory before any deploy", () => {
  log(compose("exec", "-T", "bedrock", "ls", "-1", WORLD).trim());
});

step("pack copied into the pool, world not told about it", () => {
  compose("exec", "-T", "bedrock", "mkdir", "-p", POOL);
  compose("cp", path.join(DIR, "pack") + "/.", `bedrock:${POOL}`);
  log(compose("exec", "-T", "bedrock", "find", POOL, "-type", "f").trim());
  log(restartAndReadPackStack().join("\n").trim());
});

step("activation list with header uuid and matching version", () => {
  putActivationList([{ pack_id: HEADER_UUID, version: MANIFEST.header.version }]);
  log(restartAndReadPackStack().join("\n").trim());
  log("file as the server left it:");
  log(compose("exec", "-T", "bedrock", "cat", `${WORLD}/world_behavior_packs.json`).trim());
});

step("activation list with the module uuid instead", () => {
  putActivationList([{ pack_id: MODULE_UUID, version: MANIFEST.header.version }]);
  log(restartAndReadPackStack().join("\n").trim());
});

step("activation list with header uuid but a version the pack does not have", () => {
  putActivationList([{ pack_id: HEADER_UUID, version: [9, 9, 9] }]);
  log(restartAndReadPackStack().join("\n").trim());
});

step("back to header uuid and matching version", () => {
  putActivationList([{ pack_id: HEADER_UUID, version: MANIFEST.header.version }]);
  log(restartAndReadPackStack().join("\n").trim());
});

log("\n=== done");
