import express from 'express'
import cors from 'cors'
import fs from 'fs'
import { Buffer } from 'buffer'
import { detectEventContent } from './src/utils/contentDetection.js'
import { cleanItemName } from './src/utils/items.js'

const app = express()
app.use(cors())
app.use(express.json())

const BASE = 'https://gameinfo-ams.albiononline.com/api/gameinfo'
const PORT = 3001
const STORED_EVENTS_LIMIT = 50000
const STORED_EVENTS_MAX_BYTES = 140 * 1024 * 1024
const PLAYER_HISTORY_LIMIT = 500
const GLOBAL_EVENTS_FETCH_LIMIT = 51
const GLOBAL_EVENTS_FETCH_PAGES = 10
const STORED_INVENTORY_LIMIT = 32
const STORED_PARTICIPANTS_LIMIT = 80
const EQUIPMENT_SLOTS = [
  'MainHand',
  'OffHand',
  'Head',
  'Armor',
  'Shoes',
  'Bag',
  'Cape',
  'Mount',
  'Potion',
  'Food',
]

const DATA_PATH = './server-data'
const EVENTS_FILE = `${DATA_PATH}/events.json`

const PRICE_BASE = 'https://europe.albion-online-data.com/api/v2/stats/prices'
const PRICE_LOCATIONS = [
  'Caerleon',
  'Bridgewatch',
  'Martlock',
  'Fort Sterling',
  'Lymhurst',
  'Thetford',
  'Brecilien',
]

const PRICE_CACHE_TTL = 1000 * 60 * 10
const BUILD_RECENT_FIGHTS_LIMIT = 8
const priceCache = new Map()

if (!fs.existsSync(DATA_PATH)) {
  fs.mkdirSync(DATA_PATH)
}

if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify([]))
}

function loadEvents() {
  try {
    const parsed = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'))
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Erreur lecture events stockes:', error)
    return []
  }
}

function saveEvents(events) {
  const { payload, count } = serializeEvents(events)
  const tempFile = `${EVENTS_FILE}.tmp`

  fs.writeFileSync(tempFile, payload)
  fs.renameSync(tempFile, EVENTS_FILE)

  return count
}

function copyDefined(source = {}, keys = []) {
  return keys.reduce((target, key) => {
    const value = source[key]

    if (value !== undefined && value !== null && value !== '') {
      target[key] = value
    }

    return target
  }, {})
}

function compactItem(item = {}) {
  if (!item?.Type) return null

  const compact = copyDefined(item, ['Type', 'Quality', 'Count'])

  if (Array.isArray(item.ActiveSpells) && item.ActiveSpells.length > 0) {
    compact.ActiveSpells = item.ActiveSpells.filter(Boolean).slice(0, 8)
  }

  if (Array.isArray(item.PassiveSpells) && item.PassiveSpells.length > 0) {
    compact.PassiveSpells = item.PassiveSpells.filter(Boolean).slice(0, 8)
  }

  return compact
}

function compactEquipment(equipment = {}) {
  return EQUIPMENT_SLOTS.reduce((result, slot) => {
    const item = compactItem(equipment?.[slot])

    if (item) {
      result[slot] = item
    }

    return result
  }, {})
}

function compactInventory(inventory = []) {
  if (!Array.isArray(inventory)) return []

  return inventory
    .slice(0, STORED_INVENTORY_LIMIT)
    .map(compactItem)
    .filter(Boolean)
}

function compactParticipant(player = {}) {
  return copyDefined(player, [
    'Id',
    'Name',
    'GuildId',
    'GuildName',
    'GuildTag',
    'AllianceId',
    'AllianceName',
    'AllianceTag',
  ])
}

function compactCombatEntity(player = {}) {
  const compact = copyDefined(player, [
    'Id',
    'Name',
    'GuildId',
    'GuildName',
    'GuildTag',
    'AllianceId',
    'AllianceName',
    'AllianceTag',
    'AverageItemPower',
  ])

  const equipment = compactEquipment(player.Equipment)
  if (Object.keys(equipment).length > 0) {
    compact.Equipment = equipment
  }

  const inventory = compactInventory(player.Inventory)
  if (inventory.length > 0) {
    compact.Inventory = inventory
  }

  return compact
}

function compactEvent(event = {}) {
  if (!event?.EventId) return null

  const compact = copyDefined(event, [
    'EventId',
    'TimeStamp',
    'BattleId',
    'Version',
    'TotalVictimKillFame',
    'Location',
    'numberOfParticipants',
    'NumberOfParticipants',
    'groupMemberCount',
    'GroupMemberCount',
  ])

  if (event.Killer) {
    compact.Killer = compactCombatEntity(event.Killer)
  }

  if (event.Victim) {
    compact.Victim = compactCombatEntity(event.Victim)
  }

  if (Array.isArray(event.Participants) && event.Participants.length > 0) {
    compact.Participants = event.Participants
      .slice(0, STORED_PARTICIPANTS_LIMIT)
      .map(compactParticipant)
      .filter((player) => player.Id || player.Name)
  }

  if (Array.isArray(event.GroupMembers) && event.GroupMembers.length > 0) {
    compact.GroupMembers = event.GroupMembers
      .slice(0, STORED_PARTICIPANTS_LIMIT)
      .map(compactParticipant)
      .filter((player) => player.Id || player.Name)
  }

  return compact
}

