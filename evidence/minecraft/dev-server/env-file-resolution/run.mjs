// Probes where compose reads its default `.env` from when invoked with `-f <path>`, and what
// else `--project-directory` rebases besides `develop.watch` paths.
//
//   node run.mjs            # writes OUTPUT.txt beside this file
//
// Needs no daemon — every case is `compose config`, which resolves without starting anything.
// The tree is built under work/: a cwd (run-from/) holding .env, and a project/ holding
// compose.yaml plus its own .env, so "beside the compose file" and "in the cwd" are distinct.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.join(DIR, "work");
const OUT = path.join(DIR, "OUTPUT.txt");

fs.writeFileSync(OUT, "");
const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };

const CWD = path.join(WORK, "run-from");
const PROJ = path.join(WORK, "project");

const build = ({ besideCompose }) => {
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(CWD, { recursive: true });
  fs.mkdirSync(path.join(PROJ, "svc-env"), { recursive: true });
  fs.mkdirSync(path.join(CWD, "svc-env"), { recursive: true });
  fs.copyFileSync(path.join(DIR, "compose.yaml"), path.join(PROJ, "compose.yaml"));

  fs.writeFileSync(path.join(CWD, ".env"), "MINECRAFT_SERVER_NAME=from-cwd\n");
  if (besideCompose) fs.writeFileSync(path.join(PROJ, ".env"), "MINECRAFT_SERVER_NAME=beside-compose\n");

  // an env_file and a volume source, both written relative in compose.yaml, resolved
  // differently depending on what compose treats as the project directory
  fs.writeFileSync(path.join(PROJ, "svc-env/extra.env"), "WHICH_ENV_FILE=beside-compose\n");
  fs.writeFileSync(path.join(CWD, "svc-env/extra.env"), "WHICH_ENV_FILE=from-cwd\n");
};

const config = (label, extra) => {
  const args = ["compose", "--ansi", "never", ...extra, "-f", path.join(PROJ, "compose.yaml"), "config"];
  let out;
  try { out = execFileSync("docker", args, { cwd: CWD, encoding: "utf8", maxBuffer: 16 << 20 }); }
  catch (e) { out = `<exit ${e.status}>\n${(e.stdout ?? "") + (e.stderr ?? "")}`; }
  log(`\n--- ${label}`);
  log(`  argv: docker ${args.map((a) => a.replace(WORK, "<work>")).join(" ")}   (cwd = <work>/run-from)`);
  for (const line of out.split("\n"))
    if (/SERVER_NAME|WHICH_ENV_FILE|source:|target:|path:|exit /.test(line)) log(`  ${line.replace(WORK, "<work>").trimEnd()}`);
};

log("=== environment");
log(execFileSync("docker", ["compose", "version"], { encoding: "utf8" }).trim());
log(`DOCKER_HOST=${process.env.DOCKER_HOST ?? "(local socket)"}`);
log(`
The compose file substitutes MINECRAFT_SERVER_NAME (default "dev-behavior-packs") and also
declares a relative env_file (./svc-env/extra.env), a relative volume source (./svc-env) and
a relative develop.watch path (./svc-env). Two .env candidates exist: one in the cwd
(from-cwd) and, in part A only, one beside the compose file (beside-compose).`);

log("\n=== A. a .env sits beside the compose file AND in the cwd");
build({ besideCompose: true });
config("-f alone", []);
config("--project-directory .", ["--project-directory", "."]);
config("--env-file .env", ["--env-file", ".env"]);

log("\n=== B. a .env sits only in the cwd (none beside the compose file)");
build({ besideCompose: false });
config("-f alone", []);
config("--project-directory .", ["--project-directory", "."]);
config("--env-file .env", ["--env-file", ".env"]);

fs.rmSync(WORK, { recursive: true, force: true });
log("\n=== done");
