// village-guard protection probes.
//
// Three sets, each answering one open question of the village-guard protection design:
//
//   vgprobe:sources    q-y65kdr8a  does beforeEvents.entityHurt fire for damage a script did not
//                                  ask for, and does a handler's `damage` write take on those paths
//   vgprobe:conversion q-a9knxqiu  does a villager a zombie can never kill also never convert
//   vgprobe:reaction   q-fc5bw0k0  does a clamped hit still knock back and still panic
//
// Every line goes to console.warn, so a dedicated server collects them from the content log with no
// client attached. Probes report what the engine did; nothing here asserts what it should do.
import { world, system, EntityDamageCause } from "@minecraft/server";

const TAG = "[vgprobe] ";
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

// -------------------------------------------------------- set A: the sources

// Each case deals damage by one route and reports whether the before-event saw it. Run twice per
// route: `observe` records the delivered payload and writes nothing; `clamp` writes `damage` down
// to CLAMP, so the health actually lost says whether the write took on that route.
const SOURCES = [
  {
    name: "script-applyDamage",
    control: true,
    deal: async (s) => { read(() => s.applyDamage(4, { cause: EntityDamageCause.entityAttack })); await wait(6); },
  },
  {
    name: "command-damage",
    deal: async (s) => {
      read(() => s.addTag("vgsub"));
      cmd(`damage @e[tag=vgsub] 4 entity_attack`);
      await wait(6);
    },
  },
  {
    name: "fire",
    deal: async (s) => { read(() => s.setOnFire(6, true)); await wait(60); },
  },
  {
    name: "explosion",
    deal: async (s) => {
      const { d } = arena();
      read(() => d.createExplosion(s.location, 3, { breaksBlocks: false, allowUnderwater: false }));
      await wait(10);
    },
  },
  {
    name: "fall",
    deal: async (s) => {
      read(() => s.teleport({ x: s.location.x, y: arena().y + 25, z: s.location.z }));
      await wait(90);
    },
  },
  {
    name: "suffocation",
    deal: async (s) => {
      const { x, y, z } = arena();
      // bury the subject: fill the column it stands in, so its head is inside a solid block
      read(() => s.teleport({ x: x + 4.5, y: y + 1, z: z + 4.5 }));
      await wait(4);
      cmd(`fill ${x + 4} ${y} ${z + 4} ${x + 4} ${y + 3} ${z + 4} stone`);
      await wait(80);
      cmd(`fill ${x + 4} ${y} ${z + 4} ${x + 4} ${y + 3} ${z + 4} air`);
    },
  },
  {
    name: "zombie-attack",
    deal: async (s) => {
      for (const [dx, dz] of [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]]) {
        const z = spawn("minecraft:zombie", dx, 0, dz);
        if (z) read(() => z.addTag("vgatk"));
      }
      for (let i = 0; i < 120 && alive(s); i++) await wait(5);
    },
  },
];

async function setSources() {
  const probe = "damage-source-visibility";
  await buildArena();
  for (const src of SOURCES) {
    for (const mode of ["observe", "clamp"]) {
      clear();
      await wait(4);
      const s = spawn("minecraft:villager_v2");
      if (!s) { say(probe, `[${src.name}/${mode}] SUBJECT-SPAWN-FAILED`); continue; }
      await wait(4);

      const seen = [];
      let entered = 0;
      const h = world.beforeEvents.entityHurt.subscribe((ev) => {
        try {
          if (ev.hurtEntity?.id !== s.id) return;
          entered++;
          const cause = read(() => ev.damageSource.cause).v;
          const by = read(() => ev.damageSource.damagingEntity?.typeId).v;
          seen.push(`${cause}${by ? "/" + by : ""}@${ev.damage}`);
          if (mode === "clamp") ev.damage = CLAMP;
        } catch (e) {
          seen.push(`HANDLER-THREW:${e?.name}`);
        }
      });

      const before = hp(s);
      let after, lost, note = "";
      try {
        await src.deal(s);
        after = alive(s) ? hp(s) : undefined;
        lost = typeof before === "number" && typeof after === "number" ? r3(before - after) : undefined;
      } catch (e) {
        note = ` deal-threw=${e?.name}`;
      } finally {
        world.beforeEvents.entityHurt.unsubscribe(h);
      }

      const dealt = entered > 0 || (typeof lost === "number" && lost > 0) || !alive(s);
      let verdict;
      if (!dealt) verdict = "NO-DAMAGE-DEALT (case discriminates nothing)";
      else if (entered === 0) verdict = "BEFORE-EVENT-NOT-RAISED";
      else if (mode === "observe") verdict = "BEFORE-EVENT-RAISED";
      else if (typeof lost !== "number") verdict = "CLAMP-INCONCLUSIVE (subject gone, read the death flag)";
      else if (lost <= CLAMP * entered + 0.001) verdict = "CLAMP-WRITE-TOOK";
      else verdict = "CLAMP-WRITE-IGNORED";

      say(
        probe,
        `[${src.name}/${mode}]${src.control ? " (control)" : ""} handler-entered=${entered} ` +
          `health(${val(before)} -> ${val(after)}) health-lost=${val(lost)} ` +
          `subject-alive=${alive(s)} delivered=[${seen.join(", ")}]${note} verdict=${verdict}`
      );
    }
  }
  clear();
}

