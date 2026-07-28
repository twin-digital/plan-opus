// Validates the design tree against the doc-structure format.
// Run from the repo root:  node bin/check-design.mjs
//
// Foundations (facts, requirements, decisions) are the citable entries. Requirements live in
// YAML files at three scopes — design (in the design's own dir), area, global; decisions live in
// a decisions.yaml beside a design's spec.md. Facts live in one pool under facts/, in any file
// and at any depth: the path is filing convenience and carries no meaning. Components and open
// questions live in spec.md and are never cited. Citations are [[k:id]] with k in f/r/d.
//
// A fact resolves from anywhere in the repository; a requirement resolves within the citing
// design's three tiers, and a decision only within the design that made it.
//
// The rule numbers in comments map to the Invariants table in the doc-structure design.
import fs from "fs";
import path from "path";
import YAML from "yaml";
import { loadSets, bindsDesign, reachable } from "./lib/binding.mjs";

const ROOT = "design";
const FACTS = "facts";
const EVIDENCE = "evidence";
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

// A quote must still be present at an in-repo source. Whitespace is normalised on both sides:
// YAML block scalars re-indent and the source file wraps its own way, so only the words are
// compared. An off-repo url cannot be read here and is not checked.
const normalise = (s) => String(s).replace(/\s+/g, " ").trim();
const quoteMissing = (url, quote) => {
  if (!/^(design|prompts|docs|bin)\//.test(url)) return false; // off-repo
  const file = url.split("#")[0];
  if (!fs.existsSync(file)) return "source file not found";
  return normalise(fs.readFileSync(file, "utf8")).includes(normalise(quote)) ? false : "quote not present";
};

// ---- load foundations across scopes -----------------------------------------
// ent[id] = {kind:'f'|'r'|'d'|'e', tier, scope, e, file}. 'e' is a run: evidence a tested fact
// rests on. A run is not a foundation and no claim may cite one — it is here so that ids stay
// unique repo-wide and a run: source resolves the same way a citation does.
const ent = {};
const declare = (id, rec) => {
  if (ent[id]) add("slug not unique per kind", `${id} (${ent[id].scope} + ${rec.scope})`); // rule 4
  ent[id] = rec;
};

const loadScope = (dir, tier, scope) => {
  const file = path.join(dir, "requirements.yaml");
  if (!fs.existsSync(file)) return;
  for (const e of loadYaml(file)) { declare(e.id, { kind: "r", tier, scope, e, file }); checkEntry("r", e, scope, file); }
};

// Facts live in one pool. Any yaml file under facts/, at any depth, is a fact file; the path is
// where an author chose to file it and means nothing to resolution.
const poolFiles = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? poolFiles(path.join(dir, e.name))
  : /\.ya?ml$/.test(e.name) ? [path.join(dir, e.name)] : []) : [];
const factFiles = poolFiles;

// Runs are loaded before facts, so a run: source resolves while its fact is being checked.
for (const file of poolFiles(EVIDENCE))
  for (const e of loadYaml(file)) { declare(e.id, { kind: "e", tier: "pool", scope: file, e, file }); checkEntry("e", e, file, file); }
for (const file of factFiles(FACTS))
  for (const e of loadYaml(file)) { declare(e.id, { kind: "f", tier: "pool", scope: file, e, file }); checkEntry("f", e, file, file); }

// A fact file under design/ would be silently invisible, and its entries unresolvable, so it is
// an error rather than a file nobody reads.
for (const stray of factFiles(ROOT).filter((f) => /(^|\/)facts\.ya?ml$/.test(f))) add("fact file outside the pool", stray);

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

// ---- named sets of designs (sets.yaml, at global or area scope) --------------
// A set groups designs the tree cannot: a product spanning areas, or one overlapping a sibling.
// Sets never nest, so membership is one lookup deep. An area's sets.yaml holds only that area's
// designs, which is what makes "is this set inside my area?" a question about where the file sits.
const { sets, malformed, duplicates } = loadSets(ROOT);
for (const f of malformed) add("sets.yaml is not a mapping of set name to design scopes", f);
for (const d of duplicates) add("set name not unique", d);
const designScopes = new Set(designs.map((d) => d.scope));
for (const [name, set] of Object.entries(sets)) {
  const { members, tier, scope } = set;
  if (!Array.isArray(members) || !members.length) { add("set without members", name); continue; }
  for (const m of members) {
    const s = String(m);
    if (s.startsWith("set:")) add("set holds another set", `${name} -> ${m}`);
    else if (!designScopes.has(s)) add("set member unresolved", `${name} -> ${m}`);
    else if (tier === "area" && !s.startsWith(`${scope}/`)) add("area set holds another area's design", `${name} -> ${m}`);
  }
}

