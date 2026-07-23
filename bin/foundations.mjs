// Render every foundation a design may cite — its own inputs, its area, then global —
// as a document meant to be read rather than parsed.
//
//   node bin/foundations.mjs <design>            e.g. doc-structure, how-to-plan/harness
//   node bin/foundations.mjs <design> --full     include rationale, caveats and sources
//
// Retired entries are omitted: they are kept in the files so their
// history survives, but they are not something a design may stand on.
import fs from "fs";
import path from "path";
import YAML from "yaml";

const ROOT = "design";
const args = process.argv.slice(2);
const full = args.includes("--full");
const query = args.find((a) => !a.startsWith("--"));

const designs = [];
for (const area of fs.readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()))
  for (const d of fs.readdirSync(path.join(ROOT, area.name), { withFileTypes: true }).filter((x) => x.isDirectory()))
    designs.push({ area: area.name, name: d.name, dir: path.join(ROOT, area.name, d.name) });

if (!query) {
  console.error("usage: node bin/foundations.mjs <design> [--full]\n\n" +
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

const DEAD = ["retired", "rejected"];  // two-state: a retired fact/req or a rejected decision
const read = (file) => {
  if (!fs.existsSync(file)) return [];
  return (YAML.parse(fs.readFileSync(file, "utf8")) ?? []).filter((e) => !DEAD.includes(e.status));
};
const scopes = [
  { label: `design — ${target.name}`, dir: path.join(target.dir, "inputs") },
  { label: `area — ${target.area}`,    dir: path.join(ROOT, target.area) },
  { label: "global",                   dir: ROOT },
];

// Block scalars are already hand-wrapped; preserve the author's line breaks (and any
// bullet structure inside them) and quote them so the content is visibly not commentary.
const quote = (s, prefix = "") => {
  const lines = String(s ?? "").replace(/\s+$/, "").split("\n");
  return lines.map((l, i) => ("> " + (i === 0 ? prefix : "") + l).trimEnd()).join("\n");
};

const out = [];
out.push(`# Foundations in scope — ${target.area}/${target.name}`, "");
out.push(`Everything this design may cite, nearest scope first. Retired entries are omitted.`, "");

let totals = { req: 0, fact: 0 };
for (const [kind, file, heading] of [["req", "requirements.yaml", "Requirements"],
                                     ["fact", "facts.yaml", "Facts"]]) {
  out.push(`## ${heading}`, "");
  let any = false;
  for (const scope of scopes) {
    const entries = read(path.join(scope.dir, file))
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

out.push("---", "", `${totals.req} requirements, ${totals.fact} facts.`);
console.log(out.join("\n"));
