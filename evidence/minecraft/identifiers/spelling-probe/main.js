// Namespace-character probe.
//
//   scriptevent nsprobe:run <label>       # runs every case
//   scriptevent nsprobe:types <label>     # dumps every non-vanilla registered entity type
//
// For each candidate identifier: does the type register, does spawnEntity succeed, what does the
// spawned entity report as typeId, and does a @e[type=] selector match it. Everything goes to
// console.warn so the dedicated server writes it to the content log with no client attached.
import { world, system, EntityTypes } from "@minecraft/server";
import { CASES } from "./cases.js";

const TAG = "[nsprobe] ";
const OVERWORLD = "minecraft:overworld";

const say = (s) => console.warn(`${TAG}${s}`);
const wait = (n) => system.waitTicks(n);

const read = (fn) => {
  try {
    return { ok: true, v: fn() };
  } catch (e) {
    return { ok: false, v: undefined, err: `${e?.name ?? "Error"}: ${String(e?.message ?? e).replace(/\s+/g, " ")}` };
  }
};
const txt = (r) => (r.ok ? String(r.v) : `threw ${r.err}`);

let A = null;
const arena = () => {
  if (A) return A;
  const d = world.getDimension(OVERWORLD);
  const sp = world.getDefaultSpawnLocation();
  const x = Math.floor(sp.x);
  const z = Math.floor(sp.z);
  const y = 100;
  A = { d, x, y, z, at: (dx = 0) => ({ x: x + 0.5 + dx, y, z: z + 0.5 }) };
  return A;
};
const cmd = (c) => read(() => arena().d.runCommand(c));

const buildArena = async () => {
  const { d, x, y, z } = arena();
  cmd(`tickingarea add circle ${x} ${y} ${z} 4 probearea`);
  for (let attempt = 1; attempt <= 10; attempt++) {
    cmd(`gamerule sendcommandfeedback false`);
    cmd(`gamerule domobspawning false`);
    cmd(`fill ${x - 8} ${y - 1} ${z - 8} ${x + 8} ${y - 1} ${z + 8} stone`);
    cmd(`fill ${x - 8} ${y} ${z - 8} ${x + 8} ${y + 6} ${z + 8} air`);
    await wait(20);
    const floor = read(() => d.getBlock({ x, y: y - 1, z })?.typeId).v;
    if (floor === "minecraft:stone") {
      say(`arena :: built centre=(${x},${y},${z}) floor=${floor} attempts=${attempt}`);
      return true;
    }
  }
  say(`arena :: ARENA-NOT-BUILT centre=(${x},${y},${z})`);
  return false;
};

const clear = () => {
  for (const e of read(() => [...arena().d.getEntities({ excludeTypes: ["minecraft:player"] })]).v ?? []) {
    read(() => e.remove());
  }
};

const probeCase = async (label, c) => {
  const { d, at } = arena();
  const p = `${label}/${c.key}`;
  say(`${p} :: id=${c.id} ns.length=${c.ns.length} id.length=${c.id.length}`);

  const t = read(() => EntityTypes.get(c.id));
  say(`${p} :: EntityTypes.get -> ${t.ok ? (t.v === undefined ? "undefined" : `type id=${read(() => t.v.id).v}`) : `threw ${t.err}`}`);

  const sp = read(() => d.spawnEntity(c.id, at(0)));
  say(`${p} :: spawnEntity -> ${sp.ok ? "ok" : `threw ${sp.err}`}`);
  const e = sp.v;
  await wait(5);
  if (e) {
    say(`${p} :: entity.typeId=${txt(read(() => e.typeId))} valid=${txt(read(() => e.isValid))}`);
    say(`${p} :: matches(type)=${txt(read(() => e.matches({ type: c.id })))}`);
    say(`${p} :: hasTypeFamily(fam_${c.key})=${txt(read(() => e.getComponent("minecraft:type_family")?.hasTypeFamily(`fam_${c.key}`)))}`);
  }
  say(`${p} :: getEntities({type}).length=${txt(read(() => d.getEntities({ type: c.id }).length))}`);
  say(`${p} :: cmd testfor @e[type=${c.id}] successCount=${txt(read(() => d.runCommand(`testfor @e[type=${c.id}]`).successCount))}`);
  say(`${p} :: cmd testfor @e[family=fam_${c.key}] successCount=${txt(read(() => d.runCommand(`testfor @e[family=fam_${c.key}]`).successCount))}`);

  if (e) read(() => e.remove());
  await wait(2);

  const { x, y, z } = arena();
  say(`${p} :: cmd summon ${c.id} successCount=${txt(read(() => d.runCommand(`summon ${c.id} ${x} ${y} ${z}`).successCount))}`);
  await wait(5);
  say(`${p} :: after-summon getEntities({type}).length=${txt(read(() => d.getEntities({ type: c.id }).length))}`);
  clear();
  await wait(2);
  say(`${p} :: end`);
};

