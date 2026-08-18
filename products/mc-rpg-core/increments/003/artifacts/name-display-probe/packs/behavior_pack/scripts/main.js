// Spawns one of each probe entity in a row and applies the nameTag treatment each case is named
// for. Everything a script can observe is written to chat; what a player *reads above the entity*
// is not script-observable and is the point of the probe — see README.md.
//
//   /scriptevent probe:run
import { system, world } from '@minecraft/server'

// [identifier, what the script does to nameTag]
const CASES = [
  ['probe:lang_only', undefined],
  ['probe:no_lang', undefined],
  ['probe:lang_and_tag', 'Literal Tag'],
  ['probe:tag_is_key', 'entity.probe:tag_is_key.name'],
  ['probe:tag_is_rawtext', '{"rawtext":[{"translate":"entity.probe:tag_is_rawtext.name"}]}'],
]

const say = (line) => world.sendMessage(line)

system.afterEvents.scriptEventReceive.subscribe(
  (event) => {
    if (event.id !== 'probe:run') return

    const player = world.getAllPlayers()[0]
    if (player === undefined) return say('probe: no player online')
    const dimension = player.dimension
    const origin = player.location

    // clear anything a previous run left, so the row is re-readable
    for (const stale of dimension.getEntities({ families: ['probe'] })) stale.remove()

    say('probe: spawning ' + CASES.length + ' entities')
    CASES.forEach(([identifier, tag], index) => {
      const at = { x: origin.x + (index - 2) * 3, y: origin.y, z: origin.z + 6 }
      let entity
      try {
        entity = dimension.spawnEntity(identifier, at)
      } catch (error) {
        return say(`probe: ${identifier} FAILED TO SPAWN — ${String(error)}`)
      }
      if (tag !== undefined) entity.nameTag = tag

      // the script-visible half: what the engine reports, as distinct from what renders
      say(
        `probe: ${identifier}` +
          ` | localizationKey=${entity.type?.localizationKey ?? '(none)'}` +
          ` | nameTag=${JSON.stringify(entity.nameTag)}`,
      )
    })
    say('probe: done — now READ THE PLATES IN GAME, then switch the client to Deutsch and re-read')
  },
  { namespaces: ['probe'] },
)
