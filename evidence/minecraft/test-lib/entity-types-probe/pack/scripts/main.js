// mc-test-lib entity-type registry probes.
//
// One set, etreg:registry, answering what `EntityTypes` actually reports — the surface
// `mc-test-lib` declares and throws on today, and that a pack asking "is this type registered in
// this world" has to read:
//
//   what a registered vanilla id returns, and what an EntityType carries
//   what an id nothing registers returns — a value, undefined, or a throw
//   whether a bare id resolves where the prefixed one does
//   whether a type this pack itself defines is in the registry, and when
//   what getAll returns, and whether its entries are the objects get returns
//   what the arity and argument-type guards do
//
// A second reading is taken at module evaluation, before world load, so the answer for a test that
// reaches the registry from pack startup is separable from one taken mid-world.
//
// Every line goes to console.warn, so a dedicated server collects them from the content log with no
// client attached. Probes report what the engine did; nothing here asserts what it should do.
import { world, system, EntityTypes } from "@minecraft/server";

const TAG = "[etreg] ";
const say = (probe, s) => console.warn(`${TAG}${probe} :: ${s}`);

/** A value rendered so `undefined`, `null` and a real object stay distinguishable in the log. */
const val = (v) => {
  if (v === undefined) return "undefined";
  if (v === null) return "null";
  if (typeof v === "object") return `object<${v?.constructor?.name ?? "?"}>`;
  if (typeof v === "string") return `string:${JSON.stringify(v)}`;
  return `${typeof v}:${v}`;
};

const read = (fn) => {
  try {
    const v = fn();
    return { ok: true, v, text: `returned ${val(v)}` };
  } catch (e) {
    return { ok: false, v: undefined, text: `threw ${e?.name ?? "Error"}: ${e?.message ?? e}` };
  }
};

/** Every enumerable and declared member of an object, own and inherited, with its kind. */
const shapeOf = (o) => {
  if (o === undefined || o === null || typeof o !== "object") return val(o);
  const seen = [];
  let cursor = o;
  let depth = 0;
  while (cursor && cursor !== Object.prototype && depth < 5) {
    for (const key of Object.getOwnPropertyNames(cursor)) {
      if (key === "constructor") continue;
      const d = Object.getOwnPropertyDescriptor(cursor, key);
      const kind = d.get ? "getter" : typeof d.value === "function" ? "method" : "value";
      const shown = kind === "value" ? `=${val(d.value)}` : "";
      seen.push(`${key}(${depth === 0 ? "own" : `proto${depth}`},${kind})${shown}`);
    }
    cursor = Object.getPrototypeOf(cursor);
    depth++;
  }
  return `ctor=${o?.constructor?.name ?? "?"} members=[${seen.join(" ")}]`;
};

// -------------------------------------------------------- reading at module evaluation

// Taken before any world-load event: a pack's startup code is exactly where mc-test-lib's ruling
// assumed the registry would be read from, so whether it answers there is its own question.
const AT_MODULE_EVAL = {
  vanilla: read(() => EntityTypes.get("minecraft:sheep")),
  custom: read(() => EntityTypes.get("mctest:probe_dummy")),
  absent: read(() => EntityTypes.get("mctest:nothing_registers_this")),
  all: read(() => EntityTypes.getAll()),
};

// The two events a pack's own startup code runs in, so "when does the registry answer" is measured
// at each of the three points a pack has rather than only mid-world.
const AT_EVENT = {};
system.beforeEvents.startup.subscribe(() => {
  AT_EVENT.startup = read(() => EntityTypes.get("minecraft:sheep"));
  AT_EVENT.startupCustom = read(() => EntityTypes.get("mctest:probe_dummy"));
  AT_EVENT.startupAll = read(() => EntityTypes.getAll());
});
world.afterEvents.worldLoad.subscribe(() => {
  AT_EVENT.worldLoad = read(() => EntityTypes.get("minecraft:sheep"));
  AT_EVENT.worldLoadCustom = read(() => EntityTypes.get("mctest:probe_dummy"));
  AT_EVENT.worldLoadAll = read(() => EntityTypes.getAll());
});