// ---------------------------------------------------- set B: the conversion

const installGuard = () => {
  const types = new Set(GUARDED);
  const b = world.beforeEvents.entityHurt.subscribe((ev) => {
    try {
      if (!types.has(ev.hurtEntity?.typeId)) return;
      if (ev.damage > CLAMP) ev.damage = CLAMP;
    } catch (e) { /* reported by the case's own readings */ }
  });
  const a = world.afterEvents.entityHurt.subscribe((ev) => {
    try {
      const e = ev.hurtEntity;
      if (!types.has(e?.typeId)) return;
      e.getComponent("minecraft:health")?.resetToMaxValue();
    } catch (e) { /* same */ }
  });
  return () => {
    world.beforeEvents.entityHurt.unsubscribe(b);
    world.afterEvents.entityHurt.unsubscribe(a);
  };
};

const countNear = (type) => {
  const { d, at } = arena();
  return read(() => [...d.getEntities({ type, location: at(), maxDistance: 24 })].length).v ?? -1;
};

async function setConversion() {
  const probe = "zombie-conversion";
  await buildArena();
  for (const mode of ["control-unguarded", "guarded"]) {
    clear();
    await wait(10);
    cmd("difficulty hard");
    const v = spawn("minecraft:villager_v2");
    if (!v) { say(probe, `[${mode}] SUBJECT-SPAWN-FAILED`); continue; }
    read(() => v.addTag("vgvictim"));
    const uninstall = mode === "guarded" ? installGuard() : null;
    await wait(4);

    const zs = [spawn("minecraft:zombie", 2, 0, 0), spawn("minecraft:zombie", -2, 0, 0), spawn("minecraft:zombie", 0, 0, 2)];
    const deaths = [];
    const dh = world.afterEvents.entityDie.subscribe((ev) => {
      if (ev.deadEntity?.id === v.id) deaths.push(read(() => ev.damageSource.cause).v ?? "unknown");
    });
    const startHp = hp(v);
    let ticksLived = 0;
    try {
      for (let i = 0; i < 120; i++) {
        await wait(10);
        ticksLived += 10;
        if (!alive(v)) break;
      }
    } finally {
      if (uninstall) uninstall();
      world.afterEvents.entityDie.unsubscribe(dh);
    }

    const converted = countNear("minecraft:zombie_villager_v2");
    const villagers = countNear("minecraft:villager_v2");
    const survived = alive(v);
    let verdict;
    if (mode === "control-unguarded") {
      verdict = converted > 0 ? "CONTROL-CONVERTED" : survived ? "CONTROL-SURVIVED (the case discriminates nothing)" : "CONTROL-DIED-WITHOUT-CONVERTING";
    } else if (converted > 0) {
      verdict = "GUARDED-CONVERTED-ANYWAY";
    } else if (survived) {
      verdict = "GUARDED-SURVIVED-UNCONVERTED";
    } else {
      verdict = "GUARDED-DIED";
    }

    say(
      probe,
      `[${mode}] zombies=${zs.filter(Boolean).length} ticks=${ticksLived} ` +
        `health(${val(startHp)} -> ${val(survived ? hp(v) : undefined)}) subject-alive=${survived} ` +
        `villagers-near=${villagers} zombie-villagers-near=${converted} death-cause=[${deaths.join(",")}] verdict=${verdict}`
    );
  }
  clear();
}

// ------------------------------------------------------ set C: the reaction

