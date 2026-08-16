// village-guard golem probes.
//
// Three sets, each answering one question raised by the defect the owner hit: a protected iron
// golem whose hit was cancelled turned hostile and killed them.
//
//   vggolem:aggro       does an iron golem retaliate against whoever hurt it when the pack has
//                       cancelled the hit, or written it down to zero — and does the vanilla
//                       `hurt_by_target` family filter gate that retaliation at all
//   vggolem:fromplayer  does `triggerEvent("minecraft:from_player")` — the vanilla event that swaps
//                       the golem's `hurt_by_target` filter for one excluding the player family —
//                       stop the retaliation, and does it land in time when triggered from inside
//                       the before handler, or clear a target already set
//   vggolem:siege       with that event applied, does the golem still fight monsters
//
// The attacker is a probe entity that really swings: `vgprobe:swinger_*`, three identical mobs that
// differ only in the `type_family` the golem's filter reads — `player`, an inert family, and
// `creeper` (the one vanilla's base filter already excludes). No client attaches at any point, so
// nothing here establishes what a *real* player's swing does; it establishes what the engine does
// with a hit whose source carries each family.
//
// Every line goes to console.warn. Probes report what the engine did; nothing here asserts what it
// should do.
import { world, system } from "@minecraft/server";

const TAG = "[vggolem] ";
const OVERWORLD = "minecraft:overworld";
const GOLEM = "minecraft:iron_golem";
const FROM_PLAYER = "minecraft:from_player";

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
    return { ok: true, v: fn(), text: "ok" };
  } catch (e) {
    return { ok: false, v: undefined, text: `threw ${e?.name ?? "Error"}: ${e?.message ?? e}` };
  }
};
const hp = (e) => read(() => e.getComponent("minecraft:health")?.currentValue).v;
const alive = (e) => read(() => e.isValid).v === true;
const r3 = (n) => (typeof n === "number" ? Math.round(n * 1000) / 1000 : n);
const dist = (a, b) => {
  const p = read(() => a.location).v;
  const q = read(() => b.location).v;
  if (!p || !q) return -1;
  return r3(Math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2));
};

// ---------------------------------------------------------------- the arena

let A = null;
const arena = () => {
  if (A) return A;
  const d = world.getDimension(OVERWORLD);
  const sp = world.getDefaultSpawnLocation();
  const x = Math.floor(sp.x);
  const z = Math.floor(sp.z);
  const y = 100;
  A = { d, x, y, z };
  return A;
};

const cmd = (c) => read(() => arena().d.runCommand(c).successCount);

const prepareArena = () => {
  const { x, y, z } = arena();
  cmd(`tickingarea add circle ${x} ${y} ${z} 4 vggolem`);
  say("arena", `ticking area requested at (${x},${y},${z})`);
};

