// village-guard gap probes.
//
// Five sets, each answering one open question the implementation of village-guard 004 raised:
//
//   vggap:zeroclamp   is a hit written down to 0 still a hit — does it knock back, does it raise
//                     the after-event — or does the engine read it as no hit at all
//   vggap:subclamp    does a mob already at or below the clamp die of a clamped hit, and does a
//                     zero clamp keep it alive
//   vggap:water       does beforeEvents.entityHurt fire for drowning and for suffocation, the two
//                     routes the protection probe never measured
//   vggap:restore     does the shipped pack — clamp in the before handler, resetToMaxValue in the
//                     after — actually keep a mob alive under a sustained siege
//   vggap:operator    does an operator's removal still reach through the pack: kill(), an override
//                     write, and whether either raises the before-event at all
//
// Every line goes to console.warn, so a dedicated server collects them from the content log with no
// client attached. Probes report what the engine did; nothing here asserts what it should do.
import { world, system, EntityDamageCause } from "@minecraft/server";

const TAG = "[vggap] ";
const OVERWORLD = "minecraft:overworld";
const GUARDED = ["minecraft:villager_v2", "minecraft:wandering_trader", "minecraft:iron_golem"];
const CLAMP = 0.5;

const say = (probe, s) => console.warn(`${TAG}${probe} :: ${s}`);
const wait = (n) => system.waitTicks(n);

const val = (v) => {
  if (v === undefined) return "undefined";
  if (v === null) return "null";
  if (typeof v === "number") return `number:${v}`;
  if (typeof v === "object") return "object";
  return `${typeof v}:${v}`;
};
const read = (fn) => {
  try {
    const v = fn();
    return { ok: true, v, text: `ok value=${val(v)}` };
  } catch (e) {
    return { ok: false, v: undefined, text: `threw ${e?.name ?? "Error"}: ${e?.message ?? e}` };
  }
};

const hp = (e) => read(() => e.getComponent("minecraft:health")?.currentValue).v;
const alive = (e) => read(() => e.isValid).v === true;
const speed = (e) => {
  const v = read(() => e.getVelocity()).v;
  return v ? Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) : -1;
};
const r3 = (n) => (typeof n === "number" ? Math.round(n * 1000) / 1000 : n);

// ---------------------------------------------------------------- the arena

let A = null;
const arena = () => {
  if (A) return A;
  const d = world.getDimension(OVERWORLD);
  const sp = world.getDefaultSpawnLocation();
  const x = Math.floor(sp.x);
  const z = Math.floor(sp.z);
  // a fixed altitude, not the terrain: the arena is a stone platform the probe builds itself, so
  // every case runs on the same flat ground whatever seed the world came up with
  const y = 100;
  A = { d, x, y, z, at: (dx = 0, dy = 0, dz = 0) => ({ x: x + 0.5 + dx, y: y + dy, z: z + 0.5 + dz }) };
  return A;
};

const cmd = (c) => read(() => arena().d.runCommand(c).successCount);

const prepareArena = () => {
  const { x, y, z } = arena();
  cmd(`tickingarea add circle ${x} ${y} ${z} 4 vgprobe`);
  say("arena", `ticking area requested at (${x},${y},${z})`);
};

