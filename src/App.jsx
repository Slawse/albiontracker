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
        ?.filter((p) => p.Name !== fight.Killer?.Name)
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
        ?.filter((p) => p.Name !== fight.Killer?.Name)
        .map((p) => p.Name)
        .slice(0, 4) || [],
  }
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
      const kills = await getPlayerKills(found.Id)
      const deaths = await getPlayerDeaths(found.Id)

      const fights = [
        ...kills.map(formatKillFight),
        ...deaths.map(formatDeathFight),
      ]
        .sort((a, b) => b.rawDate - a.rawDate)

      const formattedPlayer = {
        name: profile.Name || found.Name,
        guild: profile.GuildName || 'Sans guilde',
        tag: profile.GuildTag || '---',

        pvp: formatMillions(profile.KillFame),
        pve: formatMillions(profile.LifetimeStatistics?.PvE?.Total),
        gathering: formatMillions(profile.LifetimeStatistics?.Gathering?.All?.Total),
        crafting: formatMillions(profile.LifetimeStatistics?.Crafting?.Total),

        infamy: '—',
        hellgate: '—',

        kills: kills.length,
        deaths: deaths.length,

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