// A zombie does the hitting, so the knockback is the engine's own rather than a script's. One
// sampler runs every tick; the before-event records the tick each hit landed on. A treatment's
// knockback is the peak speed in the six ticks after a hit, against the resting speed before it.
async function setReaction() {
  const probe = "hit-reaction";
  await buildArena();
  for (const mode of ["control-no-handler", "clamped", "cancelled"]) {
    clear();
    await wait(10);
    cmd("difficulty hard");
    const v = spawn("minecraft:villager_v2");
    if (!v) { say(probe, `[${mode}] SUBJECT-SPAWN-FAILED`); continue; }
    await wait(4);

    const samples = [];
    const hits = [];
    const sampler = system.runInterval(() => {
      if (!alive(v)) return;
      samples.push({ t: system.currentTick, s: speed(v), p: read(() => v.location).v });
    }, 1);

    let h = null;
    if (mode !== "control-no-handler") {
      h = world.beforeEvents.entityHurt.subscribe((ev) => {
        try {
          if (ev.hurtEntity?.id !== v.id) return;
          hits.push({ t: system.currentTick, dmg: ev.damage, cause: read(() => ev.damageSource.cause).v });
          if (mode === "clamped") ev.damage = CLAMP;
          else ev.cancel = true;
        } catch (e) { hits.push({ t: -1, dmg: -1, cause: "HANDLER-THREW" }); }
      });
    } else {
      // the control needs the hit ticks too, and an after-event subscriber changes nothing the
      // before-event path would
      const ah = world.afterEvents.entityHurt.subscribe((ev) => {
        if (ev.hurtEntity?.id === v.id) hits.push({ t: system.currentTick, dmg: ev.damage, cause: read(() => ev.damageSource.cause).v });
      });
      h = { after: ah };
    }

    const restoreLoop = mode === "control-no-handler" ? null : system.runInterval(() => {
      if (alive(v)) read(() => v.getComponent("minecraft:health")?.resetToMaxValue());
    }, 5);

    const start = read(() => v.location).v;
    for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2]]) spawn("minecraft:zombie", dx, 0, dz);
    for (let i = 0; i < 120 && alive(v); i++) await wait(5);

    system.clearRun(sampler);
    if (restoreLoop) system.clearRun(restoreLoop);
    if (h?.after) world.afterEvents.entityHurt.unsubscribe(h.after);
    else if (h) world.beforeEvents.entityHurt.unsubscribe(h);

    const peaks = hits.slice(0, 6).map((hit) => {
      const before = samples.filter((s) => s.t >= hit.t - 4 && s.t < hit.t).map((s) => s.s);
      const after = samples.filter((s) => s.t >= hit.t && s.t <= hit.t + 6).map((s) => s.s);
      const mx = (a) => (a.length ? r3(Math.max(...a)) : -1);
      return `${hit.cause}@${r3(hit.dmg)}:rest=${mx(before)}->peak=${mx(after)}`;
    });
    const end = read(() => v.location).v;
    const moved = start && end ? r3(Math.sqrt((end.x - start.x) ** 2 + (end.z - start.z) ** 2)) : -1;
    const peakAll = samples.length ? r3(Math.max(...samples.map((s) => s.s))) : -1;

    say(
      probe,
      `[${mode}] hits=${hits.length} samples=${samples.length} subject-alive=${alive(v)} ` +
        `moved-horizontally=${moved} peak-speed-overall=${peakAll} ` +
        `per-hit=[${peaks.join(", ")}] ` +
        `verdict=${hits.length === 0 ? "NO-HITS (case discriminates nothing)" : "SEE-NUMBERS"}`
    );
  }
  clear();
}


// ------------------------------------------------- set D: the client comparison

