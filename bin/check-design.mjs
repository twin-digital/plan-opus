import fs from "fs";
import path from "path";
import YAML from "yaml";

// Validates the design tree: schemas, citations, scope visibility, reachability.
// Run from the repo root:  node bin/check-design.mjs
const ROOT = "design";
const REQUIRED = {
  D: ["id", "choice", "falsified_if", "status"],
  Q: ["id", "q"],
  C: ["id", "name", "owns"],
};
const fail = {};
const add = (k, v) => (fail[k] ??= []).push(v);

// ---- load entries at every tier -------------------------------------------
const ent = {}; // id -> {tier, kind, scope, status}
const loadYaml = (f) => {
  try { return YAML.parse(fs.readFileSync(f, "utf8")) ?? []; }
  catch (e) { add("yaml parse", `${f}: ${e.message}`); return []; }
};
const loadScope = (dir, tier, scope) => {
  for (const kind of ["facts", "requirements"]) {
    const f = path.join(dir, `${kind}.yaml`);
    if (!fs.existsSync(f)) continue;
    for (const e of loadYaml(f)) {
      if (ent[e.id]) add("slug at two tiers", `${e.id} (${ent[e.id].scope} + ${scope})`);
      const isFact = kind === "facts";
      // defaults (foundation-default-fields): omit a field whose value is the common case
      e.status ??= "active";
      if (!isFact) e.force ??= "hard";
      for (const f of isFact ? ["id", "claim", "backing", "status"] : ["id", "statement", "force", "status"])
        if (e[f] === undefined) add("missing required field", `${scope} ${e.id}.${f}`);
      if (!isFact && e.force === "hard" && /^\s*force:\s*hard\s*$/m.test(fs.readFileSync(f, "utf8")
            .split(new RegExp(`^- id: ${e.id}$`, "m"))[1]?.split(/^- id: /m)[0] ?? ""))
        add("default stated explicitly", `${scope} ${e.id}.force`);
      ent[e.id] = { tier, scope, kind: isFact ? "fact" : "req", status: e.status };
      if (!isFact) {
        if (e.sources !== undefined) add("requirement with sources", e.id);
        if (e.rationale !== undefined && !/\n/.test(e.rationale))
          add("rationale not a block scalar", e.id);
      }
      for (const s of e.sources ?? []) {
        if (s.url && !s.where) add("url without where", e.id);
        if (!s.url && !s.description) add("source with no locator", e.id);
        if (s.quote && !/\n/.test(s.quote)) add("quote not a block scalar", "requirement with sources", "rationale not a block scalar", e.id);
      }
    }
  }
};
loadScope(ROOT, "global", "global");
const areas = fs.readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
const designs = [];
for (const a of areas) {
  loadScope(path.join(ROOT, a.name), "area", a.name);
  for (const d of fs.readdirSync(path.join(ROOT, a.name), { withFileTypes: true }).filter((x) => x.isDirectory())) {
    const dir = path.join(ROOT, a.name, d.name);
    loadScope(path.join(dir, "inputs"), "design", `${a.name}/${d.name}`);
    designs.push({ area: a.name, name: d.name, dir, md: path.join(dir, "design.md") });
  }
}

