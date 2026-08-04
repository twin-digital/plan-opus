// Scores candidate "is this workspace package a behavior pack?" strategies against the real
// monorepo, so the choice rests on measured precision/recall rather than assertion.
//
//   node detect-probe.mjs [<opus-repo> [<ref>]]     # defaults: /workspace/opus archive/minecraft-prototype
//
// Reads the tree from git (no checkout, no build), plus one on-disk pass for the strategies
// that can only see built output. Writes OUTPUT.txt beside this file.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = process.argv[2] ?? "/workspace/opus";
const REF = process.argv[3] ?? "archive/minecraft-prototype";
const OUT = path.join(DIR, "OUTPUT.txt");

fs.writeFileSync(OUT, "");
const log = (s = "") => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8", maxBuffer: 256 << 20 });
const show = (p) => { try { return git("show", `${REF}:${p}`); } catch { return null; } };

// Ground truth is derived from pack content under the Bedrock add-on format — a committed
// manifest.json with a header uuid and a module of type `data` or `script` — never from any
// convention of the repo it happens to be scored against.
const isBehaviorManifest = (m) =>
  typeof m?.header?.uuid === "string" &&
  (m.modules ?? []).some((x) => x.type === "data" || x.type === "script");

const files = git("ls-tree", "-r", "--name-only", REF).split("\n").filter(Boolean);

// workspace membership: pnpm-workspace.yaml globs, resolved against the tree
const globs = (show("pnpm-workspace.yaml") ?? "")
  .split(/^packages:[ \t]*$/m)[1]?.split(/^\S/m)[0]
  .split("\n").filter((l) => /^\s+-\s/.test(l))
  .map((l) => l.replace(/^\s+-\s*/, "").replace(/['"]/g, "").trim()) ?? [];
const globRe = (g) => new RegExp("^" + g.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]+") + "$");
const pkgDirs = [...new Set(files.filter((f) => f.endsWith("/package.json")).map((f) => path.dirname(f)))]
  .filter((d) => globs.some((g) => globRe(g).test(d)))
  .sort();

const pkgs = pkgDirs.map((dir) => {
  const json = JSON.parse(show(`${dir}/package.json`));
  const own = files.filter((f) => f.startsWith(dir + "/"))
    .map((f) => f.slice(dir.length + 1))
    .filter((f) => !f.includes("node_modules/"));
  const manifestPaths = own.filter((f) => path.basename(f) === "manifest.json");
  const manifests = manifestPaths.map((f) => { try { return JSON.parse(show(`${dir}/${f}`)); } catch { return null; } });
  const deps = { ...json.dependencies, ...json.devDependencies, ...json.peerDependencies };
  return { dir, name: json.name, json, own, manifestPaths, manifests, deps };
});

// kind: "format"    — reads the pack's own manifest; this is what the format itself says
//       "heuristic" — content-independent guess, scored to show how far it diverges
//       "external"  — a convention of the surrounding repo; excluded from the choice by fiat,
//                     reported only to show it carries no information the format does not
const STRATEGIES = [
  ["format", "manifest.json with a header uuid and a data or script module", (p) => p.manifests.some(isBehaviorManifest)],
  ["format", "any manifest.json in the package, unexamined", (p) => p.manifestPaths.length > 0],
  ["heuristic", "any dependency on @minecraft/server", (p) => "@minecraft/server" in p.deps],
  ["heuristic", "has both build and watch scripts", (p) => !!(p.json.scripts?.build && p.json.scripts?.watch)],
  ["heuristic", "package.json keywords contain a pack keyword", (p) =>
    (p.json.keywords ?? []).some((k) => /pack|bedrock|minecraft/i.test(k))],
  ["heuristic", "explicit package.json marker field (minecraft/mcpack/bedrock key)", (p) =>
    ["minecraft", "mcpack", "bedrock", "minecraftPack"].some((k) => k in p.json)],
  ["heuristic", "package name matches /pack/", (p) => /pack/.test(p.name)],
  ["external", "directory location under a minecraft/ folder", (p) => /(^|\/)minecraft\//.test(p.dir + "/")],
  ["external", "devDependency on the repo's shared pack build config", (p) => "@twin-digital/mc-pack-config" in p.deps],
  ["external", "a build-tool fragment the repo's sync tool writes", (p) => p.own.includes("tsdown.config.d/bedrock-pack.ts")],
  ["external", "the repo's release-assets script", (p) => p.json.scripts?.["release-assets"] === "mcpack-assets"],
];

const TRUTH = new Set(pkgs.filter((p) => p.manifests.some(isBehaviorManifest)).map((p) => p.name));

log(`=== environment`);
log(`repo=${REPO} ref=${REF} (${git("rev-parse", "--short", REF).trim()})`);
log(`workspace globs: ${globs.join(", ")}`);
log(`workspace packages: ${pkgs.length}`);

log(`\n=== ground truth, derived from pack content under the add-on format`);
log(`test: a committed manifest.json with header.uuid and a module of type data or script`);
for (const p of pkgs.filter((x) => x.manifestPaths.length)) {
  p.manifestPaths.forEach((f, i) => {
    const m = p.manifests[i];
    log(`  ${p.name}  ${f}  header.uuid=${JSON.stringify(m?.header?.uuid ?? null)}` +
        ` modules=${JSON.stringify((m?.modules ?? []).map((x) => x.type))}` +
        ` -> behavior pack: ${isBehaviorManifest(m)}`);
  });
}
log(`  packs: ${[...TRUTH].join(", ") || "(none)"}`);

log(`\n=== rules (selected / missed / false positives)`);
log(`format rules restate the ground-truth test, so agreement is definitional, not evidence.`);
log(`heuristic and external rules are scored to show how far each diverges from the format.`);
const rows = [];
for (const [kind, name, pred] of STRATEGIES) {
  const sel = pkgs.filter(pred).map((p) => p.name);
  const missed = [...TRUTH].filter((t) => !sel.includes(t));
  const fp = sel.filter((s) => !TRUTH.has(s));
  rows.push({ kind, name, n: sel.length, missed, fp });
  log(`\n[${kind}] ${name}`);
  log(`  selected(${sel.length}): ${sel.join(", ") || "(none)"}`);
  log(`  missed: ${missed.join(", ") || "none"}`);
  log(`  false positives: ${fp.join(", ") || "none"}`);
}

log(`\n=== rules that diverge from the format's own answer`);
for (const r of rows) if (r.kind !== "format" && (r.missed.length || r.fp.length))
  log(`  [${r.kind}] ${r.name}: missed=${r.missed.length} falsePositives=${r.fp.length}`);

log(`\n=== built-output strategy, checked on disk (dist/ is gitignored, so it needs a build first)`);
for (const p of pkgs) {
  const dist = path.join(REPO, p.dir, "dist", "manifest.json");
  if (fs.existsSync(dist)) {
    const m = JSON.parse(fs.readFileSync(dist, "utf8"));
    log(`  ${p.name}: dist/manifest.json present — header.version=${JSON.stringify(m.header?.version)}` +
        ` modules=${JSON.stringify((m.modules ?? []).map((x) => x.type))}`);
  }
}
const built = pkgs.filter((p) => fs.existsSync(path.join(REPO, p.dir, "dist", "manifest.json"))).length;
log(`  packages with a built manifest on disk: ${built} of ${pkgs.length}`);