function normalizeEventsForStorage(events = [], limit = STORED_EVENTS_LIMIT) {
  const seen = new Set()
  const normalized = []

  events.forEach((event) => {
    const compact = compactEvent(event)
    if (!compact) return

    const key = String(compact.EventId)
    if (seen.has(key)) return

    seen.add(key)
    normalized.push(compact)
  })

  return normalized
    .sort((a, b) => {
      const dateA = getEventDate(a)?.getTime() || 0
      const dateB = getEventDate(b)?.getTime() || 0

      return dateB - dateA
    })
    .slice(0, limit)
}

function serializeEvents(events = []) {
  let safeEvents = normalizeEventsForStorage(events)

  while (safeEvents.length > 0) {
    try {
      const payload = JSON.stringify(safeEvents)

      if (
        Buffer.byteLength(payload, 'utf-8') <= STORED_EVENTS_MAX_BYTES ||
        safeEvents.length <= 1000
      ) {
        return { payload, count: safeEvents.length }
      }
    } catch (error) {
      if (!(error instanceof RangeError)) {
        throw error
      }
    }

    safeEvents = safeEvents.slice(0, Math.max(Math.floor(safeEvents.length * 0.8), 1))
  }

  return { payload: '[]', count: 0 }
}

function compactStoredEventsFile() {
  try {
    const beforeSize = fs.statSync(EVENTS_FILE).size
    const events = loadEvents()
    const savedCount = saveEvents(events)
    const afterSize = fs.statSync(EVENTS_FILE).size

    if (beforeSize !== afterSize || events.length !== savedCount) {
      console.log(
        `events compactes: ${events.length} -> ${savedCount}, ${Math.round(beforeSize / 1024 / 1024)}MB -> ${Math.round(afterSize / 1024 / 1024)}MB`
      )
    }
  } catch (error) {
    console.error('Erreur compactage events:', error)
  }
}

function getSafeLimit(value, fallback, max) {
  const limit = Number(value || fallback)

  if (!Number.isFinite(limit) || limit <= 0) {
    return fallback
  }

  return Math.min(Math.floor(limit), max)
}

function withDetectedContent(event) {
  if (!event) return event

  return {
    ...event,
    DetectedContent: detectEventContent(event),
  }
}

async function fetchBattleSummary(battleId) {
  if (!battleId) return null

  try {
    const response = await fetch(`${BASE}/battles/${battleId}`)

    if (!response.ok) return null

    return response.json()
  } catch (error) {
    console.warn('Battle summary indisponible:', battleId, error)
    return null
  }
}

async function fetchEventDetails(eventId) {
  const storedEvent = loadEvents().find(
    (event) => String(event.EventId) === String(eventId)
  )

  try {
    const response = await fetch(`${BASE}/events/${eventId}`)

    if (!response.ok) {
      return withDetectedContent(storedEvent)
    }

    const event = await response.json()
    const battleSummary = await fetchBattleSummary(event?.BattleId)
    const enriched = battleSummary ? { ...event, battleSummary } : event

    return withDetectedContent(enriched)
  } catch (error) {
    console.error('Erreur fetch event details:', eventId, error)
    return withDetectedContent(storedEvent)
  }
}

function getSafeQuality(value) {
  const quality = Number(value || 1)

  if (quality >= 1 && quality <= 5) {
    return quality
  }

  return 1
}

function formatCompact(value) {
  const number = Number(value || 0)

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`
  }

  if (number >= 1000) {
    return `${Math.round(number / 1000)}K`
  }

  return number.toLocaleString('fr-FR')
}

function getEventDate(event = {}) {
  const timestamp = event.TimeStamp || event.timestamp
  const date = timestamp ? new Date(timestamp) : null

  return date && !Number.isNaN(date.getTime()) ? date : null
}

function getEventDayKey(event = {}) {
  const date = getEventDate(event)
  if (!date) return ''

  return date.toISOString().slice(0, 10)
}

function getEntityWeapon(entity = {}) {
  return entity.Equipment?.MainHand?.Type || ''
}

function getEquipmentItem(entity = {}, slot) {
  return entity.Equipment?.[slot]?.Type || ''
}

function getItemTier(itemId = '') {
  return String(itemId).match(/^T(\d+)/i)?.[1] || '?'
}

function getBaseWeaponId(itemId = '') {
  return String(itemId || '')
    .replace(/^T\d_/, '')
    .replace(/@.*/, '')
}

function getProfileItemId(itemId = '') {
  const baseId = getBaseWeaponId(itemId)

  return baseId ? `T8_${baseId}` : ''
}

function getTopEntry(counts = {}) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
}

function increment(counts, key, amount = 1) {
  if (!key) return
  counts[key] = (counts[key] || 0) + amount
}

function toPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`
}

function formatSignedPercent(value) {
  const number = Number(value || 0)
  const prefix = number > 0 ? '+' : ''

  return `${prefix}${number.toFixed(1)}%`
}

