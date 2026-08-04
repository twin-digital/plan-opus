// GENERATED from the pinned @minecraft/server declarations for this validation harness.
export const AimAssistTargetMode = Object.freeze({
  "Angle": 'Angle',
  "Distance": 'Distance',
})

export const BlockComponentTypes = Object.freeze({
  "FluidContainer": 'minecraft:fluid_container',
  "Inventory": 'minecraft:inventory',
  "MapColor": 'minecraft:map_color',
  "Movable": 'minecraft:movable',
  "Piston": 'minecraft:piston',
  "PrecipitationInteractions": 'minecraft:precipitation_interactions',
  "RecordPlayer": 'minecraft:record_player',
  "RedstoneProducer": 'minecraft:redstone_producer',
  "Sign": 'minecraft:sign',
})

export const BlockPistonState = Object.freeze({
  "Expanded": 'Expanded',
  "Expanding": 'Expanding',
  "Retracted": 'Retracted',
  "Retracting": 'Retracting',
})

export const BlockVolumeIntersection = Object.freeze({
  "Disjoint": 0,
  "Contains": 1,
  "Intersects": 2,
})

export const BookErrorReason = Object.freeze({
  "ExceedsMaxPageLength": 'ExceedsMaxPageLength',
  "ExceedsMaxPages": 'ExceedsMaxPages',
  "ExceedsTitleLength": 'ExceedsTitleLength',
})

export const ButtonState = Object.freeze({
  "Pressed": 'Pressed',
  "Released": 'Released',
})

export const CommandPermissionLevel = Object.freeze({
  "Any": 0,
  "GameDirectors": 1,
  "Admin": 2,
  "Host": 3,
  "Owner": 4,
})

export const ContainerRulesErrorReason = Object.freeze({
  "BannedItem": 'BannedItem',
  "NestedStorageItem": 'NestedStorageItem',
  "NotAllowedItem": 'NotAllowedItem',
  "OverWeightLimit": 'OverWeightLimit',
  "ZeroWeightItem": 'ZeroWeightItem',
})

export const ControlScheme = Object.freeze({
  "CameraRelative": 'CameraRelative',
  "CameraRelativeStrafe": 'CameraRelativeStrafe',
  "LockedPlayerRelativeStrafe": 'LockedPlayerRelativeStrafe',
  "PlayerRelative": 'PlayerRelative',
  "PlayerRelativeStrafe": 'PlayerRelativeStrafe',
})

export const CustomCommandErrorReason = Object.freeze({
  "AlreadyRegistered": 'AlreadyRegistered',
  "EnumDependencyMissing": 'EnumDependencyMissing',
  "NamespaceMismatch": 'NamespaceMismatch',
  "ParameterLimit": 'ParameterLimit',
  "RegistryInvalid": 'RegistryInvalid',
  "RegistryReadOnly": 'RegistryReadOnly',
})

export const CustomCommandParamType = Object.freeze({
  "BlockType": 'BlockType',
  "Boolean": 'Boolean',
  "EntitySelector": 'EntitySelector',
  "EntityType": 'EntityType',
  "Enum": 'Enum',
  "Float": 'Float',
  "Integer": 'Integer',
  "ItemType": 'ItemType',
  "Location": 'Location',
  "PlayerSelector": 'PlayerSelector',
  "String": 'String',
})

export const CustomCommandSource = Object.freeze({
  "Block": 'Block',
  "Entity": 'Entity',
  "NPCDialogue": 'NPCDialogue',
  "Server": 'Server',
})

export const CustomCommandStatus = Object.freeze({
  "Success": 0,
  "Failure": 1,
})

export const CustomComponentNameErrorReason = Object.freeze({
  "NoNamespace": 1,
  "DisallowedNamespace": 2,
})

export const Difficulty = Object.freeze({
  "Easy": 'Easy',
  "Hard": 'Hard',
  "Normal": 'Normal',
  "Peaceful": 'Peaceful',
})

