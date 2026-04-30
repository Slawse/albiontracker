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

const EVENTS_LIMIT = 50

function formatFame(value) {
  return `${Math.round((value || 0) / 1000)}K`
}

function formatMillions(value) {
  if (!value) return '0'
  return `${Math.round(value / 1000000)}M`
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

function getInventory(equipment) {
  return Object.values(equipment || {})
    .filter(Boolean)
    .map((item) => item.Type)
}

function normalize(value) {
  return String(value || '').toLowerCase().trim()
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

  return {
    id: `event-${event.EventId || index}`,
    type: isKill ? 'kill' : 'death',
    opponent: isKill
      ? event.Victim?.Name || 'Inconnu'
      : event.Killer?.Name || 'Inconnu',
    fame: formatFame(event.TotalVictimKillFame),
    zone: event.Location || 'Zone inconnue',
    time: formatFightDate(event.TimeStamp),
    rawDate: event.TimeStamp ? new Date(event.TimeStamp).getTime() : 0,
    weapon: isKill
      ? event.Killer?.Equipment?.MainHand?.Type || 'Inconnu'
      : event.Victim?.Equipment?.MainHand?.Type || 'Inconnu',
    killerInventory: getInventory(event.Killer?.Equipment),
    victimInventory: getInventory(event.Victim?.Equipment),
    assists:
      event.Participants
        ?.filter((p) => normalize(p.Name) !== normalize(event.Killer?.Name))
        .map((p) => p.Name)
        .slice(0, 4) || [],
  }
}

function formatKillFight(fight, index) {
  return {
    id: `kill-${fight.EventId || index}`,
    type: 'kill',
    opponent: fight.Victim?.Name || 'Inconnu',
    fame: formatFame(fight.TotalVictimKillFame),
    zone: fight.Location || 'Zone inconnue',
    time: formatFightDate(fight.TimeStamp),
    rawDate: fight.TimeStamp ? new Date(fight.TimeStamp).getTime() : 0,
    weapon: fight.Killer?.Equipment?.MainHand?.Type || 'Inconnu',
    killerInventory: getInventory(fight.Killer?.Equipment),
    victimInventory: getInventory(fight.Victim?.Equipment),
    assists:
      fight.Participants
        ?.filter((p) => normalize(p.Name) !== normalize(fight.Killer?.Name))
        .map((p) => p.Name)
        .slice(0, 4) || [],
  }
}

function formatDeathFight(fight, index) {
  return {
    id: `death-${fight.EventId || index}`,
    type: 'death',
    opponent: fight.Killer?.Name || 'Inconnu',
    fame: formatFame(fight.TotalVictimKillFame),
    zone: fight.Location || 'Zone inconnue',
    time: formatFightDate(fight.TimeStamp),
    rawDate: fight.TimeStamp ? new Date(fight.TimeStamp).getTime() : 0,
    weapon: fight.Victim?.Equipment?.MainHand?.Type || 'Inconnu',
    killerInventory: getInventory(fight.Killer?.Equipment),
    victimInventory: getInventory(fight.Victim?.Equipment),
    assists:
      fight.Participants
        ?.filter((p) => normalize(p.Name) !== normalize(fight.Killer?.Name))
        .map((p) => p.Name)
        .slice(0, 4) || [],
  }
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
    await fetch(`http://localhost:3001/force-player?id=${playerId}`)
  } catch (error) {
    console.warn('force-player ignoré:', error)
  }
}

async function getStoredPlayerEvents(playerId, playerName) {
  try {
    const res = await fetch(
      `http://localhost:3001/player-events?id=${playerId}&name=${encodeURIComponent(playerName)}&limit=${EVENTS_LIMIT}`
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
    ...kills.map(formatKillFight),
    ...deaths.map(formatDeathFight),
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

        pvp: formatMillions(profile.KillFame || found.KillFame),
        pve: formatMillions(profile.LifetimeStatistics?.PvE?.Total),
        gathering: formatMillions(profile.LifetimeStatistics?.Gathering?.All?.Total),
        crafting: formatMillions(profile.LifetimeStatistics?.Crafting?.Total),

        infamy: '—',
        hellgate: '—',

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
        <PlayerProfile player={player} />
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