// The fills need the chunk loaded, and at boot it is not: a set that spawns onto an unbuilt arena
// drops its subject to the terrain below and measures the fall. Every set rebuilds first and
// checks the floor is really there.
const buildArena = async () => {
  const { d, x, y, z } = arena();
  const lines = [
    `gamerule dodaylightcycle false`,
    `gamerule domobspawning false`,
    `gamerule mobgriefing false`,
    `gamerule sendcommandfeedback false`,
    `time set midnight`,
    `fill ${x - 10} ${y - 1} ${z - 10} ${x + 10} ${y - 1} ${z + 10} stone`,
    `fill ${x - 10} ${y} ${z - 10} ${x + 10} ${y + 30} ${z + 10} air`,
    // wall the platform: a panicking villager that runs off the edge dies of the fall, and a case
    // whose subject left the arena measures the drop rather than what it meant to measure
    `fill ${x - 10} ${y} ${z - 10} ${x + 10} ${y + 4} ${z - 10} stone`,
    `fill ${x - 10} ${y} ${z + 10} ${x + 10} ${y + 4} ${z + 10} stone`,
    `fill ${x - 10} ${y} ${z - 10} ${x - 10} ${y + 4} ${z + 10} stone`,
    `fill ${x + 10} ${y} ${z - 10} ${x + 10} ${y + 4} ${z + 10} stone`,
  ];
  for (let attempt = 1; attempt <= 10; attempt++) {
    for (const c of lines) cmd(c);
    await wait(20);
    const floor = read(() => d.getBlock({ x, y: y - 1, z })?.typeId).v;
    if (floor === "minecraft:stone") {
      say("arena", `built centre=(${x},${y},${z}) floor=${floor} attempts=${attempt}`);
      return true;
    }
  }
  say("arena", `ARENA-NOT-BUILT centre=(${x},${y},${z}) - every case below measures a fall, not its own source`);
  return false;
};

const clear = () => {
  const { d } = arena();
  for (const e of read(() => [...d.getEntities({ excludeTypes: ["minecraft:player"] })]).v ?? []) {
    read(() => e.remove());
  }
};

const spawn = (type, dx = 0, dy = 0, dz = 0) => {
  const { d, at } = arena();
  return read(() => d.spawnEntity(type, at(dx, dy, dz))).v;
};


// ------------------------------------------------------------ shared helpers

const setHp = (e, n) => read(() => e.getComponent("minecraft:health")?.setCurrentValue(n));
const maxHp = (e) => read(() => e.getComponent("minecraft:health")?.effectiveMax).v;
const PLAYER = "minecraft:player";
const OPERATOR_CAUSES = ["selfDestruct", "override"];

// The shipped pack's own logic, transcribed. `treat` is village-guard's, unchanged.
const treat = (typeId, src) => {
  if (!GUARDED.includes(typeId) || OPERATOR_CAUSES.includes(src.cause)) return "pass";
  return src.damagingEntity?.typeId === PLAYER ? "cancel" : "clamp";
};

// Installs the pack as it ships, scoped to one subject so a set's other cases are untouched.
const installPack = (subjectId, clamp, notes) => {
  const before = world.beforeEvents.entityHurt.subscribe((ev) => {
    try {
      if (ev.hurtEntity?.id !== subjectId) return;
      const t = treat(ev.hurtEntity.typeId, ev.damageSource);
      notes.before.push(`${ev.damageSource.cause}@${r3(ev.damage)}->${t}`);
      if (t === "cancel") ev.cancel = true;
      else if (t === "clamp" && ev.damage > clamp) ev.damage = clamp;
    } catch (e) { notes.before.push(`BEFORE-THREW:${e?.name}`); }
  });
  const after = world.afterEvents.entityHurt.subscribe((ev) => {
    try {
      if (ev.hurtEntity?.id !== subjectId) return;
      const t = treat(ev.hurtEntity.typeId, ev.damageSource);
      notes.after.push(`${ev.damageSource.cause}@${r3(ev.damage)}->${t}`);
      if (t !== "clamp") return;
      const r = read(() => ev.hurtEntity.getComponent("minecraft:health")?.resetToMaxValue());
      if (!r.ok) notes.after.push(`RESTORE-THREW:${r.text}`);
    } catch (e) { notes.after.push(`AFTER-THREW:${e?.name}`); }
  });
  return () => {
    world.beforeEvents.entityHurt.unsubscribe(before);
    world.afterEvents.entityHurt.unsubscribe(after);
  };
};