function getWeaponFamily(itemId = '') {
  const base = getBaseWeaponId(itemId)
    .replace(/^2H_/, '')
    .replace(/^MAIN_/, '')

  if (base.includes('DAGGER') || base.includes('RAPIER')) return 'Dagues'
  if (base.includes('SWORD') || base.includes('CLEAVER') || base.includes('SCIMITAR')) return 'Épées'
  if (base.includes('CROSSBOW')) return 'Arbalètes'
  if (base.includes('SHAPESHIFTER')) return 'Shapeshifter'
  if (base.includes('BOW')) return 'Arcs'
  if (base.includes('FIRE')) return 'Feu'
  if (base.includes('FROST')) return 'Givre'
  if (base.includes('CURSED') || base.includes('DEMONIC')) return 'Maudit'
  if (base.includes('HOLY')) return 'Sacré'
  if (base.includes('NATURE')) return 'Nature'
  if (base.includes('SPEAR') || base.includes('TRIDENT')) return 'Lances'
  if (base.includes('AXE') || base.includes('HALBERD')) return 'Haches'
  if (base.includes('MACE')) return 'Masses'
  if (base.includes('HAMMER')) return 'Marteaux'
  if (base.includes('STAFF')) return 'Bâtons'

  return 'Arme'
}

function getTierFromWinrate(winrate) {
  if (winrate >= 58) return 'S'
  if (winrate >= 54) return 'A'
  if (winrate >= 50) return 'B'
  return 'C'
}

function getMetaWeapons(events = []) {
  const filtered = events
    .filter((event) => getEntityWeapon(event.Killer) && getEntityWeapon(event.Victim))
    .slice(0, 25000)

  const weapons = new Map()
  const latestTime = Math.max(
    ...filtered.map((event) => getEventDate(event)?.getTime() || 0),
    Date.now() - 24 * 60 * 60 * 1000
  )
  const dayMs = 24 * 60 * 60 * 1000
  const trendStart = latestTime - dayMs
  const previousStart = latestTime - dayMs * 2
  const bucketCount = 12

  function ensureWeapon(itemId) {
    const key = getBaseWeaponId(itemId) || 'Inconnu'

    if (!weapons.has(key)) {
      weapons.set(key, {
        itemId,
        name: cleanItemName(itemId),
        type: getWeaponFamily(itemId),
        variants: {},
        wins: 0,
        losses: 0,
        fights: 0,
        currentFights: 0,
        previousFights: 0,
        currentWins: 0,
        currentLosses: 0,
        trend: Array.from({ length: bucketCount }, (_, index) => ({
          label: `${24 - index * 2}h`,
          wins: 0,
          losses: 0,
          fights: 0,
        })),
      })
    }

    return weapons.get(key)
  }

  function recordUsage(itemId, won, time) {
    if (!itemId) return

    const weapon = ensureWeapon(itemId)
    weapon.fights += 1
    weapon.variants[itemId] = (weapon.variants[itemId] || 0) + 1

    if (won) weapon.wins += 1
    else weapon.losses += 1

    if (time >= trendStart) {
      const bucketIndex = Math.min(
        Math.max(Math.floor(((time - trendStart) / dayMs) * bucketCount), 0),
        bucketCount - 1
      )
      const bucket = weapon.trend[bucketIndex]

      weapon.currentFights += 1
      bucket.fights += 1

      if (won) {
        weapon.currentWins += 1
        bucket.wins += 1
      } else {
        weapon.currentLosses += 1
        bucket.losses += 1
      }
    } else if (time >= previousStart) {
      weapon.previousFights += 1
    }
  }

  filtered.forEach((event) => {
    const killerWeapon = getEntityWeapon(event.Killer)
    const victimWeapon = getEntityWeapon(event.Victim)
    const date = getEventDate(event)
    const time = date?.getTime() || 0

    recordUsage(killerWeapon, true, time)
    recordUsage(victimWeapon, false, time)
  })

  const totalFights = Array.from(weapons.values()).reduce(
    (sum, weapon) => sum + weapon.fights,
    0
  )

  const minPickrate = 0.5
  const minFights = Math.max(40, Math.ceil((totalFights * minPickrate) / 100))

  return Array.from(weapons.values())
    .filter((weapon) => weapon.fights >= minFights)
    .map((weapon) => {
      const winrate = weapon.fights
        ? (weapon.wins / weapon.fights) * 100
        : 0
      const pickrate = totalFights ? (weapon.fights / totalFights) * 100 : 0
      const recentWinrate = weapon.currentFights
        ? (weapon.currentWins / weapon.currentFights) * 100
        : winrate
      const previousFights = weapon.previousFights || 0
      const trendDelta = previousFights
        ? ((weapon.currentFights - previousFights) / previousFights) * 100
        : weapon.currentFights > 0
          ? 100
          : 0
      const topVariant =
        Object.entries(weapon.variants).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        weapon.itemId
      const baseId = getBaseWeaponId(topVariant)
      const profileItemId = getProfileItemId(baseId)

      return {
        ...weapon,
        baseId,
        itemId: profileItemId,
        profileTier: 'T8',
        name: cleanItemName(baseId),
        winrateNumber: winrate,
        pickrateNumber: pickrate,
        winrate: `${winrate.toFixed(1)}%`,
        pickrate: `${pickrate.toFixed(1)}%`,
        fightsLabel: formatCompact(weapon.fights),
        recentFights: weapon.currentFights,
        recentFightsLabel: formatCompact(weapon.currentFights),
        previousFights,
        recentWinrateNumber: recentWinrate,
        recentWinrate: toPercent(recentWinrate),
        trendDeltaNumber: trendDelta,
        trendDelta: formatSignedPercent(trendDelta),
        trend: weapon.trend.map((bucket) => ({
          ...bucket,
          winrate: bucket.fights ? Math.round((bucket.wins / bucket.fights) * 100) : 0,
        })),
        tier: getTierFromWinrate(winrate),
        danger: trendDelta < 0,
      }
    })
    .filter((weapon) => weapon.pickrateNumber >= minPickrate)
    .sort((a, b) => {
      if (b.winrateNumber !== a.winrateNumber) {
        return b.winrateNumber - a.winrateNumber
      }

      return b.pickrateNumber - a.pickrateNumber
    })
    .slice(0, 4)
    .map((weapon, index) => ({
      ...weapon,
      rank: index + 1,
    }))
}

