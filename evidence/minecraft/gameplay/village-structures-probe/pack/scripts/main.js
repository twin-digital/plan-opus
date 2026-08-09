// village-guard village-structure probes.
//
// The question: village-guard protects mobs and touches no blocks. What does a village lose when
// its structures — beds, job site blocks, the bell — are destroyed?
//
//   vgvil:api       what @minecraft/server 2.8.0 exposes for a villager's state
//   vgvil:baseline  build a village and show it working: professions, breeding, iron golems
//   vgvil:beds      baseline, then remove every bed, then rebuild them
//   vgvil:jobs      baseline, then remove every job site block, then rebuild them
//   vgvil:bell      baseline, then remove only the bell
//   vgvil:wreck     baseline, then remove everything; long window, then a chunk unload/reload
//
// No client attaches at any point, so nothing here involves a real trade. Every line goes to
// console.warn. Probes report what the engine did; nothing here asserts what it should do.
import { world, system, ItemStack } from "@minecraft/server";

const TAG = "[vgvil] ";
const OVERWORLD = "minecraft:overworld";
const VILLAGER = "minecraft:villager_v2";
const GOLEM = "minecraft:iron_golem";

const say = (probe, s) => console.warn(`${TAG}${probe} :: ${s}`);
const wait = (n) => system.waitTicks(n);
const read = (fn) => {
  try {
    return { ok: true, v: fn(), text: "ok" };
  } catch (e) {
    return { ok: false, v: undefined, text: `threw ${e?.name ?? "Error"}: ${e?.message ?? e}` };
  }
};

// ------------------------------------------------------------------ geometry

// The village sits on a walled stone platform at the world's default spawn, y=100. It is walled so
// villagers stay inside their own case: a villager that wanders off stops being in the village and
// every reading below would measure the walk, not the structures.
const HALF = 20;          // platform is (2*HALF+1) square
const WALL = 4;
let V = null;
const vil = () => {
  if (V) return V;
  const d = world.getDimension(OVERWORLD);
  const sp = world.getDefaultSpawnLocation();
  V = { d, x: Math.floor(sp.x), y: 100, z: Math.floor(sp.z) };
  return V;
};
const cmd = (c) => read(() => vil().d.runCommand(c));

// Bedrock beds are two blocks, a foot and a head one step along `direction`; direction=0 is south
// (+z), so the head sits at z+1.
//
// 30 beds for 8 villagers: breeding needs a free bed, so a village with as many villagers as beds
// stops breeding on its own and the bed case would measure that ceiling rather than the removal.
const BED_COUNT = 30;
const bedSpots = () => {
  const { x, y, z } = vil();
  const out = [];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      out.push({ x: x - 14 + col * 3, y, z: z - 17 + row * 3 });
    }
  }
  return out.slice(0, BED_COUNT);
};

const JOB_BLOCKS = [
  "composter", "barrel", "smoker", "cartography_table", "brewing_stand", "blast_furnace",
  "smithing_table", "grindstone", "stonecutter", "loom", "cauldron", "fletching_table",
  "lectern", "composter", "barrel", "smoker",
];
const jobSpots = () => {
  const { x, y, z } = vil();
  return JOB_BLOCKS.map((b, i) => ({ x: x - 12 + (i % 8) * 3, y, z: z + 6 + Math.floor(i / 8) * 3, b }));
};
const bellSpot = () => { const { x, y, z } = vil(); return { x, y, z: z + 2 }; };

const placeBeds = () => {
  let n = 0;
  for (const s of bedSpots()) {
    cmd(`setblock ${s.x} ${s.y} ${s.z} bed ["direction"=0,"head_piece_bit"=false]`);
    cmd(`setblock ${s.x} ${s.y} ${s.z + 1} bed ["direction"=0,"head_piece_bit"=true]`);
    n++;
  }
  return n;
};
const placeJobs = () => {
  let n = 0;
  for (const s of jobSpots()) { cmd(`setblock ${s.x} ${s.y} ${s.z} ${s.b}`); n++; }
  return n;
};
const placeBell = () => {
  const s = bellSpot();
  cmd(`setblock ${s.x} ${s.y} ${s.z} bell ["attachment"="standing","direction"=0]`);
};
const removeBeds = () => {
  for (const s of bedSpots()) {
    cmd(`setblock ${s.x} ${s.y} ${s.z} air destroy`);
    cmd(`setblock ${s.x} ${s.y} ${s.z + 1} air destroy`);
  }
};
const removeJobs = () => { for (const s of jobSpots()) cmd(`setblock ${s.x} ${s.y} ${s.z} air destroy`); };
const removeBell = () => { const s = bellSpot(); cmd(`setblock ${s.x} ${s.y} ${s.z} air destroy`); };