// ---- per-design citation checks -------------------------------------------
const reached = new Set();
const exploring = new Set();
for (const d of designs) {
  // no design.md = exploring: inputs captured, nothing argued yet. Its entries are
  // exempt from reachability, since there is no prose to cite them from. (D17)
  if (!fs.existsSync(d.md)) { exploring.add(`${d.area}/${d.name}`); continue; }
  const src = fs.readFileSync(d.md, "utf8");
  const tag = `${d.area}/${d.name}`;
  const block = (n) => {
    const m = src.match(new RegExp(`^## ${n}\\n\\n\`\`\`yaml\\n([\\s\\S]*?)\\n\`\`\``, "m"));
    if (!m) return null;
    try { return YAML.parse(m[1]) ?? []; } catch (e) { add("yaml parse", `${tag} §${n}: ${e.message}`); return []; }
  };
  const ids = new Set();
  for (const [n, pfx] of [["Decisions", "D"], ["Open questions", "Q"], ["Components", "C"]]) {
    const b = block(n);
    if (b === null) continue;                       // block is optional
    if (!Array.isArray(b)) {                        // format this checker predates
      add("unrecognised block shape", `${tag} §${n} — expected a list of entries`);
      continue;
    }
    for (const e of b) {
      ids.add(e.id);
      for (const f of REQUIRED[pfx]) if (e[f] === undefined) add("missing required field", `${tag} ${e.id}.${f}`);
      if (e.revisit !== undefined) {
        const k = Object.keys(e.revisit ?? {});
        if (k.length !== 1 || !["after", "when"].includes(k[0]))
          add("malformed revisit", `${tag} ${e.id} -> [${k}]`);
      }
    }
  }
  const prose = src.slice(src.indexOf("\n## Design\n"))
    .replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  const toks = [...prose.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);
  const inward = new Set(toks.filter((t) => !t.includes(":")));
  const outward = new Set(toks.filter((t) => t.includes(":")));

  for (const t of inward) if (!ids.has(t)) add("unresolved inward", `${tag} ${t}`);
  for (const [n, f] of [["Open questions", "blocks"], ["Components", "depends_on"]])
    for (const e of (Array.isArray(block(n)) ? block(n) : []))
      for (const r of e[f] ?? []) if (!ids.has(r)) add(`unresolved ${f}`, `${tag} ${e.id} -> ${r}`);
  for (const i of ids) if (!inward.has(i)) add("unreferenced D/Q/C", `${tag} ${i}`);
  for (const t of outward) {
    const [k, id] = t.split(":");
    const e = ent[id];
    if (!e) { add("unresolved outward", `${tag} ${t}`); continue; }
    if (e.kind !== k) add("wrong token kind", `${tag} ${t}`);
    if (["superseded", "stale", "retired"].includes(e.status)) add("dead entry cited", `${tag} ${t}`);
    // visibility: a design may only see its own scope, its area, or global
    if (e.tier === "design" && e.scope !== tag) add("cites another design's entry", `${tag} -> ${t} (${e.scope})`);
    if (e.tier === "area" && e.scope !== d.area) add("cites another area's entry", `${tag} -> ${t}`);
    reached.add(id);
  }
}

// ---- reachability: design + area must be consumed; global exempt ----------
for (const [id, v] of Object.entries(ent)) {
  if (v.tier === "global") continue;
  if (exploring.has(v.scope)) continue;
  if (["superseded", "stale", "retired"].includes(v.status)) continue;
  if (!reached.has(id)) add(`unreachable (${v.tier})`, `${v.scope} ${id}`);
}

const CHECKS = ["yaml parse", "unrecognised block shape", "missing required field", "slug at two tiers",
  "url without where", "source with no locator", "quote not a block scalar", "requirement with sources", "rationale not a block scalar", "unresolved inward",
  "unreferenced D/Q/C", "unresolved outward", "wrong token kind",
  "dead entry cited", "cites another design's entry", "cites another area's entry",
  "malformed revisit", "unresolved blocks", "unresolved depends_on", "unreachable (design)", "unreachable (area)"];
for (const c of CHECKS) console.log(`${fail[c] ? "FAIL" : "ok  "}  ${c}: ${fail[c]?.join("; ") ?? "—"}`);
const tiers = Object.values(ent).reduce((a, v) => (a[v.tier] = (a[v.tier] ?? 0) + 1, a), {});
console.log(`\n${designs.length} designs: ${designs.map((d) =>
  `${d.area}/${d.name}${exploring.has(`${d.area}/${d.name}`) ? " (exploring)" : ""}`).join(", ")}`);
console.log(`entries by tier: ${JSON.stringify(tiers)}`);
process.exit(Object.keys(fail).length ? 1 : 0);