const BUILD_ARCHETYPE_SLOTS = ['Head', 'Armor', 'OffHand']
const BUILD_SLOTS = ['Head', 'Armor', 'Shoes', 'Cape', 'OffHand', 'Potion', 'Food']

function getWeaponUsages(events = [], baseId = '') {
  const targetBase = getBaseWeaponId(baseId)
  if (!targetBase) return []

  return events
    .slice(0, 50000)
    .flatMap((event) => {
      const usages = []
      const killerWeapon = getEntityWeapon(event.Killer)
      const victimWeapon = getEntityWeapon(event.Victim)

      if (getBaseWeaponId(killerWeapon) === targetBase) {
        usages.push({
          event,
          won: true,
          player: event.Killer,
          opponent: event.Victim,
          weapon: killerWeapon,
        })
      }

      if (getBaseWeaponId(victimWeapon) === targetBase) {
        usages.push({
          event,
          won: false,
          player: event.Victim,
          opponent: event.Killer,
          weapon: victimWeapon,
        })
      }

      return usages
    })
}

function makeTrend(usages = [], bucketCount = 10) {
  const latestTime = Math.max(
    ...usages.map((usage) => getEventDate(usage.event)?.getTime() || 0),
    Date.now()
  )
  const trendStart = latestTime - 7 * 24 * 60 * 60 * 1000
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    label: `${index + 1}`,
    wins: 0,
    losses: 0,
    fights: 0,
  }))

  usages.forEach((usage) => {
    const time = getEventDate(usage.event)?.getTime() || 0
    const index = Math.min(
      Math.max(Math.floor(((time - trendStart) / (7 * 24 * 60 * 60 * 1000)) * bucketCount), 0),
      bucketCount - 1
    )
    const bucket = buckets[index]

    bucket.fights += 1
    if (usage.won) bucket.wins += 1
    else bucket.losses += 1
  })

  return buckets.map((bucket) => ({
    ...bucket,
    winrate: bucket.fights ? Math.round((bucket.wins / bucket.fights) * 100) : 0,
  }))
}

function getBuildKey(player = {}) {
  return BUILD_ARCHETYPE_SLOTS
    .map((slot) => getBaseWeaponId(getEquipmentItem(player, slot)) || '-')
    .join('|')
}

function getBuildBaseIds(buildKey = '') {
  return String(buildKey).split('|')
}

function getBuildDisplayItemId(slot, baseId, slotVariants = {}) {
  if (slot === 'Potion' || slot === 'Food') {
    return getTopEntry(slotVariants[slot]) || ''
  }

  return getProfileItemId(baseId)
}

function getBuildSlotVariantKey(slot, itemId = '') {
  if (slot === 'Potion' || slot === 'Food') {
    return itemId
  }

  return getBaseWeaponId(itemId)
}

function getBuildSlotDisplayItemId(slot, variantKey = '') {
  if (slot === 'Potion' || slot === 'Food') {
    return variantKey
  }

  return getProfileItemId(variantKey)
}

function incrementBuildVariant(slotVariants, slot, itemId, won) {
  const key = getBuildSlotVariantKey(slot, itemId)
  if (!key) return

  const variants = slotVariants[slot]

  if (!variants[key]) {
    variants[key] = {
      baseId: slot === 'Potion' || slot === 'Food' ? getBaseWeaponId(itemId) : key,
      itemId: getBuildSlotDisplayItemId(slot, key),
      profileTier: slot === 'Potion' || slot === 'Food' ? 'Popular' : 'T8',
      wins: 0,
      losses: 0,
      fights: 0,
    }
  }

  variants[key].fights += 1
  if (won) variants[key].wins += 1
  else variants[key].losses += 1
}

function getTopBuildVariant(slotVariants = {}, slot) {
  return Object.values(slotVariants[slot] || {})
    .sort((a, b) => b.fights - a.fights)[0]
}

function makeBuildVariantStats(build = {}) {
  const minVariantFights = Math.max(5, Math.ceil(build.fights * 0.05))

  return BUILD_SLOTS
    .filter((slot) => slot !== 'Potion' && slot !== 'Food')
    .map((slot) => {
      const rows = Object.values(build.slotVariants[slot] || {})
        .filter((variant) => variant.fights >= minVariantFights)
        .map((variant) => {
          const winrate = variant.fights ? (variant.wins / variant.fights) * 100 : 0
          const popularity = build.fights ? (variant.fights / build.fights) * 100 : 0

          return {
            slot,
            baseId: variant.baseId,
            itemId: variant.itemId,
            profileTier: variant.profileTier,
            name: cleanItemName(variant.baseId || variant.itemId),
            fights: variant.fights,
            fightsLabel: formatCompact(variant.fights),
            winrate: toPercent(winrate),
            winrateNumber: winrate,
            popularity: toPercent(popularity),
            popularityNumber: popularity,
          }
        })
        .sort((a, b) => b.fights - a.fights)
        .slice(0, 5)

      if (rows.length <= 1) return null

      return {
        slot,
        label: slot,
        rows,
      }
    })
    .filter(Boolean)
}

