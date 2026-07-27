// Which designs a requirement binds: the designs its applies_to names, or its whole tier when it
// names none. Shared by the checker's settle gate and the foundations view, so the two cannot
// disagree about what an author owes.
//
// A requirement never binds outside its own tier — applies_to narrows, never widens — which is
// what lets the foundations view answer "what binds me" from three directories rather than a
// repo-wide scan. Sets are tiered for the same reason: an area's sets.yaml holds only that area's
// designs, so "is this set within my area?" is answered by where the file sits.
import fs from "fs";
import path from "path";
import YAML from "yaml";

// sets: name -> { members, tier, scope, file }. malformed: files that were not mappings.
export const loadSets = (root) => {
  const sets = {}, malformed = [], duplicates = [];
  const readOne = (dir, tier, scope) => {
    const file = path.join(dir, "sets.yaml");
    if (!fs.existsSync(file)) return;
    const raw = YAML.parse(fs.readFileSync(file, "utf8")) ?? {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return void malformed.push(file);
    for (const [name, members] of Object.entries(raw)) {
      if (sets[name]) duplicates.push(`${name} (${sets[name].file} + ${file})`);
      sets[name] = { members, tier, scope, file };
    }
  };
  readOne(root, "global", "global");
  for (const a of fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()))
    readOne(path.join(root, a.name), "area", a.name);
  return { sets, malformed, duplicates };
};

const membersOf = (sets, name) => {
  const s = sets[name];
  return Array.isArray(s?.members) ? s.members : [];
};

// entry: the requirement. at: { tier, scope } — where it is filed. design: { scope, area }.
export const bindsDesign = (sets, at, entry, design) => {
  if (at.tier === "design") return at.scope === design.scope;
  if (at.tier === "area" && at.scope !== design.area) return false; // never widens past its tier
  const names = entry.applies_to;
  if (!Array.isArray(names)) return true;
  return names.some((n) => {
    const s = String(n);
    return s.startsWith("set:") ? membersOf(sets, s.slice(4)).includes(design.scope) : s === design.scope;
  });
};

// Can a requirement filed at `at` reach this target? A global one reaches anything; an area one
// reaches only its own area's designs and its own area's sets.
export const reachable = (sets, at, target) => {
  if (at.tier === "global") return true;
  const s = String(target);
  if (s.startsWith("set:")) return sets[s.slice(4)]?.scope === at.scope;
  return s.startsWith(`${at.scope}/`);
};
