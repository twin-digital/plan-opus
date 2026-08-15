// Generates rp2: the same namespace geometries plus deliberately broken content — a geometry file
// that is not valid JSON, a client entity naming a geometry nothing defines, and a client entity
// with a missing required field. If the dedicated server reports none of these, it is not reading
// resource pack content at all and its silence about the namespace variants says nothing.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const RP = path.join(DIR, "packs", "rp");
const RP2 = path.join(DIR, "packs", "rp2");

fs.rmSync(RP2, { recursive: true, force: true });
fs.cpSync(RP, RP2, { recursive: true });

const m = JSON.parse(fs.readFileSync(path.join(RP2, "manifest.json"), "utf8"));
m.header.uuid = "b41d7e26-3a90-4f18-9c02-5e7d1a638b4c";
m.header.name = "namespace character probe (resource, with broken content)";
m.modules[0].uuid = "0c96f3a8-72d5-4b61-a4ef-19d8306e5c77";
fs.writeFileSync(path.join(RP2, "manifest.json"), JSON.stringify(m, null, 2));

fs.writeFileSync(path.join(RP2, "models", "entity", "broken_syntax.geo.json"), "{ this is not json ");

fs.writeFileSync(
  path.join(RP2, "models", "entity", "broken_shape.geo.json"),
  JSON.stringify({ format_version: "1.12.0", "minecraft:geometry": [{ description: {} }] }, null, 2),
);

fs.writeFileSync(
  path.join(RP2, "entity", "broken_missing_geo.entity.json"),
  JSON.stringify(
    {
      format_version: "1.10.0",
      "minecraft:client_entity": {
        description: {
          identifier: "probe_ns:missinggeo",
          materials: { default: "entity_alphatest" },
          textures: { default: "textures/entity/probe" },
          geometry: { default: "geometry.no_such.geometry_at_all" },
          render_controllers: ["controller.render.default"],
        },
      },
    },
    null,
    2,
  ),
);

fs.writeFileSync(path.join(RP2, "entity", "broken_syntax.entity.json"), "{ also not json ");

console.log("wrote rp2");