function getRecentBuildFights(fights = [], limit = BUILD_RECENT_FIGHTS_LIMIT) {
  return fights
    .filter(Boolean)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, limit)
}

function makeBuildRecentFight(usage = {}) {
  const event = usage.event || {}
  const player = usage.player || {}
  const opponent = usage.opponent || {}
  const opponentWeapon = getEntityWeapon(opponent)
  const date = getEventDate(event)
  const content = detectEventContent(event)

  return {
    eventId: event.EventId || null,
    result: usage.won ? 'kill' : 'death',
    time: date?.toISOString() || event.TimeStamp || '',
    player: player.Name || 'Inconnu',
    opponent: opponent.Name || 'Inconnu',
    opponentWeapon,
    opponentWeaponName: cleanItemName(opponentWeapon),
    fame: formatCompact(event.TotalVictimKillFame),
    itemPower: Math.round(Number(player.AverageItemPower || 0)),
    content: content.label,
  }
}

function pushBuildRecentFight(build, usage) {
  build.recentFights.push(makeBuildRecentFight(usage))
  build.recentFights = getRecentBuildFights(build.recentFights, BUILD_RECENT_FIGHTS_LIMIT * 2)
}

function getBuildDiffCount(firstKey = '', secondKey = '') {
  const first = getBuildBaseIds(firstKey)
  const second = getBuildBaseIds(secondKey)

  return BUILD_ARCHETYPE_SLOTS.reduce((count, _, index) => {
    return count + (first[index] === second[index] ? 0 : 1)
  }, 0)
}

function mergeBuildSlotVariants(targetVariants = {}, sourceVariants = {}) {
  BUILD_SLOTS.forEach((slot) => {
    Object.entries(sourceVariants[slot] || {}).forEach(([key, source]) => {
      if (!targetVariants[slot][key]) {
        targetVariants[slot][key] = { ...source }
        return
      }

      targetVariants[slot][key].wins += source.wins
      targetVariants[slot][key].losses += source.losses
      targetVariants[slot][key].fights += source.fights
    })
  })
}

function mergeBuild(target, source) {
  target.wins += source.wins
  target.losses += source.losses
  target.fights += source.fights
  target.recentFights = getRecentBuildFights([
    ...target.recentFights,
    ...source.recentFights,
  ])
  mergeBuildSlotVariants(target.slotVariants, source.slotVariants)
}

function mergeSimilarBuilds(builds = []) {
  const merged = []

  builds
    .sort((a, b) => b.fights - a.fights)
    .forEach((build) => {
      const similarBuild = merged.find(
        (existing) => getBuildDiffCount(existing.key, build.key) <= 1
      )

      if (similarBuild) {
        mergeBuild(similarBuild, build)
      } else {
        merged.push(build)
      }
    })

  return merged
}

function makeBuildStats(usages = []) {
  const builds = new Map()
  const minFights = Math.max(8, Math.ceil(usages.length * 0.015))

  usages.forEach((usage) => {
    const key = getBuildKey(usage.player)

    if (!builds.has(key)) {
      builds.set(key, {
        key,
        wins: 0,
        losses: 0,
        fights: 0,
        recentFights: [],
        slotVariants: Object.fromEntries(BUILD_SLOTS.map((slot) => [slot, {}])),
      })
    }

    const build = builds.get(key)
    build.fights += 1
    if (usage.won) build.wins += 1
    else build.losses += 1
    pushBuildRecentFight(build, usage)

    BUILD_SLOTS.forEach((slot) => {
      incrementBuildVariant(
        build.slotVariants,
        slot,
        getEquipmentItem(usage.player, slot),
        usage.won
      )
    })
  })

  return mergeSimilarBuilds(Array.from(builds.values()))
    .filter((build) => build.fights >= minFights)
    .map((build) => {
      const winrate = build.fights ? (build.wins / build.fights) * 100 : 0
      const popularity = usages.length ? (build.fights / usages.length) * 100 : 0
      const buildBaseIds = getBuildBaseIds(build.key)
      const items = BUILD_SLOTS
        .map((slot) => {
          const baseId =
            BUILD_ARCHETYPE_SLOTS.includes(slot)
              ? buildBaseIds[BUILD_ARCHETYPE_SLOTS.indexOf(slot)]
              : getTopBuildVariant(build.slotVariants, slot)?.baseId
          if (!baseId || baseId === '-') return null

          const topVariant = getTopBuildVariant(build.slotVariants, slot)
          const itemId =
            slot === 'Potion' || slot === 'Food'
              ? topVariant?.itemId
              : getBuildDisplayItemId(slot, baseId, build.slotVariants)

          return {
            slot,
            itemId,
            profileTier: slot === 'Potion' || slot === 'Food' ? 'Popular' : 'T8',
            baseId,
            name: cleanItemName(baseId),
          }
        })
        .filter(Boolean)

      return {
        key: build.key,
        items,
        variants: makeBuildVariantStats(build),
        recentFights: getRecentBuildFights(build.recentFights),
        fights: build.fights,
        fightsLabel: formatCompact(build.fights),
        winrate: toPercent(winrate),
        winrateNumber: winrate,
        popularity: toPercent(popularity),
      }
    })
    .sort((a, b) => {
      if (b.fights !== a.fights) return b.fights - a.fights
      return b.winrateNumber - a.winrateNumber
    })
    .slice(0, 4)
}