const dumpTypes = (label) => {
  const all = read(() => EntityTypes.getAll().map((t) => t.id));
  if (!all.ok) { say(`${label}/types :: threw ${all.err}`); return; }
  const mine = all.v.filter((id) => !id.startsWith("minecraft:"));
  say(`${label}/types :: total=${all.v.length} non-vanilla=${mine.length}`);
  for (const id of mine.sort()) say(`${label}/types :: registered=${id} length=${id.length}`);
};

// Follow-up: the query paths disagreed with the registry on uppercase, so read the two sides
// against one live entity.
const runCase = async (label) => {
  const { d, at, x, y, z } = arena();
  const p = `${label}/case`;
  clear();
  await wait(5);
  for (const id of ["probe_ns:subject", "probe_ns:SubJect", "PROBE_NS:SUBJECT", "probe_ns:subJect", "ProbeNS:subject", "probens:subject"]) {
    const t = read(() => EntityTypes.get(id));
    say(`${p} :: EntityTypes.get(${id}) -> ${t.ok ? (t.v === undefined ? "undefined" : `type id=${read(() => t.v.id).v}`) : `threw ${t.err}`}`);
  }
  const e = read(() => d.spawnEntity("probe_ns:SubJect", at(0))).v;
  await wait(5);
  say(`${p} :: api-spawned typeId=${txt(read(() => e.typeId))}`);
  for (const q of ["probe_ns:SubJect", "probe_ns:subject", "PROBE_NS:SUBJECT"]) {
    say(`${p} :: with-api-spawned getEntities({type:${q}}).length=${txt(read(() => d.getEntities({ type: q }).length))}`);
  }
  say(`${p} :: with-api-spawned cmd testfor @e[type=probe_ns:subject] successCount=${txt(read(() => d.runCommand(`testfor @e[type=probe_ns:subject]`).successCount))}`);
  clear();
  await wait(5);
  say(`${p} :: cmd summon probe_ns:SubJect successCount=${txt(read(() => d.runCommand(`summon probe_ns:SubJect ${x} ${y} ${z}`).successCount))}`);
  await wait(5);
  for (const s of read(() => [...d.getEntities({ excludeTypes: ["minecraft:player"] })]).v ?? []) {
    say(`${p} :: cmd-summoned typeId=${txt(read(() => s.typeId))}`);
  }
  clear();
  say(`${p} :: end`);
};

const run = async (label) => {
  say(`${label} :: start`);
  await buildArena();
  clear();
  await wait(5);
  dumpTypes(label);
  for (const c of CASES) await probeCase(label, c);
  say(`${label} :: complete`);
};

system.run(() => say(`boot :: ready cases=${CASES.length}`));

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id !== "nsprobe:run" && ev.id !== "nsprobe:types" && ev.id !== "nsprobe:case") return;
  const label = (ev.message || "run").trim();
  system.run(async () => {
    try {
      if (ev.id === "nsprobe:types") { dumpTypes(label); say(`${label} :: complete`); return; }
      if (ev.id === "nsprobe:case") { say(`${label} :: start`); await buildArena(); await runCase(label); say(`${label} :: complete`); return; }
      await run(label);
    } catch (e) {
      say(`${label} :: PROBE CRASHED ${e?.name}: ${String(e?.message).replace(/\s+/g, " ")}`);
      say(`${label} :: complete`);
    }
  });
});