// Pens four zombies around the subject and samples its speed every tick, reporting the peak in the
// six ticks after each hit against the resting speed in the four before it — the protection probe's
// own measurement, so the numbers here compare with the ones already recorded.
const siege = async (s, ticks, onHit) => {
  for (const [dx, dz] of [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]]) {
    const z = spawn("minecraft:zombie", dx, 0, dz);
    if (z) read(() => z.addTag("vgatk"));
  }
  const samples = [];
  const hits = [];
  for (let t = 0; t < ticks; t++) {
    if (!alive(s)) break;
    samples.push(speed(s));
    const hit = onHit();
    if (hit !== undefined) hits.push({ at: samples.length - 1, label: hit });
    await wait(1);
  }
  const perHit = hits.map((h) => {
    const rest = Math.max(...samples.slice(Math.max(0, h.at - 4), h.at), 0);
    const peak = Math.max(...samples.slice(h.at, h.at + 6), 0);
    return `${h.label}:rest=${r3(rest)}->peak=${r3(peak)}`;
  });
  return { samples: samples.length, perHit, peak: r3(Math.max(...samples, 0)) };
};

// ------------------------------------------------- set: is a zero clamp a hit

// Four lanes, one subject each, all struck by penned zombies. `control` writes nothing; `clamp05`
// is the shipped constant; `clamp0` writes the damage to zero; `cancel` cancels. What separates
// them is whether the engine still treats the hit as a hit — knockback, and an after-event.
const ZERO_LANES = [
  { name: "control", apply: () => {} },
  { name: "clamp05", apply: (ev) => { if (ev.damage > 0.5) ev.damage = 0.5; } },
  { name: "clamp0", apply: (ev) => { ev.damage = 0; } },
  { name: "cancel", apply: (ev) => { ev.cancel = true; } },
];

async function setZeroClamp() {
  const probe = "zero-clamp";
  await buildArena();
  for (const lane of ZERO_LANES) {
    clear();
    await wait(4);
    const s = spawn("minecraft:villager_v2");
    if (!s) { say(probe, `[${lane.name}] SUBJECT-SPAWN-FAILED`); continue; }
    await wait(4);
    const hp0 = hp(s);
    let pending;
    const seen = [];
    const afterSeen = [];
    const before = world.beforeEvents.entityHurt.subscribe((ev) => {
      try {
        if (ev.hurtEntity?.id !== s.id) return;
        seen.push(`${ev.damageSource.cause}@${r3(ev.damage)}`);
        pending = `${ev.damageSource.cause}@${r3(ev.damage)}`;
        lane.apply(ev);
      } catch (e) { seen.push(`BEFORE-THREW:${e?.name}`); }
    });
    const after = world.afterEvents.entityHurt.subscribe((ev) => {
      try { if (ev.hurtEntity?.id === s.id) afterSeen.push(`${ev.damageSource.cause}@${r3(ev.damage)}`); }
      catch (e) { afterSeen.push(`AFTER-THREW:${e?.name}`); }
    });
    const m = await siege(s, 400, () => { const p = pending; pending = undefined; return p; });
    world.beforeEvents.entityHurt.unsubscribe(before);
    world.afterEvents.entityHurt.unsubscribe(after);
    const hp1 = hp(s);
    say(probe, `[${lane.name}] before-events=${seen.length} after-events=${afterSeen.length} ` +
      `health(${val(hp0)} -> ${val(hp1)}) health-lost=${val(typeof hp0 === "number" && typeof hp1 === "number" ? r3(hp0 - hp1) : undefined)} ` +
      `subject-alive=${alive(s)} samples=${m.samples} peak-speed-overall=${m.peak} per-hit=[${m.perHit.slice(0, 8).join(", ")}] ` +
      `delivered=[${seen.slice(0, 8).join(", ")}] verdict=SEE-NUMBERS`);
    await wait(10);
  }
  clear();
}

// ------------------------------------- set: a mob already at or below the clamp

