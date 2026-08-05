// Does a console reload cope with a pack whose FILE SET changed, or only with edits to files that
// were already there?
//
//   node run.mjs            # writes OUTPUT.txt beside this file
//
// d-ftlfhac8 restarts the server for "an added or removed file". Only one case under that heading
// is evidenced — a module file reached through an `import`, first deployed after world load, fails
// to resolve (a-bedrock-script-reload-resolves-only-the-files-loaded-at-world-load). Adding a file
// nothing imports, and removing one, were never tested. This probe tests them, because the build
// bundles scripts to one entry file, so nearly every file-set change an author makes is a
// non-script asset rather than a module.
//
// Functions are the observable, but not through the console: `send-command` replies do not reach
// the container log — `say`, `list` and `function` all produce nothing there, only server events
// like the reload acknowledgement do. So the pack's own script runs each function through
// `runCommand` and reports what happened in an uncaught error, the signal that survives a reload.
//
// The last case is a positive control that must FAIL: if adding an imported module file reloads
// cleanly here, the rig is not detecting failures and none of the passes above mean anything.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "OUTPUT.txt");
const POOL = "/data/development_behavior_packs";
const WORLD = "/data/worlds/dev";
const UUID = "f11e5e70-0000-4000-8000-000000000001";
const MODULE_UUID = "f11e5e70-0000-4000-8000-000000000002";

fs.writeFileSync(OUT, "");
const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const compose = (...args) =>
  execFileSync("docker", ["compose", "-f", path.join(DIR, "compose.yaml"), ...args], {
    encoding: "utf8", maxBuffer: 64 << 20,
  });
const tryCompose = (...a) => { try { return compose(...a); } catch (e) { return `<error> ${e.stderr ?? e.message}`; } };
const logs = () => compose("logs", "--no-log-prefix", "bedrock").split("\n");
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const FNS = ["existing", "added", "spare"];
const mainSrc = (tag, extraImport) =>
  `import { world, system } from "@minecraft/server";\n` +
  `${extraImport ? `import { late } from "./late.js";\n` : ""}import { value } from "./helper.js";\n` +
  `system.run(() => {\n` +
  `  const d = world.getDimension("overworld");\n` +
  `  const r = ${JSON.stringify(FNS)}.map((f) => {\n` +
  `    try { const x = d.runCommand("function " + f); return f + "=ran(" + (x.successCount) + ")"; }\n` +
  `    catch (e) { return f + "=MISSING"; }\n` +
  `  });\n` +
  `  throw new Error("PROBE-SCRIPT ${tag} " + value${extraImport ? ' + " late=" + late' : ""} + " | " + r.join(" "));\n` +
  `});\n`;

const put = (rel, body) => {
  const tmp = path.join(DIR, ".stage");
  fs.writeFileSync(tmp, body);
  compose("cp", tmp, `bedrock:${POOL}/${UUID}/${rel}`);
  fs.rmSync(tmp);
};
const rm = (rel) => compose("exec", "-T", "bedrock", "rm", "-f", `${POOL}/${UUID}/${rel}`);
const files = () => compose("exec", "-T", "bedrock", "sh", "-c",
  `cd ${POOL}/${UUID} && find . -type f | sort | sed 's|^\\./||' | tr '\\n' ' '`).trim();

/** Reload, then run the named functions, returning everything the server said. */
const reloadAndRun = () => {
  const before = logs().length;
  tryCompose("exec", "-T", "bedrock", "send-command", "reload");
  for (let i = 0; i < 20; i++) { sleep(1500); if (logs().slice(before).some((l) => l.includes("reloaded"))) break; }
  sleep(6000);
  return { afterReload: logs().slice(before).filter((l) => l.trim()) };
};

const report = (r) => {
  const script = r.afterReload.filter((l) => l.includes("PROBE-SCRIPT") || l.includes("Import ["));
  log("  reload said: " + (script.map((l) => l.trim()).join("\n               ") || "<no [Scripting] line>"));
};

log("=== environment");
log(execFileSync("docker", ["compose", "version"], { encoding: "utf8" }).trim());
log(execFileSync("docker", ["version", "--format", "Docker Engine {{.Server.Version}}"], { encoding: "utf8" }).trim());
log(`DOCKER_HOST=${process.env.DOCKER_HOST ?? "(local socket)"}`);
compose("down", "-v");
compose("up", "-d");
for (let i = 0; i < 90; i++) { sleep(2000); if (logs().some((l) => l.includes("Server started"))) break; }

