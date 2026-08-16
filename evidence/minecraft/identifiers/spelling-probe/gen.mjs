// Generates the namespace-character probe packs: one behavior pack carrying both the entity
// definitions and the probe script, and one resource pack carrying geometry + client entity files
// whose geometry identifiers use the same namespace spellings.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const BP = path.join(DIR, "packs", "bp");
const RP = path.join(DIR, "packs", "rp");

const long = (n, tag) => {
  const head = `ns${tag}_`;
  return head + "n".repeat(n - head.length);
};

// [key, namespace, name]
const CASES = [
  ["ctl_underscore", "probe_ns", "subject"],
  ["hyphen", "probe-ns", "subject"],
  ["dot", "probe.ns", "subject"],
  ["upper", "ProbeNS", "subject"],
  ["digit_mid", "probe2ns", "subject"],
  ["digit_lead", "2probens", "subject"],
  ["len64", long(64, "64"), "subject"],
  ["len200", long(200, "200"), "subject"],
  ["len512", long(512, "512"), "subject"],
  ["name_hyphen", "probe_ns", "sub-ject"],
  ["name_dot", "probe_ns", "sub.ject"],
  ["name_upper", "probe_ns", "SubJect"],
  ["name_len200", "probe_ns", long(200, "n200")],
];

fs.rmSync(path.join(DIR, "packs"), { recursive: true, force: true });
fs.mkdirSync(path.join(BP, "entities"), { recursive: true });
fs.mkdirSync(path.join(BP, "scripts"), { recursive: true });
fs.mkdirSync(path.join(RP, "models", "entity"), { recursive: true });
fs.mkdirSync(path.join(RP, "entity"), { recursive: true });

const cases = CASES.map(([key, ns, name]) => ({ key, ns, name, id: `${ns}:${name}` }));

for (const c of cases) {
  fs.writeFileSync(
    path.join(BP, "entities", `${c.key}.json`),
    JSON.stringify(
      {
        format_version: "1.21.0",
        "minecraft:entity": {
          description: { identifier: c.id, is_summonable: true, is_spawnable: false },
          components: {
            "minecraft:type_family": { family: ["probe_all", `fam_${c.key}`] },
            "minecraft:health": { max: 40, value: 40 },
            "minecraft:physics": {},
            "minecraft:collision_box": { width: 0.6, height: 1.8 },
            "minecraft:persistent": {},
          },
        },
      },
      null,
      2,
    ),
  );

  // Resource side: a geometry whose identifier embeds the same namespace spelling, plus a client
  // entity that names it.
  fs.writeFileSync(
    path.join(RP, "models", "entity", `${c.key}.geo.json`),
    JSON.stringify(
      {
        format_version: "1.12.0",
        "minecraft:geometry": [
          {
            description: {
              identifier: `geometry.${c.ns}.${c.name}`,
              texture_width: 16,
              texture_height: 16,
              visible_bounds_width: 2,
              visible_bounds_height: 2,
              visible_bounds_offset: [0, 1, 0],
            },
            bones: [
              {
                name: "body",
                pivot: [0, 0, 0],
                cubes: [{ origin: [-4, 0, -4], size: [8, 8, 8], uv: [0, 0] }],
              },
            ],
          },
        ],
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    path.join(RP, "entity", `${c.key}.entity.json`),
    JSON.stringify(
      {
        format_version: "1.10.0",
        "minecraft:client_entity": {
          description: {
            identifier: c.id,
            materials: { default: "entity_alphatest" },
            textures: { default: "textures/entity/probe" },
            geometry: { default: `geometry.${c.ns}.${c.name}` },
            render_controllers: ["controller.render.default"],
          },
        },
      },
      null,
      2,
    ),
  );
}

fs.writeFileSync(
  path.join(BP, "manifest.json"),
  JSON.stringify(
    {
      format_version: 2,
      header: {
        name: "namespace character probe (behavior)",
        description: "Entity identifiers spelled with hyphens, dots, uppercase, digits and long namespaces.",
        uuid: "5f2c1c4e-1d7a-4f3b-9d21-6a7c0f1e2b30",
        version: [0, 1, 0],
        min_engine_version: [1, 26, 0],
      },
      modules: [
        { type: "data", uuid: "9a4b6d21-0c58-4e77-bb10-33c9d4a51e02", version: [0, 1, 0] },
        {
          type: "script",
          language: "javascript",
          entry: "scripts/main.js",
          uuid: "c1e07a55-8b3f-4a92-8c6d-71f2a9d4b8e1",
          version: [0, 1, 0],
        },
      ],
      dependencies: [{ module_name: "@minecraft/server", version: "2.8.0" }],
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join(RP, "manifest.json"),
  JSON.stringify(
    {
      format_version: 2,
      header: {
        name: "namespace character probe (resource)",
        description: "Geometry identifiers spelled with the same namespace variants.",
        uuid: "3d8f9b02-6a41-4c55-9f7e-2b0c8d16a4f7",
        version: [0, 1, 0],
        min_engine_version: [1, 26, 0],
      },
      modules: [{ type: "resources", uuid: "7e5a2c93-14b6-4d08-8a3f-c05e9b71d264", version: [0, 1, 0] }],
    },
    null,
    2,
  ),
);

// 1x1 transparent PNG so the client entities name a texture that exists.
fs.mkdirSync(path.join(RP, "textures", "entity"), { recursive: true });
fs.writeFileSync(
  path.join(RP, "textures", "entity", "probe.png"),
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  ),
);

fs.copyFileSync(path.join(DIR, "main.js"), path.join(BP, "scripts", "main.js"));

fs.writeFileSync(
  path.join(BP, "scripts", "cases.js"),
  "export const CASES = " + JSON.stringify(cases, null, 2) + ";\n",
);

fs.writeFileSync(path.join(DIR, "cases.json"), JSON.stringify(cases, null, 2));
console.log(`wrote ${cases.length} cases`);
for (const c of cases) console.log(`${c.key}\tns.length=${c.ns.length}\tid.length=${c.id.length}`);