// The half of q-fc5bw0k0 a dedicated server cannot answer. Flinch and hurt sound are rendered on
// the client, so no log line reaches them. This set stages the comparison instead: three penned
// villagers side by side, one hit vanilla, one hit through the clamp, one whose hit is cancelled.
// A person hits each in turn and reports whether the first two look and sound alike and the third
// does not — a comparison, rather than a judgement about whether one mob looks "normal".
async function setClient() {
  const probe = "client-comparison";
  const { x, y, z } = arena();
  await buildArena();
  clear();
  // the arena sets midnight and the world may be raining: a person is being asked to judge a red
  // flash and a recoil, so give them daylight and clear sky
  cmd("time set day");
  cmd("weather clear 999999");
  cmd("gamerule sendcommandfeedback true");
  await wait(10);

  const LANES = [
    { name: "CONTROL", dx: -4, mode: "none" },
    { name: "CLAMPED", dx: 0, mode: "clamp" },
    { name: "CANCELLED", dx: 4, mode: "cancel" },
  ];

  const subjects = new Map();
  for (const lane of LANES) {
    // a 3x3 pen with an open roof for light and a barred south face: the villager stays in, and
    // the observer gets a face-on view and can strike through the bars. `hollow` lays stone at the
    // pen's own floor level, so the subject spawns one above it rather than inside it.
    cmd(`fill ${x + lane.dx - 2} ${y} ${z - 2} ${x + lane.dx + 2} ${y + 3} ${z + 2} stone hollow`);
    cmd(`fill ${x + lane.dx - 1} ${y + 3} ${z - 1} ${x + lane.dx + 1} ${y + 3} ${z + 1} air`);
    cmd(`fill ${x + lane.dx - 1} ${y + 1} ${z + 2} ${x + lane.dx + 1} ${y + 2} ${z + 2} iron_bars`);
    const v = spawn("minecraft:villager_v2", lane.dx, 1);
    if (!v) { say(probe, `[${lane.name}] SUBJECT-SPAWN-FAILED`); continue; }
    read(() => { v.nameTag = lane.name; });
    subjects.set(v.id, lane.mode);
  }

  const before = world.beforeEvents.entityHurt.subscribe((ev) => {
    try {
      const mode = subjects.get(ev.hurtEntity?.id);
      if (mode === "clamp") ev.damage = CLAMP;
      else if (mode === "cancel") ev.cancel = true;
    } catch (e) { /* the run's own readings report it */ }
  });
  // every lane is kept topped up off the damage path, so the control stays hittable all session
  // without its hits being anything but vanilla
  const topUp = system.runInterval(() => {
    for (const [id] of subjects) {
      const e = read(() => world.getDimension(OVERWORLD).getEntities({ type: "minecraft:villager_v2" })).v ?? [];
      for (const v of e) if (subjects.has(v.id)) read(() => v.getComponent("minecraft:health")?.resetToMaxValue());
      break;
    }
  }, 10);

  const hits = new Map();
  const after = world.afterEvents.entityHurt.subscribe((ev) => {
    const mode = subjects.get(ev.hurtEntity?.id);
    if (mode === undefined) return;
    hits.set(mode, (hits.get(mode) ?? 0) + 1);
  });

  // the arena is a platform at y=100, so a player has to be put on it and equipped
  for (const pl of read(() => world.getAllPlayers()).v ?? []) {
    read(() => pl.teleport({ x: x + 0.5, y: y + 1, z: z + 6.5 }));
    cmd(`gamemode survival "${pl.name}"`);
    cmd(`give "${pl.name}" stone_sword`);
    cmd(`effect "${pl.name}" saturation 99999 255 true`);
  }

  world.sendMessage("§e[village-guard] Three villagers are penned in a row: CONTROL, CLAMPED, CANCELLED.");
  world.sendMessage("§e Hit each several times with the same weapon. Watch the red flash, listen for the hurt grunt, watch whether it recoils and panics.");
  world.sendMessage("§e CONTROL and CLAMPED should be indistinguishable. CANCELLED is the calibration — it should show nothing.");
  world.sendMessage("§e The session ends in 5 minutes and prints its counts to the log.");
  say(probe, `staged lanes=${LANES.length} subjects=${subjects.size} centre=(${x},${y},${z})`);

  for (let i = 0; i < 60; i++) await wait(100);

  world.beforeEvents.entityHurt.unsubscribe(before);
  world.afterEvents.entityHurt.unsubscribe(after);
  system.clearRun(topUp);
  say(
    probe,
    `session-ended damage-landed-by-lane=[control=${hits.get("none") ?? 0}, clamped=${hits.get("clamp") ?? 0}, ` +
      `cancelled=${hits.get("cancel") ?? 0}] ` +
      `note=the cancelled lane lands no after-event by construction; the counts say which lanes were actually struck`
  );
}


// ---------------------------------------------------- set E: the player's gossip