export const Direction = Object.freeze({
  "Down": 'Down',
  "East": 'East',
  "North": 'North',
  "South": 'South',
  "Up": 'Up',
  "West": 'West',
})

export const DisplaySlotId = Object.freeze({
  "BelowName": 'BelowName',
  "List": 'List',
  "Sidebar": 'Sidebar',
})

export const DyeColor = Object.freeze({
  "Black": 'Black',
  "Blue": 'Blue',
  "Brown": 'Brown',
  "Cyan": 'Cyan',
  "Gray": 'Gray',
  "Green": 'Green',
  "LightBlue": 'LightBlue',
  "Lime": 'Lime',
  "Magenta": 'Magenta',
  "Orange": 'Orange',
  "Pink": 'Pink',
  "Purple": 'Purple',
  "Red": 'Red',
  "Silver": 'Silver',
  "White": 'White',
  "Yellow": 'Yellow',
})

export const EasingType = Object.freeze({
  "InBack": 'InBack',
  "InBounce": 'InBounce',
  "InCirc": 'InCirc',
  "InCubic": 'InCubic',
  "InElastic": 'InElastic',
  "InExpo": 'InExpo',
  "InOutBack": 'InOutBack',
  "InOutBounce": 'InOutBounce',
  "InOutCirc": 'InOutCirc',
  "InOutCubic": 'InOutCubic',
  "InOutElastic": 'InOutElastic',
  "InOutExpo": 'InOutExpo',
  "InOutQuad": 'InOutQuad',
  "InOutQuart": 'InOutQuart',
  "InOutQuint": 'InOutQuint',
  "InOutSine": 'InOutSine',
  "InQuad": 'InQuad',
  "InQuart": 'InQuart',
  "InQuint": 'InQuint',
  "InSine": 'InSine',
  "Linear": 'Linear',
  "OutBack": 'OutBack',
  "OutBounce": 'OutBounce',
  "OutCirc": 'OutCirc',
  "OutCubic": 'OutCubic',
  "OutElastic": 'OutElastic',
  "OutExpo": 'OutExpo',
  "OutQuad": 'OutQuad',
  "OutQuart": 'OutQuart',
  "OutQuint": 'OutQuint',
  "OutSine": 'OutSine',
  "Spring": 'Spring',
})

export const EnchantmentSlot = Object.freeze({
  "ArmorFeet": 'ArmorFeet',
  "ArmorHead": 'ArmorHead',
  "ArmorLegs": 'ArmorLegs',
  "ArmorTorso": 'ArmorTorso',
  "Axe": 'Axe',
  "Bow": 'Bow',
  "CarrotStick": 'CarrotStick',
  "CosmeticHead": 'CosmeticHead',
  "Crossbow": 'Crossbow',
  "Elytra": 'Elytra',
  "FishingRod": 'FishingRod',
  "Flintsteel": 'Flintsteel',
  "Hoe": 'Hoe',
  "MeleeSpear": 'MeleeSpear',
  "Pickaxe": 'Pickaxe',
  "Shears": 'Shears',
  "Shield": 'Shield',
  "Shovel": 'Shovel',
  "Spear": 'Spear',
  "Sword": 'Sword',
})

export const EntityAttachPoint = Object.freeze({
  "Body": 'Body',
  "BreathingPoint": 'BreathingPoint',
  "DropAttachPoint": 'DropAttachPoint',
  "ExplosionPoint": 'ExplosionPoint',
  "Eyes": 'Eyes',
  "Feet": 'Feet',
  "Head": 'Head',
  "Mouth": 'Mouth',
  "WeaponAttachPoint": 'WeaponAttachPoint',
})