const runStartupReadings = () => {
  for (const name of [
    "startup",
    "startupCustom",
    "startupAll",
    "worldLoad",
    "worldLoadCustom",
    "worldLoadAll",
  ]) {
    const r = AT_EVENT[name];
    if (!r) {
      say("at-event", `case=${name} NOT REACHED — the event did not fire`);
      continue;
    }
    const extra = r.ok && Array.isArray(r.v) ? ` length=${r.v.length}` : "";
    say("at-event", `case=${name} ${r.text}${extra}`);
  }
};

// ------------------------------------------------------------------------ the cases

const ID_CASES = [
  ["registered-vanilla-prefixed", "minecraft:sheep"],
  ["registered-vanilla-bare", "sheep"],
  ["registered-vanilla-second", "minecraft:zombie"],
  ["pack-defined-prefixed", "mctest:probe_dummy"],
  ["pack-defined-bare", "probe_dummy"],
  ["absent-namespaced", "mctest:nothing_registers_this"],
  ["absent-bare", "nothing_registers_this"],
  ["absent-minecraft-namespace", "minecraft:nothing_registers_this"],
  ["empty-string", ""],
  ["prefix-only", "minecraft:"],
  ["whitespace", " minecraft:sheep "],
  ["case-mismatch", "minecraft:Sheep"],
];

const runIdCases = () => {
  for (const [name, id] of ID_CASES) {
    const r = read(() => EntityTypes.get(id));
    const idField = r.ok && r.v !== undefined && r.v !== null ? read(() => r.v.id).text : "n/a";
    say("get", `case=${name} argument=${JSON.stringify(id)} ${r.text} .id ${idField}`);
  }
};

const runArgumentGuards = () => {
  const cases = [
    ["no-argument", () => EntityTypes.get()],
    ["two-arguments", () => EntityTypes.get("minecraft:sheep", "extra")],
    ["undefined", () => EntityTypes.get(undefined)],
    ["null", () => EntityTypes.get(null)],
    ["number", () => EntityTypes.get(42)],
    ["object", () => EntityTypes.get({ id: "minecraft:sheep" })],
    ["getall-one-argument", () => EntityTypes.getAll("minecraft:sheep")],
  ];
  for (const [name, fn] of cases) {
    const r = read(fn);
    const extra = r.ok && Array.isArray(r.v) ? ` length=${r.v.length}` : "";
    say("guard", `case=${name} ${r.text}${extra}`);
  }
};

const runShape = () => {
  const sheep = read(() => EntityTypes.get("minecraft:sheep"));
  say("shape", `subject=minecraft:sheep ${sheep.text}`);
  if (sheep.ok && sheep.v) say("shape", `subject=minecraft:sheep ${shapeOf(sheep.v)}`);

  const custom = read(() => EntityTypes.get("mctest:probe_dummy"));
  say("shape", `subject=mctest:probe_dummy ${custom.text}`);
  if (custom.ok && custom.v) say("shape", `subject=mctest:probe_dummy ${shapeOf(custom.v)}`);

  // identity across two lookups: whether a registry entry is one stable object or rebuilt per call
  const a = read(() => EntityTypes.get("minecraft:sheep")).v;
  const b = read(() => EntityTypes.get("minecraft:sheep")).v;
  say("shape", `identity-across-calls same-object=${a === b}`);

  // whether the bare form, when it resolves at all, lands on the same entry as the prefixed one
  const bare = read(() => EntityTypes.get("sheep")).v;
  say("shape", `identity-bare-vs-prefixed same-object=${bare === a} bare=${val(bare)}`);
};

