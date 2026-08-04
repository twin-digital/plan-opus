// A stand-in for an unmodified behavior pack: value imports from @minecraft/server, a module-scope
// subscription and a module-scope scheduled loop, all while it evaluates.
import { EntityDamageCause, Player, system, world } from '@minecraft/server'

export const hurtLog: string[] = []
export let ticks = 0

world.afterEvents.entityHurt.subscribe((event) => {
  const cause = event.damageSource.cause
  const who = event.hurtEntity instanceof Player ? 'player' : 'entity'
  hurtLog.push(`${who}:${cause === EntityDamageCause.entityAttack ? 'attack' : cause}`)
})

system.runInterval(() => {
  ticks += 1
}, 1)
