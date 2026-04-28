export default function Footer() {
  return (
    <footer className="footer">
      <div className="footerGrid">
        <div>
          <div className="footerLogo">
            ALBION <span>TRACKER</span>
          </div>

          <p>
            Real-time meta analytics, tier lists and player tracking for Albion Online.
          </p>

          <h4>QUICK ACCESS</h4>

          <div className="quickBtns">
            <button>Leaderboards</button>
            <button>Tier List</button>
            <button>Builds</button>
          </div>
        </div>

        <div>
          <h3>EXPLORER</h3>
          <ul>
            <li>Recherche joueur</li>
            <li>Guildes</li>
            <li>Classements</li>
            <li>Méta</li>
          </ul>
        </div>

        <div>
          <h3>TOOLS</h3>
          <ul>
            <li>Tier List</li>
            <li>Builds</li>
            <li>Stats PvP</li>
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
  )
}