const runGetAll = () => {
  const all = read(() => EntityTypes.getAll());
  say("getall", all.text);
  if (!all.ok || !all.v) return;

  const list = [...all.v];
  const ids = list.map((t) => read(() => t.id).v);
  say("getall", `count=${list.length} is-array=${Array.isArray(all.v)}`);
  say("getall", `contains-pack-defined=${ids.includes("mctest:probe_dummy")}`);
  say("getall", `contains-sheep=${ids.includes("minecraft:sheep")}`);
  say("getall", `unprefixed-ids=${ids.filter((i) => typeof i === "string" && !i.includes(":")).length}`);
  say("getall", `duplicate-ids=${ids.length - new Set(ids).size}`);

  // whether an entry from getAll is the same object get returns, or a copy
  const fromGet = read(() => EntityTypes.get("minecraft:sheep")).v;
  const fromAll = list.find((t) => read(() => t.id).v === "minecraft:sheep");
  say("getall", `entry-identity-matches-get=${fromGet === fromAll}`);

  // whether two calls hand back the same array object, and whether mutating one is visible
  const second = read(() => EntityTypes.getAll()).v;
  say("getall", `same-array-across-calls=${all.v === second} same-entry-objects=${second?.[0] === list[0]}`);

  // a sample, alphabetical, so the log carries what the registry actually holds
  const sample = ids.filter((i) => typeof i === "string").sort();
  say("getall", `first-ten=[${sample.slice(0, 10).join(" ")}]`);
  say("getall", `non-minecraft-namespaces=[${[...new Set(sample.filter((i) => !i.startsWith("minecraft:")))].join(" ")}]`);
};

const runSpawnAgreement = async () => {
  // whether the registry agrees with what the world will actually spawn: the property a pack's
  // "is this type registered" check is really asking about
  const d = world.getDimension("minecraft:overworld");
  const sp = world.getDefaultSpawnLocation();
  const x = Math.floor(sp.x);
  const z = Math.floor(sp.z);
  const y = 100;
  const at = { x: x + 0.5, y, z: z + 0.5 };
  // no client attaches, so nothing is loaded until the probe loads it itself
  const ta = read(() => d.runCommand(`tickingarea add circle ${x} ${y} ${z} 4 etreg`));
  say("spawn", `tickingarea ${ta.text} successCount=${ta.ok ? ta.v?.successCount : "n/a"}`);
  await system.waitTicks(200);
  const list = read(() => d.runCommand("tickingarea list"));
  say("spawn", `tickingarea-list successCount=${list.ok ? list.v?.successCount : list.text}`);
  const fill = read(() => d.runCommand(`fill ${x - 3} ${y - 1} ${z - 3} ${x + 3} ${y - 1} ${z + 3} stone`));
  say("spawn", `platform ${fill.text} successCount=${fill.ok ? fill.v?.successCount : "n/a"}`);
  await system.waitTicks(20);

  for (const [name, id] of [
    ["pack-defined", "mctest:probe_dummy"],
    ["vanilla", "minecraft:sheep"],
    ["absent-namespaced", "mctest:nothing_registers_this"],
    ["absent-minecraft-namespace", "minecraft:nothing_registers_this"],
    ["bare-vanilla", "sheep"],
    ["bare-pack-defined", "probe_dummy"],
  ]) {
    const lookup = read(() => EntityTypes.get(id));
    const spawn = read(() => d.spawnEntity(id, at));
    const spawned = spawn.ok && spawn.v ? read(() => spawn.v.typeId).v : "n/a";
    if (spawn.ok && spawn.v) read(() => spawn.v.remove());
    say("spawn", `case=${name} id=${id} lookup ${lookup.text} spawn ${spawn.text} typeId=${val(spawned)}`);
  }
};

const runModuleEvalReadings = () => {
  for (const [name, r] of Object.entries(AT_MODULE_EVAL)) {
    const extra = r.ok && Array.isArray(r.v) ? ` length=${r.v.length}` : "";
    say("at-module-eval", `case=${name} ${r.text}${extra}`);
  }
};

// ---------------------------------------------------------------------- the driver

const runRegistry = async () => {
  say("registry", "begin");
  runModuleEvalReadings();
  runStartupReadings();
  runIdCases();
  runArgumentGuards();
  runShape();
  runGetAll();
  await runSpawnAgreement();
  say("registry", "complete");
};

system.afterEvents.scriptEventReceive.subscribe((e) => {
  if (e.id !== "etreg:registry") return;
  runRegistry().catch((err) => say("registry", `:: PROBE CRASHED ${err?.name ?? "Error"}: ${err?.message ?? err}`));
});

world.afterEvents.worldLoad.subscribe(() => {
  say("boot", "ready");
});
