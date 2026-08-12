// Identifier-withdrawal probe: what becomes of a saved entity when the identifier it was spawned
// under stops resolving.
//
//   scriptevent probe:spawn <label>    build arena, spawn the subjects, record their ids
//   scriptevent probe:census <label>   census the arena and the whole dimension
//   scriptevent probe:tryspawn <label> attempt to spawn each identifier, report, remove
//
// Everything goes to console.warn so a dedicated server collects it in the content log with no
// client attached.
import { world, system } from "@minecraft/server";

const TAG = "[probe] ";
const OVERWORLD = "minecraft:overworld";
const IDS = ["probe:subject", "probe:plain", "probe:renamed", "probe:plain_renamed"];
const PROP = "probe:saved_ids";

const say = (s) => console.warn(`${TAG}${s}`);
const wait = (n) => system.waitTicks(n);

const read = (fn) => {
  try {
    return { ok: true, v: fn() };
  } catch (e) {
    return { ok: false, v: undefined, err: `${e?.name ?? "Error"}: ${e?.message ?? e}` };
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
  A = { d, x, y, z, centre: { x: x + 0.5, y, z: z + 0.5 }, at: (dx = 0) => ({ x: x + 0.5 + dx, y, z: z + 0.5 }) };
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

const loc = (e) => {
  const l = read(() => e.location);
  return l.ok ? `(${l.v.x.toFixed(2)},${l.v.y.toFixed(2)},${l.v.z.toFixed(2)})` : `threw ${l.err}`;
};

const describe = (label, i, e) => {
  say(`${label} :: entity[${i}] typeId=${txt(read(() => e.typeId))} id=${txt(read(() => e.id))} nameTag=${JSON.stringify(read(() => e.nameTag).v ?? null)} loc=${loc(e)} isValid=${txt(read(() => e.isValid))}`);
};

const census = async (label) => {
  const { d, centre } = arena();
  cmd(`tickingarea add circle ${arena().x} ${arena().y} ${arena().z} 4 probearea`);
  await wait(40);

  const floor = read(() => d.getBlock({ x: arena().x, y: arena().y - 1, z: arena().z })?.typeId);
  say(`${label} :: arena centre=(${arena().x},${arena().y},${arena().z}) floor=${txt(floor)}`);

  const all = read(() => [...d.getEntities()]);
  say(`${label} :: dimension.getEntities().length=${all.ok ? all.v.length : `threw ${all.err}`}`);
  if (all.ok) all.v.forEach((e, i) => describe(label, i, e));

  const near = read(() => d.getEntities({ location: centre, maxDistance: 24 }));
  say(`${label} :: getEntities({location:centre,maxDistance:24}).length=${near.ok ? near.v.length : `threw ${near.err}`}`);

  for (const id of IDS) {
    const r = read(() => d.getEntities({ type: id }).length);
    say(`${label} :: getEntities({type:"${id}"}).length=${txt(r)}`);
  }
  const fam = read(() => d.getEntities({ families: ["probe_family"] }).length);
  say(`${label} :: getEntities({families:["probe_family"]}).length=${txt(fam)}`);
  const cows = read(() => d.getEntities({ type: "minecraft:cow" }).length);
  say(`${label} :: getEntities({type:"minecraft:cow"}).length=${txt(cows)}`);

  for (const id of IDS) {
    const r = read(() => d.runCommand(`testfor @e[type=${id}]`).successCount);
    say(`${label} :: cmd testfor @e[type=${id}] successCount=${txt(r)}`);
  }
  say(`${label} :: cmd testfor @e[family=probe_family] successCount=${txt(read(() => d.runCommand(`testfor @e[family=probe_family]`).successCount))}`);
  say(`${label} :: cmd testfor @e[name=NamedSubject] successCount=${txt(read(() => d.runCommand(`testfor @e[name=NamedSubject]`).successCount))}`);

  const saved = read(() => world.getDynamicProperty(PROP));
  say(`${label} :: dynamicProperty ${PROP}=${txt(saved)}`);
  if (saved.ok && typeof saved.v === "string") {
    for (const rec of JSON.parse(saved.v)) {
      const got = read(() => world.getEntity(rec.id));
      const e = got.ok ? got.v : undefined;
      say(`${label} :: world.getEntity(${rec.id}) [spawned as ${rec.typeId} name=${JSON.stringify(rec.nameTag)}] => ${got.ok ? (e ? `typeId=${txt(read(() => e.typeId))} nameTag=${JSON.stringify(read(() => e.nameTag).v ?? null)} loc=${loc(e)}` : "undefined") : `threw ${got.err}`}`);
    }
  }
};

const spawn = async (label) => {
  await buildArena();
  for (const e of read(() => [...arena().d.getEntities({ excludeTypes: ["minecraft:player"] })]).v ?? []) read(() => e.remove());
  await wait(10);
  const { d, at } = arena();

  const plan = [
    { id: "probe:subject", dx: -3, name: null },
    { id: "probe:subject", dx: -1.5, name: "NamedSubject" },
    { id: "probe:plain", dx: 1.5, name: null },
    { id: "probe:plain", dx: 3, name: "NamedPlain" },
    { id: "minecraft:cow", dx: 5, name: "CowControl" },
  ];
  const recs = [];
  for (const p of plan) {
    const r = read(() => d.spawnEntity(p.id, at(p.dx)));
    if (!r.ok || !r.v) { say(`${label} :: SPAWN FAILED ${p.id} ${r.ok ? "" : r.err}`); continue; }
    if (p.name) read(() => { r.v.nameTag = p.name; });
    recs.push({ id: read(() => r.v.id).v, typeId: read(() => r.v.typeId).v, nameTag: p.name });
  }
  await wait(20);
  world.setDynamicProperty(PROP, JSON.stringify(recs));
  say(`${label} :: spawned ${recs.length} recorded=${JSON.stringify(recs)}`);
  await census(label);
};

const trySpawn = async (label) => {
  const { d, at } = arena();
  for (const id of IDS) {
    const r = read(() => d.spawnEntity(id, at(8)));
    if (r.ok && r.v) {
      say(`${label} :: spawnEntity("${id}") => ok typeId=${txt(read(() => r.v.typeId))}`);
      read(() => r.v.remove());
    } else {
      say(`${label} :: spawnEntity("${id}") => ${r.ok ? "undefined" : `threw ${r.err}`}`);
    }
    await wait(5);
  }
};

system.run(() => { say(`boot :: ready`); });

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  const kinds = { "probe:spawn": spawn, "probe:census": census, "probe:tryspawn": trySpawn };
  const fn = kinds[ev.id];
  if (!fn) return;
  const label = (ev.message || "run").trim();
  system.run(async () => {
    say(`${label} :: start ${ev.id}`);
    try {
      await fn(label);
    } catch (e) {
      say(`${label} :: PROBE CRASHED ${e?.name}: ${e?.message}`);
    }
    say(`${label} :: complete`);
  });
});