// Counts read back from the world, so a placement that silently failed shows as a low count rather
// than as an effect of the case.
const blockCounts = () => {
  const { d } = vil();
  let beds = 0, occupied = 0, jobs = 0, bells = 0;
  for (const s of bedSpots()) {
    const b = read(() => d.getBlock({ x: s.x, y: s.y, z: s.z })).v;
    if (b?.typeId === "minecraft:bed") {
      beds++;
      if (read(() => b.permutation.getState("occupied_bit")).v === true) occupied++;
    }
  }
  for (const s of jobSpots()) {
    const b = read(() => d.getBlock({ x: s.x, y: s.y, z: s.z })).v;
    if (b && b.typeId !== "minecraft:air") jobs++;
  }
  const bl = read(() => d.getBlock(bellSpot())).v;
  if (bl?.typeId === "minecraft:bell") bells++;
  return { beds, occupied, jobs, bells };
};

// Nothing at the platform's coordinates is loaded until a ticking area holds it, and with no player
// on the server nothing else ever will be. Every build below waits on this.
const holdChunks = async () => {
  const { x, y, z } = vil();
  cmd(`tickingarea add circle ${x} ${y} ${z} 4 vgvil`);
  await wait(60);
};

const buildPlatform = async () => {
  const { d, x, y, z } = vil();
  const H = HALF;
  await holdChunks();
  const lines = [
    "gamerule dodaylightcycle false",
    "gamerule domobspawning true",
    "gamerule mobgriefing true",
    "gamerule sendcommandfeedback false",
    "gamerule randomtickspeed 3",
    "time set day",
    `fill ${x - H} ${y - 1} ${z - H} ${x + H} ${y - 1} ${z + H} grass_block`,
    `fill ${x - H} ${y} ${z - H} ${x + H} ${y + 10} ${z + H} air`,
    `fill ${x - H} ${y} ${z - H} ${x + H} ${y + WALL} ${z - H} stone`,
    `fill ${x - H} ${y} ${z + H} ${x + H} ${y + WALL} ${z + H} stone`,
    `fill ${x - H} ${y} ${z - H} ${x - H} ${y + WALL} ${z + H} stone`,
    `fill ${x + H} ${y} ${z - H} ${x + H} ${y + WALL} ${z + H} stone`,
  ];
  for (let attempt = 1; attempt <= 10; attempt++) {
    for (const c of lines) cmd(c);
    await wait(20);
    if (read(() => d.getBlock({ x, y: y - 1, z })?.typeId).v === "minecraft:grass_block") {
      say("village", `platform built centre=(${x},${y},${z}) half=${H} attempts=${attempt}`);
      return true;
    }
  }
  say("village", `PLATFORM-NOT-BUILT centre=(${x},${y},${z}) - every case below measures a fall`);
  return false;
};

// ------------------------------------------------------------------ villagers

const villagers = () => read(() => [...vil().d.getEntities({ type: VILLAGER })]).v ?? [];
const golems = () => read(() => [...vil().d.getEntities({ type: GOLEM })]).v ?? [];
// The script API exposes no profession, trade or village surface for a villager — `getComponents`
// on one returns movement, inventory, health, variant, mark_variant, skin_id and type_family and
// nothing else. These three integers are the whole of a villager's readable identity.
const prof = (e) =>
  `v${read(() => e.getComponent("minecraft:variant")?.value).v}` +
  `m${read(() => e.getComponent("minecraft:mark_variant")?.value).v}` +
  `s${read(() => e.getComponent("minecraft:skin_id")?.value).v}`;
const isBaby = (e) => read(() => e.getComponent("minecraft:is_baby") !== undefined).v === true;

const feed = (e, count = 3) => {
  const inv = read(() => e.getComponent("minecraft:inventory")?.container).v;
  if (!inv) return "no-inventory";
  const r = read(() => { inv.addItem(new ItemStack("minecraft:bread", 16)); return "ok"; });
  return r.ok ? "ok" : r.text;
};

