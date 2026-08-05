// Does a console reload re-evaluate a behavior pack's script module when the edit lands in the
// module's ENTRY file, as it does when the edit lands in a file the entry imports?
//
//   node run.mjs            # writes OUTPUT.txt beside this file
//
// One pack, loaded once, then edited and reloaded repeatedly with no restarts in between. Cases
// alternate so each reload has the other kind beside it in the same server session — the entry-file
// edits are the question and the imported-file edits are the positive control. Without that control
// a run of negatives cannot be told from a rig where reload never worked at all.
//
// Two things this probe is careful about:
//
//   * Every line a case emits is unique. The engine's content log suppresses byte-identical
//     repeats, so a case whose expected line matched an earlier one would read as a failure to
//     re-evaluate when the module had in fact re-evaluated. main.js logs a counter and the helper's
//     value on one line, so both kinds of edit change the line.
//   * After each copy the file is read back out of the container, so a case can never be scored on
//     an edit that did not land.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "OUTPUT.txt");
const POOL = "/data/development_behavior_packs";
const WORLD = "/data/worlds/dev";
const UUID = "7a5c1e90-0000-4000-8000-00000000beef";
const MODULE_UUID = "7b5c1e90-0000-4000-8000-00000000cafe";

fs.writeFileSync(OUT, "");
const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const compose = (...args) =>
  execFileSync("docker", ["compose", "-f", path.join(DIR, "compose.yaml"), ...args], {
    encoding: "utf8", maxBuffer: 64 << 20,
  });
const logs = () => compose("logs", "--no-log-prefix", "bedrock").split("\n");
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const scripting = (from) => logs().slice(from).filter((l) => l.includes("[Scripting]"));

const mainSource = (n) =>
  `import { value } from "./helper.js";\nconsole.warn("[probe] main#${n} value=" + value);\n`;
const helperSource = (n) => `export const value = "helper#${n}";\n`;

/** Copy one file in, then read it back out of the container to prove the edit landed. */
const putFile = (rel, body) => {
  const tmp = path.join(DIR, ".stage");
  fs.writeFileSync(tmp, body);
  compose("cp", tmp, `bedrock:${POOL}/${UUID}/${rel}`);
  fs.rmSync(tmp);
  const onServer = compose("exec", "-T", "bedrock", "cat", `${POOL}/${UUID}/${rel}`);
  log(`  ${rel} on the server is now: ${JSON.stringify(onServer.trim())}`);
  if (onServer.trim() !== body.trim()) log("  !! the copy did not land — this case is void");
};

/** Reload, then watch for 60s, collecting for 6s after the first line so nothing is clipped. */
const reloadAndWatch = () => {
  const before = logs().length;
  compose("exec", "-T", "bedrock", "send-command", "reload");
  let first = -1;
  for (let i = 0; i < 30; i++) {
    sleep(2000);
    if (first < 0 && scripting(before).length) { first = (i + 1) * 2; sleep(6000); break; }
  }
  return { seconds: first, lines: scripting(before), ack: logs().slice(before).some((l) => l.includes("reloaded")) };
};

log("=== environment");
log(execFileSync("docker", ["compose", "version"], { encoding: "utf8" }).trim());
log(execFileSync("docker", ["version", "--format", "Docker Engine {{.Server.Version}}"], { encoding: "utf8" }).trim());
log(`DOCKER_HOST=${process.env.DOCKER_HOST ?? "(local socket)"}`);
compose("down", "-v");
compose("up", "-d");
for (let i = 0; i < 90; i++) { if (logs().some((l) => l.includes("Server started"))) break; sleep(2000); }
log(logs().filter((l) => l.includes("Version")).slice(0, 1).join("").trim());
log(`host epoch ${Math.floor(Date.now() / 1000)}, container epoch ${compose("exec", "-T", "bedrock", "date", "+%s").trim()}`);

// ---------------------------------------------------------------- deploy and load once
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reload-"));
fs.mkdirSync(path.join(dir, "scripts"));
fs.writeFileSync(path.join(dir, "scripts/main.js"), mainSource(0));
fs.writeFileSync(path.join(dir, "scripts/helper.js"), helperSource(0));
fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({
  format_version: 2,
  header: { name: "reload probe", description: "entry vs imported file", uuid: UUID, version: [1, 0, 0], min_engine_version: [1, 26, 0] },
  modules: [{ type: "script", language: "javascript", entry: "scripts/main.js", uuid: MODULE_UUID, version: [1, 0, 0] }],
  dependencies: [{ module_name: "@minecraft/server", version: "2.0.0" }],
}, null, 2) + "\n");
compose("exec", "-T", "bedrock", "sh", "-c", `rm -rf ${POOL}/* && mkdir -p ${POOL}/${UUID}`);
compose("cp", dir + "/.", `bedrock:${POOL}/${UUID}`);
const lt = path.join(dir, "l.json");
fs.writeFileSync(lt, JSON.stringify([{ pack_id: UUID, version: [1, 0, 0] }]));
compose("cp", lt, `bedrock:${WORLD}/world_behavior_packs.json`);
fs.rmSync(dir, { recursive: true });

let before = logs().length;
compose("restart", "bedrock");
for (let i = 0; i < 60; i++) {
  sleep(2000);
  const l = logs().slice(before);
  if (l.some((x) => x.includes("Server started")) && l.some((x) => x.includes("Pack Stack"))) { sleep(10000); break; }
}
log("\n=== loaded at world load");
log("  " + scripting(before).join("\n  ").trim());

// ---------------------------------------------------------------- alternate the two kinds of edit
let mainN = 0, helperN = 0;
const results = [];
const CASES = ["entry", "import", "entry", "import", "entry", "import"];

for (const [i, kind] of CASES.entries()) {
  log(`\n=== case ${i + 1}: edit the ${kind === "entry" ? "ENTRY file (scripts/main.js)" : "IMPORTED file (scripts/helper.js)"}, then reload — no restart`);
  let expect;
  if (kind === "entry") { mainN += 1; putFile("scripts/main.js", mainSource(mainN)); expect = `main#${mainN} value=helper#${helperN}`; }
  else { helperN += 1; putFile("scripts/helper.js", helperSource(helperN)); expect = `main#${mainN} value=helper#${helperN}`; }
  log(`  expecting the line: [probe] ${expect}`);
  const r = reloadAndWatch();
  const hit = r.lines.some((l) => l.includes(expect));
  log(`  reload acknowledged: ${r.ack}`);
  log("  " + (r.lines.join("\n  ").trim() || "<no [Scripting] line within 60s>"));
  log(`  => re-evaluated: ${hit ? `YES (~${r.seconds}s)` : "NO"}`);
  results.push({ kind, hit });
}

log("\n=== summary — did the reload re-evaluate the module?");
for (const kind of ["entry", "import"]) {
  const rs = results.filter((r) => r.kind === kind);
  log(`  edit to the ${kind === "entry" ? "ENTRY file    " : "IMPORTED file "} ${rs.map((r, i) => `#${i + 1}: ${r.hit ? "YES" : "NO"}`).join("   ")}`);
}

log("\n=== done");
compose("down", "-v");
