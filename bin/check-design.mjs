// Validates the design tree against the doc-structure format.
// Run from the repo root:  node bin/check-design.mjs
//
// Foundations (facts, requirements, decisions) are the citable entries. Facts and
// requirements live in YAML files at three scopes — design (in the design's own dir), area,
// global; decisions live in a decisions.yaml beside a design's spec.md. Components and open
// questions live in spec.md and are never cited. Citations are [[k:id]] with k in f/r/d.
//
// The rule numbers in comments map to the Invariants table in the doc-structure design.
import fs from "fs";
import path from "path";
import YAML from "yaml";

const ROOT = "design";
const fail = {};
const NOTICES = new Set(["legacy format — regenerate"]);
const add = (k, v) => (fail[k] ??= []).push(v);
const isDead = (e) => e?.status === "retired" || e?.status === "rejected";
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const loadYaml = (f) => {
  try { return YAML.parse(fs.readFileSync(f, "utf8")) ?? []; }
  catch (e) { add("yaml parse", `${f}: ${e.message}`); return []; }
};

// is a key written literally in the raw entry text? (for "default stated explicitly")
const literalHas = (file, id, key) => {
  if (!fs.existsSync(file)) return false;
  const after = fs.readFileSync(file, "utf8").split(new RegExp(`^- id: ${id}\\b`, "m"))[1] ?? "";
  const entry = after.split(/^- id: /m)[0];
  return new RegExp(`^\\s+${key}:`, "m").test(entry);
};

// ---- load foundations across scopes -----------------------------------------
// ent[id] = {kind:'f'|'r'|'d', tier, scope, e, file}
const ent = {};
const declare = (id, rec) => {
  if (ent[id]) add("slug not unique per kind", `${id} (${ent[id].scope} + ${rec.scope})`); // rule 4
  ent[id] = rec;
};

const loadScope = (dir, tier, scope) => {
  for (const [kind, name] of [["f", "facts.yaml"], ["r", "requirements.yaml"]]) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) continue;
    for (const e of loadYaml(file)) { declare(e.id, { kind, tier, scope, e, file }); checkEntry(kind, e, scope, file); }
  }
};

const areas = fs.readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
const designs = [];
loadScope(ROOT, "global", "global");
for (const a of areas) {
  loadScope(path.join(ROOT, a.name), "area", a.name);
  for (const d of fs.readdirSync(path.join(ROOT, a.name), { withFileTypes: true }).filter((x) => x.isDirectory())) {
    const dir = path.join(ROOT, a.name, d.name), scope = `${a.name}/${d.name}`;
    loadScope(dir, "design", scope);
    const decFile = path.join(dir, "decisions.yaml");
    if (fs.existsSync(decFile))
      for (const e of loadYaml(decFile)) { declare(e.id, { kind: "d", tier: "design", scope, e, file: decFile }); checkEntry("d", e, scope, decFile); }
    designs.push({ area: a.name, name: d.name, dir, scope, md: path.join(dir, "spec.md"), decFile });
  }
}

// ---- per-entry schema checks (rules 4,6,7,8,9) ------------------------------
function checkEntry(kind, e, scope, file) {
  const tag = `${scope} ${e.id}`;
  if (!e.id || !KEBAB.test(String(e.id))) add("id not kebab-case", tag);

  if (kind === "f") {
    for (const f of ["id", "claim", "backing"]) if (e[f] === undefined) add("missing required field", `${tag}.${f}`);
    if (!["tested", "documented", "assumed"].includes(e.backing)) add("bad backing", tag);
    if (e.status !== undefined && !["active", "retired"].includes(e.status)) add("bad fact status", tag);
    if (literalHas(file, e.id, "status") && e.status === "active") add("default stated explicitly", `${tag}.status`);
    if (e.status === "retired") {
      if (!e.reason) add("retired fact without reason", tag);
      else if (!["superseded", "disproven", "stale"].includes(e.reason)) add("bad retire reason", tag);
      if (e.reason === "superseded") {
        if (!e.superseded_by) add("superseded fact without superseded_by", tag);
        else if (!ent[e.superseded_by]) add("superseded_by unresolved", `${tag} -> ${e.superseded_by}`);
        else if (e.superseded_by === e.id) add("fact supersedes itself", tag);
      }
    }
    checkSources(e, tag);
  }

  if (kind === "r") {
    for (const f of ["id", "statement"]) if (e[f] === undefined) add("missing required field", `${tag}.${f}`);
    if (e.force !== undefined && !["hard", "soft"].includes(e.force)) add("bad force", tag);
    if (e.status !== undefined && !["active", "retired"].includes(e.status)) add("bad requirement status", tag);
    if (literalHas(file, e.id, "force") && e.force === "hard") add("default stated explicitly", `${tag}.force`);
    if (literalHas(file, e.id, "status") && e.status === "active") add("default stated explicitly", `${tag}.status`);
    if (e.sources !== undefined) add("requirement with sources", tag);
    if (e.rationale !== undefined && !/\n/.test(String(e.rationale))) add("rationale not a block scalar", tag);
  }

  if (kind === "d") {
    for (const f of ["id", "statement"]) if (e[f] === undefined) add("missing required field", `${tag}.${f}`);
    if (e.status !== "rejected" && (!Array.isArray(e.falsifiers) || e.falsifiers.length < 1)) add("decision without a falsifier", tag);
    if (e.status !== undefined && !["proposed", "accepted", "tolerated", "rejected"].includes(e.status)) add("bad decision status", tag);
    if (literalHas(file, e.id, "status") && e.status === "proposed") add("default stated explicitly", `${tag}.status`);
  }
}

