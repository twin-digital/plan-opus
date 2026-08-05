// Probes four things the dev loop rests on, against a real Bedrock server.
//
//   node run.mjs            # writes OUTPUT.txt beside this file
//
// Requires a Docker daemon (remote is fine — everything travels over the Docker API).
//
//   A. the version form: does a pack whose manifest header carries a SemVer *string* version load,
//      and does an activation entry match it? Array and string entries, and a pre-release, at
//      manifest format_version 2 and 3.
//   B. does an activation-list edit take effect without a server restart?
//   C. does a console reload bring a pack newly copied into the pool into the running world?
//   D. where does a resource pack's pool sit, what is the world's resource activation list called,
//      and does the server rewrite it?
//
// Every pack carries a script module that logs a distinctive line when it evaluates, so "is this
// pack live" is observable headlessly rather than inferred from silence.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "OUTPUT.txt");
const BP_POOL = "/data/development_behavior_packs";
const RP_POOL = "/data/development_resource_packs";
const WORLD = "/data/worlds/dev";

const PACK1 = "a1111111-1111-4111-8111-111111111111";
const PACK1_MOD = "b1111111-1111-4111-8111-111111111111";
const PACK2 = "a2222222-2222-4222-8222-222222222222";
const PACK2_MOD = "b2222222-2222-4222-8222-222222222222";
const RPACK = "a3333333-3333-4333-8333-333333333333";
const RPACK_MOD = "b3333333-3333-4333-8333-333333333333";

fs.writeFileSync(OUT, "");
const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const compose = (...args) =>
  execFileSync("docker", ["compose", "-f", path.join(DIR, "compose.yaml"), ...args], {
    encoding: "utf8", maxBuffer: 64 << 20,
  });
const tryCompose = (...args) => { try { return compose(...args); } catch (e) { return `<error> ${e.stderr ?? e.message}`; } };
const logs = () => compose("logs", "--no-log-prefix", "bedrock").split("\n");
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** A behavior pack whose entry imports a helper, so an entry-only edit and an imported-file edit
 *  can be told apart. Both files log. */
const graphPack = ({ uuid, moduleUuid, tag, helperValue }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "probe-gp-"));
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.writeFileSync(path.join(dir, "scripts/helper.js"), `export const value = "${helperValue}";\n`);
  fs.writeFileSync(path.join(dir, "scripts/main.js"),
    `console.warn("[probe] ${tag}: entry ran");\nimport { value } from "./helper.js";\nconsole.warn("[probe] ${tag}: value=" + value);\n`);
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({
    format_version: 2,
    header: { name: `probe ${tag}`, description: "dev-loop probe", uuid, version: [1, 0, 0], min_engine_version: [1, 26, 0] },
    modules: [{ type: "script", language: "javascript", entry: "scripts/main.js", uuid: moduleUuid, version: [1, 0, 0] }],
    dependencies: [{ module_name: "@minecraft/server", version: "2.0.0" }],
  }, null, 2) + "\n");
  return dir;
};

/** Overwrite one file of a pack already in the pool. */
const putFile = (uuid, rel, body) => {
  const tmp = path.join(DIR, ".stage-file");
  fs.writeFileSync(tmp, body);
  compose("cp", tmp, `bedrock:${BP_POOL}/${uuid}/${rel}`);
  fs.rmSync(tmp);
  log(`  rewrote ${rel} of pack ${uuid.slice(0, 8)}`);
};

/** A behavior pack whose script logs `[probe] <tag>: alive` on evaluation. */
const behaviorPack = ({ uuid, moduleUuid, tag, formatVersion, version }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "probe-bp-"));
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.writeFileSync(path.join(dir, "scripts/main.js"), `console.warn("[probe] ${tag}: alive");\n`);
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({
    format_version: formatVersion,
    header: { name: `probe ${tag}`, description: "dev-loop probe", uuid, version, min_engine_version: [1, 26, 0] },
    modules: [{ type: "script", language: "javascript", entry: "scripts/main.js", uuid: moduleUuid, version }],
    dependencies: [{ module_name: "@minecraft/server", version: "2.0.0" }],
  }, null, 2) + "\n");
  return dir;
};