function makeMatchupStats(usages = []) {
  const matchups = new Map()
  const minFights = Math.max(6, Math.ceil(usages.length * 0.015))

  usages.forEach((usage) => {
    const opponentWeapon = getEntityWeapon(usage.opponent)
    const baseId = getBaseWeaponId(opponentWeapon)
    if (!baseId) return

    if (!matchups.has(baseId)) {
      matchups.set(baseId, {
        baseId,
        variants: {},
        wins: 0,
        losses: 0,
        fights: 0,
      })
    }

    const matchup = matchups.get(baseId)
    matchup.fights += 1
    increment(matchup.variants, opponentWeapon)

    if (usage.won) matchup.wins += 1
    else matchup.losses += 1
  })

  const rows = Array.from(matchups.values())
    .filter((matchup) => matchup.fights >= minFights)
    .map((matchup) => {
      const topItemId = getTopEntry(matchup.variants)
      const itemId = getProfileItemId(matchup.baseId || topItemId)
      const winrate = matchup.fights ? (matchup.wins / matchup.fights) * 100 : 0

      return {
        baseId: matchup.baseId,
        itemId,
        profileTier: 'T8',
        name: cleanItemName(matchup.baseId || itemId),
        type: getWeaponFamily(itemId),
        fights: matchup.fights,
        fightsLabel: formatCompact(matchup.fights),
        winrate: toPercent(winrate),
        winrateNumber: winrate,
      }
    })

  return {
    good: [...rows]
      .sort((a, b) => b.winrateNumber - a.winrateNumber)
      .slice(0, 4),
    bad: [...rows]
      .sort((a, b) => a.winrateNumber - b.winrateNumber)
      .slice(0, 4),
  }
}

function makeTierStats(usages = []) {
  const tiers = new Map()

  usages.forEach((usage) => {
    const tier = `T${getItemTier(usage.weapon)}`

    if (!tiers.has(tier)) {
      tiers.set(tier, { tier, wins: 0, losses: 0, fights: 0 })
    }

    const row = tiers.get(tier)
    row.fights += 1
    if (usage.won) row.wins += 1
    else row.losses += 1
  })

  return Array.from(tiers.values())
    .map((row) => {
      const winrate = row.fights ? (row.wins / row.fights) * 100 : 0
      const pickrate = usages.length ? (row.fights / usages.length) * 100 : 0

      return {
        ...row,
        winrate: toPercent(winrate),
        pickrate: toPercent(pickrate),
        fightsLabel: formatCompact(row.fights),
      }
    })
    .sort((a, b) => Number(a.tier.slice(1)) - Number(b.tier.slice(1)))
}

function getWeaponMetaDetail(events = [], baseId = '') {
  const usages = getWeaponUsages(events, baseId)
  const variants = {}

  usages.forEach((usage) => increment(variants, usage.weapon))

  const profileItemId = getProfileItemId(baseId)
  const wins = usages.filter((usage) => usage.won).length
  const losses = usages.length - wins
  const winrate = usages.length ? (wins / usages.length) * 100 : 0
  const totalWeaponUses = events
    .slice(0, 50000)
    .filter((event) => getEntityWeapon(event.Killer) && getEntityWeapon(event.Victim))
    .length * 2
  const pickrate = totalWeaponUses ? (usages.length / totalWeaponUses) * 100 : 0
  const matchups = makeMatchupStats(usages)

  return {
    baseId: getBaseWeaponId(baseId),
    itemId: profileItemId,
    profileTier: 'T8',
    name: cleanItemName(baseId),
    type: getWeaponFamily(baseId),
    tier: 'Global',
    fights: usages.length,
    fightsLabel: formatCompact(usages.length),
    wins,
    losses,
    winrate: toPercent(winrate),
    pickrate: toPercent(pickrate),
    kd: (wins / Math.max(losses, 1)).toFixed(2),
    trend: makeTrend(usages),
    builds: makeBuildStats(usages),
    counters: matchups.bad,
    goodMatchups: matchups.good,
    tiers: makeTierStats(usages),
    minBuildNote: 'Builds observes avec volume minimum',
  }
}

