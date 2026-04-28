import { useState } from 'react'
import './index.css'

const META = [
  ['Dagger Pair', '58.4%', 'S', '12.3%'],
  ['Claymore', '56.1%', 'S', '9.8%'],
  ['Cursed Staff', '54.2%', 'A', '8.1%'],
  ['Holy Staff', '53.8%', 'A', '11.2%'],
  ['Frost Staff', '52.9%', 'A', '7.4%'],
]

const GUILDS = [
  {
    rank: 1,
    name: 'Nightfall Covenant',
    tag: 'NFC',
    region: 'Europe',
    members: 148,
    kills: 62480,
    deaths: 14200,
    fame: '12.8B',
    trend: '+14.2%',
    players: ['Valkyrion', 'MordKane', 'SilentFang', 'Ashborne', 'DuskReaper', 'Noctalis']
  },
  {
    rank: 2,
    name: 'Iron Wolves',
    tag: 'WOLF',
    region: 'Europe',
    members: 132,
    kills: 58120,
    deaths: 15840,
    fame: '10.9B',
    trend: '+10.6%',
    players: ['IronVex', 'Wolfhart', 'SteelNova', 'Ragnarix', 'FrostBite', 'Krynn']
  },
  {
    rank: 3,
    name: 'Crimson Eclipse',
    tag: 'CRX',
    region: 'Amérique',
    members: 119,
    kills: 49700,
    deaths: 12150,
    fame: '9.4B',
    trend: '+8.1%',
    players: ['BloodSaint', 'RedOmen', 'ScarletHex', 'Varnox', 'Kairo', 'RiftLord']
  },
  {
    rank: 4,
    name: 'Avalon Reapers',
    tag: 'AVR',
    region: 'Europe',
    members: 156,
    kills: 46240,
    deaths: 17620,
    fame: '8.6B',
    trend: '+5.4%',
    players: ['AvaGhost', 'Reapz', 'Mythril', 'SoulDrake', 'Elyon', 'DarkRoot']
  },
  {
    rank: 5,
    name: 'Stormborn Legion',
    tag: 'STL',
    region: 'Asie',
    members: 101,
    kills: 38940,
    deaths: 9800,
    fame: '7.1B',
    trend: '+3.9%',
    players: ['StormKai', 'VoltEdge', 'ThunderFox', 'Ryzen', 'BlueFang', 'Shiro']
  }
]