const VILLAGER_COUNT = 8;
const spawnVillagers = async (n = VILLAGER_COUNT) => {
  const { d, x, y, z } = vil();
  let ok = 0;
  let fedNote = "";
  for (let i = 0; i < n; i++) {
    const e = read(() => d.spawnEntity(VILLAGER, { x: x + 0.5 + (i % 4) - 2, y, z: z - 3 + Math.floor(i / 4) })).v;
    if (!e) continue;
    ok++;
    fedNote = feed(e);
  }
  await wait(20);
  say("village", `villagers spawned=${ok}/${n} feed=${fedNote}`);
  return ok;
};

// ------------------------------------------------------------------ the watch

// One watcher per set. Spawn events are the only reachable signal for a birth or a golem, so the
// counts below are events seen, not a census.
const makeWatch = (probe) => {
  const w = {
    phase: "setup", t: 0, born: 0, golemSpawns: 0, otherSpawns: 0, deaths: 0,
    byPhase: {}, off: () => {},
  };
  const bump = (k) => {
    w.byPhase[w.phase] = w.byPhase[w.phase] ?? { born: 0, golem: 0, died: 0 };
    w.byPhase[w.phase][k]++;
  };
  const onSpawn = world.afterEvents.entitySpawn.subscribe((ev) => {
    const type = read(() => ev.entity?.typeId).v;
    const cause = ev.cause;
    if (type === VILLAGER && cause === "Born") {
      w.born++; bump("born");
      say(probe, `spawn phase=${w.phase} t=${w.t} cause=Born type=${type} bornTotal=${w.born}`);
    } else if (type === GOLEM) {
      w.golemSpawns++; bump("golem");
      say(probe, `spawn phase=${w.phase} t=${w.t} cause=${cause} type=${type} golemTotal=${w.golemSpawns}`);
    } else if (type !== VILLAGER) {
      w.otherSpawns++;
    }
  });
  const onDie = world.afterEvents.entityDie.subscribe((ev) => {
    const type = read(() => ev.deadEntity?.typeId).v;
    if (type === VILLAGER || type === GOLEM) {
      w.deaths++; bump("died");
      say(probe, `died phase=${w.phase} t=${w.t} type=${type} cause=${ev.damageSource?.cause}`);
    }
  });
  w.off = () => { world.afterEvents.entitySpawn.unsubscribe(onSpawn); world.afterEvents.entityDie.unsubscribe(onDie); };
  return w;
};

const professionCensus = () => {
  const hist = {};
  let adults = 0, babies = 0;
  for (const e of villagers()) {
    if (isBaby(e)) { babies++; continue; }
    adults++;
    const p = prof(e);
    const k = String(p);
    hist[k] = (hist[k] ?? 0) + 1;
  }
  return { hist, adults, babies };
};

const snap = (probe, w) => {
  const b = blockCounts();
  const c = professionCensus();
  const hist = Object.keys(c.hist).sort().map((k) => `${k}x${c.hist[k]}`).join("|");
  say(probe, `snap phase=${w.phase} t=${w.t} villagers=${c.adults + c.babies} adults=${c.adults} babies=${c.babies} golems=${golems().length} born=${w.born} golemSpawns=${w.golemSpawns} beds=${b.beds} bedsOccupied=${b.occupied} jobs=${b.jobs} bells=${b.bells} professions=${hist}`);
};

// Runs a phase for `ticks`, snapshotting every `every` ticks, and returns what the phase saw.
const phase = async (probe, w, name, ticks, every = 600) => {
  const at = { born: w.born, golem: w.golemSpawns, died: w.deaths };
  w.phase = name;
  w.t = 0;
  say(probe, `phase-start name=${name} ticks=${ticks}`);
  snap(probe, w);
  for (let t = 0; t < ticks; t += every) {
    await wait(Math.min(every, ticks - t));
    w.t = t + every;
    snap(probe, w);
  }
  const got = { born: w.born - at.born, golem: w.golemSpawns - at.golem, died: w.deaths - at.died };
  say(probe, `phase-end name=${name} ticks=${ticks} bornInPhase=${got.born} golemSpawnsInPhase=${got.golem} deathsInPhase=${got.died}`);
  return got;
};