const resourcePack = ({ uuid, moduleUuid, version }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "probe-rp-"));
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({
    format_version: 2,
    header: { name: "probe resource pack", description: "dev-loop probe", uuid, version, min_engine_version: [1, 26, 0] },
    modules: [{ type: "resources", uuid: moduleUuid, version }],
  }, null, 2) + "\n");
  return dir;
};

const deploy = (localDir, poolDir, uuid) => {
  compose("exec", "-T", "bedrock", "rm", "-rf", `${poolDir}/${uuid}`);
  compose("exec", "-T", "bedrock", "mkdir", "-p", `${poolDir}/${uuid}`);
  compose("cp", localDir + "/.", `bedrock:${poolDir}/${uuid}`);
};

/** Rewrite just the script file of a pack already in the pool, so a reload has something new. */
const putScript = (uuid, line) => {
  const tmp = path.join(DIR, ".main.js");
  fs.writeFileSync(tmp, `console.warn("[probe] ${line}");\n`);
  compose("cp", tmp, `bedrock:${BP_POOL}/${uuid}/scripts/main.js`);
  fs.rmSync(tmp);
  log(`  rewrote pack ${uuid.slice(0, 8)}'s script to log "${line}"`);
};

const putList = (file, entries) => {
  const tmp = path.join(DIR, `.${file}`);
  fs.writeFileSync(tmp, JSON.stringify(entries, null, 2) + "\n");
  compose("cp", tmp, `bedrock:${WORLD}/${file}`);
  fs.rmSync(tmp);
  log(`  wrote ${WORLD}/${file} = ${JSON.stringify(entries)}`);
};

/** Restart; return the Pack Stack lines and [probe] script lines the fresh world load emitted. */
const restart = () => {
  const before = logs().length;
  compose("restart", "bedrock");
  for (let i = 0; i < 90; i++) {
    const lines = logs().slice(before);
    if (lines.some((l) => l.includes("Server started")) && lines.some((l) => l.includes("Pack Stack"))) {
      sleep(15000);   // scripts evaluate several seconds after the world load line
      const after = logs().slice(before);
      return after.filter((l) => l.includes("Pack Stack") || l.includes("[Scripting]"));
    }
    sleep(2000);
  }
  return ["<timed out waiting for a Pack Stack line>"];
};

/** Re-evaluate scripts in place; return every line the reload emitted. */
const reload = () => {
  const before = logs().length;
  tryCompose("exec", "-T", "bedrock", "send-command", "reload");
  for (let i = 0; i < 15; i++) {           // up to 30s; a re-evaluation lands in ~2s when it happens
    sleep(2000);
    if (logs().slice(before).some((l) => l.includes("[Scripting]"))) { sleep(3000); break; }
  }
  return logs().slice(before).filter((l) => l.trim() && (l.includes("Pack Stack") || l.includes("reloaded") || l.includes("[Scripting]")));
};

const step = (title, fn) => { log(`\n=== ${title}`); fn(); };

// ---------------------------------------------------------------- bring the server up
log("=== environment");
log(execFileSync("docker", ["compose", "version"], { encoding: "utf8" }).trim());
log(execFileSync("docker", ["version", "--format", "Docker Engine {{.Server.Version}}"], { encoding: "utf8" }).trim());
log(`DOCKER_HOST=${process.env.DOCKER_HOST ?? "(local socket)"}`);
compose("down", "-v");
compose("up", "-d");
for (let i = 0; i < 90; i++) { if (logs().some((l) => l.includes("Server started"))) break; sleep(2000); }
log(logs().filter((l) => l.includes("Version")).slice(0, 1).join("").trim());
log(`pack1 = ${PACK1}   pack2 = ${PACK2}   resource pack = ${RPACK}`);

step("D0 — what the image put under /data before any deploy", () => {
  log(compose("exec", "-T", "bedrock", "ls", "-1", "/data").trim());
  log(`  ${WORLD}:`);
  log(compose("exec", "-T", "bedrock", "ls", "-1", WORLD).trim());
});

