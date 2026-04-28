export default function Navbar({ page, setPage }) {
  return (
    <nav className="navbar">
      <div className="logo" onClick={() => setPage('home')}>
        ALBION <span>TRACKER</span>
      </div>

      <div className="navlinks">
        <button onClick={() => setPage('home')} className={page === 'home' ? 'active' : ''}>
          Accueil
        </button>

        <button onClick={() => setPage('guilds')} className={page === 'guilds' ? 'active' : ''}>
          Guildes
        </button>

        <button onClick={() => setPage('rankings')} className={page === 'rankings' ? 'active' : ''}>
          Classements
        </button>
      </div>

      <div className="patch">
        PATCH 26.1 <span></span>
      </div>
    </nav>
  )
}