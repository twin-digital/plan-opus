// Does a console reload re-evaluate a behavior pack's script module when the module is a single
// file with no imports — the shape a bundler emits?
//
//   node run.mjs            # writes OUTPUT.txt beside this file
//
// The dev-loop probe found an edited entry file re-evaluating on reload when the module imported a
// helper, and not re-evaluating when the module was one file. Those two runs differed in more than
// the import, so this probe varies exactly one thing across three shapes and runs the set twice:
//
//   flat   — scripts/main.js alone, no import at all
//   noop   — scripts/main.js importing an empty scripts/noop.js, otherwise identical to flat
//   graph  — scripts/main.js importing scripts/helper.js, whose exported value it logs
//
// Every case: deploy the pack, restart to load it, then edit ONLY scripts/main.js so the line it
// logs changes, issue `send-command reload`, and poll for the changed line. Each case gets its own
// pack uuid and its own log token, so no observation can be mistaken for a stale line or a
// deduplicated repeat.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "OUTPUT.txt");
const POOL = "/data/development_behavior_packs";
const WORLD = "/data/worlds/dev";

fs.writeFileSync(OUT, "");
const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const compose = (...args) =>
  execFileSync("docker", ["compose", "-f", path.join(DIR, "compose.yaml"), ...args], {
    encoding: "utf8", maxBuffer: 64 << 20,
  });
const logs = () => compose("logs", "--no-log-prefix", "bedrock").split("\n");
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const scripting = (from) => logs().slice(from).filter((l) => l.includes("[Scripting]"));

/** main.js for a shape, logging `[probe] <token>`. */
const entrySource = (shape, token) => {
  if (shape === "flat") return `console.warn("[probe] ${token}");\n`;
  if (shape === "noop") return `import "./noop.js";\nconsole.warn("[probe] ${token}");\n`;
  return `import { value } from "./helper.js";\nconsole.warn("[probe] ${token} value=" + value);\n`;
};

const stage = (shape, token) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shape-"));
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.writeFileSync(path.join(dir, "scripts/main.js"), entrySource(shape, token));
  if (shape === "noop") fs.writeFileSync(path.join(dir, "scripts/noop.js"), "export {};\n");
  if (shape === "graph") fs.writeFileSync(path.join(dir, "scripts/helper.js"), `export const value = "H";\n`);
  return dir;
};

const manifest = (uuid, moduleUuid, shape) => JSON.stringify({
  format_version: 2,
  header: { name: `reload shape ${shape}`, description: "reload entry-shape probe", uuid, version: [1, 0, 0], min_engine_version: [1, 26, 0] },
  modules: [{ type: "script", language: "javascript", entry: "scripts/main.js", uuid: moduleUuid, version: [1, 0, 0] }],
  dependencies: [{ module_name: "@minecraft/server", version: "2.0.0" }],
}, null, 2) + "\n";

const restart = () => {
  const before = logs().length;
  compose("restart", "bedrock");
  for (let i = 0; i < 60; i++) {
    sleep(2000);
    const l = logs().slice(before);
    if (l.some((x) => x.includes("Server started")) && l.some((x) => x.includes("Pack Stack"))) { sleep(10000); break; }
  }
  return scripting(before);
};

/** Reload and poll up to 60s for any [Scripting] line. */
const reloadAndPoll = () => {
  const before = logs().length;
  compose("exec", "-T", "bedrock", "send-command", "reload");
  for (let i = 0; i < 30; i++) {
    sleep(2000);
    if (scripting(before).length) { sleep(3000); return { seconds: (i + 1) * 2, lines: scripting(before) }; }
  }
  return { seconds: 60, lines: [] };
};

const SHAPES = ["flat", "noop", "graph"];
const UUIDS = [
  "1a000000-0000-4000-8000-000000000001", "1b000000-0000-4000-8000-000000000002",
  "2a000000-0000-4000-8000-000000000003", "2b000000-0000-4000-8000-000000000004",
  "3a000000-0000-4000-8000-000000000005", "3b000000-0000-4000-8000-000000000006",
  "4a000000-0000-4000-8000-000000000007", "4b000000-0000-4000-8000-000000000008",
  "5a000000-0000-4000-8000-000000000009", "5b000000-0000-4000-8000-00000000000a",
  "6a000000-0000-4000-8000-00000000000b", "6b000000-0000-4000-8000-00000000000c",
];
const UUID = (n) => UUIDS[n - 1];

log("=== environment");
log(execFileSync("docker", ["compose", "version"], { encoding: "utf8" }).trim());
log(execFileSync("docker", ["version", "--format", "Docker Engine {{.Server.Version}}"], { encoding: "utf8" }).trim());
log(`DOCKER_HOST=${process.env.DOCKER_HOST ?? "(local socket)"}`);
compose("down", "-v");
compose("up", "-d");
for (let i = 0; i < 90; i++) { if (logs().some((l) => l.includes("Server started"))) break; sleep(2000); }
log(logs().filter((l) => l.includes("Version")).slice(0, 1).join("").trim());
log("");
log("Each case: deploy, restart to load, edit ONLY scripts/main.js, reload, poll 60s.");

const results = [];
let n = 1;
for (const round of [1, 2]) {
  for (const shape of SHAPES) {
    const uuid = UUID(n), moduleUuid = UUID(n + 1); n += 2;
    const loadToken = `${shape}-r${round}-LOADED`;
    const editToken = `${shape}-r${round}-EDITED`;

    log(`\n=== ${shape} (round ${round}) — uuid ${uuid}`);
    const dir = stage(shape, loadToken);
    fs.writeFileSync(path.join(dir, "manifest.json"), manifest(uuid, moduleUuid, shape));
    compose("exec", "-T", "bedrock", "sh", "-c", `rm -rf ${POOL}/* && mkdir -p ${POOL}/${uuid}`);
    compose("cp", dir + "/.", `bedrock:${POOL}/${uuid}`);
    const lt = path.join(dir, "l.json");
    fs.writeFileSync(lt, JSON.stringify([{ pack_id: uuid, version: [1, 0, 0] }]));
    compose("cp", lt, `bedrock:${WORLD}/world_behavior_packs.json`);
    log(`  files: ${compose("exec", "-T", "bedrock", "sh", "-c", `ls ${POOL}/${uuid}/scripts`).trim().split("\n").join(", ")}`);
    log("  at world load: " + (restart().join(" | ").trim() || "<no [Scripting] line>"));

    const edited = path.join(dir, "scripts/main.js");
    fs.writeFileSync(edited, entrySource(shape, editToken));
    compose("cp", edited, `bedrock:${POOL}/${uuid}/scripts/main.js`);
    log(`  edited scripts/main.js to log "${editToken}", then reload:`);
    const r = reloadAndPoll();
    const hit = r.lines.some((l) => l.includes(editToken));
    log("  " + (r.lines.join("\n  ").trim() || "<no [Scripting] line within 60s>"));
    log(`  => re-evaluated: ${hit ? `YES (~${r.seconds}s)` : "NO"}`);
    results.push({ shape, round, hit });
    fs.rmSync(dir, { recursive: true });
  }
}

log("\n=== summary — did an edit to scripts/main.js alone re-evaluate on reload?");
for (const shape of SHAPES) {
  const rs = results.filter((r) => r.shape === shape);
  log(`  ${shape.padEnd(6)} ${rs.map((r) => `round ${r.round}: ${r.hit ? "YES" : "NO"}`).join("   ")}`);
}

log("\n=== done");
compose("down", "-v");