// ---------------------------------------------------------------- A. the version form
const versionCases = [
  { name: "A1 fv2, header version [1,0,0], entry [1,0,0]  (baseline)", fv: 2, version: [1, 0, 0], entry: [1, 0, 0] },
  { name: "A2 fv2, header version \"1.0.0\", entry [1,0,0]", fv: 2, version: "1.0.0", entry: [1, 0, 0] },
  { name: "A3 fv2, header version \"1.0.0\", entry \"1.0.0\"", fv: 2, version: "1.0.0", entry: "1.0.0" },
  { name: "A4 fv2, header version \"1.2.0-beta.1\", entry [1,2,0]", fv: 2, version: "1.2.0-beta.1", entry: [1, 2, 0] },
  { name: "A5 fv2, header version \"1.2.0-beta.1\", entry \"1.2.0-beta.1\"", fv: 2, version: "1.2.0-beta.1", entry: "1.2.0-beta.1" },
  { name: "A6 fv3, header version \"1.0.0\", entry [1,0,0]", fv: 3, version: "1.0.0", entry: [1, 0, 0] },
  { name: "A7 fv3, header version \"1.0.0\", entry \"1.0.0\"", fv: 3, version: "1.0.0", entry: "1.0.0" },
];

for (const c of versionCases) {
  step(c.name, () => {
    const dir = behaviorPack({ uuid: PACK1, moduleUuid: PACK1_MOD, tag: "pack1", formatVersion: c.fv, version: c.version });
    deploy(dir, BP_POOL, PACK1);
    fs.rmSync(dir, { recursive: true });
    log(`  pool manifest header.version = ${JSON.stringify(c.version)} (format_version ${c.fv})`);
    putList("world_behavior_packs.json", [{ pack_id: PACK1, version: c.entry }]);
    log(restart().join("\n").trimEnd() || "  <no Pack Stack or [probe] line>");
  });
}

// ---------------------------------------------------------------- back to a known-good state
step("A8 back to the baseline, so B and C start from a loaded pack", () => {
  const dir = behaviorPack({ uuid: PACK1, moduleUuid: PACK1_MOD, tag: "pack1", formatVersion: 2, version: [1, 0, 0] });
  deploy(dir, BP_POOL, PACK1);
  fs.rmSync(dir, { recursive: true });
  putList("world_behavior_packs.json", [{ pack_id: PACK1, version: [1, 0, 0] }]);
  log(restart().join("\n").trimEnd());
  log("  activation list as the server left it:");
  log("  " + compose("exec", "-T", "bedrock", "cat", `${WORLD}/world_behavior_packs.json`).trim().replace(/\n/g, "\n  "));
});

// ---------------------------------------------------------------- B. list edit without a restart
// A reload does not re-log an unchanged script, so each step edits the script first: a line that
// appears proves the pack was still loaded at the moment of the reload.
step("B1 edit the script of a listed, loaded pack and reload — no restart", () => {
  putScript(PACK1, "pack1: EDITED-while-listed");
  log("  reload emitted:");
  log(reload().join("\n").trimEnd() || "  <nothing>");
});

step("B2 empty the activation list, edit the script again, reload — still no restart", () => {
  putList("world_behavior_packs.json", []);
  putScript(PACK1, "pack1: EDITED-while-delisted");
  log("  reload emitted:");
  log(reload().join("\n").trimEnd() || "  <nothing>");
  log("  (an EDITED-while-delisted line means the pack was still live, so the list edit did not take effect)");
});

step("B3 restart, so the emptied list is read at world load", () => {
  log(restart().join("\n").trimEnd() || "  <no Pack Stack or [Scripting] line>");
});

step("B4 put pack1 back in the list and restart", () => {
  putList("world_behavior_packs.json", [{ pack_id: PACK1, version: [1, 0, 0] }]);
  log(restart().join("\n").trimEnd() || "  <no Pack Stack or [Scripting] line>");
});

// ---------------------------------------------------------------- C. a newly pooled pack
step("C1 copy pack2 into the pool and list it, do NOT restart, then reload", () => {
  const dir = behaviorPack({ uuid: PACK2, moduleUuid: PACK2_MOD, tag: "pack2", formatVersion: 2, version: [1, 0, 0] });
  deploy(dir, BP_POOL, PACK2);
  fs.rmSync(dir, { recursive: true });
  putList("world_behavior_packs.json", [
    { pack_id: PACK1, version: [1, 0, 0] },
    { pack_id: PACK2, version: [1, 0, 0] },
  ]);
  log("  reload emitted:");
  log(reload().join("\n").trimEnd() || "  <nothing>");
  log("  (a pack2 line here would mean a console reload can pool a pack live)");
});

