// Slash-in-identifier probe.
//
//   scriptevent slprobe:run <label>
//
// Three entity definitions: a slash in the namespace half (my-rpg/spellfx:probe), a slash in the
// name half (my-rpg:spellfx/probe), and an underscore control. For each: does the type register,
// does spawnEntity succeed, what does the spawned entity report as typeId, and can the type be
// reached by getEntities({type}), Entity.matches({type}), @e[type=], and summon. Each definition
// also carries its own family token so the entity stays reachable by @e[family=] even where type
// addressing fails. Everything goes to console.warn so the dedicated server writes it to the
// content log with no client attached.
import { world, system, EntityTypes } from "@minecraft/server";

const TAG = "[slprobe] ";
const OVERWORLD = "minecraft:overworld";

const CASES = [
  { key: "ctl_underscore", id: "my_rpg_spellfx:probe", fam: "fam_ctl_underscore" },
  { key: "ns_slash", id: "my-rpg/spellfx:probe", fam: "fam_ns_slash" },
  { key: "name_slash", id: "my-rpg:spellfx/probe", fam: "fam_name_slash" },
];

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

const dumpTypes = (label) => {
  const all = read(() => EntityTypes.getAll().map((t) => t.id));
  if (!all.ok) { say(`${label}/types :: threw ${all.err}`); return; }
  const mine = all.v.filter((id) => !id.startsWith("minecraft:"));
  say(`${label}/types :: total=${all.v.length} non-vanilla=${mine.length}`);
  for (const id of mine.sort()) say(`${label}/types :: registered=${id} length=${id.length}`);
};

const probeCase = async (label, c) => {
  const { d, at, x, y, z } = arena();
  const p = `${label}/${c.key}`;
  say(`${p} :: id=${c.id}`);

  const t = read(() => EntityTypes.get(c.id));
  say(`${p} :: EntityTypes.get -> ${t.ok ? (t.v === undefined ? "undefined" : `type id=${read(() => t.v.id).v}`) : `threw ${t.err}`}`);

  const sp = read(() => d.spawnEntity(c.id, at(0)));
  say(`${p} :: spawnEntity -> ${sp.ok ? "ok" : `threw ${sp.err}`}`);
  const e = sp.v;
  await wait(5);
  if (e) {
    say(`${p} :: entity.typeId=${txt(read(() => e.typeId))} valid=${txt(read(() => e.isValid))}`);
    say(`${p} :: matches(type)=${txt(read(() => e.matches({ type: c.id })))}`);
    say(`${p} :: hasTypeFamily(${c.fam})=${txt(read(() => e.getComponent("minecraft:type_family")?.hasTypeFamily(c.fam)))}`);
  }
  say(`${p} :: getEntities({type}).length=${txt(read(() => d.getEntities({ type: c.id }).length))}`);
  const byFam = read(() => d.getEntities({ families: [c.fam] }).map((s) => s.typeId));
  say(`${p} :: getEntities({families:[${c.fam}]}) typeIds=[${byFam.ok ? byFam.v.join("|") : `threw ${byFam.err}`}]`);
  say(`${p} :: cmd testfor @e[type=${c.id}] successCount=${txt(read(() => d.runCommand(`testfor @e[type=${c.id}]`).successCount))}`);
  say(`${p} :: cmd testfor @e[family=${c.fam}] successCount=${txt(read(() => d.runCommand(`testfor @e[family=${c.fam}]`).successCount))}`);

  if (e) read(() => e.remove());
  await wait(2);

  say(`${p} :: cmd summon ${c.id} successCount=${txt(read(() => d.runCommand(`summon ${c.id} ${x} ${y} ${z}`).successCount))}`);
  await wait(5);
  say(`${p} :: after-summon getEntities({type}).length=${txt(read(() => d.getEntities({ type: c.id }).length))}`);
  for (const s of read(() => [...d.getEntities({ excludeTypes: ["minecraft:player"] })]).v ?? []) {
    say(`${p} :: after-summon present typeId=${txt(read(() => s.typeId))}`);
  }
  clear();
  await wait(2);
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
  if (ev.id !== "slprobe:run") return;
  const label = (ev.message || "run").trim();
  system.run(async () => {
    try {
      await run(label);
    } catch (e) {
      say(`${label} :: PROBE CRASHED ${e?.name}: ${String(e?.message).replace(/\s+/g, " ")}`);
      say(`${label} :: complete`);
    }
  });
});