export default function App() {
  const [type, setType] = useState('player')
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState(false)
  const [page, setPage] = useState('home')
  const [selectedGuild, setSelectedGuild] = useState(GUILDS[0])

  return (
    <div className="app">

      <nav className="navbar">
        <div className="logo" onClick={() => setPage('home')}>
          ALBION <span>TRACKER</span>
        </div>

        <div className="navlinks">
          <button onClick={() => setPage('home')} className={page === 'home' ? 'active' : ''}>Accueil</button>
          <button onClick={() => setPage('players')} className={page === 'players' ? 'active' : ''}>Joueurs</button>
          <button onClick={() => setPage('guilds')} className={page === 'guilds' ? 'active' : ''}>Guildes</button>
          <button onClick={() => setPage('meta')} className={page === 'meta' ? 'active' : ''}>Meta</button>
          <button onClick={() => setPage('rankings')} className={page === 'rankings' ? 'active' : ''}>Classements</button>
        </div>

        <div className="patch">
          PATCH 26.1 <span></span>
        </div>
      </nav>

      {page === 'home' && (
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
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              placeholder={type === 'player' ? "Entrez le nom d'un joueur..." : "Entrez le nom d'une guilde..."}
            />
            <button>RECHERCHER →</button>
          </div>

          <section className="stats">
            <div className="stat"><small>KILLS AUJOURD'HUI</small><strong>2.4M</strong><span>+12.5%</span></div>
            <div className="stat"><small>JOUEURS ACTIFS</small><strong>48K</strong><span>+8.3%</span></div>
            <div className="stat"><small>GUILDES CLASSÉES</small><strong>1 240</strong><span>+5.7%</span></div>
            <div className="stat"><small>VERSION ACTUELLE</small><strong>PATCH 26.1</strong><span>Live</span></div>
          </section>

          <section className="dashboard">
            <div className="panel meta">
              <div className="panelHeader">
                <div>
                  <h2>MÉTA DES ARMES</h2>
                  <p>Taux de victoire des armes les plus utilisées</p>
                </div>
                <button onClick={() => setPage('meta')}>VOIR TOUT →</button>
              </div>

              <div className="table">
                <div className="row head">
                  <span>#</span><span>ARME</span><span>TAUX DE VICTOIRE</span><span>TIER</span><span>UTILISATION</span>
                </div>

                {META.map((m, i) => (
                  <div className="row" key={m[0]}>
                    <span>{i + 1}</span>
                    <span>{m[0]}</span>
                    <span className="green">{m[1]}</span>
                    <span className={`tier ${m[2]}`}>{m[2]}</span>
                    <span>{m[3]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel featured">
              <div className="badge">EN VEDETTE</div>
              <div className="weaponGlow"></div>
              <div className="weaponMock">
                <div className="blade"></div>
                <div className="handle"></div>
              </div>
              <h2>Dagger Pair</h2>
              <p>ARME LA PLUS PERFORMANTE</p>
              <div className="featuredStats">
                <div><strong>58.4%</strong><small>TAUX DE VICTOIRE</small></div>
                <div><strong>12.3%</strong><small>UTILISATION</small></div>
              </div>
            </div>
          </section>
        </main>
      )}

     {page === 'guilds' && (
  <main className="guildPage">

    <h1 className="guildTitle">Classement Guildes</h1>

    <div className="guildRanking">

      {/* HEADER */}
      <div className="guildHeader">
        <span>#</span>
        <span>GUILDE</span>
        <span>KILLS</span>
        <span>MORTS</span>
        <span>FAME</span>
        <span></span>
      </div>

      {GUILDS.map(g => (
        <details key={g.name} className="guildRow">

          <summary className="guildRowLine">

            <div className="rank">#{g.rank}</div>

            <div className="guildInfo">
              <strong>{g.name}</strong>
              <span>{g.region} · {g.members} membres</span>
            </div>

            <div className="guildStat green">{g.kills}</div>
            <div className="guildStat red">{g.deaths}</div>
            <div className="guildStat gold">{g.fame}</div>

            <div className="arrow">⌄</div>

          </summary>

          {/* PLAYERS */}
          <div className="players">
            {g.players.map(p => (
              <div className="player" key={p}>
                <div className="avatar">{p.slice(0, 2)}</div>

                <div>
                  <strong>{p}</strong>
                  <span>Membre</span>
                </div>

                <button>Voir</button>
              </div>
            ))}
          </div>

        </details>
      ))}

    </div>

  </main>
)}
      {page !== 'home' && page !== 'guilds' && (
        <main className="page emptyPage">
          <h1>{page}</h1>
          <p>Page en construction.</p>
        </main>
      )}

      <footer className="footer">
        <div className="footerGrid">
          <div>
            <div className="footerLogo">ALBION <span>TRACKER</span></div>
            <p>Real-time meta analytics, tier lists and player tracking for Albion Online.</p>

            <h4>QUICK ACCESS</h4>
            <div className="quickBtns">
              <button>Draft Tool</button>
              <button>Leaderboards</button>
              <button>Events</button>
            </div>
          </div>

          <div>
            <h3>EXPLORER</h3>
            <ul>
              <li>Rechercher</li>
              <li>Méta Globale</li>
              <li>Événements</li>
              <li>Classements</li>
            </ul>
          </div>

          <div>
            <h3>TOOLS</h3>
            <ul>
              <li>Tier List</li>
              <li>Builds</li>
              <li>Stats</li>
              <li>Skins <span className="new">NEW</span></li>
            </ul>
          </div>

          <div>
            <h3>COMMUNITY</h3>
            <button className="communityBtn gold">Contact</button>
            <button className="communityBtn">Follow</button>
            <button className="communityBtn purple">Discord</button>
          </div>
        </div>

        <div className="footerBottom">
          <span>© 2026 Albion Tracker</span>
          <span>Non affilié à Albion Online</span>
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </footer>

    </div>
  )
}