// ---------------------------------------------------------------- deploy and load
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fs-"));
fs.mkdirSync(path.join(dir, "scripts"));
fs.mkdirSync(path.join(dir, "functions"));
fs.writeFileSync(path.join(dir, "scripts/main.js"), mainSrc("v0", false));
fs.writeFileSync(path.join(dir, "scripts/helper.js"), `export const value = "h0";\n`);
fs.writeFileSync(path.join(dir, "functions/existing.mcfunction"), `say PROBE-FN existing v1\n`);
fs.writeFileSync(path.join(dir, "functions/spare.mcfunction"), `say PROBE-FN spare v1\n`);
fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({
  format_version: 2,
  header: { name: "file set probe", description: "what a reload copes with", uuid: UUID, version: [1, 0, 0], min_engine_version: [1, 26, 0] },
  modules: [
    { type: "data", uuid: "f11e5e70-0000-4000-8000-000000000003", version: [1, 0, 0] },
    { type: "script", language: "javascript", entry: "scripts/main.js", uuid: MODULE_UUID, version: [1, 0, 0] },
  ],
  dependencies: [{ module_name: "@minecraft/server", version: "2.0.0" }],
}, null, 2) + "\n");
compose("exec", "-T", "bedrock", "sh", "-c", `rm -rf ${POOL}/* && mkdir -p ${POOL}/${UUID}`);
compose("cp", dir + "/.", `bedrock:${POOL}/${UUID}`);
const lt = path.join(dir, "l.json");
fs.writeFileSync(lt, JSON.stringify([{ pack_id: UUID, version: [1, 0, 0] }]));
compose("cp", lt, `bedrock:${WORLD}/world_behavior_packs.json`);
fs.rmSync(dir, { recursive: true });

let b = logs().length;
compose("restart", "bedrock");
for (let i = 0; i < 60; i++) {
  sleep(2000);
  const l = logs().slice(b);
  if (l.some((x) => x.includes("Server started")) && l.some((x) => x.includes("Pack Stack"))) { sleep(10000); break; }
}
log("\n=== at world load");
log("  files: " + files());
log("  " + logs().slice(b).filter((l) => l.includes("[Scripting]")).map((l) => l.trim()).join("\n  "));


// ---------------------------------------------------------------- 1. edit a function's content
log("\n=== case 1: EDIT an existing function's content, then reload (file set unchanged)");
put("functions/existing.mcfunction", `say PROBE-FN existing v2\n`);
log("  files: " + files());
report(reloadAndRun());
log("  (v2 means functions reload at all)");

// ---------------------------------------------------------------- 2. add a function
log("\n=== case 2: ADD a function file nothing imports, then reload (file set GREW)");
put("functions/added.mcfunction", `say PROBE-FN added v1\n`);
log("  files: " + files());
report(reloadAndRun());
log("  (an 'added v1' line means a grown file set does not need a restart)");

// ---------------------------------------------------------------- 3. remove a file
log("\n=== case 3: REMOVE a file nothing imports, then reload (file set SHRANK)");
rm("functions/spare.mcfunction");
log("  files: " + files());
report(reloadAndRun());
log("  (existing still working means a shrunk file set does not need a restart)");

// ---------------------------------------------------------------- 4. control: add an imported module
log("\n=== case 4 (control, must FAIL): ADD a module file the entry imports");
put("scripts/late.js", `export const late = "L1";\n`);
put("scripts/main.js", mainSrc("v4", true));
log("  files: " + files());
report(reloadAndRun());
log("  (a missing-import error is the rig proving it can still detect a genuine failure)");

log("\n=== after a restart, for comparison");
b = logs().length;
compose("restart", "bedrock");
for (let i = 0; i < 60; i++) {
  sleep(2000);
  const l = logs().slice(b);
  if (l.some((x) => x.includes("Server started")) && l.some((x) => x.includes("Pack Stack"))) { sleep(10000); break; }
}
log("  " + logs().slice(b).filter((l) => l.includes("[Scripting]")).map((l) => l.trim()).join("\n  "));

log("\n=== done");
compose("down", "-v");