function getHomeSummary(events = []) {
  const todayKey = new Date().toISOString().slice(0, 10)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = yesterday.toISOString().slice(0, 10)

  const todayEvents = events.filter((event) => getEventDayKey(event) === todayKey)
  const yesterdayEvents = events.filter((event) => getEventDayKey(event) === yesterdayKey)

  function getUniquePlayers(list) {
    const players = new Set()

    list.forEach((event) => {
      if (event.Killer?.Id) players.add(event.Killer.Id)
      if (event.Victim?.Id) players.add(event.Victim.Id)
      ;(event.Participants || []).forEach((player) => {
        if (player.Id) players.add(player.Id)
      })
    })

    return players.size
  }

  function getUniqueGuilds(list) {
    const guilds = new Set()

    list.forEach((event) => {
      if (event.Killer?.GuildId) guilds.add(event.Killer.GuildId)
      if (event.Victim?.GuildId) guilds.add(event.Victim.GuildId)
    })

    return guilds.size
  }

  function delta(current, previous) {
    if (!previous) return current ? '+100%' : '0%'
    const value = ((current - previous) / previous) * 100
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const todayKills = todayEvents.length
  const yesterdayKills = yesterdayEvents.length
  const activePlayers = getUniquePlayers(todayEvents)
  const previousPlayers = getUniquePlayers(yesterdayEvents)
  const guilds = getUniqueGuilds(events.slice(0, 5000))
  const previousGuilds = getUniqueGuilds(events.slice(5000, 10000))
  const version = events.find((event) => event.Version)?.Version || 'Live'

  return {
    todayKills: formatCompact(todayKills),
    todayKillsDelta: delta(todayKills, yesterdayKills),
    activePlayers: formatCompact(activePlayers),
    activePlayersDelta: delta(activePlayers, previousPlayers),
    guilds: formatCompact(guilds),
    guildsDelta: delta(guilds, previousGuilds),
    version,
  }
}

function getBestPrice(prices = []) {
  const validSellPrices = prices
    .map((price) => {
      const best =
        price.sell_price_min > 0
          ? price.sell_price_min
          : price.sell_price_max > 0
            ? price.sell_price_max
            : price.buy_price_max > 0
              ? price.buy_price_max
              : 0

      const updatedAt =
        price.sell_price_min_date !== '0001-01-01T00:00:00'
          ? price.sell_price_min_date
          : price.sell_price_max_date !== '0001-01-01T00:00:00'
            ? price.sell_price_max_date
            : price.buy_price_max_date

      return {
        city: price.city,
        quality: price.quality,
        price: best,
        updatedAt,
      }
    })
    .filter((price) => price.price && price.price > 0)

  if (validSellPrices.length === 0) {
    return null
  }

  validSellPrices.sort((a, b) => a.price - b.price)

  return validSellPrices[0]
}

async function fetchAndStoreEvents() {
  try {
    const eventPages = await Promise.all(
      Array.from({ length: GLOBAL_EVENTS_FETCH_PAGES }, async (_, index) => {
        const offset = index * GLOBAL_EVENTS_FETCH_LIMIT
        const response = await fetch(
          `${BASE}/events?limit=${GLOBAL_EVENTS_FETCH_LIMIT}&offset=${offset}`
        )

        if (!response.ok) return []

        return response.json()
      })
    )

    const newEvents = eventPages.flat()

    let stored = loadEvents()
    const existingIds = new Set(stored.map((event) => event.EventId))

    const fresh = newEvents.filter((event) => !existingIds.has(event.EventId))

    if (fresh.length > 0) {
      stored = [...fresh, ...stored].slice(0, STORED_EVENTS_LIMIT)
      saveEvents(stored)

      console.log(`+${fresh.length} nouveaux events ajoutés`)
    }
  } catch (error) {
    console.error('Erreur fetch events:', error)
  }
}

async function fetchAlbionPrices(itemIds = [], quality = 1) {
  const cleanItemIds = itemIds.filter(Boolean)

  if (cleanItemIds.length === 0) return []

  const locations = PRICE_LOCATIONS.join(',')
  const encodedItems = cleanItemIds.map((id) => encodeURIComponent(id)).join(',')

  const url = `${PRICE_BASE}/${encodedItems}.json?locations=${encodeURIComponent(locations)}&qualities=${quality}`

  const response = await fetch(url)

  if (!response.ok) {
    return []
  }

  return response.json()
}

async function getItemPrice(itemId, quality = 1) {
  const safeQuality = getSafeQuality(quality)
  const cacheKey = `${itemId}:${safeQuality}`
  const cached = priceCache.get(cacheKey)

  if (cached && Date.now() - cached.createdAt < PRICE_CACHE_TTL) {
    return cached.data
  }

  const prices = await fetchAlbionPrices([itemId], safeQuality)
  const bestPrice = getBestPrice(prices)

  const data = {
    itemId,
    requestedQuality: safeQuality,
    usedQuality: safeQuality,
    fallback: false,
    bestPrice,
    prices,
  }

  if (bestPrice) {
    priceCache.set(cacheKey, {
      createdAt: Date.now(),
      data,
    })
  }

  return data
}

compactStoredEventsFile()
setInterval(fetchAndStoreEvents, 60000)
fetchAndStoreEvents()

app.get('/search', async (req, res) => {
  const q = req.query.q || ''

  const response = await fetch(`${BASE}/search?q=${encodeURIComponent(q)}`)
  const data = await response.json()

  res.json(data)
})

app.get('/player/:id', async (req, res) => {
  const id = req.params.id

  const response = await fetch(`${BASE}/players/${id}`)
  const data = await response.json()

  res.json(data)
})

app.get('/kills/:id', async (req, res) => {
  const id = req.params.id
  const limit = getSafeLimit(req.query.limit, PLAYER_HISTORY_LIMIT, PLAYER_HISTORY_LIMIT)

  const response = await fetch(`${BASE}/players/${id}/kills?limit=${limit}`)
  const data = await response.json()

  res.json(data)
})

app.get('/deaths/:id', async (req, res) => {
  const id = req.params.id
  const limit = getSafeLimit(req.query.limit, PLAYER_HISTORY_LIMIT, PLAYER_HISTORY_LIMIT)

  const response = await fetch(`${BASE}/players/${id}/deaths?limit=${limit}`)
  const data = await response.json()

  res.json(data)
})

app.get('/events', async (req, res) => {
  const limit = req.query.limit || 51
  const offset = req.query.offset || 0

  const response = await fetch(`${BASE}/events?limit=${limit}&offset=${offset}`)
  const data = await response.json()

  res.json(data)
})

app.get('/event/:id', async (req, res) => {
  const data = await fetchEventDetails(req.params.id)

  if (!data) {
    return res.status(404).json({ error: 'Event introuvable' })
  }

  res.json(data)
})

app.get('/force-player', async (req, res) => {
  const { id } = req.query
  const limit = getSafeLimit(req.query.limit, PLAYER_HISTORY_LIMIT, PLAYER_HISTORY_LIMIT)

  if (!id) {
    return res.json({ added: 0 })
  }

  try {
    const killsRes = await fetch(`${BASE}/players/${id}/kills?limit=${limit}`)
    const deathsRes = await fetch(`${BASE}/players/${id}/deaths?limit=${limit}`)

    const kills = await killsRes.json()
    const deaths = await deathsRes.json()

    let stored = loadEvents()
    const existingIds = new Set(stored.map((event) => event.EventId))

    const fresh = [...kills, ...deaths].filter(
      (event) => !existingIds.has(event.EventId)
    )

    if (fresh.length > 0) {
      stored = [...fresh, ...stored].slice(0, STORED_EVENTS_LIMIT)
      saveEvents(stored)
    }

    res.json({ added: fresh.length })
  } catch (error) {
    console.error('Erreur force-player:', error)
    res.status(500).json({ error: true })
  }
})

app.get('/player-events', (req, res) => {
  const { id, name } = req.query
  const limit = getSafeLimit(req.query.limit, PLAYER_HISTORY_LIMIT, PLAYER_HISTORY_LIMIT)

  if (!id && !name) {
    return res.json([])
  }

  const events = loadEvents()
  const searchName = name?.toLowerCase()

  const filtered = events.filter((event) => {
    const killerId = event.Killer?.Id
    const victimId = event.Victim?.Id

    const killerName = event.Killer?.Name?.toLowerCase()
    const victimName = event.Victim?.Name?.toLowerCase()

    return (
      killerId === id ||
      victimId === id ||
      killerName === searchName ||
      victimName === searchName
    )
  })

  const sorted = filtered
    .sort((a, b) => new Date(b.TimeStamp) - new Date(a.TimeStamp))
    .slice(0, Number(limit))

  res.json(sorted)
})

app.get('/home-meta', (req, res) => {
  try {
    const events = loadEvents()
    const weapons = getMetaWeapons(events)
    const sampleSize = events.filter(
      (event) => getEntityWeapon(event.Killer) && getEntityWeapon(event.Victim)
    ).length

    res.json({
      summary: getHomeSummary(events),
      weapons,
      sampleSize,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Erreur /home-meta:', error)
    res.status(500).json({ error: 'Erreur serveur home-meta' })
  }
})

app.get('/home-meta/weapon/:baseId', (req, res) => {
  try {
    const detail = getWeaponMetaDetail(loadEvents(), req.params.baseId)

    if (!detail.fights) {
      return res.status(404).json({ error: 'Arme introuvable dans les events' })
    }

    res.json(detail)
  } catch (error) {
    console.error('Erreur /home-meta/weapon:', error)
    res.status(500).json({ error: 'Erreur serveur weapon meta detail' })
  }
})

app.get('/item-price/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params
    const quality = getSafeQuality(req.query.quality)

    if (!itemId) {
      return res.status(400).json({ error: 'itemId manquant' })
    }

    const data = await getItemPrice(itemId, quality)

    res.json(data)
  } catch (error) {
    console.error('Erreur /item-price:', error)
    res.status(500).json({ error: 'Erreur serveur item-price' })
  }
})

app.post('/gear-value', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : []

    if (items.length === 0) {
      return res.json({
        total: 0,
        pricedCount: 0,
        itemCount: 0,
        items: [],
      })
    }

    const cleanItems = items
      .filter((item) => item?.type)
      .map((item) => ({
        type: String(item.type),
        quality: getSafeQuality(item.quality),
        count: Number(item.count || 1),
      }))

    const pricedItems = await Promise.all(
      cleanItems.map(async (item) => {
        const priceData = await getItemPrice(item.type, item.quality)
        const price = Number(priceData?.bestPrice?.price || 0)

        return {
          ...item,
          price,
          total: price * item.count,
          found: price > 0,
          city: priceData?.bestPrice?.city || '',
          fallback: priceData?.fallback || false,
          usedQuality: priceData?.usedQuality || item.quality,
        }
      })
    )

    const total = pricedItems.reduce((sum, item) => sum + item.total, 0)
    const pricedCount = pricedItems.filter((item) => item.found).length

    res.json({
      total,
      pricedCount,
      itemCount: cleanItems.length,
      items: pricedItems,
    })
  } catch (error) {
    console.error('Erreur /gear-value:', error)
    res.status(500).json({ error: 'Erreur serveur gear-value' })
  }
})

app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`)
})