// The pen is the whole arena: a golem that walks off with its target still set reports as calm, and
// a swinger that drifts out of reach never lands a hit. Both are re-centred on a timer as well.
const PEN = 4;
const buildArena = async () => {
  const { d, x, y, z } = arena();
  const lines = [
    `gamerule dodaylightcycle false`,
    `gamerule domobspawning false`,
    `gamerule mobgriefing false`,
    `gamerule sendcommandfeedback false`,
    `time set noon`,
    `fill ${x - PEN} ${y - 1} ${z - PEN} ${x + PEN} ${y - 1} ${z + PEN} stone`,
    `fill ${x - PEN} ${y} ${z - PEN} ${x + PEN} ${y + 8} ${z + PEN} air`,
    `fill ${x - PEN} ${y} ${z - PEN} ${x + PEN} ${y + 5} ${z - PEN} stone`,
    `fill ${x - PEN} ${y} ${z + PEN} ${x + PEN} ${y + 5} ${z + PEN} stone`,
    `fill ${x - PEN} ${y} ${z - PEN} ${x - PEN} ${y + 5} ${z + PEN} stone`,
    `fill ${x + PEN} ${y} ${z - PEN} ${x + PEN} ${y + 5} ${z + PEN} stone`,
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

const spawn = (type, dx = 0, dz = 0) => {
  const { d, x, y, z } = arena();
  return read(() => d.spawnEntity(type, { x: x + 0.5 + dx, y, z: z + 0.5 + dz })).v;
};

// --------------------------------------------------------------- one case

// Runs one golem-versus-swinger case and reports whether the golem ever struck back.
//
//   attacker  the swinger type id, or a vanilla type for the siege set
//   treat     what the before handler does with a hit landing on the golem
//   applyAt   when, if ever, `minecraft:from_player` is triggered on the golem
const runCase = async (probe, name, { attacker, treat, applyAt, ticks = 500, angerTicks = 120 }) => {
  clear();
  await wait(6);
  const golem = spawn(GOLEM, 0, 0);
  if (!golem) { say(probe, `[${name}] GOLEM-SPAWN-FAILED`); return; }
  const foe = spawn(attacker, 2, 0);
  if (!foe) { say(probe, `[${name}] ATTACKER-SPAWN-FAILED type=${attacker}`); return; }
  await wait(6);

  const triggers = [];
  const dd = world.afterEvents.dataDrivenEntityTrigger.subscribe((ev) => {
    if (ev.entity?.id !== golem.id) return;
    const mods = read(() => ev.getModifiers().map((m) => `+[${m.getComponentGroupsToAdd().join("|")}]-[${m.getComponentGroupsToRemove().join("|")}]`)).v;
    triggers.push(`${ev.eventId}${mods ? `=>${mods.join(",")}` : ""}`);
  });

  let applied = null;
  const applyFromPlayer = (where) => {
    const r = read(() => golem.triggerEvent(FROM_PLAYER));
    applied = `${where}:${r.text}`;
  };
  // A before-event handler runs in restricted execution, where `Entity.triggerEvent` throws, so the
  // shippable shape schedules the trigger for the next tick instead.
  const deferFromPlayer = (where) => {
    applied = `${where}:scheduled`;
    system.run(() => {
      const r = read(() => golem.triggerEvent(FROM_PLAYER));
      applied = `${where}:deferred:${r.text}`;
    });
  };
  if (applyAt === "spawn") applyFromPlayer("spawn");

  // Hits landing on the golem: what the pack sees, and what it does with them.
  const onGolem = [];
  const before = world.beforeEvents.entityHurt.subscribe((ev) => {
    try {
      if (ev.hurtEntity?.id !== golem.id) return;
      const src = ev.damageSource;
      onGolem.push(`${src.cause}@${r3(ev.damage)}<-${src.damagingEntity?.typeId ?? "none"}`);
      if (treat === "cancel") ev.cancel = true;
      else if (treat === "clamp0") ev.damage = 0;
      if (applyAt === "first-hit" && applied === null) applyFromPlayer("first-hit");
      if (applyAt === "first-hit-deferred" && applied === null) deferFromPlayer("first-hit");
    } catch (e) { onGolem.push(`BEFORE-THREW:${e?.name}`); }
  });

  // The measurement: a hit whose damaging entity is the golem is the golem striking back. Each is
  // stamped with the tick it landed on, so a strike is readable against the tick the event applied.
  let now = 0;
  const byGolem = [];
  const strikeTicks = [];
  const after = world.afterEvents.entityHurt.subscribe((ev) => {
    try {
      if (ev.damageSource?.damagingEntity?.id !== golem.id) return;
      byGolem.push(`${ev.hurtEntity?.typeId}@${r3(ev.damage)}`);
      strikeTicks.push(now);
    } catch (e) { byGolem.push(`AFTER-THREW:${e?.name}`); }
  });

  const { x, y, z } = arena();
  const centre = { x: x + 0.5, y, z: z + 0.5 };
  let firstStrikeAt = -1;
  let strikesBeforeApply = -1;
  let closest = 99;
  for (let t = 0; t < ticks && alive(golem) && alive(foe); t += 5) {
    await wait(5);
    now = t;
    if (applyAt === "after-anger" && applied === null && t >= angerTicks) {
      strikesBeforeApply = byGolem.length;
      applyFromPlayer(`tick${t}`);
    }
    if (firstStrikeAt < 0 && byGolem.length > 0) firstStrikeAt = strikeTicks[0];
    const d = dist(golem, foe);
    if (d >= 0 && d < closest) closest = d;
    for (const e of [golem, foe]) {
      const loc = read(() => e.location).v;
      if (loc && (Math.abs(loc.x - centre.x) > PEN - 1 || Math.abs(loc.z - centre.z) > PEN - 1)) read(() => e.teleport(centre));
    }
  }

  world.beforeEvents.entityHurt.unsubscribe(before);
  world.afterEvents.entityHurt.unsubscribe(after);
  world.afterEvents.dataDrivenEntityTrigger.unsubscribe(dd);

  const struck = byGolem.length;
  say(probe, `[${name}] attacker=${attacker} treat=${treat} from_player=${val(applied)} ` +
    `hits-on-golem=${onGolem.length} golem-health=${val(hp(golem))} golem-alive=${alive(golem)} ` +
    `attacker-health=${val(hp(foe))} attacker-alive=${alive(foe)} closest=${closest} ` +
    `strikes-by-golem=${struck}${strikesBeforeApply >= 0 ? ` strikes-before-apply=${strikesBeforeApply}` : ""} ` +
    `first-strike-tick=${firstStrikeAt} strike-ticks=[${strikeTicks.join(" ")}] triggers=[${triggers.join(", ")}] ` +
    `first-hits-on-golem=[${onGolem.slice(0, 4).join(", ")}] first-strikes=[${byGolem.slice(0, 4).join(", ")}] ` +
    `verdict=${onGolem.length === 0 ? "GOLEM-NEVER-HIT" : struck > 0 ? "GOLEM-RETALIATED" : "GOLEM-DID-NOT-RETALIATE"}`);
  await wait(10);
};

// ------------------------------------------- set: does a cancelled hit still anger

const AGGRO_CASES = [];
for (const [family, attacker] of [["plain", "vgprobe:swinger_plain"], ["player", "vgprobe:swinger_player"], ["creeper", "vgprobe:swinger_creeper"]]) {
  for (const treat of ["none", "cancel", "clamp0"]) {
    AGGRO_CASES.push({ name: `${family}/${treat}`, attacker, treat, applyAt: null });
  }
}
// A stand-in that never swings: if the golem strikes this one, the measurement is reading something
// other than retaliation.
AGGRO_CASES.push({ name: "cow/never-hit", attacker: "minecraft:cow", treat: "none", applyAt: null });

async function setAggro() {
  const probe = "aggro";
  await buildArena();
  for (const c of AGGRO_CASES) await runCase(probe, c.name, c);
  clear();
}

// ---------------------------------- set: does minecraft:from_player stop it

const FROM_PLAYER_CASES = [
  // the group applied before anything hits, against each family
  { name: "pre/player/none", attacker: "vgprobe:swinger_player", treat: "none", applyAt: "spawn" },
  { name: "pre/player/cancel", attacker: "vgprobe:swinger_player", treat: "cancel", applyAt: "spawn" },
  { name: "pre/plain/none", attacker: "vgprobe:swinger_plain", treat: "none", applyAt: "spawn" },
  // triggered from inside the before handler, on the hit itself — the only moment the pack has
  { name: "in-handler/player/cancel", attacker: "vgprobe:swinger_player", treat: "cancel", applyAt: "first-hit" },
  { name: "in-handler/player/none", attacker: "vgprobe:swinger_player", treat: "none", applyAt: "first-hit" },
  // triggered once the golem is already angry: does the swap clear a target already set
  { name: "after-anger/player/cancel", attacker: "vgprobe:swinger_player", treat: "cancel", applyAt: "after-anger" },
];

async function setFromPlayer() {
  const probe = "from-player";
  await buildArena();
  for (const c of FROM_PLAYER_CASES) await runCase(probe, c.name, c);
  clear();
}

// ------------------------------------------- set: the siege still looks like a siege

const SIEGE_CASES = [
  { name: "zombie/plain-golem", attacker: "minecraft:zombie", treat: "none", applyAt: null },
  { name: "zombie/from_player-golem", attacker: "minecraft:zombie", treat: "none", applyAt: "spawn" },
  { name: "zombie/from_player-golem/clamp0", attacker: "minecraft:zombie", treat: "clamp0", applyAt: "spawn" },
  // the collateral: a golem already fighting a zombie, when the event arrives mid-fight — what a
  // player's stray swing during a siege would do
  { name: "zombie/from_player-mid-fight", attacker: "minecraft:zombie", treat: "clamp0", applyAt: "after-anger" },
];

async function setSiege() {
  const probe = "siege";
  await buildArena();
  for (const c of SIEGE_CASES) await runCase(probe, c.name, { ...c, ticks: 500 });
  clear();
}

// ------------------------------------------- set: the shape the pack can actually ship

// `Entity.triggerEvent` throws inside a before-event handler, so the pack cancels the hit there and
// schedules the event for the next tick. These cases run exactly that.
const FIX_CASES = [
  { name: "player/cancel+defer", attacker: "vgprobe:swinger_player", treat: "cancel", applyAt: "first-hit-deferred" },
  { name: "plain/clamp0-no-defer", attacker: "vgprobe:swinger_plain", treat: "clamp0", applyAt: null },
  { name: "zombie/clamp0-no-defer", attacker: "minecraft:zombie", treat: "clamp0", applyAt: null },
];

async function setFix() {
  const probe = "fix";
  await buildArena();
  for (const c of FIX_CASES) await runCase(probe, c.name, c);
  clear();
}

// ------------------------------- set: when the event has to arrive to be in time

// `pre/*` (applied at spawn) and `after-anger` (applied mid-fight) disagreed with `fix` about
// whether the swap reaches a target already set. This sweeps the moment the event arrives against
// one attacker and one treatment, and reports the tick of every strike, so a strike that stops is
// readable against the tick the event landed.
const TIMING_CASES = [
  { name: "spawn", applyAt: "spawn" },
  { name: "defer-first-hit/a", applyAt: "first-hit-deferred" },
  { name: "defer-first-hit/b", applyAt: "first-hit-deferred" },
  { name: "apply@60", applyAt: "after-anger", angerTicks: 60 },
  { name: "apply@120", applyAt: "after-anger", angerTicks: 120 },
  { name: "apply@240", applyAt: "after-anger", angerTicks: 240 },
  { name: "never", applyAt: null },
];

async function setTiming() {
  const probe = "timing";
  await buildArena();
  for (const c of TIMING_CASES) {
    await runCase(probe, c.name, { attacker: "vgprobe:swinger_player", treat: "cancel", ticks: 600, ...c });
  }
  clear();
}

// -------------------- set: the only shape that works, and what it costs to take

// `minecraft:from_player` stops the retaliation only when it reaches the golem before the hit does,
// and a before-event handler cannot send it. That leaves enrolling every golem as it arrives —
// which is what d-8b5m52it forbids. These cases run that shape anyway, so the cost of the rule is
// measured rather than assumed.
let enrolment = null;
const enrol = () => {
  const seen = [];
  const take = (entity, where) => {
    if (entity?.typeId !== GOLEM) return;
    system.run(() => {
      const r = read(() => entity.triggerEvent(FROM_PLAYER));
      seen.push(`${where}:${r.text}`);
    });
  };
  const load = world.afterEvents.entityLoad.subscribe((ev) => take(ev.entity, "load"));
  const spawned = world.afterEvents.entitySpawn.subscribe((ev) => take(ev.entity, "spawn"));
  enrolment = { seen, off: () => { world.afterEvents.entityLoad.unsubscribe(load); world.afterEvents.entitySpawn.unsubscribe(spawned); } };
};

const ENROL_CASES = [
  { name: "enrolled/player/cancel", attacker: "vgprobe:swinger_player", treat: "cancel" },
  { name: "enrolled/plain/clamp0", attacker: "vgprobe:swinger_plain", treat: "clamp0" },
  { name: "enrolled/zombie/clamp0", attacker: "minecraft:zombie", treat: "clamp0" },
];

async function setEnrol() {
  const probe = "enrol";
  await buildArena();
  enrol();
  for (const c of ENROL_CASES) {
    const before = enrolment.seen.length;
    await runCase(probe, c.name, { ...c, applyAt: null, ticks: 500 });
    say(probe, `[${c.name}] enrolments-this-case=[${enrolment.seen.slice(before).join(", ")}]`);
  }
  enrolment.off();
  clear();
}

// ------------------------------------------------------------------ dispatch

const SETS = {
  aggro: { fn: setAggro, n: AGGRO_CASES.length },
  fromplayer: { fn: setFromPlayer, n: FROM_PLAYER_CASES.length },
  siege: { fn: setSiege, n: SIEGE_CASES.length },
  fix: { fn: setFix, n: FIX_CASES.length },
  timing: { fn: setTiming, n: TIMING_CASES.length },
  enrol: { fn: setEnrol, n: ENROL_CASES.length },
};

system.run(() => {
  prepareArena();
  say("boot", `ready sets=${Object.keys(SETS).join(",")}`);
});

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (!ev.id.startsWith("vggolem:")) return;
  const name = ev.id.slice("vggolem:".length);
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
