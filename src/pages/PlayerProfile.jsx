export default function PlayerProfile({ player }) {
  if (!player) {
    return (
      <main className="page emptyPage">
        <h1>Joueur introuvable</h1>
        <p>Retourne à l’accueil et cherche slaw, xernon ou chukak.</p>
      </main>
    )
  }

  const kd = (player.kills / Math.max(player.deaths, 1)).toFixed(2)

  return (
    <main className="profilePage">
      <section className="profileHero">
        <div>
          <div className="profileTag">{player.tag}</div>
          <h1>{player.name}</h1>
          <p>{player.guild}</p>
        </div>

        <div className="profileKD">
          <strong>{kd}</strong>
          <span>KD Ratio</span>
        </div>
      </section>

      <section className="profileStats">
        <div><small>PvP Fame</small><strong>{player.pvp}</strong></div>
        <div><small>PvE Fame</small><strong>{player.pve}</strong></div>
        <div><small>Récolte</small><strong>{player.gathering}</strong></div>
        <div><small>Fabrication</small><strong>{player.crafting}</strong></div>
        <div><small>Infamie</small><strong>{player.infamy}</strong></div>
        <div><small>Hellgate</small><strong>{player.hellgate}</strong></div>
      </section>

      <section className="fightPanel">
        <div className="fightHeader">
          <h2>Activité récente</h2>
          <p>Kills en vert, morts en rouge. Clique pour voir le détail.</p>
        </div>

        {player.fights.map((fight) => (
          <details className={`fightRow ${fight.type}`} key={fight.id}>
            <summary>
              <div className="fightType">
                {fight.type === 'kill' ? 'KILL' : 'MORT'}
              </div>

              <div>
                <strong>
                  {fight.type === 'kill' ? 'A tué' : 'Mort contre'} {fight.opponent}
                </strong>
                <span>{fight.weapon} · {fight.zone} · {fight.time}</span>
              </div>

              <div className="fightFame">{fight.fame}</div>
              <div className="arrow">⌄</div>
            </summary>

            <div className="fightDetails">
              <div className="inventoryBox killer">
                <h3>Killer inventory</h3>
                <div className="itemGrid">
                  {fight.killerInventory.map((item) => (
                    <div className="itemSlot" key={item}>{item}</div>
                  ))}
                </div>
              </div>

              <div className="inventoryBox victim">
                <h3>Victim inventory</h3>
                <div className="itemGrid">
                  {fight.victimInventory.map((item) => (
                    <div className="itemSlot" key={item}>{item}</div>
                  ))}
                </div>
              </div>

              <div className="assistBox">
                <h3>Assists</h3>
                {fight.assists.length > 0 ? (
                  fight.assists.map((a) => <span key={a}>{a}</span>)
                ) : (
                  <p>Aucune assistance</p>
                )}
              </div>
            </div>
          </details>
        ))}
      </section>
    </main>
  )
}