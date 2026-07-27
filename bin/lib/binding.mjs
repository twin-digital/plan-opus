// Which designs a requirement binds: the designs its applies_to names, or its whole tier when it
// names none. Shared by the checker's settle gate and the foundations view, so the two cannot
// disagree about what an author owes.
import fs from "fs";
import path from "path";
import YAML from "yaml";

// { sets, malformed } — sets is always usable; malformed says the file was there but not a mapping.
export const loadSets = (root) => {
  const file = path.join(root, "sets.yaml");
  if (!fs.existsSync(file)) return { sets: {}, malformed: false };
  const raw = YAML.parse(fs.readFileSync(file, "utf8")) ?? {};
  const ok = raw && typeof raw === "object" && !Array.isArray(raw);
  return { sets: ok ? raw : {}, malformed: !ok };
};

// entry: the requirement. at: { tier, scope } — where it is filed. design: { scope, area }.
export const bindsDesign = (sets, at, entry, design) => {
  if (at.tier === "design") return at.scope === design.scope;
  const names = entry.applies_to;
  if (!Array.isArray(names)) return at.tier === "global" || at.scope === design.area;
  return names.some((n) => {
    const s = String(n);
    return s.startsWith("set:") ? (sets[s.slice(4)] ?? []).includes(design.scope) : s === design.scope;
  });
};
