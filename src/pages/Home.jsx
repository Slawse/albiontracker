import { useState } from 'react'
import '../styles/home.css'
import WeaponCard from '../components/WeaponCard'

const TOP_WEAPONS = [
  { name: 'Bloodletter', type: 'Dagues', winrate: '59.4%', tier: 'S', content: 'Mists' },
  { name: 'Dagger Pair', type: 'Dagues', winrate: '58.2%', tier: 'S', content: 'Corrupted' },
  { name: 'Carving Sword', type: 'Épées', winrate: '55.1%', tier: 'A', content: 'Mists' },
  { name: 'Cursed Staff', type: 'Bâton maudit', winrate: '54.7%', tier: 'A', content: 'Corrupted' },
]

export default function Home({ onSearch, loading }) {
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState(false)

  function submit() {
    if (!query.trim() || loading) return
    onSearch(query)
  }

  return (
    <main className="hero">
      <h1>
        ALBION
        <span>TRACKER</span>
      </h1>

      <p className="subtitle">
        RECHERCHE JOUEUR · STATS PVP · BUILDS · MÉTA
      </p>

      <div className={`search ${focus ? 'focus' : ''}`}>
        <div className="searchIcon">⌕</div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Ex: slaw, xernon, chukak ou vrai pseudo Albion"
          disabled={loading}
        />

        <button onClick={submit} disabled={loading}>
          {loading ? 'CHARGEMENT...' : 'RECHERCHER →'}
        </button>
      </div>

      <section className="stats">
        <div className="stat">
          <small>KILLS AUJOURD'HUI</small>
          <strong>2.4M</strong>
          <span>+12.5%</span>
        </div>

        <div className="stat">
          <small>JOUEURS ACTIFS</small>
          <strong>48K</strong>
          <span>+8.3%</span>
        </div>

        <div className="stat">
          <small>GUILDES CLASSÉES</small>
          <strong>1 240</strong>
          <span>+5.7%</span>
        </div>

        <div className="stat">
          <small>VERSION</small>
          <strong>PATCH 26.1</strong>
          <span>Live</span>
        </div>
      </section>

      <section className="homeMetaPanel">
        <div className="homeMetaHeader">
          <h2>Meilleures armes du moment</h2>
          <p>Armes dominantes selon le contenu et le taux de victoire.</p>
        </div>

        <div className="homeWeaponGrid">
          {TOP_WEAPONS.map((weapon) => (
            <WeaponCard key={weapon.name} weapon={weapon} />
          ))}
        </div>
      </section>
    </main>
  )
}