// The gap the implementation raised: a clamped hit reaching the effective minimum is fatal, and a
// mob already at or below the clamp is there in one hit. Each case sets the subject's health, then
// deals one ordinary hit under the named treatment.
const SUB_CASES = [
  { name: "at-0.5/no-handler", start: 0.5, clamp: null },
  { name: "at-0.5/clamp-0.5", start: 0.5, clamp: 0.5 },
  { name: "at-0.5/clamp-0", start: 0.5, clamp: 0 },
  { name: "at-0.25/clamp-0.5", start: 0.25, clamp: 0.5 },
  { name: "at-0.25/clamp-0", start: 0.25, clamp: 0 },
  { name: "at-1/clamp-0.5", start: 1, clamp: 0.5 },
];

async function setSubClamp() {
  const probe = "sub-clamp";
  await buildArena();
  for (const c of SUB_CASES) {
    clear();
    await wait(4);
    const s = spawn("minecraft:villager_v2");
    if (!s) { say(probe, `[${c.name}] SUBJECT-SPAWN-FAILED`); continue; }
    await wait(4);
    const min = read(() => s.getComponent("minecraft:health")?.effectiveMin).v;
    setHp(s, c.start);
    await wait(2);
    const hp0 = hp(s);
    const notes = { before: [], after: [] };
    let unsub = () => {};
    if (c.clamp !== null) unsub = installPack(s.id, c.clamp, notes);
    let died = 0;
    const die = world.afterEvents.entityDie.subscribe((ev) => { if (ev.deadEntity?.id === s.id) died++; });
    const dealt = read(() => s.applyDamage(4, { cause: EntityDamageCause.entityAttack }));
    // clear of the corpse window: a dead entity still reads valid for 21 ticks, so a shorter wait
    // reports a corpse as a survivor
    await wait(60);
    const hp1 = hp(s);
    const stillThere = alive(s);
    world.afterEvents.entityDie.unsubscribe(die);
    unsub();
    say(probe, `[${c.name}] effectiveMin=${val(min)} health(${val(hp0)} -> ${val(hp1)}) ` +
      `applyDamage=${dealt.text} died=${died} subject-alive=${stillThere} ` +
      `before=[${notes.before.join(", ")}] after=[${notes.after.join(", ")}] ` +
      `verdict=${died > 0 ? "DIED" : stillThere ? "SURVIVED" : "GONE-WITHOUT-A-DEATH"}`);
    await wait(10);
  }
  clear();
}

// -------------------------------------- set: drowning and suffocation

// The two routes r-pe87rfqq names that the protection probe never measured — its suffocation case
// took no health at all, and drowning was never attempted. Both failed there for the same reason
// they failed on the first pass here: a villager walks out of an open arena square before the
// route can reach it. Each route runs inside a sealed one-block shaft cut into a stone mass, with
// the subject teleported back into the cell on a timer, so it is where the route needs it for the
// whole window.
const CELL = { dx: 6, dz: 6 };

// A stone mass with a 1x2 cell cut out of it, at a fixed offset from the arena centre.
const buildCell = async () => {
  const { x, y, z } = arena();
  const wx = x + CELL.dx;
  const wz = z + CELL.dz;
  cmd(`fill ${wx - 1} ${y} ${wz - 1} ${wx + 1} ${y + 3} ${wz + 1} stone`);
  cmd(`fill ${wx} ${y} ${wz} ${wx} ${y + 1} ${wz} air`);
  await wait(10);
  return { wx, wz, at: { x: wx + 0.5, y, z: wz + 0.5 } };
};

const razeCell = () => {
  const { x, y, z } = arena();
  cmd(`fill ${x + CELL.dx - 1} ${y} ${z + CELL.dz - 1} ${x + CELL.dx + 1} ${y + 3} ${z + CELL.dz + 1} air`);
};