function checkSources(e, tag) { // rule 7
  const srcs = e.sources ?? [];
  if (!srcs.length) { add("fact without a source", tag); return; }
  for (const s of srcs) {
    const hasUrl = s.url !== undefined, hasWhere = s.where !== undefined, hasDesc = s.description !== undefined;
    if (hasUrl && hasDesc) add("source has both url and description", tag);
    if (!hasUrl && !hasDesc) add("source has no locator", tag);
    if (hasUrl && !hasWhere) add("url without where", tag);
    if (hasUrl && /^(\.\.?\/)/.test(String(s.url))) add("in-repo url not repo-root-relative", `${tag}: ${s.url}`);
    if (s.quote !== undefined && !/\n/.test(String(s.quote))) add("quote not a block scalar", tag);
  }
}

// ---- per-design document checks ---------------------------------------------
for (const d of designs) {
  const tag = d.scope, hasDoc = fs.existsSync(d.md), hasDec = fs.existsSync(d.decFile);
  d.state = !hasDoc ? "exploring" : null;
  if (!hasDoc) continue;

  const src = fs.readFileSync(d.md, "utf8");
  const legacy = /\[\[[DQC]\d+\]\]/.test(src) || /^```yaml\n- id:/m.test(src);
  if (legacy) { add("legacy format — regenerate", tag); d.state = "legacy"; continue; }

  const blocks = {};
  for (const m of src.matchAll(/```yaml\n([\s\S]*?)\n```/g)) {
    let parsed; try { parsed = YAML.parse(m[1]); } catch (e) { add("yaml parse", `${tag} block: ${e.message}`); continue; }
    if (parsed && typeof parsed === "object") for (const key of Object.keys(parsed)) blocks[key] = parsed[key];
  }
  const questions = Array.isArray(blocks.questions) ? blocks.questions : [];
  const components = Array.isArray(blocks.components) ? blocks.components : [];
  if ("questions" in blocks && questions.length === 0) add("empty questions block", tag);   // rule 10 — omit the section when empty
  if ("components" in blocks && components.length === 0) add("empty components block", tag); // rule 10 — omit the section when empty

  for (const c of components) {
    if (!c.id) { add("component missing id", tag); continue; }
    if (!c.responsibility) add("component missing responsibility", `${tag} ${c.id}`);
  }
  const compIds = new Set(components.map((c) => c.id));
  for (const c of components) for (const a of c.after ?? []) if (!compIds.has(a)) add("component after unresolved", `${tag} ${c.id} -> ${a}`);
  for (const q of questions) {
    if (!q.id) { add("question missing id", tag); continue; }
    if (!q.question) add("question missing text", `${tag} ${q.id}`);
    if (!["fact", "requirement", "decision"].includes(q.closes)) add("question closes bad kind", `${tag} ${q.id}`);
    for (const g of q.gates ?? []) { const t = ent[g]; if (!t || t.kind !== "d" || t.scope !== d.scope) add("question gates non-local decision", `${tag} ${q.id} -> ${g}`); } // rule 13
  }

  const decs = hasDec ? loadYaml(d.decFile) : [];
  d.state = questions.length || decs.some((x) => (x.status ?? "proposed") === "proposed") ? "draft" : "settled"; // rule 16

  const prose = src.replace(/^```[\s\S]*?^```/gm, "").replace(/`[^`\n]*`/g, "");
  const toks = [...prose.matchAll(/\[\[([a-z]):([a-z0-9-]+)\]\]/g)];
  for (const m of prose.matchAll(/\[\[([^\]]*)\]\]/g)) if (!/^[a-z]:[a-z0-9-]+$/.test(m[1])) add("malformed citation token", `${tag} [[${m[1]}]]`); // rule 11
  for (const [, k, id] of toks) {
    if (!["f", "r", "d"].includes(k)) { add("citation of non-foundation kind", `${tag} [[${k}:${id}]]`); continue; } // rule 12
    const t = ent[id];
    if (!t) { add("citation unresolved", `${tag} [[${k}:${id}]]`); continue; } // rule 11
    if (t.kind !== k) add("citation kind mismatch", `${tag} [[${k}:${id}]] is ${t.kind}`);
    if (isDead(t.e)) add("citation of dead entry", `${tag} [[${k}:${id}]] (${t.e.status})`); // rule 12
    if (k === "d" && t.scope !== d.scope) add("decision cited across designs", `${tag} [[d:${id}]] (${t.scope})`); // rule 13
    if (t.tier === "design" && t.scope !== d.scope) add("cites another design's entry", `${tag} [[${k}:${id}]]`); // scope visibility
    if (t.tier === "area" && t.scope !== d.area) add("cites another area's entry", `${tag} [[${k}:${id}]]`);
  }

  // settle gate (rule 14): a settle-eligible design cannot settle while a live design-scoped
  // requirement or an accepted/tolerated decision it holds goes uncited; a rejected one is exempt.
  if (d.state === "settled") {
    const uncited = [];
    for (const x of decs) {
      if (isDead(x) || (x.status ?? "proposed") === "rejected") continue;
      if (!toks.some(([, k, id]) => k === "d" && id === x.id)) uncited.push(`d:${x.id}`);
    }
    for (const [id, r] of Object.entries(ent)) {
      if (r.kind !== "r" || r.tier !== "design" || r.scope !== d.scope || isDead(r.e)) continue;
      if (!toks.some(([, k, i]) => k === "r" && i === id)) uncited.push(`r:${id}`);
    }
    if (uncited.length) { d.state = "draft"; for (const u of uncited) add("uncited at settle", `${tag} ${u}`); }
  }
}

