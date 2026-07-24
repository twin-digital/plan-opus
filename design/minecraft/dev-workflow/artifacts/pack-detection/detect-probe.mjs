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

// ground truth, per the repo's own README (quoted in NOTES.md)
const TRUTH = new Set(["@twin-digital/hello-world", "@twin-digital/village-guard"]);

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
  const manifest = own.includes("pack/manifest.json") ? JSON.parse(show(`${dir}/pack/manifest.json`)) : null;
  const deps = { ...json.dependencies, ...json.devDependencies, ...json.peerDependencies };
  return { dir, name: json.name, json, own, manifest, deps };
});

const STRATEGIES = [
  ["committed pack/manifest.json", (p) => p.own.includes("pack/manifest.json")],
  ["committed pack/manifest.json with a header.uuid", (p) => typeof p.manifest?.header?.uuid === "string"],
  ["manifest with a script or data module (behavior, not resource)", (p) =>
    (p.manifest?.modules ?? []).some((m) => m.type === "script" || m.type === "data")],
  ["any manifest.json anywhere in the package", (p) => p.own.some((f) => path.basename(f) === "manifest.json")],
  ["devDependency on @twin-digital/mc-pack-config", (p) => "@twin-digital/mc-pack-config" in p.deps],
  ["any dependency on @minecraft/server", (p) => "@minecraft/server" in p.deps],
  ["repo-kit-written tsdown.config.d/bedrock-pack.ts", (p) => p.own.includes("tsdown.config.d/bedrock-pack.ts")],
  ["release-assets script = mcpack-assets", (p) => p.json.scripts?.["release-assets"] === "mcpack-assets"],
  ["has both build and watch scripts", (p) => !!(p.json.scripts?.build && p.json.scripts?.watch)],
  ["package.json keywords contain a pack keyword", (p) =>
    (p.json.keywords ?? []).some((k) => /pack|bedrock|minecraft/i.test(k))],
  ["explicit package.json marker field (minecraft/mcpack/bedrock key)", (p) =>
    ["minecraft", "mcpack", "bedrock", "minecraftPack"].some((k) => k in p.json)],
  ["directory convention: nodejs/minecraft/*", (p) => p.dir.startsWith("nodejs/minecraft/")],
  ["package name matches /pack/", (p) => /pack/.test(p.name)],
];

log(`=== environment`);
log(`repo=${REPO} ref=${REF} (${git("rev-parse", "--short", REF).trim()})`);
log(`workspace globs: ${globs.join(", ")}`);
log(`workspace packages: ${pkgs.length}`);
log(`ground truth packs: ${[...TRUTH].join(", ")}`);

log(`\n=== strategies (selected / missed truth / false positives)`);
const rows = [];
for (const [name, pred] of STRATEGIES) {
  const sel = pkgs.filter(pred).map((p) => p.name);
  const missed = [...TRUTH].filter((t) => !sel.includes(t));
  const fp = sel.filter((s) => !TRUTH.has(s));
  rows.push({ name, n: sel.length, missed, fp });
  log(`\n${name}`);
  log(`  selected(${sel.length}): ${sel.join(", ") || "(none)"}`);
  log(`  missed: ${missed.join(", ") || "none"}`);
  log(`  false positives: ${fp.join(", ") || "none"}`);
}

log(`\n=== exact matches (no misses, no false positives)`);
for (const r of rows) if (!r.missed.length && !r.fp.length) log(`  ${r.name}`);

log(`\n=== per-package evidence for the minecraft area`);
for (const p of pkgs.filter((x) => x.dir.startsWith("nodejs/minecraft/"))) {
  log(`  ${p.name}`);
  log(`    pack/manifest.json: ${p.own.includes("pack/manifest.json")}` +
      `  module types: ${JSON.stringify((p.manifest?.modules ?? []).map((m) => m.type))}` +
      `  header.version: ${JSON.stringify(p.manifest?.header?.version ?? null)}`);
  log(`    deps: mc-pack-config=${"@twin-digital/mc-pack-config" in p.deps}` +
      ` @minecraft/server=${"@minecraft/server" in p.deps}` +
      `  scripts: build=${p.json.scripts?.build ?? "-"} watch=${p.json.scripts?.watch ?? "-"}`);
}

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