const WATER_ROUTES = [
  {
    name: "drowning",
    ticks: 800,
    // Both cell blocks water and the block above them stone, so the subject cannot surface. A
    // villager holds its breath about fifteen seconds and then drowns a half-heart at a time.
    fill: (c) => {
      const { y } = arena();
      cmd(`fill ${c.wx} ${y} ${c.wz} ${c.wx} ${y + 1} ${c.wz} water`);
      cmd(`setblock ${c.wx} ${y + 2} ${c.wz} stone`);
    },
    probeBlock: (c) => read(() => arena().d.getBlock({ x: c.wx, y: arena().y + 1, z: c.wz })?.typeId).v,
  },
  {
    name: "suffocation",
    ticks: 500,
    // The block the subject's head occupies is made solid while it stands in the cell.
    fill: (c) => {
      const { y } = arena();
      cmd(`setblock ${c.wx} ${y + 1} ${c.wz} stone`);
    },
    probeBlock: (c) => read(() => arena().d.getBlock({ x: c.wx, y: arena().y + 1, z: c.wz })?.typeId).v,
  },
];

async function setWater() {
  const probe = "water-and-walls";
  await buildArena();
  for (const route of WATER_ROUTES) {
    for (const mode of ["observe", "clamp"]) {
      clear();
      await wait(4);
      const cell = await buildCell();
      const s = spawn("minecraft:villager_v2");
      if (!s) { say(probe, `[${route.name}/${mode}] SUBJECT-SPAWN-FAILED`); razeCell(); continue; }
      read(() => s.teleport(cell.at));
      await wait(10);
      const seen = [];
      const afterSeen = [];
      let died = 0;
      const before = world.beforeEvents.entityHurt.subscribe((ev) => {
        try {
          if (ev.hurtEntity?.id !== s.id) return;
          seen.push(`${ev.damageSource.cause}@${r3(ev.damage)}`);
          if (mode === "clamp" && ev.damage > CLAMP) ev.damage = CLAMP;
        } catch (e) { seen.push(`BEFORE-THREW:${e?.name}`); }
      });
      const after = world.afterEvents.entityHurt.subscribe((ev) => {
        try { if (ev.hurtEntity?.id === s.id) afterSeen.push(`${ev.damageSource.cause}@${r3(ev.damage)}`); }
        catch (e) { afterSeen.push(`AFTER-THREW:${e?.name}`); }
      });
      const die = world.afterEvents.entityDie.subscribe((ev) => {
        if (ev.deadEntity?.id === s.id) died++;
      });
      route.fill(cell);
      await wait(10);
      const placed = route.probeBlock(cell);
      const hp0 = hp(s);
      // hold the subject in the cell: a villager that drifts a block leaves the route behind
      let held = 0;
      for (let t = 0; t < route.ticks && alive(s); t += 20) {
        await wait(20);
        const loc = read(() => s.location).v;
        if (loc && (Math.abs(loc.x - cell.at.x) > 0.6 || Math.abs(loc.z - cell.at.z) > 0.6)) {
          read(() => s.teleport(cell.at));
          held++;
        }
      }
      const hp1 = hp(s);
      const stillThere = alive(s);
      world.beforeEvents.entityHurt.unsubscribe(before);
      world.afterEvents.entityHurt.unsubscribe(after);
      world.afterEvents.entityDie.unsubscribe(die);
      razeCell();
      const lost = typeof hp0 === "number" && typeof hp1 === "number" ? r3(hp0 - hp1) : undefined;
      say(probe, `[${route.name}/${mode}] cell-block=${val(placed)} recentred=${held} ` +
        `health(${val(hp0)} -> ${val(hp1)}) health-lost=${val(lost)} died=${died} subject-alive=${stillThere} ` +
        `before-events=${seen.length} after-events=${afterSeen.length} delivered=[${seen.slice(0, 10).join(", ")}] ` +
        `verdict=${seen.length > 0 ? "BEFORE-EVENT-RAISED" : (lost > 0 || died > 0) ? "DAMAGE-WITHOUT-BEFORE-EVENT" : "ROUTE-DEALT-NOTHING"}`);
      await wait(10);
    }
  }
  clear();
}

// ------------------------------------------- set: the shipped pack under siege

