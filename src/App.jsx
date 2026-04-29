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

export default function App() {
  const [page, setPage] = useState('home')
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch(query) {
    const name = query.trim()
    if (!name) return

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

      const formattedPlayer = {
        name: profile.Name,
        guild: profile.GuildName || 'Sans guilde',
        tag: profile.GuildTag || '---',

        pvp: profile.KillFame
          ? `${Math.round(profile.KillFame / 1000000)}M`
          : '0',

        pve: profile.LifetimeStatistics?.PvE?.Total
          ? `${Math.round(profile.LifetimeStatistics.PvE.Total / 1000000)}M`
          : '0',

        gathering: profile.LifetimeStatistics?.Gathering?.All?.Total
          ? `${Math.round(profile.LifetimeStatistics.Gathering.All.Total / 1000000)}M`
          : '0',

        crafting: profile.LifetimeStatistics?.Crafting?.Total
          ? `${Math.round(profile.LifetimeStatistics.Crafting.Total / 1000000)}M`
          : '0',

        infamy: '—',
        hellgate: '—',

        kills: kills.length,
        deaths: deaths.length,

        fights: [
          ...kills.slice(0, 5).map((fight, index) => ({
            id: `kill-${index}`,
            type: 'kill',
            opponent: fight.Victim?.Name || 'Inconnu',
            fame: `${Math.round((fight.TotalVictimKillFame || 0) / 1000)}K`,
            zone: fight.Location || 'Zone inconnue',
            time: 'Récent',
            weapon: fight.Killer?.Equipment?.MainHand?.Type || 'Inconnu',

            killerInventory: Object.values(fight.Killer?.Equipment || {})
              .filter(Boolean)
              .map((item) => item.Type),

            victimInventory: Object.values(fight.Victim?.Equipment || {})
              .filter(Boolean)
              .map((item) => item.Type),

            assists:
              fight.Participants
                ?.filter((p) => p.Name !== fight.Killer?.Name)
                .map((p) => p.Name)
                .slice(0, 4) || [],
          })),

          ...deaths.slice(0, 5).map((fight, index) => ({
            id: `death-${index}`,
            type: 'death',
            opponent: fight.Killer?.Name || 'Inconnu',
            fame: `${Math.round((fight.TotalVictimKillFame || 0) / 1000)}K`,
            zone: fight.Location || 'Zone inconnue',
            time: 'Récent',
            weapon: fight.Victim?.Equipment?.MainHand?.Type || 'Inconnu',

            killerInventory: Object.values(fight.Killer?.Equipment || {})
              .filter(Boolean)
              .map((item) => item.Type),

            victimInventory: Object.values(fight.Victim?.Equipment || {})
              .filter(Boolean)
              .map((item) => item.Type),

            assists:
              fight.Participants
                ?.filter((p) => p.Name !== fight.Killer?.Name)
                .map((p) => p.Name)
                .slice(0, 4) || [],
          })),
        ],
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

      {page === 'profile' && player && <PlayerProfile player={player} />}

      {page === 'guilds' && <Guilds guilds={GUILDS} />}

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