step("C2 restart, so the newly pooled pack is read at world load", () => {
  log(restart().join("\n").trimEnd() || "  <no Pack Stack or [probe] line>");
});

// ---------------------------------------------------------------- E. what a reload re-evaluates
step("E0 deploy a pack whose entry imports a helper, and load it", () => {
  const dir = graphPack({ uuid: PACK1, moduleUuid: PACK1_MOD, tag: "graph", helperValue: "ORIGINAL" });
  deploy(dir, BP_POOL, PACK1);
  fs.rmSync(dir, { recursive: true });
  putList("world_behavior_packs.json", [{ pack_id: PACK1, version: [1, 0, 0] }]);
  log(restart().join("\n").trimEnd());
});

step("E1 edit ONLY the entry file, then reload — no restart", () => {
  putFile(PACK1, "scripts/main.js",
    `console.warn("[probe] graph: entry ran");\nimport { value } from "./helper.js";\nconsole.warn("[probe] graph: ENTRY-EDITED value=" + value);\n`);
  log("  reload emitted:");
  log(reload().join("\n").trimEnd() || "  <nothing>");
  log("  (no ENTRY-EDITED line means a reload does not re-evaluate an edited entry file)");
});

step("E2 edit an IMPORTED file, then reload — no restart", () => {
  putFile(PACK1, "scripts/helper.js", `export const value = "HELPER-EDITED";\n`);
  log("  reload emitted:");
  log(reload().join("\n").trimEnd() || "  <nothing>");
  log("  (a HELPER-EDITED line means a reload does re-evaluate when an imported file changes)");
});

step("E3 restart, showing both edits were on disk all along", () => {
  log(restart().join("\n").trimEnd());
});

// ---------------------------------------------------------------- D. the resource-pack side
step("D1 deploy a resource pack to /data/development_resource_packs and list it", () => {
  const dir = resourcePack({ uuid: RPACK, moduleUuid: RPACK_MOD, version: [1, 0, 0] });
  compose("exec", "-T", "bedrock", "mkdir", "-p", RP_POOL);
  deploy(dir, RP_POOL, RPACK);
  fs.rmSync(dir, { recursive: true });
  putList("world_resource_packs.json", [{ pack_id: RPACK, version: [1, 0, 0] }]);
  log(restart().join("\n").trimEnd() || "  <no Pack Stack or [probe] line>");
  log("  world directory after the resource deploy:");
  log("  " + compose("exec", "-T", "bedrock", "ls", "-1", WORLD).trim().replace(/\n/g, "\n  "));
  log("  world_resource_packs.json as the server left it:");
  log("  " + tryCompose("exec", "-T", "bedrock", "cat", `${WORLD}/world_resource_packs.json`).trim().replace(/\n/g, "\n  "));
  log("  /data after the resource deploy:");
  log("  " + compose("exec", "-T", "bedrock", "ls", "-1", "/data").trim().replace(/\n/g, "\n  "));
});

step("D2 does compose cp read back out of the container, against this remote daemon?", () => {
  const back = path.join(DIR, ".readback");
  fs.rmSync(back, { recursive: true, force: true });
  const r = tryCompose("cp", `bedrock:${WORLD}/world_behavior_packs.json`, back);
  log(`  compose cp container->host: ${r.trim() || "(no output)"}`);
  log(`  file arrived on the host: ${fs.existsSync(back)}`);
  if (fs.existsSync(back)) { log("  contents: " + fs.readFileSync(back, "utf8").trim()); fs.rmSync(back); }
  log(`  exec ls of the pool: ${compose("exec", "-T", "bedrock", "ls", "-1", BP_POOL).trim().replace(/\n/g, ", ")}`);
  log(`  exec cat of the list: ${compose("exec", "-T", "bedrock", "cat", `${WORLD}/world_behavior_packs.json`).trim().replace(/\n/g, " ")}`);
});

log("\n=== done");
compose("down", "-v");
