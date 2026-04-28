import { useState } from 'react'

export default function Home({ onSearch }) {
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState(false)
  const [type, setType] = useState('player')

  function submit() {
    if (type === 'player') {
      onSearch(query)
    }
  }

  return (
    <main className="hero">
      <h1>
        ALBION
        <span>TRACKER</span>
      </h1>

      <p className="subtitle">
        STATISTIQUES · JOUEURS · GUILDES · MÉTA
      </p>

      <div className="switch">
        <button onClick={() => setType('player')} className={type === 'player' ? 'selected' : ''}>
          JOUEUR
        </button>

        <button onClick={() => setType('guild')} className={type === 'guild' ? 'selected' : ''}>
          GUILDE
        </button>
      </div>

      <div className={`search ${focus ? 'focus' : ''}`}>
        <div className="searchIcon">⌕</div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={type === 'player' ? 'Essaie : slaw, xernon, chukak' : "Recherche guilde bientôt..."}
        />

        <button onClick={submit}>RECHERCHER →</button>
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
          <small>VERSION ACTUELLE</small>
          <strong>PATCH 26.1</strong>
          <span>Live</span>
        </div>
      </section>
    </main>
  )
}