// q-12hs93gc. Villager reputation is not on the script API's surface, so the pack can neither read
// it nor undo it, and the only readable signal is what the villager charges. Two lanes, both
// professioned and both kept alive off the damage path: one takes the player's hits normally, the
// other has them cancelled. The control is what makes the test discriminate — if its prices do not
// move either, Bedrock has no attack-driven reputation to spare and the question answers that way.
async function setGossip() {
  const probe = "player-gossip";
  await buildArena();
  clear();
  cmd("time set day");
  cmd("weather clear 999999");
  await wait(10);

  const LANES = [
    { name: "GOSSIP-CONTROL", dx: -4, cancel: false },
    { name: "GOSSIP-CANCELLED", dx: 4, cancel: true },
  ];

  const cancelled = new Set();
  const kept = new Set();
  for (const lane of LANES) {
    cmd(`fill ${x0(lane) - 2} ${y0()} ${z0() - 2} ${x0(lane) + 2} ${y0() + 3} ${z0() + 2} stone hollow`);
    cmd(`fill ${x0(lane) - 1} ${y0() + 3} ${z0() - 1} ${x0(lane) + 1} ${y0() + 3} ${z0() + 1} air`);
    cmd(`fill ${x0(lane) - 1} ${y0() + 1} ${z0() + 2} ${x0(lane) + 1} ${y0() + 2} ${z0() + 2} iron_bars`);
    // a job site so the villager takes a profession and has something to trade
    cmd(`setblock ${x0(lane) - 1} ${y0() + 1} ${z0() - 1} composter`);
    const v = spawn("minecraft:villager_v2", lane.dx, 1);
    if (!v) { say(probe, `[${lane.name}] SUBJECT-SPAWN-FAILED`); continue; }
    read(() => { v.nameTag = lane.name; });
    const ev = read(() => v.triggerEvent("minecraft:become_farmer"));
    say(probe, `[${lane.name}] spawned profession-event=${ev.ok ? "accepted" : ev.text}`);
    kept.add(v.id);
    if (lane.cancel) cancelled.add(v.id);
  }

  const before = world.beforeEvents.entityHurt.subscribe((ev) => {
    try {
      if (cancelled.has(ev.hurtEntity?.id) && ev.damageSource?.damagingEntity?.typeId === "minecraft:player") {
        ev.cancel = true;
      }
    } catch (e) { /* the run's own readings report it */ }
  });
  const hits = new Map();
  const after = world.afterEvents.entityHurt.subscribe((ev) => {
    if (!kept.has(ev.hurtEntity?.id)) return;
    const by = read(() => ev.damageSource.damagingEntity?.typeId).v ?? "none";
    const key = `${cancelled.has(ev.hurtEntity.id) ? "cancelled" : "control"}/${by}`;
    hits.set(key, (hits.get(key) ?? 0) + 1);
  });
  const topUp = system.runInterval(() => {
    for (const v of read(() => arena().d.getEntities({ type: "minecraft:villager_v2" })).v ?? []) {
      if (kept.has(v.id)) read(() => v.getComponent("minecraft:health")?.resetToMaxValue());
    }
  }, 10);

  for (const pl of read(() => world.getAllPlayers()).v ?? []) {
    read(() => pl.teleport({ x: x0({ dx: 0 }) + 0.5, y: y0() + 1, z: z0() + 6.5 }));
    cmd(`gamemode survival "${pl.name}"`);
    cmd(`give "${pl.name}" stone_sword`);
    cmd(`give "${pl.name}" emerald 64`);
    cmd(`give "${pl.name}" wheat 64`);
  }

  world.sendMessage("§e[village-guard] Two farmers: GOSSIP-CONTROL (west) and GOSSIP-CANCELLED (east).");
  world.sendMessage("§e 1. Trade with each and write down what it charges.");
  world.sendMessage("§e 2. Hit each about a dozen times with the sword.");
  world.sendMessage("§e 3. Trade with each again and compare the prices.");
  world.sendMessage("§e CONTROL is the calibration: if its prices do not move either, there is no reputation effect here to prevent.");
  say(probe, `staged lanes=${LANES.length} centre=(${x0({ dx: 0 })},${y0()},${z0()})`);

  for (let i = 0; i < 90; i++) await wait(100);

  world.beforeEvents.entityHurt.unsubscribe(before);
  world.afterEvents.entityHurt.unsubscribe(after);
  system.clearRun(topUp);
  say(probe, `session-ended landed=[${[...hits].map(([k, n]) => k + "=" + n).join(", ")}] note=a cancelled hit lands no after-event, so the cancelled lane reading zero is the mechanism working`);
}

const x0 = (lane) => arena().x + lane.dx;
const y0 = () => arena().y;
const z0 = () => arena().z;


// ------------------------------------------------ set F: the discount an attack takes

