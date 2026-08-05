# world seed and spawn probe

`d-41m3iws5` proposes that a run may fix the world it generates: a seed reaching the server as the
generated project's level seed, and a spawn point set with a console command once the world has
loaded, because the server offers no setting for it. Neither half was evidenced when it was written.

## Seed

Three fresh worlds — a `down -v` and a new volume each time — the same seed twice and then a
different one, fingerprinted by the blocks the generator produced at four fixed coordinates.

| world | `level-seed` | blocks at (8,64,8) / (40,70,40) / (-24,62,16) |
|---|---|---|
| A, first | 424242 | air / stone / gravel |
| A, again | 424242 | air / stone / gravel |
| B | 999111 | stone / stone / stone |

The same seed produces the same world and a different seed a different one, so the setting reaches
generation rather than merely reaching `server.properties` — though it reaches that too, and the
probe reads it back there.

**The blocks are only readable because the probe adds a ticking area first.** With nobody connected
no chunks are resident, and `getBlock` returns nothing for every sample; an earlier pass of this
probe reported `unloaded` across the board and could distinguish nothing. The fourth sample,
(100,68,-100), sits outside the area and stays `unloaded` in every case — it is in the table above
only as the control that shows the other three are not accidents of the reader.

## Spawn

`send-command setworldspawn 123 70 -456` against a running world, then the world's default spawn
read back after a restart: `spawn=123,70,-456`. The command takes effect and survives the restart.

The command returns nothing on stdout and the server logs nothing about it, so a harness issuing it
has no acknowledgement to wait for — it can only read the result back, which needs a script.

## The reader

A behavior pack whose script reports through an uncaught error, since that is what survives a reload
(`f:bedrock-script-console-output-is-not-a-deploy-signal`). The read is deferred one tick with
`system.run`: `World::getDefaultSpawnLocation` raises `cannot be used in early execution` when
called while the module is still evaluating.

A fresh world's default spawn reads `0,32767,0` — the y sentinel meaning the surface is found at
join time — so the default spawn is no use as a seed fingerprint, which is why the blocks are
sampled instead.

## Scope

One engine build, 1.26.40.8, one image, a remote daemon. The probe says nothing about seeds given as
text rather than digits, nor about what a spawn point does to a player already connected when it
changes.