// Per-villager profession, keyed by entity id, so a rebuild can be read as the same villager
// re-claiming or a fresh choice.
const professionMap = () => {
  const m = new Map();
  for (const e of villagers()) if (!isBaby(e)) m.set(read(() => e.id).v, prof(e));
  return m;
};
const reportProfessionMove = (probe, label, before, after) => {
  const lines = [];
  for (const [id, p] of before) {
    const q = after.has(id) ? after.get(id) : "gone";
    lines.push(`${String(id).slice(-4)}:${p}->${q}`);
  }
  const same = lines.filter((l) => l.split("->")[0].split(":")[1] === l.split("->")[1]).length;
  say(probe, `professions ${label} tracked=${before.size} unchanged=${same} moves=[${lines.join(",")}]`);
};

// ------------------------------------------------------------------ the village

const BUILD_SETTLE = 200;
const buildVillage = async (probe, count = VILLAGER_COUNT) => {
  if (!(await buildPlatform())) return false;
  cmd(`tickingarea add circle ${vil().x} ${vil().y} ${vil().z} 4 vgvil`);
  const beds = placeBeds();
  const jobs = placeJobs();
  placeBell();
  await wait(40);
  const b = blockCounts();
  say(probe, `village-built bedsPlaced=${beds} bedsRead=${b.beds} jobsPlaced=${jobs} jobsRead=${b.jobs} bells=${b.bells}`);
  await spawnVillagers(count);
  await wait(BUILD_SETTLE);
  return true;
};

// ------------------------------------------------------------------ the sets

const DEFAULT_BASELINE = 6000;
const DEFAULT_CASE = 6000;

async function setApi(probe) {
  const { d, x, y, z } = vil();
  await buildPlatform();
  const e = read(() => d.spawnEntity(VILLAGER, { x: x + 0.5, y, z: z + 0.5 })).v;
  if (!e) { say(probe, "VILLAGER-SPAWN-FAILED"); return; }
  await wait(20);
  const comps = read(() => e.getComponents().map((c) => c.typeId)).v ?? [];
  say(probe, `villager components=[${comps.join(",")}]`);
  const props = read(() => e.getPropertyIds?.() ?? []).v ?? [];
  say(probe, `villager propertyIds=[${props.join(",")}]`);
  for (const c of ["minecraft:variant", "minecraft:mark_variant", "minecraft:is_baby", "minecraft:inventory", "minecraft:tameable", "minecraft:trade_table", "minecraft:trade_resupply", "minecraft:economy_trade_table"]) {
    const r = read(() => {
      const got = e.getComponent(c);
      if (!got) return "absent";
      return `present value=${got.value ?? "n/a"}`;
    });
    say(probe, `component ${c} -> ${r.ok ? r.v : r.text}`);
  }
  for (const k of ["villagerProfession", "minecraft:has_trades"]) {
    say(probe, `getProperty ${k} -> ${read(() => String(e.getProperty(k))).ok ? read(() => String(e.getProperty(k))).v : "threw"}`);
  }
  read(() => e.remove());
}

async function setBaseline(probe, ticks) {
  const w = makeWatch(probe);
  if (!(await buildVillage(probe))) { w.off(); return; }
  await phase(probe, w, "baseline-day", ticks);
  cmd("time set night");
  await phase(probe, w, "baseline-night", ticks);
  cmd("time set day");
  await phase(probe, w, "baseline-day2", ticks);
  w.off();
}

async function setBeds(probe, ticks) {
  const w = makeWatch(probe);
  if (!(await buildVillage(probe))) { w.off(); return; }
  await phase(probe, w, "with-beds", ticks);
  removeBeds();
  await wait(40);
  say(probe, `destroyed beds; counts=${JSON.stringify(blockCounts())}`);
  await phase(probe, w, "no-beds", ticks);
  placeBeds();
  await wait(40);
  say(probe, `rebuilt beds; counts=${JSON.stringify(blockCounts())}`);
  await phase(probe, w, "beds-rebuilt", ticks);
  w.off();
}