// q-12hs93gc, with an instrument big enough to read. An attack in Bedrock cannot raise a price, it
// can only cancel a discount, so the test needs a large discount to put at risk. Curing a zombie
// villager is the biggest one the game gives, so each lane starts as a zombie villager the observer
// cures. Lane membership is by position, because curing replaces the entity.
async function setCure() {
  const probe = "cure-discount";
  await buildArena();
  clear();
  // an undead subject burns in daylight, so this set runs at night and lights the arena itself;
  // the keeper loop also holds fire resistance on them, because one exposed tick is a dead subject
  cmd("time set midnight");
  cmd("weather clear 999999");
  cmd("difficulty hard");
  await wait(10);

  const LANES = [
    { name: "CURED-CONTROL", dx: -4, cancel: false },
    { name: "CURED-CANCELLED", dx: 4, cancel: true },
  ];
  const nearestLane = (loc) => {
    if (!loc) return null;
    let best = null, bestD = 12;
    for (const l of LANES) {
      const d = Math.abs(loc.x - (arena().x + l.dx + 0.5)) + Math.abs(loc.z - (arena().z + 0.5));
      if (d < bestD) { best = l; bestD = d; }
    }
    return best;
  };
  const laneOf = (loc) => {
    if (!loc) return null;
    for (const l of LANES) if (Math.abs(loc.x - (arena().x + l.dx + 0.5)) <= 3 && Math.abs(loc.z - (arena().z + 0.5)) <= 3) return l;
    return null;
  };

  for (const lane of LANES) {
    const bx = arena().x + lane.dx, by = arena().y, bz = arena().z;
    cmd(`fill ${bx - 2} ${by} ${bz - 2} ${bx + 2} ${by + 3} ${bz + 2} stone hollow`);
    cmd(`fill ${bx - 1} ${by + 3} ${bz - 1} ${bx + 1} ${by + 3} ${bz + 1} air`);
    cmd(`fill ${bx - 1} ${by + 1} ${bz + 2} ${bx + 1} ${by + 2} ${bz + 2} iron_bars`);
    cmd(`setblock ${bx - 1} ${by + 1} ${bz - 1} composter`);
    cmd(`setblock ${bx + 1} ${by + 1} ${bz - 1} glowstone`);
    cmd(`setblock ${bx} ${by + 3} ${bz - 2} glowstone`);
    cmd(`setblock ${bx} ${by + 3} ${bz + 2} glowstone`);
    const z = spawn("minecraft:zombie_villager_v2", lane.dx, 1);
    say(probe, `[${lane.name}] zombie villager ${z ? "spawned" : "SPAWN-FAILED"}`);
  }

  // the observer only has to feed the golden apple; the weakness is kept on from here, so no potion
  // id has to be right for the test to run
  const seen = new Set();
  const curedIn = new Set();
  // A subject that gets out of its pen stops belonging to a lane, which voids that lane's reading
  // and leaves it wandering the arena. The keeper removes anything loose and refills an empty lane,
  // so the set repairs itself instead of needing a re-stage.
  const keeper = system.runInterval(() => {
    const d = arena().d;
    const held = new Map();
    for (const type of ["minecraft:zombie_villager_v2", "minecraft:villager_v2"]) {
      for (const e of read(() => [...d.getEntities({ type })]).v ?? []) {
        let lane = laneOf(read(() => e.location).v);
        if (!lane) {
          // put a drifting subject back rather than deleting it: a cured villager carries the
          // discount the whole set exists to measure, and removing it destroys that lane's reading
          lane = nearestLane(read(() => e.location).v);
          if (!lane) { read(() => e.remove()); continue; }
          read(() => e.teleport({ x: arena().x + lane.dx + 0.5, y: arena().y + 1, z: arena().z + 0.5 }));
          say(probe, `[${lane.name}] subject drifted out of its pen and was put back`);
        }
        held.set(lane.name, (held.get(lane.name) ?? 0) + 1);
        if (type === "minecraft:zombie_villager_v2") {
          read(() => e.addEffect("minecraft:weakness", 400, { amplifier: 0, showParticles: false }));
          read(() => e.addEffect("minecraft:fire_resistance", 400, { amplifier: 0, showParticles: false }));
          read(() => e.extinguishFire(false));
        } else {
          read(() => e.getComponent("minecraft:health")?.resetToMaxValue());
          curedIn.add(lane.name);
          if (!seen.has(e.id)) {
            seen.add(e.id);
            say(probe, `[${lane.name}] CURED — a villager is now in this lane, trade it and read the price`);
          }
        }
      }
    }
    for (const lane of LANES) {
      if ((held.get(lane.name) ?? 0) === 0 && !curedIn.has(lane.name)) {
        spawn("minecraft:zombie_villager_v2", lane.dx, 1);
        say(probe, `[${lane.name}] lane was empty — a fresh zombie villager was put in it`);
      }
    }
  }, 20);

  const before = world.beforeEvents.entityHurt.subscribe((ev) => {
    try {
      const e = ev.hurtEntity;
      if (e?.typeId !== "minecraft:villager_v2") return;
      if (ev.damageSource?.damagingEntity?.typeId !== "minecraft:player") return;
      const lane = laneOf(e.location);
      if (lane?.cancel) ev.cancel = true;
    } catch (e) { /* the run's own readings report it */ }
  });
  const landed = new Map();
  const after = world.afterEvents.entityHurt.subscribe((ev) => {
    if (ev.hurtEntity?.typeId !== "minecraft:villager_v2") return;
    const lane = laneOf(read(() => ev.hurtEntity.location).v);
    if (!lane) return;
    landed.set(lane.name, (landed.get(lane.name) ?? 0) + 1);
  });

  for (const pl of read(() => world.getAllPlayers()).v ?? []) {
    read(() => pl.teleport({ x: arena().x + 0.5, y: arena().y + 1, z: arena().z + 6.5 }));
    cmd(`gamemode survival "${pl.name}"`);
    cmd(`give "${pl.name}" golden_apple 8`);
    cmd(`give "${pl.name}" diamond_sword`);
    cmd(`give "${pl.name}" emerald 64`);
    cmd(`give "${pl.name}" wheat 64`);
    cmd(`effect "${pl.name}" resistance 99999 4 true`);
    cmd(`effect "${pl.name}" saturation 99999 255 true`);
  }

  world.sendMessage("§e[village-guard] Two zombie villagers: CURED-CONTROL (west), CURED-CANCELLED (east).");
  world.sendMessage("§e They are kept weakened for you — just feed each one a golden apple from the pen rim.");
  world.sendMessage("§e When a lane reports CURED, trade it and note the discounted price.");
  world.sendMessage("§e Then hit each about a dozen times, and trade again. CONTROL should lose its discount.");
  world.sendMessage("§e You have Resistance V, so the zombie villagers cannot hurt you.");
  say(probe, `staged lanes=${LANES.length} centre=(${arena().x},${arena().y},${arena().z})`);

  for (let i = 0; i < 180; i++) await wait(100);

  world.beforeEvents.entityHurt.unsubscribe(before);
  world.afterEvents.entityHurt.unsubscribe(after);
  system.clearRun(keeper);
  say(probe, `session-ended cured=${seen.size} player-damage-landed=[${[...landed].map(([k, n]) => k + "=" + n).join(", ") || "none"}] note=a cancelled hit lands no after-event, so CURED-CANCELLED reading zero is the mechanism working`);
}