// ---- report -----------------------------------------------------------------
const ORDER = [
  "yaml parse", "legacy format — regenerate", "id not kebab-case", "slug not unique per kind",
  "missing required field", "bad backing", "bad fact status", "bad requirement status",
  "bad decision status", "bad force", "bad retire reason", "retired fact without reason",
  "superseded fact without superseded_by", "superseded_by unresolved", "fact supersedes itself",
  "decision without a falsifier", "requirement with sources", "rationale not a block scalar",
  "fact without a source", "source has both url and description", "source has no locator",
  "url without where", "in-repo url not repo-root-relative", "quote not a block scalar",
  "default stated explicitly", "empty questions block", "empty components block",
  "component missing id", "component missing responsibility", "component after unresolved",
  "question missing id", "question missing text", "question closes bad kind",
  "question gates non-local decision", "malformed citation token", "citation unresolved",
  "citation kind mismatch", "citation of dead entry", "citation of non-foundation kind",
  "decision cited across designs", "cites another design's entry", "cites another area's entry",
  "uncited at settle",
];
for (const k of Object.keys(fail)) if (!ORDER.includes(k)) ORDER.push(k);
for (const c of ORDER) {
  const mark = fail[c] ? (NOTICES.has(c) ? "note" : "FAIL") : "ok  ";
  console.log(`${mark}  ${c}: ${fail[c]?.join("; ") ?? "—"}`);
}

const byTier = Object.values(ent).reduce((a, r) => (a[r.tier] = (a[r.tier] ?? 0) + 1, a), {});
console.log(`\n${designs.length} designs: ${designs.map((d) => `${d.area}/${d.name}${d.state ? ` (${d.state})` : ""}`).join(", ")}`);
console.log(`entries: ${JSON.stringify(byTier)}`);
const fatal = Object.keys(fail).filter((k) => !NOTICES.has(k));
process.exit(fatal.length ? 1 : 0);