export const EntityComponentTypes = Object.freeze({
  "AddRider": 'minecraft:addrider',
  "Ageable": 'minecraft:ageable',
  "Breathable": 'minecraft:breathable',
  "CanClimb": 'minecraft:can_climb',
  "CanFly": 'minecraft:can_fly',
  "CanPowerJump": 'minecraft:can_power_jump',
  "Color": 'minecraft:color',
  "Color2": 'minecraft:color2',
  "CursorInventory": 'minecraft:cursor_inventory',
  "EnderInventory": 'minecraft:ender_inventory',
  "Equippable": 'minecraft:equippable',
  "FireImmune": 'minecraft:fire_immune',
  "FloatsInLiquid": 'minecraft:floats_in_liquid',
  "FlyingSpeed": 'minecraft:flying_speed',
  "FrictionModifier": 'minecraft:friction_modifier',
  "Healable": 'minecraft:healable',
  "Health": 'minecraft:health',
  "Inventory": 'minecraft:inventory',
  "IsBaby": 'minecraft:is_baby',
  "IsCharged": 'minecraft:is_charged',
  "IsChested": 'minecraft:is_chested',
  "IsDyeable": 'minecraft:is_dyeable',
  "IsHiddenWhenInvisible": 'minecraft:is_hidden_when_invisible',
  "IsIgnited": 'minecraft:is_ignited',
  "IsIllagerCaptain": 'minecraft:is_illager_captain',
  "IsSaddled": 'minecraft:is_saddled',
  "IsShaking": 'minecraft:is_shaking',
  "IsSheared": 'minecraft:is_sheared',
  "IsStackable": 'minecraft:is_stackable',
  "IsStunned": 'minecraft:is_stunned',
  "IsTamed": 'minecraft:is_tamed',
  "Item": 'minecraft:item',
  "LavaMovement": 'minecraft:lava_movement',
  "Leashable": 'minecraft:leashable',
  "MarkVariant": 'minecraft:mark_variant',
  "Movement": 'minecraft:movement',
  "MovementAmphibious": 'minecraft:movement.amphibious',
  "MovementBasic": 'minecraft:movement.basic',
  "MovementFly": 'minecraft:movement.fly',
  "MovementGeneric": 'minecraft:movement.generic',
  "MovementGlide": 'minecraft:movement.glide',
  "MovementHover": 'minecraft:movement.hover',
  "MovementJump": 'minecraft:movement.jump',
  "MovementSkip": 'minecraft:movement.skip',
  "MovementSway": 'minecraft:movement.sway',
  "NavigationClimb": 'minecraft:navigation.climb',
  "NavigationFloat": 'minecraft:navigation.float',
  "NavigationFly": 'minecraft:navigation.fly',
  "NavigationGeneric": 'minecraft:navigation.generic',
  "NavigationHover": 'minecraft:navigation.hover',
  "NavigationWalk": 'minecraft:navigation.walk',
  "OnFire": 'minecraft:onfire',
  "Exhaustion": 'minecraft:player.exhaustion',
  "Hunger": 'minecraft:player.hunger',
  "Saturation": 'minecraft:player.saturation',
  "Projectile": 'minecraft:projectile',
  "PushThrough": 'minecraft:push_through',
  "Rideable": 'minecraft:rideable',
  "Riding": 'minecraft:riding',
  "Scale": 'minecraft:scale',
  "SkinId": 'minecraft:skin_id',
  "Strength": 'minecraft:strength',
  "Tameable": 'minecraft:tameable',
  "TameMount": 'minecraft:tamemount',
  "TypeFamily": 'minecraft:type_family',
  "UnderwaterMovement": 'minecraft:underwater_movement',
  "Variant": 'minecraft:variant',
  "WantsJockey": 'minecraft:wants_jockey',
})