// -------------------------------------------- set G: adopt the standing subjects and amplify

// Attaches to whatever villagers are already penned, building nothing and clearing nothing, so a
// cure that took five minutes is not thrown away to change one number. West takes amplified player
// damage, east still has its player hits cancelled, and every hit is logged with what landed.
async function setAmp() {
  const probe = "amplified-hit";
  const LANES = [
    { name: "AMP-CONTROL", dx: -4, cancel: false },
    { name: "AMP-CANCELLED", dx: 4, cancel: true },
  ];
  const laneOf = (loc) => {
    if (!loc) return null;
    for (const l of LANES) if (Math.abs(loc.x - (arena().x + l.dx + 0.5)) <= 3 && Math.abs(loc.z - (arena().z + 0.5)) <= 3) return l;
    return null;
  };
  const AMP = 15;

  const found = [];
  for (const v of read(() => [...arena().d.getEntities({ type: "minecraft:villager_v2" })]).v ?? []) {
    const lane = laneOf(read(() => v.location).v);
    if (lane) found.push(`${lane.name}@${Math.round(read(() => v.location).v.x)}`);
  }
  say(probe, `adopted standing subjects=[${found.join(", ")}] — nothing was cleared or rebuilt`);

  const before = world.beforeEvents.entityHurt.subscribe((ev) => {
    try {
      const e = ev.hurtEntity;
      if (e?.typeId !== "minecraft:villager_v2") return;
      if (ev.damageSource?.damagingEntity?.typeId !== "minecraft:player") return;
      const lane = laneOf(e.location);
      if (!lane) return;
      if (lane.cancel) ev.cancel = true;
      else ev.damage = AMP;
    } catch (e) { /* the run's own readings report it */ }
  });
  const after = world.afterEvents.entityHurt.subscribe((ev) => {
    const e = ev.hurtEntity;
    if (e?.typeId !== "minecraft:villager_v2") return;
    const lane = laneOf(read(() => e.location).v);
    if (!lane) return;
    const by = read(() => ev.damageSource.damagingEntity?.typeId).v ?? "none";
    say(probe, `[${lane.name}] hit landed damage=${ev.damage} by=${by} health-now=${val(hp(e))}`);
  });
  // fast top-up, because an amplified hit leaves little margin
  const keeper = system.runInterval(() => {
    for (const v of read(() => [...arena().d.getEntities({ type: "minecraft:villager_v2" })]).v ?? []) {
      const lane = laneOf(read(() => v.location).v);
      if (lane) read(() => v.getComponent("minecraft:health")?.resetToMaxValue());
    }
  }, 2);

  world.sendMessage("§e[village-guard] Amplified: the WEST villager now takes 15 damage per player hit.");
  world.sendMessage("§e Same villagers, same cures — nothing was reset. Hit west again and re-read its price.");
  say(probe, `staged amp=${AMP} on the west lane, east still cancelled`);

  for (let i = 0; i < 120; i++) await wait(100);
  world.beforeEvents.entityHurt.unsubscribe(before);
  world.afterEvents.entityHurt.unsubscribe(after);
  system.clearRun(keeper);
  say(probe, "session-ended");
}


// ------------------------------- set H: spend the last cured villager on the control question

// Only one cured subject survived, so the paired comparison is gone and the question worth its
// discount is the control's: does hitting a cured villager cost it the discount at all? If it does
// not, there is nothing for a cancelled hit to protect and q-12hs93gc answers that way. Player hits
// LAND here, amplified, with health restored every tick so the subject cannot be killed.
async function setControl() {
  const probe = "discount-under-attack";
  const inArena = (loc) => loc && Math.abs(loc.x - arena().x) <= 10 && Math.abs(loc.z - arena().z) <= 10;
  const AMP = 15;

  // the heal goes on first and every tick, because the last one died in the gap
  const keeper = system.runInterval(() => {
    for (const v of read(() => [...arena().d.getEntities({ type: "minecraft:villager_v2" })]).v ?? []) {
      if (inArena(read(() => v.location).v)) read(() => v.getComponent("minecraft:health")?.resetToMaxValue());
    }
  }, 1);

  const subjects = [];
  for (const v of read(() => [...arena().d.getEntities({ type: "minecraft:villager_v2" })]).v ?? []) {
    const loc = read(() => v.location).v;
    if (inArena(loc)) { subjects.push(Math.round(loc.x)); read(() => { v.nameTag = "HIT-ME"; }); }
  }
  say(probe, `adopted subjects-at-x=[${subjects.join(", ")}] heal=every-tick amp=${AMP} nothing cleared`);

  let landed = 0;
  const before = world.beforeEvents.entityHurt.subscribe((ev) => {
    try {
      const e = ev.hurtEntity;
      if (e?.typeId !== "minecraft:villager_v2") return;
      if (ev.damageSource?.damagingEntity?.typeId !== "minecraft:player") return;
      if (inArena(e.location)) ev.damage = AMP;
    } catch (e) { /* the run's own readings report it */ }
  });
  const after = world.afterEvents.entityHurt.subscribe((ev) => {
    const e = ev.hurtEntity;
    if (e?.typeId !== "minecraft:villager_v2") return;
    const by = read(() => ev.damageSource.damagingEntity?.typeId).v ?? "none";
    if (by !== "minecraft:player") return;
    landed++;
    if (landed % 5 === 0 || landed < 4) say(probe, `player hit ${landed} landed damage=${ev.damage} health-now=${val(hp(e))} alive=${alive(e)}`);
  });

  world.sendMessage("§e[village-guard] The surviving villager is now the CONTROL: your hits land, amplified, and it cannot die.");
  world.sendMessage("§e Hit it a dozen times, then trade and see whether 16 per emerald has moved.");
  say(probe, "staged");

  for (let i = 0; i < 120; i++) await wait(100);
  world.beforeEvents.entityHurt.unsubscribe(before);
  world.afterEvents.entityHurt.unsubscribe(after);
  system.clearRun(keeper);
  say(probe, `session-ended player-hits-landed=${landed}`);
}


