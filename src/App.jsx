import { useState } from 'react'
import './index.css'

import { PLAYERS } from './data/players'
import { GUILDS } from './data/guilds'
import { CONTENTS, WEAPON_TIERS } from './data/weapons'

import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Guilds from './pages/Guilds'
import Rankings from './pages/Rankings'
import PlayerProfile from './pages/PlayerProfile'

export default function App() {
  const [page, setPage] = useState('home')
  const [player, setPlayer] = useState(null)

  function handleSearch(query) {
    const key = query.toLowerCase().trim()
    const found = PLAYERS[key]

    if (found) {
      setPlayer(found)
      setPage('profile')
    } else {
      alert('Joueur introuvable. Essaie : slaw, xernon, chukak')
    }
  }

  return (
    <div className="app">

      <Navbar page={page} setPage={setPage} />

      {page === 'home' && (
        <Home onSearch={handleSearch} setPage={setPage} />
      )}

      {page === 'profile' && player && (
        <PlayerProfile player={player} />
      )}

      {page === 'guilds' && (
        <Guilds guilds={GUILDS} />
      )}

      {page === 'rankings' && (
        <Rankings contents={CONTENTS} weaponTiers={WEAPON_TIERS} />
      )}

      <Footer />

    </div>
  )
}