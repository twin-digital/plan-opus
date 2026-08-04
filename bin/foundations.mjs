// Render every foundation a design may cite — its own inputs, its area, then global —
// as a document meant to be read rather than parsed.
//
//   node bin/foundations.mjs <design>            e.g. doc-structure, how-to-plan/harness
//   node bin/foundations.mjs <design> --full     include rationale, caveats and sources
//   node bin/foundations.mjs --facts             every fact in the repository, one line each
//
// A fact is citable from any design, so --facts is the view to search before recording a new
// one. It is generated on demand and never written to the tree. Facts live in one pool under
// facts/, so a design view lists only the requirements that bind it.
//
// Retired entries are omitted: they are kept in the files so their
// history survives, but they are not something a design may stand on.
import fs from "fs";
import path from "path";
import YAML from "yaml";
import { loadSets, bindsDesign } from "./lib/binding.mjs";

const ROOT = "design";
const FACTS = "facts";
const args = process.argv.slice(2);
const full = args.includes("--full");
const index = args.includes("--facts");
const query = args.find((a) => !a.startsWith("--"));

const DEAD = ["retired", "rejected"];  // two-state: a retired fact/req or a rejected decision
const read = (file) => {
  if (!fs.existsSync(file)) return [];
  const doc = YAML.parse(fs.readFileSync(file, "utf8")) ?? [];
  // pool files carry a version: wrapper (facts:/runs:); legacy design sources are bare sequences
  const entries = Array.isArray(doc) ? doc : (doc.facts ?? doc.runs ?? doc.requirements ?? []);
  return entries.filter((e) => !DEAD.includes(e.status));
};

const designs = [];
for (const area of fs.readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()))
  for (const d of fs.readdirSync(path.join(ROOT, area.name), { withFileTypes: true }).filter((x) => x.isDirectory()))
    designs.push({ area: area.name, name: d.name, dir: path.join(ROOT, area.name, d.name) });

// --facts: the repo-wide index. Every fact is citable from every design, so this is the view an
// author searches before recording a new one.
const factFiles = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? factFiles(path.join(dir, e.name))
  : /\.ya?ml$/.test(e.name) ? [path.join(dir, e.name)] : []) : [];

if (index) {
  const rows = factFiles(FACTS)
    .flatMap((file) => read(file).map((e) => ({ file, e })))
    .sort((a, b) => String(a.e.id).localeCompare(String(b.e.id)));

  console.log(`# Facts — every design may cite any of these\n`);
  for (const { file, e } of rows) {
    const claim = String(e.claim ?? "").replace(/\s+/g, " ").trim();
    console.log(`- **${e.id}**  _(${e.backing ?? "unknown backing"}, in ${file})_\n  ${claim}`);
  }
  console.log(`\n---\n\n${rows.length} facts.`);
  process.exit(0);
}

if (!query) {
  console.error("usage: node bin/foundations.mjs <design> [--full]\n" +
    "       node bin/foundations.mjs --facts\n\n" +
    designs.map((d) => `  ${d.area}/${d.name}`).join("\n"));
  process.exit(1);
}
const matches = designs.filter((d) => `${d.area}/${d.name}` === query || d.name === query);
if (matches.length !== 1) {
  console.error(matches.length ? `ambiguous: ${matches.map((d) => `${d.area}/${d.name}`).join(", ")}`
                               : `no design matching "${query}"`);
  process.exit(1);
}
const target = matches[0];

const targetDesign = { scope: `${target.area}/${target.name}`, area: target.area };
const scopes = [
  { label: `design — ${target.name}`, dir: target.dir,                  tier: "design", scope: targetDesign.scope },
  { label: `area — ${target.area}`,   dir: path.join(ROOT, target.area), tier: "area",   scope: target.area },
  { label: "global",                  dir: ROOT,                        tier: "global", scope: "global" },
];

// Requirements that bind some other design are dropped rather than shown here, resolved by the
// same rule the settle gate uses.
const { sets } = loadSets(ROOT);  // narrowing means the three scopes below are the whole answer
let unbound = 0;

// Block scalars are already hand-wrapped; preserve the author's line breaks (and any
// bullet structure inside them) and quote them so the content is visibly not commentary.
const quote = (s, prefix = "") => {
  const lines = String(s ?? "").replace(/\s+$/, "").split("\n");
  return lines.map((l, i) => ("> " + (i === 0 ? prefix : "") + l).trimEnd()).join("\n");
};

const out = [];
out.push(`# Foundations in scope — ${target.area}/${target.name}`, "");
out.push(`The requirements that bind this design, nearest scope first — every one listed must be`,
  `honoured. Retired entries are omitted. Facts are not scoped: any design may cite any of them,`,
  "so run `node bin/foundations.mjs --facts` for those.", "");

let totals = { req: 0 };
for (const [kind, file, heading] of [["req", "requirements.yaml", "Requirements"]]) {
  out.push(`## ${heading}`, "");
  let any = false;
  for (const scope of scopes) {
    const all = read(path.join(scope.dir, file));
    const entries = (kind === "req" ? all.filter((e) => bindsDesign(sets, scope, e, targetDesign) || (unbound++, false)) : all)
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    if (!entries.length) continue;
    any = true;
    totals[kind] += entries.length;
    out.push(`### ${scope.label}`, "");
    for (const e of entries) {
      const tags = [];
      if (kind === "req" && e.force === "soft") tags.push("soft");
      if (kind === "fact") tags.push(e.backing ?? "unknown backing");
      out.push(`#### ${e.id}${tags.length ? `  _(${tags.join(", ")})_` : ""}`, "");
      out.push(quote(kind === "req" ? e.statement : e.claim), "");
      if (e.caveat) out.push(quote(e.caveat, "**caveat** — "), "");
      if (full && e.rationale) out.push(quote(e.rationale, "**why** — "), "");
      if (full && e.sources?.length)
        for (const s of e.sources)
          out.push(quote(`${s.url ? `${s.url}${s.where ? ` — ${s.where}` : ""}` : s.description}`, "**source** — "), "");
    }
  }
  if (!any) out.push("_none_", "");
}

out.push("---", "", `${totals.req} requirements.` +
  (unbound ? ` ${unbound} wider-scope requirement(s) bind other designs and are not shown.` : ""));
console.log(out.join("\n"));
