# The client half of `q-fc5bw0k0`

Knockback and panic are motion, and a dedicated server reports both — `vgprobe:reaction` measures
them with no client attached. **Flinch and the hurt sound are rendered on the client and reach no
log**, so this half needs a person watching one.

What it asks is a comparison, not a judgement. Three villagers stand penned in a row and are hit
with the same weapon:

| lane | what the pack does to the hit | what to expect |
|---|---|---|
| `CONTROL` | nothing — the hit is vanilla | the reference |
| `CLAMPED` | `damage` written down to 0.5, health restored | the design under test |
| `CANCELLED` | `cancel = true` | the calibration — the mechanism the design rejected |

`CONTROL` and `CLAMPED` being indistinguishable is the answer the design needs. `CANCELLED`
showing nothing is what proves the comparison discriminates: if all three look alike, the
observation is not sensitive enough to mean anything either way.

None of the three can die — every lane is topped up off the damage path, on a timer, so the
control's own hits stay entirely vanilla.

## Bringing the server up for a client

The probe stack runs headless and publishes no port. This adds one and turns off the checks that
would keep you out:

```
cd evidence/minecraft/script-api/protection-probe
docker compose -f compose.yaml -f compose.client.yaml up -d
```

Then connect from the Bedrock client to this host on UDP **19132** — add a server with the
machine's LAN address, not `localhost`, unless the client is on this machine.

`compose.client.yaml` sets `ONLINE_MODE=false` and `ALLOW_LIST=false`, so anything that can reach
the port can join. It is a throwaway probe world on a local network; do not leave it up.

## Running the comparison

Once you are in the world, from this machine:

```
docker compose -f compose.yaml -f compose.client.yaml exec -T bedrock send-command "scriptevent vgprobe:client"
```

That builds the pens, spawns the three villagers with their names above their heads, teleports you
onto the platform in survival with a stone sword, and prints the instructions to chat. The session
runs five minutes and then prints its counts.

## What to report back

Hit each villager several times with the same weapon, and for each lane say:

1. **Flinch** — does it flash red?
2. **Sound** — does the hurt grunt play?
3. **Knockback** — does it visibly recoil?
4. **Panic** — does it run, and does it keep running the way a struck villager does?
5. **Anything the pack added** — particles, a tint, a sound, chat output, anything at all on
   `CLAMPED` that `CONTROL` does not have.

Question 5 is the one `r-eh0aac98`'s second half turns on, and it is worth a slow look rather than
a quick one.

If `CLAMPED` matches `CONTROL` on 1–4 and adds nothing on 5, `q-fc5bw0k0` closes. If it differs on
any of them, say which — the difference decides whether `d-jp67dexu` survives as written.

## Tearing down

```
docker compose -f compose.yaml -f compose.client.yaml down -v
```