// ---- applies_to: which designs a requirement binds ---------------------------
// Only above design scope, where omitting it binds the whole tier. applies_to narrows within that
// tier and never widens: an area requirement reaches only its own area's designs and sets.
for (const rec of Object.values(ent)) {
  if (rec.kind !== "r" || rec.e.applies_to === undefined) continue;
  const tag = `${rec.scope} ${rec.e.id}`;
  if (rec.tier === "design") { add("applies_to on a design-scoped requirement", tag); continue; }
  if (!Array.isArray(rec.e.applies_to) || !rec.e.applies_to.length) { add("applies_to is not a non-empty list", tag); continue; }
  for (const t of rec.e.applies_to) {
    const s = String(t);
    if (s.startsWith("set:") && !(s.slice(4) in sets)) { add("applies_to names an undeclared set", `${tag} -> ${s}`); continue; }
    if (!s.startsWith("set:") && !designScopes.has(s)) { add("applies_to names no such design", `${tag} -> ${s}`); continue; }
    if (!reachable(sets, rec, s)) add("applies_to reaches outside its tier", `${tag} -> ${s}`);
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
    checkSources(e, tag, e.backing);
  }

  if (kind === "e") {
    for (const f of ["id", "command", "output", "ran_at"]) if (e[f] === undefined) add("missing required field", `${tag}.${f}`);
    if (e.output !== undefined && !fs.existsSync(String(e.output))) add("run output not found", `${tag}: ${e.output}`);
    if (e.ran_at !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(e.ran_at))) add("run ran_at not a date", tag);
    if (e.status !== undefined && !["active", "retired"].includes(e.status)) add("bad run status", tag);
    if (literalHas(file, e.id, "status") && e.status === "active") add("default stated explicitly", `${tag}.status`);
    if (e.status === "retired") {
      if (!e.reason) add("retired run without reason", tag);
      else if (!["superseded", "stale", "invalid"].includes(e.reason)) add("bad retire reason", tag);
      if (e.reason === "superseded" && !e.superseded_by) add("superseded run without superseded_by", tag);
    }
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
    for (const f of ["id", "statement", "status"]) if (e[f] === undefined) add("missing required field", `${tag}.${f}`);
    if (e.status !== "rejected" && (!Array.isArray(e.falsifiers) || e.falsifiers.length < 1)) add("decision without a falsifier", tag);
    if (e.status !== undefined && !["proposed", "accepted", "tolerated", "rejected"].includes(e.status)) add("bad decision status", tag);
  }
}