export const EntityDamageCause = Object.freeze({
  "anvil": 'anvil',
  "blockExplosion": 'blockExplosion',
  "campfire": 'campfire',
  "charging": 'charging',
  "contact": 'contact',
  "drowning": 'drowning',
  "entityAttack": 'entityAttack',
  "entityExplosion": 'entityExplosion',
  "fall": 'fall',
  "fallingBlock": 'fallingBlock',
  "fire": 'fire',
  "fireTick": 'fireTick',
  "fireworks": 'fireworks',
  "flyIntoWall": 'flyIntoWall',
  "freezing": 'freezing',
  "lava": 'lava',
  "lightning": 'lightning',
  "maceSmash": 'maceSmash',
  "magic": 'magic',
  "magma": 'magma',
  "none": 'none',
  "override": 'override',
  "piston": 'piston',
  "projectile": 'projectile',
  "ramAttack": 'ramAttack',
  "selfDestruct": 'selfDestruct',
  "sonicBoom": 'sonicBoom',
  "soulCampfire": 'soulCampfire',
  "stalactite": 'stalactite',
  "stalagmite": 'stalagmite',
  "starve": 'starve',
  "suffocation": 'suffocation',
  "temperature": 'temperature',
  "thorns": 'thorns',
  "void": 'void',
  "wither": 'wither',
})

export const EntityHealCause = Object.freeze({
  "Heal": 'Heal',
  "Regeneration": 'Regeneration',
  "SelfHeal": 'SelfHeal',
  "TotemOfUndying": 'TotemOfUndying',
})

export const EntityInitializationCause = Object.freeze({
  "Born": 'Born',
  "Event": 'Event',
  "Loaded": 'Loaded',
  "Spawned": 'Spawned',
  "Transformed": 'Transformed',
})

export const EntitySwingSource = Object.freeze({
  "Attack": 'Attack',
  "Build": 'Build',
  "DropItem": 'DropItem',
  "Event": 'Event',
  "Interact": 'Interact',
  "Mine": 'Mine',
  "None": 'None',
  "ThrowItem": 'ThrowItem',
  "UseItem": 'UseItem',
})

export const EquipmentSlot = Object.freeze({
  "Chest": 'Chest',
  "Feet": 'Feet',
  "Head": 'Head',
  "Legs": 'Legs',
  "Mainhand": 'Mainhand',
  "Offhand": 'Offhand',
})

export const FluidType = Object.freeze({
  "Lava": 'Lava',
  "Potion": 'Potion',
  "PowderSnow": 'PowderSnow',
  "Water": 'Water',
})

export const GameMode = Object.freeze({
  "Adventure": 'Adventure',
  "Creative": 'Creative',
  "Spectator": 'Spectator',
  "Survival": 'Survival',
})

export const GameRule = Object.freeze({
  "CommandBlockOutput": 'commandBlockOutput',
  "CommandBlocksEnabled": 'commandBlocksEnabled',
  "DoDayLightCycle": 'doDayLightCycle',
  "DoEntityDrops": 'doEntityDrops',
  "DoFireTick": 'doFireTick',
  "DoImmediateRespawn": 'doImmediateRespawn',
  "DoInsomnia": 'doInsomnia',
  "DoLimitedCrafting": 'doLimitedCrafting',
  "DoMobLoot": 'doMobLoot',
  "DoMobSpawning": 'doMobSpawning',
  "DoTileDrops": 'doTileDrops',
  "DoWeatherCycle": 'doWeatherCycle',
  "DrowningDamage": 'drowningDamage',
  "FallDamage": 'fallDamage',
  "FireDamage": 'fireDamage',
  "FreezeDamage": 'freezeDamage',
  "FunctionCommandLimit": 'functionCommandLimit',
  "KeepInventory": 'keepInventory',
  "MaxCommandChainLength": 'maxCommandChainLength',
  "MobGriefing": 'mobGriefing',
  "NaturalRegeneration": 'naturalRegeneration',
  "PlayersSleepingPercentage": 'playersSleepingPercentage',
  "ProjectilesCanBreakBlocks": 'projectilesCanBreakBlocks',
  "Pvp": 'pvp',
  "RandomTickSpeed": 'randomTickSpeed',
  "RecipesUnlock": 'recipesUnlock',
  "RespawnBlocksExplode": 'respawnBlocksExplode',
  "SendCommandFeedback": 'sendCommandFeedback',
  "ShowBorderEffect": 'showBorderEffect',
  "ShowCoordinates": 'showCoordinates',
  "ShowDaysPlayed": 'showDaysPlayed',
  "ShowDeathMessages": 'showDeathMessages',
  "ShowRecipeMessages": 'showRecipeMessages',
  "ShowTags": 'showTags',
  "SpawnRadius": 'spawnRadius',
  "TntExplodes": 'tntExplodes',
  "TntExplosionDropDecay": 'tntExplosionDropDecay',
})