// The pack as it ships — the three-way split in the before handler, resetToMaxValue in the after —
// against a sustained zombie siege. The two lanes differ only in the clamp constant.
async function setRestore() {
  const probe = "shipped-pack";
  await buildArena();
  for (const clamp of [0.5, 0]) {
    for (const type of GUARDED) {
      clear();
      await wait(4);
      const s = spawn(type);
      if (!s) { say(probe, `[clamp-${clamp}/${type}] SUBJECT-SPAWN-FAILED`); continue; }
      await wait(4);
      const hp0 = hp(s);
      const notes = { before: [], after: [] };
      const unsub = installPack(s.id, clamp, notes);
      const m = await siege(s, 600, () => undefined);
      const hp1 = hp(s);
      const stillThere = alive(s);
      unsub();
      const threw = [...notes.before, ...notes.after].filter((n) => n.includes("THREW"));
      say(probe, `[clamp-${clamp}/${type}] hits-seen=${notes.before.length} restores=${notes.after.length} ` +
        `health(${val(hp0)} -> ${val(hp1)}) subject-alive=${stillThere} samples=${m.samples} ` +
        `threw=${threw.length}${threw.length ? "[" + threw.slice(0, 3).join(", ") + "]" : ""} ` +
        `first-hits=[${notes.before.slice(0, 4).join(", ")}] ` +
        `verdict=${stillThere && notes.before.length > 0 ? "SURVIVED-THE-SIEGE" : notes.before.length === 0 ? "NEVER-STRUCK" : "DIED"}`);
      await wait(10);
    }
  }
  clear();
}

// ------------------------------------------------ set: an operator's removal

// d-jp67dexu keeps `selfDestruct` and `override` outside the protection so an operator can still
// remove a protected mob. Each case runs with the shipped pack installed and asks whether the mob
// is gone afterwards — and whether the route reached the before handler at all.
const OPERATOR_CASES = [
  { name: "kill()", run: (s) => read(() => s.kill()) },
  { name: "override-applyDamage", run: (s) => read(() => s.applyDamage(100, { cause: EntityDamageCause.override })) },
  { name: "selfDestruct-applyDamage", run: (s) => read(() => s.applyDamage(100, { cause: EntityDamageCause.selfDestruct })) },
  { name: "kill-command", run: (s) => { read(() => s.addTag("vgkill")); return cmd(`kill @e[tag=vgkill]`); } },
  { name: "remove()", run: (s) => read(() => s.remove()) },
  { name: "health-write-to-min", run: (s) => read(() => s.getComponent("minecraft:health")?.setCurrentValue(0)) },
];

async function setOperator() {
  const probe = "operator-removal";
  await buildArena();
  for (const c of OPERATOR_CASES) {
    clear();
    await wait(4);
    const s = spawn("minecraft:villager_v2");
    if (!s) { say(probe, `[${c.name}] SUBJECT-SPAWN-FAILED`); continue; }
    await wait(4);
    const notes = { before: [], after: [] };
    const unsub = installPack(s.id, CLAMP, notes);
    const hp0 = hp(s);
    let died = 0;
    const die = world.afterEvents.entityDie.subscribe((ev) => { if (ev.deadEntity?.id === s.id) died++; });
    const r = c.run(s);
    await wait(60);
    const hp1 = hp(s);
    const stillThere = alive(s);
    world.afterEvents.entityDie.unsubscribe(die);
    unsub();
    say(probe, `[${c.name}] died=${died} call=${r.text} health(${val(hp0)} -> ${val(hp1)}) subject-alive=${stillThere} ` +
      `before=[${notes.before.join(", ")}] after=[${notes.after.join(", ")}] ` +
      `verdict=${stillThere ? "STILL-THERE" : "REMOVED"}`);
    await wait(10);
  }
  clear();
}

// ------------------------------------- set: the shipped pack against a hazard

// Drowning and suffocation deal damage every tick once a clamp removes the gap between hits, so a
// hazard is where a clamp-and-restore pack is under the most pressure. Each case installs the pack
// as it ships and holds the subject in the sealed cell for the window.
const HAZARD_CASES = [];
for (const clamp of [0.5, 0]) {
  for (const route of WATER_ROUTES) HAZARD_CASES.push({ clamp, route });
}

