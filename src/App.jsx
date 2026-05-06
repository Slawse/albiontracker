import { useState } from 'react'
import './index.css'

import { PLAYERS } from './data/players'
import { GUILDS } from './data/guilds'
import { CONTENTS, WEAPON_TIERS } from './data/weapons'
import { LEADERBOARDS } from './data/leaderboards'

import Navbar from './components/Navbar'
import Footer from './components/Footer'

import Home from './pages/Home'
import Guilds from './pages/Guilds'
import Rankings from './pages/Rankings'
import Leaderboards from './pages/Leaderboards'
import PlayerProfile from './pages/PlayerProfile'

import {
  searchPlayerByName,
  getPlayerProfile,
  getPlayerKills,
  getPlayerDeaths,
} from './api/albionApi'
import { detectEventContent } from './utils/contentDetection'

const EVENTS_LIMIT = 500
const API_URL = 'http://localhost:3001'

function formatFame(value) {
  return `${Math.round((value || 0) / 1000)}K`
}

function formatCompact(value) {
  const number = Number(value || 0)

  if (!number) return '0'

  if (number >= 1000000000) {
    return `${(number / 1000000000).toFixed(1)}B`
  }

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`
  }

  if (number >= 1000) {
    return `${Math.round(number / 1000)}K`
  }

  return number.toLocaleString('fr-FR')
}

function formatRatio(value) {
  const number = Number(value || 0)
  return number ? number.toFixed(2) : '0'
}

function makeStat(label, value) {
  return {
    label,
    value: formatCompact(value),
    rawValue: Number(value || 0),
  }
}

function makeProfileStats(profile = {}, found = {}) {
  const lifetime = profile.LifetimeStatistics || {}
  const pve = lifetime.PvE || {}
  const gathering = lifetime.Gathering || {}

  const stats = [
    makeStat('PvP fame', profile.KillFame || found.KillFame),
    makeStat('Death fame', profile.DeathFame || found.DeathFame),
    { label: 'Fame ratio', value: formatRatio(profile.FameRatio || found.FameRatio) },
    makeStat('PvE total', pve.Total),
    makeStat('Mists PvE', pve.Mists),
    makeStat('Hellgate PvE', pve.Hellgate),
    makeStat('Corrupted PvE', pve.CorruptedDungeon),
    makeStat('Avalon PvE', pve.Avalon),
    makeStat('Outlands PvE', pve.Outlands),
    makeStat('Royal PvE', pve.Royal),
    makeStat('Récolte', gathering.All?.Total),
    makeStat('Fibre', gathering.Fiber?.Total),
    makeStat('Peaux', gathering.Hide?.Total),
    makeStat('Minerai', gathering.Ore?.Total),
    makeStat('Pierre', gathering.Rock?.Total),
    makeStat('Bois', gathering.Wood?.Total),
    makeStat('Fabrication', lifetime.Crafting?.Total),
    makeStat('Pêche', lifetime.FishingFame),
    makeStat('Farming', lifetime.FarmingFame),
    makeStat('Crystal', lifetime.CrystalLeague),
  ]

  const optionalStats = [
    ['Infamie', profile.Infamy || profile.infamy || found.Infamy || found.infamy],
    ['Réputation', profile.Reputation || profile.reputation || found.Reputation || found.reputation],
  ]

  optionalStats.forEach(([label, value]) => {
    if (value || value === 0) {
      stats.push(makeStat(label, value))
    }
  })

  return stats
}

function formatFightDate(timestamp) {
  if (!timestamp) return 'Date inconnue'

  return new Date(timestamp).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalize(value) {
  return String(value || '').toLowerCase().trim()
}

function isTwoHandWeapon(type = '') {
  const upper = String(type || '').toUpperCase()
  return upper.includes('_2H_') || upper.includes('2H_')
}

function formatItem(item) {
  if (!item?.Type) return null

  return {
    type: item.Type,
    quality: item.Quality || 1,
    count: item.Count || 1,
    activeSpells: Array.isArray(item.ActiveSpells) ? item.ActiveSpells : [],
    passiveSpells: Array.isArray(item.PassiveSpells) ? item.PassiveSpells : [],
  }
}

function getGear(equipment = {}) {
  const mainHand = formatItem(equipment.MainHand)

  const offHand =
    formatItem(equipment.OffHand) ||
    (mainHand && isTwoHandWeapon(mainHand.type) ? mainHand : null)

  return {
    bag: formatItem(equipment.Bag),
    head: formatItem(equipment.Head),
    cape: formatItem(equipment.Cape),

    mainHand,
    armor: formatItem(equipment.Armor),
    offHand,

    potion: formatItem(equipment.Potion),
    shoes: formatItem(equipment.Shoes),
    food: formatItem(equipment.Food),

    mount: formatItem(equipment.Mount),
  }
}

function getRealInventory(entity = {}) {
  if (!Array.isArray(entity.Inventory)) return []

  return entity.Inventory
    .map(formatItem)
    .filter(Boolean)
}

function getAssistPlayers(event = {}) {
  const participants = Array.isArray(event.Participants) ? event.Participants : []
  const killerName = normalize(event.Killer?.Name)

  return participants.filter(
    (player) => normalize(player.Name) !== killerName
  )
}

function makeFight(event, type, index) {
  const isKill = type === 'kill'

  const killer = event.Killer || {}
  const victim = event.Victim || {}
  const content = detectEventContent(event)

  const assists = getAssistPlayers(event)
    .map((player) => player.Name)
    .filter(Boolean)
    .slice(0, 4)

  return {
    id: `${type}-${event.EventId || index}`,
    eventId: event.EventId || null,
    type,

    opponent: isKill
      ? victim.Name || 'Inconnu'
      : killer.Name || 'Inconnu',

    fame: formatFame(event.TotalVictimKillFame),
    zone: content.label,
    content,
    mapName: event.Location || 'Map inconnue',
    time: formatFightDate(event.TimeStamp),
    rawDate: event.TimeStamp ? new Date(event.TimeStamp).getTime() : 0,
    itemPower: isKill
      ? Number(killer.AverageItemPower || 0)
      : Number(victim.AverageItemPower || 0),
    opponentItemPower: isKill
      ? Number(victim.AverageItemPower || 0)
      : Number(killer.AverageItemPower || 0),

    weapon: isKill
      ? killer.Equipment?.MainHand?.Type || 'Inconnu'
      : victim.Equipment?.MainHand?.Type || 'Inconnu',

    opponentWeapon: isKill
      ? victim.Equipment?.MainHand?.Type || 'Inconnu'
      : killer.Equipment?.MainHand?.Type || 'Inconnu',

    killerGear: getGear(killer.Equipment),
    victimGear: getGear(victim.Equipment),

    killerBag: getRealInventory(killer),
    victimBag: getRealInventory(victim),

    assists,
  }
}

function formatEventForPlayer(event, playerId, playerName, index) {
  const killerId = event.Killer?.Id
  const victimId = event.Victim?.Id
  const killerName = normalize(event.Killer?.Name)
  const victimName = normalize(event.Victim?.Name)
  const searchedName = normalize(playerName)

  const isKill = killerId === playerId || killerName === searchedName
  const isDeath = victimId === playerId || victimName === searchedName

  if (!isKill && !isDeath) return null

  return makeFight(event, isKill ? 'kill' : 'death', index)
}

function cleanFights(fights, limit = EVENTS_LIMIT) {
  const map = new Map()

  fights.filter(Boolean).forEach((fight) => {
    map.set(fight.id, fight)
  })

  return [...map.values()]
    .sort((a, b) => b.rawDate - a.rawDate)
    .slice(0, limit)
}

async function forcePlayerEvents(playerId) {
  try {
    await fetch(`${API_URL}/force-player?id=${playerId}&limit=${EVENTS_LIMIT}`)
  } catch (error) {
    console.warn('force-player ignoré:', error)
  }
}

async function getStoredPlayerEvents(playerId, playerName) {
  try {
    const res = await fetch(
      `${API_URL}/player-events?id=${playerId}&name=${encodeURIComponent(playerName)}&limit=${EVENTS_LIMIT}`
    )

    if (!res.ok) return []

    const events = await res.json()

    return cleanFights(
      events.map((event, index) =>
        formatEventForPlayer(event, playerId, playerName, index)
      )
    )
  } catch (error) {
    console.warn('player-events ignoré:', error)
    return []
  }
}

async function getFallbackEvents(playerId) {
  const [kills, deaths] = await Promise.all([
    getPlayerKills(playerId, EVENTS_LIMIT),
    getPlayerDeaths(playerId, EVENTS_LIMIT),
  ])

  return cleanFights([
    ...kills.map((fight, index) => makeFight(fight, 'kill', index)),
    ...deaths.map((fight, index) => makeFight(fight, 'death', index)),
  ])
}

export default function App() {
  const [page, setPage] = useState('home')
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch(query) {
    const name = query.trim()
    if (!name || loading) return

    setLoading(true)

    try {
      const found = await searchPlayerByName(name)

      if (!found) {
        const localPlayer = PLAYERS[name.toLowerCase()]

        if (localPlayer) {
          setPlayer(localPlayer)
          setPage('profile')
          return
        }

        alert('Joueur introuvable')
        return
      }

      const profile = await getPlayerProfile(found.Id)
      const playerName = profile.Name || found.Name

      await forcePlayerEvents(found.Id)

      let fights = await getStoredPlayerEvents(found.Id, playerName)

      if (fights.length === 0) {
        fights = await getFallbackEvents(found.Id)
      }

      const killsCount = fights.filter((fight) => fight.type === 'kill').length
      const deathsCount = fights.filter((fight) => fight.type === 'death').length

      const formattedPlayer = {
        name: playerName,
        guild: profile.GuildName || found.GuildName || 'Sans guilde',
        tag: profile.GuildTag || '---',

        pvp: formatCompact(profile.KillFame || found.KillFame),
        pve: formatCompact(profile.LifetimeStatistics?.PvE?.Total),
        gathering: formatCompact(profile.LifetimeStatistics?.Gathering?.All?.Total),
        crafting: formatCompact(profile.LifetimeStatistics?.Crafting?.Total),
        infamy: formatCompact(profile.Infamy || found.Infamy),
        hellgate: formatCompact(profile.LifetimeStatistics?.PvE?.Hellgate),
        stats: makeProfileStats(profile, found),

        kills: killsCount,
        deaths: deathsCount,

        fights,
      }

      setPlayer(formattedPlayer)
      setPage('profile')
    } catch (error) {
      console.error(error)

      const localPlayer = PLAYERS[name.toLowerCase()]

      if (localPlayer) {
        setPlayer(localPlayer)
        setPage('profile')
      } else {
        alert('Erreur API Albion')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <Navbar page={page} setPage={setPage} />

      {page === 'home' && (
        <Home onSearch={handleSearch} setPage={setPage} loading={loading} />
      )}

      {page === 'profile' && player && (
        <PlayerProfile player={player} onPlayerSearch={handleSearch} />
      )}

      {page === 'guilds' && (
        <Guilds guilds={GUILDS} />
      )}

      {page === 'leaderboards' && (
        <Leaderboards leaderboards={LEADERBOARDS} />
      )}

      {page === 'rankings' && (
        <Rankings contents={CONTENTS} weaponTiers={WEAPON_TIERS} />
      )}

      <Footer />
    </div>
  )
}