// A source takes exactly one locator: a `url` into an upstream document, a `run` naming captured
// output held here, or a `description` of the mechanism. A run: is to in-repo output what a url:
// is to an upstream page — both carry `where` and a verbatim `quote`, verified against the file.
function checkSources(e, tag, backing) { // rule 7
  const srcs = e.sources ?? [];
  if (!srcs.length) { add("fact without a source", tag); return; }
  // the backing demands one locator form as a floor; further sources may take any form
  const FLOOR = { tested: "run", documented: "url", assumed: "description" };
  const want = FLOOR[backing];
  if (want && !srcs.some((s) => s[want] !== undefined)) add(`${backing} fact without a ${want} source`, tag);
  for (const s of srcs) {
    const hasUrl = s.url !== undefined, hasWhere = s.where !== undefined, hasDesc = s.description !== undefined;
    const hasRun = s.run !== undefined;
    if ([hasUrl, hasDesc, hasRun].filter(Boolean).length > 1) add("source has more than one locator", tag);
    if (!hasUrl && !hasDesc && !hasRun) add("source has no locator", tag);
    if (hasUrl && !hasWhere) add("url without where", tag);
    if (hasRun) {
      const run = ent[String(s.run)];
      if (!run || run.kind !== "e") add("run source unresolved", `${tag} -> ${s.run}`);
      else {
        if (isDead(run.e)) add("source cites a retired run", `${tag} -> ${s.run}`);
        if (!hasWhere) add("run without where", tag);
        if (s.quote !== undefined && run.e.output) {
          const why = quoteMissing(String(run.e.output), s.quote);
          if (why) add("quote not verbatim at its source", `${tag}: ${s.run} — ${why}`);
        }
      }
      if (backing !== "tested") add("run source on a non-tested fact", `${tag} -> ${s.run}`);
    }
    if (hasUrl && /^(\.\.?\/)/.test(String(s.url))) add("in-repo url not repo-root-relative", `${tag}: ${s.url}`);
    if (s.quote !== undefined && !/\n/.test(String(s.quote))) add("quote not a block scalar", tag);
    if (hasUrl && s.quote !== undefined) {
      const why = quoteMissing(String(s.url), s.quote);
      if (why) add("quote not verbatim at its source", `${tag}: ${s.url} — ${why}`);
    }
    // an artifacts/ path is captured test output, so it backs only a tested fact
    if (hasUrl && backing !== "tested" && /(^|\/)artifacts\//.test(String(s.url))) add("artifact source on a non-tested fact", `${tag}: ${s.url}`);
  }
}

// ---- per-design document checks ---------------------------------------------
for (const d of designs) {
  const tag = d.scope, hasDoc = fs.existsSync(d.md), hasDec = fs.existsSync(d.decFile);
  d.state = !hasDoc ? "exploring" : null;
  if (!hasDoc) continue;

  const src = fs.readFileSync(d.md, "utf8");
  if (/\[\[[DQC]\d+\]\]/.test(src)) { add("legacy format — regenerate", tag); d.state = "legacy"; continue; }

  // Live blocks are read only from their fixed H2 section; yaml blocks elsewhere are
  // illustrative examples and ignored. Section titles: "Components", "Open questions".
  const headings = [...src.matchAll(/^## (.+?)[ \t]*$/gm)].map((h) => ({ at: h.index, title: h[1].trim() }));
  const sectionOf = (pos) => { let t = null; for (const h of headings) { if (h.at < pos) t = h.title; else break; } return t; };
  const LIVE = new Set(["Components", "Open questions"]);

  const blocks = {};
  let legacy = false;
  for (const m of src.matchAll(/```yaml\n([\s\S]*?)\n```/g)) {
    if (!LIVE.has(sectionOf(m.index))) continue;         // illustrative example, not a live block
    if (/^- id:/m.test(m[1])) { legacy = true; break; }  // old foundations-in-spec sequence under a live section
    let parsed; try { parsed = YAML.parse(m[1]); } catch (e) { add("yaml parse", `${tag} block: ${e.message}`); continue; }
    if (parsed && typeof parsed === "object") for (const key of Object.keys(parsed)) blocks[key] = parsed[key];
  }
  if (legacy) { add("legacy format — regenerate", tag); d.state = "legacy"; continue; }
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
    // a fact carries no obligation, so it resolves from anywhere; a requirement stays fenced by tier
    if (k === "r" && t.tier === "design" && t.scope !== d.scope) add("cites another design's requirement", `${tag} [[${k}:${id}]]`);
    if (k === "r" && t.tier === "area" && t.scope !== d.area) add("cites another area's requirement", `${tag} [[${k}:${id}]]`);
  }

  // settle gate (rule 14): a settle-eligible design cannot settle while a live requirement that
  // binds it, or an accepted/tolerated decision it holds, goes uncited; a rejected one is exempt.
  if (d.state === "settled") {
    const uncited = [];
    for (const x of decs) {
      if (isDead(x) || (x.status ?? "proposed") === "rejected") continue;
      if (!toks.some(([, k, id]) => k === "d" && id === x.id)) uncited.push(`d:${x.id}`);
    }
    for (const [id, r] of Object.entries(ent)) {
      if (r.kind !== "r" || isDead(r.e) || !bindsDesign(sets, r, r.e, d)) continue;
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
  "fact file outside the pool",
  "sets.yaml is not a mapping of set name to design scopes", "set name not unique",
  "set without members", "set holds another set", "set member unresolved",
  "area set holds another area's design",
  "applies_to on a design-scoped requirement", "applies_to is not a non-empty list",
  "applies_to names an undeclared set", "applies_to names no such design",
  "applies_to reaches outside its tier",
  "fact without a source", "source has more than one locator", "source has no locator",
  "tested fact without a run source", "documented fact without a url source",
  "assumed fact without a description source",
  "run source unresolved", "source cites a retired run", "run without where",
  "run source on a non-tested fact", "run output not found", "run ran_at not a date",
  "bad run status", "retired run without reason", "superseded run without superseded_by",
  "url without where", "in-repo url not repo-root-relative", "quote not a block scalar",
  "quote not verbatim at its source",
  "artifact source on a non-tested fact",
  "default stated explicitly", "empty questions block", "empty components block",
  "component missing id", "component missing responsibility", "component after unresolved",
  "question missing id", "question missing text", "question closes bad kind",
  "question gates non-local decision", "malformed citation token", "citation unresolved",
  "citation kind mismatch", "citation of dead entry", "citation of non-foundation kind",
  "decision cited across designs", "cites another design's requirement",
  "cites another area's requirement",
  "uncited at settle",
];
for (const k of Object.keys(fail)) if (!ORDER.includes(k)) ORDER.push(k);
for (const c of ORDER) {
  const mark = fail[c] ? (NOTICES.has(c) ? "note" : "FAIL") : "ok  ";
  console.log(`${mark}  ${c}: ${fail[c]?.join("; ") ?? "—"}`);
}

const runs = Object.values(ent).filter((r) => r.kind === "e").length;
console.log(`\n${runs} runs`);

const byTier = Object.values(ent).reduce((a, r) => (a[r.tier] = (a[r.tier] ?? 0) + 1, a), {});
console.log(`\n${designs.length} designs: ${designs.map((d) => `${d.area}/${d.name}${d.state ? ` (${d.state})` : ""}`).join(", ")}`);
console.log(`entries: ${JSON.stringify(byTier)}`);
const fatal = Object.keys(fail).filter((k) => !NOTICES.has(k));
process.exit(fatal.length ? 1 : 0);