async function setHazard() {
  const probe = "shipped-pack-hazard";
  await buildArena();
  for (const c of HAZARD_CASES) {
    clear();
    await wait(4);
    const cell = await buildCell();
    const s = spawn("minecraft:villager_v2");
    if (!s) { say(probe, `[clamp-${c.clamp}/${c.route.name}] SUBJECT-SPAWN-FAILED`); razeCell(); continue; }
    const tp = read(() => s.teleport(cell.at));
    await wait(10);
    const placed = read(() => s.location).v;
    let died = 0;
    const die = world.afterEvents.entityDie.subscribe((ev) => { if (ev.deadEntity?.id === s.id) died++; });
    const notes = { before: [], after: [] };
    const unsub = installPack(s.id, c.clamp, notes);
    c.route.fill(cell);
    await wait(10);
    const hp0 = hp(s);
    let low = hp0 ?? 20;
    for (let t = 0; t < c.route.ticks && alive(s); t += 10) {
      await wait(10);
      const now = hp(s);
      if (typeof now === "number" && now < low) low = now;
      const loc = read(() => s.location).v;
      if (loc && (Math.abs(loc.x - cell.at.x) > 0.6 || Math.abs(loc.z - cell.at.z) > 0.6)) read(() => s.teleport(cell.at));
    }
    const hp1 = hp(s);
    const stillThere = alive(s);
    world.afterEvents.entityDie.unsubscribe(die);
    unsub();
    razeCell();
    const threw = [...notes.before, ...notes.after].filter((n) => n.includes("THREW"));
    say(probe, `[clamp-${c.clamp}/${c.route.name}] teleport=${tp.ok} placed-at=(${r3(placed?.x)},${r3(placed?.y)},${r3(placed?.z)}) hits-seen=${notes.before.length} restores=${notes.after.length} ` +
      `health(${val(hp0)} -> ${val(hp1)}) lowest-sampled=${val(r3(low))} died=${died} subject-alive=${stillThere} ` +
      `threw=${threw.length} first-hits=[${notes.before.slice(0, 3).join(", ")}] ` +
      `verdict=${died > 0 ? "DIED" : stillThere && notes.before.length > 0 ? "SURVIVED-THE-HAZARD" : notes.before.length === 0 ? "NEVER-HARMED" : "GONE-WITHOUT-A-DEATH"}`);
    await wait(10);
  }
  clear();
}

// -------------------------------- set: does the death a clamped hit fires convert

// A clamped hit landing on a mob already at or below the clamp reaches the effective minimum and
// fires the death, while the restore puts the health back. Conversion rides the killing blow, so
// whether that death is merely an event or the whole vanilla consequence is what decides r-9gw909jf.
// Each case starts the subject at the named health and lets a zombie do the striking.
const CONVERT_CASES = [
  { name: "at-0.5/clamp-0.5", start: 0.5, clamp: 0.5 },
  { name: "at-0.5/clamp-0", start: 0.5, clamp: 0 },
  { name: "at-20/clamp-0.5", start: 20, clamp: 0.5 },
  { name: "at-0.5/no-handler", start: 0.5, clamp: null },
];

const countType = (t) => (read(() => [...arena().d.getEntities({ type: t })]).v ?? []).length;