async function setJobs(probe, ticks) {
  const w = makeWatch(probe);
  if (!(await buildVillage(probe))) { w.off(); return; }
  await phase(probe, w, "with-jobs", ticks);
  const before = professionMap();
  removeJobs();
  await wait(40);
  say(probe, `destroyed job sites; counts=${JSON.stringify(blockCounts())}`);
  await phase(probe, w, "no-jobs", ticks);
  reportProfessionMove(probe, "after-job-site-destroyed", before, professionMap());
  const mid = professionMap();
  placeJobs();
  await wait(40);
  say(probe, `rebuilt job sites; counts=${JSON.stringify(blockCounts())}`);
  await phase(probe, w, "jobs-rebuilt", ticks);
  reportProfessionMove(probe, "after-job-site-rebuilt", mid, professionMap());
  reportProfessionMove(probe, "start-to-finish", before, professionMap());
  w.off();
}

async function setBell(probe, ticks) {
  const w = makeWatch(probe);
  if (!(await buildVillage(probe))) { w.off(); return; }
  await phase(probe, w, "with-bell", ticks);
  removeBell();
  await wait(40);
  say(probe, `destroyed bell only; counts=${JSON.stringify(blockCounts())}`);
  await phase(probe, w, "no-bell", ticks);
  w.off();
}

async function setWreck(probe, ticks) {
  const w = makeWatch(probe);
  if (!(await buildVillage(probe))) { w.off(); return; }
  await phase(probe, w, "intact", ticks);
  const before = professionMap();
  removeBeds(); removeJobs(); removeBell();
  await wait(40);
  say(probe, `destroyed everything; counts=${JSON.stringify(blockCounts())}`);
  await phase(probe, w, "razed", ticks * 3, 1200);
  reportProfessionMove(probe, "after-everything-destroyed", before, professionMap());
  const alive = villagers().length;
  say(probe, `razed-survivors villagers=${alive} of ${before.size} adults tracked`);

  // A chunk unload/reload: with no player anywhere, the ticking area is the only thing keeping
  // these chunks loaded, so dropping it unloads them.
  cmd("tickingarea remove vgvil");
  await wait(200);
  say(probe, `ticking area removed; villagers visible=${villagers().length}`);
  await wait(1200);
  cmd(`tickingarea add circle ${vil().x} ${vil().y} ${vil().z} 4 vgvil`);
  await wait(200);
  const back = villagers().length;
  say(probe, `reload villagersAfterReload=${back} beforeUnload=${alive} match=${back === alive}`);
  await phase(probe, w, "after-reload", ticks);
  w.off();
}

// ------------------------------------------------------------------ steps
//
// The record diff is the primary measurement, and a database snapshot has to be taken from outside
// the engine, so the driver steps the village one command at a time and snapshots between them.
// The composite sets above run the same sequence without the snapshots.

let W = null;
let MARK = null;