// -------------------------------- set I: a hit with nothing of ours on the damage path

// Rules out the rig. Every reading so far was taken with a before-event handler rewriting `damage`,
// so the engine never processed an untouched player hit on these subjects. This set writes nothing
// and cancels nothing: it only reads. The one script action is an emergency heal below a third of
// health, which touches health and never the damage, and fires after any gossip would already be
// booked. If the price still does not move under a genuinely vanilla hit, the rig is not the cause.
async function setVanilla() {
  const probe = "vanilla-hit";
  const inArena = (loc) => loc && Math.abs(loc.x - arena().x) <= 10 && Math.abs(loc.z - arena().z) <= 10;

  let landed = 0;
  const after = world.afterEvents.entityHurt.subscribe((ev) => {
    const e = ev.hurtEntity;
    if (e?.typeId !== "minecraft:villager_v2") return;
    const by = read(() => ev.damageSource.damagingEntity?.typeId).v ?? "none";
    if (by !== "minecraft:player") return;
    landed++;
    say(probe, `player hit ${landed} damage=${ev.damage} cause=${read(() => ev.damageSource.cause).v} health-now=${val(hp(e))} alive=${alive(e)} — nothing of ours touched this hit`);
  });
  const rescue = system.runInterval(() => {
    for (const v of read(() => [...arena().d.getEntities({ type: "minecraft:villager_v2" })]).v ?? []) {
      if (!inArena(read(() => v.location).v)) continue;
      const h = read(() => v.getComponent("minecraft:health")).v;
      const cur = read(() => h?.currentValue).v;
      if (typeof cur === "number" && cur < 7) {
        read(() => h.resetToMaxValue());
        say(probe, `rescue heal fired at health=${cur} — the subject was about to die, the hit itself was untouched`);
      }
    }
  }, 1);

  const subjects = [];
  for (const v of read(() => [...arena().d.getEntities({ type: "minecraft:villager_v2" })]).v ?? []) {
    const loc = read(() => v.location).v;
    if (inArena(loc)) { subjects.push(`x=${Math.round(loc.x)} health=${val(hp(v))}`); read(() => { v.nameTag = "VANILLA-HIT"; }); }
  }
  say(probe, `adopted subjects=[${subjects.join(", ")}] no damage write, no cancel, rescue-heal below 7`);
  world.sendMessage("§e[village-guard] Nothing is touching the damage now — these are ordinary hits.");
  world.sendMessage("§e Hit it several times, then trade and read the price again.");

  for (let i = 0; i < 120; i++) await wait(100);
  world.afterEvents.entityHurt.unsubscribe(after);
  system.clearRun(rescue);
  say(probe, `session-ended vanilla-player-hits-landed=${landed}`);
}

// ------------------------------------------------------------------ dispatch

const SETS = {
  sources: { fn: setSources, n: SOURCES.length * 2 },
  conversion: { fn: setConversion, n: 2 },
  reaction: { fn: setReaction, n: 3 },
  client: { fn: setClient, n: 3 },
  gossip: { fn: setGossip, n: 2 },
  cure: { fn: setCure, n: 2 },
  amp: { fn: setAmp, n: 2 },
  control: { fn: setControl, n: 1 },
  vanilla: { fn: setVanilla, n: 1 },
};

system.run(() => {
  prepareArena();
  say("boot", `ready sets=${Object.keys(SETS).join(",")}`);
});

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (!ev.id.startsWith("vgprobe:")) return;
  const name = ev.id.slice("vgprobe:".length);
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
