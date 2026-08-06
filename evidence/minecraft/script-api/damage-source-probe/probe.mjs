// What does @minecraft/server's damage vocabulary let a handler know about who dealt a hit?
// Reads the pinned declarations rather than the engine: the question is what the type surface
// offers, and a pack can only branch on what is declared.
//
//   node probe.mjs   # writes probe.out.txt beside this file
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DTS = process.argv[2] ?? path.join(DIR, "index.d.ts");
const src = fs.readFileSync(DTS, "utf8");
const out = [];
const say = (s) => out.push(s);

const causes = (src.match(/export enum EntityDamageCause \{[^}]*\}/s) ?? [""])[0]
  .split("\n").map((l) => (l.match(/^\s+(\w+) = /) ?? [])[1]).filter(Boolean);
say(`EntityDamageCause members=${causes.length}`);
say(`EntityDamageCause values=${causes.join(",")}`);
for (const needle of ["player", "Player", "mob", "Mob"]) {
  const hits = causes.filter((c) => c.includes(needle));
  say(`EntityDamageCause members containing "${needle}": ${hits.length ? hits.join(",") : "none"}`);
}

const dsrc = (src.match(/export interface EntityDamageSource \{.*?\n\}/s) ?? [""])[0];
const fields = [...dsrc.matchAll(/^\s{4}(\w+)(\??): /gm)].map((m) => `${m[1]}${m[2]}`);
say(`EntityDamageSource fields=${fields.join(",")}`);

say(`reputation/gossip identifiers in the module: ${(src.match(/gossip|reputation/gi) ?? []).length}`);

const text = out.join("\n") + "\n";
fs.writeFileSync(path.join(DIR, "probe.out.txt"), text);
process.stdout.write(text);
