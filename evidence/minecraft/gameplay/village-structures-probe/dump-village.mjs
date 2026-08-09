// Dumps a Bedrock world's village records out of its LevelDB.
//
//   node dump-village.mjs <world-dir> [--all-keys]
//
// The world directory is a *snapshot* taken under `save hold` / `save query` / `save resume`, with
// every file truncated to the byte length `save query` named — see `run.mjs`. Reading a live
// database instead can hand back an inconsistent view.
//
// Bedrock's LevelDB uses zlib raw compression, which no pure-JS reader handles, so this needs the
// native `leveldb-zlib`. It is not vendored here; install it beside the probe and point
// `LDB_MODULES` at the `node_modules` holding it:
//
//   mkdir /tmp/ldb && cd /tmp/ldb && npm init -y && npm i leveldb-zlib prismarine-nbt
//   LDB_MODULES=/tmp/ldb/node_modules node dump-village.mjs <world-dir>
//
// `leveldb-zlib` builds with cmake-js and needs a cmake older than 4 (4.x refuses its
// CMakeLists); `pip install cmake==3.31.6` in a venv supplies one.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const MODULES = process.env.LDB_MODULES;
const require = createRequire(MODULES ? path.join(MODULES, "/") : import.meta.url);
const { LevelDB } = require("leveldb-zlib");
const nbt = require("prismarine-nbt");

const world = process.argv[2];
const allKeys = process.argv.includes("--all-keys");
if (!world) { console.error("usage: node dump-village.mjs <world-dir> [--all-keys]"); process.exit(2); }

const printable = (buf) => {
  const s = buf.toString("utf8");
  return /^[\x20-\x7e]+$/.test(s) ? s : null;
};

// Village records are NBT; the rest of the keyspace is chunk data this probe does not read.
const simplify = (v) => {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(simplify);
  if (typeof v === "object") {
    if ("type" in v && "value" in v) {
      if (v.type === "compound") return simplify(v.value);
      if (v.type === "list") return simplify(v.value.value ?? []);
      if (v.type === "long" && Array.isArray(v.value)) {
        return (BigInt(v.value[0] >>> 0) * 4294967296n + BigInt(v.value[1] >>> 0)).toString();
      }
      return simplify(v.value);
    }
    const out = {};
    for (const [k, x] of Object.entries(v)) out[k] = simplify(x);
    return out;
  }
  return v;
};

const main = async () => {
  const db = new LevelDB(path.join(world, "db"), { createIfMissing: false });
  await db.open();
  const it = db.getIterator({ keys: true, values: true });
  const villages = new Map();
  const otherAscii = new Map();
  let total = 0;
  for await (const [k, v] of it) {
    total++;
    const s = printable(k);
    if (!s) continue;
    const m = /^VILLAGE_(.+?)_([A-Z]+)$/.exec(s);
    if (m) {
      const [, id, kind] = m;
      let parsed = null, err = null;
      try { parsed = simplify((await nbt.parse(v, "little")).parsed); } catch (e) { err = String(e?.message ?? e); }
      if (!villages.has(id)) villages.set(id, {});
      villages.get(id)[kind] = { bytes: v.length, nbt: parsed, parseError: err };
    } else {
      otherAscii.set(s, v.length);
    }
  }
  await db.close();

  const out = {
    world,
    totalKeys: total,
    villageCount: villages.size,
    villages: Object.fromEntries(villages),
    asciiKeys: allKeys ? Object.fromEntries(otherAscii) : [...otherAscii.keys()].sort(),
  };
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
};

main().catch((e) => { console.error("DUMP-FAILED", e); process.exit(1); });