export const GraphicsMode = Object.freeze({
  "Deferred": 'Deferred',
  "Fancy": 'Fancy',
  "RayTraced": 'RayTraced',
  "Simple": 'Simple',
})

export const HeldItemOption = Object.freeze({
  "AnyItem": 'AnyItem',
  "NoItem": 'NoItem',
})

export const HudElement = Object.freeze({
  "PaperDoll": 0,
  "Armor": 1,
  "ToolTips": 2,
  "TouchControls": 3,
  "Crosshair": 4,
  "Hotbar": 5,
  "Health": 6,
  "ProgressBar": 7,
  "Hunger": 8,
  "AirBubbles": 9,
  "HorseHealth": 10,
  "StatusEffects": 11,
  "ItemText": 12,
})

export const HudVisibility = Object.freeze({
  "Hide": 0,
  "Reset": 1,
})

export const InputButton = Object.freeze({
  "Jump": 'Jump',
  "Sneak": 'Sneak',
})

export const InputMode = Object.freeze({
  "Gamepad": 'Gamepad',
  "KeyboardAndMouse": 'KeyboardAndMouse',
  "MotionController": 'MotionController',
  "Touch": 'Touch',
})

export const InputPermissionCategory = Object.freeze({
  "Camera": 1,
  "Movement": 2,
  "LateralMovement": 4,
  "Sneak": 5,
  "Jump": 6,
  "Mount": 7,
  "Dismount": 8,
  "MoveForward": 9,
  "MoveBackward": 10,
  "MoveLeft": 11,
  "MoveRight": 12,
})

export const ItemComponentTypes = Object.freeze({
  "Book": 'minecraft:book',
  "Compostable": 'minecraft:compostable',
  "Cooldown": 'minecraft:cooldown',
  "Durability": 'minecraft:durability',
  "Dyeable": 'minecraft:dyeable',
  "Enchantable": 'minecraft:enchantable',
  "Food": 'minecraft:food',
  "Inventory": 'minecraft:inventory',
  "Potion": 'minecraft:potion',
})

export const ItemLockMode = Object.freeze({
  "inventory": 'inventory',
  "none": 'none',
  "slot": 'slot',
})

export const LiquidSettings = Object.freeze({
  "ApplyWaterlogging": 'ApplyWaterlogging',
  "IgnoreWaterlogging": 'IgnoreWaterlogging',
})

export const LiquidType = Object.freeze({
  "Water": 'Water',
})

export const LocatorBarErrorReason = Object.freeze({
  "WaypointAlreadyExists": 'WaypointAlreadyExists',
  "WaypointLimitExceeded": 'WaypointLimitExceeded',
  "WaypointNotFound": 'WaypointNotFound',
})

export const MemoryTier = Object.freeze({
  "SuperLow": 0,
  "Low": 1,
  "Mid": 2,
  "High": 3,
  "SuperHigh": 4,
})

export const MoonPhase = Object.freeze({
  "FullMoon": 0,
  "WaningGibbous": 1,
  "FirstQuarter": 2,
  "WaningCrescent": 3,
  "NewMoon": 4,
  "WaxingCrescent": 5,
  "LastQuarter": 6,
  "WaxingGibbous": 7,
})

