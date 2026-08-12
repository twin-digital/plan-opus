// Custom type-family and same-identifier provenance probe.
//
//   scriptevent probe:run <label>
//
// Spawns probe:solo (declared by pack A alone) and probe:subject (declared by pack A and pack B
// with different family tokens, health, movement, and one marker component each), then reads what
// the engine gives back. Every line goes to console.warn so a dedicated server collects it from
// the content log with no client attached.
import { world, system } from "@minecraft/server";

const TAG = "[probe] ";
const OVERWORLD = "minecraft:overworld";
const TOKENS = ["probe_token_a", "probe_token_b", "probe_shared", "probe_token_solo"];

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

const inspect = (label, e) => {
  if (!e) { say(`${label} :: SPAWN FAILED`); return; }
  say(`${label} :: typeId=${txt(read(() => e.typeId))}`);

  const fam = read(() => e.getComponent("minecraft:type_family"));
  if (!fam.ok) say(`${label} :: type_family component threw ${fam.err}`);
  else if (fam.v === undefined) say(`${label} :: type_family component=undefined`);
  else {
    const list = read(() => fam.v.getTypeFamilies());
    say(`${label} :: getTypeFamilies=[${list.ok ? list.v.join("|") : `threw ${list.err}`}]`);
    for (const t of TOKENS) {
      say(`${label} :: hasTypeFamily(${t})=${txt(read(() => fam.v.hasTypeFamily(t)))}`);
    }
  }

  for (const t of TOKENS) {
    say(`${label} :: matches(families:[${t}])=${txt(read(() => e.matches({ families: [t] })))}`);
  }
  say(`${label} :: matches(excludeFamilies:[probe_token_b])=${txt(read(() => e.matches({ excludeFamilies: ["probe_token_b"] })))}`);

  const hp = read(() => e.getComponent("minecraft:health"));
  say(`${label} :: health.effectiveMax=${txt(read(() => hp.v?.effectiveMax))} current=${txt(read(() => hp.v?.currentValue))} defaultValue=${txt(read(() => hp.v?.defaultValue))}`);
  say(`${label} :: movement.defaultValue=${txt(read(() => e.getComponent("minecraft:movement")?.defaultValue))}`);
  say(`${label} :: fire_immune(A only)=${txt(read(() => e.getComponent("minecraft:fire_immune") !== undefined))} is_baby(B only)=${txt(read(() => e.getComponent("minecraft:is_baby") !== undefined))}`);
  const ids = read(() => e.getComponents().map((c) => c.typeId).sort());
  say(`${label} :: getComponents=[${ids.ok ? ids.v.join("|") : `threw ${ids.err}`}]`);
};

const queryCounts = (label) => {
  const { d } = arena();
  for (const t of TOKENS) {
    const n = read(() => d.getEntities({ families: [t] }).length);
    say(`${label} :: getEntities(families:[${t}]).length=${txt(n)}`);
  }
  for (const t of TOKENS) {
    const r = read(() => d.runCommand(`testfor @e[family=${t}]`).successCount);
    say(`${label} :: cmd testfor @e[family=${t}] successCount=${txt(r)}`);
  }
};

const run = async (label) => {
  say(`${label} :: start`);
  await buildArena();
  clear();
  await wait(5);
  const { d, at } = arena();
  const solo = read(() => d.spawnEntity("probe:solo", at(-2))).v;
  const subject = read(() => d.spawnEntity("probe:subject", at(2))).v;
  await wait(10);
  inspect(`${label}/solo`, solo);
  inspect(`${label}/subject`, subject);
  queryCounts(label);
  say(`${label} :: complete`);
};

system.run(() => {
  say(`boot :: ready`);
});

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id !== "probe:run") return;
  const label = (ev.message || "run").trim();
  system.run(async () => {
    try {
      await run(label);
    } catch (e) {
      say(`${label} :: PROBE CRASHED ${e?.name}: ${e?.message}`);
      say(`${label} :: complete`);
    }
  });
});
