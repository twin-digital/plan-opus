// Render every fact in the repository, one line each — the view to search before recording a
// new one. Facts are citable from any product, so this is a single repo-wide index. They live
// in one pool under facts/, each file a version: wrapper over a facts: sequence. Retired entries
// are omitted: kept in the files so their history survives, but not something to stand on. The
// index is generated on demand and never written to the tree.
//
//   node bin/foundations.mjs            every fact in the repository
//   node bin/foundations.mjs --facts    the same (the flag is accepted for habit)
import fs from "fs";
import path from "path";
import YAML from "yaml";

const FACTS = "facts";
const DEAD = ["retired"];
const read = (file) => {
  const doc = YAML.parse(fs.readFileSync(file, "utf8")) ?? [];
  const entries = Array.isArray(doc) ? doc : (doc.facts ?? []);
  return entries.filter((e) => !DEAD.includes(e.status));
};
const factFiles = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? factFiles(path.join(dir, e.name))
  : /\.ya?ml$/.test(e.name) ? [path.join(dir, e.name)] : []) : [];

const rows = factFiles(FACTS)
  .flatMap((file) => read(file).map((e) => ({ file, e })))
  .sort((a, b) => String(a.e.id).localeCompare(String(b.e.id)));

console.log(`# Facts — any product may cite any of these\n`);
for (const { file, e } of rows) {
  const claim = String(e.claim ?? "").replace(/\s+/g, " ").trim();
  console.log(`- **${e.id}**  _(${e.backing ?? "unknown backing"}, in ${file})_\n  ${claim}`);
}
console.log(`\n---\n\n${rows.length} facts.`);