export const MovementType = Object.freeze({
  "Immovable": 'Immovable',
  "Popped": 'Popped',
  "Push": 'Push',
  "PushPull": 'PushPull',
})

export const NamespaceNameErrorReason = Object.freeze({
  "DisallowedNamespace": 'DisallowedNamespace',
  "NoNamespace": 'NoNamespace',
})

export const ObjectiveSortOrder = Object.freeze({
  "Ascending": 0,
  "Descending": 1,
})

export const PaletteColor = Object.freeze({
  "White": 0,
  "Orange": 1,
  "Magenta": 2,
  "LightBlue": 3,
  "Yellow": 4,
  "Lime": 5,
  "Pink": 6,
  "Gray": 7,
  "Silver": 8,
  "Cyan": 9,
  "Purple": 10,
  "Blue": 11,
  "Brown": 12,
  "Green": 13,
  "Red": 14,
  "Black": 15,
})

export const PlatformType = Object.freeze({
  "Console": 'Console',
  "Desktop": 'Desktop',
  "Mobile": 'Mobile',
})

export const PlayerInventoryType = Object.freeze({
  "Hotbar": 'Hotbar',
  "Inventory": 'Inventory',
})

export const PlayerPermissionLevel = Object.freeze({
  "Visitor": 0,
  "Member": 1,
  "Operator": 2,
  "Custom": 3,
})

export const ScoreboardIdentityType = Object.freeze({
  "Entity": 'Entity',
  "FakePlayer": 'FakePlayer',
  "Player": 'Player',
})

export const ScriptEventSource = Object.freeze({
  "Block": 'Block',
  "Entity": 'Entity',
  "NPCDialogue": 'NPCDialogue',
  "Server": 'Server',
})

export const SignSide = Object.freeze({
  "Back": 'Back',
  "Front": 'Front',
})

export const StickyType = Object.freeze({
  "None": 'None',
  "Same": 'Same',
})

export const StructureAnimationMode = Object.freeze({
  "Blocks": 'Blocks',
  "Layers": 'Layers',
  "None": 'None',
})

export const StructureMirrorAxis = Object.freeze({
  "None": 'None',
  "X": 'X',
  "XZ": 'XZ',
  "Z": 'Z',
})

export const StructureRotation = Object.freeze({
  "None": 'None',
  "Rotate180": 'Rotate180',
  "Rotate270": 'Rotate270',
  "Rotate90": 'Rotate90',
})

export const StructureSaveMode = Object.freeze({
  "Memory": 'Memory',
  "World": 'World',
})

export const TickingAreaErrorReason = Object.freeze({
  "IdentifierAlreadyExists": 'IdentifierAlreadyExists',
  "OverChunkLimit": 'OverChunkLimit',
  "SideLengthExceeded": 'SideLengthExceeded',
  "UnknownIdentifier": 'UnknownIdentifier',
})

export const TimeOfDay = Object.freeze({
  "Day": 1000,
  "Noon": 6000,
  "Sunset": 12000,
  "Night": 13000,
  "Midnight": 18000,
  "Sunrise": 23000,
})

export const TintMethod = Object.freeze({
  "BirchFoliage": 'BirchFoliage',
  "DefaultFoliage": 'DefaultFoliage',
  "DryFoliage": 'DryFoliage',
  "EvergreenFoliage": 'EvergreenFoliage',
  "Grass": 'Grass',
  "None": 'None',
  "Water": 'Water',
})

export const WaypointTexture = Object.freeze({
  "Circle": 'minecraft:circle',
  "SmallSquare": 'minecraft:small_square',
  "SmallStar": 'minecraft:small_star',
  "Square": 'minecraft:square',
})

export const WeatherType = Object.freeze({
  "Clear": 'Clear',
  "Rain": 'Rain',
  "Thunder": 'Thunder',
})