const steps = {
  build: async (probe, msg) => {
    W = W ?? makeWatch("watch");
    await buildVillage(probe, Number(msg) > 0 ? Number(msg) : VILLAGER_COUNT);
  },
  label: async (probe, msg) => { if (W) { W.phase = msg || "unnamed"; W.t = 0; } say(probe, `label=${msg}`); },
  watch: async (probe, msg) => {
    if (!W) { say(probe, "NO-WATCH - build first"); return; }
    await phase(probe, W, W.phase, Number(msg) > 0 ? Number(msg) : DEFAULT_CASE);
  },
  snap: async (probe) => { if (W) snap(probe, W); },
  mark: async (probe) => { MARK = professionMap(); say(probe, `mark tracked=${MARK.size}`); },
  diff: async (probe, msg) => {
    if (!MARK) { say(probe, "NO-MARK"); return; }
    reportProfessionMove(probe, msg || "diff", MARK, professionMap());
  },
  destroy: async (probe, msg) => {
    if (msg === "beds" || msg === "all") removeBeds();
    if (msg === "jobs" || msg === "all") removeJobs();
    if (msg === "bell" || msg === "all") removeBell();
    await wait(40);
    say(probe, `destroyed=${msg} counts=${JSON.stringify(blockCounts())}`);
  },
  rebuild: async (probe, msg) => {
    if (msg === "beds" || msg === "all") placeBeds();
    if (msg === "jobs" || msg === "all") placeJobs();
    if (msg === "bell" || msg === "all") placeBell();
    await wait(40);
    say(probe, `rebuilt=${msg} counts=${JSON.stringify(blockCounts())}`);
  },
  time: async (probe, msg) => { cmd(`time set ${msg || "day"}`); say(probe, `time=${msg}`); },
  // A real night is needed for villagers to sleep, and a lit platform is what keeps that night from
  // filling with hostile mobs and turning the case into a siege.
  cycle: async (probe, msg) => {
    const { x, y, z } = vil();
    let lights = 0;
    for (let dx = -HALF + 2; dx <= HALF - 2; dx += 5) {
      for (let dz = -HALF + 2; dz <= HALF - 2; dz += 5) {
        cmd(`setblock ${x + dx} ${y + 4} ${z + dz} light_block_15`);
        lights++;
      }
    }
    cmd(`gamerule dodaylightcycle ${msg === "off" ? "false" : "true"}`);
    await wait(20);
    say(probe, `cycle=${msg || "on"} lights=${lights}`);
  },
  unload: async (probe) => {
    cmd("tickingarea remove vgvil");
    await wait(200);
    say(probe, `unload villagersVisible=${villagers().length}`);
  },
  reload: async (probe) => {
    cmd(`tickingarea add circle ${vil().x} ${vil().y} ${vil().z} 4 vgvil`);
    await wait(200);
    say(probe, `reload villagersVisible=${villagers().length} golemsVisible=${golems().length}`);
  },
  // A command-spawned villager arrives with a profession already. To watch one *take* a job from a
  // job site block, the probe first needs an unemployed one; this reports which vanilla entity
  // events reach that state.
  events: async (probe) => {
    const { d, x, y, z } = vil();
    const candidates = [
      "minecraft:spawn_villager", "minecraft:become_villager", "minecraft:become_unskilled",
      "minecraft:spawn_farmer", "minecraft:become_farmer", "minecraft:unskilled",
      "minecraft:convert_to_villager", "minecraft:spawn_unskilled",
    ];
    for (const ev of candidates) {
      const e = read(() => d.spawnEntity(VILLAGER, { x: x + 0.5, y, z: z + 0.5 })).v;
      if (!e) { say(probe, `event ${ev} SPAWN-FAILED`); continue; }
      await wait(5);
      const was = prof(e);
      const r = read(() => e.triggerEvent(ev));
      await wait(10);
      say(probe, `event ${ev} trigger=${r.ok ? "ok" : r.text.split(":")[0]} before=${was} after=${prof(e)}`);
      read(() => e.remove());
    }
    const tagged = read(() => d.spawnEntity(`${VILLAGER}<minecraft:spawn_villager>`, { x: x + 0.5, y, z: z + 0.5 })).v;
    say(probe, `spawn-with-event villager_v2<minecraft:spawn_villager> -> ${tagged ? prof(tagged) : "SPAWN-FAILED"}`);
    if (tagged) read(() => tagged.remove());
  },
  hurt: async (probe) => {
    // A villager the driver can find again in the DWELLERS record: one villager, named and tagged.
    const list = villagers();
    if (list.length === 0) { say(probe, "NO-VILLAGERS"); return; }
    read(() => list[0].nameTag = "SUBJECT");
    say(probe, `subject id=${read(() => list[0].id).v} prof=${prof(list[0])}`);
  },
};

// ------------------------------------------------------------------ dispatch

const SETS = { api: setApi, baseline: setBaseline, beds: setBeds, jobs: setJobs, bell: setBell, wreck: setWreck };

system.run(() => {
  say("boot", `ready sets=${Object.keys(SETS).join(",")}`);
});

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (!ev.id.startsWith("vgvil:")) return;
  const name = ev.id.slice("vgvil:".length);
  const step = steps[name];
  const set = SETS[name];
  if (!step && !set) { say("dispatch", `unknown command ${name}`); return; }
  const ticks = Number(ev.message) > 0 ? Number(ev.message) : (name === "baseline" ? DEFAULT_BASELINE : DEFAULT_CASE);
  system.run(async () => {
    say(name, `start ${step ? `msg=${ev.message}` : `ticks=${ticks}`}`);
    try {
      if (step) await step(name, String(ev.message ?? "").trim());
      else await set(name, ticks);
    } catch (e) {
      say(name, `PROBE CRASHED ${e?.name}: ${e?.message}\n${e?.stack}`);
    }
    say(name, "complete");
  });
});
