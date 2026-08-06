// What does a Bedrock server do with the `level-seed` it is given?
//
//   node run.mjs            # writes OUTPUT.txt beside this file
//
// No official source states a numeric range: Microsoft's property reference, the how-to shipped with
// the server, and the shipped server.properties all say only "any string". So the range, and what
// happens outside it, are measured here.
//
// Each case generates a world from scratch under one `level-seed` and reads the seed the world
// actually kept — `RandomSeed`, a little-endian TAG_Long in the world's level.dat, found by its tag
// name rather than by parsing the whole NBT document.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "OUTPUT.txt");
fs.writeFileSync(OUT, "");
const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const compose = (args, env) =>
  execFileSync("docker", ["compose", "-f", path.join(DIR, "compose.yaml"), ...args],
    { encoding: "utf8", maxBuffer: 64 << 20, env: { ...process.env, ...(env ?? {}) } });
const logs = () => compose(["logs", "--no-log-prefix", "bedrock"]).split("\n");
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** RandomSeed out of a Bedrock level.dat: 0x04, name length 10 LE, "RandomSeed", then 8 bytes LE. */
const readRandomSeed = (file) => {
  const b = fs.readFileSync(file);
  const name = Buffer.from("RandomSeed", "ascii");
  for (let i = 0; i + 13 + 8 <= b.length; i++) {
    if (b[i] === 0x04 && b.readUInt16LE(i + 1) === 10 && b.subarray(i + 3, i + 13).equals(name))
      return b.readBigInt64LE(i + 13).toString();
  }
  return "<RandomSeed not found>";
};

const CASES = ["12345", "-12345", "0", "2147483647", "9223372036854775807",
               "-9223372036854775808", "9223372036854775808", "-9223372036854775809",
               "hello", "007", ""];

log("=== environment");
log(execFileSync("docker", ["compose", "version"], { encoding: "utf8" }).trim());
log(execFileSync("docker", ["version", "--format", "Docker Engine {{.Server.Version}}"], { encoding: "utf8" }).trim());
log(`DOCKER_HOST=${process.env.DOCKER_HOST ?? "(local socket)"}`);
log("");
log("Each case: a world generated from scratch, then the RandomSeed its level.dat kept.");

for (const seed of CASES) {
  compose(["down", "-v"]);
  compose(["up", "-d"], { LEVEL_SEED: seed });
  for (let i = 0; i < 90; i++) { sleep(2000); if (logs().some((l) => l.includes("Server started"))) break; }
  sleep(3000);
  const props = compose(["exec", "-T", "bedrock", "sh", "-c", "grep '^level-seed' /data/server.properties"]).trim();
  const local = path.join(DIR, ".level.dat");
  fs.rmSync(local, { force: true });
  compose(["cp", "bedrock:/data/worlds/dev/level.dat", local]);
  const kept = readRandomSeed(local);
  fs.rmSync(local, { force: true });
  log(`\nlevel-seed=${JSON.stringify(seed)}`);
  log(`  server.properties: ${props}`);
  log(`  world kept RandomSeed: ${kept}`);
}

log("\n=== done");
compose(["down", "-v"]);
