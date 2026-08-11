# asset-collision-check — are a resource pack's internal names scoped to it?

Two resource packs declare the same names with different content, and one entity apiece uses them. If the
names are scoped to their pack, each entity shows its own pack's version. If they are global, one
definition wins for both.

## Server side, captured

```
[2026-08-10 06:13:48:878 WARN] [Scripting] COLLIDE spawned collide:geo_a
[2026-08-10 06:13:48:878 WARN] [Scripting] COLLIDE spawned collide:geo_b
[2026-08-10 06:13:48:878 WARN] [Scripting] COLLIDE spawned collide:tex_a
[2026-08-10 06:13:48:878 WARN] [Scripting] COLLIDE spawned collide:tex_b
[2026-08-10 06:13:48:878 WARN] [Scripting] COLLIDE ready
```

What each pack declared, and what each actor asked for:

| actor | client entity in | geometry named | texture named |
| --- | --- | --- | --- |
| `collide:geo_a` | pack one | `geometry.collide.shared` — a tall pillar, 4×32×4 | `textures/collide/shared` — solid magenta |
| `collide:geo_b` | pack two | `geometry.collide.shared` — a flat slab, 24×5×24 | `textures/collide/shared` — solid green |
| `collide:tex_a` | pack one | `geometry.collide.cube_one` — uniquely named | `textures/collide/shared` — solid magenta |
| `collide:tex_b` | pack two | `geometry.collide.cube_two` — uniquely named | `textures/collide/shared` — solid green |

The cubes are named uniquely on purpose, so the texture result cannot be confounded by the geometry
collision. Resource activation list order: pack one, then pack two.

## Client side, as observed

Bedrock client, real account. The owner's report:

```
- "tex pack two" - magenta cube
- "tex pack one" - magenta cube
- "geo pack two" - magenta pillar
- "geo pack one" - magenta pillar
```

## What it settles

Both names are global across the pack stack, and one definition served every consumer:

- **Geometry identifiers collide.** Both geo actors rendered as the pillar — pack one's shape. Pack two's
  slab, declared under the same identifier, was not used even by the entity whose own client definition
  sits in pack two.
- **Texture paths collide too**, and behave no differently from identifiers. Every actor rendered magenta,
  pack one's colour; pack two's green went unused.
- The winner was the pack listed **first** in the world's resource activation list. This run does not
  establish the general ordering rule, only that one definition wins and it is not per-pack.

So a pack's internal asset names are not private to it. Two packs that share a name share a definition,
and which one they get is decided outside either pack.
