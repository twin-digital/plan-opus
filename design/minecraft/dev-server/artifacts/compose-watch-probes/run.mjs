// Probes what `develop.watch` accepts as a rule `path`: a directory, a directory that
// does not exist yet, a glob, a symlinked directory, a single file.
//
//   node run.mjs            # writes OUTPUT.txt beside this file
//
// Requires a Docker daemon (remote is fine — sync travels over the Docker API). Each case
// brings its own compose project up, attaches `compose watch --no-up`, touches files under
// the watched path, then inspects the container for what arrived.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.join(DIR, "work");
const OUT = path.join(DIR, "OUTPUT.txt");

fs.writeFileSync(OUT, "");
const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const composeArgs = (file, ...args) => ["compose", "--ansi", "never", "-f", path.join(WORK, file), ...args];
const compose = (file, ...args) => {
  try {
    return execFileSync("docker", composeArgs(file, ...args), { encoding: "utf8", maxBuffer: 64 << 20 });
  } catch (e) {
    return `<exit ${e.status}> ${(e.stdout ?? "") + (e.stderr ?? "")}`.trim();
  }
};

// run `compose watch --no-up` for the life of `fn`, returning everything it printed
const withWatcher = (file, fn) => {
  const w = spawn("docker", composeArgs(file, "watch", "--no-up"), { stdio: ["ignore", "pipe", "pipe"] });
  let buf = "";
  w.stdout.on("data", (d) => (buf += d));
  w.stderr.on("data", (d) => (buf += d));
  sleep(8000); // let the watcher attach
  try { fn(); sleep(8000); } finally { w.kill("SIGINT"); sleep(3000); w.kill("SIGKILL"); }
  return buf;
};

const inspect = (file, target) =>
  compose(file, "exec", "-T", "app", "sh", "-c", `find ${target} 2>&1 | head -20`).trim();

const cases = [];
const probe = (title, file, setup, exercise, checks) =>
  cases.push({ title, file, setup, exercise, checks });

// --- case setups (each writes its own tree under work/) -----------------------

probe(
  "directory path that exists when the watcher attaches (sync+exec)",
  "dir-sync.compose.yaml",
  () => fs.mkdirSync(path.join(WORK, "data"), { recursive: true }),
  () => {
    fs.writeFileSync(path.join(WORK, "data/one.txt"), "one\n");
    sleep(3000);
    fs.writeFileSync(path.join(WORK, "data/two.txt"), "two\n");
  },
  ["/synced", "/tmp/exec-ran"],
);

probe(
  "directory path created AFTER the watcher attaches",
  "late-dir.compose.yaml",
  () => {}, // ./late deliberately absent at attach time
  () => {
    fs.mkdirSync(path.join(WORK, "late"), { recursive: true });
    sleep(3000);
    fs.writeFileSync(path.join(WORK, "late/appeared.txt"), "appeared\n");
    sleep(3000);
    fs.writeFileSync(path.join(WORK, "late/again.txt"), "again\n");
  },
  ["/late"],
);

probe(
  "glob path and symlinked directory",
  "glob-and-symlink.compose.yaml",
  () => {
    for (const p of ["alpha", "beta"]) fs.mkdirSync(path.join(WORK, `packs-real/${p}/dist`), { recursive: true });
    fs.mkdirSync(path.join(WORK, "links"), { recursive: true });
    for (const p of ["alpha", "beta"]) fs.symlinkSync(`../packs-real/${p}/dist`, path.join(WORK, `links/${p}`));
  },
  () => {
    for (const p of ["alpha", "beta"]) fs.writeFileSync(path.join(WORK, `packs-real/${p}/dist/pack.json`), `{"p":"${p}"}\n`);
    sleep(3000);
    for (const p of ["alpha", "beta"]) fs.writeFileSync(path.join(WORK, `packs-real/${p}/dist/pack.json`), `{"p":"${p}","v":2}\n`);
  },
  ["/globbed", "/linked"],
);

probe(
  "single-file path (sync+exec)",
  "single-file.compose.yaml",
  () => {},
  () => {
    fs.writeFileSync(path.join(WORK, "gen.json"), "{}\n");
    sleep(3000);
    fs.writeFileSync(path.join(WORK, "gen.json"), '{"v":2}\n');
  },
  ["/tmp/gen.json", "/tmp/exec2-ran"],
);

// --- drive ------------------------------------------------------------------

log("=== environment");
log(execFileSync("docker", ["compose", "version"], { encoding: "utf8" }).trim());
log(execFileSync("docker", ["version", "--format", "server {{.Server.Version}}"], { encoding: "utf8" }).trim());
log(`DOCKER_HOST=${process.env.DOCKER_HOST ?? "(local socket)"}`);

for (const c of cases) {
  log(`\n=== ${c.title}`);
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(WORK, { recursive: true });
  fs.copyFileSync(path.join(DIR, c.file), path.join(WORK, c.file));
  c.setup();
  log(`  watch rules: ${fs.readFileSync(path.join(WORK, c.file), "utf8").split("watch:")[1].trim().replace(/\n\s+/g, " ")}`);
  compose(c.file, "up", "-d");
  const watcher = withWatcher(c.file, c.exercise);
  log(`  watcher output: ${JSON.stringify(watcher.trim())}`);
  for (const t of c.checks) log(`  find ${t} -> ${inspect(c.file, t)}`);
  compose(c.file, "down", "-t", "1");
}

fs.rmSync(WORK, { recursive: true, force: true });
log("\n=== done");