async function setConvert() {
  const probe = 'clamp-death-conversion';
  await buildArena();
  const { x, y, z } = arena();
  const px = x - 6;
  const pz = z - 6;
  const centre = { x: px + 0.5, y, z: pz + 0.5 };
  for (const c of CONVERT_CASES) {
    clear();
    await wait(4);
    // A walled 3x3 pen: zombie AI wanders and a villager flees, and a case whose two sides drift
    // apart measures nothing. Both are put in the pen and the subject is re-centred on a timer.
    cmd(`fill ${px - 2} ${y} ${pz - 2} ${px + 2} ${y + 3} ${pz + 2} stone`);
    cmd(`fill ${px - 1} ${y} ${pz - 1} ${px + 1} ${y + 2} ${pz + 1} air`);
    await wait(10);
    const s = spawn('minecraft:villager_v2');
    if (!s) { say(probe, `[${c.name}] SUBJECT-SPAWN-FAILED`); continue; }
    read(() => s.teleport(centre));
    await wait(4);
    setHp(s, c.start);
    await wait(2);
    const hp0 = hp(s);
    let died = 0;
    const die = world.afterEvents.entityDie.subscribe((ev) => { if (ev.deadEntity?.id === s.id) died++; });
    const notes = { before: [], after: [] };
    let unsub = () => {};
    if (c.clamp !== null) unsub = installPack(s.id, c.clamp, notes);
    const zs = [];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const zz = read(() => arena().d.spawnEntity('minecraft:zombie', { x: centre.x + dx, y, z: centre.z + dz })).v;
      if (zz) { read(() => zz.addTag('vgatk')); zs.push(zz); }
    }
    for (let t = 0; t < 800 && alive(s); t += 10) {
      await wait(10);
      const loc = read(() => s.location).v;
      if (loc && (Math.abs(loc.x - centre.x) > 1.2 || Math.abs(loc.z - centre.z) > 1.2)) read(() => s.teleport(centre));
      for (const zz of zs) {
        if (!alive(zz)) continue;
        const zl = read(() => zz.location).v;
        if (zl && (Math.abs(zl.x - centre.x) > 2 || Math.abs(zl.z - centre.z) > 2)) read(() => zz.teleport({ x: centre.x + 1, y, z: centre.z }));
      }
    }
    const hp1 = hp(s);
    const stillThere = alive(s);
    const zv = countType('minecraft:zombie_villager_v2') + countType('minecraft:zombie_villager');
    const villagers = countType('minecraft:villager_v2');
    world.afterEvents.entityDie.unsubscribe(die);
    unsub();
    cmd(`fill ${px - 2} ${y} ${pz - 2} ${px + 2} ${y + 3} ${pz + 2} air`);
    say(probe, `[${c.name}] health(${val(hp0)} -> ${val(hp1)}) hits=${notes.before.length} restores=${notes.after.length} ` +
      `died=${died} subject-alive=${stillThere} villagers-now=${villagers} zombie-villagers-now=${zv} ` +
      `verdict=${zv > 0 ? 'CONVERTED' : notes.before.length === 0 && c.clamp !== null ? 'NEVER-STRUCK' : died > 0 ? 'DIED-WITHOUT-CONVERTING' : stillThere ? 'SURVIVED' : 'GONE'}`);
    await wait(10);
  }
  clear();
}

// ------------------------------------------------------------------ dispatch

const SETS = {
  zeroclamp: { fn: setZeroClamp, n: ZERO_LANES.length },
  subclamp: { fn: setSubClamp, n: SUB_CASES.length },
  water: { fn: setWater, n: WATER_ROUTES.length * 2 },
  restore: { fn: setRestore, n: 6 },
  operator: { fn: setOperator, n: OPERATOR_CASES.length },
  hazard: { fn: setHazard, n: HAZARD_CASES.length },
  convert: { fn: setConvert, n: CONVERT_CASES.length },
};

system.run(() => {
  prepareArena();
  say("boot", `ready sets=${Object.keys(SETS).join(",")}`);
});

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (!ev.id.startsWith("vggap:")) return;
  const name = ev.id.slice("vggap:".length);
  const set = SETS[name];
  if (!set) { say("dispatch", `unknown set ${name}`); return; }
  system.run(async () => {
    say(name, `start cases=${set.n}`);
    try {
      await set.fn();
    } catch (e) {
      say(name, `PROBE CRASHED ${e?.name}: ${e?.message}\n${e?.stack}`);
    }
    say(name, "complete